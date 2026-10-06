---
order: 170
title: C++ 智能指针深水区：控制块、weak_ptr、循环引用与删除器
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: 主教学之后的机制与工程细节——控制块与 make_shared 缓存友好实验、shared_ptr 线程安全三级边界与 TSan 实录、enable_shared_from_this 的必要场景与误用崩溃、weak_ptr 全套操作与循环引用破环、双向链表/观察者/缓存/树四类典型结构、FILE* 自定义删除器，以及性能敏感路径上连 shared_ptr 都不用的纪律。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cpp/130-SmartPointerDeepDive'
  - 'cpp/160-RAIIResourceManagement'
  - 'cpp/120-CppPointers'
prerequisites:
  - 'cpp/130-SmartPointerDeepDive'
---

## 前置知识

- 已完成 [智能指针](/cpp/130-SmartPointerDeepDive)：会用 `make_unique`/`make_shared`，跑过 `use_count` 实验，能说出「独占 / 共享 / 观察」三分法；
- [C++ 指针](/cpp/120-CppPointers) 的栈与堆地址直觉——报错里 `0x7ffd` 开头的栈地址会反复出现。

> 分工说明：130 立模型，本篇拆机制与补深水区：控制块与分配次数、线程安全边界、enable_shared_from_this、weak_ptr 全套操作、循环引用的泄漏现场与破环方法、典型环结构、自定义删除器，以及「什么时候连 shared_ptr 都不要」的传参纪律。（原「智能指针循环引用」单篇已并入本篇第 6-9 节。）

## 学习目标

读完本文你将能够：

1. 画出控制块里有什么，解释 make_shared 与 `shared_ptr(new T)` 的分配次数差异及各自的代价；
2. 复述 shared_ptr 线程安全的三级边界，并用 ThreadSanitizer 定位一次数据竞争；
3. 说出 enable_shared_from_this 解决什么问题，两种误用各以什么报错收场；
4. 用 weak_ptr 的 expired/use_count/lock 组合观察对象，判断 lock 与 expired 该在什么场景用哪个；
5. 亲手复现一次循环引用泄漏，用 weak_ptr 破环，并说出双向链表、观察者、树、缓存四类结构的强弱引用摆法；
6. 用自定义删除器把 FILE* 包成异常安全的 RAII 类型，说清删除器在两类指针里的存储差异；
7. 在性能敏感路径上按「只看不拥有」纪律选择参数类型。

预计 90 到 120 分钟。

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

这枚硬币有反面：对象与控制块合体后，**只要还有一个 weak_ptr 活着，整块内存就不还**——对象早已析构，内存却占着（弱计数的用途与代价在第 6-7 节展开）。大对象配长命 weak_ptr 时，`new` 版的两次分配反而省内存。另外 make_shared 传不进自定义删除器——那是第 4 节的工具。

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

`shared_from_this()` 返回的 shared_ptr 与外面那份共享同一个控制块，计数是 2 而不是两个互不知情的 1。它的弱引用兄弟 `weak_from_this()`（C++17）返回 `weak_ptr<Widget>` 而不增加计数——不想参与保活、只想存一个「会不会失效」的观察位时用它，典型场景是第 9 节的安全回调。

两种误用都会当场翻车。误用一：对象**从没被 shared_ptr 管理过**（栈对象、裸 new 的对象），没有控制块可共享：

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

## 6. weak_ptr：不拥有，只观察

`weak_ptr` 是 `shared_ptr` 的观察者：从 shared_ptr 构造，但**不增加强引用计数**，因此不阻止对象被销毁。它不能直接访问对象——必须先 `lock()` 提升成 shared_ptr；对象已死则拿到空的 shared_ptr。「观察但不保活」正是它存在的意义，也是下一节破环的工具。

### 6.1 基本操作：expired / use_count / lock

```cpp
#include <memory>
#include <iostream>

void weakPtrOperations() {
    auto sp = std::make_shared<int>(42);
    std::weak_ptr<int> wp = sp;

    // 检查对象是否仍然存活
    std::cout << "是否过期: " << std::boolalpha << wp.expired() << std::endl;  // false

    // 获取引用计数（返回的是强引用个数，不是弱引用个数）
    std::cout << "引用计数: " << wp.use_count() << std::endl;  // 1

    // 安全访问：lock() 返回 shared_ptr
    if (auto locked = wp.lock()) {
        std::cout << "值: " << *locked << std::endl;  // 42
    } else {
        std::cout << "对象已被销毁" << std::endl;
    }

    // 销毁对象
    sp.reset();

    // 再次检查
    std::cout << "是否过期: " << wp.expired() << std::endl;  // true

    // lock() 返回空的 shared_ptr
    auto locked2 = wp.lock();
    std::cout << "lock 后是否为空: " << (locked2 == nullptr) << std::endl;  // true
}
```

**逐段讲解**：

1. `lock()` 是唯一正确的取值方式：它原子地「检查存活 + 提升」，拿到的 shared_ptr 在其存活期内保住对象。先 `expired()` 判断再访问是**两步竞态**——判断完的瞬间别的线程可能正好销毁对象，单线程里能跑，多线程是坑。
2. `wp.use_count()` 返回**强引用**的个数：两个 shared_ptr 指着对象时它报 2，无论中间隔了几个 weak_ptr——弱计数藏在控制块里，不通过这个接口暴露。
3. `expired()` 适合「清理型」场景（遍历缓存删过期项）；「使用型」场景一律 `if (auto p = wp.lock())` 一气呵成，不要拆成 expired + 访问两步。

### 6.2 一分钟速查

```cpp
std::weak_ptr<Widget> wp = sp;
if (auto p = wp.lock()) { p->doWork(); }   // 提升：存活则用，已死则空
if (wp.expired()) { /* 清理 */ }           // 查询：是否已失效
std::cout << wp.use_count();               // 强引用计数（sp2 = sp 后变 2）
```

## 7. 循环引用：泄漏现场与破环

### 7.1 泄漏现场

```cpp
#include <memory>
#include <iostream>

struct Node {
    std::string name;
    std::shared_ptr<Node> next;  // 强引用，增加引用计数

    Node(const std::string& n) : name(n) {
        std::cout << name << " 构造" << std::endl;
    }
    ~Node() {
        std::cout << name << " 析构" << std::endl;
    }
};

int main() {
    {
        auto a = std::make_shared<Node>("节点A");
        auto b = std::make_shared<Node>("节点B");

        a->next = b;  // b 的引用计数变为 2
        b->next = a;  // a 的引用计数变为 2，循环引用形成
    }
    // 离开作用域后，a 和 b 的引用计数各减 1，变为 1
    // 但两者都不会被销毁！内存泄漏！
    std::cout << "作用域结束，但节点未析构" << std::endl;
    return 0;
}
```

运行后没有任何「析构」输出：局部变量 a、b 销毁时各把计数从 2 减到 1，剩下的 1 是**对方持有着自己**——A 持 B、B 持 A，两边都在等对方先死，谁也死不成。引用计数模型对「环」无能为力：计数归零的条件在环里永远不成立。注意环不限两个对象，三个或更多对象首尾相接同样泄漏。

最小复现（速记版）：

```cpp
struct Node {
    std::shared_ptr<Node> next;
    ~Node() { std::cout << "destroyed"; }
};
auto a = std::make_shared<Node>();
auto b = std::make_shared<Node>();
a->next = b;
b->next = a;   // 析构函数不会被调用！内存泄漏
```

### 7.2 破环：一方向改 weak_ptr

原则一句话：**拥有方向用 shared_ptr，回头方向用 weak_ptr**。

```cpp
#include <memory>
#include <iostream>

struct Node {
    std::string name;
    std::shared_ptr<Node> next;   // 强引用：下一个节点
    std::weak_ptr<Node> prev;     // 弱引用：上一个节点，不增加引用计数

    Node(const std::string& n) : name(n) {
        std::cout << name << " 构造" << std::endl;
    }
    ~Node() {
        std::cout << name << " 析构" << std::endl;
    }
};

int main() {
    {
        auto a = std::make_shared<Node>("节点A");
        auto b = std::make_shared<Node>("节点B");

        a->next = b;  // b 的引用计数变为 2
        b->prev = a;  // a 的引用计数仍为 1（weak_ptr 不增加）
    }
    // 离开作用域后，a 的引用计数变为 0，a 被销毁
    // 然后 b 的引用计数也变为 0，b 被销毁
    std::cout << "作用域结束，节点已正确析构" << std::endl;
    return 0;
}
```

**逐段讲解**：b 的 prev 改成 weak_ptr 后，「b 指向 a」不再给 a 计数——出作用域时 a 的计数率先归零、a 析构，b 的 next 随之失效、b 归零析构，链条解开。破环的关键不是「少用指针」，而是判断**哪一方在语义上拥有另一方**：链表的 next 是「我管理你」，prev 是「我记得你」——记忆不该保命。第 8 节把这套判断用到四类典型结构上。

## 8. 典型的环与观察结构

### 8.1 双向链表：next 强、prev 弱

```cpp
#include <memory>
#include <string>
#include <iostream>

template<typename T>
class LinkedList {
    struct Node {
        T data;
        std::shared_ptr<Node> next;  // 强引用下一个节点
        std::weak_ptr<Node> prev;    // 弱引用上一个节点

        explicit Node(const T& val) : data(val) {}
    };

    std::shared_ptr<Node> head_;

public:
    void pushFront(const T& value) {
        auto newNode = std::make_shared<Node>(value);
        if (head_) {
            newNode->next = head_;
            head_->prev = newNode;  // weak_ptr 赋值，不增加引用计数
        }
        head_ = newNode;
    }

    void printAll() const {
        auto current = head_;
        while (current) {
            std::cout << current->data << " ";
            current = current->next;
        }
        std::cout << std::endl;
    }

    // 反向遍历（通过 weak_ptr）
    void printReverse() const {
        // 先找到尾节点
        auto tail = head_;
        while (tail && tail->next) {
            tail = tail->next;
        }
        // 从尾到头遍历
        auto current = tail;
        while (current) {
            std::cout << current->data << " ";
            if (auto prev = current->prev.lock()) {
                current = prev;
            } else {
                break;
            }
        }
        std::cout << std::endl;
    }
};
```

**讲解**：正反向遍历都畅通——弱引用不妨碍使用，只放弃「保命权」。反向走用 `prev.lock()` 逐节提升，而不是把 `weak_ptr` 直接当指针解引用。

### 8.2 观察者模式：主题强持观察者，观察者弱看主题

```cpp
#include <memory>
#include <vector>
#include <algorithm>
#include <iostream>

class Subject;

// 观察者使用 weak_ptr 持有主题引用
class Observer {
    std::weak_ptr<Subject> subject_;
    std::string name_;
public:
    Observer(const std::string& name) : name_(name) {}

    void setSubject(std::shared_ptr<Subject> subj) {
        subject_ = subj;
    }

    void update();

    std::string name() const { return name_; }
};

class Subject : public std::enable_shared_from_this<Subject> {
    std::vector<std::weak_ptr<Observer>> observers_;
    int state_ = 0;
public:
    void attach(std::shared_ptr<Observer> obs) {
        observers_.push_back(obs);
    }

    void setState(int state) {
        state_ = state;
        notify();
    }

    void notify();

    int state() const { return state_; }
};

void Observer::update() {
    if (auto subj = subject_.lock()) {
        std::cout << name_ << " 收到更新: state=" << subj->state() << std::endl;
    } else {
        std::cout << name_ << " 主题已销毁" << std::endl;
    }
}

void Subject::notify() {
    // 清理已销毁的观察者
    auto it = observers_.begin();
    while (it != observers_.end()) {
        if (auto obs = it->lock()) {
            obs->update();
            ++it;
        } else {
            it = observers_.erase(it);
        }
    }
}
```

**讲解**：这个例子里弱引用用在**两个方向**——观察者弱看主题（防主题环），主题的观察者列表也存 weak_ptr（观察者销毁后主题不被拖住）。`notify()` 里的「lock 失败就 erase」是 weak 容器的标准维护动作：观察者可以随时死，死列表项在下次广播时被顺手清掉。速记版规则：被观察者持 shared_ptr 或观察者列表存 weak_ptr，观察者回看一律 weak_ptr。

### 8.3 树：子强持父弱

```cpp
#include <memory>
#include <vector>
#include <string>

class TreeNode {
    std::string name_;
    std::weak_ptr<TreeNode> parent_;  // 弱引用父节点
    std::vector<std::shared_ptr<TreeNode>> children_;  // 强引用子节点
public:
    explicit TreeNode(const std::string& name) : name_(name) {}

    void addChild(std::shared_ptr<TreeNode> child) {
        child->parent_ = shared_from_this();  // weak_ptr 赋值
        children_.push_back(std::move(child));
    }

    std::shared_ptr<TreeNode> parent() const {
        return parent_.lock();  // 安全获取父节点
    }

    const std::string& name() const { return name_; }
};
```

**讲解**：树是「父子互指」的天然环——孩子有 parent、父亲有 children。摆法与语义一致：父拥有子（children 用 shared_ptr），子回望父（parent 用 weak_ptr）。`addChild` 里 `shared_from_this()` 出场：孩子要记住爹，而爹此刻手里只有 this。速记版：

```cpp
struct Parent;
struct Child {
    std::weak_ptr<Parent> parent; // 弱引用
    void useParent() {
        if (auto p = parent.lock()) { /* 安全使用 */ }
    }
};
struct Parent {
    std::vector<std::shared_ptr<Child>> children; // 强引用
};
```

### 8.4 缓存：weak_ptr 当过期缓存条目

```cpp
#include <memory>
#include <unordered_map>
#include <string>

template<typename T>
class Cache {
    std::unordered_map<std::string, std::weak_ptr<T>> entries_;
public:
    std::shared_ptr<T> get(const std::string& key) {
        auto it = entries_.find(key);
        if (it != entries_.end()) {
            if (auto cached = it->second.lock()) {
                return cached;  // 缓存命中
            }
            entries_.erase(it);  // 缓存已过期
        }
        return nullptr;
    }

    void put(const std::string& key, std::shared_ptr<T> value) {
        entries_[key] = value;  // weak_ptr 不阻止对象被回收
    }

    void cleanExpired() {
        for (auto it = entries_.begin(); it != entries_.end();) {
            if (it->second.expired()) {
                it = entries_.erase(it);
            } else {
                ++it;
            }
        }
    }
};
```

**讲解**：缓存不该延长对象寿命——用 shared_ptr 存缓存，对象就永远「被需要」、永不回收，缓存退化成泄漏。weak_ptr 让缓存条目变成「软引用」：没人用真数据时对象自然回收，缓存条目变成过期占位，`cleanExpired()` 批量清扫。这是 weak_ptr 除破环外的第二大用途。

## 9. weak_ptr 与回调安全

异步与定时器场景的经典事故：对象死了，注册出去的回调还在，一触发就踩悬垂 this。用 weak_ptr 给回调装「存活检查」：

```cpp
#include <functional>
#include <memory>

// 安全的回调绑定器：使用 weak_ptr 防止悬空回调
template<typename T>
std::function<void()> makeSafeCallback(std::weak_ptr<T> weakObj,
                                        void (T::*method)()) {
    return [weakObj, method]() {
        if (auto obj = weakObj.lock()) {
            (obj.get()->*method)();
        }
        // 如果对象已销毁，回调被静默忽略
    };
}

// 使用
class Service : public std::enable_shared_from_this<Service> {
public:
    void onTimer() { std::cout << "定时器触发" << std::endl; }

    void registerTimer() {
        auto callback = makeSafeCallback(weak_from_this(), &Service::onTimer);
        // 注册回调，即使 Service 被销毁也不会崩溃
    }
};
```

**逐段讲解**：

1. 回调捕获的是 `weak_ptr` 而不是 `shared_ptr`：捕获 shared_ptr 意味着「回调持有所有权」——对象永远死不了（定时器不触发，对象永远在），这常是「为什么我的对象不析构」的答案；捕获 this 则是悬垂。weak_ptr 恰好是「知道你、不拖住你」的第三条路。
2. 触发时 `lock()` 成功才调用，失败静默忽略——对象死后的回调成了无害空操作。
3. `weak_from_this()` 在此登场（第 3 节的伏笔）：registerTimer 时对象肯定由 shared_ptr 管理，取弱引用钩子零成本。

## 10. 常见错误与调试实录

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

### 循环引用泄漏的三板斧检测

1. **析构日志法**：可疑类型加 `~Watched() { std::cout << "freed"; }`，程序退出时没打「freed」就是没析构——最土、最快、对循环引用最有效的一招；
2. **valgrind**：`valgrind --leak-check=full ./app`，退出时列出「still reachable / definitely lost」的字节数与分配栈；
3. **AddressSanitizer**：`g++ -fsanitize=address` 编译，退出时报 LeakSanitizer 的泄漏栈；double-free / use-after-free 类错误则当场拦截（本节前两个错误就是它的实录）。

## 11. 注意事项清单

- 循环引用不仅限于两个对象，三个或更多对象形成的引用环同样会导致泄漏；
- `weak_ptr` 不能直接访问对象，必须通过 `lock()` 提升为 `shared_ptr`；
- 在多线程环境中，`lock()` 返回后对象可能立即被其他线程销毁，应立即使用返回的 `shared_ptr`；
- `enable_shared_from_this` 提供了 `shared_from_this()` 和 `weak_from_this()` 方法，在成员函数中安全获取自身的智能指针；
- 不要在构造函数中调用 `shared_from_this()`，此时对象尚未被 `shared_ptr` 管理（第 3 节误用二）；
- 使用 `weak_ptr` 观察对象时，应在同一次 `lock()` 后完成所有操作，不要反复 `lock()`——每次提升之间对象都可能死掉，拿着第一份提升结果用完更安全。

## 12. 修改实验

1. 把第 1 节实验的 `Sample` 缩成单个 `int` 再测——分配次数的收益要看对象大小，小对象上差距缩到看不出；
2. 把第 2 节的 `counter->value += 1` 改成 `std::atomic<int>` 与 mutex 各一遍，验证 400000 稳定出现，重跑 TSan 确认报告消失（15 分钟）；
3. 给第 4 节代码加 `static_assert(!std::is_copy_constructible_v<UniqueFile>);`（需 `<type_traits>`），编译通过即验收——unique_ptr 家族天生不可拷贝；
4. 把第 7.1 节泄漏现场跑一遍（确认无析构输出），再换 7.2 的破环版跑一遍（确认两个析构都出现），最后给 `~Node` 里的输出换成计数打印，观察两种版本的析构顺序差异（15 分钟）。

## 13. 小练习

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

挑战题一（半小时）：实现 `FileLineWriter`，验收清单：

- 构造时打开失败抛 `std::runtime_error`；
- `void writeLine(const std::string&)` 每次写入一行；
- 析构自动关闭文件，全程不手写 fclose；
- `static_assert(!std::is_copy_constructible_v<FileLineWriter>);` 编译通过。

提示（思路方向）：成员用 unique_ptr 加自定义删除器，与第 4 节同构。

提示（关键 API）：`std::unique_ptr<FILE, FileCloser>`；`FileCloser::operator()(FILE*)` 里调 `std::fclose`；写入用 `std::fputs` 并补 `'\n'`。

挑战题二（15 分钟）：把第 8.2 节观察者补全可运行——main 里创建一个 Subject 与三个 Observer，两个随后析构，`setState` 广播时验证：存活者收到更新、死者在 notify 中被清理。验收点：程序结束时 Subject 正常析构（在析构函数里打日志）。

---

验证（先写答案再看）：

```text
预测题: 2 2 / 1 / 1 —— weak_ptr 的 use_count 返回的是强引用个数（2 个 shared_ptr），
不是弱引用个数；两次 reset 后对象析构，weak 过期，lock() 只拿到空指针。
```

## 14. 实际场景

- 网络库会话表：第 3 节原型直接落地——连接建立时 `registerSelf` 进全局 map，断线时 erase，最后一个引用消失自动析构，异步回调随时 `shared_from_this` 保活；
- 纹理管理器：`shared_ptr` 保活资源，索引表存 `weak_ptr` 做缓存查询（第 8.4 节的 Cache 正是这个形状），渲染热路径只拿 `const Texture&`——保活与借用各归各位；
- UI 事件系统：按钮持观察者 weak 列表，窗口销毁后无需逐个反注册（第 8.2 节的 notify 自清理）；
- C 库与嵌入式边界：FILE*、SDL_Window 这类句柄用自定义删除器包成 unique_ptr，异常路径不漏句柄；ESP32 这类内存紧张的环境，控制块与原子计数开销要认真掂量，多数场合 unique_ptr 或纯栈对象更合适。

## 15. 与之前和之后的知识的关系

- 往前：[智能指针](/cpp/130-SmartPointerDeepDive) 立起「独占 / 共享 / 观察」模型，本篇拆开它的内脏并把「观察」一路讲到破环与缓存；[C++ 指针](/cpp/120-CppPointers) 的悬垂纪律在第 10 节 `get()` 事故里原样复现；
- 往后：[RAII](/cpp/160-RAIIResourceManagement) 把删除器思路推广到一切资源；Core Guidelines 资源篇（170）把本文纪律成文；
- 更远：多线程（430）与内存序（450/460 篇）会回答「原子计数到底原子在哪」。

## 16. 官方文档

- cppreference shared_ptr（含线程安全注记）：https://en.cppreference.com/w/cpp/memory/shared_ptr
- cppreference weak_ptr（lock/expired 语义）：https://en.cppreference.com/w/cpp/memory/weak_ptr
- cppreference enable_shared_from_this：https://en.cppreference.com/w/cpp/memory/enable_shared_from_this
- cppreference unique_ptr（删除器语义）：https://en.cppreference.com/w/cpp/memory/unique_ptr
- C++ Core Guidelines R.30（智能指针传参纪律）：https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-smartptrparam

## 17. 自我检查

- 能画出 make_shared 与 new 两种内存布局，各说一个代价；
- 能复述三级线程边界，指出第 2 节 TSan 报告命中的是哪一层；
- 能说出 shared_from_this 的两个前提，以及违反时分别以什么报错收场；
- 能默写 weak_ptr 的 lock/expired/use_count 三件套，说出为什么「先 expired 再访问」是两步竞态；
- 能现场写出循环引用泄漏的最小复现，并用 weak_ptr 破环，说出「拥有方向强、回望方向弱」的判断依据；
- 能给双向链表、观察者、树、缓存四类结构各配一句强弱引用摆法；
- 能默写 FileCloser 的完整形状，解释删除器在 unique_ptr 与 shared_ptr 里的存储差异；
- 能给第 5 节表格里的五种签名各配一句「它承诺了什么」。

## 本章总结

shared_ptr 的能力与代价都在控制块：make_shared 一次分配换来缓存友好，也换来「weak 不死内存不还」；原子计数让「各自持有拷贝」天然安全，但同一实例的并发写与所指对象的并发访问都要自己加锁；对象想拿管理着自己的那份 shared_ptr，只有 enable_shared_from_this 一条正路。weak_ptr 是「知道你、不拖住你」的观察者：lock 一气呵成地提升，破环靠「拥有方向强、回望方向弱」，缓存与回调用它做不保活的软引用；环的检测三板斧是析构日志、valgrind 与 ASan。自定义删除器让 unique_ptr 升级成通用资源守卫；而性能敏感路径上，最强的选择常常是引用与裸指针——只看不拥有，把所有权留给边界。

## 下一步

[RAII](/cpp/160-RAIIResourceManagement) 会告诉你，本文的一切——守卫、删除器、观察者——都是「资源生命周期绑对象」这一个思想的特例；之后 Core Guidelines 资源篇（170）把这些纪律读成条文。
