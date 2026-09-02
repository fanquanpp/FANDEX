---
order: 10
title: 为什么需要 TypeScript：从 JavaScript 的烦恼说起
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 用零基础也能懂的例子解释 JavaScript 的类型陷阱与 TypeScript 的价值，建立类型思维的第一课。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'typescript/002-HowToReadThisCourse'
  - 'typescript/003-TypeScriptOverviewEnvSetup'
  - 'javascript/001-WhatIsJavaScript'
prerequisites:
  - 'javascript/001-WhatIsJavaScript'
---

## 一个真实的烦恼

先看一段能顺利运行、却埋着隐患的 JavaScript：

```javascript
function addPrice(a, b) {
  return a + b;
}

addPrice(10, 20);        // 30，符合预期
addPrice('10', '20');    // '1020'——字符串拼接了！
```

调用者把数字写成了字符串，函数不做任何提醒就返回了错误结果，页面可能在很久之后的某个角落才暴露异常。**JavaScript 只有在运行到出错那一行时才会发现问题**——项目越大，这类问题越难排查。

## TypeScript 的解法：先声明，再校验

TypeScript 是 JavaScript 的**超集**：所有合法 JS 代码都是合法 TS 代码，它额外增加了一套**类型系统**，在写代码阶段就拦截错误：

```typescript
function addPrice(a: number, b: number): number {
  return a + b;
}

addPrice(10, 20);        // 正常
addPrice('10', '20');    // 编辑器立刻画红线：
                         // 类型"string"的参数不能赋给"number"
```

`: number` 读作"参数必须是数字"。错误在保存文件的瞬间被指出，而不是上线后由用户发现。**类型就是给数据贴的标签，TypeScript 让计算机替你检查每个标签是否用对。**

## 它与 JavaScript 的真实关系

```mermaid
flowchart LR
    A[你写的 TypeScript] --> B[编译器 tsc 去掉类型标注]
    B --> C[纯 JavaScript]
    C --> D[浏览器或 Node.js 运行]
```

浏览器并不认识 TypeScript——所有 TS 代码最终会被编译回 JS 再运行。类型标注只是开发阶段的检查网，不会拖慢运行速度。因此本模块的每个语法点都建立在 JavaScript 基础上：**先修完 javascript 模块的基础部分再进入本模块，是最高效的路线。**

## 三个立刻能体会的好处

1. **自动补全变准了**：编辑器知道变量的类型后，能列出它全部可用属性与方法；
2. **重构不心虚**：改一个函数签名，所有调用处立刻标红，不会漏改；
3. **代码即文档**：`function getUser(id: string): Promise<User>` 一行就说明输入输出，胜过注释。

## 动手环节：感受一次类型检查

安装 Node.js 后（见 [Node.js 安装](/getting-started/017-NodeJsInstall)），在终端执行：

```bash
npm install -g typescript
tsc --version
```

新建 `demo.ts` 写入上面的 `addPrice` 与错误调用，执行 `tsc demo.ts`，你会看到类型错误被明确列出——这就是 TS 的工作方式。

## 下一步

读完 [如何学习本课程](/typescript/002-HowToReadThisCourse) 后进入 [TypeScript 概述与环境搭建](/typescript/003-TypeScriptOverviewEnvSetup)；类型进阶（泛型、联合类型）会在模块后半程展开。
