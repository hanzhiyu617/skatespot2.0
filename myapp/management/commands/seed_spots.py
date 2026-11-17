from django.core.management.base import BaseCommand

from myapp.models import SkateSpot


SPOTS = [
    dict(name='纛岛汉江公园滑板场', korean_name='뚝섬한강공원 스케이트파크', city='Seoul', district='城东区', address='首尔特别市城东区纛岛路 161', venue_type='outdoor', latitude=37.5445, longitude=127.0377, terrains='ledge,bank,flat', review='傍晚光线很好，地面很顺，适合练基础动作。'),
    dict(name='Cult 广场', korean_name='컬트플라자', city='Seoul', district='麻浦区', address='首尔特别市麻浦区卧牛山路 6 街', venue_type='street', latitude=37.5563, longitude=126.9237, terrains='rail,flat,ledge', review='街头氛围很棒，扶手高度友好。'),
    dict(name='汝矣岛公园滑板区', korean_name='여의도공원 스케이트장', city='Seoul', district='永登浦区', address='首尔特别市永登浦区汝矣公园路 68', venue_type='outdoor', latitude=37.5219, longitude=126.9245, terrains='flat,ledge,bank', review='空间开阔，适合长板 cruising。'),
    dict(name='江南室内滑板馆', korean_name='강남 실내 스케이트장', city='Seoul', district='江南区', address='首尔特别市江南区奉恩寺路 132', venue_type='indoor', latitude=37.5012, longitude=127.0396, terrains='ledge,rail,bowl', price='₩15,000', price_unit='session', review='雨天首选，U池维护得很好。'),
    dict(name='海云台滑板公园', korean_name='해운대 스케이트파크', city='Busan', district='海云台区', address='釜山广域市海云台区海云台海滩路 15', venue_type='outdoor', latitude=35.1587, longitude=129.1604, terrains='bowl,bank,ledge', review='面向大海，风景满分，碗池深度不错。'),
    dict(name='广安里街头点', korean_name='광안리 스트릿 스팟', city='Busan', district='水营区', address='釜山广域市水营区广安海边路 30', venue_type='street', latitude=35.1532, longitude=129.1186, terrains='rail,flat', review=''),
    dict(name='济州市滑板场', korean_name='제주시 스케이트파크', city='Jeju', district='济州市', address='济州特别自治道济州市莲洞 2725', venue_type='outdoor', latitude=33.4996, longitude=126.5312, terrains='bowl,flat,ledge', review='游客少，很安静，适合慢慢练。'),
    dict(name='圣水洞室内滑板基地', korean_name='성수동 실내 스케이팅 베이스', city='Seoul', district='城东区', address='首尔特别市城东区圣水洞路 45', venue_type='indoor', latitude=37.5449, longitude=127.0558, terrains='bank,rail,flat', price='₩18,000', price_unit='session', review='设施新，工作人员很友好。'),
    dict(name='松岛中央公园滑板区', korean_name='송도 센트럴파크 스케이트존', city='Incheon', district='延寿区', address='仁川广域市延寿区松岛中央路 55', venue_type='outdoor', latitude=37.3925, longitude=126.6365, terrains='flat,ledge', review=''),
    dict(name='大田 Expo 滑板公园', korean_name='대전 엑스포 스케이트파크', city='Daejeon', district='西区', address='大田广域市西区 Expo 路 30', venue_type='outdoor', latitude=36.37, longitude=127.3878, terrains='bowl,bank', review=''),
    dict(name='大邱新世界街头点', korean_name='대구 신세계 스트릿 스팟', city='Daegu', district='中区', address='大邱广域市中区中央大路 100', venue_type='street', latitude=35.869, longitude=128.593, terrains='rail,flat', review=''),
    dict(name='光州忠长路街头点', korean_name='광주 충장로 스트릿 스팟', city='Gwangju', district='东区', address='光州广域市东区忠长大路 45', venue_type='street', latitude=35.1595, longitude=126.8535, terrains='rail,flat', review=''),
    dict(name='蔚山太和江滑板场', korean_name='울산 태화강 스케이트파크', city='Ulsan', district='南区', address='蔚山广域市南区太和江路 88', venue_type='outdoor', latitude=35.544, longitude=129.33, terrains='ledge,bank', review=''),
    dict(name='世宗湖畔滑板区', korean_name='세종호수공원 스케이트존', city='Sejong', district='世宗市', address='世宗特别自治市美丽路 120', venue_type='outdoor', latitude=36.49, longitude=127.28, terrains='flat,ledge', review=''),
    dict(name='水原华城滑板公园', korean_name='수원 화성 스케이트파크', city='Gyeonggi', district='水原市', address='京畿道水原市华城路 200', venue_type='outdoor', latitude=37.2636, longitude=127.0286, terrains='bowl,flat', review=''),
    dict(name='春川昭阳江滑板场', korean_name='춘천 소양강 스케이트파크', city='Gangwon', district='春川市', address='江原特别自治道春川市昭阳江路 15', venue_type='outdoor', latitude=37.8814, longitude=127.7299, terrains='bank,ledge', review=''),
    dict(name='清州室内滑板中心', korean_name='청주 실내 스케이트센터', city='Chungbuk', district='清州市', address='忠清北道清州市上党区厅前路 33', venue_type='indoor', latitude=36.6424, longitude=127.489, terrains='ledge,rail', price='₩14,000', price_unit='session', review=''),
    dict(name='天安塔洞公园滑板区', korean_name='천안 타동공원 스케이트존', city='Chungnam', district='天安市', address='忠清南道天安市东南区塔洞路 9', venue_type='outdoor', latitude=36.8154, longitude=127.1126, terrains='flat,ledge', review=''),
    dict(name='全州韩屋村街头点', korean_name='전주 한옥마을 스트릿 스팟', city='Jeonbuk', district='全州市', address='全罗北道全州市完山区韩屋村路 21', venue_type='street', latitude=35.8242, longitude=127.148, terrains='rail,flat', review=''),
    dict(name='木浦海上滑板场', korean_name='목포 해상 스케이트파크', city='Jeonnam', district='木浦市', address='全罗南道木浦市海上公园路 6', venue_type='outdoor', latitude=34.8118, longitude=126.3922, terrains='bowl,flat', review=''),
    dict(name='浦项迎日台滑板区', korean_name='포항 영일대 스케이트존', city='Gyeongbuk', district='浦项市', address='庆尚北道浦项市南区迎日台路 18', venue_type='outdoor', latitude=36.019, longitude=129.343, terrains='bank,flat', review=''),
    dict(name='昌原中央路街头点', korean_name='창원 중앙로 스트릿 스팟', city='Gyeongnam', district='昌原市', address='庆尚南道昌原市城山区中央大路 77', venue_type='street', latitude=35.2284, longitude=128.6819, terrains='rail,ledge', review=''),
]


class Command(BaseCommand):
    help = '导入初始滑板场地数据到 SkateSpot 表'

    def handle(self, *args, **options):
        created = 0
        for item in SPOTS:
            _, is_created = SkateSpot.objects.get_or_create(
                name=item['name'], defaults=item
            )
            if is_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f'Seeded {created} spots, total {SkateSpot.objects.count()}'))
