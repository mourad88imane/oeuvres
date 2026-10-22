import urllib.request, json, ssl

ctx = ssl._create_unverified_context()

base = "https://10.10.10.244"

# Try different auth paths
import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for path in ["/api/v1/auth/token/", "/api/auth/token/", "/api/token/", "/api/v1/token/"]:
    try:
        req = urllib.request.Request(
            f"{base}{path}",
            data=json.dumps({"username": "admin", "password": "os@2026"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = urllib.request.urlopen(req, context=ctx)
        body = json.loads(resp.read())
        print(f"{path} -> {resp.status} OK, has access: {'access' in body}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"{path} -> {e.code} {body}")
    except Exception as e:
        print(f"{path} -> {e}")
