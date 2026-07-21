# CSS 阴影

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## box-shadow 盒阴影

**基本写法：外阴影**
`box-shadow: <水平偏移> <垂直偏移> <模糊> <颜色>;`
```css
/* 设置外阴影 */
.box {
  box-shadow: 2px 4px 8px rgba(0, 0, 0, 0.2);
}
```

---

**基本写法：带扩展的外阴影**
`box-shadow: <水平> <垂直> <模糊> <扩展> <颜色>;`
```css
/* 设置带扩展的外阴影 */
.box {
  box-shadow: 2px 4px 8px 2px rgba(0, 0, 0, 0.2);
}
```

---

**基本写法：内阴影**
`box-shadow: inset <水平> <垂直> <模糊> <颜色>;`
```css
/* 设置内阴影 */
.box {
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
}
```

---

**基本写法：无阴影**
`box-shadow: none;`
```css
/* 移除阴影 */
.box {
  box-shadow: none;
}
```

---

**单行写法：多重阴影**
`box-shadow: <阴影1>, <阴影2>;`
```css
/* 单行设置多重阴影 */
.box {
  box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1);
}
```

---

**换行写法：多重阴影**
`box-shadow: <阴影1>, <阴影2>, <阴影3>;`
```css
/* 换行设置多重阴影 */
.box {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.1),
    0 16px 32px rgba(0, 0, 0, 0.1);
}
```

---

## 常见阴影效果

**基本写法：柔和阴影**
`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);`
```css
/* 柔和的卡片阴影 */
.card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

---

**基本写法：深阴影**
`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);`
```css
/* 较深的阴影 */
.modal {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

---

**基本写法：底部阴影**
`box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);`
```css
/* 仅底部阴影 */
.header {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

---

**基本写法：四周阴影**
`box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);`
```css
/* 四周均匀阴影 */
.box {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
```

---

**基本写法：彩色阴影**
`box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);`
```css
/* 彩色阴影效果 */
.button {
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}
```

---

## 材料设计阴影

**基本写法：Material 阴影 1 级**
`box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);`
```css
/* Material Design 1 级阴影 */
.z1 {
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
}
```

---

**基本写法：Material 阴影 2 级**
`box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);`
```css
/* Material Design 2 级阴影 */
.z2 {
  box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
}
```

---

**基本写法：Material 阴影 3 级**
`box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);`
```css
/* Material Design 3 级阴影 */
.z3 {
  box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);
}
```

---

**基本写法：Material 阴影 4 级**
`box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22);`
```css
/* Material Design 4 级阴影 */
.z4 {
  box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22);
}
```

---

**基本写法：Material 阴影 5 级**
`box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);`
```css
/* Material Design 5 级阴影 */
.z5 {
  box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);
}
```

---

## text-shadow 文字阴影

**基本写法：文字阴影**
`text-shadow: <水平> <垂直> <模糊> <颜色>;`
```css
/* 设置文字阴影 */
.title {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}
```

---

**基本写法：文字发光**
`text-shadow: 0 0 10px <颜色>;`
```css
/* 文字发光效果 */
.glow {
  text-shadow: 0 0 10px rgba(0, 123, 255, 0.8);
}
```

---

**基本写法：文字描边**
`text-shadow: <方向1> <颜色>, <方向2> <颜色>, <方向3> <颜色>, <方向4> <颜色>;`
```css
/* 文字描边效果 */
.outline {
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
}
```

---

**单行写法：多重文字阴影**
`text-shadow: <阴影1>, <阴影2>;`
```css
/* 单行设置多重文字阴影 */
.text {
  text-shadow: 1px 1px 2px black, 0 0 10px blue;
}
```

---

**换行写法：多重文字阴影**
`text-shadow: <阴影1>, <阴影2>, <阴影3>;`
```css
/* 换行设置多重文字阴影 */
.text {
  text-shadow:
    1px 1px 2px black,
    0 0 10px blue,
    0 0 20px darkblue;
}
```

---

## drop-shadow 滤镜阴影

**基本写法：drop-shadow 滤镜**
`filter: drop-shadow(<水平> <垂直> <模糊> <颜色>);`
```css
/* 使用滤镜创建阴影（跟随形状） */
.image {
  filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.3));
}
```

---

**基本写法：PNG 阴影**
`filter: drop-shadow(<水平> <垂直> <模糊> <颜色>);`
```css
/* 为透明 PNG 创建跟随形状的阴影 */
.logo {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}
```

---

## 阴影动画

**基本写法：阴影过渡**
`transition: box-shadow <时长>;`
```css
/* 阴影过渡动画 */
.card {
  transition: box-shadow 0.3s;
}
.card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}
```

---

**基本写法：阴影悬停效果**
`<选择器>:hover { box-shadow: <阴影>; }`
```css
/* 悬停时增强阴影 */
.button {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s;
}
.button:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
```

---

**基本写法：阴影按下效果**
`<选择器>:active { box-shadow: <阴影>; }`
```css
/* 按下时减弱阴影 */
.button:active {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
```

---

## 阴影变量

**基本写法：定义阴影变量**
`:root { --shadow-<名>: <阴影值>; }`
```css
/* 定义阴影变量 */
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

---

**基本写法：使用阴影变量**
`box-shadow: var(--shadow-<名>);`
```css
/* 使用阴影变量 */
.card {
  box-shadow: var(--shadow-md);
}
```

---

## 响应式阴影

**基本写法：clamp 响应式阴影**
`box-shadow: 0 clamp(<最小>, <理想>, <最大>) <模糊> <颜色>;`
```css
/* 响应式阴影 */
.box {
  box-shadow: 0 clamp(2px, 1vw, 8px) 12px rgba(0, 0, 0, 0.1);
}
```

---

**基本写法：媒体查询调整阴影**
`@media (max-width: <值>) { box-shadow: <值>; }`
```css
/* 小屏幕调整阴影 */
.card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
@media (max-width: 768px) {
  .card {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }
}
```

---

## 内阴影效果

**基本写法：内凹效果**
`box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);`
```css
/* 创建内凹效果 */
.inset {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

---

**基本写法：内凸效果**
`box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.1);`
```css
/* 创建内凸效果 */
.outset {
  box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.1);
}
```

---

**基本写法：浮雕效果**
`box-shadow: inset 1px 1px 2px rgba(255,255,255,0.5), inset -1px -1px 2px rgba(0,0,0,0.1);`
```css
/* 创建浮雕效果 */
.embossed {
  box-shadow:
    inset 1px 1px 2px rgba(255,255,255,0.5),
    inset -1px -1px 2px rgba(0,0,0,0.1);
}
```

---

## 长阴影

**单行写法：长阴影**
`box-shadow: <偏移1> <颜色>, <偏移2> <颜色>, <偏移3> <颜色>;`
```css
/* 单行长阴影效果 */
.long-shadow {
  box-shadow: 1px 1px rgba(0,0,0,0.1), 2px 2px rgba(0,0,0,0.1), 3px 3px rgba(0,0,0,0.1);
}
```

---

**换行写法：长阴影**
`box-shadow: <偏移1> <颜色>, <偏移2> <颜色>, <偏移3> <颜色>;`
```css
/* 换行长阴影效果 */
.long-shadow {
  box-shadow:
    1px 1px rgba(0,0,0,0.1),
    2px 2px rgba(0,0,0,0.1),
    3px 3px rgba(0,0,0,0.1),
    4px 4px rgba(0,0,0,0.1),
    5px 5px rgba(0,0,0,0.1);
}
```

---

## 霓虹阴影

**基本写法：霓虹发光**
`box-shadow: 0 0 <模糊> <颜色>, 0 0 <模糊2> <颜色>;`
```css
/* 霓虹发光效果 */
.neon {
  box-shadow: 0 0 5px #007bff, 0 0 10px #007bff;
}
```

---

**基本写法：彩色霓虹**
`box-shadow: 0 0 <模糊> <颜色1>, 0 0 <模糊2> <颜色2>;`
```css
/* 多色霓虹效果 */
.neon-multi {
  box-shadow:
    0 0 5px #ff00ff,
    0 0 10px #00ffff;
}
```
