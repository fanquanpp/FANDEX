---
order: 190
title: git-blame
module: 'git'
category: 工具链
difficulty: intermediate
description: git blame详解：逐行追溯代码作者、时间与提交，辅助代码审查与问题定位。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/180-GitLogDetailed'
  - 'git/110-HEADPointerBranchEssence'
  - 'git/340-GitHookGitLFS'
prerequisites: []
---

## 1. git blame 概述

### 1.1 什么是 git blame

`git blame` 逐行显示文件的**最后修改信息**，包括提交哈希、作者、时间和行内容。

```bash
git blame README.md
# abc1234d (Zhang San 2026-06-10 10:00:01 +0800  1) # My Project
# def5678e (Li Si     2026-06-12 14:30:22 +0800  2)
# abc1234d (Zhang San 2026-06-10 10:00:01 +0800  3) ## Getting Started
```

### 1.2 输出格式

```
哈希前缀 (作者 日期 时间 时区 行号) 行内容
```

## 2. 基本用法

### 2.1 常用选项

```bash
# 显示完整哈希
git blame -l file.txt

# 只显示邮箱
git blame -e file.txt

# 显示行号
git blame -n file.txt

# 从指定行开始
git blame -L 10,20 file.txt       # 第10到20行
git blame -L 10,+5 file.txt       # 第10行起5行
git blame -L :function file.txt   # 函数范围（需语言支持）

# 忽略空白变更
git blame -w file.txt

# 忽略移动/复制
git blame -M file.txt             # 检测行移动
git blame -C file.txt             # 检测行复制
git blame -C -C file.txt          # 更严格的复制检测
```

### 2.2 指定版本

```bash
# 查看指定提交时的 blame
git blame abc1234 -- file.txt

# 查看指定分支的 blame
git blame main -- file.txt
```

## 3. 高级用法

### 3.1 追踪重命名

```bash
# 跟踪文件重命名
git blame -M --follow file.txt
```

### 3.2 忽略特定提交

```bash
# 忽略格式化提交
git blame --ignore-rev abc1234 file.txt

# 从文件读取忽略列表
git blame --ignore-revs-file .git-blame-ignore-revs file.txt
```

### 3.3 增量 blame

```bash
# 只看最近 N 次提交的 blame
git blame --since="2 weeks ago" file.txt
```

## 4. 实际应用

### 4.1 定位 Bug 引入者

```bash
# 找到问题行的提交
git blame -L 42,42 src/auth.ts
# abc1234 (Zhang San 2026-05-20)  const token = getPassword();

# 查看该提交的详情
git show abc1234
```

### 4.2 代码审查辅助

```bash
# 找出最近修改的行
git blame --since="1 month ago" src/index.ts

# 找出某作者的修改
git blame -e src/index.ts | grep "zhang@example.com"
```

### 4.3 统计贡献

```bash
# 按作者统计行数
git blame file.txt | awk '{print $2}' | sort | uniq -c | sort -rn
```

## 5. blame 替代工具

| 工具                  | 特点                |
| :-------------------- | :------------------ |
| **git annotate**      | `git blame` 的别名  |
| **VS Code GitLens**   | 行级 blame 内联显示 |
| **GitHub blame view** | 在线 blame 界面     |
## 基本用法

**基本写法：查看文件每行最后修改者**
`git blame <文件>`
```bash
# 显示 src/main.py 每行的作者与提交
git blame src/main.py
```

---

**基本写法：限定行范围**
`git blame -L <起始>,<结束> <文件>`
```bash
# 仅查看第 10 到 30 行的归属
git blame -L 10,30 src/main.py
```

---

**基本写法：限定起始行到文件末尾**
`git blame -L <起始> <文件>`
```bash
# 从第 50 行到文件末尾
git blame -L 50 src/main.py
```

---

## 提交范围控制

**基本写法：从指定提交开始追溯**
`git blame <提交> -- <文件>`
```bash
# 从 v1.0.0 标签开始追溯
git blame v1.0.0 -- src/main.py
```

---

**基本写法：限定追溯范围**
`git blame <起点>..<终点> -- <文件>`
```bash
# 仅在指定提交范围内追溯
git blame v1.0.0..HEAD -- src/main.py
```

---

**基本写法：查看更早版本**
`git blame <提交>^ -- <文件>`
```bash
# 查看上一次提交时的归属
git blame HEAD^ -- src/main.py
```

---

## 输出格式

**基本写法：显示完整哈希**
`git blame -l <文件>`
```bash
# 显示 40 位完整提交哈希
git blame -l src/main.py
```

---

**基本写法：显示作者邮箱**
`git blame -e <文件>`
```bash
# 用邮箱代替作者姓名
git blame -e src/main.py
```

---

**基本写法：显示提交时间**
`git blame -t <文件>`
```bash
# 显示原始时间戳而非日期
git blame -t src/main.py
```

---

**基本写法：空提交敏感模式**
`git blame -w <文件>`
```bash
# 忽略空白变更的提交
git blame -w src/main.py
```

---

## 行追踪

**基本写法：追踪行移动**
`git blame -M <文件>`
```bash
# 检测同一文件内的行移动
git blame -M src/main.py
```

---

**基本写法：检测跨文件复制移动**
`git blame -C <文件>`
```bash
# 检测从其他文件复制的行
git blame -C src/main.py
```

---

**基本写法：全仓库范围检测复制**
`git blame -CCC <文件>`
```bash
# 在所有提交中检测复制来源
git blame -CCC src/main.py
```

---

**基本写法：指定移动检测阈值**
`git blame -M<数量> <文件>`
```bash
# 设置移动检测的最小字符数
git blame -M20 src/main.py
```

---

## 增量查看

**基本写法：限制每次显示行数**
`git blame --incremental <文件>`
```bash
# 增量输出便于程序解析
git blame --incremental src/main.py
```

---

**基本写法：显示边界提交**
`git blame --root <文件>`
```bash
# 将根提交也标记为边界
git blame --root src/main.py
```

---

## annotate 命令

**基本写法：使用 annotate（blame 别名）**
`git annotate <文件>`
```bash
# annotate 等价于 blame
git annotate src/main.py
```

---

**基本写法：annotate 限定范围**
`git annotate -L <起始>,<结束> <文件>`
```bash
# annotate 限定行范围
git annotate -L 1,20 src/main.py
```

---

## 实用场景

**基本写法：定位 bug 引入提交**
`git blame -L <行>,<行> <文件>`
```bash
# 定位某行代码的最后修改提交
git blame -L 42,42 src/main.py
```

---

**基本写法：查看某行完整提交信息**
`git show <提交>`
```bash
# 查看 blame 找到的提交详情
git show abc1234
```

---

**基本写法：忽略某些提交**
`git blame --ignore-rev <提交> <文件>`
```bash
# 跳过指定提交（如格式化提交）
git blame --ignore-rev abc1234 src/main.py
```

---

**基本写法：通过文件配置忽略列表**
`git blame --ignore-revs-file <文件> <目标文件>`
```bash
# 从文件读取要忽略的提交列表
git blame --ignore-revs-file .git-blame-ignore revs.txt src/main.py
```

---

**基本写法：配置默认忽略文件**
`git config blame.ignoreRevsFile <文件>`
```bash
# 配置项目默认的 blame 忽略文件
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

---

**基本写法：按颜色高亮输出**
`git blame --color-by-age <文件>`
```bash
# 按提交年龄着色显示
git blame --color-by-age src/main.py
```

---

**基本写法：按作者着色**
`git blame --color-lines <文件>`
```bash
# 同一作者的行用相同颜色
git blame --color-lines src/main.py
```

---

## 与其他命令配合

**基本写法：blame 找到提交后查看历史**
`git log -p <提交> -- <文件>`
```bash
# 查看指定提交对该文件的所有改动
git log -p abc1234 -- src/main.py
```

---

**基本写法：定位后用 bisect 深入**
`git bisect start && git bisect bad HEAD && git bisect good <提交>`
```bash
# 由 blame 结果启动二分查找
git bisect start && git bisect bad HEAD && git bisect good abc1234
```
