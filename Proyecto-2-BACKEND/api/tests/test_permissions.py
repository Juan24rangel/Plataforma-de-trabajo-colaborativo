from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from ..models import Team, Membership, Task


User = get_user_model()


class PermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # users
        self.owner = User.objects.create_user(username='owner', password='pass')
        self.admin = User.objects.create_user(username='admin', password='pass')
        self.member = User.objects.create_user(username='member', password='pass')
        self.other = User.objects.create_user(username='other', password='pass')

        # team owned by owner
        self.team = Team.objects.create(nombre='Team A', descripcion='X', owner=self.owner)

        # memberships
        Membership.objects.create(user=self.owner, team=self.team, role='admin')
        Membership.objects.create(user=self.admin, team=self.team, role='admin')
        Membership.objects.create(user=self.member, team=self.team, role='member')

        # a task
        self.task = Task.objects.create(titulo='T1', descripcion='foo', creador=self.owner, team=self.team)

    def test_member_cannot_edit_task(self):
        self.client.force_authenticate(self.member)
        url = f'/api/tasks/{self.task.id}/'
        res = self.client.patch(url, {'titulo': 'Changed'}, format='json')
        self.assertIn(res.status_code, (403, 404, 401))

    def test_admin_can_edit_task(self):
        self.client.force_authenticate(self.admin)
        url = f'/api/tasks/{self.task.id}/'
        res = self.client.patch(url, {'titulo': 'Changed by admin'}, format='json')
        self.assertIn(res.status_code, (200, 202))
        self.task.refresh_from_db()
        self.assertEqual(self.task.titulo, 'Changed by admin')

    def test_owner_can_delete_task(self):
        self.client.force_authenticate(self.owner)
        url = f'/api/tasks/{self.task.id}/'
        res = self.client.delete(url)
        self.assertIn(res.status_code, (204, 200))
        # task should not exist
        with self.assertRaises(Task.DoesNotExist):
            Task.objects.get(id=self.task.id)

    def test_other_cannot_delete_task(self):
        self.client.force_authenticate(self.other)
        url = f'/api/tasks/{self.task.id}/'
        res = self.client.delete(url)
        self.assertIn(res.status_code, (403, 404, 401))
