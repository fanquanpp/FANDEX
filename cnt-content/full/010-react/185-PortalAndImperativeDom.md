---
order: 200
title: Portal 与命令式 DOM 操作
module: 'react'
category: 前端技术
difficulty: intermediate
description: 从给 FANDEX 命令面板做弹层的场景学会 createPortal、Portal 的事件冒泡规则与 SSR 注意点，以及用 ref 做测量、滚动、ResizeObserver 等命令式 DOM 操作的正确姿势。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'react/040-HooksDeep'
  - 'react/020-ComponentProps'
  - 'react/420-React19NewAPI'
prerequisites:
  - 'react/040-HooksDeep'
---

## 前置知识

- [Hooks 深入](/react/040-HooksDeep)：会用 useRef 拿 DOM、知道 ref 的 .current 更新不触发渲染

## 学习目标

- 用 `createPortal` 把弹层渲染到任意 DOM 节点，并说清 Portal 的事件冒泡走的是 React 树而不是 DOM 树
- 用 ref 完成测量（getBoundingClientRect）、监听（ResizeObserver）、滚动（scrollIntoView）、样式微调四类命令式操作
- 知道 SSR 环境下 Portal 与 document 访问的安全写法

## 场景：命令面板的弹层为什么跑到了布局里面

FANDEX 网页端有一个命令面板（Ctrl+K 呼出的全局搜索）：一个浮在页面中上层的搜索弹窗，遮罩盖住全屏。第一版实现直接把弹窗 JSX 写在 `Layout.astro` 里的 React 岛屿内，结果踩了三个坑：

1. 弹窗被父容器的 `overflow: hidden` 裁掉了下半截；
2. 父级的 `transform` 让 `position: fixed` 的定位参照物变成了父容器而不是视口；
3. 弹窗夹在文档流中间，z-index 怎么调都压不住后面的层。

这三个问题共同的根源：弹层的 DOM 位置和「它应该在视觉上的位置」不一致。解决方案就是 Portal——DOM 层级上逃离父容器，React 树层级上保持原位。

## 一、createPortal：DOM 逃逸，React 不逃

### 动手：把弹层送进 body

```tsx
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

function CommandPalette({ open }: { open: boolean }) {
  const [query, setQuery] = useState('');

  if (!open) return null;

  // 第一个参数：要渲染的 React 节点
  // 第二个参数：真实的 DOM 容器
  return createPortal(
    <div className="palette-overlay">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索文档、算法、组件..."
      />
      <ul>{/* 结果列表 */}</ul>
    </div>,
    document.body
  );
}
```

Portal 渲染后，`palette-overlay` 的 DOM 挂在 `<body>` 下，摆脱了所有祖先的 overflow / transform / 层叠上下文；而在 React 组件树里，`CommandPalette` 还在原来的位置——props、Context、错误边界都按原树生效。

### 最反直觉的规则：事件仍按 React 树冒泡

Portal 里的元素点击时，事件沿**React 组件树**向上冒泡，不是沿 DOM 树：

```tsx
function Layout() {
  return (
    <div onClick={() => console.log('Layout 捕获到点击')}>
      <CommandPalette open={true} />
      {/* 点击弹层内部，这里也会触发！ */}
    </div>
  );
}
```

这是特性不是 bug：父组件能继续监听子组件的所有事件，哪怕子组件渲染到了 body 下。反过来，如果你不想让点击冒到布局层，在 Portal 内容里 `e.stopPropagation()`。

但注意：**原生 DOM 事件**（比如 `document` 上的 click 监听器做「点击外部关闭」）看到的是 DOM 树。做 outside-click 关闭时，判断目标元素是否在弹层内的逻辑要用 `overlayRef.current.contains(e.target)`，别只判断 React 树关系。

### 完整弹窗：遮罩关闭与内容区拦截

```tsx
function Dialog({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog"
        onClick={(e) => e.stopPropagation()} // 点内容区不关
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
```

### Portal 渲染到具名容器

第二个参数不一定是 body，可以是任意 DOM 节点。典型场景：Tooltip 渲染到最近的定位容器里跟随目标元素：

```tsx
function Tooltip({ target, children }: {
  target: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []); // 等客户端挂载完成

  if (!mounted || !target.current) return null;

  return createPortal(
    <div className="tooltip">{children}</div>,
    target.current
  );
}
```

## 二、SSR 环境：document 不存在的时候

服务端渲染（或 Astro 这类静态生成）时没有 `document`，直接调用 `createPortal(children, document.body)` 会在服务端抛错。安全写法：

```tsx
function SafePortal({ children }: { children: React.ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // 只在客户端执行，此时 document 一定存在
    setContainer(document.body);
  }, []);

  // 服务端和首帧渲染 null，挂载后改渲染 Portal
  return container ? createPortal(children, container) : null;
}
```

用 state 而不是 `typeof document !== 'undefined'` 的直接判断，好处是把「客户端才挂载」变成一次显式渲染提交，避免服务端与客户端首帧输出不一致导致的水合警告。FANDEX 的岛屿默认走静态生成，弹层类组件都应该按这个模式写。

## 三、用 ref 做命令式 DOM 操作

声明式 React 管不了的少数场景——测量、滚动、第三方图表库挂载——就该用 ref 直接操作 DOM。`useRef` 的基本用法在 [Hooks 深入](/react/040-HooksDeep) 已讲过，这里聚焦四类高频操作。

### 1. 测量：读取元素的位置与尺寸

```tsx
function MeasureExample() {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const measure = () => {
    const rect = btnRef.current!.getBoundingClientRect();
    setPos({ x: rect.left, y: rect.top });
  };

  return <button ref={btnRef} onClick={measure}>测量我的位置</button>;
}
```

时机要点：`getBoundingClientRect` 要在元素真实渲染后调用——事件回调里随时可调；若在 effect 里做初次测量，用 `useLayoutEffect`（DOM 更新后、浏览器绘制前同步执行），用 `useEffect` 会闪一帧。

### 2. 监听尺寸变化：ResizeObserver

窗口 resize 有 `window.onresize`，但容器尺寸变化（侧边栏折叠、字体加载完成）只有 ResizeObserver 能捕获：

```tsx
import { useEffect, useRef, useState } from 'react';

function AutoWidthChart({ children }: { children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    if (boxRef.current) observer.observe(boxRef.current);
    return () => observer.disconnect(); // 清理，防止内存泄漏
  }, []);

  return (
    <div ref={boxRef} style={{ width: '100%' }}>
      <div data-width={Math.round(width)}>{children}</div>
    </div>
  );
}
```

### 3. 滚动控制

```tsx
// 平滑滚动到底部（消息列表自动跟随）
listRef.current?.scrollTo({
  top: listRef.current.scrollHeight,
  behavior: 'smooth',
});

// 让某个列表项滚进视口（搜索结果定位）
itemRef.current?.scrollIntoView({
  behavior: 'smooth',
  block: 'nearest', // 不可见才滚，已经可见则不动
});
```

`block: 'nearest'` 值得记住：默认的 `'start'` 会强行把元素顶到视口开头，长列表里定位第 50 项时体验很差。

### 4. 样式微调与类名切换

拖拽、跟随鼠标这类高频更新，走 state 会让 React 每帧重渲染；直接改 style 是合理的例外：

```tsx
function Draggable() {
  const boxRef = useRef<HTMLDivElement>(null);

  const onPointerMove = (e: React.PointerEvent) => {
    // 高频路径：直接写 DOM，绕过 React 渲染
    boxRef.current!.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  };

  return (
    <div ref={boxRef} onPointerMove={onPointerMove} className="box" />
  );
}
```

类名切换同理 `boxRef.current.classList.add('active')`。但边界要划清：**内容、结构、影响布局结果的样式仍走 state/props**，只有「纯视觉、高频、不影响逻辑」的更新才直接碰 DOM。

## 坑点清单

1. Portal 渲染后事件沿 React 树冒泡——父组件的 onClick 会收到弹层里的点击；不想让冒泡就在弹层内 stopPropagation，同时 outside-click 判断要用 DOM contains。
2. `ref.current` 在首次渲染时是 null，访问 DOM 一律放 effect 或事件回调；React 19 的 ref 回调可以返回清理函数，卸载时自动执行。
3. `position: fixed` 的参照物会被祖先的 `transform` 劫持——这正是必须用 Portal 的原因之一。
4. ResizeObserver / 第三方库实例都要在 effect 的清理函数里断开 / 销毁，StrictMode 下 effect 双执行会暴露所有漏清理的写法。
5. SSR / 静态生成环境里所有 `document` 访问都必须发生在 effect 内。

## 自检

1. Portal 渲染的节点，真实 DOM 挂在哪里？Context 还能读到吗？
2. 点击弹层遮罩关闭、点击内容区不关闭，代码怎么写？用到了事件的哪两个知识？
3. 为什么初次测量元素尺寸要用 useLayoutEffect？
4. 拖拽场景为什么绕过 state 直接改 style？边界在哪？

## 练习

1. 给一个静态页面加「回到顶部」浮动按钮：`scrollTo` 平滑滚动，滚动超过一屏才显示（监听滚动或用 IntersectionObserver）。
2. 实现一个 Dialog 组件：Portal 到 body、遮罩点击关闭、Escape 键关闭（监听 keydown）、打开时锁定 body 滚动（改 document.body.style.overflow）。
3. 写一个「悬浮操作条」：选中文本时，读取选区的 getBoundingClientRect，把操作条 Portal 到 body 并定位到选区上方（类似 Notion 的划词工具栏）。

## 下一步

- [Hooks 深入](/react/040-HooksDeep)：useRef 与 ref 回调的完整语义
- [React 19 新增 API](/react/420-React19NewAPI)：ref 作为 prop 传递的新写法
- [性能优化](/react/180-ReactPerformance)：什么时候命令式 DOM 是性能优化手段
