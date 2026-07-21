# JavaScript 异步编程

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 回调函数

**基本写法：回调函数**
`function <函数>(<参数>, <回调>) { <回调>(); }`
```javascript
// 使用回调函数处理异步
function fetchData(url, callback) {
    callback(data);
}
```

---

**基本写法：错误优先回调**
`function <回调>(<错误>, <数据>) { }`
```javascript
// Node.js 风格错误优先回调
function handler(err, data) {
    if (err) {
    }
}
```

---

**基本写法：回调地狱**
`<函数>(<参数>, function() { <函数>(<参数>, function() { }) })`
```javascript
// 嵌套回调
step1(function() {
    step2(function() {
    });
});
```

---

## Promise

**基本写法：创建 Promise**
`new Promise((<resolve>, <reject>) => { })`
```javascript
// 创建 Promise 对象
let promise = new Promise((resolve, reject) => {
});
```

---

**基本写法：Promise resolve**
`new Promise((resolve) => { resolve(<值>); })`
```javascript
// 创建已完成的 Promise
let p = Promise.resolve(42);
```

---

**基本写法：Promise reject**
`new Promise((_, reject) => { reject(<错误>); })`
```javascript
// 创建已拒绝的 Promise
let p = Promise.reject(new Error("Failed"));
```

---

**基本写法：then 处理成功**
`<promise>.then(<成功回调>)`
```javascript
// 处理 Promise 成功结果
promise.then(result => {
});
```

---

**基本写法：catch 处理失败**
`<promise>.catch(<失败回调>)`
```javascript
// 处理 Promise 失败错误
promise.catch(error => {
});
```

---

**基本写法：finally 最终处理**
`<promise>.finally(<回调>)`
```javascript
// 无论成功失败都执行
promise.finally(() => {
});
```

---

**基本写法：链式调用**
`<promise>.then(<回调1>).then(<回调2>)`
```javascript
// Promise 链式调用
promise.then(result => result * 2).then(doubled => {
});
```

---

## async-await

**基本写法：async 函数**
`async function <函数名>() { }`
```javascript
// 声明异步函数
async function fetchData() {
}
```

---

**基本写法：await 等待**
`await <Promise>`
```javascript
// 等待 Promise 完成获取结果
let data = await promise;
```

---

**基本写法：async 箭头函数**
`async (<参数>) => { }`
```javascript
// 异步箭头函数
let fetch = async (url) => {
};
```

---

**基本写法：await 错误处理**
`try { await <Promise> } catch (<错误>) { }`
```javascript
// 使用 try-catch 处理 await 错误
try {
    let data = await promise;
} catch (error) {
}
```

---

**基本写法：async 返回值**
`async function <函数>() { return <值>; }`
```javascript
// async 函数返回 Promise
async function getValue() {
    return 42;
}
```

---

## Promise 静态方法

**基本写法：Promise.all**
`Promise.all([<promise1>, <promise2>])`
```javascript
// 等待所有 Promise 完成
Promise.all([p1, p2, p3]).then(results => {
});
```

---

**基本写法：Promise.race**
`Promise.race([<promise1>, <promise2>])`
```javascript
// 返回第一个完成的 Promise
Promise.race([p1, p2]).then(result => {
});
```

---

**基本写法：Promise.allSettled**
`Promise.allSettled([<promise1>, <promise2>])`
```javascript
// 等待所有 Promise 落定无论成功失败
Promise.allSettled([p1, p2]).then(results => {
});
```

---

**基本写法：Promise.any**
`Promise.any([<promise1>, <promise2>])`
```javascript
// 返回第一个成功的 Promise
Promise.any([p1, p2]).then(result => {
});
```

---

## 定时器

**基本写法：setTimeout**
`setTimeout(<回调>, <毫秒>)`
```javascript
// 延迟执行一次
setTimeout(() => {
}, 1000);
```

---

**基本写法：setInterval**
`setInterval(<回调>, <毫秒>)`
```javascript
// 重复执行
setInterval(() => {
}, 1000);
```

---

**基本写法：clearTimeout**
`clearTimeout(<定时器ID>)`
```javascript
// 清除延迟定时器
clearTimeout(timerId);
```

---

**基本写法：clearInterval**
`clearInterval(<定时器ID>)`
```javascript
// 清除重复定时器
clearInterval(timerId);
```

---

## Promise 封装

**基本写法：Promise 封装 setTimeout**
`new Promise(<resolve> => setTimeout(<resolve>, <毫秒>))`
```javascript
// 将 setTimeout 封装为 Promise
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

**基本写法：Promise 封装回调函数**
`new Promise((<resolve>, <reject>) => { <回调函数>(<参数>, (<错误>, <数据>) => { }) })`
```javascript
// 将回调函数封装为 Promise
function promisify(fn) {
    return new Promise((resolve, reject) => {
        fn((err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}
```

---

## 并发控制

**基本写法：async 并发执行**
`await Promise.all([<异步1>(), <异步2>()])`
```javascript
// 并发执行多个异步操作
let [a, b] = await Promise.all([fetchA(), fetchB()]);
```

---

**基本写法：async 顺序执行**
`let <结果1> = await <异步1>(); let <结果2> = await <异步2>();`
```javascript
// 顺序执行多个异步操作
let a = await fetchA();
let b = await fetchB();
```

---

**基本写法：async 循环处理**
`for (let <项> of <数组>) { await <异步>(<项>); }`
```javascript
// 顺序处理数组中的异步操作
for (let item of items) {
    await processItem(item);
}
```

---

## 事件循环

**基本写法：微任务 queueMicrotask**
`queueMicrotask(<回调>)`
```javascript
// 将任务添加到微任务队列
queueMicrotask(() => {
});
```

---

**基本写法：宏任务 setTimeout**
`setTimeout(<回调>, 0)`
```javascript
// 将任务添加到宏任务队列
setTimeout(() => {
}, 0);
```

---

## ES2025 异步新特性

**基本写法：using 显式资源管理**
`using <变量> = <资源>`
```javascript
// 同步资源在作用域结束时自动调用 Symbol.dispose
{
    using handle = createResource();
    handle.doWork();
} // 自动调用 handle[Symbol.dispose]()
```

---

**基本写法：await using 异步资源管理**
`await using <变量> = <异步资源>`
```javascript
// 异步资源在作用域结束时自动 await Symbol.asyncDispose
{
    await using conn = await getConnection();
    await conn.query("SELECT 1");
} // 自动 await conn[Symbol.asyncDispose]()
```

---

**基本写法：Promise.try 替代 async 函数包装**
`Promise.try(<函数>)`
```javascript
// 将同步或异步函数统一包装为 Promise 无需 async 关键字
let p = Promise.try(() => {
    if (cached) return cached;
    return fetch("/api");
});
```
