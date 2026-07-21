---
order: 63
title: 编译原理进阶
module: 'cs-fundamentals'
category: 'Computer Science'
difficulty: advanced
description: 编译原理进阶：LL/LR分析、语法制导翻译、中间代码优化与代码生成
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cs-fundamentals/软件工程'
  - 'cs-fundamentals/数据库系统原理'
  - 'cs-fundamentals/操作系统进阶'
  - 'cs-fundamentals/计算机网络进阶'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 词法分析

### 1.1 正则表达式到 NFA

Thompson 构造法：

- 空串 $\epsilon$：两个状态，$\epsilon$ 转移
- 单字符 $a$：两个状态，$a$ 转移
- 并 $R_1 | R_2$：新起始状态，$\epsilon$ 到两个子 NFA
- 连接 $R_1 R_2$：$R_1$ 终态 $\epsilon$ 到 $R_2$ 起始
- 闭包 $R^*$：新起始和终态，$\epsilon$ 循环

### 1.2 NFA 到 DFA

子集构造法：

$$\text{DFA 状态} = \text{NFA 状态集的子集}$$

$$\epsilon\text{-closure}(s) = \{t \mid s \xrightarrow{\epsilon^*} t\}$$

$$\text{move}(T, a) = \bigcup_{s \in T} \epsilon\text{-closure}(\delta(s, a))$$

### 1.3 DFA 最小化

Hopcroft 算法：$O(n \log n)$

1. 初始划分 $\{F, S-F\}$
2. 对每个块，按转移目标进一步分割
3. 重复直到稳定

## 2. 语法分析

### 2.1 LL 分析（自顶向下）

**LL(1) 条件**：

对于文法 $A \to \alpha \mid \beta$：

1. $\text{FIRST}(\alpha) \cap \text{FIRST}(\beta) = \emptyset$
2. 若 $\epsilon \in \text{FIRST}(\alpha)$，则 $\text{FIRST}(\beta) \cap \text{FOLLOW}(A) = \emptyset$

**FIRST 集计算**：

$$\text{FIRST}(A) = \{a \mid A \xRightarrow{*} a\alpha\} \cup \{\epsilon \mid A \xRightarrow{*} \epsilon\}$$

**FOLLOW 集计算**：

$$\text{FOLLOW}(A) = \{a \mid S \xRightarrow{*} \alpha Aa\beta\}$$

**LL(1) 分析表构造**：

对每个产生式 $A \to \alpha$：

- 对每个 $a \in \text{FIRST}(\alpha)$：$M[A, a] = A \to \alpha$
- 若 $\epsilon \in \text{FIRST}(\alpha)$：对每个 $b \in \text{FOLLOW}(A)$：$M[A, b] = A \to \alpha$

### 2.2 LR 分析（自底向上）

**LR 分析器结构**：

```
输入 ──→ ┌──────────┐ ──→ 动作
          │  栈      │
          │ 状态+符号 │
          └──────────┘
```

**动作类型**：

- Shift $s$：移进，压入状态 $s$
- Reduce $A \to \alpha$：归约，弹出 $|\alpha|$ 个状态，压入 $\text{GOTO}[t, A]$
- Accept：接受
- Error：报错

### 2.3 SLR 分析

使用 FOLLOW 集确定归约动作：

对项目 $A \to \alpha \cdot$，仅在 $a \in \text{FOLLOW}(A)$ 时添加 $M[s, a] = \text{Reduce}$

**SLR 的不足**：FOLLOW 集可能过大，导致归约-归约冲突。

### 2.4 LALR 分析

合并同心项目集（核心相同的项目集）。

LALR 表大小与 SLR 相同，但分析能力更强。

大多数实用解析器生成器（Yacc、Bison）使用 LALR(1)。

### 2.5 LR 分析器对比

| 类型  | 状态数 | 分析能力 | 冲突 |
| ----- | ------ | -------- | ---- |
| SLR   | 最少   | 最弱     | 最多 |
| LALR  | 少     | 中等     | 较少 |
| LR(1) | 最多   | 最强     | 最少 |

## 3. 语法制导翻译

### 3.1 语法制导定义（SDD）

为文法的每个产生式关联**语义规则**：

$$A \to X_1 X_2 ... X_n \quad \{语义规则\}$$

### 3.2 综合属性与继承属性

**综合属性**：在分析树中，由子节点属性计算父节点属性（自底向上）。

$$A.syn = f(X_1.syn, X_2.syn, ...)$$

**继承属性**：由父节点或兄弟节点属性计算（自顶向下）。

$$X_i.inh = f(A.inh, X_1.syn, ...)$$

### 3.3 S 属性文法

仅使用综合属性的 SDD，可在 LR 分析中自底向上计算。

### 3.4 L 属性文法

每个继承属性 $X_i.inh$ 仅依赖于：

1. $A$ 的继承属性
2. $X_i$ 左侧兄弟的属性

L 属性文法可在 LL 或 LR 分析中单遍计算。

## 4. 中间代码生成

### 4.1 中间表示形式

**三地址码**：

```
t1 = a + b
t2 = t1 * c
x = t2
```

**静态单赋值（SSA）**：

每个变量只被赋值一次，使用 $\phi$ 函数合并控制流：

```
if condition:
    x1 = a + b
else:
    x2 = a - b
x3 = φ(x1, x2)
```

**四元式**：(op, arg1, arg2, result)

**三元式**：(op, arg1, arg2)，通过位置引用结果

### 4.2 类型检查

**类型表达式**：

- 基本类型：integer, real, boolean
- 构造类型：array(n, T), pointer(T), record(fields)
- 函数类型：$T_1 \times T_2 \to T_3$

**类型等价**：

- 名字等价：类型名相同
- 结构等价：类型结构相同

## 5. 代码优化

### 5.1 基本块优化

**常量折叠**：

```
x = 3 + 5  →  x = 8
```

**常量传播**：

```
x = 5
y = x + 1  →  y = 6
```

**死代码消除**：

```
x = 5
x = 10     →  删除 x = 5
```

**代数化简**：

```
x = y + 0  →  x = y
x = y * 1  →  x = y
```

### 5.2 循环优化

**循环不变代码外提**：

```
// 优化前
for (i = 0; i < n; i++) {
    t = a * b;  // 循环不变
    c[i] = t + d[i];
}

// 优化后
t = a * b;
for (i = 0; i < n; i++) {
    c[i] = t + d[i];
}
```

**强度削弱**：

```
// 优化前
for (i = 0; i < n; i++) {
    a[i*4] = 0;
}

// 优化后
t = 0;
for (i = 0; i < n; i++) {
    a[t] = 0;
    t = t + 4;  // 乘法 → 加法
}
```

**归纳变量删除**：

当存在基本归纳变量和派生归纳变量时，可删除其中一个。

### 5.3 全局优化

**数据流分析**：

| 分析       | 方向 | 信息             |
| ---------- | ---- | ---------------- |
| 到达定义   | 前向 | 变量在哪里被定义 |
| 活跃变量   | 后向 | 变量未来是否使用 |
| 可用表达式 | 前向 | 表达式是否已计算 |
| 常量传播   | 前向 | 变量是否为常量   |

**数据流方程**（以活跃变量为例）：

$$\text{OUT}[B] = \bigcup_{S \in \text{succ}(B)} \text{IN}[S]$$

$$\text{IN}[B] = \text{use}[B] \cup (\text{OUT}[B] - \text{def}[B])$$

### 5.4 优化级别

| 级别       | 优化内容 |
| ---------- | -------- |
| 局部优化   | 基本块内 |
| 全局优化   | 过程内   |
| 过程间优化 | 跨过程   |

## 6. 代码生成

### 6.1 寄存器分配

**图着色算法**：

1. 构建干涉图：同时活跃的变量之间有边
2. 用 $k$ 种颜色着色（$k$ 为可用寄存器数）
3. 无法着色时溢出（spill）到内存

**活跃区间**：变量从定义到最后一次使用的范围。

### 6.2 指令选择

**树重写**：将中间代码树匹配到目标机器指令模式。

**动态规划**：对每个表达式子树选择代价最小的指令序列。

### 6.3 指令调度

**列表调度算法**：

1. 构建数据依赖图
2. 计算每个操作的优先级（关键路径长度）
3. 按优先级从高到低调度到可用时钟周期
