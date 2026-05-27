<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useProgress } from '@/composables/useProgress'
import { getModuleMeta } from '@/data/modules'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import { ref, computed, onMounted, watch } from 'vue'
import type { Module, ModuleFile } from '@/types'

const route = useRoute()
const router = useRouter()
const { isRead, toggleRead, markAsRead } = useProgress()

const moduleId = computed(() => route.params.moduleId as string)
const slug = computed(() => route.params.slug as string)
const meta = computed(() => getModuleMeta(moduleId.value))
const docPath = computed(() => moduleId.value + '/' + slug.value + '.md')

const content = ref('')
const files = ref<ModuleFile[]>([])
const loading = ref(true)

const base = import.meta.env.BASE_URL || '/MyNotebook/'

async function loadDoc() {
  loading.value = true
  try {
    const contentUrl = import.meta.env.DEV
      ? '/api/content/' + docPath.value
      : base + 'content/' + docPath.value
    const res = await fetch(contentUrl)
    if (res.ok) {
      content.value = await res.text()
      markAsRead(docPath.value)
    } else {
      content.value = '# 文档未找到\n\n请求的文档不存在。'
    }
  } catch (e) {
    content.value = '# 加载失败\n\n无法加载文档内容。'
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadFiles() {
  try {
    const modulesUrl = import.meta.env.DEV
      ? '/api/modules'
      : base + 'modules.json'
    const res = await fetch(modulesUrl)
    const modules: Module[] = await res.json()
    const mod = modules.find(m => m.id === moduleId.value)
    if (mod) files.value = mod.files
  } catch (e) {
    console.error(e)
  }
}

const currentIndex = computed(() => files.value.findIndex(f => f.slug === slug.value))
const prevDoc = computed(() => currentIndex.value > 0 ? files.value[currentIndex.value - 1] : null)
const nextDoc = computed(() => currentIndex.value < files.value.length - 1 ? files.value[currentIndex.value + 1] : null)

function navigateToDoc(fileSlug: string) {
  router.push({ name: 'doc', params: { moduleId: moduleId.value, slug: fileSlug } })
}

onMounted(() => { loadDoc(); loadFiles() })
watch([moduleId, slug], () => { loadDoc() })
</script>

<template>
  <div class="doc-page" v-if="meta">
    <nav class="breadcrumb">
      <router-link :to="{ name: 'home' }" class="bc-link">首页</router-link>
      <span class="bc-sep">/</span>
      <router-link :to="{ name: 'module', params: { id: moduleId } }" class="bc-link">{{ meta.title }}</router-link>
      <span class="bc-sep">/</span>
      <span class="bc-current">{{ slug }}</span>
    </nav>

    <div class="doc-content" v-if="!loading">
      <MarkdownRenderer :content="content" />
    </div>
    <div v-else class="doc-loading">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton short"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <div class="doc-footer">
      <button
        class="read-toggle"
        :class="{ active: isRead(docPath) }"
        @click="toggleRead(docPath)"
      >
        <span class="read-box" :class="{ checked: isRead(docPath) }"></span>
        {{ isRead(docPath) ? '已读' : '标记已读' }}
      </button>
    </div>

    <nav class="doc-nav" v-if="prevDoc || nextDoc">
      <button v-if="prevDoc" class="nav-btn" @click="navigateToDoc(prevDoc.slug)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 6 6 12 18 18"/></svg>
        <div class="nav-text">
          <span class="nav-label">上一篇</span>
          <span class="nav-title">{{ prevDoc.title }}</span>
        </div>
      </button>
      <div v-else class="nav-spacer"></div>
      <button v-if="nextDoc" class="nav-btn" @click="navigateToDoc(nextDoc.slug)">
        <div class="nav-text right">
          <span class="nav-label">下一篇</span>
          <span class="nav-title">{{ nextDoc.title }}</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 6 18 12 6 18"/></svg>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.doc-page {
  padding: var(--spacing-md) var(--spacing-lg) var(--spacing-2xl);
  max-width: 100%;
  width: 100%;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) 0;
  margin-bottom: var(--spacing-md);
  font-size: 0.78em;
  color: var(--color-text-tertiary);
  border-bottom: 1px solid var(--color-border-light);
}

.bc-link {
  color: var(--color-text-secondary);
  border-bottom: none;
  transition: color var(--transition-fast);
}

.bc-link:hover {
  color: var(--color-primary);
}

.bc-sep {
  color: var(--color-text-tertiary);
  opacity: 0.4;
  font-family: var(--font-display);
}

.bc-current {
  color: var(--color-text);
  font-weight: 500;
  font-family: var(--font-display);
}

.doc-content {
  min-height: 300px;
}

.doc-loading {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-3xl);
  color: var(--color-text-tertiary);
}

.skeleton {
  height: 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  width: 100%;
}

.skeleton.short {
  width: 60%;
}

.loading-text {
  margin-top: var(--spacing-md);
  font-family: var(--font-display);
  font-size: 0.78em;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
}

.doc-footer {
  margin: var(--spacing-lg) 0;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
}

.read-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: 0.78em;
  font-family: var(--font-display);
  cursor: pointer;
  transition: all var(--transition-fast);
  letter-spacing: 0.02em;
}

.read-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.read-toggle.active {
  background: var(--color-success);
  border-color: var(--color-success);
  color: #fff;
}

.read-box {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-border-light);
  transition: all var(--transition-fast);
}

.read-box.checked {
  background: #fff;
  border-color: #fff;
}

.doc-nav {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-family: var(--font-body);
  transition: all var(--transition-fast);
  max-width: 45%;
}

.nav-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.nav-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.nav-text.right {
  text-align: right;
}

.nav-label {
  font-size: 0.62em;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: var(--font-display);
}

.nav-title {
  font-size: 0.78em;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.nav-spacer {
  flex: 1;
}
</style>
