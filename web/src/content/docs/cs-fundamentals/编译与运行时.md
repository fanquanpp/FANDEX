---
order: 92
title: 编译与运行时
module: 'cs-fundamentals'
category: 计算机基础
difficulty: advanced
description: 编译与运行时深度剖析：词法分析自动机构造、语法分析算法、语义分析、中间代码与SSA、优化技术、JIT编译、GC算法、链接与加载。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cs-fundamentals/编程语言理论'
  - 'cs-fundamentals/网络协议深度'
  - 'cs-fundamentals/进程PCB与线程TCB'
  - 'cs-fundamentals/中断与系统调用'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 词法分析：正则到自动机

### 1.1 正则表达式到NFA (Thompson构造)

```
Thompson构造算法:

  基本规则:

  1. 空串 epsilon:
     [s0] --e--> [s1] (s0起始, s1接受)

  2. 单字符 a:
     [s0] --a--> [s1]

  复合规则:

  3. 连接 ab:
     [s0] --a--> [s1] --e--> [s2] --b--> [s3]

  4. 选择 a|b:
          +--e--> [s1] --a--> [s2] --e--+
     [s0]-+                              +->[s5]
          +--e--> [s3] --b--> [s4] --e--+

  5. 闭包 a*:
          +--------e--------+
          |                 v
     [s0]--e-->[s1]--a-->[s2]--e-->[s3]
          ^                 |
          +-------e---------+

  6. 正闭包 a+:
     等价于 a.a*
     [s0] --a--> [s1] --e--> [s2] --a--> [s3] --e--> [s4]
                         ^                      |
                         +----------e-----------+

示例: 构造 (a|b)*abb 的NFA

  正则分解: (a|b)* . a . b . b

  Step 1: a|b 的NFA
          +--e--> [2] --a--> [3] --e--+
     [1]-+                            +->[6]
          +--e--> [4] --b--> [5] --e--+

  Step 2: (a|b)* 的NFA (加闭包)
     [0] --e--> [1] ... [6] --e--> [7]
      ^                       |
      +----------e------------+

  Step 3: 连接 a, b, b
     [7] --e--> [8] --a--> [9] --e--> [10] --b--> [11] --e--> [12] --b--> [13]

  Thompson构造的性质:
    - NFA状态数 = O(|r|), |r|为正则表达式长度
    - 每个状态最多2个epsilon转移
    - 构造时间 O(|r|)
```

### 1.2 NFA到DFA (子集构造)

```
子集构造算法 (Subset Construction):

  核心思想: DFA状态 = NFA状态的集合

  epsilon闭包:
    epsilon-closure(s) = 从s出发仅通过epsilon转移可达的所有状态

    epsilon-closure({s0}) = {s0, s1, s7}  (示例)

  子集构造:
    start = epsilon-closure({nfa_start})
    unmarked = {start}

    while unmarked不为空:
      T = unmarked.pop()
      for each input symbol a:
        U = epsilon-closure(move(T, a))
        if U不为空:
          Dtran[T, a] = U
          if U不在DFA状态中:
            unmarked.add(U)

  示例: (a|b)*abb 的NFA -> DFA

  NFA状态: {0,1,2,...,13}

  DFA构造:
    A = e-closure({0}) = {0,1,2,4,7}
      move(A, a) = {3,8} -> e-closure = {1,2,3,4,6,7,8} = B
      move(A, b) = {5}   -> e-closure = {1,2,4,5,6,7}   = C

    B = {1,2,3,4,6,7,8}
      move(B, a) = {3,8} -> e-closure = {1,2,3,4,6,7,8} = B
      move(B, b) = {5,9} -> e-closure = {1,2,4,5,6,7,9} = D

    C = {1,2,4,5,6,7}
      move(C, a) = {3,8} -> e-closure = {1,2,3,4,6,7,8} = B
      move(C, b) = {5}   -> e-closure = {1,2,4,5,6,7}   = C

    D = {1,2,4,5,6,7,9}
      move(D, a) = {3,8} -> e-closure = {1,2,3,4,6,7,8} = B
      move(D, b) = {5,10}-> e-closure = {1,2,4,5,6,7,10}= E

    E = {1,2,4,5,6,7,10} (包含NFA接受状态10)
      move(E, a) = {3,8} -> e-closure = B
      move(E, b) = {5}   -> e-closure = C

  DFA转换表:
        |  a  |  b  |
    ----+-----+-----+
    A   |  B  |  C  |
    B   |  B  |  D  |
    C   |  B  |  C  |
    D   |  B  |  E  |
    E*  |  B  |  C  |

  最坏情况: DFA状态数 = 2^|NFA| (指数爆炸)
  实际中: 通常与NFA状态数接近
```

### 1.3 DFA最小化 (Hopcroft算法)

```
DFA最小化 (Hopcroft算法):

  核心思想: 合并等价状态

  算法:
    1. 初始划分: P = {接受状态, 非接受状态}
    2. 对P中每个组G:
         对每个输入符号a:
           将G分为子组, 使得同一子组中状态经a到达同一组
    3. 重复2直到划分不变

  示例 (上节DFA):
    初始: P = {{A,B,C,D}, {E}}

    检查{A,B,C,D}:
      a转移: A->B, B->B, C->B, D->B (都在同一组)
      b转移: A->C, B->D, C->C, D->E
        A,C -> C (在{A,B,C,D})
        B   -> D (在{A,B,C,D})
        D   -> E (在{E})
      分裂: {A,C}, {B}, {D}

    P = {{A,C}, {B}, {D}, {E}}

    检查{A,C}:
      a转移: A->B, C->B (同一组{B})
      b转移: A->C, C->C (都在{A,C})
      不分裂

    最终: {A,C}合并为一个状态

  最小化DFA:
        |  a  |  b  |
    ----+-----+-----+
    AC  |  B  | AC  |
    B   |  B  |  D  |
    D   |  B  |  E  |
    E*  |  B  | AC  |

  4个状态 (原5个)
```

> 跨模块引用：[编译原理](compiler)基础篇介绍了词法分析的基本概念。[数制与编码](encoding)的有限自动机理论是词法分析的数学基础。

---

## 2. 语法分析算法深度

### 2.1 LL分析深入

```
LL(1)冲突解决:

  FIRST/FOLLOW冲突:
    产生式 A -> alpha | beta
    若 FIRST(alpha) ∩ FIRST(beta) ≠ ∅ -> FIRST冲突
    若 epsilon ∈ FIRST(alpha) 且 FIRST(beta) ∩ FOLLOW(A) ≠ ∅ -> FOLLOW冲突

  消除左递归:
    直接左递归: A -> A alpha | beta
    改写: A -> beta A'
          A' -> alpha A' | epsilon

    间接左递归: A -> B alpha, B -> A beta
    通过代入消除

  提取左公因子:
    A -> alpha beta1 | alpha beta2
    改写: A -> alpha A'
          A' -> beta1 | beta2

LL(*)分析 (ANTLR4):
  不限于1个向前看符号
  使用DFA进行语法预测
  对每个决策点构建预测DFA
  可处理LL(1)无法处理的文法

  例:
    expr : ID '(' exprList ')'    // 函数调用
         | ID '=' expr            // 赋值
         ;

    LL(1)冲突: ID后可能是'('或'='
    LL(*): 向前看任意多符号直到能区分
```

### 2.2 LR分析深入

```
LR(0)项目集族构造:

  增广文法: 添加 S' -> S

  closure(I):
    若 A -> alpha . B beta 在 I 中:
      将 B -> .gamma 的所有项目加入I

  goto(I, X):
    J = { A -> alpha X . beta | A -> alpha . X beta 在 I 中 }
    return closure(J)

  构造项目集族:
    C = { closure({S' -> .S}) }
    对C中每个项目集I和每个文法符号X:
      若 goto(I, X) 非空且不在C中:
        将 goto(I, X) 加入C

SLR(1)分析表构造:

  移入: 若 A -> alpha . a beta 在I中, 且 goto(I,a)=J
        则 action[I, a] = shift J

  归约: 若 A -> alpha . 在I中
        则对所有 a ∈ FOLLOW(A): action[I, a] = reduce A -> alpha

  接受: 若 S' -> S . 在I中
        则 action[I, $] = accept

SLR(1)的问题:
  仅用FOLLOW集合判断归约, 过于宽松
  可能产生移入-归约冲突

LR(1)分析:
  项目: [A -> alpha . beta, a]
  a: 向前看符号 (lookahead)

  closure(I):
    若 [A -> alpha . B beta, a] 在I中:
      对B的每个产生式 B -> gamma:
        对 FIRST(beta a) 中每个终结符b:
          将 [B -> . gamma, b] 加入I

  LR(1)状态数远多于SLR(1) (可能指数增长)

LALR(1)分析:
  合并同心项目集 (核心相同, 向前看符号不同)
  状态数与SLR(1)相同
  分析能力介于SLR(1)和LR(1)之间
  Yacc/Bison使用LALR(1)
```

**LR分析表构造示例**：

```
文法: E -> E + T | T, T -> T * F | F, F -> ( E ) | id

SLR(1)分析表 (部分):

       |  id   |  +   |  *   |  (   |  )   |  $   |  E  |  T  |  F  |
  -----+-------+------+------+------+------+------+-----+-----+-----+
   0   | s5    |      |      | s4   |      |      | 1   | 2   | 3   |
   1   |       | s6   |      |      |      | acc  |     |     |     |
   2   |       | r2   | s7   |      | r2   | r2   |     |     |     |
   3   |       | r4   | r4   |      | r4   | r4   |     |     |     |
   4   | s5    |      |      | s4   |      |      | 8   | 2   | 3   |
   5   |       | r6   | r6   |      | r6   | r6   |     |     |     |
   6   | s5    |      |      | s4   |      |      |     | 9   | 3   |
   7   | s5    |      |      | s4   |      |      |     |     | 10  |
   8   |       | s6   |      |      | s11  |      |     |     |     |
   9   |       | r1   | s7   |      | r1   | r1   |     |     |     |
   10  |       | r3   | r3   |      | r3   | r3   |     |     |     |
   11  |       | r5   | r5   |      | r5   | r5   |     |     |     |

  sn = shift并转到状态n
  rn = 用第n条产生式归约
  acc = 接受
```

### 2.3 错误恢复

```
语法错误恢复策略:

1. 恐慌模式 (Panic Mode):
   发现错误时, 跳过输入符号直到遇到同步词法单元
   同步词法单元 = FOLLOW(A)中的符号
   简单有效, 但可能跳过大量输入

2. 短语级恢复:
   对常见错误模式进行局部修正
   例: 缺少分号 -> 插入分号
       多余逗号 -> 删除逗号
   需要精心设计错误模式

3. 错误产生式:
   在文法中添加常见错误的产生式
   例: E -> E + + T  (两个加号)
   编译器可给出精确的错误信息

4. 全局最小修正:
   找到最少修改使输入合法
   理论最优, 但计算复杂度高
```

> 跨模块引用：[编译原理](compiler)基础篇介绍了语法分析的基本概念。[离散数学](discrete-math)的形式语言理论是语法分析的数学基础。

---

## 3. 语义分析

### 3.1 类型系统深入

```
类型系统分类:

  静态类型 vs 动态类型:
    静态: 编译期检查 (C/C++/Java/Rust)
    动态: 运行期检查 (Python/JavaScript/Ruby)

  强类型 vs 弱类型:
    强: 不允许隐式类型转换 (Python/Java/Rust)
    弱: 允许隐式类型转换 (C/JavaScript)

  类型推断:
    Hindley-Milner类型系统 (ML/Haskell)
    从使用上下文推断类型

    fun f(x) = x + 1
    推断: x : int, f : int -> int

    fun g(x, y) = if x then y else 0
    推断: x : bool, y : int, g : bool -> int -> int

  子类型 (Subtyping):
    若 S <: T (S是T的子类型), 则S可出现在T的位置
    里氏替换原则 (LSP)

    例: Cat <: Animal
    函数 f(Animal a) 可接受 Cat

  协变与逆变:
    协变 (Covariant): 子类型关系保持方向
      List<Cat> <: List<Animal>  (Java数组, 不安全!)

    逆变 (Contravariant): 子类型关系反转
      Function<Animal, R> <: Function<Cat, R>
      (能处理Animal的函数当然能处理Cat)

    不变 (Invariant): 无子类型关系
      Java泛型: List<Cat> 与 List<Animal> 无关
```

### 3.2 符号表实现

```
符号表高效实现:

1. 哈希表 + 作用域链:
   全局哈希表, 每个条目包含作用域深度
   查找: 匹配名字且scope_level <= 当前level的最小scope

   struct Symbol {
       string name;
       Type   type;
       int    scope_level;
       Symbol* next_in_scope;  // 同作用域链表
   };

   HashMap<string, Symbol*> symbol_table;

   插入:
     sym.scope_level = current_scope;
     sym.next_in_scope = scope_stack[current_scope];
     scope_stack[current_scope] = sym;
     symbol_table[name] = sym;

   查找:
     sym = symbol_table[name];
     while (sym && sym.scope_level > current_scope) {
       sym = sym.next;  // 查找可见的同名符号
     }

2. 树形作用域:
   每个作用域一个符号表
   子作用域指向父作用域

   Global Scope
     |-> Function A Scope
     |      |-> Block Scope
     |-> Function B Scope

   查找: 当前作用域 -> 父作用域 -> ... -> 全局作用域
   退出作用域: 直接丢弃子表

3. LLVM符号表:
   使用Value/ValueMap
   每个Value有唯一Name和Type
   Module级 + Function级符号表
```

### 3.3 属性文法

```
属性文法 (Attribute Grammar):

  综合属性 (Synthesized):
    从子节点向父节点传递
    在归约时计算

  继承属性 (Inherited):
    从父节点/兄弟节点向子节点传递
    在推导时计算

  S-属性文法: 仅使用综合属性
    可在LR分析中自底向上计算
    使用栈存储属性值

  L-属性文法: 综合属性 + 受限继承属性
    继承属性仅依赖:
      - 父节点的继承属性
      - 左侧兄弟节点的属性
    可在LL分析中自顶向下计算
    可在LR分析中模拟(嵌入动作)

  示例: 声明的类型传播

  产生式                    语义规则
  D  -> T L                L.type = T.type (继承属性)
  T  -> int                T.type = integer
  T  -> float              T.type = real
  L  -> L1 , id            L1.type = L.type (继承属性)
                            add_type(id.entry, L.type)
  L  -> id                 add_type(id.entry, L.type)

  输入: int a, b, c

  D
  |- T (type=integer)
  |  |- int
  |- L (type=integer, 从T继承)
     |- L1 (type=integer, 从L继承)
     |  |- L2 (type=integer, 从L1继承)
     |  |  |- id(c) add_type(c, integer)
     |  |- ,
     |  |- id(b) add_type(b, integer)
     |- ,
     |- id(a) add_type(a, integer)
```

> 跨模块引用：[编译原理](compiler)基础篇介绍了语义分析的基本概念。[软件工程](software-engineering)的类型安全设计依赖类型系统理论。

---

## 4. 中间代码与SSA

### 4.1 三地址码深入

```
三地址码 (TAC) 指令集:

  赋值:     x = y op z    (二元运算)
            x = op y      (一元运算)
            x = y         (复制)

  跳转:     goto L        (无条件)
            if x relop y goto L  (条件)

  索引:     x = y[i]
            x[i] = y

  地址:     x = &y
            x = *y
            *x = y

  调用:     param x       (设置参数)
            call p, n     (调用函数p, n个参数)
            x = call p, n (有返回值的调用)

  返回:     return x

四元组表示:
  (op, arg1, arg2, result)

  a = b + c  ->  (+, b, c, t1)
  a = -b     ->  (uminus, b, -, t2)
  if a < b goto L -> (<, a, b, L)

三元组表示:
  (op, arg1, arg2)
  用位置引用结果

  0: (+, b, c)     // t0 = b + c
  1: (=, a, (0))   // a = t0

  问题: 移动指令时需更新所有引用
```

### 4.2 SSA (静态单赋值)

```
SSA (Static Single Assignment):

  核心规则: 每个变量只被赋值一次
  控制流汇合处使用 phi 函数

  转换前:
    x = 1
    if (cond) {
      x = 2
    }
    y = x + 1

  转换后:
    x1 = 1
    if (cond) {
      x2 = 2
    }
    x3 = phi(x1, x2)   // 根据来源基本块选择值
    y1 = x3 + 1

SSA构造算法:

  1. 插入phi函数:
     对每个变量v:
       计算v的定值基本块集合 DefBlocks(v)
       计算迭代支配边界 IDF(DefBlocks(v))
       在IDF中的每个基本块入口插入 phi(v)

  支配边界 (Dominance Frontier):
     节点n的支配边界DF(n):
       n支配某个节点的前驱, 但不严格支配该节点

     例:
       B1 -> B2 -> B3 -> B5
            |         ^
            v         |
            B4 -------+

       DF(B2) = {B5}  (B2支配B4, B4是B5的前驱)

  2. 变量重命名:
     深度优先遍历支配树
     每次赋值递增版本号
     phi函数的参数根据前驱基本块填充

SSA的优势:
  - 简化数据流分析 (def-use链显式)
  - 便于发现优化机会 (常量传播更有效)
  - 支持稀疏条件常量传播
  - 寄存器分配更简单 (变量不重叠)
```

**SSA构造伪代码**：

```python
def insert_phi_functions(cfg, variables):
    phi_nodes = {}
    for var in variables:
        def_blocks = {block for block in cfg.blocks if var in block.defs}
        worklist = list(def_blocks)
        placed = set()
        while worklist:
            block = worklist.pop()
            for df_block in dominance_frontier(block):
                if df_block not in placed:
                    # 在df_block入口插入phi(var)
                    phi_nodes.setdefault(df_block, []).append(var)
                    placed.add(df_block)
                    if df_block not in def_blocks:
                        worklist.append(df_block)
    return phi_nodes

def rename_variables(cfg, phi_nodes):
    counter = {}  # 变量 -> 当前版本号
    stack = {}    # 变量 -> 版本号栈

    def new_version(var):
        v = counter.get(var, 0)
        counter[var] = v + 1
        stack.setdefault(var, []).append(v)
        return f"{var}_{v}"

    def rename_block(block):
        for instr in block.instructions:
            # 替换使用为当前版本
            for use in instr.uses:
                if stack.get(use):
                    instr.replace_use(use, f"{use}_{stack[use][-1]}")
            # 替换定义为新版本
            for var in instr.defs:
                new_name = new_version(var)
                instr.replace_def(var, new_name)
        # 处理phi函数
        for succ in cfg.successors(block):
            for var in phi_nodes.get(succ, []):
                current = f"{var}_{stack[var][-1]}"
                succ.add_phi_arg(var, block, current)
        # 递归处理支配树子节点
        for child in dom_tree_children(block):
            rename_block(child)
        # 弹出版本号栈
        for var in block.defs:
            stack[var].pop()

    rename_block(cfg.entry)
```

### 4.3 LLVM IR

```
LLVM IR示例:

  源代码:
    int add(int a, int b) {
        int result = a + b;
        return result;
    }

  LLVM IR:
    define i32 @add(i32 %a, i32 %b) {
    entry:
      %result = add i32 %a, %b
      ret i32 %result
    }

  更复杂的示例:
    int sum(int n) {
        int s = 0;
        for (int i = 0; i < n; i++)
            s += i;
        return s;
    }

  LLVM IR:
    define i32 @sum(i32 %n) {
    entry:
      br label %loop.cond

    loop.cond:
      %i = phi i32 [0, %entry], [%i.next, %loop.body]
      %s = phi i32 [0, %entry], [%s.next, %loop.body]
      %cmp = icmp slt i32 %i, %n
      br i1 %cmp, label %loop.body, label %loop.end

    loop.body:
      %s.next = add i32 %s, %i
      %i.next = add i32 %i, 1
      br label %loop.cond

    loop.end:
      ret i32 %s
    }

  LLVM IR特性:
    - SSA形式 (每个值定义一次)
    - 类型显式 (i32, i64, float, pointer)
    - 无限虚拟寄存器 (%0, %1, ..., %n)
    - 显式控制流 (基本块 + 跳转)
    - phi函数在基本块入口
```

> 跨模块引用：[编译原理](compiler)基础篇介绍了中间代码生成的基本概念。[操作系统](os)的虚拟内存管理影响代码布局优化。

---

## 5. 优化技术深度

### 5.1 常量折叠与传播

```
常量折叠 (Constant Folding):

  编译期计算常量表达式

  x = 3 + 5       ->  x = 8
  x = 2 * 3.14    ->  x = 6.28
  x = "hello" + " world" -> x = "hello world"

  注意: 浮点数折叠需考虑精度
  Java: 严格浮点模式 (strictfp) 保证跨平台一致

常量传播 (Constant Propagation):

  跟踪变量的常量值, 替换使用处

  优化前:
    x = 5
    y = x + 3
    z = y * 2

  优化后:
    x = 5
    y = 8       // x=5传播, 5+3=8
    z = 16      // y=8传播, 8*2=16

稀疏条件常量传播 (SCCP):
  结合常量传播和死代码消除
  在SSA上操作, 高效

  状态: TOP(未定义), CONST(常量值), BOTTOM(非常量)

  x = input()       // x = BOTTOM
  y = 5             // y = CONST(5)
  z = x + y         // z = BOTTOM (x非常量)
  w = y + 3         // w = CONST(8)

  if (false) {      // 条件为常量false
    dead_code()     // 死代码, 可消除
  }
```

### 5.2 死代码消除

```
死代码消除 (Dead Code Elimination, DCE):

1. 严格死代码:
   定义后从未使用的变量

   x = compute()    // x从未使用
   => (删除)

2. 死存储消除:
   写入后未读取就再次写入

   *p = 1           // 死存储
   *p = 2           // 最终值
   => 删除 *p = 1

3. 不可达代码消除:
   永远不会执行的基本块

   if (false) {
     this_is_dead();  // 不可达
   }
   => 删除整个基本块

4. 激进死代码消除 (ADCE):
   从出口反向追踪, 标记所有可达指令
   未标记的指令全部删除

   优化前:
     a = 1        // 死 (a未使用)
     b = 2        // 活 (b被print使用)
     c = a + b    // c死, 但b活
     print(b)

   ADCE后:
     b = 2
     print(b)

   注意: a=1和c=a+b被删除, 因为它们的结果未使用
   但c=a+b中的b使用不应导致a=1保留 (a仅被c使用, c本身死)
```

### 5.3 循环优化

```
1. 循环不变量外提 (LICM - Loop Invariant Code Motion):

   识别循环中不变的计算, 移到循环外

   优化前:
     for (i = 0; i < n; i++) {
       t = a * b;         // a, b不变
       c[i] = t + i;
     }

   优化后:
     t = a * b;           // 外提
     for (i = 0; i < n; i++) {
       c[i] = t + i;
     }

   判断循环不变量的条件:
     - 所有到达定义都在循环外
     - 或所有到达定义都是循环不变量

2. 强度削弱 (Strength Reduction):

   替换昂贵运算为廉价运算

   乘法 -> 加法:
     for (i = 0; i < n; i++) {
       a[i] = base + i * 4;   // 乘法
     }
     =>
     t = base;
     for (i = 0; i < n; i++) {
       a[i] = t;              // 无乘法
       t = t + 4;             // 加法
     }

   除法为2的幂 -> 移位:
     x / 4  ->  x >> 2
     x % 8  ->  x & 7

3. 循环展开 (Loop Unrolling):

   减少循环控制开销, 增加指令级并行

   优化前:
     for (i = 0; i < 4; i++) {
       a[i] = b[i] + c[i];
     }

   完全展开:
     a[0] = b[0] + c[0];
     a[1] = b[1] + c[1];
     a[2] = b[2] + c[2];
     a[3] = b[3] + c[3];

   部分展开 (factor=2):
     for (i = 0; i < 4; i += 2) {
       a[i]   = b[i]   + c[i];
       a[i+1] = b[i+1] + c[i+1];
     }

   代价: 增加代码大小, 可能影响指令缓存

4. 循环交换 (Loop Interchange):
   改变嵌套循环顺序, 提高缓存命中率

   优化前 (列优先访问, 缓存不友好):
     for (i = 0; i < N; i++)
       for (j = 0; j < M; j++)
         a[j][i] = ...;    // 列优先

   优化后 (行优先访问, 缓存友好):
     for (j = 0; j < M; j++)
       for (i = 0; i < N; i++)
         a[j][i] = ...;    // 行优先
```

> 跨模块引用：[编译原理](compiler)基础篇介绍了基本优化技术。[计算机体系结构](architecture)的流水线和缓存特性影响优化策略的选择。

---

## 6. 目标代码生成

### 6.1 指令选择

```
指令选择: 将IR映射到目标机器指令

树模式匹配 (Tree Pattern Matching):

  IR树:           目标指令模式:
       +              ADD r1, r2
      / \
     a   *            MUL r3, r4
        / \
       b   c

  最小代价覆盖:
    方案1: MUL + ADD = 2条指令
    方案2 (ARM): MLA r0, r1, r2, r3 = 1条指令 (乘加)

  动态规划指令选择:
    对每个树节点计算最小代价
    自底向上, 每个节点记录最优指令选择

    cost(node, rule) = rule.cost + sum(cost(child, best_rule))

  DAG指令选择:
    公共子表达式在DAG中共享
    避免重复选择

  考虑因素:
    - 指令延迟 (latency)
    - 指令吞吐率 (throughput)
    - 寄存器约束 (某些指令固定寄存器)
    - 地址模式 (立即数/寄存器/偏移)
```

### 6.2 寄存器分配

```
图着色寄存器分配 (详细):

  Step 1: 活跃变量分析
    计算每个程序点哪些变量活跃

  Step 2: 构建干涉图
    若两个变量在同一程序点同时活跃 -> 干涉
    干涉图中连一条边

  Step 3: 简化 (Simplify)
    反复移除度数 < K 的节点, 压入栈
    K = 可用物理寄存器数

  Step 4: 选择 (Select)
    弹栈, 为每个节点分配颜色(寄存器)
    若无可用颜色 -> 溢出(spill)

  Step 5: 溢出处理
    选择溢出候选 (最不频繁使用的变量)
    在溢出点插入 load/store 指令
    重新进行寄存器分配

  示例 (K=3):
    代码:
      a = 1
      b = 2
      c = a + b
      d = c - a
      e = d + b

    活跃分析:
      a: [1,3,4]  b: [2,3,5]  c: [3,4]
      d: [4,5]    e: [5]

    干涉图:
      a --- b --- c
      |           |
      +-----d-----+
            |
            e

    简化: e(度1) -> d(度2) -> c(度2) -> a(度1) -> b(度0)
    选择: b=R0, a=R1, c=R0, d=R2, e=R1

线性扫描寄存器分配:
  适用于JIT编译 (需要快速分配)

  1. 计算每个变量的活跃区间 [start, end]
  2. 按start排序
  3. 扫描活跃区间:
     - 变量开始: 分配空闲寄存器
     - 变量结束: 释放寄存器
     - 无空闲寄存器: 溢出结束最晚的活跃变量

  优点: O(n)时间复杂度
  缺点: 分配质量不如图着色
```

### 6.3 指令调度

```
指令调度 (Instruction Scheduling):

  目标: 重排指令顺序, 减少流水线停顿

  列表调度算法:

  1. 构建依赖图 (DAG):
     节点 = 指令
     边 = 数据依赖/资源依赖

  2. 计算优先级:
     关键路径长度 (从该指令到出口的最长路径)

  3. 逐周期调度:
     每个周期选择优先级最高且依赖满足的指令

  示例:
    依赖图:
      LOAD r1, [a]     (延迟3周期)
      LOAD r2, [b]     (延迟3周期)
      ADD  r3, r1, r2  (依赖r1, r2)
      MUL  r4, r3, 2   (依赖r3)
      STORE [c], r4    (依赖r4)

  未调度:
    C0: LOAD r1, [a]
    C1: LOAD r2, [b]
    C2: (stall)
    C3: (stall)
    C4: ADD r3, r1, r2
    C5: MUL r4, r3, 2
    C6: STORE [c], r4
    总计: 7周期

  调度后:
    C0: LOAD r1, [a]
    C1: LOAD r2, [b]
    C2: (其他无关指令可插入)
    C3: (其他无关指令可插入)
    C4: ADD r3, r1, r2
    C5: MUL r4, r3, 2
    C6: STORE [c], r4

  若有独立指令可填充C2-C3, 则可减少总周期
```

> 跨模块引用：[编译原理](compiler)基础篇介绍了代码生成的基本概念。[计算机体系结构](architecture)的指令集和流水线设计决定了指令选择和调度的策略。

---

## 7. JIT编译

### 7.1 JIT编译原理

```
JIT (Just-In-Time) 编译:

  AOT (Ahead-Of-Time): 编译 -> 执行
  JIT:                  运行时编译 -> 执行

  混合模式执行:
    源代码 -> 字节码 -> 解释执行
                      -> JIT编译 -> 机器码执行

  两种JIT策略:

  1. 方法JIT (Method JIT):
     首次调用方法时编译
     例: Oracle HotSpot C1编译器 (Client模式)

  2. 追踪JIT (Trace JIT):
     记录热路径 (hot trace)
     仅编译热路径
     例: LuaJIT, 早期V8

  JIT的优势:
    - 运行时类型信息 (去虚化, 内联)
    - 运行时性能数据 (分支预测, 优化)
    - 动态代码生成 (生成专门化的代码)

  JIT的劣势:
    - 启动延迟 (编译时间)
    - 内存占用 (编译后的代码)
    - 代码缓存失效 (动态加载/卸载)
```

### 7.2 HotSpot分层编译

```
HotSpot JVM分层编译:

  Level 0: 解释执行
    收集性能分析数据 (方法调用次数, 分支频率, 类型信息)

  Level 1: C1编译 (简单编译)
    快速编译, 简单优化
    适用于启动阶段

  Level 2: C1编译 (有限C2性能数据)
    C1编译 + 有限的性能数据引导优化

  Level 3: C1编译 (完整C2性能数据)
    C1编译 + 完整的性能数据收集
    为C2编译做准备

  Level 4: C2编译 (完全优化)
    激进优化, 编译时间长
    适用于热点代码

  分层策略:
    冷代码: Level 0 (解释)
    温代码: Level 1-3 (C1编译)
    热代码: Level 4 (C2编译)

  逆优化 (Deoptimization):
    C2编译的假设可能失效 (如类型假设)
    失效时回退到解释执行
    重新收集数据, 可能重新编译

  例:
    方法f()假设参数总是Integer
    C2编译生成Integer专用代码
    某次调用传入String -> 逆优化
    回退到解释执行, 重新编译为通用代码
```

### 7.3 JIT优化技术

```
JIT特有优化:

1. 内联缓存 (Inline Cache):
   记录虚方法调用的历史接收者类型
   生成类型检查 + 直接调用

   优化前 (虚调用):
     obj.foo()  -> 查虚方法表, 间接调用

   优化后 (内联缓存):
     if (obj.getClass() == CachedClass) {
       CachedClass.foo(obj);  // 直接调用, 可内联
     } else {
       vtable_lookup(obj, "foo");  // 回退
     }

2. 逃逸分析 (Escape Analysis):
   判断对象是否逃逸出方法/线程

   未逃逸 -> 栈上分配 (替代堆分配)
   未逃逸 -> 标量替换 (拆解为基本类型)
   未逃逸 -> 锁消除 (去除不必要的同步)

   例:
     void foo() {
       Point p = new Point(1, 2);  // p未逃逸
       return p.x + p.y;
     }

   优化后:
     void foo() {
       int p_x = 1;  // 标量替换
       int p_y = 2;
       return p_x + p_y;  // 无堆分配, 无GC压力
     }

3. 分支频率引导优化:
   根据运行时统计优化分支布局

   if (rare_condition) {  // 1%概率
     cold_path();
   } else {
     hot_path();          // 99%概率
   }

   优化: 将hot_path放在fall-through位置
   减少分支预测失败

4. 去虚化 (Devirtualization):
   将虚调用转为直接调用

   类型已知 -> 直接调用
   只有一个实现 -> 直接调用
   内联缓存命中 -> 直接调用
```

> 跨模块引用：[编译原理](compiler)基础篇介绍了编译器的基本优化。[Java](java/overview)的HotSpot JVM是JIT编译的典型实现。

---

## 8. GC算法

### 8.1 标记-清除 (Mark-Sweep)

```
标记-清除算法:

  阶段1: 标记 (Mark)
    从根集合(GC Roots)出发, 遍历所有可达对象, 标记为存活

  阶段2: 清除 (Sweep)
    扫描整个堆, 回收未标记的对象

  +------------------------------------------+
  |  堆内存                                   |
  |  [A*][B ][C*][D ][E*][F ][G*][H ]        |
  |                                          |
  |  * = 已标记 (存活)                        |
  |    = 未标记 (垃圾)                        |
  +------------------------------------------+

  标记后清除:
  [A*][  ][C*][  ][E*][  ][G*][  ]

  优点: 实现简单
  缺点:
    1. 内存碎片 (空闲块不连续)
    2. 分配效率低 (需维护空闲链表)
    3. STW (Stop-The-World) 暂停

  空闲链表:
    free_list -> [B,8B] -> [D,16B] -> [F,8B] -> [H,8B]
    分配时搜索足够大的空闲块 (First-Fit / Best-Fit)
```

### 8.2 复制算法 (Copying)

```
复制算法 (Cheney算法):

  将堆分为两个半区: From空间和To空间

  分配: 在From空间指针递增分配 (bump pointer)
  GC: 将存活对象从From复制到To, 交换两空间

  +-------------------+-------------------+
  |  From Space       |  To Space          |
  |  [A][B][C][D][E]  |                    |
  +-------------------+-------------------+

  GC后:
  +-------------------+-------------------+
  |  From Space       |  To Space          |
  |                   |  [A][C][E]         |
  +-------------------+-------------------+
                      交换
  +-------------------+-------------------+
  |  From Space       |  To Space          |
  |  [A][C][E]        |                    |
  +-------------------+-------------------+

  优点:
    1. 无碎片 (对象紧凑排列)
    2. 分配极快 (bump pointer)
    3. 只遍历存活对象 (与垃圾量成正比)

  缺点:
    1. 空间利用率50% (需要双倍空间)
    2. 复制开销 (存活对象多时慢)

  适用于: 存活对象少的场景 (年轻代)
```

### 8.3 分代GC

```
分代假说 (Generational Hypothesis):
  弱分代假说: 绝大多数对象朝生夕死
  强分代假说: 熬过越多次GC的对象越不容易死亡

分代GC设计:

  +------------------------------------------+
  |  Young Generation (年轻代)                |
  |  +------------------+--------------------+
  |  | Eden | Survivor0 | Survivor1          |
  |  +------------------+--------------------+
  |  新对象分配在Eden                       |
  |  GC后存活对象复制到Survivor             |
  |  两次GC后仍存活 -> 晋升到老年代         |
  +------------------------------------------+
  |  Old Generation (老年代)                  |
  |  长期存活对象                            |
  |  使用标记-清除/标记-压缩                 |
  +------------------------------------------+

  Minor GC: 只回收年轻代 (频率高, 速度快)
  Major GC: 只回收老年代
  Full GC:  回收整个堆 (频率低, 速度慢)

  HotSpot GC实现:
    Serial GC:     单线程, 串行GC
    Parallel GC:   多线程, 吞吐量优先
    CMS:           并发标记清除, 低延迟
    G1:            分区收集, 可预测暂停
    ZGC:           着色指针, 亚毫秒暂停
    Shenandoah:    Brooks指针, 低延迟

  G1 (Garbage-First):
    将堆划分为等大Region (1-32MB)
    每个Region可以是Eden/Survivor/Old/Humongous
    优先回收垃圾最多的Region (Garbage-First)
    可设定目标暂停时间

    +---+---+---+---+---+---+---+---+
    | E | S | O | E | O | H | E | F |
    +---+---+---+---+---+---+---+---+
    E=Eden S=Survivor O=Old H=Humongous F=Free

  ZGC:
    着色指针 (Colored Pointers):
      在64位指针中嵌入GC元数据
      无需读屏障即可判断对象状态

    读屏障 (Load Barrier):
      加载引用时检查是否需要修正
      允许并发整理 (对象移动时应用仍可访问)

    暂停时间 < 1ms (与堆大小无关)
```

### 8.4 引用计数与RC优化

```
引用计数 (Reference Counting):

  每个对象维护引用计数
  引用增加: count++
  引用减少: count--
  count=0: 立即回收

  优点:
    - 无STW暂停
    - 内存及时回收
    - 实现简单

  缺点:
    - 循环引用无法回收
    - 计数更新开销大 (每次赋值)
    - 非原子操作不安全 (多线程)
    - 缓存局部性差 (计数分散)

  循环引用:
    A -> B -> C -> A  (三者count均>0, 但整体不可达)

  解决:
    1. 弱引用 (weak reference): 不增加计数
    2. 辅助追踪式GC: 定期运行追踪GC回收循环
    3. 试探式回收: Python的gc模块

  优化: 延迟引用计数 (Deferred RC)
    局部变量的引用计数更新延迟到函数退出
    减少栈上引用的频繁更新

  优化: 缓冲引用计数 (Buffered RC)
    引用计数更新先缓冲, 批量处理
    减少内存写操作

  Swift ARC (Automatic Reference Counting):
    编译器自动插入retain/release
    强引用 + 弱引用 + 无主引用(unowned)
    无GC暂停, 但需手动处理循环引用
```

> 跨模块引用：[操作系统](os)的内存管理是GC的基础。[编译原理](compiler)的逃逸分析影响GC压力。

---

## 9. 链接与加载

### 9.1 静态链接

```
静态链接:

  将多个目标文件合并为一个可执行文件

  符号解析:
    强符号: 函数定义, 已初始化全局变量
    弱符号: 未初始化全局变量, __attribute__((weak))

    规则:
      1. 不允许两个强符号同名
      2. 一个强+一个弱 -> 选强
      3. 两个弱 -> 任选一个 (可能产生难以调试的bug)

  重定位:
    修改代码和数据中的地址引用

    R_X86_64_32:   绝对地址 (32位)
    R_X86_64_PC32: PC相对地址 (32位)
    R_X86_64_64:   绝对地址 (64位)
    R_X86_64_PLT32: 通过PLT的函数调用

  静态链接示例:
    gcc -static main.o utils.o -o program

    可执行文件 = main.o + utils.o + libc.a
    所有库代码被复制到可执行文件中

    缺点:
      - 可执行文件大
      - 库更新需重新链接
      - 多个进程加载相同库 -> 内存浪费
```

### 9.2 动态链接

```
动态链接 (Dynamic Linking):

  运行时加载共享库 (.so / .dll)

  编译时:
    gcc -fPIC -shared -o libutils.so utils.c
    gcc main.c -lutils -o program

  -fPIC (Position Independent Code):
    生成位置无关代码
    代码段可在任意地址加载, 无需重定位

    实现:
      全局变量: 通过GOT (Global Offset Table)间接访问
      函数调用: 通过PLT (Procedure Linkage Table)间接调用

  GOT/PLT工作原理:

    首次调用 foo():
      call foo@plt          // 跳到PLT条目
      -> jmp *GOT[foo]      // GOT[foo]初始指向plt[0]
      -> push reloc_index   // 压入重定位索引
      -> jmp resolver       // 调用动态链接器
      -> 解析foo的实际地址
      -> 写入GOT[foo]       // 更新GOT
      -> 跳转到foo()

    后续调用 foo():
      call foo@plt
      -> jmp *GOT[foo]      // GOT[foo]已是实际地址
      -> 直接跳转 (无额外开销)

  延迟绑定 (Lazy Binding):
    函数地址在首次调用时才解析
    减少启动时间
    可通过LD_BIND_NOW=1禁用 (立即解析所有符号)

  动态链接的优点:
    - 可执行文件小
    - 库更新无需重新编译
    - 多进程共享库代码 (节省内存)
```

### 9.3 程序加载

```
程序加载流程 (Linux execve):

  1. execve() 系统调用
     参数: 可执行文件路径, 命令行参数, 环境变量

  2. 内核操作:
     a. 检查文件格式 (ELF magic: 0x7f 'E' 'L' 'F')
     b. 读取ELF头和程序头表 (Program Headers)
     c. 创建新的地址空间 (新进程)
     d. 映射段到虚拟地址:
        - .text段: PROT_READ | PROT_EXEC
        - .data段: PROT_READ | PROT_WRITE
        - .bss段:  匿名映射, 清零
     e. 设置栈 (压入argc, argv, envp, auxv)
     f. 设置堆 (brk起始地址)
     g. 映射动态链接器 (ld-linux.so)
     h. 跳转到动态链接器入口

  3. 动态链接器 (ld-linux.so):
     a. 加载所有依赖的共享库 (BFS遍历依赖图)
     b. 符号解析
     c. 重定位
     d. 执行初始化函数 (.init_array)
     e. 跳转到程序入口 (e_entry)

  ELF加载视图:

  虚拟地址空间:
  +---------------------------+ 高地址
  |  Stack                    |
  |  v (向下增长)              |
  |                           |
  |  Shared Libraries         |
  |  (ld-linux.so, libc.so)   |
  |                           |
  |  ^ (向上增长)              |
  |  Heap                     |
  +---------------------------+
  |  .bss (未初始化数据)       |
  |  .data (已初始化数据)      |
  |  .text (代码)              |
  +---------------------------+ 低地址

  位置无关可执行文件 (PIE):
    可执行文件本身也是位置无关的
    可加载到任意基址
    ASLR (Address Space Layout Randomization) 安全特性
    gcc -pie -fPIE 默认开启 (现代Linux)
```

> 跨模块引用：[操作系统](os)的进程创建和虚拟内存是程序加载的基础。[编译原理](compiler)基础篇介绍了链接的基本概念。

---

## 10. 速查表

### 10.1 编译阶段速查

| 阶段     | 输入     | 输出     | 核心算法              |
| -------- | -------- | -------- | --------------------- |
| 词法分析 | 字符流   | Token流  | Thompson构造+子集构造 |
| 语法分析 | Token流  | AST      | LL/LR/LALR分析        |
| 语义分析 | AST      | 标注AST  | 类型检查+属性文法     |
| IR生成   | 标注AST  | SSA IR   | 语法制导翻译          |
| 优化     | SSA IR   | 优化IR   | 数据流分析+循环优化   |
| 代码生成 | 优化IR   | 目标代码 | 指令选择+寄存器分配   |
| 链接     | 目标文件 | 可执行   | 符号解析+重定位       |

### 10.2 分析方法速查

| 方法    | 方向     | 能力 | 向前看 | 冲突处理   | 工具       |
| ------- | -------- | ---- | ------ | ---------- | ---------- |
| LL(1)   | 自顶向下 | 弱   | 1      | 提取公因子 | 递归下降   |
| LL(\*)  | 自顶向下 | 中   | 无限   | 预测DFA    | ANTLR4     |
| SLR(1)  | 自底向上 | 中弱 | 1      | FOLLOW集   | -          |
| LALR(1) | 自底向上 | 中   | 1      | 合并同心集 | Yacc/Bison |
| LR(1)   | 自底向上 | 强   | 1      | 精确向前看 | -          |
| GLR     | 自底向上 | 最强 | -      | 并行分析   | Elkhound   |

### 10.3 GC算法速查

| 算法      | 碎片 | 暂停 | 空间开销 | 适用场景 |
| --------- | ---- | ---- | -------- | -------- |
| 标记-清除 | 有   | STW  | 低       | 老年代   |
| 复制      | 无   | STW  | 50%      | 年轻代   |
| 标记-压缩 | 无   | STW  | 低       | 老年代   |
| 引用计数  | 有   | 无   | 低       | 实时系统 |
| 分代      | 少   | 短   | 中       | 通用     |
| ZGC       | 无   | <1ms | 中       | 低延迟   |

### 10.4 优化技术速查

| 优化       | 作用           | 阶段      | 依赖分析       |
| ---------- | -------------- | --------- | -------------- |
| 常量折叠   | 编译期计算     | 局部      | 无             |
| 常量传播   | 传播已知值     | 全局      | 到达定义       |
| 死代码消除 | 删除无用代码   | 全局      | 活跃变量       |
| CSE        | 消除重复计算   | 局部/全局 | 可用表达式     |
| LICM       | 循环不变量外提 | 循环      | 循环不变量检测 |
| 强度削弱   | 替换昂贵操作   | 循环      | 归纳变量       |
| 内联       | 消除调用开销   | 过程间    | 调用图         |
| 尾调用优化 | 复用栈帧       | 过程间    | 控制流         |
| 逃逸分析   | 栈上分配       | JIT       | 数据流         |

---

## 延伸阅读

- _Compilers: Principles, Techniques, and Tools_ (2nd Edition) -- Aho, Lam, Sethi, Ullman (龙书)
- _Advanced Compiler Design and Implementation_ -- Steven Muchnick
- _Engineering a Compiler_ (3rd Edition) -- Cooper & Torczon
- _The Garbage Collection Handbook_ -- Jones, Hosking, Moss
- _Linkers and Loaders_ -- John R. Levine
- _LLVM Cookbook_ -- Mayur Pandey, Suyog Sarda
