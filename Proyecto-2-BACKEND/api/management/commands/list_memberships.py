from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Membership
import csv


class Command(BaseCommand):
    help = 'List memberships grouped by user. Options: --user USERNAME, --csv FILEPATH'

    def add_arguments(self, parser):
        parser.add_argument('--user', type=str, help='Filter memberships for a specific username')
        parser.add_argument('--csv', type=str, help='Write output to CSV file path')

    def handle(self, *args, **options):
        username = options.get('user')
        csv_path = options.get('csv')

        qs = Membership.objects.select_related('user', 'team').order_by('user__username', 'team__nombre')
        if username:
            qs = qs.filter(user__username=username)

        # Prepare rows
        rows = []
        for m in qs:
            rows.append({
                'username': m.user.username if m.user else '<none>',
                'user_id': m.user.id if m.user else '',
                'team': m.team.nombre if m.team else '<none>',
                'team_id': m.team.id if m.team else '',
                'role': m.role,
                'date_joined': m.date_joined.isoformat() if m.date_joined else '',
            })

        if csv_path:
            fieldnames = ['username', 'user_id', 'team', 'team_id', 'role', 'date_joined']
            try:
                with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writeheader()
                    for r in rows:
                        writer.writerow(r)
                self.stdout.write(self.style.SUCCESS(f'Wrote {len(rows)} rows to {csv_path}'))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Error writing CSV: {e}'))
            return

        # Print grouped by user
        current = None
        for r in rows:
            if r['username'] != current:
                current = r['username']
                self.stdout.write(self.style.MIGRATE_HEADING(f'User: {current} (id: {r.get("user_id")})'))
            self.stdout.write(f"  - Team: {r['team']} (id: {r.get('team_id')}) — role: {r['role']} — joined: {r['date_joined']}")

        if not rows:
            self.stdout.write('No memberships found.')
