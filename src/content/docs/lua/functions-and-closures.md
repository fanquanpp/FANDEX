---
order: 30
tags:
  - 'lua'
  - 'async'
  - 'performance'
  - 'functional'
difficulty: 'intermediate'
title: '04-函数与闭包'
module: 'lua'
category: 'Lua Basics'
description: 'Lua函数定义、闭包与高阶函数'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [函数基础 | Function Basics](#函数基础-|-function-basics)
2. [闭包 | Closures](#闭包-|-closures)
3. [高阶函数 | Higher-Order Functions](#高阶函数-|-higher-order-functions)
4. [尾调用优化 | Tail Call Optimization](#尾调用优化-|-tail-call-optimization)
5. [实践案例 | Practical Examples](#实践案例-|-practical-examples)
6. [总结 | Summary](#总结-|-summary)

---

## 1. 函数基础 | Function Basics

### 1.1 函数定义与调用

在 Lua 中，函数是一种值，可以像其他值一样存储、传递和返回。函数定义有两种方式：

```lua
 True-- 方式一：标准函数定义
 function add(a, b)
  return a + b
 end
 True-- 方式二：函数表达式
 local multiply = function(a, b)
  return a * b
 end
 True-- 调用函数
 print(add(1, 2)) -- 输出 3
 print(multiply(3, 4)) -- 输出 12
```

### 1.2 多返回值

Lua 函数可以返回多个值，这是 Lua 的一个重要特性：

```lua
 function getMinMax(a, b, c)
  local min = math.min(a, b, c)
  local max = math.max(a, b, c)
  return min, max
 end
 local minVal, maxVal = getMinMax(10, 5, 8)
 print("最小值:", minVal) -- 输出 5
 print("最大值:", maxVal) -- 输出 10
```

### 1.3 可变参数

使用 `...` 表示可变参数：

```lua
 function sum(...)
  local total = 0
  for i, v in ipairs({...}) do
  total = total + v
  end
  return total
 end
 print(sum(1, 2, 3, 4, 5)) -- 输出 15
```

## 2. 闭包 | Closures

### 2.1 闭包的概念

闭包是一个函数，它可以访问其定义环境中的变量，即使在定义环境不存在的情况下：

```lua
 function createCounter()
  local count = 0
  return function()
  count = count + 1
  return count
  end
 end
 local counter1 = createCounter()
 local counter2 = createCounter()
 print(counter1()) -- 输出 1
 print(counter1()) -- 输出 2
 print(counter2()) -- 输出 1（独立的计数器）
```

### 2.2 闭包的应用

闭包在 Lua 中非常常用，特别是在以下场景：

- **封装私有变量**：通过闭包创建私有变量，实现信息隐藏
- **回调函数**：创建带有上下文的回调函数
- **函数工厂**：根据参数创建不同行为的函数

```lua
 True-- 封装私有变量
 function createPerson(name)
  local age = 0
  return {
  setAge = function(newAge)
  age = newAge
  end,
  getAge = function()
  return age
  end,
  getName = function()
  return name
  end
  }
 end
 local person = createPerson("张三")
 person.setAge(30)
 print(person.getName(), "的年龄是", person.getAge()) -- 输出 张三 的年龄是 30
```

## 3. 高阶函数 | Higher-Order Functions

高阶函数是指接受函数作为参数或返回函数的函数：

```lua
 True-- 接受函数作为参数
 function apply(func, value)
  return func(value)
 end
 True-- 返回函数
 function createMultiplier(factor)
  return function(n)
  return n * factor
  end
 end
 local double = createMultiplier(2)
 local triple = createMultiplier(3)
 print(apply(double, 5)) -- 输出 10
 print(apply(triple, 5)) -- 输出 15
```

## 4. 尾调用优化 | Tail Call Optimization

Lua 支持尾调用优化，当函数的最后一个动作是调用另一个函数时，不会创建新的栈帧：

```lua
 function factorial(n, acc)
  acc = acc or 1
  if n <= 1 then
  return acc
  end
  -- 尾调用：函数最后一个动作是调用自身
  return factorial(n - 1, n * acc)
 end
 print(factorial(10000)) -- 不会栈溢出，因为使用了尾调用优化
```

## 5. 实践案例 | Practical Examples

### 5.1 事件处理器

```lua
 function createEventHandler()
  local listeners = {}
  return {
  on = function(event, callback)
  if not listeners[event] then
  listeners[event] = {}
  end
  table.insert(listeners[event], callback)
  end,
  emit = function(event, ...)
  if listeners[event] then
  for _, callback in ipairs(listeners[event]) do
  callback(...)
  end
  end
  end
  }
 end
 True-- 使用示例
 local eventBus = createEventHandler()
 eventBus.on("userLoggedIn", function(username)
  print("用户登录:", username)
 end)
 eventBus.emit("userLoggedIn", "admin") -- 输出 用户登录: admin
```

### 5.2 函数记忆化

```lua
 function memoize(func)
  local cache = {}
  return function(...)
  local key = table.concat({...}, "_")
  if not cache[key] then
  cache[key] = func(...)
  end
  return cache[key]
  end
 end
 True-- 计算斐波那契数列（使用记忆化）
 local fib = memoize(function(n)
  if n <= 1 then
  return n
  end
  return fib(n - 1) + fib(n - 2)
 end)
 print(fib(40)) -- 快速计算，因为结果被缓存了
```

## 6. 总结 | Summary

- 函数是 Lua 中的一等公民，可以像其他值一样处理
- 多返回值是 Lua 的一个重要特性，方便函数返回多个结果
- 闭包允许函数访问其定义环境中的变量，实现信息隐藏和状态保持
- 高阶函数使代码更加灵活和模块化
- 尾调用优化避免了递归函数的栈溢出问题
  通过掌握函数和闭包的使用，可以编写更加优雅、模块化的 Lua 代码，特别是在游戏开发和嵌入式系统中。
