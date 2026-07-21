# 跨文档通信 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数 | `{ }` 分组 | `|` 或 | `...` 重复

---

## postMessage 基础

**发送消息**
`targetWindow.postMessage(<message>, <targetOrigin>, [transfer])`

```javascript
// 向 iframe 发送消息
const iframe = document.getElementById('myIframe');
iframe.contentWindow.postMessage(
  { type: 'GREETING', text: 'Hello' },
  'https://example.com' // 必须指定确切的目标源
);

// 向父窗口发送消息
window.parent.postMessage({ type: 'RESULT' }, 'https://parent.com');

// 向打开的弹窗发送消息
const popup = window.open('https://example.com/popup');
popup.postMessage({ type: 'INIT' }, 'https://example.com');
```

**接收消息**
`window.addEventListener('message', handler)`

```javascript
// 监听 message 事件
window.addEventListener('message', (event) => {
  // 始终验证消息来源
  if (event.origin !== 'https://example.com') return;

  console.log('来源:', event.origin);
  console.log('数据:', event.data);
  console.log('源窗口:', event.source);
});
```

**postMessage 参数表**

| 参数            | 类型           | 说明                                  |
| --------------- | -------------- | ------------------------------------- |
| `message`       | any            | 发送的数据(结构化克隆算法传递)       |
| `targetOrigin`  | string         | 目标源(`'*'` 不安全,应指定确切源)   |
| `transfer`      | Transferable[] | 可转移对象(如 MessagePort、ArrayBuffer)|

---

## MessageEvent 属性

**MessageEvent 对象表**

| 属性             | 类型     | 说明                            |
| ---------------- | -------- | ------------------------------- |
| `data`           | any      | 传递的数据                      |
| `origin`         | string   | 发送方的源(协议+域名+端口)    |
| `source`         | Window   | 发送方的 window 引用(可回复)  |
| `lastEventId`    | string   | 事件 ID(用于 Server-Sent Events) |
| `ports`          | array    | MessagePort 数组                |
| `isTrusted`      | boolean  | 是否由用户行为触发              |

---

## targetWindow 获取方式

**获取目标 window 引用**

```javascript
// 1. iframe 的 contentWindow
const iframeWindow = document.getElementById('myIframe').contentWindow;

// 2. 父窗口
const parentWindow = window.parent;

// 3. 顶层窗口
const topWindow = window.top;

// 4. window.open 返回的引用
const popupWindow = window.open('https://example.com');

// 5. 命名的 window(通过 window.name 获取)
// 已打开的 window 可通过 window.frames 访问
const frameWindow = window.frames[0]; // 按索引
const namedWindow = window.frames['frameName']; // 按名称
```

---

## 安全实践

**验证来源(必须)**
`if (event.origin !== '<expected-origin>') return;`

```javascript
// 接收消息时必须验证来源
window.addEventListener('message', (event) => {
  // 1. 验证来源
  const trustedOrigins = [
    'https://example.com',
    'https://sub.example.com'
  ];
  if (!trustedOrigins.includes(event.origin)) return;

  // 2. 验证数据格式
  if (typeof event.data !== 'object' || !event.data.type) return;

  // 3. 处理消息
  handleMessage(event.data);
});
```

**始终指定 targetOrigin**
`postMessage(<data>, '<确切源>')`

```javascript
// 安全:指定确切的目标源
iframe.contentWindow.postMessage(data, 'https://specific-domain.com');

// 危险:使用通配符(任何窗口都可拦截)
iframe.contentWindow.postMessage(data, '*'); // 不推荐!

// 危险:使用 '/'(仅同源,但易被误解)
iframe.contentWindow.postMessage(data, '/'); // 仅同源时使用
```

**回复消息**
`event.source.postMessage(<reply>, event.origin)`

```javascript
// 接收方回复发送方
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.com') return;

  // 处理消息后回复
  const reply = { type: 'REPLY', result: 'success' };
  event.source.postMessage(reply, event.origin);
});
```

---

## Channel Messaging API

**MessageChannel 创建**
`const channel = new MessageChannel()`

```javascript
// 创建双向通信通道
const channel = new MessageChannel();

// port1 留在当前窗口
channel.port1.onmessage = (e) => {
  console.log('收到回复:', e.data);
};

// port2 传递给 iframe
iframe.contentWindow.postMessage(
  { type: 'INIT_PORT' },
  'https://example.com',
  [channel.port2] // 转移 port2 的所有权
);
```

**iframe 接收端口并回复**
`event.ports[0].postMessage(<data>)`

```javascript
// iframe 内部接收并使用 port
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://parent.com') return;
  if (event.data.type !== 'INIT_PORT') return;

  // 获取传递过来的 port
  const port = event.ports[0];
  port.onmessage = (e) => {
    console.log('收到:', e.data);
  };

  // 通过 port 回复消息
  port.postMessage({ type: 'PORT_READY' });
});
```

**MessagePort 方法表**

| 方法                    | 说明                          |
| ----------------------- | ----------------------------- |
| `port.postMessage(d)`   | 发送消息                      |
| `port.onmessage`        | 监听消息                      |
| `port.start()`          | 启用消息分发(显式)          |
| `port.close()`          | 关闭端口                      |
| `port.onmessageerror`   | 监听消息错误                  |

---

## BroadcastChannel API

**广播通道(同源多标签页通信)**
`const channel = new BroadcastChannel('<name>')`

```javascript
// 创建广播通道(同源的所有标签页共享)
const channel = new BroadcastChannel('app_updates');

// 发送广播消息(所有监听同一通道的标签页都会收到)
channel.postMessage({ type: 'LOGOUT' });

// 接收广播消息
channel.onmessage = (event) => {
  console.log('收到广播:', event.data);
};

// 关闭通道
channel.close();
```

**BroadcastChannel 应用场景**

```javascript
// 示例:多标签页同步登录状态
const authChannel = new BroadcastChannel('auth');

// 标签页 A 中登出
function logout() {
  localStorage.removeItem('token');
  authChannel.postMessage({ type: 'LOGOUT' });
  window.location.href = '/login';
}

// 标签页 B、C 监听并同步登出
authChannel.onmessage = (event) => {
  if (event.data.type === 'LOGOUT') {
    window.location.href = '/login';
  }
};
```

---

## 跨源 iframe 通信

**父窗口 → iframe**
`iframe.contentWindow.postMessage(<data>, <origin>)`

```html
<!-- 父页面 -->
<iframe id="embed" src="https://embed.example.com/widget"></iframe>
<script>
  const iframe = document.getElementById('embed');
  iframe.addEventListener('load', () => {
    iframe.contentWindow.postMessage(
      { type: 'CONFIG', theme: 'dark' },
      'https://embed.example.com'
    );
  });
</script>
```

**iframe → 父窗口**
`window.parent.postMessage(<data>, <origin>)`

```javascript
// iframe 内部
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://parent.com') return;
  if (event.data.type === 'CONFIG') {
    applyConfig(event.data);
    // 通知父窗口配置已应用
    window.parent.postMessage({ type: 'CONFIG_APPLIED' }, 'https://parent.com');
  }
});
```

---

## 注意事项

- **origin 验证必须**:`message` 事件中必须验证 `event.origin`,否则会有 XSS 风险
- **targetOrigin 指定**:发送时必须指定确切目标源,避免使用 `'*'`
- **结构化克隆**:`postMessage` 数据通过结构化克隆算法传递,支持对象、数组、Map、Set 等
- **不可传递对象**:Function、DOM 节点、Window 等不能直接传递
- **Transferable Objects**:MessagePort、ArrayBuffer 等可通过 `transfer` 参数转移所有权
- **同源策略**:`BroadcastChannel` 仅在同源标签页之间工作
- **性能**:大对象通过 `postMessage` 传递时建议使用 Transferable Objects 避免拷贝
