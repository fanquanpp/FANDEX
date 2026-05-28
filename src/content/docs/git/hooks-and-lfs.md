---
order: 30
tags:
  - 'git'
  - 'networking'
  - 'git-workflow'
difficulty: 'advanced'
title: 'Git 钩子与 Git LFS'
module: 'git'
category: 'Git Basics'
description: 'Git钩子自动化与大文件管理'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [目录](#目录)
2. [Git 钩子概述](#git-钩子概述)
3. [客户端钩子](#客户端钩子)
4. [服务器端钩子](#服务器端钩子)
5. [Git LFS](#git-lfs)
6. [钩子最佳实践](#钩子最佳实践)
7. [Git LFS 最佳实践](#git-lfs-最佳实践)
8. [高级钩子示例](#高级钩子示例)
9. [常见问题与解决方案](#常见问题与解决方案)
10. [工具与集成](#工具与集成)
11. [项目实战](#项目实战)
12. [延伸阅读](#延伸阅读)

---

## 1. 目录

- [1. Git 钩子概述](#1-git-钩子概述)
- [2. 客户端钩子](#2-客户端钩子)
- [3. 服务器端钩子](#3-服务器端钩子)
- [4. Git LFS](#4-git-lfs)
- [5. 钩子最佳实践](#5-钩子最佳实践)
- [6. Git LFS 最佳实践](#6-git-lfs-最佳实践)
- [7. 高级钩子示例](#7-高级钩子示例)
- [8. 常见问题与解决方案](#8-常见问题与解决方案)
- [9. 工具与集成](#9-工具与集成)
- [10. 项目实战](#10-项目实战)
- [11. 延伸阅读](#11-延伸阅读)

## 2. Git 钩子概述

Git 钩子是 Git 仓库中的脚本，在特定 Git 事件发生时自动执行。它们可以用于自动化工作流程、强制执行代码规范、运行测试等。

### 钩子类型

- **客户端钩子**：在本地操作时触发
- **服务器端钩子**：在服务器端操作时触发

## 3. 客户端钩子

### 2.1 常见客户端钩子

| 钩子名称             | 触发时机         | 用途                   |
| :------------------- | :--------------- | :--------------------- |
| `pre-commit`         | 提交前           | 代码检查、格式化、测试 |
| `prepare-commit-msg` | 提交消息编辑器前 | 自动生成提交消息       |
| `commit-msg`         | 提交消息编辑后   | 验证提交消息格式       |
| `post-commit`        | 提交后           | 通知、触发构建         |
| `pre-push`           | 推送前           | 运行测试、检查         |

### 2.2 创建 pre-commit 钩子

```bash
 # 进入 Git 仓库
 cd /path/to/repo
 # 创建 pre-commit 钩子
 cat > .git/hooks/pre-commit << 'EOF'
 #!/bin/bash
 # 运行代码检查
 echo "Running code linting..."
 npm run lint
 # 运行测试
 echo "Running tests..."
 npm test
 # 检查结果
 if [ $? -ne 0 ]; then
  echo "Tests failed, commit aborted"
  exit 1
 fi
 echo "Pre-commit checks passed"
 EOF
 # 使钩子可执行
 chmod +x .git/hooks/pre-commit
```

### 2.3 创建 commit-msg 钩子

```bash
 # 创建 commit-msg 钩子
 cat > .git/hooks/commit-msg << 'EOF'
 #!/bin/bash
 # 检查提交消息格式
 commit_msg=$(cat "$1")
 # 正则表达式检查提交消息格式
 if ! echo "$commit_msg" | grep -qE '^(feat|fix|docs|style|refactor|test|chore): .+'; then
  echo "Error: Invalid commit message format"
  echo "Commit message should start with: feat|fix|docs|style|refactor|test|chore:"
  exit 1
 fi
 echo "Commit message format is valid"
 EOF
 # 使钩子可执行
 chmod +x .git/hooks/commit-msg
```

## 4. 服务器端钩子

### 3.1 常见服务器端钩子

| 钩子名称       | 触发时机   | 用途                 |
| :------------- | :--------- | :------------------- |
| `pre-receive`  | 推送接收前 | 拒绝不符合规则的推送 |
| `update`       | 分支更新时 | 对特定分支进行检查   |
| `post-receive` | 推送接收后 | 部署、通知           |

### 3.2 创建 post-receive 钩子

```bash
 # 在服务器仓库中创建 post-receive 钩子
 cat > /path/to/repo.git/hooks/post-receive << 'EOF'
 #!/bin/bash
 # 部署应用
 echo "Deploying application..."
 # 切换到部署目录
 cd /path/to/deploy
 # 拉取最新代码
 git pull origin main
 # 安装依赖
 npm install
 # 构建应用
 npm run build
 # 重启服务
 echo "Restarting service..."
 systemctl restart my-app
 echo "Deployment completed successfully"
 EOF
 # 使钩子可执行
 chmod +x /path/to/repo.git/hooks/post-receive
```

## 5. Git LFS (Large File Storage)

### 4.1 Git LFS 概述

Git LFS 是 Git 的扩展，用于管理大文件，通过将大文件存储在外部服务器上，只在 Git 仓库中存储引用，从而减小仓库体积。

### 4.2 安装 Git LFS

```bash
 # 安装 Git LFS
 # Windows
 download from https://git-lfs.github.com/
 # macOS
 brew install git-lfs
 # Linux
 sudo apt install git-lfs
 # 初始化 Git LFS
 git lfs install
```

### 4.3 配置 Git LFS

```bash
 # 跟踪大文件
 git lfs track "*.psd"
 git lfs track "*.jpg"
 git lfs track "*.mp4"
 # 查看跟踪的文件类型
 git lfs track
 # 提交 .gitattributes 文件
 git add .gitattributes
 git commit -m "Add Git LFS tracking"
```

### 4.4 使用 Git LFS

```bash
 # 正常添加和提交文件
 git add large-file.psd
 git commit -m "Add large file"
 git push origin main
 # 拉取 LFS 文件
 git lfs pull
 # 查看 LFS 文件
 git lfs ls-files
 # 验证 LFS 文件
 git lfs verify
```

## 6. 钩子最佳实践

1. **版本控制钩子**：将钩子存储在仓库中，使用脚本安装
2. **错误处理**：在钩子中添加适当的错误处理
3. **性能考虑**：确保钩子执行时间不会过长
4. **可配置性**：允许通过配置文件自定义钩子行为
5. **文档**：为钩子添加注释和文档

### 5.1 钩子管理脚本

```bash
 #!/bin/bash
 # hooks/install.sh
 # 安装钩子
 cp hooks/* .git/hooks/
 chmod +x .git/hooks/*
 echo "Hooks installed successfully"
```

## 7. Git LFS 最佳实践

1. **合理选择跟踪文件**：只跟踪真正的大文件
2. **设置合理的文件大小阈值**：根据项目需求设置
3. **定期清理**：使用 `git lfs prune` 清理过期文件
4. **备份 LFS 存储**：确保 LFS 文件的安全性
5. **监控存储使用**：定期检查 LFS 存储使用情况

### 6.1 Git LFS 配置示例

```bash
 # .gitattributes 文件
 True*.psd filter=lfs diff=lfs merge=lfs -text
 True*.jpg filter=lfs diff=lfs merge=lfs -text
 True*.mp4 filter=lfs diff=lfs merge=lfs -text
```

## 8. 高级钩子示例

### 7.1 自动更新版本号

```bash
 # pre-commit 钩子
 #!/bin/bash
 # 自动更新版本号
 if [ -f package.json ]; then
  current_version=$(jq -r '.version' package.json)
  # 简单的版本号递增逻辑
  new_version=$(echo $current_version | awk -F. '{print $1"."$2"."$3+1}')
  jq ".version = \"$new_version\"" package.json > package.json.tmp && mv package.json.tmp package.json
  git add package.json
  echo "Updated version to $new_version"
 fi
```

### 7.2 自动生成 CHANGELOG

```bash
 # post-commit 钩子
 #!/bin/bash
 # 自动生成 CHANGELOG
 if [ ! -f CHANGELOG.md ]; then
  echo "# Changelog\n" > CHANGELOG.md
 fi
 # 获取最新提交信息
 latest_commit=$(git log -1 --pretty=%B)
 # 提取提交类型和信息
 if echo "$latest_commit" | grep -qE '^(feat|fix|docs|style|refactor|test|chore):'; then
  commit_type=$(echo "$latest_commit" | cut -d: -f1)
  commit_msg=$(echo "$latest_commit" | cut -d: -f2 | sed 's/^ //')
  # 获取当前日期
  current_date=$(date +"%Y-%m-%d")
  # 添加到 CHANGELOG
  echo "## $current_date\n\n- **$commit_type**: $commit_msg\n" | cat - CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
  git add CHANGELOG.md
  git commit --amend --no-edit
  echo "Updated CHANGELOG.md"
 fi
```

## 9. 常见问题与解决方案

### 8.1 钩子不执行

**问题**：钩子脚本没有执行
**解决方案**：确保钩子文件可执行 `chmod +x .git/hooks/hook-name`

### 8.2 Git LFS 文件下载失败

**问题**：Git LFS 文件无法下载
**解决方案**：检查网络连接，运行 `git lfs pull` 手动拉取

### 8.3 钩子执行时间过长

**问题**：钩子执行时间过长，影响开发效率
**解决方案**：优化钩子逻辑，考虑使用后台执行

### 8.4 Git LFS 存储不足

**问题**：Git LFS 存储空间不足
**解决方案**：清理过期文件 `git lfs prune`，增加存储配置

## 10. 工具与集成

### 9.1 钩子管理工具

- **husky**：现代 Git 钩子管理工具
- **lint-staged**：配合 husky 使用，只对暂存文件运行检查

### 9.2 Git LFS 托管服务

- **GitHub**：内置 Git LFS 支持
- **GitLab**：内置 Git LFS 支持
- **Bitbucket**：内置 Git LFS 支持
- **自托管**：使用 Git LFS 服务器

## 11. 项目实战

### 10.1 完整的钩子配置

```
 project/
 ├── .git/
 │ └── hooks/
 │ ├── pre-commit
 │ ├── commit-msg
 │ └── pre-push
 ├── hooks/
 │ ├── pre-commit
 │ ├── commit-msg
 │ ├── pre-push
 │ └── install.sh
 ├── .gitattributes
 └── package.json
```

### 10.2 使用 husky 管理钩子

**安装 husky**

```bash
 npm install husky --save-dev
 npx husky install
 npm set-script prepare "husky install"
```

**添加钩子**

```bash
 npx husky add .husky/pre-commit "npm run lint"
 npx husky add .husky/commit-msg "npx commitlint --edit $1"
 npx husky add .husky/pre-push "npm test"
```

## 12. 延伸阅读

- [Git 官方钩子文档](https://git-scm.com/docs/githooks)
- [Git LFS 官方文档](https://git-lfs.github.com/)
- [husky 文档](https://typicode.github.io/husky/)
- [commitlint 文档](https://commitlint.js.org/)
  通过本教程，你已经了解了 Git 钩子和 Git LFS 的核心概念和实践技巧。在实际项目中，你可以使用这些工具来自动化工作流程、管理大文件，提高开发效率和代码质量
