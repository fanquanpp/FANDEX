---
order: 100
title: 函数：声明、传值与递归
module: 'c'
category: 计算机科学
difficulty: beginner
description: 以「平均分循环抄两遍」的 main 开题：原型如何让编译器替你查调用、C99 起隐式声明按错误处理、C23 起 foo() 即 foo(void)、swap 失败实验引出传值语义与指针版预告、返回局部地址的 -Wreturn-local-addr 实录、fib(30) 的 269 万次调用重复计算实验、调用栈直觉、main 的 argc/argv 与 echo $? 退出码实验；作用域交 055、函数指针交 170、可变参数交 100、inline 交 300。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'c/055-ScopeStorageLinkage'
  - 'c/100-VarargsFunction'
  - 'c/170-FunctionPointerCallback'
  - 'c/250-FunctionCallStackFrame'
prerequisites:
  - 'c/050-VariableConstant'
  - 'c/080-ControlFlow'
---

## 前置知识

- 已完成 [控制流](/c/080-ControlFlow)：会写 if/for/while，知道 return 能提前离开；
- 已完成 [变量与常量](/c/050-VariableConstant)：会声明变量，知道局部变量与初始化。

指针还不熟没关系——本文只在两处用到 `&` 和 `*`，都当场解释，详解在指针篇。

> 分工说明：本篇是函数主教学：声明与定义、传值、返回值、递归、main。作用域与存储类（static/extern 的完整语义）整篇在 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage)；函数指针与回调在 [函数指针与回调](/c/170-FunctionPointerCallback)；可变参数在 [可变参数函数](/c/100-VarargsFunction)；调用瞬间栈上发生了什么在 [函数调用栈帧](/c/250-FunctionCallStackFrame)。

## 学习目标

读完本文你将能够：

1. 把一段堆在 main 里的逻辑拆成职责单一的函数，并用原型让编译器替你检查调用；
2. 解释传值语义：预测 swap 失败的原因，说出什么场景必须传地址；
3. 识别「返回局部变量地址」的错误，并认识 `-Wreturn-local-addr` 警告；
4. 写递归函数：找准基准情况，用计数实验看清算量，说清递归深度与栈的关系；
5. 用 argc/argv 写命令行程序，用退出码向脚本报告成败。

预计 55 到 75 分钟，含 4 组动手实验、2 道预测题与 1 道挑战题。

## 1. 问题引入：平均分的循环抄了两遍

老师给两个班各给了一份成绩，要算平均分和最高分。全堆在 main 里写，是这样：

```c
/* monolith.c 的 main 节选：同样的逻辑抄两遍 */
    int total_a = 0;
    for (int i = 0; i < 5; i++) total_a += class_a[i];
    printf("A 班平均 %.1f\n", total_a / 5.0);
    int max_a = class_a[0];
    for (int i = 1; i < 5; i++) {
        if (class_a[i] > max_a) max_a = class_a[i];
    }
    printf("A 班最高 %d\n", max_a);

    int total_b = 0;                    /* B 班：复制、改名、改大小 */
    for (int i = 0; i < 4; i++) total_b += class_b[i];
    printf("B 班平均 %.1f\n", total_b / 4.0);
    int max_b = class_b[0];
    for (int i = 1; i < 4; i++) {
        if (class_b[i] > max_b) max_b = class_b[i];
    }
    printf("B 班最高 %d\n", max_b);
```

第三个班一来就是第三遍复制——改算法改一处忘一处。函数把「算平均」这件事写成一份：

```c
/* split.c：同一件事，函数版 */
#include <stdio.h>

double average(const int a[], int n) {
    int total = 0;
    for (int i = 0; i < n; i++) total += a[i];
    return total / (double)n;
}

int max_of(const int a[], int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) m = a[i];
    }
    return m;
}

int main(void) {
    int class_a[5] = {90, 75, 60, 82, 93};
    int class_b[4] = {70, 55, 88, 91};
    printf("A 班平均 %.1f，最高 %d\n", average(class_a, 5), max_of(class_a, 5));
    printf("B 班平均 %.1f，最高 %d\n", average(class_b, 4), max_of(class_b, 4));
    return 0;
}
```

预期输出：

```text
A 班平均 80.0，最高 93
B 班平均 76.0，最高 91
```

三个新面孔藏着本文全部主线：average 的参数 a 收到的是原数组还是复印件（第 3 节）；函数定义写在 main 上面，反过来行不行——main 在前、实现在后时靠什么让编译器认得（第 2 节）；以及一个预告，max_of 若顺手返回了某个局部变量的地址会怎样（第 4 节）。

## 2. 声明与定义：编译器靠原型替你查调用

**定义**（definition）是带函数体的本体；**声明**（declaration，惯称原型 prototype）只有签名加一个分号，告诉编译器「这个名字存在，参数长这样，返回那个类型」。编译器从上往下读文件，见到调用时必须已经知道这份合同，否则连「参数传少了」都查不出来：

```c
double average(const int a[], int n);   /* 原型：签名 + 分号，可带参数名 */
int max_of(const int a[], int n);       /* 参数名是给读者看的文档 */

int main(void) { ... }                  /* 先用，没问题 */

double average(const int a[], int n) { ... }   /* 实现放后面也行 */
```

修改实验一：把 split.c 里的调用改成 `average(class_a)` 少传一个参数，编译器当场拒绝：

```text
error: too few arguments to function 'average'; expected 2, have 1
```

这就是原型的价值：类型不对、个数不对，编译器替你盯住。反过来，如果连原型和定义都没有，老编译器会**猜**一个 `int average()` 敷衍过去——C 标准在 C99 就废除了这种隐式函数声明，如今的编译器在 C99 及以后的方言下直接按**错误**处理，先声明后使用是硬规矩。多文件时原型进头文件，机制见 [多文件编译](/c/310-MultiFileCompilation)。

C23 又收紧了一步：空括号声明 `int foo();` 从「参数未指定」变成等价 `int foo(void)`，K&R 旧式定义（参数表外置那种）被移除。新代码请一律写 `(void)` 表示无参，口径与 [C23 与 C2y](/c/520-C23CoreFeatures) 一致。

## 3. 传值：形参是实参的复印件

```c
/* swap_fail.c：想交换，失败了 */
#include <stdio.h>

void swap(int a, int b) {
    int t = a;
    a = b;
    b = t;
}

int main(void) {
    int x = 1, y = 2;
    swap(x, y);
    printf("x = %d, y = %d\n", x, y);
    return 0;
}
```

预期输出：

```text
x = 1, y = 2
```

没换成功。C 只有**传值调用**（call by value）：实参的值被复印进形参，swap 里换的是两张复印件，函数返回时复印件销毁，原件分毫未动。修改实验二：在 swap 里加 `printf("inside: %d %d\n", a, b);`——打印 `2 1`，换是换了，换的是副本。

要改原件，就得把**地址**交出去，让函数顺着地址找上门：

```c
void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}
/* 调用：swap(&x, &y);   & 交出地址，*a 顺着地址改原件 */
```

预期输出 `x = 2, y = 1`。`&` 与 `*` 的完整机理在 [指针深度解析](/c/140-PointerDeep) 展开，此处记住结论即可：**想让函数改你的变量，传地址；只读它，传值即可**。数组另有一条特殊规则：数组名作实参时退化为首元素地址，所以 `average(const int a[], int n)` 必须把长度 n 单独传进来——函数里对 a 做 sizeof 得到的是指针大小，不是数组大小，机理见 [指针与数组的区别](/c/150-PointerArrayDifference)。

## 4. 返回值：把结果带出去

`return 表达式;` 把值拷贝回调用方，类型要匹配声明的返回类型；return 也立刻结束本函数，「早返回」让主逻辑不必包进 else（080 篇 5.3 节的 find_element）。不带回值的函数声明为 `void`，需要中途离场时写光杆 `return;`。

有一个经典深坑专门值得实录——**返回局部变量的地址**：

```c
/* dangler.c：返回局部变量的地址 */
#include <stdio.h>

int *bad(void) {
    int x = 42;
    return &x;          /* x 的寿命到 } 为止 */
}

int main(void) {
    int *p = bad();
    printf("%d\n", *p);
    return 0;
}
```

编译时 GCC 默认就点破（这条 `-Wreturn-local-addr` 不在 `-Wall` 清单里，而是天生开启）：

```text
dangler.c:6:12: warning: function returns address of local variable [-Wreturn-local-addr]
    6 |     return &x;
      |            ^~
```

运行多半仍打印 `42`——那格栈内存还没被别人覆盖。**没出事不等于没错**：局部变量随函数返回销毁（直觉版），p 从此指向「不属于你」的内存，之后读到什么全是未定义行为，「有时正常」正是它的老面孔。正确做法三条路：返回值本身（拷贝是安全的）；让调用方传地址进来写入；要大块数据就 malloc 返回堆指针，所有权约定见 [动态内存](/c/200-DynamicMemoryManagement)。

顺带厘清一对词：return 只离开**当前函数**；exit 在任何函数里都直接结束**整个进程**。两者的交点在 main——第 8 节实验见。

## 5. 递归：自己调用自己

阶乘是标准入门：n! = n × (n-1)!，而 1! = 1。

```c
long factorial(int n) {
    if (n <= 1) return 1;          /* 基准情况：递归到此为止 */
    return n * factorial(n - 1);   /* 递归步：问题变小一圈 */
}
```

两个必要件缺一不可：**基准情况**（base case，停止条件）与**向基准靠拢的递归步**。缺了基准就是无穷递归。每次调用都会在栈上压一层帧（局部变量、返回地址），factorial(4) 压 4 层再逐层弹回——递归深度因此受栈大小限制（通常 1 到 8 MB），factorial(100000) 大概率栈溢出。栈上到底发生了什么，[函数调用栈帧](/c/250-FunctionCallStackFrame) 逐帧拆给你看。

朴素直觉是「递归 = 慢」，真正的问题是**重复计算**。斐波那契是著名反例：

```c
/* fib_calls.c：朴素递归到底浪费在哪 */
#include <stdio.h>

long long calls = 0;

long fib(int n) {
    calls++;
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

int main(void) {
    printf("fib(30) = %ld\n", fib(30));
    printf("calls = %lld\n", calls);
    return 0;
}
```

预期输出：

```text
fib(30) = 832040
calls = 2692537
```

269 万次函数调用，只为算一个数：fib(29) 把 fib(28) 重算一遍，fib(28) 又把 fib(27) 重算一遍……子问题指数级重复。对照循环版（080 篇写过的迭代 fib）：

```c
long fib_loop(int n) {
    long a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        long next = a + b;
        a = b;
        b = next;
    }
    return a;
}
```

同样的结果，n 轮加法。修改实验三：把 30 改成 40 再跑，calls 涨到 3 亿级、肉眼可感地卡——重复子问题是递归性能的头号杀手，「算过就记下来」的解法叫记忆化，此处点到为止。选型经验：「一条线」的问题（阶乘、求和）直接循环；「分叉」的问题（树、二分）递归写法更贴题，二分查找的递归实现留给挑战题。任何递归理论上都能改成循环（必要时显式用一个栈），选择标准是哪个更像问题本身。

## 6. 作用域与存储类：一句话交接

本篇只留一句话：函数内声明的是局部变量，函数外的是全局变量；static 加在局部变量上能让它活过函数返回（写个调用计数器就能亲眼看到），static/extern 用在全局上决定其他文件能否看见它。这套「户口系统」的完整语义——四种作用域、四种存储期、链接性、register 的真实现状——整篇在 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage)，本文不再重复。

## 7. 三个概览：函数指针、可变参数、inline

**函数指针**。函数也有地址，可以存进指针、当参数传递：

```c
    int (*p)(int, int) = add;   /* p 指向「两个 int 进、一个 int 出」的函数 */
    int r = p(10, 20);          /* 通过指针调用；等价写法 (*p)(10, 20) */
```

用途两大类：回调（把「怎么处理每个元素」作为参数交出去，标准库 qsort 的比较函数是最出名的实例）与跳转表（080 篇 switch 状态机的表驱动亲戚）。`typedef void (*Callback)(int);` 这类声明的读法与实战，[函数指针与回调](/c/170-FunctionPointerCallback) 承接，跳转表进阶见同族姊妹篇。

**可变参数**。printf 的参数表天生可长可短——它就是可变参数函数。自己写一个靠 stdarg.h 四件套：

```c
#include <stdarg.h>

int sum(int count, ...) {       /* 至少一个具名参数，约定后面跟 count 个 int */
    va_list ap;
    va_start(ap, count);
    int total = 0;
    for (int i = 0; i < count; i++) total += va_arg(ap, int);
    va_end(ap);
    return total;
}
```

硬约束记两条：必须有至少一个具名参数；参数的个数与类型全靠约定（printf 靠格式串），`va_arg` 用错类型是未定义行为。float 变参还会自动提升为 double。机制、ABI 与工程实践在 [可变参数函数](/c/100-VarargsFunction) 详解。

**inline**。给编译器的「建议把函数体抄到调用处省掉调用开销」——是建议不是命令，现代编译器按成本模型自己决定，极短高频函数才值得考虑。它和宏的恩怨（为什么 C 的 inline 没有想象中好用）在 [内联函数与宏](/c/300-InlineFunctionMacro) 细讲。

## 8. main：程序的第一个函数与它的出口

每个 C 程序都从 main 开始。标准认两种签名（其余交给实现定义）：

```c
int main(void)                      /* 不吃命令行参数 */
int main(int argc, char *argv[])    /* 吃命令行参数 */
```

argc 是参数个数，argv 是字符串数组：argv[0] 是程序名，argv[argc] 保证是空指针。第一个动手实验，五行的 echo：

```c
/* echo.c：把命令行参数原样回显 */
#include <stdio.h>

int main(int argc, char *argv[]) {
    for (int i = 1; i < argc; i++) {
        printf("%s%s", argv[i], i < argc - 1 ? " " : "");
    }
    printf("\n");
    return 0;
}
```

```bash
gcc -Wall -Wextra -g echo.c -o echo
./echo hello control flow
```

预期输出：

```text
hello control flow
```

修改实验四：加一行 `printf("argv[0] = %s\n", argv[0]);` 看看程序名长什么样。这是你第一次在自己的程序里拥有「大小运行时才定」的数组——来多少参数，argc 就是多少。

main 的 return 是**程序的退出码**，交给操作系统：

```bash
$ ./echo hi
hi
$ echo $?
0
```

惯例 0 表示成功，非 0 表示各种失败——把 `return 0;` 改成 `return 3;` 重新编译，`echo $?` 就打出 3。Shell 脚本、Make、CI 全靠这个码判断你的程序死没死透。标准依据：从初始 main 返回**等价于**以该值为参数调用 exit——先执行 atexit 注册的函数、刷新并关闭所有流，再把控制权交还环境；C99 起 main 不写 return 等价 `return 0`。所以第 4 节那句话现在闭合了：return 只出当前函数，exit 在任何函数里直接结束进程，而 main 的 return 就是 exit。

## 9. 实际项目中的使用场景

- **拆函数是重构的第一动作**：一个函数只做一件事，参数控制在三五个以内，函数名说清做什么（snake_case）；
- **const 是接口合同**：只读的数组参数写成 `const int a[]`，把「我不会改你的数据」写进签名，调用方放心，编译器把关；
- **可测试性**：每个函数能独立编译调用，为它写小测试（正常值加边界值），用 assert.h 的断言验证行为；
- **命令行工具的接口**：argc/argv 收输入、退出码报结果，是程序与脚本世界的标准握手方式。

## 10. 小练习

预测题一（5 分钟，先写答案再运行）：

```c
void bump(int n) {
    n = n + 1;
}

int main(void) {
    int a = 9;
    bump(a);
    printf("%d\n", a);
}
```

参考答案（先写再看）：打印 `9`。bump 拿到的是复印件，原件没动；要它变 10，得传 `&a` 用指针版。

预测题二（5 分钟，先手算再运行验证）：fib 的调用次数满足 calls(n) = calls(n-1) + calls(n-2) + 1，其中 calls(0) = calls(1) = 1。手算 calls(6)，再给 fib_calls.c 加打印验证。

参考答案（先写再看）：calls(6) = 25。规律 calls(n) = 2 × fib(n+1) - 1，fib(7) = 13。

挑战题（30 分钟，不看提示先动手）：补全递归二分查找——有序数组里找 target，返回下标，不存在返回 -1：

```c
/* 前提：a[low..high] 升序。返回 target 所在下标；不存在返回 -1 */
int binary_search(const int a[], int low, int high, int target);
```

提示（思路方向）：区间空（low > high）是基准情况；取中点比较，比 target 大就递归左半，小就递归右半——每步问题减半，递归深度只有对数级。展开（关键 API）：中点写 `int mid = low + (high - low) / 2;`（比 `(low + high) / 2` 抗溢出）；三分支各自 return。验收清单：{2, 4, 7, 10, 15} 查 10 得 3；查 8 得 -1；low > high 的空区间调用不崩、返回 -1。

## 11. 与之前和之后的知识的关系

- 往前：[控制流](/c/080-ControlFlow) 的骨架活在函数体内，return 那个「最常用的出口」在本文兑现成函数的返回机制；[变量与常量](/c/050-VariableConstant) 的局部变量是每层栈帧的住户；
- 旁支：作用域与 static/extern 的完整语义在 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage)；传地址的钥匙在 [指针深度解析](/c/140-PointerDeep)；数组传参为何退化为指针在 [指针与数组的区别](/c/150-PointerArrayDifference)；调用瞬间栈上发生了什么在 [函数调用栈帧](/c/250-FunctionCallStackFrame)；
- 往后：可变参数在 [可变参数函数](/c/100-VarargsFunction) 详解；函数指针与回调在 [函数指针与回调](/c/170-FunctionPointerCallback)；原型进头文件、多文件组织在 [多文件编译](/c/310-MultiFileCompilation)；C23 对函数声明的收紧在 [C23 与 C2y](/c/520-C23CoreFeatures)。

## 12. 官方文档

- main 函数（cppreference C，含两种标准签名与退出码语义）：https://en.cppreference.com/w/c/language/main_function
- 函数声明（C23 起空括号等价 (void)）：https://en.cppreference.com/w/c/language/function_declaration
- GCC 警告选项（-Wreturn-local-addr、隐式声明按错误处理）：https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html

## 13. 自我检查

- 能把一段重复两次以上的 main 逻辑拆成函数，写出原型并让编译器抓出调用处的类型错误；
- 能向同事解释 swap 为什么失败、什么场景必须传地址、数组传参为什么必须带长度；
- 看到「函数返回了局部变量的地址」能指出病灶，并说出 `-Wreturn-local-addr` 警告；
- 能手写带基准情况的递归函数，用计数实验说清 fib(30) 的 269 万次调用浪费在哪；
- 会用 argc/argv 写命令行程序，会用退出码向脚本报告成败。

## 本章总结

函数是复用与测试的单元：原型是给编译器的合同（C99 起不许没有，C23 起 foo() 即 foo(void)），定义是实现。C 只有传值调用——形参是复印件，换复印件动不了原件，改原件必须传地址，数组传参退化为首元素地址所以必须另传长度。返回值把结果拷贝出去，返回局部变量的地址是深坑，警告会点名但「没崩」不是清白。递归要基准情况加递归步，深度受栈限制，真正的敌人是重复子问题——fib(30) 的 269 万次调用对照循环版 30 次加法。main 是程序的第一个函数：argc/argv 收命令行，return 交退出码，它的 return 等价 exit。

## 下一步

进入 [可变参数函数](/c/100-VarargsFunction)：本文第 7 节只给了 sum 一个最小样例，下一篇把 stdarg 的机制、调用约定与「参数个数类型靠约定」的工程风险一次讲透。
