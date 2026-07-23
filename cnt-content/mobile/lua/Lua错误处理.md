# Lua 错误处理速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## error 函数

**基本写法：error 抛出错误**
`error("<message>")`
```lua
-- 抛出错误
error("发生错误")
```

**基本写法：error 带错误级别**
`error("<message>", <level>)`
```lua
-- 指定错误级别（1=调用位置，2=调用者的调用位置）
error("参数错误", 2)
```

**基本写法：error 抛出表**
`error({code = <code>, message = "<msg>"})`
```lua
-- 抛出表作为错误对象
error({code = 404, message = "Not Found"})
```

---

## pcall 错误捕获

**基本写法：pcall 保护调用**
`pcall(<function>, <args>)`
```lua
-- pcall 保护调用函数
local ok, result = pcall(function()
    return 10 / 0
end)
if not ok then
    print("错误: " .. result)
end
```

**基本写法：pcall 带参数**
`pcall(<function>, <arg1>, <arg2>)`
```lua
-- pcall 传递参数给函数
local function divide(a, b)
    if b == 0 then error("除零错误") end
    return a / b
end
local ok, result = pcall(divide, 10, 0)
```

**基本写法：pcall 多返回值**
`local <ok>, <r1>, <r2> = pcall(<function>, <args>)`
```lua
-- pcall 捕获多返回值
local function getCoords()
    return 10, 20
end
local ok, x, y = pcall(getCoords)
```

**基本写法：pcall 错误处理**
`if not <ok> then <body> end`
```lua
-- pcall 错误处理
local ok, err = pcall(function()
    error("处理失败")
end)
if not ok then
    print("捕获错误: " .. err)
end
```

---

## xpcall 错误捕获

**基本写法：xpcall 带错误处理函数**
`xpcall(<function>, <handler>)`
```lua
-- xpcall 带错误处理函数
local function errorHandler(err)
    print("错误: " .. err)
    return "处理后"
end
local ok, result = xpcall(function()
    error("发生错误")
end, errorHandler)
```

**基本写法：xpcall 带参数**
`xpcall(<function>, <handler>, <arg>)`
```lua
-- xpcall 传递参数给函数
local function process(data)
    if not data then error("数据为空") end
    return data
end
local ok, result = xpcall(process, errorHandler, "Hello")
```

**基本写法：xpcall 多参数**
`xpcall(<function>, <handler>, <arg1>, <arg2>)`
```lua
-- xpcall 传递多个参数
local function add(a, b)
    if type(a) ~= "number" then error("参数类型错误") end
    return a + b
end
local ok, result = xpcall(add, errorHandler, 10, 20)
```

---

## assert 断言

**基本写法：assert 基本断言**
`assert(<condition>)`
```lua
-- assert 断言条件为真
assert(x > 0)
```

**基本写法：assert 带错误消息**
`assert(<condition>, "<message>")`
```lua
-- assert 带自定义错误消息
assert(x > 0, "x 必须大于 0")
```

**基本写法：assert 检查返回值**
`local <result> = assert(<func>(<args>))`
```lua
-- assert 检查函数返回值
local file = assert(io.open("test.txt", "r"))
```

**基本写法：assert 带格式化消息**
`assert(<condition>, string.format("<format>", <args>))`
```lua
-- assert 带格式化错误消息
assert(age >= 18, string.format("年龄 %d 不满足要求", age))
```

---

## 错误对象

**基本写法：错误对象表**
`error({code = <code>, message = "<msg>"})`
```lua
-- 错误对象表
local function createError(code, message)
    return {code = code, message = message}
end
error(createError(500, "服务器错误"))
```

**基本写法：错误对象处理**
`if type(<err>) == "table" then <body> end`
```lua
-- 处理错误对象
local ok, err = pcall(function()
    error({code = 404, message = "Not Found"})
end)
if not ok and type(err) == "table" then
    print("错误码: " .. err.code)
    print("错误信息: " .. err.message)
end
```

---

## 错误传播

**基本写法：函数内错误传播**
`if <cond> then error("<msg>") end`
```lua
-- 函数内检查并抛出错误
local function process(data)
    if not data then
        error("数据不能为空")
    end
    return data.value
end
```

**基本写法：嵌套错误捕获**
`local <ok>, <err> = pcall(function() <body with nested pcall> end)`
```lua
-- 嵌套错误捕获
local function outerFunc()
    local ok, err = pcall(function()
        error("内部错误")
    end)
    if not ok then
        error("外部错误: " .. err)
    end
end
local ok, err = pcall(outerFunc)
```

---

## finally 模拟

**基本写法：finally 模拟**
`local <ok>, <err> = pcall(<function>); <cleanup>; if not <ok> then error(<err>) end`
```lua
-- 模拟 finally 清理
local function withCleanup(func, cleanup)
    local ok, err = pcall(func)
    cleanup()
    if not ok then
        error(err)
    end
end
```

**基本写法：资源清理**
`local <ok>, <err> = pcall(<function>); <resource>:close(); if not <ok> then error(<err>) end`
```lua
-- 资源清理模式
local function processFile(filename)
    local file = io.open(filename, "r")
    if not file then error("无法打开文件") end
    local ok, err = pcall(function()
        return file:read("*a")
    end)
    file:close()
    if not ok then error(err) end
end
```

---

## 错误处理模式

**基本写法：返回错误模式**
`local function <name>(<params>) if <cond> then return nil, "<error>" end return <result> end`
```lua
-- 返回 nil 和错误信息
local function divide(a, b)
    if b == 0 then
        return nil, "除零错误"
    end
    return a / b
end
local result, err = divide(10, 0)
```

**基本写法：错误码模式**
`local function <name>(<params>) if <cond> then return false, <code> end return true, <result> end`
```lua
-- 返回成功状态和错误码
local function validate(data)
    if not data then
        return false, 1
    end
    if #data == 0 then
        return false, 2
    end
    return true, data
end
```

**基本写法：Result 模式**
`local function <name>(<params>) return {ok = <bool>, value = <value>, err = <err>} end`
```lua
-- Result 对象模式
local function safeDivide(a, b)
    if b == 0 then
        return {ok = false, err = "除零错误"}
    end
    return {ok = true, value = a / b}
end
```

---

## 错误日志

**基本写法：错误日志记录**
`local function <logError>(<err>) <body> end`
```lua
-- 错误日志记录函数
local function logError(err)
    local log = io.open("error.log", "a")
    if log then
        log:write(os.date("%Y-%m-%d %H:%M:%S") .. " - " .. tostring(err) .. "\n")
        log:close()
    end
end
```

**基本写法：pcall 与日志结合**
`local <ok>, <err> = pcall(<function>); if not <ok> then <logError>(<err>) end`
```lua
-- pcall 与日志结合
local ok, err = pcall(function()
    error("处理失败")
end)
if not ok then
    logError(err)
end
```

---

## debug 追踪

**基本写法：debug.traceback 获取堆栈**
`debug.traceback("<message>")`
```lua
-- 获取错误堆栈追踪
local function funcA()
    error("错误发生")
end
local function funcB()
    funcA()
end
local ok, err = pcall(funcB)
print(debug.traceback(err))
```

**基本写法：xpcall 中获取堆栈**
`xpcall(<function>, function(<err>) return debug.traceback(<err>) end)`
```lua
-- xpcall 中获取堆栈追踪
local ok, err = xpcall(function()
    error("错误")
end, function(err)
    return debug.traceback(err, 2)
end)
```

**基本写法：debug.getinfo 获取函数信息**
`debug.getinfo(<function>)`
```lua
-- 获取函数信息
local function testFunc() end
local info = debug.getinfo(testFunc)
print(info.name, info.source, info.linedefined)
```

---

## 错误处理实战

**基本写法：安全调用**
`local function <safeCall>(<func>, <args>) <body> end`
```lua
-- 安全调用函数
local function safeCall(func, ...)
    local ok, result = pcall(func, ...)
    if not ok then
        print("调用失败: " .. tostring(result))
        return nil
    end
    return result
end
```

**基本写法：重试机制**
`local function <retry>(<func>, <times>) <body> end`
```lua
-- 重试机制
local function retry(func, times)
    local ok, err
    for i = 1, times do
        ok, err = pcall(func)
        if ok then return err end
    end
    return nil, err
end
```

**基本写法：错误链**
`local function <chain>(<funcs>) <body> end`
```lua
-- 错误链处理
local function chain(funcs)
    for _, func in ipairs(funcs) do
        local ok, err = pcall(func)
        if not ok then
            return nil, err
        end
    end
    return true
end
```
