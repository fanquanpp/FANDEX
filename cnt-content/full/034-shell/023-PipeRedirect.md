---
order: 230
title: 管道与重定向命令速查手册
module: 'shell'
category: 工具链
difficulty: beginner
description: 标准输入输出重定向、管道、tee 与 xargs 的速查。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'shell/001-ShellBasics'
  - 'shell/002-CommandLineBasics'
  - 'shell/022-TextProcessing'
  - 'shell/024-ProcessManage'
prerequisites:
  - 'shell/002-CommandLineBasics'
---

## 标准输出重定向

**基本用法:覆盖写入文件**
`<命令> > <文件>`

```bash
# 把命令输出写入文件(覆盖)
ls -la > files.txt

# 把错误信息也写入同一文件
ls /nope > result.txt 2>&1
```

---

**基本用法:追加写入文件**
`<命令> >> <文件>`

```bash
# 追加日志到末尾
echo "done" >> build.log
```

---

## 标准输入重定向

**基本用法:从文件读取输入**
`<命令> < <文件>`

```bash
# 从文件读取内容统计行数
wc -l < data.txt
```

---

## 标准错误重定向

**基本用法:重定向错误输出**
`<命令> 2> <文件>`

```bash
# 仅丢弃错误信息
find / -name "*.conf" 2> /dev/null

# 错误追加到日志
make build 2>> error.log
```

---

**基本用法:合并标准输出与错误**
`<命令> &> <文件>`

```bash
# 同时收集输出和错误到同一文件
npm install &> install.log
```

---

## 管道

**基本用法:连接命令**
`<命令1> | <命令2>`

```bash
# 翻页查看长输出
ls -la | less

# 过滤后再统计
grep "ERROR" app.log | wc -l

# 多级管道处理
cat access.log | grep "404" | awk '{print $7}' | sort | uniq -c | sort -nr | head
```

---

## tee 双向输出

**基本用法:同时输出到屏幕和文件**
`<命令> | tee <文件>`

```bash
# 屏幕显示并写入日志
make test | tee test.log

# 追加模式
echo "step2" | tee -a progress.log
```

---

## xargs 参数传递

**基本用法:把输入转为参数**
`<命令> | xargs <命令>`

```bash
# 批量删除查找到的文件
find . -name "*.tmp" | xargs rm -f

# 每行一个参数执行
cat urls.txt | xargs -n1 curl -I

# 指定替换位置
ls *.bak | xargs -I{} mv {} archive/

# 并行执行 4 个
find . -name "*.png" | xargs -P4 -n1 optipng
```

---

## 进程替换

**基本用法:对比两个命令输出**
`diff <(<命令1>) <(<命令2>)`

```bash
# 对比两个目录文件列表
diff <(ls dir1) <(ls dir2)
```

---

## here document

**基本用法:多行输入**
`<命令> << <结束标记>`

```bash
# 多行写入文件
cat > note.txt <<EOF
第一行内容
第二行内容
EOF
```
