# Web Workers 多线程

JavaScript 的主线程在同一时刻只能做一件事，任何超过几十毫秒的同步计算都会让演唱会页面的动画与交互"掉帧"。Web Workers 提供了真正的操作系统级并行：在独立线程中运行脚本，与主线程通过消息传递协作。本篇覆盖 Dedicated Worker 的基础与结构化克隆、Transferable 零拷贝传输、SharedArrayBuffer 共享内存、Atomics 同步原语、Worker 池与计算卸载模式，以及跨线程调试的实用技巧。

## 前置知识

- [事件循环进阶](/module/javascript/030-EventLoopDetailed)：理解主线程为何会被长任务阻塞。
- [ArrayBuffer 与 TypedArray](/module/javascript/024-ArrayBufferTypedArray)：二进制数据是 Worker 传输与共享内存的基础。
- [异步编程](/module/javascript/025-AsyncProgramming)：Worker 通信结果通常用 Promise 组织。

## 学习目标

- 能创建 Dedicated Worker 并解释 postMessage 的结构化克隆语义与限制。
- 能用 Transferable 转移 ArrayBuffer 所有权，说明零拷贝的代价。
- 能在 COOP/COEP 环境下使用 SharedArrayBuffer 实现主线程与 Worker 共享内存。
- 能使用 Atomics 完成原子读写与等待通知，避免数据竞争。
- 能按 CPU 核数实现 Worker 池，把批量计算切片并行。

## 一、为什么需要 Worker：别让主线程卡在计算上

主线程的职责是渲染与响应输入。假设购票页要实时渲染 44100Hz 的音频波形，单帧计算需要 80ms，帧率就会掉到 12fps 左右；列表里 1600 首歌的 BPM 分析同样会让页面假死。Web Workers 的解法是把这类纯计算搬进独立线程：主线程保持每帧数毫秒的响应能力，Worker 在后台慢慢算，算完把结果送回来。

```javascript
// 反例：主线程同步计算 2 秒，页面完全冻结
// for (let i = 0; i < 500_000_000; i++) { /* 波形采样 */ }

// 正解：把计算交给 Worker，主线程继续响应用户操作
const analyzer = new Worker('/js/analyzer.js'); // 参数是同源脚本地址
analyzer.postMessage({ type: 'analyze', sampleRate: 44100 });
analyzer.onmessage = (e) => renderWaveform(e.data.peaks); // 结果回到主线程
```

Worker 分为 Dedicated（专用，一对一通信）、Shared（共享，多页面共用，兼容性差）与 Service Worker（网络代理）三类。本篇聚焦最常用的 Dedicated Worker；Service Worker 的生命周期与缓存策略见模块内 Service Worker 与 PWA 一篇。

Worker 与主线程的通信是异步的，这恰好与事件循环模型契合：主线程把任务"寄"给 Worker，自己继续处理渲染与输入；Worker 完成后把结果作为一条消息排回主线程的任务队列。理解这一点后，"卸载计算"的设计就归结为两个问题：传什么数据过去（多大、能否转移），以及结果如何回传并配对（多任务时靠什么对号入座）。

## 二、Dedicated Worker 基础与结构化克隆

Worker 的全局对象是 `self`（DedicatedWorkerGlobalScope），没有 `window`、没有 DOM、不能直接操作页面元素。主线程与 Worker 之间只能通过 `postMessage` 传递数据，数据经过**结构化克隆**（structured clone）：传过去的是一份完整副本，两边的修改互不可见。

```javascript
// analyzer.js：Worker 侧代码，self 就是 Worker 的全局对象
self.onmessage = (e) => {
  const { type, sampleRate } = e.data;
  if (type !== 'analyze') return;

  // 重计算示例：对一秒的采样求波形峰值
  const peaks = [];
  for (let i = 0; i < sampleRate; i += 64) {
    peaks.push(Math.abs(Math.sin(i / 500) * 32767));
  }
  self.postMessage({ peaks }); // 克隆后送回主线程，两边各有一份
};
```

`self.onmessage = ...` 是最简洁的注册方式，等价的 `self.addEventListener('message', ...)` 支持注册多个监听器，适合把不同消息类型的处理拆分到不同模块。两种写法可以混用，但同一个消息只会被每个监听器各处理一次，混用时要避免重复响应。

结构化克隆支持对象、数组、Map、Set、Date、RegExp、ArrayBuffer、TypedArray 等绝大多数内置类型，但**不支持函数与 DOM 节点**，传它们会直接抛 `DataCloneError`；Error 对象虽可传递，但自定义字段会丢失。这意味着 Worker 适合"进原始数据、出结果数据"的纯函数式分工，而不是共享业务对象。

工程化项目中通常由打包器接管 Worker 脚本：Vite 支持 `new Worker(new URL('./analyzer.js', import.meta.url), { type: 'module' })` 的写法，把 Worker 纳入依赖图、热更新与内容哈希产物；Webpack 也有对应的 worker 内置语法。手写裸路径在开发环境可用，但在生产构建中会脱离打包体系，导致缓存失效策略与压缩优化双双失灵。

```javascript
// 结构化克隆的边界测试
const payload = {
  title: '千本樱',                // 字符串：可以克隆
  tags: new Set(['VOCALOID']),   // Set：可以克隆
  // play: () => {},             // 函数：抛 DataCloneError
  // panel: document.body,       // DOM 节点：抛 DataCloneError
};
analyzer.postMessage(payload);
```

如果 Worker 逻辑较复杂，可以用 `new Worker(url, { type: 'module' })` 创建模块 Worker，在 Worker 内部使用 `import` 引入工具函数，与主工程的 ESM 体系保持一致。

## 三、Transferable 与 SharedArrayBuffer

结构化克隆的代价是拷贝：传一个 100MB 的音频缓冲区，就要付出 100MB 的内存与复制耗时。对 ArrayBuffer 这类二进制数据，可以用 **Transferable（可转移对象）** 把所有权整体移交：零拷贝、瞬间完成，但转出方立即失去访问权。

```javascript
// Transferable：转移 ArrayBuffer 所有权，零拷贝但转出方"失明"
const buffer = new ArrayBuffer(1024 * 1024); // 1 MB 音频缓冲区
analyzer.postMessage(buffer, [buffer]);      // 第二个参数列出要转移的对象
console.log(buffer.byteLength);              // 0：主线程已不再拥有这块内存

// SharedArrayBuffer：两边共享同一块内存，不需要移交
const shared = new SharedArrayBuffer(1024);
const view = new Int32Array(shared);
view[0] = 42; // 主线程写入
analyzer.postMessage(shared); // 传引用而非副本，Worker 读到的就是 42
```

SharedArrayBuffer 在 2018 年 Spectre 漏洞后被浏览器默认禁用，如今必须让页面处于跨源隔离状态：响应头需要同时携带 `Cross-Origin-Opener-Policy: same-origin` 与 `Cross-Origin-Embedder-Policy: require-corp`。开发时通常在本地服务器统一配置这两个头，并注意它会连带要求所有跨域资源声明 CORS。SharedArrayBuffer 与 Transferable 的取舍是：小块、一次性数据用克隆即可；大块、一次性数据用转移；需要持续双向读写的热数据才用共享内存。

## 四、Atomics 同步原语

共享内存带来一个经典问题：两个线程同时读写同一位置时，操作可能交错，读到"写了一半"的状态。`Atomics` 提供原子操作，保证单次读改写不可分割，并提供跨线程的等待与通知机制。

```javascript
// 主线程与 Worker 共享同一个 32 位计数器
const shared = new SharedArrayBuffer(8);
const counter = new Int32Array(shared);

// Worker 侧（伪代码，放在 worker 脚本中执行）：
// Atomics.add(counter, 0, 1);    // 原子地 +1，不会出现"半写状态"
// Atomics.store(counter, 0, 0);  // 原子写入
// Atomics.notify(counter, 0);    // 唤醒主线程的 wait

// 主线程轮询读取进度
setInterval(() => {
  const done = Atomics.load(counter, 0); // 原子读取，与普通下标访问不同
  console.log(`Worker 已处理 ${done} 个音频分片`);
}, 1000);
```

常用 API 分三组：`load`/`store` 是原子的读与写；`add`/`sub`/`and`/`or`/`exchange`/`compareExchange` 是原子的读改写，适合计数器与自旋锁；`wait`/`notify` 让线程在某个位置上休眠与唤醒，避免忙轮询浪费 CPU。需要注意 Atomics 只作用于 TypedArray 视图，且 `wait` 在主线程不可用（主线程不能阻塞），等待通知模式一般只在 Worker 内使用。

```javascript
// Worker 侧：休眠等待主线程把任务编号写入 0 号槽位再开工
// Atomics.wait 会阻塞当前线程，因此只能出现在 Worker 内
if (Atomics.wait(taskCounter, 0, 0) === 'ok') {
  const taskId = Atomics.load(taskCounter, 0); // 原子读取任务编号
  processTask(taskId); // 被 notify 唤醒后执行，比轮询省电得多
}
```

## 五、Worker 池与计算卸载模式

单个 Worker 只能利用一个核。对可切片的批量任务（例如给曲库 1600 首歌计算 BPM），标准做法是建立 Worker 池：按 CPU 核数创建 Worker，把数据切片并行分发，最后合并结果——也就是"分而治之"（fan-out / fan-in）模式。

```javascript
// 分治：按 CPU 核数把 BPM 分析切片并行
const poolSize = Math.min(navigator.hardwareConcurrency || 4, 8);
const workers = Array.from({ length: poolSize }, () => new Worker('/js/bpm.js'));

function analyzeChunk(chunk) {
  return new Promise((resolve) => {
    // 找一个空闲 Worker；都忙时退化为复用第一个（保证不丢任务）
    const worker = workers.find((w) => !w.busy) ?? workers[0];
    worker.busy = true;
    worker.onmessage = (e) => {
      worker.busy = false;
      resolve(e.data); // 该分片的 BPM 列表
    };
    worker.postMessage(chunk); // 每个分片约 200 首歌
  });
}

// 切片派发，全部完成后合并
const chunks = splitIntoChunks(songList, poolSize);
const bpms = (await Promise.all(chunks.map(analyzeChunk))).flat();
```

切片粒度是个值得权衡的参数：切得越细，负载越均衡，但消息往返的开销占比越高；切得越粗，某个 Worker 提前跑完后只能干等。经验做法是切成核数的 2 到 4 倍，让每个 Worker 依次领取多份小任务，均衡与开销之间取得折中。

除了批处理，Worker 还有两种常见卸载模式。其一是"常驻服务型"：Worker 长期存活，接收主线程的流式请求（如音频解码、富文本 diff），用任务 id 把响应与请求配对封装成 Promise。其二是"用完即弃型"：一次性重计算结束后调用 `worker.terminate()` 立即销毁，适合低频的超大任务。选择的关键在于任务频率：高频任务养池，低频任务即建即毁。

任务配对是多 Worker 并存的必修课：多个请求的响应可能乱序返回，必须用自增 id 把 `postMessage` 与 `onmessage` 配对，否则会出现"演唱会 A 的波形渲染到了 B 的页面"这类串扰。配对逻辑通常封装在任务分发器内部，对业务代码暴露 Promise 接口即可。

## 六、与主线程通信的调试技巧

Worker 内的报错不会出现在主线程的 `window.onerror` 里，需要显式监听 `error` 与 `messageerror` 事件；DevTools 的 Sources 面板中每个 Worker 是独立线程，可以单独打断点，Console 输出也带有 Worker 名字标签。

```javascript
// 主线程侧兜底：Worker 内未捕获的错误会在这里出现
analyzer.onerror = (e) => {
  console.error(`Worker 出错 @ ${e.filename}:${e.lineno} - ${e.message}`);
};
analyzer.onmessageerror = () => {
  // 消息无法结构化克隆时触发（例如误传了函数）
  console.error('发送给 Worker 的消息不可克隆，请检查是否包含函数或 DOM');
};
```

调试建议有四条：第一，在 Worker 与主线程的消息入口统一打日志，注明方向与消息类型，通信时序一目了然；第二，用 `performance.mark`/`measure` 分别在两个线程计时，定位是计算慢还是传输慢；第三，怀疑克隆开销时，先用 Transferable 或缩小数据量做对照实验；第四，给 Worker 里的死循环加进度上报（定期 postMessage），既能画进度条，也能确认线程还活着。DevTools 的 Performance 面板会把 Worker 线程与主线程的火焰图并排展示，跨线程的任务交接在哪一段脱节，一目了然。

## 易错点与最佳实践

1. **在 Worker 中访问 DOM 或 window**。错误代码与修正：

```javascript
// analyzer.js
// const title = document.title;      // 反例：Worker 中没有 document，直接报错
// localStorage.setItem('k', 'v');    // 反例：同样不可用

// 修正：Worker 只做计算，DOM 读写通过消息委托给主线程
self.postMessage({ type: 'need-title' }); // 主线程收到后代查再回传
```

2. **用克隆传大数据导致卡顿**。`postMessage` 100MB 的 TypedArray 会触发整块拷贝。修正：`postMessage(buffer, [buffer])` 转移所有权，或改用 SharedArrayBuffer 共享；转出后不要再读原缓冲区。

3. **SharedArrayBuffer 在非隔离环境下不可用**。未配置 COOP/COEP 响应头时 `SharedArrayBuffer` 为 undefined。修正：本地开发与生产网关统一加上两个跨源隔离头，并在代码中做能力检测降级。

4. **忘记处理 AbortError 之外的异常路径**。Worker 加载失败（404、语法错误）只触发 `error` 事件，Promise 化的封装如果不监听该事件，调用方会永远 pending。修正：`new Promise` 中同时注册 `onmessage`、`onerror` 并在 `onerror` 中 reject。

5. **在 Worker 中做定时器精度假设**。后台标签页的 Worker 定时器可能被节流，倒计时类逻辑应以时间戳差值计算，而非累计 tick 次数。

## 本篇小结

- Worker 让纯计算离开主线程，页面渲染不再被长任务阻塞；主线程与 Worker 通过消息传递协作。
- postMessage 采用结构化克隆，数据是副本；函数与 DOM 不可传递，克隆大对象有明显开销。
- Transferable 移交 ArrayBuffer 所有权实现零拷贝；SharedArrayBuffer 提供共享内存但要求跨源隔离。
- Atomics 保证共享内存读写的原子性，并提供 wait/notify 线程协作原语，避免数据竞争。
- 批量任务用 Worker 池按核数切片并行；调试靠统一的错误监听、消息日志与双线程计时。

## 动手实践

1. **Promise 化的 Worker 封装**：实现 `runTask(worker, payload)`，返回 Promise 并支持任务 id 配对。思路：每个消息携带自增 id，维护一个 id 到 resolve 的映射，收到同 id 响应时兑现；同时监听 error 事件统一 reject。

2. **图片缩略图并行生成**：主线程把用户上传的 100 张演唱会照片（ImageBitmap 或 ArrayBuffer）交给 Worker 池缩放。思路：按核数切片，逐片 transfer 二进制数据，完成后 transfer 回主线程合成预览，注意比较克隆与转移两种方案的耗时差异。

3. **共享内存进度条**：主线程创建 SharedArrayBuffer 进度槽，Worker 每处理完一个分片就 `Atomics.add`，主线程每帧 `Atomics.load` 刷新进度条。思路：重点是理解"为什么不能用普通下标读写替代 Atomics"，可尝试先写非原子版本观察偶发的进度回退现象。
