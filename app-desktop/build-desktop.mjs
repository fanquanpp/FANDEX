import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const dist = join(repoRoot, 'app-web', 'dist');

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

console.log('[2/2] 剔除前端实验室（playground）产物...');
const playgroundDir = join(dist, 'playground');
if (existsSync(playgroundDir)) rmSync(playgroundDir, { recursive: true });

console.log('桌面端前端产物就绪：', dist);
console.log('注意：此时 dist 为桌面变体（base=/），仅供 Tauri 打包，勿直接部署为 web 站点');
console.log('下一步：cd app-desktop && npx tauri build');
