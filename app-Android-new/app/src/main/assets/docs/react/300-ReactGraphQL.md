---
order: 300
title: React 与 GraphQL
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 接入 GraphQL：查询语言最小集、fetch 裸调与 Apollo Client 完整接入、useQuery/useMutation 与缓存更新、分页策略、与 REST+TanStack Query 的选型对比。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/280-ReactWebAssembly'
  - 'react/290-ReactWebSocket'
  - 'react/310-ReactMicroFrontend'
  - 'react/320-ReactAccessibility'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

GraphQL 是一种**接口查询语言**：客户端用一段声明式"查询文档"精确描述要哪些数据，服务端按描述返回同构 JSON——字段要多有多、要少有少，一次请求带齐关联数据。类比自助餐（GraphQL）与套餐（REST 固定端点）：前者按需取、不会剩菜（过度获取），但餐厅要先维护菜单（schema）。React 侧的本质认知：**GraphQL 只是一个 HTTP 请求体里的字符串**，任何 fetch 都能发；缓存、重取、状态管理才需要 Apollo Client 这类库。

## 2. 查询语言最小集

```graphql
# 查询：按 id 取用户，只要需要的字段（name、orders 只取 title）
query GetUser($id: ID!) {
  user(id: $id) {
    name
    orders(first: 5) {
      title
      total
    }
  }
}

# 变更：带变量的写操作
mutation AddItem($productId: ID!) {
  addToCart(productId: $productId) {
    count # 返回修改后的购物车数量
  }
}
```

要点：`query` 只读、`mutation` 写；`$id` 是变量占位符（`!` 表示非空）；响应的 JSON 结构与查询文档**逐字对应**，见文档即知返回形状。

## 3. 裸调用：它只是一个 POST

不引入任何库，理解协议本质：

```tsx
import { useEffect, useState } from 'react';

const QUERY = `
  query GetUser($id: ID!) {
    user(id: $id) { name orders(first: 5) { title } }
  }
`;

function UserCard({ id }: { id: string }) {
  const [user, setUser] = useState<{ name: string; orders: { title: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { id } }),
    })
      .then((r) => r.json())
      .then((body) => {
        // GraphQL 的特殊性：HTTP 200 也可能携带业务错误
        if (body.errors) throw new Error(body.errors[0].message);
        setUser(body.data.user);
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (error) return <p role="alert">{error}</p>;
  if (!user) return <p>加载中...</p>;
  return <p>{user.name} 的订单：{user.orders.map((o) => o.title).join('、')}</p>;
}
```

预期渲染行为：一次 POST 拿到用户与订单（不像 REST 需要先取用户再取订单两个请求）；部分字段失败时 `errors` 数组有值而 `data` 可能仍是部分数据。裸写要自己处理缓存与竞态，所以下面的库接管了这些。

## 4. Apollo Client：缓存层才是重点

Apollo Client 的价值不在"发请求"，而在**归一化缓存**：所有对象按 `__typename:id`（如 `User:1`）扁平存入缓存，多个查询引用同一对象时共享一份数据，一处更新处处同步。

```bash
npm i @apollo/client graphql
```

```tsx
// index.tsx
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache(), // 归一化缓存
});

createRoot(el).render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
);
```

```tsx
// UserProfile.tsx
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) { id name following }
  }
`;
const FOLLOW = gql`
  mutation Follow($id: ID!) {
    follow(id: $id) { id following }
  }
`;

export function UserProfile({ id }: { id: string }) {
  const { data, loading, error, refetch } = useQuery(GET_USER, { variables: { id } });
  // 更新 mutation：返回的字段含 id 与被改字段时，缓存自动合并
  const [follow, { loading: following }] = useMutation(FOLLOW);

  if (loading) return <p>加载中...</p>;
  if (error) return <p role="alert">{error.message}</p>;

  return (
    <div>
      <p>{data.user.name}，粉丝标记：{String(data.user.following)}</p>
      <button
        disabled={following}
        onClick={() =>
          follow({ variables: { id } }).then(() => refetch()) // 稳妥起见重取一次
        }
      >
        {following ? '处理中...' : '关注'}
      </button>
    </div>
  );
}
```

预期渲染行为：关注点击后按钮进入"处理中"，完成后 `following` 状态刷新——如果 mutation 返回了 `id + following`，Apollo 直接按 `User:id` 合并进缓存，其他正在显示该用户的组件同步更新，无需 `refetch`。

## 5. 缓存更新与分页

- **mutation 后的缓存策略**，按可靠性排序：mutation 返回被改对象的全量字段（自动合并）> `update(cache, { data })` 手动改缓存 > `refetchQueries` 重取相关查询 > 兜底 `refetch()`。直接"改缓存里的对象"要小心绕过归一化标识。
- **分页**：游标式（`edges/hasNextPage`）配 `fetchMore` 追加合并；`InMemoryCache` 用 Relay 风格的 `merge` 函数（`typePolicies` 里配置）告诉它"新页追加而非覆盖"。偏移分页在数据频繁插入时会出现重复/漏项，优先游标。

## 6. 订阅：实时数据的 GraphQL 形态

`subscription` 走 WebSocket（GraphQL over WS 协议）接收服务端推送，适合"数据到达即更新"的场景（新订单、新消息）。它与原生 WebSocket 的分工：WS 是通道，订阅是**带 schema 约束的消息协议**；简单推送场景 SSE + 轮询往往更省事（见[React 与 WebSocket](/react/290-ReactWebSocket)第 5 节的对比表）。

## 7. 选型：GraphQL 还是 REST + 缓存库

| 维度 | GraphQL | REST + TanStack Query |
| :--- | :--- | :--- |
| 数据形状 | 客户端按需声明，天然免过度获取 | 端点固定，靠 BFF/字段裁剪缓解 |
| 聚合多次请求 | 天然强项（一次查关联） | 靠接口设计或网关聚合 |
| 客户端缓存 | 库内置归一化缓存 | TanStack Query 按键缓存 |
| 服务端成本 | 需 schema/解析器体系与 N+1 治理 | 生态与运维更成熟 |
| 团队现状 | 前后端都熟 GraphQL 才划算 | 绝大多数项目的默认解 |

决策线：**多端消费、数据关联复杂、前端字段诉求多变**时 GraphQL 收益明显；普通业务后台、接口稳定的项目，REST + TanStack Query 更省心。混合形态（部分 GraphQL 网关 + 部分微服务 REST）也很常见。

## 8. 常见陷阱

- **以为 HTTP 200 就成功**：GraphQL 业务错误在 `errors` 数组里，`data` 可能为 null；必须同时检查两者。
- **N+1 问题**：嵌套列表查询在服务端退化成 1+N 次数据库查询；服务端用 DataLoader 按批次合并，这是 GraphQL 服务端的第一课。
- **查询文档不落缓存**：`gql` 模板字符串每次渲染重建没有缓存意义，务必定义为模块级常量。
- **mutation 只改了服务端，界面不更新**：mutation 返回体没带被改字段或缺 `id`，归一化缓存对不上号；补全返回字段或写 `update` 函数。
- **滥用 `fetch-policy: no-cache`**：绕开缓存看似省心，实际丢掉了 Apollo 的核心价值；优先调整 `merge`/缓存标识。
- **把 GraphQL 当"永远不过度获取"**：字段按需是相对 REST 的优势，但嵌套过深的查询同样会拖垮服务端；用查询复杂度限制与深度限制防护。

## 9. 小结

初学者要点：

- GraphQL = 查询语言 + 一个 POST 端点；query 读、mutation 写，响应与查询文档同构，错误在 `errors` 数组。
- React 侧裸 fetch 就能跑通，Apollo Client 的价值是归一化缓存 + `useQuery`/`useMutation` 的状态封装。
- mutation 后要么返回带 id 的完整对象让缓存自动合并，要么显式 `update`/`refetchQueries`。

进阶注意：

- 服务端治理（DataLoader 防 N+1、查询复杂度限制）决定 GraphQL 能否规模化，客户端只是冰山一角。
- 分页优先游标式 + `fetchMore`；实时数据用 subscription（WS 通道），简单场景 SSE 更轻。
- 选型看团队与数据形态：多端多变选 GraphQL，接口稳定的常规业务 REST + TanStack Query 即可。

## 速查

**裸调用**

```ts
const res = await fetch('/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables }),
});
const { data, errors } = await res.json(); // 200 也可能带 errors
```

**Apollo 客户端与 Provider**

```tsx
const client = new ApolloClient({ uri: '/graphql', cache: new InMemoryCache() });
<ApolloProvider client={client}><App /></ApolloProvider>
```

**useQuery / useMutation**

```tsx
const { data, loading, error, refetch } = useQuery(GET_USER, { variables: { id } });
const [save, { loading }] = useMutation(SAVE_USER, {
  refetchQueries: ['GetUser'], // 提交后重取相关查询
});
```

**游标分页**

```tsx
const { data, fetchMore } = useQuery(FEED, { variables: { cursor: null } });
fetchMore({ variables: { cursor: data.feed.endCursor },
  updateQuery: (prev, { fetchMoreResult }) => ({
    feed: { ...fetchMoreResult.feed,
      items: [...prev.feed.items, ...fetchMoreResult.feed.items] },
  }),
});
```

**subscription（概念）**

```graphql
subscription OnOrderCreated { orderCreated { id title } }
# 通道：GraphQL over WebSocket；客户端用 useSubscription 订阅
```
