## 前置知识

- [Go 泛型](/go/010-GoGeneric)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 核心 I/O 包」的核心机制、典型用法与常见陷阱
- 掌握「2. 文件与操作系统」的核心机制、典型用法与常见陷阱
- 掌握「3. 网络与 HTTP」的核心机制、典型用法与常见陷阱
- 掌握「4. JSON 处理」的核心机制、典型用法与常见陷阱
- 掌握「5. 时间处理」的核心机制、典型用法与常见陷阱


## 1. 核心 I/O 包

### 1.1 io 包

```go
import "io"

// 核心接口
type Reader interface { Read(p []byte) (n int, err error) }
type Writer interface { Write(p []byte) (n int, err error) }
type Closer interface { Close() error }
type Seeker interface { Seek(offset int64, whence int) (int64, error) }

// 常用函数
data, err := io.ReadAll(reader)           // 读取全部内容
n, err := io.Copy(dst, src)               // 从 src 拷贝到 dst
n, err := io.CopyN(dst, src, 1024)        // 拷贝 N 字节
written, err := io.WriteString(w, "hello") // 写入字符串

// io.MultiReader / MultiWriter
r := io.MultiReader(r1, r2, r3)  // 合并多个 Reader
w := io.MultiWriter(w1, w2, w3)  // 同时写入多个 Writer

// io.TeeReader — 同时读取和写入
var buf bytes.Buffer
tee := io.TeeReader(resp.Body, &buf)
data, _ := io.ReadAll(tee) // data 和 buf 内容相同

// io.Pipe — 内存同步管道
pr, pw := io.Pipe()
go func() {
    pw.Write([]byte("hello"))
    pw.Close()
}()
io.ReadAll(pr) // "hello"
```

### 1.2 bufio 包

```go
import "bufio"

// 带缓冲读取
reader := bufio.NewReader(os.Stdin)
line, _ := reader.ReadString('\n')    // 读到分隔符
line, _ := reader.ReadBytes('\n')     // 读到分隔符（返回字节）
ch, _, _ := reader.ReadRune()         // 读一个 rune
word, _ := reader.ReadString(' ')     // 读到空格

// 带缓冲写入
writer := bufio.NewWriter(os.Stdout)
writer.WriteString("hello")
writer.Flush() // 必须刷新

// Scanner — 按行/自定义分割读取
scanner := bufio.NewScanner(file)
for scanner.Scan() {
    fmt.Println(scanner.Text())
}
if err := scanner.Err(); err != nil {
    log.Fatal(err)
}

// 自定义分割
scanner := bufio.NewScanner(reader)
scanner.Split(bufio.ScanWords) // 按单词分割
```

### 1.3 fmt 包

```go
// 格式化输出
fmt.Printf("Name: %s, Age: %d\n", "Alice", 30)
fmt.Sprintf("result: %v", data)     // 返回字符串
fmt.Fprintf(w, "data: %v", data)    // 写入 Writer

// 格式化输入
fmt.Scanf("%d %s", &age, &name)
fmt.Sscanf("42 Alice", "%d %s", &age, &name)

// 常用动词
// %v   — 默认格式
// %+v  — 带字段名
// %#v  — Go 语法表示
// %T   — 类型名
// %d   — 十进制整数
// %x   — 十六进制
// %f   — 浮点数
// %s   — 字符串
// %q   — 带引号字符串
// %p   — 指针地址
// %t   — 布尔值
// %02d — 宽度2，前导零
```

## 2. 文件与操作系统

### 2.1 os 包

```go
import "os"

// 文件操作
file, err := os.Open("data.txt")           // 只读打开
file, err := os.Create("output.txt")       // 创建/截断
file, err := os.OpenFile("app.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
file.Close()

// 快捷读写
data, err := os.ReadFile("data.txt")       // 读取整个文件
err := os.WriteFile("out.txt", data, 0644) // 写入整个文件

// 文件信息
info, _ := os.Stat("data.txt")
fmt.Println(info.Size(), info.Mode(), info.ModTime())

// 目录操作
entries, _ := os.ReadDir(".")              // 读取目录
os.Mkdir("subdir", 0755)                  // 创建目录
os.MkdirAll("a/b/c", 0755)               // 递归创建
os.Remove("file.txt")                     // 删除文件
os.RemoveAll("dir")                       // 递归删除

// 环境变量
home := os.Getenv("HOME")
os.Setenv("KEY", "value")
for _, env := range os.Environ() {
    fmt.Println(env)
}

// 命令行参数
args := os.Args // []string{程序名, 参数1, 参数2, ...}

// 退出
os.Exit(1)
```

### 2.2 filepath 包

```go
import "path/filepath"

// 路径操作
filepath.Join("dir", "sub", "file.txt")    // "dir/sub/file.txt"（跨平台）
filepath.Ext("main.go")                    // ".go"
filepath.Base("/a/b/c.txt")               // "c.txt"
filepath.Dir("/a/b/c.txt")                // "/a/b"
filepath.IsAbs("/usr/local")              // true

// 遍历目录
filepath.WalkDir(".", func(path string, d fs.DirEntry, err error) error {
    if err != nil {
        return err
    }
    fmt.Println(path, d.IsDir())
    return nil
})

// 模式匹配
matches, _ := filepath.Glob("*.go")
matches, _ := filepath.Glob("src/**/*.go")

// 相对路径
rel, _ := filepath.Rel("/a/b", "/a/c/d")  // "../c/d"

// 绝对路径
abs, _ := filepath.Abs("./file.txt")
```

## 3. 网络与 HTTP

### 3.1 net/http 标准库

```go
// HTTP 服务器
http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Query().Get("name"))
})

// Go 1.22+ 路由模式匹配
mux := http.NewServeMux()
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    fmt.Fprintf(w, "User ID: %s", id)
})
mux.HandleFunc("POST /users", createUser)

log.Fatal(http.ListenAndServe(":8080", mux))

// HTTP 客户端
resp, err := http.Get("https://api.example.com/data")
if err != nil { log.Fatal(err) }
defer resp.Body.Close()
body, _ := io.ReadAll(resp.Body)

// 自定义请求
client := &http.Client{Timeout: 10 * time.Second}
req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonData))
req.Header.Set("Content-Type", "application/json")
resp, err := client.Do(req)
```

### 3.2 net 包

```go
// TCP 服务器
ln, _ := net.Listen("tcp", ":8080")
for {
    conn, _ := ln.Accept()
    go handleConn(conn)
}

// TCP 客户端
conn, _ := net.Dial("tcp", "localhost:8080")
conn.Write([]byte("hello"))
buf := make([]byte, 1024)
n, _ := conn.Read(buf)

// DNS 查询
ips, _ := net.LookupIP("example.com")
cname, _ := net.LookupCNAME("example.com")

// 解析地址
host, port, _ := net.SplitHostPort("example.com:8080")
```

## 4. JSON 处理

### 4.1 encoding/json

```go
type User struct {
    Name  string `json:"name"`
    Email string `json:"email,omitempty"`
    Age   int    `json:"age"`
}

// 序列化
user := User{Name: "Alice", Email: "alice@example.com", Age: 30}
bytes, _ := json.Marshal(user)
pretty, _ := json.MarshalIndent(user, "", "  ")

// 反序列化
var u User
json.Unmarshal([]byte(`{"name":"Bob","age":25}`), &u)

// 流式处理
enc := json.NewEncoder(w)
enc.Encode(user)

dec := json.NewDecoder(r)
for dec.More() {
    var u User
    dec.Decode(&u)
}

// 动态 JSON
var data map[string]any
json.Unmarshal(jsonBytes, &data)

// 自定义 JSON 编解码
func (t Time) MarshalJSON() ([]byte, error) {
    return json.Marshal(t.Format(time.RFC3339))
}

func (t *Time) UnmarshalJSON(b []byte) error {
    s := string(b)
    parsed, err := time.Parse(time.RFC3339, s)
    t.Time = parsed
    return err
}
```

## 5. 时间处理

### 5.1 time 包

```go
// 当前时间
now := time.Now()

// 创建时间
t := time.Date(2024, 6, 15, 10, 30, 0, 0, time.Local)

// 格式化（Go 使用参考时间 Mon Jan 2 15:04:05 MST 2006）
fmt.Println(now.Format("2006-01-02 15:04:05"))    // 2024-06-15 10:30:00
fmt.Println(now.Format(time.RFC3339))               // 2024-06-15T10:30:00+08:00

// 解析
t, _ := time.Parse("2006-01-02", "2024-06-15")
t, _ := time.Parse(time.RFC3339, "2024-06-15T10:30:00+08:00")

// 时间运算
tomorrow := now.Add(24 * time.Hour)
yesterday := now.Add(-24 * time.Hour)
diff := tomorrow.Sub(now) // 24h0m0s

// 时间比较
now.Before(tomorrow)  // true
now.After(yesterday)  // true
now.Equal(otherTime)  // 精确比较

// 定时器
timer := time.NewTimer(5 * time.Second)
<-timer.C // 阻塞 5 秒

// 定期执行
ticker := time.NewTicker(1 * time.Second)
for t := range ticker.C {
    fmt.Println("Tick at", t)
}

// 延迟执行
time.AfterFunc(5*time.Second, func() {
    fmt.Println("5 seconds later")
})
```

## 6. Go 工具链

### 6.1 go test

```go
// 单元测试（文件名 _test.go，函数名 TestXxx）
func TestAdd(t *testing.T) {
    result := Add(2, 3)
    if result != 5 {
        t.Errorf("Add(2, 3) = %d, want 5", result)
    }
}

// 表驱动测试
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 2, 3, 5},
        {"negative", -1, -2, -3},
        {"zero", 0, 0, 0},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Add(tt.a, tt.b); got != tt.expected {
                t.Errorf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
```

```bash
# 运行测试
go test ./...
go test -v ./...              # 详细输出
go test -run TestAdd ./...    # 运行指定测试
go test -count=1 ./...        # 禁用缓存

# 基准测试
go test -bench=. -benchmem    # 运行基准测试，显示内存分配
```

### 6.2 基准测试

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}

// 子基准测试
func BenchmarkJSON(b *testing.B) {
    data := User{Name: "Alice", Age: 30}
    b.Run("marshal", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            json.Marshal(data)
        }
    })
    b.Run("unmarshal", func(b *testing.B) {
        bytes, _ := json.Marshal(data)
        for i := 0; i < b.N; i++ {
            var u User
            json.Unmarshal(bytes, &u)
        }
    })
}
```

### 6.3 go vet

```bash
# 静态分析，检测常见错误
go vet ./...

# 检测内容：
# - Printf 格式字符串错误
# - 未使用的变量
# - 错误的结构体标签
# - 死锁
# - 不可达代码
```

### 6.4 go fmt

```bash
# 格式化代码
go fmt ./...
gofmt -w .   # 直接使用 gofmt
gofmt -d .   # 显示差异（不修改）
```

### 6.5 go doc

```bash
# 查看文档
go doc fmt.Println
go doc net/http.Handler
go doc -all fmt  # 查看包的全部文档

# 启动本地文档服务器
godoc -http=:6060
```

## 7. 构建标签与条件编译

### 7.1 构建标签

```go
// 文件顶部添加构建标签（必须紧贴文件开头）
//go:build linux

// 或组合条件
//go:build linux && amd64
//go:build linux || darwin
//go:build !windows

// 示例：platform_linux.go
//go:build linux

package platform

func getOS() string {
    return "linux"
}
```

```bash
# 按标签构建
go build -tags "linux" .
go build -tags "debug,verbose" .
```

### 7.2 文件名约定

```
platform_linux.go     # 仅 Linux
platform_windows.go   # 仅 Windows
platform_darwin.go    # 仅 macOS
arch_amd64.go         # 仅 amd64
arch_arm64.go         # 仅 arm64
```

## 8. 交叉编译

```bash
# 编译 Linux 可执行文件（在 Windows/macOS 上）
GOOS=linux GOARCH=amd64 go build -o app-linux .

# 编译 Windows 可执行文件
GOOS=windows GOARCH=amd64 go build -o app.exe .

# 编译 ARM 可执行文件
GOOS=linux GOARCH=arm64 go build -o app-arm64 .

# 常见组合
# GOOS       GOARCH
# linux      amd64
# linux      arm64
# windows    amd64
# darwin     amd64
# darwin     arm64  (Apple Silicon)
```

## 9. cgo

cgo 允许 Go 调用 C 代码：

```go
// #include <stdio.h>
// #include <stdlib.h>
//
// void say_hello(const char* name) {
//     printf("Hello, %s!\n", name);
// }
import "C"
import "unsafe"

func main() {
    name := C.CString("World")
    defer C.free(unsafe.Pointer(name))
    C.say_hello(name)
}

// 使用 C 库
// #cgo LDFLAGS: -lm
// #include <math.h>
import "C"

func main() {
    result := C.sqrt(144)
    fmt.Println(float64(result)) // 12
}
```

> **注意**：cgo 会增加编译时间、影响交叉编译、带来性能开销。非必要不使用。

## 10. 其他工具

### 10.1 go generate

```go
// 在源码中添加指令
//go:generate stringer -type=Status

type Status int

const (
    StatusUnknown Status = iota
    StatusActive
    StatusInactive
)
```

```bash
# 执行代码生成
go generate ./...
```

### 10.2 pprof 性能分析

```go
import _ "net/http/pprof"

go func() {
    http.ListenAndServe(":6060", nil)
}()
```

```bash
# CPU 分析
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# 内存分析
go tool pprof http://localhost:6060/debug/pprof/heap

# 交互式分析
(pprof) top 10
(pprof) web           # 生成调用图
(pprof) list funcName # 查看函数级分析
```

### 10.3 go tool trace

```bash
# 运行追踪
go test -trace=trace.out ./...
go tool trace trace.out
# 在浏览器中查看 goroutine 调度、GC、网络等事件
```
## fmt 格式化

**基本写法：格式化输出**
`fmt.Printf(<格式串>, <参数>)`
```go
// 格式化输出到标准输出
fmt.Printf("name=%s age=%d\n", "Go", 15)
```

**基本写法：格式化为字符串**
`fmt.Sprintf(<格式串>, <参数>)`
```go
// 返回格式化字符串
s := fmt.Sprintf("x=%d", 42)
```

**基本写法：格式化到 Writer**
`fmt.Fprintf(<writer>, <格式串>, <参数>)`
```go
// 输出到实现了 io.Writer 的对象
fmt.Fprintf(os.Stdout, "count=%d\n", 10)
```

**基本写法：打印值**
`fmt.Println(<参数>)`
```go
// 打印并换行
fmt.Println("hello", "world")
```

**基本写法：扫描输入**
`fmt.Scan(&<变量>)`
```go
// 从标准输入读取
var name string
fmt.Scan(&name)
```

**基本写法：扫描格式化输入**
`fmt.Sscanf(<字符串>, <格式串>, &<变量>)`
```go
// 从字符串按格式读取
var name string
var age int
fmt.Sscanf("Go 15", "%s %d", &name, &age)
```

---

## fmt 格式化动词

**基本写法：通用格式化动词**
`%v / %+v / %#v`
```go
// 通用格式化
type User struct{ Name string; Age int }
u := User{"Go", 15}
fmt.Printf("%v\n", u)   // {Go 15}
fmt.Printf("%+v\n", u)  // {Name:Go Age:15}
fmt.Printf("%#v\n", u)  // main.User{Name:"Go", Age:15}
```

**基本写法：类型格式化**
`%T`
```go
// 输出值的 Go 类型
fmt.Printf("%T\n", 42) // int
```

**基本写法：整数格式化**
`%d / %b / %o / %x / %X`
```go
// 整数各种进制
fmt.Printf("%d\n", 255)  // 255
fmt.Printf("%b\n", 255)  // 11111111
fmt.Printf("%o\n", 255)  // 377
fmt.Printf("%x\n", 255)  // ff
```

**基本写法：浮点数格式化**
`%f / %e / %g`
```go
// 浮点数格式
fmt.Printf("%f\n", 3.14)   // 3.140000
fmt.Printf("%.2f\n", 3.14) // 3.14
fmt.Printf("%e\n", 3.14)   // 3.140000e+00
```

**基本写法：字符串格式化**
`%s / %q / %x`
```go
// 字符串格式
fmt.Printf("%s\n", "Go")   // Go
fmt.Printf("%q\n", "Go")   // "Go"
fmt.Printf("%x\n", "Go")   // 476f
```

**基本写法：宽度与对齐**
`%[宽度].[精度]<动词>`
```go
// 指定宽度和精度
fmt.Printf("|%5d|\n", 42)   // |   42|
fmt.Printf("|%-5d|\n", 42)  // |42   |
fmt.Printf("|%5.2f|\n", 3.14159) // | 3.14|
```

---

## strings 字符串操作

**基本写法：拼接字符串**
`strings.Join(<切片>, <分隔符>)`
```go
// 用分隔符拼接字符串切片
parts := []string{"a", "b", "c"}
s := strings.Join(parts, "-") // "a-b-c"
```

**基本写法：拆分字符串**
`strings.Split(<字符串>, <分隔符>)`
```go
// 按分隔符拆分
parts := strings.Split("a,b,c", ",")
```

**基本写法：拆分为字段**
`strings.Fields(<字符串>)`
```go
// 按空白拆分
fields := strings.Fields("  hello  world  ")
```

**基本写法：替换**
`strings.ReplaceAll(<字符串>, <旧>, <新>)`
```go
// 全部替换
s := strings.ReplaceAll("a-b-c", "-", "+")
```

**基本写法：替换指定次数**
`strings.Replace(<字符串>, <旧>, <新>, <次数>)`
```go
// 替换前 n 次
s := strings.Replace("aaa", "a", "b", 2) // "bba"
```

**基本写法：去除首尾字符**
`strings.Trim(<字符串>, <字符集>)`
```go
// 去除首尾指定字符
s := strings.Trim("##hello##", "#")
```

**基本写法：去除空白**
`strings.TrimSpace(<字符串>)`
```go
// 去除首尾空白
s := strings.TrimSpace("  hi  ")
```

**基本写法：查找子串**
`strings.Index(<字符串>, <子串>)`
```go
// 返回子串首次位置，未找到返回 -1
i := strings.Index("hello", "ll") // 2
```

**基本写法：统计子串**
`strings.Count(<字符串>, <子串>)`
```go
// 统计子串出现次数
n := strings.Count("aaa", "a") // 3
```

**基本写法：重复字符串**
`strings.Repeat(<字符串>, <次数>)`
```go
// 重复 n 次拼接
s := strings.Repeat("ab", 3) // "ababab"
```

**基本写法：高效构建字符串**
`var b strings.Builder`
```go
// 使用 Builder 高效拼接
var b strings.Builder
for i := 0; i < 1000; i++ {
    b.WriteString("item")
}
result := b.String()
```

---

## strconv 类型转换

**基本写法：int 转 string**
`strconv.Itoa(<整数>)`
```go
// 整数转字符串
s := strconv.Itoa(42)
```

**基本写法：string 转 int**
`strconv.Atoi(<字符串>)`
```go
// 字符串转整数
n, err := strconv.Atoi("42")
```

**基本写法：格式化整数**
`strconv.FormatInt(<值>, <进制>)`
```go
// 将整数转为指定进制字符串
s := strconv.FormatInt(255, 16) // "ff"
```

**基本写法：解析整数**
`strconv.ParseInt(<字符串>, <进制>, <位数>)`
```go
// 解析指定进制整数
n, err := strconv.ParseInt("ff", 16, 64)
```

**基本写法：格式化浮点数**
`strconv.FormatFloat(<值>, <格式>, <精度>, <位数>)`
```go
// 浮点数转字符串
s := strconv.FormatFloat(3.14, 'f', 2, 64) // "3.14"
```

**基本写法：解析浮点数**
`strconv.ParseFloat(<字符串>, <位数>)`
```go
// 字符串转浮点数
f, err := strconv.ParseFloat("3.14", 64)
```

**基本写法：解析布尔值**
`strconv.ParseBool(<字符串>)`
```go
// 字符串转布尔值
b, err := strconv.ParseBool("true")
```

**基本写法：追加格式化值**
`strconv.AppendInt(<切片>, <值>, <进制>)`
```go
// 追加格式化值到字节切片
buf := []byte("val=")
buf = strconv.AppendInt(buf, 42, 10)
```

---

## io 读写接口

**基本写法：Reader 接口**
`io.Reader`
```go
// 实现了 Read(p []byte) (n int, err error)
var r io.Reader = strings.NewReader("hello")
```

**基本写法：Writer 接口**
`io.Writer`
```go
// 实现了 Write(p []byte) (n int, err error)
var w io.Writer = os.Stdout
```

**基本写法：从 Reader 拷贝到 Writer**
`io.Copy(<writer>, <reader>)`
```go
// 数据流拷贝
n, err := io.Copy(os.Stdout, strings.NewReader("hello"))
```

**基本写法：读取全部**
`io.ReadAll(<reader>)`
```go
// 读取 Reader 全部内容
data, err := io.ReadAll(strings.NewReader("hello"))
```

**基本写法：写入字符串**
`io.WriteString(<writer>, <字符串>)`
```go
// 向 Writer 写入字符串
n, err := io.WriteString(os.Stdout, "hello\n")
```

**基本写法：组合读写**
`io.ReadWriter`
```go
// 同时实现 Read 和 Write 接口
var rw io.ReadWriter = os.Stdin
```

**基本写法：多 Reader 串联**
`io.MultiReader(<reader1>, <reader2>)`
```go
// 串联多个 Reader 依次读取
r := io.MultiReader(
    strings.NewReader("hello "),
    strings.NewReader("world"),
)
data, _ := io.ReadAll(r)
```

**基本写法：多 Writer 并联**
`io.MultiWriter(<writer1>, <writer2>)`
```go
// 并联多个 Writer 同时写入
w := io.MultiWriter(os.Stdout, os.Stderr)
io.WriteString(w, "hello")
```

**基本写法：限制读取量**
`io.LimitReader(<reader>, <字节数>)`
```go
// 限制最多读取 N 字节
r := io.LimitReader(file, 1024)
```

**基本写法：丢弃数据**
`io.Discard`
```go
// 丢弃所有写入数据的 Writer
io.Copy(io.Discard, largeReader)
```

**基本写法：EOF 判断**
`errors.Is(err, io.EOF)`
```go
// 判断是否读到末尾
_, err := r.Read(buf)
if errors.Is(err, io.EOF) {
    fmt.Println("已到末尾")
}
```

---

## bytes 字节操作

**基本写法：字节缓冲区**
`var buf bytes.Buffer`
```go
// 可变长字节缓冲区
var buf bytes.Buffer
buf.WriteString("hello")
buf.WriteByte('!')
result := buf.String()
```

**基本写法：字节切片拼接**
`bytes.Join(<切片>, <分隔符>)`
```go
// 拼接多个字节切片
parts := [][]byte{[]byte("a"), []byte("b")}
joined := bytes.Join(parts, []byte("-"))
```

**基本写法：字节切片比较**
`bytes.Equal(<a>, <b>)`
```go
// 比较两个字节切片是否相等
ok := bytes.Equal([]byte("a"), []byte("a"))
```

**基本写法：字节切片包含**
`bytes.Contains(<切片>, <子切片>)`
```go
// 判断是否包含子切片
ok := bytes.Contains([]byte("hello"), []byte("ell"))
```
