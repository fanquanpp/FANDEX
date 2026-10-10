---
order: 180
title: 管道与重定向：把命令接成流水线
module: 'shell'
category: 工具链
difficulty: beginner
description: 以"处置一次构建日志"为主线学管道与重定向：三条流心智模型、合并与分流、tee、xargs、进程替换与 pipefail，附坑点、自检与练习。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'shell/150-ShellBasics'
  - 'shell/130-CommandLineBasics'
  - 'shell/210-TextProcessing'
  - 'shell/190-ScriptDebugging'
prerequisites:
  - 'shell/130-CommandLineBasics'
---

## 真实场景：三千行构建日志，哪一行是错误

你在 CI 或本地跑一次构建，屏幕瞬间刷过几千行输出，最后失败了。滚动缓冲区里翻不到关键行，重跑一次又得等十分钟。你需要的其实是四个动作：**把输出留下来（重定向）、只看错误（分流）、筛出关键行并统计（管道）、把出问题的临时文件安全清掉（xargs）**。这四件事正好覆盖本篇全部内容。

## 先建心智模型：每个进程自带三条流

每个进程启动时自动带上三个数据通道：

```mermaid
flowchart LR
    CMD["命令（进程）"] -->|"1 stdout 标准输出"| OUT["屏幕/文件/下一命令"]
    CMD -->|"2 stderr 标准错误"| ERR["屏幕/日志文件"]
    IN["键盘/文件/上一命令"] -->|"0 stdin 标准输入"| CMD
```

- `0` stdin：命令读数据的入口（默认键盘）
- `1` stdout：正常结果的出口（默认屏幕）
- `2` stderr：报错信息的出口（默认屏幕）

重定向就是**改接这些通道的去向**；管道就是把上一条命令的 stdout 接到下一条命令的 stdin。数字 0/1/2 出现在所有重定向语法里，先记住对应关系，后面的写法就都能看懂。

## 动手：四步处置构建日志

### 第一步：把输出留下来

```bash
pnpm build > build.log          # stdout 进文件（文件不存在则创建，存在则清空）
pnpm build >> build.log         # 追加，不清空原内容
```

跑完发现 `build.log` 里缺了报错——因为**报错走的是 stderr，`>` 只接 stdout**。合并写法：

```bash
pnpm build > build.log 2>&1     # stdout 进文件，stderr 跟着进去
pnpm build &> build.log         # bash 简写：两者合并进文件
pnpm build &>> build.log        # bash 4+ 简写：合并且追加
```

**顺序陷阱必须现在搞懂**：`2>&1` 的含义是"让 2 指向 1 **当前**指向的地方"，所以顺序决定一切：

```bash
pnpm build > build.log 2>&1   # 正确：1 先指向文件，2 再跟过去 -> 都进文件
pnpm build 2>&1 > build.log   # 错误：2 先指向屏幕（1 的旧去处），1 再改到文件 -> 错误仍上屏
```

只想要退出码、输出全不要时，丢进黑洞 `/dev/null`：

```bash
pnpm build > /dev/null 2>&1                 # 全部丢弃，$? 里只剩退出码
find / -name "*.conf" 2> /dev/null          # 只要结果，无权限报错静音
```

### 第二步：只看错误、只看正常

stdout 与 stderr 分家落盘，事后按需查看：

```bash
pnpm build > out.log 2> err.log
```

标准输入也能改接来源。`< 文件` 把文件的 内容接到 stdin——和"把文件名当参数"结果常相同，但语义不同：

```bash
wc -l build.log     # 参数形式：输出带文件名，如 3201 build.log
wc -l < build.log   # stdin 形式：输出纯数字 3201（Shell 脚本里好取值）
mail -s "report" admin@corp < body.txt
```

多行输入不用临时文件，用 here document / here string：

```bash
# heredoc：多行内容直接喂给命令；定界符加引号则 $ 变量不展开
cat > deploy.env <<'EOF'
API_BASE=https://api.example.com
TOKEN=$SECRET          # 定界符 'EOF' 带引号，$SECRET 原样保留
EOF

# here string：一行字符串懒得 echo | 的场合
grep -c "a" <<< "banana"    # 输出 3
bc <<< "2^10"               # 输出 1024
```

### 第三步：筛出关键行并统计（管道）

```bash
grep -iE "error|failed" build.log | wc -l
cat build.log | grep "404" | awk '{print $7}' | sort | uniq -c | sort -rn | head
```

管道的两条暗规则：

**管道只接 stdout**。想让报错也流入下游（比如全部记进日志文件），先合并：

```bash
make 2>&1 | tee build.log    # 编译输出与报错都交给 tee
```

**退出码默认只看最后一段**。`grep "ERROR" build.log | wc -l` 中 grep 没匹配到（退出码 1）时，整条管道的退出码却是 wc 的 0——脚本会误判成功。两个解法：

```bash
grep "ERROR" build.log | wc -l
echo "${PIPESTATUS[0]}"      # bash 专属：读上一条管道中第一段的退出码

set -o pipefail              # 或让"任一段失败则整体失败"，脚本健壮性标配
```

需要"屏幕实时看 + 文件留底"时用 `tee`：

```bash
pnpm build 2>&1 | tee build.log       # 实时显示，同时写文件
echo "step2" | tee -a progress.log    # -a 追加模式
```

`tee` 还有一个杀手级用法：`>` 重定向由当前 Shell 执行、不享受 sudo 权限，所以 `sudo echo x > /etc/app.conf` 会报权限错误；正确写法是让 root 身份的 tee 来写：

```bash
echo "conf" | sudo tee /etc/app.conf
```

### 第四步：把出问题的产物安全清掉（xargs）

管道传的是**数据流**，而 rm、cp、kill 只接受**参数**。xargs 是两者之间的转换器：

```bash
find . -name "*.tmp" | xargs rm -f            # 把找到的文件作为 rm 的参数
cat urls.txt | xargs -n1 curl -I              # 每次只给 curl 一个参数
ls *.bak | xargs -I{} mv {} archive/          # -I{} 指定占位符位置
find . -name "*.png" | xargs -P4 -n1 optipng  # -P4 并行跑 4 个进程
find . -name "*.log" -mtime +7 | xargs rm -f  # 删 7 天前的日志
```

两个必须知道的陷阱：

**文件名带空格**。xargs 默认按空白切词，`my file.txt` 会被拆成两个参数。安全姿势是以 null 分隔：

```bash
find . -name "*.tmp" -print0 | xargs -0 rm -f    # 空格/换行都安全
```

**空输入仍会执行一次**。输入为空时 xargs 默认带零参数执行命令（`xargs rm -f` 无害，`xargs shutdown` 就吓人了）。GNU 下加 `-r`：没有输入就不执行：

```bash
find . -name "*.tmp" -print0 | xargs -0 -r rm -f
```

简单场景可以不用 xargs：`find . -name "*.tmp" -exec rm -f {} +`（`+` 一次性批量传参，效率相当且无切词问题）。

## 讲为什么：两条进阶机制

**进程替换 `<(命令)`**：把命令的输出伪装成"文件"，喂给只认文件名的命令：

```bash
diff <(ls dir1) <(ls dir2)              # 对比两个目录的文件清单
diff <(sort a.txt) <(sort b.txt)        # 排序后做语义对比
```

**自定义文件描述符 `exec 3>`**：脚本里持久开一个输出通道，多处写入同一日志且顺序有保障：

```bash
exec 3>> app.log    # 3 号通道追加指向 app.log
echo "step1" >&3
echo "step2" >&3
exec 3>&-           # 用完关闭
```

日常写脚本用得少，但读懂开源脚本里的 `2>&3`、`>&3` 是必备知识。

## 坑点与自检

**坑 1：`2>&1` 写反，报错"看不见"。** 现象是文件里只有一半输出，屏幕上刷着另一半。检查顺序：`> 文件` 必须在 `2>&1` 之前。

**坑 2：脚本里判断管道成败只看 `$?`。** 默认取最后一段的退出码。生产脚本开头 `set -euo pipefail`（见 [脚本调试与严格模式](/shell/190-ScriptDebugging)）。

**坑 3：`sudo` 写文件被拒。** 重定向由 Shell 执行，sudo 管不到 `>`；用 `sudo tee`。

自检——能不看文档回答这些吗：

1. `cmd 2>&1 > f.txt` 为什么错误还会上屏？
2. 管道里 grep 失败但整体退出码为 0，两种修法是什么？
3. `find` 配 `xargs` 处理"名字带空格的文件"，正确组合是哪两个参数？
4. heredoc 的定界符加引号改变了什么行为？

## 练习

1. 在 FANDEX 这类有脚本链的仓库里随便跑一条会大量输出的构建命令，分别用 `> f 2>&1`、`2>&1 > f`、`&>` 三种写法落盘，逐个打开文件对比 stderr 的去向，用一句话解释差异。
2. 写一条管道统计本仓库 md 文件中出现次数最多的 10 个词（`cat *.md | tr ' ' '\n' | grep -v '^$' | sort | uniq -c | sort -rn | head`），然后用 `PIPESTATUS` 打印每一段的退出码。
3. 制造三个名字带空格的临时文件，分别用不带 `-print0/-0` 和带 `-print0/-0` 的 find+xargs 删除，观察前者发生了什么，并改用 `find -exec {} +` 再删一次。

## 下一步

- 把管道思想用到文本处理命令上：[文本处理命令速查](/shell/210-TextProcessing)与[文本处理三剑客](/shell/200-TextProcessingTools)；
- 让"任一段失败即失败"成为脚本默认：[脚本调试与严格模式](/shell/190-ScriptDebugging)；
- 后台任务与信号控制：[进程与作业控制](/shell/220-ProcessJobControl)。
