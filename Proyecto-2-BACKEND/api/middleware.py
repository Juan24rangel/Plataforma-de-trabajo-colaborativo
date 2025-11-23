"""
Custom middleware for WebSocket token authentication
"""
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from urllib.parse import parse_qs

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string):
    """
    Get user from JWT token string
    """
    try:
        # Validate and decode token
        access_token = AccessToken(token_string)
        user_id = access_token['user_id']
        
        # Get user from database
        user = User.objects.get(id=user_id)
        print(f"[Middleware] Token válido - Usuario: {user.username} (ID: {user.id})")
        return user
    except TokenError as e:
        print(f"[Middleware] Token inválido: {str(e)}")
        return AnonymousUser()
    except User.DoesNotExist:
        print(f"[Middleware] Usuario no encontrado con ID: {user_id}")
        return AnonymousUser()
    except KeyError as e:
        print(f"[Middleware] Error en token - campo faltante: {str(e)}")
        return AnonymousUser()
    except Exception as e:
        print(f"[Middleware] Error inesperado: {str(e)}")
        return AnonymousUser()


class TokenAuthMiddleware:
    """
    Custom middleware that takes a JWT token from the query string
    and authenticates the WebSocket connection.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Parse query string for token
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        token = query_params.get('token', [None])[0]
        
        print(f"[Middleware] Query string: {query_string[:100]}...")
        print(f"[Middleware] Token presente: {'Sí' if token else 'No'}")
        
        # Authenticate user if token is provided
        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            print(f"[Middleware] No se proporcionó token - usuario anónimo")
            scope['user'] = AnonymousUser()

        return await self.app(scope, receive, send)


def TokenAuthMiddlewareStack(app):
    """
    Helper function to wrap the app with TokenAuthMiddleware
    """
    return TokenAuthMiddleware(app)