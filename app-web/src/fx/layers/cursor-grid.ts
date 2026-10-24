/**
 * cursor-grid — 随指针点亮的交互网格层（WebGL2）。
 *
 * 技术致谢：单元格状态纹理 + 单 pass 着色器的架构来自 react-bits 的
 * CursorGrid（MIT + Commons Clause，经 typelex 间接引用），此处为 FANDEX
 * 重写的无框架版本：CPU 侧维护 hold-then-fade 包络，R8 纹理上传单元格
 * 能量，片元着色器一次画出网格线、点亮格与指针聚光。
 *
 * 宿主约定：固定定位、pointer-events:none 的装饰层；指针事件挂在 window
 * 上换算进宿主坐标系，正文交互不受影响。
 *
 * 选项（宿主 data 属性，camelCase）：
 *   data-cursor-grid-cell-size / -radius / -style(lines|dots|crosses|dashed)
 *   data-cursor-grid-grid-opacity / -fill-opacity / -max-opacity / -spotlight
 *   data-cursor-grid-ambient / -hold-time / -fade-duration / -edge-fade
 */

import { prefersReducedMotion } from '../capabilities';
import { createRenderLoop, onThemeChange, readSceneColor, parseCssColor } from '../scene';

import type { FxDispose } from '../registry';

const INTRO_SECONDS = 1.4;

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform vec2 uOffset;
uniform float uCellSize;
uniform sampler2D uState;
uniform ivec2 uCells;
uniform vec3 uColor;
uniform float uLineWidth;
uniform float uMaxOpacity;
uniform float uFillOpacity;
uniform float uGridOpacity;
uniform int uGridStyle;
uniform vec2 uMouse;
uniform float uRadius;
uniform float uSpotlight;
uniform float uPresence;
uniform float uEdgeFade;
uniform float uReveal;

out vec4 fragColor;

float level(vec2 cell) {
  if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= float(uCells.x) || cell.y >= float(uCells.y)) return 0.0;
  float v = texelFetch(uState, ivec2(cell), 0).r;
  return v * v * (3.0 - 2.0 * v);
}

float line(float d, float width) {
  float w = max(width, 1.0);
  return clamp(w * 0.5 + 0.5 - d, 0.0, 1.0) * (width / w);
}

void main() {
  vec2 pos = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 g = (pos - uOffset) / uCellSize;
  vec2 cell = floor(g);
  vec2 f = g - cell;
  vec2 edge = min(f, 1.0 - f) * uCellSize;

  float vx = line(edge.x, uLineWidth);
  float vy = line(edge.y, uLineWidth);
  if (uGridStyle == 1) {
    float dash = uCellSize / 6.0;
    vx *= step(0.5, fract((pos.y - uOffset.y) / dash + 0.25));
    vy *= step(0.5, fract((pos.x - uOffset.x) / dash + 0.25));
  } else if (uGridStyle == 2) {
    float r = max(uLineWidth * 1.25, 1.2);
    float d = length(edge);
    vx = clamp(r + 0.5 - d, 0.0, 1.0);
    vy = 0.0;
  } else if (uGridStyle == 3) {
    float arm = uCellSize * 0.1 + uLineWidth;
    vx *= step(edge.y, arm);
    vy *= step(edge.x, arm);
  }
  float mark = max(vx, vy);

  vec2 toMouse = pos - uMouse;
  float spot = exp(-dot(toMouse, toMouse) / max(uRadius * uRadius, 1.0) * 1.6) * uSpotlight * uPresence;

  vec2 center = uResolution * 0.5;
  float reach = length(center);
  float shown = smoothstep(
    uReveal * (reach + uCellSize * 2.0),
    uReveal * (reach + uCellSize * 2.0) - uCellSize * 2.0,
    length(pos - center)
  );
  shown = uReveal >= 1.0 ? 1.0 : shown;

  float fade = 1.0;
  if (uEdgeFade > 0.0) {
    vec2 norm = pos / uResolution;
    vec2 a = clamp(norm / uEdgeFade, 0.0, 1.0);
    vec2 b = clamp((1.0 - norm) / uEdgeFade, 0.0, 1.0);
    vec2 sa = a * a * a * (a * (a * 6.0 - 15.0) + 10.0);
    vec2 sb = b * b * b * (b * (b * 6.0 - 15.0) + 10.0);
    fade = sa.x * sa.y * sb.x * sb.y;
  }

  float own = level(cell);
  float gridAlpha = mark * min(uGridOpacity + spot * 0.45, 1.0) * fade * shown;
  float litAlpha = own > 0.0 ? mark * own * uMaxOpacity : 0.0;
  float fillAlpha = own * uFillOpacity;
  litAlpha *= fade;
  fillAlpha *= fade;

  float cellAlpha = clamp(max(litAlpha, fillAlpha), 0.0, 1.0);
  float alpha = cellAlpha + gridAlpha * (1.0 - cellAlpha);
  vec3 premul = uColor * cellAlpha + uColor * gridAlpha * (1.0 - cellAlpha);
  fragColor = vec4(premul, alpha);
}`;

const STYLES: Record<string, number> = { lines: 0, dashed: 1, dots: 2, crosses: 3 };

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function link(gl: WebGL2RenderingContext): {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
} | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i += 1) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface GridOptions {
  cellSize: number;
  radius: number;
  gridStyle: number;
  gridOpacity: number;
  fillOpacity: number;
  maxOpacity: number;
  spotlight: number;
  ambient: number;
  holdTime: number;
  fadeDuration: number;
  edgeFade: number;
}

function readOptions(host: HTMLElement): GridOptions {
  const num = (key: string, fallback: number): number => {
    const raw = host.dataset[key];
    const value = raw === undefined ? NaN : Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    cellSize: num('cursorGridCellSize', 64),
    radius: num('cursorGridRadius', 170),
    gridStyle: STYLES[host.dataset.cursorGridStyle ?? 'lines'] ?? 0,
    gridOpacity: num('cursorGridGridOpacity', 0.06),
    fillOpacity: num('cursorGridFillOpacity', 0.08),
    maxOpacity: num('cursorGridMaxOpacity', 0.5),
    spotlight: num('cursorGridSpotlight', 0.4),
    ambient: num('cursorGridAmbient', 0.12),
    holdTime: num('cursorGridHoldTime', 260),
    fadeDuration: num('cursorGridFadeDuration', 1100),
    edgeFade: num('cursorGridEdgeFade', 0.24),
  };
}

export function mountCursorGrid(host: HTMLElement): FxDispose {
  if (prefersReducedMotion()) return () => {};
  const options = readOptions(host);

  /* 画布随每次挂载重建：StrictMode 之外的保守策略——复用已 lose context
     的画布会得到一块不透明白板，重建成本可以忽略。 */
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-ambient__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  const shader = gl ? link(gl) : null;
  if (!gl || !shader) {
    if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
    return () => {};
  }
  host.appendChild(canvas);
  const u = shader.uniforms;

  const stateTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, stateTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  const reduced = prefersReducedMotion();
  const view = { width: 1, height: 1, ratio: 1 };
  const grid = { cols: 0, rows: 0, offX: 0, offY: 0 };
  const pointer = { x: 0, y: 0, inside: false };
  const mouse = { x: 0, y: 0 };
  const pulses: { x: number; y: number; t0: number }[] = [];
  let levels = new Float32Array(0);
  let waves = new Float32Array(0);
  let targets = new Float32Array(0);
  let touched = new Float32Array(0);
  let pixels = new Uint8Array(0);
  let presence = 0;
  let clock = 0;
  let introClock = reduced ? 1 : 0;
  let dirty = true;
  let disposed = false;

  let currentInk: [number, number, number] = [0.24, 0.77, 0.73];
  const readInk = () => {
    currentInk = readSceneColor('--fx-ambient-ink', [0.24, 0.77, 0.73]);
  };
  readInk();

  const rebuild = () => {
    view.width = Math.max(1, host.clientWidth);
    view.height = Math.max(1, host.clientHeight);
    view.ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(view.width * view.ratio));
    canvas.height = Math.max(1, Math.round(view.height * view.ratio));
    const cols = Math.ceil(view.width / options.cellSize) + 1;
    const rows = Math.ceil(view.height / options.cellSize) + 1;
    if (cols !== grid.cols || rows !== grid.rows) {
      grid.cols = cols;
      grid.rows = rows;
      levels = new Float32Array(cols * rows);
      waves = new Float32Array(cols * rows);
      targets = new Float32Array(cols * rows);
      touched = new Float32Array(cols * rows).fill(-1e9);
      pixels = new Uint8Array(cols * rows);
      gl.bindTexture(gl.TEXTURE_2D, stateTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, cols, rows, 0, gl.RED, gl.UNSIGNED_BYTE, pixels);
    }
    grid.offX = (view.width - cols * options.cellSize) / 2;
    grid.offY = (view.height - rows * options.cellSize) / 2;
    dirty = true;
  };

  const light = (index: number, value: number) => {
    if (value > (targets[index] ?? 0)) targets[index] = value;
    touched[index] = clock;
  };

  const energize = (x: number, y: number) => {
    const size = options.cellSize;
    const radius = options.radius;
    const minCol = Math.max(0, Math.floor((x - radius - grid.offX) / size));
    const maxCol = Math.min(grid.cols - 1, Math.floor((x + radius - grid.offX) / size));
    const minRow = Math.max(0, Math.floor((y - radius - grid.offY) / size));
    const maxRow = Math.min(grid.rows - 1, Math.floor((y + radius - grid.offY) / size));
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const cx = grid.offX + col * size + size / 2;
        const cy = grid.offY + row * size + size / 2;
        const dist = Math.hypot(cx - x, cy - y);
        if (dist > radius) continue;
        const t = 1 - dist / radius;
        const value = t * t * (3 - 2 * t);
        if (value > 0) light(row * grid.cols + col, value);
      }
    }
  };

  const sweepPulses = () => {
    const size = options.cellSize;
    const ahead = size * 0.6;
    const behind = size * 1.4;
    const far = Math.hypot(view.width, view.height);
    waves.fill(0);
    for (let k = pulses.length - 1; k >= 0; k -= 1) {
      const pulse = pulses[k];
      if (!pulse) continue;
      const ringR = (clock - pulse.t0) * 620;
      if (ringR - behind * 2 > far) {
        pulses.splice(k, 1);
        continue;
      }
      if (ringR < 0) continue;
      const envelope = Math.max(0, 1 - ringR / (far + behind)) ** 0.6;
      const outer = ringR + ahead * 2;
      const minCol = Math.max(0, Math.floor((pulse.x - outer - grid.offX) / size));
      const maxCol = Math.min(grid.cols - 1, Math.floor((pulse.x + outer - grid.offX) / size));
      const minRow = Math.max(0, Math.floor((pulse.y - outer - grid.offY) / size));
      const maxRow = Math.min(grid.rows - 1, Math.floor((pulse.y + outer - grid.offY) / size));
      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          const cx = grid.offX + col * size + size / 2;
          const cy = grid.offY + row * size + size / 2;
          const off = Math.hypot(cx - pulse.x, cy - pulse.y) - ringR;
          if (off > ahead * 2 || off < -behind * 2) continue;
          const t = off > 0 ? off / ahead : off / behind;
          const value = envelope * Math.exp(-t * t);
          const index = row * grid.cols + col;
          if (value > (waves[index] ?? 0)) waves[index] = value;
        }
      }
    }
    dirty = true;
  };

  const draw = () => {
    const ratio = view.ratio;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(shader.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, stateTexture);
    if (dirty) {
      for (let i = 0; i < levels.length; i += 1) {
        pixels[i] = Math.round(clamp01(Math.max(levels[i] ?? 0, waves[i] ?? 0)) * 255);
      }
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, grid.cols, grid.rows, gl.RED, gl.UNSIGNED_BYTE, pixels);
      dirty = false;
    }
    const lineDevice = 1 * ratio;
    const snap = Math.round(lineDevice) % 2 === 1 ? 0.5 : 0;
    if (u.uState) gl.uniform1i(u.uState, 0);
    if (u.uResolution) gl.uniform2f(u.uResolution, canvas.width, canvas.height);
    if (u.uOffset) gl.uniform2f(u.uOffset, Math.round(grid.offX * ratio) + snap, Math.round(grid.offY * ratio) + snap);
    if (u.uCellSize) gl.uniform1f(u.uCellSize, options.cellSize * ratio);
    if (u.uCells) gl.uniform2i(u.uCells, grid.cols, grid.rows);
    if (u.uColor) gl.uniform3f(u.uColor, currentInk[0], currentInk[1], currentInk[2]);
    if (u.uLineWidth) gl.uniform1f(u.uLineWidth, lineDevice);
    if (u.uMaxOpacity) gl.uniform1f(u.uMaxOpacity, options.maxOpacity);
    if (u.uFillOpacity) gl.uniform1f(u.uFillOpacity, options.fillOpacity);
    if (u.uGridOpacity) gl.uniform1f(u.uGridOpacity, options.gridOpacity);
    if (u.uGridStyle) gl.uniform1i(u.uGridStyle, options.gridStyle);
    if (u.uMouse) gl.uniform2f(u.uMouse, mouse.x * ratio, mouse.y * ratio);
    if (u.uRadius) gl.uniform1f(u.uRadius, options.radius * ratio);
    if (u.uSpotlight) gl.uniform1f(u.uSpotlight, options.spotlight);
    if (u.uPresence) gl.uniform1f(u.uPresence, presence);
    if (u.uEdgeFade) gl.uniform1f(u.uEdgeFade, options.edgeFade);
    if (u.uReveal) gl.uniform1f(u.uReveal, introClock >= 1 ? 1 : 1 - (1 - introClock) ** 2.2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frameTick = (dt: number) => {
    clock += dt;
    if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS);

    const follow = 1 - Math.exp(-dt / 0.07);
    mouse.x += (pointer.x - mouse.x) * follow;
    mouse.y += (pointer.y - mouse.y) * follow;
    const presenceGoal = pointer.inside ? 1 : 0;
    presence += (presenceGoal - presence) * (1 - Math.exp(-dt / 0.25));

    if (options.ambient > 0 && levels.length) {
      const chance = options.ambient * dt * levels.length * 0.04;
      let spawns = Math.floor(chance) + (Math.random() < chance % 1 ? 1 : 0);
      while (spawns > 0) {
        spawns -= 1;
        light(Math.floor(Math.random() * levels.length), 0.22 + Math.random() * 0.4);
      }
    }
    if (pulses.length) sweepPulses();
    else if (waves.some((value) => value > 0)) {
      waves.fill(0);
      dirty = true;
    }

    const holdSeconds = options.holdTime / 1000;
    const fadeStep = dt / (options.fadeDuration / 1000);
    const attack = 1 - Math.exp(-dt / 0.045);
    for (let i = 0; i < levels.length; i += 1) {
      const before = levels[i] ?? 0;
      let target = targets[i] ?? 0;
      if (target <= 0 && before <= 0) continue;
      if (clock - (touched[i] ?? -1e9) > holdSeconds) target = Math.max(0, target - fadeStep);
      targets[i] = target;
      const next = target > before ? before + (target - before) * attack : target;
      levels[i] = next < 0.002 ? 0 : next;
      if ((levels[i] ?? 0) !== before) dirty = true;
    }
    draw();
  };

  const stopLoop = reduced ? () => {} : createRenderLoop(frameTick);

  const locate = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerMove = (event: PointerEvent) => {
    const { x, y } = locate(event);
    pointer.x = x;
    pointer.y = y;
    if (!pointer.inside) {
      pointer.inside = true;
      mouse.x = x;
      mouse.y = y;
    }
    energize(x, y);
  };

  const onPointerDown = (event: PointerEvent) => {
    const { x, y } = locate(event);
    pulses.push({ x, y, t0: clock });
  };

  const onPointerLeave = () => {
    pointer.inside = false;
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  const offTheme = onThemeChange(() => {
    readInk();
    dirty = true;
  });
  const resizeObserver = new ResizeObserver(() => {
    rebuild();
    draw();
  });
  resizeObserver.observe(host);

  rebuild();
  if (introClock < 1) pulses.push({ x: view.width / 2, y: view.height / 2, t0: 0.15 });
  draw();

  return () => {
    if (disposed) return;
    disposed = true;
    stopLoop();
    offTheme();
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    if (stateTexture) gl.deleteTexture(stateTexture);
    gl.deleteProgram(shader.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
  };
}

/** parseCssColor 复出口（供演示页等场景复用）。 */
export { parseCssColor };
