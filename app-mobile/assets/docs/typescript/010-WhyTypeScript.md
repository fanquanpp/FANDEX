---
order: 10
title: 为什么需要 TypeScript：从 JavaScript 的烦恼说起
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 用零基础也能懂的例子解释 JavaScript 的类型陷阱与 TypeScript 的价值，建立类型思维的第一课。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'typescript/020-HowToReadThisCourse'
  - 'typescript/030-TypeScriptOverviewEnvSetup'
  - 'javascript/010-WhatIsJavaScript'
prerequisites:
  - 'javascript/010-WhatIsJavaScript'
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

第二条值得展开，因为它是团队场景里 TS 最大的卖点。假设 JS 项目里有个字段 `userName` 被三十个文件引用，你想改名成 `nickname`：全局搜索替换赌的是「没有第二处拼法不同的引用」，而 `'userNmae'` 这样一处手滑，运行前没有任何工具提醒你。TS 项目里同一件事：改掉类型定义里的字段名，保存，编辑器把三十个文件里所有引用处一次性标红——**你照着红线改完，红线清零，重构就完成了**。类型定义成了「牵一发动全身」的那根发丝，这正是它被称作「安全网」的原因。

## 心智模型：类型是写代码前先谈好的合同

把每个函数签名当成一份**合同**：参数类型是「我需要什么」，返回类型是「我承诺还给你什么」。合同签好之后：

- 调用方拿着合同检查自己的实参，少传、传错当场被拦；
- 实现方拿着合同检查自己的返回，承诺了 `number` 却返回 `string` 也当场被拦；
- 阅读方只需要看合同就知道这个函数怎么用，不用钻进实现。

这套思维还回答了一个常见疑问：「有了单元测试，还要类型吗？」测试抽查**若干组具体输入**，类型检查**全部调用点**的形状——两者是互补的防线，不是二选一。脚本小到只跑一次，类型可以偷懒；代码要被第二个人（包括三个月后的你）读到，类型就开始回本。

## 什么时候 TS 价值最大，什么时候可以不上

价值最大的场景：三人以上协作、代码生命周期超过三个月、有 npm 包要给陌生人用——合同越重要，类型越值钱。

可以不上的场景：一次性脚本、几百行以内的原型验证、Jupyter 式的数据探索。这时类型标注是纯开销，直接 JS 甚至直接跑。判断标准一句话：**这份代码会被谁再读一次？**答案超过一个人，就上 TS。

## 动手环节：感受一次类型检查

安装 Node.js 后（见 [Node.js 安装](/javascript/520-NodeJsInstall)），在终端执行：

```bash
npm install -g typescript
tsc --version
```

新建 `demo.ts` 写入下面的代码，保存后执行 `tsc demo.ts`：

```typescript
function addPrice(a: number, b: number): number {
  return a + b;
}

console.log(addPrice(10, 20));      // 30，正常
console.log(addPrice('10', '20'));  // 编辑器红线 + tsc 报错：
// error TS2345: Argument of type 'string' is not
// assignable to parameter of type 'number'.
```

然后把两处 `'10'` 的引号删掉重跑——报错消失，`tsc` 在同目录产出 `demo.js`（去掉了类型标注的纯 JS）。打开对比两个文件，你会亲眼看到第 2 节流程图里「编译器去掉类型标注」那一步。

### 练习：合同裁判（先遮住参考答案）

判断下列四个调用，哪些会被类型检查拦下、哪些放行，先写结论再验证：

```typescript
function sendEmail(to: string, subject: string): boolean { return true; }

sendEmail('a@b.com', 'hello');   // 甲
sendEmail('a@b.com');            // 乙
sendEmail('a@b.com', 'hello', 'cc@c.com');  // 丙
sendEmail(12345, 'hello');       // 丁
```

参考答案：甲放行；乙被拦（缺少第二个合同要件）；丙被拦（合同没有第三个位置）；丁被拦（第一个要件类型不符）。TS 的合同按「参数一个不多、一个不少、类型逐个对上」执行——记住这个口味，后面所有语法都是在细化这份合同。

## 下一步

读完 [如何学习本课程](/typescript/020-HowToReadThisCourse) 后进入 [TypeScript 概述与环境搭建](/typescript/030-TypeScriptOverviewEnvSetup)；类型进阶（泛型、联合类型）会在模块后半程展开。
