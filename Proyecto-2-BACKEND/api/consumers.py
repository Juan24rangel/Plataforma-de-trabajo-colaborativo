"""
WebSocket consumers for real-time chat
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Channel, Message


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat functionality.
    
    URL pattern: ws/chat/<channel_id>/
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        try:
            self.channel_id = self.scope['url_route']['kwargs']['channel_id']
            self.room_group_name = f'chat_{self.channel_id}'
            
            # Get user from scope (populated by TokenAuthMiddleware)
            self.user = self.scope.get('user')
            
            print(f"[WebSocket] Intento de conexión - Channel ID: {self.channel_id}, User: {self.user}")
            
            # Verify user is authenticated
            if not self.user or not self.user.is_authenticated:
                print(f"[WebSocket] Usuario no autenticado - cerrando conexión")
                await self.accept()  # Aceptar primero para poder enviar mensaje
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Usuario no autenticado'
                }))
                await self.close(code=4001)
                return
            
            # Verify channel exists
            channel_exists = await self.channel_exists()
            if not channel_exists:
                print(f"[WebSocket] Canal {self.channel_id} no existe")
                await self.accept()
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Canal no encontrado'
                }))
                await self.close(code=4004)
                return
            
            # Verify user has access to this channel
            has_access = await self.check_channel_access()
            if not has_access:
                print(f"[WebSocket] Usuario {self.user.username} no tiene acceso al canal {self.channel_id}")
                await self.accept()
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'No tienes acceso a este canal'
                }))
                await self.close(code=4003)
                return
            
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            
            print(f"[WebSocket] Conexión exitosa - User: {self.user.username}, Channel: {self.channel_id}")
            
            # Send connection success message
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Conectado al chat'
            }))
        except Exception as e:
            print(f"[WebSocket] Error en connect: {str(e)}")
            import traceback
            traceback.print_exc()
            try:
                await self.accept()
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Error de conexión: {str(e)}'
                }))
                await self.close(code=4000)
            except:
                pass
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Receive message from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'chat_message')
            
            if message_type == 'chat_message':
                message_content = data.get('message', '').strip()
                
                if not message_content:
                    return
                
                # Save message to database
                message_obj = await self.save_message(message_content)
                
                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message_content,
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'message_id': message_obj.id,
                        'created_at': message_obj.created_at.isoformat(),
                    }
                )
            
            elif message_type == 'typing':
                # Broadcast typing indicator
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_typing',
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'is_typing': data.get('is_typing', False)
                    }
                )
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))
    
    async def chat_message(self, event):
        """Send message to WebSocket"""
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
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))
    
    @database_sync_to_async
    def channel_exists(self):
        """Check if channel exists"""
        try:
            Channel.objects.get(id=self.channel_id)
            return True
        except Channel.DoesNotExist:
            return False
        except Exception as e:
            print(f"[WebSocket] Error checking channel existence: {str(e)}")
            return False
    
    @database_sync_to_async
    def check_channel_access(self):
        """Check if user has access to the channel"""
        try:
            channel = Channel.objects.get(id=self.channel_id)
            
            # If channel is private, check membership
            if channel.is_private:
                return channel.members.filter(id=self.user.id).exists()
            
            # If channel belongs to a team, check team membership
            if channel.team:
                from .models import Membership
                return Membership.objects.filter(
                    team=channel.team,
                    user=self.user
                ).exists()
            
            # Public channel without team - allow access
            return True
        
        except Channel.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_message(self, content):
        """Save message to database"""
        channel = Channel.objects.get(id=self.channel_id)
        message = Message.objects.create(
            channel=channel,
            sender=self.user,
            contenido=content
        )
        return message
