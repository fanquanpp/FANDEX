<template>
  <div class="progress-toggle" :class="statusClass">
    <button class="progress-btn" :title="statusLabel" @click="handleToggle">
      <span class="progress-dot"></span>
      <span class="progress-label">{{ statusLabel }}</span>
    </button>
    <button class="progress-export" title="导出进度" @click="handleExport">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
    <button class="progress-import" title="导入进度" @click="triggerImport">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    </button>
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  getProgress,
  toggleStatus,
  exportProgress,
  importProgress,
  type DocStatus,
} from '@/lib/progress';

const props = defineProps<{
  slug: string;
}>();

const status = ref<DocStatus>('unread');
const fileInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  const p = getProgress(props.slug);
  if (p) status.value = p.status;
});

const statusClass = computed(() => `status-${status.value}`);
const statusLabel = computed(() => {
  const map: Record<DocStatus, string> = { unread: '未读', reading: '在读', done: '已读' };
  return map[status.value];
});

function handleToggle() {
  status.value = toggleStatus(props.slug);
  document.dispatchEvent(
    new CustomEvent('codex-progress-change', { detail: { slug: props.slug, status: status.value } })
  );
}

function handleExport() {
  const data = exportProgress();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'codex-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

function triggerImport() {
  fileInput.value?.click();
}

function handleImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const ok = importProgress(reader.result as string);
    if (ok) {
      const p = getProgress(props.slug);
      if (p) status.value = p.status;
      document.dispatchEvent(new CustomEvent('codex-progress-change'));
    }
  };
  reader.readAsText(file);
  input.value = '';
}
</script>

<style scoped>
.progress-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.progress-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border: 1px solid var(--color-border);
  border-radius: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.78em;
  font-family: var(--font-display);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.progress-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.status-unread .progress-dot {
  background: var(--color-border);
}

.status-reading .progress-dot {
  background: #f59e0b;
}

.status-done .progress-dot {
  background: #10b981;
}

.status-done .progress-btn {
  color: #10b981;
  border-color: #10b981;
}

.progress-export,
.progress-import {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  border-radius: 0;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;
}

.progress-export:hover,
.progress-import:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
</style>
