/**
 * 学习进度追踪组件 (ProgressToggle)
 * ========================
 * 功能概述：
 * - 切换文档的阅读状态：未读(unread) → 在读(reading) → 已读(done) → 未读(unread) 循环
 * - 支持进度导出：将所有文档的阅读状态导出为 JSON 文件下载
 * - 支持进度导入：从 JSON 文件导入阅读状态，恢复学习进度
 * - 状态持久化到 localStorage（通过 @/lib/progress 工具库管理）
 * - 状态变更时通过自定义事件 fan dex-progress-change 通知其他组件（如侧边栏进度标记）
 *
 * 数据流：
 * - 挂载时从 localStorage 读取当前文档(slug)的进度状态
 * - 用户点击主按钮 → toggleStatus() 更新状态 → 派发自定义事件 → 侧边栏等组件响应
 * - 导出：exportProgress() → Blob → 下载为 fan dex-progress.json
 * - 导入：文件选择 → FileReader → importProgress() → 刷新当前状态 → 派发事件
 *
 * 事件处理：
 * - handleToggle：切换阅读状态，带防重复点击保护（saving 时忽略）
 * - handleExport：导出进度为 JSON 文件
 * - triggerImport → handleImport：触发文件选择并处理导入
 *
 * 使用场景：
 * - 放置在文档页面顶部，让用户标记阅读进度
 * - 配合侧边栏的进度标记，实现全局进度追踪
 * - 配合 Astro 岛屿架构，仅客户端交互
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
/**
 * 进度管理：部分函数从 Service 层导入，部分保留从 lib 导入
 * - getProgress(slug)：获取指定文档的阅读状态（来自 progress-service）
 * - DocStatus：阅读状态类型（'unread' | 'reading' | 'done'）（来自 progress-service）
 * - toggleStatus(slug)：切换阅读状态（未读→在读→已读→未读）（progress-service 未实现，保留从 lib 导入）
 * - exportProgress()：导出所有文档进度为 JSON 字符串（progress-service 未实现，保留从 lib 导入）
 * - importProgress(json)：从 JSON 字符串导入进度数据（progress-service 未实现，保留从 lib 导入）
 */
import { toggleStatus, exportProgress, importProgress } from '@/lib/progress';
import { getProgress, type DocStatus } from '@/services/progress-service';
import '@/styles/islands/ProgressToggle.css';

/**
 * 组件属性
 * @prop slug - 文档的唯一标识符，对应文档的 URL 路径，用于在 localStorage 中定位进度数据
 */
interface ProgressToggleProps {
  /** 文档的唯一标识符，对应文档的 URL 路径 */
  slug: string;
}

/**
 * 进度追踪组件
 * 切换文档阅读状态，支持导入/导出进度数据
 */
export function ProgressToggle({ slug }: ProgressToggleProps) {
  /**
   * 当前文档的阅读状态
   * 初始值为 'unread'，挂载时从 localStorage 读取实际值
   */
  const [status, setStatus] = useState<DocStatus>('unread');

  /**
   * 操作中间状态，用于显示保存过程的视觉反馈
   * - 'idle'：空闲，显示默认状态
   * - 'saving'：保存中，显示旋转图标
   * - 'saved'：已保存，显示绿色勾选（0.8秒后回到 idle）
   * - 'error'：保存失败，显示红色警告（1.2秒后回到 idle）
   */
  const [busyState, setBusyState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  /** 隐藏的文件输入引用，用于触发文件选择对话框 */
  const fileInput = useRef<HTMLInputElement | null>(null);

  /**
   * 组件挂载初始化
   * 从 localStorage 读取当前文档的阅读状态
   */
  useEffect(() => {
    // 挂载时从 localStorage 读取当前文档的进度
    const p = getProgress(slug);
    if (p) setStatus(p.status);
  }, [slug]);

  /**
   * 状态对应的 CSS 类名
   * 用于控制圆点颜色和按钮样式
   * 例如：'unread' → 'status-unread'，'reading' → 'status-reading'
   */
  const statusClass = useMemo(() => `status-${status}`, [status]);

  /**
   * 状态对应的中文标签
   * 用于按钮文字和 aria-label 无障碍描述
   */
  const statusLabel = useMemo(() => {
    const map: Record<DocStatus, string> = { unread: '未读', reading: '在读', done: '已读' };
    return map[status];
  }, [status]);

  /**
   * 切换阅读状态：未读 → 在读 → 已读 → 未读
   * 流程：
   *   1. 防重复点击：如果正在保存中则直接返回
   *   2. 设置 busyState 为 'saving'，显示保存中动画
   *   3. 调用 toggleStatus() 更新 localStorage 中的状态
   *   4. 派发自定义事件 fan dex-progress-change，通知侧边栏等组件更新进度标记
   *   5. 设置 busyState 为 'saved'，显示已保存反馈
   *   6. 0.8秒后恢复 busyState 为 'idle'
   *   7. 异常时设置 busyState 为 'error'，1.2秒后恢复
   */
  const handleToggle = useCallback(() => {
    // 防重复点击：如果正在保存中则直接返回
    if (busyState === 'saving') return;

    setBusyState('saving');

    try {
      // 切换状态并更新 localStorage
      const next = toggleStatus(slug);
      setStatus(next);
      // 通知其他组件（如侧边栏）更新进度标记
      document.dispatchEvent(
        new CustomEvent('fandex-progress-change', {
          detail: { slug, status: next },
        })
      );

      setBusyState('saved');
      setTimeout(() => {
        setBusyState('idle');
      }, 800);
    } catch {
      setBusyState('error');
      setTimeout(() => {
        setBusyState('idle');
      }, 1200);
    }
  }, [slug, busyState]);

  /**
   * 导出进度为 JSON 文件下载
   * 流程：
   *   1. 调用 exportProgress() 获取所有文档进度的 JSON 字符串
   *   2. 创建 Blob 对象并生成临时 URL
   *   3. 创建隐藏的 <a> 元素触发下载
   *   4. 释放临时 URL，避免内存泄漏
   */
  const handleExport = useCallback(() => {
    const data = exportProgress();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fandex-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /**
   * 触发文件选择对话框
   * 通过编程方式点击隐藏的 <input type="file"> 元素
   */
  const triggerImport = useCallback(() => {
    fileInput.current?.click();
  }, []);

  /**
   * 处理导入进度文件
   * 流程：
   *   1. 获取用户选择的文件
   *   2. 使用 FileReader 读取文件内容
   *   3. 调用 importProgress() 解析并写入 localStorage
   *   4. 导入成功后刷新当前文档的状态
   *   5. 派发自定义事件通知其他组件更新
   *   6. 重置 input 值，允许重复选择同一文件
   * @param e - 文件选择事件
   */
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const ok = importProgress(reader.result as string);
        if (ok) {
          // 导入成功后刷新当前文档的状态
          const p = getProgress(slug);
          if (p) setStatus(p.status);
          // 通知所有组件刷新进度标记（不带 detail，表示全局更新）
          document.dispatchEvent(new CustomEvent('fandex-progress-change'));
        }
      };
      reader.readAsText(file);
      // 重置 input 值，允许重复选择同一文件
      input.value = '';
    },
    [slug]
  );

  return (
    // 进度追踪容器：通过 statusClass 动态添加状态类名，控制圆点颜色
    <div className={`progress-toggle ${statusClass}`}>
      {/* 主按钮：显示当前状态或保存中/已保存/失败等中间状态 */}
      <button
        className="progress-btn"
        title={statusLabel}
        aria-label={statusLabel}
        aria-busy={busyState === 'saving'}
        onClick={handleToggle}
      >
        {/* 保存中状态：旋转图标 + "保存中" 文字 */}
        {busyState === 'saving' && (
          <span className="progress-busy">
            <svg width="14" height="14" viewBox="0 0 24 24" className="progress-spin-icon">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="31.4"
                strokeDashoffset="10"
              />
            </svg>
            <span className="progress-label">保存中</span>
          </span>
        )}
        {/* 已保存状态：绿色勾选图标 + "已保存" 文字，0.8秒后淡出 */}
        {busyState === 'saved' && (
          <span className="progress-busy progress-saved">
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ color: '#10b981' }}>
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <span className="progress-label">已保存</span>
          </span>
        )}
        {/* 保存失败状态：红色警告图标 + "失败" 文字 */}
        {busyState === 'error' && (
          <span className="progress-busy progress-error">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              />
            </svg>
            <span className="progress-label">失败</span>
          </span>
        )}
        {/* 默认状态：状态圆点（颜色随阅读状态变化）+ 状态文字 */}
        {busyState === 'idle' && (
          <span className="progress-default">
            <span className="progress-dot"></span>
            <span className="progress-label">{statusLabel}</span>
          </span>
        )}
      </button>
      {/* 导出进度按钮：将所有文档进度导出为 JSON 文件 */}
      <button
        className="progress-export"
        title="导出进度"
        aria-label="导出进度"
        onClick={handleExport}
      >
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
      </button>
      {/* 导入进度按钮：点击触发隐藏的文件输入框 */}
      <button
        className="progress-import"
        title="导入进度"
        aria-label="导入进度"
        onClick={triggerImport}
      >
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
      </button>
      {/* 隐藏的文件输入，用于导入进度，仅接受 .json 文件
           可访问性：display:none 使屏幕阅读器跳过此元素，无需 aria-label；
           触发导入的按钮（上方 aria-label="导入进度"）已提供可访问名，
           通过 triggerImport() 编程触发 click 事件实现文件选择。 */}
      <input
        ref={fileInput}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
    </div>
  );
}

export default ProgressToggle;
