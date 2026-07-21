---
order: 70
tags:
  - javascript
difficulty: intermediate
title: 对象与数组
module: javascript
category: 'JS Basics'
description: 对象操作、数组方法与解构赋值。
author: Anonymous
related:
  - javascript/Promise构造器
  - javascript/Records与Tuples
  - javascript/DOM操作与事件
  - javascript/JavaScript最新特性与运行时
prerequisites:
  - javascript/语法速查
---

## 0. 学习目标

完成本章节学习后，读者应能够：

- **记忆（Remember）**：复述 JavaScript 对象的属性描述符六字段、原型链查找算法、数组的七种创建方式与二十余个内建方法分类。
- **理解（Understand）**：解释对象字面量、构造函数、`Object.create`、`class` 四种对象创建范式的内存布局与原型链差异；说明 `Object.keys` 与 `for...in` 的枚举顺序规则与差异原因。
- **应用（Apply）**：使用解构赋值、展开运算符、可选链、空值合并运算符编写简洁可读的数据处理代码；使用 `Object.defineProperty`、`Proxy`、`Reflect` 实现属性拦截与响应式系统。
- **分析（Analyze）**：对比 `Object.assign`、展开运算符、`structuredClone` 三种拷贝策略的深浅层次与性能特征；分析 V8 隐藏类与内联缓存对对象属性访问的优化机制。
- **评估（Evaluate）**：在给定业务场景（如配置合并、数据过滤、不可变更新）中判断对象与数组操作模式的适用性，指出原型链污染、排序稳定性、稀疏数组等潜在风险。
- **创造（Create）**：设计并实现一个支持链式调用、不可变更新、深拷贝与性能监控的数据操作工具库，并通过基准测试验证其在百万级数据下的性能表现。

## 1. 历史动机与背景

### 1.1 JavaScript 对象模型的诞生

1995 年 Brendan Eich 用 10 天设计 JavaScript 时，原计划引入 Scheme 风格的函数式语言，但 Netscape 管理层要求语法接近 Java。最终采取折中方案：**基于原型的对象系统** + **类 C 语法**。

这一决策受 Self 语言启发，避免了类的冗余抽象，让对象直接继承对象。然而，为了迎合 Java 开发者的习惯，JavaScript 后来又引入了 `new`、`constructor`、`class` 等基于类的语法糖，导致原型系统与类语法长期共存，产生大量混淆。

### 1.2 数组为何不是真正的数组

JavaScript 的数组并非传统意义的连续内存数组，而是**以整数为键的特殊对象**：

```javascript
const arr = [1, 2, 3];
console.log(typeof arr); // 'object'
console.log(Array.isArray(arr)); // true
console.log(arr instanceof Array); // true

// 数组本质是对象，可挂载非数字属性
arr.name = 'myArray';
console.log(arr.name); // 'myArray'
console.log(arr.length); // 3（length 不计非数字属性）
```

这种设计带来灵活性（可动态扩容、可存储异构类型），但牺牲了密集内存布局与缓存友好性。V8 引擎在检测到数组为连续整数索引时，会优化为真正的连续内存数组（`PACKED_SMI_ELEMENTS`），但一旦出现空洞或非数字键则回退到慢速模式。

### 1.3 演进时间线

| 年份 | 里程碑 | 关键贡献 |
| :--- | :--- | :--- |
| 1995 | 对象字面量、原型链 | 基于原型的对象系统 |
| 1996 | `Array.prototype` 方法 | `push`、`pop`、`sort`、`join` |
| 2009 | ES5 严格模式、`Object.create` | 显式原型操作、属性描述符 |
| 2011 | `Object.keys`、`Object.freeze` | 枚举与不可变性 API |
| 2015 | ES6 解构、展开、`class` | 语法糖大幅提升表达力 |
| 2016 | `Array.prototype.includes` | 替代 `indexOf` 的可读性 API |
| 2018 | 对象展开运算符、剩余属性 | 不可变更新主流化 |
| 2019 | `Array.prototype.flat`、`flatMap` | 嵌套数组扁平化 |
| 2020 | 可选链 `?.`、空值合并 `??` | 深层属性访问安全化 |
| 2021 | `Object.hasOwn`、`at()` | 替代 `hasOwnProperty`、负索引访问 |
| 2022 | `structuredClone` | 原生深拷贝 API |
| 2024 | `Object.groupBy`、`Map.groupBy` | 数据分组内建方法 |
| 2025 | Records & Tuples（Stage 3） | 不可变数据结构原语 |

### 1.4 为什么对象与数组是核心

在 JavaScript 生态中，几乎所有数据都以对象或数组形式存在：

- **JSON** 是 Web 数据交换标准，本质是对象与数组的字符串表示；
- **DOM 节点**是对象，`NodeList`、`HTMLCollection` 是类数组对象；
- **函数**是对象，可挂载属性；**数组**是对象，拥有 `length` 与数字索引；
- **ESM 模块导出**是对象；**Promise 链**的返回值常是对象；
- **React 组件 props**、**Vue 响应式状态**、**Redux store** 均以对象为核心。

因此，深入理解对象与数组的语义、性能特征与陷阱，是成为高级 JavaScript 工程师的前提。

## 2. 形式化定义

### 2.1 对象的代数模型

JavaScript 对象可形式化为一个有限映射：

$$
\text{Obj} = (P, \text{Proto}, \text{Extensible})
$$

其中：

- $P = \{ (k, d) \mid k \in \text{PropertyKey}, d \in \text{PropertyDescriptor} \}$ 为属性集合，每个属性由键与描述符组成；
- $\text{Proto} \in \text{Obj} \cup \{\text{null}\}$ 为原型引用，构成原型链；
- $\text{Extensible} \in \{\text{true}, \text{false}\}$ 标识对象是否可添加新属性。

### 2.2 属性描述符的形式化

属性描述符分为**数据描述符**与**访问器描述符**两类，均为四元组：

**数据描述符**：

$$
d_{\text{data}} = (\text{value}, \text{writable}, \text{enumerable}, \text{configurable})
$$

**访问器描述符**：

$$
d_{\text{accessor}} = (\text{get}, \text{set}, \text{enumerable}, \text{configurable})
$$

字段语义：

- `value`：属性值，任意类型；
- `writable`：若为 `false`，赋值操作静默失败（严格模式抛错）；
- `enumerable`：若为 `true`，该属性出现在 `for...in` 与 `Object.keys` 中；
- `configurable`：若为 `false`，描述符不可再修改，属性不可删除；
- `get`/`set`：访问器函数，读取/写入时触发。

### 2.3 原型链查找算法

属性读取 `obj[k]` 的形式化语义：

$$
\text{lookup}(o, k) = \begin{cases}
\text{getValue}(o, k) & \text{若 } k \in \text{ownKeys}(o) \\
\text{lookup}(\text{Proto}(o), k) & \text{若 } \text{Proto}(o) \neq \text{null} \\
\text{undefined} & \text{otherwise}
\end{cases}
$$

查找路径长度（原型链深度）：

$$
\text{depth}(o, k) = \min \{ n \mid k \in \text{ownKeys}(\text{Proto}^n(o)) \}
$$

其中 $\text{Proto}^n$ 表示 $n$ 次原型引用。原型链末端为 `null`，最大深度通常为 6（`Object.prototype` 之上即 `null`）。

### 2.4 数组作为对象的特化

数组是添加了 `length` 语义与 `Array.prototype` 原型的对象：

$$
\text{Array} = \text{Obj} \cup \{ \text{length} \in \mathbb{N}, \text{Proto} = \text{Array.prototype} \}
$$

`length` 与数字索引满足不变式：

$$
\text{length} = 1 + \max \{ k \in \mathbb{N} \mid k \in \text{ownKeys}(a) \}
$$

当设置 `a[i] = v` 且 $i \geq \text{length}$ 时，`length` 自动更新为 $i + 1$；当设置 `a.length = n < \text{length}` 时，所有 $k \geq n$ 的索引属性被删除。

### 2.5 解构赋值的形式化

解构赋值是模式匹配语法的特例：

$$
\text{destructure}(\text{pattern}, \text{value}) \to \text{bindings}
$$

**数组解构**按迭代器协议消费 `value`：

$$
[a, b, ...rest] = v \iff \text{let } it = v[Symbol.iterator]();\ a = it.next().value;\ b = it.next().value;\ rest = \text{collectRest}(it)
$$

**对象解构**按属性键读取：

$$
\{ a, b: c \} = v \iff a = v.a;\ c = v.b
$$

这解释了为什么数组解构可用于任意可迭代对象（如 `Map`、`Set`、生成器），而对象解构只能用于对象（或装箱后的原始类型）。

## 3. 理论推导

### 3.1 属性访问的时间复杂度

V8 引擎对对象属性访问的优化经历了三个阶段：

1. **字典模式（Dictionary Mode）**：属性存储在哈希表中，访问复杂度 $O(1)$ 但常数较大；
2. **隐藏类（Hidden Class / Map）**：V8 为每个"形状"（属性键的有序集合）维护一个隐藏类，属性按偏移量存储，访问复杂度 $O(1)$ 且常数小；
3. **内联缓存（Inline Cache）**：对于热点访问点，V8 缓存上次的隐藏类与偏移量，下次访问直接跳过查找，复杂度趋近 $O(1)$ 且常数极小。

**隐藏类迁移（Transition Chain）**：

```javascript
const p1 = { x: 1, y: 2 }; // 隐藏类 M0 -> M1(x) -> M2(x,y)
const p2 = { y: 2, x: 1 }; // 隐藏类 M0 -> M3(y) -> M4(y,x)
console.log(p1.__proto__ === p2.__proto__); // true
// 但 p1 与 p2 的隐藏类不同！
```

属性添加顺序不同会导致不同的隐藏类，破坏内联缓存。**工程启示**：构造函数应按固定顺序初始化属性。

### 3.2 数组模式与性能

V8 将数组分为三种元素类型（Element Kind）：

| 模式 | 描述 | 性能 |
| :--- | :--- | :--- |
| `PACKED_SMI_ELEMENTS` | 连续小整数（SMI） | 最快，紧凑内存 |
| `PACKED_DOUBLE_ELEMENTS` | 连续浮点数 | 较快，双精度布局 |
| `PACKED_ELEMENTS` | 连续任意类型 | 较慢，指针数组 |
| `HOLEY_SMI_ELEMENTS` | 稀疏小整数 | 慢，需检查空洞 |
| `HOLEY_DOUBLE_ELEMENTS` | 稀疏浮点数 | 更慢 |
| `HOLEY_ELEMENTS` | 稀疏任意类型 | 最慢 |

模式转换是**单向不可逆**的：

$$
\text{PACKED\_SMI} \to \text{PACKED\_DOUBLE} \to \text{PACKED\_ELEMENTS} \to \text{HOLEY\_ELEMENTS}
$$

```javascript
const arr = [1, 2, 3];           // PACKED_SMI_ELEMENTS
arr.push(4.5);                    // 降级为 PACKED_DOUBLE_ELEMENTS
arr.push({});                     // 降级为 PACKED_ELEMENTS
arr[10] = 5;                      // 降级为 HOLEY_ELEMENTS
// 即使删除空洞，也无法回到 PACKED 模式
```

**工程启示**：避免在密集数组中创建空洞；异构类型数据考虑使用对象数组而非混合类型数组。

### 3.3 排序算法的稳定性

ECMAScript 自 ES2019 起强制要求 `Array.prototype.sort` 稳定。此前 V8 在数组长度 > 10 时使用 QuickSort（不稳定），≤ 10 时使用 InsertionSort（稳定）。

稳定性定义：

$$
\forall i < j,\ \text{cmp}(a_i, a_j) = 0 \implies \text{pos}(a_i) < \text{pos}(a_j) \text{ 在排序后}
$$

TimSort（V8 7.0+）的时间复杂度为 $O(n \log n)$ 最坏、$O(n)$ 最好，且稳定。

### 3.4 拷贝深度的复杂度

| 方法 | 深度 | 复杂度 | 支持类型 |
| :--- | :--- | :--- | :--- |
| `Object.assign` | 浅 | $O(n)$ | 自有可枚举属性 |
| 展开运算符 `{...o}` | 浅 | $O(n)$ | 自有可枚举属性 |
| `JSON.parse(JSON.stringify(o))` | 深 | $O(n)$ | 仅 JSON 兼容类型 |
| `structuredClone(o)` | 深 | $O(n)$ | 结构化克隆算法支持类型 |
| 自定义递归 | 可控 | $O(n)$ | 任意（需处理环） |

`structuredClone` 的优势：支持 `Date`、`RegExp`、`Map`、`Set`、`ArrayBuffer`、`Blob`、`Error` 等类型，且正确处理循环引用。但不支持函数、DOM 节点、Symbol 属性。

## 4. 代码示例

### 4.1 对象创建的四种范式

#### 4.1.1 对象字面量

```javascript
// 对象字面量：最常用的对象创建方式
const person = {
  name: '张三',
  age: 30,
  // 方法简写
  greet() {
    return `Hello, ${this.name}`;
  },
  // 计算属性名（ES6）
  ['computed_' + 'key']: 'value',
  // Symbol 作为键
  [Symbol.iterator]() {
    let i = 0;
    return {
      next: () => ({ value: this.name[i++], done: i > this.name.length }),
    };
  },
};

console.log(person.greet()); // 'Hello, 张三'
```

#### 4.1.2 构造函数（传统模式）

```javascript
// 构造函数：通过 new 调用的普通函数
function Person(name, age) {
  // this 指向新创建的对象
  this.name = name;
  this.age = age;
  // 实例方法（每个实例独立拷贝，内存浪费）
  this.greet = function () {
    return `Hello, ${this.name}`;
  };
}

// 原型方法（所有实例共享同一引用）
Person.prototype.describe = function () {
  return `${this.name} is ${this.age} years old`;
};

const p = new Person('张三', 30);
console.log(p instanceof Person); // true
console.log(p.constructor === Person); // true
```

#### 4.1.3 Object.create（显式原型）

```javascript
// Object.create：直接指定原型创建对象，不调用构造函数
const personProto = {
  greet() {
    return `Hello, ${this.name}`;
  },
  describe() {
    return `${this.name} is ${this.age} years old`;
  },
};

// 第二参数为属性描述符映射
const person = Object.create(personProto, {
  name: { value: '张三', enumerable: true, writable: true, configurable: true },
  age: { value: 30, enumerable: true, writable: true, configurable: true },
});

console.log(person.greet()); // 'Hello, 张三'
console.log(Object.getPrototypeOf(person) === personProto); // true
```

#### 4.1.4 ES6 class 语法

```javascript
// class 是构造函数与原型方法的语法糖
class Person {
  // 私有字段（ES2022）
  #ssn;

  // 静态字段
  static species = 'Homo sapiens';

  constructor(name, age, ssn) {
    this.name = name;
    this.age = age;
    this.#ssn = ssn;
  }

  // 实例方法（挂载在 Person.prototype）
  greet() {
    return `Hello, ${this.name}`;
  }

  // 访问器
  get ssn() {
    return this.#ssn.replace(/\d(?=\d{4})/g, '*');
  }
  set ssn(value) {
    if (!/^\d{9}$/.test(value)) throw new Error('无效 SSN');
    this.#ssn = value;
  }

  // 静态方法
  static create(name, age) {
    return new Person(name, age, '000000000');
  }
}

class Student extends Person {
  #grade;

  constructor(name, age, ssn, grade) {
    super(name, age, ssn); // 必须在 this 之前调用
    this.#grade = grade;
  }

  study() {
    return `${this.name} is studying grade ${this.#grade}`;
  }

  // 重写父类方法
  greet() {
    return `${super.greet()} (student)`;
  }
}

const s = new Student('李四', 15, '123456789', 9);
console.log(s.greet()); // 'Hello, 李四 (student)'
console.log(s.ssn); // '*****6789'
console.log(Person.species); // 'Homo sapiens'
```

### 4.2 属性描述符的精细控制

```javascript
const obj = {};

// 默认描述符：所有特性均为 true
obj.a = 1;
console.log(Object.getOwnPropertyDescriptor(obj, 'a'));
// { value: 1, writable: true, enumerable: true, configurable: true }

// Object.defineProperty：精细控制
Object.defineProperty(obj, 'b', {
  value: 2,
  writable: false, // 只读
  enumerable: true,
  configurable: false, // 不可删除、不可再修改描述符
});
obj.b = 3; // 静默失败（严格模式抛 TypeError）
console.log(obj.b); // 2

// 访问器属性
let temperature = 25;
Object.defineProperty(obj, 'temp', {
  get() {
    return temperature;
  },
  set(value) {
    if (typeof value !== 'number') throw new TypeError('必须是数字');
    temperature = value;
  },
  enumerable: true,
  configurable: true,
});

obj.temp = 30;
console.log(obj.temp); // 30

// Object.defineProperties：批量定义
Object.defineProperties(obj, {
  c: { value: 3, enumerable: true },
  d: { value: 4, enumerable: true, writable: false },
});

// 不可变对象
const frozen = Object.freeze({ x: 1, y: 2 });
frozen.x = 100; // 静默失败
console.log(frozen.x); // 1
console.log(Object.isFrozen(frozen)); // true

const sealed = Object.seal({ x: 1 });
sealed.x = 100; // 可修改现有属性值
sealed.z = 3; // 不可添加新属性
delete sealed.x; // 不可删除
console.log(sealed); // { x: 100 }
```

### 4.3 原型链与继承

```javascript
// 原型链查找演示
const grandparent = { method: 'grandparent' };
const parent = Object.create(grandparent);
parent.parentMethod = 'parent';
const child = Object.create(parent);
child.childMethod = 'child';

console.log(child.method); // 'grandparent'（沿原型链向上查找）
console.log(child.parentMethod); // 'parent'
console.log(child.childMethod); // 'child'
console.log(child.toString()); // '[object Object]'（来自 Object.prototype）

// 检查属性是否为自有
console.log(child.hasOwnProperty('childMethod')); // true
console.log(child.hasOwnProperty('method')); // false

// Object.hasOwn（ES2022 推荐）
console.log(Object.hasOwn(child, 'childMethod')); // true
console.log(Object.hasOwn(child, 'method')); // false

// 原型链的终点
console.log(Object.getPrototypeOf({})); // [Object: null prototype] {}
console.log(Object.getPrototypeOf(Object.prototype)); // null

// 寄生组合继承（推荐模式）
function inherit(Sub, Sup) {
  Sub.prototype = Object.create(Sup.prototype);
  Sub.prototype.constructor = Sub;
}

function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return `${this.name} makes a sound`;
};

function Dog(name, breed) {
  Animal.call(this, name); // 借用构造函数
  this.breed = breed;
}
inherit(Dog, Animal);
Dog.prototype.bark = function () {
  return `${this.name} barks`;
};

const dog = new Dog('Rex', 'Labrador');
console.log(dog.speak()); // 'Rex makes a sound'
console.log(dog.bark()); // 'Rex barks'
console.log(dog instanceof Dog); // true
console.log(dog instanceof Animal); // true
```

### 4.4 对象方法全集

```javascript
const obj = { a: 1, b: 2, c: 3 };

// 枚举方法
console.log(Object.keys(obj)); // ['a', 'b', 'c']
console.log(Object.values(obj)); // [1, 2, 3]
console.log(Object.entries(obj)); // [['a', 1], ['b', 2], ['c', 3]]

// 从 entries 重建对象
const fromEntries = Object.fromEntries([
  ['x', 10],
  ['y', 20],
]);
console.log(fromEntries); // { x: 10, y: 20 }

// 合并（浅拷贝）
const merged = Object.assign({}, obj, { d: 4 });
console.log(merged); // { a: 1, b: 2, c: 3, d: 4 }

// 原型操作
const proto = { inherited: true };
const objWithProto = Object.create(proto);
objWithProto.own = 'own';
console.log(Object.getPrototypeOf(objWithProto) === proto); // true

// 自有属性键（包括 Symbol 与不可枚举）
const sym = Symbol('sym');
Object.defineProperty(objWithProto, sym, { value: 'symbol', enumerable: false });
console.log(Object.getOwnPropertyNames(objWithProto)); // ['own']
console.log(Object.getOwnPropertySymbols(objWithProto)); // [Symbol(sym)]
console.log(Reflect.ownKeys(objWithProto)); // ['own', Symbol(sym)]

// 判断 API
console.log(Object.is(1, 1)); // true
console.log(Object.is(NaN, NaN)); // true（与 === 不同）
console.log(Object.is(-0, 0)); // false（与 === 不同）

// 不可变性 API
const frozen2 = Object.freeze(obj);
console.log(Object.isFrozen(frozen2)); // true
const sealed2 = Object.seal(obj);
console.log(Object.isSealed(sealed2)); // true
const prevented = Object.preventExtensions(obj);
console.log(Object.isExtensible(prevented)); // false
```

### 4.5 数组创建与基础操作

```javascript
// 创建方式
const arr1 = [1, 2, 3]; // 字面量（推荐）
const arr2 = new Array(1, 2, 3); // 构造函数（不推荐）
const arr3 = new Array(3); // [empty × 3]，长度为 3 的空数组
const arr4 = Array.of(3); // [3]，解决 new Array(3) 歧义
const arr5 = Array.of(1, 2, 3); // [1, 2, 3]
const arr6 = Array.from('hello'); // ['h', 'e', 'l', 'l', 'o']
const arr7 = Array.from({ length: 3 }, (_, i) => i); // [0, 1, 2]
const arr8 = Array.from(new Set([1, 2, 2, 3])); // [1, 2, 3] 去重
const arr9 = Array.from(new Map([['a', 1], ['b', 2]])); // [['a', 1], ['b', 2]]

// 增删操作
const stack = [];
stack.push(1, 2, 3); // 末尾添加，返回新长度 3
const last = stack.pop(); // 末尾删除，返回 3

const queue = [];
queue.unshift(1, 2); // 头部添加，返回新长度 2
const first = queue.shift(); // 头部删除，返回 1

// splice：任意位置增删改
const arr = [1, 2, 3, 4, 5];
arr.splice(1, 2); // 删除索引 1 起 2 个元素，返回 [2, 3]
console.log(arr); // [1, 4, 5]
arr.splice(1, 0, 'a', 'b'); // 在索引 1 处插入
console.log(arr); // [1, 'a', 'b', 4, 5]
arr.splice(1, 2, 'x'); // 替换
console.log(arr); // [1, 'x', 4, 5]

// at()（ES2022）：支持负索引
console.log([1, 2, 3].at(-1)); // 3
console.log([1, 2, 3].at(-2)); // 2
```

### 4.6 数组迭代方法

```javascript
const numbers = [1, 2, 3, 4, 5];

// forEach：遍历，无返回值
numbers.forEach((num, index, arr) => {
  console.log(`arr[${index}] = ${num}`);
});

// map：映射为新数组
const doubled = numbers.map((num) => num * 2); // [2, 4, 6, 8, 10]

// filter：过滤
const evens = numbers.filter((num) => num % 2 === 0); // [2, 4]

// reduce：归约为单值
const sum = numbers.reduce((acc, cur) => acc + cur, 0); // 15
// reduceRight：从右向左归约
const reversed = numbers.reduceRight((acc, cur) => [...acc, cur], []); // [5, 4, 3, 2, 1]

// find / findIndex / findLast / findLastIndex
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];
const found = users.find((u) => u.id === 2); // { id: 2, name: 'Bob' }
const foundIndex = users.findIndex((u) => u.id === 2); // 1
const lastFound = users.findLast((u) => u.name.length > 3); // { id: 3, name: 'Charlie' }

// some / every：存在性判断
console.log(numbers.some((n) => n > 3)); // true
console.log(numbers.every((n) => n > 0)); // true

// includes / indexOf / lastIndexOf
console.log([1, 2, 3].includes(2)); // true
console.log([1, 2, 3].indexOf(2)); // 1
console.log([1, 2, 3, 2].lastIndexOf(2)); // 3

// entries / keys / values
for (const [index, value] of numbers.entries()) {
  console.log(index, value);
}
for (const index of numbers.keys()) {
  console.log(index);
}
for (const value of numbers.values()) {
  console.log(value);
}
```

### 4.7 数组转换方法

```javascript
// slice：切片（不改原数组）
const arr = [1, 2, 3, 4, 5];
console.log(arr.slice(1, 3)); // [2, 3]
console.log(arr.slice(-2)); // [4, 5]
console.log(arr.slice()); // [1, 2, 3, 4, 5]（浅拷贝）

// concat：合并
const merged = [1, 2].concat([3, 4], 5, [6]); // [1, 2, 3, 4, 5, 6]

// join：连接为字符串
console.log([1, 2, 3].join('-')); // '1-2-3'

// reverse / sort：原地修改
const nums = [3, 1, 4, 1, 5];
nums.reverse(); // [5, 1, 4, 1, 3]
nums.sort(); // [1, 1, 3, 4, 5]（默认按字符串排序）
nums.sort((a, b) => b - a); // [5, 4, 3, 1, 1]（数值降序）

// flat / flatMap：扁平化
const nested = [1, [2, [3, [4]]]];
console.log(nested.flat()); // [1, 2, [3, [4]]]（默认 1 层）
console.log(nested.flat(2)); // [1, 2, 3, [4]]
console.log(nested.flat(Infinity)); // [1, 2, 3, 4]

// flatMap：先 map 再 flat
const sentences = ['hello world', 'foo bar'];
const words = sentences.flatMap((s) => s.split(' ')); // ['hello', 'world', 'foo', 'bar']

// toSorted / toReversed / toSpliced / with（ES2023 不可变版本）
const original = [3, 1, 2];
const sorted = original.toSorted(); // [1, 2, 3]，original 不变
const reversed = original.toReversed(); // [2, 1, 3]
const spliced = original.toSpliced(1, 1); // [3, 2]
const withReplaced = original.with(0, 99); // [99, 1, 2]
```

### 4.8 解构赋值全集

#### 4.8.1 数组解构

```javascript
const arr = [1, 2, 3, 4, 5];

// 基本解构
const [a, b, c] = arr;
console.log(a, b, c); // 1 2 3

// 跳过元素
const [first, , third] = arr;
console.log(first, third); // 1 3

// 剩余元素
const [head, ...tail] = arr;
console.log(head); // 1
console.log(tail); // [2, 3, 4, 5]

// 默认值
const [x, y, z = 10] = [1, 2];
console.log(x, y, z); // 1 2 10

// 交换变量
let m = 1, n = 2;
[m, n] = [n, m];
console.log(m, n); // 2 1

// 嵌套解构
const nested = [1, [2, 3], 4];
const [p, [q, r], s] = nested;
console.log(p, q, r, s); // 1 2 3 4

// 解构可迭代对象
const [a1, a2, a3] = 'xyz'; // ['x', 'y', 'z']
const [first2] = new Set([1, 2, 3]); // 1
const [k, v] = new Map([['key', 'value']]); // ['key', 'value']

// 函数参数解构
function process([first, ...rest]) {
  return { first, rest };
}
console.log(process([1, 2, 3])); // { first: 1, rest: [2, 3] }
```

#### 4.8.2 对象解构

```javascript
const user = {
  name: '张三',
  age: 30,
  address: {
    city: '北京',
    district: '朝阳区',
  },
  hobbies: ['读书', '旅行'],
};

// 基本解构
const { name, age } = user;
console.log(name, age); // '张三' 30

// 重命名
const { name: userName, age: userAge } = user;
console.log(userName, userAge); // '张三' 30

// 默认值
const { name, gender = '未知' } = user;
console.log(gender); // '未知'

// 嵌套解构
const {
  address: { city, district },
  hobbies: [firstHobby],
} = user;
console.log(city, district, firstHobby); // '北京' '朝阳区' '读书'

// 剩余属性
const { name, ...rest } = user;
console.log(name); // '张三'
console.log(rest); // { age: 30, address: {...}, hobbies: [...] }

// 计算属性名解构
const key = 'name';
const { [key]: value } = user;
console.log(value); // '张三'

// 函数参数解构（常用）
function render({ name, age = 18, address: { city } = {} }) {
  return `${name} (${age}) from ${city}`;
}
console.log(render(user)); // '张三 (30) from 北京'
console.log(render({ name: '李四' })); // '李四 (18) from undefined'
```

### 4.9 展开与剩余运算符

```javascript
// 数组展开
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2]; // [1, 2, 3, 4, 5, 6]
const copy = [...arr1]; // [1, 2, 3]（浅拷贝）

// 对象展开（ES2018）
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 3, c: 4 };
const merged = { ...obj1, ...obj2 }; // { a: 1, b: 3, c: 4 }（后者覆盖前者）
const withExtra = { ...obj1, d: 5 }; // { a: 1, b: 2, d: 5 }

// 字符串展开
const chars = [...'hello']; // ['h', 'e', 'l', 'l', 'o']

// Set/Map 展开
const uniqueArr = [...new Set([1, 2, 2, 3])]; // [1, 2, 3]
const mapArr = [...new Map([['a', 1], ['b', 2]])]; // [['a', 1], ['b', 2]]

// 剩余参数
function sum(...numbers) {
  return numbers.reduce((acc, n) => acc + n, 0);
}
console.log(sum(1, 2, 3, 4)); // 10

// 剩余参数与解构结合
function process({ name, ...options }) {
  return { name, options };
}
console.log(process({ name: 'test', timeout: 100, retry: 3 }));
// { name: 'test', options: { timeout: 100, retry: 3 } }
```

### 4.10 现代对象语法

```javascript
// 可选链（Optional Chaining，ES2020）
const user = { profile: { address: { city: '北京' } } };
console.log(user?.profile?.address?.city); // '北京'
console.log(user?.settings?.theme); // undefined（不抛错）
console.log(user?.profile?.address?.zip ?? '未知'); // '未知'（空值合并）

// 空值合并（Nullish Coalescing，ES2020）
const value1 = 0 ?? 'default'; // 0（不是 undefined/null）
const value2 = '' ?? 'default'; // ''
const value3 = null ?? 'default'; // 'default'
const value4 = undefined ?? 'default'; // 'default'

// 对比 || 运算符
const value5 = 0 || 'default'; // 'default'（0 是 falsy）

// 逻辑赋值运算符（ES2021）
let count = 0;
count ||= 10; // count = 10（因为 0 是 falsy）
let name = null;
name ??= '匿名'; // name = '匿名'
let x = 5;
x &&= 10; // x = 10（因为 5 是 truthy）

// 属性简写
const name = '张三';
const age = 30;
const obj = { name, age }; // { name: '张三', age: 30 }

// 方法简写
const obj = {
  greet() {
    return 'hello';
  },
};

// 计算属性名
const key = 'dynamic';
const obj = { [key]: 'value', [`${key}Method`]() { return 'method'; } };

// Object.hasOwn（ES2022）
const obj = Object.create({ inherited: true });
obj.own = true;
console.log(Object.hasOwn(obj, 'own')); // true
console.log(Object.hasOwn(obj, 'inherited')); // false
console.log(obj.hasOwnProperty('inherited')); // false（但 obj 自身没有 hasOwnProperty，从 Object.prototype 继承）
```

## 5. 对比分析

### 5.1 对象创建四种范式对比

| 范式 | 原型来源 | 是否调用构造函数 | 私有字段支持 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| 对象字面量 | `Object.prototype` | 否 | 否 | 简单数据对象、配置 |
| `new Constructor` | `Constructor.prototype` | 是 | 是 | 实例化多个同类对象 |
| `Object.create(proto)` | 显式指定 | 否 | 否 | 原型继承、对象组合 |
| `class` | `class.prototype` | 是 | 是（`#field`） | 复杂类型层级、现代代码 |

```javascript
// 性能基准（V8）
// 1. 字面量创建最快（直接分配隐藏类）
const p1 = { x: 0, y: 0 };

// 2. class 实例化次之（构造函数开销）
class Point { constructor(x, y) { this.x = x; this.y = y; } }
const p2 = new Point(0, 0);

// 3. Object.create 最慢（需先创建原型对象）
const proto = { x: 0, y: 0 };
const p3 = Object.create(proto);
```

### 5.2 Object vs Map

| 维度 | `Object` | `Map` |
| :--- | :--- | :--- |
| 键类型 | 字符串、Symbol | 任意类型（含对象引用） |
| 键顺序 | 整数键升序 + 字符串键插入顺序 | 插入顺序 |
| 大小 | `Object.keys(o).length` | `map.size` |
| 迭代 | `for...in`（含原型链）、`Object.keys` | `for...of map`、`map.forEach` |
| 性能（频繁增删） | 慢（隐藏类迁移） | 快（哈希表优化） |
| 序列化 | 原生 JSON | 需手动转换 |
| 默认原型 | 有（`Object.prototype`） | 无 |
| 内存占用 | 小（共享原型） | 较大 |

```javascript
// 适用场景对比
// 场景 1：键为对象引用 -> 必须用 Map
const weakMap = new WeakMap();
const keyObj = {};
weakMap.set(keyObj, 'value');

// 场景 2：需要插入顺序迭代 -> Map 更直观
const map = new Map([['b', 2], ['a', 1]]);
for (const [k, v] of map) console.log(k, v); // 'b' 2, 'a' 1

// 场景 3：JSON 序列化 -> Object
const config = { host: 'localhost', port: 8080 };
const json = JSON.stringify(config);

// 场景 4：高频增删 -> Map
const cache = new Map();
for (let i = 0; i < 10000; i++) {
  cache.set(`key${i}`, i);
  if (i % 2 === 0) cache.delete(`key${i}`);
}
```

### 5.3 Array vs Set vs TypedArray

| 类型 | 元素重复 | 元素类型 | 内存布局 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| `Array` | 允许 | 任意 | 动态（哈希表或连续） | 通用有序集合 |
| `Set` | 唯一 | 任意 | 哈希表 | 去重、存在性判断 |
| `TypedArray`（如 `Int32Array`） | 允许 | 固定数值类型 | 连续内存 | 数值计算、二进制操作 |

```javascript
// 去重对比
const arr = [1, 2, 2, 3, 3, 3];
const unique1 = [...new Set(arr)]; // [1, 2, 3]（推荐）
const unique2 = arr.filter((v, i) => arr.indexOf(v) === i); // O(n²)，不推荐

// 数值计算性能对比
const size = 1000000;
const regular = new Array(size).fill(0).map((_, i) => i);
const typed = new Int32Array(size).map((_, i) => i);

console.time('regular sum');
let sum1 = 0;
for (let i = 0; i < regular.length; i++) sum1 += regular[i];
console.timeEnd('regular sum');

console.time('typed sum');
let sum2 = 0;
for (let i = 0; i < typed.length; i++) sum2 += typed[i];
console.timeEnd('typed sum'); // 通常快 2-5 倍
```

### 5.4 浅拷贝 vs 深拷贝方法对比

| 方法 | 深度 | 循环引用 | 函数 | Date | RegExp | Map/Set | 性能 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Object.assign` | 浅 | 不处理 | 引用拷贝 | 引用拷贝 | 引用拷贝 | 引用拷贝 | 最快 |
| 展开运算符 | 浅 | 不处理 | 引用拷贝 | 引用拷贝 | 引用拷贝 | 引用拷贝 | 快 |
| `JSON.parse(JSON.stringify)` | 深 | 报错 | 丢失 | 转字符串 | 转空对象 | 丢失 | 中 |
| `structuredClone` | 深 | 正确处理 | 报错 | 正确 | 正确 | 正确 | 中 |
| 自定义递归 | 可控 | 需实现 | 可处理 | 可处理 | 可处理 | 可处理 | 慢 |

```javascript
const obj = {
  date: new Date(),
  regex: /test/g,
  map: new Map([['a', 1]]),
  set: new Set([1, 2, 3]),
  nested: { x: 1 },
  arr: [1, 2, 3],
};

// structuredClone（推荐，ES2022）
const deep = structuredClone(obj);
console.log(deep.date instanceof Date); // true
console.log(deep.map instanceof Map); // true

// 循环引用处理
const cyclic = { a: 1 };
cyclic.self = cyclic;
const cloned = structuredClone(cyclic); // 正确处理，不报错
console.log(cloned.self === cloned); // true
```

## 6. 常见陷阱与反模式

### 6.1 `==` vs `===` 的隐式转换

```javascript
// 反模式：使用 == 导致意外结果
console.log(0 == false); // true
console.log('' == false); // true
console.log(null == undefined); // true
console.log([] == false); // true
console.log([0] == false); // true
console.log('0' == 0); // true

// 正确做法：始终使用 ===
console.log(0 === false); // false
console.log(null === undefined); // false
```

### 6.2 `sort` 默认按字符串排序

```javascript
// 反模式：数值排序未传比较函数
const nums = [10, 1, 2, 21];
nums.sort();
console.log(nums); // [1, 10, 2, 21]（字符串顺序！）

// 正确做法
nums.sort((a, b) => a - b); // [1, 2, 10, 21]
nums.sort((a, b) => b - a); // [21, 10, 2, 1]（降序）
```

### 6.3 `forEach` 无法 break

```javascript
// 反模式：期望 forEach 提前终止
[1, 2, 3, 4, 5].forEach((n) => {
  if (n === 3) return; // 仅跳过本次，不终止
  console.log(n); // 输出 1, 2, 4, 5
});

// 正确做法 1：使用 some/every
[1, 2, 3, 4, 5].some((n) => {
  console.log(n);
  return n === 3; // 返回 true 终止
}); // 输出 1, 2, 3

// 正确做法 2：使用 for...of
for (const n of [1, 2, 3, 4, 5]) {
  if (n === 3) break;
  console.log(n);
}
```

### 6.4 `map` 与 `parseInt` 的陷阱

```javascript
// 反模式：parseInt 接收第二个参数（索引）作为进制
const nums = ['1', '2', '3'].map(parseInt);
console.log(nums); // [1, NaN, NaN]
// parseInt('1', 0) -> 1（0 表示默认 10 进制）
// parseInt('2', 1) -> NaN（1 进制无效）
// parseInt('3', 2) -> NaN（'3' 不是二进制数字）

// 正确做法
const nums2 = ['1', '2', '3'].map((s) => parseInt(s, 10)); // [1, 2, 3]
const nums3 = ['1', '2', '3'].map(Number); // [1, 2, 3]
```

### 6.5 原型链污染

```javascript
// 反模式：合并未受信数据到对象
function merge(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
}
const malicious = JSON.parse('{"__proto__":{"isAdmin":true}}');
merge({}, malicious);
console.log({}.isAdmin); // true（所有对象被污染！）

// 正确做法 1：使用 Object.create(null)
function safeMerge(target, source) {
  const result = Object.create(null);
  for (const key of Object.keys(target)) result[key] = target[key];
  for (const key of Object.keys(source)) result[key] = source[key];
  return result;
}

// 正确做法 2：使用 Map
const map = new Map();
map.set('__proto__', { isAdmin: true });
console.log({}.isAdmin); // undefined（Map 不污染原型）
```

### 6.6 浅拷贝导致的共享引用

```javascript
// 反模式：浅拷贝嵌套对象
const original = { nested: { value: 1 } };
const copy = { ...original };
copy.nested.value = 100;
console.log(original.nested.value); // 100（被意外修改！）

// 正确做法 1：深拷贝
const deepCopy = structuredClone(original);
deepCopy.nested.value = 200;
console.log(original.nested.value); // 1

// 正确做法 2：不可变更新库（如 immer）
// import { produce } from 'immer';
// const next = produce(original, draft => { draft.nested.value = 100; });
```

### 6.7 稀疏数组的陷阱

```javascript
// 反模式：创建稀疏数组
const sparse = new Array(3); // [empty × 3]
sparse[5] = 1; // [empty × 5, 1]
console.log(sparse.length); // 6

// forEach 跳过空洞
sparse.forEach((v, i) => console.log(i, v)); // 仅输出 5 1

// map 跳过空洞
const mapped = sparse.map((v) => v * 2); // [empty × 5, 2]

// 正确做法：显式填充
const dense = new Array(3).fill(null); // [null, null, null]
const seq = Array.from({ length: 3 }, (_, i) => i); // [0, 1, 2]
```

### 6.8 `Object.keys` 顺序的误解

```javascript
// 误解：认为 Object.keys 按插入顺序
// 实际：整数键按升序，字符串键按插入顺序
const obj = {
  b: 1,
  2: 2,
  a: 3,
  1: 4,
};
console.log(Object.keys(obj)); // ['1', '2', 'b', 'a']（整数键优先）

// 正确做法：需要严格插入顺序时使用 Map
const map = new Map([
  ['b', 1],
  ['2', 2],
  ['a', 3],
  ['1', 4],
]);
console.log([...map.keys()]); // ['b', '2', 'a', '1']
```

### 6.9 `delete` 操作的性能陷阱

```javascript
// 反模式：delete 数组元素导致降级
const arr = [1, 2, 3, 4, 5];
delete arr[2];
console.log(arr); // [1, 2, empty, 4, 5]
console.log(arr.length); // 5（length 不变）

// 正确做法 1：用 splice 删除
arr.splice(2, 1); // [1, 2, 4, 5]

// 正确做法 2：用 filter 创建新数组
const filtered = arr.filter((_, i) => i !== 2);

// 对象的 delete 也会触发隐藏类迁移
const obj = { a: 1, b: 2, c: 3 };
delete obj.b; // 隐藏类迁移，性能下降
// 替代：设为 undefined（但保留键）
obj.b = undefined;
```

### 6.10 `for...in` 遍历原型链

```javascript
// 反模式：for...in 遍历数组或受原型污染的对象
const arr = [1, 2, 3];
Array.prototype.extra = 'extra';
for (const i in arr) {
  console.log(i); // '0', '1', '2', 'extra'
}

// 正确做法 1：使用 Object.keys
for (const i of Object.keys(arr)) {
  console.log(i); // '0', '1', '2'
}

// 正确做法 2：使用 for...of 或 forEach
for (const v of arr) {
  console.log(v); // 1, 2, 3
}

// 正确做法 3：hasOwnProperty 过滤
for (const i in arr) {
  if (Object.hasOwn(arr, i)) console.log(i);
}
```

## 7. 工程实践

### 7.1 不可变更新模式

```javascript
// 不可变更新的核心：始终返回新对象，不修改原对象

// 对象更新
const user = { name: '张三', age: 30, address: { city: '北京' } };

// 浅更新
const updated1 = { ...user, age: 31 };

// 深层更新
const updated2 = { ...user, address: { ...user.address, city: '上海' } };

// 数组更新
const todos = [
  { id: 1, text: 'A', done: false },
  { id: 2, text: 'B', done: false },
];

// 修改单个元素
const updatedTodos = todos.map((t) => (t.id === 2 ? { ...t, done: true } : t));

// 添加元素
const added = [...todos, { id: 3, text: 'C', done: false }];

// 删除元素
const removed = todos.filter((t) => t.id !== 1);

// 插入元素
const inserted = [...todos.slice(0, 1), { id: 1.5, text: 'X', done: false }, ...todos.slice(1)];

// 使用 immer 简化深层更新
// import { produce } from 'immer';
// const next = produce(user, draft => {
//   draft.address.city = '上海';
//   draft.age = 31;
// });
```

### 7.2 响应式系统的简化实现

```javascript
// 基于 Proxy 的响应式对象
function reactive(target) {
  const handlers = {
    get(obj, key, receiver) {
      const result = Reflect.get(obj, key, receiver);
      // 依赖收集
      track(obj, key);
      // 深层响应式
      if (typeof result === 'object' && result !== null) {
        return reactive(result);
      }
      return result;
    },
    set(obj, key, value, receiver) {
      const oldValue = obj[key];
      const result = Reflect.set(obj, key, value, receiver);
      if (oldValue !== value) {
        // 触发更新
        trigger(obj, key);
      }
      return result;
    },
    deleteProperty(obj, key) {
      const result = Reflect.deleteProperty(obj, key);
      trigger(obj, key);
      return result;
    },
  };
  return new Proxy(target, handlers);
}

// 依赖收集
const depMap = new WeakMap();
let activeEffect = null;

function track(target, key) {
  if (!activeEffect) return;
  let depsMap = depMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    depMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  dep.add(activeEffect);
}

function trigger(target, key) {
  const depsMap = depMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (dep) {
    dep.forEach((effect) => effect());
  }
}

function effect(fn) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}

// 使用示例
const state = reactive({ count: 0, name: 'counter' });
effect(() => {
  console.log(`count is ${state.count}`);
});
state.count = 1; // 输出: count is 1
state.count = 2; // 输出: count is 2
```

### 7.3 数组性能优化

```javascript
// 1. 避免在循环中创建新数组
// 反模式
const result = [];
for (let i = 0; i < 1000000; i++) {
  result.push(i * 2);
}

// 优化：预分配
const result = new Array(1000000);
for (let i = 0; i < 1000000; i++) {
  result[i] = i * 2;
}

// 2. 使用 TypedArray 处理数值
const typed = new Float64Array(1000000);
for (let i = 0; i < typed.length; i++) {
  typed[i] = i * 2;
}

// 3. 批量操作优于链式调用
// 反模式
const result = arr
  .filter((x) => x > 0)
  .map((x) => x * 2)
  .reduce((sum, x) => sum + x, 0);

// 优化：单次循环
let sum = 0;
for (let i = 0; i < arr.length; i++) {
  if (arr[i] > 0) {
    sum += arr[i] * 2;
  }
}

// 4. 使用 for...of 或传统 for 循环处理大数组
// forEach 在某些引擎中比 for 慢 2-3 倍

// 5. 避免频繁的 unshift/shift（O(n) 操作）
// 反模式：队列实现
const queue = [];
queue.push(1); // O(1)
queue.shift(); // O(n)，所有元素移动

// 优化：双指针队列
class Queue {
  constructor() {
    this.items = [];
    this.head = 0;
  }
  push(item) {
    this.items.push(item);
  }
  shift() {
    const item = this.items[this.head];
    this.head++;
    if (this.head > 1000 && this.head > this.items.length / 2) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return item;
  }
  get length() {
    return this.items.length - this.head;
  }
}
```

### 7.4 对象性能优化

```javascript
// 1. 保持隐藏类稳定：固定属性顺序
// 反模式
function createBad(x, y) {
  const obj = {};
  obj.x = x;
  if (y > 0) obj.y = y; // 条件添加属性，破坏隐藏类
  return obj;
}

// 优化：始终初始化所有属性
function createGood(x, y) {
  return { x, y: y > 0 ? y : 0 };
}

// 2. 避免delete操作
// 反模式
const obj = { a: 1, b: 2, c: 3 };
delete obj.b;

// 优化：使用新对象
const { b, ...rest } = obj;

// 3. 大对象使用 Map
// 反模式：1000+ 属性的对象
const cache = {};
for (let i = 0; i < 10000; i++) {
  cache[`key${i}`] = i;
}

// 优化：使用 Map
const cache = new Map();
for (let i = 0; i < 10000; i++) {
  cache.set(`key${i}`, i);
}

// 4. 频繁访问的属性缓存到局部变量
// 反模式
for (let i = 0; i < arr.length; i++) {
  obj.deep.nested.value += arr[i];
}

// 优化
const nested = obj.deep.nested.value;
let sum = 0;
for (let i = 0; i < arr.length; i++) {
  sum += arr[i];
}
obj.deep.nested.value = nested + sum;
```

### 7.5 链式 API 设计

```javascript
// 流式 API：基于方法返回 this 或新对象
class Pipeline {
  constructor(data) {
    this.data = data;
  }

  // 不可变链式：返回新实例
  map(fn) {
    return new Pipeline(this.data.map(fn));
  }

  filter(fn) {
    return new Pipeline(this.data.filter(fn));
  }

  reduce(fn, init) {
    return this.data.reduce(fn, init);
  }

  forEach(fn) {
    this.data.forEach(fn);
    return this;
  }

  value() {
    return this.data;
  }
}

// 使用
const result = new Pipeline([1, 2, 3, 4, 5])
  .map((x) => x * 2)
  .filter((x) => x > 4)
  .reduce((sum, x) => sum + x, 0);
console.log(result); // 24

// Builder 模式：构造复杂对象
class QueryBuilder {
  constructor() {
    this.query = { select: '*', from: '', where: [], orderBy: null, limit: null };
  }
  select(fields) { this.query.select = fields; return this; }
  from(table) { this.query.from = table; return this; }
  where(condition) { this.query.where.push(condition); return this; }
  orderBy(field) { this.query.orderBy = field; return this; }
  limit(n) { this.query.limit = n; return this; }
  build() { return this.query; }
}

const q = new QueryBuilder()
  .select('id, name')
  .from('users')
  .where('age > 18')
  .where("city = '北京'")
  .orderBy('name')
  .limit(10)
  .build();
```

## 8. 案例研究

### 8.1 案例 1：表单状态管理

```javascript
// 需求：管理一个多字段表单的状态，支持字段更新、校验、提交

// 反模式：可变状态，难以追踪变化
let formState = {
  username: '',
  email: '',
  errors: {},
};

function updateField(field, value) {
  formState[field] = value; // 直接修改，难以调试
  if (field === 'email' && !/^.+@.+$/.test(value)) {
    formState.errors.email = '无效邮箱';
  }
}

// 优化：不可变状态 + Reducer 模式
function formReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.field]: action.value,
        errors: {
          ...state.errors,
          [action.field]: validateField(action.field, action.value),
        },
      };
    case 'CLEAR_ERROR':
      const { [action.field]: _, ...restErrors } = state.errors;
      return { ...state, errors: restErrors };
    case 'RESET':
      return action.initialState;
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, submitted: true };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, submitError: action.error };
    default:
      return state;
  }
}

function validateField(field, value) {
  const validators = {
    username: (v) => (v.length < 3 ? '用户名至少 3 个字符' : null),
    email: (v) => (!/^.+@.+$/.test(v) ? '无效邮箱' : null),
  };
  return validators[field]?.(value) ?? null;
}

// 使用
let state = { username: '', email: '', errors: {}, isSubmitting: false };
state = formReducer(state, { type: 'UPDATE_FIELD', field: 'username', value: 'ab' });
console.log(state.errors.username); // '用户名至少 3 个字符'
state = formReducer(state, { type: 'UPDATE_FIELD', field: 'username', value: 'alice' });
console.log(state.errors.username); // null
```

### 8.2 案例 2：数据处理管道

```javascript
// 需求：对日志数据进行过滤、转换、聚合

const logs = [
  { level: 'ERROR', timestamp: '2024-01-01T10:00:00Z', message: 'DB connection failed' },
  { level: 'INFO', timestamp: '2024-01-01T10:01:00Z', message: 'Retrying' },
  { level: 'ERROR', timestamp: '2024-01-01T10:02:00Z', message: 'DB connection failed' },
  { level: 'WARN', timestamp: '2024-01-01T10:03:00Z', message: 'High memory' },
  { level: 'ERROR', timestamp: '2024-01-01T10:04:00Z', message: 'Timeout' },
  { level: 'INFO', timestamp: '2024-01-01T10:05:00Z', message: 'Recovery' },
];

// 链式处理
const report = logs
  // 按时间排序
  .slice()
  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  // 提取小时
  .map((log) => ({
    ...log,
    hour: new Date(log.timestamp).getHours(),
  }))
  // 仅保留 ERROR 和 WARN
  .filter((log) => ['ERROR', 'WARN'].includes(log.level))
  // 按小时分组
  .reduce((groups, log) => {
    const key = `${log.hour}:00`;
    if (!groups[key]) groups[key] = { total: 0, errors: 0, warns: 0, messages: [] };
    groups[key].total++;
    if (log.level === 'ERROR') groups[key].errors++;
    if (log.level === 'WARN') groups[key].warns++;
    groups[key].messages.push(log.message);
    return groups;
  }, {});

console.log(report);
// {
//   '10:00': {
//     total: 4,
//     errors: 3,
//     warns: 1,
//     messages: ['DB connection failed', 'DB connection failed', 'High memory', 'Timeout']
//   }
// }

// 使用 Object.groupBy（ES2024）
const grouped = Object.groupBy(logs, ({ level }) => level);
console.log(grouped.ERROR); // [3 个 ERROR 日志]
console.log(grouped.INFO);  // [2 个 INFO 日志]
```

### 8.3 案例 3：防抖与节流的实现

```javascript
// 防抖：在最后一次调用后延迟执行
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流：固定时间间隔最多执行一次
function throttle(fn, interval) {
  let lastTime = 0;
  let timer = null;
  return function (...args) {
    const now = Date.now();
    const remaining = interval - (now - lastTime);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

// 取消功能增强版
function debounceEnhanced(fn, delay) {
  let timer = null;
  const debounced = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  debounced.flush = function (...args) {
    clearTimeout(timer);
    fn.apply(this, args);
    timer = null;
  };
  return debounced;
}

// 使用
const search = debounceEnhanced((query) => {
  console.log('搜索:', query);
}, 300);
input.addEventListener('input', (e) => search(e.target.value));
button.addEventListener('click', () => search.cancel()); // 取消未执行的搜索
```

### 8.4 案例 4：深拷贝实现

```javascript
// 支持循环引用、Date、RegExp、Map、Set 的深拷贝
function deepClone(obj, hash = new WeakMap()) {
  // 原始类型与函数
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 处理循环引用
  if (hash.has(obj)) {
    return hash.get(obj);
  }

  // Date
  if (obj instanceof Date) {
    return new Date(obj);
  }

  // RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags);
  }

  // Map
  if (obj instanceof Map) {
    const clone = new Map();
    hash.set(obj, clone);
    obj.forEach((value, key) => {
      clone.set(deepClone(key, hash), deepClone(value, hash));
    });
    return clone;
  }

  // Set
  if (obj instanceof Set) {
    const clone = new Set();
    hash.set(obj, clone);
    obj.forEach((value) => {
      clone.add(deepClone(value, hash));
    });
    return clone;
  }

  // Array
  if (Array.isArray(obj)) {
    const clone = [];
    hash.set(obj, clone);
    for (let i = 0; i < obj.length; i++) {
      clone[i] = deepClone(obj[i], hash);
    }
    return clone;
  }

  // 普通对象
  const clone = Object.create(Object.getPrototypeOf(obj));
  hash.set(obj, clone);
  for (const key of Reflect.ownKeys(obj)) {
    clone[key] = deepClone(obj[key], hash);
  }
  return clone;
}

// 测试
const original = {
  num: 1,
  str: 'hello',
  date: new Date(),
  regex: /test/g,
  arr: [1, { nested: true }],
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
};
original.self = original; // 循环引用

const cloned = deepClone(original);
console.log(cloned.date instanceof Date); // true
console.log(cloned.map instanceof Map); // true
console.log(cloned.self === cloned); // true（循环引用正确处理）
console.log(cloned.arr[1] !== original.arr[1]); // true（深拷贝）
```

### 8.5 案例 5：事件系统实现

```javascript
// 基于对象的发布订阅模式
class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(handler);
    return () => this.off(event, handler); // 返回取消订阅函数
  }

  once(event, handler) {
    const wrapper = (...args) => {
      handler(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  off(event, handler) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  emit(event, ...args) {
    const handlers = this.events.get(event);
    if (handlers) {
      // 复制一份，避免回调中修改集合导致迭代异常
      [...handlers].forEach((handler) => {
        try {
          handler(...args);
        } catch (err) {
          console.error('事件处理错误:', err);
        }
      });
    }
    return this;
  }

  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  listenerCount(event) {
    return this.events.get(event)?.size ?? 0;
  }
}

// 使用
const emitter = new EventEmitter();
const unsubscribe = emitter.on('data', (data) => console.log('收到:', data));
emitter.emit('data', { x: 1 }); // 输出: 收到: { x: 1 }
unsubscribe();
emitter.emit('data', { x: 2 }); // 无输出

emitter.once('connect', () => console.log('已连接'));
emitter.emit('connect'); // 输出: 已连接
emitter.emit('connect'); // 无输出
```

## 9. 习题

### 9.1 选择题

**1. 以下代码的输出是什么？**

```javascript
const obj = { 2: 'b', 1: 'a', x: 'c' };
console.log(Object.keys(obj));
```

- A. `['2', '1', 'x']`
- B. `['1', '2', 'x']`
- C. `['x', '1', '2']`
- D. `['x', '2', '1']`

**答案**：B

**解析**：`Object.keys` 对整数键（如 `'1'`、`'2'`）按升序排列，对字符串键按插入顺序。因此整数键 `'1'`、`'2'` 排在前，字符串键 `'x'` 排在后。

---

**2. 以下代码的输出是什么？**

```javascript
const arr = [1, 2, 3];
arr[10] = 10;
console.log(arr.length);
arr.forEach((v) => console.log(v));
```

- A. 11；输出 1, 2, 3, undefined × 7, 10
- B. 4；输出 1, 2, 3, 10
- C. 11；输出 1, 2, 3, 10
- D. 4；输出 1, 2, 3

**答案**：C

**解析**：设置 `arr[10]` 后 `length` 自动变为 11；`forEach` 跳过空洞（empty slots），只输出实际赋值的元素 1, 2, 3, 10。

---

**3. 以下哪种方法可以正确深拷贝包含 `Date` 对象和循环引用的对象？**

- A. `JSON.parse(JSON.stringify(obj))`
- B. `Object.assign({}, obj)`
- C. `{ ...obj }`
- D. `structuredClone(obj)`

**答案**：D

**解析**：`structuredClone` 是 ES2022 引入的原生深拷贝 API，支持 `Date`、`RegExp`、`Map`、`Set`、循环引用等复杂结构。`JSON` 方法会丢失 `Date`（转为字符串）且对循环引用报错；`Object.assign` 与展开运算符仅浅拷贝。

### 9.2 简答题

**1. 解释 V8 引擎中隐藏类（Hidden Class）与内联缓存（Inline Cache）如何优化对象属性访问。**

**参考答案**：

V8 为每个对象的"形状"（属性键的有序集合）维护一个隐藏类（Map）。当对象添加属性时，V8 通过隐藏类迁移（Transition）创建新的隐藏类，记录属性的内存偏移量。

内联缓存（Inline Cache）是 JIT 编译器的优化：对于热点代码中的属性访问点（如 `obj.x`），V8 缓存上次的隐藏类与偏移量。下次访问时若隐藏类匹配，直接按偏移量读取内存，跳过哈希表查找，复杂度从 $O(1)$（带较大常数）降至接近 $O(1)$（极小常数）。

破坏隐藏类稳定性的操作包括：条件性添加属性（不同实例形状不同）、`delete` 操作、动态修改属性顺序。工程实践应保持构造函数中属性初始化顺序固定。

---

**2. 对比 `Object.keys`、`for...in`、`Reflect.ownKeys` 三者的差异。**

**参考答案**：

- `Object.keys(obj)`：返回对象自身的可枚举字符串键（含整数键但按升序），不包括 Symbol 键与原型链属性。
- `for...in`：遍历对象自身与原型链上所有可枚举字符串键（含 Symbol 键？不，Symbol 键不被 `for...in` 枚举），顺序为整数键升序 + 字符串键插入顺序。
- `Reflect.ownKeys(obj)`：返回对象自身的所有键（含字符串、Symbol、不可枚举），按 `[整数键升序, 字符串键插入顺序, Symbol 键插入顺序]` 排列，不包括原型链。

### 9.3 编程题

**1. 实现一个 `memoize` 函数，缓存函数的计算结果。**

```javascript
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// 测试
const slowSquare = (n) => {
  console.log('计算:', n);
  return n * n;
};
const memoized = memoize(slowSquare);
console.log(memoized(5)); // 输出: 计算: 5; 25
console.log(memoized(5)); // 输出: 25（不重新计算）
```

**进阶要求**：支持对象参数，使用 WeakMap 缓存。

```javascript
function memoizeAdvanced(fn) {
  const cache = new WeakMap();
  return function (arg) {
    if (cache.has(arg)) {
      return cache.get(arg);
    }
    const result = fn.call(this, arg);
    cache.set(arg, result);
    return result;
  };
}
```

---

**2. 实现一个 `groupBy` 函数，按指定键将数组分组。**

```javascript
function groupBy(arr, keyOrFn) {
  const result = {};
  const getKey = typeof keyOrFn === 'function'
    ? keyOrFn
    : (item) => item[keyOrFn];
  for (const item of arr) {
    const key = getKey(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

// 测试
const users = [
  { name: 'Alice', dept: 'Engineering' },
  { name: 'Bob', dept: 'Sales' },
  { name: 'Charlie', dept: 'Engineering' },
];
console.log(groupBy(users, 'dept'));
// {
//   Engineering: [{ name: 'Alice', ... }, { name: 'Charlie', ... }],
//   Sales: [{ name: 'Bob', ... }]
// }

console.log(groupBy(users, (u) => u.name.length));
// {
//   5: [{ name: 'Alice', ... }, { name: 'Bob', ... }]（注意 Bob 长度是 3）
// }
```

---

**3. 实现一个观察者模式，支持订阅、发布、取消订阅。**

```javascript
class Observable {
  constructor() {
    this.subscribers = new Set();
  }

  subscribe(handler) {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  notify(data) {
    [...this.subscribers].forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error('订阅者处理错误:', err);
      }
    });
  }

  unsubscribe(handler) {
    return this.subscribers.delete(handler);
  }

  clear() {
    this.subscribers.clear();
  }
}

// 测试
const obs = new Observable();
const unsub = obs.subscribe((data) => console.log('订阅者 1:', data));
obs.subscribe((data) => console.log('订阅者 2:', data));
obs.notify('hello');
// 输出:
// 订阅者 1: hello
// 订阅者 2: hello
unsub();
obs.notify('world');
// 输出:
// 订阅者 2: world
```

## 10. 参考文献

[1] Ecma International. 2026. *ECMAScript 2026 Language Specification* (27th ed.). ECMA-262. https://262.ecma-international.org/27.0/

[2] Brendan Eich. 1998. *JavaScript: The First Ten Years*. In *Proceedings of the ACM SIGPLAN Conference on History of Programming Languages* (HOPL IV). ACM, New York, NY, USA, 1-22. DOI: https://doi.org/10.1145/3386326

[3] David Flanagan. 2020. *JavaScript: The Definitive Guide* (7th ed.). O'Reilly Media, Sebastopol, CA, USA.

[4] Axel Rauschmayer. 2024. *Exploring ES2024 and ES2025*. ExploringJS. https://exploringjs.com/

[5] Mathias Bynens and Benedikt Meurer. 2018. *JavaScript engine fundamentals: Shapes and Inline Caches*. V8 Dev Blog. https://v8.dev/blog/fast-properties

[6] Vyacheslav Egorov. 2017. *V8: Full-Codegen, Crankshaft, TurboFan, Ignition*. In *Proceedings of the ACM SIGPLAN International Conference on Systems, Programming, Languages and Applications* (SPLASH). ACM, New York, NY, USA. DOI: https://doi.org/10.1145/3140587

[7] Stefan Brunthaler. 2010. *Inline caching meets quickening*. In *Proceedings of the ACM Symposium on Dynamic Languages* (DLS '10). ACM, New York, NY, USA, 41-52. DOI: https://doi.org/10.1145/1869631.1869637

[8] Ecma International. 2022. *Structured Clone Algorithm*. ECMA-262, Section 2.7. https://tc39.es/ecma262/#sec-structuredclone

[9] Tim Foley and Mathias Bynens. 2019. *ES2019 Feature: Stable Array.prototype.sort*. V8 Dev Blog. https://v8.dev/blog/v8-release-76

[10] Daniel Ehrenberg. 2018. *Proposal: Object shorthand improvements*. TC39 Proposal ECMA-262. https://github.com/tc39/proposal-shorthand-improvements

[11] Jordan Harband. 2021. *Proposal: Object.hasOwn*. TC39 Proposal ECMA-262. https://github.com/tc39/proposal-accessible-object-hasownproperty

[12] Hemanth H.M. and Kevin Gibbons. 2023. *Proposal: Array.prototype.group*. TC39 Proposal ECMA-262. https://github.com/tc39/proposal-array-grouping

[13] Kyle Simpson. 2020. *You Don't Know JS Yet: Objects & Classes* (2nd ed.). Leanpub.

[14] Addy Osmani. 2017. *Learning JavaScript Design Patterns* (2nd ed.). O'Reilly Media, Sebastopol, CA, USA. DOI: https://doi.org/10.1201/9781003338180

## 11. 延伸阅读

### 11.1 规范与标准

- **ECMAScript 规范**：[TC39 ECMA-262](https://tc39.es/ecma262/)，重点阅读 *Ordinary Object Internal Methods*、*Indexed Collections* 章节。
- **TC39 提案**：[Records & Tuples](https://github.com/tc39/proposal-record-tuple)（不可变数据结构）、[Deep Path Properties for Record](https://github.com/tc39/proposal-deep-path-properties-for-record)。
- **WhatWG HTML 规范**：[Structured Clone](https://html.spec.whatwg.org/multipage/structured-data.html#safe-passing-of-structured-data)，理解 `structuredClone` 的支持类型。

### 11.2 引擎实现

- **V8 博客**：[Fast Properties in V8](https://v8.dev/blog/fast-properties)、[Elements kinds in V8](https://v8.dev/blog/elements-kinds)。
- **JavaScriptCore**：[DFG JIT Inline Caching](https://webkit.org/blog/3210/dfg-jit-optimizations-for-array-accesses/)。
- **SpiderMonkey**：[Shape Trees and ICs](https://hacks.mozilla.org/2017/02/creating-a-js-engine-1/)。

### 11.3 进阶书籍

- *You Don't Know JS Yet: Objects & Classes*（Kyle Simpson）：深入原型链与 `this` 绑定。
- *JavaScript: The Definitive Guide*（David Flanagan，第 7 版）：对象与数组章节为权威参考。
- *High Performance JavaScript*（Nicholas C. Zakas）：V8 优化与性能陷阱。
- *The Principles of Object-Oriented JavaScript*（Nicholas C. Zakas）：原型继承的工程实践。

### 11.4 实践库

- **Immer**：[immerjs/immer](https://github.com/immerjs/immer)，基于 Proxy 的不可变更新。
- **Lodash**：[lodash/lodash](https://github.com/lodash/lodash)，提供 `cloneDeep`、`merge`、`groupBy` 等工具。
- **Ramda**：[ramda/ramda](https://github.com/ramda/ramda)，函数式数据处理工具库。
- **RxJS**：[ReactiveX/rxjs](https://github.com/ReactiveX/rxjs)，基于可观察对象的响应式编程。

## 附录 A：对象 API 速查表

| 方法 | 作用 | 是否静态 | 返回值 |
| :--- | :--- | :--- | :--- |
| `Object.create(proto, desc)` | 创建指定原型的对象 | 是 | 新对象 |
| `Object.assign(target, ...src)` | 合并源对象到目标 | 是 | 目标对象 |
| `Object.keys(o)` | 自有可枚举字符串键 | 是 | 字符串数组 |
| `Object.values(o)` | 自有可枚举值 | 是 | 值数组 |
| `Object.entries(o)` | 自有可枚举键值对 | 是 | `[k, v]` 数组 |
| `Object.fromEntries(entries)` | 从键值对创建对象 | 是 | 新对象 |
| `Object.freeze(o)` | 冻结对象（不可改/增/删） | 是 | 冻结的对象 |
| `Object.seal(o)` | 密封对象（不可增/删，可改） | 是 | 密封的对象 |
| `Object.preventExtensions(o)` | 禁止扩展（不可增） | 是 | 原对象 |
| `Object.isFrozen(o)` | 是否冻结 | 是 | 布尔值 |
| `Object.isSealed(o)` | 是否密封 | 是 | 布尔值 |
| `Object.isExtensible(o)` | 是否可扩展 | 是 | 布尔值 |
| `Object.getPrototypeOf(o)` | 获取原型 | 是 | 原型对象 |
| `Object.setPrototypeOf(o, p)` | 设置原型 | 是 | 原对象 |
| `Object.defineProperty(o, k, d)` | 定义属性 | 是 | 原对象 |
| `Object.defineProperties(o, descs)` | 批量定义属性 | 是 | 原对象 |
| `Object.getOwnPropertyDescriptor(o, k)` | 获取属性描述符 | 是 | 描述符对象 |
| `Object.getOwnPropertyNames(o)` | 自有字符串键（含不可枚举） | 是 | 字符串数组 |
| `Object.getOwnPropertySymbols(o)` | 自有 Symbol 键 | 是 | Symbol 数组 |
| `Object.getOwnPropertyDescriptors(o)` | 所有自有属性描述符 | 是 | 描述符映射 |
| `Object.hasOwn(o, k)` | 是否有自有属性 | 是 | 布尔值 |
| `Object.is(a, b)` | 同值相等判断 | 是 | 布尔值 |
| `Reflect.ownKeys(o)` | 所有自有键 | 是 | 键数组 |

## 附录 B：数组方法分类速查

### B.1 修改原数组（Mutating）

| 方法 | 作用 | 返回值 |
| :--- | :--- | :--- |
| `push(...items)` | 末尾添加 | 新长度 |
| `pop()` | 末尾删除 | 删除的元素 |
| `unshift(...items)` | 头部添加 | 新长度 |
| `shift()` | 头部删除 | 删除的元素 |
| `splice(start, n, ...items)` | 任意位置增删改 | 删除的元素数组 |
| `reverse()` | 原地反转 | 原数组引用 |
| `sort(cmp)` | 原地排序 | 原数组引用 |
| `fill(v, start, end)` | 填充 | 原数组引用 |
| `copyWithin(target, start, end)` | 内部复制 | 原数组引用 |

### B.2 返回新数组（Non-mutating）

| 方法 | 作用 | 返回值 |
| :--- | :--- | :--- |
| `slice(start, end)` | 切片 | 新数组 |
| `concat(...arrs)` | 合并 | 新数组 |
| `map(fn)` | 映射 | 新数组 |
| `filter(fn)` | 过滤 | 新数组 |
| `flat(depth)` | 扁平化 | 新数组 |
| `flatMap(fn)` | map + flat | 新数组 |
| `toSorted(cmp)` | 排序副本 | 新数组（ES2023） |
| `toReversed()` | 反转副本 | 新数组（ES2023） |
| `toSpliced(start, n)` | 删除副本 | 新数组（ES2023） |
| `with(i, v)` | 替换副本 | 新数组（ES2023） |

### B.3 查找与判断

| 方法 | 作用 | 返回值 |
| :--- | :--- | :--- |
| `indexOf(v)` | 查找索引 | 索引或 -1 |
| `lastIndexOf(v)` | 反向查找 | 索引或 -1 |
| `includes(v)` | 是否包含 | 布尔值 |
| `find(fn)` | 查找首个匹配 | 元素或 undefined |
| `findIndex(fn)` | 查找首个匹配索引 | 索引或 -1 |
| `findLast(fn)` | 反向查找 | 元素或 undefined |
| `findLastIndex(fn)` | 反向查找索引 | 索引或 -1 |
| `some(fn)` | 是否存在匹配 | 布尔值 |
| `every(fn)` | 是否全部匹配 | 布尔值 |
| `at(i)` | 索引访问（支持负数） | 元素或 undefined |

### B.4 归约与迭代

| 方法 | 作用 | 返回值 |
| :--- | :--- | :--- |
| `forEach(fn)` | 遍历 | undefined |
| `reduce(fn, init)` | 归约 | 累积值 |
| `reduceRight(fn, init)` | 反向归约 | 累积值 |
| `join(sep)` | 连接为字符串 | 字符串 |
| `entries()` | 键值对迭代器 | Iterator |
| `keys()` | 键迭代器 | Iterator |
| `values()` | 值迭代器 | Iterator |

## 附录 C：解构赋值语法速查

### C.1 数组解构

```javascript
// 基本形式
const [a, b] = arr;
const [a, b, ...rest] = arr;
const [a, , c] = arr;              // 跳过
const [a = 1, b = 2] = arr;        // 默认值
const [a: x, b: y] = arr;          // 错误！数组解构不支持重命名
const [first, ...rest] = 'hello';  // ['h', ['e', 'l', 'l', 'o']]
```

### C.2 对象解构

```javascript
// 基本形式
const { a, b } = obj;
const { a: x, b: y } = obj;        // 重命名
const { a = 1, b = 2 } = obj;      // 默认值
const { a, ...rest } = obj;        // 剩余属性
const { a: { b } } = obj;          // 嵌套解构
const { ['a']: x } = obj;          // 计算属性名
```

### C.3 函数参数解构

```javascript
// 默认值与解构结合
function f({ a = 1, b = 2 } = {}) { return [a, b]; }
console.log(f());           // [1, 2]
console.log(f({ a: 10 }));  // [10, 2]

// 数组参数解构
function g([first, ...rest] = []) { return { first, rest }; }
console.log(g([1, 2, 3]));  // { first: 1, rest: [2, 3] }
console.log(g());           // { first: undefined, rest: [] }
```

## 附录 D：性能优化 Checklist

### D.1 对象优化

- [ ] 构造函数中按固定顺序初始化所有属性（避免隐藏类迁移）
- [ ] 避免条件性添加属性（如 `if (cond) obj.x = 1`）
- [ ] 避免 `delete` 操作（改用对象扩展或 `undefined` 赋值）
- [ ] 大对象（>100 属性）考虑使用 `Map`
- [ ] 频繁访问的深层属性缓存到局部变量
- [ ] 字面量创建对象优先于 `new Object()`
- [ ] 避免 `Object.create(null)` 用于性能敏感路径（无原型但有字典模式开销）

### D.2 数组优化

- [ ] 预分配数组长度（`new Array(n)` + 索引赋值优于 `push`）
- [ ] 避免 `arr[i] = undefined` 创建空洞
- [ ] 数值数据使用 `TypedArray`（`Int32Array`、`Float64Array`）
- [ ] 大数组遍历优先 `for` 或 `for...of`，避免 `forEach`
- [ ] 链式 `filter().map().reduce()` 在大数据集上合并为单次 `for` 循环
- [ ] 频繁的 `shift`/`unshift` 改用双指针队列
- [ ] 去重使用 `[...new Set(arr)]` 而非 `filter + indexOf`

### D.3 解构与展开优化

- [ ] 简单赋值优先解构（`const { a } = obj` 比 `const a = obj.a` 可读性更好）
- [ ] 大对象展开会复制全部属性，性能敏感场景考虑 `Object.assign` 或按需取值
- [ ] 避免在循环中展开大对象
- [ ] 函数参数超过 3 个时使用对象解构

## 附录 E：ES2024-2026 新特性预览

### E.1 Object.groupBy / Map.groupBy（ES2024）

```javascript
const inventory = [
  { name: 'asparagus', type: 'vegetables', quantity: 5 },
  { name: 'bananas', type: 'fruit', quantity: 0 },
  { name: 'goat', type: 'meat', quantity: 23 },
  { name: 'cherries', type: 'fruit', quantity: 12 },
];

// Object.groupBy：分组为对象
const result = Object.groupBy(inventory, ({ type }) => type);
console.log(result);
// {
//   vegetables: [{ name: 'asparagus', ... }],
//   fruit: [{ name: 'bananas', ... }, { name: 'cherries', ... }],
//   meat: [{ name: 'goat', ... }]
// }

// Map.groupBy：分组为 Map（键可为任意类型）
const map = Map.groupBy(inventory, ({ quantity }) =>
  quantity > 10 ? 'plenty' : 'sparse'
);
console.log(map.get('plenty')); // [{ name: 'goat', ... }, { name: 'cherries', ... }]
```

### E.2 不可变数组方法（ES2023）

```javascript
// toSorted / toReversed / toSpliced / with：均返回新数组，不改原数组
const arr = [3, 1, 2];
const sorted = arr.toSorted();          // [1, 2, 3]，arr 不变
const reversed = arr.toReversed();      // [2, 1, 3]
const spliced = arr.toSpliced(1, 1);    // [3, 2]
const replaced = arr.with(0, 99);       // [99, 1, 2]
```

### E.3 Records & Tuples（Stage 3 提案）

```javascript
// 不可变数据结构原语
const record = #{ x: 1, y: 2 };          // Record
const tuple = #[1, 2, 3];                // Tuple
console.log(#{ x: 1 } === #{ x: 1 });    // true（值相等）
console.log(#[1, 2] === #[1, 2]);        // true

// 不可变更新
const updated = #{ ...record, z: 3 };    // #{ x: 1, y: 2, z: 3 }
```

### E.4 Promise.try（ES2024）

```javascript
// 统一同步/异步错误处理
const result = await Promise.try(() => {
  if (Math.random() > 0.5) return 'sync';
  return fetch('/api').then(r => r.json());
});
```

## 附录 F：常见问题 FAQ

### F.1 为什么 `typeof null === 'object'`？

历史遗留 bug。JavaScript 早期实现中，值的类型用前 3 位标识（`000` 为对象）。`null` 在内存中全为 0，故被误判为对象类型。已无法修正，会破坏大量现有代码。

### F.2 为什么 `[] == false` 为 `true`？

`==` 的隐式转换规则：
1. `[]` 与 `false` 比较，`false` 转为 `0`；
2. `[]` 与 `0` 比较，`[]` 调用 `valueOf()` 返回空数组，再调用 `toString()` 返回 `''`；
3. `''` 与 `0` 比较，`''` 转为 `0`；
4. `0 == 0` 为 `true`。

**结论**：始终使用 `===`。

### F.3 `Object.create(null)` 与 `{}` 的区别？

`Object.create(null)` 创建的对象无原型，不继承 `Object.prototype` 的方法（如 `toString`、`hasOwnProperty`），且在 `for...in` 中不会遍历原型链属性。适用于：
- 字典/映射场景（避免原型污染）；
- 元编程（避免属性查找意外命中原型方法）。

### F.4 为什么 `0.1 + 0.2 !== 0.3`？

IEEE 754 双精度浮点数无法精确表示十进制小数。`0.1` 与 `0.2` 的二进制表示为无限循环小数，被截断后产生误差。

**解决方案**：
- 使用整数运算（金额以分为单位）；
- 使用 `Number.EPSILON` 比较浮点数：`Math.abs(a - b) < Number.EPSILON`；
- 使用 `toFixed` 格式化输出。

### F.5 数组的 `length` 属性为何可写？

`length` 是数组对象的特殊属性，其值与最大数字索引联动。写 `length` 可截断或扩展数组：

```javascript
const arr = [1, 2, 3, 4, 5];
arr.length = 3;     // 截断为 [1, 2, 3]
arr.length = 5;     // 扩展为 [1, 2, 3, empty × 2]
```

这一特性可用于清空数组：`arr.length = 0`。

### F.6 何时用 `for...of`，何时用 `for...in`？

- `for...of`：遍历**可迭代对象**（Array、Map、Set、String、arguments、NodeList 等），按值迭代，推荐用于数组。
- `for...in`：遍历对象的**可枚举属性键**（含原型链），不推荐用于数组（会遍历非数字键与原型方法）。

### F.7 `Object.freeze` 是深冻结吗？

不是。`Object.freeze` 仅冻结对象自身的直接属性，嵌套对象仍可修改。深冻结需递归：

```javascript
function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  Object.values(obj).forEach(deepFreeze);
  return obj;
}
```

## 附录 G：术语对照表

| 英文术语 | 中文译名 | 说明 |
| :--- | :--- | :--- |
| Property Descriptor | 属性描述符 | 描述属性行为的四元组 |
| Data Descriptor | 数据描述符 | 含 `value`/`writable` |
| Accessor Descriptor | 访问器描述符 | 含 `get`/`set` |
| Prototype Chain | 原型链 | 对象通过 `[[Prototype]]` 构成的链 |
| Hidden Class / Map | 隐藏类 | V8 中对象形状的内部表示 |
| Inline Cache (IC) | 内联缓存 | JIT 缓存属性访问的优化机制 |
| Destructuring | 解构赋值 | 从数组/对象提取值的语法 |
| Spread Operator | 展开运算符 | `...` 展开可迭代对象 |
| Rest Parameter | 剩余参数 | `...` 收集剩余参数 |
| Optional Chaining | 可选链 | `?.` 安全访问深层属性 |
| Nullish Coalescing | 空值合并 | `??` 仅在 `null`/`undefined` 时取默认值 |
| Shallow Copy | 浅拷贝 | 仅复制一层 |
| Deep Copy | 深拷贝 | 递归复制所有层级 |
| Sparse Array | 稀疏数组 | 含空洞的数组 |
| Dense Array | 密集数组 | 无空洞的数组 |
| Packed / Holey | 紧凑 / 空洞 | V8 数组元素模式分类 |

## 附录 H：版本兼容性矩阵

| 特性 | ES 版本 | Node.js | Chrome | Firefox | Safari |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 解构赋值 | ES2015 | 6+ | 49+ | 41+ | 8+ |
| 展开运算符（数组） | ES2015 | 6+ | 46+ | 16+ | 8+ |
| 对象展开 | ES2018 | 8.3+ | 60+ | 55+ | 11.1+ |
| `Object.fromEntries` | ES2019 | 12+ | 73+ | 63+ | 12.1+ |
| 可选链 `?.` | ES2020 | 14+ | 80+ | 74+ | 13.1+ |
| 空值合并 `??` | ES2020 | 14+ | 80+ | 72+ | 13.1+ |
| `Object.hasOwn` | ES2022 | 16.9+ | 93+ | 92+ | 15.4+ |
| `Array.at()` | ES2022 | 16.6+ | 92+ | 90+ | 15.4+ |
| `structuredClone` | ES2022 | 17+ | 98+ | 94+ | 15.4+ |
| 私有字段 `#field` | ES2022 | 12+ | 74+ | 90+ | 14.1+ |
| 不可变数组方法 | ES2023 | 20+ | 110+ | 115+ | 16+ |
| `Object.groupBy` | ES2024 | 21+ | 117+ | 119+ | 17.4+ |

---

### 更新日志 (Changelog)

- 2026-04-05: 细化原型链与常用数组高阶函数。
- 2026-04-05: 扩写内容，增加详细的对象和数组操作、示例和最佳实践。
- 2026-07-21: 全面重构为金标准文档，补充学习目标、形式化定义、理论推导、对比分析、陷阱反模式、工程实践、案例研究、习题、参考文献、延伸阅读及附录 A-H，覆盖 ES2024-2026 新特性。
