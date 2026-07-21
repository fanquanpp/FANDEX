# CSS 动画与过渡

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## transition 过渡

**基本写法：transition-property 单属性**
`transition-property: <属性>;`
```css
/* 指定过渡属性 */
.box {
  transition-property: opacity;
}
```

---

**基本写法：transition-duration 时长**
`transition-duration: <时间>;`
```css
/* 设置过渡时长 */
.box {
  transition-duration: 0.3s;
}
```

---

**基本写法：transition-timing-function 缓动**
`transition-timing-function: <缓动函数>;`
```css
/* 设置缓动函数 */
.box {
  transition-timing-function: ease-in-out;
}
```

---

**基本写法：transition-delay 延迟**
`transition-delay: <时间>;`
```css
/* 设置过渡延迟 */
.box {
  transition-delay: 0.1s;
}
```

---

**基本写法：transition 简写**
`transition: <属性> <时长> <缓动> <延迟>;`
```css
/* 同时设置过渡属性 */
.box {
  transition: opacity 0.3s ease-in-out 0.1s;
}
```

---

**单行写法：多属性过渡**
`transition: <属性1> <时长1>, <属性2> <时长2>;`
```css
/* 单行设置多个属性过渡 */
.box {
  transition: opacity 0.3s, transform 0.5s;
}
```

---

**换行写法：多属性过渡**
`transition: <属性1> <时长1>, <属性2> <时长2>, <属性3> <时长3>;`
```css
/* 换行设置多个属性过渡 */
.box {
  transition:
    opacity 0.3s,
    transform 0.5s,
    background-color 0.2s;
}
```

---

**基本写法：transition all**
`transition: all <时长>;`
```css
/* 所有可过渡属性都应用过渡 */
.box {
  transition: all 0.3s;
}
```

---

## @keyframes 关键帧

**基本写法：from-to 关键帧**
`@keyframes <名称> { from { <样式> } to { <样式> } }`
```css
/* 定义从起点到终点的动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

**基本写法：百分比关键帧**
`@keyframes <名称> { 0% { <样式> } 50% { <样式> } 100% { <样式> } }`
```css
/* 定义多关键帧动画 */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

---

**单行写法：多属性关键帧**
`@keyframes <名称> { 0% { <属性1>: <值>; <属性2>: <值>; } }`
```css
/* 单行定义多属性关键帧 */
@keyframes slide {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(100px); opacity: 0; }
}
```

---

**换行写法：多属性关键帧**
`@keyframes <名称> { 0% { <属性1>: <值>; <属性2>: <值>; } }`
```css
/* 换行定义多属性关键帧 */
@keyframes slide {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(100px);
    opacity: 0;
  }
}
```

---

## animation 动画

**基本写法：animation-name 名称**
`animation-name: <动画名>;`
```css
/* 指定动画名称 */
.box {
  animation-name: fadeIn;
}
```

---

**基本写法：animation-duration 时长**
`animation-duration: <时间>;`
```css
/* 设置动画时长 */
.box {
  animation-duration: 2s;
}
```

---

**基本写法：animation-timing-function 缓动**
`animation-timing-function: <缓动函数>;`
```css
/* 设置动画缓动函数 */
.box {
  animation-timing-function: ease-in-out;
}
```

---

**基本写法：animation-delay 延迟**
`animation-delay: <时间>;`
```css
/* 设置动画延迟 */
.box {
  animation-delay: 0.5s;
}
```

---

**基本写法：animation-iteration-count 次数**
`animation-iteration-count: <次数>;`
```css
/* 设置动画播放次数 */
.box {
  animation-iteration-count: 3;
}
```

---

**基本写法：animation-iteration-count 无限**
`animation-iteration-count: infinite;`
```css
/* 无限循环播放 */
.box {
  animation-iteration-count: infinite;
}
```

---

**基本写法：animation-direction 方向**
`animation-direction: alternate;`
```css
/* 交替反向播放 */
.box {
  animation-direction: alternate;
}
```

---

**基本写法：animation-direction 反向**
`animation-direction: reverse;`
```css
/* 反向播放 */
.box {
  animation-direction: reverse;
}
```

---

**基本写法：animation-fill-mode 填充**
`animation-fill-mode: forwards;`
```css
/* 保持结束状态 */
.box {
  animation-fill-mode: forwards;
}
```

---

**基本写法：animation-fill-mode 双向**
`animation-fill-mode: both;`
```css
/* 同时应用开始和结束状态 */
.box {
  animation-fill-mode: both;
}
```

---

**基本写法：animation-play-state 播放**
`animation-play-state: running;`
```css
/* 动画运行中 */
.box {
  animation-play-state: running;
}
```

---

**基本写法：animation-play-state 暂停**
`animation-play-state: paused;`
```css
/* 暂停动画 */
.box:hover {
  animation-play-state: paused;
}
```

---

**基本写法：animation 简写**
`animation: <名称> <时长> <缓动> <延迟> <次数> <方向> <填充> <状态>;`
```css
/* 同时设置所有动画属性 */
.box {
  animation: fadeIn 2s ease-in-out 0.5s infinite alternate forwards;
}
```

---

**单行写法：多动画**
`animation: <动画1>, <动画2>;`
```css
/* 单行设置多个动画 */
.box {
  animation: fadeIn 2s, slideIn 1s;
}
```

---

**换行写法：多动画**
`animation: <动画1>, <动画2>, <动画3>;`
```css
/* 换行设置多个动画 */
.box {
  animation:
    fadeIn 2s,
    slideIn 1s,
    pulse 0.5s infinite;
}
```

---

## 缓动函数

**基本写法：ease 默认**
`transition-timing-function: ease;`
```css
/* 默认缓动 */
.box {
  transition-timing-function: ease;
}
```

---

**基本写法：linear 线性**
`transition-timing-function: linear;`
```css
/* 线性匀速 */
.box {
  transition-timing-function: linear;
}
```

---

**基本写法：ease-in 加速**
`transition-timing-function: ease-in;`
```css
/* 开始慢，结束快 */
.box {
  transition-timing-function: ease-in;
}
```

---

**基本写法：ease-out 减速**
`transition-timing-function: ease-out;`
```css
/* 开始快，结束慢 */
.box {
  transition-timing-function: ease-out;
}
```

---

**基本写法：cubic-bezier 自定义**
`transition-timing-function: cubic-bezier(<x1>, <y1>, <x2>, <y2>);`
```css
/* 自定义贝塞尔曲线 */
.box {
  transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
}
```

---

**基本写法：steps 步进**
`transition-timing-function: steps(<步数>);`
```css
/* 分步过渡 */
.box {
  transition-timing-function: steps(4);
}
```

---

**基本写法：steps 跳跃**
`transition-timing-function: steps(<步数>, jump-none);`
```css
/* 步进不跳跃 */
.box {
  transition-timing-function: steps(4, jump-none);
}
```

---

## transform 变换动画

**基本写法：translate 平移动画**
`transform: translate(<x>, <y>);`
```css
/* 平移动画 */
.box {
  transition: transform 0.3s;
}
.box:hover {
  transform: translate(10px, 10px);
}
```

---

**基本写法：scale 缩放动画**
`transform: scale(<比例>);`
```css
/* 缩放动画 */
.box {
  transition: transform 0.3s;
}
.box:hover {
  transform: scale(1.1);
}
```

---

**基本写法：rotate 旋转动画**
`transform: rotate(<角度>);`
```css
/* 旋转动画 */
.box {
  transition: transform 0.5s;
}
.box:hover {
  transform: rotate(180deg);
}
```

---

**基本写法：3D 旋转动画**
`transform: rotateY(<角度>);`
```css
/* Y 轴 3D 旋转 */
.card {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.card:hover {
  transform: rotateY(180deg);
}
```

---

## 常见动画效果

**基本写法：淡入动画**
`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`
```css
/* 淡入效果 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fade-in {
  animation: fadeIn 0.5s ease-out;
}
```

---

**基本写法：淡出动画**
`@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }`
```css
/* 淡出效果 */
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
.fade-out {
  animation: fadeOut 0.5s ease-in;
}
```

---

**基本写法：滑入动画**
`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`
```css
/* 从左侧滑入 */
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
.slide-in {
  animation: slideIn 0.5s ease-out;
}
```

---

**基本写法：弹跳动画**
`@keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-30px); } 60% { transform: translateY(-15px); } }`
```css
/* 弹跳效果 */
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-30px); }
  60% { transform: translateY(-15px); }
}
.bounce {
  animation: bounce 1s;
}
```

---

**基本写法：旋转加载**
`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`
```css
/* 旋转加载动画 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spinner {
  animation: spin 1s linear infinite;
}
```

---

**基本写法：脉冲动画**
`@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }`
```css
/* 脉冲效果 */
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}
.pulse {
  animation: pulse 2s ease-in-out infinite;
}
```

---

## 滚动驱动动画

**基本写法：animation-timeline 滚动**
`animation-timeline: scroll();`
```css
/* 滚动驱动动画 */
.box {
  animation: fadeIn linear;
  animation-timeline: scroll();
}
```

---

**基本写法：animation-timeline 视口**
`animation-timeline: view();`
```css
/* 元素进入视口时触发 */
.box {
  animation: fadeIn linear;
  animation-timeline: view();
}
```

---

**基本写法：view 轴向**
`animation-timeline: view(<轴>);`
```css
/* 指定视口轴向 */
.box {
  animation: fadeIn linear;
  animation-timeline: view(block);
}
```

---

## 性能优化

**基本写法：will-change 提示**
`will-change: <属性>;`
```css
/* 提示浏览器优化 */
.animated {
  will-change: transform, opacity;
}
```

---

**基本写法：transform 替代 position**
`transform: translate3d(<x>, <y>, 0);`
```css
/* 使用 transform 触发 GPU 加速 */
.box {
  transform: translate3d(0, 0, 0);
}
```

---

**基本写法：backface-visibility 隐藏背面**
`backface-visibility: hidden;`
```css
/* 翻转卡片隐藏背面 */
.card {
  backface-visibility: hidden;
}
```

---

**基本写法：contain 包含**
`contain: layout;`
```css
/* 限制重绘范围 */
.widget {
  contain: layout;
}
```

---

**基本写法：content-visibility 内容可见性**
`content-visibility: auto;`
```css
/* 自动跳过屏幕外内容渲染 */
.long-list {
  content-visibility: auto;
}
```

---

## 现代动画新特性

**基本写法：@starting-style 进入动画**
`@starting-style { <选择器> { <样式> } }`
```css
/* 元素首次显示时的起始样式,实现进入动画 */
.dialog {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s, transform 0.3s;
}
@starting-style {
  .dialog {
    opacity: 0;
    transform: translateY(20px);
  }
}
```

---

**基本写法：transition-behavior: allow-discrete**
`transition-behavior: allow-discrete;`
```css
/* 允许离散属性(如 display)参与过渡 */
.modal {
  transition: display 0.3s, opacity 0.3s;
  transition-behavior: allow-discrete;
}
.modal.hidden {
  display: none;
  opacity: 0;
}
```

---

**基本写法：scroll-driven animations animation-timeline**
`animation-timeline: scroll(<参数>);`
```css
/* 滚动驱动动画:页面滚动时持续触发 */
@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.progress-bar {
  animation: progress linear;
  animation-timeline: scroll(root);
  transform-origin: left;
}
```

---

**基本写法：view-timeline 视图时间线**
`view-timeline: <名称> <轴>;`
```css
/* 元素进入视口时触发的视图时间线 */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.section {
  view-timeline: --section-timeline block;
  animation: fade-in linear;
  animation-timeline: --section-timeline;
}
```

---

**基本写法：interpolate-size: allow-keywords 高度 auto 过渡**
`interpolate-size: allow-keywords;`
```css
/* 允许对 height: auto 等关键字进行过渡 */
.accordion {
  interpolate-size: allow-keywords;
  height: auto;
  transition: height 0.3s ease;
}
.accordion.collapsed {
  height: 0;
}
```
