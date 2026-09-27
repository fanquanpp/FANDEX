---
order: 560
title: ES2023 到 ES2026：每年都有人替你解决的小别扭
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 以「立刻会用」为标准逐年导览 ES2023 至 ES2026 新特性：非破坏数组方法与 findLast、Object.groupBy 与正则 v 标志、Set 集合运算与迭代器辅助方法、2026 批次前沿，每个特性配最小示例与预期输出。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'javascript/600-JavaScriptLatestFeature'
  - 'javascript/310-IteratorHelper'
  - 'javascript/610-TemporalJavaScriptAPI'
  - 'javascript/620-ExplicitResourceManagement'
prerequisites:
  - 'javascript/220-ES6NewFeatures'
---

## 前置知识

- 已完成 [ES6+ 新特性](/javascript/220-ES6NewFeatures)：会解构、箭头函数，写过 `async/await`；
- 建议在 Node 22+ 里跑示例（安装见 [Node.js 安装](/javascript/520-NodeJsInstall)，多版本切换见 [nvm](/javascript/530-NvmVersionManage)），版本不够时部分示例会报错，第 7 节带着读。

没学过 220 也能跟：每个特性都是独立小工具，旧语法当场一句话补齐。

## 学习目标

读完本文你将能够：

1. 用 `findLast` 与「to 系」非破坏方法改写「找最后一个」和「排序展示」，说清原数组有没有被改；
2. 用 `Object.groupBy` 一行分组，判断何时必须换 `Map.groupBy`；
3. 用 Set 的 `union`/`intersection`/`difference` 求共同好友，删掉手写的 `filter + includes`；
4. 读懂正则 `v` 标志的集合运算，写出「字母但排除某几类」的模式；
5. 面对批次前沿特性，先查 tc39/proposals 看板与 MDN 兼容表再用。

预计 50 到 70 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

你在维护游戏排行榜模块，产品提了三个需求：把玩家最近一次低于 60 分的记录标红——「最近一次」在数组尾部，旧写法是从尾往前扫的 for 循环，或 `[...scores].reverse().find(...)`，为一个元素先复制再反转整个数组；榜单按分数排序展示但原始录入顺序不能动——`sort()` 恰恰会改原数组，React/Vue 的状态被原地排序后界面就开始「灵异事件」；好友页显示共同好友——手写 `filter` 套 `includes`，集合一大就慢。

没有一件难，但每件都有点别扭。别扭不是你写得差——是语言的历史欠账，TC39（制定 ECMAScript 标准的委员会）每年都在还一笔。本文按年份把 2023 到 2026 还账清单里「立刻会用」的部分过一遍。

## 2. ES2023：数组终于学会不搞破坏

### 2.1 findLast：从尾部找，不用再反转

```javascript
const scores = [{ player: '阿澈', score: 82 }, { player: '小满', score: 55 }, { player: '小满', score: 48 }];

console.log(scores.findLast(s => s.score < 60));
// { player: '小满', score: 48 }
```

`findLast` 从尾部向前找，语义与 `find` 一样、方向相反（配套的 `findLastIndex` 返回下标），第 1 节的手写倒序循环可以删了。

### 2.2 toSorted / toReversed / with：排序不动原数组

```javascript
const original = [3, 1, 2];
console.log(original.toSorted());    // [ 1, 2, 3 ]
console.log(original.toReversed());  // [ 2, 1, 3 ]
console.log(original);               // [ 3, 1, 2 ]，原数组没被碰过
```

命名规律：老方法前加 `to` 就是「返回新数组的版本」——`toSorted()` 对应 `sort()`，`toReversed()` 对应 `reverse()`，`toSpliced()` 对应 `splice()`，`with(索引, 新值)` 是「改完返回新数组」的通用款。榜单排序一行 `toSorted((a, b) => b.score - a.score)` 搞定；比较函数不给就按字符串排（第 6 节实验二亲眼看下场）。

预告：异步世界想把「一页页拉回来的异步流」收成数组，此前只能手写 `for await` 加 `push`；`Array.fromAsync` 已定稿、正在铺开，把样板收成一行，但它的并发语义有讲究，见 [新特性深水区](/javascript/600-JavaScriptLatestFeature) 第 6 节。

## 3. ES2024：分组与正则的集合运算

### 3.1 Object.groupBy：告别 reduce 手搓分组

按状态给待办分组，旧写法一段 `reduce` 样板，现在一行（Node 21+、Chrome 117+）：

```javascript
const todos = [{ title: '写周报', status: 'doing' }, { title: '修登录 bug', status: 'todo' }];

const byStatus = Object.groupBy(todos, t => t.status);
console.log(byStatus.doing.map(t => t.title));  // [ '写周报' ]
console.log(Object.keys(byStatus));             // [ 'doing', 'todo' ]
```

两个细节：键由回调返回值转成字符串；返回对象**没有原型**，要用 `Object.hasOwn` 判断自身属性。键不是字符串时必须换 `Map.groupBy`（如 `Date` 当键，`Object.groupBy` 会强转成字符串而失效）。

### 3.2 预告：Promise.withResolvers

把事件回调改造成 `await` 风格，旧写法要在执行器里把 `resolve` 赋给外部变量；ES2024 的 `Promise.withResolvers()` 一行返回 `{ promise, resolve, reject }` 三件套。典型场景与拆解见 [Promise 静态方法](/javascript/270-PromiseStaticMethod)，这里不重复。

### 3.3 RegExp v 标志：字符类里做集合运算

`v` 标志（Node 20+、Chrome 112+）是 `u` 标志的升级，立刻有用的两个能力：

```javascript
/[[a-z]--[aeiou]]/v.test('e');       // false，小写字母减掉元音，b 则是 true
/\p{RGI_Emoji}/v.test('\u{1F44D}');  // true，合法 emoji 序列
```

`--` 是差集、`&&` 是交集；`RGI_Emoji` 是「推荐可渲染的 emoji 全集」，`u` 标志时代要靠第三方库，现在一个模式搞定。正则系统讲解见 [正则表达式](/javascript/110-Regex)。

## 4. ES2025：迭代器、Set 与正则三笔补齐

### 4.1 迭代器辅助方法：惰性版的 map/filter

数组方法每步都产生中间数组；ES2025 给迭代器配了同名的惰性方法，元素「按需流动」（Node 22+）：

```javascript
function* logLines() {
  yield 'INFO 启动完成';
  yield 'ERROR 支付超时';
  yield 'INFO 心跳正常';
  yield 'ERROR 库存扣减失败';
}

console.log(logLines().filter(l => l.startsWith('ERROR')).take(2).toArray());
// [ 'ERROR 支付超时', 'ERROR 库存扣减失败' ]
```

`take(2)` 拿够就停，后面的行根本不会被读——日志流、分页这类「读不完也不该读完」的数据源就该这么处理；无限生成器不加 `take` 会永远跑下去。方法全家桶见 [迭代器辅助方法](/javascript/310-IteratorHelper)。

### 4.2 Set 方法合集：集合运算进了语言

第 1 节的「共同好友」，ES2025 给了七个方法，全部返回新 Set、不改原集合（Node 22+）：

```javascript
const myFriends = new Set(['阿澈', '小满', '大力']);
const hisFriends = new Set(['小满', '大力', '阿花']);

console.log([...myFriends.intersection(hisFriends)]);  // [ '小满', '大力' ]，共同好友
console.log([...hisFriends.difference(myFriends)]);    // [ '阿花' ]，他有我没有的
```

`union` 求并集，其余四个（`symmetricDifference`、`isSubsetOf`/`isSupersetOf`、`isDisjointFrom`）判断集合关系。手写 `filter + includes` 是 O(n×m)，这些方法是 O(n+m)；数学对应见深水区篇第 7 节。

### 4.3 重复命名捕获组：多分支复用同一组名

日期既有 `2026-09-27` 又有 `27/09/2026` 两种写法，想用一个正则同时解析。旧规则禁止两个分支用同一组名，只能按下标取值；ES2025 解禁了：

```javascript
const datePattern = /(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})|(?<d>\d{2})\/(?<m>\d{2})\/(?<y>\d{4})/;

console.log('2026-09-27'.match(datePattern).groups);
// { y: '2026', m: '09', d: '27' }
console.log('27/09/2026'.match(datePattern).groups);
// 同样的 groups —— 两组同名，下游不用管格式
```

它是 ES2025 批次里落地最晚的特性之一，用前先在目标环境跑一行验证（怎么验证见深水区篇）。

## 5. ES2026 批次：以看板为准的前沿

先补一条年度规则，从此任何「ES20XX」都能自己推断归属：TC39 每年 3 月截稿，此前升到 Stage 4（定稿）的提案进当年规范，6 月发布；之后定稿的归下一年。拿不准不要背，直接看 [tc39/proposals 看板](https://github.com/tc39/proposals)。本文写作时（2026-09），批次里「立刻会用」的三个。

**Error.isError：可靠地判断「是不是真 Error」**。`instanceof Error` 跨 iframe、跨模块实例会失效，伪装对象也骗不过它；Node 24+ 已可用：

```javascript
Error.isError(new RangeError('越界'));  // true，Error 子类都算
Error.isError({ name: 'Error' });       // false，伪装对象拦下
```

**Math.sumPrecise：浮点求和不再抖**。记账程序里 `[0.1, 0.2]` 求和得 `0.30000000000000004` 是 IEEE 754 的经典账目事故；`Math.sumPrecise([0.1, 0.2])` 用补偿求和返回 `0.3`（注意参数是可迭代的数字，不能写成两个参数）。它还在铺开路上，落地前用特征检测回退到普通 `reduce`——这正是批次前沿的标准用法。

**Upsert：Map 的「没有就插入」**。缓存代码的高频两连（`get` 一把、没有再 `set`），该提案给 Map/WeakMap 补了 `getOrInsert(key, value)` 与惰性求值的 `getOrInsertComputed(key, fn)`，命名以最终规范为准；落地前等价写法是 `if (!map.has(k)) map.set(k, v)`。

同批次还有 Uint8Array 原生 base64 编解码等；Temporal 与显式资源管理（`using`）也已在 2026 年定稿，体量够大各有专篇（610、620）。「哪些进了我的环境」，深水区篇有排查方法。

## 6. 修改实验

以下实验在 Node 22+ 里做，**每个都先写预测再运行**。

实验一：把 2.2 节的 `toSorted()` 换成 `sort()`，再打印 `original`。原数组还安全吗？

实验二：不给比较函数，`[10, 9, 100].toSorted()` 输出什么？

正确答案：实验一输出 `[ 1, 2, 3 ]` 且 `original` 也变成 `[ 1, 2, 3 ]`——`sort()` 是破坏性的，「to 系」才安全；实验二输出 `[ 10, 100, 9 ]`（默认按字符串比较）。另做一步：把 4.2 节的 `hisFriends.difference(myFriends)` 换成 `myFriends.difference(hisFriends)`，输出从 `[ '阿花' ]` 变 `[ '阿澈' ]`——`difference` 是有方向的差集。

## 7. 常见错误与调试实录

错误一：方法不存在。在祖传的 Node 18 服务器上跑 2.1 节代码：

```text
TypeError: scores.findLast is not a function
    at Object.<anonymous> (/srv/leaderboard.js:7:8)
```

读报错三步：`TypeError` 说明不是语法错；`is not a function` 且方法名没拼错，指向**环境太老**；`node -p "process.versions.node"` 确认版本，`findLast` 需要 Node 20+。短期写等价回退，长期升级 Node（见 [nvm](/javascript/530-NvmVersionManage)）。每年新方法都会重演这一幕，系统性应对是深水区篇的主线。

错误二：`Object.groupBy` 的分组键是对象时，所有键被强转成字符串，全部元素挤进同一个 `'[object Object]'` 桶——症状是「桶数比预期少、某桶异常大」。排查时先打印回调返回值看类型；键必须是对象时换 `Map.groupBy`。

## 8. 实际项目中的使用场景

应该：新项目把「非破坏数组方法 + Set 运算 + groupBy」当默认词汇，把 reduce 样板赶出代码库；状态管理里凡「展示层排序」一律用「to 系」方法；流式数据用迭代器辅助方法加 `take` 控制内存。

不应该：为了「新」而新——`toSpliced` 能用不代表要替掉一切 `slice` 拼接的直观写法；用批次前沿前先确认运行环境下限；写库要格外保守，因为你不知道用户的环境。

## 9. 小练习

预测题（5 分钟，先写答案再运行）：给定 `a = new Set([1, 2, 3])`、`b = new Set([3, 4])`，预测 `[...a.symmetricDifference(b)]` 与 `a.isSubsetOf(b)` 的输出。

修改题（5 分钟）：把 4.2 节好友例子改一个需求：「找出我的好友里、他还没加的人」。一行 Set 方法解决，运行验证输出 `[ '阿澈' ]`。

修 Bug 题（15 分钟）：同事在 Node 18 上用 `Object.groupBy(staff, s => s.dept)` 按部门分组，报 `TypeError: Object.groupBy is not a function`。按读报错三步定位，给出升级之外的一个等价修复（`staff` 是三人、两个部门），修完输出正确分组。

挑战题（15 分钟，不给代码）：把评论数据 `comments`（自造 8 条、至少 3 个 `postId`）先用 `Object.groupBy` 按帖子分组，再用 Set 方法找出「两个指定帖子的共同点赞用户」，用 `assert.deepStrictEqual(commonUsers(1, 2), ['期望的用户名数组'])` 验收。

答案与提示：预测题——`[ 1, 2, 4 ]` 与 `false`（对称差 = 只属于一边的元素；a 有 3 个元素而 b 只有 2 个，不可能是子集）；修 Bug 题——`staff.reduce((acc, s) => { (acc[s.dept] ??= []).push(s); return acc; }, {})`，输出 `2`；挑战题——按帖子分组后转 `new Set`，再 `intersection`。

## 10. 与之前和之后的知识的关系

- 往前：[ES6+ 新特性](/javascript/220-ES6NewFeatures) 的解构、展开、Map/Set 基础全部复用，[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 的 `filter`/`map` 心智直接平移到迭代器辅助方法；
- 往后：[新特性深水区](/javascript/600-JavaScriptLatestFeature) 回答本文留下的问题——「特性进了规范，什么时候进我的项目」；迭代器细节在 [迭代器辅助方法](/javascript/310-IteratorHelper)，Temporal 与资源管理专题见 610、620。

## 11. 官方文档

- MDN JavaScript 参考（每个方法页尾都有兼容表）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference
- TC39 提案看板：https://github.com/tc39/proposals
- ECMA-262 规范文本：https://tc39.es/ecma262/

## 12. 自我检查

- 能不查资料说出「to 系」方法与 `sort`/`reverse` 的核心差别，判断代码是否破坏原数组；
- 能现场用 `Object.groupBy` 分组任意数组，说出何时必须换 `Map.groupBy`；
- 能用两个 Set 方法写出「共同好友 / 差集」，说清 `difference` 的方向；
- 拿到「ES20XX 特性」，知道去 tc39/proposals 与 MDN 兼容表各查什么。

## 本章总结

ES2023 让数组学会不搞破坏（`findLast` 与「to 系」非破坏方法），ES2024 补了分组（`Object.groupBy`）与正则集合运算（`v` 标志），ES2025 给迭代器配上惰性方法、把集合运算收进 Set 原型、解禁重复命名捕获组，ES2026 批次带来 `Error.isError`、`Math.sumPrecise`、Map 的 Upsert——外加一条推断归属的年度规则：3 月截稿，Stage 4 进当年版。「什么时候能放心用」是另一门功课，下一篇专门讲。

## 下一步

进入 [新特性深水区](/javascript/600-JavaScriptLatestFeature)：590 篇教你「有什么、怎么用」，600 篇教你「怎么安全地用进生产」——引擎节奏差、兼容表查法、转译与垫片的取舍，外加两个深机制。
