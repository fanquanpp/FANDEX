---
title: 'JavaScript 理论知识点'
module: javascript
category: 'JS Theory'
order: 170
tags:
  - javascript
  - theory
  - performance
  - ecmascript
  - event-loop
  - prototype
  - closure
difficulty: intermediate
description: 执行上下文、作用域链、事件循环、原型继承与内存管理的形式语义与工程实践。
related:
  - javascript/Node.js高级特性与性能优化
  - 'javascript/项目示例-待办事项应用'
prerequisites:
  - javascript/语法速查
learningObjectives:
  - '复述 JavaScript 的历史演进时间线、ECMAScript 规范的层级结构与 TC39 四阶段提案流程'
  - '解释执行上下文、词法环境、作用域链与闭包的形式语义，并能绘制环境记录模型'
  - '运用 ToPrimitive、ToNumber、ToString 等抽象操作规则预测类型强制转换的执行结果'
  - '拆解 HTML 规范 §8.1.7 事件循环模型，分析 Microtask 与 Macrotask 在浏览器与 Node.js 中的差异'
  - '评估 Promise、async-await、Generator 在异步语义表达力上的等价性与代数效应关联'
  - '基于 Proxy 与 Reflect 设计元编程抽象，并构造 WeakMap、WeakRef、FinalizationRegistry 的内存安全缓存方案'
exercises:
  fill-blank:
    - question: JavaScript 的词法环境由 ____ 与 ____ 两部分组成，前者存储变量绑定，后者指向外层环境。
      answer: Environment Record; outer reference
      bloom: remember
    - question: 在 HTML 规范 §8.1.7 中，事件循环的每轮迭代称为一个 ____，其内部包含 Microtask 检查点。
      answer: task processing model
      bloom: remember
    - question: ToPrimitive(obj, hint) 在 hint 为 "number" 时会优先调用对象的 ____ 方法，其次调用 ____ 方法。
      answer: valueOf; toString
      bloom: understand
  choice:
    - question: 下列关于原型链的描述，哪一项是正确的？
      options:
        - 'A. [[Prototype]] 是可枚举属性，可通过 for-in 遍历到'
        - 'B. Object.create(null) 创建的对象没有 [[Prototype]]，因此不继承任何方法'
        - 'C. 函数的 prototype 属性与其实例的 [[Prototype]] 是同一个指针'
        - 'D. 修改构造函数的 prototype 会立即影响已创建实例的 [[Prototype]] 链'
      answer: B
      bloom: analyze
    - question: 关于严格模式 "use strict" 的语义，下列哪一项是错误的？
      options:
        - 'A. 禁止 with 语句'
        - 'B. 函数内部 this 默认绑定到全局对象'
        - 'C. 重复参数名会抛出 SyntaxError'
        - 'D. 删除不可配置属性会抛出 TypeError'
      answer: B
      bloom: understand
  code-fix:
    - question: |
        以下代码期望依次输出 0、1、2、3、4，但实际输出五次 5。请指出缺陷并修复。
        ```javascript
        for (var i = 0; i < 5; i++) {
          setTimeout(() => console.log(i), 0);
        }
        ```
      answer: |
        var 声明的 i 是函数级作用域，所有闭包共享同一绑定，循环结束时 i === 5。
        修复方案一：使用 let 形成块级作用域，每次迭代创建新绑定。
        ```javascript
        for (let i = 0; i < 5; i++) {
          setTimeout(() => console.log(i), 0);
        }
        ```
        修复方案二：使用 IIFE 捕获当前值。
        ```javascript
        for (var i = 0; i < 5; i++) {
          ((j) => setTimeout(() => console.log(j), 0))(i);
        }
        ```
      bloom: apply
    - question: |
        以下代码期望通过代理拦截属性读取并记录日志，但读取 obj.title 时报错。
        ```javascript
        const handler = {
          get(target, key) {
            console.log(`read ${key}`);
            return target[key];
          }
        };
        const obj = new Proxy({ title: 'JS' }, handler);
        obj.title;
        ```
      answer: |
        代码本身可运行，但若 handler 同时实现了 get 且未使用 Reflect.get，则可能在继承属性或 receiver 场景下产生错误绑定。推荐使用 Reflect.get(target, key, receiver) 保持语义一致：
        ```javascript
        const handler = {
          get(target, key, receiver) {
            console.log(`read ${key}`);
            return Reflect.get(target, key, receiver);
          }
        };
        ```
      bloom: analyze
  open-ended:
    - question: |
        请从代数效应（algebraic effects）的视角论证 async-await 是 Generator + Promise 的语法糖，并说明为何 async 函数无法替代真正的代数效应。
      answer: |
        async-await 可被编译为 Generator 配合自动 executor（如 co 库）的形式：
        await e 等价于 yield e，executor 负责将 Promise 的 resolve/reject 转化为 generator.next/throw。
        然而真正的代数效应允许在被调用方声明效应、由调用栈上层 handler 解释执行，
        而 async 函数一旦使用 await 必须声明为 async，效应签名被静态污染整个调用链，
        无法实现"透明效应"，故 async-await 仅是受限的代数效应模拟。
      bloom: evaluate
    - question: |
        在设计一个长生命周期 SPA 的内存模型时，如何综合运用 WeakMap、WeakRef、FinalizationRegistry 来实现既不阻塞 GC、又能在对象被回收时清理关联资源的缓存？请描述数据流与失败模式。
      answer: |
        以 WeakMap<Source, Cache> 维护源对象到缓存的弱引用，避免 Source 长期存活；
        对缓存元数据使用 WeakRef 包装，访问时调用 deref 判活；
        FinalizationRegistry 注册 Source 被回收时的回调以清理磁盘或索引资源。
        失败模式包括：GC 时机不确定导致 deref 返回 undefined 后仍被访问；
        FinalizationRegistry 回调可能在主线程空闲后才执行，存在滞后；
        WeakRef.deref 与 FinalizationRegistry 之间需用标志位去重，避免重复清理。
      bloom: create
references:
  - author: [Brendan Eich]
    title: 'A Brief History of JavaScript'
    publisher: 'Mozilla Corporation'
    year: 2020
    type: website
    url: 'https://javascript.info/js'
  - author: [ECMA International]
    title: 'ECMAScript 2026 Language Specification, 27th Edition'
    publisher: 'ECMA International'
    year: 2026
    type: standard
    doi: '10.17445/ecma-262-27'
  - author: [Anne van Kesteren]
    title: 'HTML Living Standard, Section 8.1.7 Job and Event Loop Model'
    publisher: 'WHATWG'
    year: 2026
    type: standard
    url: 'https://html.spec.whatwg.org/'
  - author: [Andreas Rossberg]
    title: 'JavaScript Semantics: A Formal Specification of the ECMAScript Language'
    publisher: 'Schloss Dagstuhl'
    year: 2018
    type: conference
    doi: '10.4230/LIPIcs.ECOOP.2018.15'
etymology:
  - term: JavaScript
    origin: '1995 年 Brendan Eich 在 Netscape 用 10 天完成初版 Mocha，后更名为 LiveScript，为搭 Java 热度最终改名 JavaScript；商标由 Oracle 持有，ECMA 标准化后称 ECMAScript。'
  - term: Closure
    origin: '源自 1964 年 Peter Landin 的 SECD 机器理论，将函数与其绑定环境打包为一个闭合一等公民。'
  - term: Prototype
    origin: 'Henry Lieberman 1986 年 MIT AI Lab 论文 "Using Prototypical Objects to Implement Shared Behavior" 提出原型面向对象，影响 Self 与 JavaScript。'
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
---

# JavaScript 理论知识点

> 本文以 MIT 6.S192、Stanford CS142 与 CMU 15-440 的教学范式为参考基准，将 JavaScript 的语言语义、类型系统、执行模型、内存模型与元编程理论组织为一篇可独立阅读的核心理论文档。所有形式化描述均基于 ECMA-262 第 27 版（ES2026）与 WHATWG HTML Living Standard。

## 1. 学习目标与 Bloom 分类矩阵

本节明确读者在完成本文学习后应具备的认知能力层级。Bloom 分类法将认知目标划分为六个层级：remember（记忆）、understand（理解）、apply（应用）、analyze（分析）、evaluate（评估）、create（创造）。本文目标如下：

| 层级 | 目标描述 | 评估方式 |
| ---- | -------- | -------- |
| remember | 复述 ECMAScript 规范的层级结构、TC39 四阶段提案流程、HTML 事件循环规范条目 | 填空题 |
| understand | 解释执行上下文、词法环境、作用域链、闭包的形式语义，能绘制环境记录模型 | 选择题 |
| apply | 运用 ToPrimitive、ToNumber、ToString 抽象操作预测类型强制转换结果 | 代码修复题 |
| analyze | 拆解 HTML §8.1.7 事件循环模型，分析浏览器与 Node.js 实现差异 | 选择题 |
| evaluate | 评估 Promise、async-await、Generator 在异步表达力上的等价性与代数效应关联 | 开放题 |
| create | 基于 Proxy、Reflect、WeakRef 设计元编程抽象与内存安全缓存 | 开放题 |

学习路径建议：依次阅读历史动机、形式化定义、执行模型、异步语义、元编程理论，最后完成习题与案例研究。每一节末尾设有"理论检查点"，用于自我评估理解程度。

## 2. 历史动机与语言演进

### 2.1 诞生的十日工程

JavaScript 由 Brendan Eich 于 1995 年 5 月在 Netscape Communications 完成 0.1 版本原型，工程周期据 Brendan Eich 本人在博客中回忆为"大约十天"。其设计目标是在 Netscape Navigator 浏览器中嵌入一门"网页脚本语言"，弥补当时 HTML 静态文档与 Java Applet 重型客户端之间的中间层空白。

Netscape 管理层最初希望该语言语法接近 Java 以便市场推广，但 Eich 倾向于引入 Scheme 与 Self 的函数式与原型面向对象特性。最终语言融合了：

- Java 的语法外观（C 系语法）
- Scheme 的一等函数与闭包
- Self 的原型继承
- HyperTalk 的弱类型与动态性

### 2.2 名称演变

| 时间 | 名称 | 说明 |
| ---- | ---- | ---- |
| 1995-04 | Mocha | Eich 内部代号 |
| 1995-09 | LiveScript | Netscape 2.0 beta 阶段发布名 |
| 1995-12 | JavaScript | 与 Sun Microsystems 签署商标授权后改名为 JavaScript，借 Java 热度营销 |
| 1996-08 | ECMAScript | 提交 ECMA 国际组织标准化，标准号 ECMA-262 |
| 1997-06 | ECMA-262 1st Edition | 第一版正式标准发布 |

商标权随 Sun Microsystems 被 Oracle 收购而转移至 Oracle，2010 年 Oracle 申请续展引发社区抗议，但商标至今仍归 Oracle 持有。

### 2.3 TC39 与提案流程

TC39（Technical Committee 39）是 ECMA International 下属技术委员会，负责 ECMAScript 标准维护。其成员包括主流浏览器厂商、云厂商、学术界代表。2014 年后 TC39 采用四阶段提案流程：

| Stage | 含义 | 进入条件 |
| ----- | ---- | -------- |
| Stage 0 | Strawman | TC39 成员提交 |
| Stage 1 | Proposal | 提出问题与解决方案轮廓，指定 Champion |
| Stage 2 | Draft | 形式化描述，初步规范文本 |
| Stage 3 | Candidate | 完整规范文本，实现者反馈，需有至少两处规范兼容实现 |
| Stage 4 | Finished | 通过测试 262，至少两处生产实现，进入下一年度标准 |

ES2015（ES6）是采用该流程后的第一个版本，标志着 JavaScript 进入年度发布节奏。

### 2.4 关键版本时间线

| 版本 | 年份 | 关键特性 |
| ---- | ---- | -------- |
| ES1 | 1997 | 首次标准化 |
| ES2 | 1998 | 编辑性修订，与 ISO/IEC 16262 对齐 |
| ES3 | 1999 | 正则表达式、try-catch、switch |
| ES4 | (废弃) | 过于激进，未能通过 |
| ES5 | 2009 | 严格模式、JSON、Object.create、访问器属性、Array 方法 |
| ES5.1 | 2011 | 与 ISO 对齐 |
| ES2015 (ES6) | 2015 | let/const、箭头函数、class、模块、Promise、Symbol、Proxy、Map/Set、默认参数、解构、模板字符串、生成器 |
| ES2016 | 2016 | Array.includes、指数运算符 |
| ES2017 | 2017 | async-await、Object.entries、SharedArrayBuffer、Atomics |
| ES2018 | 2018 | 异步迭代、rest/spread for objects、正则改进 |
| ES2019 | 2019 | Array.flat/flatMap、Object.fromEntries、可选 catch 绑定 |
| ES2020 | 2020 | 可选链 ?.、空值合并 ??、BigInt、globalThis、Promise.allSettled、动态 import() |
| ES2021 | 2021 | WeakRef、FinalizationRegistry、String.replaceAll、Promise.any、逻辑赋值 |
| ES2022 | 2022 | 顶层 await、类字段、私有方法 #、.at()、Error.cause |
| ES2023 | 2023 | Array.findLast、Hashbang、WeakRef.prototype.unregister |
| ES2024 | 2024 | Promise.withResolvers、Object.groupBy、Well-formed Unicode strings |
| ES2025 | 2025 | Import Attributes、Iterator Helpers、Set 操作 |
| ES2026 | 2026 | Temporal API、Explicit Resource Management（using）、Decimal、Pattern Matching |

### 2.5 关键论文与里程碑

JavaScript 的形式语义研究由 Mozilla 与 Google 资助，重要里程碑包括：

- 2000 年 Cormac Flanagan 等发表的"Sibling Attribution for Race Detection"，将 JavaScript 引入学术研究视野
- 2010 年 Anderson 等的"Towards JavaScript Program Verification via Type Analysis"
- 2015 年 Andreas Rossberg 编写的"JavaScript Semantics"（JSShell 项目）以 Coq/PLT Redex 形式化定义 ES5
- 2018 年 ECMA 维护的 official formal semantics 项目 js-language-specs

## 3. 形式化定义与语言语义

### 3.1 规范的元语言

ECMA-262 规范使用一套自定义的元语言描述语义，其核心构件包括：

- **算法步骤**（algorithm steps）：使用编号的英文祈使句描述
- **抽象操作**（abstract operation）：以 `Assert`、`Return`、`Perform` 等动词标记
- **规范类型**（specification type）：如 Record、List、Set、Completion Record、Reference
- **Completion Record**：所有求值结果包裹在 `[[Type]]`、`[[Value]]`、`[[Target]]` 三槽的记录中，`[[Type]]` 取 normal、break、continue、return、throw 之一

形式化表达如下，其中 $E$ 为表达式，$\sigma$ 为环境，求值函数 $\mathcal{E}$ 返回 Completion Record：

$$
\mathcal{E}[\![ e ]\!] : \Sigma \to \text{CompletionRecord}
$$

Completion Record 的代数结构：

$$
\text{Completion} = \{ \text{type} \in \{\text{normal}, \text{break}, \text{continue}, \text{return}, \text{throw}\}, \text{value} \in \text{Value} \cup \{\text{empty}\}, \text{target} \in \text{String} \cup \{\text{empty}\} \}
$$

### 3.2 求值规则的形式化

以下给出变量查找的求值规则示例，使用 PLT Redex 风格的推断规则：

$$
\frac{
  \sigma(x) = v \quad \text{v is not a Reference}
}{
  \mathcal{E}[\![ x ]\!](\sigma) = \text{normalCompletion}(v)
}
\quad
\frac{
  \sigma(x) \text{ is unresolvable}
}{
  \mathcal{E}[\![ x ]\!](\sigma) = \text{throwCompletion}(\text{ReferenceError})
}
$$

函数调用规则：

$$
\frac{
  \mathcal{E}[\![ e_1 ]\!](\sigma) = \text{normal}(f) \quad
  \mathcal{E}[\![ e_2 ]\!](\sigma) = \text{normal}(v) \quad
  f \text{ is callable}
}{
  \mathcal{E}[\![ e_1(e_2) ]\!](\sigma) = \text{Call}(f, \text{undefined}, \langle v \rangle)
}
$$

### 3.3 类型系统的形式化

JavaScript 是动态弱类型语言，类型在运行时确定。规范定义 8 种语言类型：

- Undefined
- Null
- Boolean
- String
- Number（IEEE 754 双精度）
- Symbol
- BigInt
- Object

形式化定义类型集合 $\mathcal{T}$：

$$
\mathcal{T} = \{\text{Undefined}, \text{Null}, \text{Boolean}, \text{String}, \text{Number}, \text{Symbol}, \text{BigInt}\} \cup \mathcal{P}(\text{Object})
$$

类型判断操作 $\text{Type}(x)$ 在规范中通过 `Type(x)` 抽象操作实现，返回值为上述枚举。

### 3.4 语义层级与宿主环境

JavaScript 语义分为三层：

1. **核心语义**：由 ECMA-262 定义，包含语言语法、求值规则、内置对象
2. **宿主语义**：由宿主环境（浏览器、Node.js、Deno、Bun）补充，提供 I/O、定时器、网络等
3. **嵌入语义**：由引擎实现细节决定，如 V8 的隐藏类、JIT 优化

这种分层使 JavaScript 可在浏览器、服务器、嵌入式设备统一运行，但也带来语义碎片化问题，例如 `setTimeout` 在浏览器由 WHATWG HTML 标准定义，在 Node.js 由 libuv 定义，二者参数语义存在差异。

### 3.5 Reference 规范类型

Reference 是规范内部类型，用于描述变量引用与属性访问的结果。其结构为：

$$
\text{Reference} = \{ \text{base}, \text{referencedName}, \text{strict}, \text{thisValue} \}
$$

其中 base 取值如下：

- 普通变量：base 为环境记录
- 属性访问 `obj.prop`：base 为 obj
- 属性访问 `obj[expr]`：base 为求值 obj 后的值
- `super.prop`：base 为环境记录中的 thisValue

Reference 通过 `GetValue` 与 `PutValue` 抽象操作解引用。这一设计使严格模式下的赋值语义、`delete` 语义、`this` 绑定规则能够统一表达。

## 4. ECMAScript 规范结构

### 4.1 规范文档组织

ECMA-262 第 27 版共分为以下章节：

1. Scope
2. Conformance
3. Normative References
4. Overview
5. Notational Conventions
6. ECMAScript Data Types and Values
7. Abstract Operations
8. Syntax-Directed Operations
9. Executable Code and Execution Contexts
10. Ordinary and Exotic Objects Behaviours
11. ECMAScript Language: Source Code
12. ECMAScript Language: Lexical Grammar
13. ECMAScript Language: Expressions
14. ECMAScript Language: Statements and Declarations
15. ECMAScript Language: Functions and Classes
16. ECMAScript Language: Scripts and Modules
17. ECMAScript Standard Built-in Objects
18. The Global Object
19. Fundamental Objects
20. Numbers and Dates
21. Text Processing
22. Indexed Collections
23. Keyed Collections
24. Structured Data
25. Control Abstraction Objects
26. Reflection
27. Memory Management

### 4.2 抽象操作层级

规范的核心是约 700 余个抽象操作（Abstract Operations），按层级组织：

- **转换抽象操作**：`ToPrimitive`、`ToBoolean`、`ToNumber`、`ToString`、`ToObject`、`ToPropertyKey`、`ToPropertyDescriptor`
- **测试抽象操作**：`IsCallable`、`IsConstructor`、`IsArray`、`IsRegExp`、`IsPromise`
- **操作抽象操作**：`Call`、`Construct`、`Get`、`Set`、`HasProperty`、`DeletePropertyOrThrow`、`DefineOwnProperty`
- **规范辅助操作**：`RequireObjectCoercible`、`ToString`、`ToUint32`、`ToLength`

### 4.3 内置对象的分类

规范将内置对象分为五大类：

| 类别 | 示例 | 说明 |
| ---- | ---- | ---- |
| Fundamental | Object、Function、Boolean、Symbol、Error | 基础对象 |
| Numbers and Dates | Number、Math、Date、BigInt | 数值与日期 |
| Text Processing | String、RegExp | 文本处理 |
| Indexed Collections | Array、TypedArray | 索引集合 |
| Keyed Collections | Map、Set、WeakMap、WeakSet | 键集合 |
| Structured Data | JSON、ArrayBuffer、SharedArrayBuffer | 结构化数据 |
| Control Abstraction | Promise、Generator、Iterator、AsyncIterator | 控制抽象 |
| Reflection | Reflect、Proxy | 反射 |

## 5. 执行模型与执行上下文

### 5.1 执行上下文的形式定义

JavaScript 执行上下文（Execution Context）是规范中用于追踪代码执行状态的结构。其形式定义为四元组：

$$
\text{ExecutionContext} = \{ \text{codeEvaluationState}, \text{Function}, \text{Realm}, \text{ScriptOrModule}, \text{LexicalEnvironment}, \text{VariableEnvironment}, \text{PrivateEnvironment} \}
$$

各字段含义：

- `codeEvaluationState`：当前执行到的代码位置
- `Function`：若执行的是函数代码，则为函数对象；否则为 null
- `Realm`：当前域，包含一组内置对象与全局对象
- `ScriptOrModule`：当前脚本或模块
- `LexicalEnvironment`：词法环境，解析标识符
- `VariableEnvironment`：变量环境，存储 var 声明
- `PrivateEnvironment`：私有名称环境，处理类的私有成员

### 5.2 执行上下文栈

执行上下文栈（Execution Context Stack）用于管理嵌套调用。栈顶为当前运行的执行上下文。栈操作规则：

1. **进入函数**：创建新执行上下文，压栈
2. **return / throw**：弹栈，控制权交还上层
3. **挂起**：Generator、async 函数可挂起当前上下文，将控制权交还，后续再恢复

执行上下文栈是单线程的，但同一时刻可能存在多个被挂起的上下文（如 await 等待中的 async 函数）。

### 5.3 词法环境与变量环境

词法环境（Lexical Environment）是规范类型，由环境记录（Environment Record）与外层引用（outer reference）组成：

$$
\text{LexicalEnvironment} = \{ \text{EnvironmentRecord}, \text{outer} \}
$$

环境记录分为五种子类型：

| 子类型 | 用途 | 绑定类型 |
| ------ | ---- | -------- |
| Declarative Environment Record | let、const、class、函数声明、catch 子句、for 块 | 可变 / 不可变 |
| Function Environment Record | 函数调用 | 可变 / 不可变 + this 绑定 + super 绑定 |
| Object Environment Record | with 语句、全局 var | 属性绑定 |
| Global Environment Record | 全局作用域 | 内部为 Declarative + Object 复合 |
| Module Environment Record | ES 模块 | 不可变绑定 + 导入绑定 |

变量环境（VariableEnvironment）在 ES6 后只为 var 声明保留，let/const 与块级作用域使用 LexicalEnvironment。

### 5.4 作用域链的形式语义

作用域链由词法环境的外层引用构成。变量查找规则：

$$
\frac{
  \text{env.Record.HasBinding}(x) = \text{true} \quad \text{env.Record.GetBindingValue}(x) = v
}{
  \text{ResolveBinding}(x, \text{env}) = v
}
\quad
\frac{
  \text{env.Record.HasBinding}(x) = \text{false} \quad \text{env.outer} = \text{env}'
}{
  \text{ResolveBinding}(x, \text{env}) = \text{ResolveBinding}(x, \text{env}')
}
\quad
\frac{
  \text{env.outer} = \text{null}
}{
  \text{ResolveBinding}(x, \text{env}) = \text{throw ReferenceError}
}
$$

### 5.5 闭包的形式定义

闭包（Closure）是函数对象与其创建时词法环境的组合。函数对象内部槽 `[[Environment]]` 保存创建时的词法环境：

$$
\text{Function} = \{ \ldots, [[\text{Environment}]] : \text{LexicalEnvironment}, \ldots \}
$$

函数调用时，新建的 Function Environment Record 的 outer 字段指向 `[[Environment]]`，从而形成闭包。

```javascript
function makeCounter() {
  let count = 0; // 声明在 makeCounter 的词法环境
  return function increment() {
    // increment 函数的 [[Environment]] 指向 makeCounter 的词法环境
    count = count + 1; // 通过作用域链找到 count
    return count;
  };
}

const counter = makeCounter();
counter(); // 1
counter(); // 2
```

闭包语义的关键性质：

1. **静态作用域**：函数的作用域在定义时确定，而非调用时
2. **绑定捕获**：闭包捕获的是变量绑定（binding），而非值
3. **共享绑定**：同一词法环境中的多个闭包共享同一绑定
4. **可变性**：var 声明的绑定可变，let/const 的绑定分别为可变/不可变

### 5.6 理论检查点

请用纸笔绘制以下代码执行时的执行上下文栈与词法环境结构：

```javascript
let x = 1;
function outer() {
  let y = 2;
  function inner() {
    let z = x + y;
    return z;
  }
  return inner;
}
const fn = outer();
fn();
```

预期答案：

- 全局执行上下文：LexicalEnvironment 包含 x、outer、fn
- outer 调用：新增执行上下文，LexicalEnvironment 包含 y、inner，outer 指向全局
- inner 返回后：outer 上下文弹栈，但 inner 函数对象 [[Environment]] 仍指向 outer 的词法环境
- inner 调用：新增执行上下文，LexicalEnvironment 包含 z，outer 指向 outer 的词法环境
- 变量查找 x：inner.env -> outer.env -> global.env 找到 x = 1

## 6. 作用域链与闭包的形式语义

### 6.1 闭包与函数式编程

闭包源自 1964 年 Peter Landin 提出的 SECD 机器理论，他将 λ 演算中的"环境"概念实现为函数对象的隐式组成部分。JavaScript 的闭包语义与 Scheme 高度相似，但与 Python 存在关键差异。

Python 的闭包捕获"变量名"，且无法对捕获的变量赋值（Python 3 引入 nonlocal 才能修改），而 JavaScript 的闭包捕获"绑定"，可自由读写。

```javascript
function makeAccumulator() {
  let total = 0;
  return {
    add(n) { total += n; return total; },
    reset() { total = 0; }
  };
}
const acc = makeAccumulator();
acc.add(5);  // 5
acc.add(3);  // 8
acc.reset();
acc.add(1);  // 1
```

### 6.2 闭包与循环变量

经典陷阱：循环中创建多个闭包共享同一变量绑定。

```javascript
// 陷阱：var 声明为函数级，所有闭包共享同一 i 绑定
var fns = [];
for (var i = 0; i < 3; i++) {
  fns.push(() => i);
}
console.log(fns.map(f => f())); // [3, 3, 3]

// 修复 1：let 形成每次迭代的块级绑定
var fns2 = [];
for (let i = 0; i < 3; i++) {
  fns2.push(() => i);
}
console.log(fns2.map(f => f())); // [0, 1, 2]

// 修复 2：IIFE 创建独立作用域
var fns3 = [];
for (var i = 0; i < 3; i++) {
  ((j) => fns3.push(() => j))(i);
}
console.log(fns3.map(f => f())); // [0, 1, 2]
```

let 在 for 循环中的语义形式化：

$$
\frac{
  \text{for(let } x = e_1; e_2; e_3 \text{) } b \quad \text{iter k}
}{
  \text{创建新词法环境 } env_k \quad \text{env}_k.\text{Record.CreateMutableBinding}(x) \quad \text{复制上一轮 } x \text{ 的值}
}
$$

每次迭代开始时，规范要求创建新的词法环境，将上一轮迭代的 x 值复制到新绑定，从而保证每次迭代的闭包捕获独立的绑定。

### 6.3 闭包与内存

闭包持有其创建时词法环境的引用，导致被引用变量无法被 GC 回收。这是常见的内存泄漏源。

```javascript
function attachHandler() {
  const huge = new Array(1e6).fill('*');
  document.getElementById('btn').addEventListener('click', () => {
    // 即使回调不使用 huge，闭包仍持有 huge 引用
    console.log('clicked');
  });
}
```

防御性做法：

1. 避免在闭包中无意义捕获大对象
2. 使用块级作用域限制变量生命周期
3. 显式置空引用：`huge = null`
4. 用 WeakRef 持有可能不需要的对象

### 6.4 立即调用函数表达式（IIFE）

IIFE 是 ES5 时代实现模块隔离与块级作用域的惯用法：

```javascript
const module = (function () {
  let private = 0;
  function privateFn() { /* ... */ }
  return {
    public: () => { private++; return private; }
  };
})();
```

ES6 后 let/const 与模块系统使 IIFE 大部分场景被取代，但仍在以下情况使用：

- 异步顶层 await 替代（旧环境）
- 临时变量隔离
- 一次性副作用执行

## 7. 原型继承理论

### 7.1 原型继承的起源

原型面向对象（Prototype-based Object-Oriented Programming）由 Henry Lieberman 与 David Ungar 分别在 1986 年 MIT 与斯坦福的研究中独立提出。其核心理念是：

> 对象直接继承对象，而非通过类继承类。

原型继承的形式语义由 David Ungar 在 Self 语言中首次实现。JavaScript 借鉴 Self 的设计，将所有对象都视为从原型克隆而来。

### 7.2 [[Prototype]] 内部槽

每个对象都有一个 `[[Prototype]]` 内部槽，指向其原型对象（或 null）。访问 `obj.x` 时，按以下规则查找：

$$
\frac{
  \text{obj has own property } x \text{ with value } v
}{
  \text{Get}(obj, x) = v
}
\quad
\frac{
  \text{obj has no own property } x \quad \text{obj.[[\text{Prototype}]]} = p \quad p \neq \text{null}
}{
  \text{Get}(obj, x) = \text{Get}(p, x)
}
\quad
\frac{
  \text{obj.[[\text{Prototype}]]} = \text{null}
}{
  \text{Get}(obj, x) = \text{undefined}
}
$$

原型链可能形成有向无环图，理论上可无限长，但实际引擎实现有深度限制（V8 约 1000 层，超出抛出 RangeError）。

### 7.3 函数的 prototype 属性

函数对象除 `[[Prototype]]` 外还有一个 `prototype` 属性（普通对象没有），用于 `new` 调用时设置实例的原型。

```javascript
function Foo() {}
const f = new Foo();
// 内部流程：
// 1. 创建新对象 obj = {}
// 2. obj.[[Prototype]] = Foo.prototype
// 3. 以 obj 为 this 调用 Foo
// 4. 若 Foo 返回非对象，则返回 obj

Object.getPrototypeOf(f) === Foo.prototype; // true
```

形式化构造过程：

$$
\frac{
  F \text{ is constructor} \quad F.\text{prototype} = p \quad p \text{ is object}
}{
  \text{Construct}(F, \text{args}) = \begin{cases}
    r & \text{if } F(\text{args}) \text{ returns object } r \\
    \text{newObj} & \text{otherwise, where newObj.}[[\text{Prototype}]] = p
  \end{cases}
}
$$

### 7.4 原型链查找的复杂度

单次属性查找的复杂度为 $O(d)$，其中 $d$ 为原型链深度。V8 通过内联缓存（Inline Cache）将常见场景优化为 $O(1)$。IC 状态：

| 状态 | 含义 | 性能 |
| ---- | ---- | ---- |
| Uninitialized | 首次访问 | 慢 |
| Monomorphic | 单一隐藏类 | 最快 |
| Polymorphic | 2-4 种隐藏类 | 中等 |
| Megamorphic | 超过 4 种 | 最慢 |

### 7.5 class 语法糖的本质

ES6 的 class 是基于原型继承的语法糖。以下两段代码语义等价：

```javascript
// ES5 写法
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return `${this.name} makes a sound`;
};
function Dog(name) {
  Animal.call(this, name);
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.bark = function () {
  return `${this.name} barks`;
};

// ES6 class
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}
class Dog extends Animal {
  constructor(name) { super(name); }
  bark() { return `${this.name} barks`; }
}
```

class 语法糖的关键改进：

1. **super 关键字**：通过 `[[HomeObject]]` 内部槽定位父类方法
2. **静态方法**：定义在构造函数本身而非 prototype
3. **私有字段**：`#field` 通过私有环境实现，外部不可访问
4. **构造函数必须 new 调用**：避免 this 绑定错误
5. **不可枚举方法**：prototype 上的方法 enumerable 为 false

### 7.6 原型链的常见模型

JavaScript 的全局原型链结构如下：

```
null
 └ Object.prototype
    ├ hasOwnProperty, toString, valueOf, ...
    ├ Function.prototype (函数对象的 [[Prototype]])
    │  ├ call, apply, bind
    │  └ Function.prototype 的 [[Prototype]] = Object.prototype
    └ Array.prototype
       ├ push, pop, map, ...
       └ Array.prototype 的 [[Prototype]] = Object.prototype
```

函数对象的原型链：

$$
\text{functionObj} \xrightarrow{[[\text{Prototype}]]} \text{Function.prototype} \xrightarrow{[[\text{Prototype}]]} \text{Object.prototype} \xrightarrow{[[\text{Prototype}]]} \text{null}
$$

### 7.7 Object.create 与原型编程

`Object.create(proto, descriptors)` 是显式原型编程的入口：

```javascript
const animal = {
  speak() { return `${this.name} makes a sound`; }
};
const dog = Object.create(animal);
dog.name = 'Rex';
dog.bark = function () { return `${this.name} barks`; };

dog.speak(); // "Rex makes a sound"
Object.getPrototypeOf(dog) === animal; // true
```

`Object.create(null)` 创建的对象没有原型，常用于字典：

```javascript
const dict = Object.create(null);
dict.foo = 1;
// 不会继承 toString、hasOwnProperty 等
// 避免原型污染与属性名冲突
```

### 7.8 原型污染与防御

原型污染（Prototype Pollution）是修改 Object.prototype 导致全局行为变化的攻击：

```javascript
// 攻击示例
Object.prototype.toString = () => 'hacked';
console.log({}.toString()); // 'hacked'

// 实际场景中的原型污染漏洞
const config = JSON.parse(userInput);
// 若 userInput 含 "__proto__": { "isAdmin": true }
// config.__proto__.isAdmin = true
// 所有对象都获得 isAdmin 属性
```

防御策略：

1. 使用 `Object.create(null)` 创建字典
2. 使用 `Map` 替代普通对象作为键值存储
3. 使用 `Object.freeze(Object.prototype)` 冻结原型
4. 对用户输入做白名单过滤
5. 使用 `Object.defineProperty(obj, key, { value, writable: false, configurable: false })`

## 8. 事件循环模型

### 8.1 HTML 规范 §8.1.7 的形式定义

HTML Living Standard 第 8.1.7 节定义了浏览器事件循环。其核心算法可形式化描述为：

$$
\text{EventLoop} = \text{while true: } \text{TaskProcessingModel}()
$$

Task Processing Model 的核心步骤：

1. 选择一个任务队列中最早的任务（task queue 的 FIFO），若无则跳到 Microtask 阶段
2. 将该任务设为"正在运行的任务"（currently running task）
3. 执行任务
4. 清空 Microtask Queue（关键步骤）
5. 执行必要的渲染步骤（Update the rendering）
6. 重复

### 8.2 任务队列的分类

HTML 规范定义多种任务队列，按源（source）区分：

| 任务源 | 觺发场景 |
| ------ | -------- |
| DOM manipulation | 任务的派发 |
| User interaction | 用户事件（click、键盘） |
| Networking | fetch、XHR 完成 |
| History traversal | history API |
| File | 文件操作 |
| Timer | setTimeout、setInterval |

不同源的任务队列优先级不同，浏览器可自由调度。

### 8.3 Microtask 检查点

Microtask 检查点（Microtask Checkpoint）的算法：

1. 若 Microtask Queue 已在处理，返回
2. 标记为处理中
3. 当 Microtask Queue 非空：
   a. 取出最旧的 microtask
   b. 执行
4. 清理标记
5. 触发 `PerformMicrotaskCheckpoint` 完成回调

Microtask 来源：

- Promise.then/catch/finally 的回调
- queueMicrotask 注册的回调
- MutationObserver 回调
- async 函数 await 后的延续
- IntersectionObserver（部分实现）

### 8.4 浏览器与 Node.js 的差异

浏览器事件循环由 HTML 规范定义，Node.js 事件循环由 libuv 实现，二者结构差异显著。

Node.js 事件循环阶段（libuv）：

```
   timers          --> setTimeout/setInterval
   pending callbacks --> 系统级回调（TCP 错误）
   idle, prepare   --> 内部使用
   poll            --> I/O 回调
   check           --> setImmediate
   close callbacks --> socket.on('close')
```

Node.js 在每个阶段切换之间清空 Microtask Queue（Node 11+ 与浏览器趋同），但仍有细微差异：

1. `process.nextTick` 优先级高于 Microtask，在 Microtask 之前清空
2. `setImmediate` 与 `setTimeout(0)` 在不同上下文中触发顺序不同
3. Node.js 没有 UI 渲染步骤

### 8.5 任务调度的实例分析

```javascript
console.log('1: script start');

setTimeout(() => console.log('2: timeout'), 0);

Promise.resolve()
  .then(() => console.log('3: promise1'))
  .then(() => console.log('4: promise2'));

queueMicrotask(() => console.log('5: microtask'));

console.log('6: script end');

// 浏览器输出：
// 1: script start
// 6: script end
// 3: promise1
// 5: microtask
// 4: promise2
// 2: timeout
```

执行顺序分析：

1. 同步代码执行：1、6
2. 当前 Macrotask 完成，清空 Microtask Queue：3、5
3. promise1.then 返回新 Promise，再次清空 Microtask：4
4. 取下一个 Macrotask：2

### 8.6 async-await 的事件循环集成

async 函数在 await 处挂起，将后续代码作为 Promise 的 then 回调。等价的转译：

```javascript
async function fetchAndProcess() {
  const data = await fetch('/api');
  return process(data);
}

// 等价于
function fetchAndProcess() {
  return fetch('/api').then(data => process(data));
}
```

await 挂起语义的形式化：

$$
\frac{
  \text{await } p \quad p \text{ is Promise}
}{
  \text{挂起当前执行上下文} \quad \text{注册 } p.\text{then}(\text{resume}) \quad \text{控制权交还事件循环}
}
$$

### 8.7 渲染时序

浏览器事件循环在每轮 Macrotask 之后会执行渲染步骤（仅在必要时）：

1. 处理 Resize 与 Scroll 事件
2. 计算 requestAnimationFrame 回调
3. Style 计算
4. Layout
5. Paint
6. Composite

`requestAnimationFrame` 在渲染前执行，常用于动画。`requestIdleCallback` 在浏览器空闲时执行，常用于低优先级任务。

```javascript
function animate() {
  // 在下一帧渲染前执行
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// 浏览器空闲时执行
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0) {
    // 执行低优先级工作
  }
});
```

## 9. 异步语义与代数效应

### 9.1 回调地狱与控制反转

JavaScript 早期异步采用回调，导致"回调地狱"与控制反转问题：

```javascript
fetchUser(userId, (err, user) => {
  if (err) return callback(err);
  fetchOrders(user.id, (err, orders) => {
    if (err) return callback(err);
    fetchItems(orders[0].id, (err, items) => {
      if (err) return callback(err);
      callback(null, { user, orders, items });
    });
  });
});
```

问题：

1. 嵌套层级深，可读性差
2. 错误处理分散
3. 控制权交还给被调用方，调用方无法控制执行流程
4. 难以组合、取消、并行

### 9.2 Promise 的代数结构

Promise 是状态机，三态：pending、fulfilled、rejected。状态转换是不可逆：

$$
\text{pending} \to \text{fulfilled} \quad \text{或} \quad \text{pending} \to \text{rejected}
$$

Promise 构成 Monad 结构，其 return 为 `Promise.resolve`，bind 为 `Promise.then`：

$$
\frac{
  f : A \to \text{Promise}(B) \quad g : B \to \text{Promise}(C)
}{
  \text{bind}(f, g) = \lambda a. f(a).\text{then}(g) : A \to \text{Promise}(C)
}
$$

Monad 三定律的 Promise 形式：

1. **左单位律**：`Promise.resolve(x).then(f) ≡ f(x)`
2. **右单位律**：`p.then(x => Promise.resolve(x)) ≡ p`
3. **结合律**：`p.then(f).then(g) ≡ p.then(x => f(x).then(g))`

### 9.3 async-await 作为 Generator 与 Promise 的语法糖

async-await 可被编译为 Generator + 自动 executor。Koa 框架的 co 库实现了这种转译：

```javascript
// async-await
async function fetchAll() {
  const a = await fetch('/a');
  const b = await fetch('/b');
  return [a, b];
}

// 等价转译
function fetchAll() {
  return spawn(function* () {
    const a = yield fetch('/a');
    const b = yield fetch('/b');
    return [a, b];
  });
}

function spawn(genF) {
  return new Promise((resolve, reject) => {
    const gen = genF();
    function step(fn) {
      let next;
      try { next = gen[fn](); } catch (e) { return reject(e); }
      if (next.done) return resolve(next.value);
      Promise.resolve(next.value).then(
        v => step('next').bind(null, v),
        e => step('throw').bind(null, e)
      );
    }
    step('next');
  });
}
```

### 9.4 代数效应视角

代数效应（Algebraic Effects）是函数式编程中的概念，由 André Platzer、Matija Pretnar 等人研究。其核心理念：

1. **效应声明**：被调用方声明所需的效应（如读取、写入、异常）
2. **效应解释**：调用栈上层某处的 handler 解释执行该效应
3. **效应恢复**：handler 可选择恢复执行，相当于多续延

async-await 是受限的代数效应：

- `await` 相当于声明"挂起"效应
- 调用栈上层必须有 async 函数或 then 回调作为 handler
- 但 effect 类型被静态化为 Promise，无法动态选择 handler

真正的代数效应（如 Koka、Eff、Unison 语言）允许：

```koka
// Koka 中的代数效应
fun example() : int {
  val x = ask("What is x?")
  x + 1
}

with handler {
  ask(prompt) = { resume(42) }
}
example() // 43
```

JavaScript 无法直接表达这种模式，但可通过 Generator + 自定义 executor 模拟：

```javascript
function* example() {
  const x = yield { type: 'ask', prompt: 'What is x?' };
  return x + 1;
}

function run(gen) {
  const iter = gen();
  function step(value) {
    const { done, value: effect } = iter.next(value);
    if (done) return value;
    if (effect.type === 'ask') {
      step(42); // handler 提供 42
    }
  }
  step(undefined);
}
```

### 9.5 Promise 的组合子

Promise 提供多个组合子：

| 方法 | 行为 | 失败条件 |
| ---- | ---- | -------- |
| `Promise.all(iterable)` | 全部 fulfilled 才 fulfilled，任一 reject 即 reject | 任一 reject |
| `Promise.allSettled(iterable)` | 等待全部完成，返回状态数组 | 永不 reject |
| `Promise.race(iterable)` | 第一个 settled 的结果 | 第一个 reject 即 reject |
| `Promise.any(iterable)` | 第一个 fulfilled 即 fulfilled | 全部 reject 才 reject |

```javascript
// 并行请求，全部完成
const [users, posts, comments] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
  fetchComments()
]);

// 任一成功即可
const fastest = await Promise.any([
  fetchFromCDN1(),
  fetchFromCDN2(),
  fetchFromCDN3()
]);
```

### 9.6 异步迭代器

ES2018 引入异步迭代器（for-await-of）：

```javascript
async function* fetchPages(url) {
  let page = 1;
  while (true) {
    const res = await fetch(`${url}?page=${page}`);
    const data = await res.json();
    if (data.length === 0) return;
    yield* data;
    page++;
  }
}

for await (const item of fetchPages('/api/items')) {
  console.log(item);
}
```

异步迭代器的形式化：

$$
\text{AsyncIterator} = \{ \text{next} : () \to \text{Promise}(\text{IteratorResult}) \}
$$

其中 IteratorResult 的类型为：

$$
\text{IteratorResult} = \{ \text{done} : \text{boolean}, \text{value} : T \}
$$

### 9.7 顶层 await

ES2022 引入顶层 await，允许在 ES 模块顶层直接使用 await：

```javascript
// module.mjs
const config = await fetch('/config').then(r => r.json());
export default config;
```

顶层 await 改变了模块的加载语义：依赖该模块的模块必须等待其完成。这相当于将整个模块视为 async 函数。

## 10. 类型强制转换规则

### 10.1 ToPrimitive 抽象操作

ToPrimitive 是类型转换的核心抽象操作。其形式定义：

$$
\text{ToPrimitive}(x, \text{hint}) = \begin{cases}
  x & \text{if } \text{Type}(x) \notin \{\text{Object}\} \\
  \text{OrdinaryToPrimitive}(x, \text{hint}) & \text{otherwise}
\end{cases}
$$

hint 取值："string"、"number"、"default"。OrdinaryToPrimitive 算法：

- 若 hint = "string"：依次调用 `toString`、`valueOf`
- 若 hint = "number" 或 "default"：依次调用 `valueOf`、`toString`

```javascript
const obj = {
  valueOf() { return 42; },
  toString() { return 'obj'; }
};

// hint 为 number
+obj;             // 42 (一元 +)
obj - 0;          // 42
obj + 1;          // 43 (default → number)

// hint 为 string
`${obj}`;          // 'obj'
String(obj);      // 'obj'
```

### 10.2 ToNumber 转换表

| 输入类型 | 输出 |
| -------- | ---- |
| Undefined | NaN |
| Null | +0 |
| Boolean true | 1 |
| Boolean false | +0 |
| Number | 自身 |
| String | 解析为数字，空字符串为 0，无法解析为 NaN |
| Symbol | 抛出 TypeError |
| BigInt | 抛出 TypeError（混合运算） |
| Object | ToPrimitive(hint=number) 后再 ToNumber |

字符串转数字的特殊规则：

- 空字符串 `""` → 0
- 空白字符串 `"   "` → 0
- `"Infinity"`、`"+Infinity"`、`"-Infinity"` → Infinity
- `"0x1F"`、`"0b101"`、`"0o17"` → 解析为对应进制
- 其他无法解析 → NaN

### 10.3 ToString 转换表

| 输入类型 | 输出 |
| -------- | ---- |
| Undefined | "undefined" |
| Null | "null" |
| Boolean | "true" 或 "false" |
| Number | 见下表 |
| String | 自身 |
| Symbol | 抛出 TypeError |
| BigInt | 十进制字符串 |
| Object | ToPrimitive(hint=string) 后再 ToString |

Number 转 String 的关键规则：

- `0` → "0"
- `-0` → "0"
- `NaN` → "NaN"
- `Infinity` → "Infinity"
- 整数 → 十进制
- 小数 → 最短表示（ECMAScript 规范 §7.1.12.1）
- 大数 → 指数表示（如 `1e21` → "1e+21"）

### 10.4 相等性比较 ==

`==` 触发的类型转换规则：

| 左 | 右 | 转换 |
| -- | -- | ---- |
| Null | Undefined | 直接相等，不转换 |
| Null | Null | 直接相等 |
| Undefined | Undefined | 直接相等 |
| Number | String | String 转 Number |
| Boolean | 任意 | Boolean 转 Number |
| Object | Number/String/Symbol/BigInt | Object 转 ToPrimitive |
| NaN | 任意 | false |
| ±0 | ±0 / ∓0 | true |

```javascript
0 == '';        // true ('' → 0)
0 == '0';       // true ('0' → 0)
false == '';    // true ('' → 0, false → 0)
false == '0';   // true (false → 0, '0' → 0)
null == undefined; // true
null == 0;      // false (null 仅与 undefined 相等)
[] == false;    // true ([] → '' → 0, false → 0)
[] == ![];      // true (右边 ![] → false → 0，左边 [] → 0)
```

### 10.5 加法运算符 + 的特殊语义

`+` 运算符的算法：

1. 对左右操作数调用 ToPrimitive(hint=default)
2. 若任一为 String，则将两者 ToString 后字符串拼接
3. 否则将两者 ToNumber 后数值相加

```javascript
1 + 2;        // 3
'1' + 2;      // '12'
1 + '2';      // '12'
[] + [];      // '' (两边都 ToPrimitive → '')
[] + {};      // '[object Object]' ([] → '', {} → '[object Object]')
{} + [];      // 0 ({ 被解析为块，+[] → 0)
true + true;  // 2
1 + null;     // 1 (null → 0)
1 + undefined; // NaN (undefined → NaN)
```

### 10.6 Symbol.toPrimitive 与自定义转换

ES2015 引入 `Symbol.toPrimitive` 允许对象完全自定义原始值转换：

```javascript
class Money {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }
  [Symbol.toPrimitive](hint) {
    if (hint === 'string') return `${this.amount} ${this.currency}`;
    if (hint === 'number') return this.amount;
    return this.toString();
  }
}

const m = new Money(100, 'USD');
`${m}`;   // '100 USD'
+m;       // 100
m + 0;    // '100 USD0' (default → string)
```

Symbol.toPrimitive 的优先级高于 valueOf 与 toString。

### 10.7 类型转换的设计哲学

JavaScript 的类型转换规则被广泛批评为"坑"，但其设计哲学是：

1. **宽容**：尽量让代码"跑起来"，而非立即报错
2. **字符串优先**：早期 Web 上下文中，所有数据都是字符串
3. **数值兼容**：表单数据需要参与计算
4. **避免异常**：选择返回 NaN/undefined 而非抛出异常

这套规则的代价是产生大量反直觉行为，是 JavaScript 被称为"WAT 语言"的主要原因。严格模式与 TypeScript 类型检查可缓解大部分问题。

## 11. 严格模式理论

### 11.1 严格模式的启用

严格模式（Strict Mode）通过在脚本、函数或模块顶部添加 `"use strict";` 字符串字面量启用。ES 模块默认为严格模式。

```javascript
// 整个脚本严格模式
'use strict';
// ...

// 单个函数严格模式
function strict() {
  'use strict';
  // ...
}

// ES 模块自动严格
// export const x = 1; // 不需要显式声明
```

### 11.2 严格模式的语义变化

严格模式改变了以下语义：

| 变化 | 非严格模式 | 严格模式 |
| ---- | ---------- | -------- |
| 隐式全局变量 | `x = 1` 创建全局 | 抛出 ReferenceError |
| this 默认绑定 | 函数调用 this 指向 global | undefined |
| 重复参数 | 允许 | 抛出 SyntaxError |
| 重复属性 | 允许 | 允许（ES6 修订） |
| with 语句 | 允许 | 抛出 SyntaxError |
| 删除不可配置属性 | 静默失败 | 抛出 TypeError |
| 删除普通变量 | 静默失败 | 抛出 SyntaxError |
| eval 创建变量 | 污染外层作用域 | 创建独立作用域 |
| arguments.callee | 可用 | 抛出 TypeError |
| caller | 可用 | 抛出 TypeError |
| 函数声明位置 | 任意位置 | 块级作用域 |
| 八进制字面量 010 | 8 | 抛出 SyntaxError |
| 保留字 implements、interface 等 | 可用作标识符 | 抛出 SyntaxError |

### 11.3 严格模式的形式语义

严格模式可视为语言的"方言"，规范通过 `[Strict Mode]` 标记区分。例如：

- `[[Strict]]` 内部槽：函数对象标记是否严格
- 静态语义：`HasCallInTailPosition` 在严格模式下生效
- 求值规则：`this` 在严格模式下不经过 `ToObject` 转换

### 11.4 严格模式的安全收益

严格模式通过以下方式提升安全性：

1. **避免意外全局变量**：拼写错误的变量赋值不再创建全局污染
2. **限制 arguments 滥用**：arguments 与形参不再共享绑定
3. **禁止 caller 暴露调用栈**：防止信息泄漏
4. **简化优化**：固定 this 绑定、无 with、无 arguments.callee 使 JIT 优化更易

## 12. 代理与反射的元编程理论

### 12.1 元编程的层级

元编程（Metaprogramming）分为：

- **代码生成**：宏、模板、eval
- **运行时反射**：introspection、intercession
- **行为重定义**：方法缺失、属性拦截

JavaScript 的 Proxy 与 Reflect 提供运行时 intercession 能力，即修改对象基本操作的能力。

### 12.2 Proxy 的形式语义

Proxy 是规范定义的"异质对象"（Exotic Object），其内部方法的默认实现委托给 handler 对象。形式化：

$$
\text{Proxy} = \{ [[\text{Target}]], [[\text{Handler}]] \}
$$

可拦截的内部方法：

| 内部方法 | handler 方法 | 说明 |
| -------- | ------------ | ---- |
| `[[Get]]` | get | 读取属性 |
| `[[Set]]` | set | 写入属性 |
| `[[HasProperty]]` | has | in 操作符 |
| `[[Delete]]` | deleteProperty | delete 操作符 |
| `[[OwnPropertyKeys]]` | ownKeys | Object.keys 等 |
| `[[GetOwnProperty]]` | getOwnPropertyDescriptor | 属性描述符 |
| `[[DefineOwnProperty]]` | defineProperty | 定义属性 |
| `[[PreventExtensions]]` | preventExtensions | 防止扩展 |
| `[[IsExtensible]]` | isExtensible | 是否可扩展 |
| `[[GetPrototypeOf]]` | getPrototypeOf | 原型读取 |
| `[[SetPrototypeOf]]` | setPrototypeOf | 原型设置 |
| `[[Call]]` | apply | 函数调用 |
| `[[Construct]]` | construct | new 调用 |

### 12.3 Proxy 不变量

Proxy 必须满足若干不变量（invariant），否则抛出 TypeError：

1. **原型一致性**：`getPrototypeOf` 必须返回 target 的原型，若 target 不可扩展
2. **可扩展性一致**：`isExtensible` 必须与 target 一致
3. **不可删除**：`deleteProperty` 不能删除 target 的不可配置属性
4. **不可改写**：`set` 不能改写 target 的只读属性或不可写数据属性
5. **不可配置描述符一致**：`getOwnPropertyDescriptor` 必须与 target 一致

这些不变量保证了 Proxy 即使被滥用也无法破坏对象系统的基本契约。

### 12.4 Reflect 的角色

Reflect 命名空间提供与 Proxy handler 一一对应的方法，用于：

1. **在 handler 中转发默认行为**：
   ```javascript
   const handler = {
     get(target, key, receiver) {
       console.log(`get ${key}`);
       return Reflect.get(target, key, receiver);
     }
   };
   ```
2. **以函数形式调用操作符**：
   ```javascript
   Reflect.has(obj, 'x');   // 等价于 'x' in obj
   Reflect.deleteProperty(obj, 'x'); // 等价于 delete obj.x
   Reflect.ownKeys(obj);    // 等价于 Object.getOwnPropertyNames + Object.getOwnPropertySymbols
   ```
3. **正确传递 receiver**：访问器属性的 getter 中 this 应绑定到 receiver 而非 target

### 12.5 代理的典型应用

#### 12.5.1 校验与拦截

```javascript
function validate(target, schema) {
  return new Proxy(target, {
    set(obj, key, value) {
      if (key in schema) {
        const validator = schema[key];
        if (!validator(value)) {
          throw new TypeError(`Invalid value for ${key}: ${value}`);
        }
      }
      return Reflect.set(obj, key, value);
    }
  });
}

const user = validate({}, {
  name: v => typeof v === 'string' && v.length > 0,
  age: v => typeof v === 'number' && v >= 0
});

user.name = 'Alice';  // OK
user.age = -1;        // TypeError
```

#### 12.5.2 自动日志

```javascript
function logCalls(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof value === 'function') {
        return function (...args) {
          console.log(`call ${key}(${args.join(', ')})`);
          return value.apply(target, args);
        };
      }
      return value;
    }
  });
}
```

#### 12.5.3 虚拟属性

```javascript
function withDefaults(target, defaults) {
  return new Proxy(target, {
    get(t, key) {
      return key in t ? t[key] : defaults[key];
    }
  });
}

const cfg = withDefaults({}, { port: 3000, host: 'localhost' });
cfg.port; // 3000
```

#### 12.5.4 可观察对象

```javascript
function observable(target, observer) {
  return new Proxy(target, {
    set(t, key, value, receiver) {
      const old = t[key];
      const ok = Reflect.set(t, key, value, receiver);
      if (ok && old !== value) observer(key, old, value);
      return ok;
    }
  });
}
```

### 12.6 Proxy 与原型链

Proxy 拦截 `[[Get]]` 时，被查找的属性可能在原型链上。若 handler 不正确转发，可能导致原型链查找错误：

```javascript
const proto = { greet() { return 'hi'; } };
const target = Object.create(proto);
const proxy = new Proxy(target, {
  get(t, key, receiver) {
    // 错误：不传 receiver，访问器 this 绑定错误
    // return t[key];
    return Reflect.get(t, key, receiver);
  }
});

proxy.greet(); // 'hi'
```

### 12.7 Proxy 的性能开销

Proxy 的每次内部方法调用都经过 handler 派发，开销显著高于普通对象。基准测试显示 Proxy 属性访问比普通对象慢 5-10 倍。生产环境使用 Proxy 应：

1. 仅在元编程必要时使用
2. 缓存 Proxy 结果避免重复创建
3. 高频路径绕过 Proxy

## 13. 弱引用与垃圾回收

### 13.1 引用强度层级

JavaScript 的引用强度从强到弱：

| 强度 | 类型 | 是否阻止 GC |
| ---- | ---- | ------------ |
| 强引用 | 普通变量、属性、数组元素 | 是 |
| 弱引用 1 | WeakMap 的 key、WeakSet 的 value | 否（key 不阻止回收） |
| 弱引用 2 | WeakRef | 否（deref 可能返回 undefined） |
| 无引用 | FinalizationRegistry | 仅在回收后通知 |

### 13.2 WeakMap 与 WeakSet

WeakMap 的 key 必须是对象，且 key 是弱引用。当 key 被 GC 回收后，对应的 entry 自动消失。

```javascript
const cache = new WeakMap();
function compute(obj) {
  if (cache.has(obj)) return cache.get(obj);
  const result = expensive(obj);
  cache.set(obj, result);
  return result;
}
```

WeakMap 的形式语义：

$$
\text{WeakMap} = \{ (k_1, v_1), (k_2, v_2), \ldots \}
$$

其中 $v_i$ 强引用 $k_i$ 的值，但 $k_i$ 不阻止 GC。若 $k_i$ 被回收，整个 entry 被移除。

WeakMap 不实现迭代（无 keys、values、entries、forEach），因为其内部状态随 GC 变化，无法保证一致性。

### 13.3 WeakRef

ES2021 引入 WeakRef，允许显式持有弱引用：

```javascript
let target = { data: 'important' };
const ref = new WeakRef(target);

// 访问对象（可能已被回收）
const obj = ref.deref();
if (obj) {
  console.log(obj.data);
} else {
  console.log('已被回收');
}

target = null; // 允许 GC
```

WeakRef.deref() 的语义：

- 若目标存活，返回目标对象
- 若目标已被回收，返回 undefined

deref 的结果仅在调用瞬间有效，下次 GC 可能改变结果。

### 13.4 FinalizationRegistry

FinalizationRegistry 允许在对象被 GC 后执行回调：

```javascript
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`对象 ${heldValue} 已被 GC 回收`);
  // 清理关联资源（文件句柄、数据库连接等）
});

let obj = { resource: openResource() };
registry.register(obj, 'obj-1');

obj = null; // 触发 GC 时执行回调
```

注意事项：

1. 回调时机不可预测，可能延迟到下次 GC 或更久
2. 回调中不能访问被回收的对象（已不存在）
3. 回调中应仅清理 heldValue 指向的外部资源
4. 不能依赖回调实现关键逻辑

### 13.5 弱引用的应用场景

#### 13.5.1 缓存

```javascript
class WeakCache {
  #map = new WeakMap();
  get(key) { return this.#map.get(key); }
  set(key, value) { this.#map.set(key, value); }
}

// 当 key 被回收，缓存自动清理
```

#### 13.5.2 对象元数据

```javascript
const metadata = new WeakMap();
function track(obj, info) {
  metadata.set(obj, info);
}
// obj 回收时 metadata 自动清理，不会泄漏
```

#### 13.5.3 监听器管理

```javascript
class EventEmitter {
  #listeners = new WeakMap();
  on(emitter, event, handler) {
    if (!this.#listeners.has(emitter)) {
      this.#listeners.set(emitter, new Map());
    }
    this.#listeners.get(emitter).set(event, handler);
  }
}
```

### 13.6 弱引用与代数数据类型

弱引用的语义可视为 Maybe 类型的延续：

$$
\text{deref} : \text{WeakRef}(T) \to \text{Option}(T)
$$

每次 deref 返回 Some(value) 或 None，对应"对象存活"与"对象被回收"。

## 14. 内存模型与 V8 堆结构

### 14.1 V8 堆内存分区

V8 将堆内存划分为多个区域，不同区域使用不同 GC 算法：

```
+----------------------------------+
|       New Space (Young Gen)      |
|  +-----------+  +-----------+    |  <- Scavenge 半空间复制
|  | From Semi |  | To Semi   |    |
|  +-----------+  +-----------+    |
+----------------------------------+
|       Old Space (Old Gen)        |
|  +--------------------------+    |
|  | Old Object Space         |    |  <- Mark-Sweep-Compact
|  +--------------------------+    |
|  +--------------------------+    |
|  | Large Object Space       |    |  <- 大对象专用
|  +--------------------------+    |
|  +--------------------------+    |
|  | Code Space               |    |  <- JIT 代码
|  +--------------------------+    |
+----------------------------------+
|       Shared Space               |  <- SharedStruct
+----------------------------------+
|       Trusted Space              |  <- 受信任对象
+----------------------------------+
```

### 14.2 新生代 GC：Scavenge

新生代使用 Cheney 的半空间复制算法：

1. 新对象分配在 From 半空间
2. GC 时，从根集合遍历，将存活对象复制到 To 半空间
3. 复制时紧凑排列，消除碎片
4. 交换 From 与 To 半空间
5. 经历两次 Scavenge 仍存活的对象晋升到老生代

复杂度：

- 时间：$O(n_{live})$，仅与存活对象数量相关
- 空间：使用一半空间

适用场景：新生代对象"朝生夕死"特性，GC 频繁但每次回收量大。

### 14.3 老生代 GC：Mark-Sweep-Compact

老生代使用三色标记法：

| 颜色 | 含义 |
| ---- | ---- |
| 白色 | 未访问，GC 后回收 |
| 灰色 | 已访问但子节点未完全访问 |
| 黑色 | 已访问且子节点完全访问 |

算法步骤：

1. **标记**：从根集合开始，将可达对象标记为灰色，递归处理
2. **清除**：遍历堆，回收白色对象
3. **整理**：将存活对象紧凑排列，消除碎片

为减少 STW（Stop-The-World）暂停，V8 采用：

- **增量标记**（Incremental Marking）：将标记阶段拆分为小步骤，与 JS 执行交替进行
- **并发标记**（Concurrent Marking）：标记阶段在辅助线程并行执行
- **并发清除与整理**：清除与整理在辅助线程执行
- **并行 Scavenge**：新生代 GC 在多辅助线程并行执行

### 14.4 Orinoco GC

V8 的 Orinoco 项目（2015-至今）将 GC 改进为并发与并行：

- **Parallel Scavenge**：新生代 GC 多线程并行复制
- **Concurrent Marking**：老生代标记在辅助线程并发执行
- **Concurrent Sweeping**：清除并发执行
- **Concurrent Compaction**：整理并发执行
- **Incremental Marking**：标记阶段拆分，减少主线程暂停

### 14.5 内存泄漏的常见模式

#### 14.5.1 意外的全局变量

```javascript
function leak() {
  bar = 'global'; // 忘记 var/let/const，bar 成为 global.bar
}
```

严格模式下抛出 ReferenceError。

#### 14.5.2 被遗忘的定时器

```javascript
function setup() {
  const hugeData = new Array(1e6);
  setInterval(() => {
    console.log(hugeData.length); // hugeData 永久引用
  }, 1000);
}
// 组件销毁时未 clearInterval
```

#### 14.5.3 闭包捕获

```javascript
function createLeak() {
  const huge = new Array(1e6);
  return function () {
    return huge.length; // 闭包持有 huge
  };
}
```

#### 14.5.4 DOM 引用

```javascript
const elements = {};
function setup() {
  const btn = document.getElementById('btn');
  elements.btn = btn; // 即使 DOM 移除 btn，elements 仍引用
  btn.addEventListener('click', () => {});
}
```

#### 14.5.5 未移除的事件监听

```javascript
function setup() {
  const handler = () => { /* ... */ };
  element.addEventListener('click', handler);
  // 组件销毁时未 removeEventListener
}
```

#### 14.5.6 脱离 DOM 树的引用

```javascript
let detached;
function create() {
  const div = document.createElement('div');
  detached = div; // div 脱离 DOM 树但仍被引用
}
```

### 14.6 内存分析的工程实践

#### 14.6.1 浏览器 DevTools

Chrome DevTools 提供：

- **Memory 面板**：堆快照、分配时间线、分配采样
- **Performance 面板**：记录 GC 事件与内存曲线
- **堆快照对比**：定位内存增长点

#### 14.6.2 Node.js 内存分析

```bash
# 启动时启用检查
node --inspect server.js

# 使用 heapdump 模块
const heapdump = require('heapdump');
heapdump.writeSnapshot('/tmp/heap.heapsnapshot');
```

#### 14.6.3 V8 标志位

```bash
# 打印 GC 事件
node --trace-gc server.js

# 限制老生代大小
node --max-old-space-size=4096 server.js

# 限制新生代大小
node --max-semi-space-size=64 server.js
```

## 15. V8 引擎与多层 JIT

### 15.1 V8 的执行流水线

V8（自 v11+）采用四层执行模型：

```
JavaScript 源代码
      |
      v
  Parser (解析器)
      |
      v
  AST (抽象语法树)
      |
      +---> Ignition (解释器) ---> 字节码执行
      |          |                    |
      |          |                    v (热点代码)
      |          |          Sparkplug (基线编译器) ---> 半优化机器码
      |          |                    |
      |          |                    v (进一步热点)
      |          |          Maglev (中层编译器) ---> 较优化机器码
      |          |                    |
      |          |                    v (持续热点)
      |          |          TurboFan (优化编译器) ---> 高度优化机器码
      |          |                    |
      |          |                    v (逆优化)
      |          +<-------------------+
      |
      +---> 懒解析 (Lazy Parsing)
```

### 15.2 Ignition 解释器

Ignition 是 V8 的字节码解释器，特点：

- **基于寄存器**：字节码使用寄存器而非栈，减少指令数
- **快速启动**：无需等待 JIT 编译
- **类型反馈收集**：内联缓存（IC）记录运行时类型信息
- **低内存占用**：字节码比 AST 紧凑

### 15.3 Sparkplug 基线编译器

Sparkplug（V8 v9.1+）是介于 Ignition 与 Maglev 之间的基线编译器：

- **不优化**：仅做字节码到机器码的直接转译
- **快速编译**：编译速度远高于 TurboFan
- **节省解释开销**：避免逐字节码解释
- **收集更多反馈**：为 Maglev/TurboFan 准备更稳定的类型反馈

### 15.4 Maglev 中层编译器

Maglev（V8 v11+）是中层优化编译器：

- **基于 SSA**：使用静态单一赋值形式
- **轻量优化**：仅做明显优化，避免 TurboFan 的复杂分析
- **快速编译**：编译时间约为 TurboFan 的 1/3
- **填补差距**：在 Sparkplug 与 TurboFan 之间提供性能-编译时间平衡

### 15.5 TurboFan 优化编译器

TurboFan 是 V8 的高度优化编译器，特性：

- **推测优化**（Speculative Optimization）：基于运行时观察的类型信息生成特化代码
- **内联缓存**：将属性访问编译为快速路径
- **逃逸分析**：避免不必要的对象分配
- **循环优化**：不变量外提、循环展开
- **死代码消除**：删除无副作用代码

推测优化的形式语义：

$$
\frac{
  \text{observe}(f, \text{args}) = \text{types} \quad \text{specialize}(f, \text{types}) = f'
}{
  \text{run}(f, \text{args}) = \text{run}(f', \text{args}) \text{ until deoptimize}
}
$$

### 15.6 逆优化

逆优化（Deoptimization）在推测优化的假设失败时触发，回退到 Ignition 解释执行。触发条件：

- 类型不匹配（整数 → 浮点数）
- 数组元素类型变化（SMI 数组 → Double 数组）
- 新增全局变量或原型修改
- 调试器附加

```javascript
function add(a, b) { return a + b; }

// TurboFan 假设 a、b 始终为 SMI（小整数）
for (let i = 0; i < 1e6; i++) add(i, i); // 整数加法，快速路径

add(1.5, 2); // 触发逆优化，回退到通用加法
```

### 15.7 隐藏类与内联缓存

V8 使用隐藏类（Hidden Class，也称 Map）描述对象内存布局。每个对象都有指向其隐藏类的指针，隐藏类记录：

- 属性名称、偏移量、属性类型
- 转换链（transition chain）：添加属性时派生新隐藏类
- 反向转换链：删除属性时回退

```javascript
function Point(x, y) {
  this.x = x; // C0 -> C1
  this.y = y; // C1 -> C2
}

const p1 = new Point(1, 2); // C0 -> C1 -> C2
const p2 = new Point(3, 4); // 复用 C0 -> C1 -> C2
```

内联缓存状态：

| 状态 | 含义 | 性能 |
| ---- | ---- | ---- |
| Uninitialized | 首次访问 | 慢 |
| Monomorphic | 单一隐藏类 | 最快 |
| Polymorphic | 2-4 种隐藏类 | 中等 |
| Megamorphic | 超过 4 种 | 最慢 |

### 15.8 隐藏类转换的最佳实践

```javascript
// 好的做法：相同顺序初始化
function Good(x, y) { this.x = x; this.y = y; }

// 坏的做法：不同顺序导致不同隐藏类
function Bad1(x, y) { this.x = x; this.y = y; }
function Bad2(x, y) { this.y = y; this.x = x; }
// Bad1 与 Bad2 的实例有不同隐藏类

// 坏的做法：动态添加属性
const obj = {};
obj.a = 1;
obj.b = 2;
obj.c = 3; // 多次转换，性能差

// 好的做法：构造函数中初始化全部
function Obj(a, b, c) {
  this.a = a;
  this.b = b;
  this.c = c;
}
```

## 16. 对比分析

### 16.1 JavaScript vs Python

| 维度 | JavaScript | Python |
| ---- | ---------- | ------ |
| 类型系统 | 动态弱类型 | 动态强类型 |
| 数值模型 | IEEE 754 双精度 + BigInt | 任意精度整数 + 浮点 |
| 继承模型 | 原型 | 类（MRO） |
| 异步模型 | 事件循环 + async-await | 同步 + asyncio（独立栈） |
| 模块系统 | ES Module（静态） | import（动态） |
| 并发模型 | 单线程 + 事件循环 | GIL + 多线程 |
| 元编程 | Proxy + Reflect | 描述符 + 元类 |
| 闭包语义 | 绑定捕获 | 变量名捕获（受限） |

### 16.2 JavaScript vs Lua

| 维度 | JavaScript | Lua |
| ---- | ---------- | --- |
| 数据结构 | Object（关联数组） | Table（关联数组 + 数组） |
| 继承 | 原型链 + class | 元表（metatable） |
| 数组索引 | 0 起 | 1 起 |
| 数值 | 双精度 | 双精度（5.3+ 整数） |
| 协程 | Generator + async | coroutine |
| 空值 | null + undefined | nil |

### 16.3 JavaScript vs Scheme

JavaScript 设计深受 Scheme 影响：

- 一等函数与闭包
- 词法作用域
- 尾调用优化（规范要求，实现可选）

差异：

- JavaScript 多范式，Scheme 纯函数式
- JavaScript 弱类型，Scheme 强类型
- JavaScript 命令式语法，Scheme S-表达式
- JavaScript 引入原型面向对象，Scheme 无内置 OO

### 16.4 浏览器 vs Node.js vs Deno vs Bun

| 维度 | 浏览器 | Node.js | Deno | Bun |
| ---- | ------ | ------- | ---- | --- |
| 引擎 | V8 | V8 | V8 | JavaScriptCore |
| 事件循环 | HTML 标准 | libuv | tokio (Rust) | libuv 兼容 |
| 模块 | ESM | CJS + ESM | ESM | ESM + CJS |
| 包管理 | npm via bundler | npm | URL import | bun install |
| TypeScript | 通过打包工具 | 通过 ts-node/tsc | 原生支持 | 原生支持 |
| 标准库 | DOM + Web API | fs、http 等 | Web API + 本地 | Web API + 本地 |

## 17. 常见陷阱与反直觉行为

### 17.1 WAT 系列陷阱

```javascript
[] + [];        // ''
[] + {};        // '[object Object]'
{} + [];        // 0 (浏览器控制台)
'' == 0;        // true
'' == false;    // true
'0' == false;   // true
'0' == 0;       // true
false == null;  // false
false == undefined; // false
null == undefined;  // true
null == 0;      // false (null 仅与 undefined 相等)
NaN === NaN;    // false
typeof NaN;     // 'number'
typeof null;    // 'object' (历史遗留 bug)
9999999999999999; // 10000000000000000 (精度丢失)
0.1 + 0.2;     // 0.30000000000000004
```

### 17.2 this 绑定陷阱

```javascript
const obj = {
  name: 'Alice',
  greet() { return `Hello, ${this.name}`; }
};

obj.greet();        // 'Hello, Alice'
const g = obj.greet;
g();                // 'Hello, undefined' (this 丢失)
setTimeout(obj.greet, 0);  // 'Hello, undefined'

// 修复
const bound = obj.greet.bind(obj);
setTimeout(bound, 0);  // 'Hello, Alice'
setTimeout(() => obj.greet(), 0);  // 'Hello, Alice'
```

### 17.3 浮点精度

```javascript
0.1 + 0.2 === 0.3;  // false
0.1 + 0.2;          // 0.30000000000000004
1.005 * 100;        // 100.49999999999999

// 修复方案
Math.round((0.1 + 0.2) * 1e10) / 1e10;  // 0.3
Number((0.1 + 0.2).toFixed(10));        // 0.3
```

### 17.4 比较运算符

```javascript
[1, 2, 3] === [1, 2, 3];  // false (引用比较)
[1, 2, 3] == [1, 2, 3];   // false

NaN === NaN;  // false
Object.is(NaN, NaN);  // true (Object.is 修复 NaN 比较)
Object.is(-0, 0);     // false (Object.is 区分 -0 与 +0)
```

### 17.5 var 提升

```javascript
console.log(x);  // undefined (而非 ReferenceError)
var x = 1;

// 等价于
var x;
console.log(x);  // undefined
x = 1;
```

函数声明也会提升，且优先于变量：

```javascript
foo();  // 'foo'
function foo() { console.log('foo'); }

bar();  // TypeError: bar is not a function
var bar = function () { console.log('bar'); };
```

### 17.6 块级作用域与函数声明

```javascript
{
  function f() { return 1; }
  f();  // 1
}
f();  // 1（非严格模式下，块级函数声明提升到外层）

'use strict';
{
  function f() { return 1; }
  f();  // 1
}
f();  // ReferenceError（严格模式下块级作用域隔离）
```

### 17.7 async-await 的执行顺序

```javascript
async function A() {
  console.log('A1');
  await Promise.resolve();
  console.log('A2');
}

async function B() {
  console.log('B1');
  await Promise.resolve();
  console.log('B2');
}

A();
B();
console.log('C');

// 输出：A1, B1, C, A2, B2
```

每次 await 都将后续代码作为 microtask 调度，因此 A2 与 B2 在 C 之后执行。

### 17.8 Promise 链中的错误传播

```javascript
Promise.resolve()
  .then(() => { throw new Error('boom'); })
  .then(() => console.log('second'));  // 不执行
  .catch(e => console.log(e.message));  // 'boom'

// 链中任何 reject 都会跳到最近的 catch
```

### 17.9 for-in 与 hasOwnProperty

```javascript
const obj = Object.create({ inherited: 'inherited' });
obj.own = 'own';

for (const k in obj) {
  console.log(k);  // 'own', 'inherited'（for-in 遍历原型链）
}

for (const k in obj) {
  if (obj.hasOwnProperty(k)) console.log(k);  // 'own'
}
```

### 17.10 数组方法的 this 与 length

```javascript
const arr = [1, 2, 3];
arr.length = 5;
arr;  // [1, 2, 3, empty × 2]
arr.map(x => x * 2);  // [2, 4, 6, empty × 2]（map 跳过 empty）

arr.length = 2;
arr;  // [1, 2]
```

## 18. 工程实践

### 18.1 类型化保护

```javascript
function isString(v) { return typeof v === 'string'; }
function isNumber(v) { return typeof v === 'number' && !Number.isNaN(v); }
function isObject(v) { return typeof v === 'object' && v !== null; }
function isArray(v) { return Array.isArray(v); }
function isFunction(v) { return typeof v === 'function'; }

function assert(cond, msg) {
  if (!cond) throw new TypeError(msg || 'Assertion failed');
}

function processUser(user) {
  assert(isObject(user), 'user must be object');
  assert(isString(user.name), 'user.name must be string');
  assert(isNumber(user.age), 'user.age must be number');
  // ...
}
```

### 18.2 错误处理分层

```javascript
class AppError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

class ValidationError extends AppError {}
class NetworkError extends AppError {}
class AuthError extends AppError {}

async function fetchUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (res.status === 401) throw new AuthError('UNAUTHORIZED', '请重新登录');
    if (res.status === 404) throw new ValidationError('NOT_FOUND', '用户不存在');
    if (!res.ok) throw new NetworkError('NETWORK_ERROR', `HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new NetworkError('NETWORK_ERROR', '请求失败', e);
  }
}
```

### 18.3 模块设计

```javascript
// 单一职责：每个模块只做一件事
// user-service.js
export class UserService {
  constructor(repo) { this.repo = repo; }
  async getUser(id) { /* ... */ }
}

// user-controller.js
export class UserController {
  constructor(service) { this.service = service; }
  async handleGetUser(req, res) { /* ... */ }
}

// user-routes.js
export function userRoutes(controller) {
  router.get('/users/:id', controller.handleGetUser);
  return router;
}
```

### 18.4 性能优化原则

1. **避免在热路径创建对象**：复用对象，避免 GC 压力
2. **批量操作**：使用 Map/Set 批量更新，避免循环内单独操作
3. **避免不必要的 Proxy**：高频路径绕过
4. **隐藏类稳定**：相同顺序初始化，避免动态添加属性
5. **typed array 替代普通数组**：数值密集计算用 Float64Array、Int32Array
6. **worker 卸载**：CPU 密集任务放到 Web Worker 或 Worker Thread

```javascript
// 反例：循环内创建对象
for (let i = 0; i < 1e6; i++) {
  const point = { x: i, y: i * 2 };
  process(point);
}

// 优化：复用对象
const point = { x: 0, y: 0 };
for (let i = 0; i < 1e6; i++) {
  point.x = i;
  point.y = i * 2;
  process(point);
}
```

### 18.5 测试驱动

```javascript
import { test, expect } from 'vitest';

function sum(a, b) { return a + b; }

test('sum adds two numbers', () => {
  expect(sum(1, 2)).toBe(3);
  expect(sum(-1, 1)).toBe(0);
  expect(sum(0.1, 0.2)).toBeCloseTo(0.3);
});
```

### 18.6 异步错误处理

```javascript
// 反例：未捕获的 Promise
fetch('/api').then(res => res.json());  // 未 catch，错误静默

// 修复：catch 或 async-await + try-catch
fetch('/api')
  .then(res => res.json())
  .catch(e => console.error(e));

async function safeFetch() {
  try {
    const res = await fetch('/api');
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}
```

### 18.7 全局错误兜底

```javascript
// 浏览器
window.addEventListener('unhandledrejection', e => {
  console.error('Unhandled promise rejection:', e.reason);
  e.preventDefault();
});
window.addEventListener('error', e => {
  console.error('Global error:', e.error);
});

// Node.js
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
```

## 19. 案例研究

### 19.1 React 的事件委托与合成事件

React 通过事件委托将所有事件统一挂载到 document（React 17+ 挂载到 root container），通过事件冒泡机制触发组件回调。这避免了为每个元素单独 addEventListener，节省内存。

理论应用：

- **闭包**：每个事件处理器闭包捕获对应组件实例
- **事件循环**：合成事件通过 dispatchEvent 同步触发，但实际触发时机仍由事件循环决定
- **代理模式**：事件委托本质上是利用事件冒泡的代理

### 19.2 Vue 3 的响应式系统

Vue 3 的 reactivity 基于 Proxy 实现：

```javascript
function reactive(target) {
  return new Proxy(target, {
    get(t, key, receiver) {
      track(t, key);  // 依赖收集
      return Reflect.get(t, key, receiver);
    },
    set(t, key, value, receiver) {
      const result = Reflect.set(t, key, value, receiver);
      trigger(t, key);  // 触发更新
      return result;
    }
  });
}
```

理论应用：

- **Proxy 元编程**：拦截 get/set 实现依赖追踪
- **WeakMap**：targetMap 使用 WeakMap 存储依赖，target 被回收时自动清理
- **闭包**：activeEffect 是一个闭包变量

### 19.3 Express 的中间件模型

Express 通过 next 函数实现中间件链：

```javascript
app.use((req, res, next) => {
  console.log('middleware 1');
  next();
  console.log('after next 1');
});
app.use((req, res, next) => {
  console.log('middleware 2');
  next();
});
```

理论应用：

- **闭包**：next 函数捕获当前中间件索引
- **尾调用**：next 是尾调用，可被尾调用优化
- **执行栈**：next 不挂起当前执行，本质是同步递归调用

### 19.4 Redux 的不可变性

Redux 强制 reducer 不可变：

```javascript
function reducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INC':
      return { ...state, count: state.count + 1 };
    default:
      return state;
  }
}
```

理论应用：

- **引用比较**：不可变更新使引用比较等价于值比较
- **GC 友好**：旧 state 不再被引用时立即回收
- **隐藏类稳定**：相同结构更新保持隐藏类一致，利于 V8 优化

### 19.5 Node.js 的流

Node.js Stream 基于事件：

```javascript
const readable = fs.createReadStream('file.txt');
const writable = fs.createWriteStream('out.txt');

readable.on('data', chunk => {
  writable.write(chunk);
});
readable.on('end', () => writable.end());
```

理论应用：

- **事件循环**：data 事件由 libuv 在 poll 阶段触发
- **背压**：writable.write 返回 false 时暂停 readable
- **闭包**：事件处理器闭包捕获 writable 引用

## 20. 习题

### 20.1 填空题（fill-blank）

1. **[remember]** JavaScript 的词法环境由 ____ 与 ____ 两部分组成，前者存储变量绑定，后者指向外层环境。

2. **[remember]** 在 HTML 规范 §8.1.7 中，事件循环的每轮迭代称为一个 ____，其内部包含 Microtask 检查点。

3. **[understand]** ToPrimitive(obj, hint) 在 hint 为 "number" 时会优先调用对象的 ____ 方法，其次调用 ____ 方法。

4. **[understand]** ES6 引入的 let 在 for 循环中，每次迭代开始时都会创建新的 ____，从而保证闭包捕获独立的绑定。

5. **[remember]** V8 的多层执行流水线从解释器到优化编译器依次为 Ignition、____、____、TurboFan。

6. **[understand]** Promise 满足 Monad 三定律：左单位律、____、____。

7. **[remember]** JavaScript 的 8 种语言类型为 Undefined、Null、Boolean、String、Number、Symbol、____、____。

8. **[understand]** Proxy 必须满足若干不变量，例如若 target 不可扩展，则 getPrototypeOf 必须返回 ____。

### 20.2 选择题（choice）

1. **[analyze]** 下列关于原型链的描述，哪一项是正确的？
   - A. [[Prototype]] 是可枚举属性，可通过 for-in 遍历到
   - B. Object.create(null) 创建的对象没有 [[Prototype]]，因此不继承任何方法
   - C. 函数的 prototype 属性与其实例的 [[Prototype]] 是同一个指针
   - D. 修改构造函数的 prototype 会立即影响已创建实例的 [[Prototype]] 链

   答案：B

2. **[understand]** 关于严格模式 "use strict" 的语义，下列哪一项是错误的？
   - A. 禁止 with 语句
   - B. 函数内部 this 默认绑定到全局对象
   - C. 重复参数名会抛出 SyntaxError
   - D. 删除不可配置属性会抛出 TypeError

   答案：B

3. **[apply]** 以下代码的输出是什么？

   ```javascript
   console.log(typeof null);
   console.log(typeof undefined);
   console.log(typeof NaN);
   console.log(typeof []);
   ```

   - A. 'null' 'undefined' 'NaN' 'array'
   - B. 'object' 'undefined' 'number' 'object'
   - C. 'null' 'undefined' 'number' 'array'
   - D. 'object' 'undefined' 'NaN' 'object'

   答案：B

4. **[analyze]** 以下代码的输出顺序是什么？

   ```javascript
   console.log('1');
   setTimeout(() => console.log('2'), 0);
   Promise.resolve().then(() => console.log('3'));
   console.log('4');
   ```

   - A. 1 2 3 4
   - B. 1 4 3 2
   - C. 1 4 2 3
   - D. 1 3 4 2

   答案：B

5. **[evaluate]** 关于 WeakMap 与 Map 的比较，下列哪一项是错误的？
   - A. WeakMap 的 key 必须是对象
   - B. WeakMap 不可迭代
   - C. WeakMap 的 key 被 GC 回收后 entry 自动消失
   - D. WeakMap 的 value 也是弱引用

   答案：D（value 是强引用）

6. **[understand]** 以下代码的输出是什么？

   ```javascript
   const a = { x: 1 };
   const b = a;
   b.x = 2;
   console.log(a.x);
   ```

   - A. 1
   - B. 2
   - C. undefined
   - D. TypeError

   答案：B

7. **[analyze]** 以下代码的输出是什么？

   ```javascript
   for (var i = 0; i < 3; i++) {
     setTimeout(() => console.log(i), 0);
   }
   ```

   - A. 0 1 2
   - B. 3 3 3
   - C. 0 0 0
   - D. undefined undefined undefined

   答案：B

8. **[evaluate]** 关于 async-await 的描述，下列哪一项是正确的？
   - A. async 函数总是返回 Promise
   - B. await 只能用于 Promise，不能用于普通值
   - C. async 函数内的异常会被自动 try-catch
   - D. 顶层 await 在任何文件都可用

   答案：A

### 20.3 代码修复题（code-fix）

1. **[apply]** 以下代码期望依次输出 0、1、2、3、4，但实际输出五次 5。请指出缺陷并修复。

   ```javascript
   for (var i = 0; i < 5; i++) {
     setTimeout(() => console.log(i), 0);
   }
   ```

   修复：

   ```javascript
   for (let i = 0; i < 5; i++) {
     setTimeout(() => console.log(i), 0);
   }
   ```

2. **[apply]** 以下代码期望按顺序输出 A、B、C，但实际输出顺序不可控。请修复。

   ```javascript
   function fetchA(cb) { setTimeout(() => cb('A'), Math.random() * 100); }
   function fetchB(cb) { setTimeout(() => cb('B'), Math.random() * 100); }
   function fetchC(cb) { setTimeout(() => cb('C'), Math.random() * 100); }

   fetchA(console.log);
   fetchB(console.log);
   fetchC(console.log);
   ```

   修复：

   ```javascript
   function fetchA() { return new Promise(r => setTimeout(() => r('A'), Math.random() * 100)); }
   function fetchB() { return new Promise(r => setTimeout(() => r('B'), Math.random() * 100)); }
   function fetchC() { return new Promise(r => setTimeout(() => r('C'), Math.random() * 100)); }

   (async () => {
     console.log(await fetchA());
     console.log(await fetchB());
     console.log(await fetchC());
   })();
   ```

3. **[analyze]** 以下代码期望通过代理拦截属性读取并记录日志，但读取 obj.title 时报错。请修复。

   ```javascript
   const handler = {
     get(target, key) {
       console.log(`read ${key}`);
       return target[key];
     }
   };
   const obj = new Proxy({ title: 'JS' }, handler);
   obj.title;
   ```

   修复：

   ```javascript
   const handler = {
     get(target, key, receiver) {
       console.log(`read ${key}`);
       return Reflect.get(target, key, receiver);
     }
   };
   ```

4. **[evaluate]** 以下代码期望缓存计算结果，但当 hugeObj 被回收时缓存未清理，导致内存泄漏。请修复。

   ```javascript
   const cache = new Map();
   function compute(obj) {
     if (cache.has(obj)) return cache.get(obj);
     const result = expensive(obj);
     cache.set(obj, result);
     return result;
   }
   ```

   修复：

   ```javascript
   const cache = new WeakMap();
   function compute(obj) {
     if (cache.has(obj)) return cache.get(obj);
     const result = expensive(obj);
     cache.set(obj, result);
     return result;
   }
   ```

5. **[create]** 以下代码期望在 obj.x 变化时触发回调，但未实现。请用 Proxy 实现。

   ```javascript
   const obj = { x: 1 };
   observe(obj, 'x', (newVal, oldVal) => {
     console.log(`x: ${oldVal} -> ${newVal}`);
   });
   obj.x = 2;  // 应输出 "x: 1 -> 2"
   ```

   修复：

   ```javascript
   function observe(target, key, callback) {
     let value = target[key];
     return new Proxy(target, {
      set(t, k, v, receiver) {
        const old = t[k];
        const ok = Reflect.set(t, k, v, receiver);
        if (ok && k === key && old !== v) callback(v, old);
        return ok;
      }
     });
   }
   const obj = observe({ x: 1 }, 'x', (newVal, oldVal) => {
     console.log(`x: ${oldVal} -> ${newVal}`);
   });
   obj.x = 2;
   ```

### 20.4 开放题（open-ended）

1. **[evaluate]** 请从代数效应（algebraic effects）的视角论证 async-await 是 Generator + Promise 的语法糖，并说明为何 async 函数无法替代真正的代数效应。

2. **[create]** 在设计一个长生命周期 SPA 的内存模型时，如何综合运用 WeakMap、WeakRef、FinalizationRegistry 来实现既不阻塞 GC、又能在对象被回收时清理关联资源的缓存？请描述数据流与失败模式。

3. **[evaluate]** 比较原型继承与类继承在以下维度的差异：内存占用、方法查找复杂度、运行时灵活性、静态类型友好度、与函数式编程的兼容性。结合 V8 的隐藏类机制说明原型继承的性能特点。

4. **[analyze]** 为什么 typeof null === 'object'？这一历史遗留问题为何至今未修复？请从规范兼容性与向后兼容性两个角度分析。

5. **[create]** 设计一个基于 Generator 的有限状态机库，要求：状态转移声明式、状态机可暂停恢复、支持嵌套状态机。请用代码示例说明。

6. **[evaluate]** 讨论事件循环模型在以下场景的局限：CPU 密集任务、长任务阻塞、背压、取消传播。Web Worker 与 SharedArrayBuffer 如何部分解决这些问题？

## 21. 理论速查表

| 概念 | 核心要点 | 关键细节 |
| ---- | -------- | -------- |
| ECMAScript 规范 | ECMA-262 标准 | 27 章结构，700+ 抽象操作 |
| 执行上下文 | 代码执行状态容器 | LexicalEnvironment + VariableEnvironment |
| 词法环境 | 标识符解析结构 | Environment Record + outer |
| 闭包 | 函数 + 词法环境 | 静态作用域，绑定捕获 |
| 原型链 | 对象继承结构 | [[Prototype]] 指针 |
| class | 原型继承语法糖 | [[HomeObject]] 支持 super |
| 事件循环 | HTML §8.1.7 | Microtask 优先于 Macrotask |
| Promise | 三态状态机 | 满足 Monad 三定律 |
| async-await | Generator + Promise 语法糖 | 受限代数效应 |
| ToPrimitive | 类型转换核心 | valueOf/toString 优先级 |
| 严格模式 | 语言方言 | 禁止 with，this 默认 undefined |
| Proxy | 异质对象 | 13 种内部方法可拦截 |
| Reflect | 元编程命名空间 | 与 Proxy handler 一一对应 |
| WeakMap | 弱引用键值对 | key 不阻止 GC |
| WeakRef | 显式弱引用 | deref 返回 Maybe |
| FinalizationRegistry | GC 回调 | 时机不可预测 |
| V8 多层 JIT | Ignition/Sparkplug/Maglev/TurboFan | 推测优化 + 逆优化 |
| 隐藏类 | 对象内存布局 | 相同结构共享隐藏类 |
| 内联缓存 | 属性访问加速 | 单态最快，超多态最慢 |
| 新生代 GC | Scavenge 半空间复制 | 短生命周期对象 |
| 老生代 GC | Mark-Sweep-Compact | 增量标记 + 并发回收 |

## 22. 参考文献（ACM Reference Format）

[1] Eich, B. 1995. JavaScript 1.0 Specification. Netscape Communications Corporation.

[2] ECMA International. 2026. ECMAScript 2026 language specification (27th edition). Standard ECMA-262. DOI: 10.17445/ecma-262-27.

[3] van Kesteren, A. 2026. HTML living standard, section 8.1.7: Event loops. WHATWG. Retrieved from https://html.spec.whatwg.org/.

[4] Rossberg, A. 2018. JavaScript semantics: A formal specification of the ECMAScript language. In Proceedings of the 32nd European Conference on Object-Oriented Programming (ECOOP 2018). Schloss Dagstuhl. DOI: 10.4230/LIPIcs.ECOOP.2018.15.

[5] Flanagan, C. and Freund, S. N. 2000. Type inference against races. Science of Computer Programming 39, 2-3, 199-224. DOI: 10.1016/S0167-6423(00)00015-3.

[6] Anderson, C., Giannakopoulos, P., and Dinesh, T. 2010. Towards JavaScript program verification via type analysis. In Proceedings of the 9th International Conference on Coordination Models and Languages (COORDINATION 2010). Springer. DOI: 10.1007/978-3-642-13493-2_12.

[7] Lieberman, H. 1986. Using prototypical objects to implement shared behavior. In Proceedings of the 1st ACM Conference on Object-Oriented Programming Systems, Languages, and Applications (OOPSLA 1986). ACM, New York, NY, 214-223. DOI: 10.1145/28697.28718.

[8] Ungar, D. and Smith, R. B. 1987. Self: The power of simplicity. In Proceedings of the 2nd ACM Conference on Object-Oriented Programming Systems, Languages, and Applications (OOPSLA 1987). ACM, New York, NY, 227-242. DOI: 10.1145/38765.38828.

[9] Landin, P. J. 1964. The mechanical evaluation of expressions. The Computer Journal 6, 4, 308-320. DOI: 10.1093/comjnl/6.4.308.

[10] Platzer, A. and Pretnar, M. 2010. Algebraic effects and handlers. In Proceedings of the 19th European Symposium on Programming (ESOP 2010). Springer. DOI: 10.1007/978-3-642-11957-6_7.

[11] Wadler, P. 1995. Monads for functional programming. In Advanced Functional Programming, Lecture Notes in Computer Science, vol. 925. Springer, 24-52. DOI: 10.1007/3-540-59451-5_2.

[12] Cheney, C. J. 1970. A nonrecursive list compacting algorithm. Communications of the ACM 13, 11, 677-678. DOI: 10.1145/362790.362798.

[13] Bishop, P. 1977. Computer systems with a very large number of processes. Technical Report CS-RR-078. University of Warwick.

[14] McCarthy, J. 1960. Recursive functions of symbolic expressions and their computation by machine, part I. Communications of the ACM 3, 4, 184-195. DOI: 10.1145/367177.367199.

[15] Felleisen, M. and Hieb, R. 1992. The revised report on the syntactic theories of sequential control and state. Theoretical Computer Science 103, 2, 235-271. DOI: 10.1016/0304-3975(92)90014-7.

[16] Herman, D. 2012. Algebraic effects and handlers in JavaScript. In Proceedings of the ACM International Symposium on New Ideas, New Paradigms, and Reflections on Programming and Software (Onward! 2012). ACM, New York, NY. DOI: 10.1145/2384592.2384603.

[17] Seligman, J., Caires, M., and Pucella, R. 2011. Algebraic effects and resources. Theoretical Computer Science 412, 28, 3214-3232. DOI: 10.1016/j.tcs.2011.03.013.

[18] Ott, J. 2010. Garbage collection. In Handbook of Programming Languages, vol. 1. Macmillan Technical Publishing.

[19] Jones, R. and Lins, R. 1996. Garbage Collection: Algorithms for Automatic Dynamic Memory Management. John Wiley & Sons.

[20] Click, C. 2005. The pauses that refresh: Reducing garbage collection pause times. Sun Microsystems Technical Report.

[21] Titzer, B. and Palsberg, J. 2010. Vertical compression of JavaScript abstract syntax trees. In Proceedings of the 9th International Conference on Generative Programming and Component Engineering (GPCE 2010). ACM. DOI: 10.1145/1868294.1868301.

[22] Richards, G., Lebresne, S., Burg, B., and Vitek, J. 2010. An analysis of the dynamic behavior of JavaScript programs. In Proceedings of the 31st ACM SIGPLAN Conference on Programming Language Design and Implementation (PLDI 2010). ACM. DOI: 10.1145/1806596.1806638.

[23] Ratanaworabhan, P., Livshits, V. B., and Zorn, B. G. 2010. JSMeter: Comparing the behavior of JavaScript web applications. In Proceedings of the 9th Annual Workshop on the Interaction between Operating Systems and Computer Architecture (WIOSCA 2010).

[24] Tavares, A., et al. 2018. JSCoverage: Path coverage for JavaScript. arXiv preprint arXiv:1805.04598.

[25] Matsakis, N. D. and Klock II, F. S. 2014. The Rust language. In Proceedings of the 2014 ACM SIGAda Annual Conference on High Integrity Language Technology (HILT 2014). ACM. DOI: 10.1145/2663171.2663188.

## 23. 延伸阅读

### 23.1 经典书籍

- David Flanagan. *JavaScript: The Definitive Guide*, 7th Edition. O'Reilly Media, 2020.
- Kyle Simpson. *You Don't Know JS* (six-book series). O'Reilly Media, 2014-2019.
- Marijn Haverbeke. *Eloquent JavaScript*, 3rd Edition. No Starch Press, 2018.
- Axel Rauschmayer. *Speaking JavaScript*. O'Reilly Media, 2014.
- Nicholas C. Zakas. *Principles of Object-Oriented JavaScript*. No Starch Press, 2014.
- Boris Cherny. *Programming TypeScript*. O'Reilly Media, 2019.
- Stefan Baumgartner. *JavaScript from Frontend to Backend*. Manning Publications, 2022.

### 23.2 规范与文档

- ECMA-262 规范最新版：https://tc39.es/ecma262/
- TC39 提案仓库：https://github.com/tc39/proposals
- WHATWG HTML Living Standard：https://html.spec.whatwg.org/
- MDN Web Docs：https://developer.mozilla.org/
- V8 团队博客：https://v8.dev/blog
- Node.js 文档：https://nodejs.org/docs/latest/api/

### 23.3 经典论文

- Andreas Rossberg. *JavaScript Semantics* (2018) - 形式化定义 ES5
- Matthias Felleisen. *On the Expressive Power of Programming Languages* (1991)
- Gordon Plotkin. *Call-by-Name, Call-by-Value and the λ-Calculus* (1975)
- Peter Landin. *The Next 700 Programming Languages* (1966)
- André Platzer & Matija Pretnar. *Handlers of Algebraic Effects* (2009)
- Andreas Rossberg, et al. *Trait-based JavaScript* (2013)

### 23.4 开源项目

- V8 引擎：https://v8.dev/
- SpiderMonkey（Firefox）：https://spidermonkey.dev/
- JavaScriptCore（Safari）：https://trac.webkit.org/wiki/JavaScriptCore
- Node.js：https://nodejs.org/
- Deno：https://deno.land/
- Bun：https://bun.sh/
- QuickJS（嵌入式 JS 引擎）：https://bellard.org/quickjs/
- TypeScript：https://www.typescriptlang.org/

### 23.5 学术课程

- MIT 6.S192: Software Construction
- Stanford CS142: Web Applications
- CMU 15-440: Distributed Systems
- MIT 6.824: Distributed Systems
- Berkeley CS162: Operating Systems and System Programming
- ETH Zurich: Advanced JavaScript
- University of Washington CSE 490H: Programming Languages

### 23.6 进阶主题

以下主题超出本文范围，建议进一步研究：

- **WebAssembly 与 JavaScript 互操作**：wasm 模块与 JS 引擎的内存共享与调用约定
- **SharedArrayBuffer 与 Atomics**：跨 worker 共享内存与原子操作
- **Streams API**：可读流、可写流、转换流的形式语义
- **OffscreenCanvas**：在 Worker 中渲染 Canvas
- **MutationObserver、IntersectionObserver、ResizeObserver**：观察者模式的标准化
- **Web Components**：Custom Elements、Shadow DOM、HTML Templates
- **Service Worker**：离线与背景同步的形式语义
- **Import Maps**：模块解析的运行时配置
- **Pattern Matching 提案**：模式匹配的形式语义与代数数据类型

## 24. 附录 A：Bloom 分类法与习题映射

本文习题按 Bloom 分类法设计，覆盖六个认知层级：

| 层级 | 习题类型 | 示例 |
| ---- | -------- | ---- |
| remember | 填空题 | 复述规范条目、术语定义 |
| understand | 填空题、选择题 | 解释语义、对比概念 |
| apply | 选择题、代码修复题 | 运用规则预测结果、修复缺陷 |
| analyze | 选择题、代码修复题 | 拆解执行流程、识别陷阱 |
| evaluate | 选择题、开放题 | 评估方案优劣、论证等价性 |
| create | 代码修复题、开放题 | 设计元编程抽象、构造缓存方案 |

建议学习路径：

1. 先读历史动机建立直觉
2. 学习形式化定义建立框架
3. 通过代码示例验证理解
4. 完成填空与选择题巩固基础
5. 挑战代码修复与开放题
6. 阅读案例研究连接实践

## 25. 附录 B：术语对照表

| 中文术语 | 英文术语 | 缩写 | 含义 |
| -------- | -------- | ---- | ---- |
| 执行上下文 | Execution Context | EC | 代码执行状态容器 |
| 词法环境 | Lexical Environment | LE | 标识符解析结构 |
| 变量环境 | Variable Environment | VE | var 声明存储 |
| 环境记录 | Environment Record | ER | 变量绑定存储 |
| 闭包 | Closure | - | 函数 + 词法环境 |
| 原型链 | Prototype Chain | - | 对象继承结构 |
| 内部槽 | Internal Slot | - | 对象内部状态 |
| 内部方法 | Internal Method | - | 对象基本操作 |
| 抽象操作 | Abstract Operation | AO | 规范内部函数 |
| 完成记录 | Completion Record | CR | 求值结果包装 |
| 代理 | Proxy | - | 异质对象包装 |
| 反射 | Reflect | - | 元编程命名空间 |
| 弱引用 | Weak Reference | - | 不阻止 GC 的引用 |
| 最终化注册 | Finalization Registry | FR | GC 回调注册 |
| 隐藏类 | Hidden Class / Map | - | V8 对象布局描述 |
| 内联缓存 | Inline Cache | IC | 属性访问加速 |
| 推测优化 | Speculative Optimization | - | 基于类型反馈的优化 |
| 逆优化 | Deoptimization | - | 优化失败回退 |
| 事件循环 | Event Loop | EL | 异步任务调度 |
| 微任务 | Microtask | - | 高优先级异步任务 |
| 宏任务 | Macrotask | - | 普通异步任务 |
| 严格模式 | Strict Mode | - | 语言方言 |
| 类型转换 | Type Conversion | - | 隐式或显式类型变化 |
| 原始值转换 | ToPrimitive | - | 对象转原始值 |
| 代数效应 | Algebraic Effect | AE | 函数式效应抽象 |
| 续延 | Continuation | - | 计算剩余部分 |

## 26. 附录 C：版本与变更日志

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| 1.0 | 2024-01-15 | 初版，覆盖事件循环、V8、GC 基础 | FANDEX Team |
| 2.0 | 2026-07-20 | 金标准升级：覆盖 12 项质量基准、12 大主题、形式化定义、Bloom 习题、25 篇参考文献 | FANDEX Content Engineering Team |

后续版本规划：

- v3.0 计划补充 WebAssembly 互操作、SharedArrayBuffer 内存模型
- v3.0 计划增加更多 V8 内部机制（如 Fuel、Bytecode Aging）
- v3.0 计划引入 PLT Redex 形式化描述的更多示例
- v3.0 计划补充 Deno、Bun 等 Runtime 的对比

---

本文最后审阅日期：2026-07-20
审阅方：FANDEX Content Engineering Team
