from rest_framework import permissions
from .models import Membership


class IsTeamAdmin(permissions.BasePermission):
    """Allow access only to users who are admins of the related team.

    This permission expects the object to be a Membership (or have a .team attribute).
    It is intended for object-level checks on membership actions (promote/demote/remove).
    """

    message = 'Only team admins can perform this action.'

    def has_permission(self, request, view):
        # Allow the view to decide at object level
        return True

    def has_object_permission(self, request, view, obj):
        team = getattr(obj, 'team', None)
        if team is None:
            return False
        return Membership.objects.filter(team=team, user=request.user, role='admin').exists()
