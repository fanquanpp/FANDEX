---
order: 150
title: HTML5 离线存储与 Web API
module: 'html5'
category: 前端技术
difficulty: intermediate
description: localStorage、sessionStorage、IndexedDB 与 Web Workers。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'javascript/047-IndexedDBADatabaseInYourBrowser'
  - 'html5/013-HTML5MultimediaCanvasDrawing'
  - 'html5/014-DocTypeDeclaration'
  - 'html5/016-MetadataCharacterEncoding'
  - 'html5/017-TextSemantic'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---

> 0基础速通：必学第 1 章 Web Storage 与第 5 章 Fetch；其余（Geolocation、Worker、Service Worker、Notification 等）按需选学。Service Worker 完整版见 027。

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
    console.log('纬度: ' + position.coords.latitude);
    console.log('经度: ' + position.coords.longitude);
    console.log('精度: ' + position.coords.accuracy + ' 米');
  },
  (error) => {
    console.error('获取位置失败:', error.message);
  }
);
```

### 2.2 监听位置变化

```javascript
// 监听位置变化
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    console.log('当前位置:', position.coords.latitude, position.coords.longitude);
  },
  (error) => {
    console.error('获取位置失败:', error.message);
  },
  {
    enableHighAccuracy: true, // 启用高精度模式
    timeout: 5000, // 超时时间
    maximumAge: 0, // 不使用缓存
  }
);
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
};
// 处理错误
worker.onerror = function (error) {
  console.error('Worker 错误:', error);
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
 ]
 // 安装事件 - 缓存资源
 self.addEventListener('install', (event) => {
  event.waitUntil(
  caches.open(CACHE_NAME)
  .then((cache) => {
  console.log('打开缓存');
  return cache.addAll(urlsToCache);
  })
  );
 }
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
 }
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
 }
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
 }
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
    Authorization: 'Bearer token123',
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
  signal: abortController.signal, // 用于取消请求
};
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
 }
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
 }
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

### 6.5 IndexedDB：什么时候该用它（决策指南）

IndexedDB 是浏览器内置的"本地数据库"，适合存储**结构化、量大、需要按条件查询**的数据。它不在本次示例中展开完整 API，但你需要先知道"什么时候选它"：

| 场景 | 推荐方案 | 原因 |
| --- | --- | --- |
| 记住用户名、主题色、少量偏好 | localStorage | 键值对足够，API 最简单 |
| 登录态、临时会话 | sessionStorage | 关标签页自动清理 |
| 复杂 JSON 文档、大量记录、索引查询 | IndexedDB | 支持事务、索引、游标，容量远大于 localStorage |
| 必须同步到服务器 | 后端数据库 + API | 浏览器存储只是缓存，不能替代服务端 |
| 离线优先的 PWA 应用 | IndexedDB + Service Worker | 数据本地落盘，断网可读 |

一句话判断：**存"几 KB 的设置"用 localStorage；存"几千条需要查询的业务数据"用 IndexedDB。** 完整教程见 `javascript/046-IndexedDBADatabaseInYourBrowser`；与 Service Worker 组合的离线场景见 `html5/028-ServiceWorkerPWA`。

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

## Web Storage API

**localStorage 永久存储**
`localStorage.setItem(<key>, <value>)` / `localStorage.getItem(<key>)`

```javascript
// 存储数据(键值对,值必须为字符串)
localStorage.setItem('name', 'Alice');
localStorage.setItem('age', '30');

// 读取数据
const name = localStorage.getItem('name');  // 'Alice'
const age = localStorage.getItem('age');    // '30'

// 删除指定键
localStorage.removeItem('age');

// 清除所有数据
localStorage.clear();

// 遍历所有键
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`${key}: ${localStorage.getItem(key)}`);
}
```

**存储对象(序列化)**
`localStorage.setItem(<key>, JSON.stringify(<obj>))`

```javascript
// localStorage 只能存储字符串,对象需先序列化
const user = { name: 'Bob', age: 25, email: 'bob@example.com' };
localStorage.setItem('user', JSON.stringify(user));

// 读取后反序列化
const storedUser = JSON.parse(localStorage.getItem('user'));
console.log(storedUser.name); // 'Bob'
```

**sessionStorage 会话存储**
`sessionStorage.setItem(<key>, <value>)`

```javascript
// 数据仅在当前标签页会话内有效,关闭标签页即清除
sessionStorage.setItem('token', 'abc123');
const token = sessionStorage.getItem('token');
sessionStorage.removeItem('token');
sessionStorage.clear();
```

**Web Storage 方法表**

| 方法/属性          | 说明                       |
| ------------------ | -------------------------- |
| `setItem(k, v)`    | 存储键值                   |
| `getItem(k)`       | 读取键值                   |
| `removeItem(k)`    | 删除指定键                 |
| `clear()`          | 清除所有键值               |
| `key(index)`       | 根据索引获取键名           |
| `length`           | 已存储键值对数量           |

**Web Storage 与 Cookie 对比**

| 特性       | localStorage | sessionStorage | Cookie          |
| ---------- | ------------ | -------------- | --------------- |
| 存储容量   | 约 5MB       | 约 5MB         | 约 4KB          |
| 存储时间   | 永久         | 会话期间       | 可设置过期时间  |
| 服务器发送 | 否           | 否             | 是(随请求发送) |
| 作用域     | 同一域名     | 同一标签页     | 可设置路径      |
| API 复杂度 | 简单         | 简单           | 复杂            |

---

## Storage 事件

**跨标签页监听 Storage 变化**
`window.addEventListener('storage', handler)`

```javascript
// 当其他标签页修改 localStorage 时触发
window.addEventListener('storage', (event) => {
  console.log('变更的键:', event.key);
  console.log('旧值:', event.oldValue);
  console.log('新值:', event.newValue);
  console.log('URL:', event.url);
  console.log('存储区域:', event.storageArea);
});
```

**StorageEvent 属性表**

| 属性             | 说明                       |
| ---------------- | -------------------------- |
| `key`            | 变更的键(null 表示 clear)|
| `newValue`       | 新值(null 表示删除)      |
| `oldValue`       | 旧值(null 表示新增)      |
| `url`            | 触发变更的页面 URL         |
| `storageArea`    | 受影响的存储对象           |

---

## Geolocation API

**获取当前位置**
`navigator.geolocation.getCurrentPosition(<success>, [error], [options])`

```javascript
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log('纬度:', position.coords.latitude);
    console.log('经度:', position.coords.longitude);
    console.log('精度:', position.coords.accuracy + ' 米');
  },
  (error) => {
    console.error('获取位置失败:', error.message);
  },
  {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  }
);
```

**Position 对象属性表**

| 属性                      | 说明                            |
| ------------------------- | ------------------------------- |
| `coords.latitude`         | 纬度                            |
| `coords.longitude`        | 经度                            |
| `coords.accuracy`         | 位置精度(米)                   |
| `coords.altitude`         | 海拔高度(米)                   |
| `coords.altitudeAccuracy` | 海拔精度(米)                   |
| `coords.heading`          | 方向(度)                       |
| `coords.speed`            | 速度(米/秒)                    |
| `timestamp`               | 获取位置的时间戳                |

---

## Web Workers

**创建专用 Worker**
`const worker = new Worker(<url>, [options])`

```javascript
// 主线程创建 Worker
const worker = new Worker('worker.js');

// 发送消息给 Worker
worker.postMessage({ type: 'calculate', data: 1000000 });

// 接收 Worker 返回的消息
worker.onmessage = function (event) {
  console.log('计算结果:', event.data);
};

// 处理错误
worker.onerror = function (error) {
  console.error('Worker 错误:', error);
};
```

**Worker 脚本(worker.js)**
`self.onmessage = (event) => { ... }; self.postMessage(<data>)`

```javascript
// Worker 内部接收并处理消息
self.onmessage = function (event) {
  const { type, data } = event.data;
  if (type === 'calculate') {
    let result = 0;
    for (let i = 0; i < data; i++) {
      result += i;
    }
    // 发送结果回主线程
    self.postMessage(result);
  }
};
```

**Worker 方法表**

| 方法/属性                | 说明                          |
| ------------------------ | ----------------------------- |
| `worker.postMessage(d)`  | 向 Worker 发送消息            |
| `worker.onmessage`       | 监听 Worker 消息              |
| `worker.onerror`         | 监听 Worker 错误              |
| `worker.terminate()`     | 终止 Worker(主线程调用)      |
| `self.postMessage(d)`    | Worker 向主线程发送消息       |
| `self.onmessage`         | Worker 监听主线程消息         |
| `self.close()`           | Worker 主动关闭自身           |

**Worker 类型表**

| 类型                | 作用域                | 创建方式                  |
| ------------------- | --------------------- | ------------------------- |
| Dedicated Worker    | 仅创建脚本可用        | `new Worker('url')`       |
| Shared Worker       | 多脚本共享            | `new SharedWorker('url')` |
| Service Worker      | 离线缓存/推送         | `navigator.serviceWorker.register()` |

---

## Service Worker

**注册 Service Worker**
`navigator.serviceWorker.register(<url>, [options])`

```javascript
// 注册 Service Worker(必须在 HTTPS 环境下)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/' // 控制范围
      });
      console.log('注册成功:', registration.scope);
    } catch (error) {
      console.error('注册失败:', error);
    }
  });
}
```

**Service Worker 生命周期事件**
`self.addEventListener('install' | 'activate' | 'fetch', handler)`

```javascript
// sw.js 内部:Service Worker 生命周期事件
const CACHE_NAME = 'my-cache-v1';
const urlsToCache = ['/', '/index.html', '/styles.css', '/script.js'];

// 安装:预缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// 激活:清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**缓存策略表**

| 策略                     | 说明                                  | 适用场景          |
| ------------------------ | ------------------------------------- | ----------------- |
| **Cache First**          | 优先缓存,缓存无则请求网络            | 静态资源          |
| **Network First**        | 优先网络,网络失败则使用缓存          | 动态内容          |
| **Cache Only**           | 仅从缓存读取                          | 离线页面          |
| **Network Only**         | 仅从网络获取                          | 实时数据          |
| **Stale While Revalidate** | 先返回缓存,同时请求网络更新缓存    | 可容忍短暂过期的数据 |

---

## Cache Storage API

**CacheStorage 方法表**

| 方法                              | 说明                       |
| --------------------------------- | -------------------------- |
| `caches.open(name)`               | 打开(或创建)命名缓存      |
| `caches.match(request)`           | 在所有缓存中查找匹配       |
| `caches.has(name)`                | 检查缓存是否存在           |
| `caches.delete(name)`             | 删除指定缓存               |
| `caches.keys()`                   | 获取所有缓存名称           |

**Cache 对象方法表**

| 方法                              | 说明                       |
| --------------------------------- | -------------------------- |
| `cache.put(request, response)`    | 存储请求-响应映射          |
| `cache.add(request)`              | fetch + put 的快捷方式     |
| `cache.addAll([requests])`        | 批量 add                   |
| `cache.match(request)`            | 查找匹配的响应             |
| `cache.matchAll([request])`       | 查找所有匹配的响应         |
| `cache.delete(request)`           | 删除指定条目               |
| `cache.keys()`                    | 获取所有请求键              |

```javascript
// Cache First 策略示例
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // 克隆响应(因为响应只能消费一次)
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});
```

---

## Fetch API

**GET 请求**
`fetch(<url>, [options]).then(<handler>)`

```javascript
// 基础 GET 请求
fetch('https://api.example.com/data')
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then((data) => console.log('数据:', data))
  .catch((error) => console.error('错误:', error));
```

**POST 请求**
`fetch(<url>, { method: 'POST', body, headers })`

```javascript
// POST 请求(发送 JSON 数据)
fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' })
})
  .then((response) => response.json())
  .then((data) => console.log('创建成功:', data))
  .catch((error) => console.error('错误:', error));
```

**fetch 请求选项**
`fetch(<url>, { method, headers, body, mode, credentials, ... })`

```javascript
const options = {
  method: 'GET',                         // GET | POST | PUT | DELETE | PATCH
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  body: JSON.stringify(data),            // POST/PUT 请求体
  mode: 'cors',                          // cors | no-cors | same-origin
  credentials: 'include',                // include | same-origin | omit
  cache: 'default',                      // default | no-store | reload | no-cache | force-cache
  redirect: 'follow',                    // follow | error | manual
  referrer: 'no-referrer',               // no-referrer | client | <url>
  referrerPolicy: 'no-referrer',         // no-referrer | same-origin | strict-origin
  integrity: 'sha256-abc123',            // 子资源完整性
  keepalive: false,                      // 是否保持请求(页面卸载后)
  signal: abortController.signal         // 用于取消请求
};
```

**取消请求**
`const controller = new AbortController()`

```javascript
// 使用 AbortController 取消 fetch 请求
const controller = new AbortController();

fetch('https://api.example.com/data', { signal: controller.signal })
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => {
    if (error.name === 'AbortError') {
      console.log('请求已取消');
    } else {
      console.error('错误:', error);
    }
  });

// 5 秒后取消请求
setTimeout(() => controller.abort(), 5000);
```

**async/await 用法**
`const response = await fetch(<url>, [options])`

```javascript
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('错误:', error);
    throw error;
  }
}
```

**Response 对象方法表**

| 方法/属性                | 说明                       |
| ------------------------ | -------------------------- |
| `response.ok`            | 状态码 200-299 时为 true   |
| `response.status`        | HTTP 状态码                |
| `response.statusText`    | 状态文本                   |
| `response.headers`       | 响应头对象                 |
| `response.json()`        | 解析为 JSON                 |
| `response.text()`        | 解析为文本                  |
| `response.blob()`        | 解析为 Blob                 |
| `response.arrayBuffer()` | 解析为 ArrayBuffer          |
| `response.formData()`    | 解析为 FormData             |
| `response.clone()`       | 克隆响应                    |

---

## Notification API

**请求通知权限**
`Notification.requestPermission()`

```javascript
// 请求用户授权通知
if ('Notification' in window) {
  Notification.requestPermission().then((permission) => {
    console.log('权限状态:', permission); // granted | denied | default
  });
}
```

**显示通知**
`new Notification(<title>, [options])`

```javascript
// 显示桌面通知
const notification = new Notification('通知标题', {
  body: '通知正文内容',
  icon: '/images/icon.png',
  badge: '/images/badge.png',
  tag: 'unique-tag',          // 用于替换相同标签的通知
  requireInteraction: false,  // 是否需要用户手动关闭
  silent: false               // 是否静默(无声)
});

// 点击通知
notification.onclick = () => {
  window.focus();
  notification.close();
};

// 通知关闭
notification.onclose = () => console.log('通知已关闭');
```

---

## Intersection Observer API

**创建观察器**
`new IntersectionObserver(<callback>, [options])`

```javascript
// 创建视口观察器
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        console.log('元素进入视口:', entry.target);
        entry.target.classList.add('visible');
      } else {
        entry.target.classList.remove('visible');
      }
    });
  },
  {
    root: null,                  // 观察视口(null 表示浏览器视口)
    rootMargin: '0px',           // 根元素边距
    threshold: 0.1               // 目标可见度达到 10% 时触发
  }
);

// 观察元素
const target = document.querySelector('.target');
observer.observe(target);

// 停止观察
observer.unobserve(target);
observer.disconnect(); // 停止所有观察
```

---

## File API

**文件输入**
`<input type="file" accept="image/*" multiple>`

```html
<!-- 单文件选择 -->
<input type="file" id="singleFile" accept="image/*" />

<!-- 多文件选择 -->
<input type="file" id="multiFiles" multiple accept="image/png, image/jpeg" />
```

**FileReader 读取文件**
`new FileReader(); reader.readAsDataURL(<file>)`

```javascript
const fileInput = document.querySelector('input[type="file"]');

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0]; // File 对象
  console.log('文件名:', file.name);
  console.log('大小:', file.size, 'bytes');
  console.log('类型:', file.type);
  console.log('修改时间:', new Date(file.lastModified).toLocaleString());

  // 使用 FileReader 读取文件
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.createElement('img');
    img.src = e.target.result; // Data URL
    document.body.appendChild(img);
  };
  reader.readAsDataURL(file);
});
```

**FileReader 方法表**

| 方法                            | 说明                       |
| ------------------------------- | -------------------------- |
| `readAsText(file, [encoding])`  | 读取为文本                 |
| `readAsDataURL(file)`           | 读取为 Data URL(Base64)   |
| `readAsArrayBuffer(file)`       | 读取为 ArrayBuffer         |
| `readAsBinaryString(file)`      | 读取为二进制字符串         |
| `abort()`                       | 中断读取                   |

**File 对象属性表**

| 属性             | 说明                          |
| ---------------- | ----------------------------- |
| `name`           | 文件名                        |
| `size`           | 文件大小(字节)              |
| `type`           | MIME 类型                     |
| `lastModified`   | 最后修改时间戳(毫秒)        |
| `lastModifiedDate` | 最后修改 Date 对象(已废弃)|

---

## Canvas API

**获取绘图上下文**
`canvas.getContext('2d' | 'webgl')`

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d'); // 2D 上下文

// 绘制矩形
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 50);

// 绘制圆形
ctx.beginPath();
ctx.arc(150, 100, 30, 0, Math.PI * 2);
ctx.fillStyle = 'blue';
ctx.fill();
```

**Canvas 2D 上下文方法表**

| 方法                                | 说明                  |
| ----------------------------------- | --------------------- |
| `fillRect(x, y, w, h)`              | 填充矩形              |
| `strokeRect(x, y, w, h)`            | 描边矩形              |
| `clearRect(x, y, w, h)`             | 清除矩形区域          |
| `beginPath()`                       | 开始路径              |
| `moveTo(x, y)`                      | 移动画笔              |
| `lineTo(x, y)`                      | 画线                  |
| `arc(x, y, r, start, end)`          | 画弧                  |
| `fill()`                            | 填充路径              |
| `stroke()`                          | 描边路径              |
| `drawImage(img, x, y, [w, h])`      | 绘制图像              |
| `fillText(text, x, y)`              | 绘制文本              |

---

## 注意事项

- **HTTPS 要求**:Service Worker、Geolocation、Notification 等 API 仅在安全上下文中可用
- **localStorage 容量**:约 5MB,超出会抛出 `QuotaExceededError`
- **localStorage 同步**:读写操作是同步阻塞主线程的,大数据请用 IndexedDB
- **Worker 限制**:Worker 中无法操作 DOM、window、document,可用 `self`、`navigator`、`fetch` 等
- **Fetch 默认不带 Cookie**:`credentials: 'include'` 才会跨域携带
- **Notification 权限**:必须用户主动触发(如点击)后才能请求
- **Canvas 性能**:大量绘图操作建议使用 `requestAnimationFrame` 优化性能

## 动手试试

### 入门版（必做）

1. 主题切换器：用 `localStorage` 保存页面主题（浅色/深色），刷新后主题不丢失；
2. 表单草稿：用 `sessionStorage` 保存输入框内容，刷新页面后自动恢复（关掉标签页则清空）；
3. 用 `fetch` 请求一个公开 API（如天气接口），把结果渲染到页面上。

### 进阶版（选做）

1. 用 IntersectionObserver 实现图片懒加载：图片进入视口才设置 `src`；
2. 给页面注册 Service Worker，实现断网后仍能打开首页（缓存 `index.html` 与静态资源）；
3. 打开两个标签页，用 `storage` 事件让主题修改实时同步到另一个标签页。

## 核心知识点

> 一句话记住浏览器存储：长期保存用 `localStorage`，会话临时用 `sessionStorage`；请求数据用 `fetch`，后台计算找 `Worker`，离线兜底靠 Service Worker。

- `localStorage`：约 5MB，跨标签页共享，永久保存，只能存字符串；
- `sessionStorage`：标签页级会话数据，关闭标签页即清除；
- 对象存储必须 `JSON.stringify`/`JSON.parse` 序列化；
- `fetch` 是必背 API：`response.ok` 检查状态、`response.json()` 解析数据、`.catch` 处理错误；
- `AbortController` 可取消请求，避免过期响应覆盖新结果；
- Geolocation/Worker/Service Worker/Notification 等属于“用到再查”的进阶能力。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 把敏感数据放 localStorage | 任何页面脚本都能读取，XSS 后可被窃取 | Token 优先放 HttpOnly Cookie，本地只放非敏感偏好 |
| 同步大对象 | 每次 `setItem` 都是同步操作，大数据会卡顿 | 大文件用 IndexedDB，本地存储只放轻量数据 |
| 忘记序列化 | 直接存对象得到 `"[object Object]"` | 写入前 `JSON.stringify`，读取后 `JSON.parse` 并容错 |
| 不检查 `response.ok` | HTTP 404/500 也按成功处理 | 先检查 `ok` 再解析，失败时抛错 |
| 无条件注册 Service Worker | 破坏用户对缓存的预期，更新困难 | 使用版本化缓存名并清理旧版本 |
| 滥用 `watchPosition` | 持续定位耗电、侵犯隐私 | 用 `getCurrentPosition` 单次获取，用后 `clearWatch` |

## 扩展学习

- 存储进阶：`javascript/045-StorageForTheWeb` 对比 Cookie/Web Storage/IndexedDB 的完整取舍；
- 离线进阶：`html5/028-ServiceWorkerPWA` 深入 Service Worker 生命周期与缓存策略；
- 通信：`html5/030-WebSocket` 实时数据通道与 `fetch` 的差异；
- 性能：`javascript/050-CoreWebVitalsAndPerformanceMetrics` 中本地缓存对加载指标的影响；
- 安全：`javascript/047-ErrorBoundaryGlobalErrorCatch` 与 CSP 内容安全策略的配合。
