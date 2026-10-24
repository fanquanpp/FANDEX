---
order: 480
title: 专项：东亚文字与国际化标签
module: 'html5'
category: 前端技术
difficulty: beginner
description: ruby 注音、bdi/bdo 双向文本隔离、lang/dir 属性深化：处理日文注音、中文拼音、阿拉伯文 RTL 排版的最后一公里。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'html5/060-MetadataCharacterEncoding'
  - 'html5/110-TextSemantic'
  - 'html5/180-Accessibility'
prerequisites:
  - 'html5/110-TextSemantic'
---

## 0. 学习目标（可验证）

- [ ] 能用 `ruby`/`rt`/`rp` 给汉字加拼音、给日文加假名
- [ ] 能说出 `bdi` 与 `bdo` 的区别，并各写一个例子
- [ ] 能解释 `lang` 和 `dir` 对翻译、拼写检查、排版方向的影响
- [ ] 能说出「双向文本污染」的原因（Unicode 双向算法）与 `bdi` 的隔离原理

## 1. 一句话理解

> 国际化标签解决「语言不同导致的排版问题」：汉字/日文要注音用 ruby，阿拉伯文/希伯来文要从右往左用 dir/bdi，混合文本要隔离方向用 bdi。

## 2. ruby：东亚注音

`<ruby>` 是注音容器，`<rt>` 放注音文字，`<rp>` 是给不支持 ruby 的浏览器看的括号兜底：

```html
<ruby>
  汉<rt>hàn</rt>
  字<rt>zì</rt>
</ruby>

<ruby>
  日本語<rt>にほんご</rt>
</ruby>
```

**讲解：**

- `<ruby>` 包裹「正文 + 注音」整体，`<rt>` 紧跟对应字符，浏览器把注音显示在文字上方（竖排时在右侧）；
- `<rp>` 写法：`<ruby>汉<rp>(</rp><rt>hàn</rt><rp>)</rp></ruby>`——老浏览器会显示「汉(hàn)」，新浏览器忽略括号；
- 多音字场景：给每个字单独一个 ruby 组，便于对齐。

## 3. bdi 与 bdo：双向文本

### 3.1 bdi：隔离未知方向的文本

`<bdi>`（Bi-Directional Isolation）把一段方向未知的文本「隔离」起来，防止它污染周围文本的排版：

```html
<p>用户 <bdi>أحمد</bdi> 刚刚上线（阿拉伯文用户名）。</p>
<p>用户 <bdi>alice_123</bdi> 刚刚上线（普通用户名）。</p>
```

没有 bdi 时，阿拉伯文用户名会把相邻的标点、符号「拉」到奇怪的位置；bdi 让每个用户名按自己的方向排版，互不干扰。

### 3.2 bdo：强制指定方向

`<bdo>`（Bi-Directional Override）强制覆盖文本方向，`dir` 必填：

```html
<p><bdo dir="rtl">从右往左显示</bdo></p>
```

**bdi 与 bdo 的区别：**

| 标签 | 作用 | 典型场景 |
| --- | --- | --- |
| `bdi` | 隔离，文本按自身方向排 | 用户生成内容（用户名、评论） |
| `bdo` | 强制覆盖方向 | 明确要求某段文字必须从右往左/从左往右 |

## 4. lang 与 dir：全局属性的国际化用法

```html
<html lang="zh-CN">
<p lang="en">This is English.</p>
<p dir="rtl">هذا نص عربي</p>
```

- `lang` 影响：拼写检查、翻译工具、读屏发音、`::first-letter` 等样式规则；
- `dir` 影响：文本方向与对齐基线，`rtl` 页面需要配合 CSS 逻辑属性（`margin-inline-start` 等）；
- 混排原则：**能局部标注就局部标注**，整页声明 `lang`，异语言片段单独加 `lang`。

## 5. 底层原理：Unicode 双向算法与 ruby 的排版

### 5.1 双向文本为什么会「乱」

Unicode 双向算法（Bidi Algorithm，UAX #9）是所有浏览器实现文字排版的底层规则。核心事实：**阿拉伯文与希伯来文的字符天然按「从右到左」排，而数字与拉丁字母按「从左到右」排**——浏览器拿到一段混合文本时，要靠算法推断每一段的方向边界。推断基于「强方向字符」的位置，一旦推断错误（比如用户名以中性符号开头），周围的标点就会被划进错误的方向区间，于是「标点乱跳」。

`bdi` 的原理是**方向隔离**：给它内部的文本单独跑一遍方向推断，推断结果不外泄到周围文本；内部方向默认由「首个强方向字符」决定。所以对内容不可预测的用户生成内容，bdi 是唯一稳妥的方案。

`bdo` 则是**方向覆盖**：跳过算法推断，整段按 `dir` 强制排——它是给「明确知道要覆盖」的场景用的最后手段，对动态内容用 bdo 等于放弃自动判断。

### 5.2 ruby 的排版账

ruby 注音不是「在上面加一行小字」这么简单：浏览器要在**行盒（line box）里为注音预留垂直空间**，正文行高被撑大。两个工程细节：

- `rt` 的默认字号约为正文的一半（约 50%），且浏览器会自动缩放假名/拼音以贴合正文字宽；
- 行距敏感的排版（诗歌、歌词、注音教材）要显式给 ruby 所在行留 `line-height` 余量，否则注音会与上一行碰撞。

## 6. 与相邻知识的关系

- `translate="no"`（`notranslate` 类的 HTML 标准属性）：品牌名、代码标识符不希望被翻译工具改写时配合 `lang` 一起标注——`lang` 管「这是什么语言」，`translate` 管「要不要翻译它」；
- CSS 逻辑属性（`margin-inline-start`、`padding-block` 等）：`dir` 只改文字方向，**布局镜像要靠逻辑属性**——RTL 页面把 `margin-left` 全改成 `margin-inline-start` 才能一份样式通吃两种方向；
- [字符编码与元数据](/html5/060-MetadataCharacterEncoding)：`lang` 声明「语言」，`<meta charset>` 声明「字节怎么解码」，两者是国际化的前后两关；
- [可访问性](/html5/180-Accessibility)：读屏软件按 `lang` 切换发音引擎——英文段落不标 `lang="en"`，中文读屏会用中文音调念英文，几乎是不可听的状态；
- 站点级国际化（`<link rel="alternate" hreflang>`）属于 SEO 层面，与本文的页内标注互补：hreflang 告诉搜索引擎「有哪个语言版本」，页内 lang 告诉浏览器「这段是什么语言」。

## 7. 面试题思路

**「用户列表里出现阿拉伯文用户名后，页面标点错乱，怎么排查？」** 先说出病因（双向文本污染：未知方向内容参与了大环境的方向推断），再给方案（用户生成内容一律包 `bdi`），最后加分：提到「布局侧配合逻辑属性避免 RTL 布局错位」以及「数据层也可以在存储时插入 Unicode 隔离控制符，但 HTML 层 bdi 更语义化」。

**「bdi 和 bdo 都是处理双向文本的，为什么有两个？」** 按机制答：bdi 是隔离（内部方向自行推断、不外泄），bdo 是覆盖（跳过推断强制指定）；适用性上 bdi 面向不可预测的动态内容，bdo 面向明确需要反向展示的静态内容。能点出「bdo 的 dir 必填」说明真用过。

**「lang 属性到底影响什么？」** 分层列举：读屏发音引擎、拼写检查词典、翻译工具的判断、字体选择（同一串汉字在 `lang="ja"` 与 `lang="zh"` 下可能选择不同字形）、CSS `:lang()` 选择器与 `::first-letter` 行为。能答出「字体字形差异」属于深度了解。

## 8. 动手试试

先看任务与提示，自己写完再看参考实现。

### 入门版

1. 用 ruby 给「你好世界」四个字加拼音，并写一组带 `rp` 兜底的版本；
2. 在页面里插入阿拉伯文用户名，对比加不加 `bdi` 的显示差异；
3. 把整个 `<html>` 的 `dir` 改成 `rtl`，观察页面排版方向变化。

参考实现（任务 1）：

```html
<!-- 逐字分组：每个字一个 ruby，注音才能对齐 -->
<p>
  <ruby>你<rp>(</rp><rt>nǐ</rt><rp>)</rp></ruby>
  <ruby>好<rp>(</rp><rt>hǎo</rt><rp>)</rp></ruby>
  <ruby>世<rp>(</rp><rt>shì</rt><rp>)</rp></ruby>
  <ruby>界<rp>(</rp><rt>jiè</rt><rp>)</rp></ruby>
</p>
```

### 进阶版

1. 做一个中英混排页面：中文段落 `lang="zh-CN"`、英文引用 `lang="en"`，用浏览器朗读功能体验发音差异；
2. 结合 CSS 逻辑属性（`padding-inline-start` 等），让同一个样式在 LTR/RTL 下都正确。

参考实现（任务 2 的对照组）：

```html
<!-- 卡片列表：用户名动态插入，方向不可预测 -->
<style>
  .user-card { padding-inline-start: 12px; }   /* 逻辑属性：RTL 下自动镜像 */
</style>
<ul>
  <li class="user-card">用户 <bdi>أحمد</bdi> 刚刚上线</li>
  <li class="user-card">用户 <bdi>alice_123</bdi> 刚刚上线</li>
  <!-- 对照：去掉 bdi 再看标点位置 -->
  <li class="user-card">用户 أحمد 刚刚上线</li>
</ul>
```

自检：第三行「刚刚上线」的句读位置和前两行一致吗？把 `<bdi>` 换成 `<span>` 试一次，确认问题复现——这就是「隔离」在起作用的实证。

## 9. 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| 中文拼音对不齐 | 一个 ruby 包了整句 | 逐字分组：每个字一个 ruby |
| 阿拉伯文标点乱跳 | 未知方向文本污染了上下文 | 用 `bdi` 隔离用户内容 |
| 只声明 lang 不声明 dir | 双向语言仍需方向信息 | RTL 内容单独加 `dir="rtl"` |
| 用 bdo 到处强制方向 | 覆盖是最后手段 | 优先 bdi 隔离，bdo 只用于明确强制场景 |
| ruby 行与上一行重叠 | 注音撑高行盒但没留行距 | 给注音段落显式加大 `line-height` |
| RTL 布局错位（非文字问题） | CSS 用了物理方向属性 | 改用 `margin-inline-start` 等逻辑属性 |

## 10. 下一步

国际化标签补齐后，按顺序下一篇是 `420-HTML5ImageMapArea` 图像热区：冷门但关键时刻能救场；再往后是 `430-HTML5DialogPopoverGuide` 的现代交互组件与 `440-HTMLNewElementsAndCapabilities` 的新元素速览。
