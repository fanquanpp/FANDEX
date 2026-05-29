---
title: 'Lua 标准库名词注释 (Standard Library Glossary)'
module: 'lua'
category: 'Standard Library'
description: 'Lua 标准库：table/string/math/io/os等 | Lua standard library: table, string, math, io, os'
---

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
