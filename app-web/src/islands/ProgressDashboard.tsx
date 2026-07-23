/**
 * 进度仪表盘组件 (ProgressDashboard)
 * ===================================
 * 功能概述：
 * - 调用 exerciseService.getExerciseProgress() 获取习题统计
 * - 调用 progressService.getProgressStats() 获取文档阅读进度统计
 * - 调用 progressService.getRecommendedNext() 获取下一步学习推荐
 * - 展示：
 *   - 顶部 KPI 卡片：总文档数、已完成、进行中、收藏、总阅读时长、连续打卡天数
 *   - 习题作答统计：总习题数、已作答、答对数、正确率
 *   - 模块进度条形图（每个模块一条）
 *   - 最近阅读列表（5 条）
 *   - 错题集快速访问（链接到 dashboard/exercises）
 *   - 推荐下一步学习（3-5 条）
 *   - 导出/导入数据按钮
 * - 暗色模式适配
 * - 支持 View Transitions（astro:page-load 事件）
 *
 * 使用场景：
 * - 在 dashboard.astro 页面中通过 client:load 水合
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import '@/styles/islands/ProgressDashboard.css';

// ============================================================================
// 初始状态常量
// ============================================================================

/** 习题进度统计初始值 */
const INITIAL_EXERCISE_STATS: ExerciseProgressStats = {
  totalExercises: 0,
  attemptedExercises: 0,
  correctExercises: 0,
  incorrectExercises: 0,
  accuracy: 0,
  totalAttempts: 0,
  streakDays: 0,
  modules: [],
};

/** 文档阅读进度统计初始值 */
const INITIAL_READING_STATS: ProgressStats = {
  totalDocs: 0,
  completed: 0,
  inProgress: 0,
  notStarted: 0,
  bookmarked: 0,
  totalReadingTime: 0,
  streakDays: 0,
  moduleProgress: [],
};

// ============================================================================
// 组件
// ============================================================================

/**
 * 进度仪表盘组件
 *
 * 核心执行流程：
 *   1. 挂载时调用 getAllModules() 加载模块元数据
 *   2. 调用 loadAllData() 并行获取习题统计、阅读统计、推荐、错题
 *   3. 监听 astro:page-load 事件以支持 View Transitions
 *   4. 卸载时移除事件监听
 */
export function ProgressDashboard() {
  // ========== 响应式状态 ==========

  /** 加载状态 */
  const [loading, setLoading] = useState<boolean>(true);

  /** 习题进度统计 */
  const [exerciseStats, setExerciseStats] =
    useState<ExerciseProgressStats>(INITIAL_EXERCISE_STATS);

  /** 文档阅读进度统计 */
  const [readingStats, setReadingStats] = useState<ProgressStats>(INITIAL_READING_STATS);

  /** 错题列表 */
  const [incorrectExercises, setIncorrectExercises] = useState<ExerciseRecord[]>([]);

  /** 推荐文档列表 */
  const [recommendations, setRecommendations] = useState<RecommendedDoc[]>([]);

  /** 最近阅读列表（基于 IndexedDB 中的 ProgressRecord） */
  const [recentReading, setRecentReading] = useState<ProgressRecord[]>([]);

  /** 模块元数据（用于显示模块名称） */
  const [modules, setModules] = useState<readonly Module[]>([]);

  /** 最近活跃文本（用于页脚提示） */
  const [lastActiveText, setLastActiveText] = useState<string>('');

  // ========== 非响应式引用 ==========

  /** 文件输入引用（用于触发导入文件选择对话框） */
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** 基础路径（构建时常量，无需响应式） */
  const base = import.meta.env.BASE_URL;

  // ========== 计算属性 ==========

  /**
   * 模块进度列表（过滤掉无记录的模块，按完成率倒序）
   */
  const moduleProgressList = useMemo<ModuleProgressItem[]>(() => {
    return readingStats.moduleProgress
      .filter((m) => m.total > 0)
      .sort((a, b) => {
        const aPercent = a.total > 0 ? a.completed / a.total : 0;
        const bPercent = b.total > 0 ? b.completed / b.total : 0;
        return bPercent - aPercent;
      });
  }, [readingStats.moduleProgress]);

  // ========== 工具方法 ==========

  /**
   * 获取模块显示名称
   * @param moduleId - 模块 ID
   * @returns 模块中文名；未知返回 ID
   */
  const getModuleLabel = useCallback(
    (moduleId: string): string => {
      const mod = modules.find((m) => m.id === moduleId);
      return mod?.title ?? moduleId;
    },
    [modules]
  );

  /**
   * 计算模块完成百分比
   * @param mod - 模块进度项
   * @returns 完成百分比（0-100）
   */
  const getModulePercent = useCallback((mod: ModuleProgressItem): number => {
    if (mod.total === 0) return 0;
    return Math.round((mod.completed / mod.total) * 100);
  }, []);

  /**
   * 根据模块完成情况返回对应的 CSS 类名
   * @param mod - 模块进度项
   * @returns CSS 类名
   */
  const getProgressClass = useCallback(
    (mod: ModuleProgressItem): string => {
      const percent = getModulePercent(mod);
      if (percent === 100) return 'progress-complete';
      if (percent >= 50) return 'progress-half';
      return 'progress-started';
    },
    [getModulePercent]
  );

  // ========== 纯函数工具（无依赖闭包） ==========

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

  // ========== 数据加载 ==========

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
   * 加载所有进度数据
   * 并行读取习题统计、文档阅读统计、推荐文档、错题集
   */
  const loadAllData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [exerciseStatsData, incorrect, readingStatsData, recommended] = await Promise.all([
        getExerciseProgress(),
        getIncorrectExercises(),
        getProgressStats(),
        getRecommendedNext(5),
      ]);
      setExerciseStats(exerciseStatsData);
      setIncorrectExercises(incorrect);
      setReadingStats(readingStatsData);
      setRecommendations(recommended);

      // 从 IndexedDB 获取最近阅读记录（用于"最近阅读"列表）
      setRecentReading(await fetchRecentReading());

      // 更新最后活跃文本
      setLastActiveText(readingStatsData.lastActiveDate ?? '');
    } catch {
      // 异常时保持初始值
    } finally {
      setLoading(false);
    }
  }, []);

  // ========== 数据管理操作 ==========

  /**
   * 导出全部进度为 JSON 文件
   * 同时导出文档阅读进度与习题作答记录
   */
  const handleExport = useCallback(async (): Promise<void> => {
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
  }, []);

  /**
   * 触发文件选择对话框
   */
  const triggerImport = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 处理导入文件
   * 同时导入文档阅读进度与习题作答记录
   * @param e - 文件选择事件
   */
  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const input = e.target;
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
    },
    [loadAllData]
  );

  /**
   * 重置全部进度（带二次确认）
   * 同时清空文档阅读进度与习题作答记录
   */
  const handleReset = useCallback(async (): Promise<void> => {
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
  }, [loadAllData]);

  // ========== 生命周期：挂载与卸载 ==========

  useEffect(() => {
    // 加载模块元数据（同步）
    setModules(getAllModules());

    // 首次加载数据
    void loadAllData();

    /**
     * View Transitions 页面加载回调
     * 在 Astro View Transitions 完成导航后重新加载数据
     */
    const onPageLoad = (): void => {
      void loadAllData();
    };
    document.addEventListener('astro:page-load', onPageLoad);

    return () => {
      document.removeEventListener('astro:page-load', onPageLoad);
    };
  }, [loadAllData]);

  // ========== 渲染 ==========

  /**
   * 加载中状态
   */
  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>加载进度数据...</p>
        </div>
      </div>
    );
  }

  /**
   * 主内容渲染
   */
  return (
    <div className="dashboard">
      <div className="dashboard-content">
        {/* 顶部 KPI 卡片组（文档阅读维度） */}
        <section className="kpi-grid">
          <div className="kpi-card kpi-total">
            <div className="kpi-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div className="kpi-value">{readingStats.totalDocs}</div>
            <div className="kpi-label">总文档</div>
          </div>

          <div className="kpi-card kpi-completed">
            <div className="kpi-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="kpi-value">{readingStats.completed}</div>
            <div className="kpi-label">已完成</div>
          </div>

          <div className="kpi-card kpi-in-progress">
            <div className="kpi-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="kpi-value">{readingStats.inProgress}</div>
            <div className="kpi-label">进行中</div>
          </div>

          <div className="kpi-card kpi-bookmarked">
            <div className="kpi-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="kpi-value">{readingStats.bookmarked}</div>
            <div className="kpi-label">收藏</div>
          </div>

          <div className="kpi-card kpi-time">
            <div className="kpi-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="kpi-value">{formatReadingTime(readingStats.totalReadingTime)}</div>
            <div className="kpi-label">总阅读时长</div>
          </div>

          <div className="kpi-card kpi-streak">
            <div className="kpi-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            </div>
            <div className="kpi-value">{readingStats.streakDays}</div>
            <div className="kpi-label">连续打卡（天）</div>
          </div>
        </section>

        {/* 习题作答统计 */}
        <section className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">习题作答统计</h3>
            <a href={`${base}dashboard/exercises/`} className="section-link">
              错题集
            </a>
          </div>
          <div className="exercise-stats">
            <div className="exercise-stat">
              <span className="exercise-stat-value">{exerciseStats.totalExercises}</span>
              <span className="exercise-stat-label">总习题数</span>
            </div>
            <div className="exercise-stat">
              <span className="exercise-stat-value">{exerciseStats.attemptedExercises}</span>
              <span className="exercise-stat-label">已作答</span>
            </div>
            <div className="exercise-stat">
              <span className="exercise-stat-value exercise-stat-correct">
                {exerciseStats.correctExercises}
              </span>
              <span className="exercise-stat-label">答对数</span>
            </div>
            <div className="exercise-stat">
              <span className="exercise-stat-value exercise-stat-accuracy">
                {exerciseStats.accuracy}%
              </span>
              <span className="exercise-stat-label">正确率</span>
            </div>
          </div>
        </section>

        {/* 各模块进度条形图（文档阅读进度） */}
        {moduleProgressList.length > 0 && (
          <section className="dashboard-section">
            <h3 className="section-title">各模块阅读进度</h3>
            <div className="module-chart">
              {moduleProgressList.map((mod) => (
                <div key={mod.moduleId} className="module-bar-item">
                  <div className="module-bar-label" title={getModuleLabel(mod.moduleId)}>
                    {getModuleLabel(mod.moduleId)}
                  </div>
                  <div className="module-bar-track">
                    <div
                      className={`module-bar-fill ${getProgressClass(mod)}`}
                      style={{ width: `${getModulePercent(mod)}%` }}
                    ></div>
                  </div>
                  <div className="module-bar-stats">
                    <span className="module-bar-percent">{getModulePercent(mod)}%</span>
                    <span className="module-bar-count">
                      ({mod.completed}/{mod.total})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 最近阅读列表 */}
        {recentReading.length > 0 && (
          <section className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">最近阅读</h3>
            </div>
            <div className="recent-list">
              {recentReading.map((item) => (
                <a
                  key={item.docSlug}
                  href={getDocUrl(item.moduleId, item.docSlug)}
                  className="recent-item"
                >
                  <div className="recent-info">
                    <div className="recent-title">
                      {getModuleLabel(item.moduleId)} · {extractSlug(item.docSlug)}
                    </div>
                    <div className="recent-meta">
                      <span className={`recent-status status-${item.status}`}>
                        {statusLabel(item.status)}
                      </span>
                      <span className="recent-time">{formatRelativeTime(item.lastReadAt)}</span>
                    </div>
                  </div>
                  <div className="recent-arrow">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 错题集快速访问 */}
        {incorrectExercises.length > 0 && (
          <section className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">
                错题集（最近 {Math.min(incorrectExercises.length, 5)} 题）
              </h3>
              <a href={`${base}dashboard/exercises/`} className="section-link">
                查看全部
              </a>
            </div>
            <div className="incorrect-list">
              {incorrectExercises.slice(0, 5).map((item, idx) => (
                <div key={idx} className="incorrect-item">
                  <div className="incorrect-item-header">
                    <span className="incorrect-item-type">{typeLabel(item.type)}</span>
                    <span className="incorrect-item-module">{getModuleLabel(item.moduleId)}</span>
                    <span className="incorrect-item-date">{formatDate(item.lastAttempted)}</span>
                  </div>
                  <div className="incorrect-item-question">{item.question}</div>
                  <div className="incorrect-item-answer">
                    <span className="incorrect-item-label">参考答案：</span>
                    <span className="incorrect-item-correct">{item.correctAnswer}</span>
                  </div>
                  {item.docSlug && (
                    <a
                      href={getDocUrl(item.moduleId, item.docSlug)}
                      className="incorrect-item-link"
                    >
                      查看文档 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 推荐下一步学习 */}
        <section className="dashboard-section">
          <h3 className="section-title">推荐下一步学习</h3>
          <div className="recommendations">
            {recommendations.length === 0 && (
              <div className="no-recommendations">
                暂无推荐，继续学习以获取个性化建议
              </div>
            )}
            {recommendations.map((rec, idx) => (
              <a
                key={idx}
                href={getDocUrl(rec.moduleId, rec.docSlug)}
                className="recommendation-card"
              >
                <div className="rec-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <div className="rec-content">
                  <div className="rec-title">
                    {getModuleLabel(rec.moduleId)} · {rec.title}
                  </div>
                  <div className="rec-desc">{rec.reason}</div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* 操作区：导出 / 导入 / 重置 */}
        <section className="dashboard-section actions-section">
          <h3 className="section-title">数据管理</h3>
          <div className="actions-buttons">
            <button className="action-btn action-export" onClick={handleExport}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导出全部进度
            </button>
            <button className="action-btn action-import" onClick={triggerImport}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              导入进度
            </button>
            <button className="action-btn action-reset" onClick={handleReset}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
              </svg>
              重置全部进度
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </div>
          {lastActiveText && <p className="last-active-tip">最后活跃：{lastActiveText}</p>}
        </section>
      </div>
    </div>
  );
}

export default ProgressDashboard;
