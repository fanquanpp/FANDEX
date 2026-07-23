# CSS Grid 网格布局

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 容器属性

**基本写法：grid 容器**
`display: grid;`
```css
/* 设置为网格容器 */
.container {
  display: grid;
}
```

---

**基本写法：inline-grid 行内容器**
`display: inline-grid;`
```css
/* 设置为行内网格容器 */
.badge {
  display: inline-grid;
}
```

---

**基本写法：grid-template-columns 固定列**
`grid-template-columns: <宽度> <宽度> ...;`
```css
/* 定义固定列宽 */
.container {
  grid-template-columns: 200px 200px 200px;
}
```

---

**基本写法：grid-template-columns fr 单位**
`grid-template-columns: <比例> <比例> ...;`
```css
/* 使用 fr 比例单位 */
.container {
  grid-template-columns: 1fr 2fr 1fr;
}
```

---

**基本写法：grid-template-columns repeat**
`grid-template-columns: repeat(<次数>, <宽度>);`
```css
/* 重复定义列 */
.container {
  grid-template-columns: repeat(3, 1fr);
}
```

---

**基本写法：grid-template-columns auto-fill**
`grid-template-columns: repeat(auto-fill, minmax(<最小>, 1fr));`
```css
/* 自动填充列数 */
.container {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}
```

---

**基本写法：grid-template-columns auto-fit**
`grid-template-columns: repeat(auto-fit, minmax(<最小>, 1fr));`
```css
/* 自动适应列数 */
.container {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

---

**基本写法：grid-template-rows 固定行**
`grid-template-rows: <高度> <高度> ...;`
```css
/* 定义固定行高 */
.container {
  grid-template-rows: 100px 200px;
}
```

---

**基本写法：grid-template-rows fr 单位**
`grid-template-rows: <比例> <比例> ...;`
```css
/* 使用 fr 比例单位 */
.container {
  grid-template-rows: 1fr 2fr;
}
```

---

**基本写法：grid-template-areas 区域**
`grid-template-areas: "<区域定义>" ...;`
```css
/* 定义网格区域 */
.layout {
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
}
```

---

**基本写法：grid-template 简写**
`grid-template: <行定义> / <列定义>;`
```css
/* 同时定义行和列 */
.container {
  grid-template: 100px 1fr / 200px 1fr;
}
```

---

## 间距属性

**基本写法：gap 间距**
`gap: <值>;`
```css
/* 设置行列间距 */
.grid {
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

## 对齐属性

**基本写法：justify-items 单元格水平对齐**
`justify-items: <对齐方式>;`
```css
/* 单元格内容水平对齐 */
.container {
  justify-items: center;
}
```

---

**基本写法：align-items 单元格垂直对齐**
`align-items: <对齐方式>;`
```css
/* 单元格内容垂直对齐 */
.container {
  align-items: center;
}
```

---

**基本写法：place-items 简写**
`place-items: <垂直> <水平>;`
```css
/* 同时设置垂直水平对齐 */
.container {
  place-items: center center;
}
```

---

**基本写法：justify-content 网格水平对齐**
`justify-content: <对齐方式>;`
```css
/* 整个网格水平对齐 */
.container {
  justify-content: center;
}
```

---

**基本写法：align-content 网格垂直对齐**
`align-content: <对齐方式>;`
```css
/* 整个网格垂直对齐 */
.container {
  align-content: center;
}
```

---

**基本写法：place-content 简写**
`place-content: <垂直> <水平>;`
```css
/* 同时设置网格垂直水平对齐 */
.container {
  place-content: center center;
}
```

---

## 子元素属性

**基本写法：grid-column-start 起始列**
`grid-column-start: <数值>;`
```css
/* 设置起始列 */
.item {
  grid-column-start: 2;
}
```

---

**基本写法：grid-column-end 结束列**
`grid-column-end: <数值>;`
```css
/* 设置结束列 */
.item {
  grid-column-end: 4;
}
```

---

**基本写法：grid-column 简写**
`grid-column: <起始> / <结束>;`
```css
/* 同时设置起始结束列 */
.item {
  grid-column: 1 / 3;
}
```

---

**基本写法：grid-column 跨度**
`grid-column: span <数值>;`
```css
/* 设置跨列数 */
.item {
  grid-column: span 2;
}
```

---

**基本写法：grid-row-start 起始行**
`grid-row-start: <数值>;`
```css
/* 设置起始行 */
.item {
  grid-row-start: 1;
}
```

---

**基本写法：grid-row-end 结束行**
`grid-row-end: <数值>;`
```css
/* 设置结束行 */
.item {
  grid-row-end: 3;
}
```

---

**基本写法：grid-row 简写**
`grid-row: <起始> / <结束>;`
```css
/* 同时设置起始结束行 */
.item {
  grid-row: 1 / 3;
}
```

---

**基本写法：grid-row 跨度**
`grid-row: span <数值>;`
```css
/* 设置跨行数 */
.item {
  grid-row: span 2;
}
```

---

**基本写法：grid-area 区域命名**
`grid-area: <区域名>;`
```css
/* 指定区域名 */
.header {
  grid-area: header;
}
```

---

**基本写法：grid-area 简写**
`grid-area: <起始行> / <起始列> / <结束行> / <结束列>;`
```css
/* 同时设置行列起始结束 */
.item {
  grid-area: 1 / 1 / 3 / 3;
}
```

---

**基本写法：justify-self 单独水平对齐**
`justify-self: <对齐方式>;`
```css
/* 单独设置水平对齐 */
.item {
  justify-self: start;
}
```

---

**基本写法：align-self 单独垂直对齐**
`align-self: <对齐方式>;`
```css
/* 单独设置垂直对齐 */
.item {
  align-self: end;
}
```

---

**基本写法：place-self 简写**
`place-self: <垂直> <水平>;`
```css
/* 同时设置单独垂直水平对齐 */
.item {
  place-self: center center;
}
```

---

## 自动布局

**基本写法：grid-auto-rows 自动行高**
`grid-auto-rows: <高度>;`
```css
/* 设置自动行高 */
.container {
  grid-auto-rows: 100px;
}
```

---

**基本写法：grid-auto-columns 自动列宽**
`grid-auto-columns: <宽度>;`
```css
/* 设置自动列宽 */
.container {
  grid-auto-columns: 200px;
}
```

---

**基本写法：grid-auto-flow 行方向**
`grid-auto-flow: row;`
```css
/* 自动填充按行排列 */
.container {
  grid-auto-flow: row;
}
```

---

**基本写法：grid-auto-flow 列方向**
`grid-auto-flow: column;`
```css
/* 自动填充按列排列 */
.container {
  grid-auto-flow: column;
}
```

---

**基本写法：grid-auto-flow 密集填充**
`grid-auto-flow: row dense;`
```css
/* 密集填充空缺 */
.container {
  grid-auto-flow: row dense;
}
```

---

## 常见布局模式

**基本写法：圣杯布局**
`grid-template-areas: "<区域定义>";`
```css
/* 经典三栏布局 */
.holy-grail {
  display: grid;
  grid-template-areas:
    "header header header"
    "nav main aside"
    "footer footer footer";
  grid-template-rows: 60px 1fr 40px;
  grid-template-columns: 200px 1fr 200px;
}
```

---

**基本写法：卡片网格**
`grid-template-columns: repeat(auto-fill, minmax(<值>, 1fr));`
```css
/* 响应式卡片网格 */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}
```

---

**基本写法：12 列网格**
`grid-template-columns: repeat(12, 1fr);`
```css
/* 12 列网格系统 */
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
}
.col-6 {
  grid-column: span 6;
}
```

---

**基本写法：水平垂直居中**
`display: grid; place-items: center;`
```css
/* Grid 实现水平垂直居中 */
.center {
  display: grid;
  place-items: center;
}
```

---

**基本写法：响应式网格**
`grid-template-columns: repeat(auto-fit, minmax(<值>, 1fr));`
```css
/* 自动适应屏幕的网格 */
.responsive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
  gap: 20px;
}
```

---

## 命名网格线

**基本写法：命名网格线**
`grid-template-columns: [<线名>] <宽度> [<线名>] <宽度>;`
```css
/* 使用命名网格线 */
.container {
  grid-template-columns: [start] 200px [middle] 1fr [end];
}
```

---

**基本写法：引用命名网格线**
`grid-column-start: <线名>;`
```css
/* 引用命名网格线 */
.item {
  grid-column-start: start;
  grid-column-end: end;
}
```

---

**基本写法：多名称网格线**
`grid-template-columns: [<名1> <名2>] <宽度>;`
```css
/* 网格线多个名称 */
.container {
  grid-template-columns: [start sidebar-start] 200px [main-start] 1fr [end];
}
```

---

## 子网格

**基本写法：subgrid 子网格**
`grid-template-columns: subgrid;`
```css
/* 子元素继承父网格 */
.nested {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / 4;
}
```

---

**基本写法：subgrid 子网格行**
`grid-template-rows: subgrid;`
```css
/* 子元素继承父网格行 */
.nested {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: 1 / 3;
}
```

---

## 响应式 Grid

**基本写法：嵌套媒体查询**
`@media (max-width: <值>) { grid-template-columns: 1fr; }`
```css
/* 小屏幕切换为单列 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

---

**基本写法：嵌套媒体查询**
`.grid { display: grid; @media (max-width: <值>) { grid-template-columns: 1fr; } }`
```css
/* CSS 原生嵌套媒体查询 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}
```

---

**基本写法：minmax 响应式**
`grid-template-columns: repeat(auto-fit, minmax(<最小>, <最大>));`
```css
/* 使用 minmax 实现响应式 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

---

## Grid 新特性

**基本写法：subgrid 子网格**
`grid-template-columns: subgrid;`
```css
/* 子网格继承父网格的轨道定义 */
.card {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
}
.card-body {
  display: grid;
  /* 继承父网格列定义与间距 */
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
}
```

---

**基本写法：grid-template-rows/columns masonry 砌体布局**
`grid-template-rows: masonry;`
```css
/* 砌体布局:类似 Pinterest 瀑布流 */
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  /* 行轨道按砌体方式排列 */
  grid-template-rows: masonry;
  gap: 16px;
}
```

---

**基本写法：grid auto-fit 与 auto-fill 区别**
`grid-template-columns: repeat(auto-fit|auto-fill, minmax(<值>, 1fr));`
```css
/* auto-fit:空轨道折叠,元素拉伸填满 */
.grid-fit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
/* auto-fill:保留空轨道,元素不拉伸 */
.grid-fill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}
```

---

**基本写法：Container Query 与 Grid 结合**
`container-type: inline-size; @container <名称> (min-width: <值>) { grid-template-columns: <值>; }`
```css
/* 容器查询驱动 Grid 布局响应式 */
.cards-wrapper {
  container-type: inline-size;
  container-name: cards;
}
.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@container cards (min-width: 600px) {
  .cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
@container cards (min-width: 900px) {
  .cards {
    grid-template-columns: repeat(3, 1fr);
  }
}
```
