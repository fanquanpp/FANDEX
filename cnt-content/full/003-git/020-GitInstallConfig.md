---
order: 20
title: Git 安装与配置：装完只是开始，配置才是你签名
module: 'git'
category: 工具链
difficulty: beginner
description: 三大系统一行命令安装 Git 并验证，讲透 user.name/user.email 为什么必须配（每个提交的署名与 GitHub 贡献图），global 常用三件套、仓库级覆盖实验与出口检查清单；SSH 与 HTTPS 的选择只做预告。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/010-Git'
  - 'git/030-GitEnvConfigInit'
  - 'git/150-GitRemoteRepoOperation'
  - 'shell/100-EnvVarPath'
prerequisites:
  - 'git/010-Git'
---

## 前置知识

- 已完成 [Git 是什么](/git/010-Git)：知道版本控制解决什么、仓库/提交/工作区三个词。

没装 Git 也可以，第 2 节就是安装；[开发环境搭建](/start/030-DevEnvironmentSetup) 里装过的，直接从验证开始核对。

## 学习目标

读完本文你将能够：

1. 一行命令安装或升级 Git 并验证当前生效的是哪一份；
2. 配置 `user.name` 与 `user.email`，说出它们被写进提交的哪个字段、GitHub 认领提交靠什么；
3. 完成全局配置三件套，看到 master 提示时用一行命令解决；
4. 用仓库级配置实现公司邮箱与个人邮箱的切换。

## 1. 问题：装完就算会了？配置才是你签名

两个高频翻车现场：第一次 `git commit`，Git 直接拒绝，报错 `*** Please tell me who you are.`——它不知道该署谁的名；几个月后代码推上 GitHub，主页贡献图一片灰——提交里的邮箱和账号绑定的邮箱对不上，GitHub 不认领。

原因都在同一处：**每一个提交都会永久写上作者信息（姓名与邮箱）**，它来自安装后配置的 `user.name` 和 `user.email`。配置只花五分钟，却印在之后每条历史里；配错了再改，已写进历史的旧提交不会跟着变。所以顺序是：装好 → 立刻配好 → 验证过关再往下走。

## 2. 安装：三系统各一行

优先用系统包管理器；官网安装包 `https://git-scm.com/downloads` 是兜底，Windows 安装包全部保持默认即可（默认即社区共识），会一并装上 Git Bash 终端与凭据管理器。

```bash
winget install Git.Git        # Windows（或官网安装包一路默认）
brew install git              # macOS（Homebrew，见 brew.sh）
sudo apt install git          # Ubuntu / Debian
```

升级同样各一行（`winget upgrade` / `brew upgrade` / `apt upgrade`）。macOS 自带的 Git 通常偏旧，Homebrew 装的新版会优先生效。本教程假定 2.30 以上版本。

## 3. 验证：装的是哪一份

**新开一个终端窗口**（刚装的软件对安装前打开的窗口不可见），运行：

```bash
git --version
```

预期输出（数字不必相同，`2.` 开头即正常）：

```text
git version 2.51.0
```

机器里有多份 Git 时，用 `which git`（Windows `where git`）看当前生效的那份住在哪，输出形如 `/opt/homebrew/bin/git` 都正常。装了却找不到命令的排查见第 8 节。

## 4. 必配：user.name 与 user.email

```bash
git config --global user.name "张三"
git config --global user.email "zhangsan@example.com"
```

两条规则的细节：名字带空格时**必须加引号**，否则 `Zhang` 和 `San` 会被当成两个参数；`--global` 对这台机器的所有仓库生效，不带它只对当前仓库生效（第 7 节实验二用）；邮箱写真实可联系的——Git 不验证真伪，但 GitHub 靠邮箱认领提交，打算用 GitHub 就填账号绑定的那个。

配置写进用户主目录的 `~/.gitconfig`（Windows 是 `%USERPROFILE%\.gitconfig`）。Git 配置分 system/global/仓库级三级、就近覆盖，细节在 [环境配置与初始化](/git/030-GitEnvConfigInit) 展开。读回验证 `git config user.name` 与 `git config user.email`，预期各输出一行：`张三`、`zhangsan@example.com`。

## 5. global 常用三件套

身份之外，新机器再配一条 `init.defaultBranch`，就凑齐了日常最常用的三件套：

```bash
# 三件套：身份 + 默认分支名
git config --global user.name "张三"
git config --global user.email "zhangsan@example.com"
git config --global init.defaultBranch main
```

`init.defaultBranch` 决定 `git init` 新建仓库时的默认分支名。不配置的话，每次建仓库都会附赠一段提示：

```text
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
（后略：Git 自己给出了可照抄的解法命令与改名命令）
```

照抄提示里的 `git config --global init.defaultBranch main`，提示消失，新仓库默认分支为 `main`（旧仓库改名见 [Git 分支管理](/git/100-GitBranchManagement)）。

顺手可配第四件编辑器：`git config --global core.editor "code --wait"`，让 `git commit` 不带 `-m` 时弹出 VS Code 而不是困住新手的 vim。

用 `git config --global --list` 一次看全所有配置，输出形如 `user.name=张三`、`init.defaultbranch=main`（键名统一小写）。想知道某个值来自哪一级文件，用 `git config --list --show-origin`，每行输出前带文件路径——排障利器，详解在 [环境配置与初始化](/git/030-GitEnvConfigInit)。

## 6. SSH 还是 HTTPS：先混个眼熟

以后把仓库放到 GitHub 时，远程地址有两种长相：

```text
https://github.com/user/repo.git      ← HTTPS：凭据管理器帮你记密码
git@github.com:user/repo.git          ← SSH：一对密钥，配好后免输密码
```

本文两样都不配。怎么选、密钥怎么生成、首次连接的指纹确认，全部推迟到 [远程仓库操作](/git/150-GitRemoteRepoOperation)。

## 7. 修改实验

实验一（2 分钟）：`git config --global user.name "Zhang San"` 后读回，先预测再运行；然后把值改回常用名。结论：`git config` 是直接覆盖写，改配置不需要卸载重装。

实验二（5 分钟）：仓库级覆盖 global。新建空文件夹 `test-repo` 进入后运行（`git init` 下一篇正式讲，先照抄）：

```bash
git init
git config user.email "work@company.com"
git config user.email
```

预测：读回的是 `work@company.com` 还是全局的 `zhangsan@example.com`？`cd` 回主目录再读呢？「就近覆盖」就是真实工作流：公司项目用仓库级配工位邮箱，个人项目用全局邮箱。

## 8. 常见错误与调试实录

**错误一：装完了，`git --version` 还是命令找不到。**

```text
bash: git: command not found
```

```text
'git' 不是内部或外部命令，也不是可运行的程序或批处理文件。
```

两种可能：没装成，或装了但 PATH 没生效。先重开终端再试（最高频原因）；仍失败则检查安装时是否勾选「添加到 PATH」，必要时重装；PATH 深入排查见 [环境变量与 PATH](/shell/100-EnvVarPath)。

**错误二：`git init` 时弹出一大段 master 提示。** 即第 5 节的 `hint:` 原文。规则：**Git 的提示末尾几乎总带着可照抄的命令，先读再动手**。

**错误三：提交时报 `*** Please tell me who you are.`** 没配身份，Git 拒绝提交，解法是第 4 节的两条命令。完整原文在 [基础操作](/git/050-GitBasicOperation) 的调试实录里——只有真正 commit 时才撞得上它。

## 9. 出口检查

四条命令逐条运行，全部命中预期才算过关：

```bash
git --version                           # 以 git version 开头
git config user.name                    # 读回你设置的名字
git config user.email                   # 读回你设置的邮箱
git config --global init.defaultBranch  # 输出 main
```

最后一条若**没有任何输出**，说明还没配置，回第 5 节补上。四条全过，本机 Git 达到「可以开始干活」的状态。

## 10. 实际项目场景

- **多身份切换**：公司仓库用工位邮箱、开源项目用个人邮箱，靠仓库级覆盖实现（实验二就是完整流程）；FANDEX 的 500 多次提交，每条的作者信息都来自某一次 config；
- **贡献图认领**：GitHub 用邮箱把提交关联到账号，邮箱配错的最直观后果就是「我天天提交，主页却全灰」；
- **换新机器**：五分钟流程就是本文目录——装（第 2 节）→ 三件套（第 5 节）→ 出口检查（第 9 节）。

## 练习

预测题（5 分钟）：依次运行三条命令，先写输出再核对：`git config --global user.name "Li Hua"`、`git config user.name`、`git config --global user.name "Li Hua Wang"`。第三条故意不加引号——如果报错，报错在提醒什么？（运行完把名字改回常用值。）

修改题（10 分钟）：任选一个文件夹照抄实验二前三行配仓库级邮箱；`git config --global --list` 确认它**不出现在**全局列表，`git config user.email` 确认就近覆盖生效。收尾用 `git config --unset user.email`（不带 `--global` 即仓库级）撤销。

修 Bug 题（5 分钟）：同学运行 `git init` 得到第 5 节那段 `hint:`，问「是不是报错，要不要重装 Git」。按读报错三步回答他，并写出消灭提示的那行命令。

挑战题（30 分钟）：找一台没配过的电脑或虚拟机，不看本文完成「安装 → 验证 → 三件套」。验收清单：`git --version` 有输出；`git config user.name`/`user.email` 能读回；`git config --global init.defaultBranch` 输出 `main`。

## 与之前和之后的知识的关系

本模块按 010 → 020 → 030 → 040 → 050 → 060 推进。往前：[Git 是什么](/git/010-Git) 解释了为什么需要签名与快照。往后：[环境配置与初始化](/git/030-GitEnvConfigInit) 把三级配置与 `git init` 讲透；[忽略规则 .gitignore 深入](/git/040-GitignoreDeepDive) 处理「哪些文件不进仓库」；[基础操作](/git/050-GitBasicOperation) 开始 add、commit 实战，`Please tell me who you are` 在那里完整拆解；[三棵树](/git/060-ThreeTrees) 讲清快照底层。

## 官方文档

- `git config` 手册（配置项权威列表）：https://git-scm.com/docs/git-config
- Pro Git 中文版「初次运行 Git 前的配置」：https://git-scm.com/book/zh/v2

## 自我检查

- 能说出 `user.name`/`user.email` 写进提交的哪个字段、GitHub 认领靠哪个；
- 能解释三级配置的覆盖顺序，看到 master 的 `hint:` 就能写出消除它的命令；
- 换新电脑能不看文档完成安装到出口检查的全流程。

## 本章总结

安装一行命令，验证看 `git --version` 与 `which/where git`。身份是每个提交的署名，`user.email` 还决定 GitHub 是否认领提交；三件套是身份、`init.defaultBranch`、（可选）编辑器。配置三级就近覆盖，仓库级覆盖是多身份的钥匙。Git 的提示自带解法命令，先读再动手。

## 下一步

进入 [环境配置与初始化](/git/030-GitEnvConfigInit)：把三级机制与 `git init` 建仓库的动作一次讲透。
