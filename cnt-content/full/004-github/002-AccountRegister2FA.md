---
order: 20
title: 账户注册与双因素认证（2FA）
module: 'github'
category: 工具链
difficulty: intermediate
description: GitHub 账户注册、邮箱验证、密码策略与双因素认证（2FA）配置指南：安全意义、TOTP 原理与恢复方案。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'github/001-GitHubOverview'
  - 'github/003-RepositoryCreateCloneArchiveDelete'
  - 'github/004-SSHHTTPS'
prerequisites: []
---


## 0. 从一个生活场景说起：账户安全就像"实名认证 + 家门双锁"

想象你入住一栋公寓：办理入住（注册账户）后，物业管理处会要求你**实名认证**（验证邮箱），以防有人冒用身份；为了防小偷，你给家门装了两道锁——**第一道锁是钥匙（密码），第二道锁是指纹或手机 App 动态码（2FA）**。小偷即使偷到了钥匙，没有你的指纹或手机，依然进不了门。

GitHub 账户安全遵循同样的逻辑：**密码是第一道锁，双因素认证（2FA）是第二道锁**。GitHub 上不仅有你的代码，还有私有仓库、Issues、CI/CD 配置等关键资产。一旦账户被盗，攻击者可能窃取代码、篡改项目、甚至用你的名义发布恶意内容。因此，**从注册的第一天起，就把安全措施配置到位**，是本篇的核心主线。

## 1. 注册账户：安全的第一步

### 1.1 注册流程

1. 打开 https://github.com/ ，点击 **Sign up**（也可选择"使用 Google 继续"社交登录）。
2. 依次填写**邮箱、密码、用户名**：
   - **用户名**：会成为你的主页地址（如 `github.com/你的用户名`），建议与你的常用网名一致，便于他人识别。
   - **密码**：建议至少 16 位，包含大小写字母、数字和特殊字符的组合，不要与其他网站共用。
3. 完成人机验证（CAPTCHA），点击 **Create account**。
4. 到邮箱中点击 GitHub 发送的**验证链接**完成验证。

> 官方提醒：**未验证邮箱将无法完成创建仓库等基础操作**，所以验证邮箱是必做项。

### 1.2 密码策略要点

- **使用强密码**：GitHub 官方要求创建"强且唯一的密码"。
- **不要复用**：同一密码用于多个平台，一旦某个平台泄露，其他账户全部受威胁。
- **使用密码管理器**：推荐用 Bitwarden、1Password 等工具生成并保管强密码，避免明文记录。

## 2. 双因素认证（2FA）原理讲解

### 2.1 什么是 2FA：先直观理解

密码属于"**你知道的**"（knowledge factor）；2FA 增加"**你持有的**"（possession factor）或"**你具备的**"（inherence factor）。攻击者要同时拿到"知道"和"持有"两样东西才能登录，难度大幅提升。

### 2.2 TOTP 原理：逐步深入

最常见的方式是 **TOTP（基于时间的一次性密码）**，工作流程如下：

1. 开启 2FA 时，GitHub 展示一个**二维码**，内含一段密钥（secret）。
2. 手机验证器 App（如 Google Authenticator、Microsoft Authenticator）扫描二维码并保存密钥。
3. App 使用密钥 + **当前时间**，通过哈希算法计算出一个 **6 位动态码**，每 30 秒自动更新一次。
4. 登录时输入这 6 位动态码，GitHub 用相同的密钥和当前时间独立计算并比对，一致则通过。

因为动态码依赖"你手机里的密钥 + 当前时间"，且 30 秒即失效，所以即使密码泄露，攻击者也无法在短时间内冒充你。

### 2.3 可选验证方式与安全等级

| 方式 | 说明 | 安全等级 |
| :--- | :--- | :--- |
| 安全密钥（Security Key / WebAuthn） | 硬件密钥如 YubiKey，USB 触碰验证 | 高 |
| TOTP 验证器 App | 手机 App 生成 6 位动态码 | 高 |
| 通行密钥（Passkey） | 基于 WebAuthn 的无密码认证 | 高 |
| GitHub Mobile | 手机 App 推送确认 | 中高 |
| 短信（SMS） | 短信验证码 | 低（易受 SIM 卡交换攻击，不推荐） |

> 官方建议：**优先使用 TOTP 应用，并额外添加安全密钥作为备份**；尽量不用短信。

### 2.4 政策背景

自 2023 年 3 月起，GitHub 要求所有在 GitHub.com 上**贡献代码的用户启用 2FA**。就算你的账户暂未被强制，也强烈建议立即开启——这是官方对账户安全的最基本要求。

## 3. 开启 2FA：操作步骤

### 3.1 使用 TOTP 验证器（推荐主方式）

1. 手机安装任意 TOTP 应用（Google Authenticator、Microsoft Authenticator、Authy 等）。
2. 登录 GitHub，点击头像 → **Settings** → **Password and authentication**。
3. 在 "Two-factor authentication" 区域点击 **Enable two-factor authentication**。
4. 选择 **Set up using an app**（使用身份验证应用）。
5. 用手机 App 扫描屏幕上的二维码，App 中会出现 GitHub 条目并显示 6 位动态码。
6. 把动态码输入网页验证框，点击 **Verify**。
7. 页面会显示**恢复代码（recovery codes）**，点击 **Download** 下载保存（默认文件名为 `github-recovery-codes.txt`）。

> 注意：开启 2FA 后账户进入 **28 天检查期**，期间成功完成一次 2FA 登录即可结束检查期。

### 3.2 添加安全密钥（推荐备份方式）

1. 进入 **Settings → Password and authentication**。
2. 在 "Security keys" 区域点击 **Add security key**。
3. 将 YubiKey 等硬件密钥插入 USB 接口，按提示触摸按钮完成绑定。
4. 之后登录时可选择用安全密钥代替动态码。

### 3.3 保存恢复代码（保命操作）

恢复代码是**失去手机/验证器时的唯一后门**，GitHub 官方明确警告：**启用 2FA 后如果丢失凭证且无恢复方法，GitHub 支持团队也无法帮你恢复账户访问**。所以请：

- 下载恢复代码文件并保存在安全位置（密码管理器）。
- 打印纸质副本放在可靠处。
- **不要**把恢复代码截图发到聊天工具或网盘公开分享。

## 4. 2FA 与命令行访问：PAT 与 SSH

启用 2FA 后，通过 HTTPS 使用命令行访问仓库时，**不能再使用账户密码**，需要改用**个人访问令牌（PAT）** 或 **SSH 密钥**。

### 4.1 生成个人访问令牌（PAT）

1. 进入 **Settings → Developer settings → Personal access tokens → Tokens (classic)**。
2. 点击 **Generate new token** → **Generate new token (classic)**。
3. 填写 **Note**（令牌用途，如 "my-laptop-https"），设置 **Expiration**（建议 30-90 天）。
4. 勾选需要的 **Scopes**（权限范围）：推送代码勾选 `repo`；删除仓库另需 `delete_repo`；遵循**最小权限原则**，只勾必需的。
5. 点击 **Generate token**，**立即复制保存**——离开页面后无法再次查看。

### 4.2 使用 PAT 完成 HTTPS 操作

```bash
# 首次克隆/推送时提示输入用户名和密码
git clone https://github.com/用户名/仓库.git
# 提示 Username 时：输入 GitHub 用户名
# 提示 Password 时：粘贴 PAT（不是账户密码！）
```

配置凭据管理器可避免每次输入：

```bash
# Windows：Git Credential Manager
git config --global credential.helper manager
# macOS
git config --global credential.helper osxkeychain
# Linux
git config --global credential.helper libsecret
```

### 4.3 备选方案：SSH 密钥

SSH 密钥使用非对称加密，配置一次即可长期使用，且不受 2FA 动态码影响（详见 004 篇《SSH 与 HTTPS 远程配置》）。对频繁推送的开发者，SSH 是更省心的选择。

### 4.4 账户恢复的最后防线：多条恢复路径

GitHub 官方建议**配置两种以上恢复方式**，避免单一方式失效时被锁在门外。除恢复代码外，以下方法也可用于找回账户：

| 恢复方式 | 说明 |
| :--- | :--- |
| 恢复代码 | 一次性代码，用一条少一条，可用完生成新的一批 |
| SSH 密钥 | 已注册的 SSH 密钥可作为 2FA 恢复凭证 |
| 个人访问令牌（PAT） | 未过期的 PAT 也可用于恢复验证 |
| 已验证设备 | 之前成功登录过 2FA 的设备可用来验证身份 |
| 通行密钥/安全密钥 | WebAuthn 类凭证，绑定后可独立完成认证 |

> 官方明确警告：**如果以上恢复方式全部丢失，GitHub 支持团队也无法恢复账户访问**。建议开启 2FA 后在 Settings → Password and authentication 中逐一确认这些恢复路径仍可访问。

## 5. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 恢复码丢失且手机不可用 | 无法登录，提示需要 2FA | 未妥善保存恢复代码 | 若还有备用恢复方式（SSH 密钥、已验证设备、PAT）可尝试恢复；否则按官方恢复流程尝试，最坏情况账户无法找回 |
| 输入动态码报错 | `Authentication code incorrect` | 手机时间不准或输入过快 | 校准手机时间（TOTP 依赖时间），等动态码刷新后重试 |
| 推送时提示认证失败 | `Authentication failed` | HTTPS 下误用了账户密码而非 PAT | 重新生成 PAT 并粘贴到凭据管理器 |
| PAT 权限不足 | 推送被拒绝（403） | 生成 PAT 时未勾选 `repo` 权限 | 重新生成令牌，勾选所需最小权限范围 |
| 贡献统计不显示 | 提交未计入贡献图 | 本地 `user.email` 未在 GitHub 验证 | 在 Settings → Emails 添加并验证该邮箱，再用新配置提交 |
| 公司 SSO 登录问题 | 组织要求 SAML 单点登录 | 企业强制统一身份认证 | 遵循公司 IT 政策，使用企业提供的登录入口 |

## 7. 一句话记忆

**GitHub 账户安全 = 强密码（第一道锁）+ 2FA 双因素认证（第二道锁）+ 妥善保存的恢复代码（备用钥匙），三者缺一不可。**

### 延伸阅读

- GitHub 平台整体概览，见 001 篇《GitHub 概述》。
- SSH 密钥与 HTTPS+PAT 的完整对比配置，见 004 篇《SSH 与 HTTPS 远程配置》。
- 令牌管理与多账户切换，见 020 篇《GitHub CLI》。
