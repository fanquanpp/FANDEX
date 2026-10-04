---
order: 300
title: 专项：postMessage 生产级封装
module: 'html5'
category: 前端技术
difficulty: advanced
description: 把 postMessage 从"裸消息"升级为生产级通信：Promise 化 RPC（超时/请求 ID）、跨域 localStorage 代理（MessageChannel + iframe）、多标签页登录同步器（BroadcastChannel + 心跳），附调试技巧。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'html5/280-CrossDocumentCommunication'
  - 'html5/290-WebWorkers'
  - 'html5/320-WebSocket'
prerequisites:
  - 'html5/280-CrossDocumentCommunication'
---

## 前置要求

本篇是 `html5/280-CrossDocumentCommunication` 的工程延伸：假定你已经会用 `postMessage` 收发消息、理解 targetOrigin 与 origin 校验四道防线。三段代码各自独立，按需取用；第一遍读不懂没关系，等真实项目里撞到对应需求再回来抄。

## 1. 场景：裸消息撑不起真实业务

280 篇的示例是"一发一收"。真实项目里你会立刻撞上三个进阶需求：

1. **请求-响应语义**：发出去的消息什么时候算"回复"？多个并发请求的回复怎么对上号？对方挂了怎么办（永远不回复）？
2. **跨域读存储**：主域想读写另一个域下的 localStorage（单点登录的早期形态），同源策略不允许直接读，但可以借那个域上的 iframe 代劳；
3. **多标签页登录状态一致性**：一个标签页登录/登出，其余标签页要跟着变，还要能发现"哪个标签页已经关了"。

这三个需求的成熟解法都在下面，全部只依赖 `postMessage` / `MessageChannel` / `BroadcastChannel` 三件原生 API。

## 2. Promise 化 RPC：超时与请求 ID

核心思路：每条请求带唯一 `id`，回复时带回同一个 `id`，用 `Map` 把"发出但未回"的请求挂起；`setTimeout` 兜底超时。这个模式与 HTTP 客户端、WebSocket RPC 完全同构，学会一处处处受用。

```javascript
// postmessage-rpc.js
export class PostMessageRPC {
  constructor({ targetWindow, targetOrigin, timeout = 5000 }) {
    this.target = targetWindow;
    this.targetOrigin = targetOrigin;
    this.timeout = timeout;
    this.pending = new Map();   // id -> { resolve, reject, timer }
    this.handlers = new Map();  // method -> handler

    window.addEventListener('message', this._onMessage.bind(this));
  }

  _onMessage(event) {
    if (event.origin !== this.targetOrigin) return;   // 280 篇防线一
    const msg = event.data;
    if (!msg || typeof msg !== 'object' || msg.__rpc !== true) return;

    if (msg.type === 'request') this._handleRequest(msg, event.source);
    else if (msg.type === 'response') this._handleResponse(msg);
    else if (msg.type === 'error') this._handleError(msg);
  }

  async _handleRequest(msg, source) {
    const handler = this.handlers.get(msg.method);
    if (!handler) {
      source.postMessage(
        { __rpc: true, type: 'error', id: msg.id, error: `method ${msg.method} not found` },
        this.targetOrigin
      );
      return;
    }
    try {
      const result = await handler(msg.params);
      source.postMessage({ __rpc: true, type: 'response', id: msg.id, result }, this.targetOrigin);
    } catch (err) {
      source.postMessage({ __rpc: true, type: 'error', id: msg.id, error: err.message }, this.targetOrigin);
    }
  }

  _settle(msg, ok, value) {
    const ctx = this.pending.get(msg.id);
    if (!ctx) return;                     // 迟到的重复回复，丢弃
    clearTimeout(ctx.timer);
    this.pending.delete(msg.id);
    ok ? ctx.resolve(value) : ctx.reject(new Error(value));
  }

  _handleResponse(msg) { this._settle(msg, true, msg.result); }
  _handleError(msg) { this._settle(msg, false, msg.error); }

  call(method, params, timeout = this.timeout) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeout);

      this.pending.set(id, { resolve, reject, timer });
      this.target.postMessage({ __rpc: true, type: 'request', id, method, params }, this.targetOrigin);
    });
  }

  register(method, handler) { this.handlers.set(method, handler); }

  destroy() {
    this.pending.forEach((ctx) => {
      clearTimeout(ctx.timer);
      ctx.reject(new Error('RPC destroyed'));
    });
    this.pending.clear();
    this.handlers.clear();
  }
}
```

两端各建一个实例，一边 `register('getTime', () => Date.now())`，另一边 `await rpc.call('getTime')`。细节亮点：`_settle` 里对"未知 id"直接忽略，天然消化迟到的重复回复；`destroy` 把所有挂起请求统一拒绝，避免页面卸载后 Promise 永远悬着。

## 3. 跨域存储代理：iframe + MessageChannel

需求：`app.com` 想读写 `id.com` 域下的 localStorage。做法是在页面里藏一个 `id.com` 的 iframe（它对自家存储有完全权限），用 MessageChannel 建专线，把 get/set 请求转发过去执行。这是早期单点登录（如 Disqus、知乎早期）的真实方案；今天若有条件应优先用后端会话或标准联合登录，但这个模式对理解"权限借给可信方"很有价值。

```javascript
// CrossDomainStorage.js —— 主域侧
export class CrossDomainStorage {
  constructor(iframeUrl, timeout = 3000) {
    this.iframeUrl = iframeUrl;
    this.timeout = timeout;
    this.iframe = null;
    this.port = null;
    this.pending = new Map();
    this.ready = null;
  }

  async init() {
    if (this.ready) return this.ready;

    this.ready = new Promise((resolve, reject) => {
      this.iframe = document.createElement('iframe');
      this.iframe.style.display = 'none';
      this.iframe.src = this.iframeUrl;
      document.body.appendChild(this.iframe);

      this.iframe.addEventListener('load', () => {
        const channel = new MessageChannel();
        const targetOrigin = new URL(this.iframeUrl).origin;

        channel.port1.onmessage = (e) => this._onMessage(e, resolve);
        channel.port1.start();

        this.iframe.contentWindow.postMessage(
          { type: 'INIT' }, targetOrigin, [channel.port2]
        );

        setTimeout(() => reject(new Error('CrossDomainStorage init timeout')), this.timeout);
      });
    });
    return this.ready;
  }

  _onMessage(event, readyResolve) {
    const msg = event.data;
    if (!msg || !msg.id) return;

    if (msg.type === 'READY') { this.port = msg.port ?? this._port; readyResolve(); return; }

    const ctx = this.pending.get(msg.id);
    if (!ctx) return;
    clearTimeout(ctx.timer);
    this.pending.delete(msg.id);
    msg.error ? ctx.reject(new Error(msg.error)) : ctx.resolve(msg.result);
  }

  _send(method, params) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Operation timeout: ${method}`));
      }, this.timeout);

      this.pending.set(id, { resolve, reject, timer });
      this.port.postMessage({ id, method, params });
    });
  }

  async get(key) { await this.init(); return this._send('get', { key }); }
  async set(key, value) { await this.init(); return this._send('set', { key, value }); }

  destroy() {
    this.port?.close();
    this.iframe?.remove();
    this.pending.forEach((ctx) => ctx.reject(new Error('Destroyed')));
  }
}
```

```html
<!-- storage-proxy.html，部署在 id.com 域下 -->
<script>
  window.addEventListener('message', (event) => {
    // 生产环境：校验 event.origin 是否为主域白名单
    if (event.data?.type !== 'INIT' || event.ports.length === 0) return;

    const port = event.ports[0];
    port.onmessage = async (e) => {
      const { id, method, params } = e.data;
      try {
        let result;
        if (method === 'get') result = localStorage.getItem(params.key);
        else if (method === 'set') {
          localStorage.setItem(params.key, params.value);
          result = true;
        }
        port.postMessage({ id, result });
      } catch (err) {
        port.postMessage({ id, error: err.message });
      }
    };
    port.start();
    port.postMessage({ id: 'ready', type: 'READY' });
  });
</script>
```

自检要点：专线建立后，主域侧 `port1` 的回复里既有 `READY` 也有业务回包，处理函数要按 `type`/`id` 分流；iframe 必须等 `load` 事件后再握手，否则 `contentWindow` 里的脚本还没就绪。

## 4. 多标签页登录同步：BroadcastChannel + 心跳

比 280 篇的"广播 logout"更完整的版本：除了登录/登出广播，还要让每个标签页周期性报平安（心跳），3 秒没声音的标签页从"在线名单"里剔除：

```javascript
// TabAuthSync.js
export class TabAuthSync {
  constructor(channelName = 'auth_sync') {
    this.channel = new BroadcastChannel(channelName);
    this.tabId = crypto.randomUUID();
    this.peers = new Map();     // tabId -> lastSeen 时间戳
    this.user = null;
    this.onAuthChange = null;   // 外部注册的回调

    this.channel.onmessage = (event) => {
      const msg = event.data;
      if (msg.tabId === this.tabId) return;   // 自己的消息不处理

      if (msg.type === 'LOGIN' || msg.type === 'HEARTBEAT_ACK') {
        this.peers.set(msg.tabId, Date.now());
        if (msg.user && !this.user) {
          this.user = msg.user;
          this.onAuthChange?.(this.user);     // 后加入的标签页补登录态
        }
      } else if (msg.type === 'LOGOUT') {
        this.user = null;
        this.onAuthChange?.(null);
      } else if (msg.type === 'HEARTBEAT') {
        this.peers.set(msg.tabId, Date.now());
        this.channel.postMessage({ type: 'HEARTBEAT_ACK', tabId: this.tabId, user: this.user });
      }
    };

    this.heartbeatTimer = setInterval(() => {
      this.channel.postMessage({ type: 'HEARTBEAT', tabId: this.tabId, user: this.user });
      const now = Date.now();
      for (const [id, lastSeen] of this.peers) {
        if (now - lastSeen > 3000) this.peers.delete(id);   // 视为已关闭
      }
    }, 1000);
  }

  login(user) {
    this.user = user;
    this.channel.postMessage({ type: 'LOGIN', tabId: this.tabId, user });
    this.onAuthChange?.(user);
  }

  logout() {
    this.user = null;
    this.channel.postMessage({ type: 'LOGOUT', tabId: this.tabId });
    this.onAuthChange?.(null);
  }

  destroy() {
    clearInterval(this.heartbeatTimer);
    this.channel.close();
  }
}
```

使用方式：

```javascript
const sync = new TabAuthSync();
sync.onAuthChange = (user) => renderHeader(user);   // 登录/登出统一入口
```

注意边界：BroadcastChannel 只覆盖"还开着的标签页"；页面崩溃、直接关窗口不会有告别消息，所以用"超时剔除"而非"显式退出"来维护在线名单——这是所有心跳机制的共同取舍。

## 5. 调试技巧

跨文档通信出问题时的排查顺序：

1. **Console 面板顶部切换上下文**（top / iframe），确认日志来自哪个文档；
2. **临时拦截发信**，把每条消息的来源、目标、内容打进控制台（仅调试用，勿上线）：

```javascript
const _postMessage = window.postMessage;
window.postMessage = function (message, targetOrigin, transfer) {
  console.log('[postMessage 发送]', { message, targetOrigin });
  return _postMessage.call(this, message, targetOrigin, transfer);
};
window.addEventListener('message', (e) => {
  console.log('[postMessage 接收]', { origin: e.origin, data: e.data });
}, true);
```

3. **收不到消息时**先核对两端 `location.origin` 是否逐字符一致（协议、端口最容易翻车）；
4. Performance 面板可录制 message 事件的派发耗时；DevTools 的 Event Listener Breakpoints 里勾选 Message 事件可在收信处断点。

## 6. 生态速览

不想手写封装时，有两个经过时间检验的库：

- **penpal**：面向 iframe 父子通信的 postMessage RPC，方法级同步 Promise API；
- **postmate**：Promise 化的 parent-child 通信库，API 更简。

选型建议：单一 iframe 场景两者都够用；多子应用（微前端）或需要多播、心跳时，本篇的手写封装更能贴合协议定制需求。

## 7. 练习

1. （必做）把 PostMessageRPC 跑起来：父页面与 iframe 各建实例，实现 `getTime`、`echo(text)` 两个方法；拔掉 iframe（`remove()`）后调用 `rpc.call`，验证 5 秒超时拒绝生效；
2. （必做）本地两个端口模拟双域，跑通 CrossDomainStorage 的 get/set；
3. （选做）给 TabAuthSync 增加"强制全员登出"：管理标签页广播 `FORCE_LOGOUT`，所有标签页（包括自己）清空状态；
4. （选做）把 PostMessageRPC 的 `call` 改造成支持并发上限（同时最多 5 个未完成请求），超出排队。

## 8. 下一步

- 基础概念回顾：`html5/280-CrossDocumentCommunication`；
- 同样的消息模型搬到后台线程：`html5/290-WebWorkers` 的 Comlink 就是 Worker 版的 RPC；
- 消息要跨越互联网到达服务器：`html5/320-WebSocket`。
