from django.db import models

# --- Nuevos modelos para la plataforma de equipos ---
from django.conf import settings


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    nombre = models.CharField(max_length=200, blank=True)
    bio = models.TextField(blank=True)
    foto = models.ImageField(upload_to='profiles/', null=True, blank=True)
    cargo = models.CharField(max_length=200, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile: {self.user.username}"


class Team(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    # optional: store a default calendar id to publish events to for this team
    default_calendar_id = models.CharField(max_length=512, blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_teams')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre


class Membership(models.Model):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('member', 'Member'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'team')

    def __str__(self):
        return f"{self.user.username} in {self.team.nombre} ({self.role})"


class Tag(models.Model):
    nombre = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.nombre


class Task(models.Model):
    ESTADO_CHOICES = (
        ('pending', 'Pendiente'),
        ('in_progress', 'En progreso'),
        ('done', 'Completada'),
        ('overdue', 'Retrasada'),
    )
    PRIORITY_CHOICES = (
        ('low', 'Baja'),
        ('medium', 'Media'),
        ('high', 'Alta'),
    )
    TIPO_CHOICES = (
        ('file_upload', 'Subir Archivo'),
        ('meeting', 'Reunión Programada'),
        ('general', 'General'),
    )
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)
    creador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_tasks')
    asignado = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True, blank=True, related_name='tasks')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pending')
    prioridad = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='general')
    etiquetas = models.ManyToManyField(Tag, blank=True)
    fecha_vencimiento = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.titulo


class Event(models.Model):
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)
    inicio = models.DateTimeField()
    fin = models.DateTimeField()
    organizador = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True, blank=True, related_name='events')
    location = models.CharField(max_length=255, blank=True)
    all_day = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.titulo} ({self.inicio})"


class Document(models.Model):
    archivo = models.FileField(upload_to='documents/')
    nombre = models.CharField(max_length=255, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    task = models.ForeignKey('Task', on_delete=models.CASCADE, null=True, blank=True, related_name='documents')
    carpeta = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    size = models.BigIntegerField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.archivo and not self.size:
            try:
                self.size = self.archivo.size
            except Exception:
                self.size = None
        if not self.nombre and self.archivo:
            self.nombre = self.archivo.name
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre or f"Document {self.id}"


class Channel(models.Model):
    nombre = models.CharField(max_length=200)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, null=True, blank=True, related_name='channels')
    is_private = models.BooleanField(default=False)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='channels')

    def __str__(self):
        return self.nombre


class Message(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    contenido = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at',)

    def __str__(self):
        return f"Msg by {self.sender} @ {self.created_at}"


class GoogleCredential(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='google_credential')
    token_json = models.TextField(blank=True, null=True)
    refresh_token = models.CharField(max_length=400, blank=True, null=True)
    scope = models.CharField(max_length=400, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"GoogleCredential: {self.user.username}"

    # Optional transparent encryption for token storage using cryptography.Fernet
    def save(self, *args, **kwargs):
        # If cryptography available and an encryption key configured, encrypt token_json before saving
        key = os.environ.get('GOOGLE_TOKEN_ENCRYPTION_KEY')
        if not key:
            # fallback to derive from SECRET_KEY (not ideal for production)
            try:
                from django.conf import settings as djsettings
                raw = getattr(djsettings, 'SECRET_KEY', None)
                if raw:
                    # use first 32 bytes base64 urlsafe; ensure bytes
                    import base64, hashlib
                    k = hashlib.sha256(raw.encode('utf-8')).digest()
                    key = base64.urlsafe_b64encode(k)
            except Exception:
                key = None

        if key and self.token_json:
            try:
                from cryptography.fernet import Fernet
                # ensure key is bytes
                if isinstance(key, str):
                    key_b = key.encode('utf-8')
                else:
                    key_b = key
                f = Fernet(key_b)
                # Only encrypt if looks like plaintext JSON (simple heuristic)
                if not self.token_json.startswith('gAAAA'):
                    self.token_json = f.encrypt(self.token_json.encode('utf-8')).decode('utf-8')
            except Exception:
                # cryptography not installed or encryption failed — skip
                pass

        super().save(*args, **kwargs)

    def get_token_json_decrypted(self):
        # Return decrypted token_json if possible
        val = self.token_json
        if not val:
            return None
        key = os.environ.get('GOOGLE_TOKEN_ENCRYPTION_KEY')
        if not key:
            try:
                from django.conf import settings as djsettings
                raw = getattr(djsettings, 'SECRET_KEY', None)
                if raw:
                    import base64, hashlib
                    k = hashlib.sha256(raw.encode('utf-8')).digest()
                    key = base64.urlsafe_b64encode(k)
            except Exception:
                key = None
        if key:
            try:
                from cryptography.fernet import Fernet
                if isinstance(key, str):
                    key_b = key.encode('utf-8')
                else:
                    key_b = key
                f = Fernet(key_b)
                # try decrypt
                dec = f.decrypt(val.encode('utf-8')).decode('utf-8')
                return dec
            except Exception:
                # not encrypted or decryption failed, return raw
                return val
        return val


class OAuthState(models.Model):
    state = models.CharField(max_length=128, primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"State for {self.user.username}: {self.state}"
