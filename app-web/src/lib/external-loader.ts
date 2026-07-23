/**
 * 外部 CDN 资源统一加载器
 * 封装 Mermaid 与 DOMPurify 的动态加载逻辑，提供单例缓存与失败重试机制
 *
 * 设计原则：
 * - 同一资源在同一页面生命周期内仅加载一次（缓存 Promise）
 * - 加载失败自动重试，超过最大重试次数后抛出错误
 * - 所有 async 函数均通过 try-catch 包裹，避免抛出未捕获异常
 *
 * CDN 地址等可配置项统一从 `@/config/runtime` 读取，
 * 支持通过环境变量（PUBLIC_MERMAID_CDN / PUBLIC_DOMPURIFY_CDN）覆盖默认值。
 */
import { RUNTIME } from '@/config/runtime';

/** 最大重试次数（含首次加载） */
const MAX_RETRY = 3;
/** 单次加载超时时间（毫秒） */
const LOAD_TIMEOUT_MS = 10000;

/** 加载结果缓存：key 为脚本 URL，value 为加载 Promise */
const loadCache = new Map<string, Promise<void>>();

/**
 * 在指定超时时间内加载单个 script 标签
 * @param url - 脚本 URL
 * @returns Promise<void>，加载成功 resolve，失败或超时 reject
 */
function loadScriptWithTimeout(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    const timer = window.setTimeout(() => {
      script.onload = null;
      script.onerror = null;
      script.remove();
      reject(new Error(`加载超时: ${url}`));
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error(`加载失败: ${url}`));
    };

    document.head.appendChild(script);
  });
}

/**
 * 通用 CDN 脚本加载器：含缓存与失败重试
 * 核心执行流程：
 *   1. 命中缓存则直接返回缓存 Promise
 *   2. 否则按指数退避策略重试加载（最多 MAX_RETRY 次）
 *   3. 加载成功后缓存 Promise，避免重复加载
 * @param url - 脚本 URL
 * @returns Promise<void>，加载成功 resolve，全部重试失败 reject
 */
async function loadExternalScript(url: string): Promise<void> {
  const cached = loadCache.get(url);
  if (cached) return cached;

  const promise = (async () => {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        await loadScriptWithTimeout(url);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // 最后一次尝试不再等待
        if (attempt < MAX_RETRY) {
          const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          await new Promise<void>((r) => window.setTimeout(r, backoff));
        }
      }
    }
    throw lastError || new Error(`加载失败: ${url}`);
  })();

  loadCache.set(url, promise);
  try {
    await promise;
  } catch (err) {
    // 加载失败时清除缓存，允许后续重新尝试
    loadCache.delete(url);
    throw err;
  }
}

/**
 * 加载 Mermaid 库（v11）
 * 内部使用缓存，同一页面多次调用仅触发一次实际加载
 * CDN 地址从 `RUNTIME.mermaidCdn` 读取，可通过环境变量 PUBLIC_MERMAID_CDN 覆盖
 * @returns Promise<void>，加载完成 resolve，失败 reject
 */
export async function loadMermaid(): Promise<void> {
  try {
    await loadExternalScript(RUNTIME.mermaidCdn);
  } catch (err) {
    throw new Error(`Mermaid 加载失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 加载 DOMPurify 库（v3）
 * 内部使用缓存，同一页面多次调用仅触发一次实际加载
 * CDN 地址从 `RUNTIME.dompurifyCdn` 读取，可通过环境变量 PUBLIC_DOMPURIFY_CDN 覆盖
 * @returns Promise<void>，加载完成 resolve，失败 reject
 */
export async function loadDOMPurify(): Promise<void> {
  try {
    await loadExternalScript(RUNTIME.dompurifyCdn);
  } catch (err) {
    throw new Error(`DOMPurify 加载失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 加载 3D Force Graph（ThreeJS/WebGL 力导向图）
 * 用于全局知识地图的大规模图渲染（52 模块 + 2065 文档 + 4583 关系）
 * 替代 Mermaid 在大规模图场景下的渲染失败问题
 *
 * CDN 地址从 `RUNTIME.forceGraphCdn` 读取，可通过环境变量 PUBLIC_FORCE_GRAPH_CDN 覆盖
 * 加载成功后挂载到 window.ForceGraph3D（注意：UMD 全局名为 ForceGraph3D，与 npm 包 default export 一致）
 *
 * @returns Promise<void>，加载完成 resolve，失败 reject
 */
export async function loadForceGraph(): Promise<void> {
  try {
    await loadExternalScript(RUNTIME.forceGraphCdn);
  } catch (err) {
    throw new Error(`3D Force Graph 加载失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}
