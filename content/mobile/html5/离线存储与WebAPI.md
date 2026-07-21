# 离线存储与WebAPI 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数 | `{ }` 分组 | `|` 或 | `...` 重复

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
