<script setup>
import { nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import axios from 'axios'
import * as L from 'leaflet'

const cityCenters = {
  Seoul: [37.5665, 126.978],
  Busan: [35.1796, 129.0756],
  Incheon: [37.4563, 126.7052],
  Daejeon: [36.3504, 127.3845],
  Daegu: [35.8714, 128.6014],
  Gwangju: [35.1595, 126.8526],
  Ulsan: [35.5384, 129.3114],
  Sejong: [36.48, 127.289],
  Gyeonggi: [37.4138, 127.5183],
  Gangwon: [37.8228, 128.1555],
  Chungbuk: [36.8, 127.7],
  Chungnam: [36.5184, 126.8],
  Jeonbuk: [35.7175, 127.153],
  Jeonnam: [34.8679, 126.991],
  Gyeongbuk: [36.4919, 128.8889],
  Gyeongnam: [35.4606, 128.2132],
  Jeju: [33.4996, 126.5312],
}

const cities = [
  ['Seoul', '首尔'], ['Busan', '釜山'], ['Incheon', '仁川'], ['Daejeon', '大田'],
  ['Daegu', '大邱'], ['Gwangju', '光州'], ['Ulsan', '蔚山'], ['Sejong', '世宗'],
  ['Gyeonggi', '京畿道'], ['Gangwon', '江原道'], ['Chungbuk', '忠清北道'],
  ['Chungnam', '忠清南道'], ['Jeonbuk', '全罗北道'], ['Jeonnam', '全罗南道'],
  ['Gyeongbuk', '庆尚北道'], ['Gyeongnam', '庆尚南道'], ['Jeju', '济州'],
]

const venueTypes = [
  ['indoor', '室内滑板场'],
  ['outdoor', '室外滑板场'],
  ['street', '街头场地'],
]

const terrainOptions = [
  ['ledge', '小台阶 Ledge'],
  ['bank', '抛台 Bank'],
  ['bowl', 'U池 Bowl'],
  ['rail', '扶手 Handrail'],
  ['flat', '平地 Flatground'],
]

const open = ref(false)
const submitting = ref(false)
const message = ref('')
const error = ref('')
const coords = ref([...cityCenters.Seoul])
const mapEl = ref(null)

let map = null
let marker = null

const form = reactive({
  name: '',
  korean_name: '',
  city: 'Seoul',
  district: '',
  venue_type: 'outdoor',
  terrains: [],
  review: '',
  image: null,
})

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return ''
}

function updateMarker() {
  if (!map) return
  if (marker) {
    marker.remove()
    marker = null
  }
  marker = L.marker(coords.value).addTo(map)
  map.setView(coords.value, 15, { animate: false })
}

async function initMap() {
  await nextTick()
  if (!mapEl.value || map) return
  map = L.map(mapEl.value, { zoomControl: false, attributionControl: false })
    .setView(coords.value, 13)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  map.on('click', (event) => {
    coords.value = [event.latlng.lat, event.latlng.lng]
    updateMarker()
  })
  updateMarker()
  setTimeout(() => map && map.invalidateSize(), 100)
}

function destroyMap() {
  if (map) {
    map.remove()
    map = null
    marker = null
  }
}

watch(open, async (value) => {
  if (value) {
    message.value = ''
    error.value = ''
    await initMap()
  } else {
    destroyMap()
  }
})

watch(() => form.city, (city) => {
  coords.value = [...cityCenters[city]]
  if (map) {
    map.flyTo(coords.value, 13, { duration: 0.5 })
    updateMarker()
  }
})

onBeforeUnmount(destroyMap)

function onImageChange(event) {
  form.image = event.target.files[0] || null
}

async function submit() {
  error.value = ''
  message.value = ''
  if (!form.name.trim() || !form.district.trim()) {
    error.value = '请填写场地名称和行政区。'
    return
  }

  submitting.value = true
  const payload = new FormData()
  payload.append('name', form.name.trim())
  payload.append('korean_name', form.korean_name.trim())
  payload.append('city', form.city)
  payload.append('district', form.district.trim())
  payload.append('venue_type', form.venue_type)
  payload.append('terrains', form.terrains.join(','))
  payload.append('review', form.review.trim())
  payload.append('latitude', coords.value[0])
  payload.append('longitude', coords.value[1])
  if (form.image) payload.append('image', form.image)

  try {
    await axios.post('/api/venue-apps/', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-CSRFToken': getCookie('csrftoken'),
      },
    })
    message.value = '已提交，等待审核'
    form.name = ''
    form.korean_name = ''
    form.district = ''
    form.review = ''
    form.terrains = []
    form.image = null
  } catch (err) {
    error.value = '提交失败：' + (err.response?.data?.detail || err.message || '请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <button class="apply-trigger" type="button" @click="open = true">申请场地</button>

    <div v-if="open" class="modal-backdrop" @click.self="open = false">
      <div class="modal">
        <button class="close" type="button" aria-label="关闭" @click="open = false">×</button>
        <h2>申请新增滑板场地</h2>
        <p class="subtitle">提交后由管理员审核，审核通过后才会展示在地图上。</p>

        <form @submit.prevent="submit">
          <label>场地名称<input v-model="form.name" placeholder="例如：弘大街头点" /></label>
          <label>韩文名称（用于 Naver 导航，可选）<input v-model="form.korean_name" placeholder="例如：홍대 스트릿 스팟" /></label>

          <div class="row">
            <label>城市
              <select v-model="form.city">
                <option v-for="[value, label] in cities" :key="value" :value="value">{{ label }}</option>
              </select>
            </label>
            <label>行政区<input v-model="form.district" placeholder="例如：麻浦区" /></label>
          </div>

          <label>场地类型
            <select v-model="form.venue_type">
              <option v-for="[value, label] in venueTypes" :key="value" :value="value">{{ label }}</option>
            </select>
          </label>

          <div class="field">
            <span>地图选点（点击地图即可，无需手填经纬度）</span>
            <div ref="mapEl" class="picker-map"></div>
            <small>已选坐标：{{ coords[0].toFixed(5) }}, {{ coords[1].toFixed(5) }}</small>
          </div>

          <div class="field">
            <span>包含地形</span>
            <div class="checks">
              <label v-for="[value, label] in terrainOptions" :key="value" class="check">
                <input v-model="form.terrains" type="checkbox" :value="value" /> {{ label }}
              </label>
            </div>
          </div>

          <label>个人评价<textarea v-model="form.review" rows="3" placeholder="简单描述场地体验…"></textarea></label>
          <label>上传图片<input type="file" accept="image/*" @change="onImageChange" /></label>

          <p v-if="message" class="success">{{ message }}</p>
          <p v-if="error" class="error">{{ error }}</p>

          <button class="submit" type="submit" :disabled="submitting">
            {{ submitting ? '提交中…' : '提交申请' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.apply-trigger {
  margin-top: 1.5rem;
  border: 0;
  border-radius: 999px;
  padding: 0.8rem 1.8rem;
  background: #171717;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.24);
  padding: 1rem;
}
.modal {
  position: relative;
  width: min(100%, 560px);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 20px;
  background: #fff;
  padding: 1.6rem;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
}
.close {
  position: absolute;
  right: 1.2rem;
  top: 1rem;
  border: 0;
  background: transparent;
  font-size: 1.4rem;
  color: #6b7280;
  cursor: pointer;
}
h2 { font-size: 1.5rem; margin: 0; }
.subtitle { font-size: 0.8rem; color: #6b7280; margin: 0.4rem 0 1.2rem; }
form { display: grid; gap: 0.85rem; }
label, .field { display: grid; gap: 0.35rem; font-size: 0.78rem; color: #4b5563; }
input, select, textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
  font: inherit;
  outline: none;
}
input:focus, select:focus, textarea:focus { border-color: #d4af37; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.picker-map { width: 100%; height: 180px; border-radius: 10px; border: 1px solid #e5e7eb; }
small { color: #9ca3af; }
.checks { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.check { display: inline-flex; align-items: center; gap: 0.35rem; }
.check input { width: auto; }
.success { color: #15803d; font-size: 0.85rem; margin: 0; }
.error { color: #b91c1c; font-size: 0.85rem; margin: 0; }
.submit {
  border: 0;
  border-radius: 999px;
  padding: 0.85rem;
  background: #171717;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.submit:disabled { opacity: 0.6; }
</style>
