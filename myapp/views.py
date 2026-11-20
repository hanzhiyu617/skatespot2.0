import json
import os
import urllib.parse
import urllib.request

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status as http_status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Contract, Profile, Review, SkateSpot, StatusChoices, sync_contract_to_spot,
)
from .serializers import (
    ContractSerializer, LoginSerializer, ProfileSerializer, RegisterSerializer,
    ReviewSerializer, SkateSpotSerializer,
)

KOREA_BOUNDS = {'min_lat': 33.0, 'max_lat': 38.7, 'min_lng': 124.5, 'max_lng': 130.5}


def _in_korea(lat, lng):
    return (
        KOREA_BOUNDS['min_lat'] <= lat <= KOREA_BOUNDS['max_lat']
        and KOREA_BOUNDS['min_lng'] <= lng <= KOREA_BOUNDS['max_lng']
    )


class GeocodeView(APIView):
    """Server-side geocoding proxy. Kakao Local is primary (great Korea POI coverage),
    with Nominatim as a fallback. Keeps the Kakao key off the browser."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = (request.query_params.get('q') or '').strip()
        if not query:
            return Response([])
        results = []
        kakao_key = os.environ.get('KAKAO_REST_API_KEY', '')
        if kakao_key:
            results = self._kakao(query, kakao_key)
        if not results:
            results = self._nominatim(query)
        return Response(results[:8])

    def _kakao(self, query, key):
        try:
            url = 'https://dapi.kakao.com/v2/local/search/keyword.json?query={}&size=8'.format(
                urllib.parse.quote(query)
            )
            req = urllib.request.Request(url, headers={'Authorization': 'KakaoAK {}'.format(key)})
            with urllib.request.urlopen(req, timeout=8) as response:
                data = json.loads(response.read().decode('utf-8'))
            results = []
            for doc in data.get('documents', []):
                lat, lng = float(doc['y']), float(doc['x'])
                if not _in_korea(lat, lng):
                    continue
                label = doc.get('place_name') or query
                address = doc.get('road_address_name') or doc.get('address_name')
                if address:
                    label = '{} · {}'.format(label, address)
                results.append({'lat': lat, 'lng': lng, 'label': label})
            return results
        except Exception:
            return []

    def _nominatim(self, query):
        try:
            params = urllib.parse.urlencode({
                'format': 'jsonv2',
                'q': query,
                'limit': 8,
                'accept-language': 'ko',
                'countrycodes': 'kr',
                'viewbox': '{},{},{},{}'.format(
                    KOREA_BOUNDS['min_lng'], KOREA_BOUNDS['max_lat'],
                    KOREA_BOUNDS['max_lng'], KOREA_BOUNDS['min_lat'],
                ),
                'bounded': 1,
            })
            url = 'https://nominatim.openstreetmap.org/search?' + params
            req = urllib.request.Request(url, headers={
                'User-Agent': 'SkatespotMap/1.0 (contact@skatespot.app)',
            })
            with urllib.request.urlopen(req, timeout=8) as response:
                data = json.loads(response.read().decode('utf-8'))
            results = []
            for item in data:
                lat, lng = float(item['lat']), float(item['lon'])
                if not _in_korea(lat, lng):
                    continue
                results.append({
                    'lat': lat, 'lng': lng,
                    'label': item.get('display_name') or query,
                })
            return results
        except Exception:
            return []


class VenueAppListCreate(generics.ListCreateAPIView):
    serializer_class = ContractSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        return Contract.objects.all()

    def perform_create(self, serializer):
        serializer.save(
            status=StatusChoices.PENDING,
            reviewed_at=None,
            submitter_name=self.request.data.get('submitter_name', ''),
            submitter_uid=self.request.data.get('submitter_uid', ''),
        )


class VenueAppApprovedList(generics.ListAPIView):
    serializer_class = ContractSerializer
    permission_classes = [permissions.AllowAny]
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        return Contract.objects.filter(status=StatusChoices.APPROVED)


class SkateSpotList(generics.ListAPIView):
    serializer_class = SkateSpotSerializer
    permission_classes = [permissions.AllowAny]
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        return SkateSpot.objects.filter(is_active=True)


class ReviewListCreate(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return Review.objects.filter(spot_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        serializer.save(
            spot_id=self.kwargs['pk'],
            author_uid=self.request.data.get('author_uid', ''),
            author_avatar=self.request.data.get('author_avatar', ''),
        )


class ProfileView(APIView):
    """Get or create a device-bound identity, and update name/avatar."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        uid = request.query_params.get('uid', '')
        if not uid:
            return Response({'detail': '缺少设备标识'}, status=http_status.HTTP_400_BAD_REQUEST)
        profile, _ = Profile.objects.get_or_create(uid=uid)
        return Response(ProfileSerializer(profile).data)

    def patch(self, request):
        uid = request.data.get('uid', '')
        if not uid:
            return Response({'detail': '缺少设备标识'}, status=http_status.HTTP_400_BAD_REQUEST)
        profile, _ = Profile.objects.get_or_create(uid=uid)
        name = request.data.get('name')
        avatar = request.data.get('avatar_data')
        if name is not None:
            profile.name = str(name)[:100] or profile.name
        if avatar is not None:
            profile.avatar_data = avatar
        profile.save()
        return Response(ProfileSerializer(profile).data)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(ProfileSerializer(profile).data, status=http_status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        profile, _ = Profile.objects.get_or_create(uid=serializer.validated_data['uid'])
        profile.user = user
        if serializer.validated_data['username'] and not profile.name:
            profile.name = user.username
        profile.save()
        return Response(ProfileSerializer(profile).data)


class VenueAppStatusUpdate(APIView):
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['patch']

    target_status = None

    def patch(self, request, pk):
        obj = get_object_or_404(Contract, pk=pk)
        obj.status = self.target_status
        obj.reviewed_at = timezone.now()
        obj.save(update_fields=['status', 'reviewed_at'])
        sync_contract_to_spot(obj)
        serializer = ContractSerializer(obj, context={'request': request})
        return Response(serializer.data, status=http_status.HTTP_200_OK)
