---
order: 19
title: DevOps与CICD集成
module: 'software-engineering'
category: 'eng-infra'
difficulty: intermediate
description: DevOps文化、CI/CD流水线、自动化测试集成与发布策略。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'software-engineering/软件度量'
  - 'software-engineering/技术债务管理'
prerequisites: []
---

## 1. DevOps概述

### 1.1 DevOps定义

DevOps是**开发（Development）和运维（Operations）**的融合，通过自动化和文化变革实现快速、可靠的软件交付。

### 1.2 CALMS框架

| 维度        | 说明                 |
| :---------- | :------------------- |
| Culture     | 共担责任、持续学习   |
| Automation  | 自动化一切可自动化的 |
| Lean        | 消除浪费、小批量交付 |
| Measurement | 数据驱动决策         |
| Sharing     | 知识和经验共享       |

### 1.3 DevOps工具链

| 阶段 | 工具                               |
| :--- | :--------------------------------- |
| 计划 | Jira、Trello                       |
| 编码 | Git、VS Code                       |
| 构建 | Maven、Gradle、Webpack             |
| 测试 | JUnit、Selenium、Jest              |
| 发布 | Jenkins、GitHub Actions、GitLab CI |
| 部署 | Docker、Kubernetes、Ansible        |
| 运维 | Prometheus、Grafana、ELK           |
| 监控 | Datadog、New Relic                 |

## 2. CI/CD流水线

### 2.1 持续集成（CI）

```
代码提交 → 自动构建 → 自动测试 → 代码质量检查 → 反馈
```

**CI原则**：

- 频繁提交（每天至少一次）
- 自动化构建
- 自动化测试
- 快速反馈（<10分钟）
- 主干开发

### 2.2 持续交付（CD）

```
CI通过 → 自动部署到Staging → 验收测试 → 人工批准 → 生产部署
```

### 2.3 持续部署

```
CI通过 → 自动部署到Staging → 自动测试 → 自动部署到生产
```

| 模式     | 生产部署 | 适用场景 |
| :------- | :------- | :------- |
| 持续集成 | 手动     | 早期团队 |
| 持续交付 | 人工批准 | 关键业务 |
| 持续部署 | 全自动   | SaaS产品 |

### 2.4 流水线示例

```yaml
# GitHub Actions
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t app:${{ github.sha }} .
      - run: docker push registry/app:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: kubectl set image deployment/app app=registry/app:${{ github.sha }}
```

## 3. 发布策略

### 3.1 发布模式

| 策略       | 说明                 | 风险 | 回滚难度 |
| :--------- | :------------------- | :--- | :------- |
| 大爆炸发布 | 一次性全量发布       | 高   | 难       |
| 蓝绿部署   | 两套环境切换         | 低   | 容易     |
| 金丝雀发布 | 逐步扩大发布比例     | 低   | 容易     |
| 滚动更新   | 逐个替换实例         | 中   | 中       |
| 特性开关   | 代码已部署，按需开启 | 低   | 容易     |

### 3.2 蓝绿部署

```
┌──────────┐     ┌──────────┐
│ 蓝环境    │     │ 绿环境    │
│ v1.0     │     │ v2.0     │
│ ← 流量   │     │          │
└──────────┘     └──────────┘
       │               │
       └─── 切换流量 ───┘
```

### 3.3 金丝雀发布

```
v1.0 ← 95%流量
v2.0 ← 5%流量  → 观察 → 10% → 25% → 50% → 100%
```

**监控指标**：

- 错误率
- 延迟（P50/P95/P99）
- CPU/内存使用率
- 业务指标

## 4. 质量门禁

### 4.1 CI质量门禁

| 检查项         | 阈值    | 说明     |
| :------------- | :------ | :------- |
| 单元测试通过率 | 100%    | 零容忍   |
| 测试覆盖率     | ≥80%    | 最低标准 |
| 代码规范       | 0 error | Lint检查 |
| 安全扫描       | 0 高危  | SAST检查 |
| 构建时间       | <10min  | 快速反馈 |

### 4.2 CD质量门禁

| 检查项       | 说明           |
| :----------- | :------------- |
| 集成测试通过 | 全部通过       |
| 性能测试     | 响应时间达标   |
| 安全扫描     | 无高危漏洞     |
| 人工审批     | 关键环境需审批 |

## 5. GitOps

### 5.1 核心原则

1. **声明式**：系统状态声明式描述
2. **版本控制**：所有变更通过Git
3. **自动拉取**：系统自动应用Git状态
4. **持续协调**：软件代理持续对比期望和实际状态

### 5.2 GitOps工作流

```
开发者 → Git提交 → CI构建镜像 → 更新Git仓库中的镜像标签
                                          │
                                          ▼
                              ArgoCD/Flux检测变更
                                          │
                                          ▼
                              自动部署到Kubernetes
```
