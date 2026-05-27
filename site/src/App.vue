<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useProgress } from '@/composables/useProgress'
import { ref, computed, watch } from 'vue'
import type { Module, ModuleFile } from '@/types'
import { getModuleMeta } from '@/data/modules'

const router = useRouter()
const { theme, toggleTheme } = useTheme()
const { isRead } = useProgress()
const sidebarOpen = ref(false)
const currentModule = ref<Module | null>(null)
const currentFiles = ref<ModuleFile[]>([])
const currentDocPath = ref('')

const moduleMeta = computed(() => currentModule.value ? getModuleMeta(currentModule.value.id) : null)

watch(() => router.currentRoute.value, (to) => {
  if (to.name === 'module' && to.params.id) {
    fetchModuleData(to.params.id as string)
  } else if (to.name === 'doc' && to.params.moduleId) {
    fetchModuleData(to.params.moduleId as string)
    currentDocPath.value = to.params.moduleId + '/' + to.params.slug + '.md'
  } else {
    currentModule.value = null
    currentFiles.value = []
    currentDocPath.value = ''
  }
}, { immediate: true })

async function fetchModuleData(moduleId: string) {
  try {
    const base = import.meta.env.BASE_URL || '/MyNotebook/'
    const modulesUrl = import.meta.env.DEV ? '/api/modules' : base + 'modules.json'
    const res = await fetch(modulesUrl)
    const modules: Module[] = await res.json()
    const mod = modules.find(m => m.id === moduleId)
    if (mod) {
      currentModule.value = mod
      currentFiles.value = mod.files
    }
  } catch (e) {
    console.error('Failed to fetch module data:', e)
  }
}

function navigateToDoc(moduleId: string, slug: string) {
  router.push({ name: 'doc', params: { moduleId, slug } })
}

function goHome() {
  router.push({ name: 'home' })
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}
</script>

<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': !sidebarOpen }">
    <header class="app-nav">
      <div class="nav-left">
        <button class="sidebar-toggle" @click="toggleSidebar" :disabled="!currentModule">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div class="nav-logo" @click="goHome">
          <span class="logo-mark"></span>
          <span class="logo-text">CODEX</span>
        </div>
      </div>
      <div class="nav-right">
        <button class="theme-toggle" @click="toggleTheme">
          <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </header>

    <aside v-if="currentModule" class="app-sidebar">
      <div class="sidebar-header" v-if="moduleMeta">
        <div class="sidebar-color-bar" :style="{ background: moduleMeta.color }"></div>
        <div class="sidebar-module-info">
          <span class="module-icon-block" :style="{ background: moduleMeta.color }">{{ moduleMeta.icon }}</span>
          <div class="module-info-text">
            <h3 class="module-name">{{ moduleMeta.title }}</h3>
            <span class="module-desc">{{ moduleMeta.description }}</span>
          </div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <button class="sidebar-back" @click="goHome">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="18 6 6 12 18 18" />
          </svg>
          <span>返回首页</span>
        </button>
        <ul class="file-list">
          <li
            v-for="file in currentFiles"
            :key="file.slug"
            class="file-item"
            :class="{ active: currentDocPath === file.path, read: isRead(file.path) }"
          >
            <button @click="navigateToDoc(currentModule!.id, file.slug)" class="file-link">
              <span class="file-status-block" :class="{ read: isRead(file.path) }"></span>
              <span class="file-title">{{ file.title }}</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>

    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: grid;
  grid-template-rows: var(--nav-height) 1fr;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
  transition: grid-template-columns var(--transition-base);
}

.app-layout.sidebar-collapsed {
  grid-template-columns: 0 1fr;
}

.app-nav {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-md);
  background: var(--color-nav-bg);
  backdrop-filter: blur(12px);
  border-bottom: 2px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--nav-height);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 0;
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.sidebar-toggle:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text);
  border-color: var(--color-primary);
}

.sidebar-toggle:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.nav-logo:hover {
  opacity: 0.8;
}

.logo-mark {
  display: inline-block;
  width: 8px;
  height: 28px;
  background: var(--color-primary);
}

.logo-text {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 8px;
  background: var(--color-text);
  color: var(--color-bg);
  font-weight: 700;
  font-size: 0.8em;
  font-family: var(--font-display);
  letter-spacing: 0.1em;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 0;
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--color-bg-hover);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.app-sidebar {
  grid-row: 2;
  grid-column: 1;
  background: var(--color-bg-sidebar);
  border-right: 2px solid var(--color-border);
  overflow-y: auto;
  position: sticky;
  top: var(--nav-height);
  height: calc(100vh - var(--nav-height));
  transition: opacity var(--transition-base);
}

.sidebar-collapsed .app-sidebar {
  opacity: 0;
  pointer-events: none;
}

.sidebar-header {
  position: relative;
  padding: var(--spacing-md);
  border-bottom: 2px solid var(--color-border);
}

.sidebar-color-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 100%;
}

.sidebar-module-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding-left: 10px;
}

.module-icon-block {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 0;
  color: #fff;
  font-weight: 700;
  font-size: 0.8em;
  font-family: var(--font-display);
  flex-shrink: 0;
}

.module-info-text {
  min-width: 0;
}

.module-name {
  font-size: 0.95em;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  line-height: 1.3;
  font-family: var(--font-display);
}

.module-desc {
  font-size: 0.72em;
  color: var(--color-text-tertiary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-nav {
  padding: var(--spacing-sm);
}

.sidebar-back {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8em;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-xs);
}

.sidebar-back:hover {
  background: var(--color-bg-hover);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.file-item {
  margin-bottom: 0;
}

.file-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-left: 3px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8em;
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: 1.4;
}

.file-link:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
  border-left-color: var(--color-border-light);
}

.file-item.active .file-link {
  background: var(--color-bg-hover);
  color: var(--color-primary);
  font-weight: 500;
  border-left-color: var(--color-primary);
}

.file-item.read .file-link {
  color: var(--color-text-tertiary);
}

.file-status-block {
  width: 8px;
  height: 8px;
  border-radius: 0;
  background: var(--color-border-light);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.file-status-block.read {
  background: var(--color-secondary);
}

.file-item.active .file-status-block {
  background: var(--color-primary);
}

.file-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-main {
  grid-row: 2;
  grid-column: 2;
  overflow-y: auto;
  min-height: 0;
}
</style>
