---
order: 290
title: 密钥扫描
module: 'github'
category: 工具链
difficulty: intermediate
description: GitHub密钥扫描详解：密钥泄露危害原理、自动检测、推送保护、自定义模式与泄露补救措施。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/210-IssuesTemplateTagMilestone'
  - 'github/300-CodeQLCodeScanning'
prerequisites:
  - 'github/010-GitHubOverview'
---


## 0. 先来一个生活场景：保险箱与监控

你家的保险箱里放着银行卡、存折和房产证。你给自己定了三条规矩：

1. **保险箱不随手放在客厅**——它的存在本身就容易被盯上。
2. **出门前检查门窗**——别等小偷进屋了再后悔。
3. **如果钥匙真的丢了，第一时间换锁**——而不是祈祷小偷不来。

软件世界里的"保险箱"就是你的**密钥（Secret）**：API Key、Token、数据库密码、SSH 私钥。而最危险的存放方式，就是把它**硬编码进代码并推到 GitHub**。

为什么这么危险？因为 GitHub 是给全世界看的。你推送到**公开仓库**的每一个 commit 都会被永久保存——即使你马上删除，克隆过、fork 过、缓存过的副本依然存在。GitHub 官方的说法很直接：**推送到公共仓库的密钥应视为已泄露**。攻击者会用自动化爬虫扫描 GitHub 上所有公开的密钥模式，一秒钟就能把你的 AWS 账号、云服务器、支付接口接管。

GitHub 的**密钥扫描（Secret Scanning）**就是你的"监控 + 门窗检查 + 换锁提醒"：

- 扫描仓库历史，找出已泄露的密钥（监控）。
- **推送保护（Push Protection）**在你 push 之前拦截含密钥的代码（门窗检查）。
- 发现泄露后告诉你**立即撤销密钥**（换锁提醒）。

本文按**原理驱动**的结构展开：先讲透"密钥泄露为什么可怕"，再讲 GitHub 如何自动发现（两类扫描：事后扫描与推送保护），最后讲泄露后的补救。

## 1. 原理：密钥泄露为什么可怕

### 1.1 直观理解：密钥 = 通行证

```javascript
// 危险写法：密钥直接写在代码里
const AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE";

// 危险：一旦这个文件被 push 到公开仓库
// → 爬虫扫描到 → 用你的 AWS 密钥调用云服务 → 账单爆炸 / 数据泄露
```

密钥的本质是**服务的通行证**：AWS Access Key 可以操作你的云资源，Stripe Secret Key 可以扣用户的钱，GitHub Token 可以读写你的仓库。拿到通行证，攻击者不需要攻破你的服务器，直接以你的身份登录。

### 1.2 原理：公开仓库的"永久存档"效应

很多人以为"我删掉文件再 push 一次就没事了"。事实是：

1. **历史记录保留**：Git 的每一次 commit 都永久保存在 `.git` 历史中，`git log` 随时能翻出来。
2. **fork 扩散**：别人 fork 过的副本，不会因为你的删除而消失。
3. **缓存与爬虫**：GitHub 的缓存、第三方爬虫、代码搜索索引都会留下副本。

所以结论只有一个：**密钥一旦进入公开仓库，就当它已经泄露，立即撤销重建**。这正是 GitHub 密钥扫描存在的意义——帮你"尽早发现，尽早换锁"。

### 1.3 原理：GitHub 如何"认出"密钥

密钥扫描使用**模式匹配（Pattern Matching）**技术：为每一种密钥类型定义"指纹"（正则表达式），例如 GitHub Token 以 `ghp_` 开头，AWS Access Key 以 `AKIA` 开头。扫描时逐行比对，命中即告警。GitHub 支持的模式分三类：

| 类别 | 说明 | 检测方式 | 示例 |
| :--- | :--- | :--- | :--- |
| **通用模式** | 不绑定具体服务商，如私钥、数据库连接串 | 正则 | `rsa_private_key` |
| **服务商模式** | 绑定具体服务商，如 AWS、Azure、Stripe | 正则 | `aws_access_key_id` |
| **AI 检测模式** | 密码等非结构化密钥 | AI 模型 | `password` |

目前 GitHub 支持检测 **200 种以上**的密钥类型，且持续扩充（GitHub 官方 changelog 显示每个季度都会新增模式）。

## 2. 密钥扫描：事后扫描（发现已泄露的密钥）

### 2.1 原理：扫描什么

密钥扫描会对仓库的**全部内容**进行检查，包括：

- 所有分支的提交历史。
- PR 描述、Issue 描述、评论。
- 上传到仓库的文件（拖拽上传）。

**三种告警类型**：

| 告警类型 | 展示位置 | 触发场景 |
| :--- | :--- | :--- |
| **用户告警** | 仓库 Security 与质量选项卡 | 检测到受支持的密钥模式 |
| **推送保护告警** | 同上 | 有人绕过推送保护强行推送 |
| **合作伙伴告警** | 直接通知密钥对应的服务商 | 命中 Partner 计划内模式，服务商可协助撤销 |

特别值得一提的是 **Partner 告警**：GitHub 与 AWS、Azure、Google、Slack、Stripe 等服务商合作，发现对应模式的密钥后会**直接通知服务商**，服务商可以主动采取保护措施（如封禁该密钥）。

### 2.2 操作：查看告警

```
仓库 → Security → Secret scanning alerts
```

每条告警显示：密钥类型、文件路径、所在行、检测时间、泄露位置（commit/PR/Issue）。

### 2.3 处理告警

- **撤销密钥**：到对应服务平台删除并重新生成（第 5 节详述）。
- **标记告警状态**：修复后标记为"已解决"；误报可关闭并说明原因。
- **告警分级**：可按严重性、密钥类型筛选，优先处理服务商模式的真实密钥。

## 3. 推送保护：出门前的门窗检查

### 3.1 原理：把风险挡在 push 之前

事后扫描是"进门后的监控"——密钥已经进了仓库才报警。**推送保护（Push Protection）**更进一步：在 `git push` 提交到 GitHub 的瞬间检查内容，发现密钥就**拦截推送**，并提示开发者处理。

推送保护覆盖的入口不仅限于命令行 push，还包括：GitHub 网页编辑提交、文件上传、REST API 请求等。

### 3.2 工作流程

```mermaid
flowchart TD
    T0["开发者执行 git push"]
    T1["GitHub 检查推送内容"]
    T2["发现密钥模式？"]
    T3["是 → 拦截推送，显示警告"]
    T4["选项1：移除密钥后重新推送"]
    T5["选项2：确认为误报 → 申请放行"]
    T6["否 → 正常推送"]
    T0 --> T1
    T1 --> T2
    T2 -->|是| T3
    T3 --> T4
    T3 --> T5
    T2 -->|否| T6
```

### 3.3 操作：启用推送保护

```
仓库 → Settings → Code security and analysis → Secret scanning → Push protection → Enable
```

也可以在组织级别统一启用，对所有仓库生效。

### 3.4 被拦截时的处理

当你 push 被拦截，GitHub 会给出详细提示：

```
remote: error: Push blocked.
remote: 检测到疑似密钥：AWS Access Key ID
remote: 文件：src/config.js，第 12 行
remote: 请移除密钥后重试，或确认这是测试数据后提交绕过申请。
```

- **正确做法**：移除硬编码的密钥，改用环境变量，重新提交。
- **确认是测试数据/误报**：在网页端填写原因申请放行（管理员可审核放行记录）。
- **强烈不建议**：绕过保护。每次绕过都会生成"推送保护绕过告警"，管理员可见。

## 4. 自定义模式：识别"你家的专属密钥"

内置模式覆盖主流服务商，但你可能有用自家服务的密钥格式（例如 `MYCOMPANY_API_KEY_` 开头）。此时可定义**自定义模式（Custom Patterns）**。

### 4.1 操作：添加自定义模式

```
仓库（或组织）→ Settings → Code security and analysis → Custom patterns → New pattern
```

配置要点：

- **Pattern name**：模式名称。
- **Secret format**：正则表达式（描述密钥格式）。
- **Test strings**：提供测试样例，验证匹配效果。
- **Save and dry run**：先"试运行"扫描，查看命中结果，确认无误报后再发布（Publish）。

### 4.2 正则示例

```regex
# 示例：检测自家服务的 API Key（32 位字母数字）
MYCOMPANY_API_KEY=[A-Za-z0-9]{32}

# 示例：检测带前缀的密钥对
# 前缀 MYCO-，后接 4 组 4 位十六进制
MYCO-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}
```

**写自定义模式的三个原则**：

1. **宁可漏报、不要误报**：太宽泛的正则（如 `[A-Za-z0-9]{20}`）会匹配大量正常文本，淹没真实告警。
2. **利用周边上下文**：把密钥名（如 `api_key =`）也纳入正则，提高精度。
3. **先用 dry run 验证**：在仓库上试运行，检查命中样本是否符合预期。

## 5. 泄露了怎么办：四步换锁流程

如果密钥已经泄露（无论是被扫描发现还是自己发现），按以下顺序操作：

### 5.1 第一步：撤销并重建密钥（最重要）

```
1. 登录密钥对应的服务平台（AWS / GitHub / Stripe 等）
2. 删除/撤销泄露的密钥
3. 生成新的密钥
4. 更新使用方（环境变量、CI 配置、服务器）
```

**注意顺序**：先撤销旧的，再启用新的，避免服务中断。

### 5.2 第二步：从代码与历史中移除

```bash
# 把密钥从当前代码中移除，改用环境变量
# 使用 git filter-repo 从历史中彻底清除（如有需要）
git filter-repo --path src/config.js --invert-paths

# 强制推送（会改写历史，需与团队协调）
git push --force --all
```

**重要**：改写历史只能减少扩散，不能消除已泄露的事实——**撤销密钥才是根本**。另外 `git push --force` 会改写历史，破坏团队协作，操作前必须与协作者沟通并遵守分支保护规则。

### 5.3 第三步：审查暴露范围

- 在 GitHub 搜索框用 `"泄露密钥片段"` 搜索你的密钥是否出现在其他公开仓库。
- 检查该仓库的 fork 列表、Actions 日志（密钥可能被写入日志）。
- 检查密钥是否有对应服务的操作记录（账单、登录日志），评估实际损失。

### 5.4 第四步：防止再次发生

- 用 `.gitignore` 排除含密钥的文件（见 008 文档）。
- 使用环境变量 + GitHub Secrets 存储密钥。
- 安装本地预提交钩子，push 前本地检测：

```bash
# 安装 detect-secrets 并配置 pre-commit 钩子
pip install detect-secrets pre-commit
detect-secrets scan > .secrets.baseline
pre-commit install
```

## 6. 配套知识：用 GitHub Secrets 存储密钥（而不是硬编码）

密钥扫描解决"发现"；**存储方案**解决"根本不用硬编码"。GitHub 提供多层密钥存储：

### 6.1 仓库级 Secrets（Actions 使用）

```bash
# 设置密钥（交互式输入）
gh secret set DATABASE_URL

# 从字符串设置
gh secret set API_KEY --body "sk-12345"

# 从文件读取
gh secret set DEPLOY_KEY < ~/.ssh/id_rsa

# 列出（不显示值）与删除
gh secret list
gh secret delete API_KEY
```

### 6.2 组织与环境级 Secrets

```bash
# 组织级密钥（对指定仓库可见）
gh secret set DEPLOY_TOKEN --org myorg --repos "repo1,repo2"

# 环境级密钥（仅生产环境部署可用）
gh secret set DB_PASS --env production
```

### 6.3 在 Actions 工作流中使用

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 使用密钥
        env:
          API_KEY: ${{ secrets.API_KEY }}
        run: ./deploy.sh
```

## 7. 常见错误与对策

| 错误现象 | 报错/表现 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| push 被拦截 | `Push blocked. Secret detected...` | 推送内容包含密钥模式 | 移除硬编码密钥改用环境变量后重推；确为测试数据再申请放行 |
| 以为删除文件就安全了 | 密钥扫描仍提示历史泄露 | Git 历史永久保留、fork 扩散 | 撤销密钥重建（第一优先级）；需要时用 git filter-repo 清理历史 |
| 自定义模式疯狂误报 | 告警全是正常文本 | 正则过宽 | 缩小匹配范围；利用密钥名上下文；先用 dry run 验证 |
| 密钥扫描不生效 | 设置页无密钥扫描选项 | 仓库类型/套餐不支持，或未启用 | 公开仓库免费；私有仓库需组织启用对应安全功能 |
| 泄露后只清理不撤销 | 攻击者仍在用密钥 | 清理代码不影响已泄露的密钥 | 先在服务端撤销重建，再清理代码 |
| 把密钥放进 .env 却提交了 .env | 密钥随仓库公开 | `.gitignore` 未配置或 .env 已被跟踪 | 用 `git rm --cached .env` 停止跟踪；撤销密钥；配置 .gitignore |

## 9. 一句话记忆

> **密钥是服务的通行证，进了公开仓库就等于交了底——Secret Scanning 负责找出已泄露的密钥（监控），Push Protection 负责在 push 前拦截（门窗检查），而真正的救命稻草永远是"撤销重建"（换锁）。**

### 官方文档

- 关于密钥扫描（GitHub 官方）：https://docs.github.com/zh/code-security/secret-scanning/introduction/about-secret-scanning
- 关于推送保护：https://docs.github.com/zh/code-security/secret-scanning/push-protection-for-repositories/about-push-protection-for-repositories
- 支持的密钥扫描模式（200+ 类型清单）：https://docs.github.com/zh/code-security/secret-scanning/introduction/supported-secret-scanning-patterns
- 定义自定义模式：https://docs.github.com/zh/code-security/secret-scanning/customizing-secret-scanning/defining-custom-patterns-for-secret-scanning

### 延伸阅读
- Gitignore 配置（用 .gitignore 排除敏感文件），见 004-github 模块 008 文档。
- CodeQL 代码扫描（另一类自动安全防线），见 004-github 模块 019 文档。
- Dependabot（依赖漏洞自动修复），见 004-github 模块 016 文档。
