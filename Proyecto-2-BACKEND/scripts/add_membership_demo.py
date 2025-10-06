import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Team, Membership

username = 'calendar_test'
team_id = 1

try:
    user = User.objects.get(username=username)
except User.DoesNotExist:
    print(f'Usuario {username} no existe')
    sys.exit(1)

try:
    team = Team.objects.get(id=team_id)
except Team.DoesNotExist:
    print(f'Team id={team_id} no existe')
    sys.exit(1)

m, created = Membership.objects.get_or_create(user=user, team=team, defaults={'role': 'member'})
if created:
    print(f'Membership creada: user={username} team={team.nombre} role={m.role}')
else:
    print(f'Membership ya existía: user={username} team={team.nombre} role={m.role}')
