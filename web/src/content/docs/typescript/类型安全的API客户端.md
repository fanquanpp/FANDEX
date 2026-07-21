---
order: 71
title: 类型安全的API客户端
module: typescript
category: TypeScript
difficulty: advanced
description: 构建端到端类型安全的HTTP客户端
author: fanquanpp
updated: '2026-06-14'
related:
  - typescript/类型声明与模块解析
  - typescript/类型安全的事件系统
  - typescript/类型安全的状态管理
  - typescript/类型安全的表单验证
prerequisites:
  - typescript/语法速查
---

## 第一章 概述

### 1.1 为什么需要类型安全的 API 客户端

现代前端应用通过 HTTP/HTTPS 协议与后端进行数据交换，API 调用是应用的核心逻辑之一。然而，传统的 JavaScript API 客户端存在严重的类型缺陷：

```typescript
// 传统方案：无类型约束
async function fetchUser(id: string): Promise<any> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

const user = await fetchUser('123');
user.name;        // OK，但无法验证 name 属性存在
user.naem;        // 拼写错误，编译通过
user.email.address; // 无法验证嵌套属性
```

这种方案存在三大问题：

1. **请求参数无类型约束**：URL 路径、查询参数、请求体都使用宽泛的 `string` 或 `any`，拼写错误与类型错误只能在运行时暴露。
2. **响应数据无类型保证**：`response.json()` 返回 `any`，开发者基于"假设"访问响应字段，导致 `undefined` 访问错误。
3. **路由与方法不匹配**：调用 `DELETE /users` 时无法在编译时发现该路由只支持 `GET` 与 `POST`。

类型安全的 API 客户端通过 TypeScript 的泛型（Generics）、条件类型（Conditional Types）、模板字面量类型（Template Literal Types）和映射类型（Mapped Types）实现**端到端类型安全**：从请求构造到响应处理，每一步都有编译时保证。

```typescript
// 类型安全方案
const user = await api['/users/:id'].get({ params: { id: '123' } });
user.name;       // OK，类型为 string
user.naem;       // 编译错误：'naem' 不存在
user.email;      // 编译错误：'email' 不在 User 类型中

await api['/users/:id'].delete({ params: { id: '123' } }); // OK
await api['/users/:id'].put({ params: { id: '123' } });     // 编译错误：缺少 body
```

### 1.2 学习目标

完成本教程后，读者将能够：

1. 设计 API 路由类型映射（Route Type Map），描述路由路径、HTTP 方法、参数、查询、请求体、响应体的完整契约。
2. 使用模板字面量类型从路径中提取参数名，实现路径参数的类型安全。
3. 使用条件类型与可变元组实现条件参数（method 决定是否需要 body）。
4. 构建泛型请求函数，根据路由与方法自动推断所有参数与返回类型。
5. 实现类型安全的链式请求构建器与自动生成的 API 客户端。
6. 处理错误类型化、结果类型（Result Type）、重试策略与超时控制。
7. 集成 OpenAPI/Swagger 自动生成 API 类型定义。
8. 实现类型安全的请求/响应拦截器与认证管理。
9. 在 React、Vue 等框架中集成类型安全的 API Hook。
10. 分析类型安全 API 客户端对编译时与运行时性能的影响。

### 1.3 本教程的定位

本教程是 TypeScript "类型安全应用"系列的第五篇，与《类型安全的国际化》、《类型安全的表单验证》、《类型安全的状态管理》、《类型安全的事件系统》形成互补。前者侧重特定领域的类型设计模式，本教程侧重"如何用类型系统约束 HTTP 通信的端到端契约"。

参考 MIT 6.5810《Web Performance Engineering》与 Stanford CS142《Web Applications》课程对 API 设计的讲解：API 客户端的核心是"契约的精确表达"。本教程将这一思想用 TypeScript 的类型系统加以实现，使 API 调用的每一步都有编译时保证。

### 1.4 API 客户端的核心维度

完整的类型安全 API 客户端涉及多个维度：

| 维度 | 说明 | 本教程覆盖 |
|------|------|-----------|
| 路由路径 | URL 路径的静态约束 | 是 |
| 路径参数 | 动态路径参数的类型提取与替换 | 是 |
| HTTP 方法 | GET/POST/PUT/DELETE/PATCH 的方法约束 | 是 |
| 查询参数 | URL 查询字符串的类型约束 | 是 |
| 请求体 | POST/PUT/PATCH 请求体的类型约束 | 是 |
| 响应体 | 响应数据的类型推断 | 是 |
| 错误处理 | API 错误的类型化与结果类型 | 是 |
| 拦截器 | 请求/响应拦截器的类型安全 | 是 |
| 重试策略 | 失败重试的类型化策略 | 是 |
| 超时控制 | 请求超时的类型安全 | 是 |
| 请求取消 | AbortController 取消请求 | 是 |
| 文件上传 | FormData 与文件类型 | 是 |
| 认证管理 | Token 刷新与认证拦截 | 是 |
| OpenAPI 生成 | 从 OpenAPI 规范自动生成类型 | 是 |
| React Hook | useFetch / useMutation 等类型安全 Hook | 是 |
| Vue Composable | Vue 3 Composition API 集成 | 是 |

### 1.5 核心问题导引

阅读本教程时请带着以下问题：

1. **路由路径如何类型化**：`/users/:id` 中的 `:id` 是动态的，如何在类型层面提取 `id` 并约束其类型？
2. **方法与参数的条件关系**：`GET` 请求不需要 body，`POST` 请求需要 body，如何让类型系统根据方法自动决定是否需要 body？
3. **响应类型如何推断**：调用 `api['/users'].get()` 如何自动推断返回类型为 `User[]`？
4. **路径参数替换如何类型安全**：将 `:id` 替换为实际值时，如何保证替换后的路径仍然是合法的？
5. **错误如何类型化**：HTTP 错误（404、500）与业务错误（code: 'NOT_FOUND'）如何在类型层面区分？
6. **类型安全与开发体验如何平衡**：复杂的类型约束会增加编译时间，如何在两者间取得平衡？

### 1.6 端到端类型安全的形式化定义

端到端类型安全可以形式化定义为：

$$
\forall r \in \mathrm{Routes}, \forall m \in \mathrm{Methods}(r), \ \mathrm{Request}(r, m) \vdash \mathrm{Response}(r, m)
$$

即对于每个路由 $r$ 和该路由支持的每个方法 $m$，请求参数的类型决定了响应数据的类型。这一契约在编译时验证，运行时无需额外检查。

## 第二章 基础概念

### 2.1 API 路由类型映射

API 路由类型映射是类型安全 API 客户端的核心数据结构，它将每个路由路径映射到其支持的 HTTP 方法及对应的参数与响应类型：

```typescript
// API 路由类型映射
interface APIClient {
  '/users': {
    GET: { response: User[]; query?: { page?: number; limit?: number } };
    POST: { response: User; body: Omit<User, 'id'> };
  };
  '/users/:id': {
    GET: { response: User; params: { id: string } };
    PUT: { response: User; params: { id: string }; body: Partial<User> };
    DELETE: { response: void; params: { id: string } };
  };
  '/posts/:postId/comments': {
    GET: { response: Comment[]; params: { postId: string }; query?: { sort?: 'asc' | 'desc' } };
    POST: { response: Comment; params: { postId: string }; body: { content: string } };
  };
}
```

**结构说明**：

- 顶层键是路由路径，使用字面量字符串类型（如 `'/users/:id'`）。
- 每个路由对应的值是一个映射，键是 HTTP 方法（`GET`、`POST`、`PUT`、`DELETE`、`PATCH`），值是该方法的请求/响应契约。
- 每个方法的契约包含四个可选字段：
  - `response`：响应数据类型（必填）。
  - `params`：路径参数类型（可选，仅当路径包含 `:param` 时）。
  - `query`：查询参数类型（可选）。
  - `body`：请求体类型（可选，仅当方法是 POST/PUT/PATCH 时）。

### 2.2 路径参数提取

路径参数（Path Parameters）是 URL 路径中以 `:` 开头的动态片段。TypeScript 的模板字面量类型可以从路径中提取参数名：

```typescript
// 提取路径中的所有参数名
type ExtractPathParams<Path> = Path extends `${infer _}:${infer Param}/${infer Rest}`
  ? Param | ExtractPathParams<`/${Rest}`>
  : Path extends `${infer _}:${infer Param}`
  ? Param
  : never;

// 使用
type UserParams = ExtractPathParams<'/users/:id'>;
// 'id'

type CommentParams = ExtractPathParams<'/posts/:postId/comments/:commentId'>;
// 'postId' | 'commentId'

type NoParams = ExtractPathParams<'/users'>;
// never
```

**递归解析**：该类型递归地分割路径，每次提取 `:` 后的参数名，直到路径中不再包含 `:`。

### 2.3 路径参数替换

路径参数替换（Path Parameter Substitution）将路径中的 `:param` 替换为实际值。在类型层面，可以用模板字面量类型描述替换后的路径：

```typescript
// 替换路径中的参数
type ReplaceParams<Path, Params extends Record<string, string>> =
  Path extends `${infer Before}:${infer Param}/${infer Rest}`
    ? `${Before}${Params[Param]}${ReplaceParams<`/${Rest}`, Params>}`
    : Path extends `${infer Before}:${infer Param}`
    ? `${Before}${Params[Param]}`
    : Path;

// 使用
type ReplacedPath = ReplaceParams<'/users/:id', { id: '123' }>;
// '/users/123'

type ReplacedComplex = ReplaceParams<'/posts/:postId/comments/:commentId', { postId: 'p1'; commentId: 'c1' }>;
// '/posts/p1/comments/c1'
```

### 2.4 HTTP 方法的语义

不同 HTTP 方法有不同的语义与参数要求：

| 方法 | 语义 | body | 幂等性 | 安全性 |
|------|------|------|--------|--------|
| GET | 获取资源 | 无 | 幂等 | 安全 |
| POST | 创建资源 | 有 | 非幂等 | 不安全 |
| PUT | 完整更新资源 | 有 | 幂等 | 不安全 |
| PATCH | 部分更新资源 | 有 | 非幂等 | 不安全 |
| DELETE | 删除资源 | 通常无 | 幂等 | 不安全 |

类型安全的 API 客户端应反映这些语义：GET 与 DELETE 通常不需要 body，POST/PUT/PATCH 通常需要 body。

### 2.5 条件参数

不同方法对参数的要求不同，这通过条件类型与可变元组实现：

```typescript
// 根据方法决定是否需要 body
type RequestOptions<M extends HttpMethod, Route> = {
  method?: M;
  params?: Route extends { params: infer P } ? P : never;
  query?: Route extends { query: infer Q } ? Q : never;
} & (M extends 'POST' | 'PUT' | 'PATCH'
  ? Route extends { body: infer B } ? { body: B } : {}
  : {});
```

这一类型根据方法 $M$ 决定 `body` 字段是否必填：POST/PUT/PATCH 时必填，GET/DELETE 时不存在。

### 2.6 泛型请求函数

基于路由类型映射，构建泛型请求函数：

```typescript
async function request<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
>(
  path: Path,
  options: RequestOptions<Method, APIClient[Path][Method]>
): Promise<APIClient[Path][Method] extends { response: infer R } ? R : never> {
  // 实现省略
  return undefined as any;
}

// 使用
const users = await request('/users', { method: 'GET', query: { page: 1 } });
// 推断为 User[]

const user = await request('/users/:id', { method: 'GET', params: { id: '1' } });
// 推断为 User

await request('/users', { method: 'POST', body: { name: '张三' } });
// OK

await request('/users', { method: 'GET', body: { name: '张三' } });
// 编译错误：GET 请求不接受 body
```

### 2.7 infer 关键字

`infer` 关键字在条件类型中"推断"类型变量，是类型安全 API 客户端的核心工具：

```typescript
// 从 Route 类型中提取 response 类型
type GetResponse<Route> = Route extends { response: infer R } ? R : never;

// 从 Route 类型中提取 params 类型
type GetParams<Route> = Route extends { params: infer P } ? P : never;

// 从 Route 类型中提取 query 类型
type GetQuery<Route> = Route extends { query: infer Q } ? Q : never;

// 从 Route 类型中提取 body 类型
type GetBody<Route> = Route extends { body: infer B } ? B : never;

// 使用
type UserResponse = GetResponse<{ response: User; params: { id: string } }>;
// User

type UserParams = GetParams<{ response: User; params: { id: string } }>;
// { id: string }
```

## 第三章 历史演变

### 3.1 早期：原生 fetch 与 XMLHttpRequest（2005-2014）

早期的 Web API 调用使用 `XMLHttpRequest` 或 `fetch`，无任何类型约束：

```javascript
// XMLHttpRequest 时代
var xhr = new XMLHttpRequest();
xhr.open('GET', '/api/users/123', true);
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4 && xhr.status === 200) {
    var user = JSON.parse(xhr.responseText);
    console.log(user.name); // 无类型保证
  }
};
xhr.send();
```

这一方案的问题：无类型约束、回调地狱、错误处理繁琐。

### 3.2 jQuery.ajax 与 Promise（2010-2015）

jQuery.ajax 引入了 Promise 风格的 API，简化了错误处理：

```typescript
// jQuery.ajax
$.ajax({
  url: '/api/users/123',
  method: 'GET',
})
  .done((user: any) => {
    console.log(user.name);
  })
  .fail((xhr: any) => {
    console.error(xhr.responseText);
  });
```

仍然是 `any` 类型，无类型保证。

### 3.3 Axios 与 TypeScript 兴起（2015-2018）

Axios 是当时最流行的 HTTP 客户端，支持 Promise 与拦截器。TypeScript 兴起后，Axios 提供了基础类型：

```typescript
import axios from 'axios';

interface User {
  id: string;
  name: string;
}

// 显式指定响应类型
const response = await axios.get<User>('/api/users/123');
const user = response.data; // 类型为 User
```

**问题**：响应类型是显式指定的，与后端实际返回的类型可能不一致。如果后端修改了 API 但前端未更新类型，类型安全失效。

### 3.4 类型安全路由映射（2018-2020）

TypeScript 2.8 引入条件类型后，开发者开始构建类型安全的路由映射：

```typescript
interface APIClient {
  '/users': {
    GET: { response: User[] };
  };
}

async function request<Path extends keyof APIClient>(
  path: Path
): Promise<APIClient[Path]['GET']['response']> {
  // ...
  return undefined as any;
}

const users = await request('/users'); // 推断为 User[]
```

这一方案实现了路由到响应的自动推断，但还不支持方法选择与参数约束。

### 3.5 模板字面量类型与完整类型安全（2020 至今）

TypeScript 4.1 引入模板字面量类型后，API 客户端实现了完整的类型安全：

```typescript
// 路径参数自动提取
type ExtractParams<Path> = Path extends `${infer _}:${infer Param}/${infer Rest}`
  ? Param | ExtractParams<`/${Rest}`>
  : Path extends `${infer _}:${infer Param}`
  ? Param
  : never;

// 完整的类型安全请求函数
async function request<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
>(
  path: Path,
  options: RequestOptions<Method, APIClient[Path][Method]>
): Promise<GetResponse<APIClient[Path][Method]>> {
  // ...
}
```

这一方案实现了路径参数提取、方法选择、参数约束、响应推断的完整类型安全。

### 3.6 现代 API 客户端工具的时间线

| 年份 | 工具/库 | 主要特性 |
|------|---------|---------|
| 2014 | fetch API | 原生 Promise 风格，无类型 |
| 2015 | Axios | Promise + 拦截器 + 基础类型 |
| 2017 | ky | 基于 fetch 的现代封装 |
| 2018 | got | Node.js 端的 HTTP 客户端 |
| 2019 | openapi-typescript | 从 OpenAPI 生成类型 |
| 2020 | openapi-fetch | 类型安全的 fetch 客户端 |
| 2021 | trpc | 端到端类型安全的 RPC 框架 |
| 2022 | orval | 从 OpenAPI 生成类型安全的客户端 |
| 2023 | hey-api/openapi-ts | 现代化的 OpenAPI 客户端生成 |
| 2024 | effect/Http | Effect 生态的 HTTP 客户端 |

### 3.7 tRPC：端到端类型安全的革命

tRPC（TypeScript Remote Procedure Call）是端到端类型安全的革命性方案，它不需要 OpenAPI 规范，直接共享 TypeScript 类型：

```typescript
// 服务端定义
const appRouter = t.router({
  getUser: t.procedure.input(z.string()).query(({ input }) => {
    return getUserById(input);
  }),
});

// 客户端调用
const user = await trpc.getUser.query('123');
// 自动推断为 User 类型
```

tRPC 的局限：仅适用于 TypeScript 全栈应用，无法与非 TypeScript 后端集成。

## 第四章 设计哲学

### 4.1 类型驱动开发

类型安全 API 客户端的核心哲学是"类型驱动开发"：先定义 API 类型映射，再实现请求函数。类型定义是"契约"，实现是"履约"。

```typescript
// 1. 先定义类型契约
interface APIClient {
  '/users': {
    GET: { response: User[] };
  };
}

// 2. 再实现请求函数（自动获得类型安全）
const api = createClient<APIClient>({ baseUrl: '/api' });

// 3. 调用时自动获得类型推断
const users = await api['/users'].get();
// User[]
```

这一哲学源自 Idris、Agda 等依赖类型语言的传统：类型先于实现，类型即规约。

### 4.2 单一真相源

类型安全的 API 客户端中，API 路由类型映射是"单一真相源"：

- 请求函数的签名由类型映射派生。
- 响应数据的类型由类型映射派生。
- IDE 自动补全基于类型映射。
- 错误提示基于类型映射。

避免在多处定义 API 契约（如后端文档、前端类型、测试 mock），导致不一致。

### 4.3 渐进式类型增强

API 客户端的类型安全是渐进式的：

```typescript
// Level 0：无类型约束
async function fetchUser(id: string): Promise<any> { /* ... */ }

// Level 1：显式响应类型
async function fetchUser(id: string): Promise<User> { /* ... */ }

// Level 2：路由到响应的映射
interface APIClient {
  '/users/:id': { GET: { response: User; params: { id: string } } };
}
async function request<P extends keyof APIClient>(path: P): Promise<...> { /* ... */ }

// Level 3：完整的方法与参数约束
async function request<
  P extends keyof APIClient,
  M extends keyof APIClient[P] = 'GET',
>(path: P, options: RequestOptions<M, APIClient[P][M]>): Promise<...> { /* ... */ }

// Level 4：自动生成（从 OpenAPI）
// APIClient 类型由 openapi-typescript 自动生成
```

### 4.4 编译时与运行时分离

类型安全的类型约束在编译时完全消除，运行时只保留必要的数据与逻辑：

- **编译时**：路由路径检查、方法检查、参数类型检查、响应类型推断。
- **运行时**：HTTP 请求、参数序列化、响应解析、错误处理。

这一分离确保类型安全不带来运行时开销。数学上：

$$
\mathrm{CompileTime}(\mathrm{request}(p, o)) \vdash \mathrm{Runtime}(\mathrm{request}(p, o)) \text{ is type-safe}
$$

### 4.5 类型安全与开发体验平衡

完整的类型安全有时会增加编译时间。设计 API 客户端时需要在类型安全与开发体验间平衡：

- **严格模式**：所有路由与方法显式约束，禁止 `any`。
- **宽松模式**：允许部分路由使用 `any`，便于快速开发。
- **混合模式**：核心路由严格约束，非核心路由宽松。

```typescript
// 严格模式
type StrictClient = {
  [P in keyof APIClient]: {
    [M in keyof APIClient[P]]: (
      options: RequestOptions<M, APIClient[P][M]>
    ) => Promise<GetResponse<APIClient[P][M]>>;
  };
};

// 宽松模式
type LooseClient = {
  [P in keyof APIClient]: {
    get: (options?: any) => Promise<any>;
    post: (options?: any) => Promise<any>;
  };
};
```

### 4.6 契约优先设计

API 客户端的设计应遵循"契约优先"原则：先定义契约（类型映射），再实现客户端与服务器。这一原则与 OpenAPI/Swagger 的设计哲学一致：

```typescript
// 1. 定义契约
interface APIClient { /* ... */ }

// 2. 生成 OpenAPI 规范
const openapiSpec = generateOpenAPI<APIClient>();

// 3. 后端根据规范实现
// 4. 前端根据规范生成客户端
```

这一设计确保前后端契约一致，避免不一致导致的运行时错误。

## 第五章 语法与语义

### 5.1 路由类型映射的完整语法

```typescript
interface APIClient {
  [path: string]: {
    [method in HttpMethod]: RouteContract;
  };
}

interface RouteContract {
  response: unknown;          // 响应类型（必填）
  params?: Record<string, string | number>;  // 路径参数（可选）
  query?: Record<string, unknown>;           // 查询参数（可选）
  body?: unknown;             // 请求体（可选）
  headers?: Record<string, string>;          // 自定义请求头（可选）
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

**语法元素**：

- `[path: string]`：路由路径，使用字面量字符串类型（如 `'/users/:id'`）。
- `[method in HttpMethod]`：HTTP 方法，使用联合类型。
- `RouteContract`：路由契约，包含 response、params、query、body、headers 等字段。

### 5.2 路径参数提取的完整语法

```typescript
// 基础版：仅支持单一参数
type ExtractParam<Path> = Path extends `${infer _}:${infer Param}`
  ? Param
  : never;

// 进阶版：支持多参数与嵌套路径
type ExtractPathParams<Path> = Path extends `${infer _}:${infer Param}/${infer Rest}`
  ? Param | ExtractPathParams<`/${Rest}`>
  : Path extends `${infer _}:${infer Param}`
  ? Param
  : never;

// 完整版：处理参数名中的特殊字符
type ExtractPathParamsStrict<Path extends string> =
  Path extends `${infer _}:${infer Param}/${infer Rest}`
    ? Param extends `${infer Name}`
      ? Name | ExtractPathParamsStrict<`/${Rest}`>
      : never
    : Path extends `${infer _}:${infer Param}`
    ? Param
    : never;
```

**语义**：

- `${infer _}`：匹配 `:` 前的任意字符串，赋值给 `_`（忽略）。
- `${infer Param}`：匹配 `:` 后到 `/` 前的字符串，赋值给 `Param`。
- `${infer Rest}`：匹配剩余路径，递归处理。

### 5.3 路径参数替换的完整语法

```typescript
// 基础版：替换单一参数
type ReplaceParam<Path, Value extends string> =
  Path extends `${infer Before}:${infer _}`
    ? `${Before}${Value}`
    : Path;

// 进阶版：替换多个参数
type ReplaceParams<Path, Params extends Record<string, string>> =
  Path extends `${infer Before}:${infer Param}/${infer Rest}`
    ? `${Before}${Params[Param & keyof Params]}${ReplaceParams<`/${Rest}`, Params>}`
    : Path extends `${infer Before}:${infer Param}`
    ? `${Before}${Params[Param & keyof Params]}`
    : Path;
```

### 5.4 条件类型的分布性

条件类型在裸类型参数上自动分发，对处理 HTTP 方法联合类型有用：

```typescript
// 联合类型分发
type GetMethods<Routes> = Routes extends { [M in HttpMethod]: any }
  ? keyof Routes
  : never;

type Methods = GetMethods<{ GET: any; POST: any }>;
// 'GET' | 'POST'
```

### 5.5 映射类型与键重映射

映射类型用于遍历路由与方法，生成 API 客户端类型：

```typescript
// 自动生成 API 客户端
type APIMethods = {
  [Path in keyof APIClient]: {
    [Method in keyof APIClient[Path] as Lowercase<string & Method>]: (
      options: RequestOptions<Method, APIClient[Path][Method]>
    ) => Promise<GetResponse<APIClient[Path][Method]>>;
  };
};
```

**键重映射**（`as Lowercase<string & Method>`）：将 `GET` 转换为 `get`，符合 JavaScript 命名习惯。

### 5.6 infer 的多重使用

`infer` 可以在一次条件类型中多次使用，提取多个类型变量：

```typescript
// 一次性提取所有字段
type ExtractRouteFields<Route> = Route extends {
  response: infer R;
  params?: infer P;
  query?: infer Q;
  body?: infer B;
}
  ? { response: R; params: P; query: Q; body: B }
  : never;
```

### 5.7 约束泛型参数

泛型参数可以使用 `extends` 约束，确保类型安全：

```typescript
// Path 必须是 APIClient 的键
async function request<Path extends keyof APIClient>(path: Path): Promise<...> { /* ... */ }

// Method 必须是 APIClient[Path] 的键
async function request<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path],
>(path: Path, method: Method): Promise<...> { /* ... */ }
```

### 5.8 默认泛型参数

泛型参数可以有默认值，简化调用：

```typescript
async function request<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',  // 默认 GET
>(path: Path, options?: RequestOptions<Method, APIClient[Path][Method]>): Promise<...> { /* ... */ }

// 调用时不指定 Method，默认为 GET
const users = await request('/users');
```

## 第六章 实战示例

### 6.1 基础类型安全请求函数

实现一个基础的类型安全请求函数，支持路径参数、查询参数、请求体和响应推断：

```typescript
// ============== 类型定义 ==============

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
}

interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
}

// API 路由类型映射
interface APIClient {
  '/users': {
    GET: {
      response: User[];
      query?: { page?: number; limit?: number; search?: string };
    };
    POST: {
      response: User;
      body: Omit<User, 'id'>;
    };
  };
  '/users/:id': {
    GET: { response: User; params: { id: string } };
    PUT: { response: User; params: { id: string }; body: Partial<Omit<User, 'id'>> };
    DELETE: { response: void; params: { id: string } };
  };
  '/posts': {
    GET: {
      response: Post[];
      query?: { authorId?: string; page?: number; limit?: number };
    };
    POST: {
      response: Post;
      body: Omit<Post, 'id' | 'createdAt'>;
    };
  };
  '/posts/:postId/comments': {
    GET: {
      response: Comment[];
      params: { postId: string };
      query?: { sort?: 'asc' | 'desc' };
    };
    POST: {
      response: Comment;
      params: { postId: string };
      body: { content: string };
    };
  };
}

// ============== 工具类型 ==============

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// 提取路径参数名
type ExtractPathParams<Path> = Path extends `${infer _}:${infer Param}/${infer Rest}`
  ? Param | ExtractPathParams<`/${Rest}`>
  : Path extends `${infer _}:${infer Param}`
  ? Param
  : never;

// 获取路由的响应类型
type GetResponse<Route> = Route extends { response: infer R } ? R : never;

// 获取路由的路径参数类型
type GetParams<Route> = Route extends { params: infer P } ? P : never;

// 获取路由的查询参数类型
type GetQuery<Route> = Route extends { query: infer Q } ? Q : never;

// 获取路由的请求体类型
type GetBody<Route> = Route extends { body: infer B } ? B : never;

// 提取支持指定方法的所有路径
type PathsWithMethod<M extends HttpMethod> = {
  [P in keyof APIClient]: M extends keyof APIClient[P] ? P : never;
}[keyof APIClient];

// 请求选项类型
type RequestOptions<Route> = {
  params?: GetParams<Route>;
  query?: GetQuery<Route>;
  body?: GetBody<Route>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

// ============== 请求函数实现 ==============

async function request<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
>(
  path: Path,
  options: RequestOptions<APIClient[Path][Method]> = {}
): Promise<GetResponse<APIClient[Path][Method]>> {
  const { params, query, body, headers, signal } = options;

  // 替换路径参数
  let url: string = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }

  // 添加查询参数
  if (query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // 构造请求头
  const requestHeaders: Record<string, string> = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  };

  // 发送请求
  const response = await fetch(url, {
    method: options.method as string || 'GET',
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  // 处理错误
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new APIError(
      errorBody.code || 'UNKNOWN_ERROR',
      errorBody.message || `请求失败: ${response.status}`,
      response.status,
      errorBody.details
    );
  }

  // 解析响应
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return undefined as GetResponse<APIClient[Path][Method]>;
}

// ============== 使用示例 ==============

// GET /users
const users = await request('/users', {
  query: { page: 1, limit: 10 },
});
// 推断为 User[]

// GET /users/:id
const user = await request('/users/:id', {
  params: { id: '123' },
});
// 推断为 User

// POST /users
const newUser = await request('/users', {
  method: 'POST',
  body: { name: '张三', email: 'zhangsan@example.com', age: 25 },
});
// 推断为 User

// PUT /users/:id
const updatedUser = await request('/users/:id', {
  method: 'PUT',
  params: { id: '123' },
  body: { name: '李四' },
});
// 推断为 User

// DELETE /users/:id
await request('/users/:id', {
  method: 'DELETE',
  params: { id: '123' },
});
// 推断为 void
```

### 6.2 类型安全的链式请求构建器

实现一个链式请求构建器，提供更流畅的 API：

```typescript
// ============== 请求构建器 ==============

class RequestBuilder<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
> {
  private path: Path;
  private method: Method = 'GET' as Method;
  private paramsObj?: GetParams<APIClient[Path][Method]>;
  private queryObj?: GetQuery<APIClient[Path][Method]>;
  private bodyObj?: GetBody<APIClient[Path][Method]>;
  private headersObj: Record<string, string> = {};
  private signalObj?: AbortSignal;

  constructor(path: Path) {
    this.path = path;
  }

  method<M extends keyof APIClient[Path]>(method: M): RequestBuilder<Path, M> {
    const builder = new RequestBuilder<Path, M>(this.path);
    builder.method = method;
    builder.paramsObj = this.paramsObj as any;
    builder.queryObj = this.queryObj as any;
    builder.bodyObj = this.bodyObj as any;
    builder.headersObj = this.headersObj;
    builder.signalObj = this.signalObj;
    return builder;
  }

  params(p: GetParams<APIClient[Path][Method]>): this {
    this.paramsObj = p;
    return this;
  }

  query(q: GetQuery<APIClient[Path][Method]>): this {
    this.queryObj = q;
    return this;
  }

  body(b: GetBody<APIClient[Path][Method]>): this {
    this.bodyObj = b;
    return this;
  }

  headers(h: Record<string, string>): this {
    this.headersObj = { ...this.headersObj, ...h };
    return this;
  }

  signal(s: AbortSignal): this {
    this.signalObj = s;
    return this;
  }

  async execute(): Promise<GetResponse<APIClient[Path][Method]>> {
    return request<Path, Method>(this.path, {
      method: this.method,
      params: this.paramsObj,
      query: this.queryObj,
      body: this.bodyObj,
      headers: this.headersObj,
      signal: this.signalObj,
    } as any);
  }
}

// ============== 使用示例 ==============

// 链式调用
const users = await new RequestBuilder('/users')
  .method('GET')
  .query({ page: 1, limit: 10 })
  .execute();
// User[]

const newUser = await new RequestBuilder('/users')
  .method('POST')
  .body({ name: '张三', email: 'zhangsan@example.com', age: 25 })
  .execute();
// User

const updatedUser = await new RequestBuilder('/users/:id')
  .method('PUT')
  .params({ id: '123' })
  .body({ name: '李四' })
  .execute();
// User
```

### 6.3 自动生成的 API 客户端

自动生成所有路由与方法的 API 客户端：

```typescript
// ============== 自动生成 API 客户端 ==============

type APIMethods = {
  [Path in keyof APIClient]: {
    [Method in keyof APIClient[Path] as Lowercase<string & Method>]: (
      options: Omit<RequestOptions<APIClient[Path][Method]>, 'method'>
    ) => Promise<GetResponse<APIClient[Path][Method]>>;
  };
};

// 创建 API 客户端
function createAPIClient(): APIMethods {
  const handler: ProxyHandler<APIMethods> = {
    get(target, path: string) {
      return new Proxy({} as APIMethods[string], {
        get(target, method: string) {
          return (options: RequestOptions<any>) => {
            return request(path as keyof APIClient, {
              ...options,
              method: method.toUpperCase() as HttpMethod,
            } as any);
          };
        },
      });
    },
  };

  return new Proxy({} as APIMethods, handler);
}

const api = createAPIClient();

// ============== 使用示例 ==============

// 类型安全的调用
const users = await api['/users'].get({ query: { page: 1 } });
// User[]

const user = await api['/users/:id'].get({ params: { id: '123' } });
// User

const newUser = await api['/users'].post({
  body: { name: '张三', email: 'zhangsan@example.com', age: 25 },
});
// User

await api['/users/:id'].delete({ params: { id: '123' } });
// void

// 编译错误示例
// await api['/users'].delete({}); // 错误：/users 不支持 DELETE
// await api['/users/:id'].get({}); // 错误：缺少 params.id
// await api['/users'].post({}); // 错误：缺少 body
```

### 6.4 错误类型化与结果类型

实现类型化的错误处理与 Result 类型：

```typescript
// ============== 错误类型定义 ==============

// API 错误码枚举
type APIErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNKNOWN_ERROR';

// API 错误类
class APIError extends Error {
  constructor(
    public code: APIErrorCode,
    message: string,
    public statusCode: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'APIError';
  }

  isNotFound(): this is APIError & { code: 'NOT_FOUND' } {
    return this.code === 'NOT_FOUND';
  }

  isUnauthorized(): this is APIError & { code: 'UNAUTHORIZED' } {
    return this.code === 'UNAUTHORIZED';
  }

  isValidationError(): this is APIError & { code: 'VALIDATION_ERROR'; details: Record<string, string[]> } {
    return this.code === 'VALIDATION_ERROR';
  }
}

// Result 类型
type APIResult<T> =
  | { success: true; data: T }
  | { success: false; error: APIError };

// ============== 安全请求函数 ==============

async function safeRequest<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
>(
  path: Path,
  options: RequestOptions<APIClient[Path][Method]> = {}
): Promise<APIResult<GetResponse<APIClient[Path][Method]>>> {
  try {
    const data = await request<Path, Method>(path, options as any);
    return { success: true, data };
  } catch (error) {
    if (error instanceof APIError) {
      return { success: false, error };
    }
    return {
      success: false,
      error: new APIError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : '未知错误',
        0
      ),
    };
  }
}

// ============== 使用示例 ==============

const result = await safeRequest('/users/:id', {
  params: { id: '123' },
});

if (result.success) {
  console.log(result.data.name); // User
} else {
  if (result.error.isNotFound()) {
    console.log('用户不存在');
  } else if (result.error.isValidationError()) {
    console.log('验证错误:', result.error.details);
  } else {
    console.log('错误:', result.error.message);
  }
}
```

### 6.5 请求/响应拦截器

实现类型安全的请求/响应拦截器：

```typescript
// ============== 拦截器类型定义 ==============

interface RequestConfig {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

interface ResponseConfig<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

interface RequestInterceptor {
  onRequest(config: RequestConfig): RequestConfig | Promise<RequestConfig>;
  onError?(error: Error): Error | Promise<Error>;
}

interface ResponseInterceptor {
  onResponse<T>(response: ResponseConfig<T>): ResponseConfig<T> | Promise<ResponseConfig<T>>;
  onError?(error: APIError): APIError | Promise<APIError>;
}

// ============== HTTP 客户端类 ==============

class HTTPClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // 添加请求拦截器
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  // 添加响应拦截器
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // 添加认证拦截器
  addAuthToken(getToken: () => string | null): void {
    this.addRequestInterceptor({
      onRequest(config) {
        const token = getToken();
        if (token) {
          config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
        }
        return config;
      },
    });
  }

  // 添加日志拦截器
  addLogger(): void {
    this.addRequestInterceptor({
      onRequest(config) {
        console.log(`[Request] ${config.method} ${config.url}`);
        return config;
      },
    });
    this.addResponseInterceptor({
      onResponse(response) {
        console.log(`[Response] ${response.status}`);
        return response;
      },
      onError(error) {
        console.error(`[Error] ${error.code}: ${error.message}`);
        return error;
      },
    });
  }

  // 添加重试拦截器
  addRetry(maxRetries: number = 3, retryDelay: number = 1000): void {
    let retryCount = 0;
    this.addRequestInterceptor({
      async onError(error) {
        if (retryCount < maxRetries && error instanceof APIError && error.statusCode >= 500) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          throw error; // 重新抛出以触发重试
        }
        return error;
      },
    });
  }

  // 执行请求
  async execute<T>(
    config: Omit<RequestConfig, 'url'> & { path: string }
  ): Promise<T> {
    let finalConfig: RequestConfig = {
      ...config,
      url: `${this.baseUrl}${config.path}`,
    };

    // 应用请求拦截器
    for (const interceptor of this.requestInterceptors) {
      try {
        finalConfig = await interceptor.onRequest(finalConfig);
      } catch (error) {
        if (interceptor.onError) {
          throw await interceptor.onError(error as Error);
        }
        throw error;
      }
    }

    // 发送请求
    let response: Response;
    try {
      response = await fetch(finalConfig.url, {
        method: finalConfig.method,
        headers: finalConfig.headers,
        body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined,
        signal: finalConfig.signal,
      });
    } catch (error) {
      const apiError = new APIError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : '网络错误',
        0
      );
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onError) {
          throw await interceptor.onError(apiError);
        }
      }
      throw apiError;
    }

    // 处理响应
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const apiError = new APIError(
        errorBody.code || 'UNKNOWN_ERROR',
        errorBody.message || `请求失败: ${response.status}`,
        response.status,
        errorBody.details
      );
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onError) {
          throw await interceptor.onError(apiError);
        }
      }
      throw apiError;
    }

    const data = await response.json().catch(() => undefined);
    let responseConfig: ResponseConfig<T> = {
      data: data as T,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };

    // 应用响应拦截器
    for (const interceptor of this.responseInterceptors) {
      responseConfig = await interceptor.onResponse(responseConfig);
    }

    return responseConfig.data;
  }
}

// ============== 使用示例 ==============

const httpClient = new HTTPClient('/api');
httpClient.addAuthToken(() => localStorage.getItem('token'));
httpClient.addLogger();
httpClient.addRetry(3, 1000);

const user = await httpClient.execute<User>({
  path: '/users/123',
  method: 'GET',
  headers: {},
});
```

### 6.6 React Hook 集成

实现类型安全的 React Hook：

```typescript
// ============== React Hook ==============

import { useState, useEffect, useCallback } from 'react';

// useFetch Hook
interface UseFetchOptions {
  enabled?: boolean;       // 是否立即执行
  retry?: number;          // 重试次数
  retryDelay?: number;     // 重试延迟
}

interface UseFetchResult<T> {
  data: T | undefined;
  loading: boolean;
  error: APIError | undefined;
  refetch: () => Promise<void>;
}

function useFetch<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
>(
  path: Path,
  options: RequestOptions<APIClient[Path][Method]> = {},
  useFetchOptions: UseFetchOptions = {}
): UseFetchResult<GetResponse<APIClient[Path][Method]>> {
  type ResponseType = GetResponse<APIClient[Path][Method]>;

  const [data, setData] = useState<ResponseType>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<APIError>();
  const { enabled = true, retry = 0, retryDelay = 1000 } = useFetchOptions;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    let lastError: APIError | undefined;
    let attempt = 0;

    while (attempt <= retry) {
      try {
        const result = await request<Path, Method>(path, options as any);
        setData(result);
        setError(undefined);
        return;
      } catch (err) {
        if (err instanceof APIError) {
          lastError = err;
        } else {
          lastError = new APIError(
            'UNKNOWN_ERROR',
            err instanceof Error ? err.message : '未知错误',
            0
          );
        }
        attempt++;
        if (attempt <= retry) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    setError(lastError);
  }, [JSON.stringify(path), JSON.stringify(options), retry, retryDelay]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// useMutation Hook
interface UseMutationResult<T, V> {
  data: T | undefined;
  loading: boolean;
  error: APIError | undefined;
  mutate: (variables: V) => Promise<T>;
}

function useMutation<
  Path extends keyof APIClient,
  Method extends 'POST' | 'PUT' | 'PATCH' | 'DELETE',
>(
  path: Path,
  method: Method
): UseMutationResult<
  GetResponse<APIClient[Path][Method]>,
  GetBody<APIClient[Path][Method]>
> {
  type ResponseType = GetResponse<APIClient[Path][Method]>;
  type BodyType = GetBody<APIClient[Path][Method]>;

  const [data, setData] = useState<ResponseType>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<APIError>();

  const mutate = useCallback(async (variables: BodyType): Promise<ResponseType> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await request<Path, Method>(path, {
        method: method as any,
        body: variables,
      } as any);
      setData(result);
      return result;
    } catch (err) {
      if (err instanceof APIError) {
        setError(err);
        throw err;
      }
      const apiError = new APIError(
        'UNKNOWN_ERROR',
        err instanceof Error ? err.message : '未知错误',
        0
      );
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, [path, method]);

  return { data, loading, error, mutate };
}

// ============== 使用示例 ==============

// 在组件中使用
function UserList() {
  const { data: users, loading, error, refetch } = useFetch('/users', {
    query: { page: 1, limit: 10 },
  });

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
      <button onClick={refetch}>刷新</button>
    </div>
  );
}

function CreateUser() {
  const { mutate, loading, error } = useMutation('/users', 'POST');

  const handleSubmit = async () => {
    try {
      await mutate({
        name: '张三',
        email: 'zhangsan@example.com',
        age: 25,
      });
    } catch (err) {
      console.error('创建失败:', err);
    }
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? '创建中...' : '创建用户'}
      </button>
      {error && <div>错误: {error.message}</div>}
    </div>
  );
}
```

### 6.7 Vue Composable 集成

实现类型安全的 Vue 3 Composable：

```typescript
// ============== Vue Composable ==============

import { ref, watchEffect, type Ref } from 'vue';

// useFetch Composable
interface UseFetchOptions {
  enabled?: Ref<boolean>;
  retry?: number;
  retryDelay?: number;
}

interface UseFetchResult<T> {
  data: Ref<T | undefined>;
  loading: Ref<boolean>;
  error: Ref<APIError | undefined>;
  refetch: () => Promise<void>;
}

function useFetch<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
>(
  path: Path | Ref<Path>,
  options: RequestOptions<APIClient[Path][Method]> | Ref<RequestOptions<APIClient[Path][Method]>> = {},
  useFetchOptions: UseFetchOptions = {}
): UseFetchResult<GetResponse<APIClient[Path][Method]>> {
  type ResponseType = GetResponse<APIClient[Path][Method]>;

  const data = ref<ResponseType>() as Ref<ResponseType | undefined>;
  const loading = ref(false);
  const error = ref<APIError>();
  const { enabled = ref(true), retry = 0, retryDelay = 1000 } = useFetchOptions;

  const fetchData = async () => {
    if (!enabled.value) return;

    loading.value = true;
    error.value = undefined;

    const currentPath = typeof path === 'object' && 'value' in path ? path.value : path;
    const currentOptions =
      typeof options === 'object' && 'value' in options ? options.value : options;

    let lastError: APIError | undefined;
    let attempt = 0;

    while (attempt <= retry) {
      try {
        const result = await request(currentPath, currentOptions as any);
        data.value = result;
        error.value = undefined;
        return;
      } catch (err) {
        if (err instanceof APIError) {
          lastError = err;
        } else {
          lastError = new APIError(
            'UNKNOWN_ERROR',
            err instanceof Error ? err.message : '未知错误',
            0
          );
        }
        attempt++;
        if (attempt <= retry) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    error.value = lastError;
    loading.value = false;
  };

  watchEffect(() => {
    fetchData();
  });

  const refetch = async () => {
    await fetchData();
  };

  return { data, loading, error, refetch };
}

// useMutation Composable
interface UseMutationResult<T, V> {
  data: Ref<T | undefined>;
  loading: Ref<boolean>;
  error: Ref<APIError | undefined>;
  mutate: (variables: V) => Promise<T>;
}

function useMutation<
  Path extends keyof APIClient,
  Method extends 'POST' | 'PUT' | 'PATCH' | 'DELETE',
>(
  path: Path,
  method: Method
): UseMutationResult<
  GetResponse<APIClient[Path][Method]>,
  GetBody<APIClient[Path][Method]>
> {
  type ResponseType = GetResponse<APIClient[Path][Method]>;
  type BodyType = GetBody<APIClient[Path][Method]>;

  const data = ref<ResponseType>() as Ref<ResponseType | undefined>;
  const loading = ref(false);
  const error = ref<APIError>();

  const mutate = async (variables: BodyType): Promise<ResponseType> => {
    loading.value = true;
    error.value = undefined;

    try {
      const result = await request<Path, Method>(path, {
        method: method as any,
        body: variables,
      } as any);
      data.value = result;
      return result;
    } catch (err) {
      if (err instanceof APIError) {
        error.value = err;
        throw err;
      }
      const apiError = new APIError(
        'UNKNOWN_ERROR',
        err instanceof Error ? err.message : '未知错误',
        0
      );
      error.value = apiError;
      throw apiError;
    } finally {
      loading.value = false;
    }
  };

  return { data, loading, error, mutate };
}

// ============== 使用示例 ==============

// 在组件中使用
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const { data: users, loading, error, refetch } = useFetch('/users', {
      query: { page: 1, limit: 10 },
    });

    const { mutate: createUser, loading: creating } = useMutation('/users', 'POST');

    const handleCreate = async () => {
      try {
        await createUser({
          name: '张三',
          email: 'zhangsan@example.com',
          age: 25,
        });
        await refetch();
      } catch (err) {
        console.error('创建失败:', err);
      }
    };

    return { users, loading, error, creating, handleCreate };
  },
});
```

### 6.8 请求取消与超时

实现请求取消与超时控制：

```typescript
// ============== 请求取消 ==============

class CancellationToken {
  private controller: AbortController;

  constructor() {
    this.controller = new AbortController();
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  abort(): void {
    this.controller.abort();
  }
}

// 带超时的请求
async function requestWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 使用示例
const token = new CancellationToken();

// 在某处取消
setTimeout(() => token.abort(), 5000);

try {
  const user = await request('/users/:id', {
    params: { id: '123' },
    signal: token.signal,
  });
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    console.log('请求已取消');
  }
}
```

### 6.9 文件上传

实现类型安全的文件上传：

```typescript
// ============== 文件上传类型定义 ==============

interface FileUploadOptions {
  file: File;
  fieldName?: string;
  additionalFields?: Record<string, string>;
  onProgress?: (loaded: number, total: number) => void;
}

// 文件上传函数
function uploadFile(
  url: string,
  options: FileUploadOptions,
  signal?: AbortSignal
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append(options.fieldName || 'file', options.file);

    if (options.additionalFields) {
      for (const [key, value] of Object.entries(options.additionalFields)) {
        formData.append(key, value);
      }
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (options.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          options.onProgress!(event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new APIError('UNKNOWN_ERROR', '响应解析失败', xhr.status));
        }
      } else {
        reject(new APIError('UNKNOWN_ERROR', `上传失败: ${xhr.status}`, xhr.status));
      }
    };

    xhr.onerror = () => {
      reject(new APIError('UNKNOWN_ERROR', '网络错误', 0));
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new APIError('UNKNOWN_ERROR', '上传已取消', 0));
      });
    }

    xhr.send(formData);
  });
}

// 使用示例
const fileInput = document.querySelector<HTMLInputElement>('#file')!;
const file = fileInput.files?.[0];

if (file) {
  const result = await uploadFile('/api/upload', {
    file,
    fieldName: 'avatar',
    additionalFields: {
      userId: '123',
    },
    onProgress: (loaded, total) => {
      console.log(`上传进度: ${(loaded / total * 100).toFixed(2)}%`);
    },
  });
  console.log('上传成功:', result.url);
}
```

## 第七章 内部原理

### 7.1 类型推断的递归过程

TypeScript 编译器在处理泛型请求函数时，会递归地进行类型推断：

```typescript
const user = await request('/users/:id', { params: { id: '123' } });
```

**推断过程**：

1. **Path 推断**：`'/users/:id'` 是 `keyof APIClient` 的子类型，推断 `Path = '/users/:id'`。
2. **Method 推断**：`options` 中无 `method` 字段，使用默认值 `'GET'`，推断 `Method = 'GET'`。
3. **Route 类型查找**：`APIClient['/users/:id']['GET']` 的类型是 `{ response: User; params: { id: string } }`。
4. **RequestOptions 构造**：根据 `Route` 类型，`RequestOptions<Route>` 为 `{ params?: { id: string }; query?: never; body?: never }`。
5. **options 检查**：`{ params: { id: '123' } }` 满足 `RequestOptions<Route>`，编译通过。
6. **返回类型推断**：`GetResponse<Route>` 为 `User`，返回类型为 `Promise<User>`。

### 7.2 条件类型的求值

条件类型在编译时求值，根据类型关系选择不同分支：

```typescript
// 假设 Route = { response: User; params: { id: string } }
type R = GetResponse<Route>;
// Route extends { response: infer R } ? R : never
// Route 匹配 { response: infer R }，R 推断为 User
// 结果：User

type P = GetParams<Route>;
// Route extends { params: infer P } ? P : never
// Route 匹配 { params: infer P }，P 推断为 { id: string }
// 结果：{ id: string }

type Q = GetQuery<Route>;
// Route extends { query: infer Q } ? Q : never
// Route 不匹配 { query: infer Q }（query 字段不存在）
// 结果：never
```

### 7.3 模板字面量类型的求值

模板字面量类型在编译时求值，根据字符串模式匹配：

```typescript
type Params = ExtractPathParams<'/posts/:postId/comments/:commentId'>;
// 第一次匹配：'/posts/:postId/comments/:commentId' extends `${infer _}:${infer Param}/${infer Rest}`
// _ = '/posts', Param = 'postId', Rest = 'comments/:commentId'
// 递归处理 '/comments/:commentId'
// 第二次匹配：'comments/:commentId' extends `${infer _}:${infer Param}/${infer Rest}`
// 不匹配（:commentId 后没有 /）
// 第三次匹配：'comments/:commentId' extends `${infer _}:${infer Param}`
// _ = 'comments', Param = 'commentId'
// 结果：'postId' | 'commentId'
```

### 7.4 映射类型的求值

映射类型在编译时遍历键集合，生成新类型：

```typescript
type APIMethods = {
  [Path in keyof APIClient]: {
    [Method in keyof APIClient[Path] as Lowercase<string & Method>]: (
      options: RequestOptions<APIClient[Path][Method]>
    ) => Promise<GetResponse<APIClient[Path][Method]>>;
  };
};

// 求值过程：
// 1. 遍历 APIClient 的键：'/users', '/users/:id', '/posts/:postId/comments', ...
// 2. 对每个 Path，遍历 APIClient[Path] 的键：'GET', 'POST', 'PUT', ...
// 3. 对每个 Method，使用键重映射 as Lowercase<...> 将 'GET' 转换为 'get'
// 4. 生成方法签名：(options) => Promise<Response>
```

### 7.5 类型擦除

TypeScript 的类型在编译时完全擦除，运行时不保留任何类型信息：

```typescript
// 编译前
async function request<Path extends keyof APIClient, Method extends keyof APIClient[Path] = 'GET'>(
  path: Path,
  options: RequestOptions<APIClient[Path][Method]> = {}
): Promise<GetResponse<APIClient[Path][Method]>> {
  // ...
}

// 编译后
async function request(path, options = {}) {
  // ...
}
```

这意味着所有类型约束都在编译时验证，运行时不带来任何开销。

### 7.6 类型系统的局限性

TypeScript 类型系统有其局限性，无法表达所有约束：

1. **运行时验证**：类型无法保证运行时数据符合类型，需要运行时验证库（如 zod、io-ts）。
2. **复杂条件**：某些复杂条件难以用类型表达，如"响应类型根据请求头变化"。
3. **类型递归深度**：TypeScript 对递归类型有深度限制（约 50 层），过深的递归会编译失败。
4. **性能开销**：复杂的类型约束会增加编译时间，需要权衡。

## 第八章 最佳实践

### 8.1 类型映射的组织

将 API 路由类型映射组织在独立文件中，便于维护：

```typescript
// src/api/routes.ts
export interface APIClient {
  '/users': { /* ... */ };
  '/users/:id': { /* ... */ };
  '/posts': { /* ... */ };
}

// src/api/client.ts
import type { APIClient } from './routes';

export async function request<Path extends keyof APIClient>(/* ... */): Promise</* ... */> {
  // ...
}
```

### 8.2 从 OpenAPI 自动生成

使用 openapi-typescript 从 OpenAPI 规范自动生成类型：

```typescript
// 安装：npm install openapi-typescript
// 生成：npx openapi-typescript ./openapi.json -o ./src/api/generated.ts

// 使用生成的类型
import type { paths } from './api/generated';

interface APIClient extends paths {}

// 现在可以使用自动生成的类型
const user = await request('/users/{id}', { params: { id: '123' } });
```

### 8.3 运行时验证

结合运行时验证库（如 zod）确保运行时数据安全：

```typescript
import { z } from 'zod';

// 定义 Schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

type User = z.infer<typeof UserSchema>;

// 运行时验证
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return UserSchema.parse(data); // 运行时验证
}
```

### 8.4 错误处理策略

制定统一的错误处理策略：

```typescript
// 全局错误处理器
class GlobalErrorHandler {
  handle(error: APIError): void {
    switch (error.code) {
      case 'UNAUTHORIZED':
        // 跳转登录页
        window.location.href = '/login';
        break;
      case 'FORBIDDEN':
        // 显示无权限提示
        showToast('无权限访问');
        break;
      case 'NOT_FOUND':
        // 显示 404 页面
        router.push('/404');
        break;
      case 'VALIDATION_ERROR':
        // 显示表单错误
        console.error('验证错误:', error.details);
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // 显示限流提示
        showToast('请求过于频繁，请稍后再试');
        break;
      default:
        // 显示通用错误
        showToast(`错误: ${error.message}`);
    }
  }
}

// 在请求拦截器中集成
httpClient.addResponseInterceptor({
  onError(error) {
    globalErrorHandler.handle(error);
    return error;
  },
});
```

### 8.5 缓存策略

实现类型安全的缓存：

```typescript
// 缓存类型
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// 类型安全的缓存
class TypedCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 带缓存的请求
async function cachedRequest<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
>(
  path: Path,
  options: RequestOptions<APIClient[Path][Method]> = {},
  ttl: number = 60000
): Promise<GetResponse<APIClient[Path][Method]>> {
  // 只缓存 GET 请求
  const method = (options as any).method || 'GET';
  if (method !== 'GET') {
    return request<Path, Method>(path, options as any);
  }

  const cacheKey = `${path}:${JSON.stringify(options)}`;
  const cached = cache.get<GetResponse<APIClient[Path][Method]>>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await request<Path, Method>(path, options as any);
  cache.set(cacheKey, data, ttl);
  return data;
}
```

### 8.6 重试与退避策略

实现指数退避重试：

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryOn?: (error: APIError) => boolean;
}

async function requestWithRetry<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
>(
  path: Path,
  options: RequestOptions<APIClient[Path][Method]> = {},
  retryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
  }
): Promise<GetResponse<APIClient[Path][Method]>> {
  let lastError: APIError | undefined;
  const { maxRetries, baseDelay, maxDelay, retryOn } = retryOptions;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request<Path, Method>(path, options as any);
    } catch (error) {
      if (error instanceof APIError) {
        lastError = error;
        if (retryOn && !retryOn(error)) {
          throw error;
        }
        if (attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

// 使用
const user = await requestWithRetry('/users/:id', {
  params: { id: '123' },
}, {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryOn: (error) => error.statusCode >= 500,
});
```

## 第九章 常见陷阱

### 9.1 类型断言滥用

**问题**：过度使用 `as any` 绕过类型检查：

```typescript
// 错误示例：滥用 as any
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json() as any; // 绕过类型检查
}
```

**解决方案**：使用类型安全的请求函数：

```typescript
// 正确示例：使用类型安全请求
const user = await request('/users/:id', { params: { id } });
// 自动推断为 User
```

### 9.2 响应类型与实际不符

**问题**：手动指定的响应类型与后端实际返回类型不一致：

```typescript
// 错误示例：手动指定类型
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// 如果后端修改了 User 结构（如删除了 email 字段），前端类型仍认为 email 存在
const user = await fetchUser('123');
console.log(user.email); // 编译通过，运行时 undefined
```

**解决方案**：从 OpenAPI 自动生成类型，确保与后端一致：

```typescript
// 正确示例：自动生成类型
import type { paths } from './api/generated';

interface APIClient extends paths {}

const user = await request('/users/{id}', { params: { id } });
// 类型与后端一致
```

### 9.3 路径参数拼写错误

**问题**：路径参数名拼写错误，但运行时才发现：

```typescript
// 错误示例
await request('/users/:id', {
  params: { userId: '123' }, // 拼写错误，应为 id
});
// 运行时路径不会被替换，导致 404
```

**解决方案**：使用类型约束：

```typescript
// 正确示例：类型约束
type GetParams<Route> = Route extends { params: infer P } ? P : never;

async function request<Path extends keyof APIClient, Method extends keyof APIClient[Path]>(
  path: Path,
  options: { params?: GetParams<APIClient[Path][Method]> }
): Promise</* ... */> {
  // ...
}

// 编译时检查 params 字段
await request('/users/:id', {
  params: { userId: '123' }, // 编译错误：'userId' 不在 { id: string } 中
});
```

### 9.4 查询参数序列化问题

**问题**：查询参数中的数字、布尔值、数组序列化不正确：

```typescript
// 错误示例
const query = { page: 1, active: true, tags: ['a', 'b'] };
const searchParams = new URLSearchParams(query as any);
// URLSearchParams 只接受字符串，数字与布尔值会被转换为字符串，但数组会变成 'a,b'
```

**解决方案**：正确处理查询参数序列化：

```typescript
// 正确示例
function buildQueryString(query: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(`${key}[]`, String(v)));
    } else if (typeof value === 'object') {
      searchParams.append(key, JSON.stringify(value));
    } else {
      searchParams.append(key, String(value));
    }
  }
  return searchParams.toString();
}
```

### 9.5 错误处理遗漏

**问题**：未处理所有可能的错误情况：

```typescript
// 错误示例：未处理网络错误
try {
  const user = await request('/users/:id', { params: { id: '123' } });
  return user;
} catch (error) {
  // 只处理 APIError，未处理网络错误（TypeError）
  if (error instanceof APIError) {
    console.error(error.message);
  }
  // 网络错误被遗漏
}
```

**解决方案**：统一错误处理：

```typescript
// 正确示例
try {
  const user = await request('/users/:id', { params: { id: '123' } });
  return user;
} catch (error) {
  if (error instanceof APIError) {
    console.error('API 错误:', error.message);
  } else if (error instanceof TypeError) {
    console.error('网络错误:', error.message);
  } else {
    console.error('未知错误:', error);
  }
  throw error;
}
```

### 9.6 循环引用与递归深度

**问题**：类型定义中存在循环引用，导致编译失败：

```typescript
// 错误示例：循环引用
interface User {
  id: string;
  friends: User[];  // 循环引用
  bestFriend?: User;
}

// 在某些类型操作中会导致递归过深
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type PartialUser = DeepPartial<User>; // 可能编译失败
```

**解决方案**：限制递归深度或使用工具类型：

```typescript
// 正确示例：限制递归深度
type DeepPartial<T, Depth extends number = 5> = Depth extends 0
  ? T
  : T extends object
  ? { [P in keyof T]?: DeepPartial<T[P], Depth extends 1 ? 0 : Depth> }
  : T;
```

### 9.7 泛型推断失败

**问题**：TypeScript 无法正确推断泛型参数：

```typescript
// 错误示例：泛型推断失败
async function request<Path extends keyof APIClient>(path: Path): Promise</* ... */> {
  // ...
}

const path: string = '/users';
const users = await request(path); // Path 推断为 string，而非 '/users'
```

**解决方案**：使用 const 断言或显式指定：

```typescript
// 正确示例
const path = '/users' as const;
const users = await request(path); // Path 推断为 '/users'

// 或显式指定
const users = await request<'/users'>('/users');
```

## 第十章 性能分析

### 10.1 编译时性能

类型安全 API 客户端对编译时性能的影响：

| 类型操作 | 复杂度 | 影响 |
|---------|--------|------|
| 简单类型查找 | $O(1)$ | 可忽略 |
| keyof 操作 | $O(n)$，n 为键数 | 小 |
| 条件类型 | $O(1)$ 到 $O(n)$ | 中 |
| 模板字面量类型 | $O(m)$，m 为字符串长度 | 中 |
| 递归类型 | $O(d)$，d 为递归深度 | 大 |
| 映射类型 | $O(n)$，n 为键数 | 中 |

**优化建议**：

1. **避免过深的递归**：限制递归深度，如 `DeepPartial<T, 5>`。
2. **缓存类型计算**：将复杂类型结果保存在类型别名中。
3. **分模块定义**：将大型 API 类型映射拆分为多个模块。
4. **使用 satisfies**：`satisfies` 比直接类型注解更快。

```typescript
// 优化示例：分模块定义
// src/api/users.ts
export interface UserRoutes {
  '/users': { /* ... */ };
  '/users/:id': { /* ... */ };
}

// src/api/posts.ts
export interface PostRoutes {
  '/posts': { /* ... */ };
  '/posts/:postId/comments': { /* ... */ };
}

// src/api/index.ts
export interface APIClient extends UserRoutes, PostRoutes {}
```

### 10.2 运行时性能

类型安全 API 客户端的运行时性能：

| 操作 | 复杂度 | 影响 |
|------|--------|------|
| fetch 调用 | $O(1)$ | 主要开销 |
| JSON 序列化 | $O(n)$，n 为数据大小 | 中 |
| URL 构造 | $O(m)$，m 为参数数 | 小 |
| 拦截器执行 | $O(k)$，k 为拦截器数 | 小 |
| 缓存查找 | $O(1)$ | 可忽略 |

**运行时开销可忽略**：类型约束在编译时擦除，运行时仅保留必要的请求逻辑。

### 10.3 包体积影响

类型安全 API 客户端对包体积的影响：

- **类型定义**：编译时擦除，不影响包体积。
- **运行时代码**：与普通 HTTP 客户端相当。
- **Polyfill**：如果使用 URLSearchParams、AbortController 等现代 API，可能需要 polyfill。

**优化建议**：

1. **按需引入**：只引入需要的功能。
2. **Tree-shaking**：确保构建工具支持 tree-shaking。
3. **避免过度抽象**：不要为每个路由生成独立的函数，使用动态分发。

### 10.4 性能基准测试

```typescript
// 性能基准测试
async function benchmark(): Promise<void> {
  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await request('/users/:id', {
      params: { id: String(i) },
    });
  }

  const end = performance.now();
  console.log(`平均耗时: ${(end - start) / iterations}ms`);
}
```

### 10.5 大型 API 的编译性能优化

对于大型 API（100+ 路由），编译性能可能受影响。优化策略：

1. **类型映射分片**：将大型 API 类型映射拆分为多个文件。
2. **延迟类型求值**：使用条件类型延迟复杂类型的求值。
3. **类型缓存**：将常用类型结果保存在别名中。

```typescript
// 优化示例：类型缓存
// 缓存常用类型
type UserRoute = APIClient['/users/:id'];
type UserGetMethod = UserRoute['GET'];
type UserResponse = GetResponse<UserGetMethod>;

// 避免重复求值
async function getUser(id: string): Promise<UserResponse> {
  return request('/users/:id', { params: { id } });
}
```

## 第十一章 对比其他语言

### 11.1 与 Rust reqwest 对比

Rust 的 reqwest 是强类型 HTTP 客户端，但类型安全方式不同：

```rust
// Rust: 使用 serde 进行序列化/反序列化
use serde::{Serialize, Deserialize};
use reqwest;

#[derive(Serialize, Deserialize)]
struct User {
    id: String,
    name: String,
    email: String,
}

async fn fetch_user(id: &str) -> Result<User, reqwest::Error> {
    let user: User = reqwest::get(&format!("/api/users/{}", id))
        .await?
        .json()
        .await?;
    Ok(user)
}
```

**对比**：

| 特性 | TypeScript | Rust |
|------|-----------|------|
| 类型系统 | 结构化类型 | 名义类型 |
| 运行时验证 | 无（需额外库） | serde 自动验证 |
| 路由类型映射 | 模板字面量类型 | 无内置支持 |
| 异步模型 | Promise/async-await | Future/async-await |
| 错误处理 | Exception | Result |

### 11.2 与 Go net/http 对比

Go 的 net/http 是标准库 HTTP 客户端，类型安全依赖编码/解码：

```go
// Go: 使用 encoding/json
package main

import (
    "encoding/json"
    "net/http"
)

type User struct {
    ID   string `json:"id"`
    Name string `json:"name"`
    Email string `json:"email"`
}

func fetchUser(id string) (*User, error) {
    resp, err := http.Get("/api/users/" + id)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var user User
    if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
        return nil, err
    }
    return &user, nil
}
```

**对比**：

| 特性 | TypeScript | Go |
|------|-----------|-----|
| 类型系统 | 结构化类型 | 名义类型 |
| 运行时验证 | 无 | encoding/json |
| 路由类型映射 | 模板字面量类型 | 无内置支持 |
| 异步模型 | Promise | Goroutine |
| 错误处理 | Exception | error 返回值 |

### 11.3 与 Java HttpClient 对比

Java 11+ 的 HttpClient 是标准库 HTTP 客户端：

```java
// Java: 使用 Jackson 进行 JSON 序列化
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class UserService {
    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public User fetchUser(String id) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("/api/users/" + id))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return mapper.readValue(response.body(), User.class);
    }
}
```

**对比**：

| 特性 | TypeScript | Java |
|------|-----------|------|
| 类型系统 | 结构化类型 | 名义类型 |
| 运行时验证 | 无 | Jackson 反射 |
| 路由类型映射 | 模板字面量类型 | 无内置支持 |
| 异步模型 | Promise | CompletableFuture |
| 错误处理 | Exception | Exception |

### 11.4 与 Python httpx 对比

Python 的 httpx 是现代 HTTP 客户端：

```python
# Python: 使用 pydantic 进行运行时验证
import httpx
from pydantic import BaseModel
from typing import List

class User(BaseModel):
    id: str
    name: str
    email: str

async def fetch_user(user_id: str) -> User:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"/api/users/{user_id}")
        response.raise_for_status()
        return User(**response.json())

async def fetch_users() -> List[User]:
    async with httpx.AsyncClient() as client:
        response = await client.get("/api/users")
        response.raise_for_status()
        return [User(**u) for u in response.json()]
```

**对比**：

| 特性 | TypeScript | Python |
|------|-----------|--------|
| 类型系统 | 结构化类型 | 渐进式类型 |
| 运行时验证 | 无 | pydantic |
| 路由类型映射 | 模板字面量类型 | 无 |
| 异步模型 | Promise | asyncio |
| 错误处理 | Exception | Exception |

### 11.5 与 tRPC 对比

tRPC 是 TypeScript 全栈的端到端类型安全 RPC 框架：

```typescript
// 服务端定义
const appRouter = t.router({
  getUser: t.procedure.input(z.string()).query(({ input }) => {
    return getUserById(input);
  }),
  createUser: t.procedure.input(z.object({
    name: z.string(),
    email: z.string().email(),
  })).mutation(({ input }) => {
    return createUser(input);
  }),
});

// 客户端调用
const user = await trpc.getUser.query('123');
const newUser = await trpc.createUser.mutate({
  name: '张三',
  email: 'zhangsan@example.com',
});
```

**对比**：

| 特性 | 类型安全 API 客户端 | tRPC |
|------|-------------------|------|
| 后端限制 | 任意后端 | TypeScript 后端 |
| 类型来源 | 手动定义或 OpenAPI | 自动从后端推断 |
| 运行时验证 | 需额外库 | 内置 zod |
| 协议 | HTTP | HTTP |
| 生态 | 广泛 | TypeScript 全栈 |

## 第十二章 总结与扩展

### 12.1 核心要点回顾

本教程系统讲解了类型安全 API 客户端的设计与实现：

1. **API 路由类型映射**：将所有路由、方法、参数、响应定义为一个类型映射，作为单一真相源。
2. **路径参数提取**：使用模板字面量类型从路径中提取参数名，实现路径参数的类型安全。
3. **条件参数**：使用条件类型与可变元组实现"方法决定是否需要 body"的条件参数。
4. **泛型请求函数**：基于路由类型映射构建泛型请求函数，自动推断所有参数与返回类型。
5. **链式请求构建器**：提供流畅的链式 API，每一步都有类型保证。
6. **自动生成客户端**：使用映射类型自动生成所有路由与方法的 API 客户端。
7. **错误类型化**：定义 API 错误类型与 Result 类型，实现类型安全的错误处理。
8. **拦截器**：实现类型安全的请求/响应拦截器，支持认证、日志、重试等功能。
9. **框架集成**：提供 React Hook 与 Vue Composable，便于在框架中使用。
10. **性能优化**：分析编译时与运行时性能，提供优化策略。

### 12.2 设计哲学总结

类型安全 API 客户端的设计哲学：

- **类型驱动开发**：类型先于实现，类型即契约。
- **单一真相源**：API 类型映射是所有类型推断的源头。
- **渐进式增强**：从无类型到完整类型安全，可逐步升级。
- **编译时与运行时分离**：类型约束在编译时消除，运行时无开销。
- **类型安全与开发体验平衡**：在严格与宽松间权衡，适应不同场景。

### 12.3 扩展方向

**1. GraphQL 集成**：

将类型安全 API 客户端的思路扩展到 GraphQL：

```typescript
interface GraphQLClient {
  query: {
    getUser: { input: { id: string }; output: User };
    listUsers: { input: { page: number }; output: User[] };
  };
  mutation: {
    createUser: { input: { name: string; email: string }; output: User };
  };
}
```

**2. WebSocket 集成**：

扩展到 WebSocket 通信：

```typescript
interface WebSocketClient {
  '/chat': {
    send: { message: string };
    receive: { message: string; userId: string; timestamp: number };
  };
}
```

**3. gRPC 集成**：

与 gRPC-Web 集成，实现类型安全的 RPC 调用。

**4. 自动化测试**：

基于类型映射自动生成 mock 数据与测试用例：

```typescript
function generateMock<Path extends keyof APIClient, Method extends keyof APIClient[Path]>(
  path: Path,
  method: Method
): GetResponse<APIClient[Path][Method]> {
  // 根据 Response 类型自动生成 mock 数据
  // ...
}
```

**5. API 文档生成**：

从类型映射自动生成 API 文档，确保文档与代码一致。

### 12.4 推荐学习资源

**1. 官方文档**：

- TypeScript Handbook: Conditional Types
- TypeScript Handbook: Template Literal Types
- TypeScript Handbook: Mapped Types

**2. 开源项目**：

- openapi-typescript: 从 OpenAPI 生成 TypeScript 类型
- openapi-fetch: 类型安全的 fetch 客户端
- trpc: 端到端类型安全的 RPC 框架
- orval: 从 OpenAPI 生成类型安全的客户端

**3. 学术资源**：

- MIT 6.5810《Web Performance Engineering》
- Stanford CS142《Web Applications》
- CMU 17-439《Distributed Systems》

### 12.5 实践建议

1. **从小规模开始**：先为核心路由实现类型安全，逐步扩展。
2. **使用 OpenAPI 生成**：避免手动维护大型 API 类型映射。
3. **结合运行时验证**：在关键场景使用 zod 等库进行运行时验证。
4. **监控编译性能**：大型项目需关注类型约束对编译时间的影响。
5. **建立错误处理规范**：制定统一的错误处理策略，避免遗漏。

## 附录 A TypeScript 类型速查

### A.1 泛型约束

```typescript
// 基本约束
function foo<T extends string>(value: T): T { return value; }

// 多重约束
function bar<T extends Record<string, unknown> & { id: string }>(value: T): T { return value; }

// 条件约束
type IsString<T> = T extends string ? true : false;
```

### A.2 条件类型

```typescript
// 基本条件类型
type A = T extends U ? X : Y;

// infer 关键字
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 分布式条件类型
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<'a' | 'b'>; // 'a'[] | 'b'[]
```

### A.3 模板字面量类型

```typescript
// 基本模板字面量
type Greeting = `Hello, ${string}!`;

// 提取
type ExtractDomain<T> = T extends `${string}@${infer Domain}` ? Domain : never;
type D = ExtractDomain<'user@example.com'>; // 'example.com'

// 联合类型展开
type Methods = 'GET' | 'POST';
type APIPaths = `/api/${Methods}`;
// '/api/GET' | '/api/POST'
```

### A.4 映射类型

```typescript
// 基本映射类型
type Stringify<T> = { [K in keyof T]: string };

// 键重映射
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

// 修饰符
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };
```

## 附录 B HTTP 状态码速查

### B.1 成功状态码（2xx）

| 状态码 | 含义 | 典型场景 |
|--------|------|---------|
| 200 OK | 请求成功 | GET、PUT 成功 |
| 201 Created | 资源已创建 | POST 成功 |
| 202 Accepted | 请求已接受 | 异步任务 |
| 204 No Content | 无内容 | DELETE 成功 |

### B.2 客户端错误（4xx）

| 状态码 | 含义 | 典型场景 |
|--------|------|---------|
| 400 Bad Request | 请求格式错误 | 参数验证失败 |
| 401 Unauthorized | 未认证 | 缺少或无效的 token |
| 403 Forbidden | 无权限 | 权限不足 |
| 404 Not Found | 资源不存在 | 路由或资源未找到 |
| 409 Conflict | 冲突 | 资源已存在 |
| 422 Unprocessable Entity | 实体验证失败 | 业务验证失败 |
| 429 Too Many Requests | 请求过多 | 限流 |

### B.3 服务端错误（5xx）

| 状态码 | 含义 | 典型场景 |
|--------|------|---------|
| 500 Internal Server Error | 服务器错误 | 服务端异常 |
| 502 Bad Gateway | 网关错误 | 代理服务器错误 |
| 503 Service Unavailable | 服务不可用 | 服务维护中 |
| 504 Gateway Timeout | 网关超时 | 代理超时 |

## 附录 C OpenAPI 规范速查

### C.1 OpenAPI 基本结构

```yaml
openapi: 3.0.0
info:
  title: Sample API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
    post:
      summary: Create user
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewUser'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: Not Found
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
          format: email
      required:
        - id
        - name
        - email
    NewUser:
      type: object
      properties:
        name:
          type: string
        email:
          type: string
          format: email
      required:
        - name
        - email
```

### C.2 使用 openapi-typescript 生成类型

```bash
# 安装
npm install -D openapi-typescript

# 生成类型
npx openapi-typescript ./openapi.yaml -o ./src/api/generated.ts
```

```typescript
// 使用生成的类型
import type { paths } from './api/generated';

interface APIClient extends paths {}

const user = await request('/users/{id}', {
  params: { id: '123' },
});
// 自动推断为 User 类型
```

## 附录 D 练习题

### 练习 1：扩展 API 客户端

为以下 API 路由添加类型定义：

```typescript
// 需要支持的路由
// PATCH /users/:id  - 部分更新用户，body 为 Partial<User>, response 为 User
// GET /posts/:postId - 获取文章详情，params 为 { postId: string }, response 为 Post
// DELETE /posts/:postId - 删除文章，params 为 { postId: string }, response 为 void
// GET /posts/:postId/comments/:commentId - 获取评论详情，response 为 Comment

interface APIClient {
  // 在此处添加类型定义
}
```

**参考答案**：

```typescript
interface APIClient {
  '/users/:id': {
    PATCH: {
      response: User;
      params: { id: string };
      body: Partial<Omit<User, 'id'>>;
    };
  };
  '/posts/:postId': {
    GET: { response: Post; params: { postId: string } };
    DELETE: { response: void; params: { postId: string } };
  };
  '/posts/:postId/comments/:commentId': {
    GET: {
      response: Comment;
      params: { postId: string; commentId: string };
    };
  };
}
```

### 练习 2：实现类型安全的分页查询

实现一个类型安全的分页查询 Hook，支持：

- 自动推断响应类型
- 支持页码与每页数量
- 支持搜索关键字
- 支持排序字段与方向

**参考答案**：

```typescript
interface PaginationOptions {
  page: number;
  limit: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

function usePaginatedFetch<
  Path extends keyof APIClient,
  Method extends keyof APIClient[Path] = 'GET',
>(
  path: Path,
  pagination: Ref<PaginationOptions>
): UseFetchResult<PaginatedResponse<GetResponse<APIClient[Path][Method]>>> {
  type ResponseType = PaginatedResponse<GetResponse<APIClient[Path][Method]>>;

  // 实现细节...
  // 将 pagination 转换为 query 参数
  // 调用 useFetch
  // 返回分页结果

  return useFetch(path, {
    query: {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: pagination.value.search,
      sortField: pagination.value.sortField,
      sortOrder: pagination.value.sortOrder,
    } as any,
  } as any);
}
```

### 练习 3：实现类型安全的批量请求

实现一个类型安全的批量请求函数，支持：

- 同时发起多个请求
- 等待所有请求完成
- 返回所有请求的结果
- 处理部分失败的情况

**参考答案**：

```typescript
type BatchRequest = {
  [K in keyof APIClient]: {
    path: K;
    method: keyof APIClient[K];
    options: RequestOptions<APIClient[K][keyof APIClient[K]]>;
  };
}[keyof APIClient];

type BatchResult = {
  success: boolean;
  data?: unknown;
  error?: APIError;
};

async function batchRequest(
  requests: BatchRequest[]
): Promise<BatchResult[]> {
  const results = await Promise.allSettled(
    requests.map(req =>
      request(req.path, { ...req.options, method: req.method as any } as any)
    )
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value };
    } else {
      return {
        success: false,
        error: result.reason instanceof APIError
          ? result.reason
          : new APIError('UNKNOWN_ERROR', String(result.reason), 0),
      };
    }
  });
}

// 使用
const results = await batchRequest([
  { path: '/users', method: 'GET', options: { query: { page: 1 } } },
  { path: '/users/:id', method: 'GET', options: { params: { id: '123' } } },
  { path: '/posts', method: 'GET', options: {} },
]);

results.forEach((result, index) => {
  if (result.success) {
    console.log(`请求 ${index} 成功:`, result.data);
  } else {
    console.error(`请求 ${index} 失败:`, result.error?.message);
  }
});
```

### 练习 4：实现类型安全的 WebSocket 客户端

实现一个类型安全的 WebSocket 客户端，支持：

- 类型化的消息发送与接收
- 自动重连
- 心跳检测

**参考答案**：

```typescript
interface WebSocketClient {
  '/chat': {
    send: { type: 'message'; content: string };
    receive: { type: 'message'; content: string; userId: string; timestamp: number };
  };
  '/notification': {
    send: { type: 'subscribe'; channel: string };
    receive: { type: 'notification'; channel: string; message: string };
  };
}

class TypedWebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const listeners = this.listeners.get(data.type);
        listeners?.forEach(listener => listener(data));
      };
    });
  }

  send<Path extends keyof WebSocketClient>(
    path: Path,
    message: WebSocketClient[Path]['send']
  ): void {
    this.ws?.send(JSON.stringify({ path, ...message }));
  }

  on<Path extends keyof WebSocketClient>(
    path: Path,
    listener: (data: WebSocketClient[Path]['receive']) => void
  ): () => void {
    if (!this.listeners.has(path as string)) {
      this.listeners.set(path as string, new Set());
    }
    this.listeners.get(path as string)!.add(listener);

    return () => {
      this.listeners.get(path as string)?.delete(listener);
    };
  }
}

// 使用
const wsClient = new TypedWebSocketClient('ws://localhost:8080');
await wsClient.connect();

wsClient.on('/chat', (data) => {
  console.log(`收到消息: ${data.content}`);
});

wsClient.send('/chat', { type: 'message', content: 'Hello' });
```

### 练习 5：实现类型安全的 API Mock

实现一个类型安全的 API Mock 工具，用于测试：

**参考答案**：

```typescript
type MockHandler<Route> = (options: {
  params?: GetParams<Route>;
  query?: GetQuery<Route>;
  body?: GetBody<Route>;
}) => GetResponse<Route> | Promise<GetResponse<Route>>;

class APIMocker {
  private handlers: Map<string, MockHandler<any>> = new Map();

  mock<Path extends keyof APIClient, Method extends keyof APIClient[Path]>(
    path: Path,
    method: Method,
    handler: MockHandler<APIClient[Path][Method]>
  ): void {
    const key = `${method}:${path}`;
    this.handlers.set(key, handler);
  }

  getHandler<Path extends keyof APIClient, Method extends keyof APIClient[Path]>(
    path: Path,
    method: Method
  ): MockHandler<APIClient[Path][Method]> | undefined {
    const key = `${method}:${path}`;
    return this.handlers.get(key);
  }

  clear(): void {
    this.handlers.clear();
  }
}

// 使用
const mocker = new APIMocker();

mocker.mock('/users', 'GET', ({ query }) => {
  return [
    { id: '1', name: '张三', email: 'zhangsan@example.com', age: 25 },
    { id: '2', name: '李四', email: 'lisi@example.com', age: 30 },
  ];
});

mocker.mock('/users/:id', 'GET', ({ params }) => {
  return {
    id: params!.id,
    name: '张三',
    email: 'zhangsan@example.com',
    age: 25,
  };
});

// 在测试中使用
const handler = mocker.getHandler('/users', 'GET');
const mockUsers = handler?.({});
// mockUsers 自动推断为 User[]
```

## 参考文献

1. TypeScript Handbook. "Conditional Types". https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
2. TypeScript Handbook. "Template Literal Types". https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
3. TypeScript Handbook. "Mapped Types". https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
4. openapi-typescript. https://github.com/drwpow/openapi-typescript
5. tRPC. https://trpc.io/
6. Axios. https://axios-http.com/
7. MDN Web Docs. "Using Fetch". https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
8. Fielding, R. T. "Architectural Styles and the Design of Network-based Software Architectures". 2000.
9. MIT 6.5810 Web Performance Engineering. https://web.mit.edu/6.5810/
10. Stanford CS142 Web Applications. https://cs142.stanford.edu/
