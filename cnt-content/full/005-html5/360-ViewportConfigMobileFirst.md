---
order: 360
title: 视口配置与移动优先
module: 'html5'
category: 前端技术
difficulty: beginner
description: viewport、移动优先设计
author: fanquanpp
updated: '2026-09-12'
related:
  - 'html5/340-CustomDataAttribute'
  - 'html5/280-CrossDocumentCommunication'
  - 'html5/370-HTML5FormProjectExample'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

## 1. 视口概念

| 视口类型     | 说明                          |
| ------------ | ----------------------------- |
| **布局视口** | 浏览器用于计算 CSS 布局的视口 |
| **视觉视口** | 用户实际看到的区域            |
| **理想视口** | 设备屏幕的理想尺寸            |

```javascript
console.log(document.documentElement.clientWidth); // 布局视口
console.log(window.visualViewport.width); // 视觉视口
```

## 2. viewport meta 标签

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

| 属性            | 值                 | 说明             |
| --------------- | ------------------ | ---------------- |
| `width`         | device-width       | 布局视口宽度     |
| `initial-scale` | 1.0                | 初始缩放比例     |
| `maximum-scale` | 1.0-10.0           | 最大缩放比例     |
| `user-scalable` | yes/no             | 是否允许用户缩放 |
| `viewport-fit`  | auto/contain/cover | 适配刘海屏       |

> **可访问性警告**：禁止用户缩放会影响视力不佳的用户，WCAG 要求支持 200% 缩放。

## 3. 设备像素比

$$
\text{DPR} = \frac{\text{物理像素}}{\text{CSS 像素}}
$$

```javascript
console.log(window.devicePixelRatio); // 1, 2, 3 等
```

## 4. 移动优先设计

```css
/* 移动优先：基础样式 */
.container {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

/* 平板 */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    flex-direction: row;
  }
}

/* 桌面 */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

## 5. 安全区域适配

```css
.header {
  padding-top: env(safe-area-inset-top);
}
.footer {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## 6. 响应式断点

| 断点 | 宽度     | 设备   |
| ---- | -------- | ------ |
| xs   | < 576px  | 手机   |
| sm   | ≥ 576px  | 大手机 |
| md   | ≥ 768px  | 平板   |
| lg   | ≥ 992px  | 小桌面 |
| xl   | ≥ 1200px | 桌面   |
## 7. 前沿：容器查询（Container Queries）

媒体查询看"视口"，容器查询看"父容器"——组件能根据自身宽度自适应，2023 年后主流浏览器已全面支持，属于"知道即可"的前沿特性：

```css
/* 1. 给父容器声明容器类型 */
.card-list {
  container-type: inline-size;
}

/* 2. 按容器宽度写组件样式 */
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

**讲解：**

1. `container-type: inline-size` 让该元素成为"容器查询的参考容器"。
2. `@container (min-width: 400px)` 与媒体查询写法几乎一样，但判断的是容器宽度而非视口。
3. 它与组件化开发天然契合：同一个组件在侧边栏与主内容区可以呈现不同布局。
4. 完整教程见 `css/390-ContainerQuery`；第一遍了解概念即可。

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

## 动手试试

1. 新建一个页面，先不写 viewport meta，用手机模式预览，对比文字大小；
2. 加上 `width=device-width, initial-scale=1.0` 再对比；
3. 用开发者工具切换不同设备，观察 `clientWidth` 与 `devicePixelRatio` 的变化；
4. 进阶挑战：做一个“移动优先”的两栏布局，在 768px 断点以上变为并排。

## 核心知识点

> 一句话记住 viewport：`width=device-width` 画框对齐屏幕，`initial-scale=1.0` 不缩放；`viewport-fit=cover` 管刘海，`user-scalable` 别禁用。

- 布局视口/视觉视口/理想视口是三个不同概念；
- 移动端必备：`<meta name="viewport" content="width=device-width, initial-scale=1.0">`；
- DPR = 物理像素 / CSS 像素，高清图按 2x/3x 提供；
- 移动优先：先写基础样式，再用 `min-width` 媒体查询增强；
- `env(safe-area-inset-*)` 适配刘海屏安全区域；
- 禁止缩放违反 WCAG，不要禁用用户缩放。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记 viewport meta | 手机按桌面宽度渲染，文字极小 | 每个页面都加标准 viewport |
| 固定 `maximum-scale=1` | 用户无法缩放，违反 WCAG | 移除或设合理的放大范围 |
| 只用 CSS 像素不提供高清图 | 高分屏模糊 | 按 DPR 提供 2x/3x 图片 |
| 桌面优先开发 | 移动端体验差 | 移动优先 + min-width 增强 |
| 忽略刘海屏 | 内容被遮挡 | `viewport-fit=cover` + safe-area 变量 |

## 扩展学习

- 响应式：`css/360-MediaQuery` 断点与媒体查询完整语法；
- 图片适配：`html5/140-ImagesAndResponsiveImages` 的 srcset 与 DPR；
- 移动端布局：`css/370-ResponsiveDesign` 响应式设计模式；
- 安全区域：Apple 的 safe-area-inset 文档与 `env()` 函数用法。
