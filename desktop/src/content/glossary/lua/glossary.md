---
title: 'Glossary'
module: 'lua'
---

## Lua 专有名词查阅表

## 名词列表

Lua 术语表已完整补全，分为三个独立文件：

### 核心语言术语（Core Language）

详见：[lua-glossary-core.md](lua-glossary-core.md)

包含 Lua 基础概念：变量与数据类型、控制流（if/for/while）、运算符、函数定义、作用域、注释等核心语言特性。

### 标准库术语（Standard Library）

详见：[lua-glossary-stdlib.md](lua-glossary-stdlib.md)

包含 Lua 标准库核心模块：table 库、string 库、math 库、io 库、os 库、package 库、coroutine 库、debug 库等常用 API。

### 高级特性术语（Advanced Features）

详见：[lua-glossary-advanced.md](lua-glossary-advanced.md)

包含 Lua 高级特性：元表与元方法、协程、闭包、面向对象编程、模块系统、迭代器、尾调用优化等。

## 术语导航

### A-C

- anonymous function（匿名函数）
- array（数组）
- assignment（赋值）
- block（代码块）
- boolean（布尔值）

### C-F

- closure（闭包）
- comment（注释）
- coroutine（协程）
- data type（数据类型）
- environment（环境）

### F-I

- function（函数）
- function factory（函数工厂）
- garbage collection（垃圾回收）
- global variable（全局变量）
- hash table（哈希表）
- higher-order function（高阶函数）

### I-M

- inheritance（继承）
- iterator（迭代器）
- lexical scope（词法作用域）
- local variable（局部变量）
- loop（循环）
- metatable（元表）

### M-P

- metamethod（元方法）
- module（模块）
- multiple return values（多返回值）
- nil（空值）
- object（对象）
- OOP（面向对象编程）

### P-T

- package（包）
- pairs/ipairs（迭代器）
- polymorphism（多态）
- random seed（随机种子）
- string（字符串）
- table（表）

### T-V

- tail call（尾调用）
- thread（线程）
- type checking（类型检查）
- upvalue（向上值）
- varargs（可变参数）
- variable（变量）

## 快速链接

- [Lua 教程目录](../docs/lua/)
- [Lua 核心语言术语表](lua-glossary-core.md)
- [Lua 标准库术语表](lua-glossary-stdlib.md)
- [Lua 高级特性术语表](lua-glossary-advanced.md)

## Lua 高级特性名词注释 (Advanced Features Glossary)

## A

| 术语       | 英文                   | 释义                                                               |
| ---------- | ---------------------- | ------------------------------------------------------------------ |
| 匿名函数   | Anonymous Function     | 没有名字的函数，常用作回调：`function(x) return x * 2 end`         |
| 尾调用优化 | Tail Call Optimization | 函数最后一步调用另一函数时复用当前栈帧，避免栈溢出，用于实现尾递归 |

## C

| 术语   | 英文           | 释义                                                             |
| ------ | -------------- | ---------------------------------------------------------------- |
| 类     | Class          | 面向对象中的模板/类型，Lua 通过表和元表模拟类的概念              |
| 类对象 | Class Instance | 类的具体实例，通过调用类的构造函数创建                           |
| 闭包   | Closure        | 捕获外层局部变量的函数，即使外层函数已返回，闭包仍能访问这些变量 |
| 协程   | Coroutine      | 可挂起和恢复执行的函数，非抢占式多任务，适合异步编程和迭代器     |
| 协程池 | Coroutine Pool | 预创建协程的集合，复用协程减少创建开销                           |

## D

| 术语     | 英文                 | 释义                                                   |
| -------- | -------------------- | ------------------------------------------------------ |
| 深度复制 | Deep Copy            | 递归复制表及其嵌套表，避免共享引用导致的数据修改问题   |
| 依赖注入 | Dependency Injection | 将依赖对象传入而非内部创建的编程模式，提高模块可测试性 |
| 设计模式 | Design Pattern       | 解决特定问题的可复用代码结构，如单例、工厂、观察者等   |

## E

| 术语     | 英文          | 释义                                                     |
| -------- | ------------- | -------------------------------------------------------- |
| 封装     | Encapsulation | 将数据和操作封装在对象中，Lua 可通过闭包和下划线约定实现 |
| 事件系统 | Event System  | 基于发布-订阅的设计模式，组件注册监听器响应事件          |

## F

| 术语       | 英文                 | 释义                                                       |
| ---------- | -------------------- | ---------------------------------------------------------- |
| 文件对象   | File Object          | `io.open` 返回的句柄，提供 `read`、`write`、`close` 等方法 |
| 函数工厂   | Function Factory     | 返回函数的函数，根据参数生成不同行为的函数                 |
| 函数记忆化 | Function Memoization | 缓存函数调用结果避免重复计算，提升递归函数性能             |
| 工厂模式   | Factory Pattern      | 通过工厂函数创建对象，隐藏具体实现细节                     |

## G

| 术语     | 英文               | 释义                                                        |
| -------- | ------------------ | ----------------------------------------------------------- |
| 垃圾回收 | Garbage Collection | 自动内存管理机制，回收不再引用的表和对象，Lua 内置增量式 GC |
| 生成器   | Generator          | 使用协程实现的迭代器，通过 `coroutine.wrap` 简化创建        |

## H

| 术语     | 英文                  | 释义                                                     |
| -------- | --------------------- | -------------------------------------------------------- |
| 高阶函数 | Higher-Order Function | 接受函数为参数或返回函数的函数，如 `map`、`filter`       |
| 继承     | Inheritance           | 子类获得父类属性和方法，Lua 通过元表链实现单继承和多继承 |

## I

| 术语       | 英文             | 释义                                                             |
| ---------- | ---------------- | ---------------------------------------------------------------- |
| 迭代器     | Iterator         | 返回序列值对象，每次调用返回下一个值，Lua 通过协程轻松实现迭代器 |
| 不可变对象 | Immutable Object | 创建后状态不可改变的对象，Lua 通过只读元表实现                   |

## L

| 术语     | 英文     | 释义                                                 |
| -------- | -------- | ---------------------------------------------------- |
| LuaRocks | LuaRocks | Lua 的包管理器，用于安装和管理第三方库，类似 pip/npm |

## M

| 术语     | 英文                   | 释义                                                                |
| -------- | ---------------------- | ------------------------------------------------------------------- |
| 元方法   | Metamethod             | 元表中的特殊方法，如 `__add`、`__index`、`__call`，定义表的操作行为 |
| 元表     | Metatable              | 附加在表上改变其行为的表，通过 `setmetatable` 设置                  |
| 元编程   | Metaprogramming        | 代码操作代码的技术，Lua 通过元表和 `load` 函数实现简单的元编程      |
| 模块     | Module                 | 组织代码的单元，将相关函数和变量封装在表中，避免全局污染            |
| 模块缓存 | Module Cache           | `package.loaded` 表存储已加载模块，避免重复加载                     |
| 多继承   | Multiple Inheritance   | 类继承多个父类，Lua 通过多索引查找实现多继承                        |
| 多返回值 | Multiple Return Values | 函数返回多个值，如 `function() return 1, 2, 3 end`                  |

## O

| 术语         | 英文      | 释义                                                         |
| ------------ | --------- | ------------------------------------------------------------ |
| 对象         | Object    | 拥有状态（属性）和行为（方法）的实体，Lua 中表就是对象       |
| 面向对象编程 | OOP       | 以对象为中心的编程范式，核心概念：封装、继承、多态           |
| openresty    | OpenResty | 基于 Nginx 的高性能 Web 平台，通过 Lua 扩展实现动态 Web 服务 |

## P

| 术语              | 英文                      | 释义                                                     |
| ----------------- | ------------------------- | -------------------------------------------------------- |
| 包                | Package                   | 一组相关模块的集合，发布和分发的单位                     |
| 包路径            | Package Path              | `package.path` 定义 Lua 模块搜索路径，包含通配符 `?`     |
| 管道模式          | Pipeline Pattern          | 将数据通过一系列处理函数传递，类似 Unix 管道             |
| 多态              | Polymorphism              | 同一操作作用于不同对象产生不同行为，Lua 通过方法覆盖实现 |
| 私有变量          | Private Variable          | 类内部使用不对外公开的变量，Lua 通过闭包或下划线约定实现 |
| 生产者-消费者模式 | Producer-Consumer Pattern | 一方生产数据一方消费数据，通过协程或队列协调             |

## R

| 术语    | 英文            | 释义                                             |
| ------- | --------------- | ------------------------------------------------ |
| require | Require         | 加载模块的标准函数，检查缓存并调用搜索器加载模块 |
| 读写锁  | Read-Write Lock | 允许多读单写的并发控制模式，通过元表模拟实现     |

## S

| 术语     | 英文              | 释义                                                                 |
| -------- | ----------------- | -------------------------------------------------------------------- |
| 沙箱     | Sandbox           | 限制代码执行权限的环境，防止恶意或危险操作                           |
| 浅复制   | Shallow Copy      | 只复制表第一层，嵌套表仍共享引用                                     |
| 单例模式 | Singleton Pattern | 类只有一个实例，全局唯一访问点                                       |
| 弱表     | Weak Table        | 值为弱引用的表，垃圾回收可自动清理其中的对象，用于缓存和避免循环引用 |
| 弱引用   | Weak Reference    | 不阻止垃圾回收的引用类型，弱表中的键或值为弱引用时可不阻止 GC        |

## T

| 术语   | 英文            | 释义                                                 |
| ------ | --------------- | ---------------------------------------------------- |
| 表引用 | Table Reference | 变量存储的是表的引用而非副本，多个变量可指向同一表   |
| 尾递归 | Tail Recursion  | 函数最后一步是调用自身，适合被尾调用优化，避免栈溢出 |

## U

| 术语    | 英文    | 释义                                                   |
| ------- | ------- | ------------------------------------------------------ |
| Upvalue | Upvalue | 闭包捕获的外层局部变量，提供闭包访问和持久化状态的能力 |

## V

| 术语 | 英文   | 释义                                                            |
| ---- | ------ | --------------------------------------------------------------- |
| 向量 | Vector | 表示方向或点的数据结构，Lua 中用 `{x, y}` 或表模拟二维/三维向量 |

## W

| 术语   | 英文        | 释义                                                |
| ------ | ----------- | --------------------------------------------------- |
| 工作池 | Worker Pool | 预创建工作线程/协程的集合，任务分发给空闲工作器处理 |

## Y

| 术语  | 英文  | 释义                                                               |
| ----- | ----- | ------------------------------------------------------------------ |
| Yield | Yield | 协程挂起点，`coroutine.yield()` 暂停执行并返回值给 `resume` 调用者 |

## \_\_

| 术语                 | 英文                          | 释义                                                   |
| -------------------- | ----------------------------- | ------------------------------------------------------ |
| \_\_add 元方法       | Addition Metamethod           | 定义表加法操作 `+` 的行为                              |
| \_\_call 元方法      | Call Metamethod               | 使表可像函数一样调用 `table()`，定义表的"调用"行为     |
| \_\_concat 元方法    | Concat Metamethod             | 定义表连接操作 `..` 的行为                             |
| \_\_div 元方法       | Division Metamethod           | 定义表除法操作 `/` 的行为                              |
| \_\_eq 元方法        | Equality Metamethod           | 定义表相等比较 `==` 的行为                             |
| \_\_gc 元方法        | Garbage Collection Metamethod | 对象被垃圾回收前调用，用于清理资源（如关闭文件）       |
| \_\_index 元方法     | Index Metamethod              | 访问表不存在的键时调用，可用于实现继承和默认值         |
| \_\_le 元方法        | Less-Equal Metamethod         | 定义表小于等于比较 `<=` 的行为                         |
| \_\_len 元方法       | Length Metamethod             | 定义表长度操作 `#` 的行为                              |
| \_\_lt 元方法        | Less-Than Metamethod          | 定义表小于比较 `<` 的行为                              |
| \_\_metatable 元方法 | Metatable Protection          | 保护元表，阻止获取和修改元表                           |
| \_\_mod 元方法       | Modulo Metamethod             | 定义表取模操作 `%` 的行为                              |
| \_\_mul 元方法       | Multiplication Metamethod     | 定义表乘法操作 `*` 的行为                              |
| \_\_newindex 元方法  | New Index Metamethod          | 对表不存在的键赋值时调用，可实现只读表或自动创建嵌套表 |
| \_\_pow 元方法       | Power Metamethod              | 定义表幂运算 `^` 的行为                                |
| \_\_pairs 元方法     | Pairs Metamethod              | 定义 `pairs()` 的遍历行为（Lua 5.3+）                  |
| \_\_sub 元方法       | Subtraction Metamethod        | 定义表减法操作 `-` 的行为                              |
| \_\_tostring 元方法  | To String Metamethod          | 定义 `tostring()` 和 `print()` 的输出格式              |
| \_\_unm 元方法       | Unary Minus Metamethod        | 定义表负号操作 `-table` 的行为                         |
| \_\_ipairs 元方法    | IPairs Metamethod             | 定义 `ipairs()` 的遍历行为（Lua 5.3+）                 |

## Lua 核心语言名词注释 (Core Language Glossary)

## A

| 术语       | 英文                 | 释义                                                                                              |
| ---------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| 算术运算符 | Arithmetic Operator  | Lua 的算术运算符：`+`（加）、`-`（减）、`*`（乘）、`/`（除）、`^`（幂）、`%`（取模）、`-`（负号） |
| 赋值语句   | Assignment Statement | 将值赋给变量的操作，Lua 支持多重赋值 `a, b = b, a`（交换变量）                                    |

## B

| 术语     | 英文        | 释义                                                              |
| -------- | ----------- | ----------------------------------------------------------------- |
| 块作用域 | Block Scope | 由 `do...end` 包裹的代码块，局部变量在其中有效                    |
| 布尔值   | Boolean     | Lua 的布尔类型，只有 `true` 和 `false`，注意 `0` 和空字符串也是真 |

## C

| 术语          | 英文               | 释义                                                               |
| ------------- | ------------------ | ------------------------------------------------------------------ |
| 注释          | Comment            | 代码中的说明文字，单行注释 `--`，多行注释 `--[[...]]`              |
| continue 语句 | Continue Statement | Lua 5.2+ 支持的循环控制语句，跳过本次迭代继续下一次                |
| 条件分支      | Conditional Branch | 根据条件选择执行路径的结构，使用 `if...then...elseif...else...end` |

## D

| 术语        | 英文         | 释义                                                                                     |
| ----------- | ------------ | ---------------------------------------------------------------------------------------- |
| 数据类型    | Data Type    | Lua 变量的类型系统，包括 nil、boolean、number、string、function、table、thread、userdata |
| do...end 块 | Do-End Block | Lua 的代码块语法，用于创建作用域                                                         |

## E

| 术语     | 英文             | 释义                                  |
| -------- | ---------------- | ------------------------------------- |
| 跳出语句 | Escape Statement | 退出循环的关键字，如 `break` 跳出循环 |

## F

| 术语     | 英文                | 释义                                                                                            |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| false    | False               | 布尔假值，与 `nil` 一起被视为假                                                                 |
| for 循环 | For Loop            | 数值 for 循环 `for i=start, end, step do...end` 和泛型 for 循环 `for k, v in pairs(t) do...end` |
| 函数     | Function            | Lua 中的一等公民，可存储在变量中、作为参数传递、作为返回值，支持多返回值和可变参数              |
| 函数定义 | Function Definition | 使用 `function name()...end` 或 `local name = function()...end` 定义函数                        |
| 函数调用 | Function Call       | 执行函数的操作，使用 `func(args)` 调用                                                          |

## G

| 术语      | 英文            | 释义                                                                  |
| --------- | --------------- | --------------------------------------------------------------------- |
| 全局变量  | Global Variable | 未使用 `local` 声明的变量，存储在全局表 `_G` 中，建议尽量使用局部变量 |
| goto 语句 | Goto Statement  | Lua 5.2+ 支持的跳转语句，跳转到指定标签位置                           |

## I

| 术语    | 英文         | 释义                                                                    |
| ------- | ------------ | ----------------------------------------------------------------------- |
| if 语句 | If Statement | 条件分支语句，语法 `if condition then...end`，可配合 `elseif` 和 `else` |
| 整数    | Integer      | Lua 5.3+ 支持的整数类型，与浮点数区分，如 `42`、`0xFF`                  |
| ipairs  | IPairs       | 遍历数组风格表的迭代器，按整数索引 1 开始顺序遍历，遇到 nil 停止        |

## L

| 术语       | 英文             | 释义                                                                      |
| ---------- | ---------------- | ------------------------------------------------------------------------- |
| 局部变量   | Local Variable   | 使用 `local` 关键字声明的变量，作用域限于声明的块内，访问速度比全局变量快 |
| 逻辑运算符 | Logical Operator | Lua 的逻辑运算符：`and`（与）、`or`（或）、`not`（非），支持短路求值      |
| 循环结构   | Loop Structure   | 重复执行代码的结构，包括 while、for、repeat-until 三种                    |

## M

| 术语     | 英文                | 释义                                                         |
| -------- | ------------------- | ------------------------------------------------------------ |
| 多重赋值 | Multiple Assignment | 同时给多个变量赋值，如 `a, b = 1, 2`，Lua 会先计算右侧再赋值 |

## N

| 术语          | 英文             | 释义                                                                 |
| ------------- | ---------------- | -------------------------------------------------------------------- |
| nil           | Nil              | 表示"不存在"或"无效值"，未初始化变量默认为 nil，从表中删除键设为 nil |
| 数值 for 循环 | Numeric For Loop | `for i = start, stop, step do...end`，自动控制循环次数               |

## O

| 术语   | 英文     | 释义                                                           |
| ------ | -------- | -------------------------------------------------------------- |
| 运算符 | Operator | 用于操作的符号，包括算术、关系、逻辑、字符串连接、表访问运算符 |

## P

| 术语              | 英文              | 释义                                                           |
| ----------------- | ----------------- | -------------------------------------------------------------- |
| pairs             | Pairs             | 遍历表（字典风格）的迭代器，无序遍历所有键值对，包括 nil 值    |
| 参数              | Parameter         | 函数定义时的占位符，分为形参和实参                             |
| repeat-until 循环 | Repeat-Until Loop | `repeat...until condition`，循环体至少执行一次，条件为真时结束 |

## R

| 术语       | 英文                | 释义                                                                                                   |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| 关系运算符 | Relational Operator | 比较运算符：`==`（等于）、`~=`（不等于）、`<`（小于）、`>`（大于）、`<=`（小于等于）、`>=`（大于等于） |

## S

| 术语       | 英文                     | 释义                                                                 |
| ---------- | ------------------------ | -------------------------------------------------------------------- |
| 字符串     | String                   | Lua 的文本类型，支持单引号、双引号、长字符串 `[[...]]`，字符串不可变 |
| 字符串连接 | String Concatenation     | 使用 `..` 运算符连接字符串，如 `"Hello" .. " Lua"`                   |
| 短路求值   | Short-Circuit Evaluation | 逻辑运算符的优化策略，`a and b` 在 a 为假时直接返回 a，不计算 b      |
| 作用域     | Scope                    | 变量可见性和生存时间的范围，Lua 有全局作用域和局部（块）作用域       |
| 语句       | Statement                | Lua 程序的基本执行单元，包括赋值、函数调用、控制结构等               |

## T

| 术语     | 英文            | 释义                                                            |
| -------- | --------------- | --------------------------------------------------------------- |
| table    | Table           | Lua 唯一的容器类型，可表示数组、字典、对象等，是引用类型        |
| true     | True            | 布尔真值，除 `false` 和 `nil` 外的所有值都为真                  |
| 类型判断 | Type Checking   | 使用 `type()` 函数判断变量类型，返回字符串如 "string"、"number" |
| 类型转换 | Type Conversion | 使用 `tonumber()` 和 `tostring()` 在数值和字符串间转换          |

## U

| 术语    | 英文       | 释义                                                               |
| ------- | ---------- | ------------------------------------------------------------------ |
| 标识符  | Identifier | 变量、函数、表的命名，须以字母或下划线开头，后跟字母、数字、下划线 |
| upvalue | Upvalue    | 闭包中捕获的外层局部变量，闭包通过 upvalue 访问和保持状态          |

## V

| 术语     | 英文     | 释义                                                                       |
| -------- | -------- | -------------------------------------------------------------------------- |
| 值       | Value    | Lua 表达式计算的结果，包括 8 种基本类型的具体值                            |
| 变量     | Variable | 存储值的命名位置，使用 `local` 声明为局部变量，不声明为全局变量            |
| 可变参数 | Varargs  | 使用 `...` 表示的函数参数，可接受任意数量的实参，在函数内用 `{...}` 转为表 |

## W

| 术语       | 英文       | 释义                                                 |
| ---------- | ---------- | ---------------------------------------------------- |
| while 循环 | While Loop | `while condition do...end`，条件为真时重复执行循环体 |

## X

| 术语     | 英文             | 释义                                                                                     |
| -------- | ---------------- | ---------------------------------------------------------------------------------------- |
| 协程状态 | Coroutine Status | 协程的运行状态：`suspended`（暂停）、`running`（运行）、`normal`（正常）、`dead`（结束） |

##

| 术语     | 英文            | 释义                                                                                |
| -------- | --------------- | ----------------------------------------------------------------------------------- |
| # 运算符 | Length Operator | 一元运算符，获取字符串长度 `#str` 或数组长度 `#arr`，表长度不定义时返回最大整数索引 |

## Lua 标准库名词注释 (Standard Library Glossary)

## C

| 术语             | 英文             | 释义                                                                                        |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| collectgarbage   | Collect Garbage  | 手动触发垃圾回收的函数，`collectgarbage("collect")` 强制回收，`collectgarbage("stop")` 暂停 |
| coroutine.create | Create Coroutine | 创建协程的函数，参数为要执行的函数，返回协程对象                                            |
| coroutine.resume | Resume Coroutine | 启动或恢复协程执行，参数为协程和传递给协程的值，返回执行状态和返回值                        |
| coroutine.status | Coroutine Status | 查询协程状态的函数，返回 "running"、"suspended"、"normal" 或 "dead"                         |
| coroutine.wrap   | Wrap Coroutine   | 创建协程包装函数，返回一个函数，调用该函数等同于 `resume` 协程                              |
| coroutine.yield  | Yield Coroutine  | 挂起协程并返回值，调用 `resume` 时可传递值给协程                                            |

## D

| 术语            | 英文           | 释义                                                              |
| --------------- | -------------- | ----------------------------------------------------------------- |
| debug.debug     | Debug REPL     | 进入交互式调试器的函数，输入 Lua 代码执行                         |
| debug.getinfo   | Get Debug Info | 获取函数或调用栈信息的函数，可获取函数定义位置、调用者等          |
| debug.traceback | Traceback      | 获取调用栈的字符串表示，常用于错误处理中生成堆栈跟踪              |
| dofile          | Do File        | 执行文件的函数，`dofile("script.lua")` 读取并执行文件，无错误保护 |
| dongetmetatable | Get Metatable  | 获取表的元表（需设置 `__metatable` 字段才可获取）                 |

## E

| 术语         | 英文               | 释义                                                                      |
| ------------ | ------------------ | ------------------------------------------------------------------------- |
| error        | Error              | 抛出错误的函数，`error("message", level)` 可指定错误层级                  |
| \_G          | Global Environment | 全局环境表，存储所有全局变量，`_G._G == _G`                               |
| getmetatable | Get Metatable      | 获取对象的元表，如元表设置了 `__metatable` 则返回该值而非元表             |
| io.close     | Close File         | 关闭文件，`file:close()` 或 `io.close(file)`                              |
| io.flush     | Flush Output       | 刷新输出缓冲区，将缓冲数据写入文件或标准输出                              |
| io.input     | Set Input File     | 设置默认输入文件，`io.input(filename)` 打开文件，`io.input():read()` 读取 |
| io.lines     | Iterate File Lines | 返回文件行的迭代器，`for line in io.lines("file.txt") do...end`           |
| io.open      | Open File          | 打开文件的函数，返回文件对象，模式："r"（读）、"w"（写）、"a"（追加）     |
| io.output    | Set Output File    | 设置默认输出文件，类似 `io.input`                                         |
| io.popen     | Pipe I/O           | 执行系统命令并返回可读写的文件对象（部分环境支持）                        |
| io.read      | Read from Input    | 从标准输入读取，`io.read("*all")`、`io.read("*line")`、`io.read("*n")`    |
| io.tmpfile   | Temporary File     | 返回临时文件的读写句柄，程序结束时自动删除                                |
| io.type      | Check File Type    | 检查对象是否为合法文件句柄，返回 "file"、"closed file" 或 nil             |
| io.write     | Write to Output    | 向标准输出或文件写入，等同于 `io.output():write()`                        |

## L

| 术语       | 英文        | 释义                                                           |
| ---------- | ----------- | -------------------------------------------------------------- |
| load       | Load Chunk  | 加载代码字符串或函数的函数，返回编译后的函数或错误，可指定环境 |
| loadfile   | Load File   | 从文件加载代码，类似 `load`，但从文件读取                      |
| loadstring | Load String | 加载代码字符串，`loadstring("code")` 已废弃，推荐使用 `load`   |

## M

| 术语            | 英文               | 释义                                                             |
| --------------- | ------------------ | ---------------------------------------------------------------- |
| math.abs        | Absolute Value     | 返回绝对值 `math.abs(-5)` → 5                                    |
| math.acos       | Arc Cosine         | 返回反余弦值（弧度），`math.acos(x)`                             |
| math.asin       | Arc Sine           | 返回反正弦值（弧度），`math.asin(x)`                             |
| math.atan       | Arc Tangent        | 返回反正切值（弧度），`math.atan(y, x)` 返回 y/x 的反正切        |
| math.ceil       | Ceiling            | 向上取整，`math.ceil(3.2)` → 4                                   |
| math.cos        | Cosine             | 余弦函数（弧度），`math.cos(math.pi)`                            |
| math.deg        | Convert to Degrees | 弧度转角度，`math.deg(math.pi)` → 180                            |
| math.exp        | Exponential        | 返回 e 的 x 次方，`math.exp(1)` → 2.718...                       |
| math.floor      | Floor              | 向下取整，`math.floor(3.8)` → 3                                  |
| math.fmod       | Float Modulo       | 浮点数取模，`math.fmod(10, 3)` → 1                               |
| math.huge       | Infinity           | 无穷大常量，比任何数值都大                                       |
| math.idiv       | Integer Divide     | 整数除法，`math.idiv(10, 3)` → 3                                 |
| math.inf        | Infinity           | 正无穷常量                                                       |
| math.log        | Natural Logarithm  | 自然对数，`math.log(math.exp(2))` → 2                            |
| math.max        | Maximum            | 返回最大值，`math.max(1, 5, 3)` → 5                              |
| math.maxinteger | Max Integer        | 平台最大整数                                                     |
| math.min        | Minimum            | 返回最小值，`math.min(1, 5, 3)` → 1                              |
| math.mininteger | Min Integer        | 平台最小整数                                                     |
| math.modf       | Integer Part       | 返回整数和小数部分，`math.modf(3.5)` → 3, 0.5                    |
| math.pi         | Pi                 | 圆周率常量，约等于 3.1415926535898                               |
| math.rad        | Convert to Radians | 角度转弧度，`math.rad(180)` → π                                  |
| math.random     | Random Number      | 生成伪随机数，无参数返回 [0,1)，可指定范围 `math.random(1, 100)` |
| math.randomseed | Random Seed        | 设置随机数种子，`math.randomseed(os.time())` 确保每次运行不同    |
| math.sin        | Sine               | 正弦函数（弧度），`math.sin(math.pi/2)` → 1                      |
| math.sqrt       | Square Root        | 平方根，`math.sqrt(16)` → 4                                      |
| math.tan        | Tangent            | 正切函数（弧度），`math.tan(math.pi/4)` → 1                      |
| math.tointeger  | To Integer         | 转换为整数，`math.tointeger("42")` → 42，无效返回 nil            |
| math.type       | Number Type        | 返回 "integer" 或 "float"，`math.type(42)` → "integer"           |
| math.ult        | Unsigned Less Than | 无符号整数比较，用于处理整数溢出情况                             |

## O

| 术语         | 英文                     | 释义                                                           |
| ------------ | ------------------------ | -------------------------------------------------------------- |
| os.clock     | CPU Time                 | 返回程序消耗的 CPU 时间（秒）                                  |
| os.date      | Current Date             | 返回日期时间表或格式化字符串，`os.date("*t")` 返回年月日时分秒 |
| os.difftime  | Time Difference          | 计算两个时间的差（秒），`os.difftime(t2, t1)`                  |
| os.execute   | Execute Command          | 执行系统命令，返回退出状态                                     |
| os.exit      | Exit Program             | 终止程序执行，可指定退出码 `os.exit(0)`                        |
| os.getenv    | Get Environment Variable | 获取环境变量值，`os.getenv("PATH")`                            |
| os.remove    | Remove File              | 删除文件，`os.remove("temp.txt")`                              |
| os.rename    | Rename File              | 重命名文件，`os.rename("old.txt", "new.txt")`                  |
| os.setlocale | Set Locale               | 设置程序区域，影响日期格式等                                   |
| os.time      | Unix Timestamp           | 返回当前或指定时间的 Unix 时间戳（秒）                         |
| os.tmpname   | Temporary Filename       | 返回临时文件的文件名（需后续创建）                             |

## P

| 术语               | 英文               | 释义                                                     |
| ------------------ | ------------------ | -------------------------------------------------------- |
| package.config     | Package Config     | 包路径配置字符串，包含路径分隔符等信息                   |
| package.cpath      | C Library Path     | C 库搜索路径，用于 `require` 加载 C 模块                 |
| package.loaded     | Loaded Packages    | 已加载模块表，存储 `require` 返回的模块对象              |
| package.loaders    | Module Loaders     | 模块加载器列表（Lua 5.1 兼容）                           |
| package.loading    | Package Loading    | 正在加载的模块表，用于循环依赖检测                       |
| package.path       | Lua Module Path    | Lua 模块搜索路径，`require` 用于查找 .lua 文件           |
| package.preload    | Preload Table      | 预加载模块表，可手动注册模块加载函数                     |
| package.searchers  | Module Searchers   | 模块搜索器列表（Lua 5.2+）                               |
| package.searchpath | Search Module Path | 在给定路径中搜索模块文件                                 |
| pairs              | Pairs Iterator     | 遍历表的键值对迭代器，`for k, v in pairs(t) do...end`    |
| pcall              | Protected Call     | 受保护的函数调用，捕获错误不终止程序，`pcall(func, ...)` |
| ipairs             | IPairs Iterator    | 遍历数组风格表的迭代器，按索引顺序遍历                   |

## R

| 术语     | 英文            | 释义                                                                                  |
| -------- | --------------- | ------------------------------------------------------------------------------------- |
| rawequal | Raw Equal       | 原始相等比较，不调用元方法，`rawequal(a, b)`                                          |
| rawget   | Raw Get         | 原始表读取，不调用 `__index` 元方法                                                   |
| rawlen   | Raw Length      | 原始长度获取，不调用 `__len` 元方法                                                   |
| rawset   | Raw Set         | 原始表写入，不调用 `__newindex` 元方法                                                |
| require  | Require Module  | 加载模块的函数，检查 `package.loaded` 缓存，支持自定义搜索器                          |
| select   | Select Argument | 获取可变参数，`select("#", ...)` 返回参数个数，`select(i, ...)` 返回第 i 个及之后参数 |

## S

| 术语            | 英文              | 释义                                                              |
| --------------- | ----------------- | ----------------------------------------------------------------- |
| setmetatable    | Set Metatable     | 设置表的元表，返回该表                                            |
| string.byte     | String to Byte    | 返回字符的数值编码，`string.byte("A")` → 65                       |
| string.char     | Byte to String    | 数值编码转换为字符，`string.char(65)` → "A"                       |
| string.dump     | Dump Function     | 将函数编译为二进制字符串（序列化）                                |
| string.find     | Find Substring    | 查找子串，返回起始和结束位置，`string.find("hello", "ll")` → 3, 4 |
| string.format   | Format String     | 格式化字符串，类似 C 的 `printf`：`string.format("%.2f", 3.1415)` |
| string.gmatch   | Global Match      | 返回匹配迭代器，`for w in string.gmatch(text, "%w+") do...end`    |
| string.gsub     | Global Substitute | 全局替换，`string.gsub(s, pattern, repl)` 返回新字符串和替换次数  |
| string.len      | String Length     | 返回字符串长度，`string.len("hello")` → 5                         |
| string.lower    | To Lowercase      | 转换为小写，`string.lower("HELLO")` → "hello"                     |
| string.match    | Match Pattern     | 返回第一个匹配，`string.match("hello", "%a+")` → "hello"          |
| string.pack     | Pack Values       | 将值打包为二进制字符串                                            |
| string.packsize | Pack Size         | 返回打包后的字节数                                                |
| string.rep      | Repeat String     | 重复字符串，`string.rep("ab", 3)` → "ababab"                      |
| string.reverse  | Reverse String    | 反转字符串                                                        |
| string.sub      | Substring         | 截取子串，`string.sub("hello", 2, 4)` → "ell"                     |
| string.unpack   | Unpack Values     | 从二进制字符串解包值                                              |
| string.upper    | To Uppercase      | 转换为大写，`string.upper("hello")` → "HELLO"                     |

## T

| 术语         | 英文              | 释义                                                         |
| ------------ | ----------------- | ------------------------------------------------------------ |
| table.concat | Concatenate Table | 连接表元素为字符串，`table.concat(t, ", ")`                  |
| table.insert | Insert Element    | 在表指定位置插入元素，默认末尾插入                           |
| table.move   | Move Elements     | 移动表元素，`table.move(a, f, e, t)` 将 a[f..e] 移动到位置 t |
| table.pack   | Pack Arguments    | 将参数打包为表，`table.pack(...)` 返回带 `n` 字段的表        |
| table.remove | Remove Element    | 删除表指定位置元素，默认删除末尾元素                         |
| table.sort   | Sort Table        | 排序表元素，`table.sort(t, comp)` 可提供比较函数             |
| table.unpack | Unpack Table      | 解包表为多个值，`table.unpack(t)` 等同于 `unpack(t)`         |
| tonumber     | To Number         | 转换为数值，`tonumber("42")` → 42，失败返回 nil              |
| tostring     | To String         | 转换为字符串，调用 `__tostring` 元方法，无则返回类型描述     |
| type         | Type of Value     | 返回值类型的字符串：`"nil"`、`"number"`、`"string"` 等       |

## U

| 术语   | 英文         | 释义                                                        |
| ------ | ------------ | ----------------------------------------------------------- |
| unpack | Unpack Table | 解包表为多个返回值（全局函数，已废弃，推荐 `table.unpack`） |

## V

| 术语   | 英文               | 释义                                               |
| ------ | ------------------ | -------------------------------------------------- |
| vararg | Variable Arguments | 可变参数，使用 `...` 表示，在函数内用 `{...}` 访问 |

## X

| 术语   | 英文                        | 释义                                                  |
| ------ | --------------------------- | ----------------------------------------------------- |
| xpcall | Protected Call with Handler | 带错误处理器的受保护调用，`xpcall(func, err_handler)` |
