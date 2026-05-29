---
title: 'Python 高级特性名词注释 (Advanced Features Glossary)'
module: 'python'
category: 'Advanced Features'
description: 'Python 高级特性：装饰器/元编程/并发/内存管理/调试等 | Python advanced: decorators, metaprogramming, concurrency, memory management, debugging'
author: 'fanquanpp'
updated: '2026-05-29'
---

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
