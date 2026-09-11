---
order: 140
title: git-mergetool
module: 'git'
category: 工具链
difficulty: intermediate
description: git mergetool 详解：三方合并视图、主流工具配置、VS Code 集成与冲突收尾。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/130-MergeConflictResolution'
  - 'git/270-GitRebase'
prerequisites:
  - 'git/130-MergeConflictResolution'
---

## 前置知识与学习目标

**前置知识**：见过至少一次合并冲突标记，知道 ours / theirs 的含义（见 [合并冲突解决](git/130-MergeConflictResolution)）。

学完本文你应当能够：

1. 理解 mergetool 的三方视图（LOCAL / BASE / REMOTE / MERGED）；
2. 为 VS Code、Meld、vimdiff 等工具完成配置；
3. 走通「冲突 → mergetool → 收尾提交」的完整流程，并清理 `.orig` 备份等残留。

类比先行：文本冲突标记像把三份文件打印出来逐行肉眼比对，而 mergetool 是给你一张**三窗对照台**——左（你的版本）、中（共同祖先）、右（对方版本）并排，你在一个结果窗里拼装最终稿。

## 1. mergetool 是什么

`git mergetool` 在合并/变基产生冲突后，逐个调起图形化或终端合并工具。它把冲突现场展开成四方材料：

| 名称      | 含义                                   | 对应冲突标记    |
| :-------- | :------------------------------------- | :-------------- |
| **LOCAL** | 当前分支版本（ours）                   | `<<<<<<< HEAD`  |
| **BASE**  | 双方的共同祖先版本                     | `|||||||`（部分工具显示）|
| **REMOTE**| 正在合入的版本（theirs）               | `=======` 之后  |
| **MERGED**| 合并结果，由你编辑并保存               | `>>>>>>>` 结束  |

BASE 是三方合并的灵魂：有了「原来长这样」，工具（和你）才能判断两边各自改了什么，而不是盲目二选一。

## 2. 配置

### 2.1 查看与选择工具

```bash
git mergetool --tool-help     # 列出本机可用的内置支持工具
git config --global merge.tool meld    # 设置默认
git mergetool --tool=vimdiff  # 临时换用别的工具
```

内置支持的工具包括 vimdiff、meld、kdiff3、opendiff、p4merge、tortoisemerge、winmerge、bc/bc3/bc4（Beyond Compare）、araxis、smerge（Sublime Merge）等——这些名字 Git 认识，无需写命令模板。VS Code 不在内置名单，需要自定义（见 2.2）。

### 2.2 VS Code 集成（最常用）

```bash
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd \
  'code --wait --merge $REMOTE $LOCAL $BASE $MERGED'
git config --global mergetool.vscode.trustExitCode true
```

要点：

- `--merge` 让 VS Code 打开**三方合并编辑器**（接收/忽略双方按钮），只传 `$MERGED` 则只是普通打开文件，没有对照视图；
- 参数顺序固定为 REMOTE、LOCAL、BASE、MERGED，与直觉不同，照抄即可；
- `--wait` 让 Git 等你关掉窗口再继续；`trustExitCode` 表示相信工具的退出码。

### 2.3 其他常见工具

```bash
# Meld（Linux/macOS，apt install meld / brew install meld）
git config --global merge.tool meld

# vimdiff（零依赖，终端环境）
git config --global merge.tool vimdiff

# Beyond Compare（内置支持，无需手写 cmd）
git config --global merge.tool bc4
```

### 2.4 体验调优

```bash
git config --global mergetool.prompt false      # 每个文件不再二次确认
git config --global mergetool.keepBackup false  # 不留 *.orig 备份（默认 true，很吵）
git config --global mergetool.keepTemporaries false
```

`keepBackup` 关掉后 Git 不再生成 `xxx.js.orig`；若你担心工具误操作，保留默认并在 `.gitignore` 加 `*.orig` 亦可。

## 3. 完整流程

```bash
git merge feature
# Auto-merging src/app.js
# CONFLICT (content): Merge conflict in src/app.js

git mergetool
# Merging:
# src/app.js
# {your tool opens with the 3-way view}
# → 在 MERGED 视图中逐个冲突点取舍、保存、关闭

git status            # 冲突文件已自动标记为已解决（已暂存）
git commit            # 完成合并提交（rebase 场景为 git rebase --continue）
```

要点：mergetool 保存并正常退出后，Git **自动 `git add`** 该文件；全部文件处理完后照常走合并的收尾命令。

```bash
git mergetool src/app.js    # 只处理指定文件
git mergetool --no-prompt   # 单次运行免确认
```

## 4. 工具选型参考

| 工具               | 平台        | 特点                             |
| :----------------- | :---------- | :------------------------------- |
| **VS Code**        | 跨平台      | 免费零安装成本，三方视图直观     |
| **Meld**           | Linux/macOS | 免费开源，三方对比经典           |
| **KDiff3**         | 跨平台      | 免费，支持自动合并与手工微调     |
| **Beyond Compare** | 跨平台      | 功能最强，付费                   |
| **vimdiff**        | 终端        | 服务器/SSH 环境零依赖，上手陡    |
| **P4Merge**        | 跨平台      | 免费专注对比合并                 |

## 5. 陷阱与调试

- **工具窗口关了 Git 没反应**：少了 `--wait`（自定义 cmd）或工具在后台常驻；VS Code 必须带 `--wait`。
- **`.orig` 备份文件满仓库都是**：`mergetool.keepBackup` 默认 true；关掉或 gitignore 掉。
- **打开的只是普通 diff 而非三方合并**：VS Code 少了 `--merge` 或参数顺序写错，按 2.2 的模板照抄。
- **mergetool 自动暂存了不满意的结果**：它保存即 add；用 `git restore --staged <file>` 退出暂存，重新 `git mergetool <file>` 再来。
- **服务器上没有图形工具**：SSH 场景提前配 `merge.tool vimdiff`，或直接手改冲突标记后 `git add`——两者等价，mergetool 只是提高了效率。

## 终端环境：vimdiff 与无 GUI 策略

SSH/服务器上配 `merge.tool vimdiff` 后，窗口布局为 LOCAL | BASE | REMOTE 四联屏（MERGED 居中），常用操作：

- `]c` / `[c`：跳到下/上一个差异块；
- `:diffget LO` / `:diffget BA` / `:diffget RE`：分别从本地、祖先、对方取该块；
- `:wqa` 保存全部退出，Git 接管收尾。

不便用任何工具时的「人肉三步法」与 mergetool 结果等价：

```bash
git diff                       # 逐个查看冲突
vim src/app.js                 # 手改冲突标记（删除 <<<<<<< / ======= / >>>>>>>，保留正确内容）
git add src/app.js && git commit
```

两者没有本质差异——mergetool 的全部价值就是把这三步压缩成可视化的循环。

## mergetool 与 difftool 的分工

`git mergetool` 只负责**冲突**；平时的「比较两个版本」由姊妹命令 `git difftool` 负责，两者各有一套工具配置：

```bash
git config --global diff.tool meld        # difftool 用哪个看差异
git config --global merge.tool meld       # mergetool 用哪个解冲突
git config --global diff.guitool meld     # 带 --gui 时优先用图形工具
git difftool HEAD~3 -- src/app.js         # 图形化看历史差异
git difftool -d                          # 目录级双栏对比
```

记忆法：merge 系配置服务冲突解决，diff 系配置服务日常比较；都配成同一工具最省心。

## 小结

**初学者要点**

- mergetool = 冲突现场的三窗对照台（LOCAL/BASE/REMOTE），结果写进 MERGED。
- 保存退出即自动 `git add`，收尾照旧 `git commit` / `rebase --continue`。
- VS Code 三行配置即可获得图形化合并体验，注意 `--merge` 与参数顺序。

**进阶注意**

- BASE 才能解释「双方各改了什么」，选工具时确认它展示祖先版本。
- `keepBackup=false` + `.gitignore *.orig` 双保险处理备份残留。
- mergetool 只改变「解决冲突的效率」，不改变冲突解决本身的语义与流程。
