import os, django, json
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model
from apps.users.views import UserViewSet
from apps.authentication.views import LoginView

User = get_user_model()
rf = APIRequestFactory()

# Find admin for creating user
admin = User.objects.filter(is_superuser=True).first()
print(f"Admin: {admin.email}")

# 1. Create user via API (like frontend does)
print("\n=== Step 1: Create user via POST /users/ ===")
create_data = {
    "email": "api_test_user@test.dz",
    "first_name": "API",
    "last_name": "Test",
    "phone": "0555000000",
    "role": "gestionnaire",
    "password": "SecurePass123!",
}

create_req = rf.post("/api/v1/users/", create_data, format="json")
force_authenticate(create_req, user=admin)
create_view = UserViewSet.as_view({"post": "create"})
create_resp = create_view(create_req)
print(f"Status: {create_resp.status_code}")
if create_resp.status_code == 201:
    print(f"User created: {create_resp.data['email']}")
else:
    print(f"Error: {create_resp.data}")

# 2. Verify user in DB
user = User.objects.get(email="api_test_user@test.dz")
print(f"\n=== Step 2: Verify user ===")
print(f"  is_active: {user.is_active}")
print(f"  password hash: {user.password[:60]}...")
print(f"  must_change_password: {user.must_change_password}")

# 3. Login via API (like frontend does)
print(f"\n=== Step 3: Login via POST /auth/login/ ===")
login_req = rf.post("/api/v1/auth/login/", {
    "email": "api_test_user@test.dz",
    "password": "SecurePass123!",
}, format="json")

# LoginView uses AllowAny, so no auth needed
login_view = LoginView.as_view()
login_resp = login_view(login_req)
print(f"Status: {login_resp.status_code}")
if login_resp.status_code == 200:
    resp_data = login_resp.data
    print(f"  Message: {resp_data.get('message')}")
    print(f"  Access token: {str(resp_data.get('access', ''))[:50]}...")
    print(f"  User email: {resp_data.get('user', {}).get('email')}")
    print(f"  must_change_password: {resp_data.get('user', {}).get('must_change_password')}")
    print("PASS: Full API login flow works!")
else:
    print(f"  Error: {login_resp.data}")

# 4. Login with wrong password
print(f"\n=== Step 4: Login with wrong password ===")
login_req2 = rf.post("/api/v1/auth/login/", {
    "email": "api_test_user@test.dz",
    "password": "WrongPassword",
}, format="json")
login_resp2 = login_view(login_req2)
print(f"Status: {login_resp2.status_code}")
if login_resp2.status_code != 200:
    print(f"  Error (expected): {login_resp2.data.get('detail', login_resp2.data)}")
    print("PASS: Wrong password correctly rejected")

# Cleanup
user.delete()
print(f"\nTest user deleted")
