---
order: 30
title: 模板语法：能写什么，不能写什么
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 从一个编译报错出发划定模板的边界：插值只收表达式、v-if 与 v-show 的分工、v-for 加 :key 的为什么、v-bind 与 v-on 缩写、计算属性初见、v-html 的 XSS 红线，附三类真实编译报错的调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'vue3/020-Vue3QuickStartGuide'
  - 'vue3/040-Vue3DirectiveSystem'
  - 'vue3/060-ComputedCacheWatchTiming'
  - 'vue3/280-Vue3CompileOptimization'
prerequisites:
  - 'vue3/020-Vue3QuickStartGuide'
---

## 前置知识

- 已完成[第一个组件](/vue3/020-Vue3QuickStartGuide)：会写 SFC，记得「脚本里过 .value，模板里直接用」；
- 会用[数组高阶方法](/javascript/090-ArrayHigherOrderMethod)的 filter、map 与 join。

## 学习目标

读完本文你将能够：

1. 判断 `{{ }}` 里的内容能不能编译，说出「表达式可以、语句不行」的边界；
2. 用 v-if 与 v-show 做条件渲染，并根据切换频率选对那个；
3. 给 v-for 写上正确的 :key，解释为什么不能拿 index 应付；
4. 用 `:` 与 `@` 缩写完成属性与事件绑定，读懂别人代码里的缩写；
5. 写出第一个 computed 并说清它与方法的区别，说出 v-html 的使用红线。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

写计数器时你可能已经试过这种「顺理成章」：

```vue
<template>
  <p>{{ if (score > 60) return '上榜'; }}</p>
</template>
```

保存，终端与浏览器遮罩同时报错：

```text
[plugin:vite:vue] Error parsing JavaScript expression: Unexpected token.
```

合法的 JavaScript，进模板怎么就炸了？模板对花括号里的内容有一条硬边界：**只能放表达式，不能放语句。** 表达式「算出一个值」（`score + 1`、三元）；语句「执行一个动作」（if、for、return）。编译器要把 `{{ }}` 变成渲染函数里的一次取值，语句无处安放。

本文把边界内外过一遍：能写什么，怎么写对，哪些写法看着能跑其实埋雷。

## 2. 插值：花括号里的边界

合法的表达式直接算值：

```vue
<template>
  <p>{{ score + 10 }}</p>
  <p>{{ score >= 900 ? '巅峰' : '在榜' }}</p>
  <p>{{ players.map(p => p.name).join('、') }}</p>
</template>

<script setup>
import { ref } from 'vue';

const score = ref(980);
const players = ref([
  { name: '阿天', score: 980 },
  { name: '小满', score: 870 }
]);
</script>
```

预期行为：三行分别显示「990」「巅峰」「阿天、小满」。

三个边界案例记牢：`{{ 'score' }}` 显示字面量 score——引号里的就是字符串；`{{ players }}` 会把整个数组打印成多行 JSON——几乎从不是你想要的，要什么就取什么；三元可以，if 不行，分支渲染交给下一节的指令。

## 3. 指令速战

指令是 v- 开头的特殊属性，值是一个表达式。本篇速战高频的几个，完整清单在 040 篇。

### 3.1 条件渲染：v-if 与 v-show 的分工

```vue
<template>
  <p v-if="score >= 900">巅峰选手</p>
  <p v-else>在榜选手</p>

  <p v-show="isStreaming">直播中</p>
</template>

<script setup>
import { ref } from 'vue';

const score = ref(980);
const isStreaming = ref(true);
</script>
```

预期行为：显示「巅峰选手」与「直播中」；把 score 改到 900 以下，第一行立刻换成「在榜选手」。

区别在实现：v-if 为假时**元素根本不存在于页面**（DOM 里没有节点）；v-show 为假时元素还在，只是被加了 `display: none`。分工由此清晰：

| 场景 | 选择 | 原因 |
| --- | --- | --- |
| 条件很少变（权限区块、登录态） | v-if | 不渲染就完全不付运行时成本 |
| 切换很频繁（标签页、提示条） | v-show | 只切 display，省去反复创建销毁 |

v-else 必须紧跟 v-if 的元素，隔了元素就编译报错（见调试实录）。

### 3.2 列表渲染：v-for 与 :key 的为什么

```vue
<template>
  <ul>
    <li v-for="p in players" :key="p.id">
      {{ p.name }}：{{ p.score }}
    </li>
  </ul>
</template>

<script setup>
import { ref } from 'vue';

const players = ref([
  { id: 1, name: '阿天', score: 980 },
  { id: 2, name: '小满', score: 870 }
]);
</script>
```

预期行为：两行榜单。数据 push 进第三名时列表自动多一行——090 篇的数组方法在响应式数据上原样可用。

:key 是每个条目的身份证。数据变化后，Vue 靠它决定「哪些 DOM 复用、哪些重建」。为什么不许拿 index 应付？设想列表按分数排序，第 0 位的玩家从阿天换成小满——index 当 key 时 Vue 认为「0 号没变」，只改节点文字；节点里若有输入框内容这类与数据无关的内部状态，就会**张冠李戴留在原节点上**，出现「输入框里的字串了人」的诡异现象。业务 id 稳定，状态永远对得上人，修正方式就是上面的 `:key="p.id"`。

### 3.3 绑定缩写：冒号与 @

属性想绑表达式（而不是写死字符串），用 v-bind，缩写是冒号；事件用 v-on，缩写是 @：

```vue
<template>
  <img :src="avatarUrl" :alt="playerName" />
  <button @click="like">点赞</button>
</template>

<script setup>
import { ref } from 'vue';

const avatarUrl = ref('/img/aty.png');
const playerName = ref('阿天');

function like() {
  console.log('点赞 +1');
}
</script>
```

预期行为：图片正常显示，src 与 alt 都是变量的值；点按钮，控制台打印「点赞 +1」。

一个高频坑：`:alt="playerName"` 绑变量的值；`alt="playerName"`（没有冒号）绑「playerName 这五个字符」——少一个冒号，含义全变。`@click="like"` 传函数名，传参时内联 `@click="like(2)"`——不带括号是「交给事件」，带括号是「当场调用」。class 与 style 的进阶绑定在 040 篇。

## 4. 计算属性初见：把逻辑从模板里捞出来

插值里堆太多逻辑，模板会变成面条。computed 把「由数据算出来的值」变成一个有名字的声明：

```vue
<template>
  <p>巅峰选手：{{ topPlayers }}</p>
</template>

<script setup>
import { ref, computed } from 'vue';

const players = ref([
  { name: '阿天', score: 980 },
  { name: '小满', score: 870 },
  { name: '老周', score: 910 }
]);

const topPlayers = computed(() =>
  players.value.filter(p => p.score >= 900).map(p => p.name).join('、')
);
</script>
```

预期行为：显示「巅峰选手：阿天、老周」。players 一变，topPlayers 自动重算，页面跟着更新。

computed 和方法的区别一句话：**computed 带缓存**——依赖没变，用它几次、渲染多少轮都直接用上次结果；方法每次渲染都重新执行。缓存何时生效、边界在哪，[computed 缓存机制与 watch 执行时机](/vue3/060-ComputedCacheWatchTiming)拆透。口诀：**能用 computed，就别在模板里写长表达式。**

## 5. v-html：一句红线

`<p v-html="content"></p>` 会把 content 当 HTML 渲染。**红线：绝不要把用户输入交给 v-html。** 输入里混进 `<img src=x onerror=...>` 这类片段，就会在别人浏览器里执行——这叫 XSS 攻击，官方安全文档（见文末）有说明。默认的 `{{ }}` 插值把内容当纯文本转义，是安全的；v-html 只用于完全由自己生成且可信的内容。

## 6. 修改实验

实验一：把 3.1 的 v-show 改成 v-if，在开发者工具的 Elements 面板里切换 isStreaming，观察两种写法下 p 节点的存在状态——亲眼看到分工的实现差异。

实验二：加一个按钮往 players push 一名新玩家（记得带 id）；把 `:key="p.id"` 改成 `:key="index"`，点几次确认列表仍正确——再想清楚 index 什么时候才露馅（提示：结合 3.2 的排序场景）。

实验三：把 topPlayers 的阈值 900 改成 850，先预测再验证；再把 `{{ topPlayers }}` 写两处，确认同步更新——缓存不影响多处引用的一致性。

## 7. 常见错误与调试实录

**错误一：插值没写完。** 花括号少写后半个：

```vue
<p>{{ score</p>
```

终端报：

```text
[plugin:vite:vue] Interpolation end sign was not found.
```

三步定位：报错直译「找不到插值结束符」——检查附近的 `{{ }}` 是否成对。插值类报错都发生在编译期，Vite 直接给出文件与出错行，照着改就行。

**错误二：v-else 断开了。** 想在条件分支中间插点东西，结果把兄弟关系隔断了：

```vue
<p v-if="score >= 900">巅峰选手</p>
<span>分割线</span>
<p v-else>在榜选手</p>
```

终端报：

```text
[plugin:vite:vue] v-else/v-else-if has no adjacent v-if or v-else-if.
```

三步定位：报错直译「v-else 旁边没有 v-if」。v-else 必须紧跟 v-if 或 v-else-if 的元素——检查中间是不是插了别的元素；要放分割线，挪到条件渲染块外面。

## 8. 实际项目中的使用场景

- 列表页（排行榜、订单流）是 v-for 加 :key 加 computed 过滤的主场；增删、排序后列表依旧稳定，靠的就是 key 与响应式数组；
- 表单页大量使用 v-model 与缩写；读懂「每个冒号和 @ 的含义」是接手 Vue 项目的第一道门槛；
- 弹窗用 v-if（关闭即销毁，重开回到初始状态），悬浮提示用 v-show（频繁开关）——想要「关闭即重置」的语义，选 v-if。

## 9. 小练习

预测题（5 分钟，先写答案再运行）：

```vue
<template>
  <p>{{ 10 > 5 }}</p>
  <p>{{ 'score' }}</p>
  <p>{{ score > 5 ? 'A' : 'B' }}</p>
  <p>{{ if (score > 5) 'A' }}</p>
</template>

<script setup>
import { ref } from 'vue';

const score = ref(8);
</script>
```

四行各自显示什么、报什么错？为什么第三行合法而第四行不合法？（预期答案：true、score、A、编译报错——一个非法表达式会让整个组件编译失败。）

修改题（10 分钟）：把 3.1 改造成「段位徽章」：900 以上显示「巅峰」、700 到 899 显示「在榜」、其余显示「潜水」，用 v-else-if 补全。先写预测：score 改成 700 与 150 各显示什么，再验证。

修 Bug 题（15 分钟）：下面的组件保存后终端报错如下。按三步定位并修复：

```vue
<template>
  <p v-if="ready">已就绪</p>
  <p class="tip">提示区</p>
  <p v-else>未就绪</p>
</template>

<script setup>
import { ref } from 'vue';

const ready = ref(false);
</script>
```

真实报错：

```text
[plugin:vite:vue] v-else/v-else-if has no adjacent v-if or v-else-if.
```

挑战题（半小时，不给代码）：做一个「已筛榜单」：players 是五名玩家（含 id、name、score，两人不低于 900），用 computed 产出「900 分以上玩家的名字列表」，v-for 渲染并配 :key；列表下方显示总人数与上榜人数（各一个 computed）。验收断言：阈值改成 850 后，上榜人数从 2 变 3；模板里不得出现 filter 或 map。提示分两级：「提示」computed 返回什么类型都行；「展开」人数取 `.length` 再包一层。

## 10. 与之前和之后的知识的关系

- 往前：020 篇的 ref 与事件绑定在本文大量复用；@click 带括号与不带括号的问题在 3.3 兑现；
- 往后：040 篇收编指令全家（v-model 修饰符、class 对象数组、动态参数）；060 篇拆透 computed 缓存与 watch 时机；280 篇展示模板被编译成什么，你会明白边界为什么划在「表达式」；:key 也是 110 篇组件列表渲染的前置。

## 11. 官方文档

- 模板语法总览：https://cn.vuejs.org/guide/essentials/template-syntax.html
- 条件渲染：https://cn.vuejs.org/guide/essentials/conditional.html
- 列表渲染：https://cn.vuejs.org/guide/essentials/list.html
- 计算属性：https://cn.vuejs.org/guide/essentials/computed.html
- 安全（XSS 与 v-html）：https://cn.vuejs.org/guide/best-practices/security.html

## 12. 自我检查

- 能说出「花括号里只能放表达式」的含义，并各举一个合法与非法的例子；
- 能解释 v-if 与 v-show 的实现差异，并各说出一个适用场景；
- 能解释 index 当 :key 的风险，说清业务 id 为什么稳；
- 看到 v-else 断开的报错，能在一分钟内定位修复；
- 能说出 v-html 的红线，以及默认插值为什么安全。

## 本章总结

模板的硬边界一句话：花括号与指令的值都只能是表达式，语句交给指令与 script。v-if 假时元素不存在、适合低频切换；v-show 靠 display 隐藏、适合高频切换。v-for 必须配稳定的 :key（业务 id），index 当 key 会在增删排序时让内部状态张冠李戴。冒号绑属性、@ 绑事件：冒号把表达式交给数据，少了冒号就是写字面量。逻辑别堆在模板里，computed 带缓存，060 篇深挖。v-html 不碰用户输入，默认插值转义安全。插值未闭合、v-else 断开这两类编译报错都是保存即报、给出位置，照着修即可。

## 下一步

进入[Vue3 指令系统](/vue3/040-Vue3DirectiveSystem)：把 v-if 与 v-for 的进阶写法、v-model 的修饰符、class 与 style 的对象数组绑定一次收齐，再学写自己的指令。
