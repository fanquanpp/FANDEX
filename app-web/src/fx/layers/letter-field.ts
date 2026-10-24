/**
 * letter-field — 代码字符场（Canvas2D）。
 *
 * FANDEX 自有实现，非移植：以「声轨星云」母题把代码符号铺成一片
 * 低透明度的字符原野，单元格能量随时间随机点亮、缓慢衰减，指针
 * 靠近时注入能量，偶发整行闪烁模拟扫描轨迹。与 decor 系统的均衡条/
 * 音波同属一个视觉语系。
 *
 * 字符集刻意只用 ASCII 代码符号（AGENTS 约束：不使用 emoji 与易混淆
 * 的 Unicode 符号），与站点代码主题呼应。
 *
 * 选项（宿主 data 属性）：
 *   data-letter-field-cell-size / -density / -opacity / -font-size / -speed
 */

import { prefersReducedMotion } from '../capabilities';
import { createRenderLoop, onThemeChange, readSceneColor } from '../scene';

import type { FxDispose } from '../registry';

const CHARSET = '01<>{}[]/*+#$%=;:_~^'.split('');

const FALLBACK_INK: [number, number, number] = [0.22, 0.77, 0.73];

interface FieldOptions {
  cellSize: number;
  density: number;
  opacity: number;
  fontSize: number;
  speed: number;
}

function readOptions(host: HTMLElement): FieldOptions {
  const num = (key: string, fallback: number): number => {
    const raw = host.dataset[key];
    const value = raw === undefined ? NaN : Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    cellSize: num('letterFieldCellSize', 56),
    density: num('letterFieldDensity', 0.75),
    opacity: num('letterFieldOpacity', 0.5),
    fontSize: num('letterFieldFontSize', 13),
    speed: num('letterFieldSpeed', 1),
  };
}

export function mountLetterField(host: HTMLElement): FxDispose {
  if (prefersReducedMotion()) return () => {};
  const options = readOptions(host);

  const canvas = document.createElement('canvas');
  canvas.className = 'fx-ambient__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  host.appendChild(canvas);

  let ink: [number, number, number] = FALLBACK_INK;
  const readInk = () => {
    ink = readSceneColor('--fx-ambient-ink', FALLBACK_INK);
  };
  readInk();

  const grid = { cols: 0, rows: 0 };
  let glyphs: string[] = [];
  let jitter: number[] = [];
  let energy = new Float32Array(0);
  let ratio = 1;
  let width = 1;
  let height = 1;
  let disposed = false;

  const rebuild = () => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const cols = Math.ceil(width / options.cellSize);
    const rows = Math.ceil(height / options.cellSize);
    if (cols !== grid.cols || rows !== grid.rows) {
      grid.cols = cols;
      grid.rows = rows;
      const count = cols * rows;
      glyphs = new Array(count);
      jitter = new Array(count);
      energy = new Float32Array(count);
      for (let i = 0; i < count; i += 1) {
        glyphs[i] = CHARSET[Math.floor(Math.random() * CHARSET.length)] ?? '0';
        jitter[i] = Math.random();
      }
    }
  };

  const pointer = { x: -1e4, y: -1e4, active: false };
  const pointerRadius = options.cellSize * 3;

  /* 衰减、随机点亮与指针注入共用一步推进 */
  const step = (dt: number) => {
    const count = energy.length;
    if (!count) return;
    const decay = Math.exp(-dt / (1.6 / options.speed));
    const spawnRate = 5 * options.density * options.speed;
    let spawns = Math.floor(spawnRate * dt) + (Math.random() < (spawnRate * dt) % 1 ? 1 : 0);
    if (Math.random() < dt * 0.24) {
      /* 偶发整行扫描：一排字符同步亮起再一起熄灭 */
      const row = Math.floor(Math.random() * grid.rows);
      for (let col = 0; col < grid.cols; col += 1) {
        const index = row * grid.cols + col;
        energy[index] = Math.max(energy[index] ?? 0, 0.5 + Math.random() * 0.3);
      }
    }
    for (let i = 0; i < count; i += 1) {
      const next = (energy[i] ?? 0) * decay;
      energy[i] = next < 0.004 ? 0 : next;
    }
    while (spawns > 0) {
      spawns -= 1;
      const index = Math.floor(Math.random() * count);
      energy[index] = Math.max(energy[index] ?? 0, 0.35 + Math.random() * 0.5);
    }
    if (pointer.active) {
      const minCol = Math.max(0, Math.floor((pointer.x - pointerRadius) / options.cellSize));
      const maxCol = Math.min(grid.cols - 1, Math.floor((pointer.x + pointerRadius) / options.cellSize));
      const minRow = Math.max(0, Math.floor((pointer.y - pointerRadius) / options.cellSize));
      const maxRow = Math.min(grid.rows - 1, Math.floor((pointer.y + pointerRadius) / options.cellSize));
      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          const cx = col * options.cellSize + options.cellSize / 2;
          const cy = row * options.cellSize + options.cellSize / 2;
          const dist = Math.hypot(cx - pointer.x, cy - pointer.y);
          if (dist > pointerRadius) continue;
          const boost = (1 - dist / pointerRadius) ** 2 * dt * 6;
          const index = row * grid.cols + col;
          energy[index] = Math.min(1, (energy[index] ?? 0) + boost);
        }
      }
    }
  };

  const draw = () => {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const [r, g, b] = ink;
    ctx.font = `${options.fontSize}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let row = 0; row < grid.rows; row += 1) {
      for (let col = 0; col < grid.cols; col += 1) {
        const index = row * grid.cols + col;
        const e = energy[index] ?? 0;
        const base = 0.035;
        const alpha = (base + e * 0.85) * options.opacity;
        if (alpha <= 0.012) continue;
        ctx.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha.toFixed(3)})`;
        const x = col * options.cellSize + options.cellSize / 2;
        const y = row * options.cellSize + options.cellSize / 2 + ((jitter[index] ?? 0.5) - 0.5) * 6;
        ctx.fillText(glyphs[index] ?? '0', x, y);
      }
    }
  };

  let ambientClock = 0;
  const stopLoop = createRenderLoop((dt) => {
    if (disposed || !canvas.isConnected) return;
    ambientClock += dt;
    step(dt * (0.7 + Math.sin(ambientClock * 0.1) * 0.3));
    draw();
  });

  const onPointerMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  };
  const onPointerLeave = () => {
    pointer.active = false;
    pointer.x = -1e4;
    pointer.y = -1e4;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);

  const offTheme = onThemeChange(() => {
    readInk();
    draw();
  });
  const resizeObserver = new ResizeObserver(() => {
    rebuild();
    draw();
  });
  resizeObserver.observe(host);

  rebuild();
  /* 首帧预铺一层稀疏能量，避免全黑起步 */
  for (let i = 0; i < energy.length; i += 1) {
    if (Math.random() < 0.06 * options.density) energy[i] = 0.2 + Math.random() * 0.4;
  }
  draw();

  return () => {
    if (disposed) return;
    disposed = true;
    stopLoop();
    offTheme();
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    canvas.remove();
  };
}
