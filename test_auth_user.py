import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

from django.contrib.auth import get_user_model, authenticate
from apps.users.models import User

# Find the user
try:
    user = User.objects.get(email="sara@oeuvres-sociales.dz")
    print(f"FOUND: id={user.id}")
    print(f"  is_active: {user.is_active}")
    print(f"  is_staff: {user.is_staff}")
    print(f"  is_superuser: {user.is_superuser}")
    print(f"  role: {user.role}")
    print(f"  password hash: {user.password[:50]}...")
    print(f"  must_change_password: {user.must_change_password}")
    print(f"  tenant: {user.tenant_id}")
    
    # Check if password is hashed properly (starts with algo$)
    if user.password.startswith('pbkdf2_'):
        print("  PASSWORD HASH: OK (pbkdf2)")
    elif user.password.startswith('bcrypt'):
        print("  PASSWORD HASH: OK (bcrypt)")
    elif user.password.startswith('argon2'):
        print("  PASSWORD HASH: OK (argon2)")
    elif user.password.startswith('scrypt'):
        print("  PASSWORD HASH: OK (scrypt)")
    elif not user.password:
        print("  PASSWORD: EMPTY!")
    else:
        print(f"  PASSWORD FORMAT: UNEXPECTED: {user.password[:30]}")
    
    # Try to authenticate
    authed = authenticate(email="sara@oeuvres-sociales.dz", password="")
    print(f"\nauthenticate(empty password): {authed}")
    
    # Check if we can get the user by natural key
    from django.contrib.auth.backends import BaseBackend
    try:
        user_from_nk = User.objects.get_by_natural_key("sara@oeuvres-sociales.dz")
        print(f"\nget_by_natural_key: FOUND: {user_from_nk.email}")
    except User.DoesNotExist:
        print("\nget_by_natural_key: NOT FOUND")
    
except User.DoesNotExist:
    print("User sara@oeuvres-sociales.dz NOT FOUND")
    
    # List all users
    print("\nAll users in DB:")
    for u in User.objects.all():
        print(f"  {u.email} | active={u.is_active} | role={u.role} | hash={u.password[:30] if u.password else 'EMPTY'}...")
