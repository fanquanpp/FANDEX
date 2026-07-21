# CSS 盒模型详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## box-sizing

**基本写法：content-box 标准盒模型**
`box-sizing: content-box;`
```css
/* width/height 只包含内容区 */
.box {
  box-sizing: content-box;
  width: 200px;
  padding: 20px;
}
```

---

**基本写法：border-box 怪异盒模型**
`box-sizing: border-box;`
```css
/* width/height 包含 padding 和 border */
.box {
  box-sizing: border-box;
  width: 200px;
  padding: 20px;
}
```

---

**基本写法：全局 border-box**
`*, *::before, *::after { box-sizing: border-box; }`
```css
/* 全局应用 border-box */
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

---

## width 与 height

**基本写法：固定宽度**
`width: <长度>;`
```css
/* 设置固定宽度 */
.container {
  width: 1200px;
}
```

---

**基本写法：百分比宽度**
`width: <百分比>;`
```css
/* 设置相对于父元素的百分比宽度 */
.half {
  width: 50%;
}
```

---

**基本写法：视口宽度**
`width: <vw值>;`
```css
/* 设置相对于视口宽度的宽度 */
.full {
  width: 100vw;
}
```

---

**基本写法：最大宽度**
`max-width: <长度>;`
```css
/* 限制元素最大宽度 */
.container {
  max-width: 1200px;
  margin: 0 auto;
}
```

---

**基本写法：最小宽度**
`min-width: <长度>;`
```css
/* 限制元素最小宽度 */
.sidebar {
  min-width: 200px;
}
```

---

**基本写法：固定高度**
`height: <长度>;`
```css
/* 设置固定高度 */
.header {
  height: 60px;
}
```

---

**基本写法：视口高度**
`height: <vh值>;`
```css
/* 设置相对于视口高度的高度 */
.hero {
  height: 100vh;
}
```

---

**基本写法：max-height 最大高度**
`max-height: <长度>;`
```css
/* 限制元素最大高度 */
.scroll-area {
  max-height: 400px;
  overflow: auto;
}
```

---

**基本写法：min-height 最小高度**
`min-height: <长度>;`
```css
/* 限制元素最小高度 */
.card {
  min-height: 200px;
}
```

---

## margin 外边距

**基本写法：margin 单值**
`margin: <值>;`
```css
/* 四个方向外边距相同 */
.box {
  margin: 20px;
}
```

---

**基本写法：margin 双值**
`margin: <上下> <左右>;`
```css
/* 上下 20px，左右 10px */
.box {
  margin: 20px 10px;
}
```

---

**基本写法：margin 三值**
`margin: <上> <左右> <下>;`
```css
/* 上 10px，左右 20px，下 30px */
.box {
  margin: 10px 20px 30px;
}
```

---

**单行写法：margin 四值**
`margin: <上> <右> <下> <左>;`
```css
/* 单行设置四个方向外边距 */
.box {
  margin: 10px 20px 30px 40px;
}
```

---

**换行写法：margin 四值**
`margin-top: <值>; margin-right: <值>; margin-bottom: <值>; margin-left: <值>;`
```css
/* 换行设置四个方向外边距 */
.box {
  margin-top: 10px;
  margin-right: 20px;
  margin-bottom: 30px;
  margin-left: 40px;
}
```

---

**基本写法：margin auto 水平居中**
`margin: 0 auto;`
```css
/* 块级元素水平居中 */
.container {
  width: 800px;
  margin: 0 auto;
}
```

---

**基本写法：margin 负值**
`margin-<方向>: <-值>;`
```css
/* 使用负值偏移元素 */
.pull-up {
  margin-top: -20px;
}
```

---

## padding 内边距

**基本写法：padding 单值**
`padding: <值>;`
```css
/* 四个方向内边距相同 */
.box {
  padding: 20px;
}
```

---

**基本写法：padding 双值**
`padding: <上下> <左右>;`
```css
/* 上下 10px，左右 20px */
.box {
  padding: 10px 20px;
}
```

---

**基本写法：padding 三值**
`padding: <上> <左右> <下>;`
```css
/* 上 10px，左右 20px，下 30px */
.box {
  padding: 10px 20px 30px;
}
```

---

**单行写法：padding 四值**
`padding: <上> <右> <下> <左>;`
```css
/* 单行设置四个方向内边距 */
.box {
  padding: 10px 20px 30px 40px;
}
```

---

**换行写法：padding 四值**
`padding-top: <值>; padding-right: <值>; padding-bottom: <值>; padding-left: <值>;`
```css
/* 换行设置四个方向内边距 */
.box {
  padding-top: 10px;
  padding-right: 20px;
  padding-bottom: 30px;
  padding-left: 40px;
}
```

---

## border 边框

**基本写法：border 完整边框**
`border: <宽度> <样式> <颜色>;`
```css
/* 设置完整边框 */
.box {
  border: 1px solid #ccc;
}
```

---

**基本写法：border-width 单值**
`border-width: <值>;`
```css
/* 设置四条边框宽度 */
.box {
  border-width: 2px;
}
```

---

**基本写法：border-style 实线**
`border-style: solid;`
```css
/* 设置边框样式为实线 */
.box {
  border-style: solid;
}
```

---

**基本写法：border-style 虚线**
`border-style: dashed;`
```css
/* 设置边框样式为虚线 */
.box {
  border-style: dashed;
}
```

---

**基本写法：border-color 边框颜色**
`border-color: <颜色>;`
```css
/* 设置边框颜色 */
.box {
  border-color: #007bff;
}
```

---

**基本写法：单边边框**
`border-<方向>: <宽度> <样式> <颜色>;`
```css
/* 仅设置底边边框 */
.box {
  border-bottom: 2px solid red;
}
```

---

**基本写法：无边框**
`border: none;`
```css
/* 移除边框 */
.no-border {
  border: none;
}
```

---

## border-radius 圆角

**基本写法：统一圆角**
`border-radius: <值>;`
```css
/* 四个角相同圆角 */
.box {
  border-radius: 8px;
}
```

---

**基本写法：圆形**
`border-radius: 50%;`
```css
/* 创建圆形元素 */
.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}
```

---

**基本写法：椭圆角**
`border-radius: <水平> / <垂直>;`
```css
/* 设置椭圆角 */
.box {
  border-radius: 50% / 30%;
}
```

---

**单行写法：四角不同圆角**
`border-radius: <左上> <右上> <右下> <左下>;`
```css
/* 单行设置四个角不同圆角 */
.box {
  border-radius: 10px 20px 30px 40px;
}
```

---

**换行写法：四角不同圆角**
`border-top-left-radius: <值>; border-top-right-radius: <值>; border-bottom-right-radius: <值>; border-bottom-left-radius: <值>;`
```css
/* 换行设置四个角不同圆角 */
.box {
  border-top-left-radius: 10px;
  border-top-right-radius: 20px;
  border-bottom-right-radius: 30px;
  border-bottom-left-radius: 40px;
}
```

---

## outline 轮廓

**基本写法：outline 完整轮廓**
`outline: <宽度> <样式> <颜色>;`
```css
/* 设置元素轮廓（不占空间） */
.input:focus {
  outline: 2px solid #007bff;
}
```

---

**基本写法：outline-offset 偏移**
`outline-offset: <值>;`
```css
/* 设置轮廓与元素的距离 */
.button:focus {
  outline: 2px solid blue;
  outline-offset: 4px;
}
```

---

**基本写法：移除轮廓**
`outline: none;`
```css
/* 移除默认轮廓 */
.input:focus {
  outline: none;
}
```

---

## box-shadow 阴影

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

## overflow 溢出

**基本写法：overflow 可见**
`overflow: visible;`
```css
/* 内容溢出时可见 */
.box {
  overflow: visible;
}
```

---

**基本写法：overflow 隐藏**
`overflow: hidden;`
```css
/* 内容溢出时隐藏 */
.box {
  overflow: hidden;
}
```

---

**基本写法：overflow 滚动**
`overflow: scroll;`
```css
/* 始终显示滚动条 */
.box {
  overflow: scroll;
}
```

---

**基本写法：overflow 自动**
`overflow: auto;`
```css
/* 需要时显示滚动条 */
.scroll-area {
  overflow: auto;
}
```

---

**基本写法：overflow-x 水平滚动**
`overflow-x: auto;`
```css
/* 水平方向自动滚动 */
.table-wrapper {
  overflow-x: auto;
}
```

---

**基本写法：overflow-y 垂直滚动**
`overflow-y: auto;`
```css
/* 垂直方向自动滚动 */
.list {
  max-height: 300px;
  overflow-y: auto;
}
```

---

**基本写法：text-overflow 省略号**
`text-overflow: ellipsis;`
```css
/* 文本溢出显示省略号 */
.text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

---

## display 显示类型

**基本写法：block 块级**
`display: block;`
```css
/* 设置为块级元素 */
.span-block {
  display: block;
}
```

---

**基本写法：inline 行内**
`display: inline;`
```css
/* 设置为行内元素 */
.div-inline {
  display: inline;
}
```

---

**基本写法：inline-block 行内块**
`display: inline-block;`
```css
/* 设置为行内块元素 */
.badge {
  display: inline-block;
  padding: 2px 8px;
}
```

---

**基本写法：none 隐藏**
`display: none;`
```css
/* 完全隐藏元素 */
.hidden {
  display: none;
}
```

---

**基本写法：flex 弹性布局**
`display: flex;`
```css
/* 设置为弹性容器 */
.container {
  display: flex;
}
```

---

**基本写法：grid 网格布局**
`display: grid;`
```css
/* 设置为网格容器 */
.layout {
  display: grid;
}
```

---

## visibility 可见性

**基本写法：visible 可见**
`visibility: visible;`
```css
/* 元素可见 */
.box {
  visibility: visible;
}
```

---

**基本写法：hidden 隐藏占位**
`visibility: hidden;`
```css
/* 元素隐藏但保留布局空间 */
.invisible {
  visibility: hidden;
}
```

---

**基本写法：collapse 表格折叠**
`visibility: collapse;`
```css
/* 表格行或列折叠 */
.row {
  visibility: collapse;
}
```

---

## content 内容生成

**基本写法：content 字符串**
`content: "<文本>";`
```css
/* 生成文本内容 */
.label::before {
  content: "标签: ";
}
```

---

**基本写法：content attr 属性**
`content: attr(<属性名>);`
```css
/* 生成元素属性值 */
a::after {
  content: " (" attr(href) ")";
}
```

---

**基本写法：content 空字符串**
`content: "";`
```css
/* 生成空内容用于布局 */
.clearfix::after {
  content: "";
  display: block;
  clear: both;
}
```

---

## 尺寸计算

**基本写法：calc 计算**
`width: calc(<表达式>);`
```css
/* 动态计算宽度 */
.sidebar {
  width: calc(100% - 250px);
}
```

---

**基本写法：calc 混合单位**
`height: calc(<值1> + <值2>);`
```css
/* 混合不同单位计算 */
.hero {
  height: calc(100vh - 60px);
}
```

---

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
`width: max(<值1>, <值2>);`
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
