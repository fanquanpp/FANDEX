---
order: 490
title: GitHub CLI 仓库管理
module: 'github'
category: 工具链
difficulty: beginner
description: GitHub CLI 仓库管理 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 创建仓库

**基本写法：创建公开仓库**
`gh repo create <仓库名> --public`
```bash
# 创建公开仓库
gh repo create myproject --public
```

---

**基本写法：创建私有仓库**
`gh repo create <仓库名> --private`
```bash
# 创建私有仓库
gh repo create myproject --private
```

---

**基本写法：创建并克隆**
`gh repo create <仓库名> --clone`
```bash
# 创建仓库并克隆到本地
gh repo create myproject --public --clone
```

---

**基本写法：从本地目录创建远程仓库**
`gh repo create <仓库名> --source <目录> --push`
```bash
# 基于本地目录创建远程仓库并推送
gh repo create myproject --source . --push
```

---

**基本写法：指定组织创建**
`gh repo create <组织>/<仓库名>`
```bash
# 在指定组织下创建仓库
gh repo create myorg/myproject --private
```

---

**基本写法：创建并添加描述**
`gh repo create <仓库名> --description "<描述>"`
```bash
# 创建仓库并添加描述
gh repo create myproject --description "我的项目"
```

---

**基本写法：创建带 README 的仓库**
`gh repo create <仓库名> --add-readme`
```bash
# 创建仓库并自动添加 README
gh repo create myproject --public --add-readme
```

---

## 查看仓库

**基本写法：查看当前仓库**
`gh repo view`
```bash
# 查看当前目录对应的仓库信息
gh repo view
```

---

**基本写法：查看指定仓库**
`gh repo view <owner>/<repo>`
```bash
# 查看指定仓库的详情
gh repo view facebook/react
```

---

**基本写法：在浏览器中查看**
`gh repo view --web`
```bash
# 在浏览器中打开仓库页面
gh repo view --web
```

---

**基本写法：查看仓库 README**
`gh repo view <owner>/<repo>`
```bash
# 查看 README 内容
gh repo view microsoft/vscode
```

---

**基本写法：列出自己的仓库**
`gh repo list`
```bash
# 列出自己账户下的仓库
gh repo list
```

---

**基本写法：列出指定用户仓库**
`gh repo list <用户名>`
```bash
# 列出指定用户的公开仓库
gh repo list torvalds
```

---

**基本写法：列出组织仓库**
`gh repo list <组织名>`
```bash
# 列出指定组织的仓库
gh repo list microsoft
```

---

**基本写法：限制返回数量**
`gh repo list --limit <数量>`
```bash
# 限制返回的仓库数量
gh repo list --limit 100
```

---

**基本写法：按语言筛选**
`gh repo list --language <语言>`
```bash
# 按编程语言筛选仓库
gh repo list --language TypeScript
```

---

## 克隆与 Fork

**基本写法：克隆仓库**
`gh repo clone <owner>/<repo>`
```bash
# 克隆指定仓库到本地
gh repo clone facebook/react
```

---

**基本写法：克隆当前仓库**
`gh repo clone`
```bash
# 克隆当前目录对应的仓库
gh repo clone
```

---

**基本写法：克隆到指定目录**
`gh repo clone <owner>/<repo> <目录>`
```bash
# 克隆仓库到指定目录名
gh repo clone facebook/react myreact
```

---

**基本写法：Fork 仓库**
`gh repo fork <owner>/<repo>`
```bash
# Fork 指定仓库到自己的账户
gh repo fork facebook/react
```

---

**基本写法：Fork 并克隆**
`gh repo fork <owner>/<repo> --clone`
```bash
# Fork 仓库并克隆到本地
gh repo fork facebook/react --clone
```

---

**基本写法：Fork 并添加远程**
`gh repo fork <owner>/<repo> --remote`
```bash
# Fork 仓库并自动添加原仓库为 upstream
gh repo fork facebook/react --remote
```

---

**基本写法：指定 upstream 名称**
`gh repo fork <owner>/<repo> --remote --remote-name <名称>`
```bash
# Fork 并自定义 upstream 远程名
gh repo fork facebook/react --remote --remote-name upstream
```

---

## 仓库编辑

**基本写法：修改仓库描述**
`gh repo edit --description "<描述>"`
```bash
# 修改当前仓库的描述
gh repo edit --description "更新后的项目描述"
```

---

**基本写法：修改主页 URL**
`gh repo edit --homepage "<URL>"`
```bash
# 设置仓库的主页地址
gh repo edit --homepage "https://myproject.com"
```

---

**基本写法：修改可见性为私有**
`gh repo edit --visibility private`
```bash
# 将仓库改为私有
gh repo edit --visibility private
```

---

**基本写法：修改可见性为公开**
`gh repo edit --visibility public`
```bash
# 将仓库改为公开
gh repo edit --visibility public
```

---

**基本写法：启用 Issues 功能**
`gh repo edit --enable-issues`
```bash
# 启用仓库的 Issues 功能
gh repo edit --enable-issues
```

---

**基本写法：启用 Wiki 功能**
`gh repo edit --enable-wiki`
```bash
# 启用仓库的 Wiki 功能
gh repo edit --enable-wiki
```

---

**基本写法：添加话题**
`gh repo edit --add-topic <话题>`
```bash
# 为仓库添加话题标签
gh repo edit --add-topic "javascript"
```

---

**基本写法：移除话题**
`gh repo edit --remove-topic <话题>`
```bash
# 移除仓库的话题标签
gh repo edit --remove-topic "javascript"
```

---

## 仓库同步与删除

**基本写法：同步 Fork**
`gh repo sync`
```bash
# 同步 Fork 仓库与上游
gh repo sync
```

---

**基本写法：同步指定 Fork**
`gh repo sync <owner>/<repo>`
```bash
# 同步指定的 Fork 仓库
gh repo sync myname/react
```

---

**基本写法：同步指定分支**
`gh repo sync --source <源> --branch <分支>`
```bash
# 从指定源同步指定分支
gh repo sync --source upstream --branch main
```

---

**基本写法：删除仓库**
`gh repo delete <仓库名>`
```bash
# 删除指定仓库（需确认）
gh repo delete myproject
```

---

**基本写法：删除当前仓库**
`gh repo delete`
```bash
# 删除当前目录对应的仓库
gh repo delete
```

---

**基本写法：强制删除不确认**
`gh repo delete <仓库名> --yes`
```bash
# 跳过确认直接删除
gh repo delete myproject --yes
```

---

## 归档与传输

**基本写法：归档仓库**
`gh repo archive <仓库名>`
```bash
# 将仓库设为只读归档状态
gh repo archive myproject
```

---

**基本写法：归档当前仓库**
`gh repo archive`
```bash
# 归档当前目录对应的仓库
gh repo archive
```

---

**基本写法：取消归档**
`gh repo unarchive <仓库名>`
```bash
# 取消仓库的归档状态
gh repo unarchive myproject
```

---

**基本写法：转移仓库**
`gh repo transfer <仓库> <新所有者>`
```bash
# 将仓库转移给其他用户或组织
gh repo transfer myproject myorg
```

---

## 仓库部署与发布

**基本写法：创建 Release**
`gh release create <标签名>`
```bash
# 基于标签创建发布
gh release create v1.0.0
```

---

**基本写法：创建带说明的 Release**
`gh release create <标签名> --title "<标题>" --notes "<说明>"`
```bash
# 创建发布并指定标题和说明
gh release create v1.0.0 --title "v1.0.0 正式版" --notes "首个正式版本"
```

---

**基本写法：上传附件到 Release**
`gh release upload <标签名> <文件>`
```bash
# 上传构建产物到指定发布
gh release upload v1.0.0 ./dist/app.zip
```

---

**基本写法：查看 Release 列表**
`gh release list`
```bash
# 列出仓库的所有发布
gh release list
```

---

**基本写法：下载 Release 资源**
`gh release download <标签名>`
```bash
# 下载指定发布的所有资源
gh release download v1.0.0
```

---

**基本写法：删除 Release**
`gh release delete <标签名>`
```bash
# 删除指定的发布
gh release delete v1.0.0
```
