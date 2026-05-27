# 异步编程 (Asynchronous JS)
 False
 False> @Version: v3.5.0
 False
 False> @Author: Anonymous
 False> @Category: JS Basics
 False> @Description: 事件循环、Callback、Promise、Async/Await 及 Fetch。 | Event Loop, Promises, and Async/Await.
 False
 False---
 False
 False## 目录
 False
 False1. [异步编程的概念](#异步编程的概念)
 False2. [事件循环](#事件循环)
 False3. [回调函数](#回调函数)
 False4. [Promise](#promise)
 False5. [Async / Await](#async-/-await)
 False6. [常见的异步操作](#常见的异步操作)
 False7. [异步编程的最佳实践](#异步编程的最佳实践)
 False8. [实际应用示例](#实际应用示例)
 False
 False---
 False
 False## 1. 异步编程的概念
 False
 False### 1.1 什么是异步编程
 False
 False**定义**：异步编程是一种编程范式，允许程序在执行一个任务的同时，继续执行其他任务，而不需要等待该任务完成。
 False
 False**为什么需要异步编程**：
 False
 False- JavaScript 是单线程的，如果所有操作都是同步的，那么耗时的操作（如网络请求、文件读写）会阻塞整个程序的执行。
 False- 异步编程可以提高程序的响应速度和用户体验，使程序能够在等待耗时操作完成的同时，继续执行其他任务。
 False
 False### 1.2 同步 vs 异步
 False
 False| 类型 | 特点 | 示例 |
 False|------|------|------|
 False| 同步 | 阻塞执行，按顺序执行任务 | `console.log('Hello'); console.log('World');` |
 False| 异步 | 非阻塞执行，任务完成后通过回调或 Promise 通知 | `setTimeout(() => console.log('Hello'), 1000); console.log('World');` |
 False
 False**示例**：
 False
```javascript
 True// 同步代码
 Trueconsole.log('开始');
 Trueconsole.log('执行同步任务');
 Trueconsole.log('结束');
 True// 输出顺序:
 True// 开始
 True// 执行同步任务
 True// 结束
 True
 True// 异步代码
 Trueconsole.log('开始');
 TruesetTimeout(() => {
 True console.log('执行异步任务');
 True}, 1000);
 Trueconsole.log('结束');
 True// 输出顺序:
 True// 开始
 True// 结束
 True// 执行异步任务 (1秒后)
 True```

 False## 2. 事件循环 (Event Loop)
 False
 False### 2.1 事件循环的工作原理
 False
 False**定义**：事件循环是 JavaScript 处理异步任务的机制，它负责协调同步任务和异步任务的执行。
 False
 False**组成部分**：
 False
 False1. **调用栈 (Call Stack)**：执行同步任务的地方，遵循后进先出 (LIFO) 原则。
 False2. **微任务队列 (Microtask Queue)**：存放微任务，如 `Promise.then()`, `Promise.catch()`, `Promise.finally()`, `process.nextTick()` (Node.js)。
 False3. **宏任务队列 (Macrotask Queue)**：存放宏任务，如 `setTimeout`, `setInterval`, `setImmediate` (Node.js), I/O 操作, 事件回调。
 False
 False**执行顺序**：
 False
 False1. 执行调用栈中的同步任务，直到调用栈为空。
 False2. 执行所有微任务队列中的任务，直到微任务队列为空。
 False3. 从宏任务队列中取出一个任务执行。
 False4. 重复步骤 1-3。
 False
 False**优先级**：微任务 > 宏任务。
 False
 False### 2.2 事件循环的示例
 False
```javascript
 Trueconsole.log('1. 同步任务开始');
 True
 TruesetTimeout(() => {
 True console.log('4. 宏任务执行');
 True}, 0);
 True
 TruePromise.resolve().then(() => {
 True console.log('3. 微任务执行');
 True});
 True
 Trueconsole.log('2. 同步任务结束');
 True
 True// 输出顺序:
 True// 1. 同步任务开始
 True// 2. 同步任务结束
 True// 3. 微任务执行
 True// 4. 宏任务执行
 True```

 False## 3. 回调函数 (Callback)
 False
 False### 3.1 什么是回调函数
 False
 False**定义**：回调函数是作为参数传递给另一个函数的函数，当异步操作完成时，该函数会被调用。
 False
 False**示例**：
 False
```javascript
 True// 简单的回调函数
 Truefunction fetchData(callback) {
 True setTimeout(() => {
 True const data = { name: '张三', age: 30 };
 True callback(data);
 True }, 1000);
 True}
 True
 TruefetchData((data) => {
 True console.log('获取到数据:', data);
 True});
 True```

 False### 3.2 回调地狱 (Callback Hell)
 False
 False**定义**：当多个异步操作需要按顺序执行时，会产生嵌套的回调函数，导致代码可读性差、难以维护，这种情况称为回调地狱。
 False
 False**示例**：
 False
```javascript
 True// 回调地狱
 TruefetchUser((user) => {
 True fetchPosts(user.id, (posts) => {
 True fetchComments(posts[0].id, (comments) => {
 True console.log('评论:', comments);
 True });
 True });
 True});
 True```

 False## 4. Promise (ES6)
 False
 False### 4.1 Promise 的概念
 False
 False**定义**：Promise 是一种用于处理异步操作的对象，它表示一个可能在未来完成的操作及其结果。
 False
 False**状态**：
 False
 False- `pending`：初始状态，既不是成功也不是失败。
 False- `fulfilled`：操作成功完成。
 False- `rejected`：操作失败。
 False
 False**特点**：
 False
 False- 状态一旦改变，就不会再变。
 False- 可以通过 `.then()`、`.catch()` 和 `.finally()` 方法链式调用。
 False
 False### 4.2 创建 Promise
 False
 False**语法**：
 False
```javascript
 Trueconst promise = new Promise((resolve, reject) => {
 True // 异步操作
 True if (操作成功) {
 True resolve(结果);
 True } else {
 True reject(错误);
 True }
 True});
 True```

 False**示例**：
 False
```javascript
 Trueconst promise = new Promise((resolve, reject) => {
 True setTimeout(() => {
 True const random = Math.random();
 True if (random > 0.5) {
 True resolve('操作成功');
 True } else {
 True reject('操作失败');
 True }
 True }, 1000);
 True});
 True
 Truepromise
 True .then((result) => {
 True console.log('成功:', result);
 True })
 True .catch((error) => {
 True console.log('失败:', error);
 True });
 True```

 False### 4.3 Promise 的方法
 False
 False#### 4.3.1 then()
 False
 False**作用**：处理 Promise 的成功状态。
 False
 False**语法**：`promise.then(onFulfilled, onRejected)`
 False
 False**示例**：
 False
```javascript
 Trueconst promise = Promise.resolve('成功');
 True
 Truepromise.then((result) => {
 True console.log('处理成功:', result);
 True return '处理后的结果';
 True}).then((result) => {
 True console.log('再次处理:', result);
 True});
 True```

 False#### 4.3.2 catch()
 False
 False**作用**：处理 Promise 的失败状态。
 False
 False**语法**：`promise.catch(onRejected)`
 False
 False**示例**：
 False
```javascript
 Trueconst promise = Promise.reject('失败');
 True
 Truepromise
 True .then((result) => {
 True console.log('处理成功:', result);
 True })
 True .catch((error) => {
 True console.log('处理失败:', error);
 True });
 True```

 False#### 4.3.3 finally()
 False
 False**作用**：无论 Promise 是成功还是失败，都会执行的回调函数。
 False
 False**语法**：`promise.finally(onFinally)`
 False
 False**示例**：
 False
```javascript
 Trueconst promise = new Promise((resolve, reject) => {
 True setTimeout(() => {
 True resolve('成功');
 True }, 1000);
 True});
 True
 Truepromise
 True .then((result) => {
 True console.log('成功:', result);
 True })
 True .catch((error) => {
 True console.log('失败:', error);
 True })
 True .finally(() => {
 True console.log('操作完成');
 True });
 True```

 False#### 4.3.4 Promise.all()
 False
 False**作用**：等待所有 Promise 完成，返回一个包含所有结果的数组。
 False
 False**语法**：`Promise.all(iterable)`
 False
 False**示例**：
 False
```javascript
 Trueconst promise1 = Promise.resolve(1);
 Trueconst promise2 = Promise.resolve(2);
 Trueconst promise3 = Promise.resolve(3);
 True
 TruePromise.all([promise1, promise2, promise3])
 True .then((results) => {
 True console.log('所有 Promise 完成:', results); // 输出: [1, 2, 3]
 True });
 True```

 False#### 4.3.5 Promise.race()
 False
 False**作用**：返回第一个完成的 Promise 的结果。
 False
 False**语法**：`Promise.race(iterable)`
 False
 False**示例**：
 False
```javascript
 Trueconst promise1 = new Promise((resolve) => setTimeout(() => resolve('第一个'), 1000));
 Trueconst promise2 = new Promise((resolve) => setTimeout(() => resolve('第二个'), 500));
 True
 TruePromise.race([promise1, promise2])
 True .then((result) => {
 True console.log('第一个完成的 Promise:', result); // 输出: 第二个
 True });
 True```

 False#### 4.3.6 Promise.resolve()
 False
 False**作用**：返回一个已解决的 Promise。
 False
 False**语法**：`Promise.resolve(value)`
 False
 False**示例**：
 False
```javascript
 Trueconst promise = Promise.resolve('成功');
 Truepromise.then((result) => {
 True console.log(result); // 输出: 成功
 True});
 True```

 False#### 4.3.7 Promise.reject()
 False
 False**作用**：返回一个已拒绝的 Promise。
 False
 False**语法**：`Promise.reject(reason)`
 False
 False**示例**：
 False
```javascript
 Trueconst promise = Promise.reject('失败');
 Truepromise.catch((error) => {
 True console.log(error); // 输出: 失败
 True});
 True```

 False## 5. Async / Await (ES2017)
 False
 False### 5.1 Async / Await 的概念
 False
 False**定义**：Async / Await 是基于 Promise 的语法糖，使异步代码看起来像同步代码，提高代码的可读性和可维护性。
 False
 False**特点**：
 False
 False- `async` 关键字用于声明异步函数，该函数返回一个 Promise。
 False- `await` 关键字用于等待 Promise 完成，只能在异步函数中使用。
 False- 可以使用 try-catch 来处理错误。
 False
 False### 5.2 Async / Await 的使用
 False
 False**语法**：
 False
```javascript
 Trueasync function functionName() {
 True try {
 True const result = await promise;
 True // 处理结果
 True } catch (error) {
 True // 处理错误
 True }
 True}
 True```

 False**示例**：
 False
```javascript
 Trueasync function fetchData() {
 True try {
 True // 模拟网络请求
 True const response = await new Promise((resolve) => {
 True setTimeout(() => {
 True resolve({ data: { name: '张三', age: 30 } });
 True }, 1000);
 True });
 True 
 True console.log('获取到数据:', response.data);
 True return response.data;
 True } catch (error) {
 True console.error('错误:', error);
 True throw error;
 True }
 True}
 True
 TruefetchData().then((data) => {
 True console.log('处理数据:', data);
 True});
 True```

 False### 5.3 Async / Await 与 Promise 的对比
 False
 False**Promise 链式调用**：
 False
```javascript
 Truefetch('https://api.example.com/data')
 True .then(response => response.json())
 True .then(data => {
 True console.log(data);
 True return fetch('https://api.example.com/other');
 True })
 True .then(response => response.json())
 True .then(otherData => {
 True console.log(otherData);
 True })
 True .catch(error => {
 True console.error(error);
 True });
 True```

 False**Async / Await**：
 False
```javascript
 Trueasync function fetchData() {
 True try {
 True const response = await fetch('https://api.example.com/data');
 True const data = await response.json();
 True console.log(data);
 True 
 True const otherResponse = await fetch('https://api.example.com/other');
 True const otherData = await otherResponse.json();
 True console.log(otherData);
 True } catch (error) {
 True console.error(error);
 True }
 True}
 True
 TruefetchData();
 True```

 False## 6. 常见的异步操作
 False
 False### 6.1 计时器
 False
 False#### 6.1.1 setTimeout()
 False
 False**作用**：在指定的毫秒数后执行一次函数。
 False
 False**语法**：`setTimeout(callback, delay, ...args)`
 False
 False**示例**：
 False
```javascript
 Trueconst timeoutId = setTimeout(() => {
 True console.log('1秒后执行');
 True}, 1000);
 True
 True// 取消计时器
 TrueclearTimeout(timeoutId);
 True```

 False#### 6.1.2 setInterval()
 False
 False**作用**：每隔指定的毫秒数重复执行一次函数。
 False
 False**语法**：`setInterval(callback, delay, ...args)`
 False
 False**示例**：
 False
```javascript
 Trueconst intervalId = setInterval(() => {
 True console.log('每1秒执行一次');
 True}, 1000);
 True
 True// 取消计时器
 TrueclearInterval(intervalId);
 True```

 False### 6.2 网络请求
 False
 False#### 6.2.1 Fetch API
 False
 False**作用**：现代的网络请求 API，返回 Promise。
 False
 False**语法**：`fetch(url, options)`
 False
 False**示例**：
 False
```javascript
 True// GET 请求
 Truefetch('https://api.example.com/data')
 True .then(response => {
 True if (!response.ok) {
 True throw new Error('网络请求失败');
 True }
 True return response.json();
 True })
 True .then(data => {
 True console.log('获取到数据:', data);
 True })
 True .catch(error => {
 True console.error('错误:', error);
 True });
 True
 True// POST 请求
 Truefetch('https://api.example.com/data', {
 True method: 'POST',
 True headers: {
 True 'Content-Type': 'application/json'
 True },
 True body: JSON.stringify({ name: '张三', age: 30 })
 True})
 True .then(response => response.json())
 True .then(data => {
 True console.log('提交成功:', data);
 True });
 True```

 False#### 6.2.2 XMLHttpRequest
 False
 False**作用**：传统的网络请求 API，基于回调。
 False
 False**示例**：
 False
```javascript
 Trueconst xhr = new XMLHttpRequest();
 Truexhr.open('GET', 'https://api.example.com/data');
 Truexhr.onload = function() {
 True if (xhr.status === 200) {
 True const data = JSON.parse(xhr.responseText);
 True console.log('获取到数据:', data);
 True } else {
 True console.error('网络请求失败:', xhr.status);
 True }
 True};
 Truexhr.onerror = function() {
 True console.error('网络错误');
 True};
 Truexhr.send();
 True```

 False#### 6.2.3 Axios
 False
 False**作用**：基于 Promise 的 HTTP 客户端，支持浏览器和 Node.js。
 False
 False**示例**：
 False
```javascript
 True// 安装: npm install axios
 True
 True// GET 请求
 Trueaxios.get('https://api.example.com/data')
 True .then(response => {
 True console.log('获取到数据:', response.data);
 True })
 True .catch(error => {
 True console.error('错误:', error);
 True });
 True
 True// POST 请求
 Trueaxios.post('https://api.example.com/data', {
 True name: '张三',
 True age: 30
 True})
 True .then(response => {
 True console.log('提交成功:', response.data);
 True })
 True .catch(error => {
 True console.error('错误:', error);
 True });
 True```

 False### 6.3 文件操作 (Node.js)
 False
 False**示例**：
 False
```javascript
 Trueconst fs = require('fs');
 True
 True// 异步读取文件
 Truefs.readFile('file.txt', 'utf8', (err, data) => {
 True if (err) {
 True console.error('读取文件失败:', err);
 True return;
 True }
 True console.log('文件内容:', data);
 True});
 True
 True// 异步写入文件
 Truefs.writeFile('file.txt', 'Hello World', (err) => {
 True if (err) {
 True console.error('写入文件失败:', err);
 True return;
 True }
 True console.log('写入文件成功');
 True});
 True```

 False## 7. 异步编程的最佳实践
 False
 False### 7.1 使用 Promise 替代回调
 False
 False**推荐**：使用 Promise 或 Async / Await 替代传统的回调函数，避免回调地狱。
 False
 False**示例**：
 False
```javascript
 True// 不好的做法（回调地狱）
 Truefunction fetchData(callback) {
 True fetchUser((user) => {
 True fetchPosts(user.id, (posts) => {
 True fetchComments(posts[0].id, (comments) => {
 True callback(comments);
 True });
 True });
 True });
 True}
 True
 True// 好的做法（Promise 链式调用）
 Truefunction fetchData() {
 True return fetchUser()
 True .then(user => fetchPosts(user.id))
 True .then(posts => fetchComments(posts[0].id));
 True}
 True
 True// 更好的做法（Async / Await）
 Trueasync function fetchData() {
 True const user = await fetchUser();
 True const posts = await fetchPosts(user.id);
 True const comments = await fetchComments(posts[0].id);
 True return comments;
 True}
 True```

 False### 7.2 错误处理
 False
 False**推荐**：使用 try-catch 或 Promise 的 catch() 方法处理错误。
 False
 False**示例**：
 False
```javascript
 True// 使用 try-catch
 Trueasync function fetchData() {
 True try {
 True const response = await fetch('https://api.example.com/data');
 True if (!response.ok) {
 True throw new Error('网络请求失败');
 True }
 True const data = await response.json();
 True return data;
 True } catch (error) {
 True console.error('错误:', error);
 True throw error;
 True }
 True}
 True
 True// 使用 Promise 的 catch()
 Truefetch('https://api.example.com/data')
 True .then(response => {
 True if (!response.ok) {
 True throw new Error('网络请求失败');
 True }
 True return response.json();
 True })
 True .then(data => {
 True console.log('数据:', data);
 True })
 True .catch(error => {
 True console.error('错误:', error);
 True });
 True```

 False### 7.3 并行执行多个异步操作
 False
 False**推荐**：使用 Promise.all() 并行执行多个异步操作，提高性能。
 False
 False**示例**：
 False
```javascript
 True// 串行执行（较慢）
 Trueasync function fetchData() {
 True const user = await fetchUser();
 True const posts = await fetchPosts();
 True const comments = await fetchComments();
 True return { user, posts, comments };
 True}
 True
 True// 并行执行（较快）
 Trueasync function fetchData() {
 True const [user, posts, comments] = await Promise.all([
 True fetchUser(),
 True fetchPosts(),
 True fetchComments()
 True ]);
 True return { user, posts, comments };
 True}
 True```

 False### 7.4 避免过度使用 await
 False
 False**推荐**：只在需要等待结果的地方使用 await，避免不必要的等待。
 False
 False**示例**：
 False
```javascript
 True// 不好的做法（不必要的等待）
 Trueasync function processData() {
 True const data1 = await fetchData1();
 True const data2 = await fetchData2(); // 等待 data1 获取完成后才开始获取 data2
 True return { data1, data2 };
 True}
 True
 True// 好的做法（并行获取）
 Trueasync function processData() {
 True const promise1 = fetchData1();
 True const promise2 = fetchData2(); // 同时开始获取 data1 和 data2
 True const [data1, data2] = await Promise.all([promise1, promise2]);
 True return { data1, data2 };
 True}
 True```

 False### 7.5 使用 async/await 时的注意事项
 False
 False1. **async 函数总是返回 Promise**：即使函数没有显式返回值，也会返回一个 resolved 的 Promise。
 False
 False2. **await 只能在 async 函数中使用**：在非 async 函数中使用 await 会导致语法错误。
 False
 False3. **错误处理**：使用 try-catch 来捕获 await 可能抛出的错误。
 False
 False4. **避免阻塞**：在 async 函数中，await 会阻塞函数的执行，直到 Promise 完成。对于不需要等待结果的操作，不要使用 await。
 False
 False## 8. 实际应用示例
 False
 False### 8.1 示例 1：用户登录流程
 False
```javascript
 Trueasync function login(username, password) {
 True try {
 True // 1. 发送登录请求
 True const response = await fetch('https://api.example.com/login', {
 True method: 'POST',
 True headers: {
 True 'Content-Type': 'application/json'
 True },
 True body: JSON.stringify({ username, password })
 True });
 True 
 True if (!response.ok) {
 True throw new Error('登录失败');
 True }
 True 
 True // 2. 获取登录结果
 True const data = await response.json();
 True 
 True // 3. 存储 token
 True localStorage.setItem('token', data.token);
 True 
 True // 4. 获取用户信息
 True const userResponse = await fetch('https://api.example.com/user', {
 True headers: {
 True 'Authorization': `Bearer ${data.token}`
 True }
 True });
 True 
 True if (!userResponse.ok) {
 True throw new Error('获取用户信息失败');
 True }
 True 
 True const user = await userResponse.json();
 True return user;
 True } catch (error) {
 True console.error('登录错误:', error);
 True throw error;
 True }
 True}
 True
 True// 使用
 Truelogin('admin', 'password')
 True .then(user => {
 True console.log('登录成功:', user);
 True })
 True .catch(error => {
 True console.error('登录失败:', error);
 True });
 True```

 False### 8.2 示例 2：数据批量处理
 False
```javascript
 Trueasync function processBatch(data) {
 True try {
 True // 并行处理所有数据
 True const results = await Promise.all(
 True data.map(item => {
 True return fetch('https://api.example.com/process', {
 True method: 'POST',
 True headers: {
 True 'Content-Type': 'application/json'
 True },
 True body: JSON.stringify(item)
 True })
 True .then(response => {
 True if (!response.ok) {
 True throw new Error(`处理数据失败: ${item.id}`);
 True }
 True return response.json();
 True });
 True })
 True );
 True 
 True console.log('批量处理完成:', results);
 True return results;
 True } catch (error) {
 True console.error('批量处理错误:', error);
 True throw error;
 True }
 True}
 True
 True// 使用
 Trueconst data = [
 True { id: 1, name: '数据1' },
 True { id: 2, name: '数据2' },
 True { id: 3, name: '数据3' }
 True];
 True
 TrueprocessBatch(data)
 True .then(results => {
 True console.log('处理结果:', results);
 True })
 True .catch(error => {
 True console.error('处理失败:', error);
 True });
 True```

 False### 8.3 示例 3：图片上传
 False
```javascript
 Trueasync function uploadImages(images) {
 True try {
 True const uploadPromises = images.map((image, index) => {
 True const formData = new FormData();
 True formData.append('image', image);
 True formData.append('name', `image${index + 1}`);
 True 
 True return fetch('https://api.example.com/upload', {
 True method: 'POST',
 True body: formData
 True })
 True .then(response => {
 True if (!response.ok) {
 True throw new Error(`上传图片失败: ${index + 1}`);
 True }
 True return response.json();
 True });
 True });
 True 
 True const results = await Promise.all(uploadPromises);
 True console.log('图片上传完成:', results);
 True return results;
 True } catch (error) {
 True console.error('上传错误:', error);
 True throw error;
 True }
 True}
 True
 True// 使用
 Trueconst input = document.querySelector('input[type="file"]');
 Trueinput.addEventListener('change', async (e) => {
 True const files = Array.from(e.target.files);
 True try {
 True const results = await uploadImages(files);
 True console.log('上传成功:', results);
 True } catch (error) {
 True console.error('上传失败:', error);
 True }
 True});
 True```

 False## 延伸阅读
 False
 False- [[vue3/reactivity-system|Vue3 响应式]]
 False
 False---
 False
 False### 更新日志 (Changelog)
 False
 False- 2026-04-05: 体系化整合 JS 异步模型与现代语法。
 False- 2026-04-05: 扩写内容，增加详细的异步编程概念、示例和最佳实践。
 False