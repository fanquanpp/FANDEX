---
order: 10
tags:
  - react
difficulty: advanced
title: Next.js全栈开发
module: react
category: React
description: 'App Router、Server Components、Server Actions、中间件、API Routes、数据库集成、认证与部署。'
author: fanquanpp
updated: '2026-06-14'
related:
  - react/性能优化
  - react/测试与工程化
  - react/JSX深度解析
  - react/Fiber架构
prerequisites: []
---

## 1. App Router

Next.js 15 的 App Router 基于文件系统路由，使用 React Server Components 作为默认渲染模式。

### 1.1 项目结构

```
app/
├── layout.tsx              # 根布局（必须）
├── page.tsx                # 首页 (/)
├── loading.tsx             # 加载状态
├── error.tsx               # 错误处理
├── not-found.tsx           # 404
├── global-error.tsx        # 全局错误
├── default.tsx             # Parallel Fallback
├── template.tsx            # 重新挂载的布局
├── route.ts                # API 路由
├── (marketing)/            # 路由组（不影响 URL）
│   ├── layout.tsx
│   ├── about/page.tsx      # /about
│   └── contact/page.tsx    # /contact
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx            # /dashboard
│   └── settings/page.tsx   # /dashboard/settings
├── blog/
│   ├── page.tsx            # /blog
│   └── [slug]/page.tsx     # /blog/:slug（动态路由）
└── api/
    ├── users/route.ts      # /api/users
    └── auth/[...nextauth]/route.ts  # Catch-all 路由
```

### 1.2 布局与模板

```tsx
// app/layout.tsx — 根布局（跨路由持久化，不会重新挂载）
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FANDEX App',
  description: 'React 全栈应用',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <nav>全局导航</nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

```tsx
// app/template.tsx — 路由切换时重新挂载
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in">{children}</div>;
}
```

### 1.3 并行路由与拦截路由

```tsx
// app/layout.tsx — 并行路由
export default function Layout({
  children,
  team,
  analytics,
}: {
  children: React.ReactNode;
  team: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2">
        <div>{team}</div>
        <div>{analytics}</div>
      </div>
    </div>
  );
}
```

```tsx
// app/@modal/(.)login/page.tsx — 拦截路由
// 当从其他页面导航到 /login 时，显示为模态框
export default function LoginModal() {
  return (
    <dialog open>
      <LoginForm />
    </dialog>
  );
}

// app/login/page.tsx — 直接访问 /login 时显示完整页面
export default function LoginPage() {
  return <LoginForm />;
}
```

## 2. Server Components

### 2.1 数据获取

```tsx
// app/posts/page.tsx — Server Component（默认）
import { db } from '@/lib/db';

// 直接访问数据库
async function PostsPage() {
  const posts = await db.post.findMany({
    orderBy: { createdAt: 'desc' },
    include: { author: true },
  });

  return (
    <div>
      <h1>文章列表</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>作者：{post.author.name}</p>
        </article>
      ))}
    </div>
  );
}

export default PostsPage;
```

### 2.2 数据缓存与重新验证

```tsx
// 静态数据 — 构建时获取，永久缓存
const staticData = await fetch('https://api.example.com/config', {
  cache: 'force-cache',
});

// 动态数据 — 每次请求都获取
const dynamicData = await fetch('https://api.example.com/news', {
  cache: 'no-store',
});

// 定时重新验证 — 每 60 秒重新获取
const revalidatedData = await fetch('https://api.example.com/posts', {
  next: { revalidate: 60 },
});

// 按需重新验证 — 通过 tag
const taggedData = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'] },
});

// 在 Server Action 中触发
import { revalidateTag } from 'next/cache';
revalidateTag('posts');
```

### 2.3 Server/Client 边界

```tsx
// Server Component 可以导入 Client Component
import { LikeButton } from './LikeButton'; // 'use client'

async function PostPage({ id }: { id: string }) {
  const post = await getPost(id); // 服务端获取数据

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
      {/* 将服务端数据作为 props 传给客户端组件 */}
      <LikeButton postId={id} initialLiked={post.isLikedByUser} />
    </article>
  );
}
```

> **注意**：Server Component 不能使用 useState、useEffect、onClick 等客户端 API，也不能导入 Client Component 后再将其作为 Server Component 使用。

## 3. Server Actions

### 3.1 表单 Action

```tsx
// app/actions/post.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100),
  content: z.string().min(10, '内容至少 10 个字符'),
});

export async function createPost(formData: FormData) {
  const raw = {
    title: formData.get('title') as string,
    content: formData.get('content') as string,
  };

  const result = createPostSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  await db.post.create({ data: result.data });
  revalidatePath('/posts');
  redirect('/posts');
}

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } });
  revalidatePath('/posts');
}
```

### 3.2 useActionState 配合

```tsx
'use client';

import { useActionState } from 'react';
import { createPost } from '@/app/actions/post';

export default function NewPostPage() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" placeholder="标题" required />
      {state?.error?.title && <p className="error">{state.error.title[0]}</p>}

      <textarea name="content" placeholder="内容" required />
      {state?.error?.content && <p className="error">{state.error.content[0]}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? '发布中...' : '发布'}
      </button>
    </form>
  );
}
```

## 4. 中间件

### 4.1 基本用法

```tsx
// middleware.ts — 项目根目录
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  // 保护路由
  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 已登录用户访问登录页，重定向到首页
  if (request.nextUrl.pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
```

### 4.2 高级中间件

```tsx
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 添加自定义 Header
  response.headers.set('x-request-id', crypto.randomUUID());

  // CORS 处理
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // A/B 测试
  const variant = Math.random() > 0.5 ? 'A' : 'B';
  response.cookies.set('ab-variant', variant);

  return response;
}
```

## 5. API Routes

### 5.1 Route Handlers

```tsx
// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '10');

  const users = await db.user.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json({ users, page, limit });
}

// POST /api/users
export async function POST(request: Request) {
  const body = await request.json();

  const user = await db.user.create({
    data: { name: body.name, email: body.email },
  });

  return NextResponse.json(user, { status: 201 });
}
```

### 5.2 动态路由

```tsx
// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

### 5.3 流式响应

```tsx
// app/api/chat/route.ts
export async function POST(request: Request) {
  const { message } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // 模拟流式 AI 响应
      const words = `收到消息：${message}`.split('');
      for (const word of words) {
        controller.enqueue(encoder.encode(word));
        await new Promise((r) => setTimeout(r, 50));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

## 6. 数据库集成

### 6.1 Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```tsx
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

### 6.2 Drizzle ORM

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

```tsx
// lib/schema.ts
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false),
  authorId: text('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

```tsx
// lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

## 7. 认证（NextAuth.js）

### 7.1 安装配置

```bash
npm install next-auth@beta @auth/prisma-adapter
```

```tsx
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    GitHub,
    Google,
    Credentials({
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (user && verifyPassword(credentials.password as string, user.passwordHash)) {
          return user;
        }
        return null;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
});

export const { GET, POST } = handlers;
```

### 7.2 在组件中使用

```tsx
import { auth } from '@/app/api/auth/[...nextauth]/route';

// Server Component 中获取会话
async function Dashboard() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <h1>欢迎，{session.user?.name}</h1>;
}
```

```tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>加载中...</p>;

  if (session) {
    return (
      <div>
        <span>{session.user?.name}</span>
        <button onClick={() => signOut()}>退出</button>
      </div>
    );
  }

  return <button onClick={() => signIn()}>登录</button>;
}
```

## 8. 部署

### 8.1 Vercel 部署（推荐）

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel

# 生产环境部署
vercel --prod
```

Vercel 自动配置：

- 自动 CI/CD（连接 GitHub 仓库）
- 自动预览部署（PR 预览）
- Edge Functions
- 图片优化
- 分析与监控

### 8.2 Docker 部署

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# 依赖安装
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 构建
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

# 运行
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

```bash
# 构建并运行
docker build -t my-next-app .
docker run -p 3000:3000 my-next-app
```

### 8.3 next.config.ts 关键配置

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Docker 部署需要 standalone 输出
  output: 'standalone',

  // 图片优化域名白名单
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }],
  },

  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 重定向
  async redirects() {
    return [{ source: '/old-blog/:slug', destination: '/blog/:slug', permanent: true }];
  },

  // Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 8.4 部署平台对比

| 平台                 | 特点                   | 适用场景           |
| :------------------- | :--------------------- | :----------------- |
| **Vercel**           | 零配置、Edge、预览部署 | 个人项目、初创团队 |
| **Docker + VPS**     | 完全控制、自定义       | 企业级、合规要求   |
| **AWS (Amplify)**    | AWS 生态集成           | 已有 AWS 基础设施  |
| **Railway**          | 简单部署、数据库集成   | 快速原型           |
| **Cloudflare Pages** | 全球 CDN、Workers      | 边缘计算需求       |
