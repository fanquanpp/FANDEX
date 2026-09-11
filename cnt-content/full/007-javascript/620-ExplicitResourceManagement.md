---
order: 620
title: 显式资源管理：using 与 await using
module: 'javascript'
category: 前端技术
difficulty: advanced
description: Stage 4 定稿的 using/await using 与 Symbol.dispose：确定性资源释放的语法、协议与工程落地。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'javascript/250-AsyncProgramming'
  - 'javascript/570-NodeJsPerformanceOptimization'
  - 'javascript/350-MemoryManagementAndGarbageCollection'
prerequisites:
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/250-AsyncProgramming'
---

## 0. 一句话理解

> `using` 声明让资源在**离开作用域的瞬间**确定性释放（文件句柄、连接、锁、监听器），不再依赖 GC 的"最终处理"，也不用手写 try/finally——显式资源管理提案已正式定稿（Stage 4，按年度发布节奏预计随 ES2027 出版），Chrome 134+ 已先行落地，其余引擎支持以 MDN 为准。

## 1. 解决什么问题

JS 的大部分资源靠 GC 回收内存，但**非内存资源**（打开的文件、数据库连接、分布式锁、事件监听器）需要"用完即还"：

```javascript
// 旧写法：finally 漏写、早退路径遗漏、嵌套层层缩进
const conn = await pool.acquire();
try {
  await doWork(conn);
} finally {
  await pool.release(conn);   // 忘了这行就是连接泄漏
}
```

GC 触发的回收时机不可控，`FinalizationRegistry` 只能兜底不能依赖。显式资源管理把释放时机从"垃圾回收"拉回"作用域边界"——这正是 C++ RAII、Python `with`、Java try-with-resources 的共识方案。

## 2. 基础语法

```javascript
{
  using handle = openFile('/tmp/data.txt');  // 实现 Symbol.dispose 的对象
  handle.read();
}   // 离开作用域时自动调用 handle[Symbol.dispose]()

const out = await fetch('https://example.com');
```

要点：

1. `using` 只能在块级作用域（`{}`）内声明，且隐式 const；
2. 释放顺序与声明顺序**相反**（后进先出，类似栈展开）；
3. 释放过程抛出的异常会被收集，与作用域内本来的异常聚合（AggregateError 语义），不会互相吞掉。

## 3. 协议：Symbol.dispose 与 Symbol.asyncDispose

```javascript
// TypeScript 写法：implements Disposable（纯 JS 省略该标注即可，运行时只认 Symbol.dispose 方法）
class TempFile {
  #path;
  constructor(path) { this.#path = path; }
  [Symbol.dispose]() {
    fs.unlinkSync(this.#path);           // 确定性清理
  }
}

using tmp = new TempFile('/tmp/cache.json');
```

| 协议成员 | 对应声明 | 典型资源 |
| --- | --- | --- |
| `Symbol.dispose` | `using` | 文件句柄、锁、监听器、事务 |
| `Symbol.asyncDispose` | `await using` | 数据库连接、网络会话 |

`await using` 的释放是异步的，会自动 `await`，因此要求所在函数为 async：

```javascript
async function query() {
  await using conn = await pool.acquire();  // 作用域结束 await release
  return conn.query('SELECT 1');
}   // 自动调用 conn[Symbol.asyncDispose]()
```

## 4. DisposableStack：批量管理一组资源

```javascript
{
  using stack = new DisposableStack();
  const a = stack.use(openResource('a'));   // use：装入资源并原样返回
  const b = stack.use(openResource('b'));
  stack.defer(() => rollbackIfNeeded());    // defer：注册清理回调（defer 风格）
}   // 逆序释放：先回调，再 b，再 a
```

`DisposableStack`（及异步版 `AsyncDisposableStack`）的核心方法：`use(value)` 装入并返回资源、`adopt(value, onDispose)` 包装无协议的遗留对象、`defer(callback)` 注册清理回调、`move()` 把整个栈的所有权移交给调用方——适合"打开一组、成功才提交、失败全部回滚"的组合场景。

## 5. 工程落地

### 5.1 监听器的确定性移除

```javascript
function bindShortcuts(el) {
  using _ = bindEvent(el, 'keydown', onKey);   // 返回 { [Symbol.dispose]() { remove } }
}   // 函数结束自动解绑，杜绝"忘了 removeEventListener"
```

### 5.2 事务与锁

```javascript
async function transfer(from, to, amount) {
  await using tx = await db.transaction();  // Symbol.asyncDispose 里默认 rollback
  await tx.debit(from, amount);
  await tx.credit(to, amount);
  tx.commit();                              // 显式提交；不提交则自动回滚
}
```

### 5.3 生态支持

- **TypeScript 5.2+** 提供完整的 `using` 类型检查与 `Disposable`/`AsyncDisposable` 全局类型（详见 `typescript/670-TypeScript5xNewFeatures`）；
- 主流运行时：Chrome 134+ 已落地 `using` 语法，其余引擎与 Node 的支持进度以 MDN 为准；
- 旧环境用 [core-js](https://github.com/zloirock/core-js) 的显式资源管理垫片（仅提供协议 polyfill，`using` 语法本身需转译）。

## 6. 与 GC 的关系

`using` **不替代 GC**：它管理的是"显式资源"，内存回收仍由 GC 负责。两者的分工是——内存交给 GC，带副作用的稀缺资源交给 `using`。此前只能靠 `FinalizationRegistry` 兜底的场景（见 `javascript/350-MemoryManagementAndGarbageCollection`），现在应优先改写为 `using`。

## 7. 常见陷阱

| 陷阱 | 说明 | 正确做法 |
| --- | --- | --- |
| 用 `var`/`const` 声明 | `using` 是独立关键字，写法是 `using x = ...` | 不要写成 `const using` 或赋值后再装 |
| 在顶层作用域滥用 | 模块顶层 `using` 语义合法但生命周期等于整个模块 | 资源限定在函数/块内 |
| dispose 里再抛错吞异常 | 释放异常与主异常聚合，单个 catch 拿不到 | dispose 内自行捕获记录关键日志 |
| 对未实现协议的对象 using | 运行时 TypeError | 包装成 Disposable 或用 DisposableStack |
| 期望 dispose 后对象不可用 | 协议只保证 dispose 被调用，不冻结对象 | 资源类自己维护"已释放"状态守卫 |

## 8. 动手试试

1. 给事件监听器写一个 `bindEvent` 工具，返回 Disposable，并对比 try/finally 版本的代码量；
2. 实现一个 `await using` 的分布式锁客户端，验证异常路径下锁一定被释放；
3. 用 `DisposableStack` 组合"临时目录 + 临时文件 + 环境变量还原"的测试夹具；
4. 在项目的 lint 规则里禁止 `addEventListener` 裸调用，统一走 Disposable 封装。

## 9. 一句话记住

> `using`/`await using` 把释放时机绑定到作用域边界：实现 `Symbol.dispose` 即可被确定性清理，`DisposableStack` 管批量、逆序释放——RAII 思想的 JS 实现，GC 管内存，using 管资源。
