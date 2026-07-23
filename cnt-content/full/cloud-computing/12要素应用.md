---
order: 58
title: 12要素应用
module: 'cloud-computing'
category: 'eng-infra'
difficulty: intermediate
description: '12-Factor App 方法论：构建云原生应用的十二个最佳实践详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/Helm包管理'
  - 'cloud-computing/云成本优化'
  - 'cloud-computing/微服务架构'
  - 'cloud-computing/服务网格'
prerequisites:
  - 'cloud-computing/云计算基础'
---

## 1. 12-Factor 概述

### 1.1 起源

12-Factor App 由 Heroku 联合创始人 Adam Wiggins 于 2011 年提出，是构建 SaaS 应用的方法论。

### 1.2 核心目标

- 可移植性
- 云原生部署
- 持续部署
- 弹性伸缩

## 2. 十二个要素

### 2.1 Codebase — 代码库

一份代码库，多次部署。

```
一个应用 → 一个 Git 仓库
同一代码库 → 多个部署（dev/staging/prod）
不同应用 → 不同代码库
```

| 规则       | 描述                 |
| ---------- | -------------------- |
| 单一代码库 | 一个应用一个仓库     |
| 多次部署   | 共享代码，不同配置   |
| 不共享代码 | 不同应用不共享代码库 |

### 2.2 Dependencies — 依赖

显式声明并隔离依赖。

```json
// package.json
{
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  }
}
```

| 规则     | 描述             |
| -------- | ---------------- |
| 显式声明 | 通过清单文件声明 |
| 隔离     | 不依赖系统级包   |
| 锁定     | 使用 lock 文件   |

### 2.3 Config — 配置

在环境中存储配置。

```bash
# 环境变量
export DATABASE_URL=postgres://user:pass@host:5432/db
export API_KEY=sk-xxx
export LOG_LEVEL=info
```

| 规则     | 描述             |
| -------- | ---------------- |
| 不硬编码 | 配置不写在代码中 |
| 环境变量 | 通过 env 传入    |
| 严格分离 | 代码与配置独立   |

**配置判断标准**：在不同部署间是否变化？变化 → 配置，不变 → 代码。

### 2.4 Backing Services — 后端服务

将后端服务当作附加资源。

```
应用 ←→ 数据库（可替换）
应用 ←→ 消息队列（可替换）
应用 ←→ 缓存（可替换）
```

| 规则     | 描述                 |
| -------- | -------------------- |
| 统一接口 | 本地和远程服务无差别 |
| 可替换   | 通过配置切换服务     |
| 松耦合   | 不绑定特定实现       |

### 2.5 Build, Release, Run — 构建/发布/运行

严格分离构建和运行阶段。

```
构建：代码 → 可执行包
发布：可执行包 + 配置 → 发布版本
运行：启动发布版本
```

| 阶段    | 输入        | 输出     |
| ------- | ----------- | -------- |
| Build   | 代码 + 依赖 | 构建产物 |
| Release | 构建 + 配置 | 发布版本 |
| Run     | 发布版本    | 运行进程 |

### 2.6 Processes — 进程

以无状态进程运行应用。

| 规则     | 描述               |
| -------- | ------------------ |
| 无状态   | 进程不存储状态     |
| 持久数据 | 存入后端服务       |
| 可替换   | 任何进程可随时停止 |

### 2.7 Port Binding — 端口绑定

通过端口绑定提供服务。

```javascript
// 应用自包含 Web 服务器
const server = app.listen(process.env.PORT || 3000);
```

| 规则     | 描述                  |
| -------- | --------------------- |
| 自包含   | 不依赖外部 Web 服务器 |
| 端口监听 | 通过端口暴露服务      |
| 可寻址   | URL 即服务            |

### 2.8 Concurrency — 并发

通过进程模型进行扩展。

```
扩展方式：
- 横向扩展（增加进程数）
- 纵向扩展（增加资源）
```

| 进程类型 | 描述           |
| -------- | -------------- |
| Web      | 处理 HTTP 请求 |
| Worker   | 处理后台任务   |
| Clock    | 定时任务       |

### 2.9 Disposability — 易处理

快速启动和优雅终止。

| 规则     | 描述                 |
| -------- | -------------------- |
| 快速启动 | 秒级启动             |
| 优雅关闭 | 处理完当前请求后退出 |
| 健壮性   | 进程可随时被替换     |

```javascript
// 优雅关闭
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
```

### 2.10 Dev/Prod Parity — 开发/生产一致

尽可能保持开发、预发布和生产环境一致。

| 差异 | 传统 | 12-Factor |
| ---- | ---- | --------- |
| 时间 | 数周 | 数小时    |
| 人员 | 不同 | 相同      |
| 工具 | 不同 | 相同      |

### 2.11 Logs — 日志

将日志视为事件流。

```bash
# 输出到 stdout/stderr
console.log("Request processed");
console.error("Database connection failed");
```

| 规则       | 描述               |
| ---------- | ------------------ |
| 不管理日志 | 应用不关心日志存储 |
| 事件流     | 日志是连续的事件流 |
| 集中处理   | 由外部系统收集     |

### 2.12 Admin Processes — 管理进程

将管理任务作为一次性进程运行。

```bash
# 一次性管理任务
rails db:migrate
python manage.py migrate
npx prisma migrate deploy
```

| 规则     | 描述               |
| -------- | ------------------ |
| 一次性   | 运行后退出         |
| 同代码库 | 使用相同代码和配置 |
| 同环境   | 在相同环境中运行   |

## 3. 现代扩展

### 3.1 超越 12-Factor

| 新要素    | 描述           |
| --------- | -------------- |
| API First | API 优先设计   |
| Telemetry | 遥测与可观测性 |
| Security  | 安全左移       |
| Container | 容器化         |
| CI/CD     | 持续集成部署   |

### 3.2 与云原生的关系

12-Factor 是云原生的理论基础，CNCF 的很多项目（Kubernetes、Istio）都是 12-Factor 的工程实现。
