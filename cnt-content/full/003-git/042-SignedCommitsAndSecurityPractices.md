---
order: 420
title: 签名提交与安全实践
module: 'git'
category: 工具链
difficulty: advanced
description: '用 GPG 或 SSH 给提交签名，让提交带"防伪认证"；同时给出团队仓库的权限与工作流安全基线。'
author: fanquanpp
updated: '2026-08-02'
related:
  - 'git/009-SHA1IntegrityCheck'
  - 'git/006-GitRemoteRepoOperation'
prerequisites:
  - 'git/009-SHA1IntegrityCheck'
---


## 一句话理解

提交签名 = 用你的私钥给提交打上"防伪标记"，任何能拿到你公钥的人都能验证
"这个提交确实出自你手"，GitHub 上会显示 Verified 标识。

## 为什么需要

- Git 提交的作者字段只是字符串，任何人都能伪装成你。
- 开源仓库的供应链攻击常从"冒名提交"开始。
- 签名 + 分支保护规则，可以阻止未经认证的提交进入主分支。

## 方案对比：GPG 与 SSH

| 方案 | 优点 | 门槛 |
| --- | --- | --- |
| GPG 签名 | 兼容最广、支持过期与吊销 | 需要生成和管理 GPG 密钥 |
| SSH 签名 | 复用 GitHub 已有的 SSH 密钥，无需额外生成 | 较新，部分平台支持有限 |

## GPG 签名实操

```bash
# 1. 生成密钥（按提示选择 RSA 4096 或 Ed25519）
gpg --full-generate-key

# 2. 查看密钥 ID 并告诉 Git
gpg --list-secret-keys --keyid-format=long
git config --global user.signingkey <KEY_ID>

# 3. 默认对提交签名
git config --global commit.gpgsign true

# 4. 提交与验证
git commit -S -m "带签名的提交"
git log --show-signature -1
```

```bash
# 把公钥导出并配置到 GitHub/Gitee
gpg --armor --export <KEY_ID>
# 然后在平台设置页添加 GPG 公钥
```

## SSH 签名实操

```bash
# 使用已有的 SSH 密钥签名（GitHub 支持）
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

## 团队安全基线

- 主分支开启**分支保护**：要求签名提交、要求 PR 评审、禁止 force push。
- 私钥泄露立即吊销并在平台删除对应公钥。
- 为重要里程碑打**签名标签**：`git tag -s v1.0.0`。
- 定期审计提交者身份与权限矩阵，遵循最小权限原则。

## 常见误区

| 误区 | 真相 |
| --- | --- |
| 签名 = 加密 | 签名只认证不加密，提交内容仍公开可读 |
| 历史提交无法被伪造 | 无签名的旧提交可被重写，签名保护的是"从现在开始" |
| 只签 tag 不签 commit | 两者都重要，commit 签名是日常防线 |
| 换了机器忘记导入私钥 | 私钥是可迁移的，建议备份并妥善保管 |

## 小结

签名的本质是"身份证明"：配置一次，收益长期。
GPG 或 SSH 任选其一，配合分支保护与权限最小化，就能把提交环节的冒充风险基本关掉。
