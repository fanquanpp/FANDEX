---
order: 60
tags:
  - css
  - 'css-animation'
difficulty: intermediate
title: 'CSS 动画与过渡'
module: css
category: 'CSS Basics'
description: 'CSS transition过渡、animation动画、关键帧、变换transform与性能优化详解。'
author: fanquanpp
updated: '2026-06-13'
related:
  - css/背景增强
  - css/Grid网格布局
  - css/边框圆角
  - css/媒体查询
prerequisites:
  - css/概述与基本语法
---

## 1. CSS 过渡（Transition）

### 1.1 过渡基础

CSS过渡允许属性值变化时平滑地从一个状态过渡到另一个状态。

```css
/* 过渡的四个属性 */
.element {
  /* 指定参与过渡的属性 */
  transition-property: background-color, transform;
  /* 过渡持续时间 */
  transition-duration: 0.3s;
  /* 过渡时序函数（缓动曲线） */
  transition-timing-function: ease-in-out;
  /* 过渡延迟时间 */
  transition-delay: 0.1s;

  /* 简写形式 */
  transition:
    background-color 0.3s ease-in-out 0.1s,
    transform 0.3s ease-in-out 0.1s;

  /* 所有属性过渡 */
  transition: all 0.3s ease;
}

.element:hover {
  background-color: #3498db;
  transform: scale(1.05);
}
```

### 1.2 时序函数详解

```css
/* 预定义时序函数 */
.box1 {
  transition-timing-function: ease;
} /* 默认：慢-快-慢 */
.box2 {
  transition-timing-function: linear;
} /* 匀速 */
.box3 {
  transition-timing-function: ease-in;
} /* 慢-快 */
.box4 {
  transition-timing-function: ease-out;
} /* 快-慢 */
.box5 {
  transition-timing-function: ease-in-out;
} /* 慢-快-慢 */

/* 贝塞尔曲线 */
.box6 {
  transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
} /* 弹性效果 */

/* 步进函数 */
.box7 {
  transition-timing-function: steps(4, end);
} /* 4步跳跃 */
.box8 {
  transition-timing-function: steps(10, start);
} /* 10步，立即跳到下一步 */
```

### 1.3 可过渡的属性

并非所有CSS属性都支持过渡，只有具有**中间值**的属性才能过渡。

```css
/* 支持过渡的常见属性 */
.supported {
  /* 颜色 */
  transition:
    color 0.3s,
    background-color 0.3s,
    border-color 0.3s;
  /* 尺寸 */
  transition:
    width 0.3s,
    height 0.3s,
    margin 0.3s,
    padding 0.3s;
  /* 变换 */
  transition:
    transform 0.3s,
    opacity 0.3s;
  /* 阴影 */
  transition:
    box-shadow 0.3s,
    text-shadow 0.3s;
}

/* 不支持过渡的属性 */
.not-supported {
  /* display: none → block 无法过渡 */
  /* 建议用 opacity + visibility 替代 */
  transition:
    opacity 0.3s,
    visibility 0.3s;
}
```

### 1.4 实用过渡效果

```css
/* 按钮悬停效果 */
.btn {
  padding: 12px 24px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.btn:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(52, 152, 219, 0.4);
}

/* 卡片悬浮效果 */
.card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

/* 淡入淡出 */
.fade-element {
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease;
}

.fade-element.visible {
  opacity: 1;
  visibility: visible;
}
```

## 2. CSS 动画（Animation）

### 2.1 关键帧动画

```css
/* 定义关键帧 */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 多关键帧动画 */
@keyframes bounce {
  0% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-20px);
  }
  50% {
    transform: translateY(0);
  }
  75% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0);
  }
}

/* 应用动画 */
.slide-in {
  animation: slideIn 0.5s ease-out forwards;
}

.bounce {
  animation: bounce 1s ease infinite;
}
```

### 2.2 animation 属性详解

```css
.animation-demo {
  /* 动画名称 */
  animation-name: slideIn;
  /* 动画持续时间 */
  animation-duration: 0.5s;
  /* 时序函数 */
  animation-timing-function: ease-out;
  /* 延迟时间 */
  animation-delay: 0.2s;
  /* 播放次数: 数字 | infinite */
  animation-iteration-count: 1;
  /* 播放方向: normal | reverse | alternate | alternate-reverse */
  animation-direction: normal;
  /* 填充模式: none | forwards | backwards | both */
  animation-fill-mode: forwards;
  /* 播放状态: running | paused */
  animation-play-state: running;

  /* 简写 */
  /* animation: name duration timing-function delay iteration-count direction fill-mode */
  animation: slideIn 0.5s ease-out 0.2s 1 normal forwards;
}
```

### 2.3 animation-fill-mode 详解

```css
/* none: 动画前后都应用原始样式 */
.fill-none {
  animation-fill-mode: none;
}

/* forwards: 动画结束后保持最后一帧 */
.fill-forwards {
  animation-fill-mode: forwards;
}

/* backwards: 动画延迟期间应用第一帧 */
.fill-backwards {
  animation-fill-mode: backwards;
}

/* both: 同时应用forwards和backwards */
.fill-both {
  animation-fill-mode: both;
}
```

### 2.4 实用动画效果

```css
/* 加载旋转动画 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #3498db;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 脉冲动画 */
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* 打字机效果 */
@keyframes typing {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}

@keyframes blink {
  50% {
    border-color: transparent;
  }
}

.typewriter {
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid #333;
  width: 0;
  animation:
    typing 3s steps(20) forwards,
    blink 0.7s step-end infinite;
}

/* 摇晃动画 */
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-5px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(5px);
  }
}

.shake {
  animation: shake 0.5s ease-in-out;
}
```

## 3. CSS 变换（Transform）

### 3.1 2D 变换

```css
.transform-demo {
  /* 平移 */
  transform: translate(50px, 100px); /* 水平50px，垂直100px */
  transform: translateX(50px); /* 仅水平 */
  transform: translateY(100px); /* 仅垂直 */
  transform: translate(-50%, -50%); /* 百分比相对自身 */

  /* 旋转 */
  transform: rotate(45deg); /* 顺时针45度 */
  transform: rotate(-0.25turn); /* 逆时针1/4圈 */

  /* 缩放 */
  transform: scale(1.5); /* 整体放大1.5倍 */
  transform: scale(1.5, 2); /* 水平1.5倍，垂直2倍 */
  transform: scaleX(2); /* 仅水平缩放 */

  /* 倾斜 */
  transform: skew(10deg, 20deg); /* 水平10度，垂直20度 */
  transform: skewX(10deg); /* 仅水平倾斜 */

  /* 组合变换（从右到左应用） */
  transform: translate(50px, 0) rotate(45deg) scale(1.2);
}
```

### 3.2 3D 变换

```css
.transform-3d {
  /* 开启3D上下文 */
  transform-style: preserve-3d;
  /* 透视距离 */
  perspective: 1000px;

  /* 3D旋转 */
  transform: rotateX(45deg); /* 绕X轴旋转 */
  transform: rotateY(45deg); /* 绕Y轴旋转 */
  transform: rotate3d(1, 1, 0, 45deg); /* 绕自定义轴旋转 */

  /* 3D平移 */
  transform: translateZ(100px); /* 沿Z轴平移 */

  /* 3D缩放 */
  transform: scaleZ(2); /* 沿Z轴缩放 */
}

/* 翻转卡片效果 */
.flip-card {
  width: 300px;
  height: 200px;
  perspective: 1000px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card:hover .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}
```

### 3.3 transform-origin

```css
/* 变换原点 */
.origin-center {
  transform-origin: center center;
} /* 默认 */
.origin-top-left {
  transform-origin: top left;
}
.origin-custom {
  transform-origin: 30% 70%;
}
.origin-pixel {
  transform-origin: 50px 100px;
}

/* 不同原点下的旋转效果差异 */
.rotate-center {
  transform-origin: center;
  transform: rotate(45deg); /* 绕中心旋转 */
}

.rotate-corner {
  transform-origin: bottom right;
  transform: rotate(45deg); /* 绕右下角旋转 */
}
```

## 4. 性能优化

### 4.1 高性能动画属性

```css
/* 推荐：仅触发Composite的属性（GPU加速） */
.good-animation {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

/* 避免：触发Layout的属性（性能差） */
.bad-animation {
  transition:
    width 0.3s,
    height 0.3s,
    top 0.3s,
    left 0.3s;
}

/* 触发层级 */
/* Layout（重排）> Paint（重绘）> Composite（合成） */
/* Layout触发属性: width, height, margin, padding, top, left... */
/* Paint触发属性: color, background, box-shadow, border-radius... */
/* Composite触发属性: transform, opacity */
```

### 4.2 will-change 提示

```css
/* 提示浏览器提前优化 */
.will-animate {
  will-change: transform, opacity;
}

/* 注意：不要滥用will-change，它会消耗额外内存 */
/* 只在即将发生动画时添加，动画结束后移除 */

/* 使用JS动态控制 */
/*
element.addEventListener('mouseenter', () => {
    element.style.willChange = 'transform';
});
element.addEventListener('animationend', () => {
    element.style.willChange = 'auto';
});
*/
```

### 4.3 prefers-reduced-motion

```css
/* 尊重用户的减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 5. 常见问题与解决方案

### 5.1 动画闪烁

**问题**：动画开始或结束时出现闪烁

```css
/* 解决方案：使用transform代替top/left */
/* 错误 */
.flash-bad {
  transition:
    top 0.3s,
    left 0.3s;
}

/* 正确 */
.flash-good {
  transition: transform 0.3s;
  will-change: transform;
}
```

### 5.2 动画卡顿

**问题**：动画帧率低，不流畅

```css
/* 解决方案 */
.smooth-animation {
  /* 1. 使用GPU加速属性 */
  transform: translateZ(0);

  /* 2. 提升到独立图层 */
  will-change: transform;

  /* 3. 避免同时动画过多元素 */
}

/* JS中检查帧率 */
/*
let lastTime = performance.now();
function checkFPS() {
    const now = performance.now();
    const fps = 1000 / (now - lastTime);
    lastTime = now;
    console.log(`FPS: ${fps}`);
    requestAnimationFrame(checkFPS);
}
*/
```

### 5.3 动画结束状态回弹

**问题**：动画结束后回到初始状态

```css
/* 解决方案：使用animation-fill-mode: forwards */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.stay-at-end {
  animation: slideIn 0.5s ease forwards; /* forwards保持结束状态 */
}
```

## 6. 总结与最佳实践

### 6.1 过渡 vs 动画选择

| 场景                     | 选择       | 原因           |
| :----------------------- | :--------- | :------------- |
| 状态变化（hover、click） | transition | 简单、声明式   |
| 循环播放                 | animation  | 支持infinite   |
| 多步骤动画               | animation  | 支持多关键帧   |
| 无触发自动播放           | animation  | 不需要状态变化 |

### 6.2 最佳实践

1. **优先使用 transform 和 opacity**：GPU加速，性能最佳
2. **避免动画布局属性**：width、height、top、left等触发重排
3. **使用 will-change 谨慎**：只在需要时添加，用完移除
4. **尊重用户偏好**：使用 prefers-reduced-motion 媒体查询
5. **控制动画时长**：交互反馈 0.1-0.3s，装饰动画 0.3-0.5s
6. **使用 cubic-bezier**：自定义缓动曲线比预设更自然
