# JavaScript 函数-作用域与闭包

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 函数声明

**基本写法：函数声明**
`function <函数名>(<参数>) { }`
```javascript
// 声明一个函数
function greet(name) {
}
```

---

**基本写法：函数表达式**
`let <变量> = function(<参数>) { };`
```javascript
// 将函数赋值给变量
let greet = function(name) {
};
```

---

**基本写法：具名函数表达式**
`let <变量> = function <函数名>(<参数>) { };`
```javascript
// 函数表达式带名称用于内部递归
let factorial = function compute(n) {
};
```

---

## 箭头函数

**基本写法：箭头函数单参数**
`<参数> => <表达式>`
```javascript
// 单参数箭头函数直接返回
let square = x => x * x;
```

---

**基本写法：箭头函数多参数**
`(<参数1>, <参数2>) => <表达式>`
```javascript
// 多参数箭头函数直接返回
let add = (a, b) => a + b;
```

---

**基本写法：箭头函数带函数体**
`(<参数>) => { <语句> }`
```javascript
// 箭头函数带函数体需要 return
let greet = (name) => {
    return "Hello, " + name;
};
```

---

**基本写法：无参数箭头函数**
`() => <表达式>`
```javascript
// 无参数箭头函数
let getRandom = () => Math.random();
```

---

**基本写法：箭头函数返回对象**
`(<参数>) => ({ <属性>: <值> })`
```javascript
// 箭头函数直接返回对象字面量
let createUser = (name) => ({ name: name, age: 0 });
```

---

## 参数处理

**基本写法：默认参数**
`function <函数名>(<参数> = <默认值>) { }`
```javascript
// 参数默认值
function greet(name = "Guest") {
}
```

---

**基本写法：剩余参数**
`function <函数名>(...<参数名>) { }`
```javascript
// 收集剩余参数为数组
function sum(...numbers) {
}
```

---

**基本写法：arguments 对象**
`arguments[<索引>]`
```javascript
// 访问函数的所有参数
function logArgs() {
    console.log(arguments[0]);
}
```

---

## 函数调用

**基本写法：普通调用**
`<函数名>(<参数>)`
```javascript
// 直接调用函数
greet("Alice");
```

---

**基本写法：call 调用**
`<函数>.call(<this对象>, <参数1>, <参数2>)`
```javascript
// 指定 this 和参数调用函数
greet.call(obj, "Alice");
```

---

**基本写法：apply 调用**
`<函数>.apply(<this对象>, [<参数数组>])`
```javascript
// 指定 this 和参数数组调用函数
greet.apply(obj, ["Alice"]);
```

---

**基本写法：bind 绑定**
`<函数>.bind(<this对象>)`
```javascript
// 创建绑定了 this 的新函数
let boundGreet = greet.bind(obj);
```

---

## 作用域

**基本写法：全局作用域**
`let <变量> = <值>;`
```javascript
// 在全局声明的变量
let globalVar = 10;
```

---

**基本写法：函数作用域**
`function <函数>() { var <变量> = <值>; }`
```javascript
// var 声明的变量为函数级作用域
function test() {
    var functionVar = 10;
}
```

---

**基本写法：块级作用域**
`{ let <变量> = <值>; }`
```javascript
// let 声明的变量为块级作用域
{
    let blockVar = 10;
}
```

---

## 闭包

**基本写法：闭包基本结构**
`function <外部函数>() { let <变量>; return function() { }; }`
```javascript
// 内部函数访问外部函数的变量
function createCounter() {
    let count = 0;
    return function() {
        count++;
    };
}
```

---

**基本写法：使用闭包**
`let <变量> = <外部函数>();`
```javascript
// 创建闭包并使用
let counter = createCounter();
counter();
```

---

**基本写法：闭包工厂**
`function <工厂>(<配置>) { return function(<参数>) { }; }`
```javascript
// 闭包实现工厂函数
function createMultiplier(factor) {
    return function(number) {
        return number * factor;
    };
}
```

---

**基本写法：模块模式**
`const <模块> = (function() { let <私有变量>; return { <方法> }; })();`
```javascript
// 闭包实现模块模式
const counter = (function() {
    let count = 0;
    return {
        increment: function() { count++; }
    };
})();
```

---

## 递归

**基本写法：递归结构**
`function <函数名>(<参数>) { if (<基准条件>) return <基准值>; return <函数名>(<修改参数>); }`
```javascript
// 递归函数基本结构
function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

---

**基本写法：斐波那契递归**
`function fibonacci(<参数>)`
```javascript
// 斐波那契数列递归实现
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

---

## 高阶函数

**基本写法：函数作为参数**
`function <函数>(<回调函数>) { <回调函数>(); }`
```javascript
// 接受函数作为参数
function execute(callback) {
    callback();
}
```

---

**基本写法：函数作为返回值**
`function <函数>() { return function() { }; }`
```javascript
// 返回函数作为结果
function getHandler() {
    return function() {
    };
}
```

---

## 立即执行函数

**基本写法：IIFE**
`(function() { })();`
```javascript
// 立即执行函数表达式
(function() {
})();
```

---

**基本写法：带参数 IIFE**
`(function(<参数>) { })(<值>);`
```javascript
// 带参数的立即执行函数
(function(name) {
})( "Alice");
```

---

**基本写法：箭头函数 IIFE**
`(() => { })();`
```javascript
// 箭头函数立即执行
(() => {
})();
```

---

## this 关键字

**基本写法：方法中的 this**
`<对象>.<方法> = function() { this.<属性>; }`
```javascript
// 方法中 this 指向调用对象
let obj = {
    name: "Alice",
    getName: function() {
        return this.name;
    }
};
```

---

**基本写法：箭头函数中的 this**
`<对象>.<方法> = () => { }`
```javascript
// 箭头函数继承外层 this
let obj = {
    name: "Alice",
    getName: () => {
    }
};
```

---

## 函数属性

**基本写法：函数 length**
`<函数>.length`
```javascript
// 获取函数形参个数
let paramCount = greet.length;
```

---

**基本写法：函数 name**
`<函数>.name`
```javascript
// 获取函数名称
let funcName = greet.name;
```

---

## 生成器函数

**基本写法：生成器函数声明**
`function* <函数名>() { yield <值>; }`
```javascript
// 声明生成器函数
function* generator() {
    yield 1;
    yield 2;
}
```

---

**基本写法：使用生成器**
`let <迭代器> = <生成器函数>();`
```javascript
// 创建生成器迭代器
let gen = generator();
gen.next();
```
