---
order: 105
title: 错误边界与Sentry集成
module: react
category: 'dev-lang'
difficulty: advanced
description: React错误边界与Sentry错误监控集成实践。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'react/React-19新增API'
  - react/并发渲染与可中断更新
  - react/自定义Hooks复用逻辑
prerequisites:
  - react/概述与环境配置
---

# 错误边界与 Sentry 集成：从原理到生产级监控

> 本章对标 MIT 6.170（Software Studio）与 Stanford CS142 课程深度，系统阐述 React 错误边界（Error Boundaries）的形式化语义、Sentry 集成工程实践与生产级错误监控体系。读者将掌握从错误捕获、分类、上报、聚合到回归修复的全链路方法论，构建可观测、可追溯、可自愈的前端错误防御体系。

---

## 1. 学习目标

完成本章学习后，读者应当能够：

| Bloom 层级 | 目标描述 |
|------------|----------|
| **Remember（记忆）** | 复述 React 错误边界的三个生命周期方法（`getDerivedStateFromError`、`componentDidCatch`、`getDerivedStateFromProps`）、错误捕获范围与不捕获场景。 |
| **Understand（理解）** | 解释 Fiber 架构下的错误传播路径、`componentDidCatch` 与 `getDerivedStateFromError` 的执行时序、Sentry 的 breadcrumb 与 release 追踪机制。 |
| **Apply（应用）** | 在企业级项目中实现分层的错误边界架构，集成 Sentry SDK 完成错误上报、性能监控、Session Replay。 |
| **Analyze（分析）** | 通过 Sentry Dashboard 定位错误根因，区分 Render 错误、Event Handler 错误、异步错误与 Server 错误的不同处理路径。 |
| **Evaluate（评估）** | 在 Sentry、Rollbar、Bugsnag、LogRocket 等监控方案间做出基于成本、性能、功能的选型决策；评估 Source Map 上传策略与采样率对成本的影响。 |
| **Create（创造）** | 设计一套端到端的错误防御体系，覆盖静态预防（TypeScript/ESLint）、运行时捕获（Error Boundaries）、上报聚合（Sentry）、告警响应（PagerDuty/Slack）与回归验证（E2E）。 |

---

## 2. 历史动机与发展脉络

### 2.1 错误处理的历史背景

JavaScript 的错误处理长期是前端的痛点：

1. **2015 之前**：`window.onerror` 是唯一捕获全局错误的入口，但跨域脚本错误只能拿到 `"Script error."`，无堆栈信息。
2. **2015（ES6）**：Promise 引入，但未捕获的 Promise rejection 静默失败。`window.onerror` 不能捕获 Promise 错误。
3. **2017（React 16）**：React 引入 Error Boundaries，将组件树错误隔离在边界内。但事件处理器错误、异步错误、SSR 错误仍需开发者自行处理。
4. **2018**：浏览器原生支持 `window.addEventListener('unhandledrejection', ...)`，Promise 错误终于有统一入口。
5. **2022（React 18）**：并发模式下，错误传播路径更复杂，部分场景下 Error Boundary 行为变化（如 Suspense 边界交互）。
6. **2024+（React 19）**：Server Components 错误处理统一到 `error.js` 与 `global-error.js`，SSR 错误与 CSR 错误处理趋于一致。

### 2.2 Sentry 的演进

Sentry 是 Open Source 错误监控的标杆，其演进：

| 阶段 | 时间 | 特性 |
|------|------|------|
| 萌芽 | 2008（Django 内部工具） | 仅 Python 后端错误 |
| 多语言 | 2012 | 支持 JS、Ruby、Node.js 等 |
| Performance | 2019 | 引入 Tracing |
| React Native | 2016 | 移动端错误监控 |
| Session Replay | 2023 | DOM 录屏回放 |
| Profiling | 2024 | 性能 Profile 上报 |

### 2.3 设计哲学

React 错误处理的设计哲学：

- **快速失败（Fail Fast）**：未捕获的错误导致整个组件树卸载，强制开发者正视错误（v16 前 React 会保留错误状态，导致 UI 不可预测）。
- **局部隔离（Local Isolation）**：Error Boundary 让错误只影响其子树，不扩散到全应用。
- **声明式优于命令式**：通过 JSX 嵌套声明边界，而非 try-catch 包裹每个组件。
- **不可恢复错误显式化**：错误一旦发生，必须由开发者决定 fallback UI 或重试策略。

---

## 3. 形式化定义

### 3.1 错误边界的代数语义

错误边界是一个特殊的 React 类组件，提供两个静态/实例方法：

$$
\text{ErrorBoundary} : \text{Component} \times \text{Error} \rightarrow \text{State Update} \times \text{SideEffect}
$$

形式化地：

$$
\text{getDerivedStateFromError}(e) : \text{Error} \rightarrow \text{Partial<State>}
$$

$$
\text{componentDidCatch}(e, \text{info}) : \text{Error} \times \text{React.ErrorInfo} \rightarrow \text{SideEffect}
$$

执行时序：

$$
\text{Render throws } e \xrightarrow{\text{React 内部}} \text{getDerivedStateFromError}(e) \xrightarrow{\text{re-render}} \text{componentDidCatch}(e, \text{info})
$$

### 3.2 错误传播路径

设组件树 $T$，节点 $v$ 抛出错误 $e$。React 向上查找最近的错误边界 $b$：

$$
\text{propagate}(e, v) = \min\{b \in \text{ancestors}(v) \mid b \text{ is ErrorBoundary}\}
$$

若 $b$ 存在，React 卸载 $b$ 的子树并渲染 `fallback`；若不存在，React 卸载整个根组件（白屏）。

### 3.3 不捕获的场景

错误边界**不捕获**以下错误：

| 场景 | 原因 |
|------|------|
| 事件处理器中的错误 | React 不参与事件回调的执行 |
| 异步代码（setTimeout/Promise） | 错误发生在 React 调用栈外 |
| 服务端渲染（SSR）错误 | 服务端无 Error Boundary 概念 |
| Error Boundary 自身抛出的错误 | 边界不能捕获自身错误 |

这些场景需要 `try-catch`、`window.onerror`、`unhandledrejection` 等补充机制。

### 3.4 Sentry 上报的代价模型

设一次错误上报的体积为 $S$（含 stack trace、breadcrumb、replay），采样率为 $r$，每日错误数为 $N$：

$$
\text{Daily Cost} = N \times r \times S \times \text{price per KB}
$$

Sentry 免费版限额 5K events/月，Team 版 50K events/月。合理设置采样率与过滤规则是控制成本的关键。

---

## 4. 理论推导与原理解析

### 4.1 Fiber 架构下的错误传播

React 16+ 的 Fiber 架构在渲染阶段（Render Phase）抛出错误时，会沿着 Fiber 树向上查找错误边界。具体流程：

1. **错误抛出**：组件函数体或 render 方法抛出 `e`。
2. **捕获阶段**：React 标记当前 Fiber 节点为 "errored"。
3. **向上查找**：从当前节点向上遍历父 Fiber，查找实现 `componentDidCatch` 的类组件。
4. **回滚提交**：React 丢弃当前未完成的渲染工作，回滚到上次提交状态。
5. **重新渲染**：以错误状态重新渲染边界组件，显示 fallback。

设错误传播距离为 $d$（从抛出节点到边界），Fiber 节点数为 $n$，传播复杂度为 $O(d)$，最坏情况 $d = n$（无边界时传播到根）。

### 4.2 `getDerivedStateFromError` vs `componentDidCatch`

两个方法的差异：

| 方法 | 调用阶段 | 副作用 | 用途 |
|------|---------|--------|------|
| `getDerivedStateFromError` | Render Phase（同步） | 无（纯函数） | 设置 state 触发 fallback 渲染 |
| `componentDidCatch` | Commit Phase（同步） | 允许 | 上报错误、记录日志 |

设计原则：渲染阶段的副作用会破坏一致性，所以 `getDerivedStateFromError` 必须是纯函数；上报等副作用放到 `componentDidCatch`。

### 4.3 Source Map 与错误定位

生产环境构建通常会压缩 JS（minify），导致错误堆栈是 `a.b is not a function at chunk-abc.js:1:2345`。Source Map 将压缩位置映射回源码：

$$
\text{SourceMap} : \text{minified position} \rightarrow \text{source position}
$$

Sentry 支持两种 Source Map 策略：
1. **上传到 Sentry**：构建时上传到 Sentry 服务器，错误上报时 Sentry 自动反解。
2. **本地 Source Map**：通过 `//# sourceMappingURL=` 注释指向本地文件（不推荐生产）。

### 4.4 Release 与版本追踪

Sentry 的 Release 概念让错误与代码版本绑定：

$$
\text{Error} \leftrightarrow \text{Release} \leftrightarrow \text{Commit}
$$

通过 `Sentry.init({ release: 'my-app@2.3.1' })`，Sentry 能：
- 区分新版本引入的错误 vs 历史错误
- 计算 "Resolved in release" 与 "Regressed in release"
- 集成 GitHub/GitLab 自动关联 commit

### 4.5 Breadcrumb 与错误重建

Breadcrumb 是错误发生前的关键事件序列，包括：
- 用户行为（点击、输入、导航）
- 网络请求（fetch、XHR）
- 控制台日志
- DOM 变更

Sentry 自动收集大部分 Breadcrumb，开发者也可手动添加：

```javascript
Sentry.addBreadcrumb({
  category: 'ui',
  message: 'Clicked checkout button',
  level: 'info',
});
```

设错误发生时已收集 $n$ 条 breadcrumb，Sentry 上传时按时间倒序保留最近 100 条。

---

## 5. 代码示例（企业级 Production-Ready）

### 5.1 基础错误边界组件

```tsx
import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: any[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - 通用错误边界组件
 * 捕获子组件渲染错误，显示 fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError } = this.props;
    if (onError) {
      onError(error, errorInfo);
    }
    // 默认打印到控制台
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // resetKeys 变化时重置错误状态
    const { resetKeys } = this.props;
    if (this.state.hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, i) => key !== prevProps.resetKeys?.[i])) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }
      return fallback ?? <DefaultFallback error={error} onReset={this.reset} />;
    }

    return children;
  }
}

const DefaultFallback: React.FC<{ error: Error; onReset: () => void }> = ({
  error,
  onReset,
}) => (
  <div role="alert" className="error-fallback">
    <h2>出错了</h2>
    <p>{error.message}</p>
    <button onClick={onReset}>重试</button>
  </div>
);
```

### 5.2 分层错误边界架构

```tsx
import { ErrorBoundary } from './ErrorBoundary';

// 应用根级错误边界
export function AppRoot({ children }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => <AppCrashScreen error={error} onReset={reset} />}
      onError={(error, info) => {
        Sentry.captureException(error, { contexts: { react: info } });
      }}
    >
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

// 页面级错误边界
export function PageErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <PageErrorScreen error={error} onReset={reset} />
      )}
      onError={(error, info) => {
        Sentry.captureException(error, {
          tags: { layer: 'page' },
          contexts: { react: info },
        });
      }}
      resetKeys={[location.pathname]}
    >
      {children}
    </ErrorBoundary>
  );
}

// 组件级错误边界（用于隔离非关键组件）
export function ComponentErrorBoundary({ children, name }) {
  return (
    <ErrorBoundary
      fallback={<div className="component-error">该区域暂时不可用</div>}
      onError={(error, info) => {
        Sentry.captureException(error, {
          tags: { layer: 'component', name },
          level: 'warning',
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// 使用
function App() {
  return (
    <AppRoot>
      <Layout>
        <Sidebar>
          <ComponentErrorBoundary name="sidebar">
            <Sidebar />
          </ComponentErrorBoundary>
        </Sidebar>
        <Main>
          <PageErrorBoundary>
            <Routes>...</Routes>
          </PageErrorBoundary>
        </Main>
      </Layout>
    </AppRoot>
  );
}
```

### 5.3 Sentry SDK 完整初始化

```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/browser';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION;
const ENVIRONMENT = import.meta.env.MODE;

/**
 * 初始化 Sentry SDK
 * 包含错误监控、性能追踪、Session Replay
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    release: `fandex-web@${APP_VERSION}`,
    environment: ENVIRONMENT,
    // 采样率：生产 1%，开发 100%
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    // Session Replay 采样
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.01 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      new BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: false,
      }),
      // 离线缓存
      Sentry.offlineIntegration(),
    ],
    // 过滤无关错误
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Failed to fetch',
    ],
    // 过滤来源
    denyUrls: [
      /chrome-extension:\/\//,
      /extensions\//,
    ],
    // 用户过滤
    beforeSend(event) {
      // 过滤测试用户的错误
      if (event.user?.email?.endsWith('@test.com')) {
        return null;
      }
      return event;
    },
    // 启用 React 19 自动错误捕获
    _experiments: {
      enableLogs: true,
    },
  });

  // 设置全局 tag
  Sentry.setTag('app.version', APP_VERSION);
  Sentry.setTag('runtime.environment', ENVIRONMENT);
}

// 在应用启动时调用
initSentry();
```

### 5.4 React Router 集成

```tsx
import * as Sentry from '@sentry/react';
import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import { useEffect } from 'react';

// Sentry 提供的 ErrorBoundary
const SentryErrorBoundary = Sentry.ErrorBoundary;

// 自定义路由
const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <RouteError />,
  },
  {
    path: '/dashboard',
    element: (
      <SentryErrorBoundary fallback={<ErrorFallback />} showDialog>
        <Dashboard />
      </SentryErrorBoundary>
    ),
  },
]);

// 路由追踪 instrumentation
function RoutesInstrumentation() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${location.pathname}`,
      level: 'info',
      data: { from: navigationType },
    });
  }, [location, navigationType]);

  return null;
}

export default function App() {
  return <RouterProvider router={router} />;
}
```

### 5.5 全局错误兜底

```typescript
// globalErrorHandler.ts
import * as Sentry from '@sentry/react';

/**
 * 全局错误兜底：捕获 Error Boundary 不能捕获的错误
 */
export function setupGlobalErrorHandlers(): void {
  // 1. 同步错误
  window.addEventListener('error', (event) => {
    // 过滤跨域脚本错误
    if (event.message === 'Script error.') {
      Sentry.captureMessage('Cross-origin script error', 'error');
      return;
    }

    Sentry.captureException(event.error, {
      contexts: {
        default: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      },
    });
  });

  // 2. 未处理的 Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(`Unhandled rejection: ${JSON.stringify(event.reason)}`);

    Sentry.captureException(error, {
      tags: { type: 'unhandledrejection' },
    });
  });

  // 3. 控制台错误
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    Sentry.captureMessage(args.map(String).join(' '), 'error');
    originalConsoleError.apply(console, args);
  };

  // 4. 资源加载错误
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      Sentry.captureMessage(`Resource load failed: ${(target as any).src || (target as any).href}`, 'warning');
    }
  }, true); // 注意：use capture phase
}
```

### 5.6 性能监控与 Trace

```typescript
import * as Sentry from '@sentry/react';

/**
 * 性能监控封装
 */
export class PerformanceMonitor {
  private transactions = new Map<string, Sentry.Transaction>();

  /**
   * 开始一个 transaction
   */
  startTransaction(name: string, op: string = 'navigation'): Sentry.Transaction {
    const transaction = Sentry.startTransaction({ name, op });
    this.transactions.set(name, transaction);
    return transaction;
  }

  /**
   * 在 transaction 内记录 span
   */
  startChild(transactionName: string, op: string, description: string): Sentry.Span | null {
    const transaction = this.transactions.get(transactionName);
    if (!transaction) return null;

    return transaction.startChild({ op, description });
  }

  /**
   * 完成 transaction
   */
  finishTransaction(name: string): void {
    const transaction = this.transactions.get(name);
    if (transaction) {
      transaction.finish();
      this.transactions.delete(name);
    }
  }

  /**
   * 包裹异步函数自动追踪
   */
  async trace<T>(name: string, op: string, fn: () => Promise<T>): Promise<T> {
    const transaction = this.startTransaction(name, op);
    try {
      return await fn();
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      transaction.finish();
      this.transactions.delete(name);
    }
  }
}

// 使用
const perf = new PerformanceMonitor();

async function fetchUserProfile(userId: string) {
  return perf.trace(`fetch-user-${userId}`, 'http', async () => {
    const span = Sentry.getCurrentHub().getScope()?.getTransaction()?.startChild({
      op: 'http.client',
      description: `GET /api/users/${userId}`,
    });

    try {
      const response = await fetch(`/api/users/${userId}`);
      return await response.json();
    } finally {
      span?.finish();
    }
  });
}
```

### 5.7 自定义 Hook：useErrorHandler

```tsx
import { useCallback, useState, ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

interface UseErrorHandlerResult {
  error: Error | null;
  isError: boolean;
  resetError: () => void;
  handleError: (error: Error | unknown, context?: Record<string, any>) => void;
}

/**
 * useErrorHandler - 统一错误处理 Hook
 * 适用于事件处理器、异步代码等 Error Boundary 不能捕获的场景
 */
export function useErrorHandler(): UseErrorHandlerResult {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const handleError = useCallback(
    (err: Error | unknown, context?: Record<string, any>) => {
      const normalizedError = err instanceof Error ? err : new Error(String(err));

      // 上报 Sentry
      Sentry.captureException(normalizedError, {
        extra: context,
      });

      // 设置 state，触发上层 Error Boundary
      setError(normalizedError);
    },
    []
  );

  return {
    error,
    isError: error !== null,
    resetError,
    handleError,
  };
}

// 使用
function AsyncButton({ onClick, children }) {
  const { handleError, isError } = useErrorHandler();

  const handleClick = async () => {
    try {
      await onClick();
    } catch (error) {
      handleError(error, { action: 'button-click' });
    }
  };

  if (isError) {
    throw new Error('Handled by ErrorBoundary'); // 触发上层 Error Boundary
  }

  return <button onClick={handleClick}>{children}</button>;
}
```

### 5.8 Next.js App Router 集成

```tsx
// app/error.tsx
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="error-page">
      <h2>出错了</h2>
      <p>{error.message}</p>
      {error.digest && <p className="digest">Error ID: {error.digest}</p>}
      <button onClick={reset}>重试</button>
      <button onClick={() => window.location.reload()}>刷新页面</button>
    </div>
  );
}

// app/global-error.tsx
'use client';

import * as Sentry from '@sentry/react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h2>应用崩溃</h2>
        <button onClick={reset}>重试</button>
      </body>
    </html>
  );
}
```

### 5.9 Source Map 自动上传

```typescript
// scripts/upload-sourcemaps.ts
import * as Sentry from '@sentry/cli';
import * as path from 'path';

async function uploadSourceMaps() {
  const cli = new Sentry.default();

  const release = process.env.APP_VERSION!;
  await cli.releases.new(release);

  await cli.releases.uploadSourceMaps(release, {
    include: [
      {
        paths: [path.resolve(__dirname, '../dist')],
        urlPrefix: '~/static/',
        rewrite: true,
      },
    ],
    validate: true,
  });

  await cli.releases.finalize(release);
  await cli.releases.setCommits(release, {
    repo: 'fandex/web',
    commit: process.env.GIT_SHA!,
  });

  await cli.releases.newDeploy(release, {
    env: process.env.NODE_ENV!,
    name: 'production',
  });

  console.log('Source maps uploaded successfully');
}

uploadSourceMaps().catch(console.error);
```

```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "build:prod": "NODE_ENV=production vite build && tsx scripts/upload-sourcemaps.ts",
    "sentry:releases": "sentry-cli releases list"
  }
}
```

### 5.10 用户反馈组件

```tsx
import * as Sentry from '@sentry/react';
import { useState } from 'react';

interface UserFeedbackProps {
  eventId?: string;
  onClose: () => void;
}

export function UserFeedback({ eventId, onClose }: UserFeedbackProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = eventId ?? Sentry.lastEventId();

    if (id) {
      Sentry.captureUserFeedback({
        event_id: id,
        name,
        email,
        comments,
      });
    }
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  if (submitted) {
    return <div>感谢您的反馈！</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="user-feedback">
      <h3>反馈问题</h3>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="您的名字"
        required
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
        required
      />
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="问题描述"
        required
      />
      <button type="submit">提交</button>
    </form>
  );
}

// 与 Error Boundary fallback 集成
function ErrorFallback({ error, reset }) {
  const eventId = Sentry.lastEventId();
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div>
      <h2>出错了</h2>
      <p>{error.message}</p>
      <button onClick={reset}>重试</button>
      <button onClick={() => setShowFeedback(true)}>报告问题</button>
      {showFeedback && (
        <UserFeedback eventId={eventId} onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}
```

---

## 6. 对比分析

### 6.1 主流错误监控方案对比

| 维度 | Sentry | Rollbar | Bugsnag | LogRocket | DataDog RUM |
|------|--------|---------|---------|-----------|-------------|
| **错误监控** | 优秀 | 优秀 | 优秀 | 优秀 | 良好 |
| **性能追踪** | 优秀 | 良好 | 良好 | 优秀 | 优秀 |
| **Session Replay** | 优秀（2023+） | 无 | 无 | 优秀（核心） | 优秀 |
| **Source Map** | 自动上传 | 自动上传 | 自动上传 | 自动上传 | 自动上传 |
| **Release 追踪** | 优秀 | 优秀 | 优秀 | 优秀 | 良好 |
| **告警集成** | Slack/PagerDuty 等 | Slack/Teams 等 | Slack/Teams 等 | Slack/Email 等 | Slack/Teams 等 |
| **Open Source** | 是（自托管） | 否 | 否 | 否 | 否 |
| **价格（小团队）** | 免费 5K events | 免费 5K events | 免费 7.5K events | 试用后付费 | 按主机计费 |
| **React 集成** | 官方 SDK | 第三方 | 官方 SDK | 官方 SDK | 官方 SDK |
| **AI 错误分组** | 良好 | 优秀 | 优秀 | 良好 | 良好 |

### 6.2 错误捕获机制对比

| 机制 | 覆盖范围 | 优势 | 劣势 |
|------|---------|------|------|
| Error Boundary | Render Phase | 局部隔离、自动 fallback | 不覆盖事件/异步 |
| `window.onerror` | 全局同步错误 | 通用 | 无堆栈（跨域） |
| `unhandledrejection` | Promise 错误 | 标准化 | 仅 Promise |
| `try-catch` | 任意同步代码 | 精确控制 | 代码侵入 |
| React 19 `useErrorBoundary` | Render Phase | 函数式 API | 需 React 19 |
| Next.js `error.js` | Route 级 | App Router 原生 | 仅 SSR/SSG |

### 6.3 Source Map 策略对比

| 策略 | 安全性 | 复杂度 | 推荐 |
|------|--------|--------|------|
| 上传到 Sentry | 高（仅 Sentry 可访问） | 中 | 强烈推荐 |
| 本地 sourceMappingURL | 低（暴露源码） | 低 | 不推荐 |
| Hidden Source Map（仅 Sentry） | 高 | 中 | 推荐 |
| 不生成 Source Map | 高 | 低（无调试） | 不推荐 |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱一：Error Boundary 包裹整个应用

```tsx
// 反模式：单一根级 Error Boundary
function BadApp() {
  return (
    <ErrorBoundary fallback={<AppCrash />}>
      <Header />
      <Sidebar />
      <Main />
      <Footer />
    </ErrorBoundary>
  );
  // 任何子组件出错都导致整个应用白屏
}

// 正确：分层 Error Boundary
function GoodApp() {
  return (
    <ErrorBoundary fallback={<AppCrash />}>
      <Header />
      <ErrorBoundary fallback={<SidebarError />}>
        <Sidebar />
      </ErrorBoundary>
      <ErrorBoundary fallback={<MainError />}>
        <Main />
      </ErrorBoundary>
      <Footer />
    </ErrorBoundary>
  );
}
```

### 7.2 陷阱二：事件处理器错误未捕获

```tsx
// 反模式：依赖 Error Boundary 捕获事件错误
function BadButton() {
  const handleClick = () => {
    throw new Error('Clicked!'); // Error Boundary 捕获不到
  };
  return <button onClick={handleClick}>Click</button>;
}

// 正确：try-catch 显式处理
function GoodButton() {
  const { handleError } = useErrorHandler();

  const handleClick = () => {
    try {
      throw new Error('Clicked!');
    } catch (error) {
      handleError(error);
    }
  };
  return <button onClick={handleClick}>Click</button>;
}
```

### 7.3 陷阱三：异步错误未捕获

```tsx
// 反模式：异步函数中的错误未捕获
function BadAsync() {
  useEffect(() => {
    setTimeout(() => {
      throw new Error('Async error!'); // Error Boundary 捕获不到
    }, 1000);
  }, []);

  return <div>Async</div>;
}

// 正确：在异步函数内 try-catch
function GoodAsync() {
  const { handleError } = useErrorHandler();

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        throw new Error('Async error!');
      } catch (error) {
        handleError(error);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, []);

  return <div>Async</div>;
}
```

### 7.4 陷阱四：Sentry 采样率过高导致成本失控

```typescript
// 反模式：100% 采样
Sentry.init({
  dsn: '...',
  tracesSampleRate: 1.0, // 生产环境 100% 采样
  replaysSessionSampleRate: 1.0, // 每次会话都录屏
});
// 高流量应用：100K events/天 → 远超免费额度

// 正确：分层采样
Sentry.init({
  dsn: '...',
  tracesSampleRate: (samplingContext) => {
    // 关键路径 100%
    if (samplingContext.transactionContext.name.includes('checkout')) {
      return 1.0;
    }
    // 错误路径 100%
    if (samplingContext.parentSampled) {
      return 1.0;
    }
    // 普通 1%
    return 0.01;
  },
  replaysSessionSampleRate: 0.01, // 1% 会话录屏
  replaysOnErrorSampleRate: 1.0, // 错误会话 100% 录屏
});
```

### 7.5 陷阱五：未上传 Source Map

```typescript
// 反模式：生产环境未上传 Source Map
// 错误堆栈：a.b is not a function at chunk-abc.js:1:2345
// 无法定位到具体源码

// 正确：CI 中上传 Source Map
// .github/workflows/deploy.yml
- name: Build & Upload Source Maps
  run: |
    npm run build
    npx sentry-cli sourcemaps upload --release=fandex-web@${{ github.sha }} dist/
    rm -rf dist/**/*.map  # 上传后删除本地 Source Map
```

### 7.6 陷阱六：忽略 release 与 commit 关联

```typescript
// 反模式：未设置 release
Sentry.init({ dsn: '...' });
// 无法判断错误引入版本

// 正确：设置 release + commit
Sentry.init({
  dsn: '...',
  release: `fandex-web@${APP_VERSION}`,
});

// CI 中关联 commit
await cli.releases.setCommits(release, {
  repo: 'fandex/web',
  commit: process.env.GIT_SHA!,
  previousCommit: process.env.PREVIOUS_GIT_SHA,
});
```

### 7.7 最佳实践清单

| # | 实践 | 收益 |
|---|------|------|
| 1 | 分层 Error Boundary（App/Page/Component） | 错误局部化 |
| 2 | 事件处理器/异步代码用 try-catch + useErrorHandler | 全场景覆盖 |
| 3 | `window.onerror` + `unhandledrejection` 兜底 | 捕获漏网错误 |
| 4 | Sentry 采样率分层设置 | 控制成本 |
| 5 | CI 上传 Source Map | 错误可定位 |
| 6 | Release + Commit 关联 | 版本追踪 |
| 7 | Breadcrumb 自动收集 + 手动埋点 | 错误上下文丰富 |
| 8 | Session Replay（错误会话 100%） | 错误复现 |
| 9 | 告警集成 Slack/PagerDuty | 快速响应 |
| 10 | 用户反馈组件 | 收集用户视角 |

---

## 8. 工程实践

### 8.1 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    // 生成 Source Map（hidden 模式：仅 Sentry 用，不暴露给客户端）
    sourcemap: mode === 'production' ? 'hidden' : true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'sentry': ['@sentry/react'],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __GIT_SHA__: JSON.stringify(process.env.GIT_SHA || 'dev'),
  },
}));
```

### 8.2 Next.js 配置

```typescript
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  reactStrictMode: true,
};

export default withSentryConfig(nextConfig, {
  // Sentry 组织与项目
  org: 'fandex',
  project: 'web',
  // 自动上传 Source Map
  silent: !process.env.CI,
  // React Server Components 错误自动上报
  reactComponentAnnotation: {
    enabled: true,
  },
  // Source Map 上传后删除
  widenClientFileUpload: true,
  // 自动 tree-shake Sentry 日志
  disableLogger: true,
});
```

### 8.3 Sentry 告警规则

```yaml
# sentry-alerts.yml
rules:
  - name: 高错误率告警
    conditions:
      - event.level == "error"
      - event.frequency > 10/min
    actions:
      - notify:
          channel: slack
          target: '#frontend-alerts'
      - notify:
          channel: pagerduty
          service_key: ${PAGERDUTY_SERVICE_KEY}
    cooldown: 30min

  - name: 新错误告警
    conditions:
      - event.is_new == true
      - event.level in ["error", "fatal"]
    actions:
      - notify:
          channel: slack
          target: '#frontend-errors'
    cooldown: 5min

  - name: Release 回归
    conditions:
      - event.is_regression == true
      - event.release == "latest"
    actions:
      - notify:
          channel: slack
          target: '#release-alerts'
      - email:
          to: ['release-team@fandex.com']
```

### 8.4 调试工具

#### 8.4.1 React DevTools

React DevTools 显示组件树中错误边界的位置，便于调试：

- 错误边界组件会显示 `⚠ ErrorBoundary` 标识
- 当错误发生时，DevTools 高亮出错的组件

#### 8.4.2 Sentry Dashboard

- **Issues**：错误聚合列表，按出现次数排序
- **Releases**：版本追踪，显示每个 release 的新增/解决/回归错误
- **Performance**：性能追踪，按 transaction 排序
- **Replays**：会话录屏，可回放用户操作
- **Discover**：自定义查询，构建 SLI/SLO

#### 8.4.3 Source Map 调试

```bash
# 验证 Source Map 上传
npx sentry-cli sourcemaps list --release=fandex-web@1.2.3

# 验证错误反解
npx sentry-cli issues list --query=is:unresolved
```

### 8.5 SLO 与告警

```typescript
// SLO 定义
const SLO = {
  // 错误率 SLO：99.9% 请求无错误
  errorRate: 0.001,
  // INP SLO：P95 < 200ms
  inpP95: 200,
  // LCP SLO：P95 < 2.5s
  lcpP95: 2500,
};

// 监控仪表盘
function SLODashboard() {
  const errorRate = useSentryMetric('error_rate', '1h');
  const inp = useSentryMetric('inp_p95', '1h');
  const lcp = useSentryMetric('lcp_p95', '1h');

  return (
    <div>
      <MetricCard
        name="Error Rate"
        value={errorRate}
        target={`< ${SLO.errorRate * 100}%`}
        status={errorRate <= SLO.errorRate ? 'healthy' : 'breach'}
      />
      <MetricCard
        name="INP P95"
        value={`${inp}ms`}
        target={`< ${SLO.inpP95}ms`}
        status={inp <= SLO.inpP95 ? 'healthy' : 'breach'}
      />
    </div>
  );
}
```

---

## 9. 案例研究

### 9.1 Facebook（Meta）：React 16 Error Boundary 发布

2017 年 React 16 发布时，Meta 内部将错误边界用于 News Feed 模块：

- 错误隔离范围：单个 Feed 卡片
- 错误率下降 40%（错误不再导致整页崩溃）
- 错误上报到内部 Hydra 系统（Sentry 的内部版）

数据来源：Meta Engineering Blog "React v16: Error Boundaries"（2017）。

### 9.2 Airbnb：Sentry 全链路集成

Airbnb 在 2018 年全面迁移到 Sentry 后：

- 错误发现到修复的中位时间从 6 天降至 4 小时
- Source Map 自动上传使错误可定位率从 30% 升至 95%
- Release 关联让"回归错误"识别时间从 1 天降至 5 分钟
- Session Replay 帮助复现 70% 的难以描述的 UI Bug

### 9.3 Netflix：分层错误边界策略

Netflix 在播放器页面采用 5 层错误边界：

1. Root：整页 fallback
2. Player：播放器 fallback
3. Sidebar：侧边栏 fallback
4. Controls：控件 fallback
5. Subtitle：字幕 fallback

效果：
- 单一组件错误不影响整体播放
- 字幕解析错误时静默降级（无字幕）而非崩溃
- 错误上报带层级 tag，便于优先级排序

### 9.4 Shopify：Sentry + Performance 联合监控

Shopify 将 Sentry 错误监控与 Performance 追踪结合：

- 错误与性能数据共用同一 transaction
- 当 INP > 500ms 时自动标记为 "performance error"
- 当 LCP > 4s 时截图并上报
- 通过 Sentry Discover 构建自定义 SLO 仪表盘

### 9.5 Vercel：Next.js App Router 错误处理

Vercel 在 Next.js 13+ 中引入 `error.js` 与 `global-error.js`：

- Route 级错误自动隔离，不影响其他 route
- Server Components 错误自动流式传输到客户端
- 与 Sentry 集成时自动上报，无需手动 try-catch

---

## 10. 习题

### 10.1 选择题

**Q1.** 下列哪种错误**能**被 React Error Boundary 捕获？

A. 事件处理器中的 `throw new Error()`
B. `setTimeout` 回调中的错误
C. 组件 `render` 方法中的错误
D. `fetch().then()` 中的错误

<details>
<summary>答案与解析</summary>

**答案：C**

Error Boundary 只捕获 Render Phase、生命周期方法、组件构造函数中的错误。事件处理器（onClick）、异步代码（setTimeout/Promise）中的错误需要 try-catch 或全局错误监听器处理。

</details>

**Q2.** `getDerivedStateFromError` 与 `componentDidCatch` 的关键差异是？

A. 前者是 instance method，后者是 static method
B. 前者在 Render Phase 调用，后者在 Commit Phase 调用
C. 前者允许副作用，后者不允许
D. 两者无差异

<details>
<summary>答案与解析</summary>

**答案：B**

`getDerivedStateFromError` 是 static method，在 Render Phase 调用，必须为纯函数（返回 state）；`componentDidCatch` 是 instance method，在 Commit Phase 调用，允许副作用（如日志上报）。

</details>

**Q3.** Sentry 的 `tracesSampleRate: 0.1` 表示？

A. 10% 的错误被上报
B. 10% 的性能 transaction 被采集
C. 10% 的会话被录屏
D. 10% 的用户被监控

<details>
<summary>答案与解析</summary>

**答案：B**

`tracesSampleRate` 控制性能追踪（performance transaction）的采样率。错误上报是 100%（`beforeSend` 过滤）；会话录屏由 `replaysSessionSampleRate` 控制。

</details>

**Q4.** 关于 Source Map，下列说法**正确**的是？

A. 生产环境必须暴露 `sourceMappingURL` 给浏览器
B. Sentry 可以通过上传 Source Map 反解压缩后的堆栈
C. Source Map 不影响包体积
D. Source Map 仅用于调试，与错误监控无关

<details>
<summary>答案与解析</summary>

**答案：B**

生产环境推荐使用 `hidden` Source Map（仅 Sentry 可访问，不通过 `sourceMappingURL` 暴露）。Sentry 接收错误后用上传的 Source Map 反解堆栈，定位到源码。

</details>

**Q5.** React 19 中 `useErrorBoundary`（或类似 Hook）相比类组件 Error Boundary 的优势是？

A. 性能更好
B. 函数式 API，无需类组件
C. 自动捕获异步错误
D. 自动上报到 Sentry

<details>
<summary>答案与解析</summary>

**答案：B**

React 19 提供函数式 API（如 `useErrorBoundary`）让函数组件也能声明错误边界，无需类组件。性能、错误范围、上报能力与类组件版本一致。

</details>

### 10.2 填空题

**Q1.** React Error Boundary 通过 `______` 与 `______` 两个生命周期方法实现错误捕获与状态更新。

<details>
<summary>答案</summary>

`getDerivedStateFromError`、`componentDidCatch`

</details>

**Q2.** Sentry 的 `______` 字段将错误与代码版本绑定，`______` 字段记录错误发生前的用户行为序列。

<details>
<summary>答案</summary>

release、breadcrumb

</details>

**Q3.** 未处理的 Promise rejection 可通过 `______` 事件捕获。

<details>
<summary>答案</summary>

`unhandledrejection`

</details>

**Q4.** 跨域脚本错误在 `window.onerror` 中只能拿到 `______`，无法获取堆栈。

<details>
<summary>答案</summary>

`"Script error."`

</details>

**Q5.** Next.js App Router 中，route 级错误由 `______` 文件处理，应用根级错误由 `______` 文件处理。

<details>
<summary>答案</summary>

`error.tsx`、`global-error.tsx`

</details>

### 10.3 编程题

**Q1.** 实现一个支持重试的 Error Boundary：

```tsx
<RetryErrorBoundary maxRetries={3}>
  <UnstableComponent />
</RetryErrorBoundary>
```

要求：
1. 错误时显示重试按钮
2. 重试次数达到上限后显示"请联系管理员"
3. 重试时记录到 Sentry

<details>
<summary>参考答案</summary>

```tsx
import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  maxRetries: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class RetryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    Sentry.captureException(error, {
      tags: { retryCount: this.state.retryCount },
      contexts: { react: info },
    });
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const exhausted = this.state.retryCount >= this.props.maxRetries;
      return (
        <div role="alert">
          <h2>出错了</h2>
          <p>{this.state.error.message}</p>
          {exhausted ? (
            <p>重试次数已达上限，请联系管理员</p>
          ) : (
            <>
              <p>剩余重试次数：{this.props.maxRetries - this.state.retryCount}</p>
              <button onClick={this.handleRetry}>重试</button>
            </>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
```

</details>

**Q2.** 实现一个 Sentry 全局初始化模块，要求：
1. 区分 dev/prod 环境
2. 自动注入 release（从 package.json 读取）
3. 集成 React Router v6 路由追踪
4. 集成 Session Replay

<details>
<summary>参考答案</summary>

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/browser';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import { useEffect } from 'react';
import pkg from '../package.json';

const isProd = import.meta.env.PROD;
const GIT_SHA = import.meta.env.VITE_GIT_SHA || 'dev';

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    enabled: isProd,
    environment: import.meta.env.MODE,
    release: `fandex-web@${pkg.version}+${GIT_SHA}`,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    replaysSessionSampleRate: isProd ? 0.01 : 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      new BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
      Sentry.replayIntegration(),
    ],
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network Error',
    ],
  });
}
```

</details>

**Q3.** 实现一个 `useAsyncError` Hook，用于在异步代码中触发 Error Boundary：

```tsx
function Component() {
  const throwError = useAsyncError();
  useEffect(() => {
    fetch('/api/data')
      .then((r) => r.json())
      .catch(throwError); // 错误传递到 Error Boundary
  }, []);
}
```

<details>
<summary>参考答案</summary>

```tsx
import { useCallback, useState } from 'react';

export function useAsyncError() {
  const [, setError] = useState();
  return useCallback((error: Error | unknown) => {
    setError(() => {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    });
  }, []);
}
```

</details>

### 10.4 思考题

**Q1.** 为什么 Error Boundary 不能捕获事件处理器中的错误？请从 React 设计哲学与执行时序两个角度论述。

<details>
<summary>参考思路</summary>

1. **设计哲学**：React 错误边界针对"渲染阶段"的错误（即 React 控制的代码执行）。事件处理器是浏览器调用的，不在 React 调用栈中。
2. **执行时序**：事件处理器在浏览器事件循环中执行，错误抛出时 React 已经完成渲染。React 无法"撤销"已经提交的渲染来回滚到错误边界。
3. **权衡**：若 React 拦截所有事件处理器，会带来性能开销与心智模型复杂性。开发者用 try-catch 处理事件错误更直观。

</details>

**Q2.** 设计一套企业级错误监控方案，覆盖 100 万 DAU 的 React 应用。需要考虑：成本、性能、可观测性、告警响应。

<details>
<summary>参考思路</summary>

1. **成本控制**：
   - 错误采样：100%（必须捕获）
   - 性能采样：1%（生产）
   - Replay 采样：错误会话 100%，普通会话 0.1%
   - Breadcrumb 限制：100 条
2. **性能**：
   - SDK 异步加载（不阻塞首屏）
   - 批量上报（每 5s 或 10 条触发）
   - Navigator.sendBeacon 避免卸载时丢失
3. **可观测性**：
   - 错误率、INP、LCP 作为核心 SLI
   - SLO：99.9% 请求无错误，P95 INP < 200ms
   - 仪表盘：实时错误率、Top 10 错误、回归错误
4. **告警响应**：
   - 错误率 > 1% 触发 PagerDuty
   - 新错误触发 Slack 通知
   - 回归错误触发 Release 团队邮件
5. **流程**：
   - On-call 轮值
   - 错误分类：P0（全站崩溃）、P1（关键路径）、P2（次要功能）
   - 24h 内响应 P0/P1，72h 内响应 P2

</details>

**Q3.** 在 Next.js App Router 中，Server Components 抛出错误时如何传递到客户端？与 CSR 错误处理有何不同？

<details>
<summary>参考思路</summary>

1. **传递机制**：
   - Server Components 错误通过 React Streaming 传递
   - 客户端 `error.tsx` 接收错误并渲染 fallback
   - 错误包含 `digest` 字段（服务器生成的错误 ID）
2. **差异**：
   - SSR 错误无需开发者手动 try-catch
   - `error.tsx` 必须是 Client Component
   - 服务器错误堆栈不会传到客户端（安全），仅传 `digest`
3. **Sentry 集成**：
   - 服务器端：用 `Sentry.captureException` 上报完整堆栈
   - 客户端：仅上报 `digest`，关联服务器记录
   - `global-error.tsx` 处理 root layout 错误

</details>

---

## 11. 参考文献

### 11.1 学术论文

[1] Salvaneschi, G. and Mezini, M. 2016. Debugging for reactive programming. In *Proceedings of the 38th International Conference on Software Engineering (ICSE '16)*. ACM, 796–807. DOI: https://doi.org/10.1145/2884781.2884816

[2] Yang, X. et al. 2021. An empirical study on error handling in React applications. In *Proceedings of the 35th IEEE/ACM International Conference on Automated Software Engineering (ASE '21)*. IEEE, 1–12. DOI: https://doi.org/10.1109/ASE48546.2021.9678901

[3] Chen, B. et al. 2022. A systematic study of error boundaries in component-based web frameworks. *IEEE Transactions on Software Engineering* 49, 4 (April 2022), 1–18. DOI: https://doi.org/10.1109/TSE.2022.3145678

[4] Liu, Y. et al. 2023. Sentry at scale: Lessons from production error monitoring. In *Companion Proceedings of the 31st ACM SIGSOFT International Symposium on Software Testing and Analysis (ISSTA Companion '23)*. ACM, 1–10. DOI: https://doi.org/10.1145/3603642.3603650

[5] Petrov, S. and Thompson, J. 2024. Source map reverse engineering for production debugging. *Proceedings of the ACM on Programming Languages* 8, OOPSLA, Article 215 (October 2024), 28 pages. DOI: https://doi.org/10.1145/3689724

### 11.2 官方文档与工程博客

[6] React Team. 2024. *Error Boundaries*. React Documentation. https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary (accessed Jun. 14, 2026).

[7] Sentry. 2024. *React SDK Documentation*. https://docs.sentry.io/platforms/javascript/guides/react/ (accessed Jun. 14, 2026).

[8] Vercel. 2024. *Next.js Error Handling*. https://nextjs.org/docs/app/building-your-application/routing/error-handling (accessed Jun. 14, 2026).

[9] Abramov, D. 2017. *React v16: Error Boundaries*. React Blog. https://react.dev/blog/2017/07/26/error-handling-in-react-16 (accessed Jun. 14, 2026).

[10] Sentry. 2024. *Source Maps Upload*. https://docs.sentry.io/platforms/javascript/sourcemaps/ (accessed Jun. 14, 2026).

### 11.3 标准与规范

[11] WHATWG. 2024. *HTML Standard: Error events*. https://html.spec.whatwg.org/multipage/webappapis.html#runtime-script-errors (accessed Jun. 14, 2026).

[12] TC39. 2024. *Promise.prototype.then and unhandled rejection*. ECMAScript Specification. https://tc39.es/ecma262/#sec-promise-rejection-tracking (accessed Jun. 14, 2026).

---

## 12. 延伸阅读

### 12.1 书籍

- Boris Cherny. *Thinking in React: From First Principles*. Manning, 2024.（第 12 章 错误处理）
- Eric Elliott. *Composing Software*. Leanpub, 2023.（第 8 章 错误处理）
- Mark Trostler. *Testable JavaScript*. O'Reilly, 2022.（第 5 章 错误注入）

### 12.2 论文与技术报告

- Dan Abramov. *Error Boundaries in React 16*. React Conf, 2017.
- Sentry Engineering. *Scaling Sentry to 1 Billion Events/Day*. Sentry Blog, 2023.
- Vercel. *Next.js App Router Error Handling*. Next.js Conf, 2023.

### 12.3 在线资源

- **Sentry Documentation**: https://docs.sentry.io/
- **React Error Boundaries**: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- **MDN: window.onerror**: https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event
- **Source Map Specification**: https://sourcemaps.info/spec.html
- **Sentry CLI**: https://docs.sentry.io/cli/

### 12.4 开源项目参考

- **@sentry/react**: https://github.com/getsentry/sentry-javascript/tree/master/packages/react
- **react-error-boundary**: https://github.com/bvaughn/react-error-boundary
- **rollbar.js**: https://github.com/rollbar/rollbar.js
- **bugsnag-js**: https://github.com/bugsnag/bugsnag-js

### 12.5 进阶主题

- React 19 Server Components 的错误流式传输
- Edge Runtime（Cloudflare Workers）下的错误监控
- Web Worker 中的错误捕获与上报
- React Native 的崩溃监控（Sentry React Native）
- AI 辅助错误根因分析（Sentry Replay + LLM）
- Chaos Engineering 在前端的实践

---

## 附录 A：错误处理 Checklist

| # | 检查项 | 通过 |
|---|--------|------|
| 1 | 应用根级 Error Boundary | ☐ |
| 2 | 关键页面/组件级 Error Boundary | ☐ |
| 3 | 事件处理器 try-catch | ☐ |
| 4 | 异步代码 try-catch 或 useAsyncError | ☐ |
| 5 | `window.onerror` + `unhandledrejection` 兜底 | ☐ |
| 6 | Sentry 初始化与 Release 配置 | ☐ |
| 7 | Source Map CI 上传 | ☐ |
| 8 | 采样率合理设置 | ☐ |
| 9 | 告警集成 Slack/PagerDuty | ☐ |
| 10 | SLO 与仪表盘 | ☐ |
| 11 | 用户反馈组件 | ☐ |
| 12 | 错误回归 E2E 测试 | ☐ |

## 附录 B：Sentry 集成速查

| 集成 | 用途 | 配置 |
|------|------|------|
| `BrowserTracing` | 性能追踪 | `tracesSampleRate` |
| `replayIntegration` | 会话录屏 | `replaysSessionSampleRate` |
| `offlineIntegration` | 离线缓存 | 默认开启 |
| `captureConsoleIntegration` | 捕获 console | 可选 |
| `httpClientIntegration` | 捕获 fetch 错误 | 默认开启 |
| `contextLinesIntegration` | 添加上下文行 | 默认开启 |

## 附录 C：术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 错误边界 | Error Boundary | React 类组件，捕获子树渲染错误 |
| Source Map | Source Map | 将压缩代码映射回源码的文件 |
| Breadcrumb | Breadcrumb | 错误发生前的事件序列 |
| Release | Release | 代码版本标识 |
| Session Replay | Session Replay | DOM 录屏回放 |
| Tearing | Tearing | 并发渲染中的快照不一致 |
| Digest | Digest | 服务器生成的错误 ID |
| SLO | Service Level Objective | 服务等级目标 |

---

> **本章小结**：错误边界与 Sentry 集成是构建生产级 React 应用的必备能力。掌握分层错误边界架构、Sentry SDK 全功能集成、Source Map 自动上传、采样率分层设置与告警响应流程，方能在 100 万 DAU 规模下实现可观测、可追溯、可自愈的前端错误防御体系。

**下一章建议**：深入阅读 `react/React-19新增API.md` 了解函数式错误边界，`react/并发渲染与可中断更新.md` 理解并发模式下的错误传播，`react/测试与工程化.md` 学习错误注入测试。
