from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Contract, Profile, Review, SkateSpot, image_url_for


class ContractSerializer(serializers.ModelSerializer):
    terrain_labels = serializers.CharField(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = [
            'id', 'name', 'korean_name', 'city', 'district', 'venue_type',
            'latitude', 'longitude', 'terrains', 'terrain_labels', 'price',
            'price_unit', 'review', 'submitter_name', 'submitter_uid',
            'image', 'image_url', 'status', 'submitted_at', 'reviewed_at',
        ]
        read_only_fields = [
            'id', 'status', 'submitted_at', 'reviewed_at',
            'terrain_labels', 'image_url',
        ]

    def get_image_url(self, obj):
        return image_url_for(obj)


class ReviewSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'spot', 'author', 'author_uid', 'author_avatar',
            'text', 'image', 'image_url', 'created_at',
        ]
        read_only_fields = ['id', 'spot', 'image_url', 'created_at']

    def get_image_url(self, obj):
        return image_url_for(obj)


class SkateSpotSerializer(serializers.ModelSerializer):
    terrain_labels = serializers.CharField(read_only=True)
    image_url = serializers.SerializerMethodField()
    reviews = ReviewSerializer(many=True, read_only=True)

    class Meta:
        model = SkateSpot
        fields = [
            'id', 'name', 'korean_name', 'city', 'district', 'address',
            'venue_type', 'latitude', 'longitude', 'terrains', 'terrain_labels',
            'price', 'price_unit', 'review', 'image', 'image_url',
            'is_active', 'reviews', 'created_at', 'updated_at',
        ]

    def get_image_url(self, obj):
        return image_url_for(obj)


class ProfileSerializer(serializers.ModelSerializer):
    is_registered = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'uid', 'name', 'avatar_data', 'is_registered', 'username',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['uid', 'is_registered', 'username', 'created_at', 'updated_at']

    def get_is_registered(self, obj):
        return bool(obj.user_id)

    def get_username(self, obj):
        return obj.user.username if obj.user else ''


class RegisterSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=64)
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=4, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('该用户名已被注册')
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
        )
        profile, _ = Profile.objects.get_or_create(uid=validated_data['uid'])
        profile.user = user
        profile.save()
        return profile


class LoginSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=64)
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs['username'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('用户名或密码不正确')
        attrs['user'] = user
        return attrs
