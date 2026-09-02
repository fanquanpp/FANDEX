---
order: 30
title: 仓库创建、克隆、归档、删除
module: 'github'
category: 工具链
difficulty: intermediate
description: GitHub 仓库创建、克隆、归档、删除的完整操作指南：从开新店到关店的全流程向导。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'github/001-GitHubOverview'
  - 'github/002-AccountRegister2FA'
  - 'github/004-SSHHTTPS'
  - 'github/005-CollaborationDevelopmentStandard'
prerequisites: []
---


## 0. 从一个生活场景说起：仓库就像一家"店铺"

想象你开一家网店：先**选址注册**（创建仓库），把商品上架（添加代码文件）；开业后可以**开分店**（克隆仓库到多台电脑）；生意不做了可以**挂牌歇业**（归档仓库）——店铺还在、门面还展示，但不再营业；如果彻底不想干了，就**注销店铺**（删除仓库）——注意，注销是永久性的，所有货物、交易记录都没了。

GitHub 仓库（repository）就是代码的"店铺"：创建、克隆、归档、删除是它的四个生命周期操作。本篇作为**操作向导**，手把手带你走完这四步的完整流程。

## 1. 原理讲解：仓库是什么

### 1.1 直观理解

仓库是一个**项目容器**，不仅存放代码文件，还聚合了协作功能：

- 代码与版本历史（Git 对象）
- Issues（问题跟踪）
- Pull Requests（代码审查与合并）
- Actions（CI/CD 自动化）
- Wiki / Discussions / Projects 等

### 1.2 仓库可见性（三种"店面类型"）

| 类型 | 谁可见 | 适用场景 |
| :--- | :--- | :--- |
| Public（公开） | 所有人 | 开源项目、学习分享 |
| Private（私有） | 仅你和受邀协作者 | 商业项目、内部开发 |
| Internal（内部） | 仅组织成员（需企业计划） | 企业组织内部共享 |

### 1.3 关键概念

- **默认分支**：仓库的主分支，默认名为 `main`。
- **README**：显示在仓库首页的说明文档。
- **.gitignore**：声明哪些文件不被 Git 跟踪（如 `node_modules/`、`.env`）。
- **License**：开源许可证，规定代码的使用方式。

## 2. 第一步：创建仓库（开店）

### 2.1 网页端创建

1. 登录 GitHub，点击右上角 **+** → **New repository**。
2. 填写信息：
   - **Repository name**：建议小写字母 + 连字符，如 `my-notes-app`（名称规则：仅字母、数字、`-`、`_`、`.`，不能以点开头或结尾）。
   - **Description**：一句话描述项目用途。
   - **Visibility**：选择 Public 或 Private。
   - **Initialize this repository with**：勾选 **Add a README file**（推荐，便于立即克隆和展示）；可按需选择 `.gitignore` 模板和 License。
3. 点击 **Create repository**。

### 2.2 组织内创建

进入组织主页 → **Repositories** → **New**，与个人创建流程相同，但仓库所有权归属组织，创建后可为成员配置访问权限。

### 2.3 命令行创建（gh）

```bash
# 创建公开仓库并克隆到本地
gh repo create my-notes-app --public --clone
# 创建私有仓库
gh repo create my-notes-app --private
```

## 3. 第二步：克隆仓库（开分店）

**克隆（clone）** 是把远程仓库完整复制到本地，包含全部历史版本。

### 3.1 克隆命令

```bash
# HTTPS 克隆（需要 PAT，见 004 篇）
git clone https://github.com/OWNER/REPO.git

# SSH 克隆（需要配置 SSH 密钥，见 004 篇）
git clone git@github.com:OWNER/REPO.git

# 克隆指定分支
git clone -b dev https://github.com/OWNER/REPO.git

# 浅克隆：只取最近 1 次历史，适合大仓库
git clone --depth 1 https://github.com/OWNER/REPO.git

# 进入仓库目录并查看远程配置
cd REPO
git remote -v
```

### 3.2 从空仓库开始：本地推送已有项目

如果先在 GitHub 创建了**空的仓库**（未勾选 README），需要把本地项目推上去：

```bash
# 1. 进入已有项目目录
cd existing-project

# 2. 初始化 Git 仓库（如果还没有）
git init

# 3. 添加所有文件到暂存区
git add .

# 4. 提交初始版本
git commit -m "chore: initial commit"

# 5. 确保分支名为 main
git branch -M main

# 6. 关联远程仓库（使用 GitHub 页面提供的 URL）
git remote add origin https://github.com/OWNER/REPO.git

# 7. 推送并设置上游追踪
git push -u origin main
```

### 3.3 远程仓库管理常用命令

```bash
git remote -v                          # 查看远程地址
git remote add upstream <URL>          # 添加上游远程（Fork 工作流常用）
git remote set-url origin <新URL>      # 修改远程地址
git remote remove upstream             # 删除远程
git pull origin main                   # 拉取远程更新
git push origin main                   # 推送本地更新
```

### 3.4 切换仓库可见性与协作权限

**可见性切换**（公开 ↔ 私有）：进入仓库 **Settings → Danger Zone → Change repository visibility**。

- 公开转私有：仓库立即从公开索引消失，原公开链接变 404；之前别人 Fork 的副本不受影响。
- 私有转公开：**务必先审计**历史提交、Issue、Wiki 中是否有密钥、密码、个人信息，再执行切换。

**协作者权限级别**（Settings → Collaborators and teams → Add people）：

| 级别 | 能力 |
| :--- | :--- |
| Read | 只读：查看、克隆、提 Issue/PR |
| Triage | Read + 管理 Issue/PR 标签与里程碑 |
| Write | Triage + 推送代码、编辑仓库内容 |
| Maintain | Write + 管理仓库设置（不含敏感/破坏性操作） |
| Admin | 完全控制，含删除仓库、改可见性 |

> 遵循最小权限原则：能 Read 就不给 Write，避免误操作破坏主分支。

## 4. 第三步：归档仓库（挂牌歇业）

**归档（archive）** 使仓库变为**只读**：不能新建 Issue/PR、不能推送提交，但代码仍可浏览、克隆和 fork。适合已完成或不再维护的项目。

### 4.1 网页端归档

1. 进入仓库 → **Settings** → 下拉到 **Danger Zone**。
2. 点击 **Archive this repository**。
3. 阅读警告，在输入框中输入仓库名称确认。
4. 点击 **I understand the consequences, archive this repository**。

> 官方建议：归档前先关闭所有打开的 Issue 和 PR，并更新 README 说明项目状态。

### 4.2 归档后的影响

- 仓库标记为 "Archived"（只读徽章）。
- 无法创建新 Issue、PR、无法推送提交。
- 仍可克隆、fork、加星。
- 现有内容（代码、Wiki、Release）保持不变。
- 可随时**取消归档**（Settings → Danger Zone → Unarchive this repository）恢复写权限。

### 4.3 命令行归档

```bash
gh repo archive OWNER/REPO --yes       # 归档
gh repo unarchive OWNER/REPO --yes     # 取消归档
```

## 5. 第四步：删除仓库（注销店铺）

**删除是不可逆操作**：代码、提交历史、Issue、PR、Wiki、Release 全部销毁。删除前务必备份。

### 5.1 删除前备份

```bash
# 镜像克隆：包含所有分支和引用
git clone --mirror https://github.com/OWNER/REPO.git
```

### 5.2 网页端删除

1. 进入仓库 → **Settings** → **Danger Zone**。
2. 点击 **Delete this repository**。
3. 输入 `OWNER/REPO`（完整仓库名，大小写敏感）确认。
4. 点击 **I understand the consequences, delete this repository**。

### 5.3 命令行删除

```bash
gh repo delete OWNER/REPO --yes
```

> 提示：误删后 GitHub 支持在有限窗口内申请恢复，但**不要依赖这个"后悔药"**。归档（Archive）是比删除更稳妥的选择——先归档观察，确认无需保留再删除。

### 5.4 进阶技巧：仓库模板与镜像迁移

**仓库模板（Template repository）**：把某个仓库标记为模板后，其他人可一键复制出"相同结构、不含历史提交"的新仓库，适合统一项目骨架。

1. 在仓库 Settings 中勾选 **Template repository**。
2. 别人进入该仓库后点击 **Use this template** 即可创建同结构新仓库。
3. 模板仓库会忽略 fork 关系，新仓库是全新的独立项目。

**仓库镜像（Mirror）迁移**：把整个仓库（含所有分支与标签）迁移到新位置：

```bash
# 1. 镜像克隆（裸仓库，含全部引用）
git clone --mirror https://github.com/ORIGIN/REPO.git
cd REPO.git

# 2. 推送到新位置
git push --mirror https://github.com/NEW/REPO.git
```

**批量管理仓库**（适合组织场景）：

```bash
# 列出组织全部仓库
gh repo list ORGANIZATION --limit 100
# 批量创建
gh repo create ORG/repo-a --public --description "desc"
```

## 6. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 仓库名非法 | 创建失败 | 名称含空格或非法字符（如 `.hidden`、连续点） | 使用小写字母、数字、连字符，不以点开头/结尾 |
| 克隆大仓库很慢 | 长时间无响应 | 仓库历史提交多、体积大 | 使用浅克隆 `git clone --depth 1`，需要历史时再 `git fetch --depth=100` 加深 |
| 克隆报 LFS 错误 | `git-lfs: command not found` | 仓库使用 Git LFS 但本地未安装 | 安装并初始化：`git lfs install`，再执行 `git lfs pull` |
| 推送被拒，提示权限不足 | `Permission denied` / 403 | 没有仓库写权限，或 PAT 权限不足 | 检查协作者角色（Write 及以上）；重新生成含 `repo` 权限的 PAT |
| 推送到 main 失败 | `protected branch` | 分支启用了保护规则 | 按保护规则走 PR 流程合并，或由管理员临时调整规则 |
| 找不到删除/归档按钮 | Danger Zone 无选项 | 不是仓库 Owner/Admin | 只有 Owner 或 Admin 角色才能归档/删除；组织仓库需组织管理员授权 |

## 8. 一句话记忆

**仓库生命周期四步走：创建（开店）→ 克隆（开分店）→ 归档（挂牌歇业，随时复业）→ 删除（注销店铺，不可恢复，务必先备份）。**

### 延伸阅读

- 仓库与 GitHub 整体概念，见 001 篇《GitHub 概述》。
- HTTPS 与 SSH 远程配置，见 004 篇《SSH 与 HTTPS 远程配置》。
- 分支模型与分支保护规则，见 007 篇《分支模型与分支保护规则》。
- 仓库迁移、镜像与批量管理，见 049 篇《Gh Repo 管理》。
