---
order: 200
title: 函数与参数处理
module: 'shell'
category: 工具链
difficulty: intermediate
description: 函数与参数处理：函数定义与作用域、位置参数、shift、getopts 参数解析
author: fanquanpp
updated: '2026-09-08'
related:
  - 'shell/019-ScriptDebugging'
  - 'shell/021-PracticalScripts'
prerequisites:
  - 'shell/001-ShellBasics'
  - 'shell/018-EnvVariablesConfig'
---


## 1. 从"菜谱里的步骤分组"说起

### 1.1 为什么需要函数

想象一本菜谱（脚本）：如果没有"分组步骤"的概念，每道菜的"洗菜、切菜、下锅"都要完整写一遍，菜谱会越来越长、越来越难改。

**函数把"一段可复用的逻辑"打包命名**，解决三件事：

| 问题 | 函数方案 |
| --- | --- |
| 同一段逻辑写多遍 | 定义一次，多处调用 |
| 脚本越来越长难维护 | 按职责拆分成命名块 |
| 无法测试局部逻辑 | 函数可独立调用验证 |

```bash
#!/bin/bash
greet() {
    echo "你好, $1"
}
greet "FANDEX"          # 输出：你好, FANDEX
```

**要点**：

- bash 函数两种写法：`name() { ... }` 或 `function name { ... }`，前者更通用
- 函数体最后一条命令的退出码即函数的退出码
- 定义必须在调用之前（bash 逐行解释执行）

## 2. 作用域：local 与全局

```bash
#!/bin/bash
count=0                 # 全局变量

increment() {
    local step="${1:-1}"    # local 声明局部变量
    count=$((count + step)) # 局部函数内可直接改全局
    local temp="临时值"      # 函数外访问不到
    echo "内部 temp=$temp"
}

increment 2
echo "count=$count"     # count=2，全局被修改
echo "temp=$temp"       # 空：函数外访问不到 temp
```

**要点**：

- 默认情况下函数内外变量互通（bash 没有"自动局部"）
- `local` 声明变量只在函数内可见，防止污染全局命名空间——**这是函数式脚本的纪律**
- `$(( ))` 是算术运算语法

## 3. 位置参数

### 3.1 基础

```bash
#!/bin/bash
echo "脚本名: $0"
echo "第 1 个参数: $1"
echo "第 2 个参数: $2"
echo "参数个数: $#"
```

```text
执行 ./demo.sh a b c 输出：
脚本名: ./demo.sh
第 1 个参数: a
第 2 个参数: b
参数个数: 3
```

**要点**：`$0` 是脚本名（函数内则是函数名），`$1`-`$9` 是前 9 个位置参数，第 10 个起必须写 `${10}`。`$#` 是参数个数，脚本入口处用它做参数数量校验。

### 3.2 $@ 与 $* 的区别

| 写法 | 行为 |
| --- | --- |
| `$@` | 每个参数独立，可含空格（推荐） |
| `"$@"` | 引号包裹：逐参数传递，最安全 |
| `$*` | 所有参数合并为一个字符串 |
| `"$*"` | 用 IFS 首字符连接成一个字符串 |

```bash
print_all() {
    echo "用 \"\$@\" 遍历:"
    for arg in "$@"; do
        echo "  [$arg]"
    done
}
print_all "a b" c
```

```text
输出：
用 "$@" 遍历:
  [a b]
  [c]
```

**要点**：`"$@"` 是唯一"不丢参数"的写法——参数 `a b` 保持为一个整体。`for x in $@` 或 `"$*"` 会把含空格的参数拆散，是经典 Bug 来源。**规则**：需要逐个处理用 `"$@"`，需要合并展示用 `"$*"`。

### 3.3 shift：消费参数

```bash
#!/bin/bash
while [ $# -gt 0 ]; do
    echo "处理参数: $1"
    shift               # 左移一位：$2 变成 $1
done
```

```text
./loop.sh a b c 输出：
处理参数: a
处理参数: b
处理参数: c
```

`shift [n]` 丢弃前 n 个参数（默认 1），配合 `while [ $# -gt 0 ]` 可逐个消费参数，是手写参数解析的基础。注意 `set -u` 下 `$1` 为空时会报错，循环前先判断 `$#`。

## 4. getopts：标准参数解析

getopts 是 bash 内置的参数解析器，支持单字母选项、可带参数选项、组合选项：

```bash
#!/bin/bash
usage() {
    echo "用法: $0 -f <文件> [-v] [-o <目录>]"
    echo "  -f  必填：输入文件"
    echo "  -o  输出目录（默认 ./out）"
    echo "  -v  显示版本"
    exit 1
}

out_dir="./out"
verbose=0
while getopts "f:o:vh" opt; do
    case "$opt" in
        f) file="$OPTARG" ;;        # OPTARG 保存选项参数
        o) out_dir="$OPTARG" ;;
        v) verbose=1 ;;
        h) usage ;;
        *) usage ;;                 # 未知选项
    esac
done
shift $((OPTIND - 1))               # 跳过已解析的选项

[ -n "${file:-}" ] || usage          # 必填参数校验

echo "文件: $file, 输出: $out_dir, 详细: $verbose"
echo "剩余位置参数: $*"
```

```text
./tool.sh -f data.txt -o ./tmp extra_arg 输出：
文件: data.txt, 输出: ./tmp, 详细: 0
剩余位置参数: extra_arg
```

**getopts 关键机制**：

- 选项字符串 `f:o:vh` 中，带 `:` 的选项（f、o）需要额外参数，值存入 `$OPTARG`；不带冒号的（v、h）是开关
- `OPTIND` 记录已消费到第几个参数，`shift $((OPTIND - 1))` 把剩余内容留给位置参数
- `*)` 分支处理非法选项
- getopts 支持 `-fv` 组合，比手写 shift 解析健壮得多

## 5. 返回值与输出捕获

函数通过两种方式"返回"结果：**退出码（数值状态）**与**标准输出（数据）**。

```bash
#!/bin/bash
is_running() {
    pgrep -f "$1" > /dev/null
}
is_running nginx && echo "nginx 在运行" || echo "nginx 未运行"

# 输出捕获：把函数 stdout 当数据用
get_date() { date "+%Y-%m-%d"; }
today=$(get_date)
echo "今天是 $today"
```

**要点**：

- `is_running` 直接复用 `pgrep` 的退出码，函数无需 `return` 语句
- 要"返回数据"时，让函数打印到标准输出，调用方用 `$(...)` 捕获——这是 bash 实现"函数返回值"的惯用法
- 显式 `return n` 只能返回 0-255 的整数状态码

## 6. 综合示例：带默认值的日志函数

```bash
#!/bin/bash
set -euo pipefail

# 日志函数：支持级别、时间戳、可选输出文件
log() {
    local level="${1:-INFO}"
    shift
    local ts
    ts=$(date "+%F %T")
    local msg="$*"
    local line="[$ts] [$level] $msg"
    echo "$line"
    if [ -n "${LOG_FILE:-}" ]; then
        echo "$line" >> "$LOG_FILE"
    fi
}

LOG_FILE=/var/log/app.log
log INFO "服务启动"
log WARN "配置缺失，使用默认值"
log ERROR "连接超时"
```

```text
输出：
[2026-08-01 14:30:22] [INFO] 服务启动
[2026-08-01 14:30:22] [WARN] 配置缺失，使用默认值
[2026-08-01 14:30:22] [ERROR] 连接超时
```

**要点**：

- 函数内部先 `local` 捕获参数再 `shift`，是"选项式"函数的标准写法
- 日志输出同时写终端与文件（`LOG_FILE` 用 `${VAR:-}` 提供空默认，避免 `set -u` 报错）
- 此函数可直接复制到任何脚本使用

## 7. 常见陷阱

**陷阱一：函数未定义就调用。** bash 顺序执行，定义必须在使用之前。

**陷阱二：`return` 想返回字符串。** `return` 只支持 0-255 整数状态码，返回数据请用 stdout + `$(...)`。

**陷阱三：`$@` 不加引号。** `for x in $@` 会拆散含空格参数，务必写 `"$@"`。

**陷阱四：循环内调用函数修改全局变量。** 意外改变循环变量（如 `i`），函数内尽量 `local`。
