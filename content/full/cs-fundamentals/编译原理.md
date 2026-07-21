---
title: 编译原理
module: 'cs-fundamentals'
category: 'Computer Science / Compiler'
description: 编译原理核心：词法分析、语法分析、语义分析、中间代码生成、优化、目标代码生成。
author: fanquanpp
order: 60
tags:
  - 'cs-fundamentals'
  - 'computer-science---compiler'
  - performance
difficulty: intermediate
related:
  - 'cs-fundamentals/形式语言与自动机'
  - 'cs-fundamentals/信息安全基础'
  - 'cs-fundamentals/软件工程'
  - 'cs-fundamentals/数据库系统原理'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 编译器概述

### 1.1 编译器的阶段

编译器将源代码翻译为目标代码，分为前端和后端两个主要部分：

```
编译器流水线 (协议栈主线, 参见 [概述](overview) 4.2节):

源代码
  |
  v
+------------------+     +------------------+
|     前端         |     |     后端         |
|                  |     |                  |
| 词法分析 --------+--+--+-- 中间代码优化   |
| (Lexical)        |  |  |                  |
| 语法分析 --------+  v  +-- 目标代码生成   |
| (Syntax)         |  IR  |                  |
| 语义分析 --------+--+--+-- 汇编/链接      |
| (Semantic)       |     |                  |
+------------------+     +------------------+
  |                           |
  v                           v
符号表/AST                 目标代码

IR = Intermediate Representation (中间表示)
```

### 1.2 编译器 vs 解释器

```
编译器 vs 解释器:

  编译器: 源代码 -> [编译] -> 目标代码 -> [执行] -> 结果
    一次编译, 多次执行
    例: C/C++, Rust, Go

  解释器: 源代码 -> [逐行解释执行] -> 结果
    每次执行都需要源代码
    例: Python, Ruby, Bash

  混合模式 (JIT):
    源代码 -> [编译] -> 字节码 -> [JIT编译] -> 机器码 -> [执行]
    例: Java (javac + JIT), JavaScript (V8)
```

> 跨模块引用：[Java](java/overview)的编译模型是典型的混合模式：javac编译为字节码，JIT在运行时编译为机器码。[C语言](c/overview)使用传统的AOT编译模型。[概述](overview)的停机问题决定了编译器无法完美分析所有程序属性。

---

## 2. 词法分析

### 2.1 词法分析的任务

词法分析器（Lexer/Scanner）将字符流转换为Token流：

```
输入: int x = 42 + y;

字符流: i n t   x   =   4 2   +   y ;

Token流:
  [KW_INT] [IDENT("x")] [ASSIGN] [INT_LIT(42)] [PLUS] [IDENT("y")] [SEMI]

Token定义:
  enum TokenType {
    KW_INT, KW_IF, KW_WHILE, KW_RETURN,
    IDENT, INT_LIT, FLOAT_LIT, STRING_LIT,
    PLUS, MINUS, STAR, SLASH, ASSIGN, EQ, NEQ,
    LPAREN, RPAREN, LBRACE, RBRACE, SEMI, COMMA
  };

  struct Token {
    TokenType type;
    string    lexeme;
    any       literal;
    int       line;
  };
```

### 2.2 正则表达式与有限自动机

词法分析的理论基础是正则表达式和有限自动机（参见[离散数学](discrete-math)的自动机理论）：

```
正则表达式 -> NFA -> DFA -> 最小化DFA -> 词法分析器

转换流程:

1. 正则表达式 -> NFA (Thompson构造):
   a -> [s0] --a--> [s1]

   a|b -> [s0] --e--> [s1] --a--> [s2] --e--> [s5]
       |                                      ^
       +--e--> [s3] --b--> [s4] --e----------+

   ab  -> [s0] --a--> [s1] --e--> [s2] --b--> [s3]

   a*  -> [s0] --e--> [s1] --a--> [s2] --e--> [s3]
          ^                              |
          +----------e-------------------+

2. NFA -> DFA (子集构造):
   DFA状态 = NFA状态的集合 (epsilon闭包)

3. DFA最小化 (Hopcroft算法):
   合并等价状态
```

### 2.3 词法分析器实现

```python
class Lexer:
    def __init__(self, source):
        self.source = source
        self.pos = 0
        self.line = 1

    def next_token(self):
        self.skip_whitespace()
        if self.pos >= len(self.source):
            return Token(EOF, "", None, self.line)
        ch = self.source[self.pos]
        if ch.isalpha() or ch == '_':
            return self.identifier()
        if ch.isdigit():
            return self.number()
        if ch == '"':
            return self.string()
        return self.symbol()

    def identifier(self):
        start = self.pos
        while self.pos < len(self.source) and (self.source[self.pos].isalnum() or self.source[self.pos] == '_'):
            self.pos += 1
        lexeme = self.source[start:self.pos]
        if lexeme in KEYWORDS:
            return Token(KEYWORD, lexeme, None, self.line)
        return Token(IDENT, lexeme, None, self.line)

    def number(self):
        start = self.pos
        while self.pos < len(self.source) and self.source[self.pos].isdigit():
            self.pos += 1
        return Token(INT_LIT, self.source[start:self.pos], int(self.source[start:self.pos]), self.line)
```

---

## 3. 语法分析

### 3.1 上下文无关文法 (CFG)

```
CFG定义: G = (V, T, P, S)

V = 非终结符集合 (变量)
T = 终结符集合 (Token)
P = 产生式规则
S = 起始符号

表达式文法示例:

  E  -> E + T | E - T | T
  T  -> T * F | T / F | F
  F  -> ( E ) | id | num

消除左递归:

  E  -> T E'
  E' -> + T E' | - T E' | epsilon
  T  -> F T'
  T' -> * F T' | / F T' | epsilon
  F  -> ( E ) | id | num

推导 "3 + 5 * 2":

  E
  -> T E'
  -> F T' E'
  -> 3 T' E'
  -> 3 E'
  -> 3 + T E'
  -> 3 + F T' E'
  -> 3 + 5 T' E'
  -> 3 + 5 * F T' E'
  -> 3 + 5 * 2 T' E'
  -> 3 + 5 * 2 E'
  -> 3 + 5 * 2
```

### 3.2 语法分析树与歧义性

```
歧义文法: 一个句子有多棵语法树

  E -> E + E | E * E | id

  "3 + 5 * 2" 有两棵树:

  树1 (错误):          树2 (正确):
       +                    *
      / \                  / \
     *   2                +   2
    / \                  / \
   3   5                3   5

  = (3+5)*2 = 16       = 3+(5*2) = 13

消除歧义:
  1. 改写文法 (引入优先级和结合性)
  2. 使用优先级声明 (Yacc/Bison的%left, %right)
```

### 3.3 LL分析 (自顶向下)

```
LL(1)分析:

  L: 从左到右扫描
  L: 最左推导
  1: 向前看1个符号

  FIRST集合:
    FIRST(A) = { a | A =>* a... }

  FOLLOW集合:
    FOLLOW(A) = { a | S =>* ...Aa... }

  LL(1)分析表构造:
    对产生式 A -> alpha:
      对每个 a in FIRST(alpha): M[A, a] = A -> alpha
      若 epsilon in FIRST(alpha):
        对每个 b in FOLLOW(A): M[A, b] = A -> alpha

  LL(1)分析表 (表达式文法):

        |  id   |  num  |  +   |  -   |  *   |  /   |  (   |  )   |  $   |
   -----+-------+-------+------+------+------+------+------+------+------+
   E    | TE'   | TE'   |      |      |      |      | TE'  |      |      |
   E'   |       |       |+TE'  |-TE'  |      |      |      | eps  | eps  |
   T    | FT'   | FT'   |      |      |      |      | FT'  |      |      |
   T'   |       |       | eps  | eps  | *FT' | /FT' |      | eps  | eps  |
   F    | id    | num   |      |      |      |      | (E)  |      |      |

  递归下降分析器:
    每个非终结符对应一个函数
```

**递归下降分析器伪代码**：

```python
class Parser:
    def __init__(self, lexer):
        self.lexer = lexer
        self.current = lexer.next_token()

    def eat(self, token_type):
        if self.current.type == token_type:
            self.current = self.lexer.next_token()
        else:
            raise SyntaxError(f"Expected {token_type}, got {self.current.type}")

    def expr(self):
        node = self.term()
        while self.current.type in (PLUS, MINUS):
            op = self.current
            self.eat(op.type)
            node = BinOp(node, op, self.term())
        return node

    def term(self):
        node = self.factor()
        while self.current.type in (STAR, SLASH):
            op = self.current
            self.eat(op.type)
            node = BinOp(node, op, self.factor())
        return node

    def factor(self):
        if self.current.type == LPAREN:
            self.eat(LPAREN)
            node = self.expr()
            self.eat(RPAREN)
            return node
        elif self.current.type == IDENT:
            node = Var(self.current)
            self.eat(IDENT)
            return node
        elif self.current.type == INT_LIT:
            node = Num(self.current)
            self.eat(INT_LIT)
            return node
```

### 3.4 LR分析 (自底向上)

```
LR分析:

  L: 从左到右扫描
  R: 最右推导的逆序 (规范归约)

  LR分析器结构:
  +------------------------------------------+
  |  Stack:  s0 X1 s1 X2 s2 ... Xn sn       |
  |                                          |
  |  Action Table:                           |
  |    sn: 移入, 压入状态n                    |
  |    rn: 用第n条产生式归约                   |
  |    acc: 接受                              |
  |                                          |
  |  Goto Table:                             |
  |    状态转移 (归约后)                       |
  +------------------------------------------+

  LR(0)项目:
    对产生式 A -> XYZ, 有:
      A -> .XYZ
      A -> X.YZ
      A -> XY.Z
      A -> XYZ.

  SLR(1)归约条件:
    仅当当前Token in FOLLOW(A)时才归约 A -> alpha

  LALR(1):
    合并同心项目集 (相同核心, 不同向前看符号)
    比SLR(1)更强, 比LR(1)状态少
    Yacc/Bison使用LALR(1)
```

---

## 4. 语义分析

### 4.1 语法制导翻译

```
语法制导定义 (SDD):

  综合属性: 从子节点向父节点传递
  继承属性: 从父节点/兄弟节点向子节点传递

  表达式求值的SDD:

  产生式          语义规则
  E -> E1 + T    E.val = E1.val + T.val
  E -> E1 - T    E.val = E1.val - T.val
  E -> T         E.val = T.val
  T -> T1 * F    T.val = T1.val * F.val
  T -> F         T.val = F.val
  F -> ( E )     F.val = E.val
  F -> num       F.val = num.lexval
```

### 4.2 类型检查

```
类型系统:

  类型表达式:
    basic: int, float, bool, char
    constructed: array(n, T), pointer(T), function(T1 -> T2)
    type_name: struct, class

  类型等价:
    名字等价: 类型名相同才等价
    结构等价: 内部结构相同即等价

  类型检查规则:

  算术运算:
    E1.op E2:  E1.type = numeric AND E2.type = numeric
    结果类型: max(E1.type, E2.type)  (int < float)

  赋值:
    E1 = E2:  E2.type 可隐式转换为 E1.type

  函数调用:
    f(E1,...,En):  f.type = function(T1,...,Tn -> R)
                   Ei.type 可转换为 Ti
                   结果类型: R

  类型转换示例:
    int + float -> float  (int隐式提升为float)
    int = float -> error  (需要显式转换)
```

### 4.3 符号表

```
符号表管理:

  作用域嵌套:
    {                       Scope 0
      int x;                x: int, scope=0
      {                     Scope 1
        float x;            x: float, scope=1
        int y;              y: int, scope=1
        {                   Scope 2
          x = y + 1;        x: float (scope 1), y: int (scope 1)
        }
      }
    }

  符号表实现:
    方案1: 链式作用域栈
      每进入一个作用域, 压入新表
      查找: 从栈顶向下搜索

    方案2: 哈希表 + 作用域链
      每个符号条目包含 scope_level
      查找: 匹配名字且 scope_level <= 当前level

  符号表条目:
    struct SymbolEntry {
      string   name;
      Type     type;
      int      scope_level;
      int      offset;       // 栈帧偏移
      Category category;     // VAR, FUNC, PARAM, TYPE
    };
```

> 跨模块引用：[C++](cpp/overview)的模板类型检查在编译期完成，是编译器最复杂的部分之一。[Java](java/overview)的泛型使用类型擦除，类型检查也在编译期。[C语言](c/overview)的类型系统相对简单，隐式转换规则较少。

---

## 5. 中间代码生成

### 5.1 中间表示 (IR)

```
常见中间表示:

1. 三地址码 (TAC / 3AC):
   x = y op z
   x = op y
   x = y
   goto L
   if x relop y goto L

   例: a = b + c * d
   t1 = c * d
   t2 = b + t1
   a = t2

2. 静态单赋值 (SSA):
   每个变量只被赋值一次
   使用 phi 函数在控制流汇合处选择值

   例:
   if (cond) {
     x = 1;
   } else {
     x = 2;
   }
   y = x + 1;

   SSA形式:
   if (cond) {
     x1 = 1;
   } else {
     x2 = 2;
   }
   x3 = phi(x1, x2);   // 根据来源路径选择值
   y1 = x3 + 1;

3. LLVM IR:
   @main:
     %1 = add i32 %a, %b
     %2 = mul i32 %1, %c
     ret i32 %2
```

### 5.2 表达式翻译

```
表达式 a = b + c * d 的翻译:

AST:
        =
       / \
      a    +
          / \
         b    *
             / \
            c    d

三地址码生成:
  t1 = c * d
  t2 = b + t1
  a  = t2

控制流语句翻译:

  if (a < b) then S1 else S2

  if a >= b goto L_else
  S1的代码
  goto L_end
  L_else:
  S2的代码
  L_end:

  while (a < b) do S

  L_begin:
  if a >= b goto L_end
  S的代码
  goto L_begin
  L_end:
```

### 5.3 函数调用翻译

```
函数调用约定 (参见 [体系结构](architecture) 的ABI):

  f(a, b, c) 的调用序列:

  调用者 (Caller):
    1. 保存caller-saved寄存器
    2. 将参数压栈/放入寄存器 (按ABI约定)
    3. call f  (压入返回地址, 跳转)

  被调用者 (Callee):
    1. push ebp / mov ebp, esp  (建立栈帧)
    2. 保存callee-saved寄存器
    3. 分配局部变量空间
    4. 执行函数体
    5. 将返回值放入eax/rax
    6. 恢复callee-saved寄存器
    7. mov esp, ebp / pop ebp  (销毁栈帧)
    8. ret  (弹出返回地址, 跳回)

  栈帧布局:
  高地址
  +------------------+
  | 参数n            |
  | ...              |
  | 参数1            |
  | 返回地址          |
  | 保存的ebp        | <-- ebp
  | 局部变量1         |
  | 局部变量2         |
  +------------------+ <-- esp
  低地址
```

---

## 6. 代码优化

### 6.1 基本块与控制流图

```
基本块 (Basic Block):
  连续的指令序列, 只有一个入口和一个出口
  入口: 第一条指令
  出口: 最后一条指令

控制流图 (CFG):
  节点 = 基本块
  边 = 可能的控制转移

  例:
  B1: t1 = a + b
      if t1 < c goto B3

  B2: t2 = c - d
      goto B4

  B3: t2 = a + d

  B4: x = t2

  CFG:
  B1 -> B2
  B1 -> B3
  B2 -> B4
  B3 -> B4
```

### 6.2 数据流分析

```
数据流分析框架:

  到达定义 (Reaching Definitions):
    定义d到达点p: 从d到p存在路径, 且d未被杀死

    IN[B] = U OUT[P]  (P in pred(B))
    OUT[B] = gen_B U (IN[B] - kill_B)

  活跃变量 (Live Variables):
    变量v在点p活跃: 从p出发存在使用v的路径, 且v未被重定义

    IN[B] = use_B U (OUT[B] - def_B)
    OUT[B] = U IN[S]  (S in succ(B))

  可用表达式 (Available Expressions):
    表达式x op y在点p可用: 所有到达p的路径都计算了x op y

    IN[B] = n OUT[P]  (P in pred(B))
    OUT[B] = gen_B U (IN[B] - kill_B)
```

### 6.3 常见优化技术

```
1. 常量折叠 (Constant Folding):
   x = 3 + 5  =>  x = 8

2. 常量传播 (Constant Propagation):
   x = 5
   y = x + 3  =>  y = 8

3. 死代码消除 (Dead Code Elimination):
   x = 5       // x未被使用
   => (删除)

4. 公共子表达式消除 (CSE):
   t1 = a + b
   t2 = a + b  =>  t2 = t1

5. 循环不变量外提 (LICM):
   for (i = 0; i < n; i++) {
     t = a * b;        // 循环不变
     c[i] = t + i;
   }
   =>
   t = a * b;
   for (i = 0; i < n; i++) {
     c[i] = t + i;
   }

6. 强度削弱 (Strength Reduction):
   i * 4  =>  i << 2  (乘法变移位)
   for循环中的 i++ => 地址 += 4 (乘法变加法)

7. 内联 (Inlining):
   int square(int x) { return x * x; }
   y = square(5)  =>  y = 5 * 5

8. 尾调用优化 (Tail Call Optimization):
   int f(int n) {
     if (n <= 1) return 1;
     return f(n - 1);  // 尾调用
   }
   => 复用当前栈帧, 转为循环
```

### 6.4 优化级别

```
编译优化级别:

  -O0: 无优化
    便于调试, 代码与源码一一对应

  -O1: 基本优化
    死代码消除, 常量折叠, 基本块重排

  -O2: 标准优化
    循环优化, 内联, CSE, 指令调度

  -O3: 激进优化
    自动向量化, 函数克隆, 更激进的内联

  -Os: 优化代码大小
    禁用增加代码大小的优化

  -Oz: 最小化代码大小
    更激进的大小优化
```

> 跨模块引用：[体系结构](architecture)的流水线和缓存特性影响指令调度的优化策略。[操作系统](os)的虚拟内存影响代码布局优化的决策。[C++](cpp/overview)的模板元编程在编译期执行计算，是编译器优化的极端案例。

---

## 7. 目标代码生成

### 7.1 寄存器分配

```
寄存器分配问题:
  将无限虚拟寄存器映射到有限物理寄存器
  无法映射的虚拟寄存器溢出(spill)到内存

图着色寄存器分配:

1. 构建干涉图:
   若两个变量同时活跃, 则它们干涉
   干涉图中连一条边

2. 图着色:
   使用K种颜色着色 (K = 物理寄存器数)
   相邻节点颜色不同

3. 简化:
   若节点度数 < K: 删除该节点, 压栈
   否则: 选择溢出候选

4. 选择:
   弹栈, 为每个节点分配颜色
   若无可用颜色: 溢出到内存

干涉图示例 (3个寄存器):

  a --- b --- c
  |           |
  +-----d-----+

  简化: d(度数2) -> c(度数2) -> a(度数1) -> b(度数0)
  着色: b=R0, a=R1, c=R0, d=R2
```

### 7.2 指令选择

```
指令选择: 将IR映射到目标机指令

模式匹配方法:

  IR: t1 = a * 4
  x86:  shl eax, 2          // 移位比乘法快
  ARM:  LSL r0, r1, #2

  IR: t1 = a + b * c
  x86:  imul ecx, edx       // b * c
        add eax, ecx        // + a
  ARM:  MLA r0, r1, r2, r3  // 乘加一条指令

树模式匹配:

  IR树:        目标指令模式:
    +            ADD r1, r2
   / \
  a   *          MUL r3, r4 (子树)
     / \
    b   c

  最优覆盖: MUL + ADD = 2条指令
  若有MLA指令: 1条指令
```

### 7.3 指令调度

```
指令调度: 重排指令顺序, 减少流水线停顿

调度前 (有停顿):
  LOAD  r1, [addr]    // 延迟3周期
  ADD   r2, r1, r3    // 依赖r1, 停顿2周期
  SUB   r4, r5, r6    // 独立指令

调度后 (消除停顿):
  LOAD  r1, [addr]    // 延迟3周期
  SUB   r4, r5, r6    // 填充延迟槽
  ADD   r2, r1, r3    // r1已就绪

列表调度算法:
  1. 计算每个操作的最早开始时间 (依赖约束)
  2. 按优先级排序 (关键路径优先)
  3. 逐周期调度: 选择优先级最高且资源可用的操作
```

### 7.4 链接

```
链接过程:

  编译:  source.c -> object.o
  汇编:  source.s -> object.o
  链接:  object1.o + object2.o + libs -> executable

目标文件格式 (ELF):

  +------------------+
  | ELF Header       |
  | Section Headers  |
  | .text            |  代码段
  | .data            | 已初始化数据
  | .bss             | 未初始化数据
  | .symtab          | 符号表
  | .rel.text        | 代码重定位
  | .rel.data        | 数据重定位
  | .strtab          | 字符串表
  +------------------+

符号解析:
  强符号: 函数和已初始化全局变量
  弱符号: 未初始化全局变量

  规则:
    不允许两个强符号同名
    一个强符号+一个弱符号 -> 选择强符号
    两个弱符号 -> 任选一个

重定位:
  修改代码和数据中的地址引用
  绝对地址: R_X86_64_32
  PC相对:   R_X86_64_PC32
```

> 跨模块引用：[体系结构](architecture)的ISA决定了指令选择和调度的策略。[操作系统](os)的虚拟内存和进程地址空间布局影响链接器的设计。[C语言](c/overview)的编译模型是经典的分离编译+链接模型。

---

## 8. 速查表

### 8.1 编译阶段速查

| 阶段     | 输入    | 输出        | 核心算法            |
| -------- | ------- | ----------- | ------------------- |
| 词法分析 | 字符流  | Token流     | DFA/正则表达式      |
| 语法分析 | Token流 | AST         | LL/LR分析           |
| 语义分析 | AST     | 标注AST     | 类型检查/作用域     |
| IR生成   | 标注AST | IR(TAC/SSA) | 语法制导翻译        |
| 优化     | IR      | 优化IR      | 数据流分析          |
| 代码生成 | 优化IR  | 目标代码    | 寄存器分配/指令选择 |

### 8.2 文法层次速查 (Chomsky层次)

| 类型   | 文法       | 识别器  | 应用     |
| ------ | ---------- | ------- | -------- |
| Type-3 | 正则文法   | DFA/NFA | 词法分析 |
| Type-2 | 上下文无关 | PDA     | 语法分析 |
| Type-1 | 上下文有关 | LBA     | 语义分析 |
| Type-0 | 无限制     | 图灵机  | 通用计算 |

### 8.3 分析方法速查

| 方法    | 方向     | 向前看 | 能力 | 工具       |
| ------- | -------- | ------ | ---- | ---------- |
| LL(1)   | 自顶向下 | 1      | 较弱 | ANTLR      |
| LL(\*)  | 自顶向下 | 无限   | 中等 | ANTLR4     |
| SLR(1)  | 自底向上 | 1      | 弱   | -          |
| LALR(1) | 自底向上 | 1      | 中   | Yacc/Bison |
| LR(1)   | 自底向上 | 1      | 强   | -          |
| GLR     | 自底向上 | -      | 最强 | Elkhound   |

### 8.4 优化技术速查

| 优化       | 作用           | 阶段      |
| ---------- | -------------- | --------- |
| 常量折叠   | 编译期计算     | 局部      |
| 常量传播   | 传播已知值     | 全局      |
| 死代码消除 | 删除无用代码   | 全局      |
| CSE        | 消除重复计算   | 局部/全局 |
| LICM       | 循环不变量外提 | 循环      |
| 强度削弱   | 替换昂贵操作   | 循环      |
| 内联       | 消除调用开销   | 过程间    |
| 尾调用优化 | 复用栈帧       | 过程间    |

---

## 延伸阅读

- _Compilers: Principles, Techniques, and Tools_ -- Aho, Lam, Sethi, Ullman (龙书)
- _Modern Compiler Implementation in C/Java/ML_ -- Andrew W. Appel
- _Engineering a Compiler_ -- Cooper & Torczon
- _Advanced Compiler Design and Implementation_ -- Steven Muchnick
