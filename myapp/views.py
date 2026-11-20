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
