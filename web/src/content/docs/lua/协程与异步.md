---
order: 70
title: 协程与异步
module: lua
category: 'dev-lang'
difficulty: advanced
description: 'Lua 协程与异步编程深度解析：协作式调度语义、CPS 变换、生成器与 Promise、async/await 模式、工程级异步框架设计与多领域实战案例'
author: fanquanpp
updated: '2026-07-21'
tags:
  - lua
  - coroutine
  - async
  - concurrency
  - generators
  - advanced
related:
  - lua/函数与闭包
  - lua/环境与全局变量管理
  - lua/弱表
  - lua/元表与元方法详解
  - lua/模块与包
prerequisites:
  - lua/概述与环境配置
  - lua/函数与闭包
  - lua/元表与元方法详解
---

# 协程与异步

> 本文档对标 MIT 6.005 Software Construction、Stanford CS110 Principles of Computer Systems、CMU 15-440 Distributed Systems 中并发与异步教学水准,面向 0 基础自学者与企业级 Lua 工程师,系统讲解 Lua 协程（coroutine）的协作式调度语义、异步编程范式、生成器与 Promise 模型、async/await 模拟、工程级异步框架设计与 Redis/Nginx/游戏脚本等多领域实战案例。

## 1. 学习目标

学习本章后,读者应能在 Bloom 认知层级框架下达成下列目标。

### 1.1 知识层（Remembering）

- 列举 Lua 协程的四种状态:suspended、running、normal、dead。
- 复述 `coroutine.create`、`coroutine.resume`、`coroutine.yield`、`coroutine.wrap`、`coroutine.status`、`coroutine.running`、`coroutine.isyieldable` 的签名与语义。
- 描述 Lua 协程的非抢占式（cooperative）调度模型与操作系统线程的抢占式（preemptive）调度的本质差异。
- 列举 Lua 5.0、5.1、5.2、5.3、5.4、5.5 中协程 API 的演化与新增（如 Lua 5.3 的 `coroutine.isyieldable`、Lua 5.4 的元方法增强）。

### 1.2 理解层（Understanding）

- 解释协程与调用栈的交互:协程拥有独立栈,但宿主线程同一时刻只有一个 running 协程。
- 阐释 `coroutine.yield` 的控制转移语义:从协程跳回 resume 调用者,而非任意调度器。
- 描述对称协程（symmetric coroutine）与非对称协程（asymmetric coroutine）的区分,Lua 属于后者。
- 解释协程如何天然表达 continuation-passing style（CPS）,以及与 call/cc 的关系。
- 描述 Lua 协程的栈实现:C 栈 + Lua 栈双重结构,`lua_CFunction` 与 `lua_resume` 的协作。

### 1.3 应用层（Applying）

- 编写协程实现自定义迭代器（generator pattern）。
- 使用协程构建生产者-消费者、管道（pipeline）、生成器组合器。
- 应用协程封装回调式异步 IO,模拟 async/await 同步书写风格。
- 编写带超时与取消（cancellation）语义的异步任务调度器。
- 在游戏脚本、Nginx/OpenResty、Neovim 等宿主中应用协程实现非阻塞逻辑。

### 1.4 分析层（Analyzing）

- 分析协程与闭包 upvalue 的交互:协程内捕获的 upvalue 是否跨协程共享。
- 区分协程错误传播路径:resume 失败的返回值、`pcall` 包裹 resume 的语义差异。
- 分析协程泄漏（leaked coroutine）的成因:resume 后未完成的协程占用栈与 upvalue。
- 分析 Lua 协程与操作系统线程在 IO 密集与 CPU 密集任务下的性能差异。
- 分析 LuaJIT、Luau、PicoLua 等方言对协程语义的扩展或限制。

### 1.5 评价层（Evaluating）

- 评判 Lua 协程相较于 Python generator、JavaScript async/await、Go goroutine 的表达力与可组合性。
- 评估协程在嵌入式内存受限环境下的代价:每个协程栈的初始大小与增长策略。
- 评判 callback hell、Promise、async/await、协程四种异步范式的优劣。
- 评估 OpenResty `ngx.coroutine`、Luvit、Turbo.lua 等异步框架的设计权衡。

### 1.6 创造层（Creating）

- 设计基于协程的多任务调度器,支持优先级、定时器、IO 事件集成。
- 构建可取消的 Promise 库,支持 `all`、`race`、`all_settled`、`any` 等组合子。
- 设计 async/await 语法糖的宏展开实现（如 Lpeg 解析 + 代码生成）。
- 构建协程池（worker pool）框架,处理 CPU 密集任务的并发限制。
- 设计可观测的异步框架,集成 trace、metrics、backpressure 机制。

## 2. 历史动机与演化

### 2.1 协程理论的起源

协程（coroutine）的概念最早由 Melvin Conway 于 1958 年提出,用于 COBOL 编译器的语法分析。Conway 期望一种可以"互相让出控制权"的程序结构,使分析器与词法器能像两个对话者一样交替执行,而非通过显式的调用-返回耦合。

协程与函数（subroutine）的本质区别:

- **函数**:严格栈式调用,被调用者必须返回调用者,呈现树形结构。
- **协程**:对称或非对称的"让出-恢复"机制,可暂停于任意点,呈现图结构。

协程理论后续被 Unix pipe、Unix `setjmp`/`longjmp`、Scheme `call/cc`、Python generator、JavaScript async/await、Go goroutine 等广泛吸收,成为现代异步编程的核心。

### 2.2 Lua 在游戏/嵌入式/脚本领域的地位

Lua 作为嵌入式语言,协程是其原生并发原语。Lua 的设计目标决定了协程的演化路径:

- **游戏脚本**:魔兽世界（WoW）、Love2D、Roblox 大量使用协程实现延迟动画、AI 行为树、对话系统。
- **嵌入式**:路由器固件、IoT 设备使用协程处理多路 IO,避免线程内存开销。
- **Web 服务**:OpenResty、Lapis、Turbo.lua 使用协程封装非阻塞 IO,实现单 worker 万级并发。
- **脚本扩展**:Neovim、Redis（部分场景）使用协程处理用户脚本的超时与中断。
- **桌面应用**:Lua 与 C 宿主通过协程实现交互式 REPL、调试器暂停。

### 2.3 演化时间线

| 版本 | 年份 | 协程相关变化 |
| --- | --- | --- |
| Lua 2.5 | 1996 | 早期"协程"实验,基于 `for` 泛型迭代器,无独立栈 |
| Lua 5.0 | 2003 | 正式引入完整协程 API: `create`/`resume`/`yield`/`wrap`/`status` |
| Lua 5.1 | 2006 | 协程稳定,LuaJIT、WoW、Redis 等广泛采用;协程栈优化 |
| Lua 5.2 | 2011 | `coroutine.running` 返回协程本身与是否主线程的标志 |
| Lua 5.3 | 2015 | 新增 `coroutine.isyieldable`,协程与整数/位运算协同 |
| Lua 5.4 | 2020 | 协程栈实现优化;`<close>` 与协程协作语义增强;GC 改进 |
| Lua 5.5 | 2025 | 协程元方法与调试钩子增强 |
| LuaJIT | 2011 | 协程实现基于 `setcontext`/`makecontext`,性能极高 |
| Luau | 2021 | Roblox 方言,协程语义与 5.1 一致,新增 `coroutine.close` |
| PicoLua | 2017 | 微控制器 Lua 子集,协程实现为 switch-based 跳转 |
| OpenResty | 2012 | `ngx.coroutine` 与 `ngx.semaphore`,用于非阻塞 HTTP 请求 |
| Luvit | 2012 | Node.js 风格异步框架,基于 libuv 与协程 |
| Turbo.lua | 2013 | 高性能 Web 框架,使用协程封装非阻塞 IO |

### 2.4 设计动机总结

Lua 引入协程的设计动机:

1. **轻量并发**:游戏脚本需要数百个独立任务,操作系统线程代价过高。
2. **状态保留**:迭代器需要保留执行状态,闭包与协程均能实现,但协程表达更自然。
3. **IO 协调**:嵌入式设备需要协调多路 IO,协程比回调更易读。
4. **可嵌入性**:Lua 协程是纯库实现,无运行时依赖,便于嵌入 C 程序。
5. **教学简洁**:协程是计算机科学核心概念,Lua 选择提供原生支持而非依赖用户实现。

## 3. 形式化定义

### 3.1 协程的状态机模型

设 $C$ 为协程集合,状态空间 $S = \{\text{suspended}, \text{running}, \text{normal}, \text{dead}\}$。状态转移函数 $\delta$:

$$
\delta : C \times \text{Event} \to S
$$

转移规则:

$$
\delta(c, \text{create}) = \text{suspended}
$$

$$
\delta(c, \text{resume} \mid c.\text{state} = \text{suspended}) = \text{running}, \quad \text{prev\_running} \to \text{normal}
$$

$$
\delta(c, \text{yield} \mid c.\text{state} = \text{running}) = \text{suspended}, \quad \text{prev\_normal} \to \text{running}
$$

$$
\delta(c, \text{return} \mid c.\text{state} = \text{running}) = \text{dead}
$$

$$
\delta(c, \text{error} \mid c.\text{state} = \text{running}) = \text{dead}
$$

约束:任一时刻至多一个协程处于 running 状态。这是非抢占式调度的形式化体现。

### 3.2 continuation 与 CPS

continuation（续延）是"计算的剩余部分",形式化为函数 $k : \text{Value} \to \text{Answer}$。直接风格（direct style）的语义:

$$
\llbracket E \rrbracket = v \quad \Rightarrow \quad \text{Answer}
$$

续延传递风格（continuation-passing style, CPS）将"返回值给调用者"改为"将值传递给显式的续延":

$$
\llbracket E \rrbracket_{\text{CPS}} = \lambda k.\, \ldots k(v) \ldots
$$

协程的 yield/resume 是 CPS 的具象化:`yield(v)` 等价于"将 $v$ 传给外部续延,并暂停;resume 等价于"将外部值传回,并恢复续延"。

### 3.3 协程的代数语义

设协程 $c$ 的执行轨迹为有限序列 $e_1, e_2, \ldots, e_n$ 其中 $e_i \in \text{Event} \cup \text{Value}$。代数规则:

- **创建**: $\text{create}(f) \to c$,$c$ 携带 $f$ 作为初始续延。
- **resume($c$, $v$)**:将 $v$ 注入 $c$ 的当前续延,执行至下次 yield 或终止。
- **yield($v$)**:将 $v$ 传出至 resume 调用者,$c$ 暂停。

协程的"控制流"在代数上等价于一棵树（调用栈）与一个图（yield 跳转）的组合,但 Lua 协程为非对称式,resume/yield 严格配对,形成栈式结构。

### 3.4 对称协程与非对称协程

- **对称协程**（symmetric coroutine）:任一协程可让出控制权给任一其他协程,需显式 `transfer(c, v)`。
- **非对称协程**（asymmetric coroutine,Lua 采用）:yield 总是回到上一次 resume 的调用者,严格父子关系。

形式化地,对称协程的控制流是图,非对称协程是树。Lua 选择非对称模型,理由:

1. **可组合性**:yield/resume 配对清晰,易于推理。
2. **可移植性**:基于 C 栈的实现在非对称模型下简单。
3. **错误传播**:严格父子关系使错误能向上冒泡。

### 3.5 协程与线程的代价模型

设 $T$ 为操作系统线程,$C$ 为 Lua 协程。

- **内存**:每个 $T$ 占用 MB 级别栈（Linux 默认 8MB）,每个 $C$ 占用 KB 级别（Lua 默认约 1KB）。
- **创建**:创建 $T$ 需陷入内核,约 10-100μs;创建 $C$ 为内存分配,约 1-10μs。
- **切换**:切换 $T$ 需陷入内核约 1-10μs;切换 $C$ 为寄存器与栈指针交换,约 0.1-1μs。
- **同步**:$T$ 需锁/原子操作;$C$ 不需同步原语（单线程）。

代价模型:

$$
\text{Cost}_{\text{coroutine}} = O(\text{stack}_\text{init}) + O(\text{switch}_\text{reg})
$$

$$
\text{Cost}_{\text{thread}} = O(\text{kernel}_\text{overhead}) + O(\text{sync})
$$

### 3.6 协程的栈实现

Lua 协程栈实现分两层:

- **C 栈**:每个协程有独立的 C 栈,用于宿主 C 函数调用。Lua 5.x 默认约 1KB,可调。
- **Lua 栈**:每个协程有独立的 Lua 值栈,用于 Lua 函数调用。

形式化地,协程 $c$ 的运行时状态:

$$
c = \langle f, S_C, S_L, \text{pc}, \text{status} \rangle
$$

其中 $S_C$ 是 C 栈,$S_L$ 是 Lua 栈,$\text{pc}$ 是程序计数器,$\text{status}$ 是状态。

LuaJIT 采用 `setcontext`/`makecontext` 直接操作 C 栈,避免双重栈;PicoLua 采用 switch-based 解释器,协程实现为状态机跳转。

### 3.7 协程的代数定律

以下是协程的代数等式,可用于代码变换与优化:

$$
\text{resume}(c, \text{yield}(v)) \equiv v
$$

$$
\text{yield}(\text{resume}(c, v)) \equiv v \quad \text{(若 } c \text{ 处于 suspended)}
$$

$$
\text{wrap}(f)() \equiv \text{resume}(\text{create}(f))
$$

$$
\text{resume}(\text{create}(\lambda.\, \text{return}\, v), \_) \equiv v
$$

这些定律为协程代码的等价变换提供理论基础,如展开迭代器、内联生成器等。

### 3.8 异步编程的范畴论模型

异步计算可形式化为 monad $M$,其 unit 与 bind 操作:

$$
\text{unit} : A \to M(A)
$$

$$
\text{bind} : M(A) \to (A \to M(B)) \to M(B)
$$

Promise 与协程均构成 monad:

- **Promise**: `Promise.resolve = unit`,`promise.then(f) = bind`。
- **Coroutine**: `coroutine.create(f)` 接收 `f : A -> M(B)`,`coroutine.resume` 揭示 `M(B)`。

async/await 是 monad 语法的 syntactic sugar,等价于:

$$
\texttt{await } m \;\equiv\; \text{bind}(m, \lambda a.\, \text{rest})
$$

形式化证明见 §4.4。

## 4. 理论推导与证明

### 4.1 协程与线程表达力等价定理

**定理 1**（协程与线程表达力等价）:任意可由线程表达的并发程序,均可由协程等价表达,反之亦然,前提是任务数量有限且不依赖内核抢占。

**证明**:

(1) 线程 → 协程:对每个线程 $T_i$,创建对应协程 $C_i$。调度器循环:

```lua
-- lua: 协程模拟线程调度
local threads = {c1, c2, c3}
local i = 1
while #threads > 0 do
  local c = threads[i]
  if coroutine.status(c) ~= "dead" then
    coroutine.resume(c)
    i = (i % #threads) + 1
  else
    table.remove(threads, i)
    if #threads > 0 then i = ((i - 1) % #threads) + 1 end
  end
end
```

每个协程需显式 `yield` 让出,等价于线程的"调度点"。

(2) 协程 → 线程:每个协程对应一个线程,在线程内运行,`yield` 通过信号量阻塞实现,`resume` 通过信号量唤醒实现。需要内核支持。

(3) 不可模拟场景:若任务依赖内核抢占（如响应外部中断）,则协程无法等价。否则,双方等价。

证毕。

### 4.2 非对称协程的栈式结构定理

**定理 2**（非对称协程控制流为树）:Lua 协程的 resume/yield 配对严格形成树形结构,无环。

**证明**:

设协程调用图为 $G = (V, E)$,边 $e = (c_1, c_2)$ 表示 $c_1$ resume 了 $c_2$。

- 任意时刻只有一个协程处于 running,其他处于 suspended 或 dead。
- $c_2$ 处于 suspended 时,$c_2$ 的 yield 必回到 resume 它的 $c_1$,即最近一次的调用边。
- 故 $G$ 是有向无环图,且每个节点至多一个"父节点"（正在 resume 它的协程）,故为森林。
- 根节点是主线程。

故 Lua 协程的控制流是树。

证毕。

注:这意味着协程无法实现真正的对称通信,需通过共享变量或显式调度器中转。

### 4.3 协程错误传播定理

**定理 3**（协程错误不跨边界传播）:若协程 $c$ 内发生未捕获错误,$c$ 转入 dead 状态,`resume` 返回 `false, err`,错误不传播至宿主线程栈（除非 `resume` 未被 `pcall` 包裹）。

**证明**:

`coroutine.resume(c, ...)` 的语义:

1. 调用栈从调用者切至 $c$。
2. 在 $c$ 内执行,若抛出错误,Lua VM 捕获并转为返回值。
3. `resume` 返回 `false, err, traceback`。
4. $c$ 进入 dead 状态,栈销毁。

```lua
-- lua: 协程错误传播
local c = coroutine.create(function()
  error("inside coroutine")
end)

local ok, err = coroutine.resume(c)
print(ok, err)  -- false    input:0:inside coroutine
print(coroutine.status(c))  -- dead

-- 主线程未受影响
print("main still alive")
```

错误不沿调用栈传播,因为 Lua VM 在 resume 边界处捕获。

证毕。

注:Lua 5.x 的 `resume` 实际上隐式包含 `pcall`,使得错误不会跨协程传播。这与 `coroutine.wrap` 不同,后者错误会重新抛出至调用者。

### 4.4 协程与 Promise 的 monad 等价定理

**定理 4**（协程与 Promise 在异步表达上 monad 等价）:Promise 与协程均可表达 monad $M$,其中 unit 与 bind 在两者中可互译。

**证明**:

(1) Promise 的 monad:
- `unit(a) = Promise.resolve(a)`
- `bind(p, f) = p.then(f)`

(2) 协程的 monad:
- `unit(a) = coroutine.wrap(function() return a end)`
- `bind(c, f)`:resume $c$,获取值 $a$,resume $f(a)$,递归。

(3) 互译:
- Promise → 协程:`await p` 等价于 `resume` 一个等待 $p$ 完成的协程。
- 协程 → Promise:每个 yield 点对应一个 Promise,resolve 后 resume。

```lua
-- lua: Promise 与协程的互译
local function await(promise)
  local co = coroutine.running()
  promise:then_(function(v) coroutine.resume(co, v) end)
  return coroutine.yield()
end

local function async(fn)
  return function(...)
    local co = coroutine.create(fn)
    coroutine.resume(co, ...)
  end
end

local function example()
  local a = await(fetch("http://x"))
  local b = await(fetch("http://y/" .. a))
  return b
end

async(example)()
```

`example` 书写为同步风格,实际为异步执行。

证毕。

### 4.5 协程泄漏定理

**定理 5**（协程泄漏的必要条件）:协程 $c$ 处于 suspended 状态但无外部 resume 引用,则 $c$ 占用的栈与 upvalue 不会被 GC 回收,直至 $c$ 本身被 GC。

**证明**:

协程 $c$ 内的局部变量与 upvalue 持有强引用,被 $c$ 自身引用。若 $c$ 仍被某全局变量或闭包持有,则 $c$ 不被回收。

```lua
-- lua: 协程泄漏
local leaked = {}
for i = 1, 1000 do
  local c = coroutine.create(function()
    local big = {}  -- 占用内存
    for j = 1, 10000 do big[j] = j end
    coroutine.yield()  -- 永久挂起
  end)
  coroutine.resume(c)  -- 启动并挂起
  leaked[i] = c  -- 持有引用,泄漏
end
collectgarbage("collect")
-- leaked 仍持有 1000 个协程及其栈
```

清理需将引用置 nil:

```lua
for i = 1, #leaked do leaked[i] = nil end
collectgarbage("collect")  -- 现在可回收
```

证毕。

注:Lua 5.4 引入 `<close>` 与 `coroutine.close`（Luau 扩展）有助于显式清理协程。

### 4.6 协程与 CPS 变换定理

**定理 6**（协程可表达 call/cc 的子集）:Lua 协程可表达 call/cc 的"逃逸续延"（escape continuation）子集,但不可表达"任意续延"（any continuation）。

**证明**:

call/cc（call-with-current-continuation）允许捕获当前续延并任意调用,包括"回到过去"。Lua 协程只能 yield 到最近 resume,不能跨多层 resume 跳转。

```lua
-- lua: 模拟 escape continuation
local function call_cc(f)
  local co = coroutine.running()
  local k = function(v)
    coroutine.yield(v)  -- 逃逸
  end
  local result = f(k)
  return result
end

local function example()
  return call_cc(function(k)
    if some_condition then
      return k("escaped")  -- 跳出
    end
    return "normal"
  end)
end
```

但不能实现:

```lua
-- 不可能:任意续延
local saved_k
local function f()
  saved_k = ...  -- 捕获续延
  ...
end
f()
-- 后续调用 saved_k(v) 回到 f 中
```

Lua 协程不支持这种"重入"（reentrant continuation）。

证毕。

### 4.7 协程与迭代器的等价定理

**定理 7**（协程是迭代器的超集）:任意 Lua 迭代器均可用协程实现,但存在非迭代器的协程用法。

**证明**:

(1) 迭代器 → 协程:Lua 泛型 `for` 的迭代器协议为 `iter(state, control)`,协程可封装:

```lua
-- lua: 协程封装迭代器
local function iter_to_coroutine(iter, state, control)
  return coroutine.wrap(function()
    while true do
      local v = iter(state, control)
      if v == nil then return end
      coroutine.yield(v)
    end
  end)
end
```

(2) 协程 → 迭代器:`coroutine.wrap` 直接返回迭代器函数。

(3) 非迭代器协程:协程可用于异步 IO、状态机、生产者-消费者等,非纯迭代场景。

证毕。

## 5. 代码示例

### 5.1 基础:协程创建与状态

```lua
-- lua: 协程基础
local co = coroutine.create(function(a, b)
  print("协程启动, 参数:", a, b)
  local c = coroutine.yield(a + b)
  print("第二次 resume, 收到:", c)
  return "完成"
end)

print("状态:", coroutine.status(co))  -- suspended

local ok, r1 = coroutine.resume(co, 10, 20)
-- 输出: 协程启动, 参数:    10    20
print("第一次 resume 返回:", ok, r1)  -- true    30

print("状态:", coroutine.status(co))  -- suspended

local ok2, r2 = coroutine.resume(co, 100)
-- 输出: 第二次 resume, 收到:    100
print("第二次 resume 返回:", ok2, r2)  -- true    完成

print("状态:", coroutine.status(co))  -- dead
```

### 5.2 coroutine.wrap 简化

```lua
-- lua: coroutine.wrap 简化
local gen = coroutine.wrap(function()
  for i = 1, 3 do
    coroutine.yield(i * i)
  end
end)

print(gen())  -- 1
print(gen())  -- 4
print(gen())  -- 9
-- print(gen())  -- 错误: cannot resume dead coroutine
```

`wrap` 返回函数,错误直接抛出,适合迭代器场景。

### 5.3 协程状态机

```lua
-- lua: 用协程实现状态机
local function state_machine()
  return coroutine.wrap(function()
    while true do
      -- 状态 A
      local input = coroutine.yield("state A")
      if input == "next" then
        -- 进入状态 B
        while true do
          input = coroutine.yield("state B")
          if input == "back" then break end
          if input == "next" then
            -- 进入状态 C
            while true do
              input = coroutine.yield("state C")
              if input == "back" then break end
              if input == "reset" then
                break  -- 回到状态 A
              end
            end
          end
        end
      end
    end
  end)
end

local sm = state_machine()
print(sm())           -- state A
print(sm("next"))    -- state B
print(sm("next"))    -- state C
print(sm("back"))    -- state B
print(sm("back"))    -- state A
print(sm("next"))    -- state B
```

### 5.4 生成器:无限斐波那契

```lua
-- lua: 无限斐波那契生成器
local function fib_gen()
  return coroutine.wrap(function()
    local a, b = 0, 1
    while true do
      coroutine.yield(a)
      a, b = b, a + b
    end
  end)
end

local gen = fib_gen()
for i = 1, 10 do
  io.write(gen(), " ")
end
-- 输出: 0 1 1 2 3 5 8 13 21 34
```

### 5.5 生产者-消费者

```lua
-- lua: 生产者-消费者模式
local function producer()
  return coroutine.create(function()
    while true do
      local x = io.read()
      if x == "quit" then return end
      coroutine.yield(x)
    end
  end)
end

local function consumer(prod)
  while true do
    local status, value = coroutine.resume(prod)
    if not status or value == nil then break end
    print("消费:", value)
  end
end

local prod = producer()
consumer(prod)
```

### 5.6 管道（pipeline）

```lua
-- lua: 协程管道
local function pipe(source, filter)
  return coroutine.wrap(function()
    for v in source do
      local result = filter(v)
      if result ~= nil then
        coroutine.yield(result)
      end
    end
  end)
end

local function range_gen(n)
  return coroutine.wrap(function()
    for i = 1, n do coroutine.yield(i) end
  end)
end

local function square(x) return x * x end
local function even_only(x) return x % 2 == 0 and x or nil end

-- 管道: 1..10 -> 过滤偶数 -> 平方
for v in pipe(pipe(range_gen(10), even_only), square) do
  print(v)  -- 4, 16, 36, 64, 100
end
```

### 5.7 生成器组合子

```lua
-- lua: 生成器组合子
local function take(n, gen)
  return coroutine.wrap(function()
    for i = 1, n do
      local v = gen()
      if v == nil then return end
      coroutine.yield(v)
    end
  end)
end

local function map(f, gen)
  return coroutine.wrap(function()
    for v in gen do coroutine.yield(f(v)) end
  end)
end

local function filter(pred, gen)
  return coroutine.wrap(function()
    for v in gen do
      if pred(v) then coroutine.yield(v) end
    end
  end)
end

-- 函数式风格链式调用
local gen = take(5, filter(function(x) return x % 2 == 0 end, map(function(x) return x * x end, range_gen(20))))
for v in gen do print(v) end
-- 4, 16, 36, 64, 100
```

### 5.8 简易事件循环

```lua
-- lua: 简易事件循环
local EventLoop = {}
EventLoop.__index = EventLoop

function EventLoop.new()
  return setmetatable({
    tasks = {},       -- 待执行协程队列
    timers = {},      -- 定时器
    next_wake = nil,
  }, EventLoop)
end

function EventLoop:add_task(fn)
  local co = coroutine.create(fn)
  table.insert(self.tasks, co)
  return co
end

function EventLoop:sleep(seconds)
  local co = coroutine.running()
  local wake_at = os.time() + seconds
  table.insert(self.timers, {co = co, wake_at = wake_at})
  coroutine.yield()  -- 让出
end

function EventLoop:run()
  while #self.tasks > 0 or #self.timers > 0 do
    -- 执行所有就绪任务
    local ready = self.tasks
    self.tasks = {}
    for _, co in ipairs(ready) do
      if coroutine.status(co) ~= "dead" then
        local ok, err = coroutine.resume(co)
        if not ok then
          io.stderr:write("task error: ", tostring(err), "\n")
        end
      end
    end

    -- 处理定时器
    local now = os.time()
    local remaining_timers = {}
    for _, t in ipairs(self.timers) do
      if t.wake_at <= now then
        table.insert(self.tasks, t.co)
      else
        table.insert(remaining_timers, t)
      end
    end
    self.timers = remaining_timers

    -- 避免忙等
    if #self.tasks == 0 and #self.timers > 0 then
      -- 实际应用应使用更精确的 sleep
      os.execute("sleep 1")
    end
  end
end

-- 使用
local loop = EventLoop.new()
loop:add_task(function()
  print("task 1: start")
  loop:sleep(2)
  print("task 1: done")
end)
loop:add_task(function()
  print("task 2: start")
  loop:sleep(1)
  print("task 2: done")
end)
loop:run()
```

### 5.9 Promise 库

```lua
-- lua: 简易 Promise 库
local Promise = {}
Promise.__index = Promise

function Promise.new(executor)
  local self = setmetatable({
    state = "pending",
    value = nil,
    reason = nil,
    on_fulfilled = {},
    on_rejected = {},
  }, Promise)

  local function resolve(value)
    if self.state ~= "pending" then return end
    self.state = "fulfilled"
    self.value = value
    for _, cb in ipairs(self.on_fulfilled) do cb(value) end
  end

  local function reject(reason)
    if self.state ~= "pending" then return end
    self.state = "rejected"
    self.reason = reason
    for _, cb in ipairs(self.on_rejected) do cb(reason) end
  end

  executor(resolve, reject)
  return self
end

function Promise:then_(on_fulfilled, on_rejected)
  local d = {}
  local next_promise = Promise.new(function(resolve, reject)
    d.resolve = resolve
    d.reject = reject
  end)

  local function handle_fulfilled(value)
    if type(on_fulfilled) == "function" then
      local ok, result = pcall(on_fulfilled, value)
      if ok then d.resolve(result) else d.reject(result) end
    else
      d.resolve(value)
    end
  end

  local function handle_rejected(reason)
    if type(on_rejected) == "function" then
      local ok, result = pcall(on_rejected, reason)
      if ok then d.resolve(result) else d.reject(result) end
    else
      d.reject(reason)
    end
  end

  if self.state == "fulfilled" then
    handle_fulfilled(self.value)
  elseif self.state == "rejected" then
    handle_rejected(self.reason)
  else
    table.insert(self.on_fulfilled, handle_fulfilled)
    table.insert(self.on_rejected, handle_rejected)
  end

  return next_promise
end

function Promise:catch(on_rejected)
  return self:then_(nil, on_rejected)
end

-- 静态方法
function Promise.resolve(v)
  return Promise.new(function(resolve) resolve(v) end)
end

function Promise.reject(r)
  return Promise.new(function(_, reject) reject(r) end)
end

function Promise.all(promises)
  return Promise.new(function(resolve, reject)
    local results = {}
    local remaining = #promises
    if remaining == 0 then resolve({}) end
    for i, p in ipairs(promises) do
      p:then_(function(v)
        results[i] = v
        remaining = remaining - 1
        if remaining == 0 then resolve(results) end
      end, reject)
    end
  end)
end

function Promise.race(promises)
  return Promise.new(function(resolve, reject)
    for _, p in ipairs(promises) do
      p:then_(resolve, reject)
    end
  end)
end

-- 使用
local p = Promise.new(function(resolve, reject)
  setTimeout(function() resolve("done") end, 1000)  -- 假设有 setTimeout
end)

p:then_(function(v) print("got:", v) end)
```

### 5.10 async/await 模拟

```lua
-- lua: async/await 模拟
local function async(fn)
  return function(...)
    local args = {...}
    local co = coroutine.create(fn)
    local function step(...)
      local ok, result = coroutine.resume(co, ...)
      if not ok then
        error(result)
      end
      if coroutine.status(co) ~= "dead" then
        -- result 是一个 Promise
        result:then_(step, function(err)
          -- 通过抛出错误让协程捕获
          local ok2, _ = coroutine.resume(co, nil, err)
          if not ok2 then error(_ ) end
        end)
      end
    end
    step(table.unpack(args))
  end
end

local function await(promise)
  -- 协程内调用,挂起并等待
  return coroutine.yield(promise)
end

-- 使用示例
local function fetch(url)
  return Promise.new(function(resolve, reject)
    -- 模拟异步 IO
    print("fetching:", url)
    -- 实际应用中这里调用宿主的非阻塞 API
    resolve("response from " .. url)
  end)
end

local main = async(function()
  local a = await(fetch("http://api1.example.com"))
  print("got a:", a)
  local b = await(fetch("http://api2.example.com/" .. a))
  print("got b:", b)
  return b
end)

main()
```

### 5.11 协程池（worker pool）

```lua
-- lua: 协程池处理 CPU 密集任务
local WorkerPool = {}
WorkerPool.__index = WorkerPool

function WorkerPool.new(size)
  return setmetatable({
    size = size,
    workers = {},
    queue = {},
    active = 0,
  }, WorkerPool)
end

function WorkerPool:submit(fn, callback)
  table.insert(self.queue, {fn = fn, callback = callback})
  self:_schedule()
end

function WorkerPool:_schedule()
  while #self.queue > 0 and self.active < self.size do
    local task = table.remove(self.queue, 1)
    self.active = self.active + 1
    local co = coroutine.create(function()
      local ok, result = pcall(task.fn)
      task.callback(ok, result)
      self.active = self.active - 1
      self:_schedule()  -- 调度下一个
    end)
    coroutine.resume(co)
  end
end

-- 使用
local pool = WorkerPool.new(4)
for i = 1, 10 do
  pool:submit(function()
    -- 模拟 CPU 密集任务
    local sum = 0
    for j = 1, 1e6 do sum = sum + j end
    return sum
  end, function(ok, result)
    print("task done:", ok, result)
  end)
end
```

### 5.12 取消机制

```lua
-- lua: 协程取消机制
local function make_cancellable(fn)
  local co = coroutine.create(fn)
  local cancelled = false
  local token = {
    is_cancelled = function() return cancelled end,
    cancel = function()
      cancelled = true
    end,
  }
  return {
    run = function(...)
      if cancelled then return false, "cancelled" end
      return coroutine.resume(co, ...)
    end,
    status = function() return coroutine.status(co) end,
    token = token,
  }
end

local task = make_cancellable(function()
  for i = 1, 10 do
    if task.token.is_cancelled() then
      print("cancelled at step", i)
      return
    end
    print("step", i)
    coroutine.yield()  -- 让出
  end
  print("done")
end)

task.run()
task.run()
task.run()
task.token.cancel()
task.run()  -- 输出 cancelled at step 4
```

### 5.13 协程与 upvalue

```lua
-- lua: 协程与 upvalue 共享
local function make_counter()
  local count = 0
  local function increment() count = count + 1; return count end
  local function get() return count end
  return increment, get
end

local inc1, get1 = make_counter()
local inc2, get2 = make_counter()

inc1(); inc1(); inc1()
print(get1())  -- 3
print(get2())  -- 0（独立闭包,独立 upvalue）

-- 协程共享 upvalue
local function make_shared()
  local state = 0
  local co1 = coroutine.create(function()
    while true do
      state = state + 1
      coroutine.yield(state)
    end
  end)
  local co2 = coroutine.create(function()
    while true do
      state = state + 10
      coroutine.yield(state)
    end
  end)
  return co1, co2
end

local c1, c2 = make_shared()
print(coroutine.resume(c1))  -- true    1
print(coroutine.resume(c2))  -- true    11（共享 state）
print(coroutine.resume(c1))  -- true    12
```

### 5.14 协程错误处理

```lua
-- lua: 协程错误处理对比
-- 方式 1: resume 内置 pcall
local co1 = coroutine.create(function()
  error("boom!")
end)
local ok, err = coroutine.resume(co1)
print(ok, err)  -- false    input:0:boom!
print(coroutine.status(co1))  -- dead

-- 方式 2: wrap 直接抛出
local function gen()
  return coroutine.wrap(function()
    error("kaboom!")
  end)
end
local g = gen()
local ok2, err2 = pcall(g)
print(ok2, err2)  -- false    input:0:kaboom!

-- 方式 3: 协程内 pcall
local co3 = coroutine.create(function()
  local ok, err = pcall(function()
    error("handled internally")
  end)
  if not ok then
    print("handled:", err)
    return "recovered"
  end
  return "normal"
end)
print(coroutine.resume(co3))  -- handled:    input:0:handled internally
                               -- true    recovered
```

### 5.15 协程与递归迭代

```lua
-- lua: 协程递归遍历树
local function tree_node(value, left, right)
  return {value = value, left = left, right = right}
end

local function in_order(root)
  return coroutine.wrap(function()
    local function walk(node)
      if node == nil then return end
      walk(node.left)
      coroutine.yield(node.value)
      walk(node.right)
    end
    walk(root)
  end)
end

-- 构造二叉搜索树
--       4
--      / \
--     2   6
--    / \ / \
--   1  3 5  7
local tree = tree_node(4,
  tree_node(2, tree_node(1), tree_node(3)),
  tree_node(6, tree_node(5), tree_node(7))
)

for v in in_order(tree) do
  io.write(v, " ")
end
-- 输出: 1 2 3 4 5 6 7
```

### 5.16 协程与 LuaJIT

```lua
-- lua: LuaJIT FFI 与协程
-- 注意: LuaJIT 的 FFI 调用是阻塞的,协程不能在 FFI 调用中 yield
local ffi = require("ffi")
ffi.cdef[[
  int sleep(unsigned int seconds);
]]

local function luv_sleep(n)
  local co = coroutine.running()
  -- 错误示例: 直接 ffi.C.sleep 会阻塞整个进程
  -- ffi.C.sleep(n)

  -- 正确示例: 使用协程让出,实际由宿主调度
  coroutine.yield()  -- 让出,等待外部唤醒
end
```

### 5.17 协程与 C API

```c
/* lua: 协程 C API 示例 */
#include <lua.h>
#include <lauxlib.h>

static int c_resume(lua_State *L) {
  lua_State *co = lua_tothread(L, 1);
  int narg = lua_gettop(L) - 1;
  int status = lua_resume(co, L, narg);
  if (status == LUA_OK || status == LUA_YIELD) {
    int nres = lua_gettop(co);
    lua_xmove(co, L, nres);
    return nres;
  } else {
    lua_xmove(co, L, 1);  /* error message */
    lua_error(L);
    return 0;
  }
}

/* 注册到 Lua */
int luaopen_cutil(lua_State *L) {
  lua_register(L, "c_resume", c_resume);
  return 0;
}
```

### 5.18 协程的 backpressure

```lua
-- lua: 协程实现 backpressure
local function make_pipe(buffer_size)
  local buffer = {}
  local producers = {}  -- 等待写入的协程
  local consumers = {}  -- 等待读取的协程

  local function put(v)
    if #consumers > 0 then
      -- 直接传递给等待的消费者
      local co = table.remove(consumers, 1)
      coroutine.resume(co, v)
    elseif #buffer < buffer_size then
      table.insert(buffer, v)
    else
      -- 缓冲区满,挂起生产者
      coroutine.yield({type = "wait_producer", value = v})
    end
  end

  local function get()
    if #buffer > 0 then
      return table.remove(buffer, 1)
    elseif #producers > 0 then
      local co = table.remove(producers, 1)
      return coroutine.resume(co)
    else
      -- 等待生产者
      coroutine.yield({type = "wait_consumer"})
    end
  end

  return {put = put, get = get}
end
```

### 5.19 协程与超时

```lua
-- lua: 协程超时机制
local function with_timeout(fn, timeout_ms)
  local co = coroutine.create(fn)
  local result, error
  local done = false

  local timer = set_timeout(function()
    if not done then
      done = true
      error = "timeout"
      -- 注意: Lua 不支持外部强制终止协程,需协程内部检查
      coroutine.resume(co, "timeout")
    end
  end, timeout_ms)

  local function runner()
    local ok, r = coroutine.resume(co)
    if not done then
      done = true
      clear_timeout(timer)
      result = r
    end
  end

  runner()
  return result, error
end
```

### 5.20 协程与生成器表达式

```lua
-- lua: 模拟 Python 风格的生成器表达式
local function genexpr(iter, pred, transform)
  return coroutine.wrap(function()
    for v in iter do
      if pred(v) then
        coroutine.yield(transform(v))
      end
    end
  end)
end

-- 类似 Python: (x*x for x in range(10) if x % 2 == 0)
local squared_evens = genexpr(
  function() return coroutine.wrap(function()
    for i = 1, 10 do coroutine.yield(i) end
  end) end,
  function(x) return x % 2 == 0 end,
  function(x) return x * x end
)

for v in squared_evens do print(v) end  -- 4, 16, 36, 64, 100
```

## 6. 对比分析

### 6.1 与 Python generator / asyncio 对比

| 特性 | Lua 协程 | Python generator | Python asyncio |
| --- | --- | --- | --- |
| 创建语法 | `coroutine.create(f)` | `def f(): yield` | `async def f()` |
| 暂停 | `coroutine.yield(v)` | `yield v` | `await x` |
| 恢复 | `coroutine.resume(c, v)` | `next(g)` / `g.send(v)` | `await coroutine` |
| 状态查询 | `coroutine.status(c)` | `inspect.getgeneratorstate(g)` | `task.done()` |
| 错误传播 | resume 返回 `false, err` | `StopIteration` / 异常 | 异常 |
| 是否可双向通信 | 是（yield/resume 传值） | 是（send） | 是 |
| 异步 IO 集成 | 需手动封装 | 需 asyncio 框架 | 原生 |
| 语法糖 | 无 | 有（yield from） | 有（async/await） |

Python 的 `async def` 是语法层面的协程,Lua 是库层面的协程。Python 的 asyncio 提供完整事件循环,Lua 需自行实现或使用 OpenResty 等宿主。

### 6.2 与 JavaScript async/await 对比

| 特性 | Lua 协程 | JavaScript async/await |
| --- | --- | --- |
| 创建 | `coroutine.create(f)` | `async function f() {}` |
| 暂停 | `coroutine.yield(promise)` | `await promise` |
| 返回值 | resume 返回 | Promise |
| 事件循环 | 需手动实现 | 内置（浏览器/Node.js） |
| Promise 集成 | 需手动封装 | 原生 |
| 错误处理 | resume 返回 `false, err` | try/catch |
| 微任务 | 无 | Promise.then 是微任务 |

JavaScript 的 async/await 是 Promise 的语法糖,Lua 协程是更底层的原语。JavaScript 的事件循环与微任务语义更复杂,Lua 协程是单线程同步执行。

### 6.3 与 Go goroutine 对比

| 特性 | Lua 协程 | Go goroutine |
| --- | --- | --- |
| 调度方式 | 协作式 | 抢占式（M:N 调度） |
| 并行性 | 单线程,无真正并行 | 多核并行 |
| 通信 | 共享变量 | channel |
| 数量上限 | 数千（受栈内存限制） | 数十万 |
| 创建开销 | 1-10μs | 0.1-1μs |
| 同步原语 | 无需 | sync 包 |

Go goroutine 支持多核并行,Lua 协程是单线程的。Go 通过 channel 通信,Lua 通过共享变量。Go 的抢占式调度避免单个任务阻塞,Lua 需显式 yield。

### 6.4 与 C# async/await 对比

| 特性 | Lua 协程 | C# async/await |
| --- | --- | --- |
| 创建 | `coroutine.create(f)` | `async Task F() {}` |
| 状态机 | 手动 | 编译器生成 |
| 类型系统 | 无类型 | Task<T> |
| 取消 | 手动检查 token | CancellationToken |
| 异常 | resume 返回 | AggregateException |
| 并行 | 单线程 | Task.WhenAll |

C# 的 async/await 是编译器生成的状态机,类型系统支持 Task<T>。Lua 需手动管理状态与取消。

### 6.5 与 Rust async/await 对比

| 特性 | Lua 协程 | Rust async/await |
| --- | --- | --- |
| 内存模型 | GC | 所有权 + 借用 |
| 零成本 | 否（运行时支持） | 是（编译期生成） |
| Future | 无 | Future trait |
| 执行器 | 需手动 | tokio/async-std |
| Pin | 不需要 | 必须 Pin |
| 并行 | 单线程 | 多线程 |

Rust async/await 是零成本抽象,编译期生成状态机。Lua 协程是运行时支持的,有 GC 与运行时开销。

### 6.6 与 Scheme call/cc 对比

| 特性 | Lua 协程 | Scheme call/cc |
| --- | --- | --- |
| 续延类型 | 逃逸续延（subset） | 任意续延 |
| 重入 | 不支持 | 支持 |
| 跨层跳转 | 限于 resume/yield | 任意 |
| 性能 | 高 | 低（需保存完整栈） |
| 实现复杂度 | 中 | 高 |

Scheme call/cc 是最强大的续延机制,允许"回到过去"。Lua 协程仅支持单向 yield/resume,但更高效、更易实现。

## 7. 常见陷阱与反模式

### 7.1 陷阱 1:在 yield 跨 C 边界

```lua
-- lua: 陷阱 - 跨 C 边界 yield
local function c_callback()
  -- 在 C 回调中调用 Lua,且 Lua 协程 yield
  -- 这在某些 Lua 版本中会失败
end
```

**问题**:Lua 5.1 不支持跨 C 函数边界的 yield（需 `C_lua_yield` 特殊处理）。Lua 5.2+ 通过 `lua_callk`/`lua_pcallk` 的 continuation 机制支持。

**解决**:使用 Lua 5.3+ 或 LuaJIT,避免在 C 回调内 yield。

### 7.2 陷阱 2:resume 死协程

```lua
-- lua: 陷阱 - resume 死协程
local co = coroutine.create(function() return "done" end)
coroutine.resume(co)
local ok, err = coroutine.resume(co)  -- 错误: cannot resume dead coroutine
print(ok, err)  -- false    cannot resume dead coroutine
```

**问题**:resume 已 dead 的协程会返回错误。

**解决**:resume 前检查 `coroutine.status(co) ~= "dead"`。

### 7.3 陷阱 3:wrap 抛出未捕获错误

```lua
-- lua: 陷阱 - wrap 抛出错误
local gen = coroutine.wrap(function()
  error("boom")
end)
gen()  -- 直接抛出错误,不像 resume 返回 false
```

**问题**:`wrap` 返回的函数错误直接抛出,需 `pcall` 包裹。

**解决**:在错误敏感场景使用 `coroutine.create` + `resume`。

### 7.4 陷阱 4:协程内全局变量

```lua
-- lua: 陷阱 - 协程内全局变量
local function task()
  count = (count or 0) + 1  -- 全局变量,被多协程共享
  coroutine.yield()
  print("count:", count)
end

local co1 = coroutine.create(task)
local co2 = coroutine.create(task)
coroutine.resume(co1)
coroutine.resume(co2)
coroutine.resume(co1)  -- count: 2（被 co2 修改）
```

**问题**:协程共享全局环境,易产生竞态。

**解决**:使用局部变量或独立环境（详见环境管理章节）。

### 7.5 陷阱 5:upvalue 跨协程泄漏

```lua
-- lua: 陷阱 - upvalue 跨协程泄漏
local function make_tasks()
  local shared = {}
  local function task1()
    table.insert(shared, "from t1")
    coroutine.yield()
  end
  local function task2()
    table.insert(shared, "from t2")
    coroutine.yield()
  end
  return coroutine.create(task1), coroutine.create(task2), shared
end

local c1, c2, s = make_tasks()
coroutine.resume(c1)
coroutine.resume(c2)
coroutine.resume(c1)
-- s 可能包含意外数据
```

**问题**:upvalue 在多个协程间共享,易产生意外修改。

**解决**:每个协程使用独立的 upvalue,或显式传递参数。

### 7.6 陷阱 6:协程内未处理的错误

```lua
-- lua: 陷阱 - 协程内未处理错误
local co = coroutine.create(function()
  local t = nil
  t:method()  -- 错误
end)

local ok, err = coroutine.resume(co)
-- ok == false, err 包含错误信息
-- 但协程已 dead,无法继续
```

**问题**:协程内错误使其进入 dead,后续 resume 均失败。

**解决**:协程内用 `pcall` 包裹关键逻辑,设计重试机制。

### 7.7 陷阱 7:协程泄漏

```lua
-- lua: 陷阱 - 协程泄漏
local function leak()
  local big = {}
  for i = 1, 1e6 do big[i] = i end
  coroutine.yield()  -- 永久挂起
end

local leaked = {}
for i = 1, 1000 do
  local co = coroutine.create(leak)
  coroutine.resume(co)
  leaked[i] = co
end
-- leaked 持有 1000 个协程及其栈,占用大量内存
```

**问题**:挂起的协程占用内存,需显式清理。

**解决**:任务完成后从跟踪表中移除;Lua 5.4+ 使用 `coroutine.close`（Luau 扩展）。

### 7.8 陷阱 8:嵌套 resume 的栈溢出

```lua
-- lua: 陷阱 - 嵌套 resume 栈溢出
local function deep(n)
  if n == 0 then return end
  local co = coroutine.create(function()
    deep(n - 1)
  end)
  coroutine.resume(co)
end

-- deep(10000) 可能栈溢出
```

**问题**:每个协程占用 C 栈,深嵌套易溢出。

**解决**:限制嵌套深度,或改用尾调用。

### 7.9 陷阱 9:resume 传值方向错误

```lua
-- lua: 陷阱 - resume/yield 传值方向
local co = coroutine.create(function(a)
  local b = coroutine.yield(a * 2)  -- b 接收下次 resume 的第一个值
  return b * 3
end)

local ok1, r1 = coroutine.resume(co, 10)  -- a = 10
print(r1)  -- 20（a * 2）

local ok2, r2 = coroutine.resume(co, 5)  -- b = 5
print(r2)  -- 15（b * 3）
```

**问题**:yield 返回值由下次 resume 提供,易混淆。

**解决**:清晰命名,文档注释 yield 与 resume 的契约。

### 7.10 陷阱 10:协程与元表 __gc

```lua
-- lua: 陷阱 - 协程与 __gc
local co = coroutine.create(function()
  local resource = setmetatable({}, {__gc = function()
    print("cleanup")
  end})
  coroutine.yield()
  -- 资源在协程 dead 时才被 GC
end)

coroutine.resume(co)
-- 此时协程 suspended,resource 未被回收
collectgarbage("collect")  -- 不输出 cleanup
coroutine.resume(co)  -- 协程 dead
collectgarbage("collect")  -- 输出 cleanup
```

**问题**:协程内局部资源在协程 dead 前不被回收。

**解决**:用 `<close>`（Lua 5.4+）显式释放,或协程结束前手动清理。

### 7.11 陷阱 11:协程作为可重入迭代器

```lua
-- lua: 陷阱 - 协程迭代器重入
local function gen(list)
  return coroutine.wrap(function()
    for _, v in ipairs(list) do
      coroutine.yield(v)
    end
  end)
end

local g = gen({1, 2, 3})
for v in g do
  if v == 2 then
    for v2 in g do  -- 嵌套迭代
      print(v2)
    end
  end
end
-- 行为未定义,可能跳过元素或错误
```

**问题**:协程迭代器是单次的,不能嵌套使用。

**解决**:每次创建新的生成器实例。

### 7.12 陷阱 12:协程内的尾调用

```lua
-- lua: 陷阱 - 协程内尾调用与 yield
local function tail_call()
  coroutine.yield("from tail")  -- 不是尾调用,yield 是普通调用
end

local function outer()
  return tail_call()  -- 尾调用,但 tail_call 内部 yield
end

local co = coroutine.create(outer)
coroutine.resume(co)  -- 正常工作
```

尾调用本身不影响 yield,但需注意:

```lua
-- lua: 非尾调用场景的栈占用
local function deep(n)
  if n == 0 then return coroutine.yield("done") end
  return deep(n - 1)  -- 尾调用,无栈占用
end
```

### 7.13 反模式:协程代替函数

```lua
-- lua: 反模式 - 协程代替函数
local function bad_style(a, b)
  local co = coroutine.create(function()
    return a + b
  end)
  local _, result = coroutine.resume(co)
  return result
end
-- 不必要的协程开销,应直接用函数
```

**问题**:协程有创建与切换开销,简单计算不应使用。

**解决**:仅在需要暂停/恢复时使用协程。

## 8. 工程实践与最佳实践

### 8.1 实践 1:协程命名与文档

```lua
-- lua: 协程命名规范
--- 创建一个 HTTP 请求协程
-- @param url string 请求 URL
-- @return coroutine 协程,每次 yield 一个 chunk
local function http_request_coroutine(url)
  return coroutine.create(function()
    -- ...
  end)
end
```

### 8.2 实践 2:协程生命周期管理

```lua
-- lua: 协程生命周期管理
local CoroutineManager = {}
CoroutineManager.__index = CoroutineManager

function CoroutineManager.new()
  return setmetatable({
    coroutines = setmetatable({}, {__mode = "v"}),  -- 弱值
    finished = {},
  }, CoroutineManager)
end

function CoroutineManager:spawn(fn)
  local co = coroutine.create(fn)
  table.insert(self.coroutines, co)
  self:_step(co)
  return co
end

function CoroutineManager:_step(co)
  local ok, err = coroutine.resume(co)
  if not ok then
    io.stderr:write("coroutine error: ", tostring(err), "\n")
  end
  if coroutine.status(co) == "dead" then
    self.finished[co] = true
  end
end

function CoroutineManager:update()
  local alive = {}
  for _, co in ipairs(self.coroutines) do
    if not self.finished[co] and coroutine.status(co) == "suspended" then
      self:_step(co)
      if coroutine.status(co) ~= "dead" then
        table.insert(alive, co)
      end
    end
  end
  self.coroutines = alive
end
```

### 8.3 实践 3:错误隔离

```lua
-- lua: 协程错误隔离
local function safe_resume(co, ...)
  local ok, err = coroutine.resume(co, ...)
  if not ok then
    -- 记录错误但不传播
    log_error("coroutine failed: " .. tostring(err))
    return false, err
  end
  return true
end
```

### 8.4 实践 4:超时与取消

```lua
-- lua: 超时与取消
local CancellationToken = {}
CancellationToken.__index = CancellationToken

function CancellationToken.new()
  return setmetatable({
    cancelled = false,
    listeners = {},
  }, CancellationToken)
end

function CancellationToken:cancel()
  self.cancelled = true
  for _, cb in ipairs(self.listeners) do cb() end
end

function CancellationToken:is_cancelled()
  return self.cancelled
end

function CancellationToken:on_cancel(cb)
  if self.cancelled then cb() else table.insert(self.listeners, cb) end
end

-- 使用
local token = CancellationToken.new()
local co = coroutine.create(function()
  for i = 1, 1000 do
    if token:is_cancelled() then return "cancelled" end
    coroutine.yield(i)
  end
end)

-- 5 步后取消
for i = 1, 5 do
  print(coroutine.resume(co))
end
token:cancel()
print(coroutine.resume(co))  -- cancelled
```

### 8.5 实践 5:协程池设计

```lua
-- lua: 工程级协程池
local Pool = {}
Pool.__index = Pool

function Pool.new(max_concurrent)
  return setmetatable({
    max = max_concurrent or 10,
    pending = {},
    running = 0,
  }, Pool)
end

function Pool:submit(fn, callback)
  local task = {fn = fn, callback = callback}
  if self.running < self.max then
    self:_run(task)
  else
    table.insert(self.pending, task)
  end
end

function Pool:_run(task)
  self.running = self.running + 1
  local co = coroutine.create(function()
    local ok, result = pcall(task.fn)
    task.callback(ok, result)
    self.running = self.running - 1
    if #self.pending > 0 then
      self:_run(table.remove(self.pending, 1))
    end
  end)
  coroutine.resume(co)
end

function Pool:size()
  return self.running + #self.pending
end
```

### 8.6 实践 6:异步 IO 集成

```lua
-- lua: 与 libuv 集成（Luvit 风格）
local uv = require("uv")  -- 假设有 libuv 绑定

local function async_read(fd, length)
  local co = coroutine.running()
  uv.read_start(fd, function(err, data)
    uv.read_stop(fd)
    coroutine.resume(co, data, err)
  end)
  return coroutine.yield()
end

local function async_main()
  local data, err = async_read(stdin_fd, 1024)
  print("read:", data)
end

coroutine.resume(coroutine.create(async_main))
uv.run()  -- 启动事件循环
```

### 8.7 实践 7:可观测性

```lua
-- lua: 协程 trace 与 metrics
local instrumented = {}
local function instrument(name, fn)
  return function(...)
    local co = coroutine.create(fn)
    local start = os.clock()
    instrumented[name] = instrumented[name] or {count = 0, total = 0}
    local stats = instrumented[name]
    stats.count = stats.count + 1

    local function step(...)
      local ok, result = coroutine.resume(co, ...)
      if coroutine.status(co) ~= "dead" then
        return step()  -- 继续调度
      end
      stats.total = stats.total + (os.clock() - start)
      return ok, result
    end

    return step(...)
  end
end
```

### 8.8 实践 8:backpressure

```lua
-- lua: 协程 backpressure
local function make_stream_processor(max_in_flight)
  local in_flight = 0
  local waiters = {}

  local function process(item)
    while in_flight >= max_in_flight do
      local co = coroutine.running()
      table.insert(waiters, co)
      coroutine.yield()
    end
    in_flight = in_flight + 1
    return function()
      in_flight = in_flight - 1
      if #waiters > 0 then
        local next_co = table.remove(waiters, 1)
        coroutine.resume(next_co)
      end
    end
  end

  return process
end
```

### 8.9 实践 9:协程与调试器集成

```lua
-- lua: 协程调试 hook
local function debug_coroutine(co)
  local original = coroutine.resume
  local function traced_resume(c, ...)
    if c == co then
      print("resume at", debug.traceback(c, "current", 1))
    end
    return original(c, ...)
  end
  coroutine.resume = traced_resume
  return function()
    coroutine.resume = original
  end
end
```

### 8.10 实践 10:跨版本兼容

```lua
-- lua: 协程跨版本兼容
local compat = {}

if _VERSION == "Lua 5.1" then
  -- Lua 5.1 没有 isyieldable
  function compat.isyieldable()
    return coroutine.running() ~= nil
  end
else
  function compat.isyieldable()
    return coroutine.isyieldable()
  end
end

-- coroutine.running 在 5.1 返回协程,5.2+ 返回协程与是否主线程
function compat.running()
  if _VERSION == "Lua 5.1" then
    return coroutine.running()
  else
    local co, is_main = coroutine.running()
    return co, is_main
  end
end
```

## 9. 案例研究

### 9.1 案例研究 1:OpenResty ngx.coroutine

OpenResty 基于 Nginx + LuaJIT,提供 `ngx.coroutine` 用于非阻塞 HTTP 请求:

```nginx
# nginx.conf
location /api {
  content_by_lua_block {
    local http = require("resty.http")
    local httpc = http.new()

    -- 同步风格的非阻塞请求
    local res, err = httpc:request_uri("http://backend.example.com", {
      method = "GET",
      path = "/data",
    })

    if not res then
      ngx.log(ngx.ERR, "failed: ", err)
      return ngx.exit(500)
    end

    ngx.say(res.body)
  }
}
```

**设计分析**:

- OpenResty 在 `httpc:request_uri` 内部使用协程挂起当前请求处理。
- Nginx 事件循环唤醒协程,当 socket 可读时。
- 单 worker 可处理数千并发请求,每个请求一个协程。
- 协程栈约 2KB,1000 个请求约 2MB,远低于线程模型。

**关键实现**:

```c
/* OpenResty 简化伪代码 */
ngx_http_lua_run_thread(L, ctx) {
  int status = lua_resume(L, ...);
  if (status == LUA_YIELD) {
    /* 注册 IO 事件,等待唤醒 */
    ngx_add_event(...);
  } else if (status == LUA_OK) {
    /* 完成,返回响应 */
    ngx_http_finalize_request(r, NGX_OK);
  }
}
```

### 9.2 案例研究 2:Luvit - Node.js 风格

Luvit 是基于 libuv 的 Lua 异步框架,API 与 Node.js 高度相似:

```lua
-- lua: Luvit 风格 HTTP 服务器
local http = require("http")

local server = http.createServer(function(req, res)
  res:setHeader("Content-Type", "text/plain")
  res:write("Hello World\n")
  res:finish()
end)

server:listen(8080, "127.0.0.1", function()
  print("listening on 8080")
end)
```

**设计分析**:

- Luvit 在内部使用协程封装 libuv 回调。
- 用户书写回调风格,框架自动管理协程。
- 也可使用 `coroutine.wrap` 实现同步风格:

```lua
local function handler(req, res)
  local data = coroutine.yield(function(cb)
    fs.readFile("data.txt", cb)
  end)
  res:finish(data)
end
```

### 9.3 案例研究 3:Turbo.lua Web 框架

Turbo.lua 是高性能 Web 框架,使用协程实现非阻塞 IO:

```lua
-- lua: Turbo.lua
local turbo = require("turbo")

local ExampleHandler = class("ExampleHandler", turbo.web.RequestHandler)

function ExampleHandler:get()
  -- 同步风格,实际异步
  local res = turbo.async(function()
    return turbo.httpclient.fetch("http://api.example.com")
  end)
  self:write("Response: " .. res.body)
end

local app = turbo.web.Application:new({
  {"^/$", ExampleHandler},
})

app:listen(8888)
turbo.ioloop.instance():start()
```

**设计分析**:

- Turbo.lua 提供 `turbo.async` 显式标记异步函数。
- 内部使用协程 yield/resume 实现同步书写。
- IOLoop 是核心事件循环,集成 libev/libevent。

### 9.4 案例研究 4:WoW UI 协程

魔兽世界 UI 使用 Lua 5.1 + 自定义协程扩展:

```lua
-- lua: WoW 风格的延迟动画
local function AnimateFrame(frame, duration, callback)
  C_Timer.After(duration, function()
    -- 实际 WoW 提供 C_Timer.After,基于事件循环
    callback()
  end)
end

-- 自定义 wait 函数
local function Wait(seconds, fn)
  local co = coroutine.create(function()
    fn()
  end)
  C_Timer.After(seconds, function()
    coroutine.resume(co)
  end)
end
```

**设计分析**:

- WoW 限制协程使用,主要在事件回调中创建。
- WoW 提供 `C_Timer.After` 与 `C_Timer.NewTicker`,基于 C 实现。
- 用户脚本中协程需手动管理,易产生泄漏。

### 9.5 案例研究 5:Neovim Lua 嵌入

Neovim 嵌入 Lua 用于插件脚本,使用协程实现非阻塞 UI:

```lua
-- lua: Neovim 风格的异步任务
local function async_job(cmd, on_line)
  local co = coroutine.running()
  local lines = {}

  vim.fn.jobstart(cmd, {
    on_stdout = function(_, data)
      for _, line in ipairs(data) do
        if line == "" then
          -- 完成
          coroutine.resume(co, lines)
        else
          table.insert(lines, line)
          on_line(line)
        end
      end
    end,
  })

  return coroutine.yield()
end

-- 使用
local co = coroutine.create(function()
  local lines = async_job({"ls", "-la"}, function(line)
    print("line:", line)
  end)
  print("total:", #lines)
end)
coroutine.resume(co)
```

**设计分析**:

- Neovim 提供 `vim.loop`（libuv 绑定）与 `vim.fn.jobstart`。
- 用户使用协程封装回调,实现同步风格。
- Neovim 的事件循环由 libuv 驱动。

### 9.6 案例研究 6:Love2D 游戏开发

Love2D 使用 Lua 5.1 + LuaJIT,协程用于游戏逻辑:

```lua
-- lua: Love2D 协程用于角色移动
local character = {x = 0, y = 0}

local function move_to(target_x, target_y, speed)
  return coroutine.create(function()
    while character.x ~= target_x or character.y ~= target_y do
      local dx = target_x - character.x
      local dy = target_y - character.y
      local dist = math.sqrt(dx*dx + dy*dy)
      if dist < speed then
        character.x = target_x
        character.y = target_y
      else
        character.x = character.x + dx / dist * speed
        character.y = character.y + dy / dist * speed
      end
      coroutine.yield()
    end
  end)
end

local move_co = move_to(100, 100, 2)

function love.update(dt)
  if move_co and coroutine.status(move_co) ~= "dead" then
    coroutine.resume(move_co)
  end
end
```

**设计分析**:

- Love2D 每帧 update 调用 resume,推进协程。
- 协程保留移动状态,无需手动管理。
- 适合线性剧情、对话、AI 行为。

### 9.7 案例研究 7:Redis 脚本

Redis 使用 Lua 5.1（升级到 5.1+）执行脚本,不直接暴露协程 API:

```lua
-- lua: Redis 脚本中协程的限制
-- Redis 不允许在脚本中使用 coroutine.yield（除非 redis.replicate_commands）
-- 也不允许真正异步操作

local function compute()
  -- 纯 CPU 计算,无 IO
  local sum = 0
  for i = 1, 1000 do sum = sum + i end
  return sum
end

return compute()
```

**设计分析**:

- Redis 脚本同步执行,避免阻塞主线程。
- 协程可用于内部状态管理,但不能 yield 跨脚本边界。
- Redis 7.0+ 引入 functions,允许更复杂的状态管理。

### 9.8 案例研究 8:LuaJIT FFI 与协程

LuaJIT 的 FFI 调用是同步阻塞的,但可通过协程封装:

```lua
-- lua: LuaJIT FFI 异步封装
local ffi = require("ffi")

ffi.cdef[[
  typedef struct uv_loop_s uv_loop_t;
  typedef struct uv_stream_s uv_stream_t;
  int uv_read_start(uv_stream_t*, void*, void*);
]]

local libuv = ffi.load("libuv")

local function async_read(stream)
  local co = coroutine.running()
  -- 设置回调
  libuv.uv_read_start(stream, nil, function(s, n, buf)
    coroutine.resume(co, ffi.string(buf, n))
  end)
  return coroutine.yield()
end
```

**注意**:LuaJIT 的 FFI 回调在 C 栈中,Lua 协程不能跨 C 边界 yield,需使用 `lua_callk`/continuation 机制。

## 10. 习题与思考题

### 10.1 习题 1:协程状态转换

**题目**:给定以下代码,写出每行 `print` 的输出:

```lua
local co = coroutine.create(function()
  print("A")
  coroutine.yield(1)
  print("B")
  coroutine.yield(2)
  print("C")
  return 3
end)

print(coroutine.status(co))
coroutine.resume(co)
local _, r1 = coroutine.resume(co)
print(r1)
local _, r2 = coroutine.resume(co)
print(r2)
local ok, r3 = coroutine.resume(co)
print(ok, r3)
print(coroutine.status(co))
```

**参考答案**:

```
suspended
A
B
1
C
2
false    cannot resume dead coroutine
dead
```

### 10.2 习题 2:生成器实现

**题目**:用协程实现一个生成器,产出斐波那契数列中小于 N 的所有数。

**参考答案**:

```lua
local function fib_below(n)
  return coroutine.wrap(function()
    local a, b = 0, 1
    while a < n do
      coroutine.yield(a)
      a, b = b, a + b
    end
  end)
end

for v in fib_below(100) do
  io.write(v, " ")
end
-- 0 1 1 2 3 5 8 13 21 34 55 89
```

### 10.3 习题 3:生产者-消费者

**题目**:实现一个生产者-消费者,生产者每秒产出一个数字,消费者接收并打印。使用协程与简易事件循环。

**参考答案**:

```lua
local function producer()
  return coroutine.create(function()
    for i = 1, 5 do
      coroutine.yield(i)
    end
  end)
end

local function consumer(prod)
  while true do
    local ok, v = coroutine.resume(prod)
    if not ok or v == nil then break end
    print("consumed:", v)
  end
end

local prod = producer()
consumer(prod)
```

### 10.4 习题 4:Promise 实现

**题目**:实现一个简单的 Promise 类,支持 `resolve`、`reject`、`then`、`catch`。

**参考答案**:见 §5.9。

### 10.5 习题 5:async/await 模拟

**题目**:基于 Promise 与协程,实现 `async` 与 `await` 函数,使下列代码工作:

```lua
local function fetch(url)
  return Promise.new(function(resolve)
    setTimeout(function() resolve("data from " .. url) end, 1000)
  end)
end

local main = async(function()
  local a = await(fetch("http://a"))
  print(a)
  local b = await(fetch("http://b"))
  print(b)
end)

main()
```

**参考答案**:见 §5.10。

### 10.6 习题 6:协程池

**题目**:实现一个协程池,限制最大并发数,支持任务队列。

**参考答案**:见 §8.5。

### 10.7 习题 7:错误处理

**题目**:在协程中处理错误,使主线程不受影响,并记录错误日志。

**参考答案**:

```lua
local function safe_resume(co, ...)
  local ok, err = coroutine.resume(co, ...)
  if not ok then
    log_error(tostring(err))
    return false
  end
  return true
end
```

### 10.8 习题 8:取消机制

**题目**:实现协程的取消机制,允许外部取消正在执行的协程。

**参考答案**:见 §8.4。

### 10.9 思考题 1:协程与线程的本质区别

**问题**:为什么说协程"协作式调度"在 IO 密集场景下优于线程"抢占式调度"?是否存在协程劣于线程的场景?

**提示**:考虑切换开销、内存占用、IO 等待时间、CPU 密集任务。

### 10.10 思考题 2:协程与 call/cc

**问题**:Lua 协程能否实现 Scheme 的 call/cc?如果不能,缺失了什么?

**提示**:考虑续延的可重入性与逃逸续延的区别。

### 10.11 思考题 3:协程泄漏的检测

**问题**:如何检测 Lua 应用中的协程泄漏?需要哪些运行时信息?

**提示**:考虑 `collectgarbage("count")`、`coroutine.status`、自定义跟踪。

### 10.12 思考题 4:协程与多核

**问题**:Lua 协程是单线程的,如何利用多核 CPU?有哪些方案?

**提示**:考虑多进程、LuaJIT + FFI、LPEG、LuaDist。

### 10.13 项目题:实现完整的异步框架

**任务**:设计并实现一个完整的异步框架,包含以下功能:

1. Promise 类（含 `all`、`race`、`allSettled`、`any`）。
2. async/await 语法糖。
3. 事件循环（含定时器、IO 集成）。
4. 协程池与任务调度。
5. 取消机制与超时。
6. 错误处理与日志。
7. 可观测性（metrics、trace）。

**要求**:

- 代码量 1000+ 行。
- 提供完整文档与示例。
- 支持至少一种 IO 后端（libuv、select、epoll）。

**参考实现**:见 §5.9、§5.10、§5.11、§5.12、§8.1-8.10。

## 11. 参考文献

### 11.1 Lua 官方资料

[1] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "Lua 5.4 Reference Manual," Technical Report, PUC-Rio, 2020. [Online]. Available: https://www.lua.org/manual/5.4/

[2] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "The Evolution of Lua," in Proceedings of the Third ACM SIGPLAN Conference on History of Programming Languages (HOPL III), New York, NY, USA, 2007, pp. 2-1-2-26. doi: 10.1145/1238844.1238846

[3] R. Ierusalimschy, Programming in Lua, 4th ed. Lua.org, 2016.

### 11.2 协程理论

[4] M. E. Conway, "Design of a Separable Transition-Diagram Compiler," Communications of the ACM, vol. 6, no. 7, pp. 396-408, Jul. 1963. doi: 10.1145/366663.366704

[5] A. B. M. de Moura and R. Ierusalimschy, "Revisiting Coroutines in Lua," in Proceedings of the 2004 ACM SIGPLAN Conference on Programming Language Design and Implementation (PLDI '04), New York, NY, USA, 2004, pp. 163-172. doi: 10.1145/996841.996867

[6] C. Bruneau, S. Burckhart, and M. H. G. H. M. M., "Symmetric Coroutines for Cooperative Multitasking," Software: Practice and Experience, vol. 45, no. 5, pp. 615-632, 2015. doi: 10.1002/spe.2257

### 11.3 异步编程范式

[7] P. Haller and M. Odersky, "Event-Based Programming without Inversion of Control," in Joint Modular Languages Conference (JMLC'06), Springer, 2006, pp. 4-22. doi: 10.1007/11805400_4

[8] N. D. Matsakis, "Asynchronous Programming in Rust," Communications of the ACM, vol. 64, no. 12, pp. 58-62, Dec. 2021. doi: 10.1145/3490611

[9] C. Reis et al., "A Spider for the Modern Web: Design and Implementation of a Modern Web Crawler," in Proceedings of the 26th International Conference on World Wide Web Companion (WWW '17), 2017, pp. 801-802.

### 11.4 Promise 与 async/await

[10] M. M. K. M. D. and M. S. Miller, "Promises/A+ Specification," 2014. [Online]. Available: https://promisesaplus.com/

[11] E. L. L. et al., "Asynchronous Generators for JavaScript," ECMAScript Proposal, 2017. [Online]. Available: https://github.com/tc39/proposal-async-iteration

[12] K. Donnelly, "Futures and Promises in C++," in C++Now 2013, 2013.

### 11.5 OpenResty 与异步框架

[13] Y. Zhang, "OpenResty: Best Practices," OpenResty Inc., 2017. [Online]. Available: https://openresty.com/

[14] N. L. H. "Luvit - Node.js for Lua," GitHub Repository, 2012. [Online]. Available: https://luvit.io/

[15] J. R. L. "Turbo.lua - A Framework for High Performance Web Applications," GitHub Repository, 2013. [Online]. Available: https://turbo.readthedocs.io/

### 11.6 协程实现与性能

[16] R. Ierusalimschy, L. H. de Figueiredo, and W. Celes, "The Implementation of Lua 5.0," Journal of Universal Computer Science, vol. 11, no. 7, pp. 1159-1176, 2005. doi: 10.3217/jucs-011-07-1159

[17] M. Pall, "LuaJIT 2.0 - A Just-in-Time Compiler for Lua," in Proceedings of the 11th International Conference on Virtual Execution Environments (VEE '15), New York, NY, USA, 2015, pp. 1-2. doi: 10.1145/2731186.2731187

[18] K. Cheung and C. L. H. "Luau: A Fast, Statically Typed Variant of Lua," Roblox Engineering Blog, 2021. [Online]. Available: https://luau-lang.org/

### 11.7 函数式与范畴论

[19] S. Awodey, Category Theory, 2nd ed. Oxford University Press, 2010.

[20] P. Wadler, "The Essence of Functional Programming," in Proceedings of the 19th ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages (POPL '92), New York, NY, USA, 1992, pp. 1-14. doi: 10.1145/143165.143169

[21] E. Moggi, "Notions of Computation and Monads," Information and Computation, vol. 93, no. 1, pp. 55-92, Jul. 1991. doi: 10.1016/0890-5401(91)90052-4

### 11.8 教学资源

[22] MIT OpenCourseWare, "6.005 Software Construction," Spring 2016. [Online]. Available: https://ocw.mit.edu/courses/6-005-software-construction-spring-2016/

[23] Stanford University, "CS110 Principles of Computer Systems," 2023. [Online]. Available: https://cs110.stanford.edu/

[24] Carnegie Mellon University, "15-440 Distributed Systems," 2023. [Online]. Available: https://www.cs.cmu.edu/~dga/15-440/F12/

[25] R. Ierusalimschy, "Lua: An Extensible Extension Language," in Encyclopedia of Computer Science and Technology, vol. 76, no. 47, A. Kent and J. G. Williams, Eds. Boca Raton, FL, USA: CRC Press, 2017, pp. 1-12.

## 12. 延伸阅读

### 12.1 Lua 深入主题

- **Lua 5.4 源码分析**:阅读 `lcorolib.c`、`ldo.c`、`lvm.c` 理解协程实现细节。
- **LuaJIT 实现**:阅读 `lj_state.c`、`lj_frame.h` 理解 `setcontext`/`makecontext` 用法。
- **Lua Bites**:Roberto Ierusalimschy 的博客,深入 Lua 设计哲学。
- **The LuaJIT Project**:Mike Pall 的演讲与文档,涵盖 LuaJIT 内部机制。

### 12.2 协程与并发理论

- **Structured Concurrency**:Nathaniel J. Smith 的"Notes on structured concurrency",讨论协程的结构化管理。
- **Communicating Sequential Processes (CSP)**:C. A. R. Hoare 的经典著作,Go channel 的理论基础。
- **Actor Model**:Hewitt, Bishop, Steiger 的 Actor 模型,Erlang/Akka 的基础。
- **π-calculus**:Robin Milner 的进程代数,形式化并发理论。

### 12.3 异步编程范式

- **Node.js Event Loop**:Node.js 官方文档,深入 microtask 与 macrotask。
- **Python asyncio**:PEP 492(async/await),Python 异步生态。
- **Rust async/await**:Rust 官方异步编程指南,Future trait。
- **Java Project Loom**:Java 协程（virtual threads）的设计。

### 12.4 相关章节

- **lua/函数与闭包**:闭包与 upvalue,协程的状态保留机制基础。
- **lua/环境与全局变量管理**:协程的环境隔离,沙箱设计。
- **lua/弱表**:协程泄漏的检测与清理,与 GC 的交互。
- **lua/元表与元方法详解**:协程作为对象的元方法（如 `__call`）。
- **lua/C-API栈操作**:协程 C API,`lua_resume`、`lua_yield`。

### 12.5 实战项目建议

1. **实现一个完整的 Promise 库**:含 `all`、`race`、`allSettled`、`any`、`finally` 等组合子。
2. **实现 async/await 语法糖**:用 LPEG 解析 Lua 代码,自动转换。
3. **实现一个协程调度器**:支持优先级、定时器、IO 集成。
4. **实现一个协程池框架**:支持动态扩容、负载均衡、健康检查。
5. **实现一个 RPC 框架**:基于协程的同步风格 RPC,内部异步通信。
6. **实现一个流式处理框架**:基于协程管道的数据处理。
7. **实现一个游戏 AI 行为树**:用协程实现节点状态机。
8. **实现一个 WebSocket 服务器**:基于协程的非阻塞 IO。

### 12.6 社区与生态

- **Lua mailing list**:lua-l@lists.lua.org,Lua 官方邮件列表。
- **Lua Users Wiki**:http://lua-users.org/wiki/,社区知识库。
- **LuaJIT mailing list**:LuaJIT 相关讨论。
- **OpenResty 邮件列表**:openresty@googlegroups.com。
- **Roblox Luau GitHub**:https://github.com/Roblox/luau。
- **Neovim Lua guide**:https://neovim.io/doc/user/lua-guide.html。

## 附录 A:协程 API 速查表

| API | 描述 | Lua 版本 |
| --- | --- | --- |
| `coroutine.create(f)` | 创建协程,返回 thread 对象 | 5.0+ |
| `coroutine.resume(co, ...)` | 恢复协程,返回 ok 与 yield 值 | 5.0+ |
| `coroutine.yield(...)` | 挂起协程,传递值给 resume | 5.0+ |
| `coroutine.wrap(f)` | 创建并返回函数,调用即 resume | 5.0+ |
| `coroutine.status(co)` | 返回状态字符串 | 5.0+ |
| `coroutine.running()` | 返回当前协程（与是否主线程） | 5.1+ |
| `coroutine.isyieldable()` | 当前是否可 yield | 5.3+ |
| `coroutine.close(co)` | 关闭协程（Luau 扩展） | Luau |
| `coroutine.resumelevel(co)` | 调试用 | LuaJIT |

## 附录 B:常见错误对照表

| 错误信息 | 原因 | 解决 |
| --- | --- | --- |
| `cannot resume dead coroutine` | resume 已 dead 的协程 | 检查 status |
| `cannot resume non-suspended coroutine` | resume running/normal 协程 | 等待 yield |
| `attempt to yield from outside a coroutine` | 主线程 yield | 确保在协程内 |
| `attempt to yield across metamethod/C-call boundary` | 跨 C 边界 yield | 升级到 5.3+ 或 LuaJIT |
| `bad argument #1 to 'resume'` | resume 非 thread 参数 | 检查类型 |

## 附录 C:术语对照表

| 英文 | 中文 | 说明 |
| --- | --- | --- |
| coroutine | 协程 | 可暂停的函数 |
| resume | 恢复 | 恢复协程执行 |
| yield | 让出/挂起 | 暂停协程 |
| suspend | 挂起 | 状态 |
| continuation | 续延 | 计算的剩余 |
| CPS | 续延传递风格 | Continuation-Passing Style |
| callback hell | 回调地狱 | 嵌套回调的负面模式 |
| Promise | 承诺 | 异步值的容器 |
| async/await | 异步/等待 | 语法糖 |
| generator | 生成器 | 协程迭代器 |
| backpressure | 背压 | 流量控制 |
| monad | 单子 | 范畴论概念 |

## 附录 D:版本兼容性表

| 功能 | 5.0 | 5.1 | 5.2 | 5.3 | 5.4 | 5.5 | LuaJIT | Luau |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `coroutine.create` | 是 | 是 | 是 | 是 | 是 | 是 | 是 | 是 |
| `coroutine.resume` | 是 | 是 | 是 | 是 | 是 | 是 | 是 | 是 |
| `coroutine.yield` | 是 | 是 | 是 | 是 | 是 | 是 | 是 | 是 |
| `coroutine.wrap` | 是 | 是 | 是 | 是 | 是 | 是 | 是 | 是 |
| `coroutine.status` | 是 | 是 | 是 | 是 | 是 | 是 | 是 | 是 |
| `coroutine.running` | 否 | 是(无主线程标志) | 是(带标志) | 是 | 是 | 是 | 是 | 是 |
| `coroutine.isyieldable` | 否 | 否 | 否 | 是 | 是 | 是 | 是 | 是 |
| 跨 C 边界 yield | 否 | 否 | 部分 | 是 | 是 | 是 | 是 | 是 |
| `coroutine.close` | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 是 |

## 附录 E:习题答案

### E.1 习题 1 答案

见 §10.1 参考答案。

### E.2 思考题 1 答案要点

- **IO 密集场景优势**:协程切换开销小（μs 级 vs 线程 ms 级）,无内核陷入。
- **协程劣于线程场景**:
  - CPU 密集任务:协程需显式 yield,易阻塞事件循环。
  - 多核并行:协程单线程,无法利用多核。
  - 需要抢占的场景:协程协作式,无法强制中断。

### E.3 思考题 2 答案要点

- Lua 协程可模拟"逃逸续延"（escape continuation）,但不能实现"任意续延"（any continuation）。
- 缺失:续延的重入（reentry）,即不能多次调用同一续延。
- 原因:Lua 协程栈是线性的,yield 后不能"回到过去"。

### E.4 思考题 3 答案要点

- 检测方法:
  1. 跟踪所有创建的协程,定期检查 status。
  2. 使用 `collectgarbage("count")` 监控内存增长。
  3. 集成到 metrics 系统,监控活跃协程数。
- 需要信息:协程创建栈、当前状态、上次 resume 时间。

### E.5 思考题 4 答案要点

- **多进程**:每个进程一个 Lua VM,通过 IPC 通信。
- **LuaJIT + FFI**:绑定 C 线程库,在 C 中调用 Lua。
- **LPEG**:并行解析。
- **LuaDist**:多 Lua 状态机,共享内存。
- **未来**:Lua 5.5+ 可能引入并行支持,但当前无原生多线程。

## 结语

协程是 Lua 提供的核心并发原语,介于函数与线程之间,兼具表达力与效率。理解协程需掌握:

1. **协作式调度**的语义与陷阱。
2. **CPS 变换**与异步编程的范畴论基础。
3. **Promise 与 async/await**的实现与使用。
4. **工程实践**中的生命周期管理、错误处理、取消机制。
5. **多领域应用**:游戏脚本、Web 服务、嵌入式、桌面应用。

通过本章学习,读者应能:

- 熟练使用协程实现迭代器、状态机、异步任务。
- 设计并实现完整的异步框架。
- 在 Redis、Nginx、Neovim、Love2D 等宿主中正确使用协程。
- 分析并解决协程泄漏、错误传播、跨边界 yield 等工程问题。

后续章节将深入 C API、元表与元方法、模块系统等高级主题,继续构建完整的 Lua 工程知识体系。
