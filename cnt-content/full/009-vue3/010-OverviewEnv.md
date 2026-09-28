---
order: 10
title: 概述与环境：数据变了，界面自己变
module: 'vue3'
category: 前端技术
difficulty: beginner
description: 从「改个数据要手动找 DOM」的旧日常引出 Vue 的核心主张：用 create-vue 一行命令搭起项目、预览单文件组件的三段结构、跑通并亲手修改第一个组件；附 Node 版本与模板未闭合两类真实报错的调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'vue3/020-Vue3QuickStartGuide'
  - 'vue3/030-Vue3TemplateSyntax'
  - 'vue3/050-ReactiveSystem'
  - 'vue3/270-Vue3ViteBuildConfig'
prerequisites:
  - 'javascript/090-ArrayHigherOrderMethod'
  - 'javascript/410-DOMOperationEvent'
---

## 前置知识

- 已完成 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod)：会用 map、filter、join 处理列表——Vue 模板里渲染列表全靠它们；
- 已完成 [DOM 操作与事件](/javascript/410-DOMOperationEvent)：亲手用 querySelector 和 addEventListener 改过页面——本文要终结的正是这种写法。

没学过也能跟：用到的数组方法随用随讲。本文不需要任何框架经验。

## 学习目标

读完本文你将能够：

1. 用 create-vue 脚手架从零创建 Vue 3 项目，跑通 `npm run dev`，说清 index.html、main.js、App.vue 三个文件各管什么；
2. 认出单文件组件（SFC）的 template、script、style 三段，说出每段负责什么；
3. 用一句话解释「数据变了，界面自己变」与手动改 DOM 的区别，指出你声明什么、Vue 包办什么；
4. 改动组件数据，先预测哪些内容会跟着变，再亲手验证；
5. 读懂 `Missing script: "dev"` 与 `Element is missing end tag.` 两类真实报错并修复。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

[DOM 操作与事件](/javascript/410-DOMOperationEvent) 里你干过这种事：数据变了，自己跑去页面上找地方改。

```javascript
// 战绩从 980 涨到 1000，你得亲手指挥浏览器
const scoreEl = document.querySelector('#score');
scoreEl.textContent = String(score);
```

一处数据就一处改动。可界面往往多处显示同一份数据：排行榜、头像角标、结算弹窗都要跟着改。每多一处显示，就多一段「找元素、改内容」的指挥代码；漏掉任何一处，界面就开始骗人。jQuery 时代的前端，大半时间耗在这种手工同步上。

Vue 的回答只有一句话：**数据变了，界面自己变。** 你只声明「界面长什么样、用了哪些数据」，数据一变，Vue 负责把变化落到页面上。声明式省掉的不是几行代码，而是整类「忘了同步」的 bug。

本篇先把这个主张跑起来。内部怎么做到的是 050 篇的事，现在只需亲眼看见「改数据，页面真的自己变了」。

## 2. 环境搭建：create-vue 一行启动

### 2.1 版本现状

先说清楚装什么。Vue 3.5.x 是当前稳定版，本模块全部示例适用；3.6 尚在 RC 阶段，核心变化是 Vapor 模式（无虚拟 DOM 的编译策略），是否可上生产以官方发布为准（以上版本信息验证于 2026-09）。新代码一律用组合式 API 加 `<script setup>`，本模块通篇如此；选项式写法主要用于 Vue 2 存量项目，本文不涉及。

工具链用官方脚手架 create-vue（基于 Vite 构建）。它对 Node.js 有版本要求（当前为 `^22.18.0 || >=24.12.0`，以官方 README 为准），Node 过旧是创建失败的头号原因。先验证：

```bash
node -v
```

预期输出（不低于脚手架要求即可）：

```text
v22.18.0
```

### 2.2 创建并启动

打开终端：

```bash
# 创建项目：交互式询问是否启用 TypeScript、路由、Pinia 等选项
npm create vue@latest my-vue-app

cd my-vue-app
npm install
npm run dev
```

create-vue 会逐项询问「是否引入 TypeScript」等选项，入门阶段全部回车选否即可；TypeScript 的引入时机在 230 篇。

预期输出（Vite 版本号以安装时为准）：

```text
  VITE vX.Y.Z  ready in 320 ms

  →  Local:   http://localhost:5173/
```

浏览器打开终端里的地址，环境就绪。项目根目录的 vite.config.js 原样保留，270 篇逐行拆解。

### 2.3 三个关键文件

模板文件不少，入门只认三个，数据流从上往下：

- index.html：唯一的 HTML 页面，body 里只有一个空壳 `<div id="app"></div>`；
- src/main.js：入口，用 createApp 把根组件挂到 #app 上——完整流程 020 篇逐行讲；
- src/App.vue：根组件，页面显示的内容从这里来。

## 3. SFC 预览：一个组件一个文件

打开 src/App.vue，整页替换成：

```vue
<template>
  <h1>{{ title }}</h1>
  <button @click="title = '云顶棋局'">切换游戏</button>
</template>

<script setup>
import { ref } from 'vue';

const title = ref('星陨峡谷');
</script>

<style scoped>
h1 {
  color: #42b883;
}
</style>
```

预期行为：页面先显示「星陨峡谷」；点一下按钮，标题变成「云顶棋局」——你没写一行 querySelector，页面自己变了。

这个 .vue 文件叫**单文件组件**（Single-File Component，SFC），三段各司其职：

| 段 | 职责 | 对应的旧知识 |
| --- | --- | --- |
| `<template>` | 界面长什么样 | HTML；`{{ }}` 表示「这里显示数据的值」 |
| `<script setup>` | 数据与逻辑 | JavaScript；顶层声明的变量模板直接可用 |
| `<style scoped>` | 样式 | CSS；scoped 表示只作用于本组件 |

两处新面孔先混个眼熟：`ref` 是 Vue 造的「带 .value 的盒子」，装着会变的数据，050 篇[响应式系统](/vue3/050-ReactiveSystem)讲透；`@click` 是监听点击的模板指令，030 篇[模板语法](/vue3/030-Vue3TemplateSyntax)讲透。现在照抄即可，重点是感受行为。

## 4. 核心概念：声明式界面

把开头的手工同步和刚才的组件放在一起看：

```text
命令式：数据变了，你逐处找元素去改——每处显示都要你管
声明式：数据变了，Vue 把用到它的地方全部更新——你一处都不用管
```

你写的 `{{ title }}` 是一个「占用声明」：这个位置显示 title 的值。title 换值时，Vue 自动刷新这个位置。至于怎么高效刷新（只改需要改的节点），是编译器与运行时的事，280 篇有专门讨论，现在不碰。

这套「数据驱动界面」的前提，是数据本身可被追踪——这正是 ref 存在的原因，也是 050 篇的全部主题。链条是：ref 声明数据 → 模板声明占用 → 框架包办同步。

## 5. 修改实验

实验一：script 改成 `const titles = ref(['星陨峡谷', '云顶棋局', '深渊回廊'])`，模板改成 `{{ titles.join(' → ') }}`，按钮改成 `@click="titles.reverse()"`。先预测再验证——数组方法在这里直接驱动界面更新，050 篇解释为什么。

实验二：把 `<style scoped>` 里 h1 的颜色改成红色，保存，观察页面立即变色——这是 Vite 的热更新：开发时不刷新页面，改哪补哪，细节在 270 篇。

实验三：在模板里另起一行写 `{{ title.length }}`，先预测显示值再验证；点切换按钮，看数字跟着变——插值里放的是表达式，值变它就变。

## 6. 常见错误与调试实录

**错误一：在错误的目录里运行命令。** `npm run dev` 敲下去，终端报：

```text
npm error Missing script: "dev"
```

三步定位：

1. 读报错：npm 在当前目录的 package.json 里找不到叫 dev 的脚本；
2. 验真身：`pwd` 看当前目录，`cat package.json` 看 scripts 段——是不是还停在外层目录，或者忘了 `npm install`；
3. 修正：`cd my-vue-app` 进入项目根目录再运行——npm 只在当前目录找 package.json。

**错误二：标签没闭合。** 改模板时手快，`</h1>` 少写了一半，终端与浏览器遮罩同时报：

```text
[plugin:vite:vue] Element is missing end tag.
```

三步定位：

1. 读报错：前缀 `[plugin:vite:vue]` 说明是 Vue 的 SFC 编译器在编译组件时失败；「Element is missing end tag.」直译「有个元素缺结束标签」；
2. 验真身：Vite 会在报错下方给出出错的文件与代码片段；
3. 修正：补上结束标签（`<img />` 这类自闭合写法除外）。SFC 是编译产物，语法错误保存那一刻就被拦下——总比上线白屏强。

## 7. 实际项目中的使用场景

- Vue 适合「数据频繁变化、界面跟着变」的应用：后台管理、看板、聊天、战绩页。组件化让页面拆成一个个 SFC，团队各改各的文件互不打架；
- 何时不用：内容基本不变的页面（帮助文档、落地页）用不上响应式这套机器，静态 HTML 或静态站点生成器更省；
- 生态按需取用：路由用 Vue Router、状态用 Pinia，创建项目时勾选即可（190 篇与 210 篇展开），现在什么都不用装。

## 8. 小练习

预测题（5 分钟，先写答案再运行）：

```vue
<template>
  <p>{{ 2 + 3 }}</p>
  <p>{{ games.length }}</p>
  <p>{{ 'games' }}</p>
  <p>{{ games.filter(g => g.top).length }}</p>
</template>

<script setup>
import { ref } from 'vue';

const games = ref([
  { name: '星陨峡谷', top: true },
  { name: '云顶棋局', top: false }
]);
</script>
```

四行各显示什么？第三行为什么显示字面量 games 而不是数组内容？（预期答案：5、2、games、1——引号里的就是字符串。）

修改题（10 分钟）：把 3 节的组件改造成「游戏轮播」：数据是三个游戏名组成的数组，一个按钮点一下显示下一个，到末尾再回到第一个。提示：`(index + 1) % titles.length` 可以循环推进下标，index 也要是 ref。

修 Bug 题（15 分钟）：下面的 App.vue 保存后终端报错如下。按三步定位并修复：

```vue
<template>
  <h1>战绩榜
  <p>{{ title }}</p>
</template>

<script setup>
import { ref } from 'vue';

const title = ref('星陨峡谷');
</script>
```

真实报错：

```text
[plugin:vite:vue] Element is missing end tag.
```

挑战题（半小时，不给代码）：做一个「今日状态」组件：布尔 ref 表示 inGame，页面据此显示「对局中」或「空闲」，一个按钮切换状态。验收清单：初始显示「空闲」；点按钮后显示「对局中」；再点切回「空闲」；全程没有写过一行 document 开头的代码。提示分两级：「提示」条件渲染指令还没学——三元表达式 `{{ inGame ? '...' : '...' }}` 就够了；「展开」切换布尔值写 `inGame = !inGame`，模板里操作的是解包后的值。

## 9. 与之前和之后的知识的关系

- 往前：090 篇的数组高阶方法在模板里就是渲染列表的主力；410 篇手动操作 DOM 的每一份累，都是 Vue 要替你省的；
- 往后：本模块按 010 → 020 → 030 → 040 的顺序推进——[第一个组件](/vue3/020-Vue3QuickStartGuide) 从 createApp 走到页面渲染并做出计数器，[模板语法](/vue3/030-Vue3TemplateSyntax) 讲透「模板里能写什么」，[指令系统](/vue3/040-Vue3DirectiveSystem) 收编 v-if、v-for、v-model 的全部细节；ref 为什么能驱动界面，见[响应式系统](/vue3/050-ReactiveSystem)；工程配置见 [Vue 3 与 Vite](/vue3/270-Vue3ViteBuildConfig)。

## 10. 官方文档

- Vue 简介：https://cn.vuejs.org/guide/introduction.html
- 快速上手：https://cn.vuejs.org/guide/quick-start.html
- 单文件组件：https://cn.vuejs.org/guide/scaling-up/sfc.html

## 11. 自我检查

- 能不看资料说出 index.html、main.js、App.vue 的分工；
- 能向同事解释「数据变了界面自己变」，并说出你声明什么、Vue 包办什么；
- 拿到一个 .vue 文件能说出三段各管什么，以及 scoped 的作用；
- 看到 `Missing script: "dev"` 能说出第一嫌疑人是终端当前目录；
- 看到 `Element is missing end tag.` 知道去模板里找没闭合的标签。

## 本章总结

Vue 的核心主张一句话：数据变了，界面自己变。create-vue 脚手架一行命令起项目，入门只需要认识 index.html、main.js、App.vue 三个文件。SFC 把组件装进一个文件：template 声明界面、script setup 声明数据、style scoped 声明样式；`{{ }}` 里放表达式，数据一变页面自动更新。ref 是带 .value 的盒子（050 篇讲透），@click 是事件指令（030 篇讲透）。npm 报 Missing script 先查当前目录；Vite 报 Element is missing end tag 就去找没闭合的标签。

## 下一步

进入[第一个组件](/vue3/020-Vue3QuickStartGuide)：顺着 main.js 的 createApp 把「组件怎么变成页面」走一遍，亲手写出一个会数数的计数器。
