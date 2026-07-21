---
order: 62
title: Lua迭代器
module: lua
category: 'dev-lang'
difficulty: intermediate
description: 'Lua 迭代器深度解析:泛型 for 语义、无状态与有状态迭代器、协程迭代器、迭代器协议形式化、迭代器组合、惰性序列、跨语言对比及工程实践'
author: fanquanpp
updated: '2026-07-21'
tags:
  - lua
  - iterator
  - generator
  - functional
  - coroutine
  - intermediate
related:
  - lua/函数与闭包
  - lua/协程详解
  - lua/协程与异步
  - lua/元表与元方法详解
  - lua/数据类型与Table详解
prerequisites:
  - lua/概述与环境配置
  - lua/函数与闭包
  - lua/程序结构与基本语法
  - lua/数据类型与Table详解
---

# Lua迭代器

> 本文档对标 MIT 6.001 Structure and Interpretation of Computer Programs、Stanford CS106X Programming Abstractions、CMU 15-150 Functional Programming 中迭代抽象与惰性求值理论教学水准,面向 0 基础自学者与企业级 Lua 工程师,系统讲解 Lua 迭代器(iterator)的本质、泛型 for 语义、无状态与有状态迭代器、协程迭代器、迭代器协议形式化、组合子(组合器)、惰性求值、跨语言对比以及工程级实战案例。

## 1. 学习目标

学习本章后,读者应能在 Bloom 认知层级框架下达成下列目标。

### 1.1 知识层(Remembering)

- 列举 Lua 泛型 `for` 的执行流程:调用迭代器工厂、保存不可变状态、调用迭代函数、检测终止条件(nil)。
- 复述泛型 `for` 语法 `for var_1, ..., var_n in explist do block end` 中 `explist` 的求值规则与返回值数量(1、2 或 3)。
- 描述无状态迭代器(stateless iterator)与有状态迭代器(stateful iterator)的区别:前者通过 `explist` 返回多个值保存状态,后者通过闭包捕获状态。
- 列举 Lua 标准库中常见的迭代器:`pairs`、`ipairs`、`string.gmatch`、`io.lines`、`coroutine.wrap`。
- 复述 `ipairs` 与 `pairs` 的差异:`ipairs` 顺序遍历数组部分遇到 nil 停止,`pairs` 遍历所有键顺序未定义(依赖 table 实现)。

### 1.2 理解层(Understanding)

- 解释泛型 `for` 的内部状态机:三个隐藏变量 `f`、`s`、`var`(迭代函数、不可变状态、控制变量)。
- 阐释无状态迭代器为何能避免闭包:利用 Lua 多返回值与不可变状态,每次调用都从相同 `s` 与递增的 `var` 派生新状态。
- 描述 `ipairs` 的迭代函数实现:基于 `s[var]` 索引,遇到 nil 终止。
- 解释迭代器与生成器(generator)的关系:生成器是产出值序列的函数,迭代器是泛型 `for` 接受的函数协议,二者在 Lua 中常等价。
- 描述协程迭代器的工作原理:协程 `yield` 产出值,泛型 `for` 调用 `coroutine.wrap` 返回的函数,直到协程结束返回 nil。
- 解释迭代器协议(iteration protocol)与可迭代对象(iterable)的概念在 Lua 中的对应:Lua 没有"可迭代对象"概念,但 `pairs(t)`/`ipairs(t)` 可视为表的可迭代适配器。

### 1.3 应用层(Applying)

- 编写无状态迭代器遍历数组、链表、二叉树。
- 使用闭包实现有状态迭代器,记录访问位置、跳过元素、过滤条件。
- 用协程实现深度优先遍历、广度优先遍历等递归算法的迭代器。
- 实现迭代器组合子:`map`、`filter`、`take`、`drop`、`zip`、`reduce`。
- 应用迭代器处理大文件、网络流,避免一次性加载全部数据。

### 1.4 分析层(Analyzing)

- 分析无状态迭代器与有状态迭代器在内存占用、GC 压力、可序列化上的差异。
- 分析 Lua 迭代器与 Python `__iter__`/`__next__`、JavaScript `Symbol.iterator`、Java `Iterator`、Rust `Iterator` trait 的本质异同。
- 分析 `pairs` 顺序未定义的根因:Lua 表的哈希部分实现(数组+哈希混合),遍历顺序受哈希函数与表大小影响。
- 分析协程迭代器相比闭包迭代器的优势:递归算法自然表达,无需手动管理状态栈。
- 分析迭代器与惰性序列(lazy sequence)的关系与差异。

### 1.5 评价层(Evaluating)

- 评判 Lua 迭代器设计的优劣:简洁性(`for` + 函数) vs 类型安全(无 `Iterable` 接口)。
- 评估 `pairs` 顺序未定义在调试、序列化、测试中的影响,以及 `__pairs` 元方法(Lua 5.2+,5.4 移除)的设计演化。
- 评判协程迭代器相比闭包迭代器在性能(切换成本)、可读性、错误处理上的取舍。
- 评估 Lua 缺乏内建 `yield from` / `flatMap` 等迭代器组合原语对功能编程的影响。

### 1.6 创造层(Creating)

- 设计迭代器工具库,提供 `map`、`filter`、`reduce`、`zip`、`chain`、`takeWhile`、`dropWhile` 等函数式操作。
- 构建惰性求值库,实现无限序列(自然数、斐波那契、素数)与按需计算。
- 设计可序列化的迭代器,支持保存/恢复遍历状态。
- 构建基于迭代器的流处理框架,处理 CSV、JSON、日志等结构化数据。
- 设计迭代器调试工具,可视化迭代历史、性能 profile、状态变化。

## 2. 历史动机与演化

### 2.1 迭代抽象的范式演化

程序语言中"遍历集合"的抽象历经五个主要阶段:

1. **显式索引循环**(早期 FORTRAN、C):`for (int i = 0; i < n; i++) arr[i]`,需知道集合内部结构。
2. **迭代器对象**(C++ STL、Java Iterator):封装遍历状态,提供 `hasNext()`/`next()` 接口,与集合解耦。
3. **泛型 for + 迭代函数**(CLU、Lua、Python):语言提供 `for x in iter`,迭代器为高阶函数,状态隐藏。
4. **生成器函数**(Python `yield`、JavaScript `function*`):函数体含 `yield`,自动转为状态机,编写更直观。
5. **惰性序列 / Stream**(Haskell、Scala、Clojure):集合本身是惰性的,`map`/`filter` 链式组合,按需计算。

Lua 选择了第 3 种范式,核心是泛型 `for` 与"迭代函数"协议。设计动机源于 CLU(Barbara Liskov,1970s)的迭代器思想:迭代器是普通函数,泛型 `for` 自动管理其调用与终止。

### 2.2 Lua 迭代器 API 的版本演化

| Lua 版本 | 关键变化 | 设计动机 |
|---------|---------|---------|
| 3.0 (1996) | 引入泛型 `for` 与 `pairs`、`ipairs` | 提供 CLU 风格迭代抽象 |
| 5.0 (2003) | `for` 语法支持多变量、`__pairs`/`__ipairs` 元方法预留 | 增强表达力 |
| 5.1 (2006) | 协程稳定,协程迭代器模式成熟 | 协程作为迭代器实现工具 |
| 5.2 (2011) | 引入 `__pairs`/`__ipairs` 元方法 | 允许自定义表的可迭代行为 |
| 5.3 (2015) | `__ipairs` 弃用警告 | 推广 `ipairs` 仅用于数组 |
| 5.4 (2020) | 移除 `__pairs`/`__ipairs` 元方法,`pairs`/`ipairs` 仅用 `next`/表长度 | 简化语义,避免元方法干扰 |
| 5.5 (2025 规划) | 探讨 `__iter` 元方法标准化 | 统一可迭代对象协议 |

### 2.3 与其他语言迭代器的对比定位

Lua 迭代器在迭代抽象谱系中处于"函数式迭代器"位置,与 CLU、Lua、Python(早期)一致。其独有特征:

- **无内建协议接口**:Lua 没有 `Iterable` 接口或 `Iterator` 类型,迭代器是普通函数,任何满足 `(s, var) -> var'` 协议的函数都可用。
- **三参数协议**:迭代函数 `(state, control_var) -> values`,state 不可变(由泛型 `for` 持有),control_var 由上次返回值更新。
- **顺序未定义**:标准 `pairs` 不保证顺序,需用户自行 `sort` 或用 `ipairs`/数组。
- **协程友好**:协程 `wrap` 返回的函数天然符合迭代器协议,递归算法可零成本转为迭代器。

## 3. 形式化定义

### 3.1 泛型 for 的形式化语义

泛型 `for` 语句:

```lua
for v_1, ..., v_n in explist do block end
```

等价于:

```lua
do
  local f, s, var = explist
  while true do
    local r_1, ..., r_n = f(s, var)
    if r_1 == nil then break end
    var = r_1
    v_1, ..., v_n = r_1, ..., r_n
    block
  end
end
```

形式地,设 `explist` 求值为函数 $f$、状态 $s$、初始控制变量 $\text{var}_0$(通常为 nil)。迭代产生序列:

$$
\begin{aligned}
(v_1^{(1)}, \ldots, v_n^{(1)}) &= f(s, \text{var}_0) \\
(v_1^{(2)}, \ldots, v_n^{(2)}) &= f(s, v_1^{(1)}) \\
&\vdots \\
(v_1^{(k)}, \ldots, v_n^{(k)}) &= f(s, v_1^{(k-1)}) \\
(v_1^{(k+1)}, \ldots) &= f(s, v_1^{(k)}) \quad \text{满足 } v_1^{(k+1)} = \text{nil,终止}
\end{aligned}
$$

### 3.2 迭代器函数的协议

一个有效的迭代器函数 $f$ 满足:

$$
f: S \times V \to V^n \cup \{(\text{nil}, \ldots)\}
$$

其中 $S$ 为状态类型(任意), $V$ 为控制变量类型(任意), $V^n$ 为返回的 $n$ 个迭代值。$f$ 必须满足:

- **可终止性**:存在有限 $k$,使得 $f(s, v^{(k)})$ 第一返回值为 nil。
- **确定性**:给定相同 $(s, v)$,$f$ 返回相同结果(除非有意引入随机性)。
- **单调性**(可选):控制变量 $v_1$ 严格递增(对 `ipairs` 等有序迭代器)。

### 3.3 无状态 vs 有状态迭代器

**无状态迭代器**:所有迭代状态编码在 `(s, var)` 中,无额外内存。

形式化:设迭代器 $f$ 与状态 $s$、控制变量 $\text{var}$。无状态要求 $f$ 仅依赖 $s$ 与 $\text{var}$,不访问任何外部可变状态。即:

$$
\forall i, j: \quad (s_i, \text{var}_i) = (s_j, \text{var}_j) \implies f(s_i, \text{var}_i) = f(s_j, \text{var}_j)
$$

**有状态迭代器**:迭代函数为闭包,捕获外部状态(如当前位置、过滤条件)。

形式化:迭代器 $f$ 是闭包,捕获状态 $\sigma$。每次调用更新 $\sigma$:

$$
f(\sigma) = (\sigma', v_1, \ldots, v_n) \quad \text{或} \quad f(\sigma) = (\text{nil})
$$

调用方只看到 $v_i$,但 $\sigma$ 在闭包内部演化。这种情况下,泛型 `for` 持有的 `s`、`var` 通常是占位符(`nil`)。

### 3.4 协程迭代器的形式化

协程迭代器将协程 `wrap` 后的函数作为迭代器。设协程 $C$ 在函数体中 `yield` 产出 $v_1, \ldots, v_n$。则:

$$
f_C(\underbrace{\text{nil}, \text{nil}}_{\text{占位}}) = \begin{cases} (v_1^{(1)}, \ldots, v_n^{(1)}) & \text{第一次调用,启动 } C \\ (v_1^{(2)}, \ldots, v_n^{(2)}) & \text{第二次,从 yield 恢复} \\ \vdots \\ (\text{nil}) & \text{协程结束} \end{cases}
$$

协程内部状态(局部变量、调用栈)自动保存,无需用户显式管理。

## 4. 理论推导与证明

### 4.1 任意递归遍历可转为协程迭代器

**命题**:对任意递归遍历算法 $T$(如树的先序、中序、后序),存在对应的协程迭代器 $C_T$,产出相同的元素序列。

**证明**:

设 $T$ 为:

```
function T(node):
  if node == nil: return
  visit(node)
  T(node.left)
  T(node.right)
```

构造 $C_T$:

```
function C_T(node):
  if node == nil: return
  coroutine.yield(node.value)
  C_T(node.left)
  C_T(node.right)
```

`coroutine.wrap(C_T)(root)` 即迭代器。每次调用恢复协程,执行至下一 `yield`。

正确性:协程的"暂停-恢复"语义保证 `yield` 顺序与 $T$ 的 `visit` 顺序一致。栈自动保存,无需手动 CPS 变换。证毕。

### 4.2 无状态迭代器表达能力有限

**命题**:无状态迭代器无法表达需要"已访问集合"的遍历(如图的深度优先遍历,需记录已访问节点)。

**证明**:无状态迭代器 $f(s, \text{var})$ 仅依赖 $s$ 与 $\text{var}$。若遍历需记录已访问集合 $V$,则 $V$ 必须编码在 $s$ 或 $\text{var}$ 中。但 $s$ 不可变(由泛型 `for` 持有),$\text{var}$ 是单值。即使将 $V$ 嵌入 $s$(如将图改为带访问标记的结构),也会污染原数据结构。

因此,图遍历等需要 mutable 已访问集合的算法,必须用有状态迭代器(闭包或协程)。证毕。

### 4.3 ipairs 与 pairs 终止条件不同

**命题**:`ipairs(t)` 在遇到第一个 nil 索引时终止,即使后续索引有值;`pairs(t)` 遍历所有键值对,不限于整数键。

**证明**:

`ipairs` 的迭代函数 `f(s, var) = (s[var+1] ~= nil) and (var+1, s[var+1]) or nil`。即若 `t[var+1]` 为 nil,返回 nil 终止。

设 `t = {[1]=1, [2]=nil, [3]=3}`。则:
- $f(t, 0) = (1, 1)$,因为 `t[1] = 1`
- $f(t, 1) = \text{nil}$,因为 `t[2] = nil`,终止

`t[3] = 3` 不会被遍历。

`pairs` 的迭代函数基于 `next(t, k)`,返回下一个键值对,直到 `next` 返回 nil。`next` 遍历所有键(数组与哈希部分),不限于整数。

证毕。

### 4.4 pairs 顺序未定义的原因

**命题**:Lua 标准 `pairs` 不保证遍历顺序,且不同 Lua 版本/实现可能产生不同顺序。

**证明**:Lua 表的实现为数组+哈希混合。数组部分存储连续整数键 $1 \ldots n$($n$ 由表大小决定),哈希部分存储其余键。

`next(t, k)` 内部遍历数组部分,再遍历哈希部分。哈希部分使用开放地址法,顺序取决于键的哈希值与表大小。相同键集合在不同表大小下可能产生不同顺序。

Lua 5.2 引入 `__pairs` 元方法允许自定义,5.4 又移除以简化语义。LuaJIT、Luau 等实现可能有额外优化(如序号预测),进一步影响顺序。

因此,依赖 `pairs` 顺序的代码不可移植。需排序时显式 `table.sort`。证毕。

## 5. 代码示例

### 5.1 泛型 for 的内部机制

```lua
-- 等价转换
for k, v in pairs(t) do
  print(k, v)
end

-- 等价于
do
  local f, s, var = pairs(t)
  while true do
    local k, v = f(s, var)
    if k == nil then break end
    var = k
    print(k, v)
  end
end
```

### 5.2 ipairs 的实现

```lua
-- 标准库 ipairs 等价实现
local function iter(t, i)
  i = i + 1
  local v = t[i]
  if v ~= nil then
    return i, v
  end
end

local function my_ipairs(t)
  return iter, t, 0
end

-- 使用
local arr = {10, 20, 30}
for i, v in my_ipairs(arr) do
  print(i, v)  -- 1 10 / 2 20 / 3 30
end
```

### 5.3 pairs 的实现(基于 next)

```lua
-- 标准库 pairs 等价实现
local function my_pairs(t)
  return next, t, nil
end

local t = {name = "Alice", age = 30, city = "Beijing"}
for k, v in my_pairs(t) do
  print(k, v)  -- 顺序未定义
end
```

### 5.4 无状态迭代器:遍历数字范围

```lua
local function range(start, stop, step)
  step = step or 1
  -- 迭代函数、状态、初始控制变量
  local function iter(s, i)
    i = i + step
    if (step > 0 and i <= s.stop) or (step < 0 and i >= s.stop) then
      return i
    end
  end
  return iter, {start = start, stop = stop, step = step}, start - step
end

-- 使用
for i in range(1, 10, 2) do
  io.write(i, " ")  -- 1 3 5 7 9
end
print()

for i in range(10, 1, -1) do
  io.write(i, " ")  -- 10 9 8 7 6 5 4 3 2 1
end
```

### 5.5 无状态迭代器:遍历链表

```lua
-- 链表节点:{ value = ..., next = ... }
local function list_iter(node)
  -- 迭代函数:接收当前节点,返回值与下一节点
  local function iter(_, current)
    if current == nil then return nil end
    return current.value, current.next
  end
  return iter, nil, node  -- node 作为初始控制变量
end

-- 构建链表 1 -> 2 -> 3
local list = {value = 1, next = {value = 2, next = {value = 3, next = nil}}}

for v in list_iter(list) do
  io.write(v, " ")  -- 1 2 3
end
```

### 5.6 有状态迭代器:带过滤

```lua
local function filter_iter(arr, predicate)
  local i = 0
  local n = #arr
  return function()
    while i < n do
      i = i + 1
      if predicate(arr[i]) then
        return arr[i]
      end
    end
    return nil
  end
end

-- 使用:只取偶数
local nums = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
for v in filter_iter(nums, function(x) return x % 2 == 0 end) do
  io.write(v, " ")  -- 2 4 6 8 10
end
```

### 5.7 有状态迭代器:跳过指定数量(take/drop)

```lua
local function drop(arr, n)
  local i = n
  return function()
    i = i + 1
    return arr[i]
  end
end

local function take(arr, n)
  local i = 0
  local count = 0
  return function()
    if count >= n then return nil end
    count = count + 1
    i = i + 1
    return arr[i]
  end
end

local arr = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

-- 跳过前 3 个
for v in drop(arr, 3) do
  io.write(v, " ")  -- 4 5 6 7 8 9 10
end
print()

-- 只取前 5 个
for v in take(arr, 5) do
  io.write(v, " ")  -- 1 2 3 4 5
end
```

### 5.8 协程迭代器:二叉树中序遍历

```lua
local function inorder(root)
  return coroutine.wrap(function()
    local function walk(node)
      if node == nil then return end
      walk(node.left)
      coroutine.yield(node.value)
      walk(node.right)
    end
    walk(root)
  end)
end

-- 构建二叉搜索树
--       4
--      / \
--     2   6
--    / \ / \
--   1  3 5  7
local tree = {
  value = 4,
  left = {
    value = 2,
    left = { value = 1 },
    right = { value = 3 },
  },
  right = {
    value = 6,
    left = { value = 5 },
    right = { value = 7 },
  },
}

for v in inorder(tree) do
  io.write(v, " ")  -- 1 2 3 4 5 6 7
end
```

### 5.9 协程迭代器:斐波那契数列

```lua
local function fib()
  return coroutine.wrap(function()
    local a, b = 0, 1
    while true do
      coroutine.yield(a)
      a, b = b, a + b
    end
  end)
end

-- 取前 10 项
local count = 0
for v in fib() do
  io.write(v, " ")
  count = count + 1
  if count >= 10 then break end
end
-- 0 1 1 2 3 5 8 13 21 34
```

### 5.10 字符串分割迭代器

```lua
local function split(str, sep)
  sep = sep or "%s+"  -- 默认空白
  return function()
    if str == nil or str == "" then return nil end
    local start, end_pos = str:find(sep)
    if start then
      local word = str:sub(1, start - 1)
      str = str:sub(end_pos + 1)
      return word
    else
      local word = str
      str = nil
      return word
    end
  end
end

-- 使用
for word in split("hello world lua iterator", "%s+") do
  print(word)
end
-- hello
-- world
-- lua
-- iterator
```

### 5.11 文件行迭代器

```lua
-- io.lines 是标准库提供的迭代器
local function read_lines(path)
  local file = io.open(path, "r")
  if not file then return function() return nil end end
  return function()
    local line = file:read("*l")
    if line == nil then file:close() end
    return line
  end
end

-- 使用
for line in read_lines("/etc/hosts") do
  print(line)
end
```

### 5.12 迭代器组合子:map

```lua
local function map(iter_fn, mapper)
  return function(...)
    local values = {iter_fn(...)}
    if values[1] == nil then return nil end
    return mapper(table.unpack(values))
  end
end

-- 使用:对 range 的每个值平方
for v in map(range(1, 5), function(x) return x * x end) do
  io.write(v, " ")  -- 1 4 9 16 25
end
```

### 5.13 迭代器组合子:filter

```lua
local function filter(iter_fn, predicate)
  return function(...)
    while true do
      local values = {iter_fn(...)}
      if values[1] == nil then return nil end
      if predicate(table.unpack(values)) then
        return table.unpack(values)
      end
    end
  end
end

-- 使用:取偶数
for v in filter(range(1, 10), function(x) return x % 2 == 0 end) do
  io.write(v, " ")  -- 2 4 6 8 10
end
```

### 5.14 迭代器组合子:reduce

```lua
local function reduce(iter_fn, reducer, initial)
  local acc = initial
  while true do
    local values = {iter_fn()}
    if values[1] == nil then break end
    acc = reducer(acc, table.unpack(values))
  end
  return acc
end

-- 使用:求和
local sum = reduce(range(1, 100), function(a, b) return a + b end, 0)
print(sum)  -- 5050
```

### 5.15 迭代器组合子:zip

```lua
local function zip(iter1, iter2)
  return function()
    local v1 = iter1()
    local v2 = iter2()
    if v1 == nil or v2 == nil then return nil end
    return v1, v2
  end
end

-- 使用
for a, b in zip(range(1, 5), range(10, 14)) do
  print(a, b)  -- 1 10 / 2 11 / 3 12 / 4 13 / 5 14
end
```

### 5.16 迭代器组合子:chain

```lua
local function chain(...)
  local iters = {...}
  local i = 1
  return function()
    while i <= #iters do
      local v = iters[i]()
      if v ~= nil then return v end
      i = i + 1
    end
    return nil
  end
end

-- 使用
local function one_to_three()
  local i = 0
  return function()
    i = i + 1
    if i <= 3 then return i end
  end
end

local function four_to_six()
  local i = 3
  return function()
    i = i + 1
    if i <= 6 then return i end
  end
end

for v in chain(one_to_three(), four_to_six()) do
  io.write(v, " ")  -- 1 2 3 4 5 6
end
```

### 5.17 takeWhile 与 dropWhile

```lua
local function takeWhile(iter_fn, predicate)
  return function()
    local v = iter_fn()
    if v == nil or not predicate(v) then return nil end
    return v
  end
end

local function dropWhile(iter_fn, predicate)
  local started = false
  return function()
    while true do
      local v = iter_fn()
      if v == nil then return nil end
      if started or not predicate(v) then
        started = true
        return v
      end
    end
  end
end

-- 使用
local function nat()
  local i = 0
  return function() i = i + 1; return i end
end

-- 取小于 5 的自然数
for v in takeWhile(nat(), function(x) return x < 5 end) do
  io.write(v, " ")  -- 1 2 3 4
end
print()

-- 跳过小于 5 的自然数
for v in dropWhile(nat(), function(x) return x < 5 end) do
  io.write(v, " ")
  if v >= 10 then break end
end
-- 5 6 7 8 9 10
```

### 5.18 惰性序列库

```lua
local Lazy = {}
Lazy.__index = Lazy

function Lazy.new(iter_fn)
  return setmetatable({_iter = iter_fn}, Lazy)
end

function Lazy:map(mapper)
  local iter = self._iter
  return Lazy.new(function()
    local v = iter()
    if v == nil then return nil end
    return mapper(v)
  end)
end

function Lazy:filter(pred)
  local iter = self._iter
  return Lazy.new(function()
    while true do
      local v = iter()
      if v == nil then return nil end
      if pred(v) then return v end
    end
  end)
end

function Lazy:take(n)
  local iter = self._iter
  local count = 0
  return Lazy.new(function()
    if count >= n then return nil end
    count = count + 1
    return iter()
  end)
end

function Lazy:reduce(reducer, initial)
  local acc = initial
  while true do
    local v = self._iter()
    if v == nil then break end
    acc = reducer(acc, v)
  end
  return acc
end

function Lazy:to_table()
  local result = {}
  for v in self._iter do
    result[#result + 1] = v
  end
  return result
end

-- 使用:自然数 → 平方 → 过滤偶数 → 取前 5 个
local result = Lazy.new(nat())
  :map(function(x) return x * x end)
  :filter(function(x) return x % 2 == 0 end)
  :take(5)
  :to_table()

print(table.concat(result, ", "))  -- 4, 16, 36, 64, 100
```

### 5.19 递归下降解析器作为迭代器

```lua
-- 简单的 token 生成器
local function tokenize(str)
  return coroutine.wrap(function()
    local pos = 1
    while pos <= #str do
      local c = str:sub(pos, pos)
      if c:match("%s") then
        pos = pos + 1
      elseif c:match("%d") then
        local start = pos
        while pos <= #str and str:sub(pos, pos):match("%d") do
          pos = pos + 1
        end
        coroutine.yield({type = "number", value = tonumber(str:sub(start, pos - 1))})
      elseif c:match("[%w_]") then
        local start = pos
        while pos <= #str and str:sub(pos, pos):match("[%w_]") do
          pos = pos + 1
        end
        coroutine.yield({type = "ident", value = str:sub(start, pos - 1)})
      else
        coroutine.yield({type = "op", value = c})
        pos = pos + 1
      end
    end
  end)
end

-- 使用
for token in tokenize("foo = 42 + bar") do
  print(token.type, token.value)
end
-- ident foo
-- op =
-- number 42
-- op +
-- ident bar
```

### 5.20 反向遍历数组

```lua
local function reversed(arr)
  local i = #arr + 1
  return function()
    i = i - 1
    if i >= 1 then return arr[i] end
  end
end

local arr = {"a", "b", "c", "d", "e"}
for v in reversed(arr) do
  io.write(v, " ")  -- e d c b a
end
```

### 5.21 表的深度遍历

```lua
-- 递归遍历嵌套表,产出所有叶子节点的路径与值
local function deep_pairs(t)
  return coroutine.wrap(function()
    local function walk(node, path)
      if type(node) ~= "table" then
        coroutine.yield(path, node)
        return
      end
      for k, v in pairs(node) do
        walk(v, path .. "." .. tostring(k))
      end
    end
    walk(t, "")
  end)
end

-- 使用
local config = {
  server = {
    host = "localhost",
    port = 8080,
  },
  database = {
    name = "test",
    credentials = {
      user = "admin",
      password = "secret",
    },
  },
}

for path, value in deep_pairs(config) do
  print(path, "=", value)
end
-- .server.host = localhost
-- .server.port = 8080
-- .database.name = test
-- .database.credentials.user = admin
-- .database.credentials.password = secret
```

### 5.22 生成排列组合

```lua
-- 全排列
local function permutations(arr)
  return coroutine.wrap(function()
    local n = #arr
    if n == 0 then return end
    
    -- 递归生成排列
    local function generate(start)
      if start == n then
        -- 复制一份,yield
        local snapshot = {}
        for i = 1, n do snapshot[i] = arr[i] end
        coroutine.yield(snapshot)
        return
      end
      for i = start, n do
        arr[start], arr[i] = arr[i], arr[start]
        generate(start + 1)
        arr[start], arr[i] = arr[i], arr[start]  -- 回溯
      end
    end
    
    generate(1)
  end)
end

-- 使用
for perm in permutations({1, 2, 3}) do
  print(table.concat(perm, ", "))
end
-- 1, 2, 3
-- 1, 3, 2
-- 2, 1, 3
-- 2, 3, 1
-- 3, 2, 1
-- 3, 1, 2
```

### 5.23 自定义顺序的 pairs

```lua
-- 按键排序的 pairs
local function sorted_pairs(t)
  local keys = {}
  for k in pairs(t) do
    keys[#keys + 1] = k
  end
  table.sort(keys, function(a, b)
    if type(a) == type(b) then return a < b end
    return tostring(a) < tostring(b)
  end)
  local i = 0
  return function()
    i = i + 1
    if keys[i] == nil then return nil end
    return keys[i], t[keys[i]]
  end
end

-- 使用
local t = {banana = 3, apple = 5, cherry = 2, date = 8}
for k, v in sorted_pairs(t) do
  print(k, v)
end
-- apple 5
-- banana 3
-- cherry 2
-- date 8
```

### 5.24 重复元素的迭代器

```lua
local function repeat_iter(value, n)
  local i = 0
  return function()
    i = i + 1
    if i <= n then return value end
  end
end

-- 使用
for v in repeat_iter("hello", 3) do
  print(v)  -- hello hello hello
end
```

### 5.25 计数器迭代器

```lua
-- 无限计数器(需配合 take 或 break 使用)
local function counter(start, step)
  start = start or 1
  step = step or 1
  local i = start - step
  return function()
    i = i + step
    return i
  end
end

-- 取前 5 个偶数
local count = 0
for v in counter(2, 2) do
  io.write(v, " ")
  count = count + 1
  if count >= 5 then break end
end
-- 2 4 6 8 10
```

### 5.26 字符逐个迭代器

```lua
local function chars(str)
  local i = 0
  local n = #str
  return function()
    i = i + 1
    if i <= n then return str:sub(i, i), i end
  end
end

for c, i in chars("hello") do
  print(i, c)
end
-- 1 h
-- 2 e
-- 3 l
-- 4 l
-- 5 o
```

### 5.27 字节流分块迭代器

```lua
local function chunks(file_path, chunk_size)
  chunk_size = chunk_size or 4096
  local file = io.open(file_path, "rb")
  if not file then return function() return nil end end
  return function()
    local chunk = file:read(chunk_size)
    if chunk == nil then file:close() end
    return chunk
  end
end

-- 使用:统计文件字节数
local total = 0
for chunk in chunks("/bin/ls", 4096) do
  total = total + #chunk
end
print("Total bytes:", total)
```

### 5.28 表的笛卡尔积迭代器

```lua
local function product(...)
  local lists = {...}
  local n = #lists
  if n == 0 then return function() return nil end end
  
  local indices = {}
  for i = 1, n do indices[i] = 1 end
  
  return function()
    -- 检查是否已遍历完
    if indices[1] > #lists[1] then return nil end
    
    -- 构造当前组合
    local result = {}
    for i = 1, n do
      result[i] = lists[i][indices[i]]
    end
    
    -- 增加索引(类似进位)
    for i = n, 1, -1 do
      indices[i] = indices[i] + 1
      if indices[i] <= #lists[i] then break end
      if i > 1 then indices[i] = 1 end
    end
    
    return table.unpack(result)
  end
end

-- 使用
for a, b, c in product({1, 2}, {"x", "y"}, {true, false}) do
  print(a, b, c)
end
-- 1 x true
-- 1 x false
-- 1 y true
-- 1 y false
-- 2 x true
-- 2 x false
-- 2 y true
-- 2 y false
```

### 5.29 生成器:素数筛

```lua
local function primes()
  return coroutine.wrap(function()
    local known = {2}
    coroutine.yield(2)
    local n = 3
    while true do
      local is_prime = true
      for _, p in ipairs(known) do
        if p * p > n then break end
        if n % p == 0 then is_prime = false; break end
      end
      if is_prime then
        known[#known + 1] = n
        coroutine.yield(n)
      end
      n = n + 2
    end
  end)
end

-- 取前 20 个素数
local count = 0
for p in primes() do
  io.write(p, " ")
  count = count + 1
  if count >= 20 then break end
end
-- 2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 53 59 61 67 71
```

### 5.30 完整案例:CSV 解析器

```lua
-- 简单 CSV 解析器:逐行产出字段数组
local function csv_rows(file_path, delimiter)
  delimiter = delimiter or ","
  local file = io.open(file_path, "r")
  if not file then return function() return nil end end
  
  return function()
    local line = file:read("*l")
    if line == nil then
      file:close()
      return nil
    end
    
    -- 解析字段(支持引号包裹)
    local fields = {}
    local field = ""
    local in_quotes = false
    local i = 1
    
    while i <= #line do
      local c = line:sub(i, i)
      if c == '"' then
        if in_quotes and line:sub(i + 1, i + 1) == '"' then
          field = field .. '"'
          i = i + 2
        else
          in_quotes = not in_quotes
          i = i + 1
        end
      elseif c == delimiter and not in_quotes then
        fields[#fields + 1] = field
        field = ""
        i = i + 1
      else
        field = field .. c
        i = i + 1
      end
    end
    fields[#fields + 1] = field
    
    return fields
  end
end

-- 使用
-- 假设 data.csv 内容:
-- name,age,city
-- Alice,30,Beijing
-- Bob,25,Shanghai
-- "Charlie, Jr.",40,"Guangzhou"

for fields in csv_rows("data.csv") do
  print(table.concat(fields, " | "))
end
-- name | age | city
-- Alice | 30 | Beijing
-- Bob | 25 | Shanghai
-- Charlie, Jr. | 40 | Guangzhou
```

## 6. 对比分析

### 6.1 Lua 迭代器 vs Python 迭代器

| 维度 | Lua 迭代器 | Python 迭代器 |
|------|----------|--------------|
| 协议 | 函数 `(s, var) -> values` | `__iter__()` + `__next__()` 方法 |
| 终止 | 返回 nil | 抛出 `StopIteration` |
| 状态管理 | 闭包或多返回值 | 对象属性 |
| 生成器 | 协程 `yield` | `yield` 关键字 |
| 内建函数 | 无 | `itertools`、`map`、`filter` |
| 列表推导 | 无 | `[x for x in iter]` |
| 类型检查 | 无 | `Iterable`、`Iterator` 协议 |

Python 迭代器有显式协议接口(`__iter__`/`__next__`),可被类型系统检查;Lua 迭代器是普通函数,灵活但无类型保护。

### 6.2 Lua 迭代器 vs JavaScript 迭代器

| 维度 | Lua 迭代器 | JavaScript 迭代器 |
|------|----------|------------------|
| 协议 | 函数 | `Symbol.iterator` + `next()` |
| 终止 | 返回 nil | 返回 `{done: true}` |
| 生成器 | 协程 `yield` | `function*` + `yield` |
| 内建方法 | 无 | `[...iter]`、`for...of` |
| 异步迭代 | 无内建 | `for await...of` |

JavaScript 提供丰富的内建可迭代对象(Array、Map、Set、String)与展开运算符;Lua 仅提供 `pairs`/`ipairs`,需自行实现其他。

### 6.3 Lua 迭代器 vs Java Iterator

| 维度 | Lua 迭代器 | Java Iterator |
|------|----------|--------------|
| 类型 | 函数 | 接口 `Iterator<E>` |
| 方法 | `(s, var) -> values` | `hasNext()` + `next()` |
| 状态 | 闭包或不可变状态 | 对象字段 |
| 泛型 | 无 | `<E>` 类型参数 |
| 异常 | 返回 nil | `NoSuchElementException` |
| 内建工具 | 无 | `Stream`、`Collectors` |

Java Iterator 是面向对象接口,有强类型与丰富工具库;Lua 迭代器更轻量,但缺乏类型安全与标准工具。

### 6.4 Lua 迭代器 vs Rust Iterator

| 维度 | Lua 迭代器 | Rust Iterator |
|------|----------|--------------|
| 类型 | 函数 | `Iterator` trait |
| 方法 | `(s, var) -> values` | `next(&mut self) -> Option<Item>` |
| 性能 | 动态分发 | 零成本抽象(静态分发) |
| 组合子 | 需自行实现 | `map`、`filter`、`take`、`chain` 等 |
| 惰性 | 协程天然惰性 | 默认惰性 |
| 类型推导 | 无 | 强类型推导 |

Rust 提供完整惰性迭代器组合子库,编译期优化为零成本;Lua 需手写组合子,运行时开销略高。

### 6.5 Lua 迭代器 vs Haskell 列表

| 维度 | Lua 迭代器 | Haskell 列表 |
|------|----------|-------------|
| 模型 | 函数 + 状态 | 惰性链表 |
| 语法 | `for x in iter` | `[x | x <- list]` |
| 无限序列 | 协程 + break | 原生支持 |
| 模式匹配 | 无 | 列表模式 `x:xs` |
| 组合子 | 手写 | `map`、`filter`、`foldr` 等内建 |

Haskell 列表是语言核心数据结构,与类型系统深度集成;Lua 迭代器是函数协议,更灵活但缺乏语法糖。

## 7. 常见陷阱与反模式

### 7.1 ipairs 遇到 nil 终止

```lua
local t = {1, 2, nil, 4, 5}
for i, v in ipairs(t) do
  print(i, v)
end
-- 只输出 1, 1 / 2, 2,因为 t[3] = nil 终止

-- 修正:用 pairs 显式过滤整数键
for k, v in pairs(t) do
  if type(k) == "number" then
    print(k, v)
  end
end
```

### 7.2 pairs 顺序未定义

```lua
-- 反模式:依赖 pairs 顺序
local t = {a = 1, b = 2, c = 3, d = 4, e = 5}
local first_key = nil
for k in pairs(t) do
  if first_key == nil then first_key = k end
end
print(first_key)  -- 不确定,可能是 a/b/c/d/e

-- 修正:显式排序
local keys = {}
for k in pairs(t) do keys[#keys + 1] = k end
table.sort(keys)
print(keys[1])  -- 必定是 a
```

### 7.3 在迭代中修改表

```lua
-- 反模式:遍历时删除元素
local t = {1, 2, 3, 4, 5}
for k, v in pairs(t) do
  if v % 2 == 0 then
    t[k] = nil  -- 可能导致 next 行为未定义
  end
end

-- 修正:先收集要删除的键,再统一删除
local to_remove = {}
for k, v in pairs(t) do
  if v % 2 == 0 then
    to_remove[#to_remove + 1] = k
  end
end
for _, k in ipairs(to_remove) do
  t[k] = nil
end
```

### 7.4 闭包迭代器忘记终止

```lua
-- 反模式:迭代器永远不返回 nil,导致死循环
local function bad_iter()
  local i = 0
  return function()
    i = i + 1
    return i  -- 永远不返回 nil
  end
end

-- for v in bad_iter() do ... end  -- 死循环

-- 修正:加上终止条件
local function good_iter(max)
  local i = 0
  return function()
    i = i + 1
    if i <= max then return i end
  end
end
```

### 7.5 协程迭代器错误未传播

```lua
-- 协程内错误被 wrap 隐藏,直到调用时才抛出
local function risky_iter()
  return coroutine.wrap(function()
    coroutine.yield(1)
    error("oops")  -- 第二次调用时抛出
  end)
end

local iter = risky_iter()
print(iter())  -- 1
-- print(iter())  -- 抛出错误

-- 修正:用 pcall 包裹
local ok, v = pcall(iter)
if not ok then
  print("Iterator error:", v)
end
```

### 7.6 多次调用同一迭代器实例

```lua
-- 反模式:期望迭代器可重置
local function range_iter(n)
  local i = 0
  return function()
    i = i + 1
    if i <= n then return i end
  end
end

local it = range_iter(5)
for v in it do print(v) end  -- 1 2 3 4 5
for v in it do print(v) end  -- 无输出,迭代器已耗尽

-- 修正:每次循环创建新迭代器
for v in range_iter(5) do print(v) end
for v in range_iter(5) do print(v) end
```

### 7.7 ipairs 与 # 长度操作符的语义差异

```lua
-- # 与 ipairs 都基于"数组部分",但对带 nil 的表行为未定义
local t = {1, 2, nil, 4}
print(#t)  -- 可能是 2 或 4,未定义
-- ipairs 在 t[3] = nil 处终止,只遍历 1, 2

-- 修正:避免在数组中留 nil 空洞;若需稀疏,用 pairs
```

### 7.8 协程迭代器的状态丢失

```lua
-- 协程一旦结束,无法重启
local function gen()
  return coroutine.wrap(function()
    coroutine.yield(1)
    coroutine.yield(2)
  end)
end

local it = gen()
print(it(), it())  -- 1 2
print(it())  -- nil,协程已结束
print(it())  -- nil,无法复活

-- 修正:重新调用 gen() 创建新协程
```

### 7.9 滥用闭包导致内存泄漏

```lua
-- 反模式:闭包引用大对象,且迭代器长期存在
local function bad_iter(big_data)
  local i = 0
  return function()
    i = i + 1
    return big_data[i]  -- big_data 被闭包持有
  end
end

local it = bad_iter(huge_table)
-- 即使 huge_table 不再需要,it 仍引用它

-- 修正:迭代结束后置空,或用无状态迭代器
```

### 7.10 next 误用

```lua
-- 反模式:直接用 next 不传表参数
local t = {a = 1, b = 2}
local k, v = next(t)  -- 第一个键值对
local k2, v2 = next(t, k)  -- 下一个
-- 但若在迭代中修改 t,next 行为未定义

-- 修正:不在 next/pairs 迭代中修改表
```

## 8. 工程实践与最佳实践

### 8.1 优先用无状态迭代器

```lua
-- 优点:无闭包开销,可序列化,易测试
local function range(start, stop, step)
  step = step or 1
  local function iter(s, i)
    i = i + step
    if (step > 0 and i <= s.stop) or (step < 0 and i >= s.stop) then
      return i
    end
  end
  return iter, {start = start, stop = stop}, start - step
end
```

### 8.2 复杂状态用协程迭代器

```lua
-- 优点:递归算法自然,代码清晰
local function tree_iter(root)
  return coroutine.wrap(function()
    local function walk(node)
      if node == nil then return end
      walk(node.left)
      coroutine.yield(node.value)
      walk(node.right)
    end
    walk(root)
  end)
end
```

### 8.3 迭代器命名约定

```lua
-- 推荐命名:返回迭代器工厂的函数用名词复数或 x_iter 后缀
local function rows(file_path) ... end
local function items(t) ... end
local function children(node) ... end

-- 或明确加 _iter 后缀
local function range_iter(...) ... end
```

### 8.4 错误处理

```lua
-- 用 pcall 包裹可能失败的迭代器
local function safe_iter(iter_fn)
  return function(...)
    local ok, result = pcall(iter_fn, ...)
    if not ok then
      log.error("Iterator error: %s", result)
      return nil  -- 终止迭代
    end
    return result
  end
end
```

### 8.5 资源管理

```lua
-- 文件迭代器需确保关闭
local function lines(path)
  local file = io.open(path, "r")
  if not file then error("Cannot open " .. path) end
  local done = false
  return function()
    if done then return nil end
    local line = file:read("*l")
    if line == nil then
      file:close()
      done = true
    end
    return line
  end
end

-- Lua 5.4+:用 to-be-closed 确保 close
local function lines_54(path)
  local file <close> = io.open(path, "r")
  -- ...但 file 生命周期与迭代器闭包绑定,需注意
end
```

### 8.6 性能考量

```lua
-- 1. 无状态迭代器比闭包快约 20-30%(无 upvalue 访问)
-- 2. 协程迭代器比闭包慢约 2-5 倍(yield 开销)
-- 3. ipairs 比 pairs 快(数组连续访问 vs 哈希查找)

-- 性能基准
local function bench(name, iter_fn, n)
  local start = os.clock()
  local count = 0
  for _ in iter_fn do
    count = count + 1
    if count >= n then break end
  end
  print(name .. ":", (os.clock() - start) * 1000, "ms")
end

bench("ipairs", (function()
  local t = {}
  for i = 1, 1000000 do t[i] = i end
  return ipairs(t)
end)(), 1000000)
```

### 8.7 与标准库集成

```lua
-- table.concat 接受数组,可用迭代器转数组
local function to_array(iter_fn)
  local result = {}
  for v in iter_fn do
    result[#result + 1] = v
  end
  return result
end

-- 使用
local arr = to_array(range(1, 10))
print(table.concat(arr, ","))  -- 1,2,3,4,5,6,7,8,9,10
```

### 8.8 调试迭代器

```lua
-- 包装迭代器,记录每次调用
local function debug_iter(name, iter_fn)
  local count = 0
  return function(...)
    count = count + 1
    local result = {iter_fn(...)}
    if result[1] ~= nil then
      print(string.format("[%s] iter #%d: %s", name, count, tostring(result[1])))
    else
      print(string.format("[%s] iter #%d: terminated", name, count))
    end
    return table.unpack(result)
  end
end

-- 使用
for v in debug_iter("range", range(1, 3)) do
  -- 业务逻辑
end
-- [range] iter #1: 1
-- [range] iter #2: 2
-- [range] iter #3: 3
-- [range] iter #4: terminated
```

## 9. 案例研究

### 9.1 案例一:日志分析器

```lua
-- 流式分析大日志文件,统计各级别日志数
local function analyze_log(path)
  local counts = {INFO = 0, WARN = 0, ERROR = 0, DEBUG = 0}
  local total = 0
  
  for line in io.lines(path) do
    total = total + 1
    for level in pairs(counts) do
      if line:match("%[" .. level .. "%]") then
        counts[level] = counts[level] + 1
        break
      end
    end
  end
  
  return {total = total, counts = counts}
end

local result = analyze_log("/var/log/app.log")
print(string.format("Total: %d, INFO: %d, WARN: %d, ERROR: %d, DEBUG: %d",
  result.total, result.counts.INFO, result.counts.WARN,
  result.counts.ERROR, result.counts.DEBUG))
```

### 9.2 案例二:JSON 流式解析

```lua
-- 简化版 JSON token 流
local function json_tokens(str)
  local pos = 1
  return function()
    while pos <= #str do
      local c = str:sub(pos, pos)
      if c:match("%s") then
        pos = pos + 1
      elseif c == "{" or c == "}" or c == "[" or c == "]" or 
             c == "," or c == ":" then
        pos = pos + 1
        return {type = "punct", value = c}
      elseif c == '"' then
        local start = pos + 1
        pos = pos + 1
        while pos <= #str and str:sub(pos, pos) ~= '"' do
          if str:sub(pos, pos) == "\\" then pos = pos + 1 end
          pos = pos + 1
        end
        local value = str:sub(start, pos - 1)
        pos = pos + 1
        return {type = "string", value = value}
      elseif c:match("[%-%d]") then
        local start = pos
        while pos <= #str and str:sub(pos, pos):match("[%-%d.eE+]") do
          pos = pos + 1
        end
        return {type = "number", value = tonumber(str:sub(start, pos - 1))}
      elseif c:match("%a") then
        local start = pos
        while pos <= #str and str:sub(pos, pos):match("%a") do
          pos = pos + 1
        end
        local word = str:sub(start, pos - 1)
        if word == "true" or word == "false" or word == "null" then
          return {type = "keyword", value = word}
        end
      else
        pos = pos + 1
      end
    end
    return nil
  end
end

-- 使用
for token in json_tokens('{"name": "Alice", "age": 30, "active": true}') do
  print(token.type, token.value)
end
```

### 9.3 案例三:游戏背包系统

```lua
-- 遍历玩家背包,过滤指定类型物品
local function items_by_type(inventory, item_type)
  local i = 0
  local n = #inventory
  return function()
    while i < n do
      i = i + 1
      local item = inventory[i]
      if item and item.type == item_type then
        return item, i
      end
    end
  end
end

-- 使用
local inventory = {
  {id = 1, type = "weapon", name = "Sword"},
  {id = 2, type = "potion", name = "Health Potion"},
  {id = 3, type = "weapon", name = "Bow"},
  {id = 4, type = "armor", name = "Helmet"},
  {id = 5, type = "potion", name = "Mana Potion"},
}

print("Weapons:")
for item, i in items_by_type(inventory, "weapon") do
  print(string.format("  Slot %d: %s", i, item.name))
end
-- Slot 1: Sword
-- Slot 3: Bow

print("Potions:")
for item, i in items_by_type(inventory, "potion") do
  print(string.format("  Slot %d: %s", i, item.name))
end
-- Slot 2: Health Potion
-- Slot 5: Mana Potion
```

### 9.4 案例四:WoW 插件遍历单位

```lua
-- 遍历附近所有友方单位
local function friendly_units(radius)
  local units = {}
  -- 假设 API:GetUnitsInRange 返回 GUID 列表
  for _, guid in ipairs(GetUnitsInRange("player", radius)) do
    local unit = UnitFromGUID(guid)
    if UnitIsFriend("player", unit) and not UnitIsDead(unit) then
      units[#units + 1] = unit
    end
  end
  local i = 0
  return function()
    i = i + 1
    return units[i]
  end
end

-- 使用
for unit in friendly_units(40) do
  print(UnitName(unit), UnitHealth(unit) .. "/" .. UnitHealthMax(unit))
end
```

### 9.5 案例五:数据库结果集遍历

```lua
-- 模拟数据库游标
local function result_iter(query_result)
  local i = 0
  local n = #query_result
  return function()
    i = i + 1
    if i <= n then
      return query_result[i], i
    end
  end
end

-- 使用:逐行处理用户数据
local users = {
  {id = 1, name = "Alice", age = 30, email = "alice@example.com"},
  {id = 2, name = "Bob", age = 25, email = "bob@example.com"},
  {id = 3, name = "Charlie", age = 35, email = "charlie@example.com"},
}

-- 流式处理:筛选成年用户,提取邮箱
local function adult_emails(users)
  local result = {}
  for user in result_iter(users) do
    if user.age >= 30 then
      result[#result + 1] = user.email
    end
  end
  return result
end

local emails = adult_emails(users)
print(table.concat(emails, ", "))  -- alice@example.com, charlie@example.com
```

### 9.6 案例六:文件系统遍历

```lua
-- 递归遍历目录(luarocks luafilesystem 风格)
local function walk(path)
  return coroutine.wrap(function()
    -- 假设 lfs.dir 返回目录项迭代器
    for entry in lfs.dir(path) do
      if entry ~= "." and entry ~= ".." then
        local full = path .. "/" .. entry
        local attr = lfs.attributes(full)
        if attr.mode == "directory" then
          coroutine.yield({path = full, type = "dir"})
          -- 递归
          for sub in walk(full) do
            coroutine.yield(sub)
          end
        else
          coroutine.yield({path = full, type = "file", size = attr.size})
        end
      end
    end
  end)
end

-- 使用:统计目录大小
local total_size = 0
local file_count = 0
for entry in walk("/home/user/project") do
  if entry.type == "file" then
    total_size = total_size + entry.size
    file_count = file_count + 1
  end
end
print(string.format("Files: %d, Total size: %.2f MB", 
  file_count, total_size / (1024 * 1024)))
```

### 9.7 案例七:HTTP 请求流水线

```lua
-- 串联多个 HTTP 请求,前一个结果作为后一个输入
local function http_pipeline(stages)
  local i = 0
  return function(prev_result)
    i = i + 1
    if i > #stages then return nil end
    return stages[i](prev_result)
  end
end

-- 使用:获取用户 → 获取订单 → 获取商品详情
local function fetch_user() ... end
local function fetch_orders(user) ... end
local function fetch_product_details(orders) ... end

local pipeline = http_pipeline({
  function(_) return fetch_user() end,
  function(user) return fetch_orders(user) end,
  function(orders) return fetch_product_details(orders) end,
})

local result
for stage_result in pipeline, result do
  result = stage_result
  print("Stage done")
end
```

### 9.8 案例八:数学序列库

```lua
local Seq = {}

-- 自然数序列
function Seq.naturals(start)
  start = start or 1
  local i = start - 1
  return function()
    i = i + 1
    return i
  end
end

-- 等差数列
function Seq.arithmetic(first, diff)
  local i = first - diff
  return function()
    i = i + diff
    return i
  end
end

-- 等比数列
function Seq.geometric(first, ratio)
  local i = first / ratio
  return function()
    i = i * ratio
    return i
  end
end

-- 平方数
function Seq.squares()
  local i = 0
  return function()
    i = i + 1
    return i * i
  end
end

-- 使用:求前 10 个平方数之和
local sum = 0
local count = 0
for v in Seq.squares() do
  sum = sum + v
  count = count + 1
  if count >= 10 then break end
end
print(sum)  -- 385 (1+4+9+...+100)
```

## 10. 习题与思考题

### 10.1 基础题

1. 写出泛型 `for` 的内部展开形式,说明三个隐藏变量的作用。
2. 解释 `ipairs` 与 `pairs` 的区别,各举一个适用场景。
3. 实现无状态迭代器 `countdown(n)`,产出 $n, n-1, \ldots, 1$。
4. 用协程迭代器实现字符串逐字符遍历。

### 10.2 进阶题

5. 实现迭代器组合子 `flatMap(f, iter)`,对 `iter` 每个元素应用 `f`(返回新迭代器),串联所有结果。
6. 实现窗口迭代器 `window(iter, size)`,产出大小为 `size` 的滑动窗口。
7. 用协程实现二叉树层序遍历(广度优先)迭代器。
8. 实现可重置的迭代器,支持 `reset()` 方法重新开始遍历。

### 10.3 思考题

9. 为什么 Lua 不引入 `Iterable` 接口?这种设计的优缺点?
10. 协程迭代器相比闭包迭代器,在性能、可读性、错误处理上有何取舍?
11. 若为 Lua 添加 `yield from` 语法(类似 Python),会如何影响迭代器组合?
12. `pairs` 顺序未定义对哪些场景造成困扰?如何缓解?
13. 比较 Lua 迭代器、Python `itertools`、Rust `Iterator` trait 在表达"取前 N 个偶数"时的代码风格。
14. 设计一个惰性序列库,支持 `map`/`filter`/`take`/`reduce` 链式调用,描述核心数据结构。

### 10.4 开放题

15. 调研 Lua 5.4 移除 `__pairs`/`__ipairs` 元方法的设计动机,分析利弊。
16. 调研 Luau 是否对迭代器有类型注解支持,如 `Iterable<T>`。
17. 若为 Lua 添加列表推导式 `[x for x in iter if x > 0]`,需要修改哪些语言组件?
18. 调研 Haskell、Scala、Clojure 的惰性序列实现,与 Lua 协程迭代器对比性能与表达力。

## 11. 参考文献

1. Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes. *Lua 5.4 Reference Manual*. Section 3.3.5: For Statement, Section 6.1: Basic Functions.
2. Roberto Ierusalimschy. *Programming in Lua* (4th Edition). Chapter 7: Iterators and the Generic for.
3. Barbara Liskov. "Abstraction Mechanisms in CLU". *Communications of the ACM*, 1977.
4. Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes. "The Evolution of Lua". *HOPL III*, 2007.
5. Ana Lúcia de Moura, Roberto Ierusalimschy. "Coroutines in Lua". *Journal of Universal Computer Science*, 2004.
6. Abelson, Sussman. *Structure and Interpretation of Computer Programs*. Section 3.5 on Streams.
7. MIT OpenCourseWare. *6.001 Structure and Interpretation of Computer Programs*. Lecture on Streams.
8. Stanford CS106X. *Programming Abstractions*. Lecture on Iterators.
9. CMU 15-150. *Functional Programming*. Lecture on Lazy Evaluation.
10. Python PEP 234 (Iterators): https://peps.python.org/pep-0234/

## 12. 延伸阅读

### 12.1 Lua 官方资源

- Lua 官方站点:https://www.lua.org/
- Lua 5.4 参考手册:https://www.lua.org/manual/5.4/manual.html
- Programming in Lua(第 4 版)第 7 章:https://www.lua.org/pil/7.html

### 12.2 迭代器理论与历史

- Liskov, B. *A History of CLU*. Springer, 1992.
- Kiczales, G. et al. *The Art of the Metaobject Protocol*. MIT Press, 1991.
- SICP Section 3.5: Streams: https://mitpress.mit.edu/sites/default/files/sicp/full-text/book/book-Z-H-24.html

### 12.3 跨语言对比

- Python itertools 文档:https://docs.python.org/3/library/itertools.html
- JavaScript Iteration Protocols: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
- Rust Iterator trait: https://doc.rust-lang.org/std/iter/trait.Iterator.html
- Java Iterator: https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Iterator.html
- Scala Collections: https://docs.scala-lang.org/overviews/collections-2.13/introduction.html

### 12.4 工业级实践

- LuaSec、LuaFileSystem 等库的迭代器设计
- OpenResty 中的 `ngx.re.gmatch` 迭代器
- Neovim `vim.iter` 模块(Lua 5.1+ 风格迭代器工具)
- Penlight 库的迭代器组合子:https://github.com/lunarmodules/Penlight

### 12.5 高级主题

- 协程迭代器与生成器的 CPS 变换
- 惰性求值的内存模型
- 迭代器融合(fusion)优化
- 流式数据处理模式(Stream Processing)
- 函数式编程中的 catamorphism 与 anamorphism
