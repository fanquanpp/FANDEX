---
order: 290
title: 无服务器架构
module: 'cloud-computing'
category: 云与基础设施
difficulty: intermediate
description: 无服务器架构：Serverless Framework、Lambda 冷启动优化与事件驱动。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'cloud-computing/027-MultiCloudHybridArchitecture'
  - 'cloud-computing/028-LoadBalanceAutoScaling'
  - 'cloud-computing/030-CloudMigration6RStrategy'
prerequisites:
  - 'cloud-computing/001-CloudComputingBasics'
---

## 1. Serverless 原理

### 1.1 FaaS 与 BaaS

FaaS 与 BaaS是无服务器架构的重要组成部分。本节详细介绍FaaS 与 BaaS的核心概念、工作原理和实际应用。

**关键要点**：

- FaaS 与 BaaS的定义与核心原理
- FaaS 与 BaaS的实现方式与技术细节
- FaaS 与 BaaS在实际场景中的应用与最佳实践
- FaaS 与 BaaS的常见问题与解决方案

FaaS 与 BaaS在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 1.2 事件驱动模型

事件驱动模型是无服务器架构的重要组成部分。本节详细介绍事件驱动模型的核心概念、工作原理和实际应用。

**关键要点**：

- 事件驱动模型的定义与核心原理
- 事件驱动模型的实现方式与技术细节
- 事件驱动模型在实际场景中的应用与最佳实践
- 事件驱动模型的常见问题与解决方案

事件驱动模型在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 2. Lambda 优化

### 2.1 冷启动原因

冷启动原因是无服务器架构的重要组成部分。本节详细介绍冷启动原因的核心概念、工作原理和实际应用。

**关键要点**：

- 冷启动原因的定义与核心原理
- 冷启动原因的实现方式与技术细节
- 冷启动原因在实际场景中的应用与最佳实践
- 冷启动原因的常见问题与解决方案

冷启动原因在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.2 预留并发

预留并发是无服务器架构的重要组成部分。本节详细介绍预留并发的核心概念、工作原理和实际应用。

**关键要点**：

- 预留并发的定义与核心原理
- 预留并发的实现方式与技术细节
- 预留并发在实际场景中的应用与最佳实践
- 预留并发的常见问题与解决方案

预留并发在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.3 Provisioned Concurrency

Provisioned Concurrency是无服务器架构的重要组成部分。本节详细介绍Provisioned Concurrency的核心概念、工作原理和实际应用。

**关键要点**：

- Provisioned Concurrency的定义与核心原理
- Provisioned Concurrency的实现方式与技术细节
- Provisioned Concurrency在实际场景中的应用与最佳实践
- Provisioned Concurrency的常见问题与解决方案

Provisioned Concurrency在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 3. Serverless Framework

### 3.1 项目结构

项目结构是无服务器架构的重要组成部分。本节详细介绍项目结构的核心概念、工作原理和实际应用。

**关键要点**：

- 项目结构的定义与核心原理
- 项目结构的实现方式与技术细节
- 项目结构在实际场景中的应用与最佳实践
- 项目结构的常见问题与解决方案

项目结构在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.2 部署与回滚

部署与回滚是无服务器架构的重要组成部分。本节详细介绍部署与回滚的核心概念、工作原理和实际应用。

**关键要点**：

- 部署与回滚的定义与核心原理
- 部署与回滚的实现方式与技术细节
- 部署与回滚在实际场景中的应用与最佳实践
- 部署与回滚的常见问题与解决方案

部署与回滚在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 4. 架构模式

### 4.1 API Gateway + Lambda

API Gateway + Lambda是无服务器架构的重要组成部分。本节详细介绍API Gateway + Lambda的核心概念、工作原理和实际应用。

**关键要点**：

- API Gateway + Lambda的定义与核心原理
- API Gateway + Lambda的实现方式与技术细节
- API Gateway + Lambda在实际场景中的应用与最佳实践
- API Gateway + Lambda的常见问题与解决方案

API Gateway + Lambda在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 4.2 事件管道

事件管道是无服务器架构的重要组成部分。本节详细介绍事件管道的核心概念、工作原理和实际应用。

**关键要点**：

- 事件管道的定义与核心原理
- 事件管道的实现方式与技术细节
- 事件管道在实际场景中的应用与最佳实践
- 事件管道的常见问题与解决方案

事件管道在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 4.3 限制与对策

限制与对策是无服务器架构的重要组成部分。本节详细介绍限制与对策的核心概念、工作原理和实际应用。

**关键要点**：

- 限制与对策的定义与核心原理
- 限制与对策的实现方式与技术细节
- 限制与对策在实际场景中的应用与最佳实践
- 限制与对策的常见问题与解决方案

限制与对策在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。
## Serverless Framework 安装

**基本写法：安装 Serverless CLI**
`npm install -g serverless`
```bash
# 全局安装 Serverless Framework
npm install -g serverless
```

---

**基本写法：查看版本**
`serverless --version`
```bash
# 查看当前 Serverless CLI 版本
serverless --version
```

---

**基本写法：查看帮助**
`serverless --help`
```bash
# 查看所有可用命令
serverless --help
```

---

## 凭证配置

**基本写法：配置 AWS 凭证**
`serverless config credentials --provider aws --key <访问密钥> --secret <私密密钥>`
```bash
# 为 Serverless 配置 AWS 部署凭证
serverless config credentials --provider aws --key AKIAIOSFODNN7EXAMPLE --secret wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

---

**基本写法：指定 profile 部署**
`serverless deploy --aws-profile <配置名>`
```bash
# 使用特定 AWS profile 部署
serverless deploy --aws-profile production
```

---

## 项目创建

**基本写法：创建 AWS Python 项目**
`serverless create --template aws-python3 --path <路径>`
```bash
# 创建 Python 3 项目模板
serverless create --template aws-python3 --path my-service
```

---

**基本写法：创建 AWS Node.js 项目**
`serverless create --template aws-nodejs --path <路径>`
```bash
# 创建 Node.js 项目模板
serverless create --template aws-nodejs --path my-service
```

---

**基本写法：从已有模板创建**
`serverless create --template-url <GitHub URL> --path <路径>`
```bash
# 从 GitHub 模板创建项目
serverless create --template-url https://github.com/serverless/examples/tree/main/aws-node-rest-api --path my-api
```

---

## 部署操作

**基本写法：部署服务**
`serverless deploy [--stage <环境>] [--region <区域>]`
```bash
# 部署到 dev 环境的 us-east-1 区域
serverless deploy --stage dev --region us-east-1
```

---

**基本写法：部署单个函数**
`serverless deploy function --function <函数名>`
```bash
# 仅快速部署单个函数代码
serverless deploy function --function myHandler
```

---

**基本写法：部署详细输出**
`serverless deploy --verbose`
```bash
# 显示部署详细日志
serverless deploy --verbose
```

---

**基本写法：移除服务**
`serverless remove [--stage <环境>]`
```bash
# 删除服务及所有关联资源
serverless remove --stage dev
```

---

## 调用与日志

**基本写法：调用函数**
`serverless invoke --function <函数名> [--stage <环境>]`
```bash
# 在云端调用指定函数
serverless invoke --function myHandler --stage dev
```

---

**基本写法：本地调用函数**
`serverless invoke local --function <函数名>`
```bash
# 在本地环境调用函数便于调试
serverless invoke local --function myHandler
```

---

**基本写法：传递事件数据**
`serverless invoke --function <函数名> --path <事件文件>`
```bash
# 通过 JSON 文件传入事件
serverless invoke --function myHandler --path event.json
```

---

**基本写法：查看函数日志**
`serverless logs --function <函数名> [--tail]`
```bash
# 实时跟踪函数日志
serverless logs --function myHandler --tail
```

---

**基本写法：查看所有日志流**
`serverless logs --function <函数名> --startTime <时间>`
```bash
# 查看指定时间起的日志
serverless logs --function myHandler --startTime 1h
```

---

## 配置文件

**基本写法：serverless.yml 基本结构**
```yaml
# Serverless 服务配置文件
service: my-service
frameworkVersion: '3'
provider:
  name: aws
  runtime: python3.12
  region: us-east-1
functions:
  hello:
    handler: handler.hello
```

---

**基本写法：配置 HTTP 事件**
```yaml
# 为函数绑定 HTTP API 触发器
functions:
  api:
    handler: handler.api
    events:
      - httpApi:
          path: /users
          method: get
```

---

**基本写法：配置定时触发**
```yaml
# 配置 EventBridge 定时触发
functions:
  cron:
    handler: handler.cron
    events:
      - schedule:
          rate: cron(0 12 * * ? *)
          enabled: true
```

---

**基本写法：配置环境变量**
```yaml
# 为函数注入环境变量
functions:
  hello:
    handler: handler.hello
    environment:
      TABLE_NAME: my-table
      STAGE: ${sls:stage}
```

---

## 信息查看

**基本写法：查看已部署信息**
`serverless info [--stage <环境>]`
```bash
# 查看服务部署摘要与端点
serverless info --stage dev
```

---

**基本写法：打印编译后配置**
`serverless print [--stage <环境>]`
```bash
# 输出变量解析后的完整配置
serverless print --stage dev
```

---

**基本写法：滚动更新函数**
`serverless rollback --function <函数名> --version <版本>`
```bash
# 回滚函数到指定历史版本
serverless rollback --function myHandler --version 5
```

---

## 插件管理

**基本写法：安装插件**
`npm install --save-dev <插件名>`
```bash
# 安装 serverless-offline 插件用于本地模拟
npm install --save-dev serverless-offline
```

---

**基本写法：在配置中启用插件**
```yaml
# 在 serverless.yml 中注册插件
plugins:
  - serverless-offline
  - serverless-python-requirements
```
