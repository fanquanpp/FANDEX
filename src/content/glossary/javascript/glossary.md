---
title: 'JavaScript 专有名词查阅表'
module: 'javascript'
category: 'javascript'
description: 'JavaScript 专有名词注释查阅表，涵盖 ES 基础、DOM/BOM、异步编程等'
author: 'fanquanpp'
updated: '2026-05-29'
---

## 名词列表

### core 核心基础术语

| 术语         | 英文                                | 释义                                                        |
| ------------ | ----------------------------------- | ----------------------------------------------------------- |
| 抽象语法树   | AST / Abstract Syntax Tree          | JavaScript 代码编译后的树形表示，每个节点代表代码的语法结构 |
| 访问器属性   | Accessor Property                   | 通过 getter 和 setter 方法访问的属性                        |
| 活动对象     | Activation Object                   | 函数执行时创建的变量对象，存储函数参数和局部变量            |
| 聚合赋值     | Augmented Assignment                | 复合赋值运算符如 `+=`、`-=`、`*=` 等                        |
| 自动分号插入 | ASI / Automatic Semicolon Insertion | JavaScript 引擎自动在特定位置添加分号的机制                 |
| 辅助功能     | Accessibility                       | 使网页对残障人士可用的技术和实践                            |
| 断言         | Assertion                           | 测试中验证条件是否为真的语句                                |

### B

| 术语       | 英文                       | 释义                                                |
| ---------- | -------------------------- | --------------------------------------------------- |
| Babel      | Babel                      | JavaScript 编译器，将新版本语法转换为旧版本兼容代码 |
| 块级作用域 | Block Scope                | 用 `let` 或 `const` 在 `{}` 中声明的变量作用域      |
| 布尔类型   | Boolean                    | 值只能为 `true` 或 `false` 的数据类型               |
| BOM        | BOM / Browser Object Model | 浏览器对象模型，提供操作浏览器窗口的 API            |
| 断点       | Breakpoint                 | 调试器中暂停代码执行的位置                          |
| 构建工具   | Build Tool                 | 自动完成代码打包、压缩、转换等任务的工具            |
| 字节码     | Bytecode                   | 解释器执行的中间代码形式                            |

### C

| 术语       | 英文                   | 释义                                                   |
| ---------- | ---------------------- | ------------------------------------------------------ |
| 回调函数   | Callback               | 作为参数传递给另一个函数的函数，在特定时机被调用       |
| 调用栈     | Call Stack             | 存储函数调用上下文的数据结构，后进先出                 |
| 捕获阶段   | Capturing Phase        | 事件从根节点向下传播到目标节点的阶段                   |
| 类         | Class                  | 创建对象的模板，使用 `class` 关键字定义                |
| 类字段     | Class Field            | 类中直接定义的属性，无需在构造函数中声明               |
| 闭包       | Closure                | 函数与其引用的词法环境的组合，能访问创建时的作用域变量 |
| 代码分割   | Code Splitting         | 将代码分成多个块，按需加载的技术                       |
| 代码块     | Code Block             | 用 `{}` 包裹的语句组                                   |
| 比较运算符 | Comparison Operator    | `==`、`===`、`!=`、`!==` 等比较运算符号                |
| 编译时     | Compile Time           | 代码被编译的阶段                                       |
| 复合语句   | Compound Statement     | 包含其他语句的语句，如 `if`、`for`                     |
| 条件表达式 | Conditional Expression | 三元运算符 `condition ? value1 : value2`               |
| 构造函数   | Constructor            | 初始化对象实例的函数，用 `new` 调用                    |
| 上下文     | Context                | `this` 绑定的对象                                      |
| 可迭代对象 | Iterable               | 实现了迭代器协议的对象，可用 `for...of` 遍历           |
| 柯里化     | Currying               | 将多参数函数转换为一系列单参数函数的技术               |
| 客户端     | Client                 | 请求服务的用户端程序，如浏览器                         |

### D

| 术语         | 英文                        | 释义                                              |
| ------------ | --------------------------- | ------------------------------------------------- |
| 数据类型     | Data Type                   | 值的种类，决定可执行的操作                        |
| 调试器       | Debugger                    | 检查和修复代码错误的工具                          |
| 解构赋值     | Destructuring Assignment    | 将数组或对象值提取到变量的语法                    |
| 文档对象模型 | DOM / Document Object Model | 将 HTML/XML 文档表示为树形结构，JavaScript 可操作 |
| 动态类型     | Dynamic Typing              | 变量类型在运行时确定，无需声明                    |
| 动态导入     | Dynamic Import              | 使用 `import()` 语法按需加载模块                  |

### E

| 术语       | 英文                 | 释义                                   |
| ---------- | -------------------- | -------------------------------------- |
| ECMA 国际  | ECMA International   | 制定 JavaScript 语言标准的组织         |
| ECMAScript | ECMAScript           | JavaScript 的语言规范标准              |
| 编辑器     | Editor               | 编写代码的文本编辑器                   |
| 提升       | Elevation            | 元素在文档流中的视觉位置               |
| 编码       | Encoding             | 字符到字节的映射规则                   |
| 环境对象   | Environment Record   | 存储变量绑定的对象                     |
| 环境闭包   | Environment Closure  | 闭包捕获的词法环境                     |
| 同等优先   | Equi-precedence      | 同一优先级的运算从左到右执行           |
| ES Modules | ESM                  | 使用 `import`/`export` 的模块系统      |
| eval       | eval                 | 将字符串作为代码执行的函数             |
| 事件循环   | Event Loop           | 持续运行的事件分发机制，处理异步回调   |
| 执行上下文 | Execution Context    | 代码运行时的环境，包含变量和作用域信息 |
| 执行栈     | Execution Stack      | 管理执行上下文的栈结构                 |
| 表达式     | Expression           | 求值后产生值的代码片段                 |
| 表达式语句 | Expression Statement | 以表达式构成的语句                     |
| 扩展运算符 | Spread Operator      | `...` 展开可迭代对象                   |
| 可选链     | Optional Chaining    | `?.` 安全访问深层属性                  |

### F

| 术语       | 英文                   | 释义                                                    |
| ---------- | ---------------------- | ------------------------------------------------------- |
| 假值       | Falsy                  | 在布尔上下文中被视为 `False` 的值，如 `0`、`""`、`null` |
| 字段       | Field                  | 对象的属性或类成员                                      |
| 文件对象   | File Object            | 通过 `<input type="file">` 获取的文件信息对象           |
| 过滤器     | Filter                 | 数组方法，从元素中筛选满足条件的                        |
| 浮点数     | Float                  | 带小数点的数字类型，IEEE 754 标准                       |
| 折叠       | Fold                   | 将数组元素累积为单个值                                  |
| for...in   | for...in               | 遍历对象可枚举属性的循环                                |
| for...of   | for...of               | 遍历可迭代对象元素的循环                                |
| 前端       | Frontend               | 用户界面和用户交互的部分                                |
| 函数声明   | Function Declaration   | 用 `function` 关键字声明的函数，存在提升                |
| 函数表达式 | Function Expression    | 将函数赋值给变量的表达式，不提升                        |
| 函数式编程 | Functional Programming | 以函数为核心的编程范式                                  |
| 函数提升   | Function Hoisting      | 函数声明被提升到作用域顶部                              |

### G

| 术语       | 英文               | 释义                                        |
| ---------- | ------------------ | ------------------------------------------- |
| 生成器函数 | Generator Function | 用 `function*` 定义，可暂停和恢复执行的函数 |
| getter     | getter             | 获取属性值的访问器方法                      |
| 全局对象   | Global Object      | 全局范围内可用的对象，浏览器中是 `window`   |
| 全局作用域 | Global Scope       | 所有代码都可访问的作用域                    |
| 全局变量   | Global Variable    | 在全局作用域声明的变量                      |

### H

| 术语     | 英文                  | 释义                                        |
| -------- | --------------------- | ------------------------------------------- |
| 哈希表   | Hash Table            | 通过键直接访问值的数据结构                  |
| 高阶函数 | Higher-Order Function | 接收函数为参数或返回函数的函数              |
| 宿主对象 | Host Object           | 运行环境提供的对象，如 `window`、`document` |
| 宿主环境 | Host Environment      | JavaScript 运行的环境，如浏览器、Node.js    |
| 标识符   | Identifier            | 变量、函数、类的命名                        |

### I

| 术语         | 英文                                           | 释义                                 |
| ------------ | ---------------------------------------------- | ------------------------------------ |
| 标识         | Identity                                       | `===` 比较，检查是否为同一对象引用   |
| if 语句      | if Statement                                   | 条件分支语句                         |
| 立即执行函数 | IIFE / Immediately Invoked Function Expression | 定义后立即执行的函数表达式           |
| 不可修改     | Immutable                                      | 创建后不能更改的数据                 |
| 不可变对象   | Immutable Object                               | 创建后属性不能修改的对象             |
| 导入         | Import                                         | 从模块获取导出的变量                 |
| 索引         | Index                                          | 数组中元素的位置，从 0 开始          |
| 索引属性     | Indexed Property                               | 通过数字索引访问的属性               |
| 惰性求值     | Lazy Evaluation                                | 表达式在需要时才求值                 |
| 词法环境     | Lexical Environment                            | 代码结构决定的变量作用域             |
| 词法作用域   | Lexical Scope                                  | 根据源代码位置确定的作用域           |
| 字面量       | Literal                                        | 直接写出的固定值，如 `42`、`"hello"` |
| 逻辑运算符   | Logical Operator                               | `&&`、`\|\|`、`!` 用于布尔运算       |
| 循环         | Loop                                           | 重复执行代码的控制结构               |

### J

| 术语     | 英文                              | 释义                         |
| -------- | --------------------------------- | ---------------------------- |
| JIT 编译 | JIT / Just-In-Time Compilation    | 运行时将热点代码编译为机器码 |
| JSON     | JSON / JavaScript Object Notation | 轻量级数据交换格式           |
| JSDoc    | JSDoc                             | JavaScript 文档注释语法      |

### K

| 术语   | 英文           | 释义                                  |
| ------ | -------------- | ------------------------------------- |
| 关键字 | Keyword        | JavaScript 保留的单词，如 `if`、`for` |
| 键值对 | Key-Value Pair | 键和值一一对应的数据项                |

### L

| 术语          | 英文              | 释义                   |
| ------------- | ----------------- | ---------------------- |
| lambda 表达式 | Lambda Expression | 箭头函数的另一种称呼   |
| 后期绑定      | Late Binding      | 运行时确定 `this` 指向 |
| 链表          | Linked List       | 通过指针连接的数据结构 |
| 字面量        | Literal           | 直接书写的固定值       |
| 逻辑运算符    | Logical Operator  | `&&`、`\|\|`、`!`      |

### M

| 术语               | 英文            | 释义                                      |
| ------------------ | --------------- | ----------------------------------------- |
| Map                | Map             | 键值对集合，任意类型键都可                |
| 映射函数           | Map Function    | 对数组每个元素执行函数并返回新数组        |
| 方法               | Method          | 绑定到对象的函数                          |
| 方法链             | Method Chaining | 连续调用多个方法                          |
| mixin              | Mixin           | 提供方法供其他类组合使用的类              |
| 模块               | Module          | 独立的功能单元，用 `import`/`export` 组织 |
| 模块模式           | Module Pattern  | 用闭包实现私有成员的编程模式              |
| 猴子补丁           | Monkey Patching | 运行时动态修改对象或类的行为              |
| Mozilla 开发者网络 | MDN             | Mozilla 维护的 Web 技术文档网站           |

### N

| 术语     | 英文               | 释义                           |
| -------- | ------------------ | ------------------------------ |
| 命名空间 | Namespace          | 避免命名冲突的容器             |
| NaN      | NaN / Not a Number | 非数字，表示无效的数学运算结果 |
| 本地存储 | Local Storage      | 浏览器中持久存储数据的机制     |
| Node.js  | Node.js            | 服务端 JavaScript 运行时       |

### O

| 术语       | 英文                     | 释义                                          |
| ---------- | ------------------------ | --------------------------------------------- |
| 对象       | Object                   | 键值对的集合，是 JavaScript 的核心数据结构    |
| 对象字面量 | Object Literal           | 用 `{}` 直接创建对象的语法                    |
| 目标阶段   | Target Phase             | 事件到达目标节点的阶段                        |
| 模板字面量 | Template Literal         | 用反引号 `` ` `` 创建的字符串，支持嵌入表达式 |
| 暂存死区   | TDZ / Temporal Dead Zone | `let`/`const` 声明前不可访问的区域            |
| this       | this                     | 指向当前执行上下文的对象                      |
| 抛出       | Throw                    | 产生异常，中断代码执行                        |
| 触发       | Trigger                  | 导致事件发生                                  |
| 真值       | Truthy                   | 在布尔上下文中被视为 `True` 的值              |
| 类型转换   | Type Conversion          | 将值从一种类型转换为另一种类型                |
| 类型推断   | Type Inference           | 根据上下文自动推断变量类型                    |
| typeof     | typeof                   | 返回值类型的运算符                            |

### P

| 术语         | 英文                    | 释义                                 |
| ------------ | ----------------------- | ------------------------------------ |
| 参数         | Parameter               | 函数定义时声明的变量                 |
| 形参         | Parameter               | 函数定义的输入                       |
| 形参默认值   | Parameter Default Value | 函数参数的默认值                     |
| 解析         | Parsing                 | 将文本分解为 Token 的过程            |
| 路径         | Path                    | 文件系统中的位置                     |
| 管道         | Pipe                    | 将函数输出作为下一个函数输入         |
| 提升         | Hoisting                | 声明被移到作用域顶部的行为           |
| 泊位脚本     | Blocking Script         | 阻止页面解析的脚本                   |
| polyfill     | Polyfill                | 为旧浏览器提供新 API 兼容的代码      |
| 优先级       | Precedence              | 运算符执行顺序                       |
| 私有字段     | Private Field           | 用 `#` 开头只能在类内部访问的字段    |
| 过程         | Procedure               | 执行特定任务的代码块                 |
| 原型         | Prototype               | 对象继承属性和方法的来源             |
| 原型链       | Prototype Chain         | 对象查找属性的链条                   |
| 代理对象     | Proxy Object            | 包装另一个对象，控制对其属性的访问   |
| 伪数组       | Pseudo-array            | 类似数组但不是真正的数组             |
| 发布订阅模式 | Pub/Sub                 | 观察者模式的一种，事件发布和订阅机制 |

### Q

| 术语       | 英文           | 释义                          |
| ---------- | -------------- | ----------------------------- |
| 查询选择器 | Query Selector | 通过 CSS 选择器获取元素的方法 |
| 限定名称   | Qualified Name | 带命名空间前缀的名称          |

### R

| 术语       | 英文               | 释义                             |
| ---------- | ------------------ | -------------------------------- |
| 可读流     | Readable Stream    | 逐步读取数据的数据流             |
| 只读属性   | Read-only Property | 无法修改的属性                   |
| 规约函数   | Reduce Function    | 将数组元素累积为单个值           |
| 引用       | Reference          | 指向值的内存地址                 |
| 引用计数   | Reference Counting | 跟踪对象被引用次数的垃圾回收策略 |
| 正则表达式 | Regular Expression | 描述文本模式的字符串             |
| 相关性     | Relevance          | 搜索结果与查询的匹配程度         |
| 剩余参数   | Rest Parameter     | 用 `...` 收集剩余参数            |
| 运行时     | Runtime            | 代码实际执行的阶段               |
| 运行时错误 | Runtime Error      | 代码执行时才发生的错误           |

### S

| 术语         | 英文                     | 释义                              |
| ------------ | ------------------------ | --------------------------------- |
| 沙箱         | Sandbox                  | 隔离的安全运行环境                |
| 作用域       | Scope                    | 变量可见的区域                    |
| 作用域链     | Scope Chain              | 从内到外查找变量的链条            |
| Script 标签  | Script Tag               | HTML 中引入 JavaScript 的标签     |
| 脚本加载策略 | Script Loading Strategy  | 正常、defer、async 加载方式       |
| 搜索路径     | Search Path              | 模块解析时查找文件的目录列表      |
| 种子         | Seed                     | 随机数生成器的初始值              |
| 自引用       | Self-reference           | 引用自身                          |
| 语义化       | Semantic                 | 表达清晰含义的                    |
| 序列化       | Serialization            | 将对象转换为可存储/传输格式       |
| 服务器       | Server                   | 提供服务的后端程序                |
| 服务器端     | Server-side              | 在服务器上执行的处理              |
| 服务工作者   | Service Worker           | 在后台运行的 Web Worker           |
| setter       | setter                   | 设置属性值的访问器方法            |
| 阴影         | Shadowing                | 内层变量遮蔽外层同名变量          |
| 简短求值     | Short-circuit Evaluation | 逻辑运算符在结果确定时停止计算    |
| 单线程       | Single-threaded          | 同一时刻只执行一个任务            |
| 源码         | Source Code              | 程序员编写的原始代码              |
| 源代码映射   | Source Map               | 将压缩代码映射回源码的文件        |
| 特殊方法     | Special Method           | 双下划线开头的方法，如 `__init__` |
| 栈           | Stack                    | 后进先出的数据结构                |
| 静态方法     | Static Method            | 类上而非实例上调用的方法          |
| 严格模式     | Strict Mode              | 使用更严格规则执行代码的模式      |
| 字符串       | String                   | 字符序列                          |
| 结构化克隆   | Structured Clone         | 复制对象和值的算法                |
| 子类         | Subclass                 | 继承其他类的类                    |
| 超级代理     | Superagent               | HTTP 请求库                       |
| super        | super                    | 访问父类属性和方法的关键字        |
| 可交换       | Swappable                | 可以替换实现                      |
| 符号         | Symbol                   | ES6 新增的原始类型，唯一标识符    |
| 语法错误     | Syntax Error             | 代码结构不符合语法规则            |
| 语法糖       | Syntactic Sugar          | 让代码更简洁的语法                |

### T

| 术语         | 英文            | 释义                             |
| ------------ | --------------- | -------------------------------- |
| Token        | Token           | 词法分析后的最小语法单元         |
| 追踪         | Trace           | 记录代码执行的日志               |
| 真值         | Truthy          | 在布尔上下文中被视为 `True` 的值 |
| Try 语句     | Try Statement   | 捕获异常的代码结构               |
| 类型数组     | Typed Array     | 处理二进制数据的数组类型         |
| 类型注解     | Type Annotation | 标注变量或函数期望的类型         |
| 类型强制转换 | Type Coercion   | 自动或手动转换值类型             |
| 类型错误     | Type Error      | 操作类型不匹配时发生的错误       |

### U

| 术语           | 英文                  | 释义                         |
| -------------- | --------------------- | ---------------------------- |
| Unicode        | Unicode               | 字符编码标准                 |
| 统一资源定位符 | URL                   | 资源的地址                   |
| 未捕获异常     | Uncaught Exception    | 没有被 try-catch 处理的异常  |
| 底层平台       | Underlying Platform   | JavaScript 运行的基础环境    |
| 不可枚举属性   | Unenumerable Property | 无法用 `for...in` 遍历的属性 |
| 唯一标识符     | Unique Identifier     | 唯一的值，用于标识对象       |
| 解包           | Unpacking             | 将数组或对象值提取到变量     |
| 解构           | Unstructured          | 非结构化的                   |
| 无符号整数     | Unsigned Integer      | 没有正负号的整数             |

### V

| 术语       | 英文                 | 释义                           |
| ---------- | -------------------- | ------------------------------ |
| 值         | Value                | 数据的内容                     |
| 值类型     | Value Type           | 传递时复制值的类型             |
| var        | var                  | ES5 的变量声明关键字           |
| 变量       | Variable             | 存储值的命名容器               |
| 变量声明   | Variable Declaration | 声明变量的语句                 |
| 变量提升   | Variable Hoisting    | var 声明被提升的行为           |
| 供应商前缀 | Vendor Prefix        | 浏览器厂商添加的实验性属性前缀 |
| 供应商特定 | Vendor-specific      | 特定浏览器实现                 |
| 虚拟 DOM   | Virtual DOM          | 内存中 DOM 的轻量级表示        |
| 可视化     | Visualization        | 将数据以图形方式展示           |

### W

| 术语       | 英文           | 释义                             |
| ---------- | -------------- | -------------------------------- |
| Web API    | Web API        | 浏览器提供的编程接口             |
| Web Worker | Web Worker     | 后台线程中运行脚本的机制         |
| while 循环 | while Loop     | 条件为真时重复执行的循环         |
| 通配符     | Wildcard       | 匹配任意字符的符号，如 `*`       |
| with 语句  | with Statement | 扩展作用域的语句（严格模式禁用） |
| Worker     | Worker         | 在独立线程运行的脚本             |

### X

| 术语           | 英文 | 释义                         |
| -------------- | ---- | ---------------------------- |
| XMLHttpRequest | XHR  | 浏览器中发起 HTTP 请求的 API |

### Y

| 术语  | 英文  | 释义                           |
| ----- | ----- | ------------------------------ |
| yield | yield | 在生成器函数中暂停执行并返回值 |

### Z

| 术语 | 英文       | 释义             |
| ---- | ---------- | ---------------- |
| 零值 | Zero Value | 类型的默认值或零 |

### stdlib 标准库术语

| 术语         | 英文         | 释义                                       |
| ------------ | ------------ | ------------------------------------------ |
| Array        | Array        | 有序元素集合，用 `[]` 创建                 |
| ArrayBuffer  | ArrayBuffer  | 存储原始二进制数据的对象                   |
| Boolean      | Boolean      | 布尔值 `true` 和 `false`                   |
| console      | console      | 控制台输出对象，提供 `log`、`error` 等方法 |
| DataView     | DataView     | 操作 ArrayBuffer 数据的视图                |
| Date         | Date         | 日期和时间对象                             |
| Error        | Error        | 错误对象，包含 message、name 等属性        |
| Fetch API    | Fetch        | 替代 XMLHttpRequest 的网络请求 API         |
| Float32Array | Float32Array | 32 位浮点数数组                            |
| Float64Array | Float64Array | 64 位浮点数数组                            |
| Function     | Function     | 函数对象                                   |
| globalThis   | globalThis   | 全局 `this` 的标准引用                     |
| Int8Array    | Int8Array    | 8 位有符号整数数组                         |
| Int16Array   | Int16Array   | 16 位有符号整数数组                        |
| Int32Array   | Int32Array   | 32 位有符号整数数组                        |
| JSON         | JSON         | JSON 序列化/反序列化对象                   |
| Map          | Map          | 键值对集合                                 |
| Math         | Math         | 数学常量和函数对象                         |
| Number       | Number       | 数值对象，提供 `MAX_VALUE`、`NaN` 等       |
| Object       | Object       | 基础对象类型                               |
| Promise      | Promise      | 异步操作最终结果的对象                     |
| Proxy        | Proxy        | 对象访问代理                               |
| Reflect      | Reflect      | 操作对象元编程的 API                       |
| RegExp       | RegExp       | 正则表达式对象                             |
| Set          | Set          | 不重复值的集合                             |
| String       | String       | 字符串对象                                 |
| Symbol       | Symbol       | 唯一标识符类型                             |
| TypedArray   | TypedArray   | 二进制数据数组类型统称                     |
| Uint8Array   | Uint8Array   | 8 位无符号整数数组                         |
| Uint16Array  | Uint16Array  | 16 位无符号整数数组                        |
| Uint32Array  | Uint32Array  | 32 位无符号整数数组                        |
| URL          | URL          | URL 处理对象                               |
| WeakMap      | WeakMap      | 键为对象的弱引用 Map                       |
| WeakSet      | WeakSet      | 对象的弱引用 Set                           |

### advanced 高级进阶术语

| 术语                | 英文                    | 释义                                 |
| ------------------- | ----------------------- | ------------------------------------ |
| 异步生成器          | Async Generator         | 包含 `await` 和 `yield` 的异步函数   |
| 异步函数            | Async Function          | 返回 Promise 的函数，用 `async` 定义 |
| 异步迭代器          | Async Iterator          | 实现异步迭代协议的对象               |
| await               | await                   | 等待 Promise 解决的运算符            |
| 平衡树              | Balanced Tree           | 自动调整保持平衡的树结构             |
| 绑定                | Binding                 | 将标识符关联到特定值                 |
| 位运算符            | Bitwise Operator        | `&`、`\|`、`^`、`~`、`<<`、`>>`      |
| 位字段              | Bit Field               | 用单个数值存储多个布尔标志           |
| 位掩码              | Bitmask                 | 用位运算操作标志组合                 |
| 缓冲区              | Buffer                  | 临时存储数据的内存区域               |
| 回调地狱            | Callback Hell           | 过多嵌套回调导致的难以维护的代码     |
| 组合子              | Combinator              | 组合多个函数的函数                   |
| 尾调用优化          | Tail Call Optimization  | 优化递归调用避免栈增长               |
| 代码覆盖率          | Code Coverage           | 测试覆盖代码的比例                   |
| 代码点              | Code Point              | Unicode 字符的唯一数值               |
| 组合                | Combination             | 从集合中选出一部分的所有方式         |
| 组合函数            | Composition             | 将多个函数组合成新函数               |
| 计算属性名          | Computed Property Name  | 用表达式计算属性名                   |
| 约束                | Constraint              | 限制条件的规则                       |
| 上下文管理器        | Context Manager         | 管理资源的对象，用 `with` 使用       |
| 协程                | Coroutine               | 可暂停和恢复执行的函数               |
| 跨域资源共享        | CORS                    | 允许跨域请求的机制                   |
| 覆盖率              | Coverage                | 测试覆盖代码的比例                   |
| 守护程序            | Daemon                  | 后台运行的程序                       |
| 数据属性            | Data Property           | 存储值的普通属性                     |
| 声明提升            | Declaration Hoisting    | 声明被提升到作用域顶部               |
| 解码                | Decoding                | 将编码数据还原为原始形式             |
| 延迟初始化          | Deferred Initialization | 首次使用时才初始化                   |
| 依赖注入            | Dependency Injection    | 将依赖作为参数传入的模式             |
| 依赖图              | Dependency Graph        | 模块间依赖关系的图结构               |
| 派生类              | Derived Class           | 继承父类的子类                       |
| 解构绑定            | Destructuring Binding   | 解构赋值时创建的变量绑定             |
| 检测                | Detection               | 检测特性是否可用的方法               |
| 直接量              | Directives              | 传递给解释器的指令字符串             |
| 派发                | Dispatch                | 根据类型选择处理方法                 |
| 文档碎片            | Document Fragment       | 内存中的 DOM 节点集合                |
| DOM 事件            | DOM Event               | 文档或窗口发生的动作通知             |
| 领域特定语言        | DSL                     | 特定领域的问题求解语言               |
| 动态作用域          | Dynamic Scope           | 根据调用链确定作用域                 |
| 动态类型检查        | Dynamic Type Checking   | 运行时检查类型                       |
| ECMAScript 国际标准 | ECMA-262                | ECMAScript 规范正式名称              |
| 编码                | Encoding                | 将数据转换为特定格式                 |
| 端点                | Endpoint                | API 的访问地址                       |
| 环境变量            | Environment Variable    | 操作系统中的配置变量                 |
| 错误边界            | Error Boundary          | 捕获子组件错误的 React 概念          |
| 错误处理            | Error Handling          | 捕获和处理异常                       |
| eval 代码           | eval Code               | 通过 eval 执行的代码                 |
| 事件冒泡            | Event Bubbling          | 事件从子元素向上传播到父元素         |
| 事件委托            | Event Delegation        | 在父元素上处理子元素事件             |
| 事件监听器          | Event Listener          | 响应事件的处理函数                   |
| 事件处理器          | Event Handler           | 处理事件的函数                       |
| 事件循环            | Event Loop              | 处理事件和回调的机制                 |
| 事件传播            | Event Propagation       | 事件在 DOM 树中传播的过程            |
| 事件队列            | Event Queue             | 待处理事件的队列                     |
| 异常                | Exception               | 导致程序中断的错误                   |
| 异常传播            | Exception Propagation   | 异常向外层传播的过程                 |
| 执行上下文          | Execution Context       | 代码运行环境                         |
| 显式多态            | Explicit Polymorphism   | 手动实现的多态                       |
| 表达式闭包          | Expression Closure      | 省略 `return` 的函数简写             |
| 扩展                | Extension               | 浏览器增强功能                       |
| 外部函数接口        | FFI                     | JavaScript 调用其他语言函数          |
| 字段                | Field                   | 对象或类的数据成员                   |
| 文件上传            | File Upload             | 上传文件到服务器                     |
| filter 回调         | filter Callback         | 筛选数组元素的函数                   |
| find 回调           | find Callback           | 查找数组元素的函数                   |
| first-class         | First-class             | 可作为参数传递                       |
| 第一类公民          | First-class Citizen     | 可像变量一样使用                     |
| 固定小数            | Fixed-point             | 小数位数固定的数字                   |
| 扁平化              | Flatten                 | 将嵌套结构转为单层                   |
| 流控制              | Flow Control            | 控制代码执行顺序                     |
| forEach 回调        | forEach Callback        | 遍历数组的函数                       |
| 前端框架            | Frontend Framework      | 构建 UI 的框架                       |
| 函数绑定            | Function Binding        | 将函数绑定到特定 `this`              |
| 函数组合            | Function Composition    | 组合多个函数                         |
| 函数式编程          | Functional Programming  | 以函数为核心的编程范式               |
| 生成器              | Generator               | 可暂停的函数，用 `yield` 返回值      |
| 生成器函数          | Generator Function      | 返回生成器的函数                     |
| Getter              | Getter                  | 读取属性的方法                       |
| 全局对象            | Global Object           | 全局可用的对象                       |
| 握手                | Handshake               | 建立连接的过程                       |
| 硬编码              | Hard-coded              | 直接写入代码的值                     |
| 哈希                | Hash                    | 数据的数字指纹                       |
| 哈希冲突            | Hash Collision          | 不同数据有相同哈希值                 |
| 头等函数            | First-class Function    | 可作为值传递的函数                   |
| 提升                | Hoisting                | 声明移到作用域顶部                   |
| 超类                | Hyperclass              | 元类的实例                           |
| 超类                | Superclass              | 被继承的父类                         |
| 幂等                | Idempotent              | 多次执行结果相同                     |
| 标识符名称          | Identifier Name         | 标识符的文本                         |
| 隐式类型转换        | Implicit Type Coercion  | 自动进行的类型转换                   |
| 导入映射            | Import Map              | 映射模块名称到 URL                   |
| 增量更新            | Incremental Update      | 只更新变化部分                       |
| 索引签名            | Index Signature         | 动态属性名的类型定义                 |
| 信息隐藏            | Information Hiding      | 隐藏实现细节                         |
| 继承                | Inheritance             | 从父类获取属性和方法                 |
| 实例化              | Instantiation           | 创建类的实例                         |
| 中间件              | Middleware              | 处理请求/响应的中间层                |
| 内部函数            | Inner Function          | 在函数内部定义的函数                 |
| 内部属性            | Internal Property       | 无法从外部访问的属性                 |
| 解释器              | Interpreter             | 逐行执行代码的程序                   |
| 调用                | Invocation              | 执行函数                             |
| 迭代器协议          | Iterator Protocol       | 定义如何遍历对象                     |
| JAMstack            | JAMstack                | JavaScript、API、Markup 架构         |
| JITs                | JIT Compilers           | 即时编译器                           |
| Join                | Join                    | 连接多个数据源                       |
| JSONP               | JSONP                   | 跨域数据获取技术                     |
| KISS 原则           | KISS                    | Keep It Simple, Stupid，保持简单     |
| 键盘事件            | Keyboard Event          | 键盘输入事件                         |
| 关键词              | Keyword                 | 保留的特殊单词                       |
| 标签模板            | Tagged Template         | 带函数的模板字符串                   |
| 尾调用              | Tail Call               | 函数末尾的函数调用                   |
| 方法重写            | Method Overriding       | 子类重新定义父类方法                 |
| 混入                | Mixin                   | 提供方法组合的类                     |
| 模块模式            | Module Pattern          | 用闭包实现私有成员                   |
| 多分派              | Multiple Dispatch       | 根据参数类型选择方法                 |
| 多态                | Polymorphism            | 同一接口不同实现                     |
| 名称修饰            | Name Mangling           | 编译器修改内部名称                   |
| 命名空间            | Namespace               | 组织标识符的容器                     |
| 本地代理            | Native Proxy            | 直接代理原生对象                     |
| 导航                | Navigation              | 页面间的跳转                         |
| 嵌套函数            | Nested Function         | 在函数内部定义的函数                 |
| 网络请求            | Network Request         | HTTP 请求                            |
| 非阻塞 I/O          | Non-blocking I/O        | 不等待 I/O 完成                      |
| null                | null                    | 表示无值                             |
| 数字分隔符          | Numeric Separator       | `_` 分隔大数字                       |
| 对象冻结            | Object Freeze           | 防止对象修改                         |
| 对象初始化器        | Object Initializer      | 创建对象的语法                       |
| 对象键控            | Object Keying           | 用对象作为键                         |
| 对象映射            | Object Map              | 用对象存储键值对                     |
| 观察者模式          | Observer Pattern        | 订阅-发布模式                        |
| 一次性事件          | One-time Event          | 只触发一次的事件                     |
| 开放封闭原则        | Open-closed Principle   | 对扩展开放，对修改封闭               |
| 运算符              | Operator                | 执行操作的符号                       |
| 运算符优先级        | Operator Precedence     | 运算顺序                             |
| 可选参数            | Optional Argument       | 可以省略的参数                       |
| 原始类型            | Primitive Type          | 基础数据类型                         |
| 私有成员            | Private Member          | 类内部才能访问的成员                 |
| 生产者消费者        | Producer-consumer       | 生产和消费数据的模式                 |
| 属性描述符          | Property Descriptor     | 定义属性行为                         |
| 属性链              | Property Chain          | 访问嵌套属性                         |
| 原型继承            | Prototypal Inheritance  | 基于原型的继承                       |
| 原型链              | Prototype Chain         | 原型对象组成的链                     |
| 伪协议              | Pseudo-protocol         | 自定义的 URL 协议                    |
| 纯函数              | Pure Function           | 无副作用、引用透明的函数             |
| 限定                | Qualification           | 限制作用域                           |
| 限定名称            | Qualified Name          | 带前缀的名称                         |
| 队列                | Queue                   | 先进先出的数据结构                   |
| 随机访问            | Random Access           | 直接访问任意位置                     |
| Range               | Range                   | 文本选择范围                         |
| 读取属性            | Read Property           | 获取属性值                           |
| 可读流              | Readable Stream         | 可读取的数据流                       |
| 重新导出            | Re-export               | 导出导入的内容                       |
| 引用                | Reference               | 指向值的标识                         |
| 引用类型            | Reference Type          | 通过引用访问的类型                   |
| 正则表达式          | Regular Expression      | 文本模式匹配                         |
| 关系运算符          | Relational Operator     | 比较大小                             |
| 渲染                | Rendering               | 生成可视化输出                       |
| 渲染引擎            | Rendering Engine        | 解析 HTML/CSS 的引擎                 |
| 可重入              | Reentrancy              | 可在执行中重新进入                   |
| 注册处理器          | Registered Handler      | 注册的事件处理函数                   |
| 正则表达式标志      | Regex Flags             | 如 `g`、`i`、`m`                     |
| 相关事件            | Related Event           | 与另一事件相关的补充事件             |
| 剩余参数            | Rest Parameter          | 收集剩余参数                         |
| 结果缓存            | Result Caching          | 缓存计算结果                         |
| 运行时              | Runtime                 | 代码执行的环境                       |
| 运行时类型          | Runtime Type            | 实际类型                             |
| 沙箱                | Sandbox                 | 隔离环境                             |
| 方案                | Schema                  | 数据结构定义                         |
| 作用域决议          | Scope Resolution        | 查找变量的过程                       |
| 作用域安全          | Scope Safety            | 正确的作用域使用                     |
| 脚本类型            | Script Type             | `<script>` 的类型                    |
| 种子                | Seed                    | 随机数初始值                         |
| 选择器              | Selector                | CSS 选择器                           |
| 自引用              | Self-reference          | 引用自身                             |
| 语义化版本          | Semantic Versioning     | `主.次.补丁` 版本号                  |
| 串行化              | Serialization           | 对象转字符串                         |
| 服务器渲染          | Server-side Rendering   | 在服务器生成 HTML                    |
| 服务工作者          | Service Worker          | 后台网络代理                         |
| Setter              | Setter                  | 设置属性的方法                       |
| 阴影 DOM            | Shadow DOM              | 封装的 DOM 树                        |
| 阴影属性            | Shadow Property         | 遮蔽父类属性                         |
| 壳                  | Shell                   | 命令行界面                           |
| 简短求值            | Short-circuit           | 逻辑运算的优化                       |
| 单例                | Singleton               | 只有一个实例                         |
| 单线程              | Single-threaded         | 一次执行一个任务                     |
| 源代码              | Source Code             | 原始代码                             |
| 源映射              | Source Map              | 源码映射                             |
| 特定平台            | Platform-specific       | 特定平台实现                         |
| 拆分                | Splitting               | 代码分割                             |
| 稳定排序            | Stable Sort             | 相等元素保持原顺序                   |
| 栈帧                | Stack Frame             | 函数调用的记录                       |
| 状态机              | State Machine           | 状态转换模型                         |
| 静态成员            | Static Member           | 类上而非实例上的成员                 |
| 静态作用域          | Static Scope            | 编译时确定的作用域                   |
| STOR                | Storage                 | 存储                                 |
| 流                  | Stream                  | 数据流                               |
| 字符串化            | Stringification         | 转字符串                             |
| 强类型              | Strongly Typed          | 严格类型检查                         |
| 结构化克隆          | Structured Clone        | 复制嵌套结构                         |
| 样式表              | Stylesheet              | CSS 样式定义                         |
| 下标                | Subscript               | 用 `[]` 访问                         |
| 替代语法            | Substitute Syntax       | 另一种写法                           |
| 超文本              | Supetext                | 上标文字                             |
| 合成事件            | Synthetic Event         | React 包装的事件                     |
| 系统命令            | System Command          | 操作系统命令                         |
| 表单数据            | FormData                | 表单数据对象                         |
| 标签函数            | Tagged Function         | 处理模板字符串的函数                 |
| Tap                 | Tap                     | 调试用的副作用函数                   |
| 目标对象            | Target Object           | 被代理的对象                         |
| 任务队列            | Task Queue              | 待执行的异步任务                     |
| 技术报告            | Technical Report        | 技术文档                             |
| 模板                | Template                | 生成内容的框架                       |
| 模板字符串          | Template String         | 带插值的字符串                       |
| 测试框架            | Test Framework          | 测试工具集合                         |
| 测试运行器          | Test Runner             | 执行测试的程序                       |
| 文本节点            | Text Node               | 包含文本的 DOM 节点                  |
| this 绑定           | this Binding            | 确定 `this` 值                       |
| Throw               | Throw                   | 抛出异常                             |
| 时间戳              | Timestamp               | 日期时间值                           |
| Token               | Token                   | 词法单元                             |
| 追踪                | Trace                   | 执行路径跟踪                         |
| 事务                | Transaction             | 一组原子操作                         |
| 转换                | Transform               | 改变数据格式                         |
| 触发器              | Trigger                 | 触发条件的规则                       |
| 真值                | Truthy                  | 布尔真值                             |
| 类型数组            | Typed Array             | 二进制数组                           |
| 类型强制            | Type Coercion           | 类型转换                             |
| 类型检查            | Type Checking           | 验证类型                             |
| 类型定义            | Type Definition         | 类型声明                             |
| 类型推断            | Type Inference          | 自动推断类型                         |
| 类型运算符          | Type Operator           | typeof 等运算符                      |
| Unicode 转义        | Unicode Escape          | Unicode 字符表示                     |
| 统一码              | Unicode                 | 字符编码标准                         |
| 唯一键              | Unique Key              | 唯一标识                             |
| 单例模式            | Singleton Pattern       | 只产生一个实例                       |
| 未知类型            | Unknown Type            | 未知的数据类型                       |
| 解链                | Unlink                  | 移除引用                             |
| 解包                | Unpacking               | 展开数组或对象                       |
| 非限定名称          | Unqualified Name        | 无前缀的名称                         |
| 非限制函数          | Unrestricted Function   | 无 `this` 绑定的函数                 |
| 无符号整数          | Unsigned Integer        | 正整数                               |
| 顶层作用域          | Top-level Scope         | 最外层作用域                         |
| 变换                | Transition              | 状态平滑过渡                         |
| 树摇                | Tree Shaking            | 删除未用代码                         |
| 真值表              | Truth Table             | 逻辑运算结果表                       |
| 类型化语言          | Typed Language          | 有类型检查的语言                     |
| 统一资源定位符      | URL                     | 资源地址                             |
| URL 编码            | URL Encoding            | 转义 URL 特殊字符                    |
| 用户代理            | User Agent              | 浏览器标识字符串                     |
| 用户交互事件        | User Interaction Event  | 用户操作触发的事件                   |
| 验证                | Validation              | 验证数据有效性                       |
| 值域                | Value Domain            | 可能的取值范围                       |
| 变量声明符          | Variable Declarator     | 声明变量的语法                       |
| 可视化              | Visualization           | 数据可视化                           |
| 等待队列            | Wait Queue              | 等待资源的队列                       |
| Web API             | Web API                 | 浏览器编程接口                       |
| Web 组件            | Web Component           | 可复用自定义元素                     |
| while 循环          | while Loop              | 条件循环                             |
| Worker              | Worker                  | 后台线程                             |
| 工作池              | Work Pool               | 任务队列                             |
| 写入属性            | Write Property          | 设置属性值                           |
| XMLHttpRequest      | XHR                     | 浏览器请求 API                       |
| yield               | yield                   | 暂停生成器                           |

---

## 名词列表

### stdlib 标准库术语

| 术语         | 英文         | 释义                                       |
| ------------ | ------------ | ------------------------------------------ |
| Array        | Array        | 有序元素集合，用 `[]` 创建                 |
| ArrayBuffer  | ArrayBuffer  | 存储原始二进制数据的对象                   |
| Boolean      | Boolean      | 布尔值 `true` 和 `false`                   |
| console      | console      | 控制台输出对象，提供 `log`、`error` 等方法 |
| DataView     | DataView     | 操作 ArrayBuffer 数据的视图                |
| Date         | Date         | 日期和时间对象                             |
| Error        | Error        | 错误对象，包含 message、name 等属性        |
| Fetch API    | Fetch        | 替代 XMLHttpRequest 的网络请求 API         |
| Float32Array | Float32Array | 32 位浮点数数组                            |
| Float64Array | Float64Array | 64 位浮点数数组                            |
| Function     | Function     | 函数对象                                   |
| globalThis   | globalThis   | 全局 `this` 的标准引用                     |
| Int8Array    | Int8Array    | 8 位有符号整数数组                         |
| Int16Array   | Int16Array   | 16 位有符号整数数组                        |
| Int32Array   | Int32Array   | 32 位有符号整数数组                        |
| JSON         | JSON         | JSON 序列化/反序列化对象                   |
| Map          | Map          | 键值对集合                                 |
| Math         | Math         | 数学常量和函数对象                         |
| Number       | Number       | 数值对象，提供 `MAX_VALUE`、`NaN` 等       |
| Object       | Object       | 基础对象类型                               |
| Promise      | Promise      | 异步操作最终结果的对象                     |
| Proxy        | Proxy        | 对象访问代理                               |
| Reflect      | Reflect      | 操作对象元编程的 API                       |
| RegExp       | RegExp       | 正则表达式对象                             |
| Set          | Set          | 不重复值的集合                             |
| String       | String       | 字符串对象                                 |
| Symbol       | Symbol       | 唯一标识符类型                             |
| TypedArray   | TypedArray   | 二进制数据数组类型统称                     |
| Uint8Array   | Uint8Array   | 8 位无符号整数数组                         |
| Uint16Array  | Uint16Array  | 16 位无符号整数数组                        |
| Uint32Array  | Uint32Array  | 32 位无符号整数数组                        |
| URL          | URL          | URL 处理对象                               |
| WeakMap      | WeakMap      | 键为对象的弱引用 Map                       |
| WeakSet      | WeakSet      | 对象的弱引用 Set                           |

### advanced 高级进阶术语

| 术语            | 英文                   | 释义                                 |
| --------------- | ---------------------- | ------------------------------------ |
| Async Generator | 异步生成器             | 包含 `await` 和 `yield` 的异步函数   |
| Async Function  | 异步函数               | 返回 Promise 的函数，用 `async` 定义 |
| Async Iterator  | 异步迭代器             | 实现异步迭代协议的对象               |
| await           | await                  | 等待 Promise 解决的运算符            |
| 平衡树          | Balanced Tree          | 自动调整保持平衡的树结构             |
| 位运算符        | Bitwise Operator       | `&`、`\|`、`^`、`~`、`<<`、`>>`      |
| 位字段          | Bit Field              | 用单个数值存储多个布尔标志           |
| 位掩码          | Bitmask                | 用位运算操作标志组合                 |
| 缓冲区          | Buffer                 | 临时存储数据的内存区域               |
| 回调地狱        | Callback Hell          | 过多嵌套回调导致的难以维护的代码     |
| 组合子          | Combinator             | 组合多个函数的函数                   |
| 尾调用优化      | Tail Call Optimization | 优化递归调用避免栈增长               |
| 代码覆盖率      | Code Coverage          | 测试覆盖代码的比例                   |
| 代码点          | Code Point             | Unicode 字符的唯一数值               |
| 组合            | Combination            | 从集合中选出一部分的所有方式         |
| 组合函数        | Composition            | 将多个函数组合成新函数               |
| 计算属性名      | Computed Property Name | 用表达式计算属性名                   |
| 协程            | Coroutine              | 可暂停和恢复执行的函数               |
| 跨域资源共享    | CORS                   | 允许跨域请求的机制                   |
| 守护程序        | Daemon                 | 后台运行的程序                       |
| 数据属性        | Data Property          | 存储值的普通属性                     |
| 解码            | Decoding               | 将编码数据还原为原始形式             |
| 依赖注入        | Dependency Injection   | 将依赖作为参数传入的模式             |
| 派生类          | Derived Class          | 继承父类的子类                       |
| 领域特定语言    | DSL                    | 特定领域的问题求解语言               |
| 动态作用域      | Dynamic Scope          | 根据调用链确定作用域                 |
| 端点            | Endpoint               | API 的访问地址                       |
| 错误边界        | Error Boundary         | 捕获子组件错误的 React 概念          |
| 事件冒泡        | Event Bubbling         | 事件从子元素向上传播到父元素         |
| 事件委托        | Event Delegation       | 在父元素上处理子元素事件             |
| 异常传播        | Exception Propagation  | 异常向外层传播的过程                 |
| 显式多态        | Explicit Polymorphism  | 手动实现的多态                       |
| 外部函数接口    | FFI                    | JavaScript 调用其他语言函数          |
| 文件上传        | File Upload            | 上传文件到服务器                     |
| 扁平化          | Flatten                | 将嵌套结构转为单层                   |
| 生成器          | Generator              | 可暂停的函数，用 `yield` 返回值      |
| 握手            | Handshake              | 建立连接的过程                       |
| 硬编码          | Hard-coded             | 直接写入代码的值                     |
| 哈希            | Hash                   | 数据的数字指纹                       |
| 超类            | Hyperclass             | 元类的实例                           |
| 超类            | Superclass             | 被继承的父类                         |
| 幂等            | Idempotent             | 多次执行结果相同                     |
| 隐式类型转换    | Implicit Type Coercion | 自动进行的类型转换                   |
| 导入映射        | Import Map             | 映射模块名称到 URL                   |
| 增量更新        | Incremental Update     | 只更新变化部分                       |
| 索引签名        | Index Signature        | 动态属性名的类型定义                 |
| 信息隐藏        | Information Hiding     | 隐藏实现细节                         |
| 继承            | Inheritance            | 从父类获取属性和方法                 |
| 中间件          | Middleware             | 处理请求/响应的中间层                |
| 内部函数        | Inner Function         | 在函数内部定义的函数                 |
| 内部属性        | Internal Property      | 无法从外部访问的属性                 |
| JAMstack        | JAMstack               | JavaScript、API、Markup 架构         |
| JITs            | JIT Compilers          | 即时编译器                           |
| JSONP           | JSONP                  | 跨域数据获取技术                     |
| KISS 原则       | KISS                   | Keep It Simple, Stupid，保持简单     |
| 标签模板        | Tagged Template        | 带函数的模板字符串                   |
| 尾调用          | Tail Call              | 函数末尾的函数调用                   |
| 方法重写        | Method Overriding      | 子类重新定义父类方法                 |
| 混入            | Mixin                  | 提供方法组合的类                     |
| 多分派          | Multiple Dispatch      | 根据参数类型选择方法                 |
| 多态            | Polymorphism           | 同一接口不同实现                     |
| 名称修饰        | Name Mangling          | 编译器修改内部名称                   |
| 本地代理        | Native Proxy           | 直接代理原生对象                     |
| 导航            | Navigation             | 页面间的跳转                         |
| 嵌套函数        | Nested Function        | 在函数内部定义的函数                 |
| 网络请求        | Network Request        | HTTP 请求                            |
| 非阻塞 I/O      | Non-blocking I/O       | 不等待 I/O 完成                      |
| 对象冻结        | Object Freeze          | 防止对象修改                         |
| 观察者模式      | Observer Pattern       | 订阅-发布模式                        |
| 一次性事件      | One-time Event         | 只触发一次的事件                     |
| 开放封闭原则    | Open-closed Principle  | 对扩展开放，对修改封闭               |
| 原始类型        | Primitive Type         | 基础数据类型                         |
| 私有成员        | Private Member         | 类内部才能访问的成员                 |
| 属性描述符      | Property Descriptor    | 定义属性行为                         |
| 原型继承        | Prototypal Inheritance | 基于原型的继承                       |
| 纯函数          | Pure Function          | 无副作用、引用透明的函数             |
| 队列            | Queue                  | 先进先出的数据结构                   |
| 随机访问        | Random Access          | 直接访问任意位置                     |
| 可读流          | Readable Stream        | 可读取的数据流                       |
| 引用类型        | Reference Type         | 通过引用访问的类型                   |
| 稳定排序        | Stable Sort            | 相等元素保持原顺序                   |
| 栈帧            | Stack Frame            | 函数调用的记录                       |
| 状态机          | State Machine          | 状态转换模型                         |
| 静态作用域      | Static Scope           | 编译时确定的作用域                   |
| 流              | Stream                 | 数据流                               |
| 强类型          | Strongly Typed         | 严格类型检查                         |
| 结构化克隆      | Structured Clone       | 复制嵌套结构                         |
| 阴影 DOM        | Shadow DOM             | 封装的 DOM 树                        |
| 合成事件        | Synthetic Event        | React 包装的事件                     |
| 系统命令        | System Command         | 操作系统命令                         |
| 标签函数        | Tagged Function        | 处理模板字符串的函数                 |
| 目标对象        | Target Object          | 被代理的对象                         |
| 任务队列        | Task Queue             | 待执行的异步任务                     |
| 模板字符串      | Template String        | 带插值的字符串                       |
| 测试框架        | Test Framework         | 测试工具集合                         |
| 测试运行器      | Test Runner            | 执行测试的程序                       |
| this 绑定       | this Binding           | 确定 `this` 值                       |
| 时间戳          | Timestamp              | 日期时间值                           |
| 追踪            | Trace                  | 执行路径跟踪                         |
| 事务            | Transaction            | 一组原子操作                         |
| 变换            | Transform              | 改变数据格式                         |
| 树摇            | Tree Shaking           | 删除未用代码                         |
| 真值表          | Truth Table            | 逻辑运算结果表                       |
| 类型化语言      | Typed Language         | 有类型检查的语言                     |
| 唯一键          | Unique Key             | 唯一标识                             |
| 解包            | Unpacking              | 展开数组或对象                       |
| 等待队列        | Wait Queue             | 等待资源的队列                       |
| Web 组件        | Web Component          | 可复用自定义元素                     |
| Worker          | Worker                 | 后台线程                             |
| 工作池          | Work Pool              | 任务队列                             |
| yield           | yield                  | 暂停生成器                           |
