---
order: 440
title: fetch 与 AbortController
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: fetch 请求全解：流式读取、超时取消与错误语义。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'javascript/043-WebAPIBrowserInterface'
  - 'javascript/045-FetchApiWebStreams'
  - 'javascript/046-StorageForTheWeb'
prerequisites:
  - 'javascript/043-WebAPIBrowserInterface'
---

# fetch 与 AbortController

`fetch` 是浏览器发起 HTTP 请求的标准接口，它返回 Promise，并围绕 `Request` 与 `Response` 两个对象组织数据；`AbortController` 则为请求提供了统一的取消开关。本篇以虚拟歌手音乐平台的购票场景为例，讲清 fetch 的对象模型、响应体流式读取、取消与超时控制、容易被误读的错误语义，最后封装一个生产可用的可取消请求函数。

## 前置知识

- [Web API 与浏览器接口](/module/javascript/043-WebAPIBrowserInterface)：fetch 与 AbortController 都是宿主环境提供的 Web API。
- [fetch 与 Web Streams](/module/javascript/045-FetchApiWebStreams)：响应体流式读取依赖 ReadableStream 概念。
- [网络存储](/module/javascript/046-StorageForTheWeb)：请求结果常与本地缓存策略配合使用。

## 学习目标

- 能描述 fetch、Request、Response 三者的关系，并知道 Response 只能读取一次。
- 能用 `response.body.getReader()` 分块读取大文件并计算下载进度。
- 能用 AbortController 实现手动取消与超时取消，并正确区分 AbortError 与网络错误。
- 能解释"fetch 只在网络层失败时 reject"的错误语义，避免吞掉 404/500。
- 能封装一个集状态检查、超时、最新请求自动取消于一体的请求函数。

## 一、fetch 基础：Request 与 Response 对象

`fetch(input, init)` 的第一个参数可以是 URL 字符串，也可以是一个 `Request` 实例；返回的 Promise 在响应头到达时即兑现，此时响应体可能还在传输中。`Response` 对象提供状态信息（`status`、`ok`、`headers`）与多种消费方式：`json()`、`text()`、`blob()`、`arrayBuffer()` 以及底层的 `body` 流。相比被它取代的 XMLHttpRequest，fetch 的回调层级更浅、与 Promise 及 Service Worker 的契合度更高，也是理解现代前端网络层的入口。`Request` 实例的价值在于可复用：同一个请求对象可以被多次 fetch（配合各自的 signal），也可以脱离调用点独立构造与测试。

```javascript
// 用 Request 对象描述一次"查询演唱会余票"的请求
const request = new Request('https://api.fandex.dev/concerts/42/tickets', {
  method: 'GET',
  headers: { Accept: 'application/json' },
});

const response = await fetch(request);
console.log(response.status, response.ok); // 200 true（ok 表示状态码在 200-299）

// Response 是一次性对象：body 只能读一次
const data = await response.json();
console.log(`剩余票数：${data.remaining}`);
// await response.json(); // 再读一次会抛 TypeError: body stream already read
```

"body 只能读一次"是最常踩的坑之一：如果既想打印日志又想解析 JSON，需要先调用 `response.clone()` 获得一个可以独立消费的副本。

fetch 的第二个参数 init 汇集了请求的全部配置：`method` 指定 HTTP 动词，`headers` 携带头部，`body` 承载请求体，`credentials` 决定是否携带 Cookie，`cache` 与 `mode` 分别控制缓存策略与跨域语义。购票提交这类 POST 请求需要显式序列化 JSON 并声明 Content-Type：

```javascript
// POST 提交购票请求：JSON 序列化 + 显式声明 Content-Type
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ concertId: '42', zone: 'S 区', count: 2 }),
});

if (!response.ok) throw new Error(`下单失败：HTTP ${response.status}`);
const order = await response.json();
console.log(`下单成功，订单号 ${order.orderId}`);
```

## 二、响应体流式读取

演唱会现场直拍视频、全曲库打包下载这类大资源，如果等全部下载完才给用户反馈，体验会非常差。`response.body` 是一个 ReadableStream，可以用 reader 分块拉取，边下载边更新进度：

```javascript
// 流式下载演唱会直拍视频，边下载边输出进度
const response = await fetch('/videos/magical-mirai-2026.mp4');
const total = Number(response.headers.get('Content-Length')) || 0;
const reader = response.body.getReader();

let received = 0;
while (true) {
  const { done, value } = await reader.read(); // value 是 Uint8Array 分块
  if (done) break;
  received += value.byteLength;
  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  console.log(`已下载 ${mb(received)}${total ? ` / 共 ${mb(total)}` : ''}`);
}
console.log('下载完成');
```

这段"手动拉流"的写法是理解响应体本质的最佳途径：`json()`、`text()` 等便捷方法只是"读完整个流并解析"的快捷方式，底层一律是同一个 ReadableStream。掌握 reader 循环后，模块内 Web Streams 一篇中的管道变换、跨流对接等内容都会变得顺理成章；自定义进度条、断点续传记录偏移量等需求也都建立在这个循环之上。

分块数据是二进制的 `Uint8Array`；如果内容是文本（例如直播弹幕流），可以用 `TextDecoder` 的流式模式把块安全地解码成字符串。流式读取还让"边下边播、边下边渲染"成为可能，这也是许多播放器实现的首选路径。

```javascript
// 文本流解码：直播弹幕按块到达，用 stream 模式避免拆散多字节字符
const reader = (await fetch('/live/danmaku')).body.getReader();
const decoder = new TextDecoder('utf-8');
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // stream: true 让跨块被截断的多字节字符在下一次解码时自动补全
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop();          // 末段可能不完整，留到下一块再处理
  lines.forEach((line) => renderDanmaku(line));
}
```

## 三、AbortController：取消与超时

用户切换演唱会、关闭弹窗、输入新关键词时，上一批在途请求已经没有意义，不仅浪费流量，还可能让旧响应晚到并覆盖新结果。`AbortController` 通过 `signal` 把"取消开关"交给 fetch：

```javascript
// 最新请求获胜：新一轮搜索会取消上一次仍在途中的请求
let controller = null;

async function searchSongs(keyword) {
  controller?.abort(); // 取消上一次搜索
  controller = new AbortController();

  try {
    const res = await fetch(`/api/songs?q=${encodeURIComponent(keyword)}`, {
      signal: controller.signal, // 把取消开关挂到本次请求上
    });
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('旧搜索已取消，忽略即可'); // 主动取消不是失败
      return [];
    }
    throw err; // 网络错误等其他异常照常上抛
  }
}
```

超时本质上是"由定时器代替用户执行 abort"。现代浏览器提供了现成的 `AbortSignal.timeout(ms)`，不需要手写 `setTimeout`；如果需要同时支持"手动取消"与"超时"，可以用 `AbortSignal.any` 把多个信号合并：

```javascript
// 秒杀开票瞬间服务器可能拥堵，10 秒拿不到结果就放弃
const res = await fetch('/api/flash-sale/tickets', {
  signal: AbortSignal.timeout(10_000), // 到时自动 abort，抛出 TimeoutError
});

// 手动取消 + 超时二合一：任一信号触发即中止请求
function abortableFetch(url, timeoutMs) {
  const controller = new AbortController();
  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(timeoutMs),
  ]);
  return { promise: fetch(url, { signal }), cancel: () => controller.abort() };
}
```

signal 与 controller 的关系值得强调：一个 controller 只能 abort 一次，但它的 signal 可以同时挂到多个请求上——`controller.abort()` 会一次性取消所有使用该信号的请求。这正好适合"离开购票页时撤销整批在途请求"的场景：整批请求共享同一个 signal，组件卸载回调里一行 `controller.abort()` 即可全部撤回。

## 四、错误语义与 HTTP 状态陷阱

fetch 的 Promise 只在**网络层失败**（断网、DNS 解析失败、被 CORS 拦截、请求被 abort）时 reject；HTTP 404、500 等状态码依然会正常兑现。也就是说，"进入了 then 不代表业务成功"。必须显式检查 `response.ok` 或 `status`：

```javascript
// 加载演唱会详情：先检查状态，再消费响应体
async function loadConcert(id) {
  const res = await fetch(`/api/concerts/${id}`);

  if (!res.ok) {
    // ok 为 false 时状态码在 200-299 之外，例如 404、500
    throw new Error(`加载演唱会失败：HTTP ${res.status}`);
  }
  return res.json();
}

loadConcert('42').catch((err) => {
  // 只有网络错误与上面手动抛出的错误会进入这里
  showRetryButton(err.message);
});
```

一个反直觉的细节是：收到 404 后 `response.json()` 可能仍然成功（很多接口的错误响应也是 JSON）。如果先 `json()` 再判断状态，错误信息会被当作正常数据流进应用层，出现"界面显示一堆 undefined"的怪象。固定顺序应是：**先看 ok，再读 body**。

跨域配置错误在 fetch 中的表现同样是 reject，错误信息为 `TypeError: Failed to fetch`，与断网、DNS 失败的表象完全一致。排查时不要盲目重试，先打开 Network 面板确认请求是否被 CORS 策略拦截：预检请求（OPTIONS）失败、响应缺少 `Access-Control-Allow-Origin` 头，都会以这种"伪装成网络故障"的形式出现。

重试策略也要按状态码区分：404 表示资源不存在，重试没有意义；429 与 5xx 表示暂时性故障，配合指数退避的重试才有价值；401 交给统一的鉴权刷新逻辑。把"哪些状态码可重试、重试几次、间隔多少"写进封装的配置项，是请求层从"能用"走向"成熟"的标志之一。

## 五、封装一个可取消请求函数

把前四节的知识组合起来：统一的状态检查、超时控制、最新请求自动取消。封装成一个小工具后，购票页的每次查询都会自动作废上一次请求：

```javascript
// 封装：带状态检查 + 超时 + 最新请求自动取消的 GET 工具
function createLatestGet(timeoutMs = 8000) {
  let current = null; // 记录"当前有效"的那次请求的控制器

  return async function get(url) {
    current?.abort();              // 新请求到来，作废旧请求
    current = new AbortController();

    // 合并"手动取消"与"超时"两个信号，任一触发即中止
    const signal = AbortSignal.any([
      current.signal,
      AbortSignal.timeout(timeoutMs),
    ]);

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`请求失败：HTTP ${res.status}`);
    return res.json();
  };
}

const getTickets = createLatestGet();
getTickets('/api/concerts/41/tickets'); // 用户切换场馆时
getTickets('/api/concerts/42/tickets'); // 第一次请求被自动取消，只有这次结果生效
```

封装时还有两点值得顺手处理：其一，给调用方保留主动取消的能力（返回带 `cancel` 的对象或接受外部 signal）；其二，把 AbortError 归一化为可识别的错误类型，避免上层把"用户主动取消"当成失败弹出报错弹窗。如果团队同时有 POST 场景，可以把同样的骨架推广为 `createLatestRequest`：把请求方法与请求体一并纳入参数，取消与超时逻辑完全复用。封装的边界也要守住——它只负责"传输层的横切关注点"，鉴权头注入、响应 schema 校验这类业务性逻辑应放在各自的层里，保持每层可独立测试。如果调用方还需要把自己的取消信号并入（例如路由离开时统一撤销），封装应预留 signal 参数，用 `AbortSignal.any` 把内部信号与外部信号合并后传给 fetch，三层取消（外部路由、内部最新请求、超时）互不冲突。取消体系一旦分层清晰，"请求发出去了但没人要结果"的资源浪费与状态错乱就都有了系统性出口。

## 易错点与最佳实践

1. **Response body 只能读一次**。错误代码与修正：

```javascript
const res = await fetch('/api/concerts/42');
// await res.json(); console.log(await res.text()); // 反例：第二次读取直接抛错

// 修正：先 clone 出副本，两个 body 各自独立消费
const copy = res.clone();
console.log(await res.json(), await copy.text());
```

2. **以为 catch 能接住 404/500**。fetch 只在网络层失败时 reject，HTTP 错误状态需要用 `res.ok` 显式判断后手动抛出，否则错误数据会静默进入业务层。

3. **把 AbortError 当作真正的异常处理**。用户主动取消或超时触发的 `AbortError`（超时为 `TimeoutError`）不应弹错误提示、不应计入失败埋点，应按名字识别后静默处理。同时注意取消后的界面收尾：如果请求前把按钮置为"加载中"，取消路径也要把状态复位，否则界面会永远停在等待态。

4. **拼接 URL 时不做编码**。搜索关键词、歌曲名可能包含空格、中文或 `&` 等字符，必须用 `encodeURIComponent(keyword)` 编码查询参数，否则请求会被拆解成完全不同的语义。这一点在服务端同样成立：拼接行为要有统一的查询串构建函数，而不是在每个调用点手写模板字符串。

5. **信号对象跨请求复用**。一个 `AbortController` 只能 abort 一次，重复使用会让后续请求一开始就处于取消状态；应当为每次请求创建新的控制器。

6. **POST JSON 请求体未声明 Content-Type**。`body: JSON.stringify(data)` 只负责序列化，服务端拿到的是一串无法识别的文本。修正：init 中显式携带 `headers: { 'Content-Type': 'application/json' }`，让服务端按 JSON 解析请求体。

## 本篇小结

- fetch 以 Request 描述请求、以 Response 表达结果；响应头先到、响应体异步到达，body 是一次性流。
- 大资源用 `response.body.getReader()` 分块读取，可实时计算进度；文本流配合 `TextDecoder` 解码。
- AbortController 为请求提供取消开关；`AbortSignal.timeout` 实现超时，`AbortSignal.any` 组合多路取消。
- fetch 只在网络层失败时 reject，业务成败必须检查 `response.ok`，先判状态再读 body；重试策略按状态码分类才有意义。
- 封装统一的请求工具可以把状态检查、超时、最新请求获胜这三个模式沉淀为团队默认实践。

## 动手实践

1. **带进度条的下载器**：实现 `downloadWithProgress(url, onProgress)`，在流式读取中把百分比回调给调用方。思路：`Content-Length` 提供 total，`received` 累加得到 loaded，注意服务器可能不返回该头部，此时退化为"已下载字节数"展示；进阶可以把 reader 循环放进 Worker，验证大文件下载期间主线程的动画帧率是否稳定。

2. **搜索联想的防抖与取消结合**：在输入框上实现"停止输入 300ms 后才请求，且新请求自动取消旧请求"。思路：`setTimeout` 延迟发请求，配合本篇 `createLatestGet` 的取消逻辑；思考为什么"取消"不能完全替代"防抖"——前者回收结果，后者减少请求次数，二者关注点不同。

3. **并发限流的批量拉取**：需要为 20 场演唱会拉取余票，但要求最多同时 4 个在途请求，且页面离开时全部取消。思路：用信号量或分批 `Promise.all` 控制并发，把同一个 `AbortController.signal` 传给所有请求，`controller.abort()` 一次即可整体撤回。
