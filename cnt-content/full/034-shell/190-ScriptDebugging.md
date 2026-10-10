---
order: 200
title: 脚本调试与严格模式
module: 'shell'
category: 工具链
difficulty: intermediate
description: 脚本调试与严格模式：set -euo pipefail 的例外矩阵、bash -x 与 PS4、敏感信息泄露防线、trap 清理、shellcheck 警告码学习法与遮代码自检
author: fanquanpp
updated: '2026-10-11'
related:
  - 'shell/150-ShellBasics'
  - 'shell/180-FunctionsArguments'
  - 'shell/250-PracticalScripts'
prerequisites:
  - 'shell/160-EnvVariablesConfig'
  - 'shell/150-ShellBasics'
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

四层不是并列关系，而是**使用顺序**：静态检查在写代码时拦截，严格模式在运行时拦截，`-x` 在出问题后侦查，trap 兜住退出时刻。本文按这个顺序讲。

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

`set -e` 的例外不是需要背的冷知识，而是一个统一原则：**凡是你显式"询问结果"的地方，失败都不算事故**——问了才有资格失败：

```bash
# 1. 允许失败的场景：用 || 显式兜底
rm -f /tmp/x.tmp || true

# 2. 条件判断中失败是正常的（不触发退出）——if 就是在"询问"
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

`if grep -q` 不触发退出、`||` 右侧不触发退出、`set +e` 区间不触发退出——三者是同一个原则的三个写法。反过来的推论同样重要：**如果一段命令失败是意外，就不要把它放进任何"询问"上下文**。最常见的翻车是把长管道塞进 `if`：

```bash
# 危险：管道里 curl 失败被 if 的"询问"豁免吞掉，只剩 grep 的结果在说话
if curl -s "$url" | grep -q ok; then
    echo "部署成功"
fi

# 修正：逐段负责——curl 失败立刻暴露
body=$(curl -sf "$url") || exit 1
if grep -q ok <<< "$body"; then
    echo "部署成功"
fi
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

**要点**：`+` 开头的行是"展开后的命令"，能看出变量实际值、通配符实际匹配结果——绝大多数"为什么和我以为的不一样"问题在这里一目了然。`-x` 打印的正是[脚本基础](/shell/150-ShellBasics)第 3 节那套"展开与分词"流水线的最终产物——理论与侦查手段在这里会师。

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

### 3.2 安全红线：-x 会把秘密写进日志

`set -x` 打印的是**展开后的命令**——密码、Token、API Key 一旦出现在命令行上，就会原样进 trace 日志与 CI 输出：

```bash
set -x
curl -H "Authorization: Bearer $TOKEN" "$url"   # trace 里是真实 Token
set +x
```

防御三件套：

1. 秘密从环境变量或 `.env` 读取（[环境变量与配置文件](/shell/160-EnvVariablesConfig)第 7 节），但**开了 `-x` 这还不够**——上面的例子读的正是 `$TOKEN`；
2. 秘密经 stdin 或临时文件传递：`curl ... --netrc-file "$f"`、`read -r -s TOKEN`，让秘密不出现在命令行参数里；
3. CI 环境审查 `bash -x` / `set -x` 的使用：调试完就删，或用 `${DEBUG:+set -x}` 让它只在显式开启时生效。泄露的 trace 日志等于泄露的凭证。

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
- cleanup 里要防"半初始化"：`tmpdir` 可能还没赋值就出错，写成 `rm -rf "${tmpdir:-}"` 配合 `[ -n "${tmpdir:-}" ]` 判断更稳（`set -u` 下未赋值变量会先报错）

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

- SC2086（变量未加引号）是最常见的警告——它对应的就是[脚本基础](/shell/150-ShellBasics)第 3 节的分词与 glob 展开，shellcheck 的每条警告背后都有本文这类原理
- **把警告码当学习索引用**：遇到 SC2xxx 不只是改掉，去 https://www.shellcheck.net/ 按编号读完整解释（含正反例）。刷完 SC2086/SC2046/SC2115/SC2155 这一小组，Shell 陷阱课就补完大半
- 安装方式：`apt install shellcheck` / `brew install shellcheck`，也可在编辑器装插件实时检查

### 5.1 SC2155 专讲：一个"看似没问题"的经典

`local v="$(cmd)"` 这类"声明并捕获"会被 shellcheck 揪出 SC2155——命令替换的退出码被 local/declare 吞掉，`cmd` 失败在 `set -e` 下也查无此事。修法是拆两行：

```bash
local v                 # 先声明
v=$(build_url) || die "构造 URL 失败"    # 再赋值，退出码可查
```

这正是[函数与参数处理](/shell/180-FunctionsArguments)第 2 节"local 吞退出码"陷阱的静态检查化身——工具与原理互相印证。

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

这份清单的适用前提是"单点故障"。如果问题是"脚本跑完了但结果不对"，步骤 3 的 `-x` 输出量会失控——先缩小怀疑范围（二分注释掉代码段或用 `bash -x` 分段跑），再对可疑段做完整跟踪。

## 8. 常见误区

**误区一：`set -e` 会让所有失败都退出。** → 不是。`if` 条件、`&&`/`||` 左侧的失败不会触发退出——这正是设计如此（让脚本可以"尝试后判断"），原则见 2.1。

**误区二：调试信息随便 print。** → 用 `set -x` 或条件化调试（`${DEBUG:+...}`），生产环境别留一堆 `echo` 垃圾；且函数内的调试输出要走 stderr，防止污染 `$(...)` 捕获（[函数与参数处理](/shell/180-FunctionsArguments)第 6 节）。

**误区三：shellcheck 是"建议"，可看可不看。** → 多数 SC 警告对应真实陷阱（引号、未定义变量），是"生产脚本别踩坑"的免费教材。

**误区四：`trap` 只在出错时触发。** → `trap ... EXIT` 无论正常结束还是出错退出都会触发，是"无论成败都要清理"的标准姿势。

**误区五：`-x` 只是开发工具，无副作用。** → 它把展开后的命令（含秘密）写进日志，CI 里等同于把凭证发到构建产物——见 3.2 的安全红线。

## 9. 动手实践：遮代码自检

先只读任务与提示，自己修完再看参考实现。这个坏脚本浓缩了本文的全部知识点，建议先按第 7 节清单顺序动手，再对答案。

**任务**：下面这个 `archive.sh` 的意图是把日志目录打包归档后清理，实际运行"成功"退出但经常出事故。找出至少四处问题，说明每处违反了本文哪一节，然后给出修复版。

```bash
#!/bin/bash
LOGDIR=/var/log/myapp
ARCHIVE=/backups/logs-$(date +%F).tar.gz

tar czf $ARCHIVE $LOGDIR
if [ $? -eq 0 ]; then
    find $LOGDIR -name *.log -mtime +7 -delete
fi
echo "归档完成: $ARCHIVE，大小 $(du -h $ARCHIVE)"
rm -rf /tmp/staging_$USER
```

**提示**（按出现顺序）：变量展开处缺什么（150 篇第 3 节的分词）；`*.log` 在 find 参数里会发生什么（同样是 glob 展开的两面性）；脚本整体缺哪三行"刹车"；成功提示和实际状态是否可能不一致（`$?` 检查的写法问题）；临时目录清理有没有兜底。

**参考实现**（先自己修完再看）：

```bash
#!/bin/bash
set -euo pipefail                                # 修复 1：缺刹车（第 2 节）

LOGDIR=/var/log/myapp
STAMP=$(date +%F)
ARCHIVE=/backups/logs-$STAMP.tar.gz

[ -d "$LOGDIR" ] || { echo "日志目录不存在: $LOGDIR" >&2; exit 1; }   # 修复 6：入口校验

tmpdir=$(mktemp -d)
cleanup() { rm -rf "${tmpdir:-}"; }              # 修复 5：trap 兜底（第 4 节）
trap cleanup EXIT

tar czf "$ARCHIVE" "$LOGDIR"                     # 修复 2：展开处全部加双引号（第 2.1 节之外的分词纪律）
find "$LOGDIR" -name "*.log" -mtime +7 -delete   # 修复 3：*.log 必须引号，否则按当前目录展开（坑点见 150 篇第 3 节第 4 步）
du -h "$ARCHIVE"                                 # 修复 4：失败即退出，不再有"归档失败仍报成功"（2.1 节的 if $?: 范式）
echo "归档完成: $ARCHIVE"
```

修复对照表：

| 问题 | 原脚本行为 | 违反的原理 |
| --- | --- | --- |
| 无严格模式 | tar 失败仍继续删 7 天前的日志 | 第 2 节：三层防御缺第一层 |
| `$ARCHIVE` `$LOGDIR` 未加引号 | 路径含空格即解体 | 分词模型：展开后被重新切词 |
| `-name *.log` 未加引号 | 当前目录若有 .log 文件，find 收到的是那些文件名 | glob 展开发生在 Shell、先于 find |
| `if [ $? -eq 0 ]` 旧式检查 | 与 `set -e` 混用混乱；else 分支缺失时"失败"无提示 | 2.1 节：`set -e` 下直接顺序写即可 |
| `rm -rf /tmp/staging_$USER` | `$USER` 为空时变 `rm -rf /tmp/staging_`（尚可）；路径写死无法复用；失败无清理 | 第 4 节：应 `mktemp -d` + `trap EXIT` |
| 无参数/环境校验 | 目录不存在时 tar 报错但脚本退出码仍可能为 0（旧式检查吞掉） | `set -u` 与入口校验 |

## 10. 与之前和之后的知识的关系

- 往前：[脚本基础](/shell/150-ShellBasics) 的展开与分词模型是 `bash -x` 输出的"源代码"；[函数与参数处理](/shell/180-FunctionsArguments) 的子 shell 陷阱是 `set -e` 失效场景的一半来源；
- 往后：[实用脚本集](/shell/250-PracticalScripts) 里的生产脚本都应通过本文第 9 节的检查；[管道与重定向](/shell/170-PipeRedirect) 的三条流知识决定你的调试信息该去 stdout 还是 stderr；
- 更远：CI 流水线把本文的每条纪律放大十倍——一个没加引号的变量在流水线里是定时炸弹，而 trace 日志泄露凭证是安全事故。
