# Docker Troubleshooting Guide

Common issues and solutions for Docker deployment.

## Table of Contents

1. [Services Not Starting](#services-not-starting)
2. [Database Connection Issues](#database-connection-issues)
3. [Memory Tables Not Created](#memory-tables-not-created)
4. [pgvector Extension Issues](#pgvector-extension-issues)
5. [Frontend Can't Connect to Backend](#frontend-cant-connect-to-backend)
6. [Hot Reload Not Working](#hot-reload-not-working)
7. [Port Conflicts](#port-conflicts)
8. [Performance Issues](#performance-issues)
9. [API Key Errors](#api-key-errors)
10. [Volume Permission Issues](#volume-permission-issues)

---

## Services Not Starting

### Symptom
```
Error: service "agno-backend-api" didn't complete successfully: exit 1
```

### Diagnosis
```sh
# Check service status
docker compose ps

# View logs
docker compose logs agno-backend-api
```

### Solutions

**1. Health check failing**
```sh
# Check if database is ready
docker compose exec pgvector pg_isready -U ai -d ai

# If not ready, wait and restart
docker compose restart agno-backend-api
```

**2. Missing environment variables**
```sh
# Verify environment is loaded
docker compose config | grep -A 20 environment

# Check .env file exists
ls -la .env
```

**3. Database initialization issues**
```sh
# Manually run initialization
docker compose exec agno-backend-api /app/scripts/init_db.sh

# Check tables were created
docker compose exec pgvector psql -U ai -d ai -c "\dt"
```

---

## Database Connection Issues

### Symptom
```
could not connect to server: Connection refused
Is the server running on host "pgvector" and accepting connections on port 5432?
```

### Diagnosis
```sh
# Check if pgvector is running
docker compose ps pgvector

# Check database logs
docker compose logs pgvector

# Test connection from backend
docker compose exec agno-backend-api psql -h pgvector -U ai -d ai
```

### Solutions

**1. Service not healthy**
```sh
# Wait for health check to pass
docker compose ps
# Look for "(healthy)" status

# If stuck, restart database
docker compose restart pgvector

# Check health check logs
docker compose logs pgvector | grep health
```

**2. Wrong connection parameters**
```sh
# Verify environment variables
docker compose exec agno-backend-api env | grep DB_

# Should show:
# DB_HOST=pgvector
# DB_PORT=5432
# DB_USER=ai
# DB_PASS=ai
# DB_DATABASE=ai
```

**3. Network issues**
```sh
# Check network exists
docker network ls | grep agent-os

# Recreate network
docker compose down
docker compose up -d
```

---

## Memory Tables Not Created

### Symptom
```
relation "chat_messages" does not exist
relation "session_memory" does not exist
```

### Diagnosis
```sh
# Check what tables exist
docker compose exec pgvector psql -U ai -d ai -c "\dt"

# Check if init script ran
docker compose logs agno-backend-api | grep "Initializing database"
```

### Solutions

**1. Initialization disabled**
```sh
# Check INIT_DB flag
docker compose config | grep INIT_DB

# If false or missing, add to .env:
echo "INIT_DB=True" >> .env

# Restart services
docker compose up -d --force-recreate agno-backend-api
```

**2. Manual initialization**
```sh
# Run init script manually
docker compose exec agno-backend-api /app/scripts/init_db.sh

# Verify tables were created
docker compose exec pgvector psql -U ai -d ai -c "\dt"

# Should show:
#  chat_messages
#  session_memory
#  reference_documents
```

**3. Create tables via Python**
```sh
docker compose exec agno-backend-api python << 'EOF'
from core.memory_manager import MemoryManager
memory = MemoryManager()
print("Memory tables created successfully")
EOF
```

---

## pgvector Extension Issues

### Symptom
```
ERROR: extension "vector" does not exist
```

### Diagnosis
```sh
# Check if extension is enabled
docker compose exec pgvector psql -U ai -d ai -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

### Solutions

**1. Enable extension manually**
```sh
docker compose exec pgvector psql -U ai -d ai -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**2. Verify image has pgvector**
```sh
# Check image
docker compose exec pgvector psql --version

# Should use agnohq/pgvector:16 image
docker compose config | grep image
```

**3. Rebuild database with clean volume**
```sh
# CAUTION: This deletes all data
docker compose down -v
docker compose up -d
```

---

## Frontend Can't Connect to Backend

### Symptom
```
Failed to fetch: net::ERR_CONNECTION_REFUSED
```

### Diagnosis
```sh
# Check if backend is running
curl http://localhost:7777/health

# Check frontend environment
docker compose exec agno-ui-custom env | grep API_URL
```

### Solutions

**1. Wrong API URL**
```sh
# Check .env file
grep NEXT_PUBLIC_API_URL .env

# Should be:
# NEXT_PUBLIC_API_URL=http://localhost:7777

# Restart frontend after changing
docker compose restart agno-ui-custom
```

**2. Backend not ready**
```sh
# Wait for backend health check
./scripts/validate_docker.sh

# Check backend logs
docker compose logs -f agno-backend-api
```

**3. CORS issues**
```sh
# Check if CORS is configured correctly
docker compose logs agno-backend-api | grep CORS

# Add to .env if needed:
echo "CORS_ORIGINS=http://localhost:3000" >> .env
docker compose up -d --force-recreate agno-backend-api
```

---

## Hot Reload Not Working

### Symptom
Code changes not reflected without container restart.

### Diagnosis
```sh
# Check if volumes are mounted
docker compose config | grep -A 10 volumes

# Check file timestamps
docker compose exec agno-backend-api stat /app/app/main.py
stat app/main.py
```

### Solutions

**1. Verify volume mounts**
```yaml
# Should have in compose.yaml:
volumes:
  - .:/app
```

**2. Disable file watchers (macOS)**
```sh
# If using macOS with limited file watchers
echo "WATCHFILES_FORCE_POLLING=True" >> .env
docker compose restart agno-backend-api
```

**3. Force reload**
```sh
# Restart specific service
docker compose restart agno-backend-api

# Or rebuild
docker compose up -d --build
```

---

## Port Conflicts

### Symptom
```
Error: bind: address already in use
```

### Diagnosis
```sh
# Check what's using the ports
lsof -i :7777
lsof -i :3000
lsof -i :5432

# Or on Linux:
ss -tulpn | grep -E '7777|3000|5432'
```

### Solutions

**1. Change port mapping**
```yaml
# Edit compose.yaml
services:
  agno-backend-api:
    ports:
      - "8888:8000"  # Use different host port
```

**2. Stop conflicting services**
```sh
# Find process using port
lsof -ti:7777 | xargs kill -9

# Or stop all docker containers
docker stop $(docker ps -aq)
```

**3. Use different ports in .env**
```env
BACKEND_PORT=8888
FRONTEND_PORT=3001
```

---

## Performance Issues

### Symptom
Slow response times, high memory usage, or CPU spikes.

### Diagnosis
```sh
# Monitor container resources
docker stats

# Check logs for slow queries
docker compose logs agno-backend-api | grep -i slow

# Check database connections
docker compose exec pgvector psql -U ai -d ai -c "SELECT count(*) FROM pg_stat_activity;"
```

### Solutions

**1. Increase worker count (production)**
```env
# Add to .env
WORKERS=4  # Match CPU cores
```

**2. Tune PostgreSQL**
```env
# Add to .env
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
```

**3. Add resource limits**
```yaml
# In compose.prod.yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

**4. Enable Redis caching**
```sh
# Uncomment Redis service in compose.prod.yaml
# Add to .env:
echo "REDIS_HOST=redis" >> .env
```

---

## API Key Errors

### Symptom
```
openai.AuthenticationError: Invalid API key
```

### Diagnosis
```sh
# Check if API key is set
docker compose exec agno-backend-api env | grep OPENAI_API_KEY

# Verify key format
echo $OPENAI_API_KEY | grep -E '^sk-'
```

### Solutions

**1. Set API key correctly**
```sh
# Add to .env (not .env.example)
echo "OPENAI_API_KEY=sk-your-actual-key" >> .env

# Restart to reload environment
docker compose up -d --force-recreate agno-backend-api
```

**2. Use different provider**
```env
# For Anthropic
ANTHROPIC_API_KEY=sk-ant-your-key

# For Google
GOOGLE_API_KEY=your-google-key
```

**3. Verify key is valid**
```sh
# Test API key manually
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## Volume Permission Issues

### Symptom
```
Permission denied: '/app/data'
mkdir: cannot create directory: Permission denied
```

### Diagnosis
```sh
# Check volume permissions
docker compose exec agno-backend-api ls -la /app

# Check host directory permissions
ls -la $(pwd)
```

### Solutions

**1. Fix ownership (Linux)**
```sh
# Match container user (1000:1000 by default)
sudo chown -R 1000:1000 .
```

**2. Use named volumes**
```yaml
# Edit compose.yaml
volumes:
  app_data:

services:
  agno-backend-api:
    volumes:
      - app_data:/app/data
```

**3. Run with host user (development only)**
```yaml
# Add to compose.yaml
services:
  agno-backend-api:
    user: "${UID}:${GID}"
```

---

## Getting More Help

### View all logs
```sh
docker compose logs -f
```

### Check system resources
```sh
docker system df
docker system prune  # Clean up unused resources
```

### Validate deployment
```sh
./scripts/validate_docker.sh
```

### Debug specific service
```sh
# Get shell in container
docker compose exec agno-backend-api bash

# Run commands interactively
python -c "from core.memory_manager import MemoryManager; print(MemoryManager())"
```

### Report issues
If problems persist:
1. Run validation script and save output
2. Collect logs: `docker compose logs > debug.log`
3. Include your compose.yaml and .env (remove sensitive data)
4. Report at: https://github.com/agno-agi/agent-infra-docker/issues

---

## Quick Reference

### Service Health Endpoints
```sh
curl http://localhost:7777/health      # Full health check
curl http://localhost:7777/liveness    # Service alive
curl http://localhost:7777/readiness   # Ready for traffic
```

### Common Commands
```sh
docker compose ps                      # Service status
docker compose logs -f SERVICE         # Follow logs
docker compose restart SERVICE         # Restart service
docker compose up -d --build          # Rebuild and restart
docker compose down -v                 # Stop and remove volumes
./scripts/validate_docker.sh          # Run validation
```

### Emergency Reset
```sh
# CAUTION: Deletes all data
docker compose down -v
docker system prune -a --volumes -f
docker compose up -d --build
```
