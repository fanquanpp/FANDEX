# JavaScript 生成器函数

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 生成器函数声明

**基本写法：生成器函数声明**
`function* <函数名>() { }`
```javascript
// 声明生成器函数
function* generator() {
}
```

---

**基本写法：生成器函数表达式**
`let <变量> = function*() { };`
```javascript
// 生成器函数表达式
let gen = function*() {
};
```

---

**基本写法：对象方法生成器**
`let <对象> = { *<方法名>() { } };`
```javascript
// 对象中的生成器方法
let obj = {
    *generator() {
    }
};
```

---

**基本写法：类方法生成器**
`class <类> { *<方法名>() { } }`
```javascript
// 类中的生成器方法
class Range {
    *iterator() {
    }
}
```

---

## yield 表达式

**基本写法：yield 单个值**
`yield <值>;`
```javascript
// 产出单个值
function* gen() {
    yield 1;
    yield 2;
}
```

---

**基本写法：yield 多个值**
`yield <值1>; yield <值2>;`
```javascript
// 产出多个值
function* gen() {
    yield "a";
    yield "b";
    yield "c";
}
```

---

**基本写法：yield 表达式**
`yield <表达式>;`
```javascript
// yield 表达式结果
function* gen() {
    yield 1 + 2;
}
```

---

**基本写法：yield 变量**
`yield <变量>;`
```javascript
// yield 变量值
function* gen() {
    let value = getValue();
    yield value;
}
```

---

## 生成器迭代

**基本写法：创建迭代器**
`let <迭代器> = <生成器函数>();`
```javascript
// 调用生成器函数创建迭代器
let it = generator();
```

---

**基本写法：next 方法**
`<迭代器>.next()`
```javascript
// 获取下一个 yield 的值
let result = it.next();
```

---

**基本写法：next 返回值**
`<迭代器>.next().value`
```javascript
// 获取 yield 产出的值
let value = it.next().value;
```

---

**基本写法：next done 检查**
`<迭代器>.next().done`
```javascript
// 检查迭代是否完成
let done = it.next().done;
```

---

**基本写法：for-of 遍历生成器**
`for (let <值> of <生成器>()) { }`
```javascript
// 使用 for-of 遍历生成器
for (let value of generator()) {
}
```

---

## yield 委托

**基本写法：yield 委托**
`yield* <可迭代对象>;`
```javascript
// 委托给另一个可迭代对象
function* gen() {
    yield* [1, 2, 3];
}
```

---

**基本写法：委托给另一个生成器**
`yield* <生成器函数>();`
```javascript
// 委托给另一个生成器函数
function* inner() {
    yield 1;
    yield 2;
}
function* outer() {
    yield* inner();
    yield 3;
}
```

---

**基本写法：委托返回值**
`let <结果> = yield* <生成器>();`
```javascript
// 获取委托生成器的返回值
function* inner() {
    yield 1;
    return "done";
}
function* outer() {
    let result = yield* inner();
}
```

---

## 生成器传值

**基本写法：next 传值**
`<迭代器>.next(<值>)`
```javascript
// 向生成器内部传递值
function* gen() {
    let input = yield;
}
let it = gen();
it.next();
it.next(42);
```

---

**基本写法：yield 接收值**
`let <变量> = yield <值>;`
```javascript
// yield 表达式接收外部传入的值
function* gen() {
    let received = yield "first";
}
```

---

## return 语句

**基本写法：生成器 return**
`return <值>;`
```javascript
// 生成器中 return 终止迭代
function* gen() {
    yield 1;
    return "finished";
    yield 2;
}
```

---

**基本写法：return 方法**
`<迭代器>.return(<值>)`
```javascript
// 提前终止生成器
let it = gen();
it.return("terminated");
```

---

## throw 方法

**基本写法：throw 注入错误**
`<迭代器>.throw(new Error("<消息>"))`
```javascript
// 向生成器内部抛出错误
let it = gen();
it.next();
it.throw(new Error("Error"));
```

---

**基本写法：生成器捕获错误**
`try { yield <值>; } catch (<错误>) { }`
```javascript
// 生成器内部捕获 throw 注入的错误
function* gen() {
    try {
        yield 1;
    } catch (error) {
    }
}
```

---

## 无限生成器

**基本写法：无限序列**
`while (true) { yield <值>; }`
```javascript
// 生成无限序列
function* counter() {
    let i = 0;
    while (true) {
        yield i++;
    }
}
```

---

**基本写法：斐波那契生成器**
`function* <函数>() { while (true) { yield <值>; } }`
```javascript
// 生成斐波那契数列
function* fibonacci() {
    let [a, b] = [0, 1];
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}
```

---

## 生成器应用

**基本写法：ID 生成器**
`function* <函数>() { let <变量> = <初始值>; while (true) { yield <变量>++; } }`
```javascript
// 生成唯一 ID
function* idGenerator() {
    let id = 1;
    while (true) {
        yield id++;
    }
}
```

---

**基本写法：状态机**
`function* <函数>() { while (true) { yield <状态1>; yield <状态2>; } }`
```javascript
// 生成器实现状态机
function* stateMachine() {
    while (true) {
        yield "ON";
        yield "OFF";
    }
}
```

---

**基本写法：惰性计算**
`function* <函数>(<数组>) { for (let <项> of <数组>) { yield <处理>(<项>); } }`
```javascript
// 惰性处理数据
function* process(items) {
    for (let item of items) {
        yield transform(item);
    }
}
```

---

## 异步生成器

**基本写法：异步生成器函数**
`async function* <函数名>() { }`
```javascript
// 声明异步生成器函数
async function* asyncGen() {
}
```

---

**基本写法：yield 异步值**
`yield await <Promise>;`
```javascript
// 异步生成器产出 Promise 结果
async function* fetchItems() {
    let data = await fetch("url");
    yield data;
}
```

---

**基本写法：for-await-of 遍历**
`for await (let <值> of <异步生成器>) { }`
```javascript
// 使用 for-await-of 遍历异步生成器
for await (let item of asyncGen()) {
}
```

---

**基本写法：异步生成器 next**
`await <异步迭代器>.next()`
```javascript
// 等待异步生成器下一个值
let it = asyncGen();
let result = await it.next();
```
