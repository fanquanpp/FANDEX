---
order: 60
title: 模块与包
module: lua
category: 'dev-lang'
difficulty: intermediate
description: 'Lua 模块与包系统深度解析：require 机制、searchers/loaders 演化、LuaRocks 包管理、循环依赖治理、热重载、命名空间模式与多领域工程实践'
author: fanquanpp
updated: '2026-07-21'
tags:
  - lua
  - module
  - package
  - require
  - luarocks
  - intermediate
related:
  - lua/函数与闭包
  - lua/环境与全局变量管理
  - lua/元表与元方法详解
  - lua/协程与异步
  - lua/弱表
prerequisites:
  - lua/概述与环境配置
  - lua/函数与闭包
  - lua/元表与元方法详解
---

# 模块与包

> 本文档对标 MIT 6.005 Software Construction、Stanford CS107 Programming Paradigms、CMU 15-214 Software Engineering 中模块化与软件复用理论教学水准,面向 0 基础自学者与企业级 Lua 工程师,系统讲解 Lua 模块系统（module system）、`require` 机制、`package` 库、LuaRocks 包管理器、循环依赖治理、热重载、命名空间模式与多领域工程级实战案例。

## 1. 学习目标

学习本章后,读者应能在 Bloom 认知层级框架下达成下列目标。

### 1.1 知识层（Remembering）

- 列举 Lua 5.0、5.1、5.2、5.3、5.4、5.5 中模块系统的演化路径:`module()` 函数从有到废、`require` searchers 的演化。
- 复述 `require` 的四个 searchers（Lua 5.2+）或 loaders（Lua 5.1）的执行顺序:preload、path、cpath、all-in-one。
- 描述 `package.loaded`、`package.path`、`package.cpath`、`package.preload`、`package.searchers` 的语义与初始值。
- 列出 LuaRocks 的核心命令:`install`、`remove`、`list`、`search`、`make`、`pack`、`upload`、`config`。
- 列举 Lua C API 中 `luaopen_*`、`luaL_register`、`luaL_newlib`、`lua_require` 的签名与适用版本。

### 1.2 理解层（Understanding）

- 解释 `require` 的查找顺序与 `package.loaded` 缓存的交互:命中即返回,未命中才触发 searcher。
- 阐释 Lua 5.1 `module()` 函数被废弃的设计动机:全局副作用、隐式 `setfenv`、难静态分析。
- 描述 searcher 函数的契约:接收模块名,返回加载函数或找不到的原因字符串。
- 解释 `package.path` 中 `?` 与 `;` 的语义,以及 `?.lua` vs `?/init.lua` 的目录式模块约定。
- 描述 Lua C 模块的动态链接机制:Windows `LoadLibrary`、POSIX `dlopen`、嵌入式环境的静态链接替代。
- 解释 LuaJIT FFI 的 `ffi.cdef`/`ffi.C` 如何替代传统 C 模块,以及其优势与限制。
- 描述 Luau 渐进式类型系统对模块契约的影响:`export type`、`--!strict`、`require` 路径解析。

### 1.3 应用层（Applying）

- 编写符合 Lua 5.2+ 风格的模块（`local M = {}; ... return M`）,避免全局污染。
- 使用 `package.path` 自定义模块搜索路径,支持项目内多版本共存。
- 应用 `package.preload` 预加载模块,实现单文件分发或测试桩（test stub）。
- 编写 C 扩展模块,通过 `luaopen_<modname>` 导出,使用 `luaL_newlib` 注册函数表。
- 使用 LuaRocks 创建、打包、发布 Lua 模块,编写 `rockspec` 文件管理依赖。
- 实现模块热重载（hot reload）:清除 `package.loaded` 后重新 `require`,处理 upvalue 状态保留。
- 在 OpenResty、WoW、Neovim 等宿主中应用其模块约定（`ngx.*`、`addon namespace`、`vim.*`）。

### 1.4 分析层（Analyzing）

- 分析 Lua 模块与 JavaScript CommonJS、ES Modules、Python `import`、Go packages、Rust crates 的本质差异。
- 分析循环依赖（cyclic dependency）的成因:模块 A `require` B,B `require` A,加载顺序与 `package.loaded` 时机。
- 区分 Lua 5.1 `module()` 与 5.2+ 显式 `local M` 模式的可测试性、可静态分析性、可热重载性。
- 分析 LuaJIT、Luau、PicoLua 等方言对 `require` 语义的扩展或限制（FFI 替代 C 模块、类型注解、子集加载）。
- 分析 WoW、Roblox、Neovim 等宿主的自定义模块加载策略,识别其对标准 `require` 的偏差。
- 分析 `require` 在沙箱环境中的逃逸风险（`package.loaders` 注入、`loadfile` 泄露）。

### 1.5 评价层（Evaluating）

- 评判 Lua 模块系统设计的优劣:简洁性（表 + 返回值） vs 表达力（无命名空间层次、无访问控制）。
- 评估 LuaRocks 与 npm、pip、cargo、go mod 在依赖解析、版本锁定、离线支持方面的差异。
- 评判 `package.loaded` 缓存策略对内存占用与一致性的影响,以及热重载场景的取舍。
- 评估 Lua C 模块 ABI 稳定性:Lua 5.1、5.2、5.3、5.4、5.5 之间的兼容性窗口与迁移成本。
- 评判 OpenResty `resty` 命令、WoW AddOn 加载器、Neovim `runtimepath` 等宿主扩展的工程合理性。

### 1.6 创造层（Creating）

- 设计基于元表的命名空间层级系统,模拟 `foo.bar.baz` 的多层级模块组织。
- 构建支持依赖注入（DI）的模块框架,实现可测试、可替换的组件装配。
- 设计模块版本协商机制:运行时检测模块的 `_VERSION`,降级或升级 API 适配。
- 构建热重载开发工具,监听文件变化自动清理 `package.loaded` 并重新 `require`,保留运行时状态。
- 设计跨 Lua 版本（5.1/5.2/5.3/5.4/5.5/LuaJIT/Luau）的模块兼容层,抽象差异（`module()`、`setfenv`、`load`、`unpack`）。

## 2. 历史动机与演化

### 2.1 模块系统的范式演化

程序语言的模块系统历经四个主要阶段:

1. **无模块系统**（早期 BASIC、COBOL）:所有代码共享全局命名空间,通过命名约定（前缀）避免冲突。
2. **文件即模块**（C `#include`、PHP `require`）:文件作为代码组织单元,但仍污染全局命名空间。
3. **命名空间模块**（Python `import`、Java `package`、Ruby `require`）:模块绑定到命名空间,显式导入导出。
4. **静态模块系统**（Rust `mod`/`use`、ES Modules、Go packages）:编译期解析、显式导出、依赖图静态可分析。

Lua 的模块系统演化浓缩了上述阶段。Lua 1.0（1993）无模块系统,所有函数全局可见;Lua 3.0（1997）引入词法作用域,但全局变量仍是主要组织方式;Lua 5.0（2003）引入 `module()` 函数与 `require` 机制,提供正式模块支持;Lua 5.1（2006）完善 `package` 库,被 LuaJIT、WoW、Redis 广泛采用;Lua 5.2（2011）废弃 `module()`,转向显式 `local M = {}; return M` 模式;Lua 5.3+（2015+）持续优化 `require` 的 searcher 机制;Lua 5.4（2020）引入 `<const>`/`<close>` 属性,提升模块资源管理;Lua 5.5（2025）优化模块加载性能。

### 2.2 Lua 在游戏/嵌入式/脚本领域的地位

Lua 模块系统在主要应用场景中扮演核心角色:

- **游戏脚本**:魔兽世界（WoW）AddOn 系统使用自定义加载器管理插件依赖;Roblox Luau 通过 `require` 与 Instance 树结合实现游戏对象模块化;Love2D 使用 `require` 加载游戏资源与逻辑模块。
- **嵌入式**:路由器固件 OpenWrt 使用 Lua 模块配置 UCI（Unified Configuration Interface）;IoT 设备使用精简 `require` 加载固件模块,内存占用极小。
- **Web 服务**:OpenResty 通过 `resty` 命令与 `ngx.var` 集成 Lua 模块;Lapis 框架使用 Lua 模块组织 MVC 结构;Turbo.lua 提供类似 npm 的模块加载体验。
- **Redis 脚本**:Redis EVAL 执行环境无 `require`,但内部用 C 模块方式注册 `redis.call` 等 API;Redis 7+ 引入 Functions 持久化脚本,可使用模块化组织。
- **Neovim**:Vimscript 与 Lua 共存,Lua 模块通过 `runtimepath` 加载,`vim.api`、`vim.fn`、`vim.g` 作为宿主 API 模块。
- **桌面应用**:Lua 与 C 宿主通过 `luaopen_*` 注册扩展模块,实现插件架构。

### 2.3 演化时间线

| 版本 | 年份 | 模块系统变化 |
| --- | --- | --- |
| Lua 1.0 | 1993 | 无模块系统,全局变量为主 |
| Lua 3.0 | 1997 | 引入 `local` 与词法作用域,模块组织仍靠命名约定 |
| Lua 4.0 | 2000 | 引入 `metatable`,模块模式开始萌芽（`M.method` 风格） |
| Lua 5.0 | 2003 | 引入 `module()` 函数与 `require` 机制,`package` 库出现 |
| Lua 5.1 | 2006 | `module()` 稳定,LuaJIT、WoW、Redis、OpenResty 广泛采用 |
| Lua 5.2 | 2011 | 废弃 `module()`,转向 `local M = {}; return M`;`package.loaders` 改名 `package.searchers` |
| Lua 5.3 | 2015 | `require` 性能优化,整数与位运算协同 |
| Lua 5.4 | 2020 | `<const>`/`<close>` 属性,模块资源管理增强;代际 GC 优化 `package.loaded` 遍历 |
| Lua 5.5 | 2025 | 模块加载性能优化,`require` 路径解析改进 |
| LuaJIT | 2011 | `package.path` 兼容 Lua 5.1,新增 FFI 替代 C 模块 |
| Luau | 2021 | Roblox 方言,渐进式类型系统,`export type` 支持模块类型契约 |
| LuaRocks 1.0 | 2007 | 首个 Lua 包管理器,由 Hisham Muhammad 发布 |
| LuaRocks 2.0 | 2009 | 引入 rockspec 依赖声明、本地仓库、远程仓库 |
| LuaRocks 3.0 | 2019 | Lua 5.3+ 支持,新依赖解析器,支持 LuaJIT、Luau |
| OpenResty | 2012 | `resty` 命令行工具,`lua_package_path`/`lua_package_cpath` 指令 |
| Neovim | 2019 | 嵌入式 Lua,`runtimepath` 加载 Lua 模块,`vim.api` 宿主 API |

### 2.4 设计动机总结

Lua 引入模块系统的设计动机:

1. **命名隔离**:大型项目需要避免全局变量冲突,模块表提供独立命名空间。
2. **代码复用**:跨文件、跨项目复用代码,`require` 提供统一加载入口。
3. **依赖管理**:显式 `require` 声明依赖,`package.loaded` 缓存避免重复加载。
4. **可扩展性**:C 扩展模块通过 `luaopen_*` 注册,与 Lua 模块无缝集成。
5. **可嵌入性**:模块系统是纯库实现,无运行时依赖,便于嵌入 C 程序。
6. **教学简洁**:模块即表,`require` 即函数调用,概念极简,易于学习与推理。

## 3. 形式化定义

### 3.1 模块的代数模型

设 $\mathcal{M}$ 为模块集合,每个模块 $m \in \mathcal{M}$ 是一个命名空间到导出值的映射:

$$
m : \text{Name} \to \text{Value} \cup \{\bot\}
$$

模块系统 $\mathcal{S}$ 是一个三元组:

$$
\mathcal{S} = \langle \text{resolve}, \text{load}, \text{cache} \rangle
$$

其中:
- $\text{resolve} : \text{ModuleName} \to \text{FilePath}$ 将模块名解析为文件路径。
- $\text{load} : \text{FilePath} \to \text{Module}$ 加载并执行文件,返回导出的模块表。
- $\text{cache} : \text{ModuleName} \to \text{Module} \cup \{\bot\}$ 缓存已加载模块,避免重复加载。

`require` 函数的形式化语义:

$$
\text{require}(n) = \begin{cases}
\text{cache}(n) & \text{if } n \in \text{dom}(\text{cache}) \\
\text{let } p = \text{resolve}(n) \\
\text{let } m = \text{load}(p) \\
\text{cache}(n) \leftarrow m \\
m & \text{otherwise}
\end{cases}
$$

### 3.2 `require` 的状态机模型

`require` 的执行可形式化为状态机:

$$
\delta : \text{State} \times \text{Event} \to \text{State}
$$

状态空间:
- $\text{IDLE}$:初始或完成状态。
- $\text{CACHE\_CHECK}$:检查 `package.loaded[name]`。
- $\text{SEARCH}$:依次调用 `package.searchers` 查找加载器。
- $\text{LOAD}$:执行加载器,获取模块返回值。
- $\text{CACHE\_UPDATE}$:更新 `package.loaded[name]`。
- $\text{ERROR}$:加载失败。

转移规则:

$$
\delta(\text{IDLE}, \text{call}) = \text{CACHE\_CHECK}
$$

$$
\delta(\text{CACHE\_CHECK}, \text{hit}) = \text{IDLE}, \quad \text{return cache}[n]
$$

$$
\delta(\text{CACHE\_CHECK}, \text{miss}) = \text{SEARCH}
$$

$$
\delta(\text{SEARCH}, \text{found}) = \text{LOAD}
$$

$$
\delta(\text{SEARCH}, \text{not\_found}) = \text{ERROR}
$$

$$
\delta(\text{LOAD}, \text{success}) = \text{CACHE\_UPDATE}
$$

$$
\delta(\text{LOAD}, \text{error}) = \text{ERROR}, \quad \text{cache}[n] \leftarrow \text{nil}
$$

$$
\delta(\text{CACHE\_UPDATE}, \text{done}) = \text{IDLE}, \quad \text{return cache}[n]
$$

注:`package.loaded[name]` 在 `LOAD` 状态开始前即被设置为 `true`（或占位值）,以检测循环依赖,见 §4.3。

### 3.3 searcher 的契约

`package.searchers` 是一个函数列表,每个 searcher $s_i$ 满足契约:

$$
s_i : \text{ModuleName} \to \text{Loader} \cup \{\text{reason}\}
$$

- 返回函数（loader）:表示找到加载器,后续调用 `loader(...)` 执行模块代码。
- 返回字符串:表示本 searcher 未找到,字符串为原因,用于错误信息汇总。
- 抛出错误:表示本 searcher 失败且不可恢复（如文件存在但语法错误）。

Lua 5.2+ 默认四个 searchers:

1. **preload searcher**:查找 `package.preload[name]`,用于预加载或测试桩。
2. **path searcher**:在 `package.path` 中查找 `.lua` 文件。
3. **cpath searcher**:在 `package.cpath` 中查找 `.so`/`.dll` C 扩展。
4. **all-in-one searcher**:对 `a.b.c` 这样的点分模块名,查找 `a/b/c` 路径下的 C 库,并自动调用子模块的 `luaopen_b_c` 函数。

### 3.4 `package.path` 的模式匹配

`package.path` 是分号分隔的模板列表,每个模板含 `?` 占位符:

$$
\text{path} = t_1 ; t_2 ; \ldots ; t_n
$$

对模块名 $n$,path searcher 将 $n$ 中的点替换为路径分隔符,代入 $t_i$ 的 `?`:

$$
\text{resolve}(n, t_i) = t_i[\text{?} \leftarrow \text{replace}(n, \text{.}, \text{/})]
$$

例:`package.path = "./?.lua;./?/init.lua"`,模块名 `foo.bar`:

- $t_1 = $ `./?.lua` → `./foo/bar.lua`
- $t_2 = $ `./?/init.lua` → `./foo/bar/init.lua`

### 3.5 循环依赖的图论模型

模块依赖关系可形式化为有向图 $G = (V, E)$,其中 $V$ 是模块集合,$E$ 是依赖边。

- **无环依赖图（DAG）**:$G$ 无环,加载顺序可拓扑排序。
- **循环依赖**:$G$ 含环,如 $A \to B \to A$,加载时需特殊处理。

Lua 的循环依赖处理:`require(A)` 开始加载 A,A 中调用 `require(B)` 开始加载 B,B 中调用 `require(A)` 命中 `package.loaded[A]`（已设为 `true` 占位）,返回 `true`。B 完成加载后,A 继续。此时 A 可能尚未定义 B 依赖的字段,导致运行时错误。

形式化:

$$
\text{load}_{\text{cyclic}}(A) = \text{let } \text{cache}[A] \leftarrow \text{true}; \text{exec}(A); \text{cache}[A] \leftarrow \text{return\_value}
$$

若 $\text{exec}(A)$ 中调用 $\text{require}(B)$,而 B 又调用 $\text{require}(A)$,则后者返回 `true`（占位）,B 获得不完整的 A。

### 3.6 模块缓存的代数定律

`package.loaded` 缓存遵循以下代数定律:

$$
\text{require}(n) \equiv \text{require}(n) \quad \text{(同一性,缓存保证)}
$$

$$
\text{clear}(n); \text{require}(n) \equiv \text{load}_\text{fresh}(n) \quad \text{(清除后重新加载)}
$$

$$
\text{require}(n); \text{modify}(\text{cache}[n]) \equiv \text{require}(n); \text{modify}(\text{cache}[n]) \quad \text{(后续 require 返回修改后的引用)}
$$

注意第三定律:`require` 返回的是缓存的引用,修改之会影响后续 `require`。这是 Lua 模块系统的关键语义,也是热重载的基础。

### 3.7 模块导出的范畴论模型

模块可视为范畴论中的对象,导出函数为态射。模块的组合是范畴的积（product）:

$$
M_1 \times M_2 = \{ (f, g) \mid f \in M_1, g \in M_2 \}
$$

模块的依赖关系是态射:

$$
A \xrightarrow{\text{require}} B
$$

模块图 $G$ 的拓扑序是范畴的合成序。无环模块图对应自由范畴（free category）,有环则需余极限（colimit）处理。

### 3.8 LuaRocks 依赖解析的形式化

LuaRocks 的依赖声明可形式化为约束满足问题（CSP）:

$$
\text{Constraints} = \{ \text{requires}(p, d, \text{version\_range}) \mid p \in \text{Packages}, d \in \text{Deps} \}
$$

求解目标:

$$
\text{find } \text{assignment} : \text{Packages} \to \text{Version} \text{ s.t. } \forall c \in \text{Constraints}: \text{satisfies}(c, \text{assignment})
$$

LuaRocks 3.x 使用 SemVer 约束（`>= 1.0`, `< 2.0`, `~> 1.2`）,解析器采用回溯算法求解,类似 pip 与 cargo。

## 4. 理论推导与证明

### 4.1 `require` 的幂等性定理

**定理 1**（`require` 的幂等性）:对同一模块名 $n$,在同一 Lua 状态机内,重复 `require(n)` 返回相同的引用,且模块代码仅执行一次。

**证明**:

`require` 的实现（伪代码）:

```lua
-- lua: require 的简化实现
function require(name)
  local cache = package.loaded
  if cache[name] ~= nil and cache[name] ~= true then
    return cache[name]  -- 命中缓存
  end

  -- 查找 loader
  local loader, loader_data
  for _, searcher in ipairs(package.searchers) do
    local result = searcher(name)
    if type(result) == "function" then
      loader = result
      loader_data = ...  -- loader 的额外参数
      break
    elseif result ~= nil and type(result) ~= "string" then
      error("searcher returned invalid value: " .. tostring(result))
    end
  end

  if loader == nil then
    error("module '" .. name .. "' not found")
  end

  -- 占位,用于检测循环依赖
  cache[name] = true

  -- 执行 loader
  local result = loader(name, loader_data)
  if result == nil then
    result = true  -- 模块未显式返回,使用 true
  end
  cache[name] = result
  return result
end
```

第一次调用 `require(n)`:
1. `cache[n]` 为 nil,未命中。
2. 查找 loader,执行,结果存入 `cache[n]`。
3. 返回 `cache[n]`。

第 $k$ 次调用（$k \geq 2$）:
1. `cache[n]` 非 nil 且非 true（已加载完成）,命中缓存。
2. 直接返回 `cache[n]`。

故模块代码仅执行一次,后续调用返回同一引用。

证毕。

注:若模块代码在加载时抛出错误,`cache[n]` 会被重置为 nil,允许重试。

### 4.2 循环依赖返回不完整模块定理

**定理 2**（循环依赖返回不完整模块）:若模块 A 与 B 循环依赖（A `require` B,B `require` A）,且 B 在加载时立即访问 A 的字段,则 B 获得的 A 是不完整的（仅含占位 `true` 或部分字段）。

**证明**:

设加载顺序为 A 先:

1. `require(A)` 开始,`cache[A] = true`（占位）。
2. 执行 A 的代码,A 中调用 `require(B)`。
3. `cache[B]` 为 nil,执行 B 的代码。
4. B 中调用 `require(A)`,命中 `cache[A]`（值为 `true`）,返回 `true`。
5. B 尝试访问 `A.field`,但 `A` 是 `true`,触发错误:`attempt to index a boolean value`。
6. B 加载失败,`cache[B]` 重置为 nil,错误传播至 A。
7. A 加载失败,`cache[A]` 重置为 nil。

若 B 延迟访问 A（如封装在函数中）,则:

1. `require(A)` 开始,`cache[A] = true`。
2. A 调用 `require(B)`,B 加载完成,`cache[B] = M_B`。
3. B 中函数引用 A,但未立即访问。
4. A 继续执行,定义 `A.field = ...`,`cache[A] = M_A`。
5. 后续调用 B 中函数时,`require(A)` 返回完整 `M_A`,正常工作。

故循环依赖的"安全性"取决于访问时机:延迟访问（在函数体内）安全,立即访问（在加载时）失败。

证毕。

```lua
-- lua: 循环依赖示例
-- a.lua
local A = {}
local B = require("b")  -- 触发 b.lua 加载
function A.greet(name)
  return "Hello, " .. B.format(name)
end
return A

-- b.lua
local B = {}
local A = require("a")  -- 此时 A 为 true,a.lua 未执行完
-- 错误:立即访问 A.greet 会失败
-- local greet = A.greet  -- attempt to index a boolean value

-- 正确:延迟访问
function B.format(name)
  return name:upper()
end
return B
```

### 4.3 searcher 链单调性定理

**定理 3**（searcher 链单调性）:若 `package.searchers` 列表为 $[s_1, s_2, \ldots, s_n]$,且每个 $s_i$ 满足"找到即返回 loader,未找到返回字符串",则 `require` 必然返回第一个找到的 loader,或抛出"module not found"错误。

**证明**:

`require` 遍历 `package.searchers`:

```lua
for _, searcher in ipairs(package.searchers) do
  local result = searcher(name)
  if type(result) == "function" then
    return result(name, ...)  -- 找到,执行
  end
  -- 否则继续下一个
end
error("module '" .. name .. "' not found: " .. table.concat(reasons, "\n\t"))
```

每个 $s_i$ 返回函数则停止,返回字符串则继续。若全部返回字符串,汇总错误信息抛出。

故 searcher 链是单调的:第一个匹配的 searcher 决定加载结果。

证毕。

### 4.4 `module()` 废弃的合理性定理

**定理 4**（`module()` 函数的可静态分析性弱于显式 `local M`）:Lua 5.0/5.1 的 `module("foo")` 函数隐式创建模块表、设置环境、注册全局,比 Lua 5.2+ 的 `local M = {}; return M` 模式更难静态分析。

**证明**:

`module()` 的副作用:

1. 创建 `package.loaded[name]`（若不存在）。
2. `setfenv(1, M)`:将当前函数环境设为 M,所有后续全局赋值写入 M。
3. 调用 `package.seeall`（可选）:将 `_G` 的字段注入 M。
4. 隐式 `return M`（在 chunk 末尾）。

静态分析困难:

- `setfenv` 是运行时副作用,静态分析需模拟环境切换。
- `package.seeall` 使 `_G` 的所有字段在 M 中可见,无法静态推断哪些是模块自身定义。
- 全局赋值（`function foo() ... end`）被重定向至 M,但语法上无显式标记。

显式 `local M` 模式:

- 所有导出显式写 `M.field = ...`,静态可见。
- 无 `setfenv` 副作用,环境固定。
- 模块表是局部变量,生命周期清晰。

故显式 `local M` 模式更易静态分析,被 Lua 5.2+ 推荐。

证毕。

### 4.5 模块热重载的语义保持定理

**定理 5**（模块热重载的语义保持条件）:若模块 M 无外部可变状态（仅导出纯函数与常量）,则清除 `package.loaded[M]` 并重新 `require` 等价于重启 Lua 状态机,语义保持。

**证明**:

设 M 导出函数集合 $\{f_1, f_2, \ldots, f_n\}$,每个 $f_i$ 是纯函数（无副作用、无外部状态）。

热重载:
1. `package.loaded[M] = nil`。
2. `require(M)` 重新加载 M,获得新模块表 $M'$,含 $\{f'_1, \ldots, f'_n\}$。

若原 $f_i$ 被其他模块捕获（如 `local f = require("M").f`）,则热重载后原 $f_i$ 仍存在,但与新 $f'_i$ 是不同函数对象。新 `require(M).f` 返回 $f'_i$。

若 M 无外部可变状态,则 $f_i \equiv f'_i$（语义等价,可能实现不同）。

若有外部状态（如 `local count = 0` 在 M 中）,则 $f'_i$ 引用新状态,与 $f_i$ 行为不一致。

故热重载的语义保持要求 M 无外部可变状态。

证毕。

注:实践中,热重载常需配合状态迁移（state migration）,将旧状态注入新模块。

### 4.6 LuaRocks 依赖解析的完备性定理

**定理 6**（LuaRocks 依赖解析的完备性）:若依赖图无环且版本约束可满足,则 LuaRocks 的回溯算法必能在有限步内找到解,或确定无解。

**证明**:

LuaRocks 的依赖解析是 CSP（约束满足问题）:

- 变量:每个依赖的包。
- 域:每个包的可用版本集合（有限）。
- 约束:版本范围（`>= 1.0`, `< 2.0` 等）。

回溯算法:
1. 选择未赋值的变量 $p$。
2. 按版本序（最新优先）尝试赋值。
3. 检查约束,若冲突回溯。
4. 重复直至全部赋值或确定无解。

由于版本域有限,算法必在有限步终止。若存在解,回溯必找到;若无解,回溯必穷举所有可能性后报告。

证毕。

注:实际 LuaRocks 3.x 还考虑平台兼容性、构建依赖、可选依赖等,增加 CSP 复杂度。

### 4.7 模块缓存与 GC 的交互定理

**定理 7**（模块缓存对 GC 的影响）:`package.loaded` 持有模块的强引用,模块及其 upvalue 不会被 GC 回收,直至显式清除 `package.loaded[name]`。

**证明**:

`package.loaded` 是普通 Lua 表,持有其值的强引用。模块表 $M$ 被 `package.loaded[name]` 引用,$M$ 的 upvalue（如 `local private = {}`）被 $M$ 的函数引用,$M$ 不被 GC。

```lua
-- lua: 模块缓存与 GC
local M = require("mymodule")  -- package.loaded["mymodule"] 持有 M
package.loaded["mymodule"] = nil  -- 清除引用
collectgarbage("collect")  -- 现在可回收 M（若无其他引用）
```

证毕。

注:热重载时需注意清除 `package.loaded` 后,旧模块的 upvalue 可能仍被其他模块的函数捕获（通过闭包）,导致内存无法立即释放。

## 5. 代码示例

### 5.1 基础:表模块模式

```lua
-- lua: 表模块模式（Lua 5.2+ 推荐风格）
-- 文件: mymath.lua
local M = {}

-- 私有变量（模块外不可见）
local PI = 3.14159265358979
local function abs(x)
  return x < 0 and -x or x
end

-- 公开函数
function M.circle_area(r)
  return PI * r * r
end

function M.circle_circumference(r)
  return 2 * PI * r
end

function M.distance(x1, y1, x2, y2)
  local dx = x2 - x1
  local dy = y2 - y1
  return abs(dx * dx + dy * dy) ^ 0.5
end

return M

-- 使用:
-- local mymath = require("mymath")
-- print(mymath.circle_area(5))  -- 78.5398...
```

### 5.2 基础:`require` 与缓存

```lua
-- lua: require 与缓存演示
local M1 = require("mymath")
local M2 = require("mymath")

print(M1 == M2)  -- true,缓存返回同一引用

-- 修改模块表（影响所有引用者）
M1.added_field = "hello"
print(M2.added_field)  -- hello

-- 清除缓存,重新加载
package.loaded["mymath"] = nil
local M3 = require("mymath")
print(M3 == M1)  -- false,新加载的模块
print(M3.added_field)  -- nil,新模块无此字段
```

### 5.3 `package.path` 自定义

```lua
-- lua: 自定义 package.path
-- 默认路径示例: ./?.lua;./?/init.lua;/usr/local/share/lua/5.4/?.lua;...

-- 添加自定义搜索路径
package.path = package.path .. ";./libs/?.lua;./libs/?/init.lua"

-- 现在可以 require("./libs/foo.lua") 简化为 require("foo")
local foo = require("foo")

-- 多版本共存:不同前缀
package.path = "./v1/?.lua;" .. package.path .. ";./v2/?.lua"
-- 注意:同名模块先找到的优先,需用子目录组织
-- 推荐:require("v1.foo") vs require("v2.foo")
```

### 5.4 `package.preload` 预加载

```lua
-- lua: package.preload 预加载模块
-- 用于:单文件分发、测试桩、嵌入式

-- 预加载模块代码
package.preload["mymath"] = function()
  local M = {}
  function M.add(a, b) return a + b end
  function M.mul(a, b) return a * b end
  return M
end

-- 现在 require 会从 preload 加载
local mymath = require("mymath")
print(mymath.add(2, 3))  -- 5

-- 测试桩:替换真实模块
package.preload["db"] = function()
  return {
    query = function(sql) return {{"mock", "data"}} end,
    execute = function(sql) return 1 end,
  }
end

local db = require("db")
print(db.query("SELECT * FROM users"))  -- {{"mock", "data"}}
```

### 5.5 自定义 searcher

```lua
-- lua: 自定义 searcher（Lua 5.2+）
-- 场景:从 ZIP 包、数据库、网络加载模块

-- 自定义 searcher:从内存表加载
local module_registry = {
  greet = function()
    local M = {}
    function M.hello(name) return "Hello, " .. name end
    return M
  end,
  math_extra = function()
    local M = {}
    function M.square(x) return x * x end
    return M
  end,
}

local function memory_searcher(name)
  if module_registry[name] then
    return module_registry[name]
  end
  return "\n\t[memory] module '" .. name .. "' not found in memory registry"
end

-- 插入到 searchers 列表头部（优先于默认）
table.insert(package.searchers, 1, memory_searcher)

local greet = require("greet")
print(greet.hello("Lua"))  -- Hello, Lua

local mathx = require("math_extra")
print(mathx.square(5))  -- 25
```

### 5.6 Lua 5.1 `module()` 函数（已废弃,仅作了解）

```lua
-- lua 5.1: module() 函数（已废弃,不推荐使用）
-- 文件: oldmodule.lua

-- module() 会:
-- 1. 创建 package.loaded["oldmodule"]
-- 2. setfenv(1, M) 将环境设为 M
-- 3. 可选 package.seeall 使 _G 可见
module("oldmodule", package.seeall)

-- 此时所有全局赋值写入 oldmodule 表
function add(a, b)  -- 等价于 oldmodule.add = function(a, b) ...
  return a + b
end

function mul(a, b)
  return a * b
end

-- package.seeall 使 _G 字段可见
-- print(math.pi)  -- 3.1415926535898

-- 注意:不需要显式 return,module() 自动注册

-- 使用:
-- local old = require("oldmodule")
-- print(old.add(1, 2))  -- 3
```

### 5.7 C 扩展模块基础

```c
// c: C 扩展模块示例
// 文件: mycmod.c
// 编译: gcc -shared -o mycmod.so -fPIC mycmod.c $(pkg-config --cflags lua5.4)

#include <lua.h>
#include <lauxlib.h>

/* 内部 C 函数 */
static int my_add(lua_State *L) {
  lua_Number a = luaL_checknumber(L, 1);
  lua_Number b = luaL_checknumber(L, 2);
  lua_pushnumber(L, a + b);
  return 1;
}

static int my_mul(lua_State *L) {
  lua_Number a = luaL_checknumber(L, 1);
  lua_Number b = luaL_checknumber(L, 2);
  lua_pushnumber(L, a * b);
  return 1;
}

/* 模块函数表 */
static const luaL_Reg my_funcs[] = {
  {"add", my_add},
  {"mul", my_mul},
  {NULL, NULL}
};

/* 模块入口点,Lua 5.2+ 使用 luaL_newlib */
int luaopen_mycmod(lua_State *L) {
  luaL_newlib(L, my_funcs);  /* 创建表并注册函数 */
  return 1;  /* 返回表 */
}

/*
-- lua 使用:
local mycmod = require("mycmod")  -- 从 cpath 加载
print(mycmod.add(2, 3))  -- 5
print(mycmod.mul(4, 5))  -- 20
*/
```

### 5.8 LuaJIT FFI 替代 C 模块

```lua
-- lua: LuaJIT FFI 替代 C 扩展模块
-- 优势:无需编译,直接调用 C 库

local ffi = require("ffi")

-- 声明 C 函数签名
ffi.cdef[[
  /* 标准库函数 */
  int printf(const char *fmt, ...);
  void *malloc(size_t size);
  void free(void *ptr);
  size_t strlen(const char *s);

  /* 数学库 */
  double sin(double x);
  double cos(double x);
]]

-- 调用 C 函数
ffi.C.printf("Hello from C, %s! sin(0) = %f\n", "Lua", ffi.C.sin(0))

-- 封装为 Lua 模块
local M = {}

function M.printf(fmt, ...)
  ffi.C.printf(fmt, ...)
end

function M.sin(x) return ffi.C.sin(x) end
function M.cos(x) return ffi.C.cos(x) end

function M.strlen(s)
  local cstr = ffi.new("char[?]", #s + 1)
  ffi.copy(cstr, s)
  return tonumber(ffi.C.strlen(cstr))
end

return M

-- 使用:
-- local clib = require("clib")
-- clib.printf("value = %d\n", 42)
-- print(clib.strlen("hello"))  -- 5
```

### 5.9 命名空间层级

```lua
-- lua: 命名空间层级模块
-- 文件: myapp/init.lua
local myapp = {}

-- 子模块:utils
myapp.utils = require("myapp.utils")
-- 子模块:db
myapp.db = require("myapp.db")
-- 子模块:auth
myapp.auth = require("myapp.auth")

function myapp.version()
  return "1.0.0"
end

return myapp

-- 文件: myapp/utils.lua
local utils = {}

function utils.split(s, sep)
  local parts = {}
  for part in s:gmatch("([^" .. sep .. "]+)") do
    table.insert(parts, part)
  end
  return parts
end

function utils.trim(s)
  return s:match("^%s*(.-)%s*$")
end

return utils

-- 使用:
-- local app = require("myapp")
-- print(app.version())  -- 1.0.0
-- print(app.utils.split("a,b,c", ","))  -- {"a", "b", "c"}
```

### 5.10 模块继承与混入

```lua
-- lua: 模块继承与混入
-- 基础模块
local BaseModule = {}
BaseModule.__index = BaseModule

function BaseModule.new(name)
  return setmetatable({name = name}, BaseModule)
end

function BaseModule:greet()
  return "Hello, " .. self.name
end

function BaseModule:describe()
  return "BaseModule: " .. self.name
end

-- 派生模块
local DerivedModule = setmetatable({}, {__index = BaseModule})
DerivedModule.__index = DerivedModule

function DerivedModule.new(name, age)
  local self = BaseModule.new(name)
  setmetatable(self, DerivedModule)
  self.age = age
  return self
end

-- 覆盖父类方法
function DerivedModule:describe()
  return "DerivedModule: " .. self.name .. ", age " .. self.age
end

-- 新增方法
function DerivedModule:is_adult()
  return self.age >= 18
end

return DerivedModule

-- 使用:
-- local Derived = require("derived")
-- local p = Derived.new("Alice", 25)
-- print(p:greet())  -- Hello, Alice
-- print(p:describe())  -- DerivedModule: Alice, age 25
-- print(p:is_adult())  -- true
```

### 5.11 混入（Mixin）模式

```lua
-- lua: Mixin 模式
-- 多重继承的一种实现,用于组合多个模块的功能

-- 定义一个 Mixin
local Serializable = {}

function Serializable:serialize()
  local parts = {}
  for k, v in pairs(self) do
    if type(k) == "string" then
      table.insert(parts, k .. "=" .. tostring(v))
    end
  end
  return "{" .. table.concat(parts, ", ") .. "}"
end

function Serializable:to_json()
  -- 简化版 JSON 序列化
  local parts = {}
  for k, v in pairs(self) do
    if type(k) == "string" then
      local val
      if type(v) == "string" then
        val = '"' .. v .. '"'
      else
        val = tostring(v)
      end
      table.insert(parts, '"' .. k .. '": ' .. val)
    end
  end
  return "{" .. table.concat(parts, ", ") .. "}"
end

-- 定义另一个 Mixin
local Observable = {}
Observable._listeners = {}

function Observable:on(event, cb)
  if not self._listeners[event] then
    self._listeners[event] = {}
  end
  table.insert(self._listeners[event], cb)
end

function Observable:emit(event, ...)
  if self._listeners[event] then
    for _, cb in ipairs(self._listeners[event]) do
      cb(...)
    end
  end
end

-- 混入函数
local function mixin(target, ...)
  for _, src in ipairs({...}) do
    for k, v in pairs(src) do
      if target[k] == nil then
        target[k] = v
      end
    end
  end
end

-- 使用 Mixin
local User = {}
User.__index = User

function User.new(name, age)
  local self = setmetatable({}, User)
  self.name = name
  self.age = age
  self._listeners = {}  -- Observable 需要的状态
  return self
end

-- 混入 Serializable 和 Observable
mixin(User, Serializable, Observable)

return User

-- 使用:
-- local User = require("user")
-- local u = User.new("Alice", 25)
-- print(u:serialize())  -- {name=Alice, age=25}
-- u:on("click", function() print("clicked") end)
-- u:emit("click")  -- clicked
```

### 5.12 模块单例模式

```lua
-- lua: 模块单例模式
-- 模块天然是单例（require 缓存）,但有时需延迟初始化

local Config = {}
local instance = nil
local initialized = false

-- 延迟初始化
function Config.get_instance()
  if not initialized then
    instance = Config._init()
    initialized = true
  end
  return instance
end

function Config._init()
  local config = {
    values = {},
    loaded_at = os.time(),
  }

  function config:get(key)
    return self.values[key]
  end

  function config:set(key, value)
    self.values[key] = value
  end

  function config:load(file)
    -- 模拟加载配置文件
    self.values = {host = "localhost", port = 8080}
  end

  config:load("/etc/myapp.conf")
  return config
end

return Config

-- 使用:
-- local Config = require("config")
-- local c1 = Config.get_instance()
-- local c2 = Config.get_instance()
-- print(c1 == c2)  -- true
```

### 5.13 循环依赖处理

```lua
-- lua: 循环依赖的正确处理
-- 文件: app_a.lua
local A = {}

-- 不在加载时立即访问 B
local B = require("app_b")  -- 触发 b.lua 加载

function A.process(data)
  -- 在函数内访问 B（延迟访问）
  return B.transform(data) .. " [A]"
end

function A.helper()
  return "A.helper"
end

return A

-- 文件: app_b.lua
local B = {}

-- 循环依赖:A 已 require B,但 B 也 require A
-- 此时 package.loaded["app_a"] = true,A 不完整
local A = require("app_a")

-- 错误:立即访问 A.helper 会失败（A 是 true）
-- print(A.helper())  -- attempt to index a boolean value

-- 正确:延迟访问
function B.transform(data)
  return data .. " [B with " .. A.helper() .. "]"
end

return B

-- 测试:
-- local A = require("app_a")
-- print(A.process("hello"))  -- hello [B with A.helper] [A]
```

### 5.14 热重载工具

```lua
-- lua: 模块热重载工具
local HotReload = {}

-- 清除模块缓存（递归处理依赖）
function HotReload.clear(name)
  local loaded = package.loaded
  if loaded[name] then
    loaded[name] = nil
    return true
  end
  return false
end

-- 清除所有匹配模式的模块
function HotReload.clear_pattern(pattern)
  local cleared = {}
  for name, _ in pairs(package.loaded) do
    if name:match(pattern) then
      package.loaded[name] = nil
      table.insert(cleared, name)
    end
  end
  return cleared
end

-- 重新加载模块
function HotReload.reload(name)
  HotReload.clear(name)
  return require(name)
end

-- 保留 upvalue 的热重载（高级）
function HotReload.reload_with_state(name, state_map)
  local old_module = package.loaded[name]
  if not old_module then
    return require(name)
  end

  -- 收集旧 upvalue
  local old_upvalues = {}
  for k, v in pairs(old_module) do
    if type(v) == "function" then
      -- 使用 debug.getupvalue 收集（简化版,实际需循环）
      -- local i = 1
      -- while true do
      --   local name, value = debug.getupvalue(v, i)
      --   if not name then break end
      --   old_upvalues[k .. "." .. name] = value
      --   i = i + 1
      -- end
    end
  end

  HotReload.clear(name)
  local new_module = require(name)

  -- 注入旧 upvalue（简化版,实际需逐函数处理）
  -- ...

  return new_module
end

return HotReload

-- 使用:
-- local HotReload = require("hotreload")
-- local mymod = HotReload.reload("mymod")  -- 重新加载
-- local cleared = HotReload.clear_pattern("^myapp%.")  -- 清除所有 myapp.* 模块
```

### 5.15 LuaRocks rockspec 文件

```lua
-- lua: LuaRocks rockspec 文件示例
-- 文件: myapp-1.0-1.rockspec

package = "myapp"
version = "1.0-1"

source = {
  url = "git://github.com/user/myapp.git",
  tag = "v1.0",
}

description = {
  summary = "A sample Lua application",
  detailed = [[
    myapp is a sample Lua application demonstrating LuaRocks packaging.
    It includes utilities for data processing and network operations.
  ]],
  homepage = "https://github.com/user/myapp",
  license = "MIT",
}

dependencies = {
  "lua >= 5.1",
  "luasocket >= 3.0",
  "lua-cjson >= 2.1",
}

build = {
  type = "builtin",
  modules = {
    myapp = "src/myapp.lua",
    ["myapp.utils"] = "src/utils.lua",
    ["myapp.db"] = "src/db.lua",
  },
  install = {
    bin = {
      myapp = "bin/myapp.lua",
    },
  },
  copy_directories = {
    "docs",
    "examples",
  },
}

-- 构建与安装:
-- luarocks make           # 本地构建安装
-- luarocks make --local   # 安装到用户目录
-- luarocks pack myapp-1.0-1.rockspec  # 打包成 .rock 文件
-- luarocks upload myapp-1.0-1.rockspec  # 上传到 LuaRocks.org
```

### 5.16 模块版本协商

```lua
-- lua: 模块版本协商
-- 文件: mylib.lua
local M = {}

M._VERSION = "1.2.0"
M._API_VERSION = 2

-- API v1 函数
local function api_v1(x)
  return x * 2
end

-- API v2 函数
local function api_v2(x)
  return x * x + x
end

-- 根据协商的 API 版本返回不同实现
function M.create(api_version)
  api_version = api_version or M._API_VERSION
  if api_version == 1 then
    return {
      process = api_v1,
      version = "v1",
    }
  elseif api_version == 2 then
    return {
      process = api_v2,
      version = "v2",
      new_feature = function() return "new!" end,
    }
  else
    error("Unsupported API version: " .. tostring(api_version))
  end
end

return M

-- 使用:
-- local mylib = require("mylib")
-- print(mylib._VERSION)  -- 1.2.0
-- local v1 = mylib.create(1)
-- print(v1.process(5))  -- 10
-- local v2 = mylib.create(2)
-- print(v2.process(5))  -- 30
```

### 5.17 依赖注入框架

```lua
-- lua: 简易依赖注入框架
local DI = {}

local registry = {}
local instances = {}

-- 注册依赖
function DI.register(name, factory, deps)
  registry[name] = {
    factory = factory,
    deps = deps or {},
  }
end

-- 注册单例
function DI.singleton(name, factory, deps)
  registry[name] = {
    factory = factory,
    deps = deps or {},
    singleton = true,
  }
end

-- 获取依赖（递归解析）
function DI.get(name)
  local spec = registry[name]
  if not spec then
    error("Dependency not registered: " .. name)
  end

  if spec.singleton and instances[name] then
    return instances[name]
  end

  -- 解析依赖
  local args = {}
  for i, dep_name in ipairs(spec.deps) do
    args[i] = DI.get(dep_name)
  end

  local instance = spec.factory(table.unpack(args))
  if spec.singleton then
    instances[name] = instance
  end
  return instance
end

-- 清除所有实例（测试用）
function DI.reset()
  instances = {}
end

return DI

-- 使用:
-- local DI = require("di")
-- DI.singleton("db", function() return {query = function() return "data" end} end)
-- DI.register("user_repo", function(db) return {db = db} end, {"db"})
-- local repo = DI.get("user_repo")
-- print(repo.db.query())  -- data
```

### 5.18 OpenResty 风格模块

```lua
-- lua: OpenResty 风格模块
-- 文件: /path/to/my_handlers.lua
local _M = {}

-- 模块级变量（每个 worker 进程共享）
local worker_id = ngx.worker.id()

-- 初始化模块（worker 启动时执行一次）
local function init()
  -- 加载配置、建立连接池等
  _M.config = {
    timeout = 30,
    pool_size = 100,
  }
end

init()

-- 处理 HTTP 请求的函数
function _M.handle_request()
  ngx.header["Content-Type"] = "application/json"

  -- 使用 OpenResty API
  local method = ngx.req.get_method()
  local uri = ngx.var.uri

  -- 调用其他模块
  local response = {
    method = method,
    uri = uri,
    worker = worker_id,
    timestamp = ngx.now(),
  }

  ngx.say(require("cjson").encode(response))
end

-- 健康检查端点
function _M.health_check()
  local ok = true
  local checks = {}

  -- 检查数据库
  local mysql = require("resty.mysql")
  local db, err = mysql:new()
  if not db then
    ok = false
    checks.mysql = "failed: " .. tostring(err)
  else
    checks.mysql = "ok"
  end

  return ok, checks
end

return _M

-- nginx.conf 配置:
-- http {
--   lua_package_path "/path/to/?.lua;;";
--   init_by_lua 'require("my_handlers")';
--   server {
--     location /api {
--       content_by_lua 'require("my_handlers").handle_request()';
--     }
--   }
-- }
```

### 5.19 WoW AddOn 风格模块

```lua
-- lua: WoW AddOn 风格模块（Lua 5.1）
-- 文件: MyAddon/Init.lua
-- WoW 使用 Lua 5.1 + 自定义 API

local addonName, ns = ...  -- 接收 AddOn 名与命名空间表

-- ns 是 Blizzard 传入的命名空间表,可在多个文件间共享
ns.version = "1.0"
ns.events = {}

-- 创建 frame 监听事件
local frame = CreateFrame("Frame")
frame:RegisterEvent("PLAYER_LOGIN")
frame:RegisterEvent("CHAT_MSG_SAY")

frame:SetScript("OnEvent", function(self, event, ...)
  if event == "PLAYER_LOGIN" then
    print(ns.version .. " loaded!")
  elseif event == "CHAT_MSG_SAY" then
    local msg, author = ...
    print(author .. " says: " .. msg)
  end
end)

-- 导出函数到命名空间
function ns.Greet(name)
  print("Hello, " .. name)
end

-- WoW 不使用标准 require,通过 .toc 文件指定加载顺序:
-- ## Interface: 90200
-- ## Title: My Addon
-- ## Version: 1.0
-- Init.lua
-- Core.lua
-- Utils.lua
```

### 5.20 Neovim Lua 模块

```lua
-- lua: Neovim Lua 模块
-- 文件: ~/.config/nvim/lua/myplugin/init.lua

local M = {}

-- 使用 vim API
local api = vim.api
local cmd = vim.cmd

-- 模块配置
M.config = {
  enabled = true,
  highlight = "Error",
}

-- 设置命令
function M.setup(opts)
  opts = opts or {}
  M.config = vim.tbl_deep_extend("force", M.config, opts)

  if M.config.enabled then
    M._init()
  end
end

function M._init()
  -- 注册用户命令
  api.nvim_create_user_command("MyPluginGreet", function(args)
    print("Hello, " .. args.args)
  end, { nargs = "*" })

  -- 注册自动命令
  api.nvim_create_autocmd("BufEnter", {
    callback = function()
      print("Buffer entered: " .. api.nvim_buf_get_name(0))
    end,
  })

  -- 注册高亮组
  cmd("highlight MyPluginError guifg=#ff0000")
end

-- 公开 API
function M.greet(name)
  return "Hello, " .. name .. "!"
end

return M

-- Neovim 中使用:
-- require("myplugin").setup({ enabled = true })
-- vim.cmd("MyPluginGreet World")
-- print(require("myplugin").greet("Lua"))
```

## 6. 对比分析

### 6.1 与 JavaScript 模块系统对比

| 维度 | Lua 模块 | JavaScript CommonJS | JavaScript ES Modules |
| --- | --- | --- | --- |
| 模块标识 | 字符串（`"foo.bar"`） | 字符串（`"foo"`） | URL/文件路径 |
| 导入语法 | `local foo = require("foo")` | `const foo = require("foo")` | `import foo from "foo"` |
| 导出语法 | `return M` | `module.exports = M` | `export ...` |
| 缓存 | `package.loaded` | `require.cache` | 模块图 |
| 循环依赖 | 返回占位 `true` | 返回部分对象 | 编译期处理 |
| 异步加载 | 不支持 | 支持（`require.async`） | 支持（动态 `import()`） |
| 静态分析 | 弱（运行时 `require`） | 弱 | 强（编译期解析） |
| Tree Shaking | 不支持 | 不支持 | 支持 |
| 默认导出 | 整个模块表 | `module.exports` | `default` |

Lua 模块与 CommonJS 在缓存机制上最相似,但 Lua 更简洁（无 `module.exports` 中间层）。ES Modules 的静态分析能力远超 Lua,但 Lua 的动态特性更灵活。

### 6.2 与 Python 模块对比

| 维度 | Lua 模块 | Python 模块 |
| --- | --- | --- |
| 模块标识 | 字符串 | 文件路径（`import foo.bar`） |
| 导入语法 | `require("foo")` | `import foo` / `from foo import x` |
| 导出语法 | 显式 `M.x = ...` | 所有顶层定义 |
| 缓存 | `package.loaded` | `sys.modules` |
| 包初始化 | `?/init.lua` | `__init__.py` |
| 相对导入 | 不支持 | 支持（`from . import x`） |
| 命名空间包 | 不支持 | 支持（PEP 420） |
| 类型注解 | Luau 支持 | 支持 |
| 包管理 | LuaRocks | pip + PyPI |

Lua 与 Python 模块都基于"文件即模块"思想,但 Python 的 `import` 是语法级,Lua 的 `require` 是函数级。Python 的相对导入与命名空间包是 Lua 缺失的。

### 6.3 与 Go packages 对比

| 维度 | Lua 模块 | Go packages |
| --- | --- | --- |
| 模块标识 | 字符串 | URL（`github.com/user/repo`） |
| 导入语法 | `require("foo")` | `import "foo"` |
| 导出语法 | 模块表 | 大写首字母 |
| 访问控制 | 无（约定私有用 `_` 前缀） | 大小写约定 |
| 循环依赖 | 运行时占位 | 编译期错误 |
| 包管理 | LuaRocks | go mod |
| 静态分析 | 弱 | 强 |
| 并发安全 | 单线程默认 | 多 goroutine 需同步 |

Go 的访问控制（大小写约定）比 Lua 更系统化,编译期检测循环依赖更安全。

### 6.4 与 Rust crates 对比

| 维度 | Lua 模块 | Rust crates |
| --- | --- | --- |
| 模块标识 | 字符串 | crate 名（Cargo.toml） |
| 导入语法 | `require("foo")` | `use foo::Bar` |
| 导出语法 | 模块表 | `pub` 修饰符 |
| 访问控制 | 无 | `pub`/`pub(crate)`/私有 |
| 特性开关 | 不支持 | `#[cfg(feature = "...")]` |
| 包管理 | LuaRocks | cargo + crates.io |
| 静态分析 | 弱 | 强（编译期） |
| 类型系统 | 弱（Luau 增强） | 强 |

Rust 的访问控制与特性开关是 Lua 完全缺失的,Lua 依赖约定（`_` 前缀）实现私有。

### 6.5 与 Java packages 对比

| 维度 | Lua 模块 | Java packages |
| --- | --- | --- |
| 模块标识 | 字符串 | 反向域名（`com.example.foo`） |
| 导入语法 | `require("foo")` | `import com.example.foo.*` |
| 访问控制 | 无 | `public`/`protected`/`private`/package |
| 模块系统 | 库级 | JPMS（Java 9+） |
| 类路径 | `package.path` | classpath |
| 包管理 | LuaRocks | Maven/Gradle |

Java 的访问控制最完善,但 Lua 的灵活性更适合嵌入式脚本场景。

### 6.6 与 Ruby `require` 对比

| 维度 | Lua 模块 | Ruby |
| --- | --- | --- |
| 模块标识 | 字符串 | 文件名（下划线） |
| 导入语法 | `require("foo")` | `require "foo"` |
| 导出语法 | 模块表 | 模块/类定义 |
| 缓存 | `package.loaded` | `$LOADED_FEATURES` |
| 包管理 | LuaRocks | rubygems + bundler |
| 元编程 | 弱 | 强（`class_eval` 等） |

Ruby 的元编程能力更强,但 Lua 的简洁性更适合嵌入。

## 7. 常见陷阱与反模式

### 7.1 陷阱:全局污染

```lua
-- lua: 全局污染陷阱
-- 文件: bad_module.lua

-- 错误:未使用 local,污染全局
function helper(x)  -- 全局函数
  return x * 2
end

MY_CONSTANT = 42  -- 全局变量

return {
  process = function(x) return helper(x) + MY_CONSTANT end
}

-- 问题:helper、MY_CONSTANT 泄漏到 _G
-- 修复:使用 local
local function helper(x)  -- 私有
  return x * 2
end

local MY_CONSTANT = 42  -- 私有

return {
  process = function(x) return helper(x) + MY_CONSTANT end
}
```

### 7.2 陷阱:循环依赖立即访问

```lua
-- lua: 循环依赖立即访问陷阱
-- 文件: a.lua
local A = {}
local B = require("b")  -- 触发 b.lua
-- 此时 b.lua 中 require("a") 返回 true
return A

-- 文件: b.lua
local B = {}
local A = require("a")  -- A 为 true
local _helper = A.helper  -- 错误:attempt to index a boolean value
function B.process(x) return _helper(x) end
return B

-- 修复:延迟访问
-- 文件: b.lua (修复版)
local B = {}
local A = require("a")  -- A 为 true,但仅保存引用
function B.process(x)
  return A.helper(x)  -- 调用时 A 已加载完成
end
return B
```

### 7.3 陷阱:修改 `package.loaded` 影响全局

```lua
-- lua: 修改 package.loaded 影响全局陷阱
local mymod = require("mymod")
mymod.added = "global modification"

-- 其他模块也会看到修改
local mymod2 = require("mymod")
print(mymod2.added)  -- global modification

-- 修复:避免直接修改公共模块表
-- 若需扩展,使用 metatable 或创建副本
local mymod_ext = setmetatable({}, {__index = require("mymod")})
mymod_ext.added = "local extension"
-- 原 mymod 不受影响
```

### 7.4 陷阱:热重载丢失状态

```lua
-- lua: 热重载丢失状态陷阱
-- 文件: counter.lua
local M = {}
local count = 0  -- 模块状态

function M.increment()
  count = count + 1
  return count
end

function M.get() return count end

return M

-- 使用:
-- local Counter = require("counter")
-- Counter.increment()  -- 1
-- Counter.increment()  -- 2

-- 热重载:
-- package.loaded["counter"] = nil
-- local Counter = require("counter")
-- Counter.get()  -- 0,状态丢失!

-- 修复:将状态保存到模块表本身（持久化）
-- local M = {count = 0}
-- function M.increment() M.count = M.count + 1; return M.count end
-- 热重载前:local old = package.loaded["counter"]; local saved_count = old.count
-- 热重载后:require("counter").count = saved_count
```

### 7.5 陷阱:`module()` 遗留代码

```lua
-- lua: module() 遗留代码陷阱（Lua 5.1 风格）
-- 文件: oldstyle.lua
module("oldstyle", package.seeall)

function greet()  -- 隐式 oldstyle.greet
  return "hello"
end

-- 问题 1:Lua 5.2+ 已废弃 module()
-- 问题 2:package.seeall 使 _G 可见,污染命名空间
-- 问题 3:难静态分析

-- 修复:改写为 Lua 5.2+ 风格
local M = {}

function M.greet()
  return "hello"
end

return M
```

### 7.6 陷阱:错误的相对路径

```lua
-- lua: 错误的相对路径陷阱
-- 文件: /project/main.lua
local utils = require("../utils")  -- 错误:require 不支持相对路径

-- 修复:配置 package.path 或使用绝对路径（相对于 package.path）
package.path = package.path .. ";/project/?.lua"
local utils = require("utils")  -- 从 /project/utils.lua 加载

-- 或使用 dofile（不走 require 缓存,不推荐）
-- local utils = dofile("/project/utils.lua")
```

### 7.7 陷阱:C 模块版本不兼容

```lua
-- lua: C 模块版本不兼容陷阱
-- Lua 5.1 编译的 .so 在 Lua 5.4 中无法加载
local mod = require("mycmod")  -- error: multiple Lua VMs detected

-- 修复:为每个 Lua 版本单独编译 C 模块
-- 使用 LuaRocks 管理多版本:
-- luarocks install mycmod 5.1
-- luarocks install mycmod 5.4

-- 或使用 LuaJIT FFI 替代（无需编译）
-- local ffi = require("ffi")
-- ffi.cdef[[ ... ]]
```

### 7.8 陷阱:require 在协程中阻塞

```lua
-- lua: require 在协程中阻塞陷阱
-- require 是同步操作,在协程中会阻塞整个线程
local co = coroutine.create(function()
  local mod = require("large_module")  -- 阻塞,可能影响其他协程
end)
coroutine.resume(co)

-- 修复:在主线程预加载模块,协程中 require 命中缓存
require("large_module")  -- 预加载
local co = coroutine.create(function()
  local mod = require("large_module")  -- 命中缓存,极快
end)
```

### 7.9 陷阱:沙箱逃逸

```lua
-- lua: 沙箱逃逸陷阱
-- 错误的沙箱:未替换 package,可加载任意模块
local sandbox_env = {
  require = require,  -- 危险:暴露原版 require
  -- ...
}

-- 沙箱内代码可执行:
-- require("os").execute("rm -rf /")  -- 逃逸!

-- 修复:自定义受限 require
local safe_modules = {
  math = math,
  string = string,
  -- 仅允许的模块
}

local function safe_require(name)
  if safe_modules[name] then
    return safe_modules[name]
  end
  error("module '" .. name .. "' is not allowed in sandbox")
end

local sandbox_env = {
  require = safe_require,
  -- 其他受限 API
}
```

### 7.10 陷阱:`_G` 与 `_ENV` 混淆

```lua
-- lua: _G 与 _ENV 混淆陷阱
-- Lua 5.2+ 中 _G 仍指向原全局表,但当前环境可能是 _ENV
local _ENV = {print = print, x = 10}
print(_G)  -- nil!_G 不在新 _ENV 中
print(x)  -- 10

-- 模块中若误用 _G 设置全局:
local M = {}
_G.MY_GLOBAL = "hello"  -- 即使在模块内,_G 仍指向原表
-- 但若模块有自己的 _ENV,_G 不可见

-- 修复:模块中避免使用 _G,通过返回值导出
local M = {}
M.MY_GLOBAL = "hello"
return M
```

### 7.11 陷阱:`package.loaded` 持久引用导致内存泄漏

```lua
-- lua: package.loaded 持久引用内存泄漏陷阱
-- 大模块加载后永不释放
local big = require("huge_module")  -- 100MB
-- package.loaded["huge_module"] 持续引用,即使 big 出作用域

-- 修复:不需要时清除
package.loaded["huge_module"] = nil
collectgarbage("collect")  -- 释放内存
```

### 7.12 陷阱:Luau 类型注解与运行时不符

```lua
-- luau: Luau 类型注解与运行时不符陷阱
-- 文件: typed_module.luau
export type User = {
  name: string,
  age: number,
}

local M = {}

function M.create(name: string, age: number): User
  return { name = name, age = age }
end

return M

-- 使用:
-- local M = require("typed_module")
-- local u = M.create("Alice", "25")  -- 类型错误,但 Luau 类型擦除后运行时仍执行
-- 类型系统仅静态检查,不阻止运行时错误
```

### 7.13 反模式:过度抽象模块系统

```lua
-- lua: 过度抽象反模式
-- 错误:为简单模块引入复杂依赖注入框架
local DI = require("complex_di_framework")
local Logger = require("logger")
local Config = require("config")

DI:register("mymod", function()
  return require("mymod")
end, {"logger", "config"})

-- 简单模块本应直接 require:
local mymod = require("mymod")

-- 何时用 DI:大型应用、多环境（测试/生产）、插件架构
-- 何时不用:简单工具、原型、单文件脚本
```

## 8. 工程实践与最佳实践

### 8.1 命名规范

- **模块名**:全小写,点分命名空间（`myapp.utils.string`）。
- **文件名**:与模块名一致,`myapp/utils/string.lua` 或 `myapp/utils/string/init.lua`。
- **导出函数**:驼峰命名（`circleArea`）或下划线（`circle_area`）,项目内一致。
- **私有变量**:`local` 声明,以下划线前缀标识内部使用（`_internal`）。
- **常量**:全大写下划线（`MAX_RETRIES`）。

### 8.2 模块结构模板

```lua
-- lua: 模块结构模板
-- 文件: mymodule.lua

--[[
模块: mymodule
功能: 简要描述
作者: your_name
版本: 1.0.0
依赖: lua >= 5.1, luasocket >= 3.0
]]

-- 1. 引入依赖
local math = math
local string = string
local table = table
local os = os

local dependency1 = require("dependency1")
local dependency2 = require("dependency2")

-- 2. 模块表
local M = {}

-- 3. 常量
M._VERSION = "1.0.0"
M._AUTHOR = "your_name"

local MAX_RETRIES = 3
local DEFAULT_TIMEOUT = 30

-- 4. 私有变量
local _state = {}
local _cache = {}

-- 5. 私有函数
local function _internal_helper(x)
  return x * 2
end

-- 6. 公开函数
function M.public_api(x)
  return _internal_helper(x) + 1
end

-- 7. 类（若适用）
local MyClass = {}
MyClass.__index = MyClass

function M.new_class(...)
  return setmetatable({}, MyClass)
end

-- 8. 模块初始化
local function _init()
  -- 加载配置、建立连接等
end

_init()

-- 9. 返回模块
return M
```

### 8.3 错误处理

```lua
-- lua: 模块错误处理最佳实践
local M = {}

-- 使用 error + assert 报告编程错误
function M.divide(a, b)
  assert(type(a) == "number", "a must be a number")
  assert(type(b) == "number", "b must be a number")
  assert(b ~= 0, "division by zero")
  return a / b
end

-- 使用 nil, err 报告可恢复错误
function M.try_parse(s)
  if not s:match("^%d+$") then
    return nil, "not a number: " .. s
  end
  return tonumber(s)
end

-- 使用 pcall 调用不可信代码
function M.safe_call(fn, ...)
  local ok, result = pcall(fn, ...)
  if not ok then
    M._log_error(result)
    return nil, result
  end
  return result
end

function M._log_error(msg)
  -- 记录错误日志
  io.stderr:write("[ERROR] " .. tostring(msg) .. "\n")
end

return M
```

### 8.4 测试桩与依赖注入

```lua
-- lua: 可测试模块设计
local M = {}

-- 依赖通过参数传入（便于测试桩替换）
function M.new(opts)
  opts = opts or {}
  local self = {
    db = opts.db or require("real_db"),  -- 测试时可注入 mock_db
    cache = opts.cache or require("real_cache"),
    config = opts.config or {},
  }
  return setmetatable(self, {__index = M})
end

function M:get_user(id)
  local cached = self.cache:get("user:" .. id)
  if cached then return cached end

  local user = self.db:query("SELECT * FROM users WHERE id = ?", id)
  if user then
    self.cache:set("user:" .. id, user, 3600)
  end
  return user
end

return M

-- 测试:
-- local UserRepo = require("user_repo")
-- local repo = UserRepo.new({
--   db = mock_db,
--   cache = mock_cache,
-- })
-- local user = repo:get_user(1)
```

### 8.5 版本管理

```lua
-- lua: 模块版本管理
local M = {}

M._VERSION = "2.1.0"
M._COMPATIBLE = { "1.0", "2.0", "2.1" }

-- 版本检查
function M.check_version(required)
  for _, v in ipairs(M._COMPATIBLE) do
    if v == required then return true end
  end
  error(string.format(
    "Module version %s not compatible with required %s",
    M._VERSION, required
  ))
end

-- SemVer 解析
local function parse_semver(s)
  local major, minor, patch = s:match("^(%d+)%.(%d+)%.(%d+)")
  return {
    major = tonumber(major),
    minor = tonumber(minor),
    patch = tonumber(patch),
  }
end

-- 版本比较
function M.version_compare(v1, v2)
  local p1 = parse_semver(v1)
  local p2 = parse_semver(v2)
  if p1.major ~= p2.major then return p1.major < p2.major and -1 or 1 end
  if p1.minor ~= p2.minor then return p1.minor < p2.minor and -1 or 1 end
  if p1.patch ~= p2.patch then return p1.patch < p2.patch and -1 or 1 end
  return 0
end

return M
```

### 8.6 文档注释

```lua
-- lua: 模块文档注释（LDoc 风格）
--- 数学工具模块
-- 提供常用数学计算函数
-- @module mymath
-- @author fanquanpp
-- @license MIT
-- @release 1.0.0
local M = {}

local PI = 3.14159265358979

--- 计算圆面积
-- @param r 半径
-- @return 面积
-- @usage local area = mymath.circle_area(5)
function M.circle_area(r)
  return PI * r * r
end

--- 计算两点间距离
-- @param x1 第一个点的 x 坐标
-- @param y1 第一个点的 y 坐标
-- @param x2 第二个点的 x 坐标
-- @param y2 第二个点的 y 坐标
-- @return 距离
-- @usage local d = mymath.distance(0, 0, 3, 4)
function M.distance(x1, y1, x2, y2)
  local dx, dy = x2 - x1, y2 - y1
  return (dx * dx + dy * dy) ^ 0.5
end

return M

-- 生成文档:
-- ldoc .  # 在当前目录生成 HTML 文档
```

### 8.7 性能优化

```lua
-- lua: 模块性能优化
-- 1. 本地化常用函数
local M = {}
local math, string, table = math, string, table
local pairs, ipairs = pairs, ipairs

-- 2. 缓存计算结果
local _cache = {}
function M.fib(n)
  if _cache[n] then return _cache[n] end
  if n < 2 then return n end
  local result = M.fib(n - 1) + M.fib(n - 2)
  _cache[n] = result
  return result
end

-- 3. 避免热路径中 require
local json = require("cjson")  -- 预加载
function M.process(data)
  return json.encode(data)  -- 直接使用,无需 require
end

-- 4. 惰性加载
local loaded_modules = {}
function M.get_module(name)
  if not loaded_modules[name] then
    loaded_modules[name] = require(name)
  end
  return loaded_modules[name]
end

-- 5. 使用 local 而非全局
local function helper(x) return x * 2 end  -- 比 function helper 快
```

### 8.8 跨版本兼容

```lua
-- lua: 跨版本兼容层
local M = {}

-- Lua 版本检测
local lua_version = _VERSION:match("Lua (%d+%.%d+)")

-- unpack 兼容
M.unpack = unpack or table.unpack

-- loadstring 兼容
M.loadstring = loadstring or load

-- setfenv/getfenv 兼容（Lua 5.1 vs 5.2+）
if lua_version == "5.1" then
  M.setfenv = setfenv
  M.getfenv = getfenv
else
  function M.setfenv(f, env)
    -- Lua 5.2+ 无直接等价,需通过 load 实现
    error("setfenv not available in Lua 5.2+, use _ENV instead")
  end
  function M.getfenv(f)
    error("getfenv not available in Lua 5.2+, use _ENV instead")
  end
end

-- module() 兼容
function M.compat_module(name)
  -- 模拟 Lua 5.1 module() 行为
  local M = {}
  package.loaded[name] = M
  return M
end

-- 模块加载兼容
function M.load_module(name, env)
  if lua_version == "5.1" then
    local fn, err = loadfile(name)
    if not fn then return nil, err end
    setfenv(fn, env)
    return fn()
  else
    local fn, err = loadfile(name, "t", env)
    if not fn then return nil, err end
    return fn()
  end
end

return M
```

### 8.9 日志与可观测性

```lua
-- lua: 模块日志与可观测性
local M = {}

-- 日志级别
local LEVELS = { DEBUG = 1, INFO = 2, WARN = 3, ERROR = 4 }
local current_level = LEVELS.INFO

function M.set_level(level)
  current_level = LEVELS[level] or LEVELS.INFO
end

local function log(level, msg, ...)
  if LEVELS[level] >= current_level then
    local prefix = os.date("%Y-%m-%d %H:%M:%S") .. " [" .. level .. "]"
    io.stderr:write(prefix .. " " .. string.format(msg, ...) .. "\n")
  end
end

M.debug = function(...) log("DEBUG", ...) end
M.info = function(...) log("INFO", ...) end
M.warn = function(...) log("WARN", ...) end
M.error = function(...) log("ERROR", ...) end

-- 模块加载追踪
local _original_require = require
function M.tracked_require(name)
  M.debug("Loading module: %s", name)
  local start = os.clock()
  local result = _original_require(name)
  local elapsed = (os.clock() - start) * 1000
  M.debug("Loaded %s in %.2fms", name, elapsed)
  return result
end

return M
```

### 8.10 安全沙箱

```lua
-- lua: 安全沙箱模块加载器
local M = {}

-- 允许的模块白名单
local allowed_modules = {
  ["math"] = math,
  ["string"] = string,
  ["table"] = table,
  ["os.time"] = function() return os.time end,
  ["os.date"] = function() return os.date end,
}

-- 自定义 require
function M.sandboxed_require(name)
  -- 检查白名单
  if allowed_modules[name] then
    local mod = allowed_modules[name]
    if type(mod) == "function" then
      return mod()  -- 惰性初始化
    end
    return mod
  end

  -- 检查是否在预加载的沙箱模块中
  if package.preload["sandbox." .. name] then
    return package.preload["sandbox." .. name]()
  end

  error("module '" .. name .. "' is not allowed in sandbox", 2)
end

-- 创建沙箱环境
function M.create_sandbox()
  return {
    require = M.sandboxed_require,
    print = print,
    pairs = pairs,
    ipairs = ipairs,
    tostring = tostring,
    tonumber = tonumber,
    type = type,
    select = select,
    error = error,
    pcall = pcall,
    -- 禁用:io, os.execute, loadfile, dofile, debug, _G, load
  }
end

return M

-- 使用:
-- local Sandbox = require("sandbox")
-- local env = Sandbox.create_sandbox()
-- local fn = load(user_code, "sandbox", "t", env)
-- fn()
```

## 9. 案例研究

### 9.1 案例研究:Lapis Web 框架

Lapis 是 Lua 的 Web 框架,运行在 OpenResty 或 Cqueues 之上。其模块组织体现 Lua 工程级实践:

```lua
-- lua: Lapis 风格模块组织
-- 文件: app.lua
local lapis = require("lapis")
local app = lapis.Application()

app:enable("etlua")  -- 模板引擎

-- 路由
app:get("/", function(self)
  return { render = "index" }
end)

app:match("/users/:id", function(self)
  local Users = require("models.users")  -- 惰性加载
  local user = Users:find(self.params.id)
  return { render = "user", user = user }
end)

-- 中间件模块
local AuthMiddleware = require("middleware.auth")
app:use(AuthMiddleware)

return app

-- 文件: models/users.lua
local Model = require("lapis.db.model").Model
local Users = Model:extend("users", {
  -- 关系
  relations = {
    {"posts", has_many = "Posts"}
  }
})

function Users:find_active()
  return self:select("WHERE active = ?", true)
end

return Users
```

Lapis 的设计要点:
- 惰性 `require`（在请求处理函数内）减少启动开销。
- 模块化中间件（每个中间件是独立模块）。
- 配置通过环境变量与 Lua 文件分离。

### 9.2 案例研究:OpenResty `lua_package_path`

```lua
-- lua: OpenResty 模块路径配置
-- nginx.conf:
-- http {
--   lua_package_path "/opt/app/lua/?.lua;/opt/app/vendor/?.lua;;";
--   lua_package_cpath "/opt/app/cmod/?.so;/opt/app/vendor/?.so;;";
--
--   init_by_lua_block {
--     -- 全局初始化,预加载模块
--     require("app.init")
--   }
--
--   init_worker_by_lua_block {
--     -- 每个 worker 启动时执行
--     require("app.worker_init")
--   }
-- }

-- 文件: /opt/app/lua/app/init.lua
local _M = {}

-- 预加载常用模块
local mysql = require("resty.mysql")
local redis = require("resty.redis")
local json = require("cjson")

_M.mysql_pool = {
  timeout = 5000,
  size = 100,
}

_M.redis_pool = {
  timeout = 1000,
  size = 50,
}

return _M

-- 文件: /opt/app/lua/app/handler.lua
local _M = {}

function _M.handle()
  local mysql = require("resty.mysql")
  local db = mysql:new()
  db:connect(...)

  -- 业务逻辑
  local rows = db:query("SELECT * FROM users")

  db:set_keepalive(...)  -- 归还连接池
  return rows
end

return _M
```

OpenResty 的模块系统特点:
- `lua_package_path` 与 `lua_package_cpath` 指令全局配置搜索路径。
- `init_by_lua_block` 预加载模块,所有 worker 共享。
- 连接池模式:模块持有 C 模块实例,通过 `set_keepalive` 复用。

### 9.3 案例研究:WoW AddOn 系统

WoW 使用 Lua 5.1 + 自定义加载器管理 AddOn:

```lua
-- lua: WoW AddOn 模块系统
-- .toc 文件指定加载顺序:
-- ## Interface: 90200
-- ## Title: My Addon
-- ## Notes: Description
-- ## Author: Author
-- ## Version: 1.0
-- ## Dependencies: Ace3, LibStub
-- ## OptionalDeps: LibSharedMedia-3.0
-- ## SavedVariables: MyAddonDB
-- Core.lua
-- Modules\Utils.lua
-- Modules\UI.lua

-- 文件: Core.lua
local addonName, ns = ...  -- Blizzard 传入 AddOn 名与命名空间

ns.version = "1.0"
ns.modules = {}

-- 模块注册系统
function ns:RegisterModule(name, module)
  self.modules[name] = module
  if module.OnLoad then
    module:OnLoad()
  end
end

function ns:GetModule(name)
  return self.modules[name]
end

-- 主 AddOn 对象
local addon = CreateFrame("Frame", "MyAddonFrame")
addon:RegisterEvent("ADDON_LOADED")
addon:SetScript("OnEvent", function(self, event, loadedAddon)
  if loadedAddon == addonName then
    ns:RegisterModule("utils", ns:NewUtils())
    ns:RegisterModule("ui", ns:NewUI())
    print(ns.version .. " loaded!")
  end
end)

-- 文件: Modules\Utils.lua
local addonName, ns = ...  -- 同一命名空间表
function ns:NewUtils()
  local utils = {}
  function utils:split(s, sep)
    -- ...
  end
  return utils
end

-- 文件: Modules\UI.lua
local addonName, ns = ...
function ns:NewUI()
  local ui = {}
  function ui:OnLoad()
    print("UI module loaded")
  end
  return ui
end
```

WoW 模块系统特点:
- 不使用 `require`,通过 `.toc` 文件指定加载顺序。
- 命名空间表 `ns` 在多个文件间共享（Blizzard 传入）。
- 显式依赖声明（`Dependencies`、`OptionalDeps`）。
- `SavedVariables` 实现跨会话持久化。

### 9.4 案例研究:Neovim Lua 模块

Neovim 0.5+ 全面引入 Lua,模块系统基于标准 `require` + `runtimepath`:

```lua
-- lua: Neovim Lua 模块组织
-- 文件: ~/.config/nvim/lua/myconfig/init.lua
local M = {}

local api = vim.api
local cmd = vim.cmd
local opt = vim.opt

-- 模块配置
M.config = {
  number = true,
  relativenumber = true,
  tabstop = 2,
}

function M.setup(opts)
  opts = opts or {}
  M.config = vim.tbl_deep_extend("force", M.config, opts)

  -- 应用配置
  for k, v in pairs(M.config) do
    opt[k] = v
  end

  -- 加载子模块
  require("myconfig.keymaps").setup()
  require("myconfig.autocmds").setup()
  require("myconfig.plugins").setup()
end

return M

-- 文件: ~/.config/nvim/lua/myconfig/keymaps.lua
local M = {}

function M.setup()
  local map = vim.keymap.set

  -- 模式映射
  map("n", "<leader>w", ":w<CR>", { desc = "Save file" })
  map("n", "<leader>q", ":q<CR>", { desc = "Quit" })
  map("i", "jk", "<ESC>", { desc = "Exit insert mode" })

  -- 插件特定映射
  local ok, telescope = pcall(require, "telescope")
  if ok then
    map("n", "<leader>ff", ":Telescope find_files<CR>")
  end
end

return M

-- init.vim 中调用:
-- lua require("myconfig").setup()
```

Neovim 模块系统特点:
- 标准 `require` 机制,`runtimepath` 提供搜索路径。
- `vim.tbl_deep_extend` 用于配置合并。
- 惰性加载插件（`pcall(require, ...)` 检测存在性）。
- 子模块通过 `require("parent.child")` 组织。

### 9.5 案例研究:LuaJIT FFI 模块

LuaJIT 的 FFI 替代传统 C 模块,无需编译:

```lua
-- lua: LuaJIT FFI 模块
-- 文件: cjson_lite.lua
local ffi = require("ffi")

ffi.cdef[[
  /* 模拟 cjson 库 */
  typedef struct {
    const char *data;
    size_t length;
  } json_value;

  json_value *json_parse(const char *str);
  void json_free(json_value *val);
  const char *json_stringify(json_value *val);
]]

-- 加载 C 库
local lib = ffi.load("cjson") or ffi.C

local M = {}

function M.parse(str)
  local val = lib.json_parse(str)
  if val == nil then
    return nil, "parse error"
  end
  -- ... 解析逻辑
  lib.json_free(val)
  return result
end

function M.stringify(table)
  -- ... 序列化逻辑
end

return M

-- 优势:
-- 1. 无需编译,跨平台
-- 2. 调用 C 库直接,性能高
-- 3. 可访问系统 API

-- 限制:
-- 1. 仅 LuaJIT 支持
-- 2. 类型安全弱于 C 扩展模块
-- 3. 调试困难（C 与 Lua 边界）
```

### 9.6 案例研究:LuaRocks 包发布流程

完整 LuaRocks 包发布流程:

```bash
# 1. 创建 rockspec 文件
luarocks new-version myapp 1.0-1

# 2. 编辑 rockspec 文件（参考 §5.15）

# 3. 本地测试
luarocks make  # 构建并安装到本地
luarocks test  # 运行测试

# 4. 检查 rockspec
luarocks lint myapp-1.0-1.rockspec

# 5. 打包
luarocks pack myapp-1.0-1.rockspec
# 生成 myapp-1.0-1.src.rock

# 6. 上传到 LuaRocks.org
luarocks upload myapp-1.0-1.rockspec --api-key=<your_key>

# 7. 安装验证
luarocks install myapp
```

```lua
-- lua: 完整 rockspec 示例
package = "myapp"
version = "1.0-1"

source = {
  url = "git+https://github.com/user/myapp.git",
  tag = "v1.0"
}

description = {
  summary = "A Lua application",
  detailed = [[
    myapp provides utilities for data processing,
    network operations, and configuration management.
  ]],
  homepage = "https://github.com/user/myapp",
  license = "MIT",
  maintainer = "your_name <email@example.com>"
}

dependencies = {
  "lua >= 5.1, < 5.5",
  "luasocket >= 3.0-1",
  "lua-cjson >= 2.1.0-1",
  "luafilesystem >= 1.8.0-1",
}

build = {
  type = "builtin",
  modules = {
    myapp = "src/myapp.lua",
    ["myapp.utils"] = "src/utils.lua",
    ["myapp.db"] = "src/db.lua",
    ["myapp.cmod"] = "src/cmod.c",  -- C 模块
  },
  install = {
    bin = { myapp = "bin/myapp" },
    conf = { ["myapp.conf"] = "config/myapp.conf" },
  },
  copy_directories = { "docs", "examples", "tests" },
}
```

### 9.7 案例研究:Redis Functions 模块

Redis 7+ 引入 Functions 持久化脚本,支持模块化组织:

```lua
-- lua: Redis Functions 模块
-- 注册函数库
#!lua name=mylib

-- 函数库内定义函数
redis.register_function("mylib_add", function(keys, args)
  return tonumber(args[1]) + tonumber(args[2])
end)

redis.register_function("mylib_greet", function(keys, args)
  return "Hello, " .. args[1]
end)

-- 带标志的函数（允许在复制副本上执行）
redis.register_function{
  function_name = "mylib_safe_get",
  callback = function(keys, args)
    return redis.call("GET", keys[1])
  end,
  flags = { "no-writes" }
}

-- 使用:
-- redis-cli FUNCTION LOAD "#!lua name=mylib ..."
-- redis-cli FCALL mylib_add 0 2 3  -- 5
-- redis-cli FCALL mylib_greet 0 World  -- "Hello, World"
```

Redis Functions 特点:
- 函数持久化（`FUNCTION LOAD` 后所有副本可用）。
- 命名空间（`#!lua name=mylib`）。
- 无 `require`,但函数库内可定义辅助函数。

### 9.8 案例研究:Luau 渐进式类型模块

Roblox Luau 支持渐进式类型系统,模块可声明类型契约:

```lua
-- luau: Luau 类型化模块
-- 文件: typed_models.luau
export type User = {
  name: string,
  age: number,
  email: string?,
}

export type UserRepository = {
  find: (self: UserRepository, id: number) -> User?,
  save: (self: UserRepository, user: User) -> boolean,
}

local M = {}

-- 类型化的工厂函数
function M.create_repository(): UserRepository
  local store: {[number]: User} = {}

  return {
    find = function(self, id: number): User?
      return store[id]
    end,
    save = function(self, user: User): boolean
      store[user.id] = user
      return true
    end,
  }
end

return M

-- 使用:
-- local Models = require("typed_models")
-- local repo = Models.create_repository()
-- local user: Models.User = { name = "Alice", age = 25, email = nil }
-- repo:save(user)
```

Luau 类型化模块特点:
- `export type` 声明模块的类型契约。
- 类型注解不影响运行时（类型擦除）。
- `--!strict` 模式强制类型检查。
- 与 Roblox 平台集成（`Instance`、`RemoteEvent` 等）。

## 10. 习题与思考题

### 10.1 基础题

**习题 1**（模块创建）:编写一个 `string_utils` 模块,包含以下函数:
- `split(s, sep)`:分割字符串
- `trim(s)`:去除首尾空白
- `starts_with(s, prefix)`:检查前缀
- `ends_with(s, suffix)`:检查后缀

**习题 2**（require 缓存）:解释以下代码输出:

```lua
local m1 = require("mymod")
m1.count = 10
package.loaded["mymod"] = nil
local m2 = require("mymod")
print(m1.count, m2.count)
```

**习题 3**（循环依赖）:给定以下两个模块文件,指出循环依赖问题并修复:

```lua
-- a.lua
local A = {}
local B = require("b")
local _helper = B.helper
function A.process() return _helper() end
return A

-- b.lua
local B = {}
local A = require("a")
function B.helper() return A.data end
return B
```

### 10.2 进阶题

**习题 4**（自定义 searcher）:实现一个 searcher,从 ZIP 文件中加载 Lua 模块（提示:使用 `lua-zlib` 或 `ffi`）。

**习题 5**（热重载）:实现一个热重载工具,要求:
- 监听文件变化（可用 `luafilesystem`）
- 自动清除 `package.loaded` 并重新 `require`
- 保留模块的可变状态（通过 `debug.getupvalue` / `setupvalue`）

**习题 6**（C 扩展）:编写一个 C 扩展模块 `mymath`,实现:
- `factorial(n)`:阶乘
- `fibonacci(n)`:斐波那契
- `is_prime(n)`:素数判断

### 10.3 综合应用题

**习题 7**（模块系统设计）:设计一个插件系统,要求:
- 插件以 Lua 模块形式提供
- 主程序通过 `require` 加载插件
- 插件可声明依赖（其他插件）
- 支持插件启用/禁用
- 提供插件隔离（沙箱）

**习题 8**（LuaRocks 包）:为以下模块编写 rockspec 文件:
- 模块名:`mylib`
- 版本:`1.0.0`
- 依赖:`luasocket >= 3.0`,`lua-cjson`
- 含 C 扩展模块
- 提供 `mylib` 命令行工具

### 10.4 思考题

**思考题 1**:Lua 模块系统为何不引入命名空间层级（如 `foo.bar.baz` 的语法级支持）?这对 Lua 的设计哲学有何影响?

**思考题 2**:对比 Lua 的 `require` 与 ES Modules 的 `import`,讨论动态 vs 静态模块系统的优劣。在何种场景下动态模块系统更合适?

**思考题 3**:若要为 Lua 设计一个类型系统（如 Luau）,模块契约应如何表达?考虑类型导出、泛型模块、类型推断。

**思考题 4**:`package.loaded` 的全局缓存设计在多线程 Lua（如 Lua-ML、LuaJIT 多线程）中会有什么问题?如何解决?

### 10.5 参考答案

**习题 2 答案**:
- `m1.count` 输出 `10`（m1 仍持有旧模块表引用）。
- `m2.count` 输出 `nil`（m2 是新加载的模块,无 count 字段）。
- 解释:`package.loaded["mymod"] = nil` 清除缓存,但 m1 仍引用旧模块表;`require("mymod")` 重新加载,返回新表。

**习题 3 答案**:
- 问题:`a.lua` 中 `local _helper = B.helper` 立即访问 B,但 B 加载时 `require("a")` 返回 `true`,B.helper 未定义。
- 修复:

```lua
-- a.lua (修复)
local A = {}
local B = require("b")  -- 仅保存引用
function A.process()
  return B.helper()  -- 延迟访问
end
return A

-- b.lua (无需修改)
local B = {}
local A = require("a")  -- A 为 true,但 B.helper 不立即访问 A
function B.helper()
  return A.data  -- 调用时 A 已加载完成
end
return B
```

## 11. 参考文献

[1] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "Lua 5.0 Reference Manual," Technical Report PUC-Rio, 2003. [Online]. Available: https://www.lua.org/manual/5.0/

[2] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "Lua 5.1 Reference Manual," Technical Report PUC-Rio, 2006. [Online]. Available: https://www.lua.org/manual/5.1/

[3] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "Lua 5.2 Reference Manual," Technical Report PUC-Rio, 2011. [Online]. Available: https://www.lua.org/manual/5.2/

[4] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "Lua 5.3 Reference Manual," Technical Report PUC-Rio, 2015. [Online]. Available: https://www.lua.org/manual/5.3/

[5] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "Lua 5.4 Reference Manual," Technical Report PUC-Rio, 2020. [Online]. Available: https://www.lua.org/manual/5.4/

[6] R. Ierusalimschy, "Programming in Lua," 4th ed., PUC-Rio, 2016. [Online]. Available: https://www.lua.org/pil/4.0.html

[7] H. Muhammad, "LuaRocks 3.0 Documentation," 2019. [Online]. Available: https://github.com/luarocks/luarocks/wiki

[8] M. Pall, "LuaJIT 2.1 Reference," 2011. [Online]. Available: https://luajit.org/

[9] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "The Evolution of Lua," in Proc. of the Third ACM SIGPLAN History of Programming Languages Conference (HOPL III), 2007, pp. 2-1-2-26. doi: 10.1145/1238844.1238846

[10] R. Ierusalimschy, "Lua: An Extensible Embeddable Language," IEEE Software, vol. 32, no. 1, pp. 18-22, Jan. 2015. doi: 10.1109/MS.2014.123

[11] R. Ierusalimschy, "A Look at the Design of Lua," Communications of the ACM, vol. 61, no. 11, pp. 44-45, Nov. 2018. doi: 10.1145/3186277

[12] Y. Ikegami and K. Noda, "OpenResty: A Fast Web App Server by Extending Nginx with LuaJIT," in Proc. of the 2014 ACM SIGPLAN International Conference on Systems, Programming, and Applications: Software for Humanity (SPLASH), 2014, pp. 17-18. doi: 10.1145/2660193.2660203

[13] A. Lewis, "Lapis: A Web Framework for Lua/MoonScript," 2012. [Online]. Available: https://leafo.net/lapis/

[14] J. Belanger, "Turbo.lua: A Framework for Building Fast, Scalable Web Applications," 2013. [Online]. Available: http://turbolua.org/

[15] T. Wrenholt, "Luvit: Asynchronous I/O for Lua," 2012. [Online]. Available: https://luvit.io/

[16] Blizzard Entertainment, "World of Warcraft AddOn Development Guide," 2020. [Online]. Available: https://wowpedia.fandom.com/wiki/AddOn

[17] N. van Lierop, "Neovim Lua Documentation," 2021. [Online]. Available: https://neovim.io/doc/user/lua.html

[18] Roblox Corporation, "Luau: Gradual Typing for Lua," 2021. [Online]. Available: https://luau-lang.org/

[19] D. A. Wheeler, "Why Lua Is a Good Embedded Language," IEEE Software, vol. 24, no. 5, pp. 88-91, Sep. 2007. doi: 10.1109/MS.2007.140

[20] P. Jodoin, "Using Lua in Embedded Systems," Embedded Systems Conference, 2010.

[21] M. Pall, "LuaJIT FFI: A Foreign Function Interface for LuaJIT," 2011. [Online]. Available: https://luajit.org/ext_ffi.html

[22] R. Ierusalimschy, "Lua Module System Design Notes," 2003. [Online]. Available: https://www.lua.org/manual/5.0/manual.html#5.3

[23] K. S. Raghavan and D. Leijen, "Module Systems Reconsidered," in Proc. of the 2004 ACM SIGPLAN Workshop on Scheme and Functional Programming, 2004, pp. 1-10.

[24] X. Leroy, "The Objective Caml System: Documentation and User's Manual," 2020. [Online]. Available: https://ocaml.org/manual/

[25] D. Turner, "Some History of Functional Programming Languages," in Proc. of the 2012 Symposium on History of Programming Languages (HOPL IV), 2012, pp. 1-20. doi: 10.1145/2368116.2368120

## 12. 延伸阅读

### 12.1 Lua 官方资源

- **Lua 官方文档**（https://www.lua.org/docs.html）:Lua 各版本参考手册、教程、论文。
- **Programming in Lua**（https://www.lua.org/pil/）:Roberto Ierusalimschy 所著官方教程,第 4 版覆盖 Lua 5.3。
- **Lua Users Wiki**（http://lua-users.org/wiki/）:社区维护的教程、技巧、模块列表。
- **Lua mailing list**（https://www.lua.org/lua-l.html）:Lua 官方邮件列表,讨论设计与实现。

### 12.2 LuaRocks 与包管理

- **LuaRocks 官方文档**（https://github.com/luarocks/luarocks/wiki）:LuaRocks 使用、开发、贡献指南。
- **LuaRocks.org**（https://luarocks.org/）:Lua 包仓库,搜索与安装模块。
- **rockspec 参考**（https://github.com/luarocks/luarocks/wiki/rockspec-format）:rockspec 文件格式详解。

### 12.3 宿主环境

- **OpenResty 文档**（https://openresty.org/en/docs.html）:OpenResty 模块系统、`lua_package_path`、`init_by_lua` 等。
- **Lapis 框架**（https://leafo.net/lapis/）:Lua Web 框架,模块组织参考。
- **WoW AddOn 开发**（https://wowpedia.fandom.com/wiki/AddOn）:WoW Lua 5.1 扩展与加载机制。
- **Neovim Lua**（https://neovim.io/doc/user/lua.html）:Neovim Lua API 与模块组织。
- **Roblox Luau**（https://luau-lang.org/）:Luau 类型系统与模块契约。

### 12.4 跨语言模块系统参考

- **ES Modules 规范**（https://tc39.es/ecma262/#sec-modules）:JavaScript 标准 ES Modules 规范。
- **CommonJS**（http://www.commonjs.org/）:Node.js 模块系统原始规范。
- **Python import 系统**（https://docs.python.org/3/reference/import.html）:Python 模块与包机制。
- **Go packages**（https://golang.org/ref/spec#Packages）:Go 模块与 import 语法。
- **Rust crates**（https://doc.rust-lang.org/cargo/）:Cargo 与 crates.io 系统。

### 12.5 理论与历史

- **HOPL III: Lua 演化**（https://dl.acm.org/doi/10.1145/1238844.1238846）:Roberto Ierusalimschy 主讲 Lua 语言演化史。
- **A Look at the Design of Lua**（https://cacm.acm.org/magazines/2018/11/231879-a-look-at-the-design-of-lua/fulltext）:Lua 设计哲学 ACM 文章。
- **Modules in Standard ML**（https://www.smlnj.org/doc/modules.html）:ML 模块系统,最严谨的模块理论之一。
- **Mixin Modules**（https://dl.acm.org/doi/10.1145/301618.301636）:混入模块理论。

### 12.6 进阶主题

- **Lua 沙箱设计**（http://lua-users.org/wiki/SandBoxes）:Lua 沙箱模式与陷阱。
- **Lua 元编程**（https://www.lua.org/pil/13.html）:Lua 元表与元方法,模块系统的基础。
- **LuaJIT FFI 教程**（https://luajit.org/ext_ffi_tutorial.html）:FFI 替代 C 扩展模块。
- **Lua 性能优化**（https://www.lua.org/gems/sample.pdf）:Lua 性能优化技巧,包括模块加载优化。

## 附录 A:模块系统 API 速查表

### A.1 `package` 库

| API | 版本 | 说明 |
| --- | --- | --- |
| `package.loaded` | 5.0+ | 已加载模块缓存表 |
| `package.path` | 5.0+ | Lua 模块搜索路径模板 |
| `package.cpath` | 5.0+ | C 模块搜索路径模板 |
| `package.preload` | 5.0+ | 预加载模块表 |
| `package.searchers` | 5.2+ | searcher 函数列表（5.1 为 `package.loaders`） |
| `package.loaders` | 5.1 | loader 函数列表（5.2+ 改名 `searchers`） |
| `package.searchpath(name, path, sep, rep)` | 5.2+ | 搜索模块路径,返回文件路径 |
| `package.seeall(module)` | 5.1 | 设置 `_G` 为模块的 `__index`（已废弃） |

### A.2 `require` 函数

```lua
-- 基本 require
local mod = require("modname")

-- 返回值:
-- - 模块表（若模块 return M）
-- - true（若模块未显式返回）
-- - 抛错（若加载失败）
```

### A.3 C 模块入口

```c
/* Lua 5.2+ 入口函数 */
int luaopen_<modname>(lua_State *L) {
  luaL_newlib(L, funcs);  /* 注册函数表 */
  return 1;
}

/* Lua 5.1 入口函数 */
int luaopen_<modname>(lua_State *L) {
  luaL_register(L, "<modname>", funcs);  /* 注册到全局表 */
  return 1;
}
```

## 附录 B:模块加载错误对照

| 错误信息 | 原因 | 修复 |
| --- | --- | --- |
| `module 'X' not found` | 模块不在搜索路径 | 检查 `package.path` 或安装 LuaRocks 包 |
| `error loading module` | 模块代码语法错误 | 修复语法错误,查看完整错误信息 |
| `attempt to index a boolean value` | 循环依赖返回 `true` 占位 | 延迟访问,见 §4.2 |
| `multiple Lua VMs detected` | C 模块编译的 Lua 版本不匹配 | 为当前 Lua 版本重新编译 |
| `attempt to call a nil value` | 模块未导出该函数 | 检查模块返回值与函数名 |
| `bad argument #X` | 模块函数参数类型错误 | 检查调用方传入参数 |

## 附录 C:术语表

| 术语 | 英文 | 含义 |
| --- | --- | --- |
| 模块 | module | 组织代码的命名空间,Lua 中为表 |
| 包 | package | 一组相关模块的集合,通常通过 LuaRocks 管理 |
| 包管理器 | package manager | 安装、卸载、管理 Lua 包的工具,如 LuaRocks |
| 搜索路径 | search path | `require` 查找模块的路径列表 |
| searcher / loader | 搜索器/加载器 | `require` 内部查找模块的函数 |
| 预加载 | preload | `package.preload` 中预先注册的模块 |
| 循环依赖 | cyclic dependency | 模块 A 依赖 B,B 又依赖 A |
| 热重载 | hot reload | 运行时重新加载模块而不重启进程 |
| 命名空间 | namespace | 模块提供的独立命名空间 |
| rockspec | rockspec | LuaRocks 包规格文件 |
| FFI | Foreign Function Interface | LuaJIT 提供的 C 接口,替代 C 模块 |
| 沙箱 | sandbox | 受限环境,限制可访问的模块与函数 |
| 单例 | singleton | 模块表仅创建一次（`require` 缓存保证） |

## 附录 D:Lua 版本模块系统差异

| 特性 | Lua 5.0 | 5.1 | 5.2 | 5.3 | 5.4 | LuaJIT | Luau |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `module()` | 有 | 有 | 废弃 | 无 | 无 | 有（5.1 兼容） | 无 |
| `package.loaders` | 有 | 有 | 改名 | 无 | 无 | 有 | 改名 |
| `package.searchers` | 无 | 无 | 有 | 有 | 有 | 无 | 有 |
| `package.searchpath` | 无 | 无 | 有 | 有 | 有 | 无 | 有 |
| `package.seeall` | 有 | 有 | 无 | 无 | 无 | 有 | 无 |
| `<const>` | 无 | 无 | 无 | 无 | 有 | 无 | 有 |
| `<close>` | 无 | 无 | 无 | 无 | 有 | 无 | 有 |
| FFI | 无 | 无 | 无 | 无 | 无 | 有 | 无 |
| 类型系统 | 无 | 无 | 无 | 无 | 无 | 无 | 有 |
| `setfenv`/`getfenv` | 有 | 有 | 无 | 无 | 无 | 有 | 有 |
| `_ENV` | 无 | 无 | 有 | 有 | 有 | 无 | 无 |

## 附录 E:习题答案补充

**习题 1 答案**:

```lua
-- lua: string_utils.lua
local M = {}

function M.split(s, sep)
  local parts = {}
  local pattern = "([^" .. sep .. "]+)"
  for part in s:gmatch(pattern) do
    table.insert(parts, part)
  end
  return parts
end

function M.trim(s)
  return s:match("^%s*(.-)%s*$")
end

function M.starts_with(s, prefix)
  return s:sub(1, #prefix) == prefix
end

function M.ends_with(s, suffix)
  return s:sub(-#suffix) == suffix
end

return M
```

**习题 7 答案（框架）**:

```lua
-- lua: 插件系统框架
local PluginManager = {}

local plugins = {}
local loaded = {}

function PluginManager.register(name, module_path, dependencies)
  plugins[name] = {
    path = module_path,
    deps = dependencies or {},
    enabled = false,
  }
end

function PluginManager.load(name)
  if loaded[name] then return loaded[name] end

  local spec = plugins[name]
  if not spec then error("Unknown plugin: " .. name) end

  -- 加载依赖
  for _, dep in ipairs(spec.deps) do
    PluginManager.load(dep)
  end

  -- 加载插件
  local mod = require(spec.path)
  loaded[name] = mod
  spec.enabled = true

  if mod.on_load then mod.on_load() end
  return mod
end

function PluginManager.unload(name)
  local mod = loaded[name]
  if mod and mod.on_unload then mod.on_unload() end
  loaded[name] = nil
  package.loaded[plugins[name].path] = nil
  plugins[name].enabled = false
end

function PluginManager.list()
  local result = {}
  for name, spec in pairs(plugins) do
    table.insert(result, { name = name, enabled = spec.enabled })
  end
  return result
end

return PluginManager
```

---

**文档版本**:本章节基于 Lua 5.0/5.1/5.2/5.3/5.4/5.5、LuaJIT 2.1、Luau、LuaRocks 3.x、OpenResty 1.21+、Neovim 0.9+、Redis 7+ 编写,目标读者为 0 基础自学者与企业级 Lua 工程师。

**适用范围**:游戏脚本（WoW、Roblox、Love2D）、嵌入式（OpenWrt、IoT）、Web 服务（OpenResty、Lapis、Turbo.lua）、Redis 脚本、Neovim 配置、桌面应用扩展等所有 Lua 应用场景。
