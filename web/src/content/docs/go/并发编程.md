---
order: 6
title: 'Go 并发编程'
module: go
category: Go
difficulty: advanced
description: 'goroutine 原理、channel、select、sync 包、context 包、并发模式与竞态检测。'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/数据结构
  - go/接口与组合
  - go/错误处理
  - go/泛型
prerequisites: []
---

## 1. Goroutine

### 1.1 基本使用

Goroutine 是 Go 运行时管理的轻量级线程，由 `go` 关键字启动：

```go
// 启动 goroutine
go func() {
    fmt.Println("并发执行")
}()

// 启动函数
go doWork()

// 主 goroutine 不会等待子 goroutine
func main() {
    go fmt.Println("可能看不到这行")
    // main 退出，所有 goroutine 终止
}
```

### 1.2 Goroutine vs OS 线程

| 特性       | Goroutine             | OS 线程             |
| :--------- | :-------------------- | :------------------ |
| 初始栈大小 | 2KB（可动态伸缩）     | 1-8MB（固定）       |
| 创建成本   | 微秒级                | 毫秒级              |
| 调度       | Go 运行时（M:N 模型） | 操作系统内核（1:1） |
| 切换成本   | ~100ns（用户态）      | ~1-10μs（内核态）   |
| 数量上限   | 百万级                | 千级                |
| 通信       | channel               | 共享内存 + 锁       |

### 1.3 GMP 调度模型

```
G (Goroutine) — 协程，用户级轻量线程
M (Machine)   — 操作系统线程
P (Processor) — 逻辑处理器，持有本地运行队列

┌─────────────────────────────────────────────┐
│                  Scheduler                   │
├──────┬──────┬──────┬──────┬──────┬──────────┤
│ P0   │ P1   │ P2   │ P3   │ ...  │ 全局队列 │
│[G G] │[G G] │[G G] │[G G] │      │ [G G G] │
├──────┼──────┼──────┼──────┤      └──────────┘
│ M0   │ M1   │ M2   │ M3   │
└──────┴──────┴──────┴──────┘

调度策略：
- Work Stealing：P 的本地队列为空时，从其他 P 或全局队列窃取 G
- Hand Off：M 阻塞（如系统调用）时，P 绑定到新的 M 继续运行
- 抢占式调度：基于协作（函数调用检查）+ 基于信号（Go 1.14+）
```

### 1.4 等待 Goroutine 完成

```go
// 使用 WaitGroup
func main() {
    var wg sync.WaitGroup

    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            fmt.Printf("Worker %d done\n", id)
        }(i)
    }

    wg.Wait()
    fmt.Println("All workers finished")
}
```

## 2. Channel

### 2.1 基本操作

```go
// 无缓冲 channel（同步通道）
ch := make(chan int)

// 有缓冲 channel
ch := make(chan int, 100)

// 发送
ch <- 42

// 接收
v := <-ch

// 接收并检查是否关闭
v, ok := <-ch
if !ok {
    fmt.Println("channel 已关闭")
}

// 关闭 channel
close(ch)

// 遍历 channel（直到关闭）
for v := range ch {
    fmt.Println(v)
}
```

### 2.2 无缓冲 vs 有缓冲

```go
// 无缓冲：发送和接收必须同时就绪（同步）
ch := make(chan int)
go func() {
    ch <- 1 // 阻塞直到有人接收
}()
v := <-ch  // 阻塞直到有数据

// 有缓冲：缓冲区满前发送不阻塞
ch := make(chan int, 3)
ch <- 1 // 不阻塞
ch <- 2 // 不阻塞
ch <- 3 // 不阻塞
// ch <- 4 // 阻塞（缓冲区满）
```

### 2.3 单向 Channel

```go
// 只发送
func producer(ch chan<- int) {
    for i := 0; i < 10; i++ {
        ch <- i
    }
    close(ch)
}

// 只接收
func consumer(ch <-chan int) {
    for v := range ch {
        fmt.Println(v)
    }
}

func main() {
    ch := make(chan int, 5)
    go producer(ch)
    consumer(ch)
}
```

### 2.4 Channel 底层结构

```
┌──────────────────────────────────────┐
│           hchan 结构                   │
├──────────────────────────────────────┤
│  buf      *array   // 环形缓冲区     │
│  sendx    uint     // 发送索引        │
│  recvx    uint     // 接收索引        │
│  qcount   uint     // 缓冲区元素数    │
│  dataqsiz uint     // 缓冲区大小      │
│  elemtype *type    // 元素类型        │
│  closed   uint32   // 是否关闭        │
│  sendq    waitq    // 发送等待队列    │
│  recvq    waitq    // 接收等待队列    │
│  lock     mutex    // 互斥锁          │
└──────────────────────────────────────┘
```

## 3. Select

`select` 同时监听多个 channel 操作：

```go
select {
case v := <-ch1:
    fmt.Println("ch1:", v)
case v := <-ch2:
    fmt.Println("ch2:", v)
case ch3 <- 42:
    fmt.Println("sent to ch3")
default:
    fmt.Println("没有就绪的 channel")
}
```

### 3.1 超时控制

```go
select {
case result := <-ch:
    fmt.Println("收到结果:", result)
case <-time.After(5 * time.Second):
    fmt.Println("超时")
}
```

### 3.2 非阻塞操作

```go
select {
case msg := <-ch:
    fmt.Println(msg)
default:
    // channel 无数据时立即执行
    fmt.Println("无数据")
}
```

### 3.3 退出信号

```go
func worker(done <-chan struct{}) {
    for {
        select {
        case <-done:
            fmt.Println("收到退出信号")
            return
        default:
            doWork()
        }
    }
}
```

## 4. sync 包

### 4.1 Mutex（互斥锁）

```go
type SafeCounter struct {
    mu sync.Mutex
    m  map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.m[key]++
}

func (c *SafeCounter) Get(key string) int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.m[key]
}
```

### 4.2 RWMutex（读写锁）

```go
type Cache struct {
    mu   sync.RWMutex
    data map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // 读锁，允许多个并发读
    defer c.mu.RUnlock()
    v, ok := c.data[key]
    return v, ok
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()          // 写锁，独占
    defer c.mu.Unlock()
    c.data[key] = value
}
```

### 4.3 WaitGroup

```go
func fetchAll(urls []string) []string {
    var (
        wg    sync.WaitGroup
        mu    sync.Mutex
        results []string
    )

    for _, url := range urls {
        wg.Add(1)
        go func(u string) {
            defer wg.Done()
            data := fetch(u)
            mu.Lock()
            results = append(results, data)
            mu.Unlock()
        }(url)
    }

    wg.Wait()
    return results
}
```

### 4.4 Once

```go
var (
    instance *Config
    once     sync.Once
)

func GetConfig() *Config {
    once.Do(func() {
        instance = loadConfig() // 只执行一次
    })
    return instance
}
```

### 4.5 sync.Map

并发安全的 map，适用于读多写少场景：

```go
var m sync.Map

// 存储
m.Store("key", "value")

// 读取
v, ok := m.Load("key")

// 读取或写入（原子操作）
actual, loaded := m.LoadOrStore("key", "default")

// 删除
m.Delete("key")

// 遍历
m.Range(func(key, value any) bool {
    fmt.Println(key, value)
    return true // 返回 false 停止遍历
})
```

### 4.6 sync.Pool

对象池，减少 GC 压力：

```go
var bufPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer)
    },
}

func process(data []byte) {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufPool.Put(buf)
    }()

    buf.Write(data)
    // 使用 buf...
}
```

## 5. Context 包

Context 用于在 goroutine 之间传递取消信号、超时和值：

### 5.1 创建 Context

```go
// 根 context（不可取消）
ctx := context.Background()
ctx := context.TODO() // 不确定用哪个时使用

// 可取消
ctx, cancel := context.WithCancel(ctx)
defer cancel() // 确保资源释放

// 超时取消
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

// 截止时间取消
ctx, cancel := context.WithDeadline(ctx, time.Now().Add(10*time.Second))
defer cancel()

// 传递值
ctx = context.WithValue(ctx, "requestID", "abc-123")
```

### 5.2 使用 Context

```go
func fetchData(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}

// 超时控制
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()
data, err := fetchData(ctx, "https://api.example.com/data")
if err != nil {
    if ctx.Err() == context.DeadlineExceeded {
        fmt.Println("请求超时")
    }
}
```

### 5.3 传播取消

```go
func handler(ctx context.Context) {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()

    // 启动子任务
    results := make(chan string, 3)
    for i := 0; i < 3; i++ {
        go func(id int) {
            result, err := doTask(ctx, id)
            if err != nil {
                cancel() // 任一任务失败，取消所有任务
                return
            }
            results <- result
        }(i)
    }

    for i := 0; i < 3; i++ {
        select {
        case r := <-results:
            fmt.Println(r)
        case <-ctx.Done():
            fmt.Println("取消:", ctx.Err())
            return
        }
    }
}
```

## 6. 并发模式

### 6.1 Fan-in / Fan-out

```go
// Fan-out：将工作分发到多个 goroutine
func fanOut(input <-chan int, n int) []<-chan int {
    channels := make([]<-chan int, n)
    for i := 0; i < n; i++ {
        channels[i] = worker(input)
    }
    return channels
}

func worker(input <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for v := range input {
            out <- process(v)
        }
    }()
    return out
}

// Fan-in：合并多个 channel
func fanIn(channels ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c {
                out <- v
            }
        }(ch)
    }
    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

### 6.2 Pipeline

```go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

func filter(in <-chan int, pred func(int) bool) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if pred(n) {
                out <- n
            }
        }
    }()
    return out
}

// 链式调用
pipeline := filter(square(generate(1, 2, 3, 4, 5)), func(n int) bool {
    return n > 10
})
for v := range pipeline {
    fmt.Println(v) // 16, 25
}
```

### 6.3 Worker Pool

```go
func workerPool(ctx context.Context, jobs <-chan Job, results chan<- Result, n int) {
    var wg sync.WaitGroup
    for i := 0; i < n; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            for {
                select {
                case job, ok := <-jobs:
                    if !ok {
                        return
                    }
                    results <- processJob(ctx, id, job)
                case <-ctx.Done():
                    return
                }
            }
        }(i)
    }
    go func() {
        wg.Wait()
        close(results)
    }()
}
```

### 6.4 限流器

```go
// 令牌桶限流
func rateLimiter(ctx context.Context, interval time.Duration) <-chan struct{} {
    ticker := time.NewTicker(interval)
    ch := make(chan struct{})
    go func() {
        defer ticker.Stop()
        defer close(ch)
        for {
            select {
            case <-ticker.C:
                select {
                case ch <- struct{}{}:
                default: // 丢弃多余的令牌
                }
            case <-ctx.Done():
                return
            }
        }
    }()
    return ch
}
```

## 7. 竞态检测

### 7.1 启用竞态检测

```bash
# 编译时启用
go build -race -o app .
go test -race ./...

# 运行时检测
./app
```

### 7.2 常见竞态示例

```go
// 竞态：并发读写共享变量
var counter int

func main() {
    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            counter++ // 竞态！
        }()
    }
    wg.Wait()
    fmt.Println(counter) // 可能不是 1000
}

// 修复：使用原子操作
var counter int64
atomic.AddInt64(&counter, 1)
final := atomic.LoadInt64(&counter)

// 修复：使用互斥锁
var mu sync.Mutex
mu.Lock()
counter++
mu.Unlock()

// 修复：使用 channel
ch := make(chan int, 1000)
// 每个 goroutine: ch <- 1
// 汇总: for i := 0; i < 1000; i++ { <-ch }
```

### 7.3 原子操作

```go
var count int64

// 加法
atomic.AddInt64(&count, 1)

// 读取
val := atomic.LoadInt64(&count)

// 写入
atomic.StoreInt64(&count, 100)

// 比较并交换（CAS）
swapped := atomic.CompareAndSwapInt64(&count, 100, 200)

// 自旋锁实现
type SpinLock struct {
    state int32
}

func (s *SpinLock) Lock() {
    for !atomic.CompareAndSwapInt32(&s.state, 0, 1) {
        runtime.Gosched() // 让出 CPU
    }
}

func (s *SpinLock) Unlock() {
    atomic.StoreInt32(&s.state, 0)
}
```
