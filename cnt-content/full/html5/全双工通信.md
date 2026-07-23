---
order: 65
title: WebSocket
module: html5
category: HTML5
difficulty: intermediate
description: WebSocket
author: fanquanpp
updated: '2026-06-14'
related:
  - 'html5/Service-Worker与PWA'
  - html5/历史记录API
  - html5/实时通信
  - 'html5/微数据与JSON-LD'
prerequisites:
  - html5/概述与核心特性
---

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
