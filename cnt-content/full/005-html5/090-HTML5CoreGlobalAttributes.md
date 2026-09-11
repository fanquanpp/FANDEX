---
order: 90
title: id、 class、 style：打通 HTML 到 CSS/JS 的通道
module: 'html5'
category: 前端技术
difficulty: beginner
description: 全局属性速通：id 是身份证号、class 是可复用标签、style 是紧急临时样式，附 title/hidden/contenteditable 等其余全局属性速查与终极对比表。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'html5/080-HTML5DivSpanContainers'
  - 'html5/020-HTML5OverviewCoreFeature'
  - 'html5/150-HTML5TableAndStructuredContent'
  - 'html5/340-CustomDataAttribute'
prerequisites:
  - 'html5/080-HTML5DivSpanContainers'
---

## 0. 学习目标（可验证）

- [ ] 能说出 `id`、`class`、`style` 三者的定位（身份证号 / 分类标签 / 临时记号笔）
- [ ] 能说出 `id` 的两个约束（页面唯一、命名规范）和 `class` 的两个特性（可重复、可多值）
- [ ] 能背出终极对比表里"CSS 怎么选、JS 怎么拿"两列
- [ ] 能用 `title`、`hidden`、`contenteditable` 三个全局属性写出小示例
- [ ] 能写出一段带 `id` 和多个 `class` 的 HTML，并用锚点跳转验证 id 的作用

## 1. 一句话理解

> `id` 是身份证号（全页面唯一），`class` 是班级标签（全班共用一个名字），`style` 是临时记号笔（应急可以，正式作品别用）。

HTML 只负责"有什么"，CSS 负责"长什么样"，JavaScript 负责"能做什么"。这三个属性就是三者的接口：没有它们，CSS 找不到要美化的元素，JavaScript 找不到要操作的元素。

**全局属性**（global attributes）是这类属性的统称：它们可以写在**任何元素**上，不像 `href` 只属于 `<a>`、`src` 只属于图片和脚本。`id`、`class`、`style` 是其中最常用的三个，但全局属性远不止三个——本章先精讲三巨头，再给全家族画个像。

## 2. id：身份证号（必须唯一）

```html
<div id="header">页面头部</div>
<div id="main">页面主体</div>
```

规则：

- **全页面唯一**：一个 id 值只能出现一次，重复是错误用法；
- **命名规范**：建议以字母开头，只能包含字母、数字、下划线、连字符，不能有空格。HTML5 规范本身允许数字开头，但 CSS 选择器很难选中以数字开头的 id，所以约定以字母开头；
- **两个用途**：锚点跳转（`<a href="#main">跳到主体</a>`）和 JavaScript 精准抓取（`document.getElementById('main')`）。

### id 重复的真实后果（为什么别侥幸）

写了重复 id，页面多半"看起来还行"，但三件事会悄悄坏掉：

1. `document.getElementById('demo')` 只返回**第一个**，后面的同名元素 JS 永远抓不到；
2. 锚点跳转 `#demo` 只认第一个；
3. W3C 校验器报错，团队协作时属于必须修的低级问题。

```html
<!-- 错误示例：重复 id -->
<p id="note">第一条</p>
<p id="note">第二条</p>

<script>
  console.log(document.getElementById('note').textContent); // 只打印"第一条"
</script>
```

### 锚点跳转的原理

`<a href="#main">` 里的 `#main` 是 URL 的"片段标识符"：浏览器在当前页面里找 `id="main"` 的元素，把页面滚动到它那里。URL 还能直接带上片段分享（如 `page.html#chapter-3`），打开就定位——这是 id 独有的能力，class 做不到。

## 3. class：班级标签（可以重复）

```html
<p class="notice">第一条通知</p>
<p class="notice">第二条通知</p>
```

规则：

- **可以重复**：多个元素共享同一个 class，CSS 一次写样式，全部生效；
- **可以多值**：一个元素可以挂多个 class，用空格分隔：`class="notice urgent"`——一个管外观，一个管紧急程度，职责分离；
- 命名同样建议字母开头，多个单词用小写加连字符（如 `card-title`）。

```html
<style>
  .notice { color: blue; }
  .urgent { font-weight: bold; }
</style>
<p class="notice urgent">紧急通知</p>
```

上面这段是完整可运行的最小示例：`.notice` 管颜色，`.urgent` 管加粗，互不干扰。

### class 命名的两个约定（现在养成，终身受益）

1. **按"是什么"命名，不按"长什么样"命名**：`class="warning"`（语义：警告）优于 `class="red"`（样式：红色）——哪天把警告改成橙色，`.red` 这个名字就成了谎言；
2. **多单词用小写连字符**：`card-title`、`user-avatar`，不用驼峰也不用下划线，全项目统一即可。将来学到大型项目时流行的 BEM 命名法，也是在这条约定上扩展的。

## 4. style：紧急临时样式（仅供测试）

```html
<p style="color: red;">这行是红色的</p>
```

`style` 直接在标签上写 CSS，浏览器立即生效。但它的代价是：样式写死在 HTML 里，改一处要翻遍所有标签，完全没法复用。**正式项目禁用，它只属于两分钟快速测试。** 真正的样式应该写在 CSS 文件里，用 `class` 引用。

顺带建立正确预期：内联 `style` 的优先级高于绝大多数 CSS 规则（这正是它"赖着不走"难被覆盖的原因），细节规则在 CSS 优先级课程展开，现在记住"内联样式很难被外部样式覆盖"即可。

## 5. 其余全局属性速查（先混个脸熟）

三巨头之外，还有一批全局属性，这里给出速查表与三个最实用的示例。它们都是"写在任何标签上都合法"的：

| 属性 | 作用 | 一句话示例 |
| --- | --- | --- |
| `title` | 悬停提示（鼠标停留显示的小气泡），也是元素的"建议名称" | `<abbr title="HyperText Markup Language">HTML</abbr>` |
| `hidden` | 直接隐藏元素（不显示、不占位） | `<p hidden>还没上线的内容</p>` |
| `lang` | 声明元素内容语言，读屏发音与翻译依赖它 | `<p lang="en">Hello</p>` |
| `dir` | 文字方向（`ltr`/`rtl`） | 多语言排版用 |
| `contenteditable` | 让内容可被用户编辑 | 见下 |
| `tabindex` | 参与 Tab 焦点序（配合键盘导航） | 进阶无障碍时学 |
| `spellcheck` | 拼写检查开关 | `<textarea spellcheck="false">` |
| `translate` | 提示翻译工具不要翻译（如品牌名） | `<span translate="no">FANDEX</span>` |
| `draggable` | 是否可拖拽 | 配合 Drag API，见 026 |
| `data-*` | 自定义数据，供 JS 读取 | `data-price="99"`，详见 034 专项 |

三个立刻能玩的小示例：

```html
<!-- 1. title：悬停显示解释，零 JS 的提示气泡 -->
<abbr title="级联样式表">CSS</abbr>

<!-- 2. hidden：一行属性直接隐藏内容，等价 display: none -->
<p hidden>这段在页面上看不到</p>

<!-- 3. contenteditable：把段落变成可编辑区域，刷新后即可敲字 -->
<p contenteditable="true">点进来试试编辑这段文字</p>
```

`data-*` 值得单独点名：它是"给元素挂自定义数据"的标准通道（如商品卡片上挂 `data-id`），本模块 `html5/340-CustomDataAttribute` 有完整专项。

## 6. 终极对比表

| 属性 | 能否重复 | CSS 怎么选 | JS 怎么拿 | 一句话定位 |
| --- | --- | --- | --- | --- |
| `id` | 不能（全页唯一） | `#header` | `getElementById('header')` | 身份证号 |
| `class` | 能 | `.notice` | `getElementsByClassName('notice')` | 班级标签 |
| `style` | 不涉及（写在元素上） | 直接生效，无需选择器 | 读 `element.style.color` | 临时记号笔 |

## 7. 动手试试

### 入门版

1. 写三张卡片，全部 `class="card"`，再给第一张加 `class="featured"`，用 `<style>` 分别给 `.card` 和 `.featured` 加不同颜色，观察"共享样式 + 个别加强"的效果；
2. 给页面里某个 `div` 加 `id="about"`，在页面底部放一个 `<a href="#about">回到关于</a>`，点击验证锚点跳转；
3. 故意写两个相同的 id，在 F12 的 Console 里执行 `document.getElementById('xxx')`，观察它只返回第一个元素；
4. 试试第 5 节的三个小示例：悬停看 title 气泡、给段落加 `hidden`、把段落变 `contenteditable`。

### 进阶版

1. 用 `getElementById` 和 `getElementsByClassName` 分别抓取元素，在 Console 里打印出来，体会 id 精准、class 批量；
2. 把上一步用 `style` 写的样式全部改写成 class，并总结"哪些样式必须抽出来复用"；
3. 给一个词组加 `<abbr title="...">`，用手机模式（或触屏设备）试试悬停提示——思考"title 在触屏上失效"这个真实的可用性问题。

## 8. 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| 多个元素用了同一个 id | 把 id 当 class 用 | id 全页唯一，批量样式用 class |
| id/class 用数字开头 | 不知道 CSS 选择器难处理 | 以字母开头，如 `card-1` |
| class 值里写空格 | 空格是多值分隔符 | 一个单词一个 class，如 `card featured` |
| class 叫 `.red`、`.big` | 按样式命名，改版就失效 | 按语义命名：`.warning`、`.highlight` |
| style 属性堆满页面 | 图方便，跳过 CSS 文件 | 测试后立刻抽成 class |
| 给 `span` 设宽高没效果 | 行内元素天性如此 | 需要时转 inline-block（CSS 模块） |

## 9. 下一步

到这里，0 基础前置四件套完成：注释与实体、块级与行内、div/span 容器、id/class/style。接下来 `html5/020-HTML5OverviewCoreFeature` 快速上手课里的所有代码，你已经没有陌生概念了。`data-*` 的完整用法（读取、事件委托、与 JS 框架的关系）见 `html5/340-CustomDataAttribute` 专项。
