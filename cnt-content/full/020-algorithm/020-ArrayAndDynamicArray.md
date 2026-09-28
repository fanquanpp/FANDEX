---
order: 20
title: "数组与动态数组：下标从 0 开始的原因"
module: 'algorithm'
category: 计算机科学
difficulty: beginner
description: "以「arr[i] 为什么是 O(1)」引入：连续内存与寻址公式、插入删除的搬家代价、list 扩容的均摊分析实测，双指针与滑动窗口技巧预告。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/030-SortAlgorithm'
  - 'algorithm/060-LinkedList'
  - 'algorithm/170-BinarySearchAlgorithms'
prerequisites:
  - 'algorithm/010-AlgorithmAnalysisBasics'
---

## 前置知识

- 已完成 [算法分析基础](/algorithm/010-AlgorithmAnalysisBasics)：会用大 O 描述代价、会用 timeit 验证。

## 学习目标

读完本文你将能够：

1. 用寻址公式解释数组随机访问 O(1) 与「下标从 0 开始」的原因；
2. 用实验证明数组中间插入/删除是 O(n)；
3. 解释动态数组扩容的倍增策略与均摊 O(1) 的含义，并实测 Python list 的容量增长；
4. 认识双指针/滑动窗口/前缀和三个数组技巧的适用信号。

预计 45 到 75 分钟。

## 1. 你现在要解决什么问题

「数组的下标为什么从 0 开始」是每个程序员的第一次哲学追问，答案藏在内存的物理现实里：**数组是一段连续的、等大小的格子**。访问第 i 个元素不需要数格子——一个乘法一个加法直接算出地址。理解这个物理模型，数组的一切性能特征都会变成「显然」。

## 2. 最小可运行实验：寻址公式与 O(1)

```python
import timeit

arr = list(range(1000000))          # 一百万个连续整数

# 访问首元素与末元素——理论上耗时相同
t_first = timeit.timeit(lambda: arr[0], number=1000000)
t_last  = timeit.timeit(lambda: arr[999999], number=1000000)
print(f"arr[0]      : {t_first:.3f}s / 百万次")
print(f"arr[999999] : {t_last:.3f}s / 百万次")
```

预期输出（数值因机器而异，两条几乎相等）：

```text
arr[0]      : 0.021s / 百万次
arr[999999] : 0.022s / 百万次
```

**寻址公式**：`arr[i] 的地址 = 数组首地址 + i × 单元素大小`。一次乘法一次加法，与 i 是 0 还是 999999 无关——这就是随机访问 O(1)，也是「下标从 0 开始」的原因：第 i 个元素的偏移量恰是 i × 大小，从 0 数起公式才干净。

## 3. 发生了什么：连续是把双刃剑

连续内存买来 O(1) 随机访问，卖掉两样东西：

**插入/删除要搬家**。在开头插入一个元素，后面一百万个全部右移一格：

```python
import timeit
arr = list(range(1000000))
t_head = timeit.timeit(lambda: arr.insert(0, -1), number=1000)
t_tail = timeit.timeit(lambda: arr.append(-1), number=1000)
print(f"头部插入 x1000: {t_head:.3f}s")   # 明显更慢：每次搬 100 万个
print(f"尾部插入 x1000: {t_tail:.3f}s")   # 几乎免费
```

预期输出趋势（数值因机器而异）：

```text
头部插入 x1000: 2.914s
尾部插入 x1000: 0.058s
```

头部插入是 O(n)、尾部追加均摊 O(1)——同一个结构，操作位置不同，代价差五个数量级。

## 4. 核心概念：动态数组的倍增扩容

Python 的 list、Java 的 ArrayList、C++ 的 vector 本质都是「动态数组」：内部预分配一块空间，满了就**申请一块约 1.5 到 2 倍大的新内存，整体搬家**。单次扩容是 O(n)，但按倍增策略，n 次追加的总搬移次数是 n 的常数倍——**均摊 O(1)**：偶尔贵一次，平均每次很便宜。

亲手看 Python list 的扩容（`sys.getsizeof` 返回对象占用字节数）：

```python
import sys
a = []
sizes = []
for i in range(100000):
    a.append(i)
    sizes.append(sys.getsizeof(a))
print(sizes[0], sizes[999], sizes[9999], sizes[99999])
```

预期输出（CPython 的具体序列因版本而异）：

```text
56 9040 87616 857184
```

读法：容量不是每次 +1，而是阶梯式跳涨——「容量快满 → 搬进更大的家」。把 sizes 画成折线，倍增的楼梯清晰可见。**均摊 O(1) 的直觉：搬 10 次家摊到 100000 次入住，平均每次近乎免费。**

## 5. 核心概念：数组三技巧的适用信号

数组是最考验「识别信号」的结构，三个高频技巧先认识名字：

- **双指针**：有序数组里找「两数之和」，一头一尾相向而行——把 O(n²) 降到 O(n)；
- **滑动窗口**：「最长不含重复字符的子串」，窗口右扩左收，每个元素只进出一遍；
- **前缀和**：「任意区间求和」被大量查询时，先算一遍累积和，区间和变成两次减法。

它们共同的底层依据都是「数组支持 O(1) 随机访问」——没有这条，一切技巧无从谈起。完整专题在排序与刷题手册篇展开（参考层）。

## 6. 修改实验

1. 用 `arr.insert(len(arr)//2, -1)`（中部插入）× 1000 计时，确认代价介于头尾之间且随数组增长而变差；
2. 对比 `arr.pop(0)`（头部弹出，O(n)）与 `collections.deque` 的 `popleft()`（O(1)）各 10 万次——这就是队列应该用什么实现的答案；
3. 把 `range(1000000)` 换成 `range(500000)` 再测扩容序列，验证「阶梯形状相同、绝对值减半」。

## 7. 小练习

预测题（先写答案再验证）：对含 100 万元素的 list，以下操作各是什么复杂度？

```python
arr[500000]          # 操作 A
arr.insert(999999, 1)  # 操作 B（尾部前一位）
arr.index(42)        # 操作 C（42 在数组里吗？在的话在最前）
```

修改题：把「删除列表中所有 0」的朴素写法（边遍历边 remove，O(n²) 且有跳项陷阱）改为一次遍历的 O(n) 写法（构建新列表），用 10 万元素实测对比。

修 Bug 题：同事在循环里反复 `arr.insert(0, x)` 收集「倒序日志」，百万条时卡死。指出复杂度问题并给出 O(n) 的替代（append 后反转），实测验证。

挑战题（不看提示）：只用「下标读写 + 长度」实现原地反转数组（首尾双指针交换），要求 O(n) 时间 O(1) 额外空间；用 100 万元素实测并与 `arr[::-1]`（Python 切片）耗时对比，解释切片为什么也不慢。

## 8. 什么时候应该 / 不应该用数组

应该：按下标随机访问为主、尾部增删为主、需要与算法技巧（二分/双指针/前缀和）配合的场景——数组是默认起点。

不应该：头部频繁插删（用 deque）；键值查找（用哈希表，070 篇）；中间频繁插删且顺序遍历为主（用链表，060 篇）——**结构的选型由「最常见的操作位置」决定**。

## 9. 与之前和之后的知识的关系

- 往前：010 的大 O 语言在本文落地成两组实测；
- 往后：[链表](/algorithm/060-LinkedList) 是连续内存的反面教材与互补者；[二分查找](/algorithm/170-BinarySearchAlgorithms) 的 O(log n) 建立在数组 O(1) 随机访问之上；[排序参考篇](/algorithm/030-SortAlgorithm) 的每种排序都在跟「搬移代价」搏斗；
- 更远：Python list、Java ArrayList、C++ vector、Go slice——你未来学的每个语言的「数组」，都是本文动态数组思想的方言。

## 10. 官方文档

- Python list 的时间复杂度 wiki：https://wiki.python.org/moin/TimeComplexity
- collections.deque（双端队列，头尾 O(1)）：https://docs.python.org/zh-cn/3/library/collections.html#collections.deque

## 11. 自我检查

- 能写出寻址公式并解释下标从 0 开始的原因；
- 能用实测数据说明「头插 O(n)、尾插均摊 O(1)」；
- 能解释倍增扩容与均摊 O(1) 的关系；
- 能对三个数组技巧说出各自的适用信号。

## 本章总结

数组用「连续内存」换来了 O(1) 随机访问，代价是中间插删的搬家；动态数组用倍增扩容把追加做到均摊 O(1)。选型只看一件事：你最常操作的位置在哪。下标从 0 开始不是惯例，是寻址公式的自然结论。

## 下一步

进入 [排序参考篇](/algorithm/030-SortAlgorithm)（参考层）：五种基础与主流排序算法的完整实现与对比，检验你刚建立的大 O 眼光。
