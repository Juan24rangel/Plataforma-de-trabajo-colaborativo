import os
import django
import json
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Membership

def dump_memberships():
    res = []
    for m in Membership.objects.select_related('user','team').all():
        res.append({
            'id': m.id,
            'user': getattr(m.user, 'username', None),
            'team': getattr(m.team, 'nombre', None),
            'team_id': getattr(m.team, 'id', None),
            'role': m.role,
            'date_joined': m.date_joined.isoformat() if getattr(m, 'date_joined', None) else None,
        })
    return res

if __name__ == '__main__':
    print(json.dumps({'memberships': dump_memberships()}, indent=2, ensure_ascii=False))
