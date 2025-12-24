# Docker Quick Reference 🐳

One-page reference for common Docker operations.

---

## 🚀 Quick Start

```bash
# 1. Setup
cp .env.example .env && nano .env  # Add OPENAI_API_KEY

# 2. Start
docker compose up -d

# 3. Validate
./scripts/validate_docker.sh

# 4. Access
open http://localhost:3000        # Frontend
open http://localhost:7777/docs   # API docs
```

---

## 📋 Essential Commands

### Service Management
```bash
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose down -v            # Stop and remove volumes
docker compose restart            # Restart all services
docker compose restart SERVICE    # Restart specific service
docker compose ps                 # Check service status
docker compose build              # Rebuild images
docker compose up -d --build      # Rebuild and restart
```

### Logs & Debugging
```bash
docker compose logs -f                    # Follow all logs
docker compose logs -f agno-backend-api   # Follow specific service
docker compose logs --tail=100 SERVICE    # Last 100 lines
docker compose exec SERVICE bash          # Get shell in container
docker stats                              # Resource usage
```

### Health Checks
```bash
curl http://localhost:7777/health         # Full health status
curl http://localhost:7777/liveness       # Is service alive?
curl http://localhost:7777/readiness      # Ready for traffic?
./scripts/validate_docker.sh             # Run all validations
./scripts/test_integration.sh            # Run integration tests
```

---

## 🔧 Configuration

### Environment Variables (.env)
```env
# Required
OPENAI_API_KEY=sk-your-key-here

# Database (defaults work)
DB_HOST=pgvector
DB_USER=ai
DB_PASS=ai

# Feature Flags
ENABLE_MEMORY=true
ENABLE_VECTOR_RAG=true
ENABLE_VALIDATION=true
ENABLE_SKILLS=true

# Performance
WORKERS=4
```

### Feature Flags
| Flag                | Default | Description                    |
| ------------------- | ------- | ------------------------------ |
| `ENABLE_MEMORY`     | true    | Session memory & learned facts |
| `ENABLE_VECTOR_RAG` | true    | Semantic search                |
| `ENABLE_VALIDATION` | true    | Self-healing validation        |
| `ENABLE_SKILLS`     | true    | Skill-based architecture       |

---

## 🏥 Health Monitoring

### Check Service Status
```bash
# All services
docker compose ps

# Expected output:
# NAME                 STATUS
# agno-backend-api     Up (healthy)
# agno-ui-custom       Up (healthy)
# pgvector             Up (healthy)
```

### Check Logs for Errors
```bash
docker compose logs | grep -i error
docker compose logs agno-backend-api | grep -i "failed\|error"
```

---

## 🗄️ Database Operations

### Access Database
```bash
docker compose exec pgvector psql -U ai -d ai
```

### Check Tables
```bash
docker compose exec pgvector psql -U ai -d ai -c "\dt"
```

### Backup Database
```bash
docker compose exec pgvector pg_dump -U ai ai > backup.sql
```

### Restore Database
```bash
docker compose exec -T pgvector psql -U ai ai < backup.sql
```

### Reinitialize Database
```bash
docker compose exec agno-backend-api /app/scripts/init_db.sh
```

---

## 🐛 Troubleshooting

### Services Won't Start
```bash
# Check logs
docker compose logs

# Restart specific service
docker compose restart agno-backend-api

# Full restart
docker compose down && docker compose up -d
```

### Database Connection Issues
```bash
# Check if database is healthy
docker compose ps pgvector

# Test connection
docker compose exec agno-backend-api psql -h pgvector -U ai -d ai

# Restart database
docker compose restart pgvector
```

### pgvector Extension Missing
```bash
# Enable manually
docker compose exec pgvector psql -U ai -d ai -c \
  "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Memory Tables Missing
```bash
# Run initialization
docker compose exec agno-backend-api /app/scripts/init_db.sh

# Or recreate with clean slate
docker compose down -v && docker compose up -d
```

### Port Already in Use
```bash
# Find what's using the port
lsof -i :7777

# Kill the process
lsof -ti:7777 | xargs kill -9

# Or change port in .env
echo "BACKEND_PORT=8888" >> .env
```

### Frontend Can't Connect
```bash
# Check API URL
docker compose exec agno-ui-custom env | grep API_URL

# Should be: NEXT_PUBLIC_API_URL=http://localhost:7777

# Fix in .env
echo "NEXT_PUBLIC_API_URL=http://localhost:7777" >> .env
docker compose restart agno-ui-custom
```

---

## 🏭 Production Deployment

### Start Production Stack
```bash
docker compose -f compose.prod.yaml up -d
```

### Scale API Servers
```bash
docker compose -f compose.prod.yaml up -d --scale agno-backend-api=3
```

### Check Production Status
```bash
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs -f
```

### Rolling Update
```bash
docker compose -f compose.prod.yaml up -d --no-deps --build agno-backend-api
```

---

## 📊 Service URLs

| Service      | URL                          | Description            |
| ------------ | ---------------------------- | ---------------------- |
| Frontend     | http://localhost:3000        | Next.js chat interface |
| Backend API  | http://localhost:7777        | FastAPI server         |
| API Docs     | http://localhost:7777/docs   | Interactive API docs   |
| Health Check | http://localhost:7777/health | System status          |

---

## 🧪 Testing

### Quick Validation
```bash
./scripts/validate_docker.sh
```

### Full Integration Tests
```bash
./scripts/test_integration.sh
```

### Manual API Tests
```bash
# Health check
curl http://localhost:7777/health | jq

# List skills
curl http://localhost:7777/api/skills | jq

# Initialize memory session
curl -X POST http://localhost:7777/api/memory/sessions/initialize \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-123"}'

# Search references
curl -X POST http://localhost:7777/api/references/search \
  -H "Content-Type: application/json" \
  -d '{"query": "agent", "mode": "keyword", "limit": 5}'
```

---

## 🔒 Security

### Update API Keys
```bash
nano .env  # Update OPENAI_API_KEY
docker compose up -d --force-recreate agno-backend-api
```

### Check Permissions
```bash
# Ensure .env is not world-readable
chmod 600 .env

# Check container user
docker compose exec agno-backend-api whoami  # Should be 'agno'
```

---

## 🧹 Cleanup

### Remove Stopped Containers
```bash
docker compose down
```

### Remove Volumes (⚠️ deletes data)
```bash
docker compose down -v
```

### Full System Cleanup (⚠️ nuclear option)
```bash
docker system prune -a --volumes -f
```

---

## 📚 Documentation

| Document                                         | Purpose                    |
| ------------------------------------------------ | -------------------------- |
| [README.md](README.md)                           | Getting started guide      |
| [DOCKER_INTEGRATION.md](DOCKER_INTEGRATION.md)   | Complete integration guide |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md)         | Issue resolution           |
| [DOCKER_SUMMARY.md](DOCKER_SUMMARY.md)           | High-level overview        |
| [DOCKER_FINAL_REPORT.md](DOCKER_FINAL_REPORT.md) | Comprehensive report       |

---

## ⚡ Performance Tips

### Development
```env
WORKERS=1              # Single worker for debugging
UVICORN_RELOAD=True    # Hot reload enabled
LOG_LEVEL=DEBUG        # Verbose logging
```

### Production
```env
WORKERS=4              # Match CPU cores
UVICORN_RELOAD=False   # Faster startup
LOG_LEVEL=WARNING      # Less noise
```

### Database Tuning
```env
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
```

---

## 🆘 Getting Help

1. **Run validation**: `./scripts/validate_docker.sh`
2. **Check logs**: `docker compose logs -f`
3. **Read docs**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
4. **Report issue**: https://github.com/agno-agi/agent-infra-docker/issues

---

## ✅ Health Check Reference

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

---

**Need more details?** See [DOCKER_INTEGRATION.md](DOCKER_INTEGRATION.md) for the complete guide.
