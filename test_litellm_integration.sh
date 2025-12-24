#!/bin/bash

# LiteLLM Integration Test Script
# Tests backend API endpoints and frontend integration

set -e  # Exit on error

BACKEND_URL="${BACKEND_URL:-http://localhost:7777}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3001}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         LiteLLM Integration Test Suite                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    echo -n "Testing: $test_name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BACKEND_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "Response: $body"
        ((FAILED++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Backend API Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Backend Health
echo -n "Test 1: Backend health check... "
if curl -s "$BACKEND_URL/system/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Backend not responding at $BACKEND_URL"
    ((FAILED++))
    exit 1
fi

# Test 2: List Models
echo -n "Test 2: List available models... "
models_response=$(curl -s "$BACKEND_URL/models/list")
if echo "$models_response" | jq -e '. | length > 0' > /dev/null 2>&1; then
    model_count=$(echo "$models_response" | jq '. | length')
    provider_count=$(echo "$models_response" | jq '[.[].models | length] | add')
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  → Found $model_count providers with $provider_count total models"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $models_response"
    ((FAILED++))
fi

# Test 3: Get Current Model
echo -n "Test 3: Get current model... "
current_response=$(curl -s "$BACKEND_URL/models/current")
if echo "$current_response" | jq -e '.model_id' > /dev/null 2>&1; then
    current_model=$(echo "$current_response" | jq -r '.model_id')
    current_provider=$(echo "$current_response" | jq -r '.provider')
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  → Current: $current_model ($current_provider)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $current_response"
    ((FAILED++))
fi

# Test 4: List Providers
echo -n "Test 4: List providers... "
providers_response=$(curl -s "$BACKEND_URL/models/providers")
if echo "$providers_response" | jq -e '. | length > 0' > /dev/null 2>&1; then
    provider_list=$(echo "$providers_response" | jq -r '.[]' | tr '\n' ', ' | sed 's/,$//')
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  → Providers: $provider_list"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $providers_response"
    ((FAILED++))
fi

# Test 5: Select Model (OpenAI GPT-4o)
echo -n "Test 5: Select model (gpt-4o)... "
select_data='{"model_id":"gpt-4o","provider":"openai"}'
select_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$select_data" \
    "$BACKEND_URL/models/select")

if echo "$select_response" | jq -e '.model_id == "gpt-4o"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  → Successfully switched to gpt-4o"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "Response: $select_response"
    ((FAILED++))
fi

# Test 6: Verify Model Change
echo -n "Test 6: Verify model change... "
verify_response=$(curl -s "$BACKEND_URL/models/current")
if echo "$verify_response" | jq -e '.model_id == "gpt-4o"' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo "  → Model selection may not persist"
    ((FAILED++))
fi

# Test 7: Invalid Model Selection
echo -n "Test 7: Invalid model selection (error handling)... "
invalid_data='{"model_id":"invalid-model-xyz","provider":"openai"}'
invalid_response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$invalid_data" \
    "$BACKEND_URL/models/select")
http_code=$(echo "$invalid_response" | tail -n1)

if [ "$http_code" = "404" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  → Correctly rejected invalid model"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  → Should return 404 for invalid model, got $http_code"
    ((FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Frontend Connectivity Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 8: Frontend Health
echo -n "Test 8: Frontend connectivity... "
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  → Frontend accessible at $FRONTEND_URL"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ SKIPPED${NC}"
    echo "  → Frontend not running at $FRONTEND_URL"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Model Capability Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 9: Verify Model Capabilities
echo -n "Test 9: Verify model capabilities structure... "
models=$(curl -s "$BACKEND_URL/models/list")
first_model=$(echo "$models" | jq '.[0].models[0]')

if echo "$first_model" | jq -e '.supports_streaming and .supports_tools' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  → Model capabilities correctly structured"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  → Missing capability fields"
    ((FAILED++))
fi

# Test 10: Provider-Specific Models
echo -n "Test 10: Check provider-specific models... "
anthropic_models=$(echo "$models" | jq '.[] | select(.id=="anthropic") | .models | length')
openai_models=$(echo "$models" | jq '.[] | select(.id=="openai") | .models | length')

if [ "$anthropic_models" -gt 0 ] && [ "$openai_models" -gt 0 ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "  → OpenAI: $openai_models models, Anthropic: $anthropic_models models"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo "  → Some providers may not have models configured"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      Test Summary                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "🎉 LiteLLM integration is working correctly!"
    echo ""
    echo "Next steps:"
    echo "  1. Open UI at $FRONTEND_URL"
    echo "  2. Look for ModelSelector in Configuration section"
    echo "  3. Select different models and test chat"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify backend is running: curl $BACKEND_URL/system/health"
    echo "  2. Check API endpoints exist: curl $BACKEND_URL/models/list"
    echo "  3. Review backend logs for errors"
    echo "  4. Ensure litellm is installed: pip show litellm"
    exit 1
fi
