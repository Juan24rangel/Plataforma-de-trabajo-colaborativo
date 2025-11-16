from rest_framework import serializers

# --- Serializers para la plataforma de equipos ---
from .models import (
    Profile, Team, Membership, Tag, Task, Event, Document, Channel, Message, GoogleCredential
)


class ProfileSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    teams = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['id', 'user', 'user_username', 'user_email', 'nombre', 'bio', 'foto', 'cargo', 'creado', 'teams']
        read_only_fields = ['user', 'user_username', 'user_email', 'creado']

    def get_teams(self, obj):
        # return list of teams the profile's user belongs to with role
        user = getattr(obj, 'user', None)
        if not user:
            return []
        from .models import Membership
        teams = []
        for m in Membership.objects.filter(user=user).select_related('team'):
            t = m.team
            teams.append({
                'id': t.id,
                'nombre': t.nombre,
                'descripcion': t.descripcion,
                'owner_username': t.owner.username if t.owner else None,
                'role': m.role,
            })
        return teams


class TeamSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    join_id = serializers.SerializerMethodField()
    join_url = serializers.SerializerMethodField()
    default_calendar_id = serializers.CharField(read_only=False, required=False, allow_null=True)
    class Meta:
        model = Team
        fields = ['id', 'nombre', 'descripcion', 'owner', 'owner_username', 'created_at', 'join_id', 'join_url', 'default_calendar_id']
        read_only_fields = ['owner', 'owner_username', 'join_id', 'join_url']

    def get_join_id(self, obj):
        return obj.id

    def get_join_url(self, obj):
        request = self.context.get('request')
        path = f"/join/{obj.id}"
        if request:
            try:
                return request.build_absolute_uri(path)
            except Exception:
                return path
        return path


class MembershipSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    is_current_user = serializers.SerializerMethodField()

    def get_is_current_user(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return obj.user == request.user
    class Meta:
        model = Membership
        fields = ['id', 'user', 'user_username', 'is_current_user', 'team', 'role', 'date_joined']
        read_only_fields = ['date_joined', 'user_username', 'is_current_user']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'nombre']


class TaskSerializer(serializers.ModelSerializer):
    etiquetas = TagSerializer(many=True, read_only=True)
    completed_by_username = serializers.CharField(source='completed_by.username', read_only=True)

    class Meta:
        model = Task
        fields = ['id', 'titulo', 'descripcion', 'creador', 'asignado', 'team', 'estado', 'prioridad', 'etiquetas', 'fecha_vencimiento', 'created_at', 'updated_at', 'completed_by', 'completed_by_username', 'completed_at']
        read_only_fields = ['creador', 'completed_by', 'completed_at']


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'titulo', 'descripcion', 'inicio', 'fin', 'organizador', 'team', 'location', 'all_day']


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'archivo', 'nombre', 'owner', 'team', 'task', 'carpeta', 'uploaded_at', 'size']
        read_only_fields = ['owner', 'uploaded_at', 'size']


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ['id', 'nombre', 'team', 'is_private', 'members']


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    class Meta:
        model = Message
        fields = ['id', 'channel', 'sender', 'sender_username', 'contenido', 'created_at']


class GoogleCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoogleCredential
        fields = ['id', 'user', 'token_json', 'refresh_token', 'scope', 'created_at']


class OAuthStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = 'OAuthState'
        fields = ['state', 'user', 'created_at']
