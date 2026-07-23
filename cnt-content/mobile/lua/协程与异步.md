# Lua 协程与异步速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 协程创建

**基本写法：coroutine.create 创建协程**
`coroutine.create(<function>)`
```lua
-- 创建协程
local co = coroutine.create(function()
    print("协程开始")
    coroutine.yield()
    print("协程恢复")
end)
```

**基本写法：coroutine.wrap 创建协程**
`coroutine.wrap(<function>)`
```lua
-- 创建协程（返回函数）
local co = coroutine.wrap(function()
    print("协程开始")
    coroutine.yield()
    print("协程恢复")
end)
```

---

## 协程控制

**基本写法：coroutine.resume 恢复协程**
`coroutine.resume(<coroutine>)`
```lua
-- 恢复协程执行
local co = coroutine.create(function()
    print("Hello")
    coroutine.yield()
    print("World")
end)
coroutine.resume(co)
coroutine.resume(co)
```

**基本写法：coroutine.yield 挂起协程**
`coroutine.yield(<value>)`
```lua
-- 挂起协程并返回值
local co = coroutine.create(function()
    coroutine.yield("第一个值")
    coroutine.yield("第二个值")
end)
local _, v1 = coroutine.resume(co)
local _, v2 = coroutine.resume(co)
```

**基本写法：coroutine.status 获取状态**
`coroutine.status(<coroutine>)`
```lua
-- 获取协程状态
local co = coroutine.create(function()
    coroutine.yield()
end)
print(coroutine.status(co))
coroutine.resume(co)
print(coroutine.status(co))
```

**基本写法：coroutine.wrap 调用**
`<wrapped>()`
```lua
-- wrap 创建的协程直接调用
local co = coroutine.wrap(function()
    coroutine.yield("A")
    coroutine.yield("B")
end)
print(co())
print(co())
```

---

## 协程通信

**基本写法：resume 传递参数**
`coroutine.resume(<coroutine>, <value>)`
```lua
-- resume 传递参数给 yield
local co = coroutine.create(function(a)
    local b = coroutine.yield(a + 1)
    return b + 1
end)
print(coroutine.resume(co, 10))
print(coroutine.resume(co, 20))
```

**基本写法：yield 返回多值**
`coroutine.yield(<val1>, <val2>)`
```lua
-- yield 返回多个值
local co = coroutine.create(function()
    coroutine.yield(1, 2, 3)
end)
local _, a, b, c = coroutine.resume(co)
```

**基本写法：resume 返回状态**
`local <ok>, <value> = coroutine.resume(<coroutine>)`
```lua
-- resume 返回成功状态和值
local co = coroutine.create(function()
    return "完成"
end)
local ok, result = coroutine.resume(co)
```

---

## 协程状态

**基本写法：suspended 挂起状态**
`coroutine.status(<coroutine>) == "suspended"`
```lua
-- 检查协程是否挂起
local co = coroutine.create(function()
    coroutine.yield()
end)
if coroutine.status(co) == "suspended" then
    coroutine.resume(co)
end
```

**基本写法：running 运行状态**
`coroutine.status(<coroutine>) == "running"`
```lua
-- 检查协程是否运行
local co = coroutine.create(function()
    if coroutine.status(co) == "running" then
        print("正在运行")
    end
end)
coroutine.resume(co)
```

**基本写法：dead 结束状态**
`coroutine.status(<coroutine>) == "dead"`
```lua
-- 检查协程是否结束
local co = coroutine.create(function()
    print("执行完毕")
end)
coroutine.resume(co)
if coroutine.status(co) == "dead" then
    print("协程已结束")
end
```

**基本写法：coroutine.running 获取当前协程**
`coroutine.running()`
```lua
-- 获取当前运行的协程
local co = coroutine.create(function()
    local current = coroutine.running()
    print(current == co)
end)
coroutine.resume(co)
```

---

## 生成器模式

**基本写法：生成器函数**
`local function <generator>(<params>) return coroutine.wrap(function() <body with yield> end) end`
```lua
-- 生成器函数
local function range(start, stop, step)
    step = step or 1
    return coroutine.wrap(function()
        for i = start, stop, step do
            coroutine.yield(i)
        end
    end)
end
```

**基本写法：生成器遍历**
`for <value> in <generator>(<args>) do <body> end`
```lua
-- 遍历生成器
for v in range(1, 5) do
    print(v)
end
```

**基本写法：无限生成器**
`local function <generator>() return coroutine.wrap(function() while true do coroutine.yield(<value>) end end) end`
```lua
-- 无限生成器
local function counter()
    local i = 0
    return coroutine.wrap(function()
        while true do
            i = i + 1
            coroutine.yield(i)
        end
    end)
end
```

---

## 协程迭代器

**基本写法：协程作为迭代器**
`local function <iterator>(<collection>) return coroutine.wrap(function() for <k>, <v> in pairs(<collection>) do coroutine.yield(<k>, <v>) end end) end`
```lua
-- 协程作为迭代器
local function pairsByValue(t)
    local sorted = {}
    for k, v in pairs(t) do
        sorted[#sorted + 1] = {k = k, v = v}
    end
    table.sort(sorted, function(a, b) return a.v < b.v end)
    return coroutine.wrap(function()
        for _, item in ipairs(sorted) do
            coroutine.yield(item.k, item.v)
        end
    end)
end
```

**基本写法：协程遍历树**
`local function <traverse>(<tree>) return coroutine.wrap(function() <recursive yield> end) end`
```lua
-- 协程遍历树结构
local function traverse(node)
    return coroutine.wrap(function()
        if node then
            for _, child in ipairs(node.children or {}) do
                for k, v in traverse(child) do
                    coroutine.yield(k, v)
                end
            end
            coroutine.yield(node.value)
        end
    end)
end
```

---

## 异步模拟

**基本写法：异步任务模拟**
`local function <asyncTask>(<params>) <coroutine with yield> end`
```lua
-- 异步任务模拟
local function asyncTask(name, duration)
    return coroutine.create(function()
        print(name .. " 开始")
        coroutine.yield()
        print(name .. " 完成")
    end)
end
```

**基本写法：任务调度器**
`local function <scheduler>(<tasks>) <body> end`
```lua
-- 简单任务调度器
local function scheduler(tasks)
    while true do
        local allDead = true
        for _, co in ipairs(tasks) do
            if coroutine.status(co) ~= "dead" then
                allDead = false
                coroutine.resume(co)
            end
        end
        if allDead then break end
    end
end
```

**基本写法：并行执行**
`local function <parallel>(<funcs>) <body> end`
```lua
-- 并行执行多个函数
local function parallel(funcs)
    local coroutines = {}
    for i, func in ipairs(funcs) do
        coroutines[i] = coroutine.create(func)
    end
    while true do
        local allDead = true
        for _, co in ipairs(coroutines) do
            if coroutine.status(co) ~= "dead" then
                allDead = false
                coroutine.resume(co)
            end
        end
        if allDead then break end
    end
end
```

---

## 协程错误处理

**基本写法：resume 错误捕获**
`local <ok>, <err> = coroutine.resume(<coroutine>)`
```lua
-- resume 捕获协程错误
local co = coroutine.create(function()
    error("协程错误")
end)
local ok, err = coroutine.resume(co)
if not ok then
    print("错误: " .. err)
end
```

**基本写法：协程内 pcall**
`pcall(function() <body> end)`
```lua
-- 协程内使用 pcall
local co = coroutine.create(function()
    local ok, err = pcall(function()
        error("处理错误")
    end)
    if not ok then
        print("捕获: " .. err)
    end
end)
coroutine.resume(co)
```

---

## 协程实战

**基本写法：生产者消费者**
`local function <producer>() <coroutine> end; local function <consumer>(<producer>) <body> end`
```lua
-- 生产者消费者模式
local function producer()
    for i = 1, 5 do
        coroutine.yield("产品" .. i)
    end
end
local function consume(producer)
    local co = coroutine.create(producer)
    while coroutine.status(co) ~= "dead" do
        local ok, product = coroutine.resume(co)
        if product then
            print("消费: " .. product)
        end
    end
end
```

**基本写法：管道**
`local function <pipe>(<source>, <filter>) <body> end`
```lua
-- 协程管道
local function pipe(source, filter)
    return coroutine.wrap(function()
        for value in source do
            local filtered = filter(value)
            if filtered then
                coroutine.yield(filtered)
            end
        end
    end)
end
```

**基本写法：超时控制**
`local function <withTimeout>(<func>, <timeout>) <body> end`
```lua
-- 协程超时控制
local function withTimeout(func, timeout)
    local co = coroutine.create(func)
    local start = os.time()
    while true do
        local ok, result = coroutine.resume(co)
        if coroutine.status(co) == "dead" then
            return result
        end
        if os.time() - start > timeout then
            return nil, "timeout"
        end
    end
end
```

---

## 协程与迭代器

**基本写法：协程生成迭代器**
`local function <iter>(<collection>) return coroutine.wrap(function() <body> end) end`
```lua
-- 协程生成迭代器
local function iter(t)
    return coroutine.wrap(function()
        for i, v in ipairs(t) do
            coroutine.yield(i, v)
        end
    end)
end
```

**基本写法：使用协程迭代器**
`for <k>, <v> in <iter>(<collection>) do <body> end`
```lua
-- 使用协程迭代器
local arr = {10, 20, 30}
for i, v in iter(arr) do
    print(i, v)
end
```
