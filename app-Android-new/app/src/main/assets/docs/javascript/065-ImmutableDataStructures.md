---
order: 650
title: 不可变数据结构：从 Records & Tuples 到现代方案
module: 'javascript'
category: 前端技术
difficulty: advanced
description: Records & Tuples 提案撤回的始末与教训，以及冻结、值语义、结构共享等深不可变的现代替代方案。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'javascript/020-DeepShallowCopy'
  - 'javascript/023-MapSetWeakMapWeakSet'
  - 'javascript/021-ObjectStaticMethods'
prerequisites:
  - 'javascript/019-PrototypeChainClassEssence'
---

## 0. 一句话理解

> TC39 已于 2025 年 4 月正式**撤回** Records & Tuples 提案——语言级的深不可变值类型不会到来了。本篇讲清它想解决什么、为什么失败，以及今天工程上如何用冻结、结构共享与自定义值语义达到同样目的。

## 1. Records & Tuples：一段被撤回的历史

### 1.1 提案想解决什么

对象与数组是**引用类型**，比较与复制都针对引用：

```javascript
{ x: 1 } === { x: 1 }            // false：两个不同引用
const a = [1, 2]; a[0] = 9;      // 原地突变，任何持有 a 的代码都受影响
```

Records（不可变对象 `#{}`）与 Tuples（不可变数组 `#[]`）计划引入**值语义**：

```javascript
// 注意：以下语法从未落地，仅为提案设计
#{ x: 1 } === #{ x: 1 };   // true：按内容比较
#[1, 2, 3][0] = 9;         // TypeError：不可突变
```

一旦落地，React 依赖数组、缓存键、去重集合等场景都不再需要深比较。

### 1.2 为什么被撤回

提案自 2020 年起停留在 Stage 2，**2025 年 4 月 14 日 TC39 全会达成共识正式撤回**。核心原因：

1. **一致性问题**：Record 内只能放可比较的原始值或其他 Record/Tuple，`Symbol` 键、原型、可调用成员等边界裁剪了多少轮都无法让委员会满意；
2. **语法成本**：`#{}`/`#[]` 新字面量与私有字段 `#` 语法纠缠，社区对语言复杂度的抵触随规模增大而上升；
3. **替代方案成熟**：`Object.freeze` + 结构共享库 + TypeScript `readonly` 类型已覆盖大部分需求，推动力不足。

**教训**：不要在任何项目里基于 `#{}`/`#[]` 语法做设计或选型；网上教程若出现该语法，一律按"提案史"处理。

## 2. 需求不变：什么时候需要深不可变

1. **状态驱动 UI**：框架靠引用变化判断更新，原地突变会导致视图不刷新；
2. **安全的共享**：跨模块、跨 Worker（结构化克隆）传递数据时防止被意外修改；
3. **缓存与去重的键**：需要"内容相同即相等"的语义；
4. **并发读安全**：多个读取方可以长期持有引用而无需防御性拷贝。

## 3. 方案一：Object.freeze 与深冻结

```javascript
const config = Object.freeze({
  host: 'api.example.com',
  limits: Object.freeze({ qps: 100 }),
});

config.host = 'evil.com';              // 静默失败（严格模式抛 TypeError）
config.limits.qps = 999;               // 嵌套层未被冻结，仍然可改！
```

`freeze` 是**浅**冻结，深结构需要递归处理：

```javascript
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}
```

**边界**：`freeze` 后对象仍是引用类型（`===` 比较引用）；冻结 Map/Set 需另配 `add/set` 拦截；循环引用要加防重入集合。

## 4. 方案二：结构共享式更新（不可变更新的工程解）

深冻结的痛点是"改一个字段要重建整棵树"。结构共享库只重建变更路径，其余节点复用：

```javascript
// Immer 风格（生成式 API）
import { produce } from 'immer';

const nextState = produce(state, draft => {
  draft.user.address.city = '杭州';  // 直接"改"草稿
});
// state 原对象不变；nextState 与 state 共享未变更的子树
```

| 工具 | 风格 | 特点 |
| --- | --- | --- |
| Immer | 可变写法生成不可变结果 | 心智负担最低，代理有少量开销 |
| immutable.js | 独立的数据结构（List/Map） | 哈希 trie，性能好，但与原生类型互转繁琐 |
| 手写展开运算符 | `{ ...obj, ...patch }` | 零依赖，深层更新时样板代码多 |

React 生态（含 React Compiler 时代）的主流选择是 Immer 或展开运算符。

## 5. 方案三：自定义值语义（内容相等）

要实现"内容相同即相等"（Records 承诺的核心能力），可以按数据角色定制：

### 5.1 序列化比较：适合纯数据

```javascript
function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);  // 键序敏感，慎用于大结构
}

// 更稳妥：比较前按键排序，或用 Node 的 assert.deepStrictEqual 语义
```

### 5.2 规范化键：用字符串做 Map 的键

```javascript
function pointKey(x, y) { return `${x},${y}`; }

const cache = new Map();
cache.set(pointKey(1, 2), expensiveCompute(1, 2));
cache.has(pointKey(1, 2));  // true：坐标相同即命中
```

这是 Records 缓存键场景最常见的降级方案：**把结构规范化为原始值**。

### 5.3 值对象：类层面自定义相等

```javascript
class Money {
  constructor(cents, currency) {
    this.cents = cents;
    this.currency = currency;
    Object.freeze(this);
  }
  equals(other) {
    return other instanceof Money &&
      this.cents === other.cents &&
      this.currency === other.currency;
  }
  withCents(cents) { return new Money(cents, this.currency); }
}
```

配合 TypeScript 可以把 `equals` 约束进类型系统；语言级解决方案仍要等未来提案，但值对象模式今天就能落地。

## 6. 方案四：克隆防突变边界

跨边界（存储、Worker、第三方回调）传数据时，与其要求对方不修改，不如**给副本**：

```javascript
const snapshot = structuredClone(state);  // 深拷贝，含 Date/Map/Set（详见 020 篇）

// 只读契约：冻结传出的视图
Object.freeze(state);
```

`structuredClone` 与深浅拷贝的完整对比见 `javascript/020-DeepShallowCopy`。

## 7. 方案对比与选型

| 需求 | 推荐方案 | 不推荐 |
| --- | --- | --- |
| 配置/常量只读 | `deepFreeze` + TypeScript `as const` | 手写层层解构 |
| 框架状态更新 | Immer 或展开运算符 | 原地 `push`/`splice` |
| 缓存键/去重 | 规范化字符串键 + Map | 依赖对象 `===` |
| 领域模型相等 | 值对象类 + `equals` | 深比较整棵对象树 |
| 跨边界传递 | `structuredClone` 副本 | 直接共享可变引用 |
| 语言级值类型 | 等未来提案（R&T 已撤回） | `#{}` 语法实验特性 |

## 8. 动手试试

1. 实现 `deepFreeze` 并处理循环引用（用 `WeakSet` 记录已冻结对象）；
2. 用 `Map` + 规范化键实现一个"按查询参数缓存请求结果"的函数；
3. 用 Immer 把一个深层嵌套的 reducer 从展开运算符风格迁移过来，对比代码量；
4. 给 `Money` 增加加法运算，保证运算结果也是冻结的值对象。

## 9. 一句话记住

> Records & Tuples 已被 TC39 撤回——深不可变要靠工程方案实现：只读用深冻结，更新用结构共享，相等用规范化键或值对象，边界传递用 structuredClone。
