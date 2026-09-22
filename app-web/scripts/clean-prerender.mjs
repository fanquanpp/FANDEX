import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const PRERENDER_DIR = join(DIST_DIR, '.prerender');

if (existsSync(PRERENDER_DIR)) {
  rmSync(PRERENDER_DIR, { recursive: true, force: true });
  console.log(`[clean-prerender] 已清理中间产物: ${PRERENDER_DIR}`);
} else {
  console.log('[clean-prerender] 无需清理（.prerender 不存在）');
}
