# 视口配置与移动优先 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 视口类型

| 视口类型     | 说明                          |
| ------------ | ----------------------------- |
| 布局视口     | 浏览器用于计算 CSS 布局的视口 |
| 视觉视口     | 用户实际看到的区域            |
| 理想视口     | 设备屏幕的理想尺寸            |

**JavaScript 获取视口尺寸**
```javascript
// 布局视口
console.log(document.documentElement.clientWidth);

// 视觉视口
console.log(window.visualViewport.width);
console.log(window.visualViewport.height);
console.log(window.visualViewport.scale);
```

---

## viewport meta 标签

**视口配置**
`<meta name="viewport" content="<键>=<值>, <键>=<值>, ..." />`
```html
<!-- 标准移动端配置 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- 完整配置 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes" />

<!-- 刘海屏适配 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

| 属性            | 值                       | 说明             |
| --------------- | ------------------------ | ---------------- |
| `width`         | device-width / 数值      | 布局视口宽度     |
| `height`        | device-height / 数值     | 布局视口高度     |
| `initial-scale` | 0.1 ~ 10.0               | 初始缩放比例     |
| `minimum-scale` | 0.1 ~ 10.0               | 最小缩放比例     |
| `maximum-scale` | 0.1 ~ 10.0               | 最大缩放比例     |
| `user-scalable` | yes / no                 | 是否允许用户缩放 |
| `viewport-fit`  | auto / contain / cover   | 适配刘海屏       |

---

## 设备像素比(DPR)

**DPR 计算公式**
`DPR = 物理像素 / CSS 像素`

**JavaScript 读取 DPR**
```javascript
// 设备像素比,常见值 1、2、3
console.log(window.devicePixelRatio);

// 监听 DPR 变化
window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', () => {
  console.log('DPR 变化');
});
```

---

## 移动优先响应式断点

**响应式断点对照**

| 断点 | 宽度      | 设备     |
| ---- | --------- | -------- |
| xs   | < 576px   | 手机     |
| sm   | ≥ 576px   | 大手机   |
| md   | ≥ 768px   | 平板     |
| lg   | ≥ 992px   | 小桌面   |
| xl   | ≥ 1200px  | 桌面     |
| xxl  | ≥ 1400px  | 大桌面   |

**移动优先 CSS 媒体查询**
```css
/* 移动优先:基础样式优先 */
.container {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

/* 平板及以上 */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    flex-direction: row;
  }
}

/* 桌面及以上 */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

---

## 安全区域适配

**env() 适配刘海屏**
```css
/* 适配顶部刘海 */
.header {
  padding-top: env(safe-area-inset-top);
}

/* 适配底部 Home 指示条 */
.footer {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 左右安全区 */
.sidebar-left {
  padding-left: env(safe-area-inset-left);
}

/* 同时设置 fallback */
.container {
  padding-top: 20px;
  padding-top: env(safe-area-inset-top);
}
```

---

## CSS 媒体查询语法

**媒体查询基础**
`@media <媒体类型> [and (<特性>)] { ... }`
```css
/* 屏幕宽度大于 768px */
@media screen and (min-width: 768px) { ... }

/* 横屏 */
@media screen and (orientation: landscape) { ... }

/* 高分辨率屏幕(Retina) */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) { ... }

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  body { background: #000; color: #fff; }
}

/* 减少动画 */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## Picture 元素响应式图片

**响应式图片**
```html
<picture>
  <!-- 大屏加载大图 -->
  <source media="(min-width: 1200px)" srcset="large.jpg" />
  <source media="(min-width: 768px)" srcset="medium.jpg" />
  <!-- 默认小图 -->
  <img src="small.jpg" alt="响应式图片" />
</picture>
```

**srcset 与 sizes**
`<img src="<默认>" srcset="<URL> <宽度>w, <URL> <宽度>w" sizes="<媒体查询> <尺寸>, ..." />`
```html
<img
  src="small.jpg"
  srcset="small.jpg 480w, medium.jpg 768w, large.jpg 1200w"
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="响应式图片"
/>
```

---

## VisualViewport API

**视觉视口 API**
```javascript
// 获取视觉视口
const vv = window.visualViewport;

console.log(vv.width);   // 视觉视口宽度
console.log(vv.height);  // 视觉视口高度
console.log(vv.offsetLeft); // 相对布局视口的 X 偏移
console.log(vv.offsetTop);  // 相对布局视口的 Y 偏移
console.log(vv.scale);   // 缩放比例

// 监听视觉视口变化(键盘弹出等)
vv.addEventListener('resize', () => {
  console.log('视觉视口大小变化');
});

vv.addEventListener('scroll', () => {
  console.log('视觉视口滚动');
});
```

---

## 触摸事件

**触摸事件监听**
`element.addEventListener('<事件>', handler)`
```javascript
const el = document.getElementById('touch-area');

el.addEventListener('touchstart', (e) => {
  console.log('触摸开始', e.touches.length);
});

el.addEventListener('touchmove', (e) => {
  e.preventDefault(); // 阻止默认滚动
  const touch = e.touches[0];
  console.log(`X: ${touch.clientX}, Y: ${touch.clientY}`);
});

el.addEventListener('touchend', (e) => {
  console.log('触摸结束');
});

// 多点触控
el.addEventListener('gesturechange', (e) => {
  console.log('缩放:', e.scale, '旋转:', e.rotation);
});
```

| 触摸事件        | 触发时机       |
| --------------- | -------------- |
| `touchstart`    | 手指触摸屏幕   |
| `touchmove`     | 手指在屏幕移动 |
| `touchend`      | 手指离开屏幕   |
| `touchcancel`   | 触摸被打断     |
