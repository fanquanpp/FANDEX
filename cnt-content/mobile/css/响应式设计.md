# CSS 响应式设计

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## viewport 视口设置

**基本写法：viewport 基础**
`<meta name="viewport" content="width=device-width, initial-scale=1">`
```css
/* HTML 中设置视口元信息 */
```

---

**基本写法：viewport 禁止缩放**
`<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`
```css
/* 禁止用户缩放 */
```

---

## 媒体查询基础

**基本写法：max-width 最大宽度**
`@media (max-width: <值>) { <样式> }`
```css
/* 屏幕宽度小于等于指定值时应用 */
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
/* 屏幕宽度大于等于指定值时应用 */
@media (min-width: 1200px) {
  .container {
    max-width: 1200px;
  }
}
```

---

**基本写法：范围媒体查询**
`@media (min-width: <值>) and (max-width: <值>) { <样式> }`
```css
/* 屏幕宽度在指定范围内时应用 */
@media (min-width: 768px) and (max-width: 1024px) {
  .container {
    width: 750px;
  }
}
```

---

**基本写法：max-height 最大高度**
`@media (max-height: <值>) { <样式> }`
```css
/* 屏幕高度小于等于指定值时应用 */
@media (max-height: 500px) {
  .header {
    height: 40px;
  }
}
```

---

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

## 媒体特性

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

**基本写法：hover 悬停支持**
`@media (hover: hover) { <样式> }`
```css
/* 设备支持悬停时应用 */
@media (hover: hover) {
  .button:hover {
    background-color: #0056b3;
  }
}
```

---

**基本写法：pointer 精确指针**
`@media (pointer: fine) { <样式> }`
```css
/* 设备有精确指针（鼠标）时应用 */
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
/* 设备为粗略指针（触摸）时应用 */
@media (pointer: coarse) {
  .button {
    padding: 12px 24px;
  }
}
```

---

## 断点系统

**基本写法：移动优先断点**
`@media (min-width: <值>) { <样式> }`
```css
/* 移动优先：从小到大递增 */
.container {
  width: 100%;
}
@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}
```

---

**基本写法：桌面优先断点**
`@media (max-width: <值>) { <样式> }`
```css
/* 桌面优先：从大到小递减 */
.container {
  max-width: 1200px;
}
@media (max-width: 768px) {
  .container {
    max-width: 100%;
  }
}
```

---

**单行写法：多断点**
`@media (min-width: <值1>) { <样式> } @media (min-width: <值2>) { <样式> }`
```css
/* 单行定义多个断点 */
.col { width: 100%; }
@media (min-width: 768px) { .col { width: 50%; } }
@media (min-width: 1200px) { .col { width: 33.33%; } }
```

---

**换行写法：多断点**
`@media (min-width: <值>) { <样式> }`
```css
/* 换行定义多个断点 */
.col {
  width: 100%;
}

@media (min-width: 768px) {
  .col {
    width: 50%;
  }
}

@media (min-width: 1200px) {
  .col {
    width: 33.33%;
  }
}
```

---

## 响应式单位

**基本写法：vw 视口宽度单位**
`width: <vw值>;`
```css
/* 相对于视口宽度的尺寸 */
.hero {
  width: 50vw;
}
```

---

**基本写法：vh 视口高度单位**
`height: <vh值>;`
```css
/* 相对于视口高度的尺寸 */
.hero {
  height: 100vh;
}
```

---

**基本写法：vmin 最小视口**
`width: <vmin值>;`
```css
/* 相对于视口较小边的尺寸 */
.logo {
  width: 10vmin;
}
```

---

**基本写法：vmax 最大视口**
`width: <vmax值>;`
```css
/* 相对于视口较大边的尺寸 */
.logo {
  width: 10vmax;
}
```

---

**基本写法：rem 根字号单位**
`font-size: <rem值>;`
```css
/* 相对于根元素字号的尺寸 */
.text {
  font-size: 1.2rem;
}
```

---

**基本写法：em 相对字号单位**
`padding: <em值>;`
```css
/* 相对于父元素字号的尺寸 */
.box {
  font-size: 16px;
  padding: 1.5em;
}
```

---

## 响应式字体

**基本写法：clamp 响应式字号**
`font-size: clamp(<最小>, <理想>, <最大>);`
```css
/* 字号在区间内响应式变化 */
.title {
  font-size: clamp(1.5rem, 4vw, 3rem);
}
```

---

**基本写法：vw 字号**
`font-size: <vw值>;`
```css
/* 视口宽度相关字号 */
.title {
  font-size: 5vw;
}
```

---

**基本写法：calc 混合计算字号**
`font-size: calc(<值1> + <值2>);`
```css
/* 混合单位计算字号 */
.title {
  font-size: calc(16px + 2vw);
}
```

---

## 响应式图片

**基本写法：max-width 图片自适应**
`img { max-width: 100%; height: auto; }`
```css
/* 图片自适应容器宽度 */
img {
  max-width: 100%;
  height: auto;
}
```

---

**基本写法：object-fit 图片裁剪**
`object-fit: cover;`
```css
/* 图片填充容器并裁剪 */
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

**基本写法：picture 响应式图片**
`<picture> <source media="(<条件>)" srcset="<图片>"> <img src="<默认>"> </picture>`
```css
/* 根据屏幕加载不同图片 */
```

---

**基本写法：srcset 响应式图片**
`<img srcset="<图片1> <宽度1>, <图片2> <宽度2>" src="<默认>">`
```css
/* 根据屏幕密度加载不同图片 */
```

---

## 容器查询

**基本写法：container-type 容器**
`container-type: inline-size;`
```css
/* 定义容器查询上下文 */
.sidebar {
  container-type: inline-size;
}
```

---

**基本写法：container-name 命名容器**
`container-name: <名称>;`
```css
/* 命名容器 */
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}
```

---

**基本写法：@container 容器查询**
`@container <名称> (min-width: <值>) { <样式> }`
```css
/* 基于容器尺寸应用样式 */
@container sidebar (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
```

---

**基本写法：container 简写**
`container: <名称> / inline-size;`
```css
/* 同时设置容器名称和类型 */
.sidebar {
  container: sidebar / inline-size;
}
```

---

## CSS 嵌套媒体查询

**基本写法：嵌套媒体查询**
`<选择器> { @media <条件> { <样式> } }`
```css
/* CSS 原生嵌套媒体查询 */
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

## 响应式工具

**基本写法：min 取最小值**
`width: min(<值1>, <值2>);`
```css
/* 取两个值中的较小者 */
.container {
  width: min(100%, 1200px);
}
```

---

**基本写法：max 取最大值**
`font-size: max(<值1>, <值2>);`
```css
/* 取两个值中的较大者 */
.text {
  font-size: max(16px, 2vw);
}
```

---

**基本写法：clamp 区间值**
`width: clamp(<最小>, <理想>, <最大>);`
```css
/* 限制值在指定区间 */
.text {
  font-size: clamp(14px, 2vw, 24px);
}
```

---

**基本写法：calc 计算**
`width: calc(<表达式>);`
```css
/* 动态计算尺寸 */
.sidebar {
  width: calc(100% - 250px);
}
```

---

## 响应式布局模式

**基本写法：移动优先 Flex**
`display: flex; flex-direction: column; @media (min-width: <值>) { flex-direction: row; }`
```css
/* 移动优先的 Flex 布局 */
.layout {
  display: flex;
  flex-direction: column;
  @media (min-width: 768px) {
    flex-direction: row;
  }
}
```

---

**基本写法：响应式 Grid**
`display: grid; grid-template-columns: 1fr; @media (min-width: <值>) { grid-template-columns: repeat(2, 1fr); }`
```css
/* 响应式 Grid 布局 */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

**基本写法：自动适应 Grid**
`grid-template-columns: repeat(auto-fit, minmax(<值>, 1fr));`
```css
/* 自动适应屏幕的 Grid */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}
```

---

**基本写法：隐藏显示元素**
`display: none; @media (min-width: <值>) { display: block; }`
```css
/* 小屏隐藏，大屏显示 */
.sidebar {
  display: none;
  @media (min-width: 1024px) {
    display: block;
  }
}
```

---

## 现代响应式新特性

**基本写法：Container Queries 容器查询(@container)**
`@container <名称> [(<条件>)] { <样式> }`
```css
/* 基于父容器尺寸响应样式 */
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}
@container sidebar (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
```

---

**基本写法：Container Query Units(cqw/cqh/cqi)**
`width: <数值>cqi;`
```css
/* 容器查询单位:1cqi = 容器 inline 尺寸 1% */
.card {
  /* 字号基于容器宽度自适应 */
  font-size: clamp(1rem, 5cqi, 2rem);
  padding: 2cqi;
}
```

---

**基本写法：Prefers-reduced-transparency**
`@media (prefers-reduced-transparency: reduce) { <样式> }`
```css
/* 用户偏好减少透明效果 */
@media (prefers-reduced-transparency: reduce) {
  .glass {
    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: none;
  }
}
```

---

**基本写法：Prefers-reduced-data**
`@media (prefers-reduced-data: reduce) { <样式> }`
```css
/* 用户偏好节省流量 */
@media (prefers-reduced-data: reduce) {
  .hero {
    background-image: none;
    background-color: #007bff;
  }
}
```

---

**基本写法：@media (scripting: none)**
`@media (scripting: none) { <样式> }`
```css
/* 检测脚本是否可用 */
@media (scripting: none) {
  /* 无 JS 时显示备用内容 */
  .no-js-fallback {
    display: block;
  }
  .js-only {
    display: none;
  }
}
```
