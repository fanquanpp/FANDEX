---
order: 220
title: 文本处理命令速查手册
module: 'shell'
category: 工具链
difficulty: beginner
description: cat、grep、sed、awk 等常用文本处理命令的速查。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'shell/016-TextProcessingTools'
  - 'shell/023-PipeRedirect'
  - 'shell/025-CompressArchive'
  - 'shell/002-CommandLineBasics'
prerequisites:
  - 'shell/002-CommandLineBasics'
---

## cat 拼接查看

**基本用法:查看文件内容**
`cat [选项] <文件>`

```bash
# 显示文件内容并带行号
cat -n main.py

# 合并多个文件
cat header.md body.md footer.md > full.md
```

---

## head/tail 头尾查看

**基本用法:查看文件头部**
`head [选项] <文件>`

```bash
# 查看前 20 行
head -n 20 README.md

# 查看前 50 字节
head -c 50 data.bin
```

---

**基本用法:查看文件尾部**
`tail [选项] <文件>`

```bash
# 查看末尾 30 行
tail -n 30 error.log

# 实时追踪日志新增内容
tail -f application.log
```

---

## less 分页浏览

**基本用法:分页查看大文件**
`less <文件>`

```bash
# 分页查看(快捷键:q 退出,/ 搜索,n 下一个)
less large.log
```

---

## grep 文本搜索

**基本用法:搜索匹配行**
`grep [选项] <模式> <文件>`

```bash
# 显示行号并忽略大小写
grep -in "error" app.log

# 显示匹配行前后各 2 行
grep -C 2 "exception" trace.log

# 仅输出匹配部分
grep -oE "[0-9]{1,3}(\.[0-9]{1,3}){3}" access.log

# 反向匹配(显示不包含的行)
grep -v "DEBUG" app.log
```

---

## sed 流编辑

**基本用法:替换文本**
`sed [选项] <脚本> <文件>`

```bash
# 将第一个 old 替换为 new(原地预览)
sed 's/old/new/' file.txt

# 全局替换并打印
sed 's/foo/bar/g' file.txt

# 原地修改文件并备份
sed -i.bak 's/8080/3000/g' config.ini

# 删除空行
sed '/^$/d' messy.txt

# 删除第 3 到 5 行
sed '3,5d' data.txt
```

---

## awk 列处理

**基本用法:按列提取**
`awk [选项] <脚本> <文件>`

```bash
# 打印第一列
awk '{print $1}' access.log

# 指定分隔符打印第二列
awk -F: '{print $2}' users.txt

# 条件过滤:第二列大于 100
awk '$2 > 100 {print $1, $2}' scores.txt

# 统计行数
awk 'END {print NR}' file.txt

# 求第三列总和
awk '{sum += $3} END {print sum}' sales.csv
```

---

## cut 切分

**基本用法:按分隔符切分**
`cut [选项] <文件>`

```bash
# 按冒号切分取第一字段
cut -d: -f1 /etc/passwd

# 取第 1 到 3 字符
cut -c1-3 names.txt
```

---

## sort/uniq 排序去重

**基本用法:排序**
`sort [选项] <文件>`

```bash
# 数值倒序排序
sort -nr scores.txt

# 按第三列排序
sort -k3 -n data.txt
```

---

**基本用法:去重**
`uniq [选项] <文件>`

```bash
# 配合 sort 去重并计数
sort items.txt | uniq -c | sort -nr
```

---

## wc 统计

**基本用法:统计行数字数**
`wc [选项] <文件>`

```bash
# 统计行数
wc -l README.md

# 统计单词数
wc -w article.md
```
