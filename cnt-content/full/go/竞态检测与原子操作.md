---
order: 108
title: 竞态检测与原子操作
module: go
category: 'dev-lang'
difficulty: advanced
description: 'Go竞态检测与原子操作详解：-race、atomic。'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/泛型详解
  - go/单元测试与基准测试
  - go/包管理详解
prerequisites:
  - go/概述与环境配置
---

## 概述

并发编程中，多个 goroutine 同时访问共享数据可能导致数据竞争（data race），产生难以复现和调试的问题。Go 提供了内置的竞态检测器（race detector）和 atomic 包来帮助发现和解决竞态问题。竞态检测器可以在运行时发现数据竞争，原子操作则提供了无锁的并发安全原语。

## 基础概念

### 什么是数据竞争

数据竞争发生在以下条件同时满足时：

1. 两个或多个 goroutine 同时访问同一内存
2. 至少一个访问是写操作
3. 没有使用同步机制保护访问

```go
// 数据竞争示例
var counter int

func main() {
    go func() { counter++ }()  // goroutine 1 写
    counter++                   // goroutine 0 写
    // 两个 goroutine 同时写 counter，存在数据竞争
}
```

### 竞态检测器的工作原理

Go 的竞态检测器基于 ThreadSanitizer（TSan）实现，在编译时插入额外的指令来追踪内存访问。它会在运行时检测到数据竞争并报告。

## 快速上手

### 启用竞态检测

```bash
# 测试时启用
go test -race ./...

# 构建时启用
go build -race -o myapp .

# 运行时启用
go run -race main.go
```

### 修复数据竞争

```go
// 有竞态的代码
var counter int

func unsafeIncrement() {
    go func() { counter++ }()
    counter++
}

// 修复方式一：使用互斥锁
var (
    counter2 int
    mu       sync.Mutex
)

func safeIncrement() {
    mu.Lock()
    counter2++
    mu.Unlock()
}

// 修复方式二：使用原子操作
var counter3 int64

func atomicIncrement() {
    atomic.AddInt64(&counter3, 1)
}

// 修复方式三：使用 channel
func channelIncrement(ch chan int) {
    ch <- 1
}
```

## 详细用法

### 竞态检测报告解读

```bash
==================
WARNING: DATA RACE
Write at 0x00c0000b2008 by goroutine 7:
  main.increment()
      /path/main.go:10 +0x3a

Previous write at 0x00c0000b2008 by goroutine 6:
  main.increment()
      /path/main.go:10 +0x3a

Goroutine 7 (running) created at:
  main.main()
      /path/main.go:15 +0x85
==================
```

报告包含以下信息：

- 冲突类型（Read/Write）
- 内存地址
- 冲突的两个 goroutine
- 代码位置（文件名和行号）
- goroutine 的创建位置

### atomic 操作详解

#### 基本原子操作

```go
var value int64

// 加载：原子读取
v := atomic.LoadInt64(&value)

// 存储：原子写入
atomic.StoreInt64(&value, 42)

// 加减：原子增减
atomic.AddInt64(&value, 1)   // 加 1
atomic.AddInt64(&value, -1)  // 减 1

// 比较并交换（CAS）：如果当前值等于 old，则设为 new
swapped := atomic.CompareAndSwapInt64(&value, 0, 1)
// 如果 value == 0，则设为 1，返回 true
// 否则不做任何操作，返回 false

// 交换：原子替换并返回旧值
old := atomic.SwapInt64(&value, 100)
// value 被设为 100，old 是之前的值
```

#### atomic.Value

atomic.Value 可以原子地存储和加载任意类型的值：

```go
var config atomic.Value

type Config struct {
    Timeout time.Duration
    MaxConn int
}

// 存储
config.Store(Config{Timeout: 30 * time.Second, MaxConn: 100})

// 加载
c := config.Load().(Config)  // 需要类型断言
fmt.Println(c.Timeout, c.MaxConn)

// 安全地更新配置
func updateConfig(timeout time.Duration, maxConn int) {
    config.Store(Config{Timeout: timeout, MaxConn: maxConn})
}
```

#### atomic.Pointer（Go 1.19+）

Go 1.19 引入了类型安全的原子指针：

```go
var ptr atomic.Pointer[Config]

// 存储
ptr.Store(&Config{Timeout: 30 * time.Second})

// 加载
c := ptr.Load()
if c != nil {
    fmt.Println(c.Timeout)
}
```

### 常见竞态模式

#### 初始化竞态

```go
// 有竞态：延迟初始化
var instance *Service

func GetService() *Service {
    if instance == nil {          // 多个 goroutine 可能同时通过此检查
        instance = &Service{}     // 多次初始化
    }
    return instance
}

// 修复方式一：sync.Once（推荐）
var (
    instance2 *Service
    once      sync.Once
)

func GetServiceSafe() *Service {
    once.Do(func() {
        instance2 = &Service{}
    })
    return instance2
}

// 修复方式二：包级初始化
var instance3 = &Service{}  // 在包初始化时创建
```

#### 切片竞态

```go
// 有竞态：并发 append
var items []int

// 修复：使用互斥锁
var (
    items2 []int
    mu     sync.Mutex
)

func appendItem(item int) {
    mu.Lock()
    items2 = append(items2, item)
    mu.Unlock()
}

// 修复：使用 channel 收集
func collectItems(ch <-chan int) []int {
    var items []int
    for item := range ch {
        items = append(items, item)
    }
    return items
}
```

#### Map 竞态

```go
// 有竞态：并发读写 map
var cache = make(map[string]string)

// 修复方式一：sync.RWMutex
var (
    cache2 = make(map[string]string)
    rwm    sync.RWMutex
)

func get(key string) string {
    rwm.RLock()
    defer rwm.RUnlock()
    return cache2[key]
}

func set(key, value string) {
    rwm.Lock()
    defer rwm.Unlock()
    cache2[key] = value
}

// 修复方式二：sync.Map（适合读多写少）
var cache3 sync.Map

func get3(key string) (string, bool) {
    v, ok := cache3.Load(key)
    if !ok {
        return "", false
    }
    return v.(string), true
}

func set3(key, value string) {
    cache3.Store(key, value)
}
```

## 常见场景

### 场景一：并发计数器

```go
// 使用原子操作实现高性能计数器
type AtomicCounter struct {
    value int64
}

func (c *AtomicCounter) Inc() {
    atomic.AddInt64(&c.value, 1)
}

func (c *AtomicCounter) Dec() {
    atomic.AddInt64(&c.value, -1)
}

func (c *AtomicCounter) Get() int64 {
    return atomic.LoadInt64(&c.value)
}

func (c *AtomicCounter) Reset() int64 {
    return atomic.SwapInt64(&c.value, 0)
}
```

### 场景二：无锁状态标志

```go
// 使用 CAS 实现无锁状态切换
type State int32

const (
    StateIdle State = iota
    StateRunning
    StateStopped
)

var state int32 = int32(StateIdle)

func start() bool {
    // 只有在 Idle 状态才能启动
    return atomic.CompareAndSwapInt32(&state, int32(StateIdle), int32(StateRunning))
}

func stop() bool {
    // 只有在 Running 状态才能停止
    return atomic.CompareAndSwapInt32(&state, int32(StateRunning), int32(StateStopped))
}
```

### 场景三：并发安全的配置热更新

```go
var currentConfig atomic.Value

func init() {
    currentConfig.Store(Config{
        Timeout: 30 * time.Second,
        MaxConn: 100,
    })
}

// 读取配置（无锁，高性能）
func getConfig() Config {
    return currentConfig.Load().(Config)
}

// 更新配置（原子替换）
func updateConfig(newCfg Config) {
    currentConfig.Store(newCfg)
}
```

## 注意事项

- 竞态检测有性能开销（约 5-10 倍），不要在生产环境长期开启
- 竞态检测只能发现实际执行到的代码路径，无法保证发现所有竞态
- 原子操作只保证单个操作的原子性，复合操作仍需加锁
- atomic.Value 存储的值每次都应该是新的，不要修改已存储的对象
- 使用 `-race` 运行测试时，确保覆盖足够的并发场景
- 性能对比参考：Mutex 约 20ns/op，atomic 约 5ns/op，无同步约 1ns/op（但不安全）

## 进阶用法

### 自旋锁

使用 CAS 实现简单的自旋锁：

```go
type SpinLock struct {
    state int32
}

func (l *SpinLock) Lock() {
    // 自旋等待，直到成功将 state 从 0 改为 1
    for !atomic.CompareAndSwapInt32(&l.state, 0, 1) {
        runtime.Gosched()  // 让出 CPU
    }
}

func (l *SpinLock) Unlock() {
    atomic.StoreInt32(&l.state, 0)
}
```

### 无锁队列

```go
// 简化的无锁队列（使用 CAS）
type Node struct {
    value int
    next  *Node
}

type LockFreeQueue struct {
    head *Node
    tail *Node
}

func (q *LockFreeQueue) Enqueue(value int) {
    newNode := &Node{value: value}
    for {
        tail := q.tail
        if atomic.CompareAndSwapPointer((*unsafe.Pointer)(unsafe.Pointer(&q.tail)),
            unsafe.Pointer(tail), unsafe.Pointer(newNode)) {
            tail.next = newNode
            return
        }
    }
}
```

### 使用竞态检测的 CI 集成

```yaml
# GitHub Actions 中集成竞态检测
- name: Race Test
  run: go test -race -count=1 ./...

- name: Race Test with timeout
  run: go test -race -timeout 5m -count=1 ./...
```

### 运行时分析竞态

```go
import "runtime"

func debugRace() {
    // 设置 GOMAXPROCS 增加并发度，更容易触发竞态
    runtime.GOMAXPROCS(runtime.NumCPU())

    // 使用 -race 标志编译后运行
    // 增加测试迭代次数提高检测概率
}
```
