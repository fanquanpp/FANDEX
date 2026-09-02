---
order: 320
title: 生成器函数
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 深入解析 ES6 生成器函数的协程语义、迭代器协议、异步生成器、与 async/await 的关系,以及无限流处理、co 库原理等高级主题
author: fanquanpp
updated: '2026-07-20'
related:
  - 'javascript/016-RecursionTailCallOptimization'
  - 'javascript/017-CurryAndFunctionComposition'
  - 'javascript/033-ExploringES6ProxiesAndReflect'
  - 'javascript/021-ObjectStaticMethods'
  - 'javascript/026-PromiseConstructorDeepDive'
prerequisites:
  - 'javascript/026-PromiseConstructorDeepDive'
---

## 前置知识

- [迭代器辅助方法](/javascript/031-IteratorHelper)：建议先完成前一篇的学习

## 学习目标

- 掌握「0. 学习导览」的核心机制、典型用法与常见陷阱
- 掌握「1. 历史动机与技术演进」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义」的核心机制、典型用法与常见陷阱
- 掌握「3. 基础语法」的核心机制、典型用法与常见陷阱
- 掌握「4. 迭代协议深入」的核心机制、典型用法与常见陷阱


## 0. 学习导览

### 0.1 学习路径

```
基础语法 → 迭代器协议 → 双向通信 → yield* 委托 → 异步生成器 → 协程语义 → co/async-await 等价 → 流式架构
```

### 0.2 前置知识检查

- 熟悉 JavaScript 函数与闭包
- 理解 Symbol 与迭代器协议
- 了解 Promise 基本用法
- 了解调用栈与事件循环

### 0.3 阅读建议

- 第一遍:跳过形式化定义,聚焦语法与示例
- 第二遍:结合 KaTeX 公式理解语义模型
- 第三遍:研究 co 库源码与异步生成器架构章节

---

## 1. 历史动机与技术演进

### 1.1 协程的史前史

协程(Coroutine)的概念最早由 Melvin Conway 于 1958 年提出,用于描述 COBOL 编译器中"可暂停的子程序"。与子例程(Subroutine)严格的栈式调用语义不同,协程允许在多个执行点之间协作式切换。这一思想在 20 世纪 70 年代被 CLU(1974)、Icon(1977)等语言以迭代器(Iterator)的形式具体化。

### 1.2 JavaScript 异步编程的演进

| 年份    | 里程碑                              | 代表性技术                      | 痛点                         |
| ------- | ----------------------------------- | ------------------------------- | ---------------------------- |
| 1995    | JavaScript 诞生                     | 回调函数                        | 回调地狱                     |
| 2009    | CommonJS 提案                       | Node.js 异步回调                | 错误处理混乱                 |
| 2011    | Promise/A+ 规范                     | Q.js、when.js                   | 链式调用仍有心智负担         |
| 2015    | ES6 发布(ES2015)                  | Generator + Promise             | 需借助 co 库                 |
| 2017    | ES8 发布(ES2017)                  | async/await                     | 语义糖,但底层依赖 Generator |
| 2018    | ES9 异步迭代                        | AsyncIterator、for await...of   | 流式异步处理                 |
| 2024    | ES2024                              | Iterator Helpers                | 惰性序列组合                 |

### 1.3 Generator 函数的诞生

ES6 在 2015 年 6 月正式发布,生成器作为核心特性之一进入标准。其设计动机包括:

1. **替代回调**:与 Promise 结合可写出同步式异步代码(后被 async/await 取代)
2. **惰性求值**:支持无限序列、按需计算
3. **统一迭代**:自定义对象迭代行为的标准机制
4. **协程语义**:为后续 async/await 提供底层语义基础
5. **状态机**:用线性代码表达状态机,避免显式状态变量

### 1.4 关键人物与论文

- **Dave Herman**(Mozilla):TC39 生成器规范的最初推动者
- **Andy Wingo**(V8):实现 V8 第一个生成器引擎
- **Kevin Smith**:在 ES6 草案中形式化 yield 语义
- **TJ Holowaychuk**:2013 年发布 co 库,首次将 Generator 转换为 Promise 链,影响了后来 async/await 的设计

---

## 2. 形式化定义

### 2.1 生成器的形式语义

定义生成器函数 $G$ 为一个从输入域 $\mathcal{I}$ 到输出域 $\mathcal{O}$ 的多值产生器,其类型签名可写作:

$$
G : \mathcal{I}^{*} \rightarrow \mathcal{P}(\mathcal{O}^{*})
$$

其中 $\mathcal{I}^{*}$ 表示输入序列(包括初始启动),$\mathcal{P}(\mathcal{O}^{*})$ 表示输出序列的幂集,反映生成器可能产生多个值。

### 2.2 状态转换系统

生成器对象 $g$ 的执行可建模为五元组 $\langle S, s_0, \Sigma, \delta, F \rangle$:

- $S = \{suspendedStart, suspendedYield, executing, completed\}$:状态集合
- $s_0 = suspendedStart$:初始状态
- $\Sigma$:事件集合 $\{next(v), return(v), throw(e)\}$
- $\delta : S \times \Sigma \rightarrow S \times \mathcal{O}$:转移函数
- $F = \{completed\}$:终态集合

状态转移图:

$$
\begin{aligned}
suspendedStart &\xrightarrow{next(v)} executing \\
executing &\xrightarrow{yield\ o} suspendedYield \\
suspendedYield &\xrightarrow{next(v)} executing \\
executing &\xrightarrow{return\ r} completed \\
executing &\xrightarrow{throw\ e} completed \\
\forall s \in S, s &\xrightarrow{return(v)} completed
\end{aligned}
$$

### 2.3 yield 表达式的语义

`yield e` 表达式的求值遵循"暂停-恢复"协议:

$$
\text{eval}(\text{yield}\ e) = \begin{cases}
\langle\text{pause}, e\rangle & \text{首次执行到 yield} \\
\text{eval}(\text{resume}\ v) & \text{下次 next}(v)\text{ 调用}
\end{cases}
$$

形式化地,设生成器从状态 $\sigma_i$ 执行到 yield $v_i$,然后被 $next(v_{i+1})$ 唤醒,则:

$$
\langle g, \sigma_i \rangle \xrightarrow{yield\ v_i} \langle g, \sigma_i^{+} \rangle
$$

$$
\langle g, \sigma_i^{+} \rangle \xrightarrow{next(v_{i+1})} \langle g, \sigma_{i+1} \rangle
$$

其中 $\sigma^{+}$ 表示"暂停但保留上下文"的状态。

### 2.4 迭代器协议(Iterator Protocol)

对象实现 `next()` 方法且返回 `{ value, done }` 即符合迭代器协议:

$$
\text{Iterator} = \{ \text{next} : \text{Unit} \rightarrow \{ \text{value} : \mathbb{V}, \text{done} : \mathbb{B} \} \}
$$

### 2.5 可迭代协议(Iterable Protocol)

对象实现 `[Symbol.iterator]()` 方法并返回迭代器,即符合可迭代协议:

$$
\text{Iterable} = \{ [\text{Symbol.iterator}] : \text{Unit} \rightarrow \text{Iterator} \}
$$

### 2.6 异步迭代器协议

$$
\text{AsyncIterator} = \{ \text{next} : \text{Unit} \rightarrow \text{Promise}\langle\{ \text{value}, \text{done} \}\rangle \}
$$

异步生成器(`async function*`)自动实现该协议。

---

## 3. 基础语法

### 3.1 声明形式

```javascript
// 函数声明
function* gen1() {
  yield 1;
}

// 函数表达式
const gen2 = function* () {
  yield 2;
};

// 对象方法
const obj = {
  *gen3() {
    yield 3;
  },
};

// 类方法
class Container {
  *items() {
    yield 4;
  }
}

// 注意:箭头函数不能作为生成器
// const gen4 = *() => { yield 5; };  // 语法错误
```

### 3.2 基本调用

```javascript
function* simple() {
  yield 1;
  yield 2;
  yield 3;
}

// 调用生成器函数不会执行函数体,而是返回一个 Generator 对象
const g = simple();

console.log(g.next()); // { value: 1, done: false }
console.log(g.next()); // { value: 2, done: false }
console.log(g.next()); // { value: 3, done: false }
console.log(g.next()); // { value: undefined, done: true }
console.log(g.next()); // { value: undefined, done: true }(后续调用恒为 done)
```

### 3.3 return 语句

`return` 终止生成器并返回值:

```javascript
function* withReturn() {
  yield 1;
  return 2;     // done: true
  yield 3;      // 永不执行
}

const g = withReturn();
console.log(g.next()); // { value: 1, done: false }
console.log(g.next()); // { value: 2, done: true }
console.log(g.next()); // { value: undefined, done: true }
```

### 3.4 yield 接收值(双向通信)

```javascript
function* dialog() {
  // yield 表达式的返回值是下次 next(value) 传入的 value
  const name = yield '请问你叫什么名字?';
  const age = yield `你好 ${name},你今年多大了?`;
  return `${name} 今年 ${age} 岁,很高兴认识你!`;
}

const it = dialog();

console.log(it.next().value);       // 请问你叫什么名字?
console.log(it.next('Alice').value); // 你好 Alice,你今年多大了?
console.log(it.next(28).value);      // Alice 今年 28 岁,很高兴认识你!
```

**关键理解**:
- 第一次 `next()` 不能传值(传值会被忽略),因为此时还没有 yield 等待返回
- `next(v)` 的 `v` 成为上一个 yield 表达式的求值结果

### 3.5 yield\* 委托

`yield*` 将迭代委托给另一个可迭代对象或生成器:

```javascript
function* inner() {
  yield 'a';
  yield 'b';
  yield 'c';
}

function* outer() {
  yield 1;
  yield* inner();    // 委托给 inner
  yield 2;
  yield* [10, 20];   // 委托给数组
}

for (const v of outer()) {
  console.log(v);
}
// 输出:1, a, b, c, 2, 10, 20
```

`yield*` 还能获取被委托生成器的返回值:

```javascript
function* sub() {
  yield 1;
  yield 2;
  return 'subResult';
}

function* main() {
  const result = yield* sub();
  console.log('委托返回:', result);
  yield 3;
}

const it = main();
console.log(it.next().value); // 1
console.log(it.next().value); // 2
console.log(it.next().value); // 委托返回: subResult,然后 3
```

---

## 4. 迭代协议深入

### 4.1 手写迭代器

```javascript
// 自定义可迭代对象:数字区间
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }

  // 实现 Symbol.iterator 方法
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    const step = this.step;

    return {
      next() {
        if (current <= end) {
          const value = current;
          current += step;
          return { value, done: false };
        }
        return { value: undefined, done: true };
      },
      // 可选:return 方法在 break/throw 时被调用
      return(value) {
        console.log('清理资源');
        return { value, done: true };
      },
    };
  }
}

const r = new Range(1, 5);
for (const n of r) {
  console.log(n);  // 1, 2, 3, 4, 5
}

// 展开运算符也使用迭代协议
console.log([...new Range(1, 3)]); // [1, 2, 3]

// 解构也使用迭代协议
const [first, second] = new Range(10, 20);
console.log(first, second); // 10, 11
```

### 4.2 生成器简化迭代器实现

```javascript
// 使用生成器简化 Range
function* range(start, end, step = 1) {
  for (let i = start; i <= end; i += step) {
    yield i;
  }
}

for (const n of range(1, 5)) {
  console.log(n);
}

// 让任意对象可迭代
const obj = {
  data: [1, 2, 3],
  *[Symbol.iterator]() {
    for (const item of this.data) {
      yield item;
    }
  },
};

console.log([...obj]); // [1, 2, 3]
```

### 4.3 内建可迭代对象

JavaScript 内建的可迭代对象包括:

- `Array`、`TypedArray`
- `String`
- `Map`、`Set`
- `arguments`
- `NodeList`、`DOM Token List`
- 生成器对象(自身也可迭代)

```javascript
// Map 迭代
const m = new Map([['a', 1], ['b', 2]]);
for (const [k, v] of m) {
  console.log(k, v);
}

// String 迭代(按 code point,正确处理 emoji)
const str = 'Hello\uD83D\uDE00World';
console.log([...str]);  // ['H','e','l','l','o','\u{1F600}','W','o','r','l','d']
console.log(str.length); // 11(注意:按 UTF-16 单元计算)
```

### 4.4 迭代器的惰性特性

```javascript
function* lazyChain() {
  console.log('开始');
  yield 1;
  console.log('产生 1 后');
  yield 2;
  console.log('产生 2 后');
  yield 3;
  console.log('结束');
}

const it = lazyChain();
// 注意:此时控制台还没有输出 "开始"
console.log('---');
console.log(it.next().value);
// 输出:开始, 1
console.log(it.next().value);
// 输出:产生 1 后, 2
```

---

## 5. 生成器方法详解

### 5.1 next(value)

恢复执行,可选地传入值给上一个 yield 表达式。

```javascript
function* counter() {
  let count = 0;
  while (true) {
    const reset = yield count++;
    if (reset) count = 0;
  }
}

const c = counter();
console.log(c.next().value);    // 0
console.log(c.next().value);    // 1
console.log(c.next().value);    // 2
console.log(c.next(true).value); // 0 (重置)
console.log(c.next().value);    // 1
```

### 5.2 return(value)

立即终止生成器,返回值。

```javascript
function* gen() {
  yield 1;
  yield 2;
  yield 3;
}

const g = gen();
console.log(g.next());                  // { value: 1, done: false }
console.log(g.return('forced end'));    // { value: 'forced end', done: true }
console.log(g.next());                  // { value: undefined, done: true }
```

`for...of` 循环中 `break`、`continue`、`return`、`throw` 会触发 `return()`:

```javascript
function* withCleanup() {
  try {
    yield 1;
    yield 2;
    yield 3;
  } finally {
    console.log('清理中...');
  }
}

for (const v of withCleanup()) {
  if (v === 2) break;
  console.log(v);
}
// 输出:1, 清理中...
```

### 5.3 throw(error)

在当前挂起的 yield 处抛出错误。

```javascript
function* tryCatch() {
  try {
    yield 1;
    yield 2;
  } catch (e) {
    console.log('捕获:', e.message);
    yield 3;
  }
}

const g = tryCatch();
console.log(g.next());          // { value: 1, done: false }
console.log(g.throw(new Error('boom')));  // 捕获: boom, { value: 3, done: false }
console.log(g.next());          // { value: undefined, done: true }
```

### 5.4 方法语义对比表

| 方法                  | 作用                         | 调用后状态                  | 典型场景           |
| --------------------- | ---------------------------- | --------------------------- | ------------------ |
| `next(value)`         | 恢复执行,传入值             | 暂停在下一个 yield 或完成   | 主流程驱动         |
| `return(value)`       | 终止生成器,返回值           | completed                   | 提前结束、资源清理 |
| `throw(error)`        | 在 yield 处抛出错误          | 若未捕获则 completed        | 错误注入、状态恢复 |

---

## 6. 协程语义与生成器的关系

### 6.1 协程的三种类型

1. **对称协程(Symmetric)**:协程之间平等切换,如 Go 的 goroutine
2. **非对称协程(Asymmetric)**:有调用者-被调用者层级,如 Python 的 yield from
3. **半协程(Semi-coroutine)**:只能 yield 给调用者,JavaScript 生成器属于此类

### 6.2 生成器作为协程的能力与限制

| 能力               | JS Generator | 完整协程 |
| ------------------ | ------------ | -------- |
| 挂起与恢复         | 是           | 是       |
| 双向传值           | 是           | 是       |
| 任意点切换         | 否           | 是       |
| 协程间直接切换     | 否           | 是       |
| 多层级委托         | 是(yield*)   | 是       |
| 并行执行           | 否           | 取决于实现 |

### 6.3 生成器与 async/await 的关系

`async/await` 实际上是 Generator + Promise 的语法糖,语义上等价于:

```javascript
// async/await 写法
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// 等价的 Generator + 自动执行器写法
function* fetchUserGen(id) {
  const response = yield fetch(`/api/users/${id}`);
  return yield response.json();
}

// 自动执行器(简化版 co)
function run(generator) {
  const it = generator();
  return new Promise((resolve, reject) => {
    function step(method, arg) {
      try {
        const { value, done } = it[method](arg);
        if (done) return resolve(value);
        Promise.resolve(value).then(
          (v) => step('next', v),
          (e) => step('throw', e)
        );
      } catch (e) {
        reject(e);
      }
    }
    step('next');
  });
}

run(() => fetchUserGen(1)).then(console.log);
```

### 6.4 co 库原理剖析

`co` 是 TJ Holowaychuk 在 2013 年发布的库,核心思想是自动驱动生成器,把 yield 后的 Promise 解决值传回生成器:

```javascript
// co 库核心实现(简化版)
function co(gen) {
  return new Promise((resolve, reject) => {
    // 支持传入生成器函数或生成器对象
    if (typeof gen === 'function') gen = gen();
    if (!gen || typeof gen.next !== 'function') return resolve(gen);

    function onFulfilled(res) {
      let ret;
      try {
        ret = gen.next(res);
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    function onRejected(err) {
      let ret;
      try {
        ret = gen.throw(err);
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    function next(ret) {
      if (ret.done) return resolve(ret.value);
      const value = toPromise(ret.value);
      if (value && isPromise(value)) {
        return value.then(onFulfilled, onRejected);
      }
      onRejected(new TypeError('只支持 Promise 和 thunk'));
    }

    onFulfilled();
  });
}
```

### 6.5 生成器 vs async/await 对比

| 特性          | Generator + co              | async/await              |
| ------------- | --------------------------- | ------------------------ |
| 语法          | function* + yield           | async function + await   |
| 自动驱动      | 需要执行器(co、asyncawait) | 内建                     |
| Promise 支持  | 通过 co 转换                | 原生                     |
| 错误处理      | try/catch                   | try/catch                |
| 语义          | 协程                        | 异步函数                 |
| 可手动驱动    | 是                          | 否                       |
| 适用场景      | 流式、状态机、自定义执行器  | 普通异步逻辑             |

---

## 7. 异步生成器

### 7.1 基本语法

```javascript
async function* asyncGen() {
  yield 1;
  // 可以在 yield 之间使用 await
  const data = await fetch('/api/data').then(r => r.json());
  yield data;
  yield 3;
}

const ag = asyncGen();
ag.next().then(r => console.log(r)); // { value: 1, done: false }
```

### 7.2 for await...of 消费

```javascript
async function consume() {
  for await (const item of asyncGen()) {
    console.log(item);
  }
}
consume();
```

### 7.3 异步生成器实现分页拉取

```javascript
/**
 * 分页拉取器:逐项产出所有页面的数据
 * @param {function} fetchPage - 异步函数,接收页码,返回 { items, hasNext }
 * @returns {AsyncGenerator} 异步生成器
 */
async function* paginate(fetchPage) {
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const result = await fetchPage(page);
    for (const item of result.items) {
      yield item;
    }
    hasNext = result.hasNext;
    page++;
  }
}

// 使用示例
async function fetchPage(page) {
  const res = await fetch(`/api/users?page=${page}`);
  return res.json();
}

(async () => {
  for await (const user of paginate(fetchPage)) {
    console.log(user);
  }
})();
```

### 7.4 流式文件读取(Node.js)

```javascript
const fs = require('fs/promises');

async function* readLines(path, encoding = 'utf8') {
  const fd = await fs.open(path, 'r');
  try {
    const buf = Buffer.alloc(64 * 1024);
    let leftover = '';
    while (true) {
      const { bytesRead } = await fd.read(buf, 0, buf.length, null);
      if (bytesRead === 0) break;
      leftover += buf.slice(0, bytesRead).toString(encoding);
      const lines = leftover.split('\n');
      leftover = lines.pop();
      for (const line of lines) yield line;
    }
    if (leftover) yield leftover;
  } finally {
    await fd.close();
  }
}

// 使用
(async () => {
  for await (const line of readLines('./big.log')) {
    if (line.includes('ERROR')) console.log(line);
  }
})();
```

### 7.5 异步生成器方法

异步生成器也支持 `return()` 和 `throw()`,但返回 Promise:

```javascript
async function* gen() {
  try {
    yield 1;
    yield 2;
  } catch (e) {
    console.log('caught:', e.message);
    yield 3;
  }
}

const g = gen();
await g.next();               // { value: 1, done: false }
await g.throw(new Error('x')); // caught: x, { value: 3, done: false }
await g.next();               // { value: undefined, done: true }
```

---

## 8. 无限流与惰性序列

### 8.1 无限自然数

```javascript
function* naturals(start = 0) {
  let n = start;
  while (true) yield n++;
}

// 配合 take 使用
function* take(iterable, n) {
  let i = 0;
  for (const v of iterable) {
    if (i++ >= n) return;
    yield v;
  }
}

console.log([...take(naturals(), 5)]); // [0, 1, 2, 3, 4]
```

### 8.2 斐波那契数列

```javascript
function* fibonacci() {
  let [a, b] = [0, 1];
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

function* takeWhile(iterable, predicate) {
  for (const v of iterable) {
    if (!predicate(v)) return;
    yield v;
  }
}

// 输出小于 100 的斐波那契数
console.log([...takeWhile(fibonacci(), n => n < 100)]);
// [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
```

### 8.3 函数式组合子

```javascript
function* map(iterable, fn) {
  for (const v of iterable) yield fn(v);
}

function* filter(iterable, predicate) {
  for (const v of iterable) {
    if (predicate(v)) yield v;
  }
}

function* zip(...iterables) {
  const iterators = iterables.map(it => it[Symbol.iterator]());
  while (true) {
    const results = iterators.map(it => it.next());
    if (results.some(r => r.done)) return;
    yield results.map(r => r.value);
  }
}

// 链式处理:自然数 → 过滤偶数 → 平方 → 取前 5 个
const result = take(map(filter(naturals(), n => n % 2 === 0), n => n * n), 5);
console.log([...result]); // [0, 4, 16, 36, 64]
```

### 8.4 与 ES2024 Iterator Helpers 对比

ES2024 引入了原生的 Iterator Helpers,提供等价功能:

```javascript
// ES2024 写法
function* naturals() {
  let n = 0;
  while (true) yield n++;
}

const result = naturals()
  .filter(n => n % 2 === 0)
  .map(n => n * n)
  .take(5)
  .toArray();

console.log(result); // [0, 4, 16, 36, 64]
```

---

## 9. 状态机模式

### 9.1 用生成器实现状态机

```javascript
function* trafficLight() {
  while (true) {
    console.log('绿灯 30s');
    yield 'green';
    console.log('黄灯 5s');
    yield 'yellow';
    console.log('红灯 30s');
    yield 'red';
  }
}

const light = trafficLight();
console.log(light.next().value); // 绿灯 30s, green
console.log(light.next().value); // 黄灯 5s, yellow
console.log(light.next().value); // 红灯 30s, red
console.log(light.next().value); // 绿灯 30s, green
```

### 9.2 复杂状态机:解析器

```javascript
/**
 * 简单的 JSON 字符串解析器(状态机版)
 * 仅演示原理,生产环境请使用 JSON.parse
 */
function* jsonParser(input) {
  let i = 0;
  function* parseValue() {
    skipWhitespace();
    const ch = input[i];
    if (ch === '{') yield* parseObject();
    else if (ch === '[') yield* parseArray();
    else if (ch === '"') yield parseString();
    else if (ch === 't' || ch === 'f') yield parseBool();
    else if (ch === 'n') yield parseNull();
    else yield parseNumber();
  }
  // 简化:省略其余 parseXxx 实现
  yield* parseValue();
}
```

### 9.3 生成器 vs 类状态机

```javascript
// 类实现状态机
class TrafficLight {
  constructor() {
    this.states = ['green', 'yellow', 'red'];
    this.index = 0;
  }
  next() {
    const state = this.states[this.index];
    this.index = (this.index + 1) % this.states.length;
    return state;
  }
}

// 生成器实现
function* trafficLightGen() {
  const states = ['green', 'yellow', 'red'];
  let i = 0;
  while (true) {
    yield states[i];
    i = (i + 1) % states.length;
  }
}
```

生成器版本的优势:
- 状态转移用线性代码表达,避免显式状态变量
- 上下文(局部变量)自动保留,无需 this
- 更适合"序列式"状态机

---

## 10. 生产级代码示例

### 10.1 可取消的异步任务

```javascript
/**
 * 可取消的异步任务包装器
 * 支持外部通过 signal 取消,内部通过 yield 检查取消状态
 */
class CancellableTask {
  #gen;
  #controller;
  #signal;
  #onCancel;

  constructor(generatorFn, onCancel) {
    this.#gen = generatorFn();
    this.#controller = new AbortController();
    this.#signal = this.#controller.signal;
    this.#onCancel = onCancel;
  }

  /**
   * 启动任务并返回最终 Promise
   * @returns {Promise<any>}
   */
  async run() {
    try {
      let result = this.#gen.next();
      while (!result.done) {
        if (this.#signal.aborted) {
          this.#gen.return('cancelled');
          throw new DOMException('Aborted', 'AbortError');
        }
        const value = await Promise.resolve(result.value);
        result = this.#gen.next(value);
      }
      return result.value;
    } catch (err) {
      if (err.name === 'AbortError' && this.#onCancel) {
        await this.#onCancel();
      }
      throw err;
    }
  }

  /**
   * 取消任务
   */
  cancel() {
    this.#controller.abort();
  }
}

// 使用示例
const task = new CancellableTask(function* () {
  yield new Promise(r => setTimeout(r, 1000));
  console.log('步骤 1 完成');
  yield new Promise(r => setTimeout(r, 1000));
  console.log('步骤 2 完成');
  return 'done';
});

task.run().catch(err => console.log('取消:', err.message));
setTimeout(() => task.cancel(), 1500);
```

### 10.2 并发限制器

```javascript
/**
 * 并发限制器:控制同时执行的 Promise 数量
 * @param {Array<() => Promise>} tasks - 任务工厂数组
 * @param {number} concurrency - 最大并发数
 * @returns {AsyncGenerator} 产出每个任务的结果
 */
async function* pool(tasks, concurrency) {
  const executing = new Set();
  const queue = [...tasks.entries()];

  while (queue.length > 0 || executing.size > 0) {
    // 填满并发槽位
    while (executing.size < concurrency && queue.length > 0) {
      const [index, task] = queue.shift();
      const p = Promise.resolve()
        .then(() => task())
        .then(result => ({ index, result, error: null }))
        .catch(error => ({ index, result: null, error }));
      executing.add(p);
      p.finally(() => executing.delete(p));
    }

    // 等待任意一个完成
    if (executing.size > 0) {
      const finished = await Promise.race(executing);
      yield finished;
    }
  }
}

// 使用:并发拉取 100 个 URL,同时最多 5 个
async function fetchAll(urls) {
  const tasks = urls.map(url => () => fetch(url).then(r => r.json()));
  const results = [];
  for await (const { index, result, error } of pool(tasks, 5)) {
    if (error) console.error(`#${index} 失败:`, error);
    else results[index] = result;
  }
  return results;
}
```

### 10.3 流式数据处理管道

```javascript
/**
 * 流式管道:多个 async generator 串联
 */
async function* source() {
  for (let i = 0; i < 100; i++) {
    yield { id: i, value: Math.random() * 100 };
  }
}

async function* transform(asyncIter, fn) {
  for await (const item of asyncIter) {
    yield fn(item);
  }
}

async function* filter(asyncIter, predicate) {
  for await (const item of asyncIter) {
    if (predicate(item)) yield item;
  }
}

async function* batch(asyncIter, size) {
  let buf = [];
  for await (const item of asyncIter) {
    buf.push(item);
    if (buf.length >= size) {
      yield buf;
      buf = [];
    }
  }
  if (buf.length > 0) yield buf;
}

// 组合管道
const pipeline = batch(
  filter(
    transform(source(), x => ({ ...x, doubled: x.value * 2 })),
    x => x.doubled > 50
  ),
  10
);

for await (const batch of pipeline) {
  console.log('批次:', batch);
}
```

### 10.4 背压控制

```javascript
/**
 * 带背压的异步生成器:消费者未消费时不产生新数据
 */
async function* withBackpressure(source, maxBuffer = 10) {
  const buffer = [];
  let producerDone = false;
  let resolveConsumer = null;

  // 启动生产者
  (async () => {
    for await (const item of source) {
      // 等待缓冲区有空位
      while (buffer.length >= maxBuffer) {
        await new Promise(r => setTimeout(r, 10));
      }
      buffer.push(item);
      if (resolveConsumer) {
        const fn = resolveConsumer;
        resolveConsumer = null;
        fn();
      }
    }
    producerDone = true;
    if (resolveConsumer) {
      const fn = resolveConsumer;
      resolveConsumer = null;
      fn();
    }
  })();

  while (true) {
    if (buffer.length > 0) {
      yield buffer.shift();
    } else if (producerDone) {
      return;
    } else {
      await new Promise(r => { resolveConsumer = r; });
    }
  }
}
```

---

## 11. 复杂度分析与正确性证明

### 11.1 时间复杂度

设生成器产生 $n$ 个值,每个 yield 的开销为 $O(1)$,则完整迭代的时间复杂度为:

$$
T(n) = O(n) \cdot O(1) = O(n)
$$

但生成器相对于普通循环有常数因子开销,主要包括:
- 状态机维护
- Generator 对象的内存分配
- next() 调用边界检查

实测:简单累加,V8 中生成器版本比 for 循环慢 3-10 倍。

### 11.2 空间复杂度

生成器的空间复杂度为 $O(1)$(不包括产出值的存储),因为:
- 局部变量在 yield 之间保留(单个栈帧)
- 无需保存所有历史输出

对比数组展开:
- 数组:`O(n)` 内存
- 生成器:`O(1)` 内存

### 11.3 正确性:迭代器协议满足性

**定理 1**:生成器对象 $g$ 满足迭代器协议,即 $\forall i$,$g.next()$ 返回 $\{value, done\}$ 对象。

**证明**:由 ECMAScript 规范 §27.5.1.1,Generator.prototype.next 的实现:
1. 调用 GeneratorResume,执行到下一个 yield 或 return
2. 若 yield,返回 IteratorResult(value, false)
3. 若 return 或异常退出,返回 IteratorResult(value, true)

因此协议被自动满足。

**定理 2**:生成器对象满足可迭代协议,即 `g[Symbol.iterator]() === g`。

**证明**:由规范 §27.5.1.2,Generator.prototype[@@iterator] 返回 this。

### 11.4 yield\* 委托的正确性

**定理 3**:`yield* g` 等价于手动迭代 $g$ 并 yield 每个值。

**证明**:由规范 §14.4.14,YieldExpression 对 `yield*` 的求值:
1. 调用 `g[Symbol.iterator]()`
2. 循环调用 `iter.next()`
3. 若 `done` 为 true,返回 `value` 作为 yield* 表达式的值
4. 否则 `yield value` 并在下次恢复时传入新值

因此 `yield*` 与手动迭代语义一致。

### 11.5 异步生成器的等价性

**定理 4**:`async function*` 与 `function*` + `yield Promise.resolve` 在外部语义上等价。

**证明**:
- `async function*` 的 yield 自动 await 输入值
- next() 返回 `Promise<IteratorResult>`
- 与 co 库的转换结果一致

差异仅在实现细节:
- async generator 是引擎内建,无需执行器
- co 需要外部驱动器

---

## 12. 对比分析

### 12.1 与其他迭代机制对比

| 机制                | 惰性  | 双向通信 | 异步原生 | 内建语法      | 适用场景                  |
| ------------------- | ----- | -------- | -------- | ------------- | ------------------------- |
| 数组                | 否    | 否       | 否       | 是            | 已知有限集合              |
| 自定义迭代器        | 是    | 是       | 否       | 需手写        | 复杂状态                  |
| Generator           | 是    | 是       | 否       | function*     | 状态机、序列              |
| AsyncGenerator      | 是    | 是       | 是       | async function*| 流式异步                  |
| Observable          | 是    | 否       | 是       | 需 RxJS       | 事件流、多播              |
| Stream(Node.js)     | 是    | 否       | 是       | 是            | I/O 流                    |

### 12.2 与 RxJS Observable 对比

```javascript
// RxJS Observable
import { from, interval } from 'rxjs';
import { take, map, filter } from 'rxjs/operators';

const stream$ = interval(1000).pipe(
  filter(n => n % 2 === 0),
  map(n => n * 2),
  take(5)
);

stream$.subscribe(n => console.log(n));

// 等价的 AsyncGenerator
async function* stream() {
  let n = 0;
  while (true) {
    await new Promise(r => setTimeout(r, 1000));
    if (n % 2 === 0) yield n * 2;
    n++;
  }
}

(async () => {
  let count = 0;
  for await (const n of stream()) {
    console.log(n);
    if (++count >= 5) break;
  }
})();
```

| 维度      | RxJS Observable          | AsyncGenerator           |
| --------- | ------------------------ | ------------------------ |
| 多播      | 支持(subject)           | 不支持                   |
| 取消      | unsubscribe              | AbortSignal / return()   |
| 错误处理  | catch 操作符             | try/catch                |
| 时间操作  | 丰富(debounce、throttle) | 需手写                   |
| 学习成本  | 高                       | 低                       |
| 包大小    | ~40KB(gzip)             | 0(原生)                 |

### 12.3 与回调、Promise、async/await 对比

```javascript
// 回调地狱
function loadDataCallback(cb) {
  fetchUser(id, (err, user) => {
    if (err) return cb(err);
    fetchPosts(user, (err, posts) => {
      if (err) return cb(err);
      fetchComments(posts, (err, comments) => {
        if (err) return cb(err);
        cb(null, { user, posts, comments });
      });
    });
  });
}

// Promise 链
function loadDataPromise() {
  return fetchUser(id)
    .then(user => fetchPosts(user).then(posts => ({ user, posts })))
    .then(({ user, posts }) => fetchComments(posts).then(comments => ({ user, posts, comments })));
}

// async/await
async function loadDataAsync() {
  const user = await fetchUser(id);
  const posts = await fetchPosts(user);
  const comments = await fetchComments(posts);
  return { user, posts, comments };
}

// Generator + co
function* loadDataGen() {
  const user = yield fetchUser(id);
  const posts = yield fetchPosts(user);
  const comments = yield fetchComments(posts);
  return { user, posts, comments };
}
co(loadDataGen).then(console.log);
```

---

## 13. 常见陷阱与 Bug

### 13.1 陷阱:误以为调用即执行

```javascript
function* gen() {
  console.log('started');
  yield 1;
}

gen(); // 没有输出 "started"
// 正确:gen().next(); // 输出 started,返回 { value: 1 }
```

### 13.2 陷阱:第一次 next 传值无效

```javascript
function* gen() {
  const x = yield 1;
  console.log(x);
}

const g = gen();
g.next('hello'); // hello 被丢弃,因为 yield 1 之前没有 yield 等待返回
g.next('world'); // 输出 world
```

### 13.3 陷阱:箭头函数不能作为生成器

```javascript
const gen = *() => { yield 1; }; // 语法错误
// 正确:const gen = function* () { yield 1; };
```

### 13.4 陷阱:yield 在生成器外

```javascript
const arr = [1, 2, 3].map(x => yield x * 2); // 语法错误
// 正确:
function* double(arr) {
  for (const x of arr) yield x * 2;
}
```

### 13.5 陷阱:跨边界 yield

```javascript
// 错误:回调中的 yield
function* gen() {
  setTimeout(() => {
    yield 1; // SyntaxError: Unexpected identifier
  }, 100);
}
```

### 13.6 陷阱:生成器只能迭代一次

```javascript
function* gen() {
  yield 1;
  yield 2;
}

const g = gen();
console.log([...g]); // [1, 2]
console.log([...g]); // [](已结束)

// 解决:每次创建新生成器
function genFactory() {
  return gen();
}
```

### 13.7 陷阱:this 绑定

```javascript
const obj = {
  value: 42,
  *gen() {
    yield this.value; // 正确:对象方法生成器,this 指向对象
  },
};

function* standalone() {
  yield this.value; // this 是 undefined(严格模式)
}

console.log([...obj.gen()]); // [42]
```

### 13.8 陷阱:异步生成器中未 await 的 Promise

```javascript
async function* gen() {
  yield Promise.resolve(1); // 异步生成器会自动 await yield 的值
  // 但是 yield* 不会自动 await
  yield* [Promise.resolve(2), Promise.resolve(3)]; // 输出 Promise 对象
}

// 正确:显式 await
async function* gen2() {
  for (const p of [Promise.resolve(2), Promise.resolve(3)]) {
    yield await p;
  }
}
```

### 13.9 陷阱:内存泄漏

```javascript
// 大对象在生成器中可能长期保留
function* processLarge(data) {
  for (const item of data) {
    yield heavyTransform(item); // data 引用被保留在闭包中
  }
  // 即使消费完所有 yield,data 仍可能未被 GC(取决于引擎实现)
}

// 改进:及时释放
function* processLarge(data) {
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    data[i] = null; // 帮助 GC
    yield heavyTransform(item);
  }
}
```

### 13.10 Bug 案例:取消未传播

```javascript
// 错误:内层生成器的 return 没有传播到外层
function* inner() {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log('inner cleanup');
  }
}

function* outer() {
  yield* inner();
  yield 3;
}

const it = outer();
console.log(it.next().value); // 1
console.log(it.return('end').value);
// 输出:inner cleanup, end
// 但是 outer 中 yield 3 没有执行!return 会传播到 yield*
```

---

## 14. 性能调优

### 14.1 性能基准

```javascript
// Benchmark:累加 1 到 1e6
function benchFor() {
  let sum = 0;
  for (let i = 1; i <= 1e6; i++) sum += i;
  return sum;
}

function* genRange(n) {
  for (let i = 1; i <= n; i++) yield i;
}

function benchGen() {
  let sum = 0;
  for (const i of genRange(1e6)) sum += i;
  return sum;
}

// V8 8.x 典型结果:
// benchFor:  ~3ms
// benchGen:  ~25ms (约 8x 慢)
```

### 14.2 何时使用生成器

**推荐使用**:
- 序列无限或非常大(惰性求值)
- 状态机逻辑复杂
- 需要双向通信
- 流式异步数据
- 代码可读性优先于性能

**避免使用**:
- 紧密循环中性能敏感
- 数据量小且已知
- 简单映射可用数组方法

### 14.3 优化技巧

1. **内联简单生成器**:对性能关键的简单生成器,用手写迭代器替代

```javascript
// 慢:生成器
function* range(start, end) {
  for (let i = start; i < end; i++) yield i;
}

// 快:手写迭代器
function rangeFast(start, end) {
  return {
    [Symbol.iterator]() {
      let i = start;
      return {
        next() {
          return i < end
            ? { value: i++, done: false }
            : { value: undefined, done: true };
        }
      };
    }
  };
}
```

2. **批量 yield**:减少 yield 次数

```javascript
// 慢:逐项 yield
async function* slow(items) {
  for (const item of items) yield process(item);
}

// 快:批量 yield
async function* fast(items, batchSize = 100) {
  for (let i = 0; i < items.length; i += batchSize) {
    yield items.slice(i, i + batchSize).map(process);
  }
}
```

3. **避免 yield* 多层嵌套**:深度委托有累积开销

### 14.4 V8 生成器实现概览

V8 中生成器基于"栈切片"实现:
- 首次调用 next() 时,在堆上分配栈帧
- yield 时,栈帧状态被保存
- next() 时,恢复栈帧继续执行

这种实现保证了生成器可以在任意深度 yield,但代价是堆分配开销。

---

## 15. 案例研究

### 15.1 案例:Redux Saga

Redux Saga 是使用生成器管理副作用的著名库。

```javascript
import { call, put, takeEvery, all } from 'redux-saga/effects';

// Worker Saga:异步获取用户
function* fetchUser(action) {
  try {
    const user = yield call(Api.fetchUser, action.payload);
    yield put({ type: 'FETCH_USER_SUCCESS', user });
  } catch (e) {
    yield put({ type: 'FETCH_USER_ERROR', message: e.message });
  }
}

// Watcher Saga:监听 action
function* watchFetchUser() {
  yield takeEvery('FETCH_USER_REQUEST', fetchUser);
}

// Root Saga
export default function* rootSaga() {
  yield all([
    watchFetchUser(),
    watchFetchPosts(),
  ]);
}
```

设计要点:
- 用 yield 声明副作用,便于测试(只 yield 描述,不执行)
- call/put 是指令对象,被中间件解释执行
- 错误处理用 try/catch,直观
- 组合用 yield* 或 all/race

### 15.2 案例:Koa 中间件

Koa 2+ 使用 async/await,但 Koa 1 使用生成器中间件:

```javascript
// Koa 1 风格
app.use(function* (next) {
  const start = Date.now();
  yield next;
  const ms = Date.now() - start;
  this.set('X-Response-Time', `${ms}ms`);
});

// 等价的 Koa 2 风格
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});
```

### 15.3 案例:Immer 与生成器

Immer 的草稿机制可用 Proxy 实现,也可用生成器表达"修改意图":

```javascript
function* produceDraft(state) {
  const draft = deepClone(state);
  yield draft;
  // 消费者修改 draft 后,生成器返回最终状态
  return applyChanges(state, draft);
}
```

### 15.4 案例:Node.js streams

Node.js Stream 在 v10+ 支持 async iterator 协议:

```javascript
const { createReadStream } = require('fs');

async function processFile() {
  const stream = createReadStream('./large.txt');
  for await (const chunk of stream) {
    console.log('chunk:', chunk.length, 'bytes');
  }
}
```

### 15.5 案例:GraphQL DataLoader

DataLoader 利用异步生成器实现批量化:

```javascript
class DataLoader {
  constructor(batchFn) {
    this.batchFn = batchFn;
    this.queue = [];
    this.scheduled = false;
  }

  load(key) {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });
      if (!this.scheduled) {
        this.scheduled = true;
        process.nextTick(() => this.dispatch());
      }
    });
  }

  async dispatch() {
    this.scheduled = false;
    const batch = this.queue.splice(0);
    try {
      const results = await this.batchFn(batch.map(item => item.key));
      batch.forEach((item, i) => item.resolve(results[i]));
    } catch (e) {
      batch.forEach(item => item.reject(e));
    }
  }
}
```

---

## 16. 高级主题

### 16.1 自定义执行器

```javascript
/**
 * 类似 co 但支持更多 yieldable 类型
 * @param {GeneratorFunction} genFn
 * @returns {Promise}
 */
function run(genFn, ...args) {
  return new Promise((resolve, reject) => {
    const gen = genFn(...args);

    function step(method, arg) {
      let result;
      try {
        result = gen[method](arg);
      } catch (e) {
        return reject(e);
      }

      const { value, done } = result;
      if (done) return resolve(value);

      // 支持 Promise
      if (value && typeof value.then === 'function') {
        value.then(v => step('next', v), e => step('throw', e));
        return;
      }

      // 支持数组(并发)
      if (Array.isArray(value)) {
        Promise.all(value.map(toPromise))
          .then(vs => step('next', vs), e => step('throw', e));
        return;
      }

      // 支持对象(并发)
      if (value && typeof value === 'object') {
        const keys = Object.keys(value);
        Promise.all(keys.map(k => toPromise(value[k])))
          .then(vs => {
            const obj = {};
            keys.forEach((k, i) => obj[k] = vs[i]);
            step('next', obj);
          }, e => step('throw', e));
        return;
      }

      step('throw', new TypeError(`Unsupported yield type: ${typeof value}`));
    }

    function toPromise(v) {
      if (v && typeof v.then === 'function') return v;
      if (typeof v === 'function') return new Promise(resolve => v(resolve));
      return Promise.resolve(v);
    }

    step('next');
  });
}
```

### 16.2 CSP(Communicating Sequential Processes)

借鉴 Go/Clojure core.async 的 CSP 模式:

```javascript
class Channel {
  constructor() {
    this.queue = [];
    this.waiters = [];
  }

  put(value) {
    return new Promise(resolve => {
      if (this.waiters.length > 0) {
        const waiter = this.waiters.shift();
        waiter(value);
        resolve();
      } else {
        this.queue.push({ value, resolve });
      }
    });
  }

  take() {
    return new Promise(resolve => {
      if (this.queue.length > 0) {
        const { value, resolve: putResolve } = this.queue.shift();
        resolve(value);
        putResolve();
      } else {
        this.waiters.push(resolve);
      }
    });
  }
}

// 使用生成器 + Channel 实现 CSP
function* producer(chan, count) {
  for (let i = 0; i < count; i++) {
    yield chan.put(i);
    console.log('produced:', i);
  }
}

function* consumer(chan, count) {
  for (let i = 0; i < count; i++) {
    const v = yield chan.take();
    console.log('consumed:', v);
  }
}
```

### 16.3 生成器与尾调用优化

虽然生成器不直接享受 TCO,但其状态机模型可看作"显式 TCO":

```javascript
// 递归(可能栈溢出)
function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// 尾递归(支持 TCO 时常数栈)
function factorialTC(n, acc = 1) {
  return n <= 1 ? acc : factorialTC(n - 1, n * acc);
}

// 生成器(无栈溢出风险)
function* factorialGen(n, acc = 1) {
  if (n <= 1) return acc;
  yield;
  yield* factorialGen(n - 1, n * acc);
}
```

### 16.4 生成器与续延(Continuation)

生成器可视为受限的续延,只支持"返回到调用点"。完整的续延(如 Scheme 的 call/cc)在 JS 中无法直接实现,但可通过生成器模拟:

```javascript
function* callCC(f) {
  // 简化:仅支持一次续延调用
  let k = null;
  const result = yield* f(function* (v) {
    k = v;
    yield 'escape';
  });
  return result;
}
```

### 16.5 生成器与代数效应

代数效应(Algebraic Effects)是异步计算的另一种抽象,可由生成器模拟:

```javascript
function* perform(effect) {
  return yield { type: 'perform', effect };
}

function* computation() {
  const x = yield* perform({ type: 'read', key: 'name' });
  return `Hello, ${x}`;
}

function runWith(handler) {
  return function* (comp) {
    const it = comp();
    let result = it.next();
    while (!result.done) {
      if (result.value?.type === 'perform') {
        const handled = handler(result.value.effect);
        result = it.next(handled);
      } else {
        result = it.next(result.value);
      }
    }
    return result.value;
  };
}
```

---

## 17. 测试策略

### 17.1 单元测试生成器

```javascript
const assert = require('assert');

function* counter() {
  let n = 0;
  while (true) yield n++;
}

describe('counter', () => {
  it('应产生递增的整数', () => {
    const c = counter();
    assert.strictEqual(c.next().value, 0);
    assert.strictEqual(c.next().value, 1);
    assert.strictEqual(c.next().value, 2);
  });

  it('done 永远为 false(无限生成器)', () => {
    const c = counter();
    c.next();
    c.next();
    assert.strictEqual(c.next().done, false);
  });
});
```

### 17.2 测试异步生成器

```javascript
const assert = require('assert');

async function* asyncCounter() {
  let n = 0;
  while (true) {
    await new Promise(r => setImmediate(r));
    yield n++;
  }
}

describe('asyncCounter', () => {
  it('应异步产生递增整数', async () => {
    const c = asyncCounter();
    assert.strictEqual((await c.next()).value, 0);
    assert.strictEqual((await c.next()).value, 1);
  });
});
```

### 17.3 属性测试

```javascript
const assert = require('assert');
const { take } = require('./generator-utils');

function* naturals() {
  let n = 0;
  while (true) yield n++;
}

// 验证:take(naturals(), n) 应等于 [0, 1, ..., n-1]
function testTake() {
  for (let n = 0; n < 100; n++) {
    const result = [...take(naturals(), n)];
    const expected = Array.from({ length: n }, (_, i) => i);
    assert.deepStrictEqual(result, expected);
  }
}

testTake();
console.log('所有测试通过');
```

### 17.4 快照测试

```javascript
const assert = require('assert');

function serialize(gen) {
  const result = [];
  for (const v of gen) result.push(v);
  return JSON.stringify(result);
}

function* sample() {
  yield 1;
  yield* [2, 3];
  yield 'done';
}

assert.strictEqual(serialize(sample()), '[1,2,3,"done"]');
```

---

## 18. 调试技巧

### 18.1 生成器状态检查

```javascript
function* gen() { yield 1; yield 2; }
const g = gen();

// 检查状态(非标准 API,仅 Node.js)
// console.log(g);

// 标准方法:试探性 next
function isDone(g) {
  // 注意:这会消耗一个值!不可用于生产
  const result = g.next();
  return result.done;
}
```

### 18.2 可视化 yield 流

```javascript
function* debugGen(label, gen) {
  for (const v of gen) {
    console.log(`[${label}] yielding:`, v);
    yield v;
  }
}

function* source() {
  yield 1;
  yield 2;
  yield 3;
}

for (const v of debugGen('source', source())) {
  console.log('consumed:', v);
}
// [source] yielding: 1
// consumed: 1
// [source] yielding: 2
// consumed: 2
// [source] yielding: 3
// consumed: 3
```

### 18.3 错误堆栈追踪

生成器错误堆栈可能跨越多次 next() 调用,调试困难:

```javascript
function* gen() {
  yield 1;
  throw new Error('bug');
}

const g = gen();
g.next();
try {
  g.next();
} catch (e) {
  console.error(e.stack);
  // Error: bug
  //   at gen (...)
  //   at ...(调用 next 的位置)
  // 注意:堆栈只显示当前 next 调用,不显示之前的 next
}
```

### 18.4 Chrome DevTools

在 DevTools 中,生成器对象会显示其状态(suspended/running/closed)。可在 Sources 面板的 Scope 中查看保留的局部变量。

---

## 19. 与其他语言的对比

### 19.1 Python 生成器

```python
# Python
def gen():
    yield 1
    yield 2

# 委托
def outer():
    yield from gen()
    yield 3
```

与 JS 的差异:
- Python 用 `yield from`,JS 用 `yield*`
- Python 支持 `send()`(等价于 JS 的 next(v))
- Python 生成器是协程的子集,JS 同样
- Python 3.5+ 引入 async/await,与 JS 路径类似

### 19.2 C# 的 IEnumerator

```csharp
// C#
IEnumerable<int> Range(int start, int end) {
    for (int i = start; i < end; i++) yield return i;
}
```

与 JS 的差异:
- C# 用 `yield return`,JS 用 `yield`
- C# 用 `yield break` 终止,JS 用 `return`
- C# 不支持双向通信(send)
- C# 有原生 IEnumerator 接口

### 19.3 Lua 的协程

```lua
-- Lua
co = coroutine.create(function()
  coroutine.yield(1)
  coroutine.yield(2)
end)
coroutine.resume(co) -- true, 1
```

Lua 协程更接近完整协程,支持任意点切换。

### 19.4 Go 的 goroutine

```go
// Go
func gen(out chan<- int) {
    for i := 0; ; i++ {
        out <- i
    }
}
```

Go 的 channel + goroutine 是对称协程模型,支持并发执行。

### 19.5 对比表

| 语言       | 语法                  | 双向通信 | 委托      | 异步原生     | 完整协程 |
| ---------- | --------------------- | -------- | --------- | ------------ | -------- |
| JavaScript | function* / yield     | 是       | yield*    | async gen    | 否       |
| Python     | def / yield           | send()   | yield from| async def    | 否       |
| C#         | yield return          | 否       | (无)      | async(独立) | 否       |
| Lua        | coroutine.yield       | 是       | (无)      | (无)         | 是       |
| Go         | <- / go               | 是       | (无)      | 原生         | 是       |

---

## 20. 与 ECMA 规范的映射

### 20.1 关键规范章节

| 主题                | 规范章节              |
| ------------------- | --------------------- |
| GeneratorFunction   | ECMA-262 §27.3        |
| Generator Objects   | ECMA-262 §27.5        |
| Generator.prototype.next  | ECMA-262 §27.5.1.1  |
| Generator.prototype.return | ECMA-262 §27.5.1.2 |
| Generator.prototype.throw | ECMA-262 §27.5.1.3  |
| yield 表达式        | ECMA-262 §14.4        |
| yield* 表达式       | ECMA-262 §14.4.14     |
| AsyncGeneratorFunction | ECMA-262 §27.6     |
| for await...of      | ECMA-262 §14.7.5.4    |

### 20.2 规范伪代码解读

`GeneratorResume(generator, value, brand)` 的核心步骤(简化):

1. 验证 generator 的内部状态为 suspendedYield 或 suspendedStart
2. 将状态置为 executing
3. 恢复执行上下文(generatorContext)
4. 将 value 作为上一个 yield 的结果
5. 执行到下一个 yield、return 或异常
6. 根据结果构造 IteratorResult
7. 将状态置为 suspendedYield 或 completed
8. 切换回调用者的执行上下文
9. 返回 IteratorResult

### 20.3 TC39 提案历程

- ES6 (2015):生成器、Symbol.iterator
- ES2018:异步迭代(async function*)
- ES2024:Iterator Helpers(map/filter/take)
- 提案中:Iterator.range()、Disposable

---

## 21. 安全考虑

### 21.1 拒绝服务:无限生成器

```javascript
// 恶意代码:无限产出消耗内存
function* bomb() {
  let n = 0;
  while (true) yield Buffer.alloc(1024).fill(n++);
}

// 防御:限制最大迭代次数
function* limit(iter, max) {
  let n = 0;
  for (const v of iter) {
    if (n++ >= max) throw new Error('Iteration limit exceeded');
    yield v;
  }
}
```

### 21.2 跨域生成器

```javascript
// 不同 realm 的生成器可能不通过 instanceof 检查
const iframe = document.createElement('iframe');
document.body.appendChild(iframe);
const otherGen = new iframe.contentWindow.Function('function* g(){yield 1} return g')();

const g = otherGen();
g instanceof Generator; // false(不同 realm)
// 但仍可通过 duck typing 验证
```

### 21.3 序列化问题

```javascript
function* gen() { yield 1; }
const g = gen();

JSON.stringify(g); // "{}"(Generator 对象无可枚举属性)

// 反序列化需自定义逻辑
```

---

## 22. 学习路径与练习建议

### 22.1 渐进式学习

1. **第一周**:基础语法、yield/next、迭代协议
2. **第二周**:yield* 委托、双向通信、生成器方法
3. **第三周**:异步生成器、for await...of
4. **第四周**:co 库、自定义执行器、CSP
5. **第五周**:实际项目(如实现简化版 Redux Saga)

### 22.3 阅读顺序建议

1. MDN:Function*, Iteration protocols
2. Axel Rauschmayer《Exploring ES6》第 18 章
3. ECMA-262 §27.3-27.5
4. Redux Saga 文档
5. Koa 1.x 源码
6. co 源码(约 200 行)

---

### 填空题知识点讲解

**习题 1**(remember):调用生成器函数返回的对象遵循 ______ 协议,可以被 `for...of` 消费是因为它同时实现了 ______ 协议。

**习题 2**(understand):`yield*` 表达式的值是 ______ 的返回值。

**习题 3**(remember):异步生成器的 `next()` 返回一个 ______ 对象,其 `value` 属性是 `{ value, done }` 结构。

### 23.3 代码修复题

**习题 6**(apply):以下代码意图输出斐波那契数列前 10 项,但有错误。请修复。

```javascript
function* fib() {
  let a = 0, b = 1;
  while (true) {
    return a;
    [a, b] = [b, a + b];
  }
}

for (const n of fib().take(10)) {
  console.log(n);
}
```

**习题 7**(analyze):以下异步生成器在循环到一半时被取消,但资源未被释放。请修复。

```javascript
async function* readFile(path) {
  const fd = await fs.open(path, 'r');
  while (true) {
    const { bytesRead, buffer } = await fd.read();
    if (bytesRead === 0) return;
    yield buffer;
  }
  await fd.close();  // 永远不会执行
}
```

### 23.4 开放题

**习题 8**(create):设计一个基于生成器的"任务调度器",支持:
- 任务的 yield 让出 CPU
- 优先级调度
- 协作式取消
- 错误传播

请给出架构设计与关键代码。

**习题 9**(evaluate):评估在 React Native 项目中使用生成器管理副作用(类似 Redux Saga)的优劣,与 hooks + async/await 方案对比。

**习题 10**(create):实现一个 `composeGenerators(...gens)` 函数,将多个生成器组合成一个,前一个生成器的输出作为后一个的输入,类似 Unix 管道。

### 24.1 书籍

- **Axel Rauschmayer**《Exploring ES6》第 17-18 章(Generators and Iterators)
- **Nicholas C. Zakas**《Understanding ECMAScript 6》第 8 章
- **Kyle Simpson**《You Don't Know JS: Async & Performance》第 4 章
- **David Flanagan**《JavaScript: The Definitive Guide》第 12 章
- **Marijn Haverbeke**《Eloquent JavaScript》第 6 章(高阶函数中提及迭代器)

### 24.2 论文

- **Conway, M. E.** (1958). "Design of a separable transition-diagram compiler". *Communications of the ACM*. DOI:10.1145/368893.368928 — 协程概念首次正式提出
- **Marlin, C. D.** (1980). "Coroutines: A Programming Methodology, a Language Design and an Implementation". *LNCS 95*. Springer.
- **Haynes, C. T.** (1984). "Continuations and Coroutines". *LFP '84*. DOI:10.1145/800055.802038 — 续延与协程的关系
- **Anton, K., & Ostermann, K.** (2014). "Coroutines in JavaScript". *GPCE '14*. DOI:10.1145/2658761.2658771
- **Sumii, E., & Shivers, O.** (2004). "A Universal Unwinding Operator". DOI:10.1023/B:LISP.0000032413.90449.8c

### 24.3 开源项目

- [co](https://github.com/tj/co):TJ Holowaychuk 的生成器执行器
- [redux-saga](https://github.com/redux-saga/redux-saga):基于生成器的副作用管理
- [koa](https://github.com/koajs/koa):早期使用生成器中间件
- [js-csp](https://github.com/ubolonton/js-csp):CSP 风格的并发原语
- [iterare](https://github.com/felixfbecker/iterare):迭代器工具库

### 24.4 规范与提案

- [ECMA-262 §27.3-27.6](https://tc39.es/ecma262/#sec-generator-objects)
- [TC39 Async Iteration Proposal](https://github.com/tc39/proposal-async-iteration)
- [TC39 Iterator Helpers Proposal](https://github.com/tc39/proposal-iterator-helpers)
- [MDN: Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
- [MDN: function*](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)

### 24.5 进阶主题

- 代数效应与生成器的关系(React 内部使用)
- Scheme call/cc 与生成器的语义对比
- async/await 在 V8 中的字节码实现
- 异步钩子(AsyncHooks)与异步生成器
- Web Streams API 与异步生成器的互操作

---

## 25. 附录

### 25.1 术语表

| 术语                | 解释                                                     |
| ------------------- | -------------------------------------------------------- |
| 协程                | 可暂停的子程序,支持多入口点                             |
| 半协程              | 只能返回到调用者的协程(JS Generator 属于此类)           |
| 续延                | 程序执行的"剩余部分",作为一等公民                       |
| 迭代器              | 实现 next() 方法的对象                                   |
| 可迭代对象          | 实现 [Symbol.iterator]() 的对象                          |
| 异步迭代器          | next() 返回 Promise 的迭代器                             |
| 惰性求值            | 按需计算而非预先计算                                     |
| 背压                | 消费者无法跟上生产者速度时的反馈机制                     |
| CPS                 | Continuation-Passing Style,续延传递风格                  |
| Thunk               | 延迟计算的函数,常作为协程的 yieldable                   |

### 25.2 速查表

```javascript
// 声明
function* gen() { /* ... */ }
const gen = function* () { /* ... */ };
const obj = { *method() { /* ... */ } };
class C { *method() { /* ... */ } }

// 关键字
yield value;           // 暂停并产出
yield* iterable;       // 委托
const v = yield x;     // 接收 next(value)

// 方法
g.next(value);         // 恢复,返回 { value, done }
g.return(value);       // 终止
g.throw(error);        // 抛出

// 消费
for (const v of gen()) { /* ... */ }
const arr = [...gen()];
const [a, b] = gen();

// 异步
async function* agen() { yield await p; }
for await (const v of agen()) { /* ... */ }
```

### 25.3 常见模式速查

```javascript
// 1. 无限序列
function* naturals(n = 0) { while (true) yield n++; }

// 2. 分页拉取
async function* paginate(fn) {
  let page = 1;
  while (true) {
    const r = await fn(page++);
    if (!r.items.length) return;
    yield* r.items;
    if (!r.hasNext) return;
  }
}

// 3. 状态机
function* stateMachine() {
  while (true) {
    yield 'A';
    yield 'B';
  }
}

// 4. 资源管理
function* withResource(acquire, release) {
  const r = acquire();
  try { yield r; } finally { release(r); }
}

// 5. 管道
function* pipe(source, ...fns) {
  let iter = source;
  for (const fn of fns) iter = fn(iter);
  yield* iter;
}
```

### 25.4 性能对比基准

| 场景              | for 循环 | Generator | AsyncGenerator | 数组方法 |
| ----------------- | -------- | --------- | -------------- | -------- |
| 1M 累加           | 3ms      | 25ms      | 200ms          | 30ms     |
| 100K 过滤+映射    | 5ms      | 30ms      | 250ms          | 15ms     |
| 10K I/O 异步      | N/A      | N/A       | 500ms          | N/A      |
| 无限序列(取 100) | N/A      | 0.1ms     | 5ms            | N/A      |

注:数据基于 V8 8.x 在 Node.js 14 上的典型表现,实际结果因环境而异。

## 生成器函数声明

**基本写法：生成器函数声明**
`function* <函数名>() { }`
```javascript
// 声明生成器函数
function* generator() {
}
```

---

**基本写法：生成器函数表达式**
`let <变量> = function*() { };`
```javascript
// 生成器函数表达式
let gen = function*() {
};
```

---

**基本写法：对象方法生成器**
`let <对象> = { *<方法名>() { } };`
```javascript
// 对象中的生成器方法
let obj = {
    *generator() {
    }
};
```

---

**基本写法：类方法生成器**
`class <类> { *<方法名>() { } }`
```javascript
// 类中的生成器方法
class Range {
    *iterator() {
    }
}
```

---

## yield 表达式

**基本写法：yield 单个值**
`yield <值>;`
```javascript
// 产出单个值
function* gen() {
    yield 1;
    yield 2;
}
```

---

**基本写法：yield 多个值**
`yield <值1>; yield <值2>;`
```javascript
// 产出多个值
function* gen() {
    yield "a";
    yield "b";
    yield "c";
}
```

---

**基本写法：yield 表达式**
`yield <表达式>;`
```javascript
// yield 表达式结果
function* gen() {
    yield 1 + 2;
}
```

---

**基本写法：yield 变量**
`yield <变量>;`
```javascript
// yield 变量值
function* gen() {
    let value = getValue();
    yield value;
}
```

---

## 生成器迭代

**基本写法：创建迭代器**
`let <迭代器> = <生成器函数>();`
```javascript
// 调用生成器函数创建迭代器
let it = generator();
```

---

**基本写法：next 方法**
`<迭代器>.next()`
```javascript
// 获取下一个 yield 的值
let result = it.next();
```

---

**基本写法：next 返回值**
`<迭代器>.next().value`
```javascript
// 获取 yield 产出的值
let value = it.next().value;
```

---

**基本写法：next done 检查**
`<迭代器>.next().done`
```javascript
// 检查迭代是否完成
let done = it.next().done;
```

---

**基本写法：for-of 遍历生成器**
`for (let <值> of <生成器>()) { }`
```javascript
// 使用 for-of 遍历生成器
for (let value of generator()) {
}
```

---

## yield 委托

**基本写法：yield 委托**
`yield* <可迭代对象>;`
```javascript
// 委托给另一个可迭代对象
function* gen() {
    yield* [1, 2, 3];
}
```

---

**基本写法：委托给另一个生成器**
`yield* <生成器函数>();`
```javascript
// 委托给另一个生成器函数
function* inner() {
    yield 1;
    yield 2;
}
function* outer() {
    yield* inner();
    yield 3;
}
```

---

**基本写法：委托返回值**
`let <结果> = yield* <生成器>();`
```javascript
// 获取委托生成器的返回值
function* inner() {
    yield 1;
    return "done";
}
function* outer() {
    let result = yield* inner();
}
```

---

## 生成器传值

**基本写法：next 传值**
`<迭代器>.next(<值>)`
```javascript
// 向生成器内部传递值
function* gen() {
    let input = yield;
}
let it = gen();
it.next();
it.next(42);
```

---

**基本写法：yield 接收值**
`let <变量> = yield <值>;`
```javascript
// yield 表达式接收外部传入的值
function* gen() {
    let received = yield "first";
}
```

---

## return 语句

**基本写法：生成器 return**
`return <值>;`
```javascript
// 生成器中 return 终止迭代
function* gen() {
    yield 1;
    return "finished";
    yield 2;
}
```

---

**基本写法：return 方法**
`<迭代器>.return(<值>)`
```javascript
// 提前终止生成器
let it = gen();
it.return("terminated");
```

---

## throw 方法

**基本写法：throw 注入错误**
`<迭代器>.throw(new Error("<消息>"))`
```javascript
// 向生成器内部抛出错误
let it = gen();
it.next();
it.throw(new Error("Error"));
```

---

**基本写法：生成器捕获错误**
`try { yield <值>; } catch (<错误>) { }`
```javascript
// 生成器内部捕获 throw 注入的错误
function* gen() {
    try {
        yield 1;
    } catch (error) {
    }
}
```

---

## 无限生成器

**基本写法：无限序列**
`while (true) { yield <值>; }`
```javascript
// 生成无限序列
function* counter() {
    let i = 0;
    while (true) {
        yield i++;
    }
}
```

---

**基本写法：斐波那契生成器**
`function* <函数>() { while (true) { yield <值>; } }`
```javascript
// 生成斐波那契数列
function* fibonacci() {
    let [a, b] = [0, 1];
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}
```

---

## 生成器应用

**基本写法：ID 生成器**
`function* <函数>() { let <变量> = <初始值>; while (true) { yield <变量>++; } }`
```javascript
// 生成唯一 ID
function* idGenerator() {
    let id = 1;
    while (true) {
        yield id++;
    }
}
```

---

**基本写法：状态机**
`function* <函数>() { while (true) { yield <状态1>; yield <状态2>; } }`
```javascript
// 生成器实现状态机
function* stateMachine() {
    while (true) {
        yield "ON";
        yield "OFF";
    }
}
```

---

**基本写法：惰性计算**
`function* <函数>(<数组>) { for (let <项> of <数组>) { yield <处理>(<项>); } }`
```javascript
// 惰性处理数据
function* process(items) {
    for (let item of items) {
        yield transform(item);
    }
}
```

---

## 异步生成器

**基本写法：异步生成器函数**
`async function* <函数名>() { }`
```javascript
// 声明异步生成器函数
async function* asyncGen() {
}
```

---

**基本写法：yield 异步值**
`yield await <Promise>;`
```javascript
// 异步生成器产出 Promise 结果
async function* fetchItems() {
    let data = await fetch("url");
    yield data;
}
```

---

**基本写法：for-await-of 遍历**
`for await (let <值> of <异步生成器>) { }`
```javascript
// 使用 for-await-of 遍历异步生成器
for await (let item of asyncGen()) {
}
```

---

**基本写法：异步生成器 next**
`await <异步迭代器>.next()`
```javascript
// 等待异步生成器下一个值
let it = asyncGen();
let result = await it.next();
```
