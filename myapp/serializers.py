from rest_framework import serializers

from .models import Contract, SkateSpot


class ContractSerializer(serializers.ModelSerializer):
    terrain_labels = serializers.CharField(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            'id',
            'name',
            'korean_name',
            'city',
            'district',
            'venue_type',
            'latitude',
            'longitude',
            'terrains',
            'terrain_labels',
            'review',
            'image',
            'image_url',
            'status',
            'submitted_at',
            'reviewed_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'submitted_at',
            'reviewed_at',
            'terrain_labels',
            'image_url',
        ]

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None


class SkateSpotSerializer(serializers.ModelSerializer):
    terrain_labels = serializers.CharField(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SkateSpot
        fields = [
            'id',
            'name',
            'korean_name',
            'city',
            'district',
            'address',
            'venue_type',
            'latitude',
            'longitude',
            'terrains',
            'terrain_labels',
            'price',
            'price_unit',
            'review',
            'image',
            'image_url',
            'is_active',
            'created_at',
            'updated_at',
        ]

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None
