# CSS 渐变

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## linear-gradient 线性渐变

**基本写法：两色线性渐变**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>);`
```css
/* 两色线性渐变 */
.header {
  background: linear-gradient(135deg, #007bff, #0056b3);
}
```

---

**基本写法：三色线性渐变**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>, <颜色3>);`
```css
/* 三色线性渐变 */
.rainbow {
  background: linear-gradient(90deg, red, yellow, green);
}
```

---

**基本写法：to 方向渐变**
`background: linear-gradient(to <方向>, <颜色1>, <颜色2>);`
```css
/* 使用 to 关键字指定方向 */
.header {
  background: linear-gradient(to right, #007bff, #0056b3);
}
```

---

**基本写法：to 双方向渐变**
`background: linear-gradient(to <方向1> <方向2>, <颜色1>, <颜色2>);`
```css
/* 指定对角方向 */
.header {
  background: linear-gradient(to bottom right, #007bff, #0056b3);
}
```

---

**基本写法：角度渐变**
`background: linear-gradient(<角度>, <颜色1>, <颜色2>);`
```css
/* 使用角度指定方向 */
.header {
  background: linear-gradient(45deg, #007bff, #0056b3);
}
```

---

**基本写法：带位置渐变**
`background: linear-gradient(<方向>, <颜色1> <位置1>, <颜色2> <位置2>);`
```css
/* 指定颜色位置 */
.header {
  background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
}
```

---

**单行写法：多色多位置渐变**
`background: linear-gradient(<方向>, <颜色1> <位置1>, <颜色2> <位置2>, <颜色3> <位置3>);`
```css
/* 单行多色多位置渐变 */
.header {
  background: linear-gradient(90deg, #007bff 0%, #0056b3 50%, #003d7a 100%);
}
```

---

**换行写法：多色多位置渐变**
`background: linear-gradient(<方向>, <颜色1> <位置1>, <颜色2> <位置2>, <颜色3> <位置3>);`
```css
/* 换行多色多位置渐变 */
.header {
  background: linear-gradient(
    90deg,
    #007bff 0%,
    #0056b3 50%,
    #003d7a 100%
  );
}
```

---

**基本写法：硬边渐变**
`background: linear-gradient(<方向>, <颜色1> <位置>, <颜色2> <位置>);`
```css
/* 创建硬边过渡 */
.stripe {
  background: linear-gradient(90deg, #007bff 50%, #0056b3 50%);
}
```

---

## radial-gradient 径向渐变

**基本写法：圆形径向渐变**
`background: radial-gradient(circle, <颜色1>, <颜色2>);`
```css
/* 圆形径向渐变 */
.radial {
  background: radial-gradient(circle, #007bff, #0056b3);
}
```

---

**基本写法：椭圆径向渐变**
`background: radial-gradient(ellipse, <颜色1>, <颜色2>);`
```css
/* 椭圆径向渐变 */
.radial {
  background: radial-gradient(ellipse, #007bff, #0056b3);
}
```

---

**基本写法：带位置径向渐变**
`background: radial-gradient(circle at <位置>, <颜色1>, <颜色2>);`
```css
/* 指定圆心位置 */
.radial {
  background: radial-gradient(circle at top left, #007bff, #0056b3);
}
```

---

**基本写法：带尺寸径向渐变**
`background: radial-gradient(<尺寸> circle, <颜色1>, <颜色2>);`
```css
/* 指定圆尺寸 */
.radial {
  background: radial-gradient(100px circle, #007bff, #0056b3);
}
```

---

**基本写法：closest-side**
`background: radial-gradient(closest-side, <颜色1>, <颜色2>);`
```css
/* 渐变到最近的边 */
.radial {
  background: radial-gradient(closest-side, #007bff, #0056b3);
}
```

---

**基本写法：farthest-corner**
`background: radial-gradient(farthest-corner, <颜色1>, <颜色2>);`
```css
/* 渐变到最远的角 */
.radial {
  background: radial-gradient(farthest-corner, #007bff, #0056b3);
}
```

---

**基本写法：带颜色位置径向渐变**
`background: radial-gradient(circle, <颜色1> <位置1>, <颜色2> <位置2>);`
```css
/* 指定颜色位置 */
.radial {
  background: radial-gradient(circle, #007bff 0%, #0056b3 100%);
}
```

---

## conic-gradient 圆锥渐变

**基本写法：圆锥渐变**
`background: conic-gradient(<颜色1>, <颜色2>, <颜色1>);`
```css
/* 圆锥渐变 */
.conic {
  background: conic-gradient(red, yellow, green, red);
}
```

---

**基本写法：带角度圆锥渐变**
`background: conic-gradient(from <角度>, <颜色1>, <颜色2>);`
```css
/* 指定起始角度 */
.conic {
  background: conic-gradient(from 0deg, red, yellow, green, red);
}
```

---

**基本写法：带位置圆锥渐变**
`background: conic-gradient(from <角度> at <位置>, <颜色1>, <颜色2>);`
```css
/* 指定起始角度和位置 */
.conic {
  background: conic-gradient(from 0deg at center, red, yellow, green, red);
}
```

---

**基本写法：硬边圆锥渐变**
`background: conic-gradient(<颜色1> <角度1>, <颜色2> <角度2>);`
```css
/* 创建饼图效果 */
.pie {
  background: conic-gradient(red 0deg 90deg, blue 90deg 360deg);
}
```

---

## repeating-linear-gradient 重复线性渐变

**基本写法：重复线性渐变**
`background: repeating-linear-gradient(<方向>, <颜色1>, <颜色2> <宽度>);`
```css
/* 重复线性渐变 */
.stripes {
  background: repeating-linear-gradient(45deg, #007bff, #007bff 10px, #0056b3 10px, #0056b3 20px);
}
```

---

**基本写法：水平条纹**
`background: repeating-linear-gradient(<方向>, <颜色1> <宽度>, <颜色2> <宽度>);`
```css
/* 水平条纹背景 */
.stripes {
  background: repeating-linear-gradient(0deg, #007bff 0, #007bff 10px, #0056b3 10px, #0056b3 20px);
}
```

---

**基本写法：垂直条纹**
`background: repeating-linear-gradient(<方向>, <颜色1> <宽度>, <颜色2> <宽度>);`
```css
/* 垂直条纹背景 */
.stripes {
  background: repeating-linear-gradient(90deg, #007bff 0, #007bff 10px, #0056b3 10px, #0056b3 20px);
}
```

---

## repeating-radial-gradient 重复径向渐变

**基本写法：重复径向渐变**
`background: repeating-radial-gradient(circle, <颜色1>, <颜色2> <宽度>);`
```css
/* 重复径向渐变 */
.rings {
  background: repeating-radial-gradient(circle, #007bff 0, #007bff 10px, #0056b3 10px, #0056b3 20px);
}
```

---

**基本写法：同心圆**
`background: repeating-radial-gradient(<颜色1> <宽度>, <颜色2> <宽度>);`
```css
/* 同心圆效果 */
.rings {
  background: repeating-radial-gradient(circle at center, #007bff 0, #007bff 5px, transparent 5px, transparent 10px);
}
```

---

## 多重渐变

**单行写法：多重渐变**
`background: <渐变1>, <渐变2>;`
```css
/* 单行设置多重渐变 */
.box {
  background: linear-gradient(135deg, transparent, rgba(0,0,0,0.5)), radial-gradient(circle, #007bff, #0056b3);
}
```

---

**换行写法：多重渐变**
`background: <渐变1>, <渐变2>, <渐变3>;`
```css
/* 换行设置多重渐变 */
.box {
  background:
    linear-gradient(135deg, transparent, rgba(0,0,0,0.5)),
    radial-gradient(circle, #007bff, #0056b3),
    url("texture.png");
}
```

---

## 渐变与变量

**基本写法：使用变量定义渐变**
`:root { --gradient-<名>: <渐变值>; }`
```css
/* 定义渐变变量 */
:root {
  --gradient-primary: linear-gradient(135deg, #007bff, #0056b3);
  --gradient-secondary: linear-gradient(135deg, #6c757d, #495057);
}
```

---

**基本写法：使用渐变变量**
`background: var(--gradient-<名>);`
```css
/* 使用渐变变量 */
.header {
  background: var(--gradient-primary);
}
```

---

**基本写法：变量在渐变中使用**
`background: linear-gradient(<方向>, var(--<颜色1>), var(--<颜色2>));`
```css
/* 在渐变中使用颜色变量 */
.header {
  background: linear-gradient(135deg, var(--color-start), var(--color-end));
}
```

---

## 渐变方向

**基本写法：to top 向上**
`background: linear-gradient(to top, <颜色1>, <颜色2>);`
```css
/* 向上的渐变 */
.box {
  background: linear-gradient(to top, #007bff, #0056b3);
}
```

---

**基本写法：to bottom 向下**
`background: linear-gradient(to bottom, <颜色1>, <颜色2>);`
```css
/* 向下的渐变 */
.box {
  background: linear-gradient(to bottom, #007bff, #0056b3);
}
```

---

**基本写法：to left 向左**
`background: linear-gradient(to left, <颜色1>, <颜色2>);`
```css
/* 向左的渐变 */
.box {
  background: linear-gradient(to left, #007bff, #0056b3);
}
```

---

**基本写法：to right 向右**
`background: linear-gradient(to right, <颜色1>, <颜色2>);`
```css
/* 向右的渐变 */
.box {
  background: linear-gradient(to right, #007bff, #0056b3);
}
```

---

## 透明度渐变

**基本写法：透明渐变**
`background: linear-gradient(<方向>, transparent, <颜色>);`
```css
/* 从透明到不透明 */
.fade {
  background: linear-gradient(to bottom, transparent, #000000);
}
```

---

**基本写法：半透明渐变**
`background: linear-gradient(<方向>, rgba(<颜色>, <透明度1>), rgba(<颜色>, <透明度2>));`
```css
/* 半透明渐变 */
.overlay {
  background: linear-gradient(135deg, rgba(0,123,255,0.8), rgba(0,86,179,0.6));
}
```

---

**基本写法：淡出效果**
`background: linear-gradient(<方向>, <颜色>, transparent);`
```css
/* 从不透明到透明 */
.fade-out {
  background: linear-gradient(to bottom, #007bff, transparent);
}
```

---

## 渐变动画

**基本写法：渐变过渡**
`background-size: <尺寸>; transition: background-position <时长>;`
```css
/* 渐变背景过渡动画 */
.animated {
  background: linear-gradient(90deg, #007bff, #0056b3, #007bff);
  background-size: 200% 100%;
  transition: background-position 0.5s;
}
.animated:hover {
  background-position: 100% 0;
}
```

---

**基本写法：渐变流动动画**
`@keyframes <名称> { from { background-position: 0% 0%; } to { background-position: 100% 0%; } }`
```css
/* 渐变流动动画 */
@keyframes gradientFlow {
  from { background-position: 0% 0%; }
  to { background-position: 100% 0%; }
}
.flowing {
  background: linear-gradient(90deg, #007bff, #0056b3, #007bff);
  background-size: 200% 100%;
  animation: gradientFlow 3s linear infinite;
}
```

---

## 常见渐变效果

**基本写法：按钮渐变**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>);`
```css
/* 按钮渐变背景 */
.btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
}
```

---

**基本写法：卡片渐变**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>);`
```css
/* 卡片渐变背景 */
.card {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}
```

---

**基本写法：遮罩渐变**
`background: linear-gradient(<方向>, transparent, <颜色>);`
```css
/* 底部遮罩渐变 */
.overlay {
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
}
```

---

**基本写法：网格背景**
`background: linear-gradient(<方向1>, <颜色> <宽度>, transparent <宽度>), linear-gradient(<方向2>, <颜色> <宽度>, transparent <宽度>);`
```css
/* 网格背景 */
.grid-bg {
  background:
    linear-gradient(90deg, #ccc 1px, transparent 1px),
    linear-gradient(0deg, #ccc 1px, transparent 1px);
  background-size: 20px 20px;
}
```

---

**基本写法：对角条纹**
`background: repeating-linear-gradient(45deg, <颜色1> <宽度>, <颜色2> <宽度>);`
```css
/* 对角条纹背景 */
.diagonal-stripes {
  background: repeating-linear-gradient(45deg, #007bff 0, #007bff 10px, #0056b3 10px, #0056b3 20px);
}
```

---

**基本写法：棋盘格背景**
`background: conic-gradient(<颜色1> <角度>, <颜色2> <角度>, <颜色1> <角度>, <颜色2> <角度>);`
```css
/* 棋盘格背景 */
.checkerboard {
  background: conic-gradient(#000 0deg 90deg, #fff 90deg 180deg, #000 180deg 270deg, #fff 270deg 360deg);
  background-size: 50px 50px;
}
```

---

## 渐变文本

**基本写法：渐变文字**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>); -webkit-background-clip: text; color: transparent;`
```css
/* 渐变文字效果 */
.gradient-text {
  background: linear-gradient(135deg, #007bff, #0056b3);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

---

**基本写法：多色渐变文字**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>, <颜色3>); -webkit-background-clip: text; color: transparent;`
```css
/* 多色渐变文字 */
.rainbow-text {
  background: linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

---

## 响应式渐变

**基本写法：clamp 响应式渐变**
`background: linear-gradient(<角度>, <颜色1>, <颜色2>)`
```css
/* 响应式渐变角度 */
.box {
  background: linear-gradient(clamp(45deg, 10vw, 135deg), #007bff, #0056b3);
}
```

---

**基本写法：媒体查询调整渐变**
`@media (max-width: <值>) { background: <渐变>; }`
```css
/* 小屏幕调整渐变 */
.box {
  background: linear-gradient(135deg, #007bff, #0056b3);
}
@media (max-width: 768px) {
  .box {
    background: linear-gradient(180deg, #007bff, #0056b3);
  }
}
```

---

**基本写法：嵌套媒体查询渐变**
`.box { background: <渐变>; @media (max-width: <值>) { background: <渐变>; } }`
```css
/* CSS 原生嵌套媒体查询渐变 */
.box {
  background: linear-gradient(135deg, #007bff, #0056b3);
  @media (max-width: 768px) {
    background: linear-gradient(180deg, #007bff, #0056b3);
  }
}
```
