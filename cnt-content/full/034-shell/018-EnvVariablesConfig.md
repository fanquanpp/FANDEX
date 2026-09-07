---
order: 180
title: 环境变量与配置文件
module: 'shell'
category: 工具链
difficulty: beginner
description: 环境变量与配置文件：env/export/PATH、变量扩展、bash 启动文件加载顺序
author: fanquanpp
updated: '2026-09-08'
related:
  - 'shell/019-ScriptDebugging'
  - 'shell/001-ShellBasics'
prerequisites:
  - 'shell/002-CommandLineBasics'
  - 'shell/001-ShellBasics'
---


## 1. 从"入职工牌"说起

### 1.1 环境变量是什么

想象一个新员工入职（进程启动），人事给他发一张**工牌（环境变量）**，上面写着：姓名、部门、工位号。员工到哪都能凭工牌被识别，不用每次重新解释"我是谁"。

**环境变量是"进程运行环境"中的一组键值对，被 Shell 与所有子进程继承**。它解决了"如何把配置传给程序"的问题：程序无需写死路径与配置，读取环境变量即可。

```bash
echo "你好, $USER，你当前在 $PWD"
```

### 1.2 环境变量 vs Shell 变量

| 类型 | 示例 | 能否被子进程继承 |
| --- | --- | --- |
| Shell 变量 | `name="alice"` | 否 |
| 环境变量 | `export NAME="alice"` | 是 |

**要点**：普通变量只在当前 Shell 有效；使用 `export` 后变为环境变量，会被子进程继承。

## 2. 查看与设置

```bash
env                     # 列出当前所有环境变量
printenv PATH           # 查看指定变量（比 echo $PATH 更准确）
echo "$HOME"            # 查看变量值
export EDITOR=vim       # 设置环境变量（当前会话有效）
export JAVA_HOME=/opt/jdk17   # 经典示例
unset JAVA_HOME         # 删除变量
env -i env              # 空环境运行命令（测试纯净环境）
```

**关键认知**：`export` 只影响当前 Shell 及其子进程，**不修改任何配置文件**，终端关闭即失效。想要"永久生效"必须写入配置文件（见第 6 节）。

## 3. PATH：命令查找路径

PATH 是**冒号分隔的目录列表**。执行 `ls` 时，Shell 按 PATH 顺序在各目录中查找可执行文件 `ls`：

```bash
echo "$PATH"
# 输出示例：/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
which ls                # 查看 ls 实际位于哪个目录
command -v node         # 推荐：查看命令路径（兼容性更好）
```

```bash
# 临时添加目录（当前会话）
export PATH="$HOME/bin:$PATH"

# 永久添加：写入 ~/.bashrc 再生效
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**要点**：

- 把自定义目录放在 `$PATH` **前面**优先级更高
- 永久修改必须**追加**到配置文件（不要覆盖原值）
- 修改后用 `source` 或重开终端生效
- PATH 中目录越靠前优先级越高，同名命令以先找到的为准

## 4. 常用特殊变量

| 变量 | 含义 |
| --- | --- |
| `HOME` | 当前用户家目录 |
| `USER` / `LOGNAME` | 当前用户名 |
| `SHELL` | 默认 Shell 路径 |
| `PWD` | 当前工作目录 |
| `OLDPWD` | 上一次所在目录 |
| `LANG` / `LC_ALL` | 系统语言与编码 |
| `TERM` | 终端类型 |
| `PS1` | 命令提示符格式 |
| `$?` | 上一条命令退出码 |
| `$$` | 当前 Shell 的 PID |

```bash
echo "你好, $USER，当前在 $PWD，语言 $LANG"
export LANG=zh_CN.UTF-8   # 设置中文环境
```

**要点**：`LANG` 影响乱码问题——中文显示乱码时优先检查 `LANG`/`LC_ALL` 是否为 UTF-8。`PS1` 定制提示符是"高手外观"的起点，但保持简单更实用。

## 5. 变量扩展语法

Bash 的 `${}` 扩展提供了默认值、必填校验等能力，**是脚本健壮性的基石**：

| 语法 | 含义 | 示例结果 |
| --- | --- | --- |
| `${var:-default}` | 未设置/为空时用 default | `echo ${PORT:-8080}` |
| `${var:=default}` | 未设置/为空时赋值并返回 | `${NAME:="world"}` |
| `${var:?msg}` | 未设置/为空时报错退出 | `${1:?缺少参数}` |
| `${var:+alt}` | 已设置且非空时用 alt | `${DEBUG:+开启}` |
| `${#var}` | 变量长度 | `${#name}` |
| `${var:2:4}` | 子串：从第 3 个字符取 4 个 | `${str:2:4}` |
| `${var//a/b}` | 全局替换 | `${path//\//-}` |
| `${var%%后缀}` | 去掉最长后缀 | `${file%%.tar.gz}` |

```bash
PORT="${PORT:-8080}"           # 未传环境变量时默认 8080
CONFIG="${CONFIG_FILE:?必须设置 CONFIG_FILE}"
name="FANDEX"
echo "${#name}"                # 5
echo "${name/DEX/dev}"         # FANdev（只替换第一处）
```

**要点**：`${var:-default}` 是脚本中最常用的扩展——让脚本"有默认值、可被环境变量覆盖"，这是可配置脚本的基本模式。`${var:?}` 让关键参数缺失时立即失败，避免带空值继续执行。

## 6. 配置文件加载顺序

bash 按"登录/非登录、交互/非交互"四种组合加载不同文件：

| 场景 | 加载顺序 |
| --- | --- |
| 登录 Shell（SSH 登录、`bash -l`） | `/etc/profile` → `~/.bash_profile`（或 `~/.bash_login`、`~/.profile`） |
| 非登录交互 Shell（打开终端） | `~/.bashrc` |
| 非交互 Shell（运行脚本） | 读取 `$BASH_ENV`，否则不读 |
| 退出登录 | `~/.bash_logout` |

```bash
cat ~/.bashrc          # 查看你的交互配置
cat ~/.profile         # 登录配置（macOS 默认）
```

**经典约定**：

- 环境变量放 `~/.profile`（登录时一次性加载）
- 别名与函数放 `~/.bashrc`（每次开终端加载）
- `~/.bash_profile` 通常写成先加载 `~/.bashrc`
- 脚本里设置的 export 不会影响父进程，只有 source 配置文件才能在当前 Shell 生效

## 7. 实践：正确管理环境变量

```bash
# 方案一：临时（当前会话）
export NODE_ENV=production

# 方案二：持久（推荐写入 ~/.bashrc 或 ~/.profile）
echo 'export NODE_ENV=production' >> ~/.bashrc && source ~/.bashrc

# 方案三：单条命令（不污染环境）
NODE_ENV=production node app.js

# 方案四：读取 .env 文件（不泄露到 shell 历史）
set -a; source .env; set +a
```

**四种方案的选择**：

- **方案三"命令前缀式"**只对单条命令生效，是运行一次性任务的首选
- **方案四**是脚本读取 `.env` 的常见手法：`set -a` 让 source 进来的变量自动 export，`set +a` 恢复
- `.env` 文件要加入 `.gitignore`，避免密钥入库（详见 039-engineering-practices《工程实践概述》）

## 8. 常见陷阱

**陷阱一：`export PATH=...` 忘记带上旧值。** `export PATH=/opt/bin` 会把 PATH 覆盖成只有 /opt/bin，连 ls 都找不到。务必写成 `$PATH` 拼接。

**陷阱二：变量赋值等号两侧加空格。** `name = "alice"` 会被解析成执行命令 `name`，应写 `name="alice"`。

**陷阱三：引号内不展开。** `echo '$HOME'` 输出字面量 `$HOME`，单引号内不做变量展开。

**陷阱四：修改配置文件不生效。** 改了 `~/.bashrc` 后未 `source` 也未重开终端。
