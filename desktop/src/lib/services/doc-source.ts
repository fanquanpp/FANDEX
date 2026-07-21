/**
 * 文档源配置与 URL 构建（FANDEX Phase 5 - 网络文档更新）
 *
 * 功能概述：
 * - 定义远程文档源（jsDelivr CDN 主源 + GitHub Raw 备源）
 * - 提供 manifest.json URL 与单文档 URL 的统一构建函数
 * - 支持源切换：主源失败自动降级到备源
 * - 所有 URL 必须在 capabilities/default.json 的 HTTP 白名单中声明
 *
 * 设计考量：
 * - 远程仓库固定为 fanquanpp/FANDEX-web（用户原始请求）
 * - 主源 jsDelivr：全球 CDN 加速，国内访问稳定，无速率限制
 * - 备源 GitHub Raw：官方原始通道，jsDelivr 失败时降级使用
 * - 分支固定为 main，未来扩展点：支持 tag/commit 锁定
 * - 文档内容路径与 FANDEX-exe 的 content/ 目录结构保持一致
 *
 * 安全约束：
 * - URL 域名必须出现在 src-tauri/capabilities/default.json 的 http:default allow 列表中
 * - URL 域名必须出现在 src-tauri/tauri.conf.json 的 CSP connect-src 指令中
 */

/**
 * 远程文档源类型
 *
 * - primary：主源（jsDelivr CDN，全球加速）
 * - fallback：备源（GitHub Raw，原始通道）
 */
export type DocSourceKind = 'primary' | 'fallback';

/**
 * 文档源配置
 */
export interface DocSourceConfig {
  /** 源类型 */
  kind: DocSourceKind;
  /** 源显示名（用于日志与 UI 提示） */
  name: string;
  /** 源基础 URL（不含路径） */
  baseUrl: string;
}

/**
 * FANDEX-Web 仓库 GitHub Owner/Repo
 *
 * 用户原始请求："文档从 fandexweb 仓库中下载或通过网页端获取"
 */
const REMOTE_OWNER = 'fanquanpp';
const REMOTE_REPO = 'FANDEX-web';
const REMOTE_BRANCH = 'main';

/**
 * 文档在远程仓库中的根路径
 *
 * 与 FANDEX-exe 的 content/ 目录结构保持一致，
 * 便于双向同步与离线/在线内容互换。
 */
const REMOTE_CONTENT_ROOT = 'src/content';

/**
 * 主源：jsDelivr CDN
 *
 * - URL 格式：https://cdn.jsdelivr.net/gh/<owner>/<repo>@<branch>/<path>
 * - 优势：全球加速、国内访问稳定、无速率限制
 * - 缓存：默认 12 小时边缘缓存，可通过 purge 接口刷新
 */
const JSDELIVR_BASE = `https://cdn.jsdelivr.net/gh/${REMOTE_OWNER}/${REMOTE_REPO}@${REMOTE_BRANCH}`;

/**
 * 备源：GitHub Raw
 *
 * - URL 格式：https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>
 * - 优势：官方原始通道，无中间缓存
 * - 限制：未认证请求有 60 次/小时速率限制（按 IP 计）
 */
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${REMOTE_OWNER}/${REMOTE_REPO}/${REMOTE_BRANCH}`;

/**
 * 文档源列表（按优先级排序）
 *
 * 同步逻辑会按顺序尝试每个源，直到成功为止。
 * 未来扩展点：可在此数组中追加更多镜像源。
 */
export const DOC_SOURCES: readonly DocSourceConfig[] = [
  {
    kind: 'primary',
    name: 'jsDelivr CDN',
    baseUrl: JSDELIVR_BASE,
  },
  {
    kind: 'fallback',
    name: 'GitHub Raw',
    baseUrl: GITHUB_RAW_BASE,
  },
] as const;

/**
 * 文档清单文件路径（相对于 REMOTE_CONTENT_ROOT）
 *
 * manifest.json 协议：
 * {
 *   "version": "2026.07.21",
 *   "generatedAt": "2026-07-21T10:00:00Z",
 *   "modules": [
 *     {
 *       "id": "frontend/javascript",
 *       "name": "JavaScript",
 *       "docs": [
 *         { "path": "frontend/javascript/概述.md", "sha": "<sha256>", "size": 12345 }
 *       ]
 *     }
 *   ]
 * }
 *
 * 若远程仓库尚未提供 manifest.json，同步逻辑会降级为
 * "按模块列表尝试拉取每个文档"，并跳过不存在的文件。
 */
const MANIFEST_PATH = 'manifest.json';

/**
 * 文档清单条目（单文档元信息）
 */
export interface DocManifestEntry {
  /** 文档相对路径（相对于 content 根目录，如 `frontend/javascript/概述.md`） */
  path: string;
  /** 文件 SHA-256 校验值（可选，用于增量同步校验） */
  sha?: string;
  /** 文件大小（字节，可选） */
  size?: number;
}

/**
 * 模块清单（模块下所有文档的集合）
 */
export interface DocManifestModule {
  /** 模块 ID（如 `frontend/javascript`） */
  id: string;
  /** 模块显示名 */
  name: string;
  /** 模块下所有文档条目 */
  docs: DocManifestEntry[];
}

/**
 * 完整的文档清单
 */
export interface DocManifest {
  /** 清单版本号（日期或递增数字） */
  version: string;
  /** 清单生成时间（ISO 8601 字符串） */
  generatedAt: string;
  /** 模块列表 */
  modules: DocManifestModule[];
}

/**
 * 构建指定源上的 manifest.json URL
 *
 * @param source - 文档源配置
 * @returns manifest.json 完整 URL
 */
export function buildManifestUrl(source: DocSourceConfig): string {
  return `${source.baseUrl}/${REMOTE_CONTENT_ROOT}/${MANIFEST_PATH}`;
}

/**
 * 构建指定源上的单文档 URL
 *
 * @param source - 文档源配置
 * @param relativePath - 文档相对路径（相对于 content 根目录）
 * @returns 文档完整 URL
 */
export function buildDocUrl(source: DocSourceConfig, relativePath: string): string {
  // 规范化路径：去除开头多余的 /
  const normalizedPath = relativePath.replace(/^\/+/, '');
  return `${source.baseUrl}/${REMOTE_CONTENT_ROOT}/${normalizedPath}`;
}

/**
 * 获取所有文档源的 manifest URL 列表（按优先级）
 *
 * @returns URL 与源配置的配对数组
 */
export function getAllManifestUrls(): ReadonlyArray<{ source: DocSourceConfig; url: string }> {
  return DOC_SOURCES.map((source) => ({
    source,
    url: buildManifestUrl(source),
  }));
}

/**
 * 获取所有文档源上指定文档的 URL 列表（按优先级）
 *
 * @param relativePath - 文档相对路径
 * @returns URL 与源配置的配对数组
 */
export function getAllDocUrls(
  relativePath: string,
): ReadonlyArray<{ source: DocSourceConfig; url: string }> {
  return DOC_SOURCES.map((source) => ({
    source,
    url: buildDocUrl(source, relativePath),
  }));
}

/**
 * 获取文档在 appDataDir 中的相对存储路径
 *
 * 存储路径约定：fandex-docs/<relativePath>
 * 例如：frontend/javascript/概述.md → 写入 $APPDATA/fandex-docs/frontend/javascript/概述.md
 *
 * @param relativePath - 文档相对路径
 * @returns appDataDir 内的相对路径（不含 `fandex-docs/` 前缀，由 tauri-bridge 添加）
 */
export function getDocCachePath(relativePath: string): string {
  return relativePath.replace(/^\/+/, '');
}

/**
 * 获取远程仓库元信息（用于 UI 显示与诊断）
 */
export const REMOTE_REPO_INFO = {
  owner: REMOTE_OWNER,
  repo: REMOTE_REPO,
  branch: REMOTE_BRANCH,
  contentRoot: REMOTE_CONTENT_ROOT,
  /** GitHub 仓库主页 URL */
  homepage: `https://github.com/${REMOTE_OWNER}/${REMOTE_REPO}`,
  /** GitHub 仓库 src/content 目录 URL */
  contentUrl: `https://github.com/${REMOTE_OWNER}/${REMOTE_REPO}/tree/${REMOTE_BRANCH}/${REMOTE_CONTENT_ROOT}`,
} as const;
