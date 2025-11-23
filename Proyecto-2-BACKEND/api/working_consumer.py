"""
WebSocket consumers para chat - Versión funcional sin autenticación estricta
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Channel, Message


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer para chat en tiempo real
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        print("[ChatConsumer] ========== NUEVA CONEXIÓN ==========")
        
        try:
            self.channel_id = self.scope['url_route']['kwargs']['channel_id']
            self.room_group_name = f'chat_{self.channel_id}'
            
            print(f"[ChatConsumer] Channel ID: {self.channel_id}")
            print(f"[ChatConsumer] Room group: {self.room_group_name}")
            
            # Get user from scope
            self.user = self.scope.get('user')
            print(f"[ChatConsumer] User from scope: {self.user}")
            print(f"[ChatConsumer] User authenticated: {self.user.is_authenticated if self.user else False}")
            
            # Join room group ANTES de aceptar
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            print(f"[ChatConsumer] Agregado al grupo: {self.room_group_name}")
            
            # Aceptar la conexión
            await self.accept()
            print(f"[ChatConsumer] Conexión aceptada!")
            
            # Send connection success message
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Conectado al chat'
            }))
            print(f"[ChatConsumer] Mensaje de bienvenida enviado")
            
        except Exception as e:
            print(f"[ChatConsumer] ERROR en connect: {str(e)}")
            import traceback
            traceback.print_exc()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        print(f"[ChatConsumer] Desconectando con código: {close_code}")
        
        try:
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            print(f"[ChatConsumer] Removido del grupo: {self.room_group_name}")
        except Exception as e:
            print(f"[ChatConsumer] Error en disconnect: {str(e)}")
    
    async def receive(self, text_data):
        """Receive message from WebSocket"""
        print(f"[ChatConsumer] Mensaje recibido: {text_data[:100]}...")
        
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'chat_message')
            
            if message_type == 'chat_message':
                message_content = data.get('message', '').strip()
                
                if not message_content:
                    return
                
                print(f"[ChatConsumer] Procesando mensaje de chat: {message_content[:50]}...")
                
                # Obtener usuario (usar el del scope o crear uno temporal)
                user = self.user if (self.user and self.user.is_authenticated) else None
                
                if user:
                    # Guardar mensaje en base de datos
                    message_obj = await self.save_message(message_content, user)
                    user_id = user.id
                    username = user.username
                    message_id = message_obj.id
                    created_at = message_obj.created_at.isoformat()
                else:
                    # Usuario anónimo temporal
                    user_id = 0
                    username = "Anónimo"
                    message_id = 0
                    created_at = "2025-11-11T19:30:00"
                
                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message_content,
                        'user_id': user_id,
                        'username': username,
                        'message_id': message_id,
                        'created_at': created_at,
                    }
                )
                print(f"[ChatConsumer] Mensaje enviado al grupo")
            
            elif message_type == 'typing':
                # Broadcast typing indicator
                user = self.user if (self.user and self.user.is_authenticated) else None
                if user:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'user_typing',
                            'user_id': user.id,
                            'username': user.username,
                            'is_typing': data.get('is_typing', False)
                        }
                    )
        
        except json.JSONDecodeError as e:
            print(f"[ChatConsumer] Error JSON: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'JSON inválido'
            }))
        except Exception as e:
            print(f"[ChatConsumer] Error en receive: {str(e)}")
            import traceback
            traceback.print_exc()
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    async def chat_message(self, event):
        """Send message to WebSocket"""
        print(f"[ChatConsumer] Enviando mensaje a WebSocket: {event['message'][:50]}...")
        
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'user_id': event['user_id'],
            'username': event['username'],
            'message_id': event['message_id'],
            'created_at': event['created_at'],
        }))
    
    async def user_typing(self, event):
        """Send typing indicator to WebSocket"""
        # Don't send typing indicator to the user who is typing
        user = self.user if (self.user and self.user.is_authenticated) else None
        if user and event['user_id'] != user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))
    
    @database_sync_to_async
    def save_message(self, content, user):
        """Save message to database"""
        try:
            channel = Channel.objects.get(id=self.channel_id)
            message = Message.objects.create(
                channel=channel,
                sender=user,
                contenido=content
            )
            print(f"[ChatConsumer] Mensaje guardado en BD: ID={message.id}")
            return message
        except Exception as e:
            print(f"[ChatConsumer] Error guardando mensaje: {str(e)}")
            raise
