---
order: 470
title: GitHub CLI PR 管理
module: 'github'
category: 工具链
difficulty: beginner
description: GitHub CLI PR 管理 的完整教学讲解。
author: fanquanpp
updated: '2026-08-02'
related: []
prerequisites: []
---

## 创建 PR

**基本写法：交互式创建 PR**
`gh pr create`
```bash
# 通过交互式提示创建 PR
gh pr create
```

---

**基本写法：指定标题和正文**
`gh pr create --title "<标题>" --body "<正文>"`
```bash
# 直接指定 PR 标题和描述
gh pr create --title "feat: 添加用户认证" --body "实现 OAuth 登录流程"
```

---

**基本写法：使用提交信息填充**
`gh pr create --fill`
```bash
# 使用最近提交信息填充标题和正文
gh pr create --fill
```

---

**基本写法：创建草稿 PR**
`gh pr create --draft --title "<标题>"`
```bash
# 创建草稿 PR 待完善后再标记就绪
gh pr create --draft --title "WIP: 重构认证模块"
```

---

**基本写法：指定基础分支**
`gh pr create --base <分支> --head <分支>`
```bash
# 指定目标分支和源分支
gh pr create --base main --head feature/login
```

---

**基本写法：指定指派人**
`gh pr create --assignee <用户>`
```bash
# 创建 PR 并指派审查人
gh pr create --assignee @me
```

---

**基本写法：添加标签和审查人**
`gh pr create --label "<标签>" --reviewer <用户>`
```bash
# 创建 PR 并添加标签和审查人
gh pr create --label "需要审查" --reviewer alice
```

---

## 查看 PR

**基本写法：列出当前仓库 PR**
`gh pr list`
```bash
# 列出当前仓库的 PR
gh pr list
```

---

**基本写法：列出指定状态 PR**
`gh pr list --state <状态>`
```bash
# 列出指定状态的 PR
gh pr list --state open
```

---

**基本写法：查看自己的 PR**
`gh pr list --author @me`
```bash
# 列出自己创建的 PR
gh pr list --author @me
```

---

**基本写法：查看待审查 PR**
`gh pr list --reviewer @me`
```bash
# 列出等待自己审查的 PR
gh pr list --reviewer @me
```

---

**基本写法：按标签筛选**
`gh pr list --label "<标签>"`
```bash
# 按标签筛选 PR
gh pr list --label "bug"
```

---

**基本写法：限制返回数量**
`gh pr list --limit <数量>`
```bash
# 限制返回的 PR 数量
gh pr list --limit 50
```

---

**基本写法：查看 PR 详情**
`gh pr view <编号>`
```bash
# 查看指定 PR 的详细信息
gh pr view 42
```

---

**基本写法：在浏览器中查看**
`gh pr view <编号> --web`
```bash
# 在浏览器中打开 PR 页面
gh pr view 42 --web
```

---

## PR 代码审查

**基本写法：查看 PR 差异**
`gh pr diff <编号>`
```bash
# 查看 PR 的代码差异
gh pr diff 42
```

---

**基本写法：查看变更文件列表**
`gh pr diff <编号> --name-only`
```bash
# 仅列出 PR 变更的文件名
gh pr diff 42 --name-only
```

---

**基本写法：检出 PR 到本地**
`gh pr checkout <编号>`
```bash
# 检出 PR 分支到本地进行测试
gh pr checkout 42
```

---

**基本写法：强制检出 PR**
`gh pr checkout <编号> --force`
```bash
# 有本地改动时强制检出 PR
gh pr checkout 42 --force
```

---

**基本写法：查看检查状态**
`gh pr checks <编号>`
```bash
# 查看 PR 的 CI 检查状态
gh pr checks 42
```

---

**基本写法：等待检查完成**
`gh pr checks <编号> --watch`
```bash
# 实时监控 PR 检查状态直到完成
gh pr checks 42 --watch
```

---

**基本写法：仅查看必需检查**
`gh pr checks <编号> --required`
```bash
# 仅显示必需通过的检查
gh pr checks 42 --required
```

---

## 提交审查

**基本写法：批准 PR**
`gh pr review <编号> --approve --body "<评论>"`
```bash
# 批准 PR 并附带评论
gh pr review 42 --approve --body "代码质量很好"
```

---

**基本写法：请求修改**
`gh pr review <编号> --request-changes --body "<意见>"`
```bash
# 请求修改并说明原因
gh pr review 42 --request-changes --body "需要补充单元测试"
```

---

**基本写法：评论 PR**
`gh pr review <编号> --comment --body "<评论>"`
```bash
# 仅评论不批准也不拒绝
gh pr review 42 --comment --body "建议优化命名"
```

---

**基本写法：添加行内评论**
`gh api repos/<owner>/<repo>/pulls/<编号>/reviews --input -`
```bash
# 通过 API 提交带行内评论的审查
gh api repos/owner/repo/pulls/42/reviews --input - <<'EOF'
{"event":"COMMENT","body":"总体不错","comments":[{"path":"src/app.js","line":42,"side":"RIGHT","body":"建议使用常量"}]}
EOF
```

---

## PR 评论

**基本写法：添加评论**
`gh pr comment <编号> --body "<评论>"`
```bash
# 在 PR 中添加评论
gh pr comment 42 --body "已修复请重新审查"
```

---

**基本写法：查看评论列表**
`gh api repos/<owner>/<repo>/issues/<编号>/comments`
```bash
# 通过 API 查看 PR 评论
gh api repos/owner/repo/issues/42/comments
```

---

## 合并 PR

**基本写法：合并 PR（默认方式）**
`gh pr merge <编号>`
```bash
# 合并指定 PR
gh pr merge 42
```

---

**基本写法：压缩合并**
`gh pr merge <编号> --squash`
```bash
# 使用 squash 方式合并 PR
gh pr merge 42 --squash
```

---

**基本写法：变基合并**
`gh pr merge <编号> --rebase`
```bash
# 使用 rebase 方式合并 PR
gh pr merge 42 --rebase
```

---

**基本写法：合并并删除分支**
`gh pr merge <编号> --squash --delete-branch`
```bash
# 合并 PR 后删除源分支
gh pr merge 42 --squash --delete-branch
```

---

**基本写法：自动合并**
`gh pr merge <编号> --auto --squash`
```bash
# 检查通过后自动合并
gh pr merge 42 --auto --squash
```

---

## PR 状态管理

**基本写法：关闭 PR**
`gh pr close <编号>`
```bash
# 关闭指定 PR
gh pr close 42
```

---

**基本写法：关闭并添加评论**
`gh pr close <编号> --comment "<评论>"`
```bash
# 关闭 PR 并附带说明
gh pr close 42 --comment "不再需要此功能"
```

---

**基本写法：重新打开 PR**
`gh pr reopen <编号>`
```bash
# 重新打开已关闭的 PR
gh pr reopen 42
```

---

**基本写法：草稿转就绪**
`gh pr ready <编号>`
```bash
# 将草稿 PR 标记为就绪状态
gh pr ready 42
```

---

**基本写法：就绪转草稿**
`gh pr ready <编号> --undo`
```bash
# 将就绪 PR 转回草稿状态
gh pr ready 42 --undo
```

---

**基本写法：更新 PR 分支**
`gh pr update-branch <编号>`
```bash
# 用基础分支更新 PR 分支
gh pr update-branch 42
```

---

**基本写法：编辑 PR**
`gh pr edit <编号> --add-label "<标签>"`
```bash
# 为 PR 添加标签
gh pr edit 42 --add-label "优先级高"
```

---

**基本写法：添加审查人**
`gh pr edit <编号> --add-reviewer <用户>`
```bash
# 为 PR 添加审查人
gh pr edit 42 --add-reviewer alice
```
