---
order: 940
title: Python array 与 bisect
module: 'python'
category: 后端技术
difficulty: beginner
description: Python array 与 bisect 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## array 数组

**基本写法：创建数组**
`array.array(<类型码>, <可迭代>)`
```python
# 创建紧凑类型数组
import array

a = array.array("i", [1, 2, 3, 4])  # 有符号整数
b = array.array("f", [1.5, 2.5])     # 单精度浮点
d = array.array("d", [3.14])         # 双精度浮点
```

**基本写法：类型码**
`"i"` | `"f"` | `"d"` | `"b"` | `"B"` | `"u"`
```python
# 常用类型码
# b: signed char  B: unsigned char
# i: signed int   I: unsigned int
# f: float        d: double
# u: unicode char（已弃用）
a = array.array("i")
print(a.typecode)
```

**基本写法：追加元素**
`a.append(<值>)` | `a.extend(<可迭代>)`
```python
# 追加元素
a = array.array("i", [1, 2])
a.append(3)
a.extend([4, 5])
```

**基本写法：插入元素**
`a.insert(<索引>, <值>)`
```python
# 在指定位置插入
a.insert(0, 0)
```

**基本写法：从文件读取**
`a.fromfile(<文件>, <数量>)`
```python
# 从二进制文件读取到数组
with open("data.bin", "rb") as f:
    a.fromfile(f, 100)
```

**基本写法：写入文件**
`a.tofile(<文件>)`
```python
# 数组写入二进制文件
with open("data.bin", "wb") as f:
    a.tofile(f)
```

**基本写法：转换为列表**
`a.tolist()`
```python
# 数组转列表
print(a.tolist())
```

**基本写法：bytes 与 frombytes**
`a.tobytes()` | `a.frombytes(<字节>)`
```python
# 数组与字节转换
data = a.tobytes()
a2 = array.array("i")
a2.frombytes(data)
```

**基本写法：反转与缓冲**
`a.reverse()` | `a.buffer_info()`
```python
# 反转数组与获取内存信息
a.reverse()
print(a.buffer_info())  # (地址, 长度)
```

---

## bisect 有序列表

**基本写法：bisect 查找插入位置**
`bisect.bisect(<有序列表>, <值>)`
```python
# 查找保持有序的插入位置
import bisect

a = [1, 3, 5, 7, 9]
print(bisect.bisect(a, 4))  # 2
```

**基本写法：bisect_left 左侧插入**
`bisect.bisect_left(<列表>, <值>)`
```python
# 返回左侧插入点
print(bisect.bisect_left(a, 5))  # 2
```

**基本写法：bisect_right 右侧插入**
`bisect.bisect_right(<列表>, <值>)`
```python
# 返回右侧插入点
print(bisect.bisect_right(a, 5))  # 3
```

**基本写法：insort 插入保持有序**
`bisect.insort(<列表>, <值>)`
```python
# 插入元素并保持有序
bisect.insort(a, 4)
print(a)  # [1, 3, 4, 5, 7, 9]
```

**基本写法：insort_left 左侧插入**
`bisect.insort_left(<列表>, <值>)`
```python
# 插入到左侧
bisect.insort_left(a, 5)
```

**基本写法：insort_right 右侧插入**
`bisect.insort_right(<列表>, <值>)`
```python
# 插入到右侧（默认）
bisect.insort_right(a, 5)
```

**基本写法：限定范围查找**
`bisect.bisect(<列表>, <值>, lo=<起>, hi=<止>)`
```python
# 限定查找范围
print(bisect.bisect(a, 4, lo=1, hi=4))
```

---

## bisect 应用

**基本写法：分级映射**
`bisect.bisect` 配合列表
```python
# 按分数定级
def grade(score):
    breakpoints = [60, 70, 80, 90]
    grades = "FDCBA"
    i = bisect.bisect(breakpoints, score)
    return grades[i]

print(grade(85))  # B
```

**基本写法：优先队列（有序插入）**
`bisect.insort`
```python
# 用 bisect 维护有序队列
class SortedQueue:
    def __init__(self):
        self._data = []
    def push(self, x):
        bisect.insort(self._data, x)
    def pop(self):
        return self._data.pop(0)
```

---

## array 与 list 区别

**基本写法：内存占用对比**
`sys.getsizeof(<对象>)`
```python
# array 比 list 节省内存
import sys
lst = list(range(1000))
arr = array.array("i", range(1000))
print(sys.getsizeof(lst))  # 较大
print(sys.getsizeof(arr))  # 较小
```

---

## array 切片与迭代

**基本写法：切片**
`a[<起>:<止>]`
```python
# 数组切片返回新数组
sub = a[1:3]
print(type(sub))  # <class 'array.array'>
```

**基本写法：迭代**
`for <元素> in a:`
```python
# 迭代数组元素
for x in a:
    print(x)
```
