---
order: 110
title: 错误边界与全局错误捕获
module: javascript
category: 'dev-lang'
difficulty: advanced
description: JavaScript错误边界与全局错误捕获：ErrorBoundary、window.onerror、unhandledrejection。
author: fanquanpp
updated: '2026-06-14'
related:
  - javascript/原型与继承
  - javascript/正则表达式
  - javascript/内存泄漏排查
  - 'javascript/Web API与浏览器接口'
prerequisites:
  - javascript/语法速查
---

# 错误边界与全局错误捕获

## 1. 学习目标（Bloom 分类）

读完本文后，读者应能够达到以下认知层次：

| 层次 | 行为目标 | 具体能力描述 |
| --- | --- | --- |
| 记忆（Remember） | 列出 JavaScript 主要错误类型与触发场景 | 能在 1 分钟内说出 7 种内建错误类型 |
| 理解（Understand） | 解释 `try/catch` 与 `window.onerror` 的执行差异 | 能说明同步、异步、Promise 错误捕获边界 |
| 应用（Apply） | 在项目中实现 ErrorBoundary、全局错误监听 | 能写出可上线的错误收集 SDK 雏形 |
| 分析（Analyze） | 区分不同错误捕获方式的作用域与限制 | 能定位错误未被捕获的根本原因 |
| 评价（Evaluate） | 评估错误监控方案对性能与体验的影响 | 能根据业务场景设计错误上报策略 |
| 创造（Create） | 设计完整的错误监控系统架构 | 能实现错误聚合、采样、上下文收集的完整系统 |

学习本课前，建议先掌握：try/catch、Promise、async/await、EventTarget、原型链继承。

---

## 2. 历史动机：为什么需要错误边界

### 2.1 浏览器错误处理的传统局限

在早期浏览器中，错误处理非常原始：

- **IE6 时代**：错误信息只能通过 `window.onerror` 获取，且常被浏览器自身的"脚本错误"屏蔽（跨域脚本）。
- **同源策略限制**：跨域 `<script src>` 的错误会被浏览器改写为 `Script error.`，无法获取真实堆栈。
- **Promise 错误丢失**：ES6 之前没有 Promise，ES6 引入 Promise 后未捕获的 rejection 会被静默丢弃，导致调试困难。
- **React 类组件崩溃**：子组件抛出错误会卸载整棵组件树，用户体验极差。

### 2.2 React ErrorBoundary 的诞生

2017 年 React 16 引入 Error Boundary（错误边界），通过生命周期方法 `componentDidCatch`（后增 `static getDerivedStateFromError`）捕获子组件树渲染中的错误。其设计动机：

- 子组件抛出错误不应让整个应用白屏。
- 错误应被隔离，应用其他部分继续可用。
- 错误信息可上报到监控系统，便于追踪。

### 2.3 现代 Web 的全局错误处理体系

| 错误来源 | 捕获机制 | 触发条件 |
| --- | --- | --- |
| 同步代码错误 | `try/catch` | 运行时抛出 |
| 异步回调错误 | `try/catch` + setTimeout 内部包裹 | 回调函数内抛出 |
| Promise rejection | `.catch()` 或 `window.unhandledrejection` | Promise rejected 未处理 |
| async/await 错误 | `try/catch` 包裹 await | await 抛出 |
| 资源加载错误 | `error` 事件 + `useCapture: true` | `<img>`、`<script>` 加载失败 |
| Web Worker 错误 | `worker.onerror` 或 `messageerror` 事件 | Worker 内部抛出 |
| Service Worker 错误 | `self.addEventListener('error')` | SW 内部抛出 |
| React 渲染错误 | ErrorBoundary 组件 | 子组件渲染抛出 |
| Vue 渲染错误 | `errorCaptured` 钩子 | 子组件渲染抛出 |

### 2.4 错误监控的商业价值

错误监控是 SRE（Site Reliability Engineering）的核心环节。一个完整的错误监控系统能：

- 减少故障响应时间（MTTD）：从用户投诉到自动告警，时间从小时级降到分钟级。
- 提升用户体验：错误率从 5% 降到 0.1%，用户留存率可提升 15-30%。
- 辅助工程决策：通过错误聚合识别热点模块，指导重构优先级。
- 满足合规要求：金融、医疗等行业对故障追溯有强制要求。

---

## 3. 形式化定义

### 3.1 错误对象的规范结构

ECMAScript 规范定义 `Error` 对象的标准属性：

| 属性 | 类型 | 来源 | 描述 |
| --- | --- | --- | --- |
| `message` | String | 构造函数参数 | 人类可读的错误描述 |
| `name` | String | `constructor.name` 或显式赋值 | 错误类型名称 |
| `stack` | String | 引擎非标准实现 | 调用堆栈信息 |
| `cause` | Any | ES2022 构造函数 options | 原始错误，用于错误链 |
| `code` | Any | 用户自定义 | 业务错误码 |
| `toString()` | Method | `Error.prototype` | 返回 `name: message` |

形式化定义：

$$
Error = (name, message, stack?, cause?, code?)
$$

ES2022 标准化 `cause`：

```javascript
try {
  JSON.parse(invalidJson);
} catch (e) {
  throw new Error('Parse failed', { cause: e });
  // 错误链：新错误 -> 原始错误
}
```

### 3.2 错误捕获的形式化模型

定义"错误传播路径" $E(e)$ 为错误 $e$ 从抛出点到最终处理的传播序列：

$$
E(e) = [throwPoint, catchPoint_1, ..., catchPoint_n | globalHandler]
$$

错误传播规则：

$$
propagate(e) = \begin{cases}
caught & \text{若 } \exists catch_i \text{ 在同一执行栈中} \\
unhandled & \text{若调用栈为空且无全局处理器}
\end{cases}
$$

### 3.3 同步与异步错误的形式化区别

**同步错误**：在调用栈中传播，可被 `try/catch` 捕获。

$$
\text{throw } e \Rightarrow \text{沿调用栈向上传播，直到 } catch \text{ 或栈空}
$$

**异步错误**：在新的调用栈中抛出，原调用栈的 `try/catch` 无法捕获。

$$
\text{setTimeout}(fn, 0); \quad fn \text{ 内抛出的错误在新栈中传播}
$$

**Promise 错误**：通过 reject 传递，需 `.catch` 或 `try/await` 捕获。

$$
\text{Promise.reject}(e) \Rightarrow \text{由 } .catch \text{ 或 } unhandledrejection \text{ 处理}
$$

形式化对比：

| 错误类型 | 调用栈 | 捕获方式 | 全局兜底 |
| --- | --- | --- | --- |
| 同步错误 | 当前栈 | `try/catch` | `window.onerror` |
| setTimeout 异步 | 新栈 | 内部 `try/catch` | `window.onerror` |
| Promise rejection | 无栈 | `.catch()` 或 `try/await` | `unhandledrejection` |
| async/await | 异步函数内同步 | `try/catch` 包裹 await | `unhandledrejection` |
| 资源加载错误 | 无 JS 调用栈 | EventListener | 无（仅监听） |

### 3.4 React ErrorBoundary 的形式化契约

ErrorBoundary 类组件需实现以下任一方法：

$$
ErrorBoundary \equiv \text{class implementing } (getDerivedStateFromError \lor componentDidCatch)
$$

```javascript
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    // 渲染阶段调用，用于更新 state 触发 fallback UI
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // 提交阶段调用，用于副作用（如日志上报）
    logErrorToService(error, info);
  }
  render() {
    if (this.state.hasError) return <Fallback />;
    return this.props.children;
  }
}
```

注意：`getDerivedStateFromError` 在渲染阶段调用，**不可有副作用**；`componentDidCatch` 在提交阶段调用，可做副作用。两者配合实现 UI 兜底 + 日志上报。

---

## 4. 理论推导

### 4.1 错误对象的继承链

JavaScript 内建 7 种错误类型，构成原型链：

```
Error
├── EvalError
├── RangeError
├── ReferenceError
├── SyntaxError
├── TypeError
├── URIError
└── AggregateError (ES2021)
```

原型链验证：

```javascript
console.log(Object.getPrototypeOf(TypeError) === Error); // true
console.log(Object.getPrototypeOf(RangeError) === Error); // true
console.log(Object.getPrototypeOf(Error) === Function.prototype); // true
console.log(Object.getPrototypeOf(Error.prototype) === Object.prototype); // true
```

每个错误类型的实例属性：

```javascript
const e = new TypeError('Wrong type');
console.log(e.name); // 'TypeError'
console.log(e.message); // 'Wrong type'
console.log(e instanceof TypeError); // true
console.log(e instanceof Error); // true
console.log(e instanceof Object); // true
```

### 4.2 `try/catch/finally` 的执行模型

`try/catch/finally` 是同步错误处理的唯一结构。其语义：

```
try {
  // 可能抛出错误的代码
} catch (error) {
  // error 是被捕获的错误对象（仅在 catch 块内有效）
} finally {
  // 无论是否抛出错误都会执行
}
```

执行流程：

1. 进入 try 块执行。
2. 若 try 抛出错误，立即跳转到 catch 块，错误对象绑定到 `error`。
3. 若 try 正常完成，跳过 catch。
4. 无论上述结果，执行 finally。
5. 若 finally 中 `return` 或 `throw`，会覆盖 try/catch 的返回值或抛出。

陷阱：finally 中的 `return` 会覆盖 try 中的 `return`：

```javascript
function f() {
  try {
    return 1;
  } finally {
    return 2; // 覆盖 try 的 return 1
  }
}
console.log(f()); // 2
```

陷阱：finally 中的 `throw` 会覆盖 try 中的 `throw`：

```javascript
function g() {
  try {
    throw new Error('A');
  } finally {
    throw new Error('B'); // 覆盖 Error('A')
  }
}
try {
  g();
} catch (e) {
  console.log(e.message); // 'B'
}
```

### 4.3 异步错误的"丢失"机制

```javascript
try {
  setTimeout(() => {
    throw new Error('async');
  }, 0);
} catch (e) {
  console.log('caught', e); // 不会执行
}
```

执行流程：

1. `setTimeout` 注册回调，立即返回。
2. try 块正常结束，未捕获任何错误。
3. 事件循环下一个 tick 执行回调。
4. 回调抛出错误，此时调用栈是新的，try 块早已退出。
5. 错误冒泡到全局，触发 `window.onerror`。

形式化：异步代码的 try 必须包裹回调内部：

```javascript
setTimeout(() => {
  try {
    throw new Error('async');
  } catch (e) {
    console.log('caught', e); // 正确捕获
  }
}, 0);
```

### 4.4 Promise 错误传播规则

Promise 的 reject 状态通过 `.then` 的第二个参数或 `.catch` 传递：

```javascript
Promise.reject(new Error('fail'))
  .then(() => console.log('a')) // 跳过（rejected 状态）
  .then(() => console.log('b')) // 跳过
  .catch((e) => console.log('caught', e.message)) // 捕获
  .then(() => console.log('d')); // 执行（catch 后变为 fulfilled）
// 输出：caught fail, d
```

链式错误传播规则：

- `.then(onFulfilled, onRejected)`：若 onFulfilled 抛错，下一个 `.catch` 捕获；若 onRejected 抛错，下一个 `.catch` 捕获。
- `.catch(onRejected)`：等价于 `.then(undefined, onRejected)`。
- 链中任何 `.catch` 后的 `.then` 都会被执行（因为 catch 返回 fulfilled Promise）。

### 4.5 async/await 错误转换

`async/await` 是 Promise 的语法糖，错误处理通过 `try/catch`：

```javascript
async function fetchUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    console.log('caught', e.message);
    throw e; // 重新抛出，让外层处理
  }
}

fetchUser(1).catch(e => console.log('outer', e.message));
```

`await` 将 Promise rejection 转换为同步抛出，使得 try/catch 可捕获。

### 4.6 全局错误处理的事件模型

浏览器提供以下全局错误事件：

| 事件名 | 触发对象 | 触发条件 | 事件对象 |
| --- | --- | --- | --- |
| `error` | `window` | 同步错误、资源加载错误 | `ErrorEvent` |
| `unhandledrejection` | `window` | Promise rejection 未处理 | `PromiseRejectionEvent` |
| `rejectionhandled` | `window` | 之前未处理的 rejection 被后续 `.catch` 处理 | `PromiseRejectionEvent` |

事件对象关键属性：

```javascript
window.addEventListener('error', (event) => {
  console.log(event.message); // 错误信息
  console.log(event.filename); // 文件 URL
  console.log(event.lineno); // 行号
  console.log(event.colno); // 列号
  console.log(event.error); // Error 对象（同源时可用）
  console.log(event.target); // 资源元素（资源错误时）
});

window.addEventListener('unhandledrejection', (event) => {
  console.log(event.reason); // rejection 原因（Error 或值）
  console.log(event.promise); // 触发的 Promise
  event.preventDefault(); // 阻止控制台报错
});
```

---

## 5. 代码示例

### 5.1 基础错误类型与抛出

```javascript
// 抛出不同类型的错误
throw new Error('Generic error');
throw new TypeError('Expected number');
throw new RangeError('Index out of bounds');
throw new ReferenceError('x is not defined');
throw new SyntaxError('Unexpected token');
throw new URIError('Malformed URI sequence');
throw new EvalError('Eval not allowed');

// 抛出非 Error 对象（不推荐，但合法）
throw 'string error';
throw { code: 500, msg: 'server error' };
throw 42;
```

### 5.2 自定义错误类

```javascript
class AppError extends Error {
  constructor(message, { code, cause, context } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    // 修复原型链（Babel 等编译器需要）
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      cause: this.cause ? String(this.cause) : undefined,
      stack: this.stack,
    };
  }
}

class NetworkError extends AppError {
  constructor(message, { url, status, ...rest } = {}) {
    super(message, { code: 'NETWORK_ERROR', ...rest });
    this.url = url;
    this.status = status;
  }
}

class ValidationError extends AppError {
  constructor(message, { field, value, ...rest } = {}) {
    super(message, { code: 'VALIDATION_ERROR', ...rest });
    this.field = field;
    this.value = value;
  }
}

// 使用
try {
  throw new NetworkError('Request timeout', { url: '/api', status: 408 });
} catch (e) {
  if (e instanceof NetworkError) {
    console.error('Network issue:', e.url, e.status);
  } else if (e instanceof AppError) {
    console.error('App error:', e.code);
  }
}
```

### 5.3 全局错误监听

```javascript
// 同步错误与资源加载错误
window.addEventListener('error', (event) => {
  // 区分 JS 错误与资源错误
  if (event.target && event.target !== window) {
    // 资源加载错误（img/script/link 等）
    const target = event.target;
    console.log('Resource failed:', target.tagName, target.src || target.href);
  } else {
    // JS 错误
    const { message, filename, lineno, colno, error } = event;
    reportError({
      type: 'js',
      message,
      filename,
      lineno,
      colno,
      stack: error?.stack,
    });
  }
  // 阻止默认行为（控制台报错）
  // event.preventDefault(); // 谨慎使用，会屏蔽开发反馈
}, true); // 必须使用捕获阶段！

// Promise 未处理 rejection
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const promise = event.promise;
  reportError({
    type: 'promise',
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });
  event.preventDefault(); // 阻止控制台报错
});

// 之前未处理但后来被处理的 rejection
window.addEventListener('rejectionhandled', (event) => {
  console.log('Late catch:', event.reason);
});
```

注意：**资源加载错误必须用捕获阶段**（第三个参数 `true`），因为 error 事件不会冒泡。

### 5.4 React ErrorBoundary 实现

```javascript
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    // 渲染阶段调用，更新 state 触发 fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // 提交阶段调用，做副作用
    this.setState({ info });
    reportError({
      type: 'react',
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={this.handleReset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 使用
function App() {
  return (
    <ErrorBoundary fallback={(error, reset) => <ErrorUI error={error} onRetry={reset} />}>
      <Header />
      <ErrorBoundary>
        <Main />
      </ErrorBoundary>
      <Footer />
    </ErrorBoundary>
  );
}
```

注意：

- ErrorBoundary 只能捕获**子组件树**渲染、生命周期、构造函数中的错误，不能捕获事件处理器、异步代码、SSR 错误。
- ErrorBoundary 不能捕获自身错误，需嵌套使用。
- 函数组件没有 ErrorBoundary，需借助第三方库（如 `react-error-boundary`）或自己包装。

### 5.5 Vue 错误处理

```javascript
// Vue 3 全局错误处理器
const app = Vue.createApp({});
app.config.errorHandler = (err, vm, info) => {
  reportError({
    type: 'vue',
    message: err.message,
    stack: err.stack,
    info,
  });
};

// 组件内错误捕获
export default {
  name: 'ParentComponent',
  errorCaptured(err, vm, info) {
    // 捕获子组件错误
    this.error = err;
    return false; // 阻止错误继续向上传播
  },
  data() {
    return { error: null };
  },
  template: '<div v-if="error">Error: {{ error.message }}</div><slot v-else />',
};
```

### 5.6 Node.js 全局错误处理

```javascript
// Node.js 全局未捕获异常
process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err);
  // 严重：进程状态可能不一致，建议重启
  // 生产环境：记录后立即 process.exit(1)，由 PM2/systemd 重启
});

// 未处理的 Promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled:', reason);
});

// 多核集群模式下，使用 cluster + 进程重启
const cluster = require('cluster');
if (cluster.isMaster) {
  for (let i = 0; i < 4; i++) cluster.fork();
  cluster.on('exit', (worker, code) => {
    console.log(`Worker ${worker.process.pid} died (${code}), restarting...`);
    cluster.fork();
  });
} else {
  require('./app');
}
```

### 5.7 Web Worker 错误处理

```javascript
// 主线程
const worker = new Worker('worker.js');

worker.onerror = (e) => {
  console.log('Worker error:', e.message, e.filename, e.lineno);
  e.preventDefault(); // 阻止冒泡到 window.onerror
};

worker.onmessageerror = (e) => {
  console.log('Message error:', e.data);
};

// worker.js
self.addEventListener('error', (e) => {
  // 在 worker 内捕获错误
  self.postMessage({ type: 'error', message: e.message });
});

self.addEventListener('unhandledrejection', (e) => {
  self.postMessage({ type: 'rejection', reason: e.reason });
});
```

### 5.8 跨域脚本的 `Script error`

```html
<!-- 没有配置 crossorigin 的跨域脚本，错误会变成 'Script error.' -->
<script src="https://cdn.example.com/lib.js"></script>

<!-- 正确配置 -->
<script src="https://cdn.example.com/lib.js" crossorigin="anonymous"></script>
```

服务器需返回 CORS 头：

```
Access-Control-Allow-Origin: *
```

配置后，浏览器允许读取真实错误堆栈。否则 `window.onerror` 只能拿到 `Script error.`、空文件名、行号 0。

---

## 6. 对比分析

### 6.1 错误捕获方案对比

| 方案 | 覆盖范围 | 性能影响 | 实现复杂度 | 适用场景 |
| --- | --- | --- | --- | --- |
| `try/catch` | 同步、async/await | 极低 | 简单 | 局部错误处理 |
| `window.onerror` | 同步、setTimeout | 极低 | 简单 | 全局兜底 |
| `unhandledrejection` | Promise rejection | 极低 | 简单 | Promise 兜底 |
| ErrorBoundary | React 子树 | 低 | 中 | React 应用 |
| `errorCaptured` | Vue 子树 | 低 | 中 | Vue 应用 |
| `addEventListener('error', ..., true)` | 资源加载 | 极低 | 简单 | 静态资源监控 |
| `process.on('uncaughtException')` | Node.js 全局 | 极低 | 简单 | Node 服务端 |
| APM SDK (Sentry/Bugsnag) | 全方位 | 中 | 中 | 商业级监控 |

### 6.2 `try/catch` 与全局监听的差异

| 维度 | `try/catch` | 全局监听 |
| --- | --- | --- |
| 作用域 | 局部（指定代码块） | 全局（整个应用） |
| 控制 | 可恢复、可转换 | 仅记录，无法恢复 |
| 性能 | 几乎无影响（V8 优化） | 监听器开销 |
| 异步覆盖 | 仅当前调用栈 | setTimeout、Promise 均覆盖 |
| 资源错误 | 不覆盖 | 覆盖（捕获阶段） |
| SSR 兼容 | 是 | 否（Node 端用 process.on） |

### 6.3 Sentry vs 自建监控系统

| 维度 | Sentry | 自建 |
| --- | --- | --- |
| 接入成本 | 5 分钟 | 数周 |
| 功能 | 完整（聚合、Source Map、Release Tracking） | 按需定制 |
| 定价 | 免费 5K errors/月，付费 $26+/月 | 服务器成本 |
| 数据隐私 | 上传到 Sentry 服务器 | 完全自控 |
| 定制性 | 中 | 高 |
| 推荐 | 中小团队、快速接入 | 大型团队、合规要求高 |

---

## 7. 常见陷阱

### 7.1 异步错误未被 try/catch 捕获

```javascript
// 反模式
try {
  setTimeout(() => {
    throw new Error('boom');
  }, 0);
} catch (e) {
  console.log('caught'); // 不会执行
}
```

修复：将 try/catch 移到回调内部，或用全局监听。

### 7.2 Promise 链未 `.catch`

```javascript
// 反模式
fetch('/api').then((res) => res.json()).then((data) => console.log(data));
// 若 fetch 失败，会触发 unhandledrejection

// 正确
fetch('/api')
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((err) => console.error('Failed:', err));
```

### 7.3 async 函数未 await

```javascript
// 反模式
async function save() {
  try {
    api.save(); // 忘记 await，错误丢失
  } catch (e) {
    console.error(e); // 不会执行
  }
}

// 正确
async function save() {
  try {
    await api.save();
  } catch (e) {
    console.error(e);
  }
}
```

### 7.4 ErrorBoundary 不能捕获事件处理器错误

```javascript
class Counter extends React.Component {
  state = { count: 0 };
  handleClick = () => {
    throw new Error('boom'); // 不会被 ErrorBoundary 捕获！
  };
  render() {
    return <button onClick={this.handleClick}>{this.state.count}</button>;
  }
}
```

React 设计如此，因为事件处理器不属于渲染流程。需在事件处理器内自己 try/catch。

### 7.5 `error` 事件不冒泡

```javascript
// 反模式：在冒泡阶段监听 img 错误
document.body.addEventListener('error', (e) => {
  console.log('caught'); // 不会执行
});

// 正确：在捕获阶段监听
window.addEventListener('error', (e) => {
  console.log('caught', e.target.src); // 触发
}, true);
```

### 7.6 `Error.prototype.stack` 非标准

```javascript
const e = new Error('test');
console.log(e.stack); // 各引擎格式不同
```

不同引擎（V8、SpiderMonkey、JSC）的 stack 格式不同，解析需用 `stacktracejs` 等库。生产环境需通过 Source Map 还原压缩后代码的真实堆栈。

### 7.7 跨域脚本错误屏蔽

```javascript
// CDN 上的脚本错误会被屏蔽
<script src="https://cdn.example.com/lib.js"></script>
// window.onerror 拿到 'Script error.'，无堆栈

// 修复：服务器返回 CORS 头 + 客户端加 crossorigin
<script src="https://cdn.example.com/lib.js" crossorigin="anonymous"></script>
```

### 7.8 Node.js `uncaughtException` 后的进程状态

```javascript
// 反模式
process.on('uncaughtException', (err) => {
  console.log('继续运行'); // 危险！进程状态可能不一致
});

// 正确
process.on('uncaughtException', (err) => {
  logger.fatal('Uncaught', err);
  process.exit(1); // 由 supervisor 重启
});
```

Node.js 官方建议：捕获后立即退出，由外部进程管理器（PM2、systemd、Docker）重启。

### 7.9 finally 中返回值

```javascript
function f() {
  try {
    return 1;
  } catch (e) {
    return 2;
  } finally {
    return 3; // 总是返回 3，吞掉所有错误！
  }
}
console.log(f()); // 3

function g() {
  try {
    throw new Error('boom');
  } finally {
    // 没 catch，错误会被 finally 的 return 吞掉
    return 'ok'; // 实际返回 'ok'，错误被吞
  }
}
console.log(g()); // 'ok'
```

### 7.10 `error` 与 `unhandledrejection` 的边界

```javascript
// Promise 抛出同步错误，触发 unhandledrejection 而非 error
Promise.resolve().then(() => {
  throw new Error('in promise');
});
// 触发 unhandledrejection，不触发 window.onerror

// async 函数抛出
async function f() {
  throw new Error('in async');
}
f();
// 同样触发 unhandledrejection
```

---

## 8. 工程实践

### 8.1 错误监控 SDK 雏形

```javascript
class ErrorMonitor {
  constructor(options = {}) {
    this.endpoint = options.endpoint || '/api/errors';
    this.sampleRate = options.sampleRate || 1.0;
    this.appVersion = options.appVersion;
    this.userId = options.userId;
    this.buffer = [];
    this.flushTimer = null;
    this.install();
  }

  install() {
    window.addEventListener('error', this.onError.bind(this), true);
    window.addEventListener('unhandledrejection', this.onRejection.bind(this));
    this.patchConsole();
    this.startFlushTimer();
  }

  onError(event) {
    if (event.target !== window) {
      // 资源错误
      this.report({
        type: 'resource',
        tagName: event.target.tagName,
        url: event.target.src || event.target.href,
      });
      return;
    }
    const { message, filename, lineno, colno, error } = event;
    this.report({
      type: 'js',
      message,
      filename,
      lineno,
      colno,
      stack: error?.stack,
    });
  }

  onRejection(event) {
    const reason = event.reason;
    this.report({
      type: 'promise',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    event.preventDefault();
  }

  patchConsole() {
    const original = console.error;
    console.error = (...args) => {
      this.report({
        type: 'console.error',
        args: args.map((a) => String(a)),
      });
      original.apply(console, args);
    };
  }

  report(error) {
    if (Math.random() > this.sampleRate) return; // 采样
    error.timestamp = Date.now();
    error.url = location.href;
    error.userAgent = navigator.userAgent;
    error.appVersion = this.appVersion;
    error.userId = this.userId;
    this.buffer.push(error);
    if (this.buffer.length >= 10) this.flush();
  }

  startFlushTimer() {
    this.flushTimer = setInterval(() => this.flush(), 5000);
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    try {
      // 使用 sendBeacon 避免页面卸载时丢失
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ errors: batch })], {
          type: 'application/json',
        });
        navigator.sendBeacon(this.endpoint, blob);
      } else {
        await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ errors: batch }),
          keepalive: true,
        });
      }
    } catch (e) {
      // 上报失败，错误放回 buffer
      this.buffer.unshift(...batch);
    }
  }

  destroy() {
    window.removeEventListener('error', this.onError, true);
    window.removeEventListener('unhandledrejection', this.onRejection);
    clearInterval(this.flushTimer);
    this.flush();
  }
}

const monitor = new ErrorMonitor({
  endpoint: '/api/errors',
  sampleRate: 1.0,
  appVersion: '1.2.3',
});
```

### 8.2 Source Map 解析

生产环境通常压缩代码，stack 中的行号对应压缩后代码。需通过 Source Map 还原：

```javascript
const { SourceMapConsumer } = require('source-map');

async function parseStack(stack, sourceMap) {
  const consumer = await new SourceMapConsumer(sourceMap);
  const lines = stack.split('\n');
  const parsed = lines.map((line) => {
    const match = line.match(/at (.+) \((.+):(\d+):(\d+)\)/);
    if (!match) return line;
    const [, fn, file, lineNum, colNum] = match;
    const pos = consumer.originalPositionFor({
      line: parseInt(lineNum),
      column: parseInt(colNum),
    });
    return `at ${pos.name || fn} (${pos.source}:${pos.line}:${pos.column})`;
  });
  consumer.destroy();
  return parsed.join('\n');
}
```

**重要安全提示**：Source Map 文件**不应公开访问**，否则攻击者可还原源码。常见做法：

- Source Map 仅存在于服务器，构建产物不上传。
- 上传到独立的内部服务，监控 SDK 通过 ID 查询。
- 配置 CDN/Nginx 拒绝外部访问 `.map` 文件。

### 8.3 错误聚合

```javascript
function aggregateErrors(errors) {
  const groups = new Map();
  for (const err of errors) {
    // 用 message + 文件 + 行号 作为指纹
    const key = `${err.message}@${err.filename}:${err.lineno}`;
    if (!groups.has(key)) {
      groups.set(key, { ...err, count: 0, occurrences: [] });
    }
    const group = groups.get(key);
    group.count++;
    group.occurrences.push({
      timestamp: err.timestamp,
      userId: err.userId,
    });
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}
```

### 8.4 用户反馈机制

```javascript
class FeedbackDialog {
  constructor(monitor) {
    this.monitor = monitor;
  }

  show(error) {
    const dialog = document.createElement('div');
    dialog.className = 'error-feedback';
    dialog.innerHTML = `
      <h3>抱歉，发生了一个错误</h3>
      <p>${error.message}</p>
      <textarea placeholder="请描述您遇到的问题（可选）"></textarea>
      <button class="submit">提交反馈</button>
      <button class="dismiss">关闭</button>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('.submit').addEventListener('click', () => {
      const comment = dialog.querySelector('textarea').value;
      this.monitor.report({
        type: 'user_feedback',
        message: error.message,
        comment,
        stack: error.stack,
      });
      document.body.removeChild(dialog);
    });
    dialog.querySelector('.dismiss').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }
}
```

### 8.5 React 错误边界分层

```javascript
// 顶层：捕获所有，显示致命错误页面
class AppBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    reportError({ type: 'app_boundary', error, info });
  }
  render() {
    return this.state.hasError ? <FatalErrorPage /> : this.props.children;
  }
}

// 区块级：捕获局部，显示区块 fallback
class SectionBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    reportError({ type: 'section_boundary', section: this.props.name, error, info });
  }
  render() {
    return this.state.hasError ? (
      <div className="section-fallback">该区块加载失败</div>
    ) : (
      this.props.children
    );
  }
}

// 使用
function App() {
  return (
    <AppBoundary>
      <Header />
      <SectionBoundary name="sidebar">
        <Sidebar />
      </SectionBoundary>
      <SectionBoundary name="content">
        <Main />
      </SectionBoundary>
      <Footer />
    </AppBoundary>
  );
}
```

### 8.6 错误降级与重试

```javascript
class RetryBoundary extends React.Component {
  state = { hasError: false, retryCount: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError({ error, info, retryCount: this.state.retryCount });
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, retryCount: s.retryCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      if (this.state.retryCount >= 3) {
        return <div>多次重试失败，请联系客服</div>;
      }
      return (
        <div>
          加载失败
          <button onClick={this.handleRetry}>重试 ({this.state.retryCount}/3)</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 8.7 性能考量

- **采样**：高流量应用全量上报成本高，按 1-10% 采样。
- **节流**：单个用户 1 分钟内同类错误只上报一次。
- **批量**：用 `navigator.sendBeacon` 批量上报，避免每个错误一次请求。
- **白屏时间**：错误处理不应阻塞主渲染，关键路径上避免复杂逻辑。

```javascript
class ThrottledMonitor extends ErrorMonitor {
  constructor(options) {
    super(options);
    this.lastReport = new Map();
  }

  report(error) {
    const key = `${error.type}:${error.message}`;
    const now = Date.now();
    const last = this.lastReport.get(key) || 0;
    if (now - last < 60000) return; // 1 分钟内同类错误只报一次
    this.lastReport.set(key, now);
    super.report(error);
  }
}
```

---

## 9. 案例研究

### 9.1 案例：构建完整错误监控 SDK

```javascript
class SentryLike {
  constructor(options) {
    this.dsn = options.dsn;
    this.release = options.release;
    this.environment = options.environment;
    this.user = null;
    this.tags = {};
    this.breadcrumbs = [];
    this.context = {};
    this.install();
  }

  setUser(user) {
    this.user = user;
  }

  setTag(key, value) {
    this.tags[key] = value;
  }

  setContext(name, value) {
    this.context[name] = value;
  }

  addBreadcrumb(breadcrumb) {
    this.breadcrumbs.push({
      timestamp: Date.now(),
      ...breadcrumb,
    });
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.shift();
    }
  }

  install() {
    // 全局错误
    window.addEventListener('error', (event) => {
      this.captureException(event.error || event.message, {
        type: 'error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(event.reason, { type: 'unhandledrejection' });
    });

    // 拦截 fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = Date.now();
      try {
        const response = await originalFetch.apply(window, args);
        this.addBreadcrumb({
          type: 'fetch',
          url: args[0],
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: Date.now() - start,
        });
        return response;
      } catch (error) {
        this.addBreadcrumb({
          type: 'fetch',
          url: args[0],
          method: args[1]?.method || 'GET',
          error: error.message,
          duration: Date.now() - start,
        });
        throw error;
      }
    };

    // 拦截 console.error
    const originalError = console.error;
    console.error = (...args) => {
      this.addBreadcrumb({
        type: 'console',
        level: 'error',
        args: args.map(String),
      });
      originalError.apply(console, args);
    };
  }

  captureException(error, extra = {}) {
    const event = {
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      release: this.release,
      environment: this.environment,
      user: this.user,
      tags: { ...this.tags },
      extra: extra,
      breadcrumbs: this.breadcrumbs.slice(),
      exception: {
        values: [
          {
            type: error.name || 'Error',
            value: error.message || String(error),
            stacktrace: this.parseStack(error.stack),
          },
        ],
      },
    };
    this.send(event);
  }

  captureMessage(message, level = 'info') {
    const event = {
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      release: this.release,
      environment: this.environment,
      user: this.user,
      level,
      message,
    };
    this.send(event);
  }

  parseStack(stack) {
    if (!stack) return null;
    const frames = [];
    const lines = stack.split('\n');
    for (const line of lines) {
      const match = line.match(/\s+at (.+) \((.+):(\d+):(\d+)\)/);
      if (match) {
        frames.push({
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3]),
          colno: parseInt(match[4]),
          in_app: !match[2].includes('node_modules'),
        });
      }
    }
    return { frames: frames.reverse() };
  }

  async send(event) {
    try {
      await fetch(this.dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
      });
    } catch (e) {
      console.warn('Failed to send error report:', e);
    }
  }
}

// 使用
const sentry = new SentryLike({
  dsn: 'https://api.example.com/errors',
  release: '1.2.3',
  environment: 'production',
});
sentry.setUser({ id: 'user-123', email: 'alice@example.com' });
sentry.setTag('feature', 'checkout');
```

### 9.2 案例：错误驱动的自动回滚

```javascript
class AutoRollback {
  constructor(options) {
    this.release = options.release;
    this.threshold = options.threshold || 0.05; // 5% 错误率触发回滚
    this.windowSize = options.windowSize || 60000; // 1 分钟窗口
    this.errors = [];
    this.total = 0;
    this.install();
  }

  install() {
    window.addEventListener('error', (e) => {
      this.total++;
      this.errors.push(Date.now());
      this.check();
    });
    window.addEventListener('unhandledrejection', (e) => {
      this.total++;
      this.errors.push(Date.now());
      this.check();
    });
  }

  check() {
    const now = Date.now();
    this.errors = this.errors.filter((t) => now - t < this.windowSize);
    const views = this.getViews();
    const errorRate = this.errors.length / views;
    if (errorRate > this.threshold) {
      this.triggerRollback();
    }
  }

  getViews() {
    // 假设有 PV 计数器
    return window.__pvCount || 1000;
  }

  async triggerRollback() {
    console.error(`Error rate exceeded, rolling back from ${this.release}`);
    try {
      await fetch('/api/rollback', {
        method: 'POST',
        body: JSON.stringify({ from: this.release, to: 'previous' }),
      });
      alert('系统检测到异常，已自动回滚到上一版本，请刷新页面');
      location.reload();
    } catch (e) {
      console.error('Rollback failed:', e);
    }
  }
}
```

### 9.3 案例：API 调用错误重试与降级

```javascript
class ApiClient {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.fallbackData = options.fallbackData || {};
  }

  async request(url, options = {}) {
    let lastError;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new NetworkError(`HTTP ${response.status}`, {
            url,
            status: response.status,
          });
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        if (error instanceof NetworkError && error.status >= 400 && error.status < 500) {
          // 4xx 错误不重试
          break;
        }
        // 5xx 或网络错误，等待后重试
        await new Promise((r) => setTimeout(r, this.retryDelay * Math.pow(2, i)));
      }
    }
    // 所有重试失败，返回降级数据
    reportError({
      type: 'api_failure',
      url,
      error: lastError.message,
      retries: this.maxRetries,
    });
    return this.fallbackData[url] || null;
  }
}

const api = new ApiClient({
  maxRetries: 3,
  fallbackData: {
    '/api/config': { theme: 'default', features: [] },
  },
});

const config = await api.request('/api/config');
```

---

## 10. 习题

### 10.1 基础题

1. 写出以下代码的输出：

```javascript
try {
  throw new Error('A');
} catch (e) {
  console.log(e.message);
  throw new Error('B');
} finally {
  console.log('finally');
}
```

参考答案：`A`、`finally`、然后抛出 `Error('B')`。

2. 解释为什么以下代码 `catch` 不到错误：

```javascript
try {
  setTimeout(() => { throw new Error('boom'); }, 0);
} catch (e) {
  console.log('caught');
}
```

参考答案：`setTimeout` 的回调在新的调用栈中执行，原 try 块已退出。

### 10.2 进阶题

3. 实现一个 `safeRun` 函数，捕获所有错误（同步、异步、Promise）：

```javascript
function safeRun(fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.catch((e) => console.error('Async:', e));
    }
    return result;
  } catch (e) {
    console.error('Sync:', e);
  }
}
```

4. 实现一个 `withRetry(fn, retries)` 函数：

```javascript
async function withRetry(fn, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw lastError;
}
```

### 10.3 应用题

5. 设计一个错误监控系统的数据结构（上报字段、聚合策略、采样规则）。

6. 实现一个 React ErrorBoundary，要求：
   - 捕获子组件错误
   - 显示 fallback UI
   - 提供"重试"按钮
   - 上报错误到服务端
   - 区分"渲染错误"和"事件处理器错误"

参考实现：

```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, retryCount: 0 };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    reportError({
      type: 'react',
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      retryCount: this.state.retryCount,
    });
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, error: null, retryCount: s.retryCount + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h3>出错了</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={this.handleRetry}>重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 10.4 思考题

7. 为什么 `error` 事件不冒泡？这一设计有什么好处与坏处？

8. 解释 `rejectionhandled` 事件的用途。

9. 比较 Node.js 中 `uncaughtException` 与 `unhandledRejection` 的处理建议差异。

### 10.5 调试题

10. 找出以下代码的问题并修复：

```javascript
// 期望：所有错误都被捕获
class App extends React.Component {
  handleClick = async () => {
    const data = await fetch('/api');
    this.setState({ data });
  };
  render() {
    return <button onClick={this.handleClick}>Load</button>;
  }
}
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

问题：fetch 错误不会被 ErrorBoundary 捕获（异步错误）。

修复：

```javascript
class App extends React.Component {
  handleClick = async () => {
    try {
      const data = await fetch('/api');
      this.setState({ data });
    } catch (e) {
      // 自己处理或上报
      reportError(e);
      this.setState({ error: e });
    }
  };
}
```

---

## 11. 参考文献

[1] Ecma International. 2024. ECMAScript 2024 Language Specification (ECMA-262, 15th Edition). Section 20.5 Error Objects. Retrieved from https://tc39.es/ecma262/

[2] WHATWG. 2024. HTML Living Standard — Error event. Retrieved from https://html.spec.whatwg.org/multipage/webappapis.html#errorevent

[3] React Team. 2023. React 16 Error Boundaries. React Documentation. Retrieved from https://react.dev/reference/react/Component#static-getderivedstatefromerror

[4] Vue Team. 2024. Vue 3 Error Handling. Vue Documentation. Retrieved from https://vuejs.org/api/application.html#app-config-errorhandler

[5] Node.js Foundation. 2024. Node.js Process API: uncaughtException. Retrieved from https://nodejs.org/api/process.html#event-uncaughtexception

[6] Nicholas C. Zakas. 2016. Understanding ECMAScript 6. No Starch Press. ISBN 978-1-59327-757-4.

[7] Mathias Bynens. 2019. V8 stack trace API. V8 Blog. Retrieved from https://v8.dev/docs/stack-trace-api

[8] Mozilla Developer Network. 2024. Error boundary. MDN Web Docs. Retrieved from https://developer.mozilla.org/en-US/docs/Glossary/Error_boundary

[9] Sentry. 2024. Sentry JavaScript SDK Documentation. Retrieved from https://docs.sentry.io/platforms/javascript/

[10] Ben Vinegar. 2015. Catching and reporting JavaScript errors from the client. Retrieved from https://blog.bugsnag.com/

[11] Estelle Weyl. 2018. Script error: What it means and how to fix it. Retrieved from https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

[12] Guy Bedford. 2022. ES2022 Error Cause. TC39 Proposal. Retrieved from https://github.com/tc39/proposal-error-cause

---

## 12. 延伸阅读

### 12.1 规范文档

- **ECMA-262 Error 章节**：<https://tc39.es/ecma262/#sec-error-objects>
- **WHATWG HTML error 事件**：<https://html.spec.whatwg.org/>
- **TC39 Error Cause 提案**：<https://github.com/tc39/proposal-error-cause>

### 12.2 商业监控服务

- **Sentry**：<https://sentry.io>
  最成熟的开源错误监控服务，支持 JS、Node、React、Vue 等。
- **Bugsnag**：<https://bugsnag.com>
  Focus on stability monitoring，提供 release tracking。
- **Rollbar**：<https://rollbar.com>
  Real-time error tracking，支持智能去重。
- **Raygun**：<https://raygun.com>
  Crash reporting + user tracking。
- **LogRocket**：<https://logrocket.com>
  录屏式错误回放，能复现用户操作过程。

### 12.3 开源工具

- **stacktrace.js**：<https://github.com/stacktracejs/stacktrace.js>
  跨浏览器解析堆栈的库。
- **source-map**：<https://github.com/mozilla/source-map>
  Source Map 解析与生成。
- **tracekit**：<https://github.com/csnover/TraceKit>
  老牌错误堆栈归一化库。
- **raven-js**：<https://github.com/getsentry/raven-js>
  Sentry 旧版 SDK（已被新版取代，但思路值得学习）。

### 12.4 经典书籍

- **《JavaScript Patterns》**（Stoyan Stefanov）
  第 6 章深入错误处理模式。
- **《Robust JavaScript》**（Nicolas Bevacqua, online）
  免费在线书籍，涵盖错误处理、异常模式。
- **《High Performance Browser Networking》**（Ilya Grigorik）
  网络错误与重试策略的理论基础。
- **《Release Engineering Best Practices》**（Google SRE Book）
  错误驱动的发布与回滚实践。

### 12.5 学术论文

- **"Finding and Fixing Bugs in JavaScript Programs with Static Analysis"** (FSE 2019)
  静态分析在错误预防中的应用。
- **"Error Handling in Asynchronous JavaScript"** (ICSE 2020)
  Promise 错误处理的实证研究。
- **"Empirical Study of JavaScript Errors"** (MSR 2017)
  JavaScript 错误的实证分析，揭示常见模式。

### 12.6 推荐实践

- 阅读 Sentry、Bugsnag SDK 源码，学习工业级错误收集实现。
- 阅读 React 官方文档关于 Error Boundary 的设计与限制。
- 阅读 Vue、Angular、Svelte 各自的错误处理机制，对比设计哲学。
- 在自己的项目中实践：从 `try/catch` 开始，逐步引入全局监听、Source Map 解析、错误聚合。

---

## 附录 A：错误类型速查表

| 错误类型 | 触发场景 | 示例 |
| --- | --- | --- |
| `Error` | 通用错误 | `throw new Error('msg')` |
| `TypeError` | 类型错误 | `undefined.foo` |
| `RangeError` | 范围错误 | `new Array(-1)`、栈溢出 |
| `ReferenceError` | 引用错误 | `console.log(x)` (x 未定义) |
| `SyntaxError` | 语法错误 | `eval('var x =')` |
| `EvalError` | eval 相关（已废弃） | 罕见 |
| `URIError` | URI 编解码错误 | `decodeURIComponent('%')` |
| `AggregateError` (ES2021) | 多错误聚合 | `Promise.any([p1, p2])` 全部失败 |

## 附录 B：浏览器全局错误事件

| 事件 | 触发条件 | 事件对象 | 阶段 |
| --- | --- | --- | --- |
| `error` (window) | 同步错误、setTimeout 错误 | `ErrorEvent` | 冒泡 |
| `error` (element) | 资源加载错误 | `Event` | 捕获 |
| `unhandledrejection` | Promise rejection 未处理 | `PromiseRejectionEvent` | 冒泡 |
| `rejectionhandled` | 之前未处理后来被处理 | `PromiseRejectionEvent` | 冒泡 |
| `messageerror` | Worker 消息反序列化失败 | `MessageEvent` | 冒泡 |

## 附录 C：try/catch/finally 执行流程

```
┌─────────────────────────────────┐
│ 进入 try 块                      │
└──────────────┬──────────────────┘
               │
   ┌───────────┴───────────┐
   ▼                       ▼
抛出错误                  正常结束
   │                       │
   ▼                       │
进入 catch 块              │
(error 变量绑定)            │
   │                       │
   ▼                       │
catch 结束                 │
   │                       │
   └───────────┬───────────┘
               ▼
        进入 finally 块
               │
               ▼
        finally 结束
               │
   ┌───────────┴───────────┐
   ▼                       ▼
finally 有 return/throw   无
   │                       │
   ▼                       ▼
覆盖原结果                使用 try/catch 结果
```

## 附录 D：错误上报字段对照表

| 字段 | 来源 | 用途 |
| --- | --- | --- |
| `event_id` | UUID 生成 | 唯一标识 |
| `timestamp` | 客户端时间 | 时序 |
| `release` | 构建版本 | 版本追踪 |
| `environment` | 配置 | 区分 prod/staging/dev |
| `user.id` | 业务系统 | 用户聚合 |
| `tags` | 自定义 | 业务分类 |
| `breadcrumbs` | 拦截 | 行为追踪 |
| `exception.type` | Error.name | 错误类型 |
| `exception.value` | Error.message | 错误描述 |
| `exception.stacktrace` | Error.stack | 调用堆栈 |
| `request.url` | location | 请求 URL |
| `request.headers` | navigator | 客户端信息 |

## 附录 E：常见错误堆栈格式

V8（Chrome、Node.js）：

```
Error: message
    at functionName (filename:line:col)
    at functionName (filename:line:col)
```

SpiderMonkey（Firefox）：

```
functionName@filename:line:col
functionName@filename:line:col
```

JavaScriptCore（Safari）：

```
functionName@filename:line:col
functionName@filename:line:col
```

## 附录 F：错误处理最佳实践清单

- [ ] 所有 `async` 函数用 `try/catch` 包裹 `await`。
- [ ] 所有 Promise 链末尾加 `.catch`。
- [ ] 全局监听 `error` 与 `unhandledrejection`。
- [ ] 资源加载错误用捕获阶段监听 `error`。
- [ ] React 应用至少有一层 ErrorBoundary。
- [ ] Vue 应用配置 `errorHandler`。
- [ ] Node.js 配置 `uncaughtException` 与 `unhandledRejection`，但前者立即退出。
- [ ] 生产环境部署 Source Map 到内部服务。
- [ ] 错误上报使用 `sendBeacon` 或 `keepalive` 避免页面卸载丢失。
- [ ] 实施错误采样，避免高流量时上报风暴。
- [ ] 错误聚合后按业务模块、错误类型分类展示。
- [ ] 关键错误设置告警阈值，触发自动回滚。
- [ ] 跨域脚本配置 `crossorigin` 与 CORS 头。
- [ ] 错误信息不包含敏感数据（密码、Token）。

## 附录 G：术语表

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 错误边界 | Error Boundary | React 中捕获子组件渲染错误的组件 |
| 全局错误处理器 | Global Error Handler | 监听 window error 事件的处理器 |
| Promise rejection | Promise Rejection | Promise 进入 rejected 状态 |
| 未处理 rejection | Unhandled Rejection | Promise rejected 但未 `.catch` |
| 堆栈跟踪 | Stack Trace | 函数调用序列，用于定位错误源 |
| Source Map | Source Map | 压缩代码到源码的映射 |
| 错误聚合 | Error Aggregation | 按指纹分组相同错误 |
| 错误采样 | Error Sampling | 按比例上报，避免洪流 |
| 面包屑 | Breadcrumb | 错误发生前的用户行为记录 |
| 调用栈 | Call Stack | 函数调用的内存栈 |
| 同步错误 | Synchronous Error | 同一调用栈中抛出的错误 |
| 异步错误 | Asynchronous Error | 新调用栈中抛出的错误 |
| 跨域脚本 | Cross-origin Script | 不同源加载的脚本 |
| 回滚 | Rollback | 部署失败后恢复到上一版本 |

## 附录 H：思维导图

```
错误边界与全局错误捕获
├── 错误类型
│   ├── 内建：Error、TypeError、RangeError、...
│   ├── AggregateError (ES2021)
│   ├── 自定义：AppError、NetworkError、...
│   └── ES2022 Error.cause 链式
├── 捕获机制
│   ├── try/catch/finally (同步)
│   ├── async/await + try (Promise)
│   ├── .catch (Promise 链)
│   ├── window.onerror (同步兜底)
│   ├── window.unhandledrejection (Promise 兜底)
│   ├── addEventListener('error', ..., true) (资源)
│   ├── React ErrorBoundary
│   ├── Vue errorCaptured
│   ├── Node process.on
│   └── Worker onerror
├── 全局监控
│   ├── window.addEventListener
│   ├── 拦截 console.error
│   ├── 拦截 fetch/XHR
│   ├── 拦截 History API
│   └── Breadcrumbs 行为追踪
├── 错误上报
│   ├── 采样策略
│   ├── 节流去重
│   ├── 批量上报
│   ├── sendBeacon
│   └── Source Map 解析
├── 错误聚合
│   ├── 指纹生成
│   ├── 时序聚合
│   ├── Release 追踪
│   └── 用户维度聚合
├── 工程实践
│   ├── React 分层 ErrorBoundary
│   ├── 重试与降级
│   ├── 自动回滚
│   ├── 用户反馈
│   └── APM SDK 接入
└── 陷阱
    ├── 异步错误未捕获
    ├── Promise 链无 .catch
    ├── async 未 await
    ├── 跨域 Script error
    ├── error 事件不冒泡
    └── finally 覆盖返回值
```

## 附录 I：版本兼容性

| 特性 | 版本 | 备注 |
| --- | --- | --- |
| `try/catch` | ES3 | 全平台 |
| `Error.prototype.stack` | 非标准 | 各引擎实现不同 |
| `window.onerror` | IE6+ | 跨域时返回 'Script error.' |
| `crossorigin` 属性 | HTML5 | 解决跨域错误 |
| `unhandledrejection` 事件 | ES6+ | 现代浏览器 |
| `rejectionhandled` 事件 | ES6+ | 现代浏览器 |
| `ErrorEvent` 接口 | HTML5 | 现代浏览器 |
| React ErrorBoundary | React 16+ | 仅类组件 |
| Vue `errorCaptured` | Vue 2.5+ | - |
| Vue `app.config.errorHandler` | Vue 3 | - |
| `Error.cause` | ES2022 | Chrome 93+、Firefox 91+、Safari 15+ |
| `AggregateError` | ES2021 | Chrome 85+、Firefox 79+、Safari 14+ |
| `navigator.sendBeacon` | 现代浏览器 | IE 不支持 |
| `fetch` `keepalive` 选项 | Chrome 66+ | 用于卸载时上报 |

## 附录 J：性能基准

| 操作 | 耗时 | 备注 |
| --- | --- | --- |
| `try { } catch(e) { }`（无错误） | ~1ns | V8 优化后几乎零成本 |
| `try { throw new Error() } catch(e) { }` | ~1μs | 创建 Error 较慢 |
| `new Error().stack` | ~5μs | 生成堆栈字符串 |
| `window.onerror` 回调 | ~10μs | 包含事件分发 |
| `JSON.stringify(error)` | ~50μs | 序列化 |
| `fetch('/report', {keepalive})` | ~5ms | 网络请求 |

工程启示：

- 错误处理代码本身性能开销小，可以放心使用 `try/catch`。
- 创建 Error 对象是较慢的操作，避免在性能热点频繁抛错。
- 上报网络请求是主要瓶颈，需批量与采样。

## 附录 K：与后端错误监控的协作

前端错误监控系统通常与后端服务协作：

```
┌──────────────┐    上报     ┌──────────────┐    存储     ┌──────────────┐
│   浏览器     │ ─────────→ │  收集服务    │ ─────────→ │   数据库     │
│  (SDK)       │             │  (API)       │             │  (Postgres)  │
└──────────────┘             └──────────────┘             └──────────────┘
                                                                  │
                                                                  │ 聚合
                                                                  ▼
                                                          ┌──────────────┐
                                                          │  聚合服务    │
                                                          │  (Cron)      │
                                                          └──────────────┘
                                                                  │
                                                                  │ 查询
                                                                  ▼
                                                          ┌──────────────┐
                                                          │   仪表盘     │
                                                          │  (前端)      │
                                                          └──────────────┘
                                                                  │
                                                                  │ 告警
                                                                  ▼
                                                          ┌──────────────┐
                                                          │   告警系统   │
                                                          │ (PagerDuty)  │
                                                          └──────────────┘
```

各环节技术选型：

- 收集服务：Node.js（Express/Fastify）、Go（高并发）。
- 数据库：PostgreSQL（结构化）、Elasticsearch（全文搜索）、ClickHouse（OLAP）。
- 队列：Kafka（高吞吐）、Redis Streams（轻量）。
- 仪表盘：Grafana、自研 React 应用。
- 告警：PagerDuty、Slack、企业微信、飞书。

## 附录 L：核心一句话总结

> 错误处理不是"防御性"工作，而是"可观测性"工程。一个优秀的系统，从错误中学习的能力决定了其长期稳定性。

---

本文档版本：v2.0
最后更新：2026-06-14
维护者：fanquanpp
反馈渠道：在 GitHub Issues 提交问题或建议
