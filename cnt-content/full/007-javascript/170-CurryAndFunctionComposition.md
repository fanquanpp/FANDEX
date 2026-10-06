---
order: 190
title: 柯里化与偏函数：参数先收一半，剩下慢慢给
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 以「同一个前缀在几十处调用里复制粘贴」为问题主线，讲透偏函数固定参数、柯里化分批收参、pipe/compose 组合管道，亲手实现 curry 与 pipe，附漏调一层括号、bind 首参误传对象等调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'javascript/150-HigherOrderFunction'
  - 'javascript/160-RecursionTailCallOptimization'
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/490-DebounceThrottle'
prerequisites:
  - 'javascript/150-HigherOrderFunction'
---

## 前置知识

- 已完成 [高阶函数](/javascript/150-HigherOrderFunction)：会写"返回函数的函数"，理解 `once` 靠闭包记住状态；
- 熟悉 [闭包](/javascript/080-FunctionScopeClosure) 与箭头函数的写法。

本文不引入任何新概念体系，只把 150 篇"返回函数"那一招用到底：**参数分批收，凑齐再执行。**

## 学习目标

读完本文你将能够：

1. 区分偏函数（partial application，固定一部分参数）与柯里化（currying，一次只收一个参数），并说清两者都是闭包的应用；
2. 用箭头函数和 `bind` 两种方式实现偏函数，避开 `bind` 第一个参数的坑；
3. 亲手实现通用 `curry`，把 `log(level, module, message)` 变成 `logWarn('search')('...')` 的链式调用；
4. 亲手实现 `pipe` 与 `compose`，把一串"加工步骤"组装成数据流水线；
5. 判断什么场景该用、什么场景纯属炫技，并排查"漏调一层括号"与"bind 首参误传对象"两类事故。

预计 45 到 60 分钟，含 3 个动手实验与 4 道练习。

## 1. 你现在要解决什么问题

文档站要加日志，你写了个通用的日志函数：

```javascript
function log(level, module, message) {
  console.log(`[${new Date().toISOString()}] [${level}] [${module}] ${message}`);
}

log('error', 'search', '索引加载失败');
log('error', 'search', '查询超时');
log('warn', 'search', '结果为空，尝试降级');
log('error', 'comment', '提交失败');
log('warn', 'comment', '敏感词命中');
log('error', 'search', '重试 3 次仍失败');
```

六次调用里，`'error'` 和 `'search'` 反复出现。这不是巧合——**"错误级别"和"哪个模块"在运行前就定了，真正每次变的只有消息**。调用方被迫每次都把不变的部分再抄一遍，抄错一个词，日志分组就乱了。

你想要的是这样的调用体验：

```javascript
const searchError = logFor('error', 'search');
const commentWarn = logFor('warn', 'comment');

searchError('索引加载失败');      // 前缀自动带上
searchError('查询超时');
commentWarn('敏感词命中');
```

"先把知道的参数给函数，剩下的以后再给"——这件事有两套成熟叫法：**偏函数**和**柯里化**。本文把两套都亲手造出来，再顺手解决另一个高频需求：把一串小函数串成流水线。

## 2. 先不要看解释，先试试看

最朴素的实现你已经会了——就是 150 篇的"返回函数的函数"：

```javascript
function logFor(level, module) {
  return (message) => log(level, module, message);
}

const searchError = logFor('error', 'search');
searchError('索引加载失败');
// [2026-09-28T03:12:45.101Z] [error] [search] 索引加载失败
```

`logFor` 收两个参数，**还回一个"记住"了这两个参数的新函数**。剩下的参数什么时候来，它什么时候执行。这就是**偏函数（partial application）**：固定一部分参数，产出 specialization（专用版）。

另一个更冷门的内置工具也能干这事——`bind`：

```javascript
function greet(greeting, name) {
  return `${greeting}，${name}`;
}

const hello = greet.bind(null, '你好');
console.log(hello('阿七'));    // 你好，阿七
console.log(hello('小满'));    // 你好，小满
```

`bind(null, '你好')` 的意思是：造一个新函数，调用时自动把 `'你好'` 填在第一个参数的位置。**第一个参数（这里传了 null）是给 this 用的**——普通函数不关心 this 就传 null，这个位置的真正用途见 [this 关键字详解](/javascript/100-ThisKeywordDeepDive)。日常写业务更推荐箭头函数版本，语义一目了然：

```javascript
const hello = (name) => greet('你好', name);
```

## 3. 心智模型：一次一个参数，就是柯里化

偏函数是"一次固定任意个"，还有一种更极端的分法：**一次只收一个，收满为止**。把三参函数拆成三层：

```javascript
const curryLog = (level) => (module) => (message) =>
  log(level, module, message);

curryLog('error')('search')('索引加载失败');
// [2026-09-28T03:12:45.101Z] [error] [search] 索引加载失败
```

这个形状就叫**柯里化（currying）**：`f(a, b, c)` 变成 `f(a)(b)(c)`。名字来自逻辑学家 Haskell Curry，别被"数学"吓住——它的实现和 `logFor` 一模一样，只是每层固定一个。

柯里化的实用形态是"**柯里化到底，但允许一次喂多个**"：

```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn(...args);                       // 参数收满，执行
    }
    return (...rest) => curried(...args, ...rest);   // 没收满，继续收
  };
}

const cLog = curry(log);
cLog('error', 'search')('索引加载失败');   // 两种喂法都行
cLog('error')('search', '查询超时');
cLog('error', 'search', '重试 3 次仍失败');
```

三个语法点：`fn.length` 是函数声明的形参个数（不含剩余参数）；`...args` 收集已到的参数；不够就还回一个"带着已有参数继续收"的新函数——闭包在攒参数。

对比表收拢一下：

| | 偏函数 | 柯里化 |
| --- | --- | --- |
| 一次固定几个 | 任意个（通常前几个） | 严格一个（宽松实现除外） |
| 调用形态 | `f(a)(b, c)` 或专用名 | `f(a)(b)(c)` |
| 典型用途 | 给函数预填配置 | 为组合管道准备"单参函数" |

**为什么要费劲变回单参函数？** 因为流水线（下一节）要求每个环节"恰好吃一个值、吐一个值"。三参函数进不了流水线，柯里化就是把多参函数"降维"成流水线零件的标准手法。

## 4. 组合：把小函数串成流水线

命令面板搜索的最后一公里是一串加工：标题转小写、过滤命中、按相关度排、截前 8 条。每个都是单参函数：

```javascript
const lower = (s) => s.toLowerCase();
const trim = (s) => s.trim();
```

嵌套调用能把人套晕：

```javascript
const result = top8(byScore(docs, filterHits(keyword, lower(trim(rawInput)))));
// 里外三层，读的时候要从最里面往外剥
```

写一个 `pipe`（从左到右依次执行），让代码顺着数据流向读：

```javascript
function pipe(...fns) {
  return (input) => fns.reduce((acc, fn) => fn(acc), input);
}

const prepare = pipe(trim, lower);
const makeQuery = (raw) => prepare(raw);

console.log(makeQuery('  EventLoop  '));   // 'eventloop'
```

`pipe` 本身也是高阶函数：收一串函数，还一个"串好"的函数。`reduce` 在这里是"流水线装配机"——上一步的输出是下一步的输入。如果把 `pipe` 里的 `fn(acc)` 改成从右往左执行，就得到数学味的 `compose`（`compose(f, g)(x)` 等于 `f(g(x))`）；**业务代码统一用 `pipe`，阅读顺序和数据流向一致，出错率低**。

把搜索管道重写一遍：

```javascript
const searchDocs = pipe(
  (raw) => raw.trim().toLowerCase(),
  (kw) => docs.filter((d) => d.title.toLowerCase().includes(kw)),
  (hits) => hits.sort((a, b) => b.score - a.score),
  (hits) => hits.slice(0, 8)
);

searchDocs('  EVENT  ');   // 标题含 event 的前 8 条，按相关度排好
```

每个环节独立可测：坏了一个环节，单独调用那个环节就能复现，不用跑整条链。

## 5. 修改实验

以下都在前文代码基础上改，每个先预测再运行。

实验一：写 `partial(fn, ...fixed)`——通用偏函数工具，固定前若干参数：`const logWarn = partial(log, 'warn')`。提示：`(...args) => fn(...fixed, ...args)`，注意柯里化版本 `curry` 与它的区别在"收几个"。

实验二：给 `curry` 的产物加"一次喂超量"的兼容：`cLog('error', 'search', 'msg', '多余参数')` 会怎样？运行验证后想想：`fn(...args)` 收到多余参数会发生什么。

实验三：把 `pipe` 改成支持"任一环节抛错就整体抛错"，并用一个会 throw 的环节验证。（提示：什么都不用改，先验证默认行为就是如此——想清楚为什么。）

## 6. 常见错误与调试实录

**错误一：漏调一层括号，拿到的是函数不是结果。**

```javascript
const searchError = logFor('error', 'search');
console.log(typeof searchError);            // 'function'
console.log(searchError('索引加载失败'));    // 正常日志
console.log(searchError);                    // [Function (anonymous)]
```

症状：日志没打出来，或者把"函数"当消息打印了出来。定位三步：读现象——输出是 `[Function ...]` 或行为"没反应"，先怀疑少调了一层；验证——`typeof` 一下，返回 `function` 就说明还差一层括号；结论——柯里化链上每一层括号都是一次调用，`f(a)(b)` 之后还有一个单参函数在等最后一名参数。

**错误二：`bind` 第一个参数传成了业务对象。**

```javascript
const url = '/api/search';
const doGet = fetch.bind(url, url);   // 错：把 url 当成了 this
```

症状：不报错，但多年后有人给 `fetch` 加了依赖 this 的逻辑就会莫名炸。正确心智：`bind` 的签名是 `bind(thisArg, ...固定参数)`，第一个位置**永远属于 this**，只想固定参数就老老实实传 `null` 或改用箭头函数版。类方法上做偏函数时更要注意：`thisArg` 必须是那个实例。

**错误三：把柯里化当成了默认风格，可读性反向劣化。**

```javascript
// 不推荐：两参函数硬柯里化，同事读起来每层都在猜
const add = (a) => (b) => a + b;

// 简单两参运算，直接写就好
const add = (a, b) => a + b;
```

判断标准就一条：**这个函数的参数是否天然分两批到来**。日志（配置一批、消息一批）、请求（域名密钥一批、路径参数一批）是；`add(a, b)` 不是。柯里化是工具不是信仰，全项目柯里化的代码库，review 成本会显著上升。

## 7. 实际项目中的使用场景

- fetch 封装：文档站所有 API 调用共享同一个域名与鉴权头，`const apiGet = makeGet(baseUrl, headers)` 造出的专用函数散布各处，改配置只动一处；
- React 生态：`useMemo(() => pipe(...)(data), [data])` 把重加工缓存在管道函数上；状态选择器库（Reselect 风格）的核心就是"偏函数 + 组合"；
- 中间件工厂：Express/Koa 的中间件常常是"配置一层、请求一层"的两段式——本质就是偏函数；
- 测试夹具：`const asAdmin = requestAs(baseUrl, { role: 'admin' })`，同一套请求逻辑派生出不同身份的版本。

顺带一提：社区曾长期推动"管道运算符 `|>`"进规范，提案多年停留在 Stage 2，2026 年仍未落地——所以 `pipe` 函数至今仍是事实标准，自己写 10 行或从工具库拿一个都行。

## 8. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
const join = curry((sep, a, b) => `${a}${sep}${b}`);
const withDash = join('-');
console.log(withDash('a', 'b'));
console.log(join('+')('x', 'y'));
```

答案：`a-b` 与 `x+y`。两种喂法靠 `curry` 的宽松收参都成立。

修改题（10 分钟）：实现 `composeRight`（即 compose）：`composeRight(f, g)(x)` 等于 `f(g(x))`。验收：`composeRight((n) => n * 2, (n) => n + 1)(3)` 为 8。

修 Bug 题（15 分钟）：下面的代码想给三个按钮分别绑定"告警日志"，真实症状是：点哪个按钮，消息都一样。定位并修复：

```javascript
const buttons = document.querySelectorAll('button');
buttons.forEach((btn, i) => {
  const warnFor = (msg) => log('warn', `button-${i}`, msg);
  btn.addEventListener('click', () => warnFor('被点击了'));
});
```

提示：这段代码本身是对的——先运行确认。真实需求升级为"点第几个按钮就打 button-几"，把 `warnFor` 的调用改成接收点击序号：`btn.addEventListener('click', () => warnFor(`第 ${i} 个被点击了`))`，体会"偏函数固定的是环境，消息仍是每次的动态部分"。

挑战题（30 分钟，脱离示例）：实现 `memoizeBy(fn, keyOf)`：带 key 函数的缓存工厂。`keyOf` 把参数映射成缓存键，命中就不重复计算。验收：

```javascript
let calls = 0;
const slowSquare = (n) => {
  calls += 1;
  return n * n;
};
const fastSquare = memoizeBy(slowSquare, (n) => n);
console.log(fastSquare(4), fastSquare(4), fastSquare(5));   // 16 16 25
console.log(calls);                                          // 2
```

提示（思路方向）：这是"返回函数 + 闭包存 Map"的组合，和 `once` 同族，只是缓存键可配置——而"把 keyOf 当参数传进去"正是偏函数思想。展开（关键 API）：`Map`、闭包、默认参数。

## 9. 与之前和之后的知识的关系

- 往前：150 篇的 `once` 是"返回函数"的第一次实战，本文的 `curry`、`pipe` 是同族工具；160 篇的累加器思想在 `pipe` 的 `reduce` 里再次出现（上一步结果喂下一步）；
- 往后：[防抖与节流](/javascript/490-DebounceThrottle) 是"配置一层、触发一层"的两段式工厂，读完本文再看它的实现会非常顺；[Proxy 与 Reflect](/javascript/330-ProxyAndReflect) 会从另一个角度（拦截调用）实现"包一层"的效果。

## 10. 官方文档

- MDN Function.prototype.bind（留意第一个参数是 thisArg）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
- MDN Function.length：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/length
- MDN Array.prototype.reduce：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce

## 自我检查

- 能向同事分别用一句话说清偏函数与柯里化，并举出"参数天然分批"的真实例子；
- 能徒手写出 `curry` 与 `pipe`，并解释 `fn.length` 在 curry 里的作用；
- 看到 `[Function (anonymous)]` 出现在本该是结果的变量上，能立刻怀疑"漏调一层括号"；
- 能说出 `bind(null, '你好')` 里 null 的真实身份，以及什么场景不该柯里化。

## 本章总结

偏函数固定一部分参数产出专用函数，柯里化一次收一个参数收满执行，两者都是"返回函数 + 闭包攒状态"，区别只在收参节奏。多参函数靠柯里化降维成单参零件，单参零件靠 pipe 串成从左到右的流水线，每个环节独立可测。`bind` 的第一个参数永远属于 this，只想固定参数请用箭头函数。柯里化是给"参数天然分批"的场景准备的工具，两参相加这种场景硬上就是炫技。

## 下一步

函数式工具箱到此齐了：map/filter/reduce 会用（090）、高阶函数会造（150）、递归会写（160）、参数会分批（本文）。接下来 [深拷贝与浅拷贝](/javascript/200-DeepShallowCopy) 换赛道解决一个每个项目都躲不开的问题——对象赋值只是复制了"门牌号"，怎么拿到一份真正独立的副本。
