---
order: 170
title: 管道与重定向速查手册
module: 'shell'
category: 工具链
difficulty: beginner
description: 标准输入输出重定向、管道、tee、xargs 与进程替换速查：写法、预期输出与顺序陷阱
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/150-ShellBasics'
  - 'shell/130-CommandLineBasics'
  - 'shell/210-TextProcessing'
  - 'shell/230-ProcessManage'
prerequisites:
  - 'shell/130-CommandLineBasics'
---


本篇是重定向与管道的**速查手册**：先建立"三条流"的心智模型（不理解时行为会很反直觉），再按"输出、输入、管道、批量执行、高级替换"分类给用法与预期输出；原理与教学见《Shell 脚本编程基础》。

## 0. 心智模型：每个进程自带三条流

Linux 下每个进程启动时自动带上三个数据通道：

```mermaid
flowchart LR
    CMD["命令（进程）"] -->|"1 stdout 标准输出"| OUT["屏幕/文件/下一命令"]
    CMD -->|"2 stderr 标准错误"| ERR["屏幕/日志文件"]
    IN["键盘/文件/上一命令"] -->|"0 stdin 标准输入"| CMD
```

- `0` stdin：命令读数据的入口（默认键盘）
- `1` stdout：正常结果的出口（默认屏幕）
- `2` stderr：报错信息的出口（默认屏幕）

重定向就是**改接这些通道的去向**；管道就是把上一条命令的 stdout 接到下一条命令的 stdin。数字 0/1/2 出现在所有重定向语法里，先记住对应关系，下面的写法就都能看懂。

## 1. 标准输出重定向

**覆盖写入** `<命令> > <文件>`

```bash
ls -la > files.txt          # 输出写入文件（文件不存在则创建，存在则清空）
```

**追加写入** `<命令> >> <文件>`

```bash
echo "done" >> build.log    # 追加到文件末尾，不清空原内容
```

**合并错误** `<命令> > 文件 2>&1` 或 `&>`

```bash
ls /nope > result.txt 2>&1  # stdout 进 result.txt，stderr 也跟着进去
npm install &> install.log  # bash 简写：stdout+stderr 一起进文件
ls /nope &>> all.log        # bash 4+ 简写：追加模式合并
```

**顺序陷阱**：`2>&1` 的含义是"让 2 指向 1 **当前**指向的地方"，因此顺序决定结果：

```bash
cmd > f.txt 2>&1    # 正确：1 先指向 f.txt，2 再跟过去 -> 都进 f.txt
cmd 2>&1 > f.txt    # 错误：2 先指向屏幕（1 的旧去处），1 再改到 f.txt -> 错误仍上屏
```

**丢弃输出**：黑洞文件 `/dev/null` 写入即丢弃：

```bash
find / -name "*.conf" 2> /dev/null   # 只留结果，忽略无权限报错
command > /dev/null 2>&1             # 全部丢弃，只要退出码
```

## 2. 标准输入重定向

**从文件读** `<命令> < <文件>`

```bash
wc -l < data.txt    # 输出纯数字（不经过 stdin 时 wc 会在行首附文件名）
mail -s "report" admin@corp < body.txt
```

**here document：多行输入** `<< <结束标记>`

```bash
cat > note.txt <<EOF
第一行内容
第二行内容，变量 $HOME 会展开
EOF

cat > lock.sh <<'EOF'   # 定界符加引号：内容原样保留，不展开变量
echo '$HOME'
EOF
```

**here string：单字符串输入** `<<<`

```bash
grep -c "a" <<< "banana"      # 相当于把字符串当文件喂给命令
bc <<< "2^10"                 # 输出 1024
```

两者分工：多行内容用 heredoc，一行字符串懒得 echo 管道时用 here string。

## 3. 管道

**基本用法** `<命令1> | <命令2>`

```bash
ls -la | less
grep "ERROR" app.log | wc -l

# 多级管道：经典日志分析
cat access.log | grep "404" | awk '{print $7}' | sort | uniq -c | sort -rn | head
```

**管道只接 stdout**：stderr 不会进入管道。需要一起传给下游时先合并：

```bash
make 2>&1 | tee build.log    # 编译输出与报错都进 tee
```

**管道的退出码默认看最后一段**。想知道每一段的结果，用 `PIPESTATUS` 数组：

```bash
grep "ERROR" app.log | wc -l
echo "${PIPESTATUS[0]}"   # grep 的退出码（bash 专属，0 匹配 1 未匹配）
```

`set -o pipefail` 可让"管道中任一命令失败则整体失败"，是脚本健壮性标配（见《脚本调试与严格模式》）。

## 4. tee：一边过管道一边落盘

```bash
make test | tee test.log          # 屏幕实时显示，同时写入文件
echo "step2" | tee -a progress.log  # -a 追加模式
echo "conf" | sudo tee /etc/app.conf  # sudo 场景写 root 文件（sudo echo > 文件 不行）
```

最后一条是 tee 的杀手级用法：`>` 重定向由当前 Shell 执行、不享受 sudo 权限；`sudo tee` 则以 root 身份写入。排查长任务时 `| tee 日志` 能同时保住"实时观察"和"事后追溯"。

## 5. xargs：把输入变成参数

管道传递的是**数据流**，而有些命令（rm、cp、kill）只接受**参数**。xargs 是两者之间的转换器：

```bash
find . -name "*.tmp" | xargs rm -f          # 把找到的文件作为 rm 的参数
cat urls.txt | xargs -n1 curl -I            # 每次只给 curl 一个参数
ls *.bak | xargs -I{} mv {} archive/        # -I{} 指定占位符位置
find . -name "*.png" | xargs -P4 -n1 optipng  # -P4 并行跑 4 个进程
find . -name "*.log" -mtime +7 | xargs rm -f  # 删 7 天前的日志
```

**头号陷阱：文件名带空格**。`xargs` 默认按空白切词，`my file.txt` 会被拆成两个参数。安全姿势是"以 null 分隔"：

```bash
find . -name "*.tmp" -print0 | xargs -0 rm -f    # find -print0 + xargs -0：空格/换行都安全
```

**空输入陷阱**：输入为空时 xargs 仍会带"零参数"执行一次命令（`xargs rm -f` 尚无害，`xargs shutdown` 就吓人了），加 `-r`（GNU）表示"没有输入就不执行"：

```bash
find . -name "*.tmp" -print0 | xargs -0 -r rm -f
```

能用 `find -exec` 的简单场景可以不用 xargs：`find . -name "*.tmp" -exec rm -f {} +`（`+` 一次性批量传参，效率与 xargs 相当且无切词问题）。

## 6. 进程替换与文件描述符进阶

**进程替换** `<(命令)`：把命令的输出伪装成一个"文件"供只认文件名的命令使用：

```bash
# 对比两个目录的文件清单
diff <(ls dir1) <(ls dir2)

# 同一文件改前改后对比
diff <(sort a.txt) <(sort b.txt)

# 给只接受文件参数的工具喂命令输出
grep pattern <(curl -s https://example.com/robots.txt)
```

**多输出分流**：同一条命令的结果按用途写多个文件：

```bash
{ make 2>&1 | tee build.log; } > /dev/null   # 屏幕不刷屏，日志照落盘
cmd >out.log 2>err.log                       # 输出与错误分家，各记各的
```

**打开自定义通道**：`exec` 可在脚本里持久化一个输出通道，写日志不再反复 append：

```bash
exec 3>> app.log    # 3 号通道追加指向 app.log
echo "step1" >&3    # 多处写入同一日志，顺序有保障
echo "step2" >&3
exec 3>&-           # 用完关闭
```

日常脚本用得少，但读懂开源脚本的 `2>&3`、`>&3` 写法是必备知识。

## 7. 组合速查：排障三连

```bash
# 1. 找出占空间的大文件并安全删除（null 分隔防空格）
find /var/log -type f -size +100M -print0 | xargs -0 -r ls -lh
find /var/log -type f -name "*.gz" -mtime +30 -print0 | xargs -0 -r rm -f

# 2. 记录构建全程（输出+错误），退出码仍反映真实成败
set -o pipefail
make 2>&1 | tee build.log; echo "退出码: $?"

# 3. 两份配置做语义对比（排序后 diff）
diff <(sort old.conf) <(sort new.conf) && echo "无差异"
```

## 8. 小结

**初学者要点**：

- 三条流 0/1/2 对应 stdin/stdout/stderr；`>` 覆盖、`>>` 追加、`2>` 收错误、`2>&1` 合流
- 合流必须写成 `> 文件 2>&1`，顺序不能反
- 管道接的是 stdout，stderr 不跟上；`tee` 负责"既要看又要存"
- 文件名可能含空格时，find 用 `-print0`、xargs 用 `-0`

**进阶注意**：

- 管道退出码默认取最后一段，脚本判断成败要配 `pipefail` 或读 `PIPESTATUS`
- `sudo` 下写文件用 `sudo tee` 而不是 `sudo echo >`
- here document 定界符加引号可关闭变量展开；进程替换 `<(cmd)` 能喂饱只认文件名的命令
- `exec 3>` 自定义文件描述符是读懂复杂脚本的钥匙，写脚本时按需取用
