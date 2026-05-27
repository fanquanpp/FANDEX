<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useProgress } from '@/composables/useProgress'
import { getModuleMeta, moduleCategories } from '@/data/modules'
import { ref, computed, onMounted } from 'vue'
import type { Module, ModuleFile } from '@/types'

const route = useRoute()
const router = useRouter()
const { isRead, getProgressPercent } = useProgress()
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
    <div class="module-header">
      <div class="header-bar" :style="{ background: meta.color }"></div>
      <div class="header-body">
        <div class="header-top">
          <span class="header-icon" :style="{ background: meta.color }">{{ meta.icon }}</span>
          <div class="header-text">
            <span v-if="categoryInfo" class="header-tag" :style="{ background: categoryInfo.color }">{{ categoryInfo.label }}</span>
            <h1 class="header-title">{{ meta.title }}</h1>
            <p class="header-desc">{{ meta.description }}</p>
          </div>
        </div>
        <div class="header-progress">
          <span class="progress-label">{{ readCount }} / {{ files.length }} 篇已读</span>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progress + '%', background: meta.color }"></div>
          </div>
          <span class="progress-pct">{{ progress }}%</span>
        </div>
      </div>
    </div>

    <div class="file-table-wrap">
      <table class="file-table">
        <thead>
          <tr>
            <th class="col-status"></th>
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
              <span class="status-dot" :class="{ read: isRead(file.path) }"></span>
            </td>
            <td class="col-title">{{ file.title }}</td>
            <td class="col-size">{{ formatSize(file.size) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else class="not-found">
    <h2>模块未找到</h2>
    <button @click="router.push({ name: 'home' })">返回首页</button>
  </div>
</template>

<style scoped>
.module-page {
  padding: var(--spacing-md) var(--spacing-lg) var(--spacing-2xl);
  max-width: 100%;
  width: 100%;
}

.module-header {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  margin-bottom: var(--spacing-lg);
  display: flex;
  overflow: hidden;
}

.header-bar {
  width: 5px;
  flex-shrink: 0;
}

.header-body {
  flex: 1;
  padding: var(--spacing-lg);
}

.header-top {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: #fff;
  font-weight: 700;
  font-size: 1em;
  font-family: var(--font-display);
  flex-shrink: 0;
}

.header-text {
  min-width: 0;
}

.header-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.62em;
  font-weight: 700;
  color: #fff;
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-xs);
}

.header-title {
  font-size: 1.4em;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--spacing-xs) 0;
  font-family: var(--font-display);
}

.header-desc {
  font-size: 0.88em;
  color: var(--color-text-secondary);
  margin: 0;
}

.header-progress {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.progress-label {
  font-size: 0.78em;
  color: var(--color-text-secondary);
  font-family: var(--font-display);
  white-space: nowrap;
}

.progress-track {
  flex: 1;
  height: 8px;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width var(--transition-base);
}

.progress-pct {
  font-size: 0.82em;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-display);
  min-width: 38px;
  text-align: right;
}

.file-table-wrap {
  border: 1px solid var(--color-border-light);
  overflow: hidden;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
}

.file-table th {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  font-size: 0.7em;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: var(--color-text);
  font-family: var(--font-display);
  border-bottom: 1px solid var(--color-border);
}

.file-table td {
  padding: var(--spacing-sm) var(--spacing-md);
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
  width: 36px;
}

.col-size {
  width: 80px;
  text-align: right;
  font-size: 0.78em;
  color: var(--color-text-tertiary);
  font-family: var(--font-display);
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border: 2px solid var(--color-border-light);
  transition: all var(--transition-fast);
}

.status-dot.read {
  background: var(--color-success);
  border-color: var(--color-success);
}

.col-title {
  font-weight: 500;
  color: var(--color-text);
}

.file-row.read .col-title {
  color: var(--color-text-tertiary);
}

.not-found {
  text-align: center;
  padding: var(--spacing-3xl);
  color: var(--color-text-secondary);
}

.not-found h2 {
  margin-bottom: var(--spacing-md);
  font-family: var(--font-display);
}

.not-found button {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 0.82em;
  letter-spacing: 0.05em;
  transition: all var(--transition-fast);
}

.not-found button:hover {
  background: var(--color-primary);
  color: #fff;
}
</style>
