---
order: 210
title: 文本处理命令速查手册
module: 'shell'
category: 工具链
difficulty: beginner
description: cat/head/tail/grep/sed/awk/sort/uniq 等文本处理命令速查：用法、预期输出与方言陷阱
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/200-TextProcessingTools'
  - 'shell/170-PipeRedirect'
  - 'shell/240-CompressArchive'
  - 'shell/130-CommandLineBasics'
prerequisites:
  - 'shell/130-CommandLineBasics'
---


本篇是文本处理命令的**速查手册**：按"看、搜、改、算"四类组织，每条用法都给预期输出；系统性的教学与原理见《文本处理三剑客》。文末集中收录最常踩的方言陷阱（GNU 与 macOS/BSD 的差异）。

## 0. 心智模型：一切皆文本流

Linux 哲学下，配置、日志、代码都是"一行行的文本"。文本处理命令几乎都遵循同一个流式契约：**读一行、处理一行、吐一行**，因此可以像水管一样任意串联：

```text
cat file ──> grep 筛选 ──> sed 替换 ──> awk 取列 ──> sort 排序 ──> uniq 去重计数
```

记住这个"流水线"，下面的命令按环节各就各位。

## 1. 查看：cat / head / tail / less

**cat 拼接查看** `cat [选项] <文件>`

```bash
# 显示文件内容并带行号
cat -n main.py
#      1  import os
#      2  print(os.getcwd())

# 合并多个文件
cat header.md body.md footer.md > full.md
```

**head 头部查看** `head [选项] <文件>`

```bash
head -n 20 README.md    # 前 20 行
head -c 50 data.bin     # 前 50 字节（二进制预览常用）
```

**tail 尾部查看** `tail [选项] <文件>`

```bash
tail -n 30 error.log       # 末尾 30 行
tail -f application.log    # 实时追踪新增内容（Ctrl+C 退出）
tail -n 20 -f app.log      # 从倒数第 20 行开始追踪
```

**less 分页浏览** `less <文件>`

```bash
# 快捷键：空格翻页，/ 向下搜索，n 下一个匹配，G 跳到末尾，q 退出
less large.log
```

大文件用 `less` 而不是 `cat`：less 按需加载，打开几个 GB 的日志也不会卡。

## 2. 搜索：grep

**基本用法** `grep [选项] <模式> <文件>`

```bash
grep -in "error" app.log       # 行号 + 忽略大小写
grep -C 2 "exception" trace.log  # 匹配行前后各 2 行（上下文）
grep -oE "[0-9]{1,3}(\.[0-9]{1,3}){3}" access.log   # 只输出匹配片段（提取 IP）
grep -v "DEBUG" app.log        # 反选：显示不含 DEBUG 的行
grep -rl "TODO" src/           # 递归 + 只列文件名（-n 则带行号）
grep -c "^#" config.conf       # 只统计匹配行数
```

```text
$ printf 'ERROR db\nINFO ok\nERROR cache\n' | grep -c ERROR
2
```

**退出码是脚本接口**：0 有匹配、1 无匹配、2 出错。配合 `if grep -q ...` 可静默判断：

```bash
grep -q "ready" status.log && echo "服务就绪" || echo "未就绪"
```

正则建议统一 `-E`（扩展正则）：`grep -E "err|warn"` 匹配任一词；固定字符串用 `-F`（更快且不需转义）。BRE/ERE 方言差异见文末陷阱表。

## 3. 改写：sed

**替换** `sed 's/旧/新/[标志]'`

```bash
sed 's/foo/bar/' file.txt     # 每行第一处 foo -> bar
sed 's/foo/bar/g' file.txt    # 每行全部替换（g = global）

# 预览确认后再写回
sed 's/8080/3000/g' config.ini       # 第一步：只看输出
sed -i 's/8080/3000/g' config.ini    # 第二步：原地写回（GNU/Linux）
sed -i.bak 's/8080/3000/g' config.ini  # 写回前备份为 config.ini.bak（GNU/BSD 通用）
```

**删除与打印**

```bash
sed '/^$/d' messy.txt     # 删除空行
sed '3,5d' data.txt       # 删除第 3-5 行
sed '/^#/d' conf          # 删除注释行
sed -n '10,20p' file      # 只打印第 10-20 行（-n 关闭默认输出，p 打印）
sed -n '/BEGIN/,/END/p' f # 打印 BEGIN 到 END 之间的区间
```

**插入与追加**

```bash
sed -i '3a\new_line' file   # 第 3 行后插入
sed -i '3i\new_line' file   # 第 3 行前插入
```

sed 修改原文件前**必须先不加 `-i` 预览**——这是不可逆操作的安全带。

## 4. 取列与统计：awk

awk 默认按连续空白切列，`$1`、`$2` 是第 1、2 列，`$0` 是整行：

```bash
awk '{print $1}' access.log           # 打印第一列（通常是 IP）
awk -F: '{print $1, $7}' /etc/passwd  # -F 指定分隔符，取用户与 shell
awk '{print $NF}' data.txt            # $NF = 最后一列

# 条件 + 动作
awk '$2 > 100 {print $1, $2}' scores.txt
awk '$9 == 404 {print $7}' access.log   # 状态码 404 的请求路径
```

```text
$ printf 'a 10\nb 200\nc 30\n' | awk '$2 > 50 {print $1}'
b
```

**统计是 awk 的看家本领**：

```bash
awk 'END {print NR}' file.txt                 # 总行数
awk -F, '{sum += $3} END {print sum}' sales.csv  # 第三列求和
awk '{cnt[$1]++} END {for (k in cnt) print cnt[k], k}' access.log  # 按第一列分组计数
awk '{sum += $2; n++} END {printf "平均: %.2f\n", sum/n}' data.txt
```

```text
$ printf 'a\nb\na\n' | awk '{cnt[$1]++} END {for (k in cnt) print cnt[k], k}'
2 a
1 b
```

## 5. 排序去重统计：sort / uniq / cut / wc

```bash
# sort
sort -nr scores.txt      # 按数值倒序（-n 数值 -r 倒序）
sort -k3 -n data.txt     # 按第 3 列数值升序
sort -u names.txt        # 排序并去重
sort -h du_out.txt       # 按人类可读大小排序（K/M/G）

# uniq：只合并"相邻"重复行，必须先 sort
sort items.txt | uniq -c | sort -rn     # 分组计数并按次数倒序（经典三段式）

# cut：按单字符分隔符取列（不会合并连续分隔符）
cut -d: -f1 /etc/passwd     # 取冒号分隔的第一字段
cut -c1-3 names.txt         # 取每行第 1-3 字符

# wc：计数
wc -l README.md     # 行数
wc -w article.md    # 单词数
```

```text
$ printf 'b\na\nb\na\na\n' | sort | uniq -c | sort -rn
   3 a
   2 b
```

**cut 与 awk 的分界**：cut 只认"单个分隔符"，连续分隔符会产生空字段；awk 默认把连续空白压成一个，处理日志类"不定长空白"用 awk 更稳。

## 6. 组合实战：日志 TOP 统计

以 Nginx 风格访问日志为例，一条管道产出"访问量 TOP 3 IP"：

```bash
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -3
```

```text
    452 10.0.0.12
    301 10.0.0.33
    128 10.0.0.7
```

每个环节都可替换：`$1` 换成 `$7` 就是 TOP 页面；`head -3` 换成 `head -10` 就是日报口径。更多组合套路见《文本处理三剑客》第 5 节。

## 7. 方言陷阱速查表

| 陷阱 | 说明 | 可移植写法 |
| :--- | :--- | :--- |
| `sed -i` 无参数 | GNU（Linux）可用；macOS/BSD 的 `-i` 必须带后缀参数 | macOS 用 `sed -i '' 's/a/b/g'`，或两边都用 `sed -i.bak` |
| sed 的 `\U` 大小写转换 | GNU sed 专属，BSD sed 不支持 | `echo s | tr 'a-z' 'A-Z'` 或用 awk `toupper()` |
| grep 正则元字符 | BRE 下 `\|`、`\+` 是 GNU 扩展 | 统一 `grep -E`；字面量用 `-F` |
| awk `gensub()` | gawk 专属，mawk/BSD awk 无 | 用 `match()` + `substr()` 或 sed 分组替换 |
| `uniq` 不排序直接用 | 只合并相邻重复，结果错误 | 永远 `sort ... \| uniq` |
| `wc -l` 少 1 | 统计的是换行符个数；末行无换行符则少计 | 生成文本保证末尾换行，或用 `awk 'END{print NR}'` |
| `grep` 对二进制文件 | 默认报 "Binary file matches" | 加 `-a` 按文本处理 |

## 8. 小结

**初学者要点**：

- 看（cat/head/tail/less）、搜（grep）、改（sed）、算（awk/sort/uniq/wc）五类命令覆盖日常九成需求
- `sort | uniq -c | sort -rn` 是分组计数黄金三段式
- sed 改文件前先预览；`-i.bak` 是最稳妥的写回方式

**进阶注意**：

- Linux 与 macOS 的 sed/grep/awk 行为存在方言差异，跨平台脚本优先选上表"可移植写法"
- grep 的退出码、awk 的 END 块都是可以在脚本里直接利用的接口
- 单条命令超过 20 行逻辑时应换 Python/Perl，文本三剑客贵在"短平快"
