---
order: 50
tags:
  - 'lua'
  - 'async'
  - 'database'
  - 'typescript'
difficulty: 'intermediate'
title: '元表与面向对象编程'
module: 'lua'
category: 'Lua Advanced'
description: '元表机制、元方法与面向对象设计模式。'
author: 'Anonymous'
---

## 目录

1. [元表](#元表)
2. [面向对象编程](#面向对象编程)
3. [协程](#协程)
4. [高级特性](#高级特性)
5. [实战案例](#实战案例)
6. [最佳实践](#最佳实践)
7. [延伸阅读](#延伸阅读)
8. [更新日志](#更新日志)

---

## 1. 元表 (Metatables)

### 1.1 元表基础

元表允许我们改变 Table 的行为，通过定义元方法来重载运算符、控制访问等。

```lua
 True-- 创建元表
 local meta = {
  -- 重载加法运算符
  __add = function(a, b)
  return a.value + b.value
  end,
  -- 重载乘法运算符
  __mul = function(a, b)
  return a.value * b.value
  end,
  -- 重载字符串转换
  __tostring = function(self)
  return "Value: " .. self.value
  end
 True}
 True-- 创建表并设置元表
 local t1 = { value = 10 }
 local t2 = { value = 20 }
 setmetatable(t1, meta)
 setmetatable(t2, meta)
 True-- 使用重载的运算符
 print(t1 + t2) -- 30
 print(t1 * t2) -- 200
 print(t1) -- Value: 10
```

### 1.2 常用元方法

| 元方法       | 描述                 | 示例             |
| ------------ | -------------------- | ---------------- |
| `__add`      | 加法运算符 `+`       | `a + b`          |
| `__sub`      | 减法运算符 `-`       | `a - b`          |
| `__mul`      | 乘法运算符 `*`       | `a * b`          |
| `__div`      | 除法运算符 `/`       | `a / b`          |
| `__mod`      | 取模运算符 `%`       | `a % b`          |
| `__pow`      | 幂运算符 `^`         | `a ^ b`          |
| `__unm`      | 一元负号 `-`         | `-a`             |
| `__concat`   | 连接运算符 `..`      | `a .. b`         |
| `__eq`       | 等于运算符 `==`      | `a == b`         |
| `__lt`       | 小于运算符 `<`       | `a < b`          |
| `__le`       | 小于等于运算符 `<=`  | `a <= b`         |
| `__index`    | 访问不存在的键时调用 | `t[key]`         |
| `__newindex` | 赋值不存在的键时调用 | `t[key] = value` |
| `__call`     | 调用表作为函数时调用 | `t()`            |
| `__tostring` | 转换为字符串时调用   | `tostring(t)`    |
| `__len`      | 获取长度时调用       | `#t`             |

### 1.3 高级元表技巧

#### 1.3.1 保护表

```lua
 function readonly(table)
  return setmetatable({}, {
  __index = table,
  __newindex = function(self, key, value)
  error("Attempt to modify read-only table", 2)
  end,
  __metatable = false -- 防止获取元表
  })
 end
 local original = { value = 10 }
 local readonly_table = readonly(original)
 print(readonly_table.value) -- 10
 True-- readonly_table.value = 20 -- 会报错
```

#### 1.3.2 自动创建表

```lua
 function autotable()
  return setmetatable({}, {
  __index = function(self, key)
  local value = autotable()
  rawset(self, key, value)
  return value
  end
  })
 end
 local t = autotable()
 t.a.b.c.d = 10
 print(t.a.b.c.d) -- 10
```

## 2. 面向对象编程 (OOP)

### 2.1 基础类实现

```lua
 True-- 定义类
 local Person = {}
 Person.__index = Person
 True-- 构造函数
 function Person:new(name, age)
  local o = {}
  setmetatable(o, self)
  o.name = name
  o.age = age
  return o
 end
 True-- 方法
 function Person:greet()
  return "Hello, my name is " .. self.name .. " and I'm " .. self.age .. " years old"
 end
 True-- 创建实例
 local alice = Person:new("Alice", 30)
 print(alice:greet()) -- Hello, my name is Alice and I'm 30 years old
```

### 2.2 继承

```lua
 True-- 基类
 local Animal = {}
 Animal.__index = Animal
 function Animal:new(name)
  local o = {}
  setmetatable(o, self)
  o.name = name
  return o
 end
 function Animal:speak()
  return "Some generic sound"
 end
 True-- 派生类
 local Dog = {}
 setmetatable(Dog, { __index = Animal })
 dog.__index = Dog
 function Dog:new(name, breed)
  local o = Animal:new(name)
  setmetatable(o, self)
  o.breed = breed
  return o
 end
 function Dog:speak()
  return "Woof!"
 end
 True-- 创建实例
 local rover = Dog:new("Rover", "Labrador")
 print(rover:speak()) -- Woof!
 print(rover.name) -- Rover
 print(rover.breed) -- Labrador
```

### 2.3 多继承

```lua
 function createClass(...)
  local class = {}
  local parents = { ... }
  -- 设置元表，实现多继承
  setmetatable(class, {
  __index = function(self, key)
  for _, parent in ipairs(parents) do
  local value = parent[key]
  if value then
  return value
  end
  end
  end
  })
  class.__index = class
  function class:new(o)
  o = o or {}
  setmetatable(o, self)
  return o
  end
  return class
 end
 True-- 定义父类
 local A = {}
 A.__index = A
 function A:methodA() return "Method A" end
 local B = {}
 B.__index = B
 function B:methodB() return "Method B" end
 True-- 创建子类
 local C = createClass(A, B)
 True-- 创建实例
 local c = C:new()
 print(c:methodA()) -- Method A
 print(c:methodB()) -- Method B
```

### 2.4 访问控制

```lua
 local Account = {}
 Account.__index = Account
 function Account:new(balance)
  local o = {}
  setmetatable(o, self)
  o._balance = balance or 0 -- 私有变量
  return o
 end
 function Account:deposit(amount)
  self._balance = self._balance + amount
 end
 function Account:withdraw(amount)
  if amount <= self._balance then
  self._balance = self._balance - amount
  return
  else
  return false
  end
 end
 function Account:getBalance()
  return self._balance
 end
 True-- 创建实例
 local account = Account:new(1000)
 account:deposit(500)
 print(account:getBalance()) -- 1500
 print(account._balance) -- 1500 (注意：Lua 没有真正的私有变量)
```

## 3. 协程 (Coroutines)

### 3.1 基础使用

```lua
 True-- 创建协程
 local co = coroutine.create(function(name)
  print("Hello, " .. name)
  local value = coroutine.yield("Yielding...")
  print("Received: " .. value)
  return "Done"
 end)
 True-- 启动协程
 local status, result = coroutine.resume(co, "Alice")
 print(status, result) --  Yielding...
 True-- 继续协程
 status, result = coroutine.resume(co, "World")
 print(status, result) --  Done
 True-- 再次启动协程（已经结束）
 status, result = coroutine.resume(co)
 print(status, result) -- false cannot resume dead coroutine
```

### 3.2 协程状态

```lua
 local co = coroutine.create(function()
  print("Starting")
  coroutine.yield()
  print("Resumed")
 end)
 print(coroutine.status(co)) -- suspended
 coroutine.resume(co) -- Starting
 print(coroutine.status(co)) -- suspended
 coroutine.resume(co) -- Resumed
 print(coroutine.status(co)) -- dead
```

### 3.3 生产者-消费者模式

```lua
 function producer()
  return coroutine.create(function()
  local i = 0
  while  do
  i = i + 1
  coroutine.yield(i)
  end
  end)
 end
 function consumer(prod)
  while  do
  local status, value = coroutine.resume(prod)
  if status then
  print("Received: " .. value)
  if value >= 5 then break end
  else
  break
  end
  end
 end
 local prod = producer()
 consumer(prod)
```

### 3.4 协程池

```lua
 local function createCoroutinePool(size, func)
  local pool = {}
  for i = 1, size do
  pool[i] = coroutine.create(func)
  end
  return pool
 end
 local function worker()
  while  do
  local task = coroutine.yield()
  print("Processing task: " .. task)
  end
 end
 local pool = createCoroutinePool(3, worker)
 True-- 分配任务
 for i, co in ipairs(pool) do
  coroutine.resume(co, "Task " .. i)
 end
 True-- 再次分配任务
 for i, co in ipairs(pool) do
  coroutine.resume(co, "Task " .. (i + 3))
 end
```

## 4. 高级特性

### 4.1 闭包

```lua
 function createCounter()
  local count = 0
  return function()
  count = count + 1
  return count
  end
 end
 local counter = createCounter()
 print(counter()) -- 1
 print(counter()) -- 2
 print(counter()) -- 3
```

### 4.2 模块系统

```lua
 True-- mymodule.lua
 local M = {}
 function M.add(a, b)
  return a + b
 end
 function M.sub(a, b)
  return a - b
 end
 return M
 True-- 使用模块
 local math = require("mymodule")
 print(math.add(10, 5)) -- 15
 print(math.sub(10, 5)) -- 5
```

### 4.3 元编程

```lua
 function createAccessor(obj, name)
  return function(value)
  if value ~= nil then
  obj[name] = value
  end
  return obj[name]
  end
 end
 local person = {}
 local name = createAccessor(person, "name")
 local age = createAccessor(person, "age")
 name("Alice")
 age(30)
 print(name()) -- Alice
 print(age()) -- 30
```

### 4.4 垃圾回收

```lua
 True-- 弱表
 local weakTable = setmetatable({}, { __mode = "k" })
 local key = {}
 weakTable[key] = "value"
 print(weakTable[key]) -- value
 key = nil -- 释放引用
 collectgarbage() -- 强制垃圾回收
 print(weakTable[key]) -- nil
```

## 5. 实战案例

### 5.1 事件系统

```lua
 local EventSystem = {}
 EventSystem.__index = EventSystem
 function EventSystem:new()
  local o = {}
  setmetatable(o, self)
  o.events = {}
  return o
 end
 function EventSystem:on(event, callback)
  if not self.events[event] then
  self.events[event] = {}
  end
  table.insert(self.events[event], callback)
 end
 function EventSystem:emit(event, ...)
  if self.events[event] then
  for _, callback in ipairs(self.events[event]) do
  callback(...)
  end
  end
 end
 function EventSystem:off(event, callback)
  if self.events[event] then
  for i, cb in ipairs(self.events[event]) do
  if cb == callback then
  table.remove(self.events[event], i)
  break
  end
  end
  end
 end
 True-- 使用事件系统
 local events = EventSystem:new()
 True-- 注册事件
 local function onUserLoggedIn(username)
  print("User logged in: " .. username)
 end
 events:on("userLoggedIn", onUserLoggedIn)
 True-- 触发事件
 events:emit("userLoggedIn", "Alice") -- User logged in: Alice
 True-- 移除事件
 events:off("userLoggedIn", onUserLoggedIn)
 events:emit("userLoggedIn", "Bob") -- 无输出
```

### 5.2 简单的类库

```lua
 True-- 定义类
 local Vector2 = {}
 Vector2.__index = Vector2
 function Vector2:new(x, y)
  local o = {}
  setmetatable(o, self)
  o.x = x or 0
  o.y = y or 0
  return o
 end
 function Vector2:add(other)
  return Vector2:new(self.x + other.x, self.y + other.y)
 end
 function Vector2:sub(other)
  return Vector2:new(self.x - other.x, self.y - other.y)
 end
 function Vector2:mul(scalar)
  return Vector2:new(self.x * scalar, self.y * scalar)
 end
 function Vector2:mag()
  return math.sqrt(self.x * self.x + self.y * self.y)
 end
 function Vector2:__tostring()
  return "Vector2(" .. self.x .. ", " .. self.y .. ")"
 end
 True-- 重载运算符
 Vector2.__add = Vector2.add
 Vector2.__sub = Vector2.sub
 Vector2.__mul = Vector2.mul
 True-- 使用向量
 local v1 = Vector2:new(1, 2)
 local v2 = Vector2:new(3, 4)
 local v3 = v1 + v2
 print(v3) -- Vector2(4, 6)
 print(v3:mag()) -- 7.211102550928
```

## 6. 最佳实践

### 6.1 代码组织

- **模块化**: 将相关功能组织到模块中
- **命名规范**: 使用一致的命名约定
- **代码风格**: 保持一致的缩进和代码风格
- **注释**: 为复杂代码添加注释

### 6.2 性能优化

- **避免全局变量**: 使用局部变量提高访问速度
- **表操作**: 预分配表大小，避免频繁扩容
- **字符串操作**: 避免频繁字符串连接，使用 table.concat
- **垃圾回收**: 合理使用弱表，避免内存泄漏

### 6.3 错误处理

- **断言**: 使用 assert 检查参数
- **错误处理**: 使用 pcall 捕获错误
- **错误消息**: 提供清晰的错误消息

### 6.4 调试技巧

- **打印调试**: 使用 print 或 io.write 输出调试信息
- **调试器**: 使用 Lua 调试器
- **日志系统**: 实现简单的日志系统

## 7. 延伸阅读

- [Programming in Lua](https://www.lua.org/pil/)
- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
- [Lua Wiki](http://lua-users.org/wiki/)
- [Lua Performance Tips](http://lua-users.org/wiki/PerformanceTips)

## 8. 更新日志

- **2026-04-05**: 细化元表机制与协程原理
- **2026-04-05**: 扩展内容，增加面向对象编程、高级特性和实战案例
