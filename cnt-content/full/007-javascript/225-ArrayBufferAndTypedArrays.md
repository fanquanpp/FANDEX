---
order: 260
title: ArrayBuffer 与类型化数组
module: 'javascript'
category: 前端技术
difficulty: beginner
description: 以读取图片头与解析 WAV 为例，掌握 ArrayBuffer、类型化数组与 DataView，以及它们在 Worker 传输中的角色。
author: fanquanpp
updated: '2026-09-29'
related: []
prerequisites: []
---

# ArrayBuffer 与类型化数组

## 场景：用户上传的"图片"真是图片吗

做上传功能，有人把 `virus.exe` 改名成 `cat.png` 就想混进来。扩展名不可信，Content-Type 也是客户端随便填的。可靠的判据是文件头（magic bytes）：PNG 文件的前 8 个字节固定是 `89 50 4E 47 0D 0A 1A 0A`。要在字节层面读文件，就需要本篇的主角。

```javascript
// <input type="file"> 拿到 File 后，读成 ArrayBuffer
const file = input.files[0];
const buf = await file.arrayBuffer();

const head = new Uint8Array(buf, 0, 8);
const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
console.log(isPng); // 真正由字节说了算
```

顺手把 PNG 的宽高也读了出来（IHDR 块里，宽高是大端序 32 位整数，位于第 16 字节起）：

```javascript
const view = new DataView(buf);
console.log(view.getUint32(16)); // 宽（像素）
console.log(view.getUint32(20)); // 高（像素）
```

这段代码涉及三个对象，正好是本篇的全部内容：`ArrayBuffer` 是那块原始内存，`Uint8Array` 是"按字节看"的窗口，`DataView` 是"指哪读哪、还能管字节序"的窗口。

## 三个对象各自管什么

**ArrayBuffer：一块定长的原始内存**。创建后长度不可变，本身一个字节都读不了——它只是内存，必须通过"视图"访问：

```javascript
const buf = new ArrayBuffer(16);
buf.byteLength; // 16
```

**类型化数组（TypedArray）：同一块内存的整齐视图**。`Uint8Array`、`Int16Array`、`Float32Array` 等九种视图，把内存当作"每格 N 字节的数组"：

```javascript
const bytes = new Uint8Array(buf);      // 16 格，每格 1 字节
const shorts = new Int16Array(buf);     // 8 格，每格 2 字节
bytes[0] = 255;
shorts[0];                              // 与 bytes[0]、bytes[1] 是同一段内存
```

注意最后一行：多个视图看到的是同一块内存，通过 `bytes` 写入，`shorts` 立即可见。类型化数组看起来像普通数组（有 `map`、`slice`、`for...of`），但长度固定、元素类型固定。

**DataView：自由下标的读写器**。类型化数组只能"从 0 开始整齐切分"，而二进制格式几乎总是"第 4 字节一个 uint32、第 8 字节一个 float、后面一段字符串"这种混搭。DataView 允许在任意偏移读任意类型：

```javascript
const dv = new DataView(buf);
dv.getUint8(0);
dv.getUint32(4, true);  // 第二个参数 true = 按小端序读
dv.setFloat32(8, 3.14); // 写入也行
```

## 必须搞懂：字节序

同一个 32 位整数 `0x12345678`，在内存里可以是从低字节到高字节排（小端，x86/ARM 与几乎所有消费设备），也可以反过来（大端，网络协议与部分文件格式）。文件格式各自约定：

- PNG 的宽高字段：**大端**。
- WAV 的采样率等字段：**小端**。

这就是为什么读 PNG 用 `view.getUint32(16)`（DataView 默认大端），读 WAV 要 `view.getUint32(24, true)`。类型化数组没有这个参数，它跟随宿主平台的字节序——所以解析跨平台文件格式时用 DataView 才靠谱，类型化数组更适合"自己人之间"传数据或做逐元素计算。

## 完整示例：解析 WAV 头

WAV 是最友好的二进制教学素材：头部明文写着采样率、声道数、位深。目标：读取一段音频的采样率与时长。

```javascript
function parseWavHeader(buf) {
  const dv = new DataView(buf);
  // 魔数校验：RIFF...WAVE
  const magic = new Uint8Array(buf, 0, 4);
  if (String.fromCharCode(...magic) !== 'RIFF') throw new Error('不是 RIFF 文件');

  const audioFormat = dv.getUint16(20, true);  // 1 = 无压缩 PCM
  const channels    = dv.getUint16(22, true);
  const sampleRate  = dv.getUint32(24, true);
  const bitsPerSample = dv.getUint16(34, true);
  return { audioFormat, channels, sampleRate, bitsPerSample };
}

// 时长估算（简化：假设标准 PCM WAV，data 块紧随 fmt 块之后）
const { channels, sampleRate, bitsPerSample } = parseWavHeader(buf);
const dataSize = dv.getUint32(40, true); // data 块长度
const seconds = dataSize / (sampleRate * channels * (bitsPerSample / 8));
```

字符串读法也可以更现代：`new TextDecoder().decode(new Uint8Array(buf, 0, 4))`。严格来说 WAV 的块结构是"块描述 + 数据"的链表，逐块遍历才稳妥，教学版先按下不表。

## 与 Worker 的关系：克隆、转移、共享

这正是 Web Workers 那一篇反复引用本篇的原因。主线程与 Worker 传 `postMessage` 时，三种二进制对象待遇不同：

**默认：结构化克隆（整块复制）**。传 100MB 的 ArrayBuffer 就复制 100MB，两边各持一份、互不影响。

**转移：零拷贝但"失明"**。把缓冲区列入转移列表，所有权整体移交：

```javascript
worker.postMessage(buf, [buf]);
buf.byteLength; // 0 —— 主线程已经不再拥有这块内存（buffer 被 detach）
```

**共享：SharedArrayBuffer 两边看同一块内存**。配合 `Atomics` 做同步，需要跨源隔离响应头，详见[Web Workers 多线程](/javascript/670-WebWorkersMultithreading)。

经验法则：小数据直接克隆省心；一次性大块数据用转移；持续双向读写的热数据才上 SharedArrayBuffer。

## 坑点与自检

**坑 1：`length` 与 `byteLength`**。`Uint16Array(8)` 占 16 字节，`length` 是 8、`byteLength` 是 16。数格数用 `length`，算内存用 `byteLength`，混着用是越界读取的常见来源。

**坑 2：`slice` 复制，`subarray` 只是换窗口**。`buf.slice(0, 8)` 产生新内存；`new Uint8Array(buf, 0, 8)` 是同一内存的视图，改视图就是改原缓冲区。想让函数拿到"只能安全读的副本"，记得 slice。

**坑 3：缓冲区会被 detach**。转移给别人、或调用 `transfer()` 后，原 ArrayBuffer 长度归零，再访问视图抛 TypeError。异步代码里尤其小心：把 buffer 交给 Worker 之后不要再读它。

**坑 4：越界访问行为不一致**。类型化数组下标越界返回 `undefined`（像普通数组），DataView 越界抛 `RangeError`。解析不可信文件时用 DataView 的异常做"格式非法"的信号反而省事。

**坑 5：别用类型化数组当"结构体"**。需要按字段混合读写（本篇 WAV 那种），DataView 加显式偏移才是正解，硬凑类型化数组会写出依赖平台字节序的隐患代码。

自检清单：

- PNG 头是几个字节？为什么不能只信扩展名？
- 读 WAV 采样率时 `getUint32` 的第二个参数是什么、为什么？
- `postMessage(buf, [buf])` 之后，主线程还能读 `buf` 吗？
- 同一块内存上开 `Uint8Array` 和 `Float32Array` 两个视图，一处写入另一处能看到吗？

## 练习

1. 写 `detectImageType(buf)`：通过魔数区分 PNG、JPEG（前 3 字节 `FF D8 FF`）、GIF（`GIF8`）与其他，返回类型字符串。
2. 扩展 WAV 解析器：正确遍历 RIFF 块结构（每个块是"4 字节 id + 4 字节小端长度 + 数据"），找到真正的 `data` 块再计算时长，替代本篇的简化假设。
3. 把本篇开头 PNG 校验接入一个真实上传组件：非图片直接提示，是 PNG 时显示"尺寸 W x H"，并在 Worker 里做（结合[Web Workers](/javascript/670-WebWorkersMultithreading)，用转移避免拷贝大文件）。
4. 用 `DataView` 把一个对象 `{ id: 1, score: 99.5 }` 按自定格式序列化到 ArrayBuffer，再写反向的解析函数，验证 round-trip。

## 下一步

- [Web Workers 多线程](/javascript/670-WebWorkersMultithreading)：Transferable 与 SharedArrayBuffer 的完整工程语境。
- [Fetch API 与 Web Streams](/javascript/450-FetchApiWebStreams)：网络响应 `response.arrayBuffer()` 是二进制数据的另一大来源。
- [IndexedDB](/javascript/470-IndexedDBADatabaseInYourBrowser)：二进制数据可以直接入库，离线缓存图片音频的存储层。
