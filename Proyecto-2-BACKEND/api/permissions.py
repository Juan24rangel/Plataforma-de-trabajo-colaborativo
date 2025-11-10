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


class RoleBasedPermission(permissions.BasePermission):
    """Permission that enforces role-based rules on objects related to a Team.

    Rules (sensible defaults):
    - SAFE_METHODS (GET, HEAD, OPTIONS) are allowed for authenticated users.
    - CREATE is allowed for authenticated users (object-level checks may apply after create).
    - For unsafe methods (PUT/PATCH/DELETE):
        - staff / superuser allowed
        - team.owner allowed
        - users with a Membership role 'admin' (or owner) for that team allowed
        - object owners/creators allowed when applicable
    This class tries to infer the related team from the object (obj.team) or by
    detecting Team instances. It falls back to checking owner/creador fields.
    """

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        # Allow safe methods for anyone (object-level will further restrict if needed)
        if request.method in permissions.SAFE_METHODS:
            return True
        # Must be authenticated for unsafe methods
        user = request.user if hasattr(request, 'user') else None
        if not user or not user.is_authenticated:
            return False
        # Allow create for authenticated users (perform_create typically enforces more)
        if view.action in ('create',):
            return True
        # Otherwise, defer to object-level permission
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        # Staff or superuser may do anything
        if user.is_staff or user.is_superuser:
            return True

        # If object is a Team instance (has owner and memberships manager)
        team = None
        if hasattr(obj, 'memberships') and hasattr(obj, 'owner'):
            team = obj

        # Otherwise try to read a .team attribute
        if team is None:
            team = getattr(obj, 'team', None)

        # If we found a team, check ownership or membership role
        if team is not None:
            try:
                if getattr(team, 'owner', None) == user:
                    return True
            except Exception:
                pass
            return Membership.objects.filter(team=team, user=user, role__in=('admin', 'owner')).exists()

        # Fallback: check common owner-like attributes
        owner = getattr(obj, 'owner', None) or getattr(obj, 'creador', None) or getattr(obj, 'user', None)
        if owner is not None:
            return owner == user

        # If nothing matches, deny
        return False
