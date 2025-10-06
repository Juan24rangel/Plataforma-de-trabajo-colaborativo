from django.contrib import admin
from .models import (
	Profile, Team, Membership, Tag, Task, Event, Document, Channel, Message,
	GoogleCredential, OAuthState,
)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
	list_display = ('user', 'nombre', 'cargo', 'creado')
	search_fields = ('user__username', 'nombre', 'cargo')


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
	list_display = ('nombre', 'owner', 'created_at', 'default_calendar_id')
	search_fields = ('nombre', 'owner__username')


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
	list_display = ('user', 'team', 'role', 'date_joined')
	list_filter = ('role',)
	search_fields = ('user__username', 'team__nombre')


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
	list_display = ('nombre',)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
	list_display = ('titulo', 'team', 'creador', 'asignado', 'estado', 'prioridad', 'fecha_vencimiento')
	search_fields = ('titulo', 'descripcion')
	list_filter = ('estado', 'prioridad')


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
	list_display = ('titulo', 'team', 'organizador', 'inicio', 'fin')
	search_fields = ('titulo', 'descripcion')


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
	list_display = ('nombre', 'owner', 'team', 'task', 'uploaded_at', 'size')
	search_fields = ('nombre',)


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
	list_display = ('nombre', 'team', 'is_private')
	search_fields = ('nombre',)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
	list_display = ('channel', 'sender', 'created_at')
	search_fields = ('sender__username', 'contenido')


@admin.register(GoogleCredential)
class GoogleCredentialAdmin(admin.ModelAdmin):
	list_display = ('user', 'created_at')
	search_fields = ('user__username',)


@admin.register(OAuthState)
class OAuthStateAdmin(admin.ModelAdmin):
	list_display = ('state', 'user', 'created_at')
	search_fields = ('state', 'user__username')
