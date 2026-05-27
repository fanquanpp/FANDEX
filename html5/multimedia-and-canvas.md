# HTML5 多媒体与 Canvas 绘图 (Multimedia & Canvas)
 False
 False> @Version: v3.5.0
 False
 False> @Author: Anonymous
 False> @Category: HTML5 Basics
 False> @Description: 原生音视频支持、Canvas 2D 绘图基础。 | Video, Audio, and Canvas 2D drawing.
 False
 False---
 False
 False## 目录
 False
 False1. [音视频支持](#音视频支持)
 False2. [Canvas 绘图](#canvas-绘图)
 False3. [SVG 绘图](#svg-绘图)
 False4. [实际应用示例](#实际应用示例)
 False5. [最佳实践](#最佳实践)
 False
 False---
 False
 False## 1. 音视频支持
 False
 FalseHTML5 提供了原生的音视频支持，不再需要依赖 Flash 插件，使网页能够直接播放音视频内容。
 False
 False### 1.1 视频播放
 False
 False#### 1.1.1 基本用法
 False
```html
 True<video width="640" height="360" controls poster="poster.jpg">
 True <source src="movie.mp4" type="video/mp4">
 True <source src="movie.webm" type="video/webm">
 True 您的浏览器不支持 HTML5 视频。
 True</video>
 True```

 False#### 1.1.2 常用属性
 False
 False| 属性 | 描述 | 示例 |
 False|------|------|------|
 False| `controls` | 显示视频控制条 | `<video controls>` |
 False| `autoplay` | 自动播放视频 | `<video autoplay>` |
 False| `muted` | 静音播放 | `<video muted>` |
 False| `loop` | 循环播放 | `<video loop>` |
 False| `poster` | 视频加载前显示的封面图 | `<video poster="poster.jpg">` |
 False| `preload` | 预加载设置 | `<video preload="auto">` |
 False| `width` | 视频宽度 | `<video width="640">` |
 False| `height` | 视频高度 | `<video height="360">` |
 False
 False#### 1.1.3 视频控制 API
 False
 False通过 JavaScript 可以控制视频的播放、暂停、音量等。
 False
```html
 True<video id="myVideo" width="640" height="360" controls>
 True <source src="movie.mp4" type="video/mp4">
 True 您的浏览器不支持 HTML5 视频。
 True</video>
 True
 True<div>
 True <button onclick="playVideo()">播放</button>
 True <button onclick="pauseVideo()">暂停</button>
 True <button onclick="muteVideo()">静音</button>
 True <button onclick="unmuteVideo()">取消静音</button>
 True <input type="range" id="volume" min="0" max="1" step="0.1" value="1" onchange="setVolume(this.value)">
 True <span id="volumeValue">100%</span>
 True</div>
 True
 True<script>
 True const video = document.getElementById('myVideo');
 True const volumeValue = document.getElementById('volumeValue');
 True 
 True function playVideo() {
 True video.play();
 True }
 True 
 True function pauseVideo() {
 True video.pause();
 True }
 True 
 True function muteVideo() {
 True video.muted = true;
 True }
 True 
 True function unmuteVideo() {
 True video.muted = false;
 True }
 True 
 True function setVolume(value) {
 True video.volume = value;
 True volumeValue.textContent = Math.round(value * 100) + '%';
 True }
 True 
 True // 监听视频事件
 True video.addEventListener('play', function() {
 True console.log('视频开始播放');
 True });
 True 
 True video.addEventListener('pause', function() {
 True console.log('视频暂停');
 True });
 True 
 True video.addEventListener('ended', function() {
 True console.log('视频播放结束');
 True });
 True</script>
 True```

 False### 1.2 音频播放
 False
 False#### 1.2.1 基本用法
 False
```html
 True<audio controls>
 True <source src="music.mp3" type="audio/mpeg">
 True <source src="music.ogg" type="audio/ogg">
 True 您的浏览器不支持 HTML5 音频。
 True</audio>
 True```

 False#### 1.2.2 常用属性
 False
 False| 属性 | 描述 | 示例 |
 False|------|------|------|
 False| `controls` | 显示音频控制条 | `<audio controls>` |
 False| `autoplay` | 自动播放音频 | `<audio autoplay>` |
 False| `muted` | 静音播放 | `<audio muted>` |
 False| `loop` | 循环播放 | `<audio loop>` |
 False| `preload` | 预加载设置 | `<audio preload="auto">` |
 False
 False#### 1.2.3 音频控制 API
 False
 False通过 JavaScript 可以控制音频的播放、暂停、音量等。
 False
```html
 True<audio id="myAudio">
 True <source src="music.mp3" type="audio/mpeg">
 True 您的浏览器不支持 HTML5 音频。
 True</audio>
 True
 True<div>
 True <button onclick="playAudio()">播放</button>
 True <button onclick="pauseAudio()">暂停</button>
 True <button onclick="muteAudio()">静音</button>
 True <button onclick="unmuteAudio()">取消静音</button>
 True <input type="range" id="audioVolume" min="0" max="1" step="0.1" value="1" onchange="setAudioVolume(this.value)">
 True <span id="audioVolumeValue">100%</span>
 True</div>
 True
 True<script>
 True const audio = document.getElementById('myAudio');
 True const audioVolumeValue = document.getElementById('audioVolumeValue');
 True 
 True function playAudio() {
 True audio.play();
 True }
 True 
 True function pauseAudio() {
 True audio.pause();
 True }
 True 
 True function muteAudio() {
 True audio.muted = true;
 True }
 True 
 True function unmuteAudio() {
 True audio.muted = false;
 True }
 True 
 True function setAudioVolume(value) {
 True audio.volume = value;
 True audioVolumeValue.textContent = Math.round(value * 100) + '%';
 True }
 True 
 True // 监听音频事件
 True audio.addEventListener('play', function() {
 True console.log('音频开始播放');
 True });
 True 
 True audio.addEventListener('pause', function() {
 True console.log('音频暂停');
 True });
 True 
 True audio.addEventListener('ended', function() {
 True console.log('音频播放结束');
 True });
 True</script>
 True```

 False## 2. Canvas 绘图
 False
 FalseCanvas 是 HTML5 提供的一个用于绘制图形的元素，通过 JavaScript 可以在 Canvas 上绘制各种图形、文本、图像等。
 False
 False### 2.1 基本结构
 False
```html
 True<canvas id="myCanvas" width="400" height="300" style="border:1px solid #000;"></canvas>
 True```

 False### 2.2 绘图上下文
 False
 False要在 Canvas 上绘图，首先需要获取绘图上下文：
 False
```javascript
 Trueconst canvas = document.getElementById("myCanvas");
 Trueconst ctx = canvas.getContext("2d");
 True```

 False### 2.3 基本绘图操作
 False
 False#### 2.3.1 绘制矩形
 False
```javascript
 True// 填充矩形
 Truectx.fillStyle = "#FF0000";
 Truectx.fillRect(10, 10, 150, 75);
 True
 True// 描边矩形
 Truectx.strokeStyle = "#0000FF";
 Truectx.lineWidth = 2;
 Truectx.strokeRect(200, 10, 150, 75);
 True
 True// 清除矩形区域
 Truectx.clearRect(50, 25, 50, 30);
 True```

 False#### 2.3.2 绘制路径
 False
```javascript
 True// 绘制三角形
 Truectx.beginPath();
 Truectx.moveTo(50, 150);
 Truectx.lineTo(150, 150);
 Truectx.lineTo(100, 50);
 Truectx.closePath();
 Truectx.fillStyle = "#FFFF00";
 Truectx.fill();
 Truectx.strokeStyle = "#000000";
 Truectx.lineWidth = 2;
 Truectx.stroke();
 True```

 False#### 2.3.3 绘制圆形和弧线
 False
```javascript
 True// 绘制圆形
 Truectx.beginPath();
 Truectx.arc(250, 100, 50, 0, Math.PI * 2);
 Truectx.fillStyle = "#00FF00";
 Truectx.fill();
 True
 True// 绘制弧线
 Truectx.beginPath();
 Truectx.arc(250, 200, 50, 0, Math.PI);
 Truectx.strokeStyle = "#FF00FF";
 Truectx.lineWidth = 3;
 Truectx.stroke();
 True```

 False#### 2.3.4 绘制文本
 False
```javascript
 True// 填充文本
 Truectx.font = "30px Arial";
 Truectx.fillStyle = "#000000";
 Truectx.fillText("Hello Canvas", 50, 250);
 True
 True// 描边文本
 Truectx.font = "24px Times New Roman";
 Truectx.strokeStyle = "#FF0000";
 Truectx.strokeText("Hello Canvas", 50, 290);
 True```

 False#### 2.3.5 绘制图像
 False
```javascript
 Trueconst img = new Image();
 Trueimg.src = "image.jpg";
 Trueimg.onload = function() {
 True // 绘制完整图像
 True ctx.drawImage(img, 300, 150);
 True 
 True // 绘制部分图像
 True ctx.drawImage(img, 100, 100, 50, 50, 300, 200, 50, 50);
 True};
 True```

 False### 2.4 Canvas 变换
 False
 False#### 2.4.1 平移
 False
```javascript
 Truectx.save(); // 保存当前状态
 Truectx.translate(100, 50); // 平移原点到 (100, 50)
 Truectx.fillStyle = "#FF0000";
 Truectx.fillRect(0, 0, 100, 50);
 Truectx.restore(); // 恢复之前的状态
 True```

 False#### 2.4.2 旋转
 False
```javascript
 Truectx.save();
 Truectx.translate(200, 100); // 先平移到旋转中心
 Truectx.rotate(Math.PI / 4); // 旋转 45 度
 Truectx.fillStyle = "#00FF00";
 Truectx.fillRect(-50, -25, 100, 50);
 Truectx.restore();
 True```

 False#### 2.4.3 缩放
 False
```javascript
 Truectx.save();
 Truectx.scale(1.5, 0.8); // 水平缩放 1.5 倍，垂直缩放 0.8 倍
 Truectx.fillStyle = "#0000FF";
 Truectx.fillRect(50, 150, 100, 50);
 Truectx.restore();
 True```

 False### 2.5 Canvas 动画
 False
 False通过 `requestAnimationFrame` 可以实现 Canvas 动画：
 False
```html
 True<canvas id="animationCanvas" width="400" height="300" style="border:1px solid #000;"></canvas>
 True
 True<script>
 True const canvas = document.getElementById('animationCanvas');
 True const ctx = canvas.getContext('2d');
 True 
 True let x = 0;
 True let speed = 2;
 True 
 True function animate() {
 True // 清除画布
 True ctx.clearRect(0, 0, canvas.width, canvas.height);
 True 
 True // 绘制移动的矩形
 True ctx.fillStyle = "#FF0000";
 True ctx.fillRect(x, 100, 50, 50);
 True 
 True // 更新位置
 True x += speed;
 True 
 True // 边界检测
 True if (x > canvas.width - 50 || x < 0) {
 True speed = -speed;
 True }
 True 
 True // 请求下一帧
 True requestAnimationFrame(animate);
 True }
 True 
 True // 开始动画
 True animate();
 True</script>
 True```

 False### 2.6 Canvas 交互
 False
 False通过鼠标事件可以实现 Canvas 交互：
 False
```html
 True<canvas id="interactiveCanvas" width="400" height="300" style="border:1px solid #000;"></canvas>
 True
 True<script>
 True const canvas = document.getElementById('interactiveCanvas');
 True const ctx = canvas.getContext('2d');
 True 
 True let isDrawing = false;
 True let lastX = 0;
 True let lastY = 0;
 True 
 True // 鼠标按下事件
 True canvas.addEventListener('mousedown', function(e) {
 True isDrawing = true;
 True [lastX, lastY] = [e.offsetX, e.offsetY];
 True });
 True 
 True // 鼠标移动事件
 True canvas.addEventListener('mousemove', function(e) {
 True if (!isDrawing) return;
 True 
 True ctx.beginPath();
 True ctx.moveTo(lastX, lastY);
 True ctx.lineTo(e.offsetX, e.offsetY);
 True ctx.strokeStyle = "#000000";
 True ctx.lineWidth = 2;
 True ctx.stroke();
 True 
 True [lastX, lastY] = [e.offsetX, e.offsetY];
 True });
 True 
 True // 鼠标松开事件
 True canvas.addEventListener('mouseup', function() {
 True isDrawing = false;
 True });
 True 
 True // 鼠标离开事件
 True canvas.addEventListener('mouseout', function() {
 True isDrawing = false;
 True });
 True</script>
 True```

 False## 3. SVG 绘图
 False
 FalseSVG (Scalable Vector Graphics) 是一种基于 XML 的矢量图形格式，适合绘制图标、图表等需要缩放不失真的图形。
 False
 False### 3.1 基本结构
 False
```html
 True<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
 True <!-- 绘制矩形 -->
 True <rect x="50" y="50" width="100" height="50" fill="red" stroke="black" stroke-width="2"/>
 True 
 True <!-- 绘制圆形 -->
 True <circle cx="200" cy="100" r="40" fill="green"/>
 True 
 True <!-- 绘制椭圆 -->
 True <ellipse cx="300" cy="100" rx="50" ry="30" fill="blue"/>
 True 
 True <!-- 绘制线条 -->
 True <line x1="50" y1="150" x2="150" y2="200" stroke="black" stroke-width="2"/>
 True 
 True <!-- 绘制路径 -->
 True <path d="M200,150 L250,200 L150,200 Z" fill="yellow" stroke="black" stroke-width="2"/>
 True 
 True <!-- 绘制文本 -->
 True <text x="50" y="250" font-family="Arial" font-size="20" fill="black">Hello SVG</text>
 True</svg>
 True```

 False### 3.2 SVG 与 Canvas 对比
 False
 False| 特性 | Canvas | SVG |
 False|------|--------|------|
 False| 绘图方式 | 基于像素，通过 JavaScript 绘制 | 基于矢量，使用 XML 标记 |
 False| 缩放 | 缩放会失真 | 缩放不失真 |
 False| 性能 | 适合绘制大量图形和动画 | 适合绘制少量静态图形 |
 False| 事件处理 | 需要手动实现 | 支持元素级事件 |
 False| 适用场景 | 游戏、复杂动画、数据可视化 | 图标、图表、标志 |
 False
 False## 4. 实际应用示例
 False
 False### 4.1 示例 1：视频播放器
 False
```html
 True<!DOCTYPE html>
 True<html lang="zh-CN">
 True<head>
 True <meta charset="UTF-8">
 True <meta name="viewport" content="width=device-width, initial-scale=1.0">
 True <title>视频播放器</title>
 True <style>
 True body {
 True font-family: Arial, sans-serif;
 True line-height: 1.6;
 True margin: 0;
 True padding: 2rem;
 True background-color: #f4f4f4;
 True }
 True .container {
 True max-width: 800px;
 True margin: 0 auto;
 True background-color: white;
 True padding: 2rem;
 True border-radius: 5px;
 True box-shadow: 0 2px 5px rgba(0,0,0,0.1);
 True }
 True h1 {
 True text-align: center;
 True margin-bottom: 2rem;
 True }
 True .video-container {
 True position: relative;
 True width: 100%;
 True padding-bottom: 56.25%; /* 16:9 比例 */
 True overflow: hidden;
 True margin-bottom: 1rem;
 True }
 True video {
 True position: absolute;
 True top: 0;
 True left: 0;
 True width: 100%;
 True height: 100%;
 True }
 True .controls {
 True display: flex;
 True align-items: center;
 True gap: 1rem;
 True margin-top: 1rem;
 True }
 True button {
 True padding: 0.5rem 1rem;
 True background-color: #4CAF50;
 True color: white;
 True border: none;
 True border-radius: 4px;
 True cursor: pointer;
 True }
 True button:hover {
 True background-color: #45a049;
 True }
 True input[type="range"] {
 True flex: 1;
 True }
 True </style>
 True</head>
 True<body>
 True <div class="container">
 True <h1>HTML5 视频播放器</h1>
 True <div class="video-container">
 True <video id="myVideo">
 True <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
 True 您的浏览器不支持 HTML5 视频。
 True </video>
 True </div>
 True <div class="controls">
 True <button id="playPause">播放</button>
 True <button id="mute">静音</button>
 True <input type="range" id="volume" min="0" max="1" step="0.1" value="1">
 True <span id="time">0:00 / 0:00</span>
 True </div>
 True </div>
 True 
 True <script>
 True const video = document.getElementById('myVideo');
 True const playPauseBtn = document.getElementById('playPause');
 True const muteBtn = document.getElementById('mute');
 True const volumeSlider = document.getElementById('volume');
 True const timeDisplay = document.getElementById('time');
 True 
 True // 播放/暂停按钮
 True playPauseBtn.addEventListener('click', function() {
 True if (video.paused) {
 True video.play();
 True playPauseBtn.textContent = '暂停';
 True } else {
 True video.pause();
 True playPauseBtn.textContent = '播放';
 True }
 True });
 True 
 True // 静音按钮
 True muteBtn.addEventListener('click', function() {
 True video.muted = !video.muted;
 True muteBtn.textContent = video.muted ? '取消静音' : '静音';
 True });
 True 
 True // 音量控制
 True volumeSlider.addEventListener('input', function() {
 True video.volume = this.value;
 True });
 True 
 True // 时间更新
 True video.addEventListener('timeupdate', function() {
 True const currentTime = formatTime(video.currentTime);
 True const duration = formatTime(video.duration);
 True timeDisplay.textContent = `${currentTime} / ${duration}`;
 True });
 True 
 True // 格式化时间
 True function formatTime(seconds) {
 True const minutes = Math.floor(seconds / 60);
 True seconds = Math.floor(seconds % 60);
 True return `${minutes}:${seconds.toString().padStart(2, '0')}`;
 True }
 True </script>
 True</body>
 True</html>
 True```

 False### 4.2 示例 2：Canvas 绘图应用
 False
```html
 True<!DOCTYPE html>
 True<html lang="zh-CN">
 True<head>
 True <meta charset="UTF-8">
 True <meta name="viewport" content="width=device-width, initial-scale=1.0">
 True <title>Canvas 绘图应用</title>
 True <style>
 True body {
 True font-family: Arial, sans-serif;
 True line-height: 1.6;
 True margin: 0;
 True padding: 2rem;
 True background-color: #f4f4f4;
 True }
 True .container {
 True max-width: 800px;
 True margin: 0 auto;
 True background-color: white;
 True padding: 2rem;
 True border-radius: 5px;
 True box-shadow: 0 2px 5px rgba(0,0,0,0.1);
 True }
 True h1 {
 True text-align: center;
 True margin-bottom: 2rem;
 True }
 True .canvas-container {
 True margin-bottom: 1rem;
 True }
 True canvas {
 True border: 1px solid #000;
 True cursor: crosshair;
 True }
 True .controls {
 True display: flex;
 True gap: 1rem;
 True margin-bottom: 1rem;
 True flex-wrap: wrap;
 True }
 True button {
 True padding: 0.5rem 1rem;
 True background-color: #4CAF50;
 True color: white;
 True border: none;
 True border-radius: 4px;
 True cursor: pointer;
 True }
 True button:hover {
 True background-color: #45a049;
 True }
 True .color-picker {
 True display: flex;
 True align-items: center;
 True gap: 0.5rem;
 True }
 True input[type="color"] {
 True width: 50px;
 True height: 30px;
 True border: none;
 True cursor: pointer;
 True }
 True .brush-size {
 True display: flex;
 True align-items: center;
 True gap: 0.5rem;
 True }
 True </style>
 True</head>
 True<body>
 True <div class="container">
 True <h1>Canvas 绘图应用</h1>
 True <div class="canvas-container">
 True <canvas id="drawingCanvas" width="800" height="400"></canvas>
 True </div>
 True <div class="controls">
 True <button id="clear">清除</button>
 True <div class="color-picker">
 True <label>颜色:</label>
 True <input type="color" id="color" value="#000000">
 True </div>
 True <div class="brush-size">
 True <label>画笔大小:</label>
 True <input type="range" id="brushSize" min="1" max="20" value="2">
 True <span id="brushSizeValue">2</span>
 True </div>
 True </div>
 True </div>
 True 
 True <script>
 True const canvas = document.getElementById('drawingCanvas');
 True const ctx = canvas.getContext('2d');
 True const clearBtn = document.getElementById('clear');
 True const colorPicker = document.getElementById('color');
 True const brushSize = document.getElementById('brushSize');
 True const brushSizeValue = document.getElementById('brushSizeValue');
 True 
 True let isDrawing = false;
 True let lastX = 0;
 True let lastY = 0;
 True let currentColor = '#000000';
 True let currentSize = 2;
 True 
 True // 清除画布
 True clearBtn.addEventListener('click', function() {
 True ctx.clearRect(0, 0, canvas.width, canvas.height);
 True });
 True 
 True // 颜色选择
 True colorPicker.addEventListener('input', function() {
 True currentColor = this.value;
 True });
 True 
 True // 画笔大小
 True brushSize.addEventListener('input', function() {
 True currentSize = this.value;
 True brushSizeValue.textContent = this.value;
 True });
 True 
 True // 鼠标按下事件
 True canvas.addEventListener('mousedown', function(e) {
 True isDrawing = true;
 True [lastX, lastY] = [e.offsetX, e.offsetY];
 True });
 True 
 True // 鼠标移动事件
 True canvas.addEventListener('mousemove', function(e) {
 True if (!isDrawing) return;
 True 
 True ctx.beginPath();
 True ctx.moveTo(lastX, lastY);
 True ctx.lineTo(e.offsetX, e.offsetY);
 True ctx.strokeStyle = currentColor;
 True ctx.lineWidth = currentSize;
 True ctx.lineCap = 'round';
 True ctx.lineJoin = 'round';
 True ctx.stroke();
 True 
 True [lastX, lastY] = [e.offsetX, e.offsetY];
 True });
 True 
 True // 鼠标松开事件
 True canvas.addEventListener('mouseup', function() {
 True isDrawing = false;
 True });
 True 
 True // 鼠标离开事件
 True canvas.addEventListener('mouseout', function() {
 True isDrawing = false;
 True });
 True </script>
 True</body>
 True</html>
 True```

 False### 4.3 示例 3：SVG 图标
 False
```html
 True<!DOCTYPE html>
 True<html lang="zh-CN">
 True<head>
 True <meta charset="UTF-8">
 True <meta name="viewport" content="width=device-width, initial-scale=1.0">
 True <title>SVG 图标</title>
 True <style>
 True body {
 True font-family: Arial, sans-serif;
 True line-height: 1.6;
 True margin: 0;
 True padding: 2rem;
 True background-color: #f4f4f4;
 True }
 True .container {
 True max-width: 800px;
 True margin: 0 auto;
 True background-color: white;
 True padding: 2rem;
 True border-radius: 5px;
 True box-shadow: 0 2px 5px rgba(0,0,0,0.1);
 True }
 True h1 {
 True text-align: center;
 True margin-bottom: 2rem;
 True }
 True .icons {
 True display: grid;
 True grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
 True gap: 2rem;
 True text-align: center;
 True }
 True .icon {
 True display: flex;
 True flex-direction: column;
 True align-items: center;
 True }
 True svg {
 True width: 64px;
 True height: 64px;
 True margin-bottom: 1rem;
 True }
 True .icon-name {
 True font-size: 0.9rem;
 True color: #666;
 True }
 True </style>
 True</head>
 True<body>
 True <div class="container">
 True <h1>SVG 图标示例</h1>
 True <div class="icons">
 True <div class="icon">
 True <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 True <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
 True <polyline points="22 4 12 14.01 9 11.01"></polyline>
 True </svg>
 True <div class="icon-name">时钟</div>
 True </div>
 True <div class="icon">
 True <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 True <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
 True <circle cx="12" cy="10" r="3"></circle>
 True </svg>
 True <div class="icon-name">地图标记</div>
 True </div>
 True <div class="icon">
 True <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 True <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
 True <polyline points="22,6 12,13 2,6"></polyline>
 True </svg>
 True <div class="icon-name">邮件</div>
 True </div>
 True <div class="icon">
 True <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 True <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
 True <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
 True <line x1="6" y1="1" x2="6" y2="4"></line>
 True <line x1="10" y1="1" x2="10" y2="4"></line>
 True <line x1="14" y1="1" x2="14" y2="4"></line>
 True </svg>
 True <div class="icon-name">购物车</div>
 True </div>
 True <div class="icon">
 True <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 True <circle cx="12" cy="12" r="10"></circle>
 True <line x1="12" y1="8" x2="12" y2="12"></line>
 True <line x1="12" y1="16" x2="12.01" y2="16"></line>
 True </svg>
 True <div class="icon-name">用户</div>
 True </div>
 True <div class="icon">
 True <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 True <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
 True </svg>
 True <div class="icon-name">心脏</div>
 True </div>
 True </div>
 True </div>
 True</body>
 True</html>
 True```

 False## 5. 最佳实践
 False
 False### 5.1 音视频最佳实践
 False
 False- **提供多种格式**：为视频和音频提供多种格式（如 MP4、WebM、MP3、OGG），以确保在不同浏览器中都能正常播放。
 False- **使用适当的编码**：使用高效的编码格式，如 H.264 视频编码和 AAC 音频编码，以减小文件大小。
 False- **设置合理的预加载**：根据实际需求设置 `preload` 属性，避免不必要的网络请求。
 False- **添加封面图**：为视频添加 `poster` 属性，提供良好的视觉体验。
 False- **响应式设计**：使用 CSS 使视频和音频播放器在不同设备上都能正常显示。
 False- **accessibility**：为音视频添加字幕和描述，提高可访问性。
 False
 False### 5.2 Canvas 最佳实践
 False
 False- **合理设置画布大小**：根据实际需要设置 Canvas 的 `width` 和 `height` 属性，避免过大的画布导致性能问题。
 False- **使用 requestAnimationFrame**：使用 `requestAnimationFrame` 进行动画，而不是 `setInterval`，以获得更好的性能。
 False- **保存和恢复状态**：使用 `save()` 和 `restore()` 方法管理 Canvas 状态，避免状态混乱。
 False- **批量绘制**：将多个绘制操作组合在一起，减少 Canvas API 调用次数。
 False- **使用图像缓存**：对于重复绘制的内容，可以使用离屏 Canvas 进行缓存。
 False- **处理高 DPI 屏幕**：通过缩放 Canvas 来适应高 DPI 屏幕，避免绘制内容模糊。
 False
 False### 5.3 SVG 最佳实践
 False
 False- **使用 viewBox**：使用 `viewBox` 属性使 SVG 能够自适应不同的尺寸。
 False- **优化路径**：简化 SVG 路径，减少节点数量，提高渲染性能。
 False- **使用 CSS**：使用 CSS 控制 SVG 的样式，提高可维护性。
 False- **使用 symbol 和 use**：对于重复使用的图形，使用 `<symbol>` 和 `<use>` 元素，减少代码冗余。
 False- **内联 SVG**：对于小图标，考虑内联 SVG 到 HTML 中，减少 HTTP 请求。
 False- **压缩 SVG**：使用工具压缩 SVG 文件，减小文件大小。
 False
 False### 5.4 性能优化
 False
 False- **延迟加载**：对于非关键的音视频内容，使用延迟加载技术。
 False- **缓存**：缓存常用的资源，减少重复加载。
 False- **压缩**：压缩音视频、图像等资源，减小文件大小。
 False- **CDN**：使用 CDN 分发静态资源，提高加载速度。
 False- **监控性能**：使用浏览器开发者工具监控音视频和 Canvas 的性能，及时发现和解决问题。
 False
 False---
 False
 False### 更新日志 (Changelog)
 False
 False- 2026-04-05: 细化 Canvas 绘图基础与 SVG 对比。
 False- 2026-04-05: 扩写内容，增加详细的音视频支持、Canvas 绘图、SVG 绘图的概念、示例和最佳实践，以及实际应用示例。

## 延伸阅读

- [[javascript/overview|JavaScript]]
 False