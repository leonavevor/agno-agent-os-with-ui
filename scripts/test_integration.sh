#!/bin/bash
# Integration test script for Docker deployment
# Tests all advanced features (memory, vector RAG, validation)

set -e

echo "🧪 Docker Integration Test Suite"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:7777"
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    
    echo -n "Testing $name... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $http_code, expected $expected_status)"
        echo "   Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Wait for services
echo -e "${BLUE}Waiting for services to be ready...${NC}"
MAX_WAIT=60
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s "$BASE_URL/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready${NC}"
        break
    fi
    WAIT_COUNT=$((WAIT_COUNT + 1))
    sleep 1
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo -e "${RED}❌ Backend did not become ready in time${NC}"
    exit 1
fi
echo ""

# ============================================================================
echo -e "${BLUE}1️⃣  Health Check Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Health endpoint" "GET" "/health" "" 200
test_endpoint "Liveness probe" "GET" "/liveness" "" 200
test_endpoint "Readiness probe" "GET" "/readiness" "" 200

echo ""

# ============================================================================
echo -e "${BLUE}2️⃣  Memory API Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SESSION_ID="test-session-$(date +%s)"

test_endpoint "Initialize session" "POST" "/api/memory/sessions/initialize" \
    "{\"session_id\": \"$SESSION_ID\"}" 200

test_endpoint "Add user message" "POST" "/api/memory/messages" \
    "{\"session_id\": \"$SESSION_ID\", \"role\": \"user\", \"content\": \"Hello, test message\"}" 200

test_endpoint "Add assistant message" "POST" "/api/memory/messages" \
    "{\"session_id\": \"$SESSION_ID\", \"role\": \"assistant\", \"content\": \"Hello! How can I help you?\"}" 200

test_endpoint "Get chat history" "GET" "/api/memory/sessions/$SESSION_ID/history" "" 200

test_endpoint "Add learned fact" "POST" "/api/memory/sessions/$SESSION_ID/facts" \
    "{\"facts\": {\"user_name\": \"Test User\", \"preference\": \"dark mode\"}}" 200

test_endpoint "Get learned facts" "GET" "/api/memory/sessions/$SESSION_ID/facts" "" 200

echo ""

# ============================================================================
echo -e "${BLUE}3️⃣  Skills API Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "List skills" "GET" "/api/skills" "" 200

test_endpoint "Route skills" "POST" "/api/skills/route" \
    "{\"message\": \"search the web for AI news\", \"limit\": 2}" 200

test_endpoint "Reload skills" "POST" "/api/skills/reload" "" 200

echo ""

# ============================================================================
echo -e "${BLUE}4️⃣  Reference Search Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Keyword search" "POST" "/api/references/search" \
    "{\"query\": \"agent\", \"mode\": \"keyword\", \"limit\": 5}" 200

test_endpoint "Get embedding status" "GET" "/api/references/status" "" 200

# Note: Vector search test skipped if OPENAI_API_KEY not set
if [ ! -z "$OPENAI_API_KEY" ]; then
    echo -n "Testing Vector search... "
    echo -e "${YELLOW}⚠️  SKIP${NC} (requires embeddings to be generated)"
else
    echo -n "Testing Vector search... "
    echo -e "${YELLOW}⚠️  SKIP${NC} (OPENAI_API_KEY not set)"
fi

echo ""

# ============================================================================
echo -e "${BLUE}5️⃣  Agent Playground Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "List agents" "GET" "/api/agents" "" 200
test_endpoint "List teams" "GET" "/api/teams" "" 200
test_endpoint "List workflows" "GET" "/api/workflows" "" 200

echo ""

# ============================================================================
echo -e "${BLUE}6️⃣  Database Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Testing pgvector extension... "
PGVECTOR_CHECK=$(docker compose exec -T pgvector psql -U ai -d ai -c "SELECT * FROM pg_extension WHERE extname='vector';" 2>/dev/null | grep -c "vector")
if [ $PGVECTOR_CHECK -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Testing memory tables... "
MEMORY_TABLES=$(docker compose exec -T pgvector psql -U ai -d ai -c "\dt" 2>/dev/null | grep -E "chat_messages|session_memory" | wc -l)
if [ $MEMORY_TABLES -eq 2 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} (found $MEMORY_TABLES/2 tables)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Testing vector tables... "
VECTOR_TABLES=$(docker compose exec -T pgvector psql -U ai -d ai -c "\dt" 2>/dev/null | grep "reference_documents" | wc -l)
if [ $VECTOR_TABLES -eq 1 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ============================================================================
echo -e "${BLUE}7️⃣  Feature Flag Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Testing feature flags in health response... "
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
FEATURES=$(echo "$HEALTH_RESPONSE" | grep -o '"features":{[^}]*}')

if echo "$FEATURES" | grep -q "memory.*true"; then
    echo -e "${GREEN}✅ Memory enabled${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Memory not enabled${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ============================================================================
echo -e "${BLUE}8️⃣  Cleanup Test Data${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Cleaning up test session... "
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/memory/sessions/$SESSION_ID")
DELETE_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)

if [ "$DELETE_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} (HTTP $DELETE_CODE)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# ============================================================================
echo "================================="
echo -e "${BLUE}Test Summary${NC}"
echo "================================="
echo ""
echo -e "Total tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "🎉 Docker integration is working correctly!"
    echo ""
    echo "Next steps:"
    echo "  • Visit http://localhost:3000 for the UI"
    echo "  • Check http://localhost:7777/docs for API docs"
    echo "  • View logs: docker compose logs -f"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  • Check logs: docker compose logs"
    echo "  • Run validation: ./scripts/validate_docker.sh"
    echo "  • See TROUBLESHOOTING.md for common issues"
    exit 1
fi
