---
order: 190
title: 函数与参数处理
module: 'shell'
category: 工具链
difficulty: intermediate
description: 函数与参数处理：函数的三条输出通道、位置参数、$@ 与 $*、命令替换的子 shell 陷阱、shift 与 getopts 参数解析、函数库复用
author: fanquanpp
updated: '2026-10-11'
related:
  - 'shell/150-ShellBasics'
  - 'shell/190-ScriptDebugging'
  - 'shell/160-EnvVariablesConfig'
  - 'shell/250-PracticalScripts'
prerequisites:
  - 'shell/150-ShellBasics'
  - 'shell/160-EnvVariablesConfig'
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

### 1.2 心智模型：函数就是一个自定义命令

bash 里没有"方法调用"，只有"命令"。**定义一个函数 = 给 Shell 词典里新增一个命令**，它和 `ls`、`grep` 平起平坐：可以被调用、可以接参数、有退出码、输出可以进管道。这个模型一旦建立，很多规则不用背：

- 调用函数**不写括号**：`greet "FANDEX"`，因为你在"执行命令"，不是在"调方法"；
- 函数内 `$1 $2` 是它自己的参数，与脚本的 `$1` 互不干扰——命令有自己的参数；
- 函数能进管道：`gen_report | grep ERROR`——命令的输出当然能进管道；
- `command -v func_name` 能查到它——函数真的注册进了命令词典。

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
- 一个容易忽视的细节：`local` 也是一条命令，它会**吃掉紧跟命令的退出码**——`local v=$(false)` 的 `$?` 是 local 自己的 0，不是 false 的非零。先赋值再 local（或反过来 `v=$(...)` 后单独声明）才不吞错误

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

**要点**：`"$@"` 是唯一"不丢参数"的写法——参数 `a b` 保持为一个整体。`for x in $@` 或 `"$*"` 会把含空格的参数拆散，是经典 Bug 来源。**规则**：需要逐个处理用 `"$@"`，需要合并展示用 `"$*"`。这与[脚本基础](/shell/150-ShellBasics)第 3 节的分词模型同源：不带引号的 `$@` 展开后照样被重新分词。

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
    echo "  -v  详细输出（verbose 开关）"
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

## 5. 三条输出通道：stdout、退出码与全局变量

函数要与外界交换信息，只有三条通道。**分清"数据、状态、副作用"走哪条道，是 Shell 函数设计的核心**：

| 通道 | 写法 | 容量 | 语义 | 适用 |
| --- | --- | --- | --- | --- |
| 标准输出 | `echo` 打印，`$(...)` 捕获 | 任意文本 | 返回**数据** | 取值、拼接、计算结果 |
| 退出码 | `return 0-255`（或最后一条命令的退出码） | 0-255 整数 | 返回**状态** | 成功/失败、是否命中 |
| 全局变量 | 直接赋值（不用 local） | 任意 | **副作用** | 少量受控的"出参" |

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
- 三条通道各司其职的反面教材：用退出码传数据（`return $count` 超过 255 静默截断）、用全局变量传大数据（调用方不知道哪些变量被改了）——**数据走 stdout、状态走退出码**，例外要写注释

## 6. 命令替换的子 shell 陷阱：`$(...)` 里发生的事外面对不上账

`result=$(some_func)` 有一个致命细节：**命令替换会开一个子 shell 执行函数**。子 shell 是当前 Shell 的一份副本——它继承所有变量，但它内部的**一切修改都随子 shell 退出而蒸发**：

```bash
#!/bin/bash
items=()
collect() {
    for x in a b c; do
        items+=("$x")          # 修改全局数组
        echo "收集 $x"          # 同时打印日志
    done
}

result=$(collect)              # 想捕获"数据"
echo "数组元素数: ${#items[@]}" # 预期 3，实际 0 —— 子 shell 里改的 items 没回来
echo "捕获内容: $result"        # 收集 a / 收集 b / 收集 c —— stdout 却完整带回来了
```

```text
数组元素数: 0
捕获内容: 收集 a
收集 b
收集 c
```

读法：三条通道里，stdout 能穿过子 shell 边界（它是被捕获带走的数据），全局变量穿不过（副本上的修改随副本一起销毁）。由此推出两条纪律：

1. **函数要"返回数据"就走 stdout**，不要指望"函数里改全局变量 + 顺手被捕获"两头占——两头都要时必炸一头；
2. **函数里的日志必须走标准错误**（`echo "..." >&2`）：日志混进 stdout 会被 `$(...)` 一起捕获，污染数据；写进 stderr 后捕获自然干净。这就是"日志走 stderr、数据走 stdout"纪律的出处。

同样因为子 shell，`cat file | while read` 循环里对变量的修改也带不出来（管道右侧是子 shell）——需要累计时改用重定向 `while read ... done < file`（150 篇 4.2 的写法）。子 shell 是 Shell 里"改动丢失"类 Bug 的总根源，识别标志固定：**变量在 `$(...)`、管道右侧或 `( )` 里被改过**。

## 7. 综合示例：带默认值的日志函数

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
- 这个版本把日志写向 stdout，适合"日志就是主输出"的脚本；若该函数会被 `$(...)` 场景复用，把两处 `echo "$line"` 改成 `echo "$line" >&2`——第 6 节的纪律落地
- 此函数可直接复制到任何脚本使用

## 8. 函数库：source 复用与加载守卫

函数定义可以放进独立文件，被多个脚本 `source` 复用——这才是"可复用"的完整形态：

```bash
# lib/common.sh —— 通用函数库
die() { echo "错误: $*" >&2; exit 1; }

require_cmd() {
    command -v "$1" >/dev/null 2>&1 || die "缺少命令: $1"
}

LIB_COMMON_GUARD=1
```

```bash
#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/lib/common.sh"

require_cmd git
require_cmd pnpm
echo "环境齐备，开始构建"
```

**要点**：

- `source`（等价 `.`）在**当前 shell** 执行文件——与 `./lib/common.sh` 的本质区别：后者开子进程，函数定义带不回来；
- `$(dirname "$0")` 让脚本在任意工作目录下都能找到自己的库文件；
- 库文件**不该有可执行位也不该带 shebang**：它不是独立脚本，是"被读进来的代码"；
- 多层 source 时用守卫变量（`LIB_COMMON_GUARD`）防重复加载——和 C 头文件的 include guard 是同一个问题。
- `return` 与 `exit` 在这里分道扬镳：库内函数出错用 `return`/`die`（`die` 里是 `exit`，因为致命错误该终止整个脚本），库文件顶层逻辑则要谨慎 `exit`——它会终止**调用方**脚本。

## 9. 常见陷阱

**陷阱一：函数未定义就调用。** bash 顺序执行，定义必须在使用之前。

**陷阱二：`return` 想返回字符串。** `return` 只支持 0-255 整数状态码，返回数据请用 stdout + `$(...)`。

**陷阱三：`$@` 不加引号。** `for x in $@` 会拆散含空格参数，务必写 `"$@"`。

**陷阱四：循环内调用函数修改全局变量。** 意外改变循环变量（如 `i`），函数内尽量 `local`。

**陷阱五：`$(func)` 里改全局变量。** 子 shell 副本上的修改全部蒸发（第 6 节）——要数据走 stdout，要状态走退出码，别两边都要。

**陷阱六：日志混进数据。** 函数内的 `echo` 调试输出会被 `$(...)` 一起捕获；日志一律 `>&2`。

**陷阱七：`local v=$(cmd)` 吞退出码。** local 是命令，`$?` 变成它自己的 0；先赋值再声明，或直接拆成两行。

## 10. 动手实践：遮代码自检

先只读任务与提示，自己写完再看参考实现。

**任务**：写一个可复用的 `lib.sh`，提供三个函数——

1. `die "消息"`：向标准错误打印 `[FATAL] 消息` 并以退出码 1 终止；
2. `require_file <路径>`：文件不存在则 `die`；
3. `add <a> <b>`：**以 stdout 返回**两整数之和（数据走数据通道，不碰全局变量）。

再写 `main.sh` source 它，演示三个函数的用法，并满足：`add` 的结果被 `$(...)` 捕获后主脚本能继续使用；`lib.sh` 重复 source 不重复执行任何初始化。

**提示**：第 2 条先想清楚"校验失败属于哪条通道"（是数据还是状态？`die` 的退出码会沿函数调用一路冒泡吗？）；第 3 条对抗的正是第 6 节陷阱——和不在函数内累加，用 `echo` 输出；守卫变量的思路在第 8 节。

**参考实现**（先自己写完再看）：

```bash
# lib.sh
LIB_SH_GUARD=1                  # 守卫：重复 source 时跳过初始化段

die() {
    echo "[FATAL] $*" >&2       # 日志走 stderr，不污染数据通道
    exit 1                      # 致命错误终止整个脚本（沿调用冒泡）
}

require_file() {
    [ -f "$1" ] || die "文件不存在: $1"    # 状态通道：失败返回非零并终止
}

add() {
    echo $(( $1 + $2 ))          # 数据走 stdout——子 shell 也能把数据带回去
}
```

```bash
#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/lib.sh"

require_file "./config.yml"
total=$(add 3 4)
echo "3 + 4 = $total"
# 校验 add 不依赖全局变量：把 add 里的累加改成全局数组再 $(...) 调用，必然拿不到
```

要点自查：

- `die` 打到 `>&2`——若打到 stdout，它在 `$(...)` 场景下会污染捕获值；
- `require_file` 里 `[ -f ... ] || die ...`：`||` 短路让校验失败时进入 `die`，`set -e` 之外也成立；
- `add` 用 `echo` 返回数据，`$(( ))` 完成算术——整条链路没有任何全局变量；
- 三个函数都不用 `local`（它们没有临时变量需要隔离）——`local` 不是仪式，是"确实产生了临时变量"时才加。

## 11. 与之前和之后的知识的关系

- 往前：[脚本基础](/shell/150-ShellBasics) 的分词模型解释了 `"$@"` 与 `local` 的全部理由；[环境变量与配置文件](/shell/160-EnvVariablesConfig) 的 `${1:-}`、`${1:?}` 扩展是参数校验的原料；
- 往后：[脚本调试与严格模式](/shell/190-ScriptDebugging) 教你排查"函数行为与我以为的不一样"；[实用脚本集](/shell/250-PracticalScripts) 是本文函数设计模式的成品展示；
- 更远：这里的"三条通道"映射到任何语言的函数设计——返回值/异常/副作用，Shell 只是更赤裸地暴露了它们。
