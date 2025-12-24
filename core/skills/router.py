"""Simple keyword-based router for selecting relevant skills."""

from __future__ import annotations

from collections import Counter
from difflib import SequenceMatcher
import re
from typing import Iterable, List, Sequence

from .models import SkillMetadata
from .registry import SkillRegistry


class SkillRouter:
    """Score skills against a message and return the most relevant matches."""

    def __init__(self, registry: SkillRegistry) -> None:
        self._registry = registry

    def route(
        self,
        message: str,
        *,
        limit: int | None = None,
        tags: Iterable[str] | None = None,
        min_score: float = 0.0,
    ) -> List[SkillMetadata]:
        if not message:
            return []

        normalized_message = message.lower()
        tokens = _tokenize(normalized_message)
        token_counts = Counter(tokens)
        token_set = set(tokens)
        required_tags = {tag.lower() for tag in tags} if tags else None

        scored: List[tuple[float, SkillMetadata]] = []
        for metadata in self._registry.list_metadata():
            if required_tags and not required_tags.intersection(
                tag.lower() for tag in metadata.tags
            ):
                continue
            score = self._score(metadata, normalized_message, token_counts, token_set)
            if score <= min_score:
                continue
            scored.append((score, metadata))

        scored.sort(key=lambda item: item[0], reverse=True)
        if limit is not None:
            scored = scored[:limit]
        return [metadata for _, metadata in scored]

    def _score(
        self,
        metadata: SkillMetadata,
        normalized_message: str,
        token_counts: Counter[str],
        token_set: set[str],
    ) -> float:
        score = 0.0

        for term in metadata.match_terms:
            if not term:
                continue
            if term in normalized_message:
                score += 3.0 + (0.05 * len(term))
                continue

            if term in token_set:
                score += 2.5
                continue

            for token in token_set:
                similarity = SequenceMatcher(None, term, token).ratio()
                if similarity >= 0.82:
                    score += 1.5 * similarity
                    break

        for tag in metadata.tags:
            if not tag:
                continue
            if tag.lower() in normalized_message:
                score += 2.0
            elif token_counts.get(tag.lower(), 0) > 0:
                score += 1.5

        keywords: Sequence[str] = metadata.description.lower().split()
        for keyword in keywords:
            if token_counts.get(keyword, 0):
                score += 0.25

        return score


_TOKEN_PATTERN = re.compile(r"\b[\w-]+\b")


def _tokenize(text: str) -> List[str]:
    return _TOKEN_PATTERN.findall(text)
