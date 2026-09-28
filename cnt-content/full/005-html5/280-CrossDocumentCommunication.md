---
order: 280
title: 跨文档通信
module: 'html5'
category: 前端技术
difficulty: intermediate
description: 用 postMessage 打通 iframe、弹窗与多标签页：同源策略为何存在、targetOrigin 的安全语义、四道校验防线、MessageChannel 私有管道与 BroadcastChannel 广播，附真实案例（YouTube/Stripe/OAuth）。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'html5/281-PostMessageRpcPatterns'
  - 'html5/340-CustomDataAttribute'
  - 'html5/270-HistoryAPI'
  - 'html5/320-WebSocket'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

## 前置知识

- [HTML5 概述与核心特性](/html5/020-HTML5OverviewCoreFeature)
- 事件监听与异步基础（`javascript/001`-`005`、`javascript/039`）。本篇所有示例都是事件驱动。

> **警告：未学完 JavaScript 基础之前，第一遍请直接跳过本篇**，先按 005 的路线图走完主线；跨文档通信的全部示例都依赖事件与异步。

## 1. 场景切入：你每天都在用它的页面

打开任何一个带视频的教程页：页面里嵌的 YouTube 播放器是一个 iframe，里面装着另一个网站（youtube.com）的文档。你点页面上的"播放"按钮，命令却要传进那个 iframe 里去——**两个不同源的文档，凭什么能说话？**

同样的故事还有：支付页里嵌入的 Stripe 表单（卡号绝不能经过你的服务器，却要在页面里呈现和交互）、登录时的第三方授权弹窗（授权码要从弹窗传回主页面）、以及"页面里嵌一个第三方客服 widget"。这些都是**同源策略**故意挡住的门，而 HTML5 给了这扇门一把受控的钥匙：`postMessage`。

本篇学完你能做出：一个父页面和一个 iframe 互发消息并带完整安全校验的演示，并看懂真实世界的 YouTube/Stripe/OAuth 是怎么用同一套 API 的。

## 2. 先懂门为什么关着：同源策略

浏览器规定：两个文档只有在**协议 + 域名 + 端口**三者完全一致时才是"同源"，同源之间才能随便读对方的 DOM、Cookie、storage。不同源？`iframe.contentDocument` 返回 `null`，脚本访问直接报错。

| URL A | URL B | 是否同源 | 原因 |
| --- | --- | --- | --- |
| `https://a.com/x` | `https://a.com/y` | 是 | 三元组一致 |
| `https://a.com` | `http://a.com` | 否 | 协议不同 |
| `https://a.com` | `https://a.com:8443` | 否 | 端口不同（443 vs 8443） |
| `https://a.com` | `https://b.a.com` | 否 | 域名不同（子域也算不同源） |

这套限制1995 年 JavaScript 诞生时并不存在，跨域脚本攻击频发后才被 Netscape 引入，如今是 Web 安全的地基。但需求确实存在（嵌 widget、OAuth 弹窗），历史上出现过一堆 hack：URL hash 轮询（容量小）、`window.name` 桥接（要中间页清场）、JSONP（仅 GET 且有 XSS 风险）、`document.domain` 降级（Chrome 109 起已废弃，别再学旧教程用它）。

`postMessage` 的意义：**把"偷偷翻墙"变成"双方显式同意的邮局"**。发送方明确指定投递给哪个源，接收方校验信封上的来源，异步、可审计。

## 3. 动手：父子页面互发消息

需要两个文件，用 Live Server 或 `npx serve` 起本地服务后打开父页面。

**父页面 `parent.html`：**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>父页面</title>
  <style>
    iframe { width: 100%; height: 160px; border: 1px solid #ccc; border-radius: 8px; }
    body { font-family: system-ui, sans-serif; max-width: 560px; margin: 32px auto; }
    #log { background: #f6f8fa; padding: 12px; min-height: 60px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h2>主题设置面板</h2>
  <iframe id="child" src="child.html" title="预览卡片"></iframe>
  <button id="btn">把暗色主题发给 iframe</button>
  <pre id="log"></pre>

  <script>
    const iframe = document.getElementById('child');
    const log = document.getElementById('log');
    // 本机演示同源，生产中这里写 iframe 的真实源
    const CHILD_ORIGIN = location.origin;

    window.addEventListener('message', (event) => {
      // 防线一：来源校验。没有这一行，任何页面都能指挥你
      if (event.origin !== CHILD_ORIGIN) return;
      // 防线二：数据结构校验
      if (typeof event.data !== 'object' || event.data.type !== 'APPLIED') return;

      log.textContent += 'iframe 回执：主题已应用\n';
    });

    document.getElementById('btn').addEventListener('click', () => {
      iframe.contentWindow.postMessage(
        { type: 'SET_THEME', theme: 'dark' },
        CHILD_ORIGIN            // 明确投递目标，不写 '*'
      );
    });
  </script>
</body>
</html>
```

**iframe 内的 `child.html`：**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>预览卡片</title>
  <style>
    body { font-family: system-ui, sans-serif; transition: background .3s, color .3s; }
    body.dark { background: #1b1f24; color: #39C5BB; }
  </style>
</head>
<body>
  <p>这里是 iframe 里的预览卡片</p>
  <script>
    window.addEventListener('message', (event) => {
      if (event.origin !== location.origin) return;       // 同样要校验
      if (event.data?.type !== 'SET_THEME') return;

      document.body.classList.toggle('dark', event.data.theme === 'dark');

      // 用 event.source 回信：比 window.parent 更稳（不依赖层级关系）
      event.source.postMessage({ type: 'APPLIED' }, event.origin);
    });
  </script>
</body>
</html>
```

动手清单：

1. 点按钮，iframe 变暗色，父页面收到回执；
2. 故意把父页面的 `CHILD_ORIGIN` 改成 `'https://example.com'` 再点：消息被浏览器丢弃，iframe 毫无反应——这就是 targetOrigin 在替你把关；
3. 把 child 里的 `event.origin` 校验注释掉，另开一个恶意页面（向 iframe 发伪造消息）体会防线一的作用。

## 4. 讲为什么：一封信、两个地址、四道防线

### 4.1 API 的形状

发送：`targetWindow.postMessage(message, targetOrigin, transfer?)`。三个要素：**寄给哪个窗口、写明哪个源、随信附什么端口**。

接收窗口怎么拿到？五种常见来源：

```javascript
iframeEl.contentWindow;            // iframe 的窗口
window.parent;                     // 父窗口（iframe 内用）
window.top;                        // 最顶层窗口
window.open('...');                // 弹窗的窗口引用
window.frames[0];                  // frames 集合按索引/名称取
```

接收：`message` 事件。事件对象里你真正用得到的四个字段：

| 属性 | 说明 |
| --- | --- |
| `event.data` | 信的内容（经结构化克隆，对象/数组/Map/Set 都能传） |
| `event.origin` | **发送方**的源，格式 `协议://域名:端口`（默认端口省略） |
| `event.source` | 发送方的 window 引用，回信就用它 |
| `event.ports` | 随信附带的 MessagePort 数组（见第 6 节） |

### 4.2 targetOrigin 不是"填我自己的源"

新手最常见的误解是把 targetOrigin 当成"声明我是谁"。它是**收件地址**：浏览器只把消息投递给当前源恰好等于它的窗口。三种写法的安全语义完全不同：

```javascript
win.postMessage(data, 'https://app.example.com'); // 正确：只投递给这个源
win.postMessage(data, '*');                        // 危险：谁持有这个窗口谁就能收
win.postMessage(data, '/');                        // 仅同源时可用，语义易被误读，少用
```

为什么 `'*'` 危险？你拿着 `window.open()` 返回的引用发消息时，那个窗口随时可能被导航到别的网站（重定向、用户操作），`'*'` 意味着接力棒传到谁手上都能拆信。含敏感数据的消息永远写确切源；唯一合理用 `'*'` 的场景是"目标源未知且内容完全公开"的初次握手。

### 4.3 接收方四道防线

`message` 事件是**全局**的——页面上任何窗口发给你的消息都会到达同一个监听器，所以接收端必须自带安检流程：

1. **来源白名单**：`event.origin` 与预置列表精确比对，不过就丢弃；
2. **结构校验**：`typeof event.data === 'object'`、必要字段存在且类型正确；
3. **类型白名单**：只处理约定好的 `type` 集合，其余一律忽略；
4. **输出消毒**：消息内容渲染用 `textContent`；非要用 HTML 就过 DOMPurify，永远不要 `innerHTML` 直塞——这就是 XSS。

发送方与接收方同时设防，才是完整的信任链：targetOrigin 保证"信只到该收的人手里"，origin 校验保证"我只拆认识的人的信"。

## 5. 进阶一：MessageChannel，开一条不打扰别人的专线

全局 `message` 监听就像小区广播：谁都能听见，监听器越挂越多，调试时根本分不清哪条消息是谁发的。`MessageChannel` 提供一对一私有管道——两个端口（`port1`/`port2`）连在一起，从一头塞进去的消息只从另一头出来：

```javascript
// 父页面
const channel = new MessageChannel();
channel.port1.onmessage = (e) => console.log('子端回话：', e.data);

iframe.addEventListener('load', () => {
  // 把 port2 装进信封寄给 iframe（transfer 转移所有权，零拷贝）
  iframe.contentWindow.postMessage(
    { type: 'INIT_PORT' },
    CHILD_ORIGIN,
    [channel.port2]
  );
});
```

```javascript
// iframe 内：从 event.ports 里取出端口
window.addEventListener('message', (event) => {
  if (event.data?.type !== 'INIT_PORT') return;
  const port = event.ports[0];
  port.onmessage = (e) => console.log('父端来话：', e.data);
  port.start();                     // 用 onmessage 属性时会自动 start；显式写更稳
  port.postMessage({ type: 'PORT_READY' });
});
```

用完 `port.close()` 关闭。Stripe 的支付 iframe 用的就是这套模式：握手一次、专线长连。端口的厉害之处还在于**可以转寄**——把 A 的端口装进消息发给 B，A 和 B 就能绕过你直接通信（Worker 协作、多级 iframe 都靠这个）。

## 6. 进阶二：BroadcastChannel，同源标签页的群聊

"用户在 A 标签页退出登录，B、C 标签页怎么同步？"这是 BroadcastChannel 的主场：同源的所有上下文（标签页、iframe、Worker）订阅同名频道，一人发言全员收到：

```javascript
const auth = new BroadcastChannel('auth');

auth.onmessage = (e) => {
  if (e.data.type === 'LOGOUT') redirectToLogin();   // 其他标签页
};

function logout() {                                   // 当前标签页
  localStorage.removeItem('token');
  auth.postMessage({ type: 'LOGOUT' });
  redirectToLogin();
}
```

三条边界要记住：

- **只限同源**，跨源请回到 postMessage；
- 消息**不会**发给发送者自己（A 发的消息 A 收不到）；
- 数据走结构化克隆，不像 localStorage 的 `storage` 事件那样要手动 JSON 往返。老旧环境兜底才用 `storage` 事件，2026 年它是"仅当 Polyfill"的角色。

## 7. 真实世界怎么用

三个你天天见到的实现，都只用了本篇的 API：

**YouTube IFrame Player**：页面与播放器 iframe 之间互发 JSON 消息实现"外部按钮控制播放"：

```javascript
player.contentWindow.postMessage(
  JSON.stringify({ event: 'command', func: 'playVideo' }),
  'https://www.youtube.com'
);
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://www.youtube.com') return;
  const msg = JSON.parse(e.data);
  if (msg.event === 'onStateChange') updateUI(msg.info);
});
```

**OAuth 弹窗回传授权码**：回调页通过 `window.opener` 把 code 寄回主页面，弹窗随即自关：

```javascript
// callback.html（授权域下）
if (window.opener && !window.opener.closed) {
  window.opener.postMessage({ type: 'OAUTH_TOKEN', code }, 'https://app.example.com');
}
```

**微前端与嵌入 widget**：主应用与子应用用约定协议互发路由/主题消息；本模块 `html5/220-EmbeddedContent` 里的 iframe 基础是它们的前置。

## 8. 坑点自检

| 现象/风险 | 原因 | 修法 |
| --- | --- | --- |
| 收不到消息 | targetOrigin 与目标实际源不一致 | 打印双方 `location.origin` 核对（协议、端口都要一致） |
| 消息处理逻辑被打触发 | 没校验 `event.origin`，任意页面都能发 | 白名单比对，第一道防线永不省略 |
| `'*'` 发敏感数据 | 窗口可能被导航接管 | 含敏感内容必须写确切源 |
| 页面被注入脚本 | 消息内容 `innerHTML` 直塞 | `textContent` 或 DOMPurify |
| 多对通信互相串台 | 全局 message 大锅饭 | 用 MessageChannel 私有管道 |
| 鼠标一动就狂发消息 | 高频事件逐条 postMessage | `requestAnimationFrame` 里攒一批再发 |
| 传 1 MB 数据明显卡 | 结构化克隆在深拷贝 | `transfer` 第三参转移 ArrayBuffer/MessagePort |
| Function/DOM 节点传不过去 | 结构化克隆不支持的类型会抛 DataCloneError | 只传可序列化数据；DOM 操作各自做 |
| iframe 拖慢首屏 | 同步加载了第三方嵌入 | `loading="lazy"` + `sandbox` 最小权限 |

关于 `sandbox`，一条重要组合拳：`sandbox="allow-scripts allow-same-origin"` 同时给第三方 iframe 等于基本没设防（它能摘掉自己的沙箱），嵌入不可信内容时避免这个组合。

## 9. 练习

1. （必做）完成第 3 节演示，并追加功能：iframe 加载完成后主动发 `READY`，父页面收到后才点亮按钮（握手模式）；
2. （必做）用 BroadcastChannel 实现多标签页主题同步：任一标签页切换亮暗，其余全部跟随（提示：`localStorage` 存偏好 + 广播通知变更）；
3. （选做）给父页面与 iframe 升级为 MessageChannel 专线：按钮点击走专线请求"当前时间戳"，iframe 回复，对比全局消息的调试体验；
4. （选做）复刻 OAuth 流程：本地起两个不同端口（如 `:3000` 与 `:4000`）模拟两个源，`window.open` + `window.opener.postMessage` 完成授权码回传。

## 10. 下一步

- 要把本篇的安全四防线封装成带超时、请求 ID、Promise 化的 RPC 工具类？完整实现（PostMessageRPC、跨域存储代理、多标签登录同步器）拆到了姊妹篇：`html5/281-PostMessageRpcPatterns`；
- iframe 与嵌入内容的 HTML 层面知识：`html5/220-EmbeddedContent`；
- 消息要跨网络实时往返：`html5/320-WebSocket` 是浏览器与服务器之间的"postMessage"。
