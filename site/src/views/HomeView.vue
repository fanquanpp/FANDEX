<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useProgress } from '@/composables/useProgress'
import { moduleMetas, moduleCategories, getModulesByCategory } from '@/data/modules'
import { ref, computed, onMounted } from 'vue'
import type { Module } from '@/types'

const router = useRouter()
const { getProgressPercent } = useProgress()
const modules = ref<Module[]>([])
const searchQuery = ref('')

onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL || '/MyNotebook/'
    const modulesUrl = import.meta.env.DEV ? '/api/modules' : base + 'modules.json'
    const res = await fetch(modulesUrl)
    modules.value = await res.json()
  } catch (e) {
    console.error(e)
  }
})

const filteredMetas = computed(() => {
  if (!searchQuery.value) return moduleMetas
  const q = searchQuery.value.toLowerCase()
  return moduleMetas.filter(m =>
    m.title.toLowerCase().includes(q) ||
    m.description.toLowerCase().includes(q) ||
    m.id.toLowerCase().includes(q)
  )
})

const categoryOrder = ['basic-tools', 'programming', 'web-frontend', 'data', 'cs']

const constructivistColors: Record<string, string> = {
  'basic-tools': '#E53935',
  'programming': '#1565C0',
  'web-frontend': '#FDD835',
  'data': '#E53935',
  'cs': '#1565C0',
}

const groupedModules = computed(() => {
  return categoryOrder
    .filter(cat => getModulesByCategory(cat).some(m => filteredMetas.value.includes(m)))
    .map(cat => ({
      key: cat,
      label: moduleCategories[cat].label,
      color: constructivistColors[cat],
      modules: getModulesByCategory(cat).filter(m => filteredMetas.value.includes(m))
    }))
})

function getFileCount(moduleId: string): number {
  const mod = modules.value.find(m => m.id === moduleId)
  return mod ? mod.files.length : 0
}

function getModuleProgress(moduleId: string): number {
  const mod = modules.value.find(m => m.id === moduleId)
  if (!mod) return 0
  const paths = mod.files.map(f => f.path)
  return getProgressPercent(paths)
}

function navigateToModule(id: string) {
  router.push({ name: 'module', params: { id } })
}

const totalProgress = computed(() => {
  if (modules.value.length === 0) return 0
  const allPaths = modules.value.flatMap(m => m.files.map(f => f.path))
  return getProgressPercent(allPaths)
})

const totalFiles = computed(() => modules.value.reduce((s, m) => s + m.files.length, 0))
</script>

<template>
  <div class="construct-home">
    <section class="hero">
      <div class="hero-geo-left"></div>
      <div class="hero-center">
        <h1 class="hero-title">MYNOTEBOOK</h1>
        <p class="hero-subtitle">综合技术自学资料库</p>
        <div class="search-box">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/></svg>
          <input v-model="searchQuery" type="text" placeholder="搜索模块..." class="search-input" />
        </div>
      </div>
      <div class="hero-geo-right"></div>
    </section>

    <section class="stats-bar">
      <div class="stat-block">
        <span class="stat-num">{{ modules.length }}</span>
        <span class="stat-lbl">MODULES</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-block">
        <span class="stat-num">{{ totalFiles }}+</span>
        <span class="stat-lbl">DOCS</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-block">
        <span class="stat-num">{{ totalProgress }}%</span>
        <span class="stat-lbl">PROGRESS</span>
      </div>
    </section>

    <section class="categories">
      <div v-for="group in groupedModules" :key="group.key" class="category-section">
        <div class="category-header" :style="{ borderLeftColor: group.color }">
          <span class="category-tag" :style="{ background: group.color }">{{ group.label }}</span>
          <span class="category-count">{{ group.modules.length }}</span>
        </div>
        <div class="module-grid">
          <div
            v-for="mod in group.modules"
            :key="mod.id"
            class="module-card"
            :style="{ '--cat-color': group.color }"
            @click="navigateToModule(mod.id)"
          >
            <div class="card-icon-block" :style="{ background: group.color }">
              <span class="card-icon-text">{{ mod.icon }}</span>
            </div>
            <div class="card-body">
              <h3 class="card-title">{{ mod.title }}</h3>
              <p class="card-desc">{{ mod.description }}</p>
            </div>
            <div class="card-meta">
              <span class="card-files">{{ getFileCount(mod.id) }} 篇</span>
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: getModuleProgress(mod.id) + '%', background: group.color }"></div>
              </div>
              <span class="progress-pct">{{ getModuleProgress(mod.id) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Noto+Sans+SC:wght@300;400;700&display=swap');

:root {
  --c-red: #E53935;
  --c-yellow: #FDD835;
  --c-blue: #1565C0;
  --c-black: #1a1a1a;
  --c-white: #ffffff;
  --c-gray: #f0f0f0;
  --c-border: #1a1a1a;
  --font-head: 'Space Mono', monospace;
  --font-body: 'Noto Sans SC', sans-serif;
}

.construct-home {
  max-width: 1200px;
  margin: 0 auto;
  font-family: var(--font-body);
  color: var(--c-black);
}

.hero {
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  background: var(--c-black);
  padding: 64px 0;
  position: relative;
}

.hero::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--c-red);
}

.hero-geo-left {
  background: var(--c-red);
  border-right: 4px solid var(--c-black);
}

.hero-geo-right {
  background: var(--c-blue);
  border-left: 4px solid var(--c-black);
}

.hero-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 40px;
}

.hero-title {
  font-family: var(--font-head);
  font-size: 3.2rem;
  font-weight: 700;
  color: var(--c-white);
  letter-spacing: 0.25em;
  margin: 0 0 8px 0;
  line-height: 1;
  text-align: center;
}

.hero-subtitle {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 32px 0;
  letter-spacing: 0.15em;
}

.search-box {
  position: relative;
  width: 100%;
  max-width: 480px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 14px 20px 14px 46px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
  color: var(--c-white);
  font-family: var(--font-body);
  font-size: 0.95rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.search-input:focus {
  border-color: var(--c-yellow);
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  border-bottom: 3px solid var(--c-black);
  background: var(--c-gray);
}

.stat-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 40px;
}

.stat-num {
  font-family: var(--font-head);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--c-black);
  line-height: 1.2;
}

.stat-lbl {
  font-family: var(--font-head);
  font-size: 0.7rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.5);
  letter-spacing: 0.15em;
}

.stat-divider {
  width: 3px;
  height: 36px;
  background: var(--c-black);
}

.categories {
  padding: 0;
}

.category-section {
  border-bottom: 3px solid var(--c-black);
}

.category-section:last-child {
  border-bottom: none;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-left: 6px solid var(--c-black);
  background: var(--c-gray);
}

.category-tag {
  font-family: var(--font-head);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-white);
  padding: 6px 16px;
  letter-spacing: 0.1em;
}

.category-count {
  font-family: var(--font-head);
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.4);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0;
}

.module-card {
  border: 2px solid var(--c-black);
  border-top: none;
  border-left: none;
  padding: 20px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--c-white);
  transition: background 0.15s, border-color 0.15s;
  position: relative;
}

.module-card:hover {
  border-color: var(--cat-color);
  z-index: 1;
}

.module-card:hover .card-icon-block {
  background: var(--cat-color) !important;
}

.card-icon-block {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--c-black);
}

.card-icon-text {
  font-family: var(--font-head);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--c-white);
  line-height: 1;
}

.card-body {
  flex: 1;
}

.card-title {
  font-family: var(--font-head);
  font-size: 1rem;
  font-weight: 700;
  color: var(--c-black);
  margin: 0 0 4px 0;
  letter-spacing: 0.05em;
}

.card-desc {
  font-family: var(--font-body);
  font-size: 0.82rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.55);
  margin: 0;
  line-height: 1.5;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-files {
  font-family: var(--font-head);
  font-size: 0.72rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.progress-track {
  flex: 1;
  height: 10px;
  border: 2px solid var(--c-black);
  background: var(--c-gray);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.4s;
}

.progress-pct {
  font-family: var(--font-head);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--c-black);
  white-space: nowrap;
  min-width: 32px;
  text-align: right;
}

@media (max-width: 768px) {
  .hero {
    grid-template-columns: 40px 1fr 40px;
    padding: 40px 0;
  }

  .hero-title {
    font-size: 1.8rem;
    letter-spacing: 0.15em;
  }

  .hero-subtitle {
    font-size: 0.85rem;
  }

  .hero-center {
    padding: 0 16px;
  }

  .module-grid {
    grid-template-columns: 1fr;
  }

  .module-card {
    border-left: 2px solid var(--c-black);
  }

  .stat-block {
    padding: 0 20px;
  }

  .stat-num {
    font-size: 1.2rem;
  }
}
</style>
