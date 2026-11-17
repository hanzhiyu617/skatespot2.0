<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'

const items = ref([])
const loaded = ref(false)

onMounted(async () => {
  try {
    const response = await axios.get('/api/venue-apps/approved/')
    items.value = response.data
  } catch (error) {
    items.value = []
  } finally {
    loaded.value = true
  }
})
</script>

<template>
  <div class="approved">
    <p class="title">已通过审核的场地</p>
    <p v-if="loaded && items.length === 0" class="empty">暂无已审核场地。</p>
    <ul v-else>
      <li v-for="item in items" :key="item.id">
        <strong>{{ item.name }}</strong>
        <span v-if="item.korean_name">{{ item.korean_name }}</span>
        <span>{{ item.city }} · {{ item.district }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.approved {
  width: min(100%, 640px);
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(23, 23, 23, 0.06);
  text-align: left;
}
.title { font-size: 0.8rem; font-weight: 600; color: #171717; margin-bottom: 0.6rem; }
.empty { font-size: 0.8rem; color: #9ca3af; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
li { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.78rem; color: #6b7280; }
li strong { color: #171717; }
</style>
