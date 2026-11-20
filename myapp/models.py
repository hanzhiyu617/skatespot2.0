import base64
import hashlib
import html
import mimetypes
import random

from django.conf import settings
from django.db import models


AVATAR_COLORS = [
    '#D4AF37', '#171717', '#4F6BED', '#E07A5F', '#3D8B72',
    '#9B5DE5', '#F4A261', '#2A9D8F', '#E63946', '#457B9D',
]

NAME_PREFIXES = ['闪电', '蓝色', '快乐', '斜坡', '夜行', '火山', '追风', '小麦', '极光', '街头']
NAME_SUFFIXES = ['滑手', '板仔', '海鸥', '山川', '狐狸', '影子', '火箭', '旅人', '陀螺', '玩家']


def random_display_name():
    return '{}{}{}'.format(
        random.choice(NAME_PREFIXES),
        random.choice(NAME_SUFFIXES),
        random.randint(10, 99),
    )


def default_avatar(name, seed=''):
    """Deterministic identicon SVG data URL, no external service required."""
    label = (name or '?').strip()
    parts = label.split()
    initials = ''.join(part[0] for part in parts[:2]).upper() or label[:1].upper() or '?'
    digest = hashlib.md5((seed or label).encode('utf-8')).hexdigest()
    start = AVATAR_COLORS[int(digest[0], 16) % len(AVATAR_COLORS)]
    end = AVATAR_COLORS[int(digest[1], 16) % len(AVATAR_COLORS)]
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">'
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        '<stop offset="0" stop-color="{start}"/><stop offset="1" stop-color="{end}"/>'
        '</linearGradient></defs>'
        '<rect width="96" height="96" rx="24" fill="url(#g)"/>'
        '<text x="48" y="48" fill="#fff" font-family="Arial,sans-serif" font-size="36" '
        'font-weight="700" text-anchor="middle" dominant-baseline="central">{initials}</text>'
        '</svg>'
    ).format(start=start, end=end, initials=html.escape(initials))
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode('ascii')


def refresh_image_data(instance):
    """Regenerate base64 when the image was added or replaced. Returns True if changed."""
    previous_name = None
    if instance.pk:
        previous_name = (
            type(instance).objects.filter(pk=instance.pk)
            .values_list('image', flat=True).first()
        )
    current_name = instance.image.name if instance.image else None
    if previous_name != current_name:
        instance.image_data = image_to_data_url(instance.image) if instance.image else ''
        return True
    return False


def image_url_for(instance):
    """Prefer embedded base64; add a version query for media URLs to bust caches."""
    if instance.image_data:
        return instance.image_data
    if instance.image:
        url = instance.image.url
        version = getattr(instance, 'updated_at', None) or getattr(instance, 'submitted_at', None)
        if version:
            return '{}?v={}'.format(url, int(version.timestamp()))
        return url
    return None


def image_to_data_url(image_field):
    """Read an ImageField and return a base64 data URL that survives redeploys."""
    if not image_field:
        return ''
    try:
        try:
            image_field.seek(0)
            content = image_field.read()
        except (ValueError, OSError, AttributeError):
            image_field.open('rb')
            content = image_field.read()
        if not content:
            return ''
        mime = mimetypes.guess_type(image_field.name)[0] or 'image/jpeg'
        return 'data:{};base64,{}'.format(mime, base64.b64encode(content).decode('ascii'))
    except Exception:
        return ''


class CityChoices(models.TextChoices):
    SEOUL = 'Seoul', '首尔 / Seoul'
    BUSAN = 'Busan', '釜山 / Busan'
    INCHEON = 'Incheon', '仁川 / Incheon'
    DAEJEON = 'Daejeon', '大田 / Daejeon'
    DAEGU = 'Daegu', '大邱 / Daegu'
    GWANGJU = 'Gwangju', '光州 / Gwangju'
    ULSAN = 'Ulsan', '蔚山 / Ulsan'
    SEJONG = 'Sejong', '世宗 / Sejong'
    GYEONGGI = 'Gyeonggi', '京畿道 / Gyeonggi'
    GANGWON = 'Gangwon', '江原道 / Gangwon'
    CHUNGBUK = 'Chungbuk', '忠清北道 / Chungbuk'
    CHUNGNAM = 'Chungnam', '忠清南道 / Chungnam'
    JEONBUK = 'Jeonbuk', '全罗北道 / Jeonbuk'
    JEONNAM = 'Jeonnam', '全罗南道 / Jeonnam'
    GYEONGBUK = 'Gyeongbuk', '庆尚北道 / Gyeongbuk'
    GYEONGNAM = 'Gyeongnam', '庆尚南道 / Gyeongnam'
    JEJU = 'Jeju', '济州 / Jeju'


class VenueType(models.TextChoices):
    INDOOR = 'indoor', '室内滑板场'
    OUTDOOR = 'outdoor', '室外滑板场'
    STREET = 'street', '街头场地'


class TerrainChoices(models.TextChoices):
    LEDGE = 'ledge', '小台阶 Ledge'
    BANK = 'bank', '抛台 Bank'
    BOWL = 'bowl', 'U池 Bowl'
    RAIL = 'rail', '扶手 Handrail'
    FLAT = 'flat', '平地 Flatground'


class StatusChoices(models.TextChoices):
    PENDING = 'pending', '待审核'
    APPROVED = 'approved', '已通过'
    REJECTED = 'rejected', '已拒绝'


class PriceUnitChoices(models.TextChoices):
    SESSION = 'session', '次'
    HOUR = 'hour', '小时'
    DAY = 'day', '天'


class Contract(models.Model):
    name = models.CharField('场地名称', max_length=200)
    korean_name = models.CharField(
        '韩文名称（用于 Naver 导航，可选）', max_length=200, blank=True
    )
    city = models.CharField('城市', max_length=50, choices=CityChoices.choices)
    district = models.CharField('行政区', max_length=100)
    venue_type = models.CharField(
        '场地类型', max_length=20, choices=VenueType.choices
    )
    latitude = models.FloatField('纬度（地图选点）')
    longitude = models.FloatField('经度（地图选点）')
    terrains = models.CharField(
        '包含地形', max_length=255, blank=True,
        help_text='多个地形用英文逗号分隔，例如 ledge,bank,bowl',
    )
    price = models.CharField('价格金额', max_length=50, blank=True)
    price_unit = models.CharField(
        '计费单位', max_length=20, choices=PriceUnitChoices.choices,
        default=PriceUnitChoices.SESSION, blank=True,
    )
    review = models.TextField('个人评价', blank=True)
    submitter_name = models.CharField('提交人', max_length=100, blank=True, default='')
    submitter_uid = models.CharField('提交人设备标识', max_length=64, blank=True, default='')
    image = models.ImageField(
        '上传图片', upload_to='venue_apps/%Y/%m/%d/', blank=True, null=True
    )
    image_data = models.TextField('图片数据（Base64）', blank=True)
    status = models.CharField(
        '状态', max_length=20, choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
    )
    submitted_at = models.DateTimeField('提交时间', auto_now_add=True)
    reviewed_at = models.DateTimeField('审核时间', null=True, blank=True)

    class Meta:
        db_table = 'contract'
        verbose_name = '场地申请'
        verbose_name_plural = '场地申请'
        ordering = ['-submitted_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        refresh_image_data(self)
        super().save(*args, **kwargs)

    def terrain_labels(self):
        labels = dict(TerrainChoices.choices)
        values = [item.strip() for item in self.terrains.split(',') if item.strip()]
        return ', '.join(labels.get(value, value) for value in values)


class SkateSpot(models.Model):
    name = models.CharField('场地名称', max_length=200)
    korean_name = models.CharField(
        '韩文名称（用于 Naver 导航，可选）', max_length=200, blank=True
    )
    city = models.CharField('城市', max_length=50, choices=CityChoices.choices)
    district = models.CharField('行政区', max_length=100)
    address = models.CharField('详细地址', max_length=300, blank=True)
    venue_type = models.CharField(
        '场地类型', max_length=20, choices=VenueType.choices
    )
    latitude = models.FloatField('纬度')
    longitude = models.FloatField('经度')
    terrains = models.CharField(
        '包含地形', max_length=255, blank=True,
        help_text='多个地形用英文逗号分隔，例如 ledge,bank,bowl',
    )
    price = models.CharField('价格金额', max_length=50, blank=True)
    price_unit = models.CharField(
        '计费单位', max_length=20, choices=PriceUnitChoices.choices,
        default=PriceUnitChoices.SESSION, blank=True,
    )
    review = models.TextField('场地介绍 / 评价', blank=True)
    image = models.ImageField(
        '场地图片', upload_to='spots/%Y/%m/%d/', blank=True, null=True
    )
    image_data = models.TextField('图片数据（Base64）', blank=True)
    is_active = models.BooleanField('前台展示', default=True)
    contract = models.OneToOneField(
        Contract, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='spot', verbose_name='来源申请',
    )
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'skatespot'
        verbose_name = '滑板场地'
        verbose_name_plural = '滑板场地'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        refresh_image_data(self)
        super().save(*args, **kwargs)

    def terrain_labels(self):
        labels = dict(TerrainChoices.choices)
        values = [item.strip() for item in self.terrains.split(',') if item.strip()]
        return ', '.join(labels.get(value, value) for value in values)


class Review(models.Model):
    spot = models.ForeignKey(
        SkateSpot, related_name='reviews', on_delete=models.CASCADE,
        verbose_name='场地',
    )
    author = models.CharField('昵称', max_length=100, default='滑手')
    author_uid = models.CharField('评价人设备标识', max_length=64, blank=True, default='')
    author_avatar = models.TextField('评价人头像', blank=True, default='')
    text = models.TextField('评价内容')
    image = models.ImageField(
        '评价图片', upload_to='reviews/%Y/%m/%d/', blank=True, null=True
    )
    image_data = models.TextField('图片数据（Base64）', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        db_table = 'review'
        verbose_name = '场地评价'
        verbose_name_plural = '场地评价'
        ordering = ['-created_at']

    def __str__(self):
        return '{} - {}'.format(self.spot.name, self.author)

    def save(self, *args, **kwargs):
        refresh_image_data(self)
        super().save(*args, **kwargs)


class Profile(models.Model):
    """Device-bound lightweight identity, optionally linked to a Django auth user."""
    uid = models.CharField('设备标识', max_length=64, unique=True)
    name = models.CharField('昵称', max_length=100, blank=True)
    avatar_data = models.TextField('头像数据', blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='skatespot_profiles',
        verbose_name='关联账号',
    )
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        db_table = 'profile'
        verbose_name = '用户身份'
        verbose_name_plural = '用户身份'

    def __str__(self):
        return self.name or self.uid

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = random_display_name()
        if not self.avatar_data:
            self.avatar_data = default_avatar(self.name, self.uid)
        super().save(*args, **kwargs)


def sync_contract_to_spot(contract):
    if contract.status == StatusChoices.APPROVED:
        spot = SkateSpot.objects.filter(contract=contract).first()
        if spot is None:
            spot = SkateSpot(contract=contract)
        spot.name = contract.name
        spot.korean_name = contract.korean_name
        spot.city = contract.city
        spot.district = contract.district
        spot.address = f'{contract.get_city_display()} · {contract.district}'
        spot.venue_type = contract.venue_type
        spot.latitude = contract.latitude
        spot.longitude = contract.longitude
        spot.terrains = contract.terrains
        spot.price = contract.price
        spot.price_unit = contract.price_unit
        spot.review = contract.review
        spot.image = contract.image
        spot.image_data = contract.image_data
        spot.is_active = True
        spot.save()
    else:
        SkateSpot.objects.filter(contract=contract).delete()
