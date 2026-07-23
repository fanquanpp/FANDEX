# CSS 伪类详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 交互状态伪类

**基本写法：hover 悬停**
`<选择器>:hover { <样式> }`
```css
/* 鼠标悬停状态 */
.button:hover {
  background-color: #0056b3;
}
```

---

**基本写法：focus 聚焦**
`<选择器>:focus { <样式> }`
```css
/* 元素获得焦点 */
input:focus {
  border-color: #007bff;
}
```

---

**基本写法：focus-visible 键盘聚焦**
`<选择器>:focus-visible { <样式> }`
```css
/* 仅键盘聚焦时显示 */
button:focus-visible {
  outline: 2px solid #007bff;
}
```

---

**基本写法：focus-within 子元素聚焦**
`<选择器>:focus-within { <样式> }`
```css
/* 子元素获得焦点时 */
.form:focus-within {
  border-color: #007bff;
}
```

---

**基本写法：active 激活**
`<选择器>:active { <样式> }`
```css
/* 元素被激活（点击） */
.button:active {
  transform: scale(0.95);
}
```

---

**基本写法：visited 已访问**
`<选择器>:visited { <样式> }`
```css
/* 链接已访问状态 */
a:visited {
  color: purple;
}
```

---

**基本写法：link 未访问**
`<选择器>:link { <样式> }`
```css
/* 链接未访问状态 */
a:link {
  color: blue;
}
```

---

## 表单状态伪类

**基本写法：checked 选中**
`<选择器>:checked { <样式> }`
```css
/* 复选框或单选框选中 */
input:checked {
  accent-color: #007bff;
}
```

---

**基本写法：disabled 禁用**
`<选择器>:disabled { <样式> }`
```css
/* 表单元素禁用 */
input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}
```

---

**基本写法：enabled 可用**
`<选择器>:enabled { <样式> }`
```css
/* 表单元素可用 */
input:enabled {
  background-color: white;
}
```

---

**基本写法：required 必填**
`<选择器>:required { <样式> }`
```css
/* 必填字段 */
input:required {
  border-color: red;
}
```

---

**基本写法：optional 可选**
`<选择器>:optional { <样式> }`
```css
/* 可选字段 */
input:optional {
  border-color: #ccc;
}
```

---

**基本写法：valid 有效**
`<选择器>:valid { <样式> }`
```css
/* 表单验证通过 */
input:valid {
  border-color: green;
}
```

---

**基本写法：invalid 无效**
`<选择器>:invalid { <样式> }`
```css
/* 表单验证失败 */
input:invalid {
  border-color: red;
}
```

---

**基本写法：in-range 范围内**
`<选择器>:in-range { <样式> }`
```css
/* 数值在指定范围内 */
input:in-range {
  border-color: green;
}
```

---

**基本写法：out-of-range 范围外**
`<选择器>:out-of-range { <样式> }`
```css
/* 数值超出指定范围 */
input:out-of-range {
  border-color: red;
}
```

---

**基本写法：read-only 只读**
`<选择器>:read-only { <样式> }`
```css
/* 只读字段 */
input:read-only {
  background-color: #f5f5f5;
}
```

---

**基本写法：read-write 可读写**
`<选择器>:read-write { <样式> }`
```css
/* 可读写字段 */
input:read-write {
  background-color: white;
}
```

---

**基本写法：placeholder-shown 占位符显示**
`<选择器>:placeholder-shown { <样式> }`
```css
/* 显示占位符时 */
input:placeholder-shown {
  border-color: #ccc;
}
```

---

**基本写法：default 默认选中**
`<选择器>:default { <样式> }`
```css
/* 默认选中的表单元素 */
input:default {
  box-shadow: 0 0 2px blue;
}
```

---

## 结构伪类

**基本写法：first-child 首个子元素**
`<选择器>:first-child { <样式> }`
```css
/* 父元素的第一个子元素 */
li:first-child {
  font-weight: bold;
}
```

---

**基本写法：last-child 末尾子元素**
`<选择器>:last-child { <样式> }`
```css
/* 父元素的最后一个子元素 */
li:last-child {
  border-bottom: none;
}
```

---

**基本写法：only-child 唯一子元素**
`<选择器>:only-child { <样式> }`
```css
/* 父元素中唯一的子元素 */
div:only-child {
  border: 1px solid red;
}
```

---

**基本写法：nth-child 索引选择**
`<选择器>:nth-child(<n>) { <样式> }`
```css
/* 第 n 个子元素 */
li:nth-child(3) {
  color: red;
}
```

---

**基本写法：nth-child 奇数**
`<选择器>:nth-child(odd) { <样式> }`
```css
/* 所有奇数行 */
tr:nth-child(odd) {
  background-color: #f9f9f9;
}
```

---

**基本写法：nth-child 偶数**
`<选择器>:nth-child(even) { <样式> }`
```css
/* 所有偶数行 */
tr:nth-child(even) {
  background-color: #ffffff;
}
```

---

**基本写法：nth-child 公式**
`<选择器>:nth-child(<公式>) { <样式> }`
```css
/* 每隔 3 个元素 */
li:nth-child(3n+1) {
  color: blue;
}
```

---

**基本写法：nth-last-child 倒数索引**
`<选择器>:nth-last-child(<n>) { <样式> }`
```css
/* 倒数第 n 个子元素 */
li:nth-last-child(2) {
  color: red;
}
```

---

**基本写法：first-of-type 同类型首个**
`<选择器>:first-of-type { <样式> }`
```css
/* 同级同类型第一个元素 */
p:first-of-type {
  margin-top: 0;
}
```

---

**基本写法：last-of-type 同类型末尾**
`<选择器>:last-of-type { <样式> }`
```css
/* 同级同类型最后一个元素 */
p:last-of-type {
  margin-bottom: 0;
}
```

---

**基本写法：nth-of-type 索引选择**
`<选择器>:nth-of-type(<n>) { <样式> }`
```css
/* 同类型第 n 个元素 */
p:nth-of-type(2) {
  color: blue;
}
```

---

**基本写法：nth-last-of-type 倒数同类型**
`<选择器>:nth-last-of-type(<n>) { <样式> }`
```css
/* 同类型倒数第 n 个元素 */
p:nth-last-of-type(2) {
  color: red;
}
```

---

**基本写法：only-of-type 唯一同类型**
`<选择器>:only-of-type { <样式> }`
```css
/* 同类型唯一元素 */
img:only-of-type {
  border: 2px solid blue;
}
```

---

**基本写法：empty 空元素**
`<选择器>:empty { <样式> }`
```css
/* 没有子元素的元素 */
div:empty {
  display: none;
}
```

---

**基本写法：root 根元素**
`:root { <样式> }`
```css
/* 文档根元素 html */
:root {
  --primary-color: #007bff;
}
```

---

## 目标伪类

**基本写法：target 锚点目标**
`<选择器>:target { <样式> }`
```css
/* 当前锚点指向的元素 */
#section:target {
  background-color: #ffffcc;
}
```

---

## 语言伪类

**基本写法：lang 语言匹配**
`<选择器>:lang(<语言>) { <样式> }`
```css
/* 匹配指定语言 */
p:lang(zh) {
  font-family: "Microsoft YaHei", sans-serif;
}
```

---

## 否定伪类

**基本写法：not 否定**
`<选择器>:not(<排除选择器>) { <样式> }`
```css
/* 排除指定选择器 */
input:not([disabled]) {
  border: 1px solid #ccc;
}
```

---

**基本写法：not 多重否定**
`<选择器>:not(<选择器1>):not(<选择器2>) { <样式> }`
```css
/* 多重否定 */
input:not([disabled]):not([type="hidden"]) {
  border: 1px solid #ccc;
}
```

---

## 匹配伪类

**基本写法：is 匹配任一**
`:is(<选择器1>, <选择器2>) { <样式> }`
```css
/* 匹配多个选择器 */
:is(h1, h2, h3) {
  font-family: sans-serif;
}
```

---

**基本写法：where 匹配任一**
`:where(<选择器1>, <选择器2>) { <样式> }`
```css
/* 匹配多个选择器（零特异性） */
:where(.card, .panel) {
  padding: 1rem;
}
```

---

**基本写法：has 父选择器**
`<选择器>:has(<子选择器>) { <样式> }`
```css
/* 选中包含指定子元素的父元素 */
div:has(img) {
  padding: 10px;
}
```

---

**基本写法：has 否定**
`<选择器>:not(:has(<子选择器>)) { <样式> }`
```css
/* 不包含指定子元素 */
div:not(:has(img)) {
  background: #f5f5f5;
}
```
