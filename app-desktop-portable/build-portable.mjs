import { execSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync,
  statSync, writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const tauriDir = join(repoRoot, 'app-desktop', 'src-tauri');
const releaseDir = join(tauriDir, 'target', 'release');
const distDir = join(__dirname, 'dist');
const stagingDir = join(distDir, 'FANDEX-Portable');

const tauriConf = JSON.parse(readFileSync(join(tauriDir, 'tauri.conf.json'), 'utf-8'));
const version = tauriConf.version || '0.0.0';
const productName = tauriConf.productName || 'FANDEX';

console.log('[1/3] 构建 Tauri 裸 exe（--no-bundle，跳过 NSIS 安装包）...');
execSync('pnpm --filter @fandex/desktop exec tauri build --no-bundle', {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, DESKTOP_BUILD: '1' },
});

const cargoName = (
  readFileSync(join(tauriDir, 'Cargo.toml'), 'utf-8').match(/^\s*name\s*=\s*"([^"]+)"/m) || []
)[1];
const candidates = [productName, cargoName]
  .filter((name, index, list) => name && list.indexOf(name) === index)
  .map((name) => join(releaseDir, `${name}.exe`));
let exePath = candidates.find(existsSync);
if (!exePath) {
  const fallback = readdirSync(releaseDir).find((name) => name.toLowerCase().endsWith('.exe'));
  if (fallback) exePath = join(releaseDir, fallback);
}
if (!exePath) {
  console.error(`未找到构建产物 exe（候选：${candidates.map((p) => p.split('\\').pop()).join('、')}），便携版打包终止`);
  process.exit(1);
}
console.log(`定位到便携版主程序：${exePath}`);

console.log('[2/3] 收集运行文件...');
rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });
copyFileSync(exePath, join(stagingDir, 'FANDEX.exe'));
for (const name of readdirSync(releaseDir)) {
  if (name.toLowerCase().endsWith('.dll')) {
    copyFileSync(join(releaseDir, name), join(stagingDir, name));
  }
}
writeFileSync(
  join(stagingDir, 'README-便携版.txt'),
  [
    'FANDEX Windows 桌面端便携版',
    '',
    '使用方式：解压到任意目录后直接运行 FANDEX.exe，无需安装。',
    '- 不写注册表、无卸载项，删除整个文件夹即完成卸载；',
    '- 可放置于 U 盘等移动介质随身携带；',
    '- 需要系统内置 Microsoft Edge WebView2 运行时（Windows 10/11 默认自带）；',
    '- 首次启动后会在本地生成少量配置数据用于记忆窗口状态。',
    '',
    '如需传统安装版，请使用 FANDEX-Setup-<版本>.exe。',
  ].join('\r\n'),
  'utf-8'
);

console.log('[3/3] 打包 zip...');
const zipName = `FANDEX-Portable-v${version}.zip`;
const zipPath = join(distDir, zipName);
if (existsSync(zipPath)) rmSync(zipPath, { force: true });
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
  { stdio: 'inherit' }
);
rmSync(stagingDir, { recursive: true, force: true });

const size = (statSync(zipPath).size / (1024 * 1024)).toFixed(1);
console.log(`便携版打包完成：${zipPath}（${size} MB）`);
