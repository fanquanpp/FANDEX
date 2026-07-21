# ErrorBoundary + Suspense API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## ErrorBoundary 类组件

**React.Component 错误边界**
`class <Boundary> extends React.Component<<Props>, <State>>`
```tsx
import { Component, ReactNode, ReactElement } from 'react';

type Props = { children: ReactNode; fallback?: ReactElement };
type State = { hasError: boolean; error: Error | null };

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <h1>出错了</h1>;
    }
    return this.props.children;
  }
}
```

---

## 错误边界生命周期

**getDerivedStateFromError 渲染阶段**
`static getDerivedStateFromError(<error>): <state>`
```tsx
static getDerivedStateFromError(error: Error): State {
  return { hasError: true, error };
}
```

**componentDidCatch 提交阶段**
`componentDidCatch(<error>, <info>)`
```tsx
componentDidCatch(error: Error, info: { componentStack: string | null }) {
  Sentry.captureException(error, { extra: info });
}
```

---

## 错误边界使用

**包裹组件**
`<ErrorBoundary fallback={<node>}>...</ErrorBoundary>`
```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <App />
</ErrorBoundary>
```

**带 fallback render**
```tsx
type Props = {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
};

class Boundary extends Component<Props, State> {
  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}
```

---

## Component 类类型

**Component 类型签名**
`class <C> extends React.Component<<Props>, [<State>]>`
```tsx
class Counter extends React.Component<{ initial: number }, { count: number }> {
  state = { count: this.props.initial };
  render() {
    return <button onClick={() => this.setState({ count: this.state.count + 1 })}>
      {this.state.count}
    </button>;
  }
}
```

**PureComponent 浅比较**
`class <C> extends React.PureComponent<<Props>, [<State>]>`
```tsx
class Row extends React.PureComponent<{ id: string; name: string }> {
  render() {
    return <div>{this.props.name}</div>;
  }
}
```

**生命周期方法签名**
```tsx
componentDidMount(): void
componentDidUpdate(prevProps: Props, prevState: State): void
componentWillUnmount(): void
shouldComponentUpdate(nextProps: Props, nextState: State): boolean
getSnapshotBeforeUpdate(prevProps: Props, prevState: State): Snapshot | null
```

---

## Suspense 悬挂组件

**Suspense 基础**
`<Suspense fallback={<node>}>...</Suspense>`
```tsx
import { Suspense } from 'react';

<Suspense fallback={<Spinner />}>
  <LazyComponent />
</Suspense>
```

**嵌套 Suspense**
```tsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<ListSkeleton />}>
    <AsyncList />
  </Suspense>
  <Suspense fallback={<CommentsSkeleton />}>
    <AsyncComments />
  </Suspense>
</Suspense>
```

**Suspense + use(promise)**
```tsx
import { Suspense, use } from 'react';

function User({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <h1>{user.name}</h1>;
}

function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <User userPromise={fetchUser()} />
    </Suspense>
  );
}
```

---

## React.lazy 懒加载

**React.lazy**
`const <Component> = React.lazy(() => import('<path>'));`
```tsx
import { lazy, Suspense } from 'react';

const Settings = lazy(() => import('./Settings'));

<Suspense fallback={<Spinner />}>
  <Settings />
</Suspense>
```

**lazy props 类型**
```tsx
type Props = { userId: string };
const User = lazy(() => import('./User')) as React.ComponentType<Props>;
```

---

## SuspenseList (实验性)

**SuspenseList 配置**
```tsx
import { SuspenseList } from 'react';

<SuspenseList revealOrder="forwards" tail="collapsed">
  <Suspense fallback={<Spinner />}><Item1 /></Suspense>
  <Suspense fallback={<Spinner />}><Item2 /></Suspense>
</SuspenseList>
```

---

## 边界组件组合

**ErrorBoundary + Suspense**
```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<Spinner />}>
    <AsyncData />
  </Suspense>
</ErrorBoundary>
```

---

## ErrorBoundary 上下文

**unstable_handleError 旧 API**
```tsx
// React 16+ 已使用 getDerivedStateFromError
static getDerivedStateFromError(error: Error) {
  return { hasError: true };
}
```

---

## 边界边界捕获限制

**捕获范围**
- 渲染期间错误 ✓
- 生命周期错误 ✓
- 子组件树错误 ✓
- 事件处理器错误 ✗
- 异步代码错误 ✗
- 懒加载错误 ✓

**事件错误处理**
```tsx
// 事件处理器错误需 try/catch
const onClick = async () => {
  try {
    await api.fetch();
  } catch (err) {
    setError(err);
  }
};
```
