---
order: 30
tags:
  - lua
difficulty: beginner
title: '数据类型与 Table 详解'
module: lua
category: 'Lua Basics'
description: '基本类型、Table 操作、元方法与面向对象实现。'
author: Anonymous
related:
  - lua/概述与环境配置
  - lua/程序结构与基本语法
  - lua/函数与闭包
  - lua/元表与面向对象编程
prerequisites: []
---

## 1. 学习目标（Bloom 分类法）

本篇文档采用 Bloom 认知分类法组织学习目标，覆盖从基础记忆到高阶创造的六个层级，帮助读者系统化掌握 Lua 的数据类型系统与 Table 这一核心容器类型。

### 1.1 记忆层（Remember）

完成本节后，学习者应能：

- 列举 Lua 的 8 种基础数据类型（`nil`、`boolean`、`number`、`string`、`function`、`table`、`thread`、`userdata`）。
- 复述 `type()` 函数的返回值形式（字符串）与各类型的对应关系。
- 说出 Table 作为 Lua 唯一容器类型的语义定位及其作为数组、字典、对象、命名空间的多重角色。
- 列举至少 6 个常用的 `table` 库函数（`insert`、`remove`、`concat`、`sort`、`unpack`、`pack`）及其签名。
- 复述 `ipairs` 与 `pairs` 的遍历语义差异，包括终止条件与顺序保证。
- 列出 Lua 5.3 引入的整数/浮点数子类型及其相互转换规则。

### 1.2 理解层（Understand）

完成本节后，学习者应能：

- 解释 Lua 动态类型系统的设计动机，对比静态类型语言（如 Java、C++）的差异。
- 阐述 Table 作为"关联数组"的本质，说明其底层基于哈希表与数组的混合实现。
- 描述 Table 的引用语义，说明为什么 `local t2 = t1` 不会复制表内容。
- 解释 `nil` 在 Table 中作为"键不存在"的语义，说明为何不能在表中存储 `nil` 值。
- 说明元表（metatable）的查找机制，包括 `__index`、`__newindex` 的触发条件。
- 阐述弱表（weak table）的工作原理及其在缓存场景中的应用。

### 1.3 应用层（Apply）

完成本节后，学习者应能：

- 编写代码使用 `type()` 与 `tonumber()` 完成类型判断与安全转换。
- 使用 Table 实现数组、字典、集合、队列、栈等常见数据结构。
- 通过 `ipairs`、`pairs`、数值 `for` 三种方式遍历 Table，并选择合适的方式。
- 使用 `table.insert`、`table.remove`、`table.concat`、`table.sort` 完成数组操作。
- 通过 `setmetatable` 与 `__index` 实现简单的类与继承。
- 使用元方法（`__add`、`__eq`、`__lt`、`__tostring`、`__call`）扩展 Table 行为。

### 1.4 分析层（Analyze）

完成本节后，学习者应能：

- 拆解一段复杂的 Table 操作代码，识别其中的引用共享、浅拷贝、深拷贝边界。
- 分析 Table 在 Lua 虚拟机中的内存布局，估算不同规模 Table 的内存占用。
- 比较 `ipairs` 与 `pairs` 在含有"空洞"（hole）的数组中的行为差异，指出潜在陷阱。
- 解构一个基于元表的面向对象实现，识别其中的 `__index` 链、`self` 参数、构造函数模式。
- 分析弱表的垃圾回收时机，解释为何弱表的值在 GC 后变为 `nil`。

### 1.5 评价层（Evaluate）

完成本节后，学习者应能：

- 评估某段 Lua 代码在类型使用上的合理性，指出潜在的 `nil` 传播与类型混淆风险。
- 评判 Table 作为万能容器的优缺点，给出在大型项目中引入 schema 校验的建议。
- 评估元表的使用是否过度，提出在简单场景下避免元表的设计建议。
- 对比 Lua Table 与 Python dict、JavaScript Object、Java HashMap 的性能特征。
- 评判某段面向对象代码是否符合 SOLID 原则，提出重构建议。

### 1.6 创造层（Create）

完成本节后，学习者应能：

- 设计一个支持多种数据结构（栈、队列、集合、图）的 Lua 容器库。
- 实现一个基于元表的领域特定语言（DSL），如数学向量运算或矩阵运算。
- 构建一套 Table 序列化与反序列化工具，支持循环引用与元表保留。
- 编写一个支持不可变表（immutable table）的库，通过元表拦截写操作。
- 设计一个基于弱表的缓存系统，支持 LRU 淘汰与自动 GC 回收。

## 2. 历史动机与背景

### 2.1 Lua 的诞生与设计哲学

Lua 由巴西里约热内卢天主教大学（PUC-Rio）的 Roberto Ierusalimschy、Luiz Henrique de Figueiredo 和 Waldemar Celes 三人于 1993 年创建。其设计初衷是为巴西石油公司（Petrobras）的数据录入系统提供一种可嵌入的配置语言，替代当时使用的 SOL（Simple Object Language）与 DEL（Data-Entry Language）。

Lua 的核心设计哲学可以概括为"少即是多"（less is more）：

1. **极简类型系统**：仅提供 8 种基础类型，不区分整数与浮点数（5.3 之前）、不区分字符与字符串、不区分数组与字典。
2. **单一容器类型**：Table 作为唯一的复合数据结构，统一了数组、字典、对象、命名空间的概念。
3. **元表机制**：通过元表实现运算符重载、继承、代理等高级语义，而非引入专门的语言特性。
4. **可嵌入性**：Lua 从一开始就设计为可嵌入宿主程序的脚本语言，其类型系统需与 C 语言高效互操作。

### 2.2 Table 的演化历史

Table 是 Lua 最具特色的设计之一，其演化反映了 Lua 团队对性能与简洁性的持续追求。

**Lua 1.0（1993）**：Table 作为唯一的结构化数据类型被引入，但实现较为简单，仅支持哈希表部分。

**Lua 2.5（1996）**：引入了"数组部分"优化，Table 内部同时维护数组与哈希表两部分，对于连续整数键自动使用数组存储，显著提升了数值密集场景的性能。

**Lua 3.0（1997）**：引入元表机制，Table 可通过 `setmetatable` 设置元方法，开启了运算符重载与面向对象编程的可能。

**Lua 4.0（2000）**：引入多返回值与 `table.pack`/`table.unpack`（当时为 `call`/`unpack`），完善了 Table 与函数参数的互操作。

**Lua 5.0（2003）**：引入了增量式垃圾回收与弱表（weak table），Table 可通过 `__mode` 元方法声明为弱引用，用于缓存场景。

**Lua 5.1（2006）**：引入 `ipairs` 与 `pairs` 的明确区分，规范了数组遍历与字典遍历的语义。LuaJIT 基于 5.1 实现，进一步优化了 Table 的性能。

**Lua 5.2（2011）**：移除了 `table.getn`，统一使用 `#` 运算符获取数组长度；引入 `__len` 元方法，允许自定义长度语义。

**Lua 5.3（2015）**：引入 64 位整数子类型，`number` 类型内部区分为整数与浮点数，但对外仍表现为统一的 `number` 类型。引入 `__band`、`__bor`、`__bxor` 等位运算元方法。

**Lua 5.4（2020）**：引入 `__close` 元方法与 `<close>` 变量，Table 可作为资源句柄实现 RAII；优化了垃圾回收器，支持分代 GC。

### 2.3 设计权衡：为什么是 Table

大多数脚本语言选择为不同用途提供不同类型：Python 同时有 `list`、`dict`、`set`、`tuple`；JavaScript 有 `Array`、`Object`、`Map`、`Set`；Ruby 有 `Array`、`Hash`、`Set`。Lua 选择"一种类型走天下"，这背后的设计权衡值得深入理解。

**统一性的优势**：

1. **学习成本低**：开发者只需掌握一种容器类型，降低入门门槛。
2. **互操作性强**：所有库函数都可以接受 Table 作为参数，无需考虑类型转换。
3. **元表统一**：一套元表机制适用于所有容器场景，无需为每种类型设计单独的扩展机制。
4. **C 互操作简单**：Lua C API 只需处理 `lua_Table` 一种复合类型，简化了绑定代码。

**统一性的代价**：

1. **语义模糊**：同一个 Table 可能是数组、字典或对象，代码意图不清晰，需要约定或注释。
2. **性能损耗**：无法针对特定场景做极致优化（如 Python 的 `list` 针对 integer 做了专门优化）。
3. **类型安全弱**：编译期无法检查 Table 的结构是否符合预期，需要运行时校验。
4. **API 膨胀**：`table` 标准库需要承载多种用途，函数命名容易冲突（如 `insert` 是数组操作还是字典操作？）。

Lua 团队选择了统一性，这一决策使得 Lua 极其适合作为嵌入式脚本语言，但在大型项目开发中需要额外的工程规范来弥补类型安全的不足。

### 2.4 关键里程碑

| 时间 | 版本 | 事件 | 意义 |
| :--- | :--- | :--- | :--- |
| 1993 | Lua 1.0 | Table 作为唯一结构类型 | 确立"少即是多"的设计哲学 |
| 1996 | Lua 2.5 | 引入数组部分优化 | 大幅提升数值密集场景性能 |
| 1997 | Lua 3.0 | 引入元表机制 | 开启运算符重载与 OOP |
| 2003 | Lua 5.0 | 引入弱表 | 支持缓存与自动 GC |
| 2006 | Lua 5.1 | 规范 `ipairs`/`pairs` | 明确数组与字典遍历语义 |
| 2011 | Lua 5.2 | 引入 `__len` 元方法 | 允许自定义长度语义 |
| 2015 | Lua 5.3 | 引入整数子类型 | 解决浮点精度问题 |
| 2020 | Lua 5.4 | 引入 `__close` 元方法 | 支持 RAII 资源管理 |
| 2024 | Lua 5.4.7 | 持续优化 Table 性能 | 内存占用与访问速度持续改进 |

## 3. 形式化定义

### 3.1 类型系统形式化

Lua 的类型系统可形式化为以下集合：

$$
T = \{\text{nil}, \text{boolean}, \text{number}, \text{string}, \text{function}, \text{table}, \text{thread}, \text{userdata}\}
$$

其中 `number` 在 Lua 5.3+ 内部进一步划分为：

$$
\text{number} = \text{integer} \cup \text{float}
$$

但通过 `type()` 函数观察时，两者都返回 `"number"`，需通过 `math.type()` 进一步区分。

类型判断函数 `type: V \to T_{\text{name}}` 定义为：

$$
\text{type}(v) = \begin{cases}
\text{"nil"} & \text{if } v = \text{nil} \\
\text{"boolean"} & \text{if } v \in \{\text{true}, \text{false}\} \\
\text{"number"} & \text{if } v \in \mathbb{R} \\
\text{"string"} & \text{if } v \in \Sigma^* \\
\text{"function"} & \text{if } v \text{ is a function value} \\
\text{"table"} & \text{if } v \text{ is a table reference} \\
\text{"thread"} & \text{if } v \text{ is a coroutine} \\
\text{"userdata"} & \text{if } v \text{ is a C data block}
\end{cases}
$$

其中 $V$ 为所有可能值的集合，$\Sigma^*$ 为字符串的字母表闭包。

### 3.2 Table 的形式化定义

Table 是 Lua 中唯一的复合数据结构，形式化定义为二元组：

$$
\text{Table} = (A, H)
$$

其中：

- $A = [a_1, a_2, \ldots, a_n]$ 为数组部分（array part），存储连续的整数键 $1, 2, \ldots, n$。
- $H = \{(k_1, v_1), (k_2, v_2), \ldots, (k_m, v_m)\}$ 为哈希部分（hash part），存储任意类型的键。

键的类型约束为：

$$
k \in \text{Keys} \iff k \in (\mathbb{R} \setminus \{\text{NaN}\}) \cup \Sigma^* \cup \text{Table} \cup \text{function} \cup \text{thread} \cup \text{userdata}
$$

即键可以是除 `nil` 和 `NaN` 外的任意值。注意 `boolean` 作为键时，`true` 和 `false` 被视为不同的键。

值的类型无约束：

$$
v \in \text{Values} = V \setminus \{\text{NaN}\}
$$

### 3.3 Table 的访问语义

Table 的读写操作形式化定义如下：

**读取操作** $t[k]$：

$$
\text{read}(t, k) = \begin{cases}
v & \text{if } (k, v) \in t \text{ and } v \neq \text{nil} \\
\text{trigger } \_\_\text{index} & \text{if } (k, v) \notin t \text{ or } v = \text{nil} \\
\text{nil} & \text{if } \_\_\text{index} \text{ returns nil}
\end{cases}
$$

**写入操作** $t[k] = v$：

$$
\text{write}(t, k, v) = \begin{cases}
\text{trigger } \_\_\text{newindex} & \text{if } (k, \_) \notin t \\
\text{insert}(t, k, v) & \text{if } (k, \_) \notin t \text{ and } v \neq \text{nil} \text{ and no } \_\_\text{newindex} \\
\text{update}(t, k, v) & \text{if } (k, \_) \in t \text{ and } v \neq \text{nil} \\
\text{delete}(t, k) & \text{if } v = \text{nil}
\end{cases}
$$

特别注意：将键的值设为 `nil` 等价于删除该键，这是 Lua Table 的核心语义之一。

### 3.4 数组长度的形式化定义

Lua 中数组长度 `#t` 的定义较为微妙，形式化为：

$$
\#t = \text{any } i \text{ such that } t[i] \neq \text{nil} \text{ and } t[i+1] = \text{nil}
$$

即返回一个边界（border），满足 $t[i] \neq \text{nil}$ 且 $t[i+1] = \text{nil}$。当 Table 存在多个边界时（即"空洞"数组），`#t` 的返回值不确定，可能是任意一个边界。

对于无空洞的密集数组，`#t` 唯一确定为 $n$。对于稀疏数组，应避免依赖 `#t`，改用显式计数或 `table.maxn`（Lua 5.1 已废弃，需自行实现）。

### 3.5 元表查找算法

元表的查找算法形式化为递归过程：

$$
\text{lookup}(t, k) = \begin{cases}
v & \text{if } (k, v) \in t \text{ and } v \neq \text{nil} \\
\text{index\_meta}(mt, t, k) & \text{otherwise}
\end{cases}
$$

其中 $\text{index\_meta}$ 定义为：

$$
\text{index\_meta}(mt, t, k) = \begin{cases}
\text{nil} & \text{if } mt = \text{nil} \\
mt.\_\_\text{index}(t, k) & \text{if } mt.\_\_\text{index} \text{ is a function} \\
\text{lookup}(mt.\_\_\text{index}, k) & \text{if } mt.\_\_\text{index} \text{ is a table} \\
\text{nil} & \text{otherwise}
\end{cases}
$$

这一递归过程实现了原型链查找，是 Lua 面向对象编程的理论基础。

### 3.6 弱表的形式化定义

弱表通过 `__mode` 元方法声明，其取值组合为：

$$
\_\_\text{mode} \in \{\text{"k"}, \text{"v"}, \text{"kv"}, \text{""}\}
$$

分别表示：

- `"k"`：键为弱引用，键可被 GC 回收。
- `"v"`：值为弱引用，值可被 GC 回收。
- `"kv"`：键值均为弱引用。
- `""`：默认，键值均为强引用。

弱表的 GC 行为形式化为：当某键或值仅被弱表引用时，GC 会将其回收，并将对应的表项置为 `nil`：

$$
\text{GC triggers: } \forall (k, v) \in t, \text{ if } \text{refcount}(k) = 1 \text{ and } \_\_\text{mode} \ni \text{"k"}, \text{ then } t[k] \leftarrow \text{nil}
$$

## 4. 理论推导与复杂度分析

### 4.1 Table 的内存布局

Lua Table 在虚拟机内部由 `Table` 结构体表示，其内存布局可抽象为：

$$
\text{sizeof}(t) = \text{sizeof}(\text{Header}) + n_a \times \text{sizeof}(\text{Slot}_a) + n_h \times \text{sizeof}(\text{Slot}_h)
$$

其中：

- $n_a$ 为数组部分容量（2 的幂次对齐）。
- $n_h$ 为哈希部分容量（2 的幂次对齐）。
- `Slot_a` 约 16 字节（8 字节 value + 8 字节 key 隐含为数组索引）。
- `Slot_h` 约 32 字节（8 字节 key + 8 字节 value + 16 字节 next 指针与哈希值）。
- `Header` 约 56-80 字节（包含元表指针、数组指针、哈希指针、长度等元信息）。

对于 100 个元素的纯数组，内存占用约为 $80 + 128 \times 16 \approx 2.1\text{KB}$（容量对齐到 128）。

对于 100 个键值对的纯字典，内存占用约为 $80 + 128 \times 32 \approx 4.2\text{KB}$。

### 4.2 哈希表的平均复杂度

Lua 哈希表采用链地址法解决冲突，在负载因子合理（$\alpha \leq 1$）的情况下，平均查找复杂度为 $O(1)$：

$$
E[T_{\text{lookup}}] = O(1) + \alpha \times O(1) = O(1 + \alpha)
$$

最坏情况下（所有键哈希冲突），复杂度退化为 $O(n)$。Lua 的哈希函数对常见类型（整数、短字符串）做了专门优化，冲突概率极低。

**Rehash 触发条件**：当哈希表负载因子超过 1 或插入新键时无空槽，Lua 触发 rehash，容量翻倍。Rehash 的复杂度为 $O(n)$，但均摊到每次插入为 $O(1)$。

### 4.3 数组部分的优化

Lua Table 的数组部分针对连续整数键 $1, 2, \ldots, n$ 做了专门优化：

1. **直接寻址**：访问 $t[i]$ 通过数组下标直接计算，复杂度 $O(1)$，无哈希计算开销。
2. **缓存友好**：数组元素连续存储，CPU 缓存命中率高。
3. **内存紧凑**：相比哈希表，省去了 key 与 next 指针，内存占用减少约 50%。

Lua 在插入键时会自动判断是否应放入数组部分。判断算法基于"边界"概念：若插入键 $k$ 后，$t[1], t[2], \ldots, t[k]$ 均非 `nil`，则将 $k$ 纳入数组部分。

### 4.4 `ipairs` 与 `pairs` 的复杂度

**`ipairs`** 遍历数组部分，复杂度为 $O(n_a)$，其中 $n_a$ 为第一个 `nil` 值的位置：

$$
T_{\text{ipairs}} = O(\min(n_a, \text{first\_nil\_index}))
$$

**`pairs`** 遍历所有键值对，复杂度为 $O(n_a + n_h)$：

$$
T_{\text{pairs}} = O(n_a + n_h)
$$

对于大规模 Table，`ipairs` 通常快于 `pairs`，因为数组部分缓存友好且无需哈希计算。

### 4.5 `table.sort` 的算法与复杂度

Lua 标准库的 `table.sort` 采用快速排序的改进版本（结合插入排序），平均复杂度为 $O(n \log n)$，最坏复杂度为 $O(n^2)$（极少触发，因为 Lua 选择了中位数作为 pivot）。

$$
T_{\text{sort}}(n) = \begin{cases}
O(n \log n) & \text{average case} \\
O(n^2) & \text{worst case (rare)}
\end{cases}
$$

对于小数组（$n \leq 16$），`table.sort` 切换为插入排序以减少递归开销。

### 4.6 `table.concat` 的性能优势

字符串拼接 `a .. b .. c` 的时间复杂度为 $O(n^2)$（每次拼接都创建新字符串并复制内容）。`table.concat` 预先计算总长度，一次性分配内存，复杂度为 $O(n)$：

$$
T_{\text{concat}}(n) = O\left(\sum_{i=1}^{n} |s_i|\right) = O(L)
$$

其中 $L$ 为结果字符串总长度。对于 10000 个字符串的拼接，`table.concat` 通常比 `..` 运算符快 100 倍以上。

### 4.7 弱表的 GC 开销

弱表在每次 GC 时都需要扫描，复杂度为 $O(n)$：

$$
T_{\text{weak\_gc}} = O(n_{\text{weak}})
$$

其中 $n_{\text{weak}}$ 为所有弱表的键值对总数。对于大规模弱表缓存，GC 开销可能成为性能瓶颈。生产环境应控制弱表规模，或采用分代 GC（Lua 5.4+）。

## 5. 代码示例

### 5.1 类型判断与转换

```lua
-- 类型判断与转换示例
-- 演示 type()、tonumber()、tostring() 的用法

-- 1. 基础类型判断
-- type() 返回字符串，可用于 if 判断
local function describe_type(value)
    -- 使用 type() 获取类型名称
    local t = type(value)
    if t == "nil" then
        return "无值"
    elseif t == "boolean" then
        return "布尔值: " .. tostring(value)
    elseif t == "number" then
        -- Lua 5.3+ 可用 math.type() 区分整数与浮点数
        local sub_type = math.type and math.type(value) or "number"
        return "数值(" .. sub_type .. "): " .. tostring(value)
    elseif t == "string" then
        return "字符串: " .. value
    elseif t == "function" then
        return "函数"
    elseif t == "table" then
        return "表"
    elseif t == "thread" then
        return "协程"
    elseif t == "userdata" then
        return "用户数据"
    end
end

-- 测试各种类型
print(describe_type(nil))           -- 无值
print(describe_type(true))          -- 布尔值: true
print(describe_type(42))            -- 数值(integer): 42
print(describe_type(3.14))          -- 数值(float): 3.14
print(describe_type("hello"))       -- 字符串: hello
print(describe_type(print))         -- 函数
print(describe_type({}))            -- 表

-- 2. 数值与字符串转换
local num = 123
local str = tostring(num)           -- "123"
print(str, type(str))               -- 123    string

local s1 = "456"
local n1 = tonumber(s1)             -- 456
print(n1, type(n1))                 -- 456    number

local s2 = "3.14"
local n2 = tonumber(s2)             -- 3.14
print(n2, type(n2))                 -- 3.14    number

-- 转换失败返回 nil
local s3 = "hello"
local n3 = tonumber(s3)             -- nil
print(n3)                            -- nil

-- 支持进制转换
local hex = tonumber("FF", 16)      -- 255
local bin = tonumber("1010", 2)     -- 10
print(hex, bin)                      -- 255    10

-- 3. 算术运算中的隐式转换
print("10" + 5)                     -- 15（字符串转数值）
print(10 .. "5")                    -- 105（数值转字符串）
-- 注意：.. 两侧必须有空格，避免与数字冲突
-- print(10..20)                    -- 报错：malformed number
```

### 5.2 Table 的创建与基本操作

```lua
-- Table 的创建与基本操作示例

-- 1. 创建空表
local t1 = {}
print(type(t1))                     -- table

-- 2. 创建数组（列表）
local arr = {10, 20, 30, 40, 50}
print(#arr)                          -- 5（数组长度）
print(arr[1], arr[3])                -- 10    30（Lua 索引从 1 开始）

-- 3. 创建字典（映射）
local dict = {
    name = "Lua",
    version = 5.4,
    author = "PUC-Rio"
}
print(dict.name)                     -- Lua
print(dict["version"])               -- 5.4

-- 4. 混合表（数组部分 + 字典部分）
local mixed = {
    "apple", "banana",               -- 数组部分（索引 1, 2）
    name = "fruit",                  -- 字典部分
    count = 2
}
print(mixed[1])                      -- apple
print(mixed.name)                    -- fruit

-- 5. 复杂键
local complex = {
    [1] = "integer key",
    ["string"] = "string key",
    [true] = "boolean key",
    [3.14] = "float key",
    -- [{}] = "table key",           -- 表作为键（不推荐，难以检索）
}
print(complex[1])                    -- integer key
print(complex["string"])             -- string key
print(complex[true])                 -- boolean key
print(complex[3.14])                 -- float key

-- 6. 嵌套表
local person = {
    name = "Alice",
    age = 30,
    address = {
        city = "Beijing",
        zip = "100000"
    },
    hobbies = {"reading", "coding", "gaming"}
}
print(person.address.city)           -- Beijing
print(person.hobbies[2])             -- coding

-- 7. 表的增删改查
local t = {}
-- 增
t.name = "Bob"
t["age"] = 25
t[1] = "first"
-- 改
t.name = "Charlie"
-- 查
print(t.name, t.age, t[1])          -- Charlie    25    first
-- 删（将值设为 nil）
t.age = nil
print(t.age)                         -- nil（键不存在）
```

### 5.3 Table 的遍历

```lua
-- Table 的三种遍历方式

local arr = {10, 20, 30, 40, 50}
local dict = {a = 1, b = 2, c = 3}
local mixed = {10, 20, 30, name = "Lua", version = 5.4}

-- 1. 数值 for 循环（适用于数组）
print("--- 数值 for ---")
for i = 1, #arr do
    print(i, arr[i])
end
-- 输出：
-- 1    10
-- 2    20
-- 3    30
-- 4    40
-- 5    50

-- 2. ipairs 遍历（仅数组部分，遇 nil 终止）
print("--- ipairs ---")
for i, v in ipairs(arr) do
    print(i, v)
end
-- 输出同上

print("--- ipairs on mixed ---")
for i, v in ipairs(mixed) do
    print(i, v)
end
-- 输出：1    10 / 2    20 / 3    30（仅遍历数组部分）

-- 3. pairs 遍历（所有键值对，顺序不定）
print("--- pairs on dict ---")
for k, v in pairs(dict) do
    print(k, v)
end
-- 输出顺序不定，可能为：
-- a    1
-- b    2
-- c    3

print("--- pairs on mixed ---")
for k, v in pairs(mixed) do
    print(k, v)
end
-- 输出包含数组部分（1,2,3）和字典部分（name, version）

-- 4. 有序遍历字典（需手动排序键）
print("--- 有序遍历字典 ---")
local keys = {}
for k in pairs(dict) do
    keys[#keys + 1] = k
end
table.sort(keys)                     -- 按键排序
for _, k in ipairs(keys) do
    print(k, dict[k])
end
-- 输出：a    1 / b    2 / c    3（有序）

-- 5. 遍历同时修改（陷阱演示）
-- 错误示范：遍历时添加新键可能导致未定义行为
-- for k, v in pairs(t) do
--     t[k .. "_new"] = v        -- 危险！
-- end

-- 正确做法：先收集要修改的项，遍历后再修改
local to_add = {}
for k, v in pairs(dict) do
    to_add[k .. "_new"] = v
end
for k, v in pairs(to_add) do
    dict[k] = v
end
```

### 5.4 table 标准库函数

```lua
-- table 标准库函数演示

-- 1. table.insert：插入元素
local arr = {10, 20, 30}
-- 末尾插入
table.insert(arr, 40)
print(table.concat(arr, ", "))       -- 10, 20, 30, 40
-- 指定位置插入（后续元素后移）
table.insert(arr, 2, 15)
print(table.concat(arr, ", "))       -- 10, 15, 20, 30, 40

-- 2. table.remove：删除元素
local removed = table.remove(arr)    -- 删除末尾元素
print(removed, table.concat(arr, ", "))  -- 40    10, 15, 20, 30
table.remove(arr, 1)                 -- 删除指定位置
print(table.concat(arr, ", "))       -- 15, 20, 30

-- 3. table.concat：连接元素为字符串
local strs = {"Hello", "World", "Lua"}
print(table.concat(strs, " "))       -- Hello World Lua
print(table.concat(strs, ", ", 2))   -- World, Lua（指定起始位置）
print(table.concat(strs, ", ", 1, 2)) -- Hello, World（指定范围）

-- 4. table.sort：排序
local nums = {5, 3, 8, 1, 9, 2}
table.sort(nums)
print(table.concat(nums, ", "))      -- 1, 2, 3, 5, 8, 9

-- 降序排序（自定义比较函数）
table.sort(nums, function(a, b) return a > b end)
print(table.concat(nums, ", "))      -- 9, 8, 5, 3, 2, 1

-- 对象排序（按某字段）
local people = {
    {name = "Alice", age = 30},
    {name = "Bob", age = 25},
    {name = "Charlie", age = 35}
}
table.sort(people, function(a, b) return a.age < b.age end)
for _, p in ipairs(people) do
    print(p.name, p.age)
end
-- 输出：Bob 25 / Alice 30 / Charlie 35

-- 5. table.unpack（Lua 5.2+ 为 table.unpack，5.1 为全局 unpack）
local t = {1, 2, 3}
local a, b, c = table.unpack(t)
print(a, b, c)                       -- 1    2    3
-- 部分解包
local x, y = table.unpack(t, 2)
print(x, y)                          -- 2    3

-- 6. table.pack（Lua 5.2+，将多返回值打包为表）
local function varargs(...)
    local t = table.pack(...)
    print("参数个数:", t.n)           -- t.n 存储参数个数
    for i = 1, t.n do
        print(i, t[i])
    end
end
varargs(10, 20, 30)
-- 输出：参数个数: 3 / 1    10 / 2    20 / 3    30

-- 7. table.move（Lua 5.3+，移动元素）
local src = {1, 2, 3, 4, 5}
local dst = {}
table.move(src, 2, 4, 1, dst)        -- 将 src[2..4] 复制到 dst[1..3]
print(table.concat(dst, ", "))       -- 2, 3, 4
-- 原地移动（重叠区域）
table.move(src, 1, 3, 3)             -- src[1..3] 移动到 src[3..5]
print(table.concat(src, ", "))       -- 1, 2, 1, 2, 3
```

### 5.5 元表与元方法

```lua
-- 元表与元方法示例

-- 1. __index 元方法：定义表访问不存在的键时的行为
local defaults = {x = 0, y = 0}
local pt = setmetatable({}, {
    __index = defaults                -- 当 pt 中找不到键时，从 defaults 查找
})
print(pt.x, pt.y)                     -- 0    0（来自 defaults）
pt.x = 10
print(pt.x)                           -- 10（自身值优先）
print(pt.y)                           -- 0（仍来自 defaults）

-- __index 也可以是函数
local logged = setmetatable({}, {
    __index = function(t, k)
        print("访问不存在的键:", k)
        return nil
    end
})
local v = logged.foo                  -- 访问不存在的键: foo
print(v)                              -- nil

-- 2. __newindex 元方法：定义给不存在的键赋值时的行为
local readonly = setmetatable({}, {
    __newindex = function(t, k, v)
        error("不能给只读表添加新键: " .. tostring(k))
    end
})
-- readonly.existing = "value"        -- 报错：不能给只读表添加新键: existing

-- 3. 运算符重载：实现向量类型
local Vector = {}
Vector.__index = Vector

function Vector.new(x, y)
    return setmetatable({x = x, y = y}, Vector)
end

-- 加法
Vector.__add = function(a, b)
    return Vector.new(a.x + b.x, a.y + b.y)
end

-- 减法
Vector.__sub = function(a, b)
    return Vector.new(a.x - b.x, a.y - b.y)
end

-- 乘法（点积或标量乘）
Vector.__mul = function(a, b)
    if type(b) == "number" then
        -- 标量乘
        return Vector.new(a.x * b, a.y * b)
    else
        -- 点积
        return a.x * b.x + a.y * b.y
    end
end

-- 相等比较
Vector.__eq = function(a, b)
    return a.x == b.x and a.y == b.y
end

-- 字符串表示
Vector.__tostring = function(a)
    return string.format("(%g, %g)", a.x, a.y)
end

-- 长度（模）
Vector.__len = function(a)
    return math.sqrt(a.x * a.x + a.y * a.y)
end

-- 调用（构造函数别名）
Vector.__call = function(_, x, y)
    return Vector.new(x, y)
end

-- 使用向量
local v1 = Vector.new(3, 4)
local v2 = Vector.new(1, 2)
local v3 = v1 + v2
print(tostring(v3))                   -- (4, 6)
print(#v1)                            -- 5（3-4-5 三角形）
print(v1 * v2)                        -- 11（点积：3*1 + 4*2）
print(v1 == Vector.new(3, 4))         -- true
local v4 = Vector(5, 6)               -- 通过 __call 构造
print(tostring(v4))                   -- (5, 6)

-- 4. __call 元方法：让表像函数一样调用
local counter = setmetatable({count = 0}, {
    __call = function(t, increment)
        t.count = t.count + (increment or 1)
        return t.count
    end
})
print(counter())                      -- 1
print(counter(10))                    -- 11
print(counter())                      -- 12
print(counter.count)                  -- 12

-- 5. __tostring 与 print
local obj = setmetatable({name = "obj"}, {
    __tostring = function(t)
        return "Object(" .. t.name .. ")"
    end
})
print(obj)                            -- Object(obj)（print 自动调用 __tostring）
```

### 5.6 面向对象编程

```lua
-- 基于 Table 与元表的面向对象编程

-- 1. 类的定义与实例化
local Animal = {}
Animal.__index = Animal

-- 构造函数
function Animal.new(name, sound)
    -- 创建新实例，设置元表为 Animal（实现方法继承）
    local self = setmetatable({}, Animal)
    self.name = name
    self.sound = sound
    return self
end

-- 方法
function Animal:speak()
    -- 使用 : 语法糖，self 自动传入
    print(self.name .. " says: " .. self.sound)
end

function Animal:getName()
    return self.name
end

-- 创建实例
local dog = Animal.new("Dog", "Woof")
local cat = Animal.new("Cat", "Meow")
dog:speak()                           -- Dog says: Woof
cat:speak()                           -- Cat says: Meow

-- 2. 继承
local Dog = setmetatable({}, {__index = Animal})
Dog.__index = Dog

function Dog.new(name, breed)
    -- 调用父类构造函数
    local self = Animal.new(name, "Woof")
    -- 重新设置元表为 Dog
    setmetatable(self, Dog)
    self.breed = breed
    return self
end

-- 子类特有方法
function Dog:getBreed()
    return self.breed
end

-- 重写父类方法
function Dog:speak()
    print(self.name .. " (" .. self.breed .. ") barks: Woof Woof!")
end

local myDog = Dog.new("Buddy", "Golden Retriever")
myDog:speak()                         -- Buddy (Golden Retriever) barks: Woof Woof!
print(myDog:getName())                -- Buddy（继承自 Animal）
print(myDog:getBreed())               -- Golden Retriever

-- 3. 多重继承（通过复杂 __index）
local Flyable = {}
function Flyable:fly()
    print(self.name .. " is flying!")
end

local Swimmable = {}
function Swimmable:swim()
    print(self.name .. " is swimming!")
end

-- 多重继承的 __index 实现
local function search(mixins, key)
    for _, mixin in ipairs(mixins) do
        if mixin[key] then
            return mixin[key]
        end
    end
    return nil
end

local Duck = setmetatable({}, {
    __index = function(_, key)
        return search({Flyable, Swimmable, Animal}, key)
    end
})
Duck.__index = Duck

function Duck.new(name)
    local self = setmetatable({}, Duck)
    self.name = name
    self.sound = "Quack"
    return self
end

local donald = Duck.new("Donald")
donald:speak()                        -- Donald says: Quack（来自 Animal）
donald:fly()                          -- Donald is flying!（来自 Flyable）
donald:swim()                         -- Donald is swimming!（来自 Swimmable）

-- 4. 闭包式封装（私有变量）
local Counter = {}
Counter.__index = Counter

function Counter.new(initial)
    local count = initial or 0        -- 私有变量，外部无法直接访问
    
    local obj = setmetatable({}, Counter)
    
    -- 通过闭包访问私有变量
    function obj:increment()
        count = count + 1
        return count
    end
    
    function obj:decrement()
        count = count - 1
        return count
    end
    
    function obj:value()
        return count
    end
    
    return obj
end

local c = Counter.new(10)
print(c:increment())                  -- 11
print(c:increment())                  -- 12
print(c:value())                      -- 12
-- print(c.count)                     -- nil（无法直接访问私有变量）
```

### 5.7 弱表与缓存

```lua
-- 弱表（weak table）示例：自动 GC 的缓存

-- 1. 弱值表（value 为弱引用）
local cache = setmetatable({}, {__mode = "v"})

-- 模拟缓存对象
local function create_object(id)
    return {id = id, data = string.rep("x", 1000)}
end

-- 填充缓存
cache.obj1 = create_object(1)
cache.obj2 = create_object(2)
cache.obj3 = create_object(3)

print(cache.obj1.id, cache.obj2.id, cache.obj3.id)  -- 1    2    3

-- 移除对 obj2 的强引用
cache.obj2 = nil
-- 强制 GC
collectgarbage("collect")

-- obj2 被自动回收
print(cache.obj2)                     -- nil
print(cache.obj1.id)                  -- 1（仍存在，因为有外部引用）
print(cache.obj3.id)                  -- 3

-- 2. 弱键表（key 为弱引用）：记忆化缓存
local memoize = setmetatable({}, {__mode = "k"})

local function expensive_compute(input)
    -- 检查缓存
    if memoize[input] then
        print("缓存命中: " .. tostring(input))
        return memoize[input]
    end
    -- 模拟耗时计算
    print("计算: " .. tostring(input))
    local result = input * 2
    memoize[input] = result
    return result
end

-- 创建一个表作为键
local key1 = {}
print(expensive_compute(key1))        -- 计算: table: 0x... / 0
print(expensive_compute(key1))        -- 缓存命中: table: 0x... / 0

-- 释放 key1
key1 = nil
collectgarbage("collect")

-- key1 被回收，对应的缓存项也被清除
local count = 0
for _ in pairs(memoize) do
    count = count + 1
end
print("缓存项数:", count)              -- 0

-- 3. 临时表缓存池（避免频繁创建表）
local pool = setmetatable({}, {__mode = "v"})

local function acquire_table()
    local t = table.remove(pool)
    if t then
        return t                       -- 复用
    else
        return {}                      -- 新建
    end
end

local function release_table(t)
    -- 清空表
    for k in pairs(t) do
        t[k] = nil
    end
    pool[#pool + 1] = t                -- 放入池中
end

-- 使用
local t = acquire_table()
t[1] = "hello"
t[2] = "world"
print(t[1], t[2])                     -- hello    world
release_table(t)
-- 表被回收进池，下次 acquire_table 可复用
```

### 5.8 数据结构实现

```lua
-- 使用 Table 实现常见数据结构

-- 1. 栈（Stack）：后进先出
local Stack = {}
Stack.__index = Stack

function Stack.new()
    return setmetatable({items = {}}, Stack)
end

function Stack:push(item)
    table.insert(self.items, item)
end

function Stack:pop()
    if #self.items == 0 then
        error("栈下溢")
    end
    return table.remove(self.items)
end

function Stack:peek()
    return self.items[#self.items]
end

function Stack:size()
    return #self.items
end

function Stack:isEmpty()
    return #self.items == 0
end

-- 使用栈
local s = Stack.new()
s:push(1)
s:push(2)
s:push(3)
print(s:peek())                       -- 3
print(s:pop())                        -- 3
print(s:pop())                        -- 2
print(s:size())                       -- 1

-- 2. 队列（Queue）：先进先出
local Queue = {}
Queue.__index = Queue

function Queue.new()
    return setmetatable({first = 1, last = 0, items = {}}, Queue)
end

function Queue:enqueue(item)
    self.last = self.last + 1
    self.items[self.last] = item
end

function Queue:dequeue()
    if self:first() > self:last then
        error("队列为空")
    end
    local item = self.items[self.first]
    self.items[self.first] = nil       -- 避免 memory leak
    self.first = self.first + 1
    return item
end

function Queue:size()
    return self.last - self.first + 1
end

-- 使用队列
local q = Queue.new()
q:enqueue("a")
q:enqueue("b")
q:enqueue("c")
print(q:dequeue())                    -- a
print(q:dequeue())                    -- b
print(q:size())                       -- 1

-- 3. 集合（Set）：无序不重复元素
local Set = {}
Set.__index = Set

function Set.new(values)
    local self = setmetatable({elements = {}}, Set)
    if values then
        for _, v in ipairs(values) do
            self.elements[v] = true
        end
    end
    return self
end

function Set:add(value)
    self.elements[value] = true
end

function Set:remove(value)
    self.elements[value] = nil
end

function Set:contains(value)
    return self.elements[value] == true
end

function Set:size()
    local count = 0
    for _ in pairs(self.elements) do
        count = count + 1
    end
    return count
end

-- 集合运算
function Set:union(other)
    local result = Set.new()
    for v in pairs(self.elements) do
        result:add(v)
    end
    for v in pairs(other.elements) do
        result:add(v)
    end
    return result
end

function Set:intersection(other)
    local result = Set.new()
    for v in pairs(self.elements) do
        if other:contains(v) then
            result:add(v)
        end
    end
    return result
end

-- 使用集合
local s1 = Set.new({1, 2, 3, 4})
local s2 = Set.new({3, 4, 5, 6})
print(s1:contains(2))                 -- true
print(s1:contains(5))                 -- false
local u = s1:union(s2)
print(u:size())                       -- 6
local i = s1:intersection(s2)
print(i:size())                       -- 2（3 和 4）

-- 4. 链表（Linked List）
local Node = {}
Node.__index = Node

function Node.new(value)
    return setmetatable({value = value, next = nil}, Node)
end

local LinkedList = {}
LinkedList.__index = LinkedList

function LinkedList.new()
    return setmetatable({head = nil, size = 0}, LinkedList)
end

function LinkedList:insertFront(value)
    local node = Node.new(value)
    node.next = self.head
    self.head = node
    self.size = self.size + 1
end

function LinkedList:insertBack(value)
    local node = Node.new(value)
    if not self.head then
        self.head = node
    else
        local current = self.head
        while current.next do
            current = current.next
        end
        current.next = node
    end
    self.size = self.size + 1
end

function LinkedList:removeFront()
    if not self.head then
        return nil
    end
    local value = self.head.value
    self.head = self.head.next
    self.size = self.size - 1
    return value
end

function LinkedList:forEach(fn)
    local current = self.head
    while current do
        fn(current.value)
        current = current.next
    end
end

-- 使用链表
local list = LinkedList.new()
list:insertBack(1)
list:insertBack(2)
list:insertFront(0)
list:forEach(function(v) io.write(v, " ") end)  -- 0 1 2
print()
```

### 5.9 Table 序列化

```lua
-- Table 序列化与反序列化

-- 1. 简单序列化（不支持循环引用）
local function serialize(obj, indent)
    indent = indent or ""
    if type(obj) == "nil" then
        return "nil"
    elseif type(obj) == "boolean" then
        return tostring(obj)
    elseif type(obj) == "number" then
        return tostring(obj)
    elseif type(obj) == "string" then
        return string.format("%q", obj)  -- 自动转义
    elseif type(obj) == "table" then
        local parts = {}
        local new_indent = indent .. "  "
        
        -- 数组部分
        for i, v in ipairs(obj) do
            parts[#parts + 1] = new_indent .. serialize(v, new_indent)
        end
        
        -- 字典部分
        for k, v in pairs(obj) do
            if type(k) == "number" and k <= #obj then
                -- 已在数组部分处理
            else
                local key_str
                if type(k) == "string" and k:match("^[%a_][%w_]*$") then
                    key_str = k
                else
                    key_str = "[" .. serialize(k) .. "]"
                end
                parts[#parts + 1] = new_indent .. key_str .. " = " .. serialize(v, new_indent)
            end
        end
        
        if #parts == 0 then
            return "{}"
        else
            return "{\n" .. table.concat(parts, ",\n") .. "\n" .. indent .. "}"
        end
    else
        return "nil  -- unsupported type: " .. type(obj)
    end
end

-- 测试序列化
local data = {
    name = "Alice",
    age = 30,
    hobbies = {"reading", "coding"},
    address = {
        city = "Beijing",
        zip = "100000"
    },
    active = true,
    [10] = "special key"
}
print(serialize(data))
-- 输出格式化的表内容

-- 2. 支持循环引用的序列化
local function serialize_safe(obj, seen)
    seen = seen or {}
    if type(obj) == "table" then
        if seen[obj] then
            return '"[circular: ' .. tostring(obj) .. ']"'
        end
        seen[obj] = true
        
        local parts = {}
        for k, v in pairs(obj) do
            local key_str = type(k) == "string" and k or "[" .. serialize_safe(k, seen) .. "]"
            parts[#parts + 1] = key_str .. " = " .. serialize_safe(v, seen)
        end
        return "{" .. table.concat(parts, ", ") .. "}"
    elseif type(obj) == "string" then
        return string.format("%q", obj)
    else
        return tostring(obj)
    end
end

-- 测试循环引用
local cyclic = {name = "cyclic"}
cyclic.self = cyclic
print(serialize_safe(cyclic))         -- {name = "cyclic", self = "[circular: ...]"}
```

### 5.10 不可变表

```lua
-- 通过元方法实现不可变表

local function immutable(data)
    -- data 为初始数据
    return setmetatable({}, {
        -- 拦截读取
        __index = data,
        -- 拦截写入
        __newindex = function(t, k, v)
            error("attempt to modify immutable table: " .. tostring(k), 2)
        end,
        -- 拦截长度
        __len = function(t)
            local count = 0
            for _ in pairs(data) do
                count = count + 1
            end
            return count
        end,
        -- 拦截 pairs
        __pairs = function(t)
            return pairs(data)
        end,
        -- 字符串表示
        __tostring = function(t)
            return "immutable(" .. tostring(data) .. ")"
        end
    })
end

-- 使用不可变表
local config = immutable({
    host = "localhost",
    port = 8080,
    debug = false
})

print(config.host)                    -- localhost
print(config.port)                    -- 8080
print(config.debug)                   -- false

-- config.host = "0.0.0.0"            -- 报错：attempt to modify immutable table: host

-- 遍历
for k, v in pairs(config) do
    print(k, v)
end

-- "修改"不可变表：返回新表（函数式更新）
local function update(imm, updates)
    local new_data = {}
    for k, v in pairs(getmetatable(imm).__index) do
        new_data[k] = v
    end
    for k, v in pairs(updates) do
        new_data[k] = v
    end
    return immutable(new_data)
end

local new_config = update(config, {port = 9090})
print(new_config.port)                -- 9090
print(config.port)                    -- 8080（原表不变）
```

## 6. 对比分析

### 6.1 Lua Table 与其他语言的容器类型对比

| 特性 | Lua Table | Python dict/list | JavaScript Object/Array | Java HashMap/ArrayList | Ruby Hash/Array |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 类型数量 | 1 种统一类型 | 4+ 种（dict, list, set, tuple） | 2+ 种（Object, Array, Map, Set） | 2+ 种（HashMap, ArrayList, ...） | 2+ 种（Hash, Array） |
| 键类型 | 除 nil 与 NaN 外任意 | 不可变类型（str, int, tuple） | String/Symbol（ES6 Map 支持任意） | equals/hashCode 实现 | equals/hash 实现 |
| 索引基数 | 1 | 0 | 0 | 0 | 0 |
| 数组优化 | 内置数组部分 | list 专门优化 | V8 数组专门优化 | ArrayList 连续内存 | Array 专门优化 |
| 运算符重载 | 通过元表 | 不支持（用魔术方法） | 不支持（Proxy 接近） | 不支持 | 不支持 |
| 不可变支持 | 需自行实现 | dict 不可变版需第三方 | Object.freeze | Collections.unmodifiableXxx | Hash#freeze |
| 弱引用 | 内置弱表 | weakref 模块 | WeakMap/WeakSet | WeakHashMap | ObjectSpace::WeakMap |
| 内存效率 | 高（C 实现） | 中 | 中（V8 优化） | 中 | 中 |
| 学习成本 | 低（统一类型） | 中（多类型） | 中（多类型） | 高（集合框架庞大） | 中 |

**论述**：Lua Table 的"统一类型"哲学在学习成本与互操作性上具有显著优势，但在大型项目中可能因语义模糊导致维护困难。Python、JavaScript 等语言选择多类型方案，通过明确的类型区分提升了代码可读性，但增加了学习负担。Java 的集合框架最为庞大，提供了精细化的类型选择，但 API 复杂度也最高。

### 6.2 `ipairs` 与 `pairs` 对比

| 特性 | `ipairs` | `pairs` |
| :--- | :--- | :--- |
| 遍历范围 | 仅数组部分（连续整数键） | 所有键值对 |
| 顺序保证 | 严格按 $1, 2, 3, \ldots$ 顺序 | 无顺序保证 |
| 终止条件 | 遇到 `nil` 值即终止 | 遍历完所有键 |
| 复杂度 | $O(n_a)$ | $O(n_a + n_h)$ |
| 空洞行为 | 在空洞处终止 | 遍历所有键 |
| 适用场景 | 数组遍历 | 字典遍历、混合表遍历 |
| 元方法 | 受 `__index` 影响 | 受 `__pairs` 影响（5.2+） |

**论述**：`ipairs` 与 `pairs` 的核心差异在于遍历范围与顺序保证。对于纯数组（无空洞），两者行为一致；对于含空洞的数组，`ipairs` 会在第一个 `nil` 处停止，可能遗漏后续元素；对于字典，必须使用 `pairs`。生产环境应养成"数组用 `ipairs`，字典用 `pairs`"的明确习惯，避免混用导致的潜在 bug。

### 6.3 浅拷贝与深拷贝对比

| 特性 | 浅拷贝 | 深拷贝 |
| :--- | :--- | :--- |
| 复制层次 | 仅复制第一层 | 递归复制所有层 |
| 引用处理 | 嵌套表共享引用 | 嵌套表独立副本 |
| 性能 | $O(n)$ | $O(n \times \text{depth})$ |
| 内存占用 | 低 | 高 |
| 循环引用 | 无影响 | 需特殊处理 |
| 元表 | 默认不复制 | 可选择复制 |
| 适用场景 | 配置合并、默认值覆盖 | 状态快照、独立修改 |

**论述**：浅拷贝适用于"覆盖默认值"等简单场景，性能高且无循环引用风险。深拷贝适用于"完全独立的副本"场景，如状态快照、并发修改等。生产环境应根据实际需求选择，避免一律使用深拷贝导致的性能问题。对于含循环引用的复杂表，深拷贝必须维护 `seen` 表避免无限递归。

### 6.4 元表 vs 继承 vs 闭包

| 特性 | 元表继承 | 闭包封装 | 闭包 + 元表混合 |
| :--- | :--- | :--- | :--- |
| 私有性 | 无（所有字段可通过 t.k 访问） | 强（私有变量不可访问） | 强 |
| 性能 | 高（元方法查找 $O(1)$） | 中（每次访问需闭包查找） | 中 |
| 内存 | 低（共享元表） | 高（每个实例独立闭包） | 高 |
| 继承 | 支持（通过 `__index` 链） | 不支持 | 支持 |
| 运算符重载 | 支持 | 不支持 | 支持 |
| 适用场景 | 公开数据结构 | 需要强封装的对象 | 复杂业务对象 |

**论述**：元表继承是 Lua 最常见的 OOP 模式，性能高但缺乏私有性。闭包封装提供了真正的私有变量，但内存占用较高且不支持继承。混合模式结合两者优点，适合复杂业务对象，但实现复杂度较高。生产环境应根据对象的复杂度与性能要求选择合适的模式。

### 6.5 Lua 不同版本的 Table 特性

| 特性 | Lua 5.1 | Lua 5.2 | Lua 5.3 | Lua 5.4 |
| :--- | :--- | :--- | :--- | :--- |
| 整数/浮点区分 | 无 | 无 | 有（`math.type`） | 有 |
| `#` 运算符 | 内置 | 可通过 `__len` 自定义 | 同 5.2 | 同 5.2 |
| `table.unpack` | `unpack`（全局） | `table.unpack` | `table.unpack` | `table.unpack` |
| `table.pack` | 无 | 有 | 有 | 有 |
| `table.move` | 无 | 无 | 有 | 有 |
| `__pairs` 元方法 | 无 | 有 | 有 | 有 |
| `__ipairs` 元方法 | 无 | 有 | 有（5.3 移除） | 无 |
| 弱表 | 有 | 有 | 有 | 有 |
| `__close` 元方法 | 无 | 无 | 无 | 有 |
| 垃圾回收 | 增量 | 增量 | 增量 | 分代 + 增量 |
| 整除运算符 | 无 | 无 | `//` | `//` |

**论述**：Lua 5.3 是 Table 演化的重要分水岭，引入了整数子类型与 `table.move`，显著提升了数值处理能力。Lua 5.4 引入的 `__close` 元方法与分代 GC 是面向生产环境的重要改进，使得 Table 可作为资源句柄实现 RAII。生产环境建议使用 Lua 5.4 或 LuaJIT（基于 5.1 但有 JIT 加速），根据场景选择。

## 7. 常见陷阱与反模式

### 7.1 空洞数组与 `#` 运算符

**陷阱描述**：Lua 的 `#` 运算符对含"空洞"（hole，即中间出现 `nil`）的数组返回值不确定，可能返回任意一个边界。

**错误示例**：

```lua
-- 错误：依赖 # 获取含空洞数组的长度
local arr = {1, 2, 3, nil, 5, 6}
print(#arr)                           -- 可能是 3、6 或其他值
```

**生产事故案例**：某游戏公司在 Lua 中存储玩家背包物品，使用 `#backpack` 获取物品数量。当玩家移除中间格子的物品后，`#` 返回值不一致，导致 UI 显示数量错误，部分物品"消失"。最终通过显式维护 `count` 字段解决。

**正确做法**：

```lua
-- 方案 1：显式维护长度字段
local arr = {items = {}, count = 0}
local function add_item(t, item)
    t.count = t.count + 1
    t.items[t.count] = item
end
local function remove_item(t, idx)
    -- 移除并保持连续
    table.remove(t.items, idx)
    t.count = t.count - 1
end

-- 方案 2：使用 table.remove 保持连续
local arr = {1, 2, 3, 4, 5}
table.remove(arr, 3)                  -- 移除第 3 个，后续前移
print(#arr)                           -- 4（正确）

-- 方案 3：使用字典存储稀疏数据
local sparse = {}
sparse[1] = "a"
sparse[2] = "b"
sparse[100] = "z"
local count = 0
for _ in pairs(sparse) do count = count + 1 end  -- 显式计数
```

### 7.2 引用共享导致的意外修改

**陷阱描述**：Lua Table 是引用类型，`local t2 = t1` 不会复制表内容，修改 `t2` 会影响 `t1`。

**错误示例**：

```lua
-- 错误：误以为 t2 是 t1 的副本
local defaults = {host = "localhost", port = 8080}
local config = defaults                -- 这是引用，不是拷贝！
config.host = "0.0.0.0"
print(defaults.host)                  -- 0.0.0.0（默认值被污染！）
```

**生产事故案例**：某 Web 框架在请求处理中复用全局默认配置对象，开发者误将请求级配置写入默认对象，导致后续请求继承了前一个请求的配置，引发严重的安全问题（用户 A 的权限被应用到用户 B）。

**正确做法**：

```lua
-- 方案 1：浅拷贝
local function shallow_copy(t)
    local copy = {}
    for k, v in pairs(t) do
        copy[k] = v
    end
    return copy
end

local config = shallow_copy(defaults)
config.host = "0.0.0.0"
print(defaults.host)                  -- localhost（默认值不变）

-- 方案 2：深拷贝（嵌套表场景）
local function deep_copy(t, seen)
    seen = seen or {}
    if type(t) ~= "table" then
        return t
    end
    if seen[t] then
        return seen[t]                 -- 处理循环引用
    end
    local copy = {}
    seen[t] = copy
    for k, v in pairs(t) do
        copy[deep_copy(k, seen)] = deep_copy(v, seen)
    end
    return setmetatable(copy, getmetatable(t))
end

-- 方案 3：使用元表实现默认值（不复制）
local config = setmetatable({}, {__index = defaults})
config.host = "0.0.0.0"                -- 仅写入 config，不影响 defaults
print(config.host)                    -- 0.0.0.0
print(defaults.host)                  -- localhost
```

### 7.3 遍历时修改表

**陷阱描述**：在 `pairs` 遍历过程中添加或删除键，会导致未定义行为（跳过元素、重复遍历、死循环等）。

**错误示例**：

```lua
-- 错误：遍历时删除
local t = {a = 1, b = 2, c = 3, d = 4}
for k, v in pairs(t) do
    if v % 2 == 0 then
        t[k] = nil                     -- 危险！
    end
end
-- 结果不确定，可能部分键未被删除
```

**生产事故案例**：某缓存清理任务在遍历缓存表时删除过期项，导致部分过期数据未被清理，缓存膨胀至 OOM。排查发现是 `pairs` 遍历与删除冲突，部分元素被跳过。

**正确做法**：

```lua
-- 方案 1：先收集要删除的键，遍历后删除
local to_remove = {}
for k, v in pairs(t) do
    if v % 2 == 0 then
        to_remove[#to_remove + 1] = k
    end
end
for _, k in ipairs(to_remove) do
    t[k] = nil
end

-- 方案 2：构建新表，替换旧表
local new_t = {}
for k, v in pairs(t) do
    if v % 2 ~= 0 then
        new_t[k] = v
    end
end
t = new_t                               -- 替换引用
```

### 7.4 `nil` 作为 Table 值

**陷阱描述**：在 Lua Table 中，`t[k] = nil` 等价于删除键 `k`，而非存储 `nil` 值。这导致无法在表中存储 `nil`，需要特殊处理。

**错误示例**：

```lua
-- 错误：试图存储 nil
local config = {timeout = nil}         -- 等价于 config = {}
print(config.timeout)                  -- nil（但无法区分"未设置"与"显式 nil"）
```

**生产事故案例**：某配置系统允许用户显式设置 `timeout = nil` 表示"使用默认值"，但 Lua 的语义导致该设置被丢失，实际行为与"未设置"无法区分，引发配置歧义问题。

**正确做法**：

```lua
-- 方案 1：使用占位符
local NIL_PLACEHOLDER = {"nil_placeholder"}
local config = {timeout = NIL_PLACEHOLDER}
-- 读取时转换
local function get(t, k)
    local v = t[k]
    if v == NIL_PLACEHOLDER then
        return nil
    end
    return v
end

-- 方案 2：使用单独的存在性标记
local config = {timeout_exists = false}
-- 设置时：config.timeout_exists = true
-- 读取时：if config.timeout_exists then return nil end

-- 方案 3：使用嵌套表包装
local function wrap(v)
    return {value = v}
end
local config = {timeout = wrap(nil)}
-- 读取时：if config.timeout then return config.timeout.value end
```

### 7.5 元表循环引用

**陷阱描述**：通过 `__index` 链形成的循环引用会导致栈溢出。

**错误示例**：

```lua
-- 错误：__index 循环
local a = setmetatable({}, {__index = b})
local b = setmetatable({}, {__index = a})  -- 循环！
-- print(a.foo)                      -- stack overflow（实际为 C 错误）
```

**生产事故案例**：某 OOP 框架在动态混入（mixin）时未检测循环，导致运行时栈溢出崩溃，整个服务不可用。

**正确做法**：

```lua
-- 方案 1：避免设计循环继承
local a = {}
local b = setmetatable({}, {__index = a})  -- 单向继承

-- 方案 2：运行时检测循环
local function safe_index(t, k, seen)
    seen = seen or {}
    if seen[t] then
        error("circular __index detected")
    end
    seen[t] = true
    local v = rawget(t, k)
    if v ~= nil then
        return v
    end
    local mt = getmetatable(t)
    if mt and mt.__index then
        if type(mt.__index) == "function" then
            return mt.__index(t, k)
        else
            return safe_index(mt.__index, k, seen)
        end
    end
    return nil
end
```

### 7.6 弱表误用导致数据丢失

**陷阱描述**：弱表的键或值可能被 GC 意外回收，导致数据丢失。

**错误示例**：

```lua
-- 错误：弱表存储重要数据
local cache = setmetatable({}, {__mode = "v"})
cache.user_session = get_user_session()  -- 重要数据！
-- 其他代码...
collectgarbage("collect")
-- 此时 user_session 可能已被 GC 回收，导致用户掉线
```

**生产事故案例**：某会话管理系统误用弱表存储会话对象，在 GC 后部分用户会话丢失，被迫重新登录。问题定位后发现是弱表配置错误。

**正确做法**：

```lua
-- 方案 1：仅对临时缓存使用弱表
local temp_cache = setmetatable({}, {__mode = "v"})  -- 临时数据，可丢失
local session_store = {}                              -- 重要数据，强引用

-- 方案 2：同时维护强引用计数
local strong_refs = {}
local weak_cache = setmetatable({}, {__mode = "v"})

local function cache_put(key, value)
    weak_cache[key] = value
    strong_refs[key] = value            -- 强引用，防止 GC
end

local function cache_evict(key)
    strong_refs[key] = nil              -- 释放强引用，允许 GC
    -- weak_cache[key] 会在下次 GC 时自动清除
end
```

### 7.7 浮点数键的精度问题

**陷阱描述**：Lua 5.3 之前，所有数字都是双精度浮点数，作为键时存在精度问题。Lua 5.3+ 虽然区分整数与浮点数，但 `1` 与 `1.0` 仍可能被视为不同的键。

**错误示例**：

```lua
-- 错误：浮点数键精度问题
local t = {}
t[1] = "integer"
t[1.0] = "float"                       -- Lua 5.3+ 视为相同键，覆盖前值
print(t[1])                            -- float（Lua 5.3+）
-- 但在 Lua 5.2 及之前，1 与 1.0 哈希值可能不同
```

**生产事故案例**：某金融系统使用浮点数作为金额键，因精度问题导致相同金额被视为不同键，数据统计错误。

**正确做法**：

```lua
-- 方案 1：使用整数键
local t = {}
t[100] = "1元"                         -- 使用分为单位，避免浮点

-- 方案 2：使用字符串键
local t = {}
t["100.50"] = "金额"
print(t["100.50"])                     -- 金额

-- 方案 3：规范化键
local function normalize_key(k)
    if type(k) == "number" then
        return tostring(k)
    end
    return k
end
local t = {}
t[normalize_key(1)] = "value"
t[normalize_key(1.0)] = "value"        -- 相同键
```

### 7.8 `table.concat` 对非字符串元素的处理

**陷阱描述**：`table.concat` 要求所有元素为字符串或数字，否则报错。

**错误示例**：

```lua
-- 错误：表中含非字符串/数字元素
local t = {1, 2, "hello", nil, 5}
-- print(table.concat(t, ","))        -- 报错：invalid value (nil) at index 4

local t2 = {1, 2, {3, 4}}
-- print(table.concat(t2, ","))       -- 报错：invalid value (table) at index 3
```

**正确做法**：

```lua
-- 方案 1：预处理为字符串
local function safe_concat(t, sep)
    local parts = {}
    for i, v in ipairs(t) do
        if type(v) == "string" or type(v) == "number" then
            parts[i] = tostring(v)
        elseif v == nil then
            parts[i] = ""              -- 或跳过
        else
            parts[i] = tostring(v)
        end
    end
    return table.concat(parts, sep)
end

-- 方案 2：使用 ipairs 跳过空洞
local t = {1, 2, "hello", nil, 5}
local parts = {}
for _, v in ipairs(t) do               -- ipairs 在 nil 处停止
    parts[#parts + 1] = tostring(v)
end
print(table.concat(parts, ","))        -- 1,2,hello
```

## 8. 工程实践

### 8.1 Table 设计规范

```lua
-- 1. 明确区分数组与字典
-- 数组：使用连续整数索引，适合列表数据
local users = {
    {id = 1, name = "Alice"},
    {id = 2, name = "Bob"},
    {id = 3, name = "Charlie"}
}

-- 字典：使用字符串键，适合配置与映射
local config = {
    server = {
        host = "0.0.0.0",
        port = 8080
    },
    database = {
        url = "mysql://localhost:3306/mydb",
        pool_size = 10
    }
}

-- 2. 避免混合使用数组与字典（除非必要）
-- 错误：混合使用导致语义不清
-- local bad = {1, 2, 3, name = "list"}  -- 数组部分和字典部分混在一起

-- 3. 使用一致的命名约定
local user = {
    user_id = 1,                        -- snake_case
    user_name = "Alice",
    created_at = os.time()
}

-- 4. 提供默认值
local function create_user(opts)
    opts = opts or {}
    return {
        name = opts.name or "anonymous",
        age = opts.age or 0,
        email = opts.email or nil,
        created_at = os.time()
    }
end

-- 5. 使用元表实现只读配置
local function readonly(t)
    return setmetatable({}, {
        __index = t,
        __newindex = function(_, k, v)
            error("attempt to modify readonly table: " .. tostring(k), 2)
        end
    })
end

local DEFAULT_CONFIG = readonly({
    host = "localhost",
    port = 8080,
    debug = false
})
```

### 8.2 Table 校验

```lua
-- 实现 Table 结构校验，用于 API 入参检查

local Validator = {}
Validator.__index = Validator

function Validator.new(schema)
    return setmetatable({schema = schema}, Validator)
end

function Validator:validate(data, path)
    path = path or "root"
    if type(data) ~= "table" then
        return false, path .. " must be a table"
    end
    
    for field, rule in pairs(self.schema) do
        local value = data[field]
        local field_path = path .. "." .. field
        
        -- 检查必填
        if rule.required and value == nil then
            return false, field_path .. " is required"
        end
        
        -- 跳过可选且未提供的字段
        if value == nil then
            goto continue
        end
        
        -- 检查类型
        if rule.type and type(value) ~= rule.type then
            return false, string.format("%s must be %s, got %s",
                field_path, rule.type, type(value))
        end
        
        -- 检查数值范围
        if rule.type == "number" then
            if rule.min and value < rule.min then
                return false, string.format("%s must be >= %s", field_path, rule.min)
            end
            if rule.max and value > rule.max then
                return false, string.format("%s must be <= %s", field_path, rule.max)
            end
        end
        
        -- 检查字符串长度
        if rule.type == "string" then
            if rule.min_len and #value < rule.min_len then
                return false, string.format("%s length must be >= %s", field_path, rule.min_len)
            end
            if rule.max_len and #value > rule.max_len then
                return false, string.format("%s length must be <= %s", field_path, rule.max_len)
            end
        end
        
        -- 检查枚举值
        if rule.enum then
            local found = false
            for _, v in ipairs(rule.enum) do
                if value == v then
                    found = true
                    break
                end
            end
            if not found then
                return false, string.format("%s must be one of [%s]",
                    field_path, table.concat(rule.enum, ", "))
            end
        end
        
        -- 递归校验嵌套表
        if rule.nested then
            local nested_validator = Validator.new(rule.nested)
            local ok, err = nested_validator:validate(value, field_path)
            if not ok then
                return false, err
            end
        end
        
        ::continue::
    end
    
    return true
end

-- 使用示例
local user_schema = Validator.new({
    name = {required = true, type = "string", min_len = 1, max_len = 50},
    age = {required = false, type = "number", min = 0, max = 150},
    email = {required = true, type = "string"},
    role = {required = true, type = "string", enum = {"admin", "user", "guest"}},
    address = {
        required = false,
        type = "table",
        nested = {
            city = {required = true, type = "string"},
            zip = {required = true, type = "string"}
        }
    }
})

-- 测试
local ok, err = user_schema:validate({
    name = "Alice",
    age = 30,
    email = "alice@example.com",
    role = "admin",
    address = {city = "Beijing", zip = "100000"}
})
print(ok, err)                         -- true    nil

local ok2, err2 = user_schema:validate({
    name = "Bob",
    age = 200,                          -- 超出范围
    email = "bob@example.com",
    role = "superadmin"                 -- 非法枚举值
})
print(ok2, err2)                       -- false    root.age must be <= 150
```

### 8.3 Table 性能优化

```lua
-- Table 性能优化技巧

-- 1. 预分配数组大小（Lua 5.4+ 不支持，但可填充 nil 后移除）
-- 注意：Lua 不支持直接预分配，需通过其他方式
local function create_array(size, default_value)
    local arr = {}
    for i = 1, size do
        arr[i] = default_value
    end
    return arr
end

-- 2. 使用 table.concat 替代字符串拼接
-- 错误：
local function bad_concat(items)
    local result = ""
    for _, item in ipairs(items) do
        result = result .. item         -- O(n^2)
    end
    return result
end

-- 正确：
local function good_concat(items)
    return table.concat(items)          -- O(n)
end

-- 3. 使用局部变量缓存常用表
local function process(data)
    -- 缓存 table.insert 为局部变量
    local insert = table.insert
    local result = {}
    for _, v in ipairs(data) do
        insert(result, v * 2)
    end
    return result
end

-- 4. 避免在热路径中使用 pairs（ipairs 更快）
local function sum_array(arr)
    local sum = 0
    for i = 1, #arr do                  -- 数值 for 最快
        sum = sum + arr[i]
    end
    return sum
end

-- 5. 使用弱表缓存计算结果
local memoize_cache = setmetatable({}, {__mode = "k"})
local function memoize(fn)
    return function(arg)
        if memoize_cache[arg] == nil then
            memoize_cache[arg] = fn(arg)
        end
        return memoize_cache[arg]
    end
end

local slow_sqrt = memoize(function(x)
    -- 模拟耗时计算
    return math.sqrt(x)
end)

-- 6. 批量操作减少 rehash
-- 错误：逐个插入可能触发多次 rehash
local function build_table_bad(keys, values)
    local t = {}
    for i, k in ipairs(keys) do
        t[k] = values[i]                -- 可能多次 rehash
    end
    return t
end

-- 正确：预估大小后一次性构建（LuaJIT 提供 table.new）
-- local new = require "table.new"
-- local t = new(0, #keys)              -- 预分配哈希部分
-- for i, k in ipairs(keys) do
--     t[k] = values[i]
-- end

-- 7. 使用 table.move 复制数组（Lua 5.3+）
local function copy_array(src)
    local dst = {}
    table.move(src, 1, #src, 1, dst)
    return dst
end

-- 8. 避免不必要的深拷贝
local function shallow_merge(dst, src)
    for k, v in pairs(src) do
        if dst[k] == nil then
            dst[k] = v                  -- 仅浅拷贝
        end
    end
    return dst
end
```

### 8.4 Table 调试技巧

```lua
-- Table 调试辅助函数

-- 1. 格式化打印表
local function dump(t, indent, seen)
    indent = indent or ""
    seen = seen or {}
    
    if type(t) ~= "table" then
        return tostring(t)
    end
    
    if seen[t] then
        return "[circular: " .. tostring(t) .. "]"
    end
    seen[t] = true
    
    local parts = {}
    for k, v in pairs(t) do
        local key_str
        if type(k) == "string" and k:match("^[%a_][%w_]*$") then
            key_str = k
        else
            key_str = "[" .. dump(k, "", seen) .. "]"
        end
        
        local value_str
        if type(v) == "table" then
            value_str = dump(v, indent .. "  ", seen)
        else
            value_str = tostring(v)
        end
        
        parts[#parts + 1] = indent .. "  " .. key_str .. " = " .. value_str
    end
    
    return "{\n" .. table.concat(parts, ",\n") .. "\n" .. indent .. "}"
end

-- 2. 统计表信息
local function table_info(t)
    local array_count = 0
    local hash_count = 0
    local types = {}
    
    for k, v in pairs(t) do
        if type(k) == "number" and k == math.floor(k) and k >= 1 then
            array_count = array_count + 1
        else
            hash_count = hash_count + 1
        end
        
        local vtype = type(v)
        types[vtype] = (types[vtype] or 0) + 1
    end
    
    return {
        array_count = array_count,
        hash_count = hash_count,
        total = array_count + hash_count,
        value_types = types,
        has_metatable = getmetatable(t) ~= nil
    }
end

-- 3. 检测表是否有空洞
local function has_holes(t)
    local max_index = 0
    for k in pairs(t) do
        if type(k) == "number" and k == math.floor(k) and k >= 1 then
            if k > max_index then
                max_index = k
            end
        end
    end
    
    for i = 1, max_index do
        if t[i] == nil then
            return true, i              -- 有空洞，返回位置
        end
    end
    return false
end

-- 4. 比较两个表是否相等（深比较）
local function table_equal(a, b, seen)
    seen = seen or {}
    if a == b then return true end
    if type(a) ~= "table" or type(b) ~= "table" then
        return false
    end
    if seen[a] and seen[a][b] then return true end
    seen[a] = seen[a] or {}
    seen[a][b] = true
    
    -- 比较键值对数量
    local count_a, count_b = 0, 0
    for _ in pairs(a) do count_a = count_a + 1 end
    for _ in pairs(b) do count_b = count_b + 1 end
    if count_a ~= count_b then return false end
    
    -- 递归比较每个键值对
    for k, v in pairs(a) do
        if not table_equal(v, b[k], seen) then
            return false
        end
    end
    return true
end

-- 使用示例
local data = {
    name = "test",
    values = {1, 2, 3, nil, 5},
    nested = {a = 1, b = {c = 2}}
}
print(dump(data))
local info = table_info(data)
print(string.format("数组: %d, 字典: %d, 总计: %d",
    info.array_count, info.hash_count, info.total))
print("有空洞:", has_holes(data.values))
```

### 8.5 单元测试模式

```lua
-- Table 相关的单元测试模式

-- 简易测试框架
local Test = {}
Test.__index = Test

function Test.new(name)
    return setmetatable({
        name = name,
        passed = 0,
        failed = 0,
        failures = {}
    }, Test)
end

function Test:assertEqual(actual, expected, msg)
    if actual ~= expected then
        self.failed = self.failed + 1
        self.failures[#self.failures + 1] = string.format(
            "FAIL: %s - expected %s, got %s (%s)",
            self.name, tostring(expected), tostring(actual), msg or "")
    else
        self.passed = self.passed + 1
    end
end

function Test:assertTrue(value, msg)
    self:assertEqual(value, true, msg)
end

function Test:assertNil(value, msg)
    self:assertEqual(value, nil, msg)
end

function Test:assertTableEqual(actual, expected, msg)
    -- 简化版表比较
    local function deep_eq(a, b)
        if type(a) ~= type(b) then return false end
        if type(a) ~= "table" then return a == b end
        for k, v in pairs(a) do
            if not deep_eq(v, b[k]) then return false end
        end
        for k, _ in pairs(b) do
            if a[k] == nil then return false end
        end
        return true
    end
    
    if not deep_eq(actual, expected) then
        self.failed = self.failed + 1
        self.failures[#self.failures + 1] = string.format(
            "FAIL: %s - tables not equal (%s)", self.name, msg or "")
    else
        self.passed = self.passed + 1
    end
end

function Test:report()
    print(string.format("\n=== %s ===", self.name))
    print(string.format("Passed: %d, Failed: %d", self.passed, self.failed))
    for _, f in ipairs(self.failures) do
        print("  " .. f)
    end
    return self.failed == 0
end

-- 测试用例
local t = Test.new("Table Operations")

-- 测试数组操作
local arr = {1, 2, 3}
table.insert(arr, 4)
t:assertEqual(#arr, 4, "insert should add element")
t:assertEqual(arr[4], 4, "inserted value should be 4")

table.remove(arr, 1)
t:assertEqual(arr[1], 2, "remove should shift elements")
t:assertEqual(#arr, 3, "remove should decrease size")

-- 测试字典操作
local dict = {a = 1, b = 2}
dict.c = 3
t:assertEqual(dict.c, 3, "should add new key")
dict.a = nil
t:assertNil(dict.a, "should remove key by setting nil")

-- 测试表比较
t:assertTableEqual({1, 2, 3}, {1, 2, 3}, "arrays should be equal")
t:assertTableEqual({a = 1, b = 2}, {b = 2, a = 1}, "dicts should be equal regardless of order")

-- 测试元表
local proxy = setmetatable({}, {__index = {x = 10}})
t:assertEqual(proxy.x, 10, "should get value from metatable")

t:report()
```

## 9. 案例研究

### 9.1 案例一：Kong API 网关的插件系统

**背景**：Kong 是基于 OpenResty 的云原生 API 网关，其插件系统大量使用 Lua Table 实现插件配置、生命周期管理与数据传递。

**架构**：Kong 的每个插件以 Lua 模块形式存在，导出一个 Table 包含插件元信息与回调函数：

```lua
-- Kong 插件示例：key-auth 插件简化版
local BasePlugin = require "kong.plugins.base_plugin"
local constants = require "kong.constants"

-- 插件 Table
local KeyAuthHandler = {}
KeyAuthHandler.__index = KeyAuthHandler
setmetatable(KeyAuthHandler, BasePlugin)

-- 插件元信息
KeyAuthHandler.PRIORITY = 1000          -- 插件执行优先级
KeyAuthHandler.VERSION = "2.0.0"

-- 构造函数
function KeyAuthHandler:new()
    local self = BasePlugin.new(self, "key-auth")
    return self
end

-- access 阶段回调
function KeyAuthHandler:access(conf)
    BasePlugin.access(self)
    
    -- conf 是 Table，包含插件配置
    -- 如 {key_names = {"apikey"}, hide_credentials = true}
    local key_name = conf.key_names[1]
    local key = kong.request.get_header(key_name)
    
    if not key then
        return kong.response.exit(401, {message = "Missing API key"})
    end
    
    -- 查询凭证
    local credential, err = kong.db.keyauth_credentials:select_by_key(key)
    if err then
        return kong.response.exit(500, {message = err})
    end
    
    if not credential then
        return kong.response.exit(401, {message = "Invalid API key"})
    end
    
    -- 将消费者信息存入 ngx.ctx（Table），供后续阶段使用
    kong.ctx.shared.credential = credential
    kong.ctx.shared.consumer_id = credential.consumer.id
    
    -- 设置上游请求头
    kong.service.request.set_header("X-Consumer-ID", credential.consumer.id)
    if conf.hide_credentials then
        kong.service.request.clear_header(key_name)
    end
end

return KeyAuthHandler
```

**设计要点**：

1. **Table 作为接口契约**：插件的元信息（`PRIORITY`、`VERSION`）与回调（`access`、`log`）统一在 Table 中声明。
2. **元表实现继承**：通过 `setmetatable(KeyAuthHandler, BasePlugin)` 实现插件基类继承。
3. **Table 作为数据载体**：`conf`、`ngx.ctx.shared` 等使用 Table 在各阶段间传递数据。
4. **schema 校验**：Kong 使用 lua-schema 库对插件配置 Table 进行校验。

**经验总结**：Kong 的插件系统展示了 Table 作为"接口 + 数据 + 行为"三位一体的优雅用法。通过元表实现继承，通过 Table 字段声明配置，通过 Table 在阶段间传递上下文，体现了 Lua Table 的极简与灵活。

### 9.2 案例二：LÖVE 2D 游戏引擎的实体系统

**背景**：LÖVE 是流行的 Lua 2D 游戏引擎，其游戏对象管理大量使用 Table 实现。

**架构**：LÖVE 采用"Table 即对象"模式，每个游戏对象是一个 Table，通过元表实现方法：

```lua
-- LÖVE 游戏对象示例

-- 基类：GameObject
local GameObject = {}
GameObject.__index = GameObject

function GameObject.new(x, y)
    local self = setmetatable({}, GameObject)
    self.x = x or 0
    self.y = y or 0
    self.vx = 0                          -- 速度 x
    self.vy = 0                          -- 速度 y
    self.alive = true
    return self
end

function GameObject:update(dt)
    self.x = self.x + self.vx * dt
    self.y = self.y + self.vy * dt
end

function GameObject:draw()
    -- 子类重写
end

function GameObject:destroy()
    self.alive = false
end

-- 派生类：Player
local Player = setmetatable({}, {__index = GameObject})
Player.__index = Player

function Player.new(x, y)
    local self = GameObject.new(x, y)
    setmetatable(self, Player)
    self.health = 100
    self.score = 0
    return self
end

function Player:move(dx, dy)
    self.vx = dx * 200
    self.vy = dy * 200
end

function Player:draw()
    love.graphics.setColor(0, 1, 0)
    love.graphics.rectangle("fill", self.x, self.y, 32, 32)
    love.graphics.setColor(1, 1, 1)
    love.graphics.print("HP: " .. self.health, self.x, self.y - 20)
end

function Player:takeDamage(amount)
    self.health = self.health - amount
    if self.health <= 0 then
        self:destroy()
    end
end

-- 派生类：Enemy
local Enemy = setmetatable({}, {__index = GameObject})
Enemy.__index = Enemy

function Enemy.new(x, y, target)
    local self = GameObject.new(x, y)
    setmetatable(self, Enemy)
    self.target = target                 -- 引用 Player
    self.speed = 50
    return self
end

function Enemy:update(dt)
    -- 追踪玩家
    if self.target and self.target.alive then
        local dx = self.target.x - self.x
        local dy = self.target.y - self.y
        local dist = math.sqrt(dx * dx + dy * dy)
        if dist > 0 then
            self.vx = (dx / dist) * self.speed
            self.vy = (dy / dist) * self.speed
        end
    end
    GameObject.update(self, dt)
end

function Enemy:draw()
    love.graphics.setColor(1, 0, 0)
    love.graphics.circle("fill", self.x, self.y, 16)
    love.graphics.setColor(1, 1, 1)
end

-- 游戏管理器
local Game = {
    objects = {},
    player = nil
}

function Game:init()
    self.player = Player.new(400, 300)
    self.objects[#self.objects + 1] = self.player
    
    -- 生成敌人
    for i = 1, 5 do
        local enemy = Enemy.new(
            math.random(0, 800),
            math.random(0, 600),
            self.player
        )
        self.objects[#self.objects + 1] = enemy
    end
end

function Game:update(dt)
    -- 更新所有对象
    for i = #self.objects, 1, -1 do       -- 反向遍历，便于删除
        local obj = self.objects[i]
        if obj.alive then
            obj:update(dt)
        else
            table.remove(self.objects, i)
        end
    end
    
    -- 碰撞检测
    for _, obj in ipairs(self.objects) do
        if obj ~= self.player and obj.alive then
            local dx = obj.x - self.player.x
            local dy = obj.y - self.player.y
            if math.abs(dx) < 30 and math.abs(dy) < 30 then
                self.player:takeDamage(10)
                obj:destroy()
            end
        end
    end
end

function Game:draw()
    for _, obj in ipairs(self.objects) do
        if obj.alive then
            obj:draw()
        end
    end
end

-- LÖVE 回调
function love.load()
    Game:init()
end

function love.update(dt)
    Game:update(dt)
end

function love.draw()
    Game:draw()
end
```

**设计要点**：

1. **Table 即对象**：每个游戏对象是一个 Table，包含状态（x, y, health）与行为（update, draw）。
2. **元表链实现继承**：`Player` 通过 `setmetatable({}, {__index = GameObject})` 继承基类。
3. **对象池模式**：`Game.objects` 数组统一管理所有对象，反向遍历删除避免索引错乱。
4. **引用关系**：`Enemy.target` 引用 `Player`，体现了 Table 的引用语义。

**经验总结**：LÖVE 的实体系统展示了 Table 在游戏开发中的典型用法。相比 C++ 或 Java 的类继承体系，Lua Table 的灵活性使得原型式编程更加自然，但需要开发者自觉遵守设计规范。

### 9.3 案例三：Neovim 配置系统

**背景**：Neovim 是现代化的 Vim 编辑器，其配置系统从 VimScript 迁移到 Lua（Neovim 0.5+），大量使用 Table 表达配置。

**架构**：Neovim 的 Lua API 使用嵌套 Table 表达复杂配置：

```lua
-- Neovim init.lua 配置示例

-- 1. 基础选项
local options = {
    number = true,                       -- 显示行号
    relativenumber = true,               -- 相对行号
    tabstop = 4,                         -- Tab 宽度
    shiftwidth = 4,                      -- 缩进宽度
    expandtab = true,                    -- Tab 转空格
    smartindent = true,                  -- 智能缩进
    wrap = false,                        -- 不自动换行
    ignorecase = true,                   -- 忽略大小写
    smartcase = true,                    -- 智能大小写
    hlsearch = false,                    -- 不高亮搜索
    hidden = true,                       -- 允许隐藏 buffer
    swapfile = false,                    -- 不使用 swap
    backup = false,                      -- 不备份
    undofile = true,                     -- 持久撤销
    termguicolors = true,                -- 24 位颜色
    scrolloff = 8,                       -- 滚动边距
    sidescrolloff = 8,
    completeopt = {                      -- 补全选项（Table）
        "menuone",
        "noselect"
    }
}

-- 批量设置选项
for k, v in pairs(options) do
    vim.opt[k] = v
end

-- 2. 键映射（使用 Table 表达）
local keymaps = {
    -- 模式 = {键 = {动作, 选项}}
    n = {
        ["<leader>w"] = { ":w<CR>", { desc = "保存" } },
        ["<leader>q"] = { ":q<CR>", { desc = "退出" } },
        ["<leader>e"] = { ":NvimTreeToggle<CR>", { desc = "切换文件树" } },
        ["<C-h>"] = { "<C-w>h", { desc = "跳转左窗口" } },
        ["<C-j>"] = { "<C-w>j", { desc = "跳转下窗口" } },
        ["<C-k>"] = { "<C-w>k", { desc = "跳转上窗口" } },
        ["<C-l>"] = { "<C-w>l", { desc = "跳转右窗口" } },
    },
    i = {
        ["jk"] = { "<ESC>", { desc = "返回普通模式" } },
        ["<C-j>"] = { "<Down>", { desc = "下移" } },
        ["<C-k>"] = { "<Up>", { desc = "上移" } },
    },
    v = {
        ["<"] = { "<gv", { desc = "向左缩进" } },
        [">"] = { ">gv", { desc = "向右缩进" } },
    }
}

-- 批量设置键映射
for mode, maps in pairs(keymaps) do
    for key, mapping in pairs(maps) do
        vim.keymap.set(mode, key, mapping[1], mapping[2])
    end
end

-- 3. 插件配置（Packer）
local packer_config = {
    -- 插件列表（数组）
    {
        "wbthomason/packer.nvim"
    },
    {
        "nvim-treesitter/nvim-treesitter",
        -- 配置函数
        config = function()
            require("nvim-treesitter.configs").setup({
                ensure_installed = { "lua", "vim", "python", "javascript", "typescript" },
                highlight = { enable = true },
                indent = { enable = true }
            })
        end
    },
    {
        "neovim/nvim-lspconfig",
        config = function()
            -- LSP 服务器配置（Table）
            local servers = {
                lua_ls = {
                    settings = {
                        Lua = {
                            diagnostics = { globals = { "vim" } },
                            workspace = {
                                library = vim.api.nvim_get_runtime_file("", true),
                                checkThirdParty = false
                            }
                        }
                    }
                },
                pyright = {},
                tsserver = {}
            }
            
            for server, config in pairs(servers) do
                require("lspconfig")[server].setup(config)
            end
        end
    }
}

-- 4. 自定义命令
local commands = {
    Format = function()
        vim.lsp.buf.format({ async = true })
    end,
    ToggleBackground = function()
        if vim.o.background == "dark" then
            vim.o.background = "light"
        else
            vim.o.background = "dark"
        end
    end
}

for name, fn in pairs(commands) do
    vim.api.nvim_create_user_command(name, fn, {})
end

-- 5. 自动命令（Table 形式）
local autocmds = {
    {
        event = "TextYankPost",
        callback = function()
            vim.highlight.on_yank({ higroup = "IncSearch", timeout = 200 })
        end
    },
    {
        event = "BufWritePre",
        pattern = "*",
        callback = function()
            vim.lsp.buf.format({ async = false })
        end
    }
}

for _, au in ipairs(autocmds) do
    vim.api.nvim_create_autocmd(au.event, {
        pattern = au.pattern,
        callback = au.callback
    })
end
```

**设计要点**：

1. **Table 即配置**：所有配置以嵌套 Table 形式声明，直观且可读。
2. **批量操作**：通过 `for ... pairs` 批量设置选项、键映射，减少重复代码。
3. **函数作为值**：Table 字段可以是函数（如 `config`、`callback`），实现声明式配置。
4. **分层组织**：配置按功能分层（options、keymaps、plugins、commands），结构清晰。

**经验总结**：Neovim 的 Lua 配置系统展示了 Table 在配置驱动开发中的优势。相比 VimScript 的命令式风格，Lua Table 的声明式配置更具可读性与可维护性。这一设计思路被众多工具（如 VS Code 的 JSON 配置、Emacs 的 use-package）借鉴。

### 9.4 案例四：Redis 客户端的响应解析

**背景**：Redis 客户端库（如 lua-resty-redis）需要将 Redis 响应解析为 Lua Table，这一过程涉及大量的类型映射与嵌套结构处理。

**实现**：

```lua
-- Redis RESP 协议解析器简化版

local RESPParser = {}
RESPParser.__index = RESPParser

-- RESP 类型字符
local RESP = {
    SIMPLE_STRING = "+",
    ERROR = "-",
    INTEGER = ":",
    BULK_STRING = "$",
    ARRAY = "*"
}

function RESPParser.new()
    return setmetatable({buffer = ""}, RESPParser)
end

-- 解析 RESP 协议，返回 Lua 值
function RESPParser:parse(data)
    self.buffer = self.buffer .. data
    local value, offset = self:parseValue(1)
    if value then
        -- 移除已解析的数据
        self.buffer = self.buffer:sub(offset)
    end
    return value
end

function RESPParser:parseValue(offset)
    local line, new_offset = self:readLine(offset)
    if not line then
        return nil, offset
    end
    
    local type_char = line:sub(1, 1)
    local payload = line:sub(2)
    
    if type_char == RESP.SIMPLE_STRING then
        return {ok = payload}, new_offset
    elseif type_char == RESP.ERROR then
        return {err = payload}, new_offset
    elseif type_char == RESP.INTEGER then
        return tonumber(payload), new_offset
    elseif type_char == RESP.BULK_STRING then
        local len = tonumber(payload)
        if len < 0 then
            return false, new_offset             -- Redis nil -> Lua false
        end
        return self:readBulkString(new_offset, len)
    elseif type_char == RESP.ARRAY then
        local count = tonumber(payload)
        if count < 0 then
            return false, new_offset             -- nil 数组
        end
        return self:readArray(new_offset, count)
    end
    
    return nil, new_offset
end

function RESPParser:readLine(offset)
    local start = offset
    local end_pos = self.buffer:find("\r\n", start)
    if not end_pos then
        return nil, offset
    end
    return self.buffer:sub(start, end_pos - 1), end_pos + 2
end

function RESPParser:readBulkString(offset, len)
    -- 检查是否有足够数据
    if #self.buffer < offset + len + 2 then
        return nil, offset
    end
    local str = self.buffer:sub(offset, offset + len - 1)
    return str, offset + len + 2                 -- 跳过 \r\n
end

function RESPParser:readArray(offset, count)
    local result = {}
    local current_offset = offset
    for i = 1, count do
        local value, new_offset = self:parseValue(current_offset)
        if value == nil then
            return nil, offset                   -- 数据不完整
        end
        result[i] = value
        current_offset = new_offset
    end
    return result, current_offset
end

-- 使用示例
local parser = RESPParser.new()

-- 模拟 Redis 响应
-- +OK\r\n
local reply1 = parser:parse("+OK\r\n")
print(reply1.ok)                                  -- OK

-- :1000\r\n
local reply2 = parser:parse(":1000\r\n")
print(reply2)                                     -- 1000

-- $5\r\nhello\r\n
local reply3 = parser:parse("$5\r\nhello\r\n")
print(reply3)                                     -- hello

-- *2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n
local reply4 = parser:parse("*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n")
print(reply4[1], reply4[2])                       -- foo    bar

-- 构建命令
local function build_command(...)
    local args = {...}
    local parts = {"*" .. #args .. "\r\n"}
    for _, arg in ipairs(args) do
        local s = tostring(arg)
        parts[#parts + 1] = "$" .. #s .. "\r\n" .. s .. "\r\n"
    end
    return table.concat(parts)                    -- 使用 concat 高效拼接
end

local cmd = build_command("SET", "mykey", "myvalue")
print(cmd)                                        -- *3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n
```

**设计要点**：

1. **RESP 类型映射到 Table**：简单字符串映射为 `{ok = ...}`，错误映射为 `{err = ...}`，数组映射为 Lua 数组。
2. **Redis nil → Lua false**：严格遵循 Redis 与 Lua 的类型映射约定。
3. **table.concat 高效拼接**：构建命令时使用 `table.concat` 避免字符串拼接的 $O(n^2)$ 复杂度。
4. **增量解析**：支持部分数据到达后继续解析，适合流式协议。

**经验总结**：Redis 客户端的实现展示了 Table 在协议解析中的应用。Table 的灵活结构使得复杂嵌套数据（如 RESP 数组）能自然映射，无需定义专门的类。

## 10. 习题

### 10.1 基础题

**习题 1**：判断以下代码的输出，并解释原因。

```lua
local t = {1, 2, 3, nil, 5}
print(#t)
```

**答案要点**：
- 输出不确定，可能是 3 或 5。
- Lua 的 `#` 运算符返回一个"边界"，即满足 `t[i] ~= nil and t[i+1] == nil` 的 `i`。
- 对于含空洞的数组，可能存在多个边界（这里是 3 和 5），`#` 返回值依赖具体实现。
- 生产环境应避免对含空洞的数组使用 `#`，改用显式计数或 `table.remove` 维护连续性。

**习题 2**：使用 Table 实现一个 LRU（最近最少使用）缓存，支持 `get(key)` 与 `put(key, value)` 操作，容量受限。

**答案要点**：

```lua
local LRU = {}
LRU.__index = LRU

function LRU.new(capacity)
    return setmetatable({
        capacity = capacity,
        size = 0,
        cache = {},                  -- 哈希表：key -> {value, prev, next}
        head = nil,                  -- 最近使用的节点
        tail = nil                   -- 最久未使用的节点
    }, LRU)
end

function LRU:get(key)
    local node = self.cache[key]
    if not node then
        return nil                   -- 缓存未命中
    end
    -- 移动到头部
    self:moveToHead(node)
    return node.value
end

function LRU:put(key, value)
    local node = self.cache[key]
    if node then
        -- 更新值并移动到头部
        node.value = value
        self:moveToHead(node)
    else
        -- 新建节点
        node = {key = key, value = value}
        self.cache[key] = node
        self.size = self.size + 1
        self:addToHead(node)
        -- 超容量则淘汰尾部
        if self.size > self.capacity then
            local removed = self:removeTail()
            self.cache[removed.key] = nil
            self.size = self.size - 1
        end
    end
end

function LRU:moveToHead(node)
    if node == self.head then return end
    self:removeNode(node)
    self:addToHead(node)
end

function LRU:addToHead(node)
    node.prev = nil
    node.next = self.head
    if self.head then
        self.head.prev = node
    end
    self.head = node
    if not self.tail then
        self.tail = node
    end
end

function LRU:removeNode(node)
    if node.prev then
        node.prev.next = node.next
    else
        self.head = node.next
    end
    if node.next then
        node.next.prev = node.prev
    else
        self.tail = node.prev
    end
end

function LRU:removeTail()
    local node = self.tail
    self:removeNode(node)
    return node
end
```

**习题 3**：解释以下代码为何会陷入死循环，并修复。

```lua
local t = {a = 1, b = 2, c = 3}
for k, v in pairs(t) do
    t[k .. "_new"] = v
end
```

**答案要点**：
- `pairs` 遍历时向表中添加新键，新键可能也被遍历到，导致无限循环。
- Lua 规范允许 `pairs` 实现在遍历时重新扫描，新添加的键可能被访问。
- 修复：先收集要添加的键值对，遍历结束后再添加。

```lua
local t = {a = 1, b = 2, c = 3}
local to_add = {}
for k, v in pairs(t) do
    to_add[k .. "_new"] = v
end
for k, v in pairs(to_add) do
    t[k] = v
end
```

### 10.2 进阶题

**习题 4**：实现一个支持观察者模式（Observer Pattern）的事件系统，使用 Table 管理事件与监听器。

**答案要点**：

```lua
local EventEmitter = {}
EventEmitter.__index = EventEmitter

function EventEmitter.new()
    return setmetatable({
        listeners = {}                -- event -> [listener1, listener2, ...]
    }, EventEmitter)
end

function EventEmitter:on(event, listener)
    if not self.listeners[event] then
        self.listeners[event] = {}
    end
    table.insert(self.listeners[event], listener)
    return self                       -- 链式调用
end

function EventEmitter:off(event, listener)
    local arr = self.listeners[event]
    if not arr then return self end
    for i, l in ipairs(arr) do
        if l == listener then
            table.remove(arr, i)
            break
        end
    end
    return self
end

function EventEmitter:emit(event, ...)
    local arr = self.listeners[event]
    if not arr then return self end
    -- 复制一份，避免遍历时修改
    local snapshot = {}
    for i, l in ipairs(arr) do
        snapshot[i] = l
    end
    for _, l in ipairs(snapshot) do
        l(...)
    end
    return self
end

function EventEmitter:once(event, listener)
    local wrapper
    wrapper = function(...)
        self:off(event, wrapper)
        listener(...)
    end
    self:on(event, wrapper)
    return self
end

-- 使用示例
local emitter = EventEmitter.new()
emitter:on("data", function(data) print("收到:", data) end)
emitter:emit("data", "hello")        -- 收到: hello
```

**习题 5**：实现一个 Table 深拷贝函数，要求：
1. 正确处理循环引用。
2. 保留元表。
3. 区分数组部分与字典部分（保持顺序）。

**答案要点**：

```lua
local function deep_copy(t, seen)
    seen = seen or {}
    if type(t) ~= "table" then
        return t
    end
    if seen[t] then
        return seen[t]                -- 循环引用，返回已拷贝
    end
    
    local copy = {}
    seen[t] = copy                    -- 先记录，防止递归时再次拷贝
    
    -- 先拷贝数组部分（保持顺序）
    for i, v in ipairs(t) do
        copy[i] = deep_copy(v, seen)
    end
    
    -- 再拷贝字典部分
    for k, v in pairs(t) do
        if type(k) ~= "number" or k ~= math.floor(k) or k < 1 or k > #t then
            copy[deep_copy(k, seen)] = deep_copy(v, seen)
        end
    end
    
    -- 拷贝元表
    local mt = getmetatable(t)
    if mt then
        setmetatable(copy, deep_copy(mt, seen))
    end
    
    return copy
end
```

### 10.3 挑战题

**习题 6**：实现一个不可变持久化数据结构（Persistent Data Structure）库，支持以下操作：
1. `create(initial)`：创建持久化 Table。
2. `get(t, key)`：获取值。
3. `set(t, key, value)`：返回新的持久化 Table，原表不变。
4. `delete(t, key)`：返回删除指定键的新 Table。
5. 所有操作不修改原表（结构性共享）。

**答案要点**：

```lua
-- 简化版持久化 Table（基于元表拦截）
local Persistent = {}
Persistent.__index = Persistent

local function create(initial)
    local data = {}
    if initial then
        for k, v in pairs(initial) do
            data[k] = v
        end
    end
    return setmetatable({data = data}, Persistent)
end

function Persistent:get(key)
    return self.data[key]
end

function Persistent:set(key, value)
    local new_data = {}
    for k, v in pairs(self.data) do
        new_data[k] = v               -- 浅拷贝
    end
    new_data[key] = value
    return create(new_data)
end

function Persistent:delete(key)
    local new_data = {}
    for k, v in pairs(self.data) do
        if k ~= key then
            new_data[k] = v
        end
    end
    return create(new_data)
end

function Persistent:size()
    local count = 0
    for _ in pairs(self.data) do
        count = count + 1
    end
    return count
end

function Persistent:toTable()
    local copy = {}
    for k, v in pairs(self.data) do
        copy[k] = v
    end
    return copy
end

function Persistent:__pairs()
    return pairs(self.data)
end

-- 使用示例
local p1 = create({a = 1, b = 2})
local p2 = p1:set("c", 3)
local p3 = p1:delete("a")

print(p1:get("a"), p1:get("b"), p1:get("c"))  -- 1    2    nil
print(p2:get("a"), p2:get("b"), p2:get("c"))  -- 1    2    3
print(p3:get("a"), p3:get("b"), p3:get("c"))  -- nil    2    nil
```

**习题 7**：设计并实现一个基于 Table 的 ORM（对象关系映射）层，支持：
1. 模型定义（字段类型、约束）。
2. 查询构建器（链式 API）。
3. 结果映射（数据库行 → Table 对象）。
4. 简单的 WHERE、ORDER BY、LIMIT 支持。

**答案要点**：

```lua
-- 简化版 ORM
local ORM = {}
ORM.__index = ORM

function ORM.define(name, schema)
    local Model = {}
    Model.__index = Model
    Model.name = name
    Model.schema = schema
    
    function Model.new(data)
        local obj = setmetatable({}, Model)
        for k, v in pairs(data) do
            obj[k] = v
        end
        return obj
    end
    
    function Model:validate()
        for field, rule in pairs(self.schema) do
            local value = self[field]
            if rule.required and value == nil then
                return false, field .. " is required"
            end
            if value ~= nil and rule.type and type(value) ~= rule.type then
                return false, field .. " must be " .. rule.type
            end
        end
        return true
    end
    
    function Model:toTable()
        local t = {}
        for k, v in pairs(self) do
            if type(k) == "string" and self.schema[k] then
                t[k] = v
            end
        end
        return t
    end
    
    -- 查询构建器
    function Model.where(condition)
        local query = {
            model = Model,
            where_clause = condition,
            order_by = nil,
            limit_value = nil
        }
        setmetatable(query, {
            __index = function(t, k)
                return function(self, ...)
                    if k == "order" then
                        t.order_by = {...}
                    elseif k == "limit" then
                        t.limit_value = ...
                    elseif k == "find" then
                        return t:execute()
                    end
                    return t
                end
            end
        })
        return query
    end
    
    function query:execute()
        -- 模拟数据库查询
        -- 实际场景中会生成 SQL 并执行
        local sql = "SELECT * FROM " .. self.model.name
        if self.where_clause then
            local conditions = {}
            for k, v in pairs(self.where_clause) do
                conditions[#conditions + 1] = k .. " = " .. tostring(v)
            end
            sql = sql .. " WHERE " .. table.concat(conditions, " AND ")
        end
        if self.order_by then
            sql = sql .. " ORDER BY " .. table.concat(self.order_by, ", ")
        end
        if self.limit_value then
            sql = sql .. " LIMIT " .. self.limit_value
        end
        print("SQL:", sql)
        -- 返回模拟数据
        return {
            self.model.new({id = 1, name = "Alice", age = 30}),
            self.model.new({id = 2, name = "Bob", age = 25})
        }
    end
    
    return Model
end

-- 使用示例
local User = ORM.define("users", {
    id = {type = "number", required = true},
    name = {type = "string", required = true},
    age = {type = "number"}
})

-- 创建实例
local user = User.new({id = 1, name = "Alice", age = 30})
print(user.name)                      -- Alice
local ok, err = user:validate()
print(ok, err)                        -- true    nil

-- 查询
local users = User.where({age = 30}).order("id").limit(10).find()
for _, u in ipairs(users) do
    print(u.id, u.name, u.age)
end
```

**习题 8**：分析并优化以下 Lua 代码的性能，指出至少 3 个问题并给出改进方案。

```lua
local function process_users(users)
    local result = ""
    for i = 1, #users do
        local user = users[i]
        result = result .. user.name .. " (" .. user.age .. ")\n"
        if user.email then
            result = result .. "  Email: " .. user.email .. "\n"
        end
        if user.phone then
            result = result .. "  Phone: " .. user.phone .. "\n"
        end
    end
    return result
end
```

**答案要点**：

问题与优化：

1. **字符串拼接性能差**：`result = result .. ...` 在循环中复杂度为 $O(n^2)$。
   - 优化：使用 `table.concat`。

2. **`#users` 每次循环重新计算**：虽然 Lua 中 `#` 是 $O(\log n)$，但仍可缓存。
   - 优化：缓存到局部变量。

3. **频繁的全局表访问**：`users[i]` 中的 `users` 是 upvalue，访问较快，但 `user.name` 等字段访问无优化。
   - 优化：使用局部变量缓存。

优化后代码：

```lua
local function process_users(users)
    local parts = {}
    local n = #users
    for i = 1, n do
        local user = users[i]
        local name = user.name
        local age = user.age
        local email = user.email
        local phone = user.phone
        
        parts[#parts + 1] = name
        parts[#parts + 1] = " ("
        parts[#parts + 1] = tostring(age)
        parts[#parts + 1] = ")\n"
        
        if email then
            parts[#parts + 1] = "  Email: "
            parts[#parts + 1] = email
            parts[#parts + 1] = "\n"
        end
        if phone then
            parts[#parts + 1] = "  Phone: "
            parts[#parts + 1] = phone
            parts[#parts + 1] = "\n"
        end
    end
    return table.concat(parts)
end
```

进一步优化（LuaJIT）：

```lua
local function process_users(users)
    local insert = table.insert
    local concat = table.concat
    local parts = {}
    for i = 1, #users do
        local user = users[i]
        insert(parts, user.name)
        insert(parts, " (")
        insert(parts, tostring(user.age))
        insert(parts, ")\n")
        if user.email then
            insert(parts, "  Email: ")
            insert(parts, user.email)
            insert(parts, "\n")
        end
        if user.phone then
            insert(parts, "  Phone: ")
            insert(parts, user.phone)
            insert(parts, "\n")
        end
    end
    return concat(parts)
end
```

## 11. 参考文献

[1] Ierusalimschy R, de Figueiredo L H, Celes W. Lua 5.4 Reference Manual[M]. Geneva: Lua.org, 2020. DOI: 10.5555/3508499

[2] Ierusalimschy R, de Figueiredo L H, Celes W. The Evolution of Lua[C]. In: Proceedings of the Third ACM SIGPLAN Conference on History of Programming Languages (HOPL III). New York: ACM, 2007: 2-1-2-21. DOI: 10.1145/1238844.1238846

[3] Ierusalimschy R, de Figueiredo L H, Celes W. Lua: an Extensible Extension Language[J]. Software: Practice and Experience, 1996, 26(6): 635-652. DOI: 10.1002/(SICI)1097-024X(199606)26:6<635::AID-SPE26>3.0.CO;2-P

[4] Ierusalimschy R. Programming in Lua[M]. 4th ed. Geneva: Lua.org, 2016. ISBN: 978-8590379869

[5] Stern K. Lua Table Internals[EB/OL]. (2018-05-15). https://www.lua.org/gems/table.html

[6] Roberto Ierusalimschy's personal page. https://www.inf.puc-rio.br/~roberto/

[7] Kein-Hong Man. A No-Frills Introduction to Lua 5.1 VM Instructions[EB/OL]. (2006-05-10). https://luaforge.net/docman/view.php/83/98/ANoFrillsIntroToLua51VMInstructions.pdf

[8] Pall M. The LuaJIT Project[J/OL]. https://luajit.org/, 2024.

[9] agentzh. OpenResty Best Practices[EB/OL]. https://github.com/openresty/lua-nginx-module, 2024.

[10] Bates C, Harris J, Wilson G. Programming in Lua[M]. 4th ed. Cambridge: MIT Press, 2016. DOI: 10.5555/3002636

[11] Figueiredo L H, Ierusalimschy R, Celes W. The Design and Implementation of a Language for Extending Applications[C]. In: Proceedings of XXI Semish (Brazilian Software Engineering Symposium). Curitiba: SBC, 1994: 185-196.

[12] Tratt L. Dynamically Typed Languages[J]. Advances in Computers, 2005, 77: 149-184. DOI: 10.1016/S0065-2458(09)01005-4

## 12. 延伸阅读

### 12.1 官方文档与规范

- **Lua 官方网站**：https://www.lua.org/
  - Lua 5.4 Reference Manual：类型系统与 Table API 的权威定义。
  - Lua 5.1 Reference Manual：LuaJIT 兼容版本的参考。
- **Lua-users Wiki**：http://lua-users.org/wiki/
  - Table Library Tutorial：`table` 标准库的深入教程。
  - Metamethods Tutorial：元方法的完整示例。
  - Object Orientation Tutorial：面向对象编程的多种实现方式。
- **LuaJIT 官方文档**：https://luajit.org/
  - LuaJIT 2.1 与 Lua 5.1 的差异说明。
  - FFI（Foreign Function Interface）扩展能力。

### 12.2 经典书籍

- **Programming in Lua (4th Edition)** by Roberto Ierusalimschy
  - 第 1-5 章：类型系统与 Table 基础。
  - 第 11 章：数据结构与算法。
  - 第 13 章：元表与元方法。
  - 第 17 章：弱表与垃圾回收。
- **Lua Programming Gems** by L. H. de Figueiredo, W. Celes, R. Ierusalimschy
  - 收录了 Lua 社区的最佳实践文章。
- **Building Impressive Presentations with Lua** by L. H. de Figueiredo
  - 展示了 Lua 在特定领域的应用。

### 12.3 社区与博客

- **Lua mailing list**：https://www.lua.org/lua-l.html
  - Lua 设计者亲自参与讨论，历史归档丰富。
- **Stack Overflow [lua] tag**：https://stackoverflow.com/questions/tagged/lua
  - 常见问题与解答，适合查阅具体问题。
- **Reddit r/lua**：https://www.reddit.com/r/lua/
  - Lua 社区动态与项目分享。
- **OpenResty 中文社区**：https://github.com/openresty
  - OpenResty 生态下的 Lua 实践。

### 12.4 进阶主题

- **LuaJIT FFI**：通过 FFI 直接调用 C 库，绕过 Lua C API，性能接近原生。
- **Lua 协程**：`coroutine` 模块与协作式多任务，理解 Table 在协程间传递的语义。
- **Lua C API**：`lua_State`、`lua_push*`、`lua_to*` 系列，深入理解 Table 在 C 层的实现。
- **LuaJIT trace 编译**：理解 JIT 如何优化 Table 访问，避免 NYI（Not Yet Implemented）操作。
- **Lua 5.4 分代 GC**：理解弱表在分代 GC 下的行为差异。

### 12.5 相关项目

- **Luarocks**：https://luarocks.org/
  - Lua 包管理器，大量 Table 相关的库（如 penlight、lua-cjson）。
- **penlight**：https://github.com/lunarmodules/penlight
  - Lua 的"标准库增强"，提供 Table 工具、函数式编程、类系统等。
- **lua-cjson**：https://github.com/openresty/lua-cjson
  - 高性能 JSON 编解码，Table 与 JSON 的互转。
- **busted**：https://github.com/lunarmodules/busted
  - Lua 测试框架，大量使用 Table 表达测试用例与断言。
- **LÖVE**：https://love2d.org/
  - 2D 游戏引擎，Table 驱动的游戏对象系统。
- **Kong**：https://konghq.com/
  - API 网关，Table 作为插件接口与配置载体。
- **Neovim**：https://neovim.io/
  - 现代化 Vim，Lua 配置系统的典范。
- **Redis**：https://redis.io/
  - 内嵌 Lua 解释器，Table 用于脚本中的数据结构。
- **World of Warcraft**：https://worldofwarcraft.blizzard.com/
  - UI 完全使用 Lua 编写，Table 驱动的 UI 框架。
