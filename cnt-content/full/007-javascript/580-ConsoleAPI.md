---
order: 580
title: JavaScript console API 语法速查手册
module: 'javascript'
category: 前端技术
difficulty: beginner
description: console 全家族 API 速查：分级输出、格式化、表格、计时计数、断言与生产环境治理。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'javascript/500-DebugPerformanceOptimization'
  - 'javascript/480-ErrorBoundaryGlobalErrorCatch'
  - 'javascript/510-CoreWebVitalsAndPerformanceMetrics'
prerequisites:
  - 'javascript/010-WhatIsJavaScript'
---

## 前置知识

- [JavaScript 是什么](/javascript/010-WhatIsJavaScript)：知道怎么打开浏览器控制台即可。

## 学习目标

- 分清 `log/info/warn/error` 四个级别该在什么场合用；
- 掌握 `table`、`group`、`time`、`count`、`assert`、`trace` 六个高价值方法的典型用法；
- 理解 `console.log` 打印对象是"引用快照"这一经典陷阱，学会用拷贝与序列化规避；
- 知道生产环境如何治理日志（移除、降级、按级别过滤）。

## console 是什么

`console` 是宿主环境（浏览器、Node.js）提供的**调试输出对象**：它不属于 ECMAScript 语言核心，而是环境注入的标准接口——这解释了为什么不同浏览器里 `console.log` 的样式略有差异。它的定位是"开发期的眼睛"：把程序运行中的变量值、执行路径、耗时打印出来给你看。

可以把控制台类比为"汽车的仪表盘"：程序照常行驶（业务逻辑），console 负责把速度（耗时）、油量（状态）、警报（错误）显示给驾驶员。仪表盘不驱动汽车，但没有它你只能盲开。

## 基础输出

**基本写法：log 多参数**
`console.log(<值>, [<值>...])`
```javascript
// 多参数以空格分隔输出；对象与数组会被展开为可交互的形式
console.log("id:", 1, "user:", { name: "Tom" });
// 输出：id: 1 user: { name: 'Tom' }
```

---

**基本写法：info / debug / warn / error**
`console.<level>(<值>)`
```javascript
// 四个级别只是"语义不同 + 样式不同"，都会把参数打印
console.info("信息");    // 部分浏览器带 i 图标
console.debug("调试");   // DevTools 默认隐藏，需在级别过滤器里勾选 Verbose 才可见
console.warn("警告");    // 黄色背景，适合降级提示
console.error("错误");   // 红色背景，附带调用堆栈
```

> 级别的真正价值在**过滤**：DevTools 的级别筛选器（Verbose/Info/Warnings/Errors）按这四个级别过滤输出。团队约定"warn 表示可自动恢复的异常、error 表示需要关注的问题"，排查时就能快速缩小范围。

---

## 格式化输出

**基本写法：格式占位符**
`console.log("<格式串>", <值>)`
```javascript
// %s 字符串 %d/%i 整数 %f 浮点 %o/%O 对象 %c CSS 样式 %% 百分号本身
console.log("%s 有 %d 岁", "Tom", 18);        // Tom 有 18 岁
console.log("%c红色文字", "color:red;font-weight:bold");  // %c 仅浏览器 DevTools 生效
```

---

**基本写法：对象表格**
`console.table(<数据>, [<列>])`
```javascript
// 数组或对象渲染为可排序表格；第二参数可只显示指定列
console.table([
  { id: 1, name: "A" },
  { id: 2, name: "B" },
]);
console.table([{ id: 1, name: "A" }, { id: 2, name: "B" }], ["name"]); // 只显示 name 列
```

---

**基本写法：分组输出**
`console.group([<标题>])` | `console.groupEnd()`
```javascript
// group 默认展开，groupCollapsed 默认折叠；必须配对 groupEnd
console.group("用户信息");
console.log("name: Tom");
console.group("订单");          // 分组可嵌套
console.log("order: 1001");
console.groupEnd();
console.groupEnd();
```

---

## 计时与计数

**基本写法：计时器**
`console.time(<标签>)` | `console.timeEnd(<标签>)`
```javascript
// 标签用于配对；timeLog 可在中途打点
console.time("loop");
for (let i = 0; i < 1e6; i++) {}
console.timeEnd("loop"); // 输出形如：loop: 1.234ms
```

> `time/timeEnd` 适合开发期的粗粒度对比（"这个写法是不是更慢"）；需要精确、可报告的数据请用 `performance.now()` 或 Performance API（见 [前端性能指标](/javascript/510-CoreWebVitalsAndPerformanceMetrics)）。

---

**基本写法：计数器**
`console.count([<标签>])`
```javascript
// 按标签统计调用次数，排查"这个函数被调了几次"比断点快
function fn() { console.count("fn"); }
fn(); fn();   // 依次输出 fn: 1、fn: 2
console.countReset("fn");   // 归零
```

---

## 断言与堆栈

**基本写法：断言**
`console.assert(<条件>, [<消息>])`
```javascript
// 条件为 false 才输出（Assertion failed），为 true 时完全静默；不会中断执行
const age = -1;
console.assert(age >= 0, "年龄不能为负，实际为", age);
```

> 注意与 `throw` 的区别：`console.assert` 只是打印，程序继续跑；需要"不满足就中断"时用 `throw new Error(...)` 或单元测试断言。

---

**基本写法：打印堆栈**
`console.trace([<消息>])`
```javascript
// 输出从当前函数到顶层的完整调用链，适合定位"谁调到了我"
function a() { b(); }
function b() { console.trace("到达 b"); }
a();  // 输出 Trace: 到达 b，随后逐层列出 b、a 的调用位置
```

---

## 目录树与清屏

**基本写法：对象目录树**
`console.dir(<对象>, [<选项>])`
```javascript
// 以树形结构展示对象的属性（而非 JSON 形态），查看 DOM 节点尤其有用
console.dir(document.body, { depth: 2 });
```

---

**基本写法：清屏**
`console.clear()`
```javascript
// 清空控制台（浏览器中若开启了 Preserve log 则会保留）
console.clear();
```

---

## 经典陷阱：console.log 打印的是"引用"

`console.log(obj)` 打印的是**对象的引用**：控制台显示的内容在展开那一刻才求值。打印之后修改对象，控制台里"看起来像打印时的值"其实是最新的值：

```javascript
const state = { list: [] };
console.log(state);          // 展开后显示 { list: [1, 2, 3] }——不是打印那一刻的空数组！
state.list.push(1, 2, 3);
```

规避方案：

```javascript
// 方案一：打印快照（浅拷贝即可脱离引用）
console.log({ ...state });

// 方案二：序列化为字符串，彻底定格
console.log(JSON.stringify(state));

// 方案三：直接打断点，用调试器逐帧观察（见调试专题）
```

---

## Node.js 专属

**基本写法：控制台颜色（Node）**
`console.log("\x1b[31m%s\x1b[0m", "红")`
```javascript
// ANSI 转义码着色：31 红 32 绿 33 黄 34 蓝，0 重置
console.log("\x1b[32m成功\x1b[0m");
```

Node 的 `console` 默认写到 stdout（log/info）与 stderr（warn/error），因此可以在 shell 里用 `node app.js 2> err.log` 分流重定向。

---

## 生产环境治理

**基本写法：按环境屏蔽**
`console.log(<值>)`
```javascript
// 简单方案：生产环境重写为空函数（保留 error 便于线上排障）
if (process.env.NODE_ENV === "production") {
  console.log = () => {};
  console.info = () => {};
}
```

更工程化的做法是封装统一日志入口，按级别与环境过滤：

```javascript
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const current = LEVELS[process.env.LOG_LEVEL ?? 'info'];

const log = (level, ...args) => {
  if (LEVELS[level] >= current) console[level](new Date().toISOString(), ...args);
};

log('debug', '仅开发可见');
log('error', '始终可见');
```

---

## 核心知识点

> 一句话记住 Console：`log/info/warn/error` 分级输出，`table` 打印表格，`time/timeEnd` 计时，`group` 分组，`assert` 断言，`trace` 打堆栈。

- 分级：`console.log/info/warn/error`（debug 默认隐藏）；
- 格式化：`%s/%d/%f/%o/%c` 占位符，`%c` 仅浏览器生效；
- `console.table()`：数组/对象表格化，支持指定列；
- `console.time()/timeEnd()`：标签化计时；`count()`：调用计数；
- `console.assert()`：条件静默断言（不中断）；`console.trace()`：调用堆栈；
- `console.log` 打印对象是引用，需要快照时先拷贝或序列化。

## 动手试试

1. 用 `console.table` 展示一组用户数据，并用第二参数只显示两列；
2. 用 `time/timeEnd` 测量 `for` 与 `forEach` 遍历 100 万元素的耗时差；
3. 复现"打印引用"陷阱：打印一个数组后 `push`，观察控制台展开结果；
4. 进阶挑战：写一个支持级别过滤、时间戳、可开关的 `createLogger(scope)` 工厂。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 生产环境留日志 | 性能损耗与隐私泄露 | 构建期移除（如 esbuild `drop: ['console']`）或按环境过滤 |
| console.log 调试对象 | 打印的是引用，展开时才求值 | 打印浅拷贝、序列化或用断点 |
| 滥用 console | 代码噪音，掩盖真正有价值的日志 | 统一日志封装，按级别输出 |
| 依赖 console 计时下性能结论 | 受 GC 与 JIT 干扰 | 用 performance API 多次采样 |

## 扩展学习

- 调试：`javascript/500-DebugPerformanceOptimization`；
- 错误处理：`javascript/480-ErrorBoundaryGlobalErrorCatch`；
- 性能：`javascript/510-CoreWebVitalsAndPerformanceMetrics`。
