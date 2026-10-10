---
order: 160
title: "异步编程与 Tokio：让等待的时间干活"
module: 'rust'
category: 后端技术
difficulty: advanced
description: "以音乐平台并发拉取千张专辑封面为任务背景，讲透 Future 的惰性本质、tokio 运行时、join!/spawn/select!/timeout 四种并发模式与四大陷阱（同步阻塞、跨 await 持锁、非 Send、递归 async），附前后耗时对比实测。"
author: fanquanpp
updated: '2026-10-07'
related:
  - 'rust/140-RustEcosystemProject'
  - 'rust/100-RustGenericTrait'
  - 'rust/170-RustConcurrency'
prerequisites:
  - 'rust/100-RustGenericTrait'
---

网络服务的大部分时间不是在计算，而是在**等**：等数据库返回、等网络包到达、等磁盘读完。线程模型下，每个等待中的连接都占着一个 OS 线程（约 1 到 8 MB 栈内存），一万并发连接就是上 GB 的纯等待开销——这就是经典的 C10K 问题。异步编程的答案是：**一个任务在等待 I/O 时主动让出线程，让别的任务先用**，少量线程就能服务海量并发。本篇以「音乐平台并发拉取 1000 张专辑封面」为任务背景，从 Future 的本质讲到 tokio 的并发模式，最后把四个高频陷阱逐一踩一遍。

## 前置知识

- [泛型与 Trait](/rust/100-RustGenericTrait)：trait 对象与 `Send`/`Sync` 的基本含义（陷阱一节会用到）。
- [并发编程](/rust/170-RustConcurrency)：线程与 `Arc<Mutex<T>>` 的用法——异步是它的续篇而非替代。

## 学习目标

1. 说清 async/await 与线程模型的区别，知道什么任务适合异步。
2. 理解 Future 的惰性：不 await 不执行，运行时才是发动机。
3. 会用 `join!`、`tokio::spawn`、`select!`、`timeout` 四种模式组织并发。
4. 能识别并避开四大陷阱：同步阻塞、跨 await 持锁、非 Send Future、递归 async。

## 1. 三种并发模型，先选对赛道

| 模型 | 并发单位 | 每连接开销 | Rust 工具 | 适合 |
| --- | --- | --- | --- | --- |
| 线程 | OS 线程 | 大（MB 级栈 + 切换） | `std::thread` | 并发数几十到几百、CPU 密集 |
| 异步 | 任务（Future） | 极小（KB 级） | tokio 等 | 海量 I/O 并发连接 |
| 混合 | 任务 + 线程池 | 中 | tokio 多线程运行时 | I/O 密集 + CPU 密集混合负载 |

一个直觉校准：并发 100 个连接，线程模型完全够用且更简单；并发上万或单机要榨干 I/O 吞吐，异步才有必要。**不要因为异步流行就什么项目都上异步**——它换来吞吐，付出的是心智负担（本文陷阱一节就是证据）。

## 2. Future 的本质：惰性的、要人驱动的值

`async fn` 不执行函数体，它**返回一个 Future**——一个「尚未完成的计算」。这个设计有两个直接后果，先看代码：

```rust
async fn fetch_cover(id: u32) -> String {
    println!("开始拉取封面 {id}");
    tokio::time::sleep(std::time::Duration::from_millis(100)).await; // 模拟网络耗时
    println!("封面 {id} 到手");
    format!("cover-{id}.png")
}
```

两个要点：

1. **不 await 就不执行**。`let f = fetch_cover(1);` 这一行什么都不会发生——连「开始拉取」都不会打印。Future 只是存好了「要做什么」，必须交给运行时轮询（poll）才推进。
2. **`.await` 是让出点**。执行到 `sleep(...).await` 时，当前任务挂起，线程转身去跑其他任务；计时到期后运行时再把任务唤醒续跑。等待期间线程不闲着，这就是异步省资源的原理。

## 3. 运行时：Future 的发动机

Future 自己不会跑，需要一个**执行器**反复 poll 它。Rust 标准库刻意不提供执行器，把它留给生态——事实标准是 tokio：

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }   # 学习期直接开 full，生产按需精简
```

```rust
#[tokio::main]                  // 语法糖：建多线程运行时 + block_on
async fn main() {
    let cover = fetch_cover(1).await;
    println!("{cover}");
}
```

等价的展开写法，能看清 `#[tokio::main]` 到底做了什么：

```rust
fn main() {
    let rt = tokio::runtime::Runtime::new().unwrap(); // worker 线程数默认按 CPU 核数
    rt.block_on(async {
        let cover = fetch_cover(1).await;
        println!("{cover}");
    });
}
```

`block_on` 是「同步世界进入异步世界」的唯一大门：它在**同步 main** 里阻塞等待一个 Future 完成，其内部再由运行时调度成千上万的异步任务。记住方向：异步代码不能反过来直接调同步世界，只能整个运行时结束后出去。

## 4. 并发模式四件套

### 4.1 顺序 await：最慢的写法（常被误以为是并发）

```rust
#[tokio::main]
async fn main() {
    let a = fetch_cover(1).await;   // 等 100ms
    let b = fetch_cover(2).await;   // 再等 100ms
    // 总耗时 200ms——两个任务并没有并发！
}
```

连续 `.await` 是串行的。这是异步新手最常见的一处误解：写了 async 不代表并发，**并发的关键是「先创建、再统一等待」**。

### 4.2 join!：同时等待多个 Future

```rust
use tokio::join;

#[tokio::main]
async fn main() {
    let (a, b) = join!(fetch_cover(1), fetch_cover(2));
    // 两个任务并发推进，总耗时约 100ms（取最慢者），结果按序返回
    println!("{a} {b}");
}
```

`join!` 适合「这几个任务我都要等结果」的场景；任务在同一个任务体内并发，不产生新的调度单元。

### 4.3 spawn：把任务丢上运行时

```rust
#[tokio::main]
async fn main() {
    let tasks: Vec<_> = (0..1000)
        .map(|id| tokio::spawn(fetch_cover(id)))   // 1000 个任务并发跑在少量线程上
        .collect();

    let mut covers = vec![];
    for t in tasks {
        covers.push(t.await.unwrap());   // JoinHandle 的结果是 Result（任务可能 panic）
    }
    println!("拉取完成 {} 张", covers.len());   // 总耗时约等于最慢一批的时间
}
```

`tokio::spawn` 把 Future 交给运行时独立调度，返回 `JoinHandle<T>`。1000 个并发连接各占一个任务，而线程只有 CPU 核数个——开篇的 C10K 问题在这里被消化。注意 spawn 的 Future 必须是 `'static` 且 `Send`（陷阱三细说）。

### 4.4 timeout 与 select!：给等待加上保险

外部调用必须防超时：

```rust
use tokio::time::{timeout, Duration};

match timeout(Duration::from_secs(2), fetch_cover(7)).await {
    Ok(cover) => println!("拿到 {cover}"),
    Err(_) => eprintln!("封面 7 超时，走兜底"),
}
```

`select!` 同时等待多个 Future，**谁先完成执行谁**，其余分支被取消——超时、取消、优雅关闭的标准构件：

```rust
use tokio::select;

select! {
    cover = fetch_cover(1) => println!("数据先到：{cover}"),
    _ = tokio::time::sleep(Duration::from_secs(1)) => println!("1 秒到了，放弃等待"),
}
```

## 5. 共享状态：Arc 加异步锁

1000 个拉取任务要汇总统计（比如计数成功几张），需要共享一个计数器：

```rust
use std::sync::Arc;
use tokio::sync::Mutex;

#[tokio::main]
async fn main() {
    let counter = Arc::new(Mutex::new(0u32));

    let mut handles = vec![];
    for _ in 0..10 {
        let c = Arc::clone(&counter);
        handles.push(tokio::spawn(async move {
            let mut n = c.lock().await;   // 注意：锁本身要 .await
            *n += 1;
        }));
    }
    for h in handles { h.await.unwrap(); }
    println!("成功 {}", *counter.lock().await);
}
```

`Arc` 管多任务共享所有权（和线程篇一致），`tokio::sync::Mutex` 管互斥。什么时候用 tokio 锁、什么时候用标准库锁，是高频疑问，规则一句话：**持锁期间要跨 `.await` 的用 tokio 锁；临界区是纯同步代码的用 `std::sync::Mutex`（更轻更快）**。陷阱二解释为什么这条规则是强制性的。

tokio 常用组件与同步世界对照：

| tokio 组件 | 用途 | 同步对应 |
| --- | --- | --- |
| `tokio::spawn` | 后台任务 | `std::thread::spawn` |
| `tokio::time::sleep` | 异步等待 | `std::thread::sleep` |
| `tokio::sync::Mutex` | 异步互斥锁 | `std::sync::Mutex` |
| `tokio::sync::mpsc` | 异步通道 | `std::sync::mpsc` |
| `tokio::io` | 异步读写 | `std::io` |

## 6. 四大陷阱：每个异步开发者都会撞一次

### 6.1 陷阱一：同步阻塞卡死整个 worker

```rust
// 错误：同步 sleep 卡住 worker 线程，跑在该线程上的所有任务全部停摆
std::thread::sleep(Duration::from_secs(1));

// 正确：异步 sleep，让出线程
tokio::time::sleep(Duration::from_secs(1)).await;
```

同理不适用的还有同步文件 I/O、`std::sync::mpsc` 的阻塞 `recv()`、以及任何 CPU 密集的大循环。CPU 密集或不得不同步的代码，丢给专门的阻塞线程池：

```rust
let heavy = tokio::task::spawn_blocking(|| {
    // 同步的、CPU 密集的计算，跑在独立线程池，不占异步 worker
    (0..10_000_000u64).sum::<u64>()
});
println!("{}", heavy.await.unwrap());
```

这条是异步编程的第一红线：**worker 线程上只跑「快速让出」的代码**。

### 6.2 陷阱二：标准库锁跨 await 持有

```rust
use std::sync::Mutex;   // 错误示范的根源

async fn bad(m: &Mutex<u32>) {
    let _guard = m.lock().unwrap();
    fetch_cover(1).await;   // 若能编译：guard 跨 await 持有，同一线程上的其他任务
}                           // 想拿同一把锁时，而当前任务又挂起不放 —— 死锁
```

实际情况更好：`std::sync::MutexGuard` 没实现 `Send`，这个 Future 被多线程运行时的 spawn 拒收时直接**编译错误**；但用 `block_on` 单线程驱动时它真能编译过并死锁。所以规则照旧：跨 await 的共享状态用 `tokio::sync::Mutex`；或者更优——把临界区收敛到不跨 await 的小段里，用 std 锁。

### 6.3 陷阱三：future cannot be sent between threads

`tokio::spawn` 要求任务是 `Send`（会在多个 worker 线程间移动）。任务里若持有非 `Send` 类型（`Rc`、`RefCell`、裸指针），编译器报「future cannot be sent between threads safely」。对策：异步任务内用 `Arc`/`Mutex` 替代 `Rc`/`RefCell`；确属单线程场景可用 `tokio::task::spawn_local` 或 `LocalSet`。这个报错的详细解读见[借用检查器报错实战](/rust/060-RustBorrowCheckerErrorGuide)的同族错误。

### 6.4 陷阱四：递归 async 与 trait 里的 async fn

递归 async 函数编译不过，因为 Future 的大小会无限递归（函数返回值大小包含它自身）：

```rust
// 编译错误: recursive async fn
// async fn rec(n: u32) -> u32 {
//     if n == 0 { 0 } else { rec(n - 1).await + 1 }
// }

// 正确：Box::pin 把 Future 固定到堆上，大小变成确定的指针
async fn rec(n: u32) -> u32 {
    if n == 0 { 0 } else { Box::pin(rec(n - 1)).await + 1 }
}
```

trait 中的异步方法自 Rust 1.75 起可原生声明 `async fn`，不再必须 `async-trait` crate；但需要 trait 对象（`dyn`）动态分发或方法递归时，仍要 `Box::pin` 或 `async-trait` 兜底。

## 7. 完整示例：并发拉取 1000 张封面，带超时与统计

把四件套和共享状态组装成一个真实形状的程序：

```rust
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tokio::time::timeout;

async fn fetch_cover(id: u32) -> String {
    tokio::time::sleep(Duration::from_millis(100)).await;  // 模拟网络
    format!("cover-{id}.png")
}

#[tokio::main]
async fn main() {
    let stats = Arc::new(Mutex::new((0u32, 0u32)));  // (成功, 超时)
    let start = Instant::now();

    let tasks: Vec<_> = (0..1000)
        .map(|id| {
            let stats = Arc::clone(&stats);
            tokio::spawn(async move {
                match timeout(Duration::from_millis(500), fetch_cover(id)).await {
                    Ok(cover) => {
                        let mut s = stats.lock().await;
                        s.0 += 1;
                        Some(cover)
                    }
                    Err(_) => {
                        let mut s = stats.lock().await;
                        s.1 += 1;
                        None
                    }
                }
            })
        })
        .collect();

    let mut covers = vec![];
    for t in tasks {
        if let Some(c) = t.await.unwrap() { covers.push(c); }
    }

    let (ok, timed_out) = *stats.lock().await;
    println!("成功 {ok} 张，超时 {timed_out} 张，耗时 {:?}", start.elapsed());
    // 1000 个任务并发推进，总耗时约几百毫秒，而非串行的 100 秒
}
```

顺序 await 这 1000 张要约 100 秒；并发后约 0.5 秒封顶（受超时约束）——这就是开篇「让等待的时间干活」的量化答案。

## 8. 小练习

1. 把第 7 节的 `timeout` 改成 50ms，让大部分任务超时，验证统计计数正确；
2. 用 `join!` 并发执行三个 `fetch_cover`，打印总耗时，再改成顺序 await 对比——亲手量出差距；
3. 在 async 块里故意写 `std::thread::sleep`，观察运行表现（几个任务时看不出问题，开 100 个任务就能看到吞吐崩塌），再换成 `tokio::time::sleep` 修复；
4. 写一个递归 async 函数，先不加 `Box::pin` 读编译错误，再加修复；
5. 用 `select!` 实现一个「按任意键或 3 秒超时先到者退出」的循环（提示：`tokio::task::block_in_place` 与 stdin 是选做，思路对即可）。

## 9. 常见问题速查

| 报错/现象 | 原因 | 处理 |
| --- | --- | --- |
| async fn 调用后没有任何输出 | Future 惰性，没被 await/驱动 | 补 `.await`，确认在运行时内执行 |
| `future cannot be sent between threads` | 任务捕获了非 Send 类型 | `Rc`/`RefCell` 换 `Arc`/`Mutex` |
| 服务吞吐远低于预期 | worker 上有同步阻塞调用 | 阻塞代码移入 `spawn_blocking` |
| 偶发死锁 | std 锁跨 await 持有 | 换 tokio 锁或收敛临界区 |
| `there is no reactor running` | 在运行时外调用了异步 API | 确认入口是 `#[tokio::main]` 或 `block_on` |

## 10. 自我检查

1. `async fn` 的函数体什么时候执行？`.await` 时线程在做什么？
2. 连续两次 `.await` 是并发吗？三种并发写法（顺序、`join!`、`spawn`）的耗时各由什么决定？
3. 为什么持锁跨 await 必须用 `tokio::sync::Mutex`？什么情况应该反过来选 std 锁？
4. `spawn_blocking` 解决什么问题？它和 `tokio::spawn` 的任务跑在哪？
5. 递归 async 函数为什么必须 `Box::pin`？

## 本章总结

异步的本质是「等待时让出」：Future 惰性存储计算，运行时（tokio）负责驱动，`.await` 是让出点。并发四件套各司其职——`join!` 等一组已知任务、`spawn` 撒手交给运行时、`select!` 多路竞速、`timeout` 封顶等待。红线两条：worker 线程绝不跑同步阻塞（用 `spawn_blocking` 桥接），跨 await 的锁必须用异步感知的 tokio 锁。记住第 1 节的选型表：异步是为海量 I/O 等待准备的工具，不是默认选项。

## 下一步

工具齐了，下一篇 [常用生态与实战](/rust/140-RustEcosystemProject)用 axum、serde、clap、tracing 把本篇的并发能力组装成一个真实可跑的 Web 服务。
