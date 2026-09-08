---
order: 510
title: 前端性能指标与 Core Web Vitals
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: '用 LCP、INP、CLS 三个核心指标学会量化"页面快不快"，并给出浏览器端采集与上报的完整示例。'
author: fanquanpp
updated: '2026-09-08'
related:
  - 'javascript/050-DebugPerformanceOptimization'
  - 'css/043-CSSPerformanceOptimizationDetailed'
prerequisites:
  - 'javascript/050-DebugPerformanceOptimization'
---

## 前置知识

- [调试与性能优化](/javascript/050-DebugPerformanceOptimization)：知道 Performance 面板在哪里即可。

## 学习目标

- 说清 LCP、INP、CLS 各自度量什么、良好阈值是多少；
- 用 Lighthouse（实验室）与 `web-vitals` 库（真实用户）两条路径测量指标；
- 拿到一个差指标时，知道按什么顺序排查与优化。

## 一句话理解

性能不能靠"感觉"。用户抱怨"页面慢"时，可能是加载慢、可能是点了没反应、也可能是页面乱跳——这是三种不同的问题。Core Web Vitals 用三个数字分别回答：**加载快不快（LCP）、响应快不快（INP）、稳不稳（CLS）**。

把页面想象成一家餐厅：LCP 是"第一道主菜上桌的时间"，INP 是"招呼服务员后多久有回应"，CLS 是"桌椅会不会在你吃饭时被挪走"。三者都好，体验才算好。

## 三个核心指标详解

### LCP：最大内容绘制

LCP（Largest Contentful Paint）记录**视口内最大的内容元素**（通常是首屏大图或标题块）完成渲染的时间点。它比"页面开始加载"更接近用户感知的"加载完成"。

- 良好：≤ 2.5 秒；差：> 4 秒；
- 常见拖累：未压缩的首屏大图、阻塞渲染的 CSS/JS、缓慢的服务端响应；
- 优化抓手：压缩并用现代格式（WebP/AVIF）交付首图、`<link rel="preload">` 关键资源、内联关键 CSS、服务端渲染首屏。

### INP：交互到下一次绘制

INP（Interaction to Next Paint）衡量用户交互（点击、点按、键盘输入）到界面**实际给出视觉反馈**的延迟，取整个会话中接近最差的交互值。它于 2024 年 3 月正式取代 FID 成为核心指标——FID 只统计"第一次输入的处理延迟"，既不看后续交互，也不含渲染时间；INP 覆盖全部交互且包含完整链路（输入处理 → 事件回调 → 渲染）。

- 良好：≤ 200 毫秒；差：> 500 毫秒；
- 常见拖累：主线程长任务（大量同步计算、超大 JSON 解析）、事件回调里做重活；
- 优化抓手：拆分长任务（`scheduler.yield()` / `setTimeout` 让出主线程）、复杂计算交给 Web Worker（见 `javascript/069-WebWorkersMultithreading`）、高频事件节流、优先更新"用户能看到的反馈"再处理其余逻辑。

### CLS：累积布局偏移

CLS（Cumulative Layout Shift）量化"页面元素在用户预期之外移动"的程度。它是无单位的分数：每个意外偏移按"影响面积比例 × 移动距离比例"计分，累计求和。

- 良好：≤ 0.1；差：> 0.25；
- 典型场景：没有设置宽高的图片加载后把正文顶下去、广告位突然插入、自定义字体加载导致文字重排；
- 优化抓手：给图片/视频写死 `width`/`height`（或 `aspect-ratio`）、给动态插入内容预留占位、对字体用 `size-adjust`、动画只用 `transform`（不触发布局的属性）。

## 指标总览表

| 指标 | 全称 | 衡量什么 | 良好阈值 | 主要拖累 |
| --- | --- | --- | --- | --- |
| LCP | Largest Contentful Paint | 最大内容（图片/标题块）渲染时间 | ≤ 2.5s | 大图、阻塞渲染的资源 |
| INP | Interaction to Next Paint | 交互到界面响应的延迟 | ≤ 200ms | 主线程长任务 |
| CLS | Cumulative Layout Shift | 布局意外跳动的累计程度 | ≤ 0.1 | 无尺寸媒体、动态插入 |

辅助指标：TTFB（首字节时间）、FCP（首次内容绘制）、TBT（总阻塞时间），用于定位 LCP/INP 的具体瓶颈。例如 LCP 差且 TTFB 差，问题在服务端；TTFB 好而 LCP 差，问题在前端资源。

## 怎么测量

两个层面缺一不可：

- **实验室（Lab）**：Lighthouse 在固定条件下跑分，可重复，适合开发期回归；
- **真实用户（RUM，Real User Monitoring）**：在生产环境采集真实访客的数据，反映真实网络与设备（低端安卓机上的表现往往比开发机差得多）。

```javascript
// 用 web-vitals 库采集并上报（推荐方式）
import { onLCP, onINP, onCLS } from 'web-vitals';

function report(metric) {
  // sendBeacon 在页面卸载时也能可靠发送，不阻塞跳转
  navigator.sendBeacon('/api/metrics', JSON.stringify({
    name: metric.name,      // 'LCP' | 'INP' | 'CLS'
    value: metric.value,    // 数值：秒 / 毫秒 / 无单位分数
    rating: metric.rating,  // 'good' | 'needs-improvement' | 'poor'
    id: metric.id,          // 本页会话的唯一标识，便于聚合去重
  }));
}

onLCP(report);
onINP(report);
onCLS(report);
```

```javascript
// 不引库的原生写法：监听 LCP 候选元素变化（buffered: true 会补发已发生的记录）
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];   // LCP 取最后一个候选
  console.log('LCP candidate:', last.startTime, last.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

一个完整的"定位闭环"：

1. Lighthouse 跑分，记录三项指标与建议清单；
2. 按指标查瓶颈（见下表）改代码；
3. 本地复测确认改善；
4. 上线后用 RUM 数据验证真实用户指标是否改善。

## 定位与优化思路

| 指标差 | 先看什么 | 常见手段 |
| --- | --- | --- |
| LCP | 首屏最大图/文本是否被阻塞 | 压缩图片、preload 关键资源、内联关键 CSS、减少长任务 |
| INP | 主线程长任务、事件处理函数 | 拆分长任务、Worker 卸载计算、节流高频事件 |
| CLS | 无尺寸图片、动态插入内容 | 给图片/广告预留尺寸、字体 `size-adjust`、动画用 transform |

## 常见误区

| 误区 | 真相 |
| --- | --- |
| 只看 Lighthouse 分数 | 实验室结果不能代表真实用户，必须配合 RUM |
| INP 就是 FID 改了个名 | FID 只看首次输入的处理延迟；INP 看整个会话的交互并包含渲染时间 |
| CLS 只跟图片有关 | 字体加载、iframe、动态内容都会造成布局偏移 |
| 指标达标就完事 | 指标是结果，还要监控"指标变差"的版本回归 |
| 在开发机上测性能 | 开发机性能远超用户均值，低端设备与弱网才是基线 |

## 动手试试

1. 用 Lighthouse 给一个页面打分，记录三项指标；
2. 用 `web-vitals` 库在页面里收集指标，把上报改为 `console.log` 观察取值；
3. 修复一个 CLS 问题（如给图片补 `width/height`），对比前后分数；
4. 进阶挑战：在 Performance 面板找到一个 100ms 以上的长任务，用 `setTimeout` 拆分后复测 INP。

## 小结

先立指标，再谈优化。接入 `web-vitals` 采集真实数据，配合 Lighthouse 做开发期回归，优化动作按"LCP → INP → CLS"优先级推进，最后用线上数据验证效果。

初学者记住三点：LCP 看加载（≤ 2.5s）、INP 看交互（≤ 200ms）、CLS 看稳定（≤ 0.1）；测量靠 Lighthouse 与 PerformanceObserver。

进阶者还需注意：按设备与网络分段看 RUM 数据才不会失真；三项指标相互牵连（拆长任务利好 INP 但可能推迟 LCP），每次改动后要整体复测。
