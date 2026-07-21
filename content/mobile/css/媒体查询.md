# CSS 媒体查询

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基础语法

**基本写法：media 基本语法**
`@media <条件> { <样式> }`
```css
/* 基本媒体查询 */
@media screen {
  body {
    font-size: 16px;
  }
}
```

---

**基本写法：media 媒体类型**
`@media <类型> { <样式> }`
```css
/* 指定媒体类型 */
@media print {
  body {
    color: black;
  }
}
```

---

**基本写法：media screen 屏幕**
`@media screen { <样式> }`
```css
/* 屏幕设备样式 */
@media screen {
  .container {
    max-width: 1200px;
  }
}
```

---

**基本写法：media print 打印**
`@media print { <样式> }`
```css
/* 打印样式 */
@media print {
  .no-print {
    display: none;
  }
}
```

---

**基本写法：media all 所有**
`@media all { <样式> }`
```css
/* 所有设备 */
@media all {
  body {
    margin: 0;
  }
}
```

---

## 宽度查询

**基本写法：max-width 最大宽度**
`@media (max-width: <值>) { <样式> }`
```css
/* 屏幕宽度小于等于指定值 */
@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
}
```

---

**基本写法：min-width 最小宽度**
`@media (min-width: <值>) { <样式> }`
```css
/* 屏幕宽度大于等于指定值 */
@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}
```

---

**基本写法：宽度范围**
`@media (min-width: <值>) and (max-width: <值>) { <样式> }`
```css
/* 屏幕宽度在指定范围内 */
@media (min-width: 768px) and (max-width: 1024px) {
  .container {
    width: 750px;
  }
}
```

---

## 高度查询

**基本写法：max-height 最大高度**
`@media (max-height: <值>) { <样式> }`
```css
/* 屏幕高度小于等于指定值 */
@media (max-height: 500px) {
  .header {
    height: 40px;
  }
}
```

---

**基本写法：min-height 最小高度**
`@media (min-height: <值>) { <样式> }`
```css
/* 屏幕高度大于等于指定值 */
@media (min-height: 800px) {
  .hero {
    height: 600px;
  }
}
```

---

**基本写法：高度范围**
`@media (min-height: <值>) and (max-height: <值>) { <样式> }`
```css
/* 屏幕高度在指定范围内 */
@media (min-height: 600px) and (max-height: 900px) {
  .hero {
    height: 400px;
  }
}
```

---

## 方向查询

**基本写法：orientation 横屏**
`@media (orientation: landscape) { <样式> }`
```css
/* 横屏时应用 */
@media (orientation: landscape) {
  .layout {
    flex-direction: row;
  }
}
```

---

**基本写法：orientation 竖屏**
`@media (orientation: portrait) { <样式> }`
```css
/* 竖屏时应用 */
@media (orientation: portrait) {
  .layout {
    flex-direction: column;
  }
}
```

---

## 分辨率查询

**基本写法：min-resolution 最小分辨率**
`@media (min-resolution: <值>dppx) { <样式> }`
```css
/* 高分辨率屏幕 */
@media (min-resolution: 2dppx) {
  .logo {
    background-image: url('logo@2x.png');
  }
}
```

---

**基本写法：min-resolution dpi**
`@media (min-resolution: <值>dpi) { <样式> }`
```css
/* 指定 dpi 分辨率 */
@media (min-resolution: 192dpi) {
  .logo {
    background-image: url('logo@2x.png');
  }
}
```

---

## 逻辑操作符

**基本写法：and 与操作**
`@media (<条件1>) and (<条件2>) { <样式> }`
```css
/* 同时满足多个条件 */
@media (min-width: 768px) and (max-width: 1024px) {
  .container {
    width: 750px;
  }
}
```

---

**基本写法：or 或操作**
`@media (<条件1>), (<条件2>) { <样式> }`
```css
/* 满足任一条件 */
@media (max-width: 480px), (min-width: 1200px) {
  .sidebar {
    display: none;
  }
}
```

---

**基本写法：not 非 操作**
`@media not <条件> { <样式> }`
```css
/* 不满足条件时应用 */
@media not print {
  body {
    background: white;
  }
}
```

---

**基本写法：only 仅**
`@media only <类型> { <样式> }`
```css
/* 仅对支持媒体查询的设备应用 */
@media only screen {
  .container {
    max-width: 1200px;
  }
}
```

---

**单行写法：多逻辑组合**
`@media (<条件1>) and (<条件2>), (<条件3>) { <样式> }`
```css
/* 单行组合多个逻辑条件 */
@media (min-width: 768px) and (orientation: landscape), (min-width: 1200px) { .layout { flex-direction: row; } }
```

---

**换行写法：多逻辑组合**
`@media (<条件1>) and (<条件2>), (<条件3>) { <样式> }`
```css
/* 换行组合多个逻辑条件 */
@media (min-width: 768px) and (orientation: landscape),
       (min-width: 1200px) {
  .layout {
    flex-direction: row;
  }
}
```

---

## 用户偏好查询

**基本写法：prefers-color-scheme 暗色**
`@media (prefers-color-scheme: dark) { <样式> }`
```css
/* 用户偏好暗色主题 */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #ffffff;
  }
}
```

---

**基本写法：prefers-color-scheme 亮色**
`@media (prefers-color-scheme: light) { <样式> }`
```css
/* 用户偏好亮色主题 */
@media (prefers-color-scheme: light) {
  body {
    background-color: #ffffff;
    color: #333333;
  }
}
```

---

**基本写法：prefers-reduced-motion 减少动画**
`@media (prefers-reduced-motion: reduce) { <样式> }`
```css
/* 用户偏好减少动画 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

**基本写法：prefers-reduced-motion 无偏好**
`@media (prefers-reduced-motion: no-preference) { <样式> }`
```css
/* 用户无动画偏好 */
@media (prefers-reduced-motion: no-preference) {
  .box {
    transition: transform 0.3s;
  }
}
```

---

**基本写法：prefers-contrast 高对比度**
`@media (prefers-contrast: more) { <样式> }`
```css
/* 用户偏好高对比度 */
@media (prefers-contrast: more) {
  .text {
    color: black;
    background: white;
  }
}
```

---

**基本写法：prefers-contrast 低对比度**
`@media (prefers-contrast: less) { <样式> }`
```css
/* 用户偏好低对比度 */
@media (prefers-contrast: less) {
  .text {
    color: #666;
    background: #f5f5f5;
  }
}
```

---

**基本写法：forced-colors 强制颜色**
`@media (forced-colors: active) { <样式> }`
```css
/* 系统强制颜色模式 */
@media (forced-colors: active) {
  .button {
    border: 1px solid ButtonText;
  }
}
```

---

## 设备特性查询

**基本写法：hover 悬停支持**
`@media (hover: hover) { <样式> }`
```css
/* 设备支持悬停 */
@media (hover: hover) {
  .button:hover {
    background-color: #0056b3;
  }
}
```

---

**基本写法：hover 无悬停**
`@media (hover: none) { <样式> }`
```css
/* 设备不支持悬停 */
@media (hover: none) {
  .button {
    padding: 12px 24px;
  }
}
```

---

**基本写法：pointer 精确指针**
`@media (pointer: fine) { <样式> }`
```css
/* 设备有精确指针 */
@media (pointer: fine) {
  .tooltip {
    display: block;
  }
}
```

---

**基本写法：pointer 粗略指针**
`@media (pointer: coarse) { <样式> }`
```css
/* 设备为粗略指针（触摸） */
@media (pointer: coarse) {
  .button {
    padding: 12px 24px;
  }
}
```

---

**基本写法：any-pointer 任一精确**
`@media (any-pointer: fine) { <样式> }`
```css
/* 任一输入设备为精确指针 */
@media (any-pointer: fine) {
  .tooltip {
    display: block;
  }
}
```

---

**基本写法：any-hover 任一悬停**
`@media (any-hover: hover) { <样式> }`
```css
/* 任一输入设备支持悬停 */
@media (any-hover: hover) {
  .button:hover {
    background-color: #0056b3;
  }
}
```

---

## 视口特性查询

**基本写法：aspect-ratio 宽高比**
`@media (aspect-ratio: <宽>/<高>) { <样式> }`
```css
/* 指定宽高比 */
@media (aspect-ratio: 16/9) {
  .video {
    width: 100%;
  }
}
```

---

**基本写法：min-aspect-ratio 最小宽高比**
`@media (min-aspect-ratio: <宽>/<高>) { <样式> }`
```css
/* 宽高比大于指定值 */
@media (min-aspect-ratio: 16/9) {
  .layout {
    flex-direction: row;
  }
}
```

---

**基本写法：max-aspect-ratio 最大宽高比**
`@media (max-aspect-ratio: <宽>/<高>) { <样式> }`
```css
/* 宽高比小于指定值 */
@media (max-aspect-ratio: 1/1) {
  .layout {
    flex-direction: column;
  }
}
```

---

## 媒体函数

**基本写法：range 语法**
`@media (width >= <值>) { <样式> }`
```css
/* 使用范围语法 */
@media (width >= 768px) {
  .container {
    max-width: 720px;
  }
}
```

---

**基本写法：range 区间**
`@media (<最小> <= width <= <最大>) { <样式> }`
```css
/* 使用区间语法 */
@media (768px <= width <= 1024px) {
  .container {
    width: 750px;
  }
}
```

---

**基本写法：not 否定**
`@media not (<条件>) { <样式> }`
```css
/* 否定条件 */
@media not (prefers-color-scheme: dark) {
  body {
    background: white;
  }
}
```

---

## 媒体查询嵌套

**基本写法：嵌套媒体查询**
`<选择器> { @media <条件> { <样式> } }`
```css
/* CSS 原生嵌套 */
.container {
  width: 100%;
  @media (min-width: 768px) {
    max-width: 720px;
  }
}
```

---

**单行写法：嵌套多媒体查询**
`<选择器> { @media <条件1> { <样式> } @media <条件2> { <样式> } }`
```css
/* 单行嵌套多个媒体查询 */
.col { width: 100%; @media (min-width: 768px) { width: 50%; } @media (min-width: 1200px) { width: 33%; } }
```

---

**换行写法：嵌套多媒体查询**
`<选择器> { @media <条件1> { <样式> } @media <条件2> { <样式> } }`
```css
/* 换行嵌套多个媒体查询 */
.col {
  width: 100%;
  @media (min-width: 768px) {
    width: 50%;
  }
  @media (min-width: 1200px) {
    width: 33%;
  }
}
```

---

## @import 媒体查询

**基本写法：@import 带媒体查询**
`@import url("<文件>") <条件>;`
```css
/* 导入样式并应用媒体查询 */
@import url("mobile.css") (max-width: 768px);
```

---

**基本写法：@import 多条件**
`@import url("<文件>") <条件1> and <条件2>;`
```css
/* 导入样式并应用多条件 */
@import url("tablet.css") (min-width: 768px) and (max-width: 1024px);
```

---

## @supports 特性查询

**基本写法：supports 属性支持**
`@supports (<属性>: <值>) { <样式> }`
```css
/* 检查属性支持 */
@supports (display: grid) {
  .container {
    display: grid;
  }
}
```

---

**基本写法：supports not 不支持**
`@supports not (<属性>: <值>) { <样式> }`
```css
/* 检查属性不支持 */
@supports not (display: grid) {
  .container {
    display: flex;
  }
}
```

---

**基本写法：supports and 与**
`@supports (<属性1>: <值>) and (<属性2>: <值>) { <样式> }`
```css
/* 同时检查多个属性支持 */
@supports (display: grid) and (gap: 10px) {
  .grid {
    display: grid;
    gap: 10px;
  }
}
```

---

**基本写法：supports or 或**
`@supports (<属性1>: <值>) or (<属性2>: <值>) { <样式> }`
```css
/* 检查任一属性支持 */
@supports (-webkit-backdrop-filter: blur(10px)) or (backdrop-filter: blur(10px)) {
  .modal {
    backdrop-filter: blur(10px);
  }
}
```

---

**基本写法：selector 选择器支持**
`@supports selector(<选择器>) { <样式> }`
```css
/* 检查选择器支持 */
@supports selector(:has(*)) {
  .card:has(img) {
    padding: 10px;
  }
}
```

---

## 断点规范

**基本写法：移动优先断点**
`@media (min-width: <值>) { <样式> }`
```css
/* 移动优先断点系统 */
.container { width: 100%; }
@media (min-width: 576px) { .container { max-width: 540px; } }
@media (min-width: 768px) { .container { max-width: 720px; } }
@media (min-width: 992px) { .container { max-width: 960px; } }
@media (min-width: 1200px) { .container { max-width: 1140px; } }
```

---

**基本写法：桌面优先断点**
`@media (max-width: <值>) { <样式> }`
```css
/* 桌面优先断点系统 */
.container { max-width: 1140px; }
@media (max-width: 1199px) { .container { max-width: 960px; } }
@media (max-width: 991px) { .container { max-width: 720px; } }
@media (max-width: 767px) { .container { max-width: 540px; } }
@media (max-width: 575px) { .container { max-width: 100%; } }
```

---

## 常见媒体查询模式

**基本写法：隐藏元素**
`@media (max-width: <值>) { <选择器> { display: none; } }`
```css
/* 小屏隐藏元素 */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
```

---

**基本写法：切换布局**
`@media (max-width: <值>) { <选择器> { flex-direction: column; } }`
```css
/* 小屏切换为列布局 */
.layout {
  display: flex;
  flex-direction: row;
}
@media (max-width: 768px) {
  .layout {
    flex-direction: column;
  }
}
```

---

**基本写法：调整字号**
`@media (max-width: <值>) { <选择器> { font-size: <值>; } }`
```css
/* 小屏调整字号 */
.title {
  font-size: 2rem;
}
@media (max-width: 768px) {
  .title {
    font-size: 1.5rem;
  }
}
```

---

**基本写法：调整间距**
`@media (max-width: <值>) { <选择器> { padding: <值>; } }`
```css
/* 小屏调整间距 */
.section {
  padding: 40px;
}
@media (max-width: 768px) {
  .section {
    padding: 20px;
  }
}
```

---

## 用户偏好媒体查询(2024)

**基本写法：prefers-reduced-motion 减少动画**
`@media (prefers-reduced-motion: reduce) { <样式> }`
```css
/* 用户偏好减少动画,关闭非必要动效 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

**基本写法：prefers-color-scheme 色彩偏好**
`@media (prefers-color-scheme: <dark|light>) { <样式> }`
```css
/* 用户系统级色彩偏好 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --text: #ffffff;
  }
  body {
    background-color: var(--bg);
    color: var(--text);
  }
}
```

---

**基本写法：prefers-contrast 对比度偏好**
`@media (prefers-contrast: <more|less|custom>) { <样式> }`
```css
/* 用户对比度偏好设置 */
@media (prefers-contrast: more) {
  .text {
    color: black;
    background: white;
    border: 2px solid black;
  }
}
```

---

**基本写法：prefers-reduced-transparency 减少透明**
`@media (prefers-reduced-transparency: reduce) { <样式> }`
```css
/* 用户偏好减少透明度效果 */
@media (prefers-reduced-transparency: reduce) {
  .modal {
    background-color: rgba(0, 0, 0, 0.95);
  }
  .glass {
    backdrop-filter: none;
    background-color: #f5f5f5;
  }
}
```

---

**基本写法：inverted-colors 反色模式**
`@media (inverted-colors: inverted) { <样式> }`
```css
/* 系统级颜色反转模式 */
@media (inverted-colors: inverted) {
  /* 反色模式下调整图片避免二次反转 */
  img,
  video {
    filter: invert(1);
  }
}
```
