import urllib.request, json

# Try to find the token endpoint
endpoints = [
    "/api/v1/auth/token/",
    "/api/auth/token/",
    "/api/token/",
    "/api/v1/token/",
    "/api/v1/login/",
    "/api/login/",
]
for ep in endpoints:
    try:
        req = urllib.request.Request(
            f"http://localhost:8000{ep}",
            data=json.dumps({"username": "admin", "password": "os@2026"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = urllib.request.urlopen(req)
        print(f"{ep} -> {resp.status} OK")
    except urllib.error.HTTPError as e:
        print(f"{ep} -> {e.code} {e.reason}")
    except Exception as e:
        print(f"{ep} -> {e}")
