"""Imprime los documentos visibles por usuario según la lógica de DocumentViewSet.
Se usa dentro del entorno Django (manage.py). Ejecutar con:
python manage.py runscript visible_documents_for_user
o
python scripts/visible_documents_for_user.py (usa DJANGO settings si se ejecuta directamente)
"""
import os
import sys

# Setup Django environment if run directly
if __name__ == '__main__':
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.append(BASE_DIR)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    import django

    django.setup()

from django.contrib.auth import get_user_model
from api.models import Document, Team
from django.db.models import Q

User = get_user_model()

users = User.objects.all()

result = {}
for u in users:
    # staff sees all
    if u.is_staff or u.is_superuser:
        docs = Document.objects.all()
    else:
        # documents attached to tasks whose team the user owns or is a member of
        team_ids = Team.objects.filter(Q(owner=u) | Q(memberships__user=u)).values_list('id', flat=True)
        docs = Document.objects.filter(Q(task__team_id__in=team_ids) | Q(team_id__in=team_ids) | Q(owner=u))
    docs_list = []
    for d in docs:
        docs_list.append({
            'id': d.id,
            'filename': getattr(d.archivo, 'name', None),
            'owner': d.owner.username if d.owner else None,
            'team_id': d.team.id if d.team else (d.task.team.id if d.task and d.task.team else None),
            'task_id': d.task.id if d.task else None,
        })
    result[u.username] = docs_list

import json
print(json.dumps(result, indent=2, ensure_ascii=False))
