---
order: 200
title: 原型与继承：方法只写一次，一百个玩家共享
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从「给一百个玩家挂同一个升级方法，难道要复制一百份」讲起：函数的 prototype 样板间、Object.getPrototypeOf 实验看见 __proto__ 链、属性查找沿链上溯与「读上溯、写只写自己」、new 的四步拆解（衔接 this 篇的 new 绑定）、class 是原型的语法糖与类字段分工，附方法挂错地方的 TypeError 与循环引用打印陷阱调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'javascript/100-ThisKeywordDeepDive'
  - 'javascript/190-PrototypeChainClassEssence'
  - 'javascript/210-ObjectStaticMethods'
  - 'javascript/140-CustomErrorTypes'
prerequisites:
  - 'javascript/070-ObjectArray'
  - 'javascript/100-ThisKeywordDeepDive'
---

## 前置知识

- 已完成 [对象与数组：一百个玩家怎么办](/javascript/070-ObjectArray)：会用对象装「一个玩家的属性」、用数组装「一串玩家」；
- 已完成 [this 关键字：四条规则，一个例外](/javascript/100-ThisKeywordDeepDive)：记得 new 绑定——当时只记了「this 是引擎刚造的新对象」这个现象，本篇把这个新对象的来路拆开。

没读过 100 也能跟：用到 this 的地方我都会一句带回上下文，但「谁调用，this 就指向谁」你得有印象。

分工声明：本篇负责把原型的心智模型立起来——方法怎么共享、属性怎么沿链查找、new 到底做了什么、class 糖衣下面是什么；[原型链深水区](/javascript/190-PrototypeChainClassEssence) 负责拆机制——prototype、\_\_proto\_\_、constructor 三角关系、Object.create 与 setPrototypeOf、继承模式演进、instanceof 真相。两篇实验不重复，读完本篇再去深水区。

## 学习目标

读完本文你将能够：

1. 用 Object.getPrototypeOf 现场验证「实例的原型就是构造函数的 prototype」，并把一条原型链走到 null；
2. 预测任意属性读取会沿原型链上溯到哪一层命中，并说出「读沿链上溯、写只写自己」；
3. 按「造对象、接原型、跑函数、交对象」四步解释 new 的每一步，接上 100 篇的 new 绑定；
4. 把任何 class 写法逐行翻译回「构造函数 + prototype」写法，并解释方法为什么全实例共享一份；
5. 诊断「方法挂错地方」一类的 TypeError，并避开对象打印的两个陷阱。

预计 60 到 75 分钟，含 3 组修改实验与 4 道练习。

示例都在 Node 里跑：存成 `.js` 文件用 `node 文件名` 运行，或直接粘进 `node` 交互模式。每个示例都先预测再看输出。

## 1. 你现在要解决什么问题

070 篇用对象和数组解决了「一百个玩家的**数据**怎么办」。现在策划提了新需求：每个玩家都要能升级。第一反应——每个玩家对象里写一个方法：

```javascript
const p1 = { name: '小明', level: 1, levelUp() { this.level += 1; } };
const p2 = { name: '阿花', level: 1, levelUp() { this.level += 1; } };
// ……第 3 到第 100 个玩家，每人抄一份 levelUp

console.log(p1.levelUp === p2.levelUp);   // 同一个函数吗？
```

预期输出：

```text
false
```

`===` 比较函数时问的是「是不是同一个函数对象」。false 的意思是：一百个玩家手里攥着一百份一模一样的 levelUp。三个问题随之而来：

- 浪费：一百个函数对象白白占内存；
- 难改：升级规则变了（比如升级还回血），要改一百处；
- 致命：想给所有玩家补一个新方法 cheer，已经创建出来的老玩家怎么办？对象字面量是「出生即定型」，没有任何入口给一百个对象统一补发方法。

问题浓缩成一句：**方法放在哪儿，才能让一百个对象共用一份、还支持事后补发？** JavaScript 给出的答案是「原型」。往下读之前，把这个问题带在身上。

## 2. 构造函数与 prototype：公共样板间

JavaScript 里每个普通函数出生时都自带一个属性 `prototype`，它的值是一个普通对象。约定俗成的用法：**数据写在函数体里（每个实例一份），方法挂在 `prototype` 上（所有实例共享一份）**。

```javascript
function Player(name) {
  this.name = name;      // this 是谁？100 篇的 new 绑定：引擎刚造的新对象
  this.level = 1;
}

// 方法不写进函数体，挂到样板间上
Player.prototype.levelUp = function () {
  this.level += 1;
};

const p1 = new Player('小明');
const p2 = new Player('阿花');

p1.levelUp();
console.log(p1.level, p2.level);          // 只动了 p1？
console.log(p1.levelUp === p2.levelUp);   // 同一个函数吗？
```

预期输出：

```text
2 1
true
```

升级规则改了也不用改一百处——样板间里那一份改了，所有人都用新版。为什么 `p1.levelUp` 能调用到样板间里的方法？因为 `new Player(...)` 造出来的每个实例，都连着 `Player.prototype`。这张连线图不是背的，下一节用工具现场量出来：

```text
p1 ──→ { name: '小明', level: 2 }        实例：只放每个玩家不同的数据
        │
        │  出生时由 new 接好的一条隐形连线
        ↓
Player.prototype ──→ { levelUp: … }      样板间：所有玩家共享的方法
        │
        ↓
Object.prototype ──→ { toString: … }     所有对象的公共样板间
        │
        ↓
null                                     链的终点
```

## 3. 用 Object.getPrototypeOf 看见这条链

引擎给了测量工具：`Object.getPrototypeOf(对象)` 返回它的「上一级」。别背图，逐行先预测再运行：

```javascript
function Player(name) { this.name = name; }
const p1 = new Player('小明');

console.log(Object.getPrototypeOf(p1) === Player.prototype);   // p1 的上一级是？
console.log(Object.getPrototypeOf({}) === Object.prototype);   // 普通对象的上一级是？
console.log(Object.getPrototypeOf([]) === Array.prototype);    // 数组的上一级是？
console.log(Object.getPrototypeOf(Object.prototype));          // 链的终点是？
```

预期输出：

```text
true
true
true
null
```

第三行顺手解开一个老谜题：为什么数组有 `push`、普通对象没有？因为 `push` 住在 `Array.prototype` 这个样板间里，数组一出生就连着它。把整条链打印出来：

```javascript
function Player(name) { this.name = name; }
const p1 = new Player('小明');

function showChain(obj) {
  let cur = obj;
  while (cur !== null) {
    if (cur === obj) {
      console.log('(自己) ' + JSON.stringify(cur));
    } else {
      console.log('(原型层) ' + cur.constructor.name);
    }
    cur = Object.getPrototypeOf(cur);
  }
  console.log('(终点) null');
}
showChain(p1);
```

预期输出：

```text
(自己) {"name":"小明"}
(原型层) Player
(原型层) Object
(终点) null
```

代码里出现了 `constructor`——它是每个原型层自带的名字牌，写着这块样板间属于哪个函数。它本身是 [原型链深水区](/javascript/190-PrototypeChainClassEssence) 的主角，本篇只借它当层名用，先混个眼熟。

## 4. 属性查找：读沿链上溯，写只写自己

现在能解释 `p1.levelUp` 的调用过程了。读 `p1.某属性` 时，引擎按固定路线找：

1. 先看 p1 自己身上有没有；
2. 没有就到上一级 `Player.prototype` 找；
3. 还没有就到 `Object.prototype` 找；
4. 到 null 都没有，返回 undefined。

```javascript
function Player(name) { this.name = name; }
Player.prototype.levelUp = function () { this.level = (this.level || 1) + 1; };
const p1 = new Player('小明');

console.log(p1.name);      // 自己身上有
console.log(p1.levelUp);   // 自己没有，样板间有
console.log(p1.toString);  // 样板间也没有，Object.prototype 有
console.log(p1.hasGold);   // 全链都没有
```

预期输出：

```text
小明
[Function: levelUp]
[Function: toString]
undefined
```

写规则只有一句，但和读不一样：**赋值只落在对象自己身上，原型层毫发无损**。`p1.level = 5` 是在 p1 身上新建自有属性，不会顺着链往上改。这条规则在 190 篇还会碰见更刁钻的边界情况。

还有一块拼图别丢：`p1.levelUp()` 里共享的函数怎么知道该升级谁的等级？100 篇的隐式绑定——点号前是 p1，所以方法里的 this 就是 p1。**方法共享一份，数据各用各的**，这两条合起来才是原型的心智模型全貌。

## 5. new 到底做了什么：四步拆解

「构造函数 + prototype」是一条装配线，`new Player('小明')` 看着是一步，底下是四步：

1. 造一个全新的空对象；
2. 把它的原型接到 `Player.prototype`（第 3 节验证过的那条连线）；
3. 以这个新对象为 this 执行函数体——100 篇的 new 绑定，当时只记了现象，现在知道 this 指向的新对象从哪来了；
4. 函数跑完，把新对象交还给你。例外：构造函数显式 return 一个对象时，返回那个对象——知道有这回事就行，日常 class 写法用不到。

前两步可以在构造函数里现场验证：

```javascript
function Player(name) {
  console.log('第 1、2 步刚完成：this =', this, '连着样板间？',
    Object.getPrototypeOf(this) === Player.prototype);
  this.name = name;      // 第 3 步：往新对象上挂数据
}
Player.prototype.levelUp = function () {};

const p = new Player('小明');
console.log(p);            // 第 4 步交出来的东西
```

预期输出：

```text
第 1、2 步刚完成：this = {} 连着样板间？ true
{ name: '小明' }
```

注意最后一行：打印出来的 p 只有 `{ name: '小明' }`，那条连向样板间的线看不见——`console.log` 只显示自有属性。这个「打印陷阱」第 8 节细说。

## 6. class：原型的语法糖

ES6 之后你见到的多数代码长这样。和第 5 节的装配线逐行对照：

```javascript
class Player {
  constructor(name) {
    this.name = name;      // 四步里的第 3 步
    this.level = 1;
  }
  levelUp() {              // 等价于 Player.prototype.levelUp = function () { … }
    this.level += 1;
  }
}

console.log(typeof Player);                                   // class 的真身是？
console.log(Player.prototype.levelUp);                        // 方法挂在哪？
const p1 = new Player('小明');
console.log(Object.getPrototypeOf(p1) === Player.prototype);  // 接的还是同一条链吗？
```

预期输出：

```text
function
[Function: levelUp]
true
```

class 没有发明新机器：它就是「构造函数 + 挂原型」写成一体，外加两条纪律——必须 new 调用（直接 `Player()` 报 TypeError）、方法自动不可枚举。记住这句：**class 是原型的语法糖，糖衣下面还是那四步**。语法糖不是贬义——少写样板、少踩坑，前提是你知道糖下面是什么。

class 还有「字段」语法，正好把实例和原型各归其位：

```javascript
class Counter {
  count = 0;                   // 类字段：每个实例一份，等价于 constructor 里 this.count = 0
  inc() { this.count += 1; }   // 方法：挂在原型上，所有实例共享一份
}

const c1 = new Counter();
const c2 = new Counter();
console.log(c1.inc === c2.inc);   // 同一个函数吗？
```

预期输出：

```text
true
```

需要钉死 this 的回调（100 篇事件修复的第三种写法）就写成箭头函数字段：`handleClick = () => { … }`。它写在每个实例上、每实例一份，换来 this 终生不变——共享还是独立，现在你有依据做选择了。

## 7. 修改实验

实验一（事后补发方法）：在创建 p1、p2 之后，再补一行 `Player.prototype.cheer = function () { return this.name + ' 呐喊助威'; }`。先预测 p1 能不能调用 cheer，再运行。开局那个「老玩家怎么办」的问题在这里出答案。

实验二（共享与遮蔽）：先预测 `p1.levelUp === p2.levelUp`；然后执行 `p1.levelUp = function () { this.level += 2; }`，再预测这个等式的结果、以及两人各升级一次后 level 差多少。运行验证：p1 身上长出了一份新方法，把原型那份挡住了——「写只写自己」的现场版。

实验三（换条链走走）：把第 3 节的 `showChain(p1)` 换成 `showChain([])` 和 `showChain(new Date())`。先预测各打几层、层名是什么，再运行。

## 8. 常见错误与调试实录

**错误一：方法挂错地方，`TypeError: xxx is not a function`。** 三种挂法里只有一种是共享的，另两种都会出事：

```javascript
function Enemy(kind) { this.kind = kind; }

Enemy.attack = function () { return this.kind + ' 发起攻击'; };   // 挂错：挂到了函数自己身上
const e = new Enemy('史莱姆');
console.log(e.attack());
```

真实报错（Node 原文）：

```text
TypeError: e.attack is not a function
```

三步定位：

1. **读报错**：e.attack 不是函数——e 身上没有 attack，或者它不是函数；
2. **验对象**：插一行 `console.log(e.attack, Enemy.attack)`，输出 `undefined [Function: attack]`——attack 存在，但住在 Enemy 函数自己身上，实例的链上根本没有它；
3. **找位置**：`Enemy.attack = …` 把方法挂到了构造函数自己（那是给「静态方法」留的位置），实例够不着。修复一行：

```javascript
Enemy.prototype.attack = function () { return this.kind + ' 发起攻击'; };
console.log(e.attack());   // 史莱姆 发起攻击
```

另外两种病根同源：把方法挂到了某一个实例上（`e.attack = …`，只有它自己会用）；把方法写进了函数体（不报错，但回到第 1 节的一百份复制）。还有一个陷阱别踩：方法挂在原型上之后，`console.log(e)` 里**看不到** attack——console.log 只显示自有属性，看不见不等于没挂上，能调用就是挂上了。

**错误二：循环引用打印陷阱。** 原型学会了，你开始给对象之间挂关系：玩家带着公会，公会成员列表里又是玩家：

```javascript
const guild = { name: '晨风', members: [] };
const p1 = { name: '小明' };
p1.guild = guild;
guild.members.push(p1);

console.log(guild);            // Node 能处理环，但会打标记
JSON.stringify(guild);         // 序列化直接炸
```

预期输出（第一行是 Node 的打印原文，第二段是报错原文）：

```text
<ref *1> { name: '晨风', members: [ { name: '小明', guild: [Circular *1] } ] }
TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
```

`<ref *1>` 和 `[Circular *1]` 是 Node 的标记：*1 位置的对象出现了第二次，别再展开。`JSON.stringify` 没这个容错，直接抛 TypeError。修复思路：调试时用 `console.log` 看（认标记就行）；真要序列化，先拆掉环或者给 stringify 传 replacer 过滤掉会成环的键。注意区分：这是「引用成环，打印炸」；原型链本身永远到 null 就停，不会成环——要是有人硬造原型环，引擎会当场拒绝，见 190 篇。

## 9. 实际项目中的使用场景

- 游戏实体、UI 组件这类「大量实例 + 固定行为」的对象：方法一律上原型或 class。一千个敌人共用一份攻击函数，实例上只放血量、位置这些各自不同的数据；
- 类字段箭头函数钉 this 在事件绑定里常见（100 篇的第三种修复），代价是每实例一份——别把所有方法都写成箭头字段；
- 别随手给内置原型补方法（`Array.prototype.first = …`）：会和别的库、和语言未来新增的方法撞名。想扩展行为，优先用工具函数或组合；
- 读老代码、读 polyfill、读工具库源码时会遇到大量 prototype 写法：本篇的心智模型就是解码器，[原型链深水区](/javascript/190-PrototypeChainClassEssence) 再给你进阶密码本。

## 10. 小练习

预测题（5 分钟，先写答案再运行）：

```javascript
function Player() {}
Player.prototype.hp = 100;
const a = new Player();
a.hp = 70;
const b = new Player();
console.log(a.hp, b.hp);
```

对照（先写再看）：

```text
70 100
```

赋值只落在 a 自己身上（遮住原型的 100）；b 自己没有 hp，读时沿链上溯拿到 100。

修改题（10 分钟）：把第 1 节的一百玩家字面量版改成共享版——写构造函数 Player，name 与 level 挂实例，levelUp 挂原型。验收断言：

```javascript
console.assert(p1.levelUp === p2.levelUp, 'levelUp 应共享同一份');
console.assert(Object.getPrototypeOf(p1) === Player.prototype, '实例应连着样板间');
```

修 Bug 题（15 分钟）：下面的代码想给每个敌人一个特殊技，运行真实报错。按三步定位并修复：

```javascript
function Boss(name) { this.name = name; }
Boss.roar = function () { return this.name + ' 发出咆哮'; };
const boss = new Boss('黑龙');
console.log(boss.roar());
```

真实报错：

```text
TypeError: boss.roar is not a function
```

提示：roar 挂到了谁身上？修复后预期输出 `黑龙 发出咆哮`。修完追加一问：`Boss.roar()` 直接调用能跑吗？能打出什么？（this 是 Boss 函数自己，this.name 是 undefined。）

挑战题（半小时，不给代码）：写构造函数 Wizard——name 与 mana = 100 挂实例，castSkill 挂原型（施法扣 40 蓝并返回施法描述字符串）。验收断言：

```javascript
const w1 = new Wizard('小明');
const w2 = new Wizard('阿花');
console.assert(w1.castSkill === w2.castSkill, 'castSkill 应共享同一份');
w1.castSkill();
console.assert(w1.mana === 60 && w2.mana === 100, '只有 w1 掉了蓝');
console.assert(Object.getPrototypeOf(w1) === Wizard.prototype, '应连在 Wizard.prototype 上');
```

「提示」：new 四步里第 3 步负责挂数据，方法别写进函数体；「展开」：函数体里只写 `this.name = name; this.mana = 100;`，方法在构造函数外面用 `Wizard.prototype.castSkill = function () { … }` 挂。

## 11. 与之前和之后的知识的关系

- 往前：070 篇的「一百个玩家」在数据层面收官，本篇在行为层面收官——数据进实例，行为上原型；100 篇 new 绑定的「新对象」找到了出生地：第 2 步接原型、第 3 步当 this；090 篇「数组能 push、普通对象不能」的谜底在第 3 节——push 住在 Array.prototype 样板间里；
- 往后：[原型链深水区](/javascript/190-PrototypeChainClassEssence) 拆三角关系、继承演进与 instanceof 真相；[自定义错误类型](/javascript/140-CustomErrorTypes) 的 extends Error 是 class 继承最常见的实战；[Object 扩展](/javascript/210-ObjectStaticMethods) 收纳 Object.create、Object.getPrototypeOf 等静态方法的完整清单。

## 12. 官方文档

- MDN 继承与原型链：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Inheritance_and_the_prototype_chain
- Object.getPrototypeOf：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/getPrototypeOf
- class：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes
- 公共类字段：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes/Public_class_fields

## 13. 自我检查

- 能不翻资料说出 new 的四步，并在构造函数里用一行代码验证前两步；
- 能用 Object.getPrototypeOf 把任意对象的原型链打印到 null；
- 给一段代码能预测「读」落在链上哪一层、「写」落在谁身上；
- 能把一段 class 逐行翻译回「构造函数 + prototype」写法；
- 看到 `xxx is not a function` 能列出「挂错地方」的三种可能：挂到实例、挂到函数自己、写进了函数体。

## 本章总结

原型是一百个对象共用一份方法的方式：方法挂在函数的 `prototype` 样板间上，new 造实例时自动把实例连到样板间——这条连线可以用 Object.getPrototypeOf 随时验证。属性读取沿「自己、样板间、Object.prototype、null」上溯命中即停，赋值只写自己；共享方法配 100 篇的隐式绑定，方法共享一份、数据各用各的。new 的四步（造对象、接原型、跑函数、交对象）解释了 this 新对象的来路；class 只是这四步的包装，字段归实例、方法归原型。调试两条纪律：`xxx is not a function` 先查方法挂到了谁身上；console.log 只显示自有属性，看见循环引用标记要认得收手。

## 下一步

进入 [原型链深水区](/javascript/190-PrototypeChainClassEssence)：心智模型已经立住——那边拆机制。constructor 为什么查得到、Object.create 和 setPrototypeOf 的用法与代价、继承从借用构造函数到 class extends 的演进、instanceof 的真实原理，全在那边。
