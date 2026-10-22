import urllib.request, json, ssl

ctx = ssl._create_unverified_context()

# Get token
req = urllib.request.Request(
    "http://localhost:8000/api/v1/auth/token/",
    data=json.dumps({"username": "admin", "password": "os@2026"}).encode(),
    headers={"Content-Type": "application/json"}
)
try:
    resp = urllib.request.urlopen(req, context=ctx)
    token_data = json.loads(resp.read())
    token = token_data["access"]
    print(f"Token: {token[:50]}...")
except Exception as e:
    print(f"Token error: {e}")
    import sys; sys.exit(1)

# Test create
data = json.dumps({
    "partner": "698267ed-0262-4183-9165-76ae2545be50",
    "category": "medical_analysis_lab",
    "month": 7, "year": 2026,
    "period_start": "2026-07-01", "period_end": "2026-08-01",
    "coverage_request_lines": [
        {"coverage_request": "6bcd01ab-bfbe-4d00-a8ef-c7e891c5eb8c", "amount": "5000.00", "notes": "test"}
    ]
}).encode()

req = urllib.request.Request(
    "http://localhost:8000/api/v1/invoicing/invoices/",
    data=data,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
)
try:
    resp = urllib.request.urlopen(req, context=ctx)
    body = json.loads(resp.read())
    print(f"Status: {resp.status}")
    print(f"Response: {json.dumps(body, indent=2, ensure_ascii=False)}")
except urllib.error.HTTPError as e:
    body = json.loads(e.read())
    print(f"Status: {e.code}")
    print(f"Response: {json.dumps(body, indent=2, ensure_ascii=False)}")
