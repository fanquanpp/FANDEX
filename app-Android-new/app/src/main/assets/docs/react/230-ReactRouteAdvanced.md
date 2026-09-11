---
order: 230
title: React 路由进阶
module: 'react'
category: 前端技术
difficulty: intermediate
description: React Router 7 进阶：createBrowserRouter 路由表与嵌套布局、loader/action 数据流、useNavigation 与 useRouteError、useFetcher 局部操作、懒加载与受保护路由。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/210-ReactTypeScript'
  - 'react/220-ReactTest'
  - 'react/240-ReactI18n'
  - 'react/250-ReactAnimation'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

React Router 6.4 之后（含 2024 年底发布的 v7），官方把 Remix 的数据能力并入主库：路由不再只是"URL 到组件的映射"，而是一个带 **loader（取数）、action（提交）、errorElement（错误边界）、pending 状态**的完整数据层。本文基于当前主流的 `createBrowserRouter` 数据路由写法；Next.js 的文件路由是另一条路线，见[Next.js App Router](/react/410-NextJsAppRouter)。

## 2. 路由表与嵌套布局：createBrowserRouter + Outlet

当代推荐写法是"对象式路由表 + `RouterProvider`"，嵌套路由用 `children` 声明，父路由里用 `<Outlet />` 标记子路由的渲染出口：

```tsx
// main.tsx
import { createBrowserRouter, RouterProvider, Outlet, NavLink } from 'react-router';
import { UserLayout } from './UserLayout';

const router = createBrowserRouter([
  {
    path: '/user',
    element: <UserLayout />, // 父布局：含导航与 <Outlet />
    children: [
      { index: true, element: <Profile /> },       // index 路由 = /user 本身
      { path: 'orders', element: <Orders /> },     // /user/orders
      { path: ':id', element: <UserDetail /> },    // 动态段 /user/123
    ],
  },
]);

export function UserLayout() {
  return (
    <div>
      <nav>
        {/* NavLink 自动给激活项加 class（默认 active） */}
        <NavLink to="/user" end>资料</NavLink>
        <NavLink to="/user/orders">订单</NavLink>
      </nav>
      <Outlet /> {/* 子路由渲染在这里 */}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
```

预期行为：访问 `/user` 显示 Profile；点击"订单"后 URL 变为 `/user/orders`，Orders 渲染在 `<Outlet />` 的位置，导航与布局不重新挂载；`NavLink` 激活项获得 `active` class。

## 3. 参数与查询串：useParams / useSearchParams

```tsx
import { useNavigate, useParams, useSearchParams } from 'react-router';

function UserDetail() {
  const { id } = useParams(); // 路由段参数，类型为 string | undefined
  return <h2>用户 {id}</h2>;
}

function OrderList() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1');
  const keyword = params.get('q') ?? '';

  // 把筛选条件写进 URL：可分享、可刷新、可前进后退
  function search(q: string) {
    setParams({ page: '1', q }); // setParams 会触发重渲染与重新执行 loader
  }

  return (
    <div>
      <input defaultValue={keyword} onKeyDown={(e) => e.key === 'Enter' && search(e.currentTarget.value)} />
      <button onClick={() => setParams({ page: String(page + 1), q: keyword })}>下一页</button>
    </div>
  );
}

// 编程式跳转
const navigate = useNavigate();
navigate('/user/123');            // push
navigate('/user', { replace: true }); // 替换历史记录（常用于登录后）
navigate(-1);                     // 后退
```

筛选、分页、tab 这类"可分享的视图状态"放 URL（`useSearchParams`）；纯临时的 UI 状态（弹窗开关）才放组件 state。

## 4. 数据流：loader / action / useNavigation

loader 在**导航发生时**执行（渲染前），组件通过 `useLoaderData` 直接拿到数据——不再手写 useEffect 取数与 loading 三态：

```tsx
import { useLoaderData, useNavigation, useRouteError } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/orders',
    element: <Orders />,
    errorElement: <OrdersError />, // 本段路由的 loader/渲染错误都进这里（局部错误边界）
    loader: async ({ request }) => {
      const url = new URL(request.url); // loader 里也能拿到查询串
      const res = await fetch(`/api/orders?page=${url.searchParams.get('page') ?? '1'}`);
      if (!res.ok) throw new Response('订单加载失败', { status: res.status });
      return res.json();
    },
  },
]);

function Orders() {
  const orders = useLoaderData<{ list: { id: number; title: string }[] }>();
  const navigation = useNavigation(); // 全局导航状态：idle | loading | submitting
  return (
    <div style={{ opacity: navigation.state === 'loading' ? 0.5 : 1 }}>
      {orders.list.map((o) => <p key={o.id}>{o.title}</p>)}
    </div>
  );
}

function OrdersError() {
  const error = useRouteError() as { status?: number; statusText?: string };
  return <div role="alert">出错：{error.statusText ?? '未知错误'}</div>;
}
```

预期行为：导航到 `/orders` 时 loader 先执行，期间 `useNavigation().state === 'loading'`（可用它做骨架屏/降透明度）；数据到达后组件带着数据一次性渲染；接口 500 时渲染 `OrdersError` 而不是白屏。

`action` 是同一路由的提交端点：`<Form method="post">` 提交后自动执行 action，完成后可用 `useActionData` 拿返回值——这就是 React Router 版的"表单动作"，与 React 19 原生 `action` 的思路一致。

## 5. useFetcher：不改变路由的局部操作

点赞、收藏、行内编辑这类操作不想触发导航，用 `useFetcher`：

```tsx
function LikeButton({ postId }: { postId: string }) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== 'idle';
  return (
    <fetcher.Form method="post" action={`/posts/${postId}/like`}>
      {/* 提交走 action，但不跳转、不重渲染整个页面 */}
      <button disabled={busy}>{busy ? '...' : '点赞'}</button>
    </fetcher.Form>
  );
}
```

## 6. 懒加载与受保护路由

路由级代码分割用 `lazy`（比 React.lazy 包裹组件更细：loader 与组件可分别切包）；鉴权守卫是普通的"组件包一层"：

```tsx
const router = createBrowserRouter([
  {
    path: '/admin',
    lazy: async () => {
      const [{ AdminLayout }, { adminLoader }] = await Promise.all([
        import('./AdminLayout'),
        import('./adminLoader'),
      ]);
      return { Component: AdminLayout, loader: adminLoader }; // 按需加载后才注册
    },
  },
]);

// 受保护路由：未登录重定向到登录页并记住来源
function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
// 用法：{ path: '/account', element: <RequireAuth><Account /></RequireAuth> }
```

## 7. 常见陷阱

- **嵌套路径少了/多了斜杠**：`children` 里 `path: 'orders'` 是相对父路径（`/user/orders`）；以 `/` 开头则从根算起。带参数段必须写 `:id`，`useParams` 取到的永远是字符串。
- **混淆 `<a href>` 与 `<Link>`**：原生 `<a>` 触发整页刷新、重跑所有初始化；站内跳转一律 `Link`/`NavLink`/`navigate`。
- **忘记 index 路由**：父路径 `/user` 没有 `index: true` 的子路由时，`<Outlet />` 位置会是空白。
- **loader 错误没配 errorElement**：loader 抛错且无局部 `errorElement` 时逐级上抛到根 `errorElement`，没配根的直接白屏。
- **还在用 `<Switch>` / `component` prop**：那是 React Router 5 的 API；v6/v7 是 `<Routes>`/`element`，对象式配置入口是 `createBrowserRouter`，不存在 `<Switch>`。
- **useNavigation 是全局的**：它反映的是"任意路由切换/提交"的状态；只要某个 loader 在跑就是 loading，不要把它误当成单个请求的状态。
- **双 Router 报错**：`<BrowserRouter>` 包裹与 `createBrowserRouter` 二选一，不能同时使用（`You cannot render a <Router> inside another <Router>`）。

## 8. 小结

初学者要点：

- 路由表用 `createBrowserRouter([...])` + `RouterProvider`；嵌套布局靠 `children` + `<Outlet />`；`index: true` 定义父路径默认页。
- 路径参数 `useParams`，查询串 `useSearchParams`（把筛选条件放 URL）。
- 站内跳转只用 `Link` / `NavLink` / `useNavigate`，不要写原生 `<a>`。

进阶注意：

- 数据路由的核心是 loader（导航时取数）+ action（提交）+ `useNavigation`（pending 态）+ `errorElement`（局部错误边界），把"取数三态"从组件里移走。
- 不触发导航的局部提交用 `useFetcher`；路由级代码分割用 `lazy`；鉴权守卫是组合 `Navigate` + `useLocation` 的普通组件。
- React Router 7 与框架模式（Remix 合流）的边界：纯 SPA 项目用 library 模式即可，需要 SSR/预渲染时再上框架模式或 Next.js。

## 速查

**useRoutes 配置式路由（组件内使用）**

```tsx
const element = useRoutes([
  { path: '/', element: <Home /> },
  {
    path: '/user',
    element: <UserLayout />,
    children: [{ path: 'profile', element: <Profile /> }],
  },
]);
return element;
```

**useNavigation 导航状态**

```tsx
const nav = useNavigation(); // state: 'idle' | 'loading' | 'submitting'
{nav.state === 'loading' && <Spinner />}
```

**常用 API 一览**

```tsx
const params = useParams<{ id: string }>();          // 路径参数
const [sp, setSp] = useSearchParams();               // ?page=2&q=x
const data = useLoaderData<Order[]>();               // loader 数据
const actionData = useActionData<typeof action>();   // action 返回值
const fetcher = useFetcher();                        // 局部提交
const error = useRouteError();                       // errorElement 里取错误
<NavLink to="/a" end className={({ isActive }) => (isActive ? 'on' : '')} />
<Form method="post" action="/login"><input name="email" /><button>登录</button></Form>
```
