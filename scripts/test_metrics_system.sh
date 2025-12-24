#!/bin/bash
#
# Test script for performance metrics and validation system
# Tests both backend API and frontend integration
#

set -e  # Exit on error

echo "=================================================="
echo "Performance Metrics & Validation Test Suite"
echo "=================================================="
echo ""

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:7777}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for testing
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$API_BASE_URL$endpoint")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_status, got $http_code)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper function to check JSON response
test_json_field() {
    local name="$1"
    local endpoint="$2"
    local field="$3"
    
    echo -n "Testing $name (checking field: $field)... "
    
    response=$(curl -s "$API_BASE_URL$endpoint")
    
    if echo "$response" | jq -e "$field" > /dev/null 2>&1; then
        value=$(echo "$response" | jq -r "$field")
        echo -e "${GREEN}✓ PASSED${NC} (value: $value)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (field not found)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "1. Backend API Tests"
echo "===================="
echo ""

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq not found. JSON field tests will be skipped.${NC}"
    echo "Install jq for comprehensive testing: sudo apt-get install jq"
    echo ""
fi

# Test basic health
test_endpoint "System Health" "/system/health"

# Test metrics endpoints
test_endpoint "Metrics Summary" "/metrics/summary"
test_endpoint "Executions List" "/metrics/executions?limit=10"
test_endpoint "Validation Insights" "/metrics/validation-insights"
test_endpoint "Performance Distribution" "/metrics/performance/distribution"

# Test specific JSON fields if jq is available
if command -v jq &> /dev/null; then
    echo ""
    echo "2. Data Validation Tests"
    echo "========================"
    echo ""
    
    test_json_field "Total Executions" "/metrics/summary" ".total_executions"
    test_json_field "Avg Duration" "/metrics/summary" ".performance.avg_duration_ms"
    test_json_field "Valid Percentage" "/metrics/summary" ".validation.valid_percentage"
    test_json_field "Hallucination Percentage" "/metrics/summary" ".validation.hallucination_percentage"
    test_json_field "Confidence Score" "/metrics/summary" ".validation.avg_confidence_score"
fi

echo ""
echo "3. Frontend Component Tests"
echo "============================"
echo ""

# Check if frontend components exist
echo -n "Checking MetricsDashboard component... "
if [ -f "agno-ui/src/components/MetricsDashboard.tsx" ]; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ MISSING${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Checking MetricsModal component... "
if [ -f "agno-ui/src/components/MetricsModal.tsx" ]; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ MISSING${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Checking ValidationBadge component... "
if [ -f "agno-ui/src/components/ValidationBadge.tsx" ]; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ MISSING${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Checking useMetrics hook... "
if [ -f "agno-ui/src/hooks/useMetrics.ts" ]; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ MISSING${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "4. Core Module Tests"
echo "===================="
echo ""

# Check backend modules
echo -n "Checking metrics_collector module... "
if [ -f "core/metrics_collector.py" ]; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ MISSING${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Checking hallucination_detector module... "
if [ -f "core/hallucination_detector.py" ]; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ MISSING${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Checking enhanced validation_loop... "
if grep -q "enable_metrics" core/validation_loop.py; then
    echo -e "${GREEN}✓ ENHANCED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ NOT ENHANCED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Checking metrics API endpoints... "
if [ -f "app/api/metrics.py" ]; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ MISSING${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "5. Python Module Import Tests"
echo "=============================="
echo ""

# Test Python imports if possible
if command -v python &> /dev/null; then
    echo -n "Testing metrics_collector import... "
    if python -c "from core.metrics_collector import get_metrics_collector" 2>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    echo -n "Testing hallucination_detector import... "
    if python -c "from core.hallucination_detector import get_hallucination_detector" 2>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    echo -n "Testing enhanced ValidationLoop import... "
    if python -c "from core.validation_loop import ValidationLoop" 2>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

echo ""
echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start the backend: python -m uvicorn app.main:app --reload"
    echo "2. Start the frontend: cd agno-ui && npm run dev"
    echo "3. Open http://localhost:3000"
    echo "4. Click 'Metrics' in the sidebar to view the dashboard"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
