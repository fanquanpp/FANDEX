---
order: 350
title: 签名提交与安全实践
module: 'git'
category: 工具链
difficulty: advanced
description: '用 GPG 或 SSH 给提交与标签签名，配置本地验证与团队安全基线，防冒名提交。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/250-SHA1IntegrityCheck'
  - 'git/200-TagManagement'
  - 'git/150-GitRemoteRepoOperation'
  - 'git/230-CodeReviewBestPractice'
prerequisites:
  - 'git/250-SHA1IntegrityCheck'
---

## 一句话理解

提交签名 = 用你的私钥给提交打上「防伪标记」，任何能拿到你公钥的人都能验证
「这个提交确实出自你手」，GitHub 上会显示 Verified 标识。

## 为什么需要

- Git 提交的 author 字段只是字符串，`git commit --author="任何人 <any@x.com>"` 就能冒名——对象哈希只保证「内容没被改」，不保证「内容出自署名人」。
- 开源仓库的供应链攻击常从「冒名提交」开始（伪装维护者提交恶意改动）。
- 签名 + 平台的分支保护规则，可以阻止未经认证的提交进入主分支。

理解签名的位置：哈希链负责**完整性**（历史无法静默篡改，见 [SHA-1 完整性校验](git/250-SHA1IntegrityCheck)），签名负责**身份**（历史出自谁）。两者互补而非替代。

## 方案对比：GPG 与 SSH

| 方案 | 优点 | 门槛 |
| --- | --- | --- |
| GPG 签名 | 历史最久、支持过期与吊销、密钥可多子钥分工 | 需要生成并管理 GPG 密钥环，配置体验较差 |
| SSH 签名（Git 2.34+） | 直接复用已有的 GitHub SSH 密钥，零新增凭据 | 平台支持较新；本地验证需额外配置 allowed signers |

新用户首选 SSH 签名：如果你已经用 SSH key 推代码，三行配置即可完成。

## SSH 签名实操（推荐起点）

```bash
# 1) 告诉 Git 用 SSH 格式签名，指明签名密钥（公钥路径）
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub

# 2) 默认对所有提交签名
git config --global commit.gpgsign true

# 3) 提交并验证
git commit -m "signed by ssh key"
git log --show-signature -1
# Good "git" signature for ... with ED25519 key ...
```

注意：本地 `git log --show-signature` 对 SSH 签名默认会报 `No signature` 类提示，因为 Git 不知道「哪些公钥是可信的」。配置信任名单后本地验证才完整：

```bash
# 建立信任名单（格式：身份 公钥）
echo "you@example.com ssh-ed25519 AAAA... you@laptop" > ~/.ssh/allowed_signers
git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
git log --show-signature -1     # 此时显示 Good "git" signature
```

平台侧（GitHub/Gitee/GitLab）在设置页添加 **Signing Key**（注意与用于认证的 Authentication Key 是同一文件里的两个用途勾选），推送后提交即显示 Verified。

## GPG 签名实操

```bash
# 1) 生成密钥（推荐选择 ECC (sign and encrypt) 或 RSA 4096）
gpg --full-generate-key

# 2) 查看密钥 ID 并告诉 Git
gpg --list-secret-keys --keyid-format=long
# sec   ed25519/3AA5C34371567BD2 ...
git config --global user.signingkey 3AA5C34371567BD2

# 3) 默认签名 + 告诉 Git 用哪个 gpg 程序（Windows 常需显式指定）
git config --global commit.gpgsign true
# git config --global gpg.program "C:/Program Files (x86)/GnuPG/bin/gpg.exe"

# 4) 导出公钥，配置到平台
gpg --armor --export 3AA5C34371567BD2
```

GPG 的日常摩擦是**口令弹窗**：签名时需要输入私钥口令（pinentry 窗口）。可调缓存量减少打扰：

```bash
# 让 gpg-agent 缓存口令（默认约 10 分钟）
echo -e "default-cache-ttl 28800\nmax-cache-ttl 28800" >> ~/.gnupg/gpg.conf
```

## 标签签名与验证

发布版本标签同样可签（`-s` 签名，`-v` 验证，见 [标签管理](git/200-TagManagement)）：

```bash
git tag -s v1.0.0 -m "Release v1.0.0"     # 签名的附注标签
git tag -v v1.0.0                          # 验证

# 验证任意提交的签名
git verify-commit HEAD
git verify-tag v1.0.0
```

## 平台显示 Verified 的条件

签名验证通过不等于一定显示 Verified，托管平台通常同时要求：

1. 签名本身密码学有效（公钥已上传到平台）；
2. 提交的 **author/committer 邮箱与平台账号中已验证的邮箱一致**——邮箱不一致时即使签名有效也会显示 Unverified。

```bash
git log --show-signature -1 --format='%h %ae %G?'
# %G? 输出签名状态：G=有效且邮箱匹配 / B=验证失败 / N=无签名 / U/E=部分有效
```

`%G?` 完整取值：`G` 有效签名；`B` 无效签名（数据被改或公钥不符）；`U` 有效但有效性未知（公钥未建立信任）；`C` 有效但身份已被吊销；`X` 签名已过期；`Y` 签名密钥已过期；`R` 签名密钥已被吊销；`E` 无法校验（如缺公钥）；`N` 无签名。CI 审计脚本可直接对 `%G?` 做 `grep '^[GN]'` 类筛查。

团队落地顺序建议：先统一「邮箱规范」（工位邮箱 vs 个人邮箱），再推签名，否则会出现大量「签名有效却不显示 Verified」的困惑。

## 密钥轮换与备份

```bash
# GPG：查看/导出私钥备份（离线介质保存）
gpg --list-secret-keys --keyid-format=long
gpg --export-secret-keys <KEY_ID> > private-key.asc

# 新机器恢复
gpg --import private-key.asc
```

SSH 密钥的「备份」即妥善保存 `id_ed25519` 私钥文件本身；更稳妥的做法是按设备各生成一把独立密钥（笔记本一把、台式机一把），分别上传平台，丢一台只吊销一把，而不是共用一把到处拷贝。GPG 同理可用「主密钥离线保存 + 子密钥日常使用」的模式，进阶用户再考虑。

## 团队安全基线

- 主分支开启**分支保护**：要求签名提交（Require signed commits）、要求 PR 评审通过、禁止 force push。
- **私钥泄露响应**：吊销密钥（GPG）或在平台移除公钥（SSH），并评估泄露期间可被冒充的提交范围。签名无法追溯撤销已推送的恶意提交，只能让新提交不再「可信」。
- 为重要里程碑打**签名标签**，发布流水线中先 `git verify-tag` 再构建。
- 定期审计协作者权限，遵循最小权限原则；CI 的 token 同样按最小范围发放。
- 在 CI 中可加一道**签名兜底检查**（防平台配置被绕过）：

```bash
# CI 步骤示例：校验 PR 中所有新提交都有有效签名，否则失败
git verify-commit $(git rev-list origin/main..HEAD) || {
  echo "::error::存在未签名的提交"; exit 1;
}
```

## 常见误区

| 误区 | 真相 |
| --- | --- |
| 签名 = 加密 | 签名只认证不加密，提交内容仍公开可读 |
| 历史提交无法被伪造 | 无签名的旧提交可被重写；签名保护的是「从现在开始」的新提交 |
| 只签 tag 不签 commit | 两者互补：commit 签名是日常防线，tag 签名锚定发布点 |
| rebase/amend 后签名丢失 | 改写历史必然生成新提交，重签即可；`git rebase --exec 'git commit -S --amend --no-edit'` 可批量补签 |
| 换了机器签名就断了 | 私钥可迁移（GPG 导出私钥、SSH 复制密钥文件），迁移后更新各平台的公钥信任 |
| `gpg failed to sign the data` = 配置错误 | 先区分原因：agent 没跑起来、pinentry 弹窗被吞、gpg.program 路径错，逐项排查 |

## 小结

签名的本质是「身份证明」：SSH 方案三行配置起步，成本几乎为零。
GPG 或 SSH 任选其一，配合分支保护、签名标签与权限最小化，就能把提交环节的冒充风险基本关掉。
