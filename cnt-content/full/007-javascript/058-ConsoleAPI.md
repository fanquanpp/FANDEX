---
order: 580
title: JavaScript console API 语法速查手册
module: 'javascript'
category: 前端技术
difficulty: beginner
description: JavaScript console API 语法速查 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 基础输出

**基本写法：log 多参数**
`console.log(<值>, [<值>...])`
```javascript
// 多参数空格分隔输出
console.log("id:", 1, "user:", { name: "Tom" });
```

---

**基本写法：info / debug / warn / error**
`console.<level>(<值>)`
```javascript
// 不同级别，渲染样式不同
console.info("信息");
console.debug("调试");
console.warn("警告");
console.error("错误");
```

---

## 格式化输出

**基本写法：格式占位符**
`console.log("<格式串>", <值>)`
```javascript
// %s 字符串 %d/%i 整数 %f 浮点 %o 对象 %c 样式
console.log("%s 有 %d 岁", "Tom", 18);
console.log("%c红色文字", "color:red;font-weight:bold");
```

---

**基本写法：对象表格**
`console.table(<数据>, [<列>])`
```javascript
// 数组或对象渲染为表格
console.table([{ id: 1, name: "A" }, { id: 2, name: "B" }]);
console.table(users, ["name"]);
```

---

**基本写法：分组输出**
`console.group([<标题>])` | `console.groupEnd()`
```javascript
// 折叠分组
console.group("用户信息");
console.log("name: Tom");
console.groupEnd();
// 默认展开
console.groupCollapsed("详情");
console.groupEnd();
```

---

## 计时与计数

**基本写法：计时器**
`console.time(<标签>)` | `console.timeEnd(<标签>)`
```javascript
// 测量代码执行耗时
console.time("loop");
for (let i = 0; i < 1e6; i++) {}
console.timeEnd("loop"); // loop: 1.23ms
```

---

**基本写法：计数器**
`console.count([<标签>])`
```javascript
// 统计调用次数
function fn() { console.count("fn"); }
fn(); fn(); // fn: 1 / fn: 2
console.countReset("fn");
```

---

## 断言与堆栈

**基本写法：断言**
`console.assert(<条件>, [<消息>])`
```javascript
// 条件为 false 才输出错误
console.assert(age >= 0, "年龄不能为负");
```

---

**基本写法：打印堆栈**
`console.trace([<消息>])`
```javascript
// 输出调用栈
function a() { b(); }
function b() { console.trace("位置"); }
a();
```

---

## 目录树与清屏

**基本写法：对象目录树**
`console.dir(<对象>, [<选项>])`
```javascript
// 以可展开树形显示
console.dir(document.body, { depth: 2, colors: true });
```

---

**基本写法：清屏**
`console.clear()`
```javascript
// 清空控制台
console.clear();
```

---

## 性能分析

**基本写法：性能采样**
`console.profile(<标签>)` | `console.profileEnd(<标签>)`
```javascript
// 配合浏览器性能分析器
console.profile("render");
render();
console.profileEnd("render");
```

---

**基本写法：时间戳**
`console.timeStamp(<标签>)`
```javascript
// 在性能时间轴打标记
console.timeStamp("start-render");
```

---

## Node.js 专属

**基本写法：控制台颜色（Node）**
`console.log("\x1b[31m%s\x1b[0m", "红")`
```javascript
// ANSI 转义码着色
// 31 红 32 绿 33 黄 34 蓝 0 重置
console.log("\x1b[32m成功\x1b[0m");
```

---

## 条件与流式

**基本写法：按级别条件输出**
`console.log(<值>)`
```javascript
// 自定义封装按级别过滤
const log = (level, ...args) => {
  if (LEVELS[level] >= LEVELS[config.level]) console[level](...args);
};
```

---

## 推荐实践

**基本写法：生产环境屏蔽**
`console.log(<值>)`
```javascript
// 构建时移除或重写
if (process.env.NODE_ENV === "production") {
  console.log = console.info = () => {};
}
```

## 核心知识点

> 一句话记住 Console：`log/info/warn/error` 分级输出，`table` 打印表格，`time/timeEnd` 计时，`group` 分组，`assert` 断言。

- 分级：`console.log/info/warn/error`；
- 格式化：`%s`/`%d`/`%o` 占位符；
- `console.table()`：数组/对象表格化；
- `console.time()`/`timeEnd()`：耗时统计；
- `console.group()`/`groupEnd()`：折叠分组；
- `console.assert()`：条件断言；
- DevTools 中的调试主力。

## 动手试试

1. 用 `console.table` 展示一组用户数据；
2. 用 `time/timeEnd` 测量一次循环耗时；
3. 用 `group` 分组输出日志；
4. 进阶挑战：写一个 `debug` 开关控制日志级别。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 生产环境留日志 | 性能与隐私 | 用日志库或按环境裁剪 |
| console.log 调试对象 | 打印的是引用 | 用 `console.dir` 或断点 |
| 滥用 console | 代码噪音 | 提交前清理 |

## 扩展学习

- 调试：`javascript/049-DebugPerformanceOptimization`；
- 错误处理：`javascript/047-ErrorBoundaryGlobalErrorCatch`；
- 性能：`javascript/050-CoreWebVitalsAndPerformanceMetrics`。
