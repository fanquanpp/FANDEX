/**
 * FANDEX Windows 桌面端构建编排
 * -----------------------------------------------------------------------------
 * 流程：
 *   1. 在仓库根执行 pnpm build:web（Astro 静态构建 + pagefind 索引），
 *      并注入 DESKTOP_BUILD=1：web 端据此切换 base 为 /，页面 CSP 移除
 *      CDN 授权（DESKTOP_CSP），且构建期条件渲染直接不输出"在线编程"（playground）
 *      入口链接、不注册 Service Worker
 *   2. 剔除"前端实验室"页面产物（playground/）——桌面端不提供在线编程
 *   3. 产物目录即 Tauri 的 frontendDist（tauri.conf.json -> ../../app-web/dist，
 *      相对 src-tauri 解析），随后由 `tauri build` 打包为 Windows 安装包（NSIS）
 *
 * 注意：app-web/dist 被 web 与桌面两种构建共用且 base 互斥（/FANDEX/ vs /）。
 * 桌面构建完成后 dist 即桌面变体——仅供 Tauri 打包，勿直接当作 web 部署产物；
 * web 部署一律走 CI 独立构建（deploy.yml），本地不存在该混用场景。
 *
 * 用法（仓库根执行）：
 *   pnpm --filter @fandex/desktop build
 *   cd app-desktop && npx tauri build
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const dist = join(repoRoot, 'app-web', 'dist');

// 1. 构建 web 端（复用单一内容源与既有构建管线）
console.log('[1/2] 构建 app-web 静态站点...');
try {
  execSync('pnpm --filter @fandex/web build', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, DESKTOP_BUILD: '1' },
  });
} catch (e) {
  console.error('[error] app-web 构建失败（桌面端要求 pnpm 在 PATH 中，且内容管线可执行）');
  process.exit(1);
}
if (!existsSync(dist)) {
  console.error('app-web/dist 不存在，web 构建失败');
  process.exit(1);
}

// 2. 剔除前端实验室（playground）页面产物
// 入口链接已由 web 端构建期条件渲染（IS_DESKTOP_BUILD）移除，无需再做 HTML 后处理
console.log('[2/2] 剔除前端实验室（playground）产物...');
const playgroundDir = join(dist, 'playground');
if (existsSync(playgroundDir)) rmSync(playgroundDir, { recursive: true });

console.log('桌面端前端产物就绪：', dist);
console.log('注意：此时 dist 为桌面变体（base=/），仅供 Tauri 打包，勿直接部署为 web 站点');
console.log('下一步：cd app-desktop && npx tauri build');
