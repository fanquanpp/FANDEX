# CSS 边框圆角

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## border-radius 基础

**基本写法：统一圆角**
`border-radius: <值>;`
```css
/* 四个角相同圆角 */
.box {
  border-radius: 8px;
}
```

---

**基本写法：百分比圆角**
`border-radius: <百分比>;`
```css
/* 使用百分比圆角 */
.box {
  border-radius: 50%;
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

**基本写法：无圆角**
`border-radius: 0;`
```css
/* 移除圆角 */
.box {
  border-radius: 0;
}
```

---

## border-radius 多值

**基本写法：双值圆角**
`border-radius: <对角1> <对角2>;`
```css
/* 左上右下 和 右上左下 */
.box {
  border-radius: 10px 20px;
}
```

---

**基本写法：三值圆角**
`border-radius: <左上> <右上左下> <右下>;`
```css
/* 三个值设置圆角 */
.box {
  border-radius: 10px 20px 30px;
}
```

---

**单行写法：四值圆角**
`border-radius: <左上> <右上> <右下> <左下>;`
```css
/* 单行设置四个角不同圆角 */
.box {
  border-radius: 10px 20px 30px 40px;
}
```

---

**换行写法：四值圆角**
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

## 单角圆角

**基本写法：左上角圆角**
`border-top-left-radius: <值>;`
```css
/* 仅设置左上角圆角 */
.box {
  border-top-left-radius: 10px;
}
```

---

**基本写法：右上角圆角**
`border-top-right-radius: <值>;`
```css
/* 仅设置右上角圆角 */
.box {
  border-top-right-radius: 10px;
}
```

---

**基本写法：右下角圆角**
`border-bottom-right-radius: <值>;`
```css
/* 仅设置右下角圆角 */
.box {
  border-bottom-right-radius: 10px;
}
```

---

**基本写法：左下角圆角**
`border-bottom-left-radius: <值>;`
```css
/* 仅设置左下角圆角 */
.box {
  border-bottom-left-radius: 10px;
}
```

---

## 椭圆圆角

**基本写法：椭圆角**
`border-radius: <水平> / <垂直>;`
```css
/* 设置椭圆角 */
.box {
  border-radius: 50% / 30%;
}
```

---

**基本写法：单角椭圆**
`border-top-left-radius: <水平> <垂直>;`
```css
/* 左上角椭圆 */
.box {
  border-top-left-radius: 50px 25px;
}
```

---

**基本写法：多角椭圆**
`border-radius: <水平1> <水平2> / <垂直1> <垂直2>;`
```css
/* 多角椭圆 */
.box {
  border-radius: 50px 20px / 25px 10px;
}
```

---

## border 边框

**基本写法：完整边框**
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

**基本写法：border-width 多值**
`border-width: <上> <右> <下> <左>;`
```css
/* 分别设置四条边框宽度 */
.box {
  border-width: 1px 2px 3px 4px;
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

**基本写法：border-style 点线**
`border-style: dotted;`
```css
/* 设置边框样式为点线 */
.box {
  border-style: dotted;
}
```

---

**基本写法：border-style 双线**
`border-style: double;`
```css
/* 设置边框样式为双线 */
.box {
  border-style: double;
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

## 单边边框

**基本写法：顶边边框**
`border-top: <宽度> <样式> <颜色>;`
```css
/* 仅设置顶边边框 */
.box {
  border-top: 2px solid red;
}
```

---

**基本写法：右边边框**
`border-right: <宽度> <样式> <颜色>;`
```css
/* 仅设置右边边框 */
.box {
  border-right: 2px solid red;
}
```

---

**基本写法：底边边框**
`border-bottom: <宽度> <样式> <颜色>;`
```css
/* 仅设置底边边框 */
.box {
  border-bottom: 2px solid red;
}
```

---

**基本写法：左边边框**
`border-left: <宽度> <样式> <颜色>;`
```css
/* 仅设置左边边框 */
.box {
  border-left: 2px solid red;
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

## border-image 边框图片

**基本写法：border-image 简写**
`border-image: url("<图片>") <切片> <重复>;`
```css
/* 使用图片作为边框 */
.box {
  border: 10px solid transparent;
  border-image: url("border.png") 30 round;
}
```

---

**基本写法：border-image-source 图片源**
`border-image-source: url("<图片>");`
```css
/* 设置边框图片源 */
.box {
  border-image-source: url("border.png");
}
```

---

**基本写法：border-image-slice 切片**
`border-image-slice: <值>;`
```css
/* 设置边框图片切片 */
.box {
  border-image-slice: 30;
}
```

---

**基本写法：border-image-width 宽度**
`border-image-width: <值>;`
```css
/* 设置边框图片宽度 */
.box {
  border-image-width: 10px;
}
```

---

**基本写法：border-image-outset 外延**
`border-image-outset: <值>;`
```css
/* 设置边框图片外延 */
.box {
  border-image-outset: 5px;
}
```

---

**基本写法：border-image-repeat 重复**
`border-image-repeat: round;`
```css
/* 边框图片平铺方式 */
.box {
  border-image-repeat: round;
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

**基本写法：outline-style 样式**
`outline-style: <样式>;`
```css
/* 设置轮廓样式 */
.box {
  outline-style: solid;
}
```

---

**基本写法：outline-width 宽度**
`outline-width: <值>;`
```css
/* 设置轮廓宽度 */
.box {
  outline-width: 2px;
}
```

---

**基本写法：outline-color 颜色**
`outline-color: <颜色>;`
```css
/* 设置轮廓颜色 */
.box {
  outline-color: #007bff;
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

## 常见圆角效果

**基本写法：胶囊形**
`border-radius: <高度>;`
```css
/* 创建胶囊形按钮 */
.pill {
  height: 40px;
  border-radius: 20px;
}
```

---

**基本写法：顶部圆角**
`border-radius: <值> <值> 0 0;`
```css
/* 仅顶部圆角 */
.card-top {
  border-radius: 10px 10px 0 0;
}
```

---

**基本写法：底部圆角**
`border-radius: 0 0 <值> <值>;`
```css
/* 仅底部圆角 */
.card-bottom {
  border-radius: 0 0 10px 10px;
}
```

---

**基本写法：左侧圆角**
`border-radius: <值> 0 0 <值>;`
```css
/* 仅左侧圆角 */
.card-left {
  border-radius: 10px 0 0 10px;
}
```

---

**基本写法：右侧圆角**
`border-radius: 0 <值> <值> 0;`
```css
/* 仅右侧圆角 */
.card-right {
  border-radius: 0 10px 10px 0;
}
```

---

**基本写法：不对称圆角**
`border-radius: <值1> <值2> <值3> <值4>;`
```css
/* 创建不对称圆角 */
.blob {
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
}
```

---

## 响应式圆角

**基本写法：clamp 响应式圆角**
`border-radius: clamp(<最小>, <理想>, <最大>);`
```css
/* 响应式圆角 */
.box {
  border-radius: clamp(4px, 2vw, 16px);
}
```

---

**基本写法：媒体查询调整圆角**
`@media (max-width: <值>) { border-radius: <值>; }`
```css
/* 小屏幕调整圆角 */
.box {
  border-radius: 16px;
}
@media (max-width: 768px) {
  .box {
    border-radius: 8px;
  }
}
```

---

**基本写法：嵌套媒体查询圆角**
`.box { border-radius: <值>; @media (max-width: <值>) { border-radius: <值>; } }`
```css
/* CSS 原生嵌套媒体查询圆角 */
.box {
  border-radius: 16px;
  @media (max-width: 768px) {
    border-radius: 8px;
  }
}
```
