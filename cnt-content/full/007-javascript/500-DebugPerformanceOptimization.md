---
order: 580
title: 调试与性能优化
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 页面卡 200ms 怎么查：Performance 面板定位长任务、火焰图读法、内存快照对比找泄漏，以及一组性能坑。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'javascript/370-MemoryLeakTroubleshoot'
  - 'javascript/360-ClosureMemoryLeakOptimization'
  - 'javascript/490-DebounceThrottle'
  - 'javascript/510-CoreWebVitalsAndPerformanceMetrics'
prerequisites:
  - 'javascript/290-EventLoop'
  - 'javascript/490-DebounceThrottle'
---

# 调试与性能优化

## 场景：点一下按钮，页面卡了半秒

测试报了个 bug：演唱会票务页点"筛选"后页面冻住约半秒。你的第一反应可能是"加个 loading"，但先别猜——性能问题的纪律是**先测量，再动手**。打开 DevTools 的 Performance 面板，点录制，点一下筛选按钮，停止录制，得到一张火焰图。

读图三步：

1. **找红色标记的 Long Task**。主任务超过 50ms 就算长任务，会阻塞交互；半秒的卡顿必然对应一根超长的任务条。
2. **顺着火焰图往下钻**。长任务条的下层是调用栈，越宽的块耗时越多。这个例子里宽块是 `filterSongs` 内部的 `toLocaleDateString`——对 1600 首歌每首都新建格式化器，这就是元凶。
3. **修复后重录对比**。把格式化器提出循环复用，长任务消失，火焰图变成一排细条。

这次排查的完整闭环就是本篇的方法论：**录制、定位、归因、修复、复测**。下面把每个环节的工具与代码手段展开。

## 代码里埋测量点：performance.mark 与 measure

面板适合排查"已发生的卡顿"，日常迭代更常用代码级测量，它进性能面板的时间轴，与用户操作对齐：

```javascript
performance.mark('filter-start');
const result = filterSongs(songs, filters);
performance.mark('filter-end');
performance.measure('筛选耗时', 'filter-start', 'filter-end');

const [m] = performance.getEntriesByName('筛选耗时');
console.log(`${m.name}: ${m.duration.toFixed(1)}ms`);
performance.clearMarks(); // 测完清理，避免条目堆积
```

经验阈值（与长任务定义对齐）：单次同步逻辑超过 50ms 就该警觉，超过 100ms 用户可感知。临时测量用 `console.time/timeEnd` 也行，但它进不了时间轴，与 mark/measure 各有分工。

## 找到长任务：从监控到拆分

生产环境不可能靠人肉录面板，标准做法是监听长任务：

```javascript
// PerformanceObserver 上报所有超过 50ms 的长任务
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    reportToBackend({ duration: entry.duration, attr: entry.attributedGroup });
  }
}).observe({ entryTypes: ['longtask'] });
```

拿到长任务后，解法几乎总是**切片**：把同步大循环拆成小块，每块之间把控制权还给浏览器，让输入与渲染插进来：

```javascript
async function processInChunks(items, processItem, chunkSize = 200) {
  for (let i = 0; i < items.length; i += chunkSize) {
    for (let j = i; j < Math.min(i + chunkSize, items.length); j++) {
      processItem(items[j]);
    }
    await new Promise((r) => setTimeout(r)); // 让出主线程一拍
  }
}
```

给筛选函数套上它，半秒的大任务变成几十个 5ms 的小任务，输入框全程可交互。更重的计算则整个搬去 Worker，见[Web Workers 多线程](/javascript/670-WebWorkersMultithreading)。`requestIdleCallback` 适合更不急的活（预取、日志压缩），但注意它不保证何时执行，别把用户等待的任务放进去。

## 内存泄漏：快照对比三连拍

泄漏的典型症状是"页面开越久越卡、内存只涨不跌"。排查标准动作在 DevTools Memory 面板：

1. 进入目标页面并完成一次可疑操作（比如打开再关闭弹窗），拍**快照 1**。
2. 把同一操作重复做 10 次（制造明显的泄漏累积）。
3. 强制 GC（面板的垃圾桶图标），拍**快照 2**。
4. 用快照 2 减快照 1，看哪些对象数量只增不减，展开一条看它的 **Retainers（被谁引用着）**。

看懂 Retainers 是关键：泄漏不是"对象没人用"，而是"没人用却还被引用"。常见根因三件套：遗留在集合里的监听器与定时器（闭包拖着 DOM）、只加不减的全局缓存、被断开的 DOM 树仍被 JS 变量持有。完整的排查手册见[内存泄漏排查](/javascript/370-MemoryLeakTroubleshoot)与[闭包内存优化](/javascript/360-ClosureMemoryLeakOptimization)。工程上的预防比排查便宜：组件卸载时统一清理监听器/定时器，缓存一律带上上限或弱引用（`WeakMap`）。

## 写代码时就要防的四个坑

**坑 1：读写交错导致布局抖动（layout thrashing）**。循环里"读一个布局属性、写一个样式、再读一个"，每次写都使下一次读失效，浏览器被迫反复重排：

```javascript
// 反例：每轮读写交错，n 次强制重排
for (const el of items) {
  el.style.height = box.offsetHeight + 'px'; // 读 + 写在同一轮
}

// 正解：先批量读，再批量写
const h = box.offsetHeight;
for (const el of items) {
  el.style.height = h + 'px'; // 只写，重排一次
}
```

**坑 2：卸载不清理**。定时器、监听器、IntersectionObserver，创建时就要想好在哪销毁。这是内存泄漏第一大来源，也是"幽灵回调"报错的来源。

**坑 3：`delete` 对象属性**。`delete obj.key` 改变对象形状，会让引擎的隐藏类优化失效，热路径上明显变慢。需要"无此字段"语义就用 `obj.key = undefined` 加 `null` 判断，或从源头用 `Map`。

**坑 4：过度优化**。在没有测量数据前不优化；先上、最影响体验的瓶颈优先修。"这里可能慢"不是优化理由，火焰图里的宽块才是。同理，`try/catch` 包热路径、到处做防御性拷贝，这些"看起来安全"的写法经常是被想象的性能恐惧驱动的。

## 坑点与自检

- `console.log` 输出大对象会保留引用，生产环境留一堆 log 也会拖慢页面——构建期剔除。
- `performance.now()` 只用来算差值，别当时间戳存库（时间源可被调整）；业务时间用 `Date.now()`。
- 火焰图里浅色的"空闲"块不是问题，别优化空气。
- 面板录制的环境（CPU 4x slowdown、无缓存）与真机不同，结论要用真实设备复核。

自检清单：长任务的阈值是多少？快照对比的正确步骤顺序？布局抖动的成因一句话怎么说？你最近一次性能修改是测出来的还是猜出来的？

## 练习

1. 在你的项目里找一段疑似慢的代码，用 mark/measure 测出准确耗时，贴出前后对比。
2. 写一个"失控"页面：一个每秒 new 出 1000 个对象且从不释放的定时器。用快照对比找到它，然后修复。
3. 把 1 万条数据渲染改成切片渲染，Performance 面板录制对比总长任务数与交互延迟。
4. 复现布局抖动：写一个读写交错的循环，在 Performance 面板观察紫色（重排）占比，然后按"先读后写"修复再对比。

## 下一步

- [Core Web Vitals 与性能指标](/javascript/510-CoreWebVitalsAndPerformanceMetrics)：从"我的函数快不快"升级到"用户的体验指标好不好"。
- [内存泄漏排查](/javascript/370-MemoryLeakTroubleshoot)：本篇快照方法的完整案例手册。
- [Web Workers 多线程](/javascript/670-WebWorkersMultithreading)：切片救不了的纯计算，搬线程。
