---
order: 160
title: 提交签名验证
module: 'github'
category: 工具链
difficulty: intermediate
description: GitHub 平台侧的提交签名验证：verified 徽章判定条件、分支保护 required signatures、组织级强制策略、Dependabot 与机器人提交的签名例外、DCO/CLA 集成，附 FANDEX 开启提交验证演练与一把 SSH key 同时 push 与签名的方案。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'git/350-SignedCommitsAndSecurityPractices'
  - 'github/170-BranchModelBranchRule'
  - 'github/180-PullRequestCompleteCollaborationFlow'
  - 'github/110-GitTagManage'
  - 'github/280-Dependabot'
prerequisites:
  - 'github/010-GitHubOverview'
  - 'git/350-SignedCommitsAndSecurityPractices'
---

# 提交签名验证

## 知识点地图

- **知识类别**：平台级身份保障——提交签名验证（commit signature verification）。签名是 Git 层的密码学操作，**验证与强制**是 GitHub 平台层的管理动作，本篇专讲后者。
- **解决什么问题**：Git 的 author/committer 只是两行可随意填写的文本——任何人都能以你的名字提交。签名让「这是密钥持有者写的」变成可密码学验证的声明；但签名只有配合平台的**验证与强制策略**才产生约束力：徽章给读者看，分支保护给协作链上锁，组织策略给全企业兜底。
- **什么时候用到**：
  - 给个人/项目仓库开启提交验证（本篇的 FANDEX 演练）；
  - 企业仓库要求「全部 verified commits」的落地；
  - 开源项目引入 DCO/CLA 合规流程；
  - 排查「为什么 Dependabot 的 PR 没有 verified 徽章」这类例外问题。
- **跨模块划界（重要）**：签名密钥的**生成、`git commit -S` / `git tag -s` 操作、GPG 与 SSH 两种方案的完整配置**在 [Git 提交签名与安全实践](/git/350-SignedCommitsAndSecurityPractices)（003-git 模块），本篇不重复——读本文前请先在那边把本地签名跑通。本文聚焦 GitHub 侧：徽章怎么判定、策略怎么强制、例外怎么处理。

## 1. verified 徽章的判定条件

GitHub 给提交打 **Verified** 徽章的完整条件（按 docs.github.com 的判定描述）：

1. 提交带有 GPG 或 SSH 签名（`gpgsig` 头），且签名**密码学有效**；
2. 签名密钥（公钥）已**上传到 GitHub 账户**（Settings → SSH and GPG keys）；
3. 签名者的邮箱与提交的 **author/committer 邮箱一致**，且该邮箱已**在 GitHub 账户中验证**（verified email）；
4. committer 身份与签名身份匹配（committer 是签名密钥对应的账户）。

四条里最容易翻车的是第 3 条：邮箱不一致是最常见的「本地 `git verify-commit` 显示 Good signature、GitHub 却不打徽章」原因——本地验证只查密码学有效性，GitHub 还要**把签名绑定到平台账户**。排查命令：

```bash
git log --show-signature -1          # 本地：密码学验证
git log -1 --format='%ae / %ce'      # 对照 author 与 committer 邮箱
gh api /user/emails                  # GitHub 账户里已验证的邮箱列表
```

三个都对上，push 之后提交历史里的绿色 Verified 徽章才会出现。Web 与 PR 页面、`gh api repos/OWNER/REPO/commits`（`verification.verified` 字段）都能读到验证状态。

## 2. 一把 SSH key 同时用于 push 与签名

003-git/350 讲过 SSH 签名的完整配置，这里给出工程上最省事的形态——**同一把 ED25519 密钥既认证又签名**：

```bash
# 1) 告诉 git 用这把 key 签名（keychain 里的认证 key）
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519
git config --global commit.gpgsign true

# 2) 同一把公钥在 GitHub 上传两次角色：
#    Settings → SSH and GPG keys → New SSH key
#    - 一次 Authentication Key（管 push/pull）
#    - 一次 Signing Key（管提交签名）
gh ssh-key add ~/.ssh/id_ed25519.pub --title "dev-machine"           # 认证用
gh ssh-key add ~/.ssh/id_ed25519.pub --title "dev-machine-signing" --type signing  # 签名用
```

两把「角色」的好处是零额外密钥管理：不需要维护 GPG 私钥的过期、吊销、信任链——SSH 密钥没有 Web of Trust 的心智负担。代价与取舍：GPG 支持过期时间与子密钥体系（适合高合规要求），SSH 路线胜在简单（适合绝大多数个人与团队），选型对比的完整表格在 [Git 提交签名与安全实践](/git/350-SignedCommitsAndSecurityPractices)。

## 3. 分支保护：required signatures

个人自觉签名是自愿的，**分支保护把它变成强制的**：

```text
仓库 Settings → Branches → Add branch protection rule → main：
  勾选 Require signatures
    —— 没有有效签名的提交无法合入 main
```

配套考量三条：

- **与 required reviews 叠加**：签名证明「是谁写的」，review 证明「写得对不对」——两者正交，生产分支通常同时开启（分支模型全景见 [分支模型与分支规则](/github/170-BranchModelBranchRule)）；
- **历史提交的既成事实**：开启后，历史中未签名的提交不影响（保护只作用于**新的**合并），但 rebase 重写历史后的提交需要重新签名；
- **机器人与依赖 PR 的例外**（下一节）——开了 required signatures 之后第一波撞墙的就是它们。

## 4. 例外处理：Dependabot 与机器人提交

Dependabot 与大多数 GitHub App（GitHub Actions 的 github-actions bot 除外）的提交**没有你账户的签名**——它们的提交以 bot 身份做出。开了 required signatures 后：

| 提交来源 | 签名状态 | 能否过 required signatures |
| --- | --- | --- |
| Dependabot 版本更新 PR | GitHub 自身签发（平台侧处理） | 能——GitHub 对 Dependabot 分支的合并做了豁免处理 |
| GitHub App 创建的提交 | 无用户签名 | 多数不能——需要按仓库策略放开或让 App 改走 PR 评论/_checks 通道 |
| `github-actions[bot]` | GitHub 平台签名（Web-flow GPG） | 能——Actions 产物提交自带平台签名 |
| 本地未签名的普通提交 | 无 | 不能——这正是强制的目的 |

工程上的两条处理路径：

1. **收缩 App 的写路径**：让自动化只创建 PR、不直接 push 到保护分支（App 走 PR + 人工或自动 review 合并）；
2. **本地机器人的补救**：自托管的自动化若必须直接 push，给它配独立的机器账户 + 专属签名密钥，并把该密钥公钥加入机器账户——签名体系的完整性优先于「豁免名单」。

## 5. 组织级强制与企业落地

个人仓库在仓库设置里点勾，组织则要考虑规模化：

```text
Organization Settings → Repository → Repository defaults 与
Security → Code security →（结合）Branch protection 的组织级基线：
  1. 用 Rulesets（组织级规则集）把 required signatures 
     应用到一组仓库（如所有 ./*）而不必逐仓库点勾
  2. 搭配 Code owners + required reviews 形成完整门禁
```

企业落地脚本（真实演练形态，可用 gh API 批量下发）：

```bash
# 用 gh api 给仓库的 main 分支挂上 required signatures（Rulesets/分支保护 API）
gh api --method POST repos/OWNER/REPO/rulesets \
  -f name='require-signed-commits' \
  -f target='branch' -f enforcement='active' \
  -F conditions='{"ref_name":{"include":["~DEFAULT_BRANCH"],"exclude":[]}}' \
  -F rules='[{"type":"signature"}]'
```

落地三步曲：先全组织统计现状（`gh api` 拉各仓库最近提交的 `verification.verified` 比例）→ 修最大的失分项（通常是「邮箱未验证」与「CI 里 rebase 后丢签名」）→ 分批挂 Rulesets。 Rolling out 的节奏与门禁文化同 [协作规范](/github/150-CollaborationDevelopmentStandard)。

## 6. DCO 与 CLA：开源项目的合规集成

签名验证之外，开源项目还有一道「法律侧的提交背书」——**DCO**（Developer Certificate of Origin）与 **CLA**（Contributor License Agreement）：

- **DCO**：贡献者在每个提交上声明「我有权以这个身份贡献此代码」，操作是 `git commit -s`（signed-off，注意 `-s` 是 DCO 声明，`-S` 大写才是 GPG 签名——一对最容易混的参数）。提交尾会多一行 `Signed-off-by: Name <email>`；
- **CLA**：更重的法律协议（贡献者版权/专利授权），通常由 CLA 助手 App 在 PR 上自动检查签署状态；
- 两者的检查都可以用 GitHub App + 分支保护（required checks）强制——「签名（密码学身份）+ DCO（法律声明）」组合是 Linux 内核与大量基金会的标准姿势。

FANDEX 这类个人主导的项目用 DCO 足矣（轻量、git 原生）；接受企业贡献后若需要 CLA，选托管服务并写在 [贡献指南](/github/250-CommunityHealthFile) 里。

## 7. 动手实践

### 练习一：给 FANDEX 仓库开启提交验证（真实演练）

任务：完成从「本地签名跑通」到「GitHub 徽章点亮」的全链路：SSH key 配置（003-git/350）→ GitHub 上传 Signing Key → 最近一次提交 rebase 重签 → push 验证徽章 → `gh api` 读取 verification 字段。
提示：rebase 重签用 `git rebase --exec 'git commit --amend --no-edit -S' HEAD~3` 之类形态；徽章不亮按第 1 节四条件逐条查。

参考思路（先自己做，再看）：全链路最常见卡点是第 3 条邮箱——`git config user.email` 必须与 GitHub 已验证邮箱完全一致（注意 noreply 邮箱形态）。验证终态：

```bash
gh api repos/fanquanpp/FANDEX/commits/main --jq '.commit.verification | {verified, reason}'
# {"verified": true, "reason": "valid"}
```

### 练习二：企业仓库「全 verified commits」的落地脚本

任务：为一个组织写出三步脚本——统计各仓库默认分支最近 20 条提交的 verified 比例、列出失分原因分布（ UNSIGNED / BAD_EMAIL / ... ）、给未达标仓库批量挂 Rulesets。
提示：`gh api` 分页拉提交列表，jq 统计 `commit.verification.reason` 的分布；Rulesets API 见第 5 节示例。

### 练习三（工程场景）：Dependabot PR 的签名例外验证

任务：在一个测试仓库同时开启 required signatures 与 Dependabot，观察 Dependabot 版本更新 PR 能否合并，并写下你的结论与豁免原理。
提示：对照第 4 节表格先做预测再动手；同时测试一个普通 GitHub App（如任意 review 助手）创建的 PR——差异即「平台豁免 vs App 无签名」。

## 8. 与之前和之后的知识的关系

- 往前：[Git 提交签名与安全实践](/git/350-SignedCommitsAndSecurityPractices)（003-git 模块）的密钥生成与 `commit -S`/`tag -s` 操作是本文的前置；[SSH 与 HTTPS](/github/040-SSHHTTPS) 讲认证密钥与签名密钥的角色差异；
- 旁支：标签签名与发布可信性见 [Git Tag 管理](/github/110-GitTagManage)；分支保护的完整清单见 [分支模型与分支规则](/github/170-BranchModelBranchRule)；Dependabot 的 PR 行为见 [Dependabot](/github/280-Dependabot)；
- 往后：PR 审查流中「只信 verified 提交」的实践嵌入 [PR 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)；组织级账号安全的上层视图见 [账号注册与双因素认证](/github/020-AccountRegister2FA)。

## 9. 官方文档

- Commit signature verification 目录（docs.github.com，开放许可可致谢）：https://docs.github.com/authentication/managing-commit-signature-verification
- 关于提交签名验证（徽章判定条件）：https://docs.github.com/authentication/managing-commit-signature-verification/about-commit-signature-verification
- Branch protection 与 required signatures：https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- DCO 原文：https://developercertificate.org/

## 10. 自我检查

- 能背出 verified 徽章的四条判定条件，并指出最常见的失败项（邮箱不一致/未验证）；
- 能说出 SSH key 的 Authentication 与 Signing 两种角色，以及「一把 key 两用」的上传步骤；
- 能解释 required signatures 保护的是「新合入」而非「历史」，以及开启后谁会撞墙；
- 能区分 `git commit -s`（DCO）与 `git commit -S`（GPG/SSH 签名）；
- 能说出组织级落地用 Rulesets 而非逐仓库点勾的原因。

## 本章总结

签名验证是「密码学身份」与「平台策略」的两层结构：Git 层的 `-S`/`-s` 与密钥管理归 git 模块（003-git/350），GitHub 层的四条徽章判定（有效签名、密钥已传、邮箱一致且已验证、committer 匹配）与三类强制（分支保护 required signatures、组织 Rulesets、DCO/CLA 检查）构成本篇。工程要点三件：一把 SSH key 挂 Authentication + Signing 双角色最省心；开 required signatures 前先盘点机器人提交的例外路径；组织级用 Rulesets API 批量下发并按「统计现状 → 修失分项 → 分批强制」的节奏推进。Verified 徽章不是装饰——它让「这行代码是谁写的」从口头变成密码学事实。

## 参考与致谢

- verified 徽章判定条件、分支保护 required signatures、Dependabot 签名行为的描述依据 GitHub 官方文档 Commit signature verification 目录（docs.github.com，开放许可）：https://docs.github.com/authentication/managing-commit-signature-verification ；
- DCO 原文引用自 developercertificate.org（CC-BY-SA-3.0）；
- 本文为本批次新增，无本机扫描素材；其余内容为原创。
