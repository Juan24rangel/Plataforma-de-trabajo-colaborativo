import os
import django
import sys
import json

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db.models import Q
from django.contrib.auth.models import User
from api.models import Task, Team

def visible_tasks(username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return []

    if user.is_staff or user.is_superuser:
        return list(Task.objects.all().values('id','titulo','team_id','creador_id','estado'))

    allowed_teams = Team.objects.filter(Q(owner=user) | Q(memberships__user=user)).distinct()
    return list(Task.objects.filter(team__in=allowed_teams).values('id','titulo','team_id','creador_id','estado'))

if __name__ == '__main__':
    users = ['calendar_test','alice','juancho']
    out = {}
    for u in users:
        out[u] = visible_tasks(u)
    print(json.dumps(out, indent=2, ensure_ascii=False))
