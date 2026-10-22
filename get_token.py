import os, sys
sys.path.insert(0, '/app')
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.production'
import django
django.setup()
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
u = get_user_model().objects.get(email='sara@oeuvres-sociales.dz')
token = RefreshToken.for_user(u)
print(token.access_token)
