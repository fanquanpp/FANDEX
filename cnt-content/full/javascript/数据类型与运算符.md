---
order: 40
tags:
  - javascript
difficulty: intermediate
title: 数据类型与运算符
module: javascript
category: 'JS Basics'
description: 算术、比较、逻辑、位运算及运算符优先级。
author: Anonymous
related:
  - javascript/程序结构与基本语法
  - javascript/变量与数据类型
  - javascript/控制流
  - javascript/高阶函数
prerequisites:
  - javascript/语法速查
---

## 1. 数据类型 (Data Types)

JavaScript 是一种动态类型语言，变量的类型会在运行时自动推断。JavaScript 中的数据类型分为两大类：原始类型（Primitive Types）和引用类型（Reference Types）。

### 1.1 原始类型 (Primitives - 栈存储)

原始类型是不可变的值，存储在栈内存中。JavaScript 有 7 种原始类型：

#### 1.1.1 number (数值类型)

**描述**: 表示整数和浮点数，包括特殊值 `NaN` (Not a Number)、`Infinity` (正无穷) 和 `-Infinity` (负无穷)。
**特点**:

- 使用 IEEE 754 标准表示
- 整数和浮点数都是 64 位双精度浮点数
- 存在精度问题
  **示例**:

```javascript
// 整数
let integer = 42;
// 浮点数
let float = 3.14;
// 科学记数法
let sciNotation = 1.23e5; // 123000
// 特殊值
let notANumber = NaN;
let positiveInfinity = Infinity;
let negativeInfinity = -Infinity;
// 精度问题
console.log(0.1 + 0.2); // 输出: 0.30000000000000004
```

**常用方法**:

- `Number.isNaN()`: 检测是否为 NaN
- `Number.isFinite()`: 检测是否为有限数
- `Number.isInteger()`: 检测是否为整数
- `Number.parseFloat()`: 解析字符串为浮点数
- `Number.parseInt()`: 解析字符串为整数

#### 1.1.2 string (字符串类型)

**描述**: 表示文本数据，由零个或多个字符组成。
**特点**:

- 不可变
- 支持单引号、双引号和模板字符串
- 可以使用索引访问单个字符
- 长度由 `length` 属性表示
  **示例**:

```javascript
// 单引号
let singleQuotes = 'Hello';
// 双引号
let doubleQuotes = 'World';
// 模板字符串
let templateString = `Hello, ${doubleQuotes}!`;
// 字符串长度
console.log(templateString.length); // 输出: 12
// 字符串索引
console.log(templateString[0]); // 输出: H
// 字符串方法
let str = 'JavaScript';
console.log(str.toUpperCase()); // 输出: JAVASCRIPT
console.log(str.substring(0, 4)); // 输出: Java
```

**常用方法**:

- `length`: 获取字符串长度
- `charAt()`: 获取指定位置的字符
- `substring()`: 提取子字符串
- `slice()`: 提取子字符串
- `indexOf()`: 查找子字符串位置
- `includes()`: 检查是否包含子字符串
- `split()`: 分割字符串为数组
- `trim()`: 去除首尾空白

#### 1.1.3 boolean (布尔类型)

**描述**: 表示逻辑值，只有两个值：``和`false`。
**特点**:

- 用于条件判断
- 其他类型可以转换为布尔类型
  **示例**:

```javascript
let is = true;
let isFalse = false;
// 布尔转换
console.log(Boolean(0)); // 输出: false
console.log(Boolean(1)); // 输出:
console.log(Boolean('')); // 输出: false
console.log(Boolean('Hello')); // 输出:
console.log(Boolean(null)); // 输出: false
console.log(Boolean(undefined)); // 输出: false
console.log(Boolean({})); // 输出:
console.log(Boolean([])); // 输出:
```

**布尔转换规则**:

- **falsy 值**: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`
- **truthy 值**: 除了 falsy 值之外的所有值

#### 1.1.4 undefined (未定义类型)

**描述**: 表示变量已声明但未赋值。
**特点**:

- 只有一个值：`undefined`
- 函数没有返回值时默认返回 `undefined`
- 访问对象不存在的属性时返回 `undefined`
  **示例**:

```javascript
// 声明但未赋值的变量
let undefinedVar;
console.log(undefinedVar); // 输出: undefined
// 函数默认返回值
function noReturn() {
  // 没有 return 语句
}
console.log(noReturn()); // 输出: undefined
// 访问不存在的属性
let obj = { name: 'Alice' };
console.log(obj.age); // 输出: undefined
```

#### 1.1.5 null (空值类型)

**描述**: 表示空对象指针。
**特点**:

- 只有一个值：`null`
- 用于表示有意的空值
- `typeof null` 返回 `"object"` (历史遗留问题)
  **示例**:

```javascript
// 表示空对象
let emptyObject = null;
console.log(emptyObject); // 输出: null
// 清空变量
let user = { name: 'Alice' };
user = null; // 现在 user 是 null
// 注意: typeof null 返回 "object"
console.log(typeof null); // 输出: object
```

#### 1.1.6 symbol (符号类型) - ES6+

**描述**: 表示唯一的标识符。
**特点**:

- 每个 symbol 值都是唯一的
- 用于对象的唯一属性键
- 不能与其他类型进行比较
  **示例**:

```javascript
// 创建 symbol
let sym1 = Symbol();
let sym2 = Symbol('description');
let sym3 = Symbol('description');
// 每个 symbol 都是唯一的
console.log(sym2 === sym3); // 输出: false
// 用作对象属性
const obj = {
  [sym1]: 'value1',
  [sym2]: 'value2',
};
console.log(obj[sym1]); // 输出: value1
```

**常用方法**:

- `Symbol.for()`: 创建或获取全局 symbol
- `Symbol.keyFor()`: 获取全局 symbol 的键

#### 1.1.7 bigint (大整数类型) - ES2020+

**描述**: 表示任意精度的整数。
**特点**:

- 用于表示超出 Number 范围的整数
- 在数字后面添加 `n` 表示
- 不能与 Number 类型直接运算
  **示例**:

```javascript
// 创建 bigint
let bigInt1 = 9007199254740991n; // 最大的 Number 值 + 1
let bigInt2 = BigInt(9007199254740991);
// 运算
console.log(bigInt1 + 1n); // 输出: 9007199254740992n
// 注意: 不能与 Number 直接运算
// console.log(bigInt1 + 1); // 报错: Cannot mix BigInt and other types
// 转换
console.log(Number(bigInt1)); // 输出: 9007199254740991
```

### 1.2 引用类型 (Reference - 堆存储)

引用类型是可变的值，存储在堆内存中，栈内存中存储的是指向堆内存的引用。

#### 1.2.1 Object (对象)

**描述**: 表示键值对的集合。
**特点**:

- 可以动态添加和删除属性
- 引用传递
- 可以使用字面量、构造函数或 `Object.create()` 创建
  **示例**:

```javascript
// 字面量创建
let obj1 = {
  name: 'Alice',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'New York',
  },
};
// 构造函数创建
let obj2 = new Object();
obj2.name = 'Bob';
// Object.create() 创建
let obj3 = Object.create(obj1);
console.log(obj3.name); // 输出: Alice (继承自 obj1)
// 引用传递
let obj4 = obj1;
obj4.name = 'Charlie';
console.log(obj1.name); // 输出: Charlie (因为 obj4 和 obj1 指向同一个对象)
```

**常用方法**:

- `Object.keys()`: 获取对象的键数组
- `Object.values()`: 获取对象的值数组
- `Object.entries()`: 获取对象的键值对数组
- `Object.assign()`: 合并对象
- `Object.freeze()`: 冻结对象
- `Object.seal()`: 密封对象

#### 1.2.2 Array (数组)

**描述**: 表示有序的数据集合。
**特点**:

- 可以存储不同类型的数据
- 长度可变
- 索引从 0 开始
- 继承自 Object
  **示例**:

```javascript
// 字面量创建
let arr1 = [1, 'Hello', true, null];
// 构造函数创建
let arr2 = new Array(5); // 创建长度为 5 的空数组
let arr3 = new Array(1, 2, 3); // 创建包含元素的数组
// 数组方法
let arr = [1, 2, 3, 4, 5];
console.log(arr.length); // 输出: 5
console.log(arr.push(6)); // 输出: 6 (新长度)
console.log(arr.pop()); // 输出: 6 (删除并返回最后一个元素)
console.log(arr.map((x) => x * 2)); // 输出: [2, 4, 6, 8, 10]
```

**常用方法**:

- `length`: 获取数组长度
- `push()`: 添加元素到末尾
- `pop()`: 删除并返回末尾元素
- `shift()`: 删除并返回第一个元素
- `unshift()`: 添加元素到开头
- `slice()`: 提取子数组
- `splice()`: 添加/删除元素
- `map()`: 映射数组
- `filter()`: 过滤数组
- `reduce()`: 归约数组
- `forEach()`: 遍历数组
- `sort()`: 排序数组

#### 1.2.3 Function (函数)

**描述**: 表示可执行的代码块。
**特点**:

- 可以作为参数传递
- 可以作为返回值
- 可以存储在变量中
- 继承自 Object
  **示例**:

```javascript
// 函数声明
function add(a, b) {
  return a + b;
}
// 函数表达式
const multiply = function (a, b) {
  return a * b;
};
// 箭头函数
const divide = (a, b) => a / b;
// 作为参数
function calculate(a, b, operation) {
  return operation(a, b);
}
console.log(calculate(10, 5, add)); // 输出: 15
```

**常用方法**:

- `call()`: 调用函数，指定 `this` 值和参数
- `apply()`: 调用函数，指定 `this` 值和参数数组
- `bind()`: 创建绑定了 `this` 值的新函数

## 2. 类型检测 (Type Checking)

JavaScript 提供了多种方法来检测变量的类型。

### 2.1 typeof 运算符

**描述**: 用于检测变量的类型，返回一个字符串。
**特点**:

- 适用于检测原始类型
- `typeof null` 返回 `"object"` (历史遗留问题)
- 函数返回 `"function"`
- 数组和对象返回 `"object"`
  **示例**:

```javascript
console.log(typeof 42); // 输出: "number"
console.log(typeof 'Hello'); // 输出: "string"
console.log(typeof true); // 输出: "boolean"
console.log(typeof undefined); // 输出: "undefined"
console.log(typeof null); // 输出: "object" (历史遗留问题)
console.log(typeof Symbol()); // 输出: "symbol"
console.log(typeof 1n); // 输出: "bigint"
console.log(typeof {}); // 输出: "object"
console.log(typeof []); // 输出: "object"
console.log(typeof function () {}); // 输出: "function"
```

### 2.2 instanceof 运算符

**描述**: 用于检测对象是否为某个构造函数的实例。
**特点**:

- 适用于检测引用类型
- 检查原型链
- 不能用于检测原始类型
  **示例**:

```javascript
let arr = [];
let obj = {};
let func = function () {};
console.log(arr instanceof Array); // 输出:
console.log(arr instanceof Object); // 输出:  (因为 Array 继承自 Object)
console.log(obj instanceof Object); // 输出:
console.log(func instanceof Function); // 输出:
console.log(func instanceof Object); // 输出:  (因为 Function 继承自 Object)
// 不能用于原始类型
console.log(42 instanceof Number); // 输出: false
console.log('Hello' instanceof String); // 输出: false
```

### 2.3 Array.isArray() 方法

**描述**: 用于检测变量是否为数组。
**特点**:

- 专门用于检测数组
- 比 `instanceof` 更可靠，因为它不受原型链影响
  **示例**:

```javascript
console.log(Array.isArray([])); // 输出:
console.log(Array.isArray({})); // 输出: false
console.log(Array.isArray('Hello')); // 输出: false
console.log(Array.isArray(null)); // 输出: false
```

### 2.4 Object.prototype.toString.call() 方法

**描述**: 用于获取对象的内部 `[Class](Class)` 属性，返回一个格式化的字符串。
**特点**:

- 可以准确检测所有类型
- 返回格式为 `"[object Type]"`
  **示例**:

```javascript
function getType(value) {
  return Object.prototype.toString.call(value).slice(8, -1);
}
console.log(getType(42)); // 输出: "Number"
console.log(getType('Hello')); // 输出: "String"
console.log(getType(true)); // 输出: "Boolean"
console.log(getType(undefined)); // 输出: "Undefined"
console.log(getType(null)); // 输出: "Null"
console.log(getType(Symbol())); // 输出: "Symbol"
console.log(getType(1n)); // 输出: "BigInt"
console.log(getType({})); // 输出: "Object"
console.log(getType([])); // 输出: "Array"
console.log(getType(function () {})); // 输出: "Function"
console.log(getType(new Date())); // 输出: "Date"
console.log(getType(/regex/)); // 输出: "RegExp"
```

## 3. 核心运算符 (Operators)

JavaScript 提供了丰富的运算符，用于执行各种操作。

### 3.1 算术运算符

**描述**: 用于执行数学运算。
| 运算符 | 描述 | 示例 |
|--------|------|------|
| `+` | 加法 | `1 + 2 // 3` |
| `-` | 减法 | `5 - 3 // 2` |
| `*` | 乘法 | `2 * 3 // 6` |
| `/` | 除法 | `10 / 2 // 5` |
| `%` | 取余 | `10 % 3 // 1` |
| `**` | 幂运算 | `2 ** 3 // 8` |
| `++` | 自增 | `let a = 1; a++; // a 变为 2` |
| `--` | 自减 | `let a = 1; a--; // a 变为 0` |
**示例**:

```javascript
// 基本算术
console.log(1 + 2); // 输出: 3
console.log(5 - 3); // 输出: 2
console.log(2 * 3); // 输出: 6
console.log(10 / 2); // 输出: 5
console.log(10 % 3); // 输出: 1
console.log(2 ** 3); // 输出: 8
// 自增和自减
let a = 1;
console.log(a++); // 输出: 1 (先使用后自增)
console.log(a); // 输出: 2
let b = 1;
console.log(++b); // 输出: 2 (先自增后使用)
console.log(b); // 输出: 2
// 字符串连接
console.log('Hello' + ' ' + 'World'); // 输出: "Hello World"
console.log(1 + '2'); // 输出: "12" (隐式类型转换)
```

### 3.2 比较运算符

**描述**: 用于比较两个值，返回布尔值。
| 运算符 | 描述 | 示例 |
|--------|------|------|
| `==` | 相等（强制类型转换） | `1 == "1" // ` |
| `===` | 严格相等（不强制类型转换） | `1 === "1" // false` |
| `!=` | 不相等（强制类型转换） | `1 != "1" // false` |
| `!==` | 严格不相等（不强制类型转换） | `1 !== "1" // ` |
| `>` | 大于 | `5 > 3 // ` |
| `<` | 小于 | `5 < 3 // false` |
| `>=` | 大于等于 | `5 >= 5 // ` |
| `<=` | 小于等于 | `5 <= 3 // false` |
**示例**:

```javascript
// 相等 vs 严格相等
console.log(1 == '1'); // 输出:  (强制类型转换)
console.log(1 === '1'); // 输出: false (类型不同)
console.log(0 == false); // 输出:  (强制类型转换)
console.log(0 === false); // 输出: false (类型不同)
console.log(null == undefined); // 输出:  (特殊情况)
console.log(null === undefined); // 输出: false (类型不同)
// 其他比较
console.log(5 > 3); // 输出:
console.log(5 < 3); // 输出: false
console.log(5 >= 5); // 输出:
console.log(5 <= 3); // 输出: false
// 字符串比较（按字典序）
console.log('apple' > 'banana'); // 输出: false
console.log('apple' < 'banana'); // 输出:
```

**推荐**: 优先使用严格相等运算符 `===` 和严格不相等运算符 `!==`，避免隐式类型转换带来的意外行为。

### 3.3 逻辑运算符

**描述**: 用于执行逻辑运算，返回布尔值或操作数。
| 运算符 | 描述 | 示例 |
|--------|------|------|
| `&&` | 逻辑与（短路） | ` && false // false` |
| `||` | 逻辑或（短路） | `|| false //` |
| `!` | 逻辑非 | `! // false` |
| `??` | 空值合并（ES2020+） | `null ?? "default" // "default"` |
**示例**:

```javascript
 // 逻辑与
 console.log( && false); // 输出: false
 console.log( && true); // 输出:
 console.log(false && true); // 输出: false (短路)
 // 逻辑或
 console.log( || false); // 输出:  (短路)
 console.log(false || true); // 输出:
 console.log(false || false); // 输出: false
 // 逻辑非
 console.log(!true); // 输出: false
 console.log(!false); // 输出:
 console.log(!0); // 输出:
 console.log(!"" ); // 输出:
 console.log(!null); // 输出:
 console.log(!undefined); // 输出:
 console.log(!{}); // 输出: false
 console.log(![]); // 输出: false
 // 空值合并
 console.log(null ?? "default"); // 输出: "default"
 console.log(undefined ?? "default"); // 输出: "default"
 console.log(false ?? "default"); // 输出: false (不是 null 或 undefined)
 console.log(0 ?? "default"); // 输出: 0 (不是 null 或 undefined)
 console.log("" ?? "default"); // 输出: "" (不是 null 或 undefined)
```

**短路求值**:

- `&&` 运算符：如果第一个操作数为 falsy，则返回第一个操作数，否则返回第二个操作数
- `||` 运算符：如果第一个操作数为 truthy，则返回第一个操作数，否则返回第二个操作数
- `??` 运算符：如果第一个操作数为 null 或 undefined，则返回第二个操作数，否则返回第一个操作数

### 3.4 三元运算符

**描述**: 条件运算符，根据条件返回不同的值。
**语法**: `condition ? expr1 : expr2`
**示例**:

```javascript
let age = 18;
let status = age >= 18 ? '成年人' : '未成年人';
console.log(status); // 输出: "成年人"
// 嵌套三元运算符
let score = 85;
let grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
console.log(grade); // 输出: "B"
```

### 3.5 赋值运算符

**描述**: 用于给变量赋值。
| 运算符 | 描述 | 示例 |
|--------|------|------|
| `=` | 基本赋值 | `let a = 1;` |
| `+=` | 加法赋值 | `a += 2; // 等价于 a = a + 2` |
| `-=` | 减法赋值 | `a -= 2; // 等价于 a = a - 2` |
| `*=` | 乘法赋值 | `a *= 2; // 等价于 a = a * 2` |
| `/=` | 除法赋值 | `a /= 2; // 等价于 a = a / 2` |
| `%=` | 取余赋值 | `a %= 2; // 等价于 a = a % 2` |
| `**=` | 幂赋值 | `a **= 2; // 等价于 a = a ** 2` |
| `&&=` | 逻辑与赋值 | `a &&= b; // 等价于 a = a && b` |
| `||=` | 逻辑或赋值 | `a ||= b; // 等价于 a = a || b` |
| `??=` | 空值合并赋值 | `a ??= b; // 等价于 a = a ?? b` |
**示例**:

```javascript
let a = 10;
// 加法赋值
a += 5; // a = 15
console.log(a); // 输出: 15
// 乘法赋值
a *= 2; // a = 30
console.log(a); // 输出: 30
// 逻辑或赋值
let b = null;
b ||= 'default'; // b = "default"
console.log(b); // 输出: "default"
// 空值合并赋值
let c = null;
c ??= 'default'; // c = "default"
console.log(c); // 输出: "default"
let d = 0;
d ??= 'default'; // d = 0 (不是 null 或 undefined)
console.log(d); // 输出: 0
```

### 3.6 其他运算符

#### 3.6.1 展开运算符 (`...`)

**描述**: 用于展开数组或对象。
**示例**:

```javascript
// 展开数组
let arr1 = [1, 2, 3];
let arr2 = [4, 5, 6];
let combined = [...arr1, ...arr2];
console.log(combined); // 输出: [1, 2, 3, 4, 5, 6]
// 展开对象
let obj1 = { a: 1, b: 2 };
let obj2 = { c: 3, d: 4 };
let merged = { ...obj1, ...obj2 };
console.log(merged); // 输出: { a: 1, b: 2, c: 3, d: 4 }
// 函数参数
function sum(...numbers) {
  return numbers.reduce((acc, curr) => acc + curr, 0);
}
console.log(sum(1, 2, 3, 4, 5)); // 输出: 15
```

#### 3.6.2 可选链运算符 (`?.`)

**描述**: 用于安全地访问对象的嵌套属性。
**示例**:

```javascript
let user = {
  name: 'Alice',
  address: {
    street: '123 Main St',
    // 没有 city 属性
  },
};
// 传统方式
console.log(user.address && user.address.city); // 输出: undefined
// 可选链
console.log(user.address?.city); // 输出: undefined
console.log(user.address?.street); // 输出: "123 Main St"
console.log(user.contact?.phone); // 输出: undefined
```

#### 3.6.3 逗号运算符 (`,`)

**描述**: 用于分隔表达式，返回最后一个表达式的值。
**示例**:

```javascript
let a = (1, 2, 3); // a = 3
console.log(a); // 输出: 3
let b;
let c = ((b = 1), b + 1); // 先执行 b = 1，再执行 b + 1
console.log(c); // 输出: 2
```

### 3.7 运算符优先级

运算符优先级决定了表达式中运算的执行顺序。优先级高的运算符先执行，优先级低的运算符后执行。
| 优先级 | 运算符 | 描述 |
|--------|--------|------|
| 1 | `()` | 括号 |
| 2 | `**` | 幂运算 |
| 3 | `++`, `--`, `!`, `~`, `typeof`, `void`, `delete` | 一元运算符 |
| 4 | `*`, `/`, `%` | 乘法、除法、取余 |
| 5 | `+`, `-` | 加法、减法 |
| 6 | `<<`, `>>`, `>>>` | 位运算 |
| 7 | `<`, `<=`, `>`, `>=`, `in`, `instanceof` | 比较运算符 |
| 8 | `==`, `!=`, `===`, `!==` | 相等运算符 |
| 9 | `&` | 按位与 |
| 10 | `^` | 按位异或 |
| 11 | `|` | 按位或 |
| 12 | `&&` | 逻辑与 |
| 13 | `||` | 逻辑或 |
| 14 | `??` | 空值合并 |
| 15 | `?:` | 三元运算符 |
| 16 | `=`, `+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `&=`, `^=`, `|=`,`<<=`,`>>=`,`>>>=`,`&&=`,`||=`,`??=` | 赋值运算符 |
| 17 | `,` | 逗号运算符 |
**示例**:

```javascript
 // 优先级示例
 console.log(2 + 3 * 4); // 输出: 14 (乘法优先于加法)
 console.log((2 + 3) * 4); // 输出: 20 (括号优先级最高)
 console.log(2 ** 3 * 4); // 输出: 32 (幂运算优先于乘法)
 console.log( || false && false); // 输出:  (逻辑与优先于逻辑或)
 console.log(1 == 2 || 3 == 3); // 输出:  (相等运算符优先于逻辑或)
```

## 4. 类型转换 (Coercion)

JavaScript 是一种弱类型语言，会在某些情况下自动进行类型转换。

### 4.1 隐式类型转换

**描述**: JavaScript 自动进行的类型转换。
**常见场景**:

#### 4.1.1 字符串拼接

```javascript
console.log(1 + '2'); // 输出: "12" (数字转换为字符串)
console.log('Hello' + 1); // 输出: "Hello1" (数字转换为字符串)
console.log(+' world'); // 输出: " world" (布尔值转换为字符串)
```

#### 4.1.2 数学运算

```javascript
console.log('10' - 5); // 输出: 5 (字符串转换为数字)
console.log('10' * 2); // 输出: 20 (字符串转换为数字)
console.log('10' / 2); // 输出: 5 (字符串转换为数字)
console.log('10' % 3); // 输出: 1 (字符串转换为数字)
console.log(+'10'); // 输出: 10 (字符串转换为数字)
console.log(+true); // 输出: 1 (布尔值转换为数字)
console.log(+false); // 输出: 0 (布尔值转换为数字)
console.log(+null); // 输出: 0 (null 转换为数字)
console.log(+undefined); // 输出: NaN (undefined 转换为数字)
```

#### 4.1.3 比较运算

```javascript
console.log(1 == '1'); // 输出:  (字符串转换为数字)
console.log(0 == false); // 输出:  (布尔值转换为数字)
console.log(null == undefined); // 输出:  (特殊情况)
console.log('' == false); // 输出:  (字符串和布尔值都转换为数字)
```

#### 4.1.4 逻辑运算

```javascript
console.log(Boolean(0)); // 输出: false
console.log(Boolean('')); // 输出: false
console.log(Boolean(null)); // 输出: false
console.log(Boolean(undefined)); // 输出: false
console.log(Boolean(NaN)); // 输出: false
console.log(Boolean({})); // 输出:
console.log(Boolean([])); // 输出:
console.log(Boolean('Hello')); // 输出:
console.log(Boolean(1)); // 输出:
```

### 4.2 显式类型转换

**描述**: 手动进行的类型转换。

#### 4.2.1 转换为数字

```javascript
// Number() 函数
console.log(Number('10')); // 输出: 10
console.log(Number('10.5')); // 输出: 10.5
console.log(Number('')); // 输出: 0
console.log(Number('Hello')); // 输出: NaN
console.log(Number(true)); // 输出: 1
console.log(Number(false)); // 输出: 0
console.log(Number(null)); // 输出: 0
console.log(Number(undefined)); // 输出: NaN
// parseInt() 函数
console.log(parseInt('10')); // 输出: 10
console.log(parseInt('10.5')); // 输出: 10
console.log(parseInt('10px')); // 输出: 10
console.log(parseInt('Hello')); // 输出: NaN
// parseFloat() 函数
console.log(parseFloat('10')); // 输出: 10
console.log(parseFloat('10.5')); // 输出: 10.5
console.log(parseFloat('10.5px')); // 输出: 10.5
```

#### 4.2.2 转换为字符串

```javascript
 // String() 函数
 console.log(String(10)); // 输出: "10"
 console.log(String(10.5)); // 输出: "10.5"
 console.log(String(true)); // 输出: ""
 console.log(String(false)); // 输出: "false"
 console.log(String(null)); // 输出: "null"
 console.log(String(undefined)); // 输出: "undefined"
 // toString() 方法
 console.log((10).toString()); // 输出: "10"
 console.log((10.5).toString()); // 输出: "10.5"
 console.log(.toString()); // 输出: ""
 console.log(false.toString()); // 输出: "false"
 // 注意: null 和 undefined 没有 toString() 方法
```

#### 4.2.3 转换为布尔值

```javascript
// Boolean() 函数
console.log(Boolean(1)); // 输出:
console.log(Boolean(0)); // 输出: false
console.log(Boolean('Hello')); // 输出:
console.log(Boolean('')); // 输出: false
console.log(Boolean({})); // 输出:
console.log(Boolean([])); // 输出:
console.log(Boolean(null)); // 输出: false
console.log(Boolean(undefined)); // 输出: false
console.log(Boolean(NaN)); // 输出: false
// 双重否定运算符 !!
console.log(!!1); // 输出:
console.log(!!0); // 输出: false
console.log(!!'Hello'); // 输出:
console.log(!!''); // 输出: false
```

### 4.3 类型转换最佳实践

- **使用严格相等运算符** (`===` 和 `!==`) 避免隐式类型转换
- **显式转换** 以提高代码可读性和可维护性
- **注意 falsy 值**，特别是 `0`, `''`, `null`, `undefined`, `NaN`
- **使用 `Number.isNaN()`** 而不是 `isNaN()`，因为 `isNaN()` 会进行类型转换
- **使用 `parseInt()` 时指定基数**，例如 `parseInt("10", 10)`

## 5. 实战示例

### 5.1 类型检测工具函数

```javascript
/**
 * 检测变量类型
 * @param {*} value - 要检测类型的变量
 * @returns {string} 变量的类型
 */
function getType(value) {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value instanceof Date) {
      return 'date';
    }
    if (value instanceof RegExp) {
      return 'regexp';
    }
    return 'object';
  }
  return typeof value;
}
// 测试
console.log(getType(42)); // 输出: "number"
console.log(getType('Hello')); // 输出: "string"
console.log(getType(true)); // 输出: "boolean"
console.log(getType(undefined)); // 输出: "undefined"
console.log(getType(null)); // 输出: "null"
console.log(getType(Symbol())); // 输出: "symbol"
console.log(getType(1n)); // 输出: "bigint"
console.log(getType({})); // 输出: "object"
console.log(getType([])); // 输出: "array"
console.log(getType(function () {})); // 输出: "function"
console.log(getType(new Date())); // 输出: "date"
console.log(getType(/regex/)); // 输出: "regexp"
```

### 5.2 安全的对象属性访问

```javascript
/**
 * 安全地访问对象的嵌套属性
 * @param {Object} obj - 要访问的对象
 * @param {string} path - 属性路径，如 "user.address.city"
 * @param {*} defaultValue - 默认值
 * @returns {*} 属性值或默认值
 */
function safeGet(obj, path, defaultValue = undefined) {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    return current[key];
  }, obj);
}
// 测试
const user = {
  name: 'Alice',
  address: {
    street: '123 Main St',
    // 没有 city 属性
  },
};
console.log(safeGet(user, 'name')); // 输出: "Alice"
console.log(safeGet(user, 'address.street')); // 输出: "123 Main St"
console.log(safeGet(user, 'address.city', 'Unknown')); // 输出: "Unknown"
console.log(safeGet(user, 'contact.phone', 'Not provided')); // 输出: "Not provided"
// 使用可选链运算符
console.log(user?.address?.city ?? 'Unknown'); // 输出: "Unknown"
```

### 5.3 类型转换工具函数

```javascript
/**
 * 转换为数字
 * @param {*} value - 要转换的值
 * @param {number} defaultValue - 默认值
 * @returns {number} 转换后的数字或默认值
 */
function toNumber(value, defaultValue = 0) {
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
}
/**
 * 转换为字符串
 * @param {*} value - 要转换的值
 * @param {string} defaultValue - 默认值
 * @returns {string} 转换后的字符串或默认值
 */
function toString(value, defaultValue = '') {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
}
/**
 * 转换为布尔值
 * @param {*} value - 要转换的值
 * @returns {boolean} 转换后的布尔值
 */
function toBoolean(value) {
  return Boolean(value);
}
// 测试
console.log(toNumber('10')); // 输出: 10
console.log(toNumber('Hello', 0)); // 输出: 0
console.log(toString(10)); // 输出: "10"
console.log(toString(null, 'N/A')); // 输出: "N/A"
console.log(toBoolean(0)); // 输出: false
console.log(toBoolean('Hello')); // 输出:
```

## 6. 常见问题与解决方案

### 6.1 类型检测问题

**问题**: `typeof null` 返回 `"object"`
**解决方案**: 使用 `value === null` 来检测 null 值
**示例**:

```javascript
function isNull(value) {
  return value === null;
}
console.log(isNull(null)); // 输出:
console.log(isNull({})); // 输出: false
```

### 6.2 精度问题

**问题**: 浮点数运算存在精度问题，如 `0.1 + 0.2 !== 0.3`
**解决方案**: 使用 `Number.EPSILON` 或转换为整数进行运算
**示例**:

```javascript
function areEqual(a, b) {
  return Math.abs(a - b) < Number.EPSILON;
}
console.log(areEqual(0.1 + 0.2, 0.3)); // 输出:
// 或转换为整数
function add(a, b, precision = 10) {
  const multiplier = Math.pow(10, precision);
  return (Math.round(a * multiplier) + Math.round(b * multiplier)) / multiplier;
}
console.log(add(0.1, 0.2)); // 输出: 0.3
```

### 6.3 隐式类型转换问题

**问题**: 隐式类型转换导致意外的结果
**解决方案**: 使用严格相等运算符 `===`，或显式转换
**示例**:

```javascript
// 问题
console.log(1 == '1'); // 输出:
console.log(0 == false); // 输出:
// 解决方案
console.log(1 === '1'); // 输出: false
console.log(0 === false); // 输出: false
// 显式转换
console.log(Number('1') === 1); // 输出:
console.log(Boolean(0) === false); // 输出:
```

### 6.4 数组与对象的类型检测

**问题**: `typeof []` 和 `typeof {}` 都返回 `"object"`
**解决方案**: 使用 `Array.isArray()` 检测数组，使用 `Object.prototype.toString.call()` 检测对象类型
**示例**:

```javascript
console.log(Array.isArray([])); // 输出:
console.log(Array.isArray({})); // 输出: false
function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}
console.log(isObject({})); // 输出:
console.log(isObject([])); // 输出: false
```

## 7. 总结

JavaScript 的数据类型和运算符是构建 JavaScript 程序的基础。通过理解原始类型和引用类型的区别，掌握类型检测的方法，以及熟练使用各种运算符，你可以编写更加健壮和高效的 JavaScript 代码。

- **数据类型**: 了解 7 种原始类型和引用类型的特点和使用方法
- **类型检测**: 使用适当的方法检测变量类型，如 `typeof`、`instanceof`、`Array.isArray()` 和 `Object.prototype.toString.call()`
- **运算符**: 掌握各种运算符的用法和优先级，特别是严格相等运算符 `===` 和现代运算符如可选链 `?.` 和空值合并 `??`
- **类型转换**: 理解隐式类型转换的规则，尽量使用显式类型转换以提高代码可读性
- **最佳实践**: 遵循类型转换的最佳实践，避免常见的类型相关问题
  通过不断练习和实践，你将能够更熟练地使用 JavaScript 的数据类型和运算符，构建出更加优雅和高效的应用。

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化 JS 数据类型与现代运算符
- 2026-04-05: 扩写内容，增加详细的数据类型介绍、类型检测方法、运算符用法、类型转换规则和实战示例
