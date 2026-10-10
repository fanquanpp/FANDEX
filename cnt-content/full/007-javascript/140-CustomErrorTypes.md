---
order: 160
title: 自定义错误类型：让上层分得清"哪里错了、为什么错"
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 以「接口报错只有一句 Request failed，分不清超时还是没登录」为主线，讲透七种内置错误的诊断含义、class extends Error 标准写法、cause 错误链与 AggregateError 批量失败，附 JSON.stringify 吞错误信息、堆栈还原等工程实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'javascript/480-ErrorBoundaryGlobalErrorCatch'
  - 'javascript/440-FetchApiAndAbortController'
  - 'javascript/270-PromiseStaticMethod'
  - 'javascript/260-PromiseConstructorDeepDive'
prerequisites: []
---

## 前置知识

- 会写函数与对象（080 篇水平），见过 `try { } catch (e) { }` 的基本形状即可；
- 用过 `fetch` 或 `console.log` 调过接口更好，没有也不影响跟读。

错误处理不需要理论基础，需要的是一次"报错只有一句话、啥也查不出来"的痛。本文从这次痛出发。

## 学习目标

读完本文你将能够：

1. 看到 TypeError、RangeError、ReferenceError 等内置报错时，立刻说出"语言在告诉我哪类事出了问题"；
2. 用 `class extends Error` 写出带类型与业务码的自定义错误，并用 `instanceof` 精确分流处理；
3. 用 `cause` 把底层错误串成链条，上层报错时保留"最初是谁炸的"；
4. 用 `AggregateError` 表达"一批操作里若干个失败"，覆盖 Promise.any 全败与表单批量校验两个场景；
5. 避开三个工程陷阱：JSON 序列化吞错误信息、堆栈只在边界记一次、生产环境压缩后堆栈不可读。

预计 45 到 65 分钟，含 3 个动手实验与 4 道练习。

## 1. 你现在要解决什么问题

文档站的搜索页要调后端接口，你写了这样一个封装：

```javascript
async function searchDocs(keyword) {
  const res = await fetch(`/api/search?q=${keyword}`);
  if (!res.ok) {
    throw new Error('Request failed');
  }
  return res.json();
}
```

上线后用户反馈"搜不出来"，你只拿到控制台一行 `Error: Request failed`。可"失败"至少有三种完全不同的病因：没登录（401，该跳登录页）、没权限（403，该提示申请权限）、服务过载（429，该提示稍后再试）。**三种病因需要三种完全不同的用户提示与处理动作，而它们此刻共用一句 "Request failed"。**

更糟的是链路变长之后。搜索接口挂了，可能是网关超时；网关超时的背后，可能是数据库连接池耗尽。你在外层 catch 到的错误，和最初炸掉的那个错误，中间隔了几层——如果不把"最初是谁炸的"一路带上来，排查就是盲人摸象。

这两件事——**错误要分类型、错因要能追溯**——就是本文要建立的两套能力。

## 2. 先不要看解释，先试试看

先认识语言自带的"错误分类学"。控制台逐行触发，观察报错名字：

```javascript
null.foo;              // TypeError：对 null/undefined 取属性
new Array(-1);         // RangeError：数值超出合法范围
noSuchVariable;        // ReferenceError：变量没声明过
JSON.parse('{bad}');   // SyntaxError：文本解析不出合法结构
decodeURIComponent('%');  // URIError：URI 编码非法
```

这五种名字不是随机起的，每个都指向一类明确的病因，读报错先读名字：

| 错误名 | 语言在告诉你 | 高频真实场景 |
| --- | --- | --- |
| TypeError | "对错误的类型做了错误的操作" | undefined 取属性、把非函数当函数调用、循环引用的 JSON 序列化 |
| ReferenceError | "这个名字根本不存在" | 变量名打错、在块级作用域外用 let 变量 |
| RangeError | "值本身合法但超出允许范围" | `new Array(-1)`、递归爆栈（Maximum call stack size exceeded） |
| SyntaxError | "文本/代码不符合语法" | JSON.parse 坏数据、eval 坏代码（源码写错在编译期就报，抓不到） |
| URIError | "URI 编解码遇到非法序列" | decodeURIComponent 收到裸 `%` |
| AggregateError | "一批操作，若干个失败了" | Promise.any 全军覆没（ES2021） |
| InternalError 等引擎私有 | 引擎内部问题 | 不用背，遇到了按字面排查 |

**内置类型是"语言的诊断结论"，自定义错误是"业务的诊断结论"**——你现在要做的，就是给业务也配一套这样的分类学。动手验证分流：

```javascript
class TimeoutError extends Error {}
class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AuthError';
    this.code = code;          // 401 / 403
  }
}

try {
  throw new AuthError('登录已过期', 401);
} catch (e) {
  if (e instanceof AuthError) {
    console.log('跳登录页，业务码：', e.code);
  } else if (e instanceof TimeoutError) {
    console.log('提示稍后重试');
  } else {
    console.log('兜底：记录并上报');
  }
}
```

`instanceof` 分流成立的前提是"抛出来的东西带类型"——这就是自定义错误类型的全部动机。

## 3. 心智模型：错误对象的三件套与层级设计

一个合格的错误对象至少携带三样东西：`name`（是什么类型的错）、`message`（一句话人话描述）、`stack`（在哪一层炸的）。自定义错误的现代标准写法：

```javascript
class ApiError extends Error {
  constructor(message, options = {}) {
    super(message, options);       // options.cause 交给基类，下一节展开
    this.name = 'ApiError';
    this.code = options.code;      // 业务码，如 401、429
    this.url = options.url;
  }
}

class NotFoundError extends ApiError {}     // 业务层级：继承自 ApiError

const e = new NotFoundError('文档不存在', { code: 404, url: '/api/docs/99' });
console.log(e instanceof NotFoundError);    // true
console.log(e instanceof ApiError);         // true
console.log(e instanceof Error);            // true —— 整条 is-a 链都成立
```

`instanceof` 沿着这条链匹配，所以 catch 处可以**按"从具体到一般"的顺序分流**：先判最具体的，再判大类，最后兜底。层级设计的实用原则：两到三层就够（基类 + 按病因的子类），别为每种业务情况都开一个类——分类的粒度应该等于"处理动作不同的粒度"：跳登录、提示重试、静默降级，各开一类；同类处理动作的错误共用一个类，靠 `code` 字段区分即可。

顺带认识一个老代码里的形状：ES5 时代没有 class，继承 Error 靠函数式写法，且有著名的原型链断裂 bug，需要一句 `Object.setPrototypeOf(this, NewError.prototype)` 补救。2026 年写新代码一律 `class extends Error`，但读老库时要知道那句 setPrototypeOf 是在补什么。

## 4. cause 错误链：把"最初炸的"一路带上层

ES2022 给 Error 加了 `cause`：抛新错误时把旧错误挂进去，链条就从"单点"变成"可以回溯的路径"：

```javascript
async function loadDocs() {
  try {
    const res = await fetch('/api/docs');
    if (!res.ok) throw new ApiError(`接口 ${res.status}`, { code: res.status });
    return await res.json();
  } catch (err) {
    throw new Error('文档列表加载失败', { cause: err });   // 底层错误原样挂载
  }
}

try {
  await loadDocs();
} catch (err) {
  console.log(err.message);        // 文档列表加载失败（给用户看的）
  console.log(err.cause);          // ApiError: 接口 500（给排查的人看的）
  console.log(err.cause?.cause);   // 再往深挖（若还有一层）
}
```

两条使用纪律：

1. **包装是加语境，不是消灭信息**。每次 wrap 都在 cause 里保留原错误，`err.cause?.cause?.cause` 可以一直挖到源头；加了语境却丢掉原错误（`throw new Error('失败')` 不带 cause），排查时信息反而变少；
2. **别层层无脑包装**。包装一次该加上下文的地方即可，链上每个 cause 都该回答一个新问题（"哪一层""什么操作"），只是换个措辞重抄一遍 message 的包装没有价值。

配一个小工具按需打印整条链：

```javascript
function errorChain(err) {
  const chain = [];
  let cur = err;
  while (cur) {
    chain.push(`${cur.name}: ${cur.message}`);
    cur = cur.cause;
  }
  return chain.join('\n  <- 由\n  ');
}
```

## 5. AggregateError：一批操作里"谁失败了"要一起报

另一类需求是批量：表单一次校验五个字段，不该"发现第一个错就返回"，而是**把所有错误攒一起报**；搜索同时查三个数据源，不该一个挂全挂。ES2021 的 `AggregateError` 就是干这个的：

```javascript
class ValidationError extends AggregateError {
  constructor(errors) {
    super(errors, '表单校验未通过');
    this.name = 'ValidationError';
  }
}

function validateForm(form) {
  const errors = [];
  if (!form.title?.trim()) errors.push(new Error('标题不能为空'));
  if (!form.tags?.length) errors.push(new Error('至少一个标签'));
  if (form.words < 0) errors.push(new Error('字数不能为负'));
  if (errors.length > 0) throw new ValidationError(errors);
}

try {
  validateForm({ words: -1 });
} catch (e) {
  if (e instanceof AggregateError) {
    for (const err of e.errors) console.log('字段错误：', err.message);
    // 字段错误：标题不能为空
    // 字段错误：至少一个标签
    // 字段错误：字数不能为负
  }
}
```

关键在 `errors` 数组：**聚合错误携带的是"错误清单"而不是一句总述**。它与 `Promise.any` 是原生搭档——any 只要有一个人成功就返回，全败时抛出的正是 AggregateError：

```javascript
const sources = [
  fetch('/api/search/local?q=js'),
  fetch('/api/search/remote?q=js'),
];

try {
  const fastest = await Promise.any(sources);
} catch (e) {
  console.log(e instanceof AggregateError);   // true：三个源全失败
  for (const err of e.errors) console.log(err.message);
}
```

## 6. 三个工程陷阱

**陷阱一：JSON 序列化吞掉错误信息。**

```javascript
const err = new Error('接口超时');
console.log(JSON.stringify(err));      // {} —— 全没了
```

症状：把错误对象塞进日志接口或 localStorage，读出来是空对象。原因：`message` 与 `stack` 是不可枚举属性，JSON.stringify 只认可枚举的自有属性。修法：需要传输时显式挑字段：

```javascript
function serializeError(err) {
  return { name: err.name, message: err.message, stack: err.stack, cause: err.cause ? serializeError(err.cause) : undefined };
}
```

（补充一个正向事实：`structuredClone` 与 Web Workers 的 postMessage 可以原样克隆 Error 的 name 与 message，但自定义字段会丢——跨线程传错误同样要先序列化关键字段。）

**陷阱二：堆栈只在边界记一次。** 错误被 catch 后往往"转换成返回值"继续流转，沿途每层都 console.error 一遍，日志里同一事故出现五次却互相不知道。纪律：**catch 到不处理的错误必须重新抛出；决定"到此为止"的边界层（全局兜底、请求封装的最外层）才记录 stack 并上报**。全局兜底的完整方案（window.onerror、unhandledrejection）在 [全局错误捕获](/javascript/480-ErrorBoundaryGlobalErrorCatch) 专篇展开。

**陷阱三：生产环境堆栈不可读。** 上线代码经过压缩混淆，stack 里是 `a.b@chunk-3f2.js:1:88412` 这样的天书。解法是构建时生成 source map 并上传到错误监控平台（Sentry 类工具的标配流程），崩溃时自动还原成源码行号。要做的两件事：构建配置里开 sourcemap、确认监控 SDK 接好了上传钩子；本地排查则可用 `Error.stackTraceLimit = 50` 放宽堆栈深度，看更完整的调用链。

## 7. 修改实验

以下每个先预测再运行。

实验一：把第 3 节 ApiError 的 `this.name = 'ApiError'` 删掉，运行 `new ApiError('x').name`，观察结果并解释。（提示：Error 基类的 name 默认是 'Error'；不覆盖 name，日志与监控的分组都会错。）

实验二：给第 5 节 validateForm 加"重复标题"校验，连续两个字段同时非法时验证 errors 数组顺序。（提示：错误清单的顺序就是校验代码的书写顺序，前端展示按此排序。）

实验三：用第 6 节 serializeError 处理一个带 cause 的错误，验证链条被完整序列化。（提示：递归已在函数里。）

## 8. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
class A extends Error {}
class B extends A {}
const e = new B('x');
console.log(e instanceof B, e instanceof A, e instanceof Error);
console.log(e.name);
```

答案：`true true true` 与 `'Error'`——instanceof 沿原型链全成立，而 name 没显式设置时继承的是基类默认值 'Error'（这就是实验一的铺垫）。

修改题（10 分钟）：给 ApiError 加静态方法 `isRetryable(err)`：429 与 5xx 的错误返回 true（可重试），其余 false。验收：`ApiError.isRetryable(new ApiError('x', { code: 429 }))` 为 true，401 为 false。

修 Bug 题（15 分钟）：下面的重试逻辑有 bug，真实症状是：任何错误（包括 401 未登录）都被无脑重试三次，用户等了九秒才看到登录提示。用 instanceof 分流修复：

```javascript
async function withRetry(fn) {
  for (let i = 0; i < 3; i += 1) {
    try {
      return await fn();
    } catch (e) {
      console.log('重试中...', i + 1);
    }
  }
  throw new Error('重试耗尽');
}
```

提示：两处问题——catch 里不区分错误类型全部吞掉；且最后一次失败也会白等。修法：`if (e instanceof ApiError && !ApiError.isRetryable(e)) throw e;` 放在循环开头判断，非可重试错误立即上抛。

挑战题（40 分钟，脱离示例）：实现 `runAll(tasks)`：并发执行一组返回 Promise 的任务函数，**等全部结束**后——全成功返回结果数组；有失败抛 ValidationError（AggregateError 子类），errors 按任务顺序排列。验收：

```javascript
const tasks = [
  () => Promise.resolve('a'),
  () => Promise.reject(new Error('b 挂了')),
  () => Promise.resolve('c'),
];

try {
  await runAll(tasks);
} catch (e) {
  console.log(e.errors.length);          // 1
  console.log(e.errors[0].message);      // b 挂了
}
```

提示（思路方向）：`Promise.allSettled` 逐个检查 status；注意 Promise.all 与它的差异（一个 fail-fast 一个等全部）——这个对比在 [Promise 静态方法](/javascript/270-PromiseStaticMethod) 有完整展开。展开（关键 API）：Promise.allSettled、AggregateError、super 调用。

## 9. 与之前和之后的知识的关系

- 往前：本文大量用到的 instanceof 与原型链判断，原理在 [原型链与 class 本质](/javascript/190-PrototypeChainClassEssence)；错误对象"三件套"的堆栈，与 [递归与尾调用](/javascript/160-RecursionTailCallOptimization) 的调用栈是同一座山；
- 往后：[Fetch 与 AbortController](/javascript/440-FetchApiAndAbortController) 把 ApiError 层级落到真实的请求取消场景；[Promise 构造器深潜](/javascript/260-PromiseConstructorDeepDive) 讲清"reject 的是什么、异常怎么流转"；[全局错误捕获](/javascript/480-ErrorBoundaryGlobalErrorCatch) 承接本文"边界兜底"的最后一块拼图。

## 10. 官方文档

- MDN Error：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Error
- MDN Error cause：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
- MDN AggregateError：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
- MDN 控制台 stackTraceLimit：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Error/stackTraceLimit

## 自我检查

- 能给 TypeError、ReferenceError、RangeError、SyntaxError 各举一个亲手触发过的例子，并说出读报错先读名字的习惯；
- 能徒手写出带 name、code 与 cause 的 class extends Error，并说明 instanceof 分流的"从具体到一般"顺序；
- 能解释 wrap 错误时为什么必须传 cause，以及"层层无脑包装"的反面案例；
- 能说出 JSON.stringify 丢错误信息的原因（不可枚举）与 serializeError 的字段清单；
- 能复述"堆栈只在边界记一次"的纪律与生产 source map 还原的流程。

## 本章总结

内置错误的 name 是语言的诊断结论，业务错误的类型是业务的诊断结论：class extends Error 配上 name 与 code，让 catch 处能用 instanceof 从具体到一般地分流。cause 把底层错误串成可回溯的链条，包装只加语境、不灭信息。AggregateError 携带错误清单，承接 Promise.any 全败与批量校验。三个工程纪律：错误传输要显式序列化（JSON 会吞不可枚举字段）、堆栈只在决策边界记录、生产堆栈靠 source map 还原。错误分类的粒度等于处理动作的粒度，不是业务情况的粒度。

## 下一步

进入 [高阶函数](/javascript/150-HigherOrderFunction)：错误体系管"出事了怎么说"，接下来两篇（高阶函数、递归）回到代码组织能力本身——函数怎么当值传递、结构怎么自己遍历自己。
