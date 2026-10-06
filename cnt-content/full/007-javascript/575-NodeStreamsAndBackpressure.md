---
order: 650
title: Node.js Stream 流处理与背压
module: 'javascript'
category: 前端技术
difficulty: beginner
description: 从 570 性能篇拆出的 Stream 专篇：Readable/Writable/Transform/Duplex 四种流、pipe 与 pipeline 的错误传播、背压机制与 drain 事件、大日志文件逐行处理，附管线复杂度、RxJS 对比与背压治理案例。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Node.js Stream——Node 处理海量数据的统一抽象，与 Web Streams 同思想、不同 API。
- **解决什么问题**：一个 10GB 的日志文件读进内存会直接 OOM。流把数据切成小块流动，"处理速度"通过背压反向约束"读取速度"，内存占用恒定。
- **什么时候用到**：大文件读写、HTTP 请求体/响应体、日志收集、视频转码、数据库导出导入——Node 里凡是"数据太多一次装不下"的场合。
- **来历说明**：本篇由 [Node.js 性能优化](/javascript/570-NodeJsPerformanceOptimization) 拆分而来（原 2.2、3.3、4.3、5.3、6.4、8.4、12.1 七处），四种流、pipe/pipeline、drain 与大日志实例为本篇新增的基础教学。与 Web 版的对照见 [Web Streams 数据流](/javascript/455-WebStreamsDataFlow)。

## 0. 一句话理解

> Stream 是"传送带"：上游（Readable）放货，下游（Writable）取货，中间可以串几台机器（Transform）加工。下游取不动时拉一下传送带的闸（背压），货就不会堆在传送带上（内存）。

## 1. 四种流：Readable / Writable / Transform / Duplex

| 流类型 | 方向 | 你实现什么 | 典型例子 |
| :--- | :--- | :--- | :--- |
| Readable | 只出 | `_read()`：被要求时喂数据 | `fs.createReadStream`、HTTP 请求体 |
| Writable | 只进 | `_write(chunk, enc, cb)`：接住一块 | `fs.createWriteStream`、HTTP 响应体 |
| Transform | 进且变 | `_transform()`：进一块出一块 | zlib 压缩流、加密流、行解析 |
| Duplex | 进且出（两条独立通道） | `_read` + `_write` | TCP socket、WebSocket |

Transform 与 Duplex 都"能进能出"，区别在**进出有没有因果关系**：Transform 的输出是输入的加工结果（压缩流），Duplex 的进出互不相干（socket 收发是两回事）。

```javascript
const { createReadStream, createWriteStream } = require('node:fs');
const { createGzip } = require('node:zlib');

createReadStream('./app.log')   // Readable：文件变成块流
  .pipe(createGzip())           // Transform：每块压一块
  .pipe(createWriteStream('./app.log.gz')); // Writable：落盘
```

三行就是一个完整管线。注意 Node 的流 API 基于**回调与事件**，不是 Web Streams 的 Promise 协议——思想同源，接口两套，Node 17+ 可用 `stream/promises`（见文末附录）拿到 Promise 风格。

## 2. 背压与 drain：下游决定上游的速度

`write()` 的返回值被大多数教程忽略，它是背压的**手写入口**：

```javascript
const dst = createWriteStream('./out.txt');
const src = createReadStream('./in.txt', { highWaterMark: 64 * 1024 });

src.on('data', (chunk) => {
  const ok = dst.write(chunk);        // 返回 false = 下游缓冲已到 highWaterMark
  if (!ok) {
    src.pause();                      // 闸门：暂停上游读取
    dst.once('drain', () => src.resume()); // drain = 缓冲排空，恢复
  }
});
src.on('end', () => dst.end());
```

逐行看这段"手写背压"：`highWaterMark` 是缓冲上限（Readable 默认 64KB）；`write()` 返回 `false` 不是错误，而是"别再发了"的信号；`once('drain')` 用注册一次的监听器等缓冲排空。**漏掉这一整套会怎样**：读取速度 > 磁盘写入速度时，未写入的数据全堆在内存里，10GB 文件就是 10GB 内存。实际工程很少手写这段——`pipe` 与 `pipeline` 内置了它（下一节），但面试与排查都要求能写出来。

### 2.1 背压的形式化（承接自性能篇原 2.2 节）

设生产者产生数据速率 $r_p$（字节/秒），消费者处理速率 $r_c$。当 $r_p > r_c$ 时，缓冲区增长速率：

$$
\frac{dBuffer}{dt} = r_p - r_c > 0
$$

若无背压，缓冲区在 $t = \frac{Buffer_{max}}{r_p - r_c}$ 时溢出。Node.js Stream 通过 `highWaterMark` 阈值实现背压：

- 当内部缓冲达到 `highWaterMark` 时，`stream.write(chunk)` 返回 `false`。
- 生产者应监听 `'drain'` 事件后再继续写入。

形式化地，背压将 $r_p$ 限制为 $\min(r_p, r_c)$，使缓冲区保持稳定。

## 3. pipe 与 pipeline：错误传播的两种姿势

```javascript
// pipe：错误不传播——中间流出错，下游不知道，进程可能挂起
src.pipe(transform).pipe(dst);
src.on('error', (e) => { /* 只管到 src */ });
transform.on('error', (e) => { /* 还要单独管 transform */ });
dst.on('error', (e) => { /* 以及 dst */ });

// pipeline：一条语句管全链的错误与清理
const { pipeline } = require('node:stream/promises');
await pipeline(src, transform, dst); // 任何一环出错：reject + 全链自动 destroy
```

**为什么生产代码一律 pipeline**：`pipe` 不转发错误也不在出错时销毁链路——中间流抛错后，下游还挂着等数据，文件句柄不释放，这类"半死管线"在日志里只留下一个悬而未决的 Promise。`pipeline` 把"任何一环失败 → 全链销毁 → Promise reject"做成默认行为，第 7 节的反模式就是它的反面教材。

### 3.1 承接示例：大文件逐行处理的错误示范与正确示范（自性能篇原 4.3 节）

```javascript
// ============================================================
// 大文件逐行处理：正确处理背压
// ============================================================
const { createReadStream, createWriteStream } = require('node:fs');
const { createInterface } = require('node:readline');
const { Transform, pipeline } = require('node:stream');

// 错误示范：直接 readline + 处理函数，无背压
async function badPattern(inputPath, outputPath) {
  const rl = createInterface({
    input: createReadStream(inputPath),
    crlfDelay: Infinity
  });

  const output = createWriteStream(outputPath);
  for await (const line of rl) {
    // 若处理慢于读取速度，readline 内部缓冲会无限增长
    const processed = await expensiveProcess(line);
    output.write(processed + '\n'); // 不检查返回值
  }
  output.end();
}

// 正确示范：使用 pipeline + Transform
function goodPattern(inputPath, outputPath) {
  const transform = new Transform({
    // highWaterMark 控制内部缓冲上限
    highWaterMark: 1024 * 64,

    async transform(chunk, encoding, callback) {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (!line) continue;
        try {
          const processed = await expensiveProcess(line);
          this.push(processed + '\n');
        } catch (err) {
          callback(err);
          return;
        }
      }
      callback();
    }
  });

  // pipeline 自动处理背压与错误传播
  pipeline(
    createReadStream(inputPath),
    transform,
    createWriteStream(outputPath),
    (err) => {
      if (err) console.error('管线失败:', err);
      else console.log('处理完成');
    }
  );
}

async function expensiveProcess(line) {
  // 模拟耗时处理
  return new Promise(resolve => {
    setTimeout(() => resolve(line.toUpperCase()), 1);
  });
}

goodPattern('./input.txt', './output.txt');
```

注意正确示范里 `this.push()` 的返回值同样受 highWaterMark 约束——Transform 内部的背压由 pipeline 自动接管，这正是"不手写 drain"也不积压的原因。

## 4. 实例：大日志文件逐行处理

需求：扫描 10GB 访问日志，统计每个 IP 的请求次数，输出 Top 10。逐行 read 流 + 计数 Map：

```javascript
const { createReadStream } = require('node:fs');
const { createInterface } = require('node:readline');

async function topIps(path) {
  const counts = new Map(); // 键控集合的用武之地，见 javascript/075
  const rl = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,   // 兼容 Windows 的 \r\n 换行
  });
  for await (const line of rl) {          // readline 实现了异步迭代器
    const ip = line.split(' ')[0];
    counts.set(ip, (counts.get(ip) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}
```

内存恒定的原理：`readline` 每次只从流里拉一行，Map 里只有聚合结果（IP 数量级），与文件大小无关。**换用生成器思路的等价写法**（把"逐行"抽象成可复用的迭代逻辑）见 [生成器函数](/javascript/320-GeneratorFunctions) 的日志扫描一节——两篇是同一问题的两种答案：readline 适合"读文件"，生成器适合"自定义序列"。

## 5. 管线的复杂度账单（承接自性能篇 3.3）

设有 $k$ 个 Transform 流串联：

$$
\text{Pipeline} = Source \to T_1 \to T_2 \to \ldots \to T_k \to Sink
$$

每个元素的延迟：

$$
T_{elem} = \sum_{i=1}^{k} T_{T_i}
$$

吞吐量受最慢阶段约束：

$$
\text{Throughput} = \frac{1}{\max_i T_{T_i}}
$$

`stream.pipeline` 自动处理背压，避免任意阶段积压。

工程含义：管线加一环不是"加一点开销"而是**吞吐受最慢一环锁死**。优化方向是给最慢环节做并行（多进程/Worker 分片），而不是给快环节做微优化。

## 6. Stream 与 RxJS 对比（承接自性能篇 5.3）

| 维度 | Node.js Stream | RxJS Observable |
| --- | --- | --- |
| 内置支持 | 是 | 需安装 |
| 背压处理 | 自动（highWaterMark） | 需手动（bufferSize） |
| 惰性求值 | pull-based | push-based |
| 多播 | 不支持 | 支持（share、publish） |
| 错误传播 | 自动（pipeline） | 自动（catchError） |
| 学习曲线 | 中等 | 陡峭 |
| 包体积 | 0 | 280 KB |

一句话选型：处理**字节与文件**用 Stream（零依赖、与系统 IO 原生集成）；处理**事件序列的组合逻辑**（合并、防抖、节流成流）才轮到 RxJS。两者解决"随时间到达的数据"，但 Stream 的最小单位是块，RxJS 的最小单位是事件。

## 7. 反模式：Stream 错误未处理（承接自性能篇 6.4）

```javascript
// 反模式：未处理 'error' 事件，导致进程崩溃
const stream = fs.createReadStream('large.txt');
stream.pipe(transformStream).pipe(fs.createWriteStream('out.txt'));
// 任一流抛出 error 事件，整个进程崩溃

// 正确：使用 pipeline 自动处理错误
const { pipeline } = require('node:stream/promises');

async function copy() {
  try {
    await pipeline(
      fs.createReadStream('large.txt'),
      transformStream,
      fs.createWriteStream('out.txt')
    );
    console.log('完成');
  } catch (err) {
    console.error('管线失败:', err);
  }
}
```

## 8. 案例：日志收集服务的背压治理（承接自性能篇 8.4）

**背景**：某日志收集服务在流量高峰时，Kafka 生产者速率远超消费者，导致内存爆炸。

**改造**：

```javascript
// 反模式：无背压的 Kafka 生产
const producer = kafka.producer();

app.post('/log', (req, res) => {
  producer.send({
    topic: 'logs',
    messages: [{ value: JSON.stringify(req.body) }]
  });
  res.json({ ok: true });
});

// 改造：基于 Stream 的背压
const { Transform, pipeline } = require('node:stream');

class KafkaSink extends Transform {
  constructor(producer, options = {}) {
    super({ ...options, highWaterMark: 1000 }); // 1000 条缓冲
    this.producer = producer;
  }

  async _transform(chunk, encoding, callback) {
    try {
      await this.producer.send({
        topic: 'logs',
        messages: [{ value: chunk }]
      });
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

const sink = new KafkaSink(producer);

app.post('/log', (req, res) => {
  const canWrite = sink.write(JSON.stringify(req.body) + '\n');
  if (!canWrite) {
    // 背压：返回 429，让客户端重试
    return res.status(429).json({ error: '系统繁忙，请稍后重试' });
  }
  res.json({ ok: true });
});

sink.on('error', (err) => {
  console.error('Kafka Sink 错误:', err);
  // 触发熔断
});
```

**结果**：

- 内存峰值从 8GB 降至 500MB（受 highWaterMark 限制）。
- 流量高峰时返回 429，下游重试，保护系统稳定。
- P99 延迟从 1200ms 降至 80ms（背压下减少队列堆积）。

## 9. 动手实践

任务（先写，写完再展开参考实现）：

1. 手写背压版复制函数：用 `data`/`drain` 事件把一个大文件复制到另一个路径，不得使用 pipe/pipeline（第 2 节骨架的完形）。
2. 把第 1 题改成 pipeline + Transform：复制时把每行转大写。
3. 用 `readline` 统计一个文本文件的行数与最长行长度。
4. 故意在第 2 题的 transform 里抛一个错，验证 pipeline 的 reject 与进程退出码，再换回 pipe 观察差异。

提示：第 1 题别忘了 `src.on('end', () => dst.end())`；第 4 题观察"半死管线"时给程序加个 5 秒后强制退出的保险。

<details>
<summary>参考实现（先完成上面的任务再展开对照）</summary>

```javascript
// 1：手写背压复制
const { createReadStream, createWriteStream } = require('node:fs');
function copyWithBackpressure(from, to) {
  return new Promise((resolve, reject) => {
    const src = createReadStream(from);
    const dst = createWriteStream(to);
    src.on('data', (chunk) => {
      if (!dst.write(chunk)) {
        src.pause();
        dst.once('drain', () => src.resume());
      }
    });
    src.on('end', () => dst.end());
    dst.on('finish', resolve);
    const fail = (e) => { dst.destroy(); reject(e); };
    src.on('error', fail);
    dst.on('error', fail);
  });
}

// 2：pipeline + 大写 Transform
const { pipeline } = require('node:stream/promises');
const { Transform } = require('node:stream');
async function copyUpper(from, to) {
  const upper = new Transform({
    transform(chunk, enc, cb) {
      cb(null, chunk.toString().toUpperCase());
    },
  });
  await pipeline(createReadStream(from), upper, createWriteStream(to));
}

// 3：readline 统计
const { createInterface } = require('node:readline');
async function lineStats(path) {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let lines = 0;
  let longest = 0;
  for await (const line of rl) {
    lines += 1;
    longest = Math.max(longest, line.length);
  }
  return { lines, longest };
}

// 4：把 transform 的 cb 改为 cb(new Error('boom'))：
//   pipeline 版：await 处 reject，进程以非 0 退出（未捕获时）；
//   pipe 版：无任何输出、无报错，进程挂着——这就是"半死管线"。
```

</details>

## 附录：node:stream/promises 速查（承接自性能篇 12.1）

```javascript
const { pipeline } = require('node:stream/promises');

// Promise 风格的 pipeline
await pipeline(
  fs.createReadStream('input.txt'),
  gzip,
  fs.createWriteStream('output.txt.gz')
);
```

## 参考与致谢

- Node.js 官方文档：Stream 模块（MIT 等开源许可），https://nodejs.org/api/stream.html
- 本篇第 2.3、3.3、5、6、7、8 节与附录整体承接自仓库 570-NodeJsPerformanceOptimization 拆分前的对应小节；四种流、背压/drain 手写示例、pipeline 错误传播讲解、大日志实例与动手实践为新增内容。
