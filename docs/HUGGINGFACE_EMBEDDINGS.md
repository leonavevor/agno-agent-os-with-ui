# HuggingFace Local Embedding Support

## Summary

Successfully added support for local HuggingFace embedding models using sentence-transformers. This allows you to run embedding models locally without requiring API keys or internet connectivity.

## Changes Made

### 1. **Backend Configuration** 

#### `app/config/litellm_manager.py`
- Added `huggingface` provider configuration with local support
- Created `DEFAULT_EMBEDDING_CATALOG` with popular embedding models:
  - **sentence-transformers/all-MiniLM-L6-v2** (384 dimensions) - Fast and efficient
  - **sentence-transformers/all-mpnet-base-v2** (768 dimensions) - High quality
  - **BAAI/bge-small-en-v1.5** (384 dimensions) - Fast, high-quality
  - **BAAI/bge-base-en-v1.5** (768 dimensions) - Balanced performance
- Added `get_embedding_catalog()` function to retrieve available embedding models

#### `app/config/litellm.yaml`
- Added `huggingface` provider section
- Added `embedding_catalog` section with model definitions
- Configured default embedding settings

#### `app/models_builder.py`
- Updated `build_embedder()` to support HuggingFace models
- Implemented lazy import for SentenceTransformerEmbedder to avoid loading heavy dependencies at startup
- Added provider routing logic to instantiate correct embedder type

#### `app/api/models.py`
- Added `EmbeddingInfo` Pydantic model for embedding metadata
- Added `EmbeddingProvider` model for grouping embeddings by provider
- Created `/models/embeddings/list` endpoint to list all available embedding models
- Created `/models/embeddings/default` endpoint to get current default embedding configuration
- Added `_build_embedding_registry()` helper function

### 2. **Dependencies**

#### `requirements.txt`
- Added `sentence-transformers==3.3.1`
- Added `scikit-learn>=1.3.0` (required by sentence-transformers)
- Added `scipy>=1.11.0` (required by transformers)

### 3. **Bug Fixes**

#### `app/main.py`
- Added `litellm.drop_params = True` to automatically drop unsupported parameters for each model provider
- This fixes the `top_p` parameter error with OpenAI models

## API Endpoints

### List Available Embedding Models
```bash
GET /models/embeddings/list
```

**Response:**
```json
[
  {
    "id": "openai",
    "name": "OpenAI",
    "embeddings": [
      {
        "id": "text-embedding-3-small",
        "name": "Text Embedding 3 Small",
        "provider": "openai",
        "dimensions": 1536,
        "description": "Most capable embedding model"
      }
    ]
  },
  {
    "id": "huggingface",
    "name": "HuggingFace (Local)",
    "embeddings": [
      {
        "id": "sentence-transformers/all-MiniLM-L6-v2",
        "name": "MiniLM L6 v2",
        "provider": "huggingface",
        "dimensions": 384,
        "description": "Fast and efficient local embeddings"
      }
    ]
  }
]
```

### Get Default Embedding Configuration
```bash
GET /models/embeddings/default
```

**Response:**
```json
{
  "provider": "openai",
  "model_id": "text-embedding-3-small",
  "dimensions": 1536
}
```

## Usage Examples

### Using HuggingFace Embeddings in Code

```python
from app.models_builder import build_embedder

# Build a HuggingFace embedder
embedder = build_embedder(
    provider="huggingface",
    model_id="sentence-transformers/all-MiniLM-L6-v2",
    dimensions=384
)

# Generate embeddings
text = "This is a test sentence"
embedding = embedder.get_embedding(text)
print(f"Generated {len(embedding)} dimensional embedding")
```

### Using with Knowledge Base

```python
from agno.knowledge.knowledge import Knowledge
from agno.vectordb.pgvector import PgVector
from app.models_builder import build_embedder

# Create knowledge base with HuggingFace embeddings
knowledge = Knowledge(
    vector_db=PgVector(
        db_url="postgresql+psycopg://ai:ai@localhost:5532/ai",
        table_name="documents",
        embedder=build_embedder(
            provider="huggingface",
            model_id="BAAI/bge-base-en-v1.5",
            dimensions=768
        ),
    ),
    max_results=5,
)
```

### Changing Default Embedding Model

Edit `app/config/litellm.yaml`:

```yaml
defaults:
  embedding:
    provider: huggingface
    model_id: sentence-transformers/all-MiniLM-L6-v2
    dimensions: 384
```

## Benefits

1. **No API Keys Required** - Run embeddings completely offline
2. **Cost Effective** - No per-request charges for embedding generation
3. **Privacy** - Data never leaves your infrastructure
4. **Fast** - Local models can be faster for small batches
5. **Flexible** - Choose from multiple models based on your needs (speed vs quality)

## Performance Considerations

- **First Run**: Models are downloaded on first use (~100-500MB depending on model)
- **Memory**: Models are loaded into RAM (typically 100-400MB per model)
- **Speed**: Local models are fast for single documents, but OpenAI API may be faster for large batches
- **Quality**: Larger models (768 dimensions) provide better quality at the cost of speed and memory

## Recommended Models

- **For Speed**: `sentence-transformers/all-MiniLM-L6-v2` (384 dim)
- **For Quality**: `sentence-transformers/all-mpnet-base-v2` (768 dim)
- **Balanced**: `BAAI/bge-base-en-v1.5` (768 dim)

## Testing

A test script is available at `test_huggingface_embeddings.py`:

```bash
docker compose exec agno-backend-api python test_huggingface_embeddings.py
```

## Next Steps

To integrate with the frontend:
1. Update the UI to show embedding model selection
2. Add embedding provider configuration in settings
3. Display embedding dimensions in knowledge base configuration
4. Add model download progress indicators for first-time HuggingFace model usage
