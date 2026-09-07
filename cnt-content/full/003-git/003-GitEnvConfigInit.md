---
order: 30
title: Git 环境配置与初始化
module: 'git'
category: 工具链
difficulty: beginner
description: Git 安装配置、用户信息设置与仓库初始化。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'git/001-Git'
  - 'git/004-GitBasicOperation'
  - 'git/005-GitBranchManagement'
prerequisites: []
---

## 1. 什么是 Git

Git 是一个分布式版本控制系统，用于跟踪文件的变化，支持多人协作开发。它具有以下特点：

- **分布式**：每个开发者都拥有完整的代码库副本
- **高效**：处理大型项目时性能优秀
- **灵活**：支持多种工作流程
- **可靠**：数据存储采用 SHA-1 哈希值，确保数据完整性
- **分支管理**：轻量级分支，支持快速切换和合并
  <a id="2-环境配置"></a>

## 2. 环境配置

在使用 Git 之前，需要进行基本的环境配置，主要包括设置用户名、邮箱等信息，这些信息会被记录在每次提交中。
<a id="21-全局配置"></a>

### 2.1 全局配置

全局配置会应用到所有 Git 仓库，适合设置通用的信息：

```bash
 # 设置用户名（全局）
 git config --global user.name "你的用户名"
 # 设置邮箱（全局）
 git config --global user.email "你的邮箱"
 # 设置默认分支名称
 git config --global init.defaultBranch main
 # 解决 Windows 下中文文件名乱码问题
 git config --global core.quotepath false
 # 设置默认编辑器
 git config --global core.editor "code --wait"
 # 设置差异比较工具
 git config --global diff.tool vscode
 git config --global difftool.vscode.cmd "code --wait --diff $LOCAL $REMOTE"
 # 设置合并工具
 git config --global merge.tool vscode
 git config --global mergetool.vscode.cmd "code --wait $MERGED"
 # 设置自动换行处理
 git config --global core.autocrlf  # Windows 系统
 git config --global core.autocrlf input # Mac/Linux 系统
 # 设置提交时自动删除尾部空格
 git config --global core.trimwhitespace
 # 设置大小写敏感
 git config --global core.ignorecase false
 # 设置推送策略
 git config --global push.default simple
 # 设置拉取策略
 git config --global pull.rebase false
```

<a id="22-本地配置"></a>

### 2.2 本地配置

本地配置仅应用于当前仓库，适合设置特定于项目的信息：

```bash
 # 进入仓库目录
 cd <仓库目录>
 # 设置用户名（仅当前仓库）
 git config user.name "你的用户名"
 # 设置邮箱（仅当前仓库）
 git config user.email "你的邮箱"
 # 设置特定于项目的编辑器
 git config core.editor "nano"
 # 设置特定于项目的换行处理
 git config core.autocrlf
```

<a id="23-配置验证"></a>

### 2.3 配置验证

配置完成后，可以通过以下命令验证配置是否成功：

```bash
 # 查看所有配置（包括系统、全局和本地）
 git config --list
 # 查看特定配置
 git config user.name
 git config user.email
 # 查看全局配置
 git config --global --list
 # 查看本地配置
 git config --local --list
```

<a id="24-高级配置"></a>

### 2.4 高级配置

```bash
 # 配置 Git 缓存大小
 git config --global core.packedGitLimit 512m
 git config --global core.packedGitWindowSize 512m
 # 配置 Git 压缩级别（0-9，9 最高）
 git config --global core.compression 9
 # 配置 Git 并行操作数量
 git config --global pack.threads 4
 # 配置 Git 远程操作超时（单位：字节）
 git config --global http.postBuffer 524288000
 # 配置 HTTP 代理
 git config --global http.proxy http://proxy.example.com:8080
 git config --global https.proxy https://proxy.example.com:8080
 # 取消 HTTP 代理
 git config --global --unset http.proxy
 git config --global --unset https.proxy
 # 设置常用别名
 git config --global alias.st status
 git config --global alias.ci commit
 git config --global alias.co checkout
 git config --global alias.br branch
 git config --global alias.unstage "reset HEAD --"
 git config --global alias.last "log -1 --stat"
 git config --global alias.logg "log --oneline --graph --all"
 git config --global alias.df "diff"
 git config --global alias.dfc "diff --cached"
 git config --global alias.cp "cherry-pick"
 git config --global alias.rb "rebase"
 git config --global alias.merge-no-ff "merge --no-ff"
 git config --global alias.stash-list "stash list"
 git config --global alias.stash-apply "stash apply"
 # 配置颜色显示
 git config --global color.ui auto
 git config --global color.diff auto
 git config --global color.status auto
 git config --global color.branch auto
```

<a id="25-配置文件详解"></a>

### 2.5 配置文件详解

Git 配置文件采用 INI 格式，由节（section）和键值对组成：
**全局配置文件示例（~/.gitconfig）**：

```ini
 [user]
  name = Your Name
  email = your.email@example.com
 [core]
  quotepath = false
  editor = code --wait
  autocrlf =
  trimwhitespace =
 [init]
  defaultBranch = main
 [alias]
  st = status
  ci = commit
  co = checkout
  br = branch
 [diff]
  tool = vscode
 [difftool "vscode"]
  cmd = code --wait --diff $LOCAL $REMOTE
 [merge]
  tool = vscode
 [mergetool "vscode"]
  cmd = code --wait $MERGED
```

**本地配置文件示例（.git/config）**：

```ini
 [core]
  repositoryformatversion = 0
  filemode = false
  bare = false
  logallrefupdates =
  symlinks = false
  ignorecase =
 [remote "origin"]
  url = https://github.com/username/repository.git
  fetch = +refs/heads/*:refs/remotes/origin/*
 [branch "main"]
  remote = origin
  merge = refs/heads/main
```

<a id="3-仓库初始化"></a>

## 3. 仓库初始化

<a id="31-初始化本地仓库"></a>

### 3.1 初始化本地仓库

在当前目录初始化一个新的 Git 仓库：

```bash
 # 进入项目目录
 cd <项目目录>
 # 初始化 Git 仓库
 git init
 # 初始化时指定默认分支名称
 git init -b main
```

执行后，会在当前目录创建一个 `.git` 文件夹，用于存储 Git 相关的信息。`.git` 目录包含以下内容：

- `objects/`：存储 Git 对象（提交、树、 blob）
- `refs/`：存储分支和标签的引用
- `HEAD`：指向当前分支的引用
- `config`：本地配置文件
- `index`：暂存区信息
  <a id="32-克隆远程仓库"></a>

### 3.2 克隆远程仓库

从远程服务器克隆一个已有的仓库：

```bash
 # 克隆默认分支
 git clone <仓库地址>
 # 克隆指定分支
 git clone -b <分支名> <仓库地址>
 # 克隆指定深度（只获取最近的 N 个提交）
 git clone --depth 1 <仓库地址> # 只获取最近 1 个提交
 # 克隆时指定目录名
 git clone <仓库地址> <目录名>
 # 克隆所有分支
 git clone --mirror <仓库地址> # 通常用于创建镜像仓库
 # 克隆时递归克隆子模块
 git clone --recursive <仓库地址>
 # 克隆时指定协议
 git clone git@github.com:username/repository.git # SSH 协议
 git clone https://github.com/username/repository.git # HTTPS 协议
```

<a id="33-初始化现有项目"></a>

### 3.3 初始化现有项目

对于已经存在的项目，可以通过以下步骤初始化 Git 仓库：

```bash
 # 进入项目目录
 cd <项目目录>
 # 初始化 Git 仓库
 git init
 # 创建 .gitignore 文件（推荐）
 touch .gitignore
 # 添加项目文件到暂存区
 git add .
 # 提交初始版本
 git commit -m "Initial commit"
 # 添加远程仓库
 git remote add origin <仓库地址>
 # 推送到远程仓库
 git push -u origin main
```

**创建合理的 .gitignore 文件**：

```gitignore
 # 操作系统文件
 .DS_Store
 Thumbs.db
 # 编辑器文件
 .vscode/
 .idea/
 *.swp
 *.swo
 *.bak
 # 编译产物
 build/
 dist/
 out/
 # 依赖包
 node_modules/
 venv/
 env/
 # 环境变量文件
 .env
 .env.local
 .env.development.local
 .env.test.local
 .env.production.local
 # 日志文件
 logs
 *.log
 # 数据库文件
 *.db
 *.sqlite
 *.sqlite3
 # 临时文件
 tmp/
 temp/
```

<a id="4-配置文件位置"></a>

## 4. 配置文件位置

Git 的配置文件存储在以下位置，优先级从高到低：

1. **本地配置**：`.git/config`（位于每个 Git 仓库的 `.git` 目录中）
2. **全局配置**：`~/.gitconfig`（Windows 系统为 `C:\Users\用户名\.gitconfig`）
3. **系统配置**：`/etc/gitconfig`（Windows 系统为 `C:\Program Files\Git\etc\gitconfig`）
   当多个配置文件中存在相同的配置项时，优先级高的配置会覆盖优先级低的配置。
   <a id="5-常见配置问题与解决方案"></a>

## 5. 常见配置问题与解决方案

| 问题           | 原因                              | 解决方案                                                |
| -------------- | --------------------------------- | ------------------------------------------------------- |
| 中文文件名乱码 | Git 默认使用 ASCII 编码处理文件名 | 执行 `git config --global core.quotepath false`         |
| 换行符不一致   | 不同操作系统的换行符标准不同      | 根据系统类型设置 `core.autocrlf`                        |
| 编辑器配置错误 | 默认编辑器设置不当                | 使用 `git config --global core.editor` 设置合适的编辑器 |
| 远程操作超时   | 网络连接不稳定或文件过大          | 增加 `http.postBuffer` 值                               |
| 权限被拒绝     | SSH 密钥未配置或权限错误          | 检查 SSH 密钥配置，确保文件权限正确                     |
| 推送失败       | 远程分支已更新，需要先拉取        | 执行 `git pull` 后再推送                                |
| 克隆速度慢     | 网络连接问题或仓库过大            | 使用 `--depth` 参数克隆，或使用国内镜像                 |
| 合并冲突       | 多人修改了同一文件的同一部分      | 手动解决冲突后提交                                      |

<a id="6-最佳实践"></a>

## 6. 最佳实践

### 6.1 配置最佳实践

- **设置有意义的用户名和邮箱**：便于团队协作和代码追溯
- **使用 SSH 协议**：比 HTTPS 更安全，无需每次输入密码
- **配置合理的别名**：提高命令输入效率
- **设置默认分支为 main**：符合现代 Git 规范
- **配置合适的编辑器**：确保提交信息编辑方便
- **设置自动换行处理**：避免跨平台换行符问题
- **创建 .gitignore 文件**：避免提交无关文件

### 6.2 仓库初始化最佳实践

- **使用 `git init -b main`**：直接设置默认分支为 main
- **初始化时创建 .gitignore 文件**：从一开始就规范版本控制
- **进行初始提交**：确保仓库有基础版本
- **添加远程仓库**：便于代码备份和协作
- **设置上游分支**：使用 `git push -u` 简化后续推送

### 6.3 日常使用最佳实践

- **定期拉取更新**：保持本地代码与远程同步
- **提交前查看变更**：使用 `git status` 和 `git diff` 检查变更
- **编写清晰的提交信息**：描述变更内容和原因
- **合理使用分支**：功能开发、Bug 修复等使用不同分支
- **定期清理本地分支**：删除已合并的分支
- **使用标签标记版本**：便于版本管理和发布
  <a id="7-实际应用示例"></a>

## 7. 实际应用示例

### 7.1 示例 1：初始化新项目

```bash
 # 创建项目目录
 mkdir my-project
 cd my-project
 # 初始化 Git 仓库
 git init -b main
 # 创建 .gitignore 文件
 cat > .gitignore << EOF
 # 操作系统文件
 .DS_Store
 Thumbs.db
 # 编辑器文件
 .vscode/
 .idea/
 # 编译产物
 build/
 dist/
 # 依赖包
 node_modules/
 EOF
 # 创建初始文件
 echo "# My Project" > README.md
 echo "console.log('Hello, Git!');" > index.js
 # 添加并提交
 git add .
 git commit -m "Initial commit"
 # 添加远程仓库
 git remote add origin https://github.com/username/my-project.git
 # 推送到远程
 git push -u origin main
```

### 7.2 示例 2：配置 Git 别名

```bash
 # 设置常用别名
 git config --global alias.st status
 git config --global alias.ci commit
 git config --global alias.co checkout
 git config --global alias.br branch
 git config --global alias.logg "log --oneline --graph --all --decorate"
 git config --global alias.df "diff"
 git config --global alias.dfc "diff --cached"
 git config --global alias.unstage "reset HEAD --"
 git config --global alias.last "log -1 --stat"
 git config --global alias.rb "rebase"
 git config --global alias.merge-no-ff "merge --no-ff"
 # 使用别名示例
 git st # equivalent to git status
 git ci -m "Add new feature" # equivalent to git commit -m "Add new feature"
 git co main # equivalent to git checkout main
 git br # equivalent to git branch
 git logg # equivalent to git log --oneline --graph --all --decorate
```

### 7.3 示例 3：解决中文文件名乱码问题

```bash
 # 配置 Git 处理中文文件名
 git config --global core.quotepath false
 # 验证配置
 git config core.quotepath
 # 创建包含中文的文件
 touch "中文文件.txt"
 echo "中文内容" > "中文文件.txt"
 # 添加并提交
 git add "中文文件.txt"
 git commit -m "添加中文文件"
 # 查看状态
 git status
```

### 7.4 示例 4：配置 SSH 密钥

```bash
 # 生成 SSH 密钥
 ssh-keygen -t ed25519 -C "your.email@example.com"
 # 查看公钥
 cat ~/.ssh/id_ed25519.pub
 # 将公钥添加到 GitHub/GitLab 等平台
 # 测试 SSH 连接
 tssh -T git@github.com
 # 配置 Git 使用 SSH 协议
 git remote set-url origin git@github.com:username/repository.git
 # 验证远程 URL
 git remote -v
```

<a id="8-总结"></a>

## 8. 总结

Git 的环境配置和仓库初始化是使用 Git 的基础步骤。通过合理的配置，可以提高 Git 的使用效率，避免常见问题。

- **全局配置**：适合设置通用信息，如用户名、邮箱、编辑器等
- **本地配置**：适合设置特定于项目的信息
- **仓库初始化**：可以通过 `git init` 创建新仓库，或通过 `git clone` 克隆现有仓库
- **配置验证**：使用 `git config --list` 查看当前配置
- **配置文件**：存储在系统、全局和本地三个级别，优先级依次提高
- **最佳实践**：设置有意义的用户名和邮箱，使用 SSH 协议，配置合理的别名，创建 .gitignore 文件等
  正确的环境配置是使用 Git 的良好开端，为后续的版本控制操作打下基础。通过本文的配置和示例，你应该能够快速搭建起一个高效、规范的 Git 环境。
## 配置级别

**基本写法：设置仓库级配置（仅当前仓库）**
`git config <键> <值>`
```bash
# 设置当前仓库的用户名
git config user.name "Alice"
```

---

**基本写法：设置全局级配置（当前用户所有仓库）**
`git config --global <键> <值>`
```bash
# 设置全局用户邮箱
git config --global user.email "alice@example.com"
```

---

**基本写法：设置系统级配置（本机所有用户）**
`git config --system <键> <值>`
```bash
# 设置系统级默认分支名（需管理员权限）
git config --system init.defaultBranch main
```

---

**基本写法：查看某级别配置来源**
`git config --show-origin <键>`
```bash
# 显示配置项来自哪个文件
git config --show-origin user.name
```

---

## 查看配置

**基本写法：查看所有配置（合并后最终值）**
`git config --list`
```bash
# 列出所有生效配置
git config --list
```

---

**基本写法：查看指定级别配置**
`git config --list --<级别>`
```bash
# 仅查看全局级配置
git config --list --global
```

---

**基本写法：查看单个配置项**
`git config <键>`
```bash
# 查看当前用户名
git config user.name
```

---

**基本写法：查看配置类型**
`git config --type <类型> <键>`
```bash
# 以布尔类型读取配置
git config --type bool core.autocrlf
```

---

## 编辑配置文件

**基本写法：直接打开配置文件编辑**
`git config --<级别> --edit`
```bash
# 用默认编辑器打开全局配置
git config --global --edit
```

---

## 用户身份

**基本写法：配置提交身份**
`git config --global user.name "<姓名>"`
```bash
# 设置全局提交姓名
git config --global user.name "Alice Lee"
```

---

**基本写法：配置提交邮箱**
`git config --global user.email "<邮箱>"`
```bash
# 设置全局提交邮箱
git config --global user.email "alice@example.com"
```

---

**基本写法：按仓库单独配置身份**
`git config user.name "<姓名>"`
```bash
# 仅当前仓库使用工作账号
git config user.name "Alice Corp"
```

---

## 默认分支与初始化

**基本写法：设置 init 默认分支**
`git config --global init.defaultBranch <分支名>`
```bash
# 新仓库默认使用 main 分支
git config --global init.defaultBranch main
```

---

## 行尾处理

**基本写法：Windows 自动转 CRLF**
`git config --global core.autocrlf true`
```bash
# 检出转 CRLF，提交转 LF
git config --global core.autocrlf true
```

---

**基本写法：Linux/Mac 保留 LF**
`git config --global core.autocrlf input`
```bash
# 检出保留 LF，提交转 LF
git config --global core.autocrlf input
```

---

## 编辑器与工具

**基本写法：设置默认编辑器**
`git config --global core.editor "<命令>"`
```bash
# 使用 VS Code 作为默认编辑器
git config --global core.editor "code --wait"
```

---

**基本写法：设置默认合并工具**
`git config --global merge.tool <工具>`
```bash
# 配置 VS Code 为合并工具
git config --global merge.tool vscode
```

---

**基本写法：配置合并工具路径**
`git config --global mergetool.<工具>.cmd "<命令>"`
```bash
# 配置 vscode 合并工具调用命令
git config --global mergetool.vscode.cmd 'code --wait $MERGED'
```

---

## 别名（alias）

**基本写法：设置命令别名**
`git config --global alias.<别名> "<命令>"`
```bash
# 用 co 代替 checkout
git config --global alias.co checkout
```

---

**基本写法：设置带参数别名**
`git config --global alias.<别名> "!<脚本>"`
```bash
# 用 ! 前缀执行外部命令
git config --global alias.lg "log --oneline --graph --all"
```

---

**基本写法：删除别名**
`git config --global --unset alias.<别名>`
```bash
# 移除 co 别名
git config --global --unset alias.co
```

---

## 拉取与推送行为

**基本写法：拉取时默认使用 rebase**
`git config --global pull.rebase true`
```bash
# pull 默认变基而非合并
git config --global pull.rebase true
```

---

**基本写法：拉取仅快进**
`git config --global pull.ff only`
```bash
# 仅允许快进拉取，否则失败
git config --global pull.ff only
```

---

**基本写法：推送默认模式**
`git config --global push.default <模式>`
```bash
# 只推送当前分支到同名上游
git config --global push.default simple
```

---

## 颜色与输出

**基本写法：开启颜色输出**
`git config --global color.ui auto`
```bash
# 终端自动启用颜色
git config --global color.ui auto
```

---

## 凭据缓存

**基本写法：开启凭据助手**
`git config --global credential.helper <助手>`
```bash
# 使用系统凭据管理器
git config --global credential.helper manager
```

---

**基本写法：临时内存缓存**
`git config --global credential.helper 'cache --timeout=<秒>'`
```bash
# 凭据缓存 1 小时
git config --global credential.helper 'cache --timeout=3600'
```

---

## 增删改配置项

**基本写法：新增或修改配置项**
`git config --<级别> <键> <值>`
```bash
# 修改全局 init 默认分支
git config --global init.defaultBranch main
```

---

**基本写法：删除配置项**
`git config --<级别> --unset <键>`
```bash
# 删除全局用户名配置
git config --global --unset user.name
```

---

**基本写法：删除多处同键配置**
`git config --<级别> --unset-all <键>`
```bash
# 删除所有同名配置项
git config --local --unset-all remote.origin.fetch
```

---

**基本写法：追加多值配置**
`git config --<级别> --add <键> <值>`
```bash
# 追加一条 fetch 规则
git config --local --add remote.origin.fetch '+refs/tags/*:refs/tags/*'
```

---

## 引用存储格式（Reftable）

**基本写法：查看引用存储格式**
`git config core.refStorage`
```bash
# 查看当前引用存储后端
git config core.refStorage
```

---

**基本写法：迁移到 reftable 后端**
`git refs migrate --ref-storage=reftable`
```bash
# 切换到 reftable 引用存储（适用于多分支大仓）
git refs migrate --ref-storage=reftable
```

---

## 文件路径与位置

**基本写法：查看各级别配置文件路径**
`git config --list --show-origin`
```bash
# 显示每条配置来源文件
git config --list --show-origin
```

---

**基本写法：仓库级配置文件位置**
`.git/config`
```bash
# 编辑当前仓库配置文件
git config --local --edit
```

---

**基本写法：全局配置文件位置**
`~/.gitconfig`
```bash
# 编辑用户级配置文件
git config --global --edit
```

---

**基本写法：系统级配置文件位置**
`/etc/gitconfig`
```bash
# 编辑系统级配置文件（需管理员权限）
git config --system --edit
```
