---
order: 530
title: 移动端适配
module: 'css'
category: 前端技术
difficulty: intermediate
description: rem、vw、vh、clamp
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/032-MediaQuery'
  - 'css/033-ContainerQuery'
  - 'css/054-Function'
  - 'css/036-CSSVariableCustomAttribute'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---


## 1. 适配单位

| 单位   | 参照物         | 特点     |
| ------ | -------------- | -------- |
| `rem`  | 根元素字体大小 | 全局缩放 |
| `em`   | 父元素字体大小 | 局部缩放 |
| `vw`   | 视口宽度 1%    | 响应视口 |
| `vh`   | 视口高度 1%    | 响应视口 |
| `vmin` | 视口较小边 1%  | 适配短边 |

## 2. rem 适配

```css
html {
  font-size: 62.5%;
} /* 1rem = 10px */
body {
  font-size: 1.6rem;
} /* 16px */
```

## 3. vw 适配

```css
/* 设计稿 375px，元素 100px → 100/375*100 = 26.67vw */
.element {
  width: 26.67vw;
}
```

## 4. clamp() 函数

```css
h1 {
  font-size: clamp(1.5rem, 5vw, 3rem);
}
.container {
  width: clamp(300px, 80vw, 1200px);
}
```

$$
\text{font-size} = \text{clamp}(\text{min}, \text{preferred}, \text{max})
$$

## 5. 安全区域与1px边框

```css
.header {
  padding-top: env(safe-area-inset-top);
}
.border-1px::after {
  content: '';
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: #ccc;
  transform: scaleY(0.5);
}
```

## 6. dvh 单位

```css
.full-screen {
  height: 100dvh;
} /* 动态视口高度，解决移动端 vh 问题 */
```

## 动手试试

1. 给页面加标准 viewport，用手机模拟对比加与不加的差异；
2. 用 `rem` 重写一个固定像素布局，验证字号随根字号缩放；
3. 在 375px 与 768px 两个断点下检查布局；
4. 进阶挑战：用 `clamp()` 做平滑响应式字号。

## 核心知识点

> 一句话记住移动适配：viewport 是开关，rem/百分比是弹性单位，断点跟内容走，图片用响应式方案。

- 标准 viewport：`width=device-width, initial-scale=1.0`；
- 弹性单位：`rem`/`%`/`vw`/`vh` 优于固定 `px`；
- 移动优先 + `min-width` 媒体查询；
- 图片适配：`max-width: 100%`、`srcset`、`object-fit`；
- 触屏优化：点击目标 ≥ 44px、`touch-action`。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 缺少 viewport | 桌面宽度渲染 | 每页加标准 viewport |
| 固定 px 布局 | 小屏溢出 | 弹性单位 + 断点 |
| 图片撑破容器 | 横向滚动 | `max-width: 100%` |
| 忽略安全区域 | 刘海屏遮挡 | safe-area-inset |
| 点击目标太小 | 误触 | 增大热区 |

## 扩展学习

- 视口：`html5/035-ViewportConfigMobileFirst`；
- 媒体查询：`css/031-MediaQuery`；
- 响应式：`css/033-ResponsiveDesign`。
