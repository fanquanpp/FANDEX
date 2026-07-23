# Lua 函数与闭包速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 函数定义

**基本写法：基本函数**
`function <name>(<params>) <body> end`
```lua
-- 基本函数定义
function add(a, b)
    return a + b
end
```

**基本写法：local 函数**
`local function <name>(<params>) <body> end`
```lua
-- local 函数
local function greet(name)
    return "Hello, " .. name
end
```

**基本写法：匿名函数赋值**
`local <name> = function(<params>) <body> end`
```lua
-- 匿名函数赋值给变量
local multiply = function(a, b)
    return a * b
end
```

**基本写法：表达式函数**
`local <name> = function(<params>) <expr> end`
```lua
-- 简单表达式函数
local square = function(x) return x * x end
```

**基本写法：表字段函数**
`<table>.<name> = function(<params>) <body> end`
```lua
-- 表字段函数
local utils = {}
utils.add = function(a, b)
    return a + b
end
```

**基本写法：表方法简写**
`function <table>.<name>(<params>) <body> end`
```lua
-- 表方法简写
function utils.subtract(a, b)
    return a - b
end
```

---

## 函数参数

**基本写法：固定参数**
`function <name>(<param1>, <param2>) <body> end`
```lua
-- 固定参数函数
function divide(a, b)
    return a / b
end
```

**基本写法：默认参数**
`<param> = <param> or <default>`
```lua
-- 默认参数
function greet(name, greeting)
    greeting = greeting or "Hello"
    return greeting .. ", " .. name
end
```

**基本写法：可变参数**
`function <name>(...) <body> end`
```lua
-- 可变参数函数
function sum(...)
    local total = 0
    for _, v in ipairs({...}) do
        total = total + v
    end
    return total
end
```

**基本写法：固定与可变参数混合**
`function <name>(<param>, ...) <body> end`
```lua
-- 固定参数与可变参数混合
function printf(format, ...)
    return string.format(format, ...)
end
```

**基本写法：select 获取可变参数**
`select(<n>, ...)`
```lua
-- select 获取指定位置参数
function firstAndRest(...)
    local first = select(1, ...)
    local rest = {select(2, ...)}
    return first, rest
end
```

**基本写法：select 获取参数数量**
`select("#", ...)`
```lua
-- 获取参数数量
function count(...)
    return select("#", ...)
end
```

---

## 函数返回值

**基本写法：单返回值**
`function <name>(<params>) return <value> end`
```lua
-- 单返回值
function double(x)
    return x * 2
end
```

**基本写法：多返回值**
`function <name>(<params>) return <val1>, <val2> end`
```lua
-- 多返回值
function getCoords()
    return 10, 20
end
```

**基本写法：无返回值**
`function <name>(<params>) <body> end`
```lua
-- 无返回值
function printMsg(msg)
    print(msg)
end
```

**基本写法：条件返回**
`if <cond> then return <val1> else return <val2> end`
```lua
-- 条件返回
function max(a, b)
    if a > b then
        return a
    else
        return b
    end
end
```

**基本写法：提前返回**
`if <cond> then return end`
```lua
-- 提前返回
function process(data)
    if not data then return end
    print(data)
end
```

---

## 闭包

**基本写法：基本闭包**
`local function <name>() local <var> = <init> return function() <body> end end`
```lua
-- 基本闭包
local function counter()
    local count = 0
    return function()
        count = count + 1
        return count
    end
end
```

**基本写法：闭包捕获变量**
`local <var> = <init>; local <func> = function() <body using var> end`
```lua
-- 闭包捕获外部变量
local x = 10
local function getX()
    return x
end
```

**基本写法：闭包工厂**
`local function <factory>(<param>) return function() <body> end end`
```lua
-- 闭包工厂
local function makeAdder(n)
    return function(x)
        return x + n
    end
end
```

**基本写法：闭包状态保持**
`local function <name>() local <state> = <init> return function(<param>) <body> end end`
```lua
-- 闭包保持状态
local function makeBank()
    local balance = 0
    return function(amount)
        balance = balance + amount
        return balance
    end
end
```

**基本写法：闭包共享状态**
`local <func1>, <func2> = <factory>()`
```lua
-- 闭包共享状态
local function makePair()
    local shared = 0
    local function set(v) shared = v end
    local function get() return shared end
    return set, get
end
```

---

## 高阶函数

**基本写法：函数作为参数**
`function <name>(<func>, <params>) <body> end`
```lua
-- 函数作为参数
function apply(func, value)
    return func(value)
end
```

**基本写法：函数作为返回值**
`function <name>(<params>) return function() <body> end end`
```lua
-- 函数作为返回值
function makeGreeter(greeting)
    return function(name)
        return greeting .. ", " .. name
    end
end
```

**基本写法：map 映射函数**
`function <name>(<arr>, <func>) <body> end`
```lua
-- map 映射函数
function map(arr, func)
    local result = {}
    for i, v in ipairs(arr) do
        result[i] = func(v)
    end
    return result
end
```

**基本写法：filter 过滤函数**
`function <name>(<arr>, <func>) <body> end`
```lua
-- filter 过滤函数
function filter(arr, func)
    local result = {}
    for _, v in ipairs(arr) do
        if func(v) then
            result[#result + 1] = v
        end
    end
    return result
end
```

**基本写法：reduce 累积函数**
`function <name>(<arr>, <func>, <init>) <body> end`
```lua
-- reduce 累积函数
function reduce(arr, func, init)
    local acc = init
    for _, v in ipairs(arr) do
        acc = func(acc, v)
    end
    return acc
end
```

**基本写法：forEach 遍历函数**
`function <name>(<arr>, <func>) <body> end`
```lua
-- forEach 遍历函数
function forEach(arr, func)
    for i, v in ipairs(arr) do
        func(v, i)
    end
end
```

---

## 函数调用

**基本写法：基本调用**
`<name>(<args>)`
```lua
-- 基本函数调用
local result = add(1, 2)
```

**基本写法：方法调用**
`<obj>:<method>(<args>)`
```lua
-- 方法调用（自动传递 self）
local str = "Hello"
local upper = str:upper()
```

**基本写法：表方法调用**
`<table>.<method>(<table>, <args>)`
```lua
-- 表方法调用（显式传递 self）
local result = string.upper(str)
```

**基本写法：函数作为表字段调用**
`<table>.<func>(<args>)`
```lua
-- 表字段函数调用
local result = utils.add(1, 2)
```

**基本写法：可变参数调用**
`<name>(<unpack>)`
```lua
-- 解包表作为参数调用
local args = {1, 2, 3}
local result = sum(table.unpack(args))
```

---

## 递归

**基本写法：基本递归**
`local function <name>(<param>) if <base> then return <val> else return <name>(<expr>) end end`
```lua
-- 递归计算阶乘
local function factorial(n)
    if n <= 1 then
        return 1
    else
        return n * factorial(n - 1)
    end
end
```

**基本写法：尾递归**
`local function <name>(<param>, <acc>) if <base> then return <acc> else return <name>(<expr>, <expr>) end end`
```lua
-- 尾递归计算阶乘
local function factorialTail(n, acc)
    if n <= 1 then
        return acc
    else
        return factorialTail(n - 1, n * acc)
    end
end
```

**基本写法：递归遍历表**
`local function <name>(<table>) for <k>, <v> in pairs(<table>) do if type(<v>) == "table" then <name>(<v>) end end end`
```lua
-- 递归遍历嵌套表
local function deepPrint(t, indent)
    indent = indent or ""
    for k, v in pairs(t) do
        if type(v) == "table" then
            print(indent .. k .. ":")
            deepPrint(v, indent .. "  ")
        else
            print(indent .. k .. ": " .. tostring(v))
        end
    end
end
```

---

## 函数作用域

**基本写法：local 函数前向引用**
`local <name>; <name> = function(<params>) <body> end`
```lua
-- local 函数前向声明
local fibonacci
fibonacci = function(n)
    if n <= 1 then
        return n
    else
        return fibonacci(n - 1) + fibonacci(n - 2)
    end
end
```

**基本写法：嵌套函数**
`function <outer>() local function <inner>() <body> end <body> end`
```lua
-- 嵌套函数
function process(data)
    local function validate(d)
        return d ~= nil
    end
    if validate(data) then
        print("Valid")
    end
end
```

---

## 函数与 Table

**基本写法：函数存储在表中**
`local <table> = { <name1> = function(...) end, <name2> = function(...) end }`
```lua
-- 函数存储在表中
local operations = {
    add = function(a, b) return a + b end,
    subtract = function(a, b) return a - b end,
    multiply = function(a, b) return a * b end
}
```

**基本写法：表方法定义**
`function <table>.<name>(<self>, <params>) <body> end`
```lua
-- 表方法定义
local obj = {}
function obj.greet(self, name)
    return "Hello, " .. name
end
```

**基本写法：冒号语法定义方法**
`function <table>:<name>(<params>) <body> end`
```lua
-- 冒号语法定义方法（自动传递 self）
function obj:greet(name)
    return "Hello, " .. name
end
```

---

## 函数式编程

**基本写法：函数组合**
`local function <name>(<f>, <g>) return function(<x>) return <f>(<g>(<x>)) end end`
```lua
-- 函数组合
local function compose(f, g)
    return function(x)
        return f(g(x))
    end
end
```

**基本写法：柯里化**
`local function <name>(<a>) return function(<b>) return <expr> end end`
```lua
-- 柯里化
local function curryAdd(a)
    return function(b)
        return a + b
    end
end
```

**基本写法：偏应用**
`local function <name>(<func>, <a>) return function(<b>) return <func>(<a>, <b>) end end`
```lua
-- 偏应用
local function partial(func, a)
    return function(b)
        return func(a, b)
    end
end
```

**基本写法：记忆化**
`local <cache> = {}; local function <name>(<param>) if <cache>[<param>] then return <cache>[<param>] end <body> <cache>[<param>] = <result> return <result> end`
```lua
-- 记忆化函数
local memo = {}
local function fibonacci(n)
    if memo[n] then return memo[n] end
    if n <= 1 then return n end
    memo[n] = fibonacci(n - 1) + fibonacci(n - 2)
    return memo[n]
end
```
