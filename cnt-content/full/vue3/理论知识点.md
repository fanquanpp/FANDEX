---
order: 150
tags:
  - vue3
  - theory
difficulty: intermediate
title: 'Vue3 理论知识点'
module: vue3
category: 'Vue3 Theory'
description: '虚拟 DOM、响应式原理、编译策略与性能模型。'
related:
  - vue3/高级组件特性
  - 'vue3/项目示例-个人博客站点'
prerequisites:
  - vue3/语法速查
---

Object.defineProperty(obj, key, {
enumerable: true,
configurable: true,
get() {
if (Dep.target) {
dep.depend();
}
return val;
},
set(newVal) {
if (newVal === val) return;
val = newVal;
dep.notify();
}
});
}

````

### defineProperty 的局限性

| 局限 | 说明 | 影响 |
|------|------|------|
| 无法检测属性添加 | 新增属性不是响应式的 | 需要 `Vue.set()` / `this.$set()` |
| 无法检测属性删除 | 删除属性不触发更新 | 需要 `Vue.delete()` / `this.$delete()` |
| 无法检测数组索引 | `arr[index] = value` 不触发更新 | 需要重写数组方法 |
| 无法检测数组长度 | `arr.length = newLen` 不触发更新 | 需要重写数组方法 |
| 深层监听需递归 | 初始化时递归遍历所有属性 | 性能开销大，初始化慢 |
| 每个属性一个 Dep | 属性级别的依赖收集 | 内存开销大 |

Vue2 对数组的处理：重写了 `push`、`pop`、`shift`、`unshift`、`splice`、`sort`、`reverse` 七个方法，在调用时手动触发更新。

### Vue3 的 Proxy

Vue3 使用 ES6 Proxy 实现响应式，代理整个对象而非单个属性。

```javascript
const reactiveMap = new WeakMap();

function reactive(target) {
  if (typeof target !== "object" || target === null) return target;
  if (reactiveMap.has(target)) return reactiveMap.get(target);

  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      track(target, key);
      const result = Reflect.get(target, key, receiver);
      if (typeof result === "object" && result !== null) {
        return reactive(result);  // 懒递归，访问时才代理
      }
      return result;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        trigger(target, key);
      }
      return result;
    },
    deleteProperty(target, key) {
      const hadKey = key in target;
      const result = Reflect.deleteProperty(target, key);
      if (hadKey && result) {
        trigger(target, key);
      }
      return result;
    }
  });

  reactiveMap.set(target, proxy);
  return proxy;
}
````

### Proxy 的优势

| 特性     | defineProperty   | Proxy                |
| -------- | ---------------- | -------------------- |
| 属性添加 | 需要手动处理     | 自动检测             |
| 属性删除 | 需要手动处理     | 自动检测             |
| 数组操作 | 需要重写方法     | 原生支持             |
| 深层代理 | 初始化时递归     | 懒代理，访问时才递归 |
| 代理粒度 | 属性级别         | 对象级别             |
| Map/Set  | 不支持           | 支持                 |
| 性能     | 初始化慢，更新快 | 初始化快，访问稍慢   |

### Proxy 的局限

1. **不能代理原始类型** -- `reactive(42)` 无效，需要用 `ref` 包装
2. **不是透明代理** -- `proxy !== target`，某些场景需用 `toRaw` 获取原始对象
3. **WeakMap 兼容性** -- IE11 不支持，Vue3 不再支持 IE11
4. **性能开销** -- 每次属性访问都经过 Proxy 拦截，比直接访问慢约 50%

### ref 的实现

对于原始类型值，Vue3 使用 `ref` 配合类访问器（class accessor）实现响应式：

```javascript
function ref(value) {
  return new RefImpl(value);
}

class RefImpl {
  constructor(value) {
    this._value = toReactive(value);
    this._rawValue = value;
    this.__v_isRef = true;
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newVal) {
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal;
      this._value = toReactive(newVal);
      triggerRefValue(this);
    }
  }
}
```

---

## 虚拟 DOM Diff 算法

### 为什么需要虚拟 DOM

虚拟 DOM 是真实 DOM 的 JavaScript 对象表示，通过对比新旧虚拟 DOM 树的差异（diff），最小化 DOM 操作次数。

```
模板/JSX --> 虚拟DOM --> 真实DOM
              |
              +-- diff 对比 --> 最小化 DOM 更新
```

### Vue3 的 Diff 算法：最长递增子序列

Vue3 的 diff 算法分为五个步骤：

#### 步骤一：从头同步

从头部开始比较，遇到不同的节点停止：

```
旧: [A, B, C, D, E, F, G]
新: [A, B, F, C, D, E, H, G]
     ^  ^  |
     相同  停止（C != F）
```

#### 步骤二：从尾同步

从尾部开始比较，遇到不同的节点停止：

```
旧: [A, B, C, D, E, F, G]
新: [A, B, F, C, D, E, H, G]
                   |     ^  ^
                   停止   相同
```

#### 步骤三：挂载新节点

如果旧节点遍历完毕，新节点还有剩余，则挂载剩余新节点。

#### 步骤四：卸载旧节点

如果新节点遍历完毕，旧节点还有剩余，则卸载剩余旧节点。

#### 步骤五：未知子序列处理

当首尾同步后仍有未处理的节点，使用最长递增子序列（LIS）优化移动：

1. 为新节点中未处理的节点建立索引映射
2. 遍历旧节点中未处理的部分，匹配新节点
3. 需要移动的节点中，找出最长递增子序列
4. LIS 中的节点不需要移动，只需移动不在 LIS 中的节点

```
旧: [C, D, E, F]
新: [F, C, D, E]

新节点索引映射: F->0, C->1, D->2, E->3
旧节点在新中的位置: [1, 2, 3, 0]
最长递增子序列: [1, 2, 3] (对应 C, D, E)
只需移动 F 到开头
```

### 与 React Diff 的对比

| 特性       | Vue3              | React          |
| ---------- | ----------------- | -------------- |
| 算法       | 双端比较 + LIS    | 单端比较       |
| 节点移动   | 最小化移动（LIS） | 按顺序移动     |
| Key 的作用 | 复用和移动判断    | 复用判断       |
| 时间复杂度 | O(n) 平均         | O(n)           |
| 移动次数   | 最少              | 可能多于最优解 |

---

## 编译优化

### 静态提升（Static Hoisting）

编译器将不会变化的节点提升到渲染函数外部，避免每次渲染重新创建：

```html
<template>
  <div>
    <p>Static text</p>
    <p>{{ dynamic }}</p>
  </div>
</template>
```

编译输出：

```javascript
const _hoisted_1 = /*#__PURE__*/ _createElementVNode('p', null, 'Static text', -1);

function render() {
  return _createElementBlock('div', null, [
    _hoisted_1, // 静态节点复用
    _createElementVNode('p', null, _toDisplayString(_ctx.dynamic), 1),
  ]);
}
```

### 补丁标记（Patch Flag）

编译器为动态节点添加标记，diff 时只检查标记的部分：

| 标记值 | 含义             | 检查内容             |
| ------ | ---------------- | -------------------- |
| 1      | TEXT             | 仅文本内容           |
| 2      | CLASS            | 仅 class 绑定        |
| 4      | STYLE            | 仅 style 绑定        |
| 8      | PROPS            | 仅动态属性           |
| 16     | FULL_PROPS       | 有动态 key 的属性    |
| 32     | HYDRATE_EVENTS   | 事件监听器           |
| 64     | STABLE_FRAGMENT  | 子节点顺序不变的片段 |
| 128    | KEYED_FRAGMENT   | 带 key 的片段        |
| 256    | UNKEYED_FRAGMENT | 不带 key 的片段      |

```javascript
_createElementVNode('p', { class: _ctx.activeClass }, null, 2 /* CLASS */);
// diff 时只检查 class 属性
```

### 块级树（Block Tree）

Vue3 将模板按结构指令（v-if/v-for）分割为嵌套的 Block。每个 Block 扁平化收集其内部的所有动态节点，diff 时跳过静态节点。

```
模板:
<div>
  <p>Static</p>
  <p>{{ a }}</p>
  <div v-if="show">
    <span>{{ b }}</span>
  </div>
</div>

Block 结构:
Root Block: [p{{a}}, v-if Block]
  v-if Block: [span{{b}}]
```

diff 时只需遍历 Block 的 dynamicNodes 数组，跳过所有静态节点。

### 静态缓存（Cache Handler）

事件处理函数在默认情况下每次渲染都会创建新函数，导致子组件不必要的更新。编译器自动缓存内联事件处理函数：

```html
<template>
  <button @click="count++">{{ count }}</button>
</template>
```

编译输出：

```javascript
export function render(_ctx) {
  return _createElementBlock(
    'button',
    {
      onClick: _cache[0] || (_cache[0] = ($event) => _ctx.count++),
    },
    _toDisplayString(_ctx.count),
    1 /* TEXT */
  );
}
```

### Vue2 vs Vue3 编译优化对比

| 优化点     | Vue2             | Vue3                          |
| ---------- | ---------------- | ----------------------------- |
| 静态节点   | 每次渲染重新创建 | 静态提升，只创建一次          |
| diff 范围  | 全量对比         | 仅对比动态节点（Patch Flag）  |
| Block 结构 | 无               | 嵌套 Block 扁平化收集动态节点 |
| 事件缓存   | 每次创建新函数   | 自动缓存                      |
| 文本插值   | 总是更新         | 仅 TEXT 标记时更新            |

---

## 理论速查表

| 概念           | 核心要点                 | 关键细节                         |
| -------------- | ------------------------ | -------------------------------- |
| Proxy 响应式   | 代理整个对象             | 自动检测属性增删，懒递归深层代理 |
| defineProperty | 劫持单个属性             | 无法检测属性增删，需递归初始化   |
| ref            | 原始类型响应式           | class accessor + track/trigger   |
| Diff 算法      | 双端比较 + LIS           | 最长递增子序列最小化移动         |
| 静态提升       | 不变节点提升到渲染函数外 | 避免重复创建 VNode               |
| Patch Flag     | 动态节点标记             | diff 时只检查标记部分            |
| Block Tree     | 按结构指令分割 Block     | 扁平化收集动态节点               |
| 事件缓存       | 自动缓存内联事件         | 避免子组件不必要更新             |
| effect         | 响应式副作用             | track 收集依赖，trigger 触发更新 |
| computed       | 懒计算 + 缓存            | 依赖变化时标记 dirty，访问时重算 |

```

```

```

```
