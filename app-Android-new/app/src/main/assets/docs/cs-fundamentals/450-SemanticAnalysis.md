---
order: 450
title: 语义分析
module: 'cs-fundamentals'
category: 计算机科学
difficulty: intermediate
description: 编译器语义分析：符号表管理、类型检查、作用域与类型转换。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cs-fundamentals/430-LexicalAnalysis'
  - 'cs-fundamentals/440-GrammarAnalysis'
  - 'cs-fundamentals/460-IntermediateCode'
  - 'cs-fundamentals/470-CodeOptimization'
prerequisites:
  - 'cs-fundamentals/010-ComputerOverview'
---

## 前置知识

- 词法分析产出记号流、语法分析产出语法树（见 [词法分析](cs-fundamentals/430-LexicalAnalysis) 与 [语法分析](cs-fundamentals/440-GrammarAnalysis)）；
- 树与哈希表的基本操作；
- 至少一门静态类型语言（C/Java/Go/TypeScript）的变量声明与类型体验。

## 学习目标

- 说清语义分析在编译流程中的位置：语法对了不等于程序有意义；
- 理解语法制导翻译与属性文法：语义规则如何"挂"在语法树上执行；
- 掌握符号表的数据结构与作用域管理（嵌套作用域的进出栈）；
- 区分类型等价的两种标准（名等价/结构等价）与隐式转换的规则。

## 1. 概念引入：语法对，不代表有意义

一个类比：语文老师说"我吃午饭"是通顺句子，"我吃椅子"也**符合语法**（主谓宾齐全），但语义荒谬。程序同理：

```c
int x = "hello" + 3;        // 语法上：声明语句，完全合法
                            // 语义上：字符串与整数相加？类型不匹配
```

语法分析器（检查"句子结构"）愉快地建好了语法树；轮到**语义分析器**审查"这句话有没有意义"：

- `x` 声明过吗？（未声明变量）
- `"hello"` 和 `3` 能相加吗？（类型不匹配）
- 这个函数名的参数个数对吗？（签名不匹配）
- `break` 出现在循环外合法吗？（上下文约束）

语义分析的结果通常是**带类型与引用信息的语法树（AST 标注）**，交给后续生成中间代码（见 [中间代码](cs-fundamentals/460-IntermediateCode)）。它的两大工具：符号表（查"人"）与类型系统（查"话"）。

## 2. 语法制导翻译与属性文法

语义检查不需要另起炉灶重新解析——直接**依附在语法分析的过程上**：

- **语法制导翻译**：为每条产生式附加一段语义动作（计算、检查、翻译），归约/递归下降到该产生式时执行；
- **属性文法**：为文法符号定义属性（如表达式的类型 `E.type`、是否常量 `E.isConst`），用语义规则描述属性如何计算：
  - **综合属性**：由子节点算出，自底向上传递（`E -> E1 + E2` 时 `E.type = 兼容检查(E1.type, E2.type)`）；
  - **继承属性**：由父/兄弟节点传下来，自顶向下使用（把"当前所在函数的返回类型"传给内部 return 语句做检查）。

```text
E -> E1 + E2   { if (E1.type == int && E2.type == int) E.type = int; else error(); }
E -> num       { E.type = int; }
D -> T id ;    { addType(id.entry, T.type); }   // 声明：把类型写进符号表
```

这两条规则合起来就是一次最朴素的类型检查：数字是 int，int+int 是 int，其余报错。属性文法把"语义 = 树上流动的信息"这一思想形式化了。

## 3. 符号表：语义分析的数据库

### 3.1 记什么

符号表（symbol table）记录每个**标识符**的全部语义信息：

| 字段 | 例子 |
| ---- | ---- |
| 名字与类别 | `count`，变量/函数/类型 |
| 类型 | `int`、`func(int, int) -> bool` |
| 作用域层级 | 第 2 层嵌套块 |
| 存储信息 | 相对偏移、寄存器分配（后端用） |
| 其他 | 是否 const、是否已初始化、可见性 |

### 3.2 作用域管理：栈式符号表

嵌套作用域（块、函数、命名空间）的经典管理法是**作用域栈**：

```text
进入块时压入新表；查找时自顶向下逐层找（内层遮蔽外层）；离开块时弹出。
```

```python
# scope_demo.py：栈式符号表与"先使用后声明"检查的骨架
class Scope:
    def __init__(self, parent=None):
        self.names = {}          # 本层：名字 -> 信息
        self.parent = parent     # 外层作用域

    def declare(self, name, info):
        if name in self.names:                 # 同层重复声明
            raise SemanticError(f"'{name}' 已在本作用域声明")
        self.names[name] = info

    def lookup(self, name):
        s = self
        while s:                               # 内层向外层逐级查找
            if name in s.names:
                return s.names[name]
            s = s.parent
        raise SemanticError(f"'{name}' 未声明")

scopes = [Scope()]           # 栈底：全局作用域
scopes.append(Scope(scopes[-1]))            # 进入函数体
scopes[-1].declare("i", "int")
print(scopes[-1].lookup("i"))               # 输出 int
scopes.pop()                                # 离开函数体
scopes[-1].lookup("i")                      # 触发：'i' 未声明
```

两处设计体现真实的语言规则：同名遮蔽靠"先查内层"自然获得；Python 这类"先绑定后可见"的语言由 `lookup` 未命中即报错实现，而 JavaScript 的 `var` 提升则需要**两遍扫描**（第一遍登记全部声明，第二遍检查使用）——"一遍扫描还是两遍"取决于语言定义的作用域规则。

### 3.3 哈希表实现

每层作用域内部用哈希表（名字 -> 记录）保证 O(1) 查找；需要按序遍历（如 C 的声明顺序敏感场景）时再挂一条链表维护插入序。编译器符号表是"哈希表 + 栈"组合的最经典工业应用。

## 4. 类型检查

### 4.1 类型系统与检查时机

类型检查回答"运算符与操作数是否匹配"。按检查时机分：

- **静态类型**（C、Java、Rust）：编译期检查完，类型信息用于生成高效代码；
- **动态类型**（Python、JS）：编译期不查，运行期每个操作前自检（代价是运行时开销与"上线才爆"）；
- **渐进类型**（TypeScript、Python type hints）：静态注解 + 运行时不强制，工程折中。

强/弱类型是另一根轴：强弱描述"隐式转换激进与否"（`1 + "2"` 在 JS 得 `"12"`，弱类型；在 Python 报错，强类型）。

### 4.2 类型等价：名等价与结构等价

两个类型何时算"同一个"？

```c
typedef int Meters;
typedef int Seconds;
Meters m; Seconds s;
m = s;      // 名等价语言（如 Pascal/Ada）：报错——名字不同就是不同类型
            // C 的 typedef 只是别名：实际上 int == int，通过
struct { int x; } a;
struct { int x; } b;
a = b;      // 结构等价：字段一致即同一类型；C 语言里这是两个匿名类型，互不兼容
```

- **名等价（name equivalence）**：类型名不同即不同，哪怕内部结构一样。更严格，能表达"语义不同的同类数据"（Meters 与 Seconds 防混用）；
- **结构等价（structural equivalence）**：结构相同即相同。更灵活，TypeScript 是典型代表（`{x: number}` 与另一个同形接口互通）。

### 4.3 隐式类型转换

许多语言允许编译器自动插转换（coercion），语义分析需要维护一张**转换规则表**：`int -> float` 无损（提升，自动做）；`float -> int` 截断有损（C 自动、Java 报错、Rust 必须显式 `as`）。表达式类型推导常沿"统一提升"规则：`int + double -> double`。隐式转换是双刃剑——减少噪音的同时制造了 C 里 `unsigned int` 与 `int` 比较这类经典 bug 温床。

## 5. 常见语义错误清单

| 错误 | 触发检查 | 语言示例 |
| ---- | ---- | ---- |
| 未声明变量 | lookup 失败 | C 报错；JS 非严格模式隐式全局 |
| 重复声明 | 同层 declare 冲突 | Java 方法内重复 `int i` |
| 类型不匹配 | 二元运算/赋值/传参 | `"s" + 3`（Java） |
| 函数签名不符 | 实参表 vs 形参表 | 参数个数/类型错 |
| return 类型不符 | 继承属性：期望返回类型 | 忘写 return（非 void 函数） |
| break/continue 位置 | 上下文约束（是否在循环内） | 用继承属性传递"当前是否在循环中" |

注意最后两行：**有些"语义规则"与类型无关**，它们通过继承属性在树上传递上下文（所在函数、所在循环），这是属性文法表达力的体现。

## 6. 完整示例：一个可运行的迷你类型检查器

```python
# mini_checker.py：对形如 "1 + 2 * x" 的表达式做类型检查
# 语法制导思想：类型作为综合属性，在自底向上遍历 AST 时计算
class SemanticError(Exception):
    pass

symbols = {"x": "float", "name": "str"}          # 符号表（已声明的变量）

def check(node):
    """返回该节点的类型（综合属性）"""
    kind = node[0]
    if kind == "num":
        return "int" if isinstance(node[1], int) else "float"
    if kind == "str":
        return "str"
    if kind == "var":
        if node[1] not in symbols:
            raise SemanticError(f"未声明的变量: {node[1]}")   # 符号表查询
        return symbols[node[1]]
    if kind == "binop":
        lt, rt = check(node[2]), check(node[3])               # 自底向上
        op = node[1]
        if op == "+":
            if lt == rt == "int":  return "int"
            if lt in ("int", "float") and rt in ("int", "float"):
                return "float"                                 # 统一提升
            raise SemanticError(f"{lt} 与 {rt} 不能相加")      # 类型不匹配
        raise SemanticError(f"不支持的运算符 {op}")
    raise SemanticError(f"未知节点 {kind}")

#        ( + )
#       /     \
#   ( num 1 ) ( * )
#             /   \
#        ( num 2 )( var x )
tree = ("binop", "+", ("num", 1), ("binop", "*", ("num", 2), ("var", "x")))
print("表达式类型:", check(tree))                # float

bad = ("binop", "+", ("str", "hi"), ("num", 3))
check(bad)                                       # 触发 SemanticError
```

运行 `python mini_checker.py`：

```text
表达式类型: float
Traceback (most recent call last):
  ...
SemanticError: str 与 int 不能相加
```

第一个表达式 `1 + 2 * x`：`2*x` 中 int 与 float 提升为 float，外层 `1 + float` 仍为 float。第二个表达式正确报出类型不匹配。十几行代码覆盖了符号表查询、综合属性、类型提升三大主题——真实编译器的语义分析就是这套逻辑的工业化放大。

## 7. 常见陷阱与调试

- **混淆语法错误与语义错误**：`int x = ;` 是语法错（解析阶段拦下）；`x = y + 1`（y 未声明）是语义错。报错行号定位阶段不同，读编译器输出时先分清。
- **遮蔽（shadowing）误判**：内层 `int x` 遮蔽外层 x 后，外层的所有后续使用仍指外层——检查器必须按"声明位置的作用域"判定，而不是"同名就一样"。
- **一遍扫描的语言规则误配**：C 要求"先声明后使用"，单遍栈式表即可；Java 类成员可前向引用（方法用后面声明的字段），需要两遍。照搬 C 的实现到 JS 上会误报。
- **隐式转换的掩盖效应**：类型检查"通过"不等于"符合意图"，`if (i = 0)`（赋值当判断）在 C 里合法。现代编译器用告警（`-Wall`）补足语义检查的宽松处。
- **符号表与生成的中间代码脱节**：类型信息必须标注在 AST 节点上传递给后端（偏移、大小），只"报错用完就扔"的符号表设计会让后端拿不到必要信息。

## 8. 实战场景

- **IDE 静态分析**：编辑器里的红色波浪线就是"常驻内存的语义分析器"，符号表同时服务补全（列出作用域内可用名字）与跳转（名字 -> 声明位置）。
- **TypeScript / mypy**：渐进类型语言的检查器本质是本文机制的工程化放大——结构等价 + 泛型推断 + 渐进注解合并。
- **DSL 与模板引擎**：自研配置语言、SQL 方言校验器都需要符号表与类型检查的最小子集，本文的栈式表 + 综合属性可直接落地。

## 小结

初学者要点：

- 语义分析检查"语法正确但无意义"的程序：未声明、类型不匹配、签名不符、上下文违规。
- 语法制导翻译把语义动作挂在文法产生式上；综合属性自底向上传类型，继承属性自顶向下传上下文。
- 符号表 = 每层作用域一个哈希表 + 作用域栈；查找由内向外，遮蔽自然涌现。

进阶注意：

- 类型等价标准（名等价/结构等价）与隐式转换表是语言"性格"的核心，检查器行为必须与语言规范逐条对齐。
- 一遍/两遍扫描的选择由语言的前向引用规则决定，不是实现偏好。
- 语义分析的产出（类型、偏移、引用信息）是中间代码生成与优化的输入，符号表设计要为后端服务，而非止步于报错。
