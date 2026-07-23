---
title: Linux与AI
description: 'Linux 文件系统导航，文件权限管理，apt 包管理，用户与 sudo，进程与 systemd，磁盘空间，网络传输，tmux 会话'
module: 'ai-engineering'
difficulty: beginner
tags:
  - Linux
  - Ubuntu
  - 命令行
  - 文件系统
  - 权限
  - WSL2
related:
  - 'ai-engineering/Jupyter笔记本'
  - 'ai-engineering/KNN与距离度量'
  - 'ai-engineering/LLM-API负载测试'
  - 'ai-engineering/LLM-FinOps单位经济学'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# Linux 与 AI

> 大多数 AI 运行在 Linux 上。你需要知道足够多才不会卡住。

**类型：** 学习
**语言：** --
**前置条件：** 阶段 0，第 01 课
**预计时间：** ~30 分钟

## 学习目标

- 从命令行导航 Linux 文件系统并执行基本文件操作
- 使用 `chmod` 和 `chown` 管理文件权限，解决 "Permission denied" 错误
- 使用 `apt` 安装系统包，为 AI 工作配置全新的 GPU 服务器
- 识别在远程机器上工作时容易让开发者困惑的 macOS 到 Linux 差异

## 问题所在

你在 macOS 或 Windows 上开发。但当你 SSH 到云 GPU 服务器、租用 Lambda 实例或启动 EC2 机器时，你进入的是 Ubuntu。终端是你唯一的界面。没有 Finder，没有 Explorer，没有 GUI。如果你不能从命令行导航文件系统、安装包和管理进程，你就会在支付空闲 GPU 费用的同时搜索"如何在 Linux 中解压文件"。

这是一份生存指南。它涵盖了在远程 Linux 机器上进行 AI 工作所需的一切。仅此而已。

## 文件系统布局

Linux 将所有内容组织在单一根目录 `/` 下。没有 `C:\` 或 `/Volumes`。你实际会接触的目录：

```mermaid
graph TD
    root["/"] --> home["home/your-username/<br/>你的文件 — 克隆仓库，运行训练"]
    root --> tmp["tmp/<br/>临时文件，重启时清除"]
    root --> usr["usr/<br/>系统程序和库"]
    root --> etc["etc/<br/>配置文件"]
    root --> varlog["var/log/<br/>日志 — 出问题时查看"]
    root --> mnt["mnt/ 或 /media/<br/>外部驱动器和卷"]
    root --> proc["proc/ 和 /sys/<br/>虚拟文件 — 内核和硬件信息"]
```

你的主目录是 `~` 或 `/home/your-username`。你做的几乎所有事情都在这里。

## 基本命令

这 15 个命令覆盖了你在远程 GPU 服务器上 95% 的工作。

### 移动

```bash
pwd                         # 我在哪里？
ls                          # 这里有什么？
ls -la                      # 这里有什么，包括隐藏文件和详细信息？
cd /path/to/dir             # 去那里
cd ~                        # 回家
cd ..                       # 上一级
```

### 文件和目录

```bash
mkdir my-project            # 创建目录
mkdir -p a/b/c              # 一次创建嵌套目录

cp file.txt backup.txt      # 复制文件
cp -r src/ src-backup/      # 复制目录（递归）

mv old.txt new.txt          # 重命名文件
mv file.txt /tmp/           # 移动文件

rm file.txt                 # 删除文件（没有回收站，直接没了）
rm -rf my-dir/              # 删除目录及其中的所有内容
```

`rm -rf` 是永久的。没有撤销。按回车前仔细检查路径。

### 读取文件

```bash
cat file.txt                # 打印整个文件
head -20 file.txt           # 前 20 行
tail -20 file.txt           # 后 20 行
tail -f log.txt             # 实时跟踪日志文件（Ctrl+C 停止）
less file.txt               # 滚动浏览文件（q 退出）
```

### 搜索

```bash
grep "error" training.log           # 查找包含 "error" 的行
grep -r "learning_rate" .           # 搜索当前目录下所有文件
grep -i "cuda" config.yaml          # 不区分大小写搜索

find . -name "*.py"                 # 查找当前目录下所有 Python 文件
find . -name "*.ckpt" -size +1G     # 查找大于 1GB 的检查点文件
```

## 权限

Linux 中的每个文件都有所有者和权限位。当脚本无法执行或你无法写入目录时，就会遇到这个问题。

```bash
ls -l train.py
# -rwxr-xr-- 1 user group 2048 Mar 19 10:00 train.py
#  ^^^             所有者权限：读、写、执行
#     ^^^          组权限：读、执行
#        ^^        其他人：只读
```

常见修复：

```bash
chmod +x train.sh           # 使脚本可执行
chmod 755 deploy.sh         # 所有者：全部，其他人：读+执行
chmod 644 config.yaml       # 所有者：读+写，其他人：只读

chown user:group file.txt   # 更改文件所有者（需要 sudo）
```

当出现 "Permission denied" 时，几乎总是权限问题。`chmod +x` 或 `sudo` 能修复大多数情况。

## 包管理（apt）

Ubuntu 使用 `apt`。这是你安装系统级软件的方式。

```bash
sudo apt update             # 刷新包列表（始终先做这个）
sudo apt install -y htop    # 安装包（-y 跳过确认）
sudo apt install -y build-essential  # C 编译器, make 等。许多 Python 包需要
sudo apt install -y tmux    # 终端多路复用器（断开后保持会话）

apt list --installed        # 安装了什么？
sudo apt remove htop        # 卸载
```

全新 GPU 服务器上常安装的包：

```bash
sudo apt update && sudo apt install -y \
    build-essential \
    git \
    curl \
    wget \
    tmux \
    htop \
    unzip \
    python3-venv
```

## 用户和 sudo

你通常以普通用户登录。某些操作需要 root（管理员）权限。

```bash
whoami                      # 我是什么用户？
sudo command                # 以 root 身份运行单个命令
sudo su                     # 成为 root（exit 返回，谨慎使用）
```

在云 GPU 实例上，你通常是唯一用户并且已经有 sudo 权限。不要以 root 运行一切。只在需要时使用 sudo。

## 进程和 systemd

当你的训练卡住，或你需要检查什么在运行：

```bash
htop                        # 交互式进程查看器（q 退出）
ps aux | grep python        # 查找运行中的 Python 进程
kill 12345                  # 优雅停止 PID 12345 的进程
kill -9 12345               # 强制终止（优雅停止无效时使用）
nvidia-smi                  # GPU 进程和内存使用
```

systemd 管理服务（后台守护进程）。如果你运行推理服务器，会用到它：

```bash
sudo systemctl start nginx          # 启动服务
sudo systemctl stop nginx           # 停止服务
sudo systemctl restart nginx        # 重启服务
sudo systemctl status nginx         # 检查是否在运行
sudo systemctl enable nginx         # 开机自动启动
```

## 磁盘空间

GPU 服务器通常磁盘空间有限。模型和数据集很快填满。

```bash
df -h                       # 所有挂载驱动器的磁盘使用
df -h /home                 # /home 的磁盘使用

du -sh *                    # 当前目录中每项的大小
du -sh ~/.cache             # 缓存大小（pip, huggingface 模型存在这里）
du -sh /data/checkpoints/   # 检查检查点有多大

# 找出最大的空间占用
du -h --max-depth=1 / 2>/dev/null | sort -hr | head -20
```

常见空间节省方法：

```bash
# 清除 pip 缓存
pip cache purge

# 清除 apt 缓存
sudo apt clean

# 删除不需要的旧检查点
rm -rf checkpoints/epoch_01/ checkpoints/epoch_02/
```

## 网络

你将从命令行下载模型、传输文件和调用 API。

```bash
# 下载文件
wget https://example.com/model.bin                   # 下载文件
curl -O https://example.com/data.tar.gz              # 用 curl 做同样的事
curl -s https://api.example.com/health | python3 -m json.tool  # 调用 API，美化 JSON 输出

# 在机器之间传输文件
scp model.bin user@remote:/data/                     # 复制文件到远程机器
scp user@remote:/data/results.csv .                  # 从远程复制文件到本地
scp -r user@remote:/data/checkpoints/ ./local-dir/   # 复制目录

# 同步目录（比 scp 更快，支持断点续传）
rsync -avz --progress ./data/ user@remote:/data/
rsync -avz --progress user@remote:/results/ ./results/
```

对于大文件传输，使用 `rsync` 而不是 `scp`。它只传输变更的字节，并处理中断的连接。

## tmux：保持会话活跃

当你 SSH 到远程服务器时，合上笔记本会终止你的训练运行。tmux 防止这种情况。

```bash
tmux new -s train           # 启动名为 "train" 的新会话
# ... 启动训练，然后：
# Ctrl+B, 然后 D            # 分离（训练继续运行）

tmux ls                     # 列出会话
tmux attach -t train        # 重新附着到会话

# 在 tmux 内：
# Ctrl+B, 然后 %            # 垂直分割面板
# Ctrl+B, 然后 "            # 水平分割面板
# Ctrl+B, 然后方向键   # 在面板之间切换
```

始终在 tmux 内运行长时间训练任务。始终如此。

## Windows 用户使用 WSL2

如果你使用 Windows，WSL2 给你一个真正的 Linux 环境，无需双系统。

```bash
# 在 PowerShell（管理员）中
wsl --install -d Ubuntu-24.04

# 重启后，从开始菜单打开 Ubuntu
sudo apt update && sudo apt upgrade -y
```

WSL2 运行真正的 Linux 内核。本课程的所有内容都可以在其中工作。从 WSL 内部，你的 Windows 文件在 `/mnt/c/Users/YourName/`。

GPU 直通在 Windows 端安装 NVIDIA 驱动后即可工作。安装 Windows NVIDIA 驱动（不是 Linux 的），CUDA 就可以在 WSL2 内使用。

## 注意事项：macOS 到 Linux

从 macOS 转来时容易踩的坑：

| macOS                     | Linux                          | 注意                                                                                                                                           |
| ------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `brew install`            | `sudo apt install`             | 有时包名不同。`brew install htop` vs `sudo apt install htop` 效果相同，但 `brew install readline` vs `sudo apt install libreadline-dev` 不同。 |
| `open file.txt`           | `xdg-open file.txt`            | 但远程服务器上没有 GUI。使用 `cat` 或 `less`。                                                                                                 |
| `pbcopy` / `pbpaste`      | 不可用                         | SSH 下没有剪贴板管道。                                                                                                                         |
| `~/.zshrc`                | `~/.bashrc`                    | macOS 默认 zsh。大多数 Linux 服务器使用 bash。                                                                                                 |
| `/opt/homebrew/`          | `/usr/bin/`, `/usr/local/bin/` | 二进制文件在不同位置。                                                                                                                         |
| `sed -i '' 's/a/b/' file` | `sed -i 's/a/b/' file`         | macOS sed 在 `-i` 后需要空字符串。Linux 不需要。                                                                                               |
| 不区分大小写的文件系统    | 区分大小写的文件系统           | `Model.py` 和 `model.py` 在 Linux 上是两个不同的文件。                                                                                         |
| 行尾 `\n`                 | 行尾 `\n`                      | 相同。但 Windows 使用 `\r\n`，会破坏 bash 脚本。运行 `dos2unix` 修复。                                                                         |

## 快速参考卡

```
导航：     pwd, ls, cd, find
文件：     cp, mv, rm, mkdir, cat, head, tail, less
搜索：     grep, find
权限：     chmod, chown, sudo
包管理：   apt update, apt install
进程：     htop, ps, kill, nvidia-smi
服务：     systemctl start/stop/restart/status
磁盘：     df -h, du -sh
网络：     curl, wget, scp, rsync
会话：     tmux new/attach/detach
```

## 练习

1. SSH 到任何 Linux 机器（或打开 WSL2），导航到你的主目录。创建项目文件夹，用 `touch` 创建三个空文件，然后用 `ls -la` 列出它们。
2. 用 apt 安装 `htop`，运行它，找出使用最多内存的进程。
3. 启动 tmux 会话，在其中运行 `sleep 300`，分离，列出会话，再重新附着。
4. 使用 `df -h` 检查可用磁盘空间，然后用 `du -sh ~/.cache/*` 找出缓存中什么占用了空间。
5. 使用 `scp` 将文件从本地机器传输到远程机器，然后用 `rsync` 做同样的传输，比较体验。
