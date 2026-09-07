---
order: 300
title: git-bisect
module: 'git'
category: 工具链
difficulty: intermediate
description: git bisect二分查找：自动化定位引入Bug的提交。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'git/028-GitPrincipleObjectModel'
  - 'git/029-TagManagement'
---

## 1. bisect 概述

### 1.1 什么是 bisect

`git bisect` 使用**二分查找算法**在提交历史中定位引入 Bug 的提交。

$$
\text{查找次数} = \lceil \log_2(n) \rceil
$$

其中 $n$ 为可疑提交数量。1000 个提交最多只需 10 次二分即可定位。

### 1.2 工作原理

```
已知: v1.0 正常，当前版本有 Bug

提交历史: A---B---C---D---E---F---G---H (HEAD)

第1次: 检查 D →  (Bug 存在)
第2次: 检查 B →  (正常)
第3次: 检查 C →  (Bug 存在)
→ 结论: C 引入了 Bug
```

## 2. 基本用法

### 2.1 手动 bisect

```bash
# 1. 启动 bisect
git bisect start

# 2. 标记当前版本为有 Bug
git bisect bad

# 3. 标记已知正常的版本
git bisect good v1.0.0
# Bisecting: 5 revisions left to test
# [abc1234] some commit

# 4. 测试当前检出的版本
# 如果有 Bug
git bisect bad
# 如果正常
git bisect good

# 5. 重复步骤4，直到找到引入 Bug 的提交
# abc1234 is the first bad commit

# 6. 结束 bisect
git bisect reset
```

### 2.2 自动 bisect

```bash
# 提供测试脚本
git bisect start HEAD v1.0.0
git bisect run test.sh

# test.sh 返回值:
# 0 - 正常（good）
# 1-124, 126-127 - 有 Bug（bad）
# 125 - 无法测试（skip）
# 128+ - 中止 bisect
```

### 2.3 测试脚本示例

```bash
#!/bin/bash
# test.sh - 测试脚本

# 运行测试
npm test

# 返回测试结果
if [ $? -eq 0 ]; then
    exit 0    # 测试通过 → good
else
    exit 1    # 测试失败 → bad
fi
```

## 3. 高级用法

### 3.1 跳过无法测试的提交

```bash
git bisect skip    # 当前提交无法测试
git bisect skip abc1234 def5678  # 跳过指定提交
```

### 3.2 查看进度

```bash
git bisect log     # 查看 bisect 日志
git bisect visualize  # 可视化剩余范围
git bisect view       # 同上
```

### 3.3 重放 bisect

```bash
# 保存 bisect 日志
git bisect log > bisect-log.txt

# 重放
git bisect replay bisect-log.txt
```

## 4. 实际场景

### 4.1 定位性能回归

```bash
#!/bin/bash
# performance-test.sh

# 运行性能测试
time=$(./run-benchmark.sh | grep "Total time" | awk '{print $3}')

# 如果超过阈值，标记为 bad
if (( $(echo "$time > 5.0" | bc -l) )); then
    exit 1  # 性能退化
else
    exit 0  # 性能正常
fi
```

### 4.2 定位编译错误

```bash
#!/bin/bash
# build-test.sh

npm run build > /dev/null 2>&1
exit $?
```
## 启动与基本流程

**基本写法：启动二分查找**
`git bisect start`
```bash
# 进入 bisect 模式
git bisect start
```

---

**基本写法：标记当前提交为坏**
`git bisect bad [<提交>]`
```bash
# 标记 HEAD 为有问题的提交
git bisect bad
```

---

**基本写法：标记已知的好提交**
`git bisect good <提交>`
```bash
# 指定一个正常的旧提交
git bisect good v1.0.0
```

---

**基本写法：一行启动并指定好坏**
`git bisect start <坏提交> <好提交>`
```bash
# 同时指定坏起点与好起点
git bisect start HEAD v1.0.0
```

---

## 标记测试结果

**基本写法：当前提交标记为好**
`git bisect good`
```bash
# 当前测试通过，继续二分
git bisect good
```

---

**基本写法：当前提交标记为坏**
`git bisect bad`
```bash
# 当前测试失败，继续二分
git bisect bad
```

---

**基本写法：跳过当前提交**
`git bisect skip`
```bash
# 跳过无法测试的提交
git bisect skip
```

---

## 查看状态

**基本写法：查看二分状态**
`git bisect status`
```bash
# 显示当前 bisect 进度
git bisect status
```

---

**基本写法：查看剩余待测提交**
`git bisect visualize`
```bash
# 用 git log 查看剩余范围
git bisect visualize
```

---

**基本写法：查看已测试提交日志**
`git bisect log`
```bash
# 输出 bisect 操作过程
git bisect log
```

---

## 自动化二分

**基本写法：自动二分测试**
`git bisect run <命令> [<参数>]`
```bash
# 用测试脚本自动定位首坏提交
git bisect run npm test
```

---

**基本写法：通过脚本退出码判定**
`git bisect run <脚本>`
```bash
# 125 表示跳过，0 好，1-124 坏
git bisect run ./scripts/check-bug.sh
```

---

**基本写法：编译并测试**
`git bisect run <命令1> && <命令2>`
```bash
# 先编译再测试
git bisect run sh -c 'make && make test'
```

---

## 范围控制

**基本写法：限定路径范围**
`git bisect start -- <路径>`
```bash
# 只二分指定路径下的变更
git bisect start -- src/auth
```

---

**基本写法：排除某些提交**
`git bisect skip <提交1> <提交2>`
```bash
# 跳过多条已知不可测提交
git bisect skip abc1234 def5678
```

---

## 结束与回退

**基本写法：结束二分查找**
`git bisect reset`
```bash
# 退出 bisect 模式回到原分支
git bisect reset
```

---

**基本写法：结束后切回指定分支**
`git bisect reset <分支>`
```bash
# 退出并切回 main 分支
git bisect reset main
```

---

## 恢复中断的二分

**基本写法：记录二分过程到文件**
`git bisect log > <文件>`
```bash
# 保存当前 bisect 状态
git bisect log > bisect.log
```

---

**基本写法：从文件恢复二分状态**
`git bisect replay <文件>`
```bash
# 重新执行记录的 bisect 步骤
git bisect replay bisect.log
```

---

## 查看引入问题的提交

**基本写法：定位首坏提交后查看**
`git show <提交>`
```bash
# 查看被 bisect 锁定的提交内容
git show HEAD
```

---

**基本写法：查看引入问题的差异**
`git diff <好提交> <坏提交>`
```bash
# 查看好坏提交之间的差异
git diff v1.0.0 HEAD
```
