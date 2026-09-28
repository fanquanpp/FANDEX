---
order: 20
title: 组件与 Props：把页面拆成一堆函数
module: 'react'
category: 前端技术
difficulty: beginner
description: 从「战绩榜五个玩家手写五遍」讲起：函数组件的定义与组合、props 只读契约、children 插槽、列表渲染与 key、渲染时组件函数被调用并返回界面描述，附 Each child in a list should have a unique key 与小写组件名两则调试实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/010-OverviewEnvSetup'
  - 'react/030-StateEvent'
  - 'react/040-HooksDeep'
  - 'javascript/090-ArrayHigherOrderMethod'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 前置知识

- 已完成 [界面 = f(state)](/react/010-OverviewEnvSetup)：装好 Vite react 模板项目，写过并修改过 App 组件；
- 本文大量使用 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 的 map——没学过也能跟，先记住「map 把数组逐项变成新数组」。

## 学习目标

读完本文你将能够：

1. 把一整页 JSX 拆成多个函数组件并组合使用，说出拆分的判断标准；
2. 写出接收 props 的组件，解释 props 为什么是「父到子的只读契约」；
3. 用 children 把一段内容当参数传进组件，做出可复用的容器；
4. 逐步描述一次渲染：组件函数被调用、返回界面描述、React 负责更新 DOM；
5. 读懂 `Each child in a list should have a unique "key" prop` 警告并修复列表渲染。

预计 50 到 70 分钟。

## 1. 你现在要解决什么问题

010 篇的练习里，你在 App 里手写过两遍玩家标签。现在把要求提到真实规模：战绩榜显示五个玩家，详情页还要再显示前三名。复制粘贴的结局你背得出来了——080 篇三处一样改一处漏两处，这次是五段一样的 JSX 改一处漏五处。复制出来的代码还有个新毛病：**数据和长相焊死在一起**，名字和分数是写死的文字，想换成小满就得整段重写。

解法和 080 篇一样，只是这次封装的不是计算逻辑，而是「一小块界面」：

```text
080 篇：结算逻辑复制三遍 → 封装成函数 checkout(price)
本  篇：玩家标签复制五遍   → 封装成组件 PlayerCard(props)
```

组件就是「界面上的一小块」对应的函数：数据从 props 进来，界面描述从 return 出去。页面由此变成一堆函数的组合——组件树。

## 2. 最小可运行示例：一个组件用五次

替换 src/App.jsx：

```jsx
function PlayerCard({ name, score }) {
  return (
    <div className="player">
      <span>{name}</span>
      <strong>{score}</strong>
    </div>
  );
}

function App() {
  return (
    <div>
      <h1>战绩榜</h1>
      <PlayerCard name="阿天" score={980} />
      <PlayerCard name="小满" score={870} />
      <PlayerCard name="老K" score={810} />
      <PlayerCard name="船长" score={760} />
      <PlayerCard name="阿呆" score={700} />
    </div>
  );
}

export default App;
```

预期行为：标题下方五行玩家卡，左边名字右边分数；改一处 `className`，五行同时变——界面逻辑终于只有一份。

`PlayerCard({ name, score })` 是解构参数：`name="阿天"` 传进字符串，`score={980}` 的花括号里是 JS 表达式，所以能传数字。这些从父组件传进来的数据，统称 **props**（properties 的缩写）。

## 3. props：父到子的只读契约

props 有两条铁律。**第一，数据只能从父组件流向子组件**：App 拥有数据，PlayerCard 只管展示；单向纪律让「数据从哪来」永远有唯一答案，页面复杂十倍也查得动。

**第二，组件不许修改自己收到的 props。** 下面这行写在 PlayerCard 里注定没用：

```jsx
function PlayerCard({ name, score }) {
  score = score + 20;   // 想给每个玩家加 20 分？改的只是本次调用的局部参数
  return <strong>{score}</strong>;
}
```

它不报错，但也毫无意义：props 的本质是函数参数——080 篇说过「函数里改参数不影响外面」，而且下次渲染父组件还是把原值传进来。**props 是契约：父组件定什么就是什么。** 分数怎么变？数据的主人动手，途径在 030 篇。

## 4. children：标签之间的内容也是 props

组件标签之间夹的内容，React 自动作为名为 children 的 prop 传进来。用它做一个到处能用的容器：

```jsx
function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function App() {
  return (
    <Panel title="本周战况">
      <p>阿天连赢七局。</p>
      <PlayerCard name="阿天" score={980} />
    </Panel>
  );
}
```

预期行为：标题下面，段落和玩家卡被同一个 Panel 包住。Panel 不关心里面是什么——传什么渲染什么。这就是 children 的价值：**内容当参数，容器管结构。** 布局组件几乎都这么写；夹的也可以是另一个组件（如上例），组件树就是这样套出来的。

## 5. 列表渲染：map 加 key

五行 PlayerCard 手写了五遍，又是复制粘贴。用 map（090 篇）把「数据数组」变成「组件数组」，加一个玩家只需添一条数据，界面自动多一行——等式兑现：

```jsx
const players = [
  { id: 'p1', name: '阿天', score: 980 },
  { id: 'p2', name: '小满', score: 870 },
  { id: 'p3', name: '老K', score: 810 },
];

function Leaderboard() {
  return (
    <ul>
      {players.map((player) => (
        <li key={player.id}>
          {player.name}：{player.score}
        </li>
      ))}
    </ul>
  );
}
```

`key` 是每个列表项的唯一标识，React 靠它认人。规则两条：**同级之间唯一，且稳定不随渲染变化。** 用数据里的 id，不要用数组下标——中间插入或删除时下标集体平移，React 认错人，界面内容串位。

## 6. 渲染发生了什么：函数被调用，描述被兑现

把 010 篇的等式拆开看。首次显示或数据变化后，React 做三件事：

1. **调用组件函数**：React 调用 `App()`。return 里的 `<PlayerCard ... />` 不是 HTML，是「调用 PlayerCard 函数」的描述；
2. **递归展开成描述树**：顺着描述继续调用 PlayerCard，直到整棵树只剩 div、span、文本这类底层描述；
3. **React 兑现描述**：首次渲染把描述变成真实 DOM；再次渲染时新旧描述对比，只更新变了的部分。

两条由此而来的纪律：**组件函数会被反复调用**，每次渲染都从头执行，「只该做一次」的重活不能写在组件体里（040 篇的 useEffect 管这个）；**同样的 props 进就该有同样的描述出**，组件要写成 080 篇说的纯函数——这份「纯」是 React 敢于只更新差异的前提。

「内部怎么对比更新」的深水不在本篇展开；更近的问题是「函数反复执行，数据凭什么记得住」——答案在 [Hooks 深入](/react/040-HooksDeep)。

## 7. 修改实验

实验一：给 PlayerCard 加第三个数据位 `rank`（名次），五处调用全部补上，验证名次显示正常。

实验二：把 2 节手写的五行调用改成 5 节的 map 写法，数据补到五条。验收：页面显示不变；map 那版加第六个玩家只改数据数组。

实验三：用 Panel 包住 Leaderboard，再写一个 `Sidebar({ children })` 放到页面旁边，体会容器组件的复用方式。

## 8. 常见错误与调试实录

**错误一：列表漏了 key。** 把 key 那行删掉保存，浏览器控制台：

```text
Warning: Each child in a list should have a unique "key" prop. Check the render method of `Leaderboard`. See https://react.dev/link/warning-keys for more information.
```

三步定位：读报错——Warning 级别（页面还能显示），「每个列表孩子都要有唯一 key」，直接点名 Leaderboard；验真身——map 返回值最外层标签上没有 key；修正——补上 `key={player.id}`。这警告平时看似无害，等列表开始增删，缺 key 的错位渲染会让你怀疑人生，看到就修。

**错误二：组件名小写。** 手滑写成 `<playerCard name="阿天" score={980} />`，页面出现一个空白的方块，控制台：

```text
Warning: The tag <playercard> is unrecognized in this browser. If you meant to render a React component, start its name with an uppercase letter.
```

三步定位：警告说得直白——浏览器不认识 playercard，本意若是 React 组件请大写开头，改成 `<PlayerCard ... />` 即可。根源在 010 篇埋过：JSX 靠大小写区分组件和 HTML 标签，小写按 HTML 处理，不认识的标签渲染成空元素。

## 9. 实际项目中的使用场景

- 布局与容器组件（Panel、Modal、侧栏）几乎都靠 children 实现，「内容当参数」是 React 组件库的通用设计语言；
- 列表渲染无处不在：商品列表、消息流、表格行，全是「数据数组 + map + key」这一套；
- 拆分判断标准：同一段 JSX 出现第二遍就拆；一个逻辑块独立变化也拆。只出现一次的小碎片不必强拆——拆分是为了改起来便宜，不是为了好看；
- props 还能传函数（子组件把「发生了什么」报告给父组件），030 篇随事件一起讲。

## 10. 小练习

预测题（5 分钟，先写答案再运行）：

```jsx
function Badge({ text }) {
  return <em>[{text}]</em>;
}

function App() {
  return (
    <p>
      状态：{Badge({ text: '在线' })}
      与 <Badge text="离线" />
    </p>
  );
}
```

两种用法页面各显示什么？第一种是把组件当普通函数调用——本例恰好能显示，但绕过了组件机制，一旦用上 Hook（040 篇）就出错。规矩：组件永远用 JSX 标签调用。

修改题（10 分钟）：给 PlayerCard 增加 `title`（段位称号），缺省时显示「无段位」；App 改用 map 渲染，第四个玩家不传 title。验收：前三个显示各自称号，第四个显示「无段位」（解构默认值一行搞定）。

修 Bug 题（15 分钟）：下面的代码想渲染排行榜，控制台真实警告如下。按三步定位并修复：

```jsx
const players = [
  { id: 'p1', name: '阿天', score: 980 },
  { id: 'p2', name: '小满', score: 870 },
];

function Leaderboard() {
  return (
    <ul>
      {players.map((player) => (
        <li>
          {player.name}：{player.score}
        </li>
      ))}
    </ul>
  );
}
```

真实警告（同 8 节）：

```text
Warning: Each child in a list should have a unique "key" prop. Check the render method of `Leaderboard`.
```

挑战题（半小时，不给代码）：写一个 `ScoreTable({ players, columns })`——players 是对象数组（含 name、score、games 场次），columns 是字符串数组如 `['name', 'score']`，表格只渲染 columns 列出的字段。验收：

```text
columns 为 ['name', 'score'] 时，每行两格：名字、分数
columns 为 ['name'] 时，每行一格：名字
```

提示分两级：「提示」两层 map——外层玩家、内层字段名，字段值用 `player[field]` 取；「展开」内层 map 产生的每个 `<td>` 同样需要 key。

## 11. 与之前和之后的知识的关系

- 往前：010 篇的等式里你只会写一个 f，本篇把 f 拆成一族函数；090 篇的 map 升级为「数据变界面」的标准姿势；080 篇「函数里改参数不影响外面」在 props 只读契约里变成规矩；
- 往后：本模块 A→B→C→040——[状态与事件](/react/030-StateEvent) 让子组件也能「报告变化」；[Hooks 深入](/react/040-HooksDeep) 接手「状态凭什么记得住」；渲染底层在 [Fiber 架构](/react/120-FiberArchitecture) 等你。

## 12. 官方文档

- 传递 Props：https://zh-hans.react.dev/learn/passing-props
- 渲染列表：https://zh-hans.react.dev/learn/rendering-lists
- 组件保持纯粹：https://zh-hans.react.dev/learn/keeping-components-pure
- 条件渲染：https://zh-hans.react.dev/learn/conditional-rendering

## 13. 自我检查

- 能说出拆组件的两个判断标准，并现场把一段重复 JSX 拆成带 props 的组件；
- 能解释「props 是只读契约」的两层含义，并指出想改数据该由谁动手；
- 能用 children 写出 Panel，并说出它的设计价值；
- 能复述一次渲染的三个阶段，并说出「组件函数被反复调用」带来的两条纪律；
- 拿到 key 警告能十秒定位，并说清下标当 key 为什么在增删时出乱子。

## 本章总结

组件是返回界面描述的函数，页面由组件树组合而成。props 是父到子的只读契约：数据单向流，子组件只展示不修改；标签之间的内容自动成为 children，容器组件靠它把「内容当参数」。列表渲染 = 数据数组 map 成组件数组，每个列表项带唯一稳定的 key。组件函数被反复调用、展开成描述树，React 负责兑现与差异更新——组件要纯，重活别放组件体。最常见的两个现场：key 警告照着点名修，小写组件名被当成 HTML 标签。

## 下一步

进入 [状态与事件](/react/030-StateEvent)：按钮点一下，数字要变——useState 登场，props 的静态世界开始流动。
