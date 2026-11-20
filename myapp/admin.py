from django.contrib import admin

from .models import Contract, Profile, Review, SkateSpot, sync_contract_to_spot


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'korean_name',
        'city',
        'district',
        'venue_type',
        'latitude',
        'longitude',
        'terrain_labels',
        'review',
        'image',
        'status',
        'submitted_at',
    )
    list_editable = ('status',)
    list_filter = ('status', 'city', 'venue_type', 'submitted_at')
    search_fields = ('name', 'korean_name', 'district', 'review')
    readonly_fields = ('submitted_at', 'reviewed_at')
    date_hierarchy = 'submitted_at'
    ordering = ('-submitted_at',)

    fieldsets = (
        ('场地信息', {
            'fields': (
                'name', 'korean_name', 'city', 'district', 'venue_type',
                'latitude', 'longitude', 'terrains', 'price', 'price_unit',
                'image', 'review', 'submitter_name', 'submitter_uid',
            )
        }),
        ('审核', {
            'fields': ('status', 'reviewed_at', 'submitted_at'),
        }),
    )

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        sync_contract_to_spot(obj)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('spot', 'author', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('author', 'text', 'spot__name')
    readonly_fields = ('created_at',)

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'uid', 'user', 'updated_at')
    search_fields = ('name', 'uid', 'user__username')
    readonly_fields = ('created_at', 'updated_at')

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(SkateSpot)
class SkateSpotAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'korean_name',
        'city',
        'district',
        'venue_type',
        'latitude',
        'longitude',
        'terrain_labels',
        'price',
        'price_unit',
        'is_active',
        'updated_at',
    )
    list_editable = ('is_active',)
    list_filter = ('is_active', 'city', 'venue_type', 'price_unit')
    search_fields = ('name', 'korean_name', 'district', 'address', 'review')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    fieldsets = (
        ('基本信息', {
            'fields': (
                'name', 'korean_name', 'city', 'district', 'address',
                'venue_type', 'latitude', 'longitude', 'image',
            )
        }),
        ('场地配置', {
            'fields': ('terrains', 'price', 'price_unit', 'review'),
        }),
        ('发布与来源', {
            'fields': ('is_active', 'contract', 'created_at', 'updated_at'),
        }),
    )

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
