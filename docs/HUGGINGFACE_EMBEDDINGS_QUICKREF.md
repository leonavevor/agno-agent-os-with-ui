# HuggingFace Local Embeddings - Quick Reference

## Quick Start

### 1. Check Available Models
```bash
curl http://localhost:7777/models/embeddings/list | jq '.[] | select(.id == "huggingface")'
```

### 2. Use in Python Code
```python
from app.models_builder import build_embedder

# Fast, lightweight model (384 dimensions)
embedder = build_embedder(
    provider="huggingface",
    model_id="sentence-transformers/all-MiniLM-L6-v2"
)

# Generate embedding
embedding = embedder.get_embedding("Your text here")
```

### 3. Change Default in Config
Edit `app/config/litellm.yaml`:
```yaml
defaults:
  embedding:
    provider: huggingface
    model_id: sentence-transformers/all-MiniLM-L6-v2
    dimensions: 384
```

## Available Models

| Model                                   | Dimensions | Speed | Quality | Best For               |
| --------------------------------------- | ---------- | ----- | ------- | ---------------------- |
| sentence-transformers/all-MiniLM-L6-v2  | 384        | ⚡⚡⚡   | ⭐⭐      | Fast retrieval         |
| BAAI/bge-small-en-v1.5                  | 384        | ⚡⚡⚡   | ⭐⭐⭐     | Balanced speed/quality |
| sentence-transformers/all-mpnet-base-v2 | 768        | ⚡⚡    | ⭐⭐⭐⭐    | High quality           |
| BAAI/bge-base-en-v1.5                   | 768        | ⚡⚡    | ⭐⭐⭐⭐    | Best overall           |

## API Endpoints

- `GET /models/embeddings/list` - List all available embedding models
- `GET /models/embeddings/default` - Get current default embedding config

## Benefits

✅ No API keys needed  
✅ Works offline  
✅ No per-request costs  
✅ Data stays local  
✅ Fast for small batches  

## First Use

Models are automatically downloaded on first use (~100-500MB per model). Subsequent uses load from cache.

## Memory Usage

- MiniLM (384d): ~100MB RAM
- MPNet/BGE Base (768d): ~300-400MB RAM

## See Also

- Full documentation: [docs/HUGGINGFACE_EMBEDDINGS.md](./HUGGINGFACE_EMBEDDINGS.md)
- Test script: `test_huggingface_embeddings.py`
- Configuration: `app/config/litellm.yaml`
