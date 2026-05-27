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
const sidebarOpen = ref(true)
const searchQuery = ref('')
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
        <button class="sidebar-toggle" @click="toggleSidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div class="nav-logo" @click="goHome">
          <span class="logo-block"></span>
          <span class="logo-text">MN</span>
        </div>
      </div>
      <div class="nav-center">
        <div class="nav-search">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="12" height="12" />
            <line x1="15" y1="15" x2="21" y2="21" />
          </svg>
          <input v-model="searchQuery" type="text" placeholder="搜索模块..." class="search-input" />
        </div>
      </div>
      <div class="nav-right">
        <button class="theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'">
          <svg v-if="theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="2" y="2" width="8" height="8" />
            <rect x="14" y="2" width="8" height="8" />
            <rect x="2" y="14" width="8" height="8" />
            <rect x="14" y="14" width="8" height="8" />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="3" y="3" width="18" height="18" />
            <rect x="7" y="7" width="10" height="10" />
          </svg>
        </button>
      </div>
    </header>

    <aside v-if="sidebarOpen && currentModule" class="app-sidebar">
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
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--nav-height) 1fr;
  grid-template-areas: "nav nav" "sidebar main";
  min-height: 100vh;
  transition: grid-template-columns var(--transition-base);
}

.app-layout.sidebar-collapsed {
  grid-template-columns: 0 1fr;
}

.app-nav {
  grid-area: nav;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
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
  gap: var(--spacing-md);
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 2px solid var(--color-border);
  border-radius: 0;
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sidebar-toggle:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
  border-color: var(--color-primary);
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

.logo-block {
  display: inline-block;
  width: 12px;
  height: 36px;
  background: var(--color-primary);
}

.logo-text {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 10px;
  background: var(--color-text);
  color: var(--color-bg);
  font-weight: 700;
  font-size: 1em;
  font-family: var(--font-display);
  letter-spacing: 0.05em;
}

.nav-center {
  flex: 1;
  max-width: 400px;
  margin: 0 var(--spacing-xl);
}

.nav-search {
  position: relative;
  width: 100%;
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
  padding: 8px 12px 8px 34px;
  border: 2px solid var(--color-border);
  border-radius: 0;
  background: var(--color-bg-card);
  color: var(--color-text);
  font-size: 0.875em;
  font-family: var(--font-body);
  outline: none;
  transition: all var(--transition-fast);
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
  background: var(--color-bg);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 2px solid var(--color-border);
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
  grid-area: sidebar;
  background: var(--color-sidebar-bg);
  border-right: 2px solid var(--color-border);
  overflow-y: auto;
  height: calc(100vh - var(--nav-height));
  position: sticky;
  top: var(--nav-height);
}

.sidebar-header {
  position: relative;
  padding: var(--spacing-lg);
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
  gap: var(--spacing-md);
  padding-left: 10px;
}

.module-icon-block {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 0;
  color: #fff;
  font-weight: 700;
  font-size: 0.85em;
  font-family: var(--font-display);
  flex-shrink: 0;
}

.module-info-text {
  min-width: 0;
}

.module-name {
  font-size: 1em;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  line-height: 1.3;
  font-family: var(--font-display);
}

.module-desc {
  font-size: 0.75em;
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
  font-size: 0.85em;
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
  font-size: 0.85em;
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
  grid-area: main;
  overflow-y: auto;
  min-height: calc(100vh - var(--nav-height));
}

@media (max-width: 768px) {
  .app-layout {
    grid-template-columns: 1fr;
    grid-template-areas: "nav" "main";
  }

  .app-sidebar {
    position: fixed;
    left: 0;
    top: var(--nav-height);
    width: var(--sidebar-width);
    z-index: 90;
    box-shadow: 8px 0 0 var(--color-shadow);
  }

  .nav-center {
    display: none;
  }

  .logo-text {
    display: none;
  }
}
</style>
