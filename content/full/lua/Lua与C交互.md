---
order: 55
title: Lua 与 C 交互
module: lua
category: Lua
difficulty: advanced
description: 'Lua C API 设计哲学、栈模型、userdata 生命周期、元表绑定、Continuation、引用机制与跨语言性能优化工程实践'
author: fanquanpp
updated: '2026-07-21'
related:
  - lua/环境与模块
  - lua/字符串模式匹配
  - lua/Lua即时编译器
  - lua/标准库详解
  - lua/概述与环境配置
prerequisites:
  - lua/概述与环境配置
  - lua/标准库详解
---

## 1. 学习目标

本节依据 Bloom 分类法（Bloom's Taxonomy）按认知层级组织学习目标，学习者完成本章后应具备以下能力。

### 1.1 记忆层（Remember）

- 能够准确复述 Lua C API 的设计目标（嵌入式、双向交互、栈式数据交换）与首次发布时间（Lua 1.1，1993）。
- 能够默写出 Lua C API 的核心头文件三角：`lua.h`（公共 API）、`lauxlib.h`（辅助库）、`lualib.h`（标准库）。
- 能够列出栈操作的索引规则：正索引从底 1 开始，负索引从顶 -1 开始，绝对索引通过 `lua_absindex` 转换。
- 能够写出 `lua_CFunction` 签名 `typedef int (*lua_CFunction)(lua_State *L)`、`luaL_Reg` 结构、`luaopen_<mod>` 入口签名。
- 能够列出八大基本类型常量：`LUA_TNIL`、`LUA_TBOOLEAN`、`LUA_TLIGHTUSERDATA`、`LUA_TNUMBER`、`LUA_TSTRING`、`LUA_TTABLE`、`LUA_TFUNCTION`、`LUA_TUSERDATA`、`LUA_TTHREAD`。

### 1.2 理解层（Understand）

- 能够解释 Lua 虚拟栈（Virtual Stack）作为 C/Lua 数据交换唯一通道的设计动机：避免 C 与 Lua 内存模型直接耦合、统一类型边界、支持可重入。
- 能够阐述完整 userdata（Full Userdata）与轻量 userdata（Light Userdata）的差异：内存归属、GC 管理、元表支持、`__gc` 元方法触发条件。
- 能够说明 `luaL_ref` / `luaL_unref` 引用机制的实现：注册表（Registry，`LUA_REGISTRYINDEX`）中的整数键映射表，避免跨 C 边界持有 Lua 值导致 GC 误回收。
- 能够描述 `lua_pcall` 与 `lua_call` 的区别：受保护调用如何通过 `setjmp`/`longjmp` 实现 C 层错误恢复，以及 Lua 5.3+ 引入的 Continuation（`lua_pcallk`）为何可避免_yield 跨 C 边界限制。
- 能够解释 `lua_State` 的内存模型：每个状态机独立 GC、独立字符串池、独立栈，多状态机并发需通过协程或独立 `lua_State` 实现。

### 1.3 应用层（Apply）

- 能够使用 `luaL_check*` / `luaL_opt*` 系列函数安全地获取参数并触发 Lua 层错误。
- 能够编写 `luaopen_<mod>` 入口，通过 `luaL_newlib` 注册函数列表并返回模块表。
- 能够使用 `lua_newuserdata` + `luaL_setmetatable` 创建带元表绑定的 Full Userdata，并通过 `__gc` 元方法管理资源释放。
- 能够使用 `luaL_requiref` 在 Lua 5.2+ 中正确预加载 C 模块到 `package.loaded`，兼容 `require` 语义。
- 能够使用 `luaL_Buffer` / `luaL_pushresult` 高效拼接大量字符串，避免中间字符串爆炸。

### 1.4 分析层（Analyze）

- 能够分析给定 C 模块的栈平衡性：每个代码路径上压栈数与弹栈数是否一致、`return N` 是否与栈顶留下的 N 个值匹配。
- 能够分析多返回值、可变参数、命名参数在 C 层的映射方式，并指出 `lua_gettop` 与返回值数量的关系。
- 能够分析 `lua_pcallk` 的 Continuation 机制：为何在协程 `yield` 跨 C 边界时传统 `lua_pcall` 会失效，以及 `k` 函数如何接续被挂起的调用。
- 能够分析 Userdata 的 GC 时机：何时 `__gc` 会被调用、循环引用是否会导致内存泄漏、弱引用表如何作用于 Userdata。

### 1.5 评估层（Evaluate）

- 能够评估在特定场景下是否应使用 Lua C API 而非 LuaJIT FFI：基于宿主 Lua 版本、平台 ABI 稳定性、库分发方式、性能要求综合判断。
- 能够评估 `lua_pcall` 错误处理与 C 层 `setjmp`/`longjmp` 的资源释放风险：哪些资源需要 `__gc` 兜底，哪些需要在 pcall 前用 `luaL_ref` 暂存。
- 能够评估 C 模块的 ABI 兼容性：跨 Lua 5.1 / 5.2 / 5.3 / 5.4 / LuaJIT 的源码与二进制兼容策略，以及 `LUA_COMPAT_*` 宏的作用。

### 1.6 创造层（Create）

- 能够设计一个完整的 C 扩展模块：类型注册、错误处理、内存管理、线程安全、版本兼容层。
- 能够设计 Lua 与 C++ 的桥接层：RAII 资源管理、异常到 Lua 错误的转换、STL 容器与 Lua Table 的双向转换。
- 能够设计可跨 Lua 5.1/5.2/5.3/5.4 与 LuaJIT 兼容的 C 模块代码，使用条件编译宏屏蔽版本差异。

---

## 2. 历史动机与背景

### 2.1 嵌入式设计目标的诞生

Lua 自 1993 年诞生之初就被设计为"可嵌入的扩展语言（Embeddable Extension Language）"。Roberto Ierusalimschy 等人在 TECGraf 实验室开发 Lua 1.0 时，其前置项目 SOL 与 DEL 已暴露出"宿主程序与脚本语言缺乏统一交互协议"的痛点：

- **SOL**：作为配置语言，宿主程序需通过自定义字符串解析获取 SOL 表达的值，缺乏运行时双向调用。
- **DEL**：作为数据录入语言，宿主程序需通过共享全局变量与 DEL 通信，难以扩展新数据类型。

Lua 1.0 的核心创新之一就是引入 **C API**：宿主程序通过一组 C 函数操作 Lua 状态机，Lua 通过同一组 API 反向调用 C 函数。这种对称的双向交互模型使 Lua 成为真正可嵌入的脚本语言。

### 2.2 虚拟栈的设计动机

Lua C API 选择"虚拟栈"作为 C 与 Lua 之间唯一的数据通道，这一设计在 1993 年看来并不显然。同期其他嵌入式语言（如 Tcl、Perl 嵌入式 API）多采用直接指针或共享内存的方式。Lua 选择虚拟栈的动机：

1. **GC 安全**：Lua 的垃圾回收器管理所有 Lua 对象的生命周期，C 代码不应直接持有 Lua 对象指针。栈将"引用"显式化，C 代码通过栈索引访问对象，GC 可跟踪栈上引用。
2. **类型隔离**：Lua 是动态类型，C 是静态类型。栈作为中间层统一类型边界，避免 C 代码直接处理 Lua 的 Tagged Value 结构。
3. **可重入性**：每个 `lua_State` 拥有独立栈，多个状态机可并存且互不干扰。C 函数通过参数 `L` 访问当前栈，无需全局状态。
4. **跨平台 ABI 稳定**：栈 API 是 C 函数签名，跨编译器、跨平台 ABI 稳定，而直接访问 Lua 内部结构则受 struct 布局影响。

Roberto Ierusalimschy 在《The Evolution of Lua》中写道：

> "栈式 API 是 Lua 1.0 最重要的设计决策之一。它将 C 与 Lua 的耦合限制在一组窄而稳定的接口上，使 Lua 可以在保持内部实现自由演进的同时，维持 C 扩展的二进制兼容性。"

### 2.3 API 演进史

Lua C API 的演进遵循"保守扩展、谨慎破坏"原则：

| 版本 | 关键 API 变化 | 设计动机 |
| :--- | :--- | :--- |
| Lua 1.1（1993） | 引入 `lua_pushnumber`、`lua_pop`、`lua_call` 等基础栈操作 | 建立虚拟栈交互模型 |
| Lua 2.0（1994） | 引入元表（Metatable）支持，新增 `lua_setmetatable` | 支持运算符重载与 OOP |
| Lua 3.0（1997） | 引入 `lua_State` 多状态机支持，API 全部接受 `L` 参数 | 嵌入式多实例场景 |
| Lua 4.0（2000） | 引入 `lua_open`（后改名 `luaL_newstate`）、`luaL_register` | 标准化库注册流程 |
| Lua 5.0（2003） | 寄存器式 VM、`luaL_newlib`、`lua_rawgeti` 重构 | 性能优化与 API 简化 |
| Lua 5.1（2006） | `lua_pcall` 增加 `msgh` 参数、引入 `luaL_ref` 引用机制 | 增强错误处理与引用跟踪 |
| Lua 5.2（2011） | 移除 `luaL_register`、引入 `luaL_requiref`、`lua_rawgetp`/`lua_rawsetp` | 模块系统语义化、指针键支持 |
| Lua 5.3（2015） | `lua_pcallk` / `lua_callk` Continuation、整数类型分离、`luaL_tolstring` | 协程跨 C 边界、整数语义 |
| Lua 5.4（2020） | `lua_resetthread`、`lua_closeslot`、To-Be-Closed 变量、`luaL_addgsub` | 资源管理增强 |

### 2.4 与其他嵌入式脚本 API 的对比

| 语言 | 嵌入 API 模型 | 栈式 | 类型边界 | GC 集成 |
| :--- | :--- | :--- | :--- | :--- |
| Lua | 虚拟栈 | 是 | 显式 push/check | 栈跟踪引用 |
| Python (CPython) | 引用计数 + Py_INCREF | 否 | PyObject* 直接持有 | 引用计数 + 周期检测 |
| JavaScript (V8) | Handle Scope | 否（局部句柄） | Local\<T\> 模板 | Handle Scope 批量回收 |
| Tcl | Tcl_Obj 引用计数 | 否 | Tcl_Obj* 直接持有 | 引用计数 |
| Scheme (Guile) | SCM 类型宏 | 否 | SCM 即 long | GC + GC roots 注册 |
| Ruby (MRI) | VALUE 类型 | 否 | VALUE 即 unsigned long | 标记-清除 + C 扩展注册 |

Lua 的栈式 API 在性能上略逊于直接指针访问（多一层 push/pop 开销），但在 GC 安全性、ABI 稳定性、跨版本兼容性上具有显著优势。这正是 Lua 长期作为游戏、网关、嵌入式领域首选脚本语言的关键原因之一。

### 2.5 LuaJIT FFI 的冲击与 C API 的定位

2011 年 LuaJIT 2.0 引入 FFI（Foreign Function Interface），允许 Lua 直接声明并调用 C 函数，无需编写 C 代码。FFI 在性能上比 C API 高 4-10 倍（约 25-65ns vs 200-500ns/调用），且开发效率远高于手写 C 模块。

然而 C API 在以下场景仍不可替代：

- **宿主 Lua 非 LuaJIT**：PUC-Rio Lua 5.2/5.3/5.4 不支持 FFI。
- **资源受限环境**：嵌入式设备无法承受 LuaJIT 的 JIT 编译内存开销。
- **细粒度资源管理**：Userdata + `__gc` 提供比 FFI cdata 更精确的生命周期控制。
- **宿主嵌入**：游戏引擎、Web 服务器嵌入 Lua 时，宿主程序通过 C API 调用 Lua，而非 Lua 调用 C。

因此，C API 与 FFI 在现代 Lua 生态中长期并存，各自服务不同场景。

---

## 3. 形式化定义

本节给出 Lua C API 核心概念的形式化定义，包括栈模型、引用机制、Userdata 生命周期、错误传播。

### 3.1 虚拟栈的形式化定义

设 `lua_State *L` 为 Lua 状态机，每个状态机拥有一个虚拟栈 $\text{Stack}_L$。栈是 Lua 值的有序序列：

$$
\text{Stack}_L = (v_1, v_2, \dots, v_n), \quad v_i \in \mathcal{V}
$$

其中 $n = \text{lua\_gettop}(L)$ 为栈大小。栈索引 $i$ 的访问规则：

$$
\text{access}(i) = \begin{cases}
v_i & \text{if } 1 \leq i \leq n \text{ (正索引)} \\
v_{n + i + 1} & \text{if } -n - 1 < i \leq -1 \text{ (负索引)} \\
\text{panic} & \text{otherwise}
\end{cases}
$$

绝对索引转换：$\text{lua\_absindex}(L, i) = i$ 若 $i > 0$，否则 $= n + i + 1$。

栈操作的语义：

- $\text{push}(v): \text{Stack}_L \to \text{Stack}_L \cdot v$（追加到栈顶）
- $\text{pop}(k): \text{Stack}_L \to \text{Stack}_L[1..n-k]$（移除栈顶 $k$ 个元素）
- $\text{settop}(n): \text{Stack}_L \to \text{Stack}_L[1..n]$（调整栈大小，新增位置填 nil）

### 3.2 类型判断的形式化定义

C API 提供类型查询函数 $\text{lua\_type}: \text{Stack}_L \times \text{Index} \to \Sigma$，其中 $\Sigma$ 为类型常量集合：

$$
\text{lua\_type}(L, i) = \begin{cases}
\text{LUA\_TNIL} & \text{if } v_{\text{abs}(i)} = \text{nil} \\
\text{LUA\_TBOOLEAN} & \text{if } v_{\text{abs}(i)} \in \mathcal{B} \\
\text{LUA\_TLIGHTUSERDATA} & \text{if } v_{\text{abs}(i)} \in \mathcal{U}_{\text{light}} \\
\text{LUA\_TNUMBER} & \text{if } v_{\text{abs}(i)} \in \mathcal{N} \\
\text{LUA\_TSTRING} & \text{if } v_{\text{abs}(i)} \in \mathcal{S} \\
\text{LUA\_TTABLE} & \text{if } v_{\text{abs}(i)} \in \mathcal{T} \\
\text{LUA\_TFUNCTION} & \text{if } v_{\text{abs}(i)} \in \mathcal{F} \\
\text{LUA\_TUSERDATA} & \text{if } v_{\text{abs}(i)} \in \mathcal{U}_{\text{full}} \\
\text{LUA\_TTHREAD} & \text{if } v_{\text{abs}(i)} \in \mathcal{C}
\end{cases}
$$

类型判断的"快速"版本 $\text{lua\_is*}$ 系列函数基于此实现，但允许数字到字符串的隐式转换检查。

### 3.3 C 函数调用的形式化定义

Lua 调用 C 函数的语义可形式化为：

$$
\text{Call}_{\text{C}}(f, (a_1, \dots, a_k)) \to (r_1, \dots, r_m)
$$

执行流程：

1. Lua 调用 C 函数 $f$ 前，将参数 $(a_1, \dots, a_k)$ 依次压入新栈帧的栈底，$\text{lua\_gettop}(L) = k$。
2. 调用 $f(L)$，$f$ 通过 `luaL_check*` 系列函数读取参数，处理后将 $m$ 个返回值压栈。
3. $f$ 返回 $m$，Lua 从栈顶取 $m$ 个值作为返回值，销毁栈帧。

C 函数契约：

$$
\text{Contract}: f(L) = n \implies \text{lua\_gettop}(L)_{\text{exit}} - \text{lua\_gettop}(L)_{\text{entry}} = n
$$

即函数返回时栈顶新增的元素数必须等于返回值数。违反此契约将导致栈泄漏或 Lua 内部状态损坏。

### 3.4 引用机制的形式化定义

`luaL_ref` 提供一种将 Lua 值"长期持有"的机制，避免跨 C 边界传递栈索引（栈索引在函数返回后失效）。

注册表（Registry）是 Lua 状态机中的一个特殊表，伪索引为 `LUA_REGISTRYINDEX`。`luaL_ref` 操作：

$$
\text{luaL\_ref}(L, t) = \begin{cases}
r \in \mathbb{Z}^+ & \text{将栈顶值存入 } \text{Registry}[t][r] \\
\text{LUA\_REFNIL} & \text{若栈顶值为 nil}
\end{cases}
$$

`luaL_unref` 释放引用：

$$
\text{luaL\_unref}(L, t, r): \text{Registry}[t][r] \leftarrow \text{nil}, \quad r \text{ 加入空闲链表}
$$

引用 $r$ 是一个整数句柄，C 代码可安全长期持有，并通过 `lua_rawgeti(L, t, r)` 取回对应 Lua 值。

### 3.5 Userdata 的形式化定义

Full Userdata 是 Lua 中表示 C 内存对象的类型。形式化地：

$$
\text{userdata} = (\text{ptr}, \text{size}, \text{metatable}, \text{env})
$$

- $\text{ptr}$：指向 C 内存块的指针，由 `lua_newuserdata(L, size)` 分配。
- $\text{size}$：内存块大小（字节）。
- $\text{metatable}$：元表，包含 `__gc`、`__index` 等元方法。
- $\text{env}$：用户值环境表（Lua 5.3+ 引入 `lua_setuservalue`，5.4 支持多个用户值）。

生命周期：

1. **创建**：`lua_newuserdata(L, size)` 分配内存，压栈 userdata。
2. **元表绑定**：`luaL_setmetatable(L, name)` 将注册表中的元表绑定到 userdata。
3. **使用**：`luaL_checkudata(L, arg, name)` 检查并取回指针，带类型校验。
4. **回收**：userdata 被 GC 标记为不可达时，Lua 调用其元表的 `__gc` 元方法（若存在）。

`__gc` 调用顺序保证：在 Lua 5.4 中，所有 `__gc` 在对象被回收前调用一次，且调用顺序遵循"后绑定先调用"（LIFO）规则。

### 3.6 错误传播的形式化定义

Lua 错误通过 `lua_error(L)` 抛出，机制为 `longjmp` 跳转到最近的 `lua_pcall` 保护点。形式化地：

$$
\text{Error}(v): \text{Stack}_L \leftarrow v, \quad \text{longjmp}(\text{pcall\_jmp\_buf})
$$

受保护调用 `lua_pcall` 的语义：

$$
\text{lua\_pcall}(L, nargs, nresults, msgh) = \begin{cases}
\text{LUA\_OK} & \text{正常返回，栈顶有 } nresults \text{ 个值} \\
\text{LUA\_ERRRUN} & \text{运行时错误，栈顶是错误对象} \\
\text{LUA\_ERRMEM} & \text{内存分配失败} \\
\text{LUA\_ERRERR} & \text{错误处理函数自身出错}
\end{cases}
$$

`msgh` 参数（消息处理器）的语义：若 `msgh != 0`，则错误发生时先调用 `Registry[msgh]` 函数，将其返回值作为最终错误对象。常用于添加调用栈 traceback（`debug.traceback`）。

### 3.7 Continuation 的形式化定义

Lua 5.3 引入 `lua_pcallk` / `lua_callk`，支持协程 `yield` 跨 C 函数边界。形式化地：

$$
\text{lua\_pcallk}(L, nargs, nresults, msgh, ctx, k)
$$

其中 $k: \text{Continuation}$ 是 C 函数指针，$ctx: \text{ptrdiff\_t}$ 是上下文 Cookie。当被调用的 Lua 函数 `yield` 时：

1. Lua 挂起当前协程，保存 C 调用栈的"逻辑状态"到 $ctx$。
2. 协程恢复时，Lua 不再回到原 C 调用栈（已 `longjmp` 退出），而是调用 $k(L, status, ctx)$ 接续执行。

Continuation 机制的限制：$k$ 必须能从 $ctx$ 重建所有需要的局部状态，原 C 函数的局部变量已丢失。

---

## 4. 理论推导

### 4.1 栈操作的复杂度分析

设栈大小为 $n$，常见栈操作的时间复杂度：

| 操作 | 复杂度 | 推导 |
| :--- | :--- | :--- |
| `lua_pushnumber` | $O(1)$ | 直接写入栈顶 + size++ |
| `lua_pop(k)` | $O(1)$ | size -= k（GC 延迟回收） |
| `lua_gettop` | $O(1)$ | 返回 size 字段 |
| `lua_gettable` | $O(\log n)$ 平均 | 哈希表查找 |
| `lua_rawgeti` | $O(1)$ | 数组部分直接索引 |
| `lua_settable` | $O(\log n)$ 平均 | 哈希表插入 |
| `lua_createtable(narr, nrec)` | $O(narr + nrec)$ | 预分配数组与哈希部分 |
| `lua_concat(k)` | $O(\sum |s_i|)$ | 拼接 $k$ 个字符串，总长度 |

**推导示例：`lua_gettable` 的 $O(\log n)$ 复杂度**

Lua 表的哈希部分使用开链法 + 哈希桶。设表有 $n$ 个键，桶数 $B \approx 2^{\lceil \log_2 n \rceil}$。查找需要计算哈希（$O(|key|)$，对短键为 $O(1)$），然后遍历桶链。负载因子 $\alpha = n/B \leq 1$，期望链长为 $O(1)$。但最坏情况（哈希冲突）下退化为 $O(n)$。

对整数键 `lua_rawgeti`，若索引在数组部分范围内（$1 \leq i \leq \text{narray}$），直接 `arr[i-1]` 访问，复杂度严格 $O(1)$。

### 4.2 Userdata GC 的成本模型

设 $U$ 为某类型的 Userdata 集合，$|U| = N$，每个 Userdata 大小为 $s$ 字节。GC 标记阶段成本：

$$
T_{\text{mark}} = c_1 \cdot N + c_2 \cdot \sum_{u \in U} s_u
$$

其中 $c_1$ 为标记一个对象的开销（约 100ns），$c_2$ 为扫描 Userdata 内部指针的开销（若 Userdata 不含 Lua 对象引用，$c_2 \approx 0$）。

`__gc` 元方法调用成本：

$$
T_{\text{gc-call}} = c_3 \cdot N
$$

其中 $c_3$ 为调用一次 C 函数的开销（约 200-500ns，包括查找元方法、压栈、调用）。

**优化推导**：若 Userdata 内部仅含原始 C 数据（无 Lua 引用），可通过 `__gc` 不做任何事 + `lua_setuservalue` 管理关联 Lua 对象的方式，使标记阶段 $c_2 \approx 0$，同时 `__gc` 调用最小化。

### 4.3 引用机制的内存开销

`luaL_ref` 使用注册表中的子表，实现为整数键到值的映射。设某 C 模块持有 $N$ 个引用，则注册表子表占用：

$$
M_{\text{ref}} = N \cdot (8 + \text{sizeof}(\text{TValue})) \approx N \cdot 24 \text{ bytes}
$$

引用的整数 $r$ 在 C 层占用 8 字节（`int`），加上 Lua 表的哈希开销，每个引用总成本约 32 字节。

**对比直接持有 Userdata**：若直接在 C 全局变量中持有 `void*`，仅需 8 字节，但失去 GC 跟踪。`luaL_ref` 是"内存换安全"的典型权衡。

### 4.4 pcall 的 setjmp 开销

`lua_pcall` 通过 `setjmp`/`longjmp` 实现 C 层错误捕获。`setjmp` 调用成本：

- 首次调用（保存上下文）：约 50-200ns，保存寄存器、栈指针、信号掩码。
- `longjmp` 跳转：约 100-500ns，恢复上下文。

正常路径（无错误）开销：仅 `setjmp` 一次，约 100ns。

异常路径（错误抛出）开销：`longjmp` + 错误对象构造，约 1-10μs。

**性能建议**：热路径避免在循环内频繁 `lua_pcall`，可将循环整体置于一次 pcall 中，错误统一处理。

### 4.5 字符串内部化对 C API 的影响

Lua 字符串内部化（Interning）使相同内容的字符串在内存中唯一。C API 中：

- `lua_pushstring(L, s)`：计算 $s$ 的哈希，查内部化表。若存在则复用，否则创建新字符串并内部化。复杂度 $O(|s|)$（哈希计算）。
- `lua_pushlstring(L, s, len)`：同上但指定长度。
- `lua_tostring(L, i)`：返回内部化字符串的 `const char*` 指针，复杂度 $O(1)$。

**重要性质**：内部化字符串在 GC 期间不会被移动，因此 `lua_tostring` 返回的指针在栈未改变前有效。但一旦栈顶变化（可能触发 GC 回收字符串），指针失效。

**推导**：C 代码若需长期持有字符串，必须 `lua_pop` 前复制到 C 内存（`strdup`），或通过 `luaL_ref` 持有 Lua 字符串引用。

### 4.6 多状态机并发的可行性

Lua C API 设计支持多 `lua_State` 并存，每个状态机独立 GC、独立栈。但 Lua 不内置线程安全，跨状态机访问需外部同步。

形式化地，设线程 $T_1$ 持有 $L_1$，线程 $T_2$ 持有 $L_2$：

- $T_1$ 仅操作 $L_1$：线程安全。
- $T_2$ 仅操作 $L_2$：线程安全。
- $T_1$ 操作 $L_2$ 同时 $T_2$ 操作 $L_2$：竞争条件，需互斥锁。
- $T_1$ 将 $L_2$ 的值转移到 $L_1$：需通过 `lua_xmove(L_2, L_1, n)`，且转移期间两状态机都不能被其他线程访问。

`lua_xmove` 仅在同构状态机间有效（同版本 Lua、同指针大小），跨 Lua 版本无法使用。

---

## 5. 代码示例

本节通过多个完整可运行示例演示 Lua C API 的核心用法。所有示例基于 Lua 5.4，并标注跨版本兼容性差异。

### 5.1 最简 C 模块：数学函数绑定

**C 代码（math_ext.c）**：

```c
/* math_ext.c
 * 最简 C 扩展模块示例：导出 clamp 与 lerp 两个数学函数
 * 兼容 Lua 5.1 / 5.2 / 5.3 / 5.4 / LuaJIT
 */

#include <lua.h>
#include <lauxlib.h>

/* clamp(x, min, max): 将 x 限制在 [min, max] 区间
 * 参数：x (number), min (number), max (number)
 * 返回：clamp 后的值 (number)
 */
static int l_clamp(lua_State *L) {
    /* luaL_checknumber 在类型不符时自动抛出 Lua 错误
     * 无需 C 层手动检查与返回错误码 */
    lua_Number x = luaL_checknumber(L, 1);
    lua_Number min = luaL_checknumber(L, 2);
    lua_Number max = luaL_checknumber(L, 3);

    /* 参数合法性校验：min 必须 <= max
     * luaL_argcheck 触发 Lua 层错误，包含参数位置与提示 */
    luaL_argcheck(L, min <= max, 3, "min must be <= max");

    /* clamp 逻辑：三目运算实现 */
    lua_Number result = x < min ? min : (x > max ? max : x);
    lua_pushnumber(L, result);
    return 1;  /* 返回一个值 */
}

/* lerp(a, b, t): 线性插值 a + (b - a) * t
 * 参数：a, b, t 均为 number
 * 返回：插值结果
 */
static int l_lerp(lua_State *L) {
    lua_Number a = luaL_checknumber(L, 1);
    lua_Number b = luaL_checknumber(L, 2);
    lua_Number t = luaL_checknumber(L, 3);
    lua_pushnumber(L, a + (b - a) * t);
    return 1;
}

/* 函数注册表：每个条目是 {name, func} 对
 * 以 {NULL, NULL} 哨兵结尾 */
static const luaL_Reg math_ext_funcs[] = {
    {"clamp", l_clamp},
    {"lerp",  l_lerp},
    {NULL, NULL}
};

/* 模块入口函数：Lua 的 require("math_ext") 触发
 * 函数名必须为 luaopen_<模块名> */
int luaopen_math_ext(lua_State *L) {
    /* luaL_newlib 是 Lua 5.2+ 的宏
     * 等价于：lua_createtable + luaL_setfuncs
     * 兼容性写法见 5.6 节 */
    luaL_newlib(L, math_ext_funcs);
    return 1;  /* 返回模块表 */
}
```

**编译命令**：

```bash
# Linux / macOS
gcc -O2 -shared -fPIC -o math_ext.so math_ext.c \
    -I/usr/local/include/lua5.4 -llua5.4

# Windows (MinGW)
gcc -O2 -shared -o math_ext.dll math_ext.c \
    -I"C:\Atian\Lua\include" -L"C:\Atian\Lua" -llua54

# Windows (MSVC)
cl /O2 /LD math_ext.c /I"C:\Atian\Lua\include" \
   /link /LIBPATH:"C:\Atian\Lua" lua54.lib /OUT:math_ext.dll
```

**Lua 使用**：

```lua
-- 加载 C 模块
local math_ext = require("math_ext")

-- 调用
print(math_ext.clamp(15, 0, 10))   -- 输出: 10
print(math_ext.clamp(-5, 0, 10))   -- 输出: 0
print(math_ext.clamp(5, 0, 10))    -- 输出: 5

print(math_ext.lerp(0, 100, 0.5))  -- 输出: 50
print(math_ext.lerp(10, 20, 0.3))  -- 输出: 13

-- 错误示例
-- pcall(math_ext.clamp, 1, 10, 5)  -- 触发: arg #3: min must be <= max
```

### 5.2 Userdata 完整示例：Vec3 向量类型

```c
/* vec3.c
 * 完整 Userdata 示例：三维向量类型 Vec3
 * 演示：创建、元方法绑定、__gc、运算符重载、索引访问
 */

#include <lua.h>
#include <lauxlib.h>
#include <math.h>
#include <stdlib.h>
#include <string.h>

/* C 层向量结构 */
typedef struct {
    double x, y, z;
} Vec3;

/* 元表名：用于 luaL_checkudata 的类型校验 */
#define VEC3_METATABLE "Vec3"

/* 检查参数是否为 Vec3，返回指针
 * luaL_checkudata 会校验元表匹配，类型不符抛出错误 */
static Vec3 *vec3_check(lua_State *L, int arg) {
    return (Vec3 *)luaL_checkudata(L, arg, VEC3_METATABLE);
}

/* 创建新的 Vec3 Userdata 并压栈
 * 内部函数，供构造器与其他元方法复用 */
static Vec3 *vec3_new(lua_State *L) {
    /* lua_newuserdata 分配内存并压栈 Userdata
     * 返回指针供 C 层初始化 */
    Vec3 *v = (Vec3 *)lua_newuserdata(L, sizeof(Vec3));
    /* 绑定元表：从注册表查找 VEC3_METATABLE，设为 Userdata 的元表 */
    luaL_setmetatable(L, VEC3_METATABLE);
    return v;
}

/* 构造器：Vec3.new(x, y, z) 或 Vec3(x, y, z)
 * 默认值为 (0, 0, 0) */
static int l_vec3_new(lua_State *L) {
    double x = luaL_optnumber(L, 1, 0.0);
    double y = luaL_optnumber(L, 2, 0.0);
    double z = luaL_optnumber(L, 3, 0.0);

    Vec3 *v = vec3_new(L);
    v->x = x;
    v->y = y;
    v->z = z;
    return 1;  /* Userdata 已压栈 */
}

/* __index 元方法：支持 v.x, v.y, v.z 与 v.length, v:dot(other) */
static int l_vec3_index(lua_State *L) {
    Vec3 *v = vec3_check(L, 1);
    const char *key = luaL_checkstring(L, 2);

    /* 字段访问：x, y, z */
    if (strcmp(key, "x") == 0) {
        lua_pushnumber(L, v->x);
        return 1;
    } else if (strcmp(key, "y") == 0) {
        lua_pushnumber(L, v->y);
        return 1;
    } else if (strcmp(key, "z") == 0) {
        lua_pushnumber(L, v->z);
        return 1;
    } else if (strcmp(key, "length") == 0) {
        /* 计算向量长度 */
        lua_pushnumber(L, sqrt(v->x * v->x + v->y * v->y + v->z * v->z));
        return 1;
    }

    /* 方法查找：从方法表中获取 */
    luaL_getmetatable(L, VEC3_METATABLE);
    lua_getfield(L, -1, key);
    return 1;
}

/* __newindex 元方法：支持 v.x = ..., v.y = ..., v.z = ... */
static int l_vec3_newindex(lua_State *L) {
    Vec3 *v = vec3_check(L, 1);
    const char *key = luaL_checkstring(L, 2);
    lua_Number value = luaL_checknumber(L, 3);

    if (strcmp(key, "x") == 0) {
        v->x = value;
    } else if (strcmp(key, "y") == 0) {
        v->y = value;
    } else if (strcmp(key, "z") == 0) {
        v->z = value;
    } else {
        luaL_error(L, "Vec3 has no field '%s'", key);
    }
    return 0;
}

/* __add 元方法：v1 + v2 */
static int l_vec3_add(lua_State *L) {
    Vec3 *a = vec3_check(L, 1);
    Vec3 *b = vec3_check(L, 2);
    Vec3 *r = vec3_new(L);
    r->x = a->x + b->x;
    r->y = a->y + b->y;
    r->z = a->z + b->z;
    return 1;
}

/* __sub 元方法：v1 - v2 */
static int l_vec3_sub(lua_State *L) {
    Vec3 *a = vec3_check(L, 1);
    Vec3 *b = vec3_check(L, 2);
    Vec3 *r = vec3_new(L);
    r->x = a->x - b->x;
    r->y = a->y - b->y;
    r->z = a->z - b->z;
    return 1;
}

/* __eq 元方法：v1 == v2 */
static int l_vec3_eq(lua_State *L) {
    Vec3 *a = vec3_check(L, 1);
    Vec3 *b = vec3_check(L, 2);
    lua_pushboolean(L, a->x == b->x && a->y == b->y && a->z == b->z);
    return 1;
}

/* __tostring 元方法：tostring(v) */
static int l_vec3_tostring(lua_State *L) {
    Vec3 *v = vec3_check(L, 1);
    lua_pushfstring(L, "Vec3(%f, %f, %f)", v->x, v->y, v->z);
    return 1;
}

/* __gc 元方法：Userdata 被回收时调用
 * 此处 Vec3 仅含原始 double，无需释放资源
 * 若 Vec3 内部持有 malloc 的内存，应在此 free */
static int l_vec3_gc(lua_State *L) {
    Vec3 *v = vec3_check(L, 1);
    (void)v;  /* 避免未使用警告 */
    /* 无资源需释放 */
    return 0;
}

/* 方法：v:dot(other) 计算点积 */
static int l_vec3_dot(lua_State *L) {
    Vec3 *a = vec3_check(L, 1);
    Vec3 *b = vec3_check(L, 2);
    lua_pushnumber(L, a->x * b->x + a->y * b->y + a->z * b->z);
    return 1;
}

/* 方法：v:normalize() 返回单位向量 */
static int l_vec3_normalize(lua_State *L) {
    Vec3 *v = vec3_check(L, 1);
    double len = sqrt(v->x * v->x + v->y * v->y + v->z * v->z);
    if (len == 0.0) {
        luaL_error(L, "cannot normalize zero vector");
    }
    Vec3 *r = vec3_new(L);
    r->x = v->x / len;
    r->y = v->y / len;
    r->z = v->z / len;
    return 1;
}

/* 模块入口 */
int luaopen_vec3(lua_State *L) {
    /* 创建元表，重复创建时 luaL_newmetatable 会复用 */
    luaL_newmetatable(L, VEC3_METATABLE);

    /* 设置元表的 __index 指向自身，使方法表与元方法统一 */
    lua_pushvalue(L, -1);
    lua_setfield(L, -2, "__index");

    /* 注册元方法 */
    lua_pushcfunction(L, l_vec3_index);
    lua_setfield(L, -2, "__index");
    lua_pushcfunction(L, l_vec3_newindex);
    lua_setfield(L, -2, "__newindex");
    lua_pushcfunction(L, l_vec3_add);
    lua_setfield(L, -2, "__add");
    lua_pushcfunction(L, l_vec3_sub);
    lua_setfield(L, -2, "__sub");
    lua_pushcfunction(L, l_vec3_eq);
    lua_setfield(L, -2, "__eq");
    lua_pushcfunction(L, l_vec3_tostring);
    lua_setfield(L, -2, "__tostring");
    lua_pushcfunction(L, l_vec3_gc);
    lua_setfield(L, -2, "__gc");

    /* 注册方法（同时存于元表，供 __index 查找） */
    lua_pushcfunction(L, l_vec3_dot);
    lua_setfield(L, -2, "dot");
    lua_pushcfunction(L, l_vec3_normalize);
    lua_setfield(L, -2, "normalize");

    /* 弹出元表，栈顶为空 */
    lua_pop(L, 1);

    /* 创建模块表，注册 new 函数 */
    lua_newtable(L);
    lua_pushcfunction(L, l_vec3_new);
    lua_setfield(L, -2, "new");

    /* 设置 Vec3 表的 __call 元方法，使 Vec3(...) 等价于 Vec3.new(...) */
    lua_newtable(L);
    lua_pushcfunction(L, l_vec3_new);
    lua_setfield(L, -2, "__call");
    lua_setmetatable(L, -2);

    return 1;  /* 返回模块表 */
}
```

**Lua 使用**：

```lua
local Vec3 = require("vec3")

-- 构造
local v1 = Vec3(1, 2, 3)
local v2 = Vec3.new(4, 5, 6)

-- 运算
local v3 = v1 + v2          -- Vec3(5, 7, 9)
local v4 = v2 - v1          -- Vec3(3, 3, 3)
local dot = v1:dot(v2)      -- 32

-- 字段访问
print(v3.x, v3.y, v3.z)     -- 5  7  9
print(v3.length)            -- 长度

-- 字段赋值
v1.x = 10
print(v1.x)                 -- 10

-- 字符串化
print(v1)                   -- Vec3(10.000000, 2.000000, 3.000000)

-- 比较
local v5 = Vec3(1, 2, 3)
local v6 = Vec3(1, 2, 3)
print(v5 == v6)             -- true
```

### 5.3 错误处理与 pcall

```c
/* error_demo.c
 * 错误处理示例：演示 lua_error、luaL_error、lua_pcall 的使用
 */

#include <lua.h>
#include <lauxlib.h>
#include <stdio.h>

/* 主动抛出错误：luaL_error 内部调用 lua_error
 * 错误消息支持 printf 格式化 */
static int l_divide(lua_State *L) {
    lua_Number a = luaL_checknumber(L, 1);
    lua_Number b = luaL_checknumber(L, 2);

    if (b == 0.0) {
        /* luaL_error 会格式化消息并 longjmp 到最近的 pcall */
        luaL_error(L, "division by zero: %g / %g", a, b);
        /* 不会执行到这里 */
    }

    lua_pushnumber(L, a / b);
    return 1;
}

/* 调用 Lua 函数并捕获错误
 * 演示 lua_pcall 的使用 */
static int l_call_safe(lua_State *L) {
    /* 参数 1 必须是函数 */
    luaL_checktype(L, 1, LUA_TFUNCTION);

    /* 复制函数到栈顶，准备调用 */
    lua_pushvalue(L, 1);
    /* 压入参数 */
    lua_pushnumber(L, 42);
    lua_pushstring(L, "hello");

    /* lua_pcall(L, nargs, nresults, msgh)
     * nargs:   参数数量
     * nresults: 期望返回值数量（LUA_MULTRET 表示按实际返回）
     * msgh:    消息处理函数在注册表中的索引（0 表示无）
     */
    int status = lua_pcall(L, 2, 1, 0);

    if (status != LUA_OK) {
        /* 调用失败，栈顶是错误对象
         * 转换为字符串返回给 Lua 调用方 */
        const char *err = lua_tostring(L, -1);
        if (err == NULL) {
            err = "(non-string error object)";
        }
        /* 弹出错误对象 */
        lua_pop(L, 1);

        /* 返回 nil + 错误消息 */
        lua_pushnil(L);
        lua_pushfstring(L, "pcall failed: %s", err);
        return 2;
    }

    /* 调用成功，栈顶是返回值
     * 用 table 包裹，标记 success */
    lua_newtable(L);
    lua_pushboolean(L, 1);
    lua_setfield(L, -2, "ok");
    lua_insert(L, -2);  /* 将 table 移到返回值前 */
    lua_setfield(L, -2, "result");

    return 1;
}

/* 带消息处理器的 pcall：添加 traceback */
static int l_call_with_traceback(lua_State *L) {
    luaL_checktype(L, 1, LUA_TFUNCTION);

    /* 获取 debug.traceback 函数 */
    lua_getglobal(L, "debug");
    if (!lua_istable(L, -1)) {
        lua_pop(L, 1);
        luaL_error(L, "debug library not loaded");
    }
    lua_getfield(L, -1, "traceback");
    if (!lua_isfunction(L, -1)) {
        lua_pop(L, 2);
        luaL_error(L, "debug.traceback not found");
    }
    /* 移除 debug 表，留下 traceback 函数在栈顶 */
    lua_remove(L, -2);

    /* 此时栈顶是 traceback 函数，作为 msgh 参数
     * msgh 必须是绝对索引，因为后续压栈会改变相对索引 */
    int msgh = lua_absindex(L, -1);

    /* 压入待调用函数与参数 */
    lua_pushvalue(L, 1);
    lua_pushstring(L, "test");

    int status = lua_pcall(L, 1, 1, msgh);

    /* 弹出 traceback 函数 */
    lua_remove(L, msgh);

    if (status != LUA_OK) {
        /* 错误对象已是带 traceback 的字符串 */
        return 1;
    }

    return 1;
}

static const luaL_Reg funcs[] = {
    {"divide", l_divide},
    {"call_safe", l_call_safe},
    {"call_with_traceback", l_call_with_traceback},
    {NULL, NULL}
};

int luaopen_error_demo(lua_State *L) {
    luaL_newlib(L, funcs);
    return 1;
}
```

### 5.4 引用机制：长期持有 Lua 值

```c
/* ref_demo.c
 * 引用机制示例：C 层长期持有 Lua 函数，用于回调
 */

#include <lua.h>
#include <lauxlib.h>
#include <stdio.h>

/* C 层回调注册表：存储 Lua 函数的引用
 * 实际项目中应使用动态数组或链表 */
#define MAX_CALLBACKS 64
static int callbacks[MAX_CALLBACKS];
static int callback_count = 0;
static lua_State *g_L = NULL;  /* 简化示例，实际应避免全局状态 */

/* register_callback(fn)
 * 注册 Lua 函数为回调
 * 返回回调 ID */
static int l_register_callback(lua_State *L) {
    if (callback_count >= MAX_CALLBACKS) {
        luaL_error(L, "callback table full");
    }

    luaL_checktype(L, 1, LUA_TFUNCTION);
    g_L = L;  /* 记录 lua_State，供后续调用 */

    /* luaL_ref 将栈顶值存入注册表，返回整数引用
     * 第二个参数是注册表中的子表索引
     * LUA_REGISTRYINDEX 是注册表的伪索引 */
    int ref = luaL_ref(L, LUA_REGISTRYINDEX);
    callbacks[callback_count++] = ref;

    lua_pushinteger(L, callback_count - 1);
    return 1;
}

/* invoke_callback(id, ...)
 * 调用已注册的回调
 * 参数：id (integer), ... (任意参数)
 * 返回：回调的返回值 */
static int l_invoke_callback(lua_State *L) {
    int id = (int)luaL_checkinteger(L, 1);
    int nargs = lua_gettop(L) - 1;

    if (id < 0 || id >= callback_count) {
        luaL_error(L, "invalid callback id: %d", id);
    }
    if (callbacks[id] == LUA_REFNIL || callbacks[id] == LUA_NOREF) {
        luaL_error(L, "callback %d released", id);
    }

    /* 从注册表取出函数，压栈 */
    lua_rawgeti(L, LUA_REGISTRYINDEX, callbacks[id]);
    if (!lua_isfunction(L, -1)) {
        luaL_error(L, "callback %d is not a function", id);
    }

    /* 将参数移动到函数之后
     * 参数原本在 2..nargs+1，需要移到 2..nargs+1（函数在 nargs+2）
     * 使用 lua_insert 将函数插到参数前 */
    lua_insert(L, 2);

    /* 调用：函数在 2，参数在 3..nargs+2 */
    int status = lua_pcall(L, nargs, LUA_MULTRET, 0);
    if (status != LUA_OK) {
        const char *err = lua_tostring(L, -1);
        luaL_error(L, "callback error: %s", err);
    }

    /* 返回值的数量 = 当前栈顶 - 1（id 仍在栈底） */
    return lua_gettop(L) - 1;
}

/* release_callback(id)
 * 释放回调引用 */
static int l_release_callback(lua_State *L) {
    int id = (int)luaL_checkinteger(L, 1);
    if (id < 0 || id >= callback_count) {
        luaL_error(L, "invalid callback id: %d", id);
    }
    if (callbacks[id] != LUA_NOREF) {
        luaL_unref(L, LUA_REGISTRYINDEX, callbacks[id]);
        callbacks[id] = LUA_NOREF;
    }
    return 0;
}

static const luaL_Reg funcs[] = {
    {"register_callback", l_register_callback},
    {"invoke_callback", l_invoke_callback},
    {"release_callback", l_release_callback},
    {NULL, NULL}
};

int luaopen_ref_demo(lua_State *L) {
    /* 初始化所有引用为 NOREF */
    for (int i = 0; i < MAX_CALLBACKS; i++) {
        callbacks[i] = LUA_NOREF;
    }
    luaL_newlib(L, funcs);
    return 1;
}
```

### 5.5 luaL_Buffer：高效字符串拼接

```c
/* buffer_demo.c
 * luaL_Buffer 示例：高效拼接大量字符串
 * 避免中间字符串对象的内存爆炸
 */

#include <lua.h>
#include <lauxlib.h>
#include <string.h>

/* join(table, sep): 用 sep 连接 table 中的字符串
 * 演示 luaL_Buffer 的使用 */
static int l_join(lua_State *L) {
    luaL_checktype(L, 1, LUA_TTABLE);
    size_t sep_len;
    const char *sep = luaL_optlstring(L, 2, ",", &sep_len);

    int n = (int)luaL_len(L, 1);
    luaL_Buffer buf;

    /* luaL_buffinit 初始化缓冲区
     * 缓冲区内部使用 LUAL_BUFFERSIZE 字节栈上缓冲
     * 超过时自动切换到 Lua 字符串 */
    luaL_buffinit(L, &buf);

    for (int i = 1; i <= n; i++) {
        if (i > 1) {
            /* 添加分隔符 */
            luaL_addlstring(&buf, sep, sep_len);
        }
        /* 获取 table[i] */
        lua_geti(L, 1, i);
        if (!lua_isstring(L, -1)) {
            /* 非字符串元素，转换为字符串 */
            luaL_tolstring(L, -1, NULL);
            lua_remove(L, -2);  /* 移除原值 */
        }
        size_t len;
        const char *s = lua_tolstring(L, -1, &len);
        luaL_addlstring(&buf, s, len);
        lua_pop(L, 1);
    }

    /* luaL_pushresult 将缓冲区内容转为 Lua 字符串并压栈 */
    luaL_pushresult(&buf);
    return 1;
}

/* repeat_str(s, n): 将 s 重复 n 次
 * 演示 luaL_addstring 与 luaL_addchar */
static int l_repeat(lua_State *L) {
    size_t s_len;
    const char *s = luaL_checklstring(L, 1, &s_len);
    lua_Integer n = luaL_checkinteger(L, 2);
    luaL_argcheck(L, n >= 0, 2, "n must be non-negative");

    luaL_Buffer buf;
    luaL_buffinit(L, &buf);

    for (lua_Integer i = 0; i < n; i++) {
        /* luaL_addlstring 比 luaL_addstring 更安全
         * 因为后者依赖 '\0' 终止，二进制数据可能提前截断 */
        luaL_addlstring(&buf, s, s_len);
    }

    luaL_pushresult(&buf);
    return 1;
}

/* escape_html(s): HTML 转义
 * 演示逐字符处理与 luaL_addchar */
static int l_escape_html(lua_State *L) {
    size_t len;
    const char *s = luaL_checklstring(L, 1, &len);

    luaL_Buffer buf;
    luaL_buffinit(L, &buf);

    for (size_t i = 0; i < len; i++) {
        char c = s[i];
        switch (c) {
            case '<':
                luaL_addstring(&buf, "&lt;");
                break;
            case '>':
                luaL_addstring(&buf, "&gt;");
                break;
            case '&':
                luaL_addstring(&buf, "&amp;");
                break;
            case '"':
                luaL_addstring(&buf, "&quot;");
                break;
            case '\'':
                luaL_addstring(&buf, "&#39;");
                break;
            default:
                luaL_addchar(&buf, c);
        }
    }

    luaL_pushresult(&buf);
    return 1;
}

static const luaL_Reg funcs[] = {
    {"join", l_join},
    {"repeat_str", l_repeat},
    {"escape_html", l_escape_html},
    {NULL, NULL}
};

int luaopen_buffer_demo(lua_State *L) {
    luaL_newlib(L, funcs);
    return 1;
}
```

### 5.6 跨版本兼容：5.1 / 5.2 / 5.3 / 5.4 / LuaJIT

```c
/* compat.h
 * 跨 Lua 版本兼容层
 * 通过条件编译宏屏蔽版本差异
 */

#ifndef LUA_COMPAT_H
#define LUA_COMPAT_H

#include <lua.h>
#include <lauxlib.h>

/* Lua 5.1 没有 luaL_newlib 与 luaL_setfuncs 宏
 * 提供兼容实现 */
#if !defined(luaL_newlib)
#  define luaL_newlib(L, l) \
        (luaL_newlib_table(L, l), luaL_setfuncs(L, l, 0))
#endif

#if !defined(luaL_newlib_table)
#  define luaL_newlib_table(L, l) \
        lua_createtable(L, 0, sizeof(l)/sizeof((l)[0]) - 1)
#endif

#if !defined(luaL_setfuncs)
static void luaL_setfuncs_compat(lua_State *L, const luaL_Reg *l, int nup) {
    for (; l->name != NULL; l++) {
        int i;
        for (i = 0; i < nup; i++) {
            lua_pushvalue(L, -nup);
        }
        lua_pushcclosure(L, l->func, nup);
        lua_setfield(L, -(nup + 2), l->name);
    }
    lua_pop(L, nup);
}
#  define luaL_setfuncs(L, l, nup) luaL_setfuncs_compat(L, l, nup)
#endif

/* Lua 5.1 使用 luaL_register，5.2+ 移除
 * 兼容层统一使用新 API */
#if LUA_VERSION_NUM <= 501
#  undef luaL_register
#  define luaL_register(L, name, l) \
        (luaL_newlib_table(L, l), luaL_setfuncs(L, l, 0))
#endif

/* Lua 5.2 引入 lua_rawgetp / lua_rawsetp，5.1 缺失
 * 提供基于 light userdata 的退化实现 */
#if LUA_VERSION_NUM <= 501
static int lua_rawgetp_compat(lua_State *L, int idx, const void *p) {
    lua_pushlightuserdata(L, (void *)p);
    lua_rawget(L, idx);
    return lua_type(L, -1);
}
static void lua_rawsetp_compat(lua_State *L, int idx, const void *p) {
    lua_pushlightuserdata(L, (void *)p);
    lua_insert(L, -2);
    lua_rawset(L, idx);
}
#  define lua_rawgetp(L, idx, p) lua_rawgetp_compat(L, idx, p)
#  define lua_rawsetp(L, idx, p) lua_rawsetp_compat(L, idx, p)
#endif

/* Lua 5.3 引入整数类型
 * 旧版本 lua_Integer 退化为 ptrdiff_t 或 int */
#if LUA_VERSION_NUM < 503
#  define lua_pushinteger(L, n) lua_pushnumber(L, (lua_Number)(n))
#endif

/* Lua 5.4 引入 lua_resetthread、lua_closeslot
 * 旧版本定义为空操作 */
#if LUA_VERSION_NUM < 504
#  define lua_closeslot(L, i) ((void)0)
#endif

#endif /* LUA_COMPAT_H */
```

### 5.7 协程与 Continuation：lua_pcallk

```c
/* cont_demo.c
 * Continuation 示例：协程 yield 跨 C 函数边界
 * Lua 5.3+ 才支持
 */

#include <lua.h>
#include <lauxlib.h>

#if LUA_VERSION_NUM >= 503

/* 上下文：保存 C 函数的中间状态 */
typedef struct {
    int count;
    int total;
} SumContext;

/* Continuation 函数：协程 resume 后被调用
 * 签名：int k(lua_State *L, int status, lua_KContext ctx) */
static int sum_k(lua_State *L, int status, lua_KContext ctx) {
    SumContext *sc = (SumContext *)ctx;

    /* 上一轮 coroutine.yield 返回，栈顶是 yield 的参数 */
    if (status == LUA_YIELD) {
        lua_Number yielded = lua_tonumber(L, -1);
        sc->count += (int)yielded;
        lua_pop(L, 1);

        /* 继续 yield，等待下一次 resume */
        if (sc->count < sc->total) {
            /* lua_yieldk 让协程挂起，恢复时调用 k */
            return lua_yieldk(L, 0, (lua_KContext)sc, sum_k);
        }
    }

    /* 完成：返回总和 */
    lua_pushinteger(L, sc->count);
    return 1;
}

/* Lua 入口：sum_coroutine(n)
 * 协程版求和：每次 resume 累加 yield 返回的值 */
static int l_sum_coroutine(lua_State *L) {
    int n = (int)luaL_checkinteger(L, 1);

    /* 在栈上分配上下文（实际项目应使用 malloc 或 static） */
    SumContext *sc = (SumContext *)lua_newuserdatauv(L, sizeof(SumContext), 0);
    sc->count = 0;
    sc->total = n;

    /* 第一次 yield，恢复时调用 sum_k */
    return lua_yieldk(L, 1, (lua_KContext)sc, sum_k);
}

static const luaL_Reg funcs[] = {
    {"sum_coroutine", l_sum_coroutine},
    {NULL, NULL}
};

int luaopen_cont_demo(lua_State *L) {
    luaL_newlib(L, funcs);
    return 1;
}

#else

/* Lua 5.1 / 5.2 / LuaJIT 不支持 Continuation
 * 提供退化版本：直接返回错误 */
static int l_unsupported(lua_State *L) {
    luaL_error(L, "Continuation requires Lua 5.3+");
    return 0;
}

static const luaL_Reg funcs[] = {
    {"sum_coroutine", l_unsupported},
    {NULL, NULL}
};

int luaopen_cont_demo(lua_State *L) {
    luaL_newlib(L, funcs);
    return 1;
}

#endif
```

### 5.8 宿主程序嵌入 Lua

```c
/* host.c
 * 宿主程序示例：在 C 程序中嵌入 Lua 解释器
 * 演示 luaL_newstate、luaL_dofile、lua_close
 */

#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>
#include <stdio.h>
#include <stdlib.h>

/* 注册自定义 C 函数到 Lua 全局表 */
static int l_greet(lua_State *L) {
    const char *name = luaL_checkstring(L, 1);
    lua_pushfstring(L, "Hello, %s! (from C)", name);
    return 1;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <script.lua> [args...]\n", argv[0]);
        return 1;
    }

    /* 创建 Lua 状态机
     * Lua 5.4 用 luaL_newstate，等价于 lua_newstate + 默认分配器 */
    lua_State *L = luaL_newstate();
    if (L == NULL) {
        fprintf(stderr, "Failed to create Lua state\n");
        return 1;
    }

    /* 加载标准库
     * luaL_openlibs 加载 base, string, table, math, io, os, package 等
     * 沙盒场景下可只加载部分库 */
    luaL_openlibs(L);

    /* 注册全局 C 函数 */
    lua_register(L, "greet", l_greet);

    /* 设置 Lua 脚本的 arg 表
     * arg[0] 是脚本名，arg[1..] 是参数 */
    lua_createtable(L, argc - 1, 1);
    for (int i = 0; i < argc; i++) {
        lua_pushstring(L, argv[i]);
        lua_rawseti(L, -2, i);
    }
    lua_setglobal(L, "arg");

    /* 加载并执行脚本
     * luaL_dofile 是宏：luaL_loadfile + lua_pcall
     * 失败时返回非零，错误对象在栈顶 */
    if (luaL_dofile(L, argv[1]) != LUA_OK) {
        const char *err = lua_tostring(L, -1);
        fprintf(stderr, "Error: %s\n", err ? err : "(unknown)");
        lua_close(L);
        return 1;
    }

    /* 获取脚本返回值（若脚本 return N，则栈顶有 N 个值） */
    int result = 0;
    if (lua_isinteger(L, -1)) {
        result = (int)lua_tointeger(L, -1);
    } else if (lua_isnumber(L, -1)) {
        result = (int)lua_tonumber(L, -1);
    }

    /* 关闭状态机，释放所有资源
     * 包括 GC 所有剩余 Userdata 并调用 __gc */
    lua_close(L);
    return result;
}
```

**编译与运行**：

```bash
# 编译
gcc -O2 -o host host.c -I/usr/local/include/lua5.4 -llua5.4 -lm

# Lua 脚本 (test.lua)
# print(greet("World"))  -- 输出: Hello, World! (from C)
# return 42

# 运行
./host test.lua arg1 arg2
# 输出:
# Hello, World! (from C)
# 程序退出码: 42
```

### 5.9 Lua 调用 C 函数指针

```c
/* callback.c
 * C 调用 Lua 函数，Lua 函数再回调 C 函数
 * 演示双向调用
 */

#include <lua.h>
#include <lauxlib.h>
#include <stdio.h>

/* C 函数：被 Lua 调用 */
static int l_c_helper(lua_State *L) {
    lua_Number x = luaL_checknumber(L, 1);
    /* 返回 x 的平方 */
    lua_pushnumber(L, x * x);
    return 1;
}

/* C 入口：接收 Lua 函数，调用它，并将 c_helper 传入 */
static int l_call_lua_with_callback(lua_State *L) {
    luaL_checktype(L, 1, LUA_TFUNCTION);

    /* 将函数移到栈顶 */
    lua_pushvalue(L, 1);

    /* 压入参数：c_helper 函数 */
    lua_pushcfunction(L, l_c_helper);

    /* 压入参数：数值 */
    lua_pushnumber(L, 5.0);

    /* 调用 Lua 函数，参数 2 个，期望 1 个返回值 */
    if (lua_pcall(L, 2, 1, 0) != LUA_OK) {
        luaL_error(L, "Lua callback failed: %s", lua_tostring(L, -1));
    }

    /* 返回 Lua 函数的返回值 */
    return 1;
}

static const luaL_Reg funcs[] = {
    {"call_with_callback", l_call_lua_with_callback},
    {NULL, NULL}
};

int luaopen_callback(lua_State *L) {
    luaL_newlib(L, funcs);
    return 1;
}
```

**Lua 使用**：

```lua
local cb = require("callback")

-- Lua 函数接收一个函数和数值，调用函数处理数值
local function lua_processor(fn, x)
    print(string.format("Lua: 收到 x = %g", x))
    local result = fn(x)  -- 调用 C 函数
    print(string.format("Lua: fn(x) = %g", result))
    return result * 2     -- Lua 层再次处理
end

local final = cb.call_with_callback(lua_processor)
print(string.format("最终结果: %g", final))
-- 输出:
-- Lua: 收到 x = 5
-- Lua: fn(x) = 25
-- 最终结果: 50
```

### 5.10 完整 Userdata 资源管理：文件句柄

```c
/* file_handle.c
 * 完整资源管理示例：文件句柄 Userdata
 * 演示 __gc 元方法、错误处理、To-Be-Closed（Lua 5.4）
 */

#include <lua.h>
#include <lauxlib.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>

#define FILE_HANDLE_METATABLE "FileHandle"

typedef struct {
    FILE *fp;
    char *path;  /* 仅用于错误消息 */
} FileHandle;

static FileHandle *fh_check(lua_State *L, int arg) {
    return (FileHandle *)luaL_checkudata(L, arg, FILE_HANDLE_METATABLE);
}

/* 构造器：FileHandle.open(path, mode) */
static int l_fh_open(lua_State *L) {
    const char *path = luaL_checkstring(L, 1);
    const char *mode = luaL_optstring(L, 2, "r");

    FILE *fp = fopen(path, mode);
    if (fp == NULL) {
        /* 失败时返回 nil + 错误消息 + 错误码 */
        lua_pushnil(L);
        lua_pushstring(L, strerror(errno));
        lua_pushinteger(L, errno);
        return 3;
    }

    /* 分配 Userdata */
    FileHandle *fh = (FileHandle *)lua_newuserdata(L, sizeof(FileHandle));
    fh->fp = fp;

    /* 复制 path 字符串供 __gc 使用 */
    fh->path = (char *)malloc(strlen(path) + 1);
    if (fh->path) {
        strcpy(fh->path, path);
    }

    luaL_setmetatable(L, FILE_HANDLE_METATABLE);
    return 1;
}

/* read(fh): 读取一行 */
static int l_fh_read(lua_State *L) {
    FileHandle *fh = fh_check(L, 1);
    if (fh->fp == NULL) {
        luaL_error(L, "file handle closed");
    }

    char buf[4096];
    if (fgets(buf, sizeof(buf), fh->fp) == NULL) {
        /* EOF 或错误 */
        lua_pushnil(L);
        return 1;
    }

    /* 移除末尾换行 */
    size_t len = strlen(buf);
    if (len > 0 && buf[len - 1] == '\n') {
        buf[len - 1] = '\0';
    }

    lua_pushstring(L, buf);
    return 1;
}

/* close(fh): 关闭文件 */
static int l_fh_close(lua_State *L) {
    FileHandle *fh = fh_check(L, 1);
    if (fh->fp != NULL) {
        fclose(fh->fp);
        fh->fp = NULL;
    }
    if (fh->path != NULL) {
        free(fh->path);
        fh->path = NULL;
    }
    return 0;
}

/* __gc 元方法：Userdata 被回收时调用
 * 确保文件句柄被关闭 */
static int l_fh_gc(lua_State *L) {
    FileHandle *fh = fh_check(L, 1);
    if (fh->fp != NULL) {
        /* 警告：__gc 中不应抛出错误
         * 静默关闭即可 */
        fclose(fh->fp);
        fh->fp = NULL;
    }
    if (fh->path != NULL) {
        free(fh->path);
        fh->path = NULL;
    }
    return 0;
}

/* __tostring */
static int l_fh_tostring(lua_State *L) {
    FileHandle *fh = fh_check(L, 1);
    if (fh->fp != NULL) {
        lua_pushfstring(L, "FileHandle(%s, open)", fh->path ? fh->path : "?");
    } else {
        lua_pushstring(L, "FileHandle(closed)");
    }
    return 1;
}

#if LUA_VERSION_NUM >= 504
/* __close 元方法（Lua 5.4 To-Be-Closed）
 * local fh <close> = FileHandle.open(...)
 * 作用域结束时自动调用 __close */
static int l_fh_close_meta(lua_State *L) {
    return l_fh_close(L);
}
#endif

static const luaL_Reg fh_methods[] = {
    {"read", l_fh_read},
    {"close", l_fh_close},
    {NULL, NULL}
};

static const luaL_Reg fh_metamethods[] = {
    {"__gc", l_fh_gc},
    {"__tostring", l_fh_tostring},
#if LUA_VERSION_NUM >= 504
    {"__close", l_fh_close_meta},
#endif
    {NULL, NULL}
};

int luaopen_file_handle(lua_State *L) {
    /* 创建元表 */
    luaL_newmetatable(L, FILE_HANDLE_METATABLE);

    /* 注册元方法 */
    luaL_setfuncs(L, fh_metamethods, 0);

    /* 创建方法表，设为 __index */
    lua_newtable(L);
    luaL_setfuncs(L, fh_methods, 0);
    lua_setfield(L, -2, "__index");

    /* 弹出元表 */
    lua_pop(L, 1);

    /* 创建模块表 */
    lua_newtable(L);
    lua_pushcfunction(L, l_fh_open);
    lua_setfield(L, -2, "open");

    return 1;
}
```

**Lua 使用（Lua 5.4+）**：

```lua
local FileHandle = require("file_handle")

-- 使用 To-Be-Closed 语法（Lua 5.4+）
local function read_lines(path)
    local fh <close> = FileHandle.open(path)
    if not fh then
        error("cannot open: " .. path)
    end

    local lines = {}
    for line in function() return fh:read() end do
        if line == nil then break end
        lines[#lines + 1] = line
    end

    return lines
    -- fh 在作用域结束时自动关闭（调用 __close）
end

-- 手动管理
local function read_first_line(path)
    local fh, err = FileHandle.open(path)
    if not fh then
        return nil, err
    end

    local line = fh:read()
    fh:close()  -- 显式关闭
    return line
end
```

### 5.11 多状态机与 lua_xmove

```c
/* multi_state.c
 * 多状态机示例：主状态机创建子状态机执行沙盒脚本
 */

#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>
#include <stdio.h>
#include <stdlib.h>

static int l_eval_in_sandbox(lua_State *L) {
    const char *code = luaL_checkstring(L, 1);

    /* 创建独立的沙盒状态机 */
    lua_State *sandbox = luaL_newstate();
    if (sandbox == NULL) {
        luaL_error(L, "cannot create sandbox state");
    }

    /* 仅加载安全的标准库（不加载 io, os, debug, package） */
    lua_pushcfunction(sandbox, luaopen_base);
    lua_call(sandbox, 0, 0);
    lua_pushcfunction(sandbox, luaopen_table);
    lua_call(sandbox, 0, 0);
    lua_pushcfunction(sandbox, luaopen_string);
    lua_call(sandbox, 0, 0);
    lua_pushcfunction(sandbox, luaopen_math);
    lua_call(sandbox, 0, 0);

    /* 在沙盒中执行代码 */
    int status = luaL_dostring(sandbox, code);
    if (status != LUA_OK) {
        const char *err = lua_tostring(sandbox, -1);
        lua_pushnil(L);
        lua_pushfstring(L, "sandbox error: %s", err ? err : "unknown");
        lua_close(sandbox);
        return 2;
    }

    /* 将结果从沙盒转移到主状态机
     * lua_xmove 仅在同构状态机间有效 */
    int nresults = lua_gettop(sandbox);
    if (nresults > 0) {
        lua_xmove(sandbox, L, nresults);
    } else {
        lua_pushnil(L);
        nresults = 1;
    }

    lua_close(sandbox);
    return nresults;
}

static const luaL_Reg funcs[] = {
    {"eval_in_sandbox", l_eval_in_sandbox},
    {NULL, NULL}
};

int luaopen_multi_state(lua_State *L) {
    luaL_newlib(L, funcs);
    return 1;
}
```

---

## 6. 对比分析

### 6.1 Lua C API vs LuaJIT FFI

| 维度 | Lua C API | LuaJIT FFI |
| :--- | :--- | :--- |
| 编写语言 | C | Lua |
| 调用开销（每次） | 200-500ns | 25-65ns（JIT 内联后 15-35ns） |
| 类型声明 | C 头文件 + 手写绑定 | `ffi.cdef` 在 Lua 中声明 |
| 编译流程 | 编译 .so/.dll，跨平台 ABI 复杂 | 无需编译，运行时解析 |
| 内存管理 | `lua_newuserdata` + `__gc` | `ffi.new` + GC 或 `ffi.gc` |
| 类型安全 | `luaL_checkudata` 校验元表 | CType 编译期确定 |
| 跨 Lua 版本 | 5.1/5.2/5.3/5.4 通吃 | 仅 LuaJIT |
| 调试友好性 | C 调试器可用 | Lua 错误栈清晰 |
| 错误处理 | `luaL_error` + pcall | Lua 错误 + pcall |
| 二进制依赖 | 需分发 .so/.dll | 仅需 Lua 代码 |

**选择建议**：

- **使用 C API**：宿主 Lua 非 LuaJIT、需嵌入 Lua 到 C 程序、跨 Lua 版本分发、需要细粒度资源管理。
- **使用 FFI**：宿主为 LuaJIT、纯 Lua 项目绑定 C 库、追求极致性能、希望避免 C 编译。

### 6.2 Full Userdata vs Light Userdata

| 维度 | Full Userdata | Light Userdata |
| :--- | :--- | :--- |
| 内存来源 | Lua GC 管理（`lua_newuserdata` 分配） | C 层管理（任意 `void*`） |
| 元表 | 支持，每个对象可独立绑定 | 所有 Light Userdata 共享同一元表 |
| `__gc` 元方法 | 支持，回收时调用 | 不支持 |
| 大小 | 任意（创建时指定） | 固定 `sizeof(void*)` |
| 比较语义 | 元表 `__eq` 决定 | 指针相等 |
| 适用场景 | 封装 C 资源（文件、连接、对象） | 传递 C 指针键、轻量引用 |

**典型用法**：

- **Full Userdata**：封装 `FILE*`、数据库连接、自定义 C 对象。
- **Light Userdata**：作为表键关联 C 对象（`table[lightuserdata] = ...`），避免 C 全局变量。

### 6.3 Lua C API vs Python C API

| 维度 | Lua C API | Python C API |
| :--- | :--- | :--- |
| 数据交换 | 虚拟栈 | PyObject* 直接传递 |
| 引用计数 | GC 自动管理 | 手动 `Py_INCREF`/`Py_DECREF` |
| 错误机制 | `longjmp` + pcall | 异常 + NULL 返回 |
| 类型系统 | 8 种基本类型 | 丰富类型层次 |
| GIL | 无 GIL，多状态机独立 | 全局 GIL 限制并发 |
| ABI 稳定性 | 极高（栈 API 20+ 年稳定） | 较低（Python 3.x 多次调整） |
| 内存开销 | 每个 `lua_State` 约 100KB | 每个 `PyInterpreterState` 数 MB |

**关键差异**：Lua 无 GIL，多状态机天然并行；Python 受 GIL 限制，多线程 CPU 密集任务收益有限。但 Python 生态丰富，C 扩展更多。

### 6.4 错误处理方案对比

| 方案 | 机制 | 优点 | 缺点 |
| :--- | :--- | :--- | :--- |
| `luaL_error` | `longjmp` 到 pcall | 简洁，自动清理 Lua 栈 | C 层资源需手动管理 |
| `lua_error` + 自定义对象 | 同上，错误对象可为 table | 携带丰富错误信息 | Lua 5.1 错误对象非字符串时 msgh 处理复杂 |
| 返回 nil + err | 显式返回 | C 层资源可控 | 代码冗长，每步检查 |
| `lua_pcall` + msgh | 受保护调用 + traceback | 完整调用栈 | 性能开销（setjmp） |

**推荐策略**：

- C 函数内部错误用 `luaL_error`（简洁）。
- 调用 Lua 函数用 `lua_pcall`（安全）。
- 关键资源用 Userdata + `__gc`（兜底）。
- 热路径避免频繁 pcall（性能）。

---

## 7. 常见陷阱与反模式

### 7.1 栈平衡失效

**反模式**：

```c
static int l_bad(lua_State *L) {
    lua_pushstring(L, "temp");     /* 压栈但未弹出 */
    lua_getglobal(L, "print");
    lua_pushstring(L, "hello");
    lua_call(L, 1, 0);             /* print("hello") */
    /* "temp" 仍在栈上，函数返回 0 但栈顶多了 1 个值 */
    return 0;
}
```

**问题**：返回值数量与栈顶剩余不匹配，导致 Lua 内部状态混乱。

**正确做法**：

```c
static int l_good(lua_State *L) {
    lua_getglobal(L, "print");
    lua_pushstring(L, "hello");
    lua_call(L, 1, 0);
    return 0;  /* 栈平衡 */
}
```

**调试技巧**：在函数入口与出口分别 `assert(lua_gettop(L) == expected)`。

### 7.2 持有失效的栈指针

**反模式**：

```c
static int l_bad_pointer(lua_State *L) {
    const char *s1 = lua_tostring(L, 1);
    lua_getglobal(L, "other");  /* 可能触发 GC，s1 指向的字符串被回收 */
    printf("%s\n", s1);          /* 未定义行为 */
    return 0;
}
```

**问题**：`lua_tostring` 返回的指针在栈变化后可能失效。

**正确做法**：

```c
static int l_good_pointer(lua_State *L) {
    size_t len;
    /* 复制到 C 内存 */
    const char *s = lua_tolstring(L, 1, &len);
    char *copy = (char *)malloc(len + 1);
    memcpy(copy, s, len + 1);

    lua_getglobal(L, "other");
    printf("%s\n", copy);
    free(copy);
    return 0;
}
```

或使用 `lua_pushvalue` 保留引用：

```c
static int l_safe_pointer(lua_State *L) {
    lua_pushvalue(L, 1);  /* 复制引用到栈顶 */
    const char *s = lua_tostring(L, 2);  /* 使用副本 */
    lua_getglobal(L, "other");
    printf("%s\n", s);  /* s 仍有效，因为副本在栈上 */
    return 0;
}
```

### 7.3 Userdata 类型混淆

**反模式**：

```c
/* 不同类型 Userdata 共用同一元表名，或未使用 luaL_checkudata */
static int l_unsafe_getx(lua_State *L) {
    /* 危险：仅检查是否为 Userdata，不校验类型 */
    void *p = lua_touserdata(L, 1);
    /* 若 p 实际是 Vec3 但此处按 Point 解析，导致字段错位 */
    double x = *(double *)p;
    lua_pushnumber(L, x);
    return 1;
}
```

**问题**：C 层假设 Userdata 是某类型，实际可能是任意 Userdata，导致内存读取越界或字段错位。

**正确做法**：

```c
static int l_safe_getx(lua_State *L) {
    /* luaL_checkudata 校验元表匹配，类型不符抛出错误 */
    Vec3 *v = (Vec3 *)luaL_checkudata(L, 1, VEC3_METATABLE);
    lua_pushnumber(L, v->x);
    return 1;
}
```

### 7.4 __gc 中抛出错误

**反模式**：

```c
static int l_bad_gc(lua_State *L) {
    MyType *obj = (MyType *)luaL_checkudata(L, 1, MYTYPE_METATABLE);
    if (fclose(obj->fp) != 0) {
        luaL_error(L, "close failed: %s", strerror(errno));
        /* __gc 中的错误被 Lua 静默吞掉，但行为未定义 */
    }
    return 0;
}
```

**问题**：`__gc` 在 GC 期间调用，此时 Lua 状态可能不稳定。`luaL_error` 在 `__gc` 中行为未定义，可能导致崩溃。

**正确做法**：

```c
static int l_good_gc(lua_State *L) {
    MyType *obj = (MyType *)luaL_checkudata(L, 1, MYTYPE_METATABLE);
    if (obj->fp != NULL) {
        fclose(obj->fp);  /* 静默关闭 */
        obj->fp = NULL;
    }
    return 0;
}
```

若需报告错误，记录到日志文件而非抛出 Lua 错误。

### 7.5 跨 C 边界 yield

**反模式**：

```c
static int l_bad_yield(lua_State *L) {
    lua_State *co = lua_newthread(L);
    lua_getglobal(co, "coroutine");
    lua_getfield(co, -1, "yield");
    lua_call(co, 0, 0);  /* 直接调用 coroutine.yield */
    /* 若在协程上下文，yield 跨 C 边界，行为未定义（Lua 5.2 之前） */
    return 0;
}
```

**问题**：Lua 5.2 之前，`coroutine.yield` 跨 C 函数边界会 panic。Lua 5.3+ 需使用 `lua_yieldk`。

**正确做法（Lua 5.3+）**：

```c
static int l_safe_yield(lua_State *L) {
    /* 使用 lua_yieldk，提供 Continuation 函数 */
    return lua_yieldk(L, 0, 0, my_continuation);
}
```

### 7.6 忽略 luaL_checkudata 的错误返回

**反模式**：

```c
static int l_unsafe(lua_State *L) {
    /* 直接 cast，不检查类型 */
    Vec3 *v = (Vec3 *)lua_touserdata(L, 1);
    /* 若传入非 Userdata 或类型不符，指针可能为 NULL 或非法 */
    return do_something(v);
}
```

**问题**：`lua_touserdata` 不做类型校验，传入 table 或 nil 返回 NULL。

**正确做法**：

```c
static int l_safe(lua_State *L) {
    Vec3 *v = (Vec3 *)luaL_checkudata(L, 1, VEC3_METATABLE);
    /* luaL_checkudata 类型不符时自动抛出错误 */
    return do_something(v);
}
```

### 7.7 全局状态污染

**反模式**：

```c
static lua_State *g_L = NULL;  /* 全局状态 */

int luaopen_mylib(lua_State *L) {
    g_L = L;  /* 保存到全局 */
    luaL_newlib(L, funcs);
    return 1;
}

static int l_callback(lua_State *L) {
    /* 使用 g_L 而非参数 L
     * 多状态机场景下，g_L 可能指向错误的状态 */
    lua_getglobal(g_L, "handler");
    /* ... */
}
```

**问题**：全局 `lua_State*` 在多状态机、多线程场景下失效。

**正确做法**：使用注册表或 Userdata 保存状态：

```c
int luaopen_mylib(lua_State *L) {
    luaL_newlib(L, funcs);
    /* 在注册表中保存模块私有状态 */
    return 1;
}

static int l_callback(lua_State *L) {
    /* 始终使用参数 L */
    lua_getglobal(L, "handler");
    /* ... */
}
```

### 7.8 忘记 luaL_unref

**反模式**：

```c
static int callbacks[64];

static int l_register(lua_State *L) {
    luaL_checktype(L, 1, LUA_TFUNCTION);
    int ref = luaL_ref(L, LUA_REGISTRYINDEX);
    callbacks[next_slot++] = ref;
    /* 从不调用 luaL_unref，导致 Lua 函数永不被 GC */
    return 0;
}
```

**问题**：引用永不释放，Lua 函数与其闭包变量泄漏。

**正确做法**：

```c
static int l_release(lua_State *L) {
    int id = (int)luaL_checkinteger(L, 1);
    if (id >= 0 && id < 64 && callbacks[id] != LUA_NOREF) {
        luaL_unref(L, LUA_REGISTRYINDEX, callbacks[id]);
        callbacks[id] = LUA_NOREF;
    }
    return 0;
}
```

---

## 8. 工程实践

### 8.1 项目结构规范

```
my_lua_module/
├── src/
│   ├── my_module.c          # 主模块实现
│   ├── my_module.h          # 内部头文件
│   ├── compat.h             # 跨版本兼容层
│   └── third_party/         # 第三方依赖
├── lua/                     # Lua 测试与示例
│   ├── test.lua
│   └── example.lua
├── tests/                   # C 单元测试
│   └── test_my_module.c
├── CMakeLists.txt           # CMake 构建脚本
├── rockspec                 # LuaRocks 包描述
└── README.md
```

### 8.2 CMake 构建脚本

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.10)
project(my_lua_module C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# 查找 Lua
find_package(Lua REQUIRED)

# 跨平台编译选项
if(MSVC)
    add_compile_options(/W4 /O2)
else()
    add_compile_options(-Wall -Wextra -O2)
endif()

# 模块源文件
set(MODULE_SOURCES
    src/my_module.c
)

# 构建动态库（模块名必须与 luaopen_ 后缀匹配）
add_library(my_module SHARED ${MODULE_SOURCES})
target_include_directories(my_module PRIVATE
    ${LUA_INCLUDE_DIR}
    src
)

# 链接 Lua（Linux/macOS 需要，Windows MinGW 不需要）
if(UNIX)
    target_link_libraries(my_module ${LUA_LIBRARIES})
endif()

# 安装规则
install(TARGETS my_module
    LIBRARY DESTINATION lib
    RUNTIME DESTINATION bin
)
```

### 8.3 LuaRocks 包描述

```lua
-- my_module-1.0.0-1.rockspec
package = "my_module"
version = "1.0.0-1"

source = {
    url = "git://github.com/user/my_module.git",
    tag = "v1.0.0"
}

description = {
    summary = "A high-performance Lua C extension",
    detailed = [[
        My module provides...
    ]],
    homepage = "https://github.com/user/my_module",
    license = "MIT"
}

dependencies = {
    "lua >= 5.1"
}

build = {
    type = "builtin",
    modules = {
        my_module = {
            sources = {"src/my_module.c"},
            libraries = {"m"},  -- Linux 数学库
            incdirs = {"src"}
        }
    }
}
```

### 8.4 内存管理最佳实践

1. **优先使用 Userdata 而非 malloc**：Userdata 由 Lua GC 管理，无需手动 free。
2. **__gc 必须幂等**：可能被多次调用（Lua 5.4 在 panic 时会重试）。
3. **__gc 不抛错误**：使用日志记录而非 `luaL_error`。
4. **避免循环引用**：Userdata 互相引用时，GC 可能无法回收，需手动管理或使用弱引用。
5. **大对象分块**：超过 1MB 的 Userdata 考虑分块或使用 light userdata + 手动管理。

### 8.5 线程安全

Lua C API 非线程安全，多线程场景需：

1. **每线程独立 `lua_State`**：创建多个状态机，互不干扰。
2. **互斥锁保护共享状态机**：多线程访问同一 `lua_State` 需加锁。
3. **避免全局变量**：C 全局变量在多线程下竞争。
4. **使用 `luaL_ref` 而非全局表**：引用机制天然与 `lua_State` 绑定。

```c
/* 线程安全示例 */
typedef struct {
    lua_State *L;
    pthread_mutex_t mutex;
} ThreadSafeState;

static int ts_call(ThreadSafeState *ts, const char *func, int nargs) {
    pthread_mutex_lock(&ts->mutex);
    lua_getglobal(ts->L, func);
    /* ... 压栈参数 ... */
    int status = lua_pcall(ts->L, nargs, 0, 0);
    pthread_mutex_unlock(&ts->mutex);
    return status;
}
```

### 8.6 性能优化

1. **减少栈操作**：批量 `lua_rawseti` 优于逐个 `lua_settable`。
2. **使用 `lua_rawgeti` 而非 `lua_geti`**：跳过元方法，O(1) 访问数组部分。
3. **预分配表大小**：`lua_createtable(L, narr, nrec)` 避免再哈希。
4. **`luaL_Buffer` 拼接字符串**：避免中间字符串对象。
5. **缓存元表查找**：`luaL_getmetatable` 是 O(1) 但仍有开销，热路径可缓存。
6. **避免热路径 pcall**：`setjmp` 开销约 100ns，热循环中应避免。
7. **使用 `lua_pushlstring` 而非 `lua_pushstring`**：避免二进制数据 `\0` 截断。

### 8.7 错误处理策略

1. **C 函数内部用 `luaL_error`**：简洁，自动清理 Lua 栈。
2. **调用 Lua 函数用 `lua_pcall`**：防止 Lua 错误传播到 C 层。
3. **关键资源用 `__gc` 兜底**：即使错误抛出，资源也会被回收。
4. **错误对象丰富化**：用 table 携带错误码、堆栈、上下文。

```c
static int l_rich_error(lua_State *L, const char *msg, int code) {
    lua_newtable(L);
    lua_pushstring(L, msg);
    lua_setfield(L, -2, "message");
    lua_pushinteger(L, code);
    lua_setfield(L, -2, "code");
    /* 获取 traceback */
    luaL_traceback(L, L, msg, 1);
    lua_setfield(L, -2, "traceback");
    return lua_error(L);  /* 抛出 table 作为错误对象 */
}
```

---

## 9. 案例研究

### 9.1 Redis 中的 Lua 嵌入

Redis 自 2.6 起内置 Lua 5.1 解释器，用于 `EVAL` 命令实现原子事务。Redis 的 Lua 嵌入是 C API 工程实践的典范：

**架构设计**：

- 每个 Redis 服务器进程持有一个 `lua_State`，所有客户端共享。
- 通过 `lua_create_table` 创建沙盒环境，禁用危险函数（`io`、`os`、`loadfile` 等）。
- 自定义 `redis.call` / `redis.pcall` 函数，通过 C API 调用 Redis 命令处理器。
- 自定义 `redis.error_reply` / `redis.status_reply` 构造返回值。

**关键实现**：

```c
/* 简化版 Redis Lua 调用 */
int evalCommand(client *c) {
    /* 编译 Lua 脚本 */
    char *sha = ...;
    if (luaL_loadbuffer(server.lua, script, strlen(script), "@user_script")) {
        /* 编译错误 */
    }

    /* 设置沙盒环境 */
    lua_setglobal(server.lua, "__redis__f");

    /* 压入 KEYS 与 ARGV */
    lua_newtable(server.lua);  /* KEYS */
    for (int i = 0; i < c->argc_keys; i++) {
        lua_pushstring(server.lua, c->argv[i]);
        lua_rawseti(server.lua, -2, i + 1);
    }
    lua_newtable(server.lua);  /* ARGV */
    for (int i = 0; i < c->argc_argv; i++) {
        lua_pushstring(server.lua, c->argv[i]);
        lua_rawseti(server.lua, -2, i + 1);
    }

    /* 调用，使用 pcall 防止错误传播 */
    int status = lua_pcall(server.lua, 2, 1, 0);

    if (status != LUA_OK) {
        /* Lua 错误转为 Redis 错误回复 */
        addReplyError(c, lua_tostring(server.lua, -1));
        lua_pop(server.lua, 1);
        return;
    }

    /* 将 Lua 返回值转为 Redis 回复 */
    luaReplyToRedisReply(c);
    lua_pop(server.lua, 1);
}
```

**经验总结**：

- 沙盒隔离是嵌入 Lua 的核心安全机制。
- pcall 是防止脚本错误崩溃宿主的必备手段。
- 共享 `lua_State` 配合事务保证原子性。

### 9.2 Neovim 的 Lua 配置系统

Neovim 0.5+ 用 Lua 替代 Vimscript 作为配置语言，Lua 通过 C API 与 Neovim 核心交互：

**架构**：

- Neovim 进程持有一个 `lua_State`，与 Vimscript 解释器并存。
- 通过 `vim.api` 模块暴露 Neovim API（C 函数）给 Lua。
- Lua 函数可作为 Vim 命令、自动命令、定时器回调。

**关键 API 绑定**：

```c
/* nvim_api_call(fn_name, args) */
static int l_nvim_api_call(lua_State *L) {
    const char *fn_name = luaL_checkstring(L, 1);
    /* 查找 API 函数 */
    ApiFn *fn = api_find(fn_name);
    if (fn == NULL) {
        luaL_error(L, "unknown API: %s", fn_name);
    }

    /* 将 Lua 参数转换为 API 参数 */
    Array args = lua_to_array(L, 2);

    /* 调用 API */
    Object result = fn->handler(args);

    /* 将结果转回 Lua */
    object_to_lua(L, result);
    return 1;
}
```

**经验总结**：

- 高频调用的 API 需优化数据转换开销。
- 异步回调通过 `luaL_ref` 持有 Lua 函数。
- 错误消息需保留 Lua 调用栈供调试。

### 9.3 魔兽世界的 UI 系统

魔兽世界（WoW）的 UI 全部用 Lua 编写，是 Lua C API 在游戏领域最大规模的应用：

**架构**：

- 游戏引擎（C++）嵌入 Lua 5.1（后升级至 LuaJIT 兼容层）。
- UI 事件循环：引擎触发事件 → Lua 处理 → 引擎渲染。
- FrameXML：WoW 提供的 Lua UI 框架，定义所有 UI 元素。

**关键绑定**：

- `CreateFrame`：C 函数创建 UI 帧，返回 Userdata。
- `SetScript`：将 Lua 函数注册为事件回调。
- `Frame:SetPoint`：设置 UI 布局，调用 C 渲染层。

**性能优化**：

- WoW 使用自定义的 Lua 内存分配器，针对小对象优化。
- 高频事件（如 `COMBAT_LOG_EVENT`）通过批量处理减少 C/Lua 边界开销。
- UI 元素用 Userdata + `__gc` 管理生命周期。

**经验总结**：

- 游戏 UI 是 C API 的高频调用场景，栈操作优化至关重要。
- Userdata 适合封装引擎对象（帧、纹理、声音）。
- 事件回调机制需稳定的引用管理（`luaL_ref`）。

### 9.4 OpenResty 的 Lua 网关

OpenResty 在 Nginx 中嵌入 LuaJIT，用于编写高性能 Web 网关：

**架构**：

- 每个 Nginx Worker 持有多个 `lua_State`（每请求协程）。
- 通过 `ngx.API` 暴露 Nginx 功能给 Lua。
- 协程化：`ngx.sleep`、`ngx.location.capture` 通过 `lua_yieldk` 实现非阻塞。

**关键创新**：

- 协程池：复用 `lua_State` 避免创建开销。
- `ngx.req.read_body`：通过 Continuation 实现异步 I/O。
- 共享字典 `ngx.shared.DICT`：跨 worker 共享数据，通过 C API 实现。

**经验总结**：

- 高并发场景需复用 `lua_State`（协程池）。
- 异步 I/O 需 Continuation 机制（`lua_yieldk`）。
- 跨线程共享数据需 C 层实现（绕过 Lua GC 限制）。

---

## 10. 习题

### 10.1 基础题

**题目 1**：编写一个 C 函数 `l_sum`，接收任意数量的数字参数，返回它们的和。要求使用 `lua_gettop` 获取参数数量，循环 `lua_tonumber` 累加。

**参考答案要点**：

- 使用 `lua_gettop(L)` 获取参数数量 $n$。
- 循环 `for (int i = 1; i <= n; i++)` 累加 `lua_tonumber(L, i)`。
- `lua_pushnumber(L, sum)` 压入结果，`return 1`。
- 注意 `lua_tonumber` 对非数字参数返回 0，生产代码应使用 `luaL_checknumber`。

**题目 2**：解释以下代码的栈平衡问题并修复：

```c
static int l_demo(lua_State *L) {
    lua_pushstring(L, "a");
    lua_pushstring(L, "b");
    lua_pushstring(L, "c");
    lua_concat(L, 3);
    return 0;
}
```

**参考答案要点**：

- 函数压入了 3 个字符串并拼接为 1 个，但 `return 0` 表示无返回值。
- 栈顶遗留拼接后的字符串，违反栈平衡契约。
- 修复：改为 `return 1`（返回拼接结果），或在 `return` 前 `lua_pop(L, 1)`。

**题目 3**：写一段 Lua 代码，使用 `pcall` 调用 C 函数 `divide(a, b)`，捕获除零错误并打印。

**参考答案要点**：

```lua
local ok, result = pcall(divide, 10, 0)
if not ok then
    print("Error:", result)  -- 输出: division by zero: 10 / 0
else
    print("Result:", result)
end
```

### 10.2 进阶题

**题目 4**：实现一个 `Matrix` Userdata 类型，支持 `Matrix.new(rows, cols)`、`m:get(i, j)`、`m:set(i, j, v)`、`m * m2`（矩阵乘法）。要求使用 Full Userdata、元方法绑定、`__gc` 不需要（仅含数字）。

**参考答案要点**：

- 结构体：`typedef struct { int rows, cols; double *data; } Matrix;`
- `l_matrix_new`：`lua_newuserdata` + `luaL_setmetatable`，分配 `data` 数组。
- `l_matrix_get`：`luaL_checkudata` + 索引检查 + `lua_pushnumber`。
- `l_matrix_mul`：校验维度，`lua_newuserdata` 创建结果，三重循环计算。
- 元表注册：`__index` 指向方法表，`__mul` 绑定乘法，`__gc` 释放 `data` 数组（使用 `free`）。
- 注意：`data` 是 `malloc` 分配的，必须在 `__gc` 中 `free`。

**题目 5**：分析以下代码的内存泄漏，并给出修复方案：

```c
static int l_load_file(lua_State *L) {
    const char *path = luaL_checkstring(L, 1);
    FILE *fp = fopen(path, "r");
    if (!fp) {
        luaL_error(L, "cannot open");
    }
    char *buf = malloc(1024);
    fgets(buf, 1024, fp);
    /* 处理 buf */
    lua_pushstring(L, buf);
    /* 忘记释放 */
    return 1;
}
```

**参考答案要点**：

- 泄漏点 1：`fopen` 成功但后续 `luaL_error` 抛错时，`fp` 未 `fclose`。
- 泄漏点 2：`buf` 在 `lua_pushstring` 后未 `free`。
- 修复：
  - `lua_pushstring` 后立即 `free(buf)`（Lua 会复制字符串）。
  - `fopen` 失败时直接 `return luaL_error(...)`（`luaL_error` 不返回）。
  - 使用 `fclose(fp)` 在所有路径上关闭文件。
  - 推荐改用 Userdata + `__gc` 管理文件句柄。

**题目 6**：使用 `luaL_Buffer` 实现一个 C 函数 `l_reverse(s)`，返回字符串 `s` 的反转。

**参考答案要点**：

```c
static int l_reverse(lua_State *L) {
    size_t len;
    const char *s = luaL_checklstring(L, 1, &len);
    luaL_Buffer buf;
    luaL_buffinit(L, &buf);
    for (size_t i = len; i > 0; i--) {
        luaL_addchar(&buf, s[i - 1]);
    }
    luaL_pushresult(&buf);
    return 1;
}
```

- 使用 `luaL_checklstring` 获取长度（支持二进制）。
- 从后向前遍历，`luaL_addchar` 逐字符添加。
- `luaL_pushresult` 生成最终字符串。

### 10.3 挑战题

**题目 7**：设计一个跨 Lua 5.1/5.2/5.3/5.4/LuaJIT 兼容的 C 模块框架，处理以下差异：

1. `luaL_newlib` 在 5.1 不存在。
2. `lua_Integer` 在 5.3 前是 `ptrdiff_t`，5.3+ 是 `long long`。
3. `lua_pcallk` 在 5.3 前不存在。
4. `lua_setuservalue` 在 5.4 支持多用户值。

**参考答案要点**：

- 使用条件编译宏：`#if LUA_VERSION_NUM <= 501` 等。
- 定义 `luaL_newlib` 兼容宏（5.6 节示例）。
- 整数类型用 `lua_Integer` 配合 `LUA_VERSION_NUM` 判断宽度。
- Continuation 功能在 5.3 前提供退化版本（不支持 yield 跨 C）。
- Userdata 用户值：5.4 用 `lua_setiuservalue`，旧版用 `lua_setuservalue` 或环境表。
- 使用 `#if LUA_VERSION_NUM` 而非运行时判断，避免性能损失。

**题目 8**：实现一个协程化的 HTTP 客户端 C 模块，支持 `http.get(url)` 在协程中非阻塞请求，请求完成后 `yield` 返回结果。要求使用 `lua_pcallk` 与 `lua_yieldk`。

**参考答案要点**：

- 入口函数 `l_http_get` 启动异步请求，注册 Continuation。
- 异步 I/O 完成时调用 `lua_yieldk(L, 0, ctx, http_k)`。
- `http_k` 检查 I/O 状态，未完成则继续 yield，完成则压入结果返回。
- 上下文 `ctx` 保存请求句柄、缓冲区、状态。
- 错误处理：网络错误通过 `luaL_error` 在 Continuation 中抛出。
- 注意：此实现依赖外部事件循环（如 libuv），C 模块需与事件循环集成。
- 兼容性：Lua 5.3+ 专有，旧版提供同步退化版本。

**题目 9**：分析以下生产事故并给出根因与修复方案：

> 某游戏服务器使用 Lua C API 管理玩家对象。运维发现服务器运行 24 小时后内存从 1GB 增长到 8GB。分析代码发现：每个玩家对象在 C 层用 `malloc` 分配，Lua 侧通过 Light Userdata 持有指针。玩家退出时 C 层调用 `free`，但未通知 Lua。

**参考答案要点**：

- 根因：Light Userdata 不受 Lua GC 管理，C 层 `free` 后 Lua 侧仍持有悬空指针。
- 玩家退出后，Lua 侧的 Light Userdata 仍引用已释放内存，导致：
  - 内存泄漏：Lua 表中累积大量悬空引用。
  - Use-After-Free：若 Lua 误用悬空指针，可能读写非法内存。
- 修复方案 1（推荐）：改用 Full Userdata + `__gc`。
  - `lua_newuserdata` 分配，Lua GC 自动回收。
  - `__gc` 中调用清理逻辑（如保存玩家数据到数据库）。
- 修复方案 2：Light Userdata + 弱引用表。
  - Lua 侧用弱引用表存储 `player_ptr → player_data`。
  - C 层 `free` 时通过 `luaL_unref` 释放引用。
- 修复方案 3：显式 Lua 通知。
  - C 层 `free` 前调用 Lua 函数清理引用。
- 长期建议：避免用 Light Userdata 管理动态生命周期对象，优先 Full Userdata。

---

## 11. 参考文献

### 11.1 Lua 官方文献

- Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 1996. Lua-an extensible extension language. *Software: Practice and Experience* 26, 6 (June 1996), 635-652. DOI: [10.1002/(SICI)1097-024X(199606)26:6<635::AID-SPE26>3.0.CO;2-P](https://doi.org/10.1002/(SICI)1097-024X(199606)26:6<635::AID-SPE26>3.0.CO;2-P).
- Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2007. The evolution of Lua. In *Proceedings of the third ACM SIGPLAN conference on History of programming languages* (HOPL III). ACM, 2-1-2-21. DOI: [10.1145/1238844.1238846](https://doi.org/10.1145/1238844.1238846).
- Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2005. The implementation of Lua 5.0. *Journal of Universal Computer Science* 11, 7 (July 2005), 1159-1176. DOI: [10.3217/jucs-011-07-1159](https://doi.org/10.3217/jucs-011-07-1159).
- Roberto Ierusalimschy. 2016. *Programming in Lua* (4th ed.). Lua.org. ISBN: 978-85-903798-6-3.

### 11.2 Lua C API 文档

- Lua.org. 2024. *Lua 5.4 Reference Manual*. Lua.org. ISBN: 978-85-903798-8-7. Available at: [https://www.lua.org/manual/5.4/](https://www.lua.org/manual/5.4/).
- Lua.org. 2006. *Lua 5.1 Reference Manual*. Lua.org. ISBN: 85-903798-3-3. Available at: [https://www.lua.org/manual/5.1/](https://www.lua.org/manual/5.1/).

### 11.3 LuaJIT 与 FFI

- Pall, M. 2011. LuaJIT 2.0 FFI. Available at: [http://luajit.org/ext_ffi.html](http://luajit.org/ext_ffi.html).
- Pall, M. 2009. LuaJIT 2.0 JIT compiler. Available at: [http://luajit.org/luajit.html](http://luajit.org/luajit.html).

### 11.4 嵌入式 Lua 案例研究

- Carlson, J. L., Johnson, A., and Kibbey, T. 2013. *Redis in Action*. Manning Publications. ISBN: 978-1617290855.
- OpenResty Inc. 2024. *OpenResty Documentation*. Available at: [https://openresty.org/en/](https://openresty.org/en/).
- Neovim Community. 2024. *Neovim Lua API*. Available at: [https://neovim.io/doc/user/lua.html](https://neovim.io/doc/user/lua.html).

### 11.5 虚拟机与编译原理

- Davis, B., Beatty, A., Casey, K., Gregg, D., and Waldspurger, C. 2003. The case for virtual register machines. In *Proceedings of the 2003 workshop on Interpreters, virtual machines and emulators* (IVME '03). ACM, 41-49. DOI: [10.1145/858570.858577](https://doi.org/10.1145/858570.858577).
- Shi, Y., Casey, K., Ertl, M. A., and Gregg, D. 2005. Virtual machine showdown: Stack versus registers. *ACM Transactions on Architecture and Code Optimization (TACO)* 4, 4 (December 2005), 1-36. DOI: [10.1145/1369397.1369399](https://doi.org/10.1145/1369397.1369399).

### 11.6 垃圾回收

- Hudson, R. L., and Moss, J. E. B. 2001. Incremental Collection of Mature Objects. In *Memory Management* (Lecture Notes in Computer Science, Vol. 2150). Springer, 388-401. DOI: [10.1007/3-540-44619-5_27](https://doi.org/10.1007/3-540-44619-5_27).
- Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2012. Passing a language through the eye of a needle. *Communications of the ACM* 55, 7 (July 2012), 38-43. DOI: [10.1145/2209249.2209267](https://doi.org/10.1145/2209249.2209267).

---

## 12. 延伸阅读

### 12.1 官方文档

- Lua 5.4 Reference Manual: [https://www.lua.org/manual/5.4/](https://www.lua.org/manual/5.4/)
- Lua 5.3 Reference Manual: [https://www.lua.org/manual/5.3/](https://www.lua.org/manual/5.3/)
- Lua 5.1 Reference Manual: [https://www.lua.org/manual/5.1/](https://www.lua.org/manual/5.1/)
- LuaJIT FFI Documentation: [http://luajit.org/ext_ffi.html](http://luajit.org/ext_ffi.html)
- LuaJIT JIT Compiler: [http://luajit.org/luajit.html](http://luajit.org/luajit.html)

### 12.2 经典教材

- Roberto Ierusalimschy. *Programming in Lua* (4th ed.). Lua.org, 2016.
- Roberto Ierusalimschy. *Lua Programming Gems*. Lua.org, 2008.
- Klaus Wühlisch et al. *Building Expert Systems in Prolog, Amzi! Inc.*（虽非 Lua 专书，但嵌入式语言章节有借鉴价值）

### 12.3 前沿论文

- "The Evolution of Lua" (HOPL III, 2007)
- "The Implementation of Lua 5.0" (JUCS, 2005)
- "Lua-an extensible extension language" (SPE, 1996)
- "Passing a language through the eye of a needle" (CACM, 2012)

### 12.4 开源项目

- Lua 源码: [https://github.com/lua/lua](https://github.com/lua/lua)
- LuaJIT 源码: [https://github.com/LuaJIT/LuaJIT](https://github.com/LuaJIT/LuaJIT)
- OpenResty: [https://github.com/openresty/openresty](https://github.com/openresty/openresty)
- Kong: [https://github.com/Kong/kong](https://github.com/Kong/kong)
- Redis: [https://github.com/redis/redis](https://github.com/redis/redis)
- Neovim: [https://github.com/neovim/neovim](https://github.com/neovim/neovim)

### 12.5 社区资源

- Lua Users Wiki: [http://lua-users.org/wiki/](http://lua-users.org/wiki/)
- Lua 邮件列表存档: [https://www.lua.org/lua-l.html](https://www.lua.org/lua-l.html)
- Stack Overflow Lua 标签: [https://stackoverflow.com/questions/tagged/lua](https://stackoverflow.com/questions/tagged/lua)

### 12.6 性能调优工具

- luacheck: Lua 静态分析工具，[https://github.com/mpeterv/luacheck](https://github.com/mpeterv/luacheck)
- lua-perf: Lua 性能分析工具
- LuaJIT 的 `-jv` / `-jdump` 参数：JIT 编译日志
- `debug.sethook`: 函数调用追踪

### 12.7 跨语言交互对比

- Python C API: [https://docs.python.org/3/c-api/](https://docs.python.org/3/c-api/)
- Ruby C Extension: [https://docs.ruby-lang.org/en/master/extension_rdoc.html](https://docs.ruby-lang.org/en/master/extension_rdoc.html)
- V8 Embedder's Guide: [https://v8.dev/docs/embed](https://v8.dev/docs/embed)
- JNI (Java Native Interface): [https://docs.oracle.com/en/java/javase/17/docs/specs/jni/index.html](https://docs.oracle.com/en/java/javase/17/docs/specs/jni/index.html)

---

## 附录 A：Lua C API 速查表

### A.1 栈操作

| 函数 | 作用 | 返回值 |
| :--- | :--- | :--- |
| `lua_gettop(L)` | 获取栈大小 | int |
| `lua_settop(L, idx)` | 设置栈顶 | void |
| `lua_pushvalue(L, idx)` | 复制值压栈 | void |
| `lua_pop(L, n)` | 弹出 n 个值 | void |
| `lua_copy(L, from, to)` | 复制值到指定位置 | void |
| `lua_insert(L, idx)` | 移动栈顶到 idx | void |
| `lua_remove(L, idx)` | 移除 idx 处的值 | void |
| `lua_replace(L, idx)` | 替换 idx 处的值 | void |
| `lua_absindex(L, idx)` | 转绝对索引 | int |

### A.2 类型查询

| 函数 | 作用 |
| :--- | :--- |
| `lua_type(L, idx)` | 返回类型常量 |
| `lua_typename(L, t)` | 类型名 |
| `lua_isnil(L, idx)` | 是否为 nil |
| `lua_isnumber(L, idx)` | 是否为 number |
| `lua_isstring(L, idx)` | 是否为 string（或可转换的 number） |
| `lua_isfunction(L, idx)` | 是否为 function |
| `lua_istable(L, idx)` | 是否为 table |
| `lua_isuserdata(L, idx)` | 是否为 userdata |

### A.3 压栈

| 函数 | 作用 |
| :--- | :--- |
| `lua_pushnil(L)` | 压 nil |
| `lua_pushboolean(L, b)` | 压 boolean |
| `lua_pushnumber(L, n)` | 压 number |
| `lua_pushinteger(L, n)` | 压 integer |
| `lua_pushstring(L, s)` | 压 C 字符串 |
| `lua_pushlstring(L, s, len)` | 压指定长度字符串 |
| `lua_pushcfunction(L, fn)` | 压 C 函数 |
| `lua_pushlightuserdata(L, p)` | 压 light userdata |

### A.4 取值

| 函数 | 作用 |
| :--- | :--- |
| `lua_tonumber(L, idx)` | 转为 number |
| `lua_tointeger(L, idx)` | 转为 integer |
| `lua_toboolean(L, idx)` | 转为 boolean |
| `lua_tostring(L, idx)` | 转为字符串（`const char*`） |
| `lua_tolstring(L, idx, len)` | 转字符串并返回长度 |
| `lua_touserdata(L, idx)` | 转为 `void*`（light 或 full） |
| `lua_topointer(L, idx)` | 转为 `const void*`（任何类型） |

### A.5 Table 操作

| 函数 | 作用 |
| :--- | :--- |
| `lua_createtable(L, narr, nrec)` | 创建新表 |
| `lua_newtable(L)` | `lua_createtable(L, 0, 0)` 简写 |
| `lua_gettable(L, idx)` | `t[k]`（k 在栈顶） |
| `lua_settable(L, idx)` | `t[k] = v`（k, v 在栈顶） |
| `lua_getfield(L, idx, k)` | `t[k]`（k 为字符串） |
| `lua_setfield(L, idx, k)` | `t[k] = v` |
| `lua_rawget(L, idx)` | 原始 `t[k]`（无元方法） |
| `lua_rawset(L, idx)` | 原始 `t[k] = v` |
| `lua_rawgeti(L, idx, n)` | `t[n]`（整数键） |
| `lua_rawseti(L, idx, n)` | `t[n] = v` |
| `lua_rawgetp(L, idx, p)` | `t[lightuserdata(p)]` |
| `lua_rawsetp(L, idx, p)` | `t[lightuserdata(p)] = v` |
| `lua_len(L, idx)` | `#t`（调用 `__len`） |
| `lua_rawlen(L, idx)` | 原始 `#t` |

### A.6 元表

| 函数 | 作用 |
| :--- | :--- |
| `lua_getmetatable(L, idx)` | 获取元表 |
| `lua_setmetatable(L, idx)` | 设置元表 |
| `luaL_newmetatable(L, name)` | 创建/获取注册表中的元表 |
| `luaL_getmetatable(L, name)` | 获取注册表中的元表 |
| `luaL_setmetatable(L, name)` | 设为栈顶 Userdata 的元表 |
| `luaL_checkudata(L, arg, name)` | 校验 Userdata 类型 |

### A.7 调用

| 函数 | 作用 |
| :--- | :--- |
| `lua_call(L, nargs, nresults)` | 调用 Lua 函数（无保护） |
| `lua_pcall(L, nargs, nresults, msgh)` | 受保护调用 |
| `lua_callk(L, nargs, nresults, ctx, k)` | 带 Continuation 的调用 |
| `lua_pcallk(L, nargs, nresults, msgh, ctx, k)` | 带 Continuation 的受保护调用 |
| `lua_yieldk(L, nresults, ctx, k)` | 协程 yield |
| `lua_resume(L, from, nargs)` | 恢复协程 |
| `lua_status(L)` | 获取状态机状态 |

### A.8 注册与加载

| 函数 | 作用 |
| :--- | :--- |
| `luaL_newlib(L, l)` | 创建表并注册函数 |
| `luaL_setfuncs(L, l, nup)` | 注册函数到栈顶表 |
| `luaL_requiref(L, name, openf, glb)` | 预加载模块到 `package.loaded` |
| `luaL_loadfile(L, path)` | 加载文件 |
| `luaL_loadstring(L, s)` | 加载字符串 |
| `luaL_dostring(L, s)` | 加载并执行字符串 |
| `luaL_dofile(L, path)` | 加载并执行文件 |

---

## 附录 B：错误码速查

| 错误码 | 值 | 含义 |
| :--- | :--- | :--- |
| `LUA_OK` | 0 | 成功 |
| `LUA_YIELD` | 1 | 协程 yield |
| `LUA_ERRRUN` | 2 | 运行时错误 |
| `LUA_ERRSYNTAX` | 3 | 语法错误 |
| `LUA_ERRMEM` | 4 | 内存分配失败 |
| `LUA_ERRERR` | 5 | 错误处理函数自身出错 |
| `LUA_ERRGCMM` | 6（5.2+） | `__gc` 元方法错误 |

---

## 附录 C：跨版本兼容性矩阵

| API | Lua 5.1 | Lua 5.2 | Lua 5.3 | Lua 5.4 | LuaJIT 2.1 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `luaL_newlib` | 否 | 是 | 是 | 是 | 是 |
| `luaL_setfuncs` | 否 | 是 | 是 | 是 | 是 |
| `luaL_requiref` | 否 | 是 | 是 | 是 | 是 |
| `lua_rawgetp` / `lua_rawsetp` | 否 | 是 | 是 | 是 | 是 |
| `lua_pcallk` / `lua_callk` | 否 | 否 | 是 | 是 | 否 |
| `lua_yieldk` | 否 | 否 | 是 | 是 | 否 |
| `luaL_traceback` | 是 | 是 | 是 | 是 | 是 |
| `lua_setuservalue` / `lua_getuservalue` | 否（用环境表） | 是 | 是 | 否（用 `lua_setiuservalue`） | 是 |
| `lua_setiuservalue` / `lua_getiuservalue` | 否 | 否 | 否 | 是 | 否 |
| `lua_closeslot` | 否 | 否 | 否 | 是 | 否 |
| `luaL_tolstring` | 否 | 否 | 是 | 是 | 是 |
| 整数类型 `lua_Integer` | `ptrdiff_t` | `ptrdiff_t` | `long long` | `long long` | `ptrdiff_t` |
| `LUA_TCDATA` | 否 | 否 | 否 | 否 | 是（LuaJIT 专有） |

### C.1 跨版本迁移建议

- **5.1 → 5.2**：移除 `setfenv`/`getfenv`，改用 `_ENV`；移除 `luaL_register`，改用 `luaL_newlib`。
- **5.2 → 5.3**：整数类型分离，`lua_tointeger` 行为变化；新增位运算符与 `luaL_tolstring`。
- **5.3 → 5.4**：`lua_setuservalue` 改名为 `lua_setiuservalue`，支持多用户值；新增 To-Be-Closed 变量。
- **5.x → LuaJIT**：语法兼容 5.1，部分 5.2 特性通过 `#define LUAJIT_ENABLE_LUA52COMPAT` 启用。

### C.2 兼容层策略

- **条件编译**：使用 `#if LUA_VERSION_NUM` 宏区分版本。
- **宏定义**：为缺失的 API 提供等价宏实现（见 5.6 节）。
- **运行时检测**：避免运行时检测，影响性能。
- **测试矩阵**：CI 矩阵覆盖所有目标 Lua 版本。

---

## 结语

Lua C API 是 Lua 作为嵌入式脚本语言的核心竞争力。其虚拟栈设计在 GC 安全性、ABI 稳定性、跨版本兼容性上展现出卓越的工程智慧，使 Lua 在游戏、Web 网关、配置系统、嵌入式设备等领域长期保持不可替代的地位。

理解 C API 不仅是编写高性能 Lua 扩展的前提，更是洞察语言运行时设计的窗口。从栈操作的细节到 Userdata 的生命周期，从 `lua_pcall` 的错误机制到 `lua_pcallk` 的 Continuation，每个 API 都凝聚着对"宿主与脚本语言协作"这一核心问题的深思熟虑。

随着 Lua 5.4 与 LuaJIT 的并行发展，C API 在保持向后兼容的同时持续演进：To-Be-Closed 变量简化资源管理、整数类型分离提升语义清晰度、Continuation 机制扩展协程能力。掌握 C API 的开发者能够在性能、安全、可维护性之间做出精准权衡，构建出既高效又稳健的跨语言系统。

愿本章内容成为您 Lua 与 C 交互之旅的可靠指南，从基础栈操作到高级 Continuation，从单文件模块到跨版本兼容工程，逐步构建完整的知识体系。
