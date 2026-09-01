/**
 * FANDEX Windows 桌面端构建编排
 * -----------------------------------------------------------------------------
 * 流程：
 *   1. 在仓库根执行 pnpm build:web（Astro 静态构建 + pagefind 索引）
 *   2. 桌面适配后处理：
 *      a. 剔除"前端实验室"页面（playground/）——桌面端不提供在线编程
 *      b. 从静态 HTML 中移除指向 playground 的导航入口，避免死链
 *   3. 产物目录即 Tauri 的 frontendDist（tauri.conf.json -> ../app-web/dist）
 *      随后由 `tauri build` 打包为 Windows 安装包（NSIS）
 *
 * 用法（仓库根执行）：
 *   pnpm --filter @fandex/desktop build
 *   cd app-desktop && npx tauri build
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const dist = join(repoRoot, 'app-web', 'dist');

// 1. 构建 web 端（复用单一内容源与既有构建管线）
console.log('[1/3] 构建 app-web 静态站点...');
execSync('pnpm --filter @fandex/web build', {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, DESKTOP_BUILD: '1' },
});
if (!existsSync(dist)) {
  console.error('app-web/dist 不存在，web 构建失败');
  process.exit(1);
}

// 2. 剔除前端实验室（playground）页面
console.log('[2/3] 剔除前端实验室（playground）...');
const playgroundDir = join(dist, 'playground');
if (existsSync(playgroundDir)) rmSync(playgroundDir, { recursive: true });

// 3. 清理静态 HTML 中的 playground 导航入口（首页 hero 功能入口等）
console.log('[3/3] 清理静态 HTML 中的 playground 入口...');
const htmlFiles = [];
const walk = d => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
};
walk(dist);
// 匹配指向 playground 的整个 <a> 元素（内部无嵌套链接，非贪婪到最近的 </a>）
const rePlaygroundLink = /<a\s[^>]*href="[^"]*playground\/?"[^>]*>[\s\S]*?<\/a>/g;
let removed = 0;
for (const file of htmlFiles) {
  const c = readFileSync(file, 'utf8');
  const next = c.replace(rePlaygroundLink, () => {
    removed++;
    return '';
  });
  if (next !== c) writeFileSync(file, next);
}
console.log(`已移除 ${removed} 处 playground 入口`);

console.log('桌面端前端产物就绪：', dist);
console.log('下一步：cd app-desktop && npx tauri build');
