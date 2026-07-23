# CSS 定位详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## position 定位类型

**基本写法：static 静态定位**
`position: static;`
```css
/* 默认定位，遵循文档流 */
.box {
  position: static;
}
```

---

**基本写法：relative 相对定位**
`position: relative;`
```css
/* 相对自身原位置偏移 */
.box {
  position: relative;
  top: 10px;
  left: 20px;
}
```

---

**基本写法：absolute 绝对定位**
`position: absolute;`
```css
/* 相对最近的非 static 祖先定位 */
.box {
  position: absolute;
  top: 0;
  right: 0;
}
```

---

**基本写法：fixed 固定定位**
`position: fixed;`
```css
/* 相对视口定位，不随滚动 */
.header {
  position: fixed;
  top: 0;
  width: 100%;
}
```

---

**基本写法：sticky 粘性定位**
`position: sticky;`
```css
/* 滚动到阈值时变为固定 */
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
}
```

---

## 偏移属性

**基本写法：top 顶部偏移**
`top: <值>;`
```css
/* 设置元素顶部偏移 */
.box {
  position: relative;
  top: 20px;
}
```

---

**基本写法：right 右侧偏移**
`right: <值>;`
```css
/* 设置元素右侧偏移 */
.box {
  position: absolute;
  right: 0;
}
```

---

**基本写法：bottom 底部偏移**
`bottom: <值>;`
```css
/* 设置元素底部偏移 */
.footer {
  position: fixed;
  bottom: 0;
}
```

---

**基本写法：left 左侧偏移**
`left: <值>;`
```css
/* 设置元素左侧偏移 */
.box {
  position: absolute;
  left: 50%;
}
```

---

**单行写法：多方向偏移**
`top: <值>; right: <值>; bottom: <值>; left: <值>;`
```css
/* 单行设置多方向偏移 */
.overlay {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
}
```

---

**换行写法：多方向偏移**
`top: <值>; right: <值>; bottom: <值>; left: <值>;`
```css
/* 换行设置多方向偏移 */
.overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
```

---

## z-index 层叠顺序

**基本写法：z-index 层级**
`z-index: <数值>;`
```css
/* 设置元素层叠顺序 */
.modal {
  position: fixed;
  z-index: 1000;
}
```

---

**基本写法：z-index 负值**
`z-index: <-值>;`
```css
/* 将元素置于背景之后 */
.background {
  position: absolute;
  z-index: -1;
}
```

---

**基本写法：z-index auto**
`z-index: auto;`
```css
/* 默认层叠顺序 */
.box {
  position: relative;
  z-index: auto;
}
```

---

## 居中定位

**基本写法：绝对定位水平居中**
`left: 50%; transform: translateX(-50%);`
```css
/* 绝对定位元素水平居中 */
.center-x {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
```

---

**基本写法：绝对定位垂直居中**
`top: 50%; transform: translateY(-50%);`
```css
/* 绝对定位元素垂直居中 */
.center-y {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}
```

---

**基本写法：绝对定位双居中**
`top: 50%; left: 50%; transform: translate(-50%, -50%);`
```css
/* 绝对定位元素水平垂直居中 */
.center-xy {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

---

**基本写法：inset 居中**
`inset: 0; margin: auto;`
```css
/* 使用 inset 实现居中 */
.center-inset {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 200px;
  height: 200px;
}
```

---

## inset 简写

**基本写法：inset 统一值**
`inset: <值>;`
```css
/* 四个方向偏移相同 */
.box {
  position: absolute;
  inset: 10px;
}
```

---

**基本写法：inset 双值**
`inset: <上下> <左右>;`
```css
/* 上下 10px，左右 20px */
.box {
  position: absolute;
  inset: 10px 20px;
}
```

---

**单行写法：inset 四值**
`inset: <上> <右> <下> <左>;`
```css
/* 单行设置四个方向偏移 */
.box {
  position: absolute;
  inset: 10px 20px 30px 40px;
}
```

---

**换行写法：inset 四值**
`inset: <上> <右> <下> <左>;`
```css
/* 换行设置四个方向偏移 */
.box {
  position: absolute;
  inset:
    10px
    20px
    30px
    40px;
}
```

---

## float 浮动

**基本写法：float 左浮动**
`float: left;`
```css
/* 元素向左浮动 */
.image {
  float: left;
  margin-right: 10px;
}
```

---

**基本写法：float 右浮动**
`float: right;`
```css
/* 元素向右浮动 */
.sidebar {
  float: right;
  width: 300px;
}
```

---

**基本写法：float none 不浮动**
`float: none;`
```css
/* 取消浮动 */
.no-float {
  float: none;
}
```

---

**基本写法：clear 清除浮动**
`clear: both;`
```css
/* 清除两侧浮动 */
.clearfix {
  clear: both;
}
```

---

**基本写法：clear 左侧清除**
`clear: left;`
```css
/* 清除左侧浮动 */
.box {
  clear: left;
}
```

---

**基本写法：clearfix 伪元素**
`.clearfix::after { content: ""; display: table; clear: both; }`
```css
/* 使用伪元素清除浮动 */
.clearfix::after {
  content: "";
  display: table;
  clear: both;
}
```

---

## clip 裁剪

**基本写法：clip-path 矩形裁剪**
`clip-path: inset(<值>);`
```css
/* 矩形裁剪 */
.box {
  clip-path: inset(10px);
}
```

---

**基本写法：clip-path 圆形裁剪**
`clip-path: circle(<半径> at <位置>);`
```css
/* 圆形裁剪 */
.avatar {
  clip-path: circle(50% at 50% 50%);
}
```

---

**基本写法：clip-path 椭圆裁剪**
`clip-path: ellipse(<水平> <垂直> at <位置>);`
```css
/* 椭圆裁剪 */
.box {
  clip-path: ellipse(50% 30% at 50% 50%);
}
```

---

**基本写法：clip-path 多边形裁剪**
`clip-path: polygon(<点1>, <点2>, ...);`
```css
/* 三角形裁剪 */
.triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}
```

---

## transform 变换

**基本写法：translate 平移**
`transform: translate(<x>, <y>);`
```css
/* 平移元素 */
.box {
  transform: translate(50px, 100px);
}
```

---

**基本写法：translateX 水平平移**
`transform: translateX(<值>);`
```css
/* 水平平移 */
.box {
  transform: translateX(100px);
}
```

---

**基本写法：translateY 垂直平移**
`transform: translateY(<值>);`
```css
/* 垂直平移 */
.box {
  transform: translateY(50px);
}
```

---

**基本写法：scale 缩放**
`transform: scale(<比例>);`
```css
/* 等比缩放 */
.box {
  transform: scale(1.5);
}
```

---

**基本写法：scale 双向缩放**
`transform: scale(<x>, <y>);`
```css
/* 分别设置 x 和 y 缩放 */
.box {
  transform: scale(2, 0.5);
}
```

---

**基本写法：rotate 旋转**
`transform: rotate(<角度>);`
```css
/* 旋转元素 */
.box {
  transform: rotate(45deg);
}
```

---

**基本写法：skew 倾斜**
`transform: skew(<x>, <y>);`
```css
/* 倾斜元素 */
.box {
  transform: skew(10deg, 5deg);
}
```

---

**单行写法：多重变换**
`transform: <变换1> <变换2> <变换3>;`
```css
/* 单行组合多个变换 */
.box {
  transform: translate(50px, 50px) rotate(45deg) scale(1.5);
}
```

---

**换行写法：多重变换**
`transform: <变换1> <变换2> <变换3>;`
```css
/* 换行组合多个变换 */
.box {
  transform:
    translate(50px, 50px)
    rotate(45deg)
    scale(1.5);
}
```

---

**基本写法：transform-origin 变换原点**
`transform-origin: <x> <y>;`
```css
/* 设置变换原点 */
.box {
  transform-origin: top left;
  transform: rotate(45deg);
}
```

---

**基本写法：transform 3D 平移**
`transform: translate3d(<x>, <y>, <z>);`
```css
/* 3D 平移 */
.box {
  transform: translate3d(10px, 20px, 30px);
}
```

---

**基本写法：perspective 透视**
`perspective: <值>;`
```css
/* 设置 3D 透视距离 */
.container {
  perspective: 1000px;
}
```

---

**基本写法：transform-style 3D 空间**
`transform-style: preserve-3d;`
```css
/* 子元素保持 3D 位置 */
.container {
  transform-style: preserve-3d;
}
```

---

## 定位上下文

**基本写法：建立定位上下文**
`position: relative;`
```css
/* 父元素建立定位上下文 */
.parent {
  position: relative;
}
.child {
  position: absolute;
}
```

---

**基本写法：transform 建立上下文**
`transform: translateZ(0);`
```css
/* 使用 transform 创建定位上下文 */
.parent {
  transform: translateZ(0);
}
```

---

**基本写法：will-change 优化**
`will-change: <属性>;`
```css
/* 提示浏览器优化变换 */
.animated {
  will-change: transform;
}
```

---

## 层叠上下文

**基本写法：opacity 创建层叠上下文**
`opacity: <值>;`
```css
/* opacity 小于 1 创建层叠上下文 */
.overlay {
  opacity: 0.9;
}
```

---

**基本写法：filter 创建层叠上下文**
`filter: <滤镜>;`
```css
/* filter 创建层叠上下文 */
.blur {
  filter: blur(5px);
}
```

---

**基本写法：isolation 隔离**
`isolation: isolate;`
```css
/* 创建独立的层叠上下文 */
.modal {
  isolation: isolate;
}
```
