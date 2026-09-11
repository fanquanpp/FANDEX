---
order: 290
title: React 与 WebSocket
module: 'react'
category: 前端技术
difficulty: intermediate
description: React 接入 WebSocket 实战：Effect 生命周期与 StrictMode 双跑、自动重连与心跳、useSyncExternalStore 共享连接、消息状态化与常见陷阱（SSE 对比）。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/270-ReactDesignPattern'
  - 'react/280-ReactWebAssembly'
  - 'react/300-ReactGraphQL'
  - 'react/170-StateManagementSolutionComparison'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 1. 一句话理解

WebSocket 是一条**服务端可以主动推消息**的长连接：HTTP 完成握手后升级为全双工通道，双方随时互发数据。它解决的是轮询的两个痛点——延迟（有消息立刻到）与开销（不必反复建连接）。React 接入的核心命题只有一个：**连接是长生命周期的"外部系统"，组件是短生命周期的"临时消费者"**，两者寿命不对齐，所以要回答"谁拥有连接、消息怎么进 state、断线怎么办"三个问题。

## 2. 最小接入：Effect 生命周期

单组件独享一个连接的场景，`useEffect` 建连、清理函数断连：

```tsx
import { useEffect, useState } from 'react';

interface Price { symbol: string; value: number }

export function PriceTicker({ symbol }: { symbol: string }) {
  const [price, setPrice] = useState<Price | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/ws?symbol=${symbol}`);

    ws.onopen = () => setConnected(true);
    ws.onmessage = (e) => {
      // 收到的是字符串，先解析再入 state
      setPrice(JSON.parse(e.data as string) as Price);
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    // 清理函数：组件卸载必须关闭，否则连接泄漏
    return () => ws.close();
  }, [symbol]); // symbol 变化 = 断开旧的、连接新的

  if (!connected) return <p>连接中...</p>;
  return <p>{price?.symbol ?? symbol}：{price?.value ?? '-'}</p>;
}
```

预期渲染行为：先显示"连接中..."；握手成功后开始实时刷新价格；`symbol` 切换时旧连接关闭、新连接建立；组件卸载后连接关闭（可在 DevTools Network 的 WS 面板验证）。

注意 **StrictMode 下开发模式 Effect 会建连-断连-再建连**，这不是 bug 而是压力测试：只要清理函数正确 `ws.close()`，生产不受影响；如果服务端把"每次连接"计费/计数，要做好幂等。

## 3. 生产必做：重连与心跳

移动网络、代理超时、服务端重启都会掐断长连接。生产级连接器需要指数退避重连 + 心跳保活：

```tsx
import { useEffect, useRef, useState } from 'react';

export function useLiveFeed(url: string) {
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const retry = useRef(0);

  useEffect(() => {
    let ws: WebSocket;
    let heartbeat: number;
    let reconnectTimer: number;
    let closedByUs = false;

    function connect() {
      ws = new WebSocket(url);
      setStatus('connecting');

      ws.onopen = () => {
        retry.current = 0;                 // 连上就重置退避
        setStatus('open');
        heartbeat = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping'); // 保活，防中间设备掐连接
        }, 30_000);
      };

      ws.onmessage = (e) => {
        if (e.data === 'pong') return;     // 心跳回包不入业务状态
        setMessages((prev) => [...prev.slice(-99), e.data as string]); // 只留最近 100 条
      };

      ws.onclose = () => {
        clearInterval(heartbeat);
        setStatus('closed');
        if (closedByUs) return;            // 主动断开不重连
        const delay = Math.min(1000 * 2 ** retry.current, 30_000); // 1s,2s,4s...封顶 30s
        retry.current += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
    }

    connect();
    return () => {
      closedByUs = true;                   // 卸载：停止重连，关闭连接
      clearTimeout(reconnectTimer);
      clearInterval(heartbeat);
      ws.close();
    };
  }, [url]);

  return { messages, status };
}
```

要点：`closedByUs` 区分"主动断开"与"意外断开"，只有后者重连；退避上限避免服务端故障时形成请求风暴；心跳间隔按基础设施（Nginx/LB 空闲超时）调整。

## 4. 全局共享连接：外部 store 模式

行情、通知、协作者光标这类数据通常**多个组件消费一条连接**。此时不应每个组件各开一条 WS，而是把连接做成模块级单例 + 外部 store，组件用 `useSyncExternalStore` 订阅：

```tsx
import { useSyncExternalStore } from 'react';

// --- feedStore.ts：连接与消息缓存都活在 React 之外 ---
type Listener = () => void;
const listeners = new Set<Listener>();
let snapshot: string[] = [];   // 不可变快照：更新时换新数组
let ws: WebSocket | null = null;

function ensureConnected() {
  if (ws) return;
  ws = new WebSocket('wss://api.example.com/feed');
  ws.onmessage = (e) => {
    snapshot = [...snapshot.slice(-99), e.data as string]; // 换引用，触发重渲染
    listeners.forEach((fn) => fn());
  };
}
export function subscribe(fn: Listener) {
  listeners.add(fn);
  ensureConnected(); // 第一个订阅者出现才建连
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) { ws?.close(); ws = null; } // 最后一个离开才断连
  };
}
export const getSnapshot = () => snapshot;

// --- 组件端：任何组件订阅，共享同一条连接 ---
function NoticeList() {
  const messages = useSyncExternalStore(subscribe, getSnapshot);
  return <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>;
}
```

这正是 Zustand 等状态库的底层模型（见[状态管理方案对比](/react/170-StateManagementSolutionComparison)）；把"收到的消息写入 store"后，连接层与 UI 层彻底解耦。

## 5. WebSocket 之外：SSE 与轮询

| 方案 | 方向 | 协议 | 适用 |
| :--- | :--- | :--- | :--- |
| WebSocket | 双向 | WS（独立协议） | 聊天、协同编辑、游戏 |
| SSE（EventSource） | 服务端单向推 | 普通 HTTP | 行情推送、通知流、AI 流式输出 |
| 轮询 | 客户端拉 | HTTP | 低频更新、兼容性兜底 |

只有"客户端也要高频上行"才真正需要 WebSocket；纯展示型推送用 SSE 更简单（自动重连、走 HTTP 基础设施）：

```tsx
useEffect(() => {
  const es = new EventSource('/api/notifications'); // 自动重连，无需手写退避
  es.onmessage = (e) => setNotices((n) => [...n, e.data]);
  return () => es.close();
}, []);
```

## 6. 常见陷阱

- **把 WS 实例存进 state**：`useState(new WebSocket(...))` 会在每次渲染建新连接（严格模式下灾难）；实例放 ref、模块级单例或专用管理类。
- **消息处理闭包过期**：`ws.onmessage` 建立时捕获的 state 永远是旧值；更新用函数式 `setX((prev) => ...)`，或经 ref/store 转发。
- **收到就 JSON.parse**：心跳包、错误包、部分帧都不是合法 JSON；解析放 try/catch 并过滤非业务消息。
- **高频消息直塞 state**：每秒上百帧的行情逐条 setState 会拖垮渲染；在 store/节流层合并（如 100ms 批量 flush 一次）。
- **鉴权只靠 query 参数**：token 出现在 URL 会进日志；优先走握手前的 Cookie/一次性 ticket，或首条消息认证。
- **忘记组件卸载关闭**：单页应用路由切换后连接残留，服务端连接数与内存悄悄上涨；清理函数必须 `close()` 并停止重连。
- **LB 会话粘性缺失**：多实例部署时 WS 长连接固定落在某实例，扩容/发布时要有连接迁移与重连预案。

## 7. 小结

初学者要点：

- Effect 建连、清理函数 `close()`，依赖变化（如房间 ID）自然重建连接。
- 收发数据：`onmessage` 解析后 `setState`（函数式更新），发送 `ws.send(JSON.stringify(obj))`。
- 连接状态（connecting/open/closed）也要进 UI，别让用户面对静默失败。

进阶注意：

- 生产三件套：指数退避重连、心跳保活、`closedByUs` 区分主动/意外断开。
- 多组件共享时用"模块级连接 + `useSyncExternalStore`（或 Zustand）"的外部 store 模式，首订阅建连、末订阅断连。
- 需求只是"服务端推"时优先 SSE；WS 用于真正双向的高频场景。并发渲染下 Effect 可能双跑，清理逻辑必须完全对称。

## 速查

**基础收发**

```tsx
const ws = new WebSocket('wss://api.example.com/ws');
ws.onopen = () => ws.send(JSON.stringify({ type: 'join', room }));
ws.onmessage = (e) => setState((prev) => [...prev, JSON.parse(e.data)]);
ws.onclose = () => reconnect();
// 卸载清理：return () => ws.close();
```

**重连退避**

```ts
const delay = Math.min(1000 * 2 ** attempt, 30_000); // 1s 起步、翻倍、30s 封顶
timer = setTimeout(connect, delay);
```

**心跳**

```ts
heartbeat = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.send('ping');
}, 30_000);
```

**共享连接（外部 store）**

```tsx
const messages = useSyncExternalStore(subscribe, getSnapshot);
// subscribe：首订阅建连、返回取消函数、末订阅断连
// getSnapshot：返回不可变快照（更新时换新数组引用）
```

**SSE 替代（服务端单向推）**

```tsx
const es = new EventSource('/api/notifications'); // 自动重连
es.onmessage = (e) => setNotices((n) => [...n, e.data]);
return () => es.close();
```
