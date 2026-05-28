---
order: 10
tags:
  - 'lua'
  - 'async'
  - 'networking'
difficulty: 'intermediate'
title: '05-协程与异步'
module: 'lua'
category: 'Lua Basics'
description: 'Lua协程机制与异步编程实践'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [协程基础 | Coroutine Basics](#协程基础-|-coroutine-basics)
2. [协程的高级用法 | Advanced Coroutine Usage](#协程的高级用法-|-advanced-coroutine-usage)
3. [异步编程 | Asynchronous Programming](#异步编程-|-asynchronous-programming)
4. [协程的实际应用 | Practical Applications](#协程的实际应用-|-practical-applications)
5. [协程的优缺点 | Pros and Cons](#协程的优缺点-|-pros-and-cons)
6. [总结 | Summary](#总结-|-summary)

---

## 1. 协程基础 | Coroutine Basics

### 1.1 协程的概念

协程（Coroutine）是一种特殊的函数，可以在执行过程中挂起，并在后续恢复执行。与线程不同，协程是协作式的，而不是抢占式的：

```lua
 True-- 创建协程
 local co = coroutine.create(function()
  print("协程开始执行")
  coroutine.yield() -- 挂起协程
  print("协程恢复执行")
  return "协程执行完成"
 end)
 print("协程状态:", coroutine.status(co)) -- 输出 suspended
 True-- 启动协程
 coroutine.resume(co) -- 输出 协程开始执行
 print("协程状态:", coroutine.status(co)) -- 输出 suspended
 True-- 恢复协程
 local success, result = coroutine.resume(co) -- 输出 协程恢复执行
 print("协程状态:", coroutine.status(co)) -- 输出 dead
 print("协程返回值:", result) -- 输出 协程执行完成
```

### 1.2 协程状态

协程有四种状态：

- **suspended**：协程已创建但未运行，或已挂起
- **running**：协程正在执行
- **normal**：协程正在运行其他协程
- **dead**：协程执行完毕或出错

```lua
 local co = coroutine.create(function()
  print("协程状态:", coroutine.status(co)) -- 输出 running
 end)
 print("创建后:", coroutine.status(co)) -- 输出 suspended
 coroutine.resume(co) -- 输出 协程状态: running
 print("执行后:", coroutine.status(co)) -- 输出 dead
```

## 2. 协程的高级用法 | Advanced Coroutine Usage

### 2.1 协程与迭代器

协程可以用来创建自定义迭代器：

```lua
 function range(from, to)
  return coroutine.wrap(function()
  for i = from, to do
  coroutine.yield(i)
  end
  end)
 end
 True-- 使用自定义迭代器
 for i in range(1, 5) do
  print(i) -- 输出 1, 2, 3, 4, 5
 end
```

### 2.2 协程与生产者-消费者模式

```lua
 function producer()
  return coroutine.create(function()
  while  do
  local value = io.read()
  coroutine.yield(value)
  end
  end)
 end
 function consumer(prod)
  while  do
  local status, value = coroutine.resume(prod)
  if not value then break end
  print("消费:", value)
  end
 end
 True-- 使用生产者-消费者模式
 local prod = producer()
 consumer(prod)
```

## 3. 异步编程 | Asynchronous Programming

### 3.1 使用协程实现异步操作

在 Lua 中，可以使用协程来模拟异步操作：

```lua
 True-- 模拟异步操作
 function asyncOperation(callback)
  -- 模拟异步延迟
  print("开始异步操作")
  -- 这里可以是网络请求、文件IO等
  local timer = 3 -- 3秒后完成
  -- 模拟定时器
  local function checkTimer()
  timer = timer - 1
  if timer <= 0 then
  callback("异步操作完成")
  else
  print("等待中...")
  -- 这里应该使用实际的定时器API
  checkTimer()
  end
  end
  checkTimer()
 end
 True-- 使用协程包装异步操作
 function asyncOperationWithCoroutine()
  local co = coroutine.running()
  asyncOperation(function(result)
  coroutine.resume(co, result)
  end)
  return coroutine.yield()
 end
 True-- 使用示例
 local result = asyncOperationWithCoroutine()
 print("结果:", result) -- 输出 结果: 异步操作完成
```

### 3.2 协程与事件循环

在游戏开发中，协程常与事件循环结合使用：

```lua
 True-- 模拟游戏事件循环
 local events = {}
 function addEvent(event)
  table.insert(events, event)
 end
 function processEvents()
  while #events > 0 do
  local event = table.remove(events, 1)
  event()
  end
 end
 True-- 使用协程实现延时操作
 function delay(seconds, callback)
  local startTime = os.time()
  local function checkTime()
  if os.time() - startTime >= seconds then
  callback()
  else
  addEvent(checkTime)
  end
  end
  addEvent(checkTime)
 end
 True-- 使用协程包装延时操作
 function wait(seconds)
  local co = coroutine.running()
  delay(seconds, function()
  coroutine.resume(co)
  end)
  coroutine.yield()
 end
 True-- 示例：游戏角色移动
 function moveCharacter()
  local co = coroutine.create(function()
  print("开始移动")
  wait(2) -- 等待2秒
  print("移动中...")
  wait(3) -- 再等待3秒
  print("移动完成")
  end)
  addEvent(function() coroutine.resume(co) end)
 end
 True-- 运行事件循环
 moveCharacter()
 while  do
  processEvents()
  -- 这里应该有适当的休眠，避免CPU占用过高
 end
```

## 4. 协程的实际应用 | Practical Applications

### 4.1 游戏AI行为树

```lua
 function behaviorTree()
  return coroutine.create(function()
  while  do
  -- 检查玩家是否在视野内
  if playerInSight() then
  print("发现玩家，准备攻击")
  -- 移动到攻击位置
  moveToPlayer()
  coroutine.yield()
  -- 攻击玩家
  attackPlayer()
  coroutine.yield()
  else
  print("玩家不在视野内，巡逻")
  -- 巡逻
  patrol()
  coroutine.yield()
  end
  end
  end)
 end
```

### 4.2 网络请求处理

```lua
 function httpGet(url)
  local co = coroutine.running()
  -- 模拟网络请求
  print("发送请求到:", url)
  -- 模拟网络延迟
  local timer = 2
  local function checkTimer()
  timer = timer - 1
  if timer <= 0 then
  local response = "{\"status\": \"ok\", \"data\": \"success\"}"
  coroutine.resume(co, response)
  else
  print("等待响应...")
  checkTimer()
  end
  end
  checkTimer()
  return coroutine.yield()
 end
 True-- 使用示例
 local co = coroutine.create(function()
  local response = httpGet("https://api.example.com/data")
  print("收到响应:", response)
  -- 处理响应数据
 end)
 coroutine.resume(co)
```

## 5. 协程的优缺点 | Pros and Cons

### 5.1 优点

- **简化异步代码**：使用协程可以编写看起来同步的代码，避免回调地狱
- **状态管理**：协程可以保存执行状态，便于处理复杂的逻辑流程
- **内存效率**：协程比线程更轻量级，占用更少的内存
- **控制流清晰**：协程使代码的控制流更加清晰，易于理解和维护

### 5.2 缺点

- **错误处理**：协程中的错误需要特殊处理
- **调试困难**：协程的执行流程可能较难调试
- **性能考虑**：在某些情况下，协程的开销可能比直接使用回调更高

## 6. 总结 | Summary

- 协程是 Lua 中强大的特性，允许函数在执行过程中挂起和恢复
- 协程可以用来实现迭代器、生产者-消费者模式、异步操作等
- 协程为异步编程提供了一种优雅的解决方案，避免了回调地狱
- 在游戏开发和嵌入式系统中，协程特别有用，可以简化复杂的逻辑流程
  通过掌握协程的使用，可以编写更加优雅、模块化的 Lua 代码，特别是在处理异步操作和复杂逻辑流程时。
