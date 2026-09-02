---
order: 10
title: JavaScript 是什么：你的第一门编程语言
module: 'javascript'
category: 前端技术
difficulty: beginner
description: 面向完全零基础读者，讲清 JavaScript 的定位、能做什么、在哪里运行，并写出第一行可执行的代码。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'javascript/002-JavaScriptOverviewRuntimeEnv'
  - 'getting-started/002-WhatIsProgramming'
  - 'html5/001-WhatIsWebpage'
prerequisites:
  - 'getting-started/002-WhatIsProgramming'
  - 'getting-started/003-HowInternetWorks'
---

## 网页的三层分工

把网页想象成一个人：HTML 是骨架（结构）、CSS 是皮肤与衣着（外观）、JavaScript 是肌肉与神经（行为）。你在网页上见到的所有"动起来"的部分——点击按钮弹出提示、下拉刷新、购物车结算、表单校验——都是 JavaScript 在工作。

## JavaScript 能做什么

它的版图远比"网页特效"大：

| 场景 | 说明 |
| --- | --- |
| 浏览器交互 | 全部主流网页的界面逻辑，浏览器唯一内置的脚本语言 |
| 服务端 | 借助 Node.js 运行时，可以写网站后台与接口（见本仓库 nestjs 模块） |
| 桌面与移动端 | 借助 Electron、React Native 等框架开发跨端应用 |
| 工具链 | 前端构建工具（Vite 等）本身也由 JavaScript/TypeScript 编写 |

对零基础学习者，这意味着：**学会这一门语言，前端、后端、桌面端三条路都打通了入口。**

## 它在哪里运行

只有两个地方需要关心：

1. **浏览器**：你按 `F12` 打开的控制台就是一个即写即跑的 JavaScript 运行环境；
2. **Node.js**：让 JavaScript 脱离浏览器、在操作系统里运行的工具（安装见 [Node.js 安装配置](/getting-started$2）。

## 动手环节：第一行代码

不需要安装任何东西。打开浏览器按 `F12`，切到 Console（控制台）标签，输入以下内容并回车：

```javascript
console.log('你好，世界');
```

你会立刻看到输出：`你好，世界`。`console.log` 的含义是"把括号里的内容打印到控制台"——它是你未来最主要的调试伙伴。

再来一段带逻辑的：

```javascript
// 定义一个函数：输入名字，返回问候语
function greet(name) {
  return '你好，' + name + '！欢迎来到编程世界。';
}

console.log(greet('学习者'));   // 输出：你好，学习者！欢迎来到编程世界。
```

逐行拆解：`function` 定义一个可复用的功能块；`name` 是传入的参数；`return` 把结果交还；最后一行调用它并打印。**编程就是把想法写成这样一段可反复执行的步骤。**

## 报错是正常现象

在控制台输入 `console.log(abc)` 并回车，你会看到红色报错：`Uncaught ReferenceError: abc is not defined`。翻译过来是"abc 这个变量没有定义"。**读报错是编程的核心技能**——报错信息会告诉你出了什么错、在第几行，九成的初学者问题答案就写在报错里。

## 下一步

完成上面的动手环节后，进入 [JavaScript 概述与运行环境](/javascript$2 系统学习语法主线；想理解页面上 HTML 与 CSS 如何配合，先读 [网页是什么](/html5$2 与 [CSS 是什么](/css$2。
