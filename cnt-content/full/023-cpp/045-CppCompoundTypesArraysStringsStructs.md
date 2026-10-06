---
order: 60
title: 复合类型：数组、字符串、结构体与枚举
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: 数组声明与退化、std::array 与 vector 初识、C 字符串与 std::string 的分工、struct 聚合与位字段、枚举与 C++11 作用域枚举；用冒泡与选择排序同题两解、回文检测、二维数组行列互换、游戏背包结构体四个场景落地。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/040-CppTypeSystem'
  - 'cpp/035-CppControlFlowLoopsAndBranching'
  - 'cpp/120-CppPointers'
  - 'cpp/240-CppSTLContainersIterators'
prerequisites:
  - 'cpp/040-CppTypeSystem'
---

## 知识点地图

- **知识类别**：复合类型（compound types）——数组、字符串（C 风格与 std::string）、结构体（struct）、枚举（enum），对应 C++ Primer Plus 第 4 章「复合类型」。
- **解决什么问题**：基本类型一次只能装一个数；把「一组数、一段文本、一个有字段的对象」组织起来，才有资格描述现实事物——10 个成绩、一个文件名、一个游戏角色。
- **什么时候用到**：批量数据（成绩表、像素缓冲）、文本处理（读入、比较、拼接）、把相关字段打包（坐标、配置项、背包物品）；`std::vector`/`std::string` 是之后所有 STL 内容的地基。

## 前置知识

- [类型系统](/cpp/040-CppTypeSystem)：基本类型与初始化规则；
- [分支与循环](/cpp/035-CppControlFlowLoopsAndBranching)：for 与范围 for——本文遍历数组的工具。

## 学习目标

读完本文你将能够：

1. 声明并初始化数组，说出「数组名在传参时退化为指针」意味着什么；
2. 在 C 风格字符串（char 数组）与 std::string 之间做选择，并知道 '\0' 在哪；
3. 定义 struct 与带位字段的结构，用聚合初始化一行造出对象；
4. 用 enum（含 C++11 作用域枚举 enum class）替换魔法数字；
5. 完成冒泡/选择排序、回文检测、二维数组转置三个经典算法。

预计 80 分钟，含 1 个找错环节与 3 道动手任务。

## 1. 数组：定长的同类型序列

### 1.1 声明、初始化与边界

```cpp
#include <iostream>

int main() {
    int scores[5] = {90, 85, 77, 60, 100};   // 完整初始化
    int zeros[10] = {};                       // 全部置 0（C++11 也支持 = {0}）
    int partial[5] = {1, 2};                  // 其余元素补 0：{1, 2, 0, 0, 0}
    int guessed[] = {3, 1, 4, 1, 5};          // 让编译器数元素个数：长度 5

    scores[0] = 95;                           // 下标从 0 开始：首元素是 [0]
    std::cout << scores[4] << '\n';           // 最后一个元素是 [长度-1]

    int n = sizeof(scores) / sizeof(scores[0]);  // 元素个数的经典写法
    std::cout << "n = " << n << '\n';
}
```

**逐段讲解**：

1. 数组长度必须是**编译期常量**：`int a[n]`（n 是运行期变量）在标准 C++ 里不合法。长度要到运行期才知道，就该用 vector（第 3 节）。
2. 下标 `[4]` 访问的是第 5 个元素——「含 0 不含长度」，越界访问（`scores[5]`）编译器**不报错**，运行时是未定义行为（030 篇的第一颗子弹），可能读到垃圾、可能崩、可能「看起来正常」。长度校验是程序员自己的责任。
3. `sizeof(a) / sizeof(a[0])` 是「总字节数除以单元素字节数」；注意它**只在本文件、本作用域有效**——数组一旦传进函数就退化（见 1.2），在函数内对参数这么算得到的是指针大小除以元素大小，永远是 1 或 2，不是长度。

### 1.2 退化：数组传参时发生了什么

```cpp
void printAll(int arr[], int count) {   // 这里的 int arr[] 实际是 int*
    // sizeof(arr) 是指针大小，不是数组大小！
    for (int i = 0; i < count; ++i) {
        std::cout << arr[i] << ' ';
    }
}

int main() {
    int scores[5] = {90, 85, 77, 60, 100};
    printAll(scores, 5);    // 数组名退化为首元素地址传入
}
```

**逐段讲解**：

1. 「退化」（decay）：数组名在传参语境下自动变成指向首元素的指针，所以函数必须**额外收一个长度参数**——这是 C 系 API 满屏 `(buf, len)` 成对参数的根源。
2. 退化的推论：函数内对 `arr[i]` 的修改会**反映到调用方**（操作的是原数组，不是副本），与 int 传参的拷贝语义完全不同——这个差异在 055 篇 swap 三版迭代里正式展开。
3. 想让编译器替你记住长度：`void printAll(int (&arr)[5])` 只收长度 5 的数组（引用不退化），或用模板 `template <size_t N> void printAll(int (&arr)[N])`。工程里更常见的选择是直接传 `std::vector`/`std::span`（C++20）。

## 2. C 字符串与 std::string

### 2.1 C 风格字符串：带哨兵的 char 数组

```cpp
char cstr[] = "hello";        // 实际 6 个元素：h e l l o \0
std::cout << sizeof(cstr);    // 6：含结尾的 '\0'
char fixed[10] = "hi";        // 前 3 个用掉，其余补 '\0'
```

**逐段讲解**：

1. `'\0'`（全零字节）是字符串**结束哨兵**：所有 C 系函数（strlen/strcmp/printf 的 %s）靠它找结尾。哨兵丢了，函数会一直读到内存里随机的下一个零字节——越界读未定义行为。这就是课件里「strlen 求值口算题」的考点：`strlen` 数到 '\0' 为止（5），`sizeof` 是数组总长（6）。
2. C 风格字符串的拼接、比较全靠库函数：`strcpy`（不查目标大小，越界源头）、`strcmp`（返回负/0/正，判断相等要 `== 0` 而不是当 bool 用）。

### 2.2 std::string：默认选择

```cpp
#include <iostream>
#include <string>

int main() {
    std::string s = "hello";
    std::string t = s + " world";       // 拼接：+ 直接用
    std::cout << t.length() << '\n';    // 11：长度自己知道，不靠 '\0'

    if (s == "hello") { }               // == 比较内容（C 的 == 比较地址！）
    std::cout << t.substr(6) << '\n';   // "world"：取子串
    std::cout << t.find("world") << '\n';  // 6：子串位置，找不到返回 npos
}
```

**逐段讲解**：

1. std::string 自己管理内存与长度：加长自动扩容，不用你操心缓冲区大小——C 风格字符串的越界问题在它这里从根上消失。
2. `s == "hello"` 比较的是**内容**；而 C 风格写法 `cstr1 == cstr2` 比较的是两个数组的首地址（永远不等），内容比较要用 `strcmp(cstr1, cstr2) == 0`。两套字符串并存的世界里，这个「== 语义不同」是高频坑。
3. `find` 找不到返回 `std::string::npos`（一个巨大的无符号数），判断写 `if (t.find("x") == std::string::npos)`；把 find 的返回值存进 int 再判负数，在多数平台上碰巧能用但类型上不正确。
4. **分工**：新代码一律 std::string；C 字符串只在两个地方退让——与 C 库交互的边界、以及要求零分配的极特殊场景。string 的深用法（查找替换、数值转换、性能）在 470 篇。

## 3. std::array 与 std::vector：数组的两个现代替身

```cpp
#include <array>
#include <vector>
#include <iostream>

int main() {
    std::array<int, 5> fixed = {1, 2, 3, 4, 5};   // 定长：长度是类型的一部分
    std::vector<int> grow;                         // 变长：自动扩容

    grow.push_back(10);                            // 追加元素
    grow.push_back(20);
    std::cout << grow.size() << '\n';              // 2：随时可问长度

    for (int x : fixed) std::cout << x << ' ';     // 范围 for 通吃两者
    for (size_t i = 0; i < grow.size(); ++i) {
        std::cout << grow[i] << ' ';               // 下标访问与裸数组一样
    }
}
```

**选型表**：

| 类型 | 长度 | 传参行为 | 适用 |
| --- | --- | --- | --- |
| 裸数组 `int a[5]` | 编译期定死 | 退化为指针 | 教学与底层细节 |
| std::array | 编译期定死 | 值拷贝（不退化） | 定长小数据，替代裸数组 |
| std::vector | 运行期可变 | 按需控制 | 一切动态数据（默认选择） |

**心智模型**：std::array 是「记得自己长度的裸数组」，std::vector 是「会自己长大、自己收拾的数组」。教学例题用裸数组是为了看清底层（排序、下标运算），工程代码默认 vector（容器与迭代器全貌在 240 篇）。

## 4. struct：把相关字段打包

### 4.1 定义与聚合初始化

```cpp
#include <iostream>
#include <string>

struct Item {                 // 先定义类型：描述"长什么样"
    std::string name;
    int count;
    double weight;
};

int main() {
    Item potion{"治疗药水", 3, 0.5};        // 聚合初始化：按字段顺序一一对应
    Item empty{};                            // 全字段零值/默认构造

    potion.count += 2;                       // 点号访问成员
    std::cout << potion.name << " x" << potion.count << '\n';

    Item copy = potion;                      // 整体拷贝：每个字段各复制一份
    copy.name = "副本药水";
    std::cout << potion.name << ' ' << copy.name << '\n';
}
```

**逐段讲解**：

1. struct 把「名字、数量、重量」绑成一个整体：函数传参传一个 Item，比传三个散参数清晰得多——参数列表不再可能把数量和重量传反。
2. 聚合初始化按**声明顺序**对应，漏字段则剩余补零值；字段顺序一改，所有按位置初始化的地方都悄悄错位——所以字段较多的 struct 更推荐逐字段赋值或带默认成员初始化器（`int count = 0;`）。
3. `Item copy = potion` 是值拷贝：改 copy 的字段不影响原对象。字段里有 std::string 时拷贝的是字符串内容（string 自己管深拷贝）——若换成裸指针字段，拷贝出来的两个对象会指向同一块内存，那是 130/140 篇智能指针要解决的世界。

### 4.2 游戏角色背包：struct + 数组组合

```cpp
#include <iostream>
#include <string>
#include <array>

struct Item {
    std::string name;
    int count;
};

struct Character {
    std::string name;
    int hp;
    std::array<Item, 8> bag;    // 背包固定 8 格
    int bagUsed = 0;            // 已用格数
};

bool addItem(Character& c, const Item& it) {   // 引用传参：真往背包里放
    if (c.bagUsed >= (int)c.bag.size()) return false;   // 背包满
    c.bag[c.bagUsed++] = it;
    return true;
}

int main() {
    Character hero{"勇者", 100, {}};
    addItem(hero, {"剑", 1});
    addItem(hero, {"治疗药水", 5});
    for (int i = 0; i < hero.bagUsed; ++i) {
        std::cout << hero.bag[i].name << " x" << hero.bag[i].count << '\n';
    }
}
```

**逐段讲解**：

1. struct 套 struct（Character 含 Item 数组）是组织数据的常规操作：一个 Character 变量携带全部状态，「传角色」就是传一个参数。
2. `addItem(Character& c, ...)` 的 `&` 让函数收到原对象的引用（而不是拷贝）——放进去的东西才留得住。这里先记住写法与现象，机制在 055/080 篇展开。
3. 「容量 8 + 已用计数」就是 117 篇超市系统同款的数据组织：复合类型的意义正在于让数组从「一堆散数」变成「有形状的对象」。

### 4.3 位字段：把布尔开关压进一个字节

```cpp
struct Flags {
    unsigned int visible : 1;    // 只占 1 位
    unsigned int movable : 1;
    unsigned int locked : 2;     // 占 2 位：0~3 四个状态
    unsigned int : 0;            // 填充到下一边界
    unsigned int rarity : 3;     // 0~7
};
```

位字段让一个 32 位 unsigned 装下几十个开关——游戏与驱动的常规手段。代价是不能取位字段的地址、跨编译器布局有差异；一般业务代码用 `bool` 数组或 `std::bitset`（040 篇类型系统）更稳。

## 5. 枚举：给整数取名字

### 5.1 问题：魔法数字

```cpp
// 谁记得 2 是什么意思？
int result = fight(2);
```

### 5.2 传统 enum 与 C++11 作用域枚举

```cpp
#include <iostream>

enum Color { RED, GREEN, BLUE };            // 传统 enum：名字进全局，隐式转 int
enum class Weapon { SWORD, BOW, STAFF };    // 作用域枚举：Weapon::SWORD

int main() {
    Color c = GREEN;
    int n = c;                   // 传统枚举可隐式转 int（值 1）

    Weapon w = Weapon::BOW;
    // int m = w;               // 错：enum class 不隐式转换
    int m = static_cast<int>(w); // 需要整数时显式转换
    std::cout << n << ' ' << m << '\n';

    // 与 switch 天作之合（035 篇）：
    switch (w) {
        case Weapon::SWORD: std::cout << "近战\n"; break;
        case Weapon::BOW:   std::cout << "远程\n"; break;
        case Weapon::STAFF: std::cout << "法系\n"; break;
    }
}
```

**逐段讲解**：

1. 传统 enum 的坑：`RED`、`GREEN` 这些名字直接进所在作用域，两个枚举撞名就编译错误；且 `Color c = 5;`（int 隐式转枚举）在 C 风格里居然合法——类型安全形同虚设。
2. `enum class` 三连修：名字要带前缀（`Weapon::BOW`），不隐式转 int，指定底层类型（`enum class Level : unsigned char { ... }`）可控制体积。**新代码一律 enum class**。
3. 三个场景：游戏武器/职业类型（switch 分派技能）；状态机状态（`enum class State { Idle, Running, Paused }`）；配置选项（`enum class LogLevel { Debug, Info, Warn, Error }` 配合比较与输出）。

## 6. 经典算法两例

### 6.1 冒泡与选择：同一道题的两解对照

题面（课件原题）：10 个数按升序排列。

```cpp
#include <iostream>
#include <utility>   // std::swap

void bubbleSort(int a[], int n) {
    for (int i = 0; i < n - 1; ++i) {          // 共 n-1 轮
        for (int j = 0; j < n - 1 - i; ++j) {  // 每轮比到"已沉底"之前
            if (a[j] > a[j + 1]) {
                std::swap(a[j], a[j + 1]);     // 相邻逆序就交换：大的往后冒
            }
        }
    }
}

void selectionSort(int a[], int n) {
    for (int i = 0; i < n - 1; ++i) {
        int minIdx = i;
        for (int j = i + 1; j < n; ++j) {      // 在未排序区找最小
            if (a[j] < a[minIdx]) minIdx = j;
        }
        if (minIdx != i) std::swap(a[i], a[minIdx]);  // 每轮只换一次
    }
}
```

**逐段讲解**：

1. 冒泡是「相邻比较、逐轮沉底」：内层上界 `n - 1 - i` 因为每轮结束时最大的已就位；选择是「找最小、放到最前」：内层只记录下标不急着换。两者都是 O(n²)，但交换次数差一个数量级——选择排序每轮至多一次交换，冒泡最坏每轮都换。
2. `std::swap` 来自 `<utility>`（早期版本在 `<algorithm>`），交换两个变量的值——它内部做的事正是 055 篇 swap 三版迭代要手写的。
3. 对照的意义：同一输入、同一目标、两种思路——排序算法的「直觉版」就是这两兄弟；真正的工程排序用 `std::sort`（270 篇），但看懂这两个才看得懂它快在哪。

### 6.2 回文检测与二维转置

```cpp
// 回文：正读反读一致（用首尾双指针，不用额外数组）
bool isPalindrome(const std::string& s) {
    int lo = 0, hi = (int)s.size() - 1;
    while (lo < hi) {
        if (s[lo] != s[hi]) return false;
        ++lo; --hi;
    }
    return true;
}

// 二维数组行列互换：b[j][i] = a[i][j]
void transpose(int a[3][3], int b[3][3]) {
    for (int i = 0; i < 3; ++i)
        for (int j = 0; j < 3; ++j)
            b[j][i] = a[i][j];
}
```

**逐段讲解**：

1. 回文的双指针版只需 O(1) 额外空间：lo 从头、hi 从尾向中间走，不等即假。把 s 拷一份 reverse 再比也对，但多花一倍内存——「首尾双指针」是字符串/数组题的高频工具。
2. 二维数组 `a[i][j]` 的内存布局是**按行铺平**的：`int a[3][3]` 是「3 个各含 3 个 int 的数组」。转置练习的价值是逼你区分 `[i][j]` 与 `[j][i]`——行列写反不报错，结果错。
3. 二维数组传参与一维同理退化，但第二维必须写死（`int a[][3]`）：编译器要靠它算「每行跨多少字节」。想传任意尺寸的矩阵，用 `std::vector<std::vector<int>>` 或一维数组加手算下标（工程里后者更快，240 篇解释原因）。

## 7. 动手实践

### 任务一：数组统计（热身）

读入 10 个整数存入数组，输出：最大值及其下标、正数个数、全部元素逆序输出（不许真的反转数组，只按倒序打印）。

提示：最大值初始化为 `a[0]` 而不是 0——全负数输入时初始化为 0 会得错答案。

### 任务二：找错——这段字符串代码会怎样（实战）

```cpp
#include <iostream>
#include <cstring>
int main() {
    char name[5] = "Tom";
    strcat(name, " Anderson");
    std::cout << name << '\n';
    std::cout << (name == "Tom" ? "same" : "diff") << '\n';
}
```

提示一：name 只有 5 格，"Tom Anderson" 有几个字符（含 '\0'）？提示二：char 数组的 `==` 在比什么？

**参考实现（先自己写完再展开）**：

```cpp
#include <iostream>
#include <string>
int main() {
    std::string name = "Tom";
    name += " Anderson";                    // string 自动扩容，无越界
    std::cout << name << '\n';
    std::cout << (name == "Tom" ? "same" : "diff") << '\n';  // == 比内容
}
```

原代码两处都是真 bug：`strcat` 向 5 字节的数组追加 8 个字符，越界写未定义行为（030 篇的子弹再次上膛）；`name == "Tom"` 比较的是数组首地址与字面量地址，永远走 "diff"——C 字符串的内容比较是 `strcmp(name, "Tom") == 0`。换 std::string 后两个问题同时消失，这就是「新代码默认 string」的实证。

### 任务三：Fibonacci 与循环右移（综合）

a) 用数组存 Fibonacci 数列前 20 项（`f[0]=f[1]=1`，`f[i]=f[i-1]+f[i-2]`）并打印；b) 把 1..10 的数组循环右移 3 位，得到 `5 6 7 8 9 10 1 2 3 4`。

提示：右移p 位等价于三步——整体反转、反转前 p 个、反转其余；不提示的话三次反转的思路很难现场想出，先允许自己用第二个数组做（简单版），再做原地版。

**参考实现要点（先自己写完再展开）**：

```cpp
// 简单版：借助第二个数组
void rotateSimple(const int a[], int n, int p, int b[]) {
    for (int i = 0; i < n; ++i) {
        b[(i + p) % n] = a[i];    // 原第 i 个元素的新位置
    }
}

// 原地版：三次反转
void reverse(int a[], int lo, int hi) {
    while (lo < hi) std::swap(a[lo++], a[hi--]);
}
void rotateInPlace(int a[], int n, int p) {
    reverse(a, 0, n - 1);
    reverse(a, 0, p - 1);
    reverse(a, p, n - 1);
}
```

## 8. 参考与致谢

- cppreference：array declaration / std::array / std::vector / enumeration declaration 页（https://en.cppreference.com/w/cpp/language/array ，CC BY-SA 许可）——退化规则、聚合初始化与 enum class 语义以官方文档为准，本文代码为原创示例；
- Stephen Prata, *C++ Primer Plus*（第 6 版）第 4 章「复合类型」的主题结构（数组/字符串/结构/枚举/vector-array 对比）；
- 例题（冒泡与选择排序同题两解、Fibonacci 数组版、循环右移、回文检测、二维转置、密码检测）改编自仓库扫描素材的数组讲义例题清单（见 `.workflow-tmp/scan/e-core-c-cpp-godot-net.md` A4 节），全部用 C++ 重写并补充工程场景。
