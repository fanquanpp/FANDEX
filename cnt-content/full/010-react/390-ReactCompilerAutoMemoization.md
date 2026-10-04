---
order: 410
title: React Compiler 自动记忆化
module: 'react'
category: 前端技术
difficulty: advanced
description: 从删掉项目里 useMemo 的真实动机出发，学会 React Compiler（v1.0）的启用配置、编译产物原理、Rules of React 前提与渐进式迁移策略，理解 2026 年还需要不需要手写 memo。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'react/080-PerformanceOptimization'
  - 'react/040-HooksDeep'
  - 'react/460-ReactViteToolchainCommand'
  - 'react/430-InterruptibleRendering'
prerequisites:
  - 'react/040-HooksDeep'
  - 'react/080-PerformanceOptimization'
---

## 前置知识

- [Hooks 深入](/react/040-HooksDeep)：熟练使用 useMemo、useCallback，并且被依赖数组坑过
- [性能优化](/react/080-PerformanceOptimization)：知道 React.memo、引用稳定性这些词在说什么

## 学习目标

- 在 Vite / Next.js 项目里正确启用 React Compiler（含 2026 年的 @vitejs/plugin-react 6+ 新写法）
- 说清编译器在做什么：它不是「自动加 useMemo」，而是用更底层的缓存槽方案重写你的组件
- 理解纯函数假设与 Rules of React 为什么从「建议」变成了「编译器的工作前提」
- 掌握渐进式迁移：按目录启用、按文件禁用、用 ESLint 提前发现编不动的代码
- 知道哪些场景仍然需要手写 useMemo

## 场景：一次代码评审引发的思考

FANDEX 网页端的 React 岛屿里有一个 `SyntaxExplorer`（语法示例浏览器）：左列是分类列表，右列展示选中的语法卡片。评审时发现了这样的代码：

```tsx
function SyntaxExplorer({ categories }: { categories: Category[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(
    () => categories.filter((c) => c.enabled),
    [categories]
  );
  const handleSelect = useCallback(
    (id: string) => setActiveId(id),
    []
  );

  return (
    <div>
      <Sidebar items={filtered} onSelect={handleSelect} />
      <Preview activeId={activeId} />
    </div>
  );
}
```

两条 useMemo、两条 useCallback，每一处都要停下来想：依赖全了吗？多了会不会失效？这段「防御性代码」和业务逻辑毫无关系，却是过去五年 React 开发的日常。

React Compiler 的目标就是让你把这段代码删干净：

```tsx
function SyntaxExplorer({ categories }: { categories: Category[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // 不用 memo：编译器自动缓存
  const filtered = categories.filter((c) => c.enabled);
  const handleSelect = (id: string) => setActiveId(id);

  return (
    <Sidebar items={filtered} onSelect={handleSelect} />
  );
}
```

这不是「少写代码」的审美问题，而是正确性问题：手写依赖数组漏一项就是 stale closure 线上事故，多一项就是缓存形同虚设。编译器做这件事不会漏也不会错。2025 年 10 月 React Compiler 发布 1.0 正式版（npm 包 `babel-plugin-react-compiler`），到 2026 年它已经是新项目的默认选项。本文带你把它装进项目、看懂它生成的代码、并划清「它能做」与「它不能做」的边界。

## 一、动手：10 分钟在 Vite 项目里启用

### 版本检查

React Compiler 对 React 版本的要求：React 19 完全支持；React 17 / 18 通过兼容运行时（`react-compiler-runtime`，配置 `target: '17'` / `'18'`）也能用，只是部分优化打折扣。**React 16 及以下不行。**

### 安装

```bash
pnpm add -D babel-plugin-react-compiler@latest
```

### Vite 配置（@vitejs/plugin-react 6.0 及以上）

注意：2026 年的主流写法和老教程不同——6.0 移除了内联 babel 选项，改用 rolldown 的 babel 插件：

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});
```

如果项目还在 `@vitejs/plugin-react` 5.x，用旧写法：

```ts
export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [['babel-plugin-react-compiler', { target: '19' }]] },
    }),
  ],
});
```

> 关键规则：编译器插件必须在 Babel 插件链的**最前面**运行，让它看到未被其他转换改动过的源码。排在后面的插件可能改变 AST，导致分析失真。

### Next.js 配置

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default nextConfig;
```

### 验证装好了没

两个肉眼可见的信号：

1. **React DevTools**：被编译器优化过的组件会带 Memo 徽标。
2. **构建产物**：编译后的代码会从 `react/compiler-runtime` 导入缓存助手：

```js
// dist 产物里看到这行，说明编译生效了
import { c as _c } from 'react/compiler-runtime';
```

## 二、它到底生成了什么：缓存槽而不是 useMemo

先纠正一个常见误解：编译器**没有**把你的代码改写成 `useMemo(..., [deps])`。它用的是更底层的 `useMemoCache`（通过 `react/compiler-runtime` 提供）——组件里开辟一组缓存槽，每个槽记录「上次的值 + 上次的依赖」，渲染时先做内联比较：

```tsx
// 源代码
function Badge({ label }: { label: string }) {
  const upper = label.toUpperCase();
  return <span>{upper}</span>;
}

// 编译产物（极度简化，实际更复杂）
import { c as _c } from 'react/compiler-runtime';

function Badge(t0) {
  const $ = _c(1); // 1 个缓存槽
  let t1;
  if ($[0] === Symbol.for('react.memo_cache_sentinel')) {
    // 首次渲染：真正执行计算，存入槽
    t1 = t0.label.toUpperCase();
    $[0] = t1;
  } else {
    // 后续渲染：若依赖没变，直接复用槽里的值
    t1 = $[0];
  }
  return <span>{t1}</span>;
}
```

比手写 useMemo 高效的原因：

- 依赖比较内联在渲染函数里，不创建依赖数组对象；
- 缓存槽按索引访问，O(1)；
- 编译器知道整棵依赖图，能缓存到比 useMemo 更细的粒度（包括 JSX 本身）。

### 为什么「React.memo 也不用写了」

编译器的记忆化是双向的：它缓存组件内部的计算，也缓存**传给子组件的 props**。只要整个调用链上的值引用稳定，子组件（尤其是被 memo 包过或自身也被编译过的）就不会因父组件重渲染而白白重渲染。你在源码里写的 `React.memo(UserCard)` 依然有效，不会冲突，只是多数场景下变得多余。

## 三、前提：Rules of React 从建议变成了合同

编译器的一切都建立在「组件是纯函数」的假设上：相同输入必须产生相同输出，渲染期间不改外部世界。你以前可以偷偷违反、大概率没事；现在违反了，编译器要么拒编（跳过该组件，安全降级）、要么生成出错误缓存逻辑。

### 违规清单与修复

```tsx
// 违规 1：渲染期修改外部变量
let renderCount = 0;
function Bad() {
  renderCount++; // 编译器无法保证这个值的一致性
  return <div>{renderCount}</div>;
}

// 违规 2：渲染期读非纯函数
function Bad({ seed }: { seed: number }) {
  const id = Math.random(); // 每次渲染结果不同，缓存必然出错
  return <div data-id={id} />;
}
```

修复思路：

```tsx
// 渲染期需要「只算一次」的值：用惰性初始化 state
import { useState } from 'react';

function Good({ seed }: { seed: number }) {
  const [id] = useState(() => `${seed}-${crypto.randomUUID()}`);
  return <div data-id={id} />;
}
```

其他高频违规：直接 push/修改 state 里的对象数组（必须不可变更新）、条件语句里调 Hook（Hook 顺序必须稳定）、渲染期发起副作用（进 useEffect 或事件处理）。

### 让工具替你盯着：ESLint

编译器的规则检查已经并入 `eslint-plugin-react-hooks`（装最新版，启用 `recommended-latest` 预设即可，不再需要单独的 compiler 插件包）：

```bash
pnpm add -D eslint-plugin-react-hooks@latest
```

```js
// eslint.config.js（flat config 片段）
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs['recommended-latest'].rules,
  },
];
```

重要心态：**lint 报 compiler 规则错误是安全的**——CI 挂红了说明那个组件不会被优化，但功能不受影响。按自己节奏修，修一个多优化一个，不必为上线阻塞。

## 四、渐进式迁移：不动存量代码也能上

### 按目录圈定范围

配置里的 `sources` 接收文件名，返回是否编译。老项目的标准打法：先编译新模块：

```ts
babel({
  presets: [
    reactCompilerPreset({
      sources: (filename) =>
        filename.includes('/src/new-modules/'),
    }),
  ],
}),
```

### 按函数级指令微调

编译器支持两个指令注释，放在函数体第一行：

```tsx
// 某个组件行为诡异、来不及排查：先退出编译
function LegacyChart() {
  'use no memo';
  // ...
}

// 默认范围外、但想单独启用的组件
function NewWidget() {
  'use memo';
  // ...
}
```

`use no memo` 是排查问题的第一手段：怀疑编译产物与运行时行为不符时，先对嫌疑组件加它，验证问题是否消失。

### 与存量手写 memo 共存

已有的 `useMemo` / `useCallback` / `React.memo` 不会被破坏，行为照旧。迁移建议按价值排序拆除：先删「防御性」的（包着简单计算的），保留「确实贵」的（第三方库重调用、超大数据处理），最后全项目 review 一遍。

## 五、坑点与边界：编译器不管什么

### 1. 第三方库的调用结果

编译器优化的是**你的组件代码结构**，对第三方库内部一无所知。库每次返回新引用（如日期格式化、生成新对象的方法），下游 memo 组件照旧被击穿：

```tsx
// 编译器帮不了这里：format 每次返回新字符串
const formatted = format(date, 'yyyy-MM-dd');

// 引用稳定性确实重要时，手写 useMemo 仍然合法且合理
const formatted = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
```

### 2. ref.current 的读取

`ref.current` 是可变容器，编译器不会对它的读取做记忆化（这是刻意的安全设计）。需要缓存 ref 派生值时自己处理。

### 3. 「编译过了」不等于「优化到了」

组件违反规则被跳过时，构建不报错、运行不报错，只是悄悄失去优化。定期用 React DevTools 的 Memo 徽标抽查关键路径，或读构建产物里 `compiler-runtime` 的出现范围，确认覆盖率符合预期。

### 4. 别拿它当「随便写」的许可证

编译器兜底的是**引用稳定性**，不是算法复杂度。在大列表里每项渲染时做 O(n) 过滤，编译器缓存不了参数每次都变的计算。性能问题先测（React DevTools Profiler / Web Vitals），再动手。

### 自检

1. 编译器把代码改写成 useMemo 了吗？它实际生成什么？
2. lint 报了 compiler 错误，功能会不会挂？要不要紧急修复？
3. 装完之后，用哪两个办法验证编译生效？
4. 第三方库返回新对象击穿子组件 memo，怎么补？

四个都答得上来，可以进入实战；答不上来回到对应小节。

## 六、给 FANDEX 岛屿的实际建议

FANDEX 这类「静态站 + 少量 React 岛屿」的架构里，岛屿通常小而独立（主题切换、命令面板、实验室编辑器），重渲染范围天然被 Astro 隔离。此时 React Compiler 的收益主要在：

- 前端实验室这类**交互密集**的岛屿（编辑器、参数面板联动），内部状态更新频繁，编译器省掉的手工 memo 最有价值；
- 岛屿代码量小，启用成本几乎为零，`@rolldown/plugin-babel` 一行配置；
- 大列表、复杂联动如果出现在岛屿里，优先修数据结构而不是依赖编译器。

全栈 React 项目（Next.js）的收益更大：Client Components 数量多、组件树深，编译器配合 RSC 各管一段——RSC 削减下发体积，Compiler 削减无意义重渲染，两者不互斥。

## 练习

1. 在一个 Vite + React 19 项目里启用 React Compiler，写一个含 500 项列表过滤 + 排序的组件，删除所有 useMemo / useCallback，用 React DevTools Profiler 对比启用前后的渲染耗时与次数。
2. 故意写一个在渲染期 `Math.random()` 的组件，观察 lint 报错与 DevTools 里该组件是否还有 Memo 徽标；修复后确认徽标回来了。
3. 给一个行为可疑的旧组件加 `'use no memo'`，在 React DevTools 里对比加与不加时的重渲染范围。

## 下一步

- [React 19 新特性](/react/060-React19NewFeatures)：Compiler 之外的 19 核心（Actions、use）
- [React 19 新增 API](/react/420-React19NewAPI)：use、useEffectEvent、Activity 全清单
- [渲染优先级与调度](/react/470-RenderingPriorityAndScheduling)：理解记忆化省掉的是哪一段耗时
