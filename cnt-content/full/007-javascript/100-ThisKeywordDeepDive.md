---
order: 100
title: this 关键字：四条规则，一个例外
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从「同一个 sayHi，player 调用正常、摘下来单独调用就崩」讲起：默认/隐式/new/显式四条绑定规则按判定顺序各配预期输出、箭头函数词法 this 是规则外的唯一例外、事件处理器与回调丢 this 的修复，附 Cannot read properties of undefined (reading 'name') 调试实录。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'javascript/090-ArrayHigherOrderMethod'
  - 'javascript/150-HigherOrderFunction'
  - 'javascript/170-CurryAndFunctionComposition'
  - 'javascript/180-JavaScriptPrototypeInheritance'
  - 'javascript/190-PrototypeChainClassEssence'
prerequisites:
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/090-ArrayHigherOrderMethod'
---

## 前置知识

- 已完成 [函数、作用域与闭包](/javascript/080-FunctionScopeClosure)：会函数调用、认识箭头函数、知道闭包「记住出生地」；
- 已完成 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod)：知道回调函数——本篇一半的 this 丢失就发生在回调里。

没学过 090 也能跟：凡是出现回调的地方我都会一句带过上下文。本篇是模块公认最难的概念，但先把心态放平：**它难在场景多，不在规则多——四条规则加一个例外，全部内容**。

## 学习目标

读完本文你将能够：

1. 说出 this 的本质：每次调用时由调用方式决定的隐式参数，不看出身、不看定义位置（箭头函数除外）；
2. 按「默认、隐式、new、显式」四条规则判定任意调用点的 this，并预测输出；
3. 解释箭头函数为什么不吃这四条规则，预测 call/bind 对它无效；
4. 诊断事件处理器与回调里的 this 丢失，用 bind 或箭头函数修复；
5. 认出 `Cannot read properties of undefined (reading 'xxx')` 里由 this 丢失引起的那一类，并用 `console.log(this)` 验证。

预计 75 到 90 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

游戏里给玩家写了个打招呼的方法，第一遍调用好好的，把它存进一个变量再调用，程序当场崩了：

```javascript
'use strict';

const player = {
  name: '小明',
  sayHi() {
    console.log('我是 ' + this.name);
  },
};

player.sayHi();          // 第一次调用

const sayHi = player.sayHi;
sayHi();                 // 第二次调用：同一个函数，崩了
```

真实报错（Node 原文）：

```text
我是小明
TypeError: Cannot read properties of undefined (reading 'name')
```

函数一个字没改，变量也没动，报错说 `this.name` 里的 this 是 undefined。为什么同一个函数，第一次有 this、第二次没有？

因为 **this 不是函数的属性，而是每次调用时才定下来的隐藏参数**：第一次调用是「通过 player 点出来」，第二次是「摘下来赤裸调用」——调用方式变了，this 就变了。记住开场判词：**谁调用，this 就指向谁；不看出身，只看调用点**。它名声在外地难，其实是场景把规则淹了，本篇把场景一个个过掉。

## 2. 最小可运行示例：四条规则，四个 this

保存为 `this-rules.js`，逐行先预测再运行：

```javascript
'use strict';

// 规则一 默认绑定：谁都不沾，独立调用
function probe() {
  console.log(this);
}
probe();                            // undefined

// 规则二 隐式绑定：通过对象点出来调用
const player = { name: '小明', probe };
player.probe();                     // { name: '小明', probe: [Function: probe] }

// 规则三 new 绑定：配合 new 调用，this 是引擎刚造出来的新对象
function Player(name) {
  this.name = name;
}
const p1 = new Player('小明');
const p2 = new Player('阿花');
console.log(p1.name, p2.name);      // 小明 阿花

// 规则四 显式绑定：call 亲手指定
probe.call(player);                 // { name: '小明', probe: [Function: probe] }
```

预期输出：

```text
undefined
{ name: '小明', probe: [Function: probe] }
小明 阿花
{ name: '小明', probe: [Function: probe] }
```

四条规则一句话版：

| 规则 | 调用长什么样 | this 是谁 |
| --- | --- | --- |
| 默认绑定 | `fn()` | 严格模式 undefined；非严格模式是全局对象 |
| 隐式绑定 | `obj.fn()` | 点号前面那个对象 |
| new 绑定 | `new Fn()` | 引擎刚造出来的新对象 |
| 显式绑定 | `fn.call(obj)`、`fn.bind(obj)` | 你亲手指定的对象 |

关于模式的补充：本文全程带 `'use strict'`，所以默认绑定的 this 是 undefined。非严格模式下它指向全局对象（浏览器里的 window），读不到属性时悄悄给你 undefined 而不报错——错误被藏起来反而更难查，严格模式让它当场炸出来，是好事。

new 那两行先记现象：new 调用时，this 是引擎刚造好的空对象，函数体往上面挂属性，最后 new 把它交还给你。机制全貌（原型、构造函数）在 [原型与继承](/javascript/180-JavaScriptPrototypeInheritance) 展开，今天够用。

## 3. 规则怎么用：从特殊到普通，按顺序判定

四条规则不是并列菜单，撞在一起时有优先级。判定时从最特殊的往最普通的查：

1. 是 new 调用吗？是，this 就是新对象；
2. 有 call、apply 或 bind 吗？有，this 就是你指定的那个；
3. 是「对象.方法()」的形态吗？是，this 就是点号前的对象；
4. 都不是，落回默认绑定。

两条优先级用代码钉死（先预测再运行）：

```javascript
'use strict';

// 显式 > 隐式：call 指定的对象赢
function who() {
  console.log(this.name);
}
const xiaoMing = { name: '小明', who };
const aHua = { name: '阿花' };
xiaoMing.who();                 // 小明：隐式绑定
xiaoMing.who.call(aHua);        // 阿花：显式绑定压过隐式绑定

// new > 显式：new 造的新对象赢
function Ticket(price) {
  this.price = price;
}
const bound = Ticket.bind({ price: 0 });   // 显式绑定了个"假"对象
const ticket = new bound(660);
console.log(ticket.price);      // 660：new 的新对象赢，假对象没被碰
```

预期输出：

```text
小明
阿花
660
```

第二段值得多看一眼：方法明明定义在 xiaoMing 身上，`call` 一指定就归 aHua——再次验证「不看出身，只看调用点」。

## 4. call、apply、bind：显式绑定的三兄弟

三个都干「亲手指定 this」的事，分工不同：

```javascript
'use strict';

function intro(venue, date) {
  console.log(this.name + ' @ ' + venue + '（' + date + '）');
}
const a = { name: '小明' };
const b = { name: '阿花' };

intro.call(a, '主会场', '周六');          // 立即调用，参数逐个列
intro.apply(b, ['分会场', '周日']);       // 立即调用，参数装数组

const fixed = intro.bind(a, '线上直播');  // 不调用，返回绑好 this 的新函数
fixed('周五');
```

预期输出：

```text
小明 @ 主会场（周六）
阿花 @ 分会场（周日）
小明 @ 线上直播（周五）
```

记法：**call 立即调、参数一个个列；apply 立即调、参数打包成数组（apply 配数组，都带 a）；bind 不调用，造一个 this 已写死的新函数**。bind 是后面事件回调场景的主力，它的「一次性」也值得现在记下：bind 过的函数再 bind 或再 call，都改不动第一次绑定的 this。

## 5. 箭头函数：规则外的唯一例外

080 篇预告过箭头函数还有更深一层差别。现在揭晓：**箭头函数没有自己的 this，它的 this 在定义处按词法作用域向外找，找到就终生不忘**——四条规则对它统统无效。

```javascript
'use strict';

function makeSpeaker() {
  const speak = () => console.log('大家好，我是 ' + this.name);
  return speak;
}

const ming = makeSpeaker.call({ name: '小明' });
ming();                      // 大家好，我是 小明：箭头函数记住了出生地的 this
ming.call({ name: '阿花' }); // 还是 小明：call 改不动它
```

预期输出：

```text
大家好，我是 小明
大家好，我是 小明
```

和 080 的闭包对照着记最顺：**闭包记住出生地的变量，箭头函数记住出生地的 this**。它最常用的姿势，是包住普通方法里的回调：

```javascript
'use strict';

const countdown = {
  seconds: 3,
  start() {
    setInterval(() => {
      this.seconds = this.seconds - 1;
      console.log('还剩 ' + this.seconds + ' 秒');
    }, 1000);            // Ctrl+C 停掉
  },
};
countdown.start();
```

预期输出（每秒一行，一直数下去）：

```text
还剩 2 秒
还剩 1 秒
还剩 0 秒
还剩 -1 秒
```

start 由 countdown 点出来调用（隐式绑定，this 是 countdown）；里面的箭头函数把**定义处**的 this 原样带走，定时器每秒触发多少次，this 都纹丝不动。要是把箭头函数换成普通 function 会怎样？修改实验二见分晓。

选择口诀：**需要「谁调用指向谁」就写普通函数，需要「定义处是谁就是谁」就写箭头函数**。

## 6. this 与闭包的分工

一句话点清：**闭包管变量从哪来，this 管这次调用算谁的**。变量查找看代码写在哪儿（词法，出生地定死）；this 指向看函数被谁调（动态，每次调用都可能变）。两者常在同一个函数里碰头，但互不接管——记住这句，能省掉一大类「这俩到底谁管谁」的混战。

## 7. 前端实战：事件处理器里的 this 丢失

浏览器控制台可运行（先在页面里放一个 `<button id="buy">充值</button>`，这段在控制台默认非严格模式下跑）：

```javascript
const shop = {
  gold: 100,
  buy() {
    this.gold = this.gold - 10;
    console.log('余额 ' + this.gold);
  },
};

const button = document.querySelector('#buy');
button.addEventListener('click', shop.buy);
// 点击按钮：余额 NaN —— this 不是 shop
```

点一下，输出：

```text
余额 NaN
```

剧本和开场一模一样：addEventListener 只是要一个函数，shop.buy 被摘下来递了过去。点击发生时，浏览器把 buy 当普通函数调用，并把 this 设成触发事件的元素——反正不是 shop。`this.gold` 读到按钮自己的 gold（没有），减出来就是 NaN。若这段代码在严格模式下跑，this 会是 undefined，直接抛 `TypeError: Cannot set properties of undefined (setting 'gold')`——症状不同，病根相同：**隐式绑定要求点号前有对象，而这里没有**。判定不依赖浏览器源码，只看调用点。

两种修复：

```javascript
// 修复一：bind 先把 this 写死，再交给 addEventListener
button.addEventListener('click', shop.buy.bind(shop));   // 点击输出：余额 90

// 修复二：箭头函数包一层，buy 依旧通过 shop 点出来调用
button.addEventListener('click', () => shop.buy());
```

规则四（显式绑定）和例外（词法 this）在这里汇合：两种写法都在告诉引擎「别猜了，this 就是 shop」。以后学了 class 还有第三种写法——类字段箭头函数，先混个眼熟，见 [原型与继承](/javascript/180-JavaScriptPrototypeInheritance) 之后的篇章。

## 8. 修改实验

实验一：造第二个对象 `const rival = { name: '阿花', probe: player.probe };`，运行 `rival.probe()`。先预测输出里的 name 是谁，再解释：方法明明定义在 player 身上，为什么跟着 rival 走？

实验二：把第 5 节 countdown 里的箭头函数换成普通 function。两问都先预测再跑：在 `'use strict'` 文件里会怎样？（提示：默认绑定，严格模式 this 是 undefined，读属性直接抛 TypeError。）去掉严格模式呢？（提示：Node 里 this 是一个 Timeout 对象，`this.seconds` 是 undefined，输出一路「还剩 NaN 秒」。）

实验三：给第 4 节的 fixed 再 bind 一次：`fixed.bind(b)('加场')`。预测输出里的 name 和 venue 各是谁，验证「bind 只认第一次」。

## 9. 常见错误与调试实录

**错误一：定时器回调丢 this，`Cannot read properties of undefined (reading 'name')`。** 开场悬疑的完整版：

```javascript
'use strict';

const player = {
  name: '小明',
  level: 7,
  showLevel() {
    console.log(this.name + ' 等级 ' + this.level);
  },
};

setTimeout(player.showLevel, 1000);
```

一秒后真实报错（Node 原文）：

```text
TypeError: Cannot read properties of undefined (reading 'name')
```

三步定位：

1. **读报错**：有人对 undefined 读了 `name`。报错行指向 showLevel 里的 `this.name`——嫌疑：this 是 undefined；
2. **验 this**：showLevel 第一行插 `console.log(this)`，一秒后输出 `undefined`。默认绑定实锤——showLevel 被独立调用，没人通过「对象.方法」点它；
3. **找调用点**：`setTimeout(player.showLevel, 1000)` 把方法摘下来递走了，和事件处理器同款剧本。修复：

```javascript
setTimeout(() => player.showLevel(), 1000);   // 或 player.showLevel.bind(player)
```

一秒后预期输出：

```text
小明 等级 7
```

**错误二：forEach 回调里的 this——最危险的丢失，因为它可以不报错。**

```javascript
const counter = {
  count: 0,
  items: ['药水', '卷轴'],
  countItems() {
    this.items.forEach(function () {
      this.count = this.count + 1;   // 这里的 this 不是 counter
    });
    console.log(this.count);
  },
};
counter.countItems();     // 输出 0：计数没加上，也没报任何错
```

预期输出（非严格模式）：

```text
0
```

090 篇说过「循环归方法、判断归你」；这里回调用了普通 function，它有自己的 this——回调被 forEach 独立调用，落进默认绑定。非严格模式下 `this.count` 写到了全局对象上，counter 的 count 纹丝不动，程序安静地错了。严格模式下同样的代码会抛 `TypeError: Cannot set properties of undefined (setting 'count')`——反而好排查。修法一句话：**回调里要用外层 this 时，改箭头函数**：

```javascript
this.items.forEach(() => {
  this.count = this.count + 1;
});
console.log(this.count);  // 2
```

注意分界：回调里不用 this（090 篇的绝大多数回调）就相安无事；一旦用到，箭头函数是默认选择。

## 10. 实际项目中的使用场景

- 事件绑定、定时器、把方法递给数组方法，是 this 丢失的三大高发区。口诀：**方法被递出去，就 bind 或包箭头**；
- [防抖与节流](/javascript/490-DebounceThrottle) 是事件处理的高频搭档，里面 bind 的偏函数用法——固定部分参数造专用回调——在 [柯里化与偏函数](/javascript/170-CurryAndFunctionComposition) 讲透；
- new 绑定在 [原型与继承](/javascript/180-JavaScriptPrototypeInheritance) 全面展开：构造函数、class 方法、类字段箭头函数，全是本篇四条规则的应用现场；
- 模块与 class 代码默认处于严格模式，默认绑定直接给 undefined——本篇示例因此在 Node 与浏览器两端表现一致；崩得早比悄悄错好。

## 11. 小练习

预测题（5 分钟，先写答案再运行）：

```javascript
'use strict';
const a = { name: '甲', hello() { console.log(this.name); } };
const b = { name: '乙', hello: a.hello };

a.hello();
b.hello();
const h = a.hello;
h();
```

三行三种绑定：分别预测，注意 hello 定义在 a 身上、却挂在 b 身上被调用。

对照（先写再看）：

```text
甲
乙
TypeError: Cannot read properties of undefined (reading 'name')
```

第一行隐式绑定看点号前的 a；第二行还是隐式绑定，点号前是 b——定义在哪无关紧要；第三行摘下来独立调用，默认绑定，严格模式下崩。

修改题（10 分钟）：把第 9 节错误一的例子改成三种不丢 this 的写法并各自验证：箭头包装、bind、以及先包一层再存进变量（`const show = () => player.showLevel(); setTimeout(show, 1000);`）。验收：三种都输出 `小明 等级 7`。

修 Bug 题（15 分钟）：下面的代码想给榜上每位玩家打上榜单名，运行真实报错。按三步定位并修复：

```javascript
'use strict';
const board = {
  title: '本周榜',
  names: ['小明', '阿花'],
  show() {
    this.names.forEach(function (name) {
      console.log(this.title + '：' + name);
    });
  },
};
board.show();
```

真实报错：

```text
TypeError: Cannot read properties of undefined (reading 'title')
```

提示：forEach 的回调是普通 function，它的 this 是谁？修复后预期输出 `本周榜：小明` 与 `本周榜：阿花` 两行。

挑战题（半小时，不给代码）：写 `myBind(fn, ctx)`，返回一个新函数，调用时以 ctx 作为 this 执行 fn。验收断言：

```javascript
function who() { return this.name; }
const sayMing = myBind(who, { name: '小明' });
const sayHua = myBind(who, { name: '阿花' });
console.assert(sayMing() === '小明', '应绑定到小明');
console.assert(sayHua() === '阿花', '应绑定到阿花');
```

提示分两级：「提示」返回值是一个函数，函数体里用 call；「展开」要做的只是把 fn 和 ctx 关进同一个闭包——080 篇 createCounter 的同款结构。

## 12. 与之前和之后的知识的关系

- 往前：[函数、作用域与闭包](/javascript/080-FunctionScopeClosure) 的闭包与箭头函数在本篇完成对照——闭包记变量，箭头函数记 this；[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 的回调一旦用到 this，普通函数与箭头函数的差别立刻现形；
- 往后：[高阶函数](/javascript/150-HigherOrderFunction) 大量传递函数，「递出去就 bind」从本篇起成为纪律；[柯里化与偏函数](/javascript/170-CurryAndFunctionComposition) 把 bind 的预填参数玩成体系；[原型与继承](/javascript/180-JavaScriptPrototypeInheritance) 与 [原型链与 class](/javascript/190-PrototypeChainClassEssence) 里，new 绑定与 class 方法的 this 全面登场。

## 13. 官方文档

- MDN this：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/this
- Function.prototype.bind（call 与 apply 在同目录）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
- 箭头函数：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/Arrow_functions
- 严格模式：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Strict_mode

## 14. 自我检查

- 能不看资料按顺序说出四条规则，并对 `obj.fn()`、`fn()`、`new Fn()`、`fn.call(obj)` 四种调用各预测 this；
- 能解释 `const h = obj.fn; h()` 为什么丢 this，并给出两种修复；
- 能说出箭头函数 this 的来历，并解释 call 为什么对它无效；
- 拿到 `Cannot read properties of undefined (reading 'xxx')`，能想到「this 丢失」这一类嫌疑，并插入 `console.log(this)` 验证；
- 能用一句话说清 this 与闭包的分工。

## 本章总结

this 是每次调用时由调用方式决定的隐藏参数：独立调用落默认绑定（严格模式 undefined），点号调用落隐式绑定，new 调用落新对象，call/apply/bind 亲手指定落显式绑定；判定从 new 到显式到隐式到默认，特殊的优先。箭头函数是唯一例外——this 在定义处按词法定死，四条规则与 call/bind 一律无效，需要外层 this 的回调里它是默认选择。方法被摘下来递给事件、定时器或数组方法就会丢 this，修复靠 bind 或箭头包装。报错 `Cannot read properties of undefined (reading 'xxx')` 有一类根因正是 this 丢失：先 `console.log(this)` 验明正身，再回调用点看绑定。最后记分工：闭包管变量从哪来，this 管这次调用算谁的。

## 下一步

进入 [高阶函数](/javascript/150-HigherOrderFunction)：把「收函数的函数」从数组方法推广开，自己动手写 map、filter 的同类——函数作为值的完全体。
