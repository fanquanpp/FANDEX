---
order: 30
title: 状态与事件：按钮点一下，数字要变
module: 'react'
category: 前端技术
difficulty: beginner
description: 从「按钮点了数字纹丝不动」讲起：useState 三件套（当前值、setter、重渲染）、事件处理与合成事件直觉、函数式更新、不可变更新与引用比较、受控输入最小表单，附 Too many re-renders 无限循环调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'react/010-OverviewEnvSetup'
  - 'react/020-ComponentProps'
  - 'react/040-HooksDeep'
  - 'react/050-ContextGlobalState'
  - 'javascript/200-DeepShallowCopy'
prerequisites:
  - 'react/020-ComponentProps'
---

## 前置知识

- 已完成 [组件与 Props](/react/020-ComponentProps)：会传 props、map 加 key 渲染列表，知道组件函数会被反复调用；
- [深浅拷贝](/javascript/200-DeepShallowCopy) 学过最好——本文回收它埋的伏笔「什么时候真需要新数组」；没学过也不影响，现场只用展开语法 `...`。

## 学习目标

读完本文你将能够：

1. 用 useState 让按钮点击后数字真的变化，说清「当前值、setter、重渲染」三件套各干什么；
2. 绑定事件处理器时不踩「传函数还是传调用」的坑，并会给处理器传参；
3. 用函数式更新 `setX(prev => ...)` 修复连续更新丢失的问题；
4. 解释状态为什么必须「不可变更新」，并用展开语法正确增删改数组与对象；
5. 写出受控输入的最小表单，并读懂 `Too many re-renders` 报错、定位渲染途中调 setter 的根因。

预计 60 到 75 分钟。

## 1. 你现在要解决什么问题

020 篇的战绩榜已经像模像样：组件树、props、列表一应俱全。现在想加一个「点赞」按钮——点一下，阿天的分数加一。你写下 `const score = 980;` 和一个 `<button>点赞（{score}）</button>`，然后卡住了：想在按钮里改 score，却改不动。`score = score + 1`？080 篇警告过，改局部变量不影响任何东西。更根本的问题：**score 是每次渲染都重建的局部变量**——函数执行完它就随这次调用消失，界面上没有任何东西能「记住」上一次的值。

你要的是一个能活在函数之外、变了还能让界面重新算的东西——React 管它叫**状态（state）**，声明它的那行代码就是你在 React 里写的第一个 Hook。

## 2. useState：三件套让数字动起来

```jsx
import { useState } from 'react';

function LikeButton() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
  }

  return (
    <div>
      <p>当前点赞：{count}</p>
      <button onClick={handleClick}>点赞</button>
    </div>
  );
}

export default LikeButton;
```

预期行为：初始显示 0；点一下变 1，再点变 2——数字真的变了。

等号左边是数组解构：useState 返回两项数组，按位置取名，第二项以 set 开头。这一行就是三件套：

1. **当前值 count**：本次渲染的状态值，普通的 const——每次渲染都是崭新的一个；
2. **setter（setCount）**：React 的「改变申请器」。`setCount(1)` 不是赋值，是预约：「下次渲染请把 count 变成 1」；
3. **重渲染**：React 收到申请，重新调用 LikeButton()，这次 useState 返回新值，界面重新算一遍。

接上 010 篇的等式：state 是自变量，setCount 是改自变量的唯一入口，重渲染就是重新算 f。**永远不要直接改 count，只走 setCount**——原因第 4 节揭晓。

解开 1 节的谜：React 把状态存在组件函数外的「格子」里，按 useState 调用顺序对号入座，函数执行完状态还在。顺序为什么不能变，[Hooks 深入](/react/040-HooksDeep) 讲透。

## 3. 事件处理：把函数交出去，不是把结果交出去

`onClick={handleClick}` 传的是**函数本身**——React 存着它，等点击发生再调用。最常见的坑是把调用结果传了出去：

```jsx
<button onClick={handleClick()}>点赞</button>   // 错：渲染时就执行了
<button onClick={handleClick}>点赞</button>      // 对：点击时才执行
```

要传参怎么办？包一层箭头函数（080 篇的函数表达式派上用场）：`<button onClick={() => removePlayer(player.id)}>移出榜单</button>`。

参数 e 是 React 的**合成事件**——直觉版理解：长得和 [DOM 操作与事件](/javascript/410-DOMOperationEvent) 里的原生事件几乎一样，`e.target`、`e.preventDefault()` 直接照搬；React 统一包一层抹平浏览器差异，内部实现不在入门篇展开。

表单提交是最常用的场景——`onSubmit` 里先 `e.preventDefault()` 挡住浏览器「提交就刷新页面」的默认行为：

```jsx
function AddPlayerForm({ onAdd }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onAdd(name.trim());
    setName('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit">上榜</button>
    </form>
  );
}
```

两个新概念就藏在这段代码里，接下来两节讲。

## 4. 不可变更新：为什么必须造新值

先看一个必然翻车的写法：

```jsx
const [players, setPlayers] = useState([{ id: 'p1', name: '阿天', score: 980 }]);

function addPlayerWrong(name) {
  players.push({ id: 'p2', name, score: 0 });   // 直接改原数组
  setPlayers(players);                          // 交回去的还是同一个数组
}
```

预期行为（翻车现场）：点击后界面纹丝不动——数据其实已经 push 进去了，但界面不认账。

原因一句话：**React 判断「状态变没变」用的是引用比较。** setPlayers 收到新值后，React 用 `Object.is` 与旧值比——push 后还是原来那个数组，引用没变，React 判定「没变化」，跳过重渲染。[深浅拷贝](/javascript/200-DeepShallowCopy) 埋的问题「什么时候真需要新数组」，答案就在这：**要 React 看见变化，就给它一个新引用。**

正确姿势——用展开语法和 filter、map 这些「返回新数组」的方法：

```jsx
function addPlayer(name) {
  setPlayers([...players, { id: crypto.randomUUID(), name, score: 0 }]);
}

function likePlayer(id) {
  setPlayers(
    players.map((p) =>
      p.id === id ? { ...p, score: p.score + 1 } : p   // 只造一个新对象，其余原样
    )
  );
}
```

删除用 filter——`setPlayers(players.filter((p) => p.id !== id))`，它天然返回新数组。预期行为：添加多一行、点赞那行分数加一。口诀：**数组造新数组，对象造新对象，没动的项原样复用。** 这就是「不可变更新」：不改旧值，永远基于旧值算新值。

## 5. 受控输入：界面是 state 的投影

上一节表单里的 input 值得单独一节。`value={name}` 加 `onChange` 把输入框和状态锁死：每敲一个字，onChange 触发 setName，重渲染后 value 是新 state——**输入框显示什么完全由 state 决定**，这就是受控输入。

好处立刻兑现：想清空就 `setName('')`（提交后那行就是），想校验、想联动，全是操作状态的普通代码。React 表单的默认姿势就是受控输入；非受控写法等 [Hooks 深入](/react/040-HooksDeep) 讲 useRef 时再补。对比 010 篇：那时等式还是口号，现在连输入框也被收编——整个页面真的成了 state 的函数。

## 6. 修改实验

实验一：给 LikeButton 加「点踩」（`setCount(count - 1)`）和「重置」（`setCount(0)`），验收三按钮互不干扰。

实验二：快速双击「点赞」，观察是否偶尔只加了一次；改成 `setCount((prev) => prev + 1)` 再试——函数式更新基于上一次的值计算，连续申请不丢拍。

实验三：把 4 节的 players 组装成完整战绩榜，每行一个点赞按钮，点谁加谁的分。验收：只有被点那行变。

## 7. 常见错误与调试实录

**错误一：渲染途中直接调 setter。** 新手经典手滑——把调用写进了组件体：

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  setCount(count + 1);          // 组件体里直接调 setter
  return <p>{count}</p>;
}
```

真实报错（页面崩溃，控制台）：

```text
Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

三步定位：读报错——重渲染超限，React 熔断防死循环，说明「渲染」在不停触发「再渲染」；验真身——逐行检查组件体和 JSX 属性值里有没有**不在任何函数里**的 setX 调用；修正——挪进事件处理器，或补成箭头函数 `onClick={() => setCount(count + 1)}`。口诀：**setX 只在回调里调，不在渲染里调。**

**错误二：状态改了界面不变。** push 现场没有报错，只有沉默的界面——比崩溃更熬人。定位三步：确认调了 setX（前一行打 `console.log`）；确认传的是**新引用**（`提交值 === players` 为 true 即实锤）；把原地改写换成展开语法或 filter。「数据变了界面不动」，第一嫌疑永远是原地突变。

## 8. 实际项目中的使用场景

- useState 管「界面自己的状态」：开关、输入草稿、选中项、点赞数这类活数据；
- 状态放哪有讲究：多个组件要共享时，先提升到最近共同父组件（props 向下流 + 回调向上报），更大范围用 Context——[Context 与全局状态](/react/050-ContextGlobalState) 展开；来自服务器的数据不塞 useState 手动同步，070 篇讲正规姿势；
- 受控输入是表单的地基，复杂表单方案建立在这套心智模型上，[React 表单](/react/200-ReactForm) 再深入。

## 9. 小练习

预测题（5 分钟，先写答案再运行）：

```jsx
function Demo() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  return <button onClick={handleClick}>{count}</button>;
}
```

点一次按钮显示几？三次 setCount 为什么只生效一次（每次拿到的都是本次渲染的同一个旧值）？怎么改成点一次加三？

修改题（10 分钟）：给 LikeButton 加上限，count 到 10 后再点不再增加。验收：连点到 10 封顶，不报错不回退。

修 Bug 题（15 分钟）：下面的组件一挂载就白屏崩溃。按三步定位并修复：

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={setCount(count + 1)}>点赞{count}</button>;
}
```

真实报错（同 7 节原文）：

```text
Too many re-renders. React limits the number of renders to prevent an infinite loop.
```

挑战题（半小时，不给代码）：写 `Backpack()` 组件管理背包数组 `items`（元素形如 `{ id, name }`）：受控输入名字，「拾取」添加一条（id 用 `Date.now()`），每条带「丢弃」按钮，另有「清空」。验收（操作后打印 items 核对）：

```text
添加两条后 items 长度 2、界面两行；丢弃第一条后长度 1、内容正确；清空后长度 0
```

提示分两级：「提示」三个操作对应展开语法、filter、空数组，全走 setItems 换新引用；「展开」添加前用 `name.trim() === ''` 拦空输入。

## 10. 与之前和之后的知识的关系

- 往前：010 篇的 state 本篇登场，界面第一次「动」了；props 向下流加回调向上报，数据环流闭合；080 篇的闭包解释了「count 为什么总是旧值」，函数式更新是绕开它的标准解；javascript/200 的伏笔在不可变更新兑现；
- 往后：本模块 A→B→C→040——[Hooks 深入](/react/040-HooksDeep) 讲 useEffect、useRef 与 Hooks 规则（为什么不能写在 if 里）；共享状态升级在 [Context 与全局状态](/react/050-ContextGlobalState)。

## 11. 官方文档

- 组件的内存：状态：https://zh-hans.react.dev/learn/state-a-components-memory
- useState API 参考：https://zh-hans.react.dev/reference/react/useState
- 更新数组中的状态：https://zh-hans.react.dev/learn/updating-arrays-in-state

## 12. 自我检查

- 能不查资料写出 LikeButton，并说清三件套里谁存值、谁申请变化、谁触发重算；
- 能解释「传函数还是传调用」的区别，并现场给事件处理器带上参数；
- 能说出「为什么 push 之后界面不动」，并用展开语法写出正确的增删改；
- 看到数字比预期少加了一次，能想到函数式更新；
- 拿到 `Too many re-renders`，第一步就是搜「不在回调里的 setX」。

## 本章总结

useState 给组件装上记忆：当前值、setter、重渲染三件套，让「界面 = f(state)」在每次点击里兑现。事件处理把函数交给 React 等点击，合成事件像原生事件一样用。状态必须不可变更新——React 靠引用比较判断变化，push 原数组等于白改。受控输入把输入框也收编进 state。渲染途中调 setter 触发 `Too many re-renders` 熔断：setX 只在回调里调。

## 下一步

进入 [Hooks 深入](/react/040-HooksDeep)：useState 只是 Hook 家族的第一个成员——useEffect 管副作用，useRef 摸 DOM，还有「为什么 Hook 不能写在 if 里」的规则底细。
