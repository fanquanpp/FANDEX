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

const groupedModules = computed(() => {
  return categoryOrder
    .filter(cat => getModulesByCategory(cat).some(m => filteredMetas.value.includes(m)))
    .map(cat => ({
      key: cat,
      label: moduleCategories[cat].label,
      color: moduleCategories[cat].color,
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
  <div class="home-page">
    <section class="home-header">
      <h1 class="site-title">CODEX</h1>
      <p class="site-subtitle">开发者知识库</p>
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/></svg>
        <input v-model="searchQuery" type="text" placeholder="搜索模块..." class="search-input" />
      </div>
      <div class="stats-row">
        <span class="stat"><strong>{{ modules.length }}</strong> 模块</span>
        <span class="stat-sep">|</span>
        <span class="stat"><strong>{{ totalFiles }}</strong> 文档</span>
        <span class="stat-sep">|</span>
        <span class="stat"><strong>{{ totalProgress }}%</strong> 进度</span>
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
            @click="navigateToModule(mod.id)"
          >
            <div class="card-icon" :style="{ background: group.color }">
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
.home-page {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg) var(--spacing-3xl);
}

.home-header {
  padding: var(--spacing-xl) 0 var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.site-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.2em;
  margin: 0 0 var(--spacing-xs) 0;
}

.site-subtitle {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-md) 0;
  letter-spacing: 0.08em;
}

.search-box {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto var(--spacing-md) auto;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 14px 8px 34px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-input:focus {
  border-color: var(--color-primary);
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
  font-family: var(--font-display);
}

.stats-row strong {
  color: var(--color-text);
}

.stat-sep {
  opacity: 0.3;
}

.category-section {
  margin-bottom: var(--spacing-lg);
}

.category-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-left: 3px solid var(--color-border);
  background: var(--color-bg-card);
  margin-bottom: var(--spacing-sm);
}

.category-tag {
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
  padding: 3px 10px;
  letter-spacing: 0.06em;
}

.category-count {
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--color-text-tertiary);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1px;
  background: var(--color-border-light);
  border: 1px solid var(--color-border-light);
}

.module-card {
  background: var(--color-bg);
  padding: var(--spacing-md);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  transition: background var(--transition-fast);
}

.module-card:hover {
  background: var(--color-bg-hover);
}

.card-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
}

.card-icon-text {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.card-body {
  flex: 1;
}

.card-title {
  font-family: var(--font-display);
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 2px 0;
}

.card-desc {
  font-size: 0.76rem;
  font-weight: 400;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-files {
  font-family: var(--font-display);
  font-size: 0.66rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.progress-track {
  flex: 1;
  height: 6px;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-card);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.4s;
}

.progress-pct {
  font-family: var(--font-display);
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  min-width: 26px;
  text-align: right;
}

@media (max-width: 768px) {
  .home-page {
    padding: 0 var(--spacing-md) var(--spacing-xl);
  }

  .site-title {
    font-size: 1.4rem;
  }

  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
