import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import * as L from 'leaflet'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Filter,
  ImagePlus,
  List,
  MapPin,
  Navigation,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'
const STADIA_KEY = import.meta.env.VITE_STADIA_API_KEY || ''
const STADIA_TILE = 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png'
const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

const tileUrl = STADIA_KEY
  ? `${STADIA_TILE}?api_key=${STADIA_KEY}`
  : OSM_TILE
const tileAttribution = STADIA_KEY
  ? '&copy; OpenStreetMap contributors &copy; Stadia Maps'
  : '&copy; OpenStreetMap contributors'

interface Profile {
  uid: string
  name: string
  avatar_data: string
  is_registered: boolean
  username: string
}

interface GeocodeResult {
  lat: number
  lng: number
  label: string
}

const KOREA = { minLat: 33.0, maxLat: 38.7, minLng: 124.5, maxLng: 130.5 }
const koreaBounds: L.LatLngBoundsExpression = [
  [KOREA.minLat, KOREA.minLng],
  [KOREA.maxLat, KOREA.maxLng],
]

function isInKorea(lat: number, lng: number): boolean {
  return lat >= KOREA.minLat && lat <= KOREA.maxLat && lng >= KOREA.minLng && lng <= KOREA.maxLng
}

function koreaResults(items: GeocodeResult[]): GeocodeResult[] {
  return items.filter((item) => isInKorea(item.lat, item.lng))
}

async function geocode(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return []
  try {
    const url = `${API_BASE}/api/geocode/?q=${encodeURIComponent(query)}`
    const response = await fetch(url)
    if (!response.ok) return []
    const data = await response.json()
    return koreaResults((data || []).map((item: any) => ({
      lat: Number(item.lat),
      lng: Number(item.lng),
      label: item.label || query,
    })))
  } catch {
    return []
  }
}

const PIN_ART = `
  <path d="M12 1.8a6.2 6.2 0 0 0-6.2 6.2c0 4.6 6.2 10.4 6.2 10.4s6.2-5.8 6.2-10.4A6.2 6.2 0 0 0 12 1.8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
  <circle cx="12" cy="8" r="2.3" fill="none" stroke="currentColor" stroke-width="1.7"/>
  <path d="M5.5 20.4c2.4 1.5 10.6 1.5 13 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  <circle cx="8.6" cy="21.6" r="0.95" fill="currentColor"/>
  <circle cx="15.4" cy="21.6" r="0.95" fill="currentColor"/>
`

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g dangerouslySetInnerHTML={{ __html: PIN_ART }} />
    </svg>
  )
}

interface ApiSpot {
  id: number
  name: string
  korean_name?: string
  city: CityKey
  district: string
  address?: string
  venue_type: SpotType
  latitude: number
  longitude: number
  terrains?: string
  price?: string
  price_unit?: PriceUnit
  review?: string
  image_url?: string | null
  reviews?: ApiReview[]
}

interface ApiReview {
  id: number
  author?: string
  author_avatar?: string
  text: string
  image_url?: string | null
  created_at: string
}

type SpotType = 'indoor' | 'outdoor' | 'street'
type PriceUnit = 'session' | 'hour' | 'day'
type Terrain = 'ledge' | 'bank' | 'bowl' | 'rail' | 'flat'
type CityKey =
  | 'Seoul'
  | 'Busan'
  | 'Incheon'
  | 'Daejeon'
  | 'Daegu'
  | 'Gwangju'
  | 'Ulsan'
  | 'Sejong'
  | 'Gyeonggi'
  | 'Gangwon'
  | 'Chungbuk'
  | 'Chungnam'
  | 'Jeonbuk'
  | 'Jeonnam'
  | 'Gyeongbuk'
  | 'Gyeongnam'
  | 'Jeju'

interface Review {
  id: string
  author: string
  authorAvatar?: string
  text: string
  date: string
  imageUrl?: string | null
}

interface Spot {
  id: string
  imageUrl?: string | null
  name: string
  koreanName?: string
  city: CityKey
  district: string
  address: string
  type: SpotType
  terrains: Terrain[]
  price?: string
  priceUnit?: PriceUnit
  lat: number
  lng: number
  reviews: Review[]
}

interface NewSpotInput {
  name: string
  koreanName?: string
  city: CityKey
  district: string
  type: SpotType
  terrains: Terrain[]
  price?: string
  priceUnit?: PriceUnit
  lat?: number
  lng?: number
  image?: File
  review: string
}

interface Filters {
  types: SpotType[]
  terrains: Terrain[]
}

const cityInfo: Record<CityKey, { label: string; en: string; center: [number, number]; zoom: number }> = {
  Seoul: { label: '首尔', en: 'Seoul', center: [37.5665, 126.978], zoom: 12 },
  Busan: { label: '釜山', en: 'Busan', center: [35.1796, 129.0756], zoom: 12 },
  Incheon: { label: '仁川', en: 'Incheon', center: [37.4563, 126.7052], zoom: 12 },
  Daejeon: { label: '大田', en: 'Daejeon', center: [36.3504, 127.3845], zoom: 12 },
  Daegu: { label: '大邱', en: 'Daegu', center: [35.8714, 128.6014], zoom: 12 },
  Gwangju: { label: '光州', en: 'Gwangju', center: [35.1595, 126.8526], zoom: 12 },
  Ulsan: { label: '蔚山', en: 'Ulsan', center: [35.5384, 129.3114], zoom: 12 },
  Sejong: { label: '世宗', en: 'Sejong', center: [36.48, 127.289], zoom: 13 },
  Gyeonggi: { label: '京畿道', en: 'Gyeonggi', center: [37.4138, 127.5183], zoom: 11 },
  Gangwon: { label: '江原道', en: 'Gangwon', center: [37.8228, 128.1555], zoom: 11 },
  Chungbuk: { label: '忠清北道', en: 'Chungbuk', center: [36.8, 127.7], zoom: 11 },
  Chungnam: { label: '忠清南道', en: 'Chungnam', center: [36.5184, 126.8], zoom: 11 },
  Jeonbuk: { label: '全罗北道', en: 'Jeonbuk', center: [35.7175, 127.153], zoom: 11 },
  Jeonnam: { label: '全罗南道', en: 'Jeonnam', center: [34.8679, 126.991], zoom: 11 },
  Gyeongbuk: { label: '庆尚北道', en: 'Gyeongbuk', center: [36.4919, 128.8889], zoom: 11 },
  Gyeongnam: { label: '庆尚南道', en: 'Gyeongnam', center: [35.4606, 128.2132], zoom: 11 },
  Jeju: { label: '济州', en: 'Jeju', center: [33.4996, 126.5312], zoom: 11 },
}

const typeLabels: Record<SpotType, string> = {
  indoor: '室内滑板场',
  outdoor: '室外滑板场',
  street: '街头场地',
}

const priceUnitLabels: Record<PriceUnit, string> = {
  session: '次',
  hour: '小时',
  day: '天',
}

const terrainLabels: Record<Terrain, string> = {
  ledge: '小台阶 Ledge',
  bank: '抛台 Bank',
  bowl: 'U池 Bowl',
  rail: '扶手 Handrail',
  flat: '平地 Flatground',
}

const terrainOptions: Terrain[] = ['ledge', 'bank', 'bowl', 'rail', 'flat']
const typeOptions: SpotType[] = ['indoor', 'outdoor', 'street']

const baseSpots: Spot[] = [
  {
    id: 'ttukseom',
    name: '纛岛汉江公园滑板场',
    city: 'Seoul',
    district: '城东区',
    address: '首尔特别市城东区纛岛路 161',
    type: 'outdoor',
    terrains: ['ledge', 'bank', 'flat'],
    lat: 37.5445,
    lng: 127.0377,
    reviews: [
      { id: 'r1', author: 'Jisoo', text: '傍晚光线很好，地面很顺，适合练基础动作。', date: '2026.10.12' },
      { id: 'r2', author: 'Minho', text: '周末人稍多，建议工作日上午来。', date: '2026.09.28' },
    ],
  },
  {
    id: 'cult-plaza',
    name: 'Cult 广场',
    city: 'Seoul',
    district: '麻浦区',
    address: '首尔特别市麻浦区卧牛山路 6 街',
    type: 'street',
    terrains: ['rail', 'flat', 'ledge'],
    lat: 37.5563,
    lng: 126.9237,
    reviews: [
      { id: 'r3', author: 'Yuna', text: '街头氛围很棒，扶手高度友好。', date: '2026.08.15' },
    ],
  },
  {
    id: 'yeouido',
    name: '汝矣岛公园滑板区',
    city: 'Seoul',
    district: '永登浦区',
    address: '首尔特别市永登浦区汝矣公园路 68',
    type: 'outdoor',
    terrains: ['flat', 'ledge', 'bank'],
    lat: 37.5219,
    lng: 126.9245,
    reviews: [
      { id: 'r4', author: 'Daniel', text: '空间开阔，适合长板 cruising。', date: '2026.07.03' },
    ],
  },
  {
    id: 'gangnam-indoor',
    name: '江南室内滑板馆',
    city: 'Seoul',
    district: '江南区',
    address: '首尔特别市江南区奉恩寺路 132',
    type: 'indoor',
    terrains: ['ledge', 'rail', 'bowl'],
    price: '₩15,000',
    lat: 37.5012,
    lng: 127.0396,
    reviews: [
      { id: 'r5', author: 'Seojun', text: '雨天首选，U池维护得很好。', date: '2026.10.01' },
    ],
  },
  {
    id: 'haeundae',
    name: '海云台滑板公园',
    city: 'Busan',
    district: '海云台区',
    address: '釜山广域市海云台区海云台海滩路 15',
    type: 'outdoor',
    terrains: ['bowl', 'bank', 'ledge'],
    lat: 35.1587,
    lng: 129.1604,
    reviews: [
      { id: 'r6', author: 'Haneul', text: '面向大海，风景满分，碗池深度不错。', date: '2026.06.22' },
    ],
  },
  {
    id: 'gwangalli',
    name: '广安里街头点',
    city: 'Busan',
    district: '水营区',
    address: '釜山广域市水营区广安海边路 30',
    type: 'street',
    terrains: ['rail', 'flat'],
    lat: 35.1532,
    lng: 129.1186,
    reviews: [],
  },
  {
    id: 'jeju-city',
    name: '济州市滑板场',
    city: 'Jeju',
    district: '济州市',
    address: '济州特别自治道济州市莲洞 2725',
    type: 'outdoor',
    terrains: ['bowl', 'flat', 'ledge'],
    lat: 33.4996,
    lng: 126.5312,
    reviews: [
      { id: 'r7', author: 'Ari', text: '游客少，很安静，适合慢慢练。', date: '2026.05.18' },
    ],
  },
  {
    id: 'seongsu-indoor',
    name: '圣水洞室内滑板基地',
    city: 'Seoul',
    district: '城东区',
    address: '首尔特别市城东区圣水洞路 45',
    type: 'indoor',
    terrains: ['bank', 'rail', 'flat'],
    price: '₩18,000',
    lat: 37.5449,
    lng: 127.0558,
    reviews: [
      { id: 'r8', author: 'Jiwoo', text: '设施新，工作人员很友好。', date: '2026.10.08' },
    ],
  },
  {
    id: 'incheon-songdo',
    name: '松岛中央公园滑板区',
    city: 'Incheon',
    district: '延寿区',
    address: '仁川广域市延寿区松岛中央路 55',
    type: 'outdoor',
    terrains: ['flat', 'ledge'],
    lat: 37.3925,
    lng: 126.6365,
    reviews: [],
  },
  {
    id: 'daejeon-expo',
    name: '大田 Expo 滑板公园',
    city: 'Daejeon',
    district: '西区',
    address: '大田广域市西区 Expo 路 30',
    type: 'outdoor',
    terrains: ['bowl', 'bank'],
    lat: 36.37,
    lng: 127.3878,
    reviews: [],
  },
  {
    id: 'daegu-street',
    name: '大邱新世界街头点',
    city: 'Daegu',
    district: '中区',
    address: '大邱广域市中区中央大路 100',
    type: 'street',
    terrains: ['rail', 'flat'],
    lat: 35.869,
    lng: 128.593,
    reviews: [],
  },
  {
    id: 'gwangju-street',
    name: '光州忠长路街头点',
    city: 'Gwangju',
    district: '东区',
    address: '光州广域市东区忠长大路 45',
    type: 'street',
    terrains: ['rail', 'flat'],
    lat: 35.1595,
    lng: 126.8535,
    reviews: [],
  },
  {
    id: 'ulsan-taehwa',
    name: '蔚山太和江滑板场',
    city: 'Ulsan',
    district: '南区',
    address: '蔚山广域市南区太和江路 88',
    type: 'outdoor',
    terrains: ['ledge', 'bank'],
    lat: 35.544,
    lng: 129.33,
    reviews: [],
  },
  {
    id: 'sejong-lake',
    name: '世宗湖畔滑板区',
    city: 'Sejong',
    district: '世宗市',
    address: '世宗特别自治市美丽路 120',
    type: 'outdoor',
    terrains: ['flat', 'ledge'],
    lat: 36.49,
    lng: 127.28,
    reviews: [],
  },
  {
    id: 'gyeonggi-suwon',
    name: '水原华城滑板公园',
    city: 'Gyeonggi',
    district: '水原市',
    address: '京畿道水原市华城路 200',
    type: 'outdoor',
    terrains: ['bowl', 'flat'],
    lat: 37.2636,
    lng: 127.0286,
    reviews: [],
  },
  {
    id: 'gangwon-chuncheon',
    name: '春川昭阳江滑板场',
    city: 'Gangwon',
    district: '春川市',
    address: '江原特别自治道春川市昭阳江路 15',
    type: 'outdoor',
    terrains: ['bank', 'ledge'],
    lat: 37.8814,
    lng: 127.7299,
    reviews: [],
  },
  {
    id: 'chungbuk-cheongju',
    name: '清州室内滑板中心',
    city: 'Chungbuk',
    district: '清州市',
    address: '忠清北道清州市上党区厅前路 33',
    type: 'indoor',
    terrains: ['ledge', 'rail'],
    price: '₩14,000',
    lat: 36.6424,
    lng: 127.489,
    reviews: [],
  },
  {
    id: 'chungnam-cheonan',
    name: '天安塔洞公园滑板区',
    city: 'Chungnam',
    district: '天安市',
    address: '忠清南道天安市东南区塔洞路 9',
    type: 'outdoor',
    terrains: ['flat', 'ledge'],
    lat: 36.8154,
    lng: 127.1126,
    reviews: [],
  },
  {
    id: 'jeonbuk-jeonju',
    name: '全州韩屋村街头点',
    city: 'Jeonbuk',
    district: '全州市',
    address: '全罗北道全州市完山区韩屋村路 21',
    type: 'street',
    terrains: ['rail', 'flat'],
    lat: 35.8242,
    lng: 127.148,
    reviews: [],
  },
  {
    id: 'jeonnam-mokpo',
    name: '木浦海上滑板场',
    city: 'Jeonnam',
    district: '木浦市',
    address: '全罗南道木浦市海上公园路 6',
    type: 'outdoor',
    terrains: ['bowl', 'flat'],
    lat: 34.8118,
    lng: 126.3922,
    reviews: [],
  },
  {
    id: 'gyeongbuk-pohang',
    name: '浦项迎日台滑板区',
    city: 'Gyeongbuk',
    district: '浦项市',
    address: '庆尚北道浦项市南区迎日台路 18',
    type: 'outdoor',
    terrains: ['bank', 'flat'],
    lat: 36.019,
    lng: 129.343,
    reviews: [],
  },
  {
    id: 'gyeongnam-changwon',
    name: '昌原中央路街头点',
    city: 'Gyeongnam',
    district: '昌原市',
    address: '庆尚南道昌原市城山区中央大路 77',
    type: 'street',
    terrains: ['rail', 'ledge'],
    lat: 35.2284,
    lng: 128.6819,
    reviews: [],
  },
]

const koreanNames: Record<string, string> = {
  ttukseom: '뚝섬한강공원 스케이트파크',
  'cult-plaza': '컬트플라자',
  yeouido: '여의도공원 스케이트장',
  'gangnam-indoor': '강남 실내 스케이트장',
  haeundae: '해운대 스케이트파크',
  gwangalli: '광안리 스트릿 스팟',
  'jeju-city': '제주시 스케이트파크',
  'seongsu-indoor': '성수동 실내 스케이팅 베이스',
  'incheon-songdo': '송도 센트럴파크 스케이트존',
  'daejeon-expo': '대전 엑스포 스케이트파크',
  'daegu-street': '대구 신세계 스트릿 스팟',
  'gwangju-street': '광주 충장로 스트릿 스팟',
  'ulsan-taehwa': '울산 태화강 스케이트파크',
  'sejong-lake': '세종호수공원 스케이트존',
  'gyeonggi-suwon': '수원 화성 스케이트파크',
  'gangwon-chuncheon': '춘천 소양강 스케이트파크',
  'chungbuk-cheongju': '청주 실내 스케이트센터',
  'chungnam-cheonan': '천안 타동공원 스케이트존',
  'jeonbuk-jeonju': '전주 한옥마을 스트릿 스팟',
  'jeonnam-mokpo': '목포 해상 스케이트파크',
  'gyeongbuk-pohang': '포항 영일대 스케이트존',
  'gyeongnam-changwon': '창원 중앙로 스트릿 스팟',
}

const initialSpots: Spot[] = baseSpots.map((spot) => ({
  ...spot,
  koreanName: koreanNames[spot.id] ?? spot.name,
  priceUnit: spot.type === 'indoor' ? (spot.priceUnit ?? 'session') : undefined,
}))

function formatPrice(spot: Spot) {
  if (!spot.price) return ''
  return `${spot.price} / ${priceUnitLabels[spot.priceUnit ?? 'session']}`
}

function apiSpotToSpot(item: ApiSpot): Spot {
  const terrains = (item.terrains || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is Terrain => terrainOptions.includes(value as Terrain))
  const reviews = (item.reviews || []).map((review) => ({
    id: `review-${review.id}`,
    author: review.author || '滑手',
    authorAvatar: review.author_avatar || undefined,
    text: review.text,
    date: new Date(review.created_at).toLocaleDateString('zh-CN'),
    imageUrl: review.image_url || undefined,
  }))
  return {
    id: `spot-${item.id}`,
    name: item.name,
    koreanName: item.korean_name || undefined,
    city: item.city,
    district: item.district,
    address: item.address || `${cityInfo[item.city].label} · ${item.district}`,
    type: item.venue_type,
    terrains,
    price: item.price || undefined,
    priceUnit: item.price_unit || undefined,
    lat: item.latitude,
    lng: item.longitude,
    imageUrl: item.image_url || undefined,
    reviews,
  }
}

function Tag({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'accent' | 'muted' }) {
  const tones = {
    default: 'border-gray-200 bg-white text-gray-700',
    accent: 'border-accent/30 bg-accent/10 text-[#8a6d15]',
    muted: 'border-gray-100 bg-gray-50 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

function MapView({
  spots,
  city,
  selectedId,
  onSelect,
  visible = true,
}: {
  spots: Spot[]
  city: CityKey
  selectedId: string | null
  onSelect: (id: string) => void
  visible?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<string, L.Marker>>({})

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(cityInfo[city].center, cityInfo[city].zoom)

    L.tileLayer(tileUrl, {
      attribution: tileAttribution,
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapRef.current = map
    window.setTimeout(() => map.invalidateSize(), 200)

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const el = containerRef.current
    if (!map || !el || !el.clientWidth || !el.clientHeight) return
    map.flyTo(cityInfo[city].center, cityInfo[city].zoom, { duration: 0.8 })
  }, [city])

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => {
      const map = mapRef.current
      if (!map) return
      map.invalidateSize()
      const spot = spots.find((item) => item.id === selectedId)
      if (spot) {
        map.flyTo([spot.lat, spot.lng], 15, { duration: 0.6 })
      } else {
        map.flyTo(cityInfo[city].center, cityInfo[city].zoom, { animate: false })
      }
    }, 150)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    Object.values(markersRef.current).forEach((marker) => marker.remove())
    markersRef.current = {}

    spots.forEach((spot) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="spot-marker ${spot.id === selectedId ? 'active' : ''}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })
      const marker = L.marker([spot.lat, spot.lng], { icon }).addTo(map)
      marker.on('click', () => onSelect(spot.id))
      markersRef.current[spot.id] = marker
    })
  }, [spots, selectedId, onSelect])

  useEffect(() => {
    const spot = spots.find((item) => item.id === selectedId)
    const el = containerRef.current
    if (spot && mapRef.current && el && el.clientWidth && el.clientHeight) {
      mapRef.current.flyTo([spot.lat, spot.lng], 15, { duration: 0.6 })
    }
  }, [selectedId, spots])

  return <div ref={containerRef} className="h-full w-full" />
}

function LocationPicker({
  city,
  onChange,
}: {
  city: CityKey
  onChange: (value: [number, number]) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  const placeRef = useRef<(position: [number, number]) => void>(() => {})
  const [hasPick, setHasPick] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hint, setHint] = useState('')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: STADIA_KEY ? true : false,
      maxBounds: koreaBounds,
      maxBoundsViscosity: 1,
      minZoom: 7,
    }).setView(cityInfo[city].center, 14)

    L.tileLayer(tileUrl, { maxZoom: 19, attribution: tileAttribution }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const pinIcon = L.divIcon({
      className: '',
      html: '<div class="picker-pin"><svg viewBox="0 0 24 24" width="30" height="30">' + PIN_ART + '</svg></div>',
      iconSize: [40, 44],
      iconAnchor: [20, 42],
    })

    const place = (position: [number, number], warn = false) => {
      if (!isInKorea(position[0], position[1])) {
        if (warn) {
          setHint('只能选择韩国境内的位置')
          window.setTimeout(() => setHint(''), 2200)
        }
        return
      }
      setHint('')
      if (markerRef.current) {
        markerRef.current.setLatLng(position)
      } else {
        markerRef.current = L.marker(position, { icon: pinIcon, draggable: true }).addTo(map)
        markerRef.current.on('drag', () => {
          const moved = markerRef.current?.getLatLng()
          if (moved && !isInKorea(moved.lat, moved.lng)) {
            markerRef.current?.setLatLng(position)
            setHint('只能选择韩国境内的位置')
            window.setTimeout(() => setHint(''), 2200)
          }
        })
        markerRef.current.on('dragend', () => {
          const moved = markerRef.current?.getLatLng()
          if (moved && isInKorea(moved.lat, moved.lng)) onChangeRef.current([moved.lat, moved.lng])
        })
      }
      onChangeRef.current(position)
      setHasPick(true)
    }
    placeRef.current = place

    map.on('click', (event: L.LeafletMouseEvent) => place([event.latlng.lat, event.latlng.lng], true))

    mapRef.current = map
    window.setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const el = containerRef.current
    if (!map || !el || !el.clientWidth || !el.clientHeight) return
    map.setView(cityInfo[city].center, 14, { animate: false })
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    onChangeRef.current(cityInfo[city].center)
    setHasPick(false)
    setResults([])
    setQuery('')
  }, [city])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = window.setTimeout(async () => {
      const data = await geocode(query)
      if (!cancelled) {
        setResults(data)
        setSearching(false)
      }
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  const selectResult = (result: GeocodeResult) => {
    const position: [number, number] = [result.lat, result.lng]
    mapRef.current?.flyTo(position, 16, { duration: 0.8 })
    placeRef.current(position)
    setResults([])
    setQuery(result.label)
  }

  const recenter = () => {
    const map = mapRef.current
    if (!map) return
    map.flyTo(cityInfo[city].center, 14, { duration: 0.6 })
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    onChangeRef.current(cityInfo[city].center)
    setHasPick(false)
    setResults([])
    setQuery('')
  }

  const confirm = () => {
    const map = mapRef.current
    if (!map) return
    const center = map.getCenter()
    if (!isInKorea(center.lat, center.lng)) {
      setHint('只能选择韩国境内的位置')
      window.setTimeout(() => setHint(''), 2200)
      return
    }
    placeRef.current([center.lat, center.lng])
    setResults([])
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gray-200">
      <div className="relative z-[600] flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2">
        <Search size={15} className="shrink-0 text-gray-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={STADIA_KEY ? '搜索韩国境内地址（Stadia）…' : '搜索韩国境内地址…'}
          className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"
        />
        {searching && <span className="shrink-0 text-[10px] text-gray-400">搜索中…</span>}
      </div>
      {results.length > 0 && (
        <div className="absolute inset-x-0 top-[38px] z-[700] max-h-44 overflow-y-auto border-b border-gray-100 bg-white shadow-soft">
          {results.map((result, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectResult(result)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-gray-50"
            >
              <MapPin size={13} className="mt-0.5 shrink-0 text-accent" />
              <span className="line-clamp-2 text-[11px] text-gray-700">{result.label}</span>
            </button>
          ))}
        </div>
      )}
      <div ref={containerRef} style={{ height: 208 }} className="w-full picker-map" />
      <div className={`pointer-events-none absolute left-3 top-[48px] z-[500] rounded-full border px-3 py-1.5 text-[11px] font-medium frosted ${
        hint
          ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-gray-100 bg-white/90 text-gray-700'
      }`}>
        {hint || (hasPick ? '已选点 · 可拖动图钉微调（仅限韩国）' : '仅可搜索/选点韩国境内')}
      </div>
      <div className="absolute bottom-3 left-3 right-3 z-[500] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={recenter}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 shadow-sm transition hover:border-ink"
        >
          回到{cityInfo[city].label}中心
        </button>
        <button
          type="button"
          onClick={confirm}
          className="rounded-full bg-ink px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          确认当前位置
        </button>
      </div>
    </div>
  )
}

function SpotImage({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (src && !failed) {
    return <img key={src} src={src} alt={alt} className={`${className} object-cover`} onError={() => setFailed(true)} />
  }
  return <div className={`gray-block ${className}`} />
}

function SpotCard({ spot, onClick }: { spot: Spot; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left transition duration-200 hover:border-gray-300 hover:shadow-soft"
    >
      <SpotImage src={spot.imageUrl} alt={spot.name} className="h-20 w-20 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-semibold text-ink">{spot.name}</h3>
          <span className="shrink-0 text-[11px] text-gray-400">{spot.district}</span>
        </div>
        {spot.koreanName && (
          <p className="mt-0.5 truncate text-[11px] text-gray-400">{spot.koreanName}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Tag tone={spot.type === 'indoor' ? 'accent' : 'default'}>{typeLabels[spot.type]}</Tag>
          {spot.terrains.slice(0, 2).map((terrain) => (
            <Tag key={terrain} tone="muted">{terrainLabels[terrain].split(' ')[0]}</Tag>
          ))}
          {spot.terrains.length > 2 && <Tag tone="muted">+{spot.terrains.length - 2}</Tag>}
        </div>
        {spot.price && (
          <p className="mt-2 text-xs font-semibold text-accent">{formatPrice(spot)}</p>
        )}
      </div>
    </button>
  )
}

function SpotDetail({
  spot,
  onBack,
  onAddReview,
  onShowMap,
}: {
  spot: Spot
  onBack: () => void
  onAddReview: (id: string, text: string, image?: File) => void
  onShowMap?: () => void
}) {
  const [reviewText, setReviewText] = useState('')
  const [reviewImage, setReviewImage] = useState<File | null>(null)
  const [reviewImageUrl, setReviewImageUrl] = useState('')

  const submitReview = (event: FormEvent) => {
    event.preventDefault()
    if (!reviewText.trim() && !reviewImage) return
    onAddReview(spot.id, reviewText.trim(), reviewImage || undefined)
    setReviewText('')
    setReviewImage(null)
    setReviewImageUrl('')
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-ink"
      >
        <ArrowLeft size={16} /> 返回列表
      </button>

      <h2 className="text-3xl font-bold leading-tight tracking-tight text-ink">{spot.name}</h2>
      {spot.koreanName && <p className="mt-1 text-sm text-gray-400">{spot.koreanName}</p>}
      <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
        <MapPin size={14} /> {spot.address}
      </p>

      <SpotImage src={spot.imageUrl} alt={spot.name} className="mt-5 h-52 w-full rounded-2xl" />

      <div className="mt-4 flex flex-wrap gap-2">
        <Tag tone={spot.type === 'indoor' ? 'accent' : 'default'}>{typeLabels[spot.type]}</Tag>
        {spot.terrains.map((terrain) => (
          <Tag key={terrain} tone="muted">{terrainLabels[terrain]}</Tag>
        ))}
        {spot.price && <Tag tone="accent">{formatPrice(spot)}</Tag>}
      </div>

      <section className="mt-7">
        <h3 className="text-sm font-semibold text-ink">地形配置</h3>
        <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-100">
          {spot.terrains.map((terrain) => (
            <li key={terrain} className="flex items-center justify-between px-4 py-3 text-sm text-gray-700">
              <span>{terrainLabels[terrain]}</span>
              <Check size={15} className="text-accent" />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-7">
        <h3 className="text-sm font-semibold text-ink">场地情报 / 个人评价</h3>
        <div className="mt-3 space-y-3">
          {spot.reviews.length === 0 && (
            <p className="rounded-2xl bg-gray-50 px-4 py-5 text-center text-xs text-gray-400">
              还没有评价，来写下第一条吧。
            </p>
          )}
          {spot.reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {review.authorAvatar ? (
                    <img src={review.authorAvatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-gray-100 text-gray-400">
                      <User size={12} />
                    </span>
                  )}
                  <span className="text-xs font-semibold text-ink">{review.author}</span>
                </div>
                <span className="text-[11px] text-gray-400">{review.date}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{review.text}</p>
              {review.imageUrl && (
                <img
                  src={review.imageUrl}
                  alt="评价图片"
                  className="mt-3 max-h-56 w-full rounded-xl object-cover"
                />
              )}
            </div>
          ))}
        </div>
        <form onSubmit={submitReview} className="mt-4">
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="分享你的场地体验…"
            rows={3}
            className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-xs text-gray-500 transition hover:border-accent">
            <ImagePlus size={14} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                setReviewImage(file)
                setReviewImageUrl(file ? URL.createObjectURL(file) : '')
              }}
            />
            {reviewImage ? '已选择图片，点击可更换' : '添加图片（可选）'}
          </label>
          {reviewImageUrl && (
            <img src={reviewImageUrl} alt="评价图片预览" className="mt-2 h-24 w-24 rounded-lg object-cover" />
          )}
          <button
            type="submit"
            className="mt-2 w-full rounded-full border border-gray-200 py-2.5 text-sm font-medium text-ink transition hover:border-ink"
          >
            追加评价
          </button>
        </form>
      </section>

      {onShowMap && (
        <button
          type="button"
          onClick={onShowMap}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 py-3.5 text-sm font-semibold text-ink transition hover:border-ink md:hidden"
        >
          <MapPin size={16} /> 在地图中查看
        </button>
      )}

      <a
        href={`https://map.naver.com/p/search/${encodeURIComponent(spot.koreanName || spot.name)}`}
        target="_blank"
        rel="noreferrer"
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-sm font-semibold text-ink transition hover:brightness-95"
      >
        <Navigation size={16} /> 导航前往
      </a>
    </div>
  )
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/20 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-soft">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-gray-400 transition hover:text-ink"
          aria-label="关闭"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}

function FilterModal({
  filters,
  onApply,
  onClose,
}: {
  filters: Filters
  onApply: (filters: Filters) => void
  onClose: () => void
}) {
  const [types, setTypes] = useState<SpotType[]>(filters.types)
  const [terrains, setTerrains] = useState<Terrain[]>(filters.terrains)

  const toggleType = (type: SpotType) => {
    setTypes((prev) => (prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]))
  }
  const toggleTerrain = (terrain: Terrain) => {
    setTerrains((prev) => (prev.includes(terrain) ? prev.filter((item) => item !== terrain) : [...prev, terrain]))
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-2xl font-bold tracking-tight text-ink">筛选场地</h2>
      <p className="mt-1 text-sm text-gray-500">按场地类型与地形条件组合筛选。</p>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">场地类型</p>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                types.includes(type) ? 'border-ink bg-ink text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">地形条件</p>
        <div className="flex flex-wrap gap-2">
          {terrainOptions.map((terrain) => (
            <button
              key={terrain}
              type="button"
              onClick={() => toggleTerrain(terrain)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                terrains.includes(terrain)
                  ? 'border-accent bg-accent/15 text-[#8a6d15]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {terrainLabels[terrain]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => {
            setTypes([])
            setTerrains([])
          }}
          className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-medium text-gray-600 transition hover:border-gray-400"
        >
          重置
        </button>
        <button
          type="button"
          onClick={() => onApply({ types, terrains })}
          className="flex-1 rounded-full bg-ink py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          应用筛选
        </button>
      </div>
    </ModalShell>
  )
}

function UploadModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (input: NewSpotInput) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [koreanName, setKoreanName] = useState('')
  const [city, setCity] = useState<CityKey>('Seoul')
  const [district, setDistrict] = useState('')
  const [type, setType] = useState<SpotType>('outdoor')
  const [price, setPrice] = useState('')
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('session')
  const [terrains, setTerrains] = useState<Terrain[]>([])
  const [review, setReview] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')

  const toggleTerrain = (terrain: Terrain) => {
    setTerrains((prev) => (prev.includes(terrain) ? prev.filter((item) => item !== terrain) : [...prev, terrain]))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitMessage('')
    setSubmitError('')
    if (!name.trim() || !district.trim()) {
      setSubmitError('请填写场地名称和行政区。')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        koreanName: koreanName.trim() || undefined,
        city,
        district: district.trim(),
        type,
        terrains,
        price: price.trim() || undefined,
        priceUnit: priceUnit,
        lat: coords?.[0],
        lng: coords?.[1],
        image: imageFile || undefined,
        review: review.trim(),
      })
      setSubmitMessage('已提交，等待审核')
      setName('')
      setKoreanName('')
      setDistrict('')
      setTerrains([])
      setReview('')
      setImageFile(null)
      setImagePreview('')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-accent'

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-2xl font-bold tracking-tight text-ink">上传滑板场地</h2>
      <p className="mt-1 text-sm text-gray-500">提交后进入后台审核，通过后才会展示在地图上。</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500">场地名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：弘大街头点" className={inputClass} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500">韩文名称（用于 Naver 导航，可选）</label>
          <input value={koreanName} onChange={(e) => setKoreanName(e.target.value)} placeholder="例如：홍대 스트릿 스팟" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">城市</label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value as CityKey)
                setCoords(null)
              }}
              className={inputClass}
            >
              {(Object.keys(cityInfo) as CityKey[]).map((key) => (
                <option key={key} value={key}>{cityInfo[key].label} / {cityInfo[key].en}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">行政区</label>
            <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="例如：麻浦区" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500">场地类型</label>
          <select value={type} onChange={(e) => setType(e.target.value as SpotType)} className={inputClass}>
            {typeOptions.map((option) => (
              <option key={option} value={option}>{typeLabels[option]}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">入场价格（可选）</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₩15,000" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500">计费单位</label>
              <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value as PriceUnit)} className={inputClass}>
                {(Object.keys(priceUnitLabels) as PriceUnit[]).map((unit) => (
                  <option key={unit} value={unit}>{priceUnitLabels[unit]}</option>
                ))}
              </select>
            </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-500">地图选点（不需要手动填经纬度）</p>
            <a
              href={`https://map.naver.com/p/search/${encodeURIComponent(`${district || cityInfo[city].label} ${name || '滑板场'}`)}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-accent hover:underline"
            >
              先用 Naver 地图查地址
            </a>
          </div>
          <LocationPicker city={city} onChange={setCoords} />
          <p className="mt-1.5 text-[11px] text-gray-400">
            {coords
              ? `已选坐标：${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}（点击地图可重新选择）`
              : '点击上方地图任意位置，即可准确获取场地坐标。'}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-gray-500">包含地形</p>
          <div className="flex flex-wrap gap-2">
            {terrainOptions.map((terrain) => (
              <button
                key={terrain}
                type="button"
                onClick={() => toggleTerrain(terrain)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  terrains.includes(terrain)
                    ? 'border-ink bg-ink text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {terrainLabels[terrain]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-500">个人评价</label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="简单描述场地体验…"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <ImagePlus size={14} /> 上传场地图片
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-3 transition hover:border-accent">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setImageFile(file)
                setImagePreview(file ? URL.createObjectURL(file) : '')
              }}
            />
            {imagePreview ? (
              <img src={imagePreview} alt="预览" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-50" />
            )}
            <span className="text-xs text-gray-500">{imageFile ? imageFile.name : '点击选择本地图片'}</span>
          </label>
        </div>

        {submitMessage && (
          <p className="rounded-xl bg-green-50 px-4 py-2.5 text-center text-sm font-medium text-green-700">
            {submitMessage}
          </p>
        )}
        {submitError && (
          <p className="rounded-xl bg-red-50 px-4 py-2.5 text-center text-sm text-red-600">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          {submitting ? '提交中…' : '提交申请'}
        </button>
      </form>
    </ModalShell>
  )
}

function AccountModal({
  profile,
  onUpdated,
  onClose,
}: {
  profile: Profile
  onUpdated: (profile: Profile) => void
  onClose: () => void
}) {
  const [name, setName] = useState(profile.name)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const patch = async (payload: Record<string, string>) => {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/profile/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: profile.uid, ...payload }),
      })
      const data = await response.json()
      if (response.ok) {
        onUpdated(data)
        setMessage('已保存')
      } else {
        setError(data.detail || '保存失败')
      }
    } catch {
      setError('网络连接失败')
    } finally {
      setBusy(false)
    }
  }

  const saveName = () => {
    if (!name.trim()) {
      setError('名字不能为空')
      return
    }
    patch({ name: name.trim() })
  }

  const uploadAvatar = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => patch({ avatar_data: String(reader.result || '') })
    reader.readAsDataURL(file)
  }

  const submitAccount = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const url = mode === 'register' ? `${API_BASE}/api/profile/register/` : `${API_BASE}/api/profile/login/`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: profile.uid, username, password }),
      })
      const data = await response.json()
      if (response.ok) {
        onUpdated(data)
        setMessage(mode === 'register' ? '注册成功，已绑定正式账号' : '登录成功')
        setPassword('')
      } else {
        setError(data.username?.[0] || data.detail || '操作失败')
      }
    } catch {
      setError('网络连接失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="pr-8 text-lg font-bold text-ink">个人中心</h2>
      <p className="mt-1 text-xs text-gray-500">未注册也能上传场地与评价，身份会自动绑定此设备。</p>

      <div className="mt-5 flex items-center gap-4">
        <label className="relative cursor-pointer">
          {profile.avatar_data ? (
            <img src={profile.avatar_data} alt="头像" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gray-100 text-gray-400">
              <User size={24} />
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-ink text-white">
            <ImagePlus size={12} />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => uploadAvatar(event.target.files?.[0])}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{profile.name}</p>
          <p className="text-[11px] text-gray-400">
            {profile.is_registered ? `正式账号 · ${profile.username}` : '本机访客身份'}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-semibold text-gray-500">修改昵称</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={saveName}
            disabled={busy}
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            保存
          </button>
        </div>
      </div>

      {message && <p className="mt-3 rounded-xl bg-green-50 px-4 py-2.5 text-center text-xs font-medium text-green-700">{message}</p>}
      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-center text-xs text-red-600">{error}</p>}

      {!profile.is_registered && (
        <form onSubmit={submitAccount} className="mt-6 border-t border-gray-100 pt-5">
          <p className="mb-3 text-xs font-semibold text-gray-500">
            连接 Django 账号<span className="ml-1 font-normal text-gray-400">（多设备同步）</span>
          </p>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${mode === 'register' ? 'bg-ink text-white' : 'border border-gray-200 text-gray-600'}`}
            >
              注册
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${mode === 'login' ? 'bg-ink text-white' : 'border border-gray-200 text-gray-600'}`}
            >
              登录
            </button>
          </div>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="用户名"
            className="mb-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="密码"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy ? '处理中…' : mode === 'register' ? '注册并绑定' : '登录并绑定'}
          </button>
        </form>
      )}
    </ModalShell>
  )
}

export default function App() {
  const [spots, setSpots] = useState<Spot[]>(initialSpots)
  const [city, setCity] = useState<CityKey>('Seoul')
  const [district, setDistrict] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ types: [], terrains: [] })
  const [filterOpen, setFilterOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    let uid = localStorage.getItem('skatespot_uid')
    if (!uid) {
      uid = 'device-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2))
      localStorage.setItem('skatespot_uid', uid)
    }
    const currentUid = uid
    fetch(`${API_BASE}/api/profile/?uid=${encodeURIComponent(currentUid)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Profile | null) => {
        if (data) setProfile(data)
        else {
          setProfile({
            uid: currentUid,
            name: '滑手' + Math.floor(10 + Math.random() * 90),
            avatar_data: '',
            is_registered: false,
            username: '',
          })
        }
      })
      .catch(() => {
        setProfile({
          uid: currentUid,
          name: '滑手' + Math.floor(10 + Math.random() * 90),
          avatar_data: '',
          is_registered: false,
          username: '',
        })
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/spots/`)
      .then((response) => (response.ok ? response.json() : null))
      .then((items: ApiSpot[] | null) => {
        if (!cancelled && items && items.length > 0) {
          setSpots(items.map(apiSpotToSpot))
        }
      })
      .catch(() => {
        if (!cancelled) setSpots(initialSpots)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const districts = useMemo(() => {
    const values = Array.from(new Set(spots.filter((spot) => spot.city === city).map((spot) => spot.district)))
    return ['all', ...values]
  }, [spots, city])

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      if (spot.city !== city) return false
      if (district !== 'all' && spot.district !== district) return false
      if (filters.types.length > 0 && !filters.types.includes(spot.type)) return false
      if (filters.terrains.length > 0 && !filters.terrains.every((terrain) => spot.terrains.includes(terrain))) return false
      return true
    })
  }, [spots, city, district, filters])

  const selectedSpot = spots.find((spot) => spot.id === selectedId) ?? null

  const handleSelect = useCallback((id: string) => setSelectedId(id), [])

  const switchCity = (nextCity: CityKey) => {
    setCity(nextCity)
    setDistrict('all')
    setSelectedId(null)
  }

  const addReview = (id: string, text: string, image?: File) => {
    const spotId = Number(id.replace('spot-', ''))
    const payload = new FormData()
    payload.append('author', profile?.name || '滑手')
    payload.append('author_uid', profile?.uid || '')
    payload.append('author_avatar', profile?.avatar_data || '')
    payload.append('text', text || '分享一张场地照片')
    if (image) payload.append('image', image)

    fetch(`${API_BASE}/api/spots/${spotId}/reviews/`, {
      method: 'POST',
      body: payload,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return
        const review: Review = {
          id: `review-${data.id}`,
          author: data.author || '我',
          authorAvatar: data.author_avatar || profile?.avatar_data || undefined,
          text: data.text,
          date: new Date(data.created_at).toLocaleDateString('zh-CN'),
          imageUrl: data.image_url || undefined,
        }
        setSpots((prev) => prev.map((spot) => (spot.id === id ? { ...spot, reviews: [review, ...spot.reviews] } : spot)))
      })
      .catch(() => undefined)
  }

  const submitApplication = async (input: NewSpotInput) => {
    const base = cityInfo[input.city].center
    const payload = new FormData()
    payload.append('name', input.name)
    payload.append('korean_name', input.koreanName || '')
    payload.append('city', input.city)
    payload.append('district', input.district)
    payload.append('venue_type', input.type)
    payload.append('terrains', input.terrains.join(','))
    payload.append('price', input.price || '')
    payload.append('price_unit', input.priceUnit || 'session')
    payload.append('review', input.review)
    payload.append('submitter_name', profile?.name || '匿名滑手')
    payload.append('submitter_uid', profile?.uid || '')
    payload.append('latitude', String(input.lat ?? base[0]))
    payload.append('longitude', String(input.lng ?? base[1]))
    if (input.image) payload.append('image', input.image)

    const response = await fetch(`${API_BASE}/api/venue-apps/`, {
      method: 'POST',
      body: payload,
    })

    if (!response.ok) {
      let detail = '提交失败，请稍后重试'
      try {
        const data = await response.json()
        detail = data.detail || JSON.stringify(data)
      } catch {
        detail = `提交失败（HTTP ${response.status}）`
      }
      throw new Error(detail)
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-white md:flex-row">
      <aside
        className={`${
          mobileView === 'map' ? 'hidden' : 'flex'
        } h-full w-full shrink-0 flex-col border-b border-gray-100 bg-white md:flex md:h-full md:w-[420px] md:border-b-0 md:border-r`}
      >
        <header className="border-b border-gray-100 px-5 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
                <BrandMark size={22} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Skatespot</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 frosted px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-400"
              >
                <Filter size={14} /> 筛选
              </button>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
              >
                <Plus size={14} /> 上传场地
              </button>
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 frosted py-1 pl-1 pr-3 text-xs font-medium text-gray-700 transition hover:border-gray-400"
                aria-label="个人中心"
              >
                {profile?.avatar_data ? (
                  <img src={profile.avatar_data} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gray-100 text-gray-500">
                    <User size={14} />
                  </span>
                )}
                <span className="hidden max-w-20 truncate sm:inline">{profile?.name || '我的'}</span>
              </button>
            </div>
          </div>

          <div className="mt-5 hidden rounded-2xl bg-gray-50 px-4 py-3.5 md:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Explore Korea</p>
            <p className="mt-1 text-lg font-bold leading-snug text-ink">Find your line.<br />Find your spot.</p>
            <p className="mt-1 text-[11px] text-gray-500">从首尔到济州，发现属于你的滑板场地。</p>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3 md:mt-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Korea Skate Map</p>
              <h2 className="mt-1.5 text-3xl font-bold tracking-tight text-ink">
                {cityInfo[city].label} <span className="text-gray-300">/ {cityInfo[city].en}</span>
              </h2>
              <p className="mt-1 text-xs text-gray-500">共 {filteredSpots.length} 个滑板场地</p>
            </div>
            <div className="relative">
              <select
                value={city}
                onChange={(event) => switchCity(event.target.value as CityKey)}
                className="appearance-none rounded-full border border-gray-200 bg-white/80 py-2 pl-4 pr-9 text-xs font-medium text-gray-700 outline-none frosted transition focus:border-accent"
              >
                {(Object.keys(cityInfo) as CityKey[]).map((key) => (
                  <option key={key} value={key}>{cityInfo[key].label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {districts.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setDistrict(item)
                  setSelectedId(null)
                }}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition ${
                  district === item
                    ? 'border-ink bg-ink text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {item === 'all' ? '全部' : item}
              </button>
            ))}
          </div>
        </header>

        {selectedSpot ? (
          <SpotDetail
            spot={selectedSpot}
            onBack={() => setSelectedId(null)}
            onAddReview={addReview}
            onShowMap={() => setMobileView('map')}
          />
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {filteredSpots.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 py-14 text-center text-sm text-gray-400">
                没有符合条件的场地，试试调整筛选或切换城市。
              </div>
            )}
            {filteredSpots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} onClick={() => handleSelect(spot.id)} />
            ))}
          </div>
        )}
      </aside>

      <main
        className={`${
          mobileView === 'list' ? 'hidden' : 'block'
        } relative h-full w-full flex-1 md:block md:h-full`}
      >
        <MapView
          spots={filteredSpots}
          city={city}
          selectedId={selectedId}
          onSelect={handleSelect}
          visible={mobileView === 'map'}
        />
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-gray-100 bg-white/80 px-4 py-2 text-[11px] font-medium text-gray-600 frosted">
          {STADIA_KEY ? 'Stadia Maps · Light · Korea' : 'OpenStreetMap · Light · Korea'}
        </div>
      </main>

      {mobileView === 'map' && selectedSpot && (
        <div className="fixed bottom-24 left-4 right-4 z-[900] rounded-2xl border border-gray-100 bg-white/95 p-4 shadow-soft frosted md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{selectedSpot.name}</p>
              <p className="mt-0.5 truncate text-[11px] text-gray-500">
                {selectedSpot.koreanName || selectedSpot.district}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-white"
            >
              详情
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMobileView((prev) => (prev === 'list' ? 'map' : 'list'))}
        className="fixed bottom-6 left-1/2 z-[950] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-soft md:hidden"
      >
        {mobileView === 'list' ? <MapPin size={16} /> : <List size={16} />}
        {mobileView === 'list' ? '查看地图' : '返回列表'}
      </button>

      {filterOpen && (
        <FilterModal
          filters={filters}
          onClose={() => setFilterOpen(false)}
          onApply={(next) => {
            setFilters(next)
            setFilterOpen(false)
            setSelectedId(null)
          }}
        />
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onSubmit={submitApplication} />}

      {accountOpen && profile && (
        <AccountModal
          profile={profile}
          onUpdated={(next) => setProfile(next)}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </div>
  )
}
