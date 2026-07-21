# CSS 背景增强

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## background-color 背景颜色

**基本写法：纯色背景**
`background-color: <颜色>;`
```css
/* 设置纯色背景 */
.box {
  background-color: #007bff;
}
```

---

**基本写法：透明背景**
`background-color: transparent;`
```css
/* 设置透明背景 */
.box {
  background-color: transparent;
}
```

---

**基本写法：rgba 半透明**
`background-color: rgba(<红>, <绿>, <蓝>, <透明度>);`
```css
/* 设置半透明背景 */
.overlay {
  background-color: rgba(0, 0, 0, 0.5);
}
```

---

**基本写法：hsl 颜色**
`background-color: hsl(<色相>, <饱和度>, <亮度>);`
```css
/* 使用 HSL 设置背景 */
.box {
  background-color: hsl(210, 100%, 50%);
}
```

---

## background-image 背景图片

**基本写法：url 背景图片**
`background-image: url("<路径>");`
```css
/* 设置背景图片 */
.hero {
  background-image: url("hero.jpg");
}
```

---

**基本写法：渐变背景**
`background-image: linear-gradient(<方向>, <颜色1>, <颜色2>);`
```css
/* 设置渐变背景 */
.header {
  background-image: linear-gradient(135deg, #007bff, #0056b3);
}
```

---

**单行写法：多重背景**
`background-image: <背景1>, <背景2>;`
```css
/* 单行设置多重背景 */
.box {
  background-image: url("overlay.png"), linear-gradient(135deg, #007bff, #0056b3);
}
```

---

**换行写法：多重背景**
`background-image: <背景1>, <背景2>, <背景3>;`
```css
/* 换行设置多重背景 */
.box {
  background-image:
    url("top-layer.png"),
    url("middle-layer.png"),
    linear-gradient(135deg, #007bff, #0056b3);
}
```

---

## background-repeat 重复

**基本写法：no-repeat 不重复**
`background-repeat: no-repeat;`
```css
/* 背景图片不重复 */
.hero {
  background-repeat: no-repeat;
}
```

---

**基本写法：repeat 重复**
`background-repeat: repeat;`
```css
/* 背景图片重复 */
.pattern {
  background-repeat: repeat;
}
```

---

**基本写法：repeat-x 水平重复**
`background-repeat: repeat-x;`
```css
/* 水平方向重复 */
.strip {
  background-repeat: repeat-x;
}
```

---

**基本写法：repeat-y 垂直重复**
`background-repeat: repeat-y;`
```css
/* 垂直方向重复 */
.strip {
  background-repeat: repeat-y;
}
```

---

**基本写法：round 适应重复**
`background-repeat: round;`
```css
/* 图片缩放适应重复 */
.pattern {
  background-repeat: round;
}
```

---

**基本写法：space 间隔重复**
`background-repeat: space;`
```css
/* 图片不裁剪间隔重复 */
.pattern {
  background-repeat: space;
}
```

---

## background-size 尺寸

**基本写法：cover 覆盖**
`background-size: cover;`
```css
/* 背景图片覆盖整个容器 */
.hero {
  background-size: cover;
}
```

---

**基本写法：contain 包含**
`background-size: contain;`
```css
/* 背景图片完整显示 */
.logo {
  background-size: contain;
}
```

---

**基本写法：固定尺寸**
`background-size: <宽度> <高度>;`
```css
/* 设置固定尺寸 */
.box {
  background-size: 100px 100px;
}
```

---

**基本写法：百分比尺寸**
`background-size: <百分比>;`
```css
/* 设置百分比尺寸 */
.box {
  background-size: 50% 50%;
}
```

---

## background-position 位置

**基本写法：关键字定位**
`background-position: <水平> <垂直>;`
```css
/* 使用关键字定位 */
.hero {
  background-position: center center;
}
```

---

**基本写法：百分比定位**
`background-position: <水平> <垂直>;`
```css
/* 使用百分比定位 */
.hero {
  background-position: 50% 50%;
}
```

---

**基本写法：像素定位**
`background-position: <x> <y>;`
```css
/* 使用像素定位 */
.sprite {
  background-position: -20px -40px;
}
```

---

**基本写法：top left 左上**
`background-position: top left;`
```css
/* 左上角定位 */
.box {
  background-position: top left;
}
```

---

**基本写法：center 居中**
`background-position: center;`
```css
/* 居中定位 */
.box {
  background-position: center;
}
```

---

## background-attachment 附件

**基本写法：scroll 滚动**
`background-attachment: scroll;`
```css
/* 背景随页面滚动 */
.box {
  background-attachment: scroll;
}
```

---

**基本写法：fixed 固定**
`background-attachment: fixed;`
```css
/* 背景固定不滚动 */
.hero {
  background-attachment: fixed;
}
```

---

**基本写法：local 局部滚动**
`background-attachment: local;`
```css
/* 背景随元素内容滚动 */
.scroll-box {
  background-attachment: local;
}
```

---

## background-origin 起点

**基本写法：padding-box 内边距起点**
`background-origin: padding-box;`
```css
/* 背景从 padding 区域开始 */
.box {
  background-origin: padding-box;
}
```

---

**基本写法：border-box 边框起点**
`background-origin: border-box;`
```css
/* 背景从 border 区域开始 */
.box {
  background-origin: border-box;
}
```

---

**基本写法：content-box 内容起点**
`background-origin: content-box;`
```css
/* 背景从 content 区域开始 */
.box {
  background-origin: content-box;
}
```

---

## background-clip 裁剪

**基本写法：border-box 边框裁剪**
`background-clip: border-box;`
```css
/* 背景裁剪到边框区域 */
.box {
  background-clip: border-box;
}
```

---

**基本写法：padding-box 内边距裁剪**
`background-clip: padding-box;`
```css
/* 背景裁剪到内边距区域 */
.box {
  background-clip: padding-box;
}
```

---

**基本写法：content-box 内容裁剪**
`background-clip: content-box;`
```css
/* 背景裁剪到内容区域 */
.box {
  background-clip: content-box;
}
```

---

**基本写法：text 文字裁剪**
`background-clip: text;`
```css
/* 背景裁剪为文字形状 */
.gradient-text {
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
```

---

## background 简写

**基本写法：background 简写**
`background: <颜色> url("<路径>") <重复> <位置>/<尺寸> <附件>;`
```css
/* 同时设置多个背景属性 */
.hero {
  background: #007bff url("hero.jpg") no-repeat center/cover fixed;
}
```

---

**单行写法：多重背景简写**
`background: <背景1>, <背景2>;`
```css
/* 单行设置多重背景 */
.box {
  background: url("top.png") no-repeat top left, url("bottom.png") no-repeat bottom right;
}
```

---

**换行写法：多重背景简写**
`background: <背景1>, <背景2>, <背景3>;`
```css
/* 换行设置多重背景 */
.box {
  background:
    url("top.png") no-repeat top left,
    url("middle.png") no-repeat center,
    url("bottom.png") no-repeat bottom right;
}
```

---

## 多重背景

**基本写法：多重背景图片**
`background-image: url("<图片1>"), url("<图片2>");`
```css
/* 多重背景图片叠加 */
.box {
  background-image: url("overlay.png"), url("base.jpg");
}
```

---

**基本写法：多重背景位置**
`background-position: <位置1>, <位置2>;`
```css
/* 分别设置多重背景位置 */
.box {
  background-position: top left, bottom right;
}
```

---

**基本写法：多重背景尺寸**
`background-size: <尺寸1>, <尺寸2>;`
```css
/* 分别设置多重背景尺寸 */
.box {
  background-size: 50% 50%, cover;
}
```

---

**基本写法：多重背景重复**
`background-repeat: <重复1>, <重复2>;`
```css
/* 分别设置多重背景重复方式 */
.box {
  background-repeat: no-repeat, repeat;
}
```

---

## background-blend-mode 混合

**基本写法：multiply 正片叠底**
`background-blend-mode: multiply;`
```css
/* 背景混合模式 */
.box {
  background-image: url("texture.png"), linear-gradient(red, blue);
  background-blend-mode: multiply;
}
```

---

**基本写法：screen 滤色**
`background-blend-mode: screen;`
```css
/* 滤色混合模式 */
.box {
  background-blend-mode: screen;
}
```

---

**基本写法：overlay 叠加**
`background-blend-mode: overlay;`
```css
/* 叠加混合模式 */
.box {
  background-blend-mode: overlay;
}
```

---

**基本写法：mix-blend-mode 元素混合**
`mix-blend-mode: <模式>;`
```css
/* 元素与背景混合 */
.text {
  mix-blend-mode: difference;
}
```

---

## 背景渐变

**基本写法：线性渐变**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>);`
```css
/* 线性渐变背景 */
.header {
  background: linear-gradient(135deg, #007bff, #0056b3);
}
```

---

**基本写法：多色线性渐变**
`background: linear-gradient(<方向>, <颜色1>, <颜色2>, <颜色3>);`
```css
/* 多色线性渐变 */
.rainbow {
  background: linear-gradient(90deg, red, yellow, green);
}
```

---

**基本写法：径向渐变**
`background: radial-gradient(<形状>, <颜色1>, <颜色2>);`
```css
/* 径向渐变背景 */
.radial {
  background: radial-gradient(circle, #007bff, #0056b3);
}
```

---

**基本写法：圆锥渐变**
`background: conic-gradient(<颜色1>, <颜色2>, <颜色1>);`
```css
/* 圆锥渐变背景 */
.conic {
  background: conic-gradient(red, yellow, green, red);
}
```

---

**基本写法：重复线性渐变**
`background: repeating-linear-gradient(<方向>, <颜色1>, <颜色2> <宽度>);`
```css
/* 重复线性渐变 */
.stripes {
  background: repeating-linear-gradient(45deg, #007bff, #007bff 10px, #0056b3 10px, #0056b3 20px);
}
```

---

## 背景遮罩

**基本写法：mask 遮罩图片**
`mask-image: url("<遮罩>");`
```css
/* 使用图片作为遮罩 */
.box {
  mask-image: url("mask.png");
  -webkit-mask-image: url("mask.png");
}
```

---

**基本写法：mask 渐变遮罩**
`mask-image: linear-gradient(<方向>, <颜色1>, <颜色2>);`
```css
/* 使用渐变作为遮罩 */
.fade {
  mask-image: linear-gradient(to bottom, black, transparent);
  -webkit-mask-image: linear-gradient(to bottom, black, transparent);
}
```

---

**基本写法：mask-size 遮罩尺寸**
`mask-size: cover;`
```css
/* 遮罩尺寸覆盖 */
.box {
  mask-size: cover;
  -webkit-mask-size: cover;
}
```

---

**基本写法：mask-repeat 遮罩重复**
`mask-repeat: no-repeat;`
```css
/* 遮罩不重复 */
.box {
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
}
```

---

## 背景滤镜

**基本写法：backdrop-filter 模糊**
`backdrop-filter: blur(<值>);`
```css
/* 背景模糊效果 */
.glass {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
```

---

**基本写法：backdrop-filter 亮度**
`backdrop-filter: brightness(<值>);`
```css
/* 背景亮度调整 */
.glass {
  backdrop-filter: brightness(1.2);
}
```

---

**基本写法：backdrop-filter 饱和度**
`backdrop-filter: saturate(<值>);`
```css
/* 背景饱和度调整 */
.glass {
  backdrop-filter: saturate(1.5);
}
```

---

**单行写法：多重 backdrop-filter**
`backdrop-filter: <滤镜1> <滤镜2>;`
```css
/* 单行组合多个背景滤镜 */
.glass {
  backdrop-filter: blur(10px) brightness(1.1) saturate(1.2);
}
```

---

**换行写法：多重 backdrop-filter**
`backdrop-filter: <滤镜1> <滤镜2> <滤镜3>;`
```css
/* 换行组合多个背景滤镜 */
.glass {
  backdrop-filter:
    blur(10px)
    brightness(1.1)
    saturate(1.2);
}
```

---

## CSS 背景新特性

**基本写法：background-clip 多值裁剪**
`background-clip: border-box|padding-box|content-box|text;`
```css
/* 控制背景绘制范围 */
.box {
  /* 背景延伸到边框外缘 */
  background-clip: border-box;
}
.text-gradient {
  /* 背景被裁剪为文字形状 */
  background: linear-gradient(90deg, #007bff, #00d4ff);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
```

---

**基本写法：多重背景与 mix-blend-mode**
`background-image: <层1>, <层2>; mix-blend-mode: <模式>;`
```css
/* 多重背景叠加混合模式 */
.hero {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
    url("hero.jpg");
  background-size: cover;
}
.overlay {
  mix-blend-mode: multiply;
  background: linear-gradient(red, blue);
}
```

---

**基本写法：backdrop-filter 背景滤镜**
`backdrop-filter: <滤镜函数>;`
```css
/* 毛玻璃效果:对元素背后内容应用滤镜 */
.glass {
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

---

**基本写法：scroll-driven animations view-timeline**
`animation-timeline: view();`
```css
/* 滚动驱动动画:元素进出视口触发 */
@keyframes reveal {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}
.card {
  animation: reveal linear;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}
```
