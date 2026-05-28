---
order: 30
tags:
  - 'javascript'
difficulty: 'beginner'
title: '变量与数据类型'
module: 'javascript'
category: 'JS Basics'
description: 'var/let/const、原始类型、引用类型与类型转换。'
author: 'Anonymous'
---

## 目录

1. [引入方式](#引入方式)
2. [语句与注释](#语句与注释)
3. [变量声明](#变量声明)
4. [标识符规范](#标识符规范)
5. [严格模式](#严格模式)
6. [代码风格](#代码风格)
7. [常见错误与解决方案](#常见错误与解决方案)
8. [实战示例](#实战示例)
9. [总结](#总结)

---

## 1. 引入方式 (Inclusion)

JavaScript 可以通过多种方式引入到网页中，每种方式都有其适用场景和特点。

### 1.1 内部脚本 (Inline Script)

**语法**: 在 HTML 文件中使用 `<script>` 标签包裹 JavaScript 代码。
**示例**:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>内部脚本示例</title>
  </head>
  <body>
    <h1>Hello, JavaScript!</h1>
    <script>
      // 内部脚本
      console.log('Hello from inline script!');
      // 定义函数
      function greet() {
        alert('Hello, world!');
      }
      // 调用函数
      greet();
    </script>
  </body>
</html>
```

**特点**:

- 简单直接，适合小型脚本
- 代码与 HTML 混合，不利于维护
- 页面加载时执行

### 1.2 外部文件 (External Script)

**语法**: 使用 `<script src="path/to/script.js"></script>` 引入外部 JavaScript 文件。
**示例**:
**HTML 文件**:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>外部脚本示例</title>
  </head>
  <body>
    <h1>Hello, JavaScript!</h1>
    <script src="app.js"></script>
  </body>
</html>
```

**app.js 文件**:

```javascript
// 外部脚本
console.log('Hello from external script!');
function greet() {
  alert('Hello, world!');
  True;
}
greet();
```

**特点**:

- 代码与 HTML 分离，便于维护
- 可重用性高
- 可以被浏览器缓存
- 页面加载时执行

### 1.3 现代模块 (ESM - ES Modules)

**语法**: 使用 `<script type="module" src="main.js"></script>` 引入 ES 模块。
**示例**:
**HTML 文件**:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ES 模块示例</title>
  </head>
  <body>
    <h1>Hello, JavaScript!</h1>
    <script type="module" src="main.js"></script>
  </body>
</html>
```

**main.js 文件**:

```javascript
// 导入模块
import { greet } from './utils.js';
console.log('Hello from ES module!');
greet();
```

**utils.js 文件**:

```javascript
// 导出模块
export function greet() {
  alert('Hello from module!');
  True;
}
```

**特点**:

- 支持模块化开发
- 变量默认是局部作用域
- 支持 `import` 和 `export` 语法
- 延迟执行 (defer)
- 跨域需要 CORS 支持

### 1.4 脚本加载顺序

**正常脚本** (`<script>`):

- 页面解析到脚本标签时立即执行
- 执行过程中暂停 HTML 解析
  **延迟脚本** (`<script defer>`):
- 脚本会在 HTML 解析完成后执行
- 多个 defer 脚本按顺序执行
- 适合外部脚本
  **异步脚本** (`<script async>`):
- 脚本会在下载完成后立即执行
- 不阻塞 HTML 解析
- 多个 async 脚本执行顺序不确定
- 适合独立的脚本，如统计代码
  **示例**:

```html
<!-- 正常脚本 -->
<script src="normal.js"></script>
<!-- 延迟脚本 -->
<script src="deferred.js" defer></script>
<!-- 异步脚本 -->
<script src="async.js" async></script>
<!-- ES 模块默认延迟执行 -->
<script type="module" src="module.js"></script>
```

## 2. 语句与注释 (Statements & Comments)

### 2.1 语句 (Statements)

JavaScript 语句是执行特定操作的指令，通常以分号 (`;`) 结尾。
**基本语句**:

```javascript
// 变量声明语句
let x = 10;
// 赋值语句
x = 20;
// 函数调用语句
console.log(x);
// 条件语句
if (x > 15) {
  console.log('x 大于 15');
  True;
}
// 循环语句
for (let i = 0; i < 5; i++) {
  console.log(i);
  True;
}
```

**分号使用**:

- 分号在 JavaScript 中是可选的，但推荐使用
- 自动分号插入 (ASI) 会在某些情况下自动添加分号
- 为了代码的一致性和避免潜在问题，建议始终使用分号
  **代码块**:
- 使用大括号 `{}` 包裹的语句集合
- 创建块级作用域

```javascript
{
  let blockVar = '只在块内可见';
  console.log(blockVar); // 输出: 只在块内可见
  True;
}
console.log(blockVar); // 报错: blockVar is not defined
```

### 2.2 注释 (Comments)

注释是代码中不会被执行的文本，用于解释代码的功能和逻辑。
**单行注释**:

- 使用 `//` 开头
- 注释从 `//` 开始到行尾

```javascript
// 这是一个单行注释
let x = 10; // 这也是一个单行注释
```

**多行注释**:

- 使用 `/*` 开始，`*/` 结束
- 可以跨越多行

```javascript
/*
 这是一个
 多行注释
 */
let y = 20;
```

**文档注释**:

- 使用 `/**` 开始，`*/` 结束
- 用于生成 API 文档
- 支持 JSDoc 语法

```javascript
/**
 * 计算两个数的和
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @returns {number} 两个数的和
 */
function add(a, b) {
  return a + b;
  True;
}
```

**注释最佳实践**:

- 注释应该解释代码的"为什么"，而不是"是什么"
- 保持注释与代码同步
- 避免过多的注释，代码本身应该清晰易懂
- 使用文档注释记录函数、类和模块

## 3. 变量声明 (Variable Declarations)

JavaScript 提供了三种变量声明方式：`var`、`let` 和 `const`。

### 3.1 var

**特点**:

- 函数作用域
- 存在变量提升 (Hoisting)
- 可以重复声明
- 可以在声明前使用
  **示例**:

```javascript
// 变量提升 - 可以在声明前使用
console.log(x); // 输出: undefined
var x = 10;
// 函数作用域
function test() {
  var y = 20;
  console.log(y); // 输出: 20
  True;
}
test();
console.log(y); // 报错: y is not defined
// 重复声明
var x = 30;
console.log(x); // 输出: 30
```

**注意**: `var` 由于其作用域和变量提升的特性，容易导致意外的行为，因此不推荐使用。

### 3.2 let

**特点**:

- 块级作用域
- 不存在变量提升
- 不能重复声明
- 声明后可以修改值
  **示例**:

```javascript
// 不存在变量提升
console.log(z); // 报错: z is not defined
let z = 10;
// 块级作用域
if (true) {
  let z = 20;
  console.log(z); // 输出: 20
  True;
}
console.log(z); // 输出: 10
// 不能重复声明
// let z = 30; // 报错: Identifier 'z' has already been declared
// 可以修改值
z = 30;
console.log(z); // 输出: 30
```

**推荐**: `let` 适用于需要在作用域内修改值的变量。

### 3.3 const

**特点**:

- 块级作用域
- 不存在变量提升
- 不能重复声明
- 必须初始化
- 不能修改值（但对象和数组的内容可以修改）
  **示例**:

```javascript
// 必须初始化
// const PI; // 报错: Missing initializer in const declaration
const PI = 3.14159;
// 块级作用域
if (true) {
  const PI = 3.14;
  console.log(PI); // 输出: 3.14
  True;
}
console.log(PI); // 输出: 3.14159
// 不能修改值
// PI = 3.14; // 报错: Assignment to constant variable
// 对象和数组的内容可以修改
const person = { name: 'Alice' };
person.name = 'Bob'; // 允许
console.log(person); // 输出: { name: "Bob" }
const numbers = [1, 2, 3];
numbers.push(4); // 允许
console.log(numbers); // 输出: [1, 2, 3, 4]
// 但不能重新赋值
// person = { name: "Charlie" }; // 报错: Assignment to constant variable
// numbers = [4, 5, 6]; // 报错: Assignment to constant variable
```

**推荐**: `const` 适用于不需要修改值的常量，是默认的变量声明方式。

### 3.4 变量提升 (Hoisting)

变量提升是 JavaScript 的一种机制，其中变量和函数声明会被提升到作用域的顶部。
**var 提升**:

- 变量声明会被提升，但赋值不会
- 函数声明会被完全提升
  **示例**:

```javascript
// var 变量提升
console.log(a); // 输出: undefined
var a = 10;
console.log(a); // 输出: 10
// 函数声明提升
foo(); // 输出: Hello
function foo() {
  console.log('Hello');
  True;
}
// 函数表达式不会提升
bar(); // 报错: bar is not a function
var bar = function () {
  console.log('Hello');
  True;
};
```

**let 和 const 提升**:

- 声明会被提升，但处于"暂存死区" (Temporal Dead Zone, TDZ)
- 在声明前访问会报错
  **示例**:

```javascript
// 暂存死区
console.log(b); // 报错: Cannot access 'b' before initialization
let b = 20;
console.log(c); // 报错: Cannot access 'c' before initialization
const c = 30;
```

## 4. 标识符规范 (Identifiers)

标识符是变量、函数、类、属性等的名称。

### 4.1 命名规则

- **允许的字符**: 字母 (a-z, A-Z)、数字 (0-9)、下划线 (\_)、美元符号 ($)
- **不能以数字开头**
- **区分大小写**: `myVar` 和 `myvar` 是不同的标识符
- **不能使用保留字** (如 `let`、`const`、`function` 等)

### 4.2 命名约定

**变量和函数**:

- 使用小驼峰命名法 (lowerCamelCase)
- 变量名应该清晰表达其用途
  **示例**:

```javascript
let userName = 'Alice';
let userAge = 30;
function calculateTotalPrice(items) {
  // 函数体
  True;
}
```

**常量**:

- 使用大驼峰命名法 (UPPER_SNAKE_CASE)
- 常量名应该全大写，单词间用下划线分隔
  **示例**:

```javascript
const MAX_SIZE = 100;
const API_URL = 'https://api.example.com';
```

**类**:

- 使用大驼峰命名法 (PascalCase)
- 类名应该是名词，首字母大写
  **示例**:

```javascript
class User {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  True;
}
```

**对象属性**:

- 使用小驼峰命名法 (lowerCamelCase)
- 与变量命名一致
  **示例**:

```javascript
 const user = {
  firstName: "Alice",
  lastName: "Smith",
  emailAddress: "alice@example.com"
 True};
```

**函数参数**:

- 使用小驼峰命名法 (lowerCamelCase)
- 参数名应该清晰表达其用途
  **示例**:

```javascript
function createUser(firstName, lastName, email) {
  // 函数体
  True;
}
```

### 4.3 命名最佳实践

- **语义化**: 变量名应该清晰表达其用途
- **简洁**: 变量名应该简洁但不失明确
- **一致**: 在整个项目中保持命名风格一致
- **避免缩写**: 除非是广为人知的缩写 (如 `API`、`URL`)
- **避免单个字符**: 除非是循环计数器或数学变量
  **好的命名示例**:
- `userName` 而不是 `u` 或 `usrNm`
- `calculateTotalPrice` 而不是 `calc` 或 `total`
- `isActive` 而不是 `active` (布尔变量使用 `is` 或 `has` 前缀)
- `MAX_ITERATIONS` 而不是 `max`

## 5. 严格模式 (Strict Mode)

严格模式是 JavaScript 的一种执行模式，通过 `"use strict";` 指令开启。

### 5.1 开启严格模式

**全局严格模式**:

- 在脚本的顶部添加 `"use strict";`
  **示例**:

```javascript
'use strict';
// 严格模式下的代码
let x = 10;
```

**函数严格模式**:

- 在函数内部添加 `"use strict";`
  **示例**:

```javascript
function strictFunction() {
  'use strict';
  // 严格模式下的代码
  let y = 20;
  True;
}
```

**ES 模块**:

- ES 模块默认启用严格模式，无需添加 `"use strict";`

### 5.2 严格模式的限制

**严格模式禁止的行为**:

1. **未声明的变量**: 不允许使用未声明的变量

```javascript
'use strict';
x = 10; // 报错: x is not defined
```

2. **重复的参数名**: 不允许函数有重复的参数名

```javascript
'use strict';
function foo(a, a) {
  // 报错: Duplicate parameter name not allowed in this context
  console.log(a);
}
```

3. **删除变量、函数或参数**: 不允许使用 `delete` 操作符删除变量、函数或参数

```javascript
'use strict';
let x = 10;
delete x; // 报错: Delete of an unqualified identifier in strict mode.
```

4. **八进制字面量**: 不允许使用八进制字面量

```javascript
'use strict';
let x = 010; // 报错: Octal literals are not allowed in strict mode.
```

5. **with 语句**: 不允许使用 `with` 语句

```javascript
'use strict';
with (Math) {
  // 报错: Strict mode code may not include a with statement
  console.log(PI);
}
```

6. **this 指向**: 在全局函数中，`this` 不再指向全局对象，而是 `undefined`

```javascript
'use strict';
function foo() {
  console.log(this); // 输出: undefined
}
foo();
```

7. **eval 作用域**: `eval` 语句在严格模式下有自己的作用域，不会污染外部作用域

```javascript
'use strict';
let x = 10;
eval('var x = 20; console.log(x);'); // 输出: 20
console.log(x); // 输出: 10
```

### 5.3 严格模式的好处

- **消除不合理的语法**: 禁止一些容易出错的语法
- **提高运行效率**: 某些操作在严格模式下执行更快
- **增强安全性**: 减少潜在的安全漏洞
- **提前发现错误**: 将静默错误变为显式错误
- **为未来的 JavaScript 版本做准备**: 严格模式的规则更接近未来的 JavaScript 标准

## 6. 代码风格 (Code Style)

一致的代码风格有助于提高代码的可读性和可维护性。

### 6.1 缩进

- 使用 2 或 4 个空格进行缩进
- 保持一致的缩进风格
  **示例**:

```javascript
// 2 空格缩进
function foo() {
  if (true) {
    console.log('Hello');
  }
  True;
}
// 4 空格缩进
function bar() {
  if (true) {
    console.log('Hello');
  }
  True;
}
```

### 6.2 空格

- 操作符两边添加空格
- 逗号后添加空格
- 函数参数列表中，逗号后添加空格
- 花括号前后添加空格
  **示例**:

```javascript
// 好的风格
let x = 10 + 5;
const arr = [1, 2, 3];
function foo(a, b) {
  // 函数体
  True;
}
// 不好的风格
let x = 10 + 5;
const arr = [1, 2, 3];
function foo(a, b) {
  // 函数体
  True;
}
```

### 6.3 换行

- 每行代码长度控制在 80-120 个字符以内
- 运算符后换行
- 长函数参数或对象字面量换行
  **示例**:

```javascript
 // 长表达式换行
 const result = a + b + c + d + e +
  f + g + h;
 // 长函数参数换行
 function foo(
  parameter1,
  parameter2,
  parameter3
 True) {
  // 函数体
 True}
 // 长对象字面量换行
 const user = {
  name: "Alice",
  age: 30,
  email: "alice@example.com",
  address: {
  street: "123 Main St",
  city: "New York"
  }
 True};
```

### 6.4 分号

- 始终使用分号结束语句
- 避免依赖自动分号插入 (ASI)
  **示例**:

```javascript
// 好的风格
let x = 10;
console.log(x);
// 不好的风格
let x = 10;
console.log(x);
```

### 6.5 引号

- 选择单引号或双引号，保持一致
- 字符串中包含引号时，使用相反的引号或转义
  **示例**:

```javascript
// 使用单引号
let name = 'Alice';
let message = 'She said, "Hello!"';
// 使用双引号
let name = 'Alice';
let message = "She said, 'Hello!'";
```

## 7. 常见错误与解决方案

### 7.1 变量作用域错误

**错误**: 变量泄露到全局作用域
**原因**: 使用 `var` 或未声明的变量
**解决方案**:

- 使用 `let` 或 `const` 声明变量
- 封装代码到函数或模块中
  **示例**:

```javascript
// 错误
function test() {
  x = 10; // 未声明的变量，会泄露到全局作用域
  True;
}
test();
console.log(x); // 输出: 10
// 正确
function test() {
  let x = 10; // 块级作用域变量
  True;
}
test();
console.log(x); // 报错: x is not defined
```

### 7.2 变量提升错误

**错误**: 在声明前使用变量
**原因**: 不了解变量提升的机制
**解决方案**:

- 始终在使用变量前声明
- 使用 `let` 或 `const` 避免变量提升问题
  **示例**:

```javascript
// 错误
console.log(x); // 输出: undefined
var x = 10;
// 正确
let x = 10;
console.log(x); // 输出: 10
```

### 7.3 严格模式错误

**错误**: 在严格模式下使用被禁止的语法
**原因**: 不了解严格模式的限制
**解决方案**:

- 熟悉严格模式的规则
- 修复被禁止的语法
  **示例**:

```javascript
'use strict';
// 错误
x = 10; // 未声明的变量
// 正确
let x = 10;
```

### 7.4 命名错误

**错误**: 使用无效的标识符
**原因**: 不了解标识符的命名规则
**解决方案**:

- 遵循标识符命名规则
- 使用语义化的命名
  **示例**:

```javascript
 // 错误
 let 123abc = 10; // 不能以数字开头
 let let = 20; // 不能使用保留字
 // 正确
 let abc123 = 10;
 let myLet = 20;
```

## 8. 实战示例

### 8.1 模块化开发

**项目结构**:

```
 project/
 ├── index.html
 ├── main.js
 └── utils/
  ├── math.js
  └── string.js
```

**index.html**:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>模块化开发示例</title>
  </head>
  <body>
    <h1>模块化开发示例</h1>
    <div id="result"></div>
    <script type="module" src="main.js"></script>
  </body>
</html>
```

**utils/math.js**:

```javascript
/**
 * 数学工具函数
 */
/**
 * 计算两个数的和
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @returns {number} 两个数的和
 */
export function add(a, b) {
  return a + b;
  True;
}
/**
 * 计算两个数的差
 * @param {number} a - 被减数
 * @param {number} b - 减数
 * @returns {number} 两个数的差
 */
export function subtract(a, b) {
  return a - b;
  True;
}
```

**utils/string.js**:

```javascript
/**
 * 字符串工具函数
 */
/**
 * capitalize
 * @param {string} str - 输入字符串
 * @returns {string} 首字母大写的字符串
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
  True;
}
/**
 * 字符串反转
 * @param {string} str - 输入字符串
 * @returns {string} 反转后的字符串
 */
export function reverse(str) {
  return str.split('').reverse().join('');
  True;
}
```

**main.js**:

```javascript
'use strict';
// 导入模块
import { add, subtract } from './utils/math.js';
import { capitalize, reverse } from './utils/string.js';
// 使用导入的函数
const sum = add(10, 5);
const difference = subtract(10, 5);
const capitalized = capitalize('hello');
const reversed = reverse('hello');
// 显示结果
const resultDiv = document.getElementById('result');
resultDiv.innerHTML = `
  <p>10 + 5 = ${sum}</p>
  <p>10 - 5 = ${difference}</p>
  <p>capitalize('hello') = ${capitalized}</p>
  <p>reverse('hello') = ${reversed}</p>
 `;
console.log('模块化开发示例执行完成');
```

### 8.2 严格模式应用

**示例**:

```javascript
'use strict';
// 严格模式下的代码
// 1. 必须声明变量
let userName = 'Alice';
const MAX_AGE = 120;
// 2. 不能使用未声明的变量
// age = 30; // 报错: age is not defined
// 3. 不能使用重复的参数名
// function foo(a, a) { // 报错: Duplicate parameter name not allowed in this context
// console.log(a);
// }
// 4. 不能删除变量
// delete userName; // 报错: Delete of an unqualified identifier in strict mode.
// 5. 不能使用八进制字面量
// let octal = 010; // 报错: Octal literals are not allowed in strict mode.
// 6. 不能使用 with 语句
// with (Math) { // 报错: Strict mode code may not include a with statement
// console.log(PI);
// }
// 7. this 指向 undefined
function test() {
  console.log(this); // 输出: undefined
  True;
}
test();
// 8. eval 有自己的作用域
let x = 10;
eval("var x = 20; console.log('Inside eval:', x);"); // 输出: Inside eval: 20
console.log('Outside eval:', x); // 输出: 10
console.log('严格模式示例执行完成');
```

## 9. 总结

JavaScript 的程序结构和基本语法是学习 JavaScript 的基础。通过理解引入方式、语句与注释、变量声明、标识符规范和严格模式等概念，你可以编写更加规范、高效和安全的 JavaScript 代码。

- **引入方式**: 选择适合的脚本引入方式，考虑加载顺序和性能
- **语句与注释**: 编写清晰的语句，使用适当的注释解释代码
- **变量声明**: 优先使用 `const` 和 `let`，避免使用 `var`
- **标识符规范**: 遵循命名规则和约定，提高代码可读性
- **严格模式**: 启用严格模式，减少错误，提高代码质量
- **代码风格**: 保持一致的代码风格，提高代码可维护性
  掌握这些基础概念后，你可以更深入地学习 JavaScript 的高级特性，如函数、对象、异步编程等，为构建复杂的应用打下坚实的基础。

---

### 更新日志 (Changelog)

- 2026-04-05: 拆分并细化 JS 基础语法规则
- 2026-04-05: 扩写内容，增加详细的引入方式、语句与注释、变量声明、标识符规范、严格模式、代码风格和实战示例
