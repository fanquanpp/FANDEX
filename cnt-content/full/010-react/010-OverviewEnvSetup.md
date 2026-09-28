---
order: 10
title: 界面 = f(state)：React 概述与环境搭建
module: 'react'
category: 前端技术
difficulty: beginner
description: 从「界面 = f(state)」这个函数式等式认识 React：组件是返回 JSX 的函数、用 Vite react 模板搭起项目、跑通并修改第一个组件；JSX 是 JS 扩展而非模板语言、与 Vue 模板的一句对照，附 default 导出缺失与 Objects are not valid as a React child 调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'react/020-ComponentProps'
  - 'react/030-StateEvent'
  - 'react/110-JSXDeepAnalysis'
  - 'react/460-ReactViteToolchainCommand'
prerequisites:
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/410-DOMOperationEvent'
---

## 前置知识

- 已完成 [函数、作用域与闭包](/javascript/080-FunctionScopeClosure)：会定义与调用函数，接受「参数进、返回值出」与「函数是值」；
- 已完成 [DOM 操作与事件](/javascript/410-DOMOperationEvent)：亲手用 querySelector 和 addEventListener 改过页面。

没学过也能跟：用到的函数知识随用随讲。提醒一句，本文反复出现的「组件就是函数」，正是 080 篇函数思维在界面上的落地——带着它来省一半力气。

## 学习目标

读完本文你将能够：

1. 用 Vite 的 react 模板从零创建项目并跑通 `npm run dev`，说清 index.html、main.jsx、App.jsx 三个文件各管什么；
2. 写出一个返回 JSX 的函数组件，并解释「组件就是函数」的含义；
3. 用「界面 = f(state)」说明声明式与命令式的区别，指出 React 替你包办了哪部分活；
4. 判断一段 JSX 里能不能写某个表达式，说出 JSX 与 Vue 模板的本质区别；
5. 读懂 `does not provide an export named 'default'` 与 `Objects are not valid as a React child` 两类真实报错并修复。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

[DOM 操作与事件](/javascript/410-DOMOperationEvent) 里做过待办清单：界面每变一次，你都要亲手指挥浏览器一串命令：

```javascript
// 每加一条待办，都要手动指挥浏览器干活
const list = document.querySelector('#list');
const item = document.createElement('li');
item.textContent = '打完排位去睡觉';
list.appendChild(item);
```

一条待办三行代码；改状态、删条目、重排序，每个动作各是一段新指挥。写多了你会发现：累的不是业务逻辑，而是「数据变了界面跟着变」得逐处手工同步——漏了哪处，界面就开始骗人。

React 对这个问题给了一个函数式的答案，一个等式：

```text
界面 = f(state)
```

state 是当前的数据（几条待办、谁是第一名），f 是你写的函数，等式右边算出来的就是界面该有的样子。**你只负责写 f：给我 state，我告诉你界面长什么样；state 变了，重新算一遍就是。** 至于「怎么把算出来的结果落到 DOM 上」，React 全权负责。

这就是声明式的全部含义：描述「应该是什么样」，而不是「怎么一步步改」。本篇先把等式跑起来：搭好环境，写出第一个 f。

## 2. 环境搭建：Vite react 模板

### 2.1 创建项目

React 是专注 UI 的 JavaScript 库，当前稳定大版本是 19.x（2026-09 核实时最新为 19.3，本模块示例全部适用）。它自己不管构建打包，工具链从 Vite 借。Vite 要求 Node.js 20.19+/22.12+，推荐 Node 22 LTS——Node 版本过低是创建失败的头号原因。

打开终端：

```bash
# 教学主线：JavaScript 模板（本模块入门三篇都用它）
npm create vite@latest my-app -- --template react

cd my-app
npm install
npm run dev
```

预期输出（Vite 版本号以安装时为准）：

```text
VITE vX.Y.Z  ready in 280 ms

  →  Local:   http://localhost:5173/
```

浏览器打开这个地址，看到默认页面，环境就绪。工程上更常用 `--template react-ts`，工具链细节（@vitejs/plugin-react、Fast Refresh、代理与环境变量）在 [React 的 Vite 工具链](/react/460-ReactViteToolchainCommand) 讲透，本篇不重复。

### 2.2 三个关键文件

模板文件不少，入门只需认识三个：index.html、src/main.jsx、src/App.jsx。数据流：index.html 提供 `div#root` 空壳，main.jsx 挂载 App，App 决定页面内容。

- index.html：唯一的 HTML 页面，body 里只有一个空壳 `<div id="root"></div>`；
- src/main.jsx：入口，把 App 组件挂到 #root 上；
- src/App.jsx：你的第一个组件，页面显示的东西从这里来。

main.jsx 原样保留，看懂即可：

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`createRoot` 告诉 React「这块地归你管」，`render(<App />)` 让它把 App 组件画进去。StrictMode 是开发期的检查器，会在控制台多打印一些警告帮你抓坏习惯，生产构建里自动失效，先照抄即可。

## 3. 第一个组件：返回 JSX 的函数

把 src/App.jsx 整个替换成：

```jsx
function App() {
  return <h1>战绩榜</h1>;
}

export default App;
```

保存，浏览器立刻变成一行「战绩榜」。App 就是个普通函数——080 篇说过「参数进、返回值出」，这里它不收参数，返回值是一段 JSX：长得像 HTML 的 JavaScript 扩展语法。

这个函数为什么能变成页面？因为你在 main.jsx 里把它交给了 React。**组件的定义：返回界面描述的函数。** React 拿到描述，负责把它变成真实 DOM。

## 4. JSX 是什么：JS 扩展，不是模板语言

初见 JSX 容易以为它是「写在 JS 里的 HTML 模板」，方向反了：JSX 本身就是 JavaScript 语法的一部分，由编译器（Vite 里的 esbuild）翻译成普通函数调用，浏览器执行的根本不是 JSX。和 Vue 对照一句就清楚：Vue 的 template 是独立的模板语言，v-if、v-for 是模板自己的指令；JSX 没有指令，花括号里直接写 JS 表达式：

```jsx
const player = { name: '阿天', score: 980 };

function App() {
  const isTop = player.score >= 900;
  return (
    <div>
      {/* 花括号里写表达式 */}
      <h1>{isTop ? '巅峰选手' : '在榜选手'}</h1>
      <p>{player.name} 的分数：{player.score + 20}</p>
      <p>{['酒馆', '矿洞'].join(' → ')}</p>
    </div>
  );
}

export default App;
```

预期行为：页面显示三行——「巅峰选手」「阿天 的分数：1000」「酒馆 → 矿洞」。需要放「一个值」的地方就写 `{}`；整句语句（`if`、`for`）放不进去，表达分支用三元和提前返回，这个手感 020 篇会大量使用。

两条书写规则现在记住：标签必须闭合（`<img>` 要写成 `<img />`）；组件名大写开头——`<App />` 是组件，`<app />` 会被当成叫 app 的 HTML 标签，页面什么都不显示（调试实录里有真实警告）。

## 5. 修改实验

实验一：在 return 里手写三行玩家内容（如 `<p>阿天 980</p>`），逐行保存，确认浏览器即时更新——这就是 Fast Refresh，原理在 460 篇。

实验二：把 `{player.score + 20}` 改成 `{player.score}`，先写预测值再保存验证。

实验三：在 return 前写 `if (player.score < 900) return <p>未上榜</p>;`，把 score 改到 900 以下，确认页面切换——提前返回是 JSX 表达分支的正规写法之一。

## 6. 常见错误与调试实录

**错误一：App.jsx 忘了导出。** 写完组件保存，页面白屏，浏览器控制台：

```text
Uncaught SyntaxError: The requested module '/src/App.jsx' does not provide an export named 'default'
```

三步定位：

1. 读报错：main.jsx 要从 App.jsx 拿 default 导出，没拿到——问题在 App.jsx 的导出；
2. 验真身：打开 App.jsx 看结尾，是不是少了 `export default App;`；
3. 修正：补上导出。组件文件默认导出组件是惯例，这行是新手白屏的头号来源。

**错误二：直接渲染对象。** 手滑把整个对象塞进花括号：

```jsx
const player = { name: '阿天', score: 980 };
// <p>{player}</p> ← 错误写法
```

浏览器控制台真实报错：

```text
Uncaught Error: Objects are not valid as a React child (found: object with keys {name, score}). If you meant to render a collection of children, use an array instead.
```

三步定位：报错说标签之间的内容不能是对象，还列出了对象的键（keys {name, score}）——顺着找到那一行，改成 `{player.name}`。记住结论：**要渲染什么就取那个值出来，别把整个对象丢进界面。**

## 7. 实际项目中的使用场景

- React 适合「数据频繁变化、界面要跟着变」的应用：后台管理、聊天工具、战绩页、看板。FANDEX 本站就是 Astro 7 + React 19 构建的，页面里的交互块全是 React 组件；
- 何时不用：内容基本不变的静态页面用不上这套状态机器，直接 HTML 或静态站点生成器更省；
- React 只管 UI 一层：路由、数据请求、全局状态各有配套方案，分别在 070 篇与 050 篇展开，现在不用装任何库。

## 8. 小练习

预测题（5 分钟，先写答案再运行）：

```jsx
const score = 980;

function App() {
  return (
    <div>
      <p>{score > 900 ? '上榜' : '落榜'}</p>
      <p>{score}</p>
      <p>{'score'}</p>
    </div>
  );
}
```

三行各显示什么？第三行为什么显示的是字面量 score 而不是 980？

修改题（10 分钟）：把 3 节的 App 改成显示两位玩家（阿天 980、小满 870）——先手写两遍标签体会重复；020 篇会用组件加 map 消灭它。

修 Bug 题（15 分钟）：下面的组件保存后页面白屏，控制台真实报错如下。按三步定位并修复：

```jsx
const user = { name: '小满' };

function App() {
  return <p>欢迎，{user}</p>;
}

export default App;
```

真实报错：

```text
Uncaught Error: Objects are not valid as a React child (found: object with keys {name}). If you meant to render a collection of children, use an array instead.
```

挑战题（半小时，不给代码）：写一个组件 `RankTitle({ gameName, topScore })`，要求：gameName 为空字符串时显示「请设置游戏名」，否则显示「{gameName} 巅峰分：{topScore}」，且展示的分数要加上 20 的加成。验收：`<RankTitle gameName="星陨峡谷" topScore={960} />` 显示「星陨峡谷 巅峰分：980」。

提示分两级：「提示」分支用提前返回或三元都行；「展开」判空用 `gameName === ''`，加成在花括号里现算。

## 9. 与之前和之后的知识的关系

- 往前：080 篇的「函数返回值」在这里升级成「函数返回界面描述」；410 篇手动操作 DOM 的累，正是 React 存在的理由；
- 往后：本模块按 A→B→C→040 的顺序推进——[组件与 Props](/react/020-ComponentProps) 把 App 拆成小函数，[状态与事件](/react/030-StateEvent) 让界面动起来，[Hooks 深入](/react/040-HooksDeep) 回答「函数反复执行，数据凭什么记得住」；JSX 编译产物见 [JSX 深入](/react/110-JSXDeepAnalysis)，工具链见 [React 的 Vite 工具链](/react/460-ReactViteToolchainCommand)。

## 10. 官方文档

- React 中文文档「快速开始」：https://zh-hans.react.dev/learn
- 你的第一个组件：https://zh-hans.react.dev/learn/your-first-component
- 用 JSX 书写标记：https://zh-hans.react.dev/learn/writing-markup-with-jsx
- Vite 官方指南：https://cn.vite.dev/guide/

## 11. 自我检查

- 能不查资料说出 index.html、main.jsx、App.jsx 的分工，以及 createRoot 干了什么；
- 能用一句话向同事解释「界面 = f(state)」，并指出 React 替你包办的部分；
- 拿到一段 JSX，能判断每个 `{}` 里的内容是否合法，并说出组件名必须大写的原因；
- 看到 `does not provide an export named 'default'`，能立刻说出第一嫌疑人是哪个文件；
- 知道 JSX 里放不下对象，报错里的 keys 列表就是定位线索。

## 本章总结

React 把「数据变了界面跟着变」从手工同步变成一个等式：界面 = f(state)。你写 f——返回 JSX 的函数组件；React 负责把描述落到 DOM。Vite react 模板是标准起点：index.html 提供空壳，main.jsx 用 createRoot 挂载 App。JSX 是 JavaScript 的扩展而非模板语言，花括号里写表达式，组件名大写开头，标签必须闭合。白屏先查 default 导出；`Objects are not valid as a React child` 意味着你把整个对象塞进了界面。

## 下一步

进入 [组件与 Props](/react/020-ComponentProps)：把 App 拆成一堆小函数，让「战绩榜」从一整坨 JSX 变成一颗组件树——080 篇「不重复自己」的教训，在界面上再赢一次。
