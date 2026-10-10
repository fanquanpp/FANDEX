---
order: 310
title: Promise 构造器深入
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从一个"外部可控的 Promise"说起：状态机、then 的微任务时序、值穿透、thenable 与 ES2024 的 withResolvers。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'javascript/250-AsyncProgramming'
  - 'javascript/270-PromiseStaticMethod'
  - 'javascript/280-AsyncConcurrencyControl'
  - 'javascript/290-EventLoop'
prerequisites:
  - 'javascript/250-AsyncProgramming'
---

# Promise 构造器深入

## 场景：一个"别人来决定何时完成"的 Promise

`async` 函数天然产出 Promise，多数 Promise 根本不需要 `new Promise`。但有例外：**完成时机由外部事件决定**。典型需求——弹一个确认框，用户点"确定"才继续：

```javascript
function confirmDialog() {
  let okResolve;
  const promise = new Promise((resolve) => { okResolve = resolve; });
  renderDialog({ onConfirm: () => okResolve(true) });
  return promise;
}

// 用起来与普通异步一致
if (await confirmDialog()) {
  submit();
}
```

注意那个别扭的地方：为了把 `resolve` 递出去，得先声明变量再在构造器里赋值。这个模式太常见，ES2024 干脆收编成了标准函数 `Promise.withResolvers()`：

```javascript
function confirmDialog() {
  const { promise, resolve } = Promise.withResolvers();
  renderDialog({ onConfirm: () => resolve(true) });
  return promise;
}
```

它同时返回 `promise`、`resolve`、`reject` 三个值，2024 年起全主流浏览器与较新 Node 可用。轮询、超时、等待测试信号、把事件 API 转 Promise，全用它。这也是本篇的第一个要点：构造器的价值就在"把 resolve/reject 的权力交到别处"。

## 动手：手写一个最小状态机

理解 Promise 最快的方式是自己造一个残缺版。核心是一个受限的状态机：

```javascript
class MiniPromise {
  #state = 'pending';   // pending -> fulfilled | rejected，只此一次
  #value = undefined;
  #callbacks = [];

  constructor(executor) {
    const resolve = (v) => {
      if (this.#state !== 'pending') return; // 二次 resolve 无效
      this.#state = 'fulfilled';
      this.#value = v;
      this.#callbacks.forEach((cb) => cb()); // 通知所有等待的 then
    };
    executor(resolve, () => {}); // 简化：忽略 reject
  }

  then(onFulfilled) {
    if (this.#state === 'fulfilled') {
      onFulfilled(this.#value);
    } else {
      this.#callbacks.push(() => onFulfilled(this.#value));
    }
  }
}
```

三个设计决定对应着真实 Promise 的三条铁律：

1. **状态只能从 pending 走向 fulfilled/rejected 一次**。构造器里 `resolve` 调两次、先 resolve 后 reject，都只有第一次生效——这就是为什么"给 `fetch` 包一层超时"能安全实现：先到者定胜负。
2. **pending 时注册的回调被存起来，resolve 时统一放行**；已经完成的 Promise 再 then，回调直接拿到值。then 永远不会"错过"结果。
3. **同一个 Promise 可以被 then 多次**，每个回调独立收到结果（注意这与"链式调用"不同：是广播，不是接力）。

## 为什么 then 的回调不立刻执行

把手写版跑一下会发现一个差异：真实 Promise 的 then 回调**永远是异步的**，哪怕 Promise 早已完成：

```javascript
console.log('a');
Promise.resolve('done').then((v) => console.log('c:', v));
console.log('b');
// 输出顺序：a, b, c —— 永远不是 a, c, b
```

原因：then 把回调排进**微任务队列**，等当前同步代码跑完、调用栈清空后才执行。这条规则保证了时序可预测——你不必知道 Promise 是"刚刚完成"还是"三秒前就完成了"，回调都在微任务里公平排队。面试高频题"输出顺序"全部源于此，完整的事件循环模型见[事件循环](/javascript/290-EventLoop)。顺带记住推论：`await` 与 `then` 等价，`await` 后面的代码也是微任务。

## 链式调用：then 返回的是新 Promise

链式调用的本质：每个 `then` 都返回一个**新** Promise，它的状态由回调的返回值决定：

```javascript
fetchUser(id)
  .then((user) => user.profile)               // 返回普通值 -> 新 Promise 以该值完成
  .then((profile) => fetchOrders(profile.id)) // 返回 Promise -> 等它完成后接力
  .then((orders) => render(orders))
  .catch((err) => showError(err));            // 链上任何一环失败都会跳到这里
```

三条最容易踩的规则：

**忘记 return 等于把值丢掉**。箭头函数加大括号后忘记 `return`，下一环拿到 `undefined`。这是 Promise 代码里最高频的 bug：

```javascript
.then((user) => {
  saveToCache(user); // 没有 return！
})
.then((user) => render(user)); // user 是 undefined
```

**值穿透**：`then` 的参数不是函数时会被忽略，值直接传给下一环。所以 `promise.then().then(console.log)` 仍能拿到值，偶尔可以用来"跳过"一环，但可读性差，少用。

**finally 不改变值**。`finally` 的回调拿不到结果、返回值（除非抛错）也不影响链上的值，它只负责"无论成败都要做"的事：关 loading、断开连接。

## resolve 一个 Promise 会发生什么：thenable 与解包

构造器里 `resolve(x)`，如果 `x` 本身是 Promise（或任何带 `then` 方法的对象，即 thenable），状态不会立刻完成，而是**等待 x 落定并把结果接过来**：

```javascript
new Promise((resolve) => {
  resolve(fetchData()); // 外层 Promise 等内层 fetch 完成后，用它的结果/错误落定
}).then((data) => console.log(data));
```

这叫"解包"，它让 `async` 函数里 `return somePromise` 的语义正确，也让旧式回调库的 thenable 对象能无缝混入 Promise 链。一个细节：解包是异步进行的（规范里专门安排了一个独立的任务），所以 `resolve(thenable)` 之后哪怕 thenable 立即完成，本 Promise 的回调也排在其后。解包还是防御性的：如果出现循环（A resolve B、B 又 resolve A），会以 TypeError 收场而不是死循环。

## 坑点与自检

**坑 1：构造器执行器是同步的**。`new Promise` 的函数体立即执行，不等 then。所以构造器里写 `await`、写死循环都会直接阻塞主线程。

**坑 2：错误必须走 reject，throw 也行但别混着绕**。执行器里同步 `throw` 等价于 `reject`；但异步回调里的 `throw` 无人接住，会变成 unhandled rejection。回调式 API 包装进 Promise 时（老代码迁移常见），回调里的错误记得显式 `reject(err)`。

**坑 3：吞掉的 rejection**。创建后既不 then/catch 也不 await 的 Promise，失败时只留下一条 unhandled rejection 警告；Node 15+ 默认让进程直接崩溃。别在生产代码里留"裸奔"的 Promise。

**坑 4：在 forEach 里等 Promise**。`arr.forEach(async (x) => await f(x))` 不会等待，forEach 不认识 Promise。要么 `for...of` 串行，要么 `Promise.all(arr.map(f))` 并发，展开见[异步并发控制](/javascript/280-AsyncConcurrencyControl)。

**坑 5：把 async 函数当同步函数**。async 函数永远返回 Promise，`async function f() { return 1 }` 的调用方拿到的不是 1。类型标注与文档里别撒谎。

自检清单：resolve 被调用两次会发生什么？then 回调同步还是异步？`.then()` 忘写 return 下一环拿到什么？`Promise.withResolvers` 解决什么问题？

## 练习

1. 用 `Promise.withResolvers` 写 `timeout(ms)`：返回的 Promise 在 ms 后以 `TimeoutError` reject；再写 `withTimeout(promise, ms)` 竞速版本。
2. 给手写 MiniPromise 补上 reject 与 then 的第二个参数，然后用三个用例验证"状态只转换一次"。
3. 预测输出并解释：`Promise.resolve(1).then(() => 2).then(Promise.resolve(3)).then(console.log)`。（提示：值穿透。）
4. 把项目里一个回调风格的旧函数（如 Node 风格 `readFile(path, cb)`）包成 Promise，要求错误路径也正确 reject。

## 下一步

- [Promise 静态方法](/javascript/270-PromiseStaticMethod)：all/race/allSettled/any 四种并发原语。
- [异步并发控制](/javascript/280-AsyncConcurrencyControl)：并发数上限、任务队列的工程实现。
- [事件循环](/javascript/290-EventLoop)：微任务与宏任务的完整时序模型。
