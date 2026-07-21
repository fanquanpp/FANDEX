# 音频与视频 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

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
