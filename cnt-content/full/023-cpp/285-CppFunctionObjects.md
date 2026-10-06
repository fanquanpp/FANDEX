---
order: 300
title: 函数对象与可调用对象
difficulty: beginner
description: 仿函数、lambda、函数指针、std::function 与成员函数指针的统一视角：三种排序谓词写法的性能对照、priority_queue 自定义比较器、std::function 持有 shared_ptr 的 UI 回调表，以及「当模板参数还是当运行时值」的选型。
module: 'cpp'
category: 计算机科学
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：标准库 - 函数对象与可调用对象（`<functional>`）。
- **解决什么问题**：STL 算法的最后一个参数、容器的比较器、回调注册接口——这些位置都需要「一段可执行的行为」。C++ 里有五种东西能填上去：函数指针、仿函数、lambda、`std::function`、成员函数指针。它们能力重叠但语义与成本差异巨大：选错轻则性能损失（`std::function` 妨碍内联），重则悬垂（捕获引用的 lambda 存进回调表）。
- **什么时候用到**：给 `sort`/`priority_queue`/`unordered_map` 提供谓词与比较器；设计回调接口（UI 事件、网络完成通知、任务队列）；把「行为」当数据存储和传递。

分工声明：lambda 的**语法与捕获机制**（捕获列表、初始化捕获、`mutable`）在 [Lambda 表达式](/cpp/060-LambdaExpression) 与 [Lambda 捕获深水区](/cpp/070-LambdaCaptureDetailed) 完整讲解；本篇把 lambda 当作「一种函数对象」放在可调用对象的统一图景里，只讲它与 STL 衔接时的选型问题。STL 算法本体见 [STL 算法库全解](/cpp/270-CppSTLAlgorithms)。

预计 60 到 90 分钟。

## 1. 统一心智模型：可调用对象 = 数据 + 应用算子

任何可调用对象都可以拆成两部分：

```text
可调用对象 = 捕获的状态 + operator()（或等价的调用方式）

函数指针：        状态 = 无；        调用 = 间接寻址
仿函数（类）：    状态 = 成员变量；  调用 = operator()，类型内联可见
lambda：         状态 = 捕获成员；  调用 = 编译器生成的匿名仿函数
std::function：  状态 = 任意（类型擦除）；调用 = 一次间接层
成员函数指针：    状态 = 对象引用；  调用 = (.*) / (->*)
```

「lambda 就是仿函数」是本篇最重要的等式——编译器把每个 lambda 翻译成一个独一无二的匿名类，捕获列表就是它的成员变量。理解了这一点，lambda 的行为（默认按值捕获不可变、捕获引用的悬垂、无捕获可转函数指针）全部可以推导出来。

## 2. 五种写法逐一拆解

### 2.1 函数指针：C 遗产，行为即地址

```cpp
bool cmp_desc(int a, int b) { return a > b; }

std::sort(v.begin(), v.end(), cmp_desc);        // 函数名隐式转指针
std::sort(v.begin(), v.end(), &cmp_desc);       // 等价显式写法
```

特点：无状态、类型精确（`bool(*)(int,int)`）、可空可比较可存进 struct。代价：通过指针的间接调用，**除非编译器能内联展开调用点，否则无法内联函数体**——热路径上这就是仿函数与函数指针的差距来源。另外它装不下「带状态的谓词」，需要状态就得退回全局变量或静态区。

### 2.2 仿函数：有状态的行为（承接自原 280 篇的核心示例）

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

// 加法器仿函数：构造时绑定偏移量，operator() 应用它
class Add {
public:
    explicit Add(int v) : value_(v) {}
    int operator()(int x) const { return x + value_; }   // const：不修改捕获的状态
private:
    int value_;
};

// 比较器仿函数：降序
class CompareDesc {
public:
    bool operator()(int a, int b) const { return a > b; }
};

int main() {
    std::vector<int> vec{1, 2, 3, 4, 5};

    std::transform(vec.begin(), vec.end(), vec.begin(), Add(10));
    // vec: 11 12 13 14 15 —— Add(10) 是对象，被按值传入算法，逐元素调用

    std::sort(vec.begin(), vec.end(), CompareDesc());
    // vec: 15 14 13 12 11
}
```

逐行解释：

- `operator()` 是关键：重载了它，对象就能像函数一样 `add5(10)` 调用；「函数对象」由此得名；
- 状态放成员而不是全局：同一算法可以并发使用两个不同的 `Add` 实例，互不干扰——这是函数指针做不到的；
- `const` 修饰 `operator()`：算法可能以 const 引用持有谓词，非 const 版本会匹配失败（`std::for_each` 的谓词状态累积问题见 2.6 易错点）；
- 仿函数类型在调用点是**具体类型**，编译器必然内联 `operator()`——这是它比函数指针快、比 `std::function` 快的根本原因。

### 2.3 lambda：匿名仿函数的语法糖

```cpp
int threshold = 100;
auto is_big = [threshold](int x) { return x > threshold; };  // 编译器生成：
// class __lambda_1 {
//     int threshold;                                   // 按值捕获 = 成员
// public:
//     bool operator()(int x) const { return x > threshold; }
// };
```

与 STL 衔接的选型规则只有两条：

- **就地一次性使用**（排序、查找、过滤）：直接写 lambda，最短路径；
- **要跨函数/跨模块复用、或有名字的业务谓词**：命名函数或具名仿函数——`auto` 类型的 lambda 无法出现在头文件的函数签名里（C++20 前连模板参数都难），具名类型才能进接口。

无捕获 lambda 可以隐式转换为函数指针，这是它与 C 回调 API（qsort、pthread_create）衔接的桥。

### 2.4 std::function：类型擦除的容器

```cpp
#include <functional>
#include <map>
#include <string>

using Handler = std::function<void(const std::string&)>;

std::map<std::string, Handler> handlers;             // 同一个 map 存不同类型的可调用对象
handlers["click"] = [](const std::string& s) { /* ... */ };
handlers["key"]   = MyFunctor{42};                   // 仿函数也能装
handlers["quit"]  = &quit_function;                  // 函数指针也能装
```

`std::function<R(Args...)>` 能装下任何「可以用这些参数调用并返回 R」的东西。代价必须清楚：

- **类型擦除的间接层**：调用经过一次（可能的）间接跳转，且通常**阻碍内联**，小谓词在热循环里用它可以慢数倍；
- **可能的堆分配**：装不进其内部缓冲（典型 16-32 字节）的可调用对象会触发堆分配——带大捕获的 lambda 每次构造都在 malloc；
- `std::function` 为空时调用抛 `std::bad_function_call`。

选型口诀：**接口边界（存起来、传出去、类型不定的场合）用 `std::function`；算法参数（用完即弃、追求内联）用模板参数或 auto**。

```cpp
// 算法参数：模板——零开销
template <typename Pred>
void filter(std::vector<int>& v, Pred p);            // 谓词类型编译期已知，必然内联

// 接口边界：std::function——灵活性
void set_on_complete(std::function<void()> cb);      // 调用方传什么都行
```

### 2.5 成员函数指针：把「方法」当回调

```cpp
#include <functional>
#include <iostream>

struct Server {
    void on_message(const std::string& msg) { std::cout << msg << '\n'; }
};

int main() {
    Server s;
    void (Server::*mp)(const std::string&) = &Server::on_message;
    (s.*mp)("hello");                                // 调用语法特殊：必须绑定对象

    // 更常用的现代写法：成员函数包成 lambda 或用 mem_fn
    auto cb = [&s](const std::string& msg) { s.on_message(msg); };
    cb("hello");
    std::mem_fn(&Server::on_message)(s, "hello");    // 统一调用形式
}
```

易错点：成员函数指针不是普通指针（可能比 void* 还大，含虚函数调整信息），不能转 void* 存储；现代代码里「lambda 捕获对象引用」几乎总是更清晰的替代。

## 3. 三个工程场景

### 场景一：排序谓词三写法性能对照

同一个「按分数降序」的谓词，三种写法放在基准里对比：

```cpp
#include <algorithm>
#include <chrono>
#include <functional>
#include <iostream>
#include <vector>

bool cmp_fnptr(int a, int b) { return a > b; }       // 写法 1：函数指针

struct CmpFunctor {                                  // 写法 2：仿函数
    bool operator()(int a, int b) const { return a > b; }
};

int main() {
    std::vector<int> base(1'000'000);
    for (auto& x : base) x = static_cast<int>(rand());

    auto bench = [](const char* name, auto do_sort) {
        std::vector<int> v = base;
        auto t0 = std::chrono::steady_clock::now();
        do_sort(v);
        auto t1 = std::chrono::steady_clock::now();
        std::cout << name << ": "
                  << std::chrono::duration_cast<std::chrono::milliseconds>(t1 - t0).count()
                  << " ms\n";
    };

    bench("function ptr ", [](std::vector<int>& v) { std::sort(v.begin(), v.end(), cmp_fnptr); });
    bench("functor       ", [](std::vector<int>& v) { std::sort(v.begin(), v.end(), CmpFunctor{}); });
    bench("lambda        ", [](std::vector<int>& v) { std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; }); });
    bench("std::function ", [](std::vector<int>& v) {
        std::function<bool(int,int)> f = cmp_fnptr;
        std::sort(v.begin(), v.end(), f);            // 谨慎：类型擦除进热路径
    });
}
```

典型结果（-O2，x64）：functor 与 lambda 基本相同且最快；函数指针慢一档（比较器无法内联，`sort` 内层每次比较多一次间接跳转）；`std::function` 再慢一档。结论不是「永远别用函数指针」，而是：**热路径的谓词选 lambda/仿函数，让类型抵达编译器**。

### 场景二：priority_queue 携带自定义比较器

```cpp
#include <queue>
#include <string>
#include <vector>

struct Task {
    int priority;
    std::string name;
};

// 大顶堆默认取「最大」；任务系统想要「优先级数值最小者先出」
struct TaskEarlier {
    bool operator()(const Task& a, const Task& b) const {
        return a.priority > b.priority;      // 返回 true 表示 a 的优先级「低」于 b
    }
};

std::priority_queue<Task, std::vector<Task>, TaskEarlier> ready;
ready.push({5, "gc"});
ready.push({1, "heartbeat"});
// ready.top() 是 heartbeat：比较器为真时 a 排在 b 后面
```

逐行解释：

- 第三个模板参数必须是**具体类型**（不能是 `auto`），所以这里用仿函数而不是 lambda——想在容器模板参数里写 lambda，得 C++20 的无状态 lambda 类型：`std::priority_queue<Task, std::vector<Task>, decltype([](const Task& a, const Task& b){ return a.priority > b.priority; })>`，可读性差，团队代码建议老实用仿函数；
- `std::greater<Task>` 搭配 `operator<` 也能做，但给业务类型重载 `<` 语义模糊（分数低算「小」还是「优先」？），显式仿函数把语义写在类型名里；
- 易错点：比较器**必须提供严格弱序**——`!(a<b) && !(b<a)` 视为等价。写 `a >= b` 这种「带等号的比较」会破坏严格弱序，sort 直接越界崩溃（UB），priority_queue 行为错乱。这是比较器第一大陷阱。

### 场景三：std::function 持有 shared_ptr 的 UI 回调表

工程背景：GUI/游戏 UI 的事件系统里，控件（按钮）要在销毁后不再回调已释放的界面。经典方案是回调签名里用 `weak_ptr` 表达「弱引用观察者」：

```cpp
#include <functional>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

class Button {
public:
    using Handler = std::function<void()>;      // 回调类型：零参最常见
    void add_handler(Handler h) { handlers_.push_back(std::move(h)); }
    void click() {
        for (auto& h : handlers_) h();          // 逐个触发
    }
private:
    std::vector<Handler> handlers_;
};

class Panel {                                    // 观察者：生命周期长于注册行为
public:
    explicit Panel(std::string name) : name_(std::move(name)) {}
    void flash() { std::cout << "panel " << name_ << " flashed\n"; }
private:
    std::string name_;
};

int main() {
    Button btn;
    auto panel = std::make_shared<Panel>("main");

    btn.add_handler([panel] { panel->flash(); });   // 按值捕获 shared_ptr：
                                                     // 回调表持有强引用，panel 保证存活
    btn.click();

    // 若 Panel 可能先于 Button 死亡，改持弱引用：
    std::weak_ptr<Panel> weak = panel;
    btn.add_handler([weak] {
        if (auto p = weak.lock()) p->flash();       // 还活着才回调
        else std::cout << "panel gone, skip\n";
    });
    btn.click();

    panel.reset();                                  // Panel 销毁
    btn.click();                                    // 第二个回调安全跳过
}
```

逐段解释：

- `std::move(h)` 进容器：`std::function` 可能含堆分配，能移则移；
- 第一个回调按值捕获 `shared_ptr`：引用计数 +1，按钮持有着 Panel 的生命——**回调表会延长对象寿命**，形成隐式所有权，架构上要有意识；
- 第二个回调捕获 `weak_ptr`：不延长寿命，`lock()` 是「用时检查」的标准姿势。两者选哪个取决于所有权设计——控件属于面板（强），面板只是监听控件（弱）。

这个场景同时演示了本篇两个主角的配合：`std::function` 提供异构回调的存储，lambda + 智能指针提供生命周期的正确性。

## 4. 标准库自带的函数对象

`<functional>` 提供的透明运算符仿函数，优先于手写：

```cpp
std::sort(v.begin(), v.end(), std::greater<int>{});   // 降序，替代手写 cmp
std::transform(a.begin(), a.end(), b.begin(), out.begin(), std::plus<int>{});
std::accumulate(v.begin(), v.end(), 1, std::multiplies<int>{});
```

- `std::less` / `greater` / `plus` / `minus` / `multiplies` / `logical_and` 等覆盖基本运算；
- 写成 `std::greater<>`（无模板参数的「透明」版本）让比较器按实参推导，混合类型比较不发生多余转换，也是关联容器异构查找的前提；
- 与位运算相关的是 `std::bit_and` / `bit_or` / `bit_xor`，配合 `std::transform` 做掩码运算。

C++20 后配合 Concepts（[Concepts](/cpp/410-Cpp20Concept)）可以用 `std::invocable<F, Args...>` 约束「这个参数必须是能这样调用的东西」——把「可调用」本身变成接口契约。

## 5. 易错点清单

1. **比较器写 `<=`**：破坏严格弱序，`std::sort` 未定义行为（glibc 下直接越界崩溃）。比较器只回答「a 是否严格排在 b 前」。
2. **有状态谓词配合算法**：`std::remove_if`/`sort` 不保证谓词调用次数与顺序，仿函数里的计数器/状态累积不可依赖；`for_each` 是唯一承诺「按序、单次」的算法，需要累积状态用它。
3. **const 缺失**：算法以 const 方式持有谓词时，非 const `operator()` 匹配失败，报错信息难读——默认给 `operator()` 加 const。
4. **lambda 按引用捕获后存入回调表**：局部变量死了，回调悬垂。跨作用域存回调，捕获值或智能指针（场景三的模式）。
5. **`std::function` 进热循环**：类型擦除 + 无法内联，逐元素谓词场景改模板参数；`std::function` 留给接口边界。
6. **无捕获 lambda 转函数指针后再捕获上下文**：转过去的指针只认全局态，忘了这点就在 C API 回调里引用野数据。

## 6. 动手实践

### 练习一（必做）：谓词三写法实测

任务：把 3 场景一的基准程序跑起来（或写一个等价的），记录四种写法（函数指针/仿函数/lambda/`std::function`）的耗时；把元素量改成 10 万与 1000 万各跑一遍，回答：差距是常数还是比例？结论写三句话。

提示：用 `-O2` 编译；`std::function` 版的慢主要来自比较点的间接调用，可以再看 [性能优化](/cpp/610-CppPerformance) 的测量纪律确认热点。

<details>
<summary>参考实现要点（先自己写再看）</summary>

```cpp
// 关键骨架（完整程序见 3 节场景一）
bench("functor", [](std::vector<int>& v) {
    std::sort(v.begin(), v.end(), CmpFunctor{});
});
```

自检要点：functor 与 lambda 应当几乎重合（lambda 就是仿函数）；函数指针差距应随元素量放大成比例（每次比较都付间接跳转税）；如果四条曲线重合，检查是不是忘了 -O2，或基准被编译器整体消除（比较器结果没有副作用，sort 本身有副作用通常不会被消除，但仍建议打印 v[0] 兜底）。

</details>

### 练习二（选做）：弱引用回调表

任务：把 3 节场景三的按钮程序扩展成「三个订阅者，两个强一个弱」，然后销毁弱引用对象再 click，验证安全跳过；再把强引用订阅者销毁前先从按钮移除（给 Button 加按 id 移除的接口），思考哪一种所有权设计更不容易出错。

提示：给每个 Handler 配一个 id 返回值方便移除；思考题的方向是「强引用造成隐式生命周期延长」vs「弱引用造成静默失效」各自的调试体验。

### 练习三（挑战，不给参考实现）

把你项目里一个 `std::function<void(...)>` 的热路径回调改成模板参数版本，用 Google Benchmark（见 [调试与性能分析](/cpp/630-CppDebugPerformanceAnalysis) 3.0 节）量化差异；若差距不到 5%，在代码注释里写下「此处用 std::function 的理由」，让后来的读者不必重测。

## 7. 与之前和之后的知识的关系

- 往前：[Lambda 表达式](/cpp/060-LambdaExpression) 与 [Lambda 捕获深水区](/cpp/070-LambdaCaptureDetailed) 讲「怎么写 lambda」，本篇回答「什么时候该用它、它和仿函数本质相同」；[STL 算法库全解](/cpp/270-CppSTLAlgorithms) 是谓词的消费方；[STL 容器与迭代器](/cpp/240-CppSTLContainersIterators) 的关联容器自定义比较器是本篇场景二的完整版背景。
- 往后：[Concepts](/cpp/410-Cpp20Concept) 的 `std::invocable` 把「可调用」写进接口契约；[并发编程](/cpp/430-MultithreadingConcurrency) 的 `std::thread` 构造参数就是可调用对象，本篇的悬垂规则（按值捕获）在线程里同样适用。

## 8. 官方文档

- cppreference 函数对象：https://en.cppreference.com/w/cpp/utility/functional
- std::function：https://en.cppreference.com/w/cpp/utility/functional/function
- 严格弱序要求（Compare 命名要求）：https://en.cppreference.com/w/cpp/named_req/Compare

## 参考与致谢

- 本文原「仿函数与函数对象」示例代码改写自本仓库旧篇 280-CppSTLAlgorithmAndFunctionObject（仓库自有内容，已随拆分退役），并补充状态、const 与内联视角的讲解。
- 严格弱序破坏导致 sort 崩溃的表述依据 cppreference.com（CC-BY-SA 3.0 许可）Compare 命名要求条目：https://en.cppreference.com/w/cpp/named_req/Compare
