---
order: 53
title: 环境与模块
module: lua
category: Lua
difficulty: intermediate
description: Lua环境与require机制
author: fanquanpp
updated: '2026-06-14'
related:
  - lua/面向对象编程
  - lua/协程详解
  - lua/字符串模式匹配
  - lua/Lua与C交互
prerequisites:
  - lua/概述与环境配置
---

## 概述

Lua 的环境与模块系统是组织代码和管理命名空间的核心机制。Lua 的模块系统非常简洁，一个模块本质上就是一个返回表的 Lua 文件。通过 require 函数加载模块，Lua 会自动处理模块的搜索路径、缓存和重复加载等问题。这种设计使得 Lua 的模块系统既灵活又高效，无需复杂的包管理工具即可组织大型项目。

Lua 的环境（environment）概念在 5.1 和 5.2 之间发生了重要变化。Lua 5.1 使用 setfenv/getfenv 来操作函数的环境，而 Lua 5.2+ 引入了 \_ENV 变量来替代全局环境表。理解环境机制对于编写沙箱、避免全局变量污染、以及理解 Lua 的作用域规则都至关重要。

## 基本概念

**模块（Module）**是一个自包含的代码单元，通常是一个 Lua 文件，通过返回一个表来暴露其公共接口。模块的消费者通过 require 函数获取这个表，然后调用其中的函数和访问其中的变量。这种模式与 JavaScript 的 CommonJS 模块非常相似。

**require 函数**是 Lua 内置的模块加载机制。它接受一个模块名作为参数，按照搜索路径查找对应的文件，加载并执行该文件，然后返回模块导出的值。require 会缓存已加载的模块，确保每个模块只被加载一次，后续的 require 调用直接返回缓存的结果。

**package 模块**是 Lua 提供的包管理工具库，包含多个重要的全局变量：package.path 控制 Lua 模块的搜索路径，package.cpath 控制 C 模块的搜索路径，package.loaded 存储已加载模块的缓存表，package.searchers 定义了模块搜索器的列表。

**\_ENV 变量**（Lua 5.2+）是每个代码块的局部变量，指向当前的环境表。所有对全局变量的访问实际上都是对 \_ENV 表的访问。修改 \_ENV 可以改变代码运行的环境，这是实现沙箱的基础机制。

**全局环境 \_G**是一个特殊的全局变量，指向全局环境表本身。在默认情况下，\_ENV 和 \_G 指向同一个表。但在沙箱环境中，\_ENV 可以指向一个不同的表，而 \_G 仍然指向原始的全局环境。

## 快速开始

创建和使用一个简单的模块：

```lua
-- 文件: mymodule.lua
local M = {}  -- 创建模块表

-- 模块的版本号
M.version = "1.0.0"

-- 定义模块的公共函数
function M.greet(name)
    return "你好, " .. name .. "!"
end

function M.add(a, b)
    return a + b
end

-- 返回模块表
return M
```

在另一个文件中使用这个模块：

```lua
-- 文件: main.lua
local mymodule = require("mymodule")

print(mymodule.greet("Lua"))    -- 输出: 你好, Lua!
print(mymodule.add(3, 5))       -- 输出: 8
print(mymodule.version)         -- 输出: 1.0.0
```

## 详细用法

### 模块定义模式

Lua 有多种定义模块的模式，各有优缺点：

```lua
-- 模式一：表赋值法（推荐）
-- 优点：清晰明了，所有公共成员都显式地附加到模块表上
local M = {}

function M.greet(name)
    return "你好, " .. name
end

function M.farewell(name)
    return "再见, " .. name
end

return M
```

```lua
-- 模式二：局部函数 + 赋值法
-- 优点：可以先定义私有辅助函数，再暴露公共接口
local M = {}

-- 私有函数（不附加到 M 上，外部无法访问）
local function format_name(name)
    return name:sub(1, 1):upper() .. name:sub(2):lower()
end

-- 公共函数
function M.greet(name)
    local formatted = format_name(name)
    return "你好, " .. formatted
end

return M
```

```lua
-- 模式三：先定义后导出
-- 优点：函数之间可以自由互相调用，无需前缀
local greet, farewell

local function format_name(name)
    return name:sub(1, 1):upper() .. name:sub(2):lower()
end

function greet(name)
    return "你好, " .. format_name(name)
end

function farewell(name)
    return "再见, " .. format_name(name)
end

-- 导出公共接口
return {
    greet = greet,
    farewell = farewell,
}
```

### require 的工作原理

require 的完整加载流程如下：

```lua
-- require 的等价伪代码
function require(name)
    -- 1. 检查模块是否已加载
    if package.loaded[name] then
        return package.loaded[name]
    end

    -- 2. 依次尝试每个搜索器
    for _, searcher in ipairs(package.searchers) do
        local loader = searcher(name)
        if type(loader) == "function" then
            -- 3. 执行加载函数
            local result = loader(name)

            -- 4. 缓存加载结果
            if result == nil then
                result = true  -- 模块没有返回值时默认缓存 true
            end
            package.loaded[name] = result
            return result
        end
    end

    -- 5. 所有搜索器都未找到模块
    error("module '" .. name .. "' not found")
end
```

查看和修改模块搜索路径：

```lua
-- 查看当前搜索路径
print(package.path)
-- 输出类似: ./?.lua;./?/init.lua;/usr/local/share/lua/5.4/?.lua;...

-- 添加自定义搜索路径
package.path = "./mylibs/?.lua;" .. package.path

-- 现在 require("utils") 会搜索 ./mylibs/utils.lua
```

### 模块的目录结构

Lua 支持点分路径来组织模块的目录结构：

```lua
-- 目录结构：
-- myapp/
--   init.lua
--   utils/
--     init.lua
--     string.lua
--     table.lua
--   network/
--     init.lua
--     http.lua

-- 加载模块
local myapp = require("myapp")              -- 加载 myapp/init.lua
local utils = require("myapp.utils")        -- 加载 myapp/utils/init.lua
local str_utils = require("myapp.utils.string")  -- 加载 myapp/utils/string.lua
local http = require("myapp.network.http")  -- 加载 myapp/network/http.lua
```

使用 init.lua 作为目录模块的入口：

```lua
-- 文件: myapp/utils/init.lua
-- 将子模块整合到一起，提供统一的入口
local M = {}

M.string = require("myapp.utils.string")
M.table = require("myapp.utils.table")

-- 也可以直接暴露子模块的函数
M.trim = M.string.trim
M.split = M.string.split
M.merge = M.table.merge

return M
```

### 模块缓存与热加载

require 会缓存已加载的模块，理解缓存机制对于开发调试很重要：

```lua
-- 第一次 require 加载并缓存模块
local mod1 = require("mymodule")

-- 第二次 require 返回缓存的模块（不会重新加载）
local mod2 = require("mymodule")

-- mod1 和 mod2 是同一个表
print(mod1 == mod2)  -- 输出: true
```

强制重新加载模块（热加载）：

```lua
-- 清除模块缓存，使下次 require 重新加载
local function reload_module(name)
    package.loaded[name] = nil
    return require(name)
end

-- 使用示例
local mymodule = reload_module("mymodule")
```

开发环境中的自动热加载：

```lua
-- 简单的模块热加载器
local HotLoader = {}
HotLoader.__index = HotLoader

function HotLoader.new()
    local self = setmetatable({}, HotLoader)
    self.modules = {}       -- 模块名 -> 加载时间
    self.watch_list = {}    -- 需要监控的模块列表
    return self
end

-- 注册需要监控的模块
function HotLoader:watch(name)
    self.watch_list[name] = true
    self.modules[name] = os.time()
end

-- 检查并重新加载已变更的模块
function HotLoader:check()
    local reloaded = {}
    for name, _ in pairs(self.watch_list) do
        -- 简化判断：这里可以根据文件修改时间判断
        -- 实际实现需要使用 lfs 等库获取文件信息
        local current_time = os.time()
        if current_time - self.modules[name] > 5 then
            package.loaded[name] = nil
            require(name)
            self.modules[name] = current_time
            reloaded[#reloaded + 1] = name
        end
    end
    return reloaded
end

-- 使用示例
local loader = HotLoader.new()
loader:watch("mymodule")
loader:watch("config")
```

### 环境与 \_ENV

Lua 5.2+ 使用 \_ENV 变量来控制代码的运行环境：

```lua
-- 默认情况下，_ENV 和 _G 指向同一个表
print(_ENV == _G)  -- 输出: true

-- 所有全局变量访问都是对 _ENV 的访问
x = 42
print(_ENV.x)  -- 输出: 42

-- 修改 _ENV 可以改变代码的运行环境
local safe_env = {
    print = print,       -- 允许 print
    tonumber = tonumber, -- 允许 tonumber
    tostring = tostring, -- 允许 tostring
    math = math,         -- 允许 math 库
}

-- 在受限环境中执行代码
local code = [[
    print("在沙箱中执行")
    print("1 + 1 = " .. tostring(1 + 1))
]]

-- 加载代码并设置环境
local func, err = load(code, nil, "t", safe_env)
if func then
    func()
else
    print("代码加载失败:", err)
end
```

创建沙箱环境：

```lua
-- 创建受限的沙箱环境
local function create_sandbox()
    local sandbox = {}

    -- 允许的基础函数
    local allowed_globals = {
        "print", "tonumber", "tostring", "type", "pairs", "ipairs",
        "next", "select", "unpack", "error", "pcall", "xpcall",
    }

    -- 从全局环境中复制允许的函数
    for _, name in ipairs(allowed_globals) do
        sandbox[name] = _G[name]
    end

    -- 允许的库
    sandbox.math = math
    sandbox.string = string
    sandbox.table = table

    -- 禁止文件 I/O 和系统调用
    -- sandbox.io = nil      -- 不提供 io 库
    -- sandbox.os = nil      -- 不提供 os 库
    -- sandbox.require = nil -- 不提供 require

    return sandbox
end

-- 在沙箱中执行不受信任的代码
local function run_sandboxed(code_str)
    local sandbox = create_sandbox()
    local func, err = load(code_str, nil, "t", sandbox)

    if not func then
        return nil, "代码加载失败: " .. err
    end

    return pcall(func)
end

-- 使用示例
local ok, result = run_sandboxed([[
    local sum = 0
    for i = 1, 10 do
        sum = sum + i
    end
    return sum
]])

if ok then
    print("沙箱执行结果:", result)  -- 输出: 55
end

-- 尝试执行危险代码
local ok, err = run_sandboxed([[
    local f = io.open("/etc/passwd", "r")  -- io 不可用
    return f:read("*a")
]])

if not ok then
    print("沙箱拦截:", err)
end
```

### 继承环境

在受限环境中提供部分全局访问：

```lua
-- 创建一个继承自全局环境的受限环境
local function create_inherited_env(overrides)
    -- 创建新表，设置全局环境为元表
    local env = {}
    setmetatable(env, { __index = _G })

    -- 应用覆盖值
    if overrides then
        for k, v in pairs(overrides) do
            env[k] = v
        end
    end

    return env
end

-- 使用示例：提供自定义的 print 函数
local custom_env = create_inherited_env({
    print = function(...)
        local args = {...}
        local parts = {}
        for i, arg in ipairs(args) do
            parts[i] = tostring(arg)
        end
        _G.print("[自定义输出] " .. table.concat(parts, "\t"))
    end,
})

local code = [[
    print("这条消息使用自定义 print 输出")
    print("数学计算:", math.sqrt(2))
]]

local func = load(code, nil, "t", custom_env)
func()
-- 输出: [自定义输出] 这条消息使用自定义 print 输出
--       [自定义输出] 数学计算:  1.4142135623731
```

## 常见场景

### 插件系统

使用模块机制实现可扩展的插件系统：

```lua
-- 插件管理器
local PluginManager = {}
PluginManager.__index = PluginManager

function PluginManager.new()
    local self = setmetatable({}, PluginManager)
    self.plugins = {}       -- 已注册的插件
    self.hooks = {}         -- 钩子函数
    return self
end

-- 注册插件
function PluginManager:register(name, plugin_module)
    if self.plugins[name] then
        error("插件已注册: " .. name)
    end

    -- 验证插件接口
    assert(type(plugin_module.init) == "function", "插件必须实现 init 方法")

    self.plugins[name] = plugin_module
    plugin_module.init(self)

    print("插件已注册: " .. name)
end

-- 注册钩子
function PluginManager:add_hook(hook_name, plugin_name, callback)
    if not self.hooks[hook_name] then
        self.hooks[hook_name] = {}
    end
    self.hooks[hook_name][#self.hooks[hook_name] + 1] = {
        plugin = plugin_name,
        callback = callback,
    }
end

-- 触发钩子
function PluginManager:fire_hook(hook_name, ...)
    if not self.hooks[hook_name] then
        return {}
    end

    local results = {}
    for _, hook in ipairs(self.hooks[hook_name]) do
        local ok, result = pcall(hook.callback, ...)
        if ok then
            results[#results + 1] = result
        else
            print("钩子执行失败: " .. hook.plugin .. " -> " .. hook_name)
        end
    end
    return results
end

-- 使用示例
local manager = PluginManager.new()

-- 定义一个日志插件
local log_plugin = {
    name = "logger",
    init = function(pm)
        pm:add_hook("on_request", "logger", function(req)
            print("[LOG] 请求: " .. (req.path or "unknown"))
        end)
    end,
}

-- 定义一个认证插件
local auth_plugin = {
    name = "auth",
    init = function(pm)
        pm:add_hook("on_request", "auth", function(req)
            if not req.token then
                return {blocked = true, reason = "未认证"}
            end
        end)
    end,
}

manager:register("logger", log_plugin)
manager:register("auth", auth_plugin)

-- 触发钩子
manager:fire_hook("on_request", {path = "/api/data", token = "abc123"})
```

### 配置模块

实现支持环境变量的配置模块：

```lua
-- config.lua
local M = {}

-- 默认配置
local defaults = {
    host = "127.0.0.1",
    port = 8080,
    debug = false,
    log_level = "info",
    database = {
        host = "localhost",
        port = 3306,
        name = "myapp",
        pool_size = 10,
    },
}

-- 当前配置
M.current = {}

-- 深拷贝表
local function deep_copy(t)
    local copy = {}
    for k, v in pairs(t) do
        if type(v) == "table" then
            copy[k] = deep_copy(v)
        else
            copy[k] = v
        end
    end
    return copy
end

-- 深度合并配置
local function deep_merge(base, override)
    local result = deep_copy(base)
    for k, v in pairs(override) do
        if type(v) == "table" and type(result[k]) == "table" then
            result[k] = deep_merge(result[k], v)
        else
            result[k] = v
        end
    end
    return result
end

-- 加载配置
function M.load(env_name)
    env_name = env_name or "development"

    -- 从默认配置开始
    M.current = deep_copy(defaults)

    -- 尝试加载环境特定配置
    local ok, env_config = pcall(require, "config." .. env_name)
    if ok and type(env_config) == "table" then
        M.current = deep_merge(M.current, env_config)
    end

    return M.current
end

-- 获取配置值（支持点分路径）
function M.get(key)
    local value = M.current
    for part in key:gmatch("[^.]+") do
        if type(value) ~= "table" then
            return nil
        end
        value = value[part]
    end
    return value
end

-- 设置配置值
function M.set(key, value)
    local t = M.current
    for part in key:gmatch("([^.]+)%.?") do
        if not t[part] then
            t[part] = {}
        end
        t = t[part]
    end
    t = value
end

-- 初始化
M.load(os.getenv("APP_ENV") or "development")

return M
```

### 单例模块

实现单例模式的模块：

```lua
-- singleton.lua
local Singleton = {}
Singleton.__index = Singleton

-- 唯一实例
local instance = nil

-- 获取实例
function Singleton.get_instance()
    if not instance then
        instance = setmetatable({
            data = {},
            created_at = os.time(),
        }, Singleton)
    end
    return instance
end

-- 设置数据
function Singleton:set(key, value)
    self.data[key] = value
end

-- 获取数据
function Singleton:get(key)
    return self.data[key]
end

-- 防止通过 require 创建新实例
return Singleton
```

使用单例模块：

```lua
local Singleton = require("singleton")

-- 获取实例
local s1 = Singleton.get_instance()
s1:set("name", "Lua")

-- 在另一个地方获取同一个实例
local s2 = Singleton.get_instance()
print(s2:get("name"))  -- 输出: Lua

-- s1 和 s2 是同一个对象
print(s1 == s2)  -- 输出: true
```

## 注意事项与常见错误

**require 的模块名与文件路径的对应关系**。require 使用点号分隔模块名（如 "myapp.utils"），对应文件系统中的路径分隔符（如 "myapp/utils.lua"）。在 Windows 和 Linux 上路径分隔符不同，但 Lua 的 require 会自动处理这种差异。

**循环依赖问题**。如果模块 A 依赖模块 B，模块 B 又依赖模块 A，就会产生循环依赖。Lua 的 require 机制在检测到循环依赖时会返回一个尚未完全加载的模块表（部分初始化），可能导致 nil 值错误。解决方案是将公共接口的定义提前，或者将相互依赖的部分提取到第三个模块中。

**模块返回值的缓存**。require 会缓存模块的返回值，而不是模块文件本身。如果模块没有返回值（即返回 nil），require 会将 true 存入 package.loaded。这意味着即使模块文件被修改，require 也不会重新加载，除非手动清除 package.loaded 中的缓存。

**\_ENV 是局部变量**。在 Lua 5.2+ 中，\_ENV 是每个代码块的局部变量，不是全局变量。这意味着不同代码块可以有不同的 \_ENV，修改一个代码块的 \_ENV 不会影响其他代码块。使用 load 函数时可以通过第四个参数指定 \_ENV。

**全局变量污染**。在模块中意外创建全局变量是常见的错误。所有变量都应使用 local 声明。可以使用 luacheck 等工具检测全局变量泄漏，或者在模块中使用严格模式（访问未声明的全局变量时报错）。

## 高级用法

### 自定义 require 行为

通过修改 package.searchers 自定义模块加载行为：

```lua
-- 添加自定义搜索器：从 ZIP 文件中加载模块
local function zip_searcher(name)
    -- 将点号替换为路径分隔符
    local path = name:gsub("%.", "/") .. ".lua"

    -- 模拟从 ZIP 中读取文件
    -- 实际实现需要使用 LuaZip 等库
    local zip_path = "myapp.zip"

    -- 如果找到模块，返回加载函数
    -- 此处简化为检查文件是否存在
    local f = io.open(path, "r")
    if f then
        local code = f:read("*a")
        f:close()

        -- 返回加载函数
        return function(module_name)
            return load(code, "=" .. module_name)()
        end
    end

    return nil  -- 未找到模块
end

-- 将自定义搜索器添加到搜索器列表
table.insert(package.searchers, 2, zip_searcher)
```

### 模块预加载

使用 package.preload 预加载模块，无需文件系统：

```lua
-- 预加载模块（常用于嵌入式场景）
package.preload["json"] = function()
    local M = {}

    function M.encode(data)
        -- 简化的 JSON 编码实现
        if type(data) == "string" then
            return '"' .. data:gsub('"', '\\"') .. '"'
        elseif type(data) == "number" then
            return tostring(data)
        elseif type(data) == "boolean" then
            return tostring(data)
        elseif type(data) == "table" then
            local parts = {}
            for k, v in pairs(data) do
                parts[#parts + 1] = '"' .. k .. '":' .. M.encode(v)
            end
            return "{" .. table.concat(parts, ",") .. "}"
        end
        return "null"
    end

    function M.decode(str)
        -- 简化的 JSON 解码（实际应使用完整解析器）
        return load("return " .. str)()
    end

    return M
end

-- 现在 require("json") 会使用预加载的模块
local json = require("json")
print(json.encode({name = "Lua", version = 5.4}))
```

### 严格模式

实现严格模式，防止意外创建全局变量：

```lua
-- strict.lua
local function strict(module_name)
    local mt = {
        __index = function(t, k)
            -- 读取未定义的全局变量时报错
            error(string.format("模块 %s 中访问未定义的变量: %s", module_name, k), 2)
        end,
        __newindex = function(t, k, v)
            -- 写入新的全局变量时报错
            error(string.format("模块 %s 中创建全局变量: %s", module_name, k), 2)
        end,
    }

    -- 创建受限环境，继承全局环境但禁止新增全局变量
    local env = {}
    setmetatable(env, {
        __index = _G,  -- 可以读取全局变量
        __newindex = function(t, k, v)
            if _G[k] ~= nil then
                -- 允许修改已有的全局变量
                _G[k] = v
            else
                error(string.format("禁止创建全局变量: %s", k), 2)
            end
        end,
    })

    return env
end

-- 使用严格模式加载模块
local function strict_require(name)
    local env = strict(name)

    -- 查找模块文件
    local path = package.searchpath(name, package.path)
    if not path then
        error("模块未找到: " .. name)
    end

    -- 读取模块代码
    local f = io.open(path, "r")
    local code = f:read("*a")
    f:close()

    -- 在严格环境中加载模块
    local func = load(code, "=" .. name, "t", env)
    return func()
end

-- 使用示例
local mymodule = strict_require("mymodule")
```

### 动态模块生成

根据参数动态生成模块：

```lua
-- 生成器模块：根据参数创建不同类型的集合
local function create_collection(type_name)
    local M = {}
    M.items = {}
    M.type = type_name

    function M:add(item)
        self.items[#self.items + 1] = item
    end

    function M:remove(item)
        for i, v in ipairs(self.items) do
            if v == item then
                table.remove(self.items, i)
                return true
            end
        end
        return false
    end

    function M:count()
        return #self.items
    end

    -- 根据类型添加特定方法
    if type_name == "sorted" then
        function M:sort(compare)
            table.sort(self.items, compare)
        end
    elseif type_name == "unique" then
        local seen = {}
        function M:add(item)
            if not seen[item] then
                seen[item] = true
                self.items[#self.items + 1] = item
            end
        end
    elseif type_name == "stack" then
        function M:push(item)
            self.items[#self.items + 1] = item
        end
        function M:pop()
            return table.remove(self.items)
        end
        function M:peek()
            return self.items[#self.items]
        end
    end

    return M
end

-- 使用示例
local stack = create_collection("stack")
stack:push("a")
stack:push("b")
stack:push("c")
print(stack:pop())  -- 输出: c
print(stack:peek()) -- 输出: b

local unique = create_collection("unique")
unique:add("a")
unique:add("b")
unique:add("a")  -- 重复，不会被添加
print(unique:count())  -- 输出: 2
```
