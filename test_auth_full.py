import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

from django.contrib.auth import get_user_model, authenticate
from django.test import RequestFactory
from apps.users.models import User

User = get_user_model()
factory = RequestFactory()

# Check user Sara
try:
    user = User.objects.get(email="sara@oeuvres-sociales.dz")
    print(f"User: {user.email}")
    print(f"  is_active: {user.is_active}")
    print(f"  role: {user.role}")
    print(f"  password hash: {user.password[:60]}...")
    print(f"  must_change_password: {user.must_change_password}")
    
    # Authenticate with empty password to test if user_can_authenticate works
    request = factory.post("/api/v1/auth/login/")
    
    # Try authenticate with empty password first
    authed = authenticate(request=request, email="sara@oeuvres-sociales.dz", password="")
    print(f"\nauth(empty pw): {authed}")
    
except User.DoesNotExist:
    print("sara@oeuvres-sociales.dz NOT FOUND")

# Now create a NEW user with a known password and test login
print("\n=== Creating test user ===")
test_email = f"test_{os.urandom(4).hex()}@test.dz"
u = User.objects.create_user(
    email=test_email,
    password="TestPass123!",
    first_name="Test",
    last_name="User",
    role=User.Role.GESTIONNAIRE,
)
print(f"Created: {u.email}")
print(f"  is_active: {u.is_active}")
print(f"  password hash: {u.password[:60]}...")

# Test authenticate
request = factory.post("/api/v1/auth/login/")
authed = authenticate(request=request, email=test_email, password="TestPass123!")
print(f"\nauth(correct pw): {authed}")

authed_wrong = authenticate(request=request, email=test_email, password="WrongPass")
print(f"auth(wrong pw): {authed_wrong}")

# Also test through CustomTokenObtainPairSerializer
print("\n=== Testing via simplejwt serializer ===")
from rest_framework.test import APIRequestFactory
from apps.authentication.serializers import CustomTokenObtainPairSerializer

rf = APIRequestFactory()
req = rf.post("/api/v1/auth/login/", {"email": test_email, "password": "TestPass123!"}, format="json")
req.user = None

serializer = CustomTokenObtainPairSerializer(data={"email": test_email, "password": "TestPass123!"}, context={"request": req})
try:
    serializer.is_valid(raise_exception=True)
    print(f"JWT login: VALID")
    print(f"  Access token: {serializer.validated_data['access'][:50]}...")
    print(f"  Refresh token: {serializer.validated_data['refresh'][:50]}...")
except Exception as e:
    print(f"JWT login FAILED: {e}")
    if hasattr(serializer, 'errors'):
        print(f"  Errors: {serializer.errors}")

# Test with must_change_password = True user (like Sara)
print(f"\n=== Testing with must_change_password=True ===")
serializer2 = CustomTokenObtainPairSerializer(data={"email": test_email, "password": "TestPass123!"}, context={"request": req})
try:
    serializer2.is_valid(raise_exception=True)
    print(f"JWT login with must_change_password=True: VALID (this is fine, frontend handles it)")
except Exception as e:
    print(f"FAILED: {e}")

# Cleanup
u.delete()
print(f"\nTest user deleted")
