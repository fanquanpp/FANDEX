---
order: 240
title: Object 静态方法：天天要摸的扳手一次配齐
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 以「对象加工的四个日常任务」为主线，一次配齐 keys/values/entries、fromEntries、groupBy、hasOwn、assign、is 六件套，讲透属性描述符与 configurable 单向门，附遍历顺序数字键前置、Object.create(null) 判存在翻车等实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'javascript/200-DeepShallowCopy'
  - 'javascript/190-PrototypeChainClassEssence'
  - 'javascript/220-ES6NewFeatures'
  - 'javascript/330-ProxyAndReflect'
prerequisites:
  - 'javascript/070-ObjectArray'
  - 'javascript/200-DeepShallowCopy'
---

## 前置知识

- 已完成 [对象与数组](/javascript/070-ObjectArray)：会读写属性、会 for-of 与数组方法；
- 已完成 [深拷贝与浅拷贝](/javascript/200-DeepShallowCopy)：知道"赋值抄门牌号"、`Object.freeze` 只冻一层。

Object 静态方法没有一个是"高级知识"——它们是每天都要摸的扳手。本文按真实任务把它们一次配齐，顺手讲清扳手背后的两块底层：属性描述符与遍历顺序。

## 学习目标

读完本文你将能够：

1. 用 keys/values/entries 与 fromEntries 完成"对象与数组互转"的高频加工（过滤、映射、序列化）；
2. 用 `Object.groupBy` 一行完成按字段分组，说出它返回的是"无原型的对象"及其好处；
3. 分清判断"属性存在"的三种方式（in、Object.hasOwn、与 undefined 比较）的边界，避开 Object.create(null) 的翻车现场；
4. 说出 `Object.is` 与 `===` 仅有的两处分歧（NaN、正负零），知道 React 为什么用它做判等；
5. 读懂属性描述符四件套（value/writable、get/set、enumerable、configurable），解释"内置方法为什么遍历不到""configurable 为什么是单向门"；
6. 背出对象键的遍历顺序规则，解释"数字键为什么总排在前面"。

预计 45 到 65 分钟，含 3 个动手实验与 4 道练习。

## 1. 你现在要解决什么问题

文档站后台拿到一批文档数据，产品要三个很普通的加工：

```javascript
const docs = {
  doc1: { title: '事件循环', category: 'async', words: 2600 },
  doc2: { title: '高阶函数', category: 'basic', words: 1900 },
  doc3: { title: '正则表达式', category: 'basic', words: 3300 },
};

// 任务一：统计每个分类的总字数（按字段聚合）
// 任务二：把 ?sort=words&order=desc 这样的查询串转成对象，反向也要能转回去
// 任务三：只保留 words 大于 2000 的键值对（按值过滤对象）
```

三个任务全靠"把对象拆开处理再装回去"。同时你还发现一个怪事：用 `'toString' in docs` 判断"有没有这个键"永远是 true——哪怕对象里根本没有这个键。加工技巧与判断陷阱，本文一起解决。

## 2. 先不要看解释，先试试看

对象与数组的"互转三兄弟"是一切的底座。控制台逐行敲：

```javascript
const doc = { id: 1, title: '事件循环', words: 2600 };

Object.keys(doc);      // ['id', 'title', 'words']      —— 键的数组
Object.values(doc);    // [1, '事件循环', 2600]         —— 值的数组
Object.entries(doc);   // [['id', 1], ['title', '事件循环'], ['words', 2600]]
```

`entries` 把对象变成"键值对数组"——对象一旦变成数组，全部数组方法立刻可用：

```javascript
// 任务三：按值过滤对象
const bigDocs = Object.fromEntries(
  Object.entries(docs).filter(([, d]) => d.words > 2000)
);
console.log(Object.keys(bigDocs));   // ['doc1', 'doc3']
```

`Object.fromEntries` 是 entries 的逆操作：键值对数组装回对象。一拆一装之间，过滤、映射、排序随便做。任务二的查询串互转就是这个形状：

```javascript
const query = 'sort=words&order=desc';

function parseQuery(qs) {
  return Object.fromEntries(
    qs.split('&').map((pair) => pair.split('='))
  );
}
console.log(parseQuery(query));   // { sort: 'words', order: 'desc' }

function toQuery(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}
console.log(toQuery({ sort: 'words', order: 'desc' }));   // 'sort=words&order=desc'
```

任务一的聚合用 220 篇见过的 `Object.groupBy`，配 reduce 求和：

```javascript
const byCategory = Object.groupBy(Object.values(docs), (d) => d.category);
// { async: [doc1 的内容], basic: [doc2, doc3] }

const totals = Object.fromEntries(
  Object.entries(byCategory).map(([cat, list]) => [
    cat,
    list.reduce((sum, d) => sum + d.words, 0),
  ])
);
console.log(totals);   // { async: 2600, basic: 5200 }
```

值得知道的一个细节：**groupBy 返回的对象没有原型**（内部用 Object.create(null) 造的），所以键随便起名都不会撞上 `toString` 这类继承成员——这正好引出第 3 节的判存在话题。

## 3. 判断"属性存在"：三种方式，三种边界

回到 `'toString' in docs` 永远为 true 的怪事。原因：**in 会沿原型链问一圈**，`toString` 继承自 Object.prototype，问谁都在。三种判法各有边界：

```javascript
const obj = { name: '阿七' };

'name' in obj;                  // true —— 含继承属性
Object.hasOwn(obj, 'name');     // true —— 只查自有属性（ES2022）
obj.name !== undefined;         // true —— 但"值恰好是 undefined"时会误判

'toString' in obj;              // true（继承来的也算）
Object.hasOwn(obj, 'toString'); // false（不是自己的）
```

实务规则两条：

1. **默认用 `Object.hasOwn`**。它替代的是老写法 `obj.hasOwnProperty('name')`——老写法有两个坑：对象若用 `Object.create(null)` 创建（没有原型），身上根本没有 hasOwnProperty 方法，一调用就 TypeError；字典类对象若有个键恰好叫 `hasOwnProperty`，调用的就成了那个键的值。`Object.hasOwn(obj, key)` 把方法提到 Object 上，对象长什么样都无所谓；
2. **`key !== undefined` 只适合"值不可能是 undefined"的字段**，能用但别当主力。

顺带补齐原型操作的两件套：`Object.getPrototypeOf(obj)` 读原型、`Object.create(proto)` 指定原型造对象。`Object.setPrototypeOf` 运行时改原型——能做但别做：引擎为"形状固定的原型"做了大量优化，运行时换原型等于逼着它推倒重来，而且代码可读性灾难。要"共享方法"，用 class（190 篇）而不是手动改原型。

## 4. Object.assign 与 Object.is：合并与判等

**assign 合并对象**（220 篇讲过展开运算符的等价写法，这里补它的专属用途）：

```javascript
const defaults = { theme: 'dark', pageSize: 20 };
const userSet = { pageSize: 50 };

const config = Object.assign({}, defaults, userSet);
// { theme: 'dark', pageSize: 50 } —— 后面的覆盖前面的

Object.assign(defaults, userSet);   // 不传首参则会就地改 defaults！
```

两件事记牢：首参 `{}` 决定"新开一份"还是"就地改"；assign 与展开一样是浅合并，嵌套层门牌号照抄（200 篇的规则）。它相对展开的独有优势：能接任意多个源、能接收"类对象"（比如把 Map 之外的可迭代结构处理成对象的老派用法），日常写新代码展开运算符更顺手，读老代码要认识 assign。

**is 精确判等**：与 `===` 只有两处分歧，但每处都咬人：

```javascript
NaN === NaN;          // false —— 全 JS 最著名的坑
Object.is(NaN, NaN);  // true

0 === -0;             // true
Object.is(0, -0);     // false
```

其余情况与 `===` 完全一致（对象仍比门牌号）。它的现实意义：React 的依赖比较、Vue 的响应式触发判断都在内部用类 is 语义——"状态设成 NaN 时界面会不会更新"这类玄学问题，答案就写在 `Object.is` 的行为里。日常业务判等继续用 `===`，写工具库时改用 `Object.is`。

## 5. 属性描述符：属性身上还挂着说明书

每个属性除了"值"，还挂着一份说明书——描述符。看一眼就懂：

```javascript
const doc = { title: '事件循环' };
console.log(Object.getOwnPropertyDescriptor(doc, 'title'));
// { value: '事件循环', writable: true, enumerable: true, configurable: true }
```

四件套含义：

| 字段 | 管什么事 | 关掉会怎样 |
| --- | --- | --- |
| value / get+set | 数据属性（value+writable）或访问器属性（get/set） | 二选一，混用直接 TypeError |
| writable | 能不能重新赋值 | 赋值静默失败（严格模式 TypeError） |
| enumerable | 会不会出现在 keys/entries/for-in | "隐身"：存在但遍历不到 |
| configurable | 能不能删除、能不能改回数据属性、能不能关 writable | **单向门**：设成 false 就再也改不回来 |

两条直接受用的推论：

**推论一："内置方法为什么遍历不到"**——数组方法、toString 这类内置成员的 enumerable 全是 false，所以 `Object.keys([1,2,3])` 是 `['0','1','2']` 而不是一串方法名。自定义对象想让某个成员"能用但不出现在遍历与序列化里"（比如缓存字段、内部句柄），用 defineProperty 关掉 enumerable：

```javascript
Object.defineProperty(doc, '_cache', {
  value: new Map(),
  enumerable: false,     // JSON.stringify、Object.keys 都看不见它
  writable: true,
  configurable: false,   // 单向门：以后想改回 true 也不行了
});
```

**推论二：clone 时 getter 会丢的补位方案**。200 篇说过 structuredClone 把 getter 压成静态值；要连"访问器行为"一起复制，得用描述符级别的拷贝：

```javascript
const src = {
  firstName: '七',
  lastName: '阿',
  get fullName() { return `${this.firstName}${this.lastName}`; },
};

const copy = Object.defineProperties(
  {},
  Object.getOwnPropertyDescriptors(src)   // 描述符原样搬迁，getter 保留
);
console.log(copy.fullName);               // 七阿 —— getter 活着
console.log(copy.fullName = 'x');         // 静默失败（没有 setter）
```

这段代码同时是 Vue 2 响应式的历史注脚：Vue 2 用 `Object.defineProperty` 逐属性改写 getter/setter 实现数据侦测，代价是"新增属性与数组下标赋值侦测不到"（所以要 Vue.set）；Vue 3 换成 Proxy 整体代理（原理见 330 篇）。读两代框架的文档差异时，根子就在这两个 API 上。

## 6. 保护三档与遍历顺序

**保护三档**由弱到强（200 篇已踩过 freeze 的浅层坑，这里补全层级表）：

| 方法 | 能加新属性 | 能删属性 | 能改值 | 适用 |
| --- | --- | --- | --- | --- |
| Object.preventExtensions | 否 | 能 | 能 | "结构定死，内容随改" |
| Object.seal | 否 | 否 | 能 | 前两者的折中 |
| Object.freeze | 否 | 否 | 否 | 真只读配置（浅层） |

三档全部只作用于第一层，深保护需要递归（200 篇挑战题的 patchFreeze）。

**遍历顺序规则**是另一个藏得深、坑得狠的规范细节：

```javascript
const obj = { b: 1, 2: 'two', a: 1, 1: 'one' };
console.log(Object.keys(obj));   // ['1', '2', 'b', 'a']
```

规则三条：**类正整数的键永远升序排在最前；字符串键按插入顺序；Symbol 键按插入顺序排最后。** 数字键前置是规范要求，所有引擎一致——坑点在于"把对象当有序字典用时，数字样式的键会乱序插队"。需要严格插入顺序的映射，用 Map（它保证遍历顺序就是插入顺序，且键可以是任意类型）。

## 7. 修改实验

以下每个先预测再运行。

实验一：给第 2 节 parseQuery 加 URL 解码：`q=%E6%95%99%E7%A8%8B` 这类编码值要还原成中文。（提示：split 后每段过一遍 decodeURIComponent。）

实验二：把第 5 节 `copy.fullName = 'x'` 的静默失败改成严格模式报错：整个实验包进 `'use strict'` 的函数或 .mjs 文件再跑。（提示：印证 writable 关闭在严格模式下的行为差异。）

实验三：用 `Object.getOwnPropertyDescriptor(Array.prototype, 'push')` 打印，验证内置方法的 enumerable 与 configurable 的真实取值。（提示：大多数内置成员 enumerable 为 false；configurable 也常为 false——它们连说明书都锁死了。）

## 8. 常见错误与调试实录

**错误一：assign 忘了传空对象首参，源对象被就地污染。**

```javascript
const defaults = { theme: 'dark' };
function withTheme(overrides) {
  return Object.assign(defaults, overrides);   // 错
}

withTheme({ theme: 'light' });
console.log(defaults.theme);    // 'light' —— 全局默认值被永久改掉
```

症状：第二次调用时默认值已经不对了。定位三步：读现象——"配置越用越歪"且每次启动后第一次是对的，指向"有东西被就地改了"；验证——调用一次后打印 defaults，确认被写入；结论——assign 的第一个参数是目标，目标会被改。修法：`Object.assign({}, defaults, overrides)`，或直接 `{ ...defaults, ...overrides }`。

**错误二：entries 之后键的类型全变字符串。**

```javascript
const cfg = { 1: 'a', 2: 'b' };
const doubled = Object.fromEntries(
  Object.entries(cfg).map(([k, v]) => [k * 2, v])
);
console.log(Object.keys(doubled));    // ['2', '4'] —— 又变回字符串了
```

症状：数字键做了算术后 keys 打印成字符串，且顺序被"类整数键升序"规则重排。原因：对象键本就只能是字符串或 Symbol，数字进对象自动字符串化。修法：需要数字键、任意类型键或严格插入顺序时用 Map——`new Map(Object.entries(cfg))` 的键仍是字符串，要先用数组直转 `new Map([[1, 'a'], [2, 'b']])`。

**错误三：Object.create(null) 的字典上调用 hasOwnProperty 崩溃。**

```javascript
const dict = Object.create(null);    // 无原型的"干净字典"
dict.id = 1;
dict.hasOwnProperty('id');           // TypeError: dict.hasOwnProperty is not a function
```

症状：从第三方库或 JSON 处理管道拿到的对象，调 hasOwnProperty 直接炸。原因：Object.create(null) 造的对象没有原型，继承不到任何方法（这正是有人这么造字典的原因——彻底干净）。修法：统一用 `Object.hasOwn(dict, 'id')`——它不依赖对象自身的原型链。这也是"新代码一律 hasOwn"的最终理由。

## 9. 实际项目中的使用场景

- 配置合并：defaults 与用户配置合成生效配置（assign/展开，注意浅合并边界）；
- 表单与 URL 互转：entries + fromEntries 是 query、FormData、路由参数三者的通用转换器；
- 分组统计报表：groupBy + reduce 出分类汇总，groupBy 的无原型返回对象天然防键名冲突；
- 状态快照与 diff：keys 遍历比较两份配置的差异字段，配合 Object.is 做 NaN 安全的判等；
- 库开发：defineProperty 关 enumerable 造"内部字段"，getOwnPropertyDescriptors 迁移带 getter 的选项对象。

## 10. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
const o = { 10: 'x', b: 1, 2: 'y', a: 2 };
console.log(Object.keys(o));
```

答案：`['2', '10', 'b', 'a']`——类整数键升序前置，字符串键按插入序殿后。

修改题（10 分钟）：实现 `invert(obj)`：键值对调。验收：`invert({ a: '1', b: '2' })` 得 `{ '1': 'a', '2': 'b' }`；遇重复值时后者覆盖前者。（提示：fromEntries + entries + map。）

修 Bug 题（15 分钟）：下面的统计函数想把所有传入属性（含继承来的）都算进长度，真实症状是：普通对象结果比预期多 1，把 toString 也数进去了。用 hasOwn 修复，并回答"如果需求真是含继承属性，该用什么方法"：

```javascript
function countAll(obj) {
  return Object.keys(obj).length;
}
// 需求是：数"所有可枚举成员"——但 keys 本来就只算自有可枚举
```

提示：本例的病灶其实在调用方理解错了 keys 的语义。修法：只数自有属性就用 keys（现状即对），需求若是"含原型链上可枚举的"，用 for-in 计数——而 toString 之所以被数进去，是测试对象被 setPrototypeOf 挂上了可枚举的 toString。把每层语义说清楚，比"改一行"更重要。

挑战题（40 分钟，脱离示例）：实现 `deepToRaw(obj)`：把对象树里所有"类对象值"换成普通字面量对象，Symbol 键丢弃，getter 求值后按数据属性保留。验收：

```javascript
const src = Object.create({ inherited: 1 });
src.a = { get x() { return 42; } };
src[Symbol('s')] = 'drop me';

const raw = deepToRaw(src);
console.log(Object.getPrototypeOf(raw) === Object.prototype);   // true
console.log(raw.a.x);                                            // 42
console.log(Object.getOwnPropertySymbols(raw).length);          // 0
```

提示（思路方向）：递归 + getOwnPropertyDescriptors + fromEntries。展开（关键 API）：`typeof v === 'object'` 守卫、`Object.getOwnPropertyDescriptors`、`Array.isArray`。

## 11. 与之前和之后的知识的关系

- 往前：200 篇的浅拷贝与 freeze 边界是本文保护三档与 assign 的地基；190 篇的原型链解释了 in 与 hasOwn 的分野；
- 往后：[Proxy 与 Reflect](/javascript/330-ProxyAndReflect) 是"defineProperty 之后的下一代"对象控制技术，Vue 3 响应式与本文第 5 节的历史演进在那里闭环；[ES6+ 现代语法速通](/javascript/220-ES6NewFeatures) 的 hasOwn 与 groupBy 在本文给了完整用法。

## 12. 官方文档

- MDN Object（静态方法总表）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object
- MDN 属性描述符：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor
- MDN Object.groupBy：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy
- MDN 枚举与属性所有权（四种遍历的精确差异）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Enumerability_and_ownership_of_properties

## 自我检查

- 能用 entries/fromEntries 现场写出"对象按值过滤"与"查询串互转"，不需要查资料；
- 能说出 in、hasOwn、与 undefined 比较三种判存在的边界，并解释 hasOwn 对 Object.create(null) 对象的意义；
- 能背出 Object.is 与 === 的两处分歧，并举出"0 与 -0"引发的现实 bug 场景；
- 能读懂一份属性描述符输出，解释 enumerable 与 configurable 各自关掉后的行为，以及 configurable 的单向门含义；
- 能复述键的遍历顺序三规则，并说出"需要严格插入顺序时改用 Map"。

## 本章总结

keys/values/entries 把对象拆成数组加工，fromEntries 装回去，groupBy 一行分组且返回无原型对象。判存在默认 hasOwn：in 含继承、undefined 比较误判缺省值、老 hasOwnProperty 在无原型对象上会崩。Object.assign 记住首参即目标（浅合并），Object.is 只在 NaN 与正负零上分道。属性描述符是属性的说明书，enumerable 管隐身、configurable 是单向门，getOwnPropertyDescriptors 能把 getter 原样搬迁——也是 Vue 2 到 Vue 3 换代的技术分水岭。遍历顺序：类整数键升序打头、字符串与 Symbol 键按插入序，要严格顺序请用 Map。

## 下一步

进入 [ES6+ 现代语法速通](/javascript/220-ES6NewFeatures)：本文的扳手是"对象 API 层"的，下一篇收编"语法层"的现代写法——解构、可选链、空值合并，它们与本文的 entries 三兄弟组合起来才是完整的日常代码形态。
