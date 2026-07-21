---
order: 102
title: 指针与数组的区别
module: c
category: 'dev-lang'
difficulty: advanced
description: 'C语言指针与数组的区别：sizeof、&运算、传参差异。'
author: fanquanpp
updated: '2026-06-14'
related:
  - c/结构体与联合体
  - c/函数调用栈帧
  - c/二级指针与指针数组
  - c/函数指针回调与跳转表
prerequisites:
  - c/概述
---

# 指针与数组的区别（Pointers vs Arrays）

> "In C, there is a strong relationship between pointers and arrays, strong enough that pointers and arrays should be discussed simultaneously. Any operation that can be achieved by array subscripting can also be done with pointers. The pointer version will in general be faster but, at least to the uninitiated, harder to read."
> —— Brian W. Kernighan & Dennis M. Ritchie, *The C Programming Language* 2nd ed., §5.3

## 摘要

本文系统论述 C 语言中指针（pointer）与数组（array）的语义差异、转换规则、共同点与陷阱。指针与数组的关系是 C 语言设计中最微妙、最容易引发误解的部分。表面上看，二者都支持 `*`、`[]`、`+` 等运算，但在 `sizeof`、`&`、可赋值性、生命周期、类型推导、参数传递等关键维度上存在本质差异。C 标准通过"数组到指针的隐式转换"（array-to-pointer decay）这一机制统合了二者的语法，但底层语义差异决定了大量未定义行为（undefined behavior, UB）与可移植性陷阱。

本文对标 MIT 6.087（Practical Programming in C）、Stanford CS107、CMU 15-213 等课程教学水准，结合 ISO/IEC 9899:2024（C23）规范、System V ABI、Linux Kernel、glibc、Redis 等真实工程案例，深入剖析数组退化（decay）、多维数组、变长数组（VLA）、`&arr` 与 `arr` 的类型差异、参数传递等核心议题。

---

## 1. 学习目标

### 1.1 Remember（记忆）

完成本节后，学习者应当能够准确回忆：

- 数组到指针的隐式转换（decay）规则及其例外情况（`sizeof`、`&`、`sizeof` 字符串字面量初始化等）。
- `sizeof(arr)` 与 `sizeof(ptr)` 的区别：前者返回数组总字节数，后者返回指针大小（x86_64 上为 8）。
- `&arr` 与 `arr` 的类型差异：前者类型为 `int (*)[N]`，后者类型为 `int *`。
- 数组名不可作为左值（lvalue）赋值或自增，指针变量可以。
- 数组作为函数参数时退化为指针，函数内 `sizeof` 得到指针大小。
- 多维数组（如 `int matrix[3][4]`）的内存布局是行优先连续存储，类型层次为 `int [3][4]` → `int [4]` → `int`。
- C99 引入变长数组（VLA），C11 起变为可选特性。
- 字符串字面量（string literal）的类型为 `char[N+1]`（含 `\0`），存储于只读段。

### 1.2 Understand（理解）

学习者应当能够解释：

- 为什么 C 设计者选择"数组退化"机制：源于 BCPL/B 语言的指针语义遗留与早期 PDP-11 内存模型的硬件约束。
- 数组与指针在底层表示上的差异：数组是"地址常量"（address constant），指针是"地址变量"（address variable）。
- `int arr[10]` 与 `int *ptr = arr` 在编译器符号表中的不同表示：前者是 `arr` 绑定到栈区一段连续内存，后者是 `ptr` 绑定到栈区一个指针变量。
- `&arr + 1` 为何跨越整个数组（偏移 `sizeof(arr)`），而 `arr + 1` 仅偏移 `sizeof(int)`：源于指针算术的"按指向类型大小缩放"规则。
- 多维数组 `int matrix[3][4]` 中 `matrix`、`matrix[0]`、`matrix[0][0]` 三者地址值相同但类型不同的语义含义。
- 为什么 `void f(int arr[10])` 与 `void f(int *arr)` 完全等价：函数参数声明的"数组退化"规则。
- 字符串字面量为何不可修改：C 标准允许将其存储于只读存储区。
- 变长数组（VLA）与静态数组在栈帧分配、生命周期、错误处理上的差异。

### 1.3 Apply（应用）

学习者应当能够：

- 区分并正确使用 `int *p[N]`（指针数组）与 `int (*p)[N]`（数组指针）。
- 编写遍历多维数组的函数，正确传递参数（如 `void process(int (*matrix)[4], int rows)`）。
- 在性能关键代码中选择数组下标访问或指针算术访问，并理解编译器优化后二者通常等价。
- 使用 `_Static_assert` / `static_assert` 验证数组大小与类型。
- 实现 `strlen`、`memcpy`、`memcmp` 等字符串/内存函数的标准模式。
- 使用 `sizeof(arr) / sizeof(arr[0])` 宏模式计算数组元素数，并理解其在函数参数内的失效。

### 1.4 Analyze（分析）

学习者应当能够：

- 分析编译器生成的汇编代码，识别数组下标访问与指针算术访问的等价性（如 `arr[i]` 与 `*(arr + i)`）。
- 在反汇编输出中识别"数组退化"导致的类型信息丢失。
- 通过 `clang -Warray-parameter`、`gcc -Wsizeof-array-argument` 等警告诊断函数参数中的数组大小信息丢失。
- 识别二进制协议解析中"数组指针"与"指针数组"的混用陷阱。
- 分析 `int arr[N]` 在栈上分配与 `malloc(N * sizeof(int))` 在堆上分配的内存布局与生命周期差异。

### 1.5 Evaluate（评价）

学习者应当能够评估：

- 在特定场景下（小数组、栈分配、缓存局部性）使用数组 vs 指针 + malloc 的性能权衡。
- 多维数组 `int matrix[N][M]` 与指针数组 `int **matrix` 在内存连续性、缓存友好性、释放复杂度上的对比。
- C99 VLA 在嵌入式系统中的适用性（栈大小限制、错误处理）。
- 在跨语言互操作（FFI）中传递 C 数组给 Rust/Go/Python 时的 ABI 兼容性考虑。

### 1.6 Create（创造）

学习者应当能够：

- 设计一个安全的动态二维数组接口，封装 `int **` 的内存管理（分配、释放、越界检查）。
- 实现一个通用的 `foreach` 宏，对任意类型数组进行迭代。
- 在跨平台代码中正确处理"数组退化"导致的类型信息丢失，使用结构体封装数组大小。
- 设计一个二进制协议解析器，正确处理网络字节序与平台对齐差异，避免依赖"数组与指针等价"的假设。

---

## 2. 历史动机与发展脉络

### 2.1 BCPL/B 时代的指针语义

C 语言的指针与数组语义直接继承自 Martin Richards 的 BCPL（1967）与 Ken Thompson 的 B（1969）。BCPL 与 B 是无类型语言，所有数据均视为"字"（word），内存是连续的 `cell` 数组。指针与数组本质相同：指针是 cell 的索引，数组是 cell 索引的连续区。

在 B 语言中：

```b
let arr[10];
let p = arr;       /* arr 与 p 完全等价，都是 cell 索引 */
let v = p[3];      /* 等价于 *(p + 3) */
```

这一无类型模型简化了语言设计，但牺牲了类型安全。Dennis Ritchie 在 1972 年设计 C 语言时引入了类型系统，但仍保留了 BCPL/B 的"指针即数组首地址"语义，并由此产生"数组退化"机制：数组在大多数表达式中自动转换为指向首元素的指针。

### 2.2 K&R C（1978）：规则确立

Kernighan & Ritchie 在 *The C Programming Language* 第一版第 5 章明确指出：

> "In C, there is a strong relationship between pointers and arrays ... Any operation that can be achieved by array subscripting can also be done with pointers."

K&R 确立的规则包括：

1. 数组名在表达式中退化为指向首元素的指针。
2. `arr[i]` 等价于 `*(arr + i)`。
3. `&arr` 与 `arr` 在数值上相同（在 PDP-11 上无类型差异）。
4. 数组作为函数参数时退化为指针。
5. `sizeof(arr)` 返回数组总大小（非退化例外）。

但 K&R 对 `&arr` 的类型差异、多维数组的复杂声明、字符串字面量的存储类等议题描述模糊，导致早期 C 编译器（如 VAX VMS C、Microsoft C 4.0）行为不一致。

### 2.3 C89 / ANSI C（1989）：形式化规则

C89 标准（ISO/IEC 9899:1990）首次将"数组退化"规则形式化：

> §6.2.2.1: "Except when it is the operand of the `sizeof` operator, the `&` operator, the `++` operator, the `--` operator, the left operand of the `.` operator, or the left operand of an assignment operator, an lvalue that has type 'array of type' is converted to an expression that has type 'pointer to type' that points to the initial member of the array object and is not an lvalue."

C89 明确了数组退化的"例外清单"：

1. `sizeof arr`：不退化，返回数组大小。
2. `&arr`：不退化，返回指向数组的指针。
3. 字符串字面量初始化 `char arr[] = "hello"`：不退化，初始化数组内容。

C89 还规定了多维数组的递归布局规则、`arr[i][j]` 与 `*(*(arr + i) + j)` 的等价性。

### 2.4 C99（1999）：VLA 与复合字面量

C99 引入两项与数组相关的重要特性：

**变长数组（Variable-Length Array, VLA）**：

```c
void func(int n) {
    int arr[n];   /* VLA，运行时确定大小 */
    /* ... */
}
```

VLA 在栈上分配，大小运行时计算。其类型仍为 `int [n]`（n 为运行时值），`sizeof` 在运行时求值（C99 特例）：

```c
size_t s = sizeof(arr);   /* 运行时求值，返回实际字节数 */
```

VLA 的引入打破了"`sizeof` 总是编译期常量"的传统规则，带来编译器实现复杂性与栈溢出风险。

**复合字面量（Compound Literal）**：

```c
int *p = (int[]){1, 2, 3, 4};   /* 匿名数组，类型 int[4] */
```

复合字面量创建匿名数组对象，其生命周期与所在作用域一致（块作用域）或静态（文件作用域）。

### 2.5 C11（2011）：VLA 可选化

C11 将 VLA 从"必需"改为"可选"特性，编译器可通过 `__STDC_NO_VLA__` 宏声明不支持。这一改变源于嵌入式系统对栈大小严格限制的考虑，以及 VLA 错误处理（`alloca` 失败）的困难。

C11 还引入 `_Generic`，可用于编写对数组与指针差异化处理的宏：

```c
#define TYPE_OF(x) _Generic((x), \
    int *: "pointer to int", \
    int[10]: "array of 10 int", \
    default: "other" \
)
```

### 2.6 C23（2024）：`[[...]]` 属性与空数组

C23 进一步规范化：

- `[[...]]` 标准属性语法（替代 `__attribute__((...))`）。
- 空数组 `int arr[0]`（灵活数组成员的早期形式）的语义澄清。
- `static_assert` 成为关键字，可用于编译期验证数组大小。

### 2.7 编译器实现演化

| 编译器 | 版本 | 重要特性 |
| ------ | ---- | -------- |
| GCC | 2.x | `-Wsizeof-array-argument` 警告函数参数数组大小丢失 |
| GCC | 4.6 | 完整支持 C99 VLA |
| Clang | 3.0 | 兼容 GCC 警告与扩展 |
| Clang | 6.0 | `-Warray-parameter` 增强诊断 |
| MSVC | 19.0 | 完整支持 C99/C11 数组特性 |
| GCC | 13.0 | `-Warray-parameter` 完整实现 |

---

## 3. 形式化定义

### 3.1 数组类型的形式化定义

ISO/IEC 9899:2024（C23）§6.2.5 定义数组类型：

> An *array type* describes a contiguously allocated nonempty set of objects with a particular member object type, called the *element type*. The element type shall be complete whenever the array type is used. Array types are characterized by their element type and by the number of elements in the array.

形式化地，数组类型记为 $T[N]$，其中 $T$ 为元素类型（complete type），$N$ 为元素数（正整数）。其属性：

$$
\text{sizeof}(T[N]) = N \times \text{sizeof}(T)
$$

$$
\text{alignof}(T[N]) = \text{alignof}(T)
$$

数组元素在内存中连续存放，无填充，这是 C 标准的硬性要求。

### 3.2 指针类型的形式化定义

指针类型记为 $T^*$（指向 $T$ 的指针），其属性：

$$
\text{sizeof}(T^*) = \text{implementation-defined} \quad (\text{通常 } 4 \text{ 或 } 8)
$$

$$
\text{alignof}(T^*) = \text{alignof}(\text{uintptr\_t})
$$

指针变量存储某个 $T$ 类型对象的地址，可被赋值、自增、自减。

### 3.3 数组到指针的隐式转换（Decay）

C23 §6.3.2.1 规定数组到指针的隐式转换规则：

> Except when it is the operand of the `sizeof` operator, the `typeof` operator (since C23), the unary `&` operator, the `++`/`--` operators, the left operand of `.` (or `->`) operator, the left operand of an assignment operator, or a string literal used to initialize an array, an expression that has type "array of type" is converted to an expression with type "pointer to type" that points to the initial element of the array object and is not an lvalue.

形式化地，设 $a$ 为类型 $T[N]$ 的数组表达式。在以下"转换上下文"中，$a$ 自动转换为指向首元素的指针：

$$
a \xrightarrow{\text{decay}} \&a[0] \quad \text{类型 } T^*
$$

**例外清单**（不发生退化的上下文）：

1. `sizeof a`：返回 $\text{sizeof}(T[N])$。
2. `&a`：返回 $\text{T}^*[\![N]\!]$（指向数组的指针）。
3. `typeof(a)`（C23）：保留数组类型。
4. `++a`、`--a`：非法（数组名非可修改左值），但仍不退化。
5. `a = ...`：非法（数组名非左值），但仍不退化。
6. `a.x` / `a->x`：保留数组类型。
7. `char str[] = "literal"`：字符串字面量初始化数组，不退化。

### 3.4 指针算术的形式化定义

设 $p$ 为类型 $T^*$ 的指针，指向数组中第 $i$ 个元素。则：

$$
p + n \rightarrow \text{指向第 } i + n \text{ 个元素的指针}
$$

其地址增量：

$$
\text{addr}(p + n) = \text{addr}(p) + n \times \text{sizeof}(T)
$$

下标访问 `p[i]` 严格等价于 `*(p + i)`：

$$
p[i] \equiv *(p + i) \equiv *(i + p) \equiv i[p]
$$

最后一种形式 `i[p]` 在 C 标准中合法，但极少使用，是 C 语言的"奇技淫巧"。

### 3.5 多维数组的形式化定义

`int matrix[M][N]` 的类型为 `int [M][N]`，是"由 M 个 `int [N]` 组成的数组"。其递归布局：

- `matrix` 类型：`int [M][N]` → 退化为 `int (*)[N]`（指向 `int[N]` 的指针）。
- `matrix[i]` 类型：`int [N]` → 退化为 `int *`。
- `matrix[i][j]` 类型：`int`。

地址关系：

$$
\text{addr}(\text{matrix}[i][j]) = \text{addr}(\text{matrix}) + (i \times N + j) \times \text{sizeof}(\text{int})
$$

### 3.6 `&arr` 与 `arr` 的类型差异

设 `int arr[10]`，则：

- `arr`（在转换上下文中）类型为 `int *`，值为 `&arr[0]`。
- `&arr` 类型为 `int (*)[10]`（指向"由 10 个 int 组成的数组"的指针），值仍为 `&arr[0]`。

二者**数值相同**但**类型不同**：

| 表达式 | 类型 | 数值 | `+1` 增量 |
| ------ | ---- | ---- | --------- |
| `arr` | `int *` | `&arr[0]` | `sizeof(int)` = 4 |
| `&arr` | `int (*)[10]` | `&arr[0]` | `sizeof(int[10])` = 40 |
| `arr + 1` | `int *` | `&arr[1]` | - |
| `&arr + 1` | `int (*)[10]` | `&arr[10]`（越过数组末尾，合法作为哨兵） | - |

### 3.7 函数参数的退化规则

C23 §6.7.6.3 规定函数参数中的数组类型自动转换为指针：

> A declaration of a parameter as "array of type" shall be adjusted to "qualified pointer to type".

形式化转换规则：

| 形参声明 | 实际类型 |
| -------- | -------- |
| `int arr[10]` | `int *arr` |
| `int arr[]` | `int *arr` |
| `int arr[static 10]` | `int *arr`（但调用方必须传入至少 10 元素的数组，C99） |
| `int arr[const 10]` | `int *const arr`（指针本身 const） |
| `int (*matrix)[4]` | `int (*matrix)[4]`（无转换，本就是指针） |
| `int matrix[3][4]` | `int (*matrix)[4]`（第一维退化） |

注意：**只有最外层数组维度退化**。`int matrix[3][4]` 退化为 `int (*matrix)[4]`，而非 `int **matrix`。这是 C 程序员最常犯的错误之一。

### 3.8 未定义行为（UB）

C 标准规定以下与指针/数组相关的 UB：

1. 数组越界访问：`arr[N]`（`arr` 仅 `N` 元素），UB。
2. 指针算术越过数组末尾 +1 哨兵位置：`&arr[N]` 合法，`&arr[N+1]` UB。
3. 解引用空指针：`*NULL`，UB。
4. 解引用未初始化指针：`int *p; *p = 0;`，UB。
5. 悬垂指针解引用：函数返回栈数组指针，UB。
6. `restrict` 限定符违反：别名访问 `restrict` 指针，UB。
7. 修改字符串字面量：`char *s = "hello"; s[0] = 'H';`，UB。

---

## 4. 理论推导与原理解析

### 4.1 数组退化机制的设计原理

C 设计者选择"数组退化"机制的三个动机：

**动机 1：BCPL/B 历史遗留**

BCPL 与 B 语言中，数组与指针本就等价（无类型）。C 为兼容既有 B 代码，保留这一语义。

**动机 2：值传递语义统一**

C 函数参数采用值传递（pass by value）。若数组按值传递，需复制整个数组（可能数千字节），开销过大。"退化"机制使数组自动按引用（指针）传递，符合 BCPL/B 程序员的预期。

**动机 3：编译器实现简化**

数组大小在编译期已知（除 VLA），但函数参数大小可能跨翻译单元不可见。"退化"机制使函数参数类型固定为指针，无需数组大小信息，简化链接器与调用约定。

### 4.2 `sizeof` 的编译期求值原理

`sizeof` 是 C 标准规定的"非退化上下文"之一。其求值规则：

**静态数组**（C89）：

```c
int arr[10];
size_t s = sizeof(arr);   /* 编译期求值，返回 40 */
```

编译器在符号表中记录 `arr` 的类型为 `int [10]`，`sizeof` 直接读取类型信息计算。

**VLA**（C99）：

```c
void func(int n) {
    int arr[n];
    size_t s = sizeof(arr);   /* 运行时求值，返回 n * 4 */
}
```

VLA 的 `sizeof` 在运行时执行，通过存储数组大小元数据实现。这是 C99 引入的特例。

**指针**：

```c
int *p = arr;
size_t s = sizeof(p);   /* 编译期求值，返回 8（64 位） */
```

`p` 的类型为 `int *`，`sizeof` 返回指针大小。

### 4.3 `&arr` 的类型推导

考虑 `int arr[10]`：

- `arr` 在大多数上下文中退化为 `int *`。
- `&arr` 是"取地址"运算，作用于数组本身（非退化上下文）。
- `arr` 的类型为 `int [10]`，`&` 运算符对其取地址，结果类型为 `int (*)[10]`。

类型推导链：

```
arr (expression): int[10]
   │
   ├─ decay context: int* (pointing to arr[0])
   │
   └─ & operator: int(*)[10] (pointing to the array itself)
```

`&arr + 1` 的指针算术按 `int [10]` 的大小（40 字节）缩放：

$$
\text{addr}(\&arr + 1) = \text{addr}(\&arr) + 1 \times \text{sizeof}(\text{int}[10]) = \text{addr}(\&arr) + 40
$$

这正是"越过数组末尾"的位置，作为哨兵合法，但解引用 UB。

### 4.4 多维数组的递归退化

`int matrix[3][4]` 在表达式中的递归退化：

```
matrix (type: int[3][4])
   │
   ├─ decay to: int(*)[4]  (pointing to matrix[0])
   │
   │   matrix + i (type: int(*)[4], pointing to matrix[i])
   │
   ├─ *(matrix + i) = matrix[i] (type: int[4])
   │
   │   matrix[i] decays to: int* (pointing to matrix[i][0])
   │
   │   matrix[i] + j (type: int*, pointing to matrix[i][j])
   │
   ├─ *(matrix[i] + j) = matrix[i][j] (type: int)
```

由此可推导 `matrix[i][j]` 的等价指针表达式：

$$
\text{matrix}[i][j] \equiv *(*(\text{matrix} + i) + j)
$$

### 4.5 数组指针 vs 指针数组的类型推导

`int *p[10]`（指针数组）：

- `p` 是"由 10 个 `int *` 组成的数组"。
- `p` 退化为 `int **`（指向 `int *` 的指针）。
- `sizeof(p)` = 80（10 个指针，每个 8 字节）。

`int (*p)[10]`（数组指针）：

- `p` 是"指向 `int [10]` 的指针"。
- `p` 不退化（本就是指针）。
- `sizeof(p)` = 8（指针大小）。

**解析规则**：C 声明的"螺旋法则"（spiral rule）：

```
int *p[10];
    │
    ├─ p is...
    ├─ [10] array of 10...
    ├─ * pointer to...
    └─ int int

int (*p)[10];
    │
    ├─ p is...
    ├─ ( * ) pointer to...
    ├─ [10] array of 10...
    └─ int int
```

### 4.6 字符串字面量的存储类

字符串字面量 `"hello"` 的类型为 `char [6]`（含 `\0`），存储类为静态（static），位于只读数据段（`.rodata`）。

两种使用模式：

```c
char *s = "hello";     /* s 指向只读字面量，s[0] = 'H' 是 UB */
char arr[] = "hello";  /* arr 是栈数组，拷贝字面量内容，arr[0] = 'H' 合法 */
```

第二种模式触发了"字符串字面量初始化数组"的非退化例外：字面量不退化为指针，而是直接拷贝到数组。

### 4.7 ABI 与调用约定

System V AMD64 ABI 规定：

- 小于等于 16 字节的 struct（含数组）通过寄存器传递。
- 大于 16 字节的 struct 通过栈传递（隐式首地址指针）。
- 数组作为 struct 成员时，按 struct 布局规则处理。
- 数组作为函数参数时，退化为指针，按指针传递（8 字节寄存器或栈）。

这一约定使得 C 函数可高效处理数组，但也丢失了编译期大小信息。

---

## 5. 代码示例

### 5.1 入门：`sizeof` 与 `&` 的差异

```c
/* file: examples/ptr_arr_basics.c
 * standard: C11
 * compile: gcc -std=c11 -Wall ptr_arr_basics.c -o ptr_arr_basics
 */
#include <stdio.h>
#include <stddef.h>

int main(void) {
    int arr[10];
    int *ptr = arr;

    /* sizeof 差异 */
    printf("sizeof(arr)  = %zu\n", sizeof(arr));   /* 40 */
    printf("sizeof(ptr)  = %zu\n", sizeof(ptr));   /* 8 */

    /* & 运算差异 */
    printf("&arr         = %p\n", (void *)&arr);
    printf("&arr + 1     = %p\n", (void *)(&arr + 1));
    printf("arr          = %p\n", (void *)arr);
    printf("arr + 1      = %p\n", (void *)(arr + 1));

    /* 地址差值 */
    ptrdiff_t diff_arr = (char *)(&arr + 1) - (char *)&arr;
    ptrdiff_t diff_ptr = (char *)(arr + 1) - (char *)arr;
    printf("&arr + 1 - &arr = %td bytes\n", diff_arr);  /* 40 */
    printf("arr + 1 - arr   = %td bytes\n", diff_ptr);  /* 4 */

    return 0;
}
```

### 5.2 进阶：多维数组遍历

```c
/* file: examples/multidim_array.c
 * standard: C11
 */
#include <stdio.h>
#include <stddef.h>

#define ROWS 3
#define COLS 4

/* 正确：传递数组指针 */
void print_matrix(int (*matrix)[COLS], int rows) {
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < COLS; j++) {
            printf("%3d ", matrix[i][j]);
        }
        printf("\n");
    }
}

/* 错误示范：int ** 与 int (*)[COLS] 不兼容 */
/* void wrong_print(int **matrix, int rows); */

/* 计算 matrix[i][j] 的地址 */
int *get_element(int (*matrix)[COLS], int i, int j) {
    return &matrix[i][j];
}

int main(void) {
    int matrix[ROWS][COLS] = {
        {1, 2, 3, 4},
        {5, 6, 7, 8},
        {9, 10, 11, 12}
    };

    printf("Matrix layout:\n");
    print_matrix(matrix, ROWS);

    printf("\nsizeof(matrix)    = %zu\n", sizeof(matrix));      /* 48 */
    printf("sizeof(matrix[0]) = %zu\n", sizeof(matrix[0]));     /* 16 */
    printf("sizeof(matrix[0][0]) = %zu\n", sizeof(matrix[0][0])); /* 4 */

    /* 类型差异 */
    printf("\nmatrix        = %p (type: int(*)[%d])\n",
           (void *)matrix, COLS);
    printf("matrix[0]     = %p (type: int*)\n", (void *)matrix[0]);
    printf("matrix[0][0]  = %p (type: int)\n", (void *)&matrix[0][0]);
    /* 三者地址值相同，但类型不同 */

    /* 验证等价表达式 */
    printf("\nmatrix[1][2] = %d\n", matrix[1][2]);
    printf("*(*(matrix + 1) + 2) = %d\n", *(*(matrix + 1) + 2));
    printf("1[matrix][2] = %d\n", 1[matrix][2]);  /* 合法但罕见 */
    printf("matrix[1][2] = %d\n", matrix[1][2]);

    return 0;
}
```

### 5.3 高级：函数参数退化

```c
/* file: examples/param_decay.c
 * standard: C11
 * compile: gcc -std=c11 -Wall -Warray-parameter param_decay.c
 */
#include <stdio.h>
#include <stddef.h>

/* 三种等价声明 */
void func_v1(int arr[10]) {
    printf("func_v1: sizeof(arr) = %zu (expected 8)\n", sizeof(arr));
}

void func_v2(int arr[]) {
    printf("func_v2: sizeof(arr) = %zu (expected 8)\n", sizeof(arr));
}

void func_v3(int *arr) {
    printf("func_v3: sizeof(arr) = %zu (expected 8)\n", sizeof(arr));
}

/* C99: static 修饰符提示最小大小 */
void func_v4(int arr[static 10]) {
    /* 编译器可假设 arr 至少 10 元素，便于优化 */
    int sum = 0;
    for (int i = 0; i < 10; i++) {
        sum += arr[i];
    }
    printf("func_v4: sum = %d\n", sum);
}

/* 安全的数组长度宏（仅对真实数组有效） */
#define ARRAY_LEN(a) (sizeof(a) / sizeof((a)[0]))

void demonstrate_macro(void) {
    int arr[10];
    printf("ARRAY_LEN(arr) = %zu\n", ARRAY_LEN(arr));  /* 10 */

    int *ptr = arr;
    /* ARRAY_LEN(ptr) 在函数内是 BUG，返回 8/4 = 2 */
    /* 但编译器会警告：-Wsizeof-pointer-div */
}

int main(void) {
    int arr[10] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};

    func_v1(arr);
    func_v2(arr);
    func_v3(arr);
    func_v4(arr);

    demonstrate_macro();

    return 0;
}
```

### 5.4 生产级：安全的动态二维数组

```c
/* file: examples/safe_2d_array.h
 * standard: C11
 * description: 安全的动态二维数组接口，封装 int** 内存管理
 */
#ifndef SAFE_2D_ARRAY_H
#define SAFE_2D_ARRAY_H

#include <stddef.h>
#include <stdbool.h>

typedef struct {
    int **data;
    size_t rows;
    size_t cols;
} Matrix;

/* 创建矩阵：分配连续内存以保证缓存友好 */
bool matrix_create(Matrix *m, size_t rows, size_t cols);

/* 释放矩阵 */
void matrix_destroy(Matrix *m);

/* 获取元素（含边界检查） */
int matrix_get(const Matrix *m, size_t i, size_t j, bool *ok);

/* 设置元素（含边界检查） */
bool matrix_set(Matrix *m, size_t i, size_t j, int value);

/* 填充矩阵 */
void matrix_fill(Matrix *m, int value);

/* 打印矩阵 */
void matrix_print(const Matrix *m);

#endif /* SAFE_2D_ARRAY_H */
```

```c
/* file: examples/safe_2d_array.c
 * standard: C11
 */
#include "safe_2d_array.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

bool matrix_create(Matrix *m, size_t rows, size_t cols) {
    if (!m || rows == 0 || cols == 0) return false;

    /* 分配连续内存：先分配行指针数组，再分配数据区 */
    int **data = malloc(rows * sizeof(int *));
    if (!data) return false;

    int *values = malloc(rows * cols * sizeof(int));
    if (!values) {
        free(data);
        return false;
    }

    /* 设置行指针指向数据区对应位置 */
    for (size_t i = 0; i < rows; i++) {
        data[i] = values + i * cols;
    }

    m->data = data;
    m->rows = rows;
    m->cols = cols;
    return true;
}

void matrix_destroy(Matrix *m) {
    if (!m || !m->data) return;
    /* 释放数据区（data[0] 指向数据区起始） */
    free(m->data[0]);
    /* 释放行指针数组 */
    free(m->data);
    m->data = NULL;
    m->rows = m->cols = 0;
}

int matrix_get(const Matrix *m, size_t i, size_t j, bool *ok) {
    if (!m || i >= m->rows || j >= m->cols) {
        if (ok) *ok = false;
        return 0;
    }
    if (ok) *ok = true;
    return m->data[i][j];
}

bool matrix_set(Matrix *m, size_t i, size_t j, int value) {
    if (!m || i >= m->rows || j >= m->cols) return false;
    m->data[i][j] = value;
    return true;
}

void matrix_fill(Matrix *m, int value) {
    if (!m || !m->data) return;
    /* 连续内存可一次 memset，比双重循环快 */
    memset(m->data[0], value, m->rows * m->cols * sizeof(int));
}

void matrix_print(const Matrix *m) {
    if (!m) return;
    for (size_t i = 0; i < m->rows; i++) {
        for (size_t j = 0; j < m->cols; j++) {
            printf("%4d ", m->data[i][j]);
        }
        printf("\n");
    }
}
```

### 5.5 CMake 构建配置

```cmake
# file: CMakeLists.txt
cmake_minimum_required(VERSION 3.16)
project(c_ptr_vs_array C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

add_compile_options(-Wall -Wextra -Wpedantic)

# 关键警告：数组参数退化诊断
if(CMAKE_C_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(
        -Warray-parameter
        -Wsizeof-array-argument
        -Wsizeof-pointer-div
        -Wstringop-overflow
    )
endif()

add_executable(ptr_arr_basics examples/ptr_arr_basics.c)
add_executable(multidim_array examples/multidim_array.c)
add_executable(param_decay examples/param_decay.c)

add_library(safe_2d_array STATIC examples/safe_2d_array.c)
target_include_directories(safe_2d_array PUBLIC examples)

add_executable(safe_2d_test examples/safe_2d_test.c)
target_link_libraries(safe_2d_test safe_2d_array)
```

### 5.6 Makefile 配置

```makefile
# file: Makefile
CC      ?= gcc
CFLAGS  ?= -std=c11 -Wall -Wextra -Wpedantic -Warray-parameter -O2
LDFLAGS ?=

BINS = ptr_arr_basics multidim_array param_decay safe_2d_test

all: $(BINS)

ptr_arr_basics: examples/ptr_arr_basics.c
	$(CC) $(CFLAGS) $< -o $@

multidim_array: examples/multidim_array.c
	$(CC) $(CFLAGS) $< -o $@

param_decay: examples/param_decay.c
	$(CC) $(CFLAGS) $< -o $@

safe_2d_test: examples/safe_2d_test.c examples/safe_2d_array.c examples/safe_2d_array.h
	$(CC) $(CFLAGS) examples/safe_2d_test.c examples/safe_2d_array.c -o $@

clean:
	rm -f $(BINS)

.PHONY: all clean
```

---

## 6. 对比分析

### 6.1 指针与数组核心差异表

| 维度 | 数组 `int arr[N]` | 指针 `int *ptr` |
| ---- | ----------------- | --------------- |
| 类型 | `int [N]` | `int *` |
| 存储类 | 静态/自动 | 自动/静态/动态 |
| 内存分配 | 编译期确定大小 | 运行时确定（指针变量本身固定） |
| 赋值 | 不可（非左值） | 可 |
| 自增 `++` | 不可 | 可 |
| `sizeof` | `N * sizeof(int)` | `sizeof(int *)`（通常 8） |
| `&` 类型 | `int (*)[N]` | `int **` |
| `&` 数值 | `&arr[0]` | `&ptr`（指针变量地址） |
| `+ 1` 增量 | `sizeof(int)` | `sizeof(int)` |
| 元素访问 | `arr[i]` | `ptr[i]` 或 `*(ptr + i)` |
| 函数参数退化 | 退化为 `int *` | 不变 |
| 生命周期 | 与作用域一致 | 取决于分配方式 |
| 内存连续性 | 保证 | 不保证（看指向对象） |
| 初始化 | `int arr[10] = {0}` | `int *ptr = NULL` 或 `malloc` |
| `const` 修饰 | `const int arr[N]` 元素只读 | `int *const ptr` 指针只读；`const int *ptr` 元素只读 |

### 6.2 与 C++ 对比

C++ 在 C 基础上扩展了指针与数组语义：

- **引用（reference）**：`int (&ref)[10] = arr` 直接引用数组，无退化。
- **`std::array<T, N>`**：封装固定大小数组，提供 `size()`、`begin()`、`end()` 等接口。
- **`std::vector<T>`**：动态数组，自动管理内存。
- **`std::span<T>`**（C++20）：非拥有数组视图，替代 `int *ptr, size_t n` 二元组。
- **范围 for 循环**：`for (int x : arr)` 直接遍历数组（仅当 `arr` 未退化）。
- **模板推导**：`template <size_t N> void f(int (&arr)[N])` 可在函数内获取数组大小。

C++ 的 `std::span` 是对 C"数组退化"问题的现代解决方案：

```cpp
void process(std::span<int> data) {
    for (int &x : data) { /* ... */ }
    size_t n = data.size();   // 保留大小信息
}
```

### 6.3 与 Rust 对比

Rust 严格区分数组与切片（slice）：

- **数组 `[T; N]`**：编译期固定大小，存储于栈。
- **切片 `&[T]`**：运行时大小的"胖指针"（fat pointer），包含指针 + 长度。
- **`Vec<T>`**：动态数组，堆分配。

```rust
fn process(arr: &[i32]) {       // 切片引用，等价于 C 的 int * + size_t
    for x in arr { /* ... */ }
    let n = arr.len();           // 长度信息保留
}

let arr: [i32; 10] = [0; 10];    // 数组
process(&arr);                   // 自动转换为切片
```

Rust 的"胖指针"模型避免了 C"数组退化"导致的大小信息丢失，是更安全的设计。

### 6.4 与 Go 对比

Go 的数组与切片语义清晰分离：

- **数组 `[N]T`**：值类型，按值传递（复制整个数组）。
- **切片 `[]T`**：引用类型，包含指针 + 长度 + 容量的"胖指针"。

```go
func process(arr [10]int) {      // 按值传递，复制数组
    _ = arr
}

func processSlice(s []int) {     // 切片，传递胖指针
    _ = s
    n := len(s)                  // 长度信息保留
}

arr := [10]int{}
process(arr)                     // 复制 40 字节
processSlice(arr[:])             // 传递胖指针，高效
```

Go 的设计避免了 C 的"退化"混淆，但要求开发者明确选择数组或切片。

### 6.5 与 Assembly 对比

汇编层面，数组与指针都是地址。区别在于：

- 数组：地址是固定的（编译期常量，如 `lea rax, [rip + arr]`）。
- 指针：地址存储于寄存器或内存，需 `mov rax, [rbp - 8]` 加载。

```asm
; 数组访问 arr[i] (i 在 edi)
lea   rax, [rip + arr]          ; arr 地址（编译期常量）
mov   eax, [rax + 4*rdi]        ; arr[i]

; 指针访问 ptr[i]
mov   rax, [rbp - 8]            ; 加载指针变量
mov   eax, [rax + 4*rdi]        ; ptr[i]
```

数组访问少一条 `mov` 指令（地址直接通过 `lea` 计算），但现代编译器优化后二者等价。

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：函数内 `sizeof` 数组参数

```c
/* BAD: 函数内 sizeof 得到指针大小，非数组大小 */
size_t array_length(int arr[]) {
    return sizeof(arr) / sizeof(arr[0]);  /* 8/4 = 2，错误！ */
}
```

**最佳实践**：显式传递长度：

```c
/* GOOD: 显式传递长度 */
void process(const int *arr, size_t n) {
    for (size_t i = 0; i < n; i++) {
        /* ... */
    }
}

/* 或使用宏（仅对真实数组有效） */
#define ARRAY_LEN(a) (sizeof(a) / sizeof((a)[0]))
```

### 7.2 陷阱：返回栈数组指针

```c
/* BAD: 返回栈数组指针，悬垂引用 */
int *get_array(void) {
    int arr[10] = {0};
    /* ... */
    return arr;   /* UB: 函数返回后栈数组失效 */
}
```

**最佳实践**：使用静态数组、堆分配或调用方传入缓冲区：

```c
/* GOOD 1: 静态数组（线程不安全） */
int *get_array(void) {
    static int arr[10] = {0};
    return arr;
}

/* GOOD 2: 调用方传入缓冲区 */
void fill_array(int *out, size_t n) {
    for (size_t i = 0; i < n; i++) {
        out[i] = i;
    }
}

/* GOOD 3: 堆分配 */
int *make_array(size_t n) {
    return malloc(n * sizeof(int));
}
```

### 7.3 陷阱：`int **` 与 `int (*)[N]` 混用

```c
/* BAD: int ** 与 int (*)[4] 类型不兼容 */
void process(int **matrix) { /* ... */ }

int main(void) {
    int m[3][4] = {0};
    process(m);   /* 警告/错误：类型不匹配 */
}
```

**最佳实践**：使用正确的数组指针类型：

```c
/* GOOD: 正确的数组指针类型 */
void process(int (*matrix)[4], int rows) { /* ... */ }

int main(void) {
    int m[3][4] = {0};
    process(m, 3);
}
```

### 7.4 陷阱：修改字符串字面量

```c
/* BAD: 修改字符串字面量，UB */
char *s = "hello";
s[0] = 'H';   /* UB: 字面量存储于只读段 */

/* GOOD: 使用数组初始化 */
char s[] = "hello";
s[0] = 'H';   /* 合法：s 是栈数组 */
```

### 7.5 陷阱：`i[p]` 奇技淫巧

```c
/* 合法但极易误读 */
int arr[10] = {0};
arr[5] = 42;
5[arr] = 42;   /* 等价，但应避免 */
```

C 标准 `a[b]` ≡ `*(a + b)` ≡ `*(b + a)` ≡ `b[a]`，但后者可读性极差，应避免。

### 7.6 陷阱：变长数组（VLA）栈溢出

```c
/* BAD: VLA 大小来自用户输入，可能栈溢出 */
void func(size_t n) {
    int arr[n];   /* 若 n 过大，栈溢出，UB */
    /* ... */
}
```

**最佳实践**：限制 VLA 大小或使用堆分配：

```c
/* GOOD: 检查大小并降级到堆 */
#define MAX_STACK_SIZE 65536

void func(size_t n) {
    if (n > MAX_STACK_SIZE / sizeof(int)) {
        /* 堆分配 */
        int *arr = malloc(n * sizeof(int));
        if (!arr) { /* 错误处理 */ }
        /* ... */
        free(arr);
    } else {
        int arr[n];   /* 栈分配，安全 */
        /* ... */
    }
}
```

### 7.7 陷阱：`restrict` 别名违反

```c
/* BAD: restrict 指针被别名访问，UB */
void add(int *restrict a, int *restrict b, int *restrict c, int n) {
    for (int i = 0; i < n; i++) {
        c[i] = a[i] + b[i];
    }
}

int main(void) {
    int x[10] = {0};
    add(x, x, x, 10);   /* UB: a/b/c 别名同一数组 */
}
```

`restrict` 是编译器优化提示，违反导致 UB。

### 7.8 陷阱：指针算术越过数组末尾 +1

```c
/* BAD: 越过 +1 哨兵位置 */
int arr[10];
int *p = &arr[11];   /* UB: 越过 +1 */

/* GOOD: 仅允许 &arr[10] 作为哨兵 */
int *end = &arr[10]; /* 合法 */
/* 但 *end UB */
```

### 7.9 最佳实践总结

1. **使用 `ARRAY_LEN` 宏计算数组长度，但仅对真实数组**。
2. **函数参数显式传递数组长度**，不依赖 `sizeof`。
3. **不返回栈数组指针**，使用静态/堆/输出参数。
4. **多维数组传递用 `int (*matrix)[N]`**，不用 `int **`。
5. **字符串字面量用 `const char *` 接收**，或用数组初始化可修改版本。
6. **VLA 限制大小**，或降级到堆分配。
7. **`restrict` 限定符需保证无别名**，否则 UB。
8. **指针算术仅在同一数组内**，越过 +1 哨兵 UB。

---

## 8. 工程实践

### 8.1 构建系统配置

启用关键警告：

```cmake
if(CMAKE_C_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(
        -Warray-parameter          # 函数参数数组大小不匹配
        -Wsizeof-array-argument    # sizeof 用于退化后的指针
        -Wsizeof-pointer-div       # sizeof 指针除法（常见 BUG）
        -Wstringop-overflow        # 字符串操作越界
        -Warray-bounds             # 数组越界静态检查
        -Wmaybe-uninitialized      # 可能未初始化
    )
endif()
```

### 8.2 静态分析

**clang-tidy 配置**：

```yaml
Checks: >
  -*,
  bugprone-*,
  cert-*,
  clang-analyzer-*,
  cppcoreguidelines-pro-bounds-array-to-pointer-decay,
  cppcoreguidelines-pro-bounds-pointer-arithmetic,
  performance-*
```

关键检查项：

- `cppcoreguidelines-pro-bounds-array-to-pointer-decay`：警告数组退化（C++ Core Guidelines）。
- `cppcoreguidelines-pro-bounds-pointer-arithmetic`：警告指针算术。
- `cert-arr39-c`：禁止在函数参数中使用 `[]` 语法（建议 `*` 显式）。

### 8.3 运行时检测

**ASan（AddressSanitizer）** 检测数组越界：

```bash
gcc -fsanitize=address -g arr_test.c -o arr_test
./arr_test
# 输出: ==12345==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x...
```

**UBSan** 检测指针算术 UB：

```bash
gcc -fsanitize=undefined -g ptr_test.c -o ptr_test
./ptr_test
```

### 8.4 调试工具

**GDB 检查数组与指针**：

```
(gdb) print arr
$1 = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
(gdb) print sizeof(arr)
$2 = 40
(gdb) print ptr
$3 = (int *) 0x7fffffffdf00
(gdb) print *ptr@10
$4 = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
```

**Valgrind Memcheck** 检测悬垂指针：

```bash
valgrind --tool=memcheck --track-origins=yes ./program
```

### 8.5 性能剖析

**perf** 检测缓存命中率（数组 vs 指针访问）：

```bash
perf stat -e cache-misses,cache-references ./program
```

**编译器优化报告**：

```bash
gcc -O3 -fopt-info-vec-optimized program.c
# 输出向量化信息，验证数组访问被向量化
```

### 8.6 CI/CD 集成

```yaml
# .github/workflows/ptr-array-check.yml
name: Pointer/Array Check
on: [push, pull_request]
jobs:
  static-analysis:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - name: clang-tidy
        run: |
          sudo apt install clang-tidy
          clang-tidy -checks='-*,cppcoreguidelines-pro-bounds-*,cert-arr39-c' src/*.c
      - name: ASan test
        run: |
          gcc -fsanitize=address,undefined -g src/*.c -o test
          ./test
```

---

## 9. 案例研究

### 9.1 Linux Kernel：`container_of` 宏

Linux Kernel 的 `container_of` 宏利用 `offsetof` 与指针算术实现"成员指针→容器指针"的转换：

```c
#define container_of(ptr, type, member) ({              \
    void *__mptr = (void *)(ptr);                       \
    ((type *)(__mptr - offsetof(type, member))); })
```

关键点：

- `ptr` 是 `type::member` 成员的指针。
- `offsetof(type, member)` 是成员在容器中的偏移量（依赖 struct 布局规则）。
- 减去偏移量得到容器对象指针。

这一模式广泛应用于内核链表、kfifo、waitqueue 等数据结构，是 C 指针与 struct 联合使用的典范。

### 9.2 glibc：`memcpy` 实现优化

glibc 的 `memcpy` 实现根据对齐与大小选择不同代码路径：

```c
void *memcpy(void *dest, const void *src, size_t n) {
    /* 检查对齐，选择 SIMD 向量化路径 */
    if ((uintptr_t)dest % 16 == 0 && (uintptr_t)src % 16 == 0 && n >= 64) {
        /* 使用 AVX/SSE 一次拷贝 16/32 字节 */
        return memcpy_avx(dest, src, n);
    }
    /* 标量路径 */
    /* ... */
}
```

数组与指针的差异在此被消解：底层都通过指针访问，对齐决定性能。

### 9.3 Redis：SDS 字符串

Redis 的 SDS（Simple Dynamic String）通过结构体封装 `char *` 与长度信息，避免 C 字符串的"指针无长度"问题：

```c
struct sdshdr {
    int len;       /* 字符串长度 */
    int free;      /* 剩余空间 */
    char buf[];    /* 灵活数组成员，存储实际字符串 */
};
```

`char buf[]` 是 C99 灵活数组成员（flexible array member），与 `char *buf` 不同：buf 与 len/free 在同一段连续内存中，缓存友好。

### 9.4 SQLite：varint 编码

SQLite 的 varint（变长整数）编码使用 `unsigned char *` 而非数组，以避免"数组退化"导致的长度丢失：

```c
static int sqlite3GetVarint(const unsigned char *p, u64 *v) {
    /* p 指向 varint 编码字节序列 */
    /* 通过字节最高位判断是否继续读取 */
    /* ... */
}
```

调用方需显式传递最大字节数，避免越界。

### 9.5 Nginx：内存池与数组

Nginx 内存池提供 `ngx_array_create` 创建动态数组：

```c
typedef struct {
    void        *elts;     /* 元素数据区 */
    ngx_uint_t   nelts;    /* 当前元素数 */
    size_t       size;     /* 每个元素大小 */
    ngx_uint_t   nalloc;   /* 容量 */
    ngx_pool_t  *pool;     /* 所属内存池 */
} ngx_array_t;
```

封装 `void *elts + size + nelts + nalloc` 三元组，保留完整数组信息，避免 C"退化"导致的大小丢失。

### 9.6 DPDK：`rte_memcpy` 优化

DPDK 的 `rte_memcpy` 针对网络数据包拷贝极致优化：

```c
static inline void *
rte_memcpy(void *dst, const void *src, size_t n) {
    /* 根据对齐与大小选择 AVX2/AVX-512 路径 */
    return rte_memcpy_generic(dst, src, n);
}
```

利用指针算术与对齐假设（`__builtin_assume_aligned`），实现 10Gbps+ 网络线速拷贝。

---

## 10. 习题

### 10.1 选择题

**题 1**：以下代码输出？

```c
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
printf("%zu %zu\n", sizeof(arr), sizeof(p));
```

A. 5 5  
B. 20 20  
C. 20 8  
D. 8 8

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：

- `sizeof(arr)`：arr 是真实数组，不退化，返回 `5 * sizeof(int)` = 20。
- `sizeof(p)`：p 是指针，返回 `sizeof(int *)` = 8（64 位系统）。

</details>

**题 2**：以下代码在 64 位 Linux x86_64 上的输出？

```c
int arr[10];
printf("%p %p %p\n", (void *)arr, (void *)&arr[0], (void *)&arr);
```

A. 三者地址值都相同  
B. `arr` 与 `&arr[0]` 相同，`&arr` 不同  
C. 三者都不同  
D. 编译错误

<details>
<summary>答案与解析</summary>

**答案**：A

**解析**：

- `arr` 退化为 `&arr[0]`，类型 `int *`，值为数组首元素地址。
- `&arr[0]` 显式取首元素地址，类型 `int *`，值同上。
- `&arr` 取数组地址，类型 `int (*)[10]`，值仍为数组首地址。

三者**数值相同**（都是数组起始地址），但**类型不同**。

</details>

**题 3**：以下哪个声明与 `int matrix[3][4]` 退化的函数参数等价？

```c
void f(int m[3][4]);   // A
void f(int m[][4]);    // B
void f(int (*m)[4]);   // C
void f(int **m);       // D
```

A. 仅 A  
B. A、B、C 等价  
C. A、B、C、D 都等价  
D. 仅 A、B 等价

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：

- A、B、C 完全等价，函数参数中第一维退化，类型均为 `int (*)[4]`。
- D 的类型是 `int **`（指向 `int *` 的指针），与 `int (*)[4]` 不兼容。`int[3][4]` 退化为 `int(*)[4]`，不是 `int**`。

这是 C 程序员最常犯的错误：误以为二维数组退化为"指针的指针"。

</details>

### 10.2 填空题

**题 4**：以下代码输出：

```c
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
printf("%d\n", 2[arr]);
```

输出是 _____。

<details>
<summary>答案与解析</summary>

**答案**：3

**解析**：

C 标准 `a[b]` ≡ `*(a + b)` ≡ `*(b + a)` ≡ `b[a]`。

`2[arr]` ≡ `*(2 + arr)` ≡ `arr[2]` = 3。

合法但应避免使用，可读性差。

</details>

**题 5**：以下代码 `sizeof(s)` 的值是 _____。

```c
char s[] = "hello";
printf("%zu\n", sizeof(s));
```

<details>
<summary>答案与解析</summary>

**答案**：6

**解析**：

`"hello"` 字面量类型为 `char [6]`（含 `\0`）。`char s[] = "hello"` 触发"字符串字面量初始化数组"的非退化例外，s 是 6 字节数组（含 `\0`），`sizeof(s)` = 6。

对比 `char *p = "hello";`，`sizeof(p)` = 8（指针大小）。

</details>

### 10.3 编程题

**题 6**：实现一个安全的 `array_foreach` 宏，遍历任意类型数组，对每个元素调用回调函数。要求：

- 不依赖具体元素类型。
- 编译期检查参数是否为数组（非指针）。
- 传递元素索引给回调。

<details>
<summary>参考答案</summary>

```c
#include <stddef.h>
#include <stdio.h>

/* 检查是否为数组类型（非指针） */
#define IS_ARRAY(x) _Generic((x), \
    int *: 0, \
    char *: 0, \
    default: 1)

/* foreach 宏 */
#define array_foreach(arr, n, cb) \
    do { \
        static_assert(IS_ARRAY(arr), "arr must be an array, not a pointer"); \
        for (size_t i = 0; i < n; i++) { \
            cb(arr[i], i); \
        } \
    } while (0)

/* 使用示例 */
void print_int(int x, size_t i) {
    printf("[%zu] = %d\n", i, x);
}

int main(void) {
    int arr[] = {10, 20, 30, 40, 50};
    size_t n = sizeof(arr) / sizeof(arr[0]);

    array_foreach(arr, n, print_int);

    /* 以下代码会编译错误（指针非数组） */
    /* int *p = arr; */
    /* array_foreach(p, n, print_int); */

    return 0;
}
```

</details>

**题 7**：给定函数 `void matrix_transpose(int (*dst)[N], int (*src)[M], int rows, int cols)`，实现矩阵转置。要求：

- 不使用 `int **`。
- 处理 M ≠ N 的情况。
- 使用 `_Static_assert` 验证编译期常量。

<details>
<summary>参考答案</summary>

```c
#include <stdio.h>
#include <stddef.h>

#define M 3
#define N 4

void matrix_transpose(int (*dst)[M], int (*src)[N], int rows, int cols) {
    /* dst 是 cols 行 M 列，src 是 rows 行 N 列 */
    /* 转置后：dst[i][j] = src[j][i] */
    for (int i = 0; i < cols; i++) {
        for (int j = 0; j < rows; j++) {
            dst[i][j] = src[j][i];
        }
    }
}

int main(void) {
    int src[M][N] = {
        {1, 2, 3, 4},
        {5, 6, 7, 8},
        {9, 10, 11, 12}
    };
    int dst[N][M];

    _Static_assert(M == 3, "M must be 3");
    _Static_assert(N == 4, "N must be 4");

    matrix_transpose(dst, src, M, N);

    printf("Transposed matrix (%d x %d):\n", N, M);
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < M; j++) {
            printf("%3d ", dst[i][j]);
        }
        printf("\n");
    }

    return 0;
}
```

</details>

### 10.4 思考题

**题 8**：为什么 C 标准规定函数参数中的数组类型自动退化为指针？请从历史、实现、性能三个角度分析。

<details>
<summary>参考答案</summary>

**历史角度**：

C 继承自 BCPL/B 语言，后者无类型系统，数组与指针本就等价。C 为兼容既有代码，保留这一语义。

**实现角度**：

1. 函数参数按值传递，若数组按值复制，开销过大（可能数 KB）。
2. 早期链接器无法跨翻译单元传递数组大小信息，退化使函数签名固定为指针，简化 ABI。
3. PDP-11 内存模型中，数组与指针都通过地址访问，区分意义不大。

**性能角度**：

1. 按指针传递只需 4/8 字节，远快于复制整个数组。
2. 调用约定统一，编译器无需为不同大小数组生成不同 prologue。
3. 寄存器传递指针（如 System V AMD64 ABI 用 rdi/rsi 传递前两个指针参数），高效。

**代价**：

1. 函数内丢失数组大小信息，需显式传递 `size_t n`。
2. 类型安全性降低，`int arr[10]` 与 `int arr[5]` 退化为同类型 `int *`，无法编译期区分。

这是 C 语言"接近硬件"哲学的典型权衡：以类型安全换取性能与实现简洁。

</details>

**题 9**：`int arr[N]` 在栈上分配与 `int *p = malloc(N * sizeof(int))` 在堆上分配，在内存布局、生命周期、性能、安全性上有何异同？

<details>
<summary>参考答案</summary>

**相同点**：

- 都是连续内存，元素访问 `arr[i]` 与 `p[i]` 等价。
- 都支持指针算术遍历。
- 都满足 `alignof(int)` = 4 对齐。

**不同点**：

| 维度 | 栈数组 `int arr[N]` | 堆指针 `int *p = malloc(...)` |
| ---- | ------------------- | ----------------------------- |
| 内存位置 | 栈区（自动存储期） | 堆区（动态存储期） |
| 分配时机 | 编译期确定大小（除 VLA），函数进入时分配 | 运行时 `malloc` 调用时分配 |
| 释放时机 | 函数退出自动释放 | 需显式 `free`，否则内存泄漏 |
| 大小限制 | 受栈大小限制（典型 1-8MB） | 受堆大小限制（可达 GB） |
| 性能 | 分配极快（仅 SP 移动） | 分配较慢（系统调用 + 元数据维护） |
| 缓存局部性 | 与栈上其他变量同区域，缓存友好 | 堆分配可能分散，缓存局部性较差 |
| 线程安全 | 栈是线程私有，天然安全 | 需同步保护 |
| 错误处理 | 大小过大触发栈溢出（SIGSEGV） | `malloc` 失败返回 NULL |
| 生命周期 | 限于函数作用域 | 由程序员控制 |
| 重新分配 | 不支持 | `realloc` 可调整大小 |
| `sizeof` | 编译期常量 `N * sizeof(int)` | 运行时 `N * sizeof(int)`，`sizeof(p)` = 8 |

**使用建议**：

- 小数组（< 几 KB）、生命周期限于函数内：用栈数组。
- 大数组、跨函数传递、动态调整大小：用 `malloc`。
- 嵌入式系统：优先栈数组（无 `malloc` 开销），但注意栈溢出。

</details>

**题 10**：C++ 的 `std::span<T>`（C++20）如何解决 C"数组退化"导致的大小丢失问题？请对比设计哲学。

<details>
<summary>参考答案</summary>

**`std::span<T>` 设计**：

```cpp
#include <span>

void process(std::span<int> data) {
    for (int &x : data) { /* ... */ }
    size_t n = data.size();   // 大小信息保留
    int *ptr = data.data();   // 底层指针
}

int arr[10] = {0};
process(arr);   // 自动构造 span<int>，保留大小信息
process({arr, 10});   // 显式构造
```

`std::span` 是"胖指针"（fat pointer），内部存储 `T *ptr + size_t size`，二元组完整保留数组信息。

**对比 C 的"退化"机制**：

| 维度 | C 数组退化 | C++ std::span |
| ---- | ---------- | ------------- |
| 大小信息 | 丢失 | 保留 |
| 类型安全 | 弱（指针无大小） | 强（编译期类型检查） |
| 函数签名 | `void f(int *arr, size_t n)` | `void f(std::span<int> arr)` |
| 调用方式 | 需显式传递长度 | 自动从数组构造 |
| 范围迭代 | 不支持（需手动） | 支持 `for (auto &x : span)` |
| 越界检查 | 无（需手动） | `at()` 提供（`operator[]` 无） |
| 性能 | 优（仅指针） | 优（胖指针，2 个寄存器） |
| 兼容性 | C/C++ 通用 | 仅 C++20+ |

**设计哲学对比**：

- **C**：性能优先，程序员负责安全。"退化"机制简化 ABI，提升性能，代价是大小信息丢失。
- **C++**：安全与性能并重。`std::span` 通过"胖指针"在不牺牲性能的前提下保留信息，是现代 C++ 对 C"退化"问题的回答。

C 程序员可通过 struct 封装模拟 `std::span`：

```c
typedef struct {
    int *data;
    size_t size;
} IntSpan;

void process(IntSpan span) {
    for (size_t i = 0; i < span.size; i++) {
        /* ... */
    }
}
```

但 C 缺乏自动构造与范围迭代，使用体验不如 C++ `std::span`。

</details>

---

## 11. 参考文献

### 11.1 标准文档

[1] International Organization for Standardization. *ISO/IEC 9899:2024 Information technology — Programming languages — C* (Fifth edition) [Standard]. Geneva: ISO; 2024. Available from: https://www.iso.org/standard/82075.html

[2] International Organization for Standardization. *ISO/IEC 9899:2011 Information technology — Programming languages — C* (Third edition) [Standard]. Geneva: ISO; 2011. Available from: https://www.iso.org/standard/57853.html DOI: 10.3403/02151494U

[3] American National Standards Institute. *ANSI X3.159-1989 Programming Language C* [Standard]. New York: ANSI; 1989.

### 11.2 学术论文与技术报告

[4] Ritchie DM. *The Development of the C Language* [conference paper]. In: Proceedings of the 2nd ACM SIGPLAN Conference on History of Programming Languages (HOPL II); 1993 Apr 20-23; Cambridge, MA. New York: ACM; 1993. p. 201-208. DOI: 10.1145/154766.155580

[5] Kernighan BW, Ritchie DM. *The C Programming Language* 2nd ed. Englewood Cliffs (NJ): Prentice Hall; 1988. ISBN: 978-0131103627

[6] Seacord RC. *Effective C: An Introduction to Professional C Programming* 1st ed. San Francisco: No Starch Press; 2020. ISBN: 978-1718501041

[7] Alexandrescu A. *Generic: Change the Way You Write C++ Code* [journal article]. C/C++ Users Journal. 2001;19(10):12-21.

[8] Stroustrup B. *The C++ Programming Language* 4th ed. Boston: Addison-Wesley; 2013. ISBN: 978-0321563842

[9] Merry M, Du Toit J. *C++ Core Guidelines: Bounds Safety* [Internet]. ISO C++ Foundation; [cited 2026 Jul 21]. Available from: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#SS-bounds

### 11.3 ABI 规范

[10] System V Application Binary Interface AMD64 Architecture Processor Supplement (Draft Version 1.0) [Internet]. [cited 2026 Jul 21]. Available from: https://gitlab.com/x86-psABIs/x86-64-ABI

[11] Itanium C++ ABI [Internet]. Itanium ABI Committee; [cited 2026 Jul 21]. Available from: https://itanium-cxx-abi.github.io/cxx-abi/abi.html

### 11.4 编译器文档

[12] Free Software Foundation. *GCC Manual: Warning Options* [Internet]. GCC; [cited 2026 Jul 21]. Available from: https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html

[13] LLVM Project. *Clang Compiler User's Manual: Diagnostics* [Internet]. LLVM; [cited 2026 Jul 21]. Available from: https://clang.llvm.org/docs/UsersManual.html#diagnostics

### 11.5 经典教材

[14] Bryant RE, O'Hallaron DR. *Computer Systems: A Programmer's Perspective* 3rd ed. Boston: Pearson; 2015. ISBN: 978-0134092669

[15] Prinz P, Crawford T. *C in a Nutshell* 2nd ed. Sebastopol (CA): O'Reilly Media; 2015. ISBN: 978-1491904441

[16] Klemens B. *21st Century C* 2nd ed. Sebastopol (CA): O'Reilly Media; 2014. ISBN: 978-1491904441

[17] King KN. *C Programming: A Modern Approach* 2nd ed. New York: W.W. Norton & Company; 2008. ISBN: 978-0393979503

---

## 12. 延伸阅读

### 12.1 书籍

- **《The C Programming Language》** Brian W. Kernighan, Dennis M. Ritchie 著。第 5 章"Pointers and Arrays"是 C 指针与数组语义的权威论述，必读。
- **《Computer Systems: A Programmer's Perspective（CSAPP）》** Randal E. Bryant, David R. O'Hallaron 著。第 3 章机器级表示讲解数组与指针的汇编实现。
- **《Effective C》** Robert C. Seacord 著。第 6 章"Pointers and Arrays"系统讨论二者差异与陷阱。
- **《C in a Nutshell》** Peter Prinz, Tony Crawford 著。第 4 章"Type Conversions"与第 9 章"Pointers"详细讲解。
- **《Expert C Programming: Deep C Secrets》** Peter van der Linden 著。第 3 章"Unscrambling Declarations in C"讲解复杂声明的解析。

### 12.2 在线课程

- **MIT 6.087 Practical Programming in C**（MIT OpenCourseWare）：Lecture 4 详细讲解指针与数组。
  - https://ocw.mit.edu/courses/6-087-practical-programming-in-c-january-iap-2010/

- **Stanford CS107 Programming Paradigms**：Lecture 5-7 讲解 C 内存模型与指针。
  - https://web.stanford.edu/class/cs107/

- **CMU 15-213 CSAPP**：Lecture 6 "Machine-Level Programming II" 涉及数组与指针的汇编实现。
  - http://www.cs.cmu.edu/~213/

- **Harvard CS50 Introduction to Computer Science**：Week 4 讲解指针与内存。
  - https://cs50.harvard.edu/

### 12.3 在线资源

- **cppreference.com "Arrays" 词条**：标准数组特性的权威参考。
  - https://en.cppreference.com/w/c/language/array

- **c-faq.com "Pointers and Arrays"**：comp.lang.c FAQ，详尽解答常见问题。
  - https://c-faq.com/aryptr/index.html

- **"The Development of the C Language"**（Dennis Ritchie）：C 语言设计者亲述历史。
  - https://www.bell-labs.com/usr/dmr/www/chist.html

- **"A Tutorial on Pointers and Arrays in C"**（Ted Jensen）：经典指针教程。
  - https://web.cs.wpi.edu/~cs2302/c07/reading/C-Pointers.pdf

- **"C Arrays and Pointers: A Different Perspective"**（N1169）：C 标准委员会提案。
  - http://www.open-std.org/jtc1/sc22/wg14/www/docs/n1169.pdf

### 12.4 开源项目学习

- **Linux Kernel**：`include/linux/list.h`、`include/linux/kernel.h`（`container_of` 宏）、`lib/` 大量使用指针与数组。
  - https://github.com/torvalds/linux

- **glibc**：`string/memcpy.c`、`string/strlen.c` 等展示生产级指针操作。
  - https://www.gnu.org/software/libc/

- **Redis**：`src/sds.c` 展示 SDS 字符串封装 `char *` 的设计。
  - https://github.com/redis/redis

- **SQLite**：`src/util.c` 的 varint 实现展示安全指针操作。
  - https://www.sqlite.org/

- **Nginx**：`src/core/ngx_array.c` 展示动态数组封装。
  - https://nginx.org/

### 12.5 工具

- **cdecl.org**：将 C 声明翻译为英语，辅助理解复杂指针声明。
  - https://cdecl.org/

- **clang -Warray-parameter / gcc -Wsizeof-array-argument**：编译时诊断数组退化。

- **ASan / UBSan**：运行时检测越界与 UB。

- **Valgrind Memcheck**：检测悬垂指针与内存泄漏。

- **GDB `print *ptr@N`**：打印指针指向的 N 个元素。

---

## 附录 A：术语表

| 术语 | 英文 | 含义 |
| ---- | ---- | ---- |
| 数组退化 | array-to-pointer decay | 数组在大多数表达式中自动转换为指向首元素的指针 |
| 非退化上下文 | non-decay context | `sizeof`、`&` 等不触发退化的运算符上下文 |
| 数组指针 | pointer to array | `int (*)[N]`，指向整个数组的指针 |
| 指针数组 | array of pointers | `int *[N]`，由 N 个指针组成的数组 |
| 胖指针 | fat pointer | 携带大小/容量信息的指针，如 Rust 切片、Go 切片 |
| 灵活数组成员 | flexible array member (FAM) | C99 起 struct 末尾的 `T arr[]`，无固定大小 |
| 变长数组 | variable-length array (VLA) | C99 引入，运行时确定大小的栈数组 |
| 复合字面量 | compound literal | C99 引入的匿名数组/对象字面量 |
| 哨兵位置 | one-past-the-end | `&arr[N]` 合法但解引用 UB |
| 退化规则 | decay rule | C89 §6.2.2.1 形式化的数组退化规则 |
| 螺旋法则 | spiral rule | 解析 C 复杂声明的螺旋阅读法 |
| restrict 限定符 | restrict qualifier | C99 引入，提示编译器无别名 |
| 字符串字面量 | string literal | `"hello"` 类型 `char [N+1]`，存储于只读段 |
| 左值 | lvalue | 可被赋值的表达式，数组名不是左值 |
| UB | undefined behavior | 未定义行为 |

## 附录 B：常见声明解析速查

### B.1 简单声明

```c
int p;              /* p is int */
int *p;             /* p is pointer to int */
int p[10];          /* p is array of 10 int */
int *p[10];         /* p is array of 10 pointer to int */
int (*p)[10];       /* p is pointer to array of 10 int */
int **p;            /* p is pointer to pointer to int */
```

### B.2 函数指针

```c
int (*f)(void);             /* f is pointer to function returning int */
int (*f[10])(void);         /* f is array of 10 function pointers */
int (*(*f)(void))[10];      /* f is pointer to function returning
                               pointer to array of 10 int */
```

### B.3 多维数组

```c
int m[3][4];                /* m is 3x4 array of int */
int (*m)[4];                /* m is pointer to array of 4 int */
int *m[3];                  /* m is array of 3 pointer to int */
int **m;                    /* m is pointer to pointer to int */
int (*m[3])[4];             /* m is array of 3 pointer to array of 4 int */
```

### B.4 解析螺旋法则

```
int (*(*f)(void))[10];

从 f 开始，顺时针螺旋阅读：
1. f is...
2. ( * ) pointer to...
3. ( )(void) function taking void returning...
4. ( * ) pointer to...
5. [10] array of 10...
6. int int

结果：f is pointer to function(void) returning pointer to array of 10 int
```

## 附录 C：数组与指针速查表

### C.1 关键差异速查

| 表达式 | `int arr[10]` | `int *ptr = arr` |
| ------ | ------------- | ----------------- |
| `sizeof` | 40 | 8 |
| `&` 类型 | `int (*)[10]` | `int **` |
| `+ 1` 步长 | 4 字节 | 4 字节 |
| 可赋值 | 否 | 是 |
| 可自增 | 否 | 是 |
| 函数参数类型 | 退化为 `int *` | `int *` |
| 生命周期 | 自动（栈） | 自动（指针变量） |
| 元素数获取 | `sizeof(arr)/sizeof(arr[0])` | 需显式传递 |

### C.2 函数参数等价形式

| 声明 | 实际类型 |
| ---- | -------- |
| `void f(int arr[10])` | `void f(int *arr)` |
| `void f(int arr[])` | `void f(int *arr)` |
| `void f(int arr[static 10])` | `void f(int *arr)`（提示至少 10 元素） |
| `void f(int arr[const 10])` | `void f(int *const arr)` |
| `void f(int matrix[3][4])` | `void f(int (*matrix)[4])` |
| `void f(int matrix[][4])` | `void f(int (*matrix)[4])` |
| `void f(int *matrix[4])` | `void f(int **matrix)` |
| `void f(int **matrix)` | `void f(int **matrix)` |

### C.3 多维数组遍历模式

```c
/* 静态二维数组 */
int m[3][4];
for (int i = 0; i < 3; i++)
    for (int j = 0; j < 4; j++)
        m[i][j] = i * 4 + j;

/* 函数参数 */
void process(int (*m)[4], int rows) {
    for (int i = 0; i < rows; i++)
        for (int j = 0; j < 4; j++)
            /* ... */;
}

/* 动态分配（连续内存） */
int **alloc_matrix(int rows, int cols) {
    int **m = malloc(rows * sizeof(int *));
    int *data = malloc(rows * cols * sizeof(int));
    for (int i = 0; i < rows; i++)
        m[i] = data + i * cols;
    return m;
}
```

## 附录 D：标准演化时间线

```
1967  BCPL（Martin Richards）
  │   - 无类型，数组与指针等价
  │
1969  B（Ken Thompson）
  │   - 继承 BCPL 语义
  │
1972  C（Dennis Ritchie）
  │   - 引入类型系统
  │   - 保留"数组退化"机制
  │
1978  K&R C
  │   - 形式化数组退化规则
  │   - 例外清单：sizeof、&、字符串字面量初始化
  │
1989  C89
  │   - 标准化数组退化（§6.2.2.1）
  │   - 多维数组递归布局规则
  │
1999  C99
  │   - 变长数组（VLA）
  │   - 复合字面量
  │   - 灵活数组成员（FAM）
  │   - restrict 限定符
  │   - static 修饰数组参数
  │
2011  C11
  │   - VLA 可选化
  │   - _Generic 类型推导
  │   - 匿名结构体/联合
  │
2024  C23
      - typeof 关键字（非退化上下文）
      - [[...]] 标准属性
      - 空数组语义澄清
```

## 附录 E：编译器警告速查

| 警告选项 | GCC | Clang | 含义 |
| -------- | --- | ----- | ---- |
| `-Warray-parameter` | 13+ | 6+ | 函数参数数组大小不匹配 |
| `-Wsizeof-array-argument` | 是 | 是 | sizeof 用于退化后的指针 |
| `-Wsizeof-pointer-div` | 是 | 是 | sizeof 指针除法（常见 BUG） |
| `-Wstringop-overflow` | 是 | 是 | 字符串操作越界 |
| `-Warray-bounds` | 是 | 是 | 数组越界静态检查 |
| `-Wmaybe-uninitialized` | 是 | 是 | 可能未初始化 |
| `-Wdangling-pointer` | 12+ | 是 | 悬垂指针 |
| `-Wdangling-gsl` | 否 | 是 | GSL 视角悬垂指针 |

---

## 结语

指针与数组的关系是 C 语言设计的核心议题，也是初学者最易混淆、资深程序员最易踩坑的领域。理解"数组退化"机制及其例外清单，是掌握 C 内存模型的关键一步。

从 1967 年 BCPL 的"无类型数组即指针"，到 2024 年 C23 的 `typeof` 保留数组类型，再到 C++20 `std::span` 的"胖指针"重设计，这一议题经历了近六十年的演化。在 C 中，程序员必须时刻警惕"退化"导致的大小信息丢失、类型差异、悬垂指针等问题；在现代语言（Rust、Go、Swift）中，编译器通过"胖指针"或值类型数组从源头避免这些问题。

掌握 C 指针与数组的差异，不仅是编写正确 C 代码的前提，更是理解现代语言内存模型设计动机的基础。在系统编程、嵌入式开发、性能优化等领域，C 仍然是不可替代的工具，而对指针与数组语义的深刻理解，是成为优秀 C 程序员的必经之路。

> "C makes it easy to shoot yourself in the foot; C++ makes it harder, but when you do it blows your whole leg off."
> —— Bjarne Stroustrup

> "In C, the distinction between pointers and arrays is subtle enough to be missed, yet important enough to be mastered."
> —— Anonymous

---

*文档版本：v2.0*
*最后更新：2026-06-14*
*维护者：fanquanpp*
