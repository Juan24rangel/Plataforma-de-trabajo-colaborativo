from django.urls import path
from . import views
from . import auth_views

urlpatterns = [
    path('register/', auth_views.register, name='register'),
]


# Router-based API
from rest_framework import routers
from django.urls import include, path

router = routers.DefaultRouter()
router.register(r'teams', views.TeamViewSet)
router.register(r'memberships', views.MembershipViewSet)
router.register(r'tasks', views.TaskViewSet)
router.register(r'events', views.EventViewSet)
router.register(r'documents', views.DocumentViewSet)
router.register(r'profiles', views.ProfileViewSet)
router.register(r'tags', views.TagViewSet)
router.register(r'channels', views.ChannelViewSet)
router.register(r'messages', views.MessageViewSet)

urlpatterns += [
    path('', include(router.urls)),
    path('user/', views.CurrentUserView.as_view(), name='current-user'),
    path('admin/stats/', views.AdminStatsView.as_view(), name='admin-stats'),
    path('calendar/connect/', views.CalendarConnectView.as_view(), name='calendar-connect'),
    path('calendar/callback/', views.CalendarCallbackView.as_view(), name='calendar-callback'),
    path('calendar/status/', views.CalendarStatusView.as_view(), name='calendar-status'),
    path('calendar/calendars/', views.CalendarListView.as_view(), name='calendar-list'),
    path('calendar/teams/<int:team_id>/publish_event/', views.CalendarPublishView.as_view(), name='calendar-publish'),
]
