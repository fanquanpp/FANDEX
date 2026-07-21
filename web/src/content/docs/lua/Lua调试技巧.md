---
order: 65
title: Lua调试技巧
module: lua
category: Lua
difficulty: intermediate
description: 调试与性能分析
author: fanquanpp
updated: '2026-06-14'
related:
  - 'lua/Lua与World of Warcraft'
  - lua/Lua性能优化
  - lua/协程与异步
  - lua/标准库详解
prerequisites:
  - lua/概述与环境配置
---

## 概述

调试是软件开发中不可或缺的环节。Lua 作为一门嵌入式脚本语言，其调试方式与编译型语言有所不同。Lua 提供了内置的 debug 库，支持运行时检查调用栈、查看局部变量、设置钩子函数等功能。掌握这些调试技巧，能够帮助开发者快速定位问题、分析性能瓶颈，提升开发效率。

Lua 的调试体系可以分为三个层次：最基础的是使用 print 语句进行简单的输出调试；进阶的是利用 debug 库获取运行时信息，如调用栈、变量值等；高级的则是使用专业调试器（如 MobDebug、ZeroBrane Studio 调试器）进行断点调试和单步执行。此外，性能分析也是调试的重要组成部分，通过测量代码执行时间、分析内存占用，可以找到程序的性能瓶颈。

## 基本概念

**debug 库**是 Lua 内置的调试工具库，提供了一系列函数用于在运行时检查和操控程序的执行状态。它主要分为两类函数：一类是用于获取信息的自省函数（introspective functions），如 debug.getinfo、debug.getlocal 等；另一类是用于修改状态的钩子函数（hook functions），如 debug.sethook、debug.setlocal 等。

**调用栈**是程序执行过程中函数调用的链式记录。每当一个函数被调用时，Lua 会创建一个新的栈帧（stack frame）压入调用栈，函数返回时弹出。通过遍历调用栈，可以了解程序的执行路径和当前上下文。

**钩子机制**允许在程序执行到特定事件时自动触发回调函数。Lua 支持三种钩子事件：行事件（line，每执行一行代码触发）、调用事件（call，函数被调用时触发）、返回事件（return，函数返回时触发）。通过组合这些事件，可以实现断点、单步执行等调试功能。

**性能分析**通过测量代码片段的执行时间和资源消耗来定位性能瓶颈。Lua 中常用的性能分析手段包括 os.clock 计时、debug.sethook 统计函数调用次数、以及专门的性能分析工具。

## 快速开始

最简单的调试方式是使用 print 语句输出变量值：

```lua
-- 最基础的调试：打印变量值
local name = "Lua"
local version = 5.4
print("调试信息: name=" .. name .. ", version=" .. version)
```

使用 debug.traceback 获取调用栈信息：

```lua
-- 当程序出错时，打印调用栈
local function inner()
    debug.traceback()  -- 仅获取调用栈，不中断执行
end

local function middle()
    inner()
end

local function outer()
    middle()
end

outer()
-- 输出类似：
-- stack traceback:
--   stdin:2: in function 'inner'
--   stdin:6: in function 'middle'
--   stdin:10: in function 'outer'
--   stdin:13: in main chunk
```

使用 pcall 捕获错误并打印调用栈：

```lua
-- 安全调用并捕获完整错误信息
local ok, err = pcall(function()
    local t = {}
    t.field.subfield = "error"  -- t.field 是 nil，会抛出错误
end)

if not ok then
    print("捕获到错误:")
    print(err)
    -- 输出: stdin:2: attempt to index a nil value (field 'field')
end
```

## 详细用法

### debug.getinfo 获取函数信息

debug.getinfo 可以获取函数或调用栈帧的详细信息：

```lua
-- 获取当前函数的信息
local function my_function(a, b)
    local info = debug.getinfo(1)  -- 1 表示当前栈帧
    print("函数名:", info.name)
    print("源文件:", info.source)
    print("行号:", info.currentline)
    print("是否 Lua 函数:", info.what == "Lua")
    print("参数数量:", info.nparams)
    print("是否有可变参数:", info.isvararg)
end

my_function(1, 2)
```

获取调用者的信息：

```lua
local function callee()
    -- 0 代表 getinfo 自身，1 代表 callee，2 代表调用者
    local caller_info = debug.getinfo(2)
    if caller_info then
        print("调用者函数名:", caller_info.name or "(匿名)")
        print("调用者源文件:", caller_info.short_src)
        print("调用者行号:", caller_info.linedefined)
    end
end

local function caller()
    callee()
end

caller()
-- 输出: 调用者函数名: caller
--       调用者源文件: stdin
--       调用者行号: 10
```

指定需要获取的字段，减少开销：

```lua
-- 只获取需要的字段，提高效率
local info = debug.getinfo(1, "Sl")  -- S=源信息, l=当前行
print("源文件:", info.short_src)
print("当前行:", info.currentline)
```

### debug.getlocal 和 debug.setlocal 查看与修改局部变量

```lua
local function inspect_locals(level)
    level = level or 2  -- 默认查看调用者的局部变量
    local i = 1
    while true do
        local name, value = debug.getlocal(level, i)
        if not name then
            break
        end
        -- 以 (*) 开头的是内部临时变量，通常跳过
        if name:sub(1, 1) ~= "(" then
            print(string.format("  局部变量: %s = %s", name, tostring(value)))
        end
        i = i + 1
    end
end

local function example()
    local x = 42
    local y = "hello"
    local z = {1, 2, 3}
    print("example 函数的局部变量:")
    inspect_locals(1)  -- 查看当前函数的局部变量
end

example()
-- 输出:
--   局部变量: x = 42
--   局部变量: y = hello
--   局部变量: z = table: 0x...
```

修改局部变量的值：

```lua
local function modify_local()
    local count = 10
    print("修改前: count =", count)

    -- 在调用者的栈帧中修改局部变量
    -- debug.setlocal(栈层级, 变量索引, 新值)
    debug.setlocal(1, 1, 999)

    print("修改后: count =", count)  -- 输出: 修改后: count = 999
end

modify_local()
```

### debug.sethook 设置钩子函数

钩子函数是 Lua 调试的核心机制，可以实现断点、单步执行等功能：

```lua
-- 行计数器：统计每行代码执行的次数
local line_counts = {}

debug.sethook(function(event, line)
    if event == "line" then
        line_counts[line] = (line_counts[line] or 0) + 1
    end
end, "l")  -- "l" 表示监听行事件

-- 执行被分析的代码
for i = 1, 10 do
    local x = i * 2
end

-- 关闭钩子
debug.sethook()

-- 打印热点行
for line, count in pairs(line_counts) do
    if count > 1 then
        print(string.format("行 %d 执行了 %d 次", line, count))
    end
end
```

实现简单的断点功能：

```lua
-- 简单断点调试器
local breakpoints = {}  -- 存储断点：行号 -> true

-- 设置断点
local function set_breakpoint(line)
    breakpoints[line] = true
end

-- 断点钩子
local function breakpoint_hook(event, line)
    if event == "line" and breakpoints[line] then
        print(string.format("命中断点: 行 %d", line))

        -- 打印当前栈帧的局部变量
        local i = 1
        while true do
            local name, value = debug.getlocal(2, i)
            if not name then break end
            if name:sub(1, 1) ~= "(" then
                print(string.format("  %s = %s", name, tostring(value)))
            end
            i = i + 1
        end
    end
end

-- 启用断点调试
debug.sethook(breakpoint_hook, "l")

-- 设置断点
set_breakpoint(42)  -- 在第 42 行设置断点

-- 执行代码...
-- 到达第 42 行时会自动暂停并打印变量信息

-- 关闭调试
debug.sethook()
```

跟踪函数调用和返回：

```lua
-- 函数调用追踪器
local indent = 0

local function trace_hook(event)
    if event == "call" then
        local info = debug.getinfo(2, "n")
        local name = info.name or "(匿名函数)"
        print(string.rep("  ", indent) .. "调用: " .. name)
        indent = indent + 1
    elseif event == "return" then
        indent = indent - 1
        if indent < 0 then indent = 0 end
        local info = debug.getinfo(2, "n")
        local name = info.name or "(匿名函数)"
        print(string.rep("  ", indent) .. "返回: " .. name)
    end
end

debug.sethook(trace_hook, "cr")  -- "c"=调用事件, "r"=返回事件

-- 测试代码
local function add(a, b) return a + b end
local function multiply(a, b) return a * b end
local result = add(multiply(2, 3), 4)

debug.sethook()
-- 输出:
--   调用: multiply
--     调用: add
--     返回: add
--   返回: multiply
```

### debug.getupvalue 和 debug.setupvalue 查看与修改上值

上值（upvalue）是闭包中捕获的外部变量：

```lua
local function create_counter()
    local count = 0  -- 这是一个上值
    return function()
        count = count + 1
        return count
    end
end

local counter = create_counter()
counter()  -- 返回 1
counter()  -- 返回 2

-- 查看闭包的上值
local i = 1
while true do
    local name, value = debug.getupvalue(counter, i)
    if not name then break end
    print(string.format("上值 %d: %s = %s", i, name, tostring(value)))
    i = i + 1
end
-- 输出: 上值 1: count = 2

-- 修改上值，重置计数器
debug.setupvalue(counter, 1, 0)
print(counter())  -- 输出: 1（从 0 重新开始计数）
```

### 性能计时与基准测试

使用 os.clock 进行精确计时：

```lua
-- 测量代码执行时间
local function benchmark(name, func, iterations)
    iterations = iterations or 1

    -- 强制 JIT 预热（如果使用 LuaJIT）
    func()

    local start = os.clock()
    for i = 1, iterations do
        func()
    end
    local elapsed = os.clock() - start

    print(string.format("[%s] %d 次迭代，总耗时: %.4f 秒，平均: %.6f 秒/次",
        name, iterations, elapsed, elapsed / iterations))
end

-- 对比不同实现
benchmark("字符串拼接 ..", function()
    local s = ""
    for i = 1, 1000 do
        s = s .. "x"
    end
end, 100)

benchmark("table.concat", function()
    local t = {}
    for i = 1, 1000 do
        t[i] = "x"
    end
    local s = table.concat(t)
end, 100)
```

使用 debug.sethook 进行函数级性能分析：

```lua
-- 简易性能分析器
local func_stats = {}  -- 函数名 -> {count, total_time}
local call_stack = {}
local start_times = {}

local function profiler_hook(event)
    local info = debug.getinfo(2, "nS")
    local name = info.name or info.short_src .. ":" .. info.linedefined

    if event == "call" then
        -- 记录函数调用开始时间
        call_stack[#call_stack + 1] = name
        start_times[name] = os.clock()
    elseif event == "return" then
        local elapsed = os.clock() - (start_times[name] or 0)

        -- 更新统计信息
        if not func_stats[name] then
            func_stats[name] = {count = 0, total_time = 0}
        end
        func_stats[name].count = func_stats[name].count + 1
        func_stats[name].total_time = func_stats[name].total_time + elapsed

        call_stack[#call_stack] = nil
    end
end

-- 启动性能分析
debug.sethook(profiler_hook, "cr")

-- 执行被分析的代码
-- ...（此处放置需要分析的代码）

-- 停止性能分析
debug.sethook()

-- 打印分析结果
print("\n性能分析结果:")
print(string.format("%-30s %8s %12s %12s", "函数", "调用次数", "总耗时(秒)", "平均耗时(秒)"))
for name, stats in pairs(func_stats) do
    print(string.format("%-30s %8d %12.4f %12.6f",
        name, stats.count, stats.total_time, stats.total_time / stats.count))
end
```

## 常见场景

### 调试表结构

递归打印表的内容，方便检查复杂数据结构：

```lua
-- 递归打印表结构
local function dump_table(t, indent, max_depth)
    indent = indent or 0
    max_depth = max_depth or 5

    if indent >= max_depth then
        print(string.rep("  ", indent) .. "...")
        return
    end

    for k, v in pairs(t) do
        local key_str = type(k) == "string" and k or tostring(k)
        if type(v) == "table" then
            print(string.rep("  ", indent) .. key_str .. " = {")
            dump_table(v, indent + 1, max_depth)
            print(string.rep("  ", indent) .. "}")
        else
            print(string.rep("  ", indent) .. key_str .. " = " .. tostring(v))
        end
    end
end

-- 使用示例
local config = {
    server = {
        host = "127.0.0.1",
        port = 8080,
    },
    database = {
        name = "myapp",
        pool_size = 10,
    },
    debug = true,
}

dump_table(config)
-- 输出:
-- server = {
--   host = 127.0.0.1
--   port = 8080
-- }
-- database = {
--   name = myapp
--   pool_size = 10
-- }
-- debug = true
```

### 检测全局变量泄漏

Lua 中全局变量泄漏是常见的 bug 来源，可以通过 debug 库检测：

```lua
-- 全局变量监控器
local saved_globals = {}

local function snapshot_globals()
    local snapshot = {}
    for k, v in pairs(_G) do
        snapshot[k] = true
    end
    return snapshot
end

-- 保存初始全局变量表
saved_globals = snapshot_globals()

local function check_new_globals()
    local new_vars = {}
    for k, v in pairs(_G) do
        if not saved_globals[k] then
            new_vars[#new_vars + 1] = k
        end
    end

    if #new_vars > 0 then
        print("检测到新增全局变量:")
        for _, name in ipairs(new_vars) do
            print("  " .. name .. " = " .. tostring(_G[name]))
        end
    else
        print("未检测到新增全局变量")
    end
end

-- 模拟代码执行（可能意外创建全局变量）
function some_function()
    -- 忘记写 local，导致 x 成为全局变量
    x = 42
end

some_function()
check_new_globals()
-- 输出: 检测到新增全局变量:
--       x = 42
```

### 条件断点

实现只在特定条件满足时才触发的断点：

```lua
-- 条件断点调试器
local conditional_breakpoints = {}

local function set_conditional_breakpoint(line, condition_func)
    conditional_breakpoints[line] = condition_func
end

local function conditional_hook(event, line)
    if event == "line" and conditional_breakpoints[line] then
        local condition = conditional_breakpoints[line]
        if condition() then
            print(string.format("条件断点命中: 行 %d", line))
            -- 打印调用栈
            print(debug.traceback("", 2))
        end
    end
end

debug.sethook(conditional_hook, "l")

-- 示例：只在 i > 50 时触发断点
set_conditional_breakpoint(25, function()
    local i = 1
    local name, value = debug.getlocal(2, i)
    while name do
        if name == "i" then return value > 50 end
        i = i + 1
        name, value = debug.getlocal(2, i)
    end
    return false
end)

-- 执行循环，只有 i > 50 时才会触发断点
for i = 1, 100 do
    local x = i * 2  -- 第 25 行（假设）
end

debug.sethook()
```

## 注意事项与常见错误

**debug 库的性能开销很大**。特别是 debug.sethook 设置行钩子时，每执行一行代码都会触发一次回调，可能导致程序运行速度降低数十倍甚至上百倍。因此，调试钩子只应在开发阶段使用，生产环境务必关闭所有调试钩子。

**debug.getlocal 无法获取上值**。局部变量和上值是不同的概念。局部变量存在于函数的栈帧中，通过 debug.getlocal 访问；上值是闭包捕获的外部变量，通过 debug.getupvalue 访问。混淆两者是初学者常见的错误。

**钩子函数中避免复杂操作**。在 debug.sethook 的回调函数中，应尽量保持逻辑简单。如果在钩子函数中执行复杂操作（如网络请求、文件 I/O），可能导致无限递归或不可预期的行为。特别是不要在钩子函数中调用可能触发其他钩子的函数。

**栈层级从 1 开始计数**。debug.getinfo 和 debug.getlocal 的第一个参数是栈层级，其中 1 代表当前函数（即调用 debug 函数的函数），2 代表调用者的调用者，以此类推。传入 0 或负数没有意义，会返回 nil。

**os.clock 测量的是 CPU 时间**。os.clock 返回的是程序使用的 CPU 时间，而非墙上时钟时间。如果程序中有睡眠操作（如 os.execute("sleep 1")），os.clock 不会计入睡眠时间。如果需要测量实际经过的时间，应使用 os.time 或 LuaJIT 的 ffi 调用系统高精度计时器。

## 高级用法

### 自定义 print 调试器

实现一个增强版的 print 调试器，自动附带调用位置信息：

```lua
-- 增强版调试打印
local function dprint(...)
    local info = debug.getinfo(2, "Sl")
    local prefix = string.format("[%s:%d]", info.short_src, info.currentline)

    -- 收集所有参数
    local args = {...}
    local parts = {}
    for i, arg in ipairs(args) do
        parts[i] = tostring(arg)
    end

    print(prefix .. " " .. table.concat(parts, "\t"))
end

-- 使用示例
local function calculate_area(radius)
    local area = math.pi * radius * radius
    dprint("半径:", radius, "面积:", area)
    return area
end

calculate_area(5)
-- 输出: [stdin:7] 半径: 5  面积: 78.539816339745
```

### 远程调试协议

实现一个简单的远程调试协议，允许从外部控制 Lua 程序的执行：

```lua
-- 简易远程调试服务端
local function create_debug_server(port)
    local socket = require("socket")  -- 需要 LuaSocket
    local server = socket.tcp()
    server:bind("*", port)
    server:listen(1)

    local breakpoints = {}
    local client = nil

    -- 等待调试器客户端连接
    local function wait_for_client()
        print("调试服务器等待连接，端口: " .. port)
        client = server:accept()
        client:settimeout(0)  -- 非阻塞模式
        print("调试器已连接")
    end

    -- 处理调试器命令
    local function handle_command(cmd)
        if cmd:match("^break%s+(%d+)$") then
            local line = tonumber(cmd:match("(%d+)"))
            breakpoints[line] = true
            client:send("断点已设置: 行 " .. line .. "\n")
        elseif cmd:match("^clear%s+(%d+)$") then
            local line = tonumber(cmd:match("(%d+)"))
            breakpoints[line] = nil
            client:send("断点已清除: 行 " .. line .. "\n")
        elseif cmd == "stack" then
            client:send(debug.traceback("", 2) .. "\n")
        elseif cmd == "continue" then
            client:send("继续执行\n")
        end
    end

    -- 调试钩子
    local function debug_hook(event, line)
        if event == "line" and breakpoints[line] then
            client:send(string.format("断点命中: 行 %d\n", line))
            client:send(debug.traceback("", 2) .. "\n")

            -- 进入交互模式，等待调试器命令
            client:settimeout(nil)  -- 阻塞模式
            while true do
                local cmd, err = client:receive()
                if not cmd then break end
                if cmd == "continue" then
                    client:settimeout(0)
                    break
                end
                handle_command(cmd)
            end
        end
    end

    -- 启动调试
    wait_for_client()
    debug.sethook(debug_hook, "l")

    return {
        stop = function()
            debug.sethook()
            if client then client:close() end
            server:close()
        end
    }
end
```

### 内存泄漏检测

通过定期检查全局表和注册表来检测内存泄漏：

```lua
-- 内存监控工具
local memory_monitor = {
    snapshots = {},
}

-- 获取当前内存使用量（KB）
function memory_monitor.current_usage()
    return collectgarbage("count")
end

-- 拍摄内存快照
function memory_monitor.take_snapshot(label)
    collectgarbage("collect")  -- 先执行完整 GC
    local usage = collectgarbage("count")

    -- 统计全局表中的对象数量
    local global_count = 0
    for _ in pairs(_G) do global_count = global_count + 1 end

    memory_monitor.snapshots[#memory_monitor.snapshots + 1] = {
        label = label,
        memory_kb = usage,
        global_count = global_count,
        timestamp = os.time(),
    }

    print(string.format("[内存快照] %s: %.1f KB, 全局变量数: %d",
        label, usage, global_count))
end

-- 对比两个快照
function memory_monitor.compare(label1, label2)
    local s1, s2
    for _, s in ipairs(memory_monitor.snapshots) do
        if s.label == label1 then s1 = s end
        if s.label == label2 then s2 = s end
    end

    if not s1 or not s2 then
        print("未找到指定的快照")
        return
    end

    local diff = s2.memory_kb - s1.memory_kb
    local global_diff = s2.global_count - s1.global_count
    print(string.format("内存变化: %+.1f KB (%s -> %s)", diff, label1, label2))
    print(string.format("全局变量变化: %+d", global_diff))
end

-- 使用示例
memory_monitor.take_snapshot("初始化")

-- 执行一些操作
local cache = {}
for i = 1, 10000 do
    cache[i] = string.rep("x", 100)
end

memory_monitor.take_snapshot("创建缓存后")
memory_monitor.compare("初始化", "创建缓存后")

-- 清理缓存
cache = nil
collectgarbage("collect")
memory_monitor.take_snapshot("清理缓存后")
memory_monitor.compare("创建缓存后", "清理缓存后")
```

### 与 ZeroBrane Studio 集成

ZeroBrane Studio 是一个集成了调试器的 Lua IDE，支持 MobDebug 远程调试协议：

```lua
-- 在代码中嵌入 MobDebug 调试器
local mobdebug = require("mobdebug")
mobdebug.start()  -- 启动调试器，连接到 ZeroBrane Studio

-- 设置断点
mobdebug.pause()  -- 在此处暂停执行

-- 执行业务代码
local function process_data(data)
    mobdebug.pause()  -- 在此处设置断点
    local result = {}
    for i, item in ipairs(data) do
        result[i] = item * 2
    end
    return result
end

local data = {1, 2, 3, 4, 5}
local result = process_data(data)

mobdebug.done()  -- 结束调试会话
```

在 ZeroBrane Studio 中，可以设置断点、单步执行、查看变量值、评估表达式，提供了完整的图形化调试体验。对于复杂的 Lua 项目，使用专业调试器比 print 调试效率更高。
