---
order: 200
title: 音频与视频
module: 'html5'
category: 前端技术
difficulty: intermediate
description: audio、video、source、track字幕
author: fanquanpp
updated: '2026-09-13'
related:
  - 'html5/130-LinksAndAnchors'
  - 'html5/140-ImagesAndResponsiveImages'
  - 'html5/210-SVG'
  - 'html5/220-EmbeddedContent'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [HTML5 概述与核心特性](/html5/020-HTML5OverviewCoreFeature)

> 前置要求：本节主体是纯 HTML 标签（audio/video/source/track），零基础可直接学；涉及播放控制的 JavaScript 示例（play/pause、timeupdate 等事件）需要 JS 基础，建议先完成 `javascript/001`-`005` 与 `javascript/039`（DOM 与事件）后再读。纯 HTML 阶段可先跳过这些代码块，不影响理解标签本身。

## 1. audio 元素

```html
<audio src="music.mp3" controls></audio>
<audio controls>
  <source src="music.mp3" type="audio/mpeg" />
  <source src="music.ogg" type="audio/ogg" />
</audio>
```

| 属性       | 说明                     |
| ---------- | ------------------------ |
| `controls` | 显示播放控件             |
| `autoplay` | 自动播放（需配合 muted） |
| `loop`     | 循环播放                 |
| `muted`    | 静音                     |
| `preload`  | none/metadata/auto       |

```javascript
const audio = document.querySelector('audio');
audio.play();
audio.pause();
audio.currentTime = 30;
audio.volume = 0.5;
```

## 2. video 元素

```html
<video controls width="640" height="360" poster="cover.jpg" playsinline>
  <source src="movie.mp4" type="video/mp4" />
  <source src="movie.webm" type="video/webm" />
</video>
```

```javascript
const video = document.querySelector('video');
await video.play();
video.requestFullscreen();
await video.requestPictureInPicture();
```

## 3. track 字幕

```vtt
WEBVTT

00:00:01.000 --> 00:00:04.000
欢迎观看本教程

00:00:05.000 --> 00:00:08.000
今天我们学习 HTML5 视频
```

```html
<video controls>
  <source src="movie.mp4" type="video/mp4" />
  <track kind="subtitles" src="subs/zh.vtt" srclang="zh" label="中文" />
  <track kind="subtitles" src="subs/en.vtt" srclang="en" label="English" default />
</video>
```

| kind 值     | 说明             |
| ----------- | ---------------- |
| `subtitles` | 字幕（翻译）     |
| `captions`  | 说明文字（听障） |
| `chapters`  | 章节标题         |

## 4. 自动播放策略

浏览器对自动播放有明确限制，完整策略表与代码示例见下文「自动播放策略」速查节。核心结论：有声视频默认被禁止，`muted` 静音视频与用户已交互后的 `play()` 调用被允许。

## audio 音频元素

**音频基础**
`<audio src="<URL>" [controls] [autoplay] [loop] [muted] [preload]>[回退内容]</audio>`
```html
<!-- 简单音频 -->
<audio src="music.mp3" controls></audio>

<!-- 多格式回退 -->
<audio controls>
  <source src="music.mp3" type="audio/mpeg" />
  <source src="music.ogg" type="audio/ogg" />
  您的浏览器不支持音频元素。
</audio>
```

| 属性       | 说明                     | 示例                       |
| ---------- | ------------------------ | -------------------------- |
| `src`      | 音频源 URL               | `src="music.mp3"`          |
| `controls` | 显示播放控件             | `controls`                 |
| `autoplay` | 自动播放(需配合 muted)   | `autoplay muted`           |
| `loop`     | 循环播放                 | `loop`                     |
| `muted`    | 静音                     | `muted`                    |
| `preload`  | 预加载 none/metadata/auto| `preload="metadata"`       |

**音频格式**

| 格式   | MIME 类型       | 浏览器支持            |
| ------ | --------------- | --------------------- |
| MP3    | audio/mpeg      | 全部                  |
| OGG    | audio/ogg       | 除 Safari iOS 外      |
| WAV    | audio/wav       | 全部(文件较大)        |
| AAC    | audio/aac       | 全部                  |
| FLAC   | audio/flac      | 除 IE 外              |

---

## video 视频元素

**视频基础**
`<video src="<URL>" [controls] [autoplay] [loop] [muted] [poster="<封面>"] [width] [height] [preload] [playsinline]>[回退内容]</video>`
```html
<!-- 基础视频 -->
<video src="movie.mp4" controls width="640" height="360"></video>

<!-- 完整配置 -->
<video
  controls
  autoplay
  muted
  loop
  poster="cover.jpg"
  width="640"
  height="360"
  playsinline
  preload="metadata"
>
  <source src="movie.mp4" type="video/mp4" />
  <source src="movie.webm" type="video/webm" />
  <track kind="subtitles" src="subs.vtt" srclang="zh" label="中文" default />
  您的浏览器不支持视频元素。
</video>
```

| 属性         | 说明                   | 示例                          |
| ------------ | ---------------------- | ----------------------------- |
| `src`        | 视频源 URL             | `src="movie.mp4"`             |
| `controls`   | 显示控制条             | `controls`                    |
| `autoplay`   | 自动播放               | `autoplay muted`              |
| `muted`      | 静音                   | `muted`                       |
| `loop`       | 循环播放               | `loop`                        |
| `poster`     | 封面图 URL             | `poster="cover.jpg"`          |
| `preload`    | 预加载 none/metadata/auto | `preload="auto"`           |
| `width`      | 宽度                   | `width="640"`                 |
| `height`     | 高度                   | `height="360"`                |
| `playsinline`| 内联播放(防 iOS 全屏)  | `playsinline`                 |
| `controlslist` | 控制条按钮定制       | `controlslist="nodownload"`   |
| `disablepictureinpicture` | 禁用画中画  | `disablepictureinpicture`     |
| `crossorigin`| 跨域设置              | `crossorigin="anonymous"`     |

**视频格式**

| 格式  | MIME 类型   | 视频编码    | 浏览器支持            |
| ----- | ----------- | ----------- | --------------------- |
| MP4   | video/mp4   | H.264       | 全部                  |
| WebM  | video/webm  | VP8/VP9     | 除 Safari 外          |
| OGG   | video/ogg   | Theora      | 除 Safari 外          |
| AV1   | video/mp4   | AV1         | Chrome、Firefox       |
| HLS   | application/vnd.apple.mpegurl | H.264 | Safari 原生,其他需 hls.js |

---

## source 元素

**多源回退**
`<source src="<URL>" type="<MIME>" [media="<媒体查询>"] [sizes] [srcset] />`
```html
<video controls>
  <source src="movie.av1.mp4" type="video/mp4; codecs=av01.0.05M.08" />
  <source src="movie.webm" type="video/webm; codecs=vp9" />
  <source src="movie.h264.mp4" type="video/mp4; codecs=avc1.4d401e" />
  您的浏览器不支持视频。
</video>
```

---

## track 字幕元素

**文本轨道**
`<track kind="<类型>" src="<VTT文件>" srclang="<语言>" label="<标签>" [default] />`
```html
<video controls>
  <source src="movie.mp4" type="video/mp4" />
  <track kind="subtitles" src="subs/zh.vtt" srclang="zh" label="中文" default />
  <track kind="subtitles" src="subs/en.vtt" srclang="en" label="English" />
  <track kind="captions" src="caps/en.vtt" srclang="en" label="English Captions" />
  <track kind="chapters" src="chapters.vtt" srclang="en" label="章节" />
</video>
```

| kind 值       | 说明                       |
| ------------- | -------------------------- |
| `subtitles`   | 字幕(翻译)                 |
| `captions`    | 说明文字(听障,含音效)      |
| `descriptions`| 视频描述(视障)             |
| `chapters`    | 章节标题                   |
| `metadata`    | 元数据(脚本用)             |

**WebVTT 文件格式**
```vtt
WEBVTT

00:00:01.000 --> 00:00:04.000
欢迎观看本教程

00:00:05.000 --> 00:00:08.000
今天我们学习 HTML5 视频

NOTE 这是注释

00:00:09.000 --> 00:00:12.000 align=start position:10%
带样式的字幕
```

---

## JavaScript 控制 API

**HTMLMediaElement API**
```javascript
const video = document.querySelector('video');
const audio = document.querySelector('audio');

// 播放控制
video.play();              // 播放(返回 Promise)
video.pause();             // 暂停
video.load();              // 重新加载

// 属性
video.currentTime;         // 当前播放时间(秒)
video.duration;            // 总时长(秒)
video.volume;              // 音量 0-1
video.muted;               // 是否静音
video.playbackRate;        // 播放速度(1.0 正常)
video.preservesPitch;      // 保持音调
video.loop;                // 是否循环
video.autoplay;            // 是否自动播放
video.controls;            // 是否显示控件
video.paused;              // 是否暂停
video.ended;               // 是否播放结束
video.seeking;             // 是否在跳转
video.buffered;            // 已缓冲区间
video.readyState;          // 就绪状态 0-4
video.networkState;        // 网络状态
video.error;               // 错误对象

// 设置
video.currentTime = 30;    // 跳转到 30 秒
video.volume = 0.5;        // 音量 50%
video.playbackRate = 1.5;  // 1.5 倍速
video.muted = true;        // 静音
```

**特殊 API**
```javascript
// 全屏
await video.requestFullscreen();
await document.exitFullscreen();

// 画中画
await video.requestPictureInPicture();
await document.exitPictureInPicture();

// 截图(需同源或 crossorigin)
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
canvas.getContext('2d').drawImage(video, 0, 0);
const dataURL = canvas.toDataURL('image/png');

// 录制(MediaRecorder)
const stream = video.captureStream();
const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
```

---

## 媒体事件

**媒体事件监听**
`element.addEventListener('<事件>', handler)`
```javascript
video.addEventListener('loadstart', () => console.log('开始加载'));
video.addEventListener('loadedmetadata', () => console.log('元数据已加载'));
video.addEventListener('loadeddata', () => console.log('数据已加载'));
video.addEventListener('canplay', () => console.log('可以播放'));
video.addEventListener('canplaythrough', () => console.log('可流畅播放'));
video.addEventListener('play', () => console.log('开始播放'));
video.addEventListener('playing', () => console.log('播放中'));
video.addEventListener('pause', () => console.log('已暂停'));
video.addEventListener('ended', () => console.log('播放结束'));
video.addEventListener('timeupdate', () => console.log(video.currentTime));
video.addEventListener('progress', () => console.log('加载进度'));
video.addEventListener('volumechange', () => console.log('音量变化'));
video.addEventListener('ratechange', () => console.log('速度变化'));
video.addEventListener('seeking', () => console.log('跳转中'));
video.addEventListener('seeked', () => console.log('跳转完成'));
video.addEventListener('waiting', () => console.log('缓冲中'));
video.addEventListener('error', (e) => console.log('错误', video.error));
```

---

## 自动播放策略

| 条件               | 是否允许自动播放 |
| ------------------ | ---------------- |
| 有声视频(默认)     | 通常被禁止       |
| 静音视频 muted     | 允许             |
| 用户已与页面交互   | 允许             |
| 已被用户授权       | 允许             |

```javascript
// 安全的自动播放
const video = document.querySelector('video');
video.muted = true;
video.play().then(() => {
  console.log('自动播放成功');
}).catch((err) => {
  console.log('自动播放被拒绝,需要用户交互');
  document.body.addEventListener('click', () => {
    video.play();
  }, { once: true });
});
```

## 自定义播放控制：按钮组与事件联动

原生 `controls` 控件样式不可定制时，用媒体 API 自己搭控制条。视频与音频的 API 完全同构（`play`/`pause`/`muted`/`volume` 通用），下面以视频为例：

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
  <input type="range" id="volume" min="0" max="1" step="0.1" value="1" onchange="setVolume(this.value)" />
  <span id="volumeValue">100%</span>
</div>
<script>
  const video = document.getElementById('myVideo');
  const volumeValue = document.getElementById('volumeValue');

  function playVideo() { video.play(); }
  function pauseVideo() { video.pause(); }
  function muteVideo() { video.muted = true; }
  function unmuteVideo() { video.muted = false; }
  function setVolume(value) {
    video.volume = value; // 音量取值 0 到 1，滑块 step 配合
    volumeValue.textContent = Math.round(value * 100) + '%';
  }

  // 状态事件：让界面与媒体状态保持同步
  video.addEventListener('play', () => console.log('视频开始播放'));
  video.addEventListener('pause', () => console.log('视频暂停'));
  video.addEventListener('ended', () => console.log('视频播放结束'));
</script>
```

**逐段讲解：**

- 音量滑块 `min="0" max="1" step="0.1"` 直接映射 `volume` 属性的取值范围，不需要换算；显示层再乘 100 变百分比；
- `onclick` 内联绑定只是演示写法，正式项目统一用 `addEventListener`（便于解绑与多监听器）；
- 播放状态以 `play`/`pause`/`ended` 事件为准，不要在点击时猜测状态——用户可能用键盘空格操作了原生控件。

## 工程示例：完整自定义播放器页面

把上述 API 组装成一个独立可运行的播放器页面（自定义播放/暂停、静音、音量与进度显示）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>视频播放器</title>
  </head>
  <body>
    <video id="myVideo" width="640" height="360">
      <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
      您的浏览器不支持 HTML5 视频。
    </video>
    <div>
      <button id="playPause">播放</button>
      <button id="mute">静音</button>
      <input type="range" id="volume" min="0" max="1" step="0.1" value="1" />
      <span id="time">0:00 / 0:00</span>
    </div>
    <script>
      const video = document.getElementById('myVideo');
      const playPauseBtn = document.getElementById('playPause');
      const muteBtn = document.getElementById('mute');
      const volumeSlider = document.getElementById('volume');
      const timeDisplay = document.getElementById('time');

      // 播放/暂停：按钮文案跟随状态切换
      playPauseBtn.addEventListener('click', function () {
        if (video.paused) {
          video.play();
          playPauseBtn.textContent = '暂停';
        } else {
          video.pause();
          playPauseBtn.textContent = '播放';
        }
      });

      // 静音切换
      muteBtn.addEventListener('click', function () {
        video.muted = !video.muted;
        muteBtn.textContent = video.muted ? '取消静音' : '静音';
      });

      // 音量
      volumeSlider.addEventListener('input', function () {
        video.volume = this.value;
      });

      // 进度：timeupdate 在播放中高频触发，用它同步显示
      video.addEventListener('timeupdate', function () {
        timeDisplay.textContent =
          formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
      });

      // 秒数格式化为 m:ss
      function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return minutes + ':' + String(seconds).padStart(2, '0');
      }
    </script>
  </body>
</html>
```

**代码结构解析：**

1. HTML 结构：`<video>` 承载媒体（故意不加 `controls`，全部按钮自绘），按钮组与音量滑块构成自定义控制条；
2. 控制逻辑：播放/暂停按钮按 `video.paused` 分支处理，静音直接取反布尔值；
3. 事件驱动：`timeupdate` 高频触发同步进度文字；`duration` 在元数据加载前是 `NaN`，严谨实现要监听 `loadedmetadata` 后再显示总时长；
4. 样式部分属于 CSS 课程，本例只需理解结构、事件与 API 的配合。

## 音视频最佳实践

- 提供多种格式（MP4、WebM、MP3、OGG），用多个 `<source>` 保证跨浏览器可播；
- 使用高效编码（H.264 视频、AAC 音频）减小文件体积；
- 按需设置 `preload`：列表页用 `metadata`，详情页才用 `auto`，避免无谓流量；
- 为视频添加 `poster` 封面并预留宽高，防止加载时布局跳动；
- 用 CSS `max-width: 100%` 让播放器在小屏自适应；
- 添加 `<track>` 字幕与描述，满足可访问性与嘈杂环境观看；
- 非关键媒体延迟加载：滚动到视口附近再设置 `src`（配合 IntersectionObserver）。

## 进阶：Web Audio API 速览

`<audio>` 之外的程序化音频体系：节点图架构，音源经过效果节点连到扬声器。

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 音源：振荡器
const oscillator = audioCtx.createOscillator();
oscillator.type = 'sine';            // sine/square/sawtooth/triangle
oscillator.frequency.value = 440;    // 频率 Hz

// 音量：增益节点
const gainNode = audioCtx.createGain();
gainNode.gain.value = 0.5;

// 节点串联：音源 -> 增益 -> 扬声器
oscillator.connect(gainNode);
gainNode.connect(audioCtx.destination);

oscillator.start();
oscillator.stop(audioCtx.currentTime + 2); // 2 秒后停止
```

**讲解：**

- `OscillatorNode` 生成基础波形，`GainNode` 控制音量，两者可自由组合出合成器；
- `AudioContext` 必须由用户手势触发创建或恢复（浏览器禁止页面自动发声），常见做法是在首个点击事件里 `audioCtx.resume()`；
- 典型应用：音频可视化（AnalyserNode 取频谱画到 Canvas，见 [235-Canvas2DDrawing](/html5/235-Canvas2DDrawing)）、游戏音效、提示音。

## 动手试试

### 入门版（必做）

1. 用 `<video controls>` 嵌入一段本地视频，加上 `poster` 封面；
2. 给页面加一段背景音乐，用 `<audio controls>` 播放；
3. 做一个中文字幕文件（WebVTT），用 `<track>` 挂到视频上并验证显示。

### 进阶版（选做）

1. 用 JS 实现自定义播放按钮：播放/暂停、进度条、音量；
2. 监听 `timeupdate` 把进度同步到页面上的进度条；
3. 给视频加“画中画”按钮，点击后 `requestPictureInPicture()`。

## 核心知识点

> 一句话记住音视频：`audio` 听声、`video` 看画，多个 `source` 保兼容；`controls` 给控件，`autoplay` 需静音，字幕用 `track`。

- `<audio>`/`<video>` 是浏览器原生播放器，无需插件；
- 多个 `<source>` 按浏览器支持顺序降级（MP4 最稳）；
- `controls`/`autoplay`/`muted`/`loop`/`poster`/`preload` 是核心属性；
- 播放控制 API：`play()`/`pause()`/`currentTime`/`volume`；
- 自动播放规则：有声需要用户手势，静音允许；
- 字幕用 WebVTT + `<track>`，`kind` 区分字幕与说明文字。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 自动播放被拦截 | 有声视频直接 `autoplay` 无效 | 静音播放或等用户手势再 `play()` |
| 只有一种格式 | 部分浏览器无法播放 | 提供 MP4 + WebM 多格式 |
| 缺少字幕 | 听障用户与嘈杂环境无法观看 | 添加 `<track kind="captions">` |
| 无 `poster` | 视频加载前一片黑 | 设置封面图并预留尺寸 |
| `play()` 未处理失败 | 拦截时出现未捕获的 Promise 错误 | `.catch()` 处理或 `try/catch` |
| 视频撑爆布局 | 宽高固定导致移动端溢出 | `max-width: 100%` 或按容器自适应 |

## 扩展学习

- Canvas 可视化：`html5/235-Canvas2DDrawing` 中用 rAF 绘制动态图形与音频可视化画布；
- 音频进阶：Web Audio API 节点图与音频可视化；
- 性能：`html5/380-CriticalRenderingPathAndResourceLoading` 媒体预加载策略；
- 无障碍：`html5/180-Accessibility` 中媒体替代文本与字幕规范；
- 直播流：`html5/320-WebSocket` 与 MSE（Media Source Extensions）。
