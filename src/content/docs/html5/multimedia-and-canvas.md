---
order: 40
tags:
  - 'html5'
  - 'database'
  - 'networking'
  - 'memory'
  - 'css-layout'
  - 'web-api'
  - 'devops'
difficulty: 'intermediate'
title: 'HTML5 多媒体与 Canvas 绘图'
module: 'html5'
category: 'HTML5 Basics'
description: 'audio/video 元素、Canvas API 与 SVG 基础。'
author: 'Anonymous'
---

## 目录

1. [音视频支持](#音视频支持)
2. [Canvas 绘图](#canvas-绘图)
3. [SVG 绘图](#svg-绘图)
4. [实际应用示例](#实际应用示例)
5. [最佳实践](#最佳实践)

---

## 1. 音视频支持

HTML5 提供了原生的音视频支持，不再需要依赖 Flash 插件，使网页能够直接播放音视频内容。

### 1.1 视频播放

#### 1.1.1 基本用法

```html
<video width="640" height="360" controls poster="poster.jpg">
  <source src="movie.mp4" type="video/mp4" />
  <source src="movie.webm" type="video/webm" />
  您的浏览器不支持 HTML5 视频。
</video>
```

#### 1.1.2 常用属性

| 属性       | 描述                   | 示例                          |
| ---------- | ---------------------- | ----------------------------- |
| `controls` | 显示视频控制条         | `<video controls>`            |
| `autoplay` | 自动播放视频           | `<video autoplay>`            |
| `muted`    | 静音播放               | `<video muted>`               |
| `loop`     | 循环播放               | `<video loop>`                |
| `poster`   | 视频加载前显示的封面图 | `<video poster="poster.jpg">` |
| `preload`  | 预加载设置             | `<video preload="auto">`      |
| `width`    | 视频宽度               | `<video width="640">`         |
| `height`   | 视频高度               | `<video height="360">`        |

#### 1.1.3 视频控制 API

通过 JavaScript 可以控制视频的播放、暂停、音量等。

```html
<video id="myVideo" width="640" height="360" controls>
  <source src="movie.mp4" type="video/mp4" />
  您的浏览器不支持 HTML5 视频。
</video>
<div>
  <button onclick="playVideo()">播放</button>
  <button onclick="pauseVideo()">暂停</button>
  <button onclick="muteVideo()">静音</button>
  <button onclick="unmuteVideo()">取消静音</button>
  <input
    type="range"
    id="volume"
    min="0"
    max="1"
    step="0.1"
    value="1"
    onchange="setVolume(this.value)"
  />
  <span id="volumeValue">100%</span>
</div>
<script>
  const video = document.getElementById('myVideo');
  const volumeValue = document.getElementById('volumeValue');
  function playVideo() {
    video.play();
  }
  function pauseVideo() {
    video.pause();
  }
  function muteVideo() {
    video.muted = true;
  }
  function unmuteVideo() {
    video.muted = false;
  }
  function setVolume(value) {
    video.volume = value;
    volumeValue.textContent = Math.round(value * 100) + '%';
  }
  // 监听视频事件
  video.addEventListener('play', function () {
    console.log('视频开始播放');
  });
  video.addEventListener('pause', function () {
    console.log('视频暂停');
  });
  video.addEventListener('ended', function () {
    console.log('视频播放结束');
  });
</script>
```

### 1.2 音频播放

#### 1.2.1 基本用法

```html
<audio controls>
  <source src="music.mp3" type="audio/mpeg" />
  <source src="music.ogg" type="audio/ogg" />
  您的浏览器不支持 HTML5 音频。
</audio>
```

#### 1.2.2 常用属性

| 属性       | 描述           | 示例                     |
| ---------- | -------------- | ------------------------ |
| `controls` | 显示音频控制条 | `<audio controls>`       |
| `autoplay` | 自动播放音频   | `<audio autoplay>`       |
| `muted`    | 静音播放       | `<audio muted>`          |
| `loop`     | 循环播放       | `<audio loop>`           |
| `preload`  | 预加载设置     | `<audio preload="auto">` |

#### 1.2.3 音频控制 API

通过 JavaScript 可以控制音频的播放、暂停、音量等。

```html
<audio id="myAudio">
  <source src="music.mp3" type="audio/mpeg" />
  您的浏览器不支持 HTML5 音频。
</audio>
<div>
  <button onclick="playAudio()">播放</button>
  <button onclick="pauseAudio()">暂停</button>
  <button onclick="muteAudio()">静音</button>
  <button onclick="unmuteAudio()">取消静音</button>
  <input
    type="range"
    id="audioVolume"
    min="0"
    max="1"
    step="0.1"
    value="1"
    onchange="setAudioVolume(this.value)"
  />
  <span id="audioVolumeValue">100%</span>
</div>
<script>
  const audio = document.getElementById('myAudio');
  const audioVolumeValue = document.getElementById('audioVolumeValue');
  function playAudio() {
    audio.play();
  }
  function pauseAudio() {
    audio.pause();
  }
  function muteAudio() {
    audio.muted = true;
  }
  function unmuteAudio() {
    audio.muted = false;
  }
  function setAudioVolume(value) {
    audio.volume = value;
    audioVolumeValue.textContent = Math.round(value * 100) + '%';
  }
  // 监听音频事件
  audio.addEventListener('play', function () {
    console.log('音频开始播放');
  });
  audio.addEventListener('pause', function () {
    console.log('音频暂停');
  });
  audio.addEventListener('ended', function () {
    console.log('音频播放结束');
  });
</script>
```

## 2. Canvas 绘图

Canvas 是 HTML5 提供的一个用于绘制图形的元素，通过 JavaScript 可以在 Canvas 上绘制各种图形、文本、图像等。

### 2.1 基本结构

```html
<canvas id="myCanvas" width="400" height="300" style="border:1px solid #000;"></canvas>
```

### 2.2 绘图上下文

要在 Canvas 上绘图，首先需要获取绘图上下文：

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
```

### 2.3 基本绘图操作

#### 2.3.1 绘制矩形

```javascript
// 填充矩形
ctx.fillStyle = '#FF0000';
ctx.fillRect(10, 10, 150, 75);
// 描边矩形
ctx.strokeStyle = '#0000FF';
ctx.lineWidth = 2;
ctx.strokeRect(200, 10, 150, 75);
// 清除矩形区域
ctx.clearRect(50, 25, 50, 30);
```

#### 2.3.2 绘制路径

```javascript
// 绘制三角形
ctx.beginPath();
ctx.moveTo(50, 150);
ctx.lineTo(150, 150);
ctx.lineTo(100, 50);
ctx.closePath();
ctx.fillStyle = '#FFFF00';
ctx.fill();
ctx.strokeStyle = '#000000';
ctx.lineWidth = 2;
ctx.stroke();
```

#### 2.3.3 绘制圆形和弧线

```javascript
// 绘制圆形
ctx.beginPath();
ctx.arc(250, 100, 50, 0, Math.PI * 2);
ctx.fillStyle = '#00FF00';
ctx.fill();
// 绘制弧线
ctx.beginPath();
ctx.arc(250, 200, 50, 0, Math.PI);
ctx.strokeStyle = '#FF00FF';
ctx.lineWidth = 3;
ctx.stroke();
```

#### 2.3.4 绘制文本

```javascript
// 填充文本
ctx.font = '30px Arial';
ctx.fillStyle = '#000000';
ctx.fillText('Hello Canvas', 50, 250);
// 描边文本
ctx.font = '24px Times New Roman';
ctx.strokeStyle = '#FF0000';
ctx.strokeText('Hello Canvas', 50, 290);
```

#### 2.3.5 绘制图像

```javascript
const img = new Image();
img.src = 'image.jpg';
img.onload = function () {
  // 绘制完整图像
  ctx.drawImage(img, 300, 150);
  // 绘制部分图像
  ctx.drawImage(img, 100, 100, 50, 50, 300, 200, 50, 50);
  True;
};
```

### 2.4 Canvas 变换

#### 2.4.1 平移

```javascript
ctx.save(); // 保存当前状态
ctx.translate(100, 50); // 平移原点到 (100, 50)
ctx.fillStyle = '#FF0000';
ctx.fillRect(0, 0, 100, 50);
ctx.restore(); // 恢复之前的状态
```

#### 2.4.2 旋转

```javascript
ctx.save();
ctx.translate(200, 100); // 先平移到旋转中心
ctx.rotate(Math.PI / 4); // 旋转 45 度
ctx.fillStyle = '#00FF00';
ctx.fillRect(-50, -25, 100, 50);
ctx.restore();
```

#### 2.4.3 缩放

```javascript
ctx.save();
ctx.scale(1.5, 0.8); // 水平缩放 1.5 倍，垂直缩放 0.8 倍
ctx.fillStyle = '#0000FF';
ctx.fillRect(50, 150, 100, 50);
ctx.restore();
```

### 2.5 Canvas 动画

通过 `requestAnimationFrame` 可以实现 Canvas 动画：

```html
<canvas id="animationCanvas" width="400" height="300" style="border:1px solid #000;"></canvas>
<script>
  const canvas = document.getElementById('animationCanvas');
  const ctx = canvas.getContext('2d');
  let x = 0;
  let speed = 2;
  function animate() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 绘制移动的矩形
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x, 100, 50, 50);
    // 更新位置
    x += speed;
    // 边界检测
    if (x > canvas.width - 50 || x < 0) {
      speed = -speed;
    }
    // 请求下一帧
    requestAnimationFrame(animate);
  }
  // 开始动画
  animate();
</script>
```

### 2.6 Canvas 交互

通过鼠标事件可以实现 Canvas 交互：

```html
<canvas id="interactiveCanvas" width="400" height="300" style="border:1px solid #000;"></canvas>
<script>
  const canvas = document.getElementById('interactiveCanvas');
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  // 鼠标按下事件
  canvas.addEventListener('mousedown', function (e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
  });
  // 鼠标移动事件
  canvas.addEventListener('mousemove', function (e) {
    if (!isDrawing) return;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
  });
  // 鼠标松开事件
  canvas.addEventListener('mouseup', function () {
    isDrawing = false;
  });
  // 鼠标离开事件
  canvas.addEventListener('mouseout', function () {
    isDrawing = false;
  });
</script>
```

## 3. SVG 绘图

SVG (Scalable Vector Graphics) 是一种基于 XML 的矢量图形格式，适合绘制图标、图表等需要缩放不失真的图形。

### 3.1 基本结构

```html
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <!-- 绘制矩形 -->
  <rect x="50" y="50" width="100" height="50" fill="red" stroke="black" stroke-width="2" />
  <!-- 绘制圆形 -->
  <circle cx="200" cy="100" r="40" fill="green" />
  <!-- 绘制椭圆 -->
  <ellipse cx="300" cy="100" rx="50" ry="30" fill="blue" />
  <!-- 绘制线条 -->
  <line x1="50" y1="150" x2="150" y2="200" stroke="black" stroke-width="2" />
  <!-- 绘制路径 -->
  <path d="M200,150 L250,200 L150,200 Z" fill="yellow" stroke="black" stroke-width="2" />
  <!-- 绘制文本 -->
  <text x="50" y="250" font-family="Arial" font-size="20" fill="black">Hello SVG</text>
</svg>
```

### 3.2 SVG 与 Canvas 对比

| 特性     | Canvas                         | SVG                     |
| -------- | ------------------------------ | ----------------------- |
| 绘图方式 | 基于像素，通过 JavaScript 绘制 | 基于矢量，使用 XML 标记 |
| 缩放     | 缩放会失真                     | 缩放不失真              |
| 性能     | 适合绘制大量图形和动画         | 适合绘制少量静态图形    |
| 事件处理 | 需要手动实现                   | 支持元素级事件          |
| 适用场景 | 游戏、复杂动画、数据可视化     | 图标、图表、标志        |

## 4. 实际应用示例

### 4.1 示例 1：视频播放器

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>视频播放器</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 2rem;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        background-color: white;
        padding: 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h1 {
        text-align: center;
        margin-bottom: 2rem;
      }
      .video-container {
        position: relative;
        width: 100%;
        padding-bottom: 56.25%; /* 16:9 比例 */
        overflow: hidden;
        margin-bottom: 1rem;
      }
      video {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
      .controls {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1rem;
      }
      button {
        padding: 0.5rem 1rem;
        background-color: #4caf50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background-color: #45a049;
      }
      input[type='range'] {
        flex: 1;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>HTML5 视频播放器</h1>
      <div class="video-container">
        <video id="myVideo">
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
          您的浏览器不支持 HTML5 视频。
        </video>
      </div>
      <div class="controls">
        <button id="playPause">播放</button>
        <button id="mute">静音</button>
        <input type="range" id="volume" min="0" max="1" step="0.1" value="1" />
        <span id="time">0:00 / 0:00</span>
      </div>
    </div>
    <script>
      const video = document.getElementById('myVideo');
      const playPauseBtn = document.getElementById('playPause');
      const muteBtn = document.getElementById('mute');
      const volumeSlider = document.getElementById('volume');
      const timeDisplay = document.getElementById('time');
      // 播放/暂停按钮
      playPauseBtn.addEventListener('click', function () {
        if (video.paused) {
          video.play();
          playPauseBtn.textContent = '暂停';
        } else {
          video.pause();
          playPauseBtn.textContent = '播放';
        }
      });
      // 静音按钮
      muteBtn.addEventListener('click', function () {
        video.muted = !video.muted;
        muteBtn.textContent = video.muted ? '取消静音' : '静音';
      });
      // 音量控制
      volumeSlider.addEventListener('input', function () {
        video.volume = this.value;
      });
      // 时间更新
      video.addEventListener('timeupdate', function () {
        const currentTime = formatTime(video.currentTime);
        const duration = formatTime(video.duration);
        timeDisplay.textContent = `${currentTime} / ${duration}`;
      });
      // 格式化时间
      function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    </script>
  </body>
</html>
```

### 4.2 示例 2：Canvas 绘图应用

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Canvas 绘图应用</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 2rem;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        background-color: white;
        padding: 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h1 {
        text-align: center;
        margin-bottom: 2rem;
      }
      .canvas-container {
        margin-bottom: 1rem;
      }
      canvas {
        border: 1px solid #000;
        cursor: crosshair;
      }
      .controls {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }
      button {
        padding: 0.5rem 1rem;
        background-color: #4caf50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background-color: #45a049;
      }
      .color-picker {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      input[type='color'] {
        width: 50px;
        height: 30px;
        border: none;
        cursor: pointer;
      }
      .brush-size {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Canvas 绘图应用</h1>
      <div class="canvas-container">
        <canvas id="drawingCanvas" width="800" height="400"></canvas>
      </div>
      <div class="controls">
        <button id="clear">清除</button>
        <div class="color-picker">
          <label>颜色:</label>
          <input type="color" id="color" value="#000000" />
        </div>
        <div class="brush-size">
          <label>画笔大小:</label>
          <input type="range" id="brushSize" min="1" max="20" value="2" />
          <span id="brushSizeValue">2</span>
        </div>
      </div>
    </div>
    <script>
      const canvas = document.getElementById('drawingCanvas');
      const ctx = canvas.getContext('2d');
      const clearBtn = document.getElementById('clear');
      const colorPicker = document.getElementById('color');
      const brushSize = document.getElementById('brushSize');
      const brushSizeValue = document.getElementById('brushSizeValue');
      let isDrawing = false;
      let lastX = 0;
      let lastY = 0;
      let currentColor = '#000000';
      let currentSize = 2;
      // 清除画布
      clearBtn.addEventListener('click', function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
      // 颜色选择
      colorPicker.addEventListener('input', function () {
        currentColor = this.value;
      });
      // 画笔大小
      brushSize.addEventListener('input', function () {
        currentSize = this.value;
        brushSizeValue.textContent = this.value;
      });
      // 鼠标按下事件
      canvas.addEventListener('mousedown', function (e) {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
      });
      // 鼠标移动事件
      canvas.addEventListener('mousemove', function (e) {
        if (!isDrawing) return;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        [lastX, lastY] = [e.offsetX, e.offsetY];
      });
      // 鼠标松开事件
      canvas.addEventListener('mouseup', function () {
        isDrawing = false;
      });
      // 鼠标离开事件
      canvas.addEventListener('mouseout', function () {
        isDrawing = false;
      });
    </script>
  </body>
</html>
```

### 4.3 示例 3：SVG 图标

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SVG 图标</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 2rem;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        background-color: white;
        padding: 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h1 {
        text-align: center;
        margin-bottom: 2rem;
      }
      .icons {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 2rem;
        text-align: center;
      }
      .icon {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      svg {
        width: 64px;
        height: 64px;
        margin-bottom: 1rem;
      }
      .icon-name {
        font-size: 0.9rem;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>SVG 图标示例</h1>
      <div class="icons">
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div class="icon-name">时钟</div>
        </div>
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <div class="icon-name">地图标记</div>
        </div>
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
            ></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <div class="icon-name">邮件</div>
        </div>
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
          <div class="icon-name">购物车</div>
        </div>
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div class="icon-name">用户</div>
        </div>
        <div class="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <div class="icon-name">心脏</div>
        </div>
      </div>
    </div>
  </body>
</html>
```

## 5. 最佳实践

### 5.1 音视频最佳实践

- **提供多种格式**：为视频和音频提供多种格式（如 MP4、WebM、MP3、OGG），以确保在不同浏览器中都能正常播放。
- **使用适当的编码**：使用高效的编码格式，如 H.264 视频编码和 AAC 音频编码，以减小文件大小。
- **设置合理的预加载**：根据实际需求设置 `preload` 属性，避免不必要的网络请求。
- **添加封面图**：为视频添加 `poster` 属性，提供良好的视觉体验。
- **响应式设计**：使用 CSS 使视频和音频播放器在不同设备上都能正常显示。
- **accessibility**：为音视频添加字幕和描述，提高可访问性。

### 5.2 Canvas 最佳实践

- **合理设置画布大小**：根据实际需要设置 Canvas 的 `width` 和 `height` 属性，避免过大的画布导致性能问题。
- **使用 requestAnimationFrame**：使用 `requestAnimationFrame` 进行动画，而不是 `setInterval`，以获得更好的性能。
- **保存和恢复状态**：使用 `save()` 和 `restore()` 方法管理 Canvas 状态，避免状态混乱。
- **批量绘制**：将多个绘制操作组合在一起，减少 Canvas API 调用次数。
- **使用图像缓存**：对于重复绘制的内容，可以使用离屏 Canvas 进行缓存。
- **处理高 DPI 屏幕**：通过缩放 Canvas 来适应高 DPI 屏幕，避免绘制内容模糊。

### 5.3 SVG 最佳实践

- **使用 viewBox**：使用 `viewBox` 属性使 SVG 能够自适应不同的尺寸。
- **优化路径**：简化 SVG 路径，减少节点数量，提高渲染性能。
- **使用 CSS**：使用 CSS 控制 SVG 的样式，提高可维护性。
- **使用 symbol 和 use**：对于重复使用的图形，使用 `<symbol>` 和 `<use>` 元素，减少代码冗余。
- **内联 SVG**：对于小图标，考虑内联 SVG 到 HTML 中，减少 HTTP 请求。
- **压缩 SVG**：使用工具压缩 SVG 文件，减小文件大小。

### 5.4 性能优化

- **延迟加载**：对于非关键的音视频内容，使用延迟加载技术。
- **缓存**：缓存常用的资源，减少重复加载。
- **压缩**：压缩音视频、图像等资源，减小文件大小。
- **CDN**：使用 CDN 分发静态资源，提高加载速度。
- **监控性能**：使用浏览器开发者工具监控音视频和 Canvas 的性能，及时发现和解决问题。

---

### 更新日志 (Changelog)

- 2026-04-05: 细化 Canvas 绘图基础与 SVG 对比。
- 2026-04-05: 扩写内容，增加详细的音视频支持、Canvas 绘图、SVG 绘图的概念、示例和最佳实践，以及实际应用示例。

## 延伸阅读

- [JavaScript](javascript/overview)
