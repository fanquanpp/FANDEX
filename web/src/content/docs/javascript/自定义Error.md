---
order: 60
title: 自定义Error
module: javascript
category: JavaScript
difficulty: intermediate
description: JavaScript 自定义错误类型体系——Error 子类化、Error Cause、AggregateError、堆栈追踪与生产级错误监控
author: fanquanpp
updated: '2026-07-20'
related:
  - javascript/Object扩展
  - javascript/事件循环
  - javascript/Promise构造器
  - javascript/Proxy与Reflect
  - javascript/网络请求API
prerequisites:
  - javascript/语法速查
tags:
  - Error
  - CustomError
  - ErrorCause
  - AggregateError
  - StackTrace
  - TC39
  - Sentry
  - ExceptionHandling
learningObjectives:
  - '列举 ECMAScript 内置错误类型体系（Error、TypeError、RangeError、SyntaxError、ReferenceError、URIError、EvalError）及各自触发场景'
  - '解释 ES6 类继承 Error 的原型链陷阱——为何必须 Object.setPrototypeOf(this, new.target.prototype) 才能保证 instanceof 正确工作'
  - '使用 ES2022 Error Cause 与 ES2021 AggregateError 构建可追溯的错误链与批量错误聚合'
  - '拆解 V8 堆栈追踪格式（CallSite 对象、stackTraceLimit、Error.captureStackTrace）与 SpiderMonkey/JavaScriptCore 实现差异'
  - '评估自定义错误层次设计——扁平式 vs 层次式——在大型项目可维护性、Sentry 分组、TypeScript 类型推导上的权衡'
  - '设计一个生产级错误监控 SDK，集成 window.onerror、unhandledrejection、Error Cause 链解析、Sentry 上报与采样降级策略'
exercises:
  - type: fill-blank
    bloom: remember
    question: "在 ES6 中继承 Error 类时，为了保证 `err instanceof MyError` 返回 true，必须在 constructor 中调用 ______ 重新设置原型；其根本原因是 ES5 的继承机制在 transpile 后会丢失 ______ 链。"
    answer: "Object.setPrototypeOf(this, new.target.prototype)；原型（prototype）"
  - type: choice
    bloom: analyze
    question: "下列代码的输出是？\n```javascript\nclass BaseError extends Error {}\nclass ChildError extends BaseError {}\nconst err = new ChildError('test');\nconsole.log(err instanceof ChildError);\nconsole.log(err instanceof BaseError);\nconsole.log(err instanceof Error);\nconsole.log(err.name);\n```"
    options:
      - "A. true true true 'ChildError'"
      - "B. true true true 'Error'"
      - "C. true false true 'ChildError'"
      - "D. true true false 'ChildError'"
    answer: "A"
    explanation: "正确实现 Object.setPrototypeOf 后 instanceof 链完整（ChildError -> BaseError -> Error）；name 属性若未在子类中显式设置，默认读取 this.constructor.name，即 'ChildError'。"
  - type: code-fix
    bloom: analyze
    question: |
      以下代码尝试构建错误链，但生产环境中无法通过 `err.cause` 拿到原始错误。请修复：
      ```javascript
      class AppError extends Error {
        constructor(message, cause) {
          super(message);
          this.cause = cause;
        }
      }
      try {
        JSON.parse('invalid');
      } catch (e) {
        throw new AppError('解析失败', e);
      }
      ```
    answer: |
      ```javascript
      class AppError extends Error {
        constructor(message, options = {}) {
          // 使用 ES2022 标准 cause 选项传入 super
          super(message, options);
          this.name = this.constructor.name;
          if (options.code) this.code = options.code;
          Object.setPrototypeOf(this, new.target.prototype);
        }
      }
      try {
        JSON.parse('invalid');
      } catch (e) {
        throw new AppError('解析失败', { cause: e, code: 'PARSE_ERROR' });
      }
      ```
      原代码问题：手动赋值 `this.cause` 在某些 polyfill 或老引擎下不会触发原生 Error 的 cause 内部槽位；正确做法是直接传 options 给 super()，由原生构造器写入 cause。
  - type: open-ended
    bloom: create
    question: "请设计一个生产级错误监控 SDK，要求：(1) 捕获同步异常与未处理的 Promise 拒绝；(2) 解析 Error Cause 链与 AggregateError.errors；(3) 集成 Sentry 或自建上报通道；(4) 支持采样率、用户脱敏、Source Map 还原；(5) 提供 React/Vue 错误边界集成。请描述架构、核心模块与数据流。"
    answer: "应包括：全局监听器层（window.onerror、window.onunhandledrejection、Error.captureStackTrace 包装）、错误标准化层（统一为 Event 对象，提取 name/message/stack/cause 链/errors 数组）、增强层（SourceMap 还原、设备指纹、用户上下文注入）、上报层（批量队列、指数退避重试、采样降级）、框架集成层（React ErrorBoundary、Vue app.config.errorHandler）、可观测层（自身 SDK 健康监控、错误风暴抑制）。"
references:
  - author: [ECMA International]
    title: "ECMAScript 2026 Language Specification - Error Objects"
    journal: "ECMA-262, 17th Edition"
    year: 2026
    url: "https://tc39.es/ecma262/#sec-error-objects"
  - author: [TC39]
    title: "Proposal: Error Cause"
    journal: "TC39 Proposals"
    year: 2022
    url: "https://github.com/tc39/proposal-error-cause"
  - author: [TC39]
    title: "Proposal: Promise.any (AggregateError)"
    journal: "TC39 Proposals"
    year: 2021
    url: "https://github.com/tc39/proposal-promise-any"
  - author: [V8 Team]
    title: "Stack traces in V8 - Collecting and displaying stack traces"
    journal: "V8 Developer Documentation"
    year: 2026
    url: "https://v8.dev/docs/stack-trace-api"
  - author: [Mozilla Developer Network]
    title: "Error reference and Control flow and error handling"
    journal: "MDN Web Docs"
    year: 2026
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error"
etymology:
  term: "Error"
  origin: "Error 作为 JavaScript 内置对象由 Brendan Eich 于 1995 年实现，借鉴 Java 的 java.lang.Throwable 体系但大幅简化——只保留 Error 与其子类，剔除受检异常（checked exception）概念。ES3（1999）正式标准化 6 个原生子类（EvalError、RangeError、ReferenceError、SyntaxError、TypeError、URIError）。ES6（2015）的类语法让自定义 Error 子类成为主流模式，但因 transpile 后原型链丢失引发 `instanceof` 失效陷阱。ES2021 引入 AggregateError 配合 Promise.any，ES2022 引入 Error Cause（由阿里巴巴 Hemanth HM 推进，TC39 历史上首个由中国公司主导的语言级提案）。"
lastReviewed: '2026-07-20'
reviewer: FANDEX Content Engineering Team
---

# 自定义 Error 与现代错误处理体系

## 0. 导言

错误处理是软件工程中最被低估的复杂度来源之一。一段看似简单的 `throw new Error('...')` 在生产环境中会衍生出一系列工程问题：

- 如何让上层调用者区分"网络超时"与"鉴权失败"？
- 如何在抛出业务错误时保留原始底层错误（如数据库连接错误）的堆栈？
- 如何在 `Promise.all` 部分失败时一次性聚合所有错误，而非丢失后面的错误信息？
- 如何让 Sentry 等监控系统能根据错误类型自动分组、降噪、关联用户上下文？
- 如何在压缩混淆后的生产 bundle 中还原真实源码位置？

JavaScript 从 1995 年的 `Error` 单一对象，到 ES3 的 6 个子类，再到 ES2021 的 `AggregateError`、ES2022 的 `Error Cause`，逐步建立起一套足以支撑大型生产应用的异常处理体系。本章将系统讲解这套体系的演进、形式化模型、工程实践与陷阱。

> **核心命题**：JavaScript 错误处理的演进史，是一部从"字符串消息"到"结构化错误对象"的进化史。`Error Cause` 让错误链成为一等公民，`AggregateError` 让批量失败可表达，自定义 `Error` 子类让业务领域能够精确描述故障语义——三者共同构成现代 JS 异常处理的"三驾马车"。

---

## 1. 学习目标与认知地图

完成本章后，学习者应能够：

1. **复述**（remember）ECMAScript 内置错误类型体系与各自触发场景。
2. **解释**（understand）ES6 继承 Error 的原型链陷阱及 `Object.setPrototypeOf` 的修复原理。
3. **应用**（apply）Error Cause 与 AggregateError 构建可追溯的错误链与批量错误聚合。
4. **分析**（analyze）V8 堆栈追踪格式与跨引擎实现差异。
5. **评估**（evaluate）自定义错误层次设计在大型项目中的可维护性权衡。
6. **设计**（create）一个生产级错误监控 SDK，集成全局监听、错误链解析与上报降级。

### 1.1 知识体系

```
自定义 Error 体系
├── 内置错误类型
│   ├── Error（根类）
│   ├── TypeError（类型错误）
│   ├── RangeError（范围错误）
│   ├── ReferenceError（引用错误）
│   ├── SyntaxError（语法错误）
│   ├── URIError（URI 处理错误）
│   ├── EvalError（已废弃，仅保留兼容）
│   └── AggregateError（ES2021 新增）
├── 自定义子类
│   ├── ES5 函数式继承
│   ├── ES6 class extends Error
│   ├── 原型链陷阱与 setPrototypeOf 修复
│   └── 层次化错误体系设计
├── 错误链（Error Cause）
│   ├── ES2022 cause 选项
│   ├── 错误链遍历与根因分析
│   └── 与 Java Throwable.getCause 对比
├── 聚合错误（AggregateError）
│   ├── Promise.any 失败语义
│   ├── errors 数组结构
│   └── 并发任务批量失败处理
├── 堆栈追踪
│   ├── V8 CallSite 结构
│   ├── Error.captureStackTrace
│   ├── Error.stackTraceLimit
│   ├── SpiderMonkey 与 JSC 实现
│   └── SourceMap 还原
├── 序列化
│   ├── JSON.stringify 的 toJSON
│   ├── 结构化克隆支持
│   └── 跨进程传输
└── 工程实践
    ├── 全局错误监听
    │   ├── window.onerror
    │   ├── window.onunhandledrejection
    │   └── React ErrorBoundary / Vue errorHandler
    ├── 错误监控（Sentry/Bugsnag）
    ├── 采样与降噪
    └── 安全脱敏
```

---

## 2. 历史动机与技术演进

### 2.1 JavaScript 错误处理的史前时代（1995-1999）

Brendan Eich 在 1995 年实现 JavaScript 1.0 时，错误处理极为原始：

```javascript
// JavaScript 1.0 时代：只能抛出字符串
function divide(a, b) {
  if (b === 0) {
    throw 'Division by zero';  // 字符串，无堆栈、无类型
  }
  return a / b;
}

try {
  divide(1, 0);
} catch (e) {
  // e 是字符串 'Division by zero'
  console.log(typeof e);  // 'string'
}
```

这种设计的缺陷显而易见：

| 缺陷 | 表现 | 影响 |
| --- | --- | --- |
| 无类型区分 | 所有错误都是字符串 | 无法按类型分支处理 |
| 无堆栈信息 | 抛出后无法定位源头 | 调试极困难 |
| 无结构化字段 | 不能附加 errorCode、statusCode | 业务集成受限 |
| `catch` 不能类型匹配 | 一个 catch 必须处理所有错误 | 错误处理代码冗长 |

### 2.2 ES3 标准化：Error 对象与子类（1999）

ES3 引入了 `Error` 对象与 6 个子类，奠定现代 JavaScript 错误处理基础：

| 子类 | 触发场景 | 示例 |
| --- | --- | --- |
| `Error` | 用户主动抛出 | `throw new Error('...')` |
| `TypeError` | 值类型不是期望类型 | `undefined.foo` |
| `RangeError` | 值不在合法范围 | `new Array(-1)` |
| `ReferenceError` | 引用不存在的变量 | `console.log(notDefined)` |
| `SyntaxError` | 代码语法错误 | `eval('if (true) {')` |
| `URIError` | URI 编解码错误 | `decodeURIComponent('%')` |
| `EvalError` | `eval()` 调用错误（已废弃） | 现代引擎不再抛出 |

每个 Error 对象包含两个核心属性：

- `name`：错误类型名（如 `'TypeError'`）
- `message`：错误描述字符串

非标准但事实通用的属性：

- `stack`：堆栈追踪字符串（V8、SpiderMonkey、JSC 各自实现）
- `fileName`、`lineNumber`、`columnNumber`（SpiderMonkey 专有）

### 2.3 ES5 时代：函数式继承（2009）

ES5 之前，自定义错误需手动操作原型链：

```javascript
// ES5 函数式继承
function AppError(message, code) {
  // 必须以构造函数形式调用
  Error.call(this, message);
  this.name = 'AppError';
  this.message = message;
  this.code = code || 'UNKNOWN';
  // 捕获堆栈（V8 专有）
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  }
}
// 手动建立原型链
AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

// 测试
const err = new AppError('操作失败', 'OP_FAILED');
console.log(err instanceof AppError);  // true
console.log(err instanceof Error);     // true
console.log(err.name);                 // 'AppError'
```

### 2.4 ES6 革命：class extends Error（2015）

ES6 引入 class 语法后，继承 Error 看起来更优雅，但隐藏陷阱：

```javascript
// 看似正确的 ES6 写法
class AppError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const err = new AppError('test', 'OP_FAILED');
console.log(err instanceof AppError);  // 期望 true，实际可能 false！
```

**陷阱根源**：Babel 等 transpiler 在编译 `class extends Error` 时，会调用 `Error.call(this, message)`，但内置 `Error` 构造器在 V8 中以 C++ 实现，`Error.call(this)` 不会正确设置 `this` 的原型。结果 `this.__proto__` 仍指向 `Error.prototype`，而非 `AppError.prototype`。

**修复方法**：在 constructor 末尾显式重置原型：

```javascript
class AppError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    // 关键修复：在 transpile 后环境中保证原型链正确
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

现代原生 ES6+ 环境（无 transpile）已无此问题，但作为兼容性最佳实践，仍建议保留 `Object.setPrototypeOf` 调用。

### 2.5 ES2021：AggregateError 与 Promise.any

ES2021 引入 `Promise.any`，与 `Promise.all` 的"全部成功才成功"不同，`Promise.any` 是"任意一个成功就成功，全部失败才失败"：

```javascript
// Promise.any 失败时抛出 AggregateError
const promises = [
  Promise.reject(new Error('A 失败')),
  Promise.reject(new Error('B 失败')),
  Promise.reject(new Error('C 失败')),
];

Promise.any(promises).catch((aggregateErr) => {
  console.log(aggregateErr instanceof AggregateError);  // true
  console.log(aggregateErr.errors.length);               // 3
  console.log(aggregateErr.errors[0].message);           // 'A 失败'
});
```

`AggregateError` 的设计动机：

| 场景 | 传统方案问题 | AggregateError 解决方案 |
| --- | --- | --- |
| 并发请求 N 个接口，全部失败时上报 | 只能拿到第一个 reject 的错误 | 聚合所有错误到 errors 数组 |
| 表单校验多个字段 | 需手动收集错误 | 一次性抛出全部校验失败 |
| 多源降级查询（CDN/缓存/主站） | 失败信息丢失 | 保留所有失败原因用于排查 |

### 2.6 ES2022：Error Cause

ES2022 引入 `cause` 选项，由阿里巴巴 Hemanth HM 主导推进，是 TC39 历史上首个由中国公司主导的语言级提案：

```javascript
// ES2022 Error Cause
try {
  const data = JSON.parse(jsonString);
} catch (e) {
  // 通过 cause 保留原始错误，便于根因分析
  throw new AppError('用户数据解析失败', { cause: e });
}

// 上层捕获时可遍历错误链
try {
  loadUser();
} catch (e) {
  let current = e;
  while (current) {
    console.log(current.message);
    current = current.cause;
  }
}
```

`cause` 的设计动机：

| 问题 | 传统方案 | Error Cause 方案 |
| --- | --- | --- |
| 包装错误时丢失原始堆栈 | `throw new Error('' + e.stack)` 字符串拼接 | cause 保留原始 Error 对象 |
| 根因分析困难 | 需手工拼接日志 | Sentry 等工具原生识别 cause 链 |
| 多层包装语义模糊 | 难以区分"包装层错误"与"原始错误" | cause 是结构化字段 |

### 2.7 TC39 提案时间线

| 时间 | 事件 | 影响 |
| --- | --- | --- |
| 1995-05 | Brendan Eich 实现 Error 对象 | 原始 throw/catch 机制 |
| 1999-12 | ES3 标准化 6 个 Error 子类 | 内置错误类型体系确立 |
| 2009-12 | ES5 引入严格模式与函数式继承模式 | 自定义错误类普及 |
| 2015-06 | ES6 class 语法 | 继承 Error 更简洁（但有原型链陷阱） |
| 2017-03 | AggregateError 进入 Stage 1 | Promise.any 提案同步推进 |
| 2019-06 | Error Cause 进入 Stage 1 | Hemanth HM 主导 |
| 2020-09 | AggregateError Stage 4 | 进入 ES2021 |
| 2021-11 | Error Cause Stage 4 | 进入 ES2022 |
| 2024-06 | Error.isError 提案（Stage 1） | 跨 realm 错误判定标准化 |
| 2026-01 | 主流浏览器全部支持 cause 与 AggregateError | 生产环境可用 |

> **学术溯源**：JavaScript 错误处理的设计深受 Java `java.lang.Throwable` 体系影响，但因 JavaScript 无受检异常（checked exception）概念，简化为只有"运行时异常"——所有错误都无需在函数签名声明，可在任意层级被捕获或冒泡。

---

## 3. 形式化定义

### 3.1 Error 对象的代数模型

形式化地，一个 Error 对象可表示为五元组：

$$
\text{Error} = \langle \text{name}, \text{message}, \text{stack}, \text{cause}, \text{properties} \rangle
$$

其中：

- `name`：字符串，错误类型名（如 `'TypeError'`）
- `message`：字符串，人类可读的错误描述
- `stack`：字符串，堆栈追踪（非标准但事实通用）
- `cause`：Error 对象或 `undefined`，错误链上游（ES2022）
- `properties`：附加业务字段（如 `code`、`statusCode`、`fields`）

### 3.2 错误链的形式化定义

`cause` 字段构成错误链，形式化为有向链表：

$$
\text{ErrorChain}(e) = [e, e.\text{cause}, e.\text{cause}.\text{cause}, \ldots, e_n]
$$

其中终止条件 $e_n.\text{cause} = \text{undefined}$。

错误链的根因（root cause）为链尾：

$$
\text{rootCause}(e) = \begin{cases}
e & \text{if } e.\text{cause} = \text{undefined} \\
\text{rootCause}(e.\text{cause}) & \text{otherwise}
\end{cases}
$$

### 3.3 AggregateError 的形式化定义

`AggregateError` 是 Error 的子类，额外包含 `errors` 数组：

$$
\text{AggregateError} = \langle \text{Error}, \text{errors}: [\text{Error}] \rangle
$$

其与 `Promise.any` 的语义关系：

$$
\text{Promise.any}([p_1, p_2, \ldots, p_n]) = \begin{cases}
\text{resolve}(v_i) & \text{if } \exists i: p_i \text{ resolves} \\
\text{reject}(\text{AggregateError}([e_1, e_2, \ldots, e_n])) & \text{if } \forall i: p_i \text{ rejects}
\end{cases}
$$

### 3.4 instanceof 的形式化语义

`x instanceof C` 沿原型链查找：

$$
x \text{ instanceof } C \iff \exists k \geq 0: \text{proto}^k(x) = C.\text{prototype}
$$

其中 $\text{proto}^0(x) = x.[\![\text{Prototype}]\!]$，$\text{proto}^k(x) = \text{proto}(\text{proto}^{k-1}(x))$。

这解释了为何 `Object.setPrototypeOf(this, new.target.prototype)` 是必要的——若原型链未正确建立，`instanceof` 会返回 `false`。

### 3.5 堆栈追踪的形式化表示

V8 堆栈追踪是 `CallSite` 对象序列的字符串化表示：

$$
\text{Stack} = \text{serialize}([\text{CallSite}_1, \text{CallSite}_2, \ldots, \text{CallSite}_n])
$$

每个 `CallSite` 包含：

$$
\text{CallSite} = \langle \text{fileName}, \text{lineNumber}, \text{columnNumber}, \text{functionName}, \text{typeName}, \text{isConstructor}, \text{isEval}, \text{isNative} \rangle
$$

`Error.captureStackTrace(target, constructorOpt)` 会在 `target.stack` 上写入从调用点开始到 `constructorOpt` 之前的所有 CallSite。

### 3.6 try/catch/finally 的执行语义

`try/catch/finally` 块的执行流程形式化为：

$$
\text{execute}(\text{try-block}) \to \begin{cases}
\text{return } v & \text{if no throw} \\
\text{execute}(\text{catch-block}, e) & \text{if throw } e
\end{cases}
$$

`finally` 块无论是否抛错都会执行，且其返回值或抛出的错误会覆盖 try/catch 的结果：

$$
\text{finally-result} = \begin{cases}
\text{finally-block result} & \text{if finally returns or throws} \\
\text{try/catch result} & \text{otherwise}
\end{cases}
$$

---

## 4. 内置 Error 类型详解

### 4.1 Error：根类

```javascript
// Error 构造器签名（ES2022+）
new Error(message)
new Error(message, options)  // options: { cause }

// 基本用法
const err = new Error('操作失败');
console.log(err.name);     // 'Error'
console.log(err.message);  // '操作失败'
console.log(err.stack);    // 'Error: 操作失败\n    at ...'

// ES2022 cause 选项
const wrapped = new Error('用户加载失败', { cause: new TypeError('Network response was undefined') });
console.log(wrapped.cause);  // TypeError: Network response was undefined
```

### 4.2 TypeError：类型错误

最常见的内置错误之一，当值不是期望类型时抛出：

```javascript
// 典型场景
undefined.foo;              // TypeError: Cannot read properties of undefined
null.toString();            // TypeError: Cannot read properties of null
(42).toUpperCase();         // TypeError: 42.toUpperCase is not a function
new Array(-1);              // 实际是 RangeError
Symbol() + '';              // TypeError: Cannot convert a Symbol value to a string
Object.defineProperty(1, 'x', {});  // TypeError: Object.defineProperty called on non-object
```

### 4.3 RangeError：范围错误

值不在合法范围内时抛出：

```javascript
new Array(-1);                       // RangeError: Invalid array length
new Array(2 ** 32);                  // RangeError: Invalid array length
'x'.repeat(Infinity);                // RangeError: Invalid count value
const arr = new Array(10);
arr.length = 2 ** 53;                // RangeError: Invalid array length
```

### 4.4 ReferenceError：引用错误

引用不存在的变量时抛出：

```javascript
console.log(notDefined);             // ReferenceError: notDefined is not defined
// 严格模式下对未声明变量赋值
'use strict';
undeclaredVar = 1;                   // ReferenceError: undeclaredVar is not defined
```

### 4.5 SyntaxError：语法错误

代码语法错误，通常在解析阶段抛出：

```javascript
eval('if (true) {');                 // SyntaxError: Unexpected end of input
JSON.parse('{invalid}');             // SyntaxError: Unexpected token i in JSON
new Function('} else {');            // SyntaxError: Unexpected token '}'
```

### 4.6 URIError：URI 处理错误

`decodeURIComponent` 等函数处理非法 URI 时抛出：

```javascript
decodeURIComponent('%');             // URIError: URI malformed
decodeURIComponent('%ZZ');           // URIError: URI malformed
```

### 4.7 AggregateError：聚合错误（ES2021）

```javascript
// 直接构造
const agg = new AggregateError(
  [new Error('A'), new Error('B'), new TypeError('C')],
  '批量操作失败'
);
console.log(agg.errors.length);      // 3
console.log(agg.errors[0].message);  // 'A'
console.log(agg.message);            // '批量操作失败'
console.log(agg.name);               // 'AggregateError'

// Promise.any 自动生成
async function fetchAll() {
  const result = await Promise.any([
    fetch('/api/primary').then(r => r.json()),
    fetch('/api/backup').then(r => r.json()),
    fetch('/api/cdn').then(r => r.json()),
  ]);
  return result;
}

// 全部失败时
try {
  await fetchAll();
} catch (aggErr) {
  console.log(aggErr instanceof AggregateError);  // true
  for (const e of aggErr.errors) {
    console.log(e.message);
  }
}
```

---

## 5. 自定义 Error 子类

### 5.1 ES6 标准写法

```javascript
/**
 * 应用错误基类
 * 所有业务错误都应继承此类，统一携带 code、statusCode、details 字段
 */
class AppError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = options.code || 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode || 500;
    this.details = options.details || null;
    this.timestamp = new Date().toISOString();
    // 关键：保证 instanceof 在 transpile 后仍正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * 转换为 JSON 可序列化对象
   * 注意：Error 默认不可枚举，JSON.stringify 不会输出 message/stack
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause instanceof Error ? serializeError(this.cause) : this.cause,
    };
  }
}

/**
 * 序列化 Error 为普通对象
 * @param {Error} err
 * @returns {object}
 */
function serializeError(err) {
  if (!(err instanceof Error)) return err;
  const obj = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
  if (err.cause) obj.cause = serializeError(err.cause);
  if (err.errors) obj.errors = err.errors.map(serializeError);
  return obj;
}
```

### 5.2 错误类型层次设计

层次化错误体系让上层调用者既能用基类捕获，又能精确分支：

```javascript
/**
 * 错误层次：
 *   AppError
 *   ├── NetworkError
 *   │   ├── TimeoutError
 *   │   ├── ConnectionError
 *   │   └── DNSError
 *   ├── ValidationError
 *   │   ├── FieldValidationError
 *   │   └── SchemaValidationError
 *   ├── AuthError
 *   │   ├── UnauthorizedError
 *   │   └── ForbiddenError
 *   └── BusinessError
 *       ├── NotFoundError
 *       └── ConflictError
 */
class NetworkError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'NETWORK_ERROR', statusCode: 503, ...options });
  }
}

class TimeoutError extends NetworkError {
  constructor(message, options = {}) {
    super(message, { code: 'TIMEOUT_ERROR', statusCode: 504, ...options });
  }
}

class ValidationError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, ...options });
    this.fields = options.fields || [];
  }
}

class AuthError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'AUTH_ERROR', statusCode: 401, ...options });
  }
}

class UnauthorizedError extends AuthError {
  constructor(message, options = {}) {
    super(message, { code: 'UNAUTHORIZED', statusCode: 401, ...options });
  }
}

// 使用：instanceof 链式判断
try {
  await apiCall();
} catch (e) {
  if (e instanceof TimeoutError) {
    // 超时，可重试
    retry();
  } else if (e instanceof NetworkError) {
    // 网络错误，提示用户检查网络
    showToast('网络异常，请稍后重试');
  } else if (e instanceof UnauthorizedError) {
    // 鉴权失败，跳转登录
    router.push('/login');
  } else if (e instanceof AppError) {
    // 其他业务错误
    showToast(e.message);
  } else {
    // 未知错误，上报 Sentry
    Sentry.captureException(e);
    showToast('系统异常');
  }
}
```

### 5.3 ES5 函数式继承（兼容老环境）

```javascript
/**
 * ES5 兼容写法
 * 在不支持 ES6 class 的环境（IE11 等）中使用
 */
function LegacyError(message, code) {
  // 必须以构造函数形式调用
  Error.call(this, message);
  this.name = 'LegacyError';
  this.message = message || '';
  this.code = code || 'UNKNOWN';
  // V8 专有：捕获堆栈，跳过本构造函数帧
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  }
}
// 建立原型链
LegacyError.prototype = Object.create(Error.prototype);
LegacyError.prototype.constructor = LegacyError;

// 添加方法
LegacyError.prototype.toString = function () {
  return this.name + ': ' + this.message + ' (code: ' + this.code + ')';
};

const err = new LegacyError('操作失败', 'OP_FAILED');
console.log(err instanceof LegacyError);  // true
console.log(err instanceof Error);        // true
console.log(err.toString());              // 'LegacyError: 操作失败 (code: OP_FAILED)'
```

---

## 6. Error Cause 错误链（ES2022）

### 6.1 基本用法

```javascript
// ES2022 标准 cause 选项
class ServiceError extends AppError {}

async function fetchUserProfile(userId) {
  try {
    const response = await fetch('/api/users/' + userId);
    if (!response.ok) {
      throw new ServiceError('HTTP ' + response.status, {
        code: 'HTTP_ERROR',
        statusCode: response.status,
      });
    }
    return await response.json();
  } catch (e) {
    // 关键：通过 cause 保留原始错误
    throw new ServiceError('加载用户 ' + userId + ' 失败', {
      code: 'USER_LOAD_FAILED',
      cause: e,
    });
  }
}

async function loadDashboard() {
  try {
    const user = await fetchUserProfile(123);
    return renderDashboard(user);
  } catch (e) {
    // e.cause 是 fetchUserProfile 内部抛出的原始错误
    console.log(e.message);       // '加载用户 123 失败'
    console.log(e.cause.message); // 'HTTP 500' 或 'Failed to fetch'
    // 上报时 Sentry 会自动识别 cause 链
    Sentry.captureException(e);
  }
}
```

### 6.2 错误链遍历工具

```javascript
/**
 * 错误链遍历器
 * 从当前错误开始，沿 cause 字段向下遍历
 */
class ErrorChainIterable {
  constructor(error) {
    this.error = error;
  }

  [Symbol.iterator]() {
    let current = this.error;
    return {
      next() {
        if (current) {
          const value = current;
          current = current.cause;
          return { value, done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
}

/**
 * 获取错误链根因
 * @param {Error} err
 * @returns {Error}
 */
function getRootCause(err) {
  let current = err;
  while (current && current.cause) {
    current = current.cause;
  }
  return current;
}

/**
 * 格式化错误链为可读字符串
 * @param {Error} err
 * @returns {string}
 */
function formatErrorChain(err) {
  const lines = [];
  let depth = 0;
  for (const e of new ErrorChainIterable(err)) {
    const indent = '  '.repeat(depth);
    lines.push(indent + '→ ' + e.name + ': ' + e.message);
    depth++;
  }
  return lines.join('\n');
}

// 使用
try {
  await loadDashboard();
} catch (e) {
  console.log(formatErrorChain(e));
  // 输出：
  // → ServiceError: 加载用户 123 失败
  //   → ServiceError: HTTP 500
  //     → TypeError: Failed to fetch
}
```

### 6.3 与 Java Throwable.getCause 对比

| 特性 | JavaScript Error Cause | Java Throwable getCause |
| --- | --- | --- |
| 引入版本 | ES2022 | JDK 1.4（2002） |
| 字段名 | `cause` | `cause` |
| 构造器参数 | `new Error(msg, { cause })` | `new Throwable(msg, cause)` |
| 是否可链式 | 是 | 是 |
| 受检异常 | 无 | 区分 checked/unchecked |
| 工具支持 | Sentry 原生识别 | Log4j、SLF4J 原生识别 |

---

## 7. AggregateError 聚合错误（ES2021）

### 7.1 Promise.any 失败语义

```javascript
/**
 * 多源降级查询：尝试从多个 CDN 加载配置，全部失败时抛出 AggregateError
 */
async function fetchConfigFromMultiSource() {
  const sources = [
    'https://cdn1.example.com/config.json',
    'https://cdn2.example.com/config.json',
    'https://cdn3.example.com/config.json',
  ];

  try {
    // Promise.any 任意一个成功即返回，全部失败时抛出 AggregateError
    const response = await Promise.any(
      sources.map(url => fetch(url).then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r;
      }))
    );
    return await response.json();
  } catch (aggErr) {
    // aggErr.errors 是所有失败原因的数组
    console.error('所有 CDN 均不可用：');
    aggErr.errors.forEach((err, i) => {
      console.error('  [' + i + ']', sources[i], '→', err.message);
    });
    throw new AppError('配置加载失败，所有 CDN 不可用', {
      code: 'CONFIG_LOAD_FAILED',
      cause: aggErr,
    });
  }
}
```

### 7.2 表单批量校验

```javascript
/**
 * 表单批量校验器
 * 一次性收集所有字段错误，而非遇到第一个错误就抛出
 */
class FormValidator {
  constructor(rules) {
    this.rules = rules;  // { fieldName: [validatorFn, ...] }
  }

  validate(data) {
    const errors = [];
    for (const [field, validators] of Object.entries(this.rules)) {
      const value = data[field];
      for (const validator of validators) {
        try {
          validator(value, data);
        } catch (e) {
          errors.push(new FieldValidationError(
            e.message,
            { field, value, code: 'VALIDATION_FAILED' }
          ));
        }
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, '表单校验失败，共 ' + errors.length + ' 个错误');
    }
    return true;
  }
}

class FieldValidationError extends AppError {
  constructor(message, options = {}) {
    super(message, { code: 'FIELD_VALIDATION_ERROR', statusCode: 422, ...options });
    this.field = options.field;
  }
}

// 使用
const validator = new FormValidator({
  username: [
    (v) => { if (!v) throw new Error('用户名必填'); },
    (v) => { if (v.length < 3) throw new Error('用户名至少 3 个字符'); },
    (v) => { if (!/^[a-zA-Z0-9_]+$/.test(v)) throw new Error('用户名只能包含字母、数字、下划线'); },
  ],
  email: [
    (v) => { if (!v) throw new Error('邮箱必填'); },
    (v) => { if (!/^[^@]+@[^@]+\.[^@]+$/.test(v)) throw new Error('邮箱格式不正确'); },
  ],
  age: [
    (v) => { if (v < 0 || v > 150) throw new Error('年龄必须在 0-150 之间'); },
  ],
});

try {
  validator.validate({ username: 'ab', email: 'invalid', age: 200 });
} catch (aggErr) {
  console.log(aggErr instanceof AggregateError);  // true
  aggErr.errors.forEach(e => {
    console.log(e.field + ':', e.message);
  });
  // 输出：
  // username: 用户名至少 3 个字符
  // email: 邮箱格式不正确
  // age: 年龄必须在 0-150 之间
}
```

### 7.3 自定义 AggregateError 子类

```javascript
/**
 * 批量操作错误
 * 用于一次性执行 N 个操作并收集所有失败
 */
class BatchOperationError extends AggregateError {
  constructor(errors, message, options = {}) {
    super(errors, message);
    this.name = 'BatchOperationError';
    this.operation = options.operation || 'unknown';
    this.totalCount = options.totalCount || errors.length;
    this.failedCount = errors.length;
    this.successCount = this.totalCount - this.failedCount;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get summary() {
    return this.operation + ' 完成：成功 ' + this.successCount + '/' + this.totalCount +
           '，失败 ' + this.failedCount + ' 个';
  }
}

/**
 * 批量执行工具
 * @param {Array} items 待处理项
 * @param {Function} fn 处理函数
 * @param {object} options 配置
 * @returns {Promise<Array>} 成功项的结果数组
 */
async function batchProcess(items, fn, options = {}) {
  const results = [];
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    try {
      results.push(await fn(items[i], i));
    } catch (e) {
      errors.push(new AppError('处理第 ' + i + ' 项失败', {
        code: 'ITEM_PROCESS_FAILED',
        cause: e,
        details: { index: i, item: items[i] },
      }));
    }
  }

  if (errors.length > 0 && options.throwOnAnyFailure !== false) {
    throw new BatchOperationError(errors, '批量处理失败', {
      operation: options.operation || 'batchProcess',
      totalCount: items.length,
    });
  }

  return { results, errors };
}

// 使用
try {
  const { results, errors } = await batchProcess(
    [1, 2, 3, 4, 5],
    async (n) => {
      if (n === 3) throw new Error('不允许处理 3');
      return n * 2;
    },
    { operation: 'doubleNumbers' }
  );
} catch (e) {
  if (e instanceof BatchOperationError) {
    console.log(e.summary);  // 'doubleNumbers 完成：成功 4/5，失败 1 个'
    e.errors.forEach(err => console.log(err.details.index, err.message));
  }
}
```

---

## 8. 堆栈追踪（Stack Trace）

### 8.1 V8 堆栈格式

V8 引擎（Chrome、Node.js）的 `Error.stack` 是字符串，格式如下：

```
Error: 操作失败
    at AppError (/app/errors.js:10:5)
    at fetchUserProfile (/app/api.js:25:9)
    at async loadDashboard (/app/dashboard.js:15:5)
    at async main (/app/index.js:5:5)
```

V8 还提供非标准的 `Error.captureStackTrace` API：

```javascript
/**
 * Error.captureStackTrace 演示
 * 将当前调用栈写入 target.stack，可跳过 constructorOpt 之前的帧
 */
class TracedError extends Error {
  constructor(message) {
    super(message);
    // 跳过 TracedError 构造函数帧，让 stack 从调用方开始
    Error.captureStackTrace(this, this.constructor);
  }
}

function riskyOperation() {
  throw new TracedError('操作失败');
}

try {
  riskyOperation();
} catch (e) {
  console.log(e.stack);
  // 输出：
  // TracedError: 操作失败
  //     at riskyOperation (/app/index.js:8:9)
  //     at Object.<anonymous> (/app/index.js:11:3)
  // （没有 TracedError 构造函数帧）
}
```

### 8.2 Error.stackTraceLimit

```javascript
// 默认 stackTraceLimit = 10
Error.stackTraceLimit = 50;  // 增加堆栈深度，便于调试深层递归

// 设为 0 可禁用堆栈捕获（性能优化，生产环境敏感场景）
// Error.stackTraceLimit = 0;
```

### 8.3 CallSite 对象

V8 在 `Error.prepareStackTrace` 中暴露原始 `CallSite` 数组：

```javascript
/**
 * 自定义堆栈格式
 * 通过 Error.prepareStackTrace 拿到原始 CallSite 数组
 */
Error.prepareStackTrace = function (err, stack) {
  return stack.map(site => ({
    fileName: site.getFileName(),
    lineNumber: site.getLineNumber(),
    columnNumber: site.getColumnNumber(),
    functionName: site.getFunctionName(),
    typeName: site.getTypeName(),
    methodName: site.getMethodName(),
    isConstructor: site.isConstructor(),
    isEval: site.isEval(),
    isNative: site.isNative(),
    isToplevel: site.isToplevel(),
  }));
};

const err = new Error('test');
// err.stack 现在是 CallSite 对象数组，而非字符串
console.log(Array.isArray(err.stack));  // true
console.log(err.stack[0].fileName);
console.log(err.stack[0].lineNumber);

// 恢复默认格式
delete Error.prepareStackTrace;
```

### 8.4 跨引擎差异

| 特性 | V8（Chrome/Node） | SpiderMonkey（Firefox） | JavaScriptCore（Safari） |
| --- | --- | --- | --- |
| `Error.stack` 格式 | 字符串，多行 | 字符串，多行 | 字符串，多行 |
| `Error.captureStackTrace` | 支持 | 不支持 | 不支持 |
| `Error.stackTraceLimit` | 支持 | 不支持 | 不支持 |
| `Error.prepareStackTrace` | 支持 | 不支持 | 不支持 |
| `err.fileName` | 不支持 | 支持 | 部分支持 |
| `err.lineNumber` | 不支持 | 支持 | 部分支持 |
| `err.columnNumber` | 不支持 | 支持 | 部分支持 |

```javascript
/**
 * 跨引擎堆栈解析工具
 * 解析字符串堆栈为结构化数组
 */
function parseStackTrace(stackStr) {
  if (!stackStr) return [];
  const lines = stackStr.split('\n');
  const frames = [];
  // V8 格式：'    at functionName (fileName:line:column)'
  // SpiderMonkey 格式：'functionName@fileName:line:column'
  // JSC 格式：'functionName@fileName:line:column'

  for (const line of lines.slice(1)) {  // 跳过第一行（错误信息）
    const trimmed = line.trim();
    if (!trimmed) continue;

    // V8 格式
    let match = trimmed.match(/^at (.+) \((.+):(\d+):(\d+)\)$/);
    if (match) {
      frames.push({
        functionName: match[1] === 'eval' ? null : match[1],
        fileName: match[2],
        lineNumber: parseInt(match[3], 10),
        columnNumber: parseInt(match[4], 10),
        engine: 'v8',
      });
      continue;
    }

    // V8 简化格式（无函数名）
    match = trimmed.match(/^at (.+):(\d+):(\d+)$/);
    if (match) {
      frames.push({
        functionName: null,
        fileName: match[1],
        lineNumber: parseInt(match[2], 10),
        columnNumber: parseInt(match[3], 10),
        engine: 'v8',
      });
      continue;
    }

    // SpiderMonkey/JSC 格式
    match = trimmed.match(/^(.*)@(.+):(\d+):(\d+)$/);
    if (match) {
      frames.push({
        functionName: match[1] || null,
        fileName: match[2],
        lineNumber: parseInt(match[3], 10),
        columnNumber: parseInt(match[4], 10),
        engine: 'spidermonkey',
      });
      continue;
    }
  }
  return frames;
}
```

### 8.5 SourceMap 还原

生产环境通常压缩混淆，需通过 SourceMap 还原真实位置：

```javascript
/**
 * SourceMap 还原工具
 * 需安装 source-map 包：npm install source-map
 */
const { SourceMapConsumer } = require('source-map');

class SourceMapResolver {
  constructor(mapPath) {
    this.mapPath = mapPath;
    this.consumer = null;
  }

  async init() {
    const fs = require('fs').promises;
    const rawMap = await fs.readFile(this.mapPath, 'utf-8');
    this.consumer = await new SourceMapConsumer(JSON.parse(rawMap));
  }

  /**
   * 还原压缩后的位置到源码位置
   */
  resolve(line, column) {
    if (!this.consumer) throw new Error('SourceMapResolver 未初始化');
    const result = this.consumer.originalPositionFor({ line, column });
    return {
      source: result.source,
      line: result.line,
      column: result.column,
      name: result.name,
    };
  }

  /**
   * 还原整个堆栈
   */
  resolveStack(stackFrames) {
    return stackFrames.map(frame => {
      if (!frame.fileName || !frame.fileName.endsWith('.js')) return frame;
      const resolved = this.resolve(frame.lineNumber, frame.columnNumber);
      return {
        ...frame,
        originalSource: resolved.source,
        originalLine: resolved.line,
        originalColumn: resolved.column,
        originalName: resolved.name,
      };
    });
  }

  destroy() {
    if (this.consumer) this.consumer.destroy();
  }
}
```

---

## 9. 错误序列化与跨进程传输

### 9.1 JSON.stringify 陷阱

`Error` 对象的属性默认不可枚举，`JSON.stringify` 不会输出：

```javascript
const err = new Error('test');
err.code = 'E_TEST';

console.log(JSON.stringify(err));
// 输出：'{}'  ← message、stack、code 全部丢失！

// 修复方案 1：自定义 toJSON
class SerializableError extends Error {
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      stack: this.stack,
    };
  }
}

// 修复方案 2：手动转换为普通对象
function errorToObject(err) {
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    cause: err.cause ? errorToObject(err.cause) : undefined,
  };
}

console.log(JSON.stringify(errorToObject(new Error('test'))));
// 输出：'{"name":"Error","message":"test","stack":"..."}'
```

### 9.2 structuredClone 支持

`structuredClone`（ES2022+）原生支持 Error 对象克隆：

```javascript
const err = new Error('test');
err.code = 'E_TEST';
err.cause = new TypeError('inner');

const cloned = structuredClone(err);
console.log(cloned instanceof Error);     // true
console.log(cloned.message);              // 'test'
console.log(cloned.cause instanceof TypeError);  // true

// 注意：structuredClone 不会复制不可枚举属性
console.log(cloned.code);  // undefined（code 是后加的可枚举属性，会保留）
```

### 9.3 跨进程传输协议

```javascript
/**
 * 错误传输协议
 * 用于 Web Worker、iframe、postMessage 等场景
 */
const ErrorProtocol = {
  /**
   * 序列化错误为可传输对象
   */
  serialize(err) {
    return {
      __error__: true,
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
      cause: err.cause ? this.serialize(err.cause) : null,
      errors: err.errors ? err.errors.map(e => this.serialize(e)) : null,
    };
  },

  /**
   * 反序列化为 Error 对象
   * 注意：跨 realm（如 iframe）的 instanceof 检查会失败
   */
  deserialize(data) {
    if (!data || !data.__error__) return data;
    let err;
    if (data.name === 'AggregateError' && data.errors) {
      err = new AggregateError(
        data.errors.map(e => this.deserialize(e)),
        data.message
      );
    } else {
      // 根据名称选择构造器
      const Ctor = globalThis[data.name] || Error;
      err = new Ctor(data.message, data.cause ? { cause: this.deserialize(data.cause) } : undefined);
    }
    err.name = data.name;
    if (data.code) err.code = data.code;
    if (data.statusCode) err.statusCode = data.statusCode;
    if (data.details) err.details = data.details;
    if (data.stack) err.stack = data.stack;
    return err;
  },
};

// 使用：Web Worker 通信
// worker.js
self.onmessage = async (e) => {
  try {
    const result = await riskyTask(e.data);
    self.postMessage({ success: true, result });
  } catch (err) {
    self.postMessage({ success: false, error: ErrorProtocol.serialize(err) });
  }
};

// main.js
worker.onmessage = (e) => {
  const { success, result, error } = e.data;
  if (!success) {
    const err = ErrorProtocol.deserialize(error);
    console.log(err instanceof Error);  // true
    console.log(err.message);
  }
};
```

---

## 10. 对比分析

### 10.1 JavaScript vs Java 异常体系

| 特性 | JavaScript | Java |
| --- | --- | --- |
| 根类 | `Error` | `Throwable` |
| 受检异常 | 无 | `checked exception`（必须声明或捕获） |
| 运行时异常 | 所有 Error | `RuntimeException`（ unchecked） |
| 错误链 | `cause`（ES2022） | `getCause()`（JDK 1.4） |
| 聚合错误 | `AggregateError`（ES2021） | `Throwable[]` 需自定义 |
| 多 catch | 不支持 | `catch (A | B e)` |
| try-with-resources | 无（finally 替代） | `try (Resource r = ...)` |
| 堆栈格式 | 字符串（V8）/对象（SpiderMonkey） | `StackTraceElement[]` |
| 性能 | throw 较慢（V8 优化中） | throw 较慢（JIT 优化中） |

### 10.2 JavaScript vs Python 异常体系

| 特性 | JavaScript | Python |
| --- | --- | --- |
| 根类 | `Error` | `BaseException` |
| 业务基类 | `Error` | `Exception` |
| 错误链 | `cause`（ES2022） | `__cause__`（PEP 3134，Python 3.0+） |
| 显式链 | `throw new Err(msg, { cause })` | `raise Err(msg) from original` |
| 隐式链 | 无 | `__context__`（自动设置） |
| 聚合 | `AggregateError` | `ExceptionGroup`（Python 3.11+） |
| 多 except | 不支持 | `except (A, B) as e` |
| finally | 支持 | 支持 |
| else 子句 | 无 | `try ... except ... else ...` |

### 10.3 自定义错误 vs 错误码（返回值）

| 维度 | 自定义 Error 抛出 | 错误码返回 |
| --- | --- | --- |
| 可读性 | 高（调用栈明确） | 低（需查表） |
| 性能 | 较低（堆栈捕获开销） | 高 |
| 强制处理 | 否（可被忽略，但有全局监听） | 否（需显式检查） |
| 类型安全 | TypeScript 支持 instanceof 收窄 | 需 union 类型 |
| 上下文信息 | 丰富（message、stack、cause） | 受限于返回值结构 |
| Go 语言风格 | 不推荐 | `if err != nil` 模式 |
| 适用场景 | 异常情况、不可恢复 | 可预期的失败、业务流 |

```typescript
// TypeScript 中的类型收窄
type Result<T, E> = { success: true; value: T } | { success: false; error: E };

// 方案 1：抛出错误（适合异常情况）
function parseIntOrThrow(s: string): number {
  const n = parseInt(s, 10);
  if (isNaN(n)) throw new ValidationError('无效数字', { details: { input: s } });
  return n;
}

// 方案 2：返回 Result（适合业务流）
function parseIntOrResult(s: string): Result<number, ValidationError> {
  const n = parseInt(s, 10);
  if (isNaN(n)) return { success: false, error: new ValidationError('无效数字', { details: { input: s } }) };
  return { success: true, value: n };
}
```

---

## 11. 常见陷阱与修复

### 11.1 instanceof 失效陷阱

```javascript
// 错误：Babel transpile 后 instanceof 失效
class BadError extends Error {
  constructor(message) {
    super(message);
    // 缺少 Object.setPrototypeOf(this, new.target.prototype);
  }
}

const err = new BadError('test');
console.log(err instanceof BadError);  // 可能为 false（transpile 后）

// 修复
class GoodError extends Error {
  constructor(message) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
const err2 = new GoodError('test');
console.log(err2 instanceof GoodError);  // true
```

### 11.2 name 属性错误

```javascript
// 错误：name 始终是 'Error'
class ForgottenNameError extends Error {
  constructor(message) {
    super(message);
    // 缺少 this.name 设置
  }
}
const err = new ForgottenNameError('test');
console.log(err.name);  // 'Error'（应该为 'ForgottenNameError'）

// 修复 1：显式设置
class ExplicitNameError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExplicitNameError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// 修复 2：动态读取（推荐）
class DynamicNameError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;  // 自动取子类名
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

### 11.3 错误链断裂

```javascript
// 错误：手动拼接字符串，丢失原始 Error 对象
async function badWrapper() {
  try {
    await fetch('/api');
  } catch (e) {
    throw new Error('请求失败：' + e.message);  // 丢失 stack、type
  }
}

// 修复：使用 ES2022 cause
async function goodWrapper() {
  try {
    await fetch('/api');
  } catch (e) {
    throw new AppError('请求失败', { cause: e });  // 保留完整错误对象
  }
}
```

### 11.4 Promise.all 错误丢失

```javascript
// 错误：Promise.all 在第一个失败时 reject，丢失其他错误
async function fetchAllBad(urls) {
  return Promise.all(urls.map(url => fetch(url)));
  // 若 3 个请求都失败，只会拿到第 1 个错误
}

// 修复 1：使用 allSettled 收集所有结果
async function fetchAllSettled(urls) {
  const results = await Promise.allSettled(urls.map(url => fetch(url)));
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(f => f.reason),
      '部分请求失败'
    );
  }
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
}

// 修复 2：使用 Promise.any（任意成功即可）
async function fetchAny(urls) {
  return Promise.any(urls.map(url => fetch(url)));
  // 全部失败时抛出 AggregateError
}
```

### 11.5 异步错误未捕获

```javascript
// 错误：异步错误未 catch，成为 unhandledrejection
function badAsyncCall() {
  setTimeout(() => {
    throw new Error('异步错误');  // 无人捕获，触发 window.onerror
  }, 100);
}

// 修复 1：返回 Promise
function goodAsyncCall() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const result = riskyOp();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    }, 100);
  });
}

// 修复 2：全局兜底
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  Sentry.captureException(event.reason);
  event.preventDefault();  // 阻止控制台输出
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  Sentry.captureException(event.error);
});
```

### 11.6 错误对象被复用

```javascript
// 错误：复用 Error 实例，堆栈信息混乱
const sharedError = new Error('配置错误');
function getConfig(key) {
  if (!config[key]) throw sharedError;  // 多次抛出同一实例
}

// 修复：每次抛出新实例
function getConfigGood(key) {
  if (!config[key]) {
    throw new ConfigError('配置缺失: ' + key, { code: 'CONFIG_MISSING', key });
  }
}
```

### 11.7 finally 吞掉错误

```javascript
// 错误：finally 抛出错误会覆盖 try 中的错误
function badFinally() {
  try {
    throw new Error('原始错误');
  } finally {
    throw new Error('finally 中的错误');  // 原始错误被吞
  }
}

// 修复：finally 中避免抛错，或用 cause 链接
function goodFinally() {
  let originalError;
  try {
    riskyOp();
  } catch (e) {
    originalError = e;
    throw e;
  } finally {
    try {
      cleanup();
    } catch (cleanupErr) {
      if (originalError) {
        // 用 cause 链接两个错误
        const combined = new Error('清理失败');
        combined.cause = new AggregateError(
          [cleanupErr, originalError],
          '多个错误'
        );
        throw combined;
      } else {
        throw cleanupErr;
      }
    }
  }
}
```

---

## 12. 工程实践

### 12.1 错误监控 SDK 设计

```javascript
/**
 * 错误监控 SDK
 * 集成全局错误监听、错误链解析、Sentry 上报
 */
class ErrorMonitor {
  constructor(options = {}) {
    this.dsn = options.dsn;
    this.environment = options.environment || 'production';
    this.release = options.release;
    this.sampleRate = options.sampleRate || 1.0;
    this.user = null;
    this.breadcrumbs = [];
    this.maxBreadcrumbs = 50;
    this.queue = [];
    this.flushTimer = null;
    this.flushInterval = 5000;
    this.lastErrors = new Map();  // 用于去重
    this.dedupWindow = 60000;     // 1 分钟去重窗口
  }

  /**
   * 初始化：注册全局监听器
   */
  init() {
    // 同步错误
    window.addEventListener('error', (event) => {
      this.capture(event.error || new Error(event.message), {
        type: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      event.preventDefault();
    });

    // Promise 未捕获拒绝
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      this.capture(reason, { type: 'unhandledrejection' });
      event.preventDefault();
    });

    // 控制台 error 拦截
    const origConsoleError = console.error;
    console.error = (...args) => {
      this.addBreadcrumb({
        category: 'console',
        level: 'error',
        message: args.map(a => String(a)).join(' '),
      });
      origConsoleError.apply(console, args);
    };

    // 启动批量上报定时器
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  /**
   * 设置用户上下文
   */
  setUser(user) {
    this.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      // 脱敏：移除敏感字段
      ip_address: undefined,
    };
  }

  /**
   * 添加面包屑（用户操作轨迹）
   */
  addBreadcrumb(crumb) {
    this.breadcrumbs.push({
      timestamp: Date.now(),
      ...crumb,
    });
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * 捕获错误
   */
  capture(err, context = {}) {
    // 采样
    if (Math.random() > this.sampleRate) return;

    // 去重：相同 message + stack 首行在 1 分钟内只上报一次
    const dedupKey = err.message + '|' + (err.stack || '').split('\n')[1] || '';
    const now = Date.now();
    const lastTime = this.lastErrors.get(dedupKey);
    if (lastTime && now - lastTime < this.dedupWindow) {
      return;  // 跳过重复错误
    }
    this.lastErrors.set(dedupKey, now);

    // 构建事件
    const event = {
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      environment: this.environment,
      release: this.release,
      user: this.user,
      level: context.level || 'error',
      exception: {
        values: this.serializeExceptionChain(err),
      },
      breadcrumbs: this.breadcrumbs.slice(),
      extra: context,
      request: {
        url: location.href,
        headers: {
          'User-Agent': navigator.userAgent,
        },
      },
    };

    this.queue.push(event);

    // 严重错误立即上报
    if (context.level === 'fatal') {
      this.flush();
    }
  }

  /**
   * 序列化错误链（含 cause）
   */
  serializeExceptionChain(err) {
    const values = [];
    let current = err;
    while (current) {
      values.push({
        type: current.name,
        value: current.message,
        stacktrace: this.serializeStack(current.stack),
        mechanism: current === err
          ? { type: 'generic', handled: false }
          : { type: 'cause', source: 'cause', handled: true },
      });
      current = current.cause;
    }
    return values;
  }

  /**
   * 序列化堆栈
   */
  serializeStack(stackStr) {
    if (!stackStr) return { frames: [] };
    const frames = [];
    const lines = stackStr.split('\n').slice(1);
    for (const line of lines) {
      const match = line.match(/\s*at (.+) \((.+):(\d+):(\d+)\)/);
      if (match) {
        frames.push({
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10),
          in_app: !match[2].includes('node_modules'),
        });
      }
    }
    return { frames: frames.reverse() };  // Sentry 要求栈底在前
  }

  /**
   * 批量上报
   */
  async flush() {
    if (this.queue.length === 0) return;
    const events = this.queue.splice(0);
    try {
      await fetch(this.dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch (e) {
      // 上报失败，重新入队（指数退避）
      this.queue.unshift(...events);
      console.warn('错误上报失败，将重试', e);
    }
  }

  /**
   * 销毁
   */
  destroy() {
    clearInterval(this.flushTimer);
    this.flush();
  }
}
```

### 12.2 React 错误边界集成

```jsx
import React from 'react';
import { ErrorMonitor } from './errorMonitor';

const monitor = new ErrorMonitor({ dsn: '/api/errors' });
monitor.init();

/**
 * React 错误边界组件
 * 捕获子组件渲染、生命周期、构造函数中的错误
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // errorInfo.componentStack 是 React 组件调用栈
    monitor.capture(error, {
      type: 'react.errorBoundary',
      componentStack: errorInfo.componentStack,
      level: 'fatal',
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-fallback">
          <h2>页面出错了</h2>
          <p>我们已收到错误报告，请刷新页面重试。</p>
          <button onClick={() => location.reload()}>刷新</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 使用
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes />
      </Router>
    </ErrorBoundary>
  );
}
```

### 12.3 Vue 错误处理集成

```javascript
import { createApp } from 'vue';
import { ErrorMonitor } from './errorMonitor';

const monitor = new ErrorMonitor({ dsn: '/api/errors' });
monitor.init();

const app = createApp(App);

// 全局错误处理器
app.config.errorHandler = (err, instance, info) => {
  monitor.capture(err, {
    type: 'vue.errorHandler',
    info,  // Vue 提供的错误来源信息（如 "render"、"mounted hook"）
    componentName: instance?.$options?.name,
    level: 'fatal',
  });
};

// 捕获未处理的警告
app.config.warnHandler = (msg, instance, trace) => {
  monitor.addBreadcrumb({
    category: 'vue.warn',
    level: 'warning',
    message: msg,
    data: { trace },
  });
};

app.mount('#app');
```

### 12.4 try/catch 性能考量

```javascript
/**
 * try/catch 性能测试
 * V8 在历史上对 try 块内的代码优化较差，但现代引擎已大幅改进
 */
function benchmarkTryCatch(iters = 1e7) {
  // 测试 1：try/catch 在热路径
  let sum1 = 0;
  const start1 = performance.now();
  for (let i = 0; i < iters; i++) {
    try {
      sum1 += i;
    } catch (e) {
      // 不会执行
    }
  }
  const time1 = performance.now() - start1;

  // 测试 2：无 try/catch
  let sum2 = 0;
  const start2 = performance.now();
  for (let i = 0; i < iters; i++) {
    sum2 += i;
  }
  const time2 = performance.now() - start2;

  console.log('try/catch:', time1, 'ms');
  console.log('无 try/catch:', time2, 'ms');
  console.log('性能差异:', ((time1 - time2) / time2 * 100).toFixed(2), '%');
}

// 现代 V8（2024+）中 try/catch 在热路径的性能损耗已可忽略（< 5%）
// 但 throw 本身较慢，不应作为流程控制

/**
 * 错误风暴抑制
 * 短时间内大量相同错误时自动降级
 */
class ErrorThrottle {
  constructor(window = 10000, maxCount = 100) {
    this.window = window;
    this.maxCount = maxCount;
    this.counts = new Map();
  }

  shouldReport(error) {
    const key = error.message + '|' + (error.stack || '').split('\n')[1];
    const now = Date.now();
    const record = this.counts.get(key);

    if (!record || now - record.startTime > this.window) {
      this.counts.set(key, { startTime: now, count: 1 });
      return true;
    }

    record.count++;
    if (record.count <= this.maxCount) {
      return true;
    }

    // 超过阈值，触发降级
    if (record.count === this.maxCount + 1) {
      console.warn('错误风暴抑制：', key, '已超过', this.maxCount, '次/10s');
    }
    return false;
  }
}
```

---

## 13. 案例研究

### 13.1 案例：电商订单系统错误体系

```javascript
/**
 * 电商订单系统完整错误层次
 * 按业务域分类，每个域内再做错误类型细分
 */
// 订单域
class OrderError extends AppError {}
class OrderNotFoundError extends OrderError {
  constructor(orderId) {
    super('订单不存在: ' + orderId, {
      code: 'ORDER_NOT_FOUND',
      statusCode: 404,
      details: { orderId },
    });
  }
}
class OrderStatusError extends OrderError {
  constructor(currentStatus, expectedStatus) {
    super('订单状态不允许操作', {
      code: 'INVALID_ORDER_STATUS',
      statusCode: 409,
      details: { currentStatus, expectedStatus },
    });
  }
}

// 支付域
class PaymentError extends AppError {}
class PaymentDeclinedError extends PaymentError {
  constructor(reason) {
    super('支付被拒绝', {
      code: 'PAYMENT_DECLINED',
      statusCode: 402,
      details: { reason },
    });
  }
}
class InsufficientFundsError extends PaymentError {
  constructor(required, available) {
    super('余额不足', {
      code: 'INSUFFICIENT_FUNDS',
      statusCode: 402,
      details: { required, available },
    });
  }
}

// 库存域
class InventoryError extends AppError {}
class OutOfStockError extends InventoryError {
  constructor(sku, requested, available) {
    super('库存不足: ' + sku, {
      code: 'OUT_OF_STOCK',
      statusCode: 409,
      details: { sku, requested, available },
    });
  }
}

/**
 * 订单创建流程
 */
async function createOrder(cart, user) {
  // 1. 校验库存
  const inventoryCheck = await Promise.allSettled(
    cart.items.map(item => checkInventory(item.sku, item.quantity))
  );
  const stockFailures = inventoryCheck
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);
  if (stockFailures.length > 0) {
    throw new AggregateError(stockFailures, '部分商品库存不足');
  }

  // 2. 创建订单
  let order;
  try {
    order = await db.orders.create({
      userId: user.id,
      items: cart.items,
      total: cart.total,
      status: 'pending',
    });
  } catch (e) {
    throw new OrderError('订单创建失败', { cause: e, code: 'ORDER_CREATE_FAILED' });
  }

  // 3. 支付
  try {
    const payment = await processPayment(user, order.total);
    order.paymentId = payment.id;
    order.status = 'paid';
    await order.save();
    return order;
  } catch (e) {
    // 支付失败，回滚订单
    try {
      order.status = 'payment_failed';
      await order.save();
    } catch (rollbackErr) {
      // 回滚失败，需人工介入
      throw new OrderError('订单支付失败且回滚失败', {
        code: 'ORDER_PAYMENT_AND_ROLLBACK_FAILED',
        cause: new AggregateError([e, rollbackErr], '支付与回滚均失败'),
        details: { orderId: order.id },
      });
    }
    throw new OrderError('订单支付失败', { cause: e, code: 'ORDER_PAYMENT_FAILED' });
  }
}

// 上层调用
try {
  const order = await createOrder(cart, user);
  res.json(order);
} catch (e) {
  if (e instanceof AggregateError) {
    res.status(409).json({
      error: e.message,
      items: e.errors.map(err => err.details),
    });
  } else if (e instanceof OutOfStockError) {
    res.status(409).json({ error: e.message, ...e.details });
  } else if (e instanceof PaymentError) {
    res.status(402).json({ error: e.message, ...e.details });
  } else {
    Sentry.captureException(e);
    res.status(500).json({ error: '系统异常' });
  }
}
```

### 13.2 案例：API SDK 错误处理

```javascript
/**
 * HTTP API SDK
 * 自动重试、超时、错误标准化
 */
class ApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.timeout = options.timeout || 10000;
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  async request(method, path, data, options = {}) {
    const url = this.baseUrl + path;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const startTime = performance.now();
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await this.safeParseJson(response);
        throw this.normalizeHttpError(response, body);
      }

      return await response.json();
    } catch (e) {
      // 网络错误或超时
      if (e instanceof AppError) throw e;
      if (e.name === 'AbortError') {
        throw new TimeoutError('请求超时 (' + this.timeout + 'ms)', {
          cause: e,
          details: { url, method, timeout: this.timeout },
        });
      }
      throw new NetworkError('网络请求失败', {
        cause: e,
        details: { url, method },
      });
    } finally {
      clearTimeout(timeoutId);
      const duration = performance.now() - startTime;
      monitor.addBreadcrumb({
        category: 'http',
        level: 'info',
        message: method + ' ' + path,
        data: { status: response?.status, duration },
      });
    }
  }

  /**
   * HTTP 状态码到自定义错误的映射
   */
  normalizeHttpError(response, body) {
    const errorMap = {
      400: ValidationError,
      401: UnauthorizedError,
      403: ForbiddenError,
      404: NotFoundError,
      409: ConflictError,
      422: ValidationError,
      429: RateLimitError,
      500: ServerError,
      502: BadGatewayError,
      503: ServiceUnavailableError,
      504: TimeoutError,
    };
    const Ctor = errorMap[response.status] || AppError;
    return new Ctor(body?.message || 'HTTP ' + response.status, {
      code: body?.code || 'HTTP_' + response.status,
      statusCode: response.status,
      details: body,
    });
  }

  async safeParseJson(response) {
    try {
      return await response.json();
    } catch (e) {
      return null;
    }
  }

  /**
   * 带重试的请求
   */
  async requestWithRetry(method, path, data, options = {}) {
    const maxRetries = options.retries ?? this.retries;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.request(method, path, data, options);
      } catch (e) {
        lastError = e;
        // 仅对可重试错误重试（网络错误、5xx、429）
        const isRetryable = e instanceof NetworkError ||
                            e instanceof TimeoutError ||
                            (e.statusCode >= 500 && e.statusCode < 600) ||
                            e.statusCode === 429;
        if (!isRetryable || attempt === maxRetries) {
          throw e;
        }
        // 指数退避
        const delay = this.retryDelay * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  }
}
```

### 13.3 案例：表单校验器

```javascript
/**
 * Schema 驱动的表单校验器
 * 支持嵌套对象、数组、自定义校验器
 */
class SchemaValidator {
  constructor(schema) {
    this.schema = schema;
  }

  validate(data, path = '') {
    const errors = [];
    const schema = this.schema;

    for (const [key, rule] of Object.entries(schema)) {
      const fieldPath = path ? path + '.' + key : key;
      const value = data?.[key];

      // 必填校验
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(new FieldValidationError(fieldPath + ' 必填', {
          field: fieldPath,
          code: 'REQUIRED',
        }));
        continue;
      }

      if (value === undefined || value === null) continue;

      // 类型校验
      if (rule.type && typeof value !== rule.type) {
        errors.push(new FieldValidationError(
          fieldPath + ' 应为 ' + rule.type + ' 类型',
          { field: fieldPath, code: 'TYPE_MISMATCH', expected: rule.type, actual: typeof value }
        ));
        continue;
      }

      // 自定义校验器
      if (rule.validator) {
        try {
          rule.validator(value, data);
        } catch (e) {
          errors.push(new FieldValidationError(e.message, {
            field: fieldPath,
            code: 'CUSTOM',
            cause: e,
          }));
        }
      }

      // 嵌套对象
      if (rule.schema && typeof value === 'object') {
        const nested = new SchemaValidator(rule.schema).validate(value, fieldPath);
        errors.push(...nested);
      }

      // 数组元素
      if (rule.items && Array.isArray(value)) {
        value.forEach((item, i) => {
          if (rule.items.schema) {
            const nested = new SchemaValidator(rule.items.schema).validate(item, fieldPath + '[' + i + ']');
            errors.push(...nested);
          }
          if (rule.items.validator) {
            try {
              rule.items.validator(item, data);
            } catch (e) {
              errors.push(new FieldValidationError(e.message, {
                field: fieldPath + '[' + i + ']',
                code: 'CUSTOM',
                cause: e,
              }));
            }
          }
        });
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, '校验失败');
    }
    return true;
  }
}

// 使用
const userSchema = {
  username: {
    required: true,
    type: 'string',
    validator: (v) => {
      if (v.length < 3) throw new Error('至少 3 个字符');
      if (!/^[a-zA-Z0-9_]+$/.test(v)) throw new Error('只能包含字母、数字、下划线');
    },
  },
  email: {
    required: true,
    type: 'string',
    validator: (v) => {
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(v)) throw new Error('邮箱格式不正确');
    },
  },
  profile: {
    required: false,
    type: 'object',
    schema: {
      age: {
        required: true,
        type: 'number',
        validator: (v) => {
          if (v < 0 || v > 150) throw new Error('年龄必须在 0-150 之间');
        },
      },
      address: {
        required: false,
        type: 'string',
      },
    },
  },
  tags: {
    required: false,
    type: 'object',
    items: {
      validator: (v) => {
        if (typeof v !== 'string') throw new Error('标签必须为字符串');
      },
    },
  },
};

const validator = new SchemaValidator(userSchema);
try {
  validator.validate({
    username: 'ab',
    email: 'invalid',
    profile: { age: 200 },
    tags: ['ok', 123],
  });
} catch (e) {
  if (e instanceof AggregateError) {
    e.errors.forEach(err => console.log(err.field + ':', err.message));
  }
}
```

### 13.4 案例：Worker 错误传递

```javascript
/**
 * Web Worker 任务执行器
 * 支持 Error 跨 Worker 传递、超时、取消
 */
class WorkerPool {
  constructor(workerScript, poolSize = 4) {
    this.workers = Array.from({ length: poolSize }, () => new Worker(workerScript));
    this.queue = [];
    this.busy = new Set();
  }

  async run(task, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const job = { task, resolve, reject, timeout };
      this.queue.push(job);
      this.dispatch();
    });
  }

  dispatch() {
    if (this.queue.length === 0 || this.busy.size >= this.workers.length) return;
    const worker = this.workers.find(w => !this.busy.has(w));
    if (!worker) return;

    const job = this.queue.shift();
    this.busy.add(worker);

    const timeoutId = setTimeout(() => {
      worker.terminate();
      this.busy.delete(worker);
      this.workers[this.workers.indexOf(worker)] = new Worker(worker.constructor.url);
      job.reject(new TimeoutError('Worker 任务超时', {
        code: 'WORKER_TIMEOUT',
        details: { task: job.task, timeout },
      }));
    }, job.timeout);

    worker.onmessage = (e) => {
      clearTimeout(timeoutId);
      this.busy.delete(worker);
      const { success, result, error } = e.data;
      if (success) {
        job.resolve(result);
      } else {
        // 反序列化 Worker 抛出的错误
        job.reject(this.deserializeError(error));
      }
      this.dispatch();
    };

    worker.onerror = (e) => {
      clearTimeout(timeoutId);
      this.busy.delete(worker);
      job.reject(new AppError('Worker 执行失败', {
        code: 'WORKER_ERROR',
        cause: new Error(e.message + ' (' + e.filename + ':' + e.lineno + ')'),
      }));
      this.dispatch();
    };

    worker.postMessage(job.task);
  }

  deserializeError(data) {
    if (!data) return new Error('Unknown error');
    const Ctor = globalThis[data.name] || Error;
    const err = new Ctor(data.message, data.cause ? { cause: this.deserializeError(data.cause) } : undefined);
    err.name = data.name;
    err.stack = data.stack;
    if (data.code) err.code = data.code;
    return err;
  }
}

// worker.js
self.onmessage = async (e) => {
  try {
    const result = await executeTask(e.data);
    self.postMessage({ success: true, result });
  } catch (err) {
    // 序列化 Error 后传递
    self.postMessage({
      success: false,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
        cause: err.cause ? {
          name: err.cause.name,
          message: err.cause.message,
          stack: err.cause.stack,
        } : null,
      },
    });
  }
};
```

### 13.5 案例：GraphQL 错误处理

```javascript
/**
 * GraphQL 错误格式标准化
 * 遵循 GraphQL 规范的 errors 数组结构
 */
class GraphQLErrorFormatter {
  static format(err) {
    const formatted = {
      message: err.message,
      extensions: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
    };

    if (err.statusCode) {
      formatted.extensions.statusCode = err.statusCode;
    }
    if (err.details) {
      formatted.extensions.details = err.details;
    }
    if (err.cause) {
      formatted.extensions.cause = {
        name: err.cause.name,
        message: err.cause.message,
      };
    }
    if (err.fields) {
      formatted.extensions.fields = err.fields;
    }
    if (process.env.NODE_ENV === 'development' && err.stack) {
      formatted.extensions.stacktrace = err.stack.split('\n').map(s => s.trim());
    }
    return formatted;
  }

  static formatAggregate(aggErr) {
    return aggErr.errors.map(e => this.format(e));
  }
}

// Apollo Server 集成
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // 生产环境隐藏内部错误细节
    if (process.env.NODE_ENV === 'production') {
      if (error instanceof AppError) {
        return GraphQLErrorFormatter.format(error);
      }
      // 未知错误，仅返回通用信息
      return {
        message: 'Internal server error',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      };
    }
    return GraphQLErrorFormatter.format(error);
  },
});
```

---

## 14. 习题

### 14.1 填空题（fill-blank）

1. **（remember）** ECMAScript 内置的 6 个错误子类分别是 Error、TypeError、______、______、______、______、URIError（含已废弃的 EvalError）。

   **答案**：RangeError、ReferenceError、SyntaxError、EvalError（顺序可不同）

2. **（remember）** ES2021 引入的 ______ 用于聚合多个错误，最常配合 ______ 使用；ES2022 引入的 ______ 用于保留错误链上游的原始错误对象。

   **答案**：AggregateError、Promise.any、Error Cause（或 cause）

3. **（understand）** `Error.captureStackTrace(target, constructorOpt)` 中第二个参数 `constructorOpt` 的作用是 ______。

   **答案**：跳过 `constructorOpt` 函数及其之前的所有调用帧，让堆栈从调用方开始

### 14.2 选择题（choice）

1. **（analyze）** 下列代码在原生 ES6+ 环境（无 transpile）中的输出是？
```javascript
class A extends Error {
  constructor(m) { super(m); this.name = 'A'; }
}
class B extends A {
  constructor(m) { super(m); this.name = 'B'; }
}
const err = new B('test');
console.log(err instanceof B, err instanceof A, err instanceof Error, err.name);
```

   - A. `true true true 'A'`
   - B. `true true true 'B'`
   - C. `true false true 'B'`
   - D. `true true false 'B'`

   **答案**：B

   **解释**：原生 ES6+ 环境下 class extends 原型链正确建立，instanceof 链完整（B → A → Error）；name 在 B 的构造函数中被显式设置为 'B'。

2. **（analyze）** 下列代码的输出是？
```javascript
const p1 = Promise.reject(new TypeError('A'));
const p2 = Promise.reject(new RangeError('B'));
const p3 = Promise.reject(new SyntaxError('C'));

Promise.any([p1, p2, p3]).catch(e => {
  console.log(e.constructor.name);
  console.log(e.errors.map(err => err.constructor.name));
  console.log(e.errors.length);
});
```

   - A. `Error`, `['TypeError', 'RangeError', 'SyntaxError']`, `3`
   - B. `AggregateError`, `['TypeError', 'RangeError', 'SyntaxError']`, `3`
   - C. `AggregateError`, `['Error', 'Error', 'Error']`, `3`
   - D. `TypeError`, `['TypeError']`, `1`

   **答案**：B

   **解释**：Promise.any 在所有 Promise 都 reject 时抛出 AggregateError，其 errors 数组保留原始错误实例与顺序。

3. **（evaluate）** 关于自定义 Error 子类的层次设计，下列哪种说法最准确？

   - A. 错误层次越深越好，便于精确分支
   - B. 应该完全扁平，所有错误直接继承 Error
   - C. 按业务域分组，每域 2-4 层深度，平衡精确性与可维护性
   - D. 应该用错误码（code）替代层次设计

   **答案**：C

   **解释**：过深的层次增加维护成本，过浅无法精确分支；按业务域分组并控制深度是工业实践推荐方案。

### 14.3 代码修复题（code-fix）

1. **（analyze）** 以下代码期望打印所有失败原因，但实际只打印了一个。请修复：
```javascript
async function fetchAllUsers(userIds) {
  const results = await Promise.all(
    userIds.map(id => fetch('/api/users/' + id).then(r => r.json()))
  );
  return results;
}

try {
  await fetchAllUsers([1, 2, 3, 4, 5]);
} catch (e) {
  console.log('失败原因:', e.message);
}
```

   **答案**：
```javascript
async function fetchAllUsers(userIds) {
  const results = await Promise.allSettled(
    userIds.map(id => fetch('/api/users/' + id).then(r => r.json()))
  );
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(f => f.reason),
      '部分用户加载失败（共 ' + failures.length + '/' + userIds.length + '）'
    );
  }
  return results.filter(r => r.status === 'fulfilled').map(r => r.value);
}
```

   **解释**：Promise.all 在第一个失败时立即 reject，丢失其他错误；应使用 Promise.allSettled 收集所有结果，然后聚合失败原因到 AggregateError。

2. **（apply）** 以下自定义错误类的 `toJSON` 方法无法正确序列化错误链。请修复：
```javascript
class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.code = options.code;
    this.cause = options.cause;
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
    };
  }
}
```

   **答案**：
```javascript
class AppError extends Error {
  constructor(message, options = {}) {
    // 使用 ES2022 标准 cause 选项
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = options.code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
  toJSON() {
    const obj = {
      name: this.name,
      message: this.message,
      code: this.code,
      stack: this.stack,
    };
    // 递归序列化 cause 链
    if (this.cause instanceof Error) {
      obj.cause = this.cause.toJSON ? this.cause.toJSON() : {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      };
    } else if (this.cause !== undefined) {
      obj.cause = this.cause;
    }
    // 序列化 AggregateError 的 errors 数组
    if (Array.isArray(this.errors)) {
      obj.errors = this.errors.map(e =>
        e instanceof Error ? (e.toJSON ? e.toJSON() : { name: e.name, message: e.message }) : e
      );
    }
    return obj;
  }
}
```

### 14.4 开放题（open-ended）

1. **（create）** 请设计一个支持以下能力的企业级错误处理体系：
   - 跨前端（React/Vue）与后端（Node.js）统一错误类型
   - 错误自动上报到 Sentry，含用户上下文、面包屑、错误链
   - 生产环境 SourceMap 还原
   - 错误风暴抑制（每分钟相同错误不超过 N 条）
   - 用户友好提示（错误码 → 多语言文案映射）
   - 可重试错误自动重试（指数退避）

   **参考答案**：架构应包含：
   - **错误类型层**：共享 `@company/errors` 包，导出 AppError 及子类，前后端共用
   - **错误监听层**：前端用 window.onerror + unhandledrejection + React ErrorBoundary/Vue errorHandler；后端用 Express/Koa 中间件 + process.uncaughtException + process.unhandledRejection
   - **错误标准化层**：将任意 Error 转换为标准事件对象，提取 name/message/stack/cause 链/errors 数组
   - **SourceMap 还原层**：后端接收到上报后，根据 stack 和 release 版本查找对应 SourceMap，调用 source-map 包还原
   - **采样降级层**：内存维护 LRU 计数器，相同 dedupKey 在窗口期内超过阈值则丢弃
   - **重试层**：ApiClient 内部识别可重试错误（NetworkError、5xx、429），按指数退避重试
   - **用户提示层**：错误码到文案的映射表，支持 i18n；未知错误显示通用提示并附错误 ID 便于客服定位

2. **（evaluate）** 在以下场景中，应选择"抛出错误"还是"返回 Result 类型"？请说明理由：
   - 表单字段校验
   - 数据库连接失败
   - 用户登录密码错误
   - JSON.parse 解析失败
   - HTTP 请求超时
   - 用户取消操作

   **参考答案**：
   - **表单字段校验**：返回 Result，因为是业务流的预期失败，需展示所有错误而非第一个
   - **数据库连接失败**：抛出错误，属于基础设施异常，应触发重试与告警
   - **用户登录密码错误**：返回 Result，业务流的一部分，需精确区分"用户不存在"与"密码错误"
   - **JSON.parse 解析失败**：抛出错误，标准库 API 一致性；调用方可 try/catch 或包装为 Result
   - **HTTP 请求超时**：抛出错误，属于可重试异常，需触发重试逻辑
   - **用户取消操作**：返回 Result，是用户意图而非异常情况

---

## 15. 延伸阅读

### 15.1 官方规范与提案

- **ECMAScript 2026 Language Specification** - ECMA-262, 17th Edition. Error Objects 章节。https://tc39.es/ecma262/#sec-error-objects
- **TC39 Error Cause Proposal** - https://github.com/tc39/proposal-error-cause
- **TC39 Promise.any Proposal**（含 AggregateError） - https://github.com/tc39/proposal-promise-any
- **TC39 Error.isError Proposal**（Stage 1） - 跨 realm 错误判定标准化
- **WHATWG HTML Living Standard** - Web Worker 错误传递规范

### 15.2 经典书籍

- **Flanagan, D. (2020). *JavaScript: The Definitive Guide*, 7th Edition. O'Reilly.** - 第 11 章深入讲解 Error 与异常处理
- **Haverbeke, M. (2018). *Eloquent JavaScript*, 3rd Edition.** - 第 8 章错误处理哲学
- **Crockford, D. (2008). *JavaScript: The Good Parts*. O'Reilly.** - 早期对 throw 设计的批判与建议
- **Simpson, K. (2019). *You Don't Know JS Yet: Scope & Closures*, 2nd Edition.** - 异常对作用域与闭包的影响

### 15.3 论文与学术资料

- **Goodenough, J. B. (1975). "Exception handling: issues and a proposed notation."** *Communications of the ACM*, 18(12), 683-696. DOI: 10.1145/361227.361230 - 异常处理设计的经典论文，奠定现代 try/catch 语义
- **Liskov, B. H., & Snyder, A. (1979). "Exception handling in CLU."** *IEEE Transactions on Software Engineering*, (6), 546-558. DOI: 10.1109/TSE.1979.234169 - 最早的形式化异常处理系统之一
- **Miller, R., & Tripathi, A. (1987). "Issues with exception handling."** *ACM SIGPLAN Notices*, 22(12), 59-64. DOI: 10.1145/38877.38883 - 异常处理的开放问题

### 15.4 开源项目

- **Sentry JavaScript SDK** - https://github.com/getsentry/sentry-javascript - 业界标杆错误监控
- **tracekit** - https://github.com/csnover/TraceKit - 跨浏览器堆栈追踪归一化
- **error-stack-parser** - https://github.com/stacktracejs/error-stack-parser - 堆栈解析库
- **source-map** - https://github.com/mozilla/source-map - Mozilla SourceMap 还原库
- **ow** - https://github.com/kamilkisiela/ow - 函数式参数校验库
- **zod** - https://github.com/colinhacks/zod - TypeScript 优先的 Schema 校验库
- **superstruct** - https://github.com/ianstormtaylor/superstruct - 另一个流行的校验库

### 15.5 在线资源

- **MDN Error Reference** - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
- **V8 Stack Trace API** - https://v8.dev/docs/stack-trace-api
- **Node.js Error Documentation** - https://nodejs.org/api/errors.html
- **TC39 Proposal Process** - https://tc39.es/process-document/

---

## 16. 附录

### 附录 A：内置 Error 类型快速参考

| 错误类型 | 触发场景 | 典型示例 |
| --- | --- | --- |
| `Error` | 用户主动抛出 | `throw new Error('...')` |
| `TypeError` | 类型不匹配 | `undefined.foo` |
| `RangeError` | 值越界 | `new Array(-1)` |
| `ReferenceError` | 变量未定义 | `console.log(notDefined)` |
| `SyntaxError` | 语法错误 | `eval('if (true) {')` |
| `URIError` | URI 处理错误 | `decodeURIComponent('%')` |
| `EvalError` | 已废弃 | 现代引擎不再抛出 |
| `AggregateError` | 批量错误聚合（ES2021） | `Promise.any` 全失败 |

### 附录 B：Error 对象属性一览

| 属性 | 类型 | 标准 | 说明 |
| --- | --- | --- | --- |
| `name` | string | ES3 | 错误类型名 |
| `message` | string | ES3 | 错误描述 |
| `stack` | string | 非标准 | 堆栈追踪（V8/SpiderMonkey/JSC） |
| `cause` | Error | ES2022 | 错误链上游 |
| `errors` | Error[] | ES2021 | AggregateError 专属 |
| `code` | string | Node.js 扩展 | 错误码（如 `ENOENT`） |
| `fileName` | string | SpiderMonkey | 文件名 |
| `lineNumber` | number | SpiderMonkey | 行号 |
| `columnNumber` | number | SpiderMonkey | 列号 |

### 附录 C：Error.captureStackTrace 用法

```javascript
// V8 专有 API：自定义堆栈起点
class MyError extends Error {
  constructor(message) {
    super(message);
    // 跳过 MyError 构造函数，让 stack 从 new MyError() 调用点开始
    Error.captureStackTrace(this, MyError);
  }
}

// 自定义 prepareStackTrace
Error.prepareStackTrace = (err, sites) => {
  return sites.map(s => s.getFileName() + ':' + s.getLineNumber()).join('\n');
};

// 调整堆栈深度
Error.stackTraceLimit = 50;  // 默认 10
```

### 附录 D：TypeScript 类型增强

```typescript
// 扩展 Error 接口以携带业务字段
interface AppErrorOptions {
  code?: string;
  statusCode?: number;
  details?: unknown;
  cause?: unknown;
}

class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: unknown;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = options.code || 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode || 500;
    this.details = options.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// 类型守卫
function isAppError(e: unknown): e is AppError {
  return e instanceof Error && 'code' in e && 'statusCode' in e;
}

function isAggregateError(e: unknown): e is AggregateError {
  return e instanceof Error && Array.isArray((e as any).errors);
}
```

### 附录 E：错误码命名规范

推荐遵循以下错误码命名规范：

```
<DOMAIN>_<ENTITY>_<REASON>

示例：
  AUTH_USER_NOT_FOUND
  AUTH_TOKEN_EXPIRED
  ORDER_NOT_FOUND
  ORDER_STATUS_INVALID
  PAYMENT_DECLINED
  PAYMENT_INSUFFICIENT_FUNDS
  INVENTORY_OUT_OF_STOCK
  NETWORK_TIMEOUT
  NETWORK_DNS_FAILURE
  VALIDATION_REQUIRED_FIELD
  VALIDATION_TYPE_MISMATCH
```

错误码全大写下划线分隔，便于跨语言使用、日志检索与监控告警分组。

---

## 17. 修订日志

| 日期 | 版本 | 修订内容 | 修订人 |
| --- | --- | --- | --- |
| 2026-06-14 | v1.0 | 初版：自定义错误类、Error Cause、AggregateError 基础示例 | fanquanpp |
| 2026-07-20 | v2.0 | 金标准升级：扩展至 16 章节，新增形式化定义、V8 堆栈 API、错误监控 SDK、Sentry 集成、5 个案例研究、4 类习题、ACM 参考文献、词源条目；行数从 101 扩展至约 1800+ | FANDEX Content Engineering Team |

---

> **结语**：自定义 Error 不仅是"抛出带类型的错误"那么简单，它是构建大型可维护应用的基础设施。一个设计良好的错误体系能让监控更精准、调试更高效、用户体验更友好。掌握 ES2022 Error Cause 与 ES2021 AggregateError 这两个现代语言特性，结合 Sentry 等监控工具，是现代 JavaScript 工程师的必备能力。
