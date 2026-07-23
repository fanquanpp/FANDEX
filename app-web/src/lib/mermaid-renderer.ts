/**
 * Mermaid 渲染器
 * 封装 Mermaid 初始化与渲染逻辑，依赖 external-loader 加载 Mermaid 与 DOMPurify
 *
 * 设计原则：
 * - 单例初始化：同一页面仅初始化一次，避免重复调用 initialize
 * - DOMPurify 安全清洗：渲染后的 SVG 通过 DOMPurify 处理后再插入 DOM
 * - 所有 async 函数均通过 try-catch 包裹，异常时返回安全默认值
 */
import { loadMermaid, loadDOMPurify } from '@/lib/external-loader';

/** 标记 Mermaid 是否已初始化（避免重复调用 initialize） */
let mermaidInitialized = false;

/**
 * 初始化 Mermaid 库
 * 核心执行流程：
 *   1. 通过 external-loader 加载 Mermaid 脚本
 *   2. 调用 mermaid.initialize 配置主题与安全级别
 *   3. 标记已初始化，后续调用跳过初始化步骤
 * @returns Promise<void>，初始化完成 resolve，失败 reject
 */
export async function initMermaid(): Promise<void> {
  try {
    await loadMermaid();
    if (mermaidInitialized) return;
    const mermaid = window.mermaid;
    if (!mermaid) {
      throw new Error('Mermaid 加载后未在 window 上找到');
    }
    mermaid.initialize({
      startOnLoad: false,
      // 根据当前主题选择 Mermaid 配色
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
    });
    mermaidInitialized = true;
  } catch (err) {
    throw new Error(`Mermaid 初始化失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 渲染单个 Mermaid 代码块到 SVG
 * 核心执行流程：
 *   1. 确保 Mermaid 已初始化
 *   2. 调用 mermaid.render 生成 SVG 字符串
 *   3. 通过 DOMPurify 清洗 SVG 后插入 DOM 替换原始 pre 元素
 *   4. 渲染失败时显示错误占位符
 * @param pre - 待渲染的 pre 元素（包含 Mermaid 代码）
 * @param index - 元素索引，用于生成唯一 SVG id
 */
export async function renderMermaid(pre: HTMLElement, index: number): Promise<void> {
  try {
    await initMermaid();
    const mermaid = window.mermaid;
    if (!mermaid) return;

    const code = pre.textContent || '';
    const id = `mermaid-svg-${Date.now()}-${index}`;
    const { svg } = await mermaid.render(id, code);

    const container = document.createElement('div');
    container.className = 'mermaid-output';

    // 安全降级策略：DOMPurify 是必需的消毒层，禁止回退至未消毒的原始 SVG。
    // 即使 Mermaid securityLevel 已为 strict，仍坚持 DOMPurify 消毒以遵循纵深防御原则。
    // DOMPurify 加载失败时显示错误占位符，不渲染未消毒 SVG。
    try {
      await loadDOMPurify();
      const purify = window.DOMPurify;
      if (purify) {
        container.innerHTML = purify.sanitize(svg);
      } else {
        // DOMPurify 加载但实例异常：显示错误，不渲染未消毒 SVG
        container.textContent = 'Mermaid 渲染失败：DOMPurify 不可用';
      }
    } catch {
      // DOMPurify 加载失败：显示错误占位符，不回退至原始 SVG
      container.textContent = 'Mermaid 渲染失败：DOMPurify 加载失败';
    }

    pre.replaceWith(container);
  } catch {
    const errDiv = document.createElement('div');
    errDiv.className = 'mermaid-error';
    errDiv.textContent = 'Mermaid 渲染失败';
    pre.replaceWith(errDiv);
  }
}
