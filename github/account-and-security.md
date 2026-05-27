# 账户注册与双因素认证（2FA）
 False
 False> @Version: v3.5.0
 False
 False> @Author: Anonymous
 False> @Category: GitHub Basics
 False> @Description: GitHub 账户注册、邮箱验证、密码策略与双因素认证（2FA）配置指南。 | GitHub account registration, email verification, password policy, and 2FA configuration guide.
 False
 False---
 False
 False## 目录
 False
 False1. [背景](#背景)
 False2. [原理简述](#原理简述)
 False3. [操作步骤（含截图占位）](#操作步骤（含截图占位）)
 False4. [可运行配置示例](#可运行配置示例)
 False5. [常见坑点与解决方案](#常见坑点与解决方案)
 False6. [最佳实践](#最佳实践)
 False7. [故障诊断工具与脚本](#故障诊断工具与脚本)
 False8. [高级配置：多账户管理](#高级配置：多账户管理)
 False
 False---
 False
 False## 1. 背景
 False
 False**GitHub** 作为全球最大的代码托管平台，不仅存储代码，还管理着项目协作、Issue 跟踪、CI/CD 配置等关键信息。账户安全至关重要，一旦泄露可能导致：
 False
 False- 代码仓库被恶意修改或删除
 False- 私有代码和敏感信息外泄
 False- 项目配置被篡改
 False- 个人账户被用于恶意活动
 False
 False除了设置强密码外，**2FA（双因素认证，Two-Factor Authentication）** 是 GitHub 官方强烈推荐的安全措施，它在「密码」这一知识因子之外，增加了「你持有设备」的物理因子，大大提高了账户安全性。
 False
 False## 2. 原理简述
 False
 False2FA 的核心是多因素认证，登录时需要验证：
 False
 False1. **你知道的**：账户密码
 False2. **你持有的**：第二验证因子，包括：
 False - **TOTP（基于时间的一次性密码）**：由手机验证器 App 生成的 6 位动态码，每 30 秒更新一次
 False - **WebAuthn（网页认证）**：兼容的硬件密钥，如 YubiKey
 False - **SMS（短信）**：通过短信接收验证码（不推荐，易受 SIM 卡交换攻击）
 False - **Passkey（通行密钥）**：基于 WebAuthn 的无密码认证方案，安全性更高
 False
 False**安全等级排序**：硬件密钥 > TOTP > Passkey > SMS
 False
 False## 3. 操作步骤（含截图占位）
 False
 False### 3.1 注册与邮箱验证
 False
 False1. **访问注册页面**：打开 [GitHub 注册页](https://github.com/join)，填写用户名、邮箱和密码
 False2. **选择合适的邮箱**：推荐使用个人常用邮箱或工作邮箱（需符合公司政策）
 False3. **设置强密码**：包含大小写字母、数字和特殊字符，长度至少 16 位
 False4. **完成邮箱验证**：GitHub 会发送验证邮件，点击邮件中的链接完成验证
 False5. **完善个人资料**：设置头像、简介等信息，便于团队识别
 False
 False**截图占位**：`[图 01-1] 注册成功后的 Profile 概览页`
 False
 False### 3.2 开启 2FA
 False
 False#### 3.2.1 使用 TOTP 验证器
 False
 False1. **进入 2FA 设置页面**：点击头像 → Settings → Password and authentication → Two-factor authentication
 False2. **开始设置**：点击 "Enable two-factor authentication" 按钮
 False3. **选择验证方式**：选择 "Authentication app"
 False4. **扫描二维码**：使用 Google Authenticator、Microsoft Authenticator 或 Authy 等 App 扫描屏幕上的二维码
 False5. **输入验证码**：在 App 中找到 GitHub 条目，输入生成的 6 位验证码
 False6. **保存恢复码**：系统会生成一组恢复码，用于在无法使用验证器时恢复账户访问，请务必：
 False - 下载恢复码文件
 False - 打印纸质备份
 False - 存储在安全的密码管理器中
 False7. **完成设置**：点击 "Enable" 按钮完成 2FA 开启
 False
 False**截图占位**：`[图 01-2] 2FA 已启用状态与恢复码下载提示`
 False
 False#### 3.2.2 使用硬件密钥（推荐）
 False
 False1. **进入 2FA 设置页面**：同上
 False2. **选择安全密钥**：在验证方式中选择 "Security key"
 False3. **插入硬件密钥**：将 YubiKey 等硬件密钥插入电脑 USB 接口
 False4. **按照提示操作**：触摸或按下硬件密钥上的按钮
 False5. **完成设置**：系统会确认硬件密钥已成功添加
 False
 False### 3.3 命令行登录配置
 False
 False启用 2FA 后，通过 **HTTPS** 协议访问 GitHub 仓库时，不能再使用账户密码，需要使用 **PAT（Personal Access Token，个人访问令牌）** 代替。
 False
 False#### 3.3.1 生成 PAT
 False
 False1. **进入 PAT 设置页面**：Settings → Developer settings → Personal access tokens → Tokens (classic)
 False2. **生成新令牌**：点击 "Generate new token" → "Generate new token (classic)"
 False3. **设置令牌信息**：
 False - 填写 Note（令牌名称）
 False - 设置 Expiration（过期时间，建议 30-90 天）
 False - 选择所需的 scopes（权限范围，遵循最小权限原则）
 False4. **生成令牌**：点击 "Generate token" 按钮
 False5. **保存令牌**：复制生成的令牌，因为离开页面后将无法再次查看
 False
 False#### 3.3.2 配置 Git 凭据管理
 False
```bash
 True# Windows 系统：使用 Git Credential Manager
 Truegit config --global credential.helper manager
 True
 True# macOS 系统：使用 osxkeychain
 Truegit config --global credential.helper osxkeychain
 True
 True# Linux 系统：使用 libsecret
 Truegit config --global credential.helper libsecret
 True
 True# 验证配置
 Truegit config --global --get credential.helper
 True```

 False首次使用 HTTPS 克隆或推送时，系统会提示输入用户名和密码，此时：
 False
 False- 用户名：输入 GitHub 用户名
 False- 密码：输入生成的 PAT
 False
 False## 4. 可运行配置示例
 False
 False### 示例 A：检查和配置全局 Git 身份
 False
```bash
 True# 检查当前全局配置
 Truegit config --global --list
 True
 True# 设置全局用户名和邮箱
 Truegit config --global user.name "Your Name" # 建议与 GitHub 展示名一致
 Truegit config --global user.email "you@example.com" # 必须是 GitHub 已验证邮箱
 True
 True# 验证设置是否生效
 Truegit config --global user.name
 Truegit config --global user.email
 True```

 False### 示例 B：为特定仓库设置不同身份
 False
```bash
 True# 进入仓库目录
 Truecd /path/to/repo
 True
 True# 设置仓库特定的用户名和邮箱
 Truegit config user.name "Work Name"
 Truegit config user.email "work@company.com"
 True
 True# 验证仓库特定设置
 Truegit config user.name
 Truegit config user.email
 True```

 False### 示例 C：`.gitconfig` 完整配置示例
 False
```ini
 True# 全局 Git 配置
 True[user]
 True name = Your Name
 True email = you@example.com
 True
 True[credential]
 True helper = manager # Windows 系统
 True # helper = osxkeychain # macOS 系统
 True # helper = libsecret # Linux 系统
 True
 True[core]
 True editor = code --wait # 使用 VS Code 作为提交信息编辑器
 True autocrlf = true # Windows 系统
 True # autocrlf = input # macOS/Linux 系统
 True
 True[pull]
 True rebase = true # 使用 rebase 方式拉取代码
 True
 True[alias]
 True st = status
 True ci = commit
 True br = branch
 True co = checkout
 True lg = log --oneline --graph --decorate
 True```

 False## 5. 常见坑点与解决方案
 False
 False| 坑点 | 原因 | 解决方案 |
 False|------|------|----------|
 False| 恢复码丢失且手机不可用 | 未妥善保存恢复码 | 定期备份恢复码到多个安全位置，如密码管理器、纸质备份 |
 False| 公司 SSO 登录问题 | 组织强制使用 SAML 单点登录 | 遵循公司 IT 政策，使用公司提供的登录方式 |
 False| 多账户管理混乱 | 多个 GitHub 账号需要分别访问 | 使用 SSH config 配置多 Host，或使用不同浏览器配置文件 |
 False| PAT 权限不足 | 生成 PAT 时未选择正确的 scopes | 重新生成 PAT，选择所需的最小权限范围 |
 False| 贡献统计不显示 | 提交邮箱未在 GitHub 验证 | 在 GitHub 账户中添加并验证提交所用邮箱 |
 False
 False## 6. 最佳实践
 False
 False### 6.1 账户安全
 False
 False- **使用 TOTP + 硬件密钥** 双重保护：TOTP 作为主要验证方式，硬件密钥作为备用
 False- **定期轮换 PAT**：设置合理的过期时间，到期后生成新令牌
 False- **最小权限原则**：生成 PAT 时只选择必要的 scopes
 False- **启用登录通知**：在 Settings → Notifications 中开启登录活动通知
 False- **设置安全告警**：在 Settings → Security 中配置可疑活动告警
 False- **使用密码管理器**：存储 PAT 和恢复码，避免明文存储
 False
 False### 6.2 工作流程
 False
 False- **统一提交身份**：确保所有仓库使用相同的验证邮箱，保持贡献统计一致
 False- **定期检查配置**：每月检查一次 Git 配置和 2FA 状态
 False- **团队协作**：建立团队级别的安全规范，确保所有成员都启用 2FA
 False- **应急方案**：制定账户恢复预案，确保团队在成员无法访问账户时仍能继续工作
 False
 False## 7. 故障诊断工具与脚本
 False
 False### 7.1 检查 Git 配置
 False
```bash
 True# 检查全局配置
 Truegit config --global --list
 True
 True# 检查当前仓库配置
 Truegit config --local --list
 True
 True# 检查系统配置
 Truegit config --system --list
 True
 True# 筛选用户相关配置
 Truegit config --list | grep user
 True```

 False### 7.2 验证邮箱状态
 False
```bash
 True# 检查本地提交使用的邮箱
 Truegit log --pretty=format:"%ae" | head -n 5
 True
 True# 检查远程仓库信息
 Truegit remote -v
 True
 True# 测试 HTTPS 连接（会提示输入 PAT）
 Truegit ls-remote https://github.com/username/repository.git
 True```

 False### 7.3 排查 2FA 问题
 False
 False1. **检查 2FA 状态**：登录 GitHub 后在 Settings → Password and authentication 中查看
 False2. **测试验证器**：使用验证器 App 生成验证码，尝试登录
 False3. **使用恢复码**：如果验证器不可用，尝试使用恢复码登录
 False4. **联系支持**：如果所有方法都失败，联系 GitHub 支持团队
 False
 False## 8. 高级配置：多账户管理
 False
 False### 8.1 使用 SSH 配置多账户
 False
```bash
 True# ~/.ssh/config 文件
 TrueHost github.com-personal
 True HostName github.com
 True User git
 True IdentityFile ~/.ssh/id_rsa_personal
 True
 TrueHost github.com-work
 True HostName github.com
 True User git
 True IdentityFile ~/.ssh/id_rsa_work
 True```

 False### 8.2 对应仓库配置
 False
```bash
 True# 个人仓库
 Truegit remote set-url origin git@github.com-personal:username/personal-repo.git
 True
 True# 工作仓库
 Truegit remote set-url origin git@github.com-work:company/work-repo.git
 True```

 False## 延伸阅读
 False
 False- [GitHub：配置 2FA](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa) <!-- nofollow -->
 False- [GitHub：创建个人访问令牌](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) <!-- nofollow -->
 False- [GitHub：使用硬件安全密钥](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication#configuring-two-factor-authentication-using-a-security-key) <!-- nofollow -->
 False- [GitHub：管理多账户](https://docs.github.com/en/get-started/getting-started-with-git/managing-remote-repositories) <!-- nofollow -->

### 跨模块关联

- [[git/setup-and-init|Git 安装]]
 False
 False## 更新日志
 False
 False- **2026-04-05**：初版
 False- **2026-04-05**：扩写内容，增加详细的操作步骤、代码示例、故障诊断和高级配置
 False