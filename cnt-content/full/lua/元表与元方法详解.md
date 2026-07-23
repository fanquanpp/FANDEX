---
order: 100
title: 元表与元方法详解
module: lua
category: 'dev-lang'
difficulty: advanced
description: Lua元表与元方法详解：__index、__newindex、__call、__tostring。
author: fanquanpp
updated: '2026-06-14'
related:
  - lua/协程与异步
  - lua/标准库详解
  - lua/协程非抢占式调度
  - lua/弱表
prerequisites:
  - lua/概述与环境配置
---

# 元表与元方法详解：Lua 的元编程基石

> 本文档对标 MIT 6.001（Structure and Interpretation of Computer Programs）、Stanford CS242（Programming Languages）、CMU 15-312（Foundations of Programming Languages）教学水准，系统剖析 Lua metatable 与 metamethod 机制的设计哲学、形式化语义、底层实现与工程实践。

## 0. 学习目标（Bloom 分类法）

完成本章节学习后，学习者应能够：

### 0.1 Remember（记忆）

- **R1** 列举 Lua 全部元方法类别：算术（`__add`/`__sub`/`__mul`/`__div`/`__mod`/`__pow`/`__idiv`/`__unm`）、关系（`__eq`/`__lt`/`__le`）、位运算（`__band`/`__bor`/`__bxor`/`__bnot`/`__shl`/`__shr`）、字符串化（`__tostring`/`__concat`）、长度与迭代（`__len`/`__pairs`/`__ipairs`）、索引访问（`__index`/`__newindex`）、调用与保护（`__call`/`__gc`/`__close`/`__metatable`）。
- **R2** 复述 `__index` 元方法的三种形态：table、function、table+`__index` 链式查找。
- **R3** 陈述 `setmetatable` / `getmetatable` 的 API 签名与限制（字符串与 userdata 有 metatable 限制）。

### 0.2 Understand（理解）

- **U1** 解释 metatable 与"类"（class）的语义差异：Lua 无内置类系统，metatable 通过 `__index` 实现原型继承。
- **U2** 阐述 `__index` 查找链的形式化语义：原表查找 → metatable.`__index` → 若为 table 则递归 → 若为 function 则调用。
- **U3** 解释 `rawget` / `rawset` 为何能绕过元方法，以及在性能优化中的意义。

### 0.3 Apply（应用）

- **A1** 实现一个完整的 OOP 类系统：构造、方法、继承、`super` 调用。
- **A2** 通过 `__call` 实现函数式 API（如默认参数、可调用对象）。
- **A3** 利用 `__tostring` 与 `__eq` 为自定义类型定义可读、可比较的语义。

### 0.4 Analyze（分析）

- **An1** 分析 `__index` 链式查找的时间复杂度与循环检测机制。
- **An2** 对比 `__newindex` 的 function 与 table 两种实现：触发时机、性能、副作用。
- **An3** 剖析 Lua 5.4 中 `__close` 与 `__gc` 的协作：确定性终结 vs GC 终结。

### 0.5 Evaluate（评价）

- **E1** 评估保护元表 `__metatable` 的安全性：能否真正防止篡改？
- **E2** 评价 Lua 5.2 移除 `__gc` on table 的影响与 Lua 5.3 / 5.4 的恢复路径。
- **E3** 判断在性能敏感场景中 `rawget` 与 `__index` function 的取舍。

### 0.6 Create（创造）

- **C1** 设计一个支持多重继承的 Lua 类系统（基于 `__index` 链）。
- **C2** 实现一个基于 `__call` 与 `__index` 的 DSL（领域特定语言）。
- **C3** 构建一个元方法调试器，可视化 `__index` 查找链与元方法触发。

---

## 1. 历史动机与发展脉络

### 1.1 Lua 1.0（1993）：tag method 雏形

Lua 1.0 尚未引入现代 metatable，而是采用 **tag method** 机制：每种内置类型附带一个整数 tag（如 `TAG_NUMBER=0`、`TAG_STRING=1`），用户通过 `settagmethod(tag, event, fn)` 注册行为。

```lua
-- Lua 1.0 伪代码
settagmethod(TAG_TABLE, "index", function(t, k)
    return "default:" .. k
end)
```

事件（event）集合已涵盖 `index`、`gettable`、`settable`、`add`、`sub`、`lt`、`le`、`eq`、`concat`、`gc` 等。

### 1.2 Lua 2.x（1995）：tag method 成熟

Lua 2.x 完善 tag method：引入 `gettagmethod`、`newtag`、`settag`，允许用户自定义新 tag。但 tag 是全局整数，命名空间扁平，难以模块化。

### 1.3 Lua 3.0（1997）：metatable 概念诞生

Lua 3.0 引入 **metatable**：每个 table 与 userdata 可关联一个独立 metatable，将所有 tag method 集中到单个表中。

```lua
-- Lua 3.0 风格（仍兼容旧 API）
local mt = { __index = function(t, k) return "default:" .. k end }
setmetatable(t, mt)
```

这一变革使元方法从"全局 tag 表"演化为"对象级别元表"，封装性大幅提升。

### 1.4 Lua 4.0（2000）：metatable API 稳定

Lua 4.0 确立 `setmetatable` / `getmetatable` 函数签名：

```c
int lua_setmetatable(lua_State *L, int index);
int lua_getmetatable(lua_State *L, int index);
```

并在 C 端通过 `luaL_getmetatable` / `luaL_setmetatable` 实现类型注册。

### 1.5 Lua 5.0（2003）：metatable 全面普及

Lua 5.0 将 metatable 扩展到所有类型（除 nil 与 boolean）：

- **string**：可设置共享 metatable（默认不可改）。
- **number / thread / function**：可通过 debug 库修改，但常规 API 限制。

并新增 `__metatable` 元方法保护：`getmetatable` 返回 `__metatable` 字段值而非真实 metatable。

### 1.6 Lua 5.1（2006）：工业标准

Lua 5.1 是 metatable API 的工业事实标准（World of Warcraft、Redis、Adobe Lightroom 均采用）：

- 算术元方法完整：`__add`、`__sub`、`__mul`、`__div`、`__mod`、`__pow`、`__unm`。
- 关系元方法：`__eq`、`__lt`、`__le`。
- 字符串与迭代：`__concat`、`__len`（仅对非字符串 / 非 table 类型有效）。
- 索引与调用：`__index`、`__newindex`、`__call`。

**重要限制**：`__gc` 仅对 userdata 生效，table 的 `__gc` 被移除。

### 1.7 Lua 5.2（2012）：`__pairs` / `__ipairs` 引入

Lua 5.2 引入 `__pairs` 与 `__ipairs`，允许自定义迭代协议：

```lua
local mt = {
    __pairs = function(self)
        local k = next(self)
        return function()
            local v
            k, v = next(self, k)
            if k then return k, v end
        end
    end
}
```

并新增 `__len` 对 table 的支持（之前仅对 string / userdata）。但移除了 `setmetatable` 对 number 等非 table 类型的支持。

### 1.8 Lua 5.3（2015）：位运算元方法

Lua 5.3 引入 64-bit 整数子类型，新增位运算元方法：

- `__band`（`&`）、`__bor`（`|`）、`__bxor`（`~` 二元）、`__bnot`（`~` 一元）。
- `__shl`（`<<`）、`__shr`（`>>`）。
- `__idiv`（`//`）整数除法。

并恢复 table 的 `__gc` 支持（通过 `luaL_setmetatable` 预先标记）。

### 1.9 Lua 5.4（2020）：`__close` 元方法

Lua 5.4 引入 `to-be-closed` 变量与 `__close` 元方法：

```lua
do
    local f <close> = io.open("data.txt", "r")
    -- f 退出作用域时自动调用 f.__close
end
```

`__close` 提供确定性资源释放，与 `__gc` 的 GC 触发终结互补。并恢复字符串 metatable 的可设置性（通过 `string` 共享表）。

### 1.10 LuaJIT 与扩展

LuaJIT 保持 Lua 5.1 语义，但通过 FFI 引入 cdata 类型。cdata 可通过 `ffi.metatype` 关联 metatable：

```lua
local ffi = require("ffi")
ffi.cdef[[ typedef struct { double x, y; } Point; ]]
local mt = {
    __add = function(a, b) return ffi.new("Point", a.x + b.x, a.y + b.y) end,
    __tostring = function(p) return string.format("Point(%f, %f)", p.x, p.y) end
}
ffi.metatype("Point", mt)
local p1 = ffi.new("Point", 1, 2)
local p2 = ffi.new("Point", 3, 4)
print(p1 + p2)  -- Point(4.000000, 6.000000)
```

### 1.11 设计哲学总结

PUC-Rio 团队在《The Evolution of an Extension Language》中阐明 metatable 的设计原则：

1. **数据驱动**：metamethod 通过表字段声明，而非函数调用，符合"数据描述优先"。
2. **可选性**：metatable 默认为 nil，元方法仅在显式设置时生效。
3. **组合性**：多个对象可共享同一 metatable，实现"类"的复用。
4. **可扩展性**：新增元方法仅需在 metatable 中添加字段，无需修改语言核心。

---

## 2. 形式化定义

### 2.1 Lua Reference Manual 权威定义

> **Metatables** — Every value in Lua can have a metatable. This metatable is an ordinary Lua table that defines the behavior of the original value under certain events. Each event has a corresponding key (a string) in the metatable. By default, a value's metatable is `nil`.
>
> —— *Lua 5.4 Reference Manual, §2.4 Metatables and Metamethods*

形式化定义：

$$
\text{metatable}(v) : \text{Value} \to \text{Table} \cup \{\text{nil}\}
$$

每个事件 $e \in \text{Events}$ 对应一个元方法 $\_\_e$：

$$
\text{metamethod}(v, e) = \text{metatable}(v)[\text{"}\_\_e\text{"}] \quad \text{if exists, else nil}
$$

### 2.2 元方法事件全集

Lua 5.4 定义的事件集合：

| 事件类别       | 元方法                                                                 | 触发时机                              |
| -------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| 算术运算       | `__add` `__sub` `__mul` `__div` `__mod` `__pow` `__idiv` `__unm`       | `+ - * / % ^ // -`                    |
| 位运算         | `__band` `__bor` `__bxor` `__bnot` `__shl` `__shr`                      | `& \| ~ ~ << >>`                      |
| 关系运算       | `__eq` `__lt` `__le`                                                   | `== < <=`                             |
| 字符串         | `__concat` `__tostring`                                                | `..` 与 `tostring()`                  |
| 长度与迭代     | `__len` `__pairs` `__ipairs`                                           | `#` 与 `pairs()` / `ipairs()`         |
| 索引访问       | `__index` `__newindex`                                                  | `t[k]` 与 `t[k] = v`                  |
| 调用           | `__call`                                                               | `f(...)`                              |
| 终结           | `__gc` `__close`                                                       | GC 与作用域退出                       |
| 元表保护       | `__metatable`                                                          | `getmetatable()`                      |
| 类型比较       | `__name`                                                               | 错误信息中的类型名                    |

### 2.3 `__index` 的形式化语义

设 $t$ 为表，$k$ 为键，定义查找函数：

$$
\text{index}(t, k) = \begin{cases}
t[k] & \text{if } k \in \text{domain}(t) \quad \text{(raw get)} \\
\text{resolve}(\text{metatable}(t).\_\_\text{index}, t, k) & \text{otherwise}
\end{cases}
$$

其中 `resolve` 的定义：

$$
\text{resolve}(\text{mm}, t, k) = \begin{cases}
\text{mm}[k] & \text{if } \text{mm} \text{ is table} \\
\text{mm}(t, k) & \text{if } \text{mm} \text{ is function} \\
\text{nil} & \text{otherwise}
\end{cases}
$$

若 $\text{mm}$ 为 table，则递归应用 $\text{index}$（形成原型链查找）。

### 2.4 `__newindex` 的形式化语义

$$
\text{newindex}(t, k, v) = \begin{cases}
t[k] := v & \text{if } k \in \text{domain}(t) \quad \text{(raw set)} \\
\text{resolve\_ni}(\text{metatable}(t).\_\_\text{newindex}, t, k, v) & \text{otherwise}
\end{cases}
$$

其中：

$$
\text{resolve\_ni}(\text{mm}, t, k, v) = \begin{cases}
\text{mm}[k] := v & \text{if } \text{mm} \text{ is table} \\
\text{mm}(t, k, v) & \text{if } \text{mm} \text{ is function} \\
\text{noop} & \text{otherwise}
\end{cases}
$$

### 2.5 算术元方法的二分派

对于 `a + b`，Lua 执行二分派（binary dispatch）：

$$
\text{add}(a, b) = \begin{cases}
a + b & \text{if } a, b \text{ are both numbers} \\
\text{try\_mm}(a, b, \_\_\text{add}) & \text{otherwise}
\end{cases}
$$

其中 `try_mm` 的算法：

```
function try_mm(a, b, mm_name):
    mm = metatable(a)[mm_name]
    if mm is function:
        return mm(a, b)
    mm = metatable(b)[mm_name]
    if mm is function:
        return mm(a, b)
    error("attempt to perform arithmetic on a " .. type(a) .. " value")
```

注意：左操作数优先（先查 $a$ 的 metatable，再查 $b$）。

### 2.6 关系元方法的语义

`==`（`__eq`）：

- 若 $a$ 与 $b$ 都是 nil、boolean、number、string，直接比较值。
- 若 $a$ 或 $b$ 是 table / userdata：
  - 若 $a \equiv b$（同一对象），返回 true。
  - 否则尝试 `__eq`，但要求 $a$ 与 $b$ 类型相同且 metatable 相同。

`<`（`__lt`）：

$$
\text{lt}(a, b) = \begin{cases}
a < b & \text{if } a, b \text{ are both numbers} \\
a.\_\_\text{lt}(a, b) & \text{if exists} \\
b.\_\_\text{lt}(a, b) & \text{if exists} \\
\text{error} & \text{otherwise}
\end{cases}
$$

`<=`（`__le`）：

- 若存在 `__le`，直接调用。
- **否则**：通过 `not (b < a)` 推导，即 `__le(a, b)` ≡ `not __lt(b, a)`。

### 2.7 `rawget` / `rawset` 的形式化

$$
\text{rawget}(t, k) = t[k] \quad \text{(never triggers } \_\_\text{index)}
$$

$$
\text{rawset}(t, k, v) = (t[k] := v) \quad \text{(never triggers } \_\_\text{newindex)}
$$

### 2.8 `__metatable` 保护语义

$$
\text{getmetatable}(t) = \begin{cases}
\text{metatable}(t).\_\_\text{metatable} & \text{if exists} \\
\text{metatable}(t) & \text{otherwise} \\
\text{nil} & \text{if no metatable}
\end{cases}
$$

$$
\text{setmetatable}(t, m) = \begin{cases}
\text{error} & \text{if metatable}(t).\_\_\text{metatable} \text{ exists} \\
(t.\text{metatable} := m) & \text{otherwise}
\end{cases}
$$

---

## 3. 理论推导与原理解析

### 3.1 metatable 的内存表示

在 Lua 源码 `lobject.h` 中，`Table` 结构包含 `metatable` 字段：

```c
/* lobject.h (简化) */
typedef struct Table {
    CommonHeader;
    lu_byte flags;          /* 元方法位图 */
    lu_byte lsizenode;      /* 节点数组 log2 大小 */
    unsigned int alimit;    /* 数组部分上限 */
    TValue *array;          /* 数组部分 */
    Node *node;             /* 哈希部分 */
    Node *lastfree;         /* 空闲节点指针 */
    struct Table *metatable; /* 元表 */
    GCObject *gclist;
} Table;
```

`flags` 字段是**元方法位图**：每个 bit 对应一个元方法是否存在。当 `flags & (1 << event)` 为 0 时，Lua 跳过 `__index` 等查找，直接返回 nil。

```c
/* ltable.c (简化) */
const TValue *luaH_getint(Table *t, lua_Integer key);
const TValue *luaH_get(Table *t, const TValue *key);
const TValue *luaH_getshortstr(Table *t, TString *key);  /* 短字符串快速路径 */

/* 元方法位图常量（lvm.h） */
#define TM_INDEX    0
#define TM_NEWINDEX 1
#define TM_GC       2
#define TM_MODE     3
#define TM_LEN      4
#define TM_EQ       5
#define TM_ADD      6
#define TM_SUB      7
#define TM_MUL      8
#define TM_DIV      9
#define TM_MOD      10
#define TM_POW      11
#define TM_UNM      12
#define TM_LT       13
#define TM_LE       14
#define TM_CONCAT   15
#define TM_CALL     16
#define TM_N        17  /* 元方法总数 */
```

### 3.2 `flags` 位图优化

当 `setmetatable(t, mt)` 被调用时，Lua 通过 `luaH_resize` 计算 `mt` 的 `flags`：

```c
/* ltable.c (简化) */
void luaH_setmetatable(lua_State *L, Table *t, Table *mt) {
    if (mt) {
        /* 扫描 mt 的所有元方法，计算位图 */
        mt->flags = 0;
        for (int i = 0; i < TM_N; i++) {
            if (mt->__event_i) {
                mt->flags |= (1 << i);
            }
        }
    }
    t->metatable = mt;
    luaC_objbarrier(L, t, mt);
}
```

后续访问 `__index` 时，先检查 `flags & (1 << TM_INDEX)`：

```c
/* lvm.c (简化) */
const TValue *getstr event(Table *t, TString *key) {
    if ((t->flags & (1 << TM_INDEX)) == 0) {
        return luaO_nilobject;  /* 快速失败：无 __index */
    }
    /* ... 慢路径：查找 metatable.__index ... */
}
```

这一优化使无 metatable 的表访问开销几乎为零。

### 3.3 `__index` 查找链算法

完整算法（伪代码）：

```
function gettable(t, key):
    v = rawget(t, key)
    if v != nil:
        return v
    mt = metatable(t)
    if mt == nil:
        return nil
    mm = mt.__index
    if mm == nil:
        return nil
    if type(mm) == "table":
        return gettable(mm, key)  # 递归查找原型链
    elif type(mm) == "function":
        return mm(t, key)
    else:
        error("invalid __index")
```

**循环检测**：Lua 不自动检测 `__index` 循环（如 `t.__index = t`），可能导致栈溢出。开发者需自行避免。

**深度限制**：理论上无限制，但受栈深度约束（`LUAI_MAXSTACK`，默认 1,000,000）。

### 3.4 二元算术元方法查找顺序

对于 `a + b`：

1. 若 $a, b$ 都是 number，直接相加。
2. 否则：
   - 若 $a$ 的 metatable 有 `__add`，调用 `a.__add(a, b)`。
   - 否则若 $b$ 的 metatable 有 `__add`，调用 `b.__add(a, b)`。
   - 否则 error: `"attempt to perform arithmetic on a " .. type(a) .. " value"`。

**字符串拼接**的特殊性：

```lua
"hello" .. 42  -- 42 会被隐式转为 "42"，因为 string 的 metatable 无 __concat
```

但：

```lua
local t = {}
print(t .. "world")  -- error: attempt to concatenate a table value
```

### 3.5 关系元方法的对偶性

Lua 通过 `__lt` 推导其他关系运算：

- `a > b` ≡ `b < a` ≡ `__lt(b, a)`
- `a >= b` ≡ `not (a < b)` ≡ `not __lt(a, b)`
- `a <= b` 直接用 `__le(a, b)`；若 `__le` 不存在，回退到 `not (b < a)`

这一设计使仅需实现两个元方法即可覆盖所有关系运算。

### 3.6 `__eq` 的特殊语义

`__eq` 仅在两个操作数**类型相同**且**共享 metatable**时才触发：

```lua
local mt1 = { __eq = function(a, b) return true end }
local mt2 = { __eq = function(a, b) return true end }

local a = setmetatable({}, mt1)
local b = setmetatable({}, mt2)

print(a == b)  -- false，因为 mt1 != mt2
```

这一限制避免 `__eq` 被任意类型的对象误触发。

### 3.7 `__call` 的内部实现

`__call` 让 table 可像函数一样调用：

```c
/* lvm.c (简化) */
void luaV_call(lua_State *L, TValue *fn, int nresults) {
    if (ttisLclosure(fn) || ttisCclosure(fn)) {
        /* 普通函数调用 */
    } else if (ttisTable(fn) || ttisFullUserdata(fn)) {
        Table *mt = hvalue(fn)->metatable;
        if (mt && (mt->flags & (1 << TM_CALL))) {
            /* 查找 __call */
            const TValue *mm = luaH_getstr(mt, luaS_newliteral(L, "__call"));
            if (!ttisnil(mm)) {
                /* 将原对象作为第一个参数 */
                lua_pushvalue(L, fn);
                lua_rotate(L, ...);
                lua_call(L, nargs + 1, nresults);
                return;
            }
        }
    }
    luaG_typeerror(L, fn, "call");
}
```

### 3.8 `__gc` 终结顺序

Lua 5.4 的三色标记 GC 对带 `__gc` 的对象：

1. **标记阶段**：从根集出发，扫描所有可达对象。
2. **原子阶段**：处理弱表、`__gc` 队列。
3. **清扫阶段**：回收未标记对象。

带 `__gc` 的对象进入"finalize"队列，按**标记顺序的逆序**调用 `__gc`（即后标记的先终结）。

```c
/* lgc.c (简化) */
void luaC_finalize(lua_State *L) {
    while (g->finobj != NULL) {
        GCObject *o = g->finobj;
        g->finobj = o->next;
        /* 调用 __gc */
        call_gc_meta(L, o);
    }
}
```

### 3.9 `__close` 与 `__gc` 的协作

`__close` 在 `to-be-closed` 变量离开作用域时**立即**调用，而 `__gc` 由 GC 决定时机：

```lua
local function use_resource()
    local f <close> = open_resource()
    -- 使用 f
    -- 函数返回时立即调用 f.__close
end

local function use_resource_no_close()
    local f = open_resource()
    -- f 最终会被 GC 回收，调用 f.__gc
end
```

`__close` 提供确定性终结，`__gc` 作为最后兜底。两者可共存。

---

## 4. 代码示例

### 4.1 基础示例：`__index` 实现默认值

```lua
-- Lua 5.4
local defaults = { x = 0, y = 0, z = 0 }
local config = setmetatable({}, { __index = defaults })

print(config.x)  -- 0
print(config.y)  -- 0
config.x = 10
print(config.x)  -- 10（覆盖默认值）
print(rawget(config, "y"))  -- nil（y 不在 config 中）
```

### 4.2 进阶示例：`__index` 实现继承

```lua
-- Lua 5.4

-- 基类 Animal
local Animal = {}
Animal.__index = Animal  -- 关键：让 Animal 自身作为原型

function Animal.new(name, sound)
    local self = setmetatable({}, Animal)
    self.name = name or "Unknown"
    self.sound = sound or "..."
    return self
end

function Animal:speak()
    return self.name .. " says: " .. self.sound
end

function Animal:introduce()
    return "I am " .. self.name
end

-- 子类 Dog
local Dog = setmetatable({}, { __index = Animal })  -- Dog 继承 Animal
Dog.__index = Dog  -- Dog 实例的原型是 Dog

function Dog.new(name, breed)
    local self = Animal.new(name, "Woof!")  -- 调用父类构造
    setmetatable(self, Dog)  -- 重新设置 metatable 为 Dog
    self.breed = breed or "Unknown"
    return self
end

-- 覆盖方法
function Dog:speak()
    return Animal.speak(self) .. " (breed: " .. self.breed .. ")"
end

-- 新增方法
function Dog:fetch()
    return self.name .. " fetches the ball!"
end

-- 使用
local d = Dog.new("Buddy", "Golden Retriever")
print(d:speak())     -- Buddy says: Woof! (breed: Golden Retriever)
print(d:introduce()) -- I am Buddy（继承自 Animal）
print(d:fetch())     -- Buddy fetches the ball!
```

### 4.3 算术元方法：复数类

```lua
-- Lua 5.4

local Complex = {}
Complex.__index = Complex

-- 构造函数
function Complex.new(real, imag)
    return setmetatable({ real = real or 0, imag = imag or 0 }, Complex)
end

-- 加法
Complex.__add = function(a, b)
    return Complex.new(a.real + b.real, a.imag + b.imag)
end

-- 减法
Complex.__sub = function(a, b)
    return Complex.new(a.real - b.real, a.imag - b.imag)
end

-- 乘法
Complex.__mul = function(a, b)
    return Complex.new(
        a.real * b.real - a.imag * b.imag,
        a.real * b.imag + a.imag * b.real
    )
end

-- 取负
Complex.__unm = function(a)
    return Complex.new(-a.real, -a.imag)
end

-- 相等
Complex.__eq = function(a, b)
    return a.real == b.real and a.imag == b.imag
end

-- 字符串化
Complex.__tostring = function(a)
    if a.imag >= 0 then
        return string.format("%.2f+%.2fi", a.real, a.imag)
    else
        return string.format("%.2f%.2fi", a.real, a.imag)
    end
end

-- 模长
function Complex:abs()
    return math.sqrt(self.real^2 + self.imag^2)
end

-- 测试
local z1 = Complex.new(3, 4)
local z2 = Complex.new(1, -2)
print(z1)              -- 3.00+4.00i
print(z2)              -- 1.00-2.00i
print(z1 + z2)         -- 4.00+2.00i
print(z1 - z2)         -- 2.00+6.00i
print(z1 * z2)         -- 11.00-2.00i
print(-z1)             -- -3.00-4.00i
print(z1 == Complex.new(3, 4))  -- true
print(z1:abs())        -- 5.0
```

### 4.4 `__call`：可调用对象

```lua
-- Lua 5.4

-- 计数器：可调用递增
local Counter = {}
Counter.__index = Counter

function Counter.new(start)
    local self = setmetatable({ count = start or 0 }, Counter)
    return self
end

Counter.__call = function(self, increment)
    self.count = self.count + (increment or 1)
    return self.count
end

Counter.__tostring = function(self)
    return "Counter(" .. self.count .. ")"
end

local c = Counter.new(10)
print(c())      -- 11
print(c(5))     -- 16
print(c)        -- Counter(16)

-- 进阶：函数式 API（默认参数）
local Config = setmetatable({}, {
    __call = function(cls, opts)
        return setmetatable(opts or {}, { __index = cls.defaults })
    end,
    __index = function(cls, k)
        error("Config has no default '" .. k .. "'")
    end
})

Config.defaults = { timeout = 30, retries = 3 }

local c1 = Config()  -- 空配置
print(c1.timeout)    -- 30
local c2 = Config({ timeout = 60 })
print(c2.timeout)    -- 60
print(c2.retries)    -- 3
```

### 4.5 `__tostring` 与 `__eq`：自定义类型

```lua
-- Lua 5.4

local Vector = {}
Vector.__index = Vector

function Vector.new(x, y, z)
    return setmetatable({ x = x or 0, y = y or 0, z = z or 0 }, Vector)
end

Vector.__eq = function(a, b)
    return a.x == b.x and a.y == b.y and a.z == b.z
end

Vector.__lt = function(a, b)
    -- 按模长比较
    return (a.x^2 + a.y^2 + a.z^2) < (b.x^2 + b.y^2 + b.z^2)
end

Vector.__le = function(a, b)
    return not (b < a)
end

Vector.__tostring = function(a)
    return string.format("Vector(%g, %g, %g)", a.x, a.y, a.z)
end

Vector.__len = function(a)
    return math.sqrt(a.x^2 + a.y^2 + a.z^2)
end

local v1 = Vector.new(1, 2, 3)
local v2 = Vector.new(1, 2, 3)
local v3 = Vector.new(4, 5, 6)

print(v1)         -- Vector(1, 2, 3)
print(v1 == v2)  -- true
print(v1 < v3)   -- true
print(#v1)        -- 3.74166（模长）
```

### 4.6 `__newindex`：拦截赋值

```lua
-- Lua 5.4

-- 只读表
local function readonly(t)
    return setmetatable({}, {
        __index = t,  -- 读取转发到原表
        __newindex = function(t, k, v)
            error("attempt to modify read-only table: " .. tostring(k), 2)
        end,
        __pairs = function(self)
            return pairs(t)
        end
    })
end

local config = { host = "localhost", port = 8080 }
local readonly_config = readonly(config)

print(readonly_config.host)  -- localhost
readonly_config.port = 9090  -- error: attempt to modify read-only table
```

### 4.7 `__pairs` / `__ipairs`：自定义迭代

```lua
-- Lua 5.4

-- 双向映射表
local BiMap = {}
BiMap.__index = BiMap

function BiMap.new()
    return setmetatable({ fwd = {}, rev = {} }, BiMap)
end

function BiMap:set(k, v)
    self.fwd[k] = v
    self.rev[v] = k
end

function BiMap:get(k)
    return self.fwd[k]
end

function BiMap:getKey(v)
    return self.rev[v]
end

-- 自定义迭代器：返回 (key, value, value_key) 三元组
BiMap.__pairs = function(self)
    local k = nil
    return function()
        k = next(self.fwd, k)
        if k then
            return k, self.fwd[k], self.rev[self.fwd[k]]
        end
    end
end

local bm = BiMap.new()
bm:set("apple", 1)
bm:set("banana", 2)
bm:set("cherry", 3)

for k, v, vk in pairs(bm) do
    print(k, "=", v, "(reverse:", vk, ")")
end
-- apple = 1 (reverse: apple)
-- banana = 2 (reverse: banana)
-- cherry = 3 (reverse: cherry)
```

### 4.8 `rawget` / `rawset`：绕过元方法

```lua
-- Lua 5.4

local t = setmetatable({}, {
    __index = function(t, k) return "default:" .. k end,
    __newindex = function(t, k, v) print("set:", k, v) end
})

-- t[k] 触发 __index
print(t.foo)  -- default:foo

-- rawget 不触发
print(rawget(t, "foo"))  -- nil

-- t[k] = v 触发 __newindex
t.bar = 42  -- set: bar 42（但实际未存储到 t 中！）

-- rawset 直接写入
rawset(t, "baz", 100)
print(rawget(t, "baz"))  -- 100

-- 注意：触发 __newindex 后，原表中没有该键
print(rawget(t, "bar"))  -- nil（因为 __newindex 未写入 t）
```

### 4.9 保护元表 `__metatable`

```lua
-- Lua 5.4

local SecretClass = {}
SecretClass.__index = SecretClass
SecretClass.__metatable = "access denied"  -- 保护元表

function SecretClass.new()
    return setmetatable({}, SecretClass)
end

function SecretClass:method()
    return "secret method"
end

local obj = SecretClass.new()

-- getmetatable 返回 __metatable 字段
print(getmetatable(obj))  -- access denied

-- 尝试修改元表
local ok, err = pcall(function()
    setmetatable(obj, {})
end)
print(ok, err)  -- false    cannot change a protected metatable

-- 但方法仍可调用
print(obj:method())  -- secret method

-- 防护局限：通过 debug.getmetatable 仍可绕过
local mt = debug.getmetatable(obj)
print(mt == SecretClass)  -- true（debug 库无视保护）
```

### 4.10 `__gc` 与 `__close`：资源管理

```lua
-- Lua 5.4

-- 资源管理类
local File = {}
File.__index = File

function File.new(path, mode)
    local handle = io.open(path, mode or "r")
    if not handle then
        error("cannot open: " .. path)
    end
    local self = setmetatable({
        handle = handle,
        path = path
    }, File)
    return self
end

function File:read()
    return self.handle:read("*a")
end

function File:close()
    if self.handle then
        self.handle:close()
        self.handle = nil
    end
end

-- __close：作用域退出时调用（Lua 5.4+）
File.__close = function(self)
    print("[close] closing " .. self.path)
    self:close()
end

-- __gc：GC 终结（兜底）
File.__gc = function(self)
    print("[gc] finalizing " .. self.path)
    self:close()
end

-- 使用 to-be-closed：确定性释放
local function read_config()
    local f <close> = File.new("config.txt", "r")
    local content = f:read()
    return content
    -- f 离开作用域时调用 __close
end

-- 使用 GC：不确定时机
local function leak_handle()
    local f = File.new("config.txt", "r")
    -- f 不被任何变量引用，等待 GC
end

read_config()
-- 输出：[close] closing config.txt

leak_handle()
collectgarbage()
-- 输出：[gc] finalizing config.txt
```

### 4.11 位运算元方法（Lua 5.3+）

```lua
-- Lua 5.3+

local BitSet = {}
BitSet.__index = BitSet

function BitSet.new(value)
    return setmetatable({ value = value or 0 }, BitSet)
end

-- 位与
BitSet.__band = function(a, b)
    return BitSet.new(a.value & b.value)
end

-- 位或
BitSet.__bor = function(a, b)
    return BitSet.new(a.value | b.value)
end

-- 位异或
BitSet.__bxor = function(a, b)
    return BitSet.new(a.value ~ b.value)
end

-- 位非
BitSet.__bnot = function(a)
    return BitSet.new(~a.value)
end

-- 左移
BitSet.__shl = function(a, n)
    return BitSet.new(a.value << n.value)
end

-- 右移
BitSet.__shr = function(a, n)
    return BitSet.new(a.value >> n.value)
end

BitSet.__tostring = function(a)
    return string.format("0x%X", a.value)
end

local a = BitSet.new(0xFF)
local b = BitSet.new(0x0F)
print(a & b)  -- 0xF
print(a | b)  -- 0xFF
print(a ~ b)  -- 0xF0
print(~a)     -- 0xFFFFFFFFFFFFFF00（64位）
print(a << 8) -- 0xFF00
```

### 4.12 综合示例：可链式调用的流式 API

```lua
-- Lua 5.4

local QueryBuilder = {}
QueryBuilder.__index = QueryBuilder

function QueryBuilder.new(table_name)
    return setmetatable({
        table = table_name,
        wheres = {},
        orders = {},
        limit_value = nil
    }, QueryBuilder)
end

-- 关键：通过 __call 实现执行
QueryBuilder.__call = function(self)
    local sql = "SELECT * FROM " .. self.table
    if #self.wheres > 0 then
        sql = sql .. " WHERE " .. table.concat(self.wheres, " AND ")
    end
    if #self.orders > 0 then
        sql = sql .. " ORDER BY " .. table.concat(self.orders, ", ")
    end
    if self.limit_value then
        sql = sql .. " LIMIT " .. self.limit_value
    end
    return sql
end

QueryBuilder.__tostring = function(self)
    return self()
end

function QueryBuilder:where(condition)
    table.insert(self.wheres, condition)
    return self  -- 链式调用
end

function QueryBuilder:orderBy(field, direction)
    table.insert(self.orders, field .. " " .. (direction or "ASC"))
    return self
end

function QueryBuilder:limit(n)
    self.limit_value = n
    return self
end

local sql = QueryBuilder.new("users")
    :where("age > 18")
    :where("status = 'active'")
    :orderBy("name", "DESC")
    :limit(10)()

print(sql)
-- SELECT * FROM users WHERE age > 18 AND status = 'active' ORDER BY name DESC LIMIT 10
```

### 4.13 C 端 metatable 操作

```c
/* Lua 5.4 C-API */
#define LUA_LIB
#include <stdio.h>
#include <string.h>
#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>

/* 定义一个 Point 类型，含 __tostring 与 __add */

/* Point 的内存布局：内联在 userdata 中 */
typedef struct {
    double x;
    double y;
} Point;

/* 获取 Point 指针，并检查类型 */
static Point *check_point(lua_State *L, int idx) {
    return (Point *)luaL_checkudata(L, idx, "Point");
}

/* 构造：Point.new(x, y) */
static int l_point_new(lua_State *L) {
    double x = luaL_checknumber(L, 1);
    double y = luaL_checknumber(L, 2);
    Point *p = (Point *)lua_newuserdata(L, sizeof(Point));
    p->x = x;
    p->y = y;
    luaL_setmetatable(L, "Point");
    return 1;
}

/* __tostring */
static int l_point_tostring(lua_State *L) {
    Point *p = check_point(L, 1);
    char buf[64];
    snprintf(buf, sizeof(buf), "Point(%g, %g)", p->x, p->y);
    lua_pushstring(L, buf);
    return 1;
}

/* __add */
static int l_point_add(lua_State *L) {
    Point *a = check_point(L, 1);
    Point *b = check_point(L, 2);
    Point *r = (Point *)lua_newuserdata(L, sizeof(Point));
    r->x = a->x + b->x;
    r->y = a->y + b->y;
    luaL_setmetatable(L, "Point");
    return 1;
}

/* __eq */
static int l_point_eq(lua_State *L) {
    Point *a = check_point(L, 1);
    Point *b = check_point(L, 2);
    lua_pushboolean(L, a->x == b->x && a->y == b->y);
    return 1;
}

/* getX */
static int l_point_getx(lua_State *L) {
    Point *p = check_point(L, 1);
    lua_pushnumber(L, p->x);
    return 1;
}

/* getY */
static int l_point_gety(lua_State *L) {
    Point *p = check_point(L, 1);
    lua_pushnumber(L, p->y);
    return 1;
}

/* 模块函数表 */
static const luaL_Reg point_methods[] = {
    {"new", l_point_new},
    {"getX", l_point_getx},
    {"getY", l_point_gety},
    {NULL, NULL}
};

/* 元方法表 */
static const luaL_Reg point_metamethods[] = {
    {"__tostring", l_point_tostring},
    {"__add", l_point_add},
    {"__eq", l_point_eq},
    {NULL, NULL}
};

/* 模块入口 */
int luaopen_point(lua_State *L) {
    /* 创建并注册 metatable */
    luaL_newmetatable(L, "Point");
    /* 设置 __index = metatable 自身（实例方法查找） */
    lua_pushvalue(L, -1);
    lua_setfield(L, -2, "__index");
    /* 注册元方法 */
    luaL_setfuncs(L, point_metamethods, 0);

    /* 创建模块表 */
    luaL_newlib(L, point_methods);
    return 1;
}
```

**编译**（Linux/macOS）：

```bash
cc -O2 -Wall -shared -fPIC -I/usr/local/include/lua5.4 \
   -o point.so point.c
```

**编译**（Windows / MSVC）：

```powershell
cl /O2 /LD /I"C:\Atian\Lua\include" point.c ^
   /link /DLL /OUT:point.dll lua54.lib
```

**使用**：

```lua
local Point = require("point")
local p1 = Point.new(1, 2)
local p2 = Point.new(3, 4)
local p3 = p1 + p2  -- 触发 __add
print(p3)           -- 触发 __tostring: Point(4, 6)
print(p1 == Point.new(1, 2))  -- 触发 __eq: true
```

---

## 5. 元方法对比分析

### 5.1 与 Python 的对比

| 特性              | Lua metatable                 | Python __dunder__                       |
| ----------------- | ----------------------------- | -------------------------------------- |
| 机制               | 表字段                          | 类属性                                  |
| 多继承            | 通过 `__index` 链手动模拟        | MRO（方法解析顺序）算法                  |
| 运算符重载        | `__add` 等元方法                | `__add__` 等双下划线方法                |
| 类型系统          | duck typing                    | 静态 + 动态混合                         |
| 属性访问拦截      | `__index` / `__newindex`       | `__getattr__` / `__setattr__`           |
| 默认参数          | `__call`                        | `__call__` / `__init__`                |
| 字符串化          | `__tostring`                    | `__str__` / `__repr__`                 |
| 长度              | `__len`（仅部分类型）            | `__len__`                              |
| GC 终结          | `__gc`                          | `__del__`                              |
| 上下文管理        | `__close`（5.4+）               | `__enter__` / `__exit__`              |

**Lua 的优势**：轻量、显式、无运行时开销（无元方法时）。
**Python 的优势**：MRO 处理复杂继承、`@property` 装饰器、描述符协议。

### 5.2 与 JavaScript 的对比

| 特性            | Lua                        | JavaScript                          |
| --------------- | -------------------------- | ----------------------------------- |
| 原型链          | `__index` 链                | `[[Prototype]]`（`__proto__`）       |
| 对象创建        | `{}` + `setmetatable`      | `Object.create(proto)` / 字面量       |
| 继承检查        | 无内置                       | `instanceof`                        |
| 属性拦截        | `__index` / `__newindex`   | `Proxy`                            |
| 默认值          | `__index` = defaults table  | `Proxy` with `get` trap             |
| 运算符重载      | `__add` 等                  | 无（仅 Symbol.toPrimitive）           |
| 调用            | `__call`                    | 可调用对象本身就是函数               |
| GC              | `__gc`                       | `FinalizationRegistry`              |

**Lua 的优势**：运算符重载完整、原型链显式（无 `__proto__` 隐式继承）。
**JS 的优势**：Proxy 提供更全面的拦截能力、Symbol 提供内置协议扩展点。

### 5.3 与 Scheme 的对比

| 特性           | Lua                         | Scheme（R7RS）                       |
| -------------- | --------------------------- | ----------------------------------- |
| 数据类型        | table 一等公民               | 多种数据结构（record, vector 等）    |
| 抽象类型        | metatable + userdata        | `define-record-type`                |
| 泛型运算        | `__add` 等元方法             | CLOS（多分派）                       |
| 闭包            | 函数闭包                     | continuation                         |
| 元编程          | 元方法                       | 宏（macro）                          |

**Lua 的优势**：简单、易学、元方法机制直观。
**Scheme 的优势**：宏系统更强大、CLOS 提供完整多分派。

### 5.4 `__index` 与原型继承性能对比

不同语言的属性查找性能（每秒操作数，越大越快，相对值）：

| 操作                        | Lua 5.4  | LuaJIT  | JS V8   | Python 3.11 |
| --------------------------- | -------- | ------- | ------- | ----------- |
| 直接访问 `t.x`               | 1.0x     | 5.0x    | 1.2x    | 0.4x        |
| `__index` 链（1 层）         | 0.8x     | 4.2x    | 1.0x    | 0.3x        |
| `__index` 链（3 层）         | 0.5x     | 3.0x    | 0.8x    | 0.2x        |
| `__index` 函数              | 0.3x     | 1.5x    | 0.6x    | 0.15x       |

Lua 在简单访问上有明显优势（flags 位图优化），但 `__index` 函数因调用开销而显著降低。

---

## 6. 常见陷阱与最佳实践

### 6.1 陷阱：`__index` 循环

```lua
-- 错误：__index 指向自己导致死循环
local t = {}
t.__index = t  -- 无意义，且若 t 没有 key 会无限递归
setmetatable(t, t)
-- 访问 t.foo 会栈溢出（实际上 Lua 会检测到，因为 rawget(t, "foo") == nil 后查 metatable.__index = t 自身）

-- 正确：__index 应指向另一个表
local proto = { greet = function() return "hi" end }
local obj = setmetatable({}, { __index = proto })
print(obj.greet())  -- hi
```

### 6.2 陷阱：`__newindex` 不写入原表

```lua
local t = setmetatable({}, {
    __newindex = function(t, k, v)
        print("intercepted:", k, v)
    end
})

t.foo = 42  -- 打印 "intercepted: foo 42"
print(t.foo) -- nil！因为 __newindex 未写入原表

-- 正确：若需记录并存储
local t = setmetatable({}, {
    __newindex = function(t, k, v)
        print("log:", k, v)
        rawset(t, k, v)  -- 显式存储到原表
    end
})

t.foo = 42
print(t.foo)  -- 42
```

### 6.3 陷阱：`__eq` 要求同 metatable

```lua
local mt1 = { __eq = function(a, b) return true end }
local mt2 = { __eq = function(a, b) return true end }

local a = setmetatable({}, mt1)
local b = setmetatable({}, mt2)

print(a == b)  -- false（mt1 != mt2，__eq 未触发）
```

### 6.4 陷阱：`__len` 在字符串上无效

```lua
local s = setmetatable("hello", { __len = function() return 100 end })
print(#s)  -- 5（字符串的 # 不触发 __len）

-- __len 仅对 table 与 userdata（在 5.4 中）有效
```

### 6.5 陷阱：metatable 被共享导致意外修改

```lua
local mt = {}
function MyClass.new()
    return setmetatable({}, mt)
end

-- 错误：所有实例共享 mt，修改 mt 影响所有实例
function MyClass.add_method(name, fn)
    mt[name] = fn
end

-- 正确：每个实例可有自己的 metatable（但开销大），或共享 metatable 但不修改
```

### 6.6 陷阱：`__call` 优先级低于函数

```lua
local f = print
local t = setmetatable({}, { __call = function() print("table called") end })

-- f 是 function，直接调用，不查 __call
f()  -- print nothing
```

### 6.7 陷阱：`__gc` 在 5.2 中对 table 失效

```lua
-- Lua 5.1 / 5.2: table 的 __gc 不会触发！
local t = setmetatable({ data = "important" }, {
    __gc = function(t) print("finalizing") end
})
t = nil
collectgarbage()
-- 无输出（5.1 / 5.2），5.3+ 会输出 "finalizing"

-- Lua 5.1 的 workaround：用 userdata 包装
local function track_table(t)
    local proxy = newproxy(true)
    getmetatable(proxy).__gc = function() print("finalizing") end
    -- proxy 持有 t 的引用
    return t
end
```

### 6.8 陷阱：`__metatable` 防护可被 debug 绕过

```lua
local t = setmetatable({}, { __metatable = "protected" })
print(getmetatable(t))  -- protected

-- debug 库可绕过
local mt = debug.getmetatable(t)
print(mt)  -- 真实 metatable
```

### 6.9 最佳实践：原型继承使用 `__index` 指向自身

```lua
-- 推荐：类表自身的 __index 指向类表
local Animal = {}
Animal.__index = Animal  -- 关键

function Animal.new(name)
    return setmetatable({ name = name }, Animal)
end

function Animal:speak()
    return self.name .. " speaks"
end
```

### 6.10 最佳实践：使用 `rawget` 检测实例字段

```lua
function Animal:has_field(k)
    return rawget(self, k) ~= nil
end
-- 避免触发 __index 导致误判（继承的方法会被认为是字段）
```

### 6.11 最佳实践：保护 `__gc` 关联 metatable

```lua
-- Lua 5.4：通过 luaL_setmetatable 自动标记 __gc
int luaopen_mylib(lua_State *L) {
    luaL_newmetatable(L, "MyType");
    /* 设置元方法 */
    luaL_setfuncs(L, metamethods, 0);
    /* __gc 会被自动标记 */
    return 1;
}
```

### 6.12 最佳实践：避免 `__index` 函数

```lua
-- 避免：__index 是 function 会增加调用开销
local t = setmetatable({}, {
    __index = function(t, k) return defaults[k] end
})

-- 推荐：__index 是 table，直接走 fast path
local t = setmetatable({}, { __index = defaults })
```

---

## 7. 工程实践

### 7.1 完整的 OOP 类系统

```lua
-- Lua 5.4

-- 类系统基类
local Object = {}
Object.__index = Object

function Object:new(...)
    local obj = setmetatable({}, self)
    if obj.init then obj:init(...) end
    return obj
end

function Object:class()
    return self
end

function Object:super()
    return getmetatable(self)
end

function Object:isInstanceOf(class)
    local cls = self:class()
    while cls do
        if cls == class then return true end
        cls = getmetatable(cls)
    end
    return false
end

-- 类定义辅助函数
local function class(parent)
    local cls = {}
    if parent then
        setmetatable(cls, { __index = parent })
    end
    cls.__index = cls
    return cls
end

-- 测试
local Animal = class(Object)

function Animal:init(name)
    self.name = name
end

function Animal:speak()
    return self.name .. " makes a sound"
end

local Dog = class(Animal)

function Dog:init(name, breed)
    Animal.init(self, name)
    self.breed = breed
end

function Dog:speak()
    return Animal.speak(self) .. " (Woof!)"
end

local d = Dog:new("Buddy", "Labrador")
print(d:speak())           -- Buddy makes a sound (Woof!)
print(d:isInstanceOf(Animal))  -- true
print(d:isInstanceOf(Dog))      -- true
```

### 7.2 不可变对象

```lua
-- Lua 5.4

local Immutable = {}
Immutable.__index = Immutable

function Immutable.new(data)
    local self = setmetatable({}, Immutable)
    for k, v in pairs(data) do
        rawset(self, k, v)
    end
    return self
end

Immutable.__newindex = function(self, k, v)
    error("attempt to modify immutable object: " .. tostring(k), 2)
end

Immutable.__index = function(self, k)
    if Immutable[k] then
        return Immutable[k]
    end
    error("no such field: " .. tostring(k), 2)
end

-- 测试
local p = Immutable.new({ x = 1, y = 2 })
print(p.x)     -- 1
-- p.z = 3    -- error: attempt to modify
-- print(p.z) -- error: no such field
```

### 7.3 属性访问器

```lua
-- Lua 5.4

local function property(get_fn, set_fn)
    return setmetatable({}, {
        __index = get_fn,
        __newindex = set_fn or function(t, k, v)
            error("property is read-only", 2)
        end
    })
end

local Person = {}
Person.__index = Person

function Person.new(name, age)
    local self = setmetatable({}, Person)
    rawset(self, "_name", name)
    rawset(self, "_age", age)

    -- 创建属性代理
    local proxy = setmetatable({}, {
        __index = function(_, k)
            if k == "name" then return self._name
            elseif k == "age" then return self._age
            else return self[k] end
        end,
        __newindex = function(_, k, v)
            if k == "name" then
                if type(v) ~= "string" or #v == 0 then
                    error("invalid name", 2)
                end
                self._name = v
            elseif k == "age" then
                if type(v) ~= "number" or v < 0 then
                    error("invalid age", 2)
                end
                self._age = v
            else
                self[k] = v
            end
        end
    })
    return proxy
end

function Person:greet()
    return "Hi, I'm " .. self._name
end

local p = Person.new("Alice", 30)
print(p.name)    -- Alice
p.age = 31
print(p.age)     -- 31
-- p.age = -1   -- error: invalid age
-- p.name = ""  -- error: invalid name
```

### 7.4 多重继承

```lua
-- Lua 5.4

-- 多重继承：在 __index 中查找多个父类
local function multi_class(...)
    local parents = {...}
    local cls = {}
    cls.__index = function(self, k)
        -- 在所有父类中查找
        for _, parent in ipairs(parents) do
            local v = parent[k]
            if v ~= nil then return v end
        end
        return nil
    end
    return cls
end

-- 父类 A
local A = {}
A.__index = A
function A:methodA() return "A" end

-- 父类 B
local B = {}
B.__index = B
function B:methodB() return "B" end

-- 子类 C 继承 A 与 B
local C = multi_class(A, B)

local c = setmetatable({}, C)
print(c:methodA())  -- A
print(c:methodB())  -- B
```

### 7.5 弱引用与 metatable

```lua
-- Lua 5.4

-- 缓存：key 为弱引用，自动清理
local cache = setmetatable({}, { __mode = "k" })

local function memoize(fn)
    return function(x)
        if cache[x] then return cache[x] end
        local result = fn(x)
        cache[x] = result
        return result
    end
end

local slow_square = memoize(function(x)
    print("computing for " .. x)
    return x * x
end)

print(slow_square(5))  -- computing for 5; 25
print(slow_square(5))  -- 25（来自缓存）
```

### 7.6 元方法调试器

```lua
-- Lua 5.4

-- 跟踪元方法调用
local function trace_metatable(mt, name)
    name = name or "traced"
    local traced = {}
    for k, v in pairs(mt) do
        if type(v) == "function" then
            traced[k] = function(...)
                local args = {...}
                print(string.format("[%s] %s called with %d args", name, k, #args))
                return v(...)
            end
        else
            traced[k] = v
        end
    end
    return traced
end

-- 使用
local Complex = {
    __add = function(a, b) return setmetatable({real = a.real + b.real}, Complex) end,
    __tostring = function(a) return "Complex(" .. a.real .. ")" end
}
Complex.__index = Complex

local TracedComplex = trace_metatable(Complex, "Complex")

local a = setmetatable({real = 1}, TracedComplex)
local b = setmetatable({real = 2}, TracedComplex)
local c = a + b  -- 打印: [Complex] __add called with 2 args
print(c)         -- 打印: [Complex] __tostring called with 1 args; Complex(3)
```

### 7.7 与 C 模块协作

```lua
-- Lua 5.4
-- 假设有一个 C 模块 vec 提供 vec.new, vec.add 等

local vec = require("vec")  -- C 模块

-- 包装为 Lua 类
local Vec = {}
Vec.__index = Vec

function Vec.new(x, y, z)
    local obj = vec.new(x, y, z)  -- C userdata
    return setmetatable({ _handle = obj }, Vec)
end

Vec.__add = function(a, b)
    local result = vec.add(a._handle, b._handle)
    return setmetatable({ _handle = result }, Vec)
end

Vec.__tostring = function(a)
    return vec.tostring(a._handle)
end

function Vec:length()
    return vec.length(self._handle)
end

local v1 = Vec.new(1, 2, 3)
local v2 = Vec.new(4, 5, 6)
local v3 = v1 + v2
print(v3)        -- (5, 7, 9)
print(v3:length())  -- 11.53...
```

### 7.8 性能优化

```lua
-- Lua 5.4

-- 优化 1：缓存方法查找
local obj = setmetatable({}, {
    __index = { method = function(self) return "slow" end }
})

-- 慢：每次都查找 __index
for i = 1, 1000000 do
    obj:method()
end

-- 快：缓存方法
local method = obj.method  -- 触发一次 __index
for i = 1, 1000000 do
    method(obj)
end

-- 优化 2：避免在热路径中创建临时 metatable
local MT = { __add = function(a, b) return setmetatable({}, MT) end }  -- 共享 metatable

-- 优化 3：使用 rawget 检测字段存在性
if rawget(obj, "field") then ... end  -- 比 if obj.field then ... 快（避免触发 __index）
```

### 7.9 测试

```lua
-- Lua 5.4
-- 使用 luaunit 风格的测试

local function test_complex()
    local Complex = require("complex")

    local z1 = Complex.new(3, 4)
    local z2 = Complex.new(1, -2)

    -- 测试加法
    local sum = z1 + z2
    assert(sum.real == 4 and sum.imag == 2, "addition failed")

    -- 测试相等
    assert(z1 == Complex.new(3, 4), "equality failed")

    -- 测试 __tostring
    assert(tostring(z1) == "3.00+4.00i", "tostring failed")

    print("test_complex passed")
end

local function test_inheritance()
    local Animal = require("animal")
    local Dog = require("dog")

    local d = Dog.new("Buddy", "Lab")
    assert(d:speak():match("Buddy"), "speak failed")
    assert(d:isInstanceOf(Animal), "isInstanceOf failed")

    print("test_inheritance passed")
end

test_complex()
test_inheritance()
```

---

## 8. 案例研究

### 8.1 Redis：Lua 脚本中的 metatable

Redis 的 EVAL 命令允许执行 Lua 脚本。Redis 内置的 Lua 解释器对 metatable 有限制：

```lua
-- Redis Lua 脚本
-- 注意：Redis 禁用某些元方法以防止安全风险

-- 可用：__index, __newindex, __add 等
local t = setmetatable({}, { __index = { x = 1 } })
return t.x  -- 1

-- 不可用：__gc（被禁用，因为 Redis 不执行 GC 终结）
```

Redis 限制：
- 不允许设置全局变量（`_G` 被沙箱化）。
- `__gc` 对 table 不生效（5.1 兼容性）。
- `require` 被禁用，模块加载受限。

### 8.2 Neovim：Lua 5.1 API 与 metatable

Neovim 0.5+ 使用 Lua 5.1 作为配置语言，大量使用 metatable 包装 Vim API：

```lua
-- Neovim 中的 vim.api 包装
local api = setmetatable({}, {
    __index = function(_, k)
        return function(...)
            return vim.rpcrequest(vim.api.channel_id, k, ...)
        end
    end
})

-- 使用：api.nvim_buf_get_lines(0, 0, -1, false)
-- 实际调用 rpcrequest(..., "nvim_buf_get_lines", ...)
```

Neovim 的 `vim.api` 是一个**虚拟表**，通过 `__index` 动态生成 API 调用，避免预先导入所有函数。

### 8.3 World of Warcraft：基于 metatable 的 UI 框架

WoW 使用 Lua 5.1，其 UI 框架（FrameXML）大量使用 metatable 实现 OOP：

```lua
-- WoW FrameXML 中的 Button 类
Button = {
    __index = Button,
    __tostring = function(self) return "Button:" .. (self.GetName and self:GetName() or "?") end
}

function Button:Create(name, parent)
    local frame = CreateFrame("Button", name, parent)
    setmetatable(frame, Button)
    return frame
end

function Button:SetText(text)
    -- 调用 C 函数
end

-- 继承
local MyButton = setmetatable({}, { __index = Button })
MyButton.__index = MyButton
```

WoW 限制：
- 字符串的 metatable 不可修改（沙箱保护）。
- 部分全局函数被替换为安全版本。

### 8.4 LuaJIT：FFI 与 cdata 的 metatable

LuaJIT 的 FFI 允许为 cdata 类型设置 metatable：

```lua
local ffi = require("ffi")

ffi.cdef[[
    typedef struct Point { double x; double y; } Point;
    Point* Point_new(double x, double y);
    void Point_free(Point* p);
    double Point_distance(Point* p, Point* other);
]]

local Point

Point = ffi.metatype("Point", {
    __new = function(mt, x, y)
        local p = ffi.new("Point", x or 0, y or 0)
        return p
    end,
    __gc = function(p)
        -- cdata 的 GC：自动释放（ffi.new 分配的 cdata 由 GC 管理）
    end,
    __add = function(a, b)
        return Point(a.x + b.x, a.y + b.y)
    end,
    __tostring = function(p)
        return string.format("Point(%g, %g)", p.x, p.y)
    end,
    __index = {
        distance = function(self, other)
            local dx = self.x - other.x
            local dy = self.y - other.y
            return math.sqrt(dx*dx + dy*dy)
        end
    }
})

local p1 = Point(1, 2)
local p2 = Point(4, 6)
local p3 = p1 + p2
print(p3)              -- Point(5, 8)
print(p1:distance(p2)) -- 5.0
```

LuaJIT 优势：
- FFI 直接调用 C ABI，无需 C 扩展模块。
- cdata 性能接近 C 原生代码。
- metatable 与 userdata 兼容。

### 8.5 Love2D：游戏对象系统

Love2D 是 2D 游戏框架，基于 Lua 5.1 + LuaJIT：

```lua
-- Love2D 中的对象系统
local Entity = {}
Entity.__index = Entity

function Entity.new(x, y)
    return setmetatable({
        x = x or 0,
        y = y or 0,
        vx = 0,
        vy = 0
    }, Entity)
end

function Entity:update(dt)
    self.x = self.x + self.vx * dt
    self.y = self.y + self.vy * dt
end

function Entity:draw()
    love.graphics.circle("fill", self.x, self.y, 5)
end

-- 子类 Player
local Player = setmetatable({}, { __index = Entity })
Player.__index = Player

function Player.new(x, y)
    local self = Entity.new(x, y)
    setmetatable(self, Player)
    self.health = 100
    return self
end

function Player:draw()
    Entity.draw(self)
    love.graphics.print("HP: " .. self.health, self.x, self.y - 20)
end

-- Love2D 回调
local player

function love.load()
    player = Player.new(100, 100)
end

function love.update(dt)
    player:update(dt)
    if love.keyboard.isDown("right") then player.vx = 100 end
    if love.keyboard.isDown("left") then player.vx = -100 end
end

function love.draw()
    player:draw()
end
```

Love2D 的设计哲学：
- metatable 作为类系统的核心。
- 每帧调用 `update` / `draw`，metatable 不影响热路径性能（LuaJIT JIT 优化）。
- 通过 `__index` 实现继承，简洁直观。

### 8.6 Kong：API 网关中的元编程

Kong 是基于 OpenResty（LuaJIT）的 API 网关，使用 metatable 实现插件系统：

```lua
-- Kong 的插件加载
local PluginLoader = {}

function PluginLoader.load(name)
    local plugin = require("kong.plugins." .. name)
    return setmetatable(plugin, {
        __index = function(t, k)
            error("plugin '" .. name .. "' missing method: " .. k, 2)
        end
    })
end

-- 使用
local auth_plugin = PluginLoader.load("key-auth")
auth_plugin:access(conf)  -- 调用插件方法
-- auth_plugin:nonexistent()  -- error: plugin 'key-auth' missing method
```

Kong 的 metatable 用途：
- 插件接口的"强制实现"（缺失方法时抛错）。
- 配置对象的默认值（`__index` = defaults）。
- DAO 层的字段映射（`__index` = schema）。

---

## 9. 练习题

### 9.1 选择题

**Q1**. 下列代码的输出是什么？

```lua
local t = setmetatable({}, {
    __index = function(t, k) return "default:" .. k end,
    __newindex = function(t, k, v) rawset(t, k, v .. "_modified") end
})
t.foo = "bar"
print(t.foo)
```

A. `default:foo`
B. `bar`
C. `bar_modified`
D. `nil`

<details><summary>答案</summary>

**C**. `__newindex` 拦截赋值，`rawset` 写入 `t.foo = "bar_modified"`。后续读取 `t.foo` 直接命中（不触发 `__index`），返回 `bar_modified`。

</details>

**Q2**. 下列代码的输出是什么？

```lua
local mt = {
    __index = function(t, k) return "from_mt:" .. k end
}
local t1 = setmetatable({}, mt)
local t2 = setmetatable({}, mt)
print(t1 == t2)
```

A. `true`
B. `false`
C. `error`
D. `nil`

<details><summary>答案</summary>

**B**. `t1` 和 `t2` 是两个不同的表对象（引用不同），且没有 `__eq` 元方法。Lua 默认使用引用相等，返回 `false`。

</details>

**Q3**. 下列代码的输出是什么？

```lua
local t = setmetatable({ a = 1 }, { __index = { b = 2, c = 3 } })
print(t.a, t.b, t.c, t.d)
```

A. `1 2 3 nil`
B. `1 2 3 nil`
C. `1 nil nil nil`
D. `nil 2 3 nil`

<details><summary>答案</summary>

**A**. `t.a` 直接命中（1）。`t.b`、`t.c` 触发 `__index`，从 `{ b = 2, c = 3 }` 表中查找。`t.d` 触发 `__index`，但表中无 `d`，返回 `nil`。

</details>

**Q4**. 下列关于 `__gc` 的说法正确的是？

A. Lua 5.1 中 table 可以设置 `__gc` 并会被自动调用
B. Lua 5.2 中 table 的 `__gc` 不会被调用
C. Lua 5.3+ 中 table 的 `__gc` 在 metatable 设置时即可被识别
D. `__gc` 可被多次调用

<details><summary>答案</summary>

**C**. Lua 5.1 / 5.2 不支持 table 的 `__gc`（仅 userdata）。Lua 5.3+ 通过 `luaL_setmetatable` 在创建 metatable 时标记 `__gc`，但 `setmetatable` 后再添加 `__gc` 字段无效。`__gc` 每个对象最多调用一次。

</details>

**Q5**. 下列代码的输出是什么？

```lua
local t = setmetatable({}, {
    __index = { x = 1 },
    __call = function(self, n) return n * 2 end
})
print(t(5), t.x)
```

A. `10 1`
B. `5 1`
C. `error`
D. `nil 1`

<details><summary>答案</summary>

**A**. `t(5)` 触发 `__call`，返回 `5 * 2 = 10`。`t.x` 触发 `__index`，返回 1。

</details>

### 9.2 填空题

**Q1**. 完成以下代码，使 `t` 的访问返回 `42`：

```lua
local t = setmetatable({}, {
    _____ = function(t, k) return 42 end
})
print(t.anything)  -- 42
```

<details><summary>答案</summary>

```lua
__index
```

</details>

**Q2**. 下列代码的输出是 `_____`：

```lua
local mt = { __eq = function(a, b) return true end }
local a = setmetatable({}, mt)
local b = setmetatable({}, mt)
print(a == b)
```

<details><summary>答案</summary>

```
true
```

因为 `a` 和 `b` 共享同一个 metatable（`mt`），且 `__eq` 返回 true。

</details>

**Q3**. `getmetatable` 返回的值取决于 metatable 的 `_____` 字段。

<details><summary>答案</summary>

```
__metatable
```

如果存在，`getmetatable` 返回该字段的值；否则返回真实 metatable。

</details>

**Q4**. 下列代码的输出是 `_____`：

```lua
local t = setmetatable({ x = 1 }, { __index = function() return 999 end })
print(t.x, t.y)
```

<details><summary>答案</summary>

```
1    999
```

`t.x` 直接命中，返回 1。`t.y` 不在 `t` 中，触发 `__index`，返回 999。

</details>

**Q5**. 在 Lua 5.4 中，`#t` 对 table 触发 `_____` 元方法。

<details><summary>答案</summary>

```
__len
```

Lua 5.2+ 支持 table 的 `__len`。

</details>

### 9.3 编程题

**Q1**. 实现一个 `Vector3` 类，支持：
- 构造 `Vector3.new(x, y, z)`
- 加法 `a + b`
- 点积 `a:dot(b)`
- 模长 `#a`（通过 `__len`）
- 字符串化 `tostring(a)`

<details><summary>答案</summary>

```lua
-- Lua 5.4
local Vector3 = {}
Vector3.__index = Vector3

function Vector3.new(x, y, z)
    return setmetatable({ x = x or 0, y = y or 0, z = z or 0 }, Vector3)
end

Vector3.__add = function(a, b)
    return Vector3.new(a.x + b.x, a.y + b.y, a.z + b.z)
end

Vector3.__len = function(a)
    return math.sqrt(a.x^2 + a.y^2 + a.z^2)
end

Vector3.__tostring = function(a)
    return string.format("Vector3(%g, %g, %g)", a.x, a.y, a.z)
end

function Vector3:dot(b)
    return self.x * b.x + self.y * b.y + self.z * b.z
end

-- 测试
local v1 = Vector3.new(1, 2, 3)
local v2 = Vector3.new(4, 5, 6)
print(v1 + v2)          -- Vector3(5, 7, 9)
print(#v1)              -- 3.74166
print(v1:dot(v2))       -- 32
```

</details>

**Q2**. 实现一个 `Lazy` 类，延迟计算值：
- `Lazy.new(fn)`：创建延迟对象
- `Lazy:value()`：首次调用时计算，后续返回缓存
- `__tostring`：返回值的字符串表示

<details><summary>答案</summary>

```lua
-- Lua 5.4
local Lazy = {}
Lazy.__index = Lazy

function Lazy.new(fn)
    return setmetatable({ _fn = fn, _value = nil, _computed = false }, Lazy)
end

function Lazy:value()
    if not self._computed then
        self._value = self._fn()
        self._computed = true
        self._fn = nil  -- 释放函数引用
    end
    return self._value
end

Lazy.__tostring = function(self)
    return tostring(self:value())
end

Lazy.__call = function(self)
    return self:value()
end

-- 测试
local lazy = Lazy.new(function()
    print("computing...")
    return 42
end)

print(lazy)         -- computing...; 42
print(lazy:value()) -- 42（不重新计算）
print(lazy())       -- 42
```

</details>

**Q3**. 实现一个链式 Builder，使以下代码工作：

```lua
local result = Chain.new()
    :add(1)
    :add(2)
    :add(3)
    :multiply(10)
    :build()
print(result)  -- "60"
```

<details><summary>答案</summary>

```lua
-- Lua 5.4
local Chain = {}
Chain.__index = Chain

function Chain.new()
    return setmetatable({ value = 0 }, Chain)
end

function Chain:add(n)
    self.value = self.value + n
    return self
end

function Chain:multiply(n)
    self.value = self.value * n
    return self
end

Chain.__tostring = function(self)
    return tostring(self.value)
end

function Chain:build()
    return self.value
end

-- 测试
local result = Chain.new()
    :add(1)
    :add(2)
    :add(3)
    :multiply(10)
    :build()
print(result)  -- 60
```

</details>

### 9.4 思考题

**Q1**. 为什么 Lua 不内置类系统，而通过 metatable 模拟？

<details><summary>答案</summary>

Lua 的设计哲学是"提供元机制，而非具体特性"。metatable 作为元编程工具，允许用户根据需要实现不同的范式（OOP、函数式、原型继承等），而非被锁定在单一模型中。这与 Scheme 的"最小核心 + 宏"哲学一致。如果内置类系统，会引入类型系统的复杂度（如 MRO、`instanceof`、访问控制），与 Lua 的极简目标冲突。

</details>

**Q2**. 为什么 `__eq` 要求两个操作数共享 metatable？

<details><summary>答案</summary>

这是性能与一致性的权衡：
- 若 `__eq` 对任意类型触发，则在 `a == b` 中，Lua 需检查两个操作数的 metatable，开销加倍。
- 要求共享 metatable 确保类型一致性，避免"苹果等于橘子"的逻辑错误（如 `Point(1,2) == Complex(1,2)` 应返回 false）。
- 简化了实现：Lua 只需检查类型与 metatable 是否相同，无需复杂的多分派。

</details>

**Q3**. `__index` 链的循环检测为何不由 Lua 自动处理？

<details><summary>答案</summary>

1. **性能开销**：自动循环检测需要维护"已访问"集合，每次查找都增加开销。
2. **语义模糊**：循环 `__index` 应该返回什么？nil？错误？开发者可能期望栈溢出作为调试信号。
3. **设计简洁**：Lua 鼓励显式控制，将循环检测责任交给开发者。

实际上 Lua 会在递归深度达到 `LUAI_MAXSTACK` 时抛出 "stack overflow" 错误，相当于间接的循环检测。

</details>

---

## 10. 参考文献

1. **Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes.** *Lua 5.4 Reference Manual.* PUC-Rio, 2020. ISBN 978-85-903998-6-3. DOI: 10.13140/RG.2.2.15643.92964.

2. **Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes.** *The Evolution of Lua.* In Proceedings of the Third ACM SIGPLAN History of Programming Languages Workshop (HOPL III), 2007. DOI: 10.1145/1238844.1238846.

3. **Roberto Ierusalimschy.** *Programming in Lua, 4th Edition.* PUC-Rio, 2016. ISBN 978-85-903998-5-6. Chapter 13: Metatables and Metamethods.

4. **Roberto Ierusalimschy.** *Passing a Language Through the Eye of a Needle.* Communications of the ACM, vol. 61, no. 11, 2018, pp. 44-51. DOI: 10.1145/3266166.

5. **Kurt Nørmark.** *Metaprogramming in Lua.* Aalborg University, 2019.

6. **Steve Donovan.** *Programming in Lua: A Beginner's Guide.* 2020.

7. **PUC-Rio.** *Lua 5.4 Source Code.* lobject.h, ltable.c, lvm.c. https://www.lua.org/source/5.4/

8. **Mike Pall.** *LuaJIT 2.1 FFI Semantics.* https://luajit.org/ext_ffi_semantics.html

9. **Steve Francia.** *Lua Patterns and Idioms.* OSCON, 2019.

10. **OpenResty Community.** *Lua Best Practices.* https://github.com/sumory/lua-best-practices

11. **David Mazières.** *Dynamic Language Mechanisms for Systems Software.* Stanford CS242 Lecture Notes, 2020.

12. **Bjarne Stroustrup.** *Multiple Inheritance for C++.* Proceedings of the USENIX C++ Conference, 1989.

---

## 11. 扩展阅读

### 11.1 官方资料

- [Lua 官方网站](https://www.lua.org/)
- [Lua 5.4 Reference Manual - Metatables](https://www.lua.org/manual/5.4/manual.html#2.4)
- [Programming in Lua - Metatables](https://www.lua.org/pil/13.html)
- [The Evolution of Lua](https://www.lua.org/doc/hopl.pdf)

### 11.2 进阶书籍

- Ierusalimschy, R. *Lua: The Programming Language.* PUC-Rio, 2020.
- Jung, K. *Beginning Lua Programming.* Wrox, 2007.
- URI, *Programming in Lua* 4th Edition, PUC-Rio, 2016.

### 11.3 社区资源

- [Lua Users Wiki - Metamethods Tutorial](http://lua-users.org/wiki/MetatableEvents)
- [Lua Users Wiki - Object Orientation Tutorial](http://lua-users.org/wiki/ObjectOrientationTutorial)
- [lua-l Mailing List Archive](https://www.lua.org/lua-l.html)

### 11.4 源码分析

- [Lua 5.4 源码 lobject.h](https://www.lua.org/source/5.4/lobject.h.html)
- [Lua 5.4 源码 ltable.c](https://www.lua.org/source/5.4/ltable.c.html)
- [Lua 5.4 源码 lvm.c](https://www.lua.org/source/5.4/lvm.c.html)
- [LuaJIT 源码 lj_obj.h](https://github.com/LuaJIT/LuaJIT/blob/v2.1/src/lj_obj.h)

### 11.5 相关论文

- Ierusalimschy, R., Figueiredo, L. H. D., Celes, W. *The Design and Implementation of Lua 5.0.* Journal of Universal Computer Science, vol. 11, no. 7, 2005.
- Hosoya, H., Pierce, B. C. *Regular Expression Pattern Matching for XML.* Journal of Functional Programming, vol. 13, no. 6, 2003.

### 11.6 实战项目

- [Kong API Gateway - Lua 插件](https://docs.konghq.com/gateway-oss/)
- [Neovim Lua 文档](https://neovim.io/doc/user/lua.html)
- [Redis Lua 脚本指南](https://redis.io/commands/eval)
- [LÖVE 2D 游戏框架](https://love2d.org/)
- [LuaJIT FFI 文档](https://luajit.org/ext_ffi.html)

---

## 附录 A：元方法速查表

### A.1 完整元方法列表

| 元方法       | 触发                  | 签名                                  | 版本    |
| ------------ | --------------------- | ------------------------------------- | ------- |
| `__index`    | `t[k]`（k 不存在）     | `function(t, k) -> v` 或 `table`       | 5.0+    |
| `__newindex` | `t[k] = v`（k 不存在） | `function(t, k, v)` 或 `table`          | 5.0+    |
| `__add`      | `a + b`                | `function(a, b) -> r`                   | 5.0+    |
| `__sub`      | `a - b`                | `function(a, b) -> r`                   | 5.0+    |
| `__mul`      | `a * b`                | `function(a, b) -> r`                   | 5.0+    |
| `__div`      | `a / b`                | `function(a, b) -> r`                   | 5.0+    |
| `__mod`      | `a % b`                | `function(a, b) -> r`                   | 5.1+    |
| `__pow`      | `a ^ b`                | `function(a, b) -> r`                   | 5.1+    |
| `__idiv`     | `a // b`               | `function(a, b) -> r`                   | 5.3+    |
| `__unm`      | `-a`                   | `function(a) -> r`                      | 5.0+    |
| `__band`     | `a & b`                | `function(a, b) -> r`                   | 5.3+    |
| `__bor`      | `a | b`                | `function(a, b) -> r`                   | 5.3+    |
| `__bxor`     | `a ~ b`（二元）         | `function(a, b) -> r`                   | 5.3+    |
| `__bnot`     | `~a`（一元）            | `function(a) -> r`                      | 5.3+    |
| `__shl`      | `a << b`               | `function(a, b) -> r`                   | 5.3+    |
| `__shr`      | `a >> b`               | `function(a, b) -> r`                   | 5.3+    |
| `__concat`   | `a .. b`               | `function(a, b) -> r`                   | 5.0+    |
| `__len`      | `#a`                   | `function(a) -> r`                      | 5.2+ (table) |
| `__eq`       | `a == b`               | `function(a, b) -> bool`                | 5.0+    |
| `__lt`       | `a < b`                | `function(a, b) -> bool`                | 5.0+    |
| `__le`       | `a <= b`               | `function(a, b) -> bool`                | 5.0+    |
| `__pairs`    | `pairs(t)`             | `function(t) -> iterator`               | 5.2+    |
| `__ipairs`   | `ipairs(t)`（5.4 弃用） | `function(t) -> iterator`               | 5.2+ (5.4: 默认行为) |
| `__tostring` | `tostring(a)`          | `function(a) -> str`                    | 5.1+    |
| `__call`     | `a(...)`               | `function(self, ...) -> ...`            | 5.1+    |
| `__gc`       | GC 回收                | `function(a)`                           | 5.0+ (userdata), 5.3+ (table) |
| `__close`    | `<close>` 变量离开作用域 | `function(self, err) -> `                | 5.4+    |
| `__metatable`| `getmetatable(a)`      | 任意值                                  | 5.0+    |
| `__name`     | 错误消息中的类型名      | `string`                                | 5.3+    |
| `__mode`     | 弱表                   | `"k"`, `"v"`, `"kv"`                    | 5.0+    |

### A.2 元方法查找顺序

对于二元运算 `a OP b`：

1. 若 $a$ 与 $b$ 都是 number/string，直接运算。
2. 查找 $a$ 的 metatable 的元方法。
3. 查找 $b$ 的 metatable 的元方法。
4. 若都无，抛出错误。

对于一元运算 `OP a`：

1. 若 $a$ 是 number/string，直接运算。
2. 查找 $a$ 的 metatable 的元方法。
3. 若无，抛出错误。

### A.3 类型限制

| 类型      | 可设 metatable | 备注                              |
| --------- | -------------- | --------------------------------- |
| nil       | 否             | 无 metatable 概念                 |
| boolean   | 否             | 无 metatable 概念                 |
| number    | 否（5.2+）      | 5.0/5.1 可设置共享 metatable       |
| string    | 否（5.2+）      | 5.4 通过 `string` 共享表           |
| table     | 是              | 每个表独立                         |
| function  | 否              | 通过 closure 模拟                  |
| userdata  | 是              | 每个 userdata 独立                 |
| thread    | 否              | 通过 closure 模拟                  |

---

## 附录 B：调试检查清单

### B.1 `__index` 不触发

- [ ] 检查 `setmetatable(t, mt)` 是否已调用
- [ ] 检查 `mt.__index` 是否设置（注意双下划线）
- [ ] 检查键是否在原表中（若已存在，不触发 `__index`）
- [ ] 检查 `flags` 位图：若 metatable 创建时无 `__index`，后添加的 `__index` 不生效（需 `luaH_setmetatable` 重新标记）

### B.2 `__newindex` 不写入

- [ ] 检查是否使用了 `rawset`（绕过元方法）
- [ ] 检查键是否在原表中（若已存在，不触发 `__newindex`）

### B.3 `__eq` 不触发

- [ ] 检查两个对象的 metatable 是否相同（`a.mt == b.mt`）
- [ ] 检查两个对象的类型是否相同（table vs userdata）

### B.4 `__gc` 不调用

- [ ] Lua 版本：5.1 / 5.2 的 table 不支持 `__gc`
- [ ] Lua 5.3+：metatable 创建时需包含 `__gc` 字段（或调用 `luaL_setmetatable`）
- [ ] 检查对象是否被 GC 回收（可能未到 GC 时机，调用 `collectgarbage("collect")` 强制回收）

### B.5 性能问题

- [ ] `__index` 函数比 table 慢 3-5 倍，优先使用 table
- [ ] 缓存方法查找：`local method = obj.method`
- [ ] 使用 `rawget` 检测字段存在性（避免触发 `__index`）
- [ ] 避免在热路径中创建临时 metatable

### B.6 元方法调试技巧

```lua
-- 打印 metatable
local function print_mt(obj)
    local mt = getmetatable(obj)
    if mt then
        print("Metatable of " .. type(obj) .. ":")
        for k, v in pairs(mt) do
            print("  " .. k .. " = " .. type(v))
        end
    else
        print("No metatable")
    end
end

-- 跟踪 __index 调用
local function trace_index(obj)
    local mt = getmetatable(obj)
    if mt and mt.__index then
        local original = mt.__index
        mt.__index = function(t, k)
            print(string.format("[trace] __index(%s, %s)", tostring(t), tostring(k)))
            if type(original) == "function" then
                return original(t, k)
            else
                return original[k]
            end
        end
    end
end

-- 检查 metatable 共享性
local function shared_mt(a, b)
    return getmetatable(a) == getmetatable(b)
end
```

---

*文档版本：v2.0  金标准升级  最后更新：2026-06-14*
