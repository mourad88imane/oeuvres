import sys; sys.path.insert(0,"/app")
import django; django.setup()
from django.contrib.auth import get_user_model
from apps.administration.models import Role, RolePermission

# Check gestionnaire permissions
role = Role.objects.get(slug="gestionnaire")
perms = RolePermission.objects.filter(role=role).select_related('permission')
print(f"Gestionnaire permissions ({perms.count()}):")
for rp in perms.order_by('permission__codename'):
    p = rp.permission
    print(f"  {p.codename:40s}  module={p.module}")

# Check what permissions the JWT would include for sara
U = get_user_model()
sara = U.objects.get(email="sara@oeuvres-sociales.dz")
print(f"\nSara's role: {sara.role}")

# Simulate the JWT permissions claim
from core.permissions import _get_user_role_slugs
slugs = _get_user_role_slugs(sara)
print(f"Role slugs: {slugs}")

from django.apps import apps
Permission = apps.get_model("administration", "Permission")
jwt_perms = list(Permission.objects.filter(
    role_permissions__role__slug__in=slugs,
    role_permissions__role__is_active=True,
).values_list("codename", flat=True).distinct())
print(f"\nJWT would contain {len(jwt_perms)} permission codenames:")
for p in sorted(jwt_perms):
    if "invoice" in p.lower():
        print(f"  ** {p}")
    else:
        print(f"  {p}")
