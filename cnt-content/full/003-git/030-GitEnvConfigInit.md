---
order: 40
title: Git 三级配置与仓库初始化：登记手续与仓库出生证明
module: 'git'
category: 工具链
difficulty: beginner
description: 讲透 system/global/仓库级三级配置的作用域与就近覆盖（--show-origin 排查）、core.autocrlf 按系统正确取值、git init 到底做了什么与误 init 后删 .git 的安全边界；远程认证只做一句预告。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'git/010-Git'
  - 'git/020-GitInstallConfig'
  - 'git/040-GitignoreDeepDive'
  - 'git/050-GitBasicOperation'
  - 'git/150-GitRemoteRepoOperation'
prerequisites:
  - 'git/020-GitInstallConfig'
---

## 前置知识

- 已完成 [安装与配置](/git/020-GitInstallConfig)：Git 可用，`user.name` 与 `user.email` 已用 `--global` 配好，`init.defaultBranch` 已配为 `main`；
- 会打开终端、用 `cd` 进目录（[终端与命令行入门](/start/040-TerminalAndShellBasics)）。

没配过身份也能跟：第 2 节的实验会给出补配命令，首次配置的完整讲解在 020 篇。

## 学习目标

读完本文你将能够：

1. 说出三级配置各写在哪个文件、谁覆盖谁，并用 `--show-origin` 指认任意值的出处；
2. 按自己的系统写出 `core.autocrlf` 的正确取值，解释它在提交与检出两个方向各做什么；
3. 用 `git init` 建仓并说出 `.git` 目录里有什么；误在错误目录 init 后能安全撤销；
4. 复现「缺值命令静默无效」与「仓库外用 --local」两个真实报错，并按读报错三步修复。

## 1. 问题：装好的 Git 还不认识你

第一次 `git commit`，Git 当场拒绝：

```text
*** Please tell me who you are.
```

一个离线工具，凭什么要你自我介绍？因为**每一次提交都会永久写上作者姓名与邮箱**——这是提交的署名字段，写进历史就不再改。GitHub 也靠邮箱认领提交：邮箱对不上账号，你天天提交，主页贡献图仍是一片灰。这些 [安装与配置](/git/020-GitInstallConfig) 已带你做过：两条 `--global` 命令配好 `user.name` 与 `user.email`。

但这只是一半问题，另两个 020 篇没答：这份登记写到哪一级，谁说了算？仓库本身从哪来？本文把登记手续补全——配置的层级与覆盖，再让第一个仓库出生。

## 2. 核心概念：三级配置，就近覆盖

同一个配置项可以在三个地方定义，作用域从大到小：

| 级别 | 文件位置 | 作用范围 |
| --- | --- | --- |
| system | /etc/gitconfig（Windows 在 Git 安装目录下） | 本机所有用户 |
| global | ~/.gitconfig（Windows 为 C:\Users\你\.gitconfig） | 当前用户的所有仓库 |
| 仓库级 | 仓库的 .git/config | 只有当前仓库 |

规则一句话：**就近覆盖**——仓库级压过 global，global 压过 system；查同一个键时，Git 从仓库级向外问，问到就用。

实验场地：020 篇实验二建过的 `test-repo`（没了就新建并 `git init`，这个动词第 5 节讲透）。system 级看一眼长什么样（只读不需要管理员权限）：

```bash
git config --system --list
```

预期输出（Windows 安装器写入，内容随安装不同）：

```text
diff.astextplain=true
http.sslbackend=openssl
http.sslcainfo=C:/Program Files/Git/mingw64/etc/ssl/certs/ca-bundle.crt
credential.helper=manager
```

平时不用动它；真要写需管理员终端，且每台机器不同，几乎总有更合适的层级。仓库级的写法是不带 `--global`（global 那条 020 篇已配）：

```bash
git config user.email "work@company.com"
git config user.email
```

预期输出：

```text
work@company.com
```

确认 global 没被牵连：

```bash
git config --global user.email
```

```text
zhangsan@example.com
```

真实工作流就这一句：**global 配个人身份打底，公司项目用仓库级覆盖成工位邮箱**，互不打扰。

## 3. 验证与排查：--list 与 --show-origin

```bash
git config --list
```

预期输出（节选；键名统一显示为小写）：

```text
user.name=张三
user.email=work@company.com
init.defaultbranch=main
```

`--list` 列的是三层合并后的**最终生效值**，每一行都是 Git 实际会用的；加 `--global` 或 `--local` 只看某一级（后者必须在仓库内）。排查「我明明配了，怎么不生效」，利器是 `--show-origin`——给每个值标出来源文件：

```bash
git config --show-origin user.email
```

在刚才的仓库里运行，预期输出：

```text
file:.git/config	work@company.com
```

`cd` 出仓库再运行同一条命令：

```text
file:C:/Users/you/.gitconfig	zhangsan@example.com
```

同一台机器、同一个键，出处随你站的位置而变——就近覆盖的全部真相就在这两行里。改了配置怀疑没生效，先 `--show-origin` 问一句「这个值是谁说的」。

## 4. 剩下的行李：换行符、默认分支名与编辑器

### 4.1 core.autocrlf：按系统取值

Windows 的换行符是 CRLF（回车加换行，两个字符），Linux 与 macOS 是 LF（一个字符）。同一仓库在两边的系统间传来传去，换行符来回变形，`git diff` 满屏假差异，某些脚本还会直接跑挂。`core.autocrlf` 是调和开关，管两个方向：**提交时把 CRLF 归一成 LF 存进仓库；检出时按需把 LF 转回 CRLF**。正确取值按系统二选一：

```bash
# Windows
git config --global core.autocrlf true
# macOS 与 Linux
git config --global core.autocrlf input
```

- `true`：检出转 CRLF，提交归一成 LF。Windows 用；Git for Windows 安装器默认选项就是它，当时保持默认的话这条可省；
- `input`：检出不动，只在提交时归一。macOS 与 Linux 用；
- `false`：两个方向都不转，跨系统协作时不建议。

读回验证，Windows 机器预期输出 `true`：

```bash
git config core.autocrlf
```

团队级的统一方案是把规则写进仓库的 .gitattributes 文件，让所有人无视个人设置——先混个眼熟，本模块暂不展开。

### 4.2 init.defaultBranch 与 core.editor（可选）

`init.defaultBranch` 只在 `git init` 出生那一刻被读取，决定新仓库的默认分支名；没配的话每次建仓附赠一段 master 的 `hint:`（原文与解法见 020 篇第 5 节）。不想动全局配置，可对单个仓库临时指定：`git init -b main`。

`core.editor` 决定 `git commit` 不带 `-m` 时弹出哪个编辑器，默认常是 vim——困住过无数新手。装了 VS Code 就一行配好，可选不急：

```bash
git config --global core.editor "code --wait"
```

撞见 vim 时按 `Esc` 输入 `:wq` 回车也能退出，050 篇有完整逃生法。

## 5. git init：仓库的出生证明

进入一个新文件夹，让它出生：

```bash
mkdir init-demo
cd init-demo
git init
```

预期输出（路径随你的实际位置变化）：

```text
Initialized empty Git repository in C:/Users/you/projects/init-demo/.git/
```

`git init` 只做一件事：**在当前目录创建一个隐藏的 `.git` 目录**。看现场：

```bash
ls -a
```

```text
./  ../  .git/
```

`-a` 让 `ls` 显示隐藏项；`.git` 在 Windows 资源管理器里也要开「显示隐藏的项目」才看得见。翻看它的家底：

```bash
ls .git
```

```text
HEAD  config  description  hooks/  info/  objects/  refs/
```

目前只需认识两个：`objects/` 是历史快照的家（[三棵树](/git/060-ThreeTrees) 拆开讲）；`config` 就是第 2 节仓库级配置的住处，用 `git config --local --list` 可读出里面那几行 `core.*`。两条纪律与 050 篇一致：不要手动改 `.git` 里的文件；不要随手删它。重复 `git init` 无害（输出 `Reinitialized existing ...`），但没必要。

**误在错误目录 init 了怎么办？** 比如手抖在家目录跑了一次，Git 会把整个用户目录当仓库，一次 `git status` 慢到怀疑人生。Git 没有「撤销 init」命令——撤销就等于删掉 `.git`：

```bash
rm -rf .git
```

警告边界：`rm -rf` 不商量、不进回收站，**只删 `.git` 这一个参数**。此刻还没提交过，删掉它只是回到没建仓的状态，文件原封不动；但若仓库里已有提交，删 `.git` 连历史一起清零，动手前想清楚。验证：`ls -a` 里 `.git` 消失，其余文件都在。

仓库出生后早晚要上网——同步到 GitHub 的两种认证方式（HTTPS 凭据托管与 SSH 密钥）全部推迟到 [远程仓库操作](/git/150-GitRemoteRepoOperation)，本文一行相关命令都不需要。

## 6. 修改实验

实验一（3 分钟）：在 init-demo 里设仓库级 `user.name` 为 `Li Hua`，依次运行 `git config user.name`、`git config --global user.name`、`git config --show-origin user.name`，先预测三行输出再验证。收尾 `git config --unset user.name` 撤销并读回，确认落回全局值。结论：仓库级覆盖只写 `.git/config`，global 文件自岿然不动。

实验二（3 分钟）：运行 `git config --global core.autocrlf`（不带值），再在 `git config --global --list` 里找 `core.autocrlf`。两次都「没动静」——这正是下一节错误一的全貌，亲手踩一遍，以后一眼识破。

## 7. 常见错误与调试实录

**错误一：抄来的设置命令缺值，静默无效。** 旧教程常见这种写法：

```bash
git config --global core.autocrlf   # 注释写着「Windows 系统这样配」
```

不报错、无输出，你以为配好了。按读报错三步走：

1. 读现象：无输出——但设置成功本来也沉默，光看分不清；
2. 验证：`git config core.autocrlf` 仍无输出，`--global --list` 里也没有这一行，坐实什么都没写进去；
3. 修复：`config` 的规则是**带值为写、不带值为读**，补上值再读回：

```bash
git config --global core.autocrlf true
git config core.autocrlf
```

```text
true
```

教训：抄教程先看命令完不完整；配置配没配，读回才算数。

**错误二：在仓库外面用 --local。** 在用户主目录运行 `git config --local --list`：

```text
fatal: --local can only be used inside a git repository
```

1. 读报错：`fatal` 开头表示出错，原文说 `--local` 只能在仓库内用；
2. 定位：当前目录没有 `.git`——`pwd` 确认位置、`ls -a` 确认现场；
3. 修复：`cd` 回仓库目录，或先 `git init`。它与 050 篇的 `not a git repository` 同根：都是「脚下没有仓库」。

**错误三：身份没配就提交。** 第 1 节那句报错的完整版末尾还有一行：

```text
fatal: unable to auto-detect email address (got 'you@DESKTOP-ABC123.(none)')
```

1. 读报错：Git 在要身份，且它最后试了一搏——拿主机名拼了个猜测邮箱，觉得太离谱才拒绝；
2. 定位：`git config user.name` 与 `git config user.email` 都读不出值；
3. 修复：报错文本自带两条 config 命令，照抄并换成你的信息（020 篇第 4 节）；提交流程本身在 [基础操作](/git/050-GitBasicOperation)。

## 8. 实际项目场景

- **多身份切换**：global 打底、仓库级覆盖，公司项目工位邮箱、个人项目私人邮箱互不干扰——第 2 节的实验就是完整流程；
- **跨平台协作**：Windows 同学 `true`、macOS 与 Linux 同学 `input`；谁都不配，diff 里先吵起来的一定是满屏 `^M` 假差异；
- **新机器登记**：装（020 篇第 2 节）→ 三件套（020 篇第 5 节）→ autocrlf 与编辑器（本文第 4 节）→ 出口检查，十分钟收工。

## 9. 练习

预测题（5 分钟，先写答案再运行验证）：在 init-demo 里运行 `git config user.name "仓库A"`，依次运行 `git config user.name`、`git config --global user.name`、`git config --show-origin user.name`，三行各输出什么？`cd` 出仓库再运行第一条呢？

修改题（10 分钟）：给 init-demo 配一个仓库级邮箱，用 `git config --local --list` 与 `git config --show-origin user.email` 双重验证它确实住在 `.git/config`；再 `git config --unset user.email` 撤销，`--show-origin` 确认出处变回 `~/.gitconfig`。

修 Bug 题（10 分钟）：同学抄教程 `git config --global core.autocrlf`（后面只有注释），跑完 `git config --global --list` 里找不到这行。按读报错三步说明问题出在哪个字符、写出修复命令。验收：修复后 `git config core.autocrlf` 读回 `true`。

挑战题（20 分钟）：不看本文，在新文件夹完成：init → `ls -a` 确认 `.git` → 配仓库级身份 → `--show-origin` 指认出处 → 删 `.git` 撤销。验收清单：五步各拿出一个可见证据（命令输出或文件列表）。

## 与之前和之后的知识的关系

本模块按 010 → 020 → 030 → 040 → 050 → 060 推进。往前：[Git 是什么](/git/010-Git) 里的「仓库」在本文有了实体，[安装与配置](/git/020-GitInstallConfig) 只敢预告的三级机制与 `--show-origin` 在本文兑现。往后：[忽略规则 .gitignore 深入](/git/040-GitignoreDeepDive) 处理仓库出生后的第一件事——哪些文件不进仓库；[基础操作](/git/050-GitBasicOperation) 的 add 与 commit 才真正用上你登记的身份；[远程仓库操作](/git/150-GitRemoteRepoOperation) 兑现第 5 节那句预告。

## 官方文档

- `git config` 手册（全部配置项的权威列表）：https://git-scm.com/docs/git-config
- Pro Git 中文版「初次运行 Git 前的配置」：https://git-scm.com/book/zh/v2

## 自我检查

- 不看笔记，能画出三级配置的覆盖方向，说出每级配置文件的位置；
- 能说出你的系统该配的 `core.autocrlf` 取值，以及它在提交、检出两个方向各做什么；
- 能说出 `.git` 目录里至少两样东西的用途；
- 知道误 init 后删什么、删的边界在哪；抄到 config 命令会先检查它带没带值。

## 本章总结

配置三级就近覆盖：仓库级 `.git/config` 压过 global 的 `~/.gitconfig`，global 压过 system。`--list` 看最终生效值，`--show-origin` 看每个值由谁说了算。`core.autocrlf` 按系统取值（Windows `true`，macOS 与 Linux `input`），`init.defaultBranch` 与 `core.editor` 各一行。`git init` 的全部产出就是一个隐藏的 `.git` 目录，删掉它即撤销 init——没提交过就无伤，提交过就连历史一起没。config 命令带值为写、不带值为读；配置配没配，读回才算数。

## 下一步

进入 [忽略规则 .gitignore 深入](/git/040-GitignoreDeepDive)：仓库出生后，第一件该做的事是把构建产物、临时文件和密钥挡在门外。
