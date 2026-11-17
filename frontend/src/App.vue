<script setup>
import VenueApplyForm from './components/VenueApplyForm.vue'
import ApprovedVenueList from './components/ApprovedVenueList.vue'

const benefits = [
  { title: '极简设计', desc: '清除冗余，聚焦核心内容。' },
  { title: '响应式布局', desc: '在手机、平板与桌面上均呈现最佳效果。' },
  { title: '后台就绪', desc: '集成 Django 管理后台，一处登录即可管理全站。' }
]
</script>

<template>
  <main class="page">
    <section class="hero glass">
      <p class="eyebrow">DANIEL FRONTEND</p>
      <h1>简洁，即是力量</h1>
      <p class="lead">基于 Vue 3 构建的现代前台，已替代 Django 原生首页。</p>

      <ul class="benefits">
        <li v-for="item in benefits" :key="item.title">
          <span class="dot" aria-hidden="true"></span>
          <div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.desc }}</span>
          </div>
        </li>
      </ul>

      <a class="cta" href="/admin/">
        进入管理后台
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z" />
        </svg>
      </a>

      <VenueApplyForm />
      <ApprovedVenueList />
    </section>

    <footer>Powered by Vue 3 &amp; Django</footer>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 2rem 1.25rem;
  background: radial-gradient(circle at 20% 10%, #f7f3e8 0%, #ffffff 45%);
}

.glass {
  width: min(100%, 640px);
  padding: 3rem 2.5rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(23, 23, 23, 0.08);
  box-shadow: 0 20px 60px rgba(23, 23, 23, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  text-align: center;
}

.eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.32em;
  color: var(--secondary);
  margin-bottom: 1rem;
}

h1 {
  font-family: 'Poppins', sans-serif;
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 600;
  line-height: 1.2;
  color: var(--primary);
  margin-bottom: 1rem;
}

.lead {
  color: var(--secondary);
  font-size: 1rem;
  line-height: 1.7;
  margin-bottom: 2rem;
}

.benefits {
  list-style: none;
  display: grid;
  gap: 1rem;
  text-align: left;
  margin-bottom: 2.5rem;
}

.benefits li {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(23, 23, 23, 0.06);
}

.benefits strong {
  display: block;
  font-size: 0.95rem;
  color: var(--primary);
  margin-bottom: 0.2rem;
}

.benefits span:not(.dot) {
  font-size: 0.85rem;
  color: var(--secondary);
}

.dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  margin-top: 0.4rem;
  border-radius: 50%;
  background: var(--cta);
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1.8rem;
  border-radius: 999px;
  background: var(--cta);
  color: #1a1a1a;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 200ms ease, transform 200ms ease;
}

.cta:hover {
  background: #c19f2f;
  transform: translateY(-1px);
}

footer {
  font-size: 0.8rem;
  color: var(--secondary);
}
</style>
