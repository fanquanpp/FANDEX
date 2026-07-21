---
order: 6
tags:
  - react
difficulty: advanced
title: React19新特性
module: react
category: React
description: 'React Server Components、use() Hook、Actions、useFormStatus、useOptimistic、useActionState、Suspense 进阶与流式 SSR。'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/Hooks深入
  - react/Context与全局状态
  - react/路由与数据获取
  - react/性能优化
prerequisites: []
---

## 1. React Server Components (RSC)

React Server Components 是 React 19 最重要的特性，允许组件在服务端渲染，减少客户端 JavaScript 体积。

### 1.1 Server Components vs Client Components

| 特性        | Server Component        | Client Component           |
| :---------- | :---------------------- | :------------------------- |
| 运行环境    | 服务端                  | 客户端（浏览器）           |
| 获取数据    | 直接访问数据库/文件系统 | 通过 API/fetch             |
| 交互性      | 无（无状态、无事件）    | 有（useState、onClick 等） |
| Bundle 体积 | 零（不发送到客户端）    | 包含在客户端 Bundle 中     |
| 文件后缀    | `.tsx`（默认）          | `.tsx` + `'use client'`    |

### 1.2 Server Components 示例

```tsx
// app/posts/page.tsx — 默认是 Server Component
import { db } from '@/lib/db';

// 直接访问数据库，无需 API
async function PostsPage() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <div>
      <h1>最新文章</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}

export default PostsPage;
```

### 1.3 Client Components

```tsx
'use client'; // 声明为客户端组件

import { useState } from 'react';

export function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  const handleLike = async () => {
    setLiked(!liked);
    setCount((c) => (liked ? c - 1 : c + 1));
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
  };

  return (
    <button onClick={handleLike}>
      {liked ? '' : ''} {count}
    </button>
  );
}
```

### 1.4 组合模式

```tsx
// Server Component 可以导入和渲染 Client Component
import { LikeButton } from './LikeButton'; // Client Component
import { getPost } from '@/lib/db';

async function PostPage({ id }: { id: string }) {
  const post = await getPost(id); // 服务端数据获取

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
      {/* Client Component 嵌入 Server Component */}
      <LikeButton postId={id} />
    </article>
  );
}
```

> **注意**：Client Component 不能导入 Server Component，但可以通过 `children` prop 传入。

## 2. use() Hook

`use()` 是 React 19 新增的 Hook，用于读取 Promise 或 Context 的值。

### 2.1 读取 Promise

```tsx
import { use, Suspense } from 'react';

// 在组件外部创建 Promise
const userPromise = fetch('/api/user').then((res) => res.json());

function UserProfile() {
  // use() 会挂起组件直到 Promise resolve
  const user = use(userPromise) as { name: string; email: string };

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// 必须配合 Suspense 使用
function App() {
  return (
    <Suspense fallback={<p>加载用户信息...</p>}>
      <UserProfile />
    </Suspense>
  );
}
```

### 2.2 读取 Context

```tsx
import { use, createContext } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

// use() 可以在条件语句中调用（与 useContext 不同）
function ThemedComponent({ showTheme }: { showTheme: boolean }) {
  if (showTheme) {
    const theme = use(ThemeContext); //  use() 可以在条件中调用
    return <p>当前主题：{theme}</p>;
  }
  return <p>未显示主题</p>;
}
```

### 2.3 use() 与 useContext 的区别

| 特性          | useContext | use()               |
| :------------ | :--------- | :------------------ |
| 条件中调用    | 不可以     | 可以                |
| 读取 Promise  | 不可以     | 可以                |
| 读取 Context  | 可以       | 可以                |
| 需要 Suspense | 不需要     | 读取 Promise 时需要 |

## 3. Actions

Actions 是 React 19 引入的异步状态管理模式，简化表单提交和异步操作。

### 3.1 表单 Action

```tsx
async function createUser(formData: FormData) {
  'use server'; // Next.js Server Action

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  await db.user.create({ data: { name, email } });
  redirect('/users');
}

function CreateUserForm() {
  return (
    <form action={createUser}>
      <input name="name" placeholder="姓名" required />
      <input name="email" type="email" placeholder="邮箱" required />
      <button type="submit">创建用户</button>
    </form>
  );
}
```

### 3.2 客户端 Action

```tsx
function SearchForm() {
  const [results, setResults] = useState([]);

  async function handleSearch(formData: FormData) {
    const query = formData.get('query') as string;
    const res = await fetch(`/api/search?q=${query}`);
    const data = await res.json();
    setResults(data);
  }

  return (
    <form action={handleSearch}>
      <input name="query" />
      <button type="submit">搜索</button>
      <ul>
        {results.map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
    </form>
  );
}
```

## 4. useFormStatus

`useFormStatus` 获取父级 `<form>` 的提交状态，无需传递 Props。

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? '提交中...' : '提交'}
    </button>
  );
}

function ContactForm() {
  async function handleSubmit(formData: FormData) {
    await sendEmail(formData);
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <SubmitButton /> {/* 自动获取表单状态 */}
    </form>
  );
}
```

> **注意**：`useFormStatus` 必须在 `<form>` 内部的组件中调用，且该组件必须是 `<form>` 的子组件，不能是 `<form>` 本身。

## 5. useOptimistic

`useOptimistic` 实现乐观更新，在异步操作完成前先展示预期结果。

```tsx
import { useOptimistic, useState } from 'react';

interface Message {
  id: string;
  text: string;
  sending?: boolean;
}

function Chat({
  messages,
  onSend,
}: {
  messages: Message[];
  onSend: (text: string) => Promise<void>;
}) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (currentMessages, newText: string) => [
      ...currentMessages,
      { id: crypto.randomUUID(), text: newText, sending: true },
    ]
  );

  const [input, setInput] = useState('');

  async function handleSubmit(formData: FormData) {
    const text = formData.get('message') as string;
    setInput('');
    addOptimisticMessage(text); // 立即显示乐观消息
    await onSend(text); // 实际发送
  }

  return (
    <div>
      <ul>
        {optimisticMessages.map((msg) => (
          <li key={msg.id} style={{ opacity: msg.sending ? 0.5 : 1 }}>
            {msg.text} {msg.sending && '（发送中...）'}
          </li>
        ))}
      </ul>
      <form action={handleSubmit}>
        <input name="message" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

## 6. useActionState

`useActionState` 管理表单 Action 的状态（返回值、加载状态）。

```tsx
import { useActionState } from 'react';

interface FormState {
  message: string;
  success: boolean;
}

async function submitOrder(prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const item = formData.get('item') as string;
    const quantity = parseInt(formData.get('quantity') as string);

    await createOrder({ item, quantity });

    return { message: '订单创建成功！', success: true };
  } catch (error) {
    return { message: `创建失败：${(error as Error).message}`, success: false };
  }
}

function OrderForm() {
  const [state, submitAction, isPending] = useActionState(submitOrder, {
    message: '',
    success: false,
  });

  return (
    <form action={submitAction}>
      <input name="item" placeholder="商品名称" required />
      <input name="quantity" type="number" min="1" required />
      <button type="submit" disabled={isPending}>
        {isPending ? '提交中...' : '下单'}
      </button>
      {state.message && <p style={{ color: state.success ? 'green' : 'red' }}>{state.message}</p>}
    </form>
  );
}
```

## 7. Suspense 进阶

### 7.1 嵌套 Suspense

```tsx
import { Suspense } from 'react';

function Dashboard() {
  return (
    <div>
      <h1>仪表盘</h1>
      {/* 每个区域独立加载 */}
      <Suspense fallback={<ChartSkeleton />}>
        <SalesChart />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />
      </Suspense>

      <Suspense fallback={<ListSkeleton />}>
        <Notifications />
      </Suspense>
    </div>
  );
}
```

### 7.2 Suspense 与数据获取

```tsx
// 封装数据获取函数
function fetchUser(id: string) {
  let status = 'pending';
  let result: User;
  let error: Error;

  const promise = fetch(`/api/users/${id}`)
    .then((res) => res.json())
    .then((data) => {
      status = 'success';
      result = data;
    })
    .catch((err) => {
      status = 'error';
      error = err;
    });

  return {
    read() {
      if (status === 'pending') throw promise;
      if (status === 'error') throw error;
      return result;
    },
  };
}

// 在组件中使用
function UserProfile({ id }: { id: string }) {
  const user = fetchUser(id).read(); // 挂起直到数据就绪
  return <div>{user.name}</div>;
}
```

## 8. 流式 SSR

React 19 支持流式服务端渲染，允许逐步发送 HTML 到客户端。

### 8.1 Node.js 流式渲染

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

### 8.2 Next.js 中的流式渲染

Next.js App Router 默认使用流式 SSR：

```tsx
// app/page.tsx
import { Suspense } from 'react';

async function SlowData() {
  const data = await fetch('https://api.example.com/slow', {
    next: { revalidate: 60 },
  });
  const json = await data.json();
  return <div>{json.content}</div>;
}

export default function Page() {
  return (
    <div>
      <h1>快速内容</h1>
      {/* 快速内容立即显示，SlowData 流式加载 */}
      <Suspense fallback={<p>加载中...</p>}>
        <SlowData />
      </Suspense>
    </div>
  );
}
```

## 9. 其他 React 19 改进

### 9.1 文档元数据

```tsx
// React 19 支持在组件中声明 <title>、<meta> 等标签
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.excerpt} />
      <link rel="canonical" href={`https://example.com/posts/${post.id}`} />
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

### 9.2 样式表支持

```tsx
function Component() {
  return (
    <>
      {/* 通过 precedence 控制样式表加载顺序 */}
      <link rel="stylesheet" href="reset.css" precedence="default" />
      <link rel="stylesheet" href="styles.css" precedence="high" />
      <div className="styled">内容</div>
    </>
  );
}
```

### 9.3 异步脚本支持

```tsx
function MapComponent() {
  return (
    <>
      <script async src="https://maps.googleapis.com/maps/api/js" />
      <div id="map">地图容器</div>
    </>
  );
}
```

### 9.4 ref 回调清理

```tsx
function Input() {
  const ref = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      // 挂载时
      node.focus();
    }
    return () => {
      // 卸载时清理（React 19 新增）
    };
  }, []);

  return <input ref={ref} />;
}
```
