---
order: 350
title: CSS 现代色彩空间语法速查手册
module: 'css'
category: 前端技术
difficulty: beginner
description: CSS 现代色彩空间语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## oklch / oklab 感知均匀色彩

**基本写法：oklch 颜色**
`oklch(<L> <C> <H> [, <alpha>])`
```css
/* L 亮度 0%-100% / 0-1；C 色度 0+；H 色相 0-360 */
.brand {
  color: oklch(60% 0.15 250);          /* 蓝色调 */
  background: oklch(95% 0.02 250);     /* 浅背景 */
  border-color: oklch(50% 0.2 250 / 0.5); /* 带透明度 */
}
```

---

**基本写法：oklab 颜色**
`oklab(<L> <a> <b> [, <alpha>])`
```css
/* 直角坐标形式，a 红-绿轴，b 黄-蓝轴 */
.brand {
  color: oklab(60% 0.1 0.1);
  background: oklab(95% 0 0);   /* 接近中性灰 */
}
```

---

**基本写法：lab / lch 颜色**
`lab(<L> <a> <b> [, <alpha>])`
```css
/* CIE Lab/Lch 色彩空间 */
.brand {
  color: lab(60% 40 30);
  color: lch(60% 50 250);        /* Lch 极坐标形式 */
}
```

---

## 宽色域 color()

**基本写法：display-p3 广色域**
`color(<色彩空间> <R> <G> <B> [, <alpha>])`
```css
/* 超出 sRGB 的鲜艳颜色 */
.vivid {
  color: color(display-p3 1 0 0);          /* 鲜红，sRGB 无法表达 */
  background: color(display-p3 0 1 0);
  border-color: color(display-p3 0 0 1 / 0.5);
}

/* 其他色彩空间 */
.rec2020 { color: color(rec2020 0.8 0.2 0.1); }
.srgb-linear { color: color(srgb-linear 0.5 0.5 0.5); }
```

---

## color-mix() 颜色混合

**基本写法：基本混合**
`color-mix(in <色彩空间>, <颜色1> [<百分比>], <颜色2> [<百分比>])`
```css
/* 在 oklch 中混合红蓝各 50% */
.brand {
  color: color-mix(in oklch, red, blue);
  background: color-mix(in srgb, plum, #f00);
}
```

---

**基本写法：指定百分比**
`color-mix(in <空间>, <颜色> <p1>, <颜色> <p2>)`
```css
/* 60% 红 + 40% 蓝 */
.brand {
  color: color-mix(in oklab, red 60%, blue 40%);
  /* 比例之和可不为 100%，会自动归一化 */
  color: color-mix(in oklch, red 70%, blue 50%);  /* 归一化为 58.3%/41.7% */
}
```

---

**基本写法：极坐标色相插值**
`color-mix(in <极坐标空间> <hue 方法>, <颜色>, <颜色>)`
```css
/* hue 插值方法：shorter / longer / increasing / decreasing */
.brand {
  color: color-mix(in oklch shorter hue, blue, yellow);
  color: color-mix(in lch longer hue, orange, purple);
  color: color-mix(in hsl increasing hue, red, green);
}
```

---

**基本写法：混合生成派生色**
`color-mix(in <空间>, <基色>, <黑|白> <百分比>)`
```css
/* 从主色派生明暗变体 */
:root {
  --brand: oklch(60% 0.2 250);
  --brand-dark:  color-mix(in srgb, var(--brand), black 70%);
  --brand-light: color-mix(in srgb, var(--brand), white 70%);
  --brand-hover: color-mix(in oklch, var(--brand), white 15%);
}
```

---

## 相对颜色语法

**基本写法：从原色派生**
`oklch(from <原色> <L> <C> <H> [, <alpha>])`
```css
/* from 关键字基于已有颜色派生 */
:root {
  --brand: oklch(60% 0.2 250);
  --brand-soft: oklch(from var(--brand) calc(l + 0.1) c h);   /* 提亮 10% */
  --brand-deep: oklch(from var(--brand) calc(l - 0.2) c h);   /* 加深 */
  --brand-muted: oklch(from var(--brand) l calc(c * 0.5) h);  /* 降饱和 */
}
```

---

**基本写法：rgb 相对颜色**
`rgb(from <原色> <R> <G> <B> [, <A>])`
```css
/* 通道变量 r g b / alpha */
.btn {
  --base: #3366cc;
  background: rgb(from var(--base) r g b / 0.5);     /* 仅改透明度 */
  border-color: rgb(from var(--base) calc(r * 0.7) calc(g * 0.7) calc(b * 0.7));
}
```

---

## light-dark() 明暗模式

**基本写法：自动跟随配色**
`light-dark(<亮色>, <暗色>)`
```css
/* 依据 prefers-color-scheme 自动切换 */
:root { color-scheme: light dark; }
.text {
  color: light-dark(#333, #eee);                       /* 亮/暗自动切换 */
  background: light-dark(white, oklch(20% 0.01 250));
  border-color: light-dark(#ccc, #444);
}
```

---

## color-contrast() 对比色

**基本写法：选择最高对比色**
`color-contrast(<背景色> vs <候选1>, <候选2>, ...)`
```css
/* 浏览器自动选择与背景对比度达标的颜色 */
.badge {
  background: #f60;
  color: color-contrast(#f60 vs white, black);   /* 选 black */
}
```

---

## 注意事项速查

**基本写法：oklch 的感知均匀性**
`oklch(<L> <C> <H>)`
```css
/* 同样 L 值不同色相视觉亮度一致，适合生成色阶 */
:root {
  --c-50:  oklch(95% 0.02 250);
  --c-100: oklch(88% 0.06 250);
  --c-500: oklch(60% 0.18 250);
  --c-900: oklch(28% 0.10 250);
}
/* HSL 的 L 不具备此特性，视觉亮度会随色相波动 */
```

---

**基本写法：色彩空间互转**
`color-mix(in <目标空间>, <原色> 100%, <原色> 0%)`
```css
/* 技巧：用 color-mix 把颜色转换到目标色彩空间 */
.converted {
  color: color-mix(in oklch, var(--some-hex) 100%, transparent);
}
```

## 动手试试

1. 用 `oklch()` 定义一组颜色，观察与 hex 的差异；
2. 用 `color-mix()` 混合主色与白色生成浅色变体；
3. 用 `color()` 引用 display-p3 广色域；
4. 进阶挑战：为高 DCI-P3 屏幕提供增强色。

## 核心知识点

> 一句话记住现代颜色：`oklch`/`oklab` 感知均匀、`color-mix()` 混合颜色、`color()` 用广色域，深色主题靠变量切换。

- 传统：hex/rgb/hsl；
- `oklch`：感知均匀的现代色彩空间，渐变更平滑；
- `color-mix(in srgb, a, b 30%)`：颜色混合；
- `color(display-p3 ...)`：广色域；
- 渐变插值：`interpolation-method` 指定色彩空间；
- 变量 + 现代色 = 主题系统。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 兼容性 | 旧浏览器不支持 | 提供 hex 兜底 |
| 混合模式参数写错 | 结果异常 | 先写 in srgb |
| 广色域无兜底 | 颜色偏移 | 同时声明 sRGB 值 |

## 扩展学习

- 渐变：`css/024-Gradient`；
- 变量：`css/035-CSSVariableCustomAttribute`；
- 滤镜：`css/048-CSSFilters`。
