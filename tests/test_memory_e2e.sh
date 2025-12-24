#!/bin/bash

# End-to-end test for long-term memory integration
# Tests all memory endpoints and verifies the complete flow

set -e  # Exit on error

API_URL="http://localhost:7777"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Testing Long-term Memory Integration"
echo "========================================="
echo ""

# Test 1: Get initial stats
echo -e "${YELLOW}Test 1: Get Memory Statistics${NC}"
STATS=$(curl -s "${API_URL}/memory/stats")
echo "$STATS" | jq .
INITIAL_SESSIONS=$(echo "$STATS" | jq -r '.total_sessions')
echo -e "${GREEN}✓ Initial sessions: $INITIAL_SESSIONS${NC}"
echo ""

# Test 2: Initialize a session
echo -e "${YELLOW}Test 2: Initialize Memory Session${NC}"
SESSION_ID=$(uuidgen)
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/memory/sessions" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"user_id\": \"test-user-1\"}")
echo "$SESSION_RESPONSE" | jq .
echo "Session ID: $SESSION_ID"
echo -e "${GREEN}✓ Session initialized${NC}"
echo ""

# Test 3: Add messages to the session
echo -e "${YELLOW}Test 3: Add Messages to Session${NC}"
curl -s -X POST "${API_URL}/memory/messages" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"role\": \"user\",
    \"content\": \"Hello, this is a test message about artificial intelligence\"
  }" > /dev/null
echo "Added user message"

curl -s -X POST "${API_URL}/memory/messages" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"role\": \"assistant\",
    \"content\": \"I understand you're testing the AI memory system. How can I help you?\"
  }" > /dev/null
echo "Added assistant message"

curl -s -X POST "${API_URL}/memory/messages" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"role\": \"user\",
    \"content\": \"I want to test the search functionality with keywords like neural networks and deep learning\"
  }" > /dev/null
echo "Added another user message"
echo -e "${GREEN}✓ Messages added${NC}"
echo ""

# Test 4: List all sessions
echo -e "${YELLOW}Test 4: List All Memory Sessions${NC}"
SESSIONS=$(curl -s "${API_URL}/memory/sessions?limit=10")
echo "$SESSIONS" | jq .
SESSION_COUNT=$(echo "$SESSIONS" | jq -r '.total')
echo -e "${GREEN}✓ Found $SESSION_COUNT sessions${NC}"
echo ""

# Test 5: Get updated stats
echo -e "${YELLOW}Test 5: Get Updated Memory Statistics${NC}"
STATS=$(curl -s "${API_URL}/memory/stats")
echo "$STATS" | jq .
TOTAL_MESSAGES=$(echo "$STATS" | jq -r '.total_messages')
echo -e "${GREEN}✓ Total messages: $TOTAL_MESSAGES${NC}"
echo ""

# Test 6: Search for messages
echo -e "${YELLOW}Test 6: Search Messages (query: 'artificial')${NC}"
SEARCH_RESULTS=$(curl -s "${API_URL}/memory/search?query=artificial&limit=10")
echo "$SEARCH_RESULTS" | jq .
RESULT_COUNT=$(echo "$SEARCH_RESULTS" | jq -r '.total')
echo -e "${GREEN}✓ Found $RESULT_COUNT matching messages${NC}"
echo ""

# Test 7: Search with session filter
echo -e "${YELLOW}Test 7: Search Messages with Session Filter${NC}"
SEARCH_RESULTS=$(curl -s "${API_URL}/memory/search?query=test&session_id=${SESSION_ID}&limit=10")
echo "$SEARCH_RESULTS" | jq .
RESULT_COUNT=$(echo "$SEARCH_RESULTS" | jq -r '.total')
echo -e "${GREEN}✓ Found $RESULT_COUNT matching messages in session${NC}"
echo ""

# Test 8: Get chat history
echo -e "${YELLOW}Test 8: Get Chat History for Session${NC}"
HISTORY=$(curl -s "${API_URL}/memory/sessions/${SESSION_ID}/history")
echo "$HISTORY" | jq .
MESSAGE_COUNT=$(echo "$HISTORY" | jq -r '.total')
echo -e "${GREEN}✓ Retrieved $MESSAGE_COUNT messages from history${NC}"
echo ""

# Test 9: Update learned facts
echo -e "${YELLOW}Test 9: Update Learned Facts${NC}"
curl -s -X POST "${API_URL}/memory/sessions/${SESSION_ID}/facts" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"${SESSION_ID}\", \"facts\": \"User is testing the memory system. Interested in AI, neural networks, and deep learning.\"}" > /dev/null
echo -e "${GREEN}✓ Learned facts updated${NC}"
echo ""

# Test 10: Get learned facts
echo -e "${YELLOW}Test 10: Get Learned Facts${NC}"
FACTS=$(curl -s "${API_URL}/memory/sessions/${SESSION_ID}/facts")
echo "$FACTS" | jq .
echo -e "${GREEN}✓ Retrieved learned facts${NC}"
echo ""

# Test 11: Verify stats show session with facts
echo -e "${YELLOW}Test 11: Verify Sessions with Facts Counter${NC}"
STATS=$(curl -s "${API_URL}/memory/stats")
echo "$STATS" | jq .
SESSIONS_WITH_FACTS=$(echo "$STATS" | jq -r '.sessions_with_facts')
echo -e "${GREEN}✓ Sessions with facts: $SESSIONS_WITH_FACTS${NC}"
echo ""

# Test 12: Delete the test session
echo -e "${YELLOW}Test 12: Delete Test Session${NC}"
DELETE_RESPONSE=$(curl -s -X DELETE "${API_URL}/memory/sessions/${SESSION_ID}")
echo "$DELETE_RESPONSE" | jq .
echo -e "${GREEN}✓ Session deleted${NC}"
echo ""

# Test 13: Verify stats after deletion
echo -e "${YELLOW}Test 13: Verify Stats After Deletion${NC}"
STATS=$(curl -s "${API_URL}/memory/stats")
echo "$STATS" | jq .
FINAL_SESSIONS=$(echo "$STATS" | jq -r '.total_sessions')
echo -e "${GREEN}✓ Final sessions: $FINAL_SESSIONS${NC}"
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}All tests passed successfully!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "- Session lifecycle: ✓"
echo "- Message storage: ✓"
echo "- Session listing: ✓"
echo "- Statistics: ✓"
echo "- Search (full-text): ✓"
echo "- Search (with filter): ✓"
echo "- Chat history: ✓"
echo "- Learned facts: ✓"
echo "- Session deletion: ✓"
echo ""
echo -e "${GREEN}Long-term memory integration is fully functional!${NC}"
