---
order: 100
tags:
  - 'github'
  - 'security'
  - 'database'
  - 'networking'
  - 'git-workflow'
difficulty: 'intermediate'
title: '常见问题排查'
module: 'github'
category: 'GitHub Advanced'
description: 'GitHub 常见问题排查：权限问题、大文件、换行符、子模块、GPG 签名、Actions 配额。'
author: 'Anonymous'
---

## 目录

1. [背景](#背景)
2. [认证问题](#认证问题)
3. [大文件问题](#大文件问题)
4. [换行符问题](#换行符问题)
5. [子模块问题](#子模块问题)
6. [提交签名问题](#提交签名问题)
7. [GitHub Actions 问题](#github-actions-问题)
8. [其他常见问题](#其他常见问题)
9. [综合诊断与预防](#综合诊断与预防)
10. [实际案例分析](#实际案例分析)
11. [延伸阅读](#延伸阅读)

---

## 1. 背景

本地与 CI 常见问题多与 **认证**、**历史中的二进制大文件**、**跨平台换行**、**子模块未初始化**、**签名密钥** 与 **配额** 相关。本节给出 **可复制的诊断命令** 与 **修复方向**。

## 2. 认证问题

### 2.1 Permission denied (publickey)

**现象**：`git push` 或 `ssh -T git@github.com` 失败，提示 `Permission denied (publickey)`。
**诊断**：

```bash
 # 检查 SSH 连接详细信息
 ssh -vT git@github.com
 # 检查 SSH 密钥列表
 ssh-add -l
 # 检查 SSH 配置
 cat ~/.ssh/config
```

**修复**：

1. **生成新的 SSH 密钥**（如果没有）：

```bash
 ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. **添加 SSH 密钥到 ssh-agent**：

```bash
 eval "$(ssh-agent -s)"
 ssh-add ~/.ssh/id_ed25519
```

3. **将公钥添加到 GitHub**：

- 复制公钥内容：`cat ~/.ssh/id_ed25519.pub`
- 登录 GitHub，进入 **Settings → SSH and GPG keys → New SSH key**
- 粘贴公钥并保存

4. **检查 SSH 配置**：

```bash
 # 编辑 ~/.ssh/config
 Host github.com
 HostName github.com
 User git
 IdentityFile ~/.ssh/id_ed25519
```

### 2.2 HTTPS 认证失败

**现象**：`git push` 失败，提示输入用户名和密码，但输入后仍然失败。
**诊断**：

```bash
 # 检查远程仓库 URL
 git remote -v
 # 检查 Git 凭据缓存
 git credential-cache status
```

**修复**：

1. **使用个人访问令牌（PAT）**：

- 登录 GitHub，进入 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
- 创建新令牌，设置适当的权限
- 使用令牌作为密码进行认证

2. **配置 Git 凭据缓存**：

```bash
 # 缓存凭据 1 小时
 git config --global credential.helper 'cache --timeout=3600'
```

3. **更新远程仓库 URL**：

```bash
 # 使用 HTTPS URL 并包含令牌
 git remote set-url origin https://<token>@github.com/username/repo.git
```

## 3. 大文件问题

### 3.1 推送被拒（超过 100MB）

**现象**：`git push` 失败，提示文件超过 100MB 限制。
**诊断**：

```bash
 # 查找仓库中的大文件
 git lfs ls-files
 # 查找历史中的大文件
 git rev-list --objects --all | grep -E "^[0-9a-f]{40} .{10,}$" | sort -k 2 -n -r | head -20
```

**修复**：

1. **使用 Git LFS** 跟踪大文件：

```bash
 # 安装 Git LFS
 git lfs install
 # 跟踪大文件类型
 git lfs track "*.psd"
 git lfs track "*.zip"
 # 提交 .gitattributes 文件
 git add .gitattributes
 git commit -m "Add Git LFS tracking"
```

2. **移除历史中的大文件**：

- 使用 `git filter-repo`：

```bash
 # 安装 git-filter-repo
 # 过滤大文件
 git filter-repo --path LARGE_FILE.bin --invert-paths
 # 强制推送
 git push --force origin main
```

- 使用 BFG Repo-Cleaner：

```bash
 # 下载 BFG
 java -jar bfg.jar --strip-blobs-bigger-than 100M
 git reflog expire --expire=now --all
 git gc --prune=now --aggressive
```

### 3.2 Git LFS 相关问题

**现象**：Git LFS 跟踪的文件无法正确推送或拉取。
**诊断**：

```bash
 # 检查 Git LFS 状态
 git lfs status
 # 检查 Git LFS 配置
 git lfs config --list
```

**修复**：

1. **确保 Git LFS 已安装**：

```bash
 git lfs install
```

2. **重新推送 LFS 对象**：

```bash
 git lfs push --all origin
```

3. **拉取 LFS 对象**：

```bash
 git lfs pull
```

## 4. 换行符问题

### 4.1 LF / CRLF 冲突

**现象**：Windows 下整文件 **CRLF** 导致 diff 噪声或脚本 **shebang** 失败。
**诊断**：

```bash
 # 检查 Git 换行符配置
 git config --get core.autocrlf
 # 检查文件换行符类型
 file -k file.txt
```

**修复**：

1. **配置 Git 换行符处理**：

- Windows：`git config --global core.autocrlf `
- macOS/Linux：`git config --global core.autocrlf input`

2. **使用 .gitattributes 文件**：

```gitattributes
 # 自动处理文本文件
 * text=auto
 # 强制使用 LF
 *.sh text eol=lf
 *.py text eol=lf
 *.js text eol=lf
 # 强制使用 CRLF
 *.bat text eol=crlf
 *.cmd text eol=crlf
 # 二进制文件
 *.png binary
 *.jpg binary
 *.zip binary
```

3. **重新规范化所有文件**：

```bash
 git add --renormalize .
 git commit -m "Normalize line endings"
```

## 5. 子模块问题

### 5.1 子模块未初始化

**现象**：克隆后子目录空或旧版本。
**诊断**：

```bash
 # 检查子模块状态
 git submodule status
```

**修复**：

1. **初始化并更新子模块**：

```bash
 # 初始化子模块
 git submodule init
 # 更新子模块
 git submodule update
 # 递归初始化和更新（包含嵌套子模块）
 git submodule update --init --recursive
```

2. **克隆时直接初始化子模块**：

```bash
 git clone --recursive https://github.com/username/repo.git
```

### 5.2 子模块版本更新

**现象**：子模块有新的提交，但主仓库未更新。
**修复**：

1. **更新子模块到最新版本**：

```bash
 cd submodule_directory
 git pull origin main
 cd ..
 git add submodule_directory
 git commit -m "Update submodule to latest version"
```

2. **批量更新所有子模块**：

```bash
 git submodule foreach git pull origin main
 git add .
 git commit -m "Update all submodules"
```

## 6. 提交签名问题

### 6.1 GPG 签名失败

**现象**：`git commit` 失败，提示 GPG 签名错误。
**诊断**：

```bash
 # 检查 GPG 密钥
  gpg --list-secret-keys --keyid-format LONG
 # 检查 Git GPG 配置
  git config --get user.signingkey
  git config --get commit.gpgsign
```

**修复**：

1. **生成 GPG 密钥**（如果没有）：

```bash
 gpg --full-generate-key
```

2. **配置 Git 使用 GPG 密钥**：

```bash
 # 获取 GPG 密钥 ID
 gpg --list-secret-keys --keyid-format LONG
 # 配置 Git
 git config --global user.signingkey <GPG_KEY_ID>
 git config --global commit.gpgsign
```

3. **将 GPG 公钥添加到 GitHub**：

```bash
 # 导出公钥
 gpg --armor --export <GPG_KEY_ID>
```

- 复制公钥内容
- 登录 GitHub，进入 **Settings → SSH and GPG keys → New GPG key**
- 粘贴公钥并保存

4. **解决 TTY 问题**：

```bash
 # 在 ~/.bashrc 或 ~/.zshrc 中添加
 export GPG_TTY=$(tty)
```

### 6.2 SSH 签名

**现象**：使用 SSH 密钥进行提交签名。
**配置**：

1. **设置 Git 使用 SSH 签名**：

```bash
 git config --global gpg.format ssh
 git config --global user.signingkey ~/.ssh/id_ed25519.pub
 git config --global commit.gpgsign
```

2. **将 SSH 公钥添加到 GitHub**：

- 确保 SSH 公钥已添加到 GitHub
- 进入 **Settings → SSH and GPG keys** 确认

## 7. GitHub Actions 问题

### 7.1 Actions 分钟数耗尽

**现象**：私有库 workflow **排队/失败**，账单显示 **minutes** 用尽。
**诊断**：

```bash
 # 查看 Actions 使用情况
 # 在 GitHub 仓库 → Settings → Billing and plans → Actions
```

**修复**：

1. **优化 workflow**：

- 使用 **矩阵构建** 时合理设置组合
- 添加 **缓存** 减少依赖安装时间
- 限制 **并发** 运行的 workflow
- 使用 **条件执行** 减少不必要的运行

2. **使用自托管 runner**：

- 在 GitHub 仓库 → Settings → Actions → Runners → New self-hosted runner
- 按照说明安装和配置自托管 runner

3. **考虑开源仓库**：

- 公共仓库有更多的免费分钟数

### 7.2 Actions 权限问题

**现象**：Actions 运行失败，提示权限不足。
**诊断**：

```yaml
# 检查 workflow 文件中的权限配置
permissions:
  contents: read
  packages: write
  # 其他需要的权限
```

**修复**：

1. **在 workflow 文件中设置正确的权限**：

```yaml
permissions:
contents: write
pull-requests: write
# 根据需要添加其他权限
```

2. **使用 `GITHUB_TOKEN`**：

- Actions 自动提供 `GITHUB_TOKEN` 环境变量
- 确保 workflow 中正确使用 `secrets.GITHUB_TOKEN`

3. **检查仓库设置**：

- 进入 GitHub 仓库 → Settings → Actions → General
- 确保 **Workflow permissions** 设置正确

### 7.3 Actions 构建失败

**现象**：Actions 构建过程中失败。
**诊断**：

1. **查看 Actions 日志**：

- 进入 GitHub 仓库 → Actions
- 点击失败的 workflow → 查看详细日志

2. **常见失败原因**：

- 依赖安装失败
- 测试失败
- 构建命令错误
- 环境配置问题
  **修复**：

1. **修复依赖问题**：

- 检查 `package.json`、`requirements.txt` 等依赖文件
- 确保依赖版本兼容

2. **修复测试问题**：

- 检查测试代码和测试数据
- 确保测试环境配置正确

3. **修复构建命令**：

- 检查构建脚本和命令
- 确保构建环境正确

4. **添加调试信息**：

```yaml
 steps:
 - name: Debug information
 run: |
 echo "Node version: $(node -v)"
 echo "npm version: $(npm -v)"
 echo "Current directory: $(pwd)"
 ls -la
```

## 8. 其他常见问题

### 8.1 分支保护规则导致推送失败

**现象**：`git push` 失败，提示分支受保护。
**诊断**：

- 检查 GitHub 仓库 → Settings → Branches → Branch protection rules
  **修复**：

1. **创建 PR**：

- 推送到新分支
- 创建 PR 并请求审核

2. **临时禁用分支保护**（仅维护者）：

- 进入分支保护规则设置
- 临时禁用相关规则
- 推送后重新启用

### 8.2 合并冲突

**现象**：合并 PR 时出现冲突。
**修复**：

1. **本地解决冲突**：

```bash
 # 拉取最新代码
 git pull origin main
 # 解决冲突
 # 编辑冲突文件
 # 标记冲突已解决
 git add .
 # 继续合并
 git commit
 # 推送
 git push
```

2. **使用 GitHub 网页界面解决冲突**：

- 进入 PR 页面
- 点击 "Resolve conflicts"
- 在网页编辑器中解决冲突
- 提交解决后的代码

### 8.3 标签推送失败

**现象**：`git push --tags` 失败。
**修复**：

1. **检查权限**：确保有推送标签的权限
2. **强制推送标签**：

```bash
 git push --tags --force
```

3. **单独推送特定标签**：

```bash
 git push origin <tag_name>
```

## 9. 综合诊断与预防

### 9.1 综合诊断脚本

```bash
 #!/usr/bin/env bash
 set -euo pipefail
 # 基本信息
 echo "== 系统信息 =="
 uname -a
 echo "== Git 版本 =="
 git --version
 # 仓库信息
 echo "== 远程仓库 =="
 git remote -v
 echo "== 当前分支 =="
 git branch -vv
 echo "== 最近提交 =="
 git log -1 --oneline
 # 配置信息
 echo "== Git 配置 =="
 git config --list
 echo "== SSH 配置 =="
 cat ~/.ssh/config 2>/dev/null || echo "No SSH config"
 # 子模块信息
 echo "== 子模块状态 =="
 git submodule status 2>/dev/null || echo "No submodules"
 # LFS 信息
 echo "== LFS 状态 =="
 command -v git-lfs && git lfs version || echo "LFS not installed"
 command -v git-lfs && git lfs status 2>/dev/null || echo "No LFS status"
 # 换行符配置
 echo "== 换行符配置 =="
 git config --get core.autocrlf
 ls -la .gitattributes 2>/dev/null || echo "No .gitattributes"
 # GPG 信息
 echo "== GPG 状态 =="
 gpg --list-secret-keys --keyid-format LONG 2>/dev/null || echo "No GPG keys"
 git config --get user.signingkey 2>/dev/null || echo "No signing key configured"
 # 网络测试
 echo "== 网络测试 =="
 ping -c 3 github.com 2>/dev/null || echo "Ping failed"
 ssh -T git@github.com 2>&1 || echo "SSH test failed"
```

### 9.2 预防措施

1. **使用 Git hooks**：

- **pre-commit**：检查提交信息、代码风格、大文件等
- **pre-push**：检查推送前的状态

2. **配置模板**：

- 提交信息模板
- PR 模板
- Issue 模板

3. **自动化工具**：

- **Dependabot**：自动更新依赖
- **Code Scanning**：自动代码安全扫描
- **Secret Scanning**：自动敏感信息扫描

4. **文档**：

- **CONTRIBUTING.md**：贡献指南
- **README.md**：项目说明
- **SECURITY.md**：安全漏洞上报流程

5. **培训**：

- 团队 Git 最佳实践培训
- 定期代码审查
- 常见问题分享会

## 10. 实际案例分析

### 10.1 案例一：SSH 认证失败

**问题**：开发者在新机器上克隆仓库时，提示 `Permission denied (publickey)`。
**原因**：新机器没有配置 SSH 密钥，或者密钥未添加到 GitHub。
**解决方案**：

1. 生成新的 SSH 密钥
2. 添加密钥到 ssh-agent
3. 将公钥添加到 GitHub
4. 验证连接

### 10.2 案例二：大文件导致推送失败

**问题**：开发者尝试推送包含大文件的提交，提示文件超过 100MB 限制。
**原因**：GitHub 限制单个文件大小为 100MB。
**解决方案**：

1. 使用 Git LFS 跟踪大文件
2. 移除历史中的大文件
3. 重新推送

### 10.3 案例三：Actions 构建失败

**问题**：GitHub Actions 构建失败，提示依赖安装失败。
**原因**：依赖版本不兼容，或者网络问题导致依赖下载失败。
**解决方案**：

1. 检查依赖文件
2. 配置缓存
3. 添加重试机制
4. 检查网络连接

## 11. 延伸阅读

- [Troubleshooting connectivity](https://docs.github.com/en/authentication/troubleshooting-ssh) <!-- nofollow -->
- [Working with large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files) <!-- nofollow -->
- [Configuring Git to handle line endings](https://docs.github.com/en/get-started/getting-started-with-git/configuring-git-to-handle-line-endings) <!-- nofollow -->
- [Working with submodules](https://docs.github.com/en/repositories/working-with-files/submodules) <!-- nofollow -->
- [About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification) <!-- nofollow -->
- [Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) <!-- nofollow -->

## 更新日志

- **2026-04-05**：初版。
- **2026-05-03**：扩展内容，添加更多常见问题的详细解决方案、更全面的诊断命令、更详细的修复步骤、更多的预防措施、实际案例分析、与其他工具的集成等。
