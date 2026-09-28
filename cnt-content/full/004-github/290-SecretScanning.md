---
order: 290
title: 密钥扫描与推送保护：密钥进了公开仓库，就当它已经泄露
module: 'github'
category: 工具链
difficulty: intermediate
description: 从「调试时把 API Key 硬编码进代码，push 完才想起来」这个真实事故切入，动手开启 Secret Scanning 与 Push Protection，讲清 GitHub 怎么认出密钥、被拦截后怎么处理、真泄露了按什么顺序补救，最后给出用 gh secret 管理密钥的正确姿势。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'github/300-CodeQLCodeScanning'
  - 'github/280-Dependabot'
  - 'github/070-GitignoreConfig'
prerequisites:
  - 'github/010-GitHubOverview'
---

## 前置知识

- 知道 `git push` 之后提交就进入远程历史（见 [Git 远程仓库操作](/git/150-GitRemoteRepoOperation)）；
- 用过 `.gitignore` 排除文件（见 [Gitignore 深度解析](/git/040-GitignoreDeepDive)）。

## 学习目标

读完全文你将能够：

1. 解释为什么「删掉文件再 push 一次」救不回已泄露的密钥；
2. 给仓库启用 Secret Scanning 和 Push Protection，并在 push 被拦截时知道两个正确选项；
3. 为自家服务的密钥格式写一条自定义扫描模式，并用 dry run 验证；
4. 密钥真泄露时，按「先撤销、再清理」的顺序完成补救。

## 1. 问题：一次 push，通行证就交出去了

真实场景：联调第三方支付接口，你把 `sk_live_xxx` 直接写进了 `src/config.ts` 调试，功能跑通后 `git push`，十分钟才反应过来仓库是公开的。

这不是「删掉就行」的小事，因为三件事已经发生：

1. Git 历史永久保留了这次提交，`git log` 随时翻得到；
2. 别人 fork 过的副本不随你的删除消失；
3. 自动化爬虫扫描公开仓库的延迟以秒计——GitHub 官方立场很直接：**推送到公开仓库的密钥应视为已泄露**。

密钥的本质是服务的通行证：AWS Access Key 能操作你的云资源，Stripe 密钥能扣用户的钱，GitHub Token 能读写你的仓库。攻击者不需要攻破你的服务器，拿到通行证就能以你的身份登录。

GitHub 对此给了两道自动化防线：**Secret Scanning**（事后扫出已进仓库的密钥）和 **Push Protection**（push 那一刻拦住）。

## 2. 动手：两道防线各 30 秒开启

```
仓库 → Settings → Code security and analysis
```

1. 找到 **Secret scanning**，点 Enable；
2. 同页找到 **Push protection**，点 Enable。

公开仓库这两项免费可用；私有仓库取决于套餐。也可以在组织级别统一开启，对所有仓库生效。

验证 Push Protection 是否生效，做一个安全测试：

```bash
echo 'AWS_KEY=AKIAIOSFODNN7EXAMPLE' > secret-test.txt
git add secret-test.txt
git commit -m "test: 验证推送保护"
git push
```

GitHub 会拒绝这次推送并指出命中的模式（这是 AWS 文档的示例 Key，不会真的泄露什么）。测试完 `git reset HEAD~1 && rm secret-test.txt` 清掉即可。

## 3. 讲原理：GitHub 怎么「认出」一个密钥

模式匹配是核心：每种密钥类型有一条「指纹」正则——GitHub Token 以 `ghp_` 开头，AWS Access Key 以 `AKIA` 开头。目前支持 200 种以上模式，分三类：

| 类别 | 说明 | 示例 |
| :--- | :--- | :--- |
| 服务商模式 | 绑定具体服务商 | AWS、Azure、Stripe 的 Key 格式 |
| 通用模式 | 不绑定服务商 | 私钥块、数据库连接串 |
| AI 检测模式 | 无固定格式的密码类 | 普通口令字符串 |

扫描范围不止代码：所有分支历史、PR 与 Issue 的标题正文评论、网页上传的文件都会查。

告警有三种去向：

| 告警类型 | 展示位置 | 说明 |
| :--- | :--- | :--- |
| 用户告警 | Security → Secret scanning alerts | 最常见，自己处理 |
| 推送保护告警 | 同上 | 有人绕过拦截强行推入时生成 |
| 合作伙伴告警 | 直接通知服务商 | 命中 Partner 计划模式时，AWS 等服务商可能主动封禁该密钥 |

告警条目会给出密钥类型、文件路径、行号、所在 commit。处理方式：先按第五节的流程撤销密钥，再把告警标记为已解决；误报可以关闭并写明原因。

## 4. 被推送保护拦截时，两个正确选项

拦截提示大致长这样：

```text
remote: error: GH013: Repository rule violation.
remote: Push blocked. Secret detected: AWS Access Key ID
remote: 文件 src/config.ts 第 12 行
```

- **选项一（默认正确）**：把密钥从代码里拿掉，改用环境变量或 `.env`（并把 `.env` 加进 `.gitignore`），然后重新提交推送。注意是重新 `commit`，不是只改工作区文件——拦截看的是提交内容。
- **选项二**：确认是占位符或测试数据（比如上面那个 `AKIAIOSFODNN7EXAMPLE`），在网页端填写理由申请放行。

绕过是允许的，但每次绕过都会生成「绕过告警」，管理员可见。把它当最后手段。

## 5. 自定义模式：自家密钥也要有人盯

内置模式只认公共服务商。你公司自己的 Key（比如 `MYCO_` 前缀）没人扫，去这里加：

```
Settings → Code security and analysis → Custom patterns → New pattern
```

```regex
# 自家 API Key：前缀明确 + 固定长度
MYCO_API_KEY_[A-Za-z0-9]{32}

# 带分隔的十六进制密钥对
MYCO-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}
```

三个原则：

1. **宁可漏报，不要误报**：`[A-Za-z0-9]{20}` 这种宽正则会把正常文本全匹配进来，告警很快没人看；
2. **把上下文写进正则**：连 `api_key =` 这样的赋值前缀一起匹配，精度立刻上来；
3. **先 dry run 再发布**：用仓库现网内容试运行，确认命中的都是真密钥。

## 6. 真泄露了：四步补救，顺序不能错

**第一步：撤销并重建（最重要，先做这个）**

1. 登录对应服务平台（AWS / Stripe / GitHub 等）；
2. 撤销旧密钥；
3. 生成新密钥；
4. 更新所有使用方（环境变量、CI Secrets、服务器）。

先撤旧的再换新的。代码层面的清理在这一步之后——清理只是减少扩散，撤销才切断攻击者的通行证。

**第二步：从代码与历史中移除**

```bash
# 从工作区移除，改用环境变量
# 需要抹历史时（团队协作场景慎用）：
git filter-repo --path src/config.ts --invert-paths
git push --force --all
```

强推改写历史，会打断所有协作者，且私有仓库的 fork 不受你控制。多数时候第一步做完，这步可以降级为「只清理当前代码」。

**第三步：审查暴露范围**——去服务端查操作日志、账单、异常登录；用密钥片段在 GitHub 搜索是否被复制到别处；检查 Actions 日志里有没有把它打出来。

**第四步：防止再犯**——`.gitignore` 排除 `.env`；密钥只进 GitHub Secrets；本地装 pre-commit 钩子在 push 前自查：

```bash
pip install detect-secrets pre-commit
detect-secrets scan > .secrets.baseline
pre-commit install
```

## 7. 配套：密钥的正确存放位置是 GitHub Secrets

不硬编码的另一半是把密钥放进 GitHub 的密钥存储，供 Actions 使用。用 `gh` 管理最顺手：

```bash
gh secret set DATABASE_URL            # 交互式输入
gh secret set API_KEY --body "sk-12345"
gh secret set DEPLOY_KEY < ~/.ssh/id_rsa   # 从文件读
gh secret list && gh secret delete API_KEY
```

工作流里通过 `secrets` 上下文取用（见 [Actions 环境部署](/github/420-ActionsEnvironmentDeploy)）：

```yaml
steps:
  - name: Deploy
    env:
      API_KEY: ${{ secrets.API_KEY }}
    run: ./deploy.sh
```

注意一个特性：`secrets.API_KEY` 在日志里会被自动打码为 `***`，而硬编码在代码里的密钥被 `echo` 出来就是明文。这也是「用 Secrets 而不是环境文件」的硬理由之一。

## 8. 坑点与自检

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| push 被拦截 `Push blocked` | 提交内容命中密钥模式 | 移除密钥改环境变量后重推；确为占位符再申请放行 |
| 删了文件告警还在 | Git 历史永久保留 | 先撤销密钥；确需抹历史用 `git filter-repo` |
| 自定义模式疯狂误报 | 正则过宽 | 加上下文前缀；先 dry run |
| 设置页找不到开关 | 仓库类型或套餐不支持 | 公开仓库免费；私有仓库看组织套餐 |
| 清理了代码但密钥还在被用 | 只清理没撤销 | 第一步必须是服务端撤销重建 |
| `.env` 提交了才发现 | `.gitignore` 没配或文件已被跟踪 | `git rm --cached .env` 停止跟踪，撤销密钥，补 `.gitignore` |

自检三问：

1. 你的仓库 Push Protection 开了吗？用一个假 Key 试过拦截吗？
2. 你项目的 `.env` 在 `git ls-files` 的输出里吗？
3. 如果明天发现上周的密钥泄露了，你能不能说出四步的顺序？

## 9. 练习

1. 在自己的仓库按第二节开启两道防线，并用示例 AWS Key 做一次拦截测试。
2. 给一个你自己编的密钥格式（如 `DEMO_KEY_` 前缀 + 24 位字母数字）建一条自定义模式，dry run 验证。
3. 把你本地项目里所有「看起来像密钥」的字符串找出来（`grep -rnE "(api[_-]?key|token|secret).{0,4}=.{8,}" src/`），确认它们都走环境变量。

## 下一步

- 另一类自动安全防线，扫的是代码漏洞而不是密钥：[CodeQL 代码扫描](/github/300-CodeQLCodeScanning)
- 依赖里的漏洞交给机器人修：[Dependabot 实战](/github/280-Dependabot)
- 把 `.env` 类文件挡在仓库外的规则写法：[Gitignore 深度解析](/git/040-GitignoreDeepDive)

### 官方文档

- 关于密钥扫描：https://docs.github.com/zh/code-security/secret-scanning/introduction/about-secret-scanning
- 推送保护：https://docs.github.com/zh/code-security/secret-scanning/push-protection-for-repositories/about-push-protection-for-repositories
- 支持的扫描模式清单：https://docs.github.com/zh/code-security/secret-scanning/introduction/supported-secret-scanning-patterns
- 自定义模式：https://docs.github.com/zh/code-security/secret-scanning/customizing-secret-scanning/defining-custom-patterns-for-secret-scanning
