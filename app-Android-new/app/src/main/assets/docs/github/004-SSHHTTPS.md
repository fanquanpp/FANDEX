---
order: 40
title: SSH 与 HTTPS 远程配置
module: 'github'
category: 工具链
difficulty: intermediate
description: SSH 与 HTTPS 远程配置对比、公钥配置、HTTPS+PAT 配置指南与故障排查。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'github/002-AccountRegister2FA'
  - 'github/003-RepositoryCreateCloneArchiveDelete'
  - 'github/005-CollaborationDevelopmentStandard'
  - 'github/006-READMEFile'
prerequisites: []
---


## 0. 从一个生活场景说起：钥匙与门禁卡

想象你所在的公司大楼有两种进门方式：**钥匙（SSH）** 和 **门禁卡（HTTPS）**。

- **钥匙**：配好之后天天随身带，开门不需要联网验证、不用输密码——但第一次配钥匙要花点功夫（生成密钥对），而且钥匙丢了很麻烦。
- **门禁卡**：人人都有、发卡简单，但每次进门都要"刷卡 + 输入临时口令"（输入 PAT），口令还会过期，过期就得重新领。

GitHub 远程连接正好对应这两种方式：**SSH** 用非对称密钥对认证，配置一次长期免密；**HTTPS** 用"用户名 + 个人访问令牌（PAT）"认证，简单但每次操作需要凭据。本篇采用**对比驱动**的写法，把两种方式从原理到配置全程对照，帮你做出适合自己的选择。

## 1. 原理讲解：两种认证方式对比

### 1.1 直观对比表

| 特性 | SSH | HTTPS |
| :--- | :--- | :--- |
| 认证方式 | 非对称密钥对（公钥 + 私钥） | 用户名 + PAT（个人访问令牌） |
| 默认端口 | 22（可改用 443） | 443 |
| 首次配置 | 稍复杂：生成密钥、添加公钥 | 简单：生成 PAT 即可 |
| 日常体验 | 配置后免密，适合高频推送 | 凭据管理器记住后基本免密 |
| 安全性 | 私钥保存在本地，安全性高 | PAT 泄露风险需注意保管 |
| 网络兼容性 | 部分企业防火墙会拦截 22 端口 | 几乎不被拦截（走 HTTPS 443） |
| 适用场景 | 多设备高频开发、长期项目 | 偶尔操作、受限网络环境 |

### 1.2 SSH 原理：一步步看懂

1. 本地生成一对密钥：**公钥（.pub）** 和 **私钥（无后缀）**。
2. 把**公钥**上传到 GitHub 账户（Settings → SSH and GPG keys）。
3. 连接时，GitHub 用公钥加密一段"挑战"发送给你，本地用**私钥**解密并回应。
4. GitHub 验证通过，完成认证。

> 关键点：**私钥绝不外传**，公钥随便分享。私钥泄露 = 钥匙被复制，攻击者可冒充你访问仓库。

### 1.3 HTTPS + PAT 原理

- 2021 年后 GitHub 不再接受账户密码做 Git 认证，改为 **PAT（个人访问令牌）**。
- PAT 是你在 GitHub 设置中生成的"带权限的临时密码"，可以设置**有效期**（30/60/90 天等）和**权限范围**（scopes）。
- 本地通过**凭据管理器**（Windows 的 Git Credential Manager、macOS 的 keychain）保存 PAT，避免每次输入。

## 2. SSH 配置：从生成到使用

### 2.1 生成密钥对

```bash
# 推荐 Ed25519 算法（更安全、文件更小）
ssh-keygen -t ed25519 -C "you@example.com" -f ~/.ssh/id_ed25519_github
# 参数说明：
#   -t ed25519  使用 Ed25519 算法
#   -C "..."    添加注释（建议用你的 GitHub 邮箱）
#   -f 路径     指定密钥保存路径和文件名（Windows 可写 %USERPROFILE%\.ssh\id_ed25519_github）
#   -N ""       空密码短语；生产环境建议设置密码短语
```

### 2.2 启动 ssh-agent 并加载私钥

```bash
# Windows（PowerShell）
Start-Service ssh-agent
ssh-add "$env:USERPROFILE\.ssh\id_ed25519_github"
# macOS / Linux
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_github
# 查看已加载的密钥
ssh-add -l
```

### 2.3 复制公钥并添加到 GitHub

```bash
# 查看公钥内容（把整行复制下来）
cat ~/.ssh/id_ed25519_github.pub
# Windows: type %USERPROFILE%\.ssh\id_ed25519_github.pub
```

网页操作：头像 → **Settings** → **SSH and GPG keys** → **New SSH key** → 填写标题（如 "My Laptop"）→ 粘贴公钥 → **Add SSH key**。

### 2.4 测试连接

```bash
ssh -T git@github.com
# 首次连接会提示确认主机指纹，输入 yes 回车
# 成功输出：Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

> 官方提醒：如果输出包含你的用户名即成功；若提示 `Permission denied (publickey)`，按第 5 节排查。

### 2.5 使用 SSH 克隆与推送

```bash
# 克隆（注意是 git@github.com: 开头）
git clone git@github.com:username/repository.git

# 日常推送流程
cd repository
git add .
git commit -m "feat: update"
git push origin main
```

## 3. HTTPS 配置：从生成 PAT 到使用

### 3.1 生成 PAT

1. 进入 **Settings → Developer settings → Personal access tokens**。
2. **Fine-grained token（细粒度令牌，推荐）**：可选择仅授权特定仓库、按需勾选具体权限、设置过期时间。
3. 或 **Tokens (classic)**：勾选 scopes，推送代码选 `repo`。
4. 点击 **Generate token**，**立即复制保存**（离开页面后无法再次查看）。

### 3.2 配置凭据管理器

```bash
# Windows：Git Credential Manager
git config --global credential.helper manager
# macOS
git config --global credential.helper osxkeychain
# Linux
git config --global credential.helper libsecret
# 验证配置
git config --global --get credential.helper
```

### 3.3 使用 HTTPS 克隆与推送

```bash
# 克隆
git clone https://github.com/username/repository.git

# 首次推送会提示输入：
#   用户名：GitHub 用户名
#   密码：粘贴 PAT（不是账户密码！）
git push origin main

# 查看远程地址 / 切换协议
git remote -v
git remote set-url origin https://github.com/username/repository.git   # HTTPS -> 已是 HTTPS
git remote set-url origin git@github.com:username/repository.git        # 切到 SSH
```

## 4. 多账户场景：SSH config 配置

同时使用个人账户和公司账户时，用 `~/.ssh/config` 区分：

```sshconfig
# 文件：~/.ssh/config
# 个人账户
Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal
  IdentitiesOnly yes

# 公司账户
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work
  IdentitiesOnly yes
```

```bash
# 对应克隆命令
git clone git@github.com-personal:username/personal-repo.git
git clone git@github.com-work:company/work-repo.git
```

## 5. 高级配置：代理、自动加载与凭据安全

### 5.1 SSH 走代理（企业网络）

企业网络常需代理才能出网，可在 `~/.ssh/config` 中为 GitHub 配置代理命令：

```sshconfig
Host github.com
  HostName github.com
  User git
  ProxyCommand nc -X 5 -x proxy.example.com:1080 %h %p
  IdentityFile ~/.ssh/id_ed25519_github
```

### 5.2 自动加载密钥（免每次输密码短语）

```bash
# Windows：在 PowerShell 配置文件中添加
Start-Service ssh-agent
ssh-add ~/.ssh/id_ed25519_github

# macOS/Linux：在 ~/.bashrc 或 ~/.zshrc 中添加
if [ -z "$SSH_AUTH_SOCK" ]; then
  eval "$(ssh-agent -s)"
  ssh-add ~/.ssh/id_ed25519_github
fi
```

### 5.3 凭据安全要点

- **私钥权限**：Linux/macOS 执行 `chmod 600 ~/.ssh/id_ed25519`，防止其他用户读取。
- **PAT 不落盘**：不要把 PAT 写进脚本或提交到仓库；CI 环境用 GitHub Actions 的 `GITHUB_TOKEN` / secrets 代替个人 PAT。
- **定期轮换**：PAT 到期前生成新令牌；SSH 密钥若疑泄露立即在 GitHub 上删除并重新生成。
- **备份私钥**：把私钥加密备份到安全位置，换机时不必重新注册。

### 5.4 故障诊断命令速查

遇到连接问题，按顺序执行以下命令定位：

```bash
# 1. 详细查看 SSH 连接过程（关键：确认使用的密钥文件）
ssh -vT git@github.com

# 2. 确认私钥已加载
ssh-add -l

# 3. 测试远程仓库可读性（HTTPS / SSH 各试一次）
git ls-remote https://github.com/username/repository.git
git ls-remote git@github.com:username/repository.git

# 4. 检查凭据配置
git config --list | grep credential

# 5. 检查远程地址是否用错协议
git remote -v
```

典型流程：先用 `ssh -vT` 看是"密钥被拒"还是"连接超时"；密钥被拒查公钥是否在 GitHub 上、私钥是否加载；连接超时查网络与防火墙。

## 6. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 权限被拒绝 | `Permission denied (publickey)` | 公钥未添加到 GitHub、私钥未加载到 ssh-agent、连接了错误的主机 | 检查 Settings → SSH and GPG keys 是否有该公钥；`ssh-add -l` 确认私钥已加载；确认始终用 `git@github.com` 而非你的用户名 |
| 主机密钥验证失败 | `Host key verification failed` | 主机指纹不匹配（可能是中间人攻击或 known_hosts 混乱） | 对比 GitHub 官方公布的 SSH 密钥指纹，确认无误后再连接；必要时清理 `~/.ssh/known_hosts` 对应条目 |
| 认证失败 | `Authentication failed` | HTTPS 下误用账户密码；PAT 过期或权限不足 | 重新生成 PAT 并粘贴；设置凭据管理器自动保存 |
| PAT 过期 | 推送突然失败（401/403） | Classic token 设置了有效期 | 到期前生成新 PAT，用 `git credential-manager` 更新缓存 |
| 多账户串号 | 提交身份混乱 | 多个密钥/PAT 管理混乱 | 用 SSH config 的 Host 别名区分；为不同账户设置不同 `user.email` |
| 端口 22 被拦截 | `Connection timed out`（企业网络） | 防火墙阻止 SSH 22 端口 | 改用 HTTPS，或配置 SSH over HTTPS 端口 443（`~/.ssh/config` 中设置 `HostName ssh.github.com` + `Port 443`） |

## 8. 一句话记忆

**SSH 像配好的钥匙——配一次长期免密；HTTPS 像门禁卡——发卡简单但要保管好 PAT 并定期换卡；高频开发选 SSH，偶尔访问选 HTTPS。**

### 延伸阅读

- 2FA 与 PAT 的关系，见 002 篇《账户注册与双因素认证》。
- gh CLI 自动管理凭据，见 020 篇《GitHub CLI》。
- 仓库克隆与远程管理，见 003 篇《仓库创建、克隆、归档、删除》。
