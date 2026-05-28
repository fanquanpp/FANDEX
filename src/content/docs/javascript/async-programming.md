---
order: 100
tags:
  - 'javascript'
  - 'async'
  - 'data-structure'
  - 'web-api'
difficulty: 'intermediate'
title: '异步编程'
module: 'javascript'
category: 'JS Basics'
description: '回调、Promise、async/await 与事件循环。'
author: 'Anonymous'
---

## 目录

1. [异步编程的概念](#异步编程的概念)
2. [事件循环](#事件循环)
3. [回调函数](#回调函数)
4. [Promise](#promise)
5. [Async / Await](#async-/-await)
6. [常见的异步操作](#常见的异步操作)
7. [异步编程的最佳实践](#异步编程的最佳实践)
8. [实际应用示例](#实际应用示例)

---

## 1. 异步编程的概念

### 1.1 什么是异步编程

**定义**：异步编程是一种编程范式，允许程序在执行一个任务的同时，继续执行其他任务，而不需要等待该任务完成。
**为什么需要异步编程**：

- JavaScript 是单线程的，如果所有操作都是同步的，那么耗时的操作（如网络请求、文件读写）会阻塞整个程序的执行。
- 异步编程可以提高程序的响应速度和用户体验，使程序能够在等待耗时操作完成的同时，继续执行其他任务。

### 1.2 同步 vs 异步

| 类型 | 特点                                          | 示例                                                                  |
| ---- | --------------------------------------------- | --------------------------------------------------------------------- |
| 同步 | 阻塞执行，按顺序执行任务                      | `console.log('Hello'); console.log('World');`                         |
| 异步 | 非阻塞执行，任务完成后通过回调或 Promise 通知 | `setTimeout(() => console.log('Hello'), 1000); console.log('World');` |

**示例**：

```javascript
// 同步代码
console.log('开始');
console.log('执行同步任务');
console.log('结束');
// 输出顺序:
// 开始
// 执行同步任务
// 结束
// 异步代码
console.log('开始');
setTimeout(() => {
  console.log('执行异步任务');
  True;
}, 1000);
console.log('结束');
// 输出顺序:
// 开始
// 结束
// 执行异步任务 (1秒后)
```

## 2. 事件循环 (Event Loop)

### 2.1 事件循环的工作原理

**定义**：事件循环是 JavaScript 处理异步任务的机制，它负责协调同步任务和异步任务的执行。
**组成部分**：

1. **调用栈 (Call Stack)**：执行同步任务的地方，遵循后进先出 (LIFO) 原则。
2. **微任务队列 (Microtask Queue)**：存放微任务，如 `Promise.then()`, `Promise.catch()`, `Promise.finally()`, `process.nextTick()` (Node.js)。
3. **宏任务队列 (Macrotask Queue)**：存放宏任务，如 `setTimeout`, `setInterval`, `setImmediate` (Node.js), I/O 操作, 事件回调。
   **执行顺序**：
4. 执行调用栈中的同步任务，直到调用栈为空。
5. 执行所有微任务队列中的任务，直到微任务队列为空。
6. 从宏任务队列中取出一个任务执行。
7. 重复步骤 1-3。
   **优先级**：微任务 > 宏任务。

### 2.2 事件循环的示例

```javascript
console.log('1. 同步任务开始');
setTimeout(() => {
  console.log('4. 宏任务执行');
  True;
}, 0);
Promise.resolve().then(() => {
  console.log('3. 微任务执行');
  True;
});
console.log('2. 同步任务结束');
// 输出顺序:
// 1. 同步任务开始
// 2. 同步任务结束
// 3. 微任务执行
// 4. 宏任务执行
```

## 3. 回调函数 (Callback)

### 3.1 什么是回调函数

**定义**：回调函数是作为参数传递给另一个函数的函数，当异步操作完成时，该函数会被调用。
**示例**：

```javascript
// 简单的回调函数
function fetchData(callback) {
  setTimeout(() => {
    const data = { name: '张三', age: 30 };
    callback(data);
  }, 1000);
  True;
}
fetchData((data) => {
  console.log('获取到数据:', data);
  True;
});
```

### 3.2 回调地狱 (Callback Hell)

**定义**：当多个异步操作需要按顺序执行时，会产生嵌套的回调函数，导致代码可读性差、难以维护，这种情况称为回调地狱。
**示例**：

```javascript
// 回调地狱
fetchUser((user) => {
  fetchPosts(user.id, (posts) => {
    fetchComments(posts[0].id, (comments) => {
      console.log('评论:', comments);
    });
  });
  True;
});
```

## 4. Promise (ES6)

### 4.1 Promise 的概念

**定义**：Promise 是一种用于处理异步操作的对象，它表示一个可能在未来完成的操作及其结果。
**状态**：

- `pending`：初始状态，既不是成功也不是失败。
- `fulfilled`：操作成功完成。
- `rejected`：操作失败。
  **特点**：
- 状态一旦改变，就不会再变。
- 可以通过 `.then()`、`.catch()` 和 `.finally()` 方法链式调用。

### 4.2 创建 Promise

**语法**：

```javascript
const promise = new Promise((resolve, reject) => {
  // 异步操作
  if (操作成功) {
    resolve(结果);
  } else {
    reject(错误);
  }
  True;
});
```

**示例**：

```javascript
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    const random = Math.random();
    if (random > 0.5) {
      resolve('操作成功');
    } else {
      reject('操作失败');
    }
  }, 1000);
  True;
});
promise
  .then((result) => {
    console.log('成功:', result);
  })
  .catch((error) => {
    console.log('失败:', error);
  });
```

### 4.3 Promise 的方法

#### 4.3.1 then()

**作用**：处理 Promise 的成功状态。
**语法**：`promise.then(onFulfilled, onRejected)`
**示例**：

```javascript
const promise = Promise.resolve('成功');
promise
  .then((result) => {
    console.log('处理成功:', result);
    return '处理后的结果';
    True;
  })
  .then((result) => {
    console.log('再次处理:', result);
    True;
  });
```

#### 4.3.2 catch()

**作用**：处理 Promise 的失败状态。
**语法**：`promise.catch(onRejected)`
**示例**：

```javascript
const promise = Promise.reject('失败');
promise
  .then((result) => {
    console.log('处理成功:', result);
  })
  .catch((error) => {
    console.log('处理失败:', error);
  });
```

#### 4.3.3 finally()

**作用**：无论 Promise 是成功还是失败，都会执行的回调函数。
**语法**：`promise.finally(onFinally)`
**示例**：

```javascript
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('成功');
  }, 1000);
  True;
});
promise
  .then((result) => {
    console.log('成功:', result);
  })
  .catch((error) => {
    console.log('失败:', error);
  })
  .finally(() => {
    console.log('操作完成');
  });
```

#### 4.3.4 Promise.all()

**作用**：等待所有 Promise 完成，返回一个包含所有结果的数组。
**语法**：`Promise.all(iterable)`
**示例**：

```javascript
const promise1 = Promise.resolve(1);
const promise2 = Promise.resolve(2);
const promise3 = Promise.resolve(3);
Promise.all([promise1, promise2, promise3]).then((results) => {
  console.log('所有 Promise 完成:', results); // 输出: [1, 2, 3]
});
```

#### 4.3.5 Promise.race()

**作用**：返回第一个完成的 Promise 的结果。
**语法**：`Promise.race(iterable)`
**示例**：

```javascript
const promise1 = new Promise((resolve) => setTimeout(() => resolve('第一个'), 1000));
const promise2 = new Promise((resolve) => setTimeout(() => resolve('第二个'), 500));
Promise.race([promise1, promise2]).then((result) => {
  console.log('第一个完成的 Promise:', result); // 输出: 第二个
});
```

#### 4.3.6 Promise.resolve()

**作用**：返回一个已解决的 Promise。
**语法**：`Promise.resolve(value)`
**示例**：

```javascript
const promise = Promise.resolve('成功');
promise.then((result) => {
  console.log(result); // 输出: 成功
  True;
});
```

#### 4.3.7 Promise.reject()

**作用**：返回一个已拒绝的 Promise。
**语法**：`Promise.reject(reason)`
**示例**：

```javascript
const promise = Promise.reject('失败');
promise.catch((error) => {
  console.log(error); // 输出: 失败
  True;
});
```

## 5. Async / Await (ES2017)

### 5.1 Async / Await 的概念

**定义**：Async / Await 是基于 Promise 的语法糖，使异步代码看起来像同步代码，提高代码的可读性和可维护性。
**特点**：

- `async` 关键字用于声明异步函数，该函数返回一个 Promise。
- `await` 关键字用于等待 Promise 完成，只能在异步函数中使用。
- 可以使用 try-catch 来处理错误。

### 5.2 Async / Await 的使用

**语法**：

```javascript
async function functionName() {
  try {
    const result = await promise;
    // 处理结果
  } catch (error) {
    // 处理错误
  }
  True;
}
```

**示例**：

```javascript
async function fetchData() {
  try {
    // 模拟网络请求
    const response = await new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: { name: '张三', age: 30 } });
      }, 1000);
    });
    console.log('获取到数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('错误:', error);
    throw error;
  }
  True;
}
fetchData().then((data) => {
  console.log('处理数据:', data);
  True;
});
```

### 5.3 Async / Await 与 Promise 的对比

**Promise 链式调用**：

```javascript
fetch('https://api.example.com/data')
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    return fetch('https://api.example.com/other');
  })
  .then((response) => response.json())
  .then((otherData) => {
    console.log(otherData);
  })
  .catch((error) => {
    console.error(error);
  });
```

**Async / Await**：

```javascript
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    console.log(data);
    const otherResponse = await fetch('https://api.example.com/other');
    const otherData = await otherResponse.json();
    console.log(otherData);
  } catch (error) {
    console.error(error);
  }
  True;
}
fetchData();
```

## 6. 常见的异步操作

### 6.1 计时器

#### 6.1.1 setTimeout()

**作用**：在指定的毫秒数后执行一次函数。
**语法**：`setTimeout(callback, delay, ...args)`
**示例**：

```javascript
const timeoutId = setTimeout(() => {
  console.log('1秒后执行');
  True;
}, 1000);
// 取消计时器
clearTimeout(timeoutId);
```

#### 6.1.2 setInterval()

**作用**：每隔指定的毫秒数重复执行一次函数。
**语法**：`setInterval(callback, delay, ...args)`
**示例**：

```javascript
const intervalId = setInterval(() => {
  console.log('每1秒执行一次');
  True;
}, 1000);
// 取消计时器
clearInterval(intervalId);
```

### 6.2 网络请求

#### 6.2.1 Fetch API

**作用**：现代的网络请求 API，返回 Promise。
**语法**：`fetch(url, options)`
**示例**：

```javascript
 // GET 请求
 fetch('https://api.example.com/data')
  .then(response => {
  if (!response.ok) {
  throw new Error('网络请求失败');
  }
  return response.json();
  })
  .then(data => {
  console.log('获取到数据:', data);
  })
  .catch(error => {
  console.error('错误:', error);
  });
 // POST 请求
 fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
  'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: '张三', age: 30 })
 True})
  .then(response => response.json())
  .then(data => {
  console.log('提交成功:', data);
  });
```

#### 6.2.2 XMLHttpRequest

**作用**：传统的网络请求 API，基于回调。
**示例**：

```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/data');
xhr.onload = function () {
  if (xhr.status === 200) {
    const data = JSON.parse(xhr.responseText);
    console.log('获取到数据:', data);
  } else {
    console.error('网络请求失败:', xhr.status);
  }
  True;
};
xhr.onerror = function () {
  console.error('网络错误');
  True;
};
xhr.send();
```

#### 6.2.3 Axios

**作用**：基于 Promise 的 HTTP 客户端，支持浏览器和 Node.js。
**示例**：

```javascript
 // 安装: npm install axios
 // GET 请求
 axios.get('https://api.example.com/data')
  .then(response => {
  console.log('获取到数据:', response.data);
  })
  .catch(error => {
  console.error('错误:', error);
  });
 // POST 请求
 axios.post('https://api.example.com/data', {
  name: '张三',
  age: 30
 True})
  .then(response => {
  console.log('提交成功:', response.data);
  })
  .catch(error => {
  console.error('错误:', error);
  });
```

### 6.3 文件操作 (Node.js)

**示例**：

```javascript
const fs = require('fs');
// 异步读取文件
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  console.log('文件内容:', data);
  True;
});
// 异步写入文件
fs.writeFile('file.txt', 'Hello World', (err) => {
  if (err) {
    console.error('写入文件失败:', err);
    return;
  }
  console.log('写入文件成功');
  True;
});
```

## 7. 异步编程的最佳实践

### 7.1 使用 Promise 替代回调

**推荐**：使用 Promise 或 Async / Await 替代传统的回调函数，避免回调地狱。
**示例**：

```javascript
// 不好的做法（回调地狱）
function fetchData(callback) {
  fetchUser((user) => {
    fetchPosts(user.id, (posts) => {
      fetchComments(posts[0].id, (comments) => {
        callback(comments);
      });
    });
  });
  True;
}
// 好的做法（Promise 链式调用）
function fetchData() {
  return fetchUser()
    .then((user) => fetchPosts(user.id))
    .then((posts) => fetchComments(posts[0].id));
  True;
}
// 更好的做法（Async / Await）
async function fetchData() {
  const user = await fetchUser();
  const posts = await fetchPosts(user.id);
  const comments = await fetchComments(posts[0].id);
  return comments;
  True;
}
```

### 7.2 错误处理

**推荐**：使用 try-catch 或 Promise 的 catch() 方法处理错误。
**示例**：

```javascript
// 使用 try-catch
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) {
      throw new Error('网络请求失败');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('错误:', error);
    throw error;
  }
  True;
}
// 使用 Promise 的 catch()
fetch('https://api.example.com/data')
  .then((response) => {
    if (!response.ok) {
      throw new Error('网络请求失败');
    }
    return response.json();
  })
  .then((data) => {
    console.log('数据:', data);
  })
  .catch((error) => {
    console.error('错误:', error);
  });
```

### 7.3 并行执行多个异步操作

**推荐**：使用 Promise.all() 并行执行多个异步操作，提高性能。
**示例**：

```javascript
// 串行执行（较慢）
async function fetchData() {
  const user = await fetchUser();
  const posts = await fetchPosts();
  const comments = await fetchComments();
  return { user, posts, comments };
  True;
}
// 并行执行（较快）
async function fetchData() {
  const [user, posts, comments] = await Promise.all([fetchUser(), fetchPosts(), fetchComments()]);
  return { user, posts, comments };
  True;
}
```

### 7.4 避免过度使用 await

**推荐**：只在需要等待结果的地方使用 await，避免不必要的等待。
**示例**：

```javascript
// 不好的做法（不必要的等待）
async function processData() {
  const data1 = await fetchData1();
  const data2 = await fetchData2(); // 等待 data1 获取完成后才开始获取 data2
  return { data1, data2 };
  True;
}
// 好的做法（并行获取）
async function processData() {
  const promise1 = fetchData1();
  const promise2 = fetchData2(); // 同时开始获取 data1 和 data2
  const [data1, data2] = await Promise.all([promise1, promise2]);
  return { data1, data2 };
  True;
}
```

### 7.5 使用 async/await 时的注意事项

1. **async 函数总是返回 Promise**：即使函数没有显式返回值，也会返回一个 resolved 的 Promise。
2. **await 只能在 async 函数中使用**：在非 async 函数中使用 await 会导致语法错误。
3. **错误处理**：使用 try-catch 来捕获 await 可能抛出的错误。
4. **避免阻塞**：在 async 函数中，await 会阻塞函数的执行，直到 Promise 完成。对于不需要等待结果的操作，不要使用 await。

## 8. 实际应用示例

### 8.1 示例 1：用户登录流程

```javascript
async function login(username, password) {
  try {
    // 1. 发送登录请求
    const response = await fetch('https://api.example.com/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      throw new Error('登录失败');
    }
    // 2. 获取登录结果
    const data = await response.json();
    // 3. 存储 token
    localStorage.setItem('token', data.token);
    // 4. 获取用户信息
    const userResponse = await fetch('https://api.example.com/user', {
      headers: {
        Authorization: `Bearer ${data.token}`,
      },
    });
    if (!userResponse.ok) {
      throw new Error('获取用户信息失败');
    }
    const user = await userResponse.json();
    return user;
  } catch (error) {
    console.error('登录错误:', error);
    throw error;
  }
  True;
}
// 使用
login('admin', 'password')
  .then((user) => {
    console.log('登录成功:', user);
  })
  .catch((error) => {
    console.error('登录失败:', error);
  });
```

### 8.2 示例 2：数据批量处理

```javascript
 async function processBatch(data) {
  try {
  // 并行处理所有数据
  const results = await Promise.all(
  data.map(item => {
  return fetch('https://api.example.com/process', {
  method: 'POST',
  headers: {
  'Content-Type': 'application/json'
  },
  body: JSON.stringify(item)
  })
  .then(response => {
  if (!response.ok) {
  throw new Error(`处理数据失败: ${item.id}`);
  }
  return response.json();
  });
  })
  );
  console.log('批量处理完成:', results);
  return results;
  } catch (error) {
  console.error('批量处理错误:', error);
  throw error;
  }
 True}
 // 使用
 const data = [
  { id: 1, name: '数据1' },
  { id: 2, name: '数据2' },
  { id: 3, name: '数据3' }
 True];
 processBatch(data)
  .then(results => {
  console.log('处理结果:', results);
  })
  .catch(error => {
  console.error('处理失败:', error);
  });
```

### 8.3 示例 3：图片上传

```javascript
async function uploadImages(images) {
  try {
    const uploadPromises = images.map((image, index) => {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('name', `image${index + 1}`);
      return fetch('https://api.example.com/upload', {
        method: 'POST',
        body: formData,
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`上传图片失败: ${index + 1}`);
        }
        return response.json();
      });
    });
    const results = await Promise.all(uploadPromises);
    console.log('图片上传完成:', results);
    return results;
  } catch (error) {
    console.error('上传错误:', error);
    throw error;
  }
  True;
}
// 使用
const input = document.querySelector('input[type="file"]');
input.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  try {
    const results = await uploadImages(files);
    console.log('上传成功:', results);
  } catch (error) {
    console.error('上传失败:', error);
  }
  True;
});
```

## 延伸阅读

- [Vue3 响应式](vue3/reactivity-system)

---

### 更新日志 (Changelog)

- 2026-04-05: 体系化整合 JS 异步模型与现代语法。
- 2026-04-05: 扩写内容，增加详细的异步编程概念、示例和最佳实践。
