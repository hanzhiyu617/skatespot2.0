from django.urls import re_path

from .models import StatusChoices
from .views import (
    GeocodeView,
    LoginView,
    ProfileView,
    RegisterView,
    ReviewListCreate,
    SkateSpotList,
    VenueAppApprovedList,
    VenueAppListCreate,
    VenueAppStatusUpdate,
)

approve_view = VenueAppStatusUpdate.as_view(target_status=StatusChoices.APPROVED)
reject_view = VenueAppStatusUpdate.as_view(target_status=StatusChoices.REJECTED)

urlpatterns = [
    re_path(r'^spots/?$', SkateSpotList.as_view(), name='spot-list'),
    re_path(r'^spots/(?P<pk>\d+)/reviews/?$', ReviewListCreate.as_view(), name='review-list'),
    re_path(r'^venue-apps/?$', VenueAppListCreate.as_view(), name='venue-app-list'),
    re_path(r'^venue-apps/approved/?$', VenueAppApprovedList.as_view(), name='venue-app-approved-list'),
    re_path(r'^venue-apps/(?P<pk>\d+)/approve/?$', approve_view, name='venue-app-approve'),
    re_path(r'^venue-apps/(?P<pk>\d+)/reject/?$', reject_view, name='venue-app-reject'),
    re_path(r'^profile/?$', ProfileView.as_view(), name='profile'),
    re_path(r'^profile/register/?$', RegisterView.as_view(), name='profile-register'),
    re_path(r'^profile/login/?$', LoginView.as_view(), name='profile-login'),
    re_path(r'^geocode/?$', GeocodeView.as_view(), name='geocode'),
]
