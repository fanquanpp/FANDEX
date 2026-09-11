---
order: 60
title: GitHub 提交与推送
module: 'github'
category: 工具链
difficulty: beginner
description: '按"工作区→暂存区→本地仓库→远程"四步流程讲解 git add、git commit、git push，覆盖提交信息规范与推送追踪关系，适合零基础学习者。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 开篇：像盖章存档一样提交代码

想象你是单位的档案管理员。领导交给你一份重要文件，你要做三件事才能让它"正式生效"：

1. **核稿**：把文件放进"待盖章"的筐里（暂存区）；
2. **盖章存档**：盖上公章、登记日期，放进本地档案柜（本地仓库）；
3. **报送上级**：把档案复印件报送上级单位存档（远程仓库）。

这个过程环环相扣、缺一不可，而且顺序不能乱：还没核稿就盖章，是无效文件；只盖章不报送，上级单位永远不知道你有这份文件。

Git 的提交与推送，就是这套"档案管理流程"的数字化版本。本篇采用**流程驱动**的叙事方式，沿着"工作区 → 暂存区 → 本地仓库 → 远程仓库"这条流水线，把 `git add`、`git commit`、`git push` 三个动作一次讲透。

---

## 一、先建立全局认知：代码的"四站旅程"

在你动手敲命令之前，先记住这张流程图：

```
工作区(Working Tree)  --git add-->  暂存区(Index)  --git commit-->  本地仓库(Local Repo)  --git push-->  远程仓库(Remote Repo)
   改代码的地方              挑选本次要提交的内容          生成正式版本快照            同步到 GitHub
```

每一站的职责：

| 站点 | 对应命令 | 类比 | 关键特点 |
| --- | --- | --- | --- |
| 工作区 | 编辑文件 | 写草稿 | 改动最多，随时可丢弃 |
| 暂存区 | `git add` | 待盖章的筐 | 挑选哪些改动进入本次提交 |
| 本地仓库 | `git commit` | 盖章存档 | 每次提交生成永久快照 |
| 远程仓库 | `git push` | 报送上级 | 团队共享的"官方档案" |

> 原理提示：`git commit` 生成的不是"补丁"，而是**完整快照**（Snapshot）。Git 会为提交时所有文件的内容建立索引并算出一个 SHA-1 哈希作为提交 ID。这也是为什么 Git 回退任何版本都能 100% 还原——每个版本都存了全套文件。

---

## 二、流程第一站：工作区改动

```bash
# 先确认你在哪个分支、工作区是否干净
git status
# 输出：On branch main / nothing to commit, working tree clean

# 修改或新建文件（示例）
echo "def add(a, b): return a + b" > calc.py
```

此时 `calc.py` 是"未跟踪"（Untracked）状态，用 `git status -s` 可以看到 `?? calc.py`。它还没有进入流程。

---

## 三、流程第二站：git add——把改动放入暂存区

### 3.1 基本用法

```bash
# 把单个文件加入暂存区
git add calc.py

# 把当前目录所有改动加入暂存区（最常用，但注意会包含所有新文件）
git add .

# 只看已跟踪文件的修改和删除（不含新文件，适合"只提交改过的"）
git add -u

# 交互式选择部分片段（精细控制，适合大改动拆小提交）
git add -p
```

### 3.2 验证暂存结果

```bash
# 暂存后状态检查（A 表示 Added，M 表示 Modified，左列是暂存区状态）
git status -s
```

输出示例：

```
A  calc.py
M  README.md
```

### 3.3 撤销暂存（反悔按钮）

```bash
# 把文件从暂存区移回工作区（内容不丢）
git restore --staged calc.py

# 旧写法（等效）
git reset HEAD calc.py
```

---

## 四、流程第三站：git commit——盖章存档

### 4.1 提交暂存区内容

```bash
# -m 后跟提交说明（必须有，否则会打开编辑器）
git commit -m "feat: 添加加法函数"
```

真实输出示例：

```
[main 8f4b2c1] feat: 添加加法函数
 1 file changed, 1 insertion(+)
 create mode 100644 calc.py
```

看懂输出：`main` 是分支名，`8f4b2c1` 是提交 ID 前 7 位，`1 file changed, 1 insertion(+)` 是改动统计。

### 4.2 常用提交方式

```bash
# 方式一：跳过 add，直接提交所有已跟踪文件的改动（新文件不包含）
git commit -am "fix: 修复样式问题"

# 方式二：多行提交信息（标题 + 描述）
git commit -m "feat: 添加搜索功能" -m "支持按关键词和日期范围搜索"

# 方式三：打开默认编辑器写详细提交信息
git commit
```

### 4.3 提交信息规范（Conventional Commits）

规范的提交信息让历史可读、可检索，团队必备：

```bash
# feat：新功能
git commit -m "feat: 添加购物车功能"

# fix：Bug 修复
git commit -m "fix: 修复登录页面崩溃问题"

# 带作用域（指出改的是哪个模块）
git commit -m "feat(auth): 添加 OAuth 登录"

# 破坏性变更（BREAKING CHANGE 必须大写）
git commit -m "feat: 重构 API 接口" -m "BREAKING CHANGE: 响应格式改为 JSON"
```

| 前缀 | 含义 | 示例 |
| --- | --- | --- |
| `feat:` | 新功能 | `feat: 添加支付页面` |
| `fix:` | 修复 Bug | `fix: 修复空指针异常` |
| `docs:` | 文档变更 | `docs: 更新使用说明` |
| `style:` | 格式调整（不影响逻辑） | `style: 统一缩进` |
| `refactor:` | 重构（不改功能） | `refactor: 抽取公共方法` |
| `chore:` | 杂务（构建、配置） | `chore: 升级依赖版本` |

### 4.4 修改上次提交（amend 后悔药）

```bash
# 修改最近一次提交的信息
git commit --amend -m "feat: 添加用户注册功能"

# 把漏掉的文件追加进上次提交（不修改信息）
git add forgotten.js
git commit --amend --no-edit

# 修改上次提交的作者信息（少用）
git commit --amend --author="张三 <zhangsan@example.com>"
```

> 原理与警告：`--amend` 不是"修改"旧提交，而是**生成一个新提交替换它**（提交 ID 会变）。因此，**amend 只适合本地还没 push 的提交**；如果已经 push 到远程且别人可能已经拉取，就不要再 amend，否则会造成历史分叉。

---

## 五、流程第四站：git push——报送远程

### 5.1 首次推送：建立追踪关系

```bash
# -u 是 --set-upstream 的简写：推送的同时记录"本地分支 跟踪 远程分支"
git push -u origin main
```

输出示例：

```
Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Writing objects: 100% (3/3), 222 bytes | 222.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0), reused 0 (delta 0)
To https://github.com/yourname/my-repo.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

看懂输出：最后一行 `branch 'main' set up to track 'origin/main'` 表示追踪关系已建立。**以后在这个分支上直接 `git push` 即可**，不用再写远程名和分支名。

### 5.2 日常推送

```bash
# 推送当前分支（需已建立追踪关系）
git push

# 推送指定分支
git push origin main

# 推送所有本地分支
git push --all origin

# 删除远程分支（推送"删除指令"）
git push origin --delete old-feature

# 推送标签
git push origin v1.0.0

# 推送所有本地标签
git push origin --tags
```

### 5.3 推送被拒绝怎么办

当远程分支有你本地没有的提交时，`git push` 会拒绝并提示 `non-fast-forward`。这是**保护机制**，不是故障。正确处理流程：

```bash
# 1. 先拉取远程更新（把远程的新提交合并到本地）
git pull

# 2. 解决可能出现的冲突（见 041 篇）
# 3. 再推送
git push
```

### 5.4 强制推送：谨慎使用

```bash
# 推荐方式：--force-with-lease（仅在远程没有被别人更新的前提下才覆盖）
git push --force-with-lease origin feature/login

# 危险方式：-f 无脑覆盖远程（可能覆盖别人的提交，团队协作严禁使用）
git push -f origin feature/login
```

> 安全原则：**永远不要对共享分支（main/master）使用强制推送**。`--force-with-lease` 相比 `-f` 多了一道"远程是否被他人更新"的检查，是个人分支上相对安全的选择。

---

## 六、提交后复盘：查看历史

```bash
# 查看完整提交历史
git log

# 每条提交一行（最常用的历史视图）
git log --oneline

# 图形化展示所有分支的提交历史
git log --oneline --graph --all

# 只看最近 5 条
git log -5

# 按作者筛选
git log --author="zhangsan"

# 按日期范围筛选
git log --since="2026-01-01" --until="2026-07-31"
```

---

## 七、常见错误与对策表

| 错误现象 | 报错信息（节选） | 原因分析 | 解决办法 |
| --- | --- | --- | --- |
| 提交时提示没有内容 | `nothing to commit, working tree clean` | 忘了 `git add`，或提交前改动已丢失 | 先 `git add` 再 commit；确认确实有改动 |
| commit 卡在编辑器里 | 执行 `git commit` 后弹出 vim 等编辑器 | 没带 `-m` 参数，Git 打开编辑器等输入 | 输入信息后保存退出（vim 按 `i` 输入、`Esc` 后 `:wq` 保存）；或以后都用 `git commit -m "..."` |
| push 被拒绝 | `! [rejected] main -> main (non-fast-forward)` | 远程有你本地没有的提交 | 先 `git pull` 合并远程更新，再 push |
| push 要求认证 | `Authentication failed` / `Username for 'https://github.com'` | 凭证缺失或过期 | 配置 credential helper，或改用 SSH 方式（见 043、004 篇） |
| 提交信息写得没意义 | 历史中全是 "update" "fix" | 没有遵循提交规范 | 使用 Conventional Commits 前缀（feat/fix/docs 等），见上文 4.3 节 |
| amend 后 push 失败 | `! [rejected] ... (non-fast-forward)` | 已推送的提交被 amend，本地历史与远程分叉 | 只在推送前使用 amend；若已推送，与团队确认后用 `--force-with-lease` |
| push 卡住无响应 | 长时间无输出 | 网络问题或代理未配置 | 检查网络；配置代理后重试 |

---

## 九、一句话记忆

**四站旅程一句话记牢：`git add` 把改动放进暂存区，`git commit` 盖章生成版本快照，`git push -u` 首次推送并建立追踪，此后 `git push` 直达远程——顺序不能乱，反悔用 amend，拒绝先 pull。**
