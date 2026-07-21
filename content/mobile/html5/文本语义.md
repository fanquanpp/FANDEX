# 文本语义 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 标题元素

**六级标题**
`<h1>...</h1>` ~ `<h6>...</h6>`
```html
<!-- 标题用于语义结构,不用于控制字号 -->
<h1>网站主标题</h1>
<h2>章节标题</h2>
<h3>小节标题</h3>
<h4>更小的子节标题</h4>
<h5>五级标题</h5>
<h6>六级标题</h6>
```

---

## 段落与换行

**段落**
`<p>[内容]</p>`
```html
<!-- 段落自动添加上下边距 -->
<p>这是一个段落。</p>
```

**换行**
`<br>` | `<wbr>`
```html
<!-- br 强制换行,wbr 建议换行点(长单词) -->
<p>第一行<br />第二行</p>
<p>超长单词<wbr />可以在<wbr />此处<wbr />断行</p>
```

---

## 强调元素

**文本强调标签**

| 元素       | 语义       | 默认样式 | 使用场景       |
| ---------- | ---------- | -------- | -------------- |
| `<em>`     | 语气强调   | 斜体     | 语音阅读时加重 |
| `<strong>` | 重要性强调 | 粗体     | 标记重要内容   |
| `<mark>`   | 相关性标记 | 黄色高亮 | 搜索结果高亮   |
| `<b>`      | 吸引注意   | 粗体     | 关键词、产品名 |
| `<i>`      | 不同语态   | 斜体     | 术语、外文     |
| `<small>`  | 附属细则   | 小字     | 免责声明       |

```html
<!-- 强调标签综合 -->
<p><em>不要</em>在走廊奔跑</p>
<p><strong>警告:</strong>高压危险</p>
<p>搜索"<mark>HTML5</mark>"的结果</p>
<p>这是 <b>关键词</b>,这是 <i>术语</i>。</p>
<p><small>本活动最终解释权归本公司所有</small></p>
```

---

## 术语与引用

**定义与缩写**
`<dfn>[术语]</dfn>` | `<abbr title="<全称>">[缩写]</abbr>`
```html
<dfn>HTML</dfn>是超文本标记语言
<abbr title="HyperText Markup Language">HTML</abbr>
```

**引用**
`<blockquote cite="<URL>">[内容]</blockquote>` | `<q cite="<URL>">[内容]</q>` | `<cite>[作品名]</cite>`
```html
<!-- 块级引用 -->
<blockquote cite="https://example.com">
  <p>引用文字</p>
</blockquote>

<!-- 行内引用 -->
<p>他说:<q>你好</q></p>

<!-- 作品标题 -->
参考:<cite>JavaScript高级程序设计</cite>
```

---

## 上下标与代码

**上下标**
`<sub>[下标]</sub>` | `<sup>[上标]</sup>`
```html
<!-- 数学公式与化学式 -->
H<sub>2</sub>O
E=mc<sup>2</sup>
```

**代码与键盘**
`<code>[代码]</code>` | `<pre>[预格式化]</pre>` | `<kbd>[按键]</kbd>` | `<samp>[输出]</samp>` | `<var>[变量]</var>`
```html
<!-- 行内代码 -->
<code>console.log()</code>

<!-- 代码块 -->
<pre><code>function hello() {
  console.log('Hello');
}</code></pre>

<!-- 键盘按键 -->
按 <kbd>Ctrl</kbd> + <kbd>C</kbd> 复制

<!-- 程序输出 -->
<samp>Compilation successful</samp>

<!-- 变量 -->
<var>x</var> = 10
```

---

## 修改记录

**删除与插入**
`<del [datetime="<日期>"]>[内容]</del>` | `<ins [datetime="<日期>"]>[内容]</ins>`
```html
<!-- 价格变更 -->
<p>价格:<del datetime="2026-01-01">¥99</del> <ins>¥79</ins></p>
```

---

## 隔离与方向

**双向隔离**
`<bdi>[文本]</bdi>` | `<bdo dir="ltr|rtl">[文本]</bdo>`
```html
<!-- bdi 隔离方向不明的文本(如用户名) -->
<p>用户 <bdi>إبراهيم</bdi> 发表了评论</p>

<!-- bdo 强制文本方向 -->
<bdo dir="rtl">这段文字从右到左显示</bdo>
```

---

## 时间元素

**time 元素**
`<time datetime="<ISO日期>" [pubdate]>[显示文本]</time>`
```html
<!-- 日期 -->
<time datetime="2026-06-14">2026年6月14日</time>

<!-- 日期时间(带时区) -->
<time datetime="2026-06-14T10:30:00+08:00">上午10:30</time>

<!-- 持续时间 -->
<time datetime="PT2H30M">2小时30分钟</time>

<!-- 发布日期 -->
<time datetime="2026-06-14" pubdate>发布于 2026-06-14</time>
```

| 类型     | 格式                | 示例                |
| -------- | ------------------- | ------------------- |
| 日期     | YYYY-MM-DD          | 2026-06-14          |
| 日期时间 | YYYY-MM-DDThh:mm:ss | 2026-06-14T10:30:00 |
| 带时区   | YYYY-MM-DDThh:mm:ssTZD | 2026-06-14T10:30:00+08:00 |
| 持续时间 | PnYnMnDTnHnMnS      | PT2H30M             |

---

## 联系信息

**address 元素**
`<address>...[a|br|文本]...</address>`
```html
<!-- 用于文档作者/文章作者的联系信息 -->
<address>
  <a href="mailto:contact@example.com">contact@example.com</a><br />
  北京市朝阳区某某路123号
</address>
```

---

## 高亮与注音

**ruby 注音**
`<ruby>[字]<rt>[拼音]</rt></ruby>`
```html
<!-- 中日韩文字注音 -->
<ruby>汉<rt>hàn</rt></ruby>字
<ruby>日本<rt>にほん</rt></ruby>
```

**rp 注音回退**
```html
<ruby>
  汉<rp>(</rp><rt>hàn</rt><rp>)</rp>
</ruby>
```
