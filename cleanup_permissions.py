import os, sys
sys.path.insert(0, "/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
import django; django.setup()
from django.apps import apps
Permission = apps.get_model("administration", "Permission")
RolePermission = apps.get_model("administration", "RolePermission")
orphaned_modules = ["beneficiaries", "analytics"]
for module in orphaned_modules:
    perms = Permission.objects.filter(module=module)
    count = perms.count()
    if count == 0:
        print(f"  {module}: no permissions found")
        continue
    for p in perms:
        rp_count = RolePermission.objects.filter(permission=p).count()
        print(f"  {module}: {p.codename} ({rp_count} role assignments)")
    perms.delete()
    print(f"  Deleted {count} permissions from module '{module}'")
print("Done")
