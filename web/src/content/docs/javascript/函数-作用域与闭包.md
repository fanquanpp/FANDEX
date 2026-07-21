---
order: 60
tags:
  - javascript
  - functional
difficulty: intermediate
title: 函数、作用域与闭包
module: javascript
category: 'JS Basics'
description: 函数声明、箭头函数、作用域链、闭包原理、this 绑定机制、高阶函数、柯里化、尾调用优化的形式化定义与工程实践。
author: Anonymous
updated: '2026-07-21'
related:
  - javascript/断言
  - javascript/Unicode属性转义
  - javascript/自定义Error
  - javascript/浏览器对象模型
  - javascript/ES6+新特性
prerequisites:
  - javascript/语法速查
  - javascript/控制流
---

# 函数、作用域与闭包

## 1. 引言

函数是 JavaScript 中"一等公民"（first-class citizen）的抽象机制：它可以赋值给变量、作为参数传递、从函数返回、存储在数据结构中。这种设计让 JavaScript 拥有函数式编程的能力，但也带来了一些独特的语义——作用域链、闭包、`this` 绑定——这些机制是 React Hooks、Vue 响应式、Node.js 事件循环等现代框架与运行时的基石。

作用域决定变量可见性，闭包决定变量生命周期，`this` 决定函数执行上下文。三者共同构成了 JavaScript 函数的执行模型。本文档从历史演进、形式化定义、理论推导、工程实践、陷阱分析、案例研究六个维度系统讲解这三个核心概念，并扩展到高阶函数、柯里化、尾调用优化等函数式编程技术。

## 2. 学习目标

本节采用 Anderson & Krathwohl 修订版 Bloom 分类法，按认知层级划分学习目标：

| 认知层级 | 学习目标描述 |
| --- | --- |
| 记忆（Remembering） | 列举函数声明的 5 种形态；背诵作用域链查找规则；列举 `this` 的 4 种绑定规则 |
| 理解（Understanding） | 解释词法作用域与动态作用域的差异；用自己的话描述闭包的内存模型；区分 call/apply/bind 的语义 |
| 应用（Applying） | 在生产代码中正确使用闭包实现私有化；用柯里化构造可复用的高阶函数；用箭头函数避免 `this` 丢失问题 |
| 分析（Analyzing） | 对比函数声明、函数表达式、箭头函数在提升、`this`、`arguments`、`prototype` 上的差异；分析循环中闭包变量共享问题的根因 |
| 评价（Evaluating） | 评估一个高阶函数封装的内存开销；判断尾调用优化在当前引擎下的可用性；评价 React Hooks 闭包陷阱的影响 |
| 创造（Creating） | 设计一个完整的函数式工具库（compose、pipe、curry、memoize）；基于闭包实现一个状态机库 |

完成本节学习后，读者应能独立分析任意 JavaScript 函数的执行上下文、作用域链、`this` 指向，并写出符合工程规范的函数式代码。

## 3. 历史动机与背景

### 3.1 JavaScript 函数演化时间线

| 年份 | 关键里程碑 | 解决的核心问题 |
| --- | --- | --- |
| 1995 | Brendan Eich 受 Scheme 启发，将函数设计为一等公民 | 让 JS 具备函数式编程能力 |
| 1995 | 函数声明 + 函数表达式 + `arguments` + `this` | 基础函数语义 |
| 1999 | ES3 引入 `apply`、`call` | 显式 `this` 绑定 |
| 2009 | ES5 引入 `bind`、严格模式、`Function.prototype.bind` | 永久 `this` 绑定、修复作用域泄漏 |
| 2015 | ES6 引入箭头函数、`let`/`const` 块作用域、默认参数、剩余参数、解构参数 | 简化语法、修复 `this` 与 `arguments` 痛点 |
| 2015 | ES6 引入生成器函数（`function*`） | 协程式异步编程、惰性序列 |
| 2017 | ES8 引入 `async function` | 基于 Promise 的语法糖，简化异步代码 |
| 2019 | ES10 引入 `flatMap`、`flat` | 函数式数组操作 |
| 2021 | ES12 引入 `WeakRef`、`FinalizationRegistry` | 弱引用与对象终结回调 |
| 2024 | ES15 引入 `Promise.withResolvers` | 函数式 Promise 构造简化 |

### 3.2 设计动机分析

JavaScript 函数的设计受三个历史因素影响：

1. **Scheme 血统**：Brendan Eich 原本被要求设计一门"看起来像 Java 的 Scheme"，因此函数是一等公民，闭包是语言原生特性。这与 Java 当时不支持闭包形成对比。
2. **Java 外壳**：为了迎合 1995 年的 Java 热潮，语法借鉴 Java 的 `function` 关键字（后来改为 `function`）。`this` 的引入是为了让 JS 像 Java 一样支持面向对象，但与 Scheme 风格冲突。
3. **Web 浏览器环境**：DOM 事件回调要求函数作为参数传递，进一步强化了一等公民地位；但也引入了 `this` 在回调中丢失的问题。

理解这三个历史因素，可以解释为什么 JavaScript 的函数与 `this` 看起来"奇怪"——它本质上是 Scheme 内核 + Java 语法 + 浏览器约束的混合体。

## 4. 形式化定义

### 4.1 函数的形式化定义

JavaScript 函数可形式化为七元组：

$$
F = \langle \text{Params}, \text{Body}, \text{Closure}, \text{This}, \text{Args}, \text{HomeObject}, \text{Prototype} \rangle
$$

- $\text{Params}$：形参列表
- $\text{Body}$：函数体（AST 节点）
- $\text{Closure}$：词法环境引用（闭包）
- $\text{This}$：`this` 绑定（动态或词法）
- $\text{Args}$：`arguments` 对象（箭头函数无）
- $\text{HomeObject}$：`super` 引用（仅方法定义）
- $\text{Prototype}$：`Function.prototype` 引用

### 4.2 作用域的形式化定义

作用域是一个映射 $\sigma: \text{Identifier} \rightarrow \text{Location}$。作用域链是一个栈：

$$
\Sigma = [\sigma_0, \sigma_1, \dots, \sigma_n]
$$

变量查找算法：

$$
\text{lookup}(id, \Sigma) = \begin{cases}
\sigma_n(id) & \text{if } id \in \text{dom}(\sigma_n) \\
\text{lookup}(id, \Sigma \setminus \sigma_n) & \text{otherwise}
\end{cases}
$$

JavaScript 使用**词法作用域**（lexical scope），即 $\Sigma$ 在函数定义时确定，而非调用时。这与 bash 等动态作用域语言不同。

### 4.3 闭包的形式化定义

闭包是一个二元组 $\langle F, \Sigma_F \rangle$，其中：

- $F$ 是函数本身
- $\Sigma_F$ 是函数定义时的作用域链快照

闭包的求值规则：

$$
\text{eval}(\langle F, \Sigma_F \rangle, \text{args}) = \text{evalBody}(F.\text{Body}, \Sigma_F \cdot [\text{args}])
$$

这意味着即使函数在定义作用域外被调用，仍能访问定义时的变量。

### 4.4 `this` 绑定的形式化语义

设函数 $f$ 被调用为 `obj.method(args)`，则 `this` 绑定规则（按优先级从高到低）：

1. **new 绑定**：`new F(args)` $\Rightarrow$ `this = \text{newly created object}`
2. **显式绑定**：`f.call(obj, args)` $\Rightarrow$ `this = obj`
3. **隐式绑定**：`obj.method(args)` $\Rightarrow$ `this = obj`
4. **默认绑定**：`f(args)` $\Rightarrow$ `this = \text{globalThis}`（严格模式为 `undefined`）

箭头函数没有自己的 `this`，它继承外层作用域的 `this`：

$$
\text{this}_{\text{arrow}} = \text{this}_{\text{enclosing}}
$$

### 4.5 高阶函数的形式化定义

高阶函数（Higher-Order Function, HOF）是满足下列条件之一的函数：

$$
\text{HOF}: F \rightarrow F \text{ 或 } \text{HOF}: X \rightarrow F
$$

即接收函数作为参数或返回函数。常见高阶函数包括 `map`、`filter`、`reduce`、`compose`、`curry`。

### 4.6 柯里化的形式化定义

柯里化（Currying）将多元函数转换为一元函数链：

$$
\text{curry}: (X \times Y \rightarrow Z) \rightarrow (X \rightarrow (Y \rightarrow Z))
$$

例如：`add(a, b)` 柯里化为 `add(a)(b)`。

### 4.7 尾调用的形式化定义

尾调用（Tail Call）指函数的最后一步是调用另一个函数：

$$
\text{tailCall}: f(x) = g(y)
$$

尾调用优化（TCO）要求引擎复用当前栈帧，避免栈溢出。形式化：

$$
\text{Stack}_{\text{after TCO}} = \text{Stack}_{\text{before}} \setminus \text{frame}(f)
$$

ES6 在严格模式下规范了 TCO，但 Safari 是唯一广泛实现的引擎。

## 5. 理论推导

### 5.1 作用域链的查找复杂度

设作用域链长度为 $n$，每次变量查找的最坏复杂度为 $O(n)$。优化手段：JavaScript 引擎将作用域链编译为跳表，常数因子小。

推论：**避免深层嵌套**。在 100 层嵌套作用域中查找变量比顶层查找慢约 100 倍。

### 5.2 闭包的内存开销

闭包持有定义作用域的引用，导致该作用域中的所有变量无法被 GC。设作用域 $S$ 中变量总大小为 $|S|$，闭包 $C$ 引用 $S$ 的子集 $U_C \subseteq S$：

$$
\text{Memory}(C) = |S| \text{（实际保留整个作用域）}
$$

但现代引擎（V8、SpiderMonkey）实现了**变量逃逸分析**，仅保留 $U_C$：

$$
\text{Memory}_{\text{optimized}}(C) = |U_C|
$$

推论：**避免在闭包中保留大对象**，否则即使闭包只用一个变量，整个作用域也无法回收。

### 5.3 `arguments` 与剩余参数的性能差异

`arguments` 是类数组对象，每次访问需要属性查找。剩余参数 `...args` 是真数组，V8 内部优化为数组结构：

$$
T_{\text{access}}(\text{arguments}[i]) > T_{\text{access}}(\text{args}[i])
$$

差异约 5-10%，在热路径中显著。

### 5.4 箭头函数与普通函数的内存对比

箭头函数没有 `arguments`、`this`、`super`、`new.target` 绑定，内存占用更小：

$$
\text{Memory}(\text{arrow}) < \text{Memory}(\text{regular})
$$

V8 中差异约 32 字节/函数。在创建大量回调的场景下（如 `Array.prototype.map` 中），箭头函数更优。

### 5.5 尾调用优化的栈空间

未优化的尾调用：

$$
\text{Stack}_n = O(n) \text{（每层调用增加一个栈帧）}
$$

优化后的尾调用：

$$
\text{Stack}_n = O(1) \text{（复用栈帧）}
$$

因此递归算法在 TCO 下可处理任意深度输入，而不会栈溢出。

### 5.6 闭包与不可变数据

闭包可以构造不可变数据：

```javascript
function createImmutable(value) {
  return {
    get: () => value,
    set: (newValue) => createImmutable(newValue),
  };
}
```

形式化：每次 `set` 创建新的闭包，原闭包的 `value` 不变：

$$
\text{set}(\text{Immutable}(v), v') = \text{Immutable}(v')
$$

这是函数式编程的核心思想。

## 6. 代码示例

### 6.1 函数声明、表达式与箭头函数

```javascript
// 函数声明：存在提升，可在声明前调用
console.log(add(2, 3)); // 输出: 5
function add(a, b) {
  return a + b;
}

// 函数表达式：不存在提升
const subtract = function (a, b) {
  return a - b;
};
console.log(subtract(5, 2)); // 输出: 3

// 命名函数表达式：内部可递归，外部不可见
const factorial = function fact(n) {
  return n <= 1 ? 1 : n * fact(n - 1);
};

// 箭头函数：不绑定 this，没有 arguments
const multiply = (a, b) => a * b;
const double = (n) => n * 2;
const greet = () => console.log('Hello');

// 单表达式可省略 return
const square = (x) => x * x;

// 返回对象字面量需用括号
const makeUser = (name, age) => ({ name, age });
```

### 6.2 函数参数

```javascript
// 默认参数：替代 || 的 falsy 陷阱
function greet(name = '世界') {
  return `Hello, ${name}!`;
}
console.log(greet()); // "Hello, 世界!"
console.log(greet('Alice')); // "Hello, Alice!"
console.log(greet('')); // "Hello, !"（注意：空字符串不是 undefined）

// 剩余参数：替代 arguments
function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
console.log(sum(1, 2, 3, 4, 5)); // 15

// 解构参数
function printUser({ name, age }) {
  console.log(`Name: ${name}, Age: ${age}`);
}
printUser({ name: 'Alice', age: 30 });

// 解构参数 + 默认值
function fetchUser({ id, fields = ['name', 'email'] } = {}) {
  console.log(`Fetching user ${id}, fields: ${fields.join(', ')}`);
}
fetchUser({ id: 123 }); // fields 默认为 ['name', 'email']
fetchUser(); // 报错：Cannot destructure 'id' of undefined
```

### 6.3 作用域

```javascript
// 全局作用域
const globalVar = '全局变量';
function test() {
  console.log(globalVar); // 可访问
}
test();

// 函数作用域
function testFunc() {
  const localVar = '局部变量';
  console.log(localVar);
}
testFunc();
// console.log(localVar); // 错误：localVar is not defined

// 块级作用域（let/const）
{
  let blockVar = '块级变量';
  const constBlockVar = '常量块级变量';
  console.log(blockVar, constBlockVar);
}
// console.log(blockVar); // 错误：blockVar is not defined

// var 的函数作用域（不是块作用域）
for (var i = 0; i < 3; i++) {}
console.log(i); // 输出: 3（var 泄漏到外层）

// 模块作用域（ES Module）
// export const moduleVar = '模块变量';
// 仅在当前模块内可见，需通过 export 暴露
```

### 6.4 作用域链

```javascript
const globalVar = '全局';

function outer() {
  const outerVar = '外部';

  function inner() {
    const innerVar = '内部';
    // 查找顺序：inner → outer → global
    console.log(innerVar);   // '内部'
    console.log(outerVar);   // '外部'
    console.log(globalVar);  // '全局'
  }

  inner();
  // console.log(innerVar); // 错误：innerVar is not defined
}

outer();
```

### 6.5 闭包基础

```javascript
// 闭包：函数 + 其词法环境的组合
function createCounter() {
  let count = 0; // 私有变量
  return function () {
    return ++count; // 闭包持有 count 的引用
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3

// 每次调用 createCounter 创建独立的闭包
const counter2 = createCounter();
console.log(counter2()); // 1（与 counter 互不影响）

// 闭包无法直接访问私有变量
// counter.count; // undefined
```

### 6.6 闭包应用：计数器

```javascript
// 完整的计数器：封装多个操作
function createCounter(initialValue = 0) {
  let count = initialValue;
  return {
    increment: function () {
      return ++count;
    },
    decrement: function () {
      return --count;
    },
    reset: function () {
      count = initialValue;
      return count;
    },
    getCount: function () {
      return count;
    },
  };
}

const counter = createCounter(10);
console.log(counter.increment()); // 11
console.log(counter.increment()); // 12
console.log(counter.decrement()); // 11
console.log(counter.reset());     // 10
console.log(counter.getCount());  // 10
```

### 6.7 闭包应用：模块模式

```javascript
// 模块模式：IIFE + 闭包实现私有化
const mathModule = (function () {
  // 私有变量
  const PI = 3.14159;

  // 私有函数
  function validateNumber(n) {
    return typeof n === 'number' && !isNaN(n);
  }

  // 公共接口
  return {
    add: function (a, b) {
      if (validateNumber(a) && validateNumber(b)) return a + b;
      throw new TypeError('参数必须为数字');
    },
    subtract: function (a, b) {
      if (validateNumber(a) && validateNumber(b)) return a - b;
      throw new TypeError('参数必须为数字');
    },
    circleArea: function (r) {
      return PI * r * r;
    },
    getPI: function () {
      return PI;
    },
  };
})();

console.log(mathModule.add(5, 3));      // 8
console.log(mathModule.circleArea(2));  // 12.56636
console.log(mathModule.getPI());       // 3.14159
// console.log(mathModule.PI);         // undefined（私有）
```

### 6.8 闭包应用：防抖与节流

```javascript
// 防抖：高频触发仅最后一次生效
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    // 闭包持有 timeoutId 与 func、delay
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// 节流：高频触发按固定频率执行
function throttle(func, limit) {
  let inThrottle = false;
  let lastArgs = null;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(this, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args; // 保留最后一次调用的参数
    }
  };
}

// 使用
const debouncedSearch = debounce((query) => {
  console.log('搜索:', query);
}, 300);
```

### 6.9 `this` 绑定规则

```javascript
// 默认绑定：独立函数调用
function showThis() {
  console.log(this);
}
showThis(); // window（严格模式下 undefined）

// 隐式绑定：作为对象方法调用
const obj = {
  name: 'Alice',
  show: function () {
    console.log(this.name);
  },
};
obj.show(); // 'Alice'

// 隐式丢失：回调中 this 指向变化
const { show } = obj;
show(); // undefined（严格模式 TypeError）

// 显式绑定：call/apply
function greet(greeting) {
  console.log(`${greeting}, ${this.name}!`);
}
const person = { name: 'Bob' };
greet.call(person, 'Hello');   // 'Hello, Bob!'
greet.apply(person, ['Hello']); // 'Hello, Bob!'

// 硬绑定：bind
const boundGreet = greet.bind(person, 'Hi');
boundGreet(); // 'Hi, Bob!'

// new 绑定：构造函数
function Person(name) {
  this.name = name;
}
const p = new Person('Carol');
console.log(p.name); // 'Carol'
```

### 6.10 箭头函数的 `this`

```javascript
// 箭头函数继承外层 this
const obj = {
  name: 'Alice',
  methods: function () {
    // 普通函数回调：this 丢失
    setTimeout(function () {
      console.log(this.name); // undefined（严格模式 TypeError）
    }, 100);

    // 箭头函数回调：继承外层 this
    setTimeout(() => {
      console.log(this.name); // 'Alice'
    }, 100);
  },
};

obj.methods();

// 箭头函数无法用 call/apply/bind 改变 this
const arrowFunc = () => console.log(this);
arrowFunc.call({ name: 'X' }); // 仍是定义时的 this
```

### 6.11 高阶函数

```javascript
// map：对每个元素应用函数
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

// filter：保留满足条件的元素
const evens = numbers.filter((n) => n % 2 === 0);
console.log(evens); // [2, 4]

// reduce：归约
const sum = numbers.reduce((acc, n) => acc + n, 0);
console.log(sum); // 15

// compose：从右向左组合函数
function compose(...fns) {
  return (x) => fns.reduceRight((acc, fn) => fn(acc), x);
}

const addOne = (x) => x + 1;
const square = (x) => x * x;
const addOneThenSquare = compose(square, addOne);
console.log(addOneThenSquare(3)); // 16

// pipe：从左向右组合
function pipe(...fns) {
  return (x) => fns.reduce((acc, fn) => fn(acc), x);
}

const squareThenAddOne = pipe(square, addOne);
console.log(squareThenAddOne(3)); // 10
```

### 6.12 柯里化

```javascript
// 手写柯里化函数
function curry(fn) {
  return function curried(...args) {
    // 参数足够则调用原函数
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    // 参数不足则返回新函数等待剩余参数
    return function (...args2) {
      return curried.apply(this, [...args, ...args2]);
    };
  };
}

// 使用
const add = (a, b, c) => a + b + c;
const curriedAdd = curry(add);
console.log(curriedAdd(1)(2)(3));    // 6
console.log(curriedAdd(1, 2)(3));    // 6
console.log(curriedAdd(1)(2, 3));    // 6
console.log(curriedAdd(1, 2, 3));    // 6

// 实际应用：参数复用
const log = curry((level, time, message) => {
  console.log(`[${level}] ${time}: ${message}`);
});

const errorLog = log('ERROR');
const errorLogNow = errorLog(new Date().toISOString());
errorLogNow('数据库连接失败');
```

### 6.13 偏应用

```javascript
// 偏应用：固定部分参数，返回新函数
function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn.apply(this, [...presetArgs, ...laterArgs]);
  };
}

const add = (a, b, c) => a + b + c;
const add10 = partial(add, 10);
console.log(add10(20, 30)); // 60

// 与柯里化的区别：柯里化逐个参数，偏应用一次固定多个
```

### 6.14 记忆化

```javascript
// 记忆化：缓存函数结果，加速重复计算
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

// 斐波那契数列：未记忆化 O(2^n)，记忆化 O(n)
const fib = memoize(function (n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
});

console.log(fib(40)); // 102334155（瞬间返回）
```

### 6.15 生成器函数

```javascript
// 生成器：可暂停的函数，用 yield 返回值
function* idGenerator() {
  let id = 1;
  while (true) {
    yield id++;
  }
}

const gen = idGenerator();
console.log(gen.next().value); // 1
console.log(gen.next().value); // 2
console.log(gen.next().value); // 3

// 生成器实现迭代器
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

for (const n of range(0, 5)) {
  console.log(n); // 0, 1, 2, 3, 4
}

// 无限序列：惰性求值
function* naturalNumbers() {
  let n = 1;
  while (true) yield n++;
}

const naturals = naturalNumbers();
console.log(naturals.next().value); // 1
console.log(naturals.next().value); // 2
```

### 6.16 IIFE（立即调用函数表达式）

```javascript
// IIFE：创建独立作用域，避免污染全局
(function () {
  const privateVar = '私有';
  console.log(privateVar);
})();

// 现代替代方案：块级作用域
{
  const privateVar = '私有';
  console.log(privateVar);
}

// IIFE 用于模块化（已被 ES Module 替代）
const counter = (function () {
  let count = 0;
  return {
    next: () => ++count,
    reset: () => (count = 0),
  };
})();

console.log(counter.next()); // 1
console.log(counter.next()); // 2
```

### 6.17 尾调用与尾递归

```javascript
// 普通递归：可能栈溢出
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1); // 不是尾调用：乘法在递归后
}
// factorial(100000); // RangeError: Maximum call stack size exceeded

// 尾递归：可用 TCO 优化
function factorialTail(n, acc = 1) {
  if (n <= 1) return acc;
  return factorialTail(n - 1, n * acc); // 尾调用
}
console.log(factorialTail(100000)); // Infinity（数值溢出但无栈溢出）

// 严格模式下 Safari 支持 TCO
// 'use strict';
```

## 7. 对比分析

### 7.1 函数声明 vs 函数表达式 vs 箭头函数

| 维度 | 函数声明 | 函数表达式 | 箭头函数 |
| --- | --- | --- | --- |
| 提升 | 是（包括函数体） | 仅变量声明 | 仅变量声明 |
| `this` | 动态绑定 | 动态绑定 | 词法继承 |
| `arguments` | 有 | 有 | 无 |
| `prototype` | 有 | 有 | 无 |
| 可作构造函数 | 是 | 是 | 否 |
| `super` | 有（仅方法） | 有（仅方法） | 词法继承 |
| 适用场景 | 顶层函数 | 回调 | 短回调 |

### 7.2 var vs let vs const

| 维度 | var | let | const |
| --- | --- | --- | --- |
| 作用域 | 函数 | 块 | 块 |
| 提升 | 是（值为 undefined） | 是（TDZ） | 是（TDZ） |
| 重复声明 | 允许 | 禁止 | 禁止 |
| 重新赋值 | 允许 | 允许 | 禁止 |
| 全局对象属性 | 是（window.x） | 否 | 否 |

### 7.3 闭包 vs 类

| 维度 | 闭包 | 类 |
| --- | --- | --- |
| 私有化 | 天然支持 | 需 # 私有字段 |
| 方法绑定 | 自动绑定 | 需 bind 或箭头函数 |
| 继承 | 通过原型链 | extends 关键字 |
| 性能 | 每实例一份方法 | 方法在原型上共享 |
| 内存 | 每实例一份闭包 | 方法共享，省内存 |

### 7.4 call vs apply vs bind

| 方法 | 参数形式 | 立即执行 | 永久绑定 |
| --- | --- | --- | --- |
| `call(this, arg1, arg2)` | 散列 | 是 | 否 |
| `apply(this, [args])` | 数组 | 是 | 否 |
| `bind(this, arg1, arg2)` | 散列 | 否（返回新函数） | 是 |

### 7.5 柯里化 vs 偏应用

| 维度 | 柯里化 | 偏应用 |
| --- | --- | --- |
| 参数传递 | 一次一个 | 一次多个 |
| 链长度 | 等于参数个数 | 1 |
| 适用场景 | 参数复用 | 固定配置 |

## 8. 常见陷阱与反模式

### 8.1 循环中 var 闭包变量共享

```javascript
// 反模式：var 在循环中创建闭包
for (var i = 0; i < 5; i++) {
  setTimeout(function () {
    console.log(i); // 输出: 5, 5, 5, 5, 5
  }, 100);
}

// 根因：var 是函数作用域，5 个闭包共享同一个 i

// 修复 1：使用 let
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100); // 0, 1, 2, 3, 4
}

// 修复 2：IIFE 创建独立作用域
for (var i = 0; i < 5; i++) {
  (function (j) {
    setTimeout(() => console.log(j), 100); // 0, 1, 2, 3, 4
  })(i);
}
```

### 8.2 闭包导致内存泄漏

```javascript
// 反模式：闭包持有大对象
function badClosure() {
  const hugeData = new Array(1e6).fill('*');
  return function () {
    console.log('仅用了 hugeData.length');
    // 即使不用 hugeData 的内容，引擎仍可能保留它
  };
}

// 修复：仅保留需要的部分
function goodClosure() {
  const hugeData = new Array(1e6).fill('*');
  const length = hugeData.length; // 仅保留 length
  return function () {
    console.log(length); // hugeData 可被 GC
  };
}
```

### 8.3 箭头函数误用为对象方法

```javascript
// 反模式：箭头函数作为对象方法，this 不指向对象
const obj = {
  name: 'Alice',
  greet: () => {
    console.log(this.name); // undefined
  },
};
obj.greet();

// 根因：箭头函数 this 继承外层，外层是模块作用域，this 是 undefined

// 修复：使用普通函数
const obj2 = {
  name: 'Alice',
  greet() {
    console.log(this.name); // 'Alice'
  },
};
obj2.greet();
```

### 8.4 箭头函数误用为构造函数

```javascript
// 反模式：箭头函数无法用 new 调用
const Person = (name) => {
  this.name = name;
};

// new Person('Alice'); // TypeError: Person is not a constructor

// 修复：使用普通函数或类
function Person(name) {
  this.name = name;
}
const p = new Person('Alice');

// 或使用 class
class Person2 {
  constructor(name) {
    this.name = name;
  }
}
```

### 8.5 闭包中的 this 丢失

```javascript
// 反模式：回调中 this 丢失
class Counter {
  constructor() {
    this.count = 0;
  }
  start() {
    setInterval(function () {
      this.count++; // TypeError: Cannot read property 'count' of undefined
      console.log(this.count);
    }, 1000);
  }
}

// 修复 1：箭头函数
start() {
  setInterval(() => {
    this.count++;
    console.log(this.count);
  }, 1000);
}

// 修复 2：bind
start() {
  setInterval(
    function () {
      this.count++;
      console.log(this.count);
    }.bind(this),
    1000
  );
}

// 修复 3：保存 this 引用
start() {
  const self = this;
  setInterval(function () {
    self.count++;
    console.log(self.count);
  }, 1000);
}
```

### 8.6 闭包捕获循环变量（ES5 风格）

```javascript
// 反模式：经典面试题
for (var i = 1; i <= 3; i++) {
  setTimeout(function () {
    console.log(i); // 4, 4, 4
  }, i * 1000);
}

// 用户期望：1, 2, 3（间隔 1 秒）
// 实际：4, 4, 4（在 1 秒后打印 3 个 4）

// 修复 1：let
for (let i = 1; i <= 3; i++) {
  setTimeout(() => console.log(i), i * 1000);
}

// 修复 2：IIFE
for (var i = 1; i <= 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j), j * 1000);
  })(i);
}
```

### 8.7 默认参数的 falsy 陷阱

```javascript
// 反模式：用 || 作为默认值
function greet(name) {
  name = name || 'Guest'; // 空字符串、0、false 都会变成 'Guest'
  console.log(name);
}
greet(''); // 'Guest'（错误：用户传入空字符串应保留）

// 修复：使用默认参数
function greet(name = 'Guest') {
  console.log(name);
}
greet(''); // ''（正确）
greet();    // 'Guest'
```

### 8.8 arguments 误用

```javascript
// 反模式：直接修改 arguments
function badSum() {
  arguments[0] = 10; // 修改 arguments 不会同步到形参（严格模式下）
  return arguments[0] + arguments[1];
}

// 修复：使用剩余参数
function goodSum(...args) {
  args[0] = 10;
  return args[0] + args[1];
}

// 反模式：将 arguments 作为数组传递
function badCall() {
  otherFunc(arguments); // 传递的是类数组对象，不是数组
}

// 修复：展开或转换
function goodCall() {
  otherFunc(...arguments);
  // 或
  otherFunc(Array.from(arguments));
}
```

### 8.9 闭包引发 React Hooks 陷阱

```javascript
// 反模式：React useEffect 中的闭包陷阱
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // 闭包捕获了 count 的初始值 0，永远显示 1
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); // 依赖数组为空，闭包固定 count=0
}

// 修复 1：依赖数组加入 count
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, [count]);

// 修复 2：使用函数式更新
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

## 9. 工程实践

### 9.1 函数式工具库

```javascript
/**
 * 函数式工具库：生产级实现
 */
const F = {
  // compose：从右向左组合
  compose: (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x),

  // pipe：从左向右组合
  pipe: (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x),

  // curry：柯里化
  curry: function curry(fn) {
    return function curried(...args) {
      if (args.length >= fn.length) return fn.apply(this, args);
      return (...args2) => curried.apply(this, [...args, ...args2]);
    };
  },

  // partial：偏应用
  partial: (fn, ...preset) => (...later) => fn(...preset, ...later),

  // memoize：记忆化
  memoize: (fn, keyFn = JSON.stringify) => {
    const cache = new Map();
    return (...args) => {
      const key = keyFn(args);
      if (!cache.has(key)) cache.set(key, fn(...args));
      return cache.get(key);
    };
  },

  // once：仅执行一次
  once: (fn) => {
    let called = false;
    let result;
    return (...args) => {
      if (called) return result;
      called = true;
      result = fn(...args);
      return result;
    };
  },

  // debounce：防抖
  debounce: (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // throttle：节流
  throttle: (fn, limit) => {
    let inThrottle = false;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
};

// 使用示例
const addLog = F.pipe(
  (x) => x + 1,
  (x) => x * 2,
  (x) => console.log(x)
);
addLog(3); // 8
```

### 9.2 私有化封装

```javascript
// 方案 1：闭包
function createCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    decrement: () => --count,
    get: () => count,
  };
}

// 方案 2：WeakMap（用于类）
const privateData = new WeakMap();

class Counter {
  constructor() {
    privateData.set(this, { count: 0 });
  }
  increment() {
    privateData.get(this).count++;
  }
  get count() {
    return privateData.get(this).count;
  }
}

// 方案 3：私有字段（ES2022+）
class Counter2 {
  #count = 0;
  increment() {
    this.#count++;
  }
  get count() {
    return this.#count;
  }
}
```

### 9.3 状态机实现

```javascript
/**
 * 基于闭包的状态机
 * 适用于 UI 状态、协议解析等场景
 */
function createMachine(initialState, transitions) {
  let state = initialState;
  let context = {};

  return {
    send: (event, payload) => {
      const transition = transitions[state]?.[event];
      if (transition) {
        context = { ...context, ...payload };
        state = typeof transition.target === 'function'
          ? transition.target(context)
          : transition.target;
        transition.action?.(context);
        return true;
      }
      return false;
    },
    getState: () => state,
    getContext: () => context,
  };
}

// 使用：登录状态机
const authMachine = createMachine('loggedOut', {
  loggedOut: {
    login: { target: 'loggingIn', action: (ctx) => console.log('开始登录', ctx) },
  },
  loggingIn: {
    success: { target: 'loggedIn' },
    failure: { target: 'loggedOut' },
  },
  loggedIn: {
    logout: { target: 'loggedOut' },
  },
});

authMachine.send('login', { user: 'Alice' });
console.log(authMachine.getState()); // 'loggingIn'
authMachine.send('success');
console.log(authMachine.getState()); // 'loggedIn'
```

## 10. 案例研究

### 10.1 案例：Redux 的 createStore 实现

Redux 的核心 `createStore` 是闭包的典型应用：

```javascript
/**
 * 简化版 Redux createStore
 * 演示闭包如何封装私有状态
 */
function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = [];

  function getState() {
    return state;
  }

  function dispatch(action) {
    state = reducer(state, action);
    // 通知所有订阅者
    listeners.forEach((fn) => fn());
    return action;
  }

  function subscribe(listener) {
    listeners.push(listener);
    // 返回取消订阅函数（也是闭包）
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }

  // 初始化状态
  dispatch({ type: '@@INIT' });

  return { getState, dispatch, subscribe };
}

// 使用
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    default:
      return state;
  }
}

const store = createStore(counterReducer);
const unsubscribe = store.subscribe(() => {
  console.log('新状态:', store.getState());
});

store.dispatch({ type: 'INCREMENT' }); // 日志：新状态: { count: 1 }
store.dispatch({ type: 'INCREMENT' }); // 日志：新状态: { count: 2 }
unsubscribe();
store.dispatch({ type: 'INCREMENT' }); // 无日志
```

### 10.2 案例：Vue 3 reactive 实现原理

Vue 3 的响应式系统基于 Proxy + 闭包：

```javascript
/**
 * 简化版 Vue 3 reactive
 * 演示闭包在依赖收集中的应用
 */
const targetMap = new WeakMap();
let activeEffect = null;

function effect(fn) {
  activeEffect = fn;
  fn(); // 触发依赖收集
  activeEffect = null;
}

function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  dep.add(activeEffect);
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  if (dep) dep.forEach((fn) => fn());
}

function reactive(target) {
  return new Proxy(target, {
    get(obj, key) {
      track(obj, key);
      return Reflect.get(obj, key);
    },
    set(obj, key, value) {
      const result = Reflect.set(obj, key, value);
      trigger(obj, key);
      return result;
    },
  });
}

// 使用
const state = reactive({ count: 0 });
effect(() => {
  console.log('count 变化:', state.count);
});
state.count = 1; // 日志：count 变化: 1
state.count = 2; // 日志：count 变化: 2
```

### 10.3 案例：异步流程控制

基于闭包实现 Promise 链式调用：

```javascript
/**
 * 简化版 Promise 实现
 * 演示闭包在异步控制流中的应用
 */
class MyPromise {
  constructor(executor) {
    this.state = 'pending';
    this.value = undefined;
    this.callbacks = [];

    const resolve = (value) => {
      if (this.state !== 'pending') return;
      this.state = 'fulfilled';
      this.value = value;
      this.callbacks.forEach((cb) => cb.onFulfilled(value));
    };

    const reject = (reason) => {
      if (this.state !== 'pending') return;
      this.state = 'rejected';
      this.value = reason;
      this.callbacks.forEach((cb) => cb.onRejected(reason));
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handle = (callback, value, fallback) => {
        try {
          const result = callback ? callback(value) : fallback(value);
          if (result instanceof MyPromise) {
            result.then(resolve, reject);
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(e);
        }
      };

      if (this.state === 'fulfilled') {
        handle(onFulfilled, this.value, resolve);
      } else if (this.state === 'rejected') {
        handle(onRejected, this.value, reject);
      } else {
        this.callbacks.push({
          onFulfilled: (v) => handle(onFulfilled, v, resolve),
          onRejected: (r) => handle(onRejected, r, reject),
        });
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }
}
```

## 11. 习题

### 11.1 基础题

**题目 1**：解释以下代码输出，并说明原因。

```javascript
var a = 1;
function foo() {
  console.log(a);
  var a = 2;
  console.log(a);
}
foo();
```

参考要点：
- 第一次输出 `undefined`（var 提升，赋值未执行）
- 第二次输出 `2`
- 函数作用域内的 `var a` 覆盖了外层，但仍能访问到（在赋值前打印）

**题目 2**：用闭包实现一个单例模式。

参考要点：
- 用 IIFE 创建闭包，保存 instance
- 返回获取 instance 的函数
- 第二次调用返回缓存的 instance

### 11.2 进阶题

**题目 3**：实现一个 `once(fn)` 高阶函数，使 fn 仅执行一次，后续调用返回第一次的结果。

参考要点：
- 用闭包保存 `called` 标志与 `result`
- 第一次调用执行 fn 并缓存
- 后续直接返回缓存

**题目 4**：分析以下代码在严格模式与非严格模式下的差异：

```javascript
function outer() {
  'use strict';
  function inner() {
    console.log(this);
  }
  inner();
}
outer();
```

参考要点：
- 严格模式下 `inner()` 的 `this` 是 `undefined`
- 非严格模式下 `this` 是 `globalThis`
- 解释：默认绑定在严格模式下指向 undefined

### 11.3 挑战题

**题目 5**：实现 `curry(fn)` 函数，支持以下用法：

```javascript
const sum = curry((a, b, c, d) => a + b + c + d);
sum(1)(2)(3)(4); // 10
sum(1, 2)(3, 4); // 10
sum(1, 2, 3, 4); // 10
sum(1)(2, 3, 4); // 10
```

参考要点：
- 用闭包保存已收集的参数
- 检查参数总数是否达到 `fn.length`
- 达到则调用，否则返回新函数继续收集

**题目 6**：分析 React Hooks 的"闭包陷阱"原因，并给出至少 3 种解决方案。

参考要点：
- 原因：useEffect 的回调闭包捕获了渲染时的 state，更新后回调仍引用旧值
- 方案 1：依赖数组加入依赖项
- 方案 2：使用 useRef 保存最新值
- 方案 3：使用函数式更新 `setState(prev => prev + 1)`
- 方案 4：使用 useReducer 集中状态管理
- 方案 5：在 effect 内重新订阅

**题目 7**：解释为什么以下代码不会栈溢出（在支持 TCO 的引擎下）：

```javascript
function sum(n, acc = 0) {
  if (n === 0) return acc;
  return sum(n - 1, acc + n);
}
sum(1000000);
```

参考要点：
- 最后一步是 `sum(n-1, acc+n)`，是尾调用
- TCO 复用栈帧，栈空间为 O(1)
- V8 暂未实现 TCO，Safari 已实现
- 非严格模式下 V8 也不实现，需 `'use strict'`

## 12. 参考文献

[1] ECMA International. 2024. ECMAScript 2024 Language Specification (ECMA-262, 15th Edition). Retrieved July 21, 2024 from https://tc39.es/ecma262/

[2] David Flanagan. 2020. *JavaScript: The Definitive Guide*, 7th ed. O'Reilly Media. ISBN: 978-1491952023.

[3] Kyle Simpson. 2019. *You Don't Know JS: Scope & Closures*, 2nd ed. O'Reilly Media. Retrieved from https://github.com/getify/You-Dont-Know-JS

[4] Douglas Crockford. 2008. *JavaScript: The Good Parts*. O'Reilly Media. ISBN: 978-0596517748.

[5] Allen Wirfs-Brock and Brendan Eich. 2012. "JavaScript: The First 20 Years." *Proceedings of the ACM on Programming Languages* 4, HOPL (June 2020), Article 189, 189 pages. DOI: 10.1145/3386327.

[6] John C. Reynolds. 1998. "Theories of Programming Languages." Cambridge University Press. DOI: 10.1017/CBO9780511624197.

[7] Gerald J. Sussman and Guy L. Steele. 1975. "Scheme: An Interpreter for Extended Lambda Calculus." MIT AI Memo 349. Retrieved from https://dspace.mit.edu/handle/1721.1/5794

[8] Philip Wadler and Stephen Blott. 1989. "How to make ad-hoc polymorphism less ad hoc." *Proceedings of the 16th ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages* (POPL '89). DOI: 10.1145/75277.75283.

[9] Simon Peyton Jones. 2003. "Haskell 98 Language and Libraries: The Revised Report." *Journal of Functional Programming* 13, 1 (January 2003). DOI: 10.1017/S0956796803001180.

[10] Harold Abelson and Gerald Jay Sussman. 1996. *Structure and Interpretation of Computer Programs*, 2nd ed. MIT Press. ISBN: 978-0262510875.

## 13. 延伸阅读

### 13.1 官方文档

- [MDN - Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [MDN - Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [MDN - this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [TC39 Proposals](https://github.com/tc39/proposals)

### 13.2 经典教材与论文

- Kyle Simpson. *You Don't Know JS* 系列（6 卷）
- Douglas Crockford. *JavaScript: The Good Parts*
- Axel Rauschmayer. *Speaking JavaScript*
- Brendan Eich. "JavaScript at Ten Years"（2005 演讲）
- Dean Tribble. "Closures and State in JavaScript"（2018 OOPSLA）

### 13.3 函数式编程方向

- Brian Lonsdorf. *Professor Frisby's Mostly Adequate Guide to Functional Programming*
- Miran Lipovača. *Learn You a Haskell for Great Good!*
- Simon Peyton Jones. *The Implementation of Functional Programming Languages*

### 13.4 引擎实现方向

- [V8 Blog - Understanding ECMAScript](https://v8.dev/blog)
- [SpiderMonkey Internals](https://spidermonkey.dev/)
- [JavaScriptCore Source](https://github.com/WebKit/WebKit/tree/main/Source/JavaScriptCore)

## 14. 附录

### 14.1 函数定义方式速查

| 方式 | 语法 | 提升 | this | arguments |
| --- | --- | --- | --- | --- |
| 函数声明 | `function f() {}` | 是 | 动态 | 有 |
| 函数表达式 | `const f = function() {}` | 否 | 动态 | 有 |
| 命名函数表达式 | `const f = function g() {}` | 否 | 动态 | 有 |
| 箭头函数 | `const f = () => {}` | 否 | 词法 | 无 |
| 方法简写 | `const obj = { f() {} }` | 否 | 动态 | 有 |
| 生成器 | `function* f() {}` | 是 | 动态 | 有 |
| 异步函数 | `async function f() {}` | 是 | 动态 | 有 |
| 异步箭头 | `const f = async () => {}` | 否 | 词法 | 无 |
| 类构造器 | `class F { constructor() {} }` | 否 | new 绑定 | 无 |
| Function 构造器 | `new Function('a', 'return a')` | 否 | 动态 | 有 |

### 14.2 `this` 绑定规则速查

| 调用方式 | 示例 | `this` 指向 |
| --- | --- | --- |
| 默认调用 | `f()` | globalThis（严格模式 undefined） |
| 隐式调用 | `obj.f()` | obj |
| 显式调用 | `f.call(obj)` | obj |
| 硬绑定 | `f.bind(obj)()` | obj（永久） |
| new 调用 | `new F()` | 新创建的对象 |
| 箭头函数 | `() => this` | 外层作用域的 this |
| DOM 回调 | `btn.onclick = f` | 触发事件的元素 |

### 14.3 作用域查找优先级

1. 内层 `let`/`const`
2. 内层 `var`
3. 外层函数作用域
4. 模块作用域
5. 全局作用域
6. 全局对象属性（如 `window.x`，仅未声明时）

### 14.4 闭包应用场景

| 场景 | 描述 |
| --- | --- |
| 私有化 | 隐藏内部状态，仅暴露方法 |
| 模块模式 | IIFE + 闭包封装 |
| 柯里化 | 多次调用累积参数 |
| 防抖节流 | 保存定时器 ID |
| React Hooks | useState 持有状态 |
| Redux store | 持有 state 与订阅者列表 |
| 中间件 | next 函数引用 |
| 单例模式 | 缓存 instance |
| 事件总线 | 保存订阅者列表 |
| 状态机 | 持有当前状态与上下文 |

### 14.5 更新日志

- 2026-04-05：初始创建，涵盖函数定义、作用域、闭包、this 基础。
- 2026-04-05：扩写内容，增加详细的函数定义、作用域、闭包和 this 指向的概念、示例和最佳实践。
- 2026-07-21：金标准升级，新增形式化定义、理论推导、对比分析、陷阱反模式、案例研究（Redux、Vue3 reactive、Promise 实现）、习题、ACM 参考文献、延伸阅读，覆盖高阶函数、柯里化、偏应用、记忆化、生成器、尾调用优化等函数式编程技术。
