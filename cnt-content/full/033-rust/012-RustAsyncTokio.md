---
order: 120
title: 异步编程与 Tokio
module: 'rust'
category: 后端技术
difficulty: advanced
description: async/await 与 Future、tokio 运行时、常见异步模式与陷阱
author: fanquanpp
updated: '2026-09-08'
related:
  - 'rust/013-RustEcosystemProject'
  - 'rust/010-RustGenericTrait'
prerequisites:
  - 'rust/010-RustGenericTrait'
---


## 1. 为什么需要异步

网络服务大量时间花在等待 I/O（读写套接字、访问数据库）。传统线程模型为每个连接开一个线程，线程切换与内存开销巨大（"C10K 问题"）。异步编程让**单个线程在等待 I/O 时去执行其他任务**，用少量线程服务海量并发连接。

对比三种模型：

| 模型 | 并发单位 | 开销 | Rust 生态 |
| --- | --- | --- | --- |
| 线程 | OS 线程 | 大（栈内存、切换） | std::thread |
| 异步 | 任务（Future） | 极小 | tokio / async-std |
| 混合 | 任务 + 线程池 | 中 | tokio 多线程运行时 |

## 2. Future 与 async/await

`Future` 是一个"尚未完成的计算"的抽象：一个可被反复轮询（poll）直到完成的惰性值。

```rust
use tokio::time::{sleep, Duration};

async fn do_work(id: u32) -> u32 {
    println!("任务 {id} 开始");
    sleep(Duration::from_millis(100 * id as u64)).await; // 等待 100ms*id
    println!("任务 {id} 完成");
    id
}
```

讲解：`async fn` 返回一个 Future；函数体**不会立刻执行**，只有被运行时驱动（poll）时才开始。`sleep(...).await` 挂起当前任务，让出执行权，等待到期后继续。

### 2.1 执行入口

async 函数必须在一个运行时上执行：

```rust
#[tokio::main]
async fn main() {
    let a = do_work(1).await;   // 顺序等待：1s
    let b = do_work(2).await;
    println!("{a} {b}");
}
```

讲解：`#[tokio::main]` 宏启动 tokio 多线程运行时并运行 async main。顺序 `await` 时任务一个接一个执行；并发需要用 join 或 spawn。

### 2.2 并发执行

```rust
use tokio::join;

#[tokio::main]
async fn main() {
    let (a, b) = join!(do_work(1), do_work(2));  // 同时等待，共约 2s 而非 3s
    println!("{a} {b}");
}
```

`join!` 并发等待多个 Future；`tokio::spawn` 则把任务放到运行时上独立调度：

```rust
#[tokio::main]
async fn main() {
    let handle = tokio::spawn(do_work(3));   // 后台任务
    println!("main 继续做别的事");
    let result = handle.await.unwrap();      // 等待后台任务完成
    println!("{result}");
}
```

讲解：`spawn` 返回 `JoinHandle`，`await` 它得到 `Result<T, JoinError>`（任务 panic 时是 Err）。

## 3. tokio 运行时

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }  # full 开启全部特性
```

运行时配置：

```rust
use tokio::runtime::Runtime;

fn main() {
    let rt = Runtime::new().unwrap();   // 多线程运行时，默认按 CPU 核数建 worker
    rt.block_on(async {
        println!("在运行时内执行异步代码");
    });
}
```

讲解：`#[tokio::main]` 就是"创建多线程 Runtime + block_on"的语法糖。`block_on` 是"同步世界进入异步世界"的入口。

### 3.1 常用异步组件

| tokio 组件 | 用途 | 对应同步概念 |
| --- | --- | --- |
| tokio::spawn | 后台任务 | std::thread::spawn |
| tokio::time::sleep | 异步等待 | std::thread::sleep |
| tokio::sync::Mutex | 异步互斥锁 | std::sync::Mutex |
| tokio::sync::mpsc | 多生产者单消费者通道 | std::sync::mpsc |
| tokio::io::{AsyncRead, AsyncWrite} | 异步读写 | std::io |

## 4. 常见异步模式

### 4.1 超时控制

```rust
use tokio::time::{timeout, Duration};

async fn fetch() -> String {
    sleep(Duration::from_secs(5)).await;
    String::from("数据")
}

#[tokio::main]
async fn main() {
    match timeout(Duration::from_secs(2), fetch()).await {
        Ok(data) => println!("拿到：{data}"),
        Err(_) => eprintln!("请求超时"),
    }
}
```

讲解：`timeout` 给 Future 加时间限制，超时返回 Err——外部 API 调用的必备防护。

### 4.2 异步共享状态：Mutex

```rust
use std::sync::Arc;
use tokio::sync::Mutex;

#[tokio::main]
async fn main() {
    let counter = Arc::new(Mutex::new(0));

    let mut handles = vec![];
    for _ in 0..10 {
        let c = Arc::clone(&counter);
        handles.push(tokio::spawn(async move {
            let mut guard = c.lock().await;
            *guard += 1;
        }));
    }
    for h in handles {
        h.await.unwrap();
    }
    println!("counter = {}", *counter.lock().await); // 10
}
```

讲解：`Arc` 提供多任务共享所有权；`tokio::sync::Mutex` 的锁要 `.await`（因为等待时会让出执行权）。**同步代码跨 await 持锁会死锁**——详见陷阱部分。

### 4.3 Select：多路选择

```rust
use tokio::select;

#[tokio::main]
async fn main() {
    let work = do_work(1);
    let shutdown = sleep(Duration::from_secs(1));

    select! {
        v = work => println!("任务先完成：{v}"),
        _ = shutdown => println!("1 秒到，取消任务"),
    }
}
```

讲解：`select!` 同时等待多个 Future，**谁先完成执行谁**，未完成的分支被取消——实现超时、取消、优雅关闭的标准武器。

## 5. 常见陷阱与对策

### 5.1 阻塞调用卡死运行时

```rust
#[tokio::main]
async fn main() {
    // 错误：同步阻塞 sleep 会卡住整个 worker 线程
    // std::thread::sleep(Duration::from_secs(1));

    // 正确：用异步 sleep
    tokio::time::sleep(Duration::from_secs(1)).await;
}
```

讲解：异步代码中**绝不使用同步阻塞调用**（thread::sleep、同步文件读写、CPU 密集计算），否则整个 worker 线程被卡住，并发吞吐瞬间崩塌。CPU 密集或阻塞 I/O 用 `spawn_blocking`：

```rust
let heavy = tokio::task::spawn_blocking(|| {
    // 同步的、CPU 密集的计算（如图像处理）
    let mut sum = 0u64;
    for i in 0..10_000_000 { sum += i; }
    sum
});
println!("{}", heavy.await.unwrap());
```

讲解：`spawn_blocking` 把同步任务丢到专门线程池执行，不阻塞异步 worker——阻塞代码与异步代码的正确桥接。

### 5.2 锁跨 await 与死锁

```rust
use std::sync::Mutex;   // 错误示范：标准库锁不是异步感知的

async fn bad() {
    // 标准库 MutexGuard 不是 Send，跨 await 无法编译
    // let guard = std_mutex.lock().unwrap();
    // some_async().await;   // 编译错误
}
```

讲解：标准库 `MutexGuard` 跨 await 持有会被编译器拒绝（不是 Send）；`tokio::sync::Mutex` 专门解决此问题。规则：**跨 await 的共享状态用 tokio 锁，纯同步临界区用 std 锁（更快）**。

### 5.3 Future 不是 Send 的报错

spawn 的任务若捕获了非 Send 类型（如裸指针、Rc），编译器报"future cannot be sent between threads"。对策：避免在 async 任务中持有 Rc/RefCell；用 Arc/Mutex 代替。

### 5.4 async 递归与 trait 的坑

```rust
// 递归 async fn 需要 Box::pin 包裹（Rust 2024 之前）
async fn rec(n: u32) -> u32 {
    if n == 0 { 0 } else { Box::pin(rec(n - 1)).await + 1 }
}
```

讲解：async fn 返回的 Future 大小不定（递归时未知），用 `Box::pin` 固定到堆上；trait 中的 async 方法也需类似处理（或用 async-trait crate）。

## 6. 综合示例：并发下载模拟

```rust
use tokio::time::{sleep, Duration};

async fn download(id: u32) -> u32 {
    sleep(Duration::from_millis(300)).await;   // 模拟网络耗时
    id * 10
}

#[tokio::main]
async fn main() {
    let tasks: Vec<_> = (0..10).map(|i| tokio::spawn(download(i))).collect();
    let mut results = vec![];
    for t in tasks {
        results.push(t.await.unwrap());
    }
    println!("结果: {results:?}");  // 10 个并发下载，总耗时约 300ms
}
```

讲解：`spawn` 并发执行 10 个下载任务，总耗时从 3 秒降到 0.3 秒——这就是异步的吞吐威力。`JoinHandle` 按序 await，但任务是并发的。

## 9. 小结

异步的核心是"Future 惰性 + await 挂起 + 运行时调度"：async 定义任务、await 等待完成、join!/spawn 并发、select! 多路选择、timeout 超时防护。牢记两条红线：异步中不用同步阻塞、跨 await 用 tokio 锁。下一步用 axum、serde、clap 搭建真实项目。

> **一句话记忆**：异步五件套——"`async fn` 定义任务、`.await` 挂起等待、`join!`/`spawn` 并发、`select!` 多路选择、`timeout` 超时防护"；两条红线：**异步代码绝不同步阻塞**（用 `spawn_blocking`）、**跨 await 用 tokio 锁**（`std::sync::Mutex` 会死锁）。
