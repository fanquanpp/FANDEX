---
order: 420
title: React 19 新增 API
module: 'react'
category: 前端技术
difficulty: advanced
description: React 19 及 19.x 后续新增 API 详解：use、useActionState、useOptimistic、ref 作为 prop、useEffectEvent、Activity 与资源加载。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/060-React19NewFeatures'
  - 'react/400-ServerClientComponents'
  - 'react/140-ServerComponents'
  - 'react/430-InterruptibleRendering'
prerequisites:
  - 'react/040-HooksDeep'
---

## 1. use()：读取 Promise 与 Context

`use()` 是 React 19 最特别的新 API——它长得像 Hook 却不受 Hooks 规则约束（可在条件、循环中调用），因为它在渲染期间读取外部资源：

```tsx
import { use, Suspense } from 'react';

function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise); // 挂起直到 resolve，配合 Suspense 展示加载态
  return (
    <ul>
      {comments.map((c) => (
        <li key={c.id}>{c.text}</li>
      ))}
    </ul>
  );
}

function Page() {
  return (
    <Suspense fallback={<p>加载评论中...</p>}>
      <Comments commentsPromise={fetchComments()} />
    </Suspense>
  );
}
```

三个必须注意的点：

1. **Promise 的创建时机**：推荐在 Server Component 中创建后作为 props 传入，或用 `useMemo`/组件外缓存包裹；直接写在渲染体内会在每次渲染创建新 Promise 导致无限挂起循环。
2. **读取 Context 时不需要 Provider 层级**：`use(SomeContext)` 与 `useContext(SomeContext)` 等价，但可以在提前返回之后调用。
3. **Promise 被 reject 时**由最近的错误边界（Error Boundary）兜底，与 Suspense 配套。

```tsx
import { use } from 'react';

// 与 useContext 的差异：可以出现在条件分支
function Toolbar({ showTheme }: { showTheme: boolean }) {
  if (showTheme) {
    const theme = use(ThemeContext); // 合法
    return <span className={theme}>工具栏</span>;
  }
  return null;
}
```

## 2. ref 作为 prop

React 19 中函数组件的 `ref` 成为普通 prop，`forwardRef` 不再必要（旧代码可继续运行，属过渡期弃用而非移除）：

```tsx
// React 19 之前：必须 forwardRef
import { forwardRef } from 'react';
const LegacyInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));

// React 19：ref 直接出现在 props 里
function Input({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

### 2.1 ref 回调清理函数

ref 回调现在可以返回清理函数，取代"手动判断 null"的旧写法：

```tsx
// React 19：返回的函数会在卸载（或 ref 指向变化）时调用
<input
  ref={(node) => {
    if (node) observer.observe(node);
    return () => observer.unobserve(node);
  }}
/>
```

> 迁移注意：若 ref 回调返回了非函数值，React 19 会在开发环境警告——旧的"箭头函数简写隐式返回值"写法（如 `ref={el => el.focus()}`）必须改为语句体。

## 3. Actions 与表单套件

React 19 把"异步提交"抽象为 Action：传给 `<form action>` 的异步函数会自动排队、自动管理 pending，在过渡（transition）语义下执行。

### 3.1 useActionState

封装"提交状态 + 返回结果 + pending"三件套：

```tsx
import { useActionState } from 'react';

interface FormState {
  message: string;
  success: boolean;
}

async function submitOrder(prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await createOrder({
      item: formData.get('item') as string,
      quantity: Number(formData.get('quantity')),
    });
    return { message: '订单创建成功', success: true };
  } catch (error) {
    return { message: `失败：${(error as Error).message}`, success: false };
  }
}

function OrderForm() {
  // 返回值是 [state, dispatch, isPending]，dispatch 可直接交给 form action
  const [state, submitAction, isPending] = useActionState(submitOrder, {
    message: '',
    success: false,
  });

  return (
    <form action={submitAction}>
      <input name="item" required />
      <input name="quantity" type="number" min="1" required />
      <button disabled={isPending}>{isPending ? '提交中...' : '下单'}</button>
      {state.message && <p style={{ color: state.success ? 'green' : 'red' }}>{state.message}</p>}
    </form>
  );
}
```

关键约定：action 的函数签名是 `(prevState, payload) => newState`，是"上一个状态的 reducer"，所以错误处理要在函数内部 catch 后返回状态，而不是抛出（抛出会交给错误边界）。

### 3.2 useOptimistic

在 Action 执行期间先展示"预期结果"，失败时自动回滚：

```tsx
'use client';
import { useActionState } from 'react';
import { sendMessage } from './actions'; // Server Action

function Chat({ messages }: { messages: Message[] }) {
  const [state, submit] = useActionState(async (prev, formData) => {
    const text = formData.get('text') as string;
    await sendMessage(text); // 真实请求（服务端执行）
    return prev;             // 提交完成后回到真实数据
  }, messages);

  // 乐观列表：send 期间临时追加 pending 消息
  const [optimisticMessages, addOptimistic] = useOptimistic(
    state,
    (list, text: string) => [...list, { id: 'temp', text, sending: true }]
  );

  async function handleSend(formData: FormData) {
    addOptimistic(formData.get('text') as string); // 立即上屏
    await submit(formData);                         // Action 内完成真实提交
  }

  return (
    <form action={handleSend}>
      <ul>
        {optimisticMessages.map((m) => (
          <li key={m.id} style={{ opacity: m.sending ? 0.5 : 1 }}>{m.text}</li>
        ))}
      </ul>
      <input name="text" />
      <button>发送</button>
    </form>
  );
}
```

`addOptimistic` 只能在 Action/transition 内调用；乐观值是"临时的"，一旦真实 state 更新就会被替换——这保证了失败即回滚，无需手写撤销逻辑。

### 3.3 useFormStatus

子组件读取最近的父 `<form>` 状态，避免层层传 props：

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending, data } = useFormStatus(); // 必须放在 <form> 内部才有值
  return (
    <button type="submit" disabled={pending}>
      {pending ? '提交中...' : children}
    </button>
  );
}
```

作用域规则是高频错误点：`useFormStatus` 读的是**组件树上离它最近的 form**，因此按钮必须是 form 的子组件（可以是深层子组件），不能在 form 自身所在的组件里调用。

## 4. 文档元数据与资源加载

```tsx
// React 19：组件树里直接声明，运行时自动提升到 <head>
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <title>{post.title} | FANDEX</title>
      <meta name="description" content={post.excerpt} />
      <link rel="canonical" href={`https://example.com/posts/${post.id}`} />
      <h1>{post.title}</h1>
    </article>
  );
}
```

配套的资源加载 API 从 `react-dom` 导入，用于告知浏览器提前行动：

```tsx
import { preload, preinit, preconnect } from 'react-dom';

function App() {
  preconnect('https://api.example.com');           // 尽早建立连接
  preload('/fonts/inter.woff2', { as: 'font' });   // 预加载关键资源
  preinit('/styles/theme.css', { as: 'style' });   // 提前插入样式表，不阻塞渲染
  return <main>...</main>;
}
```

## 5. 19.1 / 19.2 新增 API

React 19 之后进入小版本特性节奏，重点新 API：

| 版本 | API | 用途 |
| :--- | :--- | :--- |
| 19.1（2025-03） | Owner Stacks | 开发期打印"哪个组件渲染了它"，定位多余渲染来源 |
| 19.2（2025-10） | `useEffectEvent` | 从 Effect 中抽离"事件型逻辑"，读取最新值且不进依赖 |
| 19.2（2025-10） | `<Activity>` | 隐藏 UI 同时保留 state（实验性 Offscreen 的正式版） |
| 19.2（2025-10） | `cacheSignal` | RSC 中获取缓存生命周期相关的 AbortSignal |
| 19.2（2025-10） | Partial Pre-rendering | react-dom 层支持静态外壳预渲染 + 动态部分延迟恢复 |

### 5.1 useEffectEvent

```tsx
import { useEffect, useEffectEvent } from 'react';

function ChatRoom({ roomId, theme }: { roomId: string; theme: string }) {
  const onConnected = useEffectEvent(() => {
    // theme 变化不应重连，但回调里永远读到最新 theme
    showToast(`已连接房间 ${roomId}（${theme}）`);
  });

  useEffect(() => {
    const conn = createConnection(roomId);
    conn.on('connected', onConnected);
    conn.connect();
    return () => conn.disconnect();
    // 依赖只写 roomId：onConnected 是 Effect Event，不进依赖
  }, [roomId]);
}
```

它取代的正是"往 ref 里塞最新值"或"suppressing exhaustive-deps"两类历史 workaround。

### 5.2 Activity

```tsx
import { Activity, useState } from 'react';

function Tabs() {
  const [tab, setTab] = useState<'list' | 'detail'>('list');
  return (
    <div>
      <button onClick={() => setTab('list')}>列表</button>
      <button onClick={() => setTab('detail')}>详情</button>

      {/* 隐藏时卸载 Effect、保留 state；再显示时瞬间恢复，不重新请求 */}
      <Activity mode={tab === 'list' ? 'visible' : 'hidden'}>
        <MessageList />
      </Activity>
      <Activity mode={tab === 'detail' ? 'visible' : 'hidden'}>
        <MessageDetail />
      </Activity>
    </div>
  );
}
```

与条件渲染（卸载销毁）和 `display: none`（Effect 继续跑、可能烧性能）相比，Activity 语义精确：**隐藏 = 不可见但保活，Effect 全部卸载**。

## 6. 注意事项

- `use()` 不是 Hook，却要求在渲染期间调用；不要把它写进事件处理器
- `useActionState` 的 action 内抛错不会被本组件捕获，用返回值表达错误或交给错误边界
- `useOptimistic` 的回滚依赖 Action 语义：在普通事件处理器里调用 `addOptimistic` 不生效
- `useFormStatus` 只认组件树上的父 form；跨层级无效
- `forwardRef` 在 19 中不再必要但仍可用；类组件的 ref 转发依旧走 `forwardRef`
- `<Activity>` 隐藏时会卸载 Effect：清理逻辑必须写对，否则隐藏后仍在请求/监听

## 7. 小结

- `use()` 打通了"渲染期间读异步资源"的最后一环，与 Suspense/Error Boundary 组成完整的数据读取方案
- 表单套件（`useActionState` + `useOptimistic` + `useFormStatus` + form action）把异步提交的样板代码压缩到一个 Hook 内
- `ref` as prop 与 ref 清理函数移除了 `forwardRef` 的历史包袱
- 19.1/19.2 的 `useEffectEvent`、`<Activity>` 解决的是"Effect 心智模型"与"保活渲染"两个长期痛点，新代码应优先采用官方方案

## 速查

**useActionState**

`const [<state>, <action>, [<isPending>]] = useActionState(<fn>, <init>, [<permalink>])`
```tsx
const [state, submit, isPending] = useActionState(async (prev, fd) => save(fd), null);
<form action={submit}>...</form>
```

**useOptimistic**

`const [<optimistic>, <add>] = useOptimistic(<state>, <reducer>)`
```tsx
const [list, addOptimistic] = useOptimistic(todos, (s, t) => [...s, { ...t, pending: true }]);
```

**useFormStatus**

`const { pending, data, method, action } = useFormStatus()`
```tsx
const { pending } = useFormStatus();
<button disabled={pending}>提交</button>
```

**use(promise)**

`const <value> = use(<promise>)`
```tsx
const user = use(userPromise); // 配合 <Suspense>
```

**use(context)**

`const <value> = use(<Context>)`
```tsx
const theme = use(ThemeContext); // 可在条件中调用
```

**ref 作为 prop**

`function <C>({ ref }) {}`
```tsx
function Input({ ref }: { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} />;
}
```

**ref 回调清理**

`ref={(<el>) => { ...; return () => <cleanup>; }}`
```tsx
<div ref={(el) => { if (el) observe(el); return () => unobserve(el); }} />
```

**文档元数据**

`<title>` / `<meta>` / `<link>`
```tsx
<><title>页面标题</title><meta name="description" content="..." /></>
```

**useEffectEvent（19.2）**

`const <fn> = useEffectEvent(<callback>)`
```tsx
const onPage = useEffectEvent(() => log(page));
useEffect(() => { on('page', onPage); }, []); // onPage 不进依赖
```

**Activity（19.2）**

`<Activity mode="hidden"> <组件 /> </Activity>`
```tsx
<Activity mode={show ? 'visible' : 'hidden'}>
  <Editor /> {/* 隐藏保活，状态保留 */}
</Activity>
```

**资源加载**

`preload(<href>, <options>)` / `preinit(<href>, <options>)` / `preconnect(<href>)`
```tsx
import { preload, preinit, preconnect } from 'react-dom';
preconnect('https://cdn.example.com');
preload('/fonts/inter.woff2', { as: 'font' });
preinit('/styles/theme.css', { as: 'style' });
```
