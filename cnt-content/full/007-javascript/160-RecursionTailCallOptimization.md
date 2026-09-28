---
order: 160
title: 递归与尾调用：函数自己调用自己，栈为什么会爆
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 以「嵌套评论树要统计总数，for 循环写不动」为问题主线，讲透递归三要素与调用栈模型，亲手遍历树形数据、排查 Maximum call stack size exceeded，并给出尾递归改写与"各引擎到底支不支持 TCO"的 2026 年实情。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'javascript/150-HigherOrderFunction'
  - 'javascript/170-CurryAndFunctionComposition'
  - 'javascript/320-GeneratorFunctions'
  - 'javascript/060-ControlFlow'
prerequisites:
  - 'javascript/150-HigherOrderFunction'
---

## 前置知识

- 已完成 [高阶函数](/javascript/150-HigherOrderFunction)：知道函数是值、能当参数传；
- 熟悉 [控制流](/javascript/060-ControlFlow)：会写 for、while、if。

不需要任何算法课基础。本文只回答三个来自真实代码的问题：树形数据怎么遍历、递归为什么会爆栈、爆了怎么救。

## 学习目标

读完本文你将能够：

1. 用"基线条件 + 向基线推进 + 自己调用自己"三要素写出正确的递归函数；
2. 亲手递归遍历嵌套评论树，完成"数总数""铺平成列表"两个真实需求；
3. 解释 `RangeError: Maximum call stack size exceeded` 的成因，并用调用栈面板定位缺失的基线条件；
4. 判断一个递归是不是"尾递归"，并用累加器参数把它改写成尾递归形式；
5. 说出 2026 年各引擎对尾调用优化的真实支持情况，以及"不指望优化"时的两种兜底写法。

预计 50 到 70 分钟，含 3 个动手实验与 4 道练习。

## 1. 你现在要解决什么问题

文档站的文章下面有评论，评论可以被人回复，回复还能被再回复——数据是一棵树：

```javascript
const commentTree = {
  id: 1,
  author: '阿七',
  text: '这篇讲得太清楚了',
  replies: [
    { id: 2, author: '小满', text: '同感，回链条想再确认一遍', replies: [] },
    {
      id: 3,
      author: '大白',
      text: '能不能加个例子',
      replies: [
        { id: 4, author: '阿七', text: '已加', replies: [
          { id: 5, author: '大白', text: '感谢', replies: [] },
        ] },
      ],
    },
  ],
};
```

产品要两个数字：这篇文章一共有多少条评论（含所有层级的回复）？以及通知中心要一份"铺平"的列表，按顺序展示每条评论。

你试过用 for 解决，很快发现卡住了：树的**层数不确定**。写两层 for 只能数到"回复的回复"，第四层就漏了；写十层 for，第一层数据只有两层时白跑九层。**"嵌套多深"是运行时才知道的事，循环层数却是写代码时定死的**——这个矛盾 for 循环解不了。

而问题的结构自带答案：每条评论的 `replies` 还是评论（只是小一号）。**"用同样的办法处理缩小一号的同类问题"，正是递归的定义。**

## 2. 先不要看解释，先试试看

先用最小的例子找回感觉。控制台逐行敲：

```javascript
function countdown(n) {
  console.log(n);
  if (n <= 1) return;        // 基线条件：停下来
  countdown(n - 1);          // 向基线推进：问题缩小一号
}

countdown(3);
```

输出 3、2、1，然后干净收场。把 `if` 那行注释掉再跑 `countdown(3)`——程序会疯狂打印直到报错 `RangeError: Maximum call stack size exceeded`。这两个现象合起来就是递归的全部骨架：

| 三要素 | countdown 里的位置 | 缺了会怎样 |
| --- | --- | --- |
| 基线条件（base case） | `if (n <= 1) return` | 无限递归，爆栈 |
| 向基线推进 | `countdown(n - 1)`，参数在变小 | 无限递归，爆栈 |
| 自己调用自己 | 最后一行 | 那就不叫递归了 |

现在回到评论树。树的基线条件天然存在：`replies` 为空的评论不再有子问题。于是统计总数只需要一句话——"一条评论的数量 = 1 + 它所有回复的数量"：

```javascript
function countComments(comment) {
  let total = 1;                             // 算上自己
  for (const reply of comment.replies) {
    total += countComments(reply);           // 每棵子树自己会数自己
  }
  return total;
}

console.log(countComments(commentTree));     // 5
```

for 循环没消失，它只负责"一层"；"再往下还有几层"交给递归调用。铺平列表同理：

```javascript
function flattenComments(comment, out = []) {
  out.push({ id: comment.id, author: comment.author, text: comment.text });
  for (const reply of comment.replies) {
    flattenComments(reply, out);
  }
  return out;
}

console.log(flattenComments(commentTree).length);   // 5
```

层级多深都数得清——因为"多深"这个问题被交给了数据本身。

## 3. 心智模型：调用栈是一摞盘子

递归为什么能"自动回来"？因为每次函数调用都会在**调用栈**上压一个"现场"（执行到哪行、局部变量是什么），函数返回时现场弹出。想象一摞盘子：

```text
countdown(3) 压盘 → 打印 3
  countdown(2) 压盘 → 打印 2
    countdown(1) 压盘 → 打印 1，命中基线，return
    弹盘（countdown(1) 结束）
  弹盘（countdown(2) 结束）
弹盘（countdown(3) 结束）
```

递归的"自动回来"就是逐层弹盘。爆栈也由此解释：**栈的容量有限**（现代引擎大约几万到十几万个调用帧，具体因引擎与机器而异），基线条件缺失时压盘速度远快于弹盘，盘子摞过上限就抛 `RangeError: Maximum call stack size exceeded`。

可以亲手测出你这台机器的极限：

```javascript
let depth = 0;
function probe() {
  depth += 1;
  probe();
}
try {
  probe();
} catch (e) {
  console.log(depth, e.constructor.name);
}
// 例如 10463 'RangeError'——每次运行数字略有浮动
```

注意两个事实：第一，这个错是**可捕获的**（try/catch 接得住），不会弄崩整个进程；第二，**深度在几万量级**——所以"递归遍历一万条平铺数据"才危险，而"递归遍历评论树"（人类不会盖一百层的楼）完全安全。

## 4. 爆栈事故排查实录

症状：把一段"把平铺的组织架构数组还原成树"的代码跑起来，控制台一行红字 `RangeError: Maximum call stack size exceeded`，且没有指向任何一行业务代码的堆栈。

```javascript
function buildTree(nodes, parentId = null) {
  return nodes
    .filter((n) => n.parentId === parentId)
    .map((n) => ({ ...n, children: buildTree(nodes, n.id) }));
}
```

排查三步：

1. **读现象**：RangeError 属于"递归没停"，先怀疑基线条件，而不是内存不够；
2. **用调试器看栈**：在 catch 里打 `console.trace(e)` 或断点停在报错处，看 Sources 面板的 Call Stack——满屏都是 `buildTree` 自己，且参数一模一样，说明某个调用在"原地打转"：问题没有缩小；
3. **找没缩小的参数**：数据里有一条节点的 `parentId` 指向自己（`{ id: 7, parentId: 7 }`），`buildTree(nodes, 7)` 的子问题还是 `buildTree(nodes, 7)`——"向基线推进"被脏数据破坏了。修法：进入递归前过滤掉自引用节点，或加一个 `depth` 参数，超过数据合理层数就抛出可读的业务错误。

结论沉淀成一句口诀：**爆栈先查"问题有没有缩小一号"，再查基线条件，最后才怀疑栈太小。** 顺序反了会浪费一晚上。

## 5. 尾调用与尾递归：省栈的正确姿势

看两个求和版本：

```javascript
function sumTo(n) {
  if (n === 0) return 0;
  return n + sumTo(n - 1);        // 不是尾调用：加法还等着递归的结果
}

function sumToTail(n, acc = 0) {
  if (n === 0) return acc;
  return sumToTail(n - 1, acc + n);   // 尾调用：递归是最后一步，自己不再收尾
}
```

`sumTo` 收到子结果后还要**做加法**，所以每一层现场都得留着等；`sumToTail` 把中间结果随身携带（`acc` 是累加器），递归调用就是最后一句——当前这层的现场**没用了**，理论上可以像循环一样直接复用。这就是**尾调用（tail call）**，尾递归是它的递归特例。

ECMAScript 6 规范定义了严格模式下的"正当尾调用"（PTC，proper tail call）：符合形式时引擎**应当**复用栈帧。但 2026 年的实情必须说清楚：

| 引擎 | 支持情况 | 影响 |
| --- | --- | --- |
| JavaScriptCore（Safari） | 已实现 | 同一段尾递归代码在 Safari 里 `sumToTail(1000000)` 正常返回 |
| V8（Chrome、Node、Edge） | 未实现（2016 年从实验开关回退） | 同样代码直接 `RangeError` |
| SpiderMonkey（Firefox） | 未实现 | 同上 |

**结论：把尾递归当成一种"好习惯的写法"，别当成"能救命的性能依赖"。** 写成尾递归形式（逻辑更清晰、状态显式）值得做，指望它扛住百万层不爆栈，在 Chrome 和 Node 里会当场翻车。

## 6. 不指望引擎优化时的两种兜底

**兜底一：直接改循环。** 尾递归和 while 循环是同构的——每层做的事就是"更新累加器，换个条件再来"：

```javascript
function sumToLoop(n) {
  let acc = 0;
  while (n > 0) {
    acc += n;
    n -= 1;
  }
  return acc;
}

console.log(sumToLoop(1000000));   // 500000500000，任何引擎都不爆
```

规则很好记：**数据是树、层数靠数据决定时用递归；数据是线、次数靠算术决定时用循环。** 评论树没有循环版的好写法（要维护手动栈），而 `sumTo(1000000)` 的循环版一行不增。

**兜底二：蹦床（trampoline），面试与库代码会遇到。** 思路：让递归函数不真的调用自己，而是**返回一个"下一步做什么"的函数**，由一个普通 while 循环统一驱动——栈深度永远只有一层：

```javascript
function trampoline(fn) {
  return (...args) => {
    let result = fn(...args);
    while (typeof result === 'function') {
      result = result();
    }
    return result;
  };
}

const sumToBounce = trampoline(function step(n, acc = 0) {
  if (n === 0) return acc;
  return () => step(n - 1, acc + n);   // 返回"下一步"，不调用
});

console.log(sumToBounce(1000000));     // 500000500000，不爆栈
```

日常业务用不上它，但读 Redux-Saga、各类函数式库的源码时会撞见，认得出即可。

## 7. 修改实验

以下都在前文代码基础上改，每个先预测再运行。

实验一：给 `countComments` 加第二个统计——返回总字数 `totalTextLength`（用 `comment.text.length`）。（提示：把 `total += 1` 换成 `total += comment.text.length`。）

实验二：把 `sumTo(100000)` 分别在 Node 与浏览器控制台运行，记录哪个报 RangeError、哪个没报。（提示：Node 用 V8，Safari 用 JavaScriptCore，行为不同。）

实验三：给 `flattenComments` 加缩进——每个元素多带一个 `depth` 字段，顶层是 0。递归调用时传 `depth + 1`。（提示：默认参数再加一个。）

## 8. 常见错误与调试实录之外的三个高频坑

**坑一：基线条件写成了"推进条件的反面"，永远差一号。** `if (n < 1)` 配 `countdown(n)`（不减一）这类组合，控制台表现为打印到某个固定数字后爆栈。自检方法：随便代一个数，手动模拟两轮，确认参数严格靠近基线。

**坑二：递归函数里用了没有传入的"共享数组"。** 把 `flattenComments` 的 `out` 改成函数内 `const out = []` 却忘了把子调用的结果加回来，返回的只有顶层一条。修法二选一：要么像本文那样把容器当参数传下去，要么 `return [comment, ...comment.replies.flatMap(flattenComments)]` 让每层返回自己的小数组再拼接。

**坑三：以为爆栈是内存泄漏。** 两者症状像（进程卡死、内存上涨），但爆栈的调用栈面板全是同一个函数名；真正的泄漏排查在 [内存泄漏排查](/javascript/370-MemoryLeakTroubleshoot) 展开，别混为一谈。

## 9. 实际项目中的使用场景

- 文档站的侧边栏目录：FANDEX 这类文档仓库里，一篇文档的标题就是嵌套的 h2、h3、h4 树，生成"当前阅读位置"面包屑靠的就是沿树向上递归找父节点；
- 嵌套评论、嵌套文件夹、组织架构树：本文的 `countComments` 与 `flattenComments` 原样可用；
- 构建工具与打包器：依赖图就是树/图，tree-shaking 从入口递归标记可达模块（见 [模块打包与 Tree Shaking](/javascript/400-ModuleBundlingAndTreeShaking)）；
- JSON 深拷贝：对嵌套对象逐层复制也是递归，工业版要额外处理循环引用（见 [深拷贝与浅拷贝](/javascript/200-DeepShallowCopy)）。

## 10. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
function mystery(n) {
  if (n === 0) return 0;
  return n + mystery(n - 1);
}

console.log(mystery(4));
```

答案：10（4 + 3 + 2 + 1）。它不是尾调用——加法在递归结果之后。

修改题（10 分钟）：把 `countComments` 改成"只统计作者不是阿七的评论"。验收：示例树上结果为 3（id 为 2、3、5 的三条）。

修 Bug 题（15 分钟）：下面的函数想找树里 id 等于目标的节点，真实症状是：能找到的部分正常，碰到某条数据后抛 RangeError。找出坏数据并加防护：

```javascript
function findById(node, id) {
  if (node.id === id) return node;
  for (const child of node.children) {
    return findById(child, id);        // 注意这行
  }
  return null;
}
```

提示：有两个 bug。其一，for 里直接 return，只查了第一个孩子（丢数据但不报错）；其二，若 `children` 为 undefined 会崩。修好后用 `findById(commentTree, 5)` 验证返回 id 为 5 的节点。

挑战题（30 分钟，脱离示例）：实现 `flatten(obj)`：把 `{ a: { b: { c: 1 } }, d: 2 }` 铺成 `{ 'a.b.c': 1, d: 2 }`。要求：用递归，数组值原样保留不展开。验收：

```javascript
const nested = { a: { b: { c: 1 } }, d: 2, e: [1, 2] };
console.log(flatten(nested));
// { 'a.b.c': 1, d: 2, e: [1, 2] }
```

提示（思路方向）：遍历 `Object.entries`，值是"普通对象"就递归并拼接键名，否则直接收。展开（关键 API）：`typeof v === 'object'` 配 `v !== null` 与 `Array.isArray` 三个判断。

## 11. 与之前和之后的知识的关系

- 往前：150 篇说"for 写不动的结构交给函数"，本文是最典型的兑现——回调换成自己；
- 往后：[柯里化与偏函数](/javascript/170-CurryAndFunctionComposition) 继续函数式路线；[生成器函数](/javascript/320-GeneratorFunctions) 提供"暂停再继续"的第三种遍历思路；[事件循环](/javascript/290-EventLoop) 会把调用栈放进更大的图景：栈空了微任务宏任务才有机会跑。

## 12. 官方文档

- MDN 递归：https://developer.mozilla.org/zh-CN/docs/Glossary/Recursion
- MDN RangeError：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/RangeError
- ECMAScript 规范中的尾调用（PrepareForTailCall）：https://tc39.es/ecma262/#sec-preparefortailcall

## 自我检查

- 能不看资料说出递归三要素，并解释缺任何一件的后果；
- 能现场写出"统计嵌套树节点总数"并说清基线条件在哪；
- 看到 `Maximum call stack size exceeded`，能按"问题是否缩小、基线是否可达、脏数据是否自引用"的顺序排查；
- 能把 `n + f(n - 1)` 与 `f(n - 1, acc + n)` 的区别讲成"谁还在等结果"，并说出 V8 与 Safari 对尾调用优化的不同态度。

## 本章总结

递归 = 自己调用自己 + 基线条件 + 向基线推进。它专治"层数运行时才知道"的树形数据：for 管一层，递归管所有层。调用栈是一摞有上限的盘子，递归每层压一盘，弹完自动回来；基线缺失或参数不缩小，盘子爆上限就抛 RangeError。尾递归把"还在等结果"改成"随身携带累加器"，是清晰的写法，但 2026 年只有 Safari 真正做了优化——生产代码按"树用递归、线用循环"选择，极限场景用蹦床。

## 下一步

进入 [柯里化与偏函数](/javascript/170-CurryAndFunctionComposition)：本文把"问题缩小一号"玩明白了，下一篇把"参数凑齐一号"玩明白——一个函数为什么要拆成好几个函数、参数为什么要一次收一个，以及这套写法什么时候是真香、什么时候是炫技。
