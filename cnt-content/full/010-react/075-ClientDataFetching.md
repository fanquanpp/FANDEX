---
order: 120
title: 客户端数据获取与缓存
module: 'react'
category: 前端技术
difficulty: beginner
description: SWR 与 TanStack Query 的缓存心智模型：stale-while-revalidate、请求去重、mutate 与缓存失效、分页无限滚动与乐观更新，以及手写 useEffect fetch 的竞态问题——文章列表、搜索联想、评论乐观发送三例贯穿。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：客户端数据获取（client-side data fetching）与缓存库——SWR 与 TanStack Query（React Query）两家，外加「为什么手写 fetch 不够」的原理层。
- **解决什么问题**：组件反复挂载导致重复请求；列表页返回后数据闪一下才回来；两个组件用同一份数据各拉各的、状态不同步；提交后忘了刷新列表；快速输入触发的请求乱序返回，先发的结果覆盖后发的。
- **什么时候用到**：SPA 里任何「组件挂载时要数据」的场景。注意与路由取数的分工：loader/action 式的路由级预取属于 [React Router 路由](/react/070-ReactRouterRouting)，本篇讲的是组件层的客户端缓存——两者常常叠加使用。框架内服务端取数见 [Server 和 Client 组件](/react/400-ServerClientComponents)。

## 前置知识

- [Hooks 深入](/react/040-HooksDeep)：`useEffect` 的依赖与清理语义——本篇多处正是「手写 Effect 取数」的替代方案
- [状态结构与摆放](/react/035-StateStructureAndLifting)：缓存命中后回填组件状态的心智模型

## 1. 先看手写 useEffect fetch 输在哪

理解缓存库最好的方式是先把它要解决的问题手写一遍：

```tsx
function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;            // 手动防竞态
    setLoading(true);
    fetch('/api/articles')
      .then((r) => r.json())
      .then((data) => { if (!ignore) setArticles(data); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; }; // 卸载后丢弃结果
  }, []);

  // ...
}
```

这段样板代码有四个结构性问题，每个缓存库都至少解决前三个：

1. **无缓存**：离开页面再回来，同样的请求重新发一遍，用户盯着 loading 闪屏。数据明明一分钟前刚拿过。
2. **无去重**：页面里标题栏和侧边栏都要 `/api/articles`，两个组件各自 useEffect，同一时刻发两个一模一样的请求。
3. **无失效协调**：新建文章后，另一个正在展示文章列表的组件不会知道要刷新——你必须手动找一个「刷新」的途径，写多了就是一堆事件总线。
4. **竞态与取消要自己防**：快速切换 `id` 时，慢的旧请求可能晚于快的新请求返回，把新数据覆盖成旧数据。上面的 `ignore` 标志位是正确写法，但每一处取数都要记得写；漏了就是经典的乱序 bug。

SWR 与 TanStack Query 的共同承诺：**把「取数 + 缓存 + 去重 + 失效」从组件代码里抽走，组件只声明「我需要哪个 key 的数据」**。

## 2. SWR：stale-while-revalidate 心智模型

SWR 名字来自 HTTP 缓存策略 `stale-while-revalidate`，理解它只需要一张时序：

1. 组件挂载，向缓存要 key 对应的数据。
2. 缓存里有 → **立即返回旧数据（stale）**，界面秒出，不闪 loading。
3. 同时后台发请求重新验证（revalidate），新数据回来后悄悄替换，界面自动更新。
4. 缓存里没有 → 才真正进入 loading 态。

所以 SWR 页面切换「不闪」的本质：**先用旧值占位，再用新值覆盖**，而不是「先 loading 再渲染」。

### 2.1 基本用法（原 070 第 6 节内容）

```tsx
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserProfile({ id }: { id: string }) {
  const { data, error, isLoading, mutate } = useSWR<User>(`/api/users/${id}`, fetcher);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <div>
      <h1>{data!.name}</h1>
      {/* 手动触发重新验证 */}
      <button onClick={() => mutate()}>刷新</button>
    </div>
  );
}
```

逐段讲解：

- `useSWR(key, fetcher)` 的 key 是**缓存身份**。两个组件用了同一个 key，SWR 内部只发一次请求、共享同一份缓存——请求去重不是配置出来的，是 key 模型保证的。
- `data` 在缓存命中时立刻有值；`isLoading` 只在「缓存里还没有」时为真。这就是为什么用它以后页面切换不闪 loading。
- 易错点：key 里必须包含所有会影响结果的变量。`useSWR('/api/articles', f)` 配合分类筛选会把「所有分类共用一份缓存」；正确形状是 `useSWR(['/api/articles', category], ([url, c]) => fetch(`${url}?c=${c}`).then(r => r.json()), f)`——key 变了缓存就换了，这才是它该有的行为。

### 2.2 全局配置（原 070 内容保留）

```tsx
import { SWRConfig } from 'swr';

function App() {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => fetch(url).then((r) => r.json()),
        revalidateOnFocus: false,   // 窗口重新聚焦时不再自动验证
        dedupingInterval: 60000,    // 60 秒内相同 key 的请求直接复用
      }}
    >
      <Router />
    </SWRConfig>
  );
}
```

逐项说明为什么默认值是这样：`revalidateOnFocus` 默认开启，对应「用户切走又切回来，数据可能已经过期」的直觉；但仪表盘类全屏应用里频繁 alt-tab 会造成请求风暴，工程里常按场景关掉。`dedupingInterval` 默认 2000 毫秒，它解决的是「同一 tick 内多个组件挂载」的去重；拉长到 60 秒适合变化缓慢的配置类数据，**不要**对聊天、行情这类实时数据拉长。

### 2.3 mutate 与缓存失效

`mutate` 是 SWR 的写入口，三种形态记一组对比：

```tsx
mutate();                          // 1. 重新验证：后台重取，期间旧数据继续显示
mutate(newData, false);            // 2. 只改缓存：立即替换本地数据，不发请求
await mutate(updateLocal(), { revalidate: true }); // 3. 乐观更新：先本地改，再重取对齐
```

- 形态 1 用于「我知道外面有变化」：轮询兜底、窗口聚焦刷新。
- 形态 2 用于「我就是权威」：本地删除一个条目后不希望它闪回来。
- 形态 3 是 2.4 乐观更新的底层原语。

### 2.4 乐观更新（原 070 TodoList 示例，扩展为评论发送）

原 070 的 TodoList 勾选示例展示了两步式乐观更新；这里用阅读器「评论发送」场景重写，逻辑一致但多覆盖一个失败回滚分支：

```tsx
function CommentBox({ articleId }: { articleId: string }) {
  const { data: comments, mutate } = useSWR<Comment[]>(
    [`/api/comments`, articleId],
    ([url, id]) => fetch(`${url}?article=${id}`).then((r) => r.json()),
  );
  const [text, setText] = useState('');

  const submit = async () => {
    const optimistic: Comment = { id: `temp-${Date.now()}`, text, pending: true };

    // 第一步：先改本地缓存，界面立刻出现这条评论（乐观）
    await mutate([...(comments ?? []), optimistic], false);

    try {
      await fetch('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ articleId, text }),
      });
      // 第二步：服务器确认后重新验证，拿到真实数据（含真实 id）
      await mutate();
    } catch {
      // 第三步：失败回滚——重新验证会把临时条目冲掉
      await mutate();
      alert('发送失败，请重试');
    }
    setText('');
  };

  return (
    <div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={submit}>发送</button>
      <ul>
        {comments?.map((c) => (
          <li key={c.id} style={{ opacity: c.pending ? 0.5 : 1 }}>{c.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

逐段讲解：

- 第一行 `mutate([...old, optimistic], false)` 是关键：`false` 表示「这次只改缓存不要发请求」，评论瞬间出现在列表里。没有缓存库时，这个体验需要手动维护一份「本地临时状态 + 服务器状态」的合并逻辑，极易错。
- 乐观条目带 `temp-` 前缀与 `pending` 标记：转半透明是业界通行语义，告诉用户「已记录，未确认」。
- 易错点：乐观更新**必须有失败路径**。只写前两步的代码在断网时会「看起来发成功」，缓存与服务器从此分叉；重取对齐（形态 1/3）是兜底，回滚提示是体验。

## 3. TanStack Query：声明式缓存与 mutation

React Query（TanStack Query）覆盖同样的缓存承诺，但把「读」与「写」分成了两个一等公民：`useQuery` 管读，`useMutation` 管写——写完用 `invalidateQueries` 声明「哪些缓存过期了」，而不是手动 mutate 数据。

### 3.1 基本用法（原 070 内容）

```tsx
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Users />
    </QueryClientProvider>
  );
}

function Users() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
    staleTime: 5 * 60 * 1000, // 5 分钟内缓存视为新鲜，不重新获取
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage />;

  return (
    <ul>
      {data.map((user: User) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

与 SWR 的概念映射：`queryKey` 对应 SWR 的 key，`queryFn` 对应 fetcher，`staleTime` 显式声明「多久内不 revalidate」——SWR 默认每次挂载都后台重验，Query 默认 0（挂载即重验），语义上 Query 把决策权交给你显式写出来。

### 3.2 Mutation 与缓存失效（原 070 内容）

```tsx
function CreateUser() {
  const mutation = useMutation({
    mutationFn: (newUser: { name: string; email: string }) =>
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      }).then((r) => r.json()),
    onSuccess: () => {
      // 声明式失效：所有 queryKey 以 ['users'] 开头的缓存标记为过期，
      // 挂载中的组件立即自动重新获取
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    mutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" />
      <input name="email" />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? '创建中...' : '创建'}
      </button>
    </form>
  );
}
```

为什么 `invalidateQueries` 优于手动 `setQueryData`：失效是**声明关系**（「users 相关的都旧了」），不是覆写值（「列表应该是这几条」）。服务器返回的真实数据由缓存库重新拉取，你不用在客户端复刻一遍服务端的排序、分页、权限过滤逻辑——手写覆写一旦与服务端逻辑有出入就是幽灵数据。

易错点：`invalidateQueries` 按 key **前缀**匹配，`['users', 'admins']` 也会被 `['users']` 的失效波及。这是设计特性（层级化缓存），但意味着 key 的第一段要当作「资源域」设计，别把页面路径之类的东西塞进第一段。

### 3.3 分页与无限滚动（useInfiniteQuery）

文章列表无限滚动是 Query 的高频场景，SWR 需要插件或手写 page 状态，Query 内置一条曲线：

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';

function ArticleFeed() {
  const query = useInfiniteQuery({
    queryKey: ['articles'],
    queryFn: ({ pageParam }) =>
      fetch(`/api/articles?cursor=${pageParam}`).then((r) => r.json()),
    initialPageParam: 0,
    // 返回下一页游标；没有下一页时返回 undefined
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  if (query.isLoading) return <Spinner />;
  if (query.isError) return <ErrorMessage />;

  return (
    <div>
      {query.data.pages.map((page, i) => (
        <ul key={i}>
          {page.items.map((a: Article) => (
            <li key={a.id}>{a.title}</li>
          ))}
        </ul>
      ))}
      <button
        disabled={!query.hasNextPage || query.isFetchingNextPage}
        onClick={() => query.fetchNextPage()}
      >
        {query.isFetchingNextPage ? '加载中...' : '加载更多'}
      </button>
    </div>
  );
}
```

逐段讲解：

- 每一页是独立的缓存条目（key 带页码），所以往回滚时旧页**不重新请求**——这是与「把所有页拼进一个数组 state」的本质区别，后者无法按页缓存与失效。
- `getNextPageParam` 是「下一页在哪」的单一来源；配合IntersectionObserver 把 `fetchNextPage()` 换成滚动到底自动触发即可。
- 易错点：新增文章后 `invalidateQueries({ queryKey: ['articles'] })` 会失效**所有页**。发布流场景（新文章插到最前）通常接受这个行为；时间线场景则倾向只对第一页失效或改用乐观插入，避免整个 feed 闪动。

### 3.4 搜索联想防抖：key 模型消灭竞态

搜索框每敲一个字发一次请求，慢的旧请求可能覆盖新结果——第 1 节的手写 `ignore` 模式在这里最容易漏写。Query 的解法是把竞态交给 key：

```tsx
function SearchBox() {
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300); // 输入防抖（自写或 usehooks-ts）

  const { data: suggestions, isFetching } = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: () => fetch(`/api/suggest?q=${encodeURIComponent(debounced)}`).then((r) => r.json()),
    enabled: debounced.length >= 2,   // 太短不请求
    placeholderData: (prev) => prev,  // 换词时保留上一个词的结果，避免列表闪烁
  });

  return (
    <div>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      {isFetching && <span>搜索中</span>}
      <ul>{suggestions?.map((s: string) => <li key={s}>{s}</li>)}</ul>
    </div>
  );
}
```

机制拆解：`queryKey: ['suggest', debounced]` 意味着每个词有独立缓存槽。Query 保证**同一 key 内**的乱序结果不会覆盖新值（内部带请求序列管理），跨 key 则天然隔离——你不需要写任何取消或 ignore 逻辑。`placeholderData: prev` 让输入从「re」变成「rea」时列表仍显示「re」的结果直到新结果到达，这是联想体验的关键细节。

防抖本身依然是你的责任（`useDebounce` 十行可自写）：缓存库解决的是竞态，不是节流。

## 4. SWR vs TanStack Query 怎么选（原 070 对比表保留）

| 特性 | SWR | TanStack Query |
| :--- | :--- | :--- |
| 体积 | ~4 KB | ~13 KB |
| 学习曲线 | 低 | 中 |
| Mutation 支持 | 基础（mutate 函数） | 完善（useMutation + 失效） |
| 离线支持 | 需要插件 | 内置 |
| 分页/无限滚动 | 基础（useSWRInfinite） | 完善（useInfiniteQuery） |
| DevTools | 有 | 完善 |
| 适用场景 | 简单数据获取 | 复杂数据管理 |

选择路径：只读型页面为主、团队想零成本接入 → SWR；写操作多、需要失效图和乐观更新工作流、数据层复杂 → TanStack Query。两者心智模型同源（key + 缓存 + 重验），迁移成本可控，不必视为站队问题。

## 5. 动手实践

### 练习 1：从手写 fetch 迁移到 SWR

任务：把第 1 节的 `ArticleList` 改用 SWR 实现，要求保留防竞态语义。写完对比：`ignore` 标志位去哪了？

提示：SWR 的 key 就是缓存身份；组件卸载后返回的数据自然丢弃，你不需要手写清理。

参考实现（先自己写，再展开对照）：

<details>
<summary>参考实现</summary>

```tsx
function ArticleList() {
  const { data: articles, isLoading } = useSWR<Article[]>('/api/articles', fetcher);
  if (isLoading) return <Spinner />;
  return (
    <ul>
      {articles?.map((a) => <li key={a.id}>{a.title}</li>)}
    </ul>
  );
}
```

自检：`ignore` 标志与卸载清理都消失了——SWR 内部管理请求生命周期；同一 key 的并发请求在库内去重。数一数代码行数。
</details>

### 练习 2：给评论发送补齐失败回滚

任务：基于 2.4 的评论示例，增加「服务器返回 4xx 业务错误（如敏感词）」的处理：乐观条目移除，并显示错误提示。思考为什么不能只依赖 `mutate()` 重验。

提示：`fetch` 对 4xx 不抛异常，`await mutate()` 重验只会拿到不含该评论的列表——临时条目会被冲掉，但用户不知道为什么。

参考实现：

<details>
<summary>参考实现</summary>

```tsx
const submit = async () => {
  const optimistic: Comment = { id: `temp-${Date.now()}`, text, pending: true };
  await mutate([...(comments ?? []), optimistic], false);
  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ articleId, text }),
    });
    if (!res.ok) {
      // 业务错误：明确回滚并提示，而不是静默重验
      await mutate();            // 冲掉临时条目
      setError(`发送失败（${res.status}）：${(await res.json()).message ?? '请重试'}`);
      return;
    }
    await mutate();
  } catch {
    await mutate();              // 网络错误
    setError('网络异常，请重试');
  }
  setText('');
};
```

自检：错误分支里是否两条路径都调用了重验？`setError` 的提示是否让用户能区分「没发出去」和「发出去还没确认」？
</details>

### 练习 3：失效链路设计

任务：阅读器的「书架页」显示收藏数，「书籍详情页」可以点收藏/取消。用 TanStack Query 设计：收藏操作成功后书架页的数字如何更新？写出 key 命名与失效代码。

提示：两页共用一个资源域 key；失效按前缀命中。

参考实现：

<details>
<summary>参考实现</summary>

```tsx
// 书架页
const { data: shelf } = useQuery({
  queryKey: ['bookshelf', userId],           // 第一段是资源域
  queryFn: () => fetch(`/api/bookshelf?u=${userId}`).then((r) => r.json()),
});

// 详情页的收藏操作
const favorite = useMutation({
  mutationFn: (bookId: string) =>
    fetch(`/api/books/${bookId}/favorite`, { method: 'POST' }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookshelf'] }); // 前缀匹配命中书架缓存
    queryClient.invalidateQueries({ queryKey: ['book', bookId] }); // 详情自己的收藏态
  },
});
```

自检：如果把 key 写成 `['shelf-data', 'u1']` 与 `['bookshelf']` 两套不相交的名字，失效还能命中吗？这说明了 key 第一段设计的重要性。
</details>

## 6. 小结

- 手写 useEffect fetch 的四个结构缺陷：无缓存、无去重、无失效协调、竞态要手防。
- SWR 的承诺是「先旧后新」：缓存命中即显示，后台重验再覆盖；key 是缓存与去重的身份。
- TanStack Query 把读写分成 `useQuery` / `useMutation`，用 `invalidateQueries` 声明失效关系而不是覆写数据；无限滚动与搜索竞态都有内建曲线。
- 乐观更新三步走：先改缓存（不发请求）、成功后重验对齐、失败重验兜底并提示。
- 路由级预取（loader/action）与组件级缓存互补：进页面前有数据走前者，进页面后的增量刷新走本篇。

## 参考与致谢

- SWR 官方文档：https://swr.vercel.app/zh-CN ，SWR, MIT License（文档随仓库开源）。
- TanStack Query 官方文档：https://tanstack.com/query/latest ，TanStack Query, MIT License。
- 原 070 篇的 SWR 与 React Query 两节内容已全部搬入本篇并扩写（基本用法、全局配置、乐观更新、Mutation、对比表均保留落位）。
