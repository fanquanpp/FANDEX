# Lua 迭代器速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 泛型 for 迭代器

**基本写法：for-in 迭代器**
`for <var> in <iterator> do <body> end`
```lua
-- 泛型 for 迭代器
for value in iter({1, 2, 3}) do
    print(value)
end
```

**基本写法：for-in 多变量迭代器**
`for <var1>, <var2> in <iterator> do <body> end`
```lua
-- 多变量迭代器
for key, value in pairs({a = 1, b = 2}) do
    print(key, value)
end
```

**基本写法：for-in 带状态迭代器**
`for <var> in <iterator>, <state>, <init> do <body> end`
```lua
-- 带状态和初始值的迭代器
for value in function(t, i) i = i + 1; return t[i] end, {10, 20, 30}, 0 do
    print(value)
end
```

---

## 内置迭代器

**基本写法：ipairs 数组迭代器**
`ipairs(<table>)`
```lua
-- ipairs 遍历数组部分
local arr = {"a", "b", "c"}
for i, v in ipairs(arr) do
    print(i, v)
end
```

**基本写法：pairs 表迭代器**
`pairs(<table>)`
```lua
-- pairs 遍历表所有键值对
local t = {name = "Alice", age = 25}
for k, v in pairs(t) do
    print(k, v)
end
```

**基本写法：string.gmatch 字符串迭代器**
`string.gmatch(<string>, <pattern>)`
```lua
-- gmatch 遍历字符串匹配
for word in string.gmatch("Hello World Lua", "%w+") do
    print(word)
end
```

**基本写法：io.lines 文件行迭代器**
`io.lines(<filename>)`
```lua
-- io.lines 遍历文件行
for line in io.lines("test.txt") do
    print(line)
end
```

---

## 自定义迭代器

**基本写法：闭包迭代器**
`local function <iterator>(<collection>) return function() <body with yield> end end`
```lua
-- 闭包迭代器
local function range(start, stop, step)
    step = step or 1
    local i = start - step
    return function()
        i = i + step
        if i <= stop then
            return i
        end
    end
end
```

**基本写法：使用闭包迭代器**
`for <var> in <iterator>(<args>) do <body> end`
```lua
-- 使用闭包迭代器
for i in range(1, 5) do
    print(i)
end
```

**基本写法：状态迭代器**
`local function <iterator>(<state>, <control>) <body> end`
```lua
-- 无状态迭代器
local function iter(t, i)
    i = i + 1
    local v = t[i]
    if v then
        return i, v
    end
end
```

**基本写法：使用状态迭代器**
`for <k>, <v> in <iterator>, <collection>, 0 do <body> end`
```lua
-- 使用无状态迭代器
local arr = {10, 20, 30}
for i, v in iter, arr, 0 do
    print(i, v)
end
```

---

## 协程迭代器

**基本写法：协程迭代器**
`local function <iterator>(<collection>) return coroutine.wrap(function() <body with yield> end) end`
```lua
-- 协程迭代器
local function iter(t)
    return coroutine.wrap(function()
        for i, v in ipairs(t) do
            coroutine.yield(i, v)
        end
    end)
end
```

**基本写法：使用协程迭代器**
`for <k>, <v> in <iterator>(<collection>) do <body> end`
```lua
-- 使用协程迭代器
local arr = {10, 20, 30}
for i, v in iter(arr) do
    print(i, v)
end
```

**基本写法：协程生成器迭代器**
`local function <generator>(<params>) return coroutine.wrap(function() <body> end) end`
```lua
-- 协程生成器迭代器
local function fibonacci(n)
    return coroutine.wrap(function()
        local a, b = 0, 1
        for i = 1, n do
            coroutine.yield(a)
            a, b = b, a + b
        end
    end)
end
```

---

## 数组迭代器

**基本写法：数组遍历迭代器**
`local function <iter>(<array>) return function() <body> end end`
```lua
-- 数组遍历迭代器
local function elements(arr)
    local i = 0
    return function()
        i = i + 1
        return arr[i]
    end
end
```

**基本写法：反向遍历迭代器**
`local function <reverseIter>(<array>) return function() <body> end end`
```lua
-- 反向遍历迭代器
local function reverse(arr)
    local i = #arr + 1
    return function()
        i = i - 1
        if i >= 1 then
            return arr[i]
        end
    end
end
```

**基本写法：带步长迭代器**
`local function <stepIter>(<array>, <step>) return function() <body> end end`
```lua
-- 带步长迭代器
local function stepIter(arr, step)
    local i = 1 - step
    return function()
        i = i + step
        if i <= #arr then
            return arr[i]
        end
    end
end
```

---

## 表迭代器

**基本写法：按键排序迭代器**
`local function <sortedPairs>(<table>) return function() <body> end end`
```lua
-- 按键排序遍历
local function sortedPairs(t)
    local keys = {}
    for k in pairs(t) do
        keys[#keys + 1] = k
    end
    table.sort(keys)
    local i = 0
    return function()
        i = i + 1
        local k = keys[i]
        if k then
            return k, t[k]
        end
    end
end
```

**基本写法：按值排序迭代器**
`local function <sortedByValue>(<table>) return function() <body> end end`
```lua
-- 按值排序遍历
local function sortedByValue(t)
    local items = {}
    for k, v in pairs(t) do
        items[#items + 1] = {k = k, v = v}
    end
    table.sort(items, function(a, b) return a.v < b.v end)
    local i = 0
    return function()
        i = i + 1
        local item = items[i]
        if item then
            return item.k, item.v
        end
    end
end
```

**基本写法：过滤迭代器**
`local function <filterIter>(<table>, <predicate>) return function() <body> end end`
```lua
-- 过滤迭代器
local function filterPairs(t, predicate)
    local co = coroutine.wrap(function()
        for k, v in pairs(t) do
            if predicate(k, v) then
                coroutine.yield(k, v)
            end
        end
    end)
    return co
end
```

---

## 无限迭代器

**基本写法：无限计数器**
`local function <counter>() return function() <body> end end`
```lua
-- 无限计数器
local function counter()
    local i = 0
    return function()
        i = i + 1
        return i
    end
end
```

**基本写法：循环迭代器**
`local function <cycle>(<array>) return function() <body> end end`
```lua
-- 循环迭代器
local function cycle(arr)
    local i = 0
    return function()
        i = i % #arr + 1
        return arr[i]
    end
end
```

**基本写法：使用 take 限制**
`local function <take>(<iterator>, <n>) return function() <body> end end`
```lua
-- take 限制迭代次数
local function take(iter, n)
    local count = 0
    return function()
        count = count + 1
        if count <= n then
            return iter()
        end
    end
end
```

---

## 迭代器组合

**基本写法：map 迭代器**
`local function <mapIter>(<iterator>, <func>) return function() <body> end end`
```lua
-- map 迭代器转换
local function mapIter(iter, func)
    return function()
        local value = iter()
        if value then
            return func(value)
        end
    end
end
```

**基本写法：filter 迭代器**
`local function <filterIter>(<iterator>, <predicate>) return function() <body> end end`
```lua
-- filter 迭代器过滤
local function filterIter(iter, predicate)
    return function()
        while true do
            local value = iter()
            if value == nil then return end
            if predicate(value) then
                return value
            end
        end
    end
end
```

**基本写法：chain 迭代器**
`local function <chain>(<iter1>, <iter2>) return function() <body> end end`
```lua
-- chain 链式迭代器
local function chain(iter1, iter2)
    return function()
        local value = iter1()
        if value then
            return value
        end
        return iter2()
    end
end
```

**基本写法：zip 迭代器**
`local function <zip>(<iter1>, <iter2>) return function() <body> end end`
```lua
-- zip 合并迭代器
local function zip(iter1, iter2)
    return function()
        local v1 = iter1()
        local v2 = iter2()
        if v1 and v2 then
            return v1, v2
        end
    end
end
```

---

## 迭代器工具函数

**基本写法：collect 收集为表**
`local function <collect>(<iterator>) <body> end`
```lua
-- 收集迭代器结果为表
local function collect(iter)
    local result = {}
    for value in iter do
        result[#result + 1] = value
    end
    return result
end
```

**基本写法：reduce 累积**
`local function <reduce>(<iterator>, <func>, <init>) <body> end`
```lua
-- reduce 累积迭代器结果
local function reduce(iter, func, init)
    local acc = init
    for value in iter do
        acc = func(acc, value)
    end
    return acc
end
```

**基本写法：forEach 遍历**
`local function <forEach>(<iterator>, <func>) <body> end`
```lua
-- forEach 遍历迭代器
local function forEach(iter, func)
    for value in iter do
        func(value)
    end
end
```

**基本写法：count 计数**
`local function <count>(<iterator>) <body> end`
```lua
-- count 计数迭代器元素
local function count(iter)
    local n = 0
    for _ in iter do
        n = n + 1
    end
    return n
end
```

---

## 迭代器实战

**基本写法：文件行迭代器**
`local function <lines>(<filename>) return function() <body> end end`
```lua
-- 文件行迭代器
local function lines(filename)
    local file = io.open(filename, "r")
    if not file then return nil end
    return function()
        local line = file:read("*l")
        if not line then
            file:close()
        end
        return line
    end
end
```

**基本写法：树遍历迭代器**
`local function <traverse>(<tree>) return coroutine.wrap(function() <body> end) end`
```lua
-- 树遍历迭代器
local function traverse(node)
    return coroutine.wrap(function()
        if node then
            coroutine.yield(node.value)
            for _, child in ipairs(node.children or {}) do
                for v in traverse(child) do
                    coroutine.yield(v)
                end
            end
        end
    end)
end
```

**基本写法：分块迭代器**
`local function <chunks>(<array>, <size>) return function() <body> end end`
```lua
-- 分块迭代器
local function chunks(arr, size)
    local i = 0
    return function()
        i = i + 1
        local start = (i - 1) * size + 1
        if start <= #arr then
            local chunk = {}
            for j = start, math.min(start + size - 1, #arr) do
                chunk[#chunk + 1] = arr[j]
            end
            return chunk
        end
    end
end
```
