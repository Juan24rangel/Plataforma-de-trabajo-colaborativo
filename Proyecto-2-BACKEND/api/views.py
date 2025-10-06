from rest_framework import status
from rest_framework.response import Response # type: ignore
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import viewsets

# --- Nuevos ViewSets para la plataforma de equipos ---
from rest_framework import permissions, filters
from rest_framework import serializers as drf_serializers
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from rest_framework.decorators import action
from .permissions import IsTeamAdmin
from django.shortcuts import get_object_or_404
import os
from django.conf import settings
from django.http import HttpResponse
import datetime
from .models import OAuthState, GoogleCredential
import json
from .serializers import (
    ProfileSerializer, TeamSerializer, MembershipSerializer, TagSerializer,
    TaskSerializer, EventSerializer, DocumentSerializer, ChannelSerializer, MessageSerializer
)
from .models import Profile, Team, Membership, Tag, Task, Event, Document, Channel, Message


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Return only teams the user belongs to or owns. Anonymous users see none.
        user = self.request.user if self.request and self.request.user.is_authenticated else None
        if not user:
            return Team.objects.none()
        # staff users see all teams
        if user.is_staff or user.is_superuser:
            return Team.objects.all()
        return Team.objects.filter(Q(owner=user) | Q(memberships__user=user)).distinct()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user if self.request and self.request.user.is_authenticated else None
        team = serializer.save(owner=user)
        # Create membership as admin for owner
        if user:
            Membership.objects.create(user=user, team=team, role='admin')

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request, pk=None):
        team = self.get_object()
        members_count = team.memberships.count()
        tasks_count = team.tasks.count()
        tasks_by_status = {
            'pending': team.tasks.filter(estado='pending').count(),
            'in_progress': team.tasks.filter(estado='in_progress').count(),
            'done': team.tasks.filter(estado='done').count(),
        }
        documents_count = team.documents.count()
        events_count = team.events.count()
        channels_count = team.channels.count()
        messages_count = Message.objects.filter(channel__team=team).count()
        return Response({
            'members': members_count,
            'tasks': tasks_count,
            'tasks_by_status': tasks_by_status,
            'documents': documents_count,
            'events': events_count,
            'channels': channels_count,
            'messages': messages_count,
        })

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def export_members_csv(self, request, pk=None):
        team = self.get_object()
        if not (request.user.is_staff or request.user.is_superuser or Membership.objects.filter(team=team, user=request.user, role='admin').exists()):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        memberships = team.memberships.select_related('user')
        # build CSV
        lines = ['username,email,role,date_joined']
        for m in memberships:
            email = getattr(m.user, 'email', '')
            lines.append(f"{m.user.username},{email},{m.role},{m.date_joined.isoformat()}")
        csv = '\n'.join(lines)
        return HttpResponse(csv, content_type='text/csv')

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def activity(self, request, pk=None):
        team = self.get_object()
        if not (request.user.is_staff or request.user.is_superuser or Membership.objects.filter(team=team, user=request.user).exists()):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        # return counts per day for last 14 days (tasks created)
        from django.utils import timezone
        today = timezone.now().date()
        days = []
        for i in range(13, -1, -1):
            d = today - datetime.timedelta(days=i)
            start = datetime.datetime.combine(d, datetime.time.min, tzinfo=timezone.utc)
            end = datetime.datetime.combine(d, datetime.time.max, tzinfo=timezone.utc)
            tasks_count = Task.objects.filter(team=team, created_at__range=(start, end)).count()
            documents_count = Document.objects.filter(team=team, uploaded_at__range=(start, end)).count()
            messages_count = Message.objects.filter(channel__team=team, created_at__range=(start, end)).count()
            days.append({'date': d.isoformat(), 'tasks': tasks_count, 'documents': documents_count, 'messages': messages_count})
        return Response({'activity': days})


class MembershipViewSet(viewsets.ModelViewSet):
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        team = self.request.query_params.get('team')
        if team:
            qs = qs.filter(team_id=team)
        return qs

    def perform_create(self, serializer):
        # Enforce that only admins (or staff) can create memberships for other users.
        request_user = self.request.user if self.request and self.request.user.is_authenticated else None

        payload_user = serializer.validated_data.get('user')
        team = serializer.validated_data.get('team')

        # Require a team in payload
        if not team:
            raise drf_serializers.ValidationError({'team': 'Team is required to create a membership.'})

        # If payload specifies a user different than the requester
        if payload_user and request_user and payload_user != request_user:
            # allow if requester is staff/superuser
            if request_user.is_staff or request_user.is_superuser:
                serializer.save()
                return
            # allow if requester is admin of the team
            if Membership.objects.filter(team=team, user=request_user, role='admin').exists():
                serializer.save()
                return
            # otherwise forbidden
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only team admins or staff can create memberships for other users.')

        # Default: assign the current user as the member if not specified
        if not payload_user and request_user:
            serializer.save(user=request_user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsTeamAdmin])
    def promote(self, request, pk=None):
        membership = self.get_object()
        membership.role = 'admin'
        membership.save()
        return Response(self.get_serializer(membership).data)

    @action(detail=True, methods=['post'], permission_classes=[IsTeamAdmin])
    def demote(self, request, pk=None):
        membership = self.get_object()
        # prevent demoting the last admin
        admins = Membership.objects.filter(team=membership.team, role='admin')
        if admins.count() <= 1 and membership.role == 'admin':
            return Response({'detail': 'Cannot demote the last admin.'}, status=status.HTTP_400_BAD_REQUEST)
        membership.role = 'member'
        membership.save()
        return Response(self.get_serializer(membership).data)

    @action(detail=True, methods=['post'], permission_classes=[IsTeamAdmin])
    def remove(self, request, pk=None):
        membership = self.get_object()
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['titulo', 'descripcion']

    def get_queryset(self):
        """
        Return tasks visible to the requesting user.
        - staff/superuser: see all tasks
        - authenticated user: see tasks that belong to teams they own or are a member of
        - anonymous: see none
        If `team` query param is provided, results are additionally filtered by that team id.
        """
        qs = super().get_queryset()
        team_param = self.request.query_params.get('team')

        user = self.request.user if self.request and self.request.user.is_authenticated else None
        # no user -> no tasks
        if not user:
            return qs.none()

        # staff sees all (optionally filtered by team)
        if user.is_staff or user.is_superuser:
            if team_param:
                return qs.filter(team_id=team_param)
            return qs

        # build allowed teams for this user
        allowed_teams = Team.objects.filter(Q(owner=user) | Q(memberships__user=user)).distinct()

        if team_param:
            # ensure the requested team is among allowed teams
            try:
                team_id_int = int(team_param)
            except Exception:
                return qs.none()
            if not allowed_teams.filter(id=team_id_int).exists():
                return qs.none()
            return qs.filter(team_id=team_id_int)

        return qs.filter(team__in=allowed_teams)

    def perform_create(self, serializer):
        # Asignar el creador al usuario logueado si no se provee
        user = self.request.user if self.request and self.request.user.is_authenticated else None
        serializer.save(creador=user)


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def ics(self, request, pk=None):
        event = self.get_object()
        # build a minimal ICS representation
        uid = f"event-{event.id}@{request.get_host()}"
        dtstamp = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        try:
            dtstart = event.inicio.astimezone(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            dtend = event.fin.astimezone(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        except Exception:
            # fallback to naive formatting
            dtstart = event.inicio.strftime('%Y%m%dT%H%M%SZ')
            dtend = event.fin.strftime('%Y%m%dT%H%M%SZ')

        summary = event.titulo or ''
        description = (event.descripcion or '').replace('\n', '\\n')
        organizer = ''
        if event.organizador and hasattr(event.organizador, 'email'):
            organizer = f"MAILTO:{event.organizador.email}"

        ics = '\n'.join([
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//ProyectoIS//EN',
            'BEGIN:VEVENT',
            f'UID:{uid}',
            f'DTSTAMP:{dtstamp}',
            f'DTSTART:{dtstart}',
            f'DTEND:{dtend}',
            f'SUMMARY:{summary}',
            f'DESCRIPTION:{description}',
            (f'ORGANIZER:{organizer}' if organizer else ''),
            'END:VEVENT',
            'END:VCALENDAR'
        ])

        resp = HttpResponse(ics, content_type='text/calendar')
        resp['Content-Disposition'] = f'attachment; filename=event-{event.id}.ics'
        return resp


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        # users can see profiles; restrict sensitive info if needed
        qs = super().get_queryset()
        return qs

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['patch', 'post'], permission_classes=[permissions.IsAuthenticated])
    def update_me(self, request):
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=request.user)
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = (MultiPartParser, FormParser)

    def perform_create(self, serializer):
        user = self.request.user if self.request and self.request.user.is_authenticated else None
        # attach owner and optional task if provided in request data
        task_id = None
        try:
            task_id = self.request.data.get('task')
        except Exception:
            task_id = None

        # File validation (size and MIME type) if archivo is present
        archivo = None
        try:
            archivo = self.request.FILES.get('archivo')
        except Exception:
            archivo = None

        if archivo:
            max_size = getattr(settings, 'MAX_UPLOAD_SIZE', None)
            allowed = getattr(settings, 'ALLOWED_FILE_MIME_TYPES', None)
            if max_size and archivo.size > max_size:
                raise drf_serializers.ValidationError({'archivo': f'El archivo excede el tamaño máximo de {max_size} bytes.'})
            content_type = getattr(archivo, 'content_type', None)
            if allowed and content_type and content_type not in allowed:
                raise drf_serializers.ValidationError({'archivo': f'Tipo de archivo no permitido: {content_type}'})

        # Enforce that the user can only upload to tasks/teams they belong to (unless staff)
        allowed = False
        if user and (user.is_staff or user.is_superuser):
            allowed = True

        target_team = None
        if task_id:
            try:
                t = Task.objects.get(id=task_id)
                target_team = t.team
            except Exception:
                raise drf_serializers.ValidationError({'task': 'Task not found'})
        else:
            # maybe team provided as direct param
            team_param = self.request.data.get('team')
            if team_param:
                try:
                    target_team = Team.objects.get(id=team_param)
                except Exception:
                    raise drf_serializers.ValidationError({'team': 'Team not found'})

        if not allowed and target_team is not None:
            # check membership
            if Team.objects.filter(Q(owner=user) | Q(memberships__user=user), id=target_team.id).exists():
                allowed = True

        if not allowed and target_team is None:
            # uploading without team/task: allow (owner-only file) or disallow? we'll allow but set owner
            allowed = True

        if not allowed:
            raise drf_serializers.ValidationError({'detail': 'Forbidden to upload to this team/task'})

        if task_id:
            serializer.save(owner=user, task_id=task_id)
        else:
            # if team_param present, save team as well
            if 'team' in (self.request.data or {}):
                serializer.save(owner=user, team_id=self.request.data.get('team'))
            else:
                serializer.save(owner=user)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user if self.request and self.request.user.is_authenticated else None

        # staff users see everything
        if not (user and (user.is_staff or user.is_superuser)):
            # restrict to docs belonging to teams the user owns or is member of, or owner-only
            team_ids = Team.objects.filter(Q(owner=user) | Q(memberships__user=user)).values_list('id', flat=True)
            qs = qs.filter(Q(task__team_id__in=team_ids) | Q(team_id__in=team_ids) | Q(owner=user))

        task = None
        try:
            task = self.request.query_params.get('task') if self.request else None
        except Exception:
            task = None

        if task:
            qs = qs.filter(task_id=task)
        return qs



class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer

    def get_queryset(self):
        channel_id = self.request.query_params.get('channel')
        if channel_id:
            return self.queryset.filter(channel_id=channel_id)
        return self.queryset


from rest_framework.views import APIView


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not (user.is_staff or user.is_superuser):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        teams = Team.objects.count()
        users = Profile.objects.count()
        tasks = Task.objects.count()
        documents = Document.objects.count()
        messages = Message.objects.count()
        return Response({
            'teams': teams,
            'users': users,
            'tasks': tasks,
            'documents': documents,
            'messages': messages,
        })


class CalendarConnectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Build an OAuth2 authorization URL and state token, store state and return URL.
        try:
            from google_auth_oauthlib.flow import Flow
        except Exception:
            return Response({'detail': 'google-auth-oauthlib no instalado en el servidor. Instala google-auth-oauthlib y configura credenciales.'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        client_id = os.environ.get('GOOGLE_CLIENT_ID')
        client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
        redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI')
        if not client_id or not client_secret or not redirect_uri:
            return Response({'detail': 'Faltan GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI en variables de entorno.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        flow = Flow.from_client_config({
            'web': {
                'client_id': client_id,
                'client_secret': client_secret,
                'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                'token_uri': 'https://oauth2.googleapis.com/token'
            }
        }, scopes=['https://www.googleapis.com/auth/calendar.events'], redirect_uri=redirect_uri)

        auth_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true')

        # save state
        import uuid
        state_key = state or str(uuid.uuid4())
        from .models import OAuthState
        OAuthState.objects.create(state=state_key, user=request.user)
        return Response({'auth_url': auth_url, 'state': state_key})


class CalendarCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            from google_auth_oauthlib.flow import Flow
        except Exception:
            return Response({'detail': 'google-auth-oauthlib no instalado en el servidor.'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        code = request.query_params.get('code')
        state = request.query_params.get('state')
        if not code or not state:
            return Response({'detail': 'Missing code or state'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .models import OAuthState, GoogleCredential
            st = OAuthState.objects.get(state=state)
        except Exception:
            return Response({'detail': 'State not found'}, status=status.HTTP_400_BAD_REQUEST)

        client_id = os.environ.get('GOOGLE_CLIENT_ID')
        client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
        redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI')
        if not client_id or not client_secret or not redirect_uri:
            return Response({'detail': 'Server missing OAuth client config'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        flow = Flow.from_client_config({
            'web': {
                'client_id': client_id,
                'client_secret': client_secret,
                'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                'token_uri': 'https://oauth2.googleapis.com/token'
            }
        }, scopes=['https://www.googleapis.com/auth/calendar.events'], state=state, redirect_uri=redirect_uri)

        try:
            flow.fetch_token(code=code)
            creds = flow.credentials
            # Save credentials
            import json
            token_json = json.dumps({
                'token': creds.token,
                'refresh_token': creds.refresh_token,
                'token_uri': creds.token_uri,
                'client_id': creds.client_id,
                'client_secret': creds.client_secret,
                'scopes': creds.scopes,
            })
            gc, _ = GoogleCredential.objects.get_or_create(user=st.user)
            gc.token_json = token_json
            gc.refresh_token = creds.refresh_token
            gc.scope = ' '.join(list(creds.scopes or []))
            gc.save()
            return Response({'detail': 'Calendar connected'})
        except Exception as e:
            return Response({'detail': f'Error exchanging token: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CalendarStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Return whether the user has connected calendar (skeleton)
        has = hasattr(request.user, 'google_credential') and request.user.google_credential.token_json
        return Response({'connected': bool(has)})


def build_credentials_from_gc(gc: GoogleCredential):
    """Return google.oauth2.credentials.Credentials built from GoogleCredential instance.
    Refreshes token if needed. Raises informative Exception if google libs not installed.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request as GoogleRequest
    except Exception:
        raise RuntimeError('google-auth libraries not installed')

    if not gc or not gc.token_json:
        raise RuntimeError('No Google credentials stored')

    data = json.loads(gc.token_json)
    creds = Credentials(
        token=data.get('token'),
        refresh_token=data.get('refresh_token'),
        token_uri=data.get('token_uri'),
        client_id=data.get('client_id'),
        client_secret=data.get('client_secret'),
        scopes=data.get('scopes')
    )
    # refresh if expired or no token
    try:
        if not creds.valid and creds.refresh_token:
            creds.refresh(GoogleRequest())
            # save refreshed token back
            data['token'] = creds.token
            gc.token_json = json.dumps(data)
            gc.save()
    except Exception:
        # best-effort: we'll still return creds (may be invalid)
        pass
    return creds


class CalendarListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # list calendars for current user
        try:
            from googleapiclient.discovery import build
        except Exception:
            return Response({'detail': 'google-api-python-client no instalado'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        try:
            gc = getattr(request.user, 'google_credential', None)
            if not gc:
                return Response({'detail': 'No conectado'}, status=status.HTTP_404_NOT_FOUND)
            creds = build_credentials_from_gc(gc)
            service = build('calendar', 'v3', credentials=creds)
            res = service.calendarList().list().execute()
            items = res.get('items', [])
            # return minimal fields
            result = [{'id': i.get('id'), 'summary': i.get('summary'), 'primary': i.get('primary', False)} for i in items]
            return Response({'calendars': result})
        except Exception as e:
            return Response({'detail': f'Error listing calendars: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CalendarPublishView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, team_id=None):
        try:
            from googleapiclient.discovery import build
        except Exception:
            return Response({'detail': 'google-api-python-client no instalado'}, status=status.HTTP_501_NOT_IMPLEMENTED)

        # check permissions: team member or staff
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            return Response({'detail': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_staff or request.user.is_superuser or Membership.objects.filter(team=team, user=request.user).exists()):
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data
        calendar_id = payload.get('calendarId', 'primary')
        summary = payload.get('summary') or payload.get('title') or f'Evento desde Team {team.nombre}'
        start = payload.get('start')
        end = payload.get('end')

        try:
            gc = getattr(request.user, 'google_credential', None)
            if not gc:
                return Response({'detail': 'No conectado'}, status=status.HTTP_404_NOT_FOUND)
            creds = build_credentials_from_gc(gc)
            service = build('calendar', 'v3', credentials=creds)

            event_body = {
                'summary': summary,
            }
            if start and end:
                event_body['start'] = {'dateTime': start}
                event_body['end'] = {'dateTime': end}
            else:
                # default: ahora +1h
                now = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'
                later = (datetime.datetime.utcnow() + datetime.timedelta(hours=1)).replace(microsecond=0).isoformat() + 'Z'
                event_body['start'] = {'dateTime': now}
                event_body['end'] = {'dateTime': later}

            created = service.events().insert(calendarId=calendar_id, body=event_body).execute()
            return Response({'detail': 'Event created', 'event': created})
        except Exception as e:
            return Response({'detail': f'Error creating event: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
