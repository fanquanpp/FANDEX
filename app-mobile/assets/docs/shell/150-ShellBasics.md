---
order: 160
title: Shell 脚本编程基础
module: 'shell'
category: 工具链
difficulty: beginner
description: Shell 脚本编程基础：命令、变量、管道、展开与分词的时机模型、case 与数组、控制流、严格模式与工程实践
author: fanquanpp
updated: '2026-10-11'
related:
  - 'shell/140-CrossPlatformCommandLine'
  - 'shell/160-EnvVariablesConfig'
  - 'shell/180-FunctionsArguments'
  - 'shell/190-ScriptDebugging'
  - 'shell/170-PipeRedirect'
  - 'devops/140-CICDPipeline'
prerequisites:
  - 'shell/140-CrossPlatformCommandLine'
---


## 1. 从"点菜"说起：Shell 是什么

### 1.1 一个餐厅的类比

想象你去一家餐厅（操作系统），你想让服务员（Shell）帮你做一件事：

- 你说："来一份红烧肉"（输入命令）
- 服务员去后厨让厨师做（调用系统程序）
- 服务员把菜端上来（返回结果）

**Shell 就是操作系统的"服务员"**：它读取你输入的命令，调用系统程序执行，并把结果返回给你。它既是**交互式工具**（你在终端里敲命令），也是**脚本语言**（把命令写进文件批量执行）。

多数 Linux 发行版默认 bash，macOS 自 10.15（2019）起默认 zsh；Windows 的 PowerShell 是另一套体系，但 Git Bash/WSL 可以运行 bash 脚本。

### 1.2 Shell 脚本的价值：做"胶水"

Shell 脚本的本质是**胶水**：把已有的小工具（ls、grep、awk、curl）串成自动化流程。

为什么需要 Shell 脚本？因为现实工作中有大量重复操作：

- 部署：拉代码 → 构建 → 重启服务
- 监控：检查日志 → 统计 → 告警
- 数据：下载 → 处理 → 汇总

这些操作一步步手敲会累死，写成脚本后一条命令搞定。**Shell 是运维与后端开发者的基本功**。

### 1.3 本章目标

本章是 Shell 的"第一课"，带你建立完整的基础框架。学完后你应该能：

1. 理解命令、变量、管道、控制流四大基础；
2. 说清"一行命令被执行前，Shell 对它做了什么"（展开与分词的时机模型）——这是所有引号类 Bug 的总根源；
3. 写出安全、健壮的简单脚本；
4. 知道"生产脚本必须做什么"（严格模式）。

## 2. 基本命令与语法

### 2.1 命令结构

```bash
命令名 [选项] [参数]
```

示例：

```bash
ls -la /home/user        # 列出目录详细信息
grep -rn "TODO" ./src    # 递归搜索文本
curl -s https://example.com  # 请求网页
```

每条命令执行后返回**退出码（exit code）**：0 表示成功，非 0 表示失败。`$?` 保存上一条命令的退出码。

```bash
ls /tmp
echo "退出码: $?"    # 0 = 成功
ls /不存在的目录
echo "退出码: $?"    # 2 = 失败
```

### 2.2 变量

```bash
#!/bin/bash
# 变量赋值：等号两侧不能有空格
name="FANDEX"
count=42

# 使用变量：$name 或 ${name}
echo "项目名称: $name"
echo "计数: ${count}"

# 命令替换：把命令输出存入变量
files=$(ls | wc -l)
echo "文件数: $files"
```

**规则**：

- 等号两侧**不能有空格**（`name = "alice"` 会被当成执行命令）
- 双引号内 `$var` 会展开，单引号内不会
- `$(...)` 是命令替换的现代写法（反引号已过时）

`${var:-默认值}`、`${var:?报错}` 这类参数扩展的完整速查见[环境变量与配置文件](/shell/160-EnvVariablesConfig)第 5 节。

### 2.3 管道与重定向

```bash
# 管道：把前一个命令的输出作为后一个命令的输入
cat access.log | grep "ERROR" | sort | uniq -c | sort -rn

# 重定向：写入文件 / 追加 / 从文件读
echo "hello" > out.txt
echo "world" >> out.txt
wc -l < out.txt

# 错误流合并
command > all.log 2>&1
```

**管道是 Shell 最强大的能力**：无需中间文件，数据在进程间流动。`2>&1` 把标准错误合并到标准输出，便于统一记录日志。三条流与管道的系统讲法见[管道与重定向](/shell/170-PipeRedirect)。

### 2.4 第一个脚本

```bash
#!/bin/bash
# 输出 "Hello, World!"
echo "Hello, World!"

# 保存为 hello.sh 后：
chmod +x hello.sh   # 添加执行权限
./hello.sh          # 执行
```

## 3. 展开与分词：一行命令执行前发生了什么

这是整章最重要的心智模型。你以为 Shell "拿到一行文本就执行"，实际上在按下回车到命令启动之间，它按固定顺序做了一串**文本变换**：

1. **变量（参数）展开**：`$var` 替换成它的值；
2. **分词（word splitting）**：把展开结果按空白**重新切成多个词**；
3. **路径名展开（glob）**：`*.log` 这类通配符替换成匹配的文件名列表（详见[命令行基础](/shell/130-CommandLineBasics)第 5 节）；
4. 执行。

**90% 的"引号类"事故都发生在第 2 步**。亲手做一个不会损坏任何文件的实验：

```bash
f="report final.pdf"
printf '[%s]\n' $f        # 不加引号
printf '[%s]\n' "$f"      # 加双引号
```

```text
[report]
[final.pdf]      ← 第 1 条输出：一个变量被分词成了两个参数
[report final.pdf]   ← 第 2 条输出：双引号关掉了分词，参数保持完整
```

读法：`$f` 展开成 `report final.pdf` 后，**因为不加引号，空白处被重新切词**，printf 收到两个参数；加了双引号，展开后的结果被保护成一个整体。由此得到贯穿整个 Shell 生涯的一条纪律：

> **变量展开处永远套双引号：`"$f"`。** 单引号是另一回事——它连展开都关掉（`'$f'` 就是字面的 `$f`），用在"内容不需要变化"的场合。

这条纪律的直接推论解释了大量事故：

- `rm $file` 在文件名含空格时变成 `rm report final.pdf` 两个目标——防不住的事故先于事故存在；
- `[ $n = 1 ]` 在 `n` 为空时只剩 `[ = 1 ]`，直接语法错误；写成 `[ "$n" = 1 ]` 永远安全；
- 循环 `for x in $(ls)` 会把含空格的文件名拆散——按行处理文件的正确写法见 4.2。

反过来也要知道边界：**引号不是万能盾牌**。`"$@"`、数组（4.3）与 `find -exec` 才是"参数里有任意字符"时的完全体；而密码、Token 这类值在赋值处就该进环境变量或 `.env`，靠引号保护明文属于安慰剂。

## 4. 控制流

### 4.1 条件判断

```bash
#!/bin/bash
file="config.yaml"

if [ -f "$file" ]; then
    echo "文件存在"
elif [ -d "$file" ]; then
    echo "是目录"
else
    echo "不存在"
fi
```

**test 表达式速查**：

| 表达式 | 含义 |
| :--- | :--- |
| `-f 文件` | 文件存在且是普通文件 |
| `-d 目录` | 是目录 |
| `-z 字符串` | 字符串为空 |
| `-n 字符串` | 字符串非空 |
| `-eq / -lt / -gt` | 数字相等 / 小于 / 大于 |

**要点**：`[ ... ]` 是 `test` 命令的语法糖，`[[ ... ]]` 是 bash 扩展（支持正则与更安全比较）。变量必须加引号防止空值导致语法错误（第 3 节刚解释了为什么）。

### 4.2 循环

```bash
#!/bin/bash
# for 循环：遍历文件
for file in *.log; do
    echo "处理 $file"
done

# 数字循环
for i in $(seq 1 5); do
    echo "第 $i 次"
done

# while 循环：读取文件每一行
while IFS= read -r line; do
    echo "$line"
done < data.txt
```

**要点**：`IFS=` 防止行首尾空白被吃掉，`-r` 防止反斜杠转义——这是读取文件行的标准姿势。glob 遍历（`*.log`）优于 `for x in $(ls)`：前者在 Shell 内部展开、每个文件名天然是一个词，不受第 3 节分词之害。

### 4.3 case：分支选择的专用工具

多个 `elif` 比较同一个值时，`case` 更清晰，且支持模式匹配：

```bash
#!/bin/bash
read -rp "请输入操作 [backup/restore/quit]: " op

case "$op" in
    backup)  echo "开始备份" ;;
    restore) echo "开始恢复" ;;
    q|quit)  echo "再见"; exit 0 ;;
    *)       echo "未知操作: $op"; exit 1 ;;
esac
```

**要点**：

- `模式)` 开头、`;;` 结尾，`|` 连接多个模式（`q|quit`），`*)` 兜底——等价于其他语言的 switch default；
- 模式支持通配符：`*.sh)` 匹配所有以 .sh 结尾的值，`??)` 匹配两个字符——这让 case 成为解析"选项/子命令"的主力（getopts 的配套分支、git 风格子命令都靠它）；
- 变量记得套引号：`case "$op" in`——第 3 节的纪律对 case 同样适用。

### 4.4 数组与算术：bash 不止字符串变量

```bash
#!/bin/bash
# 数组：圆括号赋值，下标从 0 开始
targets=("web-1" "db main" "cache")
echo "共 ${#targets[@]} 个目标"
echo "第 2 个: ${targets[1]}"      # db main：引用同样要套双引号
for t in "${targets[@]}"; do       # "${arr[@]}" 是数组版 "$@"：逐元素、不拆散空格
    echo "部署 $t"
done

# 算术：$(( )) 里不需要 $ 前缀
count=3
count=$((count + 1))
echo "第 $count 次部署, 剩余 $((5 - count)) 次"
```

**要点**：

- 数组解决"一个变量装一组值"：比空格拼接字符串可靠——第 3 节的分词陷阱在字符串拼接方案里无解；
- `"${targets[@]}"` 的双引号是数组版的 `"$@"` 纪律（180 篇有 `"$@"` 与 `$*` 的完整对照）；
- `$(( ))` 是整数算术，括号内变量不用 `$`；需要小数时用 `awk`（210 篇）。

### 4.5 函数（预告）

```bash
#!/bin/bash

# 函数定义
log() {
    local level="$1"
    shift
    echo "[$level] $*"
}

# 调用
log INFO "构建开始"
log ERROR "构建失败"
```

**要点**：`$1`、`$2` 是位置参数，`$*` 是所有参数；`local` 声明局部变量，避免污染全局。函数的返回值、`"$@"`、getopts 参数解析是[函数与参数处理](/shell/180-FunctionsArguments)的完整专题。

## 5. 严格模式与错误处理

### 5.1 为什么需要严格模式

Shell 脚本默认"**宽容**"：命令失败不报错、未定义变量当空值、管道只看最后一段结果。这种宽容在生产环境是灾难——脚本会带着错误状态继续执行，产生半成品数据。

### 5.2 set -euo pipefail

**生产脚本必须在开头启用严格模式**：

```bash
#!/bin/bash
set -euo pipefail
```

| 选项 | 行为 |
| :--- | :--- |
| `set -e` | 任何命令失败立即退出脚本（避免"失败后继续执行"的连锁错误） |
| `set -u` | 使用未定义变量即报错（捕获拼写错误） |
| `set -o pipefail` | 管道中任意命令失败，整体视为失败（默认只看最后一个命令） |

### 5.3 trap 清理

```bash
#!/bin/bash
set -euo pipefail

cleanup() {
    echo "清理临时文件..."
    rm -f /tmp/tmp.$$
}
trap cleanup EXIT
```

`trap ... EXIT` 保证脚本无论正常结束还是出错退出都会执行清理函数——这是"无论成败都要清理"的标准姿势。

`set -e` 的例外场景、trap 事件表与 shellcheck 静态检查是[脚本调试与严格模式](/shell/190-ScriptDebugging)的完整专题。

## 6. 常用文本处理（概览）

### 6.1 grep：行匹配

```bash
grep -i "error" log.txt        # 忽略大小写
grep -v "^#" config.conf       # 排除注释行
grep -E "err|warn" log.txt     # 扩展正则，匹配多个词
```

### 6.2 sed：流编辑

```bash
sed -i 's/old/new/g' file.txt   # 全局替换并写回
sed -n '10,20p' file.txt        # 打印第 10-20 行
```

### 6.3 awk：列处理与统计

```bash
awk '{print $1, $3}' data.txt   # 打印第 1 列和第 3 列
awk 'END {print NR}' file.txt   # 统计行数
awk '{sum += $2} END {print sum}' data.txt  # 按第 2 列求和
```

**详细用法见本模块《文本处理三剑客》**。

## 7. 工程实践：部署脚本模板

把以上知识组合成第一个"生产级"脚本：

```bash
#!/bin/bash
set -euo pipefail

APP_DIR="/opt/myapp"
VERSION="${1:?请提供版本号}"

echo "开始部署 v${VERSION}"

# 1. 拉取代码
git -C "$APP_DIR" fetch --tags
git -C "$APP_DIR" checkout "v${VERSION}"

# 2. 构建
(cd "$APP_DIR" && pnpm install --frozen-lockfile && pnpm build)

# 3. 重启服务（systemd 示例）
systemctl restart myapp
systemctl --no-pager status myapp

echo "部署完成"
```

**要点**：

- `${1:?...}` 在缺少参数时直接报错退出
- `(cd ... && ...)` 在子 shell 中切换目录，不影响当前脚本
- 每步失败立即退出（set -e），不留半成品状态

## 8. 常见陷阱

**陷阱一：忘记引号。** `rm $file` 在文件名含空格时被拆成多个参数。所有变量加双引号。根源是第 3 节的分词步骤——理解了时机，这条就不用背了。

**陷阱二：不用严格模式。** 命令失败继续执行，产生半成品状态。生产脚本必须 `set -euo pipefail`。

**陷阱三：`rm -rf` 误删。** 删除前先 `echo` 预览，使用 `set -u` 防止空变量导致 `rm -rf /`。

**陷阱四：脚本不可移植。** 避免 GNU 专属选项，或用 bash 明确 shebang。

**陷阱五：忽略退出码。** `command || { echo "失败"; exit 1; }` 显式处理。

**陷阱六：`for x in $(ls)` 处理文件。** 受分词与 glob 双重影响，含空格文件名必炸；遍历文件用 glob（`*.log`）或 `find ... -exec`。

## 9. 动手实践：遮代码自检

先只读任务与提示，自己写完再看参考实现。

**任务**：写一个 `backup.sh`，满足——

1. 用法：`./backup.sh <源目录> <备份根目录>`，缺参数时报错退出（退出码 1）；
2. 备份到 `<备份根目录>/backup-<时间戳>/`，时间戳格式 `20261005-1530`；
3. 源目录不存在时报错退出；备份完成后打印"备份了 N 个文件"；
4. 开头带严格模式；所有变量展开处都按第 3 节的纪律处理。

**提示**：时间戳用 `date "+%Y%m%d-%H%M"`（`date "+..."` 的格式串建议套单引号或双引号——想想为什么 `%` 不需要、但整个串加引号更稳）；"N 个文件"用 `find "$src" -type f | wc -l`；第 4 条就是让 `"$src"` 这类展开全部带引号。

**参考实现**（先自己写完再看）：

```bash
#!/bin/bash
set -euo pipefail

src="${1:?用法: $0 <源目录> <备份根目录>}"
dest_root="${2:?用法: $0 <源目录> <备份根目录>}"

if [ ! -d "$src" ]; then
    echo "错误: 源目录不存在: $src" >&2
    exit 1
fi

stamp=$(date "+%Y%m%d-%H%M")
dest="$dest_root/backup-$stamp"
mkdir -p "$dest"
cp -r "$src"/. "$dest"/            # /. 复制隐藏文件也带上

count=$(find "$src" -type f | wc -l)
echo "备份完成: $dest（备份了 $count 个文件）"
```

要点自查：

- `${1:?...}` 一次性满足第 1 条（缺参数时报错并退出）；
- 错误消息写到 `>&2`（标准错误）：这是"日志走 stderr、数据走 stdout"的纪律，180 篇讲输出捕获时会看到为什么；
- 全部展开处有双引号：`"$src"/.` 在路径含空格时依然正确；
- `find | wc -l` 在文件名含换行时会数错——极端场景的正确解是 `find ... -printf '.' | wc -c`，知道边界即可，日常路径不必过度设计。

**任务二（口头自检）**：说出下面两段的行为差异，并解释各发生在第 3 节流程的哪一步：

```bash
v="*.sh"
echo $v      # A
echo "$v"    # B
```

答案：A 展开成 `*.sh` 后又被路径名展开（第 3 步）替换成当前目录所有 .sh 文件名；B 的双引号同时关掉分词与 glob，输出字面的 `*.sh`。引号保护的从来不只是空格。

## 10. 与之前和之后的知识的关系

- 往前：[跨平台命令行](/shell/140-CrossPlatformCommandLine) 给了终端操作的手感；[命令行基础](/shell/130-CommandLineBasics) 的通配符就是第 3 节流程的第 3 步；
- 往后：[环境变量与配置文件](/shell/160-EnvVariablesConfig) 接手 `${}` 参数扩展与环境继承；[函数与参数处理](/shell/180-FunctionsArguments) 深化 4.5 的函数预告；[脚本调试与严格模式](/shell/190-ScriptDebugging) 把第 5 节的 set -euo pipefail 讲透；[管道与重定向](/shell/170-PipeRedirect) 展开第 2.3 节的三条流；
- 更远：CI 的 job 就是一个大号 Shell 脚本——这里建立的展开模型与严格模式纪律，在 devops 模块里每天都会用到。
