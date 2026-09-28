---
order: 60
title: React 19 新特性
module: 'react'
category: 前端技术
difficulty: advanced
description: 用 FANDEX 岛屿与一个评论表单的真实场景学会 React 19 核心新特性：use()、Actions、useActionState、useFormStatus、useOptimistic，以及 RSC、流式 SSR 与文档元数据。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'react/040-HooksDeep'
  - 'react/050-ContextGlobalState'
  - 'react/070-RouteDataFetch'
  - 'react/420-React19NewAPI'
prerequisites:
  - 'react/040-HooksDeep'
---

## 前置知识

- [Hooks 深入](/react/040-HooksDeep)：熟练使用 useState、useEffect、useContext
- [Context 与全局状态](/react/050-ContextGlobalState)：知道 Context 怎么创建与消费

## 学习目标

- 用 `use()` 同时读取 Promise 和 Context，说清它与 useContext 的差别
- 用 `<form action>` + `useActionState` + `useFormStatus` 写一个带 pending 状态与错误提示的表单，一行手动 setPending 都不写
- 用 `useOptimistic` 做「先显示、后确认」的乐观更新，理解失败回滚的时机
- 知道 RSC（服务端组件）与流式 SSR 解决什么问题、什么框架里才能用
- 了解 React 19 顺带改进的文档元数据、样式表、ref 清理

## 场景：给 FANDEX 加一个「读者留言」功能

FANDEX 网页端是 Astro 站点，页面主体在构建期就渲染成静态 HTML，交互部分是嵌进去的 React 19 岛屿——比如右上角的主题切换按钮、前端实验室里那个能跑代码的编辑器。现在要加一个留言功能：输入昵称和内容，提交后消息立刻出现在列表里（哪怕请求还没返回），失败要提示，提交中按钮要禁用。

用 React 18 的写法，你需要 useState 管 pending、useState 管错误、提交函数里手动 set 两次状态、还要处理乐观更新的一致性。React 19 把这条流水线压缩成了三个专用 API。本文就从零做出这个功能，顺带讲清同属 React 19 的 RSC 与流式 SSR 各自解决什么问题。

## 一、use()：一个能读 Promise 的「非典型 Hook」

### 动手：挂起一个组件直到数据就绪

```tsx
import { use, Suspense } from 'react';

interface User {
  name: string;
  email: string;
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // Promise 未完成时组件在此挂起
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p>加载用户信息...</p>}>
      <UserProfile userPromise={fetchUser()} />
    </Suspense>
  );
}
```

`use(promise)` 的行为：Promise 还在 pending，组件挂起，最近一层 Suspense 显示 fallback；resolve 后继续渲染；reject 则交给最近的错误边界。

### 它也能读 Context，而且可以在条件语句里调用

```tsx
import { use } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

function ThemedBanner({ showTheme }: { showTheme: boolean }) {
  if (showTheme) {
    const theme = use(ThemeContext); // 合法
    return <p>当前主题：{theme}</p>;
  }
  return <p>未显示主题</p>;
}
```

`use` 与 useContext 的本质区别：

| 特性 | useContext | use |
| :--- | :--- | :--- |
| 条件 / 循环中调用 | 不可以 | 可以 |
| 读取 Promise | 不可以 | 可以 |
| 读取 Context | 可以 | 可以 |
| 需要 Suspense | 不需要 | 读 Promise 时需要 |

为什么不受 Hooks 规则约束？因为 Hooks 规则的本质是「调用顺序必须稳定」，而 `use` 不在 Hook 链表上注册状态，它只是渲染期间读取外部资源的通道。这也是它名字全小写、长得不像 Hook 的原因。

### 坑点：Promise 别在模块顶层创建

```tsx
// 错误示范：模块加载时创建，之后永远是同一个 Promise
const userPromise = fetch('/api/user').then((r) => r.json());

function Bad() {
  const user = use(userPromise); // 第二次挂载拿到的还是旧数据
  return <div>{user.name}</div>;
}
```

Promise 必须在渲染过程中创建，或由父组件 / 服务端组件传下来，保证参数变化时拿到新的 Promise。理解这一点比记住语法重要。

## 二、Actions：把「提交」交给 React 管理

### 动手：最简 Action

React 19 里，任何包在异步函数里的过渡更新都叫 Action。`<form>` 的 action 属性可以直接接收它：

```tsx
async function handleSubmit(formData: FormData) {
  const nickname = formData.get('nickname') as string;
  const content = formData.get('content') as string;
  await fetch('/api/comments', {
    method: 'POST',
    body: JSON.stringify({ nickname, content }),
  });
}

function CommentForm() {
  return (
    <form action={handleSubmit}>
      <input name="nickname" placeholder="昵称" required />
      <textarea name="content" required />
      <button type="submit">留言</button>
    </form>
  );
}
```

注意三件事：

1. **不用写 onSubmit、不用 preventDefault**，React 会拦截提交事件。
2. **入参是 FormData**，与原生表单语义一致，所以字段名写在 input 的 name 上。
3. **提交成功后表单自动清空**（非受控输入时），省掉 reset 逻辑。

Action 内部走的是 transition 通道，提交期间 React 知道「正在进行」，这就是后面三个状态 API 的基础。

### useActionState：拿到结果和 pending

上面版本还缺两样：提交中的 loading、失败后的错误提示。`useActionState` 一次给齐：

```tsx
import { useActionState } from 'react';

interface FormState {
  message: string;
  success: boolean;
}

async function submitComment(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const nickname = formData.get('nickname') as string;
  const content = formData.get('content') as string;

  if (!nickname.trim()) {
    return { message: '昵称不能为空', success: false };
  }

  try {
    await fetch('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ nickname, content }),
    });
    return { message: '留言成功', success: true };
  } catch (error) {
    return { message: `提交失败：${(error as Error).message}`, success: false };
  }
}

function CommentForm() {
  const [state, submitAction, isPending] = useActionState(submitComment, {
    message: '',
    success: false,
  });

  return (
    <form action={submitAction}>
      <input name="nickname" placeholder="昵称" />
      <textarea name="content" required />
      <button type="submit" disabled={isPending}>
        {isPending ? '提交中...' : '留言'}
      </button>
      {state.message && (
        <p style={{ color: state.success ? 'green' : 'red' }}>{state.message}</p>
      )}
    </form>
  );
}
```

签名规则要记牢：action 函数是 `(prevState, formData) => newState`——第一个参数是上一次的返回值，第二个才是表单数据。校验也放进来做（哪怕服务端校验），把错误信息作为返回值传回，这比抛异常更可控。

### useFormStatus：按钮自己感知提交中

SubmitButton 里的 pending 逻辑其实和表单无关，它只需要知道「我所在的表单正在提交吗」。React 19 用 `useFormStatus` 把这件事变成就近读取：

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? `提交中（${data?.get('nickname')}）` : '留言'}
    </button>
  );
}
```

不用从父组件传 pending prop，任何深度的子组件都能读。硬性约束：**必须在 `<form>` 的子组件里调用**，写在 form 元素自身的组件里拿到的是空状态。

### 同一个表单多个提交按钮

`formAction` 可以在按钮级别覆盖 action，常见于「保存草稿」与「直接发布」：

```tsx
<form action={publish}>
  <input name="title" />
  <button type="submit">发布</button>
  <button type="submit" formAction={saveDraft}>存草稿</button>
</form>
```

### 旧名对照与遗留写法

- `useFormState`（react-dom）是 React 19 canary 时期的旧名，正式版改名 `useActionState`（react），读存量代码时认识即可，新代码统一用新名。
- React 18 时代的手动写法（`useState(false)` 管 pending、try/catch 管 error）在新代码里没有必要，但维护老项目仍会大量遇到，读者要能一眼认出对应关系。

## 三、useOptimistic：让消息「秒回」

### 动手

```tsx
import { useActionState } from 'react';
import { useOptimistic } from 'react';

interface Message {
  id: string;
  text: string;
  sending?: boolean;
}

async function sendToServer(formData: FormData): Promise<void> {
  await fetch('/api/comments', {
    method: 'POST',
    body: JSON.stringify({
      nickname: formData.get('nickname'),
      content: formData.get('content'),
    }),
  });
}

function CommentList({
  messages,
}: {
  messages: Message[];
}) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (current, newText: string) => [
      ...current,
      { id: `temp-${Date.now()}`, text: newText, sending: true },
    ]
  );

  async function formAction(prevState: null, formData: FormData) {
    addOptimistic(formData.get('content') as string); // 立即显示
    await sendToServer(formData); // 失败抛错，乐观值自动回滚
    return null;
  }

  const [, submitAction] = useActionState(formAction, null);

  return (
    <ul>
      {optimisticMessages.map((msg) => (
        <li key={msg.id} style={{ opacity: msg.sending ? 0.5 : 1 }}>
          {msg.text}
          {msg.sending && '（发送中）'}
        </li>
      ))}
      <CommentForm action={submitAction} />
    </ul>
  );
}
```

### 为什么与回滚机制

`useOptimistic(baseState, reducer)` 返回的 `optimisticMessages` 是一个「叠加视图」：基础是父组件传入的真实数据，上面盖着你在 Action 里 add 的临时值。关键规则是 **addOptimistic 只能在 Action（或 transition）内部调用**——因为乐观值的存在周期由 transition 管理：

- Action 执行期间，叠加视图生效，用户立刻看到灰色「发送中」消息；
- Action 成功结束，transition 提交，真实数据更新（或父组件重新拉取），叠加层自然消失；
- Action 抛错，transition 失败，叠加层被**自动回滚**——你不用写任何撤销代码。

这就是把乐观更新塞进 Action 体系的原因：状态一致性问题（先显示什么、何时替换、失败怎么办）被框架接管了。

### 坑点

- 乐观值回滚后，真实列表里**没有**这条消息。失败提示要靠 `useActionState` 的返回值或错误边界，二者不是一回事。
- 临时 id 要保证唯一且与真实数据 id 不冲突，否则 React 的 key 复用可能出现渲染错乱。
- 如果 Action 成功但父组件的数据是「提交前快照」，要靠重新获取（refetch / router refresh）把真实结果带回来。

### 自检

合上文档回答：乐观消息什么时候变透明度？什么时候从列表里消失？如果 fetch 抛错了呢？三个问题都答得上来，本节才算过关。

## 四、RSC：把「取数 + 渲染」搬回服务端

FANDEX 的文章列表页在构建期由 Astro 渲染成静态 HTML——这其实就是「组件跑在服务端」的思路。React 19 的 RSC（React Server Components）把这套模型带进了 React 生态：组件分两类，Server Component 在服务端执行、零 JS 下发；Client Component（文件顶部标 `'use client'`）才能用 state 和事件，也就是 FANDEX 岛屿那种角色。

| 特性 | Server Component | Client Component |
| :--- | :--- | :--- |
| 运行环境 | 服务端 | 浏览器 |
| 取数 | 直接访问数据库 / 文件系统 | 通过 API / fetch |
| 交互性 | 无（无 useState、无事件） | 有 |
| 下发体积 | 零 JS | 计入客户端 bundle |
| 声明方式 | 默认 | 顶部 `'use client'` |

```tsx
// app/posts/page.tsx — 默认就是 Server Component（Next.js App Router）
import { db } from '@/lib/db';
import { LikeButton } from './LikeButton';

export default async function PostsPage() {
  const posts = await db.post.findMany({ take: 10 });

  return (
    <div>
      <h1>最新文章</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          {/* 交互下沉给岛屿式的客户端组件 */}
          <LikeButton postId={post.id} />
        </article>
      ))}
    </div>
  );
}
```

```tsx
// LikeButton.tsx
'use client';

import { useState, useTransition } from 'react';

export function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    setLiked(!liked);
    startTransition(async () => {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    });
  };

  return (
    <button onClick={handleLike} disabled={isPending}>
      {liked ? '已赞' : '点赞'}
    </button>
  );
}
```

组合规则只有两条，但都反直觉，务必记住：

- Server Component **可以** import Client Component 并传 props（可序列化的）；
- Client Component **不能** import Server Component，但可以把 Server Component 作为 `children` prop 传进去——因为渲染发生在服务端，客户端只是拿到了渲染结果。

> RSC 需要框架支持（Next.js App Router、React Router v7 框架模式、RedwoodJS 等）。纯 Vite + React 的 SPA 里不存在 RSC，`'use client'` 写了也没意义。FANDEX 的岛屿由 Astro 接管，走的是另一条同目标的路线。

## 五、流式 SSR：先给壳，再补洞

RSC 之外，React 18 就引入了流式 SSR（`renderToPipeableStream` / `renderToReadableStream`），React 19 在此基础上继续完善。思想：不必等整棵树渲染完，外壳先发，慢的部分由 Suspense 标记，数据到了再流式补进 HTML。

```tsx
import { renderToPipeableStream } from 'react-dom/server';
import { App } from './App';

app.get('/', (req, res) => {
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() {
      res.setHeader('content-type', 'text/html');
      pipe(res);
    },
    onError(error) {
      console.error('SSR 错误：', error);
    },
  });
});
```

Next.js App Router 把这套机制包成了默认行为——包一层 Suspense 就自动流式：

```tsx
// app/page.tsx
import { Suspense } from 'react';

async function SlowStats() {
  const res = await fetch('https://api.example.com/stats', {
    next: { revalidate: 60 },
  });
  const data = await res.json();
  return <div>{data.summary}</div>;
}

export default function Page() {
  return (
    <div>
      <h1>FANDEX 今日速览</h1>
      <Suspense fallback={<p>统计加载中...</p>}>
        <SlowStats />
      </Suspense>
    </div>
  );
}
```

多个独立 Suspense 边界各自流式注入，互不阻塞——这是性能优化的关键手法：慢接口不应拖住整个页面首字节。

## 六、React 19 的其他顺带改进

这些改动小，但每一个都消灭了一个第三方库：

- **文档元数据**：组件里直接写 `<title>` / `<meta>` / `<link>`，React 自动提升到 head，SEO 依赖 react-helmet 的理由没了。

```tsx
function ArticlePage({ post }: { post: Post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.excerpt} />
      <link rel="canonical" href={`https://fandex.example.com/posts/${post.id}`} />
      <h1>{post.title}</h1>
    </article>
  );
}
```

- **样式表与异步脚本**：`<link rel="stylesheet" precedence="...">` 控制加载顺序；`<script async>` 放在组件树里 React 负责去重与放置。
- **ref 回调可以返回清理函数**：卸载时执行，对齐 useEffect 的心智。

```tsx
function AutoFocusInput() {
  const ref = useCallback((node: HTMLInputElement | null) => {
    if (!node) return;
    node.focus();
    return () => node.blur(); // 卸载清理（React 19 新增）
  }, []);
  return <input ref={ref} />;
}
```

- **ref 作为普通 prop**：函数组件不再需要 forwardRef 包一层（旧 API 仍在但已不必要，详见 [React 19 新增 API](/react/420-React19NewAPI)）。

## 坑点清单（合卷自检）

1. `use()` 读的 Promise 必须在渲染期创建或由外部传入，不能放模块顶层——为什么？
2. `useFormStatus` 必须在 form 的子组件中调用——按钮直接写在 form 里却读不到状态，最常见原因是什么？
3. `useActionState` 的 action 签名第一个参数是什么？
4. 乐观更新失败后列表里那条消息去哪了？谁来提示用户？
5. Client Component 想渲染一段服务端内容，正确的传递方式是哪种 prop？

## 练习

1. 把本文的留言功能补全成一个可运行的组件：`CommentForm`（useActionState + useFormStatus）与 `CommentList`（useOptimistic），提交失败时用 `useActionState` 的返回值渲染错误。
2. 写一个「多按钮表单」：保存与发布共用一个 form，`formAction` 各自处理，提交后展示不同的提示文案。
3. 在一个页面里放三个独立的 Suspense 边界，让其中一个故意延迟 2 秒返回，观察其余两块是否先渲染出来。

## 下一步

- [React 19 新增 API](/react/420-React19NewAPI)：use、useEffectEvent、Activity、ref 作为 prop 的完整清单
- [Server 与 Client Components](/react/400-ServerClientComponents)：RSC 边界的深入玩法
- [性能优化](/react/080-PerformanceOptimization)：React Compiler 时代还需要手动 memo 吗
