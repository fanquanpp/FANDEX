# RSC 指令语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 'use client' 客户端组件指令

**'use client'**
`'use client';`
```tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**client boundary 声明**
```tsx
'use client';

// 该文件中所有 export 默认成为 Client Component
export const ComponentA = () => <div />;
export const ComponentB = () => <div />;
```

---

## 'use server' 服务端指令

**'use server' 文件级**
`'use server';`
```tsx
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/db';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  await db.post.create({ data: { title } });
  revalidatePath('/posts');
}

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } });
}
```

**inline 'use server'**
```tsx
function Page() {
  async function submit(formData: FormData) {
    'use server';
    await saveRecord(formData);
  }
  return <form action={submit}>...</form>;
}
```

---

## Server Action 调用

**form action 绑定**
`<form action={<serverAction>}>`
```tsx
'use client';
import { createPost } from '@/app/actions';

export function Form() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button>提交</button>
    </form>
  );
}
```

**按钮调用**
`<button formAction={<action>}>`
```tsx
<form>
  <button formAction={login}>登录</button>
  <button formAction={register}>注册</button>
</form>
```

**useActionState 绑定**
```tsx
'use client';
import { useActionState } from 'react';
import { createPost } from '@/app/actions';

export function Form() {
  const [state, action] = useActionState(createPost, null);
  return <form action={action}>...</form>;
}
```

---

## 'use cache' 缓存指令

**'use cache' 文件级**
```tsx
// cached-data.ts
'use cache';

import { db } from '@/lib/db';

export async function getCachedUser(id: string) {
  return db.user.findUnique({ where: { id } });
}
```

**'use cache' 函数级**
```tsx
export async function getProducts() {
  'use cache';
  return db.product.findMany();
}
```

**带标签缓存**
```tsx
export async function getUser(id: string) {
  'use cache';
  const user = await db.user.findUnique({ where: { id } });
  return user;
}

// 失效缓存
import { revalidateTag } from 'next/cache';
revalidateTag(`user-${id}`);
```

---

## 'use no memo' 指令

**禁用自动记忆化**
```tsx
'use no memo';

function MyComponent() {
  // 此组件不参与 React Compiler 自动记忆化
  return <div>...</div>;
}
```

---

## 缓存 API

**unstable_cache**
`unstable_cache<<T>>(<fn>, <keys>, <options>)`
```tsx
import { unstable_cache } from 'next/cache';

const getCachedUser = unstable_cache(
  async (id: string) => db.user.findUnique({ where: { id } }),
  ['user'],
  { tags: ['user'], revalidate: 60 }
);

const user = await getCachedUser('1');
```

**revalidateTag / revalidatePath**
```tsx
import { revalidateTag, revalidatePath } from 'next/cache';

revalidateTag('user');
revalidatePath('/users');
revalidatePath('/', 'layout');
```

**cache (React 19)**
```tsx
import { cache } from 'react';

const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

// 同一请求内多次调用共享结果
const u1 = await getUser('1');
const u2 = await getUser('1'); // 命中缓存
```

---

## Cookie / Headers 服务器 API

**cookies**
`import { cookies } from 'next/headers';`
```tsx
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const token = cookieStore.get('token')?.value;
cookieStore.set('key', 'value', { httpOnly: true, secure: true });
cookieStore.delete('key');
```

**headers**
`import { headers } from 'next/headers';`
```tsx
import { headers } from 'next/headers';

const headerList = await headers();
const auth = headerList.get('authorization');
```

---

## dynamic / generateStaticParams

**dynamic 选项**
`export const dynamic = '<mode>';`
```tsx
export const dynamic = 'force-dynamic'; // 'auto' | 'force-static' | 'force-dynamic' | 'error'
export const dynamicParams = true;
export const revalidate = 60;            // 秒
```

**fetchCache 选项**
```tsx
export const fetchCache = 'force-no-store'; // 'auto' | 'default-no-store' | 'only-no-store' | 'default-cache' | 'force-cache' | 'no-store'
```

---

## Server / Client 边界

**导入规则**
- Server Component 可导入 Server Component
- Server Component 可导入 Client Component
- Client Component 不能直接调用 Server Action(需通过 props)
- Server Component 不能使用 useState / useEffect / ref

**props 传递**
```tsx
// Server Component
function Page() {
  return <ClientComponent onClick={serverAction} />;
}

// Client Component
'use client';
function ClientComponent({ onClick }: { onClick: (id: string) => Promise<void> }) {
  return <button onClick={() => onClick('1')}>删除</button>;
}
```

---

## useOptimistic 在 Server Action 中

```tsx
'use client';
import { useOptimistic } from 'react';
import { addLike } from '@/app/actions';

function LikeButton({ likes }: { likes: number }) {
  const [optimistic, addOptimistic] = useOptimistic(
    likes,
    (state, delta: number) => state + delta
  );
  return (
    <form action={async () => {
      addOptimistic(1);
      await addLike();
    }}>
      <button>{optimistic} 赞</button>
    </form>
  );
}
```
