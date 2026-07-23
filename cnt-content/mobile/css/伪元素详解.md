# CSS 伪元素详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 伪元素

**基本写法：before 前置内容**
`<选择器>::before { content: <内容>; <样式> }`
```css
/* 在元素前插入内容 */
.quote::before {
  content: '"';
  color: gray;
}
```

---

**基本写法：after 后置内容**
`<选择器>::after { content: <内容>; <样式> }`
```css
/* 在元素后插入内容 */
.quote::after {
  content: '"';
  color: gray;
}
```

---

**基本写法：before 装饰元素**
`<选择器>::before { content: ""; <样式> }`
```css
/* 创建装饰性元素 */
.card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #007bff;
}
```

---

**基本写法：first-letter 首字母**
`<选择器>::first-letter { <样式> }`
```css
/* 段落首字母样式 */
p::first-letter {
  font-size: 2em;
  font-weight: bold;
}
```

---

**基本写法：first-line 首行**
`<选择器>::first-line { <样式> }`
```css
/* 段落首行样式 */
p::first-line {
  text-transform: uppercase;
}
```

---

**基本写法：selection 选中文本**
`<选择器>::selection { <样式> }`
```css
/* 自定义文本选中样式 */
::selection {
  background-color: #007bff;
  color: white;
}
```

---

**基本写法：placeholder 占位符**
`<选择器>::placeholder { <样式> }`
```css
/* 输入框占位符样式 */
input::placeholder {
  color: #999;
}
```

---

**基本写法：marker 列表标记**
`<选择器>::marker { <样式> }`
```css
/* 列表项标记样式 */
li::marker {
  color: #007bff;
  font-weight: bold;
}
```

---

**基本写法：backdrop 背景层**
`<选择器>::backdrop { <样式> }`
```css
/* 全屏元素背景层 */
dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
}
```

---

**基本写法：file-selector-button 文件选择按钮**
`<选择器>::file-selector-button { <样式> }`
```css
/* 文件输入框按钮样式 */
input[type="file"]::file-selector-button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
}
```

---

## 伪元素内容生成

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

**基本写法：content url 图片**
`content: url("<图片路径>");`
```css
/* 生成图片内容 */
.icon::before {
  content: url("icon.png");
}
```

---

**基本写法：content 计数器**
`content: counter(<计数器名>);`
```css
/* 显示计数器值 */
li::before {
  content: counter(item) ". ";
}
```

---

## 计数器

**基本写法：counter-reset 重置计数器**
`counter-reset: <计数器名> <初始值>;`
```css
/* 重置计数器 */
ol {
  counter-reset: section;
}
```

---

**基本写法：counter-increment 递增计数器**
`counter-increment: <计数器名> <步长>;`
```css
/* 计数器递增 */
li {
  counter-increment: section;
}
```

---

**基本写法：counter 显示计数器**
`content: counter(<计数器名>);`
```css
/* 显示计数器值 */
li::before {
  content: "第 " counter(section) " 章: ";
}
```

---

**基本写法：counter 自定义样式**
`content: counter(<计数器名>, <样式>);`
```css
/* 计数器使用中文数字 */
li::before {
  content: counter(section, cjk-ideographic) "、";
}
```

---

**基本写法：counters 嵌套计数器**
`content: counters(<计数器名>, "<分隔符>");`
```css
/* 嵌套计数器 */
li::before {
  content: counters(section, ".") " ";
}
```

---

## 伪元素动画

**基本写法：伪元素过渡**
`<选择器>::before { transition: <属性> <时长>; }`
```css
/* 伪元素过渡动画 */
.button::before {
  transition: transform 0.3s;
}
.button:hover::before {
  transform: scaleX(1);
}
```

---

**基本写法：伪元素动画**
`<选择器>::after { animation: <名称> <时长>; }`
```css
/* 伪元素动画 */
.loader::after {
  animation: spin 1s linear infinite;
}
```

---

## 伪元素布局

**基本写法：clearfix 清除浮动**
`.clearfix::after { content: ""; display: table; clear: both; }`
```css
/* 清除浮动 */
.clearfix::after {
  content: "";
  display: table;
  clear: both;
}
```

---

**基本写法：tooltip 工具提示**
`<选择器>::after { content: attr(data-tooltip); <样式> }`
```css
/* 使用伪元素创建工具提示 */
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  background: black;
  color: white;
  padding: 4px 8px;
  opacity: 0;
  transition: opacity 0.3s;
}
[data-tooltip]:hover::after {
  opacity: 1;
}
```

---

**基本写法：下划线动画**
`<选择器>::after { content: ""; <样式> }`
```css
/* 悬停下划线动画 */
.link::after {
  content: "";
  display: block;
  width: 0;
  height: 2px;
  background: currentColor;
  transition: width 0.3s;
}
.link:hover::after {
  width: 100%;
}
```
