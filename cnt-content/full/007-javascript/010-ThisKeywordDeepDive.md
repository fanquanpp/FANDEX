---
order: 100
title: this 关键字详解
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 默认/隐式/显式/new/箭头四加一：this 指向的完整判定规则。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'javascript/008-FunctionScopeClosure'
  - 'javascript/007-ObjectArray'
  - 'javascript/019-PrototypeChainClassEssence'
prerequisites:
  - 'javascript/008-FunctionScopeClosure'
---

# this 关键字详解

`this` 是 JavaScript 中最容易被误读的机制：它既不指向"定义函数时所在的对象"，也不指向"函数自身"，而是在**每次函数被调用时**由调用方式动态决定的一个隐式参数。本文以虚拟歌手音乐平台为背景，把五条绑定规则与优先级、箭头函数的词法 `this`、call/apply/bind 的差异、回调丢失 `this` 的修复方案以及严格模式行为一次讲清，并给出可直接运行的判定流程。

## 前置知识

- [函数、作用域与闭包](/module/javascript/008-FunctionScopeClosure)：`this` 的判定建立在函数调用与执行上下文之上。
- [对象与数组](/module/javascript/007-ObjectArray)：隐式绑定发生在对象方法的调用形态上。
- [原型链与类的本质](/module/javascript/019-PrototypeChainClassEssence)：`new` 绑定与类方法中的 `this` 依赖原型机制。

## 学习目标

- 能按"默认、隐式、显式、new、箭头"的顺序完整判定一次调用中的 `this` 指向。
- 能解释箭头函数 `this` 的词法特性，并说明它为何不能被 call/bind 改写。
- 能区分 call、apply、bind 三者在传参方式与生效时机上的差异。
- 能识别"方法被当作回调传递后丢失 this"的场景，并给出至少两种修复方案。
- 能解释严格模式下函数内部 `this` 为 `undefined` 的原因与全局污染风险。

## 一、this 的本质：调用时才确定的动态绑定

可以把 `this` 理解为函数的一个隐藏参数：函数定义时它尚未绑定任何对象，直到某次调用发生，引擎才根据"这次调用是怎么发起的"来填充它。同一个函数被不同的调用方触发，`this` 就完全不同。这正是"动态作用域"式的行为，与词法作用域（变量按定义位置查找）相反。

```javascript
// 同一个函数，两次调用产生两个不同的 this
function sing() {
  console.log(`${this.name} 正在演唱《${this.song}》`);
}

const miku = { name: '初音未来', song: 'World is Mine', sing };
const teto = { name: '重音テト', song: '吉原ラメント', sing };

miku.sing(); // 初音未来 正在演唱《World is Mine》
teto.sing(); // 重音テト 正在演唱《吉原ラメント》

// 方法引用脱离对象后单独调用：绑定被重置
const lost = miku.sing;
lost(); // undefined 正在演唱《...》（非严格模式下 this 指向全局对象）
```

要点是看**调用点**（call-site）：`miku.sing()` 的调用点是"通过对象 miku 的属性触发"，于是 `this` 指向 miku；`lost()` 的调用点是一个赤裸的函数调用，`this` 与任何对象无关。判定 `this` 的全部工作，就是给调用点归类。

从工程视角看，`this` 的存在让"行为"得以在对象之间复用：`sing` 函数只需定义一次，就可以被任何具备 `name` 与 `song` 属性的对象挂载调用，不必为每个歌姬复制一份方法。它的代价是每次调用都隐含一次绑定判定——这正是下面五条规则存在的意义：把"这次调用是谁发起的"变成一套可推理、可验证的判定流程。

## 二、五条绑定规则与优先级

引擎按固定优先级为调用点选择绑定规则，从高到低依次是：`new` 绑定、显式绑定、隐式绑定、默认绑定；箭头函数独立于这四者，采用词法绑定。

| 优先级 | 规则 | 触发形态 | this 指向 |
| --- | --- | --- | --- |
| 1 | new 绑定 | `new Fn()` | 新创建的实例对象 |
| 2 | 显式绑定 | `call` / `apply` / `bind` | 指定的第一个参数 |
| 3 | 隐式绑定 | `obj.fn()` | 调用点紧邻的对象 obj |
| 4 | 默认绑定 | 独立调用 `fn()` | 非严格模式为全局对象，严格模式为 undefined |
| 特殊 | 词法绑定 | 箭头函数 | 定义处外层作用域的 this |

```javascript
function probe() {
  'use strict';
  console.log(this);
}

const stage = { main: probe };

probe();                            // 规则四：默认绑定 -> undefined（严格模式）
stage.main();                       // 规则三：隐式绑定 -> stage
stage.main.call('Magical Mirai');   // 规则二：显式绑定 -> 'Magical Mirai'

function Concert(date) {
  this.date = date;                 // 规则一：new 绑定 -> 新实例
}
const mirai = new Concert('2026-09-09');
console.log(mirai.date); // '2026-09-09'
```

优先级并不是口诀，而是可以被代码验证的事实。下面这段代码证明 `new` 绑定能压过 `bind` 的显式绑定：

```javascript
// new 绑定优先于显式绑定
function Ticket(price) {
  this.price = price;               // new 调用时，this 是新对象
}
const tagged = Ticket.bind({ price: 0 }); // 显式绑定了一个"假"对象
const ticket = new tagged(660);

console.log(ticket.price);              // 660：新对象的属性，bind 的 this 被覆盖
console.log(tagged.price === undefined); // true：被 bind 的对象未被污染
```

工程上推荐按四步口诀判定：第一步看调用点是否是 `new` 调用；第二步看函数是否被 call、apply 或 bind 显式绑定；第三步看调用点是否是"对象.方法"的形态；三步都不成立则落入默认绑定。若函数本身是箭头函数，则跳过全部四步，直接沿词法作用域向外层找 `this`。把这套顺序背熟，绝大多数 `this` 问题都能在读代码阶段排除。

另外注意：如果构造函数显式 `return` 一个对象，`new` 表达式的结果将是那个对象，`this` 上挂的属性会被丢弃；返回原始值则被忽略，仍然得到新实例。

## 三、箭头函数的词法 this

箭头函数没有自己的 `this`、`arguments` 与 `prototype`。它的 `this` 在**定义时**由外层最近的普通函数（或全局/模块作用域）决定，之后永远不变：call、apply、bind 对它无效，把它挂在对象上也改变不了指向。

```javascript
const fanClub = {
  name: '39 应援团',
  members: ['镜音铃', '镜音连'],
  // 普通方法：this 由调用方决定，这里指向 fanClub
  banner() {
    // 箭头函数定义在 banner 内部，词法捕获 banner 的 this
    return this.members.map((m) => `${this.name} · ${m}`);
  },
  // 反例：顶层箭头方法没有自己的 this，捕获的是模块/全局作用域
  motto: () => `${this?.name} 应援不设限`,
};

console.log(fanClub.banner().join('、')); // 39 应援团 · 镜音铃、39 应援团 · 镜音连
console.log(fanClub.motto()); // undefined 应援不设限（this 不是 fanClub）
```

箭头函数真正的用武之地是"回调里要用外层 this"的场景，例如定时器更新倒计时状态：

```javascript
const timer = {
  seconds: 10,
  start() {
    // start 是普通方法，this 指向 timer；
    // 内层箭头函数词法捕获这个 this，因此无论谁触发回调，都指向 timer
    setInterval(() => {
      this.seconds -= 1;
      console.log(`距开票还剩 ${this.seconds} 秒`);
    }, 1000);
  },
};
timer.start();
```

判断准则可以概括为一句话：**需要"谁调用指向谁"就用普通函数，需要"定义处是谁就是谁"就用箭头函数**。

## 四、call、apply、bind 的差异

三者都属于显式绑定，但分工不同：

- `call`：立即调用，参数从第二个起逐个列出；
- `apply`：立即调用，参数以数组（或类数组）一次性传入；
- `bind`：不立即调用，返回一个 `this` 与部分参数已永久固化的新函数。

```javascript
function announce(venue, date, tone) {
  console.log(`【${tone}】${this.singer} @ ${venue}（${date}）`);
}

const live = { singer: '初音未来' };

announce.call(live, '东京巨蛋', '9 月 9 日', '开票');          // 逐个传参，立即执行
announce.apply(live, ['上海梅赛德斯', '10 月 1 日', '加场']);   // 数组传参，立即执行

const later = announce.bind(live, '线上直播', '12 月 31 日');   // 预绑定 this 与部分参数
later('跨年'); // 【跨年】初音未来 @ 线上直播（12 月 31 日）
```

选择建议：参数就在手上且数量动态时用 `apply`；只是换个 `this` 立即执行用 `call`；要把方法"提前绑定好再交给别人"（事件回调、定时器）用 `bind`。`bind` 的绑定是一次性的：对 `bind` 的结果再次 `bind` 或 `call`，都无法改变第一次绑定的 `this`，新函数的 `this` 已经写死。

`bind` 还有一个常被低估的用法——偏函数应用（partial application）：预先固定前几个参数，生成一个"专用版"回调，日志埋点场景尤其好用。

```javascript
// bind 的偏函数应用：固定部分参数，生成专用回调
function logAction(actor, action) {
  console.log(`[${this.tag}] ${actor} ${action}`);
}
const purchaseLog = logAction.bind({ tag: '购票系统' }, '粉丝');
purchaseLog('提交了订单'); // [购票系统] 粉丝 提交了订单
purchaseLog('支付成功');   // [购票系统] 粉丝 支付成功
```

## 五、回调丢失 this 与修复

隐式绑定只认调用点。一个方法只要被"摘下来"当回调传走——交给 `setTimeout`、事件监听器、数组方法——它就变成了独立函数调用，`this` 随之丢失。这在购票倒计时这类组件逻辑里非常常见：

```javascript
const countdown = {
  seconds: 3,
  start() {
    // 反例：tick 被当作独立函数调用，this 不再是 countdown
    // setInterval(this.tick, 1000); // 每秒输出 NaN

    // 修复一：bind 返回绑定了 this 的新函数
    setInterval(this.tick.bind(this), 1000);

    // 修复二：箭头函数包装，this 词法继承自 start
    // setInterval(() => this.tick(), 1000);
  },
  tick() {
    this.seconds -= 1;
    console.log(this.seconds > 0 ? `${this.seconds} 秒后开票` : '开票！');
  },
};
countdown.start(); // 依次输出：2 秒后开票、1 秒后开票、开票！
```

在 class 中同样存在这个问题：把实例方法注册为 DOM 事件监听器时，触发方是元素节点而非实例。最干净的修法是使用类字段箭头函数，让绑定在实例化时一次完成：

```javascript
class TicketPanel {
  sold = 0;
  // 类字段箭头函数：实例化时即绑定 this，交给任何回调都不会丢
  refresh = () => {
    console.log(`当前已售 ${this.sold} 张`);
  };
  mount() {
    document.addEventListener('click', this.refresh); // this 始终是当前实例
  }
}
```

## 六、严格模式与全局污染

默认绑定在不同模式下指向不同：非严格模式下是全局对象（浏览器中的 `window`），严格模式下是 `undefined`。前者的代价是"全局污染"——函数内对 `this` 的赋值会意外改写全局属性；后者则让误用尽早暴露为错误。

```javascript
// 非严格模式：默认绑定指向全局对象，容易造成全局污染
function sloppy() {
  this.accidental = '污染全局'; // 等价于 globalThis.accidental = ...
}
sloppy();
console.log(globalThis.accidental); // '污染全局'

// 严格模式：默认绑定下 this 是 undefined，误用立即抛错
function strict() {
  'use strict';
  console.log(this); // undefined
  // this.name = 'x'; // TypeError: Cannot set properties of undefined
}
strict();
```

类体（`class` 内部）自动处于严格模式，无法关闭。因此在 class 中独立调用方法（例如把方法解构出来再调用）得到的 `this` 是 `undefined`，访问属性会直接抛 `TypeError`。这其实是一种保护：与其让错误悄悄写进全局，不如在开发阶段就崩给你看。工程上应始终启用模块与严格模式，让默认绑定的"危险分支"不复存在。

模块体系的差异也值得一提：ESM 模块的顶层 `this` 是 `undefined`，而 Node.js 的 CommonJS 模块顶层 `this` 指向 `module.exports`。同一段顶层代码在两种模块体系下行为不同，把旧脚本迁移到 ESM 时，凡是依赖"顶层 this 指向某对象"的写法都需要重写。

## 易错点与最佳实践

1. **解构方法后调用导致 this 丢失**。错误代码与修正：

```javascript
const { banner } = fanClub;
// banner(); // 反例：this 不再是 fanClub，属性读取失败

// 修正一：保持"对象.方法"的调用形态
fanClub.banner();

// 修正二：确实需要自由传递时，提前 bind 固定 this
const boundBanner = fanClub.banner.bind(fanClub);
boundBanner(); // OK
```

2. **用箭头函数定义对象方法或原型方法**。箭头函数捕获的是定义处作用域，无法指向"未来的调用者"，实例创建后调用只会拿到 `undefined`。修正：对象方法与类方法使用普通函数语法（方法简写），只在方法体内的回调里使用箭头函数。

3. **试图用 call/bind 改写箭头函数的 this**。箭头函数的 `this` 在定义时已锁定，`arrow.call(obj)` 的第一个参数会被静默忽略。若需要可变 `this`，改用普通函数。

4. **回调注册时遗漏绑定，错误只在线上偶发出现**。凡是把方法传给第三方 API（`addEventListener`、`Promise.then`、数组方法），都要自查一次调用点：要么 `bind`，要么包一层箭头函数，要么定义为类字段箭头函数。

5. **依赖非严格模式的默认绑定**。非严格模式下独立调用中 `this` 指向全局对象，一旦与严格模式的模块代码混用，行为将难以预测。始终使用 ESM 或文件顶部声明 `'use strict'`。

## 本篇小结

- `this` 在调用时确定，判定只看调用点：`new` 绑定、显式绑定、隐式绑定、默认绑定按优先级依次匹配。
- 箭头函数没有自己的 `this`，词法捕获外层作用域，call/apply/bind 对它无效；需要动态 `this` 的方法不要写成箭头函数。
- `call`、`apply` 立即执行且参数形式不同；`bind` 返回永久绑定的新函数，常用于回调防丢。
- 方法被解构或当作回调传递会丢失 `this`，修复手段有 `bind`、箭头包装与类字段箭头函数三种。
- 严格模式下默认绑定的 `this` 是 `undefined`，类体自动严格，误用会尽早报错而非污染全局。

## 动手实践

1. **实现一个 `myBind`**：不使用原生 `bind`，仅用 `call`/`apply` 实现等价函数，要求支持 `new myBind(...)` 时新对象优先。思路：返回一个闭包函数，内部区分"普通调用"（`apply` 固定 this）与"new 调用"（用一个中间构造函数继承原函数原型，使 `this instanceof` 判断生效）。

2. **判定练习**：写出下面代码的输出再运行验证——`const a = { name: 'Luka', say() { console.log(this.name); } }; const b = a.say; b(); const c = b.bind(a); c(); new (a.say)();`。思路：逐个调用点套用五条规则，注意 `new (a.say)()` 中 `this.name` 是 `undefined` 而不是报错。

3. **应援团签到器**：用 class 实现 `FanClub`，包含 `count` 字段与 `checkIn` 方法，把 `checkIn` 注册为按钮点击回调而不丢 `this`。思路：将 `checkIn` 定义为类字段箭头函数，或构造函数中执行 `this.checkIn = this.checkIn.bind(this)`，两种方案对比内存占用与可读性。
