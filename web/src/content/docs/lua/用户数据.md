---
order: 105
title: 用户数据
module: lua
category: 'dev-lang'
difficulty: advanced
description: Lua用户数据详解：userdata扩展C类型。
author: fanquanpp
updated: '2026-06-14'
related:
  - lua/环境与全局变量管理
  - 'lua/C-API栈操作'
  - lua/模块加载
prerequisites:
  - lua/概述与环境配置
---

# 用户数据（userdata）：Lua 与 C 的类型桥梁

> 本文档对标 MIT 6.028、Stanford CS140E、CMU 15-410 系统编程教学水准，深入剖析 Lua userdata 机制的设计哲学、形式化语义、底层实现与工程实践。

## 0. 学习目标（Bloom 分类法）

完成本章节学习后，学习者应能够：

### 0.1 Remember（记忆）

- **R1** 列举 userdata 的两种基本形态（full userdata 与 light userdata）并陈述其差异。
- **R2** 复述 `lua_newuserdata`、`lua_touserdata`、`luaL_checkudata`、`luaL_testudata` 四个 C API 的签名与语义。
- **R3** 陈述 `__gc` 元方法的触发时机（仅 full userdata）以及 GC 终结顺序保证。

### 0.2 Understand（理解）

- **U1** 解释为何 Lua 不直接暴露 C 指针而设计 userdata 抽象，说明背后的安全性与可移植性动机。
- **U2** 阐述 full userdata 与 GC 的协作机制：Lua 何时调用 `__gc`，何时回收内存。
- **U3** 解释 `luaL_checkudata` 通过 metatable 标识进行类型识别的"嵌套表"结构。

### 0.3 Apply（应用）

- **A1** 在嵌入式 C 项目中，将一个自定义 C 结构体（如 `Point {double x, y}`）封装为 Lua 可操作对象，并提供 `getx`、`setx`、`__tostring` 等方法。
- **A2** 为第三方 C 库（如 OpenSSL、libcurl）的关键句柄类型编写 Lua 绑定。
- **A3** 实现一个带引用计数（reference counting）的 userdata，包装 `FILE*` 这类需要显式关闭的资源。

### 0.4 Analyze（分析）

- **An1** 对比 full userdata 与 light userdata 在内存布局、GC 行为、可携带性上的权衡。
- **An2** 分析 Lua 5.1 / 5.2 / 5.3 / 5.4 在 userdata 上的 API 变化（`luaL_newuserdata` 取代 `lua_newuserdata`、`luaL_setmetatable` 等）。
- **An3** 剖析 LuaJIT 中 userdata 的差异，特别是 cdata 类型对 userdata 的取代关系。

### 0.5 Evaluate（评价）

- **E1** 评估在何种场景下应选择 light userdata 而非 full userdata（如弱引用映射、`__gc` 关联表）。
- **E2** 评价 userdata `__gc` 与 C 端 `__gc` 关联表（Lua 5.1 workaround）的取舍。
- **E3** 判断在性能敏感场景中"userdata + 内联数据"与"userdata + 指向堆指针"两种布局的优劣。

### 0.6 Create（创造）

- **C1** 设计一个通用的 C 结构体到 Lua userdata 的绑定框架，支持自动生成方法表。
- **C2** 实现一个支持继承、多态、运算符重载的 OOP 系统（基于 userdata）。
- **C3** 为一个完整的 C 库（如 SQLite、libuv）编写 Lua 绑定层。

---

## 1. 历史动机与发展脉络

### 1.1 Lua 1.0 时代：Tag Method 与 udata

Lua 1.0（1993 年发布）尚未引入现代意义上的 metatable，而是采用 **tag method** 机制：每种内置类型附带一个整数 tag，用户可通过 `settagmethod` 注册行为。当时 C 端的"用户数据"类型被称作 `udata`，内存由 Lua 管理，但缺乏 `__gc` 终结器——资源释放依赖显式调用。

```c
/* Lua 1.0 时代的伪 API（已废弃） */
void *lua_createuserdata(lua_State *L, size_t size);
```

### 1.2 Lua 2.x：Tag Method 强化

Lua 2.x 引入更完善的 tag method 体系，userdata 仍是底层类型，但 C 端可注册 `gc` tag method 处理终结。这一设计直接影响了后续 Lua 3.0 的 metatable 模型。

### 1.3 Lua 3.0（1997）：metatable 诞生

metatable 概念首次正式引入，userdata 通过 `setmetatable` 与 metatable 关联，但 userdata 的内存仍通过 `lua_newuserdata` 由 Lua 端管理。**full userdata** 与 **light userdata** 的二分法在这一时期成型。

### 1.4 Lua 5.0（2003）：环境（environment）分离

Lua 5.0 引入 userdata 的 **environment**（usrvalue 的前身）——每个 full userdata 可关联一个独立的全局环境表，使 C 模块的命名空间隔离成为可能。

### 1.5 Lua 5.1（2006）：工业标准

Lua 5.1 成为工业事实标准（World of Warcraft、Adobe Lightroom、Redis 均采用），userdata API 稳定：

```c
void *lua_newuserdata(lua_State *L, size_t size);
void *lua_touserdata(lua_State *L, int index);
void lua_setmetatable(lua_State *L, int index);
```

`luaL_checkudata` 通过注册表中的 metatable 进行类型识别。

### 1.6 Lua 5.2（2012）：usrvalue 显式化

Lua 5.2 将 userdata 的"environment"概念重命名为 **uservalue**，并新增 `lua_setuservalue` / `lua_getuservalue`。`__gc` 的语义收紧：仅带 `__gc` 的 metatable 才能"标记"为可终结，且 `__gc` 仅触发一次。

### 1.7 Lua 5.3（2015）：子类型改进

Lua 5.3 引入整数子类型与 64-bit 支持，`luaL_newlib` 替代了 `luaL_register`，模块注册方式更现代。`luaL_setmetatable` 替代了手动 `luaL_getmetatable` + `lua_setmetatable` 的两步操作。

### 1.8 Lua 5.4（2020）：多 uservalue 与快速终结

Lua 5.4 是 userdata 演进的里程碑：

- **多 uservalue**：`lua_setiuservalue` / `lua_getiuservalue` 支持每个 userdata 关联多个 Lua 值（数量由 `LUA_UTYPE_LIMIT` 控制，编译期可配置）。
- **`__gc` 元方法快速路径**：通过 `__gc` 元方法标记，GC 不再需要扫描所有 metatable。
- **`__close` 变量**：`to-be-closed` 变量提供确定性资源释放，可与 userdata 配合。
- **`luaL_addgsub` 等新工具函数**。

### 1.9 LuaJIT 与 cdata

LuaJIT 在保持 Lua 5.1 API 兼容的同时引入 **FFI**（Foreign Function Interface），通过 `ffi.typeof` 创建的 cdata 取代了大部分 userdata 使用场景：

```lua
local ffi = require("ffi")
ffi.cdef[[
    typedef struct { double x, y; } Point;
]]
local Point = ffi.typeof("Point")
local p = Point(1.0, 2.0)  -- cdata，不是 userdata
```

cdata 与 userdata 的本质区别：cdata 由 FFI 管理，可直接调用 C ABI；userdata 是 Lua 严格语义的对象，需通过 C API 操作。

### 1.10 设计哲学总结

PUC-Rio 团队在《The Evolution of Lua》中阐明 userdata 设计的三大原则：

1. **零拷贝**：C 端数据不复制到 Lua 端，userdata 仅持有指针或内联存储。
2. **GC 一致性**：userdata 是 Lua 的一等公民，参与 GC 生命周期。
3. **类型安全**：通过 metatable 标识避免 C 类型混淆。

---

## 2. 形式化定义

### 2.1 Lua Reference Manual 权威定义

> **userdata** — userdata 提供 arbitrary C data 存储能力，由 `lua_newuserdata` 创建，等同于一等 Lua 值。Lua 中存在两类 userdata：**full userdata**（full userdata，包装一块由 Lua 管理的内存）与 **light userdata**（light userdata，仅是一个 `void*` 指针值）。
>
> —— *Lua 5.4 Reference Manual, §2.1 Values and Types*

形式化语义：

$$
\text{Value} = \text{Nil} \cup \text{Boolean} \cup \text{Number} \cup \text{String} \cup \text{Table} \cup \text{Function} \cup \text{Thread} \cup \text{Userdata}
$$

其中：

$$
\text{Userdata} = \text{FullUserdata} \cup \text{LightUserdata}
$$

### 2.2 Full Userdata 内存模型

full userdata 在 Lua 内部表示为 `Udata` 结构（`lobject.h`）：

```c
/* lobject.h (简化) */
typedef struct Udata {
    CommonHeader;
    unsigned short nuvalue;  /* uservalue 数量 */
    struct Table *metatable;
    GCObject *gclist;
    UValue uv[1];  /* uservalue 数组 */
    /* 实际用户数据紧随其后 */
    char user_data[1];
} Udata;
```

字节码层面，full userdata 占据一个 `TValue` 槽位，类型标签为 `LUA_TUSERDATA`（数值 7）。

### 2.3 Light Userdata 内存模型

light userdata 是一个**值类型**（非对象类型），其内部表示仅为 `void*` 指针：

```c
/* TValue 中存储 light userdata */
typedef struct {
    TValuefields;
} TValue;
/* tt = LUA_TLIGHTUSERDATA (2), value.p = void* */
```

light userdata **不参与 GC**，无 metatable 关联（除非使用全局 registry 中的 `LUA_TLIGHTUSERDATA` 元表，Lua 5.4 起支持）。

### 2.4 类型判定的形式化规则

设 $\text{type}(x)$ 返回 $x$ 的类型标签，则：

$$
\text{type}(x) = \begin{cases}
\text{LUA\_TNIL} = 0 & \text{if } x = \text{nil} \\
\text{LUA\_TBOOLEAN} = 1 & \text{if } x \in \{\text{true}, \text{false}\} \\
\text{LUA\_TLIGHTUSERDATA} = 2 & \text{if } x \text{ is light userdata} \\
\text{LUA\_TNUMBER} = 3 & \text{if } x \in \mathbb{R} \cup \mathbb{Z} \\
\text{LUA\_TSTRING} = 4 & \text{if } x \text{ is string} \\
\text{LUA\_TTABLE} = 5 & \text{if } x \text{ is table} \\
\text{LUA\_TFUNCTION} = 6 & \text{if } x \text{ is function} \\
\text{LUA\_TUSERDATA} = 7 & \text{if } x \text{ is full userdata} \\
\text{LUA\_TTHREAD} = 8 & \text{if } x \text{ is coroutine}
\end{cases}
$$

### 2.5 `__gc` 终结语义

`__gc` 元方法的形式语义：

$$
\text{finalize}(u) \equiv \begin{cases}
\text{call } \text{mt}[\text{"\_\_gc"}](u) & \text{if } u \text{ is full userdata}, \text{mt} = \text{getmetatable}(u), \text{"\_\_gc"} \in \text{dom}(\text{mt}) \\
\text{noop} & \text{otherwise}
\end{cases}
$$

约束（Lua 5.2+ 严格语义）：

- `__gc` 仅在 metatable **首次设置时**被"标记"为可终结，后续添加 `__gc` 无效。
- `__gc` 至多被调用一次。
- 标记为可终结的 userdata 在被回收前必须调用 `__gc`，即使发生异常。

---

## 3. 理论推导与原理解析

### 3.1 内存布局与对齐

假设 64 位平台、Lua 5.4，full userdata 的内存布局：

```
+---------------------------+ <- Udata 起始
| CommonHeader (8 bytes)    |
| nuvalue (2 bytes)         |
| padding (2 bytes)         |
| *metatable (8 bytes)       |
| *gclist (8 bytes)          |
| UValue uv[0] (16 bytes)   | <- 每个 uservalue 占 16 字节（tt + value）
| ...                       |
| UValue uv[n-1] (16 bytes) |
+---------------------------+ <- userdata 起始
| user data (size bytes)    |
| (按 align 对齐)            |
+---------------------------+
```

由 `lua_newuserdata(L, sz)` 返回的指针指向 `user data` 区域起始，与 `Udata` 头相距固定偏移。

### 3.2 内存分配的形式化

设分配的总字节为 $\text{total}(s, n)$，其中 $s$ 为用户请求大小，$n$ 为 uservalue 数量：

$$
\text{total}(s, n) = \lceil \text{sizeof}(U\text{data}) + n \cdot \text{sizeof}(U\text{Value}) + s \rceil_{\text{align}}
$$

Lua 5.4 默认 $n = 1$，最大可配置为 `LUA_UTYPE_LIMIT`（默认为 4096）。

### 3.3 GC 标记-清除算法对 userdata 的处理

Lua GC 采用三色标记算法（Dijkstra 风格）。userdata 节点的处理：

1. **白色**（white）：未访问，待回收。
2. **灰色**（gray）：已访问但其引用未遍历。
3. **黑色**（black）：完全访问，本轮存活。

`__gc` 终结的特殊处理：当白色 userdata 被发现"可终结"时，Lua 将其**临时恢复**为存活状态，并加入 finalize 队列。`__gc` 执行后，userdata 被真正释放。

形式化：

$$
\text{GC\_cycle} = \text{Mark} \to \text{Atomic} \to \text{Sweep} \to \text{Finalize}
$$

### 3.4 类型识别算法

`luaL_checkudata` 的算法：

```
function checkudata(L, ud, tname):
    p = lua_touserdata(ud)
    if p == NULL:
        return type_error
    mt = getmetatable(ud)
    if mt == registry[tname]:
        return p  # 类型匹配
    else:
        return type_error
```

由于 metatable 是按引用比较，registry 中存储的 tname 对应的 metatable 必须与设置在 userdata 上的 metatable **同一引用**。这意味着不能跨 `lua_State` 共享 metatable 字符串。

### 3.5 `__gc` 终结顺序的不确定性

Lua 不保证 `__gc` 的调用顺序。设 $U = \{u_1, u_2, \ldots, u_n\}$ 为待终结集合，则调用顺序 $\sigma$ 满足：

$$
\sigma \in \text{Sym}(U), \quad \sigma \text{ is implementation-defined}
$$

**实践含义**：如果 userdata 之间存在依赖（如 $u_1$ 持有 $u_2$ 的引用），必须在 `__gc` 中防御性检查依赖是否已释放。

### 3.6 light userdata 与 GC 的特殊关系

light userdata 的值是一个 `void*`，**不参与 GC**。但 Lua 5.4 起允许为 `LUA_TLIGHTUSERDATA` 类型设置全局 metatable（通过 `luaL_setmetatable` 对类型而非对象）：

```c
lua_pushlightuserdata(L, NULL);
luaL_setmetatable(L, "LightPtr");
```

---

## 4. 代码示例

### 4.1 基础示例：Point userdata（Lua 5.4）

完整可编译的 C 程序，封装 `Point {double x, y}` 为 Lua userdata。

**`point.h`**：

```c
#ifndef POINT_H
#define POINT_H

typedef struct {
    double x;
    double y;
} Point;

#endif
```

**`point_lua.c`**：

```c
#define LUA_LIB
#include <lua.h>
#include <lauxlib.h>
#include <lualib.h>
#include "point.h"

static const char POINT_MT[] = "FANDEX.Point";

/* 创建 Point userdata
 * Lua 调用: Point.new(x, y)
 * 参数: x (number), y (number)
 * 返回: userdata<Point>
 */
static int l_point_new(lua_State *L) {
    double x = luaL_checknumber(L, 1);
    double y = luaL_checknumber(L, 2);
    Point *p = (Point *)lua_newuserdatauv(L, sizeof(Point), 0);
    p->x = x;
    p->y = y;
    luaL_setmetatable(L, POINT_MT);
    return 1;
}

/* 获取 x 坐标
 * Lua 调用: p:getx()
 */
static int l_point_getx(lua_State *L) {
    Point *p = (Point *)luaL_checkudata(L, 1, POINT_MT);
    lua_pushnumber(L, p->x);
    return 1;
}

/* 获取 y 坐标
 * Lua 调用: p:gety()
 */
static int l_point_gety(lua_State *L) {
    Point *p = (Point *)luaL_checkudata(L, 1, POINT_MT);
    lua_pushnumber(L, p->y);
    return 1;
}

/* 设置 x 坐标
 * Lua 调用: p:setx(value)
 */
static int l_point_setx(lua_State *L) {
    Point *p = (Point *)luaL_checkudata(L, 1, POINT_MT);
    double v = luaL_checknumber(L, 2);
    p->x = v;
    return 0;
}

/* 设置 y 坐标
 * Lua 调用: p:sety(value)
 */
static int l_point_sety(lua_State *L) {
    Point *p = (Point *)luaL_checkudata(L, 1, POINT_MT);
    double v = luaL_checknumber(L, 2);
    p->y = v;
    return 0;
}

/* 加法运算: p1 + p2
 * 元方法: __add
 */
static int l_point_add(lua_State *L) {
    Point *a = (Point *)luaL_checkudata(L, 1, POINT_MT);
    Point *b = (Point *)luaL_checkudata(L, 2, POINT_MT);
    Point *r = (Point *)lua_newuserdatauv(L, sizeof(Point), 0);
    r->x = a->x + b->x;
    r->y = a->y + b->y;
    luaL_setmetatable(L, POINT_MT);
    return 1;
}

/* 字符串表示
 * 元方法: __tostring
 */
static int l_point_tostring(lua_State *L) {
    Point *p = (Point *)luaL_checkudata(L, 1, POINT_MT);
    lua_pushfstring(L, "Point(%f, %f)", p->x, p->y);
    return 1;
}

/* 析构（这里 Point 无需释放资源，仅演示）
 * 元方法: __gc
 */
static int l_point_gc(lua_State *L) {
    /* Point 不持有外部资源，无需特殊处理 */
    return 0;
}

/* 方法表 */
static const luaL_Reg point_methods[] = {
    {"getx", l_point_getx},
    {"gety", l_point_gety},
    {"setx", l_point_setx},
    {"sety", l_point_sety},
    {NULL, NULL}
};

/* 元方法表 */
static const luaL_Reg point_metamethods[] = {
    {"__add", l_point_add},
    {"__tostring", l_point_tostring},
    {"__gc", l_point_gc},
    {NULL, NULL}
};

/* 模块入口
 * Lua 调用: local Point = require("point")
 */
int luaopen_point(lua_State *L) {
    /* 创建并注册 metatable */
    luaL_newmetatable(L, POINT_MT);

    /* 将 metatable 自身作为 __index */
    lua_pushvalue(L, -1);
    lua_setfield(L, -2, "__index");

    /* 注册方法到 metatable */
    luaL_setfuncs(L, point_methods, 0);
    luaL_setfuncs(L, point_metamethods, 0);

    /* 创建模块表 */
    lua_newtable(L);
    lua_pushcfunction(L, l_point_new);
    lua_setfield(L, -2, "new");

    return 1;
}
```

**编译命令**（Linux/macOS）：

```bash
# 动态库形式（推荐）
cc -O2 -Wall -shared -fPIC -I/usr/local/include/lua5.4 \
   -o point.so point_lua.c

# 或静态链接到 Lua 解释器
cc -O2 -Wall -I/usr/local/include/lua5.4 \
   -o lua_with_point point_lua.c \
   -llua5.4 -lm -ldl
```

**编译命令**（Windows / MSVC）：

```powershell
cl /O2 /LD /I"C:\Atian\Lua\include" point_lua.c ^
   /link /DLL /OUT:point.dll lua54.lib
```

**测试脚本 `test_point.lua`**：

```lua
-- 测试 Point userdata
local Point = require("point")

local p1 = Point.new(1.0, 2.0)
local p2 = Point.new(3.0, 4.0)

print(p1)               -- Point(1.000000, 2.000000)
print(p1:getx())       -- 1.0
print(p1:gety())        -- 2.0

local p3 = p1 + p2
print(p3)               -- Point(4.000000, 6.000000)

p3:setx(100.0)
print(p3:getx())        -- 100.0
```

**运行**：

```bash
lua5.4 test_point.lua
```

### 4.2 进阶示例：文件句柄 userdata（带 `__gc`）

包装 C 标准库 `FILE*`，演示 `__gc` 自动关闭文件。

**`file_handle.c`**：

```c
#define LUA_LIB
#include <stdio.h>
#include <lua.h>
#include <lauxlib.h>

typedef struct {
    FILE *fp;
    int closed;
} FileHandle;

static const char FH_MT[] = "FANDEX.FileHandle";

/* 打开文件
 * Lua: FileHandle.open(path, mode)
 */
static int l_fh_open(lua_State *L) {
    const char *path = luaL_checkstring(L, 1);
    const char *mode = luaL_optstring(L, 2, "r");

    FileHandle *fh = (FileHandle *)lua_newuserdatauv(L, sizeof(FileHandle), 0);
    fh->fp = fopen(path, mode);
    fh->closed = 0;

    if (fh->fp == NULL) {
        return luaL_error(L, "cannot open file: %s", path);
    }

    luaL_setmetatable(L, FH_MT);
    return 1;
}

/* 写入
 * Lua: fh:write(str)
 */
static int l_fh_write(lua_State *L) {
    FileHandle *fh = (FileHandle *)luaL_checkudata(L, 1, FH_MT);
    size_t len;
    const char *s = luaL_checklstring(L, 2, &len);

    if (fh->closed) {
        return luaL_error(L, "file already closed");
    }

    size_t written = fwrite(s, 1, len, fh->fp);
    if (written != len) {
        return luaL_error(L, "write error");
    }
    return 0;
}

/* 读取一行
 * Lua: line = fh:readline()
 */
static int l_fh_readline(lua_State *L) {
    FileHandle *fh = (FileHandle *)luaL_checkudata(L, 1, FH_MT);
    if (fh->closed) {
        return luaL_error(L, "file already closed");
    }

    char buf[4096];
    if (fgets(buf, sizeof(buf), fh->fp) == NULL) {
        lua_pushnil(L);
        return 1;
    }

    /* 去除末尾换行 */
    size_t len = strlen(buf);
    if (len > 0 && buf[len - 1] == '\n') {
        buf[len - 1] = '\0';
    }

    lua_pushstring(L, buf);
    return 1;
}

/* 显式关闭
 * Lua: fh:close()
 */
static int l_fh_close(lua_State *L) {
    FileHandle *fh = (FileHandle *)luaL_checkudata(L, 1, FH_MT);
    if (!fh->closed && fh->fp != NULL) {
        fclose(fh->fp);
        fh->fp = NULL;
        fh->closed = 1;
    }
    return 0;
}

/* GC 终结器
 */
static int l_fh_gc(lua_State *L) {
    FileHandle *fh = (FileHandle *)luaL_checkudata(L, 1, FH_MT);
    if (!fh->closed && fh->fp != NULL) {
        fclose(fh->fp);
        fh->fp = NULL;
        fh->closed = 1;
        /* 注意：不要在 __gc 中抛出 Lua 错误 */
    }
    return 0;
}

/* 字符串表示
 */
static int l_fh_tostring(lua_State *L) {
    FileHandle *fh = (FileHandle *)luaL_checkudata(L, 1, FH_MT);
    if (fh->closed) {
        lua_pushstring(L, "FileHandle(closed)");
    } else {
        lua_pushfstring(L, "FileHandle(open: %p)", fh->fp);
    }
    return 1;
}

static const luaL_Reg fh_methods[] = {
    {"write", l_fh_write},
    {"readline", l_fh_readline},
    {"close", l_fh_close},
    {NULL, NULL}
};

static const luaL_Reg fh_metamethods[] = {
    {"__gc", l_fh_gc},
    {"__tostring", l_fh_tostring},
    {"__close", l_fh_close},  /* Lua 5.4 to-be-closed 支持 */
    {NULL, NULL}
};

int luaopen_filehandle(lua_State *L) {
    luaL_newmetatable(L, FH_MT);
    lua_pushvalue(L, -1);
    lua_setfield(L, -2, "__index");
    luaL_setfuncs(L, fh_methods, 0);
    luaL_setfuncs(L, fh_metamethods, 0);

    lua_newtable(L);
    lua_pushcfunction(L, l_fh_open);
    lua_setfield(L, -2, "open");
    return 1;
}
```

**使用 `__close` (Lua 5.4)**：

```lua
local FileHandle = require("filehandle")

do
    local fh <close> = FileHandle.open("test.txt", "w")
    fh:write("hello\n")
    fh:write("world\n")
end  -- 离开作用域时自动调用 __close，即使发生异常
```

### 4.3 light userdata 示例：弱引用映射

light userdata 常用作 C 端对象的"弱引用"键：

```lua
-- 假设 C 库返回 light userdata 作为对象句柄
local handle = lib.get_native_handle()

-- 用 light userdata 作 key
local cache = setmetatable({}, { __mode = "k" })
cache[handle] = { metadata = "associated data" }
```

### 4.4 Lua 5.4 多 uservalue

```c
/* 创建带 3 个 uservalue 的 userdata */
Point *p = (Point *)lua_newuserdatauv(L, sizeof(Point), 3);

/* 设置第一个 uservalue */
lua_pushstring(L, "extra data 1");
lua_setiuservalue(L, -2, 1);

/* 获取第一个 uservalue */
lua_getiuservalue(L, -1, 1);
const char *extra = lua_tostring(L, -1);
lua_pop(L, 1);
```

---

## 5. 对比分析

### 5.1 Lua userdata 与其他语言对应机制对比

| 语言 | 对应机制 | GC 行为 | 元方法 | 典型用途 |
|------|----------|---------|--------|----------|
| **Lua** | full userdata / light userdata | full 受 GC，light 不受 | metatable | C 类型绑定 |
| **Python** | C 扩展类型（`PyTypeObject`） | 受 GC | `__init__`, `__del__` 等 | numpy 数组、pandas |
| **JavaScript** | WebAssembly 内存对象 / TypedArray | 受 GC | Proxy / Symbol.toPrimitive | WASM 数据交换 |
| **Scheme** | Records / FFI types | 受 GC | record types | R6RS / R7RS FFI |
| **Rust** | 不直接对应（通过 PyO3 / wasm-bindgen） | RAII | trait impl | 跨语言绑定 |
| **Java** | JNI 中的 `jobject` / `DirectByteBuffer` | 受 GC | 无（需 Java 方法） | JNI 性能场景 |

### 5.2 full vs light userdata 详细对比

| 维度 | full userdata | light userdata |
|------|---------------|----------------|
| **内存所有权** | Lua | C 端 |
| **GC 参与** | 是 | 否 |
| **`__gc` 支持** | 是 | 否（Lua 5.4 起 light userdata metatable 仅作类型化） |
| **metatable** | 每个 userdata 可独立 | 全局（仅 Lua 5.4+） |
| **可携带性** | 跨 lua_State 不可（同进程内不可） | 可跨 lua_State（同一进程） |
| **大小** | sizeof(Udata) + size | sizeof(void*) = 8 字节 |
| **比较** | 引用比较 | 指针值比较 |
| **创建 API** | `lua_newuserdata` / `lua_newuserdatauv` | `lua_pushlightuserdata` |
| **典型用途** | C 类型绑定 | 弱引用键、C 库句柄映射 |

### 5.3 与 Python C 扩展类型对比

```python
# Python C 扩展类型（伪代码）
typedef struct {
    PyObject_HEAD
    double x, y;
} PyPoint;

static PyTypeObject PyPointType = {
    .tp_name = "point.Point",
    .tp_basicsize = sizeof(PyPoint),
    .tp_dealloc = (destructor)PyPoint_dealloc,
    .tp_new = PyPoint_new,
    /* ... */
};
```

对比分析：

- **Python** 的 `PyObject` 自身就承担引用计数（`Py_INCREF` / `Py_DECREF`），而 Lua full userdata 完全由 GC 管理，无需手动引用计数。
- **Python** 的类型对象是全局的，所有 Point 实例共享一个 `PyTypeObject`；Lua 允许每个 userdata 持有不同的 metatable（虽然实践中通常共享）。
- **Python** 的 `__del__` 在循环引用场景下不可靠；Lua 的 `__gc` 与三色标记 GC 协同更健壮。

### 5.4 与 LuaJIT cdata 对比

| 维度 | Lua userdata | LuaJIT cdata |
|------|---------------|---------------|
| **创建方式** | `lua_newuserdata` | `ffi.new` |
| **类型系统** | 通过 metatable 标识 | 编译期类型 |
| **C ABI 调用** | 需手动封装 | 直接调用 |
| **JIT 优化** | 无 | 内联优化 |
| **可移植性** | 跨 Lua 5.x | 仅 LuaJIT |
| **学习曲线** | 中等 | 陡峭（需理解 C 类型） |

---

## 6. 常见陷阱与最佳实践

### 6.1 陷阱：忘记设置 metatable

```c
/* 错误：未设置 metatable，userdata 失去类型 */
Point *p = (Point *)lua_newuserdatauv(L, sizeof(Point), 0);
p->x = 1.0;
return 1;  /* Lua 端无法识别为 Point */
```

**修正**：

```c
Point *p = (Point *)lua_newuserdatauv(L, sizeof(Point), 0);
p->x = 1.0;
luaL_setmetatable(L, POINT_MT);
return 1;
```

### 6.2 陷阱：`__gc` 中抛出 Lua 错误

```c
/* 错误：__gc 中调用 luaL_error 会导致未定义行为 */
static int l_bad_gc(lua_State *L) {
    luaL_error(L, "cleanup failed");  /* 禁止！ */
    return 0;
}
```

**修正**：`__gc` 中只能记录日志或静默处理：

```c
static int l_safe_gc(lua_State *L) {
    /* 静默处理，最多调用 lua_writestringerror */
    return 0;
}
```

### 6.3 陷阱：跨 lua_State 共享 userdata

```c
/* 错误：在不同 lua_State 之间共享 userdata */
lua_State *L1 = luaL_newstate();
lua_State *L2 = luaL_newstate();

Point *p = (Point *)lua_newuserdatauv(L1, sizeof(Point), 0);
/* 不能将 p 传递给 L2 的栈 */
```

**原因**：每个 `lua_State` 独立管理内存和 metatable，跨状态共享 userdata 会导致 GC 错乱。

### 6.4 陷阱：light userdata 作为 long-term 引用

```c
/* 错误：light userdata 持有的 C 对象可能已释放 */
struct Resource *res = malloc(sizeof(struct Resource));
lua_pushlightuserdata(L, res);
/* ... 如果 Lua 端持有此 light userdata，C 端可能已 free(res) */
```

**修正**：使用 full userdata + `__gc` 确保生命周期一致：

```c
struct Resource *res = (struct Resource *)lua_newuserdatauv(L, sizeof(struct Resource), 0);
/* 配置 __gc 释放资源 */
```

### 6.5 陷阱：循环引用导致 `__gc` 失效

```lua
-- 循环引用
local a = setmetatable({}, { __gc = function() print("a gc") end })
local b = setmetatable({}, { __gc = function() print("b gc") end })
a.b = b
b.a = a
a, b = nil, nil
collectgarbage()
-- 不保证 a 和 b 都被回收（取决于 GC 实现）
```

**最佳实践**：避免 userdata 之间形成循环引用；如必须，使用 weak table 或显式 `close()` 方法。

### 6.6 最佳实践清单

1. **统一 metatable 标识**：所有同类型 userdata 共享同一 metatable，存于 registry。
2. **`__gc` 中防御性编程**：检查资源是否已释放，避免 double-free。
3. **避免在 `__gc` 中触发 Lua 错误**：用 C 端日志替代。
4. **`__gc` 必须幂等**：同一资源的 `__gc` 可能因异常被多次调用。
5. **light userdata 仅作短期引用**：长期持有用 full userdata。
6. **`__close` 优先于 `__gc`**：Lua 5.4 中 `__close` 提供确定性释放，优先使用。
7. **`luaL_checkudata` 替代 `lua_touserdata`**：前者有类型校验。
8. **uservalue 用于关联 Lua 对象**：避免在 C 端持有 Lua 对象引用。

### 6.7 内存泄漏排查

**症状**：userdata 数量持续增长，不释放。

**排查步骤**：

```lua
-- 监控 userdata 数量
local count = 0
for k, v in pairs(debug.getregistry()) do
    if type(v) == "userdata" then
        count = count + 1
    end
end
print("userdata count:", count)

-- 强制 GC 后再检查
collectgarbage("collect")
collectgarbage("collect")
```

**常见原因**：

- Lua 端长期持有 userdata 引用（缓存、全局表）。
- userdata 的 metatable 注册到全局，但 userdata 自身泄漏。
- `__gc` 中再次引用 userdata（阻止 GC）。

---

## 7. 工程实践

### 7.1 嵌入 Lua：在 C 应用中注册 userdata 类型

完整示例见 §4。要点：

1. `luaL_newmetatable` 创建并注册 metatable。
2. `__index` 指向 metatable 自身（实现方法查找）。
3. `luaL_setfuncs` 注册方法。
4. `luaopen_*` 函数返回模块表。

### 7.2 热重载支持

Lua 5.4 中，模块可通过 `package.loaded[name] = nil` 实现热重载。但 userdata 的 metatable 引用必须保持稳定：

```lua
-- reload.lua
local function hot_reload(name)
    package.loaded[name] = nil
    return require(name)
end

-- 注意：已存在的 userdata 仍引用旧 metatable
-- 解决：在 C 端将 metatable 缓存到全局，每次创建时检查更新
```

### 7.3 性能优化

**优化 1：避免不必要的 `__index` 调用**

```lua
-- 慢：每次访问都触发 __index
for i = 1, 1000000 do
    local x = p:getx()  -- __index 查找
end

-- 快：将方法绑定到局部变量
local getx = Point.getx  -- 一次性 __index
for i = 1, 1000000 do
    local x = getx(p)    -- 直接调用
end
```

**优化 2：userdata 内联存储**

```c
/* 慢：userdata 仅存指针，每次访问解引用 */
typedef struct {
    BigStruct *ptr;  /* 指向堆 */
} Wrapper;

/* 快：userdata 直接内联数据 */
typedef struct {
    BigStruct data;  /* 内联 */
} Wrapper;
```

**优化 3：使用 `__index` 表而非函数**

```lua
-- 慢：__index 为函数
local mt = { __index = function(t, k) return rawget(t, k) end }

-- 快：__index 为表
local methods = { foo = function() end, bar = function() end }
local mt = { __index = methods }
```

### 7.4 调试技巧

**技巧 1：`__tostring` 提供有意义的输出**

```lua
local mt = {
    __tostring = function(self)
        return string.format("Point(x=%g, y=%g)", self.x, self.y)
    end
}
```

**技巧 2：使用 `debug.getinfo` 检查 metatable**

```lua
local ud = Point.new(1, 2)
local mt = getmetatable(ud)
for k, v in pairs(mt) do
    print(k, v)
end
```

**技巧 3：C 端 `luaL_traceback` 在 `__gc` 异常时记录**

```c
static int l_gc(lua_State *L) {
    /* __gc 不能抛出 Lua 错误，但可记录 */
    lua_writestringerror("[GC] finalizing %p\n", lua_touserdata(L, 1));
    return 0;
}
```

### 7.5 测试策略

```lua
-- test_point_spec.lua
local Point = require("point")

describe("Point userdata", function()
    it("creates with coordinates", function()
        local p = Point.new(1.0, 2.0)
        assert.are.equal(1.0, p:getx())
        assert.are.equal(2.0, p:gety())
    end)

    it("adds two points", function()
        local p1 = Point.new(1, 1)
        local p2 = Point.new(2, 2)
        local p3 = p1 + p2
        assert.are.equal(3.0, p3:getx())
    end)

    it("rejects wrong type", function()
        assert.has_error(function()
            Point.new("not a number", 0)
        end)
    end)
end)
```

---

## 8. 案例研究

### 8.1 Redis 中的 Lua userdata

Redis 通过 `lua_newuserdata` 在 Lua 端表示 Redis 命令上下文。`scripting.c` 中：

```c
/* Redis 创建客户端上下文 userdata */
client *c = (client *)lua_newuserdata(L, sizeof(client));
luaL_setmetatable(L, "redis.client");
```

`__gc` 中释放 client 资源，确保脚本执行后无泄漏。

### 8.2 Neovim 的 Lua API

Neovim 用 Lua 5.1（LuaJIT）作为配置和脚本语言。Buffer、Window、Tabpage 等对象均以 userdata 表示：

```lua
-- Neovim Lua API
local buf = vim.api.nvim_get_current_buf()
-- buf 是一个 userdata，类型为 nvim_buf
```

Neovim 的 userdata 实现使用 `luaL_newmetatable` 注册每种 API 对象，并通过 `__index` 暴露方法。

### 8.3 World of Warcraft UI

WoW UI 完全基于 Lua（5.1），C 端定义大量 userdata 类型：

- `Frame`：UI 容器
- `Texture`：纹理
- `FontString`：文本

```lua
local f = CreateFrame("Frame", "MyFrame", UIParent)
f:SetWidth(100)
f:SetHeight(100)
```

`CreateFrame` 在 C 端创建 userdata 并绑定 metatable，方法是 C 函数。

### 8.4 LuaJIT 的 cdata

LuaJIT 引入 cdata 作为 userdata 的"增强版"：

```lua
local ffi = require("ffi")
ffi.cdef[[
    void *malloc(size_t);
    void free(void *);
]]

local p = ffi.C.malloc(1024)
-- p 是 cdata<void*>，类型为 void *
ffi.C.free(p)
```

cdata 的优势是 JIT 编译器可内联 C 函数调用，性能远超传统 userdata。

### 8.5 Love2D 的 userdata 类型

Love2D（基于 Lua 5.1 / LuaJIT）的图形、音频、物理对象均为 userdata：

```lua
function love.draw()
    love.graphics.circle("fill", 100, 100, 50)
end
```

`love.graphics` 内部所有绘制状态都封装在 userdata 中，由 C 端 SDL2 管理。

### 8.6 案例对比表

| 项目 | Lua 版本 | userdata 用途 | 关键 metatable |
|------|----------|---------------|----------------|
| Redis | 5.1 | 命令上下文 | `redis.client` |
| Neovim | 5.1 (LuaJIT) | Buffer/Window | `nvim_buf` 等 |
| WoW | 5.1 | UI 元素 | `Frame`, `Texture` |
| LuaJIT | 5.1 + FFI | cdata（替代 userdata） | 编译期类型 |
| Love2D | 5.1 (LuaJIT) | 图形/音频对象 | C 内部类型 |

---

## 9. 习题

### 9.1 选择题

**Q1**. 下列关于 light userdata 的描述，正确的是：

A. 可以有 `__gc` 元方法
B. 内存由 Lua GC 管理
C. 是一个 `void*` 指针值，不参与 GC
D. 必须通过 `lua_newuserdata` 创建

**答案**：C

**解析**：light userdata 仅存储一个 `void*` 指针值，不参与 GC，也不能有独立的 `__gc`（Lua 5.4 起支持全局 light userdata metatable，但仅作类型化，不触发 `__gc`）。

---

**Q2**. 在 Lua 5.4 中，`lua_newuserdatauv(L, sz, n)` 的第三个参数 `n` 表示：

A. 用户数据大小
B. uservalue 数量
C. 元方法数量
D. 内存对齐

**答案**：B

**解析**：Lua 5.4 引入多 uservalue 支持，`n` 指定每个 userdata 关联的 uservalue 数量（0 到 `LUA_UTYPE_LIMIT`）。

---

**Q3**. 关于 `__gc` 元方法，下列说法错误的是：

A. 仅 full userdata 支持
B. metatable 首次设置时 `__gc` 被标记为可终结
C. `__gc` 至多被调用一次
D. 可以在 `__gc` 中调用 `luaL_error` 抛出 Lua 错误

**答案**：D

**解析**：`__gc` 中调用 `luaL_error` 是未定义行为，可能导致 Lua 状态损坏。

---

**Q4**. `luaL_checkudata(L, idx, tname)` 的类型识别机制基于：

A. userdata 的大小
B. metatable 的引用比较
C. userdata 的内存地址
D. 字符串匹配

**答案**：B

**解析**：`luaL_checkudata` 通过比较 userdata 的 metatable 与 registry 中 `tname` 对应的 metatable 的**引用**来判断类型。

---

### 9.2 填空题

**Q1**. full userdata 在 Lua 内部由 `______` 结构表示，其类型标签为 `LUA_TUSERDATA`，数值为 `______`。

**答案**：`Udata`；7

---

**Q2**. Lua 5.4 引入的 `______` 关键字允许变量在离开作用域时自动调用 `__close` 元方法，提供确定性资源释放。

**答案**：`<close>`

---

**Q3**. 创建 full userdata 的 C API 是 `______`（Lua 5.1-5.3）或 `______`（Lua 5.4 多 uservalue 版本）。

**答案**：`lua_newuserdata`；`lua_newuserdatauv`

---

**Q4**. `luaL_setmetatable(L, tname)` 等价于两步操作：`______` + `______`。

**答案**：`luaL_getmetatable(L, tname)`；`lua_setmetatable(L, -2)`

---

### 9.3 编程题

**Q1**. 实现一个 `Vector3` userdata，包含 `x`, `y`, `z` 三个 double 字段，支持以下操作：

- `Vector3.new(x, y, z)` 创建
- `v:length()` 计算长度
- `v:normalize()` 归一化
- `v1 + v2` 加法
- `v == w` 相等比较
- `tostring(v)` 字符串表示

**参考答案**：

```c
#define LUA_LIB
#include <math.h>
#include <lua.h>
#include <lauxlib.h>

typedef struct {
    double x, y, z;
} Vector3;

static const char V3_MT[] = "FANDEX.Vector3";

static int l_v3_new(lua_State *L) {
    double x = luaL_checknumber(L, 1);
    double y = luaL_checknumber(L, 2);
    double z = luaL_checknumber(L, 3);
    Vector3 *v = (Vector3 *)lua_newuserdatauv(L, sizeof(Vector3), 0);
    v->x = x; v->y = y; v->z = z;
    luaL_setmetatable(L, V3_MT);
    return 1;
}

static int l_v3_length(lua_State *L) {
    Vector3 *v = (Vector3 *)luaL_checkudata(L, 1, V3_MT);
    double len = sqrt(v->x * v->x + v->y * v->y + v->z * v->z);
    lua_pushnumber(L, len);
    return 1;
}

static int l_v3_normalize(lua_State *L) {
    Vector3 *v = (Vector3 *)luaL_checkudata(L, 1, V3_MT);
    double len = sqrt(v->x * v->x + v->y * v->y + v->z * v->z);
    if (len == 0) {
        return luaL_error(L, "cannot normalize zero vector");
    }
    Vector3 *r = (Vector3 *)lua_newuserdatauv(L, sizeof(Vector3), 0);
    r->x = v->x / len;
    r->y = v->y / len;
    r->z = v->z / len;
    luaL_setmetatable(L, V3_MT);
    return 1;
}

static int l_v3_add(lua_State *L) {
    Vector3 *a = (Vector3 *)luaL_checkudata(L, 1, V3_MT);
    Vector3 *b = (Vector3 *)luaL_checkudata(L, 2, V3_MT);
    Vector3 *r = (Vector3 *)lua_newuserdatauv(L, sizeof(Vector3), 0);
    r->x = a->x + b->x;
    r->y = a->y + b->y;
    r->z = a->z + b->z;
    luaL_setmetatable(L, V3_MT);
    return 1;
}

static int l_v3_eq(lua_State *L) {
    Vector3 *a = (Vector3 *)luaL_checkudata(L, 1, V3_MT);
    Vector3 *b = (Vector3 *)luaL_checkudata(L, 2, V3_MT);
    double eps = 1e-9;
    int eq = (fabs(a->x - b->x) < eps && fabs(a->y - b->y) < eps && fabs(a->z - b->z) < eps);
    lua_pushboolean(L, eq);
    return 1;
}

static int l_v3_tostring(lua_State *L) {
    Vector3 *v = (Vector3 *)luaL_checkudata(L, 1, V3_MT);
    lua_pushfstring(L, "Vector3(%g, %g, %g)", v->x, v->y, v->z);
    return 1;
}

static const luaL_Reg v3_methods[] = {
    {"length", l_v3_length},
    {"normalize", l_v3_normalize},
    {NULL, NULL}
};

static const luaL_Reg v3_metamethods[] = {
    {"__add", l_v3_add},
    {"__eq", l_v3_eq},
    {"__tostring", l_v3_tostring},
    {NULL, NULL}
};

int luaopen_vector3(lua_State *L) {
    luaL_newmetatable(L, V3_MT);
    lua_pushvalue(L, -1);
    lua_setfield(L, -2, "__index");
    luaL_setfuncs(L, v3_methods, 0);
    luaL_setfuncs(L, v3_metamethods, 0);

    lua_newtable(L);
    lua_pushcfunction(L, l_v3_new);
    lua_setfield(L, -2, "new");
    return 1;
}
```

---

**Q2**. 实现一个 `StringBuilder` userdata，内部维护一个 C 端的动态字符缓冲区，支持 `append(str)`、`tostring()` 和 `__gc` 释放内存。

**参考答案**（关键部分）：

```c
#define LUA_LIB
#include <stdlib.h>
#include <string.h>
#include <lua.h>
#include <lauxlib.h>

typedef struct {
    char *buf;
    size_t len;
    size_t cap;
} StringBuilder;

static const char SB_MT[] = "FANDEX.StringBuilder";

static int l_sb_new(lua_State *L) {
    StringBuilder *sb = (StringBuilder *)lua_newuserdatauv(L, sizeof(StringBuilder), 0);
    sb->cap = 256;
    sb->len = 0;
    sb->buf = (char *)malloc(sb->cap);
    if (sb->buf == NULL) {
        return luaL_error(L, "out of memory");
    }
    sb->buf[0] = '\0';
    luaL_setmetatable(L, SB_MT);
    return 1;
}

static int l_sb_append(lua_State *L) {
    StringBuilder *sb = (StringBuilder *)luaL_checkudata(L, 1, SB_MT);
    size_t s_len;
    const char *s = luaL_checklstring(L, 2, &s_len);

    if (sb->len + s_len + 1 > sb->cap) {
        size_t new_cap = sb->cap * 2;
        while (sb->len + s_len + 1 > new_cap) {
            new_cap *= 2;
        }
        char *new_buf = (char *)realloc(sb->buf, new_cap);
        if (new_buf == NULL) {
            return luaL_error(L, "out of memory");
        }
        sb->buf = new_buf;
        sb->cap = new_cap;
    }

    memcpy(sb->buf + sb->len, s, s_len);
    sb->len += s_len;
    sb->buf[sb->len] = '\0';
    return 0;
}

static int l_sb_tostring(lua_State *L) {
    StringBuilder *sb = (StringBuilder *)luaL_checkudata(L, 1, SB_MT);
    lua_pushlstring(L, sb->buf, sb->len);
    return 1;
}

static int l_sb_gc(lua_State *L) {
    StringBuilder *sb = (StringBuilder *)luaL_checkudata(L, 1, SB_MT);
    if (sb->buf != NULL) {
        free(sb->buf);
        sb->buf = NULL;
        sb->len = 0;
        sb->cap = 0;
    }
    return 0;
}

int luaopen_sb(lua_State *L) {
    luaL_newmetatable(L, SB_MT);
    lua_pushvalue(L, -1);
    lua_setfield(L, -2, "__index");

    static const luaL_Reg methods[] = {
        {"append", l_sb_append},
        {"tostring", l_sb_tostring},
        {NULL, NULL}
    };
    static const luaL_Reg metamethods[] = {
        {"__gc", l_sb_gc},
        {"__tostring", l_sb_tostring},
        {NULL, NULL}
    };
    luaL_setfuncs(L, methods, 0);
    luaL_setfuncs(L, metamethods, 0);

    lua_newtable(L);
    lua_pushcfunction(L, l_sb_new);
    lua_setfield(L, -2, "new");
    return 1;
}
```

---

### 9.4 思考题

**Q1**. 为什么 Lua 设计两种 userdata（full 与 light），而不是统一一种？

**参考答案**：

light userdata 的设计动机包括：

1. **零开销**：light userdata 仅占 8 字节（一个指针），无 metatable、无 GC 开销，适合作为 C 端对象的"标签"。
2. **跨 lua_State 携带**：同一进程内不同 lua_State 之间可传递 light userdata（如多线程 Lua 实例），而 full userdata 不能跨状态。
3. **作为弱引用键**：light userdata 常用于 weak table 中作为 C 对象的键，避免持有引用。
4. **C 库句柄映射**：许多 C 库返回句柄（如 `FILE*`、socket fd），light userdata 可直接包装这些值。

但 light userdata 的局限性（无 `__gc`、无独立 metatable）使其不适合长期持有需要释放的资源。两种 userdata 互补，覆盖不同使用场景。

---

**Q2**. 在什么情况下，full userdata 的 `__gc` 不会被调用？

**参考答案**：

1. **程序正常退出**：Lua 状态通过 `lua_close` 关闭时，所有 userdata 的 `__gc` **会被调用**（除非显式禁用）。
2. **强制退出**：调用 `os.exit(0, true)` 第二参数为 true 时，跳过所有 `__gc`。
3. **metatable 首次设置后修改 `__gc`**：仅在首次 setmetatable 时存在的 `__gc` 才会被标记，后续添加的 `__gc` 无效。
4. **crash 或信号终止**：进程被 SIGKILL 等终止时，`__gc` 不会触发。
5. **Lua 5.1 的循环引用场景**：Lua 5.1 中循环引用的 userdata 可能不被回收（5.2+ 改进了此问题）。

---

**Q3**. 比较 `lua_newuserdatauv(L, sz, 0)` 和 `lua_newuserdatauv(L, sz, 1)` 的内存差异，并分析在何种场景下应选择 0 个 uservalue。

**参考答案**：

内存差异：

- `n=0`：分配 `sizeof(Udata)` + `sz` 字节，无 uservalue 槽位。
- `n=1`：分配 `sizeof(Udata)` + `sizeof(UValue)` + `sz` 字节，多约 16 字节。

选择 `n=0` 的场景：

1. **C 结构体内联存储**：所有数据已在 `sz` 内，无需关联 Lua 对象。
2. **方法通过 metatable 共享**：所有方法在 metatable 中，无需每个实例存独立方法。
3. **性能敏感**：减少内存占用，提高缓存命中率。

选择 `n>=1` 的场景：

1. **关联 Lua 端回调**：每个 userdata 持有独立的 Lua 函数。
2. **关联元数据**：每个实例需要不同的 Lua 端属性。
3. **替代 `__index` 表查找**：uservalue 比表查找更高效。

---

## 10. 参考文献

### 10.1 核心文献

- [1] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, *Lua 5.4 Reference Manual*, PUC-Rio, 2020. [Online]. Available: https://www.lua.org/manual/5.4/

- [2] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "The Evolution of Lua," in *Proceedings of the 3rd ACM SIGPLAN Conference on History of Programming Languages (HOPL III)*, San Diego, CA, USA, 2007, pp. 2-1–2-26. doi: 10.1145/1238844.1238846.

- [3] R. Ierusalimschy, *Programming in Lua*, 4th ed. PUC-Rio, 2016. [Online]. Available: https://www.lua.org/pil/4.0.html

- [4] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "Lua: an extensible extension language," *Journal of the Brazilian Computer Society*, vol. 2, no. 1, pp. 27–42, 1996. doi: 10.1590/S0104-65001996000100003.

- [5] L. H. de Figueiredo, R. Ierusalimschy, and W. Celes, "LuaJIT: a just-in-time compiler for Lua," *Lua.org*, Tech. Rep., 2012.

### 10.2 标准与规范

- [6] PUC-Rio, "Lua 5.4 Source Code," 2020. [GitHub repository]. Available: https://github.com/lua/lua

- [7] M. Pall, "LuaJIT FFI Documentation," 2011. [Online]. Available: http://luajit.org/ext_ffi.html

### 10.3 应用案例文献

- [8] S. Sanfilippo, "Redis and Lua: a love story," *Redis Labs Blog*, 2011. [Online]. Available: https://redis.io/docs/manual/programmability/lua/

- [9] T. M. Schiettecatte, "Embedding Lua in Neovim," *Neovim Documentation*, 2017. [Online]. Available: https://neovim.io/doc/user/

- [10] Blizzard Entertainment, *World of Warcraft API Reference*, 2004-2024. [Online]. Available: https://wowpedia.fandom.com/wiki/World_of_Warcraft_API

### 10.4 学术引用（ACM Reference Format）

R. Ierusalimschy, L. H. de Figueiredo, and W. Celes. 2007. The evolution of Lua. In *Proceedings of the Third ACM SIGPLAN Conference on History of Programming Languages (HOPL III)*. ACM, New York, NY, USA, 2-1–2-26. DOI: https://doi.org/10.1145/1238844.1238846

R. Ierusalimschy, L. H. de Figueiredo, and W. Celes. 1996. Lua: an extensible extension language. *Journal of the Brazilian Computer Society* 2, 1, 27–42. DOI: https://doi.org/10.1590/S0104-65001996000100003

---

## 11. 延伸阅读

### 11.1 书籍

- Roberto Ierusalimschy, *Programming in Lua*, 4th Edition（Lua 5.3，但概念适用于 5.4）
- Kurt Jung, *Lua Quick Reference*（Apress, 2018）
- Roberto Ierusalimschy, *From Brazil to Wikipedia*（Lua 设计哲学演讲）

### 11.2 论文与技术报告

- "The Implementation of Lua 5.0"（JLTB 2005, Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes）
- "A Look at the Design of Lua"（Roberto Ierusalimschy）
- "LuaJIT 2.0: A Just-In-Time Compiler for Lua"（Mike Pall）

### 11.3 在线资源

- Lua 官方站点：https://www.lua.org/
- Lua Users Wiki：http://lua-users.org/wiki/
- LuaJIT 项目：http://luajit.org/
- Lua 文档镜像：https://www.lua.org/manual/5.4/manual.html#4.1
- Lua 教学教程：https://learnxinyminutes.com/docs/lua/

### 11.4 开源项目参考

- **Lua-cURL**：cURL 的 Lua 绑定，大量使用 userdata 包装 `CURL*`
- **lua-socket**：网络库，使用 userdata 包装 socket fd
- **LuaSQLite3**：SQLite 绑定，userdata 包装 `sqlite3*`
- **lgi**：GNOME GObject Introspection 的 Lua 绑定

### 11.5 与本文档相关章节

- [C-API 栈操作](/lua/C-API栈操作)：理解 userdata 在虚拟栈中的操作
- [模块加载](/lua/模块加载)：`luaopen_*` 与 userdata 注册的关系
- [元表与元方法详解](/lua/元表与元方法详解)：`__gc`、`__index` 等元方法的语义

---

## 附录 A：C API 速查表

### A.1 Userdata 创建与访问

| API | 版本 | 说明 |
|-----|------|------|
| `lua_newuserdata(L, sz)` | 5.0+ | 创建 full userdata（单 uservalue） |
| `lua_newuserdatauv(L, sz, n)` | 5.4+ | 创建 full userdata（n 个 uservalue） |
| `lua_touserdata(L, idx)` | 5.0+ | 获取 userdata 指针 |
| `lua_touserdatax(L, idx, &n)` | 5.4+ | 获取指针并返回 uservalue 数量 |
| `lua_pushlightuserdata(L, p)` | 5.0+ | 压入 light userdata |

### A.2 Userdata 元方法

| API | 版本 | 说明 |
|-----|------|------|
| `luaL_newmetatable(L, name)` | 5.1+ | 创建并注册 metatable |
| `luaL_getmetatable(L, name)` | 5.1+ | 获取已注册的 metatable |
| `luaL_setmetatable(L, name)` | 5.3+ | 设置 metatable（含 get + set） |
| `luaL_checkudata(L, idx, name)` | 5.1+ | 类型检查 userdata |
| `luaL_testudata(L, idx, name)` | 5.3+ | 类型测试（不抛错） |
| `lua_setmetatable(L, idx)` | 5.0+ | 设置 metatable |
| `lua_getmetatable(L, idx)` | 5.0+ | 获取 metatable |

### A.3 uservalue 操作（Lua 5.4）

| API | 说明 |
|-----|------|
| `lua_setiuservalue(L, idx, n)` | 设置第 n 个 uservalue |
| `lua_getiuservalue(L, idx, n)` | 获取第 n 个 uservalue |
| `lua_setuservalue(L, idx)` | Lua 5.2/5.3，单 uservalue |
| `lua_getuservalue(L, idx)` | Lua 5.2/5.3，单 uservalue |

---

## 附录 B：调试检查表

### B.1 userdata 异常诊断流程

1. **类型识别失败**：检查 metatable 是否通过 `luaL_newmetatable` 注册到 registry。
2. **`__gc` 未触发**：检查 metatable 首次设置时是否包含 `__gc`。
3. **内存泄漏**：使用 `collectgarbage("count")` 监控，逐步排除。
4. **C 段错误**：检查 `luaL_checkudata` 是否正确调用，避免类型混淆。
5. **跨 lua_State 错误**：确认 userdata 不在多个状态间传递。

### B.2 常见错误信息对照

| 错误信息 | 可能原因 | 解决方案 |
|----------|----------|----------|
| `bad argument #1 to 'getx' (FANDEX.Point expected, got userdata)` | metatable 不匹配 | 检查 `luaL_newmetatable` 调用 |
| `attempt to index a userdata value` | metatable 未设置或 `__index` 错误 | 检查 metatable 注册流程 |
| `invalid key to 'next'` | 迭代 userdata 未实现 `__pairs` | 添加 `__pairs` 元方法 |
| `stack overflow` | `__index` 递归调用 | 检查 `__index` 是否导致死循环 |

---

*文档版本：v2.0  金标准升级  最后更新：2026-06-14*
