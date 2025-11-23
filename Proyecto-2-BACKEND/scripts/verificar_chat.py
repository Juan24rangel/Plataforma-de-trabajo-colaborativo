"""
Script para verificar el estado del chat en la base de datos
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Channel, Message, Team
from django.contrib.auth.models import User

def verificar_chat():
    print("\n" + "="*60)
    print("ESTADO DE LA BASE DE DATOS - CHAT EN TIEMPO REAL")
    print("="*60 + "\n")
    
    # Estadísticas generales
    print("📊 ESTADÍSTICAS GENERALES")
    print(f"  Usuarios: {User.objects.count()}")
    print(f"  Equipos: {Team.objects.count()}")
    print(f"  Canales: {Channel.objects.count()}")
    print(f"  Mensajes: {Message.objects.count()}")
    print()
    
    # Canales por equipo
    print("="*60)
    print("📢 CANALES POR EQUIPO")
    print("="*60 + "\n")
    
    teams = Team.objects.all()
    if not teams:
        print("  ⚠️  No hay equipos en la base de datos")
    
    for team in teams:
        channels = Channel.objects.filter(team=team)
        print(f"🏢 {team.nombre}")
        print(f"   ID: {team.id}")
        print(f"   Canales: {channels.count()}")
        
        if channels:
            for channel in channels:
                privacy = "🔒 Privado" if channel.is_private else "🌐 Público"
                message_count = Message.objects.filter(channel=channel).count()
                print(f"     - {channel.nombre} ({privacy}) - {message_count} mensajes")
        else:
            print("     ⚠️  Sin canales")
        print()
    
    # Mensajes recientes
    print("="*60)
    print("💬 MENSAJES RECIENTES")
    print("="*60 + "\n")
    
    recent_messages = Message.objects.all().order_by('-created_at')[:10]
    
    if not recent_messages:
        print("  ℹ️  No hay mensajes aún. El chat está listo para usarse!")
    else:
        for msg in recent_messages:
            print(f"  [{msg.created_at.strftime('%Y-%m-%d %H:%M')}]")
            print(f"  #{msg.channel.nombre} - {msg.sender.username}: {msg.contenido[:50]}")
            print()
    
    print("="*60)
    print("✅ VERIFICACIÓN COMPLETA")
    print("="*60 + "\n")

if __name__ == '__main__':
    verificar_chat()
