---
order: 480
title: GitHub CLI Issue 管理
module: 'github'
category: 工具链
difficulty: beginner
description: GitHub CLI Issue 管理 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 创建 Issue

**基本写法：交互式创建 Issue**
`gh issue create`
```bash
# 通过交互式提示创建 Issue
gh issue create
```

---

**基本写法：指定标题和正文**
`gh issue create --title "<标题>" --body "<正文>"`
```bash
# 直接指定 Issue 标题和描述
gh issue create --title "Bug: 登录页面报错" --body "点击登录按钮无响应"
```

---

**基本写法：从文件读取正文**
`gh issue create --title "<标题>" --body-file <文件>`
```bash
# 从文件读取 Issue 正文内容
gh issue create --title "性能优化" --body-file issue-template.md
```

---

**基本写法：指定指派人**
`gh issue create --assignee <用户>`
```bash
# 创建 Issue 并指派处理人
gh issue create --title "修复 bug" --assignee @me
```

---

**基本写法：添加标签**
`gh issue create --label "<标签>"`
```bash
# 创建 Issue 并添加标签
gh issue create --title "新功能" --label "enhancement"
```

---

**基本写法：指定里程碑**
`gh issue create --milestone "<里程碑>"`
```bash
# 创建 Issue 并关联里程碑
gh issue create --title "任务" --milestone "v1.0"
```

---

**基本写法：在浏览器中创建**
`gh issue create --web`
```bash
# 打开浏览器创建 Issue
gh issue create --web
```

---

## 查看 Issue

**基本写法：列出当前仓库 Issue**
`gh issue list`
```bash
# 列出当前仓库的 Issue
gh issue list
```

---

**基本写法：列出指定状态**
`gh issue list --state <状态>`
```bash
# 列出指定状态的 Issue
gh issue list --state open
```

---

**基本写法：列出已关闭 Issue**
`gh issue list --state closed`
```bash
# 列出已关闭的 Issue
gh issue list --state closed
```

---

**基本写法：查看指派给自己的 Issue**
`gh issue list --assignee @me`
```bash
# 列出指派给自己的 Issue
gh issue list --assignee @me
```

---

**基本写法：查看自己创建的 Issue**
`gh issue list --author @me`
```bash
# 列出自己创建的 Issue
gh issue list --author @me
```

---

**基本写法：按标签筛选**
`gh issue list --label "<标签>"`
```bash
# 按标签筛选 Issue
gh issue list --label "bug"
```

---

**基本写法：限制返回数量**
`gh issue list --limit <数量>`
```bash
# 限制返回的 Issue 数量
gh issue list --limit 30
```

---

**基本写法：查看 Issue 详情**
`gh issue view <编号>`
```bash
# 查看指定 Issue 的详细信息
gh issue view 42
```

---

**基本写法：在浏览器中查看**
`gh issue view <编号> --web`
```bash
# 在浏览器中打开 Issue 页面
gh issue view 42 --web
```

---

**基本写法：查看 Issue 评论**
`gh issue view <编号> --comments`
```bash
# 查看 Issue 及其评论内容
gh issue view 42 --comments
```

---

## Issue 评论

**基本写法：添加评论**
`gh issue comment <编号> --body "<评论>"`
```bash
# 在 Issue 中添加评论
gh issue comment 42 --body "已复现此问题"
```

---

**基本写法：从文件读取评论**
`gh issue comment <编号> --body-file <文件>`
```bash
# 从文件读取评论内容
gh issue comment 42 --body-file comment.md
```

---

**基本写法：编辑评论**
`gh api repos/<owner>/<repo>/issues/comments/<评论ID> -X PATCH -f body="<新内容>"`
```bash
# 通过 API 编辑指定评论
gh api repos/owner/repo/issues/comments/123 -X PATCH -f body="更新后的评论"
```

---

**基本写法：删除评论**
`gh api repos/<owner>/<repo>/issues/comments/<评论ID> -X DELETE`
```bash
# 通过 API 删除指定评论
gh api repos/owner/repo/issues/comments/123 -X DELETE
```

---

## Issue 状态管理

**基本写法：关闭 Issue**
`gh issue close <编号>`
```bash
# 关闭指定 Issue
gh issue close 42
```

---

**基本写法：关闭并添加评论**
`gh issue close <编号> --comment "<评论>"`
```bash
# 关闭 Issue 并附带说明
gh issue close 42 --comment "已在 v1.2 修复"
```

---

**基本写法：关闭并指定原因**
`gh issue close <编号> --reason <原因>`
```bash
# 关闭 Issue 并指定关闭原因
gh issue close 42 --reason "not planned"
```

---

**基本写法：重新打开 Issue**
`gh issue reopen <编号>`
```bash
# 重新打开已关闭的 Issue
gh issue reopen 42
```

---

## 编辑 Issue

**基本写法：修改标题**
`gh issue edit <编号> --title "<新标题>"`
```bash
# 修改 Issue 标题
gh issue edit 42 --title "Bug: 登录页面 500 错误"
```

---

**基本写法：修改正文**
`gh issue edit <编号> --body "<新正文>"`
```bash
# 修改 Issue 正文内容
gh issue edit 42 --body "更新后的描述"
```

---

**基本写法：添加标签**
`gh issue edit <编号> --add-label "<标签>"`
```bash
# 为 Issue 添加标签
gh issue edit 42 --add-label "优先级高"
```

---

**基本写法：移除标签**
`gh issue edit <编号> --remove-label "<标签>"`
```bash
# 移除 Issue 的标签
gh issue edit 42 --remove-label "优先级高"
```

---

**基本写法：添加指派人**
`gh issue edit <编号> --add-assignee <用户>`
```bash
# 为 Issue 添加处理人
gh issue edit 42 --add-assignee alice
```

---

**基本写法：移除指派人**
`gh issue edit <编号> --remove-assignee <用户>`
```bash
# 移除 Issue 的处理人
gh issue edit 42 --remove-assignee alice
```

---

## 批量操作

**基本写法：批量关闭 Issue**
`gh issue list --label "<标签>" --json number --jq ".[].number" | xargs -I {} gh issue close {}`
```bash
# 批量关闭指定标签的 Issue
gh issue list --label "wontfix" --json number --jq ".[].number" | xargs -I {} gh issue close {}
```

---

**基本写法：批量添加标签**
`gh issue list --state open --json number --jq ".[].number" | xargs -I {} gh issue edit {} --add-label "需要审查"`
```bash
# 为所有打开的 Issue 添加标签
gh issue list --state open --json number --jq ".[].number" | xargs -I {} gh issue edit {} --add-label "需要审查"
```

---

## Issue 传输与开发

**基本写法：将 Issue 转为分支开发**
`gh issue develop <编号>`
```bash
# 基于 Issue 创建开发分支
gh issue develop 42
```

---

**基本写法：指定分支名开发**
`gh issue develop <编号> -b <分支名>`
```bash
# 为 Issue 创建指定名称的分支
gh issue develop 42 -b fix/login-error
```

---

**基本写法：查看 Issue 关联的 PR**
`gh issue view <编号> --json trackedIssues`
```bash
# 查看 Issue 关联的追踪问题
gh issue view 42 --json trackedIssues
```

---

## JSON 输出

**基本写法：输出 JSON 格式**
`gh issue list --json <字段>`
```bash
# 以 JSON 格式输出指定字段
gh issue list --json number,title,state
```

---

**基本写法：使用 jq 过滤**
`gh issue list --json number,title | jq ".[] | select(.title | contains(\"bug\"))"`
```bash
# 使用 jq 过滤标题含 bug 的 Issue
gh issue list --json number,title | jq ".[] | select(.title | contains(\"bug\"))"
```

---

**基本写法：使用模板输出**
`gh issue list --template "<模板>"`
```bash
# 使用 Go 模板自定义输出格式
gh issue list --template "{{range .}}#{{.number}} {{.title}}{{end}}"
```
