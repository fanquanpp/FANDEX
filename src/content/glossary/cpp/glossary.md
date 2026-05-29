---
title: 'C++ 专有名词查阅表'
module: 'cpp'
category: 'cpp'
description: 'C++ 专有名词注释查阅表，涵盖面向对象、模板、STL 等'
author: 'fanquanpp'
updated: '2026-05-29'
---

## 名词列表

### core 核心基础术语

| 术语          | 英文                      | 释义                                    |
| ------------- | ------------------------- | --------------------------------------- |
| 抽象类        | Abstract Class            | 包含纯虚函数的类，不能直接实例化        |
| 抽象数据类型  | ADT                       | 只通过接口访问的实现类型                |
| 访问控制      | Access Control            | public、private、protected 控制成员访问 |
| 访问说明符    | Access Specifier          | public、private、protected 关键字       |
| 聚合          | Aggregate                 | 数组或无构造函数的结构体                |
| 别名声明      | Alias Declaration         | 用 `using` 创建类型别名                 |
| 匿名联合      | Anonymous Union           | 无名的联合体                            |
| 申请-获取语义 | Acquire-release Semantics | 内存同步操作语义                        |
| 参数包        | Argument Pack             | 可变参数模板的参数集合                  |
| 算术类型      | Arithmetic Type           | 整数和浮点类型                          |
| 数组          | Array                     | 固定大小同类型元素序列                  |
| 断言          | Assertion                 | 验证条件的调试工具                      |
| 赋值运算符    | Assignment Operator       | `=` 重载实现赋值                        |
| 自动类型推导  | Auto Type Deduction       | 用 `auto` 自动推断类型                  |

### B

| 术语         | 英文                 | 释义                       |
| ------------ | -------------------- | -------------------------- |
| 后置返回类型 | Trailing Return Type | 函数签名末尾的返回类型     |
| 基础类       | Base Class           | 被继承的类                 |
| 二进制兼容性 | Binary Compatibility | 不同版本间的二进制可替换性 |
| 位域         | Bit Field            | 结构体中指定位数的成员     |
| 位运算       | Bitwise Operation    | 对二进制位操作             |
| bool         | bool                 | 布尔类型，true 或 false    |
| 边界检查     | Bounds Checking      | 检查数组下标是否越界       |
| 缓冲区       | Buffer               | 临时存储数据的内存区域     |
| 内建类型     | Built-in Type        | 语言内置的基本类型         |
| 字节         | Byte                 | 8 位组成的数据单位         |

### C

| 术语         | 英文                     | 释义                           |
| ------------ | ------------------------ | ------------------------------ |
| 转换构造函数 | Converting Constructor   | 可用于隐式转换的单参数构造函数 |
| 转换函数     | Conversion Function      | `operator Type()` 定义类型转换 |
| 调用约定     | Calling Convention       | 函数调用参数传递规则           |
| 捕获列表     | Capture List             | lambda 表达式捕获的变量        |
| 类           | Class                    | 定义对象的结构和行为           |
| 类模板       | Class Template           | 参数化的类定义                 |
| 闭包         | Closure                  | lambda 表达式及其捕获的环境    |
| 代码块       | Code Block               | 用 `{}` 包裹的语句组           |
| 注释         | Comment                  | 被编译器忽略的说明文本         |
| 编译         | Compilation              | 将源代码转换为目标代码         |
| 编译期计算   | Compile-time Computation | 编译时执行的计算               |
| 常量表达式   | Constant Expression      | 编译时可求值的表达式           |
| const        | const                    | 不可修改的修饰符               |
| consteval    | consteval                | 强制编译期求值的说明符         |
| constexpr    | constexpr                | 编译期常量的说明符             |
| const_cast   | const_cast               | 移除 const 限定符              |
| 构造函数     | Constructor              | 初始化对象的成员函数           |
| 契约         | Contract                 | 函数的输入输出条件             |
| 控制流       | Control Flow             | 程序执行顺序控制               |
| 协程         | Coroutine                | 可暂停和恢复的函数             |
| CRTP         | CRTP                     | 奇异递归模板模式               |
| 切片         | Slicing                  | 赋值时丢失派生类部分           |

### D

| 术语             | 英文                       | 释义                         |
| ---------------- | -------------------------- | ---------------------------- |
| 数据抽象         | Data Abstraction           | 隐藏实现细节只暴露接口       |
| 数据成员         | Data Member                | 类中的变量                   |
| 数据类型         | Data Type                  | 值的种类和可执行的操作       |
| 调试             | Debugging                  | 查找和修复程序错误           |
| 声明             | Declaration                | 引入名称                     |
| 默认参数         | Default Argument           | 未提供时使用的参数值         |
| 默认构造函数     | Default Constructor        | 无参或全缺省的构造函数       |
| 默认成员初始化器 | Default Member Initializer | 成员声明时的默认值           |
| 定义             | Definition                 | 创建实体                     |
| 删除的函数       | Deleted Function           | 用 `= delete` 禁用函数       |
| 委托构造函数     | Delegating Constructor     | 在构造函数中调用另一构造函数 |
| 解引用           | Dereference                | 通过指针或迭代器访问元素     |
| 派生类           | Derived Class              | 继承其他类的类               |
| 析构函数         | Destructor                 | 对象销毁前调用的清理函数     |
| 解构             | Deconstruction             | 分解聚合为各个部分           |
| 双重分发         | Double Dispatch            | 根据两个对象类型选择方法     |
| 动态内存         | Dynamic Memory             | 程序运行时分配的内存         |
| 动态类型         | Dynamic Type               | 运行时确定的对象类型         |

### E

| 术语       | 英文                    | 释义                     |
| ---------- | ----------------------- | ------------------------ |
| 异常       | Exception               | 程序执行中的错误情况     |
| 异常规范   | Exception Specification | 函数可能抛出异常的声明   |
| noexcept   | noexcept                | 声明函数不抛异常的说明符 |
| explicit   | explicit                | 禁止隐式转换的构造函数   |
| 表达式     | Expression              | 求值产生结果的代码       |
| 表达式模板 | Expression Template     | 延迟计算表达式的数据结构 |
| 扩展       | Extension               | 添加的功能               |

### F

| 术语     | 英文                 | 释义                        |
| -------- | -------------------- | --------------------------- |
| 友元     | Friend               | 授权访问 private 成员的机制 |
| 函数     | Function             | 完成特定任务的代码块        |
| 函数对象 | Function Object      | 重载 `operator()` 的类实例  |
| 函数重载 | Function Overloading | 同名不同参数的多个函数      |
| 函数模板 | Function Template    | 参数化的函数定义            |

### G

| 术语     | 英文                | 释义                 |
| -------- | ------------------- | -------------------- |
| 泛型编程 | Generic Programming | 编写与类型无关的代码 |
| 预演     | Dry Run             | 预演检查而不执行     |
| goto     | goto                | 无条件跳转语句       |

### H

| 术语     | 英文          | 释义                           |
| -------- | ------------- | ------------------------------ |
| 哈希函数 | Hash Function | 将数据映射到哈希值             |
| 头文件   | Header File   | 包含声明的 `.h` 或 `.hpp` 文件 |
| 层次结构 | Hierarchy     | 类的继承层次                   |

### I

| 术语         | 英文               | 释义                     |
| ------------ | ------------------ | ------------------------ |
| if constexpr | if constexpr       | 编译期条件分支           |
| 包含指令     | Include Directive  | `#include` 预处理器指令  |
| 增量运算符   | Increment Operator | `++`                     |
| 索引         | Index              | 容器中元素的位置         |
| 继承         | Inheritance        | 从基类获取成员           |
| 初始化列表   | Initializer List   | 用大括号初始化           |
| 内联         | Inline             | 建议编译器内联展开       |
| 内联命名空间 | Inline Namespace   | 版本切换的命名空间       |
| 内联变量     | Inline Variable    | 每个翻译单元内联定义     |
| 实例化       | Instantiation      | 从模板创建具体类型或函数 |
| int          | int                | 整数类型                 |
| 接口         | Interface          | 类的公共行为抽象         |
| 内部链接     | Internal Linkage   | 只在当前翻译单元可见     |

### L

| 术语   | 英文    | 释义                       |
| ------ | ------- | -------------------------- |
| lambda | lambda  | 匿名函数对象               |
| 左值   | Lvalue  | 可标识存储位置的表达式     |
| 库     | Library | 可复用的代码集合           |
| 链接   | Linking | 合并目标文件生成可执行文件 |
| 字面量 | Literal | 代码中直接写出的值         |

### M

| 术语     | 英文                 | 释义                             |
| -------- | -------------------- | -------------------------------- |
| main     | main                 | 程序入口函数                     |
| 宏       | Macro                | `#define` 定义的替换             |
| 强制转换 | Cast                 | 用 `(type)` 或 `cast<>` 转换类型 |
| 成员     | Member               | 类或结构体的变量和函数           |
| 成员函数 | Member Function      | 类的成员方法                     |
| 方法     | Method               | 成员函数的另一种称呼             |
| 多态     | Polymorphism         | 不同类型对象相同接口不同行为     |
| 多重继承 | Multiple Inheritance | 从多个基类继承                   |

### N

| 术语     | 英文          | 释义                   |
| -------- | ------------- | ---------------------- |
| 命名空间 | Namespace     | 组织代码避免命名冲突   |
| new      | new           | 动态分配内存并构造对象 |
| 嵌套类   | Nested Class  | 在另一类内部定义的类   |
| nullptr  | nullptr       | 空指针字面量           |
| 数值范围 | Numeric Range | 类型可表示的值范围     |

### O

| 术语       | 英文                 | 释义                           |
| ---------- | -------------------- | ------------------------------ |
| 对象       | Object               | 类的实例                       |
| 对象切片   | Object Slicing       | 派生类赋值给基类时丢失派生部分 |
| 运算符重载 | Operator Overloading | 重定义运算符行为               |
| 可选参数   | Optional Argument    | 可省略的参数                   |
| 原始指针   | Raw Pointer          | 普通的指针类型                 |
| 外部链接   | External Linkage     | 可被其他文件访问               |

### P

| 术语       | 英文                     | 释义                   |
| ---------- | ------------------------ | ---------------------- |
| 参数       | Parameter                | 函数定义的输入变量     |
| 参数包展开 | Parameter Pack Expansion | 展开可变参数           |
| 纯虚函数   | Pure Virtual Function    | `= 0` 声明的虚函数     |
| 指针       | Pointer                  | 存储内存地址的变量     |
| 私有成员   | Private Member           | 只有类内可访问         |
| 程序       | Program                  | 完成特定功能的代码集合 |
| protected  | protected                | 派生类可访问的成员     |
| public     | public                   | 公开可访问的成员       |

### Q

| 术语     | 英文           | 释义                     |
| -------- | -------------- | ------------------------ |
| 限定符   | Qualifier      | const、volatile 等修饰符 |
| 限定名称 | Qualified Name | 带作用域前缀的名称       |

### R

| 术语             | 英文                   | 释义                           |
| ---------------- | ---------------------- | ------------------------------ |
| RAII             | RAII                   | 资源获取即初始化，资源管理模式 |
| 随机访问迭代器   | Random Access Iterator | 支持 O(1) 随机访问             |
| 读取             | Read                   | 从输入获取数据                 |
| 递归             | Recursion              | 函数调用自身                   |
| 引用             | Reference              | 变量的别名                     |
| 寄存器变量       | Register Variable      | 建议存储在寄存器               |
| 正则表达式       | Regular Expression     | 文本模式匹配                   |
| reinterpert_cast | reinterpret_cast       | 重新解释位模式                 |
| 关系运算符       | Relational Operator    | 比较运算符号                   |
| return           | return                 | 函数返回语句                   |
| 右值引用         | Rvalue Reference       | `T&&` 绑定临时对象             |

### S

| 术语             | 英文                      | 释义                   |
| ---------------- | ------------------------- | ---------------------- |
| 作用域           | Scope                     | 标识符可见的区域       |
| 作用域解析运算符 | Scope Resolution Operator | `::`                   |
| 序列点           | Sequence Point            | 所有副作用完成的点     |
| 阴影             | Shadowing                 | 内层作用域遮蔽外层同名 |
| 共享指针         | Shared Pointer            | 引用计数的智能指针     |
| sizeof           | sizeof                    | 获取类型或变量大小     |
| 源文件           | Source File               | 包含代码的 `.cpp` 文件 |
| 特殊成员函数     | Special Member Function   | 构造函数、析构函数等   |
| static           | static                    | 静态成员或内部链接     |
| static_cast      | static_cast               | 编译期类型转换         |
| 存储期           | Storage Duration          | 对象存在的时间         |
| 流               | Stream                    | 数据输入输出的抽象     |
| 字符串           | String                    | 字符序列               |
| 结构体           | Struct                    | 成员默认 public 的类   |
| 子类             | Subclass                  | 派生类                 |
| 替代             | Substitution              | 用实参替换模板参数     |
| switch           | switch                    | 多分支选择语句         |
| 符号表           | Symbol Table              | 存储标识符信息         |

### T

| 术语         | 英文               | 释义               |
| ------------ | ------------------ | ------------------ |
| 模板         | Template           | 参数化代码的机制   |
| 模板参数     | Template Parameter | 模板的类型或值参数 |
| 模板实参     | Template Argument  | 实例化时的具体参数 |
| this         | this               | 指向当前对象的指针 |
| 线程         | Thread             | 执行的最小单位     |
| thread_local | thread_local       | 线程局部存储       |
| throw        | throw              | 抛出异常           |
| try          | try                | 捕获异常的代码块   |
| 类型         | Type               | 数据的分类         |
| 类型特征     | Type Trait         | 查询类型性质的模板 |
| 类型转换     | Type Casting       | 转换数据类型       |

### U

| 术语           | 英文                   | 释义                 |
| -------------- | ---------------------- | -------------------- |
| 歧义           | Ambiguity              | 多个可能解释         |
| 联合           | Union                  | 成员共享同一内存     |
| 唯一指针       | Unique Pointer         | 独占所有权的智能指针 |
| 统一初始化     | Uniform Initialization | 用大括号初始化       |
| 别名模板       | Type Alias Template    | 参数化的类型别名     |
| 未定义行为     | Undefined Behavior     | 语言规范未定义的行为 |
| 不使用变量     | Unused Variable        | 声明但未使用的变量   |
| 用户定义字面量 | User-defined Literal   | 后缀运算符重载       |

### V

| 术语     | 英文                | 释义                     |
| -------- | ------------------- | ------------------------ |
| 变量     | Variable            | 存储数据的命名位置       |
| 虚函数   | Virtual Function    | 可被重写的成员函数       |
| 虚继承   | Virtual Inheritance | 虚基类解决菱形继承       |
| 虚表     | Vtable              | 实现虚函数调度的表       |
| 可变成员 | Mutable Member      | const 对象中可修改的成员 |
| 变参模板 | Variadic Template   | 可变数量参数的模板       |

### W

| 术语    | 英文         | 释义                     |
| ------- | ------------ | ------------------------ |
| warning | Warning      | 编译器警告信息           |
| while   | while        | 循环语句                 |
| 弱指针  | Weak Pointer | 不影响引用计数的智能指针 |
| 写入    | Write        | 输出数据                 |

### stdlib 标准库术语

| 术语                     | 英文                     | 释义                    |
| ------------------------ | ------------------------ | ----------------------- |
| algorithm                | algorithm                | 算法库，sort、find 等   |
| allocator                | allocator                | 内存分配器接口          |
| any                      | any                      | 可存储任意类型的容器    |
| array                    | array                    | 固定大小数组容器        |
| atomic                   | atomic                   | 原子操作库              |
| barrier                  | barrier                  | 线程同步障碍            |
| bicut                    | bicut                    | 二分切断算法            |
| bitset                   | bitset                   | 位向量容器              |
| byte                     | byte                     | 字节类型                |
| callable                 | callable                 | 可调用对象类型          |
| capacity                 | capacity                 | 容器大小操作            |
| cassert                  | cassert                  | 断言头文件              |
| cctype                   | cctype                   | 字符分类函数            |
| chrono                   | chrono                   | 时间Duration和时钟      |
| cin                      | cin                      | 标准输入流              |
| clear                    | clear                    | 清除容器内容            |
| cmp_chMag_order          | cmp_chMag_order          | 比较三个值的中值        |
| codecvt                  | codecvt                  | 字符编码转换            |
| codevt_byname            | codecvt_byname           | 本地化编码转换          |
| collate                  | collate                  | 字符串比较              |
| collate_byname           | collate_byname           | 本地化字符串比较        |
| common_type              | common_type              | 公共类型特征            |
| compare                  | compare                  | 三路比较库              |
| complex                  | complex                  | 复数类型                |
| condition_variable       | condition_variable       | 条件变量                |
| cout                     | cout                     | 标准输出流              |
| cin                      | cin                      | 标准输入流              |
| cerr                     | cerr                     | 标准错误流              |
| clamp                    | clamp                    | 限制值在范围内          |
| count                    | count                    | 计数算法                |
| count_if                 | count_if                 | 条件计数                |
| condition_any            | condition_any            | 任意类型条件变量        |
| cstdio                   | cstdio                   | C 标准输入输出          |
| cstdlib                  | cstdlib                  | C 标准库                |
| cstring                  | cstring                  | C 字符串函数            |
| ctime                    | ctime                    | C 时间函数              |
| deadvalue_t              | deadvalue_t              | 死亡值标签类型          |
| deque                    | deque                    | 双端队列容器            |
| destroy                  | destroy                  | 销毁对象                |
| destroy_at               | destroy_at               | 在地址销毁              |
| distance                 | distance                 | 迭代器距离              |
| div                      | div                      | 整数除法结构体          |
| emplace                  | emplace                  | 原位构造                |
| empty                    | empty                    | 检查容器是否为空        |
| enable_shared_from_this  | enable_shared_from_this  | 从 shared_ptr 创建 this |
| end                      | end                      | 指向末尾的迭代器        |
| endl                     | endl                     | 换行并刷新              |
| erase                    | erase                    | 删除元素                |
| exception                | exception                | 异常类                  |
| execution                | execution                | 执行策略                |
| exit                     | exit                     | 程序退出                |
| expected                 | expected                 | 携带错误值的类型        |
| fenv                     | fenv                     | 浮点环境                |
| filesystem               | filesystem               | 文件系统库              |
| float_denorm_style       | float_denorm_style       | 浮点非规格化风格        |
| float_round_style        | float_round_style        | 浮点舍入风格            |
| flow倡\_n                | flow倡\_n                | 流动倡 n 个元素         |
| for_each                 | for_each                 | 对范围每个元素执行      |
| format                   | format                   | 格式化库                |
| forward                  | forward                  | 转发参数                |
| forward_list             | forward_list             | 单向链表容器            |
| fpos                     | fpos                     | 文件位置类型            |
| front                    | front                    | 访问第一个元素          |
| functional               | functional               | 函数对象和绑定          |
| future                   | future                   | 异步结果                |
| gcd                      | gcd                      | 最大公约数              |
| generate                 | generate                 | 生成元素                |
| generate_n               | generate_n               | 生成 n 个元素           |
| get                      | get                      | 获取 tuple 元素         |
| handle                   | handle                   | 句柄概念                |
| hash                     | hash                     | 哈希函数对象            |
| hypot                    | hypot                    | 欧几里得距离函数        |
| includes                 | includes                 | 检查包含关系            |
| initializer_list         | initializer_list         | 初始化列表类型          |
| inner_product            | inner_product            | 内积算法                |
| in_place_t               | in_place_t               | 原位构造标签            |
| insert                   | insert                   | 插入元素                |
| inplace_merge            | inplace_merge            | 原地合并有序范围        |
| invoke                   | invoke                   | 调用可调用对象          |
| iomanip                  | iomanip                  | 输入输出格式化          |
| ios                      | ios                      | 输入输出基类            |
| ios_base                 | ios_base                 | 流基类                  |
| iostream                 | iostream                 | 输入输出流              |
| istream                  | istream                  | 输入流                  |
| istringstream            | istringstream            | 字符串输入流            |
| iter_swap                | iter_swap                | 交换迭代器指向          |
| iterator                 | iterator                 | 迭代器抽象              |
| iterator_traits          | iterator_traits          | 迭代器特征              |
| joinable                 | joinable                 | 检查线程是否可加入      |
| lambda                   | lambda                   | lambda 表达式           |
| layout_left_t            | layout_left_t            | 左布局标签              |
| layout_right_t           | layout_right_t           | 右布局标签              |
| lcm                      | lcm                      | 最小公倍数              |
| less                     | less                     | 小于函数对象            |
| lexically_normal         | lexically_normal         | 词法正规化              |
| lexically_compare        | lexically_compare        | 字典序比较              |
| list                     | list                     | 双向链表容器            |
| locale                   | locale                   | 本地化支持              |
| localtime                | localtime                | 转换时间结构            |
| lock_guard               | lock_guard               | 简单锁封装              |
| logical_and              | logical_and              | 逻辑与函数对象          |
| logical_not              | logical_not              | 逻辑非函数对象          |
| logical_or               | logical_or               | 逻辑或函数对象          |
| lower_bound              | lower_bound              | 下界查找                |
| make_exception_ptr       | make_exception_ptr       | 创建异常指针            |
| make_heap                | make_heap                | 生成堆                  |
| make_pair                | make_pair                | 创建 pair               |
| make_reverse_iterator    | make_reverse_iterator    | 创建反向迭代器          |
| make_shared              | make_shared              | 创建 shared_ptr         |
| make_tuple               | make_tuple               | 创建 tuple              |
| make_weak_ptr            | make_weak_ptr            | 创建 weak_ptr           |
| map                      | map                      | 有序键值对容器          |
| match_results            | match_results            | 正则匹配结果            |
| materialization          | materialization          | 实体化                  |
| max                      | max                      | 最大值                  |
| max_element              | max_element              | 最大元素                |
| mem_fn                   | mem_fn                   | 成员函数绑定器          |
| merge                    | merge                    | 合并有序范围            |
| message                  | message                  | 错误消息                |
| min                      | min                      | 最小值                  |
| min_element              | min_element              | 最小元素                |
| minmax                   | minmax                   | 最小最大值对            |
| minmax_element           | minmax_element           | 最小最大元素            |
| mktime                   | mktime                   | 时间结构转时间戳        |
| modulus                  | modulus                  | 取模函数对象            |
| move                     | move                     | 移动语义工具            |
| move_backward            | move_backward            | 向后移动范围            |
| move_if_noexcept         | move_if_noexcept         | 有条件移动              |
| multimap                 | multimap                 | 多重映射容器            |
| multiset                 | multiset                 | 多重集合容器            |
| negate                   | negate                   | 取负函数对象            |
| nested_exception         | nested_exception         | 嵌套异常                |
| next                     | next                     | 前进迭代器              |
| next_permutation         | next_permutation         | 下一个排列              |
| noexcept                 | noexcept                 | 不抛异常说明符          |
| none                     | none                     | 无操作流                |
| norm                     | norm                     | 复数模长                |
| not1                     | not1                     | 一元取反函数适配器      |
| not2                     | not2                     | 二元取反函数适配器      |
| not_fn                   | not_fn                   | 函数取反                |
| nth_element              | nth_element              | 快速选择算法            |
| nullopt_t                | nullopt_t                | 空选项标签              |
| nullptr_t                | nullptr_t                | 空指针类型              |
| numeric                  | numeric                  | 数值算法库              |
| object                   | object                   | 对象概念                |
| oct                      | oct                      | 八进制格式              |
| ofstream                 | ofstream                 | 文件输出流              |
| ostream                  | ostream                  | 输出流基类              |
| ostringstream            | ostringstream            | 字符串输出流            |
| atomic_flag              | atomic_flag              | 原子标志                |
| atomic_ref               | atomic_ref               | 原子引用                |
| back                     | back                     | 访问最后一个元素        |
| bad_alloc                | bad_alloc                | 内存分配失败异常        |
| bad_cast                 | bad_cast                 | 类型转换失败异常        |
| bad_typeid               | bad_typeid               | typeid 空指针异常       |
| bad_weak_ptr             | bad_weak_ptr             | weak_ptr 过期异常       |
| basic_istream            | basic_istream            | 输入流模板              |
| basic_ostream            | basic_ostream            | 输出流模板              |
| basic_fstream            | basic_fstream            | 文件流模板              |
| basic_stringstream       | basic_stringstream       | 字符串流模板            |
| basic_syncbuf            | basic_syncbuf            | 同步缓冲区              |
| basic_spanstream         | basic_spanstream         | span 流模板             |
| pair                     | pair                     | 两个值的组合            |
| panic                    | panic                    | 恐慌错误处理            |
| partial_sort             | partial_sort             | 部分排序                |
| partial_sort_copy        | partial_sort_copy        | 部分排序复制            |
| partial_sum              | partial_sum              | 部分累加和              |
| partition                | partition                | 划分算法                |
| partition_point          | partition_point          | 划分点                  |
| plus                     | plus                     | 加法函数对象            |
| pop                      | pop                      | 弹出元素                |
| pop_heap                 | pop_heap                 | 弹出堆顶                |
| pow                      | pow                      | 幂函数                  |
| prev                     | prev                     | 后退迭代器              |
| priority_queue           | priority_queue           | 优先队列容器            |
| product                  | product                  | 乘积算法                |
| promise                  | promise                  | 异步提供者              |
| ptr_fun                  | ptr_fun                  | 函数指针适配器          |
| push                     | push                     | 推入元素                |
| push_heap                | push_heap                | 推入堆                  |
| put                      | put                      | 输出字符                |
| queue                    | queue                    | 先进先出队列            |
| random                   | random                   | 随机数库                |
| random_device            | random_device            | 真随机数生成器          |
| range                    | range                    | 范围概念                |
| ratio                    | ratio                    | 编译期有理数            |
| raw_storage_iterator     | raw_storage_iterator     | 原始存储迭代器          |
| rbegin                   | rbegin                   | 反向开始迭代器          |
| ref                      | ref                      | reference_wrapper 工厂  |
| remove                   | remove                   | 移除元素                |
| remove_copy              | remove_copy              | 移除复制                |
| remove_copy_if           | remove_copy_if           | 条件移除复制            |
| remove_if                | remove_if                | 条件移除                |
| rend                     | rend                     | 反向结束迭代器          |
| replace                  | replace                  | 替换元素                |
| replace_copy             | replace_copy             | 替换复制                |
| replace_copy_if          | replace_copy_if          | 条件替换复制            |
| replace_if               | replace_if               | 条件替换                |
| reset                    | reset                    | 重置智能指针            |
| resize                   | resize                   | 调整大小                |
| resolve                  | resolve                  | 解析路径                |
| result_of                | result_of                | 调用结果类型            |
| retain                   | retain                   | 保留元素                |
| return_temporary_buffer  | return_temporary_buffer  | 返回临时缓冲区          |
| reverse                  | reverse                  | 反转元素                |
| reverse_copy             | reverse_copy             | 反转复制                |
| rotate                   | rotate                   | 旋转范围                |
| rotate_copy              | rotate_copy              | 旋转复制                |
| sample                   | sample                   | 随机采样                |
| scoped_lock              | scoped_lock              | 多个锁的 RAII 封装      |
| search                   | search                   | 搜索子范围              |
| search_n                 | search_n                 | 搜索连续元素            |
| set                      | set                      | 有序集合容器            |
| set_difference           | set_difference           | 集合差集                |
| set_intersection         | set_intersection         | 集合交集                |
| set_symmetric_difference | set_symmetric_difference | 集合对称差              |
| set_union                | set_union                | 集合并集                |
| shared_future            | shared_future            | 共享异步结果            |
| shared_lock              | shared_lock              | 共享锁 RAII             |
| shared_mutex             | shared_mutex             | 读写锁                  |
| signal                   | signal                   | 信号处理                |
| sin                      | sin                      | 正弦函数                |
| single                   | single                   | 单个值发射器            |
| size                     | size                     | 元素个数                |
| skip                     | skip                     | 跳过元素                |
| slice                    | slice                    | 数组切片                |
| sort                     | sort                     | 排序算法                |
| sort_heap                | sort_heap                | 堆排序                  |
| sorted_uses              | sorted_uses              | 已排序使用              |
| span                     | span                     | 非拥有视图              |
| spanbuf                  | spanbuf                  | span 缓冲区             |
| spanstream               | spanstream               | span 流                 |
| splice                   | splice                   | 链表拼接                |
| split                    | split                    | 分裂范围                |
| sqrt                     | sqrt                     | 平方根函数              |
| srand                    | srand                    | 设置随机种子            |
| stable_partition         | stable_partition         | 稳定划分                |
| stable_sort              | stable_sort              | 稳定排序                |
| stack                    | stack                    | 栈容器                  |
| stop_callback            | stop_callback            | 停止回调                |
| stop_source              | stop_source              | 停止源                  |
| stop_token               | stop_token               | 停止令牌                |
| strstreambuf             | strstreambuf             | 字符串缓冲区            |
| substr                   | substr                   | 子字符串                |
| swap                     | swap                     | 交换值                  |
| swap_ranges              | swap_ranges              | 交换范围                |
| synchronized             | synchronized             | 同步代码块              |
| system_category          | system_category          | 系统错误类别            |
| tan                      | tan                      | 正切函数                |
| terminate                | terminate                | 终止程序                |
| terminate_handler        | terminate_handler        | 终止处理函数            |
| text_format              | text_format              | 文本格式化              |
| this_thread              | this_thread              | 当前线程命名空间        |
| thread                   | thread                   | 线程类                  |
| throw_on                 | throw_on                 | 错误时抛出              |
| time                     | time                     | 获取当前时间            |
| time_get                 | time_get                 | 时间解析                |
| time_put                 | time_put                 | 时间格式化              |
| timed_mutex              | timed_mutex              | 超时互斥锁              |
| timespec                 | timespec                 | 时间规格结构            |
| tm                       | tm                       | 日历时间结构            |
| to_address               | to_address               | 转换为裸地址            |
| to_array                 | to_array                 | 转换为数组              |
| transform                | transform                | 变换算法                |
| transform_exclusive_scan | transform_exclusive_scan | 互斥变换扫描            |
| transform_inclusive_scan | transform_inclusive_scan | 包容变换扫描            |
| transform_reduce         | transform_reduce         | 变换规约                |
| try_lock                 | try_lock                 | 尝试加锁                |
| tuple                    | tuple                    | 固定大小异构集合        |
| tuple_element            | tuple_element            | tuple 元素类型          |
| tuple_size               | tuple_size               | tuple 元素个数          |
| type_info                | type_info                | 类型信息类              |
| typed_span               | typed_span               | 带类型 span             |
| unbias                   | unbias                   | 去除偏差                |
| unexpected               | unexpected               | 不预期的异常处理器      |
| uninitialized_copy       | uninitialized_copy       | 未初始化复制            |
| uninitialized_copy_n     | uninitialized_copy_n     | 未初始化复制 n 个       |
| uninitialized_fill       | uninitialized_fill       | 未初始化填充            |
| uninitialized_fill_n     | uninitialized_fill_n     | 未初始化填充 n 个       |
| unique                   | unique                   | 去除相邻重复            |
| unique_copy              | unique_copy              | 去除重复复制            |
| unique_lock              | unique_lock              | 灵活锁 RAII             |
| -unlock                  | unlock                   | 解锁                    |
| unwind                   | unwind                   | 栈展开                  |
| upper_bound              | upper_bound              | 上界查找                |
| url                      | url                      | 统一资源定位符          |
| uses_allocator           | uses_allocator           | 使用分配器特征          |
| valarray                 | valarray                 | 值数组模板              |
| variant                  | variant                  | 类型安全联合            |
| vector                   | vector                   | 动态数组容器            |
| version                  | version                  | 库版本信息              |
| view                     | view                     | 视图概念                |
| weak_ptr                 | weak_ptr                 | 弱引用智能指针          |
| write                    | write                    | 输出字符                |
| wstring                  | wstring                  | 宽字符串类型            |
| yield                    | yield                    | 让出执行权              |

### advanced 高级进阶术语

| 术语                     | 英文                       | 释义                            |
| ------------------------ | -------------------------- | ------------------------------- |
| 绝对虚拟                 | Absolute Virtual           | 必须实现的纯虚函数              |
| 访问序列                 | Access Sequence            | 内存访问顺序                    |
| 获取-释放语义            | Acquire-release Semantics  | 内存同步操作                    |
| 适应器                   | Adaptor                    | 改变接口的类或函数              |
| 地址运算符               | Address-of Operator        | `&` 获取地址                    |
| ADL                      | ADL                        | 参数依赖查找                    |
| 聚合                     | Aggregate                  | 无用户声明构造函数的类          |
| 别名                     | Alias                      | using 或 typedef 创建的类型名   |
| 歧义解析                 | Ambiguity Resolution       | 解决多重继承歧义                |
| 友元类                   | Friend Class               | 授予访问权限的类                |
| 应用二进制接口           | ABI                        | 二进制层面约定                  |
| 匿名命名空间             | Anonymous Namespace        | 文件内匿名作用域                |
| 参数包                   | Parameter Pack             | 可变模板参数包                  |
| 参数展开                 | Argument Pack Expansion    | 展开参数包                      |
| 数组退化                 | Array Decay                | 数组退化为指针                  |
| 原子操作                 | Atomic Operation           | 不可中断的操作                  |
| 自动存储期               | Automatic Storage Duration | 块作用域结束时释放              |
| 后置条件                 | Postcondition              | 函数执行后的保证                |
| 后置递增                 | Post-increment             | `x++` 先用后增                  |
| 基础子对象               | Base Subobject             | 基类子对象                      |
| 双向迭代器               | Bidirectional Iterator     | 可前后移动的迭代器              |
| 二进制兼容性             | Binary Compatibility       | 编译产物兼容性                  |
| 二进制运算符             | Binary Operator            | 需要两个操作数                  |
| 绑定                     | Binding                    | 建立引用或绑定                  |
| 位运算                   | Bitwise Operation          | `&`、`\|`、`^`、`~`、`<<`、`>>` |
| 特化                     | Specialization             | 为特定类型的模板定义            |
| 特化模板                 | Specialized Template       | 具体化的模板                    |
| 块                       | Block                      | `{}` 包裹的语句组               |
| bool 转换                | Bool Conversion            | 转 bool 的上下文                |
| 边界检查数组             | Bounds-checked Array       | 带边界检查的数组                |
| 桥接模式                 | Bridge Pattern             | 分离抽象与实现                  |
| 浏览器                   | Browser                    | 浏览实体                        |
| 缓冲区                   | Buffer                     | 临时存储数据的内存              |
| 缓冲区溢出               | Buffer Overflow            | 写入超出边界                    |
| 构建函数                 | Builder Function           | 构建对象的函数                  |
| 内建类型                 | Built-in Type              | 语言内置类型                    |
| 字节码                   | Bytecode                   | 解释器执行的中间码              |
| 字节序                   | Byte Order                 | 多字节存储顺序                  |
| 调用约定                 | Calling Convention         | 参数传递规则                    |
| 候选函数集               | Candidate Function Set     | 重载解析的候选                  |
| 基类子对象               | Base Class Subobject       | 继承的基类部分                  |
| 捕获                     | Capture                    | lambda 捕获的变量               |
| 捕获模式                 | Capture Mode               | by value 或 by reference        |
| 捕获语义                 | Capture Semantics          | 值或引用捕获                    |
| 载具                     | Carrier                    | 携带对象的实体                  |
| 目录                     | Catalog                    | 实体集合                        |
| category                 | Category                   | 类型类别                        |
| 链式调用                 | Chaining                   | 连续调用方法                    |
| 链式比较                 | Chain Comparison           | `a < b < c` 形式                |
| 检查                     | Checking                   | 验证条件                        |
| 检查类型                 | Checked Type               | 带检查的类型                    |
| 子类                     | Child Class                | 派生类                          |
| 类模板                   | Class Template             | 参数化类定义                    |
| 闭色                     | Closure Color              | lambda 闭包类型                 |
| 代码生成                 | Code Generation            | 编译时生成代码                  |
| 代码路径                 | Code Path                  | 执行的可能路径                  |
| 代码质量                 | Code Quality               | 代码质量指标                    |
| 编码                     | Coding                     | 编写代码                        |
| 颜色                     | Color                      | 类型标签                        |
| 列挙                     | Column                     | 列位置                          |
| 列式                     | Columnar                   | 按列组织                        |
| 列式存储                 | Columnar Storage           | 按列存储数据                    |
| 组合                     | Combination                | 组合多个值                      |
| 组合数                   | Combination Number         | 组合的数量                      |
| 组合函数                 | Combinator                 | 组合多个函数                    |
| 组合器                   | Combiner                   | 合并操作结果                    |
| 命令式                   | Command                    | 命令对象                        |
| 命令模式                 | Command Pattern            | 请求封装为对象                  |
| 评论                     | Comment                    | 代码注释                        |
| 提交                     | Commit                     | 持久化变更                      |
| 公共类                   | Common Class               | 公共类型                        |
| 公共类型                 | Common Type                | 公共可替换类型                  |
| 比较器                   | Comparator                 | 比较函数对象                    |
| 兼容性                   | Compatibility              | 兼容性要求                      |
| 编译单元                 | Translation Unit           | 预处理后的源文件                |
| 编译时                   | Compile Time               | 编译阶段                        |
| 编译时常量               | Compile-time Constant      | 编译时可求值                    |
| 编译期多态               | Compile-time Polymorphism  | 模板实现的静态多态              |
| 完全平凡类型             | Trivially Copyable         | 可平凡复制的类型                |
| 完全类型                 | Complete Type              | 完整定义类型                    |
| 组件                     | Component                  | 组成整体的部分                  |
| 复合赋值                 | Compound Assignment        | `+=` 等运算符                   |
| 计算                     | Computation                | 计算过程                        |
| 计算图                   | Computation Graph          | 依赖关系图                      |
| 计算密集                 | Compute-bound              | CPU 密集型任务                  |
| 概念                     | Concept                    | 模板约束的抽象                  |
| 条件求值                 | Conditional Evaluation     | 三元运算符条件                  |
| 条件显式                 | Conditional Explicit       | 条件 explicit 构造函数          |
| 条件模板                 | Conditional Template       | 条件选择类型                    |
| 配置                     | Configuration              | 配置参数                        |
| 连接                     | Connection                 | 连接关系                        |
| 构造                     | Construction               | 创建对象过程                    |
| 构造语义                 | Construction Semantics     | 对象构造规则                    |
| 消费者                   | Consumer                   | 消费数据的一方                  |
| 容器                     | Container                  | 存储多个元素的对象              |
| 内容                     | Content                    | 内容部分                        |
| 上下文                   | Context                    | 使用环境                        |
| 上下文无关               | Context-free               | 不依赖上下文                    |
| 相关                     | Relevant                   | 相关的                          |
| 契约式设计               | Design by Contract         | 契约式编程                      |
| 相关性                   | Correlation                | 相关程度                        |
| 对应                     | Correspondence             | 对应关系                        |
| 耦合                     | Coupling                   | 模块间依赖                      |
| 覆盖                     | Coverage                   | 覆盖范围                        |
| 覆盖定义                 | Covering Definition        | 覆盖声明的定义                  |
| 覆盖虚函数               | Override                   | 重写基类虚函数                  |
| 创造者模式               | Creator Pattern            | 创建对象模式                    |
| 跨度                     | Span                       | 非拥有视图                      |
| 跨度缓冲                 | Spanbuffer                 | span 缓冲区                     |
| 临界区                   | Critical Section           | 访问共享资源的代码              |
| 跨平台                   | Cross-platform             | 跨不同平台                      |
| 当前对象                 | Current Object             | 当前处理对象                    |
| 自定义删除器             | Custom Deleter             | 智能指针的删除器                |
| 客户                     | Customer                   | 客户代码                        |
| 数据成员指针             | Data Member Pointer        | 指向成员的指针                  |
| 数据竞争                 | Data Race                  | 并发访问冲突                    |
| 日期时间                 | DateTime                   | 日期时间类型                    |
| 日期时间库               | DateTime Library           | 日期时间处理库                  |
| 死代码                   | Dead Code                  | 永不执行的代码                  |
| 死亡值                   | Dead Value                 | 生命周期结束的值                |
| 调试                     | Debug                      | 调试代码                        |
| 调试版本                 | Debug Build                | 调试构建                        |
| 声明                     | Declaration                | 声明名称                        |
| 声明说明符               | Declaration Specifier      | 声明的类型说明符                |
| 声明式                   | Declarative                | 声明式编程                      |
| 声明式代码               | Declarative Code           | 声明式代码                      |
| 声明式编程               | Declarative Programming    | 描述期望结果                    |
| 声明优先                 | Declaration First          | 先声明后使用                    |
| 解构赋值                 | Deconstruct Assignment     | 分解聚合赋值                    |
| 默认捕获                 | Default Capture            | lambda 默认捕获模式             |
| 默认比较                 | Default Comparison         | 默认比较运算符                  |
| 默认构造                 | Default Construction       | 默认初始化                      |
| 默认删除器               | Default Deleter            | 默认删除器                      |
| 默认行为                 | Default Behavior           | 未覆盖时的行为                  |
| 默认模板参数             | Default Template Argument  | 模板参数默认值                  |
| 默认类型                 | Default Type               | 默认类型选择                    |
| 递推                     | Deduction                  | 类型推导                        |
| 递推引导                 | Deduction Guide            | 类型推导引导                    |
| 递延                     | Defer                      | 延迟执行                        |
| 延迟                     | Deferred                   | 延迟操作                        |
| 延迟加载                 | Lazy Loading               | 延迟加载资源                    |
| 委托                     | Delegate                   | 委托给其他                      |
| 委托模式                 | Delegation Pattern         | 委托模式                        |
| 依赖                     | Dependency                 | 依赖关系                        |
| 依赖反转                 | Dependency Inversion       | 依赖抽象而非具体                |
| 依赖查找                 | Dependency Lookup          | 查找依赖                        |
| 部署                     | Deployment                 | 部署应用                        |
| 派生                     | Derivation                 | 继承                            |
| 派生类                   | Derived Class              | 继承其他类的类                  |
| 析构语义                 | Destruction Semantics      | 对象析构规则                    |
| 解构器                   | Destructor                 | 析构函数                        |
| 开发版本                 | Development Build          | 开发构建                        |
| 设备                     | Device                     | 设备对象                        |
| 诊断                     | Diagnostic                 | 诊断信息                        |
| 对角线                   | Diagonal                   | 对角线元素                      |
| 对话框                   | Dialog                     | 对话框对象                      |
| 有向图                   | Digraph                    | 有向图                          |
| 有向无环图               | DAG                        | 有向无环图                      |
| 维度                     | Dimension                  | 维度数量                        |
| 直接初始化               | Direct Initialization      | 直接构造初始化                  |
| 直接列表初始化           | Direct List Initialization | 直接花括号初始化                |
| 目录迭代器               | Directory Iterator         | 遍历目录                        |
| 禁用                     | Disable                    | 禁用功能                        |
| 分离编译                 | Separate Compilation       | 分开编译                        |
| 分配策略                 | Allocation Strategy        | 内存分配策略                    |
| 分析                     | Analysis                   | 分析过程                        |
| 分析器                   | Analyzer                   | 分析工具                        |
| 动态初始化               | Dynamic Initialization     | 运行时初始化                    |
| 动态调度                 | Dynamic Dispatch           | 运行时多态                      |
| 动态多态                 | Dynamic Polymorphism       | 运行时多态                      |
| 动态类型                 | Dynamic Type               | 运行时类型                      |
| 动态\_cast               | Dynamic Cast               | 运行时类型转换                  |
| 编辑                     | Editing                    | 编辑操作                        |
| 编辑模式                 | Edit Mode                  | 编辑状态                        |
| 效果                     | Effect                     | 效果作用                        |
| 有效                     | Effective                  | 有效的                          |
| 效率                     | Efficiency                 | 效率性能                        |
| 特征                     | Feature                    | 功能特征                        |
| 元素                     | Element                    | 元素                            |
| 元素类型                 | Element Type               | 元素类型                        |
| 元素访问                 | Element Access             | 访问元素                        |
| 嵌入式                   | Embedded                   | 嵌入式系统                      |
| 紧急停止                 | Emergency Stop             | 紧急停止                        |
| 空基类优化               | EBCO                       | 空基类优化                      |
| 空指针检查               | Empty Pointer Check        | 检查空指针                      |
| 空类型                   | Empty Type                 | 无成员类型                      |
| 启用                     | Enable                     | 启用功能                        |
| 启用\_if                 | Enable If                  | 条件启用                        |
| 编码                     | Encoding                   | 编码格式                        |
| 端点                     | Endpoint                   | 端点                            |
| 端到端                   | End-to-end                 | 端到端                          |
| 端到端加密               | End-to-end Encryption      | 端到端加密                      |
| 端用户                   | End User                   | 终端用户                        |
| 环境                     | Environment                | 运行环境                        |
| 环境变量                 | Environment Variable       | 环境变量                        |
| 历元                     | Epoch                      | 时间起点                        |
| 相等性                   | Equality                   | 相等比较                        |
| 相等性检查               | Equality Check             | 检查相等                        |
| 等价                     | Equivalence                | 等价关系                        |
| 等价类型                 | Equivalence Type           | 等价类型                        |
| 错误                     | Error                      | 错误情况                        |
| 错误类别                 | Error Category             | 错误分类                        |
| 错误码                   | Error Code                 | 错误代码                        |
| 错误处理                 | Error Handling             | 错误处理                        |
| 错误消息                 | Error Message              | 错误消息                        |
| 错误条件                 | Error Condition            | 错误条件                        |
| 错误状态                 | Error State                | 错误状态                        |
| 逃逸分析                 | Escape Analysis            | 分析变量逃逸                    |
| 评估                     | Evaluation                 | 求值                            |
| 求值顺序                 | Evaluation Order           | 求值顺序                        |
| 事件                     | Event                      | 事件对象                        |
| 事件处理                 | Event Handling             | 处理事件                        |
| 事件循环                 | Event Loop                 | 事件循环                        |
| 事件源                   | Event Source               | 事件源                          |
| 事件驱动                 | Event-driven               | 事件驱动                        |
| 异常传播                 | Exception Propagation      | 异常传播                        |
| 异常安全                 | Exception Safety           | 异常时保证                      |
| 异常规格                 | Exception Specification    | 异常说明                        |
| 异常类型                 | Exception Type             | 异常类型                        |
| 展开                     | Expansion                  | 参数包展开                      |
| 显式构造                 | Explicit Constructor       | explicit 构造函数               |
| 显式转换                 | Explicit Conversion        | 显式类型转换                    |
| 显式实例化               | Explicit Instantiation     | 显式实例化模板                  |
| 显式重载                 | Explicit Override          | override 说明符                 |
| 表达式模板               | Expression Template        | 表达式模板                      |
| 表达式求值               | Expression Evaluation      | 求表达式值                      |
| 表达式类型               | Expression Type            | 表达式类型                      |
| 扩展                     | Extension                  | 扩展功能                        |
| 扩展名                   | Extension Name             | 文件扩展名                      |
| 外部变量                 | External Variable          | 外部变量                        |
| 提取                     | Extraction                 | 提取元素                        |
| 面                       | Face                       | 面对象                          |
| 门面模式                 | Facade Pattern             | 门面模式                        |
| 工厂                     | Factory                    | 工厂对象                        |
| 工厂函数                 | Factory Function           | 创建对象的函数                  |
| 特性                     | Feature                    | 特性                            |
| 特性测试宏               | Feature Test Macro         | 特性测试宏                      |
| 反馈                     | Feedback                   | 反馈信息                        |
| 字段                     | Field                      | 字段                            |
| 文件描述符               | File Descriptor            | 文件描述符                      |
| 文件结束                 | File End                   | 文件结束                        |
| 文件结束标志             | End of File                | EOF 标志                        |
| 文件系统                 | File System                | 文件系统                        |
| 文件系统路径             | File System Path           | 文件路径                        |
| 筛选                     | Filtering                  | 筛选操作                        |
| 最终                     | Final                      | 最终的                          |
| 最终覆盖                 | Final Override             | final 说明符                    |
| 查找                     | Finding                    | 查找操作                        |
| 首次适配                 | First Fit                  | 首次适配算法                    |
| 固定                     | Fixed                      | 固定的                          |
| 固定大小                 | Fixed Size                 | 固定大小                        |
| 标志                     | Flag                       | 标志位                          |
| 翻转                     | Flip                       | 翻转操作                        |
| 浮动小数                 | Floating                   | 浮点                            |
| 浮动类型                 | Floating Type              | 浮点类型                        |
| 流程                     | Flow                       | 流程控制                        |
| 流程图                   | Flow Chart                 | 流程图                          |
| 流控制                   | Flow Control               | 流程控制                        |
| 流导向                   | Flow-oriented              | 面向流                          |
| 折叠表达式               | Fold Expression            | 参数包折叠                      |
| 为向前                   | Forward Declaration        | 前向声明                        |
| 为向量                   | Forward Iterator           | 正向迭代器                      |
| 碎片化                   | Fragmentation              | 内存碎片化                      |
| 框架                     | Framework                  | 框架                            |
| 频率                     | Frequency                  | 频率                            |
| 前置条件                 | Precondition               | 函数前置条件                    |
| 前置递增                 | Pre-increment              | `++x` 先增后用                  |
| 前驱                     | Predecessor                | 前驱元素                        |
| 前缀                     | Prefix                     | 前缀                            |
| 前序                     | Preorder                   | 前序遍历                        |
| 前序遍历                 | Preorder Traversal         | 前序遍历                        |
| 预备                     | Preparation                | 准备阶段                        |
| 优先级                   | Priority                   | 优先级                          |
| 优先级队列               | Priority Queue             | 优先队列                        |
| 处理                     | Processing                 | 处理                            |
| 生产者                   | Producer                   | 生产者                          |
| 生产者消费者             | Producer-consumer          | 生产者消费者                    |
| 产品类型                 | Product Type               | 积类型                          |
| 剖析                     | Profiling                  | 性能分析                        |
| 剖析器                   | Profiler                   | 性能分析工具                    |
| 进展                     | Progress                   | 进度                            |
| 投影                     | Projection                 | 投影操作                        |
| Promise                  | Promise                    | 承诺对象                        |
| 属性                     | Property                   | 属性                            |
| 属性说明符               | Property Specifier         | 属性说明符                      |
| 协议                     | Protocol                   | 协议                            |
| 提供者                   | Provider                   | 提供者                          |
| 代理                     | Proxy                      | 代理对象                        |
| 代理模式                 | Proxy Pattern              | 代理模式                        |
| 公共基类                 | Public Base Class          | 公共基类                        |
| 纯类型                   | Pure Type                  | 纯类型                          |
| 限定                     | Qualification              | 限定                            |
| 限定类型                 | Qualified Type             | 限定类型                        |
| 查询                     | Query                      | 查询操作                        |
| 查询函数                 | Query Function             | 查询函数                        |
| 范围                     | Range                      | 范围                            |
| 范围\_for                | Range-based For            | 基于范围的 for                  |
| 范围库                   | Range Library              | 范围库                          |
| 率                       | Rate                       | 速率                            |
| 原始类型                 | Raw Type                   | 原始类型                        |
| 只读                     | Read-only                  | 只读                            |
| 就绪                     | Ready                      | 就绪状态                        |
| 实时                     | Real-time                  | 实时                            |
| 重新分配                 | Reallocation               | 重新分配                        |
| 重新解释\_cast           | Reinterpret Cast           | 位重新解释                      |
| 关系                     | Relation                   | 关系                            |
| 关系运算符               | Relational Operator        | 关系运算符                      |
| 相对                     | Relative                   | 相对的                          |
| 相对路径                 | Relative Path              | 相对路径                        |
| 释放语义                 | Release Semantics          | 释放语义                        |
| 可靠性                   | Reliability                | 可靠性                          |
| 剩余                     | Remainder                  | 余数                            |
| 剩余参数                 | Remaining Arguments        | 剩余参数                        |
| 远程                     | Remote                     | 远程                            |
| 可替换                   | Removable                  | 可移除                          |
| 重排                     | Rearrangement              | 重排                            |
| 引用语义                 | Reference Semantics        | 引用语义                        |
| 反射                     | Reflection                 | 运行时自省                      |
| 刷新                     | Refresh                    | 刷新                            |
| 正则表达式               | Regular Expression         | 正则表达式                      |
| 规则                     | Rule                       | 规则                            |
| 调度                     | Scheduling                 | 调度                            |
| 调度器                   | Scheduler                  | 调度器                          |
| 范围                     | Scope                      | 作用域                          |
| 作用域规则               | Scoping Rule               | 作用域规则                      |
| 搜索                     | Search                     | 搜索                            |
| 搜索算法                 | Search Algorithm           | 搜索算法                        |
| 安全                     | Security                   | 安全性                          |
| 安全类型                 | Safe Type                  | 安全类型                        |
| 选择                     | Selection                  | 选择                            |
| 选择器                   | Selector                   | 选择器                          |
| 语义                     | Semantic                   | 语义                            |
| 语义版本                 | Semantic Versioning        | 语义版本                        |
| 发送                     | Send                       | 发送                            |
| 敏感                     | Sensitive                  | 敏感的                          |
| 序列化                   | Serialization              | 序列化                          |
| 服务                     | Service                    | 服务                            |
| 服务质量                 | Quality of Service         | 服务质量                        |
| 集合                     | Set                        | 集合                            |
| 设置                     | Setting                    | 设置                            |
| 设置语义                 | Setting Semantics          | 设置语义                        |
| 阴影                     | Shadowing                  | 遮蔽                            |
| 共享                     | Shared                     | 共享                            |
| 共享锁                   | Shared Lock                | 共享锁                          |
| 共享互斥                 | Shared Mutex               | 共享互斥                        |
| 共享状态                 | Shared State               | 共享状态                        |
| 共享类型                 | Shared Type                | 共享类型                        |
| 壳                       | Shell                      | 外壳                            |
| 简写                     | Shorthand                  | 简写                            |
| 短路求值                 | Short-circuit Evaluation   | 短路求值                        |
| 简明                     | Concise                    | 简明的                          |
| 签名                     | Signature                  | 签名                            |
| 签名匹配                 | Signature Matching         | 签名匹配                        |
| 符号                     | Symbol                     | 符号                            |
| 符号表                   | Symbol Table               | 符号表                          |
| 类似                     | Similar                    | 相似的                          |
| 模拟                     | Simulation                 | 模拟                            |
| 单一                     | Single                     | 单一的                          |
| 单例                     | Singleton                  | 单例                            |
| 单例模式                 | Singleton Pattern          | 单例模式                        |
| 大小写                   | Case                       | 大小写                          |
| 大小写不敏感             | Case-insensitive           | 不区分大小写                    |
| 大小写敏感               | Case-sensitive             | 区分大小写                      |
| 跳过                     | Skip                       | 跳过                            |
| 滑动窗口                 | Sliding Window             | 滑动窗口                        |
| 插槽                     | Slot                       | 插槽                            |
| 智能                     | Smart                      | 智能                            |
| 智能指针                 | Smart Pointer              | 智能指针                        |
| 排序                     | Sorting                    | 排序                            |
| 排序算法                 | Sorting Algorithm          | 排序算法                        |
| 源                       | Source                     | 源                              |
| 源代码                   | Source Code                | 源代码                          |
| 空间                     | Space                      | 空间                            |
| 稀疏                     | Sparse                     | 稀疏的                          |
| 特殊成员函数             | Special Member Function    | 特殊成员函数                    |
| 规格                     | Specification              | 规格                            |
| 拆分                     | Splitting                  | 拆分                            |
| 稳定性                   | Stability                  | 稳定性                          |
| 稳定排序                 | Stable Sort                | 稳定排序                        |
| 栈分配                   | Stack Allocation           | 栈分配                          |
| 栈展开                   | Stack Unwinding            | 栈展开                          |
| 标准                     | Standard                   | 标准                            |
| 标准布局                 | Standard Layout            | 标准布局                        |
| 标准库                   | Standard Library           | 标准库                          |
| 起始                     | Start                      | 起始                            |
| 起始位置                 | Starting Position          | 起始位置                        |
| 状态                     | State                      | 状态                            |
| 状态机                   | State Machine              | 状态机                          |
| 静态                     | Static                     | 静态                            |
| 静态断言                 | Static Assertion           | 编译时断言                      |
| 静态调度                 | Static Dispatch            | 编译时调度                      |
| 静态多态                 | Static Polymorphism        | 编译时多态                      |
| 静态类型                 | Static Type                | 编译时类型                      |
| 静态\_cast               | Static Cast                | 编译时类型转换                  |
| 统计数据                 | Statistics                 | 统计数据                        |
| std::terminate           | std::terminate             | 终止函数                        |
| std::terminate_handler   | terminate_handler          | 终止处理函数                    |
| std::unexpected          | std::unexpected            | 不预期异常处理                  |
| std::uncaught_exceptions | uncaught_exceptions        | 未捕获异常计数                  |
| 存储                     | Storage                    | 存储                            |
| 存储类                   | Storage Class              | 存储类                          |
| 存储持续                 | Storage Duration           | 存储持续期                      |
| 存储位置                 | Storage Location           | 存储位置                        |
| 跨度                     | Stride                     | 跨距                            |
| 字符串化                 | Stringification            | 字符串化                        |
| 字符串视图               | String View                | 字符串视图                      |
| 强类型                   | Strong Type                | 强类型                          |
| 强类型枚举               | Strong Enum                | 强类型枚举                      |
| 结构                     | Structure                  | 结构                            |
| 结构化绑定               | Structured Binding         | 结构化绑定                      |
| 结构化编程               | Structured Programming     | 结构化编程                      |
| 样式                     | Style                      | 样式                            |
| 子                       | Sub                        | 子                              |
| 子对象                   | Subobject                  | 子对象                          |
| 子范围                   | Subrange                   | 子范围                          |
| 子集                     | Subset                     | 子集                            |
| 子类型                   | Subtype                    | 子类型                          |
| 总结                     | Summary                    | 总结                            |
| 监督                     | Supervision                | 监督                            |
| 监督者                   | Supervisor                 | 监督者                          |
| 补充                     | Supplement                 | 补充                            |
| 支持                     | Support                    | 支持                            |
| 抑制                     | Suppression                | 抑制                            |
| 符号                     | Symbol                     | 符号                            |
| 对称                     | Symmetric                  | 对称的                          |
| 同步                     | Synchronization            | 同步                            |
| 同步队列                 | Synchronized Queue         | 同步队列                        |
| 句法                     | Syntax                     | 句法                            |
| 系统                     | System                     | 系统                            |
| 系统错误                 | System Error               | 系统错误                        |
| 表                       | Table                      | 表                              |
| 表格                     | Form                       | 表格                            |
| 标记                     | Tag                        | 标记                            |
| 标记类型                 | Tag Type                   | 标记类型                        |
| 目标                     | Target                     | 目标                            |
| 目标代码                 | Target Code                | 目标代码                        |
| 任务                     | Task                       | 任务                            |
| 任务图                   | Task Graph                 | 任务图                          |
| 临时对象                 | Temporary Object           | 临时对象                        |
| 临时量                   | Temporary                  | 临时量                          |
| 终止                     | Termination                | 终止                            |
| 终止条件                 | Termination Condition      | 终止条件                        |
| 测试                     | Testing                    | 测试                            |
| 测试驱动开发             | TDD                        | 测试驱动开发                    |
| 测试框架                 | Test Framework             | 测试框架                        |
| 测试用例                 | Test Case                  | 测试用例                        |
| 文本                     | Text                       | 文本                            |
| 文本编码                 | Text Encoding              | 文本编码                        |
| 主题                     | Theme                      | 主题                            |
| 线程                     | Thread                     | 线程                            |
| 线程安全                 | Thread Safety              | 线程安全                        |
| 线程局部                 | Thread Local               | 线程局部                        |
| 线程池                   | Thread Pool                | 线程池                          |
| 吞吐量                   | Throughput                 | 吞吐量                          |
| 时间                     | Time                       | 时间                            |
| 时间复杂度               | Time Complexity            | 时间复杂度                      |
| 时间点                   | Time Point                 | 时间点                          |
| 超时                     | Timeout                    | 超时                            |
| 时间戳                   | Timestamp                  | 时间戳                          |
| 提示                     | Tip                        | 提示                            |
| 标题                     | Title                      | 标题                            |
| 令牌                     | Token                      | 令牌                            |
| 工具                     | Tool                       | 工具                            |
| 追踪                     | Tracing                    | 追踪                            |
| 追踪器                   | Tracker                    | 追踪器                          |
| 传统                     | Traditional                | 传统的                          |
| 传统类型                 | Traditional Type           | 传统类型                        |
| 培训                     | Training                   | 培训                            |
| 特征                     | Trait                      | 特征                            |
| 特征类                   | Trait Class                | 特征类                          |
| 事务                     | Transaction                | 事务                            |
| 事务内存                 | Transactional Memory       | 事务内存                        |
| 变换                     | Transformation             | 变换                            |
| 转换                     | Transition                 | 转换                            |
| 平铺                     | Tiling                     | 平铺                            |
| 时间线                   | Timeline                   | 时间线                          |
| 提示                     | Hint                       | 提示                            |
| 提示                     | Prompt                     | 提示                            |
| 工具链                   | Toolchain                  | 工具链                          |
| 拓扑                     | Topology                   | 拓扑                            |
| 拓扑排序                 | Topological Sort           | 拓扑排序                        |
| 总量                     | Total                      | 总量                            |
| 追踪                     | Trace                      | 追踪                            |
| 追踪日志                 | Trace Log                  | 追踪日志                        |
| 传统                     | Legacy                     | 传统                            |
| 传统代码                 | Legacy Code                | 遗留代码                        |
| 生命周期                 | Lifetime                   | 生命周期                        |
| 类型                     | Type                       | 类型                            |
| 类型别名                 | Type Alias                 | 类型别名                        |
| 类型检查                 | Type Checking              | 类型检查                        |
| 类型类                   | Type Class                 | 类型类                          |
| 类型相容性               | Type Compatibility         | 类型相容                        |
| 类型约束                 | Type Constraint            | 类型约束                        |
| 类型转换                 | Type Conversion            | 类型转换                        |
| 类型识别                 | Type Identification        | 类型识别                        |
| 类型推断                 | Type Inference             | 类型推断                        |
| 类型信息                 | Type Information           | 类型信息                        |
| 类型不安全               | Type-unsafe                | 类型不安全                      |
| 类型化                   | Typed                      | 类型化                          |
| 类型化语言               | Typed Language             | 类型化语言                      |
| 典型                     | Typical                    | 典型的                          |
| 未定义                   | Undefined                  | 未定义                          |
| 未初始化                 | Uninitialized              | 未初始化                        |
| 统一                     | Uniform                    | 统一                            |
| 统一类型                 | Unifying Type              | 统一类型                        |
| 联合                     | Union                      | 联合                            |
| 唯一                     | Unique                     | 唯一                            |
| 唯一锁                   | Unique Lock                | 唯一锁                          |
| 唯一性                   | Uniqueness                 | 唯一性                          |
| 单位                     | Unit                       | 单位                            |
| 单元测试                 | Unit Test                  | 单元测试                        |
| 通用                     | Universal                  | 通用                            |
| 未知                     | Unknown                    | 未知                            |
| 不安全                   | Unsafe                     | 不安全                          |
| 非资源                   | Unaffiliated               | 无关联                          |
| 非别名                   | Unaliased                  | 非别名                          |
| 未使用                   | Unused                     | 未使用                          |
| 更新                     | Update                     | 更新                            |
| 上传                     | Upload                     | 上传                            |
| 用法                     | Usage                      | 用法                            |
| 用户                     | User                       | 用户                            |
| 用户定义                 | User-defined               | 用户定义                        |
| 用户异常                 | User Exception             | 用户异常                        |
| 用户代码                 | User Code                  | 用户代码                        |
| 用户空间                 | User Space                 | 用户空间                        |
| 验证                     | Validation                 | 验证                            |
| 验证器                   | Validator                  | 验证器                          |
| 值                       | Value                      | 值                              |
| 值语义                   | Value Semantics            | 值语义                          |
| 值类型                   | Value Type                 | 值类型                          |
| 值类别                   | Value Category             | 值类别                          |
| 可变                     | Variable                   | 可变                            |
| 变体                     | Variant                    | 变体                            |
| 向量                     | Vector                     | 向量                            |
| 版本                     | Version                    | 版本                            |
| 版本控制                 | Versioning                 | 版本控制                        |
| 顶点                     | Vertex                     | 顶点                            |
| 视图                     | View                       | 视图                            |
| 虚拟                     | Virtual                    | 虚拟                            |
| 虚拟继承                 | Virtual Inheritance        | 虚拟继承                        |
| 虚拟基类                 | Virtual Base Class         | 虚拟基类                        |
| 可见性                   | Visibility                 | 可见性                          |
| 警告                     | Warning                    | 警告                            |
| 水印                     | Watermark                  | 水印                            |
| 弱                       | Weak                       | 弱                              |
| 弱顺序                   | Weak Ordering              | 弱顺序                          |
| 弱指针                   | Weak Pointer               | 弱指针                          |
| 宽度                     | Width                      | 宽度                            |
| 工作                     | Work                       | 工作                            |
| 工作队列                 | Work Queue                 | 工作队列                        |
| 工作窃取                 | Work Stealing              | 工作窃取                        |
| 工作线程                 | Worker Thread              | 工作线程                        |
| 世界                     | World                      | 世界                            |
| 写入                     | Write                      | 写入                            |
| 写入权限                 | Write Permission           | 写入权限                        |
| 年                       | Year                       | 年                              |
| yield                    | yield                      | 让步                            |
| 区域                     | Zone                       | 区域                            |
