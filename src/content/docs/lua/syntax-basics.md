---
order: 20
tags:
  - 'lua'
difficulty: 'beginner'
title: '程序结构与基本语法'
module: 'lua'
category: 'Lua Basics'
description: 'Lua 语法基础、变量、运算符与控制结构。'
author: 'Anonymous'
---

## 目录

1. [变量与赋值](#变量与赋值)
2. [注释规范](#注释规范)
3. [控制流](#控制流)
4. [运算符](#运算符)
5. [程序结构](#程序结构)
6. [错误处理](#错误处理)
7. [最佳实践](#最佳实践)
8. [代码示例](#代码示例)

---

## 1. 变量与赋值 (Variables)

Lua 是动态类型语言，变量无需声明类型，类型在运行时确定。

### 1.1 变量类型

| 类型         | 描述                                         | 示例                   |
| :----------- | :------------------------------------------- | :--------------------- |
| **全局变量** | 默认所有变量都是全局的，存储在全局表 `_G` 中 | `name = "Lua"`         |
| **局部变量** | 使用 `local` 关键字声明，作用域有限          | `local count = 10`     |
| **表字段**   | 存储在表中的变量                             | `person.name = "John"` |

### 1.2 赋值操作

#### 1.2.1 基本赋值

```lua
 True-- 单个赋值
 local name = "Lua"
 local version = 5.4
 True-- 多重赋值
 local a, b = 10, 20
 print(a, b) -- 10 20
 True-- 交换变量
 local x, y = 1, 2
 x, y = y, x
 print(x, y) -- 2 1
 True-- 忽略值
 local _, value = string.find("Hello Lua", "Lua")
 print(value) -- 7
```

#### 1.2.2 表赋值

```lua
 True-- 表构造器赋值
 local person = {
  name = "John",
  age = 30,
  address = {
  street = "Main St",
  city = "New York"
  }
 True}
 True-- 访问表字段
 print(person.name) -- John
 print(person["age"]) -- 30
 print(person.address.city) -- New York
```

### 1.3 作用域

#### 1.3.1 局部变量作用域

```lua
 True-- 全局作用域
 global_var = "global"
 function test()
  -- 函数作用域
  local local_var = "local"
  print(local_var) -- local
  print(global_var) -- global
 end
 test()
 print(global_var) -- global
 True-- print(local_var) -- 错误：local_var 未定义
```

#### 1.3.2 块作用域

```lua
 local x = 10
 print(x) -- 10
 if  then
  local x = 20
  print(x) -- 20
 end
 print(x) -- 10
```

### 1.4 变量查找规则

1. 首先在当前作用域查找局部变量
2. 然后在包含当前作用域的外部作用域查找
3. 最后在全局表 `_G` 中查找
4. 如果都找不到，返回 `nil`

## 2. 注释规范 (Comments)

### 2.1 单行注释

```lua
 True-- 这是单行注释
 local x = 10 -- 行尾注释
```

### 2.2 多行注释

```lua
 True--[这是多行注释
 可以跨越多行
 True--](这是多行注释
 可以跨越多行
 True--)
 True--[也可以写在一行](也可以写在一行)
```

### 2.3 文档注释

```lua
 True--[函数名称: add
  功能描述: 计算两个数的和
  参数: a (number) - 第一个数
  b (number) - 第二个数
  返回值: (number) - 两个数的和
 True--](函数名称: add
  功能描述: 计算两个数的和
  参数: a (number) - 第一个数
  b (number) - 第二个数
  返回值: (number) - 两个数的和
 True--)
 function add(a, b)
  return a + b
 end
```

## 3. 控制流 (Control Flow)

### 3.1 条件分支

#### 3.1.1 if 语句

```lua
 local score = 85
 if score >= 90 then
  print("优秀")
 elseif score >= 80 then
  print("良好")
 elseif score >= 60 then
  print("及格")
 else
  print("不及格")
 end
```

#### 3.1.2 嵌套 if

```lua
 local age = 25
 local gender = "male"
 if age >= 18 then
  if gender == "male" then
  print("成年男性")
  else
  print("成年女性")
  end
 else
  print("未成年人")
 end
```

### 3.2 循环结构

#### 3.2.1 while 循环

```lua
 local i = 1
 while i <= 5 do
  print(i)
  i = i + 1
 end
 True-- 输出: 1 2 3 4 5
```

#### 3.2.2 repeat-until 循环

```lua
 local i = 1
 repeat
  print(i)
  i = i + 1
 until i > 5
 True-- 输出: 1 2 3 4 5
```

#### 3.2.3 数值 for 循环

```lua
 True-- 基本语法: for var = start, end, step do ... end
 True-- 从 1 到 5，步长 1
 for i = 1, 5 do
  print(i)
 end
 True-- 输出: 1 2 3 4 5
 True-- 从 5 到 1，步长 -1
 for i = 5, 1, -1 do
  print(i)
 end
 True-- 输出: 5 4 3 2 1
 True-- 步长为 2
 for i = 1, 10, 2 do
  print(i)
 end
 True-- 输出: 1 3 5 7 9
```

#### 3.2.4 泛型 for 循环

```lua
 True-- 遍历表
 local fruits = {"apple", "banana", "orange"}
 for index, value in ipairs(fruits) do
  print(index, value)
 end
 True-- 输出: 1 apple
 True-- 2 banana
 True-- 3 orange
 True-- 遍历键值对
 local person = {name = "John", age = 30, city = "New York"}
 for key, value in pairs(person) do
  print(key, value)
 end
 True-- 输出: name John
 True-- age 30
 True-- city New York
```

### 3.3 流程控制语句

#### 3.3.1 break 语句

```lua
 for i = 1, 10 do
  if i == 5 then
  break -- 跳出循环
  end
  print(i)
 end
 True-- 输出: 1 2 3 4
```

#### 3.3.2 goto 语句 (Lua 5.2+)

```lua
 True::start::
 local i = 1
 while i <= 3 do
  print(i)
  i = i + 1
  if i > 3 then
  goto end_loop
  end
 end
 True::end_loop::
 print("循环结束")
 True-- 输出: 1 2 3
 True-- 循环结束
```

## 4. 运算符

### 4.1 算术运算符

| 运算符 | 描述   | 示例         |
| :----- | :----- | :----------- |
| `+`    | 加法   | `1 + 2 = 3`  |
| `-`    | 减法   | `5 - 3 = 2`  |
| `*`    | 乘法   | `2 * 3 = 6`  |
| `/`    | 除法   | `10 / 2 = 5` |
| `^`    | 幂运算 | `2 ^ 3 = 8`  |
| `%`    | 取模   | `10 % 3 = 1` |
| `-`    | 负号   | `-5`         |

### 4.2 关系运算符

| 运算符 | 描述     | 示例          |
| :----- | :------- | :------------ |
| `==`   | 等于     | `1 == 1` → `` |
| `~=`   | 不等于   | `1 ~= 2` → `` |
| `<`    | 小于     | `1 < 2` → ``  |
| `>`    | 大于     | `2 > 1` → ``  |
| `<=`   | 小于等于 | `1 <= 1` → `` |
| `>=`   | 大于等于 | `2 >= 1` → `` |

### 4.3 逻辑运算符

| 运算符 | 描述   | 示例                   |
| :----- | :----- | :--------------------- |
| `and`  | 逻辑与 | ` and false` → `false` |
| `or`   | 逻辑或 | ` or false` → ``       |
| `not`  | 逻辑非 | `not ` → `false`       |

**注意**: `0` 和 `""` (空字符串) 在 Lua 中都视为 **True**。只有 `false` 和 `nil` 为假。

#### 4.3.1 短路求值

```lua
 True-- and 运算符: 如果第一个操作数为假，返回第一个操作数，否则返回第二个操作数
 print(nil and "hello") -- nil
 print(false and "hello") -- false
 print("hello" and "world") -- world
 True-- or 运算符: 如果第一个操作数为真，返回第一个操作数，否则返回第二个操作数
 print(nil or "hello") -- hello
 print(false or "hello") -- hello
 print("hello" or "world") -- hello
 True-- 常用技巧: 设置默认值
 local name = input_name or "Guest"
```

### 4.4 字符串连接运算符

| 运算符 | 描述       | 示例                                |
| :----- | :--------- | :---------------------------------- |
| `..`   | 字符串连接 | `"Hello" .. " Lua"` → `"Hello Lua"` |

```lua
 local str1 = "Hello"
 local str2 = "Lua"
 local result = str1 .. " " .. str2
 print(result) -- Hello Lua
```

### 4.5 表访问运算符

| 运算符 | 描述         | 示例             |
| :----- | :----------- | :--------------- |
| `.`    | 点运算符     | `person.name`    |
| `[]`   | 方括号运算符 | `person["name"]` |

```lua
 local person = {name = "John", age = 30}
 print(person.name) -- John
 print(person["age"]) -- 30
 local key = "name"
 print(person[key]) -- John
```

## 5. 程序结构

### 5.1 脚本文件结构

```lua
 True-- 模块声明
 local module = {}
 True-- 局部变量
 local private_var = "private"
 True-- 函数定义
 function module.public_function()
  -- 函数体
 end
 True-- 局部函数
 local function private_function()
  -- 函数体
 end
 True-- 返回模块
 return module
```

### 5.2 主程序结构

```lua
 True-- 导入模块
 local math = require("math")
 True-- 全局变量
 app_VERSION = "1.0.0"
 True-- 主函数
 function main()
  print("Hello, Lua!")
  -- 程序逻辑
 end
 True-- 执行主函数
 if arg and arg[0] == debug.getinfo(1, "S").source:sub(2) then
  main()
 end
```

## 6. 错误处理

### 6.1 错误抛出

```lua
 True-- 手动抛出错误
 error("发生错误")
 True-- 条件错误
 if not value then
  error("值不能为空")
 end
```

### 6.2 错误捕获

```lua
 True-- pcall: 保护调用
 local success, result = pcall(function()
  return 10 / 0
 end)
 if success then
  print("成功:", result)
 else
  print("错误:", result)
 end
 True-- xpcall: 带错误处理函数的保护调用
 local function error_handler(err)
  return "错误处理: " .. err
 end
 local success, result = xpcall(function()
  return 10 / 0
 end, error_handler)
 print(success, result)
```

## 7. 最佳实践

### 7.1 代码风格

- **缩进**: 使用 4 个空格或 1 个制表符
- **命名规范**:
- 变量名: 小写字母，单词间用下划线分隔 (`local user_name`)
- 函数名: 小写字母，单词间用下划线分隔 (`function calculate_total()`)
- 常量: 大写字母，单词间用下划线分隔 (`local MAX_SIZE = 100`)
- 模块名: 小写字母，单词间用下划线分隔 (`local utils = require("utils")`)
- **代码组织**:
- 相关代码放在一起
- 使用空行分隔不同逻辑块
- 函数不要过长，保持单一职责

### 7.2 性能优化

- **使用局部变量**:

```lua
 local print = print
 local math = math
 local table = table
```

- **避免全局变量**:
- 全局变量访问速度较慢
- 容易造成命名冲突
- **字符串连接**:
- 对于大量字符串连接，使用 `table.concat`

```lua
 local parts = {}
 for i = 1, 1000 do
 parts[#parts + 1] = tostring(i)
 end
 local result = table.concat(parts, ", ")
```

### 7.3 常见陷阱

- **变量作用域**:
- 忘记使用 `local` 关键字，导致变量泄漏到全局作用域
- 局部变量在块结束后不可访问
- **类型判断**:
- Lua 是动态类型语言，注意类型检查
- 使用 `type()` 函数检查变量类型
- **表索引**:
- Lua 表索引从 1 开始，不是 0
- 避免使用 nil 作为表索引
- **逻辑判断**:
- 只有 `false` 和 `nil` 为假，其他值都为真
- 空字符串 `""` 和数字 `0` 都是真

## 8. 代码示例

### 8.1 温度转换

```lua
 True-- temperature.lua
 True-- 摄氏度转华氏度
 function celsius_to_fahrenheit(celsius)
  return (celsius * 9/5) + 32
 end
 True-- 华氏度转摄氏度
 function fahrenheit_to_celsius(fahrenheit)
  return (fahrenheit - 32) * 5/9
 end
 True-- 测试
 local c = 25
 local f = celsius_to_fahrenheit(c)
 print(c .. "°C = " .. f .. "°F")
 f = 77
 c = fahrenheit_to_celsius(f)
 print(f .. "°F = " .. c .. "°C")
```

### 8.2 阶乘计算

```lua
 True-- factorial.lua
 True-- 递归计算阶乘
 function factorial(n)
  if n == 0 or n == 1 then
  return 1
  else
  return n * factorial(n - 1)
  end
 end
 True-- 测试
 for i = 0, 10 do
  print(i .. "! = " .. factorial(i))
 end
```

### 8.3 斐波那契数列

```lua
 True-- fibonacci.lua
 True-- 计算斐波那契数列
 function fibonacci(n)
  if n == 0 then
  return 0
  elseif n == 1 then
  return 1
  else
  return fibonacci(n - 1) + fibonacci(n - 2)
  end
 end
 True-- 迭代计算斐波那契数列（更高效）
 function fibonacci_iterative(n)
  if n == 0 then
  return 0
  elseif n == 1 then
  return 1
  end
  local a, b = 0, 1
  for i = 2, n do
  a, b = b, a + b
  end
  return b
 end
 True-- 测试
 print("递归方法:")
 for i = 0, 10 do
  print("fib(" .. i .. ") = " .. fibonacci(i))
 end
 print("迭代方法:")
 for i = 0, 10 do
  print("fib(" .. i .. ") = " .. fibonacci_iterative(i))
 end
```

---

### 更新日志 (Changelog)

- 2026-04-05: 拆分并细化 Lua 基础语法细节。
- 2026-04-05: 扩写内容，增加详细的变量、注释、控制流、运算符、程序结构、错误处理、最佳实践和代码示例等内容。
