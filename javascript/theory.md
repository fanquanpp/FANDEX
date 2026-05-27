# JavaScript 理论知识点

## 事件循环（Event Loop）

### 执行模型

JavaScript 是单线程语言，通过事件循环实现异步非阻塞。事件循环不断从任务队列中取出任务执行，使得 I/O 操作不会阻塞主线程。

```
   ┌──────────────────────────┐
   │       Call Stack          │  <-- 同步代码执行
   └──────────┬───────────────┘
              │
              v
   ┌──────────────────────────┐
   │       Microtask Queue     │  <-- Promise.then, MutationObserver, queueMicrotask
   └──────────┬───────────────┘
              │
              v
   ┌──────────────────────────┐
   │       Macrotask Queue     │  <-- setTimeout, setInterval, I/O, UI render
   └──────────────────────────┘
```

### 事件循环的执行顺序

1. 执行同步代码（Call Stack 中的任务）
2. Call Stack 清空后，检查 Microtask Queue
3. 执行所有 Microtask（包括执行过程中新产生的 Microtask）
4. Microtask Queue 清空后，执行一个 Macrotask
5. 重复步骤 2-4

```javascript
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve()
    .then(() => console.log("3"))
    .then(() => console.log("4"));

console.log("5");

// 输出顺序：1, 5, 3, 4, 2
```

### Microtask vs Macrotask

| 特性 | Microtask | Macrotask |
|------|----------|-----------|
| 优先级 | 高（每次 Call Stack 清空后执行） | 低（Microtask 清空后才执行） |
| 执行策略 | 全部执行完 | 每轮只执行一个 |
| 产生方式 | Promise.then/catch/finally, queueMicrotask, MutationObserver | setTimeout, setInterval, setImmediate(Node), I/O, UI rendering |
| 嵌套产生 | 新产生的 Microtask 在同一轮执行 | 新产生的 Macrotask 推到下一轮 |

### 浏览器 vs Node.js 事件循环

浏览器事件循环基于 HTML5 规范，Node.js 事件循环基于 libuv 库。

Node.js 事件循环阶段：

```
   timers          --> 执行 setTimeout/setInterval 回调
   pending callbacks --> 系统级回调（TCP 错误等）
   idle, prepare   --> 内部使用
   poll            --> 检索新 I/O 事件，执行 I/O 回调
   check           --> 执行 setImmediate 回调
   close callbacks --> socket.on('close')
```

Node.js 11+ 的行为已与浏览器趋同：每个 Macrotask 阶段之间都会清空 Microtask Queue。

---

## V8 引擎

### 架构概览

V8 是 Google 开发的 JavaScript 引擎，用于 Chrome 和 Node.js。其核心架构：

```
JavaScript 源代码
      │
      v
  Parser（解析器）
      │
      v
  AST（抽象语法树）
      │
      ├──> Ignition（解释器）──> 字节码执行
      │                            │
      │                            v（热点代码）
      │                     TurboFan（优化编译器）──> 优化机器码
      │                            │
      │                            v（逆优化）
      │                     Ignition（回退解释执行）
      │
      └──> Maglev（中层编译器，V8 v11+）──> 半优化机器码
```

### Ignition 解释器

Ignition 是 V8 的字节码解释器，将 AST 编译为字节码后逐条解释执行。字节码的设计目标：
- 减少内存占用（比直接执行 AST 更紧凑）
- 快速启动（无需等待 JIT 编译）
- 收集类型反馈（Type Feedback）供 JIT 使用

### TurboFan 优化编译器

TurboFan 基于 Ignition 收集的类型反馈，将热点字节码编译为高效的机器码。优化策略：

1. **内联缓存（Inline Cache, IC）** -- 记录属性访问的类型信息，生成快速路径
2. **推测优化（Speculative Optimization）** -- 假设类型不变，生成特化代码
3. **逃逸分析** -- 避免不必要的对象分配
4. **循环优化** -- 展开和不变量外提

当推测优化的假设失败时，触发逆优化（Deoptimization），回退到 Ignition 解释执行。

---

## 隐藏类（Hidden Classes）

### 什么是隐藏类

V8 使用隐藏类（也称 Map）来描述对象的内存布局。每个对象都有一个指向其隐藏类的指针，隐藏类定义了对象的属性名称、属性值偏移量等信息。

### 隐藏类的转换

当给对象添加新属性时，V8 不是创建新的隐藏类，而是通过转换链（transition chain）派生新隐藏类：

```javascript
function Point(x, y) {
    this.x = x;  // HiddenClass C0 -> C1 (添加 x, offset 0)
    this.y = y;  // HiddenClass C1 -> C2 (添加 y, offset 1)
}

const p1 = new Point(1, 2);  // C0 -> C1 -> C2
const p2 = new Point(3, 4);  // C0 -> C1 -> C2 (复用同一转换链)
```

### 隐藏类与性能

相同结构的对象共享隐藏类，使得 V8 可以生成优化的机器码。如果对象结构不一致，V8 需要使用慢速路径。

```javascript
// 好的做法：始终以相同顺序初始化属性
function Good(x, y) {
    this.x = x;
    this.y = y;
}

// 不好的做法：不同顺序导致不同隐藏类
function Bad1(x, y) { this.x = x; this.y = y; }
function Bad2(x, y) { this.y = y; this.x = x; }
// Bad1 和 Bad2 的实例有不同的隐藏类
```

性能优化建议：
- 始终以相同顺序初始化对象属性
- 避免在对象创建后动态添加属性
- 避免删除属性（delete 操作会改变隐藏类）
- 使用构造函数或工厂函数保证对象结构一致

### 内联缓存（Inline Cache）

V8 通过内联缓存加速属性访问。每次属性访问时，V8 记录对象的隐藏类和属性偏移量，下次遇到相同隐藏类时直接使用缓存的结果。

```javascript
function getX(obj) {
    return obj.x;  // 第一次调用：记录隐藏类和偏移量
                   // 后续调用：如果隐藏类相同，直接使用缓存偏移量
}
```

IC 的状态：
1. **未初始化（Uninitialized）** -- 首次访问
2. **单态（Monomorphic）** -- 只见过一种隐藏类（最快）
3. **多态（Polymorphic）** -- 见过 2-4 种隐藏类
4. **超多态（Megamorphic）** -- 见过超过 4 种隐藏类（最慢，回退到通用查找）

---

## JIT 编译

### JIT 的工作原理

V8 的 JIT 编译采用自适应优化策略：

1. **解释执行阶段** -- Ignition 解释执行字节码，收集运行时类型信息
2. **热点检测** -- 函数被频繁调用时标记为热点
3. **优化编译** -- TurboFan 基于类型反馈生成优化机器码
4. **逆优化** -- 类型假设失败时回退到解释执行

### 推测优化

JIT 编译器基于运行时观察到的类型信息进行推测优化：

```javascript
function add(a, b) {
    return a + b;
}

// 如果 add 始终接收整数参数，TurboFan 会生成整数加法的机器码
add(1, 2);    // 整数加法，快速路径
add(1.5, 2);  // 触发逆优化，回退到通用加法
```

常见的推测优化：
- **类型特化** -- 假设参数类型不变，生成特化代码
- **边界检查消除** -- 假设数组访问不越界，消除检查
- **数组长度缓存** -- 缓存数组长度，避免重复读取
- **原型链内联** -- 将原型链查找内联为直接偏移访问

### 逆优化的触发条件

- 类型不匹配（整数 -> 浮点数）
- 数组元素类型变化（SMI 数组 -> Double 数组）
- 新增全局变量或原型修改
- 调试器附加

---

## 内存管理

### V8 的内存结构

V8 的堆内存分为多个区域：

```
┌─────────────────────────────────────────┐
│               New Space (Young Gen)      │
│  ┌──────────┐  ┌──────────┐            │
│  │ From Semi │  │ To Semi  │            │  <-- Scavenge 算法
│  │  Space    │  │  Space   │            │
│  └──────────┘  └──────────┘            │
├─────────────────────────────────────────┤
│               Old Space (Old Gen)        │
│  ┌─────────────────────────────────┐    │
│  │  Old Object Space                │    │  <-- Mark-Sweep-Compact
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  Large Object Space (LOS)        │    │  <-- 大对象直接分配
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  Code Space                      │    │  <-- JIT 编译的代码
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 垃圾回收算法

#### Scavenge（新生代）

使用 Cheney 的半空间复制算法：

1. 新对象分配在 From 半空间
2. GC 时，从根集合遍历，将存活对象复制到 To 半空间
3. 交换 From 和 To 半空间
4. 经历两次 Scavenge 仍存活的对象晋升到老生代

特点：速度快，但只使用一半空间。适合短生命周期对象（大多数 JS 对象"朝生夕死"）。

#### Mark-Sweep-Compact（老生代）

1. **标记（Mark）** -- 从根集合遍历，标记所有可达对象
2. **清除（Sweep）** -- 遍历堆，回收未标记对象
3. **整理（Compact）** -- 将存活对象移动到一端，消除内存碎片

V8 使用三色标记法：
- **白色** -- 未访问（GC 结束后回收）
- **灰色** -- 已访问但子节点未完全访问
- **黑色** -- 已访问且子节点完全访问

#### 增量标记与并发回收

为避免 GC 暂停（Stop-The-World），V8 采用：
- **增量标记** -- 将标记阶段拆分为多个小步骤，穿插在 JS 执行之间
- **并发标记** -- 标记阶段在辅助线程并发执行
- **并发清除/整理** -- 清除和整理阶段并发执行
- **并行 Scavenge** -- 新生代 GC 在多个辅助线程并行执行

### 内存泄漏的常见模式

1. **意外的全局变量**
   ```javascript
   function leak() {
       bar = "global variable";  // 忘记 var/let/const
   }
   ```

2. **被遗忘的定时器**
   ```javascript
   setInterval(() => { /* 引用外部变量 */ }, 1000);
   // 组件销毁时未 clearInterval
   ```

3. **闭包引用**
   ```javascript
   function createLeak() {
       const hugeData = new Array(1000000);
       return function() { return hugeData.length; };
       // hugeData 无法被回收，因为闭包持有引用
   }
   ```

4. **DOM 引用**
   ```javascript
   const elements = {};
   document.getElementById("btn").addEventListener("click", () => {});
   elements.btn = document.getElementById("btn");
   // 即使 DOM 元素被移除，elements 仍持有引用
   ```

5. **未移除的事件监听器**
   ```javascript
   element.addEventListener("click", handler);
   // 组件销毁时未 removeEventListener
   ```

### WeakRef 与 FinalizationRegistry

ES2021 提供的弱引用机制，允许在不阻止 GC 的前提下持有对象引用：

```javascript
let target = { data: "important" };
const weakRef = new WeakRef(target);

// 检查对象是否仍存在
if (weakRef.deref()) {
    console.log(weakRef.deref().data);
}

// 对象被 GC 后执行清理回调
const registry = new FinalizationRegistry((heldValue) => {
    console.log("Cleaned up:", heldValue);
});
registry.register(target, "target-id");

target = null;  // 允许 GC 回收
```

---

## 理论速查表

| 概念 | 核心要点 | 关键细节 |
|------|---------|---------|
| 事件循环 | 单线程异步模型 | Microtask 优先于 Macrotask |
| V8 引擎 | Ignition + TurboFan | 解释执行 + JIT 优化编译 |
| 隐藏类 | 对象内存布局描述 | 相同结构共享隐藏类 |
| 内联缓存 | 加速属性访问 | 单态最快，超多态最慢 |
| JIT 编译 | 热点代码编译为机器码 | 推测优化 + 逆优化 |
| 新生代 GC | Scavenge 半空间复制 | 短生命周期对象，速度快 |
| 老生代 GC | Mark-Sweep-Compact | 增量标记 + 并发回收 |
| 内存泄漏 | 意外引用阻止 GC | 全局变量、定时器、闭包、DOM 引用 |
