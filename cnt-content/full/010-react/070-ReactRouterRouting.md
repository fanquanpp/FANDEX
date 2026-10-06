---
order: 110
title: React Router 路由
module: 'react'
category: 前端技术
difficulty: beginner
description: React Router v7 的路由配置、嵌套布局、loader/action 路由级数据加载与路由 hook 速查——原 RouteDataFetch 篇的路由主题重构，SWR/React Query 已拆至客户端数据获取篇。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：客户端路由（routing）与路由级数据加载——React Router v7 的配置模型、嵌套布局、loader/action/defer。
- **解决什么问题**：多页面 SPA 的 URL 与视图对应关系；导航时保留公共布局不重挂载；「进页面前数据已就绪」的预取模型；路由切换中的加载与错误状态放哪。
- **什么时候用到**：任何多视图 React 应用。组件内的取数与缓存（SWR/TanStack Query）见[客户端数据获取与缓存](/react/075-ClientDataFetching)——分工是：路由 loader 管「这一页第一次进入要什么」，缓存库管「页内增量刷新与共享」；Next.js 侧的文件系统路由与 Server Actions 见 [Next.js App Router](/react/410-NextJsAppRouter) 与 [Next.js 全栈](/react/100-NextJSFullStack)。

## 前置知识

- [状态与事件](/react/030-StateEvent)：受控组件与回调上抛——loader 数据最终仍要以 props 进入组件

## 1. React Router v7 与基础配置

React Router v7 是 React 生态中最流行的路由库，整合了 Remix 的数据加载能力。库模式（library mode）适合存量 SPA，框架模式（framework mode）提供 loader/action 预取。

```bash
npm install react-router
```

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'users', element: <Users /> },
      { path: 'users/:id', element: <UserDetail /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

逐段讲解：

- `createBrowserRouter` 把「路由表」变成一个 router 对象，再由 `RouterProvider` 注入组件树。为什么这样写而不是老式的 `<BrowserRouter><Routes/></BrowserRouter>` 声明式写法：数据 API（loader/action）挂在路由定义对象上，需要先有对象再渲染——对象先行是 v6.4 后数据路由的前提。
- `users/:id` 中的 `:id` 是动态段；`index: true` 是父路径为空时的默认子路由。
- 易错点：v7 的包名是 `react-router`（不是 `react-router-dom`）。老教程从 `react-router-dom` import 仍能跑（兼容再导出），但新项目应统一用 `react-router`。

框架模式下路由表也可以用文件声明（类型更安全，配合 dev 插件做代码分割）：

```tsx
// routes.ts
import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('about', 'routes/about.tsx'),
  route('users', 'routes/users.tsx'),
  route('users/:id', 'routes/user-detail.tsx'),
] satisfies RouteConfig;
```

`satisfies RouteConfig` 只校验形状而不拓宽类型——写错路径字符串或漏写文件在编译期即报错，这是它优于裸数组的点。

## 2. 导航组件与编程式导航

```tsx
import { Link, NavLink, useNavigate } from 'react-router';

function Navigation() {
  const navigate = useNavigate();

  return (
    <nav>
      {/* Link — 基础导航：渲染为 <a>，拦截点击走客户端路由 */}
      <Link to="/">首页</Link>
      <Link to="/about">关于</Link>

      {/* NavLink — 带激活状态：isActive/isPending 用于高亮与过渡 */}
      <NavLink
        to="/users"
        className={({ isActive, isPending }) => (isActive ? 'active' : isPending ? 'pending' : '')}
      >
        用户
      </NavLink>

      {/* 编程式导航：逻辑触发而非用户点击 */}
      <button onClick={() => navigate('/login')}>登录</button>
      <button onClick={() => navigate(-1)}>返回</button>
    </nav>
  );
}
```

为什么有 Link 还要 useNavigate：Link 是「用户主动点」的场景；登录成功后跳转、表单保存后回列表是**逻辑**触发的跳转，只能编程式。换成 `<a href>` 会触发整页刷新，丢失所有客户端状态——这是新手最常踩的坑。

## 3. 路由参数与查询参数

### 3.1 路径参数 useParams

```tsx
import { useParams } from 'react-router';

function UserDetail() {
  const { id } = useParams<{ id: string }>();

  return <h1>用户 ID：{id}</h1>;
}
```

`useParams` 的值永远是 string（URL 段没有类型信息），泛型参数只做断言不做转换。需要数字时显式 `Number(id)` 并处理 NaN——易错点：直接拿去查接口可能查出意外结果，参数校验放在 loader 或组件早期返回。

### 3.2 查询参数 useSearchParams

```tsx
import { useSearchParams } from 'react-router';

function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get('page') ?? '1';
  const category = searchParams.get('category') ?? '';

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      prev.set('page', p.toString());
      return prev;
    });
  };

  return (
    <div>
      <p>
        第 {page} 页 | 分类：{category}
      </p>
      <button onClick={() => setPage(Number(page) + 1)}>下一页</button>
    </div>
  );
}
```

为什么不把页码存进 useState：查询参数写进 URL 后，刷新、分享链接、后退都能还原同一页——这是「URL 即状态」的纪律（与[状态结构与摆放](/react/035-StateStructureAndLifting)的「最小真源」一脉相承：页码的真源是 URL）。函数式 `setSearchParams(prev => ...)` 保证并发更新不互相覆盖，等价于 setState 的 updater 形式。

## 4. 嵌套路由、布局路由与 Outlet

### 4.1 嵌套路由

```tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />, // 布局组件
    children: [
      { index: true, element: <Home /> },
      {
        path: 'dashboard',
        element: <DashboardLayout />, // 子布局
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'analytics', element: <Analytics /> },
          { path: 'settings', element: <Settings /> },
        ],
      },
    ],
  },
]);
```

```tsx
import { Outlet } from 'react-router';

function Layout() {
  return (
    <div>
      <header>
        <nav>导航栏</nav>
      </header>
      <main>
        <Outlet /> {/* 子路由渲染在这里 */}
      </main>
      <footer>页脚</footer>
    </div>
  );
}
```

机制要点：子路由切换时，**只有 `<Outlet />` 位置的内容重渲染**，Layout 保持挂载——导航栏的滚动位置、动画、已打开的下拉菜单都不会闪断。如果不嵌套而让每个页面自己包含导航栏，每次跳转都是整树重挂载。

### 4.2 布局路由（无路径）

```tsx
const router = createBrowserRouter([
  {
    // 无 path，仅作为布局容器
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
    ],
  },
]);

function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-sidebar">
        <h2>欢迎</h2>
      </div>
      <div className="auth-content">
        <Outlet />
      </div>
    </div>
  );
}
```

布局路由的价值：三个认证页共享一套外壳与逻辑（如未登录重定向、埋点），但不给 URL 添加层级。这在工程里常用于「同一 URL 结构、不同外壳」的 A/B 布局切换。

## 5. 路由级数据加载（loader/action）

### 5.1 Loader — 进入路由前取数

```tsx
import { createBrowserRouter, RouterProvider, useLoaderData } from 'react-router';

// 定义 loader
async function userLoader({ params }: { params: { id: string } }) {
  const res = await fetch(`/api/users/${params.id}`);
  if (!res.ok) throw new Response('用户不存在', { status: 404 });
  return res.json();
}

// 在路由配置中使用
const router = createBrowserRouter([
  {
    path: '/users/:id',
    element: <UserDetail />,
    loader: userLoader,
    errorElement: <UserNotFound />,
  },
]);

// 在组件中消费数据
function UserDetail() {
  const user = useLoaderData() as User;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

与 useEffect 取数的本质区别（也是 loader 存在的理由）：

- **时序**：loader 在路由匹配后、组件渲染前执行，组件拿到 props 时数据已就绪——没有「先渲染空壳再填充」的两段式。useEffect 取数是挂载后才发请求，必然闪一次 loading。
- **错误通道**：loader 里 `throw new Response(...)` 直接把路由切到 `errorElement`，错误处理有了统一入口；useEffect 里的 fetch 失败需要每个组件自己 setError。
- **并行**：嵌套路由的多个 loader 同时发起（配合 5.3 的 defer 可以进一步细粒度控制）。
- 取舍：loader 预取意味着**点击链接到首帧渲染**要等数据；页内增量刷新、按钮触发的重取仍然是 SWR/TanStack Query 的领地（见[客户端数据获取与缓存](/react/075-ClientDataFetching)）。

### 5.2 Action — 表单提交处理

```tsx
import { Form, useActionData, redirect } from 'react-router';

async function createPostAction({ request }: { request: Request }) {
  const formData = await request.formData();
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  if (!title.trim()) {
    return { error: '标题不能为空' };
  }

  const post = await createPostAPI({ title, content });
  return redirect(`/posts/${post.id}`);
}

function NewPost() {
  const actionData = useActionData() as { error?: string };

  return (
    <Form method="post">
      <input name="title" placeholder="标题" />
      {actionData?.error && <p className="error">{actionData.error}</p>}
      <textarea name="content" placeholder="内容" />
      <button type="submit">发布</button>
    </Form>
  );
}
```

逐段讲解：

- `<Form method="post">`（大写 F）把提交交给路由 action 而不是浏览器原生提交——没有整页刷新，但保留了「表单语义」：JS 未加载时也能工作（渐进增强，Remix 血统的核心卖点）。
- action 返回值（包括 `{ error }`）由 `useActionData` 消费；`redirect()` 是特殊的返回值，触发导航。校验失败的错误信息随 action 结果回来，天然与提交动作绑定，不需要组件里额外存一个 error state。
- 易错点：action 挂在**哪个路由**上，取决于 Form 所在的路由匹配——嵌套路由里放在 `<Outlet/>` 外的 Form 会命中父路由的 action。拿不准时给路由显式配 `action: createPostAction`。

### 5.3 Deferred — 关键数据先到，次要数据流式

```tsx
import { defer, Await } from 'react-router';
import { Suspense } from 'react';

function postLoader({ params }: { params: { id: string } }) {
  // 关键数据立即加载，非关键数据延迟加载
  const post = getPost(params.id); // Promise
  const comments = getComments(params.id); // Promise

  return defer({
    post, // 等待完成
    comments, // 延迟加载
  });
}

function PostPage() {
  const data = useLoaderData() as { post: Post; comments: Promise<Comment[]> };

  return (
    <div>
      <h1>{data.post.title}</h1>
      <div>{data.post.content}</div>

      <Suspense fallback={<p>加载评论...</p>}>
        <Await resolve={data.comments}>
          {(comments) => (
            <ul>
              {comments.map((c) => (
                <li key={c.id}>{c.text}</li>
              ))}
            </ul>
          )}
        </Await>
      </Suspense>
    </div>
  );
}
```

为什么这样设计：正文是用户进页面的目的（关键），评论可以晚几百毫秒流式补上（次要）。`defer` 让两者解耦——不 defer 的话，整页要等最慢的那个请求。这是 loader 模型对「并行 but 不互相阻塞」的回答，与 SSR 的流式渲染思想一致（见 [React 服务端渲染](/react/260-ReactSSR)）。

## 6. 路由 Hook 与 API 速查

> 速查来自原 070 篇的 hook 速查节，全部保留；示例按 v7 的 `react-router` 包名书写。

**useNavigate 编程式导航**

`const navigate = useNavigate();`

```tsx
navigate('/users');                           // 字符串路径
navigate('/users', { replace: true });        // 替换历史（不产生后退记录）
navigate(-1);                                 // 后退
navigate(1);                                  // 前进
navigate({ pathname: '/u', search: '?id=1' });// 对象路径
```

```tsx
function LoginButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/dashboard')}>登录</button>;
}
```

**useParams 路径参数**

```tsx
function User() {
  const { id } = useParams<{ id: string }>();
  return <div>User ID: {id}</div>;
}
// 路由 /users/:userId/posts/:postId 时一次取多个
const { userId, postId } = useParams<{ userId: string; postId: string }>();
```

**useLocation 当前位置**

```tsx
function Page() {
  const location = useLocation();
  // location.pathname  当前路径
  // location.search    查询字符串
  // location.hash      哈希
  // location.state     导航时携带的状态（不在 URL 里）
  // location.key       唯一标识
  return <div>Current: {location.pathname}</div>;
}
```

**useSearchParams 查询参数**

```tsx
const [searchParams, setSearchParams] = useSearchParams();
searchParams.get('q');          // 单值
searchParams.getAll('tag');     // 多值
searchParams.has('sort');       // 是否存在

setSearchParams({ page: '2', sort: 'desc' });   // 整体替换
setSearchParams((prev) => {                      // 函数式增量更新
  prev.set('page', '2');
  return prev;
});
```

**useLoaderData 加载器数据**

```tsx
type User = { id: string; name: string };

function UserPage() {
  const user = useLoaderData() as User;
  return <h1>{user.name}</h1>;
}
```

```tsx
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ params }: LoaderFunctionArgs) {
  const user = await fetchUser(params.id!);
  return user;
}
```

**useRouteError 路由错误**

```tsx
function ErrorPage() {
  const error = useRouteError() as Error;
  return <div>错误：{error.message}</div>;
}
```

**useRouteLoaderData 嵌套路由数据**

```tsx
const rootData = useRouteLoaderData('root') as RootData;
```

**useNavigation 导航状态**

```tsx
function LoadingBar() {
  const navigation = useNavigation();
  // navigation.state: 'idle' | 'submitting' | 'loading'
  // navigation.location: 目标 location
  // navigation.formData: 提交的表单数据
  return navigation.state !== 'idle' ? <Spinner /> : null;
}
```

**useMatch 路由匹配**

```tsx
const match = useMatch('/users/:id');
// match: { params: { id: '123' }, pathname: '/users/123', ... } | null
```

**useOutlet / useOutletContext**

```tsx
function Layout() {
  const outlet = useOutlet();
  return outlet ? <main>{outlet}</main> : <Empty />;
}
```

```tsx
// 父组件：给子路由传上下文
function Parent() {
  const [count, setCount] = useState(0);
  return <Outlet context={{ count, setCount }} />;
}
// 子组件：消费上下文
function Child() {
  const { count, setCount } = useOutletContext<{ count: number; setCount: (n: number) => void }>();
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Link 与 NavLink**

```tsx
<Link to="/users/1">用户 1</Link>
<Link to="/login" state={{ from: '/dashboard' }} replace>登录</Link>
```

```tsx
<NavLink
  to="/users"
  className={({ isActive, isPending }) => (isActive ? 'active' : isPending ? 'pending' : '')}
>
  用户列表
</NavLink>
```

**Outlet 与 Navigate**

```tsx
<Outlet />
<Outlet context={{ user }} />
<Navigate to="/login" replace state={{ from: location.pathname }} />
```

**Router 配置 API**

```tsx
import { createBrowserRouter, RouterProvider, defer } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: 'users/:id', element: <User />, loader: userLoader },
    ],
  },
]);

createRoot(container).render(<RouterProvider router={router} />);

export async function loader() {
  return defer({
    users: fetchUsers(),     // Promise：流式等待
    summary: fetchSummary(), // Promise：流式等待
  });
}
```

## 7. 动手实践

### 练习 1：把整页刷新改成客户端路由

任务：书站详情页里有一个「返回书架」的 `<a href="/shelf">`，点击后整页白屏一瞬重新加载。修复它并说明原理。

提示：导航组件一节的三件套里选一个；「返回」动作语义上有历史记录吗？

参考实现（先自己写，再展开对照）：

<details>
<summary>参考实现</summary>

```tsx
import { Link } from 'react-router';

<Link to="/shelf">返回书架</Link>
```

自检：`<a>` 走浏览器原生导航（整页刷新、状态全丢）；Link 拦截点击走客户端路由。如果按钮是「回到上一次浏览位置」，应改用 `navigate(-1)`——语义不同，工具不同。
</details>

### 练习 2：给用户详情页接 loader

任务：用户详情页目前用 useEffect + useState 取数，出现「先渲染骨架再填充」。改造成 loader + useLoaderData，并让「用户不存在」时展示专用错误页。

提示：loader 里抛 Response；路由配置里加 errorElement；组件里的 loading 分支可以整个删掉。

参考实现：

<details>
<summary>参考实现</summary>

```tsx
async function userLoader({ params }: { params: { id: string } }) {
  const res = await fetch(`/api/users/${params.id}`);
  if (!res.ok) throw new Response('用户不存在', { status: 404 });
  return res.json();
}

const router = createBrowserRouter([
  {
    path: '/users/:id',
    element: <UserDetail />,
    loader: userLoader,
    errorElement: <UserNotFound />,
  },
]);

function UserDetail() {
  const user = useLoaderData() as User;
  return <h1>{user.name}</h1>;
}
```

自检：组件里还有 useState/useEffect 吗？错误路径是否完全不经过组件状态？
</details>

### 练习 3：设计一个双栏布局路由

任务：阅读器后台要求：左侧固定目录树，右侧内容区显示 `/docs/:docId`；`/docs` 本身显示欢迎页。目录树在文档切换时不能重新挂载（保持展开状态）。写出路由表与布局组件骨架。

提示：嵌套路由 + index 路由 + Outlet；目录树放 Layout 里而不是每个页面里。

参考实现：

<details>
<summary>参考实现</summary>

```tsx
const router = createBrowserRouter([
  {
    path: '/docs',
    element: <DocsLayout />,           // 目录树在这里，切换不重挂
    children: [
      { index: true, element: <Welcome /> },              // /docs
      { path: ':docId', element: <DocViewer /> },         // /docs/:docId
    ],
  },
]);

function DocsLayout() {
  return (
    <div style={{ display: 'flex' }}>
      <aside><CatalogTree /></aside>
      <main><Outlet /></main>
    </div>
  );
}
```

自检：目录树组件是否只出现在 Layout？从 `/docs` 进 `/docs/react-router` 时 CatalogTree 的展开状态保留吗（Outlet 位置替换、其余不动）？
</details>

## 8. 小结

- `createBrowserRouter` + `RouterProvider` 是数据路由的入口；路由参数用 useParams，URL 状态用 useSearchParams。
- 嵌套路由的价值在「切换时只有 Outlet 重渲染」，布局路由（无 path）用来共享外壳不加 URL 层级。
- loader/action 把取数、校验、错误、重定向收进路由层：进页面即有数据、错误有统一通道；页内增量刷新仍交给缓存库。
- defer + Await 让关键数据先渲染、次要数据流式补齐。

## 参考与致谢

- React Router 官方文档：https://reactrouter.com/ ，React Router, MIT License。
- 本篇由原 070-ReactRouterRouting 拆分重构：路由主题（含全部 hook 速查）保留在本篇并教学化改写；SWR 与 React Query 两节拆至 [客户端数据获取与缓存](/react/075-ClientDataFetching)；Next.js App Router 与 Server Actions 两节因与 [Next.js App Router](/react/410-NextJsAppRouter)、[Next.js 全栈](/react/100-NextJSFullStack) 重复而移除。
