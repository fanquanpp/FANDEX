---
order: 101
title: GMP调度模型
module: go
category: 'dev-lang'
difficulty: advanced
description: 'Go GMP调度模型详解：G、M、P结构。'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与限流
  - go/goroutine与channel通信原理
  - go/并发模式
  - go/反射实现通用函数
prerequisites:
  - go/概述与环境配置
---

## 概述

Go 语言的并发能力核心在于其调度器。GMP 模型是 Go 运行时调度器的设计基础，它决定了 goroutine 如何被高效地分配到操作系统线程上执行。理解 GMP 模型有助于编写高性能并发程序，并在排查性能瓶颈时提供理论依据。

传统线程模型中，每个线程由操作系统直接调度，线程创建和切换开销大。Go 通过引入 goroutine 这一用户态轻量级线程，将调度工作从操作系统内核搬到用户态运行时，大幅降低了并发开销。GMP 模型正是实现这一目标的关键架构。

## 基础概念

### G (Goroutine)

G 是 goroutine 的缩写，代表用户态轻量级线程。每个 `go func()` 调用都会创建一个 G。G 包含以下信息：

- 栈指针（初始栈大小仅 2KB，可动态增长）
- 调度信息（状态、优先级等）
- 所属的函数和参数

```go
// 每次调用 go 关键字都会创建一个 G
go func() {
    fmt.Println("这是一个 goroutine")
}()
```

### M (Machine)

M 代表操作系统线程，由操作系统调度。M 的职责是执行 G 中的代码。M 本身不持有 G 的状态，它需要绑定 P 才能获取可运行的 G。

关键特性：

- M 的数量可以远大于 GOMAXPROCS
- 当 M 执行系统调用阻塞时，会与 P 解绑，P 可以绑定其他空闲 M 继续执行 G
- 空闲的 M 会休眠，需要时再唤醒

### P (Processor)

P 是逻辑处理器，是 G 和 M 之间的中间层。P 持有本地运行队列，其中存放待执行的 G。P 的数量由 GOMAXPROCS 决定，默认等于 CPU 核心数。

P 的核心作用：

- 将 G 分配给 M 执行
- 管理本地运行队列（最多 256 个 G）
- 缓存 mcache，加速内存分配

| 概念          | 说明                            |
| ------------- | ------------------------------- |
| G (Goroutine) | 协程，用户态轻量级线程          |
| M (Machine)   | 操作系统线程                    |
| P (Processor) | 逻辑处理器，GOMAXPROCS 控制数量 |

## 快速上手

### 观察调度行为

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

func main() {
    // 设置 P 的数量为 4
    runtime.GOMAXPROCS(4)

    // 启动多个 goroutine 观察调度
    for i := 0; i < 10; i++ {
        go func(id int) {
            fmt.Printf("Goroutine %d 运行中\n", id)
        }(i)
    }

    // 查看当前 goroutine 数量
    fmt.Printf("当前 goroutine 数量: %d\n", runtime.NumGoroutine())

    time.Sleep(time.Second)
}
```

### 使用 trace 工具分析调度

```go
package main

import (
    "os"
    "runtime/trace"
)

func main() {
    // 创建 trace 输出文件
    f, _ := os.Create("trace.out")
    defer f.Close()

    // 启动 trace
    trace.Start(f)
    defer trace.Stop()

    // 你的业务代码
    for i := 0; i < 100; i++ {
        go func() {
            sum := 0
            for j := 0; j < 1000; j++ {
                sum += j
            }
        }()
    }
}
```

通过 `go tool trace trace.out` 可以在浏览器中查看调度详情。

## 详细用法

### 调度流程

GMP 调度的核心流程如下：

1. P 持有本地运行队列（local run queue，最多 256 个 G）
2. M 绑定 P 后从本地队列取 G 执行
3. 本地队列为空时，从全局队列获取（每次获取一批，均匀分配）
4. 全局队列也为空时，从 netpoller 获取就绪的 G
5. 以上都为空时，从其他 P 的本地队列偷取（work stealing）

```
全局队列 (Global Run Queue)
    |
    v
P0 [本地队列: G1, G2, G3] <---> M0 (执行 G1)
P1 [本地队列: G4, G5]     <---> M1 (执行 G4)
P2 [本地队列: 空]         <---> M2 (偷取 P0 的 G)
P3 [本地队列: G6]         <---> M3 (执行 G6)
```

### 调度时机

调度器在以下时机会重新调度：

- `go func()` 创建新 G 时，尝试放入本地队列
- 系统调用（M 阻塞时释放 P，即 hand-off 机制）
- channel 操作阻塞
- time.Sleep
- runtime.Gosched() 主动让出
- 函数调用时栈检查点（stack check point）
- GC 暂停所有 goroutine 后重新调度

### GOMAXPROCS

```go
// 设置 P 的数量（默认等于 CPU 核数）
runtime.GOMAXPROCS(4)

// 获取当前 P 的数量
n := runtime.GOMAXPROCS(0)
fmt.Printf("当前 P 数量: %d\n", n)
```

GOMAXPROCS 的选择建议：

- CPU 密集型任务：设置为 CPU 核心数
- IO 密集型任务：可以适当增大，但通常默认值即可
- 容器环境：注意 cgroup 限制，Go 1.19+ 自动感知容器 CPU 限制

### Work Stealing 机制

当 P 的本地队列为空时，按以下顺序查找可运行的 G：

1. 从全局队列获取（每 61 次调度检查一次全局队列，保证公平性）
2. 从 netpoller 获取网络就绪的 G
3. 从其他 P 的本地队列偷取一半

```go
// 模拟 work stealing 场景
package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup
    wg.Add(1000)

    // 大量 goroutine，P 会自动偷取
    for i := 0; i < 1000; i++ {
        go func(id int) {
            defer wg.Done()
            // 模拟工作
            sum := 0
            for j := 0; j < 100; j++ {
                sum += j
            }
        }(i)
    }

    wg.Wait()
    fmt.Println("所有 goroutine 完成")
}
```

### Hand-off 机制

当 M 因系统调用阻塞时，P 会与该 M 解绑，寻找或创建新的 M 继续执行本地队列中的 G。当阻塞的 M 从系统调用返回时，它会尝试获取一个空闲的 P，如果没有空闲 P，则将 G 放入全局队列，M 自身进入休眠。

```go
// 系统调用场景下的 hand-off
package main

import (
    "fmt"
    "syscall"
    "time"
)

func main() {
    // 一个 goroutine 执行阻塞的系统调用
    go func() {
        // 模拟文件读取（系统调用）
        var buf [1024]byte
        syscall.Read(0, buf[:])  // M 阻塞，P 会 hand-off 给其他 M
        fmt.Println("系统调用返回")
    }()

    // 其他 goroutine 不会因此阻塞
    go func() {
        for i := 0; i < 5; i++ {
            fmt.Printf("其他 goroutine 正常运行: %d\n", i)
            time.Sleep(100 * time.Millisecond)
        }
    }()

    time.Sleep(2 * time.Second)
}
```

## 常见场景

### 场景一：大量短任务

```go
// 处理大量短任务时，goroutine 调度开销很小
func processBatch(items []Item) {
    var wg sync.WaitGroup
    // 限制并发数，避免 goroutine 过多
    sem := make(chan struct{}, runtime.GOMAXPROCS(0)*2)

    for _, item := range items {
        wg.Add(1)
        sem <- struct{}{} // 获取信号量
        go func(it Item) {
            defer wg.Done()
            defer func() { <-sem }() // 释放信号量
            process(it)
        }(item)
    }

    wg.Wait()
}
```

### 场景二：CPU 密集型与 IO 密集型混合

```go
func hybridWork() {
    // CPU 密集型任务
    go func() {
        result := heavyComputation()
        fmt.Println("计算完成:", result)
    }()

    // IO 密集型任务
    go func() {
        data, _ := http.Get("https://api.example.com/data")
        fmt.Println("请求完成")
    }()
}
```

### 场景三：排查调度问题

```go
// 使用 runtime 查看调度状态
func debugScheduler() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    fmt.Printf("Goroutine 数量: %d\n", runtime.NumGoroutine())
    fmt.Printf("CPU 核心数: %d\n", runtime.NumCPU())
    fmt.Printf("GOMAXPROCS: %d\n", runtime.GOMAXPROCS(0))
    fmt.Printf("CGO 调用次数: %d\n", runtime.NumCgoCall())
}
```

## 注意事项

- goroutine 虽然轻量，但不是没有开销。每个 G 至少占用 2KB 栈空间，百万级 goroutine 会消耗数 GB 内存
- 避免在循环中无限制地创建 goroutine，应使用 worker pool 或信号量控制并发数
- GOMAXPROCS 设置过大会增加上下文切换开销，通常保持默认即可
- 在容器环境中，Go 1.19 之前的版本不会自动感知 cgroup CPU 限制，需要手动设置 GOMAXPROCS
- work stealing 有一定开销，如果所有 P 的负载均匀，stealing 几乎不会发生
- 使用 `runtime.LockOSThread()` 可以将 G 绑定到特定 M，适用于 CGO 或 GUI 场景

## 进阶用法

### Spinning M 优化

Go 调度器引入了自旋线程（Spinning M）的概念：当 M 没有可运行的 G 时，不会立即休眠，而是自旋一段时间寻找工作。这减少了 M 唤醒的延迟，但最多只允许一个自旋 M（空闲 P 的数量个），避免浪费 CPU。

### 抢占式调度

Go 1.14 之前基于协作式抢占（函数调用时检查栈），无法处理无函数调用的死循环。Go 1.14+ 引入了基于信号的异步抢占，即使 goroutine 在紧密循环中也能被抢占。

```go
// Go 1.14+ 即使这样的死循环也能被抢占
go func() {
    for {
        // 紧密循环，Go 1.14+ 可以抢占
    }
}()
```

### 调度器调优实践

```go
package main

import (
    "fmt"
    "runtime"
    "sync"
    "time"
)

func main() {
    // 根据工作负载调整 GOMAXPROCS
    cpuBound := true
    if cpuBound {
        // CPU 密集型：使用全部核心
        runtime.GOMAXPROCS(runtime.NumCPU())
    } else {
        // IO 密集型：可以适当增加
        runtime.GOMAXPROCS(runtime.NumCPU() + 2)
    }

    // 使用 worker pool 模式
    jobs := make(chan int, 100)
    results := make(chan int, 100)

    // 启动固定数量的 worker
    for w := 1; w <= runtime.GOMAXPROCS(0); w++ {
        go worker(w, jobs, results)
    }

    // 发送任务
    for j := 1; j <= 50; j++ {
        jobs <- j
    }
    close(jobs)

    // 收集结果
    for r := 1; r <= 50; r++ {
        <-results
    }
}

func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        fmt.Printf("Worker %d 处理任务 %d\n", id, j)
        time.Sleep(time.Millisecond) // 模拟工作
        results <- j * 2
    }
}
```

### 与 Channel 配合的调度模式

```go
// 扇出扇入模式：利用 GMP 的 work stealing 实现负载均衡
func fanOutFanIn(input <-chan Data, workerCount int) <-chan Result {
    channels := make([]<-chan Result, workerCount)

    // 扇出：启动多个 worker
    for i := 0; i < workerCount; i++ {
        channels[i] = worker(input)
    }

    // 扇入：合并结果
    merged := make(chan Result)
    var wg sync.WaitGroup
    wg.Add(workerCount)

    for _, ch := range channels {
        go func(c <-chan Result) {
            defer wg.Done()
            for r := range c {
                merged <- r
            }
        }(ch)
    }

    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}
```
