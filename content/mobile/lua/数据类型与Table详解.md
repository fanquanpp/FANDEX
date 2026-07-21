# Lua 数据类型与 Table 详解速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本数据类型

**基本写法：nil 空值**
`local <name> = nil`
```lua
-- nil 表示空值
local x = nil
```

**基本写法：boolean 布尔值**
`local <name> = <bool>`
```lua
-- 布尔值
local isActive = true
local isDone = false
```

**基本写法：number 数字**
`local <name> = <number>`
```lua
-- 数字类型（整数和浮点数）
local intVal = 42
local floatVal = 3.14
local sciVal = 1e10
local hexVal = 0xFF
```

**基本写法：string 字符串**
`local <name> = "<text>"`
```lua
-- 字符串
local name = "Lua"
local path = 'C:\\Users'
```

**基本写法：多行字符串**
`local <name> = [[<content>]]`
```lua
-- 多行字符串
local text = [[
第一行
第二行
]]
```

**基本写法：function 函数**
`local <name> = function(<params>) <body> end`
```lua
-- 函数类型
local greet = function(name)
    return "Hello, " .. name
end
```

**基本写法：table 表**
`local <name> = {}`
```lua
-- 表类型
local emptyTable = {}
local arr = {1, 2, 3}
local map = {key = "value"}
```

---

## Table 创建

**基本写法：空表**
`local <name> = {}`
```lua
-- 创建空表
local t = {}
```

**单行写法：数组式表**
`local <name> = {<val1>, <val2>, <val3>}`
```lua
-- 创建数组式表
local arr = {10, 20, 30, 40, 50}
```

**单行写法：字典式表**
`local <name> = {<key1> = <val1>, <key2> = <val2>}`
```lua
-- 创建字典式表
local person = {name = "Alice", age = 25}
```

**换行写法：多字段字典式表**
`local <name> = { <key1> = <val1>, <key2> = <val2>, <key3> = <val3> }`
```lua
-- 换行声明多字段表
local config = {
    host = "localhost",
    port = 8080,
    timeout = 5000,
    debug = true
}
```

**单行写法：混合式表**
`local <name> = {<val1>, <key> = <val2>}`
```lua
-- 混合数组与字典
local mixed = {10, 20, name = "Alice", age = 25}
```

**基本写法：嵌套表**
`local <name> = {<key> = {<subkey> = <val>}}`
```lua
-- 嵌套表
local user = {
    profile = {
        name = "Alice",
        age = 25
    }
}
```

---

## Table 访问

**基本写法：点号访问**
`<table>.<key>`
```lua
-- 点号访问表字段
local person = {name = "Alice", age = 25}
print(person.name)
print(person.age)
```

**基本写法：方括号访问**
`<table>["<key>"]`
```lua
-- 方括号访问表字段
print(person["name"])
```

**基本写法：数组索引访问**
`<table>[<index>]`
```lua
-- 数组索引访问（从 1 开始）
local arr = {10, 20, 30}
print(arr[1])
print(arr[2])
```

**基本写法：动态键访问**
`<table>[<variable>]`
```lua
-- 动态键访问
local key = "name"
print(person[key])
```

**基本写法：嵌套表访问**
`<table>.<key1>.<key2>`
```lua
-- 嵌套表访问
local user = {profile = {name = "Alice"}}
print(user.profile.name)
```

---

## Table 修改

**基本写法：添加字段**
`<table>.<newKey> = <value>`
```lua
-- 添加新字段
local person = {}
person.name = "Alice"
person.age = 25
```

**基本写法：修改字段**
`<table>.<key> = <newValue>`
```lua
-- 修改字段值
person.name = "Bob"
```

**基本写法：删除字段**
`<table>.<key> = nil`
```lua
-- 删除字段
person.age = nil
```

**基本写法：数组添加元素**
`<table>[#<table> + 1] = <value>`
```lua
-- 数组末尾添加元素
local arr = {1, 2, 3}
arr[#arr + 1] = 4
```

---

## Table 遍历

**基本写法：ipairs 遍历数组**
`for <i>, <v> in ipairs(<table>) do <body> end`
```lua
-- ipairs 遍历数组部分
local arr = {"a", "b", "c"}
for i, v in ipairs(arr) do
    print(i, v)
end
```

**基本写法：pairs 遍历表**
`for <k>, <v> in pairs(<table>) do <body> end`
```lua
-- pairs 遍历所有键值对
local t = {name = "Alice", age = 25}
for k, v in pairs(t) do
    print(k, v)
end
```

**基本写法：数值遍历数组**
`for <i> = 1, #<table> do <body> end`
```lua
-- 数值遍历数组
local arr = {10, 20, 30}
for i = 1, #arr do
    print(arr[i])
end
```

**基本写法：next 遍历表**
`local <k>, <v> = next(<table>, <prevKey>)`
```lua
-- next 遍历表
local t = {a = 1, b = 2}
local k, v = next(t, nil)
while k do
    print(k, v)
    k, v = next(t, k)
end
```

---

## Table 长度

**基本写法：# 获取长度**
`#<table>`
```lua
-- # 获取数组长度
local arr = {1, 2, 3, 4, 5}
print(#arr)
```

**基本写法：table.getn 获取长度**
`table.getn(<table>)`
```lua
-- table.getn 获取长度（Lua 5.1）
print(table.getn(arr))
```

**基本写法：计算表字段数量**
`local <count> = 0; for _ in pairs(<table>) do <count> = <count> + 1 end`
```lua
-- 计算表字段数量
local t = {a = 1, b = 2, c = 3}
local count = 0
for _ in pairs(t) do
    count = count + 1
end
print(count)
```

---

## Table 操作函数

**基本写法：table.insert 末尾插入**
`table.insert(<table>, <value>)`
```lua
-- 末尾插入元素
local arr = {1, 2, 3}
table.insert(arr, 4)
```

**基本写法：table.insert 指定位置插入**
`table.insert(<table>, <pos>, <value>)`
```lua
-- 指定位置插入元素
table.insert(arr, 1, 0)
```

**基本写法：table.remove 末尾移除**
`table.remove(<table>)`
```lua
-- 移除末尾元素
local removed = table.remove(arr)
```

**基本写法：table.remove 指定位置移除**
`table.remove(<table>, <pos>)`
```lua
-- 移除指定位置元素
local removed = table.remove(arr, 1)
```

**基本写法：table.sort 排序**
`table.sort(<table>)`
```lua
-- 升序排序
local nums = {5, 3, 1, 4, 2}
table.sort(nums)
```

**基本写法：table.sort 自定义排序**
`table.sort(<table>, <comparator>)`
```lua
-- 自定义比较函数排序
table.sort(nums, function(a, b)
    return a > b
end)
```

**基本写法：table.concat 连接**
`table.concat(<table>, <separator>)`
```lua
-- 连接数组为字符串
local arr = {"a", "b", "c"}
local result = table.concat(arr, ", ")
```

**基本写法：table.concat 指定范围连接**
`table.concat(<table>, <separator>, <start>, <end>)`
```lua
-- 指定范围连接
local result = table.concat(arr, ", ", 2, 3)
```

**基本写法：table.unpack 解包**
`table.unpack(<table>)`
```lua
-- 解包表为多个值
local arr = {10, 20, 30}
local a, b, c = table.unpack(arr)
```

**基本写法：table.unpack 部分解包**
`table.unpack(<table>, <start>, <end>)`
```lua
-- 部分解包
local a, b = table.unpack(arr, 1, 2)
```

---

## Table 复制

**基本写法：浅拷贝**
`local <newTable> = {}; for <k>, <v> in pairs(<table>) do <newTable>[<k>] = <v> end`
```lua
-- 浅拷贝表
local function shallowCopy(t)
    local copy = {}
    for k, v in pairs(t) do
        copy[k] = v
    end
    return copy
end
```

**换行写法：深拷贝**
`local function <name>(<table>) <body with recursion> end`
```lua
-- 深拷贝表
local function deepCopy(t)
    local copy = {}
    for k, v in pairs(t) do
        if type(v) == "table" then
            copy[k] = deepCopy(v)
        else
            copy[k] = v
        end
    end
    return copy
end
```

---

## Table 合并

**基本写法：合并两个表**
`for <k>, <v> in pairs(<source>) do <target>[<k>] = <v> end`
```lua
-- 合并两个表
local function merge(target, source)
    for k, v in pairs(source) do
        target[k] = v
    end
    return target
end
```

**基本写法：数组合并**
`for <i>, <v> in ipairs(<source>) do <target>[#<target> + 1] = <v> end`
```lua
-- 合并两个数组
local function mergeArrays(target, source)
    for i, v in ipairs(source) do
        target[#target + 1] = v
    end
    return target
end
```

---

## Table 作为数组

**基本写法：创建数组**
`local <name> = {<val1>, <val2>, <val3>}`
```lua
-- 创建数组
local colors = {"red", "green", "blue"}
```

**基本写法：数组遍历**
`for <i>, <v> in ipairs(<array>) do <body> end`
```lua
-- 遍历数组
for i, color in ipairs(colors) do
    print(i, color)
end
```

**基本写法：数组查找**
`for <i>, <v> in ipairs(<array>) do if <v> == <target> then return <i> end end`
```lua
-- 查找元素索引
local function indexOf(arr, target)
    for i, v in ipairs(arr) do
        if v == target then return i end
    end
    return nil
end
```

**基本写法：数组过滤**
`local <result> = {}; for <i>, <v> in ipairs(<array>) do if <cond> then <result>[#<result> + 1] = <v> end end`
```lua
-- 过滤数组元素
local function filter(arr, predicate)
    local result = {}
    for i, v in ipairs(arr) do
        if predicate(v) then
            result[#result + 1] = v
        end
    end
    return result
end
```

**基本写法：数组映射**
`local <result> = {}; for <i>, <v> in ipairs(<array>) do <result>[<i>] = <transform> end`
```lua
-- 映射数组元素
local function map(arr, transform)
    local result = {}
    for i, v in ipairs(arr) do
        result[i] = transform(v)
    end
    return result
end
```

---

## Table 作为集合

**基本写法：创建集合**
`local <set> = {<key1> = true, <key2> = true}`
```lua
-- 创建集合
local fruits = {apple = true, banana = true, cherry = true}
```

**基本写法：集合添加元素**
`<set>[<key>] = true`
```lua
-- 添加集合元素
fruits.orange = true
```

**基本写法：集合移除元素**
`<set>[<key>] = nil`
```lua
-- 移除集合元素
fruits.banana = nil
```

**基本写法：集合包含检查**
`if <set>[<key>] then <body> end`
```lua
-- 检查集合包含
if fruits.apple then
    print("包含 apple")
end
```

---

## Table 作为队列

**基本写法：队列入队**
`table.insert(<queue>, <value>)`
```lua
-- 队列入队
local queue = {}
table.insert(queue, "task1")
```

**基本写法：队列出队**
`table.remove(<queue>, 1)`
```lua
-- 队列出队
local task = table.remove(queue, 1)
```

---

## 弱引用表

**基本写法：弱引用键表**
`setmetatable({}, {__mode = "k"})`
```lua
-- 弱引用键表
local weakKeys = setmetatable({}, {__mode = "k"})
```

**基本写法：弱引用值表**
`setmetatable({}, {__mode = "v"})`
```lua
-- 弱引用值表
local weakValues = setmetatable({}, {__mode = "v"})
```

**基本写法：弱引用键值表**
`setmetatable({}, {__mode = "kv"})`
```lua
-- 弱引用键值表
local weakKV = setmetatable({}, {__mode = "kv"})
```
