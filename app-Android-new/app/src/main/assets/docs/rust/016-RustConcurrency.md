---
order: 160
title: 并发编程
module: 'rust'
category: 后端技术
difficulty: advanced
description: 线程、通道与 Send/Sync：无数据竞争的并发模型。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'rust/014-RustSmartPointers'
  - 'rust/012-RustAsyncTokio'
  - 'rust/018-RustClosuresFnTraits'
prerequisites:
  - 'rust/014-RustSmartPointers'
---

# 并发编程

演唱会开场前一小时，三个检票窗口同时工作、同一份余票被同时扣减、粉丝请求从四面八方涌向主播——并发无处不在。并发编程的百年难题是**数据竞争**：两个执行流同时读写同一份数据且至少一个在写，结果不可复现。Rust 的答案是"所有权管数据、类型系统管线程"：`Send`/`Sync` 两个标记 trait 在**编译期**拒绝不安全的跨线程共享，把数据竞争从"调试到凌晨"变成"编译不过"。本篇讲透线程、锁、通道三件工具与背后的类型系统原理。

## 前置知识

- [智能指针](/rust/014-RustSmartPointers)：`Arc` 是跨线程共享所有权的载体。
- [闭包与 Fn 特征](/rust/018-RustClosuresFnTraits)：`move` 闭包是线程任务的载体。
- [异步编程与 Tokio](/rust/012-RustAsyncTokio)：async 并发与本篇线程并发的对照。

## 学习目标

1. 会用 `thread::spawn` 创建线程，理解 `move` 闭包的所有权约束。
2. 会用 `Arc<Mutex<T>>` 共享可变状态，理解锁守卫的 RAII 释放。
3. 会用 `RwLock` 处理读多写少场景，会用 mpsc 通道做消息传递。
4. 理解 `Send`/`Sync` 的语义，能解释 Rust 如何在编译期杜绝数据竞争。
5. 能在线程并发与 async 并发之间做出合理选型。

## 1. 线程与 move 闭包：任务的起点

`std::thread::spawn` 接收一个闭包并在新线程执行。这里有个所有权难题：新线程可能活得比创建它的函数更久，如果闭包**借用**了栈上变量，等栈帧销毁，引用全部悬垂。所以实际开发中线程闭包几乎总带 `move`——把捕获变量的所有权搬进闭包，随线程走：

```rust
use std::thread;

fn main() {
    let concert = String::from("虚拟歌手跨年演唱会");

    // move 把 concert 的所有权搬进闭包：数据随线程走，绝不悬垂
    let handle = thread::spawn(move || {
        println!("欢迎来到 {concert}"); // 线程内独占使用
    });
    handle.join().unwrap(); // join 等待线程结束，返回闭包的返回值
    // println!("{concert}"); // 错误[E0382]：所有权已转移给线程
}
```

**解读**：`move` 是编译器强制的"要么交出所有权、要么证明借用在范围内结束"的选择题的前者。不带 `move` 时，若编译器能证明闭包活得不超过被借用变量（例如线程必然在 `main` 结束前 `join`），借用版也能编译——但依赖这种推断会让代码脆弱，线程闭包默认写 `move` 是社区惯例。`join()` 返回 `Result`，线程 panic 时这里是 `Err`，是错误传播的入口。

线程的创建细节还有几点值得了解：`thread::Builder` 可以为线程命名、设置栈大小——名字会出现在 panic 消息与调试器里，排查多线程问题时非常有用；`JoinHandle` 拿到后若直接丢弃，线程会**分离**运行，`main` 结束时进程直接终止、不会等它；线程的返回值也通过 `join()` 取回，闭包的返回类型决定 `JoinHandle<T>` 的 `T`。一个工程提醒：`thread::available_parallelism()` 能查询逻辑核心数，用它决定线程池规模比写死数字更能适配不同机器。

## 2. Mutex<T> 与 Arc<T>：共享可变状态

三个售票窗口卖同一场次的票，余票必须共享且可变。单独的 `Mutex` 无法跨线程共享（它拥有数据、不可复制），`Arc` 提供跨线程的所有权共享——`Arc<Mutex<T>>` 是 Rust 并发最经典的组合：**Arc 管共享，Mutex 管互斥**：

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // 剩余票数：Arc 管跨线程共享，Mutex 管互斥访问
    let tickets = Arc::new(Mutex::new(100u32));

    let handles: Vec<_> = (1..=3)
        .map(|window| {
            let tickets = Arc::clone(&tickets); // 每窗口一份计数份额
            thread::spawn(move || {
                for _ in 0..10 {
                    // lock() 返回 MutexGuard，离开作用域自动解锁
                    let mut n = tickets.lock().unwrap();
                    if *n == 0 {
                        break; // 票已售罄
                    }
                    *n -= 1;
                    println!("窗口 {window} 售出 1 张，余票 {}", *n);
                }
            })
        })
        .collect();
    for h in handles {
        h.join().unwrap();
    }
    println!("最终余票：{}", *tickets.lock().unwrap()); // 70
}
```

**解读**：访问数据必须先 `lock()` 拿守卫，守卫借用出了数据本身（解引用 `MutexGuard` 得 `&mut u32`），守卫销毁即解锁——**你无法在不加锁的情况下访问数据**，这不是纪律而是类型系统的强制。对比其他语言"忘了解锁"或"锁了忘记释放"的隐患，Rust 把锁的生命周期绑定到作用域，忘记解锁在物理上不可能。`lock()` 返回 `Result` 是因为另一线程 panic 会让锁"毒化"（防止它在半更新的状态下被读到），`unwrap()` 表示接受毒化传播。

## 3. RwLock<T>：读多写少的选择

粉丝团名单的典型负载是"查的多、改的少"：成百上千人浏览，偶尔有人加入。`Mutex` 一次只放行一人太浪费，`RwLock` 区分读写——**读锁共享（可多个并发）、写锁独占**：

```rust
use std::sync::RwLock;

fn main() {
    let club = RwLock::new(vec!["星尘", "小夜"]);

    // 读锁可同时被多个读者持有
    let r1 = club.read().unwrap();
    let r2 = club.read().unwrap();
    println!("成员数：{}", r1.len());
    drop((r1, r2)); // 显式释放读锁，写锁才能获取

    // 写锁独占：加入新成员
    club.write().unwrap().push("向晚");
    println!("最新成员：{}", club.read().unwrap()[2]); // 向晚
}
```

**解读**：`drop((r1, r2))` 展示了守卫的另一个特性——锁的生命周期由变量控制，想提前释放就显式 `drop`。选型规则：读远多于写（如配置、缓存）用 `RwLock` 有并发收益；读写频率接近时 `Mutex` 反而更快（`RwLock` 的读写切换有额外开销），且实现更简单。标准库 `Mutex`/`RwLock` 适合**同步临界区**；async 代码中跨 `.await` 持锁要用 `tokio::sync::Mutex`，这是《异步编程与 Tokio》强调过的红线。

## 4. channel：用通信代替共享内存

Go 语言的名言同样适用于 Rust："不要通过共享内存来通信，而要通过通信来共享内存。" `mpsc`（多生产者单消费者）通道让线程之间**传数据所有权**而非共享数据——数据被 `send` 移入通道、被 `recv` 移出，同一时刻只有一个线程持有它，天然无竞争。场景：多个粉丝端提交点歌请求，主播端逐一处理：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel(); // 发送端 tx，接收端 rx

    // 三个粉丝端各自提交点歌请求（克隆出多个发送端）
    for fan in ["星野", "雨宫", "结月"] {
        let tx = tx.clone();
        thread::spawn(move || {
            tx.send(format!("{fan} 点播《银河回廊》")).unwrap();
        });
    }
    drop(tx); // 丢弃主发送端：所有发送端关闭后循环才能结束

    // 主播端按到达顺序处理，迭代器会在通道关闭时自然结束
    for msg in rx {
        println!("收到：{msg}");
    }
}
```

**解读**：`send` 转移值的所有权进通道（`Send` 泛型约束），接收方拿到的是独占数据，读完即可处理或转发——数据在任一时刻只有一个主人，所以没有任何竞争可言。两个易错点：其一，`for msg in rx` 会阻塞直到通道**完全关闭**（所有发送端都被丢弃），忘记 `drop(tx)` 会让主线程永远等下去；其二，`recv` 拿到的是数据的所有权，这意味着线程间传大对象不必加锁也不必拷贝。消息传递是 Rust 并发的首选风格，锁是第二选择。

标准库通道还有两个进阶变体值得认识：`sync_channel(n)` 是**有界通道**，缓冲区满时 `send` 会阻塞——这天然形成了生产者对消费者的背压（backpressure），防止请求无限堆积打爆内存，Web 服务器的任务队列几乎都用它；`try_send`/`try_recv` 则是永不阻塞的非阻塞版本，适合"忙不过来就丢弃或排队"的轮询式设计。生态中的 `crossbeam-channel` 提供了多消费者（MPMC）、超时选择等增强，标准库版本够用时应优先标准库，需要 `select` 多路等待时再引入第三方。

## 5. Send 与 Sync：编译期的数据竞争防线

两个标记 trait 是 Rust 并发安全的基石：

- **`Send`**：类型的所有权可以安全地**转移**到另一个线程。几乎所有类型都自动实现；反例是 `Rc`（非原子计数）与裸指针。
- **`Sync`**：类型的引用 `&T` 可以安全地**跨线程共享**。等价于 `T: Send` 且 `&T: Send`；反例是 `RefCell`（运行期借用检查不是线程安全的）。

它们是自动派生的：结构体的字段全 `Send` 则整体 `Send`。编译器用它们检查每一个 `thread::spawn` 的闭包——闭包捕获的数据必须 `Send`。这就是 `Rc` 传进线程直接报错的原因：

```rust
use std::rc::Rc;

fn main() {
    let song = Rc::new(String::from("逆光飞行"));

    // thread::spawn(move || println!("{song}"));
    // 错误[E0277]：`Rc<String>` cannot be sent between threads safely
    // 原因：Rc 的计数器是普通整数，两个线程同时 clone/释放会产生数据竞争

    println!("Rc 只能留在单线程内使用：{}", *song);
}
```

**解读**：把上面的 `Rc` 换成 `Arc` 立即编译通过——`Arc` 的计数器是原子操作，实现了 `Send + Sync`。这就是 Rust"无数据竞争"承诺的实现机制：**不安全的组合（Rc 跨线程、RefCell 跨线程共享）在类型层面就被拒绝**，而不是运行时偶尔崩溃。反过来，`Mutex<T>: Sync`（只要 `T: Send`）——锁把"非 Sync"的数据变成"可安全共享"，这是类型系统与并发原语的精妙配合。

`Send`/`Sync` 与智能指针的组合关系可以整理成一张速查表，遇到"能不能跨线程"的问题时按表索骥：

| 类型 | Send | Sync | 说明 |
| :--- | :--- | :--- | :--- |
| `T`（普通拥有型） | 是 | 是 | 字段决定，自动派生 |
| `Rc<T>` | 否 | 否 | 非原子计数，单线程专用 |
| `Arc<T>` | 是（T: Send+Sync） | 是 | 原子计数，跨线程共享 |
| `RefCell<T>` | 是 | 否 | 运行期借用检查非线程安全 |
| `Mutex<T>` | 是（T: Send） | 是 | 锁提供互斥，包装后可共享 |
| `*mut T`（裸指针） | 否 | 否 | 明确排除在跨线程之外 |

**解读**：注意"组合改变性质"的规律——`RefCell` 单独不能共享，包上 `Mutex` 就可以；`Rc` 换成 `Arc` 就可以。设计多线程数据结构时，从内向外逐层问"这一层是什么类型的 Send/Sync 属性"，比记住整个组合规则更可靠。

## 6. 线程并发与 async 并发的取舍

Rust 有两套并发模型，选错方向会让代码量与性能双双失控：

| 维度 | 线程（std::thread） | async（Tokio） |
| :--- | :--- | :--- |
| 适用负载 | CPU 密集、少量长任务 | IO 密集、海量并发连接 |
| 调度方式 | 操作系统抢占式 | 运行时协作式（await 让出） |
| 单任务开销 | 每线程约 MB 级栈 | 每任务数百字节 |
| 阻塞操作 | 允许（占住一个线程） | 禁止（卡死整个 worker） |
| 典型场景 | 图像渲染、批量计算、并行编解码 | Web 服务、爬虫、长连接网关 |

经验法则：**等待多（IO）选 async，计算多（CPU）选线程**；两者并不互斥——async 程序里跑 CPU 密集任务用 `tokio::task::spawn_blocking` 或 `rayon` 线程池，线程程序里等 IO 也可以起 async 运行时。Web 后端几乎都是 async 为主、CPU 段落下沉到阻塞线程池的混合架构。

## 易错点与最佳实践

1. **线程闭包借用栈变量不加 move**。错误：`thread::spawn(|| println!("{concert}"))`，编译器无法保证线程寿命，报借用超期。修正：`move ||` 交出所有权；需要"共享"则先 `Arc::clone`。
2. **锁的临界区过长**。错误：在持有 `MutexGuard` 期间做 IO 或重计算，其他线程全部排队。修正：锁内只做"读取-修改-写回"，把取出的数据（clone 或移出）在锁外处理。
3. **忘记 drop 最后一个发送端**。错误：`for msg in rx` 永不结束，主线程卡死。修正：主发送端用完即 `drop(tx)`；克隆出的发送端随线程结束自动释放。
4. **把 `Rc`/`RefCell` 带进线程**。错误：`Rc<T>` 报 `cannot be sent between threads`，`RefCell<T>` 报 `cannot be shared between threads`。修正：换 `Arc<T>` 与 `Mutex<T>`/`RwLock<T>`。
5. **优先共享，其次消息**。最佳实践顺序恰好相反：**优先 channel 消息传递**（数据单一所有者，无需思考锁），确需共享状态时再上 `Arc<Mutex<T>>`，并保持锁粒度最小。

## 本篇小结

1. `thread::spawn` + `move` 闭包是线程任务的标配：所有权随闭包进入线程，借用悬垂在编译期被拒绝。
2. `Arc<Mutex<T>>` 是共享可变状态的黄金组合：Arc 管共享、Mutex 管互斥，锁守卫 RAII 自动释放，忘记解锁在物理上不可能。
3. `RwLock` 用读写分离优化读多写少；mpsc 通道用"转移所有权"代替"共享内存"，是并发设计的首选风格。
4. `Send`（所有权可跨线程转移）与 `Sync`（引用可跨线程共享）两个标记 trait，把数据竞争拦截在编译期。
5. 选型口诀：IO 密集选 async、CPU 密集选线程；混合负载用 `spawn_blocking` 桥接。

> **一句话记忆**：并发的 Rust 哲学——"要么把所有权交给线程（move + channel），要么把共享关进锁里（Arc + Mutex）"；`Send`/`Sync` 让"不安全的组合"根本编译不过，数据竞争从运行期事故变成编译期错误。

## 动手实践

1. 用四个线程并行统计一万首歌曲的总播放量：把歌曲数组切成四段，各线程累加自己那段，最后用 `Arc<Mutex<u64>>` 或 `join` 返回值汇总。思路：对比"共享累加器加锁"与"各算各的再合并"两种写法的性能与复杂度。
2. 用 mpsc 通道实现"双向点歌台"：粉丝端发送点歌请求，主播端处理后沿第二个通道回发确认消息，粉丝端打印回执。思路：两条通道或一条通道 + 枚举消息（`Request`/`Ack`）区分方向。
3. 把单线程版的 `Rc<RefCell<u32>>` 计数器直接搬进 `thread::spawn`，观察编译器报错信息；再把 `Rc` 换成 `Arc`、`RefCell` 换成 `Mutex` 修复，逐行体会类型系统如何引导正确的并发写法。
