---
order: 10
title: Shell 脚本编程基础
module: 'shell'
category: 工具链
difficulty: beginner
description: Shell 脚本编程基础：命令、变量、管道、控制流、函数与工程实践
author: fanquanpp
updated: '2026-08-02'
related:
  - 'shell/003-CommandLineBasics'
  - 'devops/005-CICDPipeline'
prerequisites:
  - 'shell/003-CommandLineBasics'
---


## 1. 从"点菜"说起：Shell 是什么

### 1.1 一个餐厅的类比

想象你去一家餐厅（操作系统），你想让服务员（Shell）帮你做一件事：

- 你说："来一份红烧肉"（输入命令）
- 服务员去后厨让厨师做（调用系统程序）
- 服务员把菜端上来（返回结果）

**Shell 就是操作系统的"服务员"**：它读取你输入的命令，调用系统程序执行，并把结果返回给你。它既是**交互式工具**（你在终端里敲命令），也是**脚本语言**（把命令写进文件批量执行）。

Linux/macOS 默认是 bash（或 zsh），Windows 的 PowerShell 是另一套体系，但 Git Bash/WSL 可以运行 bash 脚本。

### 1.2 Shell 脚本的价值：做"胶水"

Shell 脚本的本质是**胶水**：把已有的小工具（ls、grep、awk、curl）串成自动化流程。

为什么需要 Shell 脚本？因为现实工作中有大量重复操作：

- 部署：拉代码 → 构建 → 重启服务
- 监控：检查日志 → 统计 → 告警
- 数据：下载 → 处理 → 汇总

这些操作一步步手敲会累死，写成脚本后一条命令搞定。**Shell 是运维与后端开发者的基本功**。

### 1.3 本章目标

本章是 Shell 的"第一课"，带你建立完整的基础框架。学完后你应该能：

1. 理解命令、变量、管道、控制流四大基础
2. 写出安全、健壮的简单脚本
3. 知道"生产脚本必须做什么"（严格模式）

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

**管道是 Shell 最强大的能力**：无需中间文件，数据在进程间流动。`2>&1` 把标准错误合并到标准输出，便于统一记录日志。

### 2.4 第一个脚本

```bash
#!/bin/bash
# 输出 "Hello, World!"
echo "Hello, World!"

# 保存为 hello.sh 后：
chmod +x hello.sh   # 添加执行权限
./hello.sh          # 执行
```

## 3. 控制流

### 3.1 条件判断

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

**要点**：`[ ... ]` 是 `test` 命令的语法糖，`[[ ... ]]` 是 bash 扩展（支持正则与更安全比较）。变量必须加引号防止空值导致语法错误。

### 3.2 循环

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

**要点**：`IFS=` 防止行首尾空白被吃掉，`-r` 防止反斜杠转义——这是读取文件行的标准姿势。

### 3.3 函数

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

**要点**：`$1`、`$2` 是位置参数，`$*` 是所有参数；`local` 声明局部变量，避免污染全局。

## 4. 严格模式与错误处理

### 4.1 为什么需要严格模式

Shell 脚本默认"**宽容**"：命令失败不报错、未定义变量当空值、管道只看最后一段结果。这种宽容在生产环境是灾难——脚本会带着错误状态继续执行，产生半成品数据。

### 4.2 set -euo pipefail

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

### 4.3 trap 清理

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

## 5. 常用文本处理（概览）

### 5.1 grep：行匹配

```bash
grep -i "error" log.txt        # 忽略大小写
grep -v "^#" config.conf       # 排除注释行
grep -E "err|warn" log.txt     # 扩展正则，匹配多个词
```

### 5.2 sed：流编辑

```bash
sed -i 's/old/new/g' file.txt   # 全局替换并写回
sed -n '10,20p' file.txt        # 打印第 10-20 行
```

### 5.3 awk：列处理与统计

```bash
awk '{print $1, $3}' data.txt   # 打印第 1 列和第 3 列
awk 'END {print NR}' file.txt   # 统计行数
awk '{sum += $2} END {print sum}' data.txt  # 按第 2 列求和
```

**详细用法见本模块《文本处理三剑客》**。

## 6. 工程实践：部署脚本模板

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

## 7. 常见陷阱

**陷阱一：忘记引号。** `rm $file` 在文件名含空格时被拆成多个参数。所有变量加双引号。

**陷阱二：不用严格模式。** 命令失败继续执行，产生半成品状态。生产脚本必须 `set -euo pipefail`。

**陷阱三：`rm -rf` 误删。** 删除前先 `echo` 预览，使用 `set -u` 防止空变量导致 `rm -rf /`。

**陷阱四：脚本不可移植。** 避免 GNU 专属选项，或用 bash 明确 shebang。

**陷阱五：忽略退出码。** `command || { echo "失败"; exit 1; }` 显式处理。
