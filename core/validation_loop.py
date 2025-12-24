"""Self-healing validation loop for LLM responses using Pydantic."""

from __future__ import annotations

from typing import Any, Callable, Optional, Type, TypeVar

from agno.agent import Agent
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


class ValidationLoop:
    """Implements self-healing validation pattern for agent responses."""

    def __init__(
        self,
        agent: Agent,
        max_retries: int = 2,
    ) -> None:
        self.agent = agent
        self.max_retries = max_retries

    def validate_and_fix(
        self,
        response_text: str,
        schema: Type[T],
        *,
        transform_fn: Optional[Callable[[str], dict[str, Any]]] = None,
    ) -> T:
        """
        Validate LLM response against Pydantic schema with retry on failure.

        Args:
            response_text: Raw LLM response
            schema: Pydantic model class to validate against
            transform_fn: Optional function to extract dict from response_text

        Returns:
            Validated Pydantic model instance

        Raises:
            ValidationError: If validation fails after max_retries
        """
        attempt = 0
        current_response = response_text
        validation_errors: list[str] = []

        while attempt <= self.max_retries:
            try:
                # Extract structured data if transform provided
                if transform_fn:
                    data = transform_fn(current_response)
                    return schema.model_validate(data)
                else:
                    # Assume JSON string
                    return schema.model_validate_json(current_response)

            except ValidationError as e:
                validation_errors.append(str(e))
                attempt += 1

                if attempt > self.max_retries:
                    # Final failure - just re-raise the original ValidationError
                    raise

                # Request correction from agent
                correction_prompt = self._build_correction_prompt(
                    original_response=current_response,
                    schema=schema,
                    error=e,
                    attempt=attempt,
                )

                # Get corrected response
                correction_result = self.agent.run(correction_prompt)
                current_response = (
                    correction_result.content
                    if hasattr(correction_result, "content")
                    else str(correction_result)
                )

        # This should never be reached due to max_retries check above
        raise RuntimeError("Unexpected validation loop exit")

    def _build_correction_prompt(
        self,
        original_response: str,
        schema: Type[BaseModel],
        error: ValidationError,
        attempt: int,
    ) -> str:
        """Build a correction prompt for the agent."""
        schema_description = schema.model_json_schema()
        error_details = error.errors()

        prompt = f"""Your previous output failed validation (attempt {attempt}/{self.max_retries}).

VALIDATION ERRORS:
{self._format_validation_errors(error_details)}

EXPECTED SCHEMA:
{schema_description}

ORIGINAL OUTPUT:
{original_response}

Please provide a corrected response that strictly adheres to the schema above. 
Output ONLY the corrected JSON without any explanation or markdown formatting."""

        return prompt

    @staticmethod
    def _format_validation_errors(errors: list[dict[str, Any]]) -> str:
        """Format validation errors for prompt."""
        formatted = []
        for err in errors:
            location = " -> ".join(str(loc) for loc in err.get("loc", []))
            msg = err.get("msg", "Unknown error")
            formatted.append(f"  • {location}: {msg}")
        return "\n".join(formatted)


def validate_response(
    agent: Agent,
    response_text: str,
    schema: Type[T],
    *,
    max_retries: int = 2,
    transform_fn: Optional[Callable[[str], dict[str, Any]]] = None,
) -> T:
    """
    Convenience function for one-off validation with retry.

    Example:
        from pydantic import BaseModel

        class Answer(BaseModel):
            summary: str
            confidence: float

        response = agent.run("What is the weather?")
        validated = validate_response(
            agent,
            response.content,
            Answer,
            max_retries=1
        )
    """
    loop = ValidationLoop(agent, max_retries=max_retries)
    return loop.validate_and_fix(response_text, schema, transform_fn=transform_fn)
