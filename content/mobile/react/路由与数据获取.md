# React Router hooks 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## useNavigate 编程式导航

**useNavigate**
`const <navigate> = useNavigate();`
```tsx
import { useNavigate } from 'react-router-dom';

function LoginButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/dashboard')}>登录</button>;
}
```

**navigate 签名**
`navigate(<to>, [<options>]);`
```tsx
navigate('/users');                          // 字符串路径
navigate('/users', { replace: true });        // 替换历史
navigate(-1);                                 // 后退
navigate(1);                                  // 前进
navigate({ pathname: '/u', search: '?id=1' });// 对象路径
```

**navigate options**
```tsx
navigate('/login', {
  replace: true,                              // 替换历史记录
  state: { from: '/dashboard' },             // 路由状态
});
```

---

## useParams 路径参数

**useParams**
`const <params> = useParams<<T>>();`
```tsx
import { useParams } from 'react-router-dom';

function User() {
  const { id } = useParams<{ id: string }>();
  return <div>User ID: {id}</div>;
}
```

**多个参数**
```tsx
// 路由:/users/:userId/posts/:postId
const { userId, postId } = useParams<{ userId: string; postId: string }>();
```

---

## useLocation 当前位置

**useLocation**
`const <location> = useLocation();`
```tsx
import { useLocation } from 'react-router-dom';

function Page() {
  const location = useLocation();
  // location.pathname  当前路径
  // location.search    查询字符串
  // location.hash      哈希
  // location.state     路由状态
  // location.key       唯一标识
  return <div>Current: {location.pathname}</div>;
}
```

---

## useSearchParams 查询参数

**useSearchParams**
`const [<searchParams>, <setSearchParams>] = useSearchParams();`
```tsx
import { useSearchParams } from 'react-router-dom';

function Filter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get('page') ?? '1';

  const setPage = (p: number) => {
    setSearchParams({ page: String(p) });
  };
  return <button onClick={() => setPage(2)}>第 2 页</button>;
}
```

**读取多值**
```tsx
searchParams.get('q');          // 单值
searchParams.getAll('tag');     // 多值
searchParams.has('sort');       // 是否存在
```

**设置方式**
```tsx
setSearchParams({ page: '2', sort: 'desc' });
setSearchParams(prev => {
  prev.set('page', '2');
  return prev;
});
```

---

## useLoaderData 加载器数据

**useLoaderData**
`const <data> = useLoaderData() as <T>;`
```tsx
import { useLoaderData } from 'react-router-dom';

type User = { id: string; name: string };

function UserPage() {
  const user = useLoaderData() as User;
  return <h1>{user.name}</h1>;
}
```

**类型化 Loader**
```tsx
import type { LoaderFunctionArgs } from 'react-router-dom';

export async function loader({ params }: LoaderFunctionArgs) {
  const user = await fetchUser(params.id!);
  return user;
}
```

---

## useRouteError 路由错误

**useRouteError**
`const <error> = useRouteError();`
```tsx
import { useRouteError } from 'react-router-dom';

function ErrorBoundary() {
  const error = useRouteError() as Error;
  return <div>错误:{error.message}</div>;
}
```

---

## useRouteLoaderData 嵌套路由数据

**useRouteLoaderData**
`const <data> = useRouteLoaderData('<routeId>');`
```tsx
const rootData = useRouteLoaderData('root') as RootData;
```

---

## useNavigation 导航状态

**useNavigation**
`const <navigation> = useNavigation();`
```tsx
import { useNavigation } from 'react-router-dom';

function LoadingBar() {
  const navigation = useNavigation();
  // navigation.state: 'idle' | 'submitting' | 'loading'
  // navigation.location: 目标 location
  // navigation.formData: 提交的表单数据
  return navigation.state !== 'idle' ? <Spinner /> : null;
}
```

---

## useMatch 路由匹配

**useMatch**
`const <match> = useMatch('<pattern>');`
```tsx
const match = useMatch('/users/:id');
// match: { params: { id: '123' }, pathname: '/users/123', ... } | null
```

---

## useOutlet 获取 Outlet

**useOutlet**
`const <outlet> = useOutlet();`
```tsx
function Layout() {
  const outlet = useOutlet();
  return outlet ? <main>{outlet}</main> : <Empty />;
}
```

---

## useOutletContext 上下文传递

**useOutletContext**
`const <ctx> = useOutletContext<<T>>();`
```tsx
// 父组件
function Parent() {
  const [count, setCount] = useState(0);
  return <Outlet context={{ count, setCount }} />;
}

// 子组件
function Child() {
  const { count, setCount } = useOutletContext<{
    count: number;
    setCount: (n: number) => void;
  }>();
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

## Link 与 NavLink

**Link**
`<Link to=<path> [state=<obj>] [replace]>...</Link>`
```tsx
import { Link } from 'react-router-dom';

<Link to="/users/1">用户 1</Link>
<Link to="/login" state={{ from: '/dashboard' }} replace>登录</Link>
```

**NavLink 高亮链接**
`<NavLink to=<path> [className=<fn>]>...</NavLink>`
```tsx
<NavLink
  to="/users"
  className={({ isActive, isPending }) =>
    isActive ? 'active' : isPending ? 'pending' : ''
  }
>
  用户列表
</NavLink>
```

---

## Outlet 与 Navigate

**Outlet**
`<Outlet context={<value>} />`
```tsx
<Outlet />
<Outlet context={{ user }} />
```

**Navigate 编程式重定向**
`<Navigate to=<path> [replace] [state=<obj>] />`
```tsx
<Navigate to="/login" replace state={{ from: location.pathname }} />
```

---

## Router 配置 API

**createBrowserRouter**
`const <router> = createBrowserRouter([<routes>], [<options>]);`
```tsx
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Home /> },
      { path: 'users/:id', element: <User />, loader: userLoader },
    ],
  },
]);
```

**RouterProvider**
`<RouterProvider router={<router>} />`
```tsx
import { RouterProvider } from 'react-router-dom';

createRoot(container).render(<RouterProvider router={router} />);
```

**defer 流式加载**
```tsx
import { defer } from 'react-router-dom';

export async function loader() {
  return defer({
    users: fetchUsers(),           // Promise
    summary: fetchSummary(),       // Promise
  });
}
```
