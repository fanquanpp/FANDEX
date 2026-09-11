---
order: 280
title: Dependabot
module: 'github'
category: 工具链
difficulty: intermediate
description: Dependabot详解：从漏洞警报、安全更新到版本更新的完整故事，含 dependabot.yml 配置、分组更新与自动合并最佳实践。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/210-IssuesTemplateTagMilestone'
  - 'github/290-SecretScanning'
prerequisites:
  - 'github/010-GitHubOverview'
---


## 0. 先讲一个故事：依赖被攻击的那个夜晚

凌晨 2 点，运维群里炸了锅。

"线上服务异常，请求大量 500 报错！"

你爬起来打开日志，发现攻击者的 payload 正在利用一个**已知漏洞**——而漏洞所在的地方，不是你的代码，而是你三个月前安装的一个 npm 依赖包。你翻遍 release notes 才发现：这个包上个月就发布了修复版本，漏洞公告也早就公开了，只是**没有人看到，也没有人更新**。

第二天复盘时，大家总结出一个扎心的结论：**不是不会出问题，而是问题出在"没人及时发现、没人及时更新"上**。

如果那晚，你的仓库里有一位"自动体检医生"，故事的结局会完全不同：

- 漏洞公开的**当天**，它就会拉响警报，告诉你"你的依赖 X 中招了"。
- 修复版本发布后，它会**自动开好"处方"**——一个升级依赖的 PR，附带 CI 检查。
- 你白天打开电脑，只需要像审阅普通 PR 一样点一下"合并"。

这位"自动体检医生"就是 **Dependabot**——GitHub 内置的依赖管理机器人。它承担三件工作：**体检（漏洞告警）、开药（安全更新）、保健（版本更新）**。

本文用**故事驱动**的结构展开：从"出事那晚"出发，带你认识 Dependabot 的三大职责，然后手把手配置它，最后学会让机器人"听话"（分组、忽略、自动合并）。

## 1. Dependabot 是谁：三种角色一张表

Dependabot 本质上是 GitHub 的官方机器人账号（`dependabot[bot]`）。它有三个相互独立的职责：

| 职责 | 触发条件 | 动作 | 是否需要配置文件 |
| :--- | :--- | :--- | :--- |
| **Dependabot Alerts（体检）** | 依赖被披露存在漏洞/恶意包 | 在 Security 选项卡生成告警 | 否（设置页开关） |
| **Security Updates（开药）** | 存在漏洞告警且可用安全版本 | 自动创建修复 PR | 否（设置页开关） |
| **Version Updates（保健）** | 按计划定期检查新版本 | 自动创建版本升级 PR | **是（dependabot.yml）** |

注意一个关键区别：**Dependabot alerts 不能用 dependabot.yml 配置**，它由仓库设置控制；`dependabot.yml` 只控制版本更新（部分选项同时影响安全更新 PR 的样式）。

## 2. 第一幕：体检——Dependabot Alerts

### 2.1 原理：警报是怎么响起来的

Dependabot 做两件事：

1. 扫描仓库中的清单文件与锁定文件（依赖图谱提供数据）。
2. 与 GitHub Advisory Database（GitHub 漏洞公告数据库）交叉比对。

一旦发现你的依赖版本落在漏洞影响范围内，就在仓库的 **Security → Dependabot** 页面生成告警。**触发的三种时机**：

- 新漏洞披露并进入数据库。
- 已有漏洞公告更新（严重性、受影响版本变化）。
- 依赖图谱变化引入了新的脆弱依赖。

### 2.2 告警长什么样

一条典型的告警包含：

- 依赖名称、当前版本、受影响版本范围。
- 漏洞描述与 CVSS 严重性评分。
- 传播路径（哪个直接依赖把漏洞包带进来的）。
- 推荐的修复版本。

### 2.3 操作：启用体检

```
仓库 → Settings → Code security and analysis → Dependabot alerts → Enable
```

对**公开仓库免费且默认启用**（视账号设置）；私有仓库需在设置中开启。

### 2.4 管理告警

- 每个告警可标记为：打开 / 关闭（需说明理由：已修复、误报、暂不处理）。
- 支持按严重性、生态系统、依赖名筛选。
- 告警数据可通过 REST API 拉取，用于团队安全看板。

## 3. 第二幕：开药——Security Updates

### 3.1 原理：从告警到 PR 的自动化

启用安全更新后，当存在漏洞告警且**存在可用的安全版本**时，Dependabot 会自动创建修复 PR，把依赖升级到安全版本。PR 会：

- 自动触发仓库的 CI（如有）。
- 在说明中列出修复的 CVE 与严重性。
- 关联对应告警。

```markdown
# 典型的 Dependabot 安全更新 PR 说明

## Bumps lodash from 4.17.15 to 4.17.21

修复漏洞：
- CVE-2021-23337: Command injection（命令注入）
- CVE-2020-28500: ReDoS vulnerability（正则拒绝服务）

CVSS Score: 7.2 (High)

所有 CI 检查通过后可合并此 PR。
```

### 3.2 操作：启用开药

```
仓库 → Settings → Code security and analysis → Dependabot security updates → Enable
```

### 3.3 安全更新的边界

- 只升级到**修复漏洞的版本**，不做多余升级。
- 若生态系统中没有安全版本，则不创建 PR（需要你手动升级或换依赖）。
- 安全更新的 PR 同样受 `dependabot.yml` 中部分选项影响（如 reviewers、labels、groups）。

## 4. 第三幕：保健——Version Updates（版本更新）

### 4.1 原理：主动保持依赖新鲜

安全更新是"被动响应"（有漏洞才动）；版本更新是"主动保健"（按计划检查所有依赖是否有新版本，有就开 PR）。它**依赖语义化版本（SemVer）**而非依赖图谱，即使依赖没有漏洞也会工作。

### 4.2 操作：创建 dependabot.yml（核心步骤）

版本更新**必须**通过提交 `.github/dependabot.yml` 配置文件启用。文件有两个必需的顶层键：`version`（必须为 2）和 `updates`。

```yaml
# .github/dependabot.yml
version: 2
updates:
  # 配置块1：npm 前端依赖
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'          # 每周检查一次
      day: 'monday'               # 周一执行
      time: '09:00'
      timezone: 'Asia/Shanghai'

  # 配置块2：Python 后端依赖
  - package-ecosystem: 'pip'
    directory: '/backend'
    schedule:
      interval: 'monthly'

  # 配置块3：GitHub Actions 本身（工作流文件也要保持最新）
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
```

提交该文件会**立即触发一次版本更新检查**，之后按 schedule 周期执行。

### 4.3 支持的生态系统速查

| 生态系统 | package-ecosystem 取值 | 识别文件 |
| :--- | :--- | :--- |
| npm / yarn | `npm` | `package-lock.json`、`yarn.lock` |
| pip | `pip` | `requirements.txt`、`Pipfile.lock` |
| Maven | `maven` | `pom.xml` |
| Gradle | `gradle` | `build.gradle` |
| Go | `gomod` | `go.mod`、`go.sum` |
| Cargo | `cargo` | `Cargo.lock` |
| NuGet | `nuget` | `*.csproj` |
| Docker | `docker` | `Dockerfile` |
| GitHub Actions | `github-actions` | 工作流文件 |

### 4.4 更新频率选择

| interval 取值 | 含义 | 适用场景 |
| :--- | :--- | :--- |
| `daily` | 每天检查 | 活跃开发、安全敏感项目 |
| `weekly` | 每周检查（推荐默认） | 大多数项目 |
| `biweekly` | 每两周 | 节奏稳定的团队 |
| `monthly` | 每月 | 维护模式、低频项目 |

## 5. 让机器人"听话"：高级配置

### 5.1 完整配置示例（带注释）

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'saturday'
      time: '02:00'
    # 同时最多保持 5 个打开的更新 PR，避免刷屏
    open-pull-requests-limit: 5
    # 自动指派审查人与受让人
    reviewers:
      - 'dev-team'
    assignees:
      - 'tech-lead'
    # 自动打标签
    labels:
      - 'dependencies'
      - 'automated'
    # 提交信息风格
    commit-message:
      prefix: 'chore'
      include: 'scope'
    # 允许只更新生产依赖
    allow:
      - dependency-type: 'production'
    # 忽略特定依赖或大版本
    ignore:
      - dependency-name: 'webpack'
        versions: ['>=5.0.0']
      - dependency-name: 'lodash'
    # 有冲突时自动变基
    rebase-strategy: 'auto'
    # 目标分支
    target-branch: 'develop'
```

### 5.2 分组更新：把多个小 PR 合成一个

依赖多时，每天开 5 个 PR 会淹没团队。用 `groups` 把同类的合并成一个 PR：

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    groups:
      # 把所有测试相关依赖的更新合并为一个 PR
      test-dependencies:
        patterns:
          - 'jest*'
          - '*vitest*'
      # 所有小版本升级合并为一个 PR
      minor-and-patch-updates:
        applies-to: version-updates
        update-types:
          - 'minor'
          - 'patch'
```

分组后 PR 数量大幅减少，审查成本显著下降。

### 5.3 检查 Dependabot 运行状态

```
仓库 → Insights → Dependency graph → Dependabot
```

可查看每个更新作业的状态、日志与最近一次检查结果，排查"为什么没开 PR"。

## 6. 自动化流水线：让 PR 自己跑完 CI 并自动合并

### 6.1 原理：Dependabot PR 也是 PR

Dependabot 创建的 PR 与普通 PR 一样会触发 CI。合理配置后，安全补丁类更新可以做到"CI 通过即合并"，把人工负担降到最低。

### 6.2 自动合并工作流

```yaml
# .github/workflows/auto-merge.yml
name: Auto Merge Dependabot PRs
on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    # 只处理 Dependabot 机器人创建的 PR
    if: ${{ github.actor == 'dependabot[bot]' }}
    steps:
      - name: 查看 PR 元数据
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          alert-lookup: true

      - name: 启用自动合并
        run: gh pr merge --auto --merge "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 6.3 条件自动合并：只合并安全更新

```yaml
      - name: 只对安全更新启用自动合并
        run: |
          if [ "${{ steps.metadata.outputs.update-type }}" = "version-update:semver-patch" ] || \
             [ "${{ steps.metadata.outputs.update-type }}" = "version-update:semver-minor" ]; then
            gh pr merge --auto --squash "$PR_URL"
          fi
```

注意：自动合并仍受**分支保护规则**约束（如"必须通过 CI""必须有代码所有者批准"）。如果团队对某些目录设置了 CODEOWNERS 强制审查，自动合并同样会等待批准，这是有意为之的安全兜底。

## 7. 常见错误与对策

| 错误现象 | 报错/表现 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 配置后没有 PR | Dependabot 页面显示 "no updates" | `directory` 写错、清单文件不在该目录，或依赖已是最新 | 用 Insights → Dependency graph → Dependabot 查看作业日志 |
| YAML 报错 | `Dependabot couldn't parse the config file` | 缩进错误、键名拼写错误 | 对照官方配置选项参考逐项核对；文件必须以 `version: 2` 开头 |
| 每天 PR 太多，刷屏 | 邮件轰炸 | 未设置 `open-pull-requests-limit`，或 interval 过密 | 设置 `open-pull-requests-limit: 5`；改用 weekly；用 `groups` 合并 |
| 大版本升级导致构建失败 | CI 红 | 破坏性变更（breaking changes） | 用 `ignore` 排除大版本；升级前阅读 release notes；分批升级 |
| 安全更新不自动开 PR | 有告警但无 PR | 安全更新开关未启用，或无安全版本可用 | Settings 启用 Security updates；手动升级或更换依赖 |
| 自动合并不生效 | PR 挂起不合并 | 分支保护要求审查/CI 未通过；或 workflow 权限不足 | 确认保护规则放行；为 workflow 声明 `pull-requests: write`、`contents: write` 权限 |
| 私有注册源（私有 npm 包）无法更新 | 401 认证失败 | Dependabot 无法访问私有仓库 | 在 dependabot.yml 中添加 `registries` 配置并设置认证凭据 |

## 9. 一句话记忆

> **Dependabot 是你的"自动体检医生"：Alerts 负责发现漏洞（体检）、Security Updates 负责自动修复（开药）、Version Updates 按计划保持依赖新鲜（保健），一份 dependabot.yml 就能让它在你的仓库"上岗"。**

### 官方文档

- Dependabot 版本更新配置（dependabot.yml 选项参考）：https://docs.github.com/zh/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file
- Dependabot alerts 文档：https://docs.github.com/zh/code-security/dependabot/dependabot-alerts/about-dependabot-alerts
- 配置 Dependabot 安全更新：https://docs.github.com/zh/code-security/dependabot/dependabot-security-updates/configuring-dependabot-security-updates
- Dependabot 官方元数据 Action（fetch-metadata）：https://github.com/dependabot/fetch-metadata

### 延伸阅读
- 依赖安全选项（供应链攻击原理与四道防线），见 004-github 模块 010 文档。
- 密钥扫描（另一种自动安全防线），见 004-github 模块 018 文档。
- GitHub Actions CI/CD（自动合并工作流的载体），见 004-github 模块 029 文档。
