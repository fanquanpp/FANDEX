# 列表 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 无序列表

**ul 无序列表**
`<ul [type="disc|circle|square|none"]>...<li>[项]</li>...</ul>`
```html
<!-- 默认实心圆 -->
<ul>
  <li>苹果</li>
  <li>香蕉</li>
  <li>橙子</li>
</ul>
```

**CSS 列表样式**
```css
ul { list-style-type: disc; }    /* 实心圆(默认) */
ul { list-style-type: circle; }  /* 空心圆 */
ul { list-style-type: square; }  /* 实心方块 */
ul { list-style-type: none; }    /* 无标记 */
```

---

## 有序列表

**ol 有序列表**
`<ol [start="<起始>"] [reversed] [type="1|A|a|I|i"]>...<li>[项]</li>...</ol>`
```html
<!-- 默认数字编号 -->
<ol>
  <li>第一步</li>
  <li>第二步</li>
</ol>

<!-- 从 5 开始 -->
<ol start="5">
  <li>第五项</li>
  <li>第六项</li>
</ol>

<!-- 倒序 -->
<ol reversed>
  <li>第三项</li>
  <li>第二项</li>
</ol>

<!-- 字母编号 -->
<ol type="A">
  <li>选项 A</li>
  <li>选项 B</li>
</ol>
```

| type 值 | 编号样式     | 示例       |
| ------- | ------------ | ---------- |
| `1`     | 数字(默认)   | 1, 2, 3    |
| `A`     | 大写字母     | A, B, C    |
| `a`     | 小写字母     | a, b, c    |
| `I`     | 大写罗马数字 | I, II, III |
| `i`     | 小写罗马数字 | i, ii, iii |

**CSS 列表样式**
```css
ol { list-style-type: decimal; }            /* 1, 2, 3 */
ol { list-style-type: lower-roman; }        /* i, ii, iii */
ol { list-style-type: upper-roman; }        /* I, II, III */
ol { list-style-type: cjk-ideographic; }    /* 一, 二, 三 */
```

**li 元素**
`<li [value="<数值>"]>[内容]</li>`
```html
<!-- value 改变当前项编号 -->
<ol>
  <li>第一项</li>
  <li value="5">第五项</li>
  <li>第六项</li>
</ol>
```

---

## CSS 自定义计数器

**计数器实现复杂编号**
```css
ol.custom {
  counter-reset: section;
  list-style: none;
}
ol.custom li {
  counter-increment: section;
}
ol.custom li::before {
  content: '第' counter(section) '章:';
  font-weight: bold;
  margin-right: 0.5em;
}
```

```html
<ol class="custom">
  <li>入门</li>
  <li>进阶</li>
  <li>高级</li>
</ol>
```

---

## 定义列表

**dl 定义列表**
`<dl>...<dt>[术语]</dt><dd>[描述]</dd>...</dl>`
```html
<!-- 术语-描述成对 -->
<dl>
  <dt>HTML</dt>
  <dd>超文本标记语言</dd>
  <dt>CSS</dt>
  <dd>层叠样式表</dd>
</dl>
```

**多对多关系**
```html
<!-- 一个术语多个定义 -->
<dl>
  <dt>Java</dt>
  <dd>一种编程语言</dd>
  <dd>一种咖啡</dd>
</dl>

<!-- 多个术语一个定义 -->
<dl>
  <dt>JS</dt>
  <dt>JavaScript</dt>
  <dd>一种脚本语言</dd>
</dl>
```

---

## 嵌套列表

**列表嵌套**
```html
<!-- 多层嵌套无序列表 -->
<ul>
  <li>HTML 基础
    <ul>
      <li>标签语法</li>
      <li>语义化标签</li>
    </ul>
  </li>
  <li>CSS 基础
    <ol>
      <li>选择器</li>
      <li>盒模型</li>
    </ol>
  </li>
</ul>
```

---

## 列表布局技巧

**导航栏布局**
```css
/* 重置列表样式 */
ul, ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* 横向导航 */
ul.nav {
  display: flex;
  gap: 1rem;
}
```

**自定义标记**
```css
ul.custom-mark li {
  position: relative;
  padding-left: 1.5em;
}
ul.custom-mark li::before {
  content: '►';
  position: absolute;
  left: 0;
  color: green;
}
```

---

## menu 元素

**menu 菜单列表(HTML 2023)**
`<menu>...<li>[项]</li>...</menu>`
```html
<!-- 工具栏/命令列表 -->
<menu>
  <li><button onclick="save()">保存</button></li>
  <li><button onclick="open()">打开</button></li>
  <li><button onclick="exit()">退出</button></li>
</menu>
```
