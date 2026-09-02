/**
 * FANDEX Windows 桌面端便携版构建编排
 * -----------------------------------------------------------------------------
 * 便携版定位：免安装、解压即用、不写注册表、可放 U 盘随身携带。
 * 产物：FANDEX-Portable-<版本>.zip（内含 FANDEX.exe 与运行所需 DLL）
 *
 * 流程：
 *   1. 复用 app-desktop 的 Tauri 配置执行 `tauri build --no-bundle`：
 *      - beforeBuildCommand 自动完成 app-web 静态构建与 playground 剔除
 *      - --no-bundle 跳过 NSIS 安装包打包，仅产出裸 exe
 *   2. 收集 target/release 下的 FANDEX.exe 与同目录运行所需 DLL
 *   3. 通过 PowerShell Compress-Archive 打包为 zip（Windows 原生，无额外依赖）
 *
 * 与安装版（app-desktop，NSIS）的差异：
 *   - 不写注册表、无开始菜单/卸载项；删除文件夹即完成卸载
 *   - 首次运行不触发 WebView2 安装引导（需系统自带 WebView2，Win10/11 默认内置）
 *
 * 用法（仓库根执行）：
 *   pnpm --filter @fandex/desktop-portable build
 */
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

/** 从 app-desktop 的 tauri.conf.json 读取版本号，用于产物命名 */
const tauriConf = JSON.parse(readFileSync(join(tauriDir, 'tauri.conf.json'), 'utf-8'));
const version = tauriConf.version || '0.0.0';
const productName = tauriConf.productName || 'FANDEX';

// 1. 构建 Tauri 裸 exe（--no-bundle 跳过 NSIS，web 构建由 beforeBuildCommand 完成）
console.log('[1/3] 构建 Tauri 裸 exe（--no-bundle，跳过 NSIS 安装包）...');
execSync('pnpm --filter @fandex/desktop exec tauri build --no-bundle', {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, DESKTOP_BUILD: '1' },
});

/**
 * 定位 Tauri 裸 exe 产物
 * -----------------------------------------------------------------------------
 * Tauri 2 的裸 exe 以 Cargo 包名产出（本仓库为 fandex-desktop.exe），
 * productName（FANDEX）只作用于 NSIS 安装包命名，因此不能假设 FANDEX.exe 存在。
 * 候选顺序：productName → Cargo 包名 → release 根目录首个 .exe 兜底。
 */
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

// 2. 收集 exe 与运行所需 DLL
console.log('[2/3] 收集运行文件...');
rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });
/* zip 内统一命名为 FANDEX.exe，与便携版说明保持一致 */
copyFileSync(exePath, join(stagingDir, 'FANDEX.exe'));
/* WebView2Loader.dll 等运行时依赖与 exe 同目录产出，一并收集 */
for (const name of readdirSync(releaseDir)) {
  if (name.toLowerCase().endsWith('.dll')) {
    copyFileSync(join(releaseDir, name), join(stagingDir, name));
  }
}
/* 附带便携版说明文件 */
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

// 3. PowerShell 原生压缩打包
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
