# Lua 模块与包速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 模块定义

**基本写法：模块定义**
`local <module> = {}; return <module>`
```lua
-- 定义模块
local M = {}
function M.greet(name)
    return "Hello, " .. name
end
return M
```

**基本写法：模块返回表**
`local <module> = { <members> }; return <module>`
```lua
-- 模块返回包含函数的表
local M = {
    add = function(a, b) return a + b end,
    subtract = function(a, b) return a - b end
}
return M
```

**换行写法：多函数模块**
`local <module> = {}; function <module>.<name1>() <body> end; function <module>.<name2>() <body> end; return <module>`
```lua
-- 多函数模块定义
local M = {}
function M.add(a, b)
    return a + b
end
function M.subtract(a, b)
    return a - b
end
function M.multiply(a, b)
    return a * b
end
return M
```

---

## 模块加载

**基本写法：require 加载模块**
`local <module> = require("<module>")`
```lua
-- 加载模块
local math = require("math")
local utils = require("utils")
```

**基本写法：require 带路径**
`require("<path>.<module>")`
```lua
-- 加载子目录中的模块
local parser = require("lib.parser")
local config = require("app.config")
```

**基本写法：require 缓存**
`local <module> = require("<module>")`
```lua
-- require 会缓存模块，多次调用只加载一次
local mod1 = require("utils")
local mod2 = require("utils")
print(mod1 == mod2)
```

**基本写法：package.loaded 清除缓存**
`package.loaded["<module>"] = nil`
```lua
-- 清除模块缓存，强制重新加载
package.loaded["utils"] = nil
local utils = require("utils")
```

---

## 模块路径

**基本写法：package.path 查看搜索路径**
`print(package.path)`
```lua
-- 查看 Lua 模块搜索路径
print(package.path)
```

**基本写法：package.cpath 查看 C 模块路径**
`print(package.cpath)`
```lua
-- 查看 C 模块搜索路径
print(package.cpath)
```

**基本写法：添加搜索路径**
`package.path = package.path .. ";<path>?.lua"`
```lua
-- 添加自定义搜索路径
package.path = package.path .. ";./lib/?.lua"
```

**基本写法：package.searchpath 搜索文件**
`package.searchpath("<module>", <path>)`
```lua
-- 搜索模块文件路径
local path = package.searchpath("utils", package.path)
```

---

## 模块导出

**基本写法：导出函数**
`<module>.<name> = function(<params>) <body> end`
```lua
-- 导出模块函数
local M = {}
M.greet = function(name)
    return "Hello, " .. name
end
return M
```

**基本写法：导出变量**
`<module>.<name> = <value>`
```lua
-- 导出模块变量
local M = {}
M.version = "1.0.0"
M.author = "Lua"
return M
```

**基本写法：导出表**
`<module>.<name> = { <members> }`
```lua
-- 导出子表
local M = {}
M.config = {
    host = "localhost",
    port = 8080
}
return M
```

**基本写法：local 与导出结合**
`local function <private>() <body> end; <module>.<public> = function() <body> end`
```lua
-- 私有函数与公开函数
local M = {}
local function privateHelper(x)
    return x * 2
end
function M.process(x)
    return privateHelper(x) + 1
end
return M
```

---

## 模块模式

**基本写法：模块单例模式**
`local <module> = {}; <module>.instance = nil; function <module>.get() <body> end; return <module>`
```lua
-- 模块单例模式
local M = {}
local instance = nil
function M.getInstance()
    if not instance then
        instance = M._create()
    end
    return instance
end
function M._create()
    return { data = {} }
end
return M
```

**基本写法：模块工厂模式**
`local <module> = {}; function <module>.create(<params>) <body> end; return <module>`
```lua
-- 模块工厂模式
local M = {}
function M.create(name, age)
    return {
        name = name,
        age = age,
        greet = function(self)
            return "Hi, I'm " .. self.name
        end
    }
end
return M
```

---

## 模块依赖

**基本写法：模块间依赖**
`local <dep> = require("<dep>"); local <module> = {}; <body>; return <module>`
```lua
-- 模块依赖其他模块
local logger = require("logger")
local M = {}
function M.process(data)
    logger.info("Processing data")
    return data
end
return M
```

**基本写法：循环依赖处理**
`local <module> = {}; function <module>.<method>() local <dep> = require("<dep>"); <body> end; return <module>`
```lua
-- 延迟加载解决循环依赖
local M = {}
function M.process()
    local dep = require("dep")
    return dep.doSomething()
end
return M
```

---

## package 模块

**基本写法：package.loaded 已加载模块**
`package.loaded["<module>"]`
```lua
-- 检查模块是否已加载
if package.loaded["utils"] then
    print("utils 已加载")
end
```

**基本写法：package.preload 预加载**
`package.preload["<module>"] = function(<name>) <body> end`
```lua
-- 预加载模块
package.preload["mymodule"] = function(name)
    return { greet = function() return "Hello" end }
end
```

**基本写法：package.seeall**
`setmetatable(<module>, {__index = _G})`
```lua
-- 模块访问全局环境
local M = {}
setmetatable(M, {__index = _G})
return M
```

---

## 模块加载器

**基本写法：自定义加载器**
`table.insert(package.loaders, <function>)`
```lua
-- 自定义模块加载器
table.insert(package.loaders or package.searchers, function(name)
    return function()
        return { custom = true }
    end
end)
```

**基本写法：package.loaders 查看加载器**
`for <i>, <loader> in ipairs(package.loaders or package.searchers) do <body> end`
```lua
-- 查看所有加载器
local loaders = package.loaders or package.searchers
for i, loader in ipairs(loaders) do
    print(i, loader)
end
```

---

## C 模块

**基本写法：加载 C 模块**
`local <module> = require("<cmodule>")`
```lua
-- 加载 C 扩展模块
local cjson = require("cjson")
local socket = require("socket")
```

**基本写法：package.loadlib 加载动态库**
`package.loadlib("<path>", "<func>")`
```lua
-- 加载动态链接库
local f = package.loadlib("./libtest.so", "luaopen_test")
if f then
    local module = f()
end
```

---

## 模块组织

**基本写法：命名空间式模块**
`local <ns> = {}; <ns>.<sub> = require("<ns>.<sub>"); return <ns>`
```lua
-- 命名空间式模块组织
local app = {}
app.config = require("app.config")
app.utils = require("app.utils")
app.models = require("app.models")
return app
```

**换行写法：多子模块组织**
`local <ns> = { <sub1> = require(...), <sub2> = require(...), <sub3> = require(...) }; return <ns>`
```lua
-- 多子模块组织
local myapp = {
    config = require("myapp.config"),
    database = require("myapp.database"),
    router = require("myapp.router"),
    middleware = require("myapp.middleware")
}
return myapp
```

---

## 模块初始化

**基本写法：模块初始化函数**
`function <module>.init(<params>) <body> end`
```lua
-- 模块初始化函数
local M = {}
function M.init(config)
    M.config = config
    M.initialized = true
end
return M
```

**基本写法：模块自动初始化**
`local <module> = {}; <body>; return <module>`
```lua
-- 模块加载时自动初始化
local M = {}
M.version = "1.0.0"
M.loaded = os.time()
function M.getInfo()
    return "Version: " .. M.version
end
return M
```

---

## 模块重载

**基本写法：模块重载**
`package.loaded["<module>"] = nil; local <module> = require("<module>")`
```lua
-- 模块重载
package.loaded["utils"] = nil
local utils = require("utils")
```

**基本写法：模块重载函数**
`local function <name>(<module>) package.loaded[<module>] = nil; return require(<module>) end`
```lua
-- 模块重载函数
local function reloadModule(name)
    package.loaded[name] = nil
    return require(name)
end
```
