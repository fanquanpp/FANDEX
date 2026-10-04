---
order: 180
title: GMP 调度模型：goroutine 是怎么被跑起来的
module: 'go'
category: 后端技术
difficulty: advanced
description: 以"服务搬进 2 核容器后延迟反升"为主线学 GMP：G/M/P 各自管什么、调度时机与 work stealing、系统调用 hand-off、GOMAXPROCS 在容器里的正确姿势、trace 与 schedtrace 观测，附坑点、自检与练习。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'go/160-GoroutineChannelPrinciple'
  - 'go/180-GoroutineSchedule'
  - 'go/200-ConcurrencyPattern'
  - 'go/580-GoPerformanceAnalysis'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---


## 真实场景：同一份代码，搬进容器后吞吐掉了一半

你在开发机上写了一个并发抓取服务，`go build` 之后压测轻松跑满 16 核。上线到 Kubernetes，容器 CPU limit 写的是 2 核，结果延迟反而比开发机还高，CPU 显示 2000% 被限流（throttled）打满。

原因很可能与 Go 无关、与操作系统有关：老版本 Go 的运行时在启动时按"机器核心数"设置 GOMAXPROCS，而容器里的 Go 进程看到的是宿主机的 64 核，不是 limit 里的 2 核。于是调度器开出 64 个逻辑处理器 P，64 个线程抢 2 核的配额，CPU 配额每个周期都被提前用光，剩下时间全在等下一周期——吞吐自然掉。

这就是为什么后端 Go 工程师需要理解 GMP 调度模型：它解释了 goroutine 是怎么被放上线程的、为什么容器环境要关心 GOMAXPROCS、以及为什么一个死循环能（或不能）拖垮整个进程。

## 动手第一步：把 G、M、P 变成能看到的数字

GMP 三个字母各代表一个实体：

- **G（goroutine）**：一次 `go func()` 产生一个 G，自带 2KB 初始栈，持有栈指针与调度状态；
- **M（machine）**：操作系统线程，真正执行代码的角色；
- **P（processor）**：逻辑处理器，G 与 M 之间的"工位"——G 必须被某个 P 安排，M 必须绑定一个 P 才能干活。P 的数量就是 GOMAXPROCS。

先跑一段代码，把数量打印出来：

```go
package main

import (
    "fmt"
    "runtime"
)

func main() {
    fmt.Println("P 数量 (GOMAXPROCS):", runtime.GOMAXPROCS(0))
    fmt.Println("CPU 核心数:", runtime.NumCPU())
    fmt.Println("当前 G 数量:", runtime.NumGoroutine()) // main 本身也是一个 G

    for i := 0; i < 100; i++ {
        go func(id int) {
            // 睡一下，别让 G 太快退出，方便观察
            select {}
        }(i)
    }
    fmt.Println("启动后 G 数量:", runtime.NumGoroutine()) // 101
}
```

预期输出（核数因机器而异）：

```text
P 数量 (GOMAXPROCS): 8
CPU 核心数: 8
当前 G 数量: 1
启动后 G 数量: 101
```

关键观察：P 的数量远小于 G 的数量。100 个 goroutine 只需要 8 个 P 来"发工作牌"，因为大部分 G 并不在执行——它们在队列里等。goroutine 便宜就便宜在这：创建一个 G 只是往队列里放一个几十字节级开销的结构体加 2KB 栈，而不是找操作系统要一个线程。

## 动手第二步：用 schedtrace 看调度器实时状态

不写任何代码，只加一个环境变量，就能让运行时每秒打印一次调度状态：

```bash
GODEBUG=schedtrace=1000 go run main.go
```

输出类似：

```text
SCHED 0ms: gomaxprocs=8 idleprocs=7 threads=5 spinningthreads=0 idlethreads=0 runqueue=0 [0 0 0 0 0 0 0 0]
SCHED 1002ms: gomaxprocs=8 idleprocs=6 threads=9 spinningthreads=1 idlethreads=2 runqueue=3 [12 4 0 1 0 2 0 0]
```

逐项读：

- `gomaxprocs=8`：8 个 P；
- `idleprocs`：闲置的 P——这个数字长期很大，说明并发度不足，加 goroutine 或检查是否被锁串行化；
- `threads`：M 的数量，可以超过 gomaxprocs（阻塞在系统调用里的 M 不占 P）；
- `runqueue=3`：全局队列里有 3 个待运行 G；
- 方括号 `[12 4 0 1 ...]`：每个 P 本地队列的长度，8 个 P 各自的待运行 G 数。

再进一步，用 trace 工具看每个 G 在哪个 P 上、何时被抢占：

```go
package main

import (
    "os"
    "runtime/trace"
)

func main() {
    f, _ := os.Create("trace.out")
    trace.Start(f)
    defer trace.Stop()

    done := make(chan struct{})
    for i := 0; i < 20; i++ {
        go func(id int) {
            sum := 0
            for j := 0; j < 1_000_000; j++ {
                sum += j
            }
            _ = sum
            done <- struct{}{}
        }(i)
    }
    for i := 0; i < 20; i++ {
        <-done
    }
}
```

```bash
go run main.go
go tool trace trace.out
```

浏览器里打开 "Goroutine analysis"，随便点一个 G，能看到它的运行片段被拆散在多个 P 上——这就是调度器在并发 G 之间复用 P 的直接证据。

## 讲为什么：调度器为什么长成 G-M-P 三层

### 为什么不直接 G 绑 M

最早的 goroutine 调度就是"G 排队、M 领取"，全局队列用一把大锁保护。多核之下所有 M 都挤在锁上，扩展性极差。P 的引入把队列拆散了：每个 P 有一个本地队列（容量 256），M 从绑定的 P 的本地队列取 G，绝大多数取放操作无锁完成。**P 本质上是"调度资源的分片"**：本地队列、mcache（内存分配缓存）都挂在 P 上，G 在同一个 P 上连续运行时缓存友好、无锁竞争。

### 一个 G 从创建到执行

1. `go func()` 创建 G，优先放进当前 P 的本地队列；本地队列满了，就把一半（连同新 G）挪进全局队列；
2. 某个 M 绑定 P 后从本地队列取 G 执行；取空了按顺序找：每 61 次调度先查一次全局队列（防饿死，1 和 61 都是刻意选的质数）、再查 netpoller 里就绪的网络 G、最后从别的 P 偷一半（work stealing）；
3. G 运行中遇到 channel 阻塞、锁等待、time.Sleep、系统调用、或被抢占，就让出 P，回到队列或等待队列。

```
             全局队列 (有锁，但访问频率被 61 次调度一次摊薄)
                  |
   P0 [G1 G2 G3] --- M0 正在执行 G1
   P1 [G4 G5]    --- M1 正在执行 G4
   P2 []         --- M2 从 P0 偷走了 G2 G3   <- work stealing
   P3 [G6]       --- M3 正在执行 G6
```

### 系统调用与 hand-off：为什么 M 可以比 P 多

G 陷入阻塞系统调用（如文件读写、cgo 调用）时，M 会跟着阻塞——但 Go 不允许 M 一直占着 P 干等。运行时把 P 从这个 M 身上摘下来，交给（或新创建）另一个 M 继续跑本地队列里的 G。阻塞的 M 返回后若拿不到空闲 P，就把手里的 G 扔进全局队列，自己休眠。这就是 hand-off 机制，也是 `threads` 能大于 `gomaxprocs` 的原因。

网络 IO 则完全不同：Go 的网络操作走 netpoller（epoll/kqueue/IOCP 封装），G 阻塞在 channel 语义上等待，但 M 不阻塞——这正是 Go 服务能开十万并发连接而不开十万线程的原因。

### 抢占：一个死循环不再能拖垮进程

Go 1.14 之前是协作式调度：G 只在函数调用时检查"该不该让出"。一个没有函数调用的紧密循环永远不会让出，同一个 P 上的其他 G 全部饿死，GC 也无法进行（STW 需要所有 G 停下）。

Go 1.14 起引入基于信号（SIGURG）的异步抢占：运行时隔一段时间向执行过久的 G 所在 M 发信号，强制它让出。现在下面这种代码也是安全的：

```go
go func() {
    for {
        // 没有任何函数调用的死循环
        // Go 1.14+ 也能被抢占，不会再卡死调度与 GC
    }
}()
```

注意"能被抢占"不等于"无害"：它仍会白白烧一个核。死循环应该被 review 出来，而不是靠调度器兜底。

## 坑点与自检

**坑 1：容器里 GOMAXPROCS 等于宿主机核数。** Go 1.25 之前的运行时只看 `NumCPU()`，不读 cgroup CPU 配额。在 limit=2 的容器里会开出几十个 P。解决办法按优先级：

1. 直接升级 Go 1.25+：运行时自动感知 cgroup 配额并周期性调整 GOMAXPROCS，这是 2026 年新项目的默认答案；
2. 老版本手动设置：`runtime.GOMAXPROCS(2)` 或用 automaxprocs 这类库在启动时按配额设置。

CI 里跑 Go 压测同理：CI 容器通常有 CPU 配额，"开发机跑得好好的，CI 上波动巨大"多半是同一件事。FANDEX 仓库的 CI 在容器里跑 pnpm 脚本链，如果哪天加 Go 环节，压测类脚本也需要处理这个问题。

**坑 2：goroutine 不是免费的。** 每个 G 至少 2KB 栈，可增长到默认 1GB 上限（64 位平台）。一百万个 G 光栈就 2GB 起步，还不算调度结构。无上限地 `go func()` 是内存事故的头号来源，用带缓冲 channel 信号量或 worker pool 控制并发：

```go
sem := make(chan struct{}, runtime.GOMAXPROCS(0)*4)
for _, item := range items {
    sem <- struct{}{}
    go func(it Item) {
        defer func() { <-sem }()
        process(it)
    }(item)
}
```

**坑 3：GOMAXPROCS 调大不等于更快。** CPU 密集负载下 P 数超过核数只会增加上下文切换；IO 密集负载下阻塞点在 netpoller，也不需要更多 P。保持默认，先测量再调整。

**坑 4：`GOMAXPROCS(1)` 不能消除数据竞争。** 它只是把 P 减到一个，G 之间仍会交错执行（在调度点切换），依赖"单 P 就串行"的代码是在赌调度时机。

自检——能不看文档回答这些吗：

1. G、M、P 各自代表什么？为什么必须引入 P 这一层？
2. P 的本地队列取空后，调度器按什么顺序找下一个 G？为什么每 61 次调度要看一次全局队列？
3. 一个 G 陷入阻塞系统调用，P 和 M 会发生什么？一个 G 阻塞在 channel 上呢？
4. Go 1.14 的异步抢占解决了什么问题？
5. 你的服务要部署进 CPU limit 为 4 的容器，Go 1.24 与 Go 1.25 分别要做什么？

## 练习

1. 把第一步的程序改成"先打印 NumCPU，再 `runtime.GOMAXPROCS(2)`，再打印"，用 `GODEBUG=schedtrace=500` 观察 `gomaxprocs` 的变化，并解释 `idleprocs` 为什么变大。
2. 写一个含 50 万个只 sleep 的 goroutine 的程序，用 `runtime.ReadMemStats` 打印 `HeapAlloc` 与 `Sys`，估算单个 goroutine 的真实内存成本；再改成用 100 个 worker 的 pool 处理同样的任务，对比内存。
3. 写一个"100 个 goroutine 中只有 1 个干重活"的负载不均程序，用 `go tool trace` 找到那个忙的 G，观察其他 P 的 work stealing 行为；然后改成 fan-out 均分负载，对比总耗时。

## 下一步

- 抢占与栈管理的更多细节：[Goroutine 调度细节](/go/180-GoroutineSchedule)；
- G 让出与唤醒的通道机制：[Goroutine 与 Channel 原理](/go/160-GoroutineChannelPrinciple)；
- 调度问题如何变成线上指标：[Go 性能分析](/go/580-GoPerformanceAnalysis)；
- 复用 goroutine 的标准结构：[并发模式](/go/200-ConcurrencyPattern)。
