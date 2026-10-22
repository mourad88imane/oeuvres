import requests, json

# Get token
r = requests.post("http://localhost:8000/api/v1/auth/token/", json={"username": "admin", "password": "os@2026"})
token = r.json()["access"]
print(f"Token: {token[:50]}...")

# Test create with duplicate
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
data = {
    "partner": "698267ed-0262-4183-9165-76ae2545be50",
    "category": "medical_analysis_lab",
    "month": 7,
    "year": 2026,
    "period_start": "2026-07-01",
    "period_end": "2026-08-01",
    "coverage_request_lines": [
        {"coverage_request": "6bcd01ab-bfbe-4d00-a8ef-c7e891c5eb8c", "amount": "5000.00", "notes": "test"}
    ]
}
r = requests.post("http://localhost:8000/api/v1/invoicing/invoices/", json=data, headers=headers)
print(f"Status: {r.status_code}")
print(f"Response: {json.dumps(r.json(), indent=2, ensure_ascii=False)}")
