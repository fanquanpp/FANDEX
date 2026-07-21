<!--
  进度仪表盘组件 (ProgressDashboard)
  ===================================
  功能概述：
  - 调用 exerciseService.getExerciseProgress() 获取习题统计
  - 调用 progressService.getProgressStats() 获取文档阅读进度统计
  - 调用 progressService.getRecommendedNext() 获取下一步学习推荐
  - 展示：
    - 顶部 KPI 卡片：总文档数、已完成、进行中、收藏、总阅读时长、连续打卡天数
    - 习题作答统计：总习题数、已作答、答对数、正确率
    - 模块进度条形图（每个模块一条）
    - 最近阅读列表（5 条）
    - 错题集快速访问（链接到 dashboard/exercises）
    - 推荐下一步学习（3-5 条）
    - 导出/导入数据按钮
  - 暗色模式适配
  - 支持 View Transitions（astro:page-load 事件）

  使用场景：
  - 在 dashboard.astro 页面中通过 client:load 水合
-->
<template>
  <div class="dashboard">
    <!-- 加载中状态 -->
    <div v-if="loading" class="dashboard-loading">
      <div class="loading-spinner"></div>
      <p>加载进度数据...</p>
    </div>

    <!-- 主内容 -->
    <div v-else class="dashboard-content">
      <!-- 顶部 KPI 卡片组（文档阅读维度） -->
      <section class="kpi-grid">
        <div class="kpi-card kpi-total">
          <div class="kpi-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div class="kpi-value">{{ readingStats.totalDocs }}</div>
          <div class="kpi-label">总文档</div>
        </div>

        <div class="kpi-card kpi-completed">
          <div class="kpi-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div class="kpi-value">{{ readingStats.completed }}</div>
          <div class="kpi-label">已完成</div>
        </div>

        <div class="kpi-card kpi-in-progress">
          <div class="kpi-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div class="kpi-value">{{ readingStats.inProgress }}</div>
          <div class="kpi-label">进行中</div>
        </div>

        <div class="kpi-card kpi-bookmarked">
          <div class="kpi-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div class="kpi-value">{{ readingStats.bookmarked }}</div>
          <div class="kpi-label">收藏</div>
        </div>

        <div class="kpi-card kpi-time">
          <div class="kpi-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="kpi-value">{{ formatReadingTime(readingStats.totalReadingTime) }}</div>
          <div class="kpi-label">总阅读时长</div>
        </div>

        <div class="kpi-card kpi-streak">
          <div class="kpi-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              />
            </svg>
          </div>
          <div class="kpi-value">{{ readingStats.streakDays }}</div>
          <div class="kpi-label">连续打卡（天）</div>
        </div>
      </section>

      <!-- 习题作答统计 -->
      <section class="dashboard-section">
        <div class="section-header">
          <h3 class="section-title">习题作答统计</h3>
          <a :href="`${base}dashboard/exercises/`" class="section-link">错题集</a>
        </div>
        <div class="exercise-stats">
          <div class="exercise-stat">
            <span class="exercise-stat-value">{{ exerciseStats.totalExercises }}</span>
            <span class="exercise-stat-label">总习题数</span>
          </div>
          <div class="exercise-stat">
            <span class="exercise-stat-value">{{ exerciseStats.attemptedExercises }}</span>
            <span class="exercise-stat-label">已作答</span>
          </div>
          <div class="exercise-stat">
            <span class="exercise-stat-value exercise-stat-correct">{{
              exerciseStats.correctExercises
            }}</span>
            <span class="exercise-stat-label">答对数</span>
          </div>
          <div class="exercise-stat">
            <span class="exercise-stat-value exercise-stat-accuracy"
              >{{ exerciseStats.accuracy }}%</span
            >
            <span class="exercise-stat-label">正确率</span>
          </div>
        </div>
      </section>

      <!-- 各模块进度条形图（文档阅读进度） -->
      <section class="dashboard-section" v-if="moduleProgressList.length > 0">
        <h3 class="section-title">各模块阅读进度</h3>
        <div class="module-chart">
          <div v-for="mod in moduleProgressList" :key="mod.moduleId" class="module-bar-item">
            <div class="module-bar-label" :title="getModuleLabel(mod.moduleId)">
              {{ getModuleLabel(mod.moduleId) }}
            </div>
            <div class="module-bar-track">
              <div
                class="module-bar-fill"
                :class="getProgressClass(mod)"
                :style="{ width: `${getModulePercent(mod)}%` }"
              ></div>
            </div>
            <div class="module-bar-stats">
              <span class="module-bar-percent">{{ getModulePercent(mod) }}%</span>
              <span class="module-bar-count">({{ mod.completed }}/{{ mod.total }})</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 最近阅读列表 -->
      <section class="dashboard-section" v-if="recentReading.length > 0">
        <div class="section-header">
          <h3 class="section-title">最近阅读</h3>
        </div>
        <div class="recent-list">
          <a
            v-for="item in recentReading"
            :key="item.docSlug"
            :href="getDocUrl(item.moduleId, item.docSlug)"
            class="recent-item"
          >
            <div class="recent-info">
              <div class="recent-title">
                {{ getModuleLabel(item.moduleId) }} · {{ extractSlug(item.docSlug) }}
              </div>
              <div class="recent-meta">
                <span class="recent-status" :class="`status-${item.status}`">{{
                  statusLabel(item.status)
                }}</span>
                <span class="recent-time">{{ formatRelativeTime(item.lastReadAt) }}</span>
              </div>
            </div>
            <div class="recent-arrow">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </a>
        </div>
      </section>

      <!-- 错题集快速访问 -->
      <section class="dashboard-section" v-if="incorrectExercises.length > 0">
        <div class="section-header">
          <h3 class="section-title">
            错题集（最近 {{ Math.min(incorrectExercises.length, 5) }} 题）
          </h3>
          <a :href="`${base}dashboard/exercises/`" class="section-link">查看全部</a>
        </div>
        <div class="incorrect-list">
          <div
            v-for="(item, idx) in incorrectExercises.slice(0, 5)"
            :key="idx"
            class="incorrect-item"
          >
            <div class="incorrect-item-header">
              <span class="incorrect-item-type">{{ typeLabel(item.type) }}</span>
              <span class="incorrect-item-module">{{ getModuleLabel(item.moduleId) }}</span>
              <span class="incorrect-item-date">{{ formatDate(item.lastAttempted) }}</span>
            </div>
            <div class="incorrect-item-question">{{ item.question }}</div>
            <div class="incorrect-item-answer">
              <span class="incorrect-item-label">参考答案：</span>
              <span class="incorrect-item-correct">{{ item.correctAnswer }}</span>
            </div>
            <a
              v-if="item.docSlug"
              :href="getDocUrl(item.moduleId, item.docSlug)"
              class="incorrect-item-link"
            >
              查看文档 →
            </a>
          </div>
        </div>
      </section>

      <!-- 推荐下一步学习 -->
      <section class="dashboard-section">
        <h3 class="section-title">推荐下一步学习</h3>
        <div class="recommendations">
          <div v-if="recommendations.length === 0" class="no-recommendations">
            暂无推荐，继续学习以获取个性化建议
          </div>
          <a
            v-for="(rec, idx) in recommendations"
            :key="idx"
            :href="getDocUrl(rec.moduleId, rec.docSlug)"
            class="recommendation-card"
          >
            <div class="rec-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div class="rec-content">
              <div class="rec-title">{{ getModuleLabel(rec.moduleId) }} · {{ rec.title }}</div>
              <div class="rec-desc">{{ rec.reason }}</div>
            </div>
          </a>
        </div>
      </section>

      <!-- 操作区：导出 / 导入 / 重置 -->
      <section class="dashboard-section actions-section">
        <h3 class="section-title">数据管理</h3>
        <div class="actions-buttons">
          <button class="action-btn action-export" @click="handleExport">
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
            导出全部进度
          </button>
          <button class="action-btn action-import" @click="triggerImport">
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
            导入进度
          </button>
          <button class="action-btn action-reset" @click="handleReset">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
            </svg>
            重置全部进度
          </button>
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            style="display: none"
            @change="handleImport"
          />
        </div>
        <p v-if="lastActiveText" class="last-active-tip">最后活跃：{{ lastActiveText }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  getExerciseProgress,
  getIncorrectExercises,
  exportProgress as exportExerciseProgress,
  importProgress as importExerciseProgress,
  resetProgress as resetExerciseProgress,
  type ProgressStats as ExerciseProgressStats,
  type ExerciseRecord,
} from '@/services/exercise-service';
import {
  getProgressStats,
  getRecommendedNext,
  exportProgress,
  importProgress,
  syncFromIndexedDB,
  type ProgressStats,
  type RecommendedDoc,
  type ModuleProgressItem,
  type ProgressRecord,
} from '@/services/progress-service';
import { getAllModules } from '@/services/module-service';
import type { Module } from '@/types';

/** 加载状态 */
const loading = ref<boolean>(true);

/** 习题进度统计 */
const exerciseStats = ref<ExerciseProgressStats>({
  totalExercises: 0,
  attemptedExercises: 0,
  correctExercises: 0,
  incorrectExercises: 0,
  accuracy: 0,
  totalAttempts: 0,
  streakDays: 0,
  modules: [],
});

/** 文档阅读进度统计 */
const readingStats = ref<ProgressStats>({
  totalDocs: 0,
  completed: 0,
  inProgress: 0,
  notStarted: 0,
  bookmarked: 0,
  totalReadingTime: 0,
  streakDays: 0,
  moduleProgress: [],
});

/** 错题列表 */
const incorrectExercises = ref<ExerciseRecord[]>([]);

/** 推荐文档列表 */
const recommendations = ref<RecommendedDoc[]>([]);

/** 最近阅读列表（基于 IndexedDB 中的 ProgressRecord） */
const recentReading = ref<ProgressRecord[]>([]);

/** 模块元数据（用于显示模块名称） */
const modules = ref<readonly Module[]>([]);

/** 文件输入引用 */
const fileInput = ref<HTMLInputElement | null>(null);

/** 基础路径 */
const base = import.meta.env.BASE_URL;

/** 最近活跃文本（用于页脚提示） */
const lastActiveText = ref<string>('');

/**
 * 模块进度列表（过滤掉无记录的模块，按完成率倒序）
 */
const moduleProgressList = computed<ModuleProgressItem[]>(() => {
  return readingStats.value.moduleProgress
    .filter((m) => m.total > 0)
    .sort((a, b) => {
      const aPercent = a.total > 0 ? a.completed / a.total : 0;
      const bPercent = b.total > 0 ? b.completed / b.total : 0;
      return bPercent - aPercent;
    });
});

/**
 * 获取模块显示名称
 * @param moduleId - 模块 ID
 * @returns 模块中文名；未知返回 ID
 */
function getModuleLabel(moduleId: string): string {
  const mod = modules.value.find((m) => m.id === moduleId);
  return mod?.title ?? moduleId;
}

/**
 * 计算模块完成百分比
 * @param mod - 模块进度项
 * @returns 完成百分比（0-100）
 */
function getModulePercent(mod: ModuleProgressItem): number {
  if (mod.total === 0) return 0;
  return Math.round((mod.completed / mod.total) * 100);
}

/**
 * 根据模块完成情况返回对应的 CSS 类名
 * @param mod - 模块进度项
 * @returns CSS 类名
 */
function getProgressClass(mod: ModuleProgressItem): string {
  const percent = getModulePercent(mod);
  if (percent === 100) return 'progress-complete';
  if (percent >= 50) return 'progress-half';
  return 'progress-started';
}

/**
 * 题型中文标签
 * @param type - 习题类型
 * @returns 中文标签
 */
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    'fill-blank': '填空',
    choice: '选择',
    'code-fix': '代码修正',
    'open-ended': '开放性',
  };
  return map[type] ?? type;
}

/**
 * 阅读状态中文标签
 * @param status - 阅读状态
 * @returns 中文标签
 */
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: '已完成',
    reading: '阅读中',
    'not-started': '未开始',
  };
  return map[status] ?? status;
}

/**
 * 从 docSlug 中提取 slug 部分（用于显示标题）
 * @param docSlug - 文档唯一标识
 * @returns slug 部分
 */
function extractSlug(docSlug: string): string {
  const idx = docSlug.indexOf('/');
  return idx >= 0 ? docSlug.slice(idx + 1) : docSlug;
}

/**
 * 格式化阅读时长（秒 → 可读字符串）
 * @param seconds - 总秒数
 * @returns 形如 "1h 23m" 或 "5m" 的字符串
 */
function formatReadingTime(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  return `${minutes}m`;
}

/**
 * 格式化时间戳为可读日期
 * @param timestamp - 时间戳（ms）；undefined 返回空字符串
 * @returns YYYY-MM-DD 格式字符串
 */
function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化为相对时间（如 "3 天前"）
 * @param timestamp - 时间戳（ms）
 * @returns 相对时间字符串
 */
function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 30) return formatDate(timestamp);
  if (days >= 1) return `${days} 天前`;
  if (hours >= 1) return `${hours} 小时前`;
  if (minutes >= 1) return `${minutes} 分钟前`;
  return '刚刚';
}

/**
 * 构造文档 URL
 * @param moduleId - 模块 ID
 * @param docSlug - 文档 slug（可为 "moduleId/slug" 格式或纯 slug）
 * @returns 文档页面 URL
 */
function getDocUrl(moduleId: string, docSlug: string): string {
  const slug = extractSlug(docSlug);
  return `${base}${moduleId}/${slug}/`;
}

/**
 * 加载所有进度数据
 * 并行读取习题统计、文档阅读统计、推荐文档、错题集
 */
async function loadAllData(): Promise<void> {
  loading.value = true;
  try {
    const [exerciseStatsData, incorrect, readingStatsData, recommended] = await Promise.all([
      getExerciseProgress(),
      getIncorrectExercises(),
      getProgressStats(),
      getRecommendedNext(5),
    ]);
    exerciseStats.value = exerciseStatsData;
    incorrectExercises.value = incorrect;
    readingStats.value = readingStatsData;
    recommendations.value = recommended;

    // 从 IndexedDB 获取最近阅读记录（用于"最近阅读"列表）
    recentReading.value = await fetchRecentReading();

    // 更新最后活跃文本
    lastActiveText.value = readingStatsData.lastActiveDate ?? '';
  } catch {
    // 异常时保持初始值
  } finally {
    loading.value = false;
  }
}

/**
 * 从 IndexedDB 拉取最近阅读的 5 条记录
 * 按 lastReadAt 倒序排列
 * @returns 最近阅读记录数组
 */
async function fetchRecentReading(): Promise<ProgressRecord[]> {
  try {
    // 通过 progressService 内部聚合，从 moduleProgress 反推 records 较复杂
    // 直接通过 getProgressRepository 获取全部记录后排序
    const { getProgressRepository } = await import('@/data/storage/progress-repository');
    const repo = getProgressRepository();
    const all = await repo.getAll();
    return all
      .filter((r) => r.lastReadAt)
      .sort((a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0))
      .slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * 导出全部进度为 JSON 文件
 * 同时导出文档阅读进度与习题作答记录
 */
async function handleExport(): Promise<void> {
  try {
    const [readingJson, exerciseJson] = await Promise.all([
      exportProgress(),
      exportExerciseProgress(),
    ]);
    // 合并为一个完整的进度包
    const combined = JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        readingProgress: JSON.parse(readingJson),
        exerciseProgress: JSON.parse(exerciseJson),
      },
      null,
      2
    );
    const blob = new Blob([combined], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fandex-progress-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // 导出失败静默处理
  }
}

/**
 * 触发文件选择对话框
 */
function triggerImport(): void {
  fileInput.value?.click();
}

/**
 * 处理导入文件
 * 同时导入文档阅读进度与习题作答记录
 * @param e - 文件选择事件
 */
async function handleImport(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as {
      readingProgress?: { records?: ProgressRecord[]; legacyProgress?: Record<string, unknown> };
      exerciseProgress?: { records?: ExerciseRecord[] };
    };
    // 分别导入阅读进度与习题进度
    if (parsed.readingProgress) {
      await importProgress(JSON.stringify(parsed.readingProgress));
    }
    if (parsed.exerciseProgress) {
      await importExerciseProgress(JSON.stringify(parsed.exerciseProgress));
    }
    await loadAllData();
  } catch {
    // 尝试作为旧版格式导入（仅习题或仅阅读）
    try {
      const text = await file.text();
      await importProgress(text);
      await loadAllData();
    } catch {
      // 导入失败静默处理
    }
  }
  input.value = '';
}

/**
 * 重置全部进度（带二次确认）
 * 同时清空文档阅读进度与习题作答记录
 */
async function handleReset(): Promise<void> {
  if (!window.confirm('确定要清空所有学习进度（文档阅读 + 习题作答）吗？此操作不可恢复。')) return;
  try {
    await Promise.all([
      resetExerciseProgress(),
      syncFromIndexedDB().then(() => {
        // 清空 IndexedDB 后再清空 localStorage
        try {
          localStorage.removeItem('fandex-progress');
          localStorage.removeItem('fandex-progress-records-cache');
        } catch {
          // 静默忽略
        }
      }),
    ]);
    await loadAllData();
  } catch {
    // 重置失败静默处理
  }
}

/**
 * View Transitions 页面加载回调
 */
function onPageLoad(): void {
  void loadAllData();
}

onMounted(() => {
  modules.value = getAllModules();
  void loadAllData();
  document.addEventListener('astro:page-load', onPageLoad);
});

onUnmounted(() => {
  document.removeEventListener('astro:page-load', onPageLoad);
});
</script>

<style scoped>
/* 仪表盘容器：宽度与全站 --content-width 基准对齐，避免 dashboard 页面看起来比其他页面窄 */
.dashboard {
  width: 100%;
  max-width: var(--content-width, 1280px);
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-md);
}

/* 加载状态 */
.dashboard-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl) 0;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: dashboard-spin 0.8s linear infinite;
  margin-bottom: var(--spacing-sm);
}

@keyframes dashboard-spin {
  to {
    transform: rotate(360deg);
  }
}

/* KPI 卡片网格 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
}

.kpi-card {
  padding: var(--spacing-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  text-align: center;
  transition: border-color var(--transition-fast);
}

.kpi-card:hover {
  border-color: var(--color-primary);
}

.kpi-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-bottom: var(--spacing-xs);
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.08);
}

.kpi-total .kpi-icon {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}
.kpi-completed .kpi-icon {
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}
.kpi-in-progress .kpi-icon {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}
.kpi-bookmarked .kpi-icon {
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.08);
}
.kpi-time .kpi-icon {
  color: #06b6d4;
  background: rgba(6, 182, 212, 0.08);
}
.kpi-streak .kpi-icon {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.kpi-value {
  font-family: var(--font-display);
  font-size: 1.6em;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
}

.kpi-label {
  font-size: 0.78em;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

/* 区块通用样式 */
.dashboard-section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-family: var(--font-display);
  font-size: 1.1em;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--spacing-md);
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--color-border-light);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.section-header .section-title {
  margin: 0;
  border: none;
  padding: 0;
}

.section-link {
  font-size: 0.82em;
  color: var(--color-primary);
  text-decoration: none;
}

.section-link:hover {
  text-decoration: underline;
}

/* 习题统计 */
.exercise-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
}

.exercise-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
}

.exercise-stat-value {
  font-family: var(--font-display);
  font-size: 1.5em;
  font-weight: 700;
  color: var(--color-text);
}

.exercise-stat-value.exercise-stat-correct {
  color: #10b981;
}

.exercise-stat-value.exercise-stat-accuracy {
  color: #8b5cf6;
}

.exercise-stat-label {
  font-size: 0.78em;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* 模块柱状图 */
.module-chart {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.module-bar-item {
  display: grid;
  grid-template-columns: 140px 1fr 110px;
  gap: var(--spacing-sm);
  align-items: center;
  font-size: 0.85em;
}

.module-bar-label {
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-bar-track {
  height: 12px;
  background: rgba(128, 128, 128, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.module-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.6s ease;
}

.module-bar-fill.progress-complete {
  background: #10b981;
}

.module-bar-fill.progress-half {
  background: #f59e0b;
}

.module-bar-fill.progress-started {
  background: #3b82f6;
}

.module-bar-stats {
  display: flex;
  gap: 4px;
  align-items: center;
  font-family: var(--font-display);
  font-size: 0.9em;
}

.module-bar-percent {
  font-weight: 700;
  color: var(--color-text);
}

.module-bar-count {
  color: var(--color-text-tertiary);
  font-size: 0.88em;
}

/* 最近阅读列表 */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition-fast);
}

.recent-item:hover {
  border-color: var(--color-primary);
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-title {
  font-size: 0.92em;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.78em;
}

.recent-status {
  padding: 1px 6px;
  font-weight: 600;
}

.recent-status.status-completed {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.recent-status.status-reading {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.recent-status.status-not-started {
  color: var(--color-text-tertiary);
  background: rgba(128, 128, 128, 0.08);
}

.recent-time {
  color: var(--color-text-tertiary);
}

.recent-arrow {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  margin-left: var(--spacing-sm);
}

/* 错题列表 */
.incorrect-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.incorrect-item {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-left: 3px solid #ef4444;
}

.incorrect-item-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: 6px;
  font-size: 0.78em;
}

.incorrect-item-type {
  padding: 1px 6px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-weight: 600;
}

.incorrect-item-module {
  color: var(--color-text-secondary);
}

.incorrect-item-date {
  margin-left: auto;
  color: var(--color-text-tertiary);
}

.incorrect-item-question {
  font-size: 0.9em;
  line-height: 1.6;
  color: var(--color-text);
  margin-bottom: 6px;
}

.incorrect-item-answer {
  font-size: 0.85em;
  color: var(--color-text-secondary);
  padding: 6px 10px;
  background: var(--color-bg);
  border-left: 2px solid #10b981;
}

.incorrect-item-label {
  font-weight: 600;
  color: var(--color-text);
}

.incorrect-item-correct {
  color: #10b981;
}

.incorrect-item-link {
  display: inline-block;
  margin-top: 6px;
  font-size: 0.82em;
  color: var(--color-primary);
  text-decoration: none;
}

.incorrect-item-link:hover {
  text-decoration: underline;
}

/* 推荐学习 */
.recommendations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--spacing-sm);
}

.no-recommendations {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 0.88em;
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border-light);
}

.recommendation-card {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition-fast);
}

.recommendation-card:hover {
  border-color: var(--color-primary);
}

.rec-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}

.rec-content {
  flex: 1;
  min-width: 0;
}

.rec-title {
  font-size: 0.92em;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec-desc {
  font-size: 0.8em;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* 操作区 */
.actions-section .actions-buttons {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text-secondary);
  font-size: 0.86em;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-export:hover {
  border-color: #10b981;
  color: #10b981;
}

.action-import:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.action-reset:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.last-active-tip {
  margin-top: var(--spacing-sm);
  font-size: 0.78em;
  color: var(--color-text-tertiary);
}

/* 暗色模式适配 */
[data-theme='dark'] .kpi-card,
[data-theme='dark'] .exercise-stat,
[data-theme='dark'] .recent-item,
[data-theme='dark'] .incorrect-item,
[data-theme='dark'] .recommendation-card {
  background: rgba(255, 255, 255, 0.02);
}

[data-theme='dark'] .incorrect-item-answer {
  background: rgba(0, 0, 0, 0.2);
}

[data-theme='dark'] .module-bar-track {
  background: rgba(255, 255, 255, 0.05);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .exercise-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .module-bar-item {
    grid-template-columns: 90px 1fr 80px;
    font-size: 0.8em;
  }

  .actions-section .actions-buttons {
    flex-direction: column;
  }

  .action-btn {
    justify-content: center;
  }
}
</style>
