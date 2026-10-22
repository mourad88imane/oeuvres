import sys; sys.path.insert(0,"/app")
import django; django.setup()
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import urllib.request, ssl

u = get_user_model().objects.get(email="sara@oeuvres-sociales.dz")
token = RefreshToken.for_user(u).access_token

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

ENDPOINTS = [
    # Should have access (200)
    ("Invoice List",   "/api/v1/invoicing/invoices/", 200),
    ("Invoice Create",  "/api/v1/invoicing/invoices/", 201),
    ("Employees",     "/api/v1/employees/", 200),
    ("Dashboard",     "/api/v1/dashboard/", 200),
    ("Medical Cov",   "/api/v1/medical-coverage/vouchers/", 200),
    ("Loans",         "/api/v1/loans/", 200),
    ("Dependents",    "/api/v1/beneficiaries/", 200),
    ("Benefits",      "/api/v1/benefits/", 200),
    ("Departments",   "/api/v1/departments/", 200),
    ("Organization",  "/api/v1/organization/lookup/", 200),

    # Should NOT have access (403)
    ("Users",         "/api/v1/users/", 403),
    ("Roles",         "/api/v1/admin/roles/", 403),
    ("Finance",       "/api/v1/finance/fiscal-years/", 403),
    ("Reports",       "/api/v1/reporting/reports/", 403),
    ("Settings",      "/api/v1/admin/system-parameters/", 403),
]

passed = 0; failed = 0; issues = []

for name, path, expected in ENDPOINTS:
    url = f"http://localhost:8000{path}"
    method = "POST" if expected == 201 else "GET"
    data = b'{}' if expected == 201 else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json" if data else "",
    })
    try:
        resp = urllib.request.urlopen(req, timeout=10, context=ctx)
        actual = resp.status
        status = "PASS" if actual == expected else "FAIL"
        if status == "FAIL":
            issues.append(f"{name}: expected {expected}, got {actual}")
            failed += 1
        else:
            passed += 1
        print(f"  {status:4s}  {name:25s} -> {actual}")
    except urllib.error.HTTPError as e:
        actual = e.code
        status = "PASS" if actual == expected else "FAIL"
        if status == "FAIL":
            body = e.read().decode()[:120]
            issues.append(f"{name}: expected {expected}, got {actual} ({body})")
            failed += 1
        else:
            passed += 1
        print(f"  {status:4s}  {name:25s} -> {actual}")
    except Exception as e:
        print(f"  ERROR {name:25s} -> {e}")
        failed += 1
        issues.append(f"{name}: {e}")

print(f"\n{'='*50}")
print(f"Results: {passed} passed, {failed} failed")
if issues:
    for i in issues:
        print(f"  - {i}")
