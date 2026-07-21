# CSS Flexbox 弹性布局

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 容器属性

**基本写法：flex 容器**
`display: flex;`
```css
/* 设置为弹性容器 */
.container {
  display: flex;
}
```

---

**基本写法：inline-flex 行内容器**
`display: inline-flex;`
```css
/* 设置为行内弹性容器 */
.badge {
  display: inline-flex;
}
```

---

**基本写法：flex-direction 行方向**
`flex-direction: row;`
```css
/* 主轴为水平方向 */
.container {
  flex-direction: row;
}
```

---

**基本写法：flex-direction 列方向**
`flex-direction: column;`
```css
/* 主轴为垂直方向 */
.container {
  flex-direction: column;
}
```

---

**基本写法：flex-direction 反向行**
`flex-direction: row-reverse;`
```css
/* 主轴为水平反向 */
.container {
  flex-direction: row-reverse;
}
```

---

**基本写法：flex-direction 反向列**
`flex-direction: column-reverse;`
```css
/* 主轴为垂直反向 */
.container {
  flex-direction: column-reverse;
}
```

---

**基本写法：flex-wrap 不换行**
`flex-wrap: nowrap;`
```css
/* 子元素不换行 */
.container {
  flex-wrap: nowrap;
}
```

---

**基本写法：flex-wrap 换行**
`flex-wrap: wrap;`
```css
/* 子元素自动换行 */
.container {
  flex-wrap: wrap;
}
```

---

**基本写法：flex-wrap 反向换行**
`flex-wrap: wrap-reverse;`
```css
/* 子元素反向换行 */
.container {
  flex-wrap: wrap-reverse;
}
```

---

**基本写法：flex-flow 简写**
`flex-flow: <方向> <换行>;`
```css
/* 同时设置方向和换行 */
.container {
  flex-flow: row wrap;
}
```

---

**基本写法：justify-content 主轴起始**
`justify-content: flex-start;`
```css
/* 主轴起始对齐 */
.container {
  justify-content: flex-start;
}
```

---

**基本写法：justify-content 主轴居中**
`justify-content: center;`
```css
/* 主轴居中对齐 */
.container {
  justify-content: center;
}
```

---

**基本写法：justify-content 主轴末尾**
`justify-content: flex-end;`
```css
/* 主轴末尾对齐 */
.container {
  justify-content: flex-end;
}
```

---

**基本写法：justify-content 两端对齐**
`justify-content: space-between;`
```css
/* 两端对齐，间距相等 */
.container {
  justify-content: space-between;
}
```

---

**基本写法：justify-content 均匀分布**
`justify-content: space-evenly;`
```css
/* 均匀分布，间距相同 */
.container {
  justify-content: space-evenly;
}
```

---

**基本写法：justify-content 环绕分布**
`justify-content: space-around;`
```css
/* 环绕分布，两端间距为中间一半 */
.container {
  justify-content: space-around;
}
```

---

**基本写法：align-items 交叉轴起始**
`align-items: flex-start;`
```css
/* 交叉轴起始对齐 */
.container {
  align-items: flex-start;
}
```

---

**基本写法：align-items 交叉轴居中**
`align-items: center;`
```css
/* 交叉轴居中对齐 */
.container {
  align-items: center;
}
```

---

**基本写法：align-items 交叉轴末尾**
`align-items: flex-end;`
```css
/* 交叉轴末尾对齐 */
.container {
  align-items: flex-end;
}
```

---

**基本写法：align-items 拉伸**
`align-items: stretch;`
```css
/* 子元素拉伸填满交叉轴 */
.container {
  align-items: stretch;
}
```

---

**基本写法：align-items 基线对齐**
`align-items: baseline;`
```css
/* 基线对齐 */
.container {
  align-items: baseline;
}
```

---

**基本写法：align-content 多行起始**
`align-content: flex-start;`
```css
/* 多行时交叉轴起始对齐 */
.container {
  flex-wrap: wrap;
  align-content: flex-start;
}
```

---

**基本写法：align-content 多行居中**
`align-content: center;`
```css
/* 多行时交叉轴居中对齐 */
.container {
  flex-wrap: wrap;
  align-content: center;
}
```

---

**基本写法：align-content 多行两端对齐**
`align-content: space-between;`
```css
/* 多行时两端对齐 */
.container {
  flex-wrap: wrap;
  align-content: space-between;
}
```

---

**基本写法：gap 间距**
`gap: <值>;`
```css
/* 设置子元素间距 */
.grid {
  display: flex;
  gap: 20px;
}
```

---

**基本写法：gap 双值**
`gap: <行间距> <列间距>;`
```css
/* 分别设置行列间距 */
.grid {
  gap: 20px 10px;
}
```

---

**基本写法：row-gap 行间距**
`row-gap: <值>;`
```css
/* 仅设置行间距 */
.grid {
  row-gap: 20px;
}
```

---

**基本写法：column-gap 列间距**
`column-gap: <值>;`
```css
/* 仅设置列间距 */
.grid {
  column-gap: 10px;
}
```

---

## 子元素属性

**基本写法：flex-grow 放大**
`flex-grow: <数值>;`
```css
/* 子元素放大比例 */
.item {
  flex-grow: 1;
}
```

---

**基本写法：flex-shrink 缩小**
`flex-shrink: <数值>;`
```css
/* 子元素缩小比例 */
.item {
  flex-shrink: 0;
}
```

---

**基本写法：flex-basis 基础尺寸**
`flex-basis: <长度>;`
```css
/* 子元素基础尺寸 */
.item {
  flex-basis: 200px;
}
```

---

**基本写法：flex-basis 百分比**
`flex-basis: <百分比>;`
```css
/* 基础尺寸为百分比 */
.item {
  flex-basis: 50%;
}
```

---

**基本写法：flex 简写**
`flex: <grow> <shrink> <basis>;`
```css
/* 同时设置三个属性 */
.item {
  flex: 1 1 0%;
}
```

---

**基本写法：flex auto**
`flex: auto;`
```css
/* 等价于 flex: 1 1 auto */
.item {
  flex: auto;
}
```

---

**基本写法：flex none**
`flex: none;`
```css
/* 等价于 flex: 0 0 auto */
.item {
  flex: none;
}
```

---

**基本写法：order 排序**
`order: <数值>;`
```css
/* 设置子元素排序 */
.item {
  order: -1;
}
```

---

**基本写法：align-self 单独对齐**
`align-self: <对齐方式>;`
```css
/* 单独设置交叉轴对齐 */
.item {
  align-self: center;
}
```

---

**基本写法：align-self 拉伸**
`align-self: stretch;`
```css
/* 单独拉伸 */
.item {
  align-self: stretch;
}
```

---

## 常见布局模式

**基本写法：水平垂直居中**
`display: flex; justify-content: center; align-items: center;`
```css
/* Flex 实现水平垂直居中 */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

---

**基本写法：两栏布局**
`display: flex;`
```css
/* 左侧固定，右侧自适应 */
.layout {
  display: flex;
}
.sidebar {
  width: 250px;
  flex-shrink: 0;
}
.main {
  flex-grow: 1;
}
```

---

**基本写法：三栏布局**
`display: flex;`
```css
/* 两侧固定，中间自适应 */
.layout {
  display: flex;
}
.left {
  width: 200px;
  flex-shrink: 0;
}
.center {
  flex-grow: 1;
}
.right {
  width: 200px;
  flex-shrink: 0;
}
```

---

**基本写法：等宽分布**
`display: flex;`
```css
/* 子元素等宽分布 */
.equal {
  display: flex;
}
.equal > * {
  flex: 1;
}
```

---

**基本写法：底部固定**
`display: flex; flex-direction: column; min-height: 100vh;`
```css
/* 页脚固定在底部 */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.content {
  flex: 1;
}
```

---

**基本写法：导航栏布局**
`display: flex; justify-content: space-between;`
```css
/* 导航栏两端对齐 */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

---

**基本写法：卡片网格**
`display: flex; flex-wrap: wrap; gap: <值>;`
```css
/* 自适应卡片网格 */
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.card {
  flex: 1 1 300px;
}
```

---

## 响应式 Flex

**基本写法：嵌套媒体查询**
`@media (max-width: <值>) { flex-direction: column; }`
```css
/* 小屏幕切换为列方向 */
.container {
  display: flex;
  flex-direction: row;
}
@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}
```

---

**基本写法：嵌套媒体查询**
`.container { display: flex; @media (max-width: <值>) { flex-direction: column; } }`
```css
/* CSS 原生嵌套媒体查询 */
.container {
  display: flex;
  @media (max-width: 768px) {
    flex-direction: column;
  }
}
```

---

**基本写法：响应式间距**
`gap: clamp(<最小>, <理想>, <最大>);`
```css
/* 响应式间距 */
.grid {
  display: flex;
  gap: clamp(10px, 2vw, 30px);
}
```

---

## Flexbox 新特性

**基本写法：align-content 与 justify-content 在 flex 中的统一**
`justify-content: <值>; align-content: <值>;`
```css
/* 现代浏览器中 align-content 在单行 flex 也生效 */
.flex-container {
  display: flex;
  flex-wrap: wrap;
  /* 主轴与交叉轴均匀分布 */
  justify-content: space-between;
  align-content: space-between;
  min-height: 300px;
}
```

---

**基本写法：gap 属性在 flex 中的应用**
`gap: <行间距> <列间距>;`
```css
/* flex 布局中 gap 自动处理子元素间距 */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  /* 行间距 8px,列间距 16px */
  gap: 8px 16px;
}
.toolbar > * {
  /* 无需 margin 处理间距 */
  flex: 0 0 auto;
}
```

---

**基本写法：flex-basis content 关键字**
`flex-basis: content;`
```css
/* content 表示根据内容自动计算基础尺寸 */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  /* 基础尺寸由内容决定,不再使用 max-content */
  flex-basis: content;
  flex-grow: 0;
  flex-shrink: 1;
}
```
