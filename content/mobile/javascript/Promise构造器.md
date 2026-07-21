# JavaScript Promise 构造器

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## Promise 创建

**基本写法：创建 Promise**
`new Promise((<resolve>, <reject>) => { })`
```javascript
// 创建 Promise 对象
let promise = new Promise((resolve, reject) => {
});
```

---

**基本写法：resolve 完成**
`new Promise((resolve) => { resolve(<值>); })`
```javascript
// 创建已完成的 Promise
let p = new Promise((resolve) => {
    resolve("success");
});
```

---

**基本写法：reject 拒绝**
`new Promise((_, reject) => { reject(<错误>); })`
```javascript
// 创建已拒绝的 Promise
let p = new Promise((_, reject) => {
    reject(new Error("failed"));
});
```

---

## Promise 状态

**基本写法：pending 状态**
`new Promise(() => { })`
```javascript
// 创建 pending 状态的 Promise 永不落定
let p = new Promise(() => {
});
```

---

**基本写法：fulfilled 状态**
`Promise.resolve(<值>)`
```javascript
// 创建 fulfilled 状态的 Promise
let p = Promise.resolve(42);
```

---

**基本写法：rejected 状态**
`Promise.reject(<错误>)`
```javascript
// 创建 rejected 状态的 Promise
let p = Promise.reject(new Error("error"));
```

---

## then 方法

**基本写法：then 成功回调**
`<promise>.then(<回调>)`
```javascript
// 处理 Promise 成功结果
promise.then(result => {
});
```

---

**基本写法：then 成功和失败回调**
`<promise>.then(<成功回调>, <失败回调>)`
```javascript
// 同时处理成功和失败
promise.then(
    result => {
    },
    error => {
    }
);
```

---

**基本写法：then 返回值**
`<promise>.then(<回调>).then(<回调>)`
```javascript
// then 返回值传递给下一个 then
promise.then(result => result * 2).then(doubled => {
});
```

---

**基本写法：then 返回 Promise**
`<promise>.then(() => <Promise>)`
```javascript
// then 返回 Promise 会等待完成
promise.then(result => {
    return anotherPromise;
});
```

---

## catch 方法

**基本写法：catch 错误处理**
`<promise>.catch(<错误回调>)`
```javascript
// 捕获 Promise 错误
promise.catch(error => {
});
```

---

**基本写法：catch 链式**
`<promise>.then(<回调>).catch(<回调>)`
```javascript
// then 后接 catch 捕获错误
promise.then(result => {
}).catch(error => {
});
```

---

**基本写法：catch 恢复**
`<promise>.catch(() => <恢复值>)`
```javascript
// catch 返回值可以恢复链
promise.catch(() => "default value").then(result => {
});
```

---

## finally 方法

**基本写法：finally 最终处理**
`<promise>.finally(<回调>)`
```javascript
// 无论成功失败都执行
promise.finally(() => {
});
```

---

**基本写法：finally 链式**
`<promise>.then(<回调>).catch(<回调>).finally(<回调>)`
```javascript
// 完整的 Promise 链
promise
    .then(result => {
    })
    .catch(error => {
    })
    .finally(() => {
    });
```

---

## Promise 链

**基本写法：链式调用**
`<promise>.then(<回调1>).then(<回调2>).then(<回调3>)`
```javascript
// 多个 then 链式调用
promise.then(step1).then(step2).then(step3);
```

---

**换行写法：长链式调用**
`<promise>.then(<回调>).then(<回调>).then(<回调>)`
```javascript
// 换行书写长链式调用
promise
    .then(result => process(result))
    .then(processed => transform(processed))
    .then(transformed => save(transformed));
```

---

**基本写法：链中抛出错误**
`<promise>.then(() => { throw new Error("<消息>"); })`
```javascript
// then 中抛出错误会被 catch 捕获
promise.then(() => {
    throw new Error("Something went wrong");
}).catch(error => {
});
```

---

## Promise 组合

**基本写法：Promise.all**
`Promise.all([<promise1>, <promise2>])`
```javascript
// 等待所有 Promise 完成
Promise.all([p1, p2]).then(results => {
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
// 等待所有 Promise 落定
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

## Promise 静态方法

**基本写法：Promise.resolve**
`Promise.resolve(<值>)`
```javascript
// 创建已完成的 Promise
let p = Promise.resolve(42);
```

---

**基本写法：Promise.reject**
`Promise.reject(<错误>)`
```javascript
// 创建已拒绝的 Promise
let p = Promise.reject(new Error("error"));
```

---

**基本写法：Promise.resolve thenable**
`Promise.resolve(<thenable对象>)`
```javascript
// 将 thenable 对象转换为 Promise
let p = Promise.resolve({ then: (resolve) => resolve(42) });
```

---

## 错误处理

**基本写法：throw 错误**
`throw new Error("<消息>")`
```javascript
// 在 Promise 中抛出错误
new Promise(() => {
    throw new Error("Failed");
});
```

---

**基本写法：reject 错误**
`reject(new Error("<消息>"))`
```javascript
// 使用 reject 拒绝 Promise
new Promise((_, reject) => {
    reject(new Error("Failed"));
});
```

---

**基本写法：捕获特定错误**
`<promise>.catch(<错误> => { if (<错误> instanceof <类型>) { } })`
```javascript
// 捕获特定类型的错误
promise.catch(error => {
    if (error instanceof TypeError) {
    }
});
```

---

## Promise 实用模式

**基本写法：Promise 超时**
`Promise.race([<promise>, <超时Promise>])`
```javascript
// 实现 Promise 超时
Promise.race([
    fetchData(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
]);
```

---

**基本写法：Promise 重试**
`function <重试函数>(<函数>, <次数>) { return <函数>().catch(() => <次数> > 0 ? <重试函数>(<函数>, <次数> - 1) : Promise.reject()); }`
```javascript
// 实现 Promise 重试机制
function retry(fn, times) {
    return fn().catch(() => times > 0 ? retry(fn, times - 1) : Promise.reject());
}
```

---

**基本写法：Promise 顺序执行**
`<数组>.reduce((<链>, <promise>) => <链>.then(() => <promise>()), Promise.resolve())`
```javascript
// 顺序执行 Promise 数组
promises.reduce((chain, promise) => chain.then(() => promise()), Promise.resolve());
```
