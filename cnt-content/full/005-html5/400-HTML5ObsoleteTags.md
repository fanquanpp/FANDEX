---
order: 470
title: 专项：已废弃标签考古
module: 'html5'
category: 前端技术
difficulty: beginner
description: 老网页和旧代码里必遇的废弃标签清单：font、center、frameset、marquee 等，附现代替代方案、废弃原因分类与遇到老项目时的处理思路。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'html5/020-HTML5OverviewCoreFeature'
  - 'html5/040-DocTypeDeclaration'
  - 'html5/390-HTML5ContentModelAndNestingRules'
  - 'html5/440-HTMLNewElementsAndCapabilities'
prerequisites:
  - 'html5/040-DocTypeDeclaration'
---

## 0. 学习目标（可验证）

- [ ] 能认出 10 个以上已废弃标签，并说出各自替代方案
- [ ] 能把废弃原因归入「表现层越权 / 被新语义取代 / 安全互操作问题」三类
- [ ] 能解释 frameset 为什么被彻底移除
- [ ] 遇到老项目里的废弃标签，知道「改还是不改」的判断方法

## 1. 一句话理解

> 废弃标签是「历史上的写法」：今天写新代码一律不用，但改老网页、读开源旧项目时一定会遇到。认识它们，是为了不慌。

## 2. 必知废弃标签清单

| 废弃标签 | 曾经的用途 | 现代替代方案 |
| --- | --- | --- |
| `<font>` | 设置文字颜色/字号 | CSS：`color`、`font-size` |
| `<center>` | 水平居中 | CSS：`text-align` 或 Flex/Grid |
| `<big>` | 放大字号 | CSS：`font-size` |
| `<strike>` | 删除线 | `<del>`（语义为「已删除」）或 CSS：`text-decoration` |
| `<tt>` | 等宽字体 | CSS：`font-family: monospace` 或 `<code>` |
| `<nobr>` | 禁止换行 | CSS：`white-space: nowrap` 或 `&nbsp;` |
| `<marquee>` | 滚动文字 | CSS 动画或合理的交互设计 |
| `<blink>` | 闪烁文字 | 不要做，闪烁对阅读和癫痫患者有害 |
| `<acronym>` | 缩写词 | `<abbr>` |
| `<applet>` | 嵌入 Java 小程序 | `<object>`、`<canvas>` 或普通脚本 |
| `<keygen>` | 表单里生成密钥对 | 已从标准与主流浏览器移除；密钥场景用 Web Crypto API |
| `<dir>` | 目录列表 | `<ul>` |
| `<isindex>` | 单行搜索框 | `<form>` + `<input type="search">`（搜索区域可用 `<search>` 包裹，见[新元素与新能力](/html5/440-HTMLNewElementsAndCapabilities)） |
| `<frameset>` / `<frame>` / `<noframes>` | 多框架布局 | 普通文档结构 + iframe（如确需嵌入） |

### 容易误判：重新定义而非废弃

有几个标签网上常被说成「废弃」，其实 HTML5 给了它们**新的语义**，是合法元素，不要见到就急着替换：

| 标签 | 现行语义 | 使用场景 |
| --- | --- | --- |
| `<small>` | 附属细则（small print）：免责声明、版权注释 | `<small>Copyright 2026 Example Inc.</small>` |
| `<u>` | 无明确语义的注释（unarticulated annotation）：中文专名号、标记拼写错误 | 非文本注释类下划线；纯装饰下划线交给 CSS |
| `<s>` | 不再准确/不再相关的内容（如改前的原价） | `<s>原价 99</s> 现价 59` |
| `<b>` | 关键词、产品名等「引起注意但无强调语义」的文字 | 摘要里的关键词加粗 |
| `<i>` | 术语、外文短语、想法声音等斜体语义 | `<i>凌波微步</i>`、外文词 |

判断口诀：**「废弃」是标准让你别再用；「重新定义」是标准让你换个理由用**。以 WHATWG 规范与 MDN 的 "Deprecated" 标记为准，不要凭网上旧文下结论。

## 3. frameset 为什么被彻底移除

frameset 把浏览器窗口切成多个独立框架，问题有三：

1. 每个框架是一份独立文档，SEO 和收藏夹都很难处理；
2. 地址栏 URL 不随框架内容变化，无法分享具体页面；
3. 可访问性差，读屏软件无法理解「窗口碎片」。

所以 HTML5 直接移除了 frameset/frame，现代嵌入需求用 `<iframe>`（见 220-EmbeddedContent）。

## 4. 底层原理：标签是怎么「死」的，页面怎么「装老」

### 4.1 废弃的三类原因

把清单里的标签按废弃原因归类，记忆与判断都会容易很多：

| 原因类别 | 逻辑 | 代表标签 |
| --- | --- | --- |
| 表现层越权 | HTML 管结构、CSS 管表现的分离原则——标签自带样式属性是历史包袱 | `font`、`center`、`big`、`tt`、`nobr`、`strike` |
| 被新语义取代 | 更准确的元素出现，旧元素成为冗余 | `acronym` → `abbr`，`dir` → `ul`，`isindex` → `search` + 表单控件 |
| 安全与互操作 | 依赖外部插件或破坏 Web 的基本模型 | `applet`（NPAPI 插件被全行业移除）、`keygen`（密钥格式互操作差）、`frameset`（破坏 URL/无障碍模型） |

「表现层越权」这一类解释了 HTML5 的核心动机之一：CSS 成熟后，浏览器不再需要「结构标签兼职排版」。这也是为什么替代方案几乎清一色是 CSS 属性。

### 4.2 浏览器还认这些标签吗：quirks 模式

大多数废弃标签在旧浏览器兼容模式下仍能渲染（如 `font`、`center`、`marquee`），`frameset` 在新浏览器中已无法作为主文档工作。渲染行为与文档的 **DOCTYPE** 直接相关：没有标准 DOCTYPE 的老页面会进入**怪异模式（quirks mode）**，浏览器用上世纪的兼容规则渲染（盒模型、行高都不同）——这正对应[DOCTYPE 声明](/html5/040-DocTypeDeclaration)里「声明决定渲染模式」的机制。给老页面补上标准 DOCTYPE 往往是重构的第一步，也是最容易引发「样式全乱了」惊吓的一步：补 DOCTYPE 后页面从怪异模式切到标准模式，依赖怪异行为的旧样式会露馅。

```text
新代码：一律不写废弃标签
老项目：能改则改；暂时不能改，先确认不影响功能与安全，再排期替换
```

## 5. 遇到老项目的排查思路

1. 先区分「废弃标签」和「标准标签的旧写法」（如 `<br />` 的斜杠写法仍然合法）；
2. 用 W3C 校验器扫描，聚焦 `obsolete` 类报错；
3. 逐个替换：`font` → class + CSS；`center` → CSS；`acronym` → `abbr`；
4. 替换后对比渲染效果，重点检查文字颜色、字号、对齐是否被 CSS 覆盖。

## 6. 与相邻知识的关系

- [内容模型与嵌套规则](/html5/390-HTML5ContentModelAndNestingRules)：废弃解决「哪些标签不能再用」，内容模型解决「还能用的标签怎么合法嵌套」——老页面重构时两件事要一起做；
- [新元素与新能力](/html5/440-HTMLNewElementsAndCapabilities)：本文的「考古」与它的「上新」是同一枚硬币的两面——`<search>` 取代 `isindex` 的搜索语义就是最好的对照；
- [DOCTYPE 声明](/html5/040-DocTypeDeclaration)：怪异模式与标准模式的开关，重构老页面时第一个要检查的声明；
- CSS 模块（盒模型、文本属性）：几乎每个「表现层越权」类废弃标签的替代方案都在那里。

## 7. 面试题思路

**「HTML5 为什么要废弃 font、center 这些标签？」** 按三层作答：分离原则（结构/表现职责分离，表现归 CSS）→ 工程收益（一份样式管全站、媒体查询响应式成为可能）→ 顺带能举出「`<u>`、`<b>` 被重新定义而非废弃」的反例，说明标准制定者的取舍逻辑是语义而非「看着过时就删」。

**「把一个 quirks 模式的老页面补上 DOCTYPE，会发生什么？」** 考对渲染模式的理解：页面从怪异模式切换到标准模式，盒模型计算、行内元素垂直对齐、图片底部空隙等默认行为改变，依赖怪异行为的旧 CSS 会「突然乱掉」。正确姿势是补 DOCTYPE 与回归测试一起做，把样式逐段对齐标准模式。

## 8. 动手试试

先看任务与提示，自己改完再看参考实现。

### 入门版

1. 在本地写一个 `<font color="red">`、`<center>`、`<marquee>` 混用的页面，刷新看看老浏览器的渲染效果；
2. 把页面改写为 CSS 方案，对比代码可维护性。

### 进阶版

1. 找一个开源老项目（或老师提供的旧代码），用校验器扫描废弃标签，列一张「替换清单」；
2. 把 frameset 老页面改造成普通 HTML + iframe 结构，说明改造前后的差异。

参考实现（入门版任务 2 的改造对照）：

```html
<!-- 改造前：表现全写在结构里 -->
<font color="red" size="5">限时优惠</font>
<center><p>全场八折</p></center>

<!-- 改造后：结构归 HTML，表现归 CSS -->
<style>
  .promo-title { color: red; font-size: 1.25rem; }
  .promo-note { text-align: center; }
</style>
<p class="promo-title">限时优惠</p>
<p class="promo-note">全场八折</p>
```

自检：改造后「限时优惠」的样式由谁控制？如果要给暗色主题换成金色，改 HTML 还是改 CSS？（改 CSS 一处即可——这正是「表现层越权」被废弃的原因。）

## 9. 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| 复制来的老代码里有 font 标签，能跑就不管 | 能跑不等于没问题 | 新代码一律不用，老代码登记替换 |
| 用 marquee 做跑马灯 | 不知道已废弃 | 用 CSS 动画实现同等效果 |
| 分不清废弃标签和标准标签 | 网上资料新旧混杂 | 以 WHATWG 规范与 MDN "Deprecated" 标记为准 |
| 把被重新定义的 b/i/s/u 一并替换 | 误信「老标签都废弃了」 | 查现行语义表，只替换真废弃的 |
| 补 DOCTYPE 后样式全乱 | 怪异模式切到标准模式 | 把它当作重构契机，逐段对齐标准模式 |

## 10. 下一步

考古结束，按顺序下一篇专项是 `410-HTML5InternationalizationTags`（东亚文字与国际化标签）；其后再是图像热区（420）、现代交互组件（430）与新元素速览（440）。
