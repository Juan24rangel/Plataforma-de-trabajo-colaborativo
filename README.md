# TeamFlow — Proyecto base

Este repositorio contiene un backend en Django (Django REST Framework) y un frontend en React (Vite).

Resumen rápido
- Backend: `Proyecto-2-BACKEND` (Django 5.2, DRF)
- Frontend: `Proyecto-2-FRONTEND` (React + Vite)

Requisitos
- Python 3.11+
- Node.js 18+ (npm)

Instalación y ejecución (Backend)
1. Crear y activar virtualenv (opcional):
   python -m venv .venv
   # En PowerShell (si allow): .\.venv\Scripts\Activate.ps1
   # O usar el python directo: .\.venv\Scripts\python.exe
2. Instalar dependencias:
   & ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
3. Migraciones y ejecutar:
   & ".\.venv\Scripts\python.exe" manage.py migrate
   & ".\.venv\Scripts\python.exe" manage.py runserver 127.0.0.1:8000

Instalación y ejecución (Frontend)
1. Copiar archivo de ejemplo de variables de entorno:
   cp Proyecto-2-FRONTEND\.env.local.example Proyecto-2-FRONTEND\.env.local
2. Ir a la carpeta frontend e instalar dependencias:
   cd Proyecto-2-FRONTEND
   npm install
3. Ejecutar en desarrollo:
   npm run dev
   Abrir: http://localhost:5173

Nota sobre PostCSS & Tailwind v4:
- Si ves un error parecido a "It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin...", instala e incluye el plugin PostCSS de Tailwind:

```powershell
cd Proyecto-2-FRONTEND
npm install @tailwindcss/postcss --save-dev
```

Y actualiza (o confirma) `postcss.config.cjs` para usar `require('@tailwindcss/postcss')` en lugar de `require('tailwindcss')` si tu Tailwind es v4.

Variables de entorno (frontend)
- VITE_API_URL — base de la API, por defecto `http://localhost:8000/api`

API (endpoints principales)
- POST /api/register/  — registrar usuario (body: username, password, email). Devuelve tokens JWT.
- POST /api/token/     — login (body: username, password) -> access/refresh
- POST /api/token/refresh/ — refresh token

Recursos (DRF router)
- /api/teams/           — GET, POST
- /api/teams/{id}/      — GET, PUT, DELETE
- /api/memberships/     — CRUD
- /api/tasks/           — GET, POST
- /api/tasks/{id}/      — GET, PUT, DELETE
- /api/events/          — GET, POST
- /api/documents/       — GET, POST (multipart upload)
- /api/channels/        — GET, POST
- /api/messages/        — GET, POST (filter by channel via ?channel=ID)

Ejemplos rápidos (curl)
- Registrar:
  curl -X POST http://127.0.0.1:8000/api/register/ -H "Content-Type: application/json" -d '{"username":"u","password":"P4ssw0rd","email":"a@b.c"}'

- Login:
  curl -X POST http://127.0.0.1:8000/api/token/ -H "Content-Type: application/json" -d '{"username":"u","password":"P4ssw0rd"}'

- Listar teams (con token):
  curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://127.0.0.1:8000/api/teams/

Notas
- El frontend ya fue adaptado para usar `import.meta.env.VITE_API_URL` y tiene páginas básicas para Equipos y Tareas.
- El backend incluye modelos para perfiles, equipos, membresías, tareas, eventos, documentos y chat (mensajes en canales).

Siguientes pasos recomendados
1. Implementar permisos por roles (admin/member) en los ViewSets.
2. Añadir tests automáticos y CI.
3. Si necesitas chat real-time, integrar Django Channels + Redis.
4. Integración con Google Calendar (opcional):
   - Para habilitar la sincronización con Google Calendar crea un proyecto en Google Cloud, configura OAuth consent screen y crea credenciales OAuth 2.0 (client id + client secret).
   - Añade las credenciales al servidor (por ejemplo, usando variables de entorno) y completa el flujo OAuth en los endpoints:
      - GET /api/calendar/connect/    (inicia el flujo OAuth)
      - GET /api/calendar/callback/   (callback para intercambiar el código por tokens)
      - GET /api/calendar/status/     (consulta si el usuario está conectado)
   - Requiere añadir las dependencias: google-auth, google-auth-oauthlib, google-api-python-client (ya agregadas a requirements.txt)

