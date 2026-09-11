---
order: 300
title: CodeQL 代码扫描
module: 'github'
category: 工具链
difficulty: intermediate
description: GitHub CodeQL代码扫描详解：以安检机类比讲透语义分析原理、代码扫描配置、告警处理与自定义查询。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/210-IssuesTemplateTagMilestone'
  - 'github/290-SecretScanning'
  - 'github/320-RESTGraphQLAPI'
prerequisites:
  - 'github/010-GitHubOverview'
---


## 0. 先来一个生活场景：安检机

坐飞机时，你的行李箱会经过一台**安检机（X 光安检机）**。它不需要打开你的箱子，就能"看透"里面的物品结构：那把剪刀是不是藏在雨伞里、那个瓶子里的液体是不是超规——它分析的是**物品的形状、材质、结构关系**，而不是只看表面标签。

传统的代码检查工具（Linter）就像"看标签"：只检查"这行代码是不是符合语法格式"，看到 `=` 少了、分号丢了就报警。但很多漏洞**长得完全正常**：

```python
# 这行代码语法完美，但它是 SQL 注入漏洞
cursor.execute("SELECT * FROM users WHERE name = '" + user_input + "'")
```

语法检查器看不出问题，因为它不理解"`user_input` 是用户的输入，被拼进了 SQL 语句"这层**语义关系**。而 **CodeQL** 就是代码世界的"安检机"——它不打开你的"箱子"（不运行你的程序），但能通过分析代码的**结构关系**（谁调用谁、数据从哪里流到哪里）发现深藏的危险。

CodeQL 是 GitHub 开发的**静态代码分析引擎**，是 GitHub **代码扫描（Code Scanning）**功能的默认引擎。它的工作方式极具特色：先把你的代码"编译"成一个**CodeQL 数据库**（相当于给箱子拍了一张 3D 透视照片），然后在这张"照片"上运行**查询**（相当于安检员用培训过的眼睛扫描），最后把发现的问题作为**代码扫描告警（Code scanning alerts）**展示在 GitHub 上。

本文以"安检机"为线索展开：先讲 CodeQL 的透视原理（数据库与查询），再讲如何部署这台安检机（默认设置与高级设置），最后讲如何看懂告警并定制自己的"安检规则"（自定义查询）。

## 1. 原理：CodeQL 这台"安检机"是怎么工作的

### 1.1 直观理解：三步流程

```
源代码（你的行李）
    ↓ 第一步：提取（透视拍照）
CodeQL 数据库（3D 结构照片）
    ↓ 第二步：查询（安检扫描）
安全漏洞 / 代码缺陷（可疑物品清单）
    ↓ 第三步：上传（出具报告）
GitHub 上的代码扫描告警
```

### 1.2 原理：数据库（Database）

CodeQL 数据库不是"代码的副本"，而是代码的**关系化表示**。它提取了代码中的实体（类、函数、变量）和关系（谁调用谁、谁继承谁、数据流经哪些路径），存入关系数据库。这一步对**编译型语言**（C/C++、C#、Go、Java、Kotlin、Swift）尤其重要：需要先**构建代码**再提取数据；对解释型语言（JavaScript、Python、Ruby）则直接解析。

### 1.3 原理：查询（Query）

CodeQL 自带一套用 **QL 语言**写成的"标准安检规则库"（查询套件），覆盖常见漏洞类型：

| 漏洞类型 | 通俗解释 |
| :--- | :--- |
| SQL 注入 | 把用户输入拼进 SQL 语句 |
| XSS（跨站脚本） | 把用户输入直接输出到网页 |
| 路径遍历 | 用用户输入拼文件路径 |
| 不安全的反序列化 | 解析不可信数据时执行任意代码 |
| 硬编码凭证 | 代码里写死了密码/密钥 |
| 不安全的随机数 | 用可预测的随机数做安全用途 |

### 1.4 关键概念：语义分析 vs 语法检查

| 维度 | 传统 Linter | CodeQL |
| :--- | :--- | :--- |
| 分析对象 | 单行语法 | 全库结构关系 |
| 能否跨函数追踪 | 否 | 能（数据流分析） |
| 理解用户输入传播 | 否 | 能（污点分析） |
| 误报率 | 低 | 中（需人工确认） |
| 发现深层漏洞 | 差 | 强 |

**污点分析（Taint Analysis）**是 CodeQL 最核心的能力：它标记"不可信输入"（如 HTTP 请求参数），追踪它如何流经函数调用链，最终到达危险操作（如数据库查询）。这正是安检机"看透箱子内部结构"的技术实现。

## 2. 部署这台"安检机"：两种配置方式

GitHub 提供**默认设置（Default Setup）**和**高级设置（Advanced Setup）**两种部署方式。

### 2.1 方式一：默认设置（推荐新手，零配置）

仓库 → Settings → Code security and analysis → Code scanning → Set up → Default

默认设置自动完成三件事：

- 自动选择需要分析的语言。
- 自动选择查询套件（默认 security-and-quality）。
- 自动配置扫描触发时机（push / pull_request / 每周定时全量扫描）。

适合绝大多数项目，几分钟内即可上线。

### 2.2 方式二：高级设置（可定制工作流）

高级设置会在仓库生成一个可编辑的工作流文件 `.github/workflows/codeql.yml`：

```yaml
# .github/workflows/codeql.yml
name: "CodeQL"

on:
  push:
    branches: [ "main" ]            # 推送到 main 时扫描
  pull_request:
    branches: [ "main" ]            # PR 时扫描（早发现）
  schedule:
    - cron: '0 0 * * 1'             # 每周一 00:00 全量扫描

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      security-events: write         # 允许写入扫描结果
      actions: read
      contents: read

    strategy:
      fail-fast: false
      matrix:
        language: [ 'javascript-typescript', 'python' ]   # 要分析的语言

    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      # 初始化 CodeQL（创建数据库）
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v4
        with:
          languages: ${{ matrix.language }}
          config-file: ./.github/codeql/codeql-config.yml   # 可选：自定义配置

      # 自动构建（编译型语言自动识别构建方式）
      - name: Autobuild
        uses: github/codeql-action/autobuild@v4

      # 运行查询并上传结果
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v4
```

### 2.3 自定义配置：圈定扫描范围

```yaml
# .github/codeql/codeql-config.yml
name: "Custom CodeQL Config"

# 只扫描 src 和 lib 目录
paths:
  - src
  - lib

# 跳过测试目录（减少误报与耗时）
paths-ignore:
  - '**/test/**'
  - '**/tests/**'
  - '**/node_modules/**'

# 使用的查询套件
queries:
  - uses: security-and-quality          # GitHub 内置套件之一
  - uses: ./custom-queries/sql-injection.ql   # 自定义查询（第 4 节）
```

工作流中通过 `config-file` 引用该文件即可。

### 2.4 支持的语言

CodeQL 官方文档列出的支持范围（截至 2026 年）：

| 语言 | 数据库构建方式 | 分析类型 |
| :--- | :--- | :--- |
| JavaScript / TypeScript | 直接解析 | 安全 + 质量 |
| Python | 直接解析 | 安全 + 质量 |
| Java / Kotlin | 构建 | 安全 + 质量 |
| C / C++ | 构建 | 安全 + 质量 |
| C# | 构建 | 安全 + 质量 |
| Go | 构建 | 安全 + 质量 |
| Ruby | 直接解析 | 安全 |
| Swift | 构建 | 安全（beta 级支持） |
| Rust | 直接解析 | 安全（新支持） |

提示：`matrix` 中的语言标识符与日常叫法不同（如 JavaScript 在 CodeQL 中叫 `javascript-typescript`），配置时以官方文档为准。

## 3. 看懂安检报告：处理代码扫描告警

### 3.1 查看告警

```
仓库 → Security → Code scanning
```

每条告警包含：

- **漏洞类型**与严重级别。
- **触发位置**（文件 + 行号）。
- **数据流路径**（从输入到危险操作的完整链条，这是 CodeQL 的独门优势）。
- **修复建议**。

### 3.2 严重级别

| 级别 | 含义 | 处理建议 |
| :--- | :--- | :--- |
| Critical / Error | 确定的高危漏洞 | 立即修复 |
| Warning | 潜在安全问题 | 尽快评估 |
| Note | 建议性改进 | 择机处理 |

### 3.3 处理告警的三种动作

- **创建 Issue**：把告警转成 Issue 分派给负责人。
- **标记为已修复**：修复代码后让 GitHub 复核（扫描通过后自动关闭）。
- **关闭（忽略）**：误报时关闭，**必须填写原因**（如"此输入仅来自内部信任来源"），便于审计。

### 3.4 在 PR 中拦截漏洞

代码扫描默认会作为 PR 检查运行。可在分支保护规则中勾选 "Require status checks to pass before merging"，让存在高危告警的 PR 无法合并，把漏洞挡在合并之前。

## 4. 定制安检规则：编写 CodeQL 查询

CodeQL 的"安检规则"（查询）用 **QL 语言**编写。语法与 SQL 相似（`from` / `where` / `select`），但查询对象是代码结构而非数据表。

### 4.1 第一个查询：找出所有硬编码的密码赋值

```ql
/**
 * @name Hardcoded password
 * @description 检测硬编码的密码赋值
 * @kind problem
 * @id python/hardcoded-password
 * @severity warning
 */

import python

from Assignment a
where
  // 变量名包含 password / passwd / pwd
  a.target().toString().toLowerCase().matches("%password%") and
  // 赋值来源是字符串常量
  a.value() instanceof StrConst
select a, "疑似硬编码密码，请改用环境变量或密钥管理"
```

### 4.2 查询的结构解析

| 部分 | 作用 |
| :--- | :--- |
| 注释头（@name / @description / @kind / @severity） | 元数据，GitHub 据此展示告警 |
| `import python` | 导入语言库（换成 `javascript`、`java` 等即支持其他语言） |
| `from Assignment a` | 声明要遍历的实体（这里是"赋值语句"） |
| `where ...` | 过滤条件（这里是"目标含 password 且值为字符串"） |
| `select a, "提示信息"` | 输出命中的位置与提示 |

### 4.3 让自定义查询生效

```bash
# 方式1：通过配置文件（推荐）
# 在 codeql-config.yml 中：
#   queries:
#     - uses: ./custom-queries/sql-injection.ql
# 然后工作流 init 步骤传入 config-file

# 方式2：本地用 CodeQL CLI 验证
codeql database create mydb --language=python
codeql query run mydb ./custom-queries/sql-injection.ql
```

### 4.4 官方查询库（抄作业）

不必从零写查询。GitHub 官方维护了 [codeql](https://github.com/github/codeql) 仓库，内含海量查询。内置查询套件：

- `security-extended`：安全漏洞扩展套件。
- `security-and-quality`：安全 + 质量（推荐默认）。
- `security-experimental`：实验性查询（误报较多）。

## 5. 安检机的维护：最佳实践

1. **PR 阶段必扫**：在 pull_request 事件上运行，漏洞早发现、成本最低。
2. **定期全量扫描**：用 schedule 事件每周扫描一次，覆盖 PR 之外的代码。
3. **优先处理高危**：按严重级别排序，先修 Critical / High。
4. **误报要留痕**：关闭告警时写明原因，方便日后审计与模型改进。
5. **与其他防线配合**：CodeQL 查"自己代码"的漏洞，Dependabot 管"依赖"漏洞，Secret Scanning 管"密钥"泄露——三者互补（见 016、018 文档）。
6. **关注数据流路径**：告警自带"输入→危险操作"链路图，修代码时修源头（输入校验），而不是修末端。

## 6. 常见错误与对策

| 错误现象 | 报错/表现 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 编译型语言扫描失败 | `Autobuild failed` / 数据库为空 | 构建环境或构建命令未配置 | 高级设置中手动指定 build 步骤；确认依赖安装完整 |
| 扫描没覆盖所有代码 | 告警集中在部分目录 | 默认路径限制或语言未全选 | 在 codeql-config.yml 调整 paths；matrix 中补充语言 |
| `languages` 配置报错 | `Invalid language: javascript` | CodeQL 语言标识符与日常叫法不同 | 改用官方标识符（如 `javascript-typescript`） |
| 告警太多无从下手 | 上千条告警 | 默认套件 + 未排除测试代码 | 用 paths-ignore 排除测试；按严重级别筛选；用 default 设置的重扫减少噪音 |
| 误报处理不当 | 真实漏洞被误关闭 | 关闭告警未填写原因，或关闭条件判断错误 | 关闭时如实填写理由；高危误报建议先在本地复现验证 |
| 扫描时间过长 | CI 超时 | 仓库过大或语言过多 | 并行矩阵（fail-fast: false）；按目录拆分扫描；只扫改动文件（PR 模式） |
| 想让 PR 阻止合并 | 有漏洞仍合并了 | 未启用状态检查强制 | 分支保护规则勾选对应 status check 为 required |

## 8. 一句话记忆

> **CodeQL 是代码世界的"安检机"：它不看代码表面（语法），而是给代码拍"透视照片"（数据库）再用"规则眼睛"（查询）扫描——发现 SQL 注入、XSS 这类藏在结构里的深层漏洞，并在 PR 合并前拦下它们。**

### 官方文档

- 关于 CodeQL 代码扫描（GitHub 官方）：https://docs.github.com/zh/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning-with-codeql
- CodeQL 支持的语言与框架：https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/
- 自定义代码扫描（工作流与配置）：https://docs.github.com/zh/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/customizing-code-scanning
- GitHub 官方查询库 github/codeql：https://github.com/github/codeql

### 延伸阅读
- 密钥扫描（保护另一类资产：密钥），见 004-github 模块 018 文档。
- Dependabot（扫描"别人的代码"——依赖），见 004-github 模块 016 文档。
- 依赖安全选项（供应链安全全景），见 004-github 模块 010 文档。
- GitHub Actions 触发器（push / pull_request / schedule 详解），见 004-github 模块 030 文档。
