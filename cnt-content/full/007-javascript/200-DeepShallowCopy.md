---
order: 200
title: 深拷贝与浅拷贝：你复制的是门牌号，还是房子
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 以「草稿快照被原文连坐修改」为问题主线，讲透值语义与引用语义、赋值/浅拷贝/深拷贝三层区别，亲手用 structuredClone 与 WeakMap 标记法写支持循环引用的深拷贝，附 JSON 静默变形、freeze 只冻一层、原型链丢失等陷阱实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'javascript/070-ObjectArray'
  - 'javascript/210-ObjectStaticMethods'
  - 'javascript/630-ImmutableDataStructures'
  - 'javascript/670-WebWorkersMultithreading'
prerequisites:
  - 'javascript/070-ObjectArray'
---

## 前置知识

- 已完成 [对象与数组](/javascript/070-ObjectArray)：会读写对象属性、遍历数组；
- 见过 `const a = { ...b }` 这种写法即可，展开运算符的细节本文现场讲。

本文是"每个项目迟早撞上"的问题：两个变量明明"复制"开了，改一个另一个却跟着变。

## 学习目标

读完本文你将能够：

1. 用"门牌号与房子"解释值类型与引用类型，预测赋值、浅拷贝、深拷贝三种操作后"改这边、那边动不动"；
2. 区分浅拷贝的三种常用写法（展开运算符、`Object.assign`、数组拷贝方法）及其共同局限——只复制第一层；
3. 用 `structuredClone` 完成日常深拷贝，并背出它的三个边界（函数会抛错、原型链会丢、getter/setter 会丢）；
4. 识别 JSON 序列化拷贝的五类静默变形，判断它什么时候还能用；
5. 亲手实现一个支持循环引用的深拷贝函数（WeakMap 标记法），并解释为什么必须用它。

预计 45 到 60 分钟，含 3 个动手实验与 4 道练习。

## 1. 你现在要解决什么问题

文档站的编辑器需要一个"撤销"功能的第一步：用户每次保存草稿前，先留一份快照，出问题时能回滚。你写了这样的代码：

```javascript
const draft = {
  title: '事件循环入门',
  meta: { words: 2600, tags: ['async', 'basic'] },
};

// 保存前拍快照
const snapshot = draft;

// 用户继续编辑
draft.title = '事件循环入门（修订版）';
draft.meta.words = 2680;
draft.meta.tags.push('advanced');

// 三天后想回滚，读快照
console.log(snapshot.title);      // 事件循环入门（修订版）
console.log(snapshot.meta.words); // 2680
```

快照和草稿**同时变了**——`snapshot = draft` 根本没有产生第二份数据。这是每个 JS 工程师必经的第一课：**对象变量里存的不是数据本身，而是指向数据的"门牌号"**。赋值只是把门牌号抄了一份，房子还是同一栋。

那你可能已经知道补救：用展开运算符"复制"一份。改一下试试：

```javascript
const snapshot = { ...draft };
draft.title = '标题又改了';
draft.meta.words = 2700;

console.log(snapshot.title);      // 事件循环入门（修订版）——第一层，守住了
console.log(snapshot.meta.words); // 2700 ——嵌套层，失守了
```

第一层守住了，嵌套的第二层照样失守。到这一步，你就站在本文要解决的正题上：**怎样才算真正"复制了一份房子"**。

## 2. 先不要看解释，先试试看

在控制台逐行敲，每行先预测 `true` 还是 `false`：

```javascript
const a = { inner: { n: 1 } };

const b = a;                  // 赋值：抄门牌号
const c = { ...a };           // 浅拷贝：复制第一层
const d = structuredClone(a); // 深拷贝：整栋楼复制

a.inner.n = 99;

console.log(a.inner.n === b.inner.n);   // ?
console.log(a.inner.n === c.inner.n);   // ?
console.log(a.inner.n === d.inner.n);   // ?

console.log(a === b);   // ?
console.log(a === c);   // ?
console.log(a === d);   // ?
```

结果分别是 `true, true, false` 和 `false, false, false`。这六行就是全部理论：

| 操作 | 复制了什么 | 第一层联动？ | 嵌套层联动？ |
| --- | --- | --- | --- |
| 赋值 `b = a` | 门牌号 | 联动 | 联动 |
| 浅拷贝 `{ ...a }` | 第一层的值；嵌套层仍是门牌号 | 不联动 | 联动 |
| 深拷贝 `structuredClone(a)` | 整个引用图 | 不联动 | 不联动 |

补一个判等事实：对象之间的 `===` 比的是**门牌号**（同一栋房子才相等），跟内容毫无关系——所以 `a === c` 是 `false`，哪怕两个对象此刻内容一模一样。这也解释了为什么"用 `===` 判断两个对象是否相等"在 JS 里从来不是你以为的那件事。

## 3. 心智模型：七种原始值装在盒子里，对象只给门牌号

JavaScript 把数据分成两族：

- **原始值**（number、string、boolean、null、undefined、symbol、bigint）：赋值、传参、比较都是"把盒子里的值抄一份"。`let x = 42; let y = x; y = 43;` 后 `x` 还是 42；
- **引用类型**（对象、数组、函数、Map、Set……）：变量里存的是门牌号。`const a = b` 之后，`a` 和 `b` 指着同一栋房子，从任何一扇门进去改家具，两边看到的是同一件。

浅拷贝的准确定义由此而来：**沿着门牌号走一层，把第一层的每样东西照抄**——原始值抄的是盒子，对象抄的还是门牌号。所以浅拷贝"第一层独立、深层联动"。深拷贝则是**递归地复制整个引用图**：遇到门牌号就跟着进去，把里面的东西也照抄，直到全是原始值为止。

这带来一个隐藏难题：如果房子里有一条走廊绕回房子本身呢？

```javascript
const root = { name: 'root' };
root.self = root;          // 循环引用
```

天真的"递归到底"会沿着 `root.self` 永远走下去直到爆栈（160 篇的爆栈知识在这里重逢）。这是第 4 节自定义深拷贝要解决的核心问题。

## 4. 动手：四种拷贝方法各就各位

### 4.1 浅拷贝三连

```javascript
const obj = { a: 1, nested: { b: 2 } };

const s1 = { ...obj };                    // 展开运算符，最常用
const s2 = Object.assign({}, obj);        // 老项目常见，效果相同
const arr = [1, [2, 3]];
const s3 = arr.slice();                   // 数组浅拷贝
const s4 = [...arr];                      // 数组展开，效果相同
```

三个都是浅拷贝，可互换。ES2023 又补了一批"返回新数组"的改动方法——`toSorted`、`toReversed`、`with`、`toSpliced`，它们天然只做浅拷贝就产出新数组，改历史数组时优先用它们而不是先拷再改。

### 4.2 structuredClone：日常深拷贝的首选

Node 17+ 与所有现代浏览器都内置了 `structuredClone`，它实现的是 HTML 规范的**结构化克隆算法**：

```javascript
const src = {
  when: new Date('2026-09-28'),
  tags: new Set(['a', 'b']),
  lookup: new Map([['k', 1]]),
  self: null,
};
src.self = src;                            // 循环引用？没问题

const copy = structuredClone(src);
console.log(copy.lookup instanceof Map);   // true，Map 类型保留
console.log(copy.self === copy);           // true，循环结构被正确重建
console.log(copy.when instanceof Date);    // true
```

优点先行：支持循环引用、保留 Date/Map/Set/RegExp/ArrayBuffer 等内置类型。但它有三条硬边界，用之前必须知道：

```javascript
const user = {
  name: '阿七',
  greet() { return `hi ${this.name}`; },      // 函数
  get nameUpper() { return this.name.toUpperCase(); },  // getter
};
Object.defineProperty(user, 'id', { value: 7 });        // 不可枚举属性

const c = structuredClone(user);
console.log(c.greet);        // undefined —— 函数直接丢
console.log(c.nameUpper);    // undefined —— getter 丢，只剩普通值
console.log(c.id);           // undefined —— 不可枚举属性丢
```

三条边界一句话：**structuredClone 只克隆"数据"，不克隆"行为与元信息"**——函数会抛 `DataCloneError`（在数据里直接含函数时）或丢失，原型链退化为普通 Object，getter/setter 变成静态值。含方法的对象、类实例，它不适合。

### 4.3 JSON 序列化：能用但会静默变形

老项目里最常见的 `JSON.parse(JSON.stringify(x))`，能力比 structuredClone 弱一截，而且它**不报错，悄悄改变数据**：

```javascript
const src = {
  when: new Date('2026-09-28'),      // Date
  miss: undefined,                    // undefined
  fn: () => 1,                        // 函数
  bad: NaN,                           // NaN
  big: 9007199254740993n,             // BigInt
  tags: new Set(['a']),               // Set
};
const out = JSON.parse(JSON.stringify(src));
console.log(out);
// { when: '2026-09-28T00:00:00.000Z', bad: null }
// miss 与 fn 整个消失，big 直接 TypeError 抛错，tags 变成 {}
```

| 原值 | JSON 往返后 | 危险等级 |
| --- | --- | --- |
| `undefined`、函数、Symbol | 键被删除 | 高：数据悄悄缺失 |
| `Date` | ISO 字符串 | 中：`instanceof Date` 变 false |
| `NaN`、`Infinity` | `null` | 高：数值语义破坏 |
| `Map`、`Set` | `{}` | 高：整块丢失 |
| `BigInt` | 直接抛 TypeError | 低（至少会喊） |
| 循环引用 | 直接抛 TypeError | 低（至少会喊） |

结论：JSON 方案只配处理"纯数据、将来要发 JSON 接口"的对象（此时变形反而无害）；其余场景一律 structuredClone。

### 4.4 自定义深拷贝：WeakMap 标记法

面试高频、阅读源码必备。需求：克隆普通对象与数组，支持循环引用。核心两个动作——**递归复制**，加**"见过的对象记在小本本上"**：

```javascript
function deepClone(value, seen = new WeakMap()) {
  // 原始值与函数：直接返回（函数不复制）
  if (value === null || typeof value !== 'object') return value;

  // 已克隆过：直接还门牌号，斩断循环
  if (seen.has(value)) return seen.get(value);

  const clone = Array.isArray(value) ? [] : {};
  seen.set(value, clone);            // 先登记"我正在克隆它"

  for (const key of Reflect.ownKeys(value)) {
    clone[key] = deepClone(value[key], seen);
  }
  return clone;
}

// 验证循环引用
const loop = { name: 'a' };
loop.self = loop;
const copy = deepClone(loop);
console.log(copy.self === copy);          // true
console.log(copy !== loop);               // true，是独立副本
```

两个关键点值得背下来：

1. **WeakMap 的键是"原对象"，值是"对应副本"**。递归再遇到同一个对象时查表直接返回副本，循环被斩断；用 `WeakMap` 而不是 `Map`，是因为键是对象且无强引用，原对象被垃圾回收时条目自动消失（机制见 [内存管理与垃圾回收](/javascript/350-MemoryManagementAndGarbageCollection)）；
2. **先登记、后递归**（`seen.set` 放在循环之前）。放在之后，递归进入 `root.self` 时表里还没有 root，会再开一轮克隆直到爆栈——这是这个算法最常见的写错位置。

生产中不必手写：`structuredClone` 覆盖 90% 场景，需要保留方法与原型时用 lodash 的 `cloneDeep`，React 项目里状态更新推荐 Immer（写时复制：改动按需产生新对象，避免整棵树克隆的性能开销）。

## 5. 修改实验

以下都在前文代码基础上改，每个先预测再运行。

实验一：把 `deepClone` 里的 `seen.set(value, clone)` 挪到 for 循环之后，用 `loop` 验证会发生什么。（提示：RangeError，原因见第 4.4 节。）

实验二：`Object.freeze` 只冻一层。`const frozen = Object.freeze({ meta: { tags: [] } })`，然后 `frozen.meta.tags.push('x')`，预测是否报错、`tags` 是否变了。（提示：冻结的是 `meta` 这个门牌号的指向，不是 `tags` 数组的内容。）

实验三：`structuredClone` 一个类实例。定义 `class Point { constructor(x) { this.x = x; } double() { return this.x * 2; } }`，克隆后调用 `copy.double()`，观察报什么错、为什么。（提示：原型链丢了，`double` 不在克隆对象的原型上。）

## 6. 常见错误与调试实录

**错误一："深拷贝过了，怎么还是联动"——拷贝发生在错误的层。**

```javascript
const list = [{ id: 1 }, { id: 2 }];
const copy = [...list];        // 本意：复制列表
copy[0].id = 99;
console.log(list[0].id);       // 99 —— 失守
```

症状：列表克隆了，元素却还是共用的。定位三步：读现象——联动发生在"元素的属性"这一层，比克隆操作低一层；验证——`copy[0] === list[0]` 为 `true`，浅拷贝抄的是元素门牌号；结论——数组展开/`slice` 只负责数组这一层，元素是对象就照样联动。修法：`structuredClone(list)`，或逐元素 `{ ...item }`。

**错误二：`JSON.parse(JSON.stringify())` 吃掉了 undefined 字段。**

```javascript
const config = { retries: undefined, timeout: 3000 };
const saved = JSON.parse(JSON.stringify(config));
console.log('retries' in saved);   // false —— 键没了
```

症状：对象经过一次"保存再读取"，可选字段从"存在但为 undefined"变成"不存在"。后续 `Object.keys` 长度对不上、`in` 判断失效。定位：对比克隆前后 `Object.keys` 的差集，消失的键的值多为 undefined 或函数。修法：换 `structuredClone`；确实要走 JSON（比如存 localStorage）就在设计上禁止"undefined 当有意义的值"。

**错误三：把 `Object.freeze` 当深冻结用。**

```javascript
const state = Object.freeze({
  filters: { category: 'basic' },
});
state.filters.category = 'all';   // 不报错，改成功了
```

症状：顶层属性确实改不动（静默失败，严格模式报 TypeError），嵌套对象却随便改。原因：`freeze` 是浅冻结。修法：需要"整棵树不可变"时递归 `Object.freeze` 每一层，或直接用 Immutable.js 这类持久化数据结构（见 [不可变数据结构](/javascript/630-ImmutableDataStructures)）。顺带记住：**默认情况下对冻结对象赋值不报错**，非严格模式静默失败——"没报错"不等于"改成功"。

## 7. 实际项目中的使用场景

- React 状态更新的不可变范式：`setDocs([...docs])` 只换数组门牌号，React 才会重新渲染；深层改动要么整层展开重建，要么上 Immer。写错的最常见症状是"状态明明改了，界面不刷新"；
- 撤销/重做（本文开头的快照）：每次操作前 `structuredClone` 一份压栈，回滚时出栈还原；
- Web Workers 与 postMessage：主线程与 worker 之间传对象用的**正是结构化克隆算法**——这解释了为什么传过去的对象在另一边改了，这边不受影响，也解释了函数传不过去会抛 DataCloneError（见 [Web Workers 多线程](/javascript/670-WebWorkersMultithreading)）；
- 测试夹具：给每个用例发一份独立配置副本 `structuredClone(baseConfig)`，用例之间互不污染——比手写"重置函数"可靠得多。

## 8. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
const a = { list: [1, 2] };
const b = structuredClone(a);
const c = { ...a };

a.list.push(3);
console.log(b.list.length, c.list.length);
```

答案：`2 3`。深拷贝的 b 不受影响；浅拷贝的 c 与 a 共享同一个数组。

修改题（10 分钟）：给第 4.4 节的 `deepClone` 加上 Date 支持——克隆出的对象里 `instanceof Date` 仍为 true。验收：`deepClone({ t: new Date() }).t instanceof Date` 为 true。（提示：`value instanceof Date` 时返回 `new Date(value.getTime())`。）

修 Bug 题（15 分钟）：下面的撤销栈实现有 bug，真实症状是：点三次撤销，界面纹丝不动。找出根因并修复：

```javascript
const history = [];
let current = { text: 'v1', meta: { chars: 2 } };

function save() {
  history.push(current);         // 想存快照
}
function undo() {
  current = history.pop() ?? current;
}

current.text = 'v2';
save();
current.text = 'v3';
save();
undo();
console.log(current.text);        // 期望 'v2'，实际 'v3'
```

提示：`push(current)` 压进去的是门牌号，current 后来改了内容，栈里的"快照"跟着变。修法：`history.push(structuredClone(current))`。

挑战题（30 分钟，脱离示例）：实现 `patchFreeze(obj)`：递归冻结整棵对象树，返回原对象（不是副本）。要求处理数组，且对已经冻结的部分不重复工作。验收：

```javascript
const state = patchFreeze({ a: { b: [1, 2] } });
console.log(Object.isFrozen(state));
console.log(Object.isFrozen(state.a));
console.log(Object.isFrozen(state.a.b));
// 三个都为 true；state.a.b.push(3) 在严格模式下抛 TypeError
```

提示（思路方向）：递归 + `Object.isFrozen` 剪枝 + 先冻结自身再遍历子级均可。展开（关键 API）：`Object.freeze`、`Object.values` 或 `Reflect.ownKeys`、`Object.isFrozen`。

## 9. 与之前和之后的知识的关系

- 往前：070 篇建立"对象是引用"的第一印象，本文把它展开成"赋值/浅拷贝/深拷贝"三层操作表；160 篇的"问题缩小一号"在 `deepClone` 里就是"克隆嵌套层"；
- 往后：[Object 静态方法](/javascript/210-ObjectStaticMethods) 提供 `freeze`、`defineProperty` 等拷贝之外的另一手控制；[不可变数据结构](/javascript/630-ImmutableDataStructures) 给出"根本不拷贝、而是共享结构"的第三条路；[Generator 函数](/javascript/320-GeneratorFunctions) 之前，建议先确保本文的 `deepClone` 能独立写出。

## 10. 官方文档

- MDN structuredClone：https://developer.mozilla.org/zh-CN/docs/Web/API/Window/structuredClone
- HTML 规范·结构化克隆算法（可克隆类型表）：https://html.spec.whatwg.org/multipage/structured-data.html
- MDN 展开运算符：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Spread_syntax
- MDN Object.freeze（含浅冻结说明）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze

## 自我检查

- 能不看资料画出"赋值、浅拷贝、深拷贝"三层行为表，并解释对象 `===` 比的是什么；
- 能说出 structuredClone 的三条边界（函数、原型链、getter/setter）与两个优点（循环引用、内置类型）；
- 能背出 JSON 序列化拷贝至少四种静默变形，并判断什么场景下它反而合适；
- 能徒手写出 WeakMap 标记法的 deepClone，并解释"先登记后递归"为什么不能颠倒。

## 本章总结

对象变量存的是门牌号：赋值抄门牌号，浅拷贝只照抄第一层（深层仍联动），深拷贝递归复制整棵引用图。日常深拷贝首选 structuredClone，它处理循环引用与内置类型，但不克隆函数、原型与 getter；JSON 方案会静默删键、变形日期、丢 Map/Set，只配给"本来就要序列化"的纯数据用。手写深拷贝的核心是 WeakMap 标记法：见过的对象记表，先登记后递归，循环引用当场斩断。`Object.freeze` 只冻一层，React 的"改了不刷新"多半是浅拷贝门牌号没换。

## 下一步

进入 [Object 静态方法](/javascript/210-ObjectStaticMethods)：拷贝与冻结只是 Object 工具箱的一角——keys/values/entries 三兄弟、groupBy 分组、hasOwn 判存在，这一整套静态方法是你每天都会摸的扳手，下一篇把它们一次配齐。
