import os
import django
import json
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Team, Task

def dump_teams():
    res = []
    for t in Team.objects.all():
        res.append({
            'id': t.id,
            'nombre': t.nombre,
            'descripcion': t.descripcion,
            'owner': getattr(t.owner, 'username', None),
            'created_at': t.created_at.isoformat() if getattr(t, 'created_at', None) else None,
            'default_calendar_id': getattr(t, 'default_calendar_id', None),
        })
    return res

def dump_tasks():
    res = []
    for tk in Task.objects.all():
        res.append({
            'id': tk.id,
            'titulo': tk.titulo,
            'team_id': tk.team.id if tk.team else None,
            'creador': getattr(tk.creador, 'username', None),
            'asignado': getattr(tk.asignado, 'username', None),
            'estado': tk.estado,
            'created_at': tk.created_at.isoformat() if getattr(tk, 'created_at', None) else None,
        })
    return res

if __name__ == '__main__':
    out = {
        'teams': dump_teams(),
        'tasks': dump_tasks(),
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))
