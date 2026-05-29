---
title: 'Python 核心语言名词注释 (Core Language Glossary)'
module: 'python'
category: 'Core Language'
description: 'Python 核心语言概念：变量/数据类型/函数/类/控制流等 | Python core language: variables, data types, functions, classes, control flow'
author: 'fanquanpp'
updated: '2026-05-29'
---

## A

| 术语     | 英文                      | 释义                                                                 |
| -------- | ------------------------- | -------------------------------------------------------------------- |
| 抽象基类 | ABC / Abstract Base Class | 用 `abc` 模块定义的基类，通过 `@abstractmethod` 强制子类实现特定方法 |
| 聚合赋值 | Augmented Assignment      | 复合赋值运算符如 `+=`、`-=`、`*=` 等                                 |
| 参数     | Argument                  | 函数调用时传递给函数的具体值                                         |
| 属性     | Attribute                 | 绑定到对象的变量，访问方式为 `obj.attr`                              |
| 匿名函数 | Anonymous Function        | 使用 `lambda` 关键字定义的简短函数                                   |

## B

| 术语     | 英文       | 释义                                           |
| -------- | ---------- | ---------------------------------------------- |
| 块       | Block      | 用缩进组织的代码语句组                         |
| 布尔类型 | Boolean    | 值只能为 `True` 或 `False` 的数据类型          |
| 断点     | Breakpoint | 调试器中暂停程序执行的点                       |
| 字节码   | Bytecode   | Python 源代码编译后的中间形式，`.pyc` 文件存储 |
| 按字节   | Byte Order | 多字节数据的存储顺序，大端或小端               |

## C

| 术语       | 英文                   | 释义                                                |
| ---------- | ---------------------- | --------------------------------------------------- |
| 类         | Class                  | 面向对象编程中定义对象结构的模板                    |
| 类属性     | Class Attribute        | 定义在类级别、所有实例共享的属性                    |
| 类方法     | Class Method           | 用 `@classmethod` 装饰的方法，接收 `cls` 参数       |
| 闭包       | Closure                | 引用了外层作用域变量的内部函数                      |
| 代码块     | Code Block             | 用缩进组织的代码语句组                              |
| 比较运算符 | Comparison Operator    | `==`、`!=`、`<`、`>`、`<=`、`>=` 等用于比较的运算符 |
| 复合语句   | Compound Statement     | 包含其他语句的语句，如 `if`、`for`、`while`         |
| 条件表达式 | Conditional Expression | 三元运算符 `x if condition else y`                  |
| 常量       | Constant               | 值不可改变的变量，Python 约定全大写命名             |

## D

| 术语      | 英文           | 释义                                                |
| --------- | -------------- | --------------------------------------------------- |
| 数据类型  | Data Type      | 值的种类，决定可执行的操作，如 `int`、`str`、`list` |
| 解包      | Destructuring  | 将可迭代对象分解为多个变量的操作                    |
| 字典      | Dictionary     | 键值对映射的容器类型，`dict`，无序可变              |
| docstring | Docstring      | 模块、函数、类的文档字符串                          |
| 动态类型  | Dynamic Typing | 变量类型在运行时确定，无需声明                      |

## E

| 术语       | 英文                 | 释义                                   |
| ---------- | -------------------- | -------------------------------------- |
| 编码       | Encoding             | 字符到字节的映射规则，如 UTF-8         |
| 可枚举     | Enumerable           | 可以用 `for` 循环遍历的对象            |
| 枚举类型   | Enum                 | 用 `enum` 模块定义的命名常量集合       |
| 等价性     | Equality             | `==` 比较两个值是否相等                |
| 求值       | Evaluation           | 将表达式计算为结果值的过程             |
| 可执行语句 | Executable Statement | 执行时产生效果的语句，如赋值、函数调用 |
| 表达式     | Expression           | 求值后产生值的代码片段                 |
| 扩展解包   | Extended Unpacking   | 使用 `*` 或 `**` 收集或展开可迭代对象  |

## F

| 术语         | 英文                 | 释义                                                    |
| ------------ | -------------------- | ------------------------------------------------------- |
| f-string     | f-string             | Python 3.6+ 的格式化字符串字面量，`f"value={x}"`        |
| 假值         | Falsy                | 在布尔上下文中被视为 `False` 的值，如 `0`、`""`、`None` |
| 文件对象     | File Object          | 打开文件后返回的对象，用于读写操作                      |
| 过滤器       | Filter               | 从序列中筛选满足条件的元素                              |
| 浮点数       | Float                | 带小数点的数字类型，双精度 IEEE 754 标准                |
| .floor()     | floor()              | 向下取整函数                                            |
| 格式规范     | Format Specification | f-string 或 `format()` 中的 `:width.precision` 等格式   |
| 格式化字符串 | Formatted String     | 支持嵌入表达式的字符串字面量                            |

## G

| 术语         | 英文                          | 释义                                                   |
| ------------ | ----------------------------- | ------------------------------------------------------ |
| 生成器       | Generator                     | 用 `yield` 返回值的迭代器函数，产生值时暂停执行        |
| 生成器表达式 | Generator Expression          | 类似列表推导但用圆括号，结果为生成器对象               |
| 全局解释器锁 | GIL / Global Interpreter Lock | CPython 机制，同一时刻只允许一个线程执行 Python 字节码 |
| 全局变量     | Global Variable               | 函数外定义的变量，可在函数内用 `global` 修改           |

## H

| 术语     | 英文                  | 释义                                   |
| -------- | --------------------- | -------------------------------------- |
| 哈希     | Hash                  | 对象的整数标识，用于字典和集合的键查找 |
| 哈希表   | Hash Table            | 通过哈希函数实现 O(1) 查找的数据结构   |
| 高阶函数 | Higher-Order Function | 接收函数作为参数或返回函数的函数       |
| 标识符   | Identifier            | 变量、函数、类的命名                   |

## I

| 术语       | 英文               | 释义                                           |
| ---------- | ------------------ | ---------------------------------------------- |
| 标识       | Identity           | 对象的唯一身份，用 `id()` 获取，通常是内存地址 |
| if 语句    | if Statement       | 条件分支语句                                   |
| 不可变对象 | Immutable Object   | 创建后不能修改的对象，如 `tuple`、`str`、`int` |
| 导入       | Import             | 将模块加载到当前命名空间供使用                 |
| 实例       | Instance           | 类的具体对象                                   |
| 实例属性   | Instance Attribute | 每个实例独立拥有的属性                         |
| 实例化     | Instantiation      | 通过 `Class()` 创建类的实例                    |
| 整数       | Integer            | 任意精度的整数值                               |
| 接口       | Interface          | 类必须实现的方法集合                           |
| 解释器     | Interpreter        | 逐行执行代码的程序                             |

## J

| 术语 | 英文 | 释义                                           |
| ---- | ---- | ---------------------------------------------- |
| JSON | JSON | JavaScript Object Notation，轻量级数据交换格式 |

## K

| 术语       | 英文             | 释义                                                       |
| ---------- | ---------------- | ---------------------------------------------------------- |
| 关键字     | Keyword          | Python 保留的单词，如 `if`、`for`、`class`，不能用做标识符 |
| 关键字参数 | Keyword Argument | 用参数名指定值的函数参数                                   |

## L

| 术语          | 英文               | 释义                                                |
| ------------- | ------------------ | --------------------------------------------------- |
| lambda 表达式 | Lambda Expression  | 创建匿名函数的表达式，`lambda x: x**2`              |
| LEGB 规则     | LEGB Rule          | 变量查找顺序：Local → Enclosing → Global → Built-in |
| 列表          | List               | 有序可变序列，`[]` 或 `list()` 创建                 |
| 列表推导      | List Comprehension | 用表达式创建列表的简洁语法 `[x for x in items]`     |
| 字面量        | Literal            | 直接写出的固定值，如 `42`、`"hello"`、`[1,2,3]`     |
| 循环          | Loop               | 重复执行代码的控制结构                              |

## M

| 术语         | 英文                          | 释义                                              |
| ------------ | ----------------------------- | ------------------------------------------------- |
| 映射         | Mapping                       | 键值对容器类型，如 `dict`                         |
| 映射函数     | Map Function                  | 对序列每个元素应用函数的 `map()` 函数             |
| 方法         | Method                        | 绑定到对象的函数                                  |
| 方法解析顺序 | MRO / Method Resolution Order | 多继承时查找方法顺序，用 `ClassName.__mro__` 查看 |
| 模块         | Module                        | 包含 Python 代码的 `.py` 文件                     |
| 多态         | Polymorphism                  | 同一操作对不同对象有不同行为                      |

## N

| 术语       | 英文              | 释义                                     |
| ---------- | ----------------- | ---------------------------------------- |
| 命名参数   | Named Argument    | 调用函数时用 `name=value` 形式传递的参数 |
| 命名空间   | Namespace         | 变量名到对象的映射                       |
| 空值       | None              | 表示无或缺失的特殊值                     |
| 非局部变量 | Nonlocal Variable | 嵌套函数中引用的外层函数变量             |
| 范数       | Norm              | 向量长度的度量，如 L1、L2 范数           |

## O

| 术语         | 英文                              | 释义                                |
| ------------ | --------------------------------- | ----------------------------------- |
| 面向对象编程 | OOP / Object-Oriented Programming | 以对象为中心的编程范式              |
| 对象         | Object                            | Python 中一切皆对象，包括数据和方法 |
| 八进制       | Octal                             | 以 0o 开头的进制表示                |
| 运算顺序     | Operator Precedence               | 表达式求值时运算符的执行先后顺序    |
| 可选参数     | Optional Argument                 | 有默认值的函数参数                  |

## P

| 术语      | 英文                | 释义                         |
| --------- | ------------------- | ---------------------------- |
| 参数      | Parameter           | 函数定义时声明的变量         |
| 解析      | Parsing             | 将文本分解为 Token 的过程    |
| pass 语句 | pass Statement      | 空操作占位符                 |
| 路径      | Path                | 文件系统中的位置             |
| 位置参数  | Positional Argument | 按顺序传递的函数参数         |
| 后置条件  | Post-condition      | 函数执行完毕后必须满足的条件 |
| 前置条件  | Pre-condition       | 函数执行前必须满足的条件     |
| 主程序    | Main Program        | 脚本直接运行时执行的代码     |
| 谓词      | Predicate           | 返回布尔值的函数             |

## Q

| 术语     | 英文           | 释义                                   |
| -------- | -------------- | -------------------------------------- |
| 限定名称 | Qualified Name | 带模块前缀的名称，如 `module.function` |

## R

| 术语       | 英文                     | 释义                                          |
| ---------- | ------------------------ | --------------------------------------------- |
| range 对象 | range Object             | 不可变的整数序列生成器                        |
| 递归       | Recursion                | 函数调用自身的编程技术                        |
| 递归深度   | Recursion Depth          | 递归调用的最大层数                            |
| 规约函数   | Reduce Function          | 将序列元素累积为单个值的 `functools.reduce()` |
| 引用计数   | Reference Count          | 对象被引用的次数，Python 垃圾回收依据         |
| 引用传递   | Pass by Object Reference | Python 参数传递方式，传递对象引用而非副本     |
| 正则表达式 | Regular Expression       | 描述文本模式的字符串，用 `re` 模块处理        |
| 关系运算符 | Relational Operator      | 比较大小的运算符                              |
| 保留字     | Reserved Word            | Python 语言保留的单词                         |

## S

| 术语         | 英文                        | 释义                                  |
| ------------ | --------------------------- | ------------------------------------- |
| 作用域       | Scope                       | 变量可见的区域                        |
| 脚本         | Script                      | 可直接运行的 Python 程序文件          |
| 自变量       | Self                        | 实例方法的第一个参数，指向当前实例    |
| 序列         | Sequence                    | 按顺序排列的元素集合                  |
| 集合         | Set                         | 无序不重复元素的可变容器              |
| 切片         | Slice                       | 用 `start:stop:step` 截取序列部分     |
| 槽           | Slot                        | 类中预定义的属性存储位置              |
| 源码         | Source Code                 | 程序员编写的原始 Python 文本          |
| 特殊方法     | Special Method              | 双下划线开头结尾的方法，如 `__init__` |
| 字符串       | String                      | 不可变的字符序列                      |
| 结构模式匹配 | Structural Pattern Matching | Python 3.10+ 的 `match...case` 语法   |
| 副作用       | Side Effect                 | 函数执行后对外部状态的改变            |

## T

| 术语       | 英文             | 释义                             |
| ---------- | ---------------- | -------------------------------- |
| 三元运算符 | Ternary Operator | `x if condition else y`          |
| Token      | Token            | 词法分析后得到的最小语法单元     |
| 真值       | Truthy           | 在布尔上下文中被视为 `True` 的值 |
| 元组       | Tuple            | 有序不可变序列                   |
| 类型注解   | Type Annotation  | 变量和函数参数的类型提示语法     |
| 类型检查   | Type Checking    | 验证变量类型是否正确             |
| 类型提示   | Type Hint        | 用 `:` 和 `->` 标注的类型信息    |

## U

| 术语   | 英文      | 释义                           |
| ------ | --------- | ------------------------------ |
| 统一码 | Unicode   | 字符编码标准，支持全球文字系统 |
| 解包   | Unpacking | 将可迭代对象元素分配给多个变量 |

## V

| 术语     | 英文              | 释义                                           |
| -------- | ----------------- | ---------------------------------------------- |
| 值       | Value             | 表达式计算的结果                               |
| 变量     | Variable          | 引用对象的命名标签                             |
| 可变对象 | Mutable Object    | 创建后可以修改的对象，如 `list`、`dict`、`set` |
| 可变参数 | Variadic Argument | 用 `*args` 接收任意数量参数                    |

## W

| 术语       | 英文           | 释义                       |
| ---------- | -------------- | -------------------------- |
| while 循环 | while Loop     | 条件为真时重复执行的循环   |
| with 语句  | with Statement | 上下文管理器，自动管理资源 |

## X

| 术语 | 英文                         | 释义             |
| ---- | ---------------------------- | ---------------- |
| XDR  | External Data Representation | 外部数据表示格式 |

## Y

| 术语       | 英文            | 释义                         |
| ---------- | --------------- | ---------------------------- |
| yield 语句 | yield Statement | 生成器函数中产生值并暂停执行 |

## Z

| 术语     | 英文         | 释义                      |
| -------- | ------------ | ------------------------- |
| zip 函数 | zip Function | 将多个序列打包为元组列表  |
| 零值     | Zero Value   | 数值类型的零值 `0` 或空值 |
