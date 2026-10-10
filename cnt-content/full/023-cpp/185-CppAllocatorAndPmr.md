---
order: 210
title: 分配器与 std::pmr 内存资源
difficulty: beginner
description: 从 std::allocator 接口讲到 std::pmr 三层 memory_resource 体系：为什么模板分配器难以传播、monotonic_buffer_resource 与 pool_resource 各自适合什么负载、如何在游戏帧循环与低延迟路径上做到零堆分配。
module: 'cpp'
category: 计算机科学
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：动态内存管理 - 分配器与多态内存资源（`<memory>` / `<memory_resource>`）。
- **解决什么问题**：[内存管理](/cpp/180-CppMemoryManagement) 一篇讲的是 `new/delete` 的正确用法，但容器真正申请内存走的是另一条路——分配器。默认的 `std::allocator` 只会调全局 `operator new`，当你需要「这一帧内不许碰堆」「这批小对象集中回收」「这个线程池的内存线程本地化」时，就得让容器改用别的内存来源。
- **什么时候用到**：
  - 游戏引擎帧循环、交易系统低延迟路径——要求业务代码路径上零堆分配、零页错误；
  - 解析器、编译器前端、日志系统——生命周期一致的对象批量构建、统一销毁；
  - 嵌入式或受限内存环境——需要精确控制一块缓冲的用途；
  - 性能剖析显示 `malloc/free` 热点集中在容器扩容——想换内存策略而不想改容器代码。

前置阅读：[RAII 资源管理](/cpp/160-RAIIResourceManagement)、[内存管理](/cpp/180-CppMemoryManagement)。本篇与 [核心指南资源管理](/cpp/170-RAIIResourceManagementInPractice) 的分工：那里用自定义 `StackAllocator` 演示了「分配器模板参数」的最小写法，本篇讲清这套接口的完整契约，以及 C++17 的 `std::pmr` 如何把「换内存策略」从编译期搬到运行期。

预计 70 到 100 分钟。

## 1. 心智模型：容器向「谁」要内存

每当你写 `vector.push_back(x)` 而容量不够时，发生的事情是：

```text
push_back 发现 size == capacity
    |
    v
调用 allocator_traits<A>::allocate(a, n)      <-- 向分配器要 n 个 T 的空间
    |
    v
在裸内存上用 placement new 逐个构造元素        <-- 构造与分配解耦
    |
    v
析构元素后调用 allocator_traits<A>::deallocate(a, p, n)  <-- 归还，但不析构分配器
```

关键认知：**分配与构造是两回事，释放与析构也是两回事**。分配器只负责「给我一块够放 n 个 T 的内存」与「还你这块内存」，它从不构造或销毁元素。这就是为什么分配器接口里没有 `construct` 的强制要求（C++11 起构造责任在容器与 `allocator_traits`）。

换分配器 = 换容器的内存来源，容器代码一行不改。这是「策略与机制分离」在标准库里的范例。

## 2. std::allocator：默认策略长什么样

`std::allocator` 是所有容器的默认分配器，它的现代实现薄到几乎透明：

```cpp
template <class T>
struct allocator {
    [[nodiscard]] T* allocate(std::size_t n) {
        return static_cast<T*>(::operator new(n * sizeof(T)));
    }
    void deallocate(T* p, std::size_t n) noexcept {
        ::operator delete(p);
    }
};
```

逐行拆解：

- `allocate(n)`：注意参数是**元素个数**不是字节数，转换成字节是分配器的责任。漏乘 `sizeof(T)` 是手写分配器最经典的越界来源。
- `[[nodiscard]]`：不接收返回的指针是纯泄漏，编译器有理由警告。
- `deallocate(p, n)`：第二个参数是元素个数，标准只要求实现「可以忽略它」，但调试型分配器常用它做边界校验。
- 底层走 `::operator new/delete`（全局形式），而不是 `malloc/free`——这两层的区别在 [内存管理](/cpp/180-CppMemoryManagement) 已讲：`operator new` 失败抛 `std::bad_alloc`，且会先调用 new-handler。

易错点：有人给 `std::allocator<int>` 写 `deallocate` 时顺手 `free(ptr)`，但如果 `allocate` 走的是 `operator new`，释放就必须走 `operator delete`——**申请与释放必须对称**，交叉调用是未定义行为。

### 2.1 allocator_traits：为什么操作分配器要经过中间层

容器从不直接调 `a.allocate(...)`，而是调 `std::allocator_traits<A>::allocate(a, ...)`。原因：第三方分配器（包括历史遗留的、用户手写的）接口不齐——有人不提供 `construct`、有人没有 `pointer` 类型别名。`allocator_traits` 用默认实现把缺口补齐：

| traits 成员 | 缺省行为 |
| :--- | :--- |
| `allocate(a, n)` | 必须由分配器提供，无缺省 |
| `deallocate(a, p, n)` | 必须由分配器提供，无缺省 |
| `construct(a, p, args...)` | 缺省 `::new (p) T(args...)` |
| `destroy(a, p)` | 缺省 `p->~T()` |
| `max_size(a)` | 缺省 `SIZE_MAX / sizeof(T)` |
| `select_on_container_copy_construction(a)` | 缺省返回 `a`（拷贝容器时沿用原分配器） |
| `propagate_on_container_copy_assignment` | 缺省 `false_type` |
| `propagate_on_container_move_assignment` | 缺省 `true_type` |
| `propagate_on_container_swap` | 缺省 `false_type` |
| `is_always_equal` | 缺省 `is_empty<A>`（空分配器视为全等） |

后三个「传播」 traits 是理解分配器bug的关键，2.2 节展开。

### 2.2 三个传播 traits：赋值与交换时的分配器归属

场景：两个 `std::list<int, MyAlloc>` 互相赋值，若两者的 `MyAlloc` 实例各自持有不同的内存池，赋值后元素的内存归谁管？

- `propagate_on_container_copy_assignment == true`：拷贝赋值连分配器一起覆盖，右侧的池接管一切；
- `propagate_on_container_move_assignment == true`：移动赋值同上（这也是标准库默认值为 true 的原因——移动本来就是「整体接管」）；
- `propagate_on_container_swap == true`：swap 连分配器一起换。若为 false 且两分配器 `operator==` 不为真，swap 行为是**未定义**的。

不同分配器实例是否「等价」由 `operator==` 决定：相等意味着「从 A1 分配、用 A2 释放是安全的」。写池式分配器时忘掉这个等号，是最常见的悬垂来源。

## 3. 传统模板分配器的两个痛点

[核心指南资源管理](/cpp/170-RAIIResourceManagementInPractice) 7.6 节的 `StackAllocator<int, 100>` 是编译期方案，它好用，但两个痛点在真实项目里迟早撞上。

### 痛点一：分配器是类型的一部分

```cpp
std::vector<int> a;                          // vector<int, std::allocator<int>>
std::vector<int, StackAllocator<int, 100>> b; // 这是另一个类型！

a = b;       // 编译错误
void f(std::vector<int>& v);
f(b);        // 编译错误：类型不匹配
```

`vector<int>` 和 `vector<int, StackAllocator>` 是两个毫不相干的类型，接口边界、容器互操作全部被切断。工程后果：只要一个底层 API 签名里出现 `std::vector<int>`，你带自定义分配器的容器就传不进去，最后往往在边界处做一次全量拷贝，优化收益归零。

### 痛点二：分配器实例的传播链

```cpp
std::vector<int, PoolAlloc> v1(pool_a);
std::vector<int, PoolAlloc> v2 = v1;         // 拷贝构造：用 select_on_container_copy_construction 决定新实例
std::list<int, PoolAlloc> l1(pool_a);
auto l2 = l1;                                 // 链表节点从哪个池分配？
l2.push_back(42);                             // 新节点呢？
```

拷贝构造走 `select_on_container_copy_construction`——设计得当（返回「当前全局/默认池」）没事，设计不当（把原实例直接带过去）则出现「容器活着、池先死」的悬垂。这类 bug 的可怕之处在于演示时一切正常，只有内存池析构早于容器时才爆炸。

这两个痛点正是 `std::pmr` 要解的题：**运行时多态 + 统一类型**。

## 4. std::pmr：运行时选择内存策略

C++17 的 polymorphic memory resources（pmr）把分配策略从模板参数移到运行时对象。整个体系三层：

```text
第 1 层  容器        std::pmr::vector<int>  ==  std::vector<int, std::pmr::polymorphic_allocator<int>>
                      类型统一，与接口边界无冲突
                         |
第 2 层  分配器      std::pmr::polymorphic_allocator<int>
                      持有一个 memory_resource*，所有请求转发给它
                         |
第 3 层  内存资源    std::pmr::memory_resource（抽象基类）
                      monotonic_buffer_resource / unsynchronized_pool_resource /
                      synchronized_pool_resource / new_delete_resource ...
```

### 4.1 memory_resource 接口

```cpp
class memory_resource {
public:
    virtual ~memory_resource() = default;

    [[nodiscard]] void* allocate(std::size_t bytes, std::size_t alignment = max_align) {
        return do_allocate(bytes, alignment);          // 公有非虚：统一入口
    }
    void deallocate(void* p, std::size_t bytes, std::size_t alignment = max_align) {
        do_deallocate(p, bytes, alignment);
    }
    bool is_equal(const memory_resource& other) const noexcept {
        return do_is_equal(other);
    }

private:
    virtual void* do_allocate(std::size_t bytes, std::size_t alignment) = 0;
    virtual void  do_deallocate(void* p, std::size_t bytes, std::size_t alignment) = 0;
    virtual bool  do_is_equal(const memory_resource& other) const noexcept = 0;
};
```

设计要点（NVI 非虚接口模式的标准应用）：

- 公有成员**非虚**，做参数校验与统一入口；私有成员**纯虚**，承载变化点。用户继承时只覆写 `do_xxx`，不可能绕过入口。
- 参数是**字节数 + 对齐**，与 `std::allocator` 的「元素个数」不同——因为它服务的是任意类型。
- `do_is_equal` 必须自己写：基类不提供默认实现。对比两个资源「从 r1 分配、用 r2 释放是否安全」。

易错点：`do_deallocate` 对 `monotonic_buffer_resource` 而言**什么都不做**——这是契约不是 bug（下一节讲为什么）。如果你在池资源上误以为 deallocate 会立刻归还给系统，就误解了池的语义。

### 4.2 三种内置资源各自适合什么

| 资源 | 分配行为 | 释放行为 | 适合负载 |
| :--- | :--- | :--- | :--- |
| `monotonic_buffer_resource` | 单向推进指针，极快（几条指令） | 全部忽略 | 生命周期一致的批量对象：一帧、一次请求、一次解析 |
| `unsynchronized_pool_resource` | 按大小分桶（size class），桶内快表 | 归还所属桶，复用 | 大量小对象反复构造/析构，单线程或外部已加锁 |
| `synchronized_pool_resource` | 同上 + 内部锁 | 同上 | 多线程共享同一池 |

三者的共同设计约束：**不是线程安全的（synchronized 除外），不是全局的，析构时统一收尾**。

### 4.3 upstream 链：资源耗尽时找谁

`monotonic_buffer_resource(buf, size, upstream)` 的第三个参数是「缓冲用尽后向谁继续要」。标准提供：

- `std::pmr::new_delete_resource()`：直接走全局 `operator new/delete`（默认 upstream）；
- `std::pmr::null_memory_resource()`：任何分配直接抛 `std::bad_alloc`；
- `std::pmr::get_default_resource()` / `set_default_resource()`：进程级默认资源，初始为 `new_delete_resource`。

`null_memory_resource` 的杀手级用法是**封顶验证**：把 upstream 设为 null，缓冲一满就抛异常——用来证明「这一帧真的零堆分配」。

```cpp
unsigned char buf[4096];
std::pmr::monotonic_buffer_resource frame_arena{
    buf, sizeof(buf),
    std::pmr::null_memory_resource()};     // 缓冲外分配 = 立刻爆炸

std::pmr::vector<std::pmr::string> logs{&frame_arena};
// 只要任何一条路径试图越过 4096 字节，这里就会抛 std::bad_alloc，
// 问题在开发期暴露，而不是上线后某帧偶发卡顿。
```

### 4.4 构造顺序即生死顺序：资源必须比容器活得久

这是 pmr 的第一易错点，值得单独一节。

```cpp
std::pmr::vector<int>* leaky_example() {
    unsigned char buf[1024];
    std::pmr::monotonic_buffer_resource mbr(buf, sizeof(buf));
    static std::pmr::vector<int> v{&mbr};      // static：函数返回后仍存活
    v.push_back(1);
    return &v;                                  // 函数返回：mbr 析构，v 持有悬垂指针
}                                               // 之后任何对 v 的分配都是未定义行为
```

原因看类型就知道：`polymorphic_allocator` 里存的只是一个 `memory_resource*`，它**不拥有**资源。规则：

1. `memory_resource` 与它背后的缓冲，必须比所有引用它的容器后析构；
2. 最稳的排法是**同一作用域内、先声明资源后声明容器**（C++ 保证析构顺序与构造相反）；
3. 跨作用域传递时，把「资源 + 容器」打包进同一个所有者对象，或用 `std::unique_ptr` 表达所有权。

```cpp
class FrameAllocator {                      // 把资源和容器绑成一个生命周期
    std::pmr::monotonic_buffer_resource arena_;      // 先构造
public:
    std::pmr::vector<std::pmr::string> logs{&arena_}; // 后构造
    explicit FrameAllocator(unsigned char* buf, std::size_t n)
        : arena_(buf, n) {}
    // 析构顺序自动正确：先 logs 后 arena_
};
```

## 5. 三种资源各配一个真实场景

### 场景一：游戏一帧内的零堆分配日志缓冲（monotonic_buffer_resource）

工程背景：主机游戏与手游的性能团队普遍要求「游戏线程每帧 0 次 malloc」，因为堆分配耗时不定（可能触发系统调用与页错误）、无法预估帧时间。日志、调试绘制、临时 UI 文本这类「攒一帧、扔一帧」的数据最适合 arena。

```cpp
#include <memory_resource>
#include <vector>
#include <string>
#include <iostream>

class FrameLog {                                  // 每帧一个，帧末整体作废
public:
    explicit FrameLog(unsigned char* buf, std::size_t bytes)
        : arena_(buf, bytes, std::pmr::null_memory_resource()) {}

    void write(std::string_view msg) {
        logs_.emplace_back(msg, &arena_);         // pmr::string 从 arena 拿内存
    }
    void flush_to(std::ostream& os) {
        for (const auto& s : logs_) os << s << '\n';
    }
private:
    std::pmr::monotonic_buffer_resource arena_;   // 资源先声明
    std::pmr::vector<std::pmr::string> logs_{&arena_};  // 容器后声明
};

int main() {
    unsigned char buf[8192];
    for (int frame = 0; frame < 3; ++frame) {
        FrameLog log{buf, sizeof(buf)};           // 每帧重建，上一帧内存整体作废
        log.write("player moved");
        log.write(std::format("frame {} latency ok", frame));
        log.flush_to(std::cout);
    }                                             // 0 次 new/delete，全程栈缓冲
}
```

逐段解释：

- `emplace_back(msg, &arena_)`：`std::pmr::string` 的构造函数接受 `(字符序列, allocator)`，emplace 把这两个参数原样转发给元素构造——**不需要**先造一个临时 string 再拷贝。
- `null_memory_resource` 作 upstream：日志超过 8 KiB 时程序当场抛异常。这是有意为之的「熔断」，逼你把缓冲调大而不是静默退化成堆分配。
- 每帧新建 `FrameLog`：monotonic 资源没有「重置」成员，重置的唯一方式就是重建对象。析构时若有字符串析构函数需要调用，会逐个调用（内存不归还，但对象的析构语义完整）。

为什么不用 `std::vector<std::string>`：普通 `string` 短文本走 SSO 不分配，但超过 SSO 容量（主流实现 15 或 22 字节）就进堆；一帧几百条日志、每条几十字节，就是几百次堆交互。arena 把它们全部变成指针推进。

### 场景二：高频小对象池（unsynchronized_pool_resource）

工程背景：物理引擎、粒子系统、网络包处理会反复构造/析构大量同尺寸小对象。用普通 `new` 每个对象一次堆交互；池资源按大小分桶后，同尺寸对象在桶内 O(1) 快表分配，且释放的内存立刻可复用——这是 monotonic 做不到的。

```cpp
#include <memory_resource>
#include <vector>
#include <cstdint>

struct Particle { float x, y, z; float vx, vy, vz; std::uint32_t color; };

class ParticleBatch {
public:
    ParticleBatch() : pool_(std::pmr::pool_options{32, 1 << 20}) {}
    void spawn(float x, float y) {
        auto* p = static_cast<Particle*>(pool_.allocate(sizeof(Particle), alignof(Particle)));
        pool_used_.push_back(p);
        *p = Particle{x, y, 0.f, 0.f, 9.8f, 0.f, 0xFFFFFFFF};
    }
    void kill(std::size_t i) {
        pool_.deallocate(pool_used_[i], sizeof(Particle), alignof(Particle));
        pool_used_[i] = pool_used_.back();
        pool_used_.pop_back();                    // swap-and-pop：O(1) 移除
    }
private:
    std::pmr::unsynchronized_pool_resource pool_;
    std::pmr::vector<Particle*> pool_used_{&pool_};   // 索引表也走池
};
```

逐段解释：

- `pool_options{max_blocks_per_chunk, largest_required_pool_block}`：第一个值是「一次向上游要多少块」（值大 = 更少向 upstream 伸手但更占内存），第二个值是「超过此大小的分配不再分桶、直接走 upstream」。这里 1 MiB 以上的分配视为「大对象」。
- `allocate/deallocate` 直接用资源而不是容器：这个场景对象由管理器手工管理生命周期（游戏对象的典型模式），所以绕过 `polymorphic_allocator` 直接对话资源。
- `kill` 用 swap-and-pop 而不是 `erase`：顺序无关的存活列表，erase 的 O(n) 移动毫无意义。

什么时候不该用池：对象尺寸差异极大（分桶退化）、对象生命周期交错（内存碎片在桶内积累）。这两种情况用容器管理对象本体更简单。

### 场景三：低延迟路径的「禁 new 断言」（set_default_resource + null 上游）

工程背景：交易系统、音频回调（实时线程）里出现一次堆分配就可能错过 deadline。团队通常约定「热路径禁止 new」，靠代码评审记忆不牢，可以直接用资源体系把违规变成运行时错误。

```cpp
#include <memory_resource>
#include <vector>

void process_market_data_hot_path() {
    unsigned char buf[64 * 1024];
    std::pmr::monotonic_buffer_resource arena{
        buf, sizeof(buf), std::pmr::null_memory_resource()};

    // 临时把进程默认资源换掉：期间任何「无意识」的堆分配都会炸
    std::pmr::memory_resource* saved = std::pmr::set_default_resource(&arena);
    {
        std::vector<std::string> order_ids;       // 普通 vector：默认分配器
        order_ids.reserve(64);
        order_ids.emplace_back("AAPL-2026-");     // 走 arena，不碰堆
    }
    std::pmr::set_default_resource(saved);        // 恢复
}
```

逐段解释：

- `set_default_resource` 改的是**无分配器模板参数的容器的默认行为**：`std::vector<int>` 内部实际是 `std::pmr::vector` 风格的全局默认。标准规定默认资源影响的是 `polymorphic_allocator` 的默认构造；实践中这条机制主要给「测试期审计」用。
- 作用域收得极窄且保存/恢复旧值：默认资源是进程级全局状态，长期占用会污染整个程序。
- 注意 reserve：`emplace_back` 若触发扩容，扩容分配同样走 arena；不 reserve 的话多次扩容会更快吃满 64 KiB——arena 方案要配合容量规划。

易错点：`set_default_resource` 不是线程安全的（实现定义），多线程程序里用它做审计要把热路径串行化，或者干脆只在单测里开。

### 场景四（补充）：每连接一个 arena 的网络服务器

```cpp
struct Session {
    explicit Session(unsigned char* buf, std::size_t n)
        : arena(buf, n) {}
    std::pmr::monotonic_buffer_resource arena;    // 成员顺序：资源在前
    std::pmr::string read_buffer{&arena};         // 后构造，析构顺序自动正确
    std::pmr::vector<std::pmr::string> pending{&arena};
};

void on_request_complete(Session& s) {
    s.pending.clear();                            // 内存还给 arena，可复用
    s.arena.~monotonic_buffer_resource();         // 请求边界整体重置（placement new 模式）
    new (&s.arena) std::pmr::monotonic_buffer_resource(s.buf, s.buf_size);
}
```

这是 arena 模式的进阶形态：连接存活期间内存反复复用，请求结束整体重置。`pending.clear()` 只析构字符串对象、内存不还给系统；重建 arena 才真正归零。**重建前必须保证所有引用 arena 的容器已清空或析构**，否则重置后容器再分配会复用已「作废」的指针——这是 arena 模式独有的悬垂形态。

## 6. pmr 容器速览与选型

`std::pmr` 命名空间为每个容器提供了类型别名：

```cpp
std::pmr::vector<T>        == std::vector<T, std::pmr::polymorphic_allocator<T>>
std::pmr::string           == std::basic_string<char, char_traits<char>, std::pmr::polymorphic_allocator<char>>
std::pmr::map<K, V>        == std::map<K, V, less<K>, polymorphic_allocator<pair<const K, V>>>
std::pmr::unordered_map / set / multimap / multiset / list / forward_list / deque 同理
```

选型决策：

| 需求 | 方案 |
| :--- | :--- |
| 与旧接口互传 `std::vector<int>&` | 用普通容器；pmr 容器与之仍是不同类型 |
| 策略要运行时切换（读配置决定） | pmr |
| 同一类型容器在多处用不同内存来源 | pmr（模板分配器做不到） |
| 策略编译期已知且不跨接口边界 | 模板分配器（零虚调用开销） |

性能直觉：`polymorphic_allocator::allocate` 就是一次虚调用转发，相比 `operator new` 的系统调用开销可忽略；真正的开销差来自资源本身的策略（monotonic 几条指令 vs pool 的分桶查找 vs 全局堆的锁与系统调用）。

## 7. 常见陷阱清单

1. **资源比容器先死**（4.4 节）：症状是析构后偶发崩溃或内存损坏。防御：同作用域声明顺序、或打包成所有者对象。
2. **monotonic 上误用 deallocate 回收**：它不会还内存，逻辑上「删了又加」的对象对会持续吃缓冲。需要回收语义就换 pool。
3. **拷贝 pmr 容器时资源跟着走吗**：拷贝构造的容器用 `select_on_container_copy_construction` 的结果——`polymorphic_allocator` 的该函数返回**默认构造的分配器**（即当前默认资源）。也就是说拷贝出去的副本默认不共享你的 arena，这通常正是你想要的；显式要共享得用「拷贝元素 + 换资源」的算法。
4. **跨线程共享非 synchronized 资源**：`unsynchronized_pool_resource` 与 `monotonic_buffer_resource` 的并发使用是未定义行为。
5. **忘了 `pmr::string` 与 `std::string` 的互转成本**：两者类型不同，传参用 `std::string_view` 桥接最省。
6. **池的 largest_required_pool_block 设太小**：超过阈值的分配直接打 upstream，池形同虚设；先用统计确认对象尺寸分布再定参。

## 8. 动手实践

### 练习一（必做）：arena 计数器

任务：实现 `CountingResource : std::pmr::memory_resource`，统计总分配字节数与分配次数；用它做 upstream 跑一个 `std::pmr::vector<int>` 的 10000 次 `push_back`，打印总分配量；再对同一容器先 `reserve(10000)` 重复实验，对比差值并解释原因。

提示：`do_allocate` 里累加后转发给 `new_delete_resource()` 即可；对比实验的差值就是「几何级数扩容」的代价。

<details>
<summary>参考实现（先自己写再看）</summary>

```cpp
#include <memory_resource>
#include <vector>
#include <iostream>

class CountingResource final : public std::pmr::memory_resource {
public:
    std::size_t bytes = 0, calls = 0;
protected:
    void* do_allocate(std::size_t n, std::size_t a) override {
        bytes += n; ++calls;
        return std::pmr::new_delete_resource()->allocate(n, a);
    }
    void do_deallocate(void* p, std::size_t n, std::size_t a) override {
        std::pmr::new_delete_resource()->deallocate(p, n, a);
    }
    bool do_is_equal(const std::pmr::memory_resource& o) const noexcept override {
        return this == &o;
    }
};

int main() {
    CountingResource c;
    {
        std::pmr::vector<int> v{&c};
        for (int i = 0; i < 10000; ++i) v.push_back(i);
        std::cout << "no reserve: " << c.calls << " allocs, "
                  << c.bytes << " bytes\n";
    }
    c.bytes = c.calls = 0;
    {
        std::pmr::vector<int> v{&c};
        v.reserve(10000);
        for (int i = 0; i < 10000; ++i) v.push_back(i);
        std::cout << "reserve:    " << c.calls << " allocs, "
                  << c.bytes << " bytes\n";
    }
}
```

自检：第一个实验的 calls 接近 log2(10000) 约 15 次，总字节约为最终容量的两倍以内（扩容复制期间新旧都在）。第二个实验固定为 1 次 40000 字节。若你的结果 calls 是 0，检查是不是编译器把整个循环优化掉了——打印 v.back() 阻止消除。

</details>

### 练习二（选做）：帧内熔断

任务：把 5 节场景一改成「一帧日志预算 4 KiB」，故意让某帧日志超预算，观察 `std::bad_alloc` 抛出点；然后改用 `unsynchronized_pool_resource` 作 upstream，观察行为差异并解释为什么池不抛。

提示：monotonic + null 上游 = 严格配额；池 + null 上游 = 桶耗尽才抛，且池向 upstream 要的是「块」不是「单对象」，粒度完全不同。

### 练习三（挑战，不给参考实现）

为你的项目里一个「攒一批、整体扔」的路径（日志、序列化草稿、解析临时结构）写 arena 版本，用 CountingResource 量化改造前后的分配次数与字节数，写三句话结论。自查：arena 的生命周期是否严格包含所有使用者？有没有跨线程共享非 synchronized 资源？

## 9. 与之前和之后的知识的关系

- 往前：[内存管理](/cpp/180-CppMemoryManagement) 讲 `new/delete` 与 `operator new` 的层次——pmr 资源就是这层次上再抽象出的「可插拔策略」；[核心指南资源管理](/cpp/170-RAIIResourceManagementInPractice) 7.6/7.7 节是本篇的引子，那里 20 行的 StackAllocator 在这里补全了传播与等价契约。
- 往后：[并发原语](/cpp/440-CoordinationAndAsyncPrimitives) 的线程池任务队列若需要分配内存，应绑 `synchronized_pool_resource`；[性能优化](/cpp/610-CppPerformance) 的测量纪律同样适用——先用 CountingResource 证明分配是热点，再换资源，不要反向。

## 10. 官方文档

- cppreference std::pmr：https://en.cppreference.com/w/cpp/header/memory_resource
- memory_resource 类：https://en.cppreference.com/w/cpp/memory/memory_resource
- polymorphic_allocator：https://en.cppreference.com/w/cpp/memory/polymorphic_allocator
- allocator_traits：https://en.cppreference.com/w/cpp/memory/allocator_traits

## 参考与致谢

- 本文 `memory_resource` 接口、`pool_options` 参数含义与「upstream 耗尽行为」的表述参考 cppreference.com（CC-BY-SA 3.0 许可）对应条目，并按教学需要重写与扩展：https://en.cppreference.com/w/cpp/memory/memory_resource
- 「分配与构造解耦」的心智模型源自 C++ 标准对容器要求（allocator-aware container requirements）的通俗转述。
