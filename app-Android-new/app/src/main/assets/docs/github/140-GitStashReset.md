---
order: 140
title: GitHub 暂存与回退
module: 'github'
category: 工具链
difficulty: beginner
description: 以寄存柜与时光机类比驱动讲解 git stash 暂存系列与 git reset/revert/restore/clean 回退系列命令，覆盖软/混合/硬回退三档选择与撤销安全原则，适合零基础学习者。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 开篇：像寄存柜与时光机一样管理改动

在大型商场里，你拎着大包小包没法逛街。这时你走到**寄存柜**前，把东西暂存进去、拿走钥匙牌，轻装继续逛；逛完凭牌取回，东西原封不动。

`git stash` 就是代码的"寄存柜"：当你工作到一半、还不能提交，但又必须切换分支或拉取代码时，把当前改动"暂存"起来，让工作区回到干净状态；办完事再"取回"改动，继续干活。

而**时光机**大家都懂：回到过去、修正错误。`git reset` 就是 Git 的时光机——把分支指针拨回过去的某个提交。但它有三个"档位"：**软回退（只拨指针）、混合回退（连暂存区一起拨）、硬回退（连工作区一起拨）**，选错档位，后果天差地别。

本篇采用**类比驱动**的叙事方式：以"寄存柜"讲透 stash，以"时光机"讲透 reset 及其安全替代品 revert，最后用 restore 和 clean 补齐"撤销三兄弟"。

---

## 一、寄存柜：git stash 暂存系列

### 1.1 为什么需要寄存（典型场景）

```bash
# 场景：正在开发登录功能（没写完，不想提交），但 main 分支有个紧急 Bug 要修
git switch main        # 报错！有未提交的改动，切不过去

# 解法：先把改动存起来
git stash
git switch main        # 成功切换，工作区干净
# ...修复 Bug 并提交...
git switch feature/login
git stash pop          # 取回之前未写完的改动
```

> 原理提示：`git stash` 把工作区和暂存区的改动打包成一个"暂存条目"存到 `refs/stash` 引用里，然后把工作区还原成与 HEAD 一致。注意：**它默认不包含未跟踪的新文件**（需要加 `-u`）。

### 1.2 暂存（存包）

```bash
# 暂存当前所有已跟踪改动（最常用）
git stash

# 暂存并附上说明（好找）
git stash push -m "登录功能开发中"

# 连同未跟踪文件一起暂存（新文件也存）
git stash -u

# 连忽略文件也一起暂存（极少数情况用）
git stash -a

# 暂存但保留暂存区内容（--keep-index）
git stash --keep-index
```

### 1.3 查看（看寄存柜里有什么）

```bash
# 列出所有暂存条目（stash@{0} 是最近的一个）
git stash list
# 输出示例：
# stash@{0}: On feature/login: 登录功能开发中
# stash@{1}: On main: 样式调整

# 查看最近暂存的改动摘要
git stash show

# 查看指定暂存的改动摘要
git stash show stash@{1}

# 查看指定暂存的完整差异（-p 补丁格式）
git stash show -p stash@{0}
```

### 1.4 恢复（取包）

```bash
# 恢复最近暂存并删除该条记录（最常用）
git stash pop

# 恢复指定暂存
git stash pop stash@{1}

# 恢复但不删除记录（想保留备份时用）
git stash apply

# 恢复指定暂存且保留记录
git stash apply stash@{1}
```

> 对比记忆：**pop = 取包 + 退钥匙牌（删除记录）；apply = 取包但保留钥匙牌（记录还在）**。

### 1.5 删除（扔包）

```bash
# 删除指定暂存记录
git stash drop stash@{0}

# 清空所有暂存记录
git stash clear

# 基于暂存创建新分支（处理"恢复时与当前分支冲突"的场景）
git stash branch feature/recovery stash@{0}
```

---

## 二、时光机：git reset 回退系列

### 2.1 时光机原理：指针的三档回拨

`git reset` 的本质是**把当前分支指针（以及可选的工作区/暂存区）移回过去的提交**。三个档位的区别，用"指针、暂存区、工作区"三件套来记：

| 档位 | 命令 | 分支指针 | 暂存区 | 工作区 | 适用场景 |
| --- | --- | --- | --- | --- | --- |
| 软回退 | `git reset --soft <目标>` | 回退 | 保留 | 保留 | 想重新提交（改动留在暂存区） |
| 混合回退 | `git reset --mixed <目标>`（默认） | 回退 | 回退 | 保留 | 想重新 add（改动留在工作区） |
| 硬回退 | `git reset --hard <目标>` | 回退 | 回退 | 回退 | 彻底丢弃改动（危险） |

### 2.2 三个档位的命令

```bash
# 软回退：撤销上次提交，改动保留在暂存区（改完再提交）
git reset --soft HEAD~1

# 混合回退（默认）：撤销提交和暂存，改动保留在工作区
git reset HEAD~1
# 或显式写：git reset --mixed HEAD~1

# 硬回退：彻底回到上次提交的状态（所有未提交改动永久丢失）
git reset --hard HEAD~1

# 回退到指定提交
git reset --hard abc1234

# 回退单个文件到上次提交状态（不影响其他文件）
git reset HEAD~1 src/index.js

# 让本地分支与远程分支完全一致
git reset --hard origin/main
```

### 2.3 回退前必读的安全警告

1. `--hard` 会**永久丢弃**工作区和暂存区的未提交改动，无法用 `git status` 找回，只能靠 `reflog` 抢救；
2. 已 push 的提交不要用 reset 回退（历史分叉会坑队友），改用 `git revert`（见第三节）；
3. 回退前养成习惯：先 `git stash` 或 `git branch backup` 备份当前状态。

---

## 三、安全撤销：git revert 反向提交

`git revert` 与 reset 的本质区别：**reset 是"抹掉历史"，revert 是"新增一个反向提交来抵消历史"**。revert 不改变已有提交，因此**可以安全用于已推送的远程提交**：

```bash
# 创建一个新提交，撤销指定提交的改动
git revert abc1234

# 撤销最近一次提交
git revert HEAD

# 反向但不自动提交（先检查再手动提交）
git revert -n abc1234

# 反向一个范围的提交
git revert abc1234..def5678
```

| 对比维度 | `git reset` | `git revert` |
| --- | --- | --- |
| 历史处理 | 移动指针（改写历史） | 新增提交（保留历史） |
| 是否安全用于已推送提交 | 不安全 | 安全 |
| 适用场景 | 本地未推送的提交 | 已推送的提交、公共分支 |
| 命令形态 | `git reset --hard HEAD~1` | `git revert abc1234` |

---

## 四、撤销工作区与暂存区：git restore

`git restore` 是 Git 2.23+ 引入的"撤销专用命令"，把原本混在 `checkout`/`reset` 里的撤销职责独立出来，语义更清晰：

```bash
# 撤销工作区修改（恢复到上次提交/暂存的状态）——危险，改动丢失
git restore index.js

# 旧写法（等价）
git checkout -- index.js

# 撤销当前目录所有工作区改动
git restore .

# 取消暂存（把文件从暂存区移回工作区，内容不丢）
git restore --staged index.js

# 取消所有暂存
git restore --staged .

# 从指定提交恢复文件
git restore --source=abc1234 index.js
```

> 记忆锚点：`git restore` 默认管**工作区**，加 `--staged` 管**暂存区**；`--source` 指定从哪个提交恢复。

---

## 五、清理未跟踪文件：git clean

`git stash` 和 `git reset` 都不管**未跟踪文件**，`git clean` 专门负责清理它们。**注意：它删除的文件无法恢复，务必先 `-n` 预览**：

```bash
# 预览将被删除的未跟踪文件（安全模式，不实际删除）
git clean -n

# 强制删除未跟踪文件
git clean -f

# 删除未跟踪文件和目录
git clean -fd

# 连忽略文件（.gitignore 里的）一起删（最彻底，最危险）
git clean -fdx

# 交互式逐个确认
git clean -i
```

---

## 六、常见错误与对策表

| 错误现象 | 报错信息（节选） | 原因分析 | 解决办法 |
| --- | --- | --- | --- |
| stash 后新文件不见了 | pop 后新建的文件没恢复 | stash 默认不含未跟踪文件 | 暂存时用 `git stash -u` |
| pop 时冲突 | `CONFLICT (content): Merge conflict in ...` | 暂存的改动与当前工作区冲突 | 按 041 篇解决冲突；pop 失败不会删记录，解决后 `git stash drop` 手动清理 |
| 误用 --hard 丢改动 | 工作区改动全部消失 | `--hard` 回退会丢弃未提交改动 | 立即用 `git reflog` + `git reset --hard <原ID>` 抢救 |
| reset 后 push 被拒 | `! [rejected] ... (non-fast-forward)` | 回退的是已推送提交，历史分叉 | 改用 `git revert` 生成反向提交后再 push |
| apply 与 pop 分不清 | 恢复后记录还在/没了 | 混淆两者语义 | pop 删记录、apply 留记录；按需选择 |
| 误以为 reset 能找回 stash | stash clear 后想找回 | 已清空无记录 | 无解；clear 前用 `git stash list` 确认，或改用 drop 单条删除 |
| clean 误删文件 | 文件被删且找不到 | 忘记先 `-n` 预览 | 养成先 `git clean -n` 预览再 `-f` 的习惯；无法恢复 |

---

## 八、一句话记忆

**stash 是寄存柜（存：`stash push -u`，看：`stash list`，取：`pop` 删记录 / `apply` 留记录，清：`clear`）；reset 是时光机（软拨指针、混拨暂存、硬全拨——`--hard` 慎用，先 stash 备份）；已推送的提交用 `revert` 反向抵消；`restore` 撤工作区/暂存区，`clean` 清未跟踪——先 `-n` 预览再动手。**
