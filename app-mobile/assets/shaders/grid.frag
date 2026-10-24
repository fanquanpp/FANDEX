#version 460 core
#include <flutter/runtime_effect.glsl>

// GEOCON 蓝图网格背景 — 漂移细网格 + 220px 大网格 + 对角扫描线。
// 设计约束：仅线场，无光斑、无色散。

uniform float uTime;
uniform vec2 uSize;
uniform vec3 uTint;

out vec4 fragColor;

float gridLine(vec2 p, float spacing, float thickness) {
  vec2 f = fract(p / spacing);
  vec2 d = min(f, 1.0 - f) * spacing;
  float l = min(d.x, d.y);
  return 1.0 - smoothstep(thickness, thickness + 1.4, l);
}

void main() {
  vec2 p = FlutterFragCoord().xy;

  vec2 moved = p + vec2(uTime * 6.0, -uTime * 4.0);
  float fine = gridLine(moved, 44.0, 0.6);
  float major = gridLine(moved, 220.0, 1.0);

  float diag = (p.x + p.y) * 0.70710678;
  float span = (uSize.x + uSize.y) * 0.70710678 + 320.0;
  float sweepPos = mod(uTime * 110.0, span) - 160.0;
  float sweep = 1.0 - smoothstep(0.0, 150.0, abs(diag - sweepPos));
  sweep *= sweep * 0.6;

  float alpha = fine * 0.045 + major * 0.085 + sweep * 0.055;
  fragColor = vec4(uTint, alpha);
}
