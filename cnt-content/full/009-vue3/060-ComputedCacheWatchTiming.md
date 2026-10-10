---
order: 70
title: computed 缓存与 watch 时机：依赖变了之后，到底谁先跑
module: 'vue3'
category: 前端技术
difficulty: advanced
description: 以「count 改了之后，computed 为什么不立刻重算、watch 为什么不在赋值那行立刻执行」引入两个派生 API 的心智模型：computed 是带脏标记的惰性缓存，watch 是排队等待调度的副作用；用五次实验讲透惰性求值、缓存命中、flush 三档时机、deep 与旧值陷阱、onCleanup 竞态治理，附执行顺序预测题与搜索框竞态修复实战。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'vue3/050-ReactiveSystem'
  - 'vue3/080-CompositionAPIAdvantageScene'
  - 'vue3/360-Vue3NewFeatures3435'
  - 'vue3/090-CustomHook'
prerequisites:
  - 'vue3/050-ReactiveSystem'
---

## 前置知识

- 已完成[响应式系统](/vue3/050-ReactiveSystem)：知道 `ref` / `reactive` 的依赖收集与触发更新是怎么回事，认识「改了数据，视图自动变」这条因果链；
- 读过[JavaScript 事件循环](/javascript/290-EventLoop)更好：本文讲 watch 时机时会借用「微任务队列」的概念，没读过也能跟上，出现处现场补一句。

## 学习目标

读完本文你将能够：

1. 解释 computed 的三件事：惰性求值、脏标记缓存、与 methods 的本质区别；
2. 预测「改数据 → computed 重算 → 组件重渲染 → watch 回调」四件事的先后顺序，说出 watch 的 `flush` 三档各排在哪一步；
3. 在 watch、watchEffect、watchPostEffect 三个 API 里做正确选型，并说出各自的适用特征；
4. 避开三个高频陷阱：监听 reactive 对象时新旧值相同、getter 写法丢旧值、computed 里写副作用；
5. 用 `onCleanup` 解决搜索框竞态：让「慢的旧请求」覆盖不了「快的新请求」。

预计 50 到 70 分钟。

## 1. 你现在要解决什么问题

同一份数据派生视图，Vue 给了两条路：computed（派生值）和 watch（派生副作用）。初学者几乎都会撞上这两个现象：

现象一，computed 「反应迟钝」：

```javascript
const count = ref(0);
const doubled = computed(() => {
  console.log('computed 执行');
  return count.value * 2;
});

console.log(doubled.value);   // computed 执行 → 0
count.value = 1;              // 注意：此刻没有任何日志！
console.log(doubled.value);   // computed 执行 → 2
```

`count.value = 1` 的那一行，computed **没有重算**。很多人第一反应是「响应式坏了」，实际上它工作得很好——只是你对它的工作方式理解错了。

现象二，watch「不听话」：

```javascript
const count = ref(0);
watch(count, () => {
  console.log('watch:', document.querySelector('#n').textContent);
});

count.value = 1;
console.log('同步代码结束');
// 输出顺序：同步代码结束 → watch: ...（读到的还是旧内容！）
```

watch 回调里读 DOM，读到的却是**上一次渲染**的内容。不是 bug，是时机。

这两个现象指向同一个问题：**依赖变化之后，Vue 不会立刻做任何事，而是把事情排进队列**。理解这条队列，就理解了 computed 与 watch 的一切。

## 2. 心智模型：一张便签两个格子

把响应式系统想象成一张便签，上面有两个格子：

- **computed 是「算好的数」格子**：平时写着一个值，旁边有个「脏了」的小红旗。你问它值的时候，它先看旗子——旗子没插，直接把旧答案报给你（缓存命中）；旗子插着，才重新算一遍，算完把旗子拔掉。
- **watch 是「待办清单」格子**：依赖变化只是往清单上**记一笔**（排队），并不是立刻去做。做的时间点由调度器决定，默认排在「组件重渲染之前」，`flush: 'post'` 则排在「重渲染之后」。

两句话总结：

> computed 的关键词是**惰性**——不读不算，读了也只算该算的。
> watch 的关键词是**排队**——触发只是登记，执行要看队列。

记住这两个词，下面五次实验逐一验证。

## 3. 实验：computed 的缓存边界

### 3.1 三次读取两次计算

```javascript
const count = ref(0);
const doubled = computed(() => {
  console.log('算一次');
  return count.value * 2;
});

doubled.value;  // 算一次（首次读取，缓存为空）
doubled.value;  // （无日志：缓存命中）
doubled.value;  // （无日志：缓存命中）
```

首次读取执行求值函数并把结果缓存；后续读取直接返回缓存。这就是「computed 是属性不是函数」的原因——属性语义意味着「读多少次都便宜」。

### 3.2 依赖变了也不算，下次读才算

```javascript
count.value = 1;        // 只是插脏标记，无日志
count.value = 2;        // 又变，脏标记已插着，无日志
doubled.value;          // 算一次 → 4
```

关键点：**依赖变化不会触发重算，只会把脏标记插上**。中间改了十次，只要没人读，就一次都不算；最终只按最新值算一次。这叫「惰性求值」，它天然合并了批量修改。

### 3.3 对比 methods：没有旗子的格子

```javascript
function doubledFn() { console.log('算一次'); return count.value * 2; }
doubledFn();  // 算一次
doubledFn();  // 算一次（每次都算）
```

methods 每次调用都执行。那是不是「性能上永远该用 computed」？不是——选型标准是**语义**：

| 判断 | 用什么 | 理由 |
| --- | --- | --- |
| 从已有数据**算出一个值** | computed | 值有缓存，模板里当属性用 |
| 要**响应一次变化**（发请求、写 localStorage、滚动画布） | watch / watchEffect | 这是副作用，不是值 |
| 每次调用都要**重新执行**的逻辑（如事件处理） | methods / 普通函数 | 本来就不该缓存 |

### 3.4 可写 computed：派生值也能反过来写

```javascript
const firstName = ref('Ada');
const lastName = ref('Lovelace');
const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set(v) {
    [firstName.value, lastName.value] = v.split(' ');
  },
});
fullName.value = 'Grace Hopper';   // 写 fullName 会反向改两个字段
```

典型场景是 `v-model` 一个派生状态（比如带格式化的输入框）。注意 setter 里改的还是**原始数据**，computed 自己永远不存状态——它是原始数据的投影。

### 3.5 红线：computed 里不许有副作用

```javascript
// 错误示范
const total = computed(() => {
  items.value.push({ id: Date.now() });   // 改依赖 → 触发自己 → 死循环（Vue 会报警告）
  return items.value.length;
});
```

computed 的契约是「同一依赖状态下，读多少次结果都一样」。往里面写请求、改状态、操作 DOM，都在破坏这个契约：轻则无限重算，重则缓存永远不命中、性能崩掉。需要副作用就老实去用 watch。

## 4. 实验：watch 到底排在队列的哪个位置

### 4.1 默认 flush: 'pre'——渲染之前

```vue
<template>
  <p id="n">{{ count }}</p>
</template>

<script setup>
const count = ref(0);
watch(count, () => {
  console.log('watch:', document.querySelector('#n').textContent);
});
count.value = 1;
console.log('同步代码结束');
</script>
```

输出顺序：

```text
同步代码结束
watch: 0        ← DOM 还是旧的
```

时序是：`count.value = 1` 触发 trigger，watch 回调作为 **pre 任务**入队；同步代码先跑完；然后微任务里执行队列——先跑 pre 的 watch 回调，**再**执行组件重渲染。所以 watch 回调里读到的是旧 DOM。

这正是 [事件循环](/javascript/290-EventLoop) 里「微任务清空」的又一次现身：Vue 的调度器把渲染和 watcher 都排在一个微任务批次里，按 pre → 组件更新 → post 的顺序消费。

### 4.2 flush: 'post'——渲染之后

```javascript
watch(count, () => {
  console.log('watch:', document.querySelector('#n').textContent);
}, { flush: 'post' });
// count.value = 1 后：watch: 1 ← 新 DOM
```

「访问更新后的 DOM」（测尺寸、滚动、聚焦）一律用 post。等价的语法糖是 `watchPostEffect`。

### 4.3 flush: 'sync'——赋值那一行立刻跑

```javascript
watch(count, () => console.log('sync:', count.value), { flush: 'sync' });
count.value++;   // sync: 1（立刻）
count.value++;   // sync: 2（立刻）
```

每次修改同步触发，批量修改时回调跑 N 次，一般只用于「必须拿到变化瞬间状态」的调试或极特殊场景。日常默认 pre，够用。

### 4.4 批量合并：改十次只触发一次

```javascript
watch(count, () => console.log('触发', count.value));

count.value = 1;
count.value = 2;
count.value = 3;    // 同一轮同步代码里连改三次
// 输出只有一次：触发 3
```

同一微任务批次内的多次修改被合并成一次回调，拿到的也是**最终值**。这是「排队」心智模型的直接推论：入队的是「待办事项」，不是「每次变化的快照」。

### 4.5 immediate：让回调也跑第一遍

```javascript
watch(source, (val) => console.log('值是', val), { immediate: true });
// 注册时立刻用当前值跑一遍，之后照常响应变化
```

适合「初始值也要处理」的场景（如用 watch 做请求加载）。注意此时 `oldVal` 是 `undefined`。

## 5. 选型：watch、watchEffect、watchPostEffect

```javascript
// watch：显式声明源，回调拿新旧值，惰性（默认不立即执行）
watch([firstName, lastName], ([fn, ln], [pf, pl]) => { /* ... */ });

// watchEffect：立刻跑一遍，执行中读到谁就追踪谁
watchEffect(() => console.log(`${firstName.value} ${lastName.value}`));

// watchPostEffect：watchEffect 的 flush: 'post' 版
watchPostEffect(() => console.log(el.value?.offsetHeight));
```

选型口诀：

| 特征 | watch | watchEffect |
| --- | --- | --- |
| 依赖 | 显式列出 | 执行中动态追踪 |
| 新旧值 | 有 | 无 |
| 首次执行 | 默认不跑（immediate 可开） | 立刻跑 |
| 回调可能不涉及追踪的依赖 | 可以（如「值变了就发请求」） | 不行——读不到的依赖追踪不到 |

一句话：**知道自己在等什么用 watch；只知道「要做一件事，用到啥就盯啥」用 watchEffect**。条件分支里访问不同依赖时（`if (a.value) 用 b` else 用 c），watchEffect 的动态追踪是特性也是陷阱：这次跑没读到的依赖，这次的变化不会触发它。

## 6. 深层监听与旧值：最容易翻车的三处

### 6.1 传 reactive 对象 = 隐式 deep

```javascript
const state = reactive({ nested: { count: 0 } });

watch(state, () => console.log('变了'));        // 深层变化也触发（隐式 deep）
state.nested.count = 1;                          // 触发
```

但注意两个推论：第一，**新旧值是同一个对象**（都是那个 reactive 代理，Vue 文档明确说 mutate 时不区分新旧），比较 `newVal === oldVal` 永远为 true；第二，隐式深监听会遍历整棵对象树，大对象上很贵。

### 6.2 getter 写法：精确且省，但要记得 deep

```javascript
// 只盯一个叶子，便宜且新旧值有意义
watch(() => state.nested.count, (n, o) => console.log(o, '->', n));

// getter 返回对象：默认只在「对象被整体替换」时触发
watch(() => state.nested, () => console.log('nested 被换了'));
// 想在内部属性变化时也触发，必须显式 deep: true
watch(() => state.nested, cb, { deep: true });
```

### 6.3 想监听 reactive 的某个属性，别这样写

```javascript
watch(state.nested.count, cb);      // 错：传进去的是数字 0，不是响应式引用
watch(() => state.nested.count, cb); // 对：getter 每次重新读取
```

口诀：**源要么是 ref，要么是 getter，要么是整个 reactive 对象（隐式深）**。

### 6.4 一次性与调试钩子

```javascript
watch(source, cb, {
  once: true,          // Vue 3.4+：触发一次后自动停止
  onTrigger(e) {       // 调试：谁的变化触发了我
    console.log('triggered by', e.key, e.type);
  },
});
```

Vue 3.5 还给 watch 加了 `pause()` / `resume()`（暂停期间变化不触发，恢复时看配置是否补发），详见[Vue 3.4 / 3.5 新特性](/vue3/360-Vue3NewFeatures3435)。

## 7. onCleanup：把竞态摁住

watch 回调里发异步请求，有个必然的坑：快速输入「a」「ab」「abc」，三个请求先后发出，**先发的可能后回**——界面上最终显示的是「a」的结果。

```javascript
const results = ref([]);
watch(query, async (q) => {
  const res = await fetch(`/api/search?q=${q}`);
  results.value = await res.json();      // 旧请求如果后返回，会覆盖新结果！
});
```

watch 的第三个参数 `onCleanup` 就是为此准备的：**注册一个函数，在「下次回调执行前」与「watcher 停止时」调用**。用它作废上一次请求：

```javascript
watch(query, async (q, oldQ, onCleanup) => {
  const controller = new AbortController();
  onCleanup(() => controller.abort());   // 下一次查询开始前，作废这一次

  try {
    const res = await fetch(`/api/search?q=${q}`, { signal: controller.signal });
    results.value = await res.json();
  } catch (e) {
    if (e.name !== 'AbortError') throw e; // 只上报真错误
  }
}, { immediate: true });
```

时序保证了正确性：新回调执行**之前**，旧请求一定已被 abort，慢的旧响应根本到不了赋值那一步。Vue 3.5 起也可以在回调内部直接调用导入的 `onWatcherCleanup()`，效果相同；把这段逻辑封装成 `useSearch(query)`，就是一个标准的[自定义组合式函数](/vue3/090-CustomHook)。

## 8. 常见坑与调试实录

- **computed 里发了请求**：初始化后永不再发（依赖没变就不重算），且违反无副作用契约。请求类副作用一律 watch（可拿新旧值、可 cleanup）。
- **watchEffect 里读了 DOM**：首次同步执行时 DOM 还没挂载，拿到 null。DOM 相关一律 `watchPostEffect`。
- **监听 reactive 的新旧值永远相等**：上面 6.1 讲过，换成 getter 盯具体叶子。
- **怀疑依赖没被追踪**：给 watch 开 `onTrack(e => console.log('track', e.target, e.key))`，把追踪到的依赖打出来对照。
- **computed 返回新对象导致 watch 疯狂触发**：`computed(() => ({ a: x.value, b: y.value }))` 每次重算都是新引用，监听它的 watch 若开 deep 会频繁触发。让 watch 盯原始的 x、y，或改监听 getter 返回原始值。
- **sync 成瘾**：flush: 'sync' 在批量场景让回调跑 N 次，先想清楚是否真的需要「逐次同步」，绝大多数答案是不需要。

## 9. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
const count = ref(0);
const double = computed(() => { console.log('C'); return count.value * 2; });
watch(count, () => console.log('W'));

console.log(double.value);  // ①
count.value = 1;            // ②
count.value = 2;            // ③
console.log(double.value);  // ④
```

提示：②③处有触发吗？④处呢？答案：①打印 C；②③什么都不打印（watch 入队被合并、computed 只插脏标记）；④打印 W 再打印 C（pre watcher 先于本轮渲染执行，computed 在被读取时重算）。对不上就回到「惰性 + 排队」两关键词逐格推演。

修改题（15 分钟）：把 7 节的搜索框代码改成 watchEffect 版本（不需要 immediate），并用 `onWatcherCleanup`（Vue 3.5+）替代第三参数。验收：连续改三次 `query.value`，网络面板里只有最后一次请求是完成状态，前两次均为 canceled。

修 Bug 题（15 分钟）：下面的代码想统计购物车总价变化历史，实际一次都没打印。找原因并修复：

```javascript
const cart = reactive({ items: [{ price: 10 }] });
watch(cart.items[0], () => console.log('item 变了'));
watch(cart, () => console.log('cart 变了'));

cart.items.push({ price: 20 });          // A 行
cart.items[0].price = 15;                // B 行
```

提示：A 行改的是数组本身，B 行改的是数组里的对象。答案：第一个 watch 的源 `cart.items[0]` 是个 reactive 对象（隐式深，能监听），但 push 之后它监听的对象没变所以不触发——准确说是「源是当时的第 0 项对象」，A 行不触发它；第二个 watch 传了整个 reactive 对象，隐式深监听，A、B 都触发。修复意图「任何变动都统计」就删掉第一个 watch；意图「盯第一项」就写 `watch(() => cart.items[0], cb, { deep: true })`。

挑战题（40 分钟，脱离示例）：实现一个 `useAutoSave(data, save, delay = 1000)` 组合式函数：data 是任意 ref，save 是异步函数。要求：停止修改 1 秒后才保存；保存期间再次修改要重新计时；组件卸载时若有未保存的修改，立刻保存一次；重复调用 save 需要防重入。验收：手动改 data 三次（间隔小于 1 秒），控制台只出现一次「保存中」；卸载组件时打印「卸载保存」。

提示（思路方向）：`watch(data, cb, { flush: 'post' })` 里重置一个 setTimeout；卸载钩子里判断「脏标志」并直接调用 save；用布尔标志防重入。展开（关键 API）：`onBeforeUnmount`、`setTimeout` / `clearTimeout`、`watch` 第三参数。参考实现：

```javascript
import { watch, onBeforeUnmount } from 'vue';

export function useAutoSave(data, save, delay = 1000) {
  let timer = null;
  let dirty = false;
  let saving = false;

  const doSave = async () => {
    if (saving) return;
    saving = true;
    dirty = false;
    try { await save(data.value); } finally { saving = false; }
  };

  const stop = watch(data, () => {
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(doSave, delay);
  });

  onBeforeUnmount(() => {
    clearTimeout(timer);
    stop();
    if (dirty) doSave();   // 卸载前的兜底保存
  });
}
```

## 10. 与之前和之后的知识的关系

- 往前：[响应式系统](/vue3/050-ReactiveSystem)讲的「依赖收集与触发」是本文的地基——computed 的脏标记与 watch 的入队，都是 trigger 阶段的两条不同后路；
- 往后：本文的 API 选型与 cleanup 技巧，会在[自定义 Hook](/vue3/090-CustomHook)与[自定义组合式函数](/vue3/090-CustomHook)里被大量使用；3.5 的 pause/resume 与 onWatcherCleanup 见[Vue 3.4 / 3.5 新特性](/vue3/360-Vue3NewFeatures3435)；watch 时机与组件更新队列的关系，在[编译优化](/vue3/280-Vue3CompileOptimization)里还会再深入一层。

## 11. 官方文档

- 响应式 API 进阶（computed 与 watch 的行为细节）：https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
- 侦听器指南（flush、deep、cleanup）：https://cn.vuejs.org/guide/essentials/watchers.html
- 3.5 更新日志（onWatcherCleanup、pause/resume）：https://blog.vuejs.org/posts/vue-3.5

## 自我检查

- 能不看资料向同事解释：为什么 `count.value = 1` 之后 computed 没有立刻重算，以及它什么时候才算；
- 能画出「同步代码 → pre watcher → 组件更新 → post watcher」这条时序线，并说出三个 flush 值各排在哪；
- 能说出 watch / watchEffect / watchPostEffect 各自的选型特征，并举一个「只能用 watch」的场景（需要旧值或条件触发）；
- 能解释搜索框竞态为什么发生，并用 onCleanup 修复；
- 能复述「监听 reactive 对象的新旧值相同」与「getter 传源要 deep」这两条规则。

## 本章总结

computed 是带脏标记的惰性缓存：不读不算、变了只插旗、下次读才重算，契约是纯函数式的「依赖不变结果不变」，里面不许有副作用。watch 是排队的副作用：默认 flush pre 排在组件更新之前，post 排在之后，sync 同步执行；同一批次内的多次修改合并为一次回调。选型上「等明确的源」用 watch（要旧值、要条件），「读到谁盯谁」用 watchEffect（DOM 相关用 watchPostEffect）。监听 reactive 对象隐式深但新旧值相同，getter 精确但深层变化要显式 deep。异步回调里的竞态交给 onCleanup：下一次执行前作废上一次的未完成请求。
