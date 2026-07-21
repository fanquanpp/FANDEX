/**
 * 运行时集中配置
 *
 * 统一管理站点地址、CDN 资源 URL、超时时长、搜索阈值等可配置项。
 * 优先从 import.meta.env（环境变量）读取，回退到代码内默认值。
 *
 * 环境变量命名约定：
 * - 客户端可访问变量以 PUBLIC_ 前缀开头（Astro 约定）
 * - 在 .env 或 CI Secrets 中设置即可覆盖默认值
 *
 * 使用方式：
 *   import { RUNTIME } from '@/config/runtime';
 *   const url = RUNTIME.mermaidCdn;
 */

/** 从环境变量读取字符串值，未设置时返回 fallback */
function envString(key: string, fallback: string): string {
  const value = import.meta.env[key] as string | undefined;
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** 从环境变量读取数值，未设置或无效时返回 fallback */
function envNumber(key: string, fallback: number): number {
  const raw = import.meta.env[key] as string | undefined;
  if (typeof raw !== 'string' || raw.length === 0) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** 集中配置对象：所有可配置项的唯一来源 */
export const RUNTIME = {
  /** 站点地址（用于 sitemap、canonical、RSS 等绝对链接生成） */
  siteUrl: envString('PUBLIC_SITE_URL', 'https://fanquanpp.github.io/FANDEX-web'),

  /** Mermaid 图表库 CDN 地址（v11） */
  mermaidCdn: envString(
    'PUBLIC_MERMAID_CDN',
    'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'
  ),

  /** DOMPurify HTML 消毒库 CDN 地址（v3） */
  dompurifyCdn: envString(
    'PUBLIC_DOMPURIFY_CDN',
    'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js'
  ),

  /** 3D Force Graph CDN 地址（vasturiano/3d-force-graph）
   * 基于 ThreeJS/WebGL 的 3D 力导向图组件，单图可渲染 10000+ 节点
   * 用于全局知识地图的大规模图渲染，替代 Mermaid 在大规模图场景下的渲染失败问题
   * 版本锁定 1.80.0（UMD 全局名 ForceGraph3D，与 npm 包 default export 一致） */
  forceGraphCdn: envString(
    'PUBLIC_FORCE_GRAPH_CDN',
    'https://cdn.jsdelivr.net/npm/3d-force-graph@1.80.0/dist/3d-force-graph.min.js'
  ),

  /** 代码运行器默认超时时间（毫秒），防止用户代码死循环 */
  codeRunnerTimeoutMs: envNumber('PUBLIC_CODE_RUNNER_TIMEOUT', 5000),

  /** Fuse.js 模糊搜索阈值（0=精确匹配，1=匹配任意） */
  fuseThreshold: envNumber('PUBLIC_FUSE_THRESHOLD', 0.4),
} as const;

/** 集中配置的类型声明，供外部模块引用 */
export type RuntimeConfig = typeof RUNTIME;
