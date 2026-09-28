---
order: 20
title: 第一个组件：从 createApp 到页面渲染
module: 'vue3'
category: 前端技术
difficulty: beginner
description: 顺着 main.js 的 createApp 追问「组件怎么变成页面」：script setup 顶层绑定直达模板、ref 初见（带 .value 的盒子）、事件绑定做出最小计数器、子组件的导入与注册，附变量忘了 .value、组件解析失败、变量名拼错三类真实报错调试实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/010-OverviewEnv'
  - 'vue3/030-Vue3TemplateSyntax'
  - 'vue3/050-ReactiveSystem'
  - 'vue3/110-ComponentSystem'
prerequisites:
  - 'vue3/010-OverviewEnv'
  - 'javascript/090-ArrayHigherOrderMethod'
---

## 前置知识

- 已完成[概述与环境](/vue3/010-OverviewEnv)：能跑起 create-vue 项目，认得 SFC 三段结构；
- 已完成[数组高阶方法](/javascript/090-ArrayHigherOrderMethod)：会定义与调用函数，接受「参数进、返回值出」。

不需要更多背景。本文回答上一篇留下的问题：index.html 里只有一个空 div，页面内容是怎么进去的。

## 学习目标

读完本文你将能够：

1. 逐行说出 main.js 各行代码的作用，解释 createApp 与 mount 的分工；
2. 写出一个 SFC，并解释 `<script setup>` 顶层声明的变量为什么模板能直接用；
3. 用 ref 声明会变的数据，说清「脚本里要 .value、模板里不用」这条规则的来历；
4. 写出一个完整可跑的计数器组件，并预测每次点击后页面的变化；
5. 把界面拆成父子组件并完成注册，读懂 `Failed to resolve component` 报错。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

上一篇你改过 App.vue，页面跟着变。但有个细节一直没交代：index.html 的 body 里只有 `<div id="app"></div>`，你的 template、script、style 都不在里面——浏览器最终显示的「星陨峡谷」，是怎么进到这个空 div 里的？

追一遍水路，入口在 src/main.js：

```javascript
import './assets/main.css';   // 脚手架自带的全局样式，与本篇无关

import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

去掉样式那行，剩下三句，每句一个动作：

1. 从 vue 包里拿 createApp 函数；
2. 把 App.vue 变成一个「应用」；
3. `mount('#app')` 让这个应用接管页面上的空 div，App 模板渲染出的内容填进去。

链条就是：**main.js 用 createApp 启动应用并挂到空壳上，App.vue 的 template 渲染成壳里的内容**——入口管启动，组件管内容，Vue 项目大半的文件分工随之清楚。

## 2. script setup：顶层声明，模板直接用

```vue
<template>
  <p>当前玩家：{{ playerName }}</p>
</template>

<script setup>
const playerName = '阿天';
</script>
```

预期行为：页面显示「当前玩家：阿天」。

`<script setup>` 的规则一句话：**在这个标签顶层声明的任何东西——变量、函数、导入的组件——模板都能直接用，不用 return。** 这不是魔法，是编译器把顶层声明统统交给模板（细节见 280 篇）。没有 setup 的旧写法要手动 return 给模板；`<script setup>` 砍掉了这道手续。函数同理，顶层声明的函数直接当事件处理器用——4 节的计数器马上就用。

## 3. ref 初见：带 .value 的盒子

普通变量不会让界面更新——`let playerName = '阿天'` 改一百次，页面纹丝不动。要界面跟着变，数据必须让 Vue 追踪得到，Vue 给的工具叫 ref：

```vue
<template>
  <p>当前玩家：{{ playerName }}</p>
  <button @click="playerName = '小满'">换人</button>
</template>

<script setup>
import { ref } from 'vue';

const playerName = ref('阿天');
</script>
```

预期行为：初始显示「阿天」，点按钮变成「小满」——这次界面更新了，因为 playerName 是 ref。

把 ref 理解成**一个带 .value 的盒子**：盒子里装着真正的值，`playerName.value` 才是「阿天」本身。Vue 盯着每个盒子，谁被换了值，就刷新所有用到它的地方。由此产生一条规则：

```javascript
const count = ref(0);

count.value++;   // 脚本里：读写都要过 .value（对盒子开口）
// 模板里直接写 count：Vue 自动替你取 .value（自动解包）
```

为什么这样设计？值藏在盒子里，Vue 才有机会在取值、改值时装上监听——直接监听普通变量，JavaScript 做不到。盒子内部怎么追踪、reactive 和它什么关系，是[响应式系统](/vue3/050-ReactiveSystem)的主题；本篇记住口诀即可：**脚本里过 .value，模板里直接用。**

## 4. 动手：最小计数器

把 App.vue 整个替换成，先跑起来再解释：

```vue
<template>
  <h1>战绩</h1>
  <p>当前分数：{{ score }}</p>
  <button @click="add">加一分</button>
  <button @click="reset">重置</button>
</template>

<script setup>
import { ref } from 'vue';

const score = ref(0);

function add() {
  score.value = score.value + 1;
}

function reset() {
  score.value = 0;
}
</script>

<style scoped>
button {
  margin-right: 8px;
}
</style>
```

预期行为：初始显示「当前分数：0」；点「加一分」三次，分数变成 3；点「重置」回到 0。全程页面不刷新，p 标签里的数字自己变。

逐行对照这条链：score 是盒子，装着 0；模板里 `{{ score }}` 声明「这里显示盒子里的值」；add 函数改盒子；Vue 发现盒子变了，刷新页面。函数名不带括号是「点击时再调用」，带括号是「现在就调用一次」，区别 030 篇细说。

一个词先混个眼熟：`reactive`，专门包对象，让你直接改属性；取舍与解构陷阱在 050 篇。入门记一条：**拿不准就用 ref。**

## 5. 组件注册：把界面拆成文件

页面长大会变成一整坨。Vue 的拆法是组件：每个 .vue 文件一个，谁要用谁导入。

新建 src/components/RankItem.vue：

```vue
<template>
  <li>{{ name }}：{{ score }}</li>
</template>

<script setup>
defineProps({
  name: String,
  score: Number
});
</script>
```

`defineProps` 声明「本组件接受哪些数据」，像函数的形参表——父子通信的完整规则在[组件系统](/vue3/110-ComponentSystem)展开。

父组件里导入并使用：

```vue
<template>
  <ul>
    <RankItem name="阿天" :score="980" />
    <RankItem name="小满" :score="870" />
  </ul>
</template>

<script setup>
import RankItem from './components/RankItem.vue';
</script>
```

预期行为：页面显示两行——「阿天：980」「小满：870」。

三步：import 进来 → `<script setup>` 顶层导入即自动注册 → 模板里当标签用。`:score="980"` 里的冒号是把数字 980（而不是字符串 "980"）传过去；冒号是什么、为什么需要它，030 篇的 v-bind 讲透。

组件名必须大写开头：`<rank-item />` 会被当作原生标签，浏览器不认识，页面直接少一块——调试实录里就是它。

## 6. 修改实验

实验一：给计数器加第三个按钮「减一分」，允许分数变成负数。先预测点击后的显示，再验证。

实验二：把 add 改成每次加 10，观察更新是否依旧即时——数据改动与界面更新的间隔小到感知不到。

实验三：把 `{{ score }}` 改成 `{{ score.value }}`，先预测显示什么再保存（提示：模板里的 score 已是解包后的数字），观察后改回来。

## 7. 常见错误与调试实录

**错误一：脚本里忘写 .value。** 把 add 改成 `score++`，点击按钮，浏览器控制台报：

```text
Uncaught TypeError: Assignment to constant variable.
```

三步定位：

1. 读报错：V8 在说「你给一个 const 变量重新赋值了」。score 是 const 声明的盒子，`score++` 想把盒子整个换掉——你真正想改的是盒子里的值；
2. 验真身：报错定位到 add 里那一行，检查是不是少了 .value；
3. 修正：写成 `score.value++`。这条规则有反面：模板里 `@click="score++"` 反而是对的——模板已自动解包。「脚本 .value、模板不用」的口诀能避开九成此类问题。

**错误二：组件标签没被认出来。** 把导入语句注释掉，模板里仍写 `<RankItem />`，页面上榜单凭空消失，控制台报：

```text
[Vue warn] Failed to resolve component: RankItem
```

三步定位：

1. 读报错：Vue 找不到叫 RankItem 的组件，只能原样输出这个标签，内容自然没了；
2. 验真身：检查 `<script setup>` 里的 import——被注释、路径写错、根本没写，都是常见原因；
3. 修正：补上 import。报错里的名字区分大小写，模板里写什么就找什么。

**错误三：模板里变量名拼错。** 把 `{{ score }}` 手滑写成 `{{ scre }}`，那个位置直接空白，控制台报：

```text
[Vue warn] Property "scre" was accessed during render but is not defined on instance.
```

三步定位：报错把拼错的名字原样告诉你——回 script setup 对拼写即可。开发警告都带 `[Vue warn]` 前缀，逐条读完再动手，比盯着空白页面猜快。

## 8. 实际项目中的使用场景

- 一个功能一个组件是 Vue 项目的默认组织方式：计数器、表单、卡片都可以是独立 .vue 文件，本站的交互块也是这么拆的；
- ref 是使用频率最高的 API：表单草稿、加载状态、弹窗开关全靠它；对象场景的另一种选择 reactive 见 050 篇；
- main.js 在真实项目里还负责安装插件（路由、状态库），链式写法 `createApp(App).use(router).mount('#app')` 在 200、210 篇用到时再展开。

## 9. 小练习

预测题（5 分钟，先写答案再运行）：

```vue
<template>
  <p>{{ hp }}</p>
  <p>{{ hp.value }}</p>
  <button @click="hp = hp + 10">回血</button>
</template>

<script setup>
import { ref } from 'vue';

const hp = ref(50);
</script>
```

两个 p 初始各显示什么？点两次按钮后呢？（预期答案：50 与空白——模板里 hp 已是数字，数字上取 .value 得到 undefined，渲染为空；两次点击后第一个 p 显示 70。）

修改题（10 分钟）：给 4 节的计数器加「操作记录」：再声明一个 ref 记录加分的次数，界面显示「已加 N 次」，重置时一并归零。

修 Bug 题（15 分钟）：下面的组件点击按钮后分数不动，控制台真实报错如下。按三步定位并修复：

```vue
<script setup>
import { ref } from 'vue';

const score = ref(0);

function add() {
  score = score + 1;
}
</script>

<template>
  <p>{{ score }}</p>
  <button @click="add">加一分</button>
</template>
```

真实报错：

```text
Uncaught TypeError: Assignment to constant variable.
```

挑战题（半小时，不给代码）：做一个双人记分板：两个 ref 分别记阿天与小满的分数，各一个「加分」按钮，另有「重置全部」按钮；标题显示当前领先者的名字，平局显示「持平」。验收：初始 0 比 0 与「持平」；阿天加分后标题变「阿天」；小满追平后变回「持平」；重置全部恢复初始。提示分两级：「提示」两个数比大小可以直接写在模板三元里；「展开」领先者名字用嵌套三元——先判 aScore > bScore，再判 aScore < bScore，剩下的就是持平。

## 10. 与之前和之后的知识的关系

- 往前：010 篇留下「内容怎么进空 div」的问题在本文开头收尾；090 篇「函数是值」支撑了 @click 直接传函数名；
- 往后：030 篇讲透模板里能写什么（插值、指令、缩写），040 篇收编指令系统；050 篇揭开 ref 盒子的追踪机制；110 篇展开父子组件通信——本文 defineProps 与 `:score` 的伏笔都在那里兑现。

## 11. 官方文档

- 响应式基础（ref）：https://cn.vuejs.org/guide/essentials/reactivity-core.html
- 组件基础：https://cn.vuejs.org/guide/essentials/component-basics.html
- 应用与实例（createApp）：https://cn.vuejs.org/api/application.html

## 12. 自我检查

- 能不看资料逐行解释 main.js 的三行核心代码；
- 能说出「脚本里过 .value，模板里直接用」并解释原因；
- 能在 60 秒内默写出带加分与重置的计数器组件；
- 看到 `Failed to resolve component` 能依次排查导入注释、路径、拼写三处；
- 知道组件名必须大写开头的原因。

## 本章总结

main.js 用 createApp(App) 启动应用、mount('#app') 把根组件渲染进空壳，页面内容全部来自组件。`<script setup>` 让顶层声明的变量与函数直达模板。ref 是带 .value 的盒子：脚本里读写都要过 .value，模板里自动解包直接用；普通变量改了页面不动，ref 变了界面自己更新。组件注册三步：import、顶层导入即注册、模板里当标签用，名字大写开头。`Assignment to constant variable` 十有八九是脚本里忘了 .value；`Failed to resolve component` 先查 import。

## 下一步

进入[Vue3 模板语法](/vue3/030-Vue3TemplateSyntax)：花括号里能放什么、不能放什么，v-if、v-for、冒号和 @ 各自的分工，一次讲清。
