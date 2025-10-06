"""Script rápido para serializar el perfil de usuarios existentes (no usa HTTP) y mostrar los campos que devolvería `/profiles/me/`"""
import os, sys
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.contrib.auth import get_user_model
from api.models import Profile
from api.serializers import ProfileSerializer

User = get_user_model()

for username in ['calendar_test', 'alice', 'admin']:
    try:
        u = User.objects.get(username=username)
    except User.DoesNotExist:
        print(f"Usuario {username} no existe")
        continue
    try:
        p = Profile.objects.get(user=u)
    except Profile.DoesNotExist:
        p = Profile.objects.create(user=u)
    ser = ProfileSerializer(p, context={'request': None})
    import json
    print(username, json.dumps(ser.data, ensure_ascii=False))
