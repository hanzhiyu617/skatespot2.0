from django.db import models


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
    review = models.TextField('个人评价', blank=True)
    image = models.ImageField(
        '上传图片', upload_to='venue_apps/%Y/%m/%d/', blank=True, null=True
    )
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

    def terrain_labels(self):
        labels = dict(TerrainChoices.choices)
        values = [item.strip() for item in self.terrains.split(',') if item.strip()]
        return ', '.join(labels.get(value, value) for value in values)


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
        spot.review = contract.review
        if contract.image:
            spot.image = contract.image
        spot.is_active = True
        spot.save()
    else:
        SkateSpot.objects.filter(contract=contract).delete()
