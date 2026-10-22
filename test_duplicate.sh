#!/bin/bash
echo "=== Getting token from /api/v1/auth/login/ ==="
TOKEN_RESP=$(curl -sk -X POST 'https://10.10.10.244/api/v1/auth/login/' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oeuvres-sociales.dz","password":"os@2026"}')
echo "Token response: $TOKEN_RESP"
TOKEN=$(echo "$TOKEN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi
echo "Token: ${TOKEN:0:50}..."
echo ""
echo "=== Testing create (duplicate) ==="
curl -sk -X POST 'https://10.10.10.244/api/v1/invoicing/invoices/' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"partner":"698267ed-0262-4183-9165-76ae2545be50","category":"medical_analysis_lab","month":7,"year":2026,"period_start":"2026-07-01","period_end":"2026-08-01","coverage_request_lines":[{"coverage_request":"6bcd01ab-bfbe-4d00-a8ef-c7e891c5eb8c","amount":"5000.00","notes":"test"}]}' | python3 -m json.tool
