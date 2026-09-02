---
order: 10
title: CSS 是什么：给网页穿衣服的语言
module: 'css'
category: 前端技术
difficulty: beginner
description: 面向零基础读者建立 CSS 的心智模型，理解选择器与样式规则，为第一个网页添加颜色与布局。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/002-CSS3OverviewBasicSyntax'
  - 'html5/001-WhatIsWebpage'
prerequisites:
  - 'html5/001-WhatIsWebpage'
---

## CSS 在整张地图上的位置

[HTML 第一课](/html5/001-WhatIsWebpage)里你建出的网页只有黑白文字——那是骨架。**CSS（层叠样式表）负责外观**：颜色、字体、大小、间距、位置、动画，全部由它控制。骨架与皮肤分离，是网页开发最重要的设计思想之一：结构变了样式可以不动，换主题也不用改内容。

## 样式规则的三段式

CSS 的基本单位是一条**规则**：

```css
p {
  color: #2563eb;
  font-size: 16px;
}
```

- `p` 是**选择器**——"选中谁"；
- `color: #2563eb;` 是一条**声明**——"把它的颜色改成蓝色"；
- 花括号内可以写任意多条声明。

`#2563eb` 是颜色的十六进制写法。也可以直接写 `blue`、`red` 等英文单词。

## 动手环节：给你的第一个网页穿衣服

回到 [HTML 第一课](/html5/001-WhatIsWebpage)创建的 `index.html`，在 `<head>` 里加入：

```html
<style>
  body {
    font-family: sans-serif;
    background: #f8fafc;
    margin: 40px;
  }
  h1 {
    color: #1d4ed8;
  }
  p {
    line-height: 1.8;
  }
</style>
```

保存并刷新浏览器：页面有了浅灰背景、蓝色标题、更舒展的行距。改几个数值再刷新，观察变化——**样式是所见即所得的，调参数是最好的入门方式。**

三种常见的引入方式，各有一个适用场景：

1. 行内样式：`<p style="color: red">`——临时覆盖某处，不推荐大量使用；
2. 内部样式：上面的 `<style>` 块——单页练习够用；
3. 外部文件：`<link rel="stylesheet" href="style.css">`——真实项目的标准做法。

## 选择器：精准选中你想改的元素

```css
h1 { }              /* 选中所有 h1 */
.xiao-ti { }        /* 选中 class 为 xiao-ti 的元素 */
#zhu-lan { }        /* 选中 id 为 zhu-lan 的元素 */
p a { }             /* 选中所有 p 标签里面的 a 标签 */
```

对应 HTML 里的写法：`<p class="xiao-ti">`、`<div id="zhu-lan">`。**class 可以重复给多个元素用，id 在一个页面里应当唯一**——这条约定贯穿整个前端生涯。

## 常见困惑

**"写了样式为什么不生效？"**——按命中优先级排查：是否有拼写错误、选择器是否真的选中了元素（用 F12 的 Elements 面板点击元素查看）、是否被更靠后的规则覆盖。F12 的 Styles 面板会列出每条生效与被划掉的规则，是排查样式的第一工具。

**"布局为什么这么难？"**——传统布局靠手动计算与技巧，现代布局体系 Flexbox 与 Grid 已经把它变成"声明意图"，本模块布局章节会用大量图示讲清它们。

## 下一步

进入 [CSS3 概述与基础语法](/css/002-CSS3OverviewBasicSyntax) 系统学习盒模型与常用属性；想给页面加交互行为，接着进入 [JavaScript 模块](/javascript/001-WhatIsJavaScript)。
