# 变基操作

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本 rebase

**基本写法：标准变基**
`git rebase <基础分支>`
```bash
# 将 feature 分支变基到 main
git checkout feature;
git rebase main;
```

**基本写法：等价写法**
`git rebase <基础分支> <目标分支>`
```bash
# 等价于先 checkout feature 再 rebase main
git rebase main feature;
```

---

## 处理 rebase 冲突

**基本写法：触发 rebase**
`git rebase <基础分支>`
```bash
# rebase 过程中遇到冲突
git rebase main;
```

**基本写法：添加解决后的文件**
`git add .`
```bash
# 解决冲突后添加文件
git add .;
```

**基本写法：继续 rebase**
`git rebase --continue`
```bash
# 继续 rebase 流程
git rebase --continue;
```

**基本写法：跳过当前提交**
`git rebase --skip`
```bash
# 跳过当前冲突的提交
git rebase --skip;
```

**基本写法：放弃 rebase**
`git rebase --abort`
```bash
# 放弃整个 rebase 操作
git rebase --abort;
```

---

## 交互式 rebase

**基本写法：修改最近 N 个提交**
`git rebase -i HEAD~<n>`
```bash
# 修改最近 3 个提交
git rebase -i HEAD~3;
```

**基本写法：修改分叉点以来的提交**
`git rebase -i <基础分支>`
```bash
# 修改从 main 分叉以来的所有提交
git rebase -i main;
```

---

## 交互式 rebase 指令

**基本写法：指令格式**
`<指令> <提交哈希> <提交消息>`
```text
# 指令说明
# p, pick   使用提交
# r, reword 使用提交，修改消息
# e, edit   使用提交，暂停修改
# s, squash 合并到前一个提交
# f, fixup  合并到前一个提交，丢弃消息
# d, drop   丢弃提交
pick abc1234 feat: add authentication
pick def5678 fix: resolve login bug
```

**基本写法：修改提交消息**
`reword <提交哈希> <提交消息>`
```text
# 修改 abc1234 的提交消息
reword abc1234 feat: add authentication
pick def5678 fix: resolve login bug
```

**基本写法：合并提交**
`squash <提交哈希> <提交消息>`
```text
# 将 def5678 合并到 abc1234
pick abc1234 feat: add authentication
squash def5678 fix: resolve login bug
```

**基本写法：修改提交内容**
`edit <提交哈希> <提交消息>`
```text
# 标记 abc1234 为 edit 后保存退出
edit abc1234 feat: add authentication
pick def5678 fix: resolve login bug
```

**基本写法：修改暂停后的提交**
`git commit --amend`
```bash
# 修改提交内容
git commit --amend;
```

**基本写法：重新排序提交**
`pick <提交哈希> <提交消息>`
```text
# 调整提交顺序，def5678 在前
pick def5678 fix: resolve login bug
pick abc1234 feat: add authentication
```

**基本写法：删除提交**
`drop <提交哈希> <提交消息>`
```text
# 删除 def5678 提交
pick abc1234 feat: add authentication
drop def5678 fix: resolve login bug
```

---

## 高级 rebase

**基本写法：变基到指定提交**
`git rebase --onto <基础分支> <起始提交> <目标分支>`
```bash
# 将 abc1234..feature 范围的提交变基到 main 上
git rebase --onto main abc1234 feature;
```

**基本写法：自动 squash**
`git rebase -i --autosquash`
```bash
# 配合 git commit --fixup=abc1234 使用
git rebase -i --autosquash;
```

**基本写法：保留合并提交**
`git rebase -i --rebase-merges <基础分支>`
```bash
# 保留分支合并结构的交互式变基
git rebase -i --rebase-merges main;
```

---

## force push 安全方式

**基本写法：安全强制推送**
`git push --force-with-lease`
```bash
# 检查远程是否有新提交，有则拒绝推送
git push --force-with-lease;
```

---

## 实际场景

**基本写法：同步主分支更新**
`git rebase <远程仓库名>/<分支名>`
```bash
# 功能分支同步主分支更新
git checkout feature;
git fetch origin;
git rebase origin/main;
```

**基本写法：清理提交历史**
`git rebase -i HEAD~<n>`
```bash
# 合并最近 5 个提交
git rebase -i HEAD~5;
```

**基本写法：启动交互式 rebase 修复 Bug**
`git rebase -i HEAD~<n>`
```bash
# 启动交互式 rebase
git rebase -i HEAD~3;
```

**基本写法：修改提交**
`git commit --amend`
```bash
# 修复 Bug 后修改提交
git commit --amend;
```

**基本写法：继续 rebase**
`git rebase --continue`
```bash
# 继续 rebase 流程
git rebase --continue;
```
