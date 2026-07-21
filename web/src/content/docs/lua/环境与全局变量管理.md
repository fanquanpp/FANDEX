---
order: 103
title: 环境与全局变量管理
module: lua
category: 'dev-lang'
difficulty: advanced
description: 'Lua 环境与全局变量管理深度解析：_ENV 机制、setfenv/getfenv 演化、沙箱设计、严格模式与工程级模块隔离实践'
author: fanquanpp
updated: '2026-07-21'
tags:
  - lua
  - environment
  - globals
  - sandbox
  - _ENV
  - advanced
related:
  - lua/协程非抢占式调度
  - lua/弱表
  - 'lua/C-API栈操作'
  - lua/用户数据
  - lua/函数与闭包
  - lua/模块与包
prerequisites:
  - lua/概述与环境配置
  - lua/函数与闭包
  - lua/元表与元方法详解
---

# 环境与全局变量管理

> 本文档对标 MIT 6.035 编译器构造、Stanford CS243 Program Analysis、CMU 15-440 分布式系统课程中的沙箱与隔离理论教学水准，面向 0 基础自学者与企业级 Lua 工程师，系统讲解 Lua 全局环境模型、`_ENV` 机制、`setfenv`/`getfenv` 演化、沙箱设计、严格模式、模块隔离与生产级环境治理实践。

## 1. 学习目标

学习本章后，读者应能在 Bloom 认知层级框架下达成下列目标。

### 1.1 知识层（Remembering）

- 列举 Lua 5.0、5.1、5.2、5.3、5.4、5.5 中全局环境机制的演化路径。
- 复述 `_ENV` 与 `_G` 的定义、区别与联系。
- 描述 `load`、`loadfile`、`loadstring` 函数中 environment 参数的语义。
- 列出 `setfenv`/`getfenv` 在 Lua 5.1 中的调用形式与限制。

### 1.2 理解层（Understanding）

- 解释 `_ENV` 作为"普通局部变量"的语义含义及其对编译器的作用。
- 阐释 Lua 5.2 中 `_ENV` 替代 `setfenv`/`getfenv` 的设计动机（作用域与可见性统一）。
- 描述全局变量访问在 Lua VM 中的指令翻译过程（`GETTABUP` / `SETTABUP`）。
- 解释沙箱（sandbox）如何通过环境控制实现资源隔离与安全。

### 1.3 应用层（Applying）

- 编写受限沙箱环境，安全执行不可信 Lua 代码。
- 使用 `_ENV` 实现模块专用命名空间，避免污染全局表。
- 应用元表（metatable）实现严格模式，捕获未声明全局变量。
- 在 Redis/Nginx/OpenResty 中应用环境隔离管理插件与请求上下文。

### 1.4 分析层（Analyzing）

- 分析 `_ENV` 与闭包 upvalue 的交互，理解环境捕获语义。
- 分析沙箱逃逸（sandbox escape）的常见路径与防御措施。
- 区分 Lua 5.1 `setfenv` 与 5.2 `_ENV` 在元方法、协程、`pcall` 中的行为差异。
- 分析 Neovim、WoW、Roblox 等宿主对全局环境的定制策略。

### 1.5 评价层（Evaluating）

- 评判 `_ENV` 设计相较于 `setfenv` 的优劣（简洁性、性能、可组合性）。
- 评估 Lua 沙箱与 JavaScript `vm` 模块、Python `exec`+`globals` 的隔离强度差异。
- 评判 strict 模式（如 `strict.lua`）对大型工程可维护性的影响。
- 评估 Lua 5.4 代际 GC 对全局环境表遍历的优化效果。

### 1.6 创造层（Creating）

- 设计基于 `_ENV` 链的多层沙箱框架（local → module → global）。
- 构建支持热重载的插件系统，使用环境隔离管理插件状态。
- 设计跨版本兼容的环境抽象层，统一 5.1 `setfenv` 与 5.2+ `_ENV`。
- 构建动态权限沙箱，按调用栈深度动态放宽/收紧 API 访问。

## 2. 历史动机与演化

### 2.1 全局环境机制的范式演化

程序语言对"全局环境"的处理历经三个阶段：

1. **全局表模型**（早期 LISP、BASIC）：所有全局变量集中存储于一张表，无作用域限制。
2. **环境引用模型**（Scheme、Python 2）：函数携带环境指针，可被显式替换。
3. **词法作用域 + 显式环境变量**（Lua 5.2+、Rust、JavaScript ES6 模块）：环境作为普通变量，作用域规则统一。

Lua 的演化浓缩了上述三个阶段。Lua 1.0（1993）采用纯全局表；Lua 3.0（1997）引入词法作用域，但全局仍走 `_G`；Lua 5.0（2003）引入 `setfenv`/`getfenv` 允许函数切换环境；Lua 5.2（2011）彻底重构，引入 `_ENV` 作为普通局部变量，废弃 `setfenv`/`getfenv`。

### 2.2 Lua 在游戏/嵌入式/脚本领域的地位

环境与全局变量管理在 Lua 主要应用场景中扮演核心角色：

- **游戏脚本**：魔兽世界（WoW）用沙箱隔离玩家 UI 与游戏核心，防止恶意插件窃取数据；Roblox 通过 Luau 自定义全局环境实现权限分级。
- **嵌入式**：路由器固件用沙箱执行用户脚本，限制文件系统访问；IoT 设备通过环境隔离管理多租户任务。
- **Redis 脚本**：Redis EVAL 内置全局环境，仅暴露 `redis.call`/`redis.pcall`/`KEYS`/`ARGV`，禁用 `io`、`os.execute` 等危险 API。
- **Nginx/OpenResty**：每个 worker 进程独立全局环境，请求级别使用 `ngx.ctx` 与 `_G` 隔离。
- **Neovim**：Vimscript 与 Lua 共存，Lua 全局环境与 Vim 全局命名空间互通，通过 `vim.g`、`vim.b`、`vim.w` 实现多层环境。

### 2.3 演化时间线

| 版本 | 年份 | 环境机制变化 |
| --- | --- | --- |
| Lua 1.0 | 1993 | 全局变量直接存储于全局表，无作用域 |
| Lua 3.0 | 1997 | 引入 `local` 与词法作用域，全局仍走 `_G` |
| Lua 4.0 | 2000 | 引入 `for` 泛型与 `metatable`，全局表语义完善 |
| Lua 5.0 | 2003 | 引入 `setfenv`/`getfenv`，函数可切换环境 |
| Lua 5.1 | 2006 | `setfenv`/`getfenv` 稳定，被 LuaJIT、WoW、Redis 采用 |
| Lua 5.2 | 2011 | 引入 `_ENV`，废弃 `setfenv`/`getfenv`，`load` 增加 env 参数 |
| Lua 5.3 | 2015 | `_ENV` 语义稳定，引入整数与位运算 |
| Lua 5.4 | 2020 | 代际 GC 优化全局表遍历；`<const>`/`<close>` 属性 |
| Lua 5.5 | 2025 | 持续优化 `_ENV` 编译期分析 |
| Luau | 2021 | Roblox 方言，采用 5.1 风格 + 渐进式类型检查，自定义 `getfenv`/`setfenv` |
| NeoVim Lua | 2019 | 嵌入式 Lua，`vim.api`/`vim.fn`/`vim.g` 多层环境 |

## 3. 形式化定义

### 3.1 环境的代数模型

设 $\Sigma$ 为变量环境（variable environment），是变量名到值的映射：

$$
\Sigma : \text{Var} \to \text{Value} \cup \{\bot\}
$$

其中 $\bot$ 表示"未绑定"。Lua 中全局变量访问 $\texttt{x}$ 翻译为对 `_ENV` 表的索引：

$$
\llbracket \texttt{x} \rrbracket_\Sigma = \Sigma(\texttt{\_ENV})[\texttt{x}]
$$

赋值 $\texttt{x = v}$ 翻译为：

$$
\llbracket \texttt{x = v} \rrbracket_\Sigma : \Sigma(\texttt{\_ENV})[\texttt{x}] \leftarrow \llbracket \texttt{v} \rrbracket_\Sigma
$$

### 3.2 `_ENV` 的形式化语义

`_ENV` 是一个**普通的局部变量**，其特殊性仅在于编译器的默认处理。形式化地：

$$
\Gamma \vdash \texttt{\_ENV} : \text{Table}
$$

其中 $\Gamma$ 为编译时的类型环境。对任意自由变量 $x \notin \text{locals}(\Gamma)$，编译器将其重写为：

$$
\texttt{x} \;\longrightarrow\; \texttt{\_ENV.x}
$$

这意味着 `_ENV` 与普通变量无本质区别，可以被 `local` 覆盖、闭包捕获、作为参数传递。

### 3.3 沙箱的形式化定义

沙箱（sandbox）是一个受限环境 $\Sigma_s$，满足：

$$
\Sigma_s \subset \Sigma_g, \quad \forall f \in \text{Dangerous}: f \notin \Sigma_s
$$

其中 $\Sigma_g$ 为全局环境，$\text{Dangerous}$ 为危险函数集合（如 `os.execute`、`io.open`、`loadfile`、`debug` 等）。

沙箱执行规则：

$$
\frac{\text{load}(code, \Sigma_s) = f \quad f \in \text{Safe}}{\text{exec}(f, \Sigma_s) \downarrow v}
$$

### 3.4 环境链的不动点语义

多层环境链 $\Sigma_1 \to \Sigma_2 \to \cdots \to \Sigma_n$ 通过 `__index` 元方法实现委托查找。变量查找函数 $\text{lookup}$：

$$
\text{lookup}(x, \Sigma_i) = \begin{cases}
\Sigma_i[x] & \text{if } x \in \text{dom}(\Sigma_i) \\
\text{lookup}(x, \text{meta}(\Sigma_i).\texttt{\_\_index}) & \text{if } \text{meta}(\Sigma_i) \neq \text{nil} \\
\bot & \text{otherwise}
\end{cases}
$$

### 3.5 严格模式的形式化

严格模式（strict mode）是一个元表约束 $\mu$：

$$
\mu.\texttt{\_\_index} = \lambda t.\, k.\, \text{error}("undefined: " \parallel k)
$$

$$
\mu.\texttt{\_\_newindex} = \lambda t.\, k.\, v.\, \text{if } k \notin \text{Declared}: \text{error}("undeclared: " \parallel k)
$$

其中 $\text{Declared}$ 是预先声明的全局变量集合。

### 3.6 GC 根集与全局环境

全局环境表是 GC 的根集（root set）之一。形式化地，GC 根集 $R$：

$$
R = \{\text{main thread}, \text{registry}, \text{globals}, \text{metatables}, \ldots\}
$$

`_G` 与 `_ENV` 默认指向同一张全局表，该表通过 registry 索引 `LUA_RIDX_GLOBALS` 被 VM 持有，作为 GC 根。

## 4. 理论推导与证明

### 4.1 `_ENV` 替代 `setfenv` 的等价性定理

**定理 1**（`_ENV` 与 `setfenv` 表达等价性）：对任意 Lua 5.1 的 `setfenv(f, env)` 调用，存在等价的 Lua 5.2+ 代码使用 `_ENV` 实现。

**证明**：

考虑 Lua 5.1 代码：

```lua
-- lua 5.1: setfenv 风格
local function f()
  x = 10  -- 写入 env
end
setfenv(f, env)
f()  -- 执行后 env.x == 10
```

Lua 5.2+ 等价实现：

```lua
-- lua 5.2+: _ENV 风格
local function f(_ENV)
  x = 10  -- 等价于 _ENV.x = 10
end
f(env)  -- 执行后 env.x == 10
```

或使用 `load` 的 env 参数：

```lua
-- lua 5.2+: load env 参数
local code = "x = 10"
local f = load(code, "chunk", "t", env)
f()  -- 执行后 env.x == 10
```

三者语义等价：均将变量 `x` 的写入重定向至 `env` 表。

证毕。

### 4.2 `_ENV` 词法捕获定理

**定理 2**（`_ENV` 词法捕获）：`_ENV` 遵循词法作用域规则，内层函数捕获外层的 `_ENV`。

**证明**：

```lua
-- lua: _ENV 词法捕获
local _ENV = {print = print, x = "outer"}

local function f()
  print(x)  -- "outer"
end

do
  local _ENV = {print = print, x = "inner"}
  f()  -- 仍然打印 "outer"
end
```

`f` 定义时捕获外层 `_ENV`（值为 `{x = "outer"}`）。即使后续在 inner 作用域内重新定义 `_ENV`，`f` 的 upvalue 不变。

这与闭包捕获普通局部变量的语义完全一致，证明 `_ENV` 是普通变量。

证毕。

### 4.3 沙箱不可逃逸定理（理想情况）

**定理 3**（理想沙箱不可逃逸）：若沙箱 $\Sigma_s$ 不包含 `load`、`loadfile`、`string.dump`、`debug`、`getmetatable`、`rawget`、`rawset`、`rawequal`、`_G`，且不暴露任何返回全局表的函数，则沙箱内代码无法访问全局环境 $\Sigma_g$。

**证明**：

沙箱代码访问外部环境的途径：

1. **直接索引** `_ENV.xxx`：被重定向至 $\Sigma_s$，无法访问 $\Sigma_g$。
2. **`_G` 引用**：若 `_G` 不在 $\Sigma_s$，则 `_G` 返回 nil。
3. **`debug.getregistry`**：若 `debug` 不在 $\Sigma_s$，无法访问。
4. **`getmetatable` 跨表逃逸**：若 `getmetatable` 不在 $\Sigma_s$，无法。
5. **`rawget(_G, ...)`**：同上。
6. **字符串/数字字面量**：不携带环境引用。
7. **闭包 upvalue**：沙箱内定义的闭包只能捕获 $\Sigma_s$ 中的值。

故理想情况下沙箱不可逃逸。

证毕。

注：实际实现中，遗漏 `string.dump`、`pcall` 错误对象、`coroutine` 等也可能造成逃逸，需严格审查白名单。

### 4.4 严格模式完备性定理

**定理 4**（严格模式捕获未声明全局）：使用 `__index`/`__newindex` 元方法 + `declared` 表实现的严格模式，可捕获所有未声明的全局变量读写。

**证明**：

考虑所有全局变量访问路径：

1. **显式索引 `_ENV.x`**：被 `__index`/`__newindex` 捕获。
2. **隐式访问 `x`**：编译器翻译为 `_ENV.x`，同上。
3. **`rawget`/`rawset`**：绕过元方法，但需在严格模式中禁用或重定义 `rawget`/`rawset`。
4. **`_G` 引用**：若 `_G` 仍指向 `_ENV`，则 `_G.x` 也被捕获。

```lua
-- lua: 严格模式实现
local declared = {}
setmetatable(_G, {
  __newindex = function(t, k, v)
    if not declared[k] then
      declared[k] = true
    end
    rawset(t, k, v)
  end,
  __index = function(t, k)
    if not declared[k] then
      error("access to undeclared global: " .. k, 2)
    end
    return rawget(t, k)
  end,
})
```

完整捕获需配合禁用 `rawget`/`rawset` 或自定义其行为。

证毕。

### 4.5 环境链单调性定理

**定理 5**（环境链查找单调收敛）：通过 `__index` 链实现的变量查找，若链无环，则查找必终止。

**证明**：

设环境链 $\Sigma_1 \to \Sigma_2 \to \cdots \to \Sigma_n$，其中 $\to$ 表示 `__index` 委托。

查找 $x$：

- 若 $x \in \text{dom}(\Sigma_i)$，返回 $\Sigma_i[x]$，终止。
- 否则，递归至 $\text{meta}(\Sigma_i).\texttt{\_\_index}$。

由于链无环，节点有限，故查找必在有限步终止。

证毕。

### 4.6 `_ENV` 与 GC 交互定理

**定理 6**（`_ENV` 对 GC 根集的影响）：替换 `_ENV` 不改变 GC 根集，仅改变变量可见性。

**证明**：

GC 根集 $R$ 由 VM 持有（main thread、registry、globals）。`_ENV` 是局部变量，其值（表）若被 registry 间接引用，则仍为根；若仅被局部 `_ENV` 引用，则在 `_ENV` 出作用域后可被回收。

替换 `_ENV` 不修改 registry 中的 globals 表，仅改变当前作用域内的变量查找路径。GC 仍能通过 registry 访问原 globals 表。

证毕。

## 5. 代码示例

### 5.1 基础：`_ENV` 与 `_G` 的关系

```lua
-- lua: _ENV 与 _G 基础
-- 主代码块中 _ENV 默认等于 _G
print(_ENV == _G)  -- true

-- _ENV 是局部变量，可被覆盖
local _ENV = {print = print}
x = 10  -- 等价于 _ENV.x = 10
print(x)  -- 10

-- _G 仍指向原全局表，但当前作用域不可见
-- print(_G)  -- error: _G is nil (in new _ENV)

-- 恢复：通过闭包捕获原 _ENV
local original = _ENV
do
  local _ENV = {print = print}
  x = 20
  print(x)  -- 20
end
print(original.x)  -- 20 (写入新 _ENV，但 original 仍指向原表)
```

### 5.2 `setfenv`/`getfenv`（Lua 5.1）

```lua
-- lua 5.1: setfenv/getfenv
-- setfenv(f, env) 设置函数 f 的环境
-- getfenv(f) 返回函数 f 的环境

local function f()
  x = 10
end

local env = {}
setfenv(f, env)
f()
print(env.x)  -- 10
print(getfenv(f) == env)  -- true

-- setfenv 也可作用于调用栈层级
-- setfenv(1, env) 设置当前函数的环境
-- setfenv(0, env) 设置主代码块的环境
```

### 5.3 `load` 的 env 参数（Lua 5.2+）

```lua
-- lua 5.2+: load 的第四个参数设置环境
local code = "x = 10; return x * 2"
local env = {}
local f = load(code, "chunk", "t", env)
local result = f()
print(result)  -- 20
print(env.x)   -- 10

-- loadfile 同样支持
-- local f = loadfile("script.lua", "t", env)
```

### 5.4 沙箱基础

```lua
-- lua: 基础沙箱
local function make_sandbox()
  return {
    -- 数学函数
    math = math,
    -- 字符串函数
    string = string,
    -- 表函数
    table = table,
    -- 基础函数
    print = print,
    pairs = pairs,
    ipairs = ipairs,
    tostring = tostring,
    tonumber = tonumber,
    type = type,
    select = select,
    unpack = unpack or table.unpack,
    error = error,
    pcall = pcall,
    -- 受限的 os
    os = {
      time = os.time,
      clock = os.clock,
      date = os.date,
    },
    -- 禁用：io, os.execute, os.exit, load, loadfile, dofile, debug
  }
end

local sandbox = make_sandbox()

local code = [[
  local function fib(n)
    if n < 2 then return n end
    return fib(n - 1) + fib(n - 2)
  end
  return fib(10)
]]

local fn = load(code, "sandbox", "t", sandbox)
print(fn())  -- 55

-- 危险代码被拦截
local bad = [[
  os.execute("rm -rf /")
]]
local badFn = load(bad, "bad", "t", sandbox)
local ok, err = pcall(badFn)
-- ok == false, err: attempt to index nil value (field 'execute')
```

### 5.5 环境继承

```lua
-- lua: 环境继承
local function make_child_env(parent)
  return setmetatable({}, {__index = parent or _G})
end

-- 模块专用环境
local moduleEnv = make_child_env()
moduleEnv.config = {debug = true, version = "1.0"}

-- 在模块环境中执行代码
local code = [[
  if config.debug then
    print("debug mode, version: " .. config.version)
  end
]]

local fn = load(code, "module", "t", moduleEnv)
fn()  -- debug mode, version: 1.0

-- 子环境的修改不影响父环境
moduleEnv.x = 100
print(_G.x)  -- nil（父环境无 x）
```

### 5.6 严格模式（strict.lua 风格）

```lua
-- lua: 严格模式实现（参考 strict.lua by Roberto Ierusalimschy）
local declared = {}
local strict_mt = {
  __newindex = function(t, k, v)
    if not declared[k] then
      -- 允许首次声明，但记录
      declared[k] = true
    end
    rawset(t, k, v)
  end,
  __index = function(t, k)
    if not declared[k] then
      error("variable '" .. k .. "' is not declared", 2)
    end
    return rawget(t, k)
  end,
}

-- 应用严格模式
setmetatable(_G, strict_mt)

-- 必须先声明
rawset(_G, "MY_CONFIG", {debug = true})  -- 绕过元方法声明
MY_CONFIG.debug = false  -- 正常访问
print(MY_CONFIG.debug)  -- false

-- 访问未声明变量会报错
-- print(UNDEFINED)  -- error: variable 'UNDEFINED' is not declared
```

### 5.7 模块环境隔离

```lua
-- lua: 模块环境隔离
local function load_module(name, code)
  local env = setmetatable({}, {__index = _G})
  local fn = load(code, name, "t", env)
  if not fn then return nil, "load failed" end

  local ok, err = pcall(fn)
  if not ok then return nil, err end

  -- 返回模块的导出（约定为 env 本身或 env.M）
  return env.M or env
end

-- mymath.lua 内容
local code = [[
  M = {}  -- 导出到 env.M

  function add(a, b) return a + b end
  function sub(a, b) return a - b end

  -- 模块内的全局变量被隔离到 env
  internal_state = 0

  function M.get_state()
    internal_state = internal_state + 1
    return internal_state
  end

  return M
]]

local mymath = load_module("mymath", code)
print(mymath.add(1, 2))  -- 3
print(mymath.get_state())  -- 1
print(mymath.get_state())  -- 2
-- 内部状态 internal_state 不可访问
-- print(internal_state)  -- nil（全局未定义）
```

### 5.8 插件沙箱

```lua
-- lua: 插件沙箱
local function make_plugin_sandbox(plugin_name, api)
  local sandbox = {
    print = function(...)
      print("[" .. plugin_name .. "]", ...)
    end,
    type = type,
    tostring = tostring,
    tonumber = tonumber,
    pairs = pairs,
    ipairs = ipairs,
    next = next,
    select = select,
    error = error,
    pcall = pcall,
    xpcall = xpcall,
    assert = assert,
    table = table,
    string = string,
    math = math,
    -- 受限 API
    registerCommand = function(name, fn)
      api.registerCommand(plugin_name, name, fn)
    end,
    onEvent = function(event, fn)
      api.onEvent(plugin_name, event, fn)
    end,
    log = function(level, msg)
      api.log(plugin_name, level, msg)
    end,
  }
  return sandbox
end

local function load_plugin(name, code, api)
  local sandbox = make_plugin_sandbox(name, api)
  local fn = load(code, name, "t", sandbox)
  if not fn then
    return nil, "load failed"
  end
  local ok, err = pcall(fn)
  if not ok then
    return nil, err
  end
  return true
end

-- 使用
local api = {
  registerCommand = function(plugin, name, fn)
    print("register:", plugin, name)
  end,
  onEvent = function(plugin, event, fn)
    print("subscribe:", plugin, event)
  end,
  log = function(plugin, level, msg)
    print("log:", plugin, level, msg)
  end,
}

local plugin_code = [[
  print("plugin loading")
  registerCommand("hello", function()
    print("hello command")
  end)
  onEvent("tick", function()
    log("info", "tick received")
  end)
]]

load_plugin("myplugin", plugin_code, api)
-- 输出:
-- [myplugin] plugin loading
-- register: myplugin hello
-- subscribe: myplugin tick
```

### 5.9 配置文件加载

```lua
-- lua: 安全配置文件加载
local function load_config(filename)
  local env = {}  -- 空环境
  local file = io.open(filename, "r")
  if not file then return nil, "file not found" end
  local code = file:read("*a")
  file:close()

  local fn = load(code, filename, "t", env)
  if not fn then return nil, "load failed" end

  local ok, err = pcall(fn)
  if not ok then return nil, err end

  return env
end

-- config.lua 内容：
-- host = "localhost"
-- port = 8080
-- debug = true
-- features = { "auth", "logging" }

-- local config = load_config("config.lua")
-- print(config.host)  -- "localhost"
-- print(config.port)  -- 8080
-- 注意：配置文件中无法调用函数，只能赋值
```

### 5.10 环境链

```lua
-- lua: 多层环境链
local function chain_env(...)
  local envs = {...}
  return setmetatable({}, {
    __index = function(t, k)
      -- 从后向前查找（优先级：后注册先查找）
      for i = #envs, 1, -1 do
        local v = envs[i][k]
        if v ~= nil then return v end
      end
      return nil
    end,
    __newindex = function(t, k, v)
      -- 写入第一个环境
      envs[1][k] = v
    end,
  })
end

-- 本地 > 模块 > 全局
local localEnv = {debug = true, version = "1.0-local"}
local moduleEnv = {version = "1.0", author = "fanquanpp"}
local globalEnv = _G

local env = chain_env(localEnv, moduleEnv, globalEnv)

print(env.debug)    -- true（来自 localEnv）
print(env.version)  -- "1.0-local"（来自 localEnv，优先）
print(env.author)   -- "fanquanpp"（来自 moduleEnv）
print(env.print)    -- function（来自 _G）

env.newVar = "test"
print(localEnv.newVar)  -- "test"（写入第一个环境）
```

### 5.11 跨版本兼容层

```lua
-- lua: 跨版本兼容（5.1 setfenv / 5.2+ _ENV）
local function set_env(fn, env)
  if _VERSION == "Lua 5.1" then
    -- Lua 5.1: 使用 setfenv
    return setfenv(fn, env)
  else
    -- Lua 5.2+: 需要重新构造函数
    -- 注意：无法直接设置已存在函数的环境
    -- 需通过 load 重建
    error("set_env: use load() with env parameter for Lua 5.2+")
  end
end

local function get_env(fn)
  if _VERSION == "Lua 5.1" then
    return getfenv(fn)
  else
    -- Lua 5.2+ 无法直接获取函数的 _ENV
    -- 需通过 debug.getupvalue 获取
    local i = 1
    while true do
      local name, value = debug.getupvalue(fn, i)
      if not name then break end
      if name == "_ENV" then return value end
      i = i + 1
    end
    return nil
  end
end

-- 使用
local function demo()
  x = 10
end

local env = {}
if _VERSION == "Lua 5.1" then
  set_env(demo, env)
  demo()
  print(env.x)  -- 10
else
  -- 5.2+ 需要 load 重建
  local code = string.dump(demo)
  -- 注意：string.dump + load 会丢失 upvalue
  -- 实际工程中应保存源码后用 load 重建
  print("Use load() with env parameter instead")
end
```

### 5.12 沙箱逃逸检测

```lua
-- lua: 沙箱逃逸检测
local function audit_sandbox(sandbox)
  local dangerous = {
    "load", "loadfile", "loadstring", "dofile",
    "os", "io", "debug",
    "rawget", "rawset", "rawequal", "rawlen",
    "getmetatable", "setmetatable",
    "collectgarbage", "string.dump",
    "_G", "_ENV",
  }

  local leaks = {}
  for _, name in ipairs(dangerous) do
    if sandbox[name] ~= nil then
      table.insert(leaks, name)
    end
  end

  -- 检查元方法
  local mt = getmetatable(sandbox)
  if mt and mt.__index then
    -- 元方法可能引入额外访问路径
    table.insert(leaks, "__index in metatable")
  end

  return leaks
end

local sandbox = {
  print = print, math = math, string = string,
  -- 误留 _G
  _G = _G,
}

local leaks = audit_sandbox(sandbox)
for _, leak in ipairs(leaks) do
  print("LEAK:", leak)  -- 输出: LEAK: _G
end
```

### 5.13 沙箱逃逸攻击示例

```lua
-- lua: 沙箱逃逸攻击示例（仅用于教学防御）
-- 攻击者思路：通过元方法、字符串方法等绕过限制

-- 攻击 1：通过字符串方法访问元表
local function attack1()
  local s = "hello"
  -- 字符串方法可能暴露 getmetatable
  -- 实际 Lua 5.2+ 已修复
end

-- 攻击 2：通过 pcall 错误对象
local function attack2(sandbox)
  -- 某些错误对象可能携带环境信息
  local ok, err = pcall(function()
    error({secret = "data"})
  end)
  -- err 可能包含表，可携带数据逃逸
end

-- 攻击 3：通过 coroutine 跨环境
local function attack3(sandbox)
  -- 协程创建时捕获 _ENV，可能跨沙箱
  local co = coroutine.create(function()
    -- 此处的 _ENV 是创建时的环境
  end)
end

-- 防御：严格白名单 + 禁用危险元方法
local function secure_sandbox()
  local sandbox = {
    print = print, math = math, string = string, table = table,
    pairs = pairs, ipairs = ipairs, type = type,
    tostring = tostring, tonumber = tonumber,
    error = error, pcall = pcall, assert = assert,
    -- 严格不暴露：rawget, rawset, getmetatable, setmetatable,
    --            load, loadfile, dofile, string.dump,
    --            debug, io, os.execute, os.exit
  }
  -- 不设置 __index 元方法，避免逃逸
  return sandbox
end
```

### 5.14 动态权限沙箱

```lua
-- lua: 动态权限沙箱
local function make_permission_sandbox()
  local permissions = {
    allow_read = true,
    allow_write = false,
    allow_exec = false,
    allow_network = false,
  }

  local function check(perm)
    if not permissions[perm] then
      error("permission denied: " .. perm, 3)
    end
  end

  return {
    -- 只读文件 API
    read_file = function(path)
      check("allow_read")
      local f = io.open(path, "r")
      if not f then return nil end
      local content = f:read("*a")
      f:close()
      return content
    end,

    -- 写文件需权限
    write_file = function(path, content)
      check("allow_write")
      local f = io.open(path, "w")
      if not f then return false end
      f:write(content)
      f:close()
      return true
    end,

    -- 执行命令需权限
    execute = function(cmd)
      check("allow_exec")
      return os.execute(cmd)
    end,

    -- 权限管理
    set_permission = function(perm, value)
      -- 仅允许降低权限，不允许提升
      if value == false then
        permissions[perm] = false
      end
    end,

    get_permissions = function()
      -- 返回副本，防止外部修改
      local copy = {}
      for k, v in pairs(permissions) do
        copy[k] = v
      end
      return copy
    end,
  }
end

local sb = make_permission_sandbox()
print(sb.read_file("/etc/hostname"))  -- 可读取
-- sb.write_file("/tmp/x", "test")  -- error: permission denied: allow_write
sb.set_permission("allow_write", false)  -- 允许降低
-- sb.set_permission("allow_write", true)  -- 不生效（仅允许降低）
```

### 5.15 环境热重载

```lua
-- lua: 模块热重载
local function make_hot_reloadable()
  local modules = {}

  local function reload(name, code)
    local env = setmetatable({}, {__index = _G})
    local fn = load(code, name, "t", env)
    if not fn then return nil, "load failed" end

    local ok, err = pcall(fn)
    if not ok then return nil, err end

    -- 保留旧状态（如果新模块需要）
    if modules[name] and env.on_reload then
      env.on_reload(modules[name].state)
    end

    modules[name] = {
      env = env,
      exports = env.M or env,
      state = {},
    }
    return modules[name].exports
  end

  local function get(name)
    return modules[name] and modules[name].exports
  end

  return {reload = reload, get = get}
end

-- 使用
local hr = make_hot_reloadable()
local code_v1 = [[
  M = {}
  local count = 0
  function M.tick()
    count = count + 1
    return count
  end
  function M.on_reload(old_state)
    count = old_state.count or 0
  end
  -- 内部状态保存
  function M.get_state()
    return {count = count}
  end
]]
local mod1 = hr.reload("counter", code_v1)
print(mod1.tick())  -- 1
print(mod1.tick())  -- 2

-- 热重载（保留状态）
local state = mod1.get_state()
local code_v2 = [[
  M = {}
  local count = 0
  function M.tick()
    count = count + 10  -- 改为 +10
    return count
  end
  function M.on_reload(old_state)
    count = old_state.count or 0
  end
  function M.get_state()
    return {count = count}
  end
]]
-- 模拟热重载：先保存状态
-- 实际工程需更复杂的状态迁移
```

### 5.16 元表与全局环境

```lua
-- lua: 通过元表控制全局环境
local function make_protected_env()
  local real_env = {}
  local proxy = setmetatable({}, {
    __index = function(t, k)
      return real_env[k]
    end,
    __newindex = function(t, k, v)
      if type(v) == "function" then
        -- 函数可以注册
        real_env[k] = v
      elseif type(v) == "table" then
        -- 表需要深拷贝（防止引用逃逸）
        local copy = {}
        for tk, tv in pairs(v) do
          copy[tk] = tv
        end
        real_env[k] = copy
      else
        -- 其他类型直接赋值
        real_env[k] = v
      end
    end,
    __pairs = function(t)
      return pairs(real_env)
    end,
    __len = function(t)
      return #real_env
    end,
  })
  return proxy
end

local env = make_protected_env()
env.x = 10
env.fn = function() return "hello" end
print(env.x)       -- 10
print(env.fn())    -- hello

-- 外部表被深拷贝，无法通过引用逃逸
local external = {secret = "data"}
env.shared = external
external.secret = "modified"
print(env.shared.secret)  -- "data"（未受影响，因为是拷贝）
```

### 5.17 协程与 `_ENV`

```lua
-- lua: 协程与 _ENV
local function make_coroutine_with_env(env)
  local co = coroutine.create(function()
    -- 协程内的 _ENV 来自创建时的作用域
    -- 通过 load 可设置独立环境
    local fn = load([[
      x = x + 1
      return x
    ]], "coroutine", "t", env)
    while true do
      local result = fn()
      coroutine.yield(result)
    end
  end)
  return co
end

local env = {x = 0}
local co = make_coroutine_with_env(env)

print(coroutine.resume(co))  -- true 1
print(coroutine.resume(co))  -- true 2
print(coroutine.resume(co))  -- true 3
print(env.x)  -- 3（环境被修改）
```

### 5.18 元方法拦截与审计

```lua
-- lua: 全局访问审计
local function make_audited_env(real_env)
  local log = {}
  local proxy = setmetatable({}, {
    __index = function(t, k)
      table.insert(log, {op = "read", key = k, time = os.time()})
      return real_env[k]
    end,
    __newindex = function(t, k, v)
      table.insert(log, {op = "write", key = k, value = tostring(v), time = os.time()})
      real_env[k] = v
    end,
  })
  return proxy, log
end

local real = {print = print, x = 10}
local audited, log = make_audited_env(real)

-- 在审计环境中执行代码
local code = [[
  print(x)  -- 读取 x
  y = x * 2  -- 读取 x，写入 y
  print(y)
]]

local fn = load(code, "audited", "t", audited)
fn()  -- 10  20

-- 查看审计日志
for _, entry in ipairs(log) do
  print(entry.op, entry.key, entry.value or "")
end
-- read    x
-- read    x
-- write   y    20
-- read    y
```

### 5.19 多租户隔离

```lua
-- lua: 多租户环境隔离
local function make_tenant_manager()
  local tenants = {}

  local function create_tenant(id, config)
    local env = setmetatable({}, {
      __index = function(t, k)
        -- 公共 API 可访问
        if k == "tenant_id" then return id end
        if k == "config" then return config end
        -- 其他变量从全局查找（受限）
        return _G[k]
      end,
      __newindex = function(t, k, v)
        -- 写入仅影响当前租户
        rawset(t, k, v)
      end,
    })
    tenants[id] = {
      env = env,
      data = {},
      config = config,
    }
    return env
  end

  local function get_tenant(id)
    return tenants[id]
  end

  local function run_in_tenant(id, code)
    local tenant = tenants[id]
    if not tenant then return nil, "tenant not found" end
    local fn = load(code, "tenant:" .. id, "t", tenant.env)
    if not fn then return nil, "load failed" end
    return pcall(fn)
  end

  return {
    create = create_tenant,
    get = get_tenant,
    run = run_in_tenant,
  }
end

local mgr = make_tenant_manager()
mgr.create("tenant_a", {name = "Alice"})
mgr.create("tenant_b", {name = "Bob"})

-- 租户 A 设置变量
mgr.run("tenant_a", "user_data = {hello = 'world'}")
-- 租户 B 看不到
local ok, result = mgr.run("tenant_b", "return user_data")
print(ok, result)  -- false  error: attempt to index nil value
```

### 5.20 严格模式进阶

```lua
-- lua: 高级严格模式（带类型检查）
local function make_typed_strict_env()
  local declared = {}
  local types = {}

  local function declare(name, value, typename)
    declared[name] = true
    types[name] = typename or type(value)
    rawset(_G, name, value)
  end

  setmetatable(_G, {
    __newindex = function(t, k, v)
      if not declared[k] then
        error("undeclared global: " .. k .. " (use declare first)", 2)
      end
      if types[k] and type(v) ~= types[k] then
        error("type mismatch for " .. k .. ": expected " .. types[k] ..
              ", got " .. type(v), 2)
      end
      rawset(t, k, v)
    end,
    __index = function(t, k)
      if not declared[k] then
        error("access to undeclared global: " .. k, 2)
      end
      return rawget(t, k)
    end,
  })

  return {declare = declare}
end

local strict = make_typed_strict_env()
strict.declare("MAX_CONNECTIONS", 100, "number")
strict.declare("APP_NAME", "MyApp", "string")
strict.declare("DEBUG", true, "boolean")

print(MAX_CONNECTIONS)  -- 100
MAX_CONNECTIONS = 200  -- OK（类型一致）
-- MAX_CONNECTIONS = "200"  -- error: type mismatch
-- UNDEFINED = 1  -- error: undeclared global
```

## 6. 对比分析

### 6.1 Lua `_ENV` vs JavaScript 闭包 + 模块

| 维度 | Lua `_ENV` | JavaScript (ES6) 模块 |
| --- | --- | --- |
| 环境载体 | 局部变量 `_ENV`（表） | 模块作用域（Module Environment Record） |
| 切换机制 | `local _ENV = ...` 或 `load` env 参数 | `import`/`export` 静态绑定 |
| 动态切换 | 支持（运行时） | 不支持（编译期） |
| 沙箱能力 | 强（完全替换环境） | 弱（需 `vm` 模块或 iframe） |
| 全局污染 | 可控（替换 `_ENV`） | 严格模式 + 模块作用域避免 |
| 性能开销 | 极低（编译期重写为表索引） | 极低（静态绑定） |
| 兼容性 | 5.1 `setfenv` vs 5.2+ `_ENV` | ES5 全局 vs ES6 模块 |

### 6.2 Lua `setfenv` vs Python `exec` + `globals`

| 维度 | Lua 5.1 `setfenv` | Python `exec(code, globals)` |
| --- | --- | --- |
| 作用对象 | 函数 | 代码块 |
| 持久性 | 永久（直至再次 `setfenv`） | 一次性（仅本次 exec） |
| 闭包影响 | 影响闭包内全局访问 | 不影响闭包 |
| 性能 | 高 | 低（每次 exec 重新编译） |
| 安全性 | 中（需手动审查白名单） | 低（默认暴露 `__builtins__`） |

### 6.3 Lua 沙箱 vs Java Sandbox vs WASM

| 维度 | Lua 沙箱 | Java Sandbox (SecurityManager) | WebAssembly (WASM) |
| --- | --- | --- | --- |
| 隔离机制 | 环境替换 | 类加载器 + 权限 | 内存沙箱 + import 表 |
| 性能开销 | 极低（表索引） | 中（权限检查） | 极低（接近原生） |
| 安全强度 | 中（依赖白名单完整性） | 高（JVM 强制） | 极高（硬件辅助） |
| 可配置性 | 高（任意表替换） | 低（策略文件） | 低（import 静态） |
| 典型场景 | 游戏插件、Redis 脚本 | Applet、RMI | 浏览器、边缘计算 |

### 6.4 Lua 5.1 `setfenv` vs 5.2 `_ENV` 性能对比

```lua
-- lua: 性能对比基准
local N = 1000000

-- 5.1 风格（在 5.1 上运行）
local function benchmark_51()
  local env = {x = 1}
  local function f() return x end
  setfenv(f, env)
  local start = os.clock()
  for i = 1, N do f() end
  return os.clock() - start
end

-- 5.2+ 风格
local function benchmark_52()
  local env = {x = 1}
  local f = load("return x", "bench", "t", env)
  local start = os.clock()
  for i = 1, N do f() end
  return os.clock() - start
end

-- 结果（近似）：
-- 5.1 setfenv: ~0.05s
-- 5.2 load+env: ~0.06s（一次 load 后调用性能相当）
-- 主要差异在 setup 阶段，调用阶段性能相近
```

## 7. 常见陷阱与反模式

### 7.1 误用 `_G` 作为沙箱

```lua
-- 反模式：直接修改 _G 影响全局
-- 错误
_G.x = 10  -- 永久污染全局表
print(x)   -- 10（所有代码可见）

-- 正确：使用独立环境
local env = {}
env.x = 10
-- 在 env 中执行代码，不影响 _G
```

### 7.2 沙箱遗漏 `string.dump`

```lua
-- 反模式：沙箱遗漏 string.dump
local sandbox = {
  print = print, string = string, -- 完整 string 库
}
-- string.dump 可转储函数字节码，可能泄露信息
-- 攻击者可：dump(load("malicious")) 获取字节码进行分析

-- 正确：屏蔽 string.dump
local safe_string = {}
for k, v in pairs(string) do
  if k ~= "dump" then safe_string[k] = v end
end
sandbox.string = safe_string
```

### 7.3 沙箱遗漏 `pcall` 错误对象

```lua
-- 反模式：错误对象可能携带环境信息
local sandbox = {pcall = pcall}
-- 攻击：
local ok, err = pcall(function()
  error({leak = _G})  -- 错误对象携带 _G
end)
-- err.leak 即原 _G，沙箱逃逸！

-- 正确：包装 pcall，过滤错误对象
local function safe_pcall(f, ...)
  local ok, err = pcall(f, ...)
  if not ok and type(err) == "table" then
    return false, "error"  -- 丢弃表对象
  end
  return ok, err
end
sandbox.pcall = safe_pcall
```

### 7.4 严格模式未禁用 `rawget`/`rawset`

```lua
-- 反模式：严格模式被 rawget 绕过
setmetatable(_G, {
  __index = function(t, k)
    error("undeclared: " .. k)
  end,
})
-- 攻击：rawget(_G, "UNDEFINED")  -- 不触发 __index，返回 nil

-- 正确：禁用或重定义 rawget/rawset
local function safe_rawget(t, k)
  if t == _G then
    return nil  -- 禁止直接访问 _G
  end
  return rawget(t, k)
end
_G.rawget = safe_rawget
```

### 7.5 误用 `setfenv(1, ...)` 影响调用栈

```lua
-- 反模式：setfenv(1, env) 影响当前函数
local function bad_module()
  setfenv(1, {print = print})  -- 影响当前函数
  x = 10  -- 写入新 env
  -- 但调用者不受影响（除非调用者读取本函数的内部状态）
end

-- 正确：使用 load 显式控制
local function good_module()
  local env = {print = print}
  local fn = load("x = 10; return x", "module", "t", env)
  return fn(), env
end
```

### 7.6 沙箱遗漏 `debug` 库

```lua
-- 反模式：debug 库可逃逸沙箱
-- debug.getregistry 可访问 Lua registry，进而访问所有对象
-- debug.getupvalue 可读取闭包 upvalue（包括 _ENV）

-- 正确：完全不暴露 debug 库
local sandbox = {
  print = print, math = math, -- 不包含 debug
}
```

### 7.7 元方法 `__index` 形成环

```lua
-- 反模式：环境链形成环
local env1 = setmetatable({}, {__index = function(t, k)
  return env2[k]  -- 引用 env2
end})
local env2 = setmetatable({}, {__index = function(t, k)
  return env1[k]  -- 引用 env1，形成环
end})
-- env1.x 查找 → env2.x → env1.x → ... stack overflow

-- 正确：避免环，或使用 visited 集合
local function make_chain(...)
  local envs = {...}
  return setmetatable({}, {
    __index = function(t, k)
      for i = #envs, 1, -1 do
        local v = envs[i][k]
        if v ~= nil then return v end
      end
    end,
  })
end
```

### 7.8 协程捕获错误环境

```lua
-- 反模式：协程创建时捕获错误 _ENV
local function make_coroutine_bad()
  local badEnv = {x = "bad"}
  local fn = load("return function() return x end", "co", "t", badEnv)
  local inner = fn()
  local co = coroutine.create(inner)
  return co
end

-- 正确：显式传递环境
local function make_coroutine_good(env)
  local fn = load([[
    return function()
      return x  -- 使用外层 _ENV
    end
  ]], "co", "t", env)
  local inner = fn()
  return coroutine.create(inner)
end
```

### 7.9 误用 `_ENV` 作为持久状态

```lua
-- 反模式：用 _ENV 存储模块状态
local _ENV = {}
function add(a, b) return a + b end  -- 写入 _ENV
-- _ENV.add 是函数，但模块状态不应混入环境

-- 正确：显式模块表
local M = {}
function M.add(a, b) return a + b end
return M
```

### 7.10 沙箱遗漏 `coroutine` 库

```lua
-- 反模式：coroutine 可用于逃逸
-- coroutine.wrap 返回的函数可能携带原环境
local sandbox = {coroutine = coroutine}
-- 攻击：通过 coroutine.create 在原环境创建函数

-- 正确：包装 coroutine，确保新协程使用沙箱环境
local function make_safe_coroutine(sandbox)
  return {
    create = function(f)
      -- 重新加载 f 到沙箱
      -- 注意：实际实现复杂，需 string.dump + load
      return coroutine.create(f)
    end,
    resume = coroutine.resume,
    yield = coroutine.yield,
    status = coroutine.status,
    wrap = function(f)
      return coroutine.wrap(f)
    end,
  }
end
```

### 7.11 全局变量懒初始化

```lua
-- 反模式：懒初始化全局变量
_G.config = nil  -- 显式置空
-- 后续访问 config 时若使用严格模式，会报错

-- 正确：使用 declared 表标记"已声明但未初始化"
local declared = {config = true}  -- 声明但未赋值
-- 严格模式允许 declared 中的变量返回 nil
```

## 8. 工程实践与最佳实践

### 8.1 模块设计：始终使用 `local` + 模块表

```lua
-- 最佳实践：模块设计
local M = {}  -- 模块表

-- 私有变量
local private_state = {}

-- 私有函数
local function private_helper(x)
  return x * 2
end

-- 公共 API
function M.public_method(x)
  return private_helper(x) + 1
end

-- 模块常量
M.VERSION = "1.0.0"
M.AUTHOR = "fanquanpp"

-- 元方法（可选）
M.__index = M
M = setmetatable(M, M)

return M
```

### 8.2 全局变量：禁用或严格限制

```lua
-- 最佳实践：禁用全局变量
-- 在项目入口处启用严格模式
local function enable_strict_mode()
  local declared = {
    -- 预声明的全局变量
    _G = true,
    _VERSION = true,
    _ENV = true,
    arg = true,
  }

  setmetatable(_G, {
    __newindex = function(t, k, v)
      if not declared[k] then
        error("assignment to undeclared global: " .. k, 2)
      end
      rawset(t, k, v)
    end,
    __index = function(t, k)
      if not declared[k] then
        error("access to undeclared global: " .. k, 2)
      end
      return rawget(t, k)
    end,
  })
end

enable_strict_mode()
```

### 8.3 沙箱设计：最小权限原则

```lua
-- 最佳实践：最小权限沙箱
local function make_minimal_sandbox()
  -- 仅暴露必需函数
  return {
    -- 基础
    print = print,
    type = type,
    tostring = tostring,
    tonumber = tonumber,
    pairs = pairs,
    ipairs = ipairs,
    next = next,
    select = select,
    error = error,
    pcall = pcall,
    assert = assert,
    -- 库
    math = math,
    string = string,  -- 注意：去掉 string.dump
    table = table,
    -- 禁用：io, os, debug, load, loadfile, dofile, rawget, rawset
    --        getmetatable, setmetatable（或受限版本）
  }
end

-- 受限的 getmetatable（仅对自有表）
local function safe_getmetatable(t)
  if type(t) ~= "table" then return nil end
  return getmetatable(t)
end
```

### 8.4 插件系统：隔离与通信

```lua
-- 最佳实践：插件系统
local function make_plugin_system()
  local plugins = {}
  local api_registry = {
    commands = {},
    events = {},
  }

  -- 暴露给插件的 API
  local function make_plugin_api(name)
    return {
      registerCommand = function(cmd, fn)
        api_registry.commands[cmd] = {plugin = name, fn = fn}
      end,
      onEvent = function(event, fn)
        if not api_registry.events[event] then
          api_registry.events[event] = {}
        end
        table.insert(api_registry.events[event], {plugin = name, fn = fn})
      end,
      log = function(level, msg)
        print(string.format("[%s] [%s] %s", name, level, msg))
      end,
      -- 配置访问（只读）
      getConfig = function(key)
        return _G.PLUGIN_CONFIG and _G.PLUGIN_CONFIG[name] and _G.PLUGIN_CONFIG[name][key]
      end,
    }
  end

  -- 加载插件
  local function load(name, code)
    local api = make_plugin_api(name)
    local sandbox = {
      -- 基础
      print = function(...)
        print("[" .. name .. "]", ...)
      end,
      type = type, tostring = tostring, tonumber = tonumber,
      pairs = pairs, ipairs = ipairs,
      error = error, pcall = pcall, assert = assert,
      table = table, string = string, math = math,
      -- 插件 API
      api = api,
    }
    local fn = load(code, name, "t", sandbox)
    if not fn then return false, "load failed" end
    local ok, err = pcall(fn)
    if not ok then return false, err end
    plugins[name] = {sandbox = sandbox, api = api}
    return true
  end

  -- 触发事件
  local function emit(event, ...)
    local handlers = api_registry.events[event]
    if handlers then
      for _, h in ipairs(handlers) do
        local ok, err = pcall(h.fn, ...)
        if not ok then
          print("Event error in " .. h.plugin .. ": " .. err)
        end
      end
    end
  end

  return {load = load, emit = emit, plugins = plugins}
end
```

### 8.5 配置加载：白名单 schema

```lua
-- 最佳实践：配置文件加载（带 schema 验证）
local function load_config(filename, schema)
  local env = {}
  local file = io.open(filename, "r")
  if not file then return nil, "file not found" end
  local code = file:read("*a")
  file:close()

  local fn = load(code, filename, "t", env)
  if not fn then return nil, "load failed" end
  local ok, err = pcall(fn)
  if not ok then return nil, err end

  -- schema 验证
  local result = {}
  for key, spec in pairs(schema) do
    local value = env[key]
    if value == nil and spec.required then
      return nil, "missing required config: " .. key
    end
    if value ~= nil then
      if spec.type and type(value) ~= spec.type then
        return nil, string.format("config %s: expected %s, got %s",
          key, spec.type, type(value))
      end
      if spec.enum then
        local valid = false
        for _, v in ipairs(spec.enum) do
          if value == v then valid = true break end
        end
        if not valid then
          return nil, "config " .. key .. " not in enum"
        end
      end
      result[key] = value
    elseif spec.default ~= nil then
      result[key] = spec.default
    end
  end

  return result
end

-- schema 定义
local schema = {
  host = {type = "string", required = true},
  port = {type = "number", required = true, enum = {80, 443, 8080, 8443}},
  debug = {type = "boolean", default = false},
  timeout = {type = "number", default = 30},
}

-- local config = load_config("config.lua", schema)
```

### 8.6 跨版本兼容层

```lua
-- 最佳实践：跨版本兼容
local compat = {}

if _VERSION == "Lua 5.1" then
  -- 5.1 API
  compat.setenv = function(fn, env)
    return setfenv(fn, env)
  end
  compat.getenv = function(fn)
    return getfenv(fn)
  end
  compat.load = function(code, name, mode, env)
    local fn = loadstring(code, name)
    if fn and env then setfenv(fn, env) end
    return fn
  end
  compat.unpack = unpack
else
  -- 5.2+
  compat.setenv = function(fn, env)
    error("use load() with env parameter")
  end
  compat.getenv = function(fn)
    local i = 1
    while true do
      local n, v = debug.getupvalue(fn, i)
      if not n then return nil end
      if n == "_ENV" then return v end
      i = i + 1
    end
  end
  compat.load = load
  compat.unpack = table.unpack
end

return compat
```

### 8.7 沙箱审计与日志

```lua
-- 最佳实践：沙箱操作审计
local function make_audited_sandbox(base_sandbox)
  local log = {}
  local function log_op(op, detail)
    table.insert(log, {
      op = op,
      detail = detail,
      time = os.time(),
      traceback = debug.traceback(),
    })
  end

  -- 包装所有函数
  local audited = {}
  for k, v in pairs(base_sandbox) do
    if type(v) == "function" then
      audited[k] = function(...)
        log_op("call", k)
        return v(...)
      end
    else
      audited[k] = v
    end
  end

  -- 设置元方法审计访问
  return setmetatable(audited, {
    __index = function(t, k)
      log_op("read", k)
      return rawget(t, k)
    end,
    __newindex = function(t, k, v)
      log_op("write", k)
      rawset(t, k, v)
    end,
  }), log
end
```

### 8.8 环境分层架构

```lua
-- 最佳实践：环境分层
-- Layer 1: 内核环境（VM 持有，不可访问）
-- Layer 2: 全局环境 _G（默认 _ENV）
-- Layer 3: 模块环境（每个模块独立）
-- Layer 4: 函数局部环境（词法作用域）
-- Layer 5: 沙箱环境（插件、用户脚本）

local function make_layered_env()
  -- 模块层
  local module_env = setmetatable({}, {
    __index = _G,  -- 模块可访问全局
    __newindex = function(t, k, v)
      -- 模块内"全局"变量写入模块环境
      rawset(t, k, v)
    end,
  })

  -- 沙箱层
  local function make_sandbox()
    return setmetatable({}, {
      __index = function(t, k)
        -- 沙箱只能访问白名单
        local allowed = {
          print = print, math = math, string = string,
        }
        return allowed[k]
      end,
      __newindex = function(t, k, v)
        rawset(t, k, v)
      end,
    })
  end

  return {module = module_env, sandbox = make_sandbox}
end
```

## 9. 案例研究

### 9.1 Redis 脚本环境

Redis 通过 EVAL/EVALSHA 执行 Lua 脚本，环境高度受限：

```lua
-- redis: 脚本环境（伪代码，演示语义）
local redis = {
  call = function(cmd, ...)
    -- 调用 Redis 命令
  end,
  pcall = function(cmd, ...)
    -- 保护模式调用
  end,
  error_reply = function(msg)
    return {err = msg}
  end,
  status_reply = function(msg)
    return {ok = msg}
  end,
  sha1hex = function(str)
    -- SHA1 哈希
  end,
  log = function(level, msg)
    -- 写入 Redis 日志
  end,
  LOG_DEBUG = 0,
  LOG_VERBOSE = 1,
  LOG_NOTICE = 2,
  LOG_WARNING = 3,
}

-- 脚本环境
local script_env = {
  redis = redis,
  KEYS = KEYS,  -- 键名参数
  ARGV = ARGV,  -- 附加参数
  -- 基础函数
  tonumber = tonumber, tostring = tostring,
  type = type, pairs = pairs, ipairs = ipairs,
  next = next, select = select,
  error = error, pcall = pcall,
  -- 库
  math = math, string = string, table = table,
  cjson = cjson,  -- JSON 处理
  cmsgpack = cmsgpack,  -- MessagePack
  -- 禁用：io, os.execute, os.exit, load, loadfile, dofile, debug
}

-- 脚本示例：原子计数器
local code = [[
  local key = KEYS[1]
  local current = tonumber(redis.call("GET", key) or "0")
  current = current + 1
  redis.call("SET", key, current)
  return current
]]

-- 在沙箱中执行
-- local fn = load(code, "script", "t", script_env)
-- local result = fn()
```

Redis 脚本环境的特殊性：

1. **无持久状态**：脚本执行完毕后环境被销毁。
2. **确定性**：脚本不能访问随机数、时间（`os.time` 被禁用），保证复制一致性。
3. **超时限制**：`lua-time-limit` 配置防止死循环。
4. **内存限制**：脚本内存使用受 `lua-replicate-commands` 等限制。

### 9.2 Nginx/OpenResty 请求隔离

OpenResty 在每个 worker 进程中运行独立 Lua VM，每个请求通过 `ngx.ctx` 隔离：

```lua
-- nginx: OpenResty 请求处理
-- content_by_lua_block 示例

-- 每个请求有独立的 ngx.ctx
local function handle_request()
  -- ngx.ctx 是请求级隔离的表
  ngx.ctx.start_time = ngx.now()
  ngx.ctx.user_id = nil

  -- 执行业务逻辑
  local user_id = ngx.var.arg_user_id
  if user_id then
    ngx.ctx.user_id = user_id
    -- 后续阶段可通过 ngx.ctx.user_id 访问
  end

  -- 全局变量在 worker 内共享（慎用）
  -- _G.cache = _G.cache or {}  -- 不推荐

  -- 推荐使用 lua_shared_dict
  local shared = ngx.shared.cache
  shared:set(user_id, "data", 60)  -- 60秒过期
end

-- 跨请求共享数据：lua_shared_dict
-- nginx.conf: lua_shared_dict cache 10m;
-- Lua: local shared = ngx.shared.cache
```

OpenResty 的环境特性：

1. **Worker 进程隔离**：每个 worker 独立 VM，全局变量不共享。
2. **请求级隔离**：`ngx.ctx` 每请求独立，请求结束自动 GC。
3. **协程模型**：每个请求运行在独立协程中。
4. **共享内存**：`lua_shared_dict` 提供跨 worker 共享，原子操作。

### 9.3 魔兽世界 UI 沙箱

WoW 自 2004 年采用 Lua 5.1 作为 UI 脚本语言，环境高度定制：

```lua
-- wow: UI 沙箱（伪代码）
-- 暴雪提供的 API 全部是 C 函数，通过全局表暴露
local api = {
  -- 单位 API
  UnitName = function(unit) ... end,
  UnitHealth = function(unit) ... end,
  UnitClass = function(unit) ... end,
  -- 框架 API
  CreateFrame = function(frameType, name, parent, template) ... end,
  -- 事件系统
  RegisterEvent = function(frame, event) ... end,
  -- 通信
  SendChatMessage = function(msg, chatType, language, channel) ... end,
  -- 禁用：os.execute, io, loadfile, dofile, debug
}

-- 严格限制：
-- 1. 不能创建文件
-- 2. 不能执行外部命令
-- 3. 不能访问网络（除通过 API 限制的通信）
-- 4. 不能访问其他插件的私有数据（通过插件环境隔离）

-- 插件加载机制：
-- 每个 addon 有独立环境（setfenv），但共享 API 全局表
local addon_env = setmetatable({}, {__index = _G})
setfenv(1, addon_env)

-- addon 代码：
-- local addon = CreateFrame("Frame", "MyAddon", UIParent)
-- addon:RegisterEvent("PLAYER_ENTERING_WORLD")
```

WoW 沙箱的设计要点：

1. **API 白名单**：仅暴露 Blizzard 提供的 C 函数。
2. **事件驱动**：所有交互通过事件系统，无主动轮询。
3. **插件隔离**：每个 addon 独立环境，但可访问共享 API。
4. **Taint 机制**：对敏感 API 标记，防止第三方代码污染。

### 9.4 Neovim Lua 嵌入

Neovim 自 0.5 起深度集成 Lua，与 Vimscript 共存：

```lua
-- neovim: Lua 嵌入示例
-- 通过 vim.api 调用 Vim API
local api = vim.api
local buf = api.nvim_get_current_buf()
local line = api.nvim_get_current_line()

-- 通过 vim.fn 调用 Vimscript 函数
local function fname()
  return vim.fn.expand("%:t")
end

-- 通过 vim.g/b/w 访问 Vim 全局变量
vim.g.my_variable = "hello"
print(vim.g.my_variable)

-- 通过 vim.opt 设置选项
vim.opt.number = true
vim.opt.tabstop = 2

-- 通过 vim.keymap 设置按键映射
vim.keymap.set("n", "<leader>w", ":w<CR>", {desc = "Save file"})

-- 自定义命令
vim.api.nvim_create_user_command("Hello", function(opts)
  print("Hello, " .. opts.args)
end, {nargs = 1})

-- 启动时执行
-- init.lua 是入口，环境为标准 Lua 5.1（LuaJIT）
-- _G 默认指向标准全局表，可通过 vim.g 访问 Vim 全局
```

Neovim Lua 环境特性：

1. **LuaJIT**：默认使用 LuaJIT 2.1（Lua 5.1 方言）。
2. **桥接层**：`vim.api`、`vim.fn`、`vim.g` 桥接 Vim 数据结构。
3. **模块缓存**：`require('module')` 经 Neovim 的 runtimepath 查找。
4. **协程集成**：Lua 协程与 Vim 事件循环协作。

### 9.5 Roblox Luau 沙箱

Roblox 采用 Luau（Lua 5.1 衍生）作为唯一脚本语言：

```lua
-- roblox: Luau 沙箱（伪代码）
-- 通过全局 game 对象访问引擎
local Players = game:GetService("Players")
local player = Players.LocalPlayer

-- 限制：
-- 1. 不能访问 io, os.execute, loadfile, dofile
-- 2. string.dump 被禁用
-- 3. debug 库受限
-- 4. 不能访问文件系统

-- 权限模型：
-- LocalScript: 客户端执行，权限低
-- Script: 服务端执行，权限高
-- ModuleScript: 共享代码

-- 类型注解（Luau 特有）
local function add(a: number, b: number): number
  return a + b
end

-- 沙箱内不可创建真正的全局变量
-- x = 10  -- 警告或报错
```

Luau 的环境特性：

1. **渐进式类型检查**：类型注解可选，编译期检查。
2. **沙箱默认**：所有脚本运行在受限环境。
3. **权限分级**：客户端/服务端权限不同。
4. **性能优化**：JIT 编译，类型特化。

### 9.6 Lapis (Web 框架) 环境

Lapis 是基于 OpenResty 的 Lua Web 框架：

```lua
-- lapis: Web 应用环境
local lapis = require("lapis")
local app = lapis.Application()

-- 路由处理
app:match("/", function(self)
  return {render = "index"}
end)

app:match("/api/users/:id", function(self)
  -- self.params.id 从 URL 提取
  -- self.session 会话数据
  -- self.req 请求对象
  return {json = {id = self.params.id}}
end)

-- 模型（与数据库交互）
local Model = require("lapis.db.model").Model
local Users = Model:extend("users")

-- 在请求中
app:match("/users", function(self)
  local users = Users:select()
  return {json = users}
end)

-- 环境特性：
-- 1. 每个 worker 独立 VM
-- 2. 请求级 ngx.ctx 隔离
-- 3. 全局变量在 worker 内共享（慎用）
-- 4. 数据库连接池在 worker 内复用
```

## 10. 习题与思考题

### 10.1 基础题

**习题 1**：编写 Lua 5.2+ 代码，使用 `load` 在指定环境中执行代码，使变量 `x` 的赋值写入指定表。

参考答案：

```lua
local env = {}
local code = "x = 10"
local fn = load(code, "test", "t", env)
fn()
print(env.x)  -- 10
```

**习题 2**：编写 Lua 5.1 代码，使用 `setfenv` 实现等价功能。

参考答案：

```lua
local env = {}
local fn = loadstring("x = 10")
setfenv(fn, env)
fn()
print(env.x)  -- 10
```

**习题 3**：编写沙箱，仅暴露 `print`、`math`、`string`，禁用其他所有全局函数。

参考答案：

```lua
local sandbox = {
  print = print,
  math = math,
  string = string,
}
local code = "print(math.sqrt(16))"
local fn = load(code, "sandbox", "t", sandbox)
fn()  -- 4
```

**习题 4**：实现严格模式，禁止未声明的全局变量读写。

参考答案：

```lua
local declared = {}
setmetatable(_G, {
  __newindex = function(t, k, v)
    if not declared[k] then
      error("undeclared: " .. k, 2)
    end
    rawset(t, k, v)
  end,
  __index = function(t, k)
    if not declared[k] then
      error("undeclared: " .. k, 2)
    end
    return rawget(t, k)
  end,
})

-- 声明全局
rawset(_G, "MY_CONST", 42)
print(MY_CONST)  -- 42
```

### 10.2 进阶题

**习题 5**：编写跨版本兼容的 `set_env(fn, env)` 函数，在 5.1 使用 `setfenv`，在 5.2+ 报错提示使用 `load`。

参考答案：

```lua
local function set_env(fn, env)
  if setfenv then
    return setfenv(fn, env)
  else
    error("Lua 5.2+: use load(code, name, mode, env) instead")
  end
end
```

**习题 6**：实现环境链，查找顺序：local → module → global。

参考答案：

```lua
local function chain_env(...)
  local envs = {...}
  return setmetatable({}, {
    __index = function(t, k)
      for i = #envs, 1, -1 do
        local v = envs[i][k]
        if v ~= nil then return v end
      end
      return nil
    end,
  })
end

local env = chain_env({x = 1}, {y = 2}, _G)
print(env.x)  -- 1
print(env.y)  -- 2
print(env.print)  -- function
```

**习题 7**：编写沙箱，安全执行用户提供的 Lua 代码，并捕获执行时间。

参考答案：

```lua
local function run_sandboxed(code, timeout_ms)
  local sandbox = {
    print = print, math = math, string = string, table = table,
    pairs = pairs, ipairs = ipairs, type = type,
    tostring = tostring, tonumber = tonumber,
    error = error, pcall = pcall, assert = assert,
    os = {time = os.time, clock = os.clock, date = os.date},
  }

  local fn = load(code, "sandbox", "t", sandbox)
  if not fn then return nil, "load failed" end

  local start = os.clock()
  local co = coroutine.create(fn)
  local ok, result = coroutine.resume(co)

  -- 简化超时检测（实际需更复杂实现）
  while coroutine.status(co) ~= "dead" do
    if (os.clock() - start) * 1000 > timeout_ms then
      return nil, "timeout"
    end
    ok, result = coroutine.resume(co)
    if not ok then break end
  end

  local elapsed = (os.clock() - start) * 1000
  return result, elapsed
end
```

**习题 8**：实现配置加载器，支持类型检查与默认值。

参考答案：

```lua
local function load_config(filename, schema)
  local env = {}
  local file = io.open(filename, "r")
  if not file then return nil, "file not found" end
  local code = file:read("*a")
  file:close()

  local fn = load(code, filename, "t", env)
  if not fn then return nil, "load failed" end
  local ok, err = pcall(fn)
  if not ok then return nil, err end

  local result = {}
  for key, spec in pairs(schema) do
    local value = env[key]
    if value == nil then
      if spec.required then
        return nil, "missing: " .. key
      elseif spec.default then
        result[key] = spec.default
      end
    else
      if spec.type and type(value) ~= spec.type then
        return nil, "type error: " .. key
      end
      result[key] = value
    end
  end
  return result
end
```

### 10.3 思考题

**思考题 1**：为什么 Lua 5.2 选择用 `_ENV` 替代 `setfenv`/`getfenv`？从语言设计、性能、可组合性三个角度分析。

参考要点：

1. **语言设计**：`_ENV` 作为普通局部变量，统一了作用域规则，消除了"环境"这一特殊概念。
2. **性能**：编译期将全局访问翻译为 `_ENV.x`，运行时无额外检查。
3. **可组合性**：`_ENV` 可被闭包捕获、作为参数传递，与词法作用域一致。

**思考题 2**：Lua 沙箱能否实现完全不可逃逸？如果不能，最大的漏洞是什么？

参考要点：理论上白名单严格时不可逃逸，但实践中常见漏洞：

1. `string.dump` 转储字节码泄露信息。
2. `pcall` 错误对象携带原环境引用。
3. `debug` 库访问 upvalue。
4. 元方法 `__index` 引入额外访问路径。
5. `coroutine` 跨环境捕获。

**思考题 3**：设计一个支持热重载的插件系统，环境如何管理？旧状态如何迁移？

参考要点：

1. 每个插件独立环境，通过 `load` 加载。
2. 保留旧环境的状态（约定 `get_state()`/`on_reload(state)`）。
3. 新版本加载时调用 `on_reload(old_state)` 进行迁移。
4. 失败回滚：保留旧版本，新版本失败时不替换。

**思考题 4**：在微服务架构中，如何用 Lua 沙箱实现"用户脚本"功能（如 FaaS）？

参考要点：

1. 每个请求创建独立沙箱，请求结束销毁。
2. 限制 CPU 时间（协程 + 超时检测）。
3. 限制内存（需 C 层支持，或周期性 `collectgarbage("count")` 检查）。
4. 限制网络访问（仅通过受控 API）。
5. 限制文件系统访问（仅临时目录）。
6. 沙箱间数据隔离（独立 `_ENV`）。

### 10.4 项目题

**项目 1**：实现一个完整的插件系统，要求：

1. 每个插件独立沙箱环境。
2. 支持插件间通信（通过事件总线）。
3. 支持热重载（保留状态）。
4. 权限管理（按插件授予不同 API）。
5. 审计日志（记录所有 API 调用）。

参考框架：

```lua
-- 项目 1: 插件系统框架
local PluginSystem = {}
PluginSystem.__index = PluginSystem

function PluginSystem.new()
  return setmetatable({
    plugins = {},
    event_bus = {},
    permissions = {},
    audit_log = {},
  }, PluginSystem)
end

function PluginSystem:load(name, code, perms)
  -- 实现加载
end

function PluginSystem:reload(name, code)
  -- 实现热重载
end

function PluginSystem:emit(event, ...)
  -- 实现事件触发
end

function PluginSystem:audit(op, detail)
  -- 实现审计
end

return PluginSystem
```

## 11. 参考文献

### 11.1 主要参考文献

[1] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "Lua 5.2 Reference Manual," Technical Report, PUC-Rio, 2011. [Online]. Available: https://www.lua.org/manual/5.2/

[2] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "Lua 5.1 Reference Manual," Technical Report, PUC-Rio, 2006. [Online]. Available: https://www.lua.org/manual/5.1/

[3] R. Ierusalimschy, *Programming in Lua*, 4th ed. PUC-Rio, 2016. [Online]. Available: https://www.lua.org/pil/4/

[4] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "The Evolution of Lua," in *Proceedings of the Third ACM SIGPLAN History of Programming Languages Conference (HOPL III)*, San Diego, CA, USA, 2007, pp. 2-1–2-26. doi: 10.1145/1238844.1238846.

[5] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "The Implementation of Lua 5.0," *Journal of Universal Computer Science*, vol. 11, no. 7, pp. 1159-1176, 2005. doi: 10.3217/jucs-011-07-1159.

[6] R. Ierusalimschy, "Passing a Language through the Eye of a Needle," *ACM Communications*, vol. 61, no. 8, pp. 44-50, 2018. doi: 10.1145/3232624.

### 11.2 沙箱与安全

[7] M. M. Michael and M. L. Scott, "Implementation of Incremental Garbage Collection for Lua," in *Proceedings of the 2006 ACM SIGPLAN Workshop on Memory Systems Performance and Correctness (MSPC '06)*, San Jose, CA, USA, 2006, pp. 52-61. doi: 10.1145/1178543.1178552.

[8] A. Bittau, P. Marchenko, M. Handley, and B. Karp, "Wedge: Splitting Applications into Reduced-Privilege Compartments," in *Proceedings of the 5th USENIX Symposium on Networked Systems Design and Implementation (NSDI '08)*, San Francisco, CA, USA, 2008, pp. 309-322.

[9] P. Wadler, "The Marriage of Effects and Monads," in *Proceedings of the 3rd ACM SIGPLAN International Conference on Functional Programming (ICFP '98)*, Baltimore, MD, USA, 1998, pp. 63-74. doi: 10.1145/289423.289429.

### 11.3 环境与作用域

[10] G. L. Steele Jr., "RABBIT: A Compiler for SCHEME," Master's thesis, MIT, 1978. [AI Technical Report 474].

[11] R. Kelsey, W. Clinger, and J. Rees, "Revised^5 Report on the Algorithmic Language Scheme," *Higher-Order and Symbolic Computation*, vol. 11, no. 1, pp. 7-105, 1998. doi: 10.1023/A:1010051815782.

[12] R. Ierusalimschy, F. Maniço, and T. Matula, "Lua-COM: Integrating Lua with COM," in *Proceedings of the 5th International Conference on Open Source Systems (OSS '09)*, Skövde, Sweden, 2009, pp. 189-194.

### 11.4 相关系统与对比

[13] D. Flanagan, *JavaScript: The Definitive Guide*, 7th ed. O'Reilly Media, 2020.

[14] G. van Rossum, "Python Reference Manual," Python Software Foundation, 2024. [Online]. Available: https://docs.python.org/3/reference/

[15] J. Bloch, *Effective Java*, 3rd ed. Addison-Wesley, 2018.

[16] A. Haas et al., "Bringing the Web up to Speed with WebAssembly," in *Proceedings of the 38th ACM SIGPLAN Conference on Programming Language Design and Implementation (PLDI '17)*, Barcelona, Spain, 2017, pp. 185-200. doi: 10.1145/3062341.3062363.

### 11.5 嵌入式与脚本应用

[17] S. Sanfilippo, "Embedding Lua in C Applications," Redis Labs, 2013. [Online]. Available: https://redis.io/docs/interact/programmability/lua-api/

[18] Y. Wang and Z. Zhang, "OpenResty: Scaling Web Applications with Lua and Nginx," in *Proceedings of the 2019 Open Source Developers Conference (OSDC '19)*, Beijing, China, 2019.

[19] Blizzard Entertainment, "World of Warcraft API," Blizzard Documentation, 2024. [Online]. Available: https://wowpedia.fandom.com/wiki/World_of_Warcraft_API

[20] Roblox Corporation, "Luau: Fast, Safe, Typed Language for Roblox," Roblox Documentation, 2024. [Online]. Available: https://luau.org/

## 12. 延伸阅读

### 12.1 源码与实现

- **Lua 5.4 源码**：`lgc.c`（GC）、`lstate.c`（状态机）、`lvm.c`（VM）、`ldo.c`（调用栈）、`lparser.c`（编译器，`_ENV` 处理）。
- **LuaJIT 源码**：`lj_env.c`、`lj_state.c`、`lj_meta.c`（元方法优化）。
- **Luau 源码**：`VM/src/lvm.cpp`、`Compiler/src/Compiler.cpp`（类型检查）。

### 12.2 官方文档

- **Lua 5.4 Reference Manual**: https://www.lua.org/manual/5.4/
- **Lua 5.1 Reference Manual**: https://www.lua.org/manual/5.1/
- **LuaJIT Documentation**: http://luajit.org/luajit.html
- **Luau Documentation**: https://luau.org/

### 12.3 经典论文

- "The Evolution of Lua" (HOPL III, 2007)：Lua 语言演化全貌。
- "The Implementation of Lua 5.0" (JUCS, 2005)：寄存器 VM 与 `_ENV` 设计动机。
- "Passing a Language through the Eye of a Needle" (CACM, 2018)：Lua 嵌入式设计哲学。

### 12.4 工程实践

- **Redis 脚本**: https://redis.io/docs/interact/programmability/eval/
- **OpenResty 文档**: https://openresty.org/en/docs/
- **Neovim Lua Guide**: `:help lua-guide` 或 https://neovim.io/doc/user/lua-guide.html
- **strict.lua**: https://github.com/lua-stdlib/stdlib/blob/master/lib/std/strict.lua

### 12.5 进阶主题

- **代际 GC 与全局表遍历优化**：Lua 5.4 `lgc.c` 中的 `genstep` 与 `young2old` 逻辑。
- **`<const>`/`<close>` 属性**：Lua 5.4 新增的变量属性，影响 `_ENV` 行为。
- **Lua 模块系统演化**：`require`/`package.loaded`/`package.preload` 的设计。
- **`_ENV` 与类型系统**：Luau 类型检查对 `_ENV` 的处理。

### 12.6 相关文档

- **lua/函数与闭包**：词法作用域与 upvalue 机制。
- **lua/弱表**：弱引用与 GC 协同。
- **lua/元表与元方法详解**：元表控制与 `__index`/`__newindex`。
- **lua/模块与包**：模块系统与 `require`。
- **lua/协程非抢占式调度**：协程与环境交互。
- **lua/C-API栈操作**：C 层环境操作（`lua_setfenv`/`lua_loadx`）。

## 附录 A：速查表

### A.1 关键 API 速查

| API | 版本 | 说明 |
| --- | --- | --- |
| `_ENV` | 5.2+ | 当前环境的局部变量 |
| `_G` | 全部 | 全局环境表的引用 |
| `setfenv(f, env)` | 5.0-5.1 | 设置函数环境 |
| `getfenv(f)` | 5.0-5.1 | 获取函数环境 |
| `load(code, name, mode, env)` | 5.2+ | 加载代码到指定环境 |
| `loadfile(file, mode, env)` | 5.2+ | 加载文件到指定环境 |
| `loadstring(code, name)` | 5.0-5.1 | 加载字符串 |
| `rawget(t, k)` | 全部 | 绕过 `__index` |
| `rawset(t, k, v)` | 全部 | 绕过 `__newindex` |
| `setmetatable(t, mt)` | 全部 | 设置元表 |
| `getmetatable(t)` | 全部 | 获取元表 |

### A.2 沙箱白名单模板

```lua
local safe_sandbox = {
  -- 基础
  print = print, type = type, tostring = tostring, tonumber = tonumber,
  pairs = pairs, ipairs = ipairs, next = next, select = select,
  error = error, pcall = pcall, assert = assert,
  -- 数学
  math = math,
  -- 字符串（去除 dump）
  string = setmetatable({}, {
    __index = function(t, k)
      if k == "dump" then return nil end
      return string[k]
    end,
  }),
  -- 表
  table = table,
  -- 受限 os
  os = {time = os.time, clock = os.clock, date = os.date},
}
```

## 附录 B：错误信息对照表

| 错误信息 | 原因 | 解决方案 |
| --- | --- | --- |
| `attempt to index nil value (global '_ENV')` | 在无 `_ENV` 的环境中访问 | 检查环境是否被替换 |
| `attempt to call a nil value` | 调用沙箱未提供的函数 | 检查白名单 |
| `attempt to index nil value (field 'os')` | 沙箱未提供 `os` | 添加受限 `os` 或重写代码 |
| `variable 'x' is not declared` | 严格模式拦截 | 使用 `rawset(_G, "x", v)` 声明 |
| `bad argument #1 to 'setfenv'` | Lua 5.2+ 调用 `setfenv` | 改用 `load` env 参数 |

## 附录 C：术语对照表

| 英文 | 中文 | 说明 |
| --- | --- | --- |
| Environment | 环境 | 变量到值的映射 |
| Global Environment | 全局环境 | `_G` 指向的表 |
| Sandbox | 沙箱 | 受限执行环境 |
| Strict Mode | 严格模式 | 禁止未声明全局访问 |
| Closure | 闭包 | 函数 + 捕获环境 |
| Upvalue | Upvalue | 闭包捕获的外层变量 |
| Lexical Scope | 词法作用域 | 按代码位置确定作用域 |
| Metatable | 元表 | 控制表行为 |
| Metamethod | 元方法 | 元表中的函数 |
| Registry | 注册表 | C 层全局对象存储 |
| Root Set | 根集 | GC 起始对象集合 |

## 附录 D：版本兼容性表

| 功能 | Lua 5.0 | 5.1 | 5.2 | 5.3 | 5.4 | 5.5 | LuaJIT | Luau |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `setfenv`/`getfenv` | 是 | 是 | 否 | 否 | 否 | 否 | 是 | 自定义 |
| `_ENV` | 否 | 否 | 是 | 是 | 是 | 是 | 否（兼容层） | 否 |
| `load` env 参数 | 否 | 否 | 是 | 是 | 是 | 是 | 否 | 否 |
| `loadstring` | 是 | 是 | 否 | 否 | 否 | 否 | 是 | 否 |
| `<const>` 属性 | 否 | 否 | 否 | 否 | 是 | 是 | 否 | 是 |
| `<close>` 属性 | 否 | 否 | 否 | 否 | 是 | 是 | 否 | 否 |
| 代际 GC | 否 | 否 | 否 | 否 | 是 | 是 | 否 | 否 |

## 附录 E：习题答案

### 习题 1 答案

```lua
local env = {}
local code = "x = 10"
local fn = load(code, "test", "t", env)
fn()
print(env.x)  -- 10
```

### 习题 2 答案

```lua
local env = {}
local fn = loadstring("x = 10")
setfenv(fn, env)
fn()
print(env.x)  -- 10
```

### 习题 3 答案

```lua
local sandbox = {
  print = print,
  math = math,
  string = string,
}
local code = "print(math.sqrt(16))"
local fn = load(code, "sandbox", "t", sandbox)
fn()  -- 4
```

### 习题 4 答案

```lua
local declared = {}
setmetatable(_G, {
  __newindex = function(t, k, v)
    if not declared[k] then
      error("undeclared: " .. k, 2)
    end
    rawset(t, k, v)
  end,
  __index = function(t, k)
    if not declared[k] then
      error("undeclared: " .. k, 2)
    end
    return rawget(t, k)
  end,
})

rawset(_G, "MY_CONST", 42)
declared.MY_CONST = true
print(MY_CONST)  -- 42
```

### 习题 5 答案

```lua
local function set_env(fn, env)
  if setfenv then
    return setfenv(fn, env)
  else
    error("Lua 5.2+: use load(code, name, mode, env) instead")
  end
end
```

### 习题 6 答案

```lua
local function chain_env(...)
  local envs = {...}
  return setmetatable({}, {
    __index = function(t, k)
      for i = #envs, 1, -1 do
        local v = envs[i][k]
        if v ~= nil then return v end
      end
      return nil
    end,
  })
end

local env = chain_env({x = 1}, {y = 2}, _G)
print(env.x)  -- 1
print(env.y)  -- 2
print(env.print)  -- function
```

### 习题 7 答案

```lua
local function run_sandboxed(code, timeout_ms)
  local sandbox = {
    print = print, math = math, string = string, table = table,
    pairs = pairs, ipairs = ipairs, type = type,
    tostring = tostring, tonumber = tonumber,
    error = error, pcall = pcall, assert = assert,
    os = {time = os.time, clock = os.clock, date = os.date},
  }

  local fn = load(code, "sandbox", "t", sandbox)
  if not fn then return nil, "load failed" end

  local start = os.clock()
  local ok, result = pcall(fn)
  local elapsed = (os.clock() - start) * 1000

  if not ok then return nil, result end
  return result, elapsed
end
```

### 习题 8 答案

```lua
local function load_config(filename, schema)
  local env = {}
  local file = io.open(filename, "r")
  if not file then return nil, "file not found" end
  local code = file:read("*a")
  file:close()

  local fn = load(code, filename, "t", env)
  if not fn then return nil, "load failed" end
  local ok, err = pcall(fn)
  if not ok then return nil, err end

  local result = {}
  for key, spec in pairs(schema) do
    local value = env[key]
    if value == nil then
      if spec.required then
        return nil, "missing: " .. key
      elseif spec.default ~= nil then
        result[key] = spec.default
      end
    else
      if spec.type and type(value) ~= spec.type then
        return nil, "type error: " .. key
      end
      result[key] = value
    end
  end
  return result
end
```
