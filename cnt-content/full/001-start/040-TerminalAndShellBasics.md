---
order: 40
title: 终端与命令行入门：用文字驾驶电脑
description: 从打开终端讲到十个必备命令，理解路径切换、相对绝对路径与环境变量 PATH 的实际运作，建立与图形界面同等强大的文字操作能力。
module: 'start'
category: 工具链
difficulty: beginner
prerequisites:
  - 'start/030-DevEnvironmentSetup'
author: fanquanpp
updated: '2026-09-18'
related:
  - 'start/060-FirstProgramJavaScript'
  - 'shell/010-DevEnvSetup'
  - 'cs-fundamentals/150-OperatingSystem'
---

## 学习目标

图形界面是给人用的，命令行是给程序（以及专业的人）用的。开发者工作中终端始终开着。读完并练完本篇，你应能：

1. 说清终端、shell、命令三个词的关系；
2. 熟练使用 10 个基础命令完成"建目录、进目录、看文件、移动重命名、删文件"的完整循环；
3. 用相对路径和绝对路径自由移动；
4. 理解为什么教程让你"新开一个终端"。

## 前置知识

已完成 [开发环境搭建](/start/030-DevEnvironmentSetup)，终端能识别 `node`、`python`、`git` 命令。

## 终端、Shell、命令：三个词说清楚

- **终端（terminal）**：那个黑底白字的窗口本体，负责接收键盘输入、显示文字输出；
- **Shell**：窗口里运行的"翻译官"程序，逐行读取你输入的命令并交给操作系统执行。Windows 新版默认是 PowerShell，macOS 默认是 zsh，功能大同小异；
- **命令（command）**：一行一行的指令文本，格式固定为 `命令名 参数 选项`，如 `ls -l /usr` 中 `ls` 是命令名、`-l` 是选项、`/usr` 是参数。

本篇所有命令按"PowerShell 与 zsh 都能用"挑选，差异处会明确标注。

## 打开终端与三件小事

打开方式：Windows 按 `Win+X` 选"终端"，或开始菜单搜 "PowerShell"；macOS 用 `Cmd+空格` 呼出聚焦搜索，输入"终端"回车。

先做三件小事建立体感：

```bash
pwd
# 输出当前所在目录的绝对路径，如 C:\Users\你 或 /Users/你

whoami
# 输出当前用户名

node --version
# 输出 v22.x.x，证明上一篇的安装仍然有效
```

`pwd` 意为 print working directory（打印工作目录）。终端里你永远"站在"某个目录里，所有相对路径都从脚下出发。

## 十个必备命令

以下命令请逐条亲手执行。练习目标：在你上一建立的 `my-code/week1` 目录里，用纯命令完成一整套文件操作。

**1. `ls` / `dir`：列出当前目录内容**（macOS 用 `ls`；Windows PowerShell 两者都行，`dir` 更顺手）

```bash
ls
# 列出文件与文件夹名。ls -la 可看到隐藏文件与详细信息
```

**2. `cd`：切换目录（change directory）——使用频率第一**

```bash
cd Documents/my-code      # 相对路径：从当前位置出发
cd ..                     # 回到上一级
cd ~                      # 回到用户主目录（Windows PowerShell 同样支持）
```

练习路径移动：`cd my-code` 进去，`cd week1` 再进去，`cd ..` 退出来，`pwd` 确认每步位置。**迷路时永远先 `pwd` 看脚下**。

**3. `mkdir`：新建目录**

```bash
mkdir practice
```

**4. `touch` / `New-Item`：新建空文件**（macOS 用 `touch a.txt`；PowerShell 用 `New-Item a.txt`）

**5. `cat` / `Get-Content`：查看文件内容**（把 notes.txt 打印到屏幕上）

**6. `mv` / `Move-Item`：移动或重命名**（一个命令两用途）

```bash
mv a.txt b.txt            # macOS：重命名
Move-Item a.txt b.txt     # PowerShell：重命名
```

**7. `cp` / `Copy-Item`：复制文件**

**8. `rm` / `Remove-Item`：删除**——**危险命令，养成三思习惯**

```bash
rm b.txt                  # macOS：删除文件，不进回收站，不可撤销
Remove-Item b.txt         # PowerShell 同样
```

注意：macOS 的 `rm` 没有"确认"环节，删了就是删了。新手期建议删除前先 `ls` 确认目标，或把文件移进回收站代替删除。

**9. `clear`：清屏**（快捷键 `Ctrl+L` 同效），练习久了屏幕很乱，随时清。

**10. 上下方向键：翻历史命令**。按上箭头逐条回退你输入过的命令，回车重跑。配合 `Tab` 键自动补全文件名（输入 `cd wee` 后按 Tab，自动补成 `cd week1`）——**Tab 补全是效率分水岭，今天就必须用起来**。

## 把十个命令串成一次完整流程

不看上文提示，独立完成以下任务链（每步用 `pwd` 或 `ls` 验证）：

```text
1. 从任意位置回到 my-code 目录
2. 在 my-code 下新建 todo 目录，进入之
3. 在 todo 里新建文件 plan.txt（内容任意）
4. 把 plan.txt 重命名为 plan-v2.txt
5. 复制 plan-v2.txt 为 backup.txt
6. 删除 plan-v2.txt，保留 backup.txt
7. 清屏
```

全部完成后，你已经掌握了日常 80% 的文件操作。图形界面的拖拽、右键重命名、删除，在命令行里就是这十个词。

## 相对路径与绝对路径实战

在 `todo` 目录里做一组对照实验：

```bash
pwd                  # 假设输出 .../my-code/todo
cat plan.txt         # 相对路径：从 todo 出发找
cat ../week1/notes.txt   # .. 先回到 my-code，再进 week1
cat C:\Users\你\Documents\my-code\week1\notes.txt   # 绝对路径（mac 用 / 开头形式）
```

三条 `cat` 结果一致。何时用哪种：**脚本里写相对路径**（项目挪到别的电脑也能跑），**与人交流或报错定位用绝对路径**（无歧义）。

## 为什么教程总说"新开一个终端"

两个原因，理解后能省去大量玄学排查：

1. **PATH 与环境变量在终端启动时读取**。安装软件若修改了 PATH，已开着的旧终端感知不到——所以装完软件必须新开窗口再验证；
2. **终端里运行中的程序会占住窗口**。比如你运行了一个开发服务器，这个窗口就被它占用了，其他命令要另开窗口。

## 常见困惑与报错对照

| 报错/现象 | 原因 | 解法 |
| --- | --- | --- |
| `command not found` | 命令拼错，或未安装/不在 PATH | 检查拼写；新开终端；回看环境搭建篇 |
| `No such file or directory` | 路径写错或站错位置 | 先 `pwd`，再 `ls` 确认目标确实在脚下 |
| `Permission denied` | 无权限操作系统文件 | 检查是否在系统目录操作；回用户目录工作 |
| 命令"卡住"不动 | 程序在运行（如服务器） | 按 `Ctrl+C` 中断它 |
| 中文文件名乱码 | 编码差异 | 避免用中文命名文件与目录（好习惯） |

## 下一步预告

本篇的命令都是"操作文件"，下一篇 [学习方法论](/start/050-LearnHowToLearnProgramming) 会教你把这套动手循环变成可持续的学习系统；之后 [第一门语言体验](/start/060-FirstProgramJavaScript) 里，你将第一次在终端运行自己写的程序。

## 检验清单

- 能不看教程完成"十个命令串成完整流程"任务链；
- 能说出终端、shell、命令三者关系；
- 能解释"新开一个终端"的两个原因；
- 用过 Tab 补全和历史命令，并且打算一直用。
