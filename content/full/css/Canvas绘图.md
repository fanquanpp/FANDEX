---
order: 80
tags:
  - css
  - performance
difficulty: intermediate
title: 'CSS Canvas 绘图'
module: css
category: 'CSS Basics'
description: Canvas绘图API与动画实战
author: fanquanpp
updated: '2026-05-03'
related:
  - css/关键渲染路径优化
  - css/CSS原生嵌套
  - 'css/CSS-in-JS与高级布局技巧'
  - css/CSS架构方法论
prerequisites:
  - css/概述与基本语法
---

## 1. Canvas 概述 | Canvas Overview

Canvas 是 HTML5 提供的一个绘图 API，通过 JavaScript 可以在网页上绘制各种图形、动画和交互效果。Canvas 元素提供了一个矩形区域，我们可以使用各种绘图命令在这个区域内绘制内容。

### 1.1 Canvas 的特点

- **像素级控制**：可以精确控制每个像素的颜色和位置
- **丰富的绘图 API**：支持绘制路径、形状、文本、图像等
- **动画支持**：可以通过 JavaScript 实现复杂的动画效果
- **交互性**：可以响应鼠标和键盘事件，实现交互效果
- **性能优势**：对于复杂的图形和动画，Canvas 通常比 DOM 操作更高效

### 1.2 Canvas 与 SVG 的区别

| 特性              | Canvas                 | SVG                  |
| ----------------- | ---------------------- | -------------------- |
| 绘制方式          | 基于像素               | 基于矢量             |
| 缩放效果          | 放大后可能失真         | 放大后不失真         |
| 事件处理          | 不支持元素级事件       | 支持元素级事件       |
| 性能              | 适合绘制大量图形和动画 | 适合绘制少量复杂图形 |
| 存储方式          | 存储为像素数据         | 存储为 XML 结构      |
| ## 2. Canvas 基础 | Canvas Basics          |

### 2.1 创建 Canvas 元素

```html
<canvas id="myCanvas" width="400" height="300"></canvas>
```

### 2.2 获取 Canvas 上下文

要在 Canvas 上绘图，首先需要获取 Canvas 的 2D 上下文：

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
```

### 2.3 基本绘图操作

#### 2.3.1 绘制矩形

```javascript
// 填充矩形
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 50);
// 描边矩形
ctx.strokeStyle = 'blue';
ctx.lineWidth = 2;
ctx.strokeRect(120, 10, 100, 50);
// 清除矩形
ctx.clearRect(230, 10, 100, 50);
```

#### 2.3.2 绘制路径

```javascript
// 开始路径
ctx.beginPath();
// 移动到起始点
ctx.moveTo(50, 100);
// 绘制线条
ctx.lineTo(150, 100);
ctx.lineTo(100, 150);
// 闭合路径
ctx.closePath();
// 填充路径
ctx.fillStyle = 'green';
ctx.fill();
// 描边路径
ctx.strokeStyle = 'black';
ctx.lineWidth = 2;
ctx.stroke();
```

#### 2.3.3 绘制圆形

```javascript
ctx.beginPath();
ctx.arc(200, 125, 50, 0, Math.PI * 2);
ctx.fillStyle = 'yellow';
ctx.fill();
ctx.strokeStyle = 'black';
ctx.lineWidth = 2;
ctx.stroke();
```

#### 2.3.4 绘制文本

```javascript
ctx.font = '24px Arial';
ctx.fillStyle = 'black';
ctx.textAlign = 'center';
ctx.fillText('Hello Canvas!', 200, 250);
// 描边文本
ctx.strokeStyle = 'red';
ctx.lineWidth = 1;
ctx.strokeText('Hello Canvas!', 200, 280);
```

## 3. Canvas 进阶 | Canvas Advanced

### 3.1 渐变效果

#### 3.1.1 线性渐变

```javascript
// 创建线性渐变
const linearGradient = ctx.createLinearGradient(0, 0, 400, 0);
linearGradient.addColorStop(0, 'red');
linearGradient.addColorStop(0.5, 'yellow');
linearGradient.addColorStop(1, 'green');
// 使用渐变
ctx.fillStyle = linearGradient;
ctx.fillRect(0, 0, 400, 300);
```

#### 3.1.2 径向渐变

```javascript
// 创建径向渐变
const radialGradient = ctx.createRadialGradient(200, 150, 0, 200, 150, 150);
radialGradient.addColorStop(0, 'white');
radialGradient.addColorStop(1, 'blue');
// 使用渐变
ctx.fillStyle = radialGradient;
ctx.fillRect(0, 0, 400, 300);
```

### 3.2 图案填充

```javascript
// 创建图案
const patternCanvas = document.createElement('canvas');
patternCanvas.width = 20;
patternCanvas.height = 20;
const patternCtx = patternCanvas.getContext('2d');
patternCtx.fillStyle = 'red';
patternCtx.fillRect(0, 0, 10, 10);
patternCtx.fillRect(10, 10, 10, 10);
// 创建重复图案
const pattern = ctx.createPattern(patternCanvas, 'repeat');
// 使用图案
ctx.fillStyle = pattern;
ctx.fillRect(0, 0, 400, 300);
```

### 3.3 图像处理

#### 3.3.1 绘制图像

```javascript
const img = new Image();
img.src = 'image.jpg';
img.onload = function () {
  // 绘制完整图像
  ctx.drawImage(img, 0, 0);
  // 绘制缩放后的图像
  ctx.drawImage(img, 0, 150, 200, 100);
  // 绘制图像的一部分
  ctx.drawImage(img, 100, 100, 200, 100, 200, 150, 200, 100);
};
```

#### 3.3.2 图像变换

```javascript
const img = new Image();
img.src = 'image.jpg';
img.onload = function () {
  // 保存当前状态
  ctx.save();
  // 平移
  ctx.translate(100, 50);
  // 旋转
  ctx.rotate(Math.PI / 4);
  // 缩放
  ctx.scale(0.5, 0.5);
  // 绘制图像
  ctx.drawImage(img, 0, 0);
  // 恢复之前的状态
  ctx.restore();
};
```

### 3.4 合成模式

```javascript
// 绘制第一个矩形
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);
// 设置合成模式
ctx.globalCompositeOperation = 'source-over'; // 默认
// ctx.globalCompositeOperation = 'source-in';
// ctx.globalCompositeOperation = 'source-out';
// ctx.globalCompositeOperation = 'destination-over';
// ctx.globalCompositeOperation = 'destination-in';
// ctx.globalCompositeOperation = 'destination-out';
// ctx.globalCompositeOperation = 'lighter';
// ctx.globalCompositeOperation = 'copy';
// ctx.globalCompositeOperation = 'xor';
// 绘制第二个矩形
ctx.fillStyle = 'blue';
ctx.fillRect(100, 100, 100, 100);
```

## 4. Canvas 动画 | Canvas Animation

### 4.1 基本动画循环

```javascript
function animate() {
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 绘制动画内容
  // ...
  // 请求下一帧
  requestAnimationFrame(animate);
}
// 开始动画
animate();
```

### 4.2 移动动画

```javascript
let x = 0;
let y = 150;
let dx = 2;
let dy = 2;
function animate() {
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 绘制圆形
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = 'red';
  ctx.fill();
  // 更新位置
  x += dx;
  y += dy;
  // 边界检测
  if (x + 20 > canvas.width || x - 20 < 0) {
    dx = -dx;
  }
  if (y + 20 > canvas.height || y - 20 < 0) {
    dy = -dy;
  }
  // 请求下一帧
  requestAnimationFrame(animate);
}
// 开始动画
animate();
```

### 4.3 交互动画

```javascript
let isDrawing = false;
let lastX = 0;
let lastY = 0;
// 鼠标按下事件
canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
});
// 鼠标移动事件
canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.stroke();
  [lastX, lastY] = [e.offsetX, e.offsetY];
});
// 鼠标释放事件
canvas.addEventListener('mouseup', () => {
  isDrawing = false;
});
// 鼠标离开事件
canvas.addEventListener('mouseout', () => {
  isDrawing = false;
});
```

## 5. Canvas 实战示例 | Canvas Practical Examples

### 5.1 简单的绘图应用

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Canvas Drawing App</title>
    <style>
      canvas {
        border: 1px solid black;
        cursor: crosshair;
      }
      .controls {
        margin-bottom: 10px;
      }
    </style>
  </head>
  <body>
    <div class="controls">
      <label for="color">Color:</label>
      <input type="color" id="color" value="#000000" />
      <label for="size">Size:</label>
      <input type="range" id="size" min="1" max="20" value="2" />
      <button id="clear">Clear</button>
    </div>
    <canvas id="canvas" width="600" height="400"></canvas>
    <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const colorInput = document.getElementById('color');
      const sizeInput = document.getElementById('size');
      const clearButton = document.getElementById('clear');
      let isDrawing = false;
      let lastX = 0;
      let lastY = 0;
      // 鼠标按下事件
      canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
      });
      // 鼠标移动事件
      canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = colorInput.value;
        ctx.lineWidth = sizeInput.value;
        ctx.stroke();
        [lastX, lastY] = [e.offsetX, e.offsetY];
      });
      // 鼠标释放事件
      canvas.addEventListener('mouseup', () => {
        isDrawing = false;
      });
      // 鼠标离开事件
      canvas.addEventListener('mouseout', () => {
        isDrawing = false;
      });
      // 清除按钮点击事件
      clearButton.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    </script>
  </body>
</html>
```

### 5.2 粒子效果

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Canvas Particle Effect</title>
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }
      canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      // 设置画布大小
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // 粒子数组
      const particles = [];
      const particleCount = 100;
      // 创建粒子
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 5 + 1,
          speedX: Math.random() * 3 - 1.5,
          speedY: Math.random() * 3 - 1.5,
          color: `hsl(${Math.random() * 360}, 50%, 50%)`,
        });
      }
      // 动画函数
      function animate() {
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 更新和绘制粒子
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          // 绘制粒子
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          // 更新粒子位置
          p.x += p.speedX;
          p.y += p.speedY;
          // 边界检测
          if (p.x + p.size > canvas.width || p.x - p.size < 0) {
            p.speedX = -p.speedX;
          }
          if (p.y + p.size > canvas.height || p.y - p.size < 0) {
            p.speedY = -p.speedY;
          }
          // 连接粒子
          for (let j = i; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 100) {
              ctx.beginPath();
              ctx.strokeStyle = p.color;
              ctx.lineWidth = 0.2;
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
        // 请求下一帧
        requestAnimationFrame(animate);
      }
      // 开始动画
      animate();
      // 窗口大小改变时调整画布大小
      window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
    </script>
  </body>
</html>
```

### 5.3 时钟效果

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Canvas Clock</title>
    <style>
      canvas {
        display: block;
        margin: 50px auto;
        border: 1px solid black;
        border-radius: 50%;
      }
    </style>
  </head>
  <body>
    <canvas id="canvas" width="400" height="400"></canvas>
    <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 180;
      // 绘制时钟
      function drawClock() {
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 获取当前时间
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        // 绘制表盘
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        // 绘制刻度
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const x1 = centerX + Math.cos(angle) * (radius - 20);
          const y1 = centerY + Math.sin(angle) * (radius - 20);
          const x2 = centerX + Math.cos(angle) * (radius - 10);
          const y2 = centerY + Math.sin(angle) * (radius - 10);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;
          ctx.stroke();
          // 绘制数字
          const text = i === 0 ? '12' : i.toString();
          ctx.font = '20px Arial';
          ctx.fillStyle = 'black';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const textX = centerX + Math.cos(angle) * (radius - 40);
          const textY = centerY + Math.sin(angle) * (radius - 40);
          ctx.fillText(text, textX, textY);
        }
        // 绘制时针
        const hourAngle = ((hours % 12) / 12) * Math.PI * 2 + (minutes / 60) * ((Math.PI * 2) / 12);
        const hourX = centerX + Math.cos(hourAngle) * (radius - 80);
        const hourY = centerY + Math.sin(hourAngle) * (radius - 80);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(hourX, hourY);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.stroke();
        // 绘制分针
        const minuteAngle = (minutes / 60) * Math.PI * 2 + (seconds / 60) * ((Math.PI * 2) / 60);
        const minuteX = centerX + Math.cos(minuteAngle) * (radius - 60);
        const minuteY = centerY + Math.sin(minuteAngle) * (radius - 60);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(minuteX, minuteY);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        // 绘制秒针
        const secondAngle = (seconds / 60) * Math.PI * 2;
        const secondX = centerX + Math.cos(secondAngle) * (radius - 40);
        const secondY = centerY + Math.sin(secondAngle) * (radius - 40);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(secondX, secondY);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.stroke();
        // 绘制中心点
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
      }
      // 绘制时钟并每秒更新
      drawClock();
      setInterval(drawClock, 1000);
    </script>
  </body>
</html>
```

## 6. Canvas 性能优化 | Canvas Performance Optimization

### 6.1 减少绘制操作

- **批量绘制**：将多个绘制操作合并为一个路径
- **避免频繁清除**：只清除需要更新的区域
- **使用离屏 Canvas**：对于复杂的绘制，使用离屏 Canvas 预渲染

### 6.2 优化图像操作

- **使用适当的图像格式**：根据需要选择 JPEG、PNG 或 WebP
- **压缩图像**：减少图像文件大小
- **使用 CSS 缩放**：在绘制前使用 CSS 缩放图像

### 6.3 优化动画

- **使用 requestAnimationFrame**：代替 setTimeout 或 setInterval
- **限制帧率**：对于不需要 60fps 的动画，限制帧率
- **使用 transforms**：使用 translate、rotate、scale 等变换代替重新绘制

### 6.4 内存管理

- **释放不再使用的资源**：及时释放图像、路径等资源
- **避免内存泄漏**：注意事件监听器的移除

## 7. Canvas 最佳实践 | Canvas Best Practices

### 7.1 代码组织

- **模块化设计**：将 Canvas 相关代码封装为模块
- **使用面向对象**：使用类和对象组织代码
- **注释**：添加适当的注释，说明代码的功能和逻辑

### 7.2 兼容性

- **检测 Canvas 支持**：在使用 Canvas 前检测浏览器是否支持
- **提供替代方案**：为不支持 Canvas 的浏览器提供替代内容

### 7.3 安全性

- **验证用户输入**：对于用户输入的坐标和尺寸，进行验证
- **防止 XSS**：对于从用户输入生成的 Canvas 内容，进行适当的过滤

### 7.4 可访问性

- **提供替代文本**：为 Canvas 元素添加 alt 属性
- **使用 ARIA 标签**：为 Canvas 元素添加适当的 ARIA 标签
- **支持键盘导航**：对于交互式 Canvas，支持键盘导航

## 8. 总结 | Summary

Canvas 是 HTML5 提供的强大绘图 API，通过 JavaScript 可以在网页上创建各种图形、动画和交互效果。Canvas 具有像素级控制、丰富的绘图 API、动画支持和交互性等特点，适用于创建游戏、数据可视化、图像处理等应用。
通过学习 Canvas 的基础操作、进阶特性和性能优化技巧，你可以创建各种复杂的图形和动画效果。在实际开发中，应根据具体需求选择合适的技术方案，并遵循相关的最佳实践，以创建高性能、可维护的 Canvas 应用。
