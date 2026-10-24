---
order: 150
title: Next.js 全栈开发
module: 'react'
category: 前端技术
difficulty: advanced
description: Next.js 全栈拼图：Server Actions、中间件、API Routes、数据库集成、认证与部署。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'react/080-PerformanceOptimization'
  - 'react/110-JSXDeepAnalysis'
  - 'react/120-FiberArchitecture'
  - 'react/400-ServerClientComponents'
  - 'react/410-NextJsAppRouter'
prerequisites: []
---

## 知识点地图

- **知识类别**：服务端 / Next.js 全栈能力（服务端写操作、请求管道、API 层、数据层、认证与部署）。
- **解决什么问题**：React 组件解决「界面怎么画」，全栈应用还差四块：客户端怎么安全地写数据（Server Actions）、请求进来先经过什么（中间件）、没有组件参与的原生 HTTP 接口怎么写（Route Handlers）、数据存哪里与怎么部署上线。本篇把这四块拼成一整张全栈地图。
- **什么时候用到**：从「前端页面」走向「完整产品」时；评审「这个操作放 Server Action 还是 API 路由」这类架构问题时。

## 与相邻篇章的分工

- App Router 的文件约定、布局嵌套、并行/拦截路由等**路由与渲染结构**见 [Next.js App Router](/react/410-NextJsAppRouter)——本篇不再重复文件树，只讲挂在路由之上的全栈能力；
- Server/Client Components 的边界规则、RSC 协议与流式渲染原理见 [Server 与 Client 组件](/react/400-ServerClientComponents)——本篇默认你已知道「默认服务端、按需客户端」，直接进入数据与部署；
- 本篇的主角是**写路径与运维面**：Server Actions（§1）、中间件（§2）、Route Handlers（§3）、数据库（§4）、认证（§5）、部署（§6）。

## 学习目标

- 掌握「1. Server Actions」的核心机制、典型用法与常见陷阱
- 掌握「2. 中间件」的核心机制、典型用法与常见陷阱
- 掌握「3. API Routes」的核心机制、典型用法与常见陷阱



## 1. Server Actions

Server Actions 是客户端调用服务端函数的官方通道，本节示例承接 [Next.js App Router](/react/410-NextJsAppRouter) 的路由结构；边界与序列化约束的原理见 [Server 与 Client 组件](/react/400-ServerClientComponents)。

### 1.1 表单 Action

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

### 1.2 useActionState 配合

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

## 2. 中间件

### 2.1 基本用法

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

### 2.2 高级中间件

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

## 3. API Routes

### 3.1 Route Handlers

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

### 3.2 动态路由

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

### 3.3 流式响应

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

## 4. 数据库集成

### 4.1 Prisma

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

### 4.2 Drizzle ORM

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

## 5. 认证（NextAuth.js）

### 5.1 安装配置

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

### 5.2 在组件中使用

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

## 6. 部署

### 6.1 Vercel 部署（推荐）

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

### 6.2 Docker 部署

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

### 6.3 next.config.ts 关键配置

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

### 6.4 部署平台对比

| 平台                 | 特点                   | 适用场景           |
| :------------------- | :--------------------- | :----------------- |
| **Vercel**           | 零配置、Edge、预览部署 | 个人项目、初创团队 |
| **Docker + VPS**     | 完全控制、自定义       | 企业级、合规要求   |
| **AWS (Amplify)**    | AWS 生态集成           | 已有 AWS 基础设施  |
| **Railway**          | 简单部署、数据库集成   | 快速原型           |
| **Cloudflare Pages** | 全球 CDN、Workers      | 边缘计算需求       |
