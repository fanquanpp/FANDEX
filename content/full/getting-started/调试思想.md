---
order: 60
title: 调试思想
module: 'getting-started'
category: 入门指南
difficulty: beginner
description: 系统化调试方法论：断点调试、日志策略、二分排查与常见调试工具。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'getting-started/构建工具'
  - 'getting-started/编程范式基础'
  - 'getting-started/软件下载地址汇总'
prerequisites:
  - 'getting-started/入门指南'
---

## 1. 调试概述

### 1.1 什么是调试

调试（Debugging）是定位和修复程序错误的**系统化过程**。它不仅是技术技能，更是一种**思维方式**：

- **观察**：收集错误现象和上下文信息
- **假设**：基于证据提出可能的原因
- **验证**：通过实验验证或否定假设
- **修复**：确认根因后实施修复
- **反思**：总结经验，防止同类问题复发

### 1.2 Bug 的分类

| 类型           | 特征              | 示例                   |
| :------------- | :---------------- | :--------------------- |
| **语法错误**   | 编译/解析阶段暴露 | 缺少括号、拼写错误     |
| **运行时错误** | 程序执行时崩溃    | 空指针引用、数组越界   |
| **逻辑错误**   | 程序运行但不正确  | 条件判断写反、算法错误 |
| **性能问题**   | 功能正确但太慢    | O(n²) 算法、内存泄漏   |
| **并发问题**   | 间歇性出现        | 竞态条件、死锁         |

### 1.3 调试的黄金法则

1. **不要猜测，要观察**：用数据说话，不要凭直觉修改代码
2. **一次只改一处**：同时修改多处无法确定哪处有效
3. **保持可复现**：确保 Bug 可以稳定复现
4. **从简到繁**：先检查最简单的原因
5. **记录过程**：记录每一步操作和结果

## 2. 断点调试

### 2.1 断点类型

| 断点类型     | 说明               | 适用场景         |
| :----------- | :----------------- | :--------------- |
| **行断点**   | 执行到指定行暂停   | 通用调试         |
| **条件断点** | 满足条件时暂停     | 循环中的特定迭代 |
| **日志断点** | 不暂停，只输出日志 | 不想中断执行流程 |
| **函数断点** | 函数调用时暂停     | 调试第三方库函数 |
| **异常断点** | 抛出异常时暂停     | 捕获未处理的异常 |

### 2.2 VS Code 断点调试

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Node",
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["--loader", "ts-node/esm"]
    }
  ]
}
```

### 2.3 调试控制

| 操作         | 快捷键          | 说明                       |
| :----------- | :-------------- | :------------------------- |
| **继续**     | `F5`            | 运行到下一个断点           |
| **单步跳过** | `F10`           | 执行当前行，不进入函数     |
| **单步进入** | `F11`           | 进入函数内部               |
| **单步跳出** | `Shift+F11`     | 执行完当前函数，返回调用处 |
| **重启**     | `Ctrl+Shift+F5` | 重新开始调试               |
| **停止**     | `Shift+F5`      | 终止调试                   |

### 2.4 调试面板

调试时可以查看以下信息：

- **变量（Variables）**：当前作用域的所有变量值
- **监视（Watch）**：自定义监视表达式
- **调用栈（Call Stack）**：函数调用链
- **断点（Breakpoints）**：所有断点列表

## 3. 日志策略

### 3.1 日志级别

| 级别      | 用途               | 示例                           |
| :-------- | :----------------- | :----------------------------- |
| **ERROR** | 错误，需要立即处理 | 数据库连接失败                 |
| **WARN**  | 警告，潜在问题     | API 响应慢、配置缺失使用默认值 |
| **INFO**  | 关键业务流程       | 用户登录、订单创建             |
| **DEBUG** | 调试信息           | 函数参数、中间变量             |
| **TRACE** | 最详细的追踪       | 每行代码执行记录               |

### 3.2 结构化日志

```typescript
//  非结构化日志
console.log('User logged in: ' + userId);

//  结构化日志
console.log(
  JSON.stringify({
    level: 'info',
    message: 'User logged in',
    userId: userId,
    timestamp: new Date().toISOString(),
    requestId: req.id,
  })
);
```

### 3.3 日志最佳实践

1. **关键路径必打**：用户操作、外部调用、状态变更
2. **包含上下文**：用户 ID、请求 ID、时间戳
3. **避免敏感信息**：不记录密码、Token、个人隐私
4. **控制日志量**：生产环境用 INFO 级别，调试时用 DEBUG
5. **统一格式**：使用日志库而非裸 `console.log`

```typescript
// 使用日志库
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

logger.info({ userId: 123 }, 'User logged in');
logger.error({ err, path: '/api/users' }, 'Failed to fetch users');
logger.debug({ query, params }, 'Executing database query');
```

### 3.4 浏览器调试日志

```javascript
// 条件断点的日志替代
console.assert(value !== null, 'Value should not be null', { value });

// 分组日志
console.group('API Request');
console.log('URL:', url);
console.log('Method:', method);
console.log('Body:', body);
console.log('Response:', response);
console.groupEnd();

// 性能计时
console.time('database-query');
await db.query(sql);
console.timeEnd('database-query'); // database-query: 45.23ms

// 表格输出
console.table([
  { name: 'Alice', score: 95 },
  { name: 'Bob', score: 87 },
]);
```

## 4. 二分排查法

### 4.1 核心思想

二分排查法借鉴了**二分查找算法**的思想：通过不断缩小问题范围来定位 Bug 的根因。

```
问题范围: [─────────────────────────────────]
第一次二分: [──────────────] | [──────────────]
                    ↓ 问题在左半部分
第二次二分: [──────] | [──────]
                    ↓ 问题在右半部分
第三次二分: [───] | [───]
                    ↓ 问题在左半部分
定位到具体行: [─] | [─]
```

### 4.2 代码二分法

```bash
# 使用 git bisect 自动化二分排查
git bisect start
git bisect bad                  # 当前版本有 Bug
git bisect good v1.0.0          # v1.0.0 版本正常

# Git 自动切换到中间提交
# 测试后标记
git bisect good                 # 这个版本正常
# 或
git bisect bad                  # 这个版本有 Bug

# 重复直到找到引入 Bug 的提交
# Git 会显示第一个有问题的提交

# 结束
git bisect reset
```

### 4.3 通用二分策略

| 维度     | 二分方法          | 示例                |
| :------- | :---------------- | :------------------ |
| **时间** | git bisect        | 找到引入 Bug 的提交 |
| **代码** | 注释掉一半代码    | 定位到具体模块      |
| **数据** | 使用一半数据集    | 定位触发 Bug 的数据 |
| **配置** | 逐项还原配置      | 定位冲突的配置项    |
| **依赖** | 逐个升级/降级依赖 | 定位问题依赖版本    |

### 4.4 二分排查实例

```bash
# 场景：页面渲染异常，怀疑是最近某次提交引入

# 1. 确认问题范围
git log --oneline -20  # 查看最近20次提交

# 2. 启动二分
git bisect start
git bisect bad HEAD
git bisect good abc1234  # 已知正常的提交

# 3. Git 切换到中间提交，测试
# 如果正常: git bisect good
# 如果异常: git bisect bad

# 4. 重复步骤3，直到找到第一个异常提交

# 5. 查看该提交的变更
git show <commit-hash>

# 6. 结束二分
git bisect reset
```

## 5. 常见调试场景

### 5.1 异步问题调试

```typescript
// 使用 async/await 替代 .then() 链，便于断点调试
async function fetchUserData(userId: string) {
  try {
    const response = await fetch(`/api/users/${userId}`); // 可在此设断点
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json(); // 可在此设断点
    return data;
  } catch (error) {
    logger.error({ err: error, userId }, 'Failed to fetch user');
    throw error;
  }
}
```

### 5.2 内存泄漏排查

```javascript
// Chrome DevTools Memory 面板
// 1. 拍摄堆快照（Heap Snapshot）
// 2. 执行操作
// 3. 再次拍摄快照
// 4. 对比两次快照，找出增长的对象

// 常见内存泄漏原因
// - 未移除的事件监听器
// - 闭包引用大对象
// - 未清理的定时器
// - DOM 引用未释放

// 使用 WeakRef 避免内存泄漏
const cache = new Map();
const ref = new WeakRef(largeObject);
```

### 5.3 性能问题调试

```javascript
// Performance API
performance.mark('start');
// ... 执行代码
performance.mark('end');
performance.measure('my-operation', 'start', 'end');
const measure = performance.getEntriesByName('my-operation')[0];
console.log(`Duration: ${measure.duration}ms`);

// Chrome DevTools Performance 面板
// 1. 点击 Record
// 2. 执行操作
// 3. 停止录制
// 4. 分析火焰图（Flame Chart）
```

## 6. 调试工具箱

### 6.1 通用工具

| 工具                 | 用途            | 平台   |
| :------------------- | :-------------- | :----- |
| **Chrome DevTools**  | 前端调试        | Chrome |
| **VS Code Debugger** | 通用断点调试    | 跨平台 |
| **GDB**              | C/C++ 调试      | Linux  |
| **LLDB**             | Swift/ObjC 调试 | macOS  |
| **jdb**              | Java 调试       | 跨平台 |

### 6.2 网络调试

```bash
# 抓包分析
tcpdump -i eth0 port 80        # 捕获 HTTP 流量
wireshark                       # 图形化抓包分析

# HTTP 请求调试
curl -v https://api.example.com # 详细请求/响应信息
httpie                          # 更友好的 curl 替代
```

### 6.3 系统调试

```bash
# 进程监控
strace -p PID                   # 跟踪系统调用
ltrace -p PID                   # 跟踪库函数调用
dtrace                          # 动态追踪（macOS/Solaris）

# 性能分析
perf record -g ./myapp          # Linux 性能分析
Instruments                     # macOS 性能分析
```
