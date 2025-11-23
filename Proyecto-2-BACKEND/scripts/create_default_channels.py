#!/usr/bin/env python
"""
Script to create default 'general' channel for all teams that don't have one yet.
Run: python manage.py shell < scripts/create_default_channels.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Team, Channel

teams = Team.objects.all()
created_count = 0

for team in teams:
    # Check if team already has a channel
    if not team.channels.exists():
        Channel.objects.create(nombre='general', team=team, is_private=False)
        created_count += 1
        print(f'✓ Created "general" channel for team "{team.nombre}" (ID: {team.id})')
    else:
        print(f'✓ Team "{team.nombre}" already has channels, skipping')

print(f'\nTotal channels created: {created_count}')
