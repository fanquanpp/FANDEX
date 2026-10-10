---
order: 290
title: 异步编程入门：网络请求等一秒，页面不能卡一秒
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从「网络请求要等一秒，页面不能卡死一秒」讲起：单线程与事件循环直觉模型、回调与厄运金字塔、Promise 三态与链式、async/await、fetch 最小示例、try/catch 与 .catch 分工，附 Unhandled promise rejection 与 Failed to fetch 调试实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'javascript/260-PromiseConstructorDeepDive'
  - 'javascript/270-PromiseStaticMethod'
  - 'javascript/280-AsyncConcurrencyControl'
  - 'javascript/290-EventLoop'
  - 'javascript/440-FetchApiAndAbortController'
  - 'javascript/700-JavaScriptProjectExampleTodoApp'
prerequisites:
  - 'javascript/090-ArrayHigherOrderMethod'
---

## 前置知识

- 已完成 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod)：会把函数当参数传，认识箭头函数——本文的回调就是它的延伸；
- 会用 `let`/`const` 与 `console.log`（见 [变量与数据类型](/javascript/040-VariableDataType)）。

没学过 090 也能跟：回调只需要「把函数当值传」，用到时现场解释。示例在 Node 21+ 与现代浏览器可原样运行。

## 学习目标

读完本文你将能够：

1. 解释「同步等一个网络请求」为什么卡死整个程序；
2. 把嵌套回调改写成 Promise 链；
3. 说出 Promise 三态与「落定后不再变」规则，预测 then 链各环节拿到什么值；
4. 用 async/await 写出像同步的异步代码，说出 try/catch 与 .catch 的分工；
5. 用 fetch 请求公开 JSON 接口，读懂 `Unhandled promise rejection` 与 `TypeError: Failed to fetch`。

预计 60 到 75 分钟。

## 1. 你现在要解决什么问题

游戏排行榜要从服务器拉分数，网络一来一回至少几百毫秒。先按最直觉的方式假装写一遍：

```javascript
console.log('开始加载排行榜');
const scores = loadScoresSync();   // 假设：等网络回来才继续
console.log('顺便刷新页面上的其他东西');
```

如果 JS 真这样跑，第三行要卡一秒：按钮点不动、动画停摆——JS 只有一条执行线程（[020 篇](/javascript/020-JavaScriptOverviewRuntimeEnv)：引擎一次只做一件事），Node 服务器里所有用户的请求也在排队。真实世界 JS 选择了另一条路：发起请求**不等它**，先干别的，结果回来再「回头」处理。先感受这种写法的执行顺序。

## 2. 最小可运行示例：谁先谁后

保存为 `order.js` 并运行：

```javascript
console.log('1. 发起请求');

setTimeout(() => {                 // 定时器：把一件事登记到 1 秒后
  console.log('3. 数据回来了');
}, 1000);

console.log('2. 先干别的去了');
```

预期输出：

```text
1. 发起请求
2. 先干别的去了
3. 数据回来了
```

`setTimeout` 没有「暂停一秒」，它做的是**把回调登记给定时器，立刻返回**，主线程继续往下跑，到点后回调才执行——所以它最后输出。异步的第一直觉：**JS 只有一个厨师，不守着慢炖锅干等，定好闹钟去切别的菜。** 这套调度叫事件循环，本文只需这层直觉，队列怎么排在[事件循环](/javascript/290-EventLoop)讲透。

## 3. 回调与厄运金字塔

「回头处理」靠把函数交给异步 API，完成时它替你调用——这就是**回调**（callback），本质是 090 篇「函数当参数传」。第二个请求要等第一个的结果，缩进就走成楼梯：

```javascript
// 示意：三个回调风格的 API
loadProfile('p001', (player) => {
  loadScores(player.id, (scores) => {
    loadRank(scores.score, (rank) => {
      console.log('段位：', rank);   // 五个请求就有五层缩进
    });
  });
});
```

这个形状被叫作**厄运金字塔**：缩进就是难度，第五层没人想读；错误处理层层复制，漏一层就是事故；顺序焊死，改并发等于重写。解决它之前，先认识替你管理「未来结果」的东西。

## 4. Promise：一张管兑付的欠条

Promise 直译「承诺」：**现在拿不到结果，但拿到一张凭据**——pending（等待中）只能单向走向 fulfilled（已兑现，带值）或 rejected（已拒绝，带错误），**一旦落定永不改变**：结果只有一份。

拿到凭据用 `.then` 兑付。每个 `.then` 返回一张新凭据，`return` 的值传给下一环节——嵌套被拉平成链：

```javascript
// Promise 版 setTimeout：ms 毫秒后兑付 value
function delay(ms, value) {
  return new Promise((resolve) => {   // 构造器先混个眼熟，260 篇讲透
    setTimeout(() => resolve(value), ms);
  });
}

delay(300, '第一步：拿到原始数据')
  .then((msg) => {
    console.log(msg);
    return '第二步：数据已清洗';       // return 什么，下一环就拿到什么
  })
  .then(console.log);
```

预期输出：

```text
第一步：拿到原始数据
第二步：数据已清洗
```

对比第 3 节：**嵌套变成了排队**。链上任何一环出错，错误顺链下传直到被 `.catch` 接住——第 7 节细说。

## 5. async/await：让异步写得像同步

链式解决了嵌套，但读着还是绕。async/await 给第二种写法：

```javascript
async function main() {
  const a = await delay(300, '第一步');   // await：等这张凭据兑付再往下走
  console.log(a);
  const b = await delay(300, '第二步');
  console.log(b);
}

main();
```

预期输出：

```text
第一步
第二步
```

**await 等的只是这个函数，不是整个程序**——`main` 停下时外面照跑。`async` 标记函数里有 await，并让函数**总是返回 Promise**——`await main()` 与 `main().then(...)` 等价。

分工声明：本文只讲「用」；构造器细节在 [Promise 构造器](/javascript/260-PromiseConstructorDeepDive)，`Promise.all` 等静态方法在 [Promise 静态方法](/javascript/270-PromiseStaticMethod)。

## 6. fetch：真的去网上拿一次数据

现在来真的。fetch 是浏览器和 Node 内置的请求函数；公开测试接口 jsonplaceholder 用来练手：

```javascript
async function loadTodo() {
  const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
  const todo = await res.json();   // 解析响应体也是异步的，也要 await
  console.log(todo);
}

loadTodo();
console.log('请求已发出，等数据……');
```

预期输出：

```text
请求已发出，等数据……
{ userId: 1, id: 1, title: 'delectus aut autem', completed: false }
```

三个要点：**await 了两次**——fetch 兑换成响应头 `res`，`res.json()` 再兑换成解析好的对象；**先打印「请求已发出」**——等待没卡住主线程；没网就把 fetch 换成第 4 节的 `delay(1000, { id: 1, title: '本地模拟' })`。

一个反直觉事实：**fetch 请求到 404 不会报错**——它只在网络层才走失败分支。请求不存在的 id，打印 `res.ok, res.status` 得到 `false 404`，不抛错，得自己查。

## 7. 错误处理：try/catch 与 .catch

两条路，对应两种写法：

```javascript
// 写法一：await 配 try/catch——async 函数里首选
async function loadWithTry() {
  try {
    const res = await fetch('https://不存在的域名.example');
    console.log(await res.json());
  } catch (err) {
    console.log('加载失败：', err.message);
  } finally {
    console.log('请求结束');          // 无论成败都执行
  }
}
```

链式调用则在链尾接 `.catch((err) => ...)`——链上任何一环失败都会落到这里。预期输出（域名不存在时）：

```text
请求结束
加载失败： fetch failed          // Node 的 err.message
加载失败： Failed to fetch       // 浏览器的 err.message
```

规则：**await 的错误落进 try/catch，链式调用配 .catch；每个 Promise 都要有归宿。** 失败分级处理是 [异步并发控制](/javascript/280-AsyncConcurrencyControl) 与 [全局错误捕获](/javascript/480-ErrorBoundaryGlobalErrorCatch) 的话题。

## 8. 修改实验

实验一：把第 2 节的 `1000` 改成 `0`，先预测再运行——顺序变了吗？（不变，事件循环篇解释「0 毫秒」。）

实验二：串行拉取 todo 1 和 todo 2 并用 `console.time` 计时；再把第二个 fetch 提前发出（先存进变量再分别 await），对比耗时。这是 Promise.all 的手工预演。

实验三：删掉 finally，把「请求结束」挪到 catch 之后，构造「成功时不打印」的 bug。

## 9. 常见错误与调试实录

**错误一：Unhandled promise rejection。** 忘了给 Promise 归宿：

```javascript
async function loadRank() {
  throw new Error('排行榜加载失败');   // async 函数里抛错 = rejected Promise
}

loadRank();   // 调了，没 await，也没 .catch
```

浏览器控制台真实报错：

```text
Uncaught (in promise) Error: 排行榜加载失败
```

Node 15 起更狠：直接把进程打崩。三步定位：读报错——`(in promise)` 即有 Promise 被拒绝但没人接；找源头——报错栈指向抛错位置，查调用处是否裸调 async 函数；修法——`await loadRank()` 包进 try/catch，或 `loadRank().catch(console.error)`。**句式：async 函数一旦调用，必须 await 或 .catch。**

**错误二：TypeError: Failed to fetch。** 排查三步：读报错——fetch 的 reject 只发生在网络层（断网、域名不存在、跨域被拦）；验证——换一个确定可用的 URL（如 jsonplaceholder）重试，能通是原 URL 或网络问题，仍失败则多半是 CORS（服务端要配的响应头，客户端无解）；对照——**404、500 不进 catch**（第 6 节），查 `res.ok`。顺带认识错误三：忘了 await 时 `console.log(data)` 打印 `Promise { <pending> }`，先查这行缺不缺 await。

## 10. 实际项目中的使用场景

- 排行榜、订单列表这类数据页：fetch + async/await 是默认姿势，[fetch 与 AbortController](/javascript/440-FetchApiAndAbortController) 补全超时与取消；
- 何时不用：纯本地计算不需要异步，别把同步逻辑包成 async 装高级；
- [项目实战：待办应用](/javascript/700-JavaScriptProjectExampleTodoApp) 的增删改查就是「fetch 发请求 + await 拿结果 + 更新页面」，学完本文能读懂它的数据层。

## 11. 小练习

预测题（5 分钟，先写答案再运行；`delay` 沿用第 4 节的定义）：

```javascript
async function step() {
  console.log('A');
  await delay(0, null);
  console.log('C');
}
step();
console.log('B');
```

输出是 A B C 还是 A C B？（提示：await 后面的代码相当于排进了队列。）

修改题（15 分钟）：用 delay 实现第 3 节的三个 API（各延迟 300 毫秒），先跑通厄运金字塔，再改写成 async/await 版。验收：输出一致，无嵌套回调。

修 Bug 题（10 分钟）：下面的代码想处理加载结果，运行就崩。按三步定位并修复：

```javascript
async function loadRank() {
  return (await delay(100, { id: 7 })).id;
}

loadRank().then((rank) => {
  throw new Error('处理失败');
});
```

真实报错（浏览器控制台）：

```text
Uncaught (in promise) Error: 处理失败
```

提示：then 里抛出的错误得有谁接住？补一个环节，打印「已兜底」而不是 Uncaught。

挑战题（半小时）：写 `fakeFetch(value, ms)`，ms 毫秒后用 value 兑付（`new Promise` 先混个眼熟，260 篇讲透），再串出「登录 → 拉取资料」两步 async 函数。验收断言：

```javascript
fakeFetch('ok', 100).then((v) =>
  console.assert(v === 'ok', '应在 100ms 后兑付 value')
);
```

提示：构造器里把 setTimeout 与 resolve 连起来；resolve 只认第一次调用。

## 12. 与之前和之后的知识的关系

- 往前：[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 的「函数当参数」就是回调与 then 的原型；
- 往后：[Promise 构造器](/javascript/260-PromiseConstructorDeepDive) 拆开「混个眼熟」的 `new Promise`；[Promise 静态方法](/javascript/270-PromiseStaticMethod) 的 `Promise.all` 补实验二；[异步并发控制](/javascript/280-AsyncConcurrencyControl) 管几百个请求怎么排队；[事件循环](/javascript/290-EventLoop) 解释「0 毫秒也最后执行」；[fetch 与 AbortController](/javascript/440-FetchApiAndAbortController) 补取消与超时。

## 13. 官方文档

- MDN 使用 Promise：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Using_promises
- MDN async function：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/async_function
- MDN fetch()：https://developer.mozilla.org/zh-CN/docs/Web/API/fetch

## 14. 自我检查

- 能说清同步等待为什么卡死页面，并预测异步代码的输出顺序；
- 能把嵌套回调现场改写成 then 链与 async/await 两种形式；
- 能背出 Promise 三态与两条铁律（单向、落定不变）；
- 知道 fetch 的 404 不抛错、断网才见 `TypeError: Failed to fetch`，async 调用必须 await 或 .catch。

## 本章总结

JS 单线程，同步等待等于全局暂停，异步 API 因此收下回调、立刻返回。回调嵌套会堆成厄运金字塔；Promise 把「未来的结果」变成三态凭据——pending 单向落定为 fulfilled 或 rejected，then 链把嵌套拉平成一列；async/await 把链写成同步的样子，try/catch 与 .catch 各接各的错误，归宿不能缺。fetch 是最常用的异步 API：await 两次才拿到数据，404 不抛错要查 res.ok，断网才见 TypeError: Failed to fetch。输出顺序与并发排队，后面四篇拆解。

## 下一步

进入 [Promise 构造器](/javascript/260-PromiseConstructorDeepDive)：把「混个眼熟」的 new Promise 拆开，看清 resolve、reject 与状态机的全部规则。
