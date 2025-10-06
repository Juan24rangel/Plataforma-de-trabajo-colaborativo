"""Simula una actualización de perfil (sin archivo) usando el serializer para verificar que el endpoint PATCH funciona internamente."""
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

try:
    u = User.objects.get(username='calendar_test')
except User.DoesNotExist:
    print('Usuario calendar_test no existe')
    sys.exit(1)

p, created = Profile.objects.get_or_create(user=u)
print('Antes:', ProfileSerializer(p).data)

ser = ProfileSerializer(p, data={'nombre':'Prueba Nombre','bio':'Bio desde test'}, partial=True)
if ser.is_valid():
    ser.save()
    print('Después:', ser.data)
else:
    print('Errores:', ser.errors)
