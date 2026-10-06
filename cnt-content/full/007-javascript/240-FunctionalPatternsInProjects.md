---
order: 280
title: 函数式模式实战：管道调试、HOC 与中间件
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 把高阶函数与柯里化用到工程里的四个模式：tap/trace 给管道插日志、占位符与右偏函数、React 高阶组件 withXxx、Express 风格中间件引擎亲手实现；附链式调用中间数组开销的测量方法与"何时手写 for"的判断标准。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'javascript/150-HigherOrderFunction'
  - 'javascript/170-CurryAndFunctionComposition'
  - 'javascript/380-JavaScriptModular'
  - 'javascript/690-JavaScriptProjectPractice'
prerequisites:
  - 'javascript/150-HigherOrderFunction'
  - 'javascript/170-CurryAndFunctionComposition'
---

## 前置知识

- 已完成 [高阶函数](/javascript/150-HigherOrderFunction)：会写返回函数的函数；
- 已完成 [柯里化与偏函数](/javascript/170-CurryAndFunctionComposition)：能手写 `curry` 与 `pipe`。

本文不引入新概念，只回答"造出来的工具怎么在真实项目里用"——四个模式全部来自日常工程代码，每个都配可运行实现。

## 学习目标

读完本文你将能够：

1. 用 `tap` 在不打断管道的前提下插日志，用 `trace` 带标签追踪数据流，定位"管道哪一环产出不对"；
2. 实现占位符柯里化与右偏函数（partialRight），说清两者各自的适用场景；
3. 写出一个最小可用的 React 高阶组件 `withXxx`，并知道 2026 年它该在什么场景出场、什么场景该让位给 hooks；
4. 亲手实现 Express 风格的中间件引擎（约 30 行），理解洋葱模型的执行顺序；
5. 用测量而不是直觉判断"链式调用要不要改写成手写循环"。

预计 50 到 70 分钟，含 4 道练习。

## 1. 你现在要解决什么问题

170 篇给搜索写了一条管道：

```javascript
const searchDocs = pipe(
  (raw) => raw.trim().toLowerCase(),
  (kw) => docs.filter((d) => d.title.toLowerCase().includes(kw)),
  (hits) => hits.sort((a, b) => b.score - a.score),
  (hits) => hits.slice(0, 8)
);

searchDocs('  EVENT  ');   // 结果不对：明明该有 3 条，只剩 1 条
```

调试它很别扭：管道是一个表达式，想看中间值就得把某一环拆出来单独赋值、打印、再塞回去——改一次结构，调试代码就得跟着动。**管道的可读性优势，在调试时变成了劣势。**

本文第 2 节先解决这件事；后面三节依次处理另外三个高频工程场景：给函数"从右边固定参数"、给组件"包一层能力"、给请求处理"串一层层钩子"。

## 2. tap 与 trace：给管道插探针

`tap` 的工作只有一个：**看一眼数据，原样放行**：

```javascript
function tap(sideEffect) {
  return (value) => {
    sideEffect(value);
    return value;
  };
}

const searchDocs = pipe(
  (raw) => raw.trim().toLowerCase(),
  tap((kw) => console.log('关键词：', kw)),
  (kw) => docs.filter((d) => d.title.toLowerCase().includes(kw)),
  tap((hits) => console.log('命中：', hits.length)),
  (hits) => hits.sort((a, b) => b.score - a.score),
  tap((hits) => console.log('排序后首条：', hits[0]?.title)),
  (hits) => hits.slice(0, 8)
);
```

管道结构零改动，每一环的产出尽收眼底。`tap` 的实现要点与 150 篇的 `once` 同族：返回新函数，先做副作用，**必须把 value 原样 return**——漏了 return，管道下一环拿到的就是 undefined，这是 tap 唯一的经典翻车点。

`trace` 是带标签的进阶版，多个探针的输出能按顺序对号：

```javascript
function trace(label) {
  return tap((value) => console.log(`[${label}]`, value));
}

const searchDocs = pipe(
  trace('输入'),
  (raw) => raw.trim().toLowerCase(),
  trace('归一化后'),
  (kw) => docs.filter((d) => d.title.toLowerCase().includes(kw)),
  trace('过滤后')
);
```

调试完毕，删掉 trace 行即可，管道主体从头到尾没被动过。这两个小工具值得放进每个项目的 utils。

## 3. 右偏函数与占位符：参数不在前面怎么办

`partial` 固定的是前面的参数，但有些函数要固定的参数偏偏在后面。典型如带选项对象的请求函数：

```javascript
function fetchDocs(path, init) {
  return fetch(path, init);
}

// 想固定第二个参数（都走同一套请求头），第一个参数留给调用方
```

写一个 `partialRight`：固定的参数贴在**右边**，调用时的新参数填在**左边**：

```javascript
function partialRight(fn, ...fixed) {
  return (...args) => fn(...args, ...fixed);
}

const apiGet = partialRight(fetchDocs, {
  headers: { Authorization: `Bearer ${token}` },
  cache: 'no-store',
});

apiGet('/api/docs');      // fetchDocs('/api/docs', { headers..., cache... })
```

与 170 篇练习里让你写过的 `partial(fn, ...fixed)` 对照记：**partial 固定头、partialRight 固定尾**。配置类参数（headers、options、比较器的方向）通常在签名末尾，所以 partialRight 在"预配置"场景比 partial 更常用。

**占位符**解决的是"中间参数要固定"的更刁钻情况——思路是"留个空位标记，调用时按顺序填空"：

```javascript
function partialPlaceholder(fn, ...args) {
  return (...later) => {
    let i = 0;
    return fn(...args.map((a) => (a === partialPlaceholder.hole ? later[i++] : a)),
              ...later.slice(i));
  };
}
partialPlaceholder.hole = Symbol('hole');

const parseIntBase10 = partialPlaceholder(parseInt, partialPlaceholder.hole, 10);
console.log(['1', '2', '3'].map(parseIntBase10));   // [1, 2, 3]
```

`parseInt` 的第二个参数正是 150 篇 `map(parseInt)` 事故的元凶——用占位符把进制钉死在 10，那类事故就从根上消失。日常不必手写这层抽象（一行箭头函数 `(s) => parseInt(s, 10)` 更直白），但要认得它：Ramda 的 `__` 占位符就是这个东西。

## 4. React 高阶组件：组件版的"返回函数的函数"

高阶组件（HOC）是 150 篇的模式在 React 里的直接投影：**收一个组件，还一个增强了能力的组件**。最小可用版——给组件包上"加载态"：

```jsx
function withLoading(Wrapped) {
  return function WithLoading({ isLoading, ...props }) {
    if (isLoading) return <p>加载中...</p>;
    return <Wrapped {...props} />;
  };
}

const DocListWithLoading = withLoading(DocList);

// 使用处
<DocListWithLoading isLoading={isLoading} docs={docs} />
```

`withLoading` 就是组件世界的高阶函数：拦截名为 `isLoading` 的 prop，其余 props 原样透传（`...props`）。可以叠加：

```jsx
const Enhanced = withAuth(withLoading(DocList));
```

2026 年的务实判断：**新代码优先自定义 hooks**（`useDocList()` 返回数据与状态，加载态自己控制，类型推导也更顺），HOC 主要出现在两处——维护存量代码库（老项目里大量 `connect(...)`、`withRouter(...)`），以及写"不改组件内部"的横切库代码（埋点、错误边界包装）。读懂 HOC 是读第三方库的必修课，新业务里无脑套它则属于炫技。

## 5. 中间件引擎：洋葱模型 30 行实现

Express/Koa 的中间件本质是"**一组按顺序执行、每个都能放行或拦截的函数**"。亲手写一个最小引擎，把幻觉变成理解：

```javascript
function createApp() {
  const middlewares = [];

  function use(fn) {
    middlewares.push(fn);
    return app;                          // 链式注册
  }

  function handle(request) {
    let index = -1;
    function dispatch(i) {
      if (i <= index) throw new Error('next() 被调用了多次');
      index = i;
      const fn = middlewares[i];
      if (!fn) return request;           // 链走完，返回请求
      return fn(request, () => dispatch(i + 1));
    }
    return dispatch(0);
  }

  const app = { use, handle };
  return app;
}

// 注册三个中间件
const app = createApp();
app.use((req, next) => {
  console.log('A-进入');
  const result = next();
  console.log('A-离开');
  return result;
});
app.use((req, next) => {
  console.log('B-进入');
  return next();
});
app.use((req) => ({ ...req, handled: true }));

console.log(app.handle({ url: '/docs' }).handled);
// A-进入
// B-进入
// A-离开
// true
```

执行顺序就是**洋葱**：请求从最外层进（A-进入、B-进入），到核心处理，再按原路返回（A-离开）——每个中间件在 `next()` 前写"进入逻辑"、之后写"离开逻辑"，于是日志、计时、错误捕获、响应头设置都有了天然的安放位置。`next` 就是"继续走下一层"的回调，它是 170 篇偏函数与本文管道思想的合体。读这段代码时重点盯 `dispatch(i + 1)`：递归推进层号，一层套一层。

## 6. 性能判断：链式调用什么时候该改写成循环

管道漂亮，但每一环 `filter`、`map` 都会产生一个中间数组。数据量小（几百上千条）时这点开销完全无感；数据真的大到要计较时，**先测量，再动手**：

```javascript
const big = Array.from({ length: 1_000_000 }, (_, i) => i);

console.time('链式');
const r1 = big.map((n) => n * 2).filter((n) => n % 3 === 0).reduce((a, b) => a + b, 0);
console.timeEnd('链式');

console.time('手写');
let sum = 0;
for (const n of big) {
  const doubled = n * 2;
  if (doubled % 3 === 0) sum += doubled;
}
console.timeEnd('手写');
```

典型的结果形态：两者在同一数量级，手写版快一点到几倍（少了两次中间数组的分配）。决策规则按顺序执行：

1. 数据量在万级以内：一律链式，可读性优先，别为不存在的瓶颈写难懂的代码；
2. 热路径（每帧、每请求都跑）且有测量证明链式是瓶颈：改写单循环，或用迭代器/生成器做惰性管道（见 310 篇）；
3. 现代引擎会内联小回调函数，"回调一定慢"是过时经验——**用 `console.time` 或 Performance 面板说话**，不靠听说。

## 7. 小练习

预测题（5 分钟）：把第 2 节 `tap` 的 `return value;` 删掉，预测 `pipe(tap(...), (x) => x + 1)(5)` 的结果与报错形态。

答案：下一环收到 undefined，`x + 1` 得 NaN（数值场景）或后续链路静默产出 undefined——不抛错、悄悄污染，这正是它难查的原因。

修改题（10 分钟）：给第 5 节的中间件引擎加"错误统一处理"：注册一个 `onError(fn)`，任何中间件抛错时不崩溃，而是把错误交给 onError 并返回 undefined。验收：注册一个会 throw 的中间件后，`handle` 正常返回且 onError 收到那个 Error。

修 Bug 题（15 分钟）：下面的日志中间件想给每个请求计时，真实症状是：每条日志的时间都是 0。定位并修复：

```javascript
app.use((req, next) => {
  const start = performance.now();
  next();
  console.log(req.url, `${performance.now() - start}ms`);
});
```

提示：单看这段没错——真实项目的坑在于中间件注册顺序：这个计时器被注册在了最外层之外、且 next() 的返回值没透传，里层某个中间件提前 `return` 了没调用 next，导致计时器在同步代码里瞬间走完。修复：确保计时中间件注册在最外层，并把 `next()` 的结果 return 出去（`return next();`），洋葱的"离开"才能拿到真实耗时。

挑战题（40 分钟，脱离示例）：组合本文全部模式，实现一个 `createPipeline(options)` 工厂：返回带 `.use(fn)` 的管道对象，`run(data)` 按洋葱顺序执行所有中间件并返回最终值；内置 `logging()` 中间件（用 trace 风格打印进出）与 `retryable(n)` 中间件工厂（偏函数：失败自动重试 n 次）。验收：三个中间件（logging、retryable(2)、业务处理）注册后，业务处理前两次抛错第三次成功时，总调用次数为 3 且日志顺序为"进入-进入-成功-离开"。

提示（思路方向）：引擎照抄第 5 节，retryable 用 150 篇挑战题的 retry 思路包住 next。展开（关键 API）：闭包计数、try/catch、Symbol 占位不需要。

## 8. 与之前和之后的知识的关系

- 往前：150 篇给了"返回函数"的能力，170 篇给了"分批收参"与 pipe，本文是它们在调试、组件、服务端三个方向的落地；
- 往后：[JavaScript 模块化](/javascript/380-JavaScriptModular) 讲这些工具如何组织成可复用的模块；[项目实战](/javascript/690-JavaScriptProjectPractice) 与 [毕业项目](/javascript/715-JavaScriptCapstoneProject) 要求在真实代码里综合运用；服务端中间件的完整生态（Koa 洋葱、错误处理中间件的层级）在 Node 模块继续展开。

## 9. 官方文档

- MDN Array.prototype.reduce（管道引擎的实现基础）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
- Express 中间件指南：https://expressjs.com/en/guide/using-middleware.html
- Koa 洋葱模型说明：https://koajs.com/
- React 文档·复用逻辑（HOC 的现代定位）：https://react.dev/learn/reusing-logic-with-custom-hooks

## 自我检查

- 能徒手写出 tap 与 trace，并说出漏写 `return value` 的故障形态；
- 能用 partialRight 给"选项在尾部"的函数做预配置，并解释占位符为什么能钉住中间参数；
- 能解释 HOC 与自定义 hooks 的分工，判断一个新需求该用哪个；
- 能画出洋葱模型的执行顺序（进入序与离开序互为镜像），并说出 next() 未透传或重复调用各自的事故表现；
- 能描述"先测量再优化链式调用"的完整流程。

## 本章总结

tap/trace 让管道可调试而结构不动；partial 固定头部参数、partialRight 固定尾部选项、占位符钉住中间位（钉死 parseInt 的进制是经典应用）；HOC 是高阶函数在 React 的投影，新代码优先 hooks、库代码与存量代码才是 HOC 的主场；中间件引擎三十行实现洋葱模型，next() 的透传与配对是正确性的全部秘密；链式与循环之争用测量裁决，万级以内可读性优先。

## 下一步

进入 [JavaScript 模块化](/javascript/380-JavaScriptModular)：本文的工具该放哪个文件、怎么导出导入、循环依赖怎么破——模块系统是把"函数工具箱"升级成"工程项目"的那一步。
