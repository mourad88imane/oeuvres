import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# Check Sara
sara = User.objects.get(email="sara@oeuvres-sociales.dz")
print(f"Sara: {sara.email}")
print(f"  is_active: {sara.is_active}")
print(f"  role: {sara.role}")
print(f"  must_change_password: {sara.must_change_password}")
print(f"  failed_login_count: {sara.failed_login_count}")
print(f"  is_staff: {sara.is_staff}")
print(f"  last_login_ip: {sara.last_login_ip}")
print(f"  last_login: {sara.last_login}")

# Check axes records
try:
    from axes.models import AccessAttempt
    attempts = AccessAttempt.objects.filter(username=sara.email)
    print(f"\nAxes attempts for {sara.email}: {attempts.count()}")
    for a in attempts:
        print(f"  ip={a.ip_address}, failures={a.failures_since_start}, time={a.attempt_time}")
except Exception as e:
    print(f"\nAxes check failed: {e}")

# Check axes access log
try:
    from axes.models import AccessLog
    logs = AccessLog.objects.filter(username=sara.email).order_by('-attempt_time')[:5]
    print(f"\nAxes access logs: {logs.count()}")
    for l in logs:
        print(f"  ip={l.ip_address}, outcome={l.outcome}, time={l.attempt_time}")
except Exception as e:
    print(f"AccessLog check failed: {e}")
