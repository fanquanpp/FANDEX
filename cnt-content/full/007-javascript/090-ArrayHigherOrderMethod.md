---
order: 110
title: 数组高阶方法：排行榜不需要三段循环
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从「排行榜要筛选高分、算平均、找第一名，三段 for 循环写三遍」讲起：map/filter/reduce/sort/find/some/every 贯穿同一份玩家数组、回调函数是 080「函数是值」的落地、链式调用的可读性边界、用 reduce 手写 map/filter 的理解实验，附 x.map is not a function 调试实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/100-ThisKeywordDeepDive'
  - 'javascript/150-HigherOrderFunction'
  - 'javascript/170-CurryAndFunctionComposition'
  - 'javascript/200-DeepShallowCopy'
  - 'javascript/220-ES6NewFeatures'
prerequisites:
  - 'javascript/070-ObjectArray'
  - 'javascript/080-FunctionScopeClosure'
---

## 前置知识

- 已完成 [对象与数组](/javascript/070-ObjectArray)：认识本文的常驻嘉宾——玩家数组，会下标与 for-of；
- 已完成 [函数、作用域与闭包](/javascript/080-FunctionScopeClosure)：知道函数是值、可以当参数传来传去，认识箭头函数这张脸。

没学过 080 也能跟：回调只需要「函数可以当参数」这一条，用到时我会再交代一遍。本篇是 080 埋下的「函数是值」第一次大规模实战。

## 学习目标

读完本文你将能够：

1. 把三段结构雷同的 for 循环分别改写成 filter、reduce、sort，说清每个方法「收什么函数、吐什么结果」；
2. 看到任何 `数组.方法(回调)` 的调用，能预测回调被调用几次、新数组长什么样；
3. 用 reduce 一行算出平均分，并解释初始值为什么不能省；
4. 判断一条链式调用该不该继续链下去，并给出拆分方案；
5. 读懂 `TypeError: x.map is not a function`，用 `typeof` 与 `Array.isArray` 三步定位。

预计 60 到 75 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

070 篇的玩家名单加了一位新成员，现在要做排行榜，需求三条：筛出满状态的玩家、算全员平均血量、找出血量冠军。你手上有 for-of，三条需求三个循环：

```javascript
const players = [
  { name: '小明', hp: 100, gold: 50,  items: ['木剑'] },
  { name: '阿花', hp: 85,  gold: 120, items: ['皮盾', '药水'] },
  { name: '大牛', hp: 60,  gold: 8,   items: [] },
  { name: '老猫', hp: 95,  gold: 66,  items: ['飞刀'] },   // 070 名单的新成员
];

// 任务一：筛出 hp 不低于 80 的玩家
const strongNames = [];
for (const p of players) {
  if (p.hp >= 80) {
    strongNames.push(p.name);
  }
}

// 任务二：算全员平均血量
let totalHp = 0;
for (const p of players) {
  totalHp = totalHp + p.hp;
}
const averageHp = Math.round(totalHp / players.length);

// 任务三：找出血量冠军
let champion = players[0];
for (const p of players) {
  if (p.hp > champion.hp) {
    champion = p;
  }
}

console.log(strongNames);
console.log('平均血量 ' + averageHp);
console.log('冠军是 ' + champion.name);
```

预期输出：

```text
[ '小明', '阿花', '老猫' ]
平均血量 85
冠军是 小明
```

能跑，思路也清晰。但把三个循环并排一看：骨架一模一样——都是「遍历数组，对每个玩家做一件事，收集结果」，唯一的差别是中间那句「做什么」。更麻烦的是：排行榜明天还要加需求（按金币排序、找出空手的人、判断是不是人人都活着），每种统计再复制一个 for？080 开场「结算逻辑复制三遍」的剧本又要重演。

080 的结论是：逻辑写一遍，差异走参数。可这次的「差异」不是数字，是一段逻辑——把逻辑当参数传，正是函数作为值的用武之地。

## 2. 最小可运行示例：把「做什么」交给方法

保存为 `leaderboard.js`（`node leaderboard.js` 运行）：

```javascript
const players = [
  { name: '小明', hp: 100, gold: 50,  items: ['木剑'] },
  { name: '阿花', hp: 85,  gold: 120, items: ['皮盾', '药水'] },
  { name: '大牛', hp: 60,  gold: 8,   items: [] },
  { name: '老猫', hp: 95,  gold: 66,  items: ['飞刀'] },
];

const strongNames = players
  .filter((p) => p.hp >= 80)   // 每个玩家过一遍判断，true 才留下
  .map((p) => p.name);         // 留下的玩家各自换成名字

console.log(strongNames);
```

预期输出：

```text
[ '小明', '阿花', '老猫' ]
```

任务一的三行循环加一个 if，变成 filter 加 map 各一行。filter 收一个函数，替你把数组跑一遍，返回 true 的玩家进新数组；map 收一个函数，把每个元素转换成你给的形状。原数组 players 一个字节都没动。

## 3. 发生了什么：回调函数——080 的「函数是值」落地了

`players.filter((p) => p.hp >= 80)` 里那个箭头函数有个名字：**回调函数**（callback）——你把它交给方法，方法遍历时**回头**调用它，每个元素一次。拆开看：

- `(p) => p.hp >= 80` 是 080 篇的箭头函数：单参数省括号，函数体一句省 return。等价的普通写法：

```javascript
function isStrong(p) {
  return p.hp >= 80;
}
players.filter(isStrong);   // 和箭头版完全等价：函数是值，起个名字再交出去也一样
```

- filter 的分工：**循环归方法，判断归你**。你只写「判断一个」的函数，方法负责「跑全场」。回调必须 return——不写 return，每个元素都按 undefined 算，filter 只能还你一个空数组；
- map 同理：循环归方法，**转换规则归你**。回调 return 什么，新数组对应位置就是什么；
- map 和 filter 都返回**新数组**，原数组不动（sort 是例外，下一节见）。

「循环归方法、判断归你」这层分工记住，后面会反复用到：100 篇讲回调里的 this，150 篇教你自己写收函数的函数。

## 4. 核心概念：六个方法各管一件事

还是这份玩家名单，六种需求对应六个方法。每段都可以直接贴进控制台验证。

### 4.1 sort：排行榜本体

```javascript
console.log('排序前：' + players.map((p) => p.name).join(','));
players.sort((a, b) => b.hp - a.hp);
console.log('排序后：' + players.map((p) => p.name).join(','));
console.log('冠军：' + players[0].name);   // 任务三顺手解决：冠军就是第一名
```

预期输出（join 把数组拼成一个字符串，080 篇的报错里露过脸）：

```text
排序前：小明,阿花,大牛,老猫
排序后：小明,老猫,阿花,大牛
冠军：小明
```

比较函数收两个相邻候选 a 和 b，返回负数表示 a 应排前面。`b.hp - a.hp` 让血量大的排前（降序），想升序就换 `a.hp - b.hp`。两个坑：

- **sort 会原地修改原数组**——排完之后 players 本身的顺序也变了（上面两行输出就是证据）。想保住原顺序，先复制再排，复制的正规姿势见 [深浅拷贝](/javascript/200-DeepShallowCopy)；ES2023 还提供了不改原数组的 `toSorted`，先混个眼熟；
- 不给比较函数时按字符串排序：`[80, 9, 100].sort()` 的结果是 `[100, 80, 9]`，因为比的是 `'100'`、`'80'`、`'9'` 的字典序。数字排序必须带比较函数。

从本节起，后文所有示例都基于这份排好的顺序（小明、老猫、阿花、大牛）。

### 4.2 reduce：多个值压成一个（算平均）

```javascript
const totalHp = players.reduce((sum, p) => sum + p.hp, 0);
const averageHp = Math.round(totalHp / players.length);
console.log(totalHp, averageHp);
```

预期输出：

```text
340 85
```

第二个参数 0 是**初始值**，每次回调的返回值成为下一轮的 sum，值得逐轮画出来：

```text
初始 sum = 0
+ 100 → 100（小明）
+ 95  → 195（老猫）
+ 85  → 280（阿花）
+ 60  → 340（大牛）
```

「压成一个值」不限于数字：压成字符串、对象、数组都行（第 6 节就压了两次数组）。初始值别省——空数组不给初始值会直接报错，第 8 节有实录。

### 4.3 find：找第一个满足条件的

```javascript
const rich = players.find((p) => p.gold > 100);
console.log(rich.name);
```

预期输出：

```text
阿花
```

找到第一个就停手返回它；一个都找不到返回 `undefined`——拿它的属性之前先判断，否则就是 070 篇那出 `Cannot read properties of undefined`。

### 4.4 some / every：只问一句，不想要那个元素

```javascript
const hasEmptyBag = players.some((p) => p.items.length === 0);
const allStrong = players.every((p) => p.hp >= 80);
console.log(hasEmptyBag, allStrong);
```

预期输出：

```text
true false
```

some 问「有没有一个满足」，every 问「是不是全都满足」。两者都会短路：some 撞到第一个 true 就返回，every 撞到第一个 false 就返回。只是判断、不需要元素时，比 filter 完再看 length 省一圈。

### 4.5 forEach 一句话

只想逐个打印、不收集结果时，070 的 for-of 和数组自带的 forEach 都行。本篇其余方法都「有产出」，forEach 唯独没有——它的定位和坑留给 [高阶函数](/javascript/150-HigherOrderFunction)，今天记住 for-of 就够。


### 4.7 贯穿例：一个 fruits 数组跑遍六个方法（承接自扫描素材）

课堂演示页里有个经典做法：**一个数组从头用到尾**，六种需求在同一份数据上各取所需，方法之间的差别因此一览无余。把玩家名单换成水果清单，同样的六件事再来一遍：

```javascript
const fruits = ["苹果", "香蕉", "橙子", "苹果", "葡萄", "香蕉"];

// sort：按默认字典序排
console.log([...fruits].sort());           // ["橙子", "苹果", "葡萄", "香蕉", "香蕉", "苹果"]...
// 注：默认排序按 UTF-16 码元，中文结果依实现，演示排序"有规则"即可

// indexOf + includes：查存在与位置
console.log(fruits.indexOf("苹果"));       // 0（第一次出现）
console.log(fruits.includes("榴莲"));      // false

// push / pop：尾部进出
const basket = [...fruits];
basket.push("芒果");                       // 尾部加
const last = basket.pop();                 // 尾部取（"芒果"又出来了）

// splice：任意位置增删
const trimmed = [...fruits];
trimmed.splice(1, 2);                      // 从下标 1 删 2 个（香蕉、橙子）

// slice：不改动地截取
console.log(fruits.slice(0, 3));           // ["苹果", "香蕉", "橙子"]

// map：每个元素变形（与高阶方法的衔接）
console.log(fruits.map((f) => "新鲜的" + f));
```

为什么值得单独练：六个方法散在 4.1~4.6 的名单例子里，换成 fruits 再跑一遍，能检验你记住的是**方法的能力**还是**那份数据**。自测标准：不看上文，能对 fruits 说出六种需求各该用哪个方法。

**配套的练习版式**：「左源码右演示」双栏页（左栏高亮代码、右栏实时运行结果）是这个素材的另一份遗产——自己练时可以开两个编辑器分屏：左边写代码，右边开一个最小 HTML + `<pre id="out"></pre>` 输出区，用 `out.textContent = JSON.stringify(result)` 替代 console.log，保存即看结果。这套自制沙盒比控制台多一个好处：结果可以留着对比。

## 5. 链式调用与它的可读性边界

方法返回新数组，新数组就能接着调方法，于是可以串起来。排行榜的牌子就是这么打的：

```javascript
const banner = players
  .filter((p) => p.hp >= 80)
  .map((p) => p.name + '（' + p.hp + '）')
  .join('、');
console.log(banner);
```

预期输出（players 仍是 4.1 排好的顺序）：

```text
小明（100）、老猫（95）、阿花（85）
```

三层是甜点区：每行一个动作，从上往下读就是数据流的形状。但链条不是越长越好：

```javascript
// 反例：五层一口气，回调里还塞了多步逻辑——读的人要在脑内同时开五个数组
const report = players
  .filter((p) => p.items.length > 0)
  .map((p) => ({ name: p.name, bag: p.items.join('/') }))
  .filter((p) => p.bag.length > 3)
  .map((p) => p.name.toUpperCase())
  .reduce((all, name) => all + name, '');
```

经验边界：**超过三步、或某一步的回调超过一行，就拆成有名字的中间变量**：

```javascript
const armed = players.filter((p) => p.items.length > 0);
const bagTexts = armed.map((p) => p.name + ' 带着 ' + p.items.join('/'));
console.log(bagTexts.join('；'));
```

预期输出：

```text
小明 带着 木剑；老猫 带着 飞刀；阿花 带着 皮盾/药水
```

名字本身就是注释，排查问题时还能单独打印每一层。

## 6. 理解实验：用 reduce 手写一遍 map 和 filter

六个方法看着不少，其实是一家子。做实验验证：map 和 filter 能干的事，reduce 全都能干——它就是「遍历 + 自己决定怎么收集」的完全体：

```javascript
// 手写 filter：满足条件才收进 names
const strongNames = players.reduce((names, p) => {
  if (p.hp >= 80) {
    names.push(p.name);
  }
  return names;
}, []);

// 手写 map：无条件收进转换结果
const hps = players.reduce((list, p) => {
  list.push(p.hp);
  return list;
}, []);

console.log(strongNames);
console.log(hps);
```

预期输出：

```text
[ '小明', '老猫', '阿花' ]
[ 100, 95, 85, 60 ]
```

筛选结果和第 2 节 filter+map 的一致（顺序不同——players 已经按排行榜排过了）；`hps` 与第 4.1 节排序后的顺序逐位对应。结论不是「以后都用 reduce」，恰恰相反：**日常写 map/filter，它们把意图写在脸上**；理解这层等价关系后，六个方法从六个 API 变成一件事的三种现成封装，遇到「筛选和汇总要一步完成」之类的组合需求时，reduce 才是顺手的那个。

## 7. 修改实验

实验一：把第 2 节的筛选条件换成「金币超过 50」，链式输出名字列表。预期 `[ '老猫', '阿花' ]`（players 仍是排序后的顺序）。

实验二：排行榜改成按金币降序重排并输出，再打印冠军的名字。预期先 `120 阿花`、`66 老猫`、`50 小明`、`8 大牛`，再 `阿花`。注意这会再次原地重排 players，之后重跑前面的实验结果会变——做实验建议按编号顺序来。

实验三：用 every 写「是不是人人都带着至少一件装备」，用 some 写「有没有人的金币是个位数」。预期 `false true`。

## 8. 常见错误与调试实录

**错误一：`x.map is not a function`。** 来自一次真实手滑——想处理一串数字，忘了先把字符串切开：

```javascript
const input = '100 85 60 95';          // 这是字符串，不是数组
const doubled = input.map((n) => n * 2);
```

真实报错（Node 原文）：

```text
TypeError: input.map is not a function
```

三步定位：

1. **读报错**：`TypeError` 加 `is not a function`——080 篇的同款结尾。含义：你当数组用的 input 身上没有 map 这个方法。名字就在报错里：`input.map`；
2. **验真身**：报错行前加 `console.log(typeof input, Array.isArray(input))`，输出 `string false`——input 是字符串不是数组。`Array.isArray` 是判断数组的专用方法，比 typeof 靠谱（typeof 对数组只会说 object）；
3. **修正**：先 split 切成数组，再上方法：

```javascript
const nums = input.split(' ').map(Number);   // 内置函数 Number 不加括号直接当回调：逐个把字符串转数字
const doubled = nums.map((n) => n * 2);
console.log(doubled);
```

预期输出：

```text
[ 200, 170, 120, 190 ]
```

顺手又见一次「函数是值」：`Number` 没加括号，直接递给了 map。

**错误二：reduce 忘了初始值。**

```javascript
const scores = [];
const total = scores.reduce((sum, n) => sum + n);
```

真实报错（Node 原文）：

```text
TypeError: Reduce of empty array with no initial value
```

空数组没有元素可以当起点，reduce 不知道 sum 从几开始。纪律：**reduce 永远写初始值**——数字从 0、字符串从 `''`、数组从 `[]`。

## 9. 实际项目中的使用场景

- 前端列表渲染是 map 与 filter 的头号工地：接口返回的原始数据 map 成视图对象，filter 筛掉下架项——本篇的链式写法原样搬过去就能用；
- 后端与脚本统计：日志数组 reduce 出错误计数、订单数组 filter 出超时单、some 判断是否有库存告急——报表需求基本是这六个方法的排列组合；
- sort 加 map 是排行榜、搜索联想的标配；每次 sort 前想一想要不要保原数组；
- 何时不用：只是逐个执行副作用用 for-of；数据量极大的热点路径上，普通 for 循环比方法链更快，性能话题见 [调试与性能优化](/javascript/500-DebugPerformanceOptimization)。

## 10. 小练习

预测题（5 分钟，先写答案再运行）：

```javascript
const nums = [1, 2, 3, 4, 5];
const result = nums.filter((n) => n % 2 === 0).map((n) => n * 10);
console.log(result);
console.log(nums);
```

两问：result 是什么？原数组 nums 变了吗？

对照（先写再看）：

```text
[ 20, 40 ]
[ 1, 2, 3, 4, 5 ]
```

修改题（10 分钟）：把第 5 节的 banner 链改成「输出空手玩家的名字，用『、』连接」，再改成输出「每人的装备数」。验收：前者输出 `大牛`，后者输出 `[ 1, 1, 2, 0 ]`（提示：map 的回调里可以写 `p.items.length`，输出顺序跟当前名单一致）。

修 Bug 题（15 分钟）：下面的代码想把名字列表变成问候语，运行真实报错。按三步定位并修复：

```javascript
const names = '小明,阿花,大牛';
const greetings = names.map((name) => 'Hi, ' + name);
console.log(greetings);
```

真实报错：

```text
TypeError: names.map is not a function
```

提示：names 是什么类型？哪个方法能把字符串切成数组？

挑战题（半小时，不给代码）：写 `averageGold(players)`，用 reduce 返回平均金币，空名单返回 0。验收断言（`console.assert(条件, '提示')`，条件不成立才输出）：

```javascript
console.assert(averageGold(players) === 61, '平均金币应为 61');
console.assert(averageGold([]) === 0, '空名单应为 0');
console.assert(typeof averageGold(players) === 'number', '返回值必须是数字');
```

提示分两级：「提示」空名单的 length 是 0，直接除会得到 NaN，需要一个 if 提前返回；「展开」reduce 的初始值传 0，先求总金币再除以 players.length。

## 11. 与之前和之后的知识的关系

- 往前：[函数、作用域与闭包](/javascript/080-FunctionScopeClosure) 的「函数是值」在回调里全面兑现；[对象与数组](/javascript/070-ObjectArray) 的玩家数组从「用 for 遍历」升级成「交给方法遍历」；
- 往后：[this 关键字](/javascript/100-ThisKeywordDeepDive) 解释回调里普通函数与箭头函数的最后一层差别；[高阶函数](/javascript/150-HigherOrderFunction) 教你自己写收函数的函数；[柯里化与偏函数](/javascript/170-CurryAndFunctionComposition) 把「传函数」玩成体系；sort 的副本问题在 [深浅拷贝](/javascript/200-DeepShallowCopy) 里有正规解法。

## 12. 官方文档

- Array 总览（全部方法一览）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array
- map：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/map
- filter：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
- reduce：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
- sort：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
- some、every、find 在同一目录下，参数签名与本文一致

## 13. 自我检查

- 能把「筛选、求平均、找冠军」三个 for 循环分别改写成 filter、reduce、sort，并说出每个方法收什么、吐什么；
- 能预测 `数组.map(回调)` 新数组的内容，知道 map/filter 不改原数组而 sort 改；
- 能解释「循环归方法、判断归你」的回调分工，并写出箭头与普通函数两种回调；
- 能用 reduce 手写一遍 map 或 filter，并说出日常为什么还是用 map/filter；
- 拿到 `x.map is not a function`，知道先 `typeof` 加 `Array.isArray` 验真身，再回头找数组在哪一步丢了。

## 本章总结

数组方法把「遍历 + 收集」的样板循环收走了，你只交回调：filter 筛、map 转、reduce 压、sort 排、find 找、some/every 问。回调就是 080 说的函数作为值——循环归方法、判断归你，map/filter 返回新数组，sort 原地改。reduce 配初始值能把数组压成任何形状，map 和 filter 都是它的特例。链条三层内是好代码，超过就该给中间结果起名字。最常撞的报错是 `x.map is not a function`：你手里那玩意不是数组，`typeof` 加 `Array.isArray` 一验便知。

## 下一步

进入 [this 关键字](/javascript/100-ThisKeywordDeepDive)：本篇的回调全用的箭头函数，换成普通函数会差在哪？下一篇用四条规则加一个例外，把这块模块里最难的骨头拆开啃。
