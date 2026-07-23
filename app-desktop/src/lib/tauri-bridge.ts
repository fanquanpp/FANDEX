/**
 * Tauri 与浏览器环境的统一抽象层
 *
 * 功能概述：
 * - 检测当前是否运行在 Tauri 桌面环境中
 * - 提供统一的远程文本获取 API：
 *   - Tauri 环境：使用 @tauri-apps/plugin-http（绕过 CORS，受 capabilities 控制）
 *   - 浏览器环境：使用原生 fetch（受 CORS 限制）
 * - 提供 appDataDir 文件读写 API：
 *   - Tauri 环境：使用 @tauri-apps/plugin-fs 写入 $APPDATA
 *   - 浏览器环境：降级到 localStorage（仅限小型 JSON 缓存）
 * - 动态 import 策略：所有 Tauri 插件通过 await import() 加载，
 *   避免 SSG/SSR 阶段在 Node.js 中加载浏览器专属模块
 *
 * 设计考量：
 * - 未来扩展点：若需支持其他运行时（如 Electron），可在 isTauriEnv() 后增加分支
 * - 错误处理：所有 API 均返回 Promise<T>，失败时抛出带上下文的 Error
 * - 安全约束：远程 URL 必须在 capabilities/default.json 的白名单中声明
 */

/**
 * 检测当前是否运行在 Tauri 桌面环境中
 *
 * 实现说明：
 * - 通过 @tauri-apps/api/core 的 isTauri() 函数检测
 * - 动态 import 避免在浏览器/SSG 阶段加载 Tauri API
 * - 浏览器环境返回 false
 *
 * @returns 是否在 Tauri 环境中
 */
export async function isTauriEnv(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  // Tauri 2 在 window.__TAURI_INTERNALS__ 上注入内部句柄
  if (!('__TAURI_INTERNALS__' in window)) return false;
  try {
    const core = await import('@tauri-apps/api/core');
    return typeof core.isTauri === 'function' && core.isTauri();
  } catch {
    return false;
  }
}

/**
 * 同步版本的 Tauri 环境检测（仅检查内部句柄，不调用动态 import）
 * 适用于在 React 渲染阶段快速判断，避免异步调用
 *
 * @returns 是否在 Tauri 环境中
 */
export function isTauriSync(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI_INTERNALS__' in window;
}

/**
 * 远程文本获取选项
 */
export interface FetchTextOptions {
  /** 请求超时时间（毫秒），默认 15000 */
  timeoutMs?: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

/**
 * 获取远程文本内容
 *
 * 实现说明：
 * - Tauri 环境：使用 @tauri-apps/plugin-http 的 fetch（绕过 CORS）
 * - 浏览器环境：使用原生 fetch（受 CORS 限制，需目标站点允许跨域）
 * - 超时控制：Tauri 端通过 AbortController 实现
 *
 * @param url - 目标 URL（必须在 capabilities 白名单中）
 * @param options - 请求选项
 * @returns 文本内容
 * @throws Error 当请求失败或超时时抛出
 */
export async function fetchTextFromRemote(
  url: string,
  options: FetchTextOptions = {},
): Promise<string> {
  const { timeoutMs = 15000, headers = {} } = options;

  const tauriMode = await isTauriEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    if (tauriMode) {
      // Tauri 环境：使用 plugin-http 的 fetch
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      response = await tauriFetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    } else {
      // 浏览器环境：使用原生 fetch
      response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} (${url})`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`请求超时（${timeoutMs}ms）：${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 将文本内容写入 Tauri appDataDir 下的指定路径
 *
 * 实现说明：
 * - Tauri 环境：使用 @tauri-apps/plugin-fs 写入 $APPDATA/fandex-docs/<relativePath>
 * - 浏览器环境：降级到 localStorage（仅适用于小文本，且有 5MB 总量限制）
 *
 * @param relativePath - 相对路径（如 `docs/javascript/概述.md`）
 * @param content - 文本内容
 * @returns 实际写入的绝对路径（Tauri 环境）或 localStorage 键名（浏览器环境）
 * @throws Error 当 Tauri 环境下写入失败时抛出
 */
export async function writeTextToAppData(relativePath: string, content: string): Promise<string> {
  const tauriMode = await isTauriEnv();

  if (!tauriMode) {
    // 浏览器降级：写入 localStorage，键名带前缀避免冲突
    const key = `fandex-doc-cache:${relativePath}`;
    try {
      localStorage.setItem(key, content);
      return key;
    } catch (error) {
      throw new Error(
        `localStorage 写入失败（可能超出容量）：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Tauri 环境：写入 appDataDir
  const { writeTextFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
  const { appDataDir } = await import('@tauri-apps/api/path');

  const baseDir = await appDataDir();
  // 文档缓存统一存放在 $APPDATA/fandex-docs/ 下
  const fullPath = `${baseDir}/fandex-docs/${relativePath}`;
  const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));

  // 确保目录存在
  const dirExists = await exists(dirPath);
  if (!dirExists) {
    await mkdir(dirPath, { recursive: true });
  }

  await writeTextFile(fullPath, content);
  return fullPath;
}

/**
 * 从 Tauri appDataDir 读取文本内容
 *
 * @param relativePath - 相对路径（如 `docs/javascript/概述.md`）
 * @returns 文本内容；不存在时返回 null
 * @throws Error 当 Tauri 环境下读取失败时抛出
 */
export async function readTextFromAppData(relativePath: string): Promise<string | null> {
  const tauriMode = await isTauriEnv();

  if (!tauriMode) {
    const key = `fandex-doc-cache:${relativePath}`;
    return localStorage.getItem(key);
  }

  const { readTextFile, exists } = await import('@tauri-apps/plugin-fs');
  const { appDataDir } = await import('@tauri-apps/api/path');

  const baseDir = await appDataDir();
  const fullPath = `${baseDir}/fandex-docs/${relativePath}`;

  const fileExists = await exists(fullPath);
  if (!fileExists) return null;

  return await readTextFile(fullPath);
}

/**
 * 删除 appDataDir 下的指定文件（用于清理过期缓存）
 *
 * @param relativePath - 相对路径
 */
export async function removeFileFromAppData(relativePath: string): Promise<void> {
  const tauriMode = await isTauriEnv();

  if (!tauriMode) {
    localStorage.removeItem(`fandex-doc-cache:${relativePath}`);
    return;
  }

  const { remove, exists } = await import('@tauri-apps/plugin-fs');
  const { appDataDir } = await import('@tauri-apps/api/path');

  const baseDir = await appDataDir();
  const fullPath = `${baseDir}/fandex-docs/${relativePath}`;

  const fileExists = await exists(fullPath);
  if (fileExists) {
    await remove(fullPath);
  }
}

/**
 * 获取当前应用版本号
 *
 * @returns 版本号字符串（如 "3.1.0"）；非 Tauri 环境返回 "web"
 */
export async function getAppVersion(): Promise<string> {
  const tauriMode = await isTauriEnv();
  if (!tauriMode) return 'web';

  try {
    const core = await import('@tauri-apps/api/core');
    const version = await core.invoke<string>('get_app_version');
    return version;
  } catch {
    return 'unknown';
  }
}

/**
 * 获取 appDataDir 绝对路径（仅 Tauri 环境）
 *
 * @returns appDataDir 绝对路径；非 Tauri 环境返回 null
 */
export async function getAppDataDir(): Promise<string | null> {
  const tauriMode = await isTauriEnv();
  if (!tauriMode) return null;

  const { appDataDir } = await import('@tauri-apps/api/path');
  return await appDataDir();
}
