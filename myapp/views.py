from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status as http_status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Contract, Review, SkateSpot, StatusChoices, sync_contract_to_spot
from .serializers import ContractSerializer, ReviewSerializer, SkateSpotSerializer


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
        serializer.save(status=StatusChoices.PENDING, reviewed_at=None)


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
        serializer.save(spot_id=self.kwargs['pk'])


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
