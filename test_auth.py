import os; os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.contrib.auth import authenticate
User = get_user_model()
admin = User.objects.filter(email="admin@oeuvres-sociales.dz").first()
print(f"Admin found: {admin}")
if admin:
    print(f"  is_active: {admin.is_active}")
    # check password manually
    print(f"  password check: {admin.check_password('os@2026')}")
    # Try with request
    from rest_framework.test import APIRequestFactory
    factory = APIRequestFactory()
    request = factory.post("/api/v1/auth/login/", {"email": "admin@oeuvres-sociales.dz", "password": "os@2026"})
    user = authenticate(request=request, email="admin@oeuvres-sociales.dz", password="os@2026")
    print(f"  auth result: {user}")
