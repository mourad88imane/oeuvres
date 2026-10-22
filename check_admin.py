import os; os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.contrib.auth import get_user_model
u = get_user_model().objects.filter(is_superuser=True).first()
print(f"email={u.email}, is_active={u.is_active}")
for field in u._meta.fields:
    print(f"  {field.name}: {getattr(u, field.name)}")
