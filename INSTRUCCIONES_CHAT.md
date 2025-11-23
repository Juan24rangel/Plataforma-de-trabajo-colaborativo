# Instrucciones para Ejecutar el Chat en Tiempo Real

## Backend (Django Channels con WebSocket)

### 1. Activar el entorno virtual (si lo usas)
```bash
# En Windows
.\venv\Scripts\activate

# En Linux/Mac
source venv/bin/activate
```

### 2. Instalar dependencias (si no lo has hecho)
```bash
pip install -r requirements.txt
```

### 3. Ejecutar el servidor con Daphne (NO usar runserver)
Django Channels requiere un servidor ASGI. Usa Daphne en lugar de runserver:

```bash
cd Proyecto-2-BACKEND
daphne -b 0.0.0.0 -p 8000 backend.asgi:application
```

O alternativamente con el comando de development:
```bash
python manage.py runserver
```
> **Nota**: Django 5.2 soporta ASGI nativamente, pero para producción se recomienda Daphne.

### 4. Verificar que el servidor está corriendo
Deberías ver un mensaje similar a:
```
Django version 5.2.0, using settings 'backend.settings'
Starting ASGI/Daphne version 4.0.0 development server at http://0.0.0.0:8000/
```

## Frontend (React + Vite)

### 1. Instalar dependencias (si no lo has hecho)
```bash
cd Proyecto-2-FRONTEND
npm install
```

### 2. Ejecutar el servidor de desarrollo
```bash
npm run dev
```

### 3. Abrir en el navegador
```
http://localhost:5173
```

## Probar el Chat

1. **Registrar/Iniciar sesión** con al menos 2 usuarios diferentes
2. **Crear un equipo** o unirse a uno existente
3. **Navegar a la sección "Chat"** en el menú superior
4. **Seleccionar un equipo** en el sidebar izquierdo
5. **Crear un canal** haciendo clic en el botón "+"
6. **Enviar mensajes** en tiempo real

### Funcionalidades implementadas:
- ✅ Conexión WebSocket en tiempo real
- ✅ Envío y recepción de mensajes instantáneos
- ✅ Indicador de escritura ("usuario está escribiendo...")
- ✅ Separadores de fecha en la conversación
- ✅ Mensajes propios alineados a la derecha (estilo WhatsApp)
- ✅ Crear canales públicos y privados
- ✅ Scroll automático al final de la conversación
- ✅ Indicador de conexión (Conectado/Desconectado)
- ✅ Autenticación mediante JWT en WebSocket
- ✅ Control de acceso a canales (privados, por equipo)

## Problemas Comunes

### Error: "WebSocket connection failed"
- Verifica que el backend esté corriendo con Daphne
- Verifica que la URL del WebSocket sea correcta: `ws://localhost:8000/ws/chat/<channel_id>/?token=<jwt>`
- Revisa la consola del navegador para más detalles

### Error: "Connection closed immediately"
- Verifica que el usuario esté autenticado
- Verifica que el usuario tenga acceso al canal (miembro del equipo)
- Revisa los logs del servidor backend

### Error: "Channel layer error"
- Asegúrate de que `InMemoryChannelLayer` esté configurado en `settings.py`
- Para producción, instala Redis y configura `RedisChannelLayer`

## Configuración para Producción

Para usar Redis como channel layer (recomendado para producción):

1. Instalar Redis
2. Actualizar `settings.py`:
```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
```

3. Ejecutar Redis:
```bash
redis-server
```

## Arquitectura del Chat

```
Frontend (React)                Backend (Django Channels)
┌─────────────────┐            ┌──────────────────────┐
│  Chat.jsx       │            │  consumers.py        │
│  - WebSocket    │ ←─────────→│  - ChatConsumer      │
│  - UI/Messages  │   WS://    │  - Async handlers    │
└─────────────────┘            └──────────────────────┘
                                         ↓
                                ┌──────────────────────┐
                                │  Channel Layer       │
                                │  (InMemory/Redis)    │
                                └──────────────────────┘
                                         ↓
                                ┌──────────────────────┐
                                │  Database            │
                                │  - Channel           │
                                │  - Message           │
                                └──────────────────────┘
```

## Próximas Mejoras (Opcional)

- [ ] Notificaciones de escritorio
- [ ] Emojis y reacciones
- [ ] Mensajes privados 1-a-1
- [ ] Compartir archivos en el chat
- [ ] Búsqueda de mensajes
- [ ] Editar/eliminar mensajes
- [ ] Menciones (@usuario)
- [ ] Hilos de conversación
