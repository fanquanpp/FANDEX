---
order: 190
title: React 性能优化
module: 'react'
category: 前端技术
difficulty: intermediate
description: 用「先测量再动手」的流程系统学习 React 性能优化：三层性能模型、重渲染的控制、长列表虚拟化、并发特性与 Web Vitals 守护，附 2026 年 React Compiler 时代的手写 memo 取舍。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'react/390-ReactCompilerAutoMemoization'
  - 'react/185-PortalAndImperativeDom'
  - 'react/130-ConcurrentRendering'
  - 'react/080-PerformanceOptimization'
prerequisites:
  - 'react/040-HooksDeep'
---

## 前置知识

- [Hooks 深入](/react/040-HooksDeep)：理解组件什么时候会重渲染、useMemo / useCallback 的语义
- [Context 与全局状态](/react/050-ContextGlobalState)：知道 Context 的更新会波及所有消费者

## 学习目标

- 用「三层模型」定位性能问题发生在哪一层：渲染层、运行时层、还是加载层
- 用 Profiler 找到无意义的重渲染，并知道 2026 年先让 React Compiler 干活、再考虑手写 memo
- 用 key、状态下沉、并发特性（useTransition / useDeferredValue）控制重渲染范围
- 用虚拟化解决长列表，用代码分割与缓存头解决加载层
- 给项目配上 Web Vitals 监控与 CI 性能预算，让性能回归可守护

## 场景：一个越用越卡的页面

FANDEX 网页端的内容库有几万条文档索引。假想给「前端实验室」加一个「本地题库刷题页」：顶部搜索框过滤题目，下方 2000 条题目卡片列表，右侧一个实时统计面板。上线后反馈三种卡：

1. 输入搜索词时打字跟手性差（每敲一个字界面冻结一小段）；
2. 滚动列表时掉帧；
3. 首次进入页面要等好几秒白屏。

这三种卡是三个不同层次的问题——分别是**运行时层**（主线程被长任务占住，INP 差）、**渲染层**（DOM 节点太多、重渲染范围太大）、**加载层**（JS 包体积太大，LCP 慢）。不先分层，优化就是碰运气。本文按这个顺序把每一层都治一遍。

## 一、先测量：三层模型与工具

| 层次 | 症状 | 关键指标 | 工具 |
| :--- | :--- | :--- | :--- |
| 渲染层 | 交互后界面更新慢 | Render / Commit 耗时、重渲染次数 | React DevTools Profiler |
| 运行时层 | 打字、滚动、点击卡顿 | INP、长任务（Long Task）、TBT | Chrome Performance 面板 |
| 加载层 | 首屏白屏、资源下载久 | LCP、FCP、包体积 | Lighthouse、Network 面板 |

铁律：**没有测量就不动手**。Profiler 里看到某组件每次渲染 0.1ms，就别浪费时间给它套 memo。打开 React DevTools 的 Profiler，点录制、操作页面、停止，看两样东西：

- Ranked 图：按耗时排序，最贵的组件一目了然；
- 「Why did this render?」：每次重渲染的原因（props 变化 / state 变化 / context 变化 / 父组件渲染）。

## 二、渲染层：让不需要发生的渲染不发生

### 原则一：收窄状态的影响范围（状态下沉）

最常见的病根是把所有状态堆在页面顶层组件：

```tsx
// 反模式：query 一变，整个页面（包括 2000 条卡片）全部重渲染
function QuizPage() {
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState([]);
  // ...
  return (
    <div>
      <SearchBox query={query} onChange={setQuery} />
      <StatsPanel data={questions} />
      <QuestionList items={filtered} />
    </div>
  );
}
```

修复：把输入状态挪进只关心它的组件里。

```tsx
// 修复：输入态下沉，只有 SearchBox 自己重渲染
function QuizPage({ questions }: { questions: Question[] }) {
  return (
    <div>
      <SearchBox /> {/* 内部自持 query state */}
      <StatsPanel data={questions} />
      <QuestionList items={questions} />
    </div>
  );
}
```

### 原则二：key 必须稳定，别用数组下标

```tsx
// 反模式：列表重排 / 删除时，index key 让 React 认错元素
{items.map((item, index) => <Card key={index} item={item} />)}

// 正确：稳定业务 id
{items.map((item) => <Card key={item.id} item={item} />)}
```

index 作 key 时，删除中间一项，后面所有卡片会被当成「变了内容的同一张卡」，DOM 更新量与状态错位风险都翻倍。

### 原则三：2026 年的记忆化顺序——先 Compiler，再手写

引用稳定性问题（传给子组件的函数 / 对象每次渲染都是新引用，击穿子组件的 memo）现在有标准解法：启用 [React Compiler](/react/390-ReactCompilerAutoMemoization)，让它编译期自动缓存。手写 useMemo / useCallback 的合理残留场景只剩两个：

- 第三方库调用返回新引用、且下游组件 memo 依赖这个引用；
- 计算确实昂贵（毫秒级以上）且依赖不常变。

反过来的警告依旧成立：给字符串拼接套 useMemo 是负优化——缓存管理与比较的开销超过计算本身。

### 原则四：Context 的 value 要稳定

```tsx
// 反模式：Provider 每次渲染都造新对象，所有消费者陪葬
<Ctx.Provider value={{ user, setUser }}>

// 修复：value 记忆化，或 state 与 dispatch 分开两个 Context
const value = useMemo(() => ({ user, setUser }), [user]);
<Ctx.Provider value={value}>
```

更大范围的修法是把「读多的」和「写多的」拆成两个 Provider，让订阅读的组件不受写触发。

## 三、运行时层：把长任务拆开

### 症状：打字跟手性差

搜索框过滤 2000 条数据，每次按键同步过滤会阻塞输入。React 18+ 的并发特性就是为此设计的：

```tsx
import { useTransition } from 'react';

function SearchBox({ data }: { data: Question[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Question[]>(data);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value); // 紧急：输入框本身要立刻更新
    startTransition(() => {
      setResults(filterQuestions(data, e.target.value)); // 非紧急：可被打断
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <span>过滤中...</span>}
      <QuestionList items={results} />
    </div>
  );
}
```

语义：transition 里的更新是「可中断的低优先级工作」，用户继续打字时，上一次未完成的过滤直接作废，主线程永远优先回应用户输入。这是 INP 优化的第一杠杆。仅延迟显示场景可用更简单的 `useDeferredValue`。

### 症状：长列表滚动掉帧

2000 个 DOM 节点谁也救不了，要做虚拟化——只渲染可视区域附近的条目：

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function QuestionList({ items }: { items: Question[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // 每行预估高度
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vi) => (
          <div
            key={items[vi.index].id}
            style={{
              position: 'absolute',
              top: vi.start,
              width: '100%',
            }}
          >
            <QuestionCard item={items[vi.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

DOM 从 2000 个降到 20 个左右，滚动帧率立刻恢复。react-window 是同类选择，原理一致：**虚拟化是长列表的正解，memo 不是**。

## 四、加载层：让首屏更快

### 路由级代码分割

```tsx
import { lazy, Suspense } from 'react';

const StatsPanel = lazy(() => import('./StatsPanel'));

function QuizPage() {
  return (
    <Suspense fallback={<div>统计加载中...</div>}>
      <StatsPanel />
    </Suspense>
  );
}
```

只有用到的代码才下发。配合构建工具的 manualChunks 把稳定的第三方库拆成独立 chunk，利用浏览器缓存：

```ts
// vite.config.ts 片段
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
      },
    },
  },
},
```

### 加载层的其他必做项

- 图片：现代格式（AVIF / WebP）、`loading="lazy"`、尺寸占位防 CLS；
- 分析包构成：`rollup-plugin-visualizer` 生成 stats.html，找出被意外打进来的大依赖（典型：整个 lodash 而不是 lodash-es 按需导入）；
- 字体：`font-display: swap` 防文字白屏。

## 五、守护：别让性能悄悄劣化

### Web Vitals 上报

真实用户数据（RUM）比实验室数据重要。前端实验室的页面可以内嵌一个上报组件：

```tsx
import { onINP, onLCP, onCLS } from 'web-vitals';

function WebVitalsReporter() {
  useEffect(() => {
    const report = (metric: { name: string; value: number; id: string }) => {
      navigator.sendBeacon?.(
        '/api/web-vitals',
        JSON.stringify(metric)
      );
    };
    onINP(report);
    onLCP(report);
    onCLS(report);
  }, []);
  return null;
}
```

### CI 性能预算

```yaml
# .github/workflows/perf-budget.yml
name: Performance Budget
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000
          budgetPath: ./lighthouse-budget.json
```

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-byte-weight": ["warn", { "maxNumericValue": 1500000 }]
      }
    }
  }
}
```

指标阈值参考（Web Vitals 良好线）：LCP < 2.5s、INP < 200ms、CLS < 0.1、TBT < 200ms。

## 坑点清单

1. 过早记忆化是最常见的无效优化：先 Profiler，再动手；简单计算直接算。
2. `useEffect` 依赖数组遗漏导致闭包读旧值——用函数式更新 `setX(x => x + 1)` 规避 state 依赖，回调类依赖用 ref 转存。
3. index 作 key 在重排 / 删除列表时引发额外 DOM 操作与状态错位。
4. transition 只解决「更新可中断」，不解决「计算本身太慢」——过滤 10 万条数据该上 Web Worker 或虚拟化。
5. 虚拟化列表的行高用 estimateSize 时，滚动条会跳动；固定行高列表才能做到完全平滑。

## 自检

1. 「打字卡」「滚动卡」「白屏久」分别对应哪一层？各用什么工具确认？
2. 状态下沉解决的是什么？和 React.memo 解决的问题有什么区别？
3. useTransition 里的更新被用户后续输入打断时，会发生什么？为什么这能改善 INP？
4. 长列表为什么虚拟化是正解，给每行加 memo 是错误方向？

## 练习

1. 搭一个 2000 条数据的搜索 + 列表页面，先用 Profiler 记录基线（渲染次数与耗时），再依次应用状态下沉、useTransition、虚拟化，每一步记录一次数据，写一份前后对比。
2. 把一个 3MB 的单页应用用 rollup-plugin-visualizer 分析，找出两个可以拆分或按需导入的依赖，落地后对比首屏体积。
3. 给自己的项目接上 web-vitals 上报与 Lighthouse CI 预算，故意塞一个大依赖让 CI 红一次，再修复让它变绿。

## 下一步

- [React Compiler 自动记忆化](/react/390-ReactCompilerAutoMemoization)：渲染层优化的 2026 年标准做法
- [并发渲染与可中断更新](/react/130-ConcurrentRendering)：useTransition 背后的调度原理
- [性能优化进阶](/react/080-PerformanceOptimization)：更多工程化手段与案例
