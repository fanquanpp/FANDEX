# JavaScript Promise 静态方法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## Promise.resolve

**基本写法：resolve 值**
`Promise.resolve(<值>)`
```javascript
// 创建已完成的 Promise
let p = Promise.resolve(42);
```

---

**基本写法：resolve 对象**
`Promise.resolve(<对象>)`
```javascript
// 将对象包装为 Promise
let p = Promise.resolve({ name: "Alice" });
```

---

**基本写法：resolve 数组**
`Promise.resolve(<数组>)`
```javascript
// 将数组包装为 Promise
let p = Promise.resolve([1, 2, 3]);
```

---

**基本写法：resolve thenable**
`Promise.resolve(<thenable>)`
```javascript
// 将 thenable 对象转换为 Promise
let p = Promise.resolve({ then: (resolve) => resolve(42) });
```

---

**基本写法：resolve Promise**
`Promise.resolve(<promise>)`
```javascript
// 传入 Promise 原样返回
let original = Promise.resolve(1);
let p = Promise.resolve(original);
```

---

## Promise.reject

**基本写法：reject 错误**
`Promise.reject(new Error("<消息>"))`
```javascript
// 创建已拒绝的 Promise
let p = Promise.reject(new Error("failed"));
```

---

**基本写法：reject 字符串**
`Promise.reject("<消息>")`
```javascript
// 使用字符串作为拒绝原因
let p = Promise.reject("error occurred");
```

---

**基本写法：reject 对象**
`Promise.reject({ <属性>: <值> })`
```javascript
// 使用对象作为拒绝原因
let p = Promise.reject({ code: 500, message: "Server Error" });
```

---

## Promise.all

**基本写法：all 等待全部**
`Promise.all([<promise1>, <promise2>])`
```javascript
// 等待所有 Promise 完成
Promise.all([p1, p2]).then(results => {
});
```

---

**基本写法：all 结果顺序**
`Promise.all([<promise1>, <promise2>]).then(([<结果1>, <结果2>]) => { })`
```javascript
// 结果顺序与传入顺序一致
Promise.all([fetchA(), fetchB()]).then(([a, b]) => {
});
```

---

**基本写法：all 任一失败**
`Promise.all([<promise1>, <promise2>]).catch(<回调>)`
```javascript
// 任一 Promise 失败则整体失败
Promise.all([p1, p2]).catch(error => {
});
```

---

**基本写法：all 空数组**
`Promise.all([])`
```javascript
// 空数组立即完成
Promise.all([]).then(results => {
});
```

---

## Promise.allSettled

**基本写法：allSettled 等待全部落定**
`Promise.allSettled([<promise1>, <promise2>])`
```javascript
// 等待所有 Promise 落定无论成功失败
Promise.allSettled([p1, p2]).then(results => {
});
```

---

**基本写法：allSettled 结果处理**
`Promise.allSettled([<promise1>, <promise2>]).then(<回调>)`
```javascript
// 处理每个 Promise 的状态和值
Promise.allSettled([p1, p2]).then(results => {
    results.forEach(result => {
        if (result.status === "fulfilled") {
        }
    });
});
```

---

## Promise.race

**基本写法：race 竞速**
`Promise.race([<promise1>, <promise2>])`
```javascript
// 返回第一个落定的 Promise
Promise.race([p1, p2]).then(result => {
});
```

---

**基本写法：race 超时控制**
`Promise.race([<promise>, <超时Promise>])`
```javascript
// 使用 race 实现超时控制
Promise.race([
    fetchData(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
]);
```

---

## Promise.any

**基本写法：any 第一个成功**
`Promise.any([<promise1>, <promise2>])`
```javascript
// 返回第一个成功的 Promise
Promise.any([p1, p2]).then(result => {
});
```

---

**基本写法：any 全部失败**
`Promise.any([<promise1>, <promise2>]).catch(<回调>)`
```javascript
// 所有 Promise 失败则抛出 AggregateError
Promise.any([p1, p2]).catch(error => {
});
```

---

## Promise.withResolvers

**基本写法：withResolvers**
`Promise.withResolvers()`
```javascript
// 获取 Promise 和 resolve reject 函数
const { promise, resolve, reject } = Promise.withResolvers();
```

---

## 实用模式

**基本写法：并行执行**
`Promise.all([<异步1>(), <异步2>(), <异步3>()])`
```javascript
// 并行执行多个异步操作
Promise.all([fetchUsers(), fetchPosts(), fetchComments()]);
```

---

**基本写法：容错执行**
`Promise.allSettled([<promise1>, <promise2>])`
```javascript
// 容错执行即使部分失败也继续
Promise.allSettled([fetchA(), fetchB()]).then(results => {
});
```

---

**基本写法：首个成功**
`Promise.any([<promise1>, <promise2>])`
```javascript
// 获取首个成功的响应
Promise.any([fetchPrimary(), fetchBackup()]);
```

---

**基本写法：超时控制**
`Promise.race([<promise>, <超时Promise>])`
```javascript
// 限制 Promise 执行时间
Promise.race([
    fetch(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))
]);
```

---

## 错误处理

**基本写法：all 错误处理**
`Promise.all([<promise1>, <promise2>]).catch(<回调>)`
```javascript
// Promise.all 任一失败触发 catch
Promise.all([p1, p2]).catch(error => {
});
```

---

**基本写法：any 错误处理**
`Promise.any([<promise1>, <promise2>]).catch(<回调>)`
```javascript
// Promise.any 全部失败触发 AggregateError
Promise.any([p1, p2]).catch(error => {
});
```

---

**基本写法：allSettled 错误处理**
`Promise.allSettled([<promise1>, <promise2>]).then(<回调>)`
```javascript
// allSettled 不会触发 catch 需在 then 中处理
Promise.allSettled([p1, p2]).then(results => {
    results.forEach(r => {
        if (r.status === "rejected") {
        }
    });
});
```

---

## 数组映射为 Promise

**基本写法：数组映射 Promise**
`Promise.all(<数组>.map(<异步函数>))`
```javascript
// 将数组元素映射为 Promise 并行执行
Promise.all(urls.map(url => fetch(url)));
```

---

**基本写法：数组顺序执行**
`<数组>.reduce(<链式回调>, Promise.resolve())`
```javascript
// 顺序执行数组中的异步操作
items.reduce((chain, item) => chain.then(() => process(item)), Promise.resolve());
```

---

## ES2024+ Promise 新增

**基本写法：ES2024 Promise.withResolvers**
`const { promise, resolve, reject } = Promise.withResolvers()`
```javascript
// ES2024 新增替代 new Promise 内部 resolve reject 模式
const { promise, resolve } = Promise.withResolvers();
setTimeout(() => resolve("done"), 1000);
let result = await promise;
```

---

**基本写法：ES2025 Promise.try**
`Promise.try(<函数>)`
```javascript
// 将同步或异步函数调用统一包装为 Promise 无需 async 关键字
let p = Promise.try(() => {
    if (invalid) throw new Error("bad");
    return fetch("/api");
});
```

---

**基本写法：withResolvers 与传统 Deferred 对比**
`Promise.withResolvers() // 替代 new Promise((resolve, reject) => { })`
```javascript
// 传统写法 resolve reject 受限于回调作用域
// withResolvers 在外部获取无需嵌套回调
const { promise, resolve, reject } = Promise.withResolvers();
// 可在外部任意位置调用 resolve reject
button.onclick = () => resolve("clicked");
```
