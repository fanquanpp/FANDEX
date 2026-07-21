---
order: 56
title: 音频与视频
module: html5
category: HTML5
difficulty: intermediate
description: audio、video、source、track字幕
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/链接与锚点
  - html5/图像与响应式图片
  - html5/SVG矢量图形
  - html5/嵌入式内容
prerequisites:
  - html5/概述与核心特性
---

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

| 条件       | 是否允许自动播放 |
| ---------- | ---------------- |
| 有声视频   |                  |
| 静音视频   |                  |
| 用户已交互 |                  |
