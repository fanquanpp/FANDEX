# Git 分支管理

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 查看分支

**基本写法：查看本地分支**
`git branch`
```bash
# 列出本地所有分支
git branch;
```

**基本写法：查看远程分支**
`git branch -r`
```bash
# 列出所有远程分支
git branch -r;
```

**基本写法：查看所有分支**
`git branch -a`
```bash
# 列出本地和远程所有分支
git branch -a;
```

**基本写法：查看分支详情**
`git branch -v`
```bash
# 显示分支名、哈希、提交消息
git branch -v;
```

---

## 创建分支

**基本写法：创建新分支**
`git branch <分支名>`
```bash
# 创建 feature/login 分支
git branch feature/login;
```

---

## 切换分支

**基本写法：切换分支**
`git checkout <分支名>`
```bash
# 切换到 feature/login 分支
git checkout feature/login;
```

**基本写法：使用 switch 切换**
`git switch <分支名>`
```bash
# 切换到 develop 分支（Git 2.23+）
git switch develop;
```

---

## 创建并切换分支

**基本写法：创建并切换**
`git checkout -b <分支名>`
```bash
# 创建并切换到 feature/login 分支
git checkout -b feature/login;
```

**基本写法：使用 switch 创建并切换**
`git switch -c <分支名>`
```bash
# 创建并切换到 feature/payment 分支（Git 2.23+）
git switch -c feature/payment;
```

---

## 合并分支

**基本写法：合并到当前分支**
`git merge <分支名>`
```bash
# 将 feature/login 合并到当前分支
git merge feature/login;
```

**基本写法：快速合并（Fast-forward）**
`git merge <分支名>`
```bash
# 切换到 main 后合并 feature/login
git checkout main;
git merge feature/login;
```

**基本写法：三方合并（3-way merge）**
`git merge <分支名>`
```bash
# 切换到 main 后合并 feature/payment
git checkout main;
git merge feature/payment;
```

---

## 合并策略

**基本写法：优先对方分支修改**
`git merge --strategy-option theirs <分支名>`
```bash
# 冲突时优先使用对方分支的修改
git merge --strategy-option theirs feature/branch;
```

**基本写法：优先当前分支修改**
`git merge --strategy-option ours <分支名>`
```bash
# 冲突时优先使用当前分支的修改
git merge --strategy-option ours feature/branch;
```

**基本写法：递归策略**
`git merge --strategy recursive <分支名>`
```bash
# 显式指定递归策略
git merge --strategy recursive feature/branch;
```

**单行写法：章鱼策略合并多个分支**
`git merge --strategy octopus <分支1> <分支2> <分支3>`
```bash
# 同时合并多个分支
git merge --strategy octopus feature1 feature2 feature3;
```

**换行写法：章鱼策略合并多个分支**
`git merge --strategy octopus <分支1> <分支2> <分支3>`
```bash
# 换行书写多个分支
git merge --strategy octopus feature1 \
                          feature2 \
                          feature3;
```

---

## 删除分支

**基本写法：安全删除**
`git branch -d <分支名>`
```bash
# 删除已合并的 feature/login 分支
git branch -d feature/login;
```

**基本写法：强制删除**
`git branch -D <分支名>`
```bash
# 强制删除未合并的 feature/login 分支
git branch -D feature/login;
```

**基本写法：删除远程分支**
`git push <远程仓库名> --delete <分支名>`
```bash
# 删除 origin 上的 feature/login 分支
git push origin --delete feature/login;
```

---

## 重命名分支

**基本写法：重命名分支**
`git branch -m <旧分支名> <新分支名>`
```bash
# 将 feature/old 重命名为 feature/new
git branch -m feature/old feature/new;
```

---

## 设置上游分支

**基本写法：设置已有分支上游**
`git branch --set-upstream-to=<远程仓库名>/<远程分支名> <本地分支名>`
```bash
# 将本地 feature/login 关联到 origin/feature/login
git branch --set-upstream-to=origin/feature/login feature/login;
```

**基本写法：首次推送时设置上游**
`git push -u <远程仓库名> <本地分支名>`
```bash
# 推送 feature/login 并设置上游
git push -u origin feature/login;
```

---

## 分支命名规范

**基本写法：命名格式约定**
`<type>/<描述>`
```text
# 功能分支：feature/login
# 修复分支：bugfix/login-error
# 紧急修复：hotfix/security-patch
# 发布分支：release/v1.0.0
# 开发分支：develop
# 主分支：main / master
```

---

## GitFlow 工作流

**基本写法：初始化 GitFlow**
`git flow init`
```bash
# 初始化 GitFlow 工作流
git flow init;
```

**基本写法：创建功能分支**
`git flow feature start <功能名>`
```bash
# 创建功能分支
git flow feature start login;
```

**基本写法：完成功能分支**
`git flow feature finish <功能名>`
```bash
# 完成功能分支
git flow feature finish login;
```

**基本写法：创建发布分支**
`git flow release start <版本号>`
```bash
# 创建发布分支
git flow release start v1.0.0;
```

**基本写法：完成发布分支**
`git flow release finish <版本号>`
```bash
# 完成发布分支
git flow release finish v1.0.0;
```

**基本写法：创建热修复分支**
`git flow hotfix start <修复名>`
```bash
# 创建热修复分支
git flow hotfix start security-patch;
```

**基本写法：完成热修复分支**
`git flow hotfix finish <修复名>`
```bash
# 完成热修复分支
git flow hotfix finish security-patch;
```

---

## 解决分支冲突

**基本写法：查看冲突文件**
`git diff`
```bash
# 查看冲突详情
git diff;
```

**基本写法：冲突标记格式**
`<<<<<<< HEAD ... ======= ... >>>>>>> <分支名>`
```text
# 冲突标记格式
<<<<<<< HEAD
当前分支的内容
=======
要合并的分支的内容
>>>>>>> feature/login
```

**基本写法：标记冲突已解决**
`git add .`
```bash
# 将解决冲突后的文件加入暂存区
git add .;
```

**基本写法：完成合并提交**
`git commit`
```bash
# 提交合并结果
git commit;
```

**基本写法：放弃合并**
`git merge --abort`
```bash
# 放弃当前合并操作
git merge --abort;
```
