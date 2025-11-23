#!/usr/bin/env python
"""Script para mostrar información de la base de datos"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Team, Membership, Task, Document, Profile, Event

def main():
    print("\n" + "="*60)
    print("📊 INFORMACIÓN DE LA BASE DE DATOS")
    print("="*60)
    
    # Contadores
    print("\n📈 RESUMEN GENERAL:")
    print(f"  • Usuarios registrados: {User.objects.count()}")
    print(f"  • Perfiles creados: {Profile.objects.count()}")
    print(f"  • Equipos: {Team.objects.count()}")
    print(f"  • Membresías (usuarios en equipos): {Membership.objects.count()}")
    print(f"  • Tareas: {Task.objects.count()}")
    print(f"  • Documentos: {Document.objects.count()}")
    print(f"  • Eventos: {Event.objects.count()}")
    
    # Equipos
    print("\n" + "="*60)
    print("👥 EQUIPOS REGISTRADOS:")
    print("="*60)
    teams = Team.objects.all().order_by('created_at')
    if teams.exists():
        for t in teams:
            print(f"\n  [{t.id}] {t.nombre}")
            print(f"      Owner: {t.owner.username}")
            print(f"      Descripción: {t.descripcion or '(sin descripción)'}")
            print(f"      Creado: {t.created_at.strftime('%Y-%m-%d %H:%M')}")
            print(f"      Miembros: {t.memberships.count()}")
            print(f"      Tareas: {t.tasks.count()}")
    else:
        print("  (No hay equipos registrados)")
    
    # Membresías
    print("\n" + "="*60)
    print("🔗 MEMBRESÍAS (Usuarios en equipos):")
    print("="*60)
    mems = Membership.objects.select_related('user', 'team').all().order_by('team__nombre', 'role')
    if mems.exists():
        current_team = None
        for m in mems:
            if m.team.nombre != current_team:
                current_team = m.team.nombre
                print(f"\n  Equipo: {current_team}")
            role_icon = "👑" if m.role == 'admin' else "👤"
            print(f"    {role_icon} {m.user.username} ({m.role})")
    else:
        print("  (No hay membresías)")
    
    # Tareas
    print("\n" + "="*60)
    print("📋 TAREAS REGISTRADAS:")
    print("="*60)
    tasks = Task.objects.select_related('team', 'creador').all().order_by('-created_at')
    if tasks.exists():
        for t in tasks:
            estado_icon = {
                'pending': '⏳',
                'in_progress': '🔄',
                'done': '✅'
            }.get(t.estado, '❓')
            print(f"\n  [{t.id}] {t.titulo}")
            print(f"      Estado: {estado_icon} {t.get_estado_display()}")
            print(f"      Equipo: {t.team.nombre if t.team else '(sin equipo)'}")
            print(f"      Creador: {t.creador.username if t.creador else '(sin creador)'}")
            if t.descripcion:
                print(f"      Descripción: {t.descripcion[:80]}...")
    else:
        print("  (No hay tareas)")
    
    # Documentos
    print("\n" + "="*60)
    print("📁 DOCUMENTOS SUBIDOS:")
    print("="*60)
    docs = Document.objects.select_related('owner', 'team', 'task').all().order_by('-uploaded_at')
    if docs.exists():
        for d in docs:
            print(f"\n  [{d.id}] {d.nombre}")
            print(f"      Archivo: {d.archivo}")
            print(f"      Subido por: {d.owner.username}")
            if d.team:
                print(f"      Equipo: {d.team.nombre}")
            if d.task:
                print(f"      Tarea: {d.task.titulo}")
            print(f"      Tamaño: {d.size / 1024:.2f} KB" if d.size else "      Tamaño: desconocido")
    else:
        print("  (No hay documentos)")
    
    print("\n" + "="*60)
    print("✅ La API SÍ está guardando información en:")
    print(f"   {os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db.sqlite3')}")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
