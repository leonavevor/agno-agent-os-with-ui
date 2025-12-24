"""Hallucination detection and fact-checking for agent responses."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from pydantic import BaseModel, Field

from .metrics_collector import ValidationMetrics, ValidationStatus


class FactCheckResult(BaseModel):
    """Result of fact-checking a single claim."""

    claim: str
    is_factual: bool
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: str = ""
    sources: List[str] = Field(default_factory=list)


class HallucinationCheckResult(BaseModel):
    """Complete hallucination check result."""

    is_hallucinated: bool
    confidence_score: float = Field(ge=0.0, le=1.0)
    claims: List[FactCheckResult]
    hallucination_indicators: List[str]
    reasoning: str
    overall_assessment: str


class HallucinationDetector:
    """Detect hallucinations and verify factual accuracy in agent responses."""

    def __init__(
        self,
        fact_check_agent: Optional[Agent] = None,
        enable_deep_check: bool = True,
    ) -> None:
        self.enable_deep_check = enable_deep_check
        self.fact_check_agent = fact_check_agent or self._create_default_agent()

    def _create_default_agent(self) -> Agent:
        """Create a default fact-checking agent."""
        return Agent(
            name="Fact Checker",
            model=OpenAIChat(id="gpt-4o-mini"),
            instructions=[
                "You are a rigorous fact-checker and hallucination detector.",
                "Your job is to analyze AI-generated responses for factual accuracy.",
                "",
                "CRITICAL ANALYSIS STEPS:",
                "1. Extract all factual claims from the response",
                "2. Identify specific, verifiable statements vs vague assertions",
                "3. Check for common hallucination patterns:",
                "   - Made-up statistics or dates",
                "   - Fake citations or references",
                "   - Overly confident statements about uncertain things",
                "   - Mixing real and fictional entities",
                "   - Contradictory statements",
                "4. Assess confidence level (0.0-1.0) for each claim",
                "",
                "HALLUCINATION INDICATORS:",
                "- Specific numbers/dates without sources",
                "- References to non-existent documents",
                "- Contradictions within the text",
                "- Overly specific details that can't be verified",
                "- Statements presented as fact without hedging",
                "",
                "OUTPUT FORMAT:",
                "Return structured assessment of each claim's factuality.",
            ],
            output_schema=HallucinationCheckResult,
        )

    def check_response(
        self,
        response_text: str,
        context: Optional[str] = None,
        reference_knowledge: Optional[List[str]] = None,
    ) -> ValidationMetrics:
        """
        Check a response for hallucinations and factual accuracy.

        Args:
            response_text: The agent's response to check
            context: Optional context/input that led to the response
            reference_knowledge: Optional list of verified knowledge sources

        Returns:
            ValidationMetrics with detailed analysis
        """
        metrics = ValidationMetrics()

        # Quick heuristic checks
        quick_indicators = self._quick_hallucination_check(response_text)
        metrics.hallucination_indicators.extend(quick_indicators)

        # Extract factual claims
        claims = self._extract_claims(response_text)
        metrics.factual_claims = claims

        # If deep checking is enabled, use the fact-checking agent
        if self.enable_deep_check and claims:
            check_result = self._deep_fact_check(
                response_text, context, reference_knowledge
            )

            metrics.confidence_score = check_result.confidence_score
            metrics.verified_claims = [
                c.claim for c in check_result.claims if c.is_factual
            ]
            metrics.hallucination_indicators.extend(
                check_result.hallucination_indicators
            )
            metrics.evidence_count = len([c for c in check_result.claims if c.evidence])

            # Set validation status based on results
            if check_result.is_hallucinated:
                metrics.status = ValidationStatus.HALLUCINATION
            elif check_result.confidence_score >= 0.8:
                metrics.status = ValidationStatus.VALID
            elif check_result.confidence_score >= 0.5:
                metrics.status = ValidationStatus.PARTIAL
            else:
                metrics.status = ValidationStatus.INVALID

            # Add reasoning steps
            metrics.reasoning_steps.append(check_result.reasoning)
            metrics.reasoning_steps.append(check_result.overall_assessment)

        else:
            # Without deep checking, use heuristics only
            if len(quick_indicators) >= 3:
                metrics.status = ValidationStatus.HALLUCINATION
                metrics.confidence_score = 0.3
            elif len(quick_indicators) >= 1:
                metrics.status = ValidationStatus.PARTIAL
                metrics.confidence_score = 0.6
            else:
                metrics.status = ValidationStatus.UNVERIFIED
                metrics.confidence_score = 0.7

        return metrics

    def _quick_hallucination_check(self, text: str) -> List[str]:
        """Fast heuristic checks for common hallucination patterns."""
        indicators = []

        # Check for unsourced statistics
        if re.search(r"\d+(\.\d+)?%", text) and "according to" not in text.lower():
            indicators.append("Unsourced statistics detected")

        # Check for specific dates without context
        specific_dates = re.findall(r"\b\d{4}\b", text)
        if len(specific_dates) > 3:
            indicators.append("Multiple specific dates without clear sourcing")

        # Check for overly precise numbers
        precise_numbers = re.findall(r"\d{3,}(?:,\d{3})*(?:\.\d+)?", text)
        if len(precise_numbers) > 2 and "approximately" not in text.lower():
            indicators.append("Overly precise numbers without qualification")

        # Check for made-up citations
        if re.search(r"\(.*?\s+et al\.,?\s+\d{4}\)", text):
            indicators.append("Academic citation format found - may need verification")

        # Check for contradictions
        words = text.lower().split()
        if "always" in words and "never" in words:
            indicators.append("Contains absolute statements that may conflict")

        # Check for hedging words (good sign, absence might be bad)
        hedging_words = ["may", "might", "possibly", "likely", "probably", "appears"]
        has_hedging = any(word in text.lower() for word in hedging_words)
        if not has_hedging and len(text.split()) > 50:
            indicators.append("Lacks hedging language for uncertain statements")

        # Check for fake URLs or references
        if "http" in text.lower() or "www." in text.lower():
            urls = re.findall(r"https?://[^\s]+|www\.[^\s]+", text)
            if urls:
                indicators.append(f"Contains {len(urls)} URLs - verification needed")

        return indicators

    def _extract_claims(self, text: str) -> List[str]:
        """Extract factual claims from text."""
        # Split into sentences
        sentences = re.split(r"[.!?]+", text)
        claims = []

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            # Look for sentences that make factual claims
            # (contain numbers, names, specific assertions)
            if any(
                [
                    re.search(r"\d+", sentence),
                    re.search(r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b", sentence),
                    any(
                        word in sentence.lower()
                        for word in ["is", "was", "are", "were", "will"]
                    ),
                ]
            ):
                claims.append(sentence)

        return claims[:10]  # Limit to first 10 claims for performance

    def _deep_fact_check(
        self,
        response_text: str,
        context: Optional[str] = None,
        reference_knowledge: Optional[List[str]] = None,
    ) -> HallucinationCheckResult:
        """Perform deep fact-checking using the fact-checking agent."""
        check_prompt = f"""Analyze this AI-generated response for hallucinations and factual accuracy:

RESPONSE TO CHECK:
{response_text}
"""

        if context:
            check_prompt += f"""
ORIGINAL CONTEXT/QUESTION:
{context}
"""

        if reference_knowledge:
            check_prompt += f"""
VERIFIED KNOWLEDGE SOURCES:
{chr(10).join(f"- {k}" for k in reference_knowledge[:5])}
"""

        check_prompt += """
Provide a detailed analysis of:
1. Each factual claim made
2. Whether each claim is likely factual or hallucinated
3. Confidence level for each assessment
4. Overall hallucination risk
5. Specific indicators that suggest hallucination
"""

        result = self.fact_check_agent.run(check_prompt)
        return result.content

    def batch_check(self, responses: List[Dict[str, str]]) -> List[ValidationMetrics]:
        """Check multiple responses in batch."""
        return [
            self.check_response(
                response_text=r.get("response", ""),
                context=r.get("context"),
                reference_knowledge=r.get("references"),
            )
            for r in responses
        ]


# Global singleton instance
_global_detector: Optional[HallucinationDetector] = None


def get_hallucination_detector() -> HallucinationDetector:
    """Get or create the global hallucination detector instance."""
    global _global_detector
    if _global_detector is None:
        _global_detector = HallucinationDetector()
    return _global_detector
