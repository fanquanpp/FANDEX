/**
 * letter-glitch — 代码字符海（WebGL2）。
 *
 * 技术致谢：字形图集 + 单元格状态纹理 + 单 pass 着色器的架构来自
 * react-bits 的 LetterGlitch（MIT + Commons Clause），此处为 FANDEX
 * 重写的无框架版本。颜色不来自组件 props 而来自场景令牌：静息墨色读
 * --fx-ambient-ink，故障高亮读 --fx-ambient-accents（空格分隔多色，
 * 暗色为色彩裁定基线内的青系三色、亮色为深青墨同族两档），随
 * data-theme 自动切换，与全站律动装饰同一个视觉语系。
 *
 * 二进制字符故障场：以 0/1 母题铺满宿主的低透明度字符原野，随主题
 * 令牌切换青系（暗）或深青墨（亮），支持入场闪烁、光浪、指针注能与
 * 撕裂/爆裂点击。仅在 full 档 + WebGL2 可用 + 非自动化环境挂载。
 *
 * 宿主约定：固定定位、pointer-events:none 的装饰层；指针事件挂在
 * window 上换算进宿主坐标系，正文交互不受影响。
 *
 * 选项（宿主 data 属性，camelCase）：
 *   data-letter-glitch-characters / -font-size / -spacing / -density
 *   data-letter-glitch-base-opacity / -glitch-amount / -speed / -flow
 *   data-letter-glitch-cursor-radius / -click-effect(tear|burst|none)
 *   data-letter-glitch-edge-fade / -center-fade / -smooth / -interactive
 *   data-letter-glitch-intro / -dpr
 */

import { prefersReducedMotion } from '../capabilities';
import { onThemeChange, readSceneColor, readSceneColorList } from '../scene';

import type { FxDispose } from '../registry';

type ClickEffect = 'tear' | 'burst' | 'none';

type Rgb = [number, number, number];

interface GlitchOptions {
  characters: string;
  fontFamily: string;
  fontSize: number;
  spacing: number;
  density: number;
  baseOpacity: number;
  glitchAmount: number;
  speed: number;
  flow: number;
  smooth: boolean;
  interactive: boolean;
  cursorRadius: number;
  clickEffect: ClickEffect;
  edgeFade: number;
  centerFade: number;
  intro: boolean;
  dpr: number;
}

interface Walker {
  x: number;
  y: number;
  angle: number;
  life: number;
  span: number;
  speed: number;
  color: number;
  carry: number;
  after: number;
  wiggle: number;
  branch: number;
}

interface GlitchProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const FONT_STACK = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/* 默认二元字符集：数字花园的 0/1 母题，全部 ASCII（AGENTS 约束） */
const DEFAULT_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const MAX_COLORS = 8;
const INTRO_SECONDS = 1.4;
const REST_RATE = 0.2;
const GLITCH_RATE = 0.1;
const MAX_WALKERS = 48;

/* 令牌缺失时的兜底：静息墨色与青系高亮（与暗色令牌同值） */
const FALLBACK_INK: Rgb = [0.22, 0.77, 0.73];
const FALLBACK_ACCENTS: Rgb[] = [
  [0, 0.898, 1],
  FALLBACK_INK,
];

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/* 与 react-bits 原版的差异：去掉 uBackground（画布必须保持透明，
   保持透明让底色与暗角透出来）。 */
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uAtlas;
uniform sampler2D uState;
uniform ivec2 uCell;
uniform ivec2 uGrid;
uniform int uAtlasColumns;
uniform vec2 uResolution;
uniform vec2 uOrigin;
uniform vec3 uBase;
uniform float uBaseOpacity;
uniform vec3 uColors[8];
uniform float uEdge;
uniform float uCenter;
uniform vec2 uPointer;
uniform float uRadius;
uniform float uPresence;
uniform float uReveal;
uniform float uTime;
uniform float uFlow;
uniform float uFlowScale;
out vec4 outColor;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) - uOrigin;
  ivec2 q = ivec2(floor(frag));
  ivec2 cell = q / uCell;
  vec4 color = vec4(0.0);
  if (all(greaterThanEqual(q, ivec2(0))) && all(lessThan(cell, uGrid))) {
    vec4 state = texelFetch(uState, cell, 0);
    int glyph = int(state.r * 255.0 + 0.5);
    ivec2 texel = ivec2(glyph % uAtlasColumns, glyph / uAtlasColumns) * uCell + (q - cell * uCell);
    float coverage = texelFetch(uAtlas, texel, 0).a;
    if (coverage > 0.0) {
      vec2 center = vec2(cell * uCell) + vec2(uCell) * 0.5 + uOrigin;
      float mask = 1.0;
      if (uEdge > 0.0) {
        vec2 edge = min(center, uResolution - center) / uEdge;
        mask = smoother(edge.x) * smoother(edge.y);
      }
      if (uCenter > 0.0) {
        vec2 room = max(abs(center - uResolution * 0.5) - uResolution * vec2(0.3, 0.24), 0.0);
        float soft = min(uResolution.x, uResolution.y) * 0.24;
        mask *= 1.0 - uCenter * (1.0 - smoother(length(room) / soft));
      }
      float seed = hash(vec2(cell) + 17.0);
      float rest = state.g * uBaseOpacity * (0.8 + 0.2 * sin(uTime * (0.5 + 1.2 * seed) + seed * 40.0));
      if (uFlow > 0.0) {
        vec2 p = center / uFlowScale;
        float n = 0.65 * noise(p + vec2(uTime * 0.05, uTime * 0.03)) + 0.35 * noise(p * 2.03 - vec2(uTime * 0.04, -uTime * 0.06));
        rest *= mix(1.0, 0.1 + 1.7 * smoothstep(0.25, 0.8, n), uFlow);
      }
      if (uPresence > 0.0) {
        float d = length(center - uPointer) / uRadius;
        float f = clamp(1.0 - d * d, 0.0, 1.0);
        rest = mix(rest, max(rest, uReveal * step(0.004, state.g)), f * f * uPresence);
      }
      float heat = state.b;
      rest = min(rest, 1.0) * (1.0 - heat);
      vec3 tint = uColors[int(state.a * 255.0 + 0.5)];
      float weight = coverage * mask;
      color = vec4((uBase * rest + tint * heat) * weight, (rest + heat) * weight);
    }
  }
  outColor = color;
}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const smoother = (value: number) => {
  const x = clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

/* 注意 uniform 名要去掉数组后缀 [0]（uColors[8] 注册为 uColors[0]），
   否则故障高亮色板静默失效。 */
function link(gl: WebGL2RenderingContext): GlitchProgram | null {
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
    if (!info) continue;
    const name = info.name.replace(/\[0\]$/, '');
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
}

function readOptions(host: HTMLElement): GlitchOptions {
  const num = (key: string, fallback: number): number => {
    const raw = host.dataset[key];
    const value = raw === undefined ? NaN : Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  };
  const flag = (key: string, fallback: boolean): boolean => {
    const raw = host.dataset[key];
    if (raw === undefined) return fallback;
    return raw !== 'false';
  };
  const effect = host.dataset.letterGlitchClickEffect;
  return {
    characters: host.dataset.letterGlitchCharacters?.trim() || DEFAULT_CHARACTERS,
    fontFamily: FONT_STACK,
    fontSize: clamp(num('letterGlitchFontSize', 16), 6, 96),
    spacing: clamp(num('letterGlitchSpacing', 0.8), 0, 2),
    density: clamp(num('letterGlitchDensity', 0.55), 0, 1),
    baseOpacity: clamp(num('letterGlitchBaseOpacity', 0.16), 0, 1),
    glitchAmount: clamp(num('letterGlitchGlitchAmount', 0.5), 0, 1),
    speed: Math.max(0, num('letterGlitchSpeed', 1)),
    flow: clamp(num('letterGlitchFlow', 0.5), 0, 1),
    smooth: flag('letterGlitchSmooth', true),
    interactive: flag('letterGlitchInteractive', true),
    cursorRadius: Math.max(0, num('letterGlitchCursorRadius', 140)),
    clickEffect: effect === 'burst' || effect === 'none' ? effect : 'tear',
    edgeFade: clamp(num('letterGlitchEdgeFade', 0), 0, 0.5),
    centerFade: clamp(num('letterGlitchCenterFade', 0), 0, 1),
    intro: flag('letterGlitchIntro', true),
    dpr: Math.max(0, num('letterGlitchDpr', 0)),
  };
}

export function mountLetterGlitch(host: HTMLElement): FxDispose {
  if (prefersReducedMotion()) return () => {};
  const options = readOptions(host);

  /* 画布随每次挂载重建：复用已 lose context 的画布会得到一块
     不透明白板，重建成本可以忽略。 */
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
  const vao = gl.createVertexArray();

  const makeTexture = () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };
  const atlasTexture = makeTexture();
  const stateTexture = makeTexture();
  const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const atlas = document.createElement('canvas');
  const atlasContext = atlas.getContext('2d');
  if (!atlasContext || !vao || !atlasTexture || !stateTexture) {
    if (atlasTexture) gl.deleteTexture(atlasTexture);
    if (stateTexture) gl.deleteTexture(stateTexture);
    if (vao) gl.deleteVertexArray(vao);
    gl.deleteProgram(shader.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
    return () => {};
  }

  /* 主题色：静息墨色 + 故障高亮色板，随 data-theme 切换 */
  let baseInk: Rgb = FALLBACK_INK;
  let accents: Rgb[] = FALLBACK_ACCENTS;
  const readTheme = () => {
    baseInk = readSceneColor('--fx-ambient-ink', FALLBACK_INK);
    const list = readSceneColorList('--fx-ambient-accents', FALLBACK_INK);
    if (list.length) accents = list.slice(0, MAX_COLORS);
  };
  readTheme();

  const view = { width: 1, height: 1, ratio: 1 };
  const grid = { cols: 0, rows: 0, cellW: 0, cellH: 0, originX: 0, originY: 0, atlasColumns: 1 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false, presence: 0, stir: 0, fresh: true };
  const walkers: Walker[] = [];
  const palette = new Float32Array(MAX_COLORS * 3);
  const loadedFonts = new Set<string>();
  let pool: number[] = [0];
  let typeKey = '';
  let paletteKey = '';
  let colorCount = 1;
  let count = 0;
  let data = new Uint8Array(0);
  let heat = new Float32Array(0);
  let peak = new Float32Array(0);
  let hold = new Float32Array(0);
  let fade = new Float32Array(0);
  let wait = new Float32Array(0);
  let delay = new Float32Array(0);
  let luck = new Float32Array(0);
  let level = new Float32Array(0);
  let born = new Float32Array(0);
  let slot = new Int32Array(0);
  let active = new Int32Array(0);
  let activeCount = 0;
  let introLeft = options.intro;
  let clock = 0;
  let time = 0;
  let restCarry = 0;
  let glitchCarry = 0;
  let cursorCarry = 0;
  let dirty = true;
  let raf = 0;
  let last = 0;
  let visible = true;
  let alive = true;

  const randomGlyph = () => pool[(Math.random() * pool.length) | 0] ?? 0;
  const randomColor = () => (Math.random() * colorCount) | 0;

  const restValue = (i: number, appear = 1) =>
    (luck[i] ?? 0) < options.density ? Math.round((level[i] ?? 0) * 255 * appear) : 0;

  const cellAt = (x: number, y: number) => {
    const c = Math.floor((x - grid.originX) / grid.cellW);
    const r = Math.floor((y - grid.originY) / grid.cellH);
    if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return -1;
    return r * grid.cols + c;
  };

  const ignite = (i: number, strength: number, holdTime: number, fadeTime: number, color: number, after = 0) => {
    if ((slot[i] ?? -1) < 0) {
      slot[i] = activeCount;
      active[activeCount] = i;
      activeCount += 1;
      heat[i] = 0;
      hold[i] = holdTime;
      peak[i] = strength;
      fade[i] = fadeTime;
      wait[i] = 0;
      delay[i] = after;
      data[i * 4 + 3] = color;
      return;
    }
    if ((heat[i] ?? 0) < 0.15) data[i * 4 + 3] = color;
    peak[i] = (hold[i] ?? 0) > 0 ? Math.max(peak[i] ?? 0, strength) : strength;
    hold[i] = Math.max(hold[i] ?? 0, holdTime);
    fade[i] = Math.max(fade[i] ?? 0, fadeTime);
    delay[i] = Math.min(delay[i] ?? 0, after);
  };

  const release = (k: number) => {
    const i = active[k] ?? 0;
    const moved = active[activeCount - 1] ?? 0;
    activeCount -= 1;
    active[k] = moved;
    slot[moved] = k;
    slot[i] = -1;
    heat[i] = 0;
    data[i * 4 + 2] = 0;
  };

  const buildType = () => {
    const size = options.fontSize * view.ratio;
    const font = `${size}px ${options.fontFamily}`;
    const chars = Array.from(options.characters);
    const unique = Array.from(new Set(chars)).slice(0, 256);
    atlasContext.font = font;
    let advance = 1;
    unique.forEach((char) => {
      advance = Math.max(advance, atlasContext.measureText(char).width);
    });
    const metrics = atlasContext.measureText('M');
    const cellW = Math.max(2, Math.ceil(advance + size * options.spacing));
    const cellH = Math.max(2, Math.ceil(size * (0.95 + options.spacing)));
    const columns = Math.max(1, Math.min(unique.length, Math.floor(maxSize / cellW)));
    atlas.width = columns * cellW;
    atlas.height = Math.ceil(unique.length / columns) * cellH;
    atlasContext.font = font;
    atlasContext.textAlign = 'center';
    atlasContext.textBaseline = 'alphabetic';
    atlasContext.fillStyle = '#ffffff';
    const baseline = cellH / 2 + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    unique.forEach((char, i) => {
      atlasContext.fillText(char, (i % columns) * cellW + cellW / 2, Math.floor(i / columns) * cellH + baseline);
    });
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    const lookup = new Map(unique.map((char, i) => [char, i] as const));
    const nextPool = chars
      .map((char) => lookup.get(char))
      .filter((index): index is number => index !== undefined);
    const charsChanged = nextPool.length !== pool.length || nextPool.some((index, i) => index !== pool[i]);
    pool = nextPool.length ? nextPool : [0];
    const resized = cellW !== grid.cellW || cellH !== grid.cellH;
    grid.cellW = cellW;
    grid.cellH = cellH;
    grid.atlasColumns = columns;
    if (!loadedFonts.has(font) && document.fonts?.load) {
      loadedFonts.add(font);
      document.fonts
        .load(font, options.characters)
        .then(() => {
          if (!alive) return;
          typeKey = '';
          syncType();
          wake();
        })
        .catch(() => {});
    }
    return { resized, charsChanged };
  };

  const birthTime = (c: number, r: number, cols: number, rows: number) => {
    const dx = (c + 0.5) / cols - 0.5;
    const dy = (r + 0.5) / rows - 0.5;
    const radial = Math.min(1, Math.hypot(dx, dy * 0.8) * 1.6);
    return INTRO_SECONDS * (0.3 * radial + 0.7 * Math.random() ** 1.3);
  };

  const buildGrid = () => {
    const cols = Math.ceil(canvas.width / grid.cellW) + 1;
    const rows = Math.ceil(canvas.height / grid.cellH) + 1;
    grid.originX = Math.floor((canvas.width - cols * grid.cellW) / 2);
    grid.originY = Math.floor((canvas.height - rows * grid.cellH) / 2);
    if (cols === grid.cols && rows === grid.rows) return;
    const n = cols * rows;
    const nextData = new Uint8Array(n * 4);
    const nextLuck = new Float32Array(n);
    const nextLevel = new Float32Array(n);
    const nextBorn = new Float32Array(n);
    const shiftC = Math.floor((grid.cols - cols) / 2);
    const shiftR = Math.floor((grid.rows - rows) / 2);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const i = r * cols + c;
        const oc = c + shiftC;
        const or = r + shiftR;
        if (oc >= 0 && or >= 0 && oc < grid.cols && or < grid.rows) {
          const j = or * grid.cols + oc;
          nextData[i * 4] = data[j * 4] ?? 0;
          nextData[i * 4 + 1] = data[j * 4 + 1] ?? 0;
          nextLuck[i] = luck[j] ?? 0;
          nextLevel[i] = level[j] ?? 0;
          nextBorn[i] = born[j] ?? 0;
        } else {
          nextData[i * 4] = randomGlyph();
          nextLuck[i] = Math.random();
          nextLevel[i] = 0.55 + 0.45 * Math.random();
          nextBorn[i] = introLeft ? birthTime(c, r, cols, rows) : -1;
        }
      }
    }
    grid.cols = cols;
    grid.rows = rows;
    count = n;
    data = nextData;
    luck = nextLuck;
    level = nextLevel;
    born = nextBorn;
    heat = new Float32Array(n);
    peak = new Float32Array(n);
    hold = new Float32Array(n);
    fade = new Float32Array(n);
    wait = new Float32Array(n);
    delay = new Float32Array(n);
    slot = new Int32Array(n).fill(-1);
    active = new Int32Array(n);
    activeCount = 0;
    walkers.length = 0;
    for (let i = 0; i < n; i += 1) data[i * 4 + 1] = (born[i] ?? 0) >= 0 ? 0 : restValue(i);
    gl.bindTexture(gl.TEXTURE_2D, stateTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    dirty = false;
  };

  const syncType = () => {
    const key = `${options.fontSize * view.ratio}|${options.fontFamily}|${options.spacing}|${options.characters}`;
    if (key === typeKey) return;
    typeKey = key;
    const { resized, charsChanged } = buildType();
    if (resized || !grid.cols) buildGrid();
    if (charsChanged) {
      for (let i = 0; i < count; i += 1) data[i * 4] = randomGlyph();
      dirty = true;
    }
  };

  const syncPalette = () => {
    const key = accents.map((color) => color.join(',')).join('|');
    if (key === paletteKey) return;
    paletteKey = key;
    colorCount = Math.max(1, accents.length);
    for (let i = 0; i < MAX_COLORS; i += 1) {
      const rgb = accents[Math.min(i, colorCount - 1)] ?? FALLBACK_INK;
      palette[i * 3] = rgb[0];
      palette[i * 3 + 1] = rgb[1];
      palette[i * 3 + 2] = rgb[2];
    }
    for (let i = 0; i < count; i += 1) {
      if ((data[i * 4 + 3] ?? 0) >= colorCount) data[i * 4 + 3] = randomColor();
    }
    dirty = true;
  };

  const addWalker = (walker: Omit<Walker, 'carry' | 'after' | 'wiggle' | 'branch'> & Partial<Walker>) => {
    if (walkers.length < MAX_WALKERS) walkers.push({ carry: 0, after: 0, wiggle: 0, branch: 0, ...walker });
  };

  /* 点击撕裂：一行水平故障波从点击点向两侧撕开 */
  const spawnTear = (x: number, y: number) => {
    const center = cellAt(x, y);
    if (center < 0) return;
    const r0 = Math.floor(center / grid.cols);
    const width = grid.cols * grid.cellW;
    for (let dr = -2; dr <= 2; dr += 1) {
      const r = r0 + dr;
      if (r < 0 || r >= grid.rows) continue;
      const weight = 1 - Math.abs(dr) / 3;
      if (dr !== 0 && Math.random() > 0.3 + 0.6 * weight) continue;
      const color = randomColor();
      const rowY = grid.originY + (r + 0.5) * grid.cellH;
      const shift = (Math.random() - 0.5) * 6 * grid.cellW * (1 - weight);
      [0, Math.PI].forEach((angle) => {
        const life = width * (0.12 + 0.5 * weight * (0.4 + 0.6 * Math.random()));
        addWalker({
          x: x + shift,
          y: rowY,
          angle,
          life,
          span: life,
          speed: (2200 + Math.random() * 1200) * view.ratio,
          after: Math.abs(dr) * 0.035 + Math.random() * 0.03,
          color,
        });
      });
    }
  };

  /* 点击爆裂：故障射线向四周散射 */
  const spawnRays = (x: number, y: number) => {
    const reach = Math.min(view.width, view.height) * view.ratio;
    const rays = 5 + ((Math.random() * 3) | 0);
    const turn = Math.random() * Math.PI * 2;
    for (let k = 0; k < rays; k += 1) {
      const life = reach * (0.25 + Math.random() * 0.3);
      addWalker({
        x,
        y,
        angle: turn + (k / rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
        life,
        span: life,
        speed: (700 + Math.random() * 400) * view.ratio,
        wiggle: 0.2,
        branch: 0.03,
        color: randomColor(),
      });
    }
  };

  const spawnBurst = (x: number, y: number) => {
    const center = cellAt(x, y);
    if (center < 0) return;
    ignite(center, 1, 0.08, 0.8, randomColor());
    if (options.clickEffect === 'burst') spawnRays(x, y);
    else spawnTear(x, y);
  };

  const stepWalkers = (dt: number) => {
    for (let k = walkers.length - 1; k >= 0; k -= 1) {
      const w = walkers[k];
      if (!w) continue;
      if (w.after > 0) {
        w.after -= dt;
        continue;
      }
      const step = Math.max(
        1,
        Math.abs(Math.cos(w.angle)) * grid.cellW + Math.abs(Math.sin(w.angle)) * grid.cellH * 0.6,
      );
      w.carry += w.speed * dt;
      while (w.carry >= step && w.life > 0) {
        w.carry -= step;
        w.life -= step;
        w.angle += (Math.random() - 0.5) * w.wiggle;
        w.x += Math.cos(w.angle) * step;
        w.y += Math.sin(w.angle) * step;
        const i = cellAt(w.x, w.y);
        if (i < 0) {
          w.life = 0;
          break;
        }
        const left = w.life / w.span;
        ignite(i, 0.5 + 0.5 * left, 0.03 + Math.random() * 0.05, 0.5 + 0.5 * left, w.color);
        if (w.branch > 0 && Math.random() < w.branch) {
          const side = Math.random() < 0.5 ? -1 : 1;
          const life = w.life * (0.45 + Math.random() * 0.3);
          addWalker({
            x: w.x,
            y: w.y,
            angle: w.angle + side * (0.5 + Math.random() * 0.5),
            life,
            span: w.span,
            speed: w.speed,
            wiggle: w.wiggle,
            color: w.color,
          });
        }
      }
      if (w.life <= 0) walkers.splice(k, 1);
    }
  };

  /* 环境步进：静息字符随机重排 + 随机故障（行扫描 / 单点） */
  const ambient = (dt: number) => {
    if (options.speed <= 0 || !count) return;
    restCarry += count * REST_RATE * options.speed * dt;
    let changes = Math.min(count, restCarry | 0);
    restCarry -= changes;
    while (changes > 0) {
      changes -= 1;
      const i = (Math.random() * count) | 0;
      if ((slot[i] ?? -1) < 0) {
        data[i * 4] = randomGlyph();
        dirty = true;
      }
    }
    const tempo = Math.max(options.speed, 0.2);
    glitchCarry += count * options.glitchAmount ** 1.6 * GLITCH_RATE * options.speed * dt;
    let events = Math.min(count, glitchCarry | 0);
    glitchCarry -= events;
    while (events > 0) {
      events -= 1;
      const i = (Math.random() * count) | 0;
      const color = randomColor();
      const strength = 0.45 + 0.55 * Math.random();
      const holdTime = (0.04 + Math.random() * 0.26) / tempo;
      const fadeTime = (0.45 + Math.random() * 0.6) / tempo;
      const roll = Math.random();
      if (roll < 0.24) {
        const c = i % grid.cols;
        const long = roll < 0.015;
        const length = Math.min(
          grid.cols - c,
          long ? 10 + ((Math.random() * 24) | 0) : 2 + ((Math.random() * 7) | 0),
        );
        const pace = (long ? 0.012 : 0.028) / tempo;
        for (let k = 0; k < length; k += 1) ignite(i + k, strength, holdTime, fadeTime, color, k * pace);
      } else {
        ignite(i, strength, holdTime, fadeTime, color);
      }
    }
  };

  /* 指针注能：附近的字符点亮并快速重排，留下故障轨迹 */
  const excite = (dt: number) => {
    if (pointer.presence < 0.02 || !count) return;
    const radius = options.cursorRadius * view.ratio;
    if (radius < 1) return;
    const c0 = Math.max(0, Math.floor((pointer.sx - radius - grid.originX) / grid.cellW));
    const c1 = Math.min(grid.cols - 1, Math.floor((pointer.sx + radius - grid.originX) / grid.cellW));
    const r0 = Math.max(0, Math.floor((pointer.sy - radius - grid.originY) / grid.cellH));
    const r1 = Math.min(grid.rows - 1, Math.floor((pointer.sy + radius - grid.originY) / grid.cellH));
    const chance = pointer.presence * (3 + 9 * pointer.stir) * dt;
    for (let r = r0; r <= r1; r += 1) {
      const dy = (grid.originY + (r + 0.5) * grid.cellH - pointer.sy) / radius;
      for (let c = c0; c <= c1; c += 1) {
        const dx = (grid.originX + (c + 0.5) * grid.cellW - pointer.sx) / radius;
        const d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const i = r * grid.cols + c;
        if ((slot[i] ?? -1) < 0 && Math.random() < (1 - d) * (1 - d) * chance) {
          data[i * 4] = randomGlyph();
          dirty = true;
        }
      }
    }
    const cells = (Math.PI * radius * radius) / (grid.cellW * grid.cellH);
    cursorCarry += cells * pointer.presence * (0.15 + 4 * pointer.stir) * dt;
    let sparks = Math.min(512, cursorCarry | 0);
    cursorCarry -= sparks;
    while (sparks > 0) {
      sparks -= 1;
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random());
      const falloff = (1 - distance * distance) ** 2;
      if (Math.random() > falloff) continue;
      const i = cellAt(
        pointer.sx + Math.cos(angle) * distance * radius,
        pointer.sy + Math.sin(angle) * distance * radius,
      );
      if (i < 0) continue;
      ignite(
        i,
        (0.3 + 0.7 * Math.random()) * (0.45 + 0.55 * pointer.stir),
        0.02 + Math.random() * 0.08,
        0.35 + Math.random() * 0.4,
        randomColor(),
      );
    }
  };

  const settle = (dt: number) => {
    const tempo = Math.max(options.speed, 0.5);
    const attack = 1 - Math.exp(-dt / 0.05);
    for (let k = 0; k < activeCount; ) {
      const i = active[k] ?? 0;
      if ((delay[i] ?? 0) > 0) {
        delay[i] = (delay[i] ?? 0) - dt;
        k += 1;
        continue;
      }
      let h = heat[i] ?? 0;
      if ((hold[i] ?? 0) > 0) {
        hold[i] = (hold[i] ?? 0) - dt;
        h = options.smooth ? h + ((peak[i] ?? 0) - h) * attack : peak[i] ?? 0;
      } else {
        h = options.smooth ? h * Math.exp((-dt * 4) / Math.max(fade[i] ?? 0, 0.05)) : 0;
      }
      if (h < 0.012 && (hold[i] ?? 0) <= 0) {
        release(k);
        dirty = true;
        continue;
      }
      heat[i] = h;
      wait[i] = (wait[i] ?? 0) - dt;
      if ((wait[i] ?? 0) <= 0) {
        data[i * 4] = randomGlyph();
        wait[i] = ((0.045 + 0.45 * (1 - h) * (1 - h)) * (0.6 + 0.8 * Math.random())) / tempo;
      }
      data[i * 4 + 2] = Math.round(h * 255);
      dirty = true;
      k += 1;
    }
  };

  /* 入场：字符从中心向外按调度表闪烁现身 */
  const reveal = (dt: number) => {
    if (!introLeft) return;
    let pending = false;
    for (let i = 0; i < count; i += 1) {
      const t = born[i] ?? -1;
      if (t < 0) continue;
      const age = clock - t;
      if (age < 0) {
        pending = true;
        continue;
      }
      if (age < dt && Math.random() < ((luck[i] ?? 0) < options.density ? 0.45 : 0.12)) {
        ignite(i, 0.4 + 0.5 * Math.random(), 0.02, 0.35 + Math.random() * 0.35, randomColor());
      }
      const appear = options.smooth ? smoother(age / 0.35) : 1;
      data[i * 4 + 1] = restValue(i, appear);
      if (appear >= 1) born[i] = -1;
      else pending = true;
    }
    dirty = true;
    if (!pending) introLeft = false;
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
    last = now;
    clock += dt;
    time += dt * options.speed;

    const goal = options.interactive && pointer.inside ? 1 : 0;
    pointer.presence += (goal - pointer.presence) * (1 - Math.exp(-dt / 0.25));
    if (Math.abs(goal - pointer.presence) < 0.002) pointer.presence = goal;
    const px = pointer.sx;
    const py = pointer.sy;
    const follow = 1 - Math.exp(-dt / 0.07);
    pointer.sx += (pointer.x - pointer.sx) * follow;
    pointer.sy += (pointer.y - pointer.sy) * follow;
    const moved = Math.hypot(pointer.sx - px, pointer.sy - py) / view.ratio / dt;
    pointer.stir += (clamp(moved / 1400, 0, 1) - pointer.stir) * (1 - Math.exp(-dt / 0.12));
    if (pointer.stir < 0.001) pointer.stir = 0;

    reveal(dt);
    ambient(dt);
    excite(dt);
    stepWalkers(dt);
    settle(dt);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);
    gl.useProgram(shader.program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, stateTexture);
    if (dirty) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, grid.cols, grid.rows, gl.RGBA, gl.UNSIGNED_BYTE, data);
      dirty = false;
    }
    gl.uniform1i(u.uState ?? null, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.uniform1i(u.uAtlas ?? null, 0);
    gl.uniform2i(u.uCell ?? null, grid.cellW, grid.cellH);
    gl.uniform2i(u.uGrid ?? null, grid.cols, grid.rows);
    gl.uniform1i(u.uAtlasColumns ?? null, grid.atlasColumns);
    gl.uniform2f(u.uResolution ?? null, canvas.width, canvas.height);
    gl.uniform2f(u.uOrigin ?? null, grid.originX, grid.originY);
    gl.uniform3f(u.uBase ?? null, baseInk[0], baseInk[1], baseInk[2]);
    gl.uniform1f(u.uBaseOpacity ?? null, options.baseOpacity);
    gl.uniform3fv(u.uColors ?? null, palette);
    gl.uniform1f(u.uEdge ?? null, options.edgeFade * Math.min(canvas.width, canvas.height));
    gl.uniform1f(u.uCenter ?? null, options.centerFade);
    gl.uniform2f(u.uPointer ?? null, pointer.sx, pointer.sy);
    gl.uniform1f(u.uRadius ?? null, Math.max(1, options.cursorRadius * view.ratio));
    gl.uniform1f(u.uPresence ?? null, pointer.presence);
    gl.uniform1f(u.uReveal ?? null, Math.min(1, options.baseOpacity * 3.5));
    gl.uniform1f(u.uTime ?? null, time);
    gl.uniform1f(u.uFlow ?? null, options.flow);
    gl.uniform1f(u.uFlowScale ?? null, Math.max(canvas.width, canvas.height) * 0.32);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* 闲置停帧：speed 为 0 且无活跃故障、指针静止时不再申请 rAF */
    const busy =
      options.speed > 0 ||
      activeCount > 0 ||
      walkers.length > 0 ||
      introLeft ||
      (pointer.presence !== 0 && pointer.presence !== 1) ||
      pointer.stir > 0;
    if (busy) raf = requestAnimationFrame(frame);
    else last = 0;
  };

  function wake() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const resize = () => {
    view.width = Math.max(1, host.clientWidth);
    view.height = Math.max(1, host.clientHeight);
    view.ratio = Math.min(options.dpr > 0 ? options.dpr : window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(view.width * view.ratio));
    canvas.height = Math.max(1, Math.round(view.height * view.ratio));
    syncType();
    if (grid.cols) buildGrid();
    wake();
  };

  const locate = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointer.inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    pointer.x = x * view.ratio;
    pointer.y = y * view.ratio;
    if (pointer.fresh || pointer.presence < 0.02) {
      pointer.sx = pointer.x;
      pointer.sy = pointer.y;
      pointer.fresh = false;
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    locate(event);
    wake();
  };

  const onPointerDown = (event: PointerEvent) => {
    locate(event);
    if (!pointer.inside || options.clickEffect === 'none' || !count) return;
    spawnBurst(pointer.x, pointer.y);
    wake();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') pointer.inside = false;
  };

  const onPointerLeave = () => {
    pointer.inside = false;
    wake();
  };

  const onVisibility = () => {
    last = 0;
    wake();
  };

  const onFonts = () => {
    typeKey = '';
    syncType();
    wake();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) {
      last = 0;
      wake();
    }
  });
  intersection.observe(host);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', onVisibility);
  document.fonts?.addEventListener?.('loadingdone', onFonts);

  resize();
  syncPalette();
  const offTheme = onThemeChange(() => {
    readTheme();
    syncPalette();
    wake();
  });

  return () => {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    offTheme();
    resizeObserver.disconnect();
    intersection.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    document.fonts?.removeEventListener?.('loadingdone', onFonts);
    gl.deleteTexture(atlasTexture);
    gl.deleteTexture(stateTexture);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(shader.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
  };
}
