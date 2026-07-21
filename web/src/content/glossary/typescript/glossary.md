---
title: 'TypeScript 专有名词查阅表'
module: 'typescript'
category: 'typescript'
description: 'TypeScript 专有名词注释查阅表，涵盖类型系统、泛型、装饰器等'
author: 'fanquanpp'
updated: '2026-05-29'
---

## 名词列表

### core 核心基础术语

| 术语         | 英文                     | 释义                                           |
| ------------ | ------------------------ | ---------------------------------------------- |
| 断言         | Assertion                | 强制将值视为特定类型，用 `as` 或 `<Type>` 语法 |
| 自动类型检测 | Automatic Type Detection | TypeScript 自动推断变量类型                    |
| 类型别名     | Type Alias               | 用 `type` 关键字为复杂类型创建简短的名称       |
| 字面量类型   | Literal Type             | 精确到具体值的类型，如 `"success"` 或 `123`    |
| 变量声明     | Variable Declaration     | 用 `let`、`const` 声明带类型的变量             |

### B

| 术语     | 英文      | 释义                                        |
| -------- | --------- | ------------------------------------------- |
| 基元类型 | Base Type | 如 `string`、`number`、`boolean` 的基础类型 |
| 绑定     | Binding   | 将值与标识符关联                            |

### C

| 术语       | 英文                  | 释义                                         |
| ---------- | --------------------- | -------------------------------------------- |
| 类别名     | Category Name         | 类型别名定义中的类型名称                     |
| 类别       | Category              | 术语分类                                     |
| 编译错误   | Compile Error         | 代码无法通过 TypeScript 编译器检查           |
| 编译器选项 | Compiler Option       | tsconfig.json 中的编译配置项                 |
| 条件类型   | Conditional Type      | 根据条件选择类型的语法 `T extends U ? X : Y` |
| 控制流分析 | Control Flow Analysis | 追踪变量类型在代码中的变化                   |

### D

| 术语         | 英文                   | 释义                                       |
| ------------ | ---------------------- | ------------------------------------------ |
| 类型声明     | Declaration            | 定义类型结构的语法                         |
| 声明合并     | Declaration Merging    | 多个声明自动合并为单一类型                 |
| 声明文件     | Declaration File       | `.d.ts` 文件，用于为 JavaScript 库提供类型 |
| 推断类型     | Deduced Type           | TypeScript 自动推断出的类型                |
| 默认类型参数 | Default Type Parameter | 泛型参数未指定时的默认类型                 |
| 可调用的     | Callable               | 可以像函数一样调用的类型                   |
| 维度         | Dimension              | 数组或元组的嵌套层数                       |

### E

| 术语         | 英文                     | 释义                              |
| ------------ | ------------------------ | --------------------------------- |
| 枚举         | Enum                     | 一组命名常量的集合                |
| 枚举成员     | Enum Member              | 枚举中的单个常量                  |
| 环境声明     | Ambient Declaration      | 用 `declare` 声明变量或模块的存在 |
| 显式类型注解 | Explicit Type Annotation | 手动添加的类型标注                |

### F

| 术语     | 英文               | 释义                       |
| -------- | ------------------ | -------------------------- |
| 字段     | Field              | 类或接口中的属性           |
| 函数类型 | Function Type      | 描述函数参数和返回值的类型 |
| 函数签名 | Function Signature | 函数的参数和返回类型定义   |

### G

| 术语     | 英文              | 释义                            |
| -------- | ----------------- | ------------------------------- |
| 类型参数 | Generic Parameter | 泛型尖括号中的类型变量          |
| 类型约束 | Type Constraint   | 用 `extends` 限制泛型参数的范围 |
| 字面量   | Literal           | 直接写出的固定值                |

### H

| 术语     | 英文        | 释义                             |
| -------- | ----------- | -------------------------------- |
| 层级     | Hierarchy   | 类型继承的层级结构               |
| 顶级类型 | Top Type    | 可接受任何值的类型，如 `unknown` |
| 底层类型 | Bottom Type | 不可能存在的类型，如 `never`     |

### I

| 术语       | 英文                | 释义                                    |
| ---------- | ------------------- | --------------------------------------- |
| 索引签名   | Index Signature     | `[key: string]: valueType` 动态属性类型 |
| 索引类型   | Indexed Access Type | 用 `T[K]` 获取属性类型                  |
| 推断       | Inference           | TypeScript 自动推导类型                 |
| 继承       | Inheritance         | 类型从父类获取结构                      |
| 接口       | Interface           | 定义对象结构的类型契约                  |
| 不可调用的 | Uncallable          | 不能作为函数调用的类型                  |

### J

| 术语      | 英文      | 释义                            |
| --------- | --------- | ------------------------------- |
| JSX       | JSX       | JavaScript 中的 XML 语法扩展    |
| JSON 类型 | JSON Type | JSON 数据结构的 TypeScript 类型 |

### K

| 术语   | 英文    | 释义                      |
| ------ | ------- | ------------------------- |
| 关键字 | Keyword | TypeScript 保留的特殊单词 |

### L

| 术语       | 英文              | 释义                   |
| ---------- | ----------------- | ---------------------- |
| 级别       | Level             | 类型系统的层级         |
| 字面量类型 | Literal Type      | 精确到具体值的类型     |
| 字面量推断 | Literal Inference | 从字面量值推断精确类型 |

### M

| 术语     | 英文             | 释义                                  |
| -------- | ---------------- | ------------------------------------- |
| 映射类型 | Mapped Type      | 从现有类型创建新类型，如 `Partial<T>` |
| 成员     | Member           | 类、接口或类型的属性或方法            |
| 元组     | Tuple            | 固定长度和类型的数组                  |
| 多态类型 | Polymorphic Type | 泛型类的实例类型                      |

### N

| 术语     | 英文               | 释义                             |
| -------- | ------------------ | -------------------------------- |
| 命名空间 | Namespace          | 组织代码的类型和命名             |
| 命名类型 | Named Type         | 有名称的类型别名或接口           |
| 嵌套     | Nested             | 嵌套在其他类型中的类型           |
| 新建类型 | Newable            | 可以用 `new` 调用的类型          |
| 非空断言 | Non-null Assertion | 用 `!` 断言值不为 null/undefined |
| 数字枚举 | Numeric Enum       | 值为数字的枚举                   |
| 可实例化 | Instantiable       | 可创建实例的类型                 |

### O

| 术语         | 英文              | 释义                             |
| ------------ | ----------------- | -------------------------------- |
| 对象类型     | Object Type       | 非原始类型的复合类型             |
| 可选属性     | Optional Property | 用 `?` 标记的可选属性            |
| 可选链       | Optional Chaining | `?.` 安全访问可能为 null 的属性  |
| 原始类型     | Primitive Type    | string/number/boolean 等基础类型 |
| 纯字符串枚举 | Plain String Enum | 普通字符串值的枚举               |

### P

| 术语     | 英文             | 释义                           |
| -------- | ---------------- | ------------------------------ |
| 解析类型 | Resolved Type    | 最终解析后的类型               |
| 参数类型 | Parameter Type   | 函数参数的类型                 |
| 父类型   | Parent Type      | 被扩展或实现的类型             |
| 部分类型 | Partial Type     | 所有属性变为可选的类型         |
| 路径映射 | Path Mapping     | tsconfig.json 中的路径别名配置 |
| 混入     | Mixin            | 组合多个类功能的模式           |
| 缺少属性 | Missing Property | 预期存在但缺失的属性           |
| 混入类   | Mixin Class      | 用混入模式创建的类             |

### Q

| 术语   | 英文           | 释义                 |
| ------ | -------------- | -------------------- |
| 限定名 | Qualified Name | 带命名空间前缀的名称 |

### R

| 术语     | 英文              | 释义                             |
| -------- | ----------------- | -------------------------------- |
| 只读属性 | Readonly Property | 用 `readonly` 标记的不可修改属性 |
| 只读数组 | Readonly Array    | 不能修改内容的数组               |
| 只读元组 | Readonly Tuple    | 不能修改内容的元组               |
| 只读类型 | Readonly Type     | 所有属性变为只读的类型           |
| 递归类型 | Recursive Type    | 引用自身的类型定义               |
| 引用类型 | Reference Type    | 引用其他类型定义的类型           |
| 必需属性 | Required Property | 不可省略的属性                   |
| 只读     | Readonly          | 标记属性或数组不可修改           |

### S

| 术语         | 英文               | 释义                           |
| ------------ | ------------------ | ------------------------------ |
| 语义         | Semantic           | 类型的含义                     |
| 集合类型     | Set Type           | 描述集合操作的类型             |
| 形状         | Shape              | 对象的结构                     |
| 签名         | Signature          | 函数或方法的类型定义           |
| 单一类型     | Singular Type      | 不是联合类型的类型             |
| 源码映射     | Source Map         | `.map` 文件，用于调试          |
| 静态类型     | Static Type        | 编译时确定的类型               |
| 严格空值检查 | Strict Null Checks | 严格检查 null/undefined 的配置 |
| 结构化类型   | Structural Typing  | 只关心结构而非名称的类型系统   |
| 下层类型     | Subtype            | 类型层级中的子类型             |

### T

| 术语       | 英文               | 释义                            |
| ---------- | ------------------ | ------------------------------- |
| 类型注解   | Type Annotation    | 用 `:` 标注的类型               |
| 类型参数   | Type Argument      | 调用泛型时传入的具体类型        |
| 类型断言   | Type Assertion     | 强制将值视为特定类型            |
| 类型分支   | Type Branch        | 联合类型中的一种可能类型        |
| 类型链     | Type Chain         | 连续的类型操作链                |
| 类型兼容性 | Type Compatibility | 一个类型能否赋值给另一个类型    |
| 类型推断   | Type Inference     | 从上下文自动推导类型            |
| 类型名称   | Type Name          | 类型定义中的名称                |
| 类型运算符 | Type Operator      | `keyof`、`typeof` 等类型操作符  |
| 类型参数   | Type Parameter     | 泛型中待填充的类型位置          |
| 类型谓词   | Type Predicate     | 用 `is Type` 标注的函数返回类型 |
| 类型脚本   | TypeScript         | JavaScript 的超集，增加静态类型 |
| 类型别名   | Type Alias         | 用 `type` 创建的类型简写        |
| 类型守卫   | Type Guard         | 在条件中缩小类型范围            |

### U

| 术语 | 英文 | 释义 |
| ------------ | ------------------ | ----------------------------- | --- |
| 并集类型 | Union Type | 多种类型之一，`T              | U` |
| 唯一成员枚举 | Unique Enum Member | 枚举中唯一的成员 |
| 唯一符号 | Unique Symbol | 唯一的符号类型 |
| 未知类型 | Unknown Type | 顶级类型，必须先检查才能使用 |
| 非空类型 | Non-null Type | 排除 null 和 undefined 的类型 |

### V

| 术语 | 英文       | 释义                 |
| ---- | ---------- | -------------------- |
| 验证 | Validation | 检查类型是否满足约束 |

### W

| 术语     | 英文       | 释义                 |
| -------- | ---------- | -------------------- |
| 弱类型   | Weak Type  | 有可选属性的对象类型 |
| 整体类型 | Whole Type | 不是部分类型的类型   |

### stdlib 标准库术语

| 术语               | 英文                  | 释义                               |
| ------------------ | --------------------- | ---------------------------------- |
| 任意类型           | Any Type              | 绕过类型检查的类型                 |
| 数组类型           | Array Type            | 同类型元素集合的类型               |
| BigInt             | BigInt                | 大整数类型                         |
| Boolean            | Boolean               | 布尔类型 true/false                |
| 构造函数           | Constructor Type      | 描述构造函数的类型                 |
| 函子               | Functor               | 可映射的类型                       |
| 函子               | Functor               | 可以 map 的类型                    |
| 交集类型           | Intersection Type     | 多个类型合并，`T & U`              |
| Never              | Never                 | 不可能到达的类型                   |
| Null               | Null                  | 空值类型                           |
| Number             | Number                | 数字类型                           |
| Object             | Object                | 非原始类型的对象类型               |
| 装饰器元数据       | Decorator Metadata    | 装饰器相关的类型定义               |
| 记录类型           | Record Type           | 键值对类型 `Record<K, V>`          |
| 正则表达式类型     | RegExp Type           | 正则表达式类型                     |
| Require 至少有一个 | Require At Least One  | 至少包含一个属性的类型             |
| Require 只这些     | Require Exactly These | 只允许特定属性的类型               |
| String             | String                | 字符串类型                         |
| Symbol             | Symbol                | 唯一符号类型                       |
| This 类型          | This Type             | 表示 this 的类型                   |
| 三元运算符         | Ternary Operator      | `condition ? trueType : falseType` |
| Tuple              | Tuple                 | 固定长度数组类型                   |
| TypeScript         | TypeScript            | JavaScript 超集语言                |
| Undefined          | Undefined             | 未定义类型                         |
| Void               | Void                  | 无返回值函数的类型                 |

### advanced 高级进阶术语

| 术语              | 英文                                    | 释义                                   |
| ----------------- | --------------------------------------- | -------------------------------------- |
| 抽象类            | Abstract Class                          | 不能直接实例化，只能被继承的类         |
| 抽象语法树        | AST / Abstract Syntax Tree              | 代码的树形表示                         |
| 访问器            | Accessor                                | getter 和 setter 方法                  |
| 访问器属性        | Accessor Property                       | 用存取器定义的属性                     |
| 累计参数          | Accumulating Parameter                  | 在回调中累积值的参数                   |
| 累计参数          | Accumulation Parameter                  | 递归函数中累计结果的参数               |
| 聚合操作          | Aggregate Operation                     | 组合多个值的操作                       |
| 聚合类型          | Aggregate Type                          | 组合多个类型的类型                     |
| 全部为真          | All                                     | 联合类型所有成员                       |
| 分析器            | Analyzer                                | 分析代码类型的工具                     |
| 注解              | Annotation                              | 类型标注                               |
| API 表面          | API Surface                             | 模块对外暴露的接口                     |
| 应用程序接口      | API / Application Programming Interface | 模块间交互的接口定义                   |
| 编译时            | Compile Time                            | 代码被编译的阶段                       |
| 编译步骤          | Compilation Step                        | 编译过程中的一个阶段                   |
| 编译器            | Compiler                                | 将 TypeScript 转换为 JavaScript 的工具 |
| 编译器选项        | Compiler Option                         | 控制编译行为的配置                     |
| 条件编译          | Conditional Compilation                 | 根据条件选择性编译代码                 |
| 条件导出          | Conditional Export                      | 根据条件决定导出的模块                 |
| 条件扩展          | Conditional Extension                   | 根据类型条件选择扩展                   |
| 构造签名          | Construct Signature                     | 用 `new` 调用的函数签名                |
| 构造函数          | Constructor                             | 初始化对象的函数                       |
| 消费者            | Consumer                                | 使用类型的一方                         |
| 上下文类型        | Contextual Type                         | 根据上下文推断的类型                   |
| 契约              | Contract                                | 接口定义的约束                         |
| 协变              | Covariance                              | 类型方向一致的变化                     |
| 覆盖              | Coverage                                | 类型覆盖代码的比例                     |
| 关键类型          | Critical Type                           | 类型检查的关键点                       |
| 自定义可调用类型  | Custom Callable Type                    | 用户定义的函数类型                     |
| 数据属性          | Data Property                           | 存储值的属性                           |
| 装饰器            | Decorator                               | `@expression` 语法，用于修改类或属性   |
| 装饰器工厂        | Decorator Factory                       | 返回装饰器函数的函数                   |
| 默认类型          | Default Type                            | 未指定时的默认类型                     |
| 延迟类型          | Deferred Type                           | 等待进一步推断的类型                   |
| 派生子类型        | Derived Type                            | 从基类派生的类型                       |
| 派生类型          | Derived Type                            | 基于现有类型创建的新类型               |
| 检测函数          | Detection Function                      | 检测某个类型是否存在                   |
| 检测签名          | Detection Signature                     | 用于类型检测的签名                     |
| 检测类型          | Detection Type                          | 用于条件类型的检测类型                 |
| 可分发条件类型    | Distributive Conditional Type           | 联合类型自动分发的条件类型             |
| 声明              | Declaration                             | 定义类型的语法                         |
| 声明文件          | Declaration File                        | .d.ts 文件提供类型信息                 |
| 双重断言          | Double Assertion                        | 用 `as unknown as T` 的断言            |
| 动态导入          | Dynamic Import                          | `import()` 语法按需加载                |
| 动态类型          | Dynamic Type                            | 运行时确定的类型                       |
| 编辑器集成        | Editor Integration                      | IDE 对 TypeScript 的支持               |
| 元素类型          | Element Type                            | 数组元素的类型                         |
| 空类型            | Empty Type                              | 没有任何成员的类型                     |
| 空值安全          | Empty Safety                            | 处理 null/undefined 的安全方式         |
| 枚举映射          | Enum Map                                | 枚举值到类型的映射                     |
| 环境声明          | Ambient Declaration                     | 声明外部存在的类型                     |
| 环境模块声明      | Ambient Module Declaration              | 声明外部模块的类型                     |
| 等价              | Equivalence                             | 类型 A 等价于类型 B                    |
| 错误类型          | Error Type                              | 表示编译错误的特殊类型                 |
| 真实子类型        | True Subtype                            | 真正的子类型                           |
| 导出              | Export                                  | 从模块暴露类型或值                     |
| 显式类型          | Explicit Type                           | 明确标注的类型                         |
| 表达式类型        | Expression Type                         | 表达式的结果类型                       |
| 扩展              | Extension                               | 继承或实现                             |
| 扩展类型          | Extended Type                           | 被扩展的类型                           |
| 外部模块          | External Module                         | 有明确导入/导出的模块                  |
| 回退类型          | Fallback Type                           | 类型推断失败时的备选类型               |
| 特征              | Feature                                 | 语言特性                               |
| 字段              | Field                                   | 类或对象的属性                         |
| 文件声明          | File Declaration                        | 对整个文件的声明                       |
| 固有的            | Intrinsic                               | 语言内置的，无法用 TypeScript 模拟     |
| 渐进式            | Gradual                                 | 逐步添加类型                           |
| 渐进式类型        | Gradual Typing                          | 从 any 开始逐步具体化                  |
| 泛型              | Generic                                 | 参数化的类型                           |
| 泛型参数          | Generic Argument                        | 传递给泛型的类型                       |
| 泛型约束          | Generic Constraint                      | 限制泛型参数的范围                     |
| 泛型声明          | Generic Declaration                     | 包含类型参数的声明                     |
| 全局声明          | Global Declaration                      | 全局作用域的声明                       |
| 全局模块          | Global Module                           | 包含全局声明的文件                     |
| 全局类型          | Global Type                             | 全局可用的类型                         |
| 类型              | Type                                    | 数据的分类                             |
| 类型推断          | Type Inference                          | 自动推导类型                           |
| 类型层级          | Type Hierarchy                          | 类型的继承关系                         |
| 类型检查          | Type Checking                           | 验证类型正确性                         |
| 类型保护          | Type Guard                              | 缩小类型范围的条件                     |
| 类型别名声明      | Type Alias Declaration                  | 定义类型别名的声明                     |
| 类型兼容性        | Type Compatibility                      | 类型之间的赋值兼容性                   |
| 类型折叠          | Type Folding                            | 简化嵌套类型                           |
| 类型函数          | Type Function                           | 接受类型返回类型的函数                 |
| 类型操作          | Type Manipulation                       | 操作类型创建新类型                     |
| 类型操作符        | Type Operator                           | 操作类型的运算符                       |
| 类型参数声明      | Type Parameter Declaration              | 声明类型参数                           |
| 类型参数作用域    | Type Parameter Scope                    | 类型参数可见的范围                     |
| 类型谓词          | Type Predicate                          | 返回布尔类型的谓词                     |
| 类型引用          | Type Reference                          | 引用已定义的类型                       |
| 类型脚本          | TypeScript                              | Microsoft 开发的类型化 JavaScript      |
| 统一类型          | Unifying Type                           | 多种类型的共同父类型                   |
| 联合类型          | Union Type                              | 多种可能类型的组合                     |
| 特殊类型          | Special Type                            | 如 any、unknown、never                 |
| 状态参数          | State Parameter                         | 携带状态的参数                         |
| 严格模式          | Strict Mode                             | 启用所有严格类型检查                   |
| 严格空值检查      | Strict Null Checks                      | 严格检查 null/undefined                |
| 字符串枚举        | String Enum                             | 字符串值的枚举                         |
| 结构类型          | Structural Type                         | 只关心结构不关心名称                   |
| 结构化类型系统    | Structural Type System                  | 基于结构的类型系统                     |
| 替代签名          | Substitution Signature                  | 用于类型替换的签名                     |
| 符号类型          | Symbol Type                             | Symbol 原始类型                        |
| 语法              | Syntax                                  | 代码的结构规则                         |
| 语法糖            | Syntactic Sugar                         | 简化代码的语法                         |
| 目标类型          | Target Type                             | 类型操作的目标                         |
| 模板字面量类型    | Template Literal Type                   | 模板字符串形式的类型                   |
| this 参数         | This Parameter                          | 函数中 this 的类型标注                 |
| this 类型         | This Type                               | 引用当前类型的类型                     |
| 工具类型          | Utility Type                            | TypeScript 内置的类型工具              |
| 变换              | Transformation                          | 编译时的代码转换                       |
| 变换步骤          | Transformation Step                     | 编译转换的一个步骤                     |
| 类型参数          | Type Argument                           | 传递给泛型的实际类型                   |
| 未推断的类型      | Unannotated Type                        | 没有类型注解的类型                     |
| 未知类型          | Unknown Type                            | 顶级类型，必须先检查                   |
| 上层类型          | Supertype                               | 类型层级中的父类型                     |
| 可辨识联合        | Discriminated Union                     | 有公共字面量属性的联合类型             |
| 变体              | Variance                                | 类型参数的方向关系                     |
| 协变参数          | Covariant Parameter                     | 只能输出的参数位置                     |
| 逆变参数          | Contravariant Parameter                 | 只能输入的参数位置                     |
| 双重变体          | Bivariant Parameter                     | 输入输出都可以的参数位置               |
| 视图              | View                                    | 数据的只读表示                         |
| 虚拟类型          | Virtual Type                            | 不实际存在仅用于类型运算的类型         |
| 弱类型检测        | Weak Type Detection                     | 检测弱类型                             |
| 关键字            | Keyword                                 | 语言保留的单词                         |
| 词法作用域        | Lexical Scope                           | 编译时确定的作用域                     |
| 生命周期          | Lifetime                                | 值的有效时间范围                       |
| 宏                | Macro                                   | 编译时执行的代码转换                   |
| 映射              | Mapping                                 | 从一种类型创建另一种类型               |
| 映射类型          | Mapped Type                             | 映射现有类型创建新类型                 |
| 标记接口          | Marker Interface                        | 仅用于标记的空接口                     |
| 标记类型          | Marker Type                             | 仅用于类型标记的特殊类型               |
| 成员类型          | Member Type                             | 联合或交叉类型的成员                   |
| 元类型            | Meta Type                               | 描述类型的类型                         |
| 方法签名          | Method Signature                        | 方法的类型定义                         |
| 模块              | Module                                  | 有独立作用域的代码单元                 |
| 模块脚            | Module Foot                             | 模块导出的部分                         |
| 模块头            | Module Head                             | 模块导入的部分                         |
| 名字类型          | Nameable Type                           | 可以有名称的类型                       |
| 命名空间          | Namespace                               | 组织代码的容器                         |
| 命名空间路径      | Namespace Path                          | 如 `A.B.C` 的路径                      |
| 命名类型          | Named Type                              | 有名称的类型                           |
| 自然类型          | Natural Type                            | 变量本来的类型                         |
| next 类型         | Next Type                               | 下一个版本中的类型                     |
| 节点              | Node                                    | 语法树中的节点                         |
| 空类型            | Null Type                               | null 值类型                            |
| 对象解构          | Object Destructuring                    | 从对象提取属性                         |
| 对象字面量        | Object Literal                          | `{}` 直接创建的对象                    |
| 对象类型          | Object Type                             | 描述对象结构                           |
| Omit              | Omit                                    | 排除部分属性的类型                     |
| One               | One                                     | 非空类型                               |
| 仅导出类型        | Only Types                              | 只导出类型                             |
| 操作符重载        | Operator Overloading                    | 为不同类型定义同名操作                 |
| 可选链            | Optional Chaining                       | `?.` 安全访问                          |
| 可选参数          | Optional Parameter                      | 可以省略的参数                         |
| 可选属性          | Optional Property                       | 可以缺失的属性                         |
| 可选性质          | Optionality                             | 是否可选                               |
| 排序键            | Ordering Key                            | 排序的依据                             |
| 覆盖类型          | Overriding Type                         | 覆盖的属性类型                         |
| 参数属性          | Parameter Property                      | 在构造函数参数中声明属性               |
| 参数类型          | Parameter Type                          | 参数的类型                             |
| 部分类型          | Partial                                 | 将所有属性变为可选                     |
| Passkey           | Passkey                                 | 确保参数唯一的类型技巧                 |
| 路径映射          | Path Mapping                            | 配置模块路径别名                       |
| 范型              | Generic                                 | 参数化类型的概念                       |
| 范型约束          | Generic Constraint                      | 限制泛型参数                           |
| 范型实例          | Generic Instance                        | 具体化的泛型类型                       |
| 平面化            | Flattening                              | 简化嵌套类型                           |
| 多重类型参数      | Multiple Type Parameters                | 多个泛型参数                           |
| Pick              | Pick                                    | 选取部分属性                           |
| 多态              | Polymorphism                            | 同一接口多种实现                       |
| 位置参数          | Positional Argument                     | 按位置传递的参数                       |
| Postfix           | Postfix                                 | 类型操作的后缀                         |
| Prefix            | Prefix                                  | 类型操作的前缀                         |
| 前置条件          | Precondition                            | 函数执行前的条件                       |
| 主类型            | Primary Type                            | 主要的类型分类                         |
| Producer          | Producer                                | 产生数据的代码                         |
| 产品类型          | Product Type                            | 交叉类型                               |
| Project           | Project                                 | 编译单位                               |
| 投影              | Projection                              | 从高维度到低维度                       |
| Promise           | Promise                                 | 异步操作的类型                         |
| Promise 类型      | Promise Type                            | Promise 的泛型类型                     |
| 属性类型          | Property Type                           | 属性值的类型                           |
| 防护              | Protection                              | 访问控制修饰符                         |
| 协议              | Protocol                                | 接口的另一个名称                       |
| 提供者            | Provider                                | 提供数据的代码                         |
| 只读属性          | Readonly Property                       | 不可修改的属性                         |
| 记录              | Record                                  | 键值对集合类型                         |
| 递归              | Recursion                               | 类型引用自身                           |
| 引用              | Reference                               | 指向已定义类型的名称                   |
| 引用参数          | Reference Parameter                     | 引用传递的参数                         |
| Region            | Region                                  | 代码区域标记                           |
| 关系运算符        | Relational Operator                     | 比较运算符                             |
| Relection         | Reflection                              | 运行时获取类型信息                     |
| 重载              | Overload                                | 多个同名的类型签名                     |
| 重载解析          | Overload Resolution                     | 选择匹配的重载签名                     |
| 重载签名          | Overload Signature                      | 重载函数的类型定义                     |
| Package           | Package                                 | npm 包                                 |
| 参数              | Argument                                | 实际传递的值                           |
| 参数              | Parameter                               | 函数定义的占位符                       |
| 参数列表          | Parameter List                          | 函数参数的列表                         |
| 参数类型          | Argument Type                           | 实参的类型                             |
| 参数化            | Parameterized                           | 带有类型参数                           |
| Parent            | Parent                                  | 父节点或父类型                         |
| Parse             | Parse                                   | 解析代码为 AST                         |
| Partial           | Partial                                 | 可选所有属性                           |
| 权限              | Permission                              | 访问控制                               |
| Permitted         | Permitted                               | 允许的类型                             |
| Picked            | Picked                                  | Pick 后的类型                          |
| 位置类型          | Position Type                           | 元组中特定位置的类型                   |
| 正向              | Positive                                | 确保非空                               |
| Prefix            | Prefix                                  | 类型的前缀                             |
| 预测类型          | Predicate Type                          | 类型谓词                               |
| Primary           | Primary                                 | 基础类型                               |
| Producer          | Producer                                | 数据生产者                             |
| Product           | Product                                 | 交叉类型                               |
| Program           | Program                                 | 编译单位                               |
| Projection        | Projection                              | 类型投影                               |
| Promised          | Promised                                | Promise 包装后的类型                   |
| Property          | Property                                | 对象属性                               |
| Protection        | Protection                              | 访问保护                               |
| Provider          | Provider                                | 数据提供者                             |
| 纯类型            | Pure Type                               | 纯粹的类型操作                         |
| Qualified         | Qualified                               | 限定的名称                             |
| Qualifier         | Qualifier                               | 限定符                                 |
| 范围类型          | Range Type                              | 取值范围的类型                         |
| Readonly          | Readonly                                | 只读属性标记                           |
| Record            | Record                                  | Record 类型                            |
| Recoverable       | Recoverable                             | 可恢复的错误                           |
| Recursive         | Recursive                               | 递归类型                               |
| Reduced           | Reduced                                 | reduce 后的类型                        |
| Refined           | Refined                                 | 缩小范围后的类型                       |
| Regular           | Regular                                 | 正则表达式                             |
| Related           | Related                                 | 相关的类型                             |
| Required          | Required                                | 必需属性类型                           |
| Rest              | Rest                                    | 剩余参数                               |
| Result            | Result                                  | 结果类型                               |
| Return            | Return                                  | 返回类型                               |
| Reusable          | Reusable                                | 可重用的泛型                           |
| Rewriter          | Rewriter                                | AST 重写器                             |
| Safe              | Safe                                    | 类型安全的                             |
| Schema            | Schema                                  | 类型模式                               |
| Scope             | Scope                                   | 作用域                                 |
| Secondary         | Secondary                               | 次要类型                               |
| Selector          | Selector                                | 选择器类型                             |
| Semantic          | Semantic                                | 语义类型                               |
| Semigroup         | Semigroup                               | 代数结构                               |
| Sense             | Sense                                   | 类型方向                               |
| Separated         | Separated                               | 分离的类型                             |
| Sequence          | Sequence                                | 序列类型                               |
| Series            | Series                                  | 连续的类型                             |
| Service           | Service                                 | 服务类型                               |
| Session           | Session                                 | 会话类型                               |
| Setter            | Setter                                  | 设置器                                 |
| Shape             | Shape                                   | 类型结构                               |
| Signature         | Signature                               | 函数签名                               |
| Simplified        | Simplified                              | 简化后的类型                           |
| Source            | Source                                  | 源类型                                 |
| Specialized       | Specialized                             | 特化的类型                             |
| Split             | Split                                   | 分割类型                               |
| Spread            | Spread                                  | 展开类型                               |
| State             | State                                   | 状态类型                               |
| Static            | Static                                  | 静态成员                               |
| Step              | Step                                    | 编译步骤                               |
| Storage           | Storage                                 | 存储类型                               |
| Strategy          | Strategy                                | 策略类型                               |
| Stream            | Stream                                  | 流类型                                 |
| String Literal    | String Literal                          | 字符串字面量类型                       |
| String Mapping    | String Mapping                          | 字符串映射                             |
| Structural        | Structural                              | 结构类型                               |
| Sub               | Sub                                     | 子类型                                 |
| Subject           | Subject                                 | 主题类型                               |
| Substituted       | Substituted                             | 替换后的类型                           |
| Subtype           | Subtype                                 | 子类型                                 |
| Sum               | Sum                                     | 和类型                                 |
| Sum Type          | Sum Type                                | 联合类型                               |
| Super             | Super                                   | 父类型                                 |
| Super type        | Super type                              | 超类型                                 |
| Supply            | Supply                                  | 提供类型                               |
| Symbol            | Symbol                                  | 符号类型                               |
| Tagged            | Tagged                                  | 标记类型                               |
| Tagged Union      | Tagged Union                            | 可辨识联合                             |
| Target            | Target                                  | 目标类型                               |
| Task              | Task                                    | 任务类型                               |
| Template          | Template                                | 模板                                   |
| Template Literal  | Template Literal                        | 模板字面量                             |
| Term              | Term                                    | 类型项                                 |
| Token             | Token                                   | 词法单元                               |
| Transform         | Transform                               | 类型变换                               |
| Transitive        | Transitive                              | 可传递的                               |
| Transitive Type   | Transitive Type                         | 传递类型                               |
| Transparent       | Transparent                             | 透明类型                               |
| Transposed        | Transposed                              | 转置类型                               |
| Type              | Type                                    | 类型                                   |
| Type Alias        | Type Alias                              | 类型别名                               |
| Type Argument     | Type Argument                           | 类型参数                               |
| Type Checking     | Type Checking                           | 类型检查                               |
| Type Constructor  | Type Constructor                        | 类型构造器                             |
| Type Expression   | Type Expression                         | 类型表达式                             |
| Type Function     | Type Function                           | 类型函数                               |
| Type Guard        | Type Guard                              | 类型守卫                               |
| Type Inference    | Type Inference                          | 类型推断                               |
| Type Manipulation | Type Manipulation                       | 类型操作                               |
| Type Operator     | Type Operator                           | 类型操作符                             |
| Type Parameter    | Type Parameter                          | 类型参数                               |
| Type Predicate    | Type Predicate                          | 类型谓词                               |
| Type Query        | Type Query                              | 类型查询 typeof                        |
| Type Reference    | Type Reference                          | 类型引用                               |
| Type Variable     | Type Variable                           | 类型变量                               |
| Typestate         | Typestate                               | 基于状态类型                           |
| Unary             | Unary                                   | 一元                                   |
| Unconstrained     | Unconstrained                           | 无约束的                               |
| Union             | Union                                   | 联合类型                               |
| Unknown           | Unknown                                 | 未知类型                               |
| Unordered         | Unordered                               | 无序类型                               |
| Unsafe            | Unsafe                                  | 不安全的                               |
| Upper             | Upper                                   | 上界                                   |
| Upper Bound       | Upper Bound                             | 类型上界                               |
| Usage             | Usage                                   | 类型使用                               |
| Valid             | Valid                                   | 有效类型                               |
| Validation        | Validation                              | 类型验证                               |
| Value             | Value                                   | 值                                     |
| Value Type        | Value Type                              | 值类型                                 |
| Variance          | Variance                                | 变型                                   |
| Variant           | Variant                                 | 变体                                   |
| Variadic          | Variadic                                | 可变参数                               |
| Visibility        | Visibility                              | 可见性                                 |
| Void              | Void                                    | 空类型                                 |
| Widen             | Widen                                   | 拓宽类型                               |
| Widened           | Widened                                 | 拓宽后的类型                           |
| Wildcard          | Wildcard                                | 通配符                                 |
| With              | With                                    | 添加属性                               |
| Zero              | Zero                                    | 零类型                                 |
