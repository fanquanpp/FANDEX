/**
 * Mermaid 全局类型声明
 * 声明通过 CDN 引入的 Mermaid 库在 window 上的类型结构
 * 仅声明实际使用的 initialize 与 render 方法，避免维护完整类型
 */

/** Mermaid 渲染结果对象 */
interface MermaidRenderResult {
  /** 渲染后的 SVG 字符串 */
  svg: string;
  /** 绑定函数（Mermaid 内部使用，本项目不使用） */
  bindFunctions?: (element: Element) => void;
}

/** Mermaid 初始化配置（仅声明本项目使用的字段） */
interface MermaidConfig {
  /** 是否在页面加载时自动渲染，本项目设为 false 由代码显式触发 */
  startOnLoad?: boolean;
  /** 主题：'default' | 'dark' | 'forest' | 'neutral' */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  /** 安全级别：'strict' | 'loose' | 'antiscript' | 'sandbox' */
  securityLevel?: 'strict' | 'loose' | 'antiscript' | 'sandbox';
}

/** Mermaid 库实例接口 */
interface MermaidApi {
  /** 初始化 Mermaid 配置 */
  initialize(config: MermaidConfig): void;
  /** 渲染指定 id 的 Mermaid 图表，返回 SVG 字符串 */
  render(id: string, code: string): Promise<MermaidRenderResult>;
}

/** 在 window 上扩展 mermaid 字段 */
interface Window {
  mermaid: MermaidApi;
}
