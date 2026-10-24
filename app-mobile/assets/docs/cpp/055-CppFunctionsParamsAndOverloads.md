---
order: 80
title: 函数：参数传递、重载与递归
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: 函数原型与定义、按值/按引用/const 引用传递的选择、默认参数、重载解析、单递归与多递归、函数指针与 std::function 预告；用 swap 三版迭代讲透值传递语义，附三数求最大无函数版对照、阶乘与汉诺塔递归。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/045-CppCompoundTypesArraysStringsStructs'
  - 'cpp/080-CppReferenceTypes'
  - 'cpp/090-RvalueReferenceMoveSemantics'
prerequisites:
  - 'cpp/035-CppControlFlowLoopsAndBranching'
  - 'cpp/045-CppCompoundTypesArraysStringsStructs'
---

## 知识点地图

- **知识类别**：函数（functions）——C++ Primer Plus 第 7 章「函数——C++ 的编程模块」与第 8 章的参数部分（引用、默认参数、重载），cppreference Functions 主线。
- **解决什么问题**：同一段逻辑复制粘贴三遍，改一处漏两处；函数把逻辑命名、参数化，让它可复用、可单测。而「参数怎么传」决定函数能不能改到外面的数据——这是初学者第一个真正的设计决策。
- **什么时候用到**：一切代码组织；其中传参选择（值/引用/const 引用）从第一个函数起就要面对，重载与递归在标准库与算法题里无处不在。

## 前置知识

- [分支与循环](/cpp/035-CppControlFlowLoopsAndBranching)、[复合类型](/cpp/045-CppCompoundTypesArraysStringsStructs)：函数体的材料与数组传参现象；
- 045 篇 1.2 节已见过「数组传参退化为指针」——本篇把它放进完整的传参规则里解释。

## 学习目标

读完本文你将能够：

1. 写函数原型（声明）与定义，说出为什么大型项目里两者要分开；
2. 用 swap 三版迭代说清「按值传递为什么改不到外面」，以及指针版与引用版各自的修法；
3. 按规则选传参方式：小对象传值、大对象只读传 const 引用、要修改传引用；
4. 用默认参数简化调用，用重载让同名函数接受不同参数，并理解重载解析的基本顺序；
5. 写阶乘（单递归）与汉诺塔（多递归），说出递归函数必须有的两个部分。

预计 80 分钟，含 1 个找错环节与 3 道动手任务。

## 1. 原型、定义与「为什么先声明」

```cpp
#include <iostream>

double areaOfCircle(double r);          // 原型（声明）：只描述接口，带分号

int main() {
    std::cout << areaOfCircle(2.0) << '\n';   // 调用点在定义之前：靠原型通过编译
}

double areaOfCircle(double r) {         // 定义：完整函数体
    return 3.14159265358979 * r * r;
}
```

**逐段讲解**：

1. 编译器从上往下读：读到调用点时只需知道「名字、参数类型、返回类型」就能检查调用合法性——原型就是这份名片。定义（带函数体）可以晚些出现（本文件后面，或别的文件经链接合并）。
2. 换别的写法会发生什么：把定义放到 main 前面、省掉原型，单文件能跑；但两个文件互相调用时（A.cpp 调 B.cpp 的函数）没法「把定义搬上来」，只能靠**头文件放原型**——原型与定义分离是编译链接模型（050 篇命名空间与链接）的必然要求，不是风格偏好。
3. 课件原话在此正名：main 是程序执行起点、与它在文件里的书写位置无关；函数不能调用 main（能编译过的歪门写法除外），main 也不该被当普通函数调。
4. 易错点：原型里每个形参都要写类型，`double f(a, b)` 不合法；原型参数名可以省（`double areaOfCircle(double);`），但写上名字是最好的免费文档。

## 2. 参数传递：swap 三版迭代

同一目标——交换两个变量——三个版本，一版比一版接近真相。

### 2.1 版一：按值传递（无效）

```cpp
void swapByValue(int a, int b) {   // a、b 是实参的拷贝
    int t = a;
    a = b;
    b = t;
}

int main() {
    int x = 1, y = 2;
    swapByValue(x, y);
    std::cout << x << ' ' << y << '\n';   // 1 2：什么都没发生
}
```

**为什么无效**：C++ 的参数默认**按值传递**——实参的值被**复制**进形参，函数里换的是两份复印件的位置，原件纹丝不动。这是「值传递语义」的全部：不是写法错了，是拷贝这件事本身切断了里外的联系。

### 2.2 版二：传指针，但交换的是指针本身（仍无效）

```cpp
void swapPtrWrong(int* p1, int* p2) {
    int* t = p1;    // 交换的是"指向谁"，不是"指向的东西"
    p1 = p2;        // 指针也是按值传递的：换的是复印件
    p2 = t;
}

int main() {
    int x = 1, y = 2;
    swapPtrWrong(&x, &y);
    std::cout << x << ' ' << y << '\n';   // 还是 1 2
}
```

**为什么仍无效**：指针变量本身也是按值传递的——p1、p2 是「地址的拷贝」。函数里把两份地址复印件对调，x、y 原地不动。**但指针已经给了我们钥匙**：p1 存着 x 的地址，`*p1` 就是 x 本身。顺着这把钥匙改写内容：

### 2.3 版三：交换指针指向的内容（成功）

```cpp
void swap(int* p1, int* p2) {
    int t = *p1;    // 顺着地址找到原件
    *p1 = *p2;
    *p2 = t;
}

int main() {
    int x = 1, y = 2;
    swap(&x, &y);
    std::cout << x << ' ' << y << '\n';   // 2 1：成功
}
```

### 2.4 版四：引用——同一件事的更好语法

```cpp
void swap(int& a, int& b) {   // 引用参数：a、b 是实参的别名
    int t = a;
    a = b;
    b = t;
}

int main() {
    int x = 1, y = 2;
    swap(x, y);               // 调用点不用取地址
    std::cout << x << ' ' << y << '\n';   // 2 1
}
```

**逐段对比讲解**：

1. 版三能成功的机理：`&x` 把 x 的地址交给函数，`*p1` 解引用直达原件——「值传递语义 + 通过地址间接改写」。版二失败说明：**拿到地址不等于用了地址**，指针参数不写 `*` 照样在换复印件。
2. 版四（C++ 引用）与版三机制等价（底层多半就是地址），但调用点写 `swap(x, y)`——函数签名上的 `int&` 已声明「这是别名」，语法负担消失。引用的完整语义（必须初始化、不能中途换绑）在 080 篇。
3. **传参选择规则**（背下来）：
   - 小对象（int/double/指针）：按值传，拷贝便宜且函数内随便改；
   - 大对象只读（string、vector、大 struct）：`const std::string&`——别名直达原件又禁止修改，零拷贝；
   - 要修改调用方的对象：非 const 引用（或返回值代替）。
   - 反例：给 `printName(const std::string&)` 写成 `printName(std::string)`，每次调用都完整拷贝一遍字符串——单次看不出，循环里就是真开销。

## 3. 为什么用函数：三数求最大对照

课件用同一道题的「无函数版 vs 函数版」回答「为什么要函数」：

```cpp
// 无函数版：两处需要"三数最大"就要复制两份六行嵌套
if (a > b) {
    if (a > c) max1 = a; else max1 = c;
} else {
    if (b > c) max1 = b; else max1 = c;
}
// ……第二组数据再来一遍（max2），改需求时两处要同步改

// 函数版：逻辑只存在一份
int maxOf3(int a, int b, int c) {
    int m = a;
    if (b > m) m = b;
    if (c > m) m = c;
    return m;
}
int max1 = maxOf3(x, y, z);
int max2 = maxOf3(p, q, r);
```

**讲解**：函数版的三个收益——改 bug 只改一处、命名即文档（`maxOf3` 自解释）、可以单测（喂几组数验证）。`return` 立即结束函数并交出值；void 函数写 `return;` 是提前退场（045 篇空背包提前 return 同款）。函数不写 return 类型（省略不写）在 C++ 里不合法，main 除外且 main 必须是 int。

## 4. 默认参数与重载

### 4.1 默认参数：调用方可省略的尾巴

```cpp
#include <iostream>
#include <string>

void log(const std::string& msg, const std::string& level = "INFO") {
    std::cout << '[' << level << "] " << msg << '\n';
}

int main() {
    log("started");                  // [INFO] started：省略尾参用默认值
    log("disk full", "ERROR");       // [ERROR] disk full
}
```

**规则**：默认值只能从参数列表**右端连续**给出——`void f(int a, int b = 1, int c = 2)` 合法，`void f(int a = 1, int b)` 不合法（调用 `f(5)` 时 b 无值可填）。默认值写在**原型**（头文件）里，定义处不再重复，否则编译错误。

### 4.2 重载：同名不同参

```cpp
#include <iostream>

int maxOf(int a, int b) { return a > b ? a : b; }
int maxOf(int a, int b, int c) { return maxOf(maxOf(a, b), c); }
double maxOf(double a, double b) { return a > b ? a : b; }

int main() {
    std::cout << maxOf(3, 7) << '\n';          // 选中 (int, int)
    std::cout << maxOf(1, 5, 9) << '\n';       // 选中 (int, int, int)
    std::cout << maxOf(2.5, 1.8) << '\n';      // 选中 (double, double)
}
```

**逐段讲解**：

1. 重载让一个动词接受不同形状的参数，调用方不用记 `maxOf2`/`maxOf3`/`maxOfDouble` 三套名字。C++ 靠「名字修饰」（name mangling，050 篇链接篇的主题）区分它们——这也是为什么 C++ 函数不能只靠返回类型重载（修饰名不含返回类型，调用点也无法消歧）。
2. **重载解析**粗略三步：完全匹配 > 常规转换（int 到 double）> 用户自定义转换。两个候选都要靠模糊转换时编译报「ambiguous」。易错点：`maxOf(3, 7.5)`——(int,int) 与 (double,double) 各错一半，官方规则判为二义报错，而不是「聪明的」各转一半。
3. 默认参数与重载可能互相制造二义：`void f(int)` 与 `void f(int, int = 5)`——`f(1)` 两个都匹配，编译错误。同一族函数里两者只留一个。

## 5. 递归：函数调用自己

### 5.1 单递归：阶乘

```cpp
unsigned long long factorial(int n) {
    if (n <= 1) return 1;                 // 基线条件：递归必须能停
    return n * factorial(n - 1);          // 递归条件：缩小问题规模
}
```

**逐段讲解**：

1. 递归函数必须有两部分：**基线条件**（直接可答，如 `n <= 1`）与**递归条件**（把问题变小一层）。缺基线或规模不缩小，都是栈溢出（每次调用占栈帧，无限递归耗尽栈空间，程序崩溃）。
2. 心智模型：`factorial(4)` 展开是 `4 * factorial(3)` → `4 * 3 * factorial(2)` → … → `4 * 3 * 2 * 1`。先层层往下问（调用栈加深），到底后再层层往回乘（返回值回传）。
3. 换别的写法会发生什么：循环版 `for (unsigned long long r = 1; n > 1; --n) r *= n;` 不占栈、更快，工程上阶乘就该循环写；递归的价值在「天然递归结构」的问题上（下节汉诺塔、树的遍历），不在阶乘这种可以轻松改循环的题上。

### 5.2 多递归：汉诺塔

```cpp
#include <iostream>

int steps = 0;

void hanoi(int n, char from, char via, char to) {
    if (n == 0) return;                    // 基线：没有盘子，无事可做
    hanoi(n - 1, from, to, via);           // 1. 把上面 n-1 个挪到中转柱
    std::cout << ++steps << ": 盘" << n << ' ' << from << " -> " << to << '\n';
    hanoi(n - 1, via, from, to);           // 2. 把 n-1 个从中转柱挪到目标柱
}

int main() {
    hanoi(3, 'A', 'B', 'C');
}
```

**逐段讲解**：

1. 「多递归」：函数体里有**两处**自调用。思路是一句话的翻译——「挪 n 个 = 先把上面 n-1 个让开、挪最大盘、再把 n-1 个盖上去」，每半句各是一次递归。
2. 三个柱子参数的意义随层级轮换：`hanoi(n-1, from, to, via)` 把中转柱当目标——这就是为什么参数要写全三个柱子，硬编码 ABC 无法表达轮换。
3. 3 个盘 7 步、n 个盘 2^n - 1 步：多递归的调用次数是指数级的，n=64 的汉诺塔全宇宙搬不完——递归的正确性与可行性是两回事。

## 6. 函数指针与 std::function 预告

```cpp
#include <iostream>

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }

// 函数作参数：收"某种行为"而不是"某个数据"
void apply(int a, int b, int (*op)(int, int)) {
    std::cout << op(a, b) << '\n';     // 通过指针调用传入的函数
}

int main() {
    apply(3, 4, add);    // 7
    apply(3, 4, mul);    // 12

    int (*fp)(int, int) = add;   // 声明一个函数指针变量
    std::cout << fp(10, 5) << '\n';
}
```

**逐段讲解**：

1. 函数也有地址；`int (*op)(int, int)` 读作「op 是指针，指向 int(int,int) 型函数」。数组名会退化，函数名同理——`apply(3, 4, add)` 里的 add 自动取址。
2. 用途：把「行为」当数据传（比较器、回调、事件处理）。C 风格的函数指针语法拗口且不能捕获状态，现代 C++ 的默认答案是 lambda 与 `std::function`（能装下函数指针、lambda、仿函数的通用盒子）——本篇只立路标，展开在 060-LambdaExpression。
3. 三个场景：`std::sort(v.begin(), v.end(), comparator)` 的第三参（270 篇）；GUI/网络库的回调注册（530 篇）；策略切换（同一框架换算法）。

## 7. 动手实践

### 任务一：写全温度转换族（热身）

实现 `double c2f(double c)`（摄氏转华氏，f = c × 9/5 + 32）、`double f2c(double f)`，并写重载版 `double c2f(double c, double offset)`（结果加修正值，offset 默认 0）——把默认参数与重载各用一遍。

提示：默认参数写在原型上；`9.0 / 5` 与 `9 / 5` 在这里结果不同。

### 任务二：找错——这个 swap 为什么还是没用（实战）

```cpp
#include <iostream>
void swapWrong(int& a, int& b) {
    int& t = a;     // 想给交换留个临时位
    a = b;
    b = t;
}
int main() {
    int x = 1, y = 2;
    swapWrong(x, y);
    std::cout << x << ' ' << y << '\n';
}
```

提示一：`int& t = a;` 绑定后，t 和 a 是什么关系？提示二：`a = b` 执行后，t 现在的值是什么？

**参考实现（先自己写完再展开）**：

```cpp
void swapFixed(int& a, int& b) {
    int t = a;      // 临时变量要的是"值的拷贝"，不是别名
    a = b;
    b = t;
}
```

`int& t = a` 让 t 成为 a 的**别名**而非拷贝：`a = b` 之后，t（即 a）已经变成 b 的原值，`b = t` 只是把同一个值再赋回去——两次赋值后 a、b 都是原 b。引用是别名不是快照，临时保存值必须用普通变量。这是引用与「直觉上的指针用法」最微妙的一处分歧。

### 任务三：递归练习（综合）

a) 写递归 `int sumTo(int n)` 返回 1+2+…+n，标出基线与递归条件；b) 写递归 `int fib(int n)`（fib(1)=fib(2)=1），调用 fib(40) 计时感受指数爆炸，再用「两个变量循环版」重写对比耗时。

提示：b) 的循环版只需 prev/cur 两个变量——递归 fib 慢不是因为递归本身，是因为它把同一子问题算了指数遍（记忆化是另一个世界的解法，020-algorithm 模块的主题）。

**参考实现要点（先自己写完再展开）**：

```cpp
int sumTo(int n) {
    if (n <= 0) return 0;        // 基线：空和
    return n + sumTo(n - 1);     // 递归：缩小到 n-1
}

long long fibLoop(int n) {
    long long prev = 0, cur = 1;
    for (int i = 1; i < n; ++i) {
        long long next = prev + cur;
        prev = cur;
        cur = next;
    }
    return cur;
}
```

### 任务四：行为参数化（进阶，通向 lambda）

用函数指针实现 `apply(int a, int b, int (*op)(int, int))`，注册三种运算（add/sub/mul）各调用一次；然后把三种运算改写成无名函数（lambda）传进去：`apply(3, 4, [](int a, int b){ return a - b; })`——只需让代码能编译并解释「lambda 传给函数指针参数」为什么合法。

提示：无捕获的 lambda 可以隐式转换成同签名函数指针；带 `[]` 里变量的就不行了——原因在 060 篇。

## 8. 参考与致谢

- cppreference：Functions / parameter passing / overload resolution 页（https://en.cppreference.com/w/cpp/language/functions ，CC BY-SA 许可）——值传递语义、重载解析顺序、默认参数规则以官方文档为准，本文代码为原创示例；
- Stephen Prata, *C++ Primer Plus*（第 6 版）第 7 章「函数——C++ 的编程模块」与第 8 章默认参数、重载小节的主题结构；
- swap 三版迭代、三数求最大无函数对照、递归求年龄/阶乘、汉诺塔均取材自仓库扫描素材的函数讲义（见 `.workflow-tmp/scan/e-core-c-cpp-godot-net.md` A5 节），正文代码与讲解为本文重写扩展，并按现代 C++ 补充引用传递与 lambda 预告。
