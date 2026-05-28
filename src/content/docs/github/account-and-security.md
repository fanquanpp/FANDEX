---
order: 10
tags:
  - 'github'
  - 'security'
  - 'database'
  - 'git-workflow'
difficulty: 'intermediate'
title: '账户注册与双因素认证（2FA）'
module: 'github'
category: 'GitHub Basics'
description: 'GitHub 账户注册、邮箱验证、密码策略与双因素认证（2FA）配置指南。'
author: 'Anonymous'
---

## 目录

1. [背景](#背景)
2. [原理简述](#原理简述)
3. [操作步骤（含截图占位）](#操作步骤（含截图占位）)
4. [可运行配置示例](#可运行配置示例)
5. [常见坑点与解决方案](#常见坑点与解决方案)
6. [最佳实践](#最佳实践)
7. [故障诊断工具与脚本](#故障诊断工具与脚本)
8. [高级配置：多账户管理](#高级配置：多账户管理)

---

## 1. 背景

**GitHub** 作为全球最大的代码托管平台，不仅存储代码，还管理着项目协作、Issue 跟踪、CI/CD 配置等关键信息。账户安全至关重要，一旦泄露可能导致：

- 代码仓库被恶意修改或删除
- 私有代码和敏感信息外泄
- 项目配置被篡改
- 个人账户被用于恶意活动
  除了设置强密码外，**2FA（双因素认证，Two-Factor Authentication）** 是 GitHub 官方强烈推荐的安全措施，它在「密码」这一知识因子之外，增加了「你持有设备」的物理因子，大大提高了账户安全性。

## 2. 原理简述

2FA 的核心是多因素认证，登录时需要验证：

1. **你知道的**：账户密码
2. **你持有的**：第二验证因子，包括：

- **TOTP（基于时间的一次性密码）**：由手机验证器 App 生成的 6 位动态码，每 30 秒更新一次
- **WebAuthn（网页认证）**：兼容的硬件密钥，如 YubiKey
- **SMS（短信）**：通过短信接收验证码（不推荐，易受 SIM 卡交换攻击）
- **Passkey（通行密钥）**：基于 WebAuthn 的无密码认证方案，安全性更高
  **安全等级排序**：硬件密钥 > TOTP > Passkey > SMS

## 3. 操作步骤（含截图占位）

### 3.1 注册与邮箱验证

1. **访问注册页面**：打开 [GitHub 注册页](https://github.com/join)，填写用户名、邮箱和密码
2. **选择合适的邮箱**：推荐使用个人常用邮箱或工作邮箱（需符合公司政策）
3. **设置强密码**：包含大小写字母、数字和特殊字符，长度至少 16 位
4. **完成邮箱验证**：GitHub 会发送验证邮件，点击邮件中的链接完成验证
5. **完善个人资料**：设置头像、简介等信息，便于团队识别
   **截图占位**：`[图 01-1] 注册成功后的 Profile 概览页`

### 3.2 开启 2FA

#### 3.2.1 使用 TOTP 验证器

1. **进入 2FA 设置页面**：点击头像 → Settings → Password and authentication → Two-factor authentication
2. **开始设置**：点击 "Enable two-factor authentication" 按钮
3. **选择验证方式**：选择 "Authentication app"
4. **扫描二维码**：使用 Google Authenticator、Microsoft Authenticator 或 Authy 等 App 扫描屏幕上的二维码
5. **输入验证码**：在 App 中找到 GitHub 条目，输入生成的 6 位验证码
6. **保存恢复码**：系统会生成一组恢复码，用于在无法使用验证器时恢复账户访问，请务必：

- 下载恢复码文件
- 打印纸质备份
- 存储在安全的密码管理器中

7. **完成设置**：点击 "Enable" 按钮完成 2FA 开启
   **截图占位**：`[图 01-2] 2FA 已启用状态与恢复码下载提示`

#### 3.2.2 使用硬件密钥（推荐）

1. **进入 2FA 设置页面**：同上
2. **选择安全密钥**：在验证方式中选择 "Security key"
3. **插入硬件密钥**：将 YubiKey 等硬件密钥插入电脑 USB 接口
4. **按照提示操作**：触摸或按下硬件密钥上的按钮
5. **完成设置**：系统会确认硬件密钥已成功添加

### 3.3 命令行登录配置

启用 2FA 后，通过 **HTTPS** 协议访问 GitHub 仓库时，不能再使用账户密码，需要使用 **PAT（Personal Access Token，个人访问令牌）** 代替。

#### 3.3.1 生成 PAT

1. **进入 PAT 设置页面**：Settings → Developer settings → Personal access tokens → Tokens (classic)
2. **生成新令牌**：点击 "Generate new token" → "Generate new token (classic)"
3. **设置令牌信息**：

- 填写 Note（令牌名称）
- 设置 Expiration（过期时间，建议 30-90 天）
- 选择所需的 scopes（权限范围，遵循最小权限原则）

4. **生成令牌**：点击 "Generate token" 按钮
5. **保存令牌**：复制生成的令牌，因为离开页面后将无法再次查看

#### 3.3.2 配置 Git 凭据管理

```bash
 # Windows 系统：使用 Git Credential Manager
 git config --global credential.helper manager
 # macOS 系统：使用 osxkeychain
 git config --global credential.helper osxkeychain
 # Linux 系统：使用 libsecret
 git config --global credential.helper libsecret
 # 验证配置
 git config --global --get credential.helper
```

首次使用 HTTPS 克隆或推送时，系统会提示输入用户名和密码，此时：

- 用户名：输入 GitHub 用户名
- 密码：输入生成的 PAT

## 4. 可运行配置示例

### 示例 A：检查和配置全局 Git 身份

```bash
 # 检查当前全局配置
 git config --global --list
 # 设置全局用户名和邮箱
 git config --global user.name "Your Name" # 建议与 GitHub 展示名一致
 git config --global user.email "you@example.com" # 必须是 GitHub 已验证邮箱
 # 验证设置是否生效
 git config --global user.name
 git config --global user.email
```

### 示例 B：为特定仓库设置不同身份

```bash
 # 进入仓库目录
 cd /path/to/repo
 # 设置仓库特定的用户名和邮箱
 git config user.name "Work Name"
 git config user.email "work@company.com"
 # 验证仓库特定设置
 git config user.name
 git config user.email
```

### 示例 C：`.gitconfig` 完整配置示例

```ini
 # 全局 Git 配置
 [user]
  name = Your Name
  email = you@example.com
 [credential]
  helper = manager # Windows 系统
  # helper = osxkeychain # macOS 系统
  # helper = libsecret # Linux 系统
 [core]
  editor = code --wait # 使用 VS Code 作为提交信息编辑器
  autocrlf =  # Windows 系统
  # autocrlf = input # macOS/Linux 系统
 [pull]
  rebase =  # 使用 rebase 方式拉取代码
 [alias]
  st = status
  ci = commit
  br = branch
  co = checkout
  lg = log --oneline --graph --decorate
```

## 5. 常见坑点与解决方案

| 坑点                   | 原因                           | 解决方案                                              |
| ---------------------- | ------------------------------ | ----------------------------------------------------- |
| 恢复码丢失且手机不可用 | 未妥善保存恢复码               | 定期备份恢复码到多个安全位置，如密码管理器、纸质备份  |
| 公司 SSO 登录问题      | 组织强制使用 SAML 单点登录     | 遵循公司 IT 政策，使用公司提供的登录方式              |
| 多账户管理混乱         | 多个 GitHub 账号需要分别访问   | 使用 SSH config 配置多 Host，或使用不同浏览器配置文件 |
| PAT 权限不足           | 生成 PAT 时未选择正确的 scopes | 重新生成 PAT，选择所需的最小权限范围                  |
| 贡献统计不显示         | 提交邮箱未在 GitHub 验证       | 在 GitHub 账户中添加并验证提交所用邮箱                |

## 6. 最佳实践

### 6.1 账户安全

- **使用 TOTP + 硬件密钥** 双重保护：TOTP 作为主要验证方式，硬件密钥作为备用
- **定期轮换 PAT**：设置合理的过期时间，到期后生成新令牌
- **最小权限原则**：生成 PAT 时只选择必要的 scopes
- **启用登录通知**：在 Settings → Notifications 中开启登录活动通知
- **设置安全告警**：在 Settings → Security 中配置可疑活动告警
- **使用密码管理器**：存储 PAT 和恢复码，避免明文存储

### 6.2 工作流程

- **统一提交身份**：确保所有仓库使用相同的验证邮箱，保持贡献统计一致
- **定期检查配置**：每月检查一次 Git 配置和 2FA 状态
- **团队协作**：建立团队级别的安全规范，确保所有成员都启用 2FA
- **应急方案**：制定账户恢复预案，确保团队在成员无法访问账户时仍能继续工作

## 7. 故障诊断工具与脚本

### 7.1 检查 Git 配置

```bash
 # 检查全局配置
 git config --global --list
 # 检查当前仓库配置
 git config --local --list
 # 检查系统配置
 git config --system --list
 # 筛选用户相关配置
 git config --list | grep user
```

### 7.2 验证邮箱状态

```bash
 # 检查本地提交使用的邮箱
 git log --pretty=format:"%ae" | head -n 5
 # 检查远程仓库信息
 git remote -v
 # 测试 HTTPS 连接（会提示输入 PAT）
 git ls-remote https://github.com/username/repository.git
```

### 7.3 排查 2FA 问题

1. **检查 2FA 状态**：登录 GitHub 后在 Settings → Password and authentication 中查看
2. **测试验证器**：使用验证器 App 生成验证码，尝试登录
3. **使用恢复码**：如果验证器不可用，尝试使用恢复码登录
4. **联系支持**：如果所有方法都失败，联系 GitHub 支持团队

## 8. 高级配置：多账户管理

### 8.1 使用 SSH 配置多账户

```bash
 # ~/.ssh/config 文件
 Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_personal
 Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_rsa_work
```

### 8.2 对应仓库配置

```bash
 # 个人仓库
 git remote set-url origin git@github.com-personal:username/personal-repo.git
 # 工作仓库
 git remote set-url origin git@github.com-work:company/work-repo.git
```

## 延伸阅读

- [GitHub：配置 2FA](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa) <!-- nofollow -->
- [GitHub：创建个人访问令牌](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) <!-- nofollow -->
- [GitHub：使用硬件安全密钥](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication#configuring-two-factor-authentication-using-a-security-key) <!-- nofollow -->
- [GitHub：管理多账户](https://docs.github.com/en/get-started/getting-started-with-git/managing-remote-repositories) <!-- nofollow -->

### 跨模块关联

- [Git 安装](git/setup-and-init)

## 更新日志

- **2026-04-05**：初版
- **2026-04-05**：扩写内容，增加详细的操作步骤、代码示例、故障诊断和高级配置
