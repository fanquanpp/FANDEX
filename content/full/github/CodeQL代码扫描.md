---
order: 61
title: CodeQL代码扫描
module: github
category: GitHub
difficulty: intermediate
description: 'GitHub CodeQL代码扫描：静态分析、查询编写与安全漏洞检测。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'github/Issues模板-标签与里程碑'
  - github/密钥扫描
  - github/命令行工具
  - 'github/REST与GraphQL-API'
prerequisites:
  - github/GitHub概述
---

## 1. CodeQL 概述

### 1.1 什么是 CodeQL

CodeQL 是 GitHub 的**静态代码分析引擎**，通过将代码转换为数据库并运行查询来发现安全漏洞和代码缺陷。

### 1.2 工作原理

```
源代码 → CodeQL 数据库 → 运行查询 → 发现问题
```

## 2. 配置代码扫描

### 2.1 使用默认配置

```yaml
# .github/workflows/codeql.yml
name: CodeQL
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1' # 每周一

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript, python
      - uses: github/codeql-action/analyze@v3
```

### 2.2 支持的语言

| 语言                      | 分析类型    |
| :------------------------ | :---------- |
| **JavaScript/TypeScript** | 安全 + 质量 |
| **Python**                | 安全 + 质量 |
| **Java**                  | 安全 + 质量 |
| **C/C++**                 | 安全 + 质量 |
| **C#**                    | 安全 + 质量 |
| **Go**                    | 安全 + 质量 |
| **Ruby**                  | 安全        |
| **Swift**                 | 安全        |
| **Kotlin**                | 安全        |

### 2.3 自定义配置

```yaml
# .github/codeql/codeql-config.yml
name: Custom CodeQL Config
paths:
  - src
  - lib
paths-ignore:
  - '**/test/**'
  - '**/tests/**'
queries:
  - uses: security-and-quality
  - uses: ./custom-queries
```

## 3. 查看扫描结果

### 3.1 Security 选项卡

仓库 → Security → Code scanning alerts

### 3.2 告警级别

| 级别        | 说明           |
| :---------- | :------------- |
| **Error**   | 确定的安全漏洞 |
| **Warning** | 潜在的安全问题 |
| **Note**    | 建议性改进     |

### 3.3 常见检测

- SQL 注入
- XSS（跨站脚本）
- 路径遍历
- 不安全的反序列化
- 硬编码凭证
- 不安全的随机数

## 4. 自定义查询

### 4.1 CodeQL 查询语法

```ql
/**
 * @name SQL injection
 * @description Detects SQL injection vulnerabilities
 * @kind path-problem
 * @security-severity 9.0
 */

import python

from Call call, StrConst sql
where
  call.getFunc().hasName("execute") and
  sql = call.getArg(0) and
  exists(Call format |
    format.getFunc().hasName("format") and
    format = sql.getAChild*()
  )
select call, "Potential SQL injection"
```

### 4.2 查询套件

```yaml
# codeql-suite.yml
name: Custom Query Suite
queries:
  - uses: security-and-quality
  - uses: ./custom-queries/sql-injection.ql
```

## 5. 最佳实践

- 在 PR 中运行代码扫描，及早发现问题
- 定期运行全量扫描（schedule）
- 关注高严重性告警
- 将误报标记为已忽略并说明原因
- 结合其他安全工具（Dependabot、密钥扫描）
