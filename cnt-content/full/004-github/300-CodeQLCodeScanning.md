---
order: 300
title: CodeQL 代码扫描：让机器看懂「数据从哪流到哪」
module: 'github'
category: 工具链
difficulty: intermediate
description: 从「一行语法完全正常的代码，其实是 SQL 注入」这个真实问题切入，动手用 Default Setup 十分钟开启代码扫描，讲清 CodeQL 数据库与查询的原理、告警怎么读怎么关，以及什么时候才需要自定义查询。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'github/290-SecretScanning'
  - 'github/280-Dependabot'
  - 'github/380-ActionsTrigger'
prerequisites:
  - 'github/010-GitHubOverview'
---

## 前置知识

- 仓库已推上 GitHub，语言是 CodeQL 支持的（JavaScript/TypeScript、Python、Go、Java、C#、C/C++、Ruby、Swift、Rust）；
- 大致知道 Actions 工作流长什么样（见 [GitHub Actions 与 CI/CD](/github/370-GitHubActionsCICD)）。

## 学习目标

读完全文你将能够：

1. 说清 CodeQL 和 Linter 的本质区别（语法检查 vs 数据流分析）；
2. 用 Default Setup 几分钟给仓库开启代码扫描，不用写一行 YAML；
3. 读懂一条告警里的「数据流路径」，并按正确姿势处理误报；
4. 知道什么时候需要切到 Advanced Setup 和自定义配置。

## 1. 问题：Linter 抓不住的漏洞

看这行 Python：

```python
# 语法完全正常，但它是 SQL 注入
cursor.execute("SELECT * FROM users WHERE name = '" + user_input + "'")
```

ESLint、Pylint 这类工具查的是**单行语法**：分号、括号、命名规范。这行代码语法挑不出任何毛病，但语义上是把用户输入直接拼进了 SQL。要发现它，必须理解两个事实：`user_input` 来自不可信来源，它流进了一个危险操作。这种「追踪数据从哪来、流到哪去」的能力叫**污点分析**，正是 CodeQL 的核心。

CodeQL 是 GitHub 代码扫描（Code Scanning）的默认引擎，工作分三步：

```
源代码
  ↓ 提取：把代码编译成 CodeQL 数据库（实体与关系的结构化表示）
查询：在数据库上跑规则（谁调用谁、数据流经哪里）
  ↓ 上传
GitHub 上的 Code scanning alerts
```

对解释型语言（JS/TS、Python、Ruby）直接解析源码；对编译型语言（Java、Go、C# 等）需要先构建再提取。日常使用你不需要关心这个细节，工具自己处理。

## 2. 动手：Default Setup，几分钟上线

```
仓库 → Settings → Code security and analysis → Code scanning → Set up → Default
```

Default Setup 自动完成三件事：识别仓库语言、选好查询套件（security-and-quality）、配置触发时机（push 到 main、PR、每周定时全量扫）。保存后第一次扫描开始跑，几分钟到几十分钟（取决于仓库大小），完成后去 **Security → Code scanning** 看结果。

每条告警包含：漏洞类型与严重级别、触发位置（文件 + 行号）、**数据流路径**、修复建议。数据流路径是 CodeQL 的独门优势——它会画出「用户输入在第 12 行进入 → 经过三个函数传递 → 在第 40 行拼进 SQL」的完整链条。修的时候修源头（在入口做校验或参数化查询），而不是在末端打补丁。

关闭误报时**必须填原因**（例如「此输入仅来自内部可信来源」），这个理由会留痕，是安全审计的依据。确认修复的告警会在下次扫描后自动关闭。

## 3. 讲原理：什么时候需要 Advanced Setup

Default Setup 够用就不折腾。出现这些需求时切换到 Advanced Setup（Settings → Code scanning → Set up → Advanced），它会生成可编辑的 `.github/workflows/codeql.yml`：

- 需要圈定扫描范围（跳过测试目录、vendored 代码）；
- 需要自定义查询套件或自写查询；
- 编译型语言构建方式特殊，Autobuild 认不出来。

一个 FANDEX 这类 TypeScript 仓库的典型工作流：

```yaml
# .github/workflows/codeql.yml
name: "CodeQL"

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'    # 每周一全量扫描

jobs:
  analyze:
    runs-on: ubuntu-24.04
    permissions:
      security-events: write   # 写入扫描结果必须的权限
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v6
      - uses: github/codeql-action/init@v4
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v4
```

两个容易踩的细节：

- 语言标识符和日常叫法不同：JavaScript/TypeScript 在 CodeQL 里叫 `javascript-typescript`，写 `javascript` 会报 `Invalid language`；
- 多语言用 `strategy.matrix` 并行分析，`fail-fast: false` 保证一个语言失败不影响另一个。

扫描范围用独立配置文件圈定，工作流里通过 `config-file` 引用：

```yaml
# .github/codeql/codeql-config.yml
paths:
  - src
paths-ignore:
  - '**/test/**'
  - '**/*.test.ts'
queries:
  - uses: security-and-quality
```

## 4. 自定义查询：知道有这回事就够了

规则用 QL 语言写，形似 SQL（`from` / `where` / `select`），查询对象是代码结构。一个「找出硬编码密码赋值」的示意查询：

```ql
/**
 * @name Hardcoded password
 * @kind problem
 * @severity warning
 */
import python

from Assign a
where
  a.target().toString().matches("%password%") and
  a.value() instanceof StringLiteral
select a, "疑似硬编码密码，改用环境变量或密钥管理"
```

但入门阶段不建议自己写。官方在 [github/codeql](https://github.com/github/codeql) 仓库维护了海量现成查询，内置套件三档：

- `security-extended`：安全漏洞扩展套件；
- `security-and-quality`：安全 + 质量（推荐默认）；
- `security-experimental`：实验性，误报偏多。

自写查询的正确路径是：先用内置套件跑一段时间 → 沉淀出反复出现的误报模式 → 再针对性地写查询或调整配置。QL 类名以官方语言库文档为准，不要凭记忆手写。

## 5. 让扫描真正拦住合并

代码扫描会作为 PR 检查运行。要让「存在高危告警的 PR 合不了」，去[分支保护规则](/github/170-BranchModelBranchRule)勾选对应 status check 为 required。没有这一步，扫描只是「记录在案」，不是「门禁」。

三道安全防线的分工，最后对齐一次：

| 防线 | 管什么 |
| :--- | :--- |
| CodeQL | 你自己代码里的漏洞（注入、XSS、路径遍历） |
| Dependabot | 依赖（别人的代码）里的已知漏洞 |
| Secret Scanning | 密钥泄露 |

## 6. 坑点与自检

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| `Autobuild failed` | 编译型语言构建环境没配好 | Advanced Setup 手写 build 步骤；确认依赖装全 |
| `Invalid language: javascript` | 语言标识符写错 | 用 `javascript-typescript` 等官方标识符 |
| 告警上千条没法看 | 未排除测试目录、套件太激进 | `paths-ignore` 排除测试；按严重级别筛选 |
| 真漏洞被当误报关了 | 关闭前没验证 | 高危告警先本地复现再决定；关闭必填原因 |
| 扫描太慢拖垮 CI | 仓库大、语言多 | 矩阵并行 + `fail-fast: false`；PR 只扫增量，全量留给每周 schedule |
| 有漏洞的 PR 照样合并 | 没把检查设为 required | 分支保护规则勾选对应检查 |

自检三问：

1. 你仓库的代码扫描是 Default 还是 Advanced？为什么这么选？
2. 最近一条告警的数据流路径，你能从入口指到终点吗？
3. 分支保护里，CodeQL 检查是 required 吗？

## 7. 练习

1. 给自己的仓库开 Default Setup，等首次扫描完成，挑一条 Warning 级告警读懂数据流路径。
2. 故意提交一个拼接 SQL 的测试函数（不开 PR，推到独立分支），确认扫描能抓到它。
3. 把测试目录加进 `paths-ignore`，对比扫描耗时和告警数变化。

## 下一步

- 同一条安全线上的另外两环：[密钥扫描与推送保护](/github/290-SecretScanning)、[Dependabot 实战](/github/280-Dependabot)
- `on:` 里的 push / pull_request / schedule 三种触发器细讲：[Actions 触发器](/github/380-ActionsTrigger)
- 把扫描检查变成合并门禁：[分支模型与分支保护规则](/github/170-BranchModelBranchRule)

### 官方文档

- 关于 CodeQL 代码扫描：https://docs.github.com/zh/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning-with-codeql
- 支持的语言与框架：https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/
- 自定义代码扫描：https://docs.github.com/zh/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/customizing-code-scanning
- 官方查询库：https://github.com/github/codeql
