---
order: 170
title: 条件渲染与保持组件纯粹
module: 'react'
category: 前端技术
difficulty: beginner
description: 三元、逻辑与、提前 return 的取舍；&& 短路渲染出 0 的经典陷阱；保持组件纯粹与 StrictMode 双跑验证。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'react/110-JSXDeepAnalysis'
  - 'react/020-ComponentProps'
  - 'react/044-EffectsLifecycleBestPractice'
prerequisites: []
---

## 知识点地图

- **知识类别**：描述 UI（对应 react.dev Learn 的 Conditional Rendering 与 Keeping Components Pure 两个主题）。
- **解决什么问题**：真实界面永远不是单一分支——有权限显隐、空态、加载态、错误态。JSX 里怎么表达分支才不会把组件搅成嵌套地狱？另一方面，分支写错（`&&` 撞上数字 0）会把不该渲染的东西渲染出来。本文同时回答「怎么写分支」与「渲染函数必须遵守什么纪律」。
- **什么时候用到**：写任何带分支的组件时；以及排查「界面多了一个 0」「开发模式请求发两次」「同一次渲染结果不一样」这类症状时。

[JSX 深度解析](/react/110-JSXDeepAnalysis) 讲了 JSX 的语法层；本篇讲分支的组织方式与渲染纯度约束。例子沿用 FANDEX 岛屿阅读器的权限显隐、空态分支与加载骨架三分支。

## 1. 三种分支写法的适用边界

### 1.1 提前 return：分支决定「整个组件长什么样」

当分支互相排斥且各自是完整界面时，提前 return 最清晰——每个分支自成一段线性代码，没有嵌套：

```tsx
function IslandComments({ islandId, user }: Props) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return <p role="alert">留言加载失败：{error.message}</p>;
  }
  if (comments === null) {
    return <CommentSkeleton lines={3} />;
  }
  if (comments.length === 0) {
    return <EmptyState hint="还没有留言，来抢沙发" />;
  }

  // 走到这里 TypeScript 已确认 comments 是 Comment[] 且非空——类型随控制流收窄
  return <CommentList comments={comments} />;
}
```

逐行解释为什么这样写：

- **类型收窄是提前 return 的隐性红利**。`comments` 的类型是 `Comment[] | null`，经过 `comments === null` 的 return 后，后续代码里 TS 知道它是 `Comment[]`，不需要 `comments!` 或 `comments ?? []` 这类补丁。若把分支写成三元嵌套，收窄照样发生但可读性骤降。
- **分支顺序即优先级**：错误态最优先（有错误就不该显示骨架），然后是加载，再是空态，最后是正常内容。这个顺序是 UI 分支的标准优先序，写乱会同时出现「骨架和错误提示并存」的诡异界面。
- 代价：提前 return 不适合「外层结构固定、只有局部小变化」的场景（比如整个页面只有一个按钮按权限显隐），那种用表达式内联更合适。

### 1.2 三元表达式：局部二选一

```tsx
return (
  <section>
    <h1>{island.title}</h1>
    {user ? (
      <button onClick={subscribe}>订阅更新</button>
    ) : (
      <a href="/login">登录后订阅</a>
    )}
  </section>
);
```

- 三元是**表达式**，两个分支都必须产出值/节点，天然防漏 else；`if` 语句则可能忘写 else 导致隐式渲染 `undefined`。
- 两个分支都非空且互斥时用三元。只用一半的分支请看 1.3。
- 嵌套三元（三元套三元）禁止：可读性崩塌且难以断点调试，该场景应抽成变量用提前 return 或映射表。

### 1.3 逻辑与 `&&`：「要么渲染要么什么都没有」

```tsx
{unreadCount > 0 && <Badge count={unreadCount} />}
```

`&&` 返回的是**操作数本身**而不是布尔值：左侧为假值时，整个表达式直接等于左侧的值。这就是著名的「渲染出 0」陷阱：

```tsx
// 反模式：unreadCount 为 0 时，页面上渲染出一个孤零零的 "0"
{unreadCount && <Badge count={unreadCount} />}

// 正确：把条件收成布尔
{unreadCount > 0 && <Badge count={unreadCount} />}
// 或
{Boolean(unreadCount) && <Badge count={unreadCount} />}
```

原因拆解：JSX 会渲染任何「可渲染值」。`0 && <Badge/>` 的结果是数字 `0`，React 把它当文本节点渲染；`false`、`null`、`undefined` 则被 React 特判为「什么都不渲染」。所以规则是：**`&&` 左侧必须是布尔值**——凡是比较表达式、`Boolean()`、`!!` 皆可，凡是可能为 `0`、`''`、`NaN` 的裸值皆危险。`''` 陷阱同样常见：`{draft.trim() && <Preview />}` 在草稿为空格时渲染出空字符串（看不见但占了 DOM 节点，影响 `:empty` 选择器与测试断言）。

## 2. 组合分支：FANDEX 岛屿阅读页的三态实践

真实页面通常「加载/错误/空/内容」四态并存，外加权限显隐。组织原则：**整页级分支用提前 return，局部开关用内联表达式，权限收敛成单一布尔**：

```tsx
type Render =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; island: Island };

function IslandPage({ render, user }: { render: Render; user: User | null }) {
  // 权限判断收拢成一个具名布尔，别内联进 JSX——否则每处显隐各写一遍判定规则。
  // 注意 && 的书写顺序：render.phase === 'ready' 必须在访问 render.island 之前，
  // 利用短路避免在 loading 分支上读取不存在的字段。
  const canEdit =
    user !== null &&
    (user.role === 'admin' ||
      (render.phase === 'ready' && render.island.authorId === user.id));

  if (render.phase === 'loading') return <IslandSkeleton />;
  if (render.phase === 'error') return <ErrorPanel message={render.message} />;

  const { island } = render;
  return (
    <article>
      <h1>{island.title}</h1>
      {canEdit && <EditButton islandId={island.id} />}
      {island.tags.length === 0 ? (
        <p className="muted">暂无标签</p>          // 空态给文案，而不是渲染空列表
      ) : (
        <TagList tags={island.tags} />
      )}
    </article>
  );
}
```

- `canEdit` 的写法有个顺序细节：`render.phase === 'ready' && ...` 放在访问 `render.island` 之前，利用 `&&` 的短路避免在 `loading` 分支上读不存在的字段。若把字段访问写在前面，TypeScript 会直接报错——这是判别联合替你挡住的运行时崩溃。
- 每个空态都有可见文案。渲染「什么都不输出」和「渲染一个说明空着的占位」是两种产品决策，后者才是默认正确项。

## 3. 保持组件纯粹：渲染是纯函数

React 对组件函数的纪律与数学函数一致：**同样输入必得同样输出；不碰函数外的东西**。落到日常编码就是三条禁令：

1. **渲染期不改任何外部可变量**：不写 `count++`、不 `arr.sort()`（原地排序改了入参）、不 `obj.x = ...`。
2. **渲染期不触发副作用**：不发请求、不订阅、不 setTimeout、不写 localStorage——这些属于事件处理器与 Effect。
3. **不依赖渲染期才会变的量**：不读 `Date.now()`、`Math.random()` 作为渲染输入。

```tsx
// 反模式：渲染期改外部数组——在 StrictMode 下会重复执行
function CartList({ items }: { items: CartItem[] }) {
  items.sort((a, b) => b.price - a.price); // 原地排序：改了父组件的数据
  return <ul>{/* ... */}</ul>;
}

// 正确：产生新数组
function CartList({ items }: { items: CartItem[] }) {
  const sorted = [...items].sort((a, b) => b.price - a.price);
  return <ul>{/* ... */}</ul>;
}
```

为什么 React 强迫你纯粹：React 可能**随时**渲染组件——状态变化、父组件变化、并发特性的中断重跑、Tab 切换时的预渲染。只有纯函数才能保证「多渲染几次无害」。不纯的组件在 StrictMode 下会立刻暴露：请求发两次、计数翻倍、列表重复——这不是 bug 在 StrictMode 里产生，而是 bug 被 StrictMode 照出来了。

### 3.1 StrictMode 双跑验证

开发模式下 StrictMode 对每个组件函数调用两次、每个 Effect 挂载-清理-再挂载跑一遍（生产构建零开销）：

```tsx
// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

把「双跑」当成免费的纯度体检：某组件双跑后界面出错，说明它渲染不纯或 Effect 清理缺失。修复方向永远是让组件变纯、补全清理，而不是移除 StrictMode。常见「双跑才出错」的三类代码：渲染期 `push` 进外部数组、渲染期发请求、Effect 没写清理（订阅叠加）。

## 4. 三个不同场景的完整例子

### 4.1 权限显隐：不只是「能不能看」

权限分支最常见的错误是把「无权限」渲染成空白，用户以为按钮坏了：

```tsx
function PublishButton({ article, user }: { article: Article; user: User }) {
  const isOwner = article.authorId === user.id;
  const isPublished = article.status === 'published';

  if (!isOwner) return null;                       // 无关人员：确实什么都不该看到
  if (isPublished) {
    return (
      <span className="muted">
        已发布 <button onClick={unpublish}>撤回</button>
      </span>
    );
  }
  return <button onClick={publish}>发布</button>;
}
```

注意两层区分：`!isOwner` 渲染 null 是产品语义（旁观者无此概念）；而已发布作者看到的不是「隐藏按钮」而是「状态 + 撤回入口」——**显隐分支应当传达状态，而不是只做减法**。

### 4.2 空态分支：列表组件的必修课

```tsx
function ReaderNotes({ notes, query }: { notes: Note[]; query: string }) {
  const filtered = notes.filter((n) => n.title.includes(query));

  if (notes.length === 0) {
    return <EmptyState action="写第一条笔记" onAction={openEditor} />; // 从未写过：引导创建
  }
  if (filtered.length === 0) {
    return <p className="muted">没有匹配「{query}」的笔记</p>;       // 筛选后为空：给筛选反馈
  }
  return <NoteList notes={filtered} />;
}
```

两种空态必须区分：「根本没有数据」与「筛选后为空」的原因、文案、行动按钮完全不同。共用一个空态组件但传入不同文案与动作即可，不要合并成一个 `length === 0` 判断。

### 4.3 加载骨架三分支与 Suspense 的关系

手写三分支（见第 2 节）与用 Suspense 声明式挂起是同一问题的两种工具。判断标准：

- 分支状态由**你自己的取数代码**维护（useState + fetch）-> 手写三分支，状态是显式的；
- 数据由框架或库负责（路由 loader、React Query、RSC）-> 用 Suspense 边界声明 fallback，加载态由「渲染被挂起」隐式表达，见 [并发渲染](/react/130-ConcurrentRendering)。

混用的反模式是「Effect 里 fetch + Suspense fallback 双保险」：两套加载态来源不一致时界面闪烁。选定一套，另一套删掉。

## 5. 动手实践

练习任务：重构下面这个分支泥潭组件，要求：消灭嵌套三元、修复 `&&` 陷阱、把权限判定收拢为具名布尔，并保证空态有文案。

```tsx
function ArticleActions({ article, user }: any) {
  return (
    <div>
      {article.status === 'draft'
        ? user
          ? user.id === article.authorId
            ? user.role === 'admin'
              ? <button>发布（管理员代发）</button>
              : <button>发布</button>
            : null
          : null
        : null}
      {article.likes && <LikeCount n={article.likes} />}
      {article.comments.length === 0 ? '' : <CommentList items={article.comments} />}
    </div>
  );
}
```

提示：`article.likes` 可能为 0；`comments.length === 0 ? ''` 渲染了空字符串；管理员代发可以折算成「canPublish 布尔 + 一个文案变量」。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```tsx
function ArticleActions({ article, user }: { article: Article; user: User | null }) {
  const isOwner = user !== null && user.id === article.authorId;
  const isDraft = article.status === 'draft';
  // 发布能力的判定独立成布尔：owner + 草稿即可发；管理员追加「代发」文案
  const canPublish = isDraft && isOwner;
  const onBehalf = canPublish && user!.role === 'admin';

  return (
    <div>
      {canPublish && (
        <button onClick={() => publish(article.id)}>
          {onBehalf ? '发布（管理员代发）' : '发布'}
        </button>
      )}
      {article.likes > 0 && <LikeCount n={article.likes} />}
      {article.comments.length === 0 ? (
        <p className="muted">还没有评论</p>
      ) : (
        <CommentList items={article.comments} />
      )}
    </div>
  );
}
```

自检：`article.likes > 0` 修掉了 0 渲染；空评论有文案；嵌套三元压平为两个布尔加一处文案三元；`user` 判空后 `user.id` 不再冒类型风险。

</details>

## 6. 常见陷阱速查

- **`&&` 左侧非布尔**：`count && <X/>` 渲染出 0；`str && <X/>` 渲染出空串。统一 `> 0` / `Boolean()` / `!!`。
- **忘写 else 的 `if`**：JSX 里不能写语句，`{if (...)}` 是语法错误；但把分支逻辑写在组件体、漏掉 return 路径会让组件返回 `undefined` 报错。提前 return 时确认所有路径都有返回值。
- **渲染期原地排序 / push**：StrictMode 双跑放大为可见 bug。任何「整理」操作先复制。
- **渲染期读随机/时间**：同一次交互两次渲染输出不同，React 会认为树变了而多做更新，SSR 水合时直接不匹配。随机值放 useState 惰性初始化或事件处理器里。
- **key 依赖数组索引且列表会重排**：分支切换（如列表与空态互换）时索引 key 导致状态串位。key 用稳定业务 id。

## 7. 小结

初学者要点：整页分支提前 return（附带类型收窄），局部二选一用三元，`&&` 左侧必须是布尔；组件是纯函数，渲染期不改外部状态、不碰副作用。进阶注意：权限判定收拢成具名布尔；区分「无数据」与「筛选后为空」两种空态；StrictMode 双跑是纯度体检不是敌人。

## 下一步

- [JSX 深度解析](/react/110-JSXDeepAnalysis)：本文的语法层前置；
- [状态与事件](/react/030-StateEvent)：分支的条件从哪来；
- [Effect 生命周期与「你可能不需要 Effect」](/react/044-EffectsLifecycleBestPractice)：渲染期禁做之事的完整清单。

## 参考与致谢

- react.dev *Conditional Rendering*（CC-BY 4.0）：https://react.dev/learn/conditional-rendering
- react.dev *Keeping Components Pure*（CC-BY 4.0）：https://react.dev/learn/keeping-components-pure
