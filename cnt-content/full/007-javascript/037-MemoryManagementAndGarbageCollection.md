---
order: 370
title: JavaScript 垃圾回收与内存管理
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 用可达性、标记清除、分代回收三个模型讲透 JavaScript 的自动内存管理，并给出写代码时避免内存泄漏的实用清单。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'javascript/035-ClosureMemoryLeakOptimization'
  - 'javascript/036-MemoryLeakTroubleshoot'
prerequisites:
  - 'javascript/008-FunctionScopeClosure'
---


## 一句话理解

JavaScript 的内存管理 = 分配内存 + 使用内存 + 自动回收内存。
引擎会定期回收"从根出发再也找不到"的对象，你不需要手动 free，但必须理解什么算"找不到"。

## 为什么需要了解

- 自动回收不等于零内存问题：事件监听、定时器、闭包都可能悄悄把对象"养"到老。
- 排查卡顿和内存暴涨时，先能说清"哪些对象是活的、谁在引用它"，才能定位泄漏。
- 面试常问的 WeakMap/WeakSet、闭包泄漏、内存快照，全部建立在可达性模型上。

## 核心概念：可达性

引擎把一组对象当作"根（roots）"：

- 全局对象（浏览器里的 `window`）
- 当前正在执行的函数调用栈上的变量
- 被模块级变量长期持有的引用

从根出发，沿着对象的引用链能访问到的对象就是**可达的**，必须保留；访问不到的，就是垃圾。

```javascript
// 例：闭包为什么可能造成泄漏
function createHolder() {
  const bigData = new Array(1e6).fill('x'); // 大对象
  return () => console.log('hold'); // 闭包不引用 bigData，但词法环境整体被保留
}
const holder = createHolder(); // 闭包被全局变量 holder 长期持有
// bigData 是否存活？取决于引擎是否做"闭包变量分析"，
// 保险做法：不用的大对象不要放在被长期持有的闭包作用域里。
```

## 标记清除：最基础的算法

1. **标记**：从根出发，深度遍历所有引用，给可达对象打标记。
2. **清除**：扫描堆，回收没有标记的对象，并清掉标记供下一轮使用。

```javascript
let a = { name: 'alive' }; // 可达：被变量 a 引用
let b = { name: 'dead' };
a = null; // { name: 'alive' } 仍然可达吗？不，a 现在指向 null
// 此时 { name: 'alive' } 与 { name: 'dead' } 都不可达，等待回收
```

## 分代回收：V8 的工程化改进

对象按存活时间分到两代：

| 代 | 特点 | 回收策略 |
| --- | --- | --- |
| 新生代 | 大部分对象朝生暮死 | Scavenger：复制存活对象到新空间，回收快 |
| 老生代 | 经历过多次回收仍存活 | 标记-压缩：标记后把存活对象搬移紧凑，减少碎片 |

对象从新生代"晋升"到老生代的阈值是启发式的。作为应用开发者，你不需要记住具体参数，
但要明白：**频繁创建大量临时对象会增加 GC 压力**，表现为卡顿。

## 写代码时的实用清单

- 全局变量是隐式根，能少则少；模块内部状态用局部作用域管理。
- 事件监听、`setInterval`、`ResizeObserver` 等用完要解绑/清除。
- 缓存场景优先 `WeakMap` / `WeakSet`：键不产生强引用，键被回收时条目自动消失。
- 大对象不需要立刻释放，但要避免被"看起来没用的闭包"长期持有。

```javascript
// 弱引用缓存的正确姿势
const cache = new WeakMap();

function process(el) {
  if (!cache.has(el)) {
    cache.set(el, expensiveCompute(el));
  }
  return cache.get(el);
}
// el 从 DOM 移除后，WeakMap 条目不阻碍 el 回收
```

## 常见误解

| 误解 | 真相 |
| --- | --- |
| 闭包一定会内存泄漏 | 只有闭包被长期持有且作用域里藏着大对象才会 |
| 手动置 null 是必须的 | 现代引擎按可达性回收，置 null 只在你主动切断引用时有意义 |
| 内存占用高就是泄漏 | 缓存、池化、长列表都合法占用内存；泄漏是"无引用却无法回收"或"持续增长" |
| `WeakMap` 值不会泄漏 | 值本身仍被强引用，只有键是弱引用 |

## 小结

把"内存管理"翻译成三个问题：谁是根？谁可达？谁在引用它？
回答清楚这三个问题，大部分泄漏问题都能自己定位。
下一步建议阅读 闭包的内存泄露与优化 与
内存泄漏排查 实战篇。

## 弱引用：WeakRef 与 FinalizationRegistry

强引用阻止回收，弱引用不影响可达性判定。三个弱引用工具的分工：

```javascript
// WeakMap/WeakSet：以对象为键的"附加数据"，键被回收条目自动消失
const metadata = new WeakMap();
metadata.set(domNode, { lastUsed: Date.now() });  // 不阻止 domNode 被回收

// WeakRef：对目标保持弱引用，deref() 在目标存活时返回它
let cache = new WeakRef(buildHeavyView());
cache.deref()?.render();   // 已被回收则为 undefined，必须判空

// FinalizationRegistry：目标被回收后收到回调（时机不确定，只能做兜底日志/资源提示）
const registry = new FinalizationRegistry((held) => {
  console.warn('视图对象已被回收，请检查是否遗漏显式释放：', held);
});
registry.register(view, 'heavy-view-id');
```

**纪律**：FinalizationRegistry 的回调时机由 GC 决定，不可用于业务清理逻辑；需要确定释放的资源改用显式资源管理（`using` 与 `Symbol.dispose`，见 `javascript/064-ExplicitResourceManagement`）。弱引用只解决"不阻止回收"，不解决"何时释放"。

## 核心知识点

> 一句话记住内存：栈存基本值与引用，堆存对象；垃圾回收靠可达性，闭包与全局变量是常见泄漏源。

- 栈/堆：基本类型在栈，对象在堆；
- 引用计数与标记清除：GC 按可达性回收；
- 泄漏常见源：全局变量、未清理的定时器/监听器、闭包持有大对象；
- `WeakMap`/`WeakRef`：弱引用不阻止回收；
- 性能工具：DevTools Memory 面板与 Performance 录制。

## 动手试试

1. 用 Memory 面板录制一次页面操作，观察堆快照；
2. 找出一个“未清理定时器”的泄漏并修复；
3. 用 WeakMap 改写对象关联数据；
4. 进阶挑战：用 Performance 录制分析 GC 停顿。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 全局变量膨胀 | 无法回收 | 模块作用域 + 显式清理 |
| 忘记移除监听 | 事件泄漏 | 对称 removeEventListener |
| 闭包误留大对象 | 内存占用 | 释放引用 |

## 扩展学习

- 闭包：`javascript/008-FunctionScopeClosure`；
- 泄漏排查：`javascript/036-MemoryLeakTroubleshoot`；
- 集合弱引用：`javascript/023-MapSetWeakMapWeakSet`；
- 显式资源管理：`javascript/064-ExplicitResourceManagement`。
