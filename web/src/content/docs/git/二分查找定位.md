---
order: 71
title: 'git-bisect'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git bisect二分查找：自动化定位引入Bug的提交。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/Git原理与对象模型
  - git/标签管理
  - git/子模块管理
  - git/稀疏检出
prerequisites:
  - git/语法速查
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
