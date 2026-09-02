---
order: 130
title: HTML5 多媒体与 Canvas 绘图
module: 'html5'
category: 前端技术
difficulty: intermediate
description: audio/video 元素、Canvas API 与 SVG 基础。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'html5/011-Accessibility'
  - 'html5/012-HTML5FormValidation'
  - 'html5/014-DocTypeDeclaration'
  - 'html5/015-HTML5OfflineStorageWebAPI'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---

> 前置依赖：Canvas 部分需要 JavaScript 基础。速通路径：先做第 0 节与 3.3.6“画一个笑脸”；3.4 变换与 3.6 交互为进阶内容，可先跳过。

## 0. 为什么需要学这些？——生活中的“网页多媒体”

你在网页上看过视频、听过音乐、画过画吗？

- 你在 B 站看视频，用的是 `<video>` 标签；
- 你在音乐网站听歌，用的是 `<audio>` 标签；
- 你玩过“你画我猜”之类的在线白板，用的是 `<canvas>` 画布；
- 网页上的小图标（比如搜索图标），用的是 SVG。

这节课的目标：学会在网页里“放视频、播音乐、画图形”。你会发现，HTML 不只是“写文字和链接”，它还能做很多有趣的事。

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

**讲解：**

- `<video>` 的 `width`/`height` 预先占位，`controls` 显示原生控制条，`poster` 是加载前的封面图；
- 多个 `<source>` 让浏览器按顺序尝试不同格式，直到找到可播放的为止；
- 标签之间的文字是兜底提示：浏览器完全不支持视频时才显示。

为什么写了多个 `<source>`？不同浏览器支持的视频格式不一样，就像有的人喜欢 MP3、有的人喜欢 FLAC——浏览器也有各自的“偏好”。写多个 `<source>` 就是让浏览器自己挑一个它能播的，保证所有用户都能正常播放（MP4 覆盖最广，WebM 体积更小，通常把 MP4 写在最前面）。

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

**讲解：**

- `play()`/`pause()` 控制播放，`muted` 与 `volume` 控制声音，`currentTime` 可读写播放位置；
- 音量滑块的取值范围是 0 到 1，示例把值换算成百分比显示；
- 自定义控制按钮的 `onclick` 只是演示，正式项目推荐用 `addEventListener` 绑定。

### 1.2 音频播放

#### 1.2.1 基本用法

```html
<audio controls>
  <source src="music.mp3" type="audio/mpeg" />
  <source src="music.ogg" type="audio/ogg" />
  您的浏览器不支持 HTML5 音频。
</audio>
```

**讲解：**

- `<audio>` 与 `<video>` 的标签结构一致，只是没有画面；
- `controls` 属性直接提供播放/暂停与音量控制，无需任何脚本；
- `preload` 属性（`auto`/`metadata`/`none`）可控制音频资源的预加载策略。

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

**讲解：**

- 音频 API 与视频 API 基本同构：`play`/`pause`/`muted`/`volume` 通用；
- 音量滑块的取值范围是 0 到 1，示例把当前值换算成百分比显示；
- 自动播放通常被浏览器拦截，必须结合用户手势调用 `play()`。

## 2. SVG 绘图

SVG (Scalable Vector Graphics) 是一种基于 XML 的矢量图形格式，适合绘制图标、图表等需要缩放不失真的图形。

### 2.1 基本结构

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

**讲解：**

- SVG 用 XML 标签描述矢量图形，`<rect>`、`<circle>`、`<ellipse>`、`<line>` 对应基本形状；
- `fill` 设置填充色，`stroke` 与 `stroke-width` 设置描边；
- `<path>` 的 `d` 属性用命令描述路径：`M` 移动、`L` 连线、`Z` 闭合；
- SVG 是文档结构的一部分，可被 CSS 与 JavaScript 直接操作，与 Canvas 的“像素绘制”不同。

### 2.2 SVG 与 Canvas 对比

| 特性     | Canvas                         | SVG                     |
| -------- | ------------------------------ | ----------------------- |
| 绘图方式 | 基于像素，通过 JavaScript 绘制 | 基于矢量，使用 XML 标记 |
| 缩放     | 缩放会失真                     | 缩放不失真              |
| 性能     | 适合绘制大量图形和动画         | 适合绘制少量静态图形    |
| 事件处理 | 需要手动实现                   | 支持元素级事件          |
| 适用场景 | 游戏、复杂动画、数据可视化     | 图标、图表、标志        |

## 3. Canvas 绘图

Canvas 是 HTML5 提供的一个用于绘制图形的元素，通过 JavaScript 可以在 Canvas 上绘制各种图形、文本、图像等。

### 3.1 基本结构

```html
<canvas id="myCanvas" width="400" height="300" style="border:1px solid #000;"></canvas>
```

**讲解：**

- `<canvas>` 本身只是一个矩形画布，绘图能力全部来自 JavaScript；
- `width`/`height` 是画布的像素尺寸，CSS 尺寸只负责显示缩放；
- 标签内可写兜底文字，供不支持 Canvas 的浏览器显示。

> 新手常见坑：`<canvas>` 的 `width`/`height` 是画布像素尺寸，CSS 的 `width`/`height` 是显示尺寸。
>
> ```html
> <!-- 正确：画布 400x300，显示也是 400x300 -->
> <canvas width="400" height="300"></canvas>
>
> <!-- 错误：画布默认 300x150，CSS 强行拉大后会模糊 -->
> <canvas style="width:400px;height:300px;"></canvas>
> ```
>
> 如果画布内容和显示尺寸不一致，图形会模糊或拉伸。记住：用 `width`/`height` 属性控制画布大小，不要用 CSS 控制。

### 3.2 绘图上下文

要在 Canvas 上绘图，首先需要获取绘图上下文：

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
```

**讲解：**

- `getElementById` 拿到画布元素，`getContext('2d')` 获取 2D 绘图上下文；
- 上下文对象 `ctx` 集中了所有绘图方法（矩形、路径、文本、图像等）；
- 需要 3D 时改用 `getContext('webgl')` 或 `getContext('webgl2')`。

### 3.3 基本绘图操作

#### 3.3.1 绘制矩形

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

**讲解：**

- `fillRect` 填充矩形，`strokeRect` 描边矩形，`clearRect` 清空指定区域；
- `fillStyle`/`strokeStyle` 设置填充与描边颜色，`lineWidth` 设置线条宽度；
- 三者组合可实现“绘制-更新-清除”的画板基础逻辑。

#### 3.3.2 绘制路径

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

**讲解：**

- 路径绘制四步：`beginPath()` 开始新路径、`moveTo()` 移动起点、`lineTo()` 连线、`closePath()` 闭合；
- `fill()` 填充路径内部，`stroke()` 只描边路径本身；
- 不调用 `beginPath()` 时，新路径会与旧路径叠加，容易画出意外图形。

#### 3.3.3 绘制圆形和弧线

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

**讲解：**

- `arc(x, y, r, startAngle, endAngle)` 中角度使用弧度制，`Math.PI * 2` 表示完整圆，`Math.PI` 表示半圆；
- 弧度从 3 点钟方向开始顺时针增长；
- 绘制完弧线后必须调用 `fill()` 或 `stroke()`，图形才会真正显示。

#### 3.3.4 绘制文本

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

**讲解：**

- `font` 使用 CSS 字体简写语法，`fillText` 填充文本，`strokeText` 描边文本；
- `textAlign` 控制文本在指定坐标上的对齐方式（left/center/right）；
- 文本基线由 `textBaseline` 控制，多行文本需要逐行计算 `y` 坐标。

#### 3.3.5 绘制图像

```javascript
const img = new Image();
img.src = 'image.jpg';
img.onload = function () {
  // 绘制完整图像
  ctx.drawImage(img, 300, 150);
  // 绘制部分图像
  ctx.drawImage(img, 100, 100, 50, 50, 300, 200, 50, 50);
};
```

**讲解：**

- `new Image()` 创建图片对象，`src` 赋值后异步加载；
- `drawImage` 必须在 `onload` 回调中调用，否则图片尚未解码；
- 9 参数版本 `drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` 可从原图裁剪区域后绘制到目标位置。

#### 3.3.6 试试看：画一个笑脸

把前面学的圆、弧线和填充组合起来，画一个完整的“作品”：

```html
<canvas id="smileCanvas" width="200" height="200"></canvas>
<script>
  const canvas = document.getElementById('smileCanvas');
  const ctx = canvas.getContext('2d');

  // 画脸（圆形）
  ctx.beginPath();
  ctx.arc(100, 100, 80, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD700';
  ctx.fill();
  ctx.stroke();

  // 画眼睛（两个小圆）
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(70, 80, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(130, 80, 8, 0, Math.PI * 2);
  ctx.fill();

  // 画嘴巴（弧线）
  ctx.beginPath();
  ctx.arc(100, 100, 40, 0, Math.PI);
  ctx.stroke();
</script>
```

**讲解：**

- 每个图形绘制前都调用 `beginPath()`，避免与上一个图形的路径粘连；
- 填充用 `fill()`，描边用 `stroke()`，同一个圆可以先填充再描边；
- 嘴巴只用上半圆（`0` 到 `Math.PI`），所以看起来在“笑”。

### 3.4 Canvas 变换

#### 3.4.1 平移

```javascript
ctx.save(); // 保存当前状态
ctx.translate(100, 50); // 平移原点到 (100, 50)
ctx.fillStyle = '#FF0000';
ctx.fillRect(0, 0, 100, 50);
ctx.restore(); // 恢复之前的状态
```

**讲解：**

- `translate(x, y)` 移动坐标系原点，之后绘制的图形都相对新原点定位；
- `save()` 保存当前状态（变换、样式），`restore()` 恢复，避免变换互相污染；
- 记住“先 `save`，变换，再 `restore`”是 Canvas 变换的标准姿势。

#### 3.4.2 旋转

```javascript
ctx.save();
ctx.translate(200, 100); // 先平移到旋转中心
ctx.rotate(Math.PI / 4); // 旋转 45 度
ctx.fillStyle = '#00FF00';
ctx.fillRect(-50, -25, 100, 50);
ctx.restore();
```

**讲解：**

- `rotate(angle)` 绕当前原点旋转，角度使用弧度制，`Math.PI / 4` 即 45 度；
- 通常先 `translate` 到旋转中心，再 `rotate`，最后在局部坐标中绘制；
- 示例中图形以自身中心（`-50, -25` 偏移）为轴旋转，而不是画布原点。

#### 3.4.3 缩放

```javascript
ctx.save();
ctx.scale(1.5, 0.8); // 水平缩放 1.5 倍，垂直缩放 0.8 倍
ctx.fillStyle = '#0000FF';
ctx.fillRect(50, 150, 100, 50);
ctx.restore();
```

**讲解：**

- `scale(sx, sy)` 水平与垂直分别缩放，会影响之后所有绘制的尺寸；
- 缩放会同步影响线宽与坐标，`save`/`restore` 可以隔离影响范围；
- 负值缩放可镜像图形，但较少直接使用。

### 3.5 Canvas 动画

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

**讲解：**

- `requestAnimationFrame` 让回调在下一帧渲染前执行，是 Canvas 动画的推荐驱动；
- 动画循环模式：清除画布、更新位置、重绘图形、再请求下一帧；
- 示例中的边界检测让方块碰到左右边缘后反向移动，形成来回弹跳效果；
- 与 `setInterval` 相比，它跟随屏幕刷新率并自动暂停于后台标签页，节省资源。

### 3.6 Canvas 交互

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

**讲解：**

- 通过 `mousedown`/`mousemove`/`mouseup` 事件记录与更新鼠标坐标；
- `offsetX`/`offsetY` 给出相对画布左上角的坐标，无需额外换算；
- “按下开始画、移动画线、松开停止”是白板类应用的最小交互模型；
- `mouseout` 时复位绘制状态，避免鼠标移出画布后仍持续画线。

## 4. 实际应用示例

### 4.1 示例 1：视频播放器

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>视频播放器</title>
    <!-- 样式将在后续 CSS 课程中学习，本示例只保留结构与交互逻辑 -->
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

**代码结构解析：**

（1）HTML 结构：`<video>` 承载媒体，按钮组与进度条构成自定义控制条；

（2）控制逻辑：播放/暂停/静音/音量按钮分别调用视频 API，`currentTime` 与 `duration` 驱动进度显示；

（3）事件驱动：`timeupdate` 事件在播放过程中频繁触发，用于同步进度条位置；

（4）样式部分属于 CSS 课程，本课只需理解结构与控制 API 的配合。

### 4.2 示例 2：Canvas 绘图应用

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Canvas 绘图应用</title>
    <!-- 样式将在后续 CSS 课程中学习，本示例只保留结构与交互逻辑 -->
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

**代码结构解析：**

（1）画布初始化：获取 `canvas` 与 2D 上下文，设置画笔颜色与线宽；

（2）交互协议：`mousedown` 开始绘制、`mousemove` 画线、`mouseup` 结束，`offsetX`/`offsetY` 提供画布内坐标；

（3）颜色选择：多个色块按钮通过点击事件切换当前画笔颜色；

（4）清除画布：`clearRect` 清空全部像素，实现“新建画布”功能。

### 4.3 示例 3：SVG 图标

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SVG 图标</title>
    <!-- 样式将在后续 CSS 课程中学习，本示例只保留结构与交互逻辑 -->
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

**代码结构解析：**

（1）SVG 图标以 `<svg>` 为根，内部用 `<path>`、`<circle>` 等基本形状组合出图标；

（2）`viewBox` 定义内部坐标系，让图标在任意尺寸下等比缩放；

（3）图标作为文档元素可直接被 CSS 控制颜色与尺寸，无需重新生成图片；

（4）`<use>` 或 JavaScript 模板可复用同一图标，避免重复粘贴代码。

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

## 8. 进阶知识点

### 8.1 Canvas 图像导出

```javascript
// 转为 data URL（可直接作为图片地址）
const dataURL = canvas.toDataURL('image/png');
const jpegURL = canvas.toDataURL('image/jpeg', 0.9); // 0-1 控制质量

// 转为 Blob，并触发下载
canvas.toBlob((blob) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'canvas.png';
  a.click();
  URL.revokeObjectURL(url);
}, 'image/png');
```

**讲解：**

- `toDataURL` 把画布内容编码为 base64 字符串，适合预览与保存到 LocalStorage；
- `toBlob` 生成二进制文件对象，配合临时 URL 可触发浏览器下载；
- 导出内容受“画布污染”限制：跨域图片未加 CORS 响应头时导出会抛错。

### 8.2 WebGL 上下文

```javascript
const canvas = document.getElementById('myCanvas');
const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
```

**讲解：**

- `webgl`/`webgl2` 上下文提供 GPU 加速的 3D 与高性能 2D 绘制；
- WebGL 需要着色器（Shader）与缓冲区管理，复杂度远高于 2D 上下文；
- 项目需要 3D 时，通常直接使用 Three.js 等库，而不是手写 WebGL。

### 8.3 Web Audio API

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 创建振荡器（音源）
const oscillator = audioCtx.createOscillator();
oscillator.type = 'sine'; // sine/square/sawtooth/triangle
oscillator.frequency.value = 440; // 频率，单位 Hz

// 创建增益节点（音量）
const gainNode = audioCtx.createGain();
gainNode.gain.value = 0.5;

// 节点串联：音源 -> 增益 -> 扬声器
oscillator.connect(gainNode);
gainNode.connect(audioCtx.destination);

oscillator.start();
oscillator.stop(audioCtx.currentTime + 2); // 2 秒后停止
```

**讲解：**

- Web Audio 采用“节点图”架构：音源节点经过效果节点，最终连接到 `destination`（扬声器）；
- `OscillatorNode` 生成基础波形，`GainNode` 控制音量，两者可自由组合；
- `AudioContext` 必须由用户手势触发创建或恢复，浏览器不允许页面自动发声。

### 8.4 Canvas 与 SVG 选型对比

> 注：本表与 2.2 节“SVG 与 Canvas 对比”重复，初学者只看 2.2 节即可；此处保留供复习速查。

| 特性 | Canvas | SVG |
| --- | --- | --- |
| 绘图方式 | 基于像素，JavaScript 绘制 | 基于矢量，XML 标记 |
| 缩放 | 缩放会失真 | 缩放不失真 |
| 性能 | 适合大量图形和动画 | 适合少量静态图形 |
| 事件处理 | 需手动实现 | 每个图形都是 DOM 元素，支持事件 |
| 适用场景 | 游戏、复杂动画、数据可视化 | 图标、图表、标志 |

## 9. 核心知识点

- 音视频：`<video>`/`<audio>` + `<source>` 多格式降级，`controls`/`autoplay`/`muted`/`poster` 属性，`play()`/`pause()`/`currentTime`/`volume` API；
- SVG：矢量、可缩放，每个图形都是文档元素，用 XML 标签描述，与 Canvas 按场景选型；
- Canvas：`getContext('2d')` 获取上下文，`fillRect`/路径/`arc`/文本/`drawImage` 完成绘制；
- Canvas 变换：`translate`/`rotate`/`scale` 配合 `save()`/`restore()` 使用；
- 动画：`requestAnimationFrame` 循环“清除-更新-重绘”，比 `setInterval` 更省资源；
- 交互：鼠标事件 + 坐标换算实现画板类应用；

## 10. 动手试试

### 入门版（必做）

1. 用 `<video>` 嵌入一段本地视频，设置 `controls` 与 `poster`；
2. 在 Canvas 上依次绘制一个矩形、一个圆形和一行文字；
3. 用 `requestAnimationFrame` 让圆形在画布内左右弹跳。

### 进阶版（选做）

1. 实现一个“签名板”：鼠标按下开始书写、移动画线、松开停止，并提供“清空”按钮；
2. 用 `toBlob` 把签名导出为 PNG 并触发下载；
3. 用 SVG 重画一个你喜欢的简单图标，并尝试用 CSS 改变它的颜色。

## 11. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记 `beginPath()` | 新旧路径叠加，画出意外图形 | 每组图形绘制前调用 `beginPath()` |
| 图片未加载就绘制 | `drawImage` 在 `onload` 前调用无效 | 在 `img.onload` 回调中绘制 |
| 变换未恢复 | `translate`/`rotate` 影响后续所有绘制 | 用 `save()`/`restore()` 成对包裹 |
| 自动播放被拦截 | 浏览器不允许无手势自动发声 | 由用户点击事件触发 `play()` |
| Canvas 导出失败 | 跨域图片污染画布 | 图片服务器开启 CORS，或用同源资源 |
| 高频动画用 `setInterval` | 掉帧、后台仍运行 | 改用 `requestAnimationFrame` |
| 大量静态图标用 Canvas | 每个图形都要手写事件，成本高 | 改用 SVG 或图标字体 |

## 12. 扩展学习

- Canvas 进阶：`javascript/014-HigherOrderFunction` 理解回调与动画循环的配合；
- WebGL 与 3D：`css/061-CSSCanvasDrawing` 与 Three.js 官方示例；
- 音视频进阶：Web Audio 节点图、MediaSource 流式播放；
- 性能：`html5/037-CriticalRenderingPathAndResourceLoading` 中媒体资源加载策略；
- 工程实践：图片懒加载与 `loading="lazy"` 的组合使用。
