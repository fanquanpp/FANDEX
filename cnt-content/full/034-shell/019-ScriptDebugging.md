---
order: 190
title: 脚本调试与严格模式
module: 'shell'
category: 工具链
difficulty: intermediate
description: 脚本调试与严格模式：set -euo pipefail、trap 清理、bash -x、shellcheck 与 shfmt
author: fanquanpp
updated: '2026-09-08'
related:
  - 'shell/020-FunctionsArguments'
  - 'shell/021-PracticalScripts'
prerequisites:
  - 'shell/018-EnvVariablesConfig'
  - 'shell/001-ShellBasics'
---


## 1. 从"自动驾驶的刹车"说起

### 1.1 为什么需要调试体系

想象一辆车没有刹车（Shell 脚本默认行为）：踩错油门（命令失败）不会停下，反而继续加速（继续执行），最后撞墙（生产事故）。

**Shell 脚本默认"宽容"**：

- 命令失败不报错（继续执行）
- 未定义变量当空值（静默）
- 管道只看最后一段结果（前面的失败被忽略）

这种宽容在生产环境是灾难——脚本会带着错误状态继续执行，产生半成品数据。

### 1.2 调试体系的"三层防御"

| 层次 | 手段 | 作用 |
| :--- | :--- | :--- |
| 防患于未然 | `set -euo pipefail` | 让错误立刻暴露、当场停止 |
| 过程可视化 | `bash -x` / `set -x` | 跟踪每一步执行的细节 |
| 兜底清理 | `trap` | 无论成败都执行清理 |
| 静态检查 | shellcheck / shfmt | 在运行前发现错误 |

## 2. set -euo pipefail 详解

```bash
#!/bin/bash
set -euo pipefail
```

**逐个拆解**：

| 选项 | 完整写法 | 行为 |
| --- | --- | --- |
| `-e` | `set -o errexit` | 任何命令返回非零退出码立即退出脚本 |
| `-u` | `set -o nounset` | 引用未定义变量立即报错（不静默当空值） |
| `-o pipefail` | `set -o pipefail` | 管道中任一命令失败，整体退出码为失败 |

```bash
#!/bin/bash
set -euo pipefail

echo "第一步"
false                    # 返回非零，脚本在此退出
echo "这行永远不会执行"    # 不会执行
```

`false` 命令永远返回失败。在 `set -e` 下脚本第 3 行就终止，后续代码被跳过——这正是我们想要的"**快速失败**"。

### 2.1 例外与细节

```bash
# 1. 允许失败的场景：用 || 显式兜底
rm -f /tmp/x.tmp || true

# 2. 条件判断中失败是正常的（不触发退出）
if grep -q "error" log.txt; then
    echo "发现错误"
fi

# 3. 需要错误信息的场景：关闭 -e 后捕获
set +e
output=$(risky_command 2>&1)
status=$?
set -e
echo "退出码: $status"
```

**要点**：

- `set -e` 不是"所有失败都退出"：`if`/`while` 条件、`&&`/`||` 左侧、`!` 取反等上下文中的失败不会触发退出
- 真正"允许失败但想捕获结果"时，临时 `set +e` 再 `set -e` 是标准做法
- 注意 `set -u` 下 `$1` 若未传参会报错，需用 `${1:-}` 提供默认

## 3. bash -x：跟踪执行

```bash
bash -x script.sh       # 运行并打印每条命令的展开结果
bash -n script.sh       # 只做语法检查，不执行
bash -v script.sh       # 打印原始输入行（不展开变量）
```

```text
bash -x 输出示例：
+ set -euo pipefail
+ echo "开始"
开始
+ PORT=8080
+ grep -q "error" log.txt
+ echo "正常退出"
```

**要点**：`+` 开头的行是"展开后的命令"，能看出变量实际值、通配符实际匹配结果——绝大多数"为什么和我以为的不一样"问题在这里一目了然。

### 3.1 脚本内跟踪与 PS4

```bash
#!/bin/bash
export PS4='+ ${BASH_SOURCE}:${LINENO}: '   # 显示文件名与行号
set -x                    # 从这里开始跟踪
DEBUG=1
echo "值: $DEBUG"
set +x                    # 到这里结束跟踪
```

默认 `PS4` 只有一个 `+`，设置后输出变成 `+ script.sh:5: echo 值: 1`，定位问题行非常方便。**只在可疑片段前后开启/关闭 `set -x`**，比全程跟踪输出更清爽。

## 4. trap：注册信号处理

trap 在指定事件发生时执行自定义命令，是"无论成败都要清理"的实现手段：

```bash
#!/bin/bash
set -euo pipefail

tmpdir=$(mktemp -d)             # 创建临时目录
cleanup() {
    echo "[清理] 删除 $tmpdir"
    rm -rf "$tmpdir"
}
trap cleanup EXIT               # 脚本退出时执行 cleanup

# ... 业务逻辑，中途出错也会触发 cleanup ...
echo "处理中"
false                           # 触发 set -e 退出
```

**要点**：

- `trap ... EXIT` 是清理临时文件、锁文件的标准姿势——正常结束、出错退出、被信号终止都会执行
- `mktemp -d` 生成安全的临时目录，避免硬编码 `/tmp/xxx` 的冲突风险

### 4.1 常用事件

| 事件 | 触发时机 | 典型用途 |
| --- | --- | --- |
| `EXIT` | 脚本退出时（任何原因） | 清理临时文件 |
| `ERR` | 每条命令失败时 | 记录出错位置 |
| `INT` / `TERM` | 收到中断/终止信号 | 优雅停机 |
| `DEBUG` | 每条命令执行前 | 自实现跟踪 |

```bash
trap 'echo "出错于第 $LINENO 行"; exit 1' ERR
trap 'echo "收到 Ctrl+C，正在退出"; exit 130' INT
trap - EXIT              # 取消已注册的处理
trap -l                  # 列出所有信号
```

**要点**：`ERR` 陷阱配合 `$LINENO` 能在出错时打印行号，快速定位。信号陷阱要立即退出（`exit`），避免在信号处理中继续执行危险操作。

## 5. shellcheck：静态检查

shellcheck 是 Shell 脚本的"编译器警告"，能发现引号问题、未定义变量、常见陷阱：

```bash
shellcheck script.sh                 # 检查脚本
shellcheck -x deploy.sh              # 跟随 source 的文件一起检查
shellcheck -S warning script.sh      # 只显示 warning 及以上级别
```

```text
示例输出：
In script.sh line 7:
    rm -rf $tmpdir
           ^-----^ SC2086: Double quote to prevent globbing and word splitting.
```

**要点**：

- SC2086（变量未加引号）是最常见的警告，修复：`rm -rf "$tmpdir"`
- shellcheck 的警告码（SC 编号）可在官网按编号检索详细说明，是学习 Shell 陷阱的最佳教材
- 安装方式：`apt install shellcheck` / `brew install shellcheck`，也可在编辑器装插件实时检查

## 6. shfmt：统一格式

shfmt 自动格式化脚本，让团队风格一致：

```bash
shfmt -w script.sh      # 格式化并写回
shfmt -i 4 -w script.sh # 缩进 4 空格
shfmt -d script.sh      # 只显示差异（diff）
```

**要点**：shfmt 处理缩进、空格、换行等风格问题，与 shellcheck 功能互补：**shfmt 管"好不好看"，shellcheck 管"对不对"**。两者配合 CI 可以在提交前自动检查。

## 7. 调试清单：遇到问题按顺序走

1. 先 `bash -n script.sh` 排除语法错误；
2. 再 `shellcheck script.sh` 修复静态问题；
3. 运行时 `bash -x script.sh` 观察实际展开；
4. 用 `PS4='+ $LINENO: '` 定位出错行；
5. 对可疑片段 `set -x` / `set +x` 局部跟踪；
6. 关键处 `echo "DEBUG: var=$var"` 打印中间值（或写入日志文件）；
7. 生产脚本必须 `set -euo pipefail` + `trap cleanup EXIT`。

## 8. 常见误区

**误区一：`set -e` 会让所有失败都退出。** → 不是。`if` 条件、`&&`/`||` 左侧的失败不会触发退出——这正是设计如此（让脚本可以"尝试后判断"）。

**误区二：调试信息随便 print。** → 用 `set -x` 或条件化调试（`${DEBUG:+...}`），生产环境别留一堆 `echo` 垃圾。

**误区三：shellcheck 是"建议"，可看可不看。** → 多数 SC 警告对应真实陷阱（引号、未定义变量），是"生产脚本别踩坑"的免费教材。

**误区四：`trap` 只在出错时触发。** → `trap ... EXIT` 无论正常结束还是出错退出都会触发，是"无论成败都要清理"的标准姿势。
