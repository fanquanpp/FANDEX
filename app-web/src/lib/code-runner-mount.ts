/**
 * 代码运行器客户端挂载脚本
 *
 * 功能概述：
 * 扫描页面中由 remark-code-runner 插件生成的 div[data-code-runner] 容器，
 * 使用 React createRoot 动态挂载 CodeRunner 组件，实现 Markdown 中
 * ` ```lang runnable ` 代码块的交互式运行能力。
 *
 * 工作流程：
 *   1. DOMContentLoaded 时扫描所有 div[data-code-runner]
 *   2. 读取 data-lang、data-code、data-editable 属性
 *   3. 使用 decodeURIComponent 解码代码内容
 *   4. 创建 React Root 实例，挂载到容器内
 *
 * 设计原则：
 * - 懒加载：仅在页面存在 code-runner 容器时才加载 React 与 CodeRunner 组件
 * - 幂等性：同一容器不会被重复挂载（通过 data-mounted 标记）
 * - 资源释放：页面切换时（View Transitions）清理已挂载的 React Root 实例
 *
 * 使用方式：
 *   在 BaseLayout.astro 中通过 <script> 引入本模块
 *   或在需要 CodeRunner 的页面单独引入
 */

import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import CodeRunner from '@/islands/CodeRunner';
import type { CodeLanguage } from '@/services';

/** data 属性前缀，用于读取容器配置 */
const DATA_RUNNER = 'data-code-runner';
const DATA_LANG = 'data-lang';
const DATA_CODE = 'data-code';
const DATA_EDITABLE = 'data-editable';
const DATA_MOUNTED = 'data-mounted';

/** 已挂载的 React Root 实例列表（用于页面切换时清理） */
const mountedRoots: Root[] = [];

/** 支持的语言白名单（与 CodeLanguage 类型对齐，用于运行时校验） */
const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set([
  'javascript',
  'typescript',
  'python',
  'cpp',
  'c',
  'go',
]);

/**
 * 校验语言是否受支持
 * @param lang - 待校验的语言字符串
 * @returns 是否受支持
 */
function isSupportedLanguage(lang: string): lang is CodeLanguage {
  return SUPPORTED_LANGUAGES.has(lang);
}

/**
 * 解析容器的 data 属性，提取配置
 * @param container - div[data-code-runner] 元素
 * @returns 配置对象，或 null 表示配置无效
 */
function parseContainerConfig(container: HTMLElement): {
  lang: CodeLanguage;
  code: string;
  editable: boolean;
} | null {
  const lang = container.getAttribute(DATA_LANG);
  if (!lang || !isSupportedLanguage(lang)) return null;

  const encodedCode = container.getAttribute(DATA_CODE);
  if (!encodedCode) return null;

  // decodeURIComponent 解码代码内容
  let code: string;
  try {
    code = decodeURIComponent(encodedCode);
  } catch {
    // 编码格式错误，直接使用原始字符串
    code = encodedCode;
  }

  const editableAttr = container.getAttribute(DATA_EDITABLE);
  const editable = editableAttr !== 'false';

  return { lang, code, editable };
}

/**
 * 挂载单个 CodeRunner 实例到容器
 * @param container - div[data-code-runner] 元素
 */
function mountRunner(container: HTMLElement): void {
  // 幂等性检查：已挂载的容器跳过
  if (container.hasAttribute(DATA_MOUNTED)) return;

  const config = parseContainerConfig(container);
  if (!config) return;

  // 清空容器内容（移除可能的 fallback 内容）
  container.innerHTML = '';
  // 标记为已挂载
  container.setAttribute(DATA_MOUNTED, 'true');

  // 创建 React Root，传入 props 渲染 CodeRunner 组件
  const root = createRoot(container);
  root.render(
    createElement(CodeRunner, {
      lang: config.lang,
      code: config.code,
      editable: config.editable,
    }),
  );
  mountedRoots.push(root);
}

/**
 * 扫描页面中所有 code-runner 容器并挂载
 * 使用 requestAnimationFrame 确保 DOM 完全渲染
 */
export function mountAllCodeRunners(): void {
  // 延迟到下一帧，确保 Astro 页面切换动画完成
  requestAnimationFrame(() => {
    const containers = document.querySelectorAll<HTMLElement>(`[${DATA_RUNNER}]`);
    containers.forEach((container) => {
      try {
        mountRunner(container);
      } catch (err) {
        // 单个容器挂载失败不影响其他容器
        console.error('[code-runner-mount] 挂载失败:', err);
      }
    });
  });
}

/**
 * 卸载所有已挂载的 CodeRunner 实例
 * 在 Astro View Transitions 切换页面前调用
 */
export function unmountAllCodeRunners(): void {
  for (const root of mountedRoots) {
    try {
      root.unmount();
    } catch {
      // 卸载失败忽略，避免影响其他实例
    }
  }
  mountedRoots.length = 0;
}

/**
 * 初始化代码运行器挂载
 * 监听 DOMContentLoaded 与 Astro 页面切换事件
 *
 * 此函数应在客户端入口（BaseLayout 的 <script>）中调用一次
 */
export function initCodeRunnerMounting(): void {
  // 初始挂载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAllCodeRunners);
  } else {
    mountAllCodeRunners();
  }

  // Astro View Transitions：页面切换后重新挂载
  document.addEventListener('astro:page-load', mountAllCodeRunners);

  // 页面切换前卸载旧实例（避免内存泄漏）
  document.addEventListener('astro:before-swap', unmountAllCodeRunners);
}
