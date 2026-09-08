---
order: 310
title: WebSocket
module: 'html5'
category: 前端技术
difficulty: intermediate
description: WebSocket
author: fanquanpp
updated: '2026-09-08'
related:
  - 'html5/029-ServiceWorkerPWA'
  - 'html5/033-MicrodataJSONLD'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---

> 前置要求：需要 Promise、async/await、事件监听基础（`javascript/001`-`005`、`039`、`023`）；理解 HTTP 请求-响应模型（`networking/001`）有助于理解握手过程。速查区"WebSocket vs SSE"给出单向推送场景的轻量替代，实际项目按"双向/单向"选型。

## 1. WebSocket 概述

| 特性       | HTTP      | WebSocket |
| ---------- | --------- | --------- |
| 通信模式   | 请求-响应 | 全双工    |
| 连接       | 短连接    | 持久连接  |
| 服务器推送 |           |           |

## 2. WebSocket API

```javascript
const ws = new WebSocket('wss://example.com/chat');

ws.onopen = () => {
  console.log('连接已建立');
  ws.send('Hello!');
};
ws.onmessage = (e) => {
  console.log('收到消息:', e.data);
};
ws.onclose = (e) => {
  console.log('连接关闭:', e.code);
};
ws.onerror = () => {
  console.error('WebSocket 错误');
};
```

### 连接状态

| readyState | 常量       | 说明       |
| ---------- | ---------- | ---------- |
| 0          | CONNECTING | 正在连接   |
| 1          | OPEN       | 连接已建立 |
| 2          | CLOSING    | 正在关闭   |
| 3          | CLOSED     | 已关闭     |

### 发送与关闭

```javascript
ws.send('文本消息');
ws.send(JSON.stringify({ type: 'chat', content: '你好' }));
ws.send(new ArrayBuffer(4));
ws.close(1000, '正常关闭');
```

## 3. 断线重连

```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.retries = 0;
    this.options = { reconnectInterval: 1000, ...options };
    this.connect();
  }
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = (e) => {
      this.retries = 0;
      this.onopen?.(e);
    };
    this.ws.onmessage = (e) => this.onmessage?.(e);
    this.ws.onclose = (e) => {
      this.onclose?.(e);
      const delay = Math.min(this.options.reconnectInterval * Math.pow(1.5, this.retries), 30000);
      this.retries++;
      setTimeout(() => this.connect(), delay);
    };
  }
  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data);
  }
  close() {
    this.retries = Infinity;
    this.ws?.close();
  }
}
```

## 4. 心跳机制

```javascript
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```
## WebSocket 创建

**创建 WebSocket 连接**
`const ws = new WebSocket(<url>, [protocols])`
```javascript
// 基础连接
const ws = new WebSocket('wss://example.com/chat');

// 带子协议
const ws = new WebSocket('wss://example.com/chat', ['chat-v1', 'chat-v2']);

// 事件监听
ws.onopen = () => {
  console.log('连接已建立');
  ws.send('Hello!');
};

ws.onmessage = (e) => {
  console.log('收到消息:', e.data);
};

ws.onclose = (e) => {
  console.log('连接关闭:', e.code, e.reason);
};

ws.onerror = () => {
  console.error('WebSocket 错误');
};
```

**protocols 参数**
```javascript
// 字符串数组,客户端支持的子协议
const ws = new WebSocket('wss://example.com', ['protocol1', 'protocol2']);

// 服务端选择的协议
console.log(ws.protocol); // 'protocol1' 或 'protocol2'
```

---

## WebSocket 状态

**readyState 状态**

| readyState | 常量       | 说明       |
| ---------- | ---------- | ---------- |
| 0          | CONNECTING | 正在连接   |
| 1          | OPEN       | 连接已建立 |
| 2          | CLOSING    | 正在关闭   |
| 3          | CLOSED     | 已关闭     |

```javascript
// 检查连接状态
if (ws.readyState === WebSocket.OPEN) {
  ws.send('消息');
}

// 常量访问
console.log(WebSocket.CONNECTING); // 0
console.log(WebSocket.OPEN);       // 1
console.log(WebSocket.CLOSING);    // 2
console.log(WebSocket.CLOSED);     // 3
```

---

## 发送消息

**send 方法**
`ws.send(<data>)`
```javascript
// 发送文本
ws.send('文本消息');

// 发送 JSON
ws.send(JSON.stringify({ type: 'chat', content: '你好' }));

// 发送 ArrayBuffer
const buffer = new ArrayBuffer(4);
const view = new Uint8Array(buffer);
view[0] = 1;
ws.send(buffer);

// 发送 Blob
const blob = new Blob(['二进制数据'], { type: 'application/octet-stream' });
ws.send(blob);
```

**发送数据类型**

| 数据类型      | 说明                  |
| ------------- | --------------------- |
| `string`      | 文本消息              |
| `ArrayBuffer` | 二进制数据            |
| `Blob`        | 二进制大对象          |
| `TypedArray`  | 类型化数组            |
| `DataView`    | 数据视图              |

**bufferedAmount 缓冲检查**
```javascript
// 检查未发送的数据量
if (ws.bufferedAmount < 1024 * 1024) {
  ws.send(data);
} else {
  console.log('缓冲区已满,等待...');
}
```

---

## 接收消息

**onmessage 事件**
```javascript
ws.onmessage = (e) => {
  // e.data 类型:string / ArrayBuffer / Blob
  console.log('收到:', e.data);
  console.log('来源:', e.origin);
};

// 二进制模式
ws.binaryType = 'arraybuffer'; // 默认 'blob'
ws.onmessage = (e) => {
  if (typeof e.data === 'string') {
    console.log('文本消息:', e.data);
  } else {
    const view = new Uint8Array(e.data);
    console.log('二进制数据:', view);
  }
};
```

---

## 关闭连接

**close 方法**
`ws.close([code], [reason])`
```javascript
// 正常关闭
ws.close();

// 带关闭码和原因
ws.close(1000, '正常关闭');
ws.close(4001, '用户退出');
```

**关闭码规范**

| code  | 说明                       |
| ----- | -------------------------- |
| 1000  | 正常关闭                   |
| 1001  | 端点离开(关闭页面)         |
| 1002  | 协议错误                   |
| 1003  | 不支持的数据类型           |
| 1006  | 异常关闭(无 close 帧)      |
| 1009  | 消息过大                   |
| 1011  | 服务器遇到意外情况         |
| 4000-4999 | 应用自定义范围          |

**close 事件**
```javascript
ws.onclose = (e) => {
  console.log('code:', e.code);       // 关闭码
  console.log('reason:', e.reason);   // 关闭原因
  console.log('wasClean:', e.wasClean); // 是否干净关闭
};
```

---

## 断线重连

**自动重连封装**
```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.retries = 0;
    this.options = {
      reconnectInterval: 1000,
      maxRetries: Infinity,
      ...options,
    };
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = (e) => {
      this.retries = 0;
      this.onopen?.(e);
    };
    this.ws.onmessage = (e) => this.onmessage?.(e);
    this.ws.onclose = (e) => {
      this.onclose?.(e);
      if (this.retries < this.options.maxRetries) {
        // 指数退避
        const delay = Math.min(
          this.options.reconnectInterval * Math.pow(1.5, this.retries),
          30000
        );
        this.retries++;
        setTimeout(() => this.connect(), delay);
      }
    };
    this.ws.onerror = (e) => this.onerror?.(e);
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  close() {
    this.retries = Infinity; // 阻止重连
    this.ws?.close();
  }
}

// 使用
const ws = new ReconnectingWebSocket('wss://example.com/chat');
ws.onmessage = (e) => console.log(e.data);
```

---

## 心跳机制

**心跳检测实现**
```javascript
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

let heartbeatTimer;
let timeoutTimer;

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

      // 等待 pong 响应
      timeoutTimer = setTimeout(() => {
        console.log('心跳超时,重连...');
        ws.close();
      }, HEARTBEAT_TIMEOUT);
    }
  }, HEARTBEAT_INTERVAL);
}

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'pong') {
    clearTimeout(timeoutTimer); // 收到 pong,清除超时
    return;
  }
  // 处理业务消息
};

ws.onopen = startHeartbeat;
ws.onclose = () => clearInterval(heartbeatTimer);
```

---

## HTTP 与 WebSocket 对比

| 特性       | HTTP                | WebSocket       |
| ---------- | ------------------- | --------------- |
| 通信模式   | 请求-响应           | 全双工          |
| 连接       | 短连接(Keep-Alive)  | 持久连接        |
| 服务器推送 | 需轮询或 SSE        | 原生支持        |
| 协议       | HTTP/1.1、HTTP/2、HTTP/3 | ws/wss        |
| 头部开销   | 每次请求带 header   | 连接后无 header |
| 数据格式   | 文本为主            | 文本 + 二进制   |
| 适用场景   | 普通 API 请求       | 实时通信        |

---

## WebSocket vs SSE

**Server-Sent Events (SSE) 单向推送**
```javascript
// SSE 仅服务器→客户端
const eventSource = new EventSource('/api/events');
eventSource.onmessage = (e) => {
  console.log('收到事件:', e.data);
};
eventSource.addEventListener('update', (e) => {
  console.log('自定义事件:', e.data);
});
eventSource.close();
```

| 特性       | WebSocket          | SSE                    |
| ---------- | ------------------ | ---------------------- |
| 通信方向   | 双向               | 服务器→客户端          |
| 协议       | ws/wss             | HTTP                   |
| 自动重连   | 需手动实现         | 内置                   |
| 二进制     | 支持               | 不支持                 |
| 浏览器兼容| 主流               | 除 IE 外主流           |
| 适用场景   | 聊天、游戏、协作   | 通知、股票、日志推送   |

---

## 服务器端握手响应

**WebSocket 握手响应头**
```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: chat-v1
```

**JavaScript 中无直接 API**
握手由浏览器自动处理,开发者只需调用 `new WebSocket()`。
- `ws.url` - 连接 URL
- `ws.protocol` - 选定的子协议
- `ws.extensions` - 使用的扩展

---

## 客户端示例

**简单聊天客户端**
```javascript
class ChatClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => console.log('已连接');
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      this.display(msg);
    };
    this.ws.onclose = () => console.log('已断开');
  }

  send(text) {
    this.ws.send(JSON.stringify({
      type: 'message',
      text,
      time: Date.now(),
    }));
  }

  display(msg) {
    console.log(`[${msg.time}] ${msg.text}`);
  }
}

const chat = new ChatClient('wss://chat.example.com');
chat.send('Hello!');
```

## 动手试试

### 入门版（必做）

先复制下面这个最小示例到本地 `ws.html`，双击打开即可连接公开回显服务：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>WebSocket 最小示例</title>
  </head>
  <body>
    <button id="send">发送 Hello</button>
    <pre id="log"></pre>
    <script>
      const log = document.getElementById('log');
      const ws = new WebSocket('wss://echo.websocket.org');
      ws.onopen = () => (log.textContent += '连接已建立\n');
      ws.onmessage = (e) => (log.textContent += '收到: ' + e.data + '\n');
      ws.onerror = () => (log.textContent += '连接出错\n');
      document.getElementById('send').onclick = () => {
        ws.send('Hello!');
      };
    </script>
  </body>
</html>
```

1. 用公开的 WebSocket 回显服务（如 wss://echo.websocket.org）连接，发送消息并接收回显；
2. 在页面显示连接状态（`readyState`）与收发日志；
3. 断开网络（开发者工具 Offline），观察 `onclose` 触发。

### 进阶版（选做）

1. 实现带指数退避的自动重连，并显示重连次数；
2. 加心跳：每 30 秒发 `ping`，收到 `pong` 才继续；
3. 用 SSE 订阅一个公开事件流，对比与 WebSocket 的体验差异。

## 核心知识点

> 一句话记住 WebSocket：`new WebSocket` 建连接，`onmessage` 收消息，`send` 发消息；断线重连加心跳，生产必用 `wss://`。

- WebSocket 是持久化全双工通道，服务器可主动推送；
- 四个事件：`onopen`/`onmessage`/`onclose`/`onerror`；
- `readyState`：CONNECTING/OPEN/CLOSING/CLOSED；
- `send` 支持文本、JSON、二进制；`close(code, reason)` 主动关闭；
- 断线重连 + 心跳是生产环境的标配；
- 单向推送可考虑 SSE，双向实时才用 WebSocket。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 使用 `ws://` | 明文传输，数据可被窃听 | 生产环境统一 `wss://` |
| 无重连逻辑 | 断线后连接永久失效 | 实现指数退避重连 |
| 无心跳 | 中间设备回收静默连接 | 定时 ping/pong |
| 不处理粘包/顺序 | 消息可能乱序或合并 | 消息带 id/seq，客户端排序 |
| 连接数不回收 | 资源泄漏 | 页面卸载时 `close()` |
| 广播无权限校验 | 任何人可发消息 | 服务端鉴权 + 消息校验 |

## 扩展学习

- 实时传输：`html5/032-WebRTC` 对比 WebSocket 与点对点媒体流；
- 服务端：Node.js 的 `ws` 库与 Socket.IO 的使用；
- 消息格式：JSON 协议设计（type/payload）与错误码约定；
- 性能：`javascript/051-CoreWebVitalsAndPerformanceMetrics` 中长连接对资源的影响。
