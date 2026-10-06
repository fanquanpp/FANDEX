---
order: 210
title: 文本处理三剑客：grep、sed、awk
module: 'shell'
category: 工具链
difficulty: intermediate
description: 文本处理三剑客：grep 行匹配、sed 流编辑、awk 列处理与统计、管道组合实战
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/250-PracticalScripts'
  - 'shell/220-ProcessJobControl'
prerequisites:
  - 'shell/130-CommandLineBasics'
  - 'shell/150-ShellBasics'
---

## 知识点地图

- **知识类别**：文本处理三剑客——grep（行匹配）、sed（流编辑）、awk（列处理与统计），以及三者的管道组合。
- **解决什么问题**：日志里找错误、配置文件批量替换、CSV/日志按列统计——不写 Python 就能完成的文本加工，从一行过滤到分组报表。
- **什么时候用到**：看日志、改配置、数据粗加工；这是命令行「组合思维」的核心练习场（shell/130 第 1.1 节）。

**与《文本处理速查》（shell/210-TextProcessing）的分工**：本篇教学拆解（每个选项为什么这样用、组合怎么设计），210 是速查翻查（背过的命令忘了参数时查）——重叠的速查性表述以 210 为准。前置：正则与通配符的辨析见 shell/130 第 5 节，本篇第 2.2 节在其基础上展开。

## 1. 从"三个工人"说起

### 1.1 三剑客分工

想象一条流水线，处理一叠文件（文本数据），三个工人各司其职：

| 工人 | 擅长 | 类比 |
| :--- | :--- | :--- |
| grep | 找出符合条件的行 | 质检员：筛出有问题的行 |
| sed | 按行替换、删除、插入 | 修理工：改写内容 |
| awk | 取列、统计、生成报表 | 会计：计算和汇总 |

三者都遵循"**读一行、处理一行、输出一行**"的流式模型，因此可以无缝接入管道：`cat file | grep ... | awk ... | sort ...`。

## 2. grep：行匹配（质检员）

### 2.1 基本用法

```bash
grep "error" app.log            # 输出包含 error 的行
grep -i "error" app.log         # 忽略大小写
grep -v "^#" nginx.conf         # 反选：排除以 # 开头的行
grep -c "error" app.log         # 只统计匹配行数
grep -n "error" app.log         # 显示行号
grep -o "[0-9.]*" app.log       # 只输出匹配的部分（而非整行）
grep -r "TODO" ./src            # 递归搜索目录
grep -l "error" /var/log/*.log  # 只列出包含匹配的文件名
```

**要点**：

- `-o` 在提取 IP、端口等片段时很常用
- `-l` 常用于定位"哪些文件有问题"
- grep 的退出码 0/1/2 分别表示"有匹配/无匹配/出错"，可在脚本中做条件判断

### 2.2 正则表达式

```bash
grep -E "err|warn" app.log      # -E 启用扩展正则，匹配 error 或 warn
grep -E "^[0-9]{4}-" app.log    # 以 4 位数字加 - 开头（如日期）
grep -E "(GET|POST) /api" log   # 分组匹配
grep "error\." app.log          # 基本正则：\. 匹配字面点号
```

**常用正则元字符**：

| 元字符 | 含义 |
| :--- | :--- |
| `^` / `$` | 行首 / 行尾 |
| `.` | 任意字符 |
| `*` | 前项重复 0 次以上 |
| `+` | 重复 1 次以上（需 -E） |
| `[]` | 字符集 |
| `\|` | 或 |

**建议**：统一加 `-E` 使用扩展正则，更易读。

## 3. sed：流编辑（修理工）

### 3.1 替换与删除

```bash
sed 's/old/new/' file           # 每行第一次出现的 old 替换为 new
sed 's/old/new/g' file          # 全局替换（g = global）
sed -i 's/old/new/g' file       # 直接写回原文件（-i = in-place）
sed -i.bak 's/old/new/g' file   # 写回前先备份为 file.bak
sed '/^#/d' file                # 删除注释行（d = delete）
sed '1,5d' file                 # 删除第 1 到第 5 行
```

**安全要点**：`sed -i` 修改原文件，务必先用不加 `-i` 的命令预览结果。

**可移植性**：GNU sed（Linux）的 `-i` 可不带后缀直接用；macOS/BSD sed 的 `-i` 必须带后缀参数，写成 `sed -i '' 's/a/b/g' file`。跨平台脚本统一用 `sed -i.bak` 最稳。

### 3.2 打印与插入

```bash
sed -n '10,20p' file            # 只打印第 10-20 行（-n 关闭默认输出）
sed -n '/ERROR/,/END/p' file    # 打印从 ERROR 到 END 之间的行
sed -i '3a\new_line' file       # 在第 3 行后插入一行（a = append）
sed -i '3i\new_line' file       # 在第 3 行前插入一行（i = insert）
```

sed 默认会把每一行都打印出来，`-n` 配合 `p` 才做到"只看想看的行"。

### 3.3 捕获分组

```bash
# 将 "name=alice" 改为 "name=ALICE"（\U 转大写为 GNU sed 专属，macOS/BSD sed 不支持）
echo "name=alice" | sed -E 's/(name=)(.*)/\1\U\2/'
# 提取日期：2026-08-01 -> 08/01/2026
echo "2026-08-01" | sed -E 's/([0-9]{4})-([0-9]{2})-([0-9]{2})/\2\/\3\/\1/'
```

`(...)` 捕获分组，`\1`、`\2` 引用分组内容；GNU sed 的 `\U` 可将后续内容转大写（可移植替代：`tr 'a-z' 'A-Z'` 或 awk 的 `toupper()`）。分组替换是 sed 进阶的核心能力。

捕获组的读法逐步拆（以日期改写为例）：

```bash
echo "2026-08-01" | sed -E 's/([0-9]{4})-([0-9]{2})-([0-9]{2})/\2\/\3\/\1/'
#                          └──分组1──┘  └─分组2─┘ └─分组3─┘  └替换段按 2/3/1 重组┘
```

- 三对括号各捕获一段：年、月、日；替换段用 `\2/\3/\1` 把它们重排成 月/日/年——**捕获组的价值是「保留原文的片段再重组」，不是匹配本身**；
- 为什么用 `-E`：扩展正则的括号不需要转义（`(...)` 直接生效），基本正则要写 `\( \)`——前者可读性高得多；
- 逐段自检方法：先把替换段写成 `\1-\2-\3`（原样回显）确认分组对位，再改成目标格式——直接写复杂替换段出错时不知道是分组错了还是重排错了。

### 3.4 awk 的 match 提取：正则捕获在列处理里的形态

sed 只能改写文本；要「从一行里抠出片段再放进计算」，awk 的 `match` + `substr` 是正解：

```bash
# 从混合日志行里提取时间戳（任意位置的 HH:MM:SS）
awk 'match($0, /[0-9]{2}:[0-9]{2}:[0-9]{2}/) {
       print substr($0, RSTART, RLENGTH)
     }' app.log

# 提取 IPv4 并统计 top 5（正则抠出 + 关联数组计数）
awk 'match($0, /([0-9]{1,3}\.){3}[0-9]{1,3}/) {
       ip = substr($0, RSTART, RLENGTH)
       cnt[ip]++
     }
     END { for (i in cnt) print cnt[i], i }' app.log \
  | sort -rn | head -5
```

逐段讲：

- `match(s, re)` 在字符串里找正则，命中返回真并把位置写进内置变量 `RSTART`（起始）、`RLENGTH`（长度）——awk 的正则捕获不像 sed 有 `\1`，**捕获结果靠 RSTART/RLENGTH 切片子串**拿到；
- `substr($0, RSTART, RLENGTH)` 就是切出命中片段——写一次就成了「提取器」模板，换正则就换提取目标；
- IP 的正则 `([0-9]{1,3}\.){3}[0-9]{1,3}`：三组「1-3 位数字加点」加最后一组数字——它不校验 0-255 的合法性（那个正则会写很长），**提取场景接受过宽的正则，校验交给下游**（sort/uniq 之后的肉眼或脚本）；
- 与第 5 节的 `awk '{print $1}'` 对比：按列取 IP 依赖「IP 恰好是第一列」的格式假设，match 提取不依赖列位置——日志格式不规整时（IP 出现在错误消息中间），match 是唯一稳定方案。

什么时候用哪个：结构规整（列固定）→ `awk '{print $N}'`；片段在行内位置不定 → sed 捕获组（要改写）或 awk match（要统计）。

## 4. awk：列处理与统计（会计）

awk 按"字段"工作：默认以空白（空格/制表符）分隔每一行，`$1`、`$2` 为第 1、2 列，`$0` 为整行。

### 4.1 取列与条件

```bash
awk '{print $1}' access.log          # 打印第一列（通常是 IP）
awk '{print $1, $9}' access.log      # 打印第 1 和第 9 列
awk -F: '{print $1}' /etc/passwd     # -F 指定分隔符为冒号
awk '$9 == 404 {print $1, $7}' log   # 只处理状态码为 404 的行
awk '$3 > 100 {print $0}' data.txt   # 第三列大于 100 的行
```

`-F` 可以指定任意分隔符，处理 `/etc/passwd`（冒号分隔）、CSV（逗号分隔）时必不可少。`$9 == 404` 是"条件 + 动作"的典型结构。

### 4.2 内置变量

| 内置变量 | 含义 |
| --- | --- |
| `NF` | 当前行的字段数（`$NF` 为最后一个字段） |
| `NR` | 已读入的行号（累计） |
| `FNR` | 当前文件中的行号 |
| `FS` | 输入字段分隔符（等价 -F） |
| `OFS` | 输出字段分隔符，默认空格 |

```bash
awk '{print NF, $NF}' data.txt    # 打印字段数和最后一个字段
awk 'NR==1 {print "表头:", $0}' f  # 处理第一行（表头）
awk -F, '{sum += $3} END {print "总和:", sum}' sales.csv
```

`$NF` 在日志分析中提取 URL、文件路径等"最后一列"时非常实用。`END { }` 块在所有行处理完后执行一次，用于输出统计结果。

### 4.3 统计与格式化

```bash
# 按第一列（IP）分组计数，输出前 10 名
awk '{cnt[$1]++} END {for (ip in cnt) print cnt[ip], ip}' access.log \
    | sort -rn | head -10

# 求平均值并格式化输出
awk '{sum += $2; n++} END {printf "平均: %.2f\n", sum/n}' data.txt
```

awk 的关联数组 `cnt[ip]` 天然适合分组统计，`for (ip in cnt)` 遍历所有键。`printf` 与 C 语言语法一致，`%.2f` 保留两位小数，适合生成报表。

## 5. 管道组合实战

三剑客单独使用威力有限，**串联起来才是生产级用法**。以下以 Nginx 访问日志 `access.log`（格式：IP 日期 请求 状态码 大小 来源）为例：

```bash
# 统计每个 IP 的访问次数，取 TOP 10
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10

# 统计各状态码数量
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# 找出 404 页面并去重
awk '$9 == 404 {print $7}' access.log | sort -u

# 提取某一分钟（5 分钟前）的日志行数；date -d 为 GNU 专属，macOS 用 date -v-5M
grep -c "$(date -d '5 minutes ago' '+%d/%b/%Y:%H:%M')" error.log
```

```text
输出示例（TOP IP 统计）：
    452 10.0.0.12
    301 10.0.0.33
    128 10.0.0.7
```

**核心套路**：`sort | uniq -c | sort -rn` 是"分组计数 + 排序"的标准三段式——先排序使相同行相邻，`uniq -c` 计数，再按数值倒序排。`$(...)` 命令替换让 grep 的匹配模式动态生成。

## 6. 常见误区

**误区一：grep、sed、awk 都要背下所有选项。** → 记住最常用的 10 个用法（本章已覆盖），其余用 `man` 查。

**误区二：正则表达式和通配符混淆。** → 文件名匹配用通配符，内容匹配用正则（grep -E）。

**误区三：`sed -i` 不预览直接改。** → 危险！先不加 `-i` 运行一次看输出，确认后再写回。

**误区四：awk 只用来"打印列"。** → awk 的真正威力是统计（关联数组 + END 块），打印列只是入门。

**误区五：什么都用三剑客硬写。** → 复杂逻辑（超过 20 行的 awk）应该用 Python/Perl，三剑客保持"短小精悍"。

## 7. 动手实践

先只读任务与提示，自己写完再展开参考命令。构造练习素材：`printf '2026-10-07 12:01:33 GET /api/items 200 12ms\n2026-10-07 12:01:34 GET /api/users 404 3ms\n' > demo.log`

**任务一：从 demo.log 提取两个片段。** 要求：a) 只输出分钟数（每行的第 2 个时间字段 MM）；b) 输出「路径 状态码」两列，用一次 awk 完成。

提示：a 可用 sed 捕获组，也可用 awk 列引用；b 注意字段下标（空白分隔后各在第几列）。

<details>
<summary>任务一参考命令</summary>

```bash
# a) sed 版：捕获「时:分」中的分
sed -E 's/^[0-9-]+ [0-9]{2}:([0-9]{2}):.*/\1/' demo.log
# a) awk 版：按冒号二次切分
awk '{split($2, t, ":"); print t[2]}' demo.log

# b) 路径是第 3 列、状态码是第 4 列
awk '{print $3, $4}' demo.log
```

自查：两个 a 版本输出一致（01、01）。sed 版胜在不依赖列位、awk 版胜在「切了还能再用」——`split` 是 awk 在单列内再做列处理的标准工具。
</details>

**任务二：统计 404 的分钟分布。** 要求：输出每个出现 404 的分钟及次数，按次数倒序。这题综合第 3.4 节的提取与第 4.3 节的关联数组。

<details>
<summary>任务二参考命令</summary>

```bash
awk '$NF ~ /404/ || $4 == 404 {split($2, t, ":"); cnt[t[2]]++}
     END {for (m in cnt) print cnt[m], m}' demo.log | sort -rn
```

更稳的写法是只认列：`awk '$4 == 404 {split($2, t, ":"); cnt[t[2]]++} END {for (m in cnt) print cnt[m], m}'`。自查：`$NF ~ /404/` 会把耗时里的 404 也算进去（如 404ms），**按精确列判断优先于正则匹配行**——这是「结构规整时不用正则」原则的实例。
</details>

**任务三：把本篇的三剑客分工讲给别人听。** 不看原文，用三句话向同事解释「查错误日志里哪个接口最慢」该用哪三步组合、为什么是这三个工具各管一步。

<details>
<summary>任务三参考表述</summary>

grep 筛出含 ERROR 的行（质检员：先把范围缩小）；awk 取出每行的耗时列和接口列（会计：只留关心两个字段）；`sort -rn | head` 按耗时排序取最慢——三步各管「筛选、取列、排序」，任何一个单独干都不顺手，串成管道才是命令行的组合思维（第 5 节核心套路的应用）。能流畅讲出这三句，本篇的目标就达成了。
</details>
