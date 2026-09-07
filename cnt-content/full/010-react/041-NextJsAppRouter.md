---
order: 410
title: Next.js App Router
module: 'react'
category: 前端技术
difficulty: advanced
description: Next.js App Router详解：文件夹约定、布局、加载态、错误态。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'react/039-ReactCompilerAutoMemoization'
  - 'react/040-ServerClientComponents'
  - 'react/042-React19NewAPI'
  - 'react/043-ConcurrentRenderInterruptible'
prerequisites:
  - 'react/001-OverviewEnvSetup'
---

## 1. 文件夹约定

### 1.1 路由结构

```
app/
  layout.tsx          # 根布局
  page.tsx            # 首页 /
  loading.tsx         # 全局加载态
  error.tsx           # 全局错误态
  not-found.tsx       # 404 页面
  about/
    page.tsx          # /about
  blog/
    layout.tsx        # /blog 布局
    page.tsx          # /blog
    [slug]/
      page.tsx        # /blog/:slug
```

### 1.2 特殊文件

| 文件            | 用途           |
| --------------- | -------------- |
| `layout.tsx`    | 共享布局       |
| `page.tsx`      | 路由页面       |
| `loading.tsx`   | 加载状态       |
| `error.tsx`     | 错误处理       |
| `not-found.tsx` | 404            |
| `template.tsx`  | 重新挂载的布局 |
| `default.tsx`   | 并行路由默认   |

## 2. 布局嵌套

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <nav>导航</nav>
        {children}
      </body>
    </html>
  );
}

// app/blog/layout.tsx
export default function BlogLayout({ children }) {
  return (
    <div className="blog-layout">
      <Sidebar />
      {children}
    </div>
  );
}
```

## 3. 加载态

```tsx
// app/blog/loading.tsx
export default function Loading() {
  return <Skeleton />;
}
```

Next.js 自动用 Suspense 包裹页面，显示 loading.tsx。

## 4. 错误态

```tsx
// app/error.tsx
'use client';

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>出错了</h2>
      <button onClick={reset}>重试</button>
    </div>
  );
}
```

## 5. 数据获取

```tsx
// Server Component 中直接 async
async function Page() {
  const data = await fetch('https://api.example.com/data');
  return <div>{data.title}</div>;
}
```
## 文件约定 (File Conventions)

**layout.tsx 布局**
`app/<segment>/layout.tsx`
```tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>;
}
```

**page.tsx 页面**
`app/<segment>/page.tsx`
```tsx
export default function Page() {
  return <h1>Home</h1>;
}
```

**loading.tsx 加载态**
`app/<segment>/loading.tsx`
```tsx
export default function Loading() {
  return <Spinner />;
}
```

**error.tsx 错误边界**
`app/<segment>/error.tsx`
```tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <p>{error.message}</p>
      <button onClick={reset}>重试</button>
    </div>
  );
}
```

**not-found.tsx 404 页面**
`app/<segment>/not-found.tsx`
```tsx
export default function NotFound() {
  return <h1>页面不存在</h1>;
}
```

**template.tsx 模板**
`app/<segment>/template.tsx`
```tsx
export default function Template({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

**default.tsx 默认插槽**
`app/<segment>/default.tsx`
```tsx
export default function Default() {
  return <p>默认内容</p>;
}
```

**route.ts API 路由**
`app/api/<name>/route.ts`
```tsx
export async function GET(request: Request) {
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json(body, { status: 201 });
}
```

**middleware.ts 中间件**
`middleware.ts`
```tsx
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## 动态路由文件

**动态路由 [param]**
`app/users/[id]/page.tsx`
```tsx
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <h1>User {id}</h1>;
}
```

**catch-all [...slug]**
`app/docs/[...slug]/page.tsx`
```tsx
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <p>{slug.join('/')}</p>;
}
```

**catch-all 可选 [[...slug]]**
`app/docs/[[...slug]]/page.tsx`
```tsx
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  return <p>{slug?.join('/') ?? 'home'}</p>;
}
```

---

## async params / searchParams

**page props 类型**
```tsx
type PageProps = {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { q } = await searchParams;
  return <div>{id} - {q}</div>;
}
```

---

## cookies / headers

**cookies 服务端**
`import { cookies } from 'next/headers';`
```tsx
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  return <p>{token}</p>;
}
```

**cookies 设置**
```tsx
const cookieStore = await cookies();
cookieStore.set('theme', 'dark', {
  httpOnly: true,
  secure: true,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
});
```

**headers 服务端**
`import { headers } from 'next/headers';`
```tsx
import { headers } from 'next/headers';

export default async function Page() {
  const headerList = await headers();
  const userAgent = headerList.get('user-agent');
  return <p>{userAgent}</p>;
}
```

---

## Server Actions

**'use server'**
```tsx
// app/actions.ts
'use server';

export async function createItem(formData: FormData) {
  const title = formData.get('title') as string;
  await db.items.create({ data: { title } });
}

// 调用
'use client';
import { createItem } from '@/app/actions';

function Form() {
  return (
    <form action={createItem}>
      <input name="title" />
      <button type="submit">创建</button>
    </form>
  );
}
```

**inline server action**
```tsx
export default function Page() {
  async function submit(formData: FormData) {
    'use server';
    await db.items.create({ data: { title: formData.get('title') as string } });
  }
  return <form action={submit}><input name="title" /><button>OK</button></form>;
}
```

---

## Layout / Page 元数据

**metadata 静态**
`export const metadata: Metadata = {...}`
```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '用户中心',
  description: '用户信息管理',
  openGraph: { images: ['/og.png'] },
};
```

**generateMetadata 动态**
`export async function generateMetadata({ params }): Promise<Metadata>`
```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getUser(id);
  return { title: user.name };
}
```

---

## navigation API

**useRouter**
`import { useRouter } from 'next/navigation';`
```tsx
'use client';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  return (
    <button onClick={() => router.push('/login')}>登录</button>
    <button onClick={() => router.back()}>返回</button>
    <button onClick={() => router.refresh()}>刷新</button>
  );
}
```

**usePathname / useSearchParams**
```tsx
'use client';
import { usePathname, useSearchParams } from 'next/navigation';

function Breadcrumb() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get('q');
  return <span>{pathname}{q ? `?q=${q}` : ''}</span>;
}
```

---

## Link 与 Image

**Link**
`<Link href=<path> [prefetch]>...</Link>`
```tsx
import Link from 'next/link';

<Link href="/dashboard">控制台</Link>
<Link href={{ pathname: '/users', query: { id: '1' } }}>用户</Link>
<Link href="/about" prefetch={false}>关于</Link>
```

**Image 优化图片**
`<Image src=<src> alt=<alt> [width] [height] [fill] />`
```tsx
import Image from 'next/image';

<Image src="/logo.png" alt="Logo" width={120} height={40} />
<Image src={user.avatar} alt={user.name} fill sizes="(max-width: 768px) 100vw" />
```

---

## generateStaticParams

**静态参数生成**
`export async function generateStaticParams()`
```tsx
export async function generateStaticParams() {
  const users = await db.users.findMany();
  return users.map(u => ({ id: u.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <h1>{id}</h1>;
}
```

---

## Suspense 与流式渲染

**Suspense 边界**
```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <AsyncComponent />
    </Suspense>
  );
}
```

**loading.tsx 等价**
```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <div>加载中...</div>;
}
```
