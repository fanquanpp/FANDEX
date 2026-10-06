---
order: 60
title: useReducer 与状态逻辑抽取
module: 'react'
category: 前端技术
difficulty: beginner
description: 把「怎么变」从组件里抽出来：useReducer 三件套、action 语义化、reducer 纯函数纪律与 reducer + Context 组合模式。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'react/030-StateEvent'
  - 'react/035-StateStructureAndLifting'
  - 'react/050-ContextGlobalState'
prerequisites: []
---

## 知识点地图

- **知识类别**：状态管理（对应 react.dev Learn 的 Extracting State Logic into a Reducer 主题）。
- **解决什么问题**：当一个状态的「所有更新方式」散落在组件各处的事件处理函数里，组件会同时背负「界面」与「状态机」两种职责，更新规则难审计、难测试、难复用。useReducer 把「怎么变」（reducer 函数）与「何时变」（dispatch 调用点）分开。
- **什么时候用到**：一个状态由多个子字段组成且更新之间有关联（如购物车：增删改查互相影响合计）；下一个状态依赖复杂条件；多个事件要触发同一种变更；状态逻辑需要单元测试或抽到独立文件。反过来说，两三个互不相关的 `useState` 就够时，不要为了「看起来高级」上 reducer。

本文承接 [Hooks 深入](/react/040-HooksDeep) 中 useReducer 的速查内容并展开成专篇。例子沿用本模块 FANDEX 岛屿阅读器的主线场景：留言板、命令面板与阅读进度。

## 1. 心智模型：把组件改造成「视图 + 状态机」

`useState` 的问题不是功能不够，而是**更新逻辑没有单一出处**。看一个典型的失控现场：

```tsx
function MessageBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // 每个事件处理函数都各自决定「状态怎么变」——规则分散在四个地方
  function handleSubmit() {
    if (!draft.trim()) return;
    setMessages((m) => [...m, { id: crypto.randomUUID(), text: draft, replyTo }]);
    setDraft('');
    setReplyTo(null);
  }
  function handleDelete(id: string) {
    setMessages((m) => m.filter((msg) => msg.id !== id));
    if (replyTo === id) setReplyTo(null); // 删除被引用的留言时要联动清理——这条规则藏在角落里
  }
  // ...
}
```

逐行看问题：

- `handleSubmit` 里连续三次 setState 是「一次业务动作」拆成的三个动作，任何一个新加入的开发者都可能在别的入口漏掉其中一步（比如点赞时忘了清 `replyTo`）。
- 「删除留言时若正在回复它则取消回复」这条业务规则埋在 `handleDelete` 的第二行，代码评审时极容易被当成普通清理代码扫过去。
- 想为这些规则写单元测试，必须渲染整个组件——因为规则没有独立成函数。

useReducer 的解法是把三个问题拆开：

| 概念 | 职责 | 类比 |
| --- | --- | --- |
| `state` | 当前状态快照 | 状态机的当前状态 |
| `action` | 「发生了什么事」的描述对象 | 用户操作的事件报告 |
| `reducer` | 「这件事之后状态变成什么」的纯函数 | 状态转移函数 |

```tsx
type MessageState = {
  messages: Message[];
  replyTo: string | null;
  draft: string;
};

type MessageAction =
  | { type: 'submitted' }
  | { type: 'draft_changed'; text: string }
  | { type: 'reply_started'; messageId: string }
  | { type: 'message_deleted'; messageId: string };

function messageReducer(state: MessageState, action: MessageAction): MessageState {
  switch (action.type) {
    case 'submitted': {
      if (!state.draft.trim()) return state; // 校验规则收拢到转移函数里
      return {
        ...state,
        messages: [...state.messages, { id: crypto.randomUUID(), text: state.draft, replyTo: state.replyTo }],
        draft: '',
        replyTo: null, // 发布后取消回复引用——规则只写这一遍
      };
    }
    case 'draft_changed':
      return { ...state, draft: action.text };
    case 'reply_started':
      return { ...state, replyTo: action.messageId };
    case 'message_deleted': {
      return {
        ...state,
        messages: state.messages.filter((msg) => msg.id !== action.messageId),
        replyTo: state.replyTo === action.messageId ? null : state.replyTo,
      };
    }
  }
}
```

关键设计决策逐条解释：

- **action 用 `{ type: ... }` 可辨识联合**，TypeScript 会要求每个 `case` 里的 `action` 自动收窄为对应形状，`action.messageId` 只在 `message_deleted` 分支里合法。如果写成 `{ kind: string; payload?: any }` 这种宽接口，收窄失效，拼写错误要等到运行时才暴露。
- **reducer 返回新对象而不是改旧对象**。`state.messages.filter(...)` 产生新数组；若写成 `state.messages.splice(...)`，React 用 `Object.is` 比较发现 state 「没变」，跳过重渲染——这是 reducer 最高频的静默 bug。
- **每个 case 用块级作用域 `{}` 包住**。两个 case 里声明同名常量时，不加块会导致 `case` 间变量泄漏（switch 的 fall-through 语法陷阱）；ESLint 的 `no-case-declarations` 规则也会报错。
- **`submitted` 分支校验失败时 `return state`（同一引用）**，React 会跳过重渲染。若返回 `{ ...state }` 浅拷贝，功能等价但白白多渲染一次。
- **reducer 里禁止出现副作用**：不发请求、不写 localStorage、不调用 `Date.now()`/`Math.random()`。原因有二：StrictMode 开发模式下 reducer 会被调用两次验证纯度，副作用会执行两遍；并发渲染中被打断的渲染可能让 reducer 重跑，副作用无法回滚。

## 2. dispatch 是「报告事件」，不是「执行命令」

初学者最常见的困惑是 action 命名与拆分粒度。判断标准：**action 描述「发生了什么」，不描述「要怎么做」**。

```tsx
// 反模式：把 UI 动作直接翻译成状态修改指令
dispatch({ type: 'set_draft_and_clear_reply' }); // 这是两个变更的打包，语义不明
dispatch({ type: 'set_message_text', text });     // 「set」是命令式思维

// 推荐：报告业务事件，转移细节交给 reducer
dispatch({ type: 'draft_changed', text });
dispatch({ type: 'submitted' });
```

为什么这样更好：事件命名让 reducer 成为业务规则的唯一文档——读一遍 `switch` 就知道留言板有哪几种行为、每种行为牵动哪些字段；命令式命名则把状态机退化成一组零散的 setter，与多个 `useState` 没有本质区别。

拆分粒度的经验法则：

1. **用户的一次操作对应一个 action**（点击发送 = `submitted`，而不是 `clear_draft` + `append_message` + `clear_reply` 三个）。
2. **action 可以携带数据，但不携带「下一个状态」**。`{ type: 'draft_changed', text }` 合法；`{ type: 'draft_changed', nextDraft: {...整个state} }` 是把 reducer 掏空。
3. **跨字段的联动规则写在 reducer，不写在 dispatch 调用点**。这正是 1 节「删除时联动清理」搬进 reducer 的理由。

## 3. 三个不同场景的完整例子

### 3.1 命令面板：键盘操作的选中态

命令面板（Cmd+K 唤起）的上下键选择是 reducer 的典型场景——选中索引的边界处理（到头循环）是一条完整规则，散在事件处理器里极易写错：

```tsx
type PaletteState = { open: boolean; activeIndex: number; query: string };

type PaletteAction =
  | { type: 'opened' }
  | { type: 'closed' }
  | { type: 'query_changed'; query: string }
  | { type: 'active_moved'; delta: -1 | 1; itemCount: number };

function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case 'opened':
      return { ...state, open: true, activeIndex: 0, query: '' }; // 每次打开重置——面板的标准行为
    case 'closed':
      return { ...state, open: false };
    case 'query_changed':
      return { ...state, query: action.query, activeIndex: 0 }; // 换词后回到第一项，否则可能悬在超界索引上
    case 'active_moved': {
      if (action.itemCount === 0) return state;
      const next = (state.activeIndex + action.delta + action.itemCount) % action.itemCount;
      return { ...state, activeIndex: next }; // +itemCount 再取模：负数也能正确循环到末尾
    }
  }
}
```

- `(i + delta + n) % n` 是循环列表的标准写法。若直接写 `(i + delta) % n`，在 `i = 0` 按「上」会得到 `-1 % n = -1`（JS 取模保留符号），选中项消失。
- 把 `itemCount` 放进 action 而不是让 reducer 接收第二个参数，是因为过滤结果长度属于「当次事件的事实」，reducer 签名保持 `(state, action)` 纯函数形态，方便单测。
- 这段 reducer 不依赖任何 React API，可以用 Vitest 直接 `expect(paletteReducer(state, action)).toEqual(...)` 测试全部边界，不用渲染组件。

### 3.2 阅读进度：异步结果落进 reducer

取数场景里，加载/成功/失败三种状态若用三个 `useState` 管理，竞态和中间态组合会失控（loading 为 true 同时 error 不为空等非法状态都可能出现）。用 reducer 把非法状态在类型上排除：

```tsx
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

type FetchAction<T> =
  | { type: 'started' }
  | { type: 'succeeded'; data: T }
  | { type: 'failed'; message: string };

function fetchReducer<T>(state: FetchState<T>, action: FetchAction<T>): FetchState<T> {
  switch (action.type) {
    case 'started':
      return { status: 'loading' }; // 整体替换而非 spread：切换到 loading 时旧 error/data 一并作废
    case 'succeeded':
      return { status: 'success', data: action.data };
    case 'failed':
      return { status: 'error', message: action.message };
  }
}

// 组件里只负责发起与 dispatch，转移规则全在上面
function IslandComments({ islandId }: { islandId: string }) {
  const [state, dispatch] = useReducer(fetchReducer<Comment[]>, { status: 'idle' });

  useEffect(() => {
    dispatch({ type: 'started' });
    fetch(`/api/islands/${islandId}/comments`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: Comment[]) => dispatch({ type: 'succeeded', data }))
      .catch((err: Error) => dispatch({ type: 'failed', message: err.message }));
  }, [islandId]);

  if (state.status === 'loading') return <CommentSkeleton />;
  if (state.status === 'error') return <p role="alert">加载失败：{state.message}</p>;
  if (state.status === 'idle') return null;
  return <CommentList comments={state.data} />;
}
```

- 判别联合让 `state.data` 只在 `status === 'success'` 分支可访问，不需要 `data ?? null` 之类的防御——**非法状态不可表示**是 reducer + 判别联合最大的收益。
- 请求本身留在 Effect 里（Effect 的规范用法见 [Effect 生命周期与「你可能不需要 Effect」](/react/044-EffectsLifecycleBestPractice)），reducer 只接收已发生的结果事件 `succeeded`/`failed`，天然规避了「在 reducer 里发请求」的纯度违规。

### 3.3 购物车：多实体联动

电商购物车是教科书场景，但写出工程质量的关键在 action 设计：

```tsx
type CartItem = { productId: string; title: string; price: number; qty: number };
type CartState = { items: CartItem[] };

type CartAction =
  | { type: 'item_added'; product: Omit<CartItem, 'qty'> }
  | { type: 'qty_changed'; productId: string; qty: number }
  | { type: 'item_removed'; productId: string }
  | { type: 'cleared' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'item_added': {
      const existing = state.items.find((i) => i.productId === action.product.productId);
      if (!existing) {
        return { ...state, items: [...state.items, { ...action.product, qty: 1 }] };
      }
      // 已存在则加数量而非塞重复行——「合并同类项」规则只在这里出现一次
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.product.productId ? { ...i, qty: i.qty + 1 } : i,
        ),
      };
    }
    case 'qty_changed': {
      if (action.qty <= 0) {
        // 数量归零等同移除——调用方不用自己判断，规则集中在 reducer
        return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.productId ? { ...i, qty: action.qty } : i,
        ),
      };
    }
    case 'item_removed':
      return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };
    case 'cleared':
      return { items: [] };
  }
}
```

- 合计、运费等**派生数据不进 state**：`const total = state.items.reduce((s, i) => s + i.price * i.qty, 0)` 在渲染时现算即可。把 total 存进 state 就要为每条变更路径手动维护一致性——这属于官方「避免多余 State」判例，详见 [Effect 生命周期](/react/044-EffectsLifecycleBestPractice) 的反模式清单。
- `qty_changed` 收编了「归零即移除」的隐式规则，组件里不会再出现「先判断再 dispatch」的重复代码。

## 4. 惰性初始化：initialState 很贵时

`useReducer(reducer, initialArg, init)` 的第三个参数把「从 initialArg 算出初始 state」推迟到首次渲染。适合初始状态需要读 localStorage 或做重量级计算的场景：

```tsx
function init(draftFromStorage: string): MessageState {
  const saved = window.localStorage.getItem('fandex-draft');
  return { messages: [], replyTo: null, draft: saved ?? draftFromStorage };
}

function MessageBoard() {
  // init 只在首次渲染执行一次；draftFromStorage 每次 render 都会作为参数传入但被忽略
  const [state, dispatch] = useReducer(messageReducer, '', init);
  // ...
}
```

- 不用惰性初始化而直接写 `useState(() => readHeavyInitialState())` 也可以，两者语义等价；但 reducer + init 的组合把「初始化」也收纳进状态逻辑文件，与转移规则放在一起。
- 注意 `init` 也必须是纯函数——StrictMode 双跑下它同样会被执行两次，不能在里面递增计数器。

## 5. reducer + Context：跨组件分发 action

reducer 解决「状态怎么变」，Context 解决「状态给谁用」。组合模式：reducer 与 state 留在顶层，`dispatch` 通过 Context 下发，叶子组件只 dispatch、不感知状态结构：

```tsx
const CartStateContext = createContext<CartState | null>(null);
const CartDispatchContext = createContext<React.Dispatch<CartAction> | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

export function useCartState() {
  const ctx = useContext(CartStateContext);
  if (!ctx) throw new Error('useCartState 必须在 CartProvider 内使用');
  return ctx;
}

export function useCartDispatch() {
  const ctx = useContext(CartDispatchContext);
  if (!ctx) throw new Error('useCartDispatch 必须在 CartProvider 内使用');
  return ctx;
}
```

设计取舍逐条说明：

- **state 与 dispatch 拆成两个 Context**。dispatch 的引用终生稳定，合在一个 Context 里会让只调用 `addItem` 的按钮组件也跟着 items 的每次变化重渲染；拆开后 dispatch 消费者完全不受状态更新影响。
- **自定义 Hook 里做 null 检查并抛错**。比起在每个组件里写 `useContext(...)!`，把「必须在 Provider 内」的约束收敛到一处，漏包 Provider 时在调用点立刻得到可读的错误信息。
- Context 全局状态方案的完整对比（何时该换 Zustand/Redux）见 [状态管理方案对比](/react/170-StateManagementSolutionComparison)；Context 本身的原理见 [Context 与全局状态](/react/050-ContextGlobalState)。

## 6. 动手实践

练习任务：为 FANDEX 阅读器的「稍后读」列表实现 reducer 版本。要求：

1. 状态含 `items: { articleId: string; title: string; addedAt: number }[]`；
2. 支持 `article_saved`、`article_removed`、`list_cleared` 三个 action；重复保存同一篇时不产生重复行（提示：静默忽略还是移到最前，选一种并写注释说明）；
3. 用 Vitest（不渲染组件）写 4 个用例：首次保存、重复保存、移除不存在项、清空后保存；
4. 写一个只消费 dispatch 的「保存」按钮组件，通过第 5 节的双 Context 模式接入。

提示：dispatch 回调引用稳定，按钮组件可以安全地用 `React.memo` 包裹；测试里构造初始 state 直接手写对象字面量即可，不需要经过 `useReducer`。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```tsx
// laterReadReducer.ts
export type LaterReadItem = { articleId: string; title: string; addedAt: number };
export type LaterReadState = { items: LaterReadItem[] };

export type LaterReadAction =
  | { type: 'article_saved'; articleId: string; title: string }
  | { type: 'article_removed'; articleId: string }
  | { type: 'list_cleared' };

export function laterReadReducer(state: LaterReadState, action: LaterReadAction): LaterReadState {
  switch (action.type) {
    case 'article_saved': {
      if (state.items.some((i) => i.articleId === action.articleId)) return state; // 重复保存静默忽略：保持原加入顺序，列表语义是「书签」不是「历史」
      return {
        items: [
          ...state.items,
          { articleId: action.articleId, title: action.title, addedAt: Date.now() },
        ],
      };
    }
    case 'article_removed':
      return { items: state.items.filter((i) => i.articleId !== action.articleId) }; // 移除不存在项天然是 no-op
    case 'list_cleared':
      return { items: [] };
  }
}
```

```ts
// laterReadReducer.test.ts —— 纯函数测试，无需渲染
import { describe, expect, it } from 'vitest';
import { laterReadReducer } from './laterReadReducer';

describe('laterReadReducer', () => {
  it('首次保存加入列表', () => {
    const next = laterReadReducer({ items: [] }, { type: 'article_saved', articleId: 'a1', title: 'Fiber 架构' });
    expect(next.items).toHaveLength(1);
    expect(next.items[0].articleId).toBe('a1');
  });

  it('重复保存不产生重复行', () => {
    const state = { items: [{ articleId: 'a1', title: 'X', addedAt: 0 }] };
    const next = laterReadReducer(state, { type: 'article_saved', articleId: 'a1', title: 'X' });
    expect(next).toBe(state); // 引用相等，React 会跳过重渲染
  });

  it('移除不存在项返回原状态', () => {
    const state = { items: [] };
    const next = laterReadReducer(state, { type: 'article_removed', articleId: 'ghost' });
    expect(next.items).toEqual([]);
  });

  it('清空后可以继续保存', () => {
    const cleared = laterReadReducer({ items: [{ articleId: 'a1', title: 'X', addedAt: 0 }] }, { type: 'list_cleared' });
    const next = laterReadReducer(cleared, { type: 'article_saved', articleId: 'a2', title: 'Y' });
    expect(next.items.map((i) => i.articleId)).toEqual(['a2']);
  });
});
```

```tsx
// SaveButton.tsx —— 只消费 dispatch
import { memo, useCallback } from 'react';
import { useLaterReadDispatch } from './LaterReadProvider'; // 以第 5 节模式为稍后读建双 Context

export const SaveButton = memo(function SaveButton({ articleId, title }: { articleId: string; title: string }) {
  const dispatch = useLaterReadDispatch();
  const handleSave = useCallback(
    () => dispatch({ type: 'article_saved', articleId, title }),
    [dispatch, articleId, title],
  );
  return <button onClick={handleSave}>稍后读</button>;
});
```

</details>

## 7. 常见陷阱速查

- **在 reducer 里改了原对象**：`state.items.push(x)` 或 `state.count++`。症状是界面不更新，DevTools 里 state 又「明明变了」。修法：所有变更加 `...` 展开或 `map`/`filter` 产生新引用。
- **switch 忘写 default 且 TypeScript 关了穷举检查**：新增 action 类型后旧 reducer 静默漏处理。修法：给 reducer 函数标显式返回类型，联合类型穷举缺失时 TS 会报「not all code paths return a value」。
- **把整个事件处理函数塞进 dispatch 回调**：`dispatch({ type: 'x', payload: doLotsOfSideEffects() })`——副作用在 render/事件期执行而非 reducer 内还好，但把重计算塞进 action 构造同样违背「action 是轻量事件报告」的约定，重活应放进 reducer（它是纯函数，可被打断、重放）。
- **以为 dispatch 会立刻更新 state**：`dispatch(...)` 后立刻读 `state` 拿到的是旧快照（本次渲染闭包里的值）。需要「更新后的值」时在 reducer 里完成联动，或在事件后用 `flushSync`（罕见）。

## 8. 小结

初学者要点：useReducer 三件套 state/action/reducer；action 报告「发生了什么」；reducer 是纯函数，返回新对象；相关字段联动规则收拢进 reducer。进阶注意：判别联合排除非法状态；惰性初始化读外部存储；reducer + 双 Context 下发 dispatch；派生数据现算不进 state。

## 下一步

- 状态结构的整体规划（哪些状态该提升、哪些该放组件内）见 [状态结构与提升](/react/035-StateStructureAndLifting)；
- 下一个 Hook 专篇是 [Effect 生命周期与「你可能不需要 Effect」](/react/044-EffectsLifecycleBestPractice)；
- 状态逻辑继续膨胀后的出路（信号、外部 store）见 [状态管理方案对比](/react/170-StateManagementSolutionComparison)。

## 参考与致谢

- react.dev *Extracting State Logic into a Reducer*（CC-BY 4.0）：https://react.dev/learn/extracting-state-logic-into-a-reducer
- react.dev *Scaling Up with Reducer and Context*（CC-BY 4.0）：https://react.dev/learn/scaling-up-with-reducer-and-context
