import os; os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
admin = User.objects.filter(email="admin@oeuvres-sociales.dz").first()
admin.set_password("os@2026")
admin.save()
print(f"Password reset for {admin.email}")
print(f"Password check: {admin.check_password('os@2026')}")
