---
order: 20
tags:
  - github
difficulty: intermediate
title: 仓库创建、克隆、归档、删除
module: github
category: 'GitHub Basics'
description: 'GitHub 仓库创建、克隆、归档、删除的完整操作指南。'
author: Anonymous
related:
  - github/GitHub概述
  - github/账户注册与双因素认证(2FA)
  - github/SSH与HTTPS远程配置
  - github/协作开发规范
prerequisites: []
---

## 1. 背景

**Repository（仓库）** 是 GitHub 上的项目容器，不仅存储代码，还包含 **Git 对象**、**Issues**、**Pull Requests**、**Actions**、**Wiki**、**Projects** 等多种协作功能。理解 **仓库可见性（public / private）**、**License（许可证）** 和 **README** 等基本概念，对于项目管理和开源合规至关重要。

## 2. 仓库类型与核心概念

### 2.1 仓库类型

- **公开仓库（Public）**：对所有人可见，适合开源项目
- **私有仓库（Private）**：仅对指定用户可见，适合商业项目和内部开发
- **内部仓库（Internal）**：仅对组织成员可见，需要 GitHub Enterprise

### 2.2 核心概念

- **默认分支**：仓库的主分支，默认为 `main`（之前为 `master`）
- **README**：仓库的说明文档，显示在仓库首页
- **.gitignore**：指定 Git 忽略的文件和目录
- **License**：开源许可证，规定了代码的使用方式
- **Issue**：用于跟踪 bug、功能请求和其他任务
- **Pull Request**：用于代码审查和合并
- **Actions**：自动化工作流程，如 CI/CD

## 3. 在网页上创建仓库

### 3.1 详细步骤

1. **登录 GitHub**，点击右上角的 "+", 选择 "New repository"
2. **填写仓库信息**：

- **Repository name**：仓库名称，建议使用小写字母和连字符
- **Description**：仓库描述，简要说明项目用途
- **Visibility**：选择公开或私有
- **Initialize this repository with**：
- **Add a README file**：推荐勾选，便于立即克隆和了解项目
- **Add .gitignore**：根据项目类型选择合适的模板
- **Choose a license**：选择适合的开源许可证

3. **点击 "Create repository"** 完成创建
   **截图占位**：`[图 03-1] New repository 页面填写名称、可见性、初始化 README`

### 3.2 组织仓库创建

1. **进入组织页面**：点击右上角头像 → Your organizations → 选择组织
2. **创建仓库**：点击 "Repositories" → "New"
3. **填写信息**：与个人仓库类似，但所有权属于组织
4. **设置权限**：可指定组织成员的访问权限

## 4. 命令行操作示例

### 4.1 克隆仓库

#### 4.1.1 克隆 HTTPS

```bash
 # 克隆默认分支
 git clone https://github.com/OWNER/REPO.git
 # 克隆指定分支
 git clone -b BRANCH_NAME https://github.com/OWNER/REPO.git
 # 浅克隆（适合大仓库）
 git clone --depth 1 https://github.com/OWNER/REPO.git
 # 进入仓库目录
 cd REPO
 # 查看远程配置
 git remote -v
```

#### 4.1.2 克隆 SSH

```bash
 # 克隆默认分支
 git clone git@github.com:OWNER/REPO.git
 # 克隆指定分支
 git clone -b BRANCH_NAME git@github.com:OWNER/REPO.git
 # 进入仓库目录
 cd REPO
 # 查看工作区状态
 git status
```

### 4.2 推送本地目录到远程

#### 4.2.1 推送已有本地仓库

```bash
 # 进入本地目录
 cd existing-project
 # 初始化 Git 仓库（如果尚未初始化）
 git init
 # 添加所有文件
 git add .
 # 提交初始版本
 git commit -m "chore: initial commit"
 # 重命名默认分支为 main（如果需要）
 git branch -M main
 # 添加远程仓库
 git remote add origin https://github.com/OWNER/REPO.git
 # 推送并设置上游分支
 git push -u origin main
```

#### 4.2.2 推送本地分支到远程

```bash
 # 创建并切换到新分支
 git checkout -b feature-branch
 # 进行修改并提交
 git add .
 git commit -m "feat: add new feature"
 # 推送新分支到远程
 git push -u origin feature-branch
```

### 4.3 管理远程仓库

```bash
 # 查看远程仓库
 git remote -v
 # 添加远程仓库
 git remote add upstream https://github.com/UPSTREAM/REPO.git
 # 修改远程 URL
 git remote set-url origin https://github.com/NEW_OWNER/REPO.git
 # 删除远程仓库
 git remote remove upstream
 # 拉取远程更新
 git pull origin main
 # 推送本地更新
 git push origin main
```

## 5. 仓库管理操作

### 5.1 归档仓库

**归档**会使仓库变为只读状态，禁止新的 Issues、Pull Requests 和提交，适合已完成的项目或需要长期保存但不再活跃的项目。

#### 5.1.1 网页操作

1. 进入仓库页面 → Settings → General
2. 滚动到 "Danger Zone" 部分
3. 点击 "Archive this repository"
4. 填写仓库名称确认归档
5. 点击 "I understand the consequences, archive this repository"
   **截图占位**：`[图 03-2] 归档确认对话框`

#### 5.1.2 归档后的影响

- 仓库标记为 "Archived"
- 无法创建新的 Issues、Pull Requests
- 无法推送新的提交
- 仍可克隆和 fork 仓库
- 所有现有内容保持不变

### 5.2 删除仓库

**删除**是不可逆操作，一旦删除将无法恢复，务必谨慎操作。

#### 5.2.1 备份仓库

在删除前，建议创建完整备份：

```bash
 # 创建镜像克隆（包含所有分支和引用）
 git clone --mirror https://github.com/OWNER/REPO.git
 # 备份 Issues 和 Wiki（可使用 GitHub API 或第三方工具）
```

#### 5.2.2 网页操作

1. 进入仓库页面 → Settings → General
2. 滚动到 "Danger Zone" 部分
3. 点击 "Delete this repository"
4. 输入 `OWNER/REPO` 确认删除
5. 点击 "I understand the consequences, delete this repository"
   **截图占位**：`[图 03-3] 删除确认对话框`

### 5.3 仓库设置管理

#### 5.3.1 分支保护

1. 进入仓库页面 → Settings → Branches
2. 点击 "Add branch protection rule"
3. 设置保护规则：

- **Branch name pattern**：如 `main`
- **Require a pull request before merging**：启用 PR 审查
- **Require status checks to pass before merging**：启用 CI 检查
- **Require signed commits**：要求签名提交
- **Include administrators**：对管理员也应用规则

4. 点击 "Create"

#### 5.3.2 协作者管理

1. 进入仓库页面 → Settings → Collaborators and teams
2. 点击 "Add people" 或 "Add teams"
3. 输入用户名或团队名称
4. 选择权限级别：

- **Read**：只读权限
- **Write**：可推送权限
- **Maintain**：可管理仓库设置
- **Admin**：完全管理权限

5. 点击 "Add"

## 6. 常见问题与解决方案

| 问题                    | 原因                            | 解决方案                                                                   |
| ----------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| 大仓库克隆慢            | 仓库体积大，历史提交多          | 使用浅克隆：`git clone --depth 1`，后续可使用 `git fetch --depth=100` 加深 |
| 克隆失败，提示 LFS 错误 | 仓库使用了 Git LFS 但本地未安装 | 安装 Git LFS：`git lfs install`，然后执行 `git lfs pull`                   |
| 推送失败，提示权限不足  | 没有仓库写权限                  | 检查协作者权限，确保拥有 Write 或更高权限                                  |
| 分支保护导致推送失败    | 分支设置了保护规则              | 创建 PR 进行代码审查，或暂时调整分支保护规则                               |
| 远程仓库不存在          | 仓库已被删除或 URL 错误         | 检查仓库 URL 是否正确，确认仓库是否存在                                    |

### 6.1 故障诊断脚本

```bash
 # 检查 Git 版本
 git --version
 # 检查远程仓库状态
 git remote -v
 git ls-remote origin
 # 检查本地分支
 git branch -a
 # 检查仓库大小
 du -sh .git
 # 检查 LFS 状态
 git lfs status
 # 测试网络连接
 ping github.com
 traceroute github.com # Linux/macOS
 tracert github.com # Windows
```

## 7. 最佳实践

### 7.1 仓库创建与初始化

- **合理命名**：使用小写字母、连字符，避免特殊字符
- **完善 README**：包含项目简介、安装说明、使用方法等
- **选择合适的 .gitignore**：根据项目类型选择或创建合适的 .gitignore 文件
- **添加 License**：明确项目的开源许可证
- **初始化必要文件**：如 README.md、LICENSE、.gitignore 等

### 7.2 仓库管理

- **定期备份**：使用 `git clone --mirror` 定期备份仓库
- **分支管理**：采用合理的分支策略，如 GitFlow
- **权限控制**：根据角色设置适当的访问权限
- **分支保护**：对主分支设置严格的保护规则
- **Issue 和 PR 模板**：创建标准化的模板，提高协作效率

### 7.3 仓库迁移与归档

- **迁移前准备**：确保所有代码已提交，分支已同步
- **通知团队**：提前通知团队成员迁移计划
- **验证迁移**：迁移后验证所有功能和历史记录
- **归档策略**：对于已完成的项目，及时归档以减少维护成本
- **删除前确认**：删除仓库前务必进行完整备份

### 7.4 安全最佳实践

- **定期审计**：检查仓库中的敏感信息，如密钥、密码等
- **使用环境变量**：避免在代码中硬编码敏感信息
- **启用 Dependabot**：自动检测和更新依赖项
- **定期更新**：及时更新依赖项，修复安全漏洞
- **私有转公开前检查**：审计历史提交，确保没有敏感信息

## 8. 高级操作

### 8.1 仓库模板

1. **创建模板仓库**：在仓库设置中勾选 "Template repository"
2. **使用模板**：点击 "Use this template" 按钮创建新仓库
3. **模板优势**：快速复制仓库结构，不包含历史提交

### 8.2 仓库镜像

```bash
 # 创建镜像克隆
 git clone --mirror https://github.com/ORIGIN/REPO.git
 # 推送镜像到新位置
 cd REPO.git
 git push --mirror https://github.com/NEW/REPO.git
```

### 8.3 批量管理仓库

```bash
 # 使用 GitHub CLI 列出组织仓库
 gh repo list ORGANIZATION
 # 使用 GitHub CLI 创建仓库
 gh repo create ORGANIZATION/REPO --public --description "Description"
 # 使用 GitHub CLI 归档仓库
 gh repo archive OWNER/REPO
```

## 9. 企业级仓库管理

### 9.1 组织级仓库策略

- **统一命名规范**：制定仓库命名规则，便于管理和查找
- **标准化模板**：创建组织级仓库模板，确保一致性
- **权限管理**：使用团队和角色管理权限
- **审计日志**：启用仓库活动审计，追踪操作记录
- **备份策略**：建立定期备份机制，确保数据安全

### 9.2 合规与安全

- **许可证合规**：确保所有项目使用适当的许可证
- **代码审查**：建立强制代码审查流程
- **安全扫描**：集成安全扫描工具，检测漏洞
- **依赖管理**：定期更新依赖项，修复安全问题
- **访问控制**：基于最小权限原则设置访问权限

## 延伸阅读

- [GitHub：管理仓库设置](https://docs.github.com/en/repositories) <!-- nofollow -->
- [GitHub：创建仓库](https://docs.github.com/en/get-started/quickstart/create-a-repo) <!-- nofollow -->
- [GitHub：归档仓库](https://docs.github.com/en/repositories/archiving-a-github-repository) <!-- nofollow -->
- [GitHub：删除仓库](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository) <!-- nofollow -->
- [GitHub：分支保护规则](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches) <!-- nofollow -->

### 跨模块关联

- [Git 远程操作](git/remote-operations)

## 更新日志

- **2026-04-05**：初版
- **2026-04-05**：扩写内容，增加详细的操作步骤、代码示例、故障诊断和高级配置
