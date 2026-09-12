---
order: 330
title: CSS 动画与过渡
module: 'css'
category: 前端技术
difficulty: intermediate
description: CSS transition过渡、animation动画、关键帧、变换transform与性能优化详解。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'css/290-BackgroundEnhancement'
  - 'css/250-CSS3GridGridLayout'
  - 'css/280-BorderRadius'
  - 'css/360-MediaQuery'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [CSS3 概述与基本语法](/css/020-CSS3OverviewBasicSyntax)

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
## transition 过渡

**基本写法：transition-property 单属性**
`transition-property: <属性>;`
```css
/* 指定过渡属性 */
.box {
  transition-property: opacity;
}
```

---

**基本写法：transition-duration 时长**
`transition-duration: <时间>;`
```css
/* 设置过渡时长 */
.box {
  transition-duration: 0.3s;
}
```

---

**基本写法：transition-timing-function 缓动**
`transition-timing-function: <缓动函数>;`
```css
/* 设置缓动函数 */
.box {
  transition-timing-function: ease-in-out;
}
```

---

**基本写法：transition-delay 延迟**
`transition-delay: <时间>;`
```css
/* 设置过渡延迟 */
.box {
  transition-delay: 0.1s;
}
```

---

**基本写法：transition 简写**
`transition: <属性> <时长> <缓动> <延迟>;`
```css
/* 同时设置过渡属性 */
.box {
  transition: opacity 0.3s ease-in-out 0.1s;
}
```

---

**单行写法：多属性过渡**
`transition: <属性1> <时长1>, <属性2> <时长2>;`
```css
/* 单行设置多个属性过渡 */
.box {
  transition: opacity 0.3s, transform 0.5s;
}
```

---

**换行写法：多属性过渡**
`transition: <属性1> <时长1>, <属性2> <时长2>, <属性3> <时长3>;`
```css
/* 换行设置多个属性过渡 */
.box {
  transition:
    opacity 0.3s,
    transform 0.5s,
    background-color 0.2s;
}
```

---

**基本写法：transition all**
`transition: all <时长>;`
```css
/* 所有可过渡属性都应用过渡 */
.box {
  transition: all 0.3s;
}
```

---

## @keyframes 关键帧

**基本写法：from-to 关键帧**
`@keyframes <名称> { from { <样式> } to { <样式> } }`
```css
/* 定义从起点到终点的动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

**基本写法：百分比关键帧**
`@keyframes <名称> { 0% { <样式> } 50% { <样式> } 100% { <样式> } }`
```css
/* 定义多关键帧动画 */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

---

**单行写法：多属性关键帧**
`@keyframes <名称> { 0% { <属性1>: <值>; <属性2>: <值>; } }`
```css
/* 单行定义多属性关键帧 */
@keyframes slide {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(100px); opacity: 0; }
}
```

---

**换行写法：多属性关键帧**
`@keyframes <名称> { 0% { <属性1>: <值>; <属性2>: <值>; } }`
```css
/* 换行定义多属性关键帧 */
@keyframes slide {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(100px);
    opacity: 0;
  }
}
```

---

## animation 动画

**基本写法：animation-name 名称**
`animation-name: <动画名>;`
```css
/* 指定动画名称 */
.box {
  animation-name: fadeIn;
}
```

---

**基本写法：animation-duration 时长**
`animation-duration: <时间>;`
```css
/* 设置动画时长 */
.box {
  animation-duration: 2s;
}
```

---

**基本写法：animation-timing-function 缓动**
`animation-timing-function: <缓动函数>;`
```css
/* 设置动画缓动函数 */
.box {
  animation-timing-function: ease-in-out;
}
```

---

**基本写法：animation-delay 延迟**
`animation-delay: <时间>;`
```css
/* 设置动画延迟 */
.box {
  animation-delay: 0.5s;
}
```

---

**基本写法：animation-iteration-count 次数**
`animation-iteration-count: <次数>;`
```css
/* 设置动画播放次数 */
.box {
  animation-iteration-count: 3;
}
```

---

**基本写法：animation-iteration-count 无限**
`animation-iteration-count: infinite;`
```css
/* 无限循环播放 */
.box {
  animation-iteration-count: infinite;
}
```

---

**基本写法：animation-direction 方向**
`animation-direction: alternate;`
```css
/* 交替反向播放 */
.box {
  animation-direction: alternate;
}
```

---

**基本写法：animation-direction 反向**
`animation-direction: reverse;`
```css
/* 反向播放 */
.box {
  animation-direction: reverse;
}
```

---

**基本写法：animation-fill-mode 填充**
`animation-fill-mode: forwards;`
```css
/* 保持结束状态 */
.box {
  animation-fill-mode: forwards;
}
```

---

**基本写法：animation-fill-mode 双向**
`animation-fill-mode: both;`
```css
/* 同时应用开始和结束状态 */
.box {
  animation-fill-mode: both;
}
```

---

**基本写法：animation-play-state 播放**
`animation-play-state: running;`
```css
/* 动画运行中 */
.box {
  animation-play-state: running;
}
```

---

**基本写法：animation-play-state 暂停**
`animation-play-state: paused;`
```css
/* 暂停动画 */
.box:hover {
  animation-play-state: paused;
}
```

---

**基本写法：animation 简写**
`animation: <名称> <时长> <缓动> <延迟> <次数> <方向> <填充> <状态>;`
```css
/* 同时设置所有动画属性 */
.box {
  animation: fadeIn 2s ease-in-out 0.5s infinite alternate forwards;
}
```

---

**单行写法：多动画**
`animation: <动画1>, <动画2>;`
```css
/* 单行设置多个动画 */
.box {
  animation: fadeIn 2s, slideIn 1s;
}
```

---

**换行写法：多动画**
`animation: <动画1>, <动画2>, <动画3>;`
```css
/* 换行设置多个动画 */
.box {
  animation:
    fadeIn 2s,
    slideIn 1s,
    pulse 0.5s infinite;
}
```

---

## 缓动函数

**基本写法：ease 默认**
`transition-timing-function: ease;`
```css
/* 默认缓动 */
.box {
  transition-timing-function: ease;
}
```

---

**基本写法：linear 线性**
`transition-timing-function: linear;`
```css
/* 线性匀速 */
.box {
  transition-timing-function: linear;
}
```

---

**基本写法：ease-in 加速**
`transition-timing-function: ease-in;`
```css
/* 开始慢，结束快 */
.box {
  transition-timing-function: ease-in;
}
```

---

**基本写法：ease-out 减速**
`transition-timing-function: ease-out;`
```css
/* 开始快，结束慢 */
.box {
  transition-timing-function: ease-out;
}
```

---

**基本写法：cubic-bezier 自定义**
`transition-timing-function: cubic-bezier(<x1>, <y1>, <x2>, <y2>);`
```css
/* 自定义贝塞尔曲线 */
.box {
  transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
}
```

---

**基本写法：steps 步进**
`transition-timing-function: steps(<步数>);`
```css
/* 分步过渡 */
.box {
  transition-timing-function: steps(4);
}
```

---

**基本写法：steps 跳跃**
`transition-timing-function: steps(<步数>, jump-none);`
```css
/* 步进不跳跃 */
.box {
  transition-timing-function: steps(4, jump-none);
}
```

---

## transform 变换动画

**基本写法：translate 平移动画**
`transform: translate(<x>, <y>);`
```css
/* 平移动画 */
.box {
  transition: transform 0.3s;
}
.box:hover {
  transform: translate(10px, 10px);
}
```

---

**基本写法：scale 缩放动画**
`transform: scale(<比例>);`
```css
/* 缩放动画 */
.box {
  transition: transform 0.3s;
}
.box:hover {
  transform: scale(1.1);
}
```

---

**基本写法：rotate 旋转动画**
`transform: rotate(<角度>);`
```css
/* 旋转动画 */
.box {
  transition: transform 0.5s;
}
.box:hover {
  transform: rotate(180deg);
}
```

---

**基本写法：3D 旋转动画**
`transform: rotateY(<角度>);`
```css
/* Y 轴 3D 旋转 */
.card {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.card:hover {
  transform: rotateY(180deg);
}
```

---

## 常见动画效果

**基本写法：淡入动画**
`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`
```css
/* 淡入效果 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fade-in {
  animation: fadeIn 0.5s ease-out;
}
```

---

**基本写法：淡出动画**
`@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }`
```css
/* 淡出效果 */
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
.fade-out {
  animation: fadeOut 0.5s ease-in;
}
```

---

**基本写法：滑入动画**
`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`
```css
/* 从左侧滑入 */
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
.slide-in {
  animation: slideIn 0.5s ease-out;
}
```

---

**基本写法：弹跳动画**
`@keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-30px); } 60% { transform: translateY(-15px); } }`
```css
/* 弹跳效果 */
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-30px); }
  60% { transform: translateY(-15px); }
}
.bounce {
  animation: bounce 1s;
}
```

---

**基本写法：旋转加载**
`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`
```css
/* 旋转加载动画 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spinner {
  animation: spin 1s linear infinite;
}
```

---

**基本写法：脉冲动画**
`@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }`
```css
/* 脉冲效果 */
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}
.pulse {
  animation: pulse 2s ease-in-out infinite;
}
```

---

## 滚动驱动动画

**基本写法：animation-timeline 滚动**
`animation-timeline: scroll();`
```css
/* 滚动驱动动画 */
.box {
  animation: fadeIn linear;
  animation-timeline: scroll();
}
```

---

**基本写法：animation-timeline 视口**
`animation-timeline: view();`
```css
/* 元素进入视口时触发 */
.box {
  animation: fadeIn linear;
  animation-timeline: view();
}
```

---

**基本写法：view 轴向**
`animation-timeline: view(<轴>);`
```css
/* 指定视口轴向 */
.box {
  animation: fadeIn linear;
  animation-timeline: view(block);
}
```

---

## 性能优化

**基本写法：will-change 提示**
`will-change: <属性>;`
```css
/* 提示浏览器优化 */
.animated {
  will-change: transform, opacity;
}
```

---

**基本写法：transform 替代 position**
`transform: translate3d(<x>, <y>, 0);`
```css
/* 使用 transform 触发 GPU 加速 */
.box {
  transform: translate3d(0, 0, 0);
}
```

---

**基本写法：backface-visibility 隐藏背面**
`backface-visibility: hidden;`
```css
/* 翻转卡片隐藏背面 */
.card {
  backface-visibility: hidden;
}
```

---

**基本写法：contain 包含**
`contain: layout;`
```css
/* 限制重绘范围 */
.widget {
  contain: layout;
}
```

---

**基本写法：content-visibility 内容可见性**
`content-visibility: auto;`
```css
/* 自动跳过屏幕外内容渲染 */
.long-list {
  content-visibility: auto;
}
```

---

## 现代动画新特性

**基本写法：@starting-style 进入动画**
`@starting-style { <选择器> { <样式> } }`
```css
/* 元素首次显示时的起始样式,实现进入动画 */
.dialog {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s, transform 0.3s;
}
@starting-style {
  .dialog {
    opacity: 0;
    transform: translateY(20px);
  }
}
```

---

**基本写法：transition-behavior: allow-discrete**
`transition-behavior: allow-discrete;`
```css
/* 允许离散属性(如 display)参与过渡 */
.modal {
  transition: display 0.3s, opacity 0.3s;
  transition-behavior: allow-discrete;
}
.modal.hidden {
  display: none;
  opacity: 0;
}
```

---

**基本写法：scroll-driven animations animation-timeline**
`animation-timeline: scroll(<参数>);`
```css
/* 滚动驱动动画:页面滚动时持续触发 */
@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.progress-bar {
  animation: progress linear;
  animation-timeline: scroll(root);
  transform-origin: left;
}
```

---

**基本写法：view-timeline 视图时间线**
`view-timeline: <名称> <轴>;`
```css
/* 元素进入视口时触发的视图时间线 */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.section {
  view-timeline: --section-timeline block;
  animation: fade-in linear;
  animation-timeline: --section-timeline;
}
```

---

**基本写法：interpolate-size: allow-keywords 高度 auto 过渡**
`interpolate-size: allow-keywords;`
```css
/* 允许对 height: auto 等关键字进行过渡 */
.accordion {
  interpolate-size: allow-keywords;
  height: auto;
  transition: height 0.3s ease;
}
.accordion.collapsed {
  height: 0;
}
```

## 动手试试

1. 给按钮写 `transition: background-color 0.3s`，hover 变色观察过渡；
2. 用 `@keyframes` 做一个“淡入 + 上移”的入场动画；
3. 用 `animation-iteration-count: infinite` 做呼吸灯效果；
4. 进阶挑战：配合 `prefers-reduced-motion` 在用户减少动效时关闭动画。

## 核心知识点

> 一句话记住动画：`transition` 是“状态变化时的过渡”，`animation` 是“按关键帧自动播放”；动画属性、时长、缓动函数（ease）与循环次数四要素。

- `transition`：属性、时长、缓动、延迟，hover 等状态变化时触发；
- `@keyframes`：`from`/`to` 或百分比关键帧定义动画过程；
- `animation` 简写：name duration timing-function delay iteration-count direction fill-mode；
- 只对可动画属性做过渡（transform/opacity 性能最佳）；
- 动效遵守 `prefers-reduced-motion`，为减少动效用户关闭动画；
- `transform` 与 `opacity` 走合成层，避免 layout/paint 抖动。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 动画属性过多 | 性能差 | 只用 transform/opacity |
| 忘记缓动函数 | 动画生硬 | 用 ease/cubic-bezier |
| 无限动画扰民 | 影响阅读 | 尊重 reduced-motion，限制循环 |
| transition 写错属性 | 不触发 | 确认属性可动画 |
| 动画结束后跳变 | 状态复位 | 用 `animation-fill-mode: forwards` |

## 扩展学习

- 关键帧与缓动：`css/650-CSSNewFeatures`；
- 3D 变换：`css/700-Transform3D`；
- 可访问性：`css/500-AccessibleStyling`（减少动效）；
- 性能：`css/540-CSSPerformanceOptimizationDetailed`。
