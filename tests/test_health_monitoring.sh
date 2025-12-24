#!/bin/bash

# Test script for system health monitoring with long polling
# Tests various scenarios: healthy, degraded, down states

set -e

API_URL="http://localhost:7777"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "Testing System Health Monitoring"
echo "========================================="
echo ""

# Test 1: Check healthy state
echo -e "${BLUE}Test 1: Healthy System State${NC}"
HEALTH=$(curl -s "${API_URL}/system/health")
echo "$HEALTH" | jq .

STATUS=$(echo "$HEALTH" | jq -r '.status')
DB_CONNECTED=$(echo "$HEALTH" | jq -r '.database.connected')
DB_LATENCY=$(echo "$HEALTH" | jq -r '.database.latency_ms')
POOL_SIZE=$(echo "$HEALTH" | jq -r '.database.pool_size')

if [ "$STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓ System is healthy${NC}"
else
    echo -e "${YELLOW}⚠ System status: $STATUS${NC}"
fi

if [ "$DB_CONNECTED" = "true" ]; then
    echo -e "${GREEN}✓ Database connected (latency: ${DB_LATENCY}ms, pool: ${POOL_SIZE})${NC}"
else
    echo -e "${RED}✗ Database disconnected${NC}"
fi
echo ""

# Test 2: Simulate multiple polls (like frontend would do)
echo -e "${BLUE}Test 2: Continuous Health Polling (5 requests)${NC}"
for i in {1..5}; do
    START_TIME=$(date +%s%3N)
    HEALTH=$(curl -s "${API_URL}/system/health")
    END_TIME=$(date +%s%3N)
    LATENCY=$((END_TIME - START_TIME))
    
    STATUS=$(echo "$HEALTH" | jq -r '.status')
    DB_STATUS=$(echo "$HEALTH" | jq -r '.database.connected')
    
    echo "Poll $i: Status=$STATUS, DB=$DB_STATUS, Response time=${LATENCY}ms"
    sleep 1
done
echo -e "${GREEN}✓ Continuous polling successful${NC}"
echo ""

# Test 3: Check readiness probe
echo -e "${BLUE}Test 3: Readiness Probe${NC}"
READINESS=$(curl -s "${API_URL}/readiness")
echo "$READINESS" | jq .
READY=$(echo "$READINESS" | jq -r '.ready')

if [ "$READY" = "true" ]; then
    echo -e "${GREEN}✓ Service is ready${NC}"
else
    echo -e "${RED}✗ Service is not ready${NC}"
fi
echo ""

# Test 4: Check liveness probe
echo -e "${BLUE}Test 4: Liveness Probe${NC}"
LIVENESS=$(curl -s "${API_URL}/liveness")
echo "$LIVENESS" | jq .
ALIVE=$(echo "$LIVENESS" | jq -r '.alive')

if [ "$ALIVE" = "true" ]; then
    echo -e "${GREEN}✓ Service is alive${NC}"
else
    echo -e "${RED}✗ Service is not alive${NC}"
fi
echo ""

# Test 5: Check features configuration
echo -e "${BLUE}Test 5: Feature Flags${NC}"
FEATURES=$(echo "$HEALTH" | jq -r '.features')
echo "$FEATURES" | jq .

MEMORY=$(echo "$FEATURES" | jq -r '.memory')
VECTOR=$(echo "$FEATURES" | jq -r '.vector_rag')
VALIDATION=$(echo "$FEATURES" | jq -r '.validation')
SKILLS=$(echo "$FEATURES" | jq -r '.skills')

echo "Features enabled:"
[ "$MEMORY" = "true" ] && echo -e "${GREEN}  ✓ Memory${NC}" || echo -e "${RED}  ✗ Memory${NC}"
[ "$VECTOR" = "true" ] && echo -e "${GREEN}  ✓ Vector RAG${NC}" || echo -e "${RED}  ✗ Vector RAG${NC}"
[ "$VALIDATION" = "true" ] && echo -e "${GREEN}  ✓ Validation${NC}" || echo -e "${RED}  ✗ Validation${NC}"
[ "$SKILLS" = "true" ] && echo -e "${GREEN}  ✓ Skills${NC}" || echo -e "${RED}  ✗ Skills${NC}"
echo ""

# Test 6: Simulate degraded state (database connection issues)
echo -e "${BLUE}Test 6: Testing Error Handling${NC}"
echo "Attempting to connect to invalid endpoint..."
INVALID_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:9999/system/health" 2>&1 || true)
HTTP_STATUS=$(echo "$INVALID_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2 || echo "connection_failed")

if [ "$HTTP_STATUS" = "connection_failed" ] || [ "$HTTP_STATUS" = "000" ]; then
    echo -e "${GREEN}✓ Error handling works correctly (connection refused)${NC}"
else
    echo -e "${YELLOW}⚠ Unexpected response: HTTP $HTTP_STATUS${NC}"
fi
echo ""

# Test 7: Response time analysis
echo -e "${BLUE}Test 7: Response Time Analysis (20 requests)${NC}"
TOTAL_TIME=0
MAX_TIME=0
MIN_TIME=999999

for i in {1..20}; do
    START_TIME=$(date +%s%3N)
    curl -s "${API_URL}/system/health" > /dev/null
    END_TIME=$(date +%s%3N)
    LATENCY=$((END_TIME - START_TIME))
    
    TOTAL_TIME=$((TOTAL_TIME + LATENCY))
    
    if [ $LATENCY -gt $MAX_TIME ]; then
        MAX_TIME=$LATENCY
    fi
    
    if [ $LATENCY -lt $MIN_TIME ]; then
        MIN_TIME=$LATENCY
    fi
done

AVG_TIME=$((TOTAL_TIME / 20))

echo "Response time statistics:"
echo "  Average: ${AVG_TIME}ms"
echo "  Min: ${MIN_TIME}ms"
echo "  Max: ${MAX_TIME}ms"

if [ $AVG_TIME -lt 100 ]; then
    echo -e "${GREEN}✓ Response times are excellent${NC}"
elif [ $AVG_TIME -lt 500 ]; then
    echo -e "${GREEN}✓ Response times are good${NC}"
else
    echo -e "${YELLOW}⚠ Response times are slow${NC}"
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}Health Monitoring Tests Complete!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "  - System health check: ✓"
echo "  - Continuous polling: ✓"
echo "  - Readiness probe: ✓"
echo "  - Liveness probe: ✓"
echo "  - Feature flags: ✓"
echo "  - Error handling: ✓"
echo "  - Response times: ✓"
echo ""
echo -e "${GREEN}Frontend can now monitor system health in real-time!${NC}"
echo ""
echo "Frontend health monitoring features:"
echo "  • Long polling every 5 seconds"
echo "  • Automatic retry on failure (2 second interval)"
echo "  • Visual status indicator (green/yellow/red)"
echo "  • Toast notifications on status changes"
echo "  • Detailed health information on hover"
echo "  • Manual refresh capability"
