# 嵌入式内容 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## iframe 内联框架

**iframe 元素**
`<iframe src="<URL>" [width="<宽>"] [height="<高>"] [title="<标题>"] [sandbox="<策略>"] [allow="<功能>"] [loading="lazy|eager"]></iframe>`
```html
<!-- 基础 iframe -->
<iframe src="https://example.com" width="800" height="600" title="嵌入页面"></iframe>

<!-- 完整安全配置 -->
<iframe
  src="https://trusted-site.com/widget"
  width="800"
  height="600"
  title="第三方小组件"
  sandbox="allow-scripts allow-forms"
  allow="geolocation"
  referrerpolicy="no-referrer"
  loading="lazy"
></iframe>
```

**iframe 属性**

| 属性             | 作用                          |
| ---------------- | ----------------------------- |
| `src`            | 嵌入页面 URL                  |
| `srcdoc`         | 内联 HTML 内容                |
| `name`           | 框架名称(target 用)          |
| `sandbox`        | 沙箱安全策略                  |
| `allow`          | 权限策略(摄像头、麦克风等)   |
| `loading`        | 懒加载 lazy / eager           |
| `referrerpolicy` | Referer 策略                  |
| `title`          | 无障碍标题(必填)             |

---

## sandbox 沙箱策略

**安全沙箱**
`<iframe src="<URL>" sandbox="<策略列表>">`
```html
<!-- 完全沙箱(禁用所有功能) -->
<iframe src="untrusted.html" sandbox></iframe>

<!-- 部分启用 -->
<iframe src="widget.html" sandbox="allow-scripts allow-forms allow-same-origin"></iframe>
```

| sandbox 值                   | 允许的功能                |
| ---------------------------- | ------------------------- |
| (空)                         | 禁止所有                  |
| `allow-scripts`              | 执行脚本                  |
| `allow-same-origin`          | 同源请求                  |
| `allow-forms`                | 提交表单                  |
| `allow-popups`               | 弹窗(window.open)        |
| `allow-modals`               | 模态对话框(alert/confirm)|
| `allow-orientation-lock`     | 屏幕方向锁定              |
| `allow-pointer-lock`         | 鼠标锁定                  |
| `allow-presentation`         | 全屏演示                  |
| `allow-top-navigation`       | 顶层窗口导航              |
| `allow-downloads`            | 下载                      |

> 安全警告:同时使用 `allow-scripts` 和 `allow-same-origin` 可能导致沙箱被绕过。

---

## allow 权限策略

**Permissions Policy**
`<iframe src="<URL>" allow="<功能列表>">`
```html
<!-- 允许摄像头和麦克风 -->
<iframe src="video.html" allow="camera; microphone"></iframe>

<!-- 允许全屏和地理位置 -->
<iframe src="map.html" allow="fullscreen; geolocation"></iframe>

<!-- 限定来源 -->
<iframe
  src="https://example.com"
  allow="camera https://example.com; microphone https://example.com"
></iframe>
```

| 权限           | 说明          |
| -------------- | ------------- |
| `camera`       | 摄像头        |
| `microphone`   | 麦克风        |
| `geolocation`  | 地理位置      |
| `fullscreen`   | 全屏          |
| `autoplay`     | 自动播放      |
| `clipboard-read` | 剪贴板读取  |
| `clipboard-write` | 剪贴板写入 |
| `payment`      | 支付          |
| `usb`          | USB 设备      |

---

## srcdoc 内联内容

**内联 HTML**
`<iframe srcdoc="<HTML字符串>" [sandbox]></iframe>`
```html
<!-- 直接嵌入 HTML -->
<iframe srcdoc="<h1>内联内容</h1><p>Hello</p>" sandbox="allow-scripts"></iframe>

<!-- 配合 JavaScript 动态内容 -->
<iframe id="frame" sandbox="allow-scripts"></iframe>
<script>
  const html = `
    <h1>动态内容</h1>
    <p>当前时间:${new Date().toLocaleString()}</p>
  `;
  document.getElementById('frame').srcdoc = html;
</script>
```

---

## embed 与 object

**embed 元素**
`<embed src="<URL>" [type="<MIME>"] [width] [height] />`
```html
<!-- 嵌入 PDF -->
<embed src="document.pdf" type="application/pdf" width="800" height="600" />

<!-- 嵌入 Flash(已废弃) -->
<embed src="animation.swf" type="application/x-shockwave-flash" />
```

**object 元素**
`<object data="<URL>" [type="<MIME>"] [width] [height]>[回退内容]</object>`
```html
<!-- 嵌入 PDF(带回退) -->
<object data="document.pdf" type="application/pdf" width="800" height="600">
  <p>您的浏览器不支持 PDF 预览,请<a href="document.pdf">下载查看</a></p>
</object>

<!-- 嵌入图像 -->
<object data="chart.svg" type="image/svg+xml" width="400" height="300">
  <img src="chart.png" alt="图表" />
</object>
```

**embed vs object**

| 特性       | embed            | object                  |
| ---------- | ---------------- | ----------------------- |
| 自闭合     | 是               | 否                      |
| 回退内容   | 不支持           | 支持                    |
| 参数传递   | 通过属性         | 通过 `<param>` 子元素   |
| 使用场景   | 简单嵌入         | 需要回退的复杂嵌入      |

**param 参数**
`<param name="<名称>" value="<值>" />`
```html
<object data="game.swf" type="application/x-shockwave-flash">
  <param name="quality" value="high" />
  <param name="wmode" value="transparent" />
  <p>需要安装 Flash 插件</p>
</object>
```

---

## iframe 跨文档通信

**postMessage API**
```javascript
// 父页面 → iframe
const iframe = document.getElementById('myFrame');
iframe.contentWindow.postMessage(
  { type: 'DATA', payload: 'hello' },
  'https://example.com' // 必须指定目标源
);

// iframe → 父页面
window.parent.postMessage({ type: 'CHILD_READY' }, 'https://parent.com');

// 接收消息
window.addEventListener('message', (event) => {
  // 校验来源(防 XSS)
  if (event.origin !== 'https://example.com') return;
  console.log('收到消息:', event.data);
  console.log('来源:', event.origin);
  console.log('来源窗口:', event.source);
});
```

---

## video 与 audio 嵌入

**通过 iframe 嵌入视频**
```html
<!-- YouTube 嵌入 -->
<iframe
  src="https://www.youtube.com/embed/VIDEO_ID"
  width="560" height="315"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>

<!-- Bilibili 嵌入 -->
<iframe src="//player.bilibili.com/player.html?bvid=BVxxxx" width="100%" height="500" allowfullscreen></iframe>
```

---

## picture 与 source

**source 元素**
`<source src="<URL>" [type="<MIME>"] [media="<媒体查询>"] [srcset="<URL>"] />`
```html
<!-- 多格式图像回退 -->
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="照片" />
</picture>

<!-- 视频多格式 -->
<video controls>
  <source src="movie.webm" type="video/webm" />
  <source src="movie.mp4" type="video/mp4" />
  您的浏览器不支持视频。
</video>
```

---

## 嵌入地图

**iframe 嵌入地图**
```html
<!-- 高德地图 -->
<iframe
  src="https://uri.amap.com/marker?position=经度,纬度&name=位置名称"
  width="600" height="450"
  style="border:0;"
  loading="lazy"
  title="地图"
></iframe>

<!-- Google Maps -->
<iframe
  src="https://www.google.com/maps/embed?pb=..."
  width="600" height="450"
  style="border:0;"
  allowfullscreen=""
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>
```
