---
order: 140
title: Transition 与动画：Vue 怎么知道你的动画什么时候演完
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 以「过渡类名到底什么时候加、什么时候摘」为主线讲透 Transition 的类名时间线：插入前一帧到摘除的逐帧变化、结束信号的三种来源（transitionend、animationend、显式 duration）、mode 互斥切换、TransitionGroup 的 FLIP 移动动画原理，以及 CSS transition 与 animation 的经典失效现场，附逐帧打印实验与列表重排挑战题。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'vue3/120-TeleportSuspense'
  - 'vue3/050-ReactiveSystem'
  - 'vue3/190-VueRouterDetailed'
  - 'vue3/320-Vue3PerformancePractice'
prerequisites:
  - 'vue3/110-ComponentSystem'
---

## 前置知识

- 会用 `v-if` / `v-show` 与 `v-for`，知道 CSS `transition` 与 `animation` 的基本写法即可；不需要动画功底，本文的主角是 Vue 的时序控制。

## 学习目标

读完本文你将能够：

1. 画出 enter 过渡的类名时间线：`enter-from` 何时挂上、何时摘下、`enter-to` 何时接上、全部何时清除；
2. 说出 Vue 判断「动画演完了」的三种信号，以及 `type` 与 `:duration` 各在什么情况下登场；
3. 解释为什么「切换相同标签不触发动画」以及为什么 `animation` 写了却不生效，并能各给出修法；
4. 用 FLIP 四步讲清 TransitionGroup 的移动动画从哪来，说出 `leave-active` 上 `position: absolute` 的作用；
5. 在 CSS 过渡与 JS 钩子之间做选型，用 `:css="false"` 正确接入 GSAP 类动画库。

预计 40 到 55 分钟。

## 1. 你现在要解决什么问题

过渡「不生效」几乎都长这几种样子：

- 元素切换时**新内容直接出现**，淡入淡出一帧都没演；
- 明明写好了 CSS，元素却**瞬间跳变**；
- 列表删除一项后，**其余项瞬间跳到新位置**，move 动画根本没动；
- 用了 JS 动画库，动画倒是播了，**但播完元素卡在半路不消失**。

这四个现象背后是同一个问题：你不知道 Vue 在**哪一帧**做了什么。Transition 组件不是动画引擎——它不画任何一帧动画，它做的是**在正确的时间给元素挂/摘正确的类名**，并且**准确知道动画何时结束**。把这套路数搞明白，所有「不生效」都能自己推出来。

## 2. 心智模型：一个类名时序控制器

Transition 只服务一种场景：元素**进场**（插入或显示）与**退场**（移除或隐藏）。它把这两个过程各拆成三段，用三个类名标记：

| 阶段 | enter 类名 | leave 类名 |
| --- | --- | --- |
| 起点（1 帧） | `*-enter-from` | `*-leave-from` |
| 过程（持续） | `*-enter-active` | `*-leave-active` |
| 终点（到结束） | `*-enter-to` | `*-leave-to` |

以「淡入」为例，逐帧看它干了什么：

```text
第 0 帧：元素插入 DOM 前，挂上 enter-from + enter-active
         （enter-from 把 opacity 设为 0，元素以"透明"的姿态待命）
第 1 帧：插入 DOM；摘掉 enter-from，挂上 enter-to
         （起始态撤掉，浏览器开始向正常态过渡——这就是 transition 触发的那一帧）
…过渡进行中…（enter-active 让 transition 规则一直生效）
结束：摘掉全部三个类名，元素回归普通状态，不留任何痕迹
```

两个关键设计：

- **为什么 enter-from 只挂一帧？** transition 属性需要「从 A 到 B」的变化才能生效。先把元素按 A 态渲染出来，下一帧切成 B 态，浏览器才有「变化」可演。这就是为什么你在 DevTools 里**几乎抓不到 enter-from**——它只存在一帧。
- **Vue 怎么知道演完了？** 它监听元素上的 `transitionend` / `animationend` 事件。CSS 里同时有 transition 和 animation 时会歧义，用 `type` 指定；事件可能不冒出来（如元素被 display: none）时用 `:duration` 显式兜底。

记住这句话就够了：**Transition 负责「什么时候加什么类、什么时候摘」，你负责「这些类名对应的 CSS 长什么样」**。责任划分清楚，排查就有章法——不生效先问「类名挂了吗」，再问「CSS 对吗」。

## 3. 一次逐帧实验讲透时间线

不用肉眼抓帧，用 JS 钩子把每个时刻打出来：

```vue
<template>
  <button @click="show = !show">切换</button>
  <Transition
    @before-enter="log('before-enter：马上插入')"
    @enter="log('enter：已插入，enter-from 刚被摘掉')"
    @after-enter="log('after-enter：动画结束，类名全摘')"
  >
    <div v-if="show" class="box">BOX</div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue';
const show = ref(true);
const log = (m) => console.log(Date.now() % 100000, m);
</script>

<style>
.box { width: 100px; height: 100px; background: #42b883; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

运行后把时间戳与 DevTools Elements 面板的类名对照，你会看到：before-enter 时元素还没在 DOM 里；enter 触发的瞬间 DOM 里已有元素且挂着 enter-active + enter-to；after-enter 时类名全部消失。**类名时序不再是文档上的表格，而是你亲手验证过的事实。**

同理，leave 的三个钩子 `before-leave` / `leave` / `after-leave` 对应退场三段。配合 120 篇的 Teleport，这就是生产级弹窗的完整底座。

## 4. 三类典型场景

### 4.1 单元素：v-if、v-show 与 key 切换

```vue
<Transition name="fade">
  <p v-if="show">内容</p>          <!-- 插入/移除触发 enter/leave -->
</Transition>

<Transition name="fade">
  <p v-show="show">内容</p>        <!-- display 切换，同样走类名，但 DOM 常驻 -->
</Transition>
```

`v-if` 与 `v-show` 都支持，区别在 DOM 是否真的移除。另一种触发是**key 切换**：

```vue
<Transition name="fade" mode="out-in">
  <div :key="tab">{{ tabs[tab] }}</div>
</Transition>
```

改 key 等于告诉 Vue「这是新元素」，旧的下场、新的进场。**不加 key 切换相同标签，Vue 会原地复用元素**——没有进出场，什么动画都不会发生，这是高频坑（6 节展开）。

### 4.2 互斥切换：mode 与双元素

默认情况下新旧元素**同时在场**——新元素进场的同时旧元素退场，两者叠在同一个位置，常见「叠影」。互斥内容（tab 页、路由页）要排队：

```vue
<Transition name="fade" mode="out-in">
  <component :is="currentTab" />
</Transition>
```

`out-in`：旧的先演完退场，新的再进场——路由切换的默认选择。`in-out`（新先进、旧后出）很少用，仅适合刻意重叠的设计。

### 4.3 列表：TransitionGroup 与 FLIP

列表的增删与**重排**用 TransitionGroup：

```vue
<template>
  <TransitionGroup name="list" tag="ul">
    <li v-for="item in items" :key="item.id">{{ item.text }}</li>
  </TransitionGroup>
</template>

<style>
.list-move,                       /* 重排（move）动画 */
.list-enter-active,
.list-leave-active { transition: all 0.5s ease; }
.list-enter-from,
.list-leave-to { opacity: 0; transform: translateX(30px); }
.list-leave-active {
  position: absolute;             /* 关键：退场项脱离文档流 */
}
</style>
```

移动动画（`.list-move`）的底层是 **FLIP** 技巧，四个字母对应四步：

```text
F（First）：记录元素移动前的位置
L（Last）：Vue 更新列表，元素瞬间跳到新位置
I（Invert）：用 transform 把元素"反向拉回"旧位置（视觉上没动）
P（Play）：摘掉 transform，浏览器把 transform 过渡回零——动画就是"从旧位置滑到新位置"
```

为什么 `leave-active` 必须加 `position: absolute`？因为退场中的元素**还占着文档流**：FLIP 给其余元素算「新位置」时，若离开的项还占位，后面的元素就「没必要」移动，move 动画无从发生。让它脱流，剩余项立刻重排，FLIP 才有戏可唱。这也解释了另一个细节：脱流后元素失去宽度约束，列表项需要自己保住宽度（如给 li 定宽）。

## 5. CSS 动画、JS 钩子与第三方库

### 5.1 animation 与 transition 的差异

```css
.bounce-enter-active { animation: bounce-in 0.5s; }
.bounce-leave-active { animation: bounce-in 0.5s reverse; }
@keyframes bounce-in {
  0% { transform: scale(0); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
```

用 `animation` 时**不要写** `*-enter-from` / `*-enter-to`——关键帧自己定义起止。另外 Vue 默认监听 `transitionend`，你演的是 `animationend`，两个事件都存在时可能提前或延后判定结束，用 `type="animation"` 或 `:duration="500"` 消歧（6 节案例二）。

### 5.2 JS 钩子：完全接管时序

```vue
<Transition :css="false" @enter="onEnter" @leave="onLeave">
  <p v-if="show">Animated</p>
</Transition>
```

```javascript
import gsap from 'gsap';

function onEnter(el, done) {
  gsap.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, onComplete: done });
}
function onLeave(el, done) {
  gsap.to(el, { opacity: 0, y: -30, duration: 0.5, onComplete: done });
}
```

`onComplete: done` 不是装饰——**done 回调就是「我演完了」的信号**，替代 CSS 事件。不调用 done，Vue 会认为动画瞬间结束（元素立刻被移除/就位），这就是 1 节第 4 个现象的病根。`:css="false"` 则让 Vue 跳过类名探测，纯按钩子走，还能避免 CSS 类名与 JS 动画互相干扰。

### 5.3 appear：首次渲染也要演

```vue
<Transition name="fade" appear>
  <p v-if="show">初渲染也走一遍 enter</p>
</Transition>
```

默认进场类名只在「出现于切换中」时挂，页面初次加载不触发；`appear` 让首次挂载也走一遍 enter 序列。列表骨架屏淡入常用它。

### 5.4 性能：让浏览器只做「便宜」的动画

只过渡 `transform` 与 `opacity`（合成器属性，不触发布局）；过渡 `width` / `height` / `top` 每帧重排，列表动画在低端机上直接掉帧。 FLIP 之所以聪明，正是它把「位置变化」也转成了 transform 过渡。更多的性能话题见[Vue3 性能实践](/vue3/320-Vue3PerformancePractice)。

## 6. 常见坑与调试实录

- **切换相同标签不触发**：Vue 复用同标签元素，没有进出场。给元素加 `:key`，或改用两个不同标签。
- **animation 写了却不生效 / 提前结束**：Vue 监听的是 `transitionend`，你演的是 `animationend`。加 `type="animation"` 或显式 `:duration`。诊断技巧：DevTools 里看到类名按预期挂/摘了，就查这条；类名没挂，回查结构与 key。
- **JS 钩子只写 @enter 不调 done**：动画没播完元素就没了。规则：`:css="false"` 时，enter/leave 钩子**必须**在动画结束时调用 `done()`。
- **TransitionGroup 忘了 position: absolute**：退场项占着文档流，move 动画失效，列表「整体跳变」。见 4.3 的 FLIP 解释。
- **过渡 display 属性**：display 是离散值，没有中间态，transition 不生效。要淡入淡出就过渡 opacity/visibility 组合（visibility 可过渡），别指望 display。
- **mode 写反**：路由切换用 `in-out` 会叠影。互斥内容一律 `out-in`。
- **v-show 元素 transitionend 丢失**：切换过快时事件可能不触发，Vue 卡在 active 类名上。给 Transition 显式 `:duration` 是最稳的兜底。
- **列表项没有 key 或用 index 当 key**：FLIP 与 diff 都依赖稳定 key；index 作 key 会让复用错乱、动画张冠李戴。key 一律用业务唯一 id。

## 7. 小练习

预测题（5 分钟，先写答案再运行验证）：把 3 节的实验改两处，预测输出：

1. 把 `@enter` 里的日志删掉，只留 before-enter 与 after-enter，快速连点两次切换按钮——after-enter 会被打断吗？打断时哪个钩子会触发？
2. 把 CSS 的 `transition: opacity 0.5s` 改成 `animation: fade-in 0.5s`（其余不动），动画还能播完吗？

提示：中断场景对应的是 `enter-cancelled` / `leave-cancelled`；第 2 题想 Vue 在听哪个事件。答案：1）连点会中断进行中的过渡，触发 `@enter-cancelled` 或 `@leave-cancelled`；2）动画大概率「跳变」——Vue 等的是 transitionend，等不到就按立即结束处理，需要 `type="animation"` 或 `:duration`。

修改题（20 分钟）：给一个 tab 页面（`<component :is="currentTab">`）加 out-in 过渡，并保证切换后滚动位置回到顶部。验收：快速连点三个 tab 不出现叠影、不错位；每次切换视口回到顶。

提示（思路方向）：mode="out-in" + `@after-leave` 里 `window.scrollTo(0, 0)`（在旧页面退场后再滚，视觉自然）。展开（关键 API）：Transition 的 after-leave 钩子。参考实现：

```vue
<template>
  <Transition name="fade" mode="out-in" @after-leave="scrollTop">
    <component :is="currentTab" :key="currentTab.name" />
  </Transition>
</template>

<script setup>
function scrollTop() {
  window.scrollTo({ top: 0 });
}
</script>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

修 Bug 题（15 分钟）：下面的列表删除功能「能用」，但删除时其余项瞬间跳位、离开项也没有淡出。找出两处错误并修复：

```vue
<TransitionGroup name="list" tag="ul">
  <li v-for="(item, index) in items" :key="index">
    {{ item.text }}
    <button @click="items.splice(index, 1)">删</button>
  </li>
</TransitionGroup>

<style>
.list-enter-active { transition: all 0.5s; }
.list-enter-from { opacity: 0; }
</style>
```

提示：对照 4.3 的完整样式找缺的类；再想 key 用 index 在删除时发生了什么。答案：样式缺 `list-leave-active` / `list-leave-to`（没有退场动画）与 `list-move`（没有重排动画），更关键的是没有 `.list-leave-active { position: absolute }`，其余项无法触发 move；key 用 index 会让删除后所有项「身份」前移，FLIP 与 diff 全部失真，应改用 `item.id`。修复版见 4.3 的代码。

挑战题（45 分钟，脱离示例）：不借助 TransitionGroup，用原生 JS 手写一个 30 行以内的 mini-FLIP：给定一个无序列表 DOM，重排其子元素顺序后，让每个子元素「滑动」到新位置。验收：重排瞬间肉眼可见平滑移动，无闪跳。

提示（思路方向）：先 `getBoundingClientRect` 记录 First；改 DOM 顺序后再次测量 Last；对每个元素施加 `transform: translate(dx, dy)`（Invert，此时要临时关掉 transition）；下一帧摘掉 transform 并开启 `transition: transform 0.3s`（Play）。展开（关键 API）：`getBoundingClientRect`、`requestAnimationFrame`、`el.style.transition`。参考实现：

```javascript
function flipReorder(list, newOrderIds) {
  const first = new Map();
  for (const li of list.children) first.set(li.dataset.id, li.getBoundingClientRect());

  // Last：按新顺序重排 DOM
  for (const id of newOrderIds) list.appendChild(list.querySelector(`[data-id="${id}"]`));

  // Invert + Play
  for (const li of list.children) {
    const f = first.get(li.dataset.id);
    const l = li.getBoundingClientRect();
    const dx = f.left - l.left;
    const dy = f.top - l.top;
    if (!dx && !dy) continue;
    li.style.transition = 'none';
    li.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      li.style.transition = 'transform 0.3s';
      li.style.transform = '';
    });
  }
}
```

## 8. 与之前和之后的知识的关系

- 往前：Transition 的进场退场建立在 v-if/v-show 的条件渲染上（[组件系统](/vue3/110-ComponentSystem)）；与 Teleport 的组合（模态框）见[Teleport 与 Suspense](/vue3/120-TeleportSuspense)；
- 往后：路由切换过渡在[VueRouter 详解](/vue3/190-VueRouterDetailed)里落地（`<router-view>` 外包 Transition）；FLIP 的 transform 思路与合成层渲染在[性能实践](/vue3/320-Vue3PerformancePractice)中扩展为通用优化原则。

## 9. 官方文档

- Transition 指南（类名时序与钩子）：https://cn.vuejs.org/guide/built-ins/transition.html
- TransitionGroup 与列表过渡：https://cn.vuejs.org/guide/built-ins/transition-group.html
- FLIP 技巧出处（A List Apart）：https://alistapart.com/article/flip-your-animations/

## 自我检查

- 能画出 enter 过渡从插入前一帧到类名全部摘除的完整时间线；
- 能说出 Vue 判断动画结束的三种信号（transitionend、animationend + type、显式 duration），并解释 JS 钩子场景下 done 的地位；
- 能解释「相同标签不触发动画」与「animation 不生效」两个现象的根因，并各给一种修法；
- 能用 FLIP 四步说明列表 move 动画的原理，以及 `leave-active` 上 position: absolute 的必要性；
- 知道只过渡 transform 与 opacity 的性能理由。

## 本章总结

Transition 不画动画，它控制类名时序：起点类挂一帧待命、过程类贯穿始终、终点类接续到结束，全部摘除后元素回归普通。结束信号靠事件监听（transitionend/animationend），歧义用 type 消除，事件不可靠用显式 duration 兜底；JS 接管则用 :css="false" 并必须在完成时调用 done。互斥内容用 mode out-in 防叠影。列表重排走 TransitionGroup 的 FLIP：先记位置、重排后反向拉回、再过渡回零——退场项必须 position: absolute 脱离文档流，否则其余元素「没必要动」。性能上只过渡 transform 与 opacity。所有「不生效」的排查口诀：先看类名挂没挂，再看 CSS 对不对，最后查结束信号。
