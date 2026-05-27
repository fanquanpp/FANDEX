<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useProgress } from '@/composables/useProgress'
import { getModuleMeta, moduleCategories } from '@/data/modules'
import { ref, computed, onMounted } from 'vue'
import type { Module, ModuleFile } from '@/types'

const route = useRoute()
const router = useRouter()
const { isRead, toggleRead, getProgressPercent } = useProgress()
const moduleId = computed(() => route.params.id as string)
const meta = computed(() => getModuleMeta(moduleId.value))
const files = ref<ModuleFile[]>([])

const base = import.meta.env.BASE_URL || '/MyNotebook/'

onMounted(async () => {
  try {
    const modulesUrl = import.meta.env.DEV ? '/api/modules' : base + 'modules.json'
    const res = await fetch(modulesUrl)
    const modules: Module[] = await res.json()
    const mod = modules.find(m => m.id === moduleId.value)
    if (mod) files.value = mod.files
  } catch (e) {
    console.error(e)
  }
})

const progress = computed(() => getProgressPercent(files.value.map(f => f.path)))
const readCount = computed(() => files.value.filter(f => isRead(f.path)).length)

function navigateToDoc(slug: string) {
  router.push({ name: 'doc', params: { moduleId: moduleId.value, slug } })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const categoryInfo = computed(() => {
  if (!meta.value) return null
  return moduleCategories[meta.value.category] || null
})
</script>

<template>
  <div class="module-page" v-if="meta">
    <div class="module-hero" :style="{ '--module-color': meta.color }">
      <div class="hero-color-bar" :style="{ background: meta.color }"></div>
      <div class="hero-content">
        <div class="hero-top">
          <span class="hero-icon-block" :style="{ background: meta.color }">{{ meta.icon }}</span>
          <div class="hero-text">
            <span v-if="categoryInfo" class="hero-tag" :style="{ background: categoryInfo.color }">{{ categoryInfo.label }}</span>
            <h1 class="hero-title">{{ meta.title }}</h1>
            <p class="hero-desc">{{ meta.description }}</p>
          </div>
        </div>
        <div class="hero-progress">
          <div class="progress-info">
            <span class="progress-label">学习进度</span>
            <span class="progress-value">{{ readCount }} / {{ files.length }} 篇已读</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%', background: meta.color }"></div>
          </div>
          <span class="progress-percent">{{ progress }}%</span>
        </div>
      </div>
    </div>

    <div class="file-table-wrapper">
      <table class="file-table">
        <thead>
          <tr>
            <th class="col-status">状态</th>
            <th class="col-title">标题</th>
            <th class="col-size">大小</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="file in files"
            :key="file.slug"
            class="file-row"
            :class="{ read: isRead(file.path) }"
            @click="navigateToDoc(file.slug)"
          >
            <td class="col-status">
              <span class="status-block" :class="{ read: isRead(file.path) }"></span>
            </td>
            <td class="col-title">{{ file.title }}</td>
            <td class="col-size">{{ formatSize(file.size) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else class="module-not-found">
    <h2>模块未找到</h2>
    <button @click="router.push({ name: 'home' })">返回首页</button>
  </div>
</template>

<style scoped>
.module-page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.module-hero {
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: 0;
  margin-bottom: var(--spacing-xl);
  position: relative;
  overflow: hidden;
  display: flex;
}

.hero-color-bar {
  width: 8px;
  flex-shrink: 0;
}

.hero-content {
  flex: 1;
  padding: var(--spacing-xl);
}

.hero-top {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
  border-bottom: 2px solid var(--color-border);
}

.hero-icon-block {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 0;
  color: #fff;
  font-weight: 700;
  font-size: 1.2em;
  font-family: var(--font-display);
  flex-shrink: 0;
}

.hero-text {
  min-width: 0;
}

.hero-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 0.7em;
  font-weight: 700;
  color: #fff;
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-xs);
}

.hero-title {
  font-size: 1.75em;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--spacing-xs) 0;
  font-family: var(--font-display);
}

.hero-desc {
  font-size: 0.95em;
  color: var(--color-text-secondary);
  margin: 0;
}

.hero-progress {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100px;
}

.progress-label {
  font-size: 0.75em;
  color: var(--color-text-tertiary);
  font-weight: 500;
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.progress-value {
  font-size: 0.85em;
  color: var(--color-text-secondary);
  font-weight: 600;
  font-family: var(--font-display);
}

.progress-bar {
  flex: 1;
  height: 12px;
  border: 2px solid var(--color-border);
  border-radius: 0;
  background: var(--color-bg);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width var(--transition-base);
}

.progress-percent {
  font-size: 0.9em;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
  min-width: 48px;
  text-align: right;
}

.file-table-wrapper {
  border: 2px solid var(--color-border);
  border-radius: 0;
  overflow: hidden;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
}

.file-table th {
  padding: var(--spacing-md) var(--spacing-lg);
  text-align: left;
  font-size: 0.75em;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: var(--color-text);
  font-family: var(--font-display);
  border-bottom: 2px solid var(--color-border);
}

.file-table td {
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.file-table tr:last-child td {
  border-bottom: none;
}

.file-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.file-row:hover {
  background: var(--color-bg-hover);
}

.file-row.read td {
  color: var(--color-text-tertiary);
}

.col-status {
  width: 50px;
}

.col-size {
  width: 100px;
  text-align: right;
}

.status-block {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-border-light);
  border-radius: 0;
  transition: all var(--transition-fast);
}

.status-block.read {
  background: var(--color-secondary);
  border-color: var(--color-secondary);
}

.col-title {
  font-weight: 500;
  color: var(--color-text);
}

.file-row.read .col-title {
  color: var(--color-text-tertiary);
}

.col-size {
  font-size: 0.85em;
  color: var(--color-text-tertiary);
  font-family: var(--font-display);
}

.module-not-found {
  text-align: center;
  padding: var(--spacing-3xl);
  color: var(--color-text-secondary);
}

.module-not-found h2 {
  margin-bottom: var(--spacing-md);
  font-family: var(--font-display);
}

.module-not-found button {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 2px solid var(--color-primary);
  border-radius: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 0.85em;
  letter-spacing: 0.05em;
  transition: all var(--transition-fast);
}

.module-not-found button:hover {
  background: var(--color-primary);
  color: #fff;
}
</style>
