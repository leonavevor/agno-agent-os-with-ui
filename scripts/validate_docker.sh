#!/bin/bash
# Docker deployment validation script
# Verifies all services are healthy and functional

set -e

echo "🐳 Docker Deployment Validation Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker compose is running
echo "1️⃣  Checking if Docker Compose is running..."
if ! docker compose ps >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not running${NC}"
    echo "   Run: docker compose up -d"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose is running${NC}"
echo ""

# Check service status
echo "2️⃣  Checking service status..."
SERVICES=$(docker compose ps --services)
for service in $SERVICES; do
    STATUS=$(docker compose ps $service --format "{{.Status}}")
    if [[ $STATUS == *"Up"* ]] && [[ $STATUS == *"healthy"* ]]; then
        echo -e "   ${GREEN}✅ $service: healthy${NC}"
    elif [[ $STATUS == *"Up"* ]]; then
        echo -e "   ${YELLOW}⚠️  $service: running (no health check)${NC}"
    else
        echo -e "   ${RED}❌ $service: not healthy ($STATUS)${NC}"
    fi
done
echo ""

# Wait for backend to be ready
echo "3️⃣  Waiting for backend API to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:7777/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend API is ready${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Backend API did not become ready in time${NC}"
    exit 1
fi
echo ""

# Check health endpoint
echo "4️⃣  Checking backend health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:7777/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Health endpoint responding${NC}"
    
    # Parse and display health status
    STATUS=$(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    DB_CONNECTED=$(echo $HEALTH_RESPONSE | grep -o '"connected":[^,}]*' | cut -d':' -f2)
    
    echo "   Status: $STATUS"
    echo "   Database connected: $DB_CONNECTED"
    
    if [ "$STATUS" != "healthy" ]; then
        echo -e "${RED}❌ System is not healthy${NC}"
        echo "   Response: $HEALTH_RESPONSE"
        exit 1
    fi
else
    echo -e "${RED}❌ Health endpoint not responding${NC}"
    exit 1
fi
echo ""

# Check database connection
echo "5️⃣  Checking database connection..."
if docker compose exec -T pgvector psql -U ai -d ai -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Database is accessible${NC}"
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    exit 1
fi
echo ""

# Check pgvector extension
echo "6️⃣  Checking pgvector extension..."
PGVECTOR_INSTALLED=$(docker compose exec -T pgvector psql -U ai -d ai -c "SELECT * FROM pg_extension WHERE extname='vector';" 2>/dev/null | grep -c "vector")
if [ $PGVECTOR_INSTALLED -gt 0 ]; then
    echo -e "${GREEN}✅ pgvector extension is installed${NC}"
else
    echo -e "${RED}❌ pgvector extension is not installed${NC}"
    echo "   Run: docker compose exec agno-backend-api /app/scripts/init_db.sh"
    exit 1
fi
echo ""

# Check memory tables
echo "7️⃣  Checking memory tables..."
MEMORY_TABLES=$(docker compose exec -T pgvector psql -U ai -d ai -c "\dt" 2>/dev/null | grep -E "chat_messages|session_memory" | wc -l)
if [ $MEMORY_TABLES -eq 2 ]; then
    echo -e "${GREEN}✅ Memory tables exist (chat_messages, session_memory)${NC}"
else
    echo -e "${YELLOW}⚠️  Memory tables not found ($MEMORY_TABLES/2)${NC}"
    echo "   This is normal on first startup if INIT_DB=True"
fi
echo ""

# Check vector tables
echo "8️⃣  Checking vector reference tables..."
VECTOR_TABLES=$(docker compose exec -T pgvector psql -U ai -d ai -c "\dt" 2>/dev/null | grep "reference_documents" | wc -l)
if [ $VECTOR_TABLES -eq 1 ]; then
    echo -e "${GREEN}✅ Vector reference table exists${NC}"
else
    echo -e "${YELLOW}⚠️  Vector reference table not found${NC}"
    echo "   This is normal on first startup if INIT_DB=True"
fi
echo ""

# Check API endpoints
echo "9️⃣  Checking API endpoints..."
ENDPOINTS=(
    "/health"
    "/liveness"
    "/readiness"
    "/docs"
)

for endpoint in "${ENDPOINTS[@]}"; do
    if curl -s "http://localhost:7777$endpoint" >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ $endpoint${NC}"
    else
        echo -e "   ${RED}❌ $endpoint${NC}"
    fi
done
echo ""

# Check frontend (if running)
echo "🔟 Checking frontend..."
if docker compose ps agno-ui-custom >/dev/null 2>&1; then
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is accessible at http://localhost:3000${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend container running but not responding${NC}"
        echo "   It may still be installing dependencies..."
    fi
else
    echo -e "${YELLOW}⚠️  Frontend container not found${NC}"
fi
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}✅ Validation Complete!${NC}"
echo ""
echo "📊 Service URLs:"
echo "   • Backend API: http://localhost:7777"
echo "   • API Documentation: http://localhost:7777/docs"
echo "   • Health Check: http://localhost:7777/health"
echo "   • Frontend: http://localhost:3000"
echo ""
echo "📖 View logs:"
echo "   • All services: docker compose logs -f"
echo "   • Backend: docker compose logs -f agno-backend-api"
echo "   • Database: docker compose logs -f pgvector"
echo ""
echo "🛠️  Useful commands:"
echo "   • Restart services: docker compose restart"
echo "   • Stop services: docker compose down"
echo "   • View stats: docker stats"
echo ""
