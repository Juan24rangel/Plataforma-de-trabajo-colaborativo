"""
Script de prueba para verificar WebSocket
"""
import asyncio
import websockets
import json

async def test_websocket():
    # Token de prueba (reemplaza con un token válido)
    token = input("Pega el token JWT (accessToken de localStorage): ")
    channel_id = input("ID del canal (ejemplo: 11): ")
    
    uri = f"ws://localhost:8000/ws/chat/{channel_id}/?token={token}"
    
    print(f"\n{'='*60}")
    print(f"Intentando conectar a: {uri}")
    print(f"{'='*60}\n")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ ¡Conexión WebSocket establecida!")
            
            # Esperar mensaje de bienvenida
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(message)
                print(f"\n📨 Mensaje recibido del servidor:")
                print(json.dumps(data, indent=2))
                
                if data.get('type') == 'connection_established':
                    print("\n✅ Servidor confirmó la conexión!")
                    
                    # Enviar un mensaje de prueba
                    test_message = {
                        'type': 'chat_message',
                        'message': '¡Hola desde el script de prueba!'
                    }
                    
                    print(f"\n📤 Enviando mensaje de prueba...")
                    await websocket.send(json.dumps(test_message))
                    print("✅ Mensaje enviado!")
                    
                    # Esperar respuesta
                    print("\n⏳ Esperando respuesta...")
                    response = await asyncio.wait_for(websocket.recv(), timeout=5)
                    response_data = json.loads(response)
                    print(f"\n📨 Respuesta recibida:")
                    print(json.dumps(response_data, indent=2))
                    
                    print("\n✅ ¡Prueba exitosa! El WebSocket funciona correctamente.")
                
            except asyncio.TimeoutError:
                print("\n⚠️ Timeout esperando respuesta del servidor")
            
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"\n❌ Error de conexión: {e}")
        print("   El servidor rechazó la conexión. Verifica:")
        print("   - Token JWT válido")
        print("   - Canal ID existe")
        print("   - Usuario tiene permisos")
    except ConnectionRefusedError:
        print(f"\n❌ Conexión rechazada")
        print("   Verifica que Daphne esté corriendo en el puerto 8000")
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    print("\n🔍 Script de prueba de WebSocket para Chat")
    print("="*60)
    
    try:
        asyncio.run(test_websocket())
    except KeyboardInterrupt:
        print("\n\n⚠️ Prueba cancelada por el usuario")
    
    print("\n" + "="*60)
