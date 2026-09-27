---
order: 70
title: 对象与数组：一百个玩家怎么办
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从「一个玩家三行变量，一百个玩家怎么办」讲起：对象字面量、点与方括号取值的分界、数组下标与 push/pop、玩家数组的嵌套结构，附 Cannot read properties of undefined 真实报错与三步定位、预测题与挑战题。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'javascript/060-ControlFlow'
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/090-ArrayHigherOrderMethod'
  - 'javascript/200-DeepShallowCopy'
prerequisites:
  - 'javascript/060-ControlFlow'
---

## 前置知识

- 已完成 [控制流](/javascript/060-ControlFlow)：会写 if 分支与 for-of 循环，在上一篇里见过 `const guesses = [1, 9, 7]` 这个「先混眼熟」的数组。

没读过也能跟：数组首次出现本文会从头讲，for-of 随用随解释。循环没过关就先回 060 补 20 分钟。

## 学习目标

读完本文你将能够：

1. 用对象字面量把一个玩家的多项属性收进一个变量，用点与方括号两种方式读写；
2. 说出点取值与方括号取值的分界线，并解释「键名存在变量里」时为什么只能用方括号；
3. 用数组与下标管理一串玩家，用 `push` / `pop` 在尾部增删，并预测它们的返回值；
4. 读写「数组里放对象、对象里放数组」的嵌套结构，如 `players[1].items.push(...)`；
5. 读懂 `Cannot read properties of undefined` 报错，按三步定位到造出 undefined 的那行代码。

预计 45 到 60 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

游戏里有一个玩家，你会这么写：

```javascript
const playerName = '小明';
const playerHp = 100;
const playerGold = 50;
```

三个变量，凑合。第二个玩家入场呢？再写三个 `player2Hp` 之类？现在想想一百个玩家：三百个变量，名字互相之间没有任何关联，想打印「血量排行榜」要手写一百行，想给某个玩家扣血要先把他的三个变量名背下来。

问题的根源：**一个变量只能装一个值，而「一个玩家」天然是一组有名字的值**。解法分两步：

1. 用**对象**把「一个玩家的所有属性」装进一个值；
2. 用**数组**把「一串玩家」排成一列。

这两样是 JS 里几乎所有真实数据的形状：接口返回的商品列表、待办清单、聊天记录，全都是「对象组成的数组」。

## 2. 先不要看解释，先试试看

浏览器控制台逐行输入，先预测再回车：

```javascript
const player = { name: '小明', hp: 100 };
player.name
player['name']
const key = 'hp';
player.key
player[key]
```

四个取值表达式，两个成功、两个不是你想要的结果——`player.key` 拿到 `undefined`，`player[key]` 拿到 `100`。为什么点号不看变量、方括号看？往下读。

## 3. 最小可运行示例：一个玩家排

保存为 `players.js`（`node players.js` 运行，或整段贴进浏览器控制台）：

```javascript
const players = [
  { name: '小明', hp: 100, gold: 50, items: ['木剑'] },
  { name: '阿花', hp: 85,  gold: 120, items: ['皮盾', '药水'] },
  { name: '大牛', hp: 60,  gold: 8,   items: [] },
];

for (const p of players) {                 // 逐个拿出每个玩家
  console.log(p.name + ' 血量 ' + p.hp + ' 金币 ' + p.gold);
}

players[0].gold = players[0].gold + 30;    // 小明捡到 30 金币
players.push({ name: '红姐', hp: 99, gold: 1, items: [] });  // 新玩家入场
const leaving = players.pop();             // 又立刻离场：pop 取走末尾玩家
console.log('离场：' + leaving.name);
console.log('现在场上还有 ' + players.length + ' 人');
```

预期输出：

```text
小明 血量 100 金币 50
阿花 血量 85 金币 120
大牛 血量 60 金币 8
离场：红姐
现在场上还有 3 人
```

三十行的「一百个玩家怎么办」，答案就浓缩在这几行里。下面拆开讲。

## 4. 发生了什么：对象是键值对，数组是有序列表

### 4.1 对象：属性有名字的一包数据

```javascript
{ name: '小明', hp: 100, gold: 50 }
```

大括号里是若干「键： 值」对，逗号隔开。键是属性名，值可以是任何类型。读取用点号或方括号：

```javascript
player.name        // '小明'   键名是固定的、写死的
player['name']     // '小明'   同上，方括号版
player[key]        // 100      键名存在变量里，先取 key 的值再当键用
player.key         // undefined 找的是字面上叫 key 的属性，没有
```

**分界线一句话：点号要求键名当场写死；键名在变量里、或键名不是合法标识符（含空格、以数字开头，如 `'银行余额'`）时，必须用方括号。** 写代码九成场景用点号，方括号留给动态键名。

改值与加值同一种写法，键不存在就新增：

```javascript
player.hp = 80;          // 改
player.level = 1;        // 加
```

### 4.2 数组：按顺序排列的一串值

```javascript
const guesses = [1, 9, 7];
```

方括号字面量，逗号隔开。每个值有一个**下标**（位置编号），**从 0 开始数**——第 1 个是 `[0]`。`length` 给出个数：

```javascript
guesses[0]       // 1
guesses.length   // 3
guesses[2] = 99  // 改第 3 个
```

尾部增删两件套：

```javascript
players.push(x)      // 末尾加 x，返回加完后的 length
players.pop()        // 取走末尾元素并返回它
```

注意两者的返回值不同：`push` 返回的是新长度（数字），`pop` 返回的是被取走的元素。所以示例里 `const leaving = players.pop()` 能直接拿到离场玩家。

### 4.3 嵌套：数组里放对象，对象里放数组

回到示例，`players` 的结构值得画出来看：

```text
players ──→ [ 玩家0 ──→ { name, hp, gold, items ──→ ['木剑'] },
              玩家1 ──→ { name, hp, gold, items ──→ ['皮盾', '药水'] },
              玩家2 ──→ { ... } ]
```

读嵌套结构就像念地址，从外往里一层层走：

```javascript
players[1].name          // '阿花'：下标选人，点号选属性
players[1].items[0]      // '皮盾'：再往下钻一层进数组
players[1].items.push('面包')   // 给阿花的背包塞一个面包
```

每一段要么是「下标选元素」，要么是「点号选属性」，链起来就是完整路径。

还有一个现在只记现象的伏笔：`const copy = players` **不会复制**这份数据，只是给同一份玩家名单起了第二个名字——通过 `copy` 改了什么，`players` 也看得见。为什么、怎么真正复制，[深浅拷贝](/javascript/200-DeepShallowCopy) 会讲透，今天先不动这个机关。

## 5. 核心概念速查

| 要做的事 | 写法 | 结果 |
| --- | --- | --- |
| 读属性 | `player.hp` 或 `player['hp']` | 值；键不存在返回 `undefined` |
| 改 / 加属性 | `player.hp = 80` | 键存在是改，不存在是加 |
| 读下标 | `players[0]` | 元素；越界返回 `undefined` |
| 个数 | `players.length` | 数字 |
| 末尾加 | `players.push(x)` | 新长度 |
| 末尾取走 | `players.pop()` | 被取走的元素 |

`undefined` 是上一篇提过的假值之一，本篇它会以两种身份出场：**正常的空**（还没设置的字段）与**事故现场**（拼错了、越界了）。区分这两者，就是下一节调实录的主题。

## 6. 修改实验

实验一：给三个玩家都**不加** `level` 字段，然后把打印行改成 `console.log(p.name + ' 段位：' + p.level)`。先预测输出里「段位」后面是什么，运行验证，再用一句话解释。

实验二：用 `let total = 0` 加 for-of 循环统计全队金币总数，最后输出 `全队金币合计 N`。注意循环体外声明、循环体内累加。

实验三：把大牛的血量改成 0，然后在打印循环里加一个 if：血量为 0 的玩家名字后面追加 `'（已倒下）'`。这题是上一篇判断与本篇数据的合体。

## 7. 常见错误与调试实录

**真实报错现场：Cannot read properties of undefined。** 来自一次真实手滑——场上只有 3 个玩家，却写了 `players[3]`：

```javascript
const players = [{ name: '小明', hp: 100 }];
console.log(players[3].name);
```

真实报错（Node 原文）：

```text
TypeError: Cannot read properties of undefined (reading 'name')
```

三步定位：

1. **读报错**：类型是 `TypeError`，括号里 `(reading 'name')` 说明「取 name 这个属性」的动作失败了——问题出在点号**前面**的那个东西，它是 `undefined`，身上什么属性都取不出来；
2. **对半拆**：到报错行，把点号前半段单独打印：`console.log(players[3])`，输出 `undefined`，锁定嫌疑对象；
3. **追上游**：为什么它是 undefined？三种常见来源——下标越界（本例）、键名拼错（`p.gld` 取不到 `gold`）、数据本身缺字段（接口没返回）。**要修的是造出 undefined 的那一步，不是报错那一行**；本例的修法是把下标改对，或打印前先判断 `players.length`。

还有一个必须认识的「不报错事故」：`player.gld`（gold 拼错）不报错，安静地返回 `undefined`；接着 `player.gld + 30` 得到 `NaN`，排行榜上冒出一串 NaN。链路是「拼错 → undefined → 传染成 NaN」，050 篇的 `Number.isNaN` 自检在这里派上用场。JS 对越界和拼错都过于宽容，**报错要靠你主动读数据、打印验证**。

## 8. 实际项目中的使用场景

- 接口数据：后端返回的玩家、商品、待办列表几乎都是「对象数组」，你会天天对它 for-of；
- 配置项：`{ host: 'localhost', port: 8080 }` 这类配置对象，用点号读；
- 何时用对象、何时用数组：**属性有名字、顺序无关**（一个玩家的信息）用对象；**一串同类东西、要遍历或顺序有意义**（一排玩家）用数组。拿不准就问：我要的是「这一个的第几项属性」还是「第几个是谁」；
- 不该做的：给数组挂非下标的属性（`list.owner = 'me'`）——数组管顺序集合，附加信息单独用对象装。

## 9. 小练习

预测题（5 分钟，先写答案再运行）：

```javascript
const hero = { hp: 100, items: ['剑'] };
const bag = hero.items;
bag.pop();
console.log(hero.items);
```

若预测错了，把「现象 + 疑问」记下来——这是第 4.3 节伏笔的现场版，答案在 [深浅拷贝](/javascript/200-DeepShallowCopy) 揭晓。

修改题（10 分钟）：给每个玩家加 `level` 字段（数值自定），仿照金币统计输出全队**平均血量**。验收：改任一玩家的 hp，平均数随之变化。

修 Bug 题（15 分钟）：下面的代码想打印每人背包里的物品数，运行真实报错。按三步定位并修好（两种修法都写出：改数据，或打印前做防御判断）：

```javascript
const players = [
  { name: '小明', hp: 100, items: ['木剑'] },
  { name: '阿花', hp: 85 },                 // 阿花没有 items 字段
];

for (const p of players) {
  console.log(p.name + ' 背包：' + p.items.length + ' 件');
}
```

真实报错：

```text
TypeError: Cannot read properties of undefined (reading 'length')
```

挑战题（半小时，不给代码）：用「对象数组」组织一个三首歌曲的播放列表，每首含 `title`、`artist`、`seconds`（时长秒数）。写代码：打印每首「歌名 - 歌手（m 分 s 秒）」，最后输出总时长秒数。验收断言：

```javascript
console.assert(总时长 === 你手算的数, '总时长不对');
console.assert(list[0].title === 你的第一首歌名, '下标选人失败');
```

提示分两级：「提示」总时长用实验二的累加套路；「展开」把秒数拆成分和秒用 `%`（余数）与 `/` 配合取整。

## 10. 与之前和之后的知识的关系

- 往前：[控制流](/javascript/060-ControlFlow) 的 for-of 在这里有了真正的舞台——遍历玩家数组；`if` 用于统计中的筛选；050 篇的 NaN 自检在调试实录里上岗；
- 往后：[函数、作用域与闭包](/javascript/080-FunctionScopeClosure) 会把这些「结算玩家数据」的重复代码收进函数；[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 提供比手写循环更顺手的 map/filter；[深浅拷贝](/javascript/200-DeepShallowCopy) 揭晓本文埋下的引用伏笔。

## 11. 官方文档

- MDN 对象使用指南：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Working_with_objects
- MDN 数组指南（索引集合）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Indexed_collections
- `Array.prototype.push`：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/push
- `Array.prototype.pop`：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/pop

## 12. 自我检查

- 能不看资料写出 `{ name, hp }` 字面量，并用点与方括号各取一次值；
- 能说出「键名在变量里必须用方括号」的原因，并现场演示 `player.key` 与 `player[key]` 的差别；
- 能预测 `push` 与 `pop` 的返回值分别是什么；
- 拿到 `Cannot read properties of undefined (reading 'xxx')`，能在三步内说出「点号前的东西是 undefined」，并指出三种上游来源；
- 能画出 `players[1].items` 的嵌套路径图。

## 本章总结

对象把「一个东西的多项属性」装进一个值，键值对读写；数组把「一串同类东西」按顺序排列，下标从 0 起，`push` 加、`pop` 取、`length` 数个数。嵌套结构一层层链式走：下标选元素、点号选属性。点号当场写死键名，动态键名走方括号。最常见的事故是 `Cannot read properties of undefined`——记住三步：读 reading 后面的属性名、打印点号前半段、追造出 undefined 的上游。

## 下一步

进入 [函数、作用域与闭包](/javascript/080-FunctionScopeClosure)：同样的结算逻辑复制了三遍，改一处漏两处——是时候把它们打包成一个函数了。
