---
order: 570
title: 新特性深水区：把 ES2023-2026 安全用进生产
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 新特性采用策略与深水机制专题：V8/JSC/SpiderMonkey 的节奏差、caniuse 与 MDN 兼容表的查法、转译与 polyfill 的取舍、Stage 0-4 从提案到能用的年数感，深机制选讲 Array.fromAsync 的串行语义与 Set 方法的数学对应。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'javascript/590-ES2023To2026NewFeatures'
  - 'javascript/400-ModuleBundlingAndTreeShaking'
  - 'javascript/610-TemporalJavaScriptAPI'
  - 'javascript/620-ExplicitResourceManagement'
prerequisites:
  - 'javascript/590-ES2023To2026NewFeatures'
---

> 一句话分工：[590 篇](/javascript/590-ES2023To2026NewFeatures)按年份导览「有什么、怎么用」；本篇回答「怎么安全地用进生产」——引擎节奏差、支持度查法、转译与垫片的取舍、提案到定稿的时间感，深机制选讲 `Array.fromAsync` 与 Set 方法。读者画像：**已读完 590**。

## 前置知识

- 已完成 [ES2023 到 ES2026 新特性](/javascript/590-ES2023To2026NewFeatures)：认识 `Object.groupBy`、Set 方法、`Array.fromAsync` 的用法，本文不重复教用法；
- 读过 [模块打包原理与 Tree Shaking](/javascript/400-ModuleBundlingAndTreeShaking) 更好：第 4 节用到「构建目标」概念，没读过也会现场补一句。

## 学习目标

读完本文你将能够：

1. 解释「同一特性，为什么 Chrome 能跑、Safari 报错」，说出三引擎的节奏差；
2. 用 MDN 兼容表与 caniuse 查支持度，用一行特征检测写运行时守卫；
3. 区分「语法特性」与「内置对象特性」，选对转译、垫片或升级策略；
4. 复述提案从 Stage 0 到能用的流程，判断「该不该现在用」；
5. 解释 `Array.fromAsync` 为什么串行、Set 方法为什么接受 Set-like 对象，并在选型中利用这两点。

预计 60 到 75 分钟，含 2 道预测题与 1 道挑战题。

## 1. 你现在要解决什么问题

周一你在 590 篇学会 `Object.groupBy`，中午用进了订单汇总服务；周二下午测试群炸了：

```text
TypeError: Object.groupBy is not a function
    at sortOrders (/srv/app/orders.js:12:21)
```

你本机 Node 24 跑得好好的，测试环境是 Node 18。代码没写错，特性也进了规范——**它只是还没进你们的环境**。每年新特性都重演这一幕：特性发布在「规范时钟」上，能不能用取决于「引擎时钟」，两个时钟差几个月到几年。本文教你读这两个时钟，并把 590 篇两个值得深挖的机制讲透。

## 2. 三大引擎的节奏差

JavaScript 没有唯一官方实现：V8 随 Chrome 约每 4 周一版、Node 约每半年跟进一次（Chrome/Edge/Node/Deno 在用）；JavaScriptCore 随 Safari 约半年一版（Safari/Bun）；SpiderMonkey 随 Firefox 约每 4 周一版。三条流水线独立排期，任何新特性都有「时间差」（2026-09 快照，读本文时以 MDN 兼容表为准）：

| 特性 | V8（Chrome / Node） | JSC（Safari） | SpiderMonkey（Firefox） |
| --- | --- | --- | --- |
| Set 集合运算 | 122+ / 22+ | 17.4+ | 127+ |
| 迭代器辅助方法 | 122+ / 22+ | 18.4+ | 131+ |

两者同属 ES2025、同月进规范，Safari 却把迭代器辅助方法拖后了三四个版本——**规范归属相同，引擎落地时间可以完全不同**。这是第 1 节事故的根源，也是「支持度必须逐特性查」的原因。

## 3. 支持度三查：caniuse、MDN、运行时检测

第一查，[caniuse](https://caniuse.com)：查粗粒度特性（可选链、ES 模块）的全球支持率，决定「要不要为它设构建目标」。第二查，MDN 兼容表：方法页（如 `Object.groupBy`）页尾的 Browser compatibility，看 Chrome/Safari/Firefox 与 Node 各列，脚注写明从哪个版本默认开启；第 2 节那张表就是这么查出来的。第三查，运行时特征检测——前两查告诉你「该不该用」，这一查让代码自己判断「能不能用」：

```javascript
console.log(typeof Object.groupBy === 'function', typeof Set.prototype.union === 'function');
// Node 22+：true true；Node 18：false false —— 这正是守卫的价值
```

三条纪律：检测放在**运行时**；检测**能力**而不是 UA（用户代理字符串可伪造且永不更新）；结果缓存成常量供整棵调用树共用。小技巧：`node -p "process.versions"` 列出 node/v8 版本，V8 12.4 与 Chrome 122 同代——MDN 只给 Chrome 版本时也能心算 Node 侧。

## 4. 转译与 polyfill：两把钥匙开两把锁

新特性分两类，解法完全不同：

- **语法特性**（`?.`、`using`、类字段）：老引擎解析阶段就抛 `SyntaxError`。解法是**转译**：构建时把新语法改写成等价旧语法（Babel、esbuild、SWC）。
- **内置对象特性**（`Object.groupBy`、Set 方法、`Array.fromAsync`）：语法合法，运行时才抛 `TypeError: xxx is not a function`。转译**救不了**它——编译器不会改写「不存在的方法调用」。解法是**垫片**（polyfill）：向运行时注入一份 JS 实现，core-js 是事实标准。

口诀：**报 SyntaxError 找转译，报 is not a function 找垫片**。配错钥匙，构建再成功也白搭——这正是 590 篇 ES2023 方法在老环境报错的完整解释。工程上由「构建目标」统一调度：browserslist（或 vite/esbuild 的 `target`）声明支持到哪个环境，Babel preset-env 的 `useBuiltIns: 'usage'` 按实际用到的 API 注入 core-js，构建链原理见 [模块打包原理与 Tree Shaking](/javascript/400-ModuleBundlingAndTreeShaking)。

决策顺序（越上越好）：可控环境直接**升级**；公众 Web 前端**转译 + 按需垫片**；垫不了或不划算的（如 `Array.fromAsync`）**特征检测 + 等价回退**；收益配不上复杂度的**放弃**。两条暗坑：全局垫片会污染原型，库作者不该替用户打全局垫片；垫片必须在业务代码之前加载——静态 `import` 有提升兜着，动态加载的脚本只能靠入口第一行引入。

## 5. 从提案到能用：Stage 0-4 的年数感

一个特性从想法到你的键盘要闯五关（详见 [tc39 流程文档](https://tc39.es/process-document/)）：

| Stage | 名称 | 门槛 | 你的视角 |
| --- | --- | --- | --- |
| 0 | Strawman | 有人提交想法 | 当段子看 |
| 1 | Proposal | 委员会愿讨论问题与方案 | 可关注 |
| 2 | Draft | 规范初稿成形 | 别写进生产 |
| 3 | Candidate | 规范完备，等引擎反馈 | 可玩（flag/polyfill），别依赖 |
| 4 | Finished | **至少两个引擎**通过规范测试 | 排进采用计划 |

Stage 4 的两个引擎门槛是枢纽：它保证「进了规范」约等于「主流环境迟早可用」，但不保证「现在可用」——引擎铺开还要时间（第 2 节的节奏差）。两个时钟叠加出真实的年数感：Set 方法约 2019 年提出、2024 年定稿、2025 年出版，前后约六年；Temporal 2017 年提出、2026 年定稿，走了九年；590 篇的「3 月截稿规则」就是这套流程的日历投影。实操判断读 [tc39/proposals 看板](https://github.com/tc39/proposals) 的 README：Stage 3 且已有两个引擎默认开启，可以规划；只有 polyfill，玩可以、生产缓行；Stage 2 及以下，只影响设计品味。

## 6. 深机制一：Array.fromAsync 的串行并发语义

590 篇预告过 `Array.fromAsync(iterable)` 把异步流收成数组。深水区的问题是：**它等不等上一个元素？**

```javascript
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function* downloads() {
  yield sleep(100).then(() => '地图包');
  yield sleep(200).then(() => '音效包');
  yield sleep(300).then(() => '存档');
}

const t0 = performance.now();
const files = await Array.fromAsync(downloads());
console.log(files);                                                              // [ '地图包', '音效包', '存档' ]
console.log(`总耗时约 ${Math.round(performance.now() - t0)} ms`);                 // 总耗时约 605 ms（量级在 600 以上）
```

100 + 200 + 300 = 600：`fromAsync` **先等上一个元素完成，才要下一个**——串行，并发度恒为 1。对照组：同样的三个任务交给并发的 `Promise.all`，总耗时约 307ms——等于最长那一个。

这不是设计失误，是迭代器协议的天然结果：`fromAsync` 走拉取式协议，要一个、等一个、收一个，**天然带背压**。选型：上游是「必须逐页拉」的分页 API（下一页地址藏在上一页响应里），或想限制并发保护下游时，串行正合意；追求吞吐、任务独立时，用 `Promise.all` 自己组织并发。

## 7. 深机制二：Set 方法的数学对应与 Set-like 协议

590 篇用 Set 方法算过共同好友。先补一张「方法-数学」对照表，看到业务问题就能翻译成集合语言：

| 方法 | 数学记号 |
| --- | --- |
| `union` | A ∪ B，认识的所有人 |
| `intersection` | A ∩ B，共同好友 |
| `difference` | A \ B（有方向），他有我没有的 |
| `symmetricDifference` | A Δ B，只认识一方的 |
| `isSubsetOf` / `isSupersetOf` | A ⊆ B / A ⊇ B，权限齐全吗 |
| `isDisjointFrom` | A ∩ B = ∅，有无利益冲突 |

设计遵守数学直觉：交换律成立（差集除外），恒等式 A Δ B = (A ∪ B) \ (A ∩ B) 可现场用两个 Set 验证；所有方法返回**新 Set**——集合运算在数学里本就不「修改」集合，这让 `a.union(b).difference(c)` 的链式表达毫无心理负担。

另一个深水问题：参数为什么不要求真的是 Set？因为 API 定义在**协议**上而非类上——规范只要求参数提供 `size`、`has`、`keys` 三件套（规范里叫 SetRecord）。自己造一个 `{ size: 3, has: v => ['A7', 'B3', 'C9'].includes(v), keys: () => ['A7', 'B3', 'C9'][Symbol.iterator]() }`，`new Set(['A7', 'X2']).intersection(winning)` 照样返回 `[ 'A7' ]`——「长得像就用」的鸭子类型，让数据库查询结果、代理对象都能零拷贝参与集合运算；实现会挑较小的一侧遍历、另一侧用 `has` 判重，整体 O(n+m)。

## 8. 修改实验

以下实验先写预测再运行（Node 22+）。

实验一：把第 3 节检测里的 `Object.groupBy` 换成一个不存在的方法名再运行，守卫输出变成什么？这说明能力检测应该发生在构建时还是运行时？

实验二：把第 7 节 Set-like 的 `keys` 属性删掉，再调 `intersection`。预测结果——静默返回空集合，还是报错？

正确答案：实验一输出 `false`——能力检测逐次在运行时成立，恰好证明「环境是运行时属性」；实验二抛 `TypeError`——SetRecord 三件套缺一不可，协议是被强制执行的，不是文档建议。

## 9. 常见错误与调试实录

实录一：环境没跟上（即第 1 节事故）。三步：`TypeError` 排除语法问题；`is not a function` 且方法名没拼错，指向运行环境；报错里的行号定位代码。确认 Node 18 后按第 4 节决策排序修复：升级环境（首选）、`reduce` 等价回退、core-js 垫片（服务端加运行时开销不如升级）。

实录二：转译与垫片脱节。症状：构建全绿，老 Safari 白屏，报 `TypeError: Array.prototype.toSorted is not a function`。根因：构建配置只管语法（`target: 'safari14'`），`toSorted` 是内置方法，转译器原样放行。修复：补垫片，或列入「老环境不用」清单并加特征检测。同类错误还有垫片顺序：垫片放进了**动态加载**的 chunk，首屏业务代码先执行先报错——垫片必须在任何可能用到它的代码之前确定加载，入口第一行引入（或构建链 usage 注入）是唯一可靠位置。

## 10. 实际项目中的使用场景

内部工具与 Node 服务：运行时可控，直接升级、用满新特性，第 3、4 节成本全省。面向公众的 Web 前端：构建目标由用户数据决定（看自己站的浏览器分布，别拍脑袋），语法转译打底，内置特性「支持率够高才用 + 特征检测兜底」双保险。库作者：最保守——不打全局垫片，Stage 4 以下默认不用。复盘第 1 节：上线前查 MDN 兼容表确认 Node 下限，或入口加特征检测，两分钟避免一场事故。

## 11. 小练习

预测题一（10 分钟，先写答案再运行）：写一个两页的异步生成器 `pages`（每页 `sleep(200)` 后产出 `'第 1 页'`、`'第 2 页'`），用 `Array.fromAsync` 收集并打印，同时判断 `Math.round(耗时) >= 400` 的真假。输出与布尔各是什么？依据第 6 节哪个结论？

预测题二（5 分钟）：给定 Set-like 对象 `view`（`size: 2`，`has: v => v === 'x' || v === 'y'`，`keys` 迭代 `'x'`、`'y'`），`new Set(['x', 'z']).union(view).size` 是多少？用了第 7 节哪个机制？

挑战题（30 分钟，不给代码）：写一个 `collect(iterableFactory)`：环境有 `Array.fromAsync` 就用它，没有就用 `for await` 等价实现（模拟公司还有 Node 18 服务器）。验收：`collect(() => downloads())` 返回三个元素的数组，且两个分支都保持串行语义。提示：入口做一次 `typeof` 检测，两个分支都逐个等待；关键 API：`typeof Array.fromAsync === 'function'`、`for await...of`。

答案：预测题一——打印 `[ '第 1 页', '第 2 页' ]`，布尔 `true`；`fromAsync` 串行等待，200+200=400ms 起步（若并发实现约 200ms，布尔为 false）。预测题二——`3`；`union` 把 Set-like 的 `x`、`y` 并进来，加上自身独有的 `z`，用的是 SetRecord 协议。

## 12. 与之前和之后的知识的关系

- 往前：[590 篇](/javascript/590-ES2023To2026NewFeatures) 是本文地基，两篇合起来才是「新特性」的完整功课；[模块打包原理与 Tree Shaking](/javascript/400-ModuleBundlingAndTreeShaking) 的构建链是第 4 节的机械部分；
- 往后：[Temporal](/javascript/610-TemporalJavaScriptAPI) 与 [显式资源管理](/javascript/620-ExplicitResourceManagement) 是已定稿的深水专题，先验证自家环境再进入；[JavaScript 理论知识点](/javascript/660-JavaScriptTheory) 的事件循环能解释 `fromAsync` 串行等待时主线程在做什么。

## 13. 官方文档

- MDN JavaScript 参考（兼容表入口）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference
- TC39 提案看板：https://github.com/tc39/proposals
- TC39 流程文档（Stage 定义）：https://tc39.es/process-document/

## 14. 自我检查

- 能解释「规范时钟与引擎时钟」，指出任意新特性处在哪一格；
- 能不查资料说出 SyntaxError 与 is not a function 分别该找转译还是垫片；
- 能现场完成「MDN 兼容表 → Node 版本对应 → 特征检测」三连；
- 能解释 `Array.fromAsync` 选串行的原因，并在分页与吞吐场景间做正确选择；
- 能说出 Set 方法接受 Set-like 的协议三件套。

## 本章总结

新特性的「有没有」由规范时钟决定，「能不能用」由三引擎节奏差决定；caniuse、MDN 兼容表、运行时特征检测构成支持度三查。语法特性靠转译、内置特性靠垫片，报错形态直接指路。Stage 0-4 的两个引擎门槛与 3 月截稿规则，给了「什么时候用」的判断依据。深机制层面：`Array.fromAsync` 因迭代器拉取协议天然串行、自带背压；Set 方法构建在数学集合运算与 SetRecord 协议之上，鸭子类型让它零拷贝接纳「长得像 Set 的对象」。

## 下一步

带着第 3 节的三查方法，进入两篇已定稿的深水专题：[Temporal 日期时间 API](/javascript/610-TemporalJavaScriptAPI) 或 [显式资源管理](/javascript/620-ExplicitResourceManagement)——先验证自家环境，再开始学。
