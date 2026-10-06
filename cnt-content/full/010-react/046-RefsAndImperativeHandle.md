---
order: 80
title: Refs 与命令式逃生舱
module: 'react'
category: 前端技术
difficulty: beginner
description: ref 与 state 的选择、useRef 三种用途、ref 回调、useImperativeHandle 定制曝光面，以及 React 19 的 ref 即 prop。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'react/040-HooksDeep'
  - 'react/185-PortalAndImperativeDom'
  - 'react/044-EffectsLifecycleBestPractice'
prerequisites: []
---

## 知识点地图

- **知识类别**：逃生舱（对应 react.dev Learn 的 Referencing Values with Refs 与 Manipulating the DOM with Refs 两个主题）。
- **解决什么问题**：有些值的变化不需要触发重渲染（定时器句柄、上一次渲染的快照），有些 DOM 操作 React 声明式模型天然覆盖不了（聚焦、滚动、测量、播放控制）。ref 是 React 认可的「逃出渲染循环」通道：改它不触发渲染，渲染也不会意外改掉它。
- **什么时候用到**：保存可变但不影响界面的值；读取/操作 DOM 节点（focus、scrollIntoView、getBoundingClientRect）；向父组件暴露子组件的命令式方法。**反过来说**：任何「改了要反映在界面上」的数据都属于 state，用 ref 存它会得到「改了但界面不动」的诡异行为。

本文承接 [Hooks 深入](/react/040-HooksDeep) 第 2 节 useRef 的内容并扩为专篇。测量/滚动/ResizeObserver 等工程模式在 [Portal 与命令式 DOM](/react/185-PortalAndImperativeDom) 展开，本篇专注心智模型与 API。例子沿用 FANDEX 岛屿阅读器主线。

## 1. 心智模型：ref 是「不受 React 管理的盒子」

对比 state 与 ref 的本质差异：

| | state | ref |
| --- | --- | --- |
| 修改后 | 触发重渲染 | 什么都不发生 |
| 更新时机 | 下一次渲染可见 | 立即可读（同步） |
| 适用数据 | 界面呈现所需 | 界面不关心的过程数据 |
| 修改位置 | 事件处理器 / Effect 等 | 任意处（渲染期除外） |

```tsx
const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

function startTimer() {
  timerRef.current = setInterval(tick, 1000); // 界面不需要「知道」interval 的存在
}
function stopTimer() {
  clearInterval(timerRef.current);            // 但清理时必须拿到它
}
```

为什么 `setInterval` 的句柄该用 ref 而不是 state：句柄只是一个数字，界面上没有任何地方渲染它；用 state 存会为每次赋值白白付一次重渲染，还会因「渲染期读旧值」引发误清理。**判别口诀：渲染输出用不用这个值？用 -> state；不用 -> ref。**

第三条纪律同样重要：**不要在渲染期间读写 ref（初始化除外）**。并发渲染中组件函数可能被打断重跑，渲染期修改 ref 会产生「跑了几次就加了几次」的脏数据；渲染期读 ref 则可能让两次渲染输出不一致，破坏 React 的纯度假设（渲染纯度详见 [条件渲染与保持组件纯粹](/react/112-ConditionalRenderingAndPurity)）。读写 ref 的合法位置是事件处理器与 Effect。

## 2. ref 与 DOM：从声明到挂载的时序

```tsx
function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus(); // 挂载后自动聚焦
  }, []);

  return <input ref={inputRef} placeholder="搜索岛屿..." />;
}
```

时序与易错点逐条说明：

- **ref 在 commit 阶段（DOM 建立后、Effect 运行前）就被填充**。因此在 `useLayoutEffect` 与 `useEffect` 里都能读到节点；但在「渲染期间」读 `inputRef.current` 是 `null`——JSX 还没变成 DOM。
- **条件渲染的节点，ref 只在该节点存在时被赋值**。`{open && <input ref={inputRef} />}` 关闭后 `inputRef.current` 回到 `null`，再打开会重新赋值。在节点可能不存在的地方读 ref 必须 `?.` 或判空，直接 `inputRef.current.focus()` 会得到 `Cannot read properties of null`——这是 ref 相关报错的头号来源。
- **列表中的 ref**：`ref={inputRef}` 写在 `map` 里只会有一个节点「赢」。需要引用多个节点时用 ref 回调（见第 4 节）。
- 不要把 ref.current 当渲染依据：`<div>{inputRef.current?.value}</div>` 读到的是上次渲染时恰好残留的值，且节点更新不会触发重渲染去刷新它。

### 2.1 React 19：ref 成为普通 prop

React 18 时代，函数组件默认不认识 `ref` 这个 prop，要透传必须包 `forwardRef`：

```tsx
// React 18：ref 不是普通 prop，需要 forwardRef 转发
const FancyInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));

// React 19：函数组件的 ref 与其他 prop 同等待遇
function FancyInput({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

- 迁移提示：`forwardRef` 依然可用（未废弃），新代码直接用函数参数解构 `ref` 即可；类组件行为不变。
- 「ref 作为 prop」与「ref 透传到 DOM」是两回事：上例中 `FancyInput` 的 `ref` prop 被你显式放到了 `<input ref={ref}>` 上；不放置的话这个 ref 只是一个普通参数，父组件拿不到任何节点。

## 3. useImperativeHandle：只暴露该暴露的方法

把整个 DOM 节点交给父组件（`ref` 直指 `<input>`）等于把内部结构变成了公共 API——父组件可以 `ref.current.style.display = 'none'` 做任何事，子组件日后重构（换掉 input）就破坏了调用方。`useImperativeHandle` 让子组件自定义「通过 ref 暴露什么」：

```tsx
type VideoPlayerHandle = {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
};

const VideoPlayer = forwardRef<VideoPlayerHandle, { src: string }>(function VideoPlayer(
  { src },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      // 暴露的是受控的命令面，不是 <video> 本身
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (s: number) => {
        if (videoRef.current) videoRef.current.currentTime = s;
      },
    }),
    [], // 与 useMemo 相同的依赖语义：handle 对象在依赖不变时保持同一引用
  );

  return <video ref={videoRef} src={src} />;
});

// 父组件
function CoursePage() {
  const playerRef = useRef<VideoPlayerHandle>(null);
  return (
    <>
      <VideoPlayer ref={playerRef} src="/intro.mp4" />
      <button onClick={() => playerRef.current?.seek(30)}>跳到 30 秒</button>
    </>
  );
}
```

逐条解释设计取舍：

- **类型即契约**：`VideoPlayerHandle` 明确列出外部能做的三件事。若直接暴露 `HTMLVideoElement`，调用方迟早用到 `duration`、`volume` 等内部细节，之后换播放器实现就是全库破坏性变更。
- **依赖数组控制 handle 的重建**：handle 闭包捕获了 `videoRef`（引用稳定），所以 `[]` 足够；若 handle 里读了会变的 props/state，必须把它们列进依赖，否则父组件拿到的是过期快照——这与 `useMemo` 的陷阱一模一样。
- **React 19 下也可以不用 forwardRef**：函数参数解构 `ref` 后同样传给 `useImperativeHandle(ref, ...)`。
- 何时不该用它：如果「命令」其实是状态变化（暂停/播放状态要在界面上显示），正确模型是把状态提升为 props，让数据流单向驱动；useImperativeHandle 只留给「界面无关的命令」（focus、scrollIntoView、进入全屏）。

## 4. ref 回调：多节点与清理需求

当需要引用动态数量的节点、或在节点挂载/卸载时执行逻辑，用函数形式的 ref：

```tsx
function ChapterNav({ sections }: { sections: Section[] }) {
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const setItemRef = useCallback((id: string) => {
    return (node: HTMLElement | null) => {
      if (node) itemRefs.current.set(id, node);
      else itemRefs.current.delete(id); // 卸载时清理，防 Map 无限膨胀
    };
  }, []);

  return (
    <ul>
      {sections.map((s) => (
        <li key={s.id}>
          <a
            ref={setItemRef(s.id)}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              itemRefs.current.get(s.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
```

- ref 回调的参数是节点本身，返回 `null` 时 React 19 会把它当 cleanup 函数调用（React 18 中返回非函数值会警告）。
- **每次渲染传「新的函数引用」会导致 ref 回调先以 null 调用一次再以节点调用一次**——所以上面用 `useCallback` 稳定外层工厂。忘了稳定就表现为回调反复触发，测 DOM 相关逻辑时特别迷惑。
- `Map` 收集 + 卸载删除是官方推荐的多节点收集模式；用数组按索引收集会在列表重排时错位（key 才是身份，索引不是）。

## 5. 三个不同场景的完整例子

### 5.1 焦点管理：模态框关闭后归还焦点

无障碍与键盘流的刚需：打开对话框前记住焦点位置，关闭后把焦点还回去，否则键盘用户「丢失」在页面顶部。

```tsx
function CommandPalette({ open }: { open: boolean }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null; // 打开时记录
    inputRef.current?.focus();
    return () => previous?.focus(); // 关闭时归还
  }, [open]);

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)}>打开命令面板</button>
      {open && <dialog open><input ref={inputRef} /></dialog>}
    </>
  );
}
```

`document.activeElement` 是浏览器状态，属于「React 之外的系统」，在 Effect 里读取与恢复正是 Effect 的本职（见 [Effect 生命周期](/react/044-EffectsLifecycleBestPractice)）。

### 5.2 防抖「是否已提交」标记：跨渲染的过程标志

表单里「离开页面前提示未保存」需要知道「提交过后不再提示」，这个布尔值不渲染，用 ref 避免多余渲染：

```tsx
function CommentEditor({ articleId }: { articleId: string }) {
  const [dirty, setDirty] = useState(false);   // 界面要显示「未保存」角标 -> state
  const submittedRef = useRef(false);          // 界面不需要知道 -> ref

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !submittedRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  async function handleSubmit() {
    await saveDraft(articleId);
    submittedRef.current = true; // 同步生效：紧随其后的跳转不会被自己拦截
    setDirty(false);
  }
  // ...
}
```

细节：若把 `submitted` 存成 state，`handleSubmit` 里赋值后立刻触发的 `beforeunload` 读到的还是旧闭包里的 `false`（state 更新要等下一次渲染）；ref 是同步可变的，这里必须用 ref。这正是「渲染输出用不到 -> ref」口诀的反向应用。

### 5.3 与第三方 DOM 库共存

图表库、编辑器（CodeMirror、Monaco）的初始化 API 要求一个真实 DOM 节点：

```tsx
function FandexChart({ data }: { data: Point[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null); // 库实例：不渲染，但 Effect 间要共享

  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = createChart(containerRef.current, data); // 挂载后初始化一次
    return () => {
      chartRef.current?.destroy(); // 卸载必须销毁，否则实例与监听泄漏
      chartRef.current = null;
    };
  }, []); // data 变化不重建：用另一个 Effect 走库的 update API

  useEffect(() => {
    chartRef.current?.update(data);
  }, [data]);

  return <div ref={containerRef} style={{ height: 320 }} />;
}
```

两个 Effect 分工明确：`[]` 依赖负责「创建/销毁」（生命周期级），`[data]` 依赖负责「增量更新」（数据级）。合并成一个 Effect（把 data 放进第一个依赖）会每次数据变化都销毁重建图表，闪烁且浪费。

## 6. 动手实践

练习任务：实现一个 `useAutoFocusOnOpen` 组合能力——FANDEX 岛屿设置弹层要求：打开时聚焦第一个输入框；Esc 关闭；关闭后焦点归还触发按钮。要求：

1. 弹层组件 props 为 `{ open: boolean; onClose: () => void; title: string }`；
2. 用两个 ref + 一个 Effect 完成；注意 `open` 为 false 时 Effect 要提前返回且不能持有过期节点；
3. 思考题：如果用户在弹层打开期间手动把焦点移到了别的元素，「归还焦点」还应该执行吗？你的实现行为是什么？

提示：归还焦点存的是 `HTMLElement | null`，清理函数里判空；Esc 监听挂在 `keydown` 上，注意清理。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```tsx
function SettingsDialog({ open, onClose, title }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // 思考题答案：无条件归还可能把焦点「抢」回按钮，打断用户。工程上常见的折中是
      // 仅当焦点仍在弹层内（或已被移到 body）时才归还：
      const stillInside =
        document.activeElement === document.body ||
        triggerRef.current?.contains(document.activeElement);
      if (stillInside) previousFocus?.focus();
    };
  }, [open, onClose]);

  return (
    <>
      <button ref={triggerRef} onClick={() => open || onClose() /* 实际由父组件控制 open */}>
        打开设置
      </button>
      {open && (
        <dialog open aria-label={title}>
          <input ref={firstFieldRef} placeholder="字体大小" />
          <button onClick={onClose}>关闭</button>
        </dialog>
      )}
    </>
  );
}
```

自检：StrictMode 双跑下监听不会翻倍（有清理）；弹层关闭后焦点回到触发按钮；Esc 与点击关闭共用同一条路径。

</details>

## 7. 常见陷阱速查

- **渲染期读写 ref.current**：并发渲染下产生双计数与不一致输出。读写只放事件处理器与 Effect。
- **ref 改了没反应**：把「界面要显示的数据」放进了 ref。转成 state；反过来「改了触发渲染但不该触发」的，才从 state 换成 ref。
- **直接 `.current.focus()` 没判空**：条件渲染的节点在隐藏期是 `null`。统一 `?.` 或在 Effect 里确认存在。
- **ref 回调不稳定**：内联箭头函数每次渲染都会让 React 以 null、节点各调一次。用 `useCallback` 包一层。
- **对 forwardRef 组件传 ref 却没接**：React 19 前会在控制台警告函数组件不接受 ref；子组件要显式消费 ref（直传 DOM 或 useImperativeHandle）。
- **用 ref 存「上一次渲染的值」却忘了写入时机**：常见模式 `usePrevious` 把赋值放在 `useEffect`（提交后写入），若放在渲染期写入会读到「本次」而非「上次」。

## 8. 小结

初学者要点：ref 是不触发渲染的可变盒子，渲染输出用不到的数据才用 ref；DOM ref 在 commit 后可用，条件渲染要判空；向父组件暴露命令用 useImperativeHandle 定义契约。进阶注意：React 19 的 ref 即 prop；多节点收集用 ref 回调 + Map；第三方库实例存 ref、初始化与更新拆成两个 Effect。

## 下一步

- [Portal 与命令式 DOM](/react/185-PortalAndImperativeDom)：测量、滚动定位与 ResizeObserver 的工程模式；
- [Effect 生命周期与「你可能不需要 Effect」](/react/044-EffectsLifecycleBestPractice)：Effect 与 ref 是一对逃生舱，判断题常在两者之间；
- [Hooks 原理](/react/150-HooksPrinciple)：ref 与 state 在 Fiber 上的真实存储位置。

## 参考与致谢

- react.dev *Referencing Values with Refs*（CC-BY 4.0）：https://react.dev/learn/referencing-values-with-refs
- react.dev *Manipulating the DOM with Refs*（CC-BY 4.0）：https://react.dev/learn/manipulating-the-dom-with-refs
- react.dev *useImperativeHandle*（CC-BY 4.0）：https://react.dev/reference/react/useImperativeHandle
- React 19 Upgrade Guide（MIT）：https://react.dev/blog/2024/12/05/react-19
