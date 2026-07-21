# CSS 选择器系统

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基础选择器

**基本写法：元素选择器**
`<标签名> { <样式声明> }`
```css
/* 选中所有 div 元素 */
div {
  display: block;
}
```

---

**基本写法：类选择器**
`.<类名> { <样式声明> }`
```css
/* 选中所有带 container 类的元素 */
.container {
  width: 100%;
}
```

---

**基本写法：ID 选择器**
`#<ID名> { <样式声明> }`
```css
/* 选中 id 为 header 的元素 */
#header {
  position: sticky;
}
```

---

**基本写法：通配选择器**
`* { <样式声明> }`
```css
/* 选中所有元素 */
* {
  margin: 0;
  padding: 0;
}
```

---

**基本写法：属性选择器存在**
`[<属性名>] { <样式声明> }`
```css
/* 选中所有带 disabled 属性的元素 */
[disabled] {
  opacity: 0.5;
}
```

---

**基本写法：属性选择器精确匹配**
`[<属性名>="<值>"] { <样式声明> }`
```css
/* 选中 type 为 text 的 input */
[type="text"] {
  border: 1px solid #ccc;
}
```

---

**基本写法：属性选择器包含单词**
`[<属性名>~="<值>"] { <样式声明> }`
```css
/* 选中 class 包含 active 单词的元素 */
[class~="active"] {
  color: red;
}
```

---

**基本写法：属性选择器前缀匹配**
`[<属性名>^="<值>"] { <样式声明> }`
```css
/* 选中 href 以 https 开头的 a */
[href^="https"] {
  color: green;
}
```

---

**基本写法：属性选择器后缀匹配**
`[<属性名>$="<值>"] { <样式声明> }`
```css
/* 选中 href 以 .pdf 结尾的 a */
[href$=".pdf"] {
  color: red;
}
```

---

**基本写法：属性选择器包含子串**
`[<属性名>*="<值>"] { <样式声明> }`
```css
/* 选中 src 包含 avatar 的 img */
[src*="avatar"] {
  border-radius: 50%;
}
```

---

## 组合选择器

**基本写法：后代选择器**
`<父选择器> <子选择器> { <样式声明> }`
```css
/* 选中 nav 内的所有 a 元素 */
nav a {
  text-decoration: none;
}
```

---

**基本写法：子代选择器**
`<父选择器> > <子选择器> { <样式声明> }`
```css
/* 选中 ul 的直接子元素 li */
ul > li {
  list-style: none;
}
```

---

**基本写法：相邻兄弟选择器**
`<前选择器> + <后选择器> { <样式声明> }`
```css
/* 选中 h1 后紧邻的 p */
h1 + p {
  margin-top: 0;
}
```

---

**基本写法：通用兄弟选择器**
`<前选择器> ~ <后选择器> { <样式声明> }`
```css
/* 选中 h1 后所有的同级 p */
h1 ~ p {
  color: gray;
}
```

---

**单行写法：多选择器分组**
`<选择器1>, <选择器2> { <样式声明> }`
```css
/* 单行同时选中 h1 和 h2 */
h1, h2 {
  font-weight: bold;
}
```

---

**换行写法：多选择器分组**
`<选择器1>, <选择器2>, <选择器3> { <样式声明> }`
```css
/* 换行同时选中多个标题 */
h1,
h2,
h3,
h4 {
  font-family: sans-serif;
}
```

---

## 伪类选择器

**基本写法：hover 悬停**
`<选择器>:hover { <样式声明> }`
```css
/* 鼠标悬停时变色 */
.button:hover {
  background-color: #0056b3;
}
```

---

**基本写法：focus 聚焦**
`<选择器>:focus { <样式声明> }`
```css
/* 输入框聚焦时高亮 */
input:focus {
  border-color: #007bff;
}
```

---

**基本写法：active 激活**
`<选择器>:active { <样式声明> }`
```css
/* 按钮按下时缩小 */
.button:active {
  transform: scale(0.95);
}
```

---

**基本写法：first-child 首个子元素**
`<选择器>:first-child { <样式声明> }`
```css
/* 选中父元素的第一个子元素 */
li:first-child {
  font-weight: bold;
}
```

---

**基本写法：last-child 末尾子元素**
`<选择器>:last-child { <样式声明> }`
```css
/* 选中父元素的最后一个子元素 */
li:last-child {
  border-bottom: none;
}
```

---

**基本写法：nth-child 索引选择**
`<选择器>:nth-child(<n>) { <样式声明> }`
```css
/* 选中第 3 个子元素 */
li:nth-child(3) {
  color: red;
}
```

---

**基本写法：nth-child 奇数**
`<选择器>:nth-child(odd) { <样式声明> }`
```css
/* 选中所有奇数行 */
tr:nth-child(odd) {
  background-color: #f9f9f9;
}
```

---

**基本写法：nth-child 偶数**
`<选择器>:nth-child(even) { <样式声明> }`
```css
/* 选中所有偶数行 */
tr:nth-child(even) {
  background-color: #ffffff;
}
```

---

**基本写法：nth-child 公式**
`<选择器>:nth-child(<公式>) { <样式声明> }`
```css
/* 每隔 3 个元素选中一次 */
li:nth-child(3n+1) {
  color: blue;
}
```

---

**基本写法：not 否定伪类**
`<选择器>:not(<排除选择器>) { <样式声明> }`
```css
/* 选中所有非 disabled 的 input */
input:not([disabled]) {
  border: 1px solid #ccc;
}
```

---

**基本写法：checked 选中状态**
`<选择器>:checked { <样式声明> }`
```css
/* 选中被勾选的复选框 */
input:checked {
  accent-color: #007bff;
}
```

---

**基本写法：disabled 禁用状态**
`<选择器>:disabled { <样式声明> }`
```css
/* 选中被禁用的表单元素 */
input:disabled {
  background-color: #f5f5f5;
}
```

---

## 伪元素选择器

**基本写法：before 前置内容**
`<选择器>::before { content: <内容>; <样式声明> }`
```css
/* 在元素前插入内容 */
.quote::before {
  content: '"';
  color: gray;
}
```

---

**基本写法：after 后置内容**
`<选择器>::after { content: <内容>; <样式声明> }`
```css
/* 在元素后插入内容 */
.quote::after {
  content: '"';
  color: gray;
}
```

---

**基本写法：first-letter 首字母**
`<选择器>::first-letter { <样式声明> }`
```css
/* 选中段落首字母 */
p::first-letter {
  font-size: 2em;
  font-weight: bold;
}
```

---

**基本写法：first-line 首行**
`<选择器>::first-line { <样式声明> }`
```css
/* 选中段落首行 */
p::first-line {
  text-transform: uppercase;
}
```

---

**基本写法：selection 选中文本**
`<选择器>::selection { <样式声明> }`
```css
/* 自定义文本选中样式 */
::selection {
  background-color: #007bff;
  color: white;
}
```

---

**基本写法：placeholder 占位符**
`<选择器>::placeholder { <样式声明> }`
```css
/* 自定义输入框占位符样式 */
input::placeholder {
  color: #999;
}
```

---

## 结构伪类

**基本写法：first-of-type 同类型首个**
`<选择器>:first-of-type { <样式声明> }`
```css
/* 选中同级同类型的第一个元素 */
p:first-of-type {
  margin-top: 0;
}
```

---

**基本写法：last-of-type 同类型末尾**
`<选择器>:last-of-type { <样式声明> }`
```css
/* 选中同级同类型的最后一个元素 */
p:last-of-type {
  margin-bottom: 0;
}
```

---

**基本写法：nth-of-type 索引选择**
`<选择器>:nth-of-type(<n>) { <样式声明> }`
```css
/* 选中第 2 个 p 元素 */
p:nth-of-type(2) {
  color: blue;
}
```

---

**基本写法：only-child 唯一子元素**
`<选择器>:only-child { <样式声明> }`
```css
/* 选中父元素中唯一的子元素 */
div:only-child {
  border: 1px solid red;
}
```

---

**基本写法：empty 空元素**
`<选择器>:empty { <样式声明> }`
```css
/* 选中没有子元素的元素 */
div:empty {
  display: none;
}
```

---

## 表单伪类

**基本写法：required 必填字段**
`<选择器>:required { <样式声明> }`
```css
/* 标记必填字段 */
input:required {
  border-color: red;
}
```

---

**基本写法：valid 有效状态**
`<选择器>:valid { <样式声明> }`
```css
/* 表单验证通过时样式 */
input:valid {
  border-color: green;
}
```

---

**基本写法：invalid 无效状态**
`<选择器>:invalid { <样式声明> }`
```css
/* 表单验证失败时样式 */
input:invalid {
  border-color: red;
}
```

---

## 关系选择器

**基本写法：has 父选择器**
`<选择器>:has(<子选择器>) { <样式声明> }`
```css
/* 选中包含 img 的 div */
div:has(img) {
  padding: 10px;
}
```

---

**基本写法：is 匹配任一**
`:is(<选择器1>, <选择器2>) { <样式声明> }`
```css
/* 匹配多个选择器中的任一个 */
:is(h1, h2, h3) {
  font-family: sans-serif;
}
```

---

**基本写法：where 匹配任一**
`:where(<选择器1>, <选择器2>) { <样式声明> }`
```css
/* 匹配多个选择器（零特异性） */
:where(.card, .panel) {
  padding: 1rem;
}
```

---

## 目标伪类

**基本写法：target 锚点目标**
`<选择器>:target { <样式声明> }`
```css
/* 选中当前锚点指向的元素 */
#section:target {
  background-color: #ffffcc;
}
```

---

**基本写法：root 根元素**
`:root { <样式声明> }`
```css
/* 选中文档根元素 html */
:root {
  --primary-color: #007bff;
}
```

---

## 嵌套选择器 (CSS Nesting)

**基本写法：嵌套选择器**
`<父选择器> { & <子选择器> { <样式声明> } }`
```css
/* CSS 原生嵌套语法 */
.card {
  padding: 1rem;
  & h2 {
    color: blue;
  }
}
```

---

**基本写法：嵌套伪类**
`<选择器> { &:<伪类> { <样式声明> } }`
```css
/* 嵌套伪类选择器 */
.button {
  background: blue;
  &:hover {
    background: darkblue;
  }
}
```

---

**基本写法：嵌套媒体查询**
`<选择器> { @media <条件> { <样式声明> } }`
```css
/* 嵌套媒体查询 */
.container {
  width: 100%;
  @media (min-width: 768px) {
    width: 750px;
  }
}
```

---

## CSS Nesting 原生嵌套(2023-2024)

**基本写法：原生嵌套基本语法(& 嵌套)**
`<父选择器> { & <子选择器> { <样式声明> } }`
```css
/* 原生 CSS 嵌套,无需预处理器 */
.card {
  padding: 1rem;
  & .title {
    font-size: 1.5rem;
  }
  & .body {
    color: #333;
  }
}
```

---

**基本写法：嵌套与组合器**
`<选择器> { &<组合器><目标> { <样式声明> } }`
```css
/* 嵌套中直接使用组合器 */
.nav {
  & > li {
    list-style: none;
  }
  & + .sidebar {
    margin-left: 20px;
  }
  & ~ .footer {
    border-top: 1px solid #ccc;
  }
}
```

---

**基本写法：嵌套中的层叠层级**
`<选择器> { & { <样式声明> } }`
```css
/* 显式 & 表示父选择器,影响层叠特异性 */
.button {
  background: blue;
  & {
    /* 等价于 .button 特异性 */
    color: white;
  }
  &:hover {
    /* 等价于 .button:hover */
    background: darkblue;
  }
}
```

---

**基本写法：@scope 作用域选择器(2024)**
`@scope (<根选择器>) to (<下限选择器>) { <样式声明> }`
```css
/* @scope 限定样式作用范围 */
@scope (.article) to (.comment) {
  /* 仅作用于 .article 内、.comment 之外的内容 */
  p {
    line-height: 1.6;
  }
  img {
    max-width: 100%;
  }
}
```

---

**基本写法：@scope 邻近选择器**
`@scope (<条件选择器>) { <样式声明> }`
```css
/* @scope 结合 :has 实现条件作用域 */
@scope (.card:has(img)) {
  /* 仅当 .card 内含图片时应用 */
  .content {
    padding-top: 0;
  }
}
```
