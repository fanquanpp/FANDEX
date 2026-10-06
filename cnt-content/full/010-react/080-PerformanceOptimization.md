---
order: 130
title: 性能优化：先测量，再动刀
module: 'react'
category: 前端技术
difficulty: advanced
description: 从 FANDEX 收藏夹页「敲字全页卡、首屏包大、滚动掉帧」三宗罪讲起：用 Profiler 定位无关重渲染，memo 与稳定引用配套修复，lazy 加 Suspense 做代码分割，@tanstack/react-virtual 治长列表，附 memo 失效三连与 useMemo 滥用两则调试实录。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'react/070-ReactRouterRouting'
  - 'react/130-ConcurrentRendering'
  - 'react/180-ReactPerformance'
  - 'react/390-ReactCompilerAutoMemoization'
prerequisites:
  - 'react/070-ReactRouterRouting'
---

## 前置知识

- [路由与数据获取](/react/070-ReactRouterRouting)：有带数据列表的页面可改；
- [状态与事件](/react/030-StateEvent)：熟悉 useState 与组件重渲染的触发条件。

## 学习目标

读完本文你将能够：

1. 用 React DevTools Profiler 录制一次交互，读火焰图找出「谁在无谓重渲染」；
2. 正确配套 memo + useCallback/useMemo，并说出 memo 失效的三个常见原因；
3. 用 lazy + Suspense 把重组件（编辑器、图表）挪出首屏包；
4. 用 @tanstack/react-virtual 把万级列表的 DOM 数量压到可视区几十条；
5. 建立「先测量再优化」的纪律，知道 React Compiler 时代哪些手写优化可以省。

预计 60 到 80 分钟。

## 1. 你现在要解决什么问题

FANDEX 收藏夹页上线后收到三类反馈，都指向同一个页面：

- **敲字全页卡**：顶部搜索框每敲一键，页面上包括页脚在内的所有组件都跟着重渲染；
- **首屏包大**：为了文末一张统计图，整个 ECharts（约 1MB）被打进了首屏 JS，弱网下白屏两秒；
- **滚动掉帧**：收藏了 5000 条文档，全部渲染成 DOM，滚动时帧率掉到个位数。

新手面对「卡」的第一反应是到处加 useMemo。本篇的立场相反：**先测量，找到确切的病灶，再对症下药。** 三宗罪对应三把刀：无关重渲染（memo 系）、首屏体积（代码分割）、DOM 过量（虚拟化）。顺序别乱——先诊断，后开刀。

## 2. 第一步永远是测量：Profiler 火焰图

React DevTools 浏览器扩展里有 Profiler 面板：点录制、在页面上敲几个字、停止，得到一张火焰图。读法两条：

- **每次 commit 一根柱**，柱宽是该次提交的渲染总耗时，颜色越黄越贵；
- 点开一根柱，能看到**本次渲染了哪些组件、各花多久、为什么渲染**（props 变了 / state 变了 / 父组件渲染了）。

预期发现：敲一键，Root 整棵子树亮起，其中 99% 的组件 props 根本没变——它们重渲染只是因为「父组件渲染了」。这就是 React 的默认行为：**父组件渲染，所有子组件跟着渲染**，除非有东西拦住它。

需要更精细的数据时用编程式 Profiler 包住目标区域，onRender 回调能拿到每次渲染的耗时：

```jsx
import { Profiler } from 'react';

function onRender(id, phase, actualDuration) {
  console.log(`${id} ${phase}：${actualDuration.toFixed(2)}ms`);
}

<Profiler id="FavoritesGrid" onRender={onRender}>
  <FavoritesGrid docs={filtered} />
</Profiler>
```

注意：所有性能数据必须在**生产构建**（npm run build 后的产物）里采集，开发模式的额外检查会严重失真。

## 3. 卡点一：无关重渲染——memo 与稳定引用必须配套

治「父渲染带崩全家」的药是 memo：props 浅比较不变就跳过渲染。

```jsx
import { memo } from 'react';

const DocCard = memo(function DocCard({ doc, onOpen }) {
  return (
    <button className="card" onClick={() => onOpen(doc.id)}>
      {doc.title}
    </button>
  );
});
```

单独吃这副药无效。FavoritesGrid 里每次渲染都会重建 `onClick={() => onOpen(doc.id)}`——**新函数引用**，浅比较必然不等，memo 白包。所以 memo 永远和稳定引用配套：

```jsx
function FavoritesGrid({ docs, onOpen }) {
  return docs.map((doc) => (
    <DocCard key={doc.id} doc={doc} onOpen={makeOpener(onOpen, doc.id)} />
  ));
}
```

更常见的是把过滤计算与回调分别缓存：

```jsx
const filtered = useMemo(
  () => docs.filter((d) => d.title.includes(query)),
  [docs, query]
);
const handleOpen = useCallback((id) => openDoc(id), []);
```

useMemo 缓存计算结果（依赖不变不重算），useCallback 缓存函数引用（本质是 `useMemo(() => fn, deps)`）。两把工具的真实用途只有一个：**给 memo 的浅比较供应稳定输入**。脱离 memo 的 useMemo 大多是心理安慰——算一个 `query.length` 也要缓存，维护成本比收益高。

比 memo 更根本的一招是**状态下放**：搜索词只被输入框和列表用，就把这个 state 挪进只包含它俩的子组件，页脚和导航从此与敲字无关——不渲染才是最快的优化。反过来，把高频状态隔离到独立小组件（受控输入自己持有 state），父组件树就能保持安静。

## 4. 卡点二：首屏包大——lazy 把重组件挪出去

统计图只在滚动到文末才需要，却在首屏占 1MB。代码分割让它在需要时才下载：

```jsx
import { lazy, Suspense } from 'react';

const StatsChart = lazy(() => import('./StatsChart')); // 单独一个 chunk

function ArticleFooter() {
  return (
    <Suspense fallback={<div className="chart-skeleton" />}>
      <StatsChart data={stats} />
    </Suspense>
  );
}
```

`lazy(() => import(...))` 把组件切成独立 chunk，首次渲染到它时才拉取，Suspense 的 fallback 兜住等待期。路由级同理——每个页面一个 chunk，用户只下载访问的页：

```jsx
const Home = lazy(() => import('./pages/Home'));
const Lab = lazy(() => import('./pages/Lab'));
```

判断哪些组件值得分割的标准很简单：**体积大 + 不在首屏视口内**。FANDEX 网页端的做法同源——Astro 页面主体静态渲染，前端实验室的代码编辑器做成独立 React 岛屿，按需加载；SPA 里 lazy + Suspense 达成同一目标。配套检查打包产物（Vite 用 rollup-plugin-visualizer），确认大块头确实被切出去了。

## 5. 卡点三：长列表——虚拟化只渲染看得见的

5000 条全渲染 = 上万 DOM 节点，浏览器布局与绘制先崩。虚拟化的思路：**容器只渲染可视区附近的几十条，滚出视口的回收**，滚动时窗口平移。

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

function VirtualList({ items }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,   // 每行预估高度
    overscan: 5,              // 视口外多渲染几条，防滚动露白
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${row.start}px)`,
              height: row.size,
              width: '100%',
            }}
          >
            <DocCard doc={items[row.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

预期行为：无论 items 是 500 还是 50000 条，实际存在的 DOM 节点恒定在 20 条上下，滚动帧率稳定。代价是 SSR 首屏拿不到完整列表、浏览器内搜索（Ctrl+F）搜不到没渲染的行——虚拟化不是免费的，确认列表真的长（经验值：几百条以上、出现可测量的掉帧）再上。几百条以内的列表，先把 memo 配套做好就够了。

## 6. React Compiler：2026 年的手写优化还剩多少

React Compiler（1.0 已稳定）在编译期自动插入 memo 等价物：组件自动记忆化，上面的 useCallback/useMemo/memo 大多可以不写。那还学不学？学——两个理由：

1. **排查旧代码**：存量项目、第三方组件库仍靠手写优化，你得看得懂、改得动；
2. **原理不变**：编译器优化的正是「引用稳定供浅比较」这件事，状态下放、代码分割、虚拟化这些结构性优化它替不了。

启用方式与渐进迁移、安全网见 [React Compiler 自动记忆化](/react/390-ReactCompilerAutoMemoization)。

## 7. 修改实验

实验一：在收藏夹页装 Profiler 录制「敲五个字」，记录渲染组件数与最贵 commit 耗时；做状态下放后重录，对比两份数据——用数字验证优化，不靠体感。

实验二：给 DocCard 配齐 memo + 稳定回调，再故意把 onOpen 换回内联箭头函数，用 Profiler 验证 memo 失效——亲手制造一次「白包」。

实验三：把 StatsChart 从静态 import 改 lazy，构建后在 Network 面板确认它变成独立 chunk 且首屏不加载；再把图表下方另一小组件也 lazy 化。

## 8. 常见错误与调试实录

**错误一：memo 失效三连。** 包了 memo 子组件照样每次渲染。三种最常见的原因，逐个排查：

1. **内联对象/数组**：`<Card style={{ padding: 8 }} tags={['a']} />` 每次渲染新引用——常量提到组件外，或 useMemo；
2. **内联函数**：见第 3 节，useCallback 或状态下放；
3. **children 陷阱**：`<Card><Footer /></Card>` 的 children 是父组件渲染产物，每次都是新元素——这种场景 memo 救不了，改状态结构。

**错误二：useMemo 滥用。** 给字符串拼接、布尔取反都包 useMemo。症状是代码里一半行数是缓存包装，依赖数组比逻辑还长。判断标准：**被缓存的计算廉价（微秒级）时，缓存本身的开销与心智成本更贵**。useMemo 是给「可测量的贵」用的——测量手段就是第 2 节的 Profiler。

**错误三：列表 key 用 index 且列表会排序。** 收藏夹按时间排序切换后，卡片内容串位、动画乱跳。底层是 120 篇的 diff 机制：key 变化让 React 销毁重建本可复用的节点——既错乱又慢。修正：稳定业务 id。

**错误四：开发模式测性能。** StrictMode 双渲染 + 无压缩代码让一切数据失真，「优化后反而更慢」多半是量错了对象。永远用生产构建出数据。

## 9. 实际项目中的使用场景

- **Context 拆分**：主题（低频）与用户输入（高频）别放同一个 Context，任一 value 变化会通知全部消费者——按变化频率拆分，等价于「给订阅画好隔离区」；
- **Web Worker**：语法高亮、Markdown 编译这类毫秒级计算挪出主线程，Vite 下 `new Worker(new URL('./highlight.worker.js', import.meta.url))` 一行接入；
- **资源层**：`loading="lazy"` 让视口外图片延后加载；`<link rel="preload">` 抢先加载关键字体；`import { debounce } from 'lodash-es'` 命名导入吃满 tree shaking；
- **指标落地**：页面级优化做完，用真实用户监控（RUM）验证——LCP、INP 在真实设备上的分布，比实验室跑分诚实得多。完整的指标体系与更多实战在 [React 性能优化](/react/180-ReactPerformance)。

## 10. 小练习

预测题（5 分钟）：下面代码里 B 会随 A 的点击重渲染吗？为什么？

```jsx
const A = () => {
  const [n, setN] = useState(0);
  return (
    <>
      <button onClick={() => setN(n + 1)}>{n}</button>
      <B />
    </>
  );
};
const B = memo(() => <p>静态</p>);
```

（会。A 是内联箭头函数无 props 可比，但 B 无 props 时 memo 浅比较通过、跳过渲染——答案是**不会**重渲染，B 是本节唯一的幸存者。反过来去掉 memo 才会。写完预测再用 Profiler 验证。）

修改题（10 分钟）：给第 3 节的 FavoritesGrid 补上「无结果」空态与防抖（300ms），要求防抖不引入无关重渲染。验收：Profiler 里停顿期间只有输入框所在子树渲染。

修 Bug 题（15 分钟）：虚拟列表滚动时偶发露白、快速滚动末尾跳动。给出两个参数级的候选原因与验证方法（estimateSize 与实际行高偏差过大；overscan 太小。用 DevTools 量实际行高修正预估，或调大 overscan 观察）。

挑战题（30 分钟）：把第 5 节虚拟列表升级为动态行高（行内容两行或三行），查阅 useVirtualizer 的 measureElement 用法并实现。验收：混合行高下滚动无重叠无露白。

## 11. 与之前和之后的知识的关系

- 往前：070 篇的数据列表是本篇的练兵场；030 篇「父渲染子跟着渲染」的默认行为是本篇要优化的对象；
- 往后：[Concurrent 模式](/react/130-ConcurrentRendering) 解决「更新本身太贵」的另一半问题（优先级）；[React 性能优化](/react/180-ReactPerformance) 深入 RUM 与全链路指标；[React Compiler 自动记忆化](/react/390-ReactCompilerAutoMemoization) 让 memo 系手写优化逐步退役；[Fiber 架构](/react/120-FiberArchitecture) 解释为什么 memo 的本质是 bailout。

## 12. 官方文档

- 防止不必要的重渲染：https://zh-hans.react.dev/learn/render-and-commit
- useDeferredValue 与 transition（更新分级）：https://zh-hans.react.dev/reference/react/useDeferredValue
- lazy：https://zh-hans.react.dev/reference/react/lazy
- Profiler：https://zh-hans.react.dev/reference/react/Profiler
- @tanstack/react-virtual：https://tanstack.com/virtual/latest

## 13. 自我检查

- 能完整描述 Profiler 的录制流程与火焰图读法，说出「为什么必须用生产构建」；
- 能说出 memo 失效三连并各给修法，解释「状态下放」为什么优于到处 memo；
- 能为「重组件不在首屏」和「列表超长」两个症状分别选对工具并说明代价；
- 能说出 React Compiler 时代仍需手写的优化类型及其原因；
- 面对一个「卡」的页面，能按「测量、定位、对症、复测」四步组织工作。

## 本章总结

性能优化的纪律是先测量后动刀：Profiler 火焰图定位无谓重渲染，生产构建出数据。三把刀各治一症——无关重渲染用 memo 配套稳定引用（useMemo 供值、useCallback 供函数），更好的结构解是状态放；首屏包大用 lazy + Suspense 切 chunk，标准是「体积大且不在首屏」；万级列表用虚拟化把 DOM 压到可视区，代价是 SSR 与 Ctrl+F。React Compiler 自动化的是 memo 系手写，结构性优化与排查旧代码的能力仍是硬通货。useMemo 只给「可测量的贵」，key 必须稳定，别在开发模式测性能。

## 下一步

进入 [Concurrent 模式](/react/130-ConcurrentRendering)：memo 治「不该渲染的渲染了」，并发特性治「该渲染的渲染得太急」——useTransition 与 useDeferredValue 让重更新不再拖住输入。
