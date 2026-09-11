---
order: 50
title: GitHub 仓库初始化
module: 'github'
category: 工具链
difficulty: beginner
description: 从零初始化 Git 仓库并完成首次提交的完整操作向导，覆盖 git init、git clone、git add、git commit，适合零基础学习者。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 开篇：像建房打地基一样初始化仓库

想象你要在空地上建一栋房子。第一步不是砌墙，而是**打地基**：把地面整平、浇筑混凝土，划定"这块地属于这栋房子"。地基打好了，后面的砌墙、封顶、装修才有依靠。

Git 仓库也是这样。你的项目文件（代码、文档）就是"房子"，而 `git init` 就是"打地基"——它在项目目录里悄悄埋下一个名叫 `.git` 的隐藏文件夹，告诉 Git："从这一刻起，这块目录归我管，之后所有的版本历史都存在这里。"

本篇文章就是一份**手把手操作向导**，带你走完从"一个普通文件夹"到"第一个提交诞生"的全过程。学完这一篇，你就拥有了"打地基 + 浇筑第一块楼板"的能力。

---

## 一、动手前的准备：安装与身份设置

### 1.1 检查 Git 是否安装

打开命令行（Windows 用 PowerShell 或 Git Bash，macOS/Linux 用终端），输入：

```bash
# 查看 Git 版本，验证是否安装成功
git --version
```

输出示例（版本号以你实际安装为准）：

```
git version 2.43.0.windows.1
```

如果提示"command not found"或"无法识别"，说明尚未安装 Git，请到官网下载安装包（见文末参考链接）。

### 1.2 设置提交身份（第一次必做）

Git 要求每一次提交（commit）都记录"谁做的"，这个身份由 `user.name` 和 `user.email` 两个配置决定。注意：**这不是 GitHub 登录账号，而是写在提交记录里的署名**。

```bash
# 全局配置（对这台电脑上的所有仓库生效，建议只配一次）
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
```

配置说明：

| 配置命令 | 作用范围 | 存储位置 |
| --- | --- | --- |
| `git config --global ...` | 当前用户所有仓库 | 用户主目录下的 `~/.gitconfig` |
| `git config ...`（不带 --global） | 仅当前仓库 | 仓库内的 `.git/config` |

> 原理小贴士：`--global` 写在前面是"全局"，不写就是"局部"。局部配置会覆盖全局配置。如果跳过这一步直接提交，Git 会报错并要求你先配置身份，这是新手最常见的第一个拦路虎。

---

## 二、操作向导第一步：让普通目录变成仓库

### 2.1 进入你的项目目录

```bash
# 创建练习目录（示例路径，可自行修改）
mkdir my-first-project
cd my-first-project
```

### 2.2 初始化仓库：git init

```bash
# 在当前目录初始化 Git 仓库
git init
```

真实输出示例：

```
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, run:
hint:
hint:   git config --global init.defaultBranch main
Initialized empty Git repository in C:/Users/you/my-first-project/.git/
```

**这一步发生了什么？** 原理上，`git init` 只做三件事：

1. 创建 `.git` 隐藏文件夹——仓库的核心数据库（对象、引用、配置）都存在这里；
2. 建立默认分支（新版 Git 多为 `master`，也可指定 `main`）；
3. 准备暂存区（Index），等待第一个文件进入。

> 重要提醒：**永远不要手工修改或删除 `.git` 文件夹**，它一坏，整个仓库的版本历史就没了。

### 2.3 常用变体

```bash
# 方式一：初始化时直接指定目录（目录不存在会自动创建）
git init myproject

# 方式二：指定默认分支名为 main（与 GitHub 默认一致，团队常用）
git init -b main

# 方式三：初始化裸仓库（没有工作区的"纯数据库"，仅用于服务器端）
git init --bare project.git
```

三种变体对比：

| 命令 | 用途 | 适用场景 |
| --- | --- | --- |
| `git init` | 当前目录建仓库 | 本地新项目 |
| `git init -b main` | 建仓库且默认分支叫 main | 准备推送到 GitHub 的项目 |
| `git init --bare` | 裸仓库（无工作区） | 自建服务器、GitHub 内部存储原理 |

---

## 三、操作向导第二步：创建文件并查看状态

### 3.1 创建第一个文件

```bash
# 创建一个 README 文件（Windows 的 PowerShell 也支持 echo 写法）
echo "# 我的第一个项目" > README.md
```

### 3.2 查看仓库状态：git status

```bash
# 查看工作区和暂存区状态（养成随时查看的习惯）
git status
```

真实输出示例：

```
On branch master

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        README.md

nothing added to commit but untracked files present (use "git add" to track)
```

看懂输出：`Untracked files` 表示 README.md 是**未跟踪文件**——文件存在，但 Git 还没纳入管理。这正是"地基打好但砖还没码"的阶段。

### 3.3 简洁模式与细节模式

```bash
# 简洁输出（?? 表示未跟踪，A 表示已暂存，M 表示已修改）
git status -s

# 详细输出：附加文件差异内容
git status -v
```

---

## 四、操作向导第三步：把文件放入暂存区

### 4.1 添加文件：git add

```bash
# 将指定文件加入暂存区（暂存区 = 本次提交的"候选清单"）
git add README.md

# 查看状态确认（此时 README.md 前面出现 A）
git status -s
```

输出示例：

```
A  README.md
```

### 4.2 git add 的常见用法

```bash
# 添加当前目录下所有改动（最常用）
git add .

# 添加所有变化（新增、修改、删除都算，等价于 git add -A）
git add -A

# 只添加已跟踪文件的修改和删除（不含新文件）
git add -u

# 添加指定目录
git add src/components/

# 交互式选择部分改动加入暂存区（精细控制）
git add -p
```

### 4.3 文件移除与重命名

```bash
# 从工作区和暂存区同时移除文件
git rm oldfile.txt

# 仅从暂存区移除，但保留本地文件（例如不想把 .env 提交上去）
git rm --cached .env

# 递归移除整个目录
git rm -r olddir/

# 重命名文件并记录到暂存区
git mv old.txt new.txt

# 将文件移动到目录
git mv file.txt src/

# 把已暂存的文件撤出暂存区（内容不丢）
git restore --staged index.js
```

> 原理说明：`git add` 不是"上传文件"，而是把文件的**当前快照**写入暂存区（Index）。如果你 add 之后又修改了文件，下一次提交记录的是暂存区里的旧版本，必须重新 add。理解这一点，很多"我改了为什么没生效"的困惑就解开了。

---

## 五、操作向导第四步：完成首次提交

### 5.1 提交：git commit

```bash
# 提交暂存区内容，-m 后面跟提交说明
git commit -m "chore: 项目初始化，添加 README"
```

真实输出示例：

```
[master (root-commit) 7a3f9c1] chore: 项目初始化，添加 README
 1 file changed, 1 insertion(+)
 create mode 100644 README.md
```

看懂输出：`root-commit` 表示这是该仓库的**第一个提交**（没有父提交）；`7a3f9c1` 是提交 ID（SHA-1 哈希的前 7 位）；`1 file changed, 1 insertion(+)` 表示本次改动规模。

### 5.2 查看提交成果

```bash
# 确认提交成功
git status
# 输出应为：nothing to commit, working tree clean（工作区干净）

# 查看提交历史
git log --oneline
# 输出示例：7a3f9c1 (HEAD -> master) chore: 项目初始化，添加 README
```

### 5.3 其他初始化相关命令

```bash
# 查看仓库配置（确认身份已生效）
git config --list

# 删除仓库重新初始化（慎用！会清空 .git 中的所有历史）
# 在项目根目录执行：rm -rf .git  然后重新 git init
```

---

## 六、克隆远程仓库（另一种"拿地"方式）

除了从零 `git init`，更常见的做法是**克隆（clone）**——把 GitHub 上已有的仓库完整复制到本地，历史记录、分支、标签全都带过来。

```bash
# 克隆仓库到当前目录（自动生成同名文件夹）
git clone https://github.com/user/repo.git

# 克隆到指定目录名
git clone https://github.com/user/repo.git myapp

# 仅克隆指定分支
git clone -b develop https://github.com/user/repo.git

# 浅克隆：只取最近 1 次提交（适合大仓库，速度快）
git clone --depth 1 https://github.com/user/repo.git

# 浅克隆：只取最近 5 次提交
git clone --depth 5 https://github.com/user/repo.git

# SSH 方式克隆（需先配置 SSH 密钥，免输密码）
git clone git@github.com:user/repo.git
```

> 原理说明：`git clone` 内部做了三件事——下载仓库所有对象、建立默认分支并检出工作区、自动添加名为 `origin` 的远程仓库引用。所以克隆完成后直接 `git remote -v` 就能看到远程地址，不需要再手动配置。

---

## 七、常见错误与对策表

| 错误现象 | 报错信息（节选） | 原因分析 | 解决办法 |
| --- | --- | --- | --- |
| 命令找不到 | `fatal: not a git repository (or any of the parent directories): .git` | 当前目录不是 Git 仓库 | 确认已进入项目目录，先执行 `git init` |
| 身份未配置 | `Author identity unknown` / `Please tell me who you are` | 没设置 user.name 和 user.email | 执行 `git config --global user.name "名字"` 和 `git config --global user.email "邮箱"` |
| 提交时没内容 | `nothing added to commit but untracked files present` | 文件从未执行过 `git add` | 先 `git add <文件>` 或 `git add .` 再 commit |
| 改了文件却提交了旧版 | 提交内容与最新修改不一致 | add 之后再编辑，暂存区还是旧快照 | 修改后重新执行 `git add`，或改用 `git commit -am "说明"`（仅限已跟踪文件） |
| 误删 .git | 仓库历史全部丢失，无法回退 | 手工删除或移动了 .git 文件夹 | 无法恢复，只能重新 init；切记永远不动 .git |
| 克隆报认证失败 | `Authentication failed for 'https://github.com/...'` | HTTPS 克隆私有仓库需要凭证 | 使用 SSH 方式克隆，或配置 credential helper（见 043 篇） |

---

## 九、一句话记忆

**`git init` 是给项目打地基（生成 .git 数据库），`git add` 是把材料搬进候选区（暂存区），`git commit` 是浇下第一块楼板（生成首个快照）——地基打好，版本控制的大厦从此拔地而起。**
