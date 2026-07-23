# Go 并发编程

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## goroutine

**基本写法：启动 goroutine**
`go <函数>(<参数>)`
```go
// 启动 goroutine 执行函数
go doWork("task1");
```

**基本写法：匿名函数 goroutine**
`go func(<参数> <类型>) { ... }(<值>)`
```go
// 启动匿名函数 goroutine
go func(msg string) {
    fmt.Println(msg);
}("hello");
```

---

## channel 创建

**基本写法：无缓冲通道**
`make(chan <类型>)`
```go
// 无缓冲通道，发送和接收同步
ch := make(chan int);
```

**基本写法：有缓冲通道**
`make(chan <类型>, <容量>)`
```go
// 有缓冲通道，容量为 10
ch := make(chan int, 10);
```

---

## channel 操作

**基本写法：发送数据**
`<通道> <- <值>`
```go
// 发送数据到通道
ch <- 42;
```

**基本写法：接收数据**
`<-<通道>`
```go
// 从通道接收数据
v := <-ch;
```

**基本写法：关闭通道**
`close(<通道>)`
```go
// 关闭通道，禁止再发送
close(ch);
```

**基本写法：遍历通道**
`for <值> := range <通道> { ... }`
```go
// 遍历通道直到关闭
for v := range ch {
    fmt.Println(v);
}
```

---

## select 语句

**基本写法：select 多路复用**
`select { case ... }`
```go
// 多路复用选择
select {
case v := <-ch1:
    fmt.Println("ch1:", v);
case v := <-ch2:
    fmt.Println("ch2:", v);
case <-time.After(time.Second):
    fmt.Println("timeout");
}
```

**基本写法：default 非阻塞**
`select { case ... default: }`
```go
// 非阻塞接收
select {
case v := <-ch:
    fmt.Println(v);
default:
    fmt.Println("no data");
}
```

---

## sync.WaitGroup

**基本写法：WaitGroup 等待**
`var <变量名> sync.WaitGroup`
```go
// 使用 WaitGroup 等待所有 goroutine 完成
var wg sync.WaitGroup;
for i := 0; i < 5; i++ {
    wg.Add(1);
    go func(n int) {
        defer wg.Done();
        doWork(n);
    }(i);
}
wg.Wait();
```

---

## sync.Mutex

**基本写法：互斥锁**
`var <变量名> sync.Mutex`
```go
// 互斥锁保护共享数据
var mu sync.Mutex;
var counter int;

func increment() {
    mu.Lock();
    defer mu.Unlock();
    counter++;
}
```

**基本写法：读写锁**
`var <变量名> sync.RWMutex`
```go
// 读写锁，读多写少场景
var rwmu sync.RWMutex;
var data map[string]string;

func read(key string) string {
    rwmu.RLock();
    defer rwmu.RUnlock();
    return data[key];
}

func write(key, value string) {
    rwmu.Lock();
    defer rwmu.Unlock();
    data[key] = value;
}
```

---

## sync.Once

**基本写法：单次执行**
`var <变量名> sync.Once`
```go
// sync.Once 确保初始化只执行一次
var (
    once sync.Once;
    instance *Config;
)

func GetConfig() *Config {
    once.Do(func() {
        instance = loadConfig();
    });
    return instance;
}
```

---

## sync.Cond

**基本写法：条件变量**
`sync.NewCond(&<互斥锁>)`
```go
// 条件变量等待通知
var mu sync.Mutex;
cond := sync.NewCond(&mu);

func waitForData() {
    mu.Lock();
    for !dataReady {
        cond.Wait();
    }
    mu.Unlock();
}

func notifyData() {
    mu.Lock();
    dataReady = true;
    cond.Signal();
    mu.Unlock();
}
```

---

## sync.Pool

**基本写法：对象池**
`sync.Pool{ New: func() any { ... } }`
```go
// 对象池复用对象
var bufPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer);
    },
}

func process(data []byte) {
    buf := bufPool.Get().(*bytes.Buffer);
    defer bufPool.Put(buf);
    buf.Reset();
    buf.Write(data);
}
```

---

## atomic 原子操作

**基本写法：原子加法**
`atomic.AddInt64(&<变量>, <值>)`
```go
// 原子加法
var counter int64;
atomic.AddInt64(&counter, 1);
```

**基本写法：原子加载**
`atomic.LoadInt64(&<变量>)`
```go
// 原子读取
val := atomic.LoadInt64(&counter);
```

**基本写法：原子存储**
`atomic.StoreInt64(&<变量>, <值>)`
```go
// 原子写入
atomic.StoreInt64(&counter, 100);
```

**基本写法：原子比较交换**
`atomic.CompareAndSwapInt64(&<变量>, <旧值>, <新值>)`
```go
// CAS 操作
ok := atomic.CompareAndSwapInt64(&counter, 100, 200);
```

---

## context

**基本写法：创建根 context**
`context.Background()`
```go
// 创建根 context
ctx := context.Background();
```

**基本写法：带超时的 context**
`context.WithTimeout(<父context>, <时长>)`
```go
// 创建 5 秒超时的 context
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second);
defer cancel();
```

**基本写法：带取消的 context**
`context.WithCancel(<父context>)`
```go
// 创建可取消的 context
ctx, cancel := context.WithCancel(context.Background());
defer cancel();
```

**基本写法：带值的 context**
`context.WithValue(<父context>, <键>, <值>)`
```go
// 创建带值的 context
ctx := context.WithValue(context.Background(), "userID", 123);
```

**基本写法：从 context 获取值**
`<ctx>.Value(<键>)`
```go
// 从 context 获取值
userID := ctx.Value("userID").(int);
```

**基本写法：检查 context 是否取消**
`<-<ctx>.Done()`
```go
// 检查 context 是否已取消
select {
case <-ctx.Done():
    return ctx.Err();
default:
    // 继续工作
}
```

---

## 并发模式

**基本写法：fan-out 扇出**
`go <函数>(<输入通道>, <输出通道>)`
```go
// 多个 goroutine 处理同一输入
func worker(id int, jobs <-chan int, results chan<- int) {
    for j := range jobs {
        results <- j * 2;
    }
}

jobs := make(chan int, 100);
results := make(chan int, 100);
for w := 1; w <= 3; w++ {
    go worker(w, jobs, results);
}
```

**基本写法：fan-in 扇入**
`func <函数名>(<输出通道>, <输入通道1>, <输入通道2>)`
```go
// 合并多个通道的数据
func merge(out chan<- int, cs ...<-chan int) {
    var wg sync.WaitGroup;
    wg.Add(len(cs));
    for _, c := range cs {
        go func(ch <-chan int) {
            defer wg.Done();
            for v := range ch {
                out <- v;
            }
        }(c);
    }
    go func() {
        wg.Wait();
        close(out);
    }();
}
```

**基本写法：pipeline 管道**
`go func() { ... }()`
```go
// 管道模式
func generate(nums ...int) <-chan int {
    out := make(chan int);
    go func() {
        defer close(out);
        for _, n := range nums {
            out <- n;
        }
    }();
    return out;
}
```

---

## 并发安全

**基本写法：并发安全 map**
`sync.Map`
```go
// 并发安全的 map
var m sync.Map;
m.Store("key", "value");
v, ok := m.Load("key");
m.Delete("key");
```

**基本写法：遍历 sync.Map**
`<map>.Range(func(<键>, <值>) bool { ... })`
```go
// 遍历 sync.Map
m.Range(func(key, value any) bool {
    fmt.Printf("%v: %v\n", key, value);
    return true;
});
```
