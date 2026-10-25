---
order: 260
title: Fetch API 与网络请求
module: 'html5'
category: 前端技术
difficulty: beginner
description: 页面级 fetch 的错误处理入门：response.ok 检查、POST 与请求选项、AbortController 取消与超时、表单与文件上传场景。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'html5/245-WebStorage'
  - 'html5/250-DragAPI'
  - 'html5/248-FileBlobAndObjectURL'
prerequisites: []
---

## 知识点地图

- **知识类别**：浏览器网络请求（Fetch API 的页面级使用与错误处理入门）。
- **解决什么问题**：页面要向服务器要数据而不刷新整页。本篇覆盖 HTML 页面里最常见的三件事：拿到数据并正确处理失败（404/500 不是异常而是成功响应）、提交表单与文件（FormData）、取消过期请求（AbortController 基本用法）。
- **什么时候用到**：HTML/JS 页面直接调接口时；表单 Ajax 化时；搜索联想这类需要取消旧请求的场景。

## 与 007-javascript 模块的分工

取消与请求的**深入语义**（AbortSignal 事件模型、跨 API 复用、ReadableStream 流式读取、请求重试策略）在 [Fetch API 与 AbortController](/javascript/440-FetchApiAndAbortController) 与 [Fetch 与 Web Streams](/javascript/450-FetchApiWebStreams) 系统展开。本篇聚焦 HTML 表单、文件上传与页面级数据获取的最小正确写法，取消部分只讲到「会 abort、会区分 AbortError」。

本篇由原 [Web Storage 与 Fetch API](/html5/245-WebStorage) 拆出：Fetch 一节与动手实践的网络任务独立成篇；存储内容留在改名后的 [Web Storage](/html5/245-WebStorage)。

## 1. 基本用法与错误处理

fetch 最反直觉的一点：**网络层失败（断网、DNS 失败）才 reject；HTTP 404/500 属于成功响应，Promise 照样 resolve**。错误处理必须手动检查 `response.ok`：

```javascript
// GET 请求
fetch('https://api.example.com/data')
  .then((response) => {
    if (!response.ok) {
      // 404/500 走到这里：主动抛错，让后续 catch 接住
      throw new Error('HTTP ' + response.status);
    }
    return response.json();
  })
  .then((data) => console.log('数据:', data))
  .catch((error) => console.error('错误:', error));
```

**逐段讲解：**

- `response.ok` 等价于 `status` 在 200-299 之间；不检查 ok 的话，404 返回的错误页 HTML 会被 `json()` 解析失败或被当数据渲染——两种都是线上事故；
- `response.json()` 也是 Promise（解析响应体需要时间），所以链上有两个 then；
- async/await 版本等价且更线性：

```javascript
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return await response.json();
  } catch (error) {
    console.error('错误:', error);
    throw error; // 让调用方感知失败
  }
}
```

## 2. POST 请求与 FormData：表单 Ajax 化

### 2.1 JSON 提交

```javascript
fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
})
  .then((response) => response.json())
  .then((data) => console.log('创建成功:', data))
  .catch((error) => console.error('错误:', error));
```

**讲解：**

- `body` 里放对象必须 `JSON.stringify`，同时 `Content-Type: application/json` 告诉服务器格式——只 stringify 不设头，服务器可能按表单解析失败；
- **fetch 默认不携带 Cookie**：跨域要带凭证需 `credentials: 'include'`（同源默认带）。

### 2.2 表单原生提交（不用手拼 JSON）

```html
<form id="comment-form">
  <input name="author" placeholder="昵称" required />
  <textarea name="content" placeholder="留言" required></textarea>
  <button type="submit">提交</button>
</form>
<script>
  const form = document.getElementById('comment-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // 拦下浏览器默认的整页跳转提交

    const response = await fetch('/api/comments', {
      method: 'POST',
      body: new FormData(form), // 自动收集全部字段并设置 multipart 头
    });
    if (!response.ok) {
      alert('提交失败：HTTP ' + response.status);
      return;
    }
    form.reset();
  });
</script>
```

**逐段讲解：**

- `new FormData(form)` 是 HTML 表单与 fetch 的直通车：字段名取自每个控件的 `name` 属性，Content-Type 自动是 `multipart/form-data`，不用手设头（手设反而会丢 boundary 参数，这是高频错误）；
- `event.preventDefault()` 必须在监听器开头调用，否则页面已经跳转，后面的 fetch 跑不完整；
- 文件字段（`<input type="file">`）会被 FormData 一并收进去——把 [File/Blob 与对象 URL](/html5/248-FileBlobAndObjectURL) 读到的 File 对象放进 FormData 即可上传。

### 2.3 常用请求选项

```javascript
const options = {
  method: 'GET',                    // GET | POST | PUT | DELETE | PATCH
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123',
  },
  body: JSON.stringify(data),       // POST/PUT 请求体
  mode: 'cors',                     // cors | no-cors | same-origin
  credentials: 'include',           // include | same-origin | omit
  cache: 'default',                 // default | no-store | reload | no-cache | force-cache
  redirect: 'follow',               // follow | error | manual
  signal: controller.signal,        // 用于取消请求（见第 3 节）
};
```

**Response 对象常用成员：**

| 方法/属性 | 说明 |
| --- | --- |
| `response.ok` | 状态码 200-299 时为 true |
| `response.status` | HTTP 状态码 |
| `response.headers` | 响应头对象 |
| `response.json()` | 解析为 JSON |
| `response.text()` | 解析为文本 |
| `response.blob()` | 解析为 Blob（图片/文件，详见 [File/Blob 与对象 URL](/html5/248-FileBlobAndObjectURL)） |
| `response.formData()` | 解析为 FormData |
| `response.clone()` | 克隆响应（响应体只能消费一次） |

## 3. AbortController：取消请求

搜索框连续输入时会发出一串请求，慢的旧响应可能覆盖快的新响应（竞态）。AbortController 解决它：

```javascript
const controller = new AbortController();

fetch('https://api.example.com/data', { signal: controller.signal })
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => {
    if (error.name === 'AbortError') {
      console.log('请求已取消'); // 取消不是错误，单独分支处理
    } else {
      console.error('错误:', error);
    }
  });

// 触发取消：新请求发出前取消旧的
controller.abort();
```

**讲解：**

- 每个 `AbortController` 有一个 `signal`，fetch 拿着它；`abort()` 一调用，对应请求立即 reject，`error.name` 为 `'AbortError'`；
- 搜索联想的标准写法：每次输入新建 controller，发请求前 `previousController.abort()`——永远只有最后一个请求的结果被采纳；
- 也可用 `AbortSignal.timeout(5000)`（现代浏览器）一行实现超时取消；`AbortSignal.any([...])` 组合多个信号等进阶语义见 [Fetch API 与 AbortController](/javascript/440-FetchApiAndAbortController)。

### 3.1 工程例子：可取消的搜索联想

```javascript
let currentController = null;

async function searchSuggest(keyword) {
  // 1. 取消上一个未完成的请求
  if (currentController) currentController.abort();
  currentController = new AbortController();

  try {
    const response = await fetch('/api/suggest?q=' + encodeURIComponent(keyword), {
      signal: currentController.signal,
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const list = await response.json();
    renderSuggest(list);
  } catch (error) {
    if (error.name !== 'AbortError') {
      // 真正的网络错误才提示；取消是正常流程
      showSuggestError(error.message);
    }
  }
}

input.addEventListener('input', (e) => searchSuggest(e.target.value.trim()));
```

**逐段讲解：**

- `encodeURIComponent` 对用户输入编码，防止 `?&=` 等字符破坏 URL 结构（安全与正确性双重要求）；
- 每次调用都中止上一个请求：请求顺序不再影响结果正确性，竞态消失；
- catch 里区分 `AbortError`：用户主动取消（或被新请求顶掉）不该弹错误提示，否则搜索时会疯狂弹"请求失败"。

### 3.2 工程例子：带进度的文件上传

```html
<form id="upload-form">
  <input type="file" name="avatar" accept="image/*" />
  <button type="submit">上传头像</button>
</form>
<progress id="progress" value="0" max="100"></progress>
<script>
  // fetch 本身没有上传进度回调；XHR 的 upload.onprogress 是页面级上传进度的现实选择
  document.getElementById('upload-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const bar = document.getElementById('progress');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) bar.value = Math.round((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      bar.value = xhr.status >= 200 && xhr.status < 300 ? 100 : 0;
    };
    xhr.send(new FormData(form));
  });
</script>
```

**讲解：**

- 下载进度 fetch 可以用 `response.body`（ReadableStream）逐块统计；**上传进度**至今仍是 XHR 的专属能力，工程上「进度条 + 大文件」场景继续用 XHR 不丢人；
- 表单里 `enctype` 不需要设——XHR 与 fetch 对 FormData 都自动带 multipart 头；
- 服务端接收侧（大小限制、类型校验）是另一个话题，前端至少要做 `accept` 提示与客户端大小预检。

## 4. 动手实践

### 任务

1. 用 fetch 请求一个公开 JSON 接口，把结果渲染为列表；请求中禁用按钮、完成/失败后恢复；
2. 给任务 1 加"超时 5 秒自动取消"；
3. 把一个 `<form>`（含文本与文件字段）改为 Ajax 提交，成功后清空表单并显示服务端返回的文件 URL；
4. 做一个搜索联想输入框：输入停顿 300ms 才发请求（防抖），且新请求发出前取消旧请求。

### 提示

- 超时取消用 `AbortSignal.timeout(5000)` 或 `setTimeout` + `controller.abort()`；
- `AbortSignal.timeout` 抛的是 `TimeoutError`，与手动 abort 的 `AbortError` 不同名，分支时都要照顾；
- 防抖用 `setTimeout`/`clearTimeout` 组合；表单提交用 `new FormData(form)`。

<details>
<summary>参考实现（先自己写，写完再展开对照）</summary>

```javascript
// 任务 1 + 2：fetch + 超时取消
const btn = document.querySelector('#loadBtn');
const list = document.querySelector('#list');

btn.addEventListener('click', async () => {
  btn.disabled = true;
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=10', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const posts = await response.json();
    list.innerHTML = posts
      .map((p) => '<li>' + p.title + '</li>')
      .join('');
  } catch (error) {
    const reason =
      error.name === 'TimeoutError' ? '请求超时' : error.name === 'AbortError' ? '已取消' : error.message;
    list.innerHTML = '<li class="error">' + reason + '</li>';
  } finally {
    btn.disabled = false;
  }
});

// 任务 3：表单 Ajax 提交
const uploadForm = document.querySelector('#upload-form');
uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await fetch('/api/upload', { method: 'POST', body: new FormData(uploadForm) });
  if (!response.ok) return alert('上传失败');
  const { url } = await response.json();
  uploadForm.reset();
  console.log('文件地址：', url);
});

// 任务 4：防抖 + 可取消联想
let timer = null;
let controller = null;
input.addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (controller) controller.abort();
    controller = new AbortController();
    try {
      const res = await fetch('/api/suggest?q=' + encodeURIComponent(e.target.value), {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      renderSuggest(await res.json());
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
  }, 300);
});
```

**参考实现讲解：** `finally` 保证按钮必定恢复，避免失败后永久禁用；任务 4 把防抖（时间维度去抖动）与取消（请求维度去竞态）叠用——两者解决的是不同问题，生产联想框两个都要。

</details>

## 5. 常见陷阱速查

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 不检查 `response.ok` | HTTP 404/500 被当成功处理 | 先检查 ok 再解析，失败抛错 |
| 给 FormData 手设 Content-Type | 丢掉 multipart boundary，服务端解析失败 | 用 FormData 时不要手设该头 |
| 忘记 preventDefault | 页面跳转，Ajax 逻辑中断 | submit 监听器开头调用 |
| 竞态响应覆盖 | 旧慢请求覆盖新结果 | AbortController 取消前序请求 |
| 把 AbortError 当错误弹窗 | 用户/新请求取消被误报 | catch 里按 error.name 分支 |
| Authorization 令牌放前端代码 | 构建产物里可被任何人读到 | 令牌走会话 Cookie 或由服务端持有 |

## 6. 扩展学习

- 取消与流的深入：[Fetch API 与 AbortController](/javascript/440-FetchApiAndAbortController)、[Fetch 与 Web Streams](/javascript/450-FetchApiWebStreams)；
- 存储全景：[Web Storage](/html5/245-WebStorage) 与 `javascript/460-StorageForTheWeb`；
- 文件与 Blob：[File/Blob 与对象 URL](/html5/248-FileBlobAndObjectURL)；
- 实时通道：[320-WebSocket](/html5/320-WebSocket) 与 fetch 的长连接差异。

<!-- 恢复自 cnt-content/full/005-html5/240-HTML5OfflineStorageWebAPI.md（实施前 HEAD 62c90663 版本）；拆分时该小节未随迁，2026-10-07 内容保全复核恢复 -->

## Fetch API 最佳实践


- **错误处理**：始终处理 fetch 请求的错误，包括网络错误和 HTTP 错误
- **请求配置**：根据实际需求配置请求选项，如 headers、credentials 等
- **响应处理**：根据响应类型选择合适的处理方法，如 response.json()、response.text() 等
- **取消请求**：在需要时使用 AbortController 取消请求
- **超时处理**：实现请求超时处理，避免长时间等待


## 参考与致谢

- MDN Web Docs：Fetch API、AbortController、FormData 文档（CC-BY-SA 2.5），https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API
- WHATWG Fetch Standard，https://fetch.spec.whatwg.org/
