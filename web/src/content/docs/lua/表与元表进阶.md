---
order: 50
title: 表与元表进阶
module: lua
category: 'dev-lang'
difficulty: intermediate
description: 'Lua 表与元表深度解析：元方法体系、运算符重载、__index/__newindex 协议、代理表、原型继承、弱表引用、性能模型与多领域工程实践'
author: fanquanpp
updated: '2026-07-21'
tags:
  - lua
  - metatable
  - metamethod
  - operator-overloading
  - prototype
  - intermediate
related:
  - lua/函数与闭包
  - lua/面向对象编程
  - lua/环境与全局变量管理
  - lua/协程详解
  - lua/弱表
prerequisites:
  - lua/概述与环境配置
  - lua/函数与闭包
---

# 表与元表进阶

> 本文档对标 MIT 6.005 Software Construction、Stanford CS107 Programming Paradigms、CMU 15-214 Software Engineering 中数据抽象与元编程理论教学水准,面向 0 基础自学者与企业级 Lua 工程师,系统讲解 Lua 表（table）的内部结构、元表（metatable）、元方法（metamethod）体系、运算符重载、`__index`/`__newindex` 协议、代理表（proxy table）、原型继承（prototype-based inheritance）、弱表（weak table）引用语义、性能模型与多领域工程级实战案例。

## 1. 学习目标

学习本章后,读者应能在 Bloom 认知层级框架下达成下列目标。

### 1.1 知识层（Remembering）

- 列举 Lua 表的双重结构:数组部分（array part）与哈希部分（hash part）,以及二者在内存布局上的差异。
- 复述 Lua 5.0、5.1、5.2、5.3、5.4、5.5 中元表机制的演化:`getmetatable`/`setmetatable` 的语义变化、`__pairs`/`__ipairs` 的引入与废弃、`__gc` 元方法的可用性窗口。
- 列出全部元方法名称及其触发条件:`__add`、`__sub`、`__mul`、`__div`、`__mod`、`__pow`、`__unm`、`__idiv`（Lua 5.3+）、`__band`/`__bor`/`__bxor`/`__bnot`/`__shl`/`__shr`（Lua 5.3+）、`__concat`、`__len`、`__eq`、`__lt`、`__le`、`__index`、`__newindex`、`__call`、`__tostring`、`__pairs`（Lua 5.2+,5.4 废弃）、`__ipairs`（Lua 5.3 引入,5.4 废弃）、`__gc`、`__mode`、`__name`（Lua 5.3+）、`__close`（Lua 5.4+）。
- 描述 `rawget`、`rawset`、`rawequal`、`rawlen` 的语义:绕过元方法直接操作表。
- 列举弱表的三种模式:`"k"`（弱键）、`"v"`（弱值）、`"kv"`（弱键弱值）。
- 描述 `getmetatable` 在字符串、数字、布尔值、函数、userdata、thread 上的行为差异。

### 1.2 理解层（Understanding）

- 解释 `__index` 元方法的两种形态:表形态（fallback table）与函数形态（lookup function）,以及二者的等价性与性能差异。
- 阐释 `__newindex` 的触发条件:仅当键不存在时触发,已存在的键直接赋值。
- 描述算术元方法的二元查找规则:对 `a op b`,先查 `a` 的元表,再查 `b` 的元表。
- 解释 `__eq` 的特殊规则:仅当两操作数的元表相同（同一元表对象）且均定义 `__eq` 时才触发,否则使用引用相等。
- 描述 `__gc` 元方法的工作机制:仅对 userdata 与 5.4+ 的表生效,在 GC 标记阶段调用。
- 解释弱表中"弱"的含义:被弱引用的对象在无强引用时可被 GC 回收,表项随之消失。
- 描述 `__pairs` 与 `__ipairs` 在 Lua 5.2、5.3、5.4 中的演化:5.2 引入 `__pairs`,5.3 引入 `__ipairs`,5.4 废弃两者并改用 `__index`/`__len` 协议。
- 解释元表链（metatable chain）的概念:通过 `__index` 形成的查找链,类似 JavaScript 原型链。

### 1.3 应用层（Applying）

- 编写自定义数值类型（如向量、矩阵、复数、分数）并重载算术运算符。
- 使用 `__index` 实现原型继承、默认值表、惰性计算属性。
- 使用 `__newindex` 实现只读表、变更通知、属性验证、日志代理。
- 使用 `__call` 实现可调用对象、状态机入口、DSL 风格 API。
- 使用 `__pairs`/`__ipairs` 实现有序遍历、过滤遍历、惰性遍历。
- 使用弱表实现对象池、缓存、memoization,避免内存泄漏。
- 使用 `__gc` 实现 userdata 资源清理（如文件句柄、数据库连接、GL buffer）。
- 使用代理表实现响应式状态管理（类似 Vue/MobX 的 observable）。

### 1.4 分析层（Analyzing）

- 分析 Lua 元表机制与 JavaScript 原型链、Python `__dunder__`、C++ 运算符重载、Ruby `method_missing`、Smalltalk 消息传递的本质差异。
- 分析 `__index` 链查找的时间复杂度:O(链长),深继承链的性能风险。
- 分析弱表与 GC 的交互:GC 周期对弱表项存活的影响,以及 `__mode` 与 finalizer 的协作。
- 分析元方法调用开销:与普通函数调用的对比,以及 LuaJIT trace 编译器对元方法的优化策略。
- 区分 `rawget`/`rawset` 与普通访问的语义差异,识别何时必须使用 raw 系列函数。
- 分析代理表（双层表结构）的内存与性能开销:每次访问触发元方法,无法内联。
- 分析多重继承中方法查找的歧义性:线性化（C3 MRO）vs 深度优先 vs Lua 的"首个匹配"策略。

### 1.5 评价层（Evaluating）

- 评判 Lua 元表设计的优劣:简洁性（一切皆表）vs 表达力（无访问控制、无类型约束）。
- 评估元方法与鸭子类型的契合度:动态分派的灵活性 vs 静态可分析性的缺失。
- 评判 `__index` 既支持表又支持函数的设计:通用性 vs 性能可预测性。
- 评估弱表作为缓存机制的可靠性:GC 时机不可控导致缓存命中不可预测。
- 评判 Lua 5.4 废弃 `__pairs`/`__ipairs` 的设计动机:协议简化 vs 表达力损失。
- 评估元表在嵌入式场景的内存开销:每个表可独立元表,但元表本身占内存。

### 1.6 创造层（Creating）

- 设计完整的类系统（class system）:支持构造、继承、多态、混入、抽象方法、接口检查。
- 构建响应式数据流库:基于 `__newindex` 实现依赖追踪与自动更新,类似 MobX。
- 设计声明式 DSL:利用 `__call` 与 `__index` 构建流畅 API,如 HTML 生成器、查询构造器。
- 构建透明持久化层:使用代理表拦截所有访问,自动序列化到磁盘或数据库。
- 设计类型注解系统:在元表中存储类型信息,运行时校验,模拟 Luau 类型系统。
- 构建调试器与追踪工具:利用 `__index`/`__newindex` 全局拦截,记录所有表访问行为。

## 2. 历史动机与演化

### 2.1 元编程的范式演化

程序语言的元编程（metaprogramming）能力历经四个主要阶段:

1. **无元编程**（早期 FORTRAN、COBOL）:语言语义固定,无法自定义类型行为。
2. **运算符重载**（C++、Ada）:允许用户定义类型的算术与比较行为,但语法固定。
3. **动态元编程**（Smalltalk、Ruby、Python）:运行时方法分派、`method_missing`、`__getattr__`、钩子协议。
4. **协议化元编程**（Lua 元表、Clojure 协议、Julia 多分派）:统一的元方法协议,所有自定义行为通过同一机制表达。

Lua 元表机制属于第四阶段的代表:通过统一的"元方法 + 元表"协议,表达运算符重载、属性访问、迭代、调用、GC 等多种行为,设计极简却表达力强大。

### 2.2 Lua 元表的诞生动机

Lua 3.0（1997）引入元表时,主要动机包括:

1. **tag method 替代**:Lua 2.x 使用"tag method"机制（基于类型 tag 的分派）实现基本类型扩展,但语义复杂、不可组合。元表将其统一为表级分派。
2. **C API 桥接**:Lua 与 C 交互时,需要让 userdata 支持算术运算（如向量加减）、索引访问（如数组封装）。元表为 userdata 提供了行为定义。
3. **抽象数据类型**:Lua 唯一的复合结构是表,要让表能表达向量、复数、集合等 ADT,需要运算符重载能力。
4. **继承支持**:Lua 无内置类系统,需要通过 `__index` 元方法实现原型继承,支持代码复用。
5. **资源管理**:C 扩展需要 GC 钩子清理资源,`__gc` 元方法提供此能力。
6. **教学简洁**:元表即普通表,元方法即普通字段,概念极简,无需额外语法。

### 2.3 演化时间线

| 版本 | 年份 | 元表机制变化 |
| --- | --- | --- |
| Lua 1.0 | 1993 | 无元表,无元方法 |
| Lua 2.x | 1995 | 引入 tag method,基于类型 tag 的分派 |
| Lua 3.0 | 1997 | 引入元表（metatable）与元方法（fallback）,替代 tag method |
| Lua 3.1 | 1998 | 引入 `__index`、`__newindex` 元方法,支持继承 |
| Lua 4.0 | 2000 | 元方法重命名:`fallback` → `metamethod`,稳定 API |
| Lua 5.0 | 2003 | 元表 API 重构,`setmetatable`/`getmetatable` 取代 `settagmethod` |
| Lua 5.1 | 2006 | `__metatable` 元方法隐藏元表;`rawget`/`rawset`/`rawequal` 引入 |
| Lua 5.2 | 2011 | 引入 `__pairs` 元方法;废弃 `__settable`/`__getitem` 等遗留别名 |
| Lua 5.3 | 2015 | 引入 64 位整数与位运算元方法:`__band`、`__bor`、`__bxor`、`__bnot`、`__shl`、`__shr`、`__idiv`;引入 `__name` 元方法;引入 `__ipairs` |
| Lua 5.4 | 2020 | 废弃 `__pairs`/`__ipairs`（改用 `__index`/`__len` 协议）;`<close>` 与 `__close` 元方法;`__gc` 支持表;代际 GC 优化弱表 |
| Lua 5.5 | 2025 | 元方法查找性能优化;`__name` 用于错误信息增强 |
| LuaJIT | 2011 | 兼容 Lua 5.1 元表语义;JIT 编译器对 `__index` 链进行 specialization 优化 |
| Luau | 2021 | Roblox 方言,渐进式类型系统与元表结合,`__index` 类型推断 |

### 2.4 设计动机总结

Lua 元表的设计遵循以下原则:

1. **统一性**:所有自定义行为通过元方法表达,无独立语法。
2. **可选性**:表默认无元表,零开销;仅在需要时设置。
3. **协议化**:元方法名称以双下划线开头,与普通字段区分。
4. **可组合**:元表本身是表,可被多个表共享,支持原型复用。
5. **可绕过**:`rawget`/`rawset` 提供绕过元方法的直接访问,用于实现内部逻辑。
6. **可扩展**:语言核心类型（字符串、数字）的元表可通过 debug 库访问,支持全局扩展（如 string metatable 注入方法）。

## 3. 形式化定义

### 3.1 表的代数模型

Lua 表 $T$ 是一个有限映射,定义域为键集合 $K$,值域为值集合 $V$:

$$
T : K \to V \cup \{\bot\}
$$

其中 $\bot$ 表示"键不存在"。表的内部结构分为两部分:

- **数组部分** $T_a$:键为 $1, 2, \ldots, n$ 的连续整数,存储于紧凑数组。
- **哈希部分** $T_h$:其余键,存储于开放寻址哈希表。

查找语义:

$$
T[k] = \begin{cases}
T_a[k] & \text{if } k \in [1, n] \cap \mathbb{Z} \\
T_h[k] & \text{otherwise}
\end{cases}
$$

### 3.2 元表的形式化

元表 $M$ 是一个特殊的表,其字段为预定义的元方法名。元方法 $m \in M$ 定义了表 $T$ 在特定操作 $op$ 下的行为。

设 $\text{mt}(T)$ 为 $T$ 的元表（可为 nil）,则操作 $op(T, \ldots)$ 的语义为:

$$
op(T, \ldots) = \begin{cases}
\text{default}_op(T, \ldots) & \text{if } \text{mt}(T) = \text{nil} \\
m(T, \ldots) & \text{if } \text{mt}(T).\text{\_\_}op \text{ exists} \\
\text{default}_op(T, \ldots) & \text{otherwise}
\end{cases}
$$

### 3.3 `__index` 元方法的形式化

`__index` 是最复杂的元方法,有两种形态:

**表形态**:

$$
\text{index}(T, k) = \begin{cases}
T[k] & \text{if } k \in \text{dom}(T) \\
\text{mt}(T).\text{\_\_index}[k] & \text{if } \text{mt}(T).\text{\_\_index} \text{ is table} \\
\bot & \text{otherwise}
\end{cases}
$$

**函数形态**:

$$
\text{index}(T, k) = \begin{cases}
T[k] & \text{if } k \in \text{dom}(T) \\
\text{mt}(T).\text{\_\_index}(T, k) & \text{if } \text{mt}(T).\text{\_\_index} \text{ is function} \\
\bot & \text{otherwise}
\end{cases}
$$

注意:表形态的 `__index` 可递归,形成元表链。

### 3.4 `__newindex` 元方法的形式化

$$
\text{newindex}(T, k, v) = \begin{cases}
T[k] \leftarrow v & \text{if } k \in \text{dom}(T) \\
\text{mt}(T).\text{\_\_newindex}(T, k, v) & \text{if } \text{mt}(T).\text{\_\_newindex} \text{ is function} \\
\text{mt}(T).\text{\_\_newindex}[k] \leftarrow v & \text{if } \text{mt}(T).\text{\_\_newindex} \text{ is table} \\
T[k] \leftarrow v & \text{otherwise}
\end{cases}
$$

注意:仅在键不存在时触发元方法。这是与 `__index` 对称的设计。

### 3.5 算术元方法的二元查找

对二元运算 $a \oplus b$（$\oplus \in \{+, -, *, /, \%, \hat{}, .., ==, <, <=\}$）,元方法查找遵循:

$$
\text{binop}(a, b) = \begin{cases}
m_a(a, b) & \text{if } \text{mt}(a).\text{\_\_}\oplus \text{ exists} \\
m_b(a, b) & \text{elseif } \text{mt}(b).\text{\_\_}\oplus \text{ exists} \\
\text{error} & \text{otherwise}
\end{cases}
$$

其中 $m_a = \text{mt}(a).\text{\_\_}\oplus$,$m_b = \text{mt}(b).\text{\_\_}\oplus$。

特殊规则:
- 对 `==`（`__eq`）:仅当 $\text{mt}(a) = \text{mt}(b)$（同一元表对象）且两者均定义 `__eq` 时才触发。否则使用引用相等。
- 对 `<`（`__lt`）与 `<=`（`__le`）:若未定义 `__le`,Lua 自动推导 $a \leq b \equiv \neg (b < a)$。
- 字符串与数字的混合运算:先尝试数字运算,失败则触发元方法。

### 3.6 元方法查找的状态机

元方法查找可形式化为状态机:

$$
\delta : \text{State} \times \text{Event} \to \text{State}
$$

状态:
- $\text{START}$:开始查找。
- $\text{CHECK\_TABLE}$:在主表中查找。
- $\text{CHECK\_METATABLE}$:在元表中查找元方法。
- $\text{INVOKE}$:调用元方法。
- $\text{RETURN\_DEFAULT}$:返回默认值或抛错。

转移（以 `t[k]` 为例）:

$$
\delta(\text{START}, \text{access}) = \text{CHECK\_TABLE}
$$

$$
\delta(\text{CHECK\_TABLE}, \text{hit}) = \text{return } t[k]
$$

$$
\delta(\text{CHECK\_TABLE}, \text{miss}) = \text{CHECK\_METATABLE}
$$

$$
\delta(\text{CHECK\_METATABLE}, \text{no\_mt}) = \text{RETURN\_DEFAULT}, \quad \text{return nil}
$$

$$
\delta(\text{CHECK\_METATABLE}, \text{no\_index}) = \text{RETURN\_DEFAULT}, \quad \text{return nil}
$$

$$
\delta(\text{CHECK\_METATABLE}, \text{table\_index}) = \text{CHECK\_TABLE}, \quad t \leftarrow \text{mt}.\text{\_\_index}
$$

$$
\delta(\text{CHECK\_METATABLE}, \text{func\_index}) = \text{INVOKE}
$$

$$
\delta(\text{INVOKE}, \text{return}) = \text{return value}
$$

注意:表形态的 `__index` 递归回到 `CHECK_TABLE`,形成元表链。

### 3.7 弱表的形式化

弱表通过 `__mode` 元方法声明:

$$
\text{weakness}(T) = \text{mt}(T).\text{\_\_mode}
$$

`__mode` 为字符串,取值:
- `"k"`:键为弱引用,值不受弱引用影响。
- `"v"`:值为弱引用,键不受弱引用影响。
- `"kv"`:键值均为弱引用。

GC 周期中,若弱表项的弱引用对象无强引用,则该项被清除:

$$
\forall (k, v) \in T: (\text{weakness} = \text{"k"} \land \neg \text{strong}(k)) \lor (\text{weakness} = \text{"v"} \land \neg \text{strong}(v)) \implies (k, v) \notin T
$$

注:字符串、数字、布尔值、轻量 userdata 不受弱引用影响（按值而非引用存储）。

### 3.8 元表链的范畴论模型

元表链可视为范畴论中的对象链,`__index` 为态射:

$$
T_1 \xrightarrow{\text{\_\_index}} T_2 \xrightarrow{\text{\_\_index}} T_3 \to \ldots \to T_n
$$

查找 $T_1[k]$ 即沿态射链合成查找:

$$
T_1[k] = T_1[k] \cup T_2[k] \cup \ldots \cup T_n[k]
$$

无环元表链对应自由范畴;有环链（罕见）需处理,可能导致无限递归。

## 4. 理论推导与证明

### 4.1 `__index` 表形态与函数形态的等价性

**命题 1**:`__index` 的表形态与函数形态在表达能力上等价。

**证明**:

(1) 表形态可由函数形态模拟:

设表形态 `__index = F`（F 为表）,则函数形态 `__index = function(t, k) return F[k] end` 与之等价。注意此函数形态不递归 `__index`,但若 `F` 自身有元表,则 `F[k]` 会触发 `F` 的 `__index`,递归查找。

(2) 函数形态不可由表形态完全模拟:

设函数形态 `__index = function(t, k) return compute(t, k) end`,其中 `compute` 是任意计算。表形态只能"查找",不能"计算",故无法模拟任意函数。

但若允许表形态的 `__index` 链足够长（链上每个表的字段预先计算好）,则可模拟纯函数（无副作用的函数）。对于有副作用或依赖运行时状态的函数,表形态无法模拟。

故在纯查找场景下,二者等价;在需要计算的场景下,函数形态更强。

证毕。

### 4.2 `__index` 链查找复杂度

**命题 2**:`__index` 链查找的最坏时间复杂度为 $O(L)$,其中 $L$ 为链长。

**证明**:

设链为 $T_1 \to T_2 \to \ldots \to T_L$,每个 $T_i$ 的 `__index` 为 $T_{i+1}$（表形态）。

查找 $T_1[k]$ 的过程:
1. 检查 $T_1[k]$:若存在,返回;否则进入 $T_2$。
2. 检查 $T_2[k]$:若存在,返回;否则进入 $T_3$。
3. ...
4. 检查 $T_L[k]$:若存在,返回;否则返回 nil。

最坏情况下,$k$ 不存在于任何 $T_i$,需遍历整个链,共 $L$ 次查找。每次查找为 $O(1)$(哈希表),故总复杂度 $O(L)$。

推论:深继承链（如 $L > 10$）会导致性能下降,应避免。

证毕。

### 4.3 `__eq` 的元表同一性约束

**命题 3**:`__eq` 仅当两操作数的元表为同一对象时才触发。

**证明**:

设 `a == b`,Lua 执行流程:
1. 若 `a` 与 `b` 类型不同,返回 false（不触发元方法）。
2. 若类型相同且为数字或字符串,直接比较值。
3. 若类型相同且为表/userdata:
   a. 检查 `mt(a).__eq` 与 `mt(b).__eq` 是否存在。
   b. **关键**:仅当 `mt(a) == mt(b)`（同一元表对象）且 `mt(a).__eq` 存在时,才调用 `mt(a).__eq(a, b)`。
   c. 否则使用引用相等（`a is b`）。

此设计避免不同类型的 `__eq` 冲突:若 `a` 与 `b` 元表不同,无法确定用谁的 `__eq`,故回退到引用相等。

注意:Lua 5.4 放宽了此约束,允许任一操作数定义 `__eq` 即触发。

证毕。

### 4.4 `__le` 的默认推导

**命题 4**:若未定义 `__le`,Lua 自动推导 $a \leq b \equiv \neg (b < a)$。

**证明**:

设 `a <= b`,Lua 执行流程:
1. 若 `mt(a).__le` 存在,调用之。
2. 若 `mt(b).__le` 存在,调用之。
3. **否则**:计算 `not (b < a)`,即调用 `mt(b).__lt(b, a)` 或 `mt(a).__lt(b, a)`,取反。

此推导基于全序关系的性质:$a \leq b \iff \neg (b < a)$。

故实现自定义类型时,只需定义 `__lt`,`__le` 自动推导;或反之。但建议两者均定义以避免性能开销与边界 bug。

证毕。

### 4.5 弱表的 GC 语义

**命题 5**:弱表项的清除发生在 GC 的"清除阶段"之前,且仅清除无强引用的弱引用对象。

**证明**:

Lua GC 采用三色标记-清除算法,弱表处理流程:
1. **标记阶段**:从根集合出发,标记所有可达对象。弱表中的弱引用对象不参与标记传播（即不作为强引用源）。
2. **原子阶段**:处理弱表、finalizer。对每个弱表 $T$:
   - 若 `__mode` 含 `"k"`:检查每个键 $k$,若 $k$ 未被标记（无强引用）,清除该项 $(k, v)$。
   - 若 `__mode` 含 `"v"`:检查每个值 $v$,若 $v$ 未被标记,清除该项。
3. **清除阶段**:回收所有未标记对象。

注意:弱表本身被标记（强引用）,但其内部项的弱引用对象可能未标记,故被清除。

推论:弱表缓存的命中率取决于 GC 周期,不可预测。对于确定性缓存,应使用 LRU 等显式策略。

证毕。

### 4.6 代理表的双层结构定理

**命题 6**:代理表通过双层结构（外层代理 + 内层数据）实现访问拦截,但带来 $O(1)$ 的常数因子开销。

**证明**:

代理表 $P$ 结构:
- $P$ 本身为空表,元表设置 `__index` 与 `__newindex`。
- 内层数据表 $D$ 存储实际键值。
- `__index(t, k) = D[k]`。
- `__newindex(t, k, v) = D[k] = v`（可附加副作用）。

每次访问 $P[k]$:
1. 检查 $P[k]$:不存在（$P$ 为空）。
2. 调用 `__index(P, k)`:返回 $D[k]$。

相比直接访问 $D[k]$,多了一次元方法调用,常数因子约 2-3 倍（LuaJIT 下更高,因 trace 难以穿透元方法）。

推论:代理表适用于调试、响应式系统等非热路径场景;热路径应避免代理表。

证毕。

## 5. 代码示例

### 5.1 元方法全景速查

```lua
-- lua: 元方法全景示例
local M = {}
M.__index = M

function M.new(x)
    return setmetatable({ x = x or 0 }, M)
end

-- 算术元方法
M.__add = function(a, b) return M.new(a.x + b.x) end
M.__sub = function(a, b) return M.new(a.x - b.x) end
M.__mul = function(a, b) return M.new(a.x * b.x) end
M.__div = function(a, b) return M.new(a.x / b.x) end
M.__mod = function(a, b) return M.new(a.x % b.x) end
M.__pow = function(a, b) return M.new(a.x ^ b.x) end
M.__unm = function(a) return M.new(-a.x) end
M.__idiv = function(a, b) return M.new(a.x // b.x) end  -- Lua 5.3+

-- 位运算元方法(Lua 5.3+)
M.__band = function(a, b) return M.new(a.x & b.x) end
M.__bor  = function(a, b) return M.new(a.x | b.x) end
M.__bxor = function(a, b) return M.new(a.x ~ b.x) end
M.__bnot = function(a)    return M.new(~a.x) end
M.__shl  = function(a, b) return M.new(a.x << b.x) end
M.__shr  = function(a, b) return M.new(a.x >> b.x) end

-- 字符串与长度
M.__concat    = function(a, b) return tostring(a.x) .. tostring(b.x) end
M.__tostring  = function(a)    return "M(" .. a.x .. ")" end
M.__len       = function(a)    return a.x end

-- 比较
M.__eq = function(a, b) return a.x == b.x end
M.__lt = function(a, b) return a.x <  b.x end
M.__le = function(a, b) return a.x <= b.x end

-- 索引
M.__index = function(t, k)
    if k == "double" then return t.x * 2 end
    return rawget(M, k)
end

M.__newindex = function(t, k, v)
    if k == "x" then
        assert(type(v) == "number", "x must be number")
        rawset(t, k, v)
    else
        error("cannot set field: " .. tostring(k))
    end
end

-- 调用
M.__call = function(self, delta) return self.x + (delta or 0) end

-- 遍历(Lua 5.2/5.3,5.4 废弃)
M.__pairs = function(t)
    local k = nil
    return function()
        k = next(rawget(t, "_data") or t, k)
        if k then return k, t[k] end
    end
end

-- 名字(Lua 5.3+)
M.__name = "MyType"

local a = M.new(10)
local b = M.new(3)
print(a + b)        -- M(13)
print(a - b)        -- M(7)
print(a * b)        -- M(30)
print(a / b)        -- M(3.3333...)
print(a % b)        -- M(1)
print(a ^ b)        -- M(1000)
print(-a)           -- M(-10)
print(a // b)       -- M(3)
print(a & b)        -- M(2)
print(a | b)        -- M(11)
print(a ~ b)        -- M(9)
print(~a)           -- M(-11)
print(a << b)       -- M(80)
print(a >> b)       -- M(1)
print(a .. b)       -- 103
print(tostring(a))  -- M(10)
print(#a)           -- 10
print(a == M.new(10))  -- true
print(a < b)        -- false
print(a <= b)       -- false
print(a.double)     -- 20
print(a(5))         -- 15
```

### 5.2 向量类型完整实现

```lua
-- lua: 二维向量类型,重载全部算术与比较运算符
local Vector = {}
Vector.__index = Vector
Vector.__name = "Vector2D"  -- Lua 5.3+

-- 构造函数
function Vector.new(x, y)
    if type(x) ~= "number" or type(y) ~= "number" then
        error("Vector coordinates must be numbers", 2)
    end
    return setmetatable({ x = x, y = y }, Vector)
end

-- 加法
function Vector.__add(a, b)
    if getmetatable(a) ~= Vector or getmetatable(b) ~= Vector then
        error("cannot add Vector with non-Vector", 2)
    end
    return Vector.new(a.x + b.x, a.y + b.y)
end

-- 减法
function Vector.__sub(a, b)
    return Vector.new(a.x - b.x, a.y - b.y)
end

-- 乘法:支持标量乘与点积
function Vector.__mul(a, b)
    if type(a) == "number" then
        return Vector.new(a * b.x, a * b.y)
    elseif type(b) == "number" then
        return Vector.new(a.x * b, a.y * b)
    elseif getmetatable(a) == Vector and getmetatable(b) == Vector then
        return a.x * b.x + a.y * b.y  -- 点积返回标量
    end
    error("invalid multiplication", 2)
end

-- 除法:仅支持标量除
function Vector.__div(a, b)
    if type(b) == "number" then
        return Vector.new(a.x / b, a.y / b)
    end
    error("Vector division only supports scalar divisor", 2)
end

-- 取负
function Vector.__unm(a)
    return Vector.new(-a.x, -a.y)
end

-- 长度(模)
function Vector.__len(a)
    return math.sqrt(a.x * a.x + a.y * a.y)
end

-- 相等
function Vector.__eq(a, b)
    return a.x == b.x and a.y == b.y
end

-- 字符串表示
function Vector.__tostring(a)
    return string.format("Vector(%g, %g)", a.x, a.y)
end

-- 调用:返回坐标元组
function Vector.__call(a)
    return a.x, a.y
end

-- 实例方法
function Vector:magnitude()
    return #self
end

function Vector:normalize()
    local mag = #self
    if mag == 0 then error("cannot normalize zero vector", 2) end
    return Vector.new(self.x / mag, self.y / mag)
end

function Vector:angle()
    return math.atan2(self.y, self.x)
end

function Vector:dot(other)
    return self.x * other.x + self.y * other.y
end

function Vector:distanceTo(other)
    return #(other - self)
end

-- 使用
local v1 = Vector.new(3, 4)
local v2 = Vector.new(1, 2)
print(v1)                -- Vector(3, 4)
print(#v1)               -- 5
print(v1 + v2)           -- Vector(4, 6)
print(v1 * 2)            -- Vector(6, 8)
print(2 * v1)            -- Vector(6, 8)
print(v1 * v2)           -- 11(点积)
print(v1:normalize())    -- Vector(0.6, 0.8)
print(v1:angle())        -- 0.927295218...
local x, y = v1()        -- 3, 4
```

### 5.3 复数类型

```lua
-- lua: 复数类型,演示运算符重载与 __index 函数形态
local Complex = {}
Complex.__index = Complex
Complex.__name = "Complex"

function Complex.new(real, imag)
    return setmetatable({ re = real or 0, im = imag or 0 }, Complex)
end

function Complex.__add(a, b)
    return Complex.new(a.re + b.re, a.im + b.im)
end

function Complex.__sub(a, b)
    return Complex.new(a.re - b.re, a.im - b.im)
end

function Complex.__mul(a, b)
    return Complex.new(
        a.re * b.re - a.im * b.im,
        a.re * b.im + a.im * b.re
    )
end

function Complex.__div(a, b)
    local denom = b.re * b.re + b.im * b.im
    if denom == 0 then error("complex division by zero", 2) end
    return Complex.new(
        (a.re * b.re + a.im * b.im) / denom,
        (a.im * b.re - a.re * b.im) / denom
    )
end

function Complex.__unm(a)
    return Complex.new(-a.re, -a.im)
end

function Complex.__eq(a, b)
    return a.re == b.re and a.im == b.im
end

function Complex.__tostring(a)
    if a.im >= 0 then
        return string.format("%g+%gi", a.re, a.im)
    else
        return string.format("%g%gi", a.re, a.im)
    end
end

-- 实例方法
function Complex:conjugate()
    return Complex.new(self.re, -self.im)
end

function Complex:magnitude()
    return math.sqrt(self.re * self.re + self.im * self.im)
end

function Complex:phase()
    return math.atan2(self.im, self.re)
end

-- 使用
local z1 = Complex.new(1, 2)
local z2 = Complex.new(3, -1)
print(z1 + z2)  -- 4+1i
print(z1 * z2)  -- 5+5i
print(z1:conjugate())  -- 1-2i
print(z1:magnitude())  -- 2.236...
```

### 5.4 只读表

```lua
-- lua: 只读表实现
local function readonly(t, name)
    return setmetatable({}, {
        __index = t,
        __newindex = function(_, k, v)
            error(("attempt to modify readonly %s: %s = %s"):format(
                name or "table", tostring(k), tostring(v)), 2)
        end,
        __pairs = function(_) return pairs(t) end,
        __len = function(_) return #t end,
        __metatable = "readonly",  -- 防止 getmetatable 篡改
    })
end

local config = readonly({
    host = "localhost",
    port = 8080,
    debug = false,
}, "config")

print(config.host)  -- localhost
print(config.port)  -- 8080
-- config.host = "x"  -- error: attempt to modify readonly config: host = x
for k, v in pairs(config) do print(k, v) end
print(getmetatable(config))  -- readonly
```

### 5.5 默认值表

```lua
-- lua: 带默认值的表
local function defaultTable(defaults)
    return setmetatable({}, {
        __index = function(t, k)
            return defaults[k]
        end,
        __newindex = function(t, k, v)
            defaults[k] = v  -- 或 rawset(t, k, v) 仅设置实例
        end,
    })
end

local settings = defaultTable({
    theme = "dark",
    fontSize = 14,
    language = "zh-CN",
})

print(settings.theme)       -- dark
print(settings.unknown)     -- nil
settings.theme = "light"
print(settings.theme)       -- light
print(settings.fontSize)    -- 14(仍从 defaults)
```

### 5.6 代理表:响应式状态

```lua
-- lua: 响应式状态,类似 Vue 的 reactive
local function reactive(initial)
    local data = initial or {}
    local effects = {}  -- 依赖追踪:key -> {effect list}

    local function track(key)
        -- 在当前 effect 上下文中注册依赖(简化版)
        if _G._currentEffect then
            effects[key] = effects[key] or {}
            table.insert(effects[key], _G._currentEffect)
        end
    end

    local function trigger(key)
        if effects[key] then
            for _, effect in ipairs(effects[key]) do
                effect()
            end
        end
    end

    local proxy = setmetatable({}, {
        __index = function(_, k)
            track(k)
            return data[k]
        end,
        __newindex = function(_, k, v)
            data[k] = v
            trigger(k)
        end,
        __pairs = function(_) return pairs(data) end,
        __len = function(_) return #data end,
    })

    return proxy
end

-- watch 工具
local function watch(dep, callback)
    _G._currentEffect = callback
    callback()  -- 首次执行,收集依赖
    _G._currentEffect = nil
end

-- 使用
local state = reactive({ count = 0, name = "Alice" })
watch(function()
    print("count is:", state.count)
end)
-- 输出:count is: 0
state.count = 1  -- 输出:count is: 1
state.count = 2  -- 输出:count is: 2
state.name = "Bob"  -- 无输出(未 watch name)
```

### 5.7 有序表

```lua
-- lua: 保持插入顺序的有序表
local OrderedTable = {}
OrderedTable.__index = OrderedTable

function OrderedTable.new()
    return setmetatable({
        _data = {},
        _order = {},
        _indices = {},  -- key -> index in _order
    }, OrderedTable)
end

function OrderedTable:set(key, value)
    if self._data[key] == nil then
        table.insert(self._order, key)
        self._indices[key] = #self._order
    end
    self._data[key] = value
end

function OrderedTable:get(key)
    return self._data[key]
end

function OrderedTable:remove(key)
    if self._data[key] == nil then return end
    local idx = self._indices[key]
    table.remove(self._order, idx)
    self._data[key] = nil
    self._indices[key] = nil
    -- 重建索引(简化)
    for i, k in ipairs(self._order) do self._indices[k] = i end
end

function OrderedTable:__pairs()
    local i = 0
    return function()
        i = i + 1
        local k = self._order[i]
        if k then return k, self._data[k] end
    end
end

OrderedTable.__pairs = function(self)
    local i = 0
    return function()
        i = i + 1
        local k = self._order[i]
        if k then return k, self._data[k] end
    end
end

OrderedTable.__len = function(self)
    return #self._order
end

-- 使用
local ot = OrderedTable.new()
ot:set("banana", 2)
ot:set("apple", 1)
ot:set("cherry", 3)

for k, v in pairs(ot) do
    print(k, v)  -- 按插入顺序:banana 2, apple 1, cherry 3
end
print(#ot)  -- 3
```

### 5.8 弱表:对象池

```lua
-- lua: 使用弱表实现对象池与缓存
local function createPool(factory)
    local pool = setmetatable({}, { __mode = "k" })  -- 弱键
    return {
        acquire = function(key)
            local obj = pool[key]
            if obj then
                pool[key] = nil  -- 从池中移除
                return obj
            end
            return factory(key)
        end,
        release = function(key, obj)
            pool[key] = obj  -- 放回池中
        end,
        size = function()
            local n = 0
            for _ in pairs(pool) do n = n + 1 end
            return n
        end,
    }
end

-- 使用:数据库连接池
local dbPool = createPool(function(dbName)
    print("creating connection to " .. dbName)
    return { conn = "connection to " .. dbName, alive = true }
end)

local conn1 = dbPool.acquire("users")
local conn2 = dbPool.acquire("users")
dbPool.release("users", conn1)
print(dbPool.size())  -- 1
local conn3 = dbPool.acquire("users")  -- 复用 conn1,不打印 creating
print(conn3 == conn1)  -- true
```

### 5.9 memoization 缓存

```lua
-- lua: 使用弱表实现 memoization,避免内存泄漏
local function memoize(fn)
    local cache = setmetatable({}, { __mode = "k" })  -- 弱键(适用于对象参数)
    return function(arg)
        if cache[arg] == nil then
            cache[arg] = fn(arg)
        end
        return cache[arg]
    end
end

-- 使用:缓存昂贵的计算
local function expensiveCompute(obj)
    print("computing for " .. tostring(obj))
    return obj.x ^ 2 + obj.y ^ 2
end

local memoized = memoize(expensiveCompute)
local pt1 = { x = 3, y = 4 }
print(memoized(pt1))  -- computing for table: 0x... ; 25
print(memoized(pt1))  -- 25(复用,不打印)
pt1 = nil  -- 释放强引用,GC 后 cache[pt1] 自动清除
collectgarbage("collect")
```

### 5.10 `__call` 实现 DSL

```lua
-- lua: 利用 __call 构建声明式 HTML 生成器
local function tag(name)
    local function builder(attrs, children)
        attrs = attrs or {}
        children = children or {}
        local attrStr = {}
        for k, v in pairs(attrs) do
            table.insert(attrStr, string.format('%s="%s"', k, v))
        end
        local open = "<" .. name
        if #attrStr > 0 then open = open .. " " .. table.concat(attrStr, " ") end
        open = open .. ">"
        local close = "</" .. name .. ">"
        local inner = {}
        for _, c in ipairs(children) do
            table.insert(inner, type(c) == "string" and c or tostring(c))
        end
        return open .. table.concat(inner) .. close
    end
    -- 设置 __call 使 builder 可调用
    return setmetatable({}, { __call = function(_, ...) return builder(...) end })
end

local div = tag("div")
local span = tag("span")
local p = tag("p")

print(div({ class = "container" }, {
    p({}, { "Hello, " }),
    span({ style = "color:red" }, { "World" }),
}))
-- <div class="container"><p>Hello, </p><span style="color:red">World</span></div>
```

### 5.11 多重继承

```lua
-- lua: 多重继承,深度优先查找
local function createClass(...)
    local bases = { ... }
    local cls = {}
    cls.__index = cls

    -- 设置 __index 在多基类中查找
    setmetatable(cls, {
        __index = function(_, k)
            for _, base in ipairs(bases) do
                local v = base[k]
                if v ~= nil then return v end
            end
            return nil
        end,
    })

    function cls.new(...)
        local obj = setmetatable({}, cls)
        if cls.init then cls.init(obj, ...) end
        return obj
    end

    return cls
end

-- Mixin 1: 序列化
local Serializable = {}
function Serializable:serialize()
    local parts = {}
    for k, v in pairs(self) do
        if type(k) == "string" and not k:match("^_") then
            table.insert(parts, k .. "=" .. tostring(v))
        end
    end
    return "{" .. table.concat(parts, ", ") .. "}"
end

-- Mixin 2: 比较
local Comparable = {}
function Comparable:__lt(other) return self:value() < other:value() end
function Comparable:__le(other) return self:value() <= other:value() end

-- 派生类
local Score = createClass(Serializable, Comparable)
function Score:init(value) self._value = value end
function Score:value() return self._value end

local s1 = Score.new(85)
local s2 = Score.new(92)
print(s1:serialize())  -- {_value=85}
print(s1 < s2)  -- true
```

### 5.12 `__gc` 资源清理

```lua
-- lua: __gc 元方法用于资源清理(Lua 5.4+ 支持表)
-- 注意:Lua 5.1-5.3 __gc 仅对 userdata 生效

-- Lua 5.4+ 表的 __gc 示例
if _VERSION >= "Lua 5.4" then
    local function createFileWrapper(path)
        local f = assert(io.open(path, "w"))
        local wrapper = setmetatable({
            file = f,
            write = function(self, data) self.file:write(data) end
        }, {
            __gc = function(self)
                if self.file then
                    self.file:close()
                    self.file = nil
                    print("file closed by GC")
                end
            end,
            __close = function(self)  -- Lua 5.4+ <close> 支持
                if self.file then
                    self.file:close()
                    self.file = nil
                    print("file closed explicitly")
                end
            end,
        })
        return wrapper
    end

    local w = createFileWrapper("/tmp/test.txt")
    w:write("hello")
    w = nil
    collectgarbage("collect")  -- 触发 __gc
end
```

### 5.13 字符串元表注入

```lua
-- lua: 通过字符串元表扩展字符串方法
local stringMeta = getmetatable("")
-- stringMeta.__index 默认指向 string 表

-- 添加自定义方法
function stringMeta.__index:trim()
    return (self:gsub("^%s+", ""):gsub("%s+$", ""))
end

function stringMeta.__index:startsWith(prefix)
    return self:sub(1, #prefix) == prefix
end

function stringMeta.__index:endsWith(suffix)
    return self:sub(-#suffix) == suffix
end

function stringMeta.__index:split(sep)
    sep = sep or "%s"
    local parts = {}
    for part in self:gmatch(("([^%s]+)"):format(sep)) do
        table.insert(parts, part)
    end
    return parts
end

-- 使用:所有字符串自动获得新方法
print("  hello world  ":trim())       -- hello world
print("hello.lua":startsWith("hello"))  -- true
print("hello.lua":endsWith(".lua"))     -- true
local parts = "a,b,c":split(",")
for _, p in ipairs(parts) do print(p) end  -- a, b, c
```

### 5.14 `__index` 函数形态:惰性计算

```lua
-- lua: 利用 __index 函数形态实现惰性属性
local function lazyClass(compute)
    local cls = {}
    cls.__index = function(t, k)
        -- 先查实例字段
        local v = rawget(t, k)
        if v ~= nil then return v end
        -- 再查类方法
        v = rawget(cls, k)
        if v ~= nil then return v end
        -- 最后调用计算函数
        local computed = compute(t, k)
        if computed ~= nil then
            rawset(t, k, computed)  -- 缓存到实例
            return computed
        end
        return nil
    end
    return cls
end

local Person = lazyClass(function(self, key)
    if key == "fullName" then
        return self.firstName .. " " .. self.lastName
    elseif key == "ageGroup" then
        if self.age < 18 then return "minor"
        elseif self.age < 65 then return "adult"
        else return "senior" end
    end
    return nil
end)

local p = setmetatable({
    firstName = "Alice",
    lastName = "Smith",
    age = 30,
}, Person)

print(p.fullName)  -- Alice Smith(首次计算并缓存)
print(p.ageGroup)  -- adult
p.age = 70
print(p.ageGroup)  -- 仍是 adult(已缓存,不会更新)
```

### 5.15 `rawget`/`rawset` 的必要性

```lua
-- lua: 演示 rawget/rawset 绕过元方法的场景
local function makeCounter()
    local count = 0
    return setmetatable({}, {
        __index = function(t, k)
            count = count + 1
            return rawget(t, k) or ("default_" .. k)
        end,
        __newindex = function(t, k, v)
            count = count + 1
            rawset(t, k, v)
        end,
    }), function() return count end
end

local c, getCount = makeCounter()
-- 错误示例:在 __index 中用 t[k] 会无限递归
-- __index = function(t, k) return t[k] or "default" end  -- stack overflow

-- 正确:用 rawget 查实例字段
print(c.foo)  -- default_foo
print(getCount())  -- 1
c.foo = "bar"  -- 触发 __newindex
print(getCount())  -- 2
print(c.foo)  -- bar(rawget 命中)
print(getCount())  -- 3(__index 仍被调用,但 rawget 命中)
```

## 6. 对比分析

### 6.1 与 JavaScript 原型链对比

| 维度 | Lua 元表 | JavaScript 原型链 |
| --- | --- | --- |
| 原型查找机制 | `__index` 元方法（表或函数） | `[[Prototype]]` 内部槽 |
| 设置原型 | `setmetatable(t, mt)` | `Object.setPrototypeOf` 或 `__proto__` |
| 运算符重载 | 通过 `__add` 等元方法 | 不支持（Symbol.toPrimitive 部分支持） |
| 属性拦截 | `__index`/`__newindex` | `Proxy` 对象 |
| 默认原型 | 无（表默认无元表） | `Object.prototype` |
| 查找复杂度 | O(链长) | O(链长) |
| 性能 | 元方法调用开销大 | V8 隐藏类优化,内联缓存 |
| 动态修改 | 元表可随时替换 | 原型可替换但性能差 |

Lua 的元表更"显式":必须手动设置元表;JavaScript 的原型链更"隐式":每个对象自动有原型。

### 6.2 与 Python `__dunder__` 对比

| 维度 | Lua 元表 | Python dunder |
| --- | --- | --- |
| 定义位置 | 元表（独立表） | 类体内 |
| 触发机制 | 类型 + 元方法 | 特殊方法查找 |
| 多分派 | 不支持（单分派） | 不支持（单分派,funcy 支持多分派） |
| 属性访问 | `__index`/`__newindex` | `__getattr__`/`__setattr__` |
| 迭代 | `__pairs`/`__ipairs`（5.4 废弃） | `__iter__`/`__next__` |
| GC 钩子 | `__gc` | `__del__` |
| 类型检查 | `getmetatable` 检查 | `isinstance` |
| 性能 | 元方法调用慢 | 方法解析慢 |

Python 的 dunder 与类绑定,更符合 OOP 直觉;Lua 的元表与对象分离,更灵活但易出错。

### 6.3 与 C++ 运算符重载对比

| 维度 | Lua 元表 | C++ 运算符重载 |
| --- | --- | --- |
| 类型系统 | 动态类型 | 静态类型 |
| 编译期检查 | 无 | 完整类型检查 |
| 性能 | 运行时分派 | 编译期绑定,零开销 |
| 重载运算符 | 全部算术、比较、索引、调用 | 几乎全部运算符 |
| 自定义运算符 | 不支持 | 不支持 |
| 隐式转换 | 不支持 | 支持构造函数转换 |

C++ 的运算符重载性能最优,但灵活性低;Lua 灵活性高但性能差。

### 6.4 与 Ruby `method_missing` 对比

| 维度 | Lua `__index` | Ruby `method_missing` |
| --- | --- | --- |
| 触发时机 | 方法/属性不存在时 | 方法不存在时 |
| 返回值 | 任意值 | 任意值 |
| 副作用 | 可有 | 可有 |
| 性能 | 慢 | 慢 |
| 元编程 | 强 | 强 |
| 典型用途 | 原型继承、代理 | DSL、动态方法 |

Ruby 的 `method_missing` 仅针对方法,属性另有机制;Lua 的 `__index` 统一处理属性与方法。

### 6.5 与 Java 接口对比

| 维度 | Lua 元表 | Java 接口 |
| --- | --- | --- |
| 类型安全 | 无 | 编译期检查 |
| 多态 | 鸭子类型 | 接口分派 |
| 性能 | 元方法分派 | 虚方法分派 |
| 工具支持 | 弱（无静态分析） | 强（IDE 重构、导航） |
| 学习曲线 | 低 | 中 |

Java 接口提供静态安全;Lua 元表提供动态灵活,适合快速原型与 DSL。

## 7. 常见陷阱与反模式

### 7.1 `__index` 函数形态中的无限递归

```lua
-- lua: 错误示例
local bad = setmetatable({}, {
    __index = function(t, k)
        return t[k] or "default"  -- 错误:t[k] 又触发 __index,无限递归
    end,
})

-- 正确:用 rawget 查实例字段
local good = setmetatable({}, {
    __index = function(t, k)
        return rawget(t, k) or "default"
    end,
})
```

**陷阱**:`__index` 函数内访问 `t[k]` 会再次触发 `__index`,导致栈溢出。必须用 `rawget` 绕过。

### 7.2 `__newindex` 不触发已存在键

```lua
-- lua: __newindex 仅在键不存在时触发
local t = setmetatable({ existing = 1 }, {
    __newindex = function(t, k, v)
        print("setting " .. k)
        rawset(t, k, v)
    end,
})

t.existing = 2  -- 不触发 __newindex(键已存在)
t.new = 3       -- 触发 __newindex,打印 "setting new"
```

**陷阱**:期望 `__newindex` 拦截所有赋值,但已存在的键直接赋值,绕过元方法。如需拦截所有,用代理表(外层空表)。

### 7.3 `__eq` 的元表同一性约束

```lua
-- lua: __eq 仅在元表相同时触发
local mtA = { __eq = function(a, b) return a.x == b.x end }
local mtB = { __eq = function(a, b) return a.x == b.x end }

local a = setmetatable({ x = 1 }, mtA)
local b = setmetatable({ x = 1 }, mtB)

print(a == b)  -- false! 元表不同(虽内容相同),不触发 __eq,使用引用相等
```

**陷阱**:两个不同元表对象(即使内容相同)不会触发 `__eq`。解决方案:共享同一元表对象。

### 7.4 弱表中的字符串键陷阱

```lua
-- lua: 弱表键为字符串时,字符串可能被内部化(intern),不受弱引用影响
local weak = setmetatable({}, { __mode = "k" })
weak["long_string_" .. math.random()] = "value"
collectgarbage("collect")
-- 弱表项可能仍存在,因为字符串被 Lua 内部化保留

-- 数字、布尔、轻量 userdata 同样不受弱引用影响
```

**陷阱**:弱表的弱引用仅对 table、function、thread、full userdata、字符串(部分情况)有效。基础类型(数字、布尔)按值存储,不受影响。

### 7.5 `__gc` 不支持普通表(Lua 5.3 及以下)

```lua
-- lua: Lua 5.3 及以下,__gc 仅对 userdata 生效
local t = setmetatable({}, { __gc = function() print("gc") end })
t = nil
collectgarbage("collect")
-- Lua 5.3:无输出(__gc 不触发)
-- Lua 5.4+:打印 "gc"

-- 解决方案:用 newproxy(true) 创建 userdata
local proxy = newproxy(true)
getmetatable(proxy).__gc = function() print("gc") end
proxy = nil
collectgarbage("collect")  -- 打印 "gc"
```

**陷阱**:Lua 5.3 及以下,表的 `__gc` 不生效。Lua 5.4 才支持表的 `__gc`。

### 7.6 元表共享导致意外耦合

```lua
-- lua: 多个对象共享元表,修改元表影响所有对象
local mt = { __index = { greet = function() return "hi" end } }
local a = setmetatable({}, mt)
local b = setmetatable({}, mt)

print(a:greet())  -- hi
mt.__index.greet = function() return "hello" end
print(b:greet())  -- hello(被意外修改)
```

**陷阱**:元表是引用,共享元表的对象会受元表修改影响。如需隔离,每个对象独立元表(但内存开销大)。

### 7.7 深继承链性能问题

```lua
-- lua: 深继承链导致 O(L) 查找
local function chain(depth)
    local root = { method = function() return "root" end }
    local current = root
    for i = 1, depth do
        local child = setmetatable({}, { __index = current })
        current = child
    end
    return current
end

local obj = chain(100)
local start = os.clock()
for i = 1, 1000000 do
    local _ = obj.method  -- 每次查找需遍历 100 层
end
print(os.clock() - start)  -- 显著慢于 depth=1
```

**陷阱**:`__index` 链查找复杂度 O(L),深继承链(>10 层)严重拖慢热路径。建议继承层级 ≤ 3。

### 7.8 `__index` 表形态不递归到函数形态

```lua
-- lua: __index 为表时,该表的 __index 仍会触发(递归)
local base = setmetatable({ a = 1 }, { __index = { b = 2 } })
local derived = setmetatable({}, { __index = base })

print(derived.a)  -- 1(从 base 查到)
print(derived.b)  -- 2(从 base 的 __index 查到,递归)
-- 但若 base.__index 是函数,derived 访问 base 中不存在的键时,
-- 不会调用 base.__index 函数(因为 derived 的 __index 是 base 表)
-- 实际上会调用,因为 base[k] 触发 base 的 __index

-- 复杂场景:建议显式测试行为
```

**陷阱**:`__index` 表形态的递归行为复杂,需仔细测试。

### 7.9 `__pairs`/`__ipairs` 在 Lua 5.4 废弃

```lua
-- lua: Lua 5.4 废弃 __pairs/__ipairs,改用 __index/__len 协议
-- Lua 5.3 及以下:__pairs 生效
local t = setmetatable({}, {
    __pairs = function() return coroutine.wrap(function()
        coroutine.yield("a", 1)
        coroutine.yield("b", 2)
    end) end,
})

for k, v in pairs(t) do print(k, v) end
-- Lua 5.3:打印 a 1, b 2
-- Lua 5.4:可能不打印(__pairs 被忽略)
```

**陷阱**:跨版本代码需兼容,建议检测 `_VERSION` 并提供回退。

### 7.10 `getmetatable` 受 `__metatable` 影响

```lua
-- lua: __metatable 元方法隐藏真实元表
local secret = { __index = { hidden = true } }
local t = setmetatable({}, secret)
secret.__metatable = "protected"  -- 设置 __metatable 字段

print(getmetatable(t))  -- protected(而非真实元表)
-- setmetatable(t, {})  -- error: cannot change a protected metatable
```

**陷阱**:`__metatable` 字段存在时,`getmetatable` 返回该字段值,而非真实元表。这用于保护元表不被篡改,但也使调试困难。

## 8. 工程实践与最佳实践

### 8.1 元表设计原则

1. **单一职责**:每个元表仅服务于一种类型,避免混合不同类型的行为。
2. **共享复用**:同类对象共享同一元表,节省内存。
3. **`__index` 优先用表形态**:表形态查找快于函数形态,除非需要计算。
4. **`__metatable` 保护**:生产环境元表设置 `__metatable = false`,防止误改。
5. **避免深继承链**:继承层级 ≤ 3,超过则改用组合。

### 8.2 类系统设计模板

```lua
-- lua: 推荐的类系统模板
local function class(base)
    local cls = {}

    -- 继承
    if base then
        setmetatable(cls, { __index = base })
        cls._base = base
    end

    cls.__index = cls
    cls.__tostring = function(self)
        return "<" .. (cls.__name or "class") .. " instance>"
    end

    -- 构造函数
    function cls.new(...)
        local obj = setmetatable({}, cls)
        if obj.init then obj:init(...) end
        return obj
    end

    -- 创建子类
    function cls:extend(name)
        local sub = class(self)
        sub.__name = name
        return sub
    end

    -- 类型检查
    function cls:is(instance)
        local mt = getmetatable(instance)
        while mt do
            if mt == self then return true end
            mt = getmetatable(mt)
        end
        return false
    end

    return cls
end

-- 使用
local Animal = class()
Animal.__name = "Animal"
function Animal:init(name) self.name = name end
function Animal:speak() return self.name .. " speaks" end

local Dog = Animal:extend("Dog")
function Dog:init(name, breed)
    Animal.init(self, name)
    self.breed = breed
end
function Dog:speak() return self.name .. " barks" end

local d = Dog.new("Rex", "Labrador")
print(d:speak())  -- Rex barks
print(Dog:is(d))  -- true
print(Animal:is(d))  -- true
```

### 8.3 性能优化要点

1. **缓存元方法结果**:热路径上的元方法结果缓存到实例字段。
2. **`rawget` 绕过**:内部实现用 `rawget` 避开元方法开销。
3. **避免代理表热路径**:代理表每次访问触发元方法,热路径用直接表。
4. **元表共享**:同类对象共享元表,LuaJIT 可基于元表 specialization 优化。
5. **`__index` 表形态**:表形态查找比函数形态快约 2 倍。

### 8.4 元表与 LuaJIT

LuaJIT 对元表有特殊优化:

1. **Specialization**:JIT 编译器基于元表类型生成特化代码,避免动态分派。
2. **Trace 编译**:热点 `__index` 链被编译为线性代码,消除查找开销。
3. **限制**:深继承链(>3 层)难以 trace,回退到解释器。
4. **建议**:LuaJIT 环境下,保持元表稳定,避免运行时替换元表(破坏 specialization)。

### 8.5 元表与嵌入式场景

嵌入式 Lua(如 OpenWrt、IoT)需注意:

1. **内存开销**:每个元表占 64-128 字节,大量小对象不宜独立元表。
2. **GC 压力**:弱表增加 GC 复杂度,实时系统慎用。
3. **`__gc` 不可靠**:嵌入式 GC 时机不可控,资源清理应显式调用。
4. **简化元表**:仅保留必要元方法,减少元表体积。

### 8.6 调试技巧

1. **`getmetatable` 检查**:确认元表设置正确。
2. **`__tostring` 增强**:为类型定义 `__tostring`,改善调试体验。
3. **`__name` 标注**:Lua 5.3+ 用 `__name` 在错误信息中显示类型名。
4. **代理表日志**:`__index`/`__newindex` 记录访问,辅助调试。
5. **元表可视化**:递归打印元表链,排查继承问题。

## 9. 案例研究

### 9.1 案例:WoW 插件中的 Frame 元表

WoW 的 Frame API 通过元表暴露给 Lua:

```lua
-- lua: WoW Frame 简化模型
local FrameMeta = {
    __index = {
        Show = function(self) self._visible = true end,
        Hide = function(self) self._visible = false end,
        SetPoint = function(self, point, rel, relPoint, x, y)
            self._points = self._points or {}
            table.insert(self._points, { point, rel, relPoint, x, y })
        end,
        RegisterEvent = function(self, event)
            self._events = self._events or {}
            self._events[event] = true
        end,
    },
    __tostring = function(self) return "<Frame: " .. self._name .. ">" end,
}

local function CreateFrame(name)
    return setmetatable({
        _name = name,
        _visible = false,
    }, FrameMeta)
end

local frame = CreateFrame("MyAddonFrame")
frame:SetPoint("CENTER", nil, "CENTER", 0, 0)
frame:RegisterEvent("PLAYER_LOGIN")
frame:Show()
print(frame)  -- <Frame: MyAddonFrame>
```

### 9.2 案例:OpenResty 共享字典

OpenResty 的 `ngx.shared.DICT` 通过元表暴露 C 实现的方法:

```lua
-- lua: OpenResty shared dict 简化模型
local SharedDict = {
    __index = {
        get = function(self, key) return self._data[key] end,
        set = function(self, key, value) self._data[key] = value; return true end,
        add = function(self, key, value)
            if self._data[key] ~= nil then return false, "exists" end
            self._data[key] = value
            return true
        end,
        incr = function(self, key, delta)
            local v = self._data[key] or 0
            v = v + delta
            self._data[key] = v
            return v
        end,
    },
}

local function createSharedDict()
    return setmetatable({ _data = {} }, SharedDict)
end

local dict = createSharedDict()
dict:set("count", 10)
print(dict:incr("count", 5))  -- 15
```

### 9.3 案例:Neovim API 封装

Neovim 的 Lua API 通过元表封装 `vim.api` 调用:

```lua
-- lua: Neovim buffer 封装
local Buffer = {}
Buffer.__index = Buffer

function Buffer.new(bufnr)
    return setmetatable({ _nr = bufnr or 0 }, Buffer)
end

function Buffer:getLines(start, end_, strict)
    return vim.api.nvim_buf_get_lines(self._nr, start or 0, end_ or -1, strict or false)
end

function Buffer:setLines(lines, start, end_)
    vim.api.nvim_buf_set_lines(self._nr, start or 0, end_ or -1, false, lines)
end

function Buffer:lineCount()
    return vim.api.nvim_buf_line_count(self._nr)
end

-- 使用
local buf = Buffer.new(0)  -- 当前 buffer
local lines = buf:getLines()
print(buf:lineCount())
```

### 9.4 案例:Redis Lua 脚本中的元表

Redis EVAL 环境限制 `require`,但元表可用:

```lua
-- lua: Redis 脚本中的元表使用
-- 注意:Redis EVAL 无 require,无 setmetatable 限制

local function keyValueList(t)
    local result = {}
    for k, v in pairs(t) do
        table.insert(result, k)
        table.insert(result, tostring(v))
    end
    return result
end

-- 使用元表实现"分数"类型
local Score = {
    __index = {},
    __tostring = function(s) return "Score(" .. s.value .. ")" end,
    __lt = function(a, b) return a.value < b.value end,
}
Score.__index.add = function(self, delta) self.value = self.value + delta end

local s = setmetatable({ value = 100 }, Score)
s:add(50)
-- 在 Redis 中可调用 redis.call("HSET", KEYS[1], "score", s.value)
```

### 9.5 案例:游戏 ECS 实体系统

ECS(Entity-Component-System)架构使用元表实现组件查找:

```lua
-- lua: ECS 简化实现
local Entity = {}
Entity.__index = Entity

function Entity.new(id)
    return setmetatable({
        id = id,
        components = {},
    }, Entity)
end

-- __index 函数形态:按组件类型惰性查找
Entity.__index = function(t, k)
    -- 先查实例字段
    local v = rawget(t, k)
    if v ~= nil then return v end
    -- 再查 Entity 方法
    v = rawget(Entity, k)
    if v ~= nil then return v end
    -- 最后查组件(以组件名为键)
    return rawget(t, "components")[k]
end

function Entity:addComponent(name, data)
    self.components[name] = data
end

function Entity:removeComponent(name)
    self.components[name] = nil
end

-- 使用
local e = Entity.new(1)
e:addComponent("Position", { x = 0, y = 0 })
e:addComponent("Health", { hp = 100, max = 100 })
print(e.Position.x)  -- 0(通过 __index 查到 components.Position)
e.Position.x = 10    -- 直接修改组件
print(e.Position.x)  -- 10
```

### 9.6 案例:Luau 类型系统与元表

Luau 在 Lua 5.1 基础上增加渐进式类型系统:

```lua
-- luau: 类型注解与元表结合
type Vector2 = {
    x: number,
    y: number,
}

local Vector = {}
Vector.__index = Vector

function Vector.new(x: number, y: number): Vector2
    return setmetatable({ x = x, y = y } :: any, Vector :: any) :: any
end

function Vector.__add(a: Vector2, b: Vector2): Vector2
    return Vector.new(a.x + b.x, a.y + b.y) :: any
end

-- Luau 会基于元表推断运算符类型
local v1 = Vector.new(1, 2)
local v2 = Vector.new(3, 4)
local v3 = v1 + v2  -- Luau 推断 v3: Vector2
```

### 9.7 案例:ORM 字段定义

```lua
-- lua: 简化 ORM,用元表定义模型字段
local Field = {}
Field.__index = Field

function Field.new(type_, opts)
    opts = opts or {}
    return setmetatable({
        type = type_,
        primary = opts.primary or false,
        nullable = opts.nullable or false,
        default = opts.default,
    }, Field)
end

function Field:validate(value)
    if value == nil then
        if not self.nullable then return false, "required" end
        return true, self.default
    end
    if type(value) ~= self.type then
        return false, "expected " .. self.type .. ", got " .. type(value)
    end
    return true, value
end

local Model = {}
Model.__index = Model

function Model.define(name, schema)
    local cls = setmetatable({ _name = name, _schema = schema }, Model)
    cls.__index = cls
    return cls
end

function Model.new(model, data)
    local obj = setmetatable({}, model)
    for field, def in pairs(model._schema) do
        local ok, val = def:validate(data[field])
        if not ok then error(field .. ": " .. val, 2) end
        obj[field] = val
    end
    return obj
end

-- 使用
local User = Model.define("User", {
    id = Field.new("number", { primary = true }),
    name = Field.new("string"),
    age = Field.new("number", { nullable = true, default = 0 }),
})

local u = User.new({ id = 1, name = "Alice" })
print(u.id, u.name, u.age)  -- 1, Alice, 0
-- User.new({ name = "Bob" })  -- error: id: required
```

### 9.8 案例:Promise/Future 实现

```lua
-- lua: 简化 Promise,用元表实现链式调用
local Promise = {}
Promise.__index = Promise

function Promise.new(executor)
    local self = setmetatable({
        _state = "pending",
        _value = nil,
        _callbacks = {},
    }, Promise)

    local function resolve(value)
        if self._state ~= "pending" then return end
        self._state = "fulfilled"
        self._value = value
        for _, cb in ipairs(self._callbacks) do cb(value) end
    end

    local function reject(err)
        if self._state ~= "pending" then return end
        self._state = "rejected"
        self._value = err
    end

    executor(resolve, reject)
    return self
end

function Promise:then_(onFulfilled)
    local Promise2 = Promise
    return Promise2.new(function(resolve, _)
        if self._state == "fulfilled" then
            resolve(onFulfilled(self._value))
        else
            table.insert(self._callbacks, function(v)
                resolve(onFulfilled(v))
            end)
        end
    end)
end

-- 使用
local p = Promise.new(function(resolve, _)
    setTimeout(function() resolve(42) end, 1000)  -- 假设有 setTimeout
end)

p:then_(function(v) print("got " .. v) end)
```

## 10. 习题与思考题

### 10.1 基础题

1. **概念题**:解释 `__index` 元方法的表形态与函数形态的区别,以及各自的适用场景。

2. **代码题**:实现一个 `Set` 类型,支持 `+`(并集)、`*`(交集)、`-`(差集)、`#`(元素数)、`==`(集合相等)运算符。

3. **代码题**:实现一个 `Matrix` 类型,支持矩阵加法、乘法、转置、行列式。

4. **分析题**:分析以下代码的输出,解释原因:

```lua
local mt = { __index = { x = 10 } }
local a = setmetatable({}, mt)
local b = setmetatable({}, mt)
mt.__index.x = 20
print(a.x, b.x)
```

5. **代码题**:实现一个 `lazy` 函数,接收一个工厂函数,返回一个代理表,首次访问任何键时调用工厂函数初始化真实表,后续访问直接查询。

### 10.2 进阶题

6. **设计题**:设计一个完整的类系统,支持:
   - 构造函数与 `init` 方法
   - 单继承与 `super` 调用
   - 抽象方法(未实现时调用报错)
   - 类型检查(`is_a` 方法)
   - `tostring` 支持

7. **实现题**:实现一个 `Observable` 工具,将普通表转为响应式代理,支持:
   - `observe(key, callback)`:监听字段变化
   - `unobserve(key, callback)`:取消监听
   - 批量更新:`batch(fn)`,在 fn 内的多次修改仅触发一次回调

8. **分析题**:分析 Lua 5.4 废弃 `__pairs`/`__ipairs` 的设计动机,以及新的 `__index`/`__len` 协议如何替代。

9. **代码题**:实现一个 `WeakMap`,键为表(弱引用),值为任意(强引用)。要求:
   - `set(key, value)`
   - `get(key)`
   - `has(key)`
   - `delete(key)`
   - 键被 GC 回收后自动清除

10. **设计题**:设计一个 `Schema` 系统,支持:
    - 字段类型声明
    - 默认值
    - 验证函数
    - 必填字段
    - 嵌套 schema
    - 序列化/反序列化

### 10.3 思考题

11. **开放题**:Lua 元表机制相比 JavaScript 原型链、Python dunder、C++ 运算符重载,在设计哲学上有何根本差异?这些差异如何影响代码风格与可维护性?

12. **性能题**:在 LuaJIT 环境下,以下两种类实现哪个性能更好?为什么?
    - 实现 A:每个对象独立元表,元表 `__index` 指向类
    - 实现 B:所有对象共享同一元表,元表 `__index` 指向类

13. **演化题**:Lua 5.0-5.5 中元表机制的演化趋势是什么?从 `tag method` 到 `__pairs` 废弃,反映了哪些设计取舍?

14. **应用题**:在 ECS(Entity-Component-System)架构中,如何利用元表实现高效的组件查找?讨论不同方案的性能权衡。

15. **批判题**:Lua 元表机制不支持访问控制(私有/保护),这是设计缺陷还是刻意选择?对大型项目有何影响?

## 11. 参考文献

### 11.1 官方文档

1. Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes. *Lua 5.4 Reference Manual*. Lua.org, 2020. https://www.lua.org/manual/5.4/

2. Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes. *Lua 5.1 Reference Manual*. Lua.org, 2006. https://www.lua.org/manual/5.1/

3. *The Evolution of Lua*. Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes. HOPL III, 2007. https://www.lua.org/doc/hopl.pdf

### 11.2 学术论文

4. Roberto Ierusalimschy. *Programming in Lua*. 4th edition. Lua.org, 2016.

5. *Lua: an Extensible Embedded Language*. Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes. Dr. Dobb's Journal, 1996.

6. *The Implementation of Lua 5.0*. Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes. JUCS, 2005. https://www.lua.org/doc/jucs2005.pdf

### 11.3 标准与规范

7. *Lua 5.4 Source Code: ltable.c*. 表实现源码,https://www.lua.org/source/5.4/ltable.c.html

8. *Lua 5.4 Source Code: ltm.c*. 元方法实现源码,https://www.lua.org/source/5.4/ltm.c.html

### 11.4 社区资源

9. *Lua Users Wiki: Metamethods Tutorial*. http://lua-users.org/wiki/MetamethodsTutorial

10. *Lua Users Wiki: Metatables Tutorial*. http://lua-users.org/wiki/MetatablesTutorial

11. *LuaJIT FFI Documentation*. Mike Pall. https://luajit.org/ext_ffi.html

12. *Luau Type Checking*. Roblox. https://luau-lang.org/typecheck

### 11.5 对比研究

13. *ECMAScript 2024 Specification: Ordinary Object Internal Methods*. ECMA International. https://tc39.es/ecma262/

14. *Python Data Model*. Python Software Foundation. https://docs.python.org/3/reference/datamodel.html

15. *C++ Operator Overloading*. ISO/IEC 14882:2020.

## 12. 延伸阅读

### 12.1 进阶主题

- **Lua 内存管理**:阅读 lgc.c 理解弱表与 `__gc` 的 GC 协作机制。
- **LuaJIT trace 编译**:理解 JIT 如何对元方法进行 specialization。
- **Luau 类型系统**:学习渐进式类型系统如何与动态元表结合。
- **OpenResty cosocket**:元表如何封装 C 协程 socket。
- **Neovim Lua API**:元表如何桥接 Vim 内部数据结构。

### 12.2 相关模块

- `lua/函数与闭包`:闭包是实现 `__index` 函数形态的基础。
- `lua/面向对象编程`:基于元表的类系统深度实践。
- `lua/环境与全局变量管理`:`_G` 表与元表的交互。
- `lua/协程详解`:`__call` 元方法与协程的结合。
- `lua/弱表`:弱引用的完整语义与 GC 交互。
- `lua/元表与面向对象编程`:OOP 专题深入。

### 12.3 实践项目

1. **实现一个完整的 ORM**:用元表定义模型、字段、关系,支持 CRUD 与查询构造。
2. **构建响应式框架**:基于代理表实现 Vue/MobX 风格的响应式系统。
3. **设计 DSL**:利用 `__call` 与 `__index` 构建声明式 DSL,如 HTML 生成器、配置文件解析器。
4. **实现 Promise/A+**:用元表构建链式 Promise,支持 async/await 风格。
5. **开发 ECS 框架**:用元表实现高效组件查找与系统调度。

### 12.4 跨语言对比实践

- 用 JavaScript Proxy 重新实现本文的响应式系统,对比性能与表达力。
- 用 Python `__getattr__` 实现类似 `__index` 的代理,对比错误处理。
- 用 Rust trait 实现运算符重载,对比静态安全与动态灵活。
- 用 Ruby `method_missing` 构建 DSL,对比 Lua `__index` 的设计差异。

### 12.5 演进趋势

- **Luau 类型系统**:渐进式类型与元表的融合,未来可能引入更精细的元方法类型注解。
- **Lua 5.5+ 优化**:元方法查找性能优化,`__name` 在错误信息中的广泛使用。
- **LuaJIT 3.0**(规划中):可能引入更激进的元方法 specialization。
- **跨语言互操作**:Lua 元表与 WebAssembly、Rust 的互操作模式日趋成熟。
