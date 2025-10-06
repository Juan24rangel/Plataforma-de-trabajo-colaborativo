import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

username = 'calendar_test'
password = 'TestPass123!'
email = 'calendar_test@example.com'

user, created = User.objects.get_or_create(username=username, defaults={'email': email})
if created:
    user.set_password(password)
    user.save()
    print('User created')
else:
    print('User exists')

refresh = RefreshToken.for_user(user)
print('username=' + username)
print('password=' + password)
print('refresh=' + str(refresh))
print('access=' + str(refresh.access_token))
