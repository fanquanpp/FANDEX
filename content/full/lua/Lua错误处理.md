---
order: 61
title: Lua错误处理
module: lua
category: Lua
difficulty: beginner
description: 错误处理与保护调用
author: fanquanpp
updated: '2026-06-14'
related:
  - lua/Lua与Nginx
  - lua/模块与包
  - lua/Lua迭代器
  - 'lua/Lua与World of Warcraft'
prerequisites:
  - lua/概述与环境配置
---

## 概述

错误处理是编写健壮程序的基础。Lua 采用了一种简洁而灵活的错误处理机制：通过 error 函数主动抛出错误，通过 pcall 和 xpcall 进行保护调用。与 Java、Python 等语言使用 try-catch 结构不同，Lua 没有内置的异常语法，而是依赖函数调用的返回值来传递错误信息。这种设计虽然简单，但足以应对大多数场景，并且与 Lua 作为嵌入式语言的定位非常契合。

理解 Lua 的错误处理机制对于编写可靠的程序至关重要。无论是处理用户输入、访问文件系统、还是调用外部库函数，都可能遇到运行时错误。合理使用 pcall 和 xpcall 可以防止程序因未捕获的错误而崩溃，同时提供足够的信息帮助开发者定位问题。

## 基本概念

**error 函数**用于主动抛出错误。当调用 error 时，Lua 会中断当前函数的执行，沿着调用栈向上寻找错误处理代码。error 接受两个参数：第一个是错误消息（可以是任意类型的值，不限于字符串），第二个是错误级别，用于控制错误信息中指向的源文件位置。

**pcall** 是 protected call 的缩写，即保护调用。它接受一个函数和若干参数，在保护模式下调用该函数。如果函数执行成功，pcall 返回 true 和函数的返回值；如果函数抛出错误，pcall 返回 false 和错误消息。pcall 不会提供调用栈信息。

**xpcall** 是 pcall 的增强版本，额外接受一个错误处理函数。当被调用的函数抛出错误时，xpcall 会调用错误处理函数，并将错误消息传递给它。最常见的用法是将 debug.traceback 作为错误处理函数，从而获取完整的调用栈信息。

**错误级别**是 error 函数的第二个参数，用于控制错误消息中指向的源代码位置。级别 1（默认）指向调用 error 的位置，级别 2 指向调用 error 所在函数的位置，级别 0 不添加位置信息。合理使用错误级别可以让错误消息更加准确和有用。

## 快速开始

最简单的错误处理方式是使用 error 抛出错误，用 pcall 捕获：

```lua
-- 定义一个可能出错的函数
local function divide(a, b)
    if b == 0 then
        error("除数不能为零")
    end
    return a / b
end

-- 使用 pcall 安全调用
local ok, result = pcall(divide, 10, 2)
if ok then
    print("结果:", result)  -- 输出: 结果: 5
else
    print("错误:", result)
end

-- 触发错误的情况
local ok, err = pcall(divide, 10, 0)
if not ok then
    print("错误:", err)  -- 输出类似: stdin:3: 除数不能为零
end
```

使用 xpcall 获取完整的调用栈：

```lua
local function risky_operation()
    local t = {}
    t.field.subfield = "error"  -- t.field 是 nil，会抛出错误
end

-- xpcall 的错误处理函数会收到错误消息
local ok, result = xpcall(risky_operation, function(err)
    print("捕获到错误:", err)
    -- 返回完整的调用栈信息
    return debug.traceback("错误发生: " .. tostring(err), 2)
end)

if not ok then
    print("完整调用栈:")
    print(result)
end
```

## 详细用法

### error 函数与错误级别

error 函数的第二个参数控制错误消息中的位置信息：

```lua
-- 辅助函数：检查参数有效性
local function check_positive(value, name)
    if value <= 0 then
        -- 级别 2：让错误指向调用 check_positive 的位置，而非 check_positive 本身
        error(string.format("参数 %s 必须为正数，当前值: %d", name, value), 2)
    end
end

local function calculate_area(radius)
    check_positive(radius, "radius")  -- 如果 radius <= 0，错误消息会指向这一行
    return math.pi * radius * radius
end

local ok, err = pcall(calculate_area, -5)
if not ok then
    print(err)
    -- 输出类似: stdin:8: 参数 radius 必须为正数，当前值: -5
    -- 注意错误指向的是第 8 行（调用 check_positive 的位置），而非第 4 行
end
```

不同错误级别的效果：

```lua
local function level_demo()
    -- 级别 0：不添加任何位置信息
    error("级别0的消息", 0)
    -- 输出: 级别0的消息

    -- 级别 1（默认）：指向 error 调用的位置
    error("级别1的消息", 1)
    -- 输出: stdin:5: 级别1的消息

    -- 级别 2：指向调用 level_demo 的位置
    error("级别2的消息", 2)
    -- 输出: stdin:15: 级别2的消息
end
```

### pcall 的多种用法

pcall 可以传递任意数量的参数给被调用的函数：

```lua
-- pcall 会将第二个及之后的参数传递给函数
local function greet(name, greeting)
    if type(name) ~= "string" then
        error("name 必须是字符串")
    end
    return greeting .. ", " .. name .. "!"
end

-- 安全调用，传递两个参数
local ok, result = pcall(greet, "Lua", "你好")
if ok then
    print(result)  -- 输出: 你好, Lua!
end
```

pcall 可以捕获函数的多个返回值：

```lua
local function multi_return()
    return 1, 2, 3
end

local ok, a, b, c = pcall(multi_return)
if ok then
    print(a, b, c)  -- 输出: 1  2  3
end
```

pcall 与匿名函数配合使用，捕获代码块中的错误：

```lua
-- 使用匿名函数包裹可能出错的代码
local ok, err = pcall(function()
    local file = io.open("nonexistent.txt", "r")
    local content = file:read("*a")  -- file 是 nil，会抛出错误
    file:close()
end)

if not ok then
    print("文件读取失败:", err)
end
```

### xpcall 与错误处理函数

xpcall 的核心优势在于可以自定义错误处理逻辑：

```lua
-- 自定义错误处理函数
local function error_handler(err)
    -- 记录错误日志
    local log_file = io.open("error.log", "a")
    if log_file then
        log_file:write(os.date("[%Y-%m-%d %H:%M:%S] ") .. tostring(err) .. "\n")
        log_file:write(debug.traceback("", 2) .. "\n")
        log_file:close()
    end

    -- 返回格式化的错误信息
    return {
        message = tostring(err),
        traceback = debug.traceback("", 2),
        timestamp = os.time(),
    }
end

local function risky_function()
    local t = {}
    t.x.y = 1  -- 错误：t.x 是 nil
end

local ok, result = xpcall(risky_function, error_handler)
if not ok then
    print("错误消息:", result.message)
    print("发生时间:", os.date("%Y-%m-%d %H:%M:%S", result.timestamp))
end
```

Lua 5.2 及以上版本中，xpcall 也支持传递参数：

```lua
-- Lua 5.2+ 的 xpcall 语法
local function process(data, mode)
    if mode == "strict" and type(data) ~= "table" then
        error("严格模式下 data 必须是表")
    end
    return data
end

-- xpcall(f, err_handler, arg1, arg2, ...)
local ok, result = xpcall(process, debug.traceback, "not_a_table", "strict")
if not ok then
    print("处理失败:", result)
end
```

### assert 函数

assert 是 Lua 内置的断言函数，当条件为 nil 或 false 时抛出错误：

```lua
-- assert 检查条件，失败时抛出错误
local function read_config(path)
    -- 如果文件打开失败，assert 会抛出错误
    local file = assert(io.open(path, "r"), "无法打开配置文件: " .. path)
    local content = file:read("*a")
    file:close()
    return content
end

-- 安全调用
local ok, config = pcall(read_config, "config.lua")
if not ok then
    print("配置加载失败:", config)
    -- 使用默认配置
    config = "default_value = true"
end
```

assert 与 pcall 的组合使用：

```lua
-- 使用 assert 进行参数验证
local function create_user(name, age, email)
    assert(type(name) == "string" and #name > 0, "用户名不能为空")
    assert(type(age) == "number" and age > 0 and age < 150, "年龄必须在 1-149 之间")
    assert(email:match("[%w%.]+@[%w%.]+"), "邮箱格式无效")

    return {
        name = name,
        age = age,
        email = email,
    }
end

-- 安全创建用户
local ok, user = pcall(create_user, "张三", 25, "zhangsan@example.com")
if ok then
    print("用户创建成功:", user.name)
else
    print("用户创建失败:", user)
end
```

### 自定义错误类型

Lua 的 error 可以抛出任意类型的值，不仅仅是字符串。利用这一特性可以实现自定义错误类型：

```lua
-- 自定义错误对象
local function create_error(code, message, details)
    return {
        code = code,
        message = message,
        details = details or {},
        tostring = function(self)
            return string.format("[%d] %s", self.code, self.message)
        end,
    }
end

-- 使用自定义错误
local function validate_input(input)
    if type(input) ~= "table" then
        error(create_error(400, "输入必须是表类型", {received = type(input)}))
    end

    if not input.username then
        error(create_error(400, "缺少必填字段: username"))
    end

    if #input.username < 3 then
        error(create_error(400, "用户名长度不能少于3个字符", {username = input.username}))
    end

    return true
end

-- 捕获并处理自定义错误
local ok, result = xpcall(function()
    return validate_input({username = "ab"})
end, function(err)
    return err  -- 直接返回错误对象
end)

if not ok then
    if type(result) == "table" and result.code then
        print("错误码:", result.code)
        print("错误消息:", result.message)
        if result.details then
            for k, v in pairs(result.details) do
                print("  详情:", k, "=", v)
            end
        end
    else
        print("未知错误:", tostring(result))
    end
end
```

## 常见场景

### 文件操作错误处理

文件操作是最常见的需要错误处理的场景之一：

```lua
-- 安全的文件读取
local function safe_read_file(path)
    local file, open_err = io.open(path, "r")
    if not file then
        return nil, "文件打开失败: " .. (open_err or "未知错误")
    end

    local content, read_err = file:read("*a")
    file:close()

    if not content then
        return nil, "文件读取失败: " .. (read_err or "未知错误")
    end

    return content
end

-- 使用示例
local content, err = safe_read_file("data.txt")
if not content then
    print("读取失败:", err)
    content = ""  -- 使用默认值
end
print("文件内容长度:", #content)
```

### 网络请求错误处理

模拟网络请求中的错误处理模式：

```lua
-- 模拟 HTTP 请求
local function http_request(url, options)
    -- 模拟可能的错误
    if not url then
        error(create_error(400, "URL 不能为空"))
    end

    if not url:match("^https?://") then
        error(create_error(400, "URL 格式无效", {url = url}))
    end

    -- 模拟超时
    if url:match("timeout") then
        error(create_error(504, "请求超时"))
    end

    -- 模拟服务器错误
    if url:match("error500") then
        error(create_error(500, "服务器内部错误"))
    end

    return {status = 200, body = '{"ok": true}'}
end

-- 带重试的请求
local function request_with_retry(url, options, max_retries)
    max_retries = max_retries or 3
    local last_err

    for attempt = 1, max_retries do
        local ok, result = xpcall(function()
            return http_request(url, options)
        end, function(err)
            return err
        end)

        if ok then
            return result
        end

        last_err = result
        -- 仅对可重试的错误进行重试（5xx 错误和超时）
        if type(result) == "table" and result.code then
            if result.code >= 500 then
                print(string.format("第 %d 次请求失败: %s，正在重试...", attempt, result.message))
            else
                -- 4xx 错误不重试
                return nil, result
            end
        end
    end

    return nil, last_err
end

-- 使用示例
local result, err = request_with_retry("http://api.example.com/data", nil, 3)
if result then
    print("请求成功:", result.body)
else
    print("请求最终失败:", err.message or tostring(err))
end
```

### 配置解析错误处理

解析配置文件时的错误处理：

```lua
-- 安全解析配置
local function parse_config(config_text)
    if not config_text or #config_text == 0 then
        return nil, "配置内容为空"
    end

    local config = {}
    local line_num = 0

    for line in config_text:gmatch("[^\n]+") do
        line_num = line_num + 1
        line = line:match("^%s*(.-)%s*$")  -- 去除首尾空白

        -- 跳过空行和注释
        if line ~= "" and not line:match("^#") then
            local key, value = line:match("^(%S+)%s*=%s*(.+)$")
            if not key then
                return nil, string.format("第 %d 行格式错误: %s", line_num, line)
            end

            -- 尝试转换值类型
            if value == "true" then
                config[key] = true
            elseif value == "false" then
                config[key] = false
            elseif tonumber(value) then
                config[key] = tonumber(value)
            else
                config[key] = value
            end
        end
    end

    return config
end

-- 使用示例
local config_text = [[
host = 127.0.0.1
port = 8080
debug = true
max_connections = 100
]]

local config, err = parse_config(config_text)
if not config then
    print("配置解析失败:", err)
else
    print("配置加载成功:")
    for k, v in pairs(config) do
        print("  " .. k .. " = " .. tostring(v))
    end
end
```

## 注意事项与常见错误

**pcall 会吞掉错误类型信息**。如果 error 抛出的是一个表或其它复杂对象，pcall 返回的错误消息就是该对象本身。但如果在错误处理链中不小心对错误消息调用了 tostring，可能会丢失原始类型信息。建议在错误处理函数中检查错误消息的类型，分别处理字符串错误和自定义错误对象。

**xpcall 的错误处理函数中不能再抛出错误**。如果 xpcall 的错误处理函数本身抛出了错误，Lua 会用该新错误替换原始错误。这可能导致原始错误信息丢失。因此，错误处理函数应当尽量简单，避免可能出错的操作。

**assert 的第二个参数只在条件为假时使用**。assert(condition, message) 中，如果 condition 为真，message 不会被求值。但如果 message 是一个函数调用（如 assert(x, "错误: " .. expensive_call())），即使条件为真，expensive_call() 也会被执行。应使用条件表达式或将消息构造放在 assert 之前。

**错误消息不一定是字符串**。Lua 允许 error 抛出任何类型的值，包括数字、表、甚至函数。在处理 pcall 返回的错误时，务必检查其类型，不要假设它一定是字符串。使用 tostring 转换或检查 type(err) 是更安全的做法。

**避免在循环中频繁使用 pcall**。pcall 本身有一定的性能开销，因为它需要设置保护环境。如果在紧密循环中对每次迭代都使用 pcall，可能会显著影响性能。更好的做法是将整个循环包裹在一个 pcall 中，或者使用其他方式（如条件检查）来避免错误。

## 高级用法

### 错误处理中间件模式

实现类似中间件的错误处理链：

```lua
-- 错误处理中间件
local ErrorMiddleware = {}
ErrorMiddleware.__index = ErrorMiddleware

function ErrorMiddleware.new()
    local self = setmetatable({}, ErrorMiddleware)
    self.handlers = {}
    return self
end

-- 注册错误处理器
function ErrorMiddleware:register(handler)
    self.handlers[#self.handlers + 1] = handler
    return self
end

-- 执行处理链
function ErrorMiddleware:handle(err)
    for _, handler in ipairs(self.handlers) do
        local handled, result = handler(err)
        if handled then
            return result
        end
    end
    -- 没有处理器能处理该错误
    return nil, "未处理的错误: " .. tostring(err)
end

-- 使用示例
local middleware = ErrorMiddleware.new()

-- 注册验证错误处理器
middleware:register(function(err)
    if type(err) == "table" and err.code == 400 then
        print("[验证错误] " .. err.message)
        return true, {status = 400, error = err.message}
    end
    return false  -- 不处理此错误
end)

-- 注册权限错误处理器
middleware:register(function(err)
    if type(err) == "table" and err.code == 403 then
        print("[权限错误] " .. err.message)
        return true, {status = 403, error = err.message}
    end
    return false
end)

-- 注册通用错误处理器（兜底）
middleware:register(function(err)
    print("[未知错误] " .. tostring(err))
    return true, {status = 500, error = "内部服务器错误"}
end)

-- 在 xpcall 中使用
local ok, result = xpcall(function()
    error({code = 400, message = "参数无效"})
end, function(err) return err end)

if not ok then
    local response = middleware:handle(result)
    print("响应:", response.status, response.error)
end
```

### Result 模式（函数式错误处理）

借鉴 Rust 等语言的 Result 类型，实现函数式风格的错误处理：

```lua
-- Result 类型
local Result = {}
Result.__index = Result

-- 创建成功结果
function Result.ok(value)
    return setmetatable({
        is_ok = true,
        value = value,
    }, Result)
end

-- 创建失败结果
function Result.err(error_value)
    return setmetatable({
        is_ok = false,
        error = error_value,
    }, Result)
end

-- 从 pcall 结果创建 Result
function Result.from_pcall(ok, ...)
    if ok then
        return Result.ok(...)
    else
        return Result.err((...))
    end
end

-- 映射成功值
function Result:map(fn)
    if self.is_ok then
        return Result.ok(fn(self.value))
    end
    return self
end

-- 映射错误值
function Result:map_err(fn)
    if not self.is_ok then
        return Result.err(fn(self.error))
    end
    return self
end

-- 链式操作（flatMap）
function Result:and_then(fn)
    if self.is_ok then
        return fn(self.value)
    end
    return self
end

-- 提供默认值
function Result:unwrap_or(default)
    if self.is_ok then
        return self.value
    end
    return default
end

-- 获取值或抛出错误
function Result:unwrap()
    if self.is_ok then
        return self.value
    end
    error("对错误结果调用 unwrap: " .. tostring(self.error))
end

-- 使用示例
local function parse_int(str)
    local num = tonumber(str)
    if num and math.floor(num) == num then
        return Result.ok(num)
    end
    return Result.err("无法解析为整数: " .. tostring(str))
end

local function safe_divide(a, b)
    if b == 0 then
        return Result.err("除数不能为零")
    end
    return Result.ok(a / b)
end

-- 链式调用
local result = parse_int("42")
    :and_then(function(n) return safe_divide(n, 2) end)
    :map(function(v) return v * 10 end)

if result.is_ok then
    print("计算结果:", result.value)  -- 输出: 计算结果: 210
else
    print("计算失败:", result.error)
end

-- 错误链
local err_result = parse_int("abc")
    :and_then(function(n) return safe_divide(n, 0) end)

print("是否成功:", err_result.is_ok)  -- 输出: false
print("错误信息:", err_result.error)  -- 输出: 无法解析为整数: abc
```

### 协程中的错误处理

协程的错误处理需要特别注意，因为协程内部的错误不会自动传播到外部：

```lua
-- 安全的协程包装器
local function safe_coroutine_create(fn)
    local co = coroutine.create(function(...)
        -- 在协程内部捕获错误
        local ok, result = xpcall(fn, function(err)
            return {
                error = err,
                traceback = debug.traceback("", 2),
            }
        end, ...)

        if ok then
            return true, result
        else
            return false, result
        end
    end)

    return co
end

-- 安全恢复协程
local function safe_coroutine_resume(co, ...)
    local ok, success, result = coroutine.resume(co, ...)

    if not ok then
        -- resume 本身失败（极少发生）
        return false, {error = result, traceback = "coroutine resume failed"}
    end

    if success then
        return true, result
    else
        -- 协程内部出错
        return false, result
    end
end

-- 使用示例
local co = safe_coroutine_create(function(a, b)
    if b == 0 then
        error("除数不能为零")
    end
    return a / b
end)

local ok, result = safe_coroutine_resume(co, 10, 0)
if not ok then
    print("协程执行失败:", result.error)
    print("调用栈:", result.traceback)
end
```

### finally 模式

Lua 没有内置的 finally 语法，但可以通过模式模拟：

```lua
-- 模拟 try-finally 模式
local function try_finally(try_fn, finally_fn)
    local ok, result = xpcall(try_fn, function(err)
        return err
    end)

    -- 无论成功还是失败，都执行 finally
    finally_fn()

    if ok then
        return result
    else
        -- 重新抛出错误
        error(result)
    end
end

-- 使用示例
local function process_file(path)
    local file

    try_finally(function()
        file = assert(io.open(path, "r"))
        local content = file:read("*a")
        print("文件内容长度:", #content)
    end, function()
        -- 确保文件句柄被关闭
        if file then
            file:close()
            print("文件已关闭")
        end
    end)
end

-- 安全调用
local ok, err = pcall(process_file, "test.txt")
if not ok then
    print("处理失败:", err)
end
```

### 带上下文的错误信息

为错误添加丰富的上下文信息，便于排查问题：

```lua
-- 带上下文的错误构造器
local function context_error(message, context)
    local err = {
        message = message,
        context = context or {},
        timestamp = os.time(),
        traceback = debug.traceback("", 2),
    }

    -- 设置元表以支持 tostring
    setmetatable(err, {
        __tostring = function(self)
            local parts = {self.message}
            if next(self.context) then
                parts[#parts + 1] = "上下文信息:"
                for k, v in pairs(self.context) do
                    parts[#parts + 1] = string.format("  %s = %s", k, tostring(v))
                end
            end
            return table.concat(parts, "\n")
        end,
    })

    return err
end

-- 使用示例
local function query_database(sql, params)
    if not sql or #sql == 0 then
        error(context_error("SQL 语句不能为空", {
            sql = sql,
            params = params,
            operation = "query_database",
        }), 2)
    end

    -- 模拟查询
    return {{id = 1, name = "test"}}
end

local ok, result = xpcall(function()
    return query_database("", {})
end, function(err) return err end)

if not ok then
    print("数据库查询失败:")
    print(result)
    -- 输出:
    -- SQL 语句不能为空
    -- 上下文信息:
    --   sql =
    --   params = table: 0x...
    --   operation = query_database
end
```
