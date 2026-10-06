---
order: 70
title: Effect 生命周期与「你可能不需要 Effect」
module: 'react'
category: 前端技术
difficulty: beginner
description: 依赖数组语义、清理函数时序、useEffectEvent，以及官方反模式判例：链式 state、派生数据进 Effect、事件逻辑误放 Effect。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'react/040-HooksDeep'
  - 'react/042-UseReducerAndStateLogic'
  - 'react/075-ClientDataFetching'
  - 'react/030-StateEvent'
prerequisites: []
---

## 知识点地图

- **知识类别**：状态管理 / 逃生舱（对应 react.dev Learn 的 Sync with Effects 与 You Might Not Need an Effect 两个主题）。
- **解决什么问题**：Effect 是让组件与「React 之外的系统」保持同步的逃生舱——本地存储、WebSocket、订阅、非 React 组件。用错地方（把本该在事件里、渲染期做的事塞进 Effect）会导致多余的请求、闪烁与无限循环；本文同时教「怎么写对」与「什么时候根本不该写」。
- **什么时候用到**：数据获取、订阅外部数据源、同步到 localStorage、操作第三方 DOM 库。渲染期间能算出来的、用户事件触发的、纯派生的数据，都不需要 Effect。

本文承接 [Hooks 深入](/react/040-HooksDeep) 第 1 节 useEffect 的基础用法，向生命周期语义与官方反模式判例深化。例子使用 FANDEX 岛屿阅读器的本地存储同步与 WebSocket 订阅场景。

## 1. Effect 的生命周期：每个 Effect 是「一次同步」的循环

初学者把 Effect 理解成「挂载时执行一次的钩子」，这是最大的心智模型偏差。官方模型是：**Effect 的生命周期由它自己的依赖数组决定，与组件的生命周期无关**。每个 Effect 周期性地做同一件事——与外部系统同步：

```tsx
useEffect(() => {
  const connection = createConnection(islandId);
  connection.connect();       // 同步开始
  return () => {              // 同步结束（清理）
    connection.disconnect();
  };
}, [islandId]);
```

时序规则逐条说清：

- **首次渲染后**：执行 Effect 主体（connect）。
- **依赖变化后的重渲染**：React 先用**上一轮的依赖**跑清理函数（disconnect 旧连接），再用新依赖跑 Effect 主体（connect 新连接）。清理与重执行的顺序是「先收旧再开新」，不是「先开新再收旧」。
- **组件卸载时**：执行最后一次清理。
- **React 18 StrictMode 开发模式**：挂载后立刻「挂载 -> 清理 -> 再挂载」跑一遍，用于暴露缺失的清理函数。如果你的 Effect 双跑后出了问题（比如订阅重复、计数翻倍），说明清理函数没写对，而不是 StrictMode 的问题——修复方向永远是补全清理，不要想办法绕过双跑。

一个能验证时序的最小实验：

```tsx
useEffect(() => {
  console.log('connect', islandId);
  return () => console.log('disconnect', islandId);
}, [islandId]);

// islandId 从 'a' 切到 'b' 时，控制台顺序必然是：
// disconnect a   （先用旧依赖清理）
// connect b      （再用新依赖建立）
```

若把「清理」理解成「卸载才执行」，就会在这个实验里看到意外的输出顺序，从而写出依赖旧连接还活着的错误代码。

## 2. 依赖数组：React 用 `Object.is` 逐项比较

依赖数组的语义只有一句话：**Effect 内读到的所有「响应式值」（props、state、组件体内定义的变量与函数）都必须出现在依赖里**。React 不做深比较，只对数组每一项做 `Object.is`：

```tsx
// 三种写法的真实含义
useEffect(() => { sync(theme); }, [theme]);    // theme 原始值变化才重跑
useEffect(() => { sync(options); }, [options]); // options 是内联对象 -> 每次渲染都是新引用 -> 每次渲染都重跑
useEffect(() => { sync(); }, []);               // 只在挂载/卸载周期跑一次；但闭包里读到的是首次渲染的快照
```

易错点展开：

- **空数组不是「只跑一次」的开关，而是「闭包快照冻结」**。`[]` 里的 Effect 读 `theme` 读到的是首次渲染那一次的值。如果 ESLint 没报错，通常是因为读取被包装进了 ref 或 setter 回调；如果直接读了外部变量，`exhaustive-deps` 会警告。
- **对象/数组依赖**要么用 `useMemo` 稳定引用，要么把依赖拆成原始值（`[obj.a, obj.b]`）。把「每次渲染重建的对象」放进依赖等于没有依赖数组。
- **函数依赖**同理：组件体内定义的函数每次渲染都是新引用。Effect 里要调用的函数要么移进 Effect 内部，要么移到组件外（不依赖 state 时），要么用 `useCallback` 稳定。

### 2.1 清理函数的正确姿势

清理函数必须能「恢复世界到 Effect 运行前」：

```tsx
// 对：每次重跑前断开旧订阅，不存在叠加
useEffect(() => {
  const socket = new WebSocket(`wss://fandex.example/islands/${islandId}/live`);
  socket.onmessage = (e) => setLiveCount(JSON.parse(e.data).count);
  return () => socket.close();
}, [islandId]);

// 错：清理写了但没真的断开（onmessage 挂在新 socket 上，旧 socket 仍在推送）
useEffect(() => {
  const socket = new WebSocket(url);
  socket.onmessage = handleMessage;
  return () => { socket.onmessage = null; }; // 连接本身没关，泄漏
}, [url]);
```

第二条注释里的错误在岛屿切换时表现为「消息数跳动」：旧连接还在推数据，旧回调虽被置空，但 socket 层仍持有引用不释放。判断清理是否写全的土办法：把组件挂载/卸载一百次，看 DevTools 的 Network/WS 面板里连接数是否归零。

### 2.2 用 useEffectEvent 抽出「非响应式逻辑」（React 19 稳定化中）

有一类代码：Effect 内要调用，但它读的值**不应该**作为依赖（比如「每次收到消息都上报当前阅读位置」——上报动作需要读到最新 position，但 position 变化不该重启订阅）。React 19 的 `useEffectEvent`（实验名 `useEffectEvent`，早期称 `useEvent`）为此而生：

```tsx
useEffect(() => {
  const socket = new WebSocket(url);
  socket.onmessage = (e) => onLiveMessage(JSON.parse(e.data));
  return () => socket.close();
}, [url]); // 注意依赖里没有 position

// Effect Event：包一层「始终读到最新值」的函数，且不进入依赖数组
const onLiveMessage = useEffectEvent((msg: LiveMessage) => {
  reportReadingProgress(positionRef.current, msg); // 读最新 position 而不触发重订阅
  setLiveCount((c) => c + 1);
});
```

- Effect Event 函数必须在 Effect **内部或事件处理器**调用，不能在渲染期间调用，也不能传给子组件。
- 心智模型：它把「响应式逻辑」（依赖变化重跑）与「非响应式逻辑」（永远拿最新值）分开。没有它之前，社区的替代写法是把值同步进 ref，`useEffectEvent` 是这套手法的官方化。

## 3. 「你可能不需要 Effect」：官方判例清单

react.dev 用一整章列举 Effect 的误用。以下三个判例覆盖了 90% 的实际误用，每个都给「症状 - 病因 - 修法」。

### 3.1 判例一：链式 state（用 Effect 联动另一个 state）

症状：改一个字段后界面「闪一下旧值」——先渲染了不一致的中间态，再被 Effect 修正。

```tsx
// 反模式：把「联动」写成 Effect
const [firstName, setFirstName] = useState('林');
const [lastName, setLastName] = useState('岛民');
const [fullName, setFullName] = useState('');

useEffect(() => {
  setFullName(firstName + lastName); // 多渲染一次，且首帧 fullName 是空字符串
}, [firstName, lastName]);
```

病因：`fullName` 完全由另外两个 state 派生，是**渲染期就能算出来的数据**，不是需要「同步」的外部系统。Effect 版本造成两次渲染：第一次带着旧 fullName，第二次才被 Effect 修正。

```tsx
// 正确：渲染期间直接派生
const fullName = firstName + lastName;
```

派生计算昂贵时用 `useMemo`，但先量再优化——字符串拼接这种量级不值得 memo。FANDEX 岛屿里的实际例子：阅读进度百分比由 `scrollY / docHeight` 派生，直接在渲染时计算，不存 state。

### 3.2 判例二：派生数据 + 事件驱动的缓存写入进 Effect

症状：props 变了，列表却显示旧筛选结果，必须刷新页面才对。

```tsx
// 反模式：把 props 拷贝进 state 再用 Effect 同步
function VisibleList({ items, filter }: { items: Item[]; filter: string }) {
  const [visible, setVisible] = useState<Item[]>([]);

  useEffect(() => {
    setVisible(items.filter((i) => i.title.includes(filter))); // props -> state 的同步 = 多余状态源
  }, [items, filter]);
  // ...
}
```

病因：`items` 与 `filter` 已经是状态源，`visible` 只是它们的函数。维护两份状态源，就要为「同步」付费，且任何一条同步路径漏写（比如忘了依赖 `items`）就出现 stale 数据。

```tsx
// 正确：渲染期派生；贵计算才包 useMemo
function VisibleList({ items, filter }: { items: Item[]; filter: string }) {
  const visible = useMemo(
    () => items.filter((i) => i.title.includes(filter)),
    [items, filter],
  );
  return <List items={visible} />;
}
```

官方给的记忆口诀：**如果可以在渲染期间算出来，就不需要 Effect**。

### 3.3 判例三：事件逻辑误放 Effect

症状：用户点「购买」后，弹窗在页面加载时也弹了一次；或者发送分析的代码在组件挂载时执行了。

```tsx
// 反模式：把「用户提交成功后」的逻辑放进 Effect 监听 submitted 状态
const [submitted, setSubmitted] = useState(false);

useEffect(() => {
  if (submitted) {
    showToast('已提交');
    analytics.track('order_submitted'); // 这是事件的结果，不是状态的属性
  }
}, [submitted]);
```

病因：这段逻辑回答的问题是「**因为**用户提交了，**所以**要做什么」——因果关系由事件承载，Effect 却只能表达「状态是什么样」。Effect 版本还有两个附加缺陷：`submitted` 复位（比如表单可重复提交）时逻辑错乱；「是否已提交过 toast」需要额外的 state 去重。

```tsx
// 正确：事件处理器里直接做
function handleSubmit() {
  setSubmitted(true);
  showToast('已提交');
  analytics.track('order_submitted');
}
```

口诀：**这段逻辑是因为「用户做了什么」，还是因为「state 是什么」？前者进事件处理器，后者才考虑 Effect**。还有一类「知道某个 state 变化时」的需求（比如「岛屿 id 变了要上报」），如果连「变化前是什么」都不关心，那本质也是事件（id 变化的那一刻发生了切换事件），应挂在切换事件上而非 Effect 里。

## 4. 三种场景的完整例子

### 4.1 本地存储同步（合法的同步 Effect）

```tsx
function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const raw = localStorage.getItem('fandex-reader');
    return raw ? JSON.parse(raw) : { fontSize: 16, theme: 'light' };
  });

  useEffect(() => {
    localStorage.setItem('fandex-reader', JSON.stringify(settings));
  }, [settings]);

  return [settings, setSettings] as const;
}
```

- 初始化读存储放在 `useState` 的惰性初始化里（只跑一次），**不要**放在 Effect 里再 setState——那会多一次渲染且首帧闪默认值。
- Effect 负责单向「state -> 存储」同步，这正是 Effect 的本职：与 React 之外的系统（localStorage）保持同步。
- JSON.parse 可能抛错（用户手动改过存储），生产实现要 try/catch 兜底后回退默认值。

### 4.2 WebSocket 订阅（依赖变化驱动的重同步）

见第 2.1 节。补充一个易漏点：**断线重连不属于这个 Effect**。重连逻辑（指数退避重试）是独立关注点，塞进同一个 Effect 会让清理函数膨胀且依赖更难理清；常见做法是抽成自定义 Hook（完整模式见 [自定义 Hook 设计模式](/react/160-CustomHooksDesignPattern)）。

### 4.3 数据获取（竞态处理是必修课）

```tsx
useEffect(() => {
  let ignore = false; // 竞态护栏：只有最后一次发起的结果允许落地

  setLoading(true);
  fetch(`/api/islands/${islandId}/comments`)
    .then((res) => res.json())
    .then((json) => {
      if (!ignore) {
        setComments(json);
        setLoading(false);
      }
    });

  return () => {
    ignore = true;
  };
}, [islandId]);
```

- 快速切换 islandId 时，两个请求并发在途，先发后至的结果若不加护栏会覆盖新数据——`ignore` 标志是官方推荐的最小修法。
- 只清理 `ignore` 而不 AbortController 取消请求是可接受的折中：响应到达但被忽略，网络流量浪费一点，数据一定正确。要真正中断网络请求，用 `AbortController`（语义细节见 007-javascript 模块的 [Fetch API 与 AbortController](/javascript/440-FetchApiAndAbortController)）。
- 工程上请优先用框架/库的取数方案（React Query、路由 loader、RSC），手写 Effect 取数只是理解原理的最小样本，见 [客户端数据获取](/react/075-ClientDataFetching)。

## 5. useLayoutEffect：绘制前的同步窗口

`useLayoutEffect` 与 `useEffect` 的 API 完全一致，差异只在执行时机：它在 DOM 更新之后、浏览器**绘制之前**同步执行。只有一种场景需要它——**基于布局测量再改变布局，且不允许用户看到中间态**（如 tooltip 定位、防闪烁）：

```tsx
function Tooltip({ targetRect }: { targetRect: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const height = ref.current!.offsetHeight;
    ref.current!.style.top = `${targetRect.top - height - 8}px`; // 绘制前把位置摆正
  }, [targetRect]);

  return <div ref={ref} className="tooltip">悬停提示</div>;
}
```

- 若换成 `useEffect`，tooltip 会先画在默认位置（通常是左上角）再跳到正确位置，产生一帧闪烁。
- SSR 警告：`useLayoutEffect` 在服务端不执行，Next.js 会对它打 warning；只在确有测量需求的组件里用。能用 CSS 解决的定位（transform、anchor positioning）不要用 JS 测量。

## 6. 动手实践

练习任务：审查下面这个「最近阅读」组件，找出全部 Effect 误用并改写：

```tsx
function RecentReads({ userId }: { userId: string }) {
  const [reads, setReads] = useState<ReadItem[]>([]);
  const [count, setCount] = useState(0);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    fetch(`/api/users/${userId}/recent-reads`)
      .then((r) => r.json())
      .then((d) => {
        setReads(d);
        setCount(d.length);
      });
  }, [userId, reads]); // 提示：这里有一个依赖问题

  useEffect(() => {
    setCount(reads.length);
  }, [reads]);

  useEffect(() => {
    if (count > 0) setGreeting(`最近读过 ${count} 篇`);
  }, [count]);

  return <section>{greeting}<ul>{/* ... */}</ul></section>;
}
```

提示：共三处问题——一个依赖写错导致请求循环风险，一个派生数据 Effect，一个事件逻辑 Effect；`greeting` 还在首帧渲染为空串。

<details>
<summary>参考实现（先自己改，再展开对照）</summary>

```tsx
function RecentReads({ userId }: { userId: string }) {
  const [reads, setReads] = useState<ReadItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 修复一：依赖只留 userId。reads 是本 Effect 的写入目标，把它放回依赖会在 setReads 后
  // 触发清理 + 重跑 -> 死循环（或至少多余请求）。竞态护栏一并补上。
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(`/api/users/${userId}/recent-reads`)
      .then((r) => r.json())
      .then((d) => {
        if (!ignore) {
          setReads(d);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [userId]);

  // 修复二：count 是派生数据，渲染期现算，删掉整个 Effect。
  const count = reads.length;
  // 修复三：greeting 同为派生数据，且「读后欢迎语」不是状态属性——直接算。
  const greeting = count > 0 ? `最近读过 ${count} 篇` : '';

  if (loading) return <p>加载中...</p>;
  return (
    <section>
      {greeting && <h2>{greeting}</h2>}
      <ul>
        {reads.map((r) => (
          <li key={r.articleId}>{r.title}</li>
        ))}
      </ul>
    </section>
  );
}
```

自检：改完后组件里只剩一个 Effect（数据获取），三个 state 缩成两个（reads、loading），没有中间态闪烁。

</details>

## 7. 常见陷阱速查

- **Effect 无限循环**：Effect 内 setState 且该 state 在依赖里。多数情况是判例二的变体（用 Effect 派生数据），少数是「每次渲染新建的对象进了依赖」。
- **忘了清理事件监听/定时器**：StrictMode 双跑下立刻翻倍；生产里表现为切页后回调仍在触发。检查清单：addEventListener 配 removeEventListener、setInterval 配 clearInterval、订阅配退订、WebSocket 配 close。
- **清理函数里读了「最新」闭包值**：清理用的是上一轮渲染的闭包，`return () => console.log(count)` 打印的是那次 Effect 执行时的值，不是卸载时的值。
- **把「卸载时上报」写进清理**：开发模式 StrictMode 双跑会让它触发两次；上报类逻辑应放在页面级（visibilitychange / 路由钩子）而不是组件卸载。
- **依赖「少写」能跑就少写**：靠关掉 `exhaustive-deps` 让 Effect 少重跑，等于埋 stale closure 定时炸弹。要少跑，正确工具是 `useEffectEvent`（非响应逻辑）或把依赖收敛为原始值。

## 8. 小结

初学者要点：Effect 是与外部系统同步的循环，生命周期由依赖数组决定；清理函数先收旧再开新；渲染期能算的不用 Effect，事件引起的进事件处理器。进阶注意：竞态用 `ignore` 护栏；非响应逻辑用 `useEffectEvent`；测量布局才用 `useLayoutEffect`；数据获取优先框架方案。

## 下一步

- [Refs 与命令式逃生舱](/react/046-RefsAndImperativeHandle)：另一条逃生舱，操作 DOM 而不是外部系统；
- [条件渲染与保持组件纯粹](/react/112-ConditionalRenderingAndPurity)：渲染期纯度是「能不能用 Effect」判断的地基；
- [React Compiler 自动记忆化](/react/390-ReactCompilerAutoMemoization)：编译器如何减少手写 useMemo/useCallback。

## 参考与致谢

- react.dev *Synchronizing with Effects*（CC-BY 4.0）：https://react.dev/learn/synchronizing-with-effects
- react.dev *You Might Not Need an Effect*（CC-BY 4.0）：https://react.dev/learn/you-might-not-need-an-effect
- react.dev *useEffectEvent*（实验特性文档，CC-BY 4.0）：https://react.dev/reference/react/experimental_useEffectEvent
