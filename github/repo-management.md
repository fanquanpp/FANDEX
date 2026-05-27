# 仓库创建、克隆、归档、删除
 False
 False> @Version: v3.5.0
 False
 False> @Author: Anonymous
 False> @Category: GitHub Basics
 False> @Description: GitHub 仓库创建、克隆、归档、删除的完整操作指南。 | Complete guide for GitHub repository creation, cloning, archiving, and deletion.
 False
 False---
 False
 False## 目录
 False
 False1. [背景](#背景)
 False2. [仓库类型与核心概念](#仓库类型与核心概念)
 False3. [在网页上创建仓库](#在网页上创建仓库)
 False4. [命令行操作示例](#命令行操作示例)
 False5. [仓库管理操作](#仓库管理操作)
 False6. [常见问题与解决方案](#常见问题与解决方案)
 False7. [最佳实践](#最佳实践)
 False8. [高级操作](#高级操作)
 False9. [企业级仓库管理](#企业级仓库管理)
 False
 False---
 False
 False## 1. 背景
 False
 False**Repository（仓库）** 是 GitHub 上的项目容器，不仅存储代码，还包含 **Git 对象**、**Issues**、**Pull Requests**、**Actions**、**Wiki**、**Projects** 等多种协作功能。理解 **仓库可见性（public / private）**、**License（许可证）** 和 **README** 等基本概念，对于项目管理和开源合规至关重要。
 False
 False## 2. 仓库类型与核心概念
 False
 False### 2.1 仓库类型
 False
 False- **公开仓库（Public）**：对所有人可见，适合开源项目
 False- **私有仓库（Private）**：仅对指定用户可见，适合商业项目和内部开发
 False- **内部仓库（Internal）**：仅对组织成员可见，需要 GitHub Enterprise
 False
 False### 2.2 核心概念
 False
 False- **默认分支**：仓库的主分支，默认为 `main`（之前为 `master`）
 False- **README**：仓库的说明文档，显示在仓库首页
 False- **.gitignore**：指定 Git 忽略的文件和目录
 False- **License**：开源许可证，规定了代码的使用方式
 False- **Issue**：用于跟踪 bug、功能请求和其他任务
 False- **Pull Request**：用于代码审查和合并
 False- **Actions**：自动化工作流程，如 CI/CD
 False
 False## 3. 在网页上创建仓库
 False
 False### 3.1 详细步骤
 False
 False1. **登录 GitHub**，点击右上角的 "+", 选择 "New repository"
 False2. **填写仓库信息**：
 False - **Repository name**：仓库名称，建议使用小写字母和连字符
 False - **Description**：仓库描述，简要说明项目用途
 False - **Visibility**：选择公开或私有
 False - **Initialize this repository with**：
 False - **Add a README file**：推荐勾选，便于立即克隆和了解项目
 False - **Add .gitignore**：根据项目类型选择合适的模板
 False - **Choose a license**：选择适合的开源许可证
 False3. **点击 "Create repository"** 完成创建
 False
 False**截图占位**：`[图 03-1] New repository 页面填写名称、可见性、初始化 README`
 False
 False### 3.2 组织仓库创建
 False
 False1. **进入组织页面**：点击右上角头像 → Your organizations → 选择组织
 False2. **创建仓库**：点击 "Repositories" → "New"
 False3. **填写信息**：与个人仓库类似，但所有权属于组织
 False4. **设置权限**：可指定组织成员的访问权限
 False
 False## 4. 命令行操作示例
 False
 False### 4.1 克隆仓库
 False
 False#### 4.1.1 克隆 HTTPS
 False
```bash
 True# 克隆默认分支
 Truegit clone https://github.com/OWNER/REPO.git
 True
 True# 克隆指定分支
 Truegit clone -b BRANCH_NAME https://github.com/OWNER/REPO.git
 True
 True# 浅克隆（适合大仓库）
 Truegit clone --depth 1 https://github.com/OWNER/REPO.git
 True
 True# 进入仓库目录
 Truecd REPO
 True
 True# 查看远程配置
 Truegit remote -v
 True```

 False#### 4.1.2 克隆 SSH
 False
```bash
 True# 克隆默认分支
 Truegit clone git@github.com:OWNER/REPO.git
 True
 True# 克隆指定分支
 Truegit clone -b BRANCH_NAME git@github.com:OWNER/REPO.git
 True
 True# 进入仓库目录
 Truecd REPO
 True
 True# 查看工作区状态
 Truegit status
 True```

 False### 4.2 推送本地目录到远程
 False
 False#### 4.2.1 推送已有本地仓库
 False
```bash
 True# 进入本地目录
 Truecd existing-project
 True
 True# 初始化 Git 仓库（如果尚未初始化）
 Truegit init
 True
 True# 添加所有文件
 Truegit add .
 True
 True# 提交初始版本
 Truegit commit -m "chore: initial commit"
 True
 True# 重命名默认分支为 main（如果需要）
 Truegit branch -M main
 True
 True# 添加远程仓库
 Truegit remote add origin https://github.com/OWNER/REPO.git
 True
 True# 推送并设置上游分支
 Truegit push -u origin main
 True```

 False#### 4.2.2 推送本地分支到远程
 False
```bash
 True# 创建并切换到新分支
 Truegit checkout -b feature-branch
 True
 True# 进行修改并提交
 Truegit add .
 Truegit commit -m "feat: add new feature"
 True
 True# 推送新分支到远程
 Truegit push -u origin feature-branch
 True```

 False### 4.3 管理远程仓库
 False
```bash
 True# 查看远程仓库
 Truegit remote -v
 True
 True# 添加远程仓库
 Truegit remote add upstream https://github.com/UPSTREAM/REPO.git
 True
 True# 修改远程 URL
 Truegit remote set-url origin https://github.com/NEW_OWNER/REPO.git
 True
 True# 删除远程仓库
 Truegit remote remove upstream
 True
 True# 拉取远程更新
 Truegit pull origin main
 True
 True# 推送本地更新
 Truegit push origin main
 True```

 False## 5. 仓库管理操作
 False
 False### 5.1 归档仓库
 False
 False**归档**会使仓库变为只读状态，禁止新的 Issues、Pull Requests 和提交，适合已完成的项目或需要长期保存但不再活跃的项目。
 False
 False#### 5.1.1 网页操作
 False
 False1. 进入仓库页面 → Settings → General
 False2. 滚动到 "Danger Zone" 部分
 False3. 点击 "Archive this repository"
 False4. 填写仓库名称确认归档
 False5. 点击 "I understand the consequences, archive this repository"
 False
 False**截图占位**：`[图 03-2] 归档确认对话框`
 False
 False#### 5.1.2 归档后的影响
 False
 False- 仓库标记为 "Archived"
 False- 无法创建新的 Issues、Pull Requests
 False- 无法推送新的提交
 False- 仍可克隆和 fork 仓库
 False- 所有现有内容保持不变
 False
 False### 5.2 删除仓库
 False
 False**删除**是不可逆操作，一旦删除将无法恢复，务必谨慎操作。
 False
 False#### 5.2.1 备份仓库
 False
 False在删除前，建议创建完整备份：
 False
```bash
 True# 创建镜像克隆（包含所有分支和引用）
 Truegit clone --mirror https://github.com/OWNER/REPO.git
 True
 True# 备份 Issues 和 Wiki（可使用 GitHub API 或第三方工具）
 True```

 False#### 5.2.2 网页操作
 False
 False1. 进入仓库页面 → Settings → General
 False2. 滚动到 "Danger Zone" 部分
 False3. 点击 "Delete this repository"
 False4. 输入 `OWNER/REPO` 确认删除
 False5. 点击 "I understand the consequences, delete this repository"
 False
 False**截图占位**：`[图 03-3] 删除确认对话框`
 False
 False### 5.3 仓库设置管理
 False
 False#### 5.3.1 分支保护
 False
 False1. 进入仓库页面 → Settings → Branches
 False2. 点击 "Add branch protection rule"
 False3. 设置保护规则：
 False - **Branch name pattern**：如 `main`
 False - **Require a pull request before merging**：启用 PR 审查
 False - **Require status checks to pass before merging**：启用 CI 检查
 False - **Require signed commits**：要求签名提交
 False - **Include administrators**：对管理员也应用规则
 False4. 点击 "Create"
 False
 False#### 5.3.2 协作者管理
 False
 False1. 进入仓库页面 → Settings → Collaborators and teams
 False2. 点击 "Add people" 或 "Add teams"
 False3. 输入用户名或团队名称
 False4. 选择权限级别：
 False - **Read**：只读权限
 False - **Write**：可推送权限
 False - **Maintain**：可管理仓库设置
 False - **Admin**：完全管理权限
 False5. 点击 "Add"
 False
 False## 6. 常见问题与解决方案
 False
 False| 问题 | 原因 | 解决方案 |
 False|------|------|----------|
 False| 大仓库克隆慢 | 仓库体积大，历史提交多 | 使用浅克隆：`git clone --depth 1`，后续可使用 `git fetch --depth=100` 加深 |
 False| 克隆失败，提示 LFS 错误 | 仓库使用了 Git LFS 但本地未安装 | 安装 Git LFS：`git lfs install`，然后执行 `git lfs pull` |
 False| 推送失败，提示权限不足 | 没有仓库写权限 | 检查协作者权限，确保拥有 Write 或更高权限 |
 False| 分支保护导致推送失败 | 分支设置了保护规则 | 创建 PR 进行代码审查，或暂时调整分支保护规则 |
 False| 远程仓库不存在 | 仓库已被删除或 URL 错误 | 检查仓库 URL 是否正确，确认仓库是否存在 |
 False
 False### 6.1 故障诊断脚本
 False
```bash
 True# 检查 Git 版本
 Truegit --version
 True
 True# 检查远程仓库状态
 Truegit remote -v
 Truegit ls-remote origin
 True
 True# 检查本地分支
 Truegit branch -a
 True
 True# 检查仓库大小
 Truedu -sh .git
 True
 True# 检查 LFS 状态
 Truegit lfs status
 True
 True# 测试网络连接
 Trueping github.com
 Truetraceroute github.com # Linux/macOS
 Truetracert github.com # Windows
 True```

 False## 7. 最佳实践
 False
 False### 7.1 仓库创建与初始化
 False
 False- **合理命名**：使用小写字母、连字符，避免特殊字符
 False- **完善 README**：包含项目简介、安装说明、使用方法等
 False- **选择合适的 .gitignore**：根据项目类型选择或创建合适的 .gitignore 文件
 False- **添加 License**：明确项目的开源许可证
 False- **初始化必要文件**：如 README.md、LICENSE、.gitignore 等
 False
 False### 7.2 仓库管理
 False
 False- **定期备份**：使用 `git clone --mirror` 定期备份仓库
 False- **分支管理**：采用合理的分支策略，如 GitFlow
 False- **权限控制**：根据角色设置适当的访问权限
 False- **分支保护**：对主分支设置严格的保护规则
 False- **Issue 和 PR 模板**：创建标准化的模板，提高协作效率
 False
 False### 7.3 仓库迁移与归档
 False
 False- **迁移前准备**：确保所有代码已提交，分支已同步
 False- **通知团队**：提前通知团队成员迁移计划
 False- **验证迁移**：迁移后验证所有功能和历史记录
 False- **归档策略**：对于已完成的项目，及时归档以减少维护成本
 False- **删除前确认**：删除仓库前务必进行完整备份
 False
 False### 7.4 安全最佳实践
 False
 False- **定期审计**：检查仓库中的敏感信息，如密钥、密码等
 False- **使用环境变量**：避免在代码中硬编码敏感信息
 False- **启用 Dependabot**：自动检测和更新依赖项
 False- **定期更新**：及时更新依赖项，修复安全漏洞
 False- **私有转公开前检查**：审计历史提交，确保没有敏感信息
 False
 False## 8. 高级操作
 False
 False### 8.1 仓库模板
 False
 False1. **创建模板仓库**：在仓库设置中勾选 "Template repository"
 False2. **使用模板**：点击 "Use this template" 按钮创建新仓库
 False3. **模板优势**：快速复制仓库结构，不包含历史提交
 False
 False### 8.2 仓库镜像
 False
```bash
 True# 创建镜像克隆
 Truegit clone --mirror https://github.com/ORIGIN/REPO.git
 True
 True# 推送镜像到新位置
 Truecd REPO.git
 Truegit push --mirror https://github.com/NEW/REPO.git
 True```

 False### 8.3 批量管理仓库
 False
```bash
 True# 使用 GitHub CLI 列出组织仓库
 Truegh repo list ORGANIZATION
 True
 True# 使用 GitHub CLI 创建仓库
 Truegh repo create ORGANIZATION/REPO --public --description "Description"
 True
 True# 使用 GitHub CLI 归档仓库
 Truegh repo archive OWNER/REPO
 True```

 False## 9. 企业级仓库管理
 False
 False### 9.1 组织级仓库策略
 False
 False- **统一命名规范**：制定仓库命名规则，便于管理和查找
 False- **标准化模板**：创建组织级仓库模板，确保一致性
 False- **权限管理**：使用团队和角色管理权限
 False- **审计日志**：启用仓库活动审计，追踪操作记录
 False- **备份策略**：建立定期备份机制，确保数据安全
 False
 False### 9.2 合规与安全
 False
 False- **许可证合规**：确保所有项目使用适当的许可证
 False- **代码审查**：建立强制代码审查流程
 False- **安全扫描**：集成安全扫描工具，检测漏洞
 False- **依赖管理**：定期更新依赖项，修复安全问题
 False- **访问控制**：基于最小权限原则设置访问权限
 False
 False## 延伸阅读
 False
 False- [GitHub：管理仓库设置](https://docs.github.com/en/repositories) <!-- nofollow -->
 False- [GitHub：创建仓库](https://docs.github.com/en/get-started/quickstart/create-a-repo) <!-- nofollow -->
 False- [GitHub：归档仓库](https://docs.github.com/en/repositories/archiving-a-github-repository) <!-- nofollow -->
 False- [GitHub：删除仓库](https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository) <!-- nofollow -->
 False- [GitHub：分支保护规则](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches) <!-- nofollow -->

### 跨模块关联

- [[git/remote-operations|Git 远程操作]]
 False
 False## 更新日志
 False
 False- **2026-04-05**：初版
 False- **2026-04-05**：扩写内容，增加详细的操作步骤、代码示例、故障诊断和高级配置
 False