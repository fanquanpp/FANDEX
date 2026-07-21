<script setup lang="ts">
/**
 * CodeRunner 代码运行器岛屿组件
 *
 * 功能概述：
 * 提供可编辑的代码块与运行按钮，支持 JS/TS/Python/C/C++ 多语言在浏览器
 * 沙箱中执行，实时显示 stdout/stderr 输出与执行状态。
 *
 * 设计原则：
 * - 通过 Service 层（runCode）发起运行请求，不直接操作 Worker
 * - UI 状态可预测：isRunning/isLoading/result 三态驱动渲染
 * - 暗色模式通过 dark: 前缀工具类响应 [data-theme="dark"]
 * - 所有异步操作 try-catch 包裹，异常以 stderr 形式展示
 *
 * 使用方式：
 *   <CodeRunner lang="python" :code="`print('hello')`" />
 *   <CodeRunner lang="javascript" :code="code" :editable="false" />
 */

import { ref, computed, watch, onUnmounted } from 'vue';
import { Play, Square, RotateCcw, Copy, Check, Loader2 } from '@lucide/vue';
import { Button } from '@/ui/components';
import {
  runCode,
  disposeCodeRunner,
  type RunResult,
  type CodeLanguage,
} from '@/services/code-runner-service';

/**
 * Props 类型定义
 * - lang：代码语言（影响运行时选择与语言徽章显示）
 * - code：初始代码内容（editable=true 时可编辑）
 * - editable：是否允许编辑代码，默认 true
 */
interface CodeRunnerProps {
  lang: CodeLanguage;
  code: string;
  editable?: boolean;
}

const props = withDefaults(defineProps<CodeRunnerProps>(), {
  editable: true,
});

/** 语言显示名称映射（用于语言徽章） */
const LANG_LABELS: Record<CodeLanguage, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
};

/** 语言徽章颜色类映射（与语言主色调呼应） */
const LANG_BADGE_CLASSES: Record<CodeLanguage, string> = {
  javascript:
    'bg-warning-bg text-warning-dark border-warning-border dark:bg-warning-bg dark:text-warning-light',
  typescript: 'bg-info-bg text-info-dark border-info-border dark:bg-info-bg dark:text-info-light',
  python:
    'bg-secondary-100 text-secondary-800 border-secondary-300 dark:bg-secondary-900 dark:text-secondary-200',
  cpp: 'bg-primary-100 text-primary-800 border-primary-300 dark:bg-primary-900 dark:text-primary-200',
  c: 'bg-primary-100 text-primary-800 border-primary-300 dark:bg-primary-900 dark:text-primary-200',
  go: 'bg-accent-100 text-accent-800 border-accent-300 dark:bg-accent-900 dark:text-accent-200',
};

/** 当前编辑区代码内容（v-model 绑定） */
const editorCode = ref(props.code);

/** 初始代码快照（用于重置功能） */
const initialCode = props.code;

/** 是否正在运行（控制按钮状态与 spinner） */
const isRunning = ref(false);

/** 是否正在加载运行时（Pyodide/JSCPP 首次加载） */
const isLoading = ref(false);

/** 加载提示文本（来自 Worker 的 loading 消息） */
const loadingMessage = ref('');

/** 是否已停止（用户主动点击停止按钮） */
const isStopped = ref(false);

/** 运行结果（null 表示尚未运行） */
const result = ref<RunResult | null>(null);

/** 是否已复制代码（控制复制按钮图标反馈） */
const isCopied = ref(false);

/** 是否在复制后短暂显示对勾图标 */
const copiedTimer = ref<number | undefined>(undefined);

/** 当前语言显示名称 */
const langLabel = computed(() => LANG_LABELS[props.lang] ?? props.lang);

/** 当前语言徽章类名 */
const langBadgeClass = computed(
  () => LANG_BADGE_CLASSES[props.lang] ?? LANG_BADGE_CLASSES.javascript
);

/** 状态栏文本：耗时 + 退出码 */
const statusText = computed(() => {
  if (!result.value) return '';
  const { durationMs, exitCode, timedOut } = result.value;
  if (isStopped.value) return `已停止 · 耗时 ${durationMs}ms`;
  if (timedOut) return `运行超时 · 耗时 ${durationMs}ms`;
  return `退出码 ${exitCode} · 耗时 ${durationMs}ms`;
});

/** 是否有错误输出（控制 stderr 区域显示） */
const hasError = computed(() => {
  if (!result.value) return false;
  return result.value.stderr.length > 0 || result.value.exitCode !== 0;
});

/** 是否运行成功（用于状态栏颜色） */
const isSuccess = computed(() => {
  if (!result.value) return false;
  return result.value.exitCode === 0 && !result.value.timedOut;
});

/**
 * 监听 props.code 变化，同步到编辑区
 * 用于父组件动态切换代码内容时同步更新
 */
watch(
  () => props.code,
  (newCode) => {
    if (!isRunning.value) {
      editorCode.value = newCode;
    }
  }
);

/**
 * 运行代码
 * 调用 Service 层 runCode，更新 UI 状态
 */
async function handleRun() {
  if (isRunning.value) return;

  // 重置状态
  isRunning.value = true;
  isLoading.value = true;
  isStopped.value = false;
  result.value = null;
  loadingMessage.value = '';

  try {
    const res = await runCode({
      language: props.lang,
      code: editorCode.value,
    });
    result.value = res;
  } catch (err) {
    // Service 层应始终 resolve（不 reject），此处兜底
    result.value = {
      stdout: '',
      stderr: err instanceof Error ? err.message : String(err),
      exitCode: 1,
      durationMs: 0,
      timedOut: false,
    };
  } finally {
    isRunning.value = false;
    isLoading.value = false;
    loadingMessage.value = '';
  }
}

/**
 * 停止运行
 * 通过 disposeCodeRunner 强制终止 Worker，标记为"已停止"
 */
function handleStop() {
  if (!isRunning.value) return;
  isStopped.value = true;
  isRunning.value = false;
  isLoading.value = false;
  // 调用 Service 层销毁函数，terminate Worker
  disposeCodeRunner();
}

/**
 * 重置代码到初始状态
 * 清空输出，恢复编辑区为初始代码
 */
function handleReset() {
  if (isRunning.value) return;
  editorCode.value = initialCode;
  result.value = null;
  isStopped.value = false;
}

/**
 * 复制代码到剪贴板
 * 使用 navigator.clipboard API，失败时静默忽略
 */
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(editorCode.value);
    isCopied.value = true;
    // 2 秒后恢复复制图标
    if (copiedTimer.value !== undefined) {
      window.clearTimeout(copiedTimer.value);
    }
    copiedTimer.value = window.setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch {
    // 剪贴板 API 失败（如非 HTTPS 环境），静默忽略
  }
}

/** 组件卸载时清理定时器与运行状态 */
onUnmounted(() => {
  if (copiedTimer.value !== undefined) {
    window.clearTimeout(copiedTimer.value);
  }
  // 组件卸载时如有运行中任务，强制清理 Worker
  if (isRunning.value) {
    disposeCodeRunner();
  }
});
</script>

<template>
  <div
    class="code-runner my-6 overflow-hidden rounded-lg border border-border bg-surface shadow-sm dark:border-border dark:bg-surface"
  >
    <!-- 顶部工具栏 -->
    <div
      class="flex flex-wrap items-center gap-2 border-b border-border bg-elevated px-4 py-2 dark:border-border dark:bg-elevated"
    >
      <!-- 语言徽章 -->
      <span
        :class="[
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
          langBadgeClass,
        ]"
      >
        {{ langLabel }}
      </span>

      <!-- 工具栏按钮组（右侧） -->
      <div class="ml-auto flex items-center gap-1">
        <!-- 复制按钮 -->
        <Button
          variant="ghost"
          size="sm"
          :disabled="isRunning"
          :aria-label="isCopied ? '已复制' : '复制代码'"
          @click="handleCopy"
        >
          <Check v-if="isCopied" class="size-4" />
          <Copy v-else class="size-4" />
        </Button>

        <!-- 重置按钮 -->
        <Button
          variant="ghost"
          size="sm"
          :disabled="isRunning"
          aria-label="重置代码"
          @click="handleReset"
        >
          <RotateCcw class="size-4" />
        </Button>

        <!-- 停止按钮（仅运行中显示） -->
        <Button
          v-if="isRunning"
          variant="destructive"
          size="sm"
          aria-label="停止运行"
          @click="handleStop"
        >
          <Square class="size-4" />
          <span>停止</span>
        </Button>

        <!-- 运行按钮 -->
        <Button v-else variant="default" size="sm" aria-label="运行代码" @click="handleRun">
          <Play class="size-4" />
          <span>运行</span>
        </Button>
      </div>
    </div>

    <!-- 代码编辑区 -->
    <div class="relative">
      <textarea
        v-model="editorCode"
        :readonly="!editable || isRunning"
        :aria-label="`${langLabel} 代码编辑区`"
        spellcheck="false"
        class="block w-full resize-y border-0 bg-background p-4 font-mono text-sm leading-relaxed text-text-primary focus:outline-none focus:ring-1 focus:ring-ring dark:bg-background dark:text-text-primary"
        rows="6"
      />
    </div>

    <!-- 加载状态条 -->
    <div
      v-if="isLoading"
      class="flex items-center gap-2 border-t border-border bg-info-bg px-4 py-2 text-sm text-info-dark dark:border-border dark:bg-info-bg dark:text-info-light"
    >
      <Loader2 class="size-4 animate-spin" />
      <span>{{ loadingMessage || '正在准备运行环境...' }}</span>
    </div>

    <!-- 输出区 -->
    <div v-if="result" class="border-t border-border dark:border-border">
      <!-- 输出区标题 -->
      <div
        class="flex items-center justify-between border-b border-border bg-elevated px-4 py-2 dark:border-border dark:bg-elevated"
      >
        <span class="text-xs font-medium uppercase tracking-wider text-text-tertiary"> 输出 </span>
        <span
          :class="[
            'text-xs font-medium',
            isSuccess
              ? 'text-success-dark dark:text-success-light'
              : 'text-error-dark dark:text-error-light',
          ]"
        >
          {{ statusText }}
        </span>
      </div>

      <!-- stdout 标准输出 -->
      <pre
        v-if="result.stdout.length > 0"
        class="m-0 max-h-80 overflow-auto bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-100 dark:bg-neutral-950 dark:text-neutral-100"
      ><code>{{ result.stdout }}</code></pre>

      <!-- stderr 标准错误 -->
      <pre
        v-if="hasError"
        class="m-0 max-h-40 overflow-auto bg-error-bg p-4 font-mono text-xs leading-relaxed text-error-dark dark:bg-error-bg dark:text-error-light"
      ><code>{{ result.stderr || (result.timedOut && !isStopped ? '运行超时' : '执行失败') }}</code></pre>

      <!-- 空输出提示 -->
      <div
        v-if="result.stdout.length === 0 && !hasError"
        class="px-4 py-3 text-xs text-text-tertiary dark:text-text-tertiary"
      >
        (无输出)
      </div>
    </div>
  </div>
</template>
