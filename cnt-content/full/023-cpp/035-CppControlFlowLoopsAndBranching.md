---
order: 40
title: 分支与循环：控制流入门
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: if/else-if/switch 三级递进、for/while/do-while 与范围 for、break/continue、条件运算符与循环三要素心智模型；以一元二次方程求根的三次迭代演示为什么需要分支，练习改编自真实课件题集（闰年、成绩五档、出租车计费、九九乘法表、素数、金字塔），并补输入校验循环等工程场景。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/030-CppBasicSyntax'
  - 'cpp/045-CppCompoundTypesArraysStringsStructs'
  - 'cpp/055-CppFunctionsParamsAndOverloads'
prerequisites:
  - 'cpp/030-CppBasicSyntax'
---

## 知识点地图

- **知识类别**：控制流（control flow）——分支语句（if/switch）与循环语句（for/while/do-while/范围 for），对应 C++ Primer Plus 第 5、6 章与 cppreference Statements 主线。
- **解决什么问题**：程序目前只会从上到下直着走；分支让程序「看情况办事」，循环让程序「重复干活不复制粘贴」。没有它们，一个求根程序连「无实根」都表达不了。
- **什么时候用到**：所有业务判断（成绩分档、计费规则）、所有重复任务（遍历、累加、重试）、所有交互程序的主循环与输入校验。

## 前置知识

- [基本语法与第一个程序](/cpp/030-CppBasicSyntax)：会写 main、会 `std::cin`/`std::cout`、编译运行两步走得通；
- [类型系统](/cpp/040-CppTypeSystem)：知道 int/double/bool 是什么，本文直接使用。

## 学习目标

读完本文你将能够：

1. 用 if / else-if / else 写出互斥的多分支，并用 switch 表达离散取值的分派；
2. 说出循环三要素（初始化、条件、推进）在 for 与 while 里各写在哪个位置；
3. 按「已知次数用 for、先看条件用 while、至少跑一次用 do-while、遍历容器用范围 for」选对循环；
4. 用 break 与 continue 精确控制循环的「跳出」与「跳过」；
5. 独立完成闰年判断、成绩五档、出租车分段计费、九九乘法表、素数判断、金字塔打印六道经典题。

预计 70 分钟，含 1 个找错环节与 3 道动手任务。

## 1. 为什么需要分支：一元二次方程的三次迭代

从真实课件里的一道贯穿例题看「没有分支的程序有多脆」。求 $ax^2+bx+c=0$ 的根，第一版：

```cpp
#include <iostream>
#include <cmath>
int main() {
    double a, b, c;
    std::cin >> a >> b >> c;
    double delta = b * b - 4 * a * c;
    double x1 = (-b + std::sqrt(delta)) / (2 * a);
    double x2 = (-b - std::sqrt(delta)) / (2 * a);
    std::cout << "x1=" << x1 << " x2=" << x2 << '\n';
}
```

输入 `1 2 5`（delta = 4 - 20 = -16）：`std::sqrt(-16)` 返回 `NaN`，程序不崩溃但输出两个 NaN——**程序没有能力表达「无实根」这件事**。第二版加一个保护：

```cpp
if (delta >= 0) {
    double x1 = (-b + std::sqrt(delta)) / (2 * a);
    double x2 = (-b - std::sqrt(delta)) / (2 * a);
    std::cout << "x1=" << x1 << " x2=" << x2 << '\n';
}
// delta < 0 时什么都不输出——还是不完整
```

第三版才真正完整：三分支各答其事。

```cpp
#include <iostream>
#include <cmath>
int main() {
    double a, b, c;
    std::cin >> a >> b >> c;
    double delta = b * b - 4 * a * c;

    if (delta > 0) {
        double x1 = (-b + std::sqrt(delta)) / (2 * a);
        double x2 = (-b - std::sqrt(delta)) / (2 * a);
        std::cout << "两个不等实根: x1=" << x1 << ", x2=" << x2 << '\n';
    } else if (delta == 0) {
        std::cout << "两个相等实根: x=" << -b / (2 * a) << '\n';
    } else {
        std::cout << "无实根（delta = " << delta << " < 0）\n";
    }
}
```

**逐段讲解**：

1. `if (条件)` 的条件是 bool 语境：`delta > 0` 为真走第一支。条件里写 `=` 而不是 `==` 是经典笔误——`if (delta = 0)` 把 0 赋给 delta 再判断，恒为假，编译器大多只给警告（030 篇的 UB 教训在此同理：警告别不当错误）。
2. `else if` 链自上而下逐个检查，命中一支后**整条链结束**——分支互斥不用自己再写判断。
3. 换别的写法会发生什么：把 `delta == 0` 放最前面判断，逻辑等价但阅读顺序反了（先问最常见的再问特例）；浮点相等判断在「算出来的 delta」上其实不可靠（第 040 篇浮点精度），本题 delta 由整数系数算出才敢直接比，一般工程写法是 `std::abs(delta) < 1e-9`。

## 2. if / else-if / else：互斥的多分支

### 2.1 成绩五档（90/80/70/60 分界）

```cpp
#include <iostream>
int main() {
    int score;
    std::cin >> score;

    if (score < 0 || score > 100) {
        std::cout << "非法成绩\n";
    } else if (score >= 90) {
        std::cout << "A\n";
    } else if (score >= 80) {
        std::cout << "B\n";
    } else if (score >= 70) {
        std::cout << "C\n";
    } else if (score >= 60) {
        std::cout << "D\n";
    } else {
        std::cout << "E\n";
    }
}
```

**逐段讲解**：

1. **边界靠继承**：能走到 `score >= 80`，说明前面 `>= 90` 已经不成立——每个条件只写「自己的下界」，等价于区间 `80 <= score < 90`。写成 `score >= 80 && score < 90` 也对，但重复且漏写上界就是 bug（`else if (score >= 80 && score < 90)` 本身没错，错的是有人顺手写成 `> 80`，81 分的同学就掉档了）。
2. **先拦非法值**：`||` 表示「或」，`score < 0 || score > 100` 挡掉输入错误。这个习惯来自真实工程：成绩录错了分档，比不分档更糟。
3. 易错点：`60 <= score <= 100` 在数学里对、在 C++ 里错——它先算 `60 <= score` 得 bool（0 或 1），再用 0/1 与 100 比较，恒为真。取值范围必须拆成两个条件用 `&&` 连接。

### 2.2 出租车分段计费（if 版与 switch 版对照）

题面：三种车型，起步价与单价不同——夏利 3 元起步、超 3 公里每公里 2.1 元；富康 4 元起步、超 3 公里每公里 2.4 元；桑塔纳 5 元起步、超 3 公里每公里 2.7 元。

```cpp
#include <iostream>
int main() {
    int carType;      // 1 夏利 2 富康 3 桑塔纳
    double km;
    std::cin >> carType >> km;

    double base = 0, perKm = 0;
    switch (carType) {
        case 1: base = 3.0; perKm = 2.1; break;   // 每个 case 以 break 收尾
        case 2: base = 4.0; perKm = 2.4; break;
        case 3: base = 5.0; perKm = 2.7; break;
        default: std::cout << "无此车型\n"; return 1;
    }

    double fare = base;
    if (km > 3) {
        fare += (km - 3) * perKm;    // 分段：起步价覆盖前 3 公里
    }
    std::cout << "车费 " << fare << " 元\n";
}
```

**逐段讲解**：

1. `switch` 适合「离散取值分派」：carType 是 1/2/3 的整数标签。`case` 只是入口标签，**不写 break 会一路穿透到下一个 case**（fall-through）——忘了 break，选夏利会被富康的单价覆盖，逻辑错但不报错，是课件易错点清单的第一条。
2. `default` 兜住非法输入，所有 switch 都该写 default（哪怕只打一行日志）；C++ 对「枚举 switch 漏分支」有 `-Wswitch` 警告，配合 420 篇会讲的 `[[nodiscard]]` 类属性能进一步收紧。
3. 分段计费的「分段」落在 if 里：起步价管前 3 公里，超出部分按单价补差。换别的写法：全部用 if-else 判 carType 也能跑，但三种车型七种组合的嵌套深度会失控——课件总结原话「不提倡 if 内嵌 switch」「if_else 嵌套过深降低效率与可读性」。
4. `case` 里声明变量要加花括号（`case 1: { double t = ...; }`），否则跨 case 的变量声明会编译报错。

## 3. 循环：三要素与四种写法

### 3.1 循环三要素心智模型

每个循环都在回答三个问题（课件原话的工程版）：

| 要素 | 问题 | 在 for 里的位置 |
| --- | --- | --- |
| 初始化 | 从哪开始？ | `for (int i = 0; ...)` 第一段 |
| 条件 | 什么时候停？ | 第二段，每轮开头检查 |
| 推进 | 怎么走向结束？ | 第三段，每轮结尾执行 |

**三要素缺一即是死循环**：忘了推进（`i++` 漏写）是最常见的一种。检查任何死循环，先按这三问过一遍。

### 3.2 for / while / do-while 三种写法同一道题

同一道「打印 1 到 5」：

```cpp
for (int i = 1; i <= 5; ++i) {
    std::cout << i << ' ';
}

int j = 1;                 // 初始化在循环外
while (j <= 5) {           // 先判断，可能一次都不执行
    std::cout << j << ' ';
    ++j;                   // 推进在循环体内
}

int k = 1;
do {                       // 先执行后判断，至少执行一次
    std::cout << k << ' ';
    ++k;
} while (k <= 5);
```

**选型规则**：

- **已知次数** → for：次数、变量、推进一目了然；
- **不知道次数、先看条件** → while：例如「读输入直到 EOF」；
- **必须至少跑一次** → do-while：例如「先显示菜单再问要不要继续」。

三种循环可以互相转换（课件用同一道「10 道加减乘除测验题」演示过三写法），所以选型是可读性问题而非能力问题。

**易错点**：do-while 的 `while (条件)` 后面有**分号**，漏写编译报错；while 的条件永远为真且体内无 break/return 就是死循环。

### 3.3 范围 for：遍历容器专用（C++11）

```cpp
#include <iostream>
#include <string>

int main() {
    std::string s = "hello";
    for (char ch : s) {          // 逐字符遍历，下标都不用写
        std::cout << ch << ' ';
    }

    int arr[] = {10, 20, 30};
    for (int x : arr) {
        std::cout << x << ' ';
    }
    // 要修改元素时用引用：
    for (int& x : arr) {
        x *= 2;
    }
}
```

`for (int x : arr)` 把每个元素**拷贝**进 x；`for (int& x : arr)` 用引用直达元素、可修改且免拷贝。范围 for 不能用来「跳着走」或反向走——那些需求回到下标 for（vector/array 详见 045 篇）。

## 4. break、continue 与条件运算符

### 4.1 九九乘法表：嵌套循环模板

```cpp
#include <iostream>
int main() {
    for (int i = 1; i <= 9; ++i) {          // 外层控行
        for (int j = 1; j <= i; ++j) {      // 内层控列，列数随行号增长
            std::cout << j << '*' << i << '=' << j * i << '\t';
        }
        std::cout << '\n';                  // 每行结束换行
    }
}
```

**逐段讲解**：外层 i 是行号，内层 j 跑到 i 为止——内层边界依赖外层变量，这是「三角形/金字塔」类打印的通用模板。金字塔打印只是再加一个内层循环先打空格：第 i 行打 `9 - i` 个空格、`2*i - 1` 个星号（见动手任务三）。

### 4.2 break 与 continue：素数判断

```cpp
#include <iostream>
int main() {
    int n;
    std::cin >> n;
    bool isPrime = true;
    for (int d = 2; d * d <= n; ++d) {   // 试除到 sqrt(n) 即可
        if (n % d == 0) {
            isPrime = false;
            break;                        // 找到因子，不必再试：跳出整个循环
        }
    }
    std::cout << n << (n > 1 && isPrime ? " 是素数" : " 不是素数") << '\n';
}
```

```cpp
// continue：跳过本轮，打印 100~200 中不能被 3 整除的数
for (int i = 100; i <= 200; ++i) {
    if (i % 3 == 0) {
        continue;    // 跳到下一轮（for 跳到 i++ 那一段）
    }
    std::cout << i << ' ';
}
```

**逐段讲解**：

1. `break` 跳出**最近一层**循环；`continue` 只跳过**本轮剩余语句**。语义区别一句话：break 是「不干了」，continue 是「这个不要，下一个」。
2. continue 在 for 里跳到「推进表达式」（i++），在 while/do-while 里直接跳到条件判断——若推进语句写在循环体末尾，while 里用 continue 会**跳过推进造成死循环**，这是两种循环在 continue 上的真实差异。
3. 试除上界写 `d * d <= n` 而不是 `d <= sqrt(n)`：省一次浮点转换与头文件。课件补充题「不用 continue 改写」的答案就是把条件翻过来：`if (i % 3 != 0) std::cout << i << ' ';`——continue 永远可以用条件取反改写，可读性二选一。
4. 条件运算符 `? :` 是「返回值的 if」：`n > 1 && isPrime ? "是" : "不是"`。判断逻辑简单时它最紧凑；嵌套两层以上就换 if，可读性优先（课件连「每月天数」都给过三目运算符版，但那是展示语法，不是推荐写法）。

## 5. 工程场景：输入校验循环

交互程序的经典骨架——「输入不合法就重问」，把 do-while、break、状态分支串起来：

```cpp
#include <iostream>
#include <limits>
#include <string>

int readIntInRange(const std::string& prompt, int lo, int hi) {
    int value;
    while (true) {                                   // 服务循环：直到拿到合法值
        std::cout << prompt;
        if (std::cin >> value && value >= lo && value <= hi) {
            return value;                            // 合法：返回即出口
        }
        std::cin.clear();                            // 清除 fail 状态（输入 abc 时的必做步骤）
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');  // 丢弃坏输入
        std::cout << "请输入 " << lo << " 到 " << hi << " 之间的整数\n";
    }
}

int main() {
    int age = readIntInRange("年龄(1-120): ", 1, 120);
    std::cout << "收到: " << age << '\n';
}
```

**逐段讲解**：

1. `while (true)` + return 的写法把「重试」交给循环、「成功」交给 return，出口唯一。换成 `do { cin >> v; } while (v < lo || v > hi);` 也能跑，但用户输入字母时 `cin` 进入失败态，v 不再更新，同样死循环——**输入校验的关键不是循环结构，是处理 cin 的失败状态**。
2. `cin.clear()` 复位错误标志，`cin.ignore(...)` 把缓冲区里的坏字符扔掉，两步缺一不可：只 clear 不 ignore，坏字符还在缓冲区，下一轮继续失败。
3. 这个模式在真实工程里无处不在：菜单主循环、配置端口范围、游戏里的年龄/数量输入。第 030 篇的 cin/cout 只完成「读一次」，这里补上「读对为止」的完整闭环。

## 6. 动手实践

### 任务一：闰年与季节（热身）

写程序输入年份：输出「闰年/平年」（能被 400 整除，或能被 4 整除但不能被 100 整除）；再用月份 1-12 输出季节（3-5 春、6-8 夏、9-11 秋、12/1/2 冬），分别用 if-else 与 switch 各写一版季节判断，对比哪个更顺眼。

提示：闰年条件 `(year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)`；switch 版的 12/1/2 三个月可以「故意」利用 case 穿透写成 `case 12: case 1: case 2: ...`——这是穿透唯一的正当用途。

**参考实现要点（先自己写完再展开）**：

```cpp
bool isLeap(int year) {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

std::string seasonOf(int month) {   // switch 版
    switch (month) {
        case 3: case 4: case 5:   return "春";
        case 6: case 7: case 8:   return "夏";
        case 9: case 10: case 11: return "秋";
        case 12: case 1: case 2:  return "冬";
        default:                  return "非法月份";
    }
}
```

### 任务二：找错——这段循环为什么停不下来（实战）

```cpp
#include <iostream>
int main() {
    int n = 100;
    while (n != 0) {
        if (n % 2 == 0) {
            std::cout << n << " 偶数\n";
            continue;
        }
        std::cout << n << " 奇数\n";
        n--;
    }
}
```

提示：continue 在 while 里跳去了哪里？推进语句 `n--` 还能被执行到吗？

**参考实现（先自己写完再展开）**：

```cpp
int main() {
    int n = 100;
    while (n > 0) {              // 顺手把 != 0 换成 > 0，防负数意外
        if (n % 2 == 0) {
            std::cout << n << " 偶数\n";
            n--;                 // 修正：continue 跳过了 n--，必须自己推进
            continue;
        }
        std::cout << n << " 奇数\n";
        n--;
    }
}
```

原代码 n 为偶数时 `continue` 直接跳回条件判断，`n--` 永远不执行，n 卡在 100 死循环。这正是 continue 在 while 与 for 里的差异：for 的推进写在第三段，continue 跳过去时推进照样执行，while 的推进写在体内就危险。另一个修法是改用 for 循环，把推进交给第三段。

### 任务三：金字塔打印（综合）

输入行数 n（用第 5 节的 `readIntInRange` 校验 1-20），打印居中金字塔：第 i 行有 `n - i` 个空格与 `2*i - 1` 个星号。

提示：三层嵌套——行循环里先打空格循环再打星号循环；先在纸上画出 i=3、n=5 的一行数一数再动手。

**参考实现要点（先自己写完再展开）**：

```cpp
for (int i = 1; i <= n; ++i) {
    for (int s = 0; s < n - i; ++s) std::cout << ' ';
    for (int t = 0; t < 2 * i - 1; ++t) std::cout << '*';
    std::cout << '\n';
}
```

### 任务四：出租车计费 switch 版迁移

把第 2.2 节的出租车程序补上第 5 节的输入校验（车型 1-3、公里数 0.1-1000），并新增第 4 种车型「新能源：起步 2 元、超 3 公里每公里 1.8 元」——只许改 switch 的 case 与数据，不许动计费逻辑。

提示：能只改数据就加车型，说明「分派」与「计费」分得够开；这正是 055 篇函数拆分的前奏。

## 7. 参考与致谢

- ISO C++ 标准与 cppreference：Statements 页（https://en.cppreference.com/w/cpp/language/statements ，CC BY-SA 许可）——if/switch/for/while/do 的语义与 fall-through 规则以官方文档为准，本文代码为原创示例；
- Stephen Prata, *C++ Primer Plus*（第 6 版）第 5 章「循环和关系表达式」、第 6 章「分支语句和逻辑运算符」的主题划分（本文为其入门前置，代码自写）；
- 分支与循环例题（一元二次方程贯穿例、闰年、成绩五档、出租车计费、九九乘法表、素数、金字塔、continue 纠错题）改编自仓库扫描素材的 C 课件题集（见 `.workflow-tmp/scan/e-core-c-cpp-godot-net.md` A1/A3 节），全部用现代 C++ 语法重写。
