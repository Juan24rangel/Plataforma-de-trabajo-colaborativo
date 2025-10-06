from django.core.management.base import BaseCommand
from api.models import Membership
from collections import defaultdict


class Command(BaseCommand):
    help = 'Detect and optionally remove invalid or duplicate memberships. Use --yes to apply deletions.'

    def add_arguments(self, parser):
        parser.add_argument('--yes', action='store_true', help='Apply deletions')

    def handle(self, *args, **options):
        apply = options.get('yes')
        to_delete = []

        # Find memberships with missing user or team
        for m in Membership.objects.all():
            if m.user_id is None or m.team_id is None:
                to_delete.append((m.id, 'missing_user_or_team'))

        # Find duplicates (shouldn't exist due to unique_together but just in case)
        seen = defaultdict(list)
        for m in Membership.objects.all():
            key = (m.user_id, m.team_id)
            seen[key].append(m.id)
        for key, ids in seen.items():
            if len(ids) > 1:
                # keep the first, delete the rest
                for dup_id in ids[1:]:
                    to_delete.append((dup_id, 'duplicate'))

        if not to_delete:
            self.stdout.write(self.style.SUCCESS('No invalid or duplicate memberships found.'))
            return

        self.stdout.write(self.style.WARNING(f'Found {len(to_delete)} problematic memberships:'))
        for mid, reason in to_delete:
            self.stdout.write(f' - id {mid}: {reason}')

        if not apply:
            self.stdout.write('Dry run complete. Re-run with --yes to delete these memberships.')
            return

        # Apply deletions
        for mid, reason in to_delete:
            try:
                Membership.objects.filter(id=mid).delete()
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Failed to delete {mid}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'Deleted {len(to_delete)} memberships'))
