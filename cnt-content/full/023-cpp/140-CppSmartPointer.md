---
order: 140
title: C++ 智能指针深水区：控制块、线程边界与删除器
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: 主教学之后的机制与工程细节——控制块与 make_shared 缓存友好实验、shared_ptr 线程安全三级边界与 TSan 实录、enable_shared_from_this 的必要场景与误用崩溃、FILE* 自定义删除器，以及性能敏感路径上连 shared_ptr 都不用的纪律。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'cpp/130-SmartPointerDeepDive'
  - 'cpp/150-SmartPointerCircularReference'
  - 'cpp/160-RAIIResourceManagement'
  - 'cpp/120-CppPointers'
prerequisites:
  - 'cpp/130-SmartPointerDeepDive'
---

## 前置知识

- 已完成 [智能指针](/cpp/130-SmartPointerDeepDive)：会用 `make_unique`/`make_shared`，跑过 `use_count` 实验，能说出「独占 / 共享 / 观察」三分法；
- [C++ 指针](/cpp/120-CppPointers) 的栈与堆地址直觉——报错里 `0x7ffd` 开头的栈地址会反复出现。

> 分工说明：130 立模型，本篇拆机制：控制块与分配次数、shared_ptr 的线程安全边界、enable_shared_from_this、自定义删除器，以及「什么时候连 shared_ptr 都不要」的传参纪律。use_count 实验、循环引用破环不再重复（破环细节在 [循环引用](/cpp/150-SmartPointerCircularReference) 展开）。两篇示例互不重复。

## 学习目标

读完本文你将能够：

1. 画出控制块里有什么，解释 make_shared 与 `shared_ptr(new T)` 的分配次数差异及各自的代价；
2. 复述 shared_ptr 线程安全的三级边界，并用 ThreadSanitizer 定位一次数据竞争；
3. 说出 enable_shared_from_this 解决什么问题，两种误用各以什么报错收场；
4. 用自定义删除器把 FILE* 包成异常安全的 RAII 类型，说清删除器在两类指针里的存储差异；
5. 在性能敏感路径上按「只看不拥有」纪律选择参数类型。

预计 60 到 90 分钟。

## 1. 控制块与两次分配

shared_ptr 本体是两个指针：一个指向对象，一个指向**控制块**（control block，一块隐藏的堆内存，装着强计数、弱计数、删除器与分配器）。这就是 130 篇说过「shared_ptr 比裸指针大」的原因，量一下：`sizeof(std::unique_ptr<int>)` 是 8，`sizeof(std::shared_ptr<int>)` 与 `sizeof(std::weak_ptr<int>)` 都是 16（64 位平台）——多出的 8 字节就是控制块指针。

创建方式决定控制块和对象是否挤在同一块内存：`shared_ptr<Sample>(new Sample)` 要 `new` 对象、再分配控制块，共两次分配；`make_shared<Sample>()` 把「控制块 + Sample 对象」合成一块连续内存、一次分配搞定。

少一次 malloc 是小事，真正的收益是**缓存友好**——对象和计数器挨着，访问对象时计数多半已在同一条缓存行里：

```cpp
#include <chrono>
#include <iostream>
#include <memory>
#include <vector>

struct Sample { int data[64]; };   // 256 字节

template<typename Make>
void timed(const char* label, Make make) {
    auto start = std::chrono::steady_clock::now();
    std::vector<std::shared_ptr<Sample>> pool;
    pool.reserve(100000);
    for (int i = 0; i < 100000; ++i) pool.push_back(make());
    auto stop = std::chrono::steady_clock::now();
    std::cout << label << ": "
              << std::chrono::duration_cast<std::chrono::milliseconds>(stop - start).count()
              << " ms\n";
}

int main() {
    timed("make_shared", [] { return std::make_shared<Sample>(); });
    timed("new + 接管",  [] { return std::shared_ptr<Sample>(new Sample); });
}
```

典型输出（绝对值依机器波动）：

```text
make_shared: 4 ms
new + 接管:  7 ms
```

这枚硬币有反面：对象与控制块合体后，**只要还有一个 weak_ptr 活着，整块内存就不还**——对象早已析构，内存却占着（150 篇会讲 weak 计数的用途）。大对象配长命 weak_ptr 时，`new` 版的两次分配反而省内存。另外 make_shared 传不进自定义删除器——那是下一节的工具。

## 2. shared_ptr 的线程安全边界：计数安全，对象不安全

三级边界，一条比一条容易踩：

1. **不同线程各持指向同一对象的拷贝**——安全。强计数是原子的，各线程的拷贝增减互不干扰；
2. **多线程读写同一个 shared_ptr 实例**（同一个变量）——不安全，要加锁；
3. **通过 shared_ptr 读写所指对象**——不安全。shared_ptr 只管生死，不管排队。

实验验证第三条，四个线程各拿一份拷贝，同时递增同一个对象：

```cpp
#include <iostream>
#include <memory>
#include <thread>
#include <vector>

struct Counter { int value = 0; };

int main() {
    auto counter = std::make_shared<Counter>();
    std::vector<std::thread> workers;
    for (int t = 0; t < 4; ++t) {
        workers.emplace_back([counter] {          // 按值捕获：每线程一份拷贝
            for (int i = 0; i < 100000; ++i) {
                counter->value += 1;              // 计数安全救不了这里
            }
        });
    }
    for (auto& w : workers) w.join();
    std::cout << "期望 400000, 实得 " << counter->value << '\n';
}
```

典型输出（每次不同，几乎从不等于 400000）：

```text
期望 400000, 实得 231845
```

ThreadSanitizer 点名（`g++ -std=c++17 -fsanitize=thread race.cpp && ./a.out`）：

```text
==================
WARNING: ThreadSanitizer: data race (pid=24512)
  Read of size 4 at 0x7fc... by thread T2: <lambda()> ::value
  Previous write of size 4 at 0x7fc... by thread T1: <lambda()> ::value
SUMMARY: ThreadSanitizer: data race
==================
```

读报告的关键：竞态指向 `value` 字段，**不是 shared_ptr 本身**——拷贝进线程的四份 shared_ptr 相安无事（第一层边界成立），坏的是它们共同指向的对象。修法是给对象加同步：`std::atomic<int>` 或互斥锁。想触发第二层边界，把捕获改成 `[&counter]` 再让两线程同时给它赋新值——那会竞态到控制块上，崩得更难看。多线程全貌见 [多线程与并发](/cpp/430-MultithreadingConcurrency)。

## 3. enable_shared_from_this：对象拿「管理着自己」的那份 shared_ptr

场景：会话对象要在成员函数里把自己登记进全局连接表，表里存 `shared_ptr` 保活，你手里只有 `this`。直接包一层 `std::shared_ptr<Session>(this)` 会新建第二个控制块，与外面的互不知情、各自计数为 1，先后析构对同一对象 delete 两次，收场与 130 篇的 double-free 一模一样。正路是继承 `enable_shared_from_this`：

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <unordered_map>

struct Session;

std::unordered_map<std::string, std::shared_ptr<Session>> g_sessions;

struct Session : std::enable_shared_from_this<Session> {
    std::string id;
    explicit Session(std::string id_) : id(std::move(id_)) {}

    void registerSelf() {
        // 错误：g_sessions[id] = std::shared_ptr<Session>(this);  第二个控制块
        g_sessions[id] = shared_from_this();   // 正确：共享已有控制块
    }

    ~Session() { std::cout << "会话 " << id << " 关闭\n"; }
};

int main() {
    {
        auto s = std::make_shared<Session>("alice");
        s->registerSelf();
        std::cout << "注册后引用计数: " << s.use_count() << '\n';
    }                     // 局部 s 析构，全局表还持一份，会话继续活着
    g_sessions.clear();   // 最后一份 shared_ptr 消失，这里才真正关闭
}
```

预期输出：

```text
注册后引用计数: 2
会话 alice 关闭
```

`shared_from_this()` 返回的 shared_ptr 与外面那份共享同一个控制块，计数是 2 而不是两个互不知情的 1。两种误用都会当场翻车。误用一：对象**从没被 shared_ptr 管理过**（栈对象、裸 new 的对象），没有控制块可共享：

```cpp
Session local("bob");
local.registerSelf();   // bob 没有控制块
```

```text
terminate called after throwing an instance of 'std::bad_weak_ptr'
  what():  bad_weak_ptr
Aborted (core dumped)
```

误用二：在**构造函数里**调用。内部的弱引用钩子要等 shared_ptr 构造完成才就位，构造函数执行时还没接上——同样是 `bad_weak_ptr`。规则一句话：**先被 make_shared 接管，之后才能 shared_from_this**；构造期就想共享自身，改成工厂函数两段式。

## 4. 自定义删除器：FILE* 的 RAII 包装

要管理的资源不止内存——文件、socket、句柄，释放动作各不相同。unique_ptr 的第二个模板参数就是删除器，析构时调它而不是 `delete`：

```cpp
#include <cstdio>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>

struct FileCloser {
    void operator()(FILE* fp) const noexcept {
        if (fp) {
            std::fclose(fp);
            std::cout << "文件已关闭\n";
        }
    }
};

using UniqueFile = std::unique_ptr<FILE, FileCloser>;

UniqueFile openOrThrow(const std::string& path, const char* mode) {
    UniqueFile file(std::fopen(path.c_str(), mode));
    if (!file) throw std::runtime_error("打不开 " + path);
    return file;
}

int main() {
    auto log = openOrThrow("app.log", "w");
    std::fputs("hello raii\n", log.get());
    std::cout << "日志已写入\n";
}   // 离开作用域：FileCloser 自动 fclose
```

预期输出：

```text
日志已写入
文件已关闭
```

三个工程要点：

- 删除器是**类型的一部分**：`UniqueFile` 与 `unique_ptr<FILE, 别的删除器>` 是不同类型，互不能赋值；无状态删除器不占额外字节。数组同理靠类型区分——`unique_ptr<int[]>` 配 `delete[]`，这是 130 篇埋的伏笔；
- shared_ptr 反过来：删除器存控制块里、运行期类型擦除，写法 `std::shared_ptr<FILE> f(std::fopen("a.txt", "r"), &std::fclose);`，删除器换什么都不改类型，代价是 shared_ptr 永远 16 字节；
- 这就是 RAII 的通用形状——把「释放动作」写进析构函数。[RAII 篇](/cpp/160-RAIIResourceManagement) 把它推广到锁、事务、连接池，智能指针只是它的第一个应用。

## 5. 什么时候连 shared_ptr 都不要

shared_ptr 解决「谁负责释放」，方式是把释放时机变成运行时计数：每次拷贝一次原子加法，每个对象一块控制块，每次访问多一层间接——性能敏感路径（每帧调用、热循环）上，这些开销会爬满整个调用图。纪律是把 120 篇的「只看不拥有」接回来：

| 签名 | 表达的意思 | 什么时候用 |
| --- | --- | --- |
| `void render(const Texture& t)` | 只借用，必存在 | 默认的「我用一下」 |
| `void bind(Texture* t)` | 只借用，可能为空 | 可选依赖、查找结果 |
| `void mount(std::unique_ptr<T> u)` | 接管所有权 | 存进容器、转移归属 |
| `void subscribe(std::shared_ptr<T> s)` | 共享所有权，参与保活 | 真的多方共生死 |
| `const std::shared_ptr<T>&` | 共享但不改计数 | 仅在拷贝确实贵的场景 |

判断标准：**函数体里只是用对象，就传引用或裸指针；要把对象存下来、且它的生死从此成为你的问题，才考虑 shared_ptr**。引擎主循环里纹理、材质这类被管理器统一持有的资源，各渲染系统拿 `const Texture&` 就够——为了「保险」到处换 shared_ptr，等于把原子计数撒进每一帧。借用的前提是调用方保证被借对象活过整个函数执行期，即 120 篇悬垂纪律的适用范围。

## 6. 常见错误与调试实录

错误一：`shared_ptr<T>(this)` 制造第二控制块，收场与 130 篇同款：

```text
==26188==ERROR: AddressSanitizer: attempting double-free on 0x602000000010 in thread T0
SUMMARY: AddressSanitizer: double-free
```

修法见第 3 节。

错误二：`get()` 出来的裸指针存下来长期用。`get()` 返回的指针不受任何管理，只是「当前的」对象地址：

```cpp
auto data = std::make_shared<int>(42);
int* raw = data.get();
data.reset();                 // 对象析构
std::cout << *raw << '\n';    // raw 已悬垂
```

ASan 真实输出：

```text
==27310==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000000010 at pc 0x...
READ of size 4 at 0x602000000010 thread T0
    #0 0x... in main
SUMMARY: AddressSanitizer: heap-use-after-free
```

读报错三步：`heap-use-after-free` 说明读的是已释放的堆内存；`freed by` 栈会指向释放点（`data.reset()`）；回头找谁还握着裸引用——`get()` 只配在 shared_ptr 存活期内当临时用，要长期拿就重新想所有权。

错误三：make_shared + 长命 weak_ptr，内存「看起来没释放」。不是崩溃，是任务管理器里 RSS 不降、ASan 却不报泄漏的现场——确实没泄漏，只是对象析构后那块合并内存还被控制块占着（第 1 节的代价）。定位：数 weak_ptr 的存活期；修法：大对象改用 `shared_ptr<T>(new T)` 让对象内存先还。

## 7. 修改实验

1. 把第 1 节实验的 `Sample` 缩成单个 `int` 再测——分配次数的收益要看对象大小，小对象上差距缩到看不出；
2. 把第 2 节的 `counter->value += 1` 改成 `std::atomic<int>` 与 mutex 各一遍，验证 400000 稳定出现，重跑 TSan 确认报告消失（15 分钟）；
3. 给第 4 节代码加 `static_assert(!std::is_copy_constructible_v<UniqueFile>);`（需 `<type_traits>`），编译通过即验收——unique_ptr 家族天生不可拷贝。

## 8. 小练习

预测题（先写答案再运行，5 分钟）：

```cpp
struct Blob { int payload = 1; };

auto s1 = std::make_shared<Blob>();
std::weak_ptr<Blob> w = s1;
auto s2 = s1;
std::cout << s1.use_count() << ' ' << w.use_count() << '\n';
s1.reset();
s2.reset();
std::cout << w.expired() << '\n';
auto revived = w.lock();
std::cout << (revived == nullptr) << '\n';
```

挑战题（半小时）：实现 `FileLineWriter`，验收清单：

- 构造时打开失败抛 `std::runtime_error`；
- `void writeLine(const std::string&)` 每次写入一行；
- 析构自动关闭文件，全程不手写 fclose；
- `static_assert(!std::is_copy_constructible_v<FileLineWriter>);` 编译通过。

提示（思路方向）：成员用 unique_ptr 加自定义删除器，与第 4 节同构。

提示（关键 API）：`std::unique_ptr<FILE, FileCloser>`；`FileCloser::operator()(FILE*)` 里调 `std::fclose`；写入用 `std::fputs` 并补 `'\n'`。

---

验证（先写答案再看）：

```text
预测题: 2 2 / 1 / 1 —— weak_ptr 的 use_count 返回的是强引用个数（2 个 shared_ptr），
不是弱引用个数；两次 reset 后对象析构，weak 过期，lock() 只拿到空指针。
```

## 9. 实际场景

- 网络库会话表：第 3 节原型直接落地——连接建立时 `registerSelf` 进全局 map，断线时 erase，最后一个引用消失自动析构，异步回调随时 `shared_from_this` 保活；
- 纹理管理器：`shared_ptr` 保活资源，索引表存 `weak_ptr` 做缓存查询，渲染热路径只拿 `const Texture&`——保活与借用各归各位；
- C 库与嵌入式边界：FILE*、SDL_Window 这类句柄用自定义删除器包成 unique_ptr，异常路径不漏句柄；ESP32 这类内存紧张的环境，控制块与原子计数开销要认真掂量，多数场合 unique_ptr 或纯栈对象更合适。

## 10. 与之前和之后的知识的关系

- 往前：[智能指针](/cpp/130-SmartPointerDeepDive) 立起「独占 / 共享 / 观察」模型，本篇拆开它的内脏；[C++ 指针](/cpp/120-CppPointers) 的悬垂纪律在第 6 节 `get()` 事故里原样复现；
- 往后：[循环引用](/cpp/150-SmartPointerCircularReference) 专攻共享所有权最大的坑；[RAII](/cpp/160-RAIIResourceManagement) 把删除器思路推广到一切资源；Core Guidelines 资源篇（170）把本文纪律成文；
- 更远：多线程（430）与内存序（450/460 篇）会回答「原子计数到底原子在哪」。

## 11. 官方文档

- cppreference shared_ptr（含线程安全注记）：https://en.cppreference.com/w/cpp/memory/shared_ptr
- cppreference enable_shared_from_this：https://en.cppreference.com/w/cpp/memory/enable_shared_from_this
- cppreference unique_ptr（删除器语义）：https://en.cppreference.com/w/cpp/memory/unique_ptr
- C++ Core Guidelines R.30（智能指针传参纪律）：https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-smartptrparam

## 12. 自我检查

- 能画出 make_shared 与 new 两种内存布局，各说一个代价；
- 能复述三级线程边界，指出第 2 节 TSan 报告命中的是哪一层；
- 能说出 shared_from_this 的两个前提，以及违反时分别以什么报错收场；
- 能默写 FileCloser 的完整形状，解释删除器在 unique_ptr 与 shared_ptr 里的存储差异；
- 能给第 5 节表格里的五种签名各配一句「它承诺了什么」。

## 本章总结

shared_ptr 的能力与代价都在控制块：make_shared 一次分配换来缓存友好，也换来「weak 不死内存不还」；原子计数让「各自持有拷贝」天然安全，但同一实例的并发写与所指对象的并发访问都要自己加锁；对象想拿管理着自己的那份 shared_ptr，只有 enable_shared_from_this 一条正路；自定义删除器让 unique_ptr 升级成通用资源守卫；而性能敏感路径上，最强的选择常常是引用与裸指针——只看不拥有，把所有权留给边界。

## 下一步

进入 [智能指针循环引用](/cpp/150-SmartPointerCircularReference)：把 130 篇那个互指泄漏拆到 use_count 逐行级别，练熟 weak_ptr 的 lock/expired 组合；之后 [RAII](/cpp/160-RAIIResourceManagement) 会告诉你，本文的一切都是它的特例。
