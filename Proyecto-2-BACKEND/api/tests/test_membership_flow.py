from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth.models import User


class MembershipFlowTest(APITestCase):
    def test_register_create_team_and_join(self):
        # Register a user via the register view
        url = reverse('register')
        data = {'username': 'alice', 'password': 'Password123!'}
        resp = self.client.post(url, data, format='json')
        self.assertEqual(resp.status_code, 201)
        # obtain tokens
        tokens = resp.data.get('tokens')
        self.assertIn('access', tokens)
        access = tokens['access']

        # Use token to create a team
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        resp = self.client.post('/api/teams/', {'nombre': 'Equipo A', 'descripcion': 'Test'}, format='json')
        self.assertEqual(resp.status_code, 201)
        team = resp.data
        self.assertIn('id', team)

        # Register another user Bob
        resp2 = self.client.post(url, {'username': 'bob', 'password': 'Password123!'}, format='json')
        self.assertEqual(resp2.status_code, 201)
        bob_tokens = resp2.data.get('tokens')
        bob_access = bob_tokens['access']

        # Bob joins the team
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {bob_access}')
        resp3 = self.client.post('/api/memberships/', {'team': team['id']}, format='json')
        self.assertIn(resp3.status_code, (200,201))
        self.assertEqual(resp3.data['team'], team['id'])
        self.assertEqual(resp3.data['role'], 'member')
