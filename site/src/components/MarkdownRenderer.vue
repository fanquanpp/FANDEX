<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import { createHighlighter, type Highlighter } from 'shiki'

const props = defineProps<{ content: string }>()

const rendered = ref('')
const highlighter = ref<Highlighter | null>(null)
const tocExpanded = ref(false)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (!highlighter.value) return ''
    const loadedLangs = highlighter.value.getLoadedLanguages()
    const resolvedLang = loadedLangs.includes(lang) ? lang : (loadedLangs.includes('text') ? 'text' : 'plaintext')
    try {
      return highlighter.value.codeToHtml(code, { lang: resolvedLang, theme: 'github-dark' })
    } catch { return '' }
  },
})

md.use(anchor, {
  slugify: (s: string) => s.trim().toLowerCase().replace(/[\s+]/g, '-'),
  permalink: anchor.permalink['ariaHidden'],
})

const headings = ref<{ id: string; text: string; level: number }[]>([])

function extractHeadings(html: string) {
  const regex = /<h([1-6])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[1-6]>/g
  const result: { id: string; text: string; level: number }[] = []
  let match
  while ((match = regex.exec(html)) !== null) {
    result.push({ level: parseInt(match[1]), id: match[2], text: match[3].replace(/<[^>]*>/g, '') })
  }
  return result
}

function wrapCodeBlocks(html: string): string {
  return html.replace(/<pre[^>]*class="shiki"[^>]*>/g, (match) => {
    const langMatch = match.match(/language-(\w+)/)
    const lang = langMatch ? langMatch[1] : 'code'
    const wrapper = '<div class="code-block-wrapper"><div class="code-block-header"><span class="code-block-lang">' + lang + '</span><button class="copy-button" data-action="copy">Copy</button></div>'
    return wrapper + match
  })
}

watch(() => props.content, () => {
  const html = md.render(props.content)
  rendered.value = wrapCodeBlocks(html)
  headings.value = extractHeadings(html)
}, { immediate: true })

onMounted(async () => {
  try {
    highlighter.value = await createHighlighter({
      themes: ['github-dark'],
      langs: ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'html', 'css', 'json', 'bash', 'sql', 'markdown', 'vue', 'go', 'rust'],
    })
    const html = md.render(props.content)
    rendered.value = wrapCodeBlocks(html)
    headings.value = extractHeadings(html)
  } catch (e) { console.error('Failed to initialize highlighter:', e) }
})

const toc = computed(() => headings.value.filter(h => h.level <= 3))

function handleCopy(e: Event) {
  const btn = e.target as HTMLElement
  const wrapper = btn.closest('.code-block-wrapper')
  if (!wrapper) return
  const code = wrapper.querySelector('code')
  if (!code) return
  navigator.clipboard.writeText(code.textContent || '').then(() => {
    btn.textContent = 'Copied'
    btn.classList.add('copied')
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied') }, 2000)
  })
}

function handleClick(e: Event) {
  const target = e.target as HTMLElement
  if (target.classList.contains('copy-button') || target.closest('.copy-button')) {
    handleCopy(e)
  }
}

function toggleToc() {
  tocExpanded.value = !tocExpanded.value
}
</script>

<template>
  <div class="doc-renderer" @click="handleClick">
    <div class="doc-body">
      <div v-if="toc.length > 2" class="toc-section">
        <button class="toc-toggle" @click="toggleToc">
          <svg class="toc-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
          <span>{{ tocExpanded ? '收起目录' : '展开目录' }}</span>
          <svg class="toc-chevron" :class="{ up: tocExpanded }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div class="toc-panel" :class="{ expanded: tocExpanded }">
          <ul class="toc-list">
            <li v-for="h in toc" :key="h.id" class="toc-item" :class="'toc-h' + h.level">
              <a :href="'#' + h.id" class="toc-link" @click="tocExpanded = false">{{ h.text }}</a>
            </li>
          </ul>
        </div>
      </div>
      <div class="markdown-body" v-html="rendered"></div>
    </div>
  </div>
</template>

<style scoped>
.doc-renderer {
  width: 100%;
}

.doc-body {
  width: 100%;
}

.toc-section {
  margin-bottom: var(--spacing-lg);
}

.toc-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  font-size: 0.78em;
  font-family: var(--font-display);
  cursor: pointer;
  transition: all var(--transition-fast);
  letter-spacing: 0.03em;
}

.toc-toggle:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.toc-icon {
  flex-shrink: 0;
}

.toc-chevron {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.toc-chevron.up {
  transform: rotate(180deg);
}

.toc-panel {
  max-height: 0;
  overflow: hidden;
  padding: 0 var(--spacing-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  transition: max-height 0.3s ease, padding 0.3s ease;
}

.toc-panel.expanded {
  max-height: 400px;
  overflow-y: auto;
  padding: var(--spacing-sm) var(--spacing-md);
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin-bottom: 1px;
}

.toc-link {
  display: block;
  padding: 2px 0;
  color: var(--color-text-secondary);
  font-size: 0.82em;
  line-height: 1.4;
  transition: color var(--transition-fast);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-bottom: none;
}

.toc-link:hover {
  color: var(--color-accent);
}

.toc-h2 {
  padding-left: var(--spacing-sm);
}

.toc-h3 {
  padding-left: var(--spacing-lg);
}

.markdown-body {
  width: 100%;
}
</style>
