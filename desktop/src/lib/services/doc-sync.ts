/**
 * 文档同步核心逻辑（FANDEX Phase 5 - 网络文档更新）
 *
 * 功能概述：
 * - 拉取远程 manifest.json 文档清单
 * - 按模块或全量同步文档到 appDataDir 本地缓存
 * - 主源失败自动降级到备源
 * - 提供细粒度进度回调（用于 UI 进度条更新）
 * - 增量同步：基于 SHA-256 校验值跳过未变更文档
 *
 * 同步流程：
 * 1. fetchManifest() - 拉取远程清单
 * 2. syncModule(moduleId) / syncAll() - 按 manifest 拉取每个文档
 * 3. 每个文档按源优先级尝试，成功后写入 appDataDir
 * 4. 失败的文档记录到 errors 数组，不中断整体同步
 *
 * 使用示例：
 *   import { fetchManifest, syncModule } from '@/lib/services/doc-sync';
 *   const manifest = await fetchManifest();
 *   await syncModule('frontend/javascript', manifest, { onProgress: update });
 */

import {
  fetchTextFromRemote,
  isTauriEnv,
  readTextFromAppData,
  writeTextToAppData,
} from '@/lib/tauri-bridge';
import {
  buildDocUrl,
  buildManifestUrl,
  DOC_SOURCES,
  type DocManifest,
  type DocManifestEntry,
  type DocManifestModule,
  type DocSourceConfig,
  getDocCachePath,
  REMOTE_REPO_INFO,
} from './doc-source';

/**
 * 同步进度信息（传递给 UI 的进度回调）
 */
export interface SyncProgress {
  /** 当前阶段 */
  phase: 'manifest' | 'docs' | 'done' | 'error';
  /** 已完成的文档数 */
  completed: number;
  /** 总文档数（manifest 阶段时为 0） */
  total: number;
  /** 当前正在同步的文档相对路径（manifest 阶段为清单 URL） */
  current?: string;
  /** 当前使用的源显示名（如 "jsDelivr CDN"） */
  sourceName?: string;
  /** 错误信息（仅在 phase === 'error' 时有效） */
  error?: string;
}

/**
 * 同步选项
 */
export interface SyncOptions {
  /** 进度回调（每个文档同步前后触发） */
  onProgress?: (progress: SyncProgress) => void;
  /** 单文档请求超时（毫秒），默认 15000 */
  timeoutMs?: number;
  /** 是否启用增量同步（基于 SHA 校验，默认 true） */
  incremental?: boolean;
}

/**
 * 单文档同步结果
 */
export interface DocSyncResult {
  /** 文档相对路径 */
  path: string;
  /** 是否成功 */
  success: boolean;
  /** 使用的源（成功时） */
  source?: DocSourceConfig;
  /** 错误信息（失败时） */
  error?: string;
  /** 文件大小（字节） */
  size?: number;
  /** 是否跳过（增量同步时） */
  skipped?: boolean;
}

/**
 * 模块同步结果汇总
 */
export interface ModuleSyncResult {
  /** 模块 ID */
  moduleId: string;
  /** 模块显示名 */
  moduleName: string;
  /** 总文档数 */
  total: number;
  /** 成功文档数 */
  succeeded: number;
  /** 跳过文档数（增量同步） */
  skipped: number;
  /** 失败文档数 */
  failed: number;
  /** 每个文档的详细结果 */
  docs: DocSyncResult[];
  /** 使用的源（首个成功的源） */
  usedSource?: DocSourceConfig;
}

/**
 * 全量同步结果汇总
 */
export interface FullSyncResult {
  /** 远程清单版本 */
  manifestVersion: string;
  /** 清单生成时间 */
  manifestGeneratedAt: string;
  /** 使用的源 */
  usedSource?: DocSourceConfig;
  /** 总模块数 */
  totalModules: number;
  /** 总文档数 */
  totalDocs: number;
  /** 成功文档数 */
  succeeded: number;
  /** 跳过文档数 */
  skipped: number;
  /** 失败文档数 */
  failed: number;
  /** 各模块结果 */
  modules: ModuleSyncResult[];
  /** 同步耗时（毫秒） */
  duration: number;
}

/**
 * 简易 SHA-256 计算函数
 *
 * 使用浏览器/Tauri 内置 SubtleCrypto API，无需第三方依赖。
 * 在 SSR 阶段（Node.js）也可用，因 Node 18+ 全局提供了 crypto.subtle。
 *
 * @param text - 待校验文本
 * @returns 十六进制 SHA-256 字符串
 */
async function computeSha256(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // 降级：返回空字符串，触发同步逻辑忽略校验直接下载
    return '';
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 拉取远程文档清单
 *
 * 实现说明：
 * - 按 DOC_SOURCES 优先级依次尝试
 * - 主源成功后立即返回，不尝试备源
 * - 主源失败时自动降级到备源
 * - 所有源都失败时抛出最后一个错误
 *
 * @param options - 同步选项
 * @returns 文档清单对象
 * @throws Error 当所有源都失败时
 */
export async function fetchManifest(
  options: SyncOptions = {},
): Promise<{ manifest: DocManifest; source: DocSourceConfig }> {
  const { onProgress, timeoutMs = 15000 } = options;

  onProgress?.({
    phase: 'manifest',
    completed: 0,
    total: 0,
    current: 'manifest.json',
  });

  let lastError: Error | null = null;

  for (const source of DOC_SOURCES) {
    const url = buildManifestUrl(source);
    try {
      onProgress?.({
        phase: 'manifest',
        completed: 0,
        total: 0,
        current: url,
        sourceName: source.name,
      });

      const text = await fetchTextFromRemote(url, { timeoutMs });
      const manifest = JSON.parse(text) as DocManifest;

      // 基础结构校验
      if (!manifest || typeof manifest !== 'object') {
        throw new Error('清单格式无效：不是合法的 JSON 对象');
      }
      if (!Array.isArray(manifest.modules)) {
        throw new Error('清单格式无效：缺少 modules 数组');
      }

      onProgress?.({
        phase: 'manifest',
        completed: 1,
        total: 1,
        current: url,
        sourceName: source.name,
      });

      return { manifest, source };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // 继续尝试下一个源
    }
  }

  const errorMessage = `拉取文档清单失败（所有源均不可用）：${lastError?.message ?? '未知错误'}`;
  onProgress?.({
    phase: 'error',
    completed: 0,
    total: 0,
    error: errorMessage,
  });
  throw new Error(errorMessage);
}

/**
 * 同步单个文档
 *
 * 实现说明：
 * - 按源优先级依次尝试
 * - 成功后写入 appDataDir
 * - 增量同步模式：若本地已存在且 SHA 匹配则跳过
 *
 * @param entry - 文档清单条目
 * @param options - 同步选项
 * @returns 同步结果
 */
export async function syncSingleDoc(
  entry: DocManifestEntry,
  options: SyncOptions = {},
): Promise<DocSyncResult> {
  const { onProgress, timeoutMs = 15000, incremental = true } = options;
  const cachePath = getDocCachePath(entry.path);

  // 增量同步：检查本地缓存是否已是最新
  if (incremental && entry.sha) {
    try {
      const cachedContent = await readTextFromAppData(cachePath);
      if (cachedContent !== null) {
        const localSha = await computeSha256(cachedContent);
        if (localSha && localSha === entry.sha) {
          return {
            path: entry.path,
            success: true,
            skipped: true,
            size: cachedContent.length,
          };
        }
      }
    } catch {
      // 增量校验失败，继续走完整同步流程
    }
  }

  // 按源优先级依次尝试
  let lastError: Error | null = null;

  for (const source of DOC_SOURCES) {
    const url = buildDocUrl(source, entry.path);
    try {
      onProgress?.({
        phase: 'docs',
        completed: 0,
        total: 1,
        current: entry.path,
        sourceName: source.name,
      });

      const content = await fetchTextFromRemote(url, { timeoutMs });

      // 写入 appDataDir
      await writeTextToAppData(cachePath, content);

      return {
        path: entry.path,
        success: true,
        source,
        size: content.length,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // 继续尝试下一个源
    }
  }

  return {
    path: entry.path,
    success: false,
    error: lastError?.message ?? '未知错误',
  };
}

/**
 * 同步单个模块的全部文档
 *
 * @param moduleId - 模块 ID
 * @param manifest - 远程清单（用于定位模块）
 * @param options - 同步选项
 * @returns 模块同步结果
 */
export async function syncModule(
  moduleId: string,
  manifest: DocManifest,
  options: SyncOptions = {},
): Promise<ModuleSyncResult> {
  const moduleManifest = manifest.modules.find((m) => m.id === moduleId);
  if (!moduleManifest) {
    throw new Error(`模块 ${moduleId} 不在远程清单中`);
  }

  return syncModuleDirect(moduleManifest, options);
}

/**
 * 直接基于模块清单条目同步（无需查找）
 *
 * @param moduleManifest - 模块清单条目
 * @param options - 同步选项
 * @returns 模块同步结果
 */
export async function syncModuleDirect(
  moduleManifest: DocManifestModule,
  options: SyncOptions = {},
): Promise<ModuleSyncResult> {
  const { onProgress } = options;
  const total = moduleManifest.docs.length;
  let completed = 0;
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const docs: DocSyncResult[] = [];
  let usedSource: DocSourceConfig | undefined;

  for (const entry of moduleManifest.docs) {
    const result = await syncSingleDoc(entry, options);
    docs.push(result);

    if (result.success) {
      succeeded++;
      if (!usedSource && result.source) {
        usedSource = result.source;
      }
      if (result.skipped) {
        skipped++;
      }
    } else {
      failed++;
    }

    completed++;
    onProgress?.({
      phase: 'docs',
      completed,
      total,
      current: entry.path,
      sourceName: result.source?.name,
    });
  }

  return {
    moduleId: moduleManifest.id,
    moduleName: moduleManifest.name,
    total,
    succeeded,
    skipped,
    failed,
    docs,
    usedSource,
  };
}

/**
 * 全量同步所有模块的所有文档
 *
 * @param options - 同步选项
 * @returns 全量同步结果
 */
export async function syncAll(options: SyncOptions = {}): Promise<FullSyncResult> {
  const { onProgress } = options;
  const startTime = Date.now();

  // 第一步：拉取清单
  const { manifest, source } = await fetchManifest(options);

  // 第二步：计算总文档数
  const totalDocs = manifest.modules.reduce((sum, m) => sum + m.docs.length, 0);
  let completedDocs = 0;
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const moduleResults: ModuleSyncResult[] = [];

  // 第三步：逐模块同步
  for (const moduleManifest of manifest.modules) {
    // 包裹 onProgress 以反映整体进度
    const wrappedOptions: SyncOptions = {
      ...options,
      onProgress: (progress) => {
        onProgress?.({
          ...progress,
          completed: completedDocs + progress.completed,
          total: totalDocs,
        });
      },
    };

    const moduleResult = await syncModuleDirect(moduleManifest, wrappedOptions);
    moduleResults.push(moduleResult);

    completedDocs += moduleResult.total;
    succeeded += moduleResult.succeeded;
    skipped += moduleResult.skipped;
    failed += moduleResult.failed;
  }

  onProgress?.({
    phase: 'done',
    completed: completedDocs,
    total: totalDocs,
  });

  return {
    manifestVersion: manifest.version,
    manifestGeneratedAt: manifest.generatedAt,
    usedSource: source,
    totalModules: manifest.modules.length,
    totalDocs,
    succeeded,
    skipped,
    failed,
    modules: moduleResults,
    duration: Date.now() - startTime,
  };
}

/**
 * 检查远程清单版本（不下载文档，仅用于检查是否有更新）
 *
 * @returns 远程清单版本号与生成时间；获取失败时返回 null
 */
export async function checkRemoteVersion(): Promise<{
  version: string;
  generatedAt: string;
} | null> {
  try {
    const { manifest } = await fetchManifest({ timeoutMs: 10000 });
    return {
      version: manifest.version,
      generatedAt: manifest.generatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * 获取本地缓存文档
 *
 * 优先级：appDataDir > null
 * （内置内容由 SSG 阶段打包进 dist，不通过此函数读取）
 *
 * @param relativePath - 文档相对路径
 * @returns 文档内容；不存在时返回 null
 */
export async function getCachedDoc(relativePath: string): Promise<string | null> {
  const cachePath = getDocCachePath(relativePath);
  return readTextFromAppData(cachePath);
}

/**
 * 检查是否在 Tauri 桌面环境中（决定网络同步功能是否可用）
 *
 * 浏览器环境降级提示：CORS 限制可能导致部分源不可用
 */
export async function isSyncAvailable(): Promise<boolean> {
  return isTauriEnv();
}

/**
 * 获取远程仓库元信息（用于 UI 显示）
 */
export { REMOTE_REPO_INFO };
