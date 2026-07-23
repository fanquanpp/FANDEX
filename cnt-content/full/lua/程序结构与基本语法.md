---
order: 20
tags:
  - lua
difficulty: beginner
title: 程序结构与基本语法
module: lua
category: 'Lua Basics'
description: 'Lua 语法基础、变量、运算符、控制结构与作用域规则的工程级深度解析。'
author: Anonymous
related:
  - lua/概述与环境配置
  - lua/数据类型与Table详解
  - lua/函数与闭包
prerequisites: []
---

## 1. 学习目标

本节依据 Bloom 分类法（Bloom's Taxonomy）按认知层级组织学习目标，帮助学习者由浅入深地掌握 Lua 程序结构与基本语法体系。

### 1.1 记忆层（Remembering）

- 复述 Lua 的 8 种基本数据类型名称与字面量表示。
- 列出 Lua 的所有运算符及其优先级顺序。
- 回顾 `local`、`global`、`do...end` 三种作用域控制手段的语法。
- 识别 `if/elseif/else`、`while`、`repeat...until`、`for`（数值型与泛型）四种控制结构的语法形式。

### 1.2 理解层（Understanding）

- 解释 Lua 中"一切皆值"（everything is a value）的设计哲学及其对语言一致性的影响。
- 阐述 Lua 作用域规则的词法作用域（lexical scoping）特性，对比动态作用域的差异。
- 推断多重赋值在右值数量与左值数量不匹配时的行为。
- 区分 `nil` 在"无值"与"删除表字段"两种语义下的双重作用。

### 1.3 应用层（Applying）

- 编写符合 Lua 风格的变量声明、赋值与作用域控制代码。
- 使用控制结构实现常见算法（如二分查找、冒泡排序、斐波那契数列）。
- 利用 `break` 与 `return` 控制循环退出语义。
- 应用泛型 `for` 与迭代器遍历表、数组、字符串等数据结构。

### 1.4 分析层（Analyzing）

- 分析 Lua 数值类型的双精度浮点表示带来的精度问题与整数子类型（5.3+）的修复。
- 解构短路求值（short-circuit evaluation）在条件表达式中的执行流程。
- 比较数值型 `for` 与泛型 `for` 在性能、可读性、安全性上的差异。
- 辨析 `and`/`or`/`not` 三个逻辑运算符的返回值语义（返回操作数而非布尔值）。

### 1.5 评价层（Evaluating）

- 评估"全局变量默认开启"设计在生产环境中的可维护性风险。
- 评判 Lua 不支持 `++`/`--` 自增运算符与 `+=` 复合赋值的取舍。
- 评价 `repeat...until` 与 `while...do...end` 在不同场景下的可读性。
- 判定在何种业务场景下应使用显式 `local` 声明以避免全局污染。

### 1.6 创造层（Creating）

- 设计一套基于元表的全局变量访问拦截与告警机制。
- 构建一个支持提前退出（early return）与标签跳转（goto）的复杂控制流。
- 实现一个自定义迭代器，遍历文件行、目录树或图节点。
- 创造性地利用 `goto` 实现状态机或异常处理模拟。

## 2. 历史动机与背景

### 2.1 Lua 的设计背景

Lua 由巴西里约热内卢天主教大学（PUC-Rio）的 Roberto Ierusalimschy、Luiz Henrique de Figueiredo 与 Waldemar Celes 三人于 1993 年设计。其最初目标是为 PETROBRAS（巴西石油公司）的工程数据录入系统提供可扩展的脚本语言。在此之前，该团队先后开发了 SOL（Simple Object Language）与 DEL（Data-Entry Language），Lua 是二者融合的产物。

"Lua"在葡萄牙语中意为"月亮"，呼应了其前身 SOL（葡萄牙语"太阳"）。Lua 的设计深受以下语言影响：

- **C 语言**：语法风格（如花括号被 `do...end` 替代）、运算符、基本控制结构。
- **Scheme**：闭包、first-class 函数、尾调用优化。
- **SNOBOL**：字符串模式匹配（Lua 的 `string.find` 与 `string.gsub`）。
- **AWK**：关联数组（Lua 的 table 概念来源）。
- **Modula**：模块系统思想。

### 2.2 语法设计动机

Lua 语法设计的核心目标是"简洁、一致、易嵌入"，具体体现为：

1. **去掉冗余语法**：Lua 不支持 `++`、`--`、`+=`、`-=` 等运算符，理由是它们引入额外的语法规则却仅省略少量字符。Roberto Ierusalimschy 在 *Programming in Lua* 中明确表示："我们不希望语言有太多规则"。

2. **统一的数据结构**：Lua 只有"表"（table）一种数据结构，数组、记录、对象、命名空间等都是表的不同用法。这种"机制而非策略"的设计使语法极简。

3. **显式作用域**：Lua 默认全局变量（与 Python、Ruby 不同），但提供 `local` 显式声明局部变量。这一选择源于嵌入式场景下"快速原型"的需求，但在大型项目中常被视为缺陷，社区通过 linter 与 `_G.__newindex` 拦截弥补。

4. **可扩展语义**：元表机制允许扩展运算符与字段访问行为，使语法表面简洁但语义可扩展。

### 2.3 语法演化

- **Lua 1.x（1993）**：基础语法成型，包括 `local`、`if`、`while`、`for`。
- **Lua 2.x（1996）**：引入 `局部函数` 简写（`local function f`）。
- **Lua 3.x（1997）**：引入 tag method（元方法前身）。
- **Lua 4.x（2000）**：引入多赋值与多返回值。
- **Lua 5.0（2003）**：引入元表与完整的泛型 `for` 语义。
- **Lua 5.1（2006）**：引入 `#` 长度运算符、模块系统标准化。
- **Lua 5.2（2012）**：移除 `setfenv`/`getfenv`，引入 `_ENV`；`goto` 与 `::label::` 标签语法。
- **Lua 5.3（2015）**：引入 64 位整数子类型、位运算符（`&`、`|`、`~`、`<<`、`>>`）。
- **Lua 5.4（2020）**：引入常量声明 `local const`、`<close>` 属性、整型除法 `//`。

## 3. 形式化定义

### 3.1 值域与类型系统

Lua 是动态类型语言，变量无类型，值有类型。设 $V$ 为 Lua 全部值的集合，类型系统 $\tau: V \to T$ 定义为：

$$
T = \{ \text{nil}, \text{boolean}, \text{number}, \text{string}, \text{table}, \text{function}, \text{userdata}, \text{thread} \}
$$

其中 `number` 在 Lua 5.3+ 进一步细分为整数子类型与浮点子类型：

$$
\text{number} = \text{integer} \cup \text{float}
$$

形式化地，整数与浮点在运行时通过子类型标记区分，但二者都是 `number` 类型。

### 3.2 表达式求值

Lua 表达式 $e$ 的求值规则 $\mathcal{E}: e \to V$ 可形式化为：

$$
\mathcal{E}(e) = 
\begin{cases}
v & \text{若 } e \text{ 是字面量} \\
\text{lookup}(\rho, x) & \text{若 } e \text{ 是变量 } x \\
\mathcal{F}(\mathcal{E}(f), \mathcal{E}(a_1), \dots, \mathcal{E}(a_n)) & \text{若 } e \text{ 是函数调用 } f(a_1, \dots, a_n) \\
\mathcal{B}(\text{op}, \mathcal{E}(a), \mathcal{E}(b)) & \text{若 } e \text{ 是二元运算 } a \text{ op } b
\end{cases}
$$

其中 $\rho$ 是当前环境（变量绑定），$\mathcal{F}$ 是函数应用，$\mathcal{B}$ 是二元运算求值。

### 3.3 作用域与环境

Lua 使用词法作用域（lexical scoping）。设环境 $\rho$ 是变量名到值的映射，作用域嵌套关系可表示为：

$$
\rho_{\text{inner}} = \rho_{\text{outer}} \cup \{ x_1 \mapsto v_1, \dots, x_n \mapsto v_n \}
$$

局部变量声明 `local x = v` 在当前作用域中新增绑定 $x \mapsto v$，遮蔽外层同名变量。

Lua 5.2+ 引入 `_ENV`，它是一个 upvalue，指向当前环境表。全局变量访问 `x` 等价于 `_ENV.x`。形式化：

$$
\text{lookup}(\rho, x) = 
\begin{cases}
\rho(x) & \text{若 } x \in \text{dom}(\rho) \text{（局部变量）} \\
\rho(\text{\_ENV})[x] & \text{否则（全局变量）}
\end{cases}
$$

### 3.4 控制流的形式语义

控制流可用状态转换规则描述。设程序状态 $\sigma = (\rho, pc)$，其中 $pc$ 是程序计数器。

**if 语句**：

$$
\langle \text{if } e \text{ then } s_1 \text{ else } s_2 \text{ end}, \sigma \rangle \to 
\begin{cases}
\langle s_1, \sigma' \rangle & \text{若 } \mathcal{E}(e, \sigma) \neq \text{nil} \text{ 且 } \neq \text{false} \\
\langle s_2, \sigma' \rangle & \text{否则}
\end{cases}
$$

**while 循环**：

$$
\langle \text{while } e \text{ do } s \text{ end}, \sigma \rangle \to 
\begin{cases}
\langle s; \text{while } e \text{ do } s \text{ end}, \sigma' \rangle & \text{若 } \mathcal{E}(e, \sigma) \neq \text{nil, false} \\
\langle \epsilon, \sigma' \rangle & \text{否则}
\end{cases}
$$

**数值型 for 循环**：

$$
\langle \text{for } v = e_1, e_2, e_3 \text{ do } s \text{ end}, \sigma \rangle \to 
\langle s[v \mapsto e_1]; \text{for } v = e_1 + e_3, e_2, e_3 \text{ do } s \text{ end}, \sigma \rangle
$$

当 $e_3 > 0$ 且 $v \leq e_2$ 时继续，或 $e_3 < 0$ 且 $v \geq e_2$ 时继续。

## 4. 理论推导

### 4.1 短路求值的复杂度

`and` 与 `or` 运算符采用短路求值（short-circuit evaluation）：

$$
\mathcal{E}(a \text{ and } b, \sigma) = 
\begin{cases}
\mathcal{E}(b, \sigma') & \text{若 } \mathcal{E}(a, \sigma) \neq \text{nil, false} \\
\mathcal{E}(a, \sigma) & \text{否则}
\end{cases}
$$

时间复杂度最坏为 $O(|a| + |b|)$，但若 $a$ 为假，$b$ 不求值，节省 $O(|b|)$。

### 4.2 多重赋值的语义

多重赋值 `x, y = a, b` 的求值规则：

1. 先求值右值列表 `(a, b)`，得到值列表 $(v_a, v_b)$。
2. 若右值数量 $n_r$ 小于左值数量 $n_l$，缺失位置补 `nil`。
3. 若 $n_r > n_l$，多余右值被丢弃。
4. 按左值顺序依次赋值。

注意：步骤 1 在步骤 4 之前完成，因此 `x, y = y, x` 能正确交换两个变量的值。

### 4.3 数值型 for 的循环次数

设 `for v = e1, e2, e3 do ... end`，循环次数 $N$：

$$
N = \left\lfloor \frac{e_2 - e_1}{e_3} \right\rfloor + 1
$$

当 $e_3 > 0$ 且 $e_1 \leq e_2$，或 $e_3 < 0$ 且 $e_1 \geq e_2$。否则 $N = 0$（不进入循环）。

注意浮点 `e3` 时，由于精度问题，$N$ 可能与预期不符。Lua 5.3+ 建议用整数 `e3` 避免此问题。

### 4.4 整数与浮点的混合运算

Lua 5.3+ 引入整数子类型后，运算规则：

- 整数 $\diamond$ 整数 $=$ 整数（除法 `/` 与幂 `^` 例外，返回浮点）。
- 整数 $\diamond$ 浮点 $=$ 浮点。
- 浮点 $\diamond$ 浮点 $=$ 浮点。

整除 `//` 规则：

$$
a \mathbin{//} b = 
\begin{cases}
\lfloor a / b \rfloor & \text{若 } a, b \text{ 均为整数} \\
\text{math.floor}(a / b) & \text{若 } a \text{ 或 } b \text{ 为浮点}
\end{cases}
$$

### 4.5 字符串驻留与比较

Lua 内部对短字符串（≤40 字节）进行驻留（interning），即相同内容的字符串在内存中只有一份副本。这使得字符串相等比较 $O(1)$（指针比较）。

长字符串（>40 字节）不驻留，相等比较为 $O(n)$（逐字节比较）。

## 5. 代码示例

### 5.1 变量与赋值

```lua
-- 变量声明与赋值示例
-- 演示全局变量、局部变量、表字段的差异

-- 全局变量：默认所有未声明为 local 的变量都是全局的
-- 全局变量存储在 _G 表中
greeting = "Hello, Lua"
print(_G.greeting)  -- 输出 Hello, Lua

-- 局部变量：使用 local 关键字声明，作用域限于声明所在的块
local x = 10
local y = 20

-- 多重赋值：Lua 支持一次性给多个变量赋值
local a, b, c = 1, 2, 3
print(a, b, c)  -- 输出 1  2  3

-- 变量交换：利用多重赋值优雅地交换两个变量
local p, q = "first", "second"
p, q = q, p
print(p, q)  -- 输出 second  first

-- 右值数量不匹配：多出的左值补 nil，多出的右值被丢弃
local m, n = 100  -- n 为 nil
print(m, n)  -- 输出 100  nil

local r, s = 1, 2, 3  -- 3 被丢弃
print(r, s)  -- 输出 1  2

-- 多返回值与多重赋值配合
local function multiReturn()
    return 10, 20, 30
end

local v1, v2, v3 = multiReturn()
print(v1, v2, v3)  -- 输出 10  20  30

-- 表字段赋值
local person = {}
person.name = "Alice"
person.age = 30
print(person.name, person.age)  -- 输出 Alice  30
```

### 5.2 作用域控制

```lua
-- 作用域控制：local、do...end、块作用域

-- 全局变量在任何位置都可访问
globalVar = "I am global"

-- 局部变量仅在声明所在块内有效
do
    local localVar = "I am local to this block"
    print(localVar)  -- 输出 I am local to this block
    print(globalVar)  -- 输出 I am global
end
-- print(localVar)  -- 错误：localVar 在块外不可见

-- 内层作用域遮蔽外层同名变量
local x = 1
do
    local x = 2  -- 遮蔽外层 x
    print(x)  -- 输出 2
end
print(x)  -- 输出 1（外层 x 未被修改）

-- 条件语句中的局部变量
local condition = true
if condition then
    local result = "computed"
    print(result)  -- 输出 computed
end
-- print(result)  -- 错误：result 仅在 if 块内可见

-- 循环变量也是局部变量
for i = 1, 3 do
    local item = "item " .. i
    print(item)
end
-- print(i, item)  -- 错误：i 与 item 在循环外不可见

-- 显式块用于控制资源生命周期
local function processFile()
    do
        -- 模拟文件句柄
        local file = { closed = false, close = function(self) self.closed = true end }
        -- 使用 file 处理数据
        print("Processing...")
        -- 块结束时 file 出作用域，但仍未关闭（Lua 无 RAII）
        -- 需显式调用 close
        file:close()
        print("File closed:", file.closed)
    end
    -- file 在此处不可见
end

processFile()
```

### 5.3 运算符与表达式

```lua
-- 运算符完整示例
-- Lua 运算符优先级从高到低：
--   ^
--   not, -, #
--   *, /, //, %
--   +, -
--   ..（右结合）
--   <<, >>
--   &（按位与）
--   ~（按位异或）
--   |（按位或）
--   <, >, <=, >=, ~=, ==
--   and
--   or

-- 算术运算
local a, b = 10, 3
print(a + b)    -- 13 加法
print(a - b)    -- 7 减法
print(a * b)    -- 30 乘法
print(a / b)    -- 3.3333... 浮点除法（始终返回浮点）
print(a // b)   -- 3 整除（向下取整，Lua 5.3+）
print(a % b)    -- 1 取模（结果与除数同号）
print(a ^ b)    -- 1000 幂运算（始终返回浮点）
print(-a)       -- -10 一元负号

-- 比较运算
print(a == b)   -- false 等于
print(a ~= b)   -- true 不等于（注意：Lua 用 ~= 而非 !=）
print(a < b)    -- false 小于
print(a > b)    -- true 大于
print(a <= b)   -- false 小于等于
print(a >= b)   -- true 大于等于

-- 逻辑运算（返回操作数而非布尔值，支持短路求值）
print(true and "yes")       -- yes（true 为真，返回右值）
print(false and "yes")      -- false（false 为假，短路返回左值）
print(nil or "default")     -- default（nil 为假，返回右值）
print("value" or "default") -- value（"value" 为真，短路返回左值）
print(not nil)              -- true
print(not "value")          -- false

-- 字符串连接（.. 是右结合）
local s = "Hello" .. ", " .. "world"
print(s)  -- Hello, world

-- 长度运算符 #（返回字符串字节数或数组长度）
print(#"hello")  -- 5
print(#"你好")    -- 6（UTF-8 编码下"你好"占 6 字节）

-- 位运算（Lua 5.3+）
print(0xFF & 0x0F)    -- 15 按位与
print(0xF0 | 0x0F)    -- 255 按位或
print(0xFF ~ 0x0F)    -- 240 按位异或
print(~0xFF)          -256 按位非（注意：一元 ~）
print(1 << 4)         -- 16 左移
print(256 >> 4)       -- 16 右移

-- 三元运算符模拟（利用 and/or 短路）
local age = 20
local status = age >= 18 and "adult" or "minor"
print(status)  -- adult
```

### 5.4 控制结构：条件判断

```lua
-- if/elseif/else 完整示例

-- 基础 if
local score = 85
if score >= 60 then
    print("Pass")
end

-- if-else
local temperature = 30
if temperature > 28 then
    print("Hot")
else
    print("Cool")
end

-- if-elseif-else（注意是 elseif 而非 else if）
local grade
if score >= 90 then
    grade = "A"
elseif score >= 80 then
    grade = "B"
elseif score >= 70 then
    grade = "C"
elseif score >= 60 then
    grade = "D"
else
    grade = "F"
end
print(grade)  -- B

-- Lua 中只有 nil 与 false 为假
-- 0 与空字符串均为真！
if 0 then
    print("0 is true in Lua")  -- 会执行
end

if "" then
    print("empty string is true in Lua")  -- 会执行
end

-- 条件赋值：常见 Lua 惯用法
local config = nil
local effectiveConfig = config or "default"
print(effectiveConfig)  -- default

-- when-in 模式：模拟 switch-case
local function dayName(day)
    local names = {
        [1] = "Monday",
        [2] = "Tuesday",
        [3] = "Wednesday",
        [4] = "Thursday",
        [5] = "Friday",
        [6] = "Saturday",
        [7] = "Sunday",
    }
    return names[day] or "Invalid"
end

print(dayName(3))   -- Wednesday
print(dayName(99))  -- Invalid
```

### 5.5 控制结构：循环

```lua
-- 循环结构完整示例

-- while 循环：先判断后执行
local i = 1
while i <= 5 do
    print("while iteration:", i)
    i = i + 1
end

-- repeat-until 循环：先执行后判断（至少执行一次）
local j = 1
repeat
    print("repeat iteration:", j)
    j = j + 1
until j > 5

-- 数值型 for：最常用循环
-- for v = start, stop, step do ... end
for k = 1, 5 do
    print("for (default step):", k)
end

for k = 10, 1, -2 do
    print("for (negative step):", k)  -- 10, 8, 6, 4, 2
end

for k = 0, 1, 0.25 do
    print("for (float step):", k)  -- 0, 0.25, 0.5, 0.75, 1
end

-- 泛型 for：遍历迭代器
local arr = {"a", "b", "c"}
for idx, val in ipairs(arr) do
    print(idx, val)  -- 1 a / 2 b / 3 c
end

local dict = { name = "Alice", age = 30, city = "Beijing" }
for key, val in pairs(dict) do
    print(key, val)  -- 顺序不确定
end

-- 字符串遍历
local s = "Lua"
for i = 1, #s do
    print(i, string.sub(s, i, i))
end

-- break 语句：跳出当前循环
for i = 1, 10 do
    if i == 5 then
        break  -- 当 i == 5 时退出循环
    end
    print("before break:", i)
end

-- 嵌套循环与 break（break 仅退出最内层）
for i = 1, 3 do
    for j = 1, 3 do
        if j == 2 then
            break  -- 仅退出内层 j 循环
        end
        print(i, j)
    end
end

-- return 语句：从函数返回（必须在块的最后）
local function findFirst(arr, target)
    for i, v in ipairs(arr) do
        if v == target then
            return i  -- 找到后立即返回
        end
    end
    return nil  -- 未找到
end

print(findFirst({10, 20, 30}, 20))  -- 2

-- goto 与标签（Lua 5.2+）
-- 用于深层嵌套的提前退出
local function process(matrix)
    for i = 1, #matrix do
        for j = 1, #matrix[i] do
            if matrix[i][j] == -1 then
                print("Found invalid at", i, j)
                goto done  -- 跳出多层循环
            end
        end
    end
    ::done::
    print("Processing complete")
end

process({{1, 2}, {3, -1}, {5, 6}})
```

### 5.6 字符串与模式匹配

```lua
-- 字符串与模式匹配

-- 字符串字面量
local s1 = 'single quote'
local s2 = "double quote"
local s3 = [[multi-line
string spanning
multiple lines]]
local s4 = [==[long bracket with = signs]==]

print(s1, s2)
print(s3)

-- 字符串长度
print(#"hello")  -- 5

-- 字符串连接
local greeting = "Hello" .. ", " .. "World"

-- 字符串索引（通过 string.sub）
local s = "Lua"
print(string.sub(s, 1, 1))  -- L
print(string.sub(s, -1))    -- a（负索引从末尾计）

-- 模式匹配：Lua 的"精简版正则"
-- 注意：Lua 模式不是正则表达式，语法略有不同

-- string.find：查找子串
local text = "Hello, World"
local start, finish = string.find(text, "World")
print(start, finish)  -- 8  12

-- string.match：匹配并返回捕获
local date = "2026-07-21"
local y, m, d = string.match(date, "(%d+)-(%d+)-(%d+)")
print(y, m, d)  -- 2026  07  21

-- string.gsub：全局替换
local result, count = string.gsub("hello world", "o", "0")
print(result, count)  -- hell0 w0rld  2

-- 字符类
-- %a 字母, %d 数字, %s 空白, %w 字母数字, %p 标点
-- 大写版本表示补集：%A 非字母, %D 非数字 等
print(string.match("abc123", "(%a+)(%d+)"))  -- abc  123

-- 锚定：^ 开头, $ 结尾
print(string.match("hello", "^h"))  -- h
print(string.match("hello", "o$"))  -- o
```

### 5.7 函数定义与调用

```lua
-- 函数定义与调用

-- 全局函数
function greet(name)
    return "Hello, " .. name
end
print(greet("Lua"))  -- Hello, Lua

-- 局部函数（推荐）
local function add(a, b)
    return a + b
end
print(add(1, 2))  -- 3

-- 多返回值
local function divmod(a, b)
    return a // b, a % b
end
local q, r = divmod(17, 5)
print(q, r)  -- 3  2

-- 可变参数（...）
local function sum(...)
    local total = 0
    for _, v in ipairs({...}) do
        total = total + v
    end
    return total
end
print(sum(1, 2, 3, 4, 5))  -- 15

-- select 函数：访问可变参数
local function first(...)
    return select(1, ...)
end
print(first("a", "b", "c"))  -- a

local function countArgs(...)
    return select("#", ...)
end
print(countArgs(1, 2, 3, 4))  -- 4

-- 方法调用语法（冒号语法）
local obj = { value = 42 }
function obj:getValue()
    return self.value
end
function obj:setValue(v)
    self.value = v
end

print(obj:getValue())  -- 42
obj:setValue(100)
print(obj:getValue())  -- 100

-- 等价于
-- obj.getValue(obj) 与 obj.setValue(obj, 100)

-- 函数作为值
local f = function(x) return x * 2 end
print(f(5))  -- 10

-- 高阶函数
local function apply(fn, x)
    return fn(x)
end
print(apply(function(x) return x + 1 end, 10))  -- 11
```

### 5.8 表的高级用法

```lua
-- 表的高级用法：数组、记录、命名空间

-- 数组：用整数键 1..n
local arr = {10, 20, 30, 40, 50}
print(#arr)  -- 5
for i, v in ipairs(arr) do
    print(i, v)
end

-- 记录：用字符串键
local person = {
    name = "Alice",
    age = 30,
    email = "alice@example.com",
}
print(person.name, person.age)

-- 混合表：同时有数组部分与记录部分
local mixed = {
    "first",  -- 索引 1
    "second", -- 索引 2
    name = "Mixed",
    count = 2,
}
print(mixed[1])     -- first
print(mixed.name)   -- Mixed

-- 表作为命名空间
local MathUtils = {}

function MathUtils.square(x)
    return x * x
end

function MathUtils.cube(x)
    return x * x * x
end

print(MathUtils.square(5))  -- 25
print(MathUtils.cube(3))    -- 27

-- 嵌套表
local company = {
    name = "Acme",
    departments = {
        { name = "Engineering", headcount = 50 },
        { name = "Sales", headcount = 20 },
    },
}

for _, dept in ipairs(company.departments) do
    print(dept.name, dept.headcount)
end

-- 表的克隆（浅拷贝）
local function shallowCopy(t)
    local copy = {}
    for k, v in pairs(t) do
        copy[k] = v
    end
    return copy
end

local original = { a = 1, b = 2 }
local clone = shallowCopy(original)
clone.a = 999
print(original.a)  -- 1（原表未被修改）
```

## 6. 对比分析

### 6.1 Lua 与主流脚本语言语法对比

| 特性 | Lua | Python | JavaScript | Ruby |
| :--- | :--- | :--- | :--- | :--- |
| 注释 | `--` 单行，`--[[ ]]` 多行 | `#` 单行，`""" """` 多行 | `//` 单行，`/* */` 多行 | `#` 单行，`=begin =end` 多行 |
| 字符串连接 | `..` | `+` 或 f-string | `+` 或模板字符串 | `+` 或 `<<` |
| 不等于 | `~=` | `!=` | `!==` | `!=` |
| 数组起始索引 | 1 | 0 | 0 | 0 |
| 局部变量 | `local` | 默认局部 | `let`/`const` | 默认局部 |
| 全局变量 | 默认 | `global` 关键字 | 默认（非严格模式） | `$` 前缀 |
| 多返回值 | 原生支持 | 元组 | 解构 | 多返回值 |
| 块作用域 | `do...end` | 函数/类/模块 | `{}` | `begin...end` |
| 自增运算符 | 不支持 | 不支持 | `++` | 不支持 |
| 复合赋值 | 不支持 | `+=` 等 | `+=` 等 | `+=` 等 |
| 三元运算 | `a and b or c` | `b if a else c` | `a ? b : c` | `a ? b : c` |

### 6.2 Lua 与 Python 控制结构对比

```lua
-- Lua 数值型 for
for i = 1, 10 do
    print(i)
end

-- Lua 泛型 for
for k, v in pairs(t) do
    print(k, v)
end
```

```python
# Python 等价
for i in range(1, 11):
    print(i)

for k, v in t.items():
    print(k, v)
```

| 维度 | Lua | Python |
| :--- | :--- | :--- |
| 数值 for 语法 | `for i = 1, 10 do` | `for i in range(1, 11):` |
| 步长 | 第三参数 `for i = 10, 1, -1` | `range(10, 0, -1)` |
| 遍历字典 | `pairs(t)` | `t.items()` |
| 遍历数组 | `ipairs(t)` | `enumerate(t)` |
| 跳出循环 | `break`（无 continue） | `break` 与 `continue` |
| 异常处理 | `pcall`/`xpcall` | `try/except` |

### 6.3 全局变量策略对比

| 语言 | 默认作用域 | 显式声明 | 优势 | 劣势 |
| :--- | :--- | :--- | :--- | :--- |
| Lua | 全局 | `local` | 原型快速 | 易污染全局 |
| Python | 局部 | `global`/`nonlocal` | 安全 | 原型稍慢 |
| JavaScript（严格） | 局部 | `let`/`const` | 安全 | 兼容性 |
| Ruby | 局部 | 默认 | 安全 | 显式标记少 |

Lua 的"默认全局"在嵌入式脚本场景下方便快速原型，但大型项目必须配合 linter（如 `luacheck`）严格审查。

## 7. 常见陷阱与反模式

### 7.1 反模式：忘记 `local` 导致全局污染

**事故案例**：某项目在 1000+ 行脚本中忘记 `local`，导致多个变量泄漏到全局表，引发难以排查的副作用。

```lua
-- 反模式：忘记 local
function processData(input)
    result = transform(input)  -- result 是全局变量！
    cache = result  -- cache 也是全局变量！
    return result
end

-- 问题：多次调用 processData 会覆盖全局 result 与 cache
-- 修复：所有变量显式声明 local
function processData(input)
    local result = transform(input)
    local cache = result
    return result
end
```

**正确做法**：

```lua
-- 启用全局变量告警：拦截 _G 的 __newindex
setmetatable(_G, {
    __newindex = function(t, k, v)
    -- 在开发环境下抛出错误或记录日志
    if not _ALLOWED_GLOBALS[k] then
        error("Attempt to create global '" .. k .. "'", 2)
    end
    rawset(t, k, v)
    end,
})

-- 或使用 luacheck 静态检查工具
```

### 7.2 反模式：误用 `or` 作为默认值

**事故案例**：当变量可能为 `false` 时，`x or default` 会错误地返回 `default`。

```lua
-- 反模式：未考虑 false 的情况
local function getTimeout(config)
    return config.timeout or 30  -- 若 config.timeout 为 false，返回 30
end

-- 修复：显式检查 nil
local function getTimeout(config)
    if config.timeout == nil then
        return 30
    end
    return config.timeout
end
```

### 7.3 反模式：浮点 `for` 循环的精度问题

**事故案例**：浮点步长导致循环次数与预期不符。

```lua
-- 反模式：浮点步长
for i = 0, 1, 0.1 do
    print(i)
end
-- 输出可能不包含 1，因为 0.1 累加 10 次的结果略大于 1.0

-- 修复：用整数循环 + 除法
for i = 0, 10 do
    local v = i / 10
    print(v)
end
```

### 7.4 反模式：修改循环变量

**事故案例**：在数值型 `for` 中修改循环变量不影响下一次迭代。

```lua
-- 反模式：修改循环变量无效
for i = 1, 5 do
    print(i)
    i = i + 1  -- 无效！下一次迭代 i 仍按规则递增
end
-- 输出 1, 2, 3, 4, 5

-- 修复：使用 while 循环手动控制
local i = 1
while i <= 5 do
    print(i)
    i = i + 2  -- 步长 2
end
```

### 7.5 反模式：`ipairs` 在稀疏数组上的行为

**事故案例**：`ipairs` 遇到 `nil` 即停止，导致稀疏数组数据丢失。

```lua
-- 反模式：稀疏数组 + ipairs
local arr = {1, 2, nil, 4, 5}
for i, v in ipairs(arr) do
    print(i, v)
end
-- 仅输出 1, 1 与 2, 2，遇到 nil 即停止

-- 修复：使用数值 for 显式遍历
for i = 1, #arr do
    local v = arr[i]
    if v ~= nil then
        print(i, v)
    end
end
```

### 7.6 反模式：误用 `#` 运算符

**事故案例**：`#` 对非序列表的行为未定义。

```lua
-- 反模式：对非序列表使用 #
local t = {1, 2, 3, [10] = 10}
print(#t)  -- 输出 3 或 10，未定义

-- 修复：维护显式计数
local t = { items = {}, count = 0 }
table.insert(t.items, 1)
t.count = t.count + 1
```

### 7.7 反模式：`and/or` 三元运算符的优先级陷阱

```lua
-- 反模式：未用括号导致优先级错误
local function classify(n)
    return n > 0 and "positive" or n < 0 and "negative" or "zero"
end
-- 实际解析为 (n > 0 and "positive") or (n < 0 and "negative") or "zero"
-- 输出正确，但可读性差

-- 修复：使用显式 if-elseif-else
local function classify(n)
    if n > 0 then return "positive"
    elseif n < 0 then return "negative"
    else return "zero"
    end
end
```

### 7.8 反模式：循环中创建闭包捕获循环变量

```lua
-- 反模式：闭包捕获循环变量
local closures = {}
for i = 1, 3 do
    closures[i] = function() return i end
end
for _, f in ipairs(closures) do
    print(f())  -- 输出 1, 2, 3（Lua 5.4+ 中循环变量每次迭代是新绑定）
end

-- 在 Lua 5.3 及之前，输出可能是 3, 3, 3
-- 修复：使用额外 local 变量
for i = 1, 3 do
    local j = i  -- 显式捕获
    closures[i] = function() return j end
end
```

## 8. 工程实践

### 8.1 全局变量治理

生产环境应严格限制全局变量。以下是一套完整的治理方案：

```lua
-- 全局变量治理方案
-- 1. 启用严格模式（运行时拦截）
local _G = _G
local _ALLOWED_GLOBALS = {
    -- 列出允许的全局变量
    _G = true,
    _VERSION = true,
    arg = true,
    -- 标准库
    pairs = true, ipairs = true, print = true, error = true,
    pcall = true, xpcall = true, assert = true,
    -- 等等...
}

setmetatable(_G, {
    __newindex = function(t, k, v)
        if not _ALLOWED_GLOBALS[k] then
            local info = debug.getinfo(2, "Sl")
            error(string.format(
                "Attempt to create global '%s' at %s:%d",
                k, info.short_src, info.currentline
            ), 2)
        end
        rawset(t, k, v)
    end,
    __index = function(t, k)
        if not _ALLOWED_GLOBALS[k] then
            local info = debug.getinfo(2, "Sl")
            error(string.format(
                "Attempt to read undefined global '%s' at %s:%d",
                k, info.short_src, info.currentline
            ), 2)
        end
        return rawget(t, k)
    end,
})

-- 2. 配合 luacheck 静态检查
-- .luacheckrc 配置示例：
-- std = "lua54"
-- new_globals = false  -- 禁止创建新全局
-- unused_globals = true  -- 警告未使用的全局
```

### 8.2 模块化封装

将相关功能封装为模块，避免全局污染。

```lua
-- 模块封装示例：math_utils.lua
local MathUtils = {}

-- 私有常量（不导出）
local PI = math.pi
local EPSILON = 1e-9

-- 公共函数：判断浮点数相等
function MathUtils.almostEqual(a, b)
    return math.abs(a - b) < EPSILON
end

-- 公共函数：角度转弧度
function MathUtils.degreesToRadians(deg)
    return deg * PI / 180
end

-- 公共函数：弧度转角度
function MathUtils.radiansToDegrees(rad)
    return rad * 180 / PI
end

-- 公共函数：线性插值
function MathUtils.lerp(a, b, t)
    return a + (b - a) * t
end

-- 公共函数：限制范围
function MathUtils.clamp(value, min, max)
    if value < min then return min end
    if value > max then return max end
    return value
end

return MathUtils

-- 使用方式：
-- local MathUtils = require "math_utils"
-- print(MathUtils.clamp(15, 0, 10))  -- 10
```

### 8.3 性能优化

```lua
-- 性能优化技巧

-- 1. 局部变量缓存全局函数
local string_find = string.find
local string_format = string.format
local table_insert = table.insert

-- 热点循环中使用缓存后的函数
local function fastFind(haystack, needle)
    return string_find(haystack, needle)
end

-- 2. 避免在循环中创建闭包
-- 反模式：
local sum = 0
for i = 1, 1000000 do
    sum = sum + (function(x) return x * 2 end)(i)  -- 每次创建闭包
end

-- 正确做法：
local function double(x) return x * 2 end  -- 闭包仅创建一次
local sum = 0
for i = 1, 1000000 do
    sum = sum + double(i)
end

-- 3. 数值型 for 比泛型 for 快
-- 反模式：
for i, v in ipairs(arr) do
    -- 处理 v
end

-- 快速版本（已知数组长度）：
local n = #arr
for i = 1, n do
    local v = arr[i]
    -- 处理 v
end

-- 4. 字符串构建：避免多次 ..
-- 反模式：
local s = ""
for i = 1, 1000 do
    s = s .. tostring(i)  -- O(n^2) 复杂度
end

-- 正确做法：用 table.concat
local parts = {}
for i = 1, 1000 do
    parts[i] = tostring(i)
end
local s = table.concat(parts, ",")
```

### 8.4 错误处理

```lua
-- 错误处理最佳实践

-- 使用 pcall 包装可能失败的代码
local function safeDivide(a, b)
    local ok, result = pcall(function()
        if b == 0 then
            error("Division by zero", 2)
        end
        return a / b
    end)
    if not ok then
        -- 记录错误日志
        print("[ERROR]", result)
        return nil, result
    end
    return result
end

local r, err = safeDivide(10, 0)
if not r then
    print("Failed:", err)
end

-- 使用 xpcall 获取完整堆栈
local function riskyOperation()
    error("Something went wrong")
end

local ok, err = xpcall(riskyOperation, function(e)
    return debug.traceback(e, 2)
end)
if not ok then
    print("Stack trace:")
    print(err)
end

-- 自定义错误对象
local function createError(code, message)
    return setmetatable({
        code = code,
        message = message,
        timestamp = os.time(),
    }, {
        __tostring = function(self)
            return string.format("[%d] %s", self.code, self.message)
        end,
    })
end

local function validateAge(age)
    if type(age) ~= "number" then
        return nil, createError(400, "Age must be a number")
    end
    if age < 0 or age > 150 then
        return nil, createError(400, "Age out of range")
    end
    return true
end

local ok, err = validateAge("twenty")
if not ok then
    print(err)  -- [400] Age must be a number
end
```

### 8.5 单元测试模式

```lua
-- 简易单元测试框架
local TestSuite = {
    tests = {},
    passed = 0,
    failed = 0,
}

function TestSuite.add(name, fn)
    table.insert(TestSuite.tests, { name = name, fn = fn })
end

function TestSuite.assertEq(actual, expected, msg)
    if actual ~= expected then
        error(string.format("%s: expected %s, got %s",
            msg or "Assertion failed",
            tostring(expected), tostring(actual)), 2)
    end
end

function TestSuite.run()
    for _, test in ipairs(TestSuite.tests) do
        local ok, err = pcall(test.fn)
        if ok then
            TestSuite.passed = TestSuite.passed + 1
            print(string.format("[PASS] %s", test.name))
        else
            TestSuite.failed = TestSuite.failed + 1
            print(string.format("[FAIL] %s: %s", test.name, err))
        end
    end
    print(string.format("\nTotal: %d, Passed: %d, Failed: %d",
        #TestSuite.tests, TestSuite.passed, TestSuite.failed))
end

-- 测试用例
TestSuite.add("Arithmetic addition", function()
    TestSuite.assertEq(1 + 1, 2, "1 + 1 should be 2")
end)

TestSuite.add("String concatenation", function()
    TestSuite.assertEq("a" .. "b", "ab", "Concatenation failed")
end)

TestSuite.add("Table access", function()
    local t = { x = 1, y = 2 }
    TestSuite.assertEq(t.x, 1, "t.x should be 1")
    TestSuite.assertEq(t.z, nil, "t.z should be nil")
end)

TestSuite.run()
```

## 9. 案例研究

### 9.1 案例一：Luarocks 包管理器的模块结构

Luarocks 是 Lua 的包管理器，其源码充分体现了良好的模块化与作用域控制。

**关键设计**：

```lua
-- luarocks 模块结构（简化版）
local M = {}

-- 私有工具函数
local function split(s, sep)
    local parts = {}
    for part in s:gmatch("[^" .. sep .. "]+") do
        table.insert(parts, part)
    end
    return parts
end

-- 公共 API
function M.parse(version_string)
    local parts = split(version_string, ".")
    return {
        major = tonumber(parts[1]) or 0,
        minor = tonumber(parts[2]) or 0,
        patch = tonumber(parts[3]) or 0,
    }
end

function M.compare(v1, v2)
    if v1.major ~= v2.major then
        return v1.major - v2.major
    end
    if v1.minor ~= v2.minor then
        return v1.minor - v2.minor
    end
    return v1.patch - v2.patch
end

return M
```

**经验教训**：

- 所有变量显式 `local`，避免全局污染。
- 模块返回一个表，作为命名空间。
- 私有工具函数不导出，仅公共 API 在返回表中。

### 9.2 案例二：Kong 配置解析器

Kong 网关的配置解析器展示了如何利用 Lua 的多重返回值与 `or` 默认值实现灵活配置。

```lua
-- Kong 配置解析器（简化版）
local ConfigParser = {}

function ConfigParser.parse(raw)
    local config = {}
    
    -- 必填字段检查
    if not raw.host then
        return nil, "host is required"
    end
    config.host = raw.host
    
    -- 可选字段带默认值
    config.port = raw.port or 80
    config.timeout = raw.timeout or 60
    config.retries = raw.retries or 3
    
    -- 类型校验
    if type(config.port) ~= "number" then
        return nil, "port must be a number"
    end
    if config.port < 1 or config.port > 65535 then
        return nil, "port out of range"
    end
    
    -- 复杂字段处理
    config.headers = raw.headers or {}
    if type(config.headers) ~= "table" then
        return nil, "headers must be a table"
    end
    
    return config
end

-- 使用示例
local raw = { host = "api.example.com", port = 8443 }
local cfg, err = ConfigParser.parse(raw)
if not cfg then
    error("Config error: " .. err)
end
print(cfg.host, cfg.port, cfg.timeout)
```

**经验教训**：

- 多返回值 `(result, error)` 是 Lua 风格的错误处理惯用法。
- `or` 运算符用于默认值简洁优雅，但需注意 `false` 边界情况。
- 类型检查在生产代码中必不可少。

### 9.3 案例三：Redis Lua 脚本中的控制流

Redis 内嵌 Lua 5.1 解释器，脚本中常使用基本语法实现原子操作。

```lua
-- Redis 脚本：原子计数器限流
-- KEYS[1] = 限流键名
-- ARGV[1] = 最大请求数
-- ARGV[2] = 时间窗口（秒）

local key = KEYS[1]
local max_requests = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', key) or "0")

if current >= max_requests then
    -- 已达限流上限
    return 0
end

-- 原子递增
local new_count = redis.call('INCR', key)
if new_count == 1 then
    -- 第一次访问，设置过期时间
    redis.call('EXPIRE', key, window)
end

return new_count
```

**经验教训**：

- Redis 脚本必须保持简洁，复杂逻辑应放应用层。
- `tonumber` 与 `or "0"` 配合处理 nil 情况。
- 严格使用 `local` 声明变量，避免污染脚本环境。

## 10. 习题

### 10.1 基础题

**题 1**：写出以下代码的输出。

```lua
local a, b, c = 1, 2
print(a, b, c)

local x = 10
local y = 20
x, y = y, x
print(x, y)

local t = {1, 2, 3, nil, 5}
print(#t)
```

**参考答案要点**：

- `1  2  nil`：右值不足，c 补 nil。
- `20  10`：多重赋值实现交换。
- `#t` 输出 3 或 5，未定义（Lua 对稀疏数组的长度定义不明确，通常返回 3）。

**题 2**：解释以下表达式为何等价。

```lua
local result = a and b or c
-- 等价于
local result = (a and b) or c
```

**参考答案要点**：

- `and` 优先级高于 `or`。
- 当 `a` 为真，`a and b` 返回 `b`；若 `b` 也为真，`b or c` 返回 `b`。
- 当 `a` 为假，`a and b` 返回 `a`（假值），`a or c` 返回 `c`。
- 注意：当 `b` 为 `false` 或 `nil` 时，此模式失效，会错误返回 `c`。

**题 3**：使用 `while` 循环计算 1 到 100 的和。

**参考答案要点**：

```lua
local sum = 0
local i = 1
while i <= 100 do
    sum = sum + i
    i = i + 1
end
print(sum)  -- 5050
```

### 10.2 进阶题

**题 4**：分析以下代码的输出，并解释 `goto` 的行为。

```lua
for i = 1, 3 do
    for j = 1, 3 do
        if i * j > 4 then
            goto skip
        end
        print(i, j)
        ::skip::
    end
end
```

**参考答案要点**：

- `goto skip` 跳到 `::skip::` 标签，跳过当前迭代的剩余代码。
- 输出：
  - `1 1`，`1 2`，`1 3`
  - `2 1`，`2 2`（2*3=6 > 4，跳过）
  - `3 1`（3*2=6 > 4，跳过）

**题 5**：实现一个迭代器 `range(start, stop, step)`，使其可与泛型 `for` 配合使用。

**参考答案要点**：

```lua
local function range(start, stop, step)
    step = step or 1
    local current = start
    return function()
        if (step > 0 and current > stop) or (step < 0 and current < stop) then
            return nil
        end
        local value = current
        current = current + step
        return value
    end
end

-- 使用示例
for v in range(1, 5) do
    print(v)  -- 1, 2, 3, 4, 5
end

for v in range(10, 1, -2) do
    print(v)  -- 10, 8, 6, 4, 2
end
```

### 10.3 挑战题

**题 6**：实现一个支持 `continue` 语义的宏（通过 `goto` 模拟）。

**参考答案要点**：

```lua
-- 模拟 continue 语法
for i = 1, 10 do
    if i % 2 == 0 then
        goto continue  -- 跳过偶数
    end
    print(i)  -- 仅输出奇数
    ::continue::
end
```

**题 7**：实现一个斐波那契数列的尾递归版本，并验证 Lua 的尾调用优化。

**参考答案要点**：

```lua
local function fibTail(n, a, b)
    if n <= 0 then return a end
    if n == 1 then return b end
    return fibTail(n - 1, b, a + b)  -- 尾递归
end

local function fib(n)
    return fibTail(n, 0, 1)
end

print(fib(10))  -- 55
print(fib(100))  -- 354224848179261915075（Lua 整数可表示）
-- 验证：调用 fib(100000) 不会栈溢出，证明 Lua 正确实现尾调用优化
```

**题 8**：分析以下代码在 Lua 5.3+ 中的输出，并解释整数与浮点的转换规则。

```lua
local a = 10
local b = 3
print(a / b)
print(a // b)
print(a % b)
print(a ^ b)
print(a * 1.0)
print(10 // 3)
print(10.0 // 3)
```

**参考答案要点**：

- `a / b` 输出 `3.3333...`：`/` 始终返回浮点。
- `a // b` 输出 `3`：整除，两个整数返回整数。
- `a % b` 输出 `1`：取模，两个整数返回整数。
- `a ^ b` 输出 `1000.0`：`^` 始终返回浮点。
- `a * 1.0` 输出 `10.0`：与浮点运算返回浮点。
- `10 // 3` 输出 `3`（整数）。
- `10.0 // 3` 输出 `3.0`（浮点）：有浮点参与时返回浮点。

## 11. 参考文献

### 11.1 Lua 官方文献

[1] Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2023. *Lua 5.4 Reference Manual*. Technical Report, PUC-Rio, Rio de Janeiro, Brazil. Available at: https://www.lua.org/manual/5.4/

[2] Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 1996. Lua-an extensible extension language. *Journal of Universal Computer Science* 2, 5 (May 1996), 345-356. DOI: https://doi.org/10.3217/jucs-002-05-0345

[3] Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2007. The evolution of Lua. In *Proceedings of the Third ACM SIGPLAN History of Programming Languages Conference (HOPL III)*. ACM, New York, NY, USA, 2-1–2-26. DOI: https://doi.org/10.1145/1238844.1238846

[4] Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2015. The design and implementation of a language for extending applications. In *Proceedings of the XXI Brazilian Symposium on Programming Languages (SBLP 2015)*. SBC, 1-10.

### 11.2 程序语言理论

[5] Abelson, H. and Sussman, G. J. 1996. *Structure and Interpretation of Computer Programs* (2nd Edition). MIT Press, Cambridge, MA, USA.（Scheme 对 Lua 闭包设计的影响）

[6] Strachey, C. 2000. Fundamental concepts in programming languages. *Higher-Order and Symbolic Computation* 13, 1-2 (April 2000), 11-49. DOI: https://doi.org/10.1023/A:1010000313106

[7] Felleisen, M., Findler, R. B., and Flatt, M. 2009. *Semantics Engineering with PLT Redex*. MIT Press, Cambridge, MA, USA.

### 11.3 Lua 实现细节

[8] Ierusalimschy, R., de Figueiredo, L. H., and Celes, W. 2005. The implementation of Lua 5.0. *Journal of Universal Computer Science* 11, 7 (July 2005), 1159-1176. DOI: https://doi.org/10.3217/jucs-011-07-1159

[9] Pall, M. 2005. The LuaJIT compiler. In *Proceedings of the Lightweight Languages 2005 (LL5)*. Available at: https://luajit.org/

### 11.4 静态分析与工具

[10] Mateescu, R. 2013. Static analysis of Lua programs. *Electronic Notes in Theoretical Computer Science* 298, 1 (Dec. 2013), 101-115. DOI: https://doi.org/10.1016/j.entcs.2013.09.014

[11] luacheck 文档：https://luacheck.readthedocs.io/

## 12. 延伸阅读

### 12.1 官方文档

- Lua 5.4 Reference Manual：https://www.lua.org/manual/5.4/
- Programming in Lua (4th Edition)，第 1-4 章：https://www.lua.org/pil/contents.html
- Lua 5.4 源码：https://www.lua.org/source/5.4/

### 12.2 经典教材

- Roberto Ierusalimschy. *Programming in Lua* (4th Edition). PUC-Rio, 2016. ISBN 978-8590379868.
- Roberto Ierusalimschy, Luiz Henrique de Figueiredo, Waldemar Celes. *The Implementation of Lua 5.0*. JUCS, 2005.
- Paul Kimmel. *Lua Programming Gems*. Lua.org, 2008.

### 12.3 前沿论文与社区资源

- "Lua: an extensible extension language" - Ierusalimschy 等人原始论文。
- "The evolution of an extension language: a history of Lua" - HOPL III 演讲。
- Lua mailing list archives：https://www.lua.org/lua-l.html
- Lua-users wiki：http://lua-users.org/wiki/
- luacheck 静态检查工具：https://github.com/lunarmodules/luacheck
- LuaJIT 项目：https://luajit.org/

### 12.4 拓展主题

- 数据类型与 Table 详解：参见本系列"数据类型与 Table 详解"章节。
- 函数与闭包：参见本系列"函数与闭包"章节。
- 元表与元方法：参见本系列"元表与元方法详解"章节。
- 模块与包：参见本系列"模块与包"章节。
- Lua 与 C 交互：参见本系列"Lua 与 C 交互"章节。
- Lua 性能优化：参见本系列"Lua 性能优化"章节。
