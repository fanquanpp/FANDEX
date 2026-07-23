# Lua 程序结构与基本语法速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 注释

**基本写法：单行注释**
`-- <comment>`
```lua
-- 单行注释
local x = 10
```

**基本写法：多行注释**
`--[[ <content> ]]`
```lua
-- 多行注释
local x = 10
```

**基本写法：多行注释带嵌套**
`--[==[ <content> ]==]`
```lua
--[==[
带等号的多行注释
可以嵌套 ]]
]==]
local x = 10
```

---

## 变量声明

**基本写法：local 局部变量**
`local <name> = <value>`
```lua
-- 声明局部变量
local x = 10
local name = "Lua"
```

**基本写法：多变量赋值**
`local <name1>, <name2> = <value1>, <value2>`
```lua
-- 多变量赋值
local a, b = 1, 2
```

**基本写法：全局变量**
`<name> = <value>`
```lua
-- 全局变量（无 local 关键字）
count = 0
```

**基本写法：多变量交换**
`<name1>, <name2> = <name2>, <name1>`
```lua
-- 变量交换
local a, b = 1, 2
a, b = b, a
```

**基本写法：默认值赋值**
`<name> = <name> or <default>`
```lua
-- 使用 or 提供默认值
local name = name or "default"
```

---

## 运算符

**基本写法：算术运算符**
`<a> <op> <b>`
```lua
-- 算术运算
local sum = 10 + 20
local diff = 20 - 10
local product = 10 * 2
local quotient = 10 / 3
local intDiv = 10 // 3
local modulo = 10 % 3
local power = 2 ^ 10
```

**基本写法：比较运算符**
`<a> <op> <b>`
```lua
-- 比较运算
local isEqual = (10 == 10)
local isNotEqual = (10 ~= 20)
local isLess = (10 < 20)
local isGreater = (20 > 10)
local isLessEqual = (10 <= 10)
local isGreaterEqual = (20 >= 20)
```

**基本写法：逻辑运算符**
`<a> <op> <b>`
```lua
-- 逻辑运算
local result1 = true and false
local result2 = true or false
local result3 = not true
```

**基本写法：字符串连接**
`<str1> .. <str2>`
```lua
-- 字符串连接
local greeting = "Hello" .. ", " .. "Lua"
```

**基本写法：长度运算符**
`#<string>`
```lua
-- 获取字符串长度
local length = #"Hello"
```

**基本写法：获取表长度**
`#<table>`
```lua
-- 获取表长度
local arr = {1, 2, 3, 4, 5}
local length = #arr
```

---

## 控制流

**基本写法：if 语句**
`if <cond> then <body> end`
```lua
-- if 语句
if x > 0 then
    print("正数")
end
```

**基本写法：if-else 语句**
`if <cond> then <body1> else <body2> end`
```lua
-- if-else 语句
if x > 0 then
    print("正数")
else
    print("非正数")
end
```

**基本写法：if-elseif-else 语句**
`if <cond1> then <body1> elseif <cond2> then <body2> else <body3> end`
```lua
-- if-elseif-else 语句
if x > 0 then
    print("正数")
elseif x < 0 then
    print("负数")
else
    print("零")
end
```

**基本写法：while 循环**
`while <cond> do <body> end`
```lua
-- while 循环
local i = 1
while i <= 5 do
    print(i)
    i = i + 1
end
```

**基本写法：repeat-until 循环**
`repeat <body> until <cond>`
```lua
-- repeat-until 循环（至少执行一次）
local i = 1
repeat
    print(i)
    i = i + 1
until i > 5
```

**基本写法：for 数值循环**
`for <var> = <start>, <stop>, <step> do <body> end`
```lua
-- for 数值循环
for i = 1, 10, 2 do
    print(i)
end
```

**基本写法：for 递减循环**
`for <var> = <start>, <stop>, -<step> do <body> end`
```lua
-- for 递减循环
for i = 10, 1, -1 do
    print(i)
end
```

**基本写法：for 泛型循环**
`for <var1>, <var2> in <expr> do <body> end`
```lua
-- for 泛型循环
local arr = {10, 20, 30}
for i, v in ipairs(arr) do
    print(i, v)
end
```

**基本写法：for 遍历表键值**
`for <key>, <value> in pairs(<table>) do <body> end`
```lua
-- 遍历表的键值对
local t = {name = "Lua", version = 5.4}
for k, v in pairs(t) do
    print(k, v)
end
```

**基本写法：break 跳出循环**
`break`
```lua
-- break 跳出循环
for i = 1, 10 do
    if i == 5 then break end
    print(i)
end
```

**基本写法：goto 跳转**
`goto <label>`
```lua
-- goto 跳转
for i = 1, 10 do
    if i == 5 then goto skip end
    print(i)
    ::skip::
end
```

---

## 作用域

**基本写法：local 块作用域**
`do local <name> = <value> <body> end`
```lua
-- do-end 块作用域
do
    local x = 10
    print(x)
end
```

**基本写法：local 函数作用域**
`local <name> = <value>`
```lua
-- local 变量仅在当前作用域有效
function test()
    local y = 20
    print(y)
end
```

---

## 多赋值与默认值

**基本写法：函数返回多值赋值**
`local <name1>, <name2> = <func>()`
```lua
-- 函数返回多值赋值
local function getCoords()
    return 10, 20
end
local x, y = getCoords()
```

**基本写法：调整返回值数量**
`local <name> = (<func>())`
```lua
-- 括号调整返回值为 1 个
local function multi()
    return 1, 2, 3
end
local x = (multi())
```

**基本写法：可变参数**
`local <name> = {<...>}`
```lua
-- 可变参数收集为表
local function sum(...)
    local args = {...}
    local total = 0
    for _, v in ipairs(args) do
        total = total + v
    end
    return total
end
```

**基本写法：select 获取可变参数**
`select(<n>, ...)`
```lua
-- select 获取可变参数
local function first(...)
    return select(1, ...)
end
```

**基本写法：select 获取参数数量**
`select("#", ...)`
```lua
-- 获取可变参数数量
local function count(...)
    return select("#", ...)
end
```

---

## 关键字与保留字

**基本写法：local 关键字**
`local <name>`
```lua
-- local 声明局部变量
local x = 10
```

**基本写法：nil 值**
`<name> = nil`
```lua
-- nil 表示空值
local x = nil
```

**基本写法：true/false 布尔值**
`local <name> = <bool>`
```lua
-- 布尔值
local isActive = true
local isDone = false
```

---

## 基本输入输出

**基本写法：print 输出**
`print(<value>)`
```lua
-- print 输出到标准输出
print("Hello, Lua")
```

**基本写法：io.write 输出**
`io.write(<value>)`
```lua
-- io.write 输出（不换行）
io.write("Hello, ")
io.write("Lua\n")
```

**基本写法：io.read 输入**
`io.read()`
```lua
-- io.read 读取输入
local input = io.read()
```

**基本写法：io.read 读取数字**
`io.read("*n")`
```lua
-- 读取数字
local num = io.read("*n")
```

---

## 类型检查

**基本写法：type 获取类型**
`type(<value>)`
```lua
-- type 获取值类型
print(type(10))
print(type("Hello"))
print(type(true))
print(type(nil))
print(type({}))
print(type(print))
```

**基本写法：类型判断**
`type(<value>) == "<type>"`
```lua
-- 判断值类型
local x = 10
if type(x) == "number" then
    print("是数字")
end
```

---

## 运算符优先级

**基本写法：指数运算优先级**
`<a> ^ <b>`
```lua
-- ^ 优先级最高
local result = 2 + 3 ^ 2
```

**基本写法：一元运算符**
`-<value>`
```lua
-- 一元负号
local x = -10
```

**基本写法：not 运算符**
`not <value>`
```lua
-- not 逻辑非
local result = not nil
```

**基本写法：and/or 短路求值**
`<a> and <b> or <c>`
```lua
-- and/or 短路求值（类似三元运算符）
local x = 10
local result = (x > 5) and "大" or "小"
```
