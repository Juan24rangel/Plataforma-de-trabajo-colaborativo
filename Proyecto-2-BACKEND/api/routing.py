"""
WebSocket routing configuration
"""
from django.urls import re_path
from . import working_consumer

websocket_urlpatterns = [
    re_path(r'^ws/chat/(?P<channel_id>\w+)/', working_consumer.ChatConsumer.as_asgi()),
]
