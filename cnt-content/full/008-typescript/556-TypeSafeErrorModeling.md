---
order: 600
title: 类型化错误处理
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 用判别联合把错误建模成返回值：Result/Either 模型、异常与返回值两条路线的取舍、catch unknown 收窄收尾与 assert never 穷尽检查，含文件三态、分页错误码表与批量导入聚合三个完整例子。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：类型化错误处理（Result/Either 与错误建模）——把「失败」变成类型系统里的一等公民。
- **解决什么问题**：函数签名 `Promise<Note[]>` 只写了成功一半，"会不会失败、失败有几种"全靠读文档；`try/catch` 的 catch 是 unknown，错误处理靠自觉。类型化错误建模让编译器强迫调用方处理每一种失败。
- **什么时候用到**：定义可能失败的业务操作（网络请求、文件读取、批量导入）；设计公共 API 的错误契约；写必须"部分成功也要报告"的流程。
- **前置**：[字面量与联合类型](/typescript/110-LiteralUnionTypes) 的判别联合；[异步类型模式](/typescript/555-AsyncTypePatterns) 第 4 节（catch 分支是 unknown——本篇从那里接着收尾）。

## 0. 一句话理解

> 错误也是一种返回值。与其让函数"正常时返回数据、失控时抛东西"，不如让它在类型签名里老实交代：`Result<T, E> = 成功含值 | 失败含错误`。编译器从此变成错误处理的监工。

## 1. 两条路线：异常与返回值

TypeScript 从 JavaScript 继承了异常，但异常有两个类型系统帮不上忙的盲区：

```typescript
// 盲区一：签名看不出来会抛
function readConfig(path: string): Config {
  const raw = fs.readFileSync(path, 'utf-8'); // 可能抛，签名里没有
  return JSON.parse(raw);                     // 也可能抛
}
const conf = readConfig('./a.json'); // 调用方没有任何"必须 try"的提示

// 盲区二：catch 的 unknown 没有形状
try {
  readConfig('./a.json');
} catch (e) {
  console.log(e.code); // 报错：e 是 unknown，摸不到任何属性
}
```

对比返回值路线——失败是类型的一部分，调用方**不处理就过不了编译**：

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function readConfigR(path: string): Result<Config, ConfigError> { /* ... */ }

const r = readConfigR('./a.json');
if (r.ok) {
  use(r.value);      // 分支内 r.value 合法
} else {
  report(r.error);   // 分支内 r.error 合法
}
// 想直接用 r.value？编译器：你可能拿到的是失败分支。
```

`ok` 这个判别字段让 if 收窄自动生效（判别联合的完整机制见 110 篇第 4 节）。

**怎么选**，给一条工程判断线：

| 场景 | 建议 | 理由 |
| :--- | :--- | :--- |
| 不可恢复的程序缺陷（断言失败、不变量被破坏） | 抛异常 | 没有合理的"继续执行"，栈回溯就是调试信息 |
| 业务上的预期失败（找不到、校验不过、余额不足） | Result | 失败是正常分支，调用方必须表态 |
| 边界层（fetch 封装、文件读取、解析器） | 捕获后归一成 Result | 把 unknown 收敛成错误码表，见第 3 节 |

一句话版：**异常留给"崩了就该停"的场合，Result 留给"失败也是答案"的场合**。

## 2. Result 模型的最小实现

先看 110 篇里已经出现的雏形怎么长成完整模型：

```typescript
type Ok<T> = { ok: true; value: T };
type Err<E> = { ok: false; error: E };
type Result<T, E> = Ok<T> | Err<E>;

// 两个构造器：让调用点不用手写 ok: true
const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
const err = <E>(error: E): Err<E> => ({ ok: false, error });
```

为什么分成 `Ok/Err` 两个别名再联合：直接写 `{ ok: true; value: T } | { ok: false; error: E }` 功能一样，但 `Ok<T>`/`Err<E>` 可以单独出现在别的签名里（比如"只可能失败不可能成功"的收尾操作直接标 `Err<E>`），组合粒度更细。

三个使用场景：

```typescript
// 场景一：解析器——"字符串进，结构出，解析不了就报错"
function parsePage(raw: string): Result<number, string> {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? ok(n) : err(`非法页码: ${raw}`);
}

// 场景二：查表——找不到是常态而不是异常
function findDoc(id: string): Result<Doc, 'not_found'> {
  const hit = store.get(id);
  return hit ? ok(hit) : err('not_found');
}

// 场景三：链式——把"上一步失败就停"写成类型驱动的管道
function andThen<T, U, E>(r: Result<T, E>, next: (v: T) => Result<U, E>): Result<U, E> {
  return r.ok ? next(r.value) : r;
}

const page = andThen(parsePage(raw), (n) => fetchPageR(n));
// parsePage 失败时 fetchPageR 根本不会被调用，类型层层传递
```

`andThen` 就是 Result 版的 `then`：成功才继续，失败原样透传。管道越写越长时它比层层 if 好读得多。

## 3. 边界收尾：catch 后的 unknown 怎么归一

[555 篇](/typescript/555-AsyncTypePatterns) 讲过 `catch (e)` 里 `e` 是 `unknown`——这不是缺陷而是事实：能被 throw 的东西没有任何类型保证。Result 模型给了它一个标准收尾：

```typescript
// 错误码表：整个模块的错误"词表"
type FetchErr =
  | { kind: 'network'; message: string }
  | { kind: 'status'; code: number }
  | { kind: 'abort' };

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<Result<T, FetchErr>> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return err({ kind: 'status', code: res.status });
    return ok((await res.json()) as T);
  } catch (e) {
    // ---- unknown 收窄三步 ----
    if (e instanceof DOMException && e.name === 'AbortError') {
      return err({ kind: 'abort' });                       // 已知：主动取消
    }
    if (e instanceof TypeError) {
      return err({ kind: 'network', message: e.message }); // 已知：fetch 网络失败
    }
    return err({ kind: 'network', message: String(e) });   // 兜底：转字符串封箱
  }
}
```

逐段看这段收尾为什么这样写：先按**最具体**的异常类型判断（AbortError 能精确对应"用户取消"这个业务语义）；再按次具体的 TypeError（fetch 规范规定网络失败抛 TypeError）；最后兜底不是 `return err(e)`——把 unknown 塞进 `error` 字段等于把类型 Hole 转移进了错误通道，错误码表就白建了。`String(e)` 封箱后 `FetchErr` 保持封闭，调用方 switch 时才有穷尽可言。

## 4. 例子一：文件读取三态

文件读取天然有三种结局，比布尔成败 richer，最能看出判别联合的表意能力：

```typescript
type ReadResult =
  | { state: 'loaded'; text: string; bytes: number }
  | { state: 'empty' }                       // 文件存在但为空：不是错误
  | { state: 'failed'; reason: 'missing' | 'permission' };

function readNote(path: string): ReadResult {
  try {
    const text = readFileSyncText(path);
    return text.length === 0 ? { state: 'empty' } : { state: 'loaded', text, bytes: text.length };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code; // Node 错误码在 error 对象上
    return {
      state: 'failed',
      reason: code === 'ENOENT' ? 'missing' : 'permission',
    };
  }
}
```

`(e as NodeJS.ErrnoException)` 是这一段唯一的断言，也是**Node 生态的现实妥协**：错误码挂在 error 对象的可选属性上，类型系统无法证明它在。断言收敛在这一行、其余全部走类型安全通道，是边界代码的合理形态（断言的完整风险账本见 080 篇第 6 节）。

调用方的处理被编译器逼成穷尽的：

```typescript
function render(r: ReadResult): string {
  switch (r.state) {
    case 'loaded':  return r.text.slice(0, 200);
    case 'empty':   return '（空笔记）';
    case 'failed':  return r.reason === 'missing' ? '笔记不存在' : '无法读取';
  }
}
```

## 5. 例子二：API 分页请求的业务错误码表

后端返回的错误码是天然的字面量联合，配合泛型把"业务失败"与"传输失败"分开建模：

```typescript
// 服务端错误码表（来自接口文档，用 satisfies 锁住不漂移）
const PAGE_ERROR_CODES = {
  INVALID_PAGE: 40001,
  PAGE_GONE: 40010,
  RATE_LIMITED: 40290,
} as const;

type PageErrCode = keyof typeof PAGE_ERROR_CODES; // 'INVALID_PAGE' | 'PAGE_GONE' | 'RATE_LIMITED'

type PageResult<T> =
  | { ok: true; items: T; nextCursor: string | null }
  | { ok: false; code: PageErrCode; retryAfter?: number };

async function fetchPage<T>(cursor: string): Promise<PageResult<T>> {
  const res = await fetch(`/api/list?cursor=${encodeURIComponent(cursor)}`);
  const body = await res.json();
  if (body.errorCode === PAGE_ERROR_CODES.PAGE_GONE) return { ok: false, code: 'PAGE_GONE' };
  if (body.errorCode === PAGE_ERROR_CODES.RATE_LIMITED) {
    return { ok: false, code: 'RATE_LIMITED', retryAfter: body.retryAfter };
  }
  if (body.errorCode === PAGE_ERROR_CODES.INVALID_PAGE) return { ok: false, code: 'INVALID_PAGE' };
  return { ok: true, items: body.items, nextCursor: body.nextCursor };
}
```

调用方现在被迫面对每一个码，而且新增错误码时**编译器会点名所有漏处理的位置**：

```typescript
async function loadMore(cursor: string): Promise<void> {
  const r = await fetchPage<NoteMeta>(cursor);
  if (!r.ok) {
    switch (r.code) {
      case 'PAGE_GONE':    return resetToFirstPage();
      case 'RATE_LIMITED': return setTimeout(loadMore, (r.retryAfter ?? 5) * 1000, cursor);
      case 'INVALID_PAGE': return console.error('cursor 已损坏，清空本地状态');
      default: {
        const never: never = r.code; // 新增错误码时这里编译报错
        return never;
      }
    }
  }
  appendItems(r.items);
}
```

`default` 里的 `never` 标注就是 **assert never 穷尽检查**：`PageErrCode` 三个成员全被 case 吃掉后，`r.code` 在 default 里收窄为 `never`；服务端文档加了新码、前端类型同步了，但 switch 忘了跟——`never` 赋值立刻编译报错。这个技巧的本质见 [never 类型完整语义](/typescript/190-NeverTypeSemantics)。

## 6. 例子三：批量导入的部分失败聚合

批量操作的现实是"有的成功有的失败"，Result 的数组化聚合是这个场景的标准答案：

```typescript
type ImportRow<T> = { line: number; input: T };

type RowOutcome<T> =
  | { line: number; status: 'imported'; value: T }
  | { line: number; status: 'rejected'; error: string };

function importOne(raw: string): Result<NoteMeta, string> {
  // ...逐行解析 + 校验，失败返回 err(原因)
  return raw.trim() === '' ? err('空行') : ok(JSON.parse(raw) as NoteMeta);
}

function importBatch(rows: ImportRow<string>[]): { summary: string; outcomes: RowOutcome<NoteMeta>[] } {
  const outcomes = rows.map(({ line, input }) => {
    const r = importOne(input);
    return r.ok
      ? { line, status: 'imported', value: r.value } as const
      : { line, status: 'rejected', error: r.error } as const;
  });

  const rejected = outcomes.filter((o) => o.status === 'rejected');
  const summary = `共 ${rows.length} 行，成功 ${outcomes.length - rejected.length} 行，失败 ${rejected.length} 行`;
  return { summary, outcomes };
}
```

要点有三个：其一，**失败的行不中断批次**——每行独立产出一个 `RowOutcome`，err 只属于那一行；其二，`outcomes.filter(o => o.status === 'rejected')` 之后 `rejected[0].error` 是否可用取决于收窄，这里 filter 不改变元素类型，所以要用带判别字段的联合让后续 `switch` 或 `in` 检查来收窄（filter 收窄的类型局限见 110 篇第 4 节）；其三，汇总行 `summary` 是给人看的，`outcomes` 是给程序用的——**两者都返回**，UI 显示摘要、日志记录明细，互不迁就。

## 7. 什么时候别用 Result

诚实的反面清单，防止模式滥用：

- **纯粹的程序 bug（数组越界、null 解引用、断言失败）**：抛异常。这些情况没有"失败的答案"可言，Result 包装只会让调用方假装能处理。
- **同步且不可能失败的简单函数**：`add(a, b)` 不需要 `Result<number, never>`——E 为 never 等于宣告"不可能失败"，写了反而是噪音。
- **跨进程/事件边界的一次性通知**：`window.onerror`、unhandledrejection 这类全局兜底（见 [全局错误捕获](/javascript/480-ErrorBoundaryGlobalErrorCatch) 的 JS 对应物）先于任何 Result 设计存在，Result 管不到它们，两层是共存关系不是替代关系。

## 8. 动手实践

任务：

1. 给 `parsePage` 增加"页码超过 9999 视为越界"的分支，错误通道用字面量联合 `'invalid' | 'out_of_range'`，并让调用方 switch 穷尽处理（含 assert never）。
2. 把第 6 节的 `importBatch` 改成 `Result<ImportReport, string>`：全部行失败才算整体失败，否则成功并携带逐行结果。
3. 思考题：`Promise<Result<T, E>>` 与 `Result<Promise<T>, E>` 的语义差别是什么？各自适合什么场景？

提示：第 1 题先写错误联合再写构造，顺序反过来容易把码表写漏；第 3 题从"失败发生在请求前还是请求后"入手。

<details>
<summary>参考实现（先完成上面的任务再展开对照）</summary>

```typescript
// 任务 1
type PageErr = 'invalid' | 'out_of_range';
function parsePage2(raw: string): Result<number, PageErr> {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return err('invalid');
  if (n > 9999) return err('out_of_range');
  return ok(n);
}

function showPage(raw: string): string {
  const r = parsePage2(raw);
  if (!r.ok) {
    switch (r.error) {
      case 'invalid':      return '请输入正整数页码';
      case 'out_of_range': return '页码超出范围';
      default: {
        const never: never = r.error; // 新增分支时编译器在此点名
        return never;
      }
    }
  }
  return `第 ${r.value} 页`;
}

// 任务 2
interface ImportReport { imported: number; outcomes: RowOutcome<NoteMeta>[] }
function importBatchR(rows: ImportRow<string>[]): Result<ImportReport, string> {
  const outcomes = rows.map(({ line, input }) => {
    const r = importOne(input);
    return r.ok
      ? ({ line, status: 'imported', value: r.value } as const)
      : ({ line, status: 'rejected', error: r.error } as const);
  });
  if (outcomes.every((o) => o.status === 'rejected')) {
    return err('全部行导入失败');
  }
  return ok({
    imported: outcomes.filter((o) => o.status === 'imported').length,
    outcomes,
  });
}

// 任务 3
// Promise<Result<T, E>>：失败发生在"拿到结果的过程中"——请求可能挂、
//   响应可能是错误码，await 之后必然拿到一份成败判决。适合 IO 边界。
// Result<Promise<T>, E>：失败发生在"发起之前"——参数校验没过、配额已满，
//   请求根本不会发出去；成功了也还要继续 await。适合带前置校验的网关函数。
// 判断口诀：错误发生在等待前就是后者，等待中就是前者。
```

</details>

## 9. 下一步

- [字面量与联合类型](/typescript/110-LiteralUnionTypes)：判别联合与收窄的完整机制；
- [异步类型模式](/typescript/555-AsyncTypePatterns)：catch unknown 的原始出处与 async 语义；
- [TypeSafe API Client](/typescript/570-TypeSafeAPIClient)：把本篇错误模型装进完整请求层的工程版。

## 参考与致谢

- TypeScript 官方 Handbook「Narrowing」「Never」章（microsoft/TypeScript-Website，文档内容 CC BY 4.0），https://www.typescriptlang.org/docs/handbook/2/narrowing.html ——收窄与 assert never 语义以官方文档为准。
- 本篇 Result/Ok/Err 与三例代码均为原创，场景取材自内容仓库的笔记元数据、分页列表与批量导入流程。
