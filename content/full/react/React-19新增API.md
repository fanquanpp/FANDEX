---
order: 103
title: 'React-19新增API'
module: react
category: 'dev-lang'
difficulty: advanced
description: 'React 19新增API详解：use、ref as prop、文档元数据、Actions。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'react/Server-Components与Client-Components'
  - react/Next.js应用路由
  - react/并发渲染与可中断更新
  - react/错误边界与Sentry集成
prerequisites:
  - react/概述与环境配置
---

## 1. use() API

```jsx
import { use } from 'react';

function UserProfile({ userPromise }) {
  const user = use(userPromise); // 读取 Promise/Context
  return <h1>{user.name}</h1>;
}
```

`use()` 可以在条件语句中调用（打破 Hook 规则），但仅限 Promise 和 Context。

## 2. ref as prop

```jsx
// React 19: ref 作为普通 prop
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// 不再需要 forwardRef
```

## 3. 文档元数据

```jsx
function BlogPost() {
  return (
    <>
      <title>文章标题</title>
      <meta name="description" content="文章描述" />
      <article>内容</article>
    </>
  );
}
```

React 自动将 `<title>` 和 `<meta>` 提升到 `<head>` 中。

## 4. Actions

```jsx
import { useActionState } from 'react';

async function submitForm(formData) {
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

function Form() {
  const [state, submitAction, isPending] = useActionState(submitForm, null);

  return (
    <form action={submitAction}>
      <input name="title" />
      <button type="submit" disabled={isPending}>
        {isPending ? '提交中...' : '提交'}
      </button>
    </form>
  );
}
```

## 5. useOptimistic

```jsx
import { useOptimistic } from 'react';

function TodoList({ todos }) {
  const [optimisticTodos, addOptimistic] = useOptimistic(todos, (state, newTodo) => [
    ...state,
    { ...newTodo, pending: true },
  ]);

  async function addTodo(title) {
    addOptimistic({ id: Date.now(), title });
    await saveTodo(title);
  }

  return (
    <ul>
      {optimisticTodos.map((todo) => (
        <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
          {todo.title}
        </li>
      ))}
    </ul>
  );
}
```

## 6. useFormStatus

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? '提交中...' : '提交'}</button>;
}
```
