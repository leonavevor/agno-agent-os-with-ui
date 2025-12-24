"""Tests for self-healing validation loop."""

import json
from unittest.mock import MagicMock

import pytest
from core.validation_loop import ValidationLoop, validate_response
from pydantic import BaseModel, Field, ValidationError


class SampleResponse(BaseModel):
    """Test response model."""

    answer: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    sources: list[str] = Field(default_factory=list)


@pytest.fixture
def mock_agent():
    """Create mock agent."""
    agent = MagicMock()
    agent.name = "TestAgent"
    return agent


def test_validation_success_first_try(mock_agent):
    """Test successful validation on first attempt."""
    valid_json = json.dumps(
        {"answer": "Test answer", "confidence": 0.95, "sources": ["source1"]}
    )

    loop = ValidationLoop(mock_agent, max_retries=2)
    result = loop.validate_and_fix(valid_json, SampleResponse)

    assert isinstance(result, SampleResponse)
    assert result.answer == "Test answer"
    assert result.confidence == 0.95
    assert len(result.sources) == 1


def test_validation_with_retry(mock_agent):
    """Test validation with self-healing retry."""
    invalid_json = json.dumps(
        {"answer": "Test", "confidence": 1.5}
    )  # Invalid confidence

    corrected_json = json.dumps(
        {"answer": "Test corrected", "confidence": 0.85, "sources": []}
    )

    # Mock agent returns corrected response
    mock_result = MagicMock()
    mock_result.content = corrected_json
    mock_agent.run.return_value = mock_result

    loop = ValidationLoop(mock_agent, max_retries=2)
    result = loop.validate_and_fix(invalid_json, SampleResponse)

    assert isinstance(result, SampleResponse)
    assert result.answer == "Test corrected"
    assert result.confidence == 0.85
    assert mock_agent.run.called


def test_validation_exhausts_retries(mock_agent):
    """Test validation failure after exhausting retries."""
    invalid_json = json.dumps({"answer": "", "confidence": 2.0})  # Multiple errors

    # Mock agent keeps returning invalid responses
    mock_result = MagicMock()
    mock_result.content = invalid_json
    mock_agent.run.return_value = mock_result

    loop = ValidationLoop(mock_agent, max_retries=1)

    with pytest.raises(ValidationError) as exc_info:
        loop.validate_and_fix(invalid_json, SampleResponse)

    # Validation error should be raised with details about fields
    assert "validation error" in str(exc_info.value).lower()
    assert "answer" in str(exc_info.value) or "confidence" in str(exc_info.value)


def test_convenience_function(mock_agent):
    """Test convenience function for validation."""
    valid_json = json.dumps({"answer": "Quick test", "confidence": 0.5, "sources": []})

    result = validate_response(mock_agent, valid_json, SampleResponse, max_retries=1)

    assert isinstance(result, SampleResponse)
    assert result.answer == "Quick test"


def test_transform_function(mock_agent):
    """Test validation with custom transform function."""
    raw_response = "ANSWER: Test | CONFIDENCE: 0.75"

    def extract_data(text: str) -> dict:
        parts = text.split("|")
        return {
            "answer": parts[0].split(":")[1].strip(),
            "confidence": float(parts[1].split(":")[1].strip()),
            "sources": [],
        }

    loop = ValidationLoop(mock_agent)
    result = loop.validate_and_fix(
        raw_response, SampleResponse, transform_fn=extract_data
    )

    assert result.answer == "Test"
    assert result.confidence == 0.75


def test_correction_prompt_formatting(mock_agent):
    """Test that correction prompts are well-formatted."""
    invalid_json = json.dumps({"answer": "Test", "confidence": "high"})  # Wrong type

    corrected_json = json.dumps({"answer": "Test", "confidence": 0.8, "sources": []})
    mock_result = MagicMock()
    mock_result.content = corrected_json
    mock_agent.run.return_value = mock_result

    loop = ValidationLoop(mock_agent, max_retries=1)
    loop.validate_and_fix(invalid_json, SampleResponse)

    # Verify correction prompt was sent
    assert mock_agent.run.called
    correction_prompt = mock_agent.run.call_args[0][0]
    assert "VALIDATION ERRORS:" in correction_prompt
    assert "EXPECTED SCHEMA:" in correction_prompt
    assert "ORIGINAL OUTPUT:" in correction_prompt
