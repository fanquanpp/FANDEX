---
order: 280
title: Vue3 编译优化：diff 之前，编译器已经替你剪过枝
module: 'vue3'
category: 前端技术
difficulty: advanced
description: 从「改一个数字为什么要遍历整棵树」讲起：用 SFC Playground 亲眼看编译产物，学会读静态提升、PatchFlag 枚举、Block 动态节点收集与事件缓存，再搞懂 v-memo、优化失效场景与 SSR 字符串编译，附手写 render 丢优化、v-for 下标 key 破坏复用两则实录。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'vue3/050-ReactiveSystem'
  - 'vue3/320-Vue3PerformancePractice'
  - 'vue3/350-Vue3SSR'
  - 'vue3/370-VaporMode'
prerequisites:
  - 'vue3/050-ReactiveSystem'
---

## 前置知识

- [响应式系统](/vue3/050-ReactiveSystem)：知道数据变化如何触发组件的渲染 effect——本篇讲「触发之后，patch 到底要干多少活」。

## 学习目标

读完本文你将能够：

1. 把任意模板丢进 Vue SFC Playground，读懂编译产物里的 hoisted、patchFlag、createBlock；
2. 说出 PatchFlag 的枚举含义，解释「靶向更新」为什么不用遍历整棵树；
3. 解释 Block（v-if / v-for 开新块）与 dynamicChildren 数组如何让 diff 跳过静态子树；
4. 判断手头该不该用 v-memo / v-once，并说出哪些写法会让编译优化失效；
5. 理解 SSR 编译产物（字符串拼接）与客户端编译的本质差异。

预计 60 到 80 分钟。

## 1. 你现在要解决什么问题

阅读页正文模板很长：几百行结构化的段落、表格、代码块，动态内容只有进度百分比、目录高亮和三两处插值。改一下进度数字，心里冒出一个疑问：**Vue 是不是把整棵模板树重新 diff 了一遍？** 如果是，几百个节点里为一个数字遍历全树，未免太笨。

Vue 2 确实接近这个笨办法：每次更新生成整棵新 VNode 树，全量逐节点对比（靠 static 标记做了粗粒度跳过，但粒度很粗）。Vue 3 把优化搬进了**编译期**：模板是静态可分析的字符串，编译器在编译时就知道「哪块永远不变、哪块的哪个属性会变」，把这个信息写进产物，运行时 diff 直接照着剪枝。本篇的任务是把这套机制拆开看——而且要亲眼看，不是背名词。

## 2. 动手：亲眼看到编译产物

打开 Vue SFC Playground（play.vuejs.org），左边输入：

```vue
<template>
  <section class="article">
    <h1>固定标题</h1>
    <p class="meta">共 3650 字</p>
    <span>进度：{{ percent }}%</span>
    <div :class="{ active: tocOpen }">目录</div>
  </section>
</template>
```

右边勾选查看编译后的 render 函数（简化后长这样）：

```js
// 静态节点被提升到 render 函数外，只创建一次
const _hoisted_1 = /*#__PURE__*/ _createStaticVNode(
  '<h1>固定标题</h1><p class="meta">共 3650 字</p>'
);

function render(_ctx, _cache) {
  return (_openBlock(), _createBlock('section', { class: 'article' }, [
    _hoisted_1,                                        // 整块静态，diff 时直接跳过
    _createElementVNode(
      'span', null,
      '进度：' + _toDisplayString(_ctx.percent) + '%',
      1 /* TEXT */                                     // patchFlag：只有文本会变
    ),
    _createElementVNode(
      'div',
      { class: _normalizeClass({ active: _ctx.tocOpen }) },
      '目录',
      2 /* CLASS */                                    // patchFlag：只有 class 会变
    ),
  ]));
}
```

三个关键结构已经现身，下面逐个拆。

## 3. PatchFlag：给动态节点贴「哪里会变」的标签

`1 /* TEXT */` 就是 PatchFlag——编译器对每个含动态内容的节点打的标记位。常用枚举：

| 值  | 名称        | 含义                     |
| --- | ----------- | ------------------------ |
| 1   | TEXT        | 文本内容动态             |
| 2   | CLASS       | class 动态               |
| 4   | STYLE       | style 动态               |
| 8   | PROPS       | 其他属性动态（附动态属性名列表） |
| 16  | FULL_PROPS  | 属性完全动态（含 key）   |
| 32  | STABLE_FRAGMENT 等 | 结构级标记        |
| -1  | HOISTED     | 静态提升节点             |
| -2  | CACHED      | 缓存节点（如事件缓存）   |

它的价值在 diff 时的语义：标记是 TEXT 的节点，patch 只比较文本；标记是 CLASS 的，只比较 class。**「这个节点要不要更新」的判断从「逐属性浅比较」缩成「看一个数字」**。对照第 2 节：span 的 flag 是 TEXT，进度数字变化时运行时只碰这一个文本节点——你疑问的「全树遍历」根本不会发生。

多个动态来源按位或叠加（TEXT | CLASS = 3），运行时用位运算判断该检查哪几类——和 React Fiber 的 flags 异曲同工（编译器预先算好，运行时只消费）。

## 4. Block 与 dynamicChildren：diff 直接抄「动态节点名单」

`_openBlock() + _createBlock(...)` 是第二层机制。每个组件的根节点（以及每个 v-if / v-for 节点）是一个 **Block**，它在渲染时顺手把**所有带 PatchFlag 的后代节点**收进自己的 `dynamicChildren` 数组——静态节点压根不进名单。

更新时的 patch 变成一个短循环：

```js
// 不再递归遍历整棵树，只走名单
function patchBlock(oldBlock, newBlock) {
  for (let i = 0; i < newBlock.dynamicChildren.length; i++) {
    patch(oldBlock.dynamicChildren[i], newBlock.dynamicChildren[i]);
  }
}
```

diff 的规模从「节点总数」缩成「动态节点数」。阅读页几百个节点、动态 5 个，名单就 5 项。为什么 v-if / v-for 要开新 Block？因为结构可能整体增删，父 Block 没法稳定地按位置收集它们内部的动态节点——开新块后，块内各自维护名单，结构变化时整块进出，互不干扰。

## 5. 静态提升与预字符串化：不变的连创建都省了

第 2 节产物里的 `_hoisted_1` 是第三层：纯静态的 h1 和 p 被提升到 render 函数外，组件更新时连 VNode 都不重新创建，直接复用同一个引用。连续的静态片段（超过阈值）更进一步合并成一个 `createStaticVNode('...html字符串...')`——**整段 DOM 结构被压成一个字符串节点**，内存与创建成本都省掉。

运行时指令 v-once 是这条思路的手动版：标记的节点（含插值）只渲染一次，此后跳过。但注意事项里那条建议依然成立——**先让编译器自动剪枝，v-once / v-memo 是测量之后才动的手术刀**，到处手标只会让模板变成谜语。

## 6. 事件缓存：内联函数不再每次新建

模板里写 `@click="count++"`，编译产物是：

```js
onClick: _cache[0] || (_cache[0] = ($event) => (_ctx.count++))
```

内联事件处理器被缓存进 `_cache` 数组：首次渲染创建一次，之后每次渲染复用同一引用。这对「子组件接收函数 props」的场景是隐形的优化——引用稳定，子组件的 props 比较不会因为新函数而失效（对照 React 里 useCallback 解决的同一个问题，Vue 在编译层默认解决了）。

## 7. v-memo：给大列表加「记忆开关」

列表 1000 条，点选其中一条，默认 1000 个列表项的动态节点都要进 patch 名单。v-memo 提供手动跳过：

```vue
<div v-for="item in largeList" :key="item.id" v-memo="[item.selected]">
  <span>{{ item.name }}</span>
  <span :class="{ active: item.selected }">{{ item.selected ? '已选中' : '未选中' }}</span>
</div>
```

依赖数组 `[item.selected]` 未变的项，整棵子树 patch 直接跳过——点选一条，实际只 patch 一条。它编译为 `withMemo(deps, renderFn, cache, i)`，本质是运行时缓存 VNode。适用边界：**大列表（几百条以上）+ 只有小部分字段高频变化**，且依赖数组必须写全子树用到的所有响应式值（漏写 = 界面不更新，这是 v-memo 的经典事故）；小列表的缓存开销省不出收益，别用。

## 8. 优化什么时候失效

编译优化依赖「编译期能看到模板」。三类写法会让剪枝失效：

1. **手写 render 函数 / JSX**：没有模板编译阶段，没有 PatchFlag 与 Block 名单，运行时全量 diff。不是不能用（动态性极强的场景反而需要），是要知道代价；
2. **动态组件 `<component :is="x">`**：编译器无法预知节点结构，该位置退化为常规 diff——能写成确定标签就写确定标签；
3. **v-for 用下标当 key**：严格说不是优化失效而是复用失效——节点身份错乱导致整段列表重建（020/120 篇同款问题，Vue 侧的修法一样：稳定业务 id）。

另外两件配置级的事：使用自定义元素（Web Components）时要在 vite.config 里声明 `isCustomElement: (tag) => tag.startsWith('x-')`，否则编译器按组件解析给出告警；性能数据必须在生产构建下测——开发模式的编译产物带额外校验与告警，不代表运行时表现。

## 9. SSR：同一模板，另一套编译产物

服务端渲染（350 篇展开）时同一份模板编译成完全不同的形态——不创建 VNode，直接拼 HTML 字符串：

```js
// ssrRender：静态内容原样输出，动态内容插值
function ssrRender(_ctx, _push, _parent) {
  _push('<section class="article">');
  _push('<h1>固定标题</h1><p class="meta">共 3650 字</p>'); // 静态直接吐字符串
  _push(`<span>进度：${_toDisplayString(_ctx.percent)}%</span>`);
  _push('</section>');
}
```

客户端那份产物此时换岗为「水合（hydration）」服务：把静态 HTML 与交互逻辑接上。正因为编译器知道哪些是静态字符串，水合时也能精确跳过它们——编译信息在 SSR 链路里被复用了两次。

## 10. 修改实验

实验一：把第 2 节模板粘进 SFC Playground，依次给 h1 加上 `{{ title }}`、给 section 加 `:style`，观察 `_hoisted_1` 的消解与 PatchFlag 的叠加——亲手验证「改动一个绑定，整个静态块失去提升资格」。

实验二：写一个 500 条的列表（每条带选中态），先用 Performance 面板量点选一条的耗时；加 v-memo 后再量。预期：耗时降到接近十分之一。

实验三：把某个小组件改写为手写 render 函数（h 调用），在产物对比里找 patchFlag 的缺失，体会「模板是给编译器的优化说明书」。

## 11. 常见错误与调试实录

**错误一：v-memo 依赖写漏，界面不更新。** 列表项里用了 `item.price`，v-memo 只写了 `[item.selected]`，价格改了界面纹丝不动且无告警。三步定位：数据变了界面没变、没有报错——先怀疑缓存类指令；验真身——v-memo 依赖数组之外的一切都「冻结」在缓存里；修正——把子树用到的全部响应式值列入依赖。纪律：v-memo 的依赖 = 子树扫描结果，一个不能少。

**错误二：v-for 下标 key 的串位。** 列表中间插入一项后输入框内容错位、动画乱跳。原因与修法同 React（稳定 id），在此补充 Vue 侧的提示：编译器对无 key 的 v-for 给出 lint 告警，别用 eslint-disable 压掉它。

**错误三：模板写太动态，全是绑定。** 有人为「灵活性」把每个属性都写成插值，结果产物里没有 hoisted、Block 名单接近全树——优化名存实亡。检查手段就是实验一：把产物拉出来看静态块还剩多少。策略与 320 篇的测量流程衔接：先 Profiler 确认真有更新开销，再回头审模板的「动态密度」。

## 12. 实际项目中的使用场景

- **代码评审用「动态密度」审模板**：大块纯展示结构保持纯静态（编译器自动提升），动态绑定集中在叶子；阅读页、文档站这类「静态为主、点缀动态」的页面是编译优化收益最大的形态；
- **v-memo 用在已知热点**：虚拟列表行、千级表格的选中态切换——先量后加，加完再量；
- **SSR 首屏**：编译期静态信息让水合跳过静态区，TTFB 与水合成本同时受益（350 篇）；
- **展望 Vapor 模式**：Vue 3.6 的无虚拟 DOM 模式把这套思路推到终点——不生成 VNode，编译产物直接操作真实 DOM（370 篇）。PatchFlag 时代的「靶向 diff」在 Vapor 里变成「靶向更新」，理解本篇就是理解 Vapor 的前世。

## 13. 小练习

预测题（5 分钟）：下面模板编译后，几个节点进 dynamicChildren 名单？`_hoisted` 有几个？

```vue
<template>
  <div>
    <h2>标题</h2>
    <p>{{ a }}</p>
    <p>{{ b }}</p>
    <footer>底部</footer>
  </div>
</template>
```

（名单 2 个：两个 p 各带 TEXT flag；hoisted 0 个——两个静态节点因数量少于预字符串化阈值，只是普通提升或内联，h2/footer 不进名单。用 Playground 验证你的答案。）

修改题（10 分钟）：给实验二的列表把 v-memo 依赖写全（含 price），并制造一次「漏依赖」bug 再修复，记录修复前后界面表现。

修 Bug 题（15 分钟）：团队把手写 render 函数组件（动态表单生成器）性能劣化归因于「编译器没优化」。判断归因是否成立，给出两个方向：若无模板可写，优化该落在哪（数据结构、组件拆分、v-show 层级、手动 shouldComponentUpdate 类手段——Vue 里是让 props 稳定引用 + 细粒度组件边界）。

挑战题（30 分钟）：用 @vue/compiler-dom 在 Node 里 compile 一段模板，遍历产物 AST，统计 patchFlag 出现频次与 hoisted 数量，输出一份「模板动态密度报告」——这就是小型模板体检工具的雏形。

## 14. 与之前和之后的知识的关系

- 往前：050 篇的响应式触发是入口，本篇讲触发之后 patch 怎么省；030 篇模板语法里「模板是受约束的 DSL」的限制，正是编译期能静态分析的根源；
- 往后：[Vue3 性能优化实践](/vue3/320-Vue3PerformancePractice) 把本篇机制放进完整优化流程（测量先行）；[Vue3 服务端渲染](/vue3/350-Vue3SSR) 消费 ssrRender 产物；[Vapor 模式](/vue3/370-VaporMode) 是编译优化的下一站。

## 15. 官方文档

- 渲染机制：https://cn.vuejs.org/guide/extras/rendering-mechanism
- 编译器 Playground：https://play.vuejs.org/
- v-memo / v-once：https://cn.vuejs.org/api/built-in-directives.html#v-memo
- 渲染函数与 JSX：https://cn.vuejs.org/guide/extras/render-function

## 16. 自我检查

- 能在 SFC Playground 里指出 hoisted、PatchFlag、Block 三者对应的产物片段；
- 能说出 PatchFlag 至少五个枚举值及「靶向更新」的判断路径；
- 能解释 v-if / v-for 为什么开新 Block，以及 dynamicChildren 如何缩短 diff；
- 能说出三类优化失效写法与 v-memo 的适用边界、漏依赖后果；
- 能描述 SSR 编译产物与客户端产物的差异及水合对编译信息的复用。

## 本章总结

Vue 3 的性能故事核心在编译期：模板是静态可分析的，编译器把「哪里不会变（静态提升、预字符串化）、哪里会变以及变什么（PatchFlag）、动态节点有哪些（Block 的 dynamicChildren 名单）、内联事件引用稳定（事件缓存）」全部写进产物，运行时 diff 从全树遍历缩成名单循环。v-memo / v-once 是手动挡，只给测量证实的热点。三类写法让优化失效：手写 render、动态组件、下标 key。SSR 编译产物是字符串拼接，静态信息在水合时二次复用。所有机制都指向同一句话：模板不只是给人写的，更是给编译器的优化说明书。

## 下一步

进入 [Vue3 性能优化实践](/vue3/320-Vue3PerformancePractice)：机制备齐，进入实战流程——怎么测、优化哪一层（响应式、渲染、体积、网络）、怎么验证优化真的有效。
