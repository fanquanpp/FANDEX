---
order: 370
title: 生成器函数
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从"加载 2GB 日志会爆内存"讲起：惰性序列、yield 的暂停与恢复、双向通信、yield* 与异步生成器。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'javascript/310-IteratorHelper'
  - 'javascript/260-PromiseConstructorDeepDive'
  - 'javascript/280-AsyncConcurrencyControl'
  - 'javascript/450-FetchApiWebStreams'
prerequisites:
  - 'javascript/090-ArrayHigherOrderMethod'
  - 'javascript/260-PromiseConstructorDeepDive'
---

# 生成器函数

## 场景：扫描一个比内存还大的日志文件

需求很简单：统计一个 2GB 错误日志里 ERROR 出现的次数。直觉写法是先全部读进数组再 `filter`——机器直接爆内存。问题的根源是**急切求值**：数组要求所有元素先在内存里就位。

换一种思路：能不能"要一条、给一条"？读一行、检查一行、丢掉一行，内存里永远只有当前行。生成器就是写这种"按需产出"逻辑的语法糖：

```javascript
function* readLines(filePath) {
  const handle = await openFile(filePath); // 伪代码：拿到文件句柄
  let line;
  while ((line = await handle.readLine()) !== null) {
    yield line; // 产出一行，然后暂停，等调用方来取
  }
}

let count = 0;
for (const line of readLines('app.log')) {
  if (line.includes('ERROR')) count++;
}
```

`function*` 声明生成器，`yield` 是"交出值并暂停"。整个文件从头到尾只有一行在内存里。这就是生成器的核心心智模型：**一个可以暂停和恢复的函数**。

## 动手：感受"暂停"与"恢复"

先用最小的例子建立直觉：

```javascript
function* counter() {
  console.log('start');
  yield 1;
  console.log('resumed');
  yield 2;
  console.log('end');
}

const it = counter();      // 什么都不执行！只是拿到迭代器
it.next(); // 打印 'start'，返回 { value: 1, done: false }
it.next(); // 打印 'resumed'，返回 { value: 2, done: false }
it.next(); // 打印 'end'，返回 { value: undefined, done: true }
```

三个必须建立的认知：

1. **调用生成器函数不执行函数体**，只返回一个迭代器。执行从第一次 `next()` 开始。
2. **每次 `next()` 跑到下一个 `yield` 处暂停**，把 `yield` 右边的值作为 `{ value, done }` 返回。
3. **函数体走完（或 return），done 变 true**，之后再 next 永远返回 `{ value: undefined, done: true }`——生成器是一次性的，跑完即废。

因为有 `next`/`done` 协议，生成器天然兼容 `for...of`、展开运算符与解构——它们都建立在迭代器协议上。

## 双向通信：next 不只能"拿"，还能"给"

`yield` 是个表达式，有返回值——值来自下一次 `next(x)` 的参数：

```javascript
function* dialogue() {
  const answer = yield '你叫什么？';
  yield `你好，${answer}`;
}

const it = dialogue();
it.next();          // { value: '你叫什么？' } —— 提问
it.next('小明');     // { value: '你好，小明' } —— answer 接住了 '小明'
```

注意一个经典细节：**第一次 `next()` 的参数无效**，因为第一个 `yield` 还没执行，没有地方接值。想要"开局就注入数据"得用别的方式（构造参数或先 next 空跑一次）。

这个双向通道让生成器能表达"可暂停的任务"：调用方在每次恢复时决定下一步——Redux Saga 用它做副作用管理（effect 是数据、runner 决定怎么执行），老牌的 co 库用它驱动 Promise（yield 一个 Promise，恢复时把结果塞回去）。2026 年写业务一般直接用 async/await（它就是这条思路的语言内置版），但读懂这条通道，你就理解了 async/await 的前身。

## 组合与委托：yield*

生成器里想产出另一个生成器的全部值，用 `yield*` 委托，而不是手动 for 循环——委托还会正确传递 return 值与异常：

```javascript
function* inner() {
  yield 'a';
  yield 'b';
  return 'inner-done';
}

function* outer() {
  const result = yield* inner(); // 逐条转发 inner 的产出
  yield `inner 的返回值: ${result}`;
}

console.log([...outer()]); // ['a', 'b', 'inner 的返回值: inner-done']
```

`yield*` 后面跟任何可迭代对象都行（数组、字符串、Map），递归结构（树遍历）用它写格外干净：

```javascript
function* walkTree(node) {
  yield node.value;
  if (node.children) {
    for (const child of node.children) {
      yield* walkTree(child); // 递归委托
    }
  }
}
```

## 异步生成器：分页 API 的标准解法

生成器可以异步化：`async function*` 里可以 `await`，产出用 `for await...of` 消费。它最适合的场景就是"直到取完为止"的分页拉取：

```javascript
async function* fetchAllPages(baseUrl) {
  let page = 1;
  while (true) {
    const res = await fetch(`${baseUrl}?page=${page}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { items, hasMore } = await res.json();
    yield* items;        // 本页数据逐条产出
    if (!hasMore) return;
    page++;
  }
}

// 调用方完全不感知分页的存在
for await (const ticket of fetchAllPages('/api/tickets')) {
  render(ticket);
}
```

调用方拿到的就是一条"无限长但按需供给"的记录流。配合 Web Streams（见[Fetch 与 Web Streams](/javascript/450-FetchApiWebStreams)）可以做真正的流式管线。

## 无限序列与惰性组合

生成器可以永不结束，因为求值是惰性的：

```javascript
function* naturals() {
  let n = 0;
  while (true) yield n++;
}

function* take(it, n) {
  for (let i = 0; i < n; i++) {
    const { value, done } = it.next();
    if (done) return;
    yield value;
  }
}

console.log([...take(naturals(), 5)]); // [0, 1, 2, 3, 4] —— 无限序列只取 5 个
```

ES2024 的迭代器辅助方法（`Iterator.from(naturals()).take(5)`，见[迭代器辅助方法](/javascript/310-IteratorHelper)）覆盖了大部分这类组合子，日常优先用标准方法；生成器的价值在于自定义产出逻辑本身。

## 坑点与自检

**坑 1：调用生成器函数等于什么都没发生**。`const result = counter();` 不会执行任何函数体，忘了 next 就是一动不动。常见于"为什么我的函数没跑"的提问。

**坑 2：生成器是一次性对象**。迭代到 done 之后就是空壳；想重跑必须重新调用生成器函数拿新迭代器。把迭代器存进状态里复用是隐藏 bug。

**坑 3：第一次 next 的传值被丢弃**（本篇上文已演示），注入初始值请走函数参数。

**坑 4：箭头函数不能是生成器**。`function*` 是声明语法，箭头函数没有对应形式；对象字面量里用 `*method() {}`。

**坑 5：异步生成器里 yield 出的 Promise 不会自动解包**。`for await...of` 会等待；但把异步生成器塞进同步的 `[...it]` 会拿到一堆 Promise。消费方式必须与产出方式匹配。

自检清单：`counter()` 执行时机？生成器能迭代几次？`yield*` 相比 for 循环委托多做了什么？分页 API 用 `async function*` 的调用方代码长什么样？

## 练习

1. 写 `fibonacci()` 无限生成器，用 `take` 取前 10 项；再用 `Iterator.from(fibonacci()).take(10)` 实现一遍，对比风格。
2. 写 `chunk(iter, size)`：把任意迭代器按 size 分组产出（`[1,2,3,4,5]` size 2 得 `[1,2] [3,4] [5]`），全部用生成器实现。
3. 把本篇的分页生成器加上"最多重试 3 次"的容错：单页请求失败时退避重试，超限抛错。
4. 用生成器实现二叉树的中序遍历，与递归数组版对比：构造一棵 10 万节点的树，比较两者首元素产出的延迟（提示：惰性版可以边遍历边停止）。

## 下一步

- [迭代器辅助方法](/javascript/310-IteratorHelper)：map/filter/take 直接长在 Iterator 原型上。
- [异步并发控制](/javascript/280-AsyncConcurrencyControl)：生成器负责"流"，这篇负责"并发上限"。
- [Fetch API 与 Web Streams](/javascript/450-FetchApiWebStreams)：真正的流式数据管线。
