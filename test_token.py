import requests
r = requests.post("http://localhost:8000/api/v1/auth/token/", json={"username": "admin", "password": "os@2026"})
print(f"Status: {r.status_code}")
print(f"Text: {r.text[:500]}")
