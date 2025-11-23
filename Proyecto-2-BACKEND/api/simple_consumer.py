"""
WebSocket consumers para chat - Versión simplificada para debugging
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Channel, Message


class SimpleChatConsumer(AsyncWebsocketConsumer):
    """
    Consumer simplificado para debugging
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        print("[SimpleChatConsumer] ¡Intento de conexión!")
        
        # Aceptar inmediatamente sin validaciones
        await self.accept()
        
        print("[SimpleChatConsumer] ¡Conexión aceptada!")
        
        # Enviar mensaje de bienvenida
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': '¡Conectado al chat!'
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        print(f"[SimpleChatConsumer] Desconectado con código: {close_code}")
    
    async def receive(self, text_data):
        """Receive message from WebSocket"""
        print(f"[SimpleChatConsumer] Mensaje recibido: {text_data}")
        
        try:
            data = json.loads(text_data)
            
            # Simplemente devolver el mensaje recibido
            await self.send(text_data=json.dumps({
                'type': 'chat_message',
                'message': data.get('message', ''),
                'user_id': 1,
                'username': 'test_user',
                'message_id': 1,
                'created_at': '2025-11-11T19:30:00'
            }))
        except Exception as e:
            print(f"[SimpleChatConsumer] Error: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
