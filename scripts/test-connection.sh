#!/bin/bash

# Test script to verify backend API connections

echo "🧪 Testing GM Terminal API Connections"
echo "========================================"
echo ""

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$BACKEND_URL/health" | jq '.' || echo "❌ Health check failed"
echo ""

# Test quote endpoint
echo "2. Testing quote endpoint (AAPL)..."
curl -s "$BACKEND_URL/api/data/quote/AAPL?countryCode=US" | jq '.' || echo "❌ Quote endpoint failed"
echo ""

# Test chart endpoint
echo "3. Testing chart endpoint (AAPL)..."
curl -s "$BACKEND_URL/api/data/chart/AAPL?period=1d" | jq '.data | length' || echo "❌ Chart endpoint failed"
echo ""

# Test crypto endpoint
echo "4. Testing crypto endpoint (BTCUSD)..."
curl -s "$BACKEND_URL/api/data/crypto/BTCUSD" | jq '.' || echo "❌ Crypto endpoint failed"
echo ""

# Test most active
echo "5. Testing most active endpoint..."
curl -s "$BACKEND_URL/api/data/most-active" | jq '.stocks | length' || echo "❌ Most active endpoint failed"
echo ""

echo "✅ Connection tests complete!"
echo ""
echo "If all tests passed, your backend is properly connected."
echo "If any failed, check:"
echo "  - Backend is running: cd backend && npm run dev"
echo "  - Backend is on port 5000"
echo "  - CORS is configured correctly"

