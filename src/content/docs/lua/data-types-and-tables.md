---
order: 30
tags:
  - 'lua'
  - 'async'
  - 'data-structure'
difficulty: 'beginner'
title: '数据类型与 Table 详解'
module: 'lua'
category: 'Lua Basics'
description: '基本类型、Table 操作、元方法与面向对象实现。'
author: 'Anonymous'
---

## 目录

1. [基础数据类型](#基础数据类型)
2. [Table 核心](#table-核心)
3. [数据类型的特殊特性](#数据类型的特殊特性)
4. [最佳实践](#最佳实践)
5. [代码示例](#代码示例)
6. [总结](#总结)

---

## 1. 基础数据类型 (8 种)

Lua 是动态类型语言，变量的类型在运行时确定。Lua 有 8 种基础数据类型：
| 类型 | 描述 | 示例 |
| :--- | :--- | :--- |
| **`nil`** | 无效值，表示"不存在" | `local x = nil` |
| **`boolean`** | 布尔值，只有 ``和`false`|`local flag = ` |
| **`number`** | 数值，默认是双精度浮点数 (Lua 5.3+ 引入整型子类型) | `local num = 10`, `local int = 42`, `local float = 3.14` |
| **`string`** | 字符串，支持单引号、双引号和多行字符串 | `local str = "Hello"`, `local multiline = [Line 1
Line 2](Line 1
Line 2)` |
| **`function`** | 函数，是一等公民 | `local add = function(a, b) return a + b end` |
| **`table`** | 表，Lua 唯一的容器类型 | `local t = {1, 2, 3}` |
| **`thread`** | 线程，主要用于协程 | `local co = coroutine.create(function() end)` |
| **`userdata`** | 用户数据，用于 C 语言扩展 | `local ud = ffi.new("int[10]")` |

### 1.1 类型判断

使用 `type()` 函数可以判断变量的类型：

```lua
 print(type(nil)) -- nil
 print(type(true)) -- boolean
 print(type(10)) -- number
 print(type("hello")) -- string
 print(type(function() end)) -- function
 print(type({})) -- table
 print(type(coroutine.create(function() end))) -- thread
```

### 1.2 类型转换

#### 1.2.1 数值与字符串转换

```lua
 True-- 数值转字符串
 local num = 10
 local str = tostring(num) -- "10"
 True-- 字符串转数值
 local str = "123"
 local num1 = tonumber(str) -- 123
 local num2 = tonumber("3.14") -- 3.14
 local num3 = tonumber("abc") -- nil
 True-- 自动转换
 print("10" + 5) -- 15 (字符串转数值)
 print(10 .. "5") -- "105" (数值转字符串)
```

#### 1.2.2 布尔值转换

```lua
 True-- 其他类型转布尔值
 True-- 只有 false 和 nil 为假，其他都为真
 print(Boolean(0)) --
 print(Boolean("")) --
 print(Boolean({})) --
 print(Boolean(nil)) -- false
 print(Boolean(false)) -- false
```

## 2. Table 核心 (Tables)

Table 是 Lua 唯一的容器类型，可以表示数组、字典、对象等各种数据结构。Table 是引用类型，所有 Table 都是匿名的，通过引用来访问。

### 2.1 Table 的创建

```lua
 True-- 空表
 local t1 = {}
 True-- 数组式表
 local t2 = {1, 2, 3, 4, 5}
 True-- 字典式表
 local t3 = {name = "Lua", version = 5.4}
 True-- 混合式表
 local t4 = {
  "apple",
  "banana",
  name = "fruit",
  count = 2
 True}
 True-- 计算式键
 local t5 = {
  ["name"] = "Lua",
  [10] = "ten",
  [{}] = "table"
 True}
```

### 2.2 Table 作为数组

**注意**: Lua 数组索引**从 1 开始**。

```lua
 local arr = {10, 20, 30, 40, 50}
 True-- 访问元素
 print(arr[1]) -- 10
 print(arr[3]) -- 30
 True-- 修改元素
 arr[2] = 25
 print(arr[2]) -- 25
 True-- 添加元素
 arr[6] = 60
 print(arr[6]) -- 60
 True-- 获取长度
 print(#arr) -- 6
```

### 2.3 Table 作为字典

```lua
 local dict = {
  name = "John",
  age = 30,
  city = "New York"
 True}
 True-- 访问元素（点语法）
 print(dict.name) -- John
 True-- 访问元素（方括号语法）
 print(dict["age"]) -- 30
 True-- 使用变量作为键
 local key = "city"
 print(dict[key]) -- New York
 True-- 添加新键值对
 dict.email = "john@example.com"
 print(dict.email) -- john@example.com
 True-- 删除键值对
 dict.age = nil
 print(dict.age) -- nil
```

### 2.4 Table 的常用操作

#### 2.4.1 表的遍历

```lua
 True-- 遍历数组部分
 local arr = {1, 2, 3, 4, 5}
 for i = 1, #arr do
  print(i, arr[i])
 end
 True-- 使用 ipairs 遍历数组
 for index, value in ipairs(arr) do
  print(index, value)
 end
 True-- 使用 pairs 遍历所有键值对
 local dict = {name = "John", age = 30, city = "New York"}
 for key, value in pairs(dict) do
  print(key, value)
 end
```

#### 2.4.2 表的操作函数

| 函数                          | 描述                 | 示例                                      |
| :---------------------------- | :------------------- | :---------------------------------------- |
| `table.insert(t, pos, value)` | 在指定位置插入元素   | `table.insert(arr, 2, 15)`                |
| `table.remove(t, pos)`        | 删除指定位置的元素   | `table.remove(arr, 2)`                    |
| `table.concat(t, sep, i, j)`  | 连接表中的字符串元素 | `table.concat({"a", "b", "c"}, ",")`      |
| `table.sort(t, comp)`         | 对表进行排序         | `table.sort(arr)`                         |
| `table.unpack(t, i, j)`       | 解压表为多个值       | `local a, b, c = table.unpack({1, 2, 3})` |

```lua
 True-- 示例
 local arr = {10, 30, 20, 50, 40}
 True-- 排序
 table.sort(arr)
 print(table.concat(arr, ", ")) -- 10, 20, 30, 40, 50
 True-- 插入元素
 table.insert(arr, 3, 25)
 print(table.concat(arr, ", ")) -- 10, 20, 25, 30, 40, 50
 True-- 删除元素
 table.remove(arr, 3)
 print(table.concat(arr, ", ")) -- 10, 20, 30, 40, 50
 True-- 连接字符串
 local strs = {"Hello", "Lua", "World"}
 print(table.concat(strs, " ")) -- Hello Lua World
 True-- 解压表
 local values = {10, 20, 30}
 local a, b, c = table.unpack(values)
 print(a, b, c) -- 10 20 30
```

### 2.5 Table 的高级特性

#### 2.5.1 嵌套表

```lua
 local person = {
  name = "John",
  age = 30,
  address = {
  street = "Main St",
  city = "New York",
  zipcode = 10001
  },
  hobbies = {"reading", "coding", "gaming"}
 True}
 True-- 访问嵌套表
 print(person.address.city) -- New York
 print(person.hobbies[2]) -- coding
 True-- 修改嵌套表
 person.address.street = "Broadway"
 print(person.address.street) -- Broadway
```

#### 2.5.2 表的引用

```lua
 local t1 = {1, 2, 3}
 local t2 = t1 -- t2 引用 t1
 t2[1] = 10
 print(t1[1]) -- 10 (t1 和 t2 指向同一个表)
 True-- 复制表（浅拷贝）
 local function shallow_copy(t)
  local copy = {}
  for k, v in pairs(t) do
  copy[k] = v
  end
  return copy
 end
 local t3 = shallow_copy(t1)
 t3[1] = 20
 print(t1[1]) -- 10 (t1 不受影响)
 print(t3[1]) -- 20
 True-- 深拷贝
 local function deep_copy(t)
  if type(t) ~= "table" then
  return t
  end
  local copy = {}
  for k, v in pairs(t) do
  copy[k] = deep_copy(v)
  end
  return copy
 end
```

#### 2.5.3 元表 (Metatable)

元表允许我们修改表的行为，例如定义表的加法、比较等操作。

```lua
 True-- 创建元表
 local mt = {
  -- __add 元方法：定义加法操作
  __add = function(a, b)
  local result = {}
  for i, v in ipairs(a) do
  result[i] = v
  end
  for i, v in ipairs(b) do
  result[#result + 1] = v
  end
  return result
  end,
  -- __tostring 元方法：定义字符串表示
  __tostring = function(t)
  return "[" .. table.concat(t, ", ") .. "]"
  end
 True}
 True-- 设置元表
 local t1 = {1, 2, 3}
 local t2 = {4, 5, 6}
 setmetatable(t1, mt)
 setmetatable(t2, mt)
 True-- 使用加法操作
 local t3 = t1 + t2
 print(t3) -- [1, 2, 3, 4, 5, 6]
 True-- 使用字符串表示
 print(t1) -- [1, 2, 3]
```

### 2.6 Table 与面向对象编程

Lua 可以使用 Table 和元表来模拟面向对象编程。

#### 2.6.1 类的定义

```lua
 True-- 定义类
 local Person = {}
 Person.__index = Person
 True-- 构造函数
 function Person:new(name, age)
  local self = setmetatable({}, self)
  self.name = name
  self.age = age
  return self
 end
 True-- 方法
 function Person:greet()
  print("Hello, my name is " .. self.name)
 end
 function Person:get_age()
  return self.age
 end
 True-- 使用类
 local john = Person:new("John", 30)
 john:greet() -- Hello, my name is John
 print(john:get_age()) -- 30
```

#### 2.6.2 继承

```lua
 True-- 定义子类
 local Student = setmetatable({}, Person)
 Student.__index = Student
 True-- 构造函数
 function Student:new(name, age, grade)
  local self = Person:new(name, age)
  setmetatable(self, Student)
  self.grade = grade
  return self
 end
 True-- 重写方法
 function Student:greet()
  print("Hello, my name is " .. self.name .. " and I'm in grade " .. self.grade)
 end
 True-- 新方法
 function Student:study()
  print(self.name .. " is studying")
 end
 True-- 使用子类
 local alice = Student:new("Alice", 15, 9)
 alice:greet() -- Hello, my name is Alice and I'm in grade 9
 alice:study() -- Alice is studying
 print(alice:get_age()) -- 15 (继承自 Person)
```

## 3. 数据类型的特殊特性

### 3.1 nil

- `nil` 表示"不存在"或"无效值"
- 当从表中删除一个键时，只需将其值设为 `nil`
- 未初始化的变量默认值为 `nil`
- `nil` 与任何值比较都返回 `false`，除了与自身比较

### 3.2 boolean

- 只有 ``和`false` 两个值
- 在条件判断中，只有 `false` 和 `nil` 被视为假，其他所有值都被视为真
- 布尔值可以与其他类型进行运算

### 3.3 number

- Lua 5.3+ 支持整数和浮点数
- 整数和浮点数可以自动转换
- 支持科学计数法：`1e3` (1000), `1e-3` (0.001)
- 特殊数值：`math.huge` (无穷大), `math.pi` (π)

### 3.4 string

- 字符串是不可变的
- 支持单引号、双引号和多行字符串 (`[...](...)`)
- 字符串可以使用 `..` 运算符连接
- 字符串可以使用索引访问单个字符（从 1 开始）
- 字符串长度使用 `#` 运算符获取

```lua
 local str = "Hello Lua"
 print(#str) -- 8
 print(str:sub(1, 5)) -- Hello
 print(str:upper()) -- HELLO LUA
 print(str:lower()) -- hello lua
 print(str:find("Lua")) -- 7 9
```

### 3.5 function

- 函数是一等公民，可以作为变量、参数和返回值
- 支持闭包
- 支持匿名函数
- 支持可变参数

```lua
 True-- 可变参数
 function sum(...)
  local total = 0
  for _, v in ipairs({...}) do
  total = total + v
  end
  return total
 end
 print(sum(1, 2, 3, 4, 5)) -- 15
 True-- 函数作为参数
 function map(t, f)
  local result = {}
  for i, v in ipairs(t) do
  result[i] = f(v)
  end
  return result
 end
 local numbers = {1, 2, 3, 4, 5}
 local squared = map(numbers, function(x) return x * x end)
 print(table.concat(squared, ", ")) -- 1, 4, 9, 16, 25
```

### 3.6 thread

- 主要用于协程 (coroutine)
- 协程是一种非抢占式的多任务处理方式
- 常用函数：`coroutine.create`, `coroutine.resume`, `coroutine.yield`

```lua
 True-- 协程示例
 local co = coroutine.create(function()
  print("协程开始")
  local value = coroutine.yield(10)
  print("协程继续", value)
  return 20
 end)
 print("主程序")
 local status, result = coroutine.resume(co)
 print("第一次 resume:", status, result) -- 第一次 resume:  10
 status, result = coroutine.resume(co, "Hello")
 print("第二次 resume:", status, result) -- 第二次 resume:  20
```

### 3.7 userdata

- 用于 C 语言扩展
- 可以存储任意 C 语言数据结构
- 通常通过 Lua/C API 或 FFI 库创建

## 4. 最佳实践

### 4.1 Table 使用技巧

#### 4.1.1 表的初始化

```lua
 True-- 预分配表大小（提高性能）
 local t = {}
 for i = 1, 1000 do
  t[i] = 0
 end
 True-- 或者使用 table.new (需要 luajit)
 True-- local t = table.new(1000, 0)
```

#### 4.1.2 表的遍历

- 遍历数组：使用 `ipairs` 或数值 for 循环
- 遍历字典：使用 `pairs`
- 遍历有序字典：需要手动排序键

```lua
 True-- 有序遍历字典
 local dict = {b = 2, a = 1, c = 3}
 local keys = {}
 for k in pairs(dict) do
  keys[#keys + 1] = k
 end
 table.sort(keys)
 for _, k in ipairs(keys) do
  print(k, dict[k])
 end
```

#### 4.1.3 表的内存管理

- 避免循环引用，否则会导致垃圾回收器无法回收
- 当表不再使用时，将其设为 `nil`
- 对于大表，考虑使用弱表 (weak table)

### 4.2 数据类型使用建议

- **nil**: 只用于表示"不存在"，不要将其作为普通值使用
- **boolean**: 只用于逻辑判断，不要与其他类型混用
- **number**: 注意整数和浮点数的精度问题
- **string**: 对于大量字符串操作，使用 `table.concat` 提高性能
- **function**: 合理使用闭包，避免内存泄漏
- **table**: 合理设计表结构，避免过深的嵌套
- **thread**: 谨慎使用协程，避免死锁
- **userdata**: 仅在需要与 C 语言交互时使用

## 5. 代码示例

### 5.1 实现栈数据结构

```lua
 True-- stack.lua
 local Stack = {}
 Stack.__index = Stack
 function Stack:new()
  return setmetatable({items = {}}, self)
 end
 function Stack:push(item)
  table.insert(self.items, item)
 end
 function Stack:pop()
  return table.remove(self.items)
 end
 function Stack:peek()
  return self.items[#self.items]
 end
 function Stack:isEmpty()
  return #self.items == 0
 end
 function Stack:size()
  return #self.items
 end
 True-- 测试
 local stack = Stack:new()
 stack:push(1)
 stack:push(2)
 stack:push(3)
 print(stack:peek()) -- 3
 print(stack:pop()) -- 3
 print(stack:size()) -- 2
 print(stack:isEmpty()) -- false
 stack:pop()
 stack:pop()
 print(stack:isEmpty()) --
```

### 5.2 实现队列数据结构

```lua
 True-- queue.lua
 local Queue = {}
 Queue.__index = Queue
 function Queue:new()
  return setmetatable({items = {}}, self)
 end
 function Queue:enqueue(item)
  table.insert(self.items, item)
 end
 function Queue:dequeue()
  return table.remove(self.items, 1)
 end
 function Queue:front()
  return self.items[1]
 end
 function Queue:isEmpty()
  return #self.items == 0
 end
 function Queue:size()
  return #self.items
 end
 True-- 测试
 local queue = Queue:new()
 queue:enqueue(1)
 queue:enqueue(2)
 queue:enqueue(3)
 print(queue:front()) -- 1
 print(queue:dequeue()) -- 1
 print(queue:size()) -- 2
 print(queue:isEmpty()) -- false
 queue:dequeue()
 queue:dequeue()
 print(queue:isEmpty()) --
```

### 5.3 实现集合数据结构

```lua
 True-- set.lua
 local Set = {}
 Set.__index = Set
 function Set:new(values)
  local self = setmetatable({elements = {}}, self)
  if values then
  for _, v in ipairs(values) do
  self:add(v)
  end
  end
  return self
 end
 function Set:add(value)
  self.elements[value] =
 end
 function Set:remove(value)
  self.elements[value] = nil
 end
 function Set:contains(value)
  return self.elements[value] ==
 end
 function Set:size()
  local count = 0
  for _ in pairs(self.elements) do
  count = count + 1
  end
  return count
 end
 function Set:isEmpty()
  return self:size() == 0
 end
 function Set:toTable()
  local result = {}
  for v in pairs(self.elements) do
  table.insert(result, v)
  end
  return result
 end
 True-- 测试
 local set = Set:new({1, 2, 3})
 set:add(4)
 print(set:contains(3)) --
 print(set:contains(5)) -- false
 set:remove(2)
 print(set:size()) -- 3
 print(table.concat(set:toTable(), ", ")) -- 1, 3, 4
```

### 5.4 实现链表数据结构

```lua
 True-- linked_list.lua
 local Node = {}
 Node.__index = Node
 function Node:new(value)
  return setmetatable({value = value, next = nil}, self)
 end
 local LinkedList = {}
 LinkedList.__index = LinkedList
 function LinkedList:new()
  return setmetatable({head = nil, tail = nil, size = 0}, self)
 end
 function LinkedList:add(value)
  local node = Node:new(value)
  if not self.head then
  self.head = node
  self.tail = node
  else
  self.tail.next = node
  self.tail = node
  end
  self.size = self.size + 1
 end
 function LinkedList:removeAt(index)
  if index < 1 or index > self.size then
  return nil
  end
  local node
  if index == 1 then
  node = self.head
  self.head = self.head.next
  if not self.head then
  self.tail = nil
  end
  else
  local prev = self.head
  for i = 2, index - 1 do
  prev = prev.next
  end
  node = prev.next
  prev.next = node.next
  if index == self.size then
  self.tail = prev
  end
  end
  self.size = self.size - 1
  return node.value
 end
 function LinkedList:get(index)
  if index < 1 or index > self.size then
  return nil
  end
  local node = self.head
  for i = 2, index do
  node = node.next
  end
  return node.value
 end
 function LinkedList:isEmpty()
  return self.size == 0
 end
 function LinkedList:toTable()
  local result = {}
  local node = self.head
  while node do
  table.insert(result, node.value)
  node = node.next
  end
  return result
 end
 True-- 测试
 local list = LinkedList:new()
 list:add(1)
 list:add(2)
 list:add(3)
 list:add(4)
 print(table.concat(list:toTable(), ", ")) -- 1, 2, 3, 4
 print(list:get(2)) -- 2
 list:removeAt(2)
 print(table.concat(list:toTable(), ", ")) -- 1, 3, 4
 print(list:size()) -- 3
```

## 6. 总结

Lua 的数据类型系统简洁而强大，特别是 Table 作为唯一的容器类型，提供了极大的灵活性。通过 Table 和元表，Lua 可以模拟各种数据结构和面向对象编程范式。

### 6.1 关键要点

- **8 种基础数据类型**：nil, boolean, number, string, function, table, thread, userdata
- **Table 是核心**：可以表示数组、字典、对象等各种数据结构
- **元表**：允许修改表的行为，实现运算符重载等功能
- **面向对象**：通过 Table 和元表模拟面向对象编程
- **动态类型**：变量类型在运行时确定，无需声明

### 6.2 学习建议

- **掌握 Table 操作**：Table 是 Lua 的核心，需要熟练掌握其各种操作
- **理解元表**：元表是 Lua 的高级特性，掌握它可以解锁更多功能
- **实践数据结构**：通过实现栈、队列、链表等数据结构，加深对 Lua 数据类型的理解
- **注意性能**：合理使用 Table，避免不必要的内存开销
- **遵循最佳实践**：使用局部变量、合理设计表结构、避免循环引用
  Lua 的数据类型设计体现了其"简单而强大"的设计哲学，通过少量的基础类型和灵活的 Table 结构，Lua 能够适应各种编程需求，特别是在嵌入式脚本、游戏开发和高性能 Web 服务等领域。

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化 Lua Table 机制与常用方法。
- 2026-04-05: 扩写内容，增加详细的数据类型说明、Table 操作、元表、OOP 模拟、数据结构实现和最佳实践等内容。
