---
order: 130
title: 命令行基础：文件与目录操作
module: 'shell'
category: 工具链
difficulty: beginner
description: Shell 命令行基础：文件与目录操作、通配符与帮助系统
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/200-TextProcessingTools'
  - 'shell/150-ShellBasics'
prerequisites:
  - 'shell/140-CrossPlatformCommandLine'
  - 'shell/150-ShellBasics'
---

## 知识点地图

- **知识类别**：命令行基础——目录导航、文件与目录操作（ls/mkdir/cp/mv/rm）、find 查找、通配符、帮助系统。
- **解决什么问题**：第一次面对终端不知道从哪下手；文件操作的命令记不住、不敢用 rm；想批量处理文件但只会一个一个点。
- **什么时候用到**：命令行学习的第一篇；任何文件操作的前置技能——后面的文本处理（shell/200）、脚本编写（shell/150）都建立在这篇的命令词汇上。

与《跨平台命令行详解》（shell/140-CrossPlatformCommandLine）的分工：140 是跨平台的全景对照，本篇是单平台（bash/Linux）的操作正篇——命令细节以本篇为准，平台差异查 140。

## 1. 从"整理房间"说起

### 1.1 命令行的核心思维

想象你要整理一个房间（文件系统）：查看有哪些东西（ls）、建个新柜子（mkdir）、把文件挪进柜子（mv）、不要的扔掉（rm）。

**命令行（终端）就是和操作系统对话的界面**：你输入一条命令，Shell 解释并执行它。学会命令行不是为了背命令，而是掌握"**组合**"思维——用小命令拼出复杂操作。

### 1.2 命令的通用结构

```bash
命令名 [选项] [参数]
```

```bash
ls -l /home/user        # 命令 ls，选项 -l，参数 /home/user
mkdir -p backup/2026    # 选项 -p（自动创建父目录），参数 backup/2026
```

**规则**：

- 选项通常以 `-` 开头（短选项，可合并，如 `ls -la`）
- 长选项以 `--` 开头（如 `ls --all`）
- 每条命令执行后返回退出码：`0` 成功，非 `0` 失败，`echo $?` 查看

## 2. 目录导航

### 2.1 pwd 与 cd

```bash
pwd                     # 打印当前工作目录
cd /etc                 # 切换到 /etc（绝对路径）
cd ..                   # 返回上一级目录
cd ~                    # 回到当前用户家目录
cd -                    # 回到上一次所在目录
cd                      # 不带参数等价于 cd ~
```

绝对路径以 `/` 开头，相对路径以当前目录为起点。`cd -` 在频繁切换两个目录时非常实用。

### 2.2 路径速记符号

| 符号 | 含义 |
| --- | --- |
| `.` | 当前目录 |
| `..` | 上一级目录 |
| `~` | 当前用户家目录 |
| `~user` | 指定用户的家目录 |
| `-` | 上一次所在目录 |

## 3. 文件与目录操作

### 3.1 查看：ls

```bash
ls                      # 列出文件名
ls -l                   # 详细信息：权限、属主、大小、时间
ls -a                   # 包含隐藏文件（以 . 开头）
ls -lh                  # 大小以人类可读格式显示（K/M/G）
ls -lt                  # 按修改时间倒序排列
ls -R src               # 递归列出子目录
```

**读 `ls -l` 的第一列**：如 `-rw-r--r--`：

- 第 1 个字符：`-` 普通文件、`d` 目录、`l` 符号链接
- 后 9 位每 3 位一组：属主、属组、其他用户的 读(r)/写(w)/执行(x) 权限

### 3.2 创建：mkdir 与 touch

```bash
mkdir project           # 创建目录
mkdir -p a/b/c          # 递归创建多级目录，目录已存在也不报错
touch main.sh           # 文件不存在则创建，存在则更新时间戳
```

`-p` 是 mkdir 最常用的选项——脚本中创建目录结构时几乎必用，因为"已存在时不报错"的特性让脚本更健壮。

### 3.3 复制与移动：cp 与 mv

```bash
cp file.txt file.bak            # 复制文件
cp -r src/ dst/                 # 递归复制目录
cp -i file.txt file.bak         # 覆盖前询问（-i 交互确认）
mv old.txt new.txt              # 重命名
mv file.txt dir/                # 移动到目录
mv -i *.log logs/               # 批量移动，冲突时询问
```

- `cp` 复制目录必须加 `-r`（或 `-a` 保留属性）
- `mv` 兼具"重命名"和"移动"两种语义，比 cp 更快（同一文件系统内仅改指针）

### 3.4 删除：rm

```bash
rm file.txt             # 删除文件
rm -r dir/              # 递归删除目录
rm -f file.txt          # 强制删除，不询问
rm -rf dir/             # 递归强制删除（高危组合，慎用）
```

**安全习惯**：

- `rm` 删除不可恢复（无回收站）
- 先 `ls` 确认内容再删
- 变量必须加引号（`rm -rf "$dir"`），防止变量为空时执行 `rm -rf /`

## 4. 查找文件：find

find 按条件递归搜索，是文件查找的"主力军"：

```bash
find . -name "*.log"            # 按文件名匹配（支持通配符，需加引号）
find /var/log -type f           # 只找普通文件（-type d 找目录）
find . -size +10M               # 大于 10MB 的文件（-size -1k 小于 1KB）
find . -mtime -3                # 最近 3 天内修改的文件
find . -name "*.tmp" -delete    # 找到后直接删除
find . -name "*.py" -exec wc -l {} \;   # 对每个结果执行命令，{} 为占位符
```

**要点**：

- `-name` 模式必须加引号，否则通配符会被当前 Shell 先展开
- `-exec ... \;` 的 `\;` 是 find 命令的结束标记，必须转义；`{}` 代表当前匹配的文件路径
- 批量操作前建议先用 `-exec echo {} \;` 预览

## 5. 通配符

Shell 在把参数交给命令前，会先对通配符做"路径名展开"：

| 通配符 | 含义 | 示例 |
| --- | --- | --- |
| `*` | 匹配任意多个字符 | `*.txt` 匹配所有 txt 文件 |
| `?` | 匹配任意单个字符 | `file?.log` 匹配 file1.log |
| `[abc]` | 匹配括号内任一字符 | `file[12].log` 匹配 file1.log、file2.log |
| `[a-z]` | 匹配范围 | `[0-9]*` 匹配数字开头文件 |
| `{a,b}` | 花括号展开，逐个拼接 | `mv f.{txt,bak}` 等价两条命令 |

```bash
ls *.sh                  # 所有 .sh 脚本
rm log-2026-0?.txt       # log-2026-01.txt 到 log-2026-09.txt
touch report_{01..05}.md # 生成 report_01.md ... report_05.md
```

**通配符 ≠ 正则表达式**：通配符用于文件名匹配，`*` 表示"任意长度"；正则中 `*` 表示"前一项重复任意次"。若不需要展开，给模式加引号即可（`grep "*.c" file`）。

正则与通配符最容易混淆的两个符号：

| 你写的 | 通配符（文件名）里它是 | 正则（内容匹配）里它是 |
| :--- | :--- | :--- |
| `*` | 任意长度的任意字符（`*.log`） | 前一个字符重复 0 到多次（`ab*` 匹配 a、ab、abbb） |
| `?` | 任意单个字符（`file?.log`） | 前一个字符重复 0 或 1 次（`colou?r`） |

判断口诀：**命令拿到引号内模式去匹配文件名的（find -name、ls 展开），是通配符；去匹配文件内容的（grep/sed/awk），是正则**。同一个 `*.log` 写进 `find . -name "*.log"` 是通配符、写进 `grep --include="*.log" 关键词` 也是通配符（include 过滤的是文件名），但 `grep "log.*error"` 就是正则——看它过滤的是名字还是内容。正则语法与捕获组的系统讲解见《文本处理三剑客》（shell/200-TextProcessingTools）。

## 6. 帮助系统：man 与 --help

```bash
ls --help                # 快速查看选项摘要（所有 GNU 工具均支持）
man ls                   # 查看完整手册（q 退出，/ 搜索，n 跳到下一处）
man -k archive           # 关键字搜索手册页（等价于 apropos）
info coreutils           # info 格式文档，比 man 更详细
```

**要点**：`man` 手册分为若干节（如 1 命令、5 配置文件、8 系统管理命令），`man 5 crontab` 可查看特定节的文档。`--help` 适合快速回忆选项，`man` 适合系统学习。

## 7. 提高效率的小技巧

```bash
history                  # 查看命令历史
!!                       # 重复上一条命令
!100                     # 执行历史中第 100 条
Ctrl + R                 # 反向搜索历史命令
Tab                      # 命令与文件名自动补全（连按两次列出所有候选）
Ctrl + C                 # 终止当前命令
Ctrl + L                 # 清屏（等价于 clear）
```

**自动补全（Tab）是命令行效率的核心**：路径、命令、选项均可补全。习惯用 `Ctrl + R` 搜索历史，比重新输入快得多。

## 8. 常见陷阱

**陷阱一：目录名含空格。** `cd My Documents` 会被拆成两个参数，必须写成 `cd "My Documents"` 或 `cd My\ Documents`。

**陷阱二：`rm -rf` 拼上空变量。** `rm -rf $DIR` 中 `$DIR` 为空时只是缺参数报错尚可补救；真正的灾难在拼接场景——`rm -rf /$SUB` 或 `rm -rf "$DIR/"` 遇到空变量会剩下 `rm -rf /`。始终写 `rm -rf "${DIR:?DIR 未设置}"`，并在删除前 `ls` 预览。

**陷阱三：通配符无匹配。** `ls *.log` 在没有 log 文件时会原样输出 `*.log` 并报错，可用 `nullglob` 选项或先检查。

**陷阱四：`find -exec` 忘记 `\;`。** 缺少结束符会立即报语法错误。

## 9. 动手实践

先只读任务与提示，自己敲完再展开参考命令。

**任务一：整理一个乱目录。** 新建 `mess/` 目录并乱放几类文件（`.txt`、`.md`、`.log` 各若干，含一个带空格的文件名），只用命令行把它们按扩展名分进 `txt/`、`md/`、`log/` 三个子目录——含空格的文件名必须完好无损。

提示：批量移动用通配符；含空格文件名单独验证 `mv` 的引号行为（先不加引号看报错，再加引号修复）。

<details>
<summary>任务一参考命令</summary>

```bash
mkdir -p mess/{txt,md,log} && cd mess
touch a.txt b.md c.log "my notes.txt"

mv *.txt txt/          # 通配符展开，逐个移动
mv *.md md/
mv *.log log/
mv "my notes.txt" txt/ # 不加引号会被拆成 mv my notes.txt 两个源一个目标，报错
```

自查：`ls txt/` 确认 4 个文件（含 my notes.txt）都在。这题验证两件事：通配符按「匹配到的文件列表」逐个交给 mv（所以不会把多个源挤成一个目标）；引号是含空格文件名的唯一防线。
</details>

**任务二：用 find 批量改名。** 在 `mess/` 里把所有 `.log` 文件改名为 `.log.bak`（不许手敲每个文件名），要求先预览将执行的改名清单、再真正执行。

提示：`find -exec sh -c '...' _ {} \;` 可以对每个文件跑一小段逻辑；预览的惯用法是把 mv 换成 echo mv。

<details>
<summary>任务二参考命令</summary>

```bash
cd mess
# 第一步：预览
find . -name "*.log" -exec echo mv {} {}.bak \;
# 第二步：执行
find . -name "*.log" -exec mv {} {}.bak \;
```

自查：`{}.bak` 利用了 find 的占位符拼接（file.log 变 file.log.bak）；预览与执行只差一个 echo——这是 find 批量操作的标准安全姿势。另一种写法是 `for f in *.log; do mv "$f" "$f.bak"; done`，文件数少时更直观；find 的优势是天然递归子目录。
</details>

**任务三：通配符与正则辨析。** 判断下面四条命令里的模式分别按什么规则匹配、各匹配什么：

```bash
ls *.txt
grep "a.*e" words.txt
find . -name "file?.log"
grep "file?.log" list.txt
```

提示：先分「匹配文件名还是文件内容」，再套本篇第 5 节的对照表。

<details>
<summary>任务三参考答案</summary>

1. `ls *.txt`：通配符匹配文件名——所有 .txt 结尾的文件。
2. `grep "a.*e"`：正则匹配内容——含「a 后面任意字符任意次再出现 e」的行（如 apple、arena），`.*` 在正则里才是「任意串」。
3. `find -name "file?.log"`：通配符——file1.log、fileA.log 等恰好一个字符的变体。
4. `grep "file?.log"`：正则——`?` 是「前一个字符 e 重复 0 或 1 次」，所以匹配 fil.log 或 file.log 字样的行（注意 . 在正则里是任意字符），跟「file 开头 .log 结尾的文件名」完全是两回事。辨析的意义：第 4 条几乎总是写错了的意图——想搜文件名文本要用 `grep -F "file?.log"`（固定字符串）或转义。
</details>
