---
order: 220
title: ES6+ 现代语法速通：读懂今天的 JS 代码
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 以「打开现代项目源码，满屏符号看不懂」为问题主线，一次收齐日常必用的现代语法：解构、展开与剩余、可选链、空值合并、逻辑赋值、类字段与私有字段，附解构默认值只认 undefined、?. 不能赋值等陷阱，并给出 2026 年各提案的真实落地状态。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'javascript/590-ES2023To2026NewFeatures'
  - 'javascript/600-JavaScriptLatestFeature'
  - 'javascript/200-DeepShallowCopy'
  - 'javascript/330-ProxyAndReflect'
prerequisites:
  - 'javascript/040-VariableDataType'
  - 'javascript/070-ObjectArray'
---

## 前置知识

- 已完成 [变量与数据类型](/javascript/040-VariableDataType)：会用 let/const，见过模板字符串；
- 已完成 [对象与数组](/javascript/070-ObjectArray)：会读写属性、会遍历数组。

本文不教新思想，只做一件事：**把 2015 到 2022 年进入规范、如今在每一个现代项目里天天出现的语法，一次收进你的肌肉记忆。** 更新的 ES2023 到 ES2026 特性另有专篇（见文末"下一步"）。

## 学习目标

读完本文你将能够：

1. 无障碍读懂一段典型的现代前端代码（解构 + 可选链 + 空值合并 + 展开组合拳）；
2. 熟练使用解构赋值：对象/数组、默认值、重命名、嵌套、函数参数解构；
3. 分清 `||` 与 `??` 的判定边界，掌握 `?.`、`??=`、`&&=`、`||=` 的正确场景；
4. 使用类字段与 `#` 私有字段写出规范的 class，并说出私有字段的两个特殊性；
5. 说出 2026 年主要提案（管道、装饰器、Records、模式匹配）的真实状态，不在代码里赌提案。

预计 45 到 60 分钟，含 3 个动手实验与 4 道练习。

## 1. 你现在要解决什么问题

你学完了基础语法，打开 FANDEX 这类真实项目的源码（Astro 7 + React 19 + TypeScript 的 monorepo），第一屏大概长这样：

```javascript
function DocCard({ doc, onSelect, compact = false }) {
  const { title, meta: { tags = [] } = {} } = doc;
  const count = doc.revisions?.at(-1)?.addedWords ?? 0;

  return (
    <article className={compact ? 'card-sm' : 'card'}>
      <h3>{title}</h3>
      <TagList items={tags} />
      <button onClick={() => onSelect(doc.id)}>打开</button>
    </article>
  );
}
```

每个符号都认识，连起来读不懂：`{ doc, onSelect, compact = false }` 是什么写法？`meta: { tags = [] } = {}` 的三层套娃在干嘛？`?.at(-1)?.` 这串问号在防什么？`?? 0` 和 `|| 0` 有区别吗？

这些不是炫技，是 2015 年后 JS 社区的"通用手语"——教程、开源代码、面试、同事的 review 意见全在用。**不认识它们，等于在这个语言里不识字。** 本文按"出现频率从高到低"把它们逐个收编，每个都配陷阱。

## 2. 先不要看解释，先试试看

从最常见的一个场景开始：接口返回了一个嵌套对象，你要取值。

```javascript
const response = {
  data: {
    user: { name: '阿七', roles: ['admin'] },
    total: 42,
  },
};
```

老写法一路点下去：

```javascript
const userName = response.data.user.name;
const isAdmin = response.data.user.roles[0] === 'admin';
```

现代写法一行解构，把"取值路径"写成"形状模板"：

```javascript
const {
  data: {
    user: { name, roles: [firstRole] },
    total,
  },
} = response;

console.log(name, firstRole, total);   // 阿七 admin 42
```

解构的原则一句话：**等号右边长什么样，左边就照着摆**。数组按位置、对象按键名；`roles: [firstRole]` 的意思是"取 roles 键，并且它是个数组，我要第一个元素"。先在控制台把这段敲熟，后面的所有花活都是它的变体。

## 3. 解构全家桶：默认值、重命名、函数参数

**默认值**：键不存在（或值是 undefined）时兜底：

```javascript
const { page = 1, size = 20 } = options;
```

**重命名**：键名和变量名不一样时用冒号：

```javascript
const { 'Content-Type': contentType } = headers;   // 键名带特殊字符也能取
const { data: list } = await fetchDocs();           // data 进了叫 list 的变量
```

**函数参数解构**：开头那段 `DocCard` 的谜底——参数列表直接解构对象，调用方传一个对象即可，参数名自文档化，还能带默认值：

```javascript
function createDoc({ title, tags = [], private: isPrivate = false } = {}) {
  console.log(title, tags.length, isPrivate);
}

createDoc({ title: '笔记', private: true });   // 笔记 0 true
createDoc();                                    // undefined 0 false
```

注意结尾那个 `= {}`：它让"整个参数没传"也能兜底，没有它，`createDoc()` 会直接 TypeError。

**数组解构的经典姿势**——换变量与跳位：

```javascript
let a = 1, b = 2;
[a, b] = [b, a];               // 交换，a=2 b=1

const [, second, , fourth] = ['a', 'b', 'c', 'd'];   // 'b' 'd'，逗号跳位
```

**剩余与展开**是解构的另一半：

```javascript
const { id, ...rest } = article;        // rest 是"除 id 外的其余键"
const merged = { ...defaults, ...userConfig };   // 后面的覆盖前面的
const [first, ...others] = queue;       // 取走第一个，剩下的继续排队
```

合并对象时"后者覆盖前者"的顺序规则值得刻进手指：`{ ...defaults, ...userConfig }` 才是"用户配置优先"。展开做浅拷贝的边界（嵌套层联动）在 [深拷贝与浅拷贝](/javascript/200-DeepShallowCopy) 已展开，这里只留一句：**展开只换门牌号的第一层。**

## 4. 可选链、空值合并、逻辑赋值：三件防崩套装

**可选链 `?.`**：链条上任何一环是 null 或 undefined，整个表达式短路成 undefined，不抛错：

```javascript
const city = user.address?.city;              // address 不存在也不崩
const last = revisions?.at(-1);               // at(-1) 取倒数第一个（ES2022）
const saved = formRef.current?.save();        // DOM 引用可能还没挂上
```

它替代的是这样一串防御：`user && user.address && user.address.city`。

**空值合并 `??`**：左边是 null 或 undefined 才用右边，**0 和空字符串会通过**：

```javascript
const volume = settings.volume ?? 50;   // settings.volume 为 0 时，结果是 0
const volume2 = settings.volume || 50;  // 用 || 则 0 会被错误替换成 50
```

这是 `??` 存在的全部理由：`||` 把"假值"（0、''、false、NaN）全都当"缺失"，而"缺失"只有 null 和 undefined 两种。凡是"0 是合法值"的字段（音量、数量、坐标、重试次数），必须用 `??`。

**逻辑赋值**（ES2021）：把判断和赋值压成一步：

```javascript
config.timeout ??= 3000;    // 仅当 timeout 是 null/undefined 时才设默认值
cache[key] ||= build();     // 假值就重建（注意会误伤 0）
obj.flag &&= trueValue;     // 真值才覆盖
```

三件套组合出开头谜题的答案：`doc.revisions?.at(-1)?.addedWords ?? 0`——"拿最后一次修订的新增字数；任何一环缺失都不崩，兜底为 0"。

**一条硬边界**：`?.` 只能读和调用，**不能赋值**。`obj?.prop = 1` 直接语法错误——"可能不存在的目标"没法写。

## 5. class 的新衣服：字段、私有、静态块

ES2022 给 class 补齐了三块：

```javascript
class DocStore {
  static version = '2.0';             // 静态字段，ES2022
  #cache = new Map();                 // 私有字段，真私有
  #hits = 0;

  get(key) {
    this.#hits += 1;
    if (!this.#cache.has(key)) {
      this.#cache.set(key, this.#load(key));
    }
    return this.#cache.get(key);
  }

  #load(key) {                        // 私有方法
    return { key, loadedAt: Date.now() };
  }

  get hits() { return this.#hits; }   // 想暴露就用 getter
}

const store = new DocStore();
store.get('a');
console.log(store.hits);        // 1，走 getter
console.log(store.#hits);       // SyntaxError：类外摸不到
console.log(Object.keys(store));// ['cache' 不在]——私有字段不可枚举
```

私有字段 `#` 与以前的下划线约定 `_cache` 有本质区别：**语言层面挡住外部访问**。两个特殊性要记住：私有字段**不出现在 `Object.keys` 与 for-in 里**（不可枚举）；私有字段也**不通过原型链继承**——子类访问 `#hits` 会报错，要访问就得在基类里留受保护的方法。需要"子类可用、外部不可用"时，用普通字段加 TypeScript 的 `protected` 约束。

## 6. 其余高频小件速览

一段代码过一遍，都值得认识：

```javascript
const quota = 1_000_000;                    // 数字分隔符，纯可读性
const label = ' 总分 '.trim();               // trim/trimStart/trimEnd（ES2019）
const css = 'btn'.padStart(8, '.');          // '. . . .btn'，补位对齐
const clean = text.replaceAll('"', "'");     // replaceAll（ES2021）
const mid = list.at(-2);                     // 负下标（ES2022）

try {
  risky();
} catch {                                   // 可选 catch 绑定：不用错误对象就不写参数
  fallback();
}

console.log(Object.hasOwn(obj, 'key'));      // hasOwn（ES2022），替代 hasOwnProperty.call
const grouped = Object.groupBy(docs, (d) => d.category);  // 分组（ES2024）
```

`Object.groupBy` 值得多看一眼——"按某键分类"是业务代码的高频动作，以前要手写 reduce：

```javascript
// 老写法：五行的 reduce 分组
const byCat = docs.reduce((acc, d) => {
  (acc[d.category] ??= []).push(d);
  return acc;
}, {});

// 新写法：一行
const byCat2 = Object.groupBy(docs, (d) => d.category);
```

## 7. 修改实验

以下每个先预测再运行。

实验一：把第 4 节的 `settings.volume ?? 50` 依次换成 `volume = 0`、`volume = ''`、`volume = null`、`volume = undefined` 四种取值，分别用 `??` 和 `||` 跑，把 8 个结果记成一张表。（提示：这就是两运算符的完整分界。）

实验二：给第 5 节的 DocStore 加一个静态方法 `static fromJSON(text)`：解析 JSON 字符串并返回实例。（提示：静态方法里用 `new DocStore(JSON.parse(text))`；体会 `static` 挂在类上而非实例上。）

实验三：把第 1 节 `DocCard` 开头的解构拆成"老写法"（逐个点号 + 手动兜底），数一数行数差。（提示：体会"形状模板"省掉的防御代码量。）

## 8. 常见错误与调试实录

**错误一：以为解构默认值能兜住 0 和空串。**

```javascript
function render({ count = 10 } = {}) {
  console.log(count);
}

render({ count: 0 });    // 0 —— 正确
render({ count: null }); // null —— 默认值不生效！
```

症状：明明写了 `= 10`，传 null 还是得到 null。原因：**解构默认值只对 undefined 生效**，null 是"有值"，不触发兜底。修法：字段可能为 null 时，解构之后再补一层 `count ?? 10`。

**错误二：把 `?.` 用在函数调用上却漏了执行条件。**

```javascript
const result = getUser?.();       // getUser 存在才调用
const result2 = getUser()?.name;  // 注意：getUser 不存在时 result2 是 undefined
const bad = result2.length;       // TypeError：Cannot read properties of undefined
```

症状：加了 `?.` 还是崩了。原因：可选链只保护"它自己的那一环"，`getUser()?.name` 保护的是 getUser 不存在，但**后续再往下点依然会踩空**——不过实际上 `?.` 短路后整条链都会短路：真正的坑是你在链条之外又接着用了结果。定位：崩溃行往上找"可选链的终点"，短路的 undefined 从那里漏出链条。修法：漏出的位置继续 `?.` 或用 `??` 收口成安全默认值。

**错误三：Symbol 被当成私有属性。**

```javascript
const _secret = Symbol('secret');
const obj = { [_secret]: '内部数据' };
console.log(Object.keys(obj));          // []——枚举不到
console.log(Reflect.ownKeys(obj));      // [Symbol(secret)]——照样拿得到
console.log(obj[_secret]);              // '内部数据'——拿着引用就能读
```

症状：以为 Symbol 键"藏住了"。原因：Symbol 只保证**键名唯一**（避免命名冲突，这正是它发明的目的，比如给第三方对象挂自定义元数据），不提供访问控制。要隐私用 `#` 私有字段。顺带认识 well-known Symbol 的存在：`Symbol.iterator` 让对象可被 for-of 遍历、`Symbol.toPrimitive` 控制对象转原始值——它们是语言钩子，不是加密。

## 9. 提案状态（2026 年实情）

读技术文章常撞见"即将到来的特性"，落地前别写进生产代码。截至 2026 年的几个高热度提案：

| 提案 | 状态 | 一句话 |
| --- | --- | --- |
| 管道运算符 `\|>` | Stage 2，多年悬而未决 | 社区仍用 `pipe` 函数（170 篇手写过） |
| 装饰器 | Stage 3 | TypeScript 5+ 已支持标准版，NestJS/Angular 生态在用 |
| 模式匹配 `match` | Stage 1 | 继续观望 |
| Records & Tuples | 已回退至早期阶段 | 不可变对象字面量，暂无落地时间表 |
| Temporal（新一代日期时间 API） | Stage 3 | 各引擎实现中，落地前用 date-fns 等库过渡（专篇见 610） |

判断标准很简单：Stage 3 且主流引擎或 TypeScript 已实现，可以小范围尝鲜；Stage 2 及以下，读个乐。

## 10. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
const { a = 1, b = 2 } = { a: 0, b: null };
console.log(a, b);
```

答案：`0 null`——0 不是 undefined，null 也不是，默认值双双不生效。

修改题（10 分钟）：把第 1 节的 `DocCard` 改成用解构参数直接取 `doc.revisions` 并求"新增字数总和"（不是最后一条）。验收：`revisions: [{ addedWords: 10 }, { addedWords: 5 }]` 时显示 15，`revisions` 为 undefined 时显示 0。

修 Bug 题（15 分钟）：下面的合并配置有 bug，真实症状是：用户明明把重试次数设为 0，运行时却重试了 3 次。定位并修复：

```javascript
const defaults = { retries: 3, timeout: 5000, endpoint: '/api' };
const userConfig = { retries: 0 };

const config = { ...defaults, ...userConfig };
const shouldRetry = (n) => n > 0;
// 调用处
let attempts = 0;
while (attempts < config.retries) { attempts += 1; }
console.log(attempts);    // 期望 0，实际 3
```

提示：本段合并顺序是对的（后者覆盖前者），bug 在"上一行注释里"——真实项目里用户配置往往经过一层 `||` 归一化，例如 `retries: userRaw.retries || 3`，0 被误杀。把 `||` 换成 `??` 修复；这道题考的是"套装三件里 `??` 的适用边界"。

挑战题（30 分钟，脱离示例）：只用本文语法实现 `pick(obj, keys)`：从对象里挑出指定键组成新对象，键不存在就跳过。验收：

```javascript
const doc = { id: 1, title: '笔记', secret: 'x' };
console.log(pick(doc, ['id', 'title', 'missing']));
// { id: 1, title: '笔记' }
```

提示（思路方向）：数组 filter + 解构 + 计算属性名。展开（关键 API）：`Array.prototype.filter`、`Object.hasOwn`、`in` 操作符、计算属性 `{ [k]: v }`。

## 11. 与之前和之后的知识的关系

- 往前：040 篇的 let/const 与模板字符串是现代语法的入门两件，本文是全家桶；200 篇讲透了"展开只拷一层"，本文的合并与剩余参数都受这条规则约束；
- 往后：[ES2023 到 ES2026 新特性](/javascript/590-ES2023To2026NewFeatures) 接着讲更新的批次（数组 findLast、Immutable 数组方法、正则 v 标志等）；[Proxy 与 Reflect](/javascript/330-ProxyAndReflect) 解释 Vue 响应式为什么从 defineProperty 换成了 Proxy——第 8 节的 Symbol 知识在那里还会用到。

## 12. 官方文档

- MDN 解构赋值：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
- MDN 可选链：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Optional_chaining
- MDN 空值合并：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing
- MDN 类的私有属性：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes/Private_properties
- TC39 提案进度总表：https://github.com/tc39/proposals

## 自我检查

- 能一眼读懂"解构参数 + 可选链 + 空值合并"的三连组合并口头翻译成老写法；
- 能画出 `??` 与 `||` 在 0、''、null、undefined 四种取值下的完整分界表；
- 能说出私有字段的两个特殊性（不可枚举、不走原型链）以及 Symbol 与它的分工；
- 面对一篇"JS 即将支持 XX"的文章，能用 Stage 规则判断"现在能不能写进生产代码"。

## 本章总结

解构是"照着形状取值"，默认值只认 undefined；展开合并记住"后者覆盖前者"，浅拷贝边界归 200 篇管。`?.` 防链条断裂但只能读，`??` 只认 null 与 undefined 两种缺失，0 和空串是合法值必须保住——三者合起来是现代 JS 的防崩套装。class 补齐了字段与 `#` 真私有，Symbol 管唯一键不管隐私。提案要按 Stage 掂量：管道未落地用 pipe 函数，装饰器 Stage 3 可配 TS 使用，Temporal 到来前继续用日期库。

## 下一步

进入 [ES2023 到 ES2026 新特性](/javascript/590-ES2023To2026NewFeatures)：本文收编的是"已经用了很多年"的批次，下一篇往前看最新批次——findLast、数组不可变方法、正则 v 标志、以及刚落地的 ES2025/ES2026 新东西。
