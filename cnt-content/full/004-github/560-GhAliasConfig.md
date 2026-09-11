---
order: 560
title: gh alias 与 config 命令速查手册
module: 'github'
category: 工具链
difficulty: beginner
description: 操作向导式讲解 gh alias 与 config：手把手教读者配置命令别名、常用设置、Shell 补全与账户状态检查，配以原理讲解、错误对策。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---


## 开篇：把别名想成语音助手的"自定义唤醒词"

智能音箱有个功能：你可以设置自定义词。说"回家模式"，音箱会自动执行"关灯、开空调、放音乐"一整套动作；而不是每次都说"请把灯关掉，然后把空调开到 26 度，再放一首歌"。

**gh 别名（alias）** 就是这个"自定义唤醒词"：你给一长串常用命令起一个短名字，之后敲这个短名字，gh 就会展开成完整命令执行。而 **gh config（配置）** 则像音箱的"系统设置"：默认用哪个音乐平台、音量默认多大——一次性设好，以后每次都生效。

本文采用**操作向导**形式，一步一步带你完成：设置第一个别名 → 带参数的别名 → 管道别名 → 管理别名 → 常用配置 → 补全与状态检查。

---

## 原理先讲清：别名如何工作

### 1.1 别名的本质是"字符串展开"

`gh alias set <别名> <展开内容>` 做的事情很简单：把"别名"记录成"展开内容"。你敲 `gh <别名> 附加参数` 时，gh 先做字符串替换，再执行。

```text
gh alias set pv 'pr view'
gh pv -w 123   # 等价于执行：gh pr view -w 123
```

- 展开内容里没有 `$1`、`$2` 之类的**位置占位符**时，你附加的参数会**追加**到展开命令末尾；
- 展开内容里有 `$1` 时，第一个附加参数会**插入**到 `$1` 的位置。

### 1.2 两种别名类型

| 类型 | 判定方式 | 能力 |
| --- | --- | --- |
| gh 命令别名 | 展开内容不是 `!` 开头、未加 `--shell` | 只能展开成 gh 的子命令调用 |
| shell 别名 | 展开内容以 `!` 开头，或加了 `--shell` | 通过 shell 解释器执行，支持管道、重定向、多命令串联 |

### 1.3 配置文件的存储位置

- 别名与配置默认保存在 `~/.config/gh/` 下（Windows 为 `%AppData%\GitHub CLI\`）；
- 配置支持"按主机"（`--host github.com`）区分，适合同时使用 GitHub.com 与企业版 GitHub Enterprise 的用户。

---

## 操作向导 1：设置你的第一个别名

### 第 1 步：检查是否已登录

```bash
gh auth status
```

### 第 2 步：设置别名

```bash
# 为 "pr view" 设置别名 pv
gh alias set pv "pr view"

# 为 "issue list --label=bugs" 设置别名 bugs
gh alias set bugs "issue list --label=bugs"

# 为 "issue list --assignee @me" 设置别名 mine
gh alias set mine "issue list --assignee @me"
```

### 第 3 步：使用别名

```bash
# 查看 PR 123 并打开浏览器（等价于 gh pr view 123 -w）
gh pv 123 -w

# 列出带 bugs 标签的 issue（等价于 gh issue list --label=bugs）
gh bugs
```

### 第 4 步：验证别名已生效

```bash
gh alias list
```

典型输出：

```text
pv: pr view
bugs: issue list --label=bugs
mine: issue list --assignee @me
```

---

## 操作向导 2：带参数的别名（位置占位符）

不想让附加参数都挤在末尾时，用 `$1`、`$2` 控制插入位置：

```bash
# 定义：查某作者的 epic 标签 issue
# 用法：gh epicsBy vilmibm
# 展开：gh issue list --author="vilmibm" --label="epic"
gh alias set epicsBy 'issue list --author="$1" --label="epic"'

# 定义：多参数别名
# 用法：gh lbl repo bug
# 展开：gh label list -R repo --search bug
gh alias set lbl 'label list -R "$1" --search "$2"'
```

> 注意 Windows 使用提示：命令提示符（cmd）下参数需要用**双引号**包裹，例如 `gh alias set pv "pr view"`；PowerShell 与 bash 中单双引号均可，但展开内容含 `$1` 时建议用单引号，避免 shell 提前展开变量。

---

## 操作向导 3：管道与多命令别名（--shell）

别名展开成 gh 命令还不够，想"先列出来再 grep"怎么办？用 shell 别名：

```bash
# 方式一：展开内容以 ! 开头（隐式 shell 别名）
gh alias set igrep '!gh issue list --label="$1" | grep "$2"'
# 用法：gh igrep epic foo

# 方式二：加 --shell 显式声明（推荐，可读性更好）
gh alias set recent 'run list --limit 5' --shell

# 组合示例：查看最近 10 条 issue 的标题并按关键词过滤
gh alias set myissues '!gh issue list --limit 10 --json title --jq ".[].title" | grep "$1"' --shell
```

带 `--shell` 的别名通过 `sh` 解释器执行，因此**管道、重定向、变量、多条命令用 `;` 串联**都可以：

```bash
# 定义一条"发布并打开"的复合别名
gh alias set ship '!gh release create "$1" --generate-notes && gh release view "$1" --web' --shell
# 用法：gh ship v1.0.0
```

---

## 操作向导 4：管理别名（list / delete / import）

### 4.1 列出与删除

```bash
# 查看所有别名
gh alias list

# 删除单个别名
gh alias delete pv

# 删除后确认
gh alias list
```

### 4.2 从标准输入读取展开内容

展开内容很长、引号很复杂时，可以用 `-` 从标准输入读取，避免引号转义地狱：

```bash
echo "issue list --author=@me --state=open" | gh alias set myopen -
```

### 4.3 批量导入（YAML 文件）

```bash
# aliases.yml 内容示例：
# pv: pr view
# bugs: issue list --label=bugs
# --clobber 表示覆盖已存在的同名别名
gh alias import aliases.yml --clobber
```

导出当前别名（反向操作）可配合 `gh alias list --shell` 生成可复用的 shell 片段。

### 4.4 覆盖已存在别名

```bash
# 默认同名会报错，加 --clobber 覆盖
gh alias set pv "pr view --web" --clobber
```

---

## 操作向导 5：常用配置（gh config）

### 5.1 查看配置

```bash
# 列出全部配置
gh config list

# 查看单项配置
gh config get editor
gh config get git_protocol
gh config get prompt
```

### 5.2 设置常用配置项

```bash
# 默认编辑器：VS Code（--wait 表示关闭文件前不返回，符合 git/gh 的等待语义）
gh config set editor "code --wait"

# 默认编辑器：vim（服务器场景）
gh config set editor vim

# Git 传输协议：ssh（改用 SSH 认证克隆/推送，需已配置 SSH key）
gh config set git_protocol ssh

# 关闭交互式提示（脚本自动化场景）
gh config set prompt disabled

# 关闭分页器（输出直接打印，不进入 less）
gh config set pager ""

# 按主机单独设置（企业版 GitHub Enterprise 场景）
gh config set git_protocol ssh --host github.com
```

### 5.3 核心配置项速查表

| 配置键 | 可选值 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `git_protocol` | `https` / `ssh` | `https` | 克隆与推送使用的 Git 协议 |
| `editor` | 任意编辑器命令 | 系统默认 | gh 打开编辑器编写文本时使用 |
| `prompt` | `enabled` / `disabled` | `enabled` | 是否允许交互式询问 |
| `pager` | 任意分页命令 | less | 长输出的分页器 |
| `browser` | 任意浏览器命令 | 系统默认 | `--web` 打开链接时使用 |
| `spinner` | `enabled` / `disabled` | `enabled` | 是否显示加载动画 |
| `telemetry` | `enabled` / `disabled` / `log` | `enabled` | 遥测数据上报开关 |

> 提示：`telemetry` 是遥测（匿名使用数据上报）开关，注重隐私的用户可执行 `gh config set telemetry disabled` 关闭。

### 5.4 清理缓存

```bash
# 清除 gh 的缓存（如版本检查缓存等）
gh config clear-cache
```

---

## 操作向导 6：Shell 补全与账户状态

### 6.1 生成自动补全脚本

敲命令时按 Tab 自动补全，需要为你的 shell 生成补全脚本：

```bash
# bash
gh completion -s bash > ~/.gh-completion.bash
echo "source ~/.gh-completion.bash" >> ~/.bashrc

# zsh（fpath 方式）
gh completion -s zsh > "${fpath[1]}/_gh"

# fish
gh completion -s fish > ~/.config/fish/completions/gh.fish

# PowerShell（当前会话即时生效）
gh completion -s powershell | Out-String | Invoke-Expression
```

### 6.2 查看账户状态与工作概览

```bash
# 查看登录状态、关联的账号与权限
gh auth status

# 查看当前账号在所有仓库的工作概览（待审查 PR、分配给我的 issue 等）
gh status
```

`gh status` 会把"需要你处理的事情"汇总在一个仪表盘式页面里，适合每天开工第一件事执行。

---

## 完整配置范例：新机器 5 分钟配置脚本

```bash
# 1. 登录
gh auth login

# 2. 基础配置
gh config set editor "code --wait"
gh config set git_protocol ssh

# 3. 常用别名
gh alias set pv "pr view" --clobber
gh alias set co "pr checkout" --clobber
gh alias set mine "issue list --assignee @me" --clobber
gh alias set recent "run list --limit 5" --shell --clobber
gh alias set prs "pr list --author @me" --clobber

# 4. 补全（以 bash 为例）
gh completion -s bash > ~/.gh-completion.bash

# 5. 验收
gh alias list
gh config list
gh status
```

---

## 常见错误与对策

| 新手常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| Windows cmd 下单引号 | 别名内容被截断 | cmd 不识别单引号 | 用双引号：`gh alias set pv "pr view"` |
| 展开内容含 $1 却用双引号 | `$1` 被 shell 提前展开为空 | bash 在 set 时就替换了变量 | 用单引号：`gh alias set x 'issue list --author="$1"'` |
| 别名与内置命令同名 | 报 `alias cannot be set` 或行为不变 | 别名不能覆盖 gh 内置命令 | 换个名字，如 `pv` 而不是 `pr` |
| 忘了 --clobber | 报 `alias pv already exists` | 同名别名已存在 | 加 `--clobber` 覆盖 |
| shell 别名没加 --shell / ! | 管道符被当成 gh 参数 | 未声明 shell 解释 | 展开内容加 `!` 前缀或加 `--shell` |
| 设了 git_protocol ssh 却连不上 | clone/push 报权限错误 | SSH key 未配置或未加 agent | 先配置 SSH key 并 `ssh -T git@github.com` 测试 |
| 补全脚本没生效 | Tab 无补全 | 未 source 补全脚本 | 检查 `.bashrc` 中 source 语句；新开终端生效 |
| 多主机配置混淆 | 配置"没生效" | 设置到了其他 host | 用 `--host github.com` 显式指定主机 |

---

## 一句话记忆

**别名是"自定义唤醒词"（`alias set` 定义、`$1` 插参、`--shell` 解锁管道），配置是"系统设置"（`config set` 改编辑器/协议/分页器），两者都是"配一次、爽很久"的生产力工具。**
