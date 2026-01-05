#!/usr/bin/env python3
"""Test script to verify HuggingFace embedding models work"""

from app.models_builder import build_embedder


def test_openai_embedder():
    """Test building OpenAI embedder"""
    print("Testing OpenAI embedder...")
    embedder = build_embedder(provider="openai", model_id="text-embedding-3-small")
    print(f"✓ OpenAI embedder created: {type(embedder).__name__}")
    return embedder


def test_huggingface_embedder():
    """Test building HuggingFace embedder"""
    print("\nTesting HuggingFace embedder...")
    embedder = build_embedder(
        provider="huggingface",
        model_id="sentence-transformers/all-MiniLM-L6-v2",
        dimensions=384,
    )
    print(f"✓ HuggingFace embedder created: {type(embedder).__name__}")

    # Test embedding generation
    print("Testing embedding generation...")
    text = "Hello, this is a test sentence."
    embedding = embedder.get_embedding(text)
    print(f"✓ Generated embedding with {len(embedding)} dimensions")
    return embedder


if __name__ == "__main__":
    try:
        test_openai_embedder()
        test_huggingface_embedder()
        print("\n✅ All tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
