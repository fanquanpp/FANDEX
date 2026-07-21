---
title: 'Glossary'
module: 'python'
---

## Python 高级特性名词注释 (Advanced Features Glossary)

## A

| 术语                | 英文                       | 释义                                                             |
| ------------------- | -------------------------- | ---------------------------------------------------------------- |
| 抽象语法树          | AST / Abstract Syntax Tree | Python 源代码编译后的树形表示，每个节点代表一个语法结构          |
| 异步生成器          | Async Generator            | 用 `async def` 定义且包含 `yield` 的函数                         |
| 异步迭代器          | Async Iterator             | 实现 `__aiter__` 和 `__anext__` 的对象                           |
| 异步迭代            | Async Iteration            | 用 `async for` 遍历异步可迭代对象                                |
| 异步上下文管理器    | Async Context Manager      | 实现 `__aenter__` 和 `__aexit__` 的对象                          |
| 异步函数            | Async Function             | 用 `async def` 定义的协程函数                                    |
| asyncio 事件循环    | Asyncio Event Loop         | asyncio 模块的核心调度器，管理协程和任务的执行                   |
| asyncio.gather      | gather                     | 并发运行多个协程并收集结果                                       |
| asyncio.create_task | create_task                | 将协程包装为可独立调度的任务                                     |
| 原子操作            | Atomic Operation           | 不可中断的操作，在多线程中保证一致性                             |
| 属性描述符          | Attribute Descriptor       | 实现 `__get__`、`__set__`、`__delete__` 的类，用于自定义属性访问 |

## B

| 术语       | 英文                 | 释义                                      |
| ---------- | -------------------- | ----------------------------------------- |
| 后台任务   | Background Task      | 在后台异步执行的任务，不阻塞主流程        |
| 断点调试   | Breakpoint Debugging | 在代码中设置断点，暂停执行检查状态        |
| 缓冲区协议 | Buffer Protocol      | Python 对象内存视图接口，支持高效数据交换 |
| 构建器     | Builder Pattern      | 创建者模式，将复杂对象构建与表示分离      |

## C

| 术语         | 英文                    | 释义                                              |
| ------------ | ----------------------- | ------------------------------------------------- |
| 回调         | Callback                | 作为参数传递的函数，在特定事件发生时被调用        |
| 协程         | Coroutine               | 用 `async def` 定义的可以在执行中暂停和恢复的函数 |
| 协程函数     | Coroutine Function      | 返回协程对象的函数，用 `async def` 定义           |
| 协程对象     | Coroutine Object        | 协程函数返回的对象，需要通过事件循环运行          |
| CPython      | CPython                 | Python 的 C 语言实现，官方参考解释器              |
| 猴子补丁     | Monkey Patch            | 运行时动态修改模块、类或函数的行为                |
| 闭包         | Closure                 | 记住创建时环境变量的函数                          |
| 代码对象     | Code Object             | 编译后的字节码表示，可执行                        |
| 协程调度     | Coroutine Scheduling    | 事件循环决定何时执行哪个协程                      |
| 容器推导     | Container Comprehension | 用推导式创建容器，如 `{x for x in range(10)}`     |
| 上下文管理器 | Context Manager         | 实现 `__enter__` 和 `__exit__` 的对象，管理资源   |
| 控制流       | Control Flow            | 程序执行顺序，if/for/while/try 等控制语句         |

## D

| 术语     | 英文              | 释义                                                 |
| -------- | ----------------- | ---------------------------------------------------- |
| 数据类   | Dataclass         | 用 `@dataclass` 装饰器自动生成 `__init__` 等方法的类 |
| 调试     | Debugging         | 查找和修复程序错误的过程                             |
| 反汇编   | Disassembly       | 将字节码转换为人类可读的指令                         |
| 描述符   | Descriptor        | 定义 `__get__`、`__set__`、`__delete__` 的类         |
| 字典视图 | Dict View         | 字典的 keys()、values()、items() 返回的动态视图      |
| 字典解包 | Dict Unpacking    | 用 `**dict` 将字典展开为关键字参数                   |
| 分布式锁 | Distributed Lock  | 跨进程的同步机制                                     |
| 动态属性 | Dynamic Attribute | 在运行时创建和访问的属性                             |

## E

| 术语      | 英文                                             | 释义                               |
| --------- | ------------------------------------------------ | ---------------------------------- |
| EAFP 原则 | EAFP / Easier to Ask Forgiveness than Permission | 先执行后处理异常的编码风格         |
| 早期绑定  | Early Binding                                    | 编译时确定变量或函数的引用         |
| 编码检测  | Encoding Detection                               | 自动检测文件或字符串的字符编码     |
| 评估顺序  | Evaluation Order                                 | 表达式中子表达式从左到右的求值顺序 |
| 事件循环  | Event Loop                                       | 持续运行的循环，分发事件到处理器   |
| 执行框架  | Execution Frame                                  | Python 运行时栈帧，包含执行上下文  |
| 显式多态  | Explicit Polymorphism                            | 手动实现多态，而非依赖继承         |

## F

| 术语        | 英文                 | 释义                                  |
| ----------- | -------------------- | ------------------------------------- |
| futures     | futures              | concurrent.futures 模块，并发执行抽象 |
| Future 对象 | Future               | 代表异步操作最终结果的对象            |
| 函数注解    | Function Annotation  | 用 `->` 标注的函数返回类型            |
| 函数工厂    | Function Factory     | 根据参数返回不同函数的函数            |
| 函数组合    | Function Composition | 将多个函数组合成新函数                |

## G

| 术语         | 英文                 | 释义                                 |
| ------------ | -------------------- | ------------------------------------ |
| 垃圾回收     | Garbage Collection   | 自动回收不再使用的内存               |
| 生成器       | Generator            | 用 `yield` 产生值的迭代器函数        |
| 生成器迭代   | Generator Iteration  | 遍历生成器，每次产生一个值           |
| 生成器表达式 | Generator Expression | 类似列表推导但用圆括号，结果为生成器 |
| gettext      | gettext              | 国际化翻译模块                       |

## H

| 术语     | 英文                 | 释义                           |
| -------- | -------------------- | ------------------------------ |
| 哈希冲突 | Hash Collision       | 不同对象有相同哈希值的罕见情况 |
| 哈希探查 | Hash Probing         | 哈希表中处理冲突的探查方法     |
| 头等函数 | First-Class Function | 函数作为值可以赋值、传递、返回 |

## I

| 术语         | 英文                 | 释义                                                |
| ------------ | -------------------- | --------------------------------------------------- |
| 惰性求值     | Lazy Evaluation      | 表达式在需要时才求值                                |
| 晚期绑定     | Late Binding         | 运行时确定变量引用                                  |
| 链表         | Linked List          | 通过指针连接的数据结构                              |
| 本地变量表   | Local Variable Table | 存储函数局部变量的数组                              |
| 锁           | Lock                 | 线程同步原语，同一时刻只允许一个线程持有            |
| 日志级别     | Log Level            | 日志重要程度：DEBUG、INFO、WARNING、ERROR、CRITICAL |
| 日志处理器   | Log Handler          | 日志输出目的地，如文件、控制台                      |
| 日志格式化器 | Log Formatter        | 日志输出格式模板                                    |

## M

| 术语       | 英文            | 释义                                       |
| ---------- | --------------- | ------------------------------------------ |
| 元编程     | Metaprogramming | 程序操作自身代码的技术，如装饰器、类装饰器 |
| 元类       | Metaclass       | 类的类，控制类的创建行为                   |
| mixin 混入 | Mixin           | 提供额外方法的类，用于多重继承             |
| 混合方法   | Mixed Method    | 在多个 MRO 位置都能找到的方法              |
| 内存视图   | Memory View     | 共享另一对象内存的只读或读写视图           |
| 元组解包   | Tuple Unpacking | 将元组值分配给多个变量                     |

## N

| 术语       | 英文              | 释义                                          |
| ---------- | ----------------- | --------------------------------------------- |
| 命名元组   | Named Tuple       | 带命名字段的元组子类                          |
| 名称修饰   | Name Mangling     | 双下划线开头属性被重命名为 `_ClassName__attr` |
| 命名空间包 | Namespace Package | Python 3.3+ 无 `__init__.py` 的包             |
| 不可达代码 | Unreachable Code  | 永远不会被执行的代码                          |
| Numpy 数组 | ndarray           | NumPy 的核心多维数组对象                      |
| Numpy 广播 | Broadcasting      | 不同形状数组进行运算时的自动扩展机制          |

## O

| 术语       | 英文             | 释义                           |
| ---------- | ---------------- | ------------------------------ |
| 对象代理   | Object Proxy     | 转发所有操作到另一个对象的对象 |
| 观察者模式 | Observer Pattern | 发布-订阅模式，一对多依赖关系  |
| 开放授权   | OAuth            | 第三方授权开放标准             |

## P

| 术语         | 英文                         | 释义                                       |
| ------------ | ---------------------------- | ------------------------------------------ |
| 路径协议     | Path Protocol                | 实现 `__fspath__` 的对象，返回文件系统路径 |
| 管道         | Pipe                         | 进程间通信的通道                           |
| 轮询         | Polling                      | 定期检查状态变化而非等待通知               |
| 池化         | Pooling                      | 复用有限资源的技术，如连接池、线程池       |
| 预取         | Prefetching                  | 提前加载可能需要的数据                     |
| 优先级队列   | Priority Queue               | 按优先级排序的队列                         |
| 进程池       | Process Pool                 | 预创建的工作进程集合                       |
| 程序分析     | Profiling                    | 分析程序性能，识别瓶颈                     |
| 属性访问拦截 | Property Access Interception | 通过 `__getattr__` 等拦截属性访问          |
| 代理对象     | Proxy Object                 | 转发请求到另一个对象的对象                 |

## R

| 术语       | 英文                   | 释义                                   |
| ---------- | ---------------------- | -------------------------------------- |
| RLock      | RLock / Reentrant Lock | 可重入锁，同一线程可多次获取           |
| 猴子补丁   | Monkey Patching        | 运行时动态修改代码                     |
| 原始字符串 | Raw String             | 不转义反斜杠的字符串 `r"path\to\file"` |
| 引用计数   | Reference Counting     | Python 主要的内存管理机制              |
| 引用循环   | Reference Cycle        | 对象间的循环引用，可能导致内存泄漏     |
| 正则编译   | Regex Compilation      | 用 `re.compile()` 预编译正则表达式     |
| 可重入     | Reentrancy             | 可以在未完成时重新进入的性质           |
| 可重入锁   | Reentrant Lock         | 同一线程可多次获取的锁                 |
| 资源管理   | Resource Management    | 正确获取和释放系统资源                 |

## S

| 术语         | 英文                                | 释义                                |
| ------------ | ----------------------------------- | ----------------------------------- |
| 调度器       | Scheduler                           | 决定任务执行顺序的组件              |
| 秘密生成     | Secret Generation                   | 生成加密安全随机数                  |
| 自省         | Introspection                       | 程序运行时检查自身结构的能力        |
| Semaphore    | Semaphore                           | 控制资源访问数量的计数器            |
| 序列化       | Serialization                       | 将对象转换为可存储/传输格式         |
| 服务定位器   | Service Locator                     | 集中管理服务实例的全局对象          |
| 集合原子操作 | Set Atomic Operation                | 线程安全的集合操作                  |
| 集合推导     | Set Comprehension                   | 用 `{x for x in iterable}` 创建集合 |
| 集合解包     | Set Unpacking                       | 用 `*set` 将集合展开                |
| 影子变量     | Shadowing                           | 内层作用域变量遮蔽外层同名变量      |
| 信号处理     | Signal Handling                     | 响应 Unix 信号                      |
| 单例模式     | Singleton Pattern                   | 类只有一个实例的设计模式            |
| 切片赋值     | Slice Assignment                    | 用切片修改序列部分内容              |
| 槽           | Slot                                | 类中预定义的固定属性集合            |
| 槽限制       | Slot Restriction                    | 只有 `__slots__` 定义的属性才可添加 |
| 软件事务内存 | STM / Software Transactional Memory | 用事务方式管理内存并发访问          |
| 源码检查     | Source Inspection                   | 运行时检查源代码                    |
| 源码字符串   | Source String                       | 对象的源代码文本表示                |
| 弱引用       | Weak Reference                      | 不阻止对象被回收的引用              |

## T

| 术语      | 英文              | 释义                         |
| --------- | ----------------- | ---------------------------- |
| 任务      | Task              | asyncio 中包装协程的执行单元 |
| 任务取消  | Task Cancellation | 取消正在运行的任务           |
| 临时文件  | Temporary File    | 临时存储数据的文件，自动清理 |
| 线程安全  | Thread Safety     | 多线程环境下正确工作的性质   |
| 线程池    | Thread Pool       | 预创建的工作线程集合         |
| 时间戳    | Timestamp         | 表示日期时间的数值           |
| token     | Token             | 词法分析的最小语法单元       |
| traceback | Traceback         | 异常传播的函数调用栈信息     |
| 元组解包  | Tuple Unpacking   | 将元组值同时分配给多个变量   |
| 类型变体  | Type Variant      | 泛型中不同类型参数的具体类型 |

## U

| 术语           | 英文             | 释义                                       |
| -------------- | ---------------- | ------------------------------------------ |
| Unicode 数据库 | Unicode Database | Unicode 字符属性数据库                     |
| Unicode 转义   | Unicode Escape   | `\uXXXX` 或 `\UXXXXXXXX` 表示 Unicode 字符 |
| 未绑定方法     | Unbound Method   | 类中定义但未绑定到实例的方法               |

## V

| 术语     | 英文                | 释义                                       |
| -------- | ------------------- | ------------------------------------------ |
| 验证器   | Validator           | 验证数据合法性的函数或对象                 |
| 变体类型 | Variance            | 泛型类型之间的子类型关系                   |
| 协变     | Covariance          | 泛型中 `List[Derived]` 可替代 `List[Base]` |
| 逆变     | Contravariance      | 泛型中 `List[Base]` 可替代 `List[Derived]` |
| 虚拟环境 | Virtual Environment | 隔离的 Python 运行环境                     |

## W

| 术语     | 英文         | 释义                   |
| -------- | ------------ | ---------------------- |
| 等待集   | Wait Set     | 线程等待特定条件的集合 |
| 等待超时 | Wait Timeout | 等待操作的最长时间     |
| watcher  | Watch        | 监控文件或目录变化     |

## X

| 术语    | 英文    | 释义                        |
| ------- | ------- | --------------------------- |
| XML-RPC | XML-RPC | 基于 XML 的远程过程调用协议 |

## Y

| 术语         | 英文             | 释义                         |
| ------------ | ---------------- | ---------------------------- |
| yield from   | yield from       | 在生成器中委托给另一个生成器 |
| yield 表达式 | Yield Expression | 产生值并暂停的表达式         |

## Z

| 术语   | 英文      | 释义                     |
| ------ | --------- | ------------------------ |
| 零拷贝 | Zero-Copy | 避免不必要数据复制的技术 |

## Python 核心语言名词注释 (Core Language Glossary)

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

## Python 标准库名词注释 (Standard Library Glossary)

## A

| 术语         | 英文     | 释义                                            |
| ------------ | -------- | ----------------------------------------------- |
| argparse     | argparse | 命令行参数解析模块，支持位置参数和选项参数      |
| array 模块   | array    | 高效存储单一类型数据的序列，类似列表但更省内存  |
| asyncio 模块 | asyncio  | 异步 I/O 编程模块，支持协程、事件循环、异步任务 |
| ast 模块     | ast      | Python 抽象语法树解析模块，用于代码分析和转换   |

## B

| 术语          | 英文     | 释义                                                        |
| ------------- | -------- | ----------------------------------------------------------- |
| base64 模块   | base64   | Base64 编码解码模块，用于二进制与文本转换                   |
| bisect 模块   | bisect   | 有序列表二分查找和插入模块                                  |
| builtins 模块 | builtins | Python 内置函数和异常的模块，如 `print`、`len`、`Exception` |
| bz2 模块      | bz2      | BZIP2 压缩解压模块                                          |

## C

| 术语                    | 英文               | 释义                                                              |
| ----------------------- | ------------------ | ----------------------------------------------------------------- |
| calendar 模块           | calendar           | 日历相关功能模块                                                  |
| cmath 模块              | cmath              | 复数数学运算模块                                                  |
| collections 模块        | collections        | 容器数据类型模块，提供 namedtuple、deque、Counter、OrderedDict 等 |
| collections.defaultdict | defaultdict        | 带默认值的字典，访问不存在的键时自动创建默认值                    |
| collections.Counter     | Counter            | 元素计数容器，用于统计可哈希对象出现次数                          |
| collections.deque       | deque              | 双端队列，支持两端高效插入删除                                    |
| collections.namedtuple  | namedtuple         | 创建带命名字段的元组子类的工厂函数                                |
| concurrent.futures 模块 | concurrent.futures | 异步并行执行模块，提供 ThreadPoolExecutor 和 ProcessPoolExecutor  |
| copy 模块               | copy               | 对象拷贝模块，`copy.copy()` 浅拷贝，`copy.deepcopy()` 深拷贝      |
| csv 模块                | csv                | CSV 文件读写模块                                                  |
| curses 模块             | curses             | 终端文本界面编程模块（Unix）                                      |

## D

| 术语             | 英文        | 释义                                                      |
| ---------------- | ----------- | --------------------------------------------------------- |
| dataclasses 模块 | dataclasses | Python 3.7+ 的数据类装饰器模块                            |
| datetime 模块    | datetime    | 日期时间处理模块，提供 date、time、datetime、timedelta 类 |
| dbm 模块         | dbm         | Unix 数据库模块，提供简单的键值存储                       |
| decimal 模块     | decimal     | 十进制精确运算模块，避免浮点数精度问题                    |
| difflib 模块     | difflib     | 序列差异计算模块，用于文本比较和合并                      |
| dis 模块         | dis         | Python 字节码反汇编模块                                   |

## E

| 术语           | 英文      | 释义                      |
| -------------- | --------- | ------------------------- |
| encodings 模块 | encodings | 字符编码转换模块          |
| enum 模块      | enum      | 枚举类型定义模块          |
| errno 模块     | errno     | 标准 errno 系统错误码模块 |

## F

| 术语                | 英文      | 释义                                                  |
| ------------------- | --------- | ----------------------------------------------------- |
| fcntl 模块          | fcntl     | Unix 文件控制模块，用于文件描述符操作                 |
| filecmp 模块        | filecmp   | 文件和目录比较模块                                    |
| fnmatch 模块        | fnmatch   | Unix 文件名模式匹配模块                               |
| fractions 模块      | fractions | 有理数运算模块                                        |
| functools 模块      | functools | 函数式编程工具模块，提供 lru_cache、partial、wraps 等 |
| functools.lru_cache | lru_cache | Least Recently Used 缓存装饰器，缓存函数调用结果      |
| functools.partial   | partial   | 函数柯里化工具，创建带预设参数的函数副本              |
| functools.reduce    | reduce    | 函数式规约操作，将序列元素累积为单个值                |

## G

| 术语         | 英文    | 释义                        |
| ------------ | ------- | --------------------------- |
| gc 模块      | gc      | Python 垃圾回收器接口模块   |
| gdbm 模块    | gdbm    | GNU dbm 数据库接口模块      |
| getopt 模块  | getopt  | Unix 风格命令行选项解析模块 |
| getpass 模块 | getpass | 安全密码输入模块            |
| glob 模块    | glob    | Unix 风格路径名模式匹配模块 |

## H

| 术语         | 英文    | 释义                                              |
| ------------ | ------- | ------------------------------------------------- |
| hashlib 模块 | hashlib | 安全哈希和消息摘要模块，支持 md5、sha1、sha256 等 |
| heapq 模块   | heapq   | 堆队列算法模块，实现最小堆                        |
| history      | history | 命令行历史记录                                    |

## I

| 术语                   | 英文         | 释义                                         |
| ---------------------- | ------------ | -------------------------------------------- |
| inspect 模块           | inspect      | 运行时检查对象源码、签名、类型的模块         |
| io 模块                | io           | I/O 流处理模块，提供 StringIO、BytesIO 等    |
| itertools 模块         | itertools    | 迭代器工具模块，提供无限迭代器、组合迭代器等 |
| itertools.chain        | chain        | 将多个迭代器连接成单一迭代器                 |
| itertools.groupby      | groupby      | 按键分组迭代器元素的函数                     |
| itertools.islice       | islice       | 迭代器切片工具                               |
| itertools.permutations | permutations | 生成序列的全排列                             |
| itertools.product      | product      | 生成多个序列的笛卡尔积                       |
| itertools.repeat       | repeat       | 无限重复值迭代器                             |
| itertools.combinations | combinations | 生成序列的组合                               |

## J

| 术语      | 英文      | 释义               |
| --------- | --------- | ------------------ |
| json 模块 | json      | JSON 编码解码模块  |
| zipimport | zipimport | ZIP 压缩包导入模块 |

## L

| 术语         | 英文    | 释义                               |
| ------------ | ------- | ---------------------------------- |
| locale 模块  | locale  | 区域设置和格式化模块               |
| logging 模块 | logging | 日志记录模块，支持多级别、多处理器 |
| lzma 模块    | lzma    | LZMA 压缩解压模块                  |

## M

| 术语                 | 英文            | 释义                                          |
| -------------------- | --------------- | --------------------------------------------- |
| mailbox 模块         | mailbox         | 邮件格式读写模块                              |
| math 模块            | math            | 数学运算模块，提供 sin、cos、sqrt、log 等函数 |
| mimetypes 模块       | mimetypes       | MIME 类型猜测模块                             |
| mmap 模块            | mmap            | 内存映射文件模块                              |
| multiprocessing 模块 | multiprocessing | 多进程并行处理模块                            |
| multiprocessing.Pool | Pool            | 多进程工作池，简化并行任务分发                |

## N

| 术语         | 英文    | 释义                    |
| ------------ | ------- | ----------------------- |
| netrc 模块   | netrc   | .netrc 配置文件解析模块 |
| numbers 模块 | numbers | 数字抽象基类模块        |

## O

| 术语          | 英文     | 释义                                                       |
| ------------- | -------- | ---------------------------------------------------------- |
| operator 模块 | operator | 运算符函数化模块，如 `operator.add`、`operator.itemgetter` |
| optparse 模块 | optparse | 命令行选项解析模块（旧版）                                 |
| os 模块       | os       | 操作系统接口模块，提供文件、目录、进程操作                 |
| os.path 模块  | os.path  | 路径操作模块，提供 join、split、exists 等函数              |
| os.environ    | environ  | 操作系统环境变量字典                                       |
| zipfile       | zipfile  | ZIP 压缩包读写模块                                         |

## P

| 术语            | 英文       | 释义                                      |
| --------------- | ---------- | ----------------------------------------- |
| pathlib 模块    | pathlib    | 面向对象路径操作模块，Python 3.4+         |
| pickle 模块     | pickle     | Python 对象序列化模块，将对象转换为字节流 |
| pipes 模块      | pipes      | Shell 管道接口模块                        |
| platform 模块   | platform   | 平台信息查询模块                          |
| plistlib 模块   | plistlib   | Apple plist 文件读写模块                  |
| pprint 模块     | pprint     | 格式化打印模块，美化输出                  |
| profile 模块    | profile    | 代码性能分析模块                          |
| pstats 模块     | pstats     | 性能统计结果格式模块                      |
| pty 模块        | pty        | 伪终端编程模块（Unix）                    |
| pwd 模块        | pwd        | Unix 用户密码数据库模块                   |
| py_compile 模块 | py_compile | Python 源码编译模块                       |
| pyclbr 模块     | pyclbr     | Python 类浏览器信息模块                   |

## Q

| 术语        | 英文   | 释义                               |
| ----------- | ------ | ---------------------------------- |
| queue 模块  | queue  | 线程安全队列模块                   |
| quopri 模块 | quopri | MIME Quoted-Printable 编码解码模块 |

## R

| 术语             | 英文        | 释义                         |
| ---------------- | ----------- | ---------------------------- |
| random 模块      | random      | 伪随机数生成模块             |
| re 模块          | re          | 正则表达式匹配和处理模块     |
| re.match         | match       | 从字符串开头匹配模式         |
| re.search        | search      | 在字符串任意位置搜索模式     |
| re.findall       | findall     | 返回所有匹配的非重叠子串     |
| re.sub           | sub         | 替换匹配的模式               |
| re.compile       | compile     | 预编译正则表达式模式         |
| readline 模块    | readline    | GNU readline 接口模块        |
| resource 模块    | resource    | 系统资源使用查询模块（Unix） |
| rlcompleter 模块 | rlcompleter | 命令行自动补全模块           |
| runpy 模块       | runpy       | 模块定位和执行模块           |

## S

| 术语              | 英文         | 释义                                         |
| ----------------- | ------------ | -------------------------------------------- |
| sched 模块        | sched        | 事件调度模块                                 |
| secrets 模块      | secrets      | 密码学安全随机数模块，生成安全令牌           |
| select 模块       | select       | I/O 多路复用模块（Unix）                     |
| selectors 模块    | selectors    | 高级 I/O 多路复用模块                        |
| shlex 模块        | shlex        | Shell 词法分析模块                           |
| shutil 模块       | shutil       | 高级文件操作模块，提供复制、移动、删除等功能 |
| signal 模块       | signal       | Unix 信号处理模块                            |
| smtpd 模块        | smtpd        | SMTP 邮件服务器模块                          |
| smtplib 模块      | smtplib      | SMTP 邮件发送模块                            |
| sndhdr 模块       | sndhdr       | 声音文件类型检测模块                         |
| socket 模块       | socket       | 网络套接字编程模块                           |
| socketserver 模块 | socketserver | 网络服务器框架模块                           |
| spwd 模块         | spwd         | Unix shadow 密码数据库模块                   |
| sqlite3 模块      | sqlite3      | SQLite 数据库接口模块                        |
| ssl 模块          | ssl          | SSL/TLS 加密套接字模块                       |
| stat 模块         | stat         | 文件状态解析模块                             |
| statistics 模块   | statistics   | 统计数学模块                                 |
| string 模块       | string       | 字符串常量和工具模块                         |
| struct 模块       | struct       | 二进制数据结构打包解包模块                   |
| subprocess 模块   | subprocess   | 子进程创建和管理模块                         |
| sunau 模块        | sunau        | Sun AU 音频文件模块                          |
| symbol 模块       | symbol       | Python 语法符号常量模块                      |
| sys 模块          | sys          | Python 解释器系统接口模块                    |
| sys.argv          | argv         | 命令行参数列表                               |
| sys.path          | path         | 模块搜索路径列表                             |
| sys.modules       | modules      | 已导入模块缓存字典                           |
| sys.exit          | exit         | 退出解释器函数                               |

## T

| 术语             | 英文        | 释义                      |
| ---------------- | ----------- | ------------------------- |
| tarfile 模块     | tarfile     | TAR 压缩包读写模块        |
| telnetlib 模块   | telnetlib   | Telnet 协议客户端模块     |
| tempfile 模块    | tempfile    | 临时文件和目录创建模块    |
| textwrap 模块    | textwrap    | 文本包装和填充模块        |
| threading 模块   | threading   | 多线程编程模块            |
| threading.Lock   | Lock        | 线程同步互斥锁            |
| threading.RLock  | RLock       | 可重入互斥锁              |
| time 模块        | time        | 时间访问和转换模块        |
| timeit 模块      | timeit      | 代码片段执行时间测量模块  |
| tkinter 模块     | tkinter     | Tcl/Tk GUI 图形界面模块   |
| tokenize 模块    | tokenize    | Python 源代码词法分析模块 |
| traceback 模块   | traceback   | 异常栈回溯模块            |
| tracemalloc 模块 | tracemalloc | 内存分配追踪模块          |
| tty 模块         | tty         | 终端控制模块（Unix）      |
| turtle 模块      | turtle      | 海龟绘图模块，适合教学    |

## U

| 术语                    | 英文               | 释义                    |
| ----------------------- | ------------------ | ----------------------- |
| unittest 模块           | unittest           | 单元测试框架模块        |
| urllib 模块             | urllib             | URL 处理模块            |
| urllib.parse 模块       | urllib.parse       | URL 解析和构造模块      |
| urllib.request 模块     | urllib.request     | URL 请求模块            |
| urllib.robotparser 模块 | urllib.robotparser | robots.txt 解析模块     |
| uselect 模块            | uselect            | 非阻塞 I/O 多路复用模块 |
| uu 模块                 | uu                 | UU 编码解码模块         |

## V

| 术语            | 英文       | 释义             |
| --------------- | ---------- | ---------------- |
| venv 模块       | venv       | 虚拟环境创建模块 |
| venv/virtualenv | virtualenv | 虚拟环境隔离工具 |

## W

| 术语            | 英文       | 释义                             |
| --------------- | ---------- | -------------------------------- |
| wave 模块       | wave       | WAV 音频文件读写模块             |
| weakref 模块    | weakref    | 弱引用模块，不阻止对象被垃圾回收 |
| webbrowser 模块 | webbrowser | 系统默认浏览器控制模块           |
| winsound 模块   | winsound   | Windows 声音播放模块             |

## X

| 术语                  | 英文        | 释义                                |
| --------------------- | ----------- | ----------------------------------- |
| xml 模块              | xml         | XML 处理模块总称                    |
| xml.etree.ElementTree | ElementTree | XML 元素树解析模块，轻量级 XML 处理 |
| xml.dom 模块          | xml.dom     | DOM 风格 XML 处理模块               |
| xml.sax 模块          | xml.sax     | SAX 风格流式 XML 解析模块           |
| xxdiff 模块           | xxdiff      | 文件差异比较模块                    |

## Y

| 术语      | 英文 | 释义                                 |
| --------- | ---- | ------------------------------------ |
| yaml 模块 | yaml | YAML 数据序列化模块（需安装 pyyaml） |

## Z

| 术语        | 英文   | 释义                |
| ----------- | ------ | ------------------- |
| zipapp 模块 | zipapp | Python 应用打包模块 |
| zlib 模块   | zlib   | zlib 压缩解压模块   |
