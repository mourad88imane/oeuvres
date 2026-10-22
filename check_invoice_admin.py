import sys; sys.path.insert(0,"/app")
import django; django.setup()
from apps.administration.models import Role, RolePermission
from django.contrib.auth import get_user_model

# Check admin's invoice permissions
admin_role = Role.objects.get(slug="admin")
perms = RolePermission.objects.filter(role=admin_role, permission__module="invoice").select_related('permission')
print(f"Admin invoice permissions: {perms.count()}")
for p in perms:
    print(f"  {p.permission.codename}")

# Check who's currently logged in would see 403
U = get_user_model()
print(f"\nAdmin user exists: {U.objects.filter(role='admin', is_active=True).count()}")
admin = U.objects.filter(role='admin', is_active=True).first()
if admin:
    print(f"Admin: {admin.email}")

# Generate a token for admin and test
from rest_framework_simplejwt.tokens import RefreshToken
import urllib.request, ssl

token = RefreshToken.for_user(admin).access_token
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "http://localhost:8000/api/v1/invoicing/invoices/"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
try:
    resp = urllib.request.urlopen(req, timeout=10, context=ctx)
    print(f"\nAdmin access to invoicing: {resp.status}")
except urllib.error.HTTPError as e:
    print(f"\nAdmin access to invoicing: {e.code} (ERROR)")
    print(f"  Body: {e.read().decode()[:200]}")
