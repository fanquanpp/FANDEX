---
order: 350
title: React 与 D3
module: 'react'
category: 前端技术
difficulty: advanced
description: React 集成 D3：两种所有权模型的取舍（React 管 DOM vs D3 管 DOM）、纯计算模块 + JSX 渲染的完整柱状图、d3-selection 更新模式、过渡动画与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/330-ReactPWA'
  - 'react/340-ReactCanvas'
  - 'react/360-ReactStorybook'
  - 'react/370-ReactCICD'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

D3 是数据可视化的"瑞士军刀"，但它的一切都假设**自己拥有 DOM**（选择集、进入/更新/退出、过渡都直接操作节点）；React 的核心假设恰恰是"虚拟 DOM 拥有一切"。两者集成因此只有一个真问题：**DOM 所有权给谁**。实践中的两条清晰路线：

- **路线 A（推荐）**：只把 D3 当**计算库**（比例尺 scale、形状生成 shape、布局 layout、插值 interpolate），DOM 完全由 React JSX 渲染——React 之外没有第二套 DOM 真理。
- **路线 B**：数据复杂、节点量大、需要 D3 过渡/拖拽等深度能力时，把某个 `<svg ref>` 容器整体交给 D3 的 selection 接管，React 不碰其内部。

## 2. 路线 A：D3 算，React 画

D3 的多数模块是**纯函数**（输入数据输出坐标/路径字符串），这些结果天然可以进 JSX。完整柱状图：

```tsx
import { useMemo } from 'react';
import { max, scaleBand, scaleLinear } from 'd3';

interface City { name: string; pop: number }

export function PopChart({ data, width = 480, height = 240 }: {
  data: City[]; width?: number; height?: number;
}) {
  const margin = { top: 16, right: 16, bottom: 32, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // 比例尺：数据空间 -> 像素空间的映射函数（纯计算，useMemo 避免重建）
  const y = useMemo(
    () => scaleLinear().domain([0, max(data, (d) => d.pop) ?? 0]).nice().range([innerH, 0]),
    [data, innerH],
  );
  const x = useMemo(
    () => scaleBand().domain(data.map((d) => d.name)).range([0, innerW]).padding(0.2),
    [data, innerW],
  );

  return (
    <svg width={width} height={height} role="img" aria-label="各城市人口柱状图">
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* y 轴刻度线：直接用比例尺算位置 */}
        {y.ticks(5).map((t) => (
          <g key={t} transform={`translate(0,${y(t)})`}>
            <line x2={innerW} stroke="#ddd" />
            <text x={-8} dy="0.32em" textAnchor="end" fontSize={10}>{t}</text>
          </g>
        ))}
        {/* 柱子：React 渲染，key 用稳定的城市名 */}
        {data.map((d) => (
          <rect key={d.name} x={x(d.name)} y={y(d.pop)}
            width={x.bandwidth()} height={innerH - y(d.pop)} fill="#3367d6" rx={2}>
            <title>{`${d.name}：${d.pop} 万`}</title>
          </rect>
        ))}
        {/* x 轴标签 */}
        {data.map((d) => (
          <text key={d.name} x={(x(d.name) ?? 0) + x.bandwidth() / 2}
            y={innerH + 16} textAnchor="middle" fontSize={10}>{d.name}</text>
        ))}
      </g>
    </svg>
  );
}
```

预期渲染行为：渲染出带 y 轴网格、x 轴标签的柱状图；`data` 变化（如筛选后剩三城）时 React diff 更新对应 `<rect>`，且 hover 柱子出现原生 `title` 提示。整个图表是真实 DOM——可以用 CSS、事件、测试工具直接操作。

## 3. 路线 B：把容器交给 D3

需要 D3 的拖拽、力导向、复杂过渡时，把 SVG 容器 ref 给 D3，用 selection 的数据连接模式管理内部：

```tsx
import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';

export function DotRing({ points }: { points: number[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = select(svgRef.current!);
    // 数据连接：points 变化时 enter/exit 自动补齐与移除
    svg.selectAll('circle')
      .data(points, (d) => d as unknown as number) // 第二参数是 key 函数，保持对象身份
      .join(
        (enter) => enter.append('circle').attr('r', 0).attr('fill', '#3367d6'),
        // update：既有圆点原地更新
      )
      .attr('cx', (d, i) => 20 + i * 40)
      .attr('cy', 50)
      .transition() // D3 过渡（React 不知情，但容器内部归它管）
        .attr('r', (d) => d)
        .duration(300);
  }, [points]);

  // React 只拥有这一个空的 <svg> 外壳
  return <svg ref={svgRef} width={400} height={100} />;
}
```

预期渲染行为：`points` 更新时新点以半径 0 出现并动画放大，移除的点随 selection exit 消失，留下的点平滑过渡到新半径。纪律：**路线 B 的容器内部不许再用 JSX 渲染任何东西**——两个所有者共管同一块 DOM 是一切诡异 bug 的根源。

## 4. 模块拆用：不必全盘引入

D3 是模块化包，按需引入而非 `import * as d3`（减少约 80% 体积）：

| 需求 | 模块 | 产物 |
| :--- | :--- | :--- |
| 坐标映射 | `d3-scale` | `scaleLinear/scaleBand/scaleTime` |
| 路径生成 | `d3-shape` | `line/arc/area`（输出 `d` 字符串喂给 `<path>`） |
| 层级/力布局 | `d3-hierarchy` / `d3-force` | 节点坐标，再交给 JSX 渲染 |
| 轴生成 | `d3-axis` | 返回 DOM 操作（路线 B 用）；路线 A 手写刻度 |
| 动画插值 | `d3-interpolate` | 数值/颜色补间函数 |

## 5. 过渡动画：谁来做

- 路线 A：动画归 React 与 CSS/`motion`（transition 属性、FLIP），见[React 动画](/react/250-ReactAnimation)；D3 的 `transition()` 用不上，但 `d3-interpolate` 可用于计算补间值。
- 路线 B：`selection.transition()` 顺手强大（延迟编排、缓动函数齐全），这也是选 B 的主要理由之一。

## 6. 常见陷阱

- **两个 DOM 所有者**：JSX 渲染了 D3 selection 创建的节点（或反过来），React diff 直接把 D3 的输出抹掉/错乱；选定路线后严守边界。
- **全量 import**：`import * as d3 from 'd3'` 把全部模块拖进 bundle；逐模块 `import { scaleLinear } from 'd3-scale'`。
- **比例尺在渲染中重建**：`scaleLinear()...` 写在 JSX 里每次渲染都新建对象并重算 domain，数据量大时开销明显；包 `useMemo`。
- **key 用索引**：数据排序变化时索引 key 让 React 错误复用柱子（无过渡时会闪变）；用业务稳定 ID。
- **useEffect 里手动 diff 数据**：路线 A 不需要手写 enter/update/exit——React 的 diff 就是数据连接；只在该用路线 B 时用 `.join()`。
- **无障碍缺失**：纯 SVG 图表对读屏是一团空白；`role="img"` + `aria-label` 概述，关键数据另给表格或文本摘要（见[React 无障碍](/react/320-ReactAccessibility)）。

## 7. 小结

初学者要点：

- D3 与 React 集成的核心是"DOM 所有权二选一"；默认选路线 A：D3 只做计算（比例尺/形状/布局），JSX 渲染 DOM。
- 比例尺思维：把数据值映射为像素值的函数，是所有 D3 图表的骨架。
- 按需引入 D3 模块，比例尺计算包 `useMemo`。

进阶注意：

- 需要拖拽、力导向、复杂过渡时选路线 B：容器 ref 整体交给 selection + `.join()`，React 不碰内部。
- 动画归属随路线：A 用 CSS/motion，B 用 `selection.transition()`。
- 图表组件库（Recharts、visx、nivo）本质是"路线 A + 预制组件"，业务图表优先复用它们，手写 D3 留给定制需求；组件故事化文档用[React 与 Storybook](/react/360-ReactStorybook)。

## 速查

**比例尺**

```ts
import { scaleLinear, scaleBand } from 'd3-scale';
const y = scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]); // 值 -> 像素
const x = scaleBand().domain(names).range([0, innerW]).padding(0.2);   // 类目 -> 像素
y(30);        // 像素坐标
x.bandwidth(); // 类目带宽
```

**路径生成**

```ts
import { line, arc } from 'd3-shape';
const path = line().x((d) => x(d.date)).y((d) => y(d.value));
<path d={path(data) ?? ''} fill="none" stroke="#3367d6" />
```

**selection 数据连接（路线 B）**

```ts
select(svgRef.current).selectAll('circle')
  .data(points, (d) => d.id)   // key 函数保持身份
  .join((enter) => enter.append('circle').attr('r', 0))
  .attr('cx', (d) => x(d.id))
  .transition().duration(300).attr('r', (d) => d.r);
```

**按需引入**

```ts
import { scaleLinear } from 'd3-scale';      // 而非 import * as d3
import { line } from 'd3-shape';
import { select } from 'd3-selection';
```
