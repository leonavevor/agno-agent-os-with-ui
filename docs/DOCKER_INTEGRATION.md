# Docker Integration Guide

Complete guide for deploying AgentOS with all advanced features in Docker.

## Quick Start

### 1. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your API keys
nano .env
```

### 2. Start Services

```bash
# Development mode with hot reload
docker compose up -d

# Production mode
docker compose -f compose.prod.yaml up -d
```

### 3. Verify Deployment

```bash
# Check service health
curl http://localhost:7777/health

# Check logs
docker compose logs -f agno-backend-api
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                          │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   agno-ui        │  │  agno-backend    │  │  pgvector    │  │
│  │   (Next.js)      │  │  (FastAPI)       │  │  (Postgres   │  │
│  │   Port: 3000     │  │  Port: 7777      │  │   + vector)  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │          │
│           │    agent-os network │                    │          │
│           └─────────────────────┴────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Volumes                                                  │  │
│  │  • pgdata (PostgreSQL data)                              │  │
│  │  • /agno-ui/node_modules (Frontend dependencies)         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Configuration

### pgvector (Database)

**Image**: `agnohq/pgvector:16`

**Features**:
- PostgreSQL 16 with pgvector extension
- Automatic extension initialization
- Health checks for reliable startup
- Persistent volume for data

**Environment Variables**:
```env
POSTGRES_USER=ai
POSTGRES_PASSWORD=ai
POSTGRES_DB=ai
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_SHARED_BUFFERS=256MB
```

**Health Check**:
```yaml
test: ["CMD-SHELL", "pg_isready -U ai -d ai"]
interval: 10s
timeout: 5s
retries: 5
```

---

### agno-backend-api (API Server)

**Image**: Built from `Dockerfile`

**Features**:
- FastAPI application with hot reload (dev)
- Automatic database initialization
- Memory management tables
- Vector reference tables
- Health check endpoints

**Environment Variables**:

| Variable            | Default  | Description                  |
| ------------------- | -------- | ---------------------------- |
| `DB_HOST`           | pgvector | Database host                |
| `DB_PORT`           | 5432     | Database port                |
| `DB_USER`           | ai       | Database user                |
| `DB_PASS`           | ai       | Database password            |
| `DB_DATABASE`       | ai       | Database name                |
| `OPENAI_API_KEY`    | -        | OpenAI API key (required)    |
| `WAIT_FOR_DB`       | True     | Wait for DB before starting  |
| `INIT_DB`           | True     | Initialize tables on startup |
| `ENABLE_MEMORY`     | True     | Enable memory features       |
| `ENABLE_VECTOR_RAG` | True     | Enable vector search         |
| `ENABLE_VALIDATION` | True     | Enable validation loops      |
| `WORKERS`           | 1        | Number of uvicorn workers    |

**Health Check**:
```yaml
test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
interval: 30s
timeout: 10s
retries: 3
start_period: 40s
```

**Startup Sequence**:
1. Wait for PostgreSQL to be ready
2. Enable pgvector extension
3. Initialize memory tables
4. Initialize vector reference tables
5. Start uvicorn server

---

### agno-ui-custom (Frontend)

**Image**: `node:25-bookworm-slim`

**Features**:
- Next.js development server with hot reload
- Memory panel UI
- Reference search UI
- Skill catalog UI

**Environment Variables**:
```env
NEXT_PUBLIC_API_URL=http://localhost:7777
NEXT_PUBLIC_ENABLE_MEMORY=true
NEXT_PUBLIC_ENABLE_VECTOR_RAG=true
NEXT_PUBLIC_ENABLE_SKILLS=true
NODE_ENV=development
```

**Health Check**:
```yaml
test: ["CMD", "curl", "-f", "http://localhost:3000"]
interval: 30s
timeout: 10s
retries: 3
start_period: 60s
```

---

## Database Initialization

The `scripts/init_db.sh` script automatically:

1. ✅ Waits for PostgreSQL to be ready
2. ✅ Enables pgvector extension
3. ✅ Creates memory tables:
   - `chat_messages` - Chat history
   - `session_memory` - Session metadata and learned facts
4. ✅ Creates vector tables:
   - `reference_documents` - Embedded skill references

**Manual Initialization** (if needed):
```bash
docker compose exec agno-backend-api /app/scripts/init_db.sh
```

---

## Health Checks

### Development Health Check

```bash
curl http://localhost:7777/health
```

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "error": null
  },
  "features": {
    "memory": true,
    "vector_rag": true,
    "validation": true,
    "skills": true
  },
  "uptime": 123.45
}
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /liveness
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /readiness
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## Production Deployment

### Using compose.prod.yaml

```bash
# Build production image
docker compose -f compose.prod.yaml build

# Start services
docker compose -f compose.prod.yaml up -d

# Scale API servers
docker compose -f compose.prod.yaml up -d --scale agno-backend-api=3
```

### Production Optimizations

**compose.prod.yaml** includes:
- ✅ Resource limits (CPU, memory)
- ✅ Multiple uvicorn workers
- ✅ No hot reload (faster)
- ✅ Redis caching (optional)
- ✅ Nginx reverse proxy (optional)
- ✅ Rolling updates strategy
- ✅ Automatic restarts on failure

### Environment Variables for Production

```env
# Disable debugging
PRINT_ENV_ON_LOAD=False
UVICORN_RELOAD=False

# Performance
WORKERS=4
POSTGRES_MAX_CONNECTIONS=100

# Security
CORS_ORIGINS=https://yourdomain.com
LOG_LEVEL=WARNING

# Optional: Redis
REDIS_HOST=redis
REDIS_PASSWORD=your_redis_password
```

---

## Volumes and Persistence

### pgdata Volume

Stores PostgreSQL data including:
- All tables (memory, vector, agno)
- Indexes (HNSW for vector search)
- Configuration

**Backup**:
```bash
docker compose exec pgvector pg_dump -U ai ai > backup.sql
```

**Restore**:
```bash
docker compose exec -T pgvector psql -U ai ai < backup.sql
```

### node_modules Volume

Anonymous volume for frontend dependencies:
- Speeds up container restarts
- Prevents conflicts with host node_modules

---

## Networking

### Internal Network

All services communicate via `agent-os` bridge network:
- `pgvector:5432` - Database
- `agno-backend-api:8000` - API server
- `agno-ui-custom:3000` - Frontend dev server

### External Access

| Service     | Host Port  | Container Port |
| ----------- | ---------- | -------------- |
| Frontend    | 3000       | 3000           |
| Backend API | 7777       | 8000           |
| PostgreSQL  | (internal) | 5432           |

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps pgvector

# Check logs
docker compose logs pgvector

# Test connection manually
docker compose exec agno-backend-api psql -h pgvector -U ai -d ai
```

### Memory Tables Not Created

```bash
# Manually run initialization
docker compose exec agno-backend-api python -c "from core.memory_manager import MemoryManager; MemoryManager()"
```

### Vector Extension Not Enabled

```bash
# Enable manually
docker compose exec pgvector psql -U ai -d ai -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Frontend Can't Connect to Backend

Check environment variables:
```bash
docker compose exec agno-ui-custom env | grep API_URL
```

Should be: `NEXT_PUBLIC_API_URL=http://localhost:7777`

### Hot Reload Not Working

Ensure volumes are mounted:
```bash
docker compose config | grep volumes -A 5
```

---

## Performance Tuning

### PostgreSQL

```yaml
environment:
  POSTGRES_MAX_CONNECTIONS: 200
  POSTGRES_SHARED_BUFFERS: 512MB
  POSTGRES_EFFECTIVE_CACHE_SIZE: 2GB
```

### Backend API

```yaml
environment:
  WORKERS: 4  # Number of CPU cores
  UVICORN_RELOAD: False  # Disable in production
```

### Frontend

```yaml
environment:
  NODE_ENV: production  # Enable optimizations
```

---

## Monitoring

### Container Stats

```bash
docker stats
```

### Service Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f agno-backend-api

# Last 100 lines
docker compose logs --tail=100 agno-backend-api
```

### Database Queries

```bash
docker compose exec pgvector psql -U ai -d ai -c "
  SELECT pid, query, state 
  FROM pg_stat_activity 
  WHERE state != 'idle';
"
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker image
        run: |
          docker build -t myregistry/agent-os:${{ github.sha }} .
          docker push myregistry/agent-os:${{ github.sha }}
      
      - name: Deploy to server
        run: |
          ssh user@server "cd /app && docker compose pull && docker compose up -d"
```

---

## Security Best Practices

1. ✅ **Never commit .env files**
   ```bash
   echo ".env" >> .gitignore
   ```

2. ✅ **Use secrets management in production**
   ```bash
   docker secret create openai_key /path/to/key
   ```

3. ✅ **Run as non-root user** (already configured in Dockerfile)

4. ✅ **Enable SSL in production**
   - Use nginx reverse proxy with Let's Encrypt
   - Set `CORS_ORIGINS` appropriately

5. ✅ **Restrict database access**
   - Don't expose PostgreSQL port externally
   - Use strong passwords

---

## Summary

Docker integration provides:

✅ **One-command deployment**: `docker compose up`  
✅ **Automatic initialization**: Database tables created on startup  
✅ **Health checks**: Reliable container orchestration  
✅ **Hot reload**: Development-friendly workflow  
✅ **Production-ready**: compose.prod.yaml with optimizations  
✅ **Persistent data**: Volume management for PostgreSQL  
✅ **Feature flags**: Enable/disable features via environment  
✅ **Scalability**: Multi-worker support, resource limits  

All advanced features (memory, vector RAG, validation) work seamlessly in Docker with zero manual configuration required.
