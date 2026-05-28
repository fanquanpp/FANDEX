---
order: 50
tags:
  - 'html5'
  - 'async'
  - 'design-patterns'
  - 'security'
  - 'database'
  - 'networking'
  - 'memory'
  - 'css-layout'
  - 'web-api'
  - 'devops'
difficulty: 'intermediate'
title: 'HTML5 离线存储与 Web API'
module: 'html5'
category: 'HTML5 Basics'
description: 'localStorage、sessionStorage、IndexedDB 与 Web Workers。'
author: 'Anonymous'
---

## 目录

1. [Web 存储](#web-存储)
2. [地理定位](#地理定位)
3. [Web Workers](#web-workers)
4. [离线应用](#离线应用)
5. [Fetch API](#fetch-api)
6. [其他 Web API](#其他-web-api)
7. [实际应用示例](#实际应用示例)
8. [最佳实践](#最佳实践)

---

## 1. Web 存储 (Web Storage)

Web Storage 提供了一种在浏览器中存储键值对数据的机制，相比 Cookie 具有更大的容量 (通常为 5MB+) 和更简单的 API。

### 1.1 localStorage

**特点**：

- 数据永久存储，除非手动清除
- 同一域名下的所有页面共享数据
- 数据不会随 HTTP 请求发送到服务器
  **操作方法**：

```javascript
// 存储数据
localStorage.setItem('name', 'Alice');
localStorage.setItem('age', '30');
// 读取数据
const name = localStorage.getItem('name');
const age = localStorage.getItem('age');
console.log(name, age); // 输出: Alice 30
// 删除数据
localStorage.removeItem('age');
// 清除所有数据
localStorage.clear();
// 遍历所有键值对
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`${key}: ${value}`);
  True;
}
```

**存储对象**：
localStorage 只能存储字符串，存储对象需要先序列化：

```javascript
// 存储对象
const user = { name: 'Bob', age: 25, email: 'bob@example.com' };
localStorage.setItem('user', JSON.stringify(user));
// 读取对象
const storedUser = JSON.parse(localStorage.getItem('user'));
console.log(storedUser.name); // 输出: Bob
```

### 1.2 sessionStorage

**特点**：

- 数据仅在当前会话 (标签页) 有效，关闭标签页即失效
- 不同标签页之间的数据不共享
- 刷新页面数据仍然保留
  **操作方法**：

```javascript
// 存储数据
sessionStorage.setItem('token', 'abc123');
// 读取数据
const token = sessionStorage.getItem('token');
// 删除数据
sessionStorage.removeItem('token');
// 清除所有数据
sessionStorage.clear();
```

### 1.3 Web Storage 与 Cookie 对比

| 特性       | localStorage | sessionStorage | Cookie          |
| ---------- | ------------ | -------------- | --------------- |
| 存储容量   | 约 5MB       | 约 5MB         | 约 4KB          |
| 存储时间   | 永久         | 会话期间       | 可设置过期时间  |
| 服务器发送 | 否           | 否             | 是 (随请求发送) |
| 作用域     | 同一域名     | 同一标签页     | 可设置路径      |
| API 复杂度 | 简单         | 简单           | 复杂            |

### 1.4 使用场景

- **localStorage**：存储用户偏好设置、主题选择、登录状态等需要长期保存的数据
- **sessionStorage**：存储临时会话数据、表单数据、购物车内容等仅在当前会话有效的数据

## 2. 地理定位 (Geolocation API)

Geolocation API 允许网页获取用户的地理位置信息，可用于地图应用、位置服务等场景。

### 2.1 基本用法

```javascript
 // 获取当前位置
 navigator.geolocation.getCurrentPosition(
  (position) => {
  console.log("纬度: " + position.coords.latitude);
  console.log("经度: " + position.coords.longitude);
  console.log("精度: " + position.coords.accuracy + " 米");
  },
  (error) => {
  console.error("获取位置失败:", error.message);
  }
 True);
```

### 2.2 监听位置变化

```javascript
 // 监听位置变化
 const watchId = navigator.geolocation.watchPosition(
  (position) => {
  console.log("当前位置:", position.coords.latitude, position.coords.longitude);
  },
  (error) => {
  console.error("获取位置失败:", error.message);
  },
  {
  enableHighAccuracy: true, // 启用高精度模式
  timeout: 5000, // 超时时间
  maximumAge: 0 // 不使用缓存
  }
 True);
 // 停止监听
 // navigator.geolocation.clearWatch(watchId);
```

### 2.3 位置对象属性

| 属性                      | 描述                            |
| ------------------------- | ------------------------------- |
| `coords.latitude`         | 纬度                            |
| `coords.longitude`        | 经度                            |
| `coords.accuracy`         | 位置精度 (米)                   |
| `coords.altitude`         | 海拔高度 (米)                   |
| `coords.altitudeAccuracy` | 海拔高度精度 (米)               |
| `coords.heading`          | 方向 (度，从正北开始顺时针计算) |
| `coords.speed`            | 速度 (米/秒)                    |
| `timestamp`               | 获取位置的时间戳                |

### 2.4 错误处理

| 错误代码 | 描述               |
| -------- | ------------------ |
| 0        | 未知错误           |
| 1        | 用户拒绝了位置请求 |
| 2        | 位置不可用         |
| 3        | 请求超时           |

### 2.5 使用场景

- 地图应用：显示用户当前位置
- 位置服务：附近的餐厅、商店等
- 导航应用：提供路线规划
- 社交应用：分享位置信息

## 3. Web Workers

Web Workers 允许在后台线程运行脚本，不阻塞 UI 渲染，适合处理大量计算任务。

### 3.1 基本用法

**创建 Worker**：

```javascript
// main.js
const worker = new Worker('worker.js');
// 发送消息给 Worker
worker.postMessage({ type: 'calculate', data: 1000000 });
// 接收 Worker 消息
worker.onmessage = function (event) {
  console.log('计算结果:', event.data);
  True;
};
// 处理错误
worker.onerror = function (error) {
  console.error('Worker 错误:', error);
  True;
};
```

**Worker 脚本 (worker.js)**：

```javascript
// 接收消息
self.onmessage = function (event) {
  const { type, data } = event.data;
  if (type === 'calculate') {
    // 执行密集计算
    let result = 0;
    for (let i = 0; i < data; i++) {
      result += i;
    }
    // 发送结果
    self.postMessage(result);
  }
  True;
};
```

### 3.2 终止 Worker

```javascript
// 终止 Worker
worker.terminate();
```

### 3.3 类型

- **Dedicated Workers**：专用 Worker，只能被创建它的脚本使用
- **Shared Workers**：共享 Worker，可以被多个脚本使用
- **Service Workers**：用于离线缓存和后台同步

### 3.4 使用场景

- 密集计算：数学运算、图像处理
- 数据处理：大数据集分析、排序
- 后台任务：文件上传、数据同步

## 4. 离线应用 (Service Workers)

Service Workers 是一种特殊的 Web Worker，用于拦截网络请求、实现离线缓存，是 Progressive Web App (PWA) 的核心技术。

### 4.1 注册 Service Worker

```javascript
// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker 注册成功:', registration.scope);
    } catch (error) {
      console.error('Service Worker 注册失败:', error);
    }
  });
  True;
}
```

### 4.2 Service Worker 脚本 (sw.js)

```javascript
 // 缓存名称
 const CACHE_NAME = 'my-cache-v1';
 // 需要缓存的资源
 const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/images/logo.png'
 True];
 // 安装事件 - 缓存资源
 self.addEventListener('install', (event) => {
  event.waitUntil(
  caches.open(CACHE_NAME)
  .then((cache) => {
  console.log('打开缓存');
  return cache.addAll(urlsToCache);
  })
  );
 True});
 // 激活事件 - 清理旧缓存
 self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
  caches.keys().then((cacheNames) => {
  return Promise.all(
  cacheNames.map((cacheName) => {
  if (cacheWhitelist.indexOf(cacheName) === -1) {
  return caches.delete(cacheName);
  }
  })
  );
  })
  );
 True});
 // fetch 事件 - 拦截网络请求
 self.addEventListener('fetch', (event) => {
  event.respondWith(
  caches.match(event.request)
  .then((response) => {
  // 如果缓存中有响应，则返回缓存
  if (response) {
  return response;
  }
  // 否则发起网络请求
  return fetch(event.request)
  .then((response) => {
  // 检查响应是否有效
  if (!response || response.status !== 200 || response.type !== 'basic') {
  return response;
  }
  // 克隆响应
  const responseToCache = response.clone();
  // 将响应添加到缓存
  caches.open(CACHE_NAME)
  .then((cache) => {
  cache.put(event.request, responseToCache);
  });
  return response;
  });
  })
  );
 True});
```

### 4.3 缓存策略

- **Cache First**：优先从缓存获取，无缓存再请求网络
- **Network First**：优先从网络获取，网络失败再从缓存获取
- **Cache Only**：只从缓存获取
- **Network Only**：只从网络获取
- **Stale While Revalidate**：先从缓存获取，同时请求网络更新缓存

### 4.4 使用场景

- 离线应用：即使没有网络也能访问应用
- 性能优化：缓存静态资源，提高加载速度
- 后台同步：在网络可用时同步数据
- 推送通知：即使应用未打开也能收到通知

## 5. Fetch API

Fetch API 是现代化的异步网络请求方案，替代原生的 `XMLHttpRequest`，提供了更简洁、灵活的 API。

### 5.1 基本用法

```javascript
// GET 请求
fetch('https://api.example.com/data')
  .then((response) => {
    if (!response.ok) {
      throw new Error('网络响应失败');
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

### 5.2 POST 请求

```javascript
 // POST 请求
 fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
  'Content-Type': 'application/json'
  },
  body: JSON.stringify({
  name: 'John Doe',
  email: 'john@example.com'
  })
 True})
  .then((response) => response.json())
  .then((data) => {
  console.log('创建用户成功:', data);
  })
  .catch((error) => {
  console.error('错误:', error);
  });
```

### 5.3 请求选项

```javascript
 const options = {
  method: 'GET', // GET, POST, PUT, DELETE, etc.
  headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer token123'
  },
  body: JSON.stringify(data), // POST 请求时使用
  mode: 'cors', // cors, no-cors, same-origin
  credentials: 'include', // include, same-origin, omit
  cache: 'default', // default, no-store, reload, no-cache, force-cache, only-if-cached
  redirect: 'follow', // follow, error, manual
  referrer: 'no-referrer', // no-referrer, client
  referrerPolicy: 'no-referrer',
  integrity: 'sha256-abc123',
  keepalive: false,
  signal: abortController.signal // 用于取消请求
 True};
 fetch('https://api.example.com/data', options)
  .then((response) => response.json())
  .then((data) => console.log(data));
```

### 5.4 取消请求

```javascript
 // 创建 AbortController
 const abortController = new AbortController();
 // 发送请求
 fetch('https://api.example.com/data', {
  signal: abortController.signal
 True})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => {
  if (error.name === 'AbortError') {
  console.log('请求已取消');
  } else {
  console.error('错误:', error);
  }
  });
 // 取消请求
 setTimeout(() => {
  abortController.abort();
 True}, 5000);
```

### 5.5 与 async/await 结合

```javascript
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) {
      throw new Error('网络响应失败');
    }
    const data = await response.json();
    console.log('数据:', data);
    return data;
  } catch (error) {
    console.error('错误:', error);
    throw error;
  }
  True;
}
// 调用函数
fetchData();
```

## 6. 其他 Web API

### 6.1 Notification API

用于向用户显示通知：

```javascript
// 请求通知权限
if ('Notification' in window) {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      // 发送通知
      new Notification('通知标题', {
        body: '通知内容',
        icon: '/images/icon.png',
      });
    }
  });
  True;
}
```

### 6.2 Intersection Observer API

用于检测元素是否进入视口：

```javascript
// 创建 Intersection Observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      // 元素进入视口
      console.log('元素进入视口');
      entry.target.classList.add('visible');
    } else {
      // 元素离开视口
      console.log('元素离开视口');
      entry.target.classList.remove('visible');
    }
  });
  True;
});
// 观察元素
const element = document.querySelector('.target');
observer.observe(element);
```

### 6.3 File API

用于处理文件上传和读取：

```javascript
// 监听文件选择
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  // 检查文件类型
  if (file.type.startsWith('image/')) {
    // 读取文件
    const reader = new FileReader();
    reader.onload = (e) => {
      // 显示图片
      const img = document.createElement('img');
      img.src = e.target.result;
      document.body.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
  True;
});
```

### 6.4 Canvas API

用于绘制图形：

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
// 绘制矩形
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 50);
// 绘制圆形
ctx.beginPath();
ctx.arc(150, 100, 30, 0, Math.PI * 2);
ctx.fillStyle = 'blue';
ctx.fill();
```

## 7. 实际应用示例

### 7.1 示例 1：本地存储用户偏好

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>本地存储用户偏好</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 2rem;
        transition:
          background-color 0.3s,
          color 0.3s;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: white;
        padding: 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h1 {
        text-align: center;
        margin-bottom: 2rem;
      }
      .theme-toggle {
        display: flex;
        align-items: center;
        margin-bottom: 2rem;
      }
      .theme-toggle label {
        margin-right: 1rem;
      }
      .dark-theme {
        background-color: #333;
        color: white;
      }
      .dark-theme .container {
        background-color: #444;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>本地存储用户偏好</h1>
      <div class="theme-toggle">
        <label for="darkMode">深色模式:</label>
        <input type="checkbox" id="darkMode" />
      </div>
      <p>此示例展示如何使用 localStorage 存储用户的主题偏好。</p>
      <p>当你切换主题时，偏好会被保存到本地存储，下次打开页面时会自动应用。</p>
    </div>
    <script>
      const darkModeToggle = document.getElementById('darkMode');
      const body = document.body;
      // 加载保存的主题偏好
      const savedTheme = localStorage.getItem('darkMode');
      if (savedTheme === '') {
        body.classList.add('dark-theme');
        darkModeToggle.checked = true;
      }
      // 监听主题切换
      darkModeToggle.addEventListener('change', function () {
        if (this.checked) {
          body.classList.add('dark-theme');
          localStorage.setItem('darkMode', '');
        } else {
          body.classList.remove('dark-theme');
          localStorage.setItem('darkMode', 'false');
        }
      });
    </script>
  </body>
</html>
```

### 7.2 示例 2：地理定位应用

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>地理定位应用</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 2rem;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: white;
        padding: 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h1 {
        text-align: center;
        margin-bottom: 2rem;
      }
      .location-info {
        margin-top: 2rem;
        padding: 1rem;
        background-color: #f9f9f9;
        border-radius: 5px;
      }
      button {
        padding: 0.5rem 1rem;
        background-color: #4caf50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background-color: #45a049;
      }
      .error {
        color: red;
        margin-top: 1rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>地理定位应用</h1>
      <button id="getLocation">获取当前位置</button>
      <div class="location-info" id="locationInfo"></div>
      <div class="error" id="errorMessage"></div>
    </div>
    <script>
      const getLocationBtn = document.getElementById('getLocation');
      const locationInfo = document.getElementById('locationInfo');
      const errorMessage = document.getElementById('errorMessage');
      getLocationBtn.addEventListener('click', function () {
        if ('geolocation' in navigator) {
          locationInfo.innerHTML = '<p>正在获取位置...</p>';
          errorMessage.textContent = '';
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude, accuracy } = position.coords;
              locationInfo.innerHTML = `
  <h3>当前位置</h3>
  <p>纬度: ${latitude.toFixed(6)}</p>
  <p>经度: ${longitude.toFixed(6)}</p>
  <p>精度: ${accuracy.toFixed(2)} 米</p>
  <p>时间: ${new Date(position.timestamp).toLocaleString()}</p>
  `;
            },
            (error) => {
              let errorText = '';
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorText = '用户拒绝了位置请求';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorText = '位置信息不可用';
                  break;
                case error.TIMEOUT:
                  errorText = '获取位置超时';
                  break;
                default:
                  errorText = '获取位置时发生未知错误';
              }
              errorMessage.textContent = errorText;
              locationInfo.innerHTML = '';
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        } else {
          errorMessage.textContent = '您的浏览器不支持地理定位';
        }
      });
    </script>
  </body>
</html>
```

### 7.3 示例 3：使用 Fetch API 获取数据

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fetch API 示例</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 2rem;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        background-color: white;
        padding: 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h1 {
        text-align: center;
        margin-bottom: 2rem;
      }
      button {
        padding: 0.5rem 1rem;
        background-color: #008cba;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 1rem;
      }
      button:hover {
        background-color: #007b9e;
      }
      .posts {
        margin-top: 2rem;
      }
      .post {
        padding: 1rem;
        border-bottom: 1px solid #ddd;
      }
      .post:last-child {
        border-bottom: none;
      }
      .post h3 {
        margin-top: 0;
      }
      .loading {
        text-align: center;
        padding: 2rem;
      }
      .error {
        color: red;
        text-align: center;
        padding: 2rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Fetch API 示例</h1>
      <button id="fetchPosts">获取帖子</button>
      <div class="posts" id="postsContainer"></div>
    </div>
    <script>
      const fetchPostsBtn = document.getElementById('fetchPosts');
      const postsContainer = document.getElementById('postsContainer');
      fetchPostsBtn.addEventListener('click', async function () {
        try {
          postsContainer.innerHTML = '<div class="loading">加载中...</div>';
          // 使用 Fetch API 获取数据
          const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=10');
          if (!response.ok) {
            throw new Error('网络响应失败');
          }
          const posts = await response.json();
          // 渲染帖子
          postsContainer.innerHTML = posts
            .map(
              (post) => `
  <div class="post">
  <h3>${post.title}</h3>
  <p>${post.body}</p>
  </div>
  `
            )
            .join('');
        } catch (error) {
          postsContainer.innerHTML = `<div class="error">错误: ${error.message}</div>`;
        }
      });
    </script>
  </body>
</html>
```

## 8. 最佳实践

### 8.1 Web Storage 最佳实践

- **数据类型**：localStorage 和 sessionStorage 只能存储字符串，存储对象时需要使用 JSON.stringify() 和 JSON.parse()
- **存储容量**：不要存储过大的数据，避免超出存储限制
- **敏感数据**：不要存储敏感数据（如密码），这些数据应该存储在服务器端
- **性能**：频繁读写 localStorage 可能影响性能，建议批量操作
- **兼容性**：虽然现代浏览器都支持 Web Storage，但仍需考虑旧浏览器的兼容性

### 8.2 Geolocation API 最佳实践

- **权限请求**：在需要时才请求位置权限，不要在页面加载时就请求
- **错误处理**：妥善处理位置获取失败的情况
- **精度设置**：根据实际需求设置精度，高精度模式会消耗更多电量
- **用户隐私**：尊重用户隐私，明确告知用户位置信息的使用目的

### 8.3 Web Workers 最佳实践

- **适用场景**：只在需要处理大量计算时使用 Web Workers，避免过度使用
- **通信开销**：注意 Worker 与主线程之间的通信开销，避免频繁通信
- **资源管理**：在不需要时及时终止 Worker，避免资源浪费
- **错误处理**：妥善处理 Worker 中的错误

### 8.4 Service Workers 最佳实践

- **缓存策略**：根据资源类型选择合适的缓存策略
- **缓存版本**：合理管理缓存版本，避免缓存过期问题
- **网络请求**：正确处理网络请求，避免无限循环
- **调试**：使用 Chrome DevTools 进行 Service Worker 调试
- **更新**：正确处理 Service Worker 的更新流程

### 8.5 Fetch API 最佳实践

- **错误处理**：始终处理 fetch 请求的错误，包括网络错误和 HTTP 错误
- **请求配置**：根据实际需求配置请求选项，如 headers、credentials 等
- **响应处理**：根据响应类型选择合适的处理方法，如 response.json()、response.text() 等
- **取消请求**：在需要时使用 AbortController 取消请求
- **超时处理**：实现请求超时处理，避免长时间等待

### 8.6 通用最佳实践

- **特性检测**：在使用 Web API 前进行特性检测，确保浏览器支持
- **性能优化**：注意 API 的性能影响，避免过度使用
- **安全性**：遵循安全最佳实践，避免 XSS、CSRF 等攻击
- **可访问性**：确保应用对所有用户可访问，包括使用辅助技术的用户
- **测试**：在不同浏览器和设备上测试应用，确保兼容性

---

### 更新日志 (Changelog)

- 2026-04-05: 整合 Web 存储与现代 Web API。
- 2026-04-05: 扩写内容，增加详细的 Web 存储、地理定位、Web Workers、Service Workers、Fetch API 的概念、示例和最佳实践，以及其他常用 Web API 和实际应用示例。
