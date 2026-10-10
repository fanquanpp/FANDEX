---
order: 340
title: 内联函数与宏：展开的艺术与代价
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 用 MAX(i++, j++) 算出两个答案的事故开场：objdump 亲眼看内联前后的机器码、inline 只是建议而优化等级才是开关、C99 inline 三形式的链接语义与 undefined reference 与 multiple definition 两宗实录、static inline 为何是头文件函数的默认答案、宏与内联函数的工程决策对照表与内核编码规范的准则出处、代码膨胀与递归的代价。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/290-PreprocessorMacro'
  - 'c/280-GenericSelection'
  - 'c/470-BuildSystem'
  - 'c/540-AttributeCompilerExtension'
prerequisites:
  - 'c/090-FunctionDetailed'
  - 'c/050-VariableConstant'
---

## 前置知识

- 已完成 [函数](/c/090-FunctionDetailed)：会写声明、定义与调用，知道函数参数按值传递；
- 已完成 [变量与常量](/c/050-VariableConstant)：知道 `static` 修改变量的存储期与作用域——本文把它用在函数上。

宏的语法基本功（`#define`、参数替换、多次求值陷阱）建议先读 [预处理器与宏](/c/290-PreprocessorMacro)，没读过也能往下，涉及处会带一句。

> 分工说明：C 模块里与「宏」相关的内容拆成三篇。[预处理器与宏](/c/290-PreprocessorMacro) 讲宏本体：指令、展开规则、条件编译、五条军规与事故家族——本文不再重复任何宏语法；本篇只回答两个问题：`inline` 关键字到底管理什么（链接语义三细节），以及同一个需求「用宏还是用 inline 函数」的工程决策；类型分派的泛型宏在 [泛型选择](/c/280-GenericSelection)。三篇互为地基，示例不重复。

## 学习目标

读完本文你将能够：

1. 用 objdump 对比 `-O0` 与 `-O2` 下同一函数的机器码，指出内联展开前后 `call` 指令的消失；
2. 解释「inline 只是建议，编译器有自主权」，说出 `-O2` 为什么会内联一个没标 inline 的小函数；
3. 读懂 `undefined reference` 与 `multiple definition` 两类链接报错，把它们归因到 C99 inline 的外部定义规则（或 GNU89 的相反语义）；
4. 用一张对照表做「用宏还是用 inline 函数」的工程决策，并说出宏不可替代的三件事；
5. 说清内联的代价（代码膨胀、指令缓存压力、递归不可内联），避免「到处加 inline」的反模式。

预计 45 到 60 分钟，含 3 组动手实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：同一个 MAX，算出两个答案

先看一段看起来人畜无害的代码：

```c
/* max_bug.c：宏版 MAX 与函数版 max，答案居然不同
 * gcc -Wall -Wextra -g max_bug.c -o max_bug
 */
#include <stdio.h>

#define MAX(a, b) ((a) > (b) ? (a) : (b))

static int max(int a, int b) { return a > b ? a : b; }

int main(void) {
    int i = 3, j = 8;
    int m1 = MAX(i++, j++);

    int i2 = 3, j2 = 8;
    int m2 = max(i2++, j2++);

    printf("macro   : m=%d i=%d j=%d\n", m1, i, j);
    printf("function: m=%d i=%d j=%d\n", m2, i2, j2);
    return 0;
}
```

预期输出：

```text
macro   : m=9 i=4 j=10
function: m=8 i=4 j=9
```

宏版不仅 `j` 被加了两次，连最大值都算错了：3 和 8 的最大值是 8，它报 9。更阴险的是编译器**一个警告都没给**——这不是 [预处理器与宏](/c/290-PreprocessorMacro) 里 `SQUARE(i++)` 那种未定义行为，而是一段完全合法、结果却悄悄不对的代码（第 6 节逐行拆解）。函数版为什么安全？因为函数参数**先求值一次再传递**。既然函数这么规矩，为什么内核和库里还遍地是宏？因为函数调用有成本——压参数、跳转、保存返回地址、返回。为消除这份成本，C99 引入了 `inline`：让编译器把函数体**抄到调用处**，既保住函数的类型安全，又免掉调用开销。这条路线的每个环节都有代价和陷阱，本文逐一过手。

## 2. 内联是什么：在调用处展开的优化请求

### 2.1 心智模型：抄函数体，省调用

函数调用每一步都有价钱：实参压栈或装寄存器、跳转到函数入口、保存与恢复现场、跳回来。所谓**内联展开（inline expansion）**，就是编译器把函数体直接抄进调用点，这些价钱全免，变量还能共用寄存器、常量还能直接折叠。

关键认知一：**`inline` 是一个建议，不是命令**。写了 inline 编译器可以不内联；没写 inline，编译器优化等级够高时照样内联。真正决定内联与否的是优化等级和编译器的启发式判断——函数大小、调用频率、寄存器压力。`inline` 关键字真正管理的东西其实是链接语义（第 3 节），这是它与 C++ 直觉最大的分歧点。

关键认知二：这套决策对你是透明的，但**肉眼可见**。反汇编就是证据：

```c
/* warm.c：一个普通的小函数，注意它没写 inline
 * gcc -Wall -Wextra -g warm.c -o warm
 */
#include <stdio.h>

static int square(int x) { return x * x; }

int main(void) {
    int acc = 0;
    for (int i = 0; i < 4; i++) {
        acc += square(i);
    }
    printf("%d\n", acc);
    return 0;
}
```

### 2.2 实验：objdump 里看 call 的消失

```bash
gcc -Wall -Wextra -g -O0 warm.c -o warm_O0
gcc -Wall -Wextra -g -O2 warm.c -o warm_O2
objdump -d warm_O0 | grep -c "call.*<square>"
objdump -d warm_O2 | grep -c "call.*<square>"
```

预期输出：

```text
1
0
```

`-O0` 下 main 里有一条 `call <square>`：老老实实调用。`-O2` 下计数为 0——调用消失了，函数体被展开进循环，`x * x` 在编译期折成常数表，static 函数本体也因无人再引用而被整体删除。（Windows/MinGW 的 objdump 同样可用。）回想 warm.c：square **没写 inline**，`-O2` 照样展开它。

修改实验一：给 square 的函数体塞进几百行无用运算再测。`-O2` 的计数会变回 1——函数太大，展开的代价超过省下的调用开销，编译器拒绝内联。这就是「编译器自主权」的现场：它比你的直觉更会算账。

修改实验二：给 square 加上 `inline`（写成 `static inline int square(...)`），用 `-O0` 重编译。计数仍是 1——`-O0` 下内联完全关闭，inline 关键字没有改变任何机器码。「内联与否」的开关是优化等级，这一点在 [构建系统](/c/470-BuildSystem) 的优化选项里有系统交代。

## 3. C99 inline 的三细节与 static inline 的推荐

### 3.1 三种写法，一张表

`inline` 关键字真正管的是**链接语义**：这个函数的定义要不要生成外部符号、能放在头文件里吗。C99（6.7.4）把写法分成三类：

| 写法 | 语义 | 生成外部符号吗 | 典型用途 |
| --- | --- | --- | --- |
| `static inline` | 内部链接，每个翻译单元一份独立副本 | 否（每 TU 各有内部副本） | 头文件小工具函数，**默认选它** |
| `inline`（无 static） | 「内联定义」，不构成外部定义 | 否 | 头文件提供内联定义 + 某个 .c 补外部定义 |
| `extern inline` 声明 | 命令本翻译单元提供外部定义 | 是 | 搭配上一行，在恰好一个 .c 里出现 |

细节一：头文件里写不带 static 的 `inline`，得到的是**内联定义（inline definition）**——它只管内联用，不算数：不生成任何外部符号。细节二：于是规则来了——**必须恰好有一个翻译单元为它提供外部定义**，办法是在某个 .c 里写一行 `extern inline` 声明（或干脆给一个不带 inline 的定义）。细节三：这条规则与 GNU89 时代的语义**正好相反**——老标准里裸 `inline` 才发外部符号、`extern inline` 反而不发，GCC 在 `-std=gnu89` 下仍遵循旧语义。三细节背不动就记住一条：**头文件里的函数一律写 `static inline`**，两种语义规则就都与你无关。

### 3.2 实录：违反规则的两种死法

复现细节二的代价。三个文件，头文件用不带 static 的 `inline`：

```c
/* sq.h */
inline int sq(int x) { return x * x; }
```

```c
/* main_a.c */
#include <stdio.h>
#include "sq.h"

int main(void) {
    printf("%d\n", sq(5));
    return 0;
}
```

```c
/* util_a.c */
#include "sq.h"

int keep_alive(void) { return sq(2) + 1; }
```

```bash
gcc -std=c17 -Wall -Wextra -g main_a.c util_a.c -o prog_a
```

预期报错（现代 GCC 默认 gnu17 及以上，即 C99 语义）：

```text
/usr/bin/ld: /tmp/ccXXXXXX.o: in function `main':
main_a.c:(.text+0x...): undefined reference to `sq'
collect2: error: ld returned 1 exit status
```

逐行读：`ld` 点名是**链接阶段**出事；`undefined reference to 'sq'` 是说有人调用 sq（main_a.c），但全工程没有任何一个目标文件交出 sq 的外部符号——两个 .c 里的 sq 都是只管内联的「内联定义」，谁也没义务生成实体。修复：在**恰好一个** .c 里补一行外部定义声明：

```c
/* sq_impl.c：唯一的外部定义，sq 从此有实体 */
extern inline int sq(int x);
```

同一份代码换到老语义下，死法反过来：

```bash
gcc -std=gnu89 -Wall -Wextra -g main_a.c util_a.c -o prog_b
```

```text
/usr/bin/ld: /tmp/ccYYYYYY.o: in function `keep_alive':
util_a.c:(.text+0x...): multiple definition of `sq';
/tmp/ccXXXXXX.o:main_a.c:(.text+0x...): first defined here
collect2: error: ld returned 1 exit status
```

GNU89 语义里裸 `inline` 会在**每个包含它的翻译单元**各发一份外部定义，两个 .c 各交一个 sq，链接器拒绝二选一。同一份头文件，两套标准语义，两种死法——而 `static inline` 一种写法同时避开两者：内部链接，每个翻译单元有自己的副本，既不缺符号也不冲突。修改实验三：把 sq.h 改成 `static inline`，分别在 `-std=c17` 与 `-std=gnu89` 下重编译，两个工程都安静通过。

顺带两句边界情况。其一，GCC/Clang 提供 `__attribute__((always_inline))` 强制内联（扩展，强制失败会直接编译报错），MSVC 对应 `__forceinline`；其二，MSVC 的 C 模式对 inline 的解释接近 C++（允许多重定义、链接器合并），又是一种方言——跨平台库几乎都收敛到 `static inline` 来回避全部分歧，编译器扩展的全景见 [编译器扩展与属性](/c/540-AttributeCompilerExtension)。

## 4. 宏 vs 内联函数：一张表定工程决策

第 1 节的事故、第 2 节的展开、第 3 节的语义，现在汇成一张决策表：

| 维度 | 函数式宏 | static inline 函数 |
| --- | --- | --- |
| 类型检查 | 无（纯文本替换，任何类型都展开） | 有（参数类型不符即警告/报错） |
| 参数求值次数 | 每次出现都求值（MAX(i++, j++) 事故） | 恰好一次 |
| 调试 | 展开后消失，断点进不去、看不了变量 | 有符号信息，可单步 |
| 取地址 | 不可以 | 可以（可进函数指针表，见 [跳转表](/c/180-FunctionPointerCallbackJumpTable)） |
| 作用域 | 从定义行到文件尾，无作用域概念 | 遵循 C 作用域规则，static 限内部链接 |
| 编译错误信息 | 指向展开后的代码，难读 | 指向源码，直接可修 |
| 代码膨胀 | 完全失控（每处调用抄一份） | 编译器按启发式把关（第 5 节） |
| `#` 字符串化 / `##` 记号拼接 | **独有能力** | 做不到 |
| 编译期常量探测特化 | 可做（glibc 用 `__builtin_constant_p` 让常量参数走编译期版本） | 做不到 |
| 操作「参数作为左值」 | 可做（如交换宏） | 做不到（函数拿到的是值） |

工程准则一句话：**能写成函数的，写成 `static inline`；宏只留给函数做不到的事。** 这不是本库的私见——Linux 内核编码规范第 12 章原话：「Generally, inline functions are preferable to macros resembling functions」（形似函数的宏，通常应换成内联函数），理由正是表格前两行：宏不做类型检查、参数会被多次求值。

宏不可替代的三件事，各自记一个代表：

1. **`#` 与 `##`**：字符串化与记号拼接是代码生成的地基，X-Macro 全靠它（机制与完整示例在 [预处理器与宏](/c/290-PreprocessorMacro)）；
2. **编译期特化**：glibc 曾用宏探测「参数是不是编译期常量」，常量走常量折叠版、变量走函数版——函数无论如何分不出这个；
3. **跨类型代码生成**：`DEFINE_VEC(int)` 一行生成一套类型安全的容器代码，宏的文本能力无可替代；而「按已有类型挑选函数」这类需求，C11 之后交给 [泛型选择](/c/280-GenericSelection) 的 `_Generic` 更安全。

决策清单按顺序过：需要 `#`/`##`/编译期探测或参数当左值，用宏，且过 290 篇的五问军规；需要按类型分派，用 `_Generic` + `static inline` 函数族；其余一律 `static inline` 函数。

## 5. 内联的代价：膨胀与缓存

内联不是免费的胜利，账要从两头算：

- **代码膨胀**：10 处调用展开一个 20 条指令的函数，就是凭空多写约 200 条指令。嵌入式与固件对体积敏感，膨胀直接顶到预算；
- **指令缓存压力**：CPU 按缓存行取指令。热循环里被塞进大段重复代码，反而把真正的热点挤出 L1 指令缓存，命中率下降，速度变慢——省下的调用开销（几周期）抵不过一次缓存未命中（几十到上百周期）。

所以现代编译器的启发式本质上在替你算这笔账：小函数大胆展开、大函数保守、`-finline-limit` 之类的旋钮留给极端场景。人要做的只有两件事：不滥用 `always_inline`（只给确证的热点小函数）；识别编译器管不了的情形。最典型的是**递归**——递归没有终点，编译器最多展开几层就必须留一个真正的调用当出口：

```c
/* rec.c：递归无法被完全内联
 * gcc -Wall -Wextra -g -O2 rec.c -o rec
 * ./rec 10
 */
#include <stdio.h>
#include <stdlib.h>

static inline unsigned long long fact(unsigned n) {
    return n <= 1 ? 1 : n * fact(n - 1);
}

int main(int argc, char **argv) {
    unsigned n = argc > 1 ? (unsigned)atoi(argv[1]) : 10;
    printf("%llu\n", fact(n));
    return 0;
}
```

```bash
objdump -d rec | grep -c "call.*<fact>"
```

预期输出（本机 GCC 13 实测为 1；不同版本可能把 fact 展开进 main 几层、计数更大——关键是**永远不是 0**）：

```text
1
```

`static inline` 的 fact 仍留下对自身的 `call`——递归必须有运行时的出口，内联救不了它。顺带一提，给递归函数挂 `always_inline` 会直接编译失败：强制展开与「必须有出口」互斥。大函数同理：几千行、循环套循环的函数，编译器的启发式自己就会放弃，你标注了也只是白写。

## 6. 常见错误与调试实录

**实录一：MAX(i++, 5) 的展开对照。** 回到第 1 节的事故现场，用 290 篇的万能钥匙 `-E` 看展开：

```c
/* max_e.c */
#include <stdio.h>
#define MAX(a, b) ((a) > (b) ? (a) : (b))

int main(void) {
    int i = 9;
    int m = MAX(i++, 5);
    printf("m = %d, i = %d\n", m, i);
    return 0;
}
```

```bash
gcc -E max_e.c | grep "int m"
./max_e
```

展开式与运行输出：

```text
    int m = ((i++) > 5 ? (i++) : 5);
```

```text
m = 10, i = 11
```

逐行读展开式：条件里 `(i++)` 求值一次，i 从 9 变 10，比较 9 > 5 成立；接着**选中的分支**里 `(i++)` 又求值一次，m 拿到 10，i 变 11。函数版的正确答案是 `m = 9, i = 10`。注意这不是未定义行为——条件运算符 `?:` 在条件与后续分支之间有序列点，两次自增互不违规，所以 `-Wall` 一个字都不说。对照 290 篇的 `SQUARE(i++)`（同一对象无序列点连续两次修改，是真 UB，有 `-Wsequence-point` 警告）：**宏的多次求值事故分两种，UB 会报警，而「被抄进两个分支」这种静默算错不报警**。把 i 改成 3 再跑一遍，宏版又碰巧与函数版一致——「时对时错」比「总是错」更难排查，这正是第 1 节把它留作开场的原因。

**实录二：缺 static 的链接错误逐行读。** 第 3.2 节两个报错的完整读法：

```text
/usr/bin/ld: /tmp/ccXXXXXX.o: in function `main':
main_a.c:(.text+0x...): undefined reference to `sq'
```

第一行说明裁决者是链接器 ld（不是编译器）；第二行指出**谁在要**（main_a.c 的 main 函数）与**要什么**（sq 的符号）；`collect2` 是 GCC 的链接驱动在转述失败。凡是「编译都过、链接才炸」，问题必在「有声明、无定义」——C99 inline 的内联定义恰好是这种「有声明模样、无实体」的陷阱高发区。反过来 `multiple definition of 'sq'` 说的是「实体交了两份」，指向 GNU89 语义下多个翻译单元各发一份。两宗案件共用一个防身术：头文件里写 `static inline`，让每个翻译单元各养各的副本。多文件工程的完整图景（头文件该放什么、声明与定义的纪律）在 [多文件编译](/c/310-MultiFileCompilation) 系统展开。

## 7. 实际项目中的使用场景

- **头文件里的工具函数**：`clamp`、`min`、`max`、类型转换、位运算包装——跨模块共享又足够小，`static inline` 是标准答案，「每个 .c 一份副本」的膨胀由编译器在无人调用时自动删除；
- **性能热点的正确顺序**：先用性能工具找到热点（见 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)），再谈内联。手边也有两个观察器：`gcc -Winline` 警告「标记了 inline 却没内联」的情形，`-fdump-ipa-inline` 能导出编译器的内联决策报告；优化等级与构建配置的配合见 [构建系统](/c/470-BuildSystem)；
- **宏仍是第一选择的场景**：日志与断言（`#` 打印表达式原文、`__FILE__`/`__LINE__` 自报位置，骨架在 290 篇第 5、6 节）；内核 `container_of` 从成员指针反推容器结构体——既要 `offsetof` 的编译期偏移计算，又要 `typeof` 做类型检查，函数表达不了（机制见 290 篇实际项目场景）；
- **现代编译器的新变数**：链接时优化（LTO，`-flto`）允许跨翻译单元内联，「函数必须待在头文件里才可能被内联」的老约束正在松动——链接期整包优化，工具链细节见 470 篇。

## 8. 小练习

预测题（5 分钟）：先写下答案再运行：

```c
#define SQUARE(x) ((x) * (x))
int i = 3;
int r = SQUARE(i++);
printf("r=%d\n", r);
```

参考答案（先写再看）：未定义行为，编译时 `-Wsequence-point` 会警告——与本文 MAX(i++, 5) 的静默算错不同，SQUARE(i++) 的两次自增之间没有序列点。同样的表面需求，`static inline int square(int x)` 下 `square(i++)` 得 9、i 变 4，一切确定。三种行为（UB、静默错、确定）对应三种机制，能讲清区别本篇就通了。

修改题（15 分钟）：把第 1 节 max_bug.c 的 `MAX` 改成「GCC 语句表达式版」：`#define MAX(a, b) ({ __typeof__(a) a_ = (a); __typeof__(b) b_ = (b); a_ > b_ ? a_ : b_; })`，重跑。事故消失（每个参数只求值一次），但它依赖 GCC/Clang 扩展——在 MSVC 上编不过。这正是工程界的中间形态，也解释了为什么最终推荐仍是函数。

挑战题（30 分钟，不看答案先动手）：搭一个三文件工程（头文件 + 两个 .c），复现第 3.2 节的 `undefined reference`，然后给出三种修复并比较。提示两级如下。

提示（思路方向）：三种路线分别是——补外部定义（C99 正统）、改 `static inline`（最省心）、把定义从头文件挪进一个 .c（失去内联机会）。

展开（关键 API）：路线一在**恰好一个** .c 里写 `extern inline int sq(int);`（声明即可，实体由内联定义在这个 TU 生成）；验收清单：三条路线都在 `-std=c17` 下链接通过；路线一与路线三在 `-std=gnu89` 下的表现逐一重测并解释；说出每条路线牺牲了什么。

## 9. 与之前和之后的知识的关系

- 往前：[函数](/c/090-FunctionDetailed) 的传值调用是「参数只求值一次」的根源；[预处理器与宏](/c/290-PreprocessorMacro) 的文本替换模型解释了本文所有宏事故；[变量与常量](/c/050-VariableConstant) 的 static 从变量延伸到函数；
- 旁支：[泛型选择](/c/280-GenericSelection) 的伪重载由 `static inline` 函数族充当分支；[编译器扩展与属性](/c/540-AttributeCompilerExtension) 收编 `always_inline` 与 `noinline`；[跳转表](/c/180-FunctionPointerCallbackJumpTable) 靠「函数可取地址」——宏给不了；
- 往后：[多文件编译](/c/310-MultiFileCompilation) 把「头文件放 static inline」放进完整的多文件纪律；[构建系统](/c/470-BuildSystem) 管理优化等级、LTO 与 `-flto` 时代的跨模块内联。

## 10. 官方文档

- GCC 手册：An Inline Function Definition（C99 与 GNU89 两套语义的权威口径）：https://gcc.gnu.org/onlinedocs/gcc/Inline.html
- GCC 手册：Referring to a Type with typeof（`__typeof__` 扩展来历与 C23）：https://gcc.gnu.org/onlinedocs/gcc/Typeof.html
- Linux 内核编码风格第 12 章（「inline functions are preferable to macros resembling functions」）：https://www.kernel.org/doc/html/latest/process/coding-style.html
- Modern C（Jens Gustedt，C23 版免费在线，inline 与存储类章节）：https://gustedt.gitlabpages.inria.fr/modern-c/
- Beej's Guide to C Programming（内联与预处理入门向）：https://beej.us/guide/bgc/

## 11. 自我检查

- 能用 objdump 复现「-O0 有 call、-O2 无 call」的实验，并解释为什么没标 inline 的小函数也被展开；
- 能不看资料画出 C99 inline 三种写法的语义表，并把 `undefined reference to 'sq'` 与 `multiple definition of 'sq'` 各归因到一条规则的违反；
- 能对着对照表说出「这个需求该用宏还是 static inline」，并给出宏不可替代的三个能力各一例；
- 能解释内联的两种代价与「递归/大函数不该内联」的原因，说出内核编码规范那句准则。

## 本章总结

内联是「把函数体抄到调用处」的优化：省下调用开销，代价是代码膨胀与指令缓存压力。`inline` 关键字不是开关——优化等级与编译器启发式才是，`-O0` 下它什么也不做，`-O2` 下没标 inline 的小函数照样展开。它真正管理的是链接语义：C99 的内联定义不生成外部符号，需要恰好一个翻译单元补外部定义，违反即 `undefined reference`；GNU89 语义恰好相反，违反即 `multiple definition`；`static inline` 一笔勾销两套规则的分歧，是头文件函数的默认写法。工程决策一句话：能写成函数就写 `static inline`，宏只留给函数做不到的事——`#`/`##` 代码生成、编译期常量探测、参数当左值。宏的语法本体与五条军规在上一篇，类型分派的泛型宏在泛型选择篇，多文件工程的完整纪律在下一篇登场。

## 下一步

进入 [多文件编译](/c/310-MultiFileCompilation)：static inline 为什么住在头文件、extern 声明怎么跨文件、翻译单元与链接器如何裁决符号——把本文埋下的链接问题一次性讲透。
