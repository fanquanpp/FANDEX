/**
 * scene-backdrop — 全站常驻的声纹线场背景（WebGL2 原生实现，零依赖）。
 *
 * FANDEX 母题的着色器化：六条缓慢起伏的声轨横线（示波器 / 声纳语言），
 * 单一墨色，无彩色混色、无辉光、无光斑——设计约束：不使用光斑与
 * 色散类装饰，背景一律走线与几何。
 *
 * 成本控制：
 *   - 全屏一个三角形、零纹理采样、六条高斯剖面细线，填充成本极低；
 *   - ~30fps 上限（慢速场不需要 60）；
 *   - document.hidden / 画布脱离文档时零渲染；
 *   - 自动化环境（Lighthouse / Playwright）直接不挂载，CSS 层兜底；
 *   - WebGL2 不可用时只剩 CSS 层（底色 + 技术网格 + 暗角）。
 *
 * 画布是模块级单例：页面切换时宿主整体替换，单例画布在新挂载点间搬迁，
 * 避免每次导航重建 WebGL 上下文。
 */

import { hasWebgl2, isAutomation, prefersReducedMotion } from '../capabilities';
import { createRenderLoop, onThemeChange, readSceneColor, readSceneNumber } from '../scene';

import type { FxDispose } from '../registry';

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uAlpha;
uniform float uVignetteFloor;
uniform vec3 uInk;
uniform vec3 uBaseColor;

out vec4 fragColor;

/* 单条声轨：中心 y 随 x 与时间缓慢起伏，高斯剖面勾勒细线 */
float waveLine(vec2 uv, float seed) {
  float y = seed
    + 0.055 * sin(uv.x * 2.4 + uTime * 0.28 + seed * 17.0)
    + 0.035 * sin(uv.x * 5.1 - uTime * 0.19 + seed * 31.0)
    + 0.020 * sin(uv.x * 9.7 + uTime * 0.11);
  float d = abs(uv.y - y);
  float sigma = 0.0014 + 0.0006 * (0.5 + 0.5 * sin(seed * 41.0 + uTime * 0.1));
  return exp(-(d * d) / (sigma * sigma));
}

void main() {
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;

  float a = 0.0;
  a += waveLine(uv, -0.36) * 0.85;
  a += waveLine(uv, -0.22) * 0.60;
  a += waveLine(uv, -0.06) * 0.45;
  a += waveLine(uv, 0.10) * 0.55;
  a += waveLine(uv, 0.26) * 0.70;
  a += waveLine(uv, 0.42) * 0.90;

  /* 线场向上下边缘渐隐，主体保留在中带 */
  a *= smoothstep(0.62, 0.30, abs(uv.y));
  a = min(a, 1.4) * uAlpha;

  vec3 colour = uBaseColor + uInk * a;

  /* 暗角：边缘后退（压暗而非发光），正文对比度优先 */
  float vignette = smoothstep(1.45, 0.25, length(uv * vec2(1.05, 1.35)));
  colour *= mix(uVignetteFloor, 1.0, vignette);

  fragColor = vec4(colour, 1.0);
}`;

const FALLBACK_BASE: [number, number, number] = [0.04, 0.06, 0.08];
const FALLBACK_INK: [number, number, number] = [0, 0.9, 1];

interface BackdropRuntime {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
  stopLoop: () => void;
  offTheme: () => void;
  resizeObserver: ResizeObserver;
  host: HTMLElement | null;
  alpha: number;
  lastRender: number;
  disposed: boolean;
}

let runtime: BackdropRuntime | null = null;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error('[fx] backdrop 着色器编译失败', gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function buildProgram(gl: WebGL2RenderingContext): {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
} | null {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[fx] backdrop 程序链接失败', gl.getProgramInfoLog(program));
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

function refreshColors(rt: BackdropRuntime): void {
  const gl = rt.gl;
  const u = rt.uniforms;
  gl.useProgram(rt.program);
  const setVec3 = (name: string, value: [number, number, number]) => {
    if (u[name]) gl.uniform3f(u[name], value[0], value[1], value[2]);
  };
  setVec3('uBaseColor', readSceneColor('--fx-scene-base', FALLBACK_BASE));
  setVec3('uInk', readSceneColor('--fx-scene-ink', FALLBACK_INK));
  /* 场景浓度：full（舞台页）与 calm（阅读页）由宿主 data-fx-scene 分档，
     具体数值随主题走 --fx-scene-amount 令牌 */
  const fallback = rt.host?.dataset.fxScene === 'calm' ? 0.3 : 0.55;
  rt.alpha = readSceneNumber('--fx-scene-amount', fallback);
  const uAlpha = u.uAlpha;
  if (uAlpha) gl.uniform1f(uAlpha, rt.alpha);
  /* 暗色压边缘聚中心，亮色保持整体清透 */
  const dark = document.documentElement.dataset.theme === 'dark';
  const uVignetteFloor = u.uVignetteFloor;
  if (uVignetteFloor) gl.uniform1f(uVignetteFloor, dark ? 0.42 : 0.86);
}

function drawFrame(rt: BackdropRuntime, now: number, force = false): void {
  if (rt.disposed) return;
  /* 画布在 swap 间隙会短暂脱离文档，此时跳过绘制 */
  if (!rt.canvas.isConnected) return;
  if (!force) {
    const interval = 1000 / 32;
    if (now - rt.lastRender < interval) return;
    rt.lastRender = now;
  }
  const u = rt.uniforms;
  rt.gl.useProgram(rt.program);
  if (u.uTime) rt.gl.uniform1f(u.uTime, now * 0.001);
  rt.gl.viewport(0, 0, rt.canvas.width, rt.canvas.height);
  rt.gl.drawArrays(rt.gl.TRIANGLES, 0, 3);
}

function resize(rt: BackdropRuntime): void {
  const host = rt.host;
  if (!host) return;
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5) * 0.75;
  rt.canvas.width = Math.max(1, Math.round(width * ratio));
  rt.canvas.height = Math.max(1, Math.round(height * ratio));
  rt.gl.useProgram(rt.program);
  const uResolution = rt.uniforms.uResolution;
  if (uResolution) rt.gl.uniform2f(uResolution, rt.canvas.width, rt.canvas.height);
  drawFrame(rt, performance.now(), true);
}

/**
 * 把单例背景画布挂到宿主（.fx-backdrop）。返回清理函数：停止循环、
 * 断开观察器、把画布从宿主摘下（单例本身保留，等待下一个宿主）。
 */
export function ensureBackdrop(host: HTMLElement): FxDispose {
  if (isAutomation() || !hasWebgl2()) return () => {};

  if (!runtime) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-backdrop__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    const built = gl ? buildProgram(gl) : null;
    if (!gl || !built) return () => {};
    runtime = {
      canvas,
      gl,
      program: built.program,
      uniforms: built.uniforms,
      stopLoop: () => {},
      offTheme: () => {},
      resizeObserver: new ResizeObserver(() => {
        if (runtime) resize(runtime);
      }),
      host: null,
      alpha: 0.5,
      lastRender: 0,
      disposed: false,
    };
  }

  const rt = runtime;
  rt.disposed = false;
  rt.host = host;
  host.appendChild(rt.canvas);
  refreshColors(rt);

  rt.offTheme = onThemeChange(() => {
    refreshColors(rt);
    drawFrame(rt, performance.now(), true);
  });
  rt.resizeObserver.observe(host);

  if (prefersReducedMotion()) {
    /* 减少动效：只渲染一帧静态线场 */
    resize(rt);
  } else {
    resize(rt);
    rt.stopLoop = createRenderLoop((_, now) => drawFrame(rt, now));
  }

  return () => {
    rt.disposed = true;
    rt.stopLoop();
    rt.stopLoop = () => {};
    rt.offTheme();
    rt.offTheme = () => {};
    rt.resizeObserver.disconnect();
    if (rt.canvas.parentNode) rt.canvas.parentNode.removeChild(rt.canvas);
    rt.host = null;
  };
}
