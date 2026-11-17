from django.urls import re_path

from .models import StatusChoices
from .views import (
    SkateSpotList,
    VenueAppApprovedList,
    VenueAppListCreate,
    VenueAppStatusUpdate,
)

approve_view = VenueAppStatusUpdate.as_view(target_status=StatusChoices.APPROVED)
reject_view = VenueAppStatusUpdate.as_view(target_status=StatusChoices.REJECTED)

urlpatterns = [
    re_path(r'^spots/?$', SkateSpotList.as_view(), name='spot-list'),
    re_path(r'^venue-apps/?$', VenueAppListCreate.as_view(), name='venue-app-list'),
    re_path(r'^venue-apps/approved/?$', VenueAppApprovedList.as_view(), name='venue-app-approved-list'),
    re_path(r'^venue-apps/(?P<pk>\d+)/approve/?$', approve_view, name='venue-app-approve'),
    re_path(r'^venue-apps/(?P<pk>\d+)/reject/?$', reject_view, name='venue-app-reject'),
]
