# 工作树管理

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 创建工作树

**基本写法：基于现有分支创建**
`git worktree add <路径> <分支名>`
```bash
# 将 feature 分支检出到 ../project-feature
git worktree add ../project-feature feature;
```

**基本写法：基于新分支创建**
`git worktree add -b <新分支名> <路径> <基础分支>`
```bash
# 基于 main 创建 new-feature 分支并检出
git worktree add -b new-feature ../project-new-feature main;
```

**基本写法：创建分离 HEAD 工作树**
`git worktree add --detach <路径> <提交或标签>`
```bash
# 检出 v1.0.0 标签到 ../project-v1
git worktree add --detach ../project-v1 v1.0.0;
```

---

## 管理工作树

**基本写法：列出所有工作树**
`git worktree list`
```bash
# 列出所有工作树
git worktree list;
```

**基本写法：删除工作树**
`git worktree remove <路径>`
```bash
# 删除 ../project-feature 工作树
git worktree remove ../project-feature;
```

**基本写法：强制删除工作树**
`git worktree remove --force <路径>`
```bash
# 强制删除有修改的工作树
git worktree remove --force ../project-feature;
```

---

## 清理工作树

**基本写法：清理已删除目录的引用**
`git worktree prune`
```bash
# 清理已删除目录的工作树引用
git worktree prune;
```

**基本写法：预览清理**
`git worktree prune --dry-run`
```bash
# 查看将被清理的工作树
git worktree prune --dry-run;
```

---

## 紧急修复场景

**基本写法：创建紧急修复工作树**
`git worktree add -b <修复分支> <路径> <基础分支>`
```bash
# 创建紧急修复工作树
git worktree add ../hotfix -b hotfix/bug-123 main;
```

**基本写法：进入工作树**
`cd <路径>`
```bash
# 进入工作树
cd ../hotfix;
```

**基本写法：提交修复**
`git commit -m "<消息>"`
```bash
# 修复 Bug 并提交
git commit -m "fix: resolve bug 123";
```

**基本写法：推送修复**
`git push <远程仓库名> <分支名>`
```bash
# 推送修复
git push origin hotfix/bug-123;
```

**基本写法：返回主工作树**
`cd <路径>`
```bash
# 返回主工作树
cd ../project;
```

**基本写法：删除修复工作树**
`git worktree remove <路径>`
```bash
# 删除修复工作树
git worktree remove ../hotfix;
```

---

## 代码审查场景

**基本写法：检出 PR 到工作树**
`git worktree add -b <分支> <路径> <远程仓库名>/<远程分支名>`
```bash
# 检出同事的 PR 到独立工作树
git worktree add ../review-pr -b review origin/colleague/feature;
```

**基本写法：进入审查工作树**
`cd <路径>`
```bash
# 进入工作树
cd ../review-pr;
```

---

## 对比版本场景

**基本写法：创建对比工作树**
`git worktree add <路径> <标签或提交>`
```bash
# 检出 v1.0.0 到独立目录
git worktree add ../v1-compare v1.0.0;
```

**基本写法：对比两个版本**
`diff -r <目录1> <目录2>`
```bash
# 对比两个版本的代码
diff -r src/ ../v1-compare/src/;
```
