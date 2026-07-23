---
order: 3
title: 'Go 函数与方法'
module: go
category: Go
difficulty: beginner
description: '函数定义、多返回值、命名返回值、可变参数、init 函数、方法与接收者、接口与隐式实现。'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/概述与环境配置
  - go/基础语法
  - go/数据结构
  - go/接口与组合
prerequisites: []
---

## 1. 函数定义

### 1.1 基本语法

```go
// 函数声明格式：func 函数名(参数列表) (返回值列表) { 函数体 }
func add(a int, b int) int {
    return a + b
}

// 相同类型的参数可以合并类型声明
func add(a, b int) int {
    return a + b
}

// 调用
result := add(1, 2) // 3
```

### 1.2 多返回值

Go 函数支持多返回值，这是错误处理的基础模式：

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// 调用时必须处理所有返回值
result, err := divide(10, 3)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(result)
```

### 1.3 命名返回值

```go
// 命名返回值相当于在函数开头声明了变量
func rectangleProps(w, h float64) (area, perimeter float64) {
    area = w * h
    perimeter = 2 * (w + h)
    return // 裸 return，自动返回命名变量
}

// 也可显式返回
func swap(a, b int) (first, second int) {
    first = b
    second = a
    return
}
```

> **建议**：简短函数使用命名返回值提高可读性；长函数建议显式 return，避免混淆。

### 1.4 可变参数

```go
// 可变参数在函数内被视为切片
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

fmt.Println(sum(1, 2, 3))       // 6
fmt.Println(sum(1, 2, 3, 4, 5)) // 15

// 展开切片
numbers := []int{10, 20, 30}
fmt.Println(sum(numbers...))     // 60

// 可变参数与固定参数混合
func printf(format string, args ...any) {
    fmt.Printf(format, args...)
}
```

### 1.5 函数是一等公民

```go
// 函数变量
add := func(a, b int) int {
    return a + b
}
fmt.Println(add(1, 2)) // 3

// 高阶函数：函数作为参数
func apply(nums []int, fn func(int) int) []int {
    result := make([]int, len(nums))
    for i, n := range nums {
        result[i] = fn(n)
    }
    return result
}

doubled := apply([]int{1, 2, 3}, func(n int) int {
    return n * 2
})
// doubled = [2, 4, 6]

// 高阶函数：函数作为返回值
func multiplier(factor int) func(int) int {
    return func(n int) int {
        return n * factor
    }
}

double := multiplier(2)
triple := multiplier(3)
fmt.Println(double(5)) // 10
fmt.Println(triple(5)) // 15
```

### 1.6 闭包

闭包是引用了外部变量的匿名函数：

```go
func counter() func() int {
    count := 0
    return func() int {
        count++ // 捕获并修改外部变量
        return count
    }
}

c := counter()
fmt.Println(c()) // 1
fmt.Println(c()) // 2
fmt.Println(c()) // 3

c2 := counter()
fmt.Println(c2()) // 1（独立的闭包实例）
```

**闭包经典陷阱**：

```go
// 错误：所有闭包共享同一个 i
func wrong() {
    for i := 0; i < 3; i++ {
        go func() {
            fmt.Println(i) // 可能全部输出 3
        }()
    }
}

// 正确：通过参数传递
func right() {
    for i := 0; i < 3; i++ {
        go func(n int) {
            fmt.Println(n) // 0, 1, 2（顺序不确定）
        }(i)
    }
}
```

## 2. init 函数

`init` 函数在每个包中自动执行，用于包的初始化：

```go
package config

var version string

func init() {
    // 自动执行，无法被调用
    version = "1.0.0"
    loadConfig()
}

func init() {
    // 可以有多个 init 函数，按声明顺序执行
    validateConfig()
}
```

**init 执行顺序**：

1. 被导入的包先初始化（递归）
2. 包级变量初始化
3. `init()` 函数按声明顺序执行
4. 多个文件中的 `init` 按文件名字母序执行

> **最佳实践**：尽量减少 init 的使用，偏好显式初始化函数。

## 3. 方法与接收者

### 3.1 方法定义

方法是绑定到特定类型的函数，通过**接收者**声明：

```go
type Circle struct {
    Radius float64
}

// 值接收者
func (c Circle) Area() float64 {
    return math.Pi * c.Radius * c.Radius
}

// 指针接收者
func (c *Circle) Scale(factor float64) {
    c.Radius *= factor
}

func main() {
    c := Circle{Radius: 5}
    fmt.Println(c.Area())   // 78.54
    c.Scale(2)
    fmt.Println(c.Radius)   // 10
}
```

### 3.2 值接收者 vs 指针接收者

| 特性       | 值接收者 `func (t T)`        | 指针接收者 `func (t *T)`     |
| :--------- | :--------------------------- | :--------------------------- |
| 修改接收者 | 不能修改原始值               | 可以修改原始值               |
| 拷贝       | 每次调用拷贝整个值           | 只拷贝指针（8 字节）         |
| 调用方式   | `t.Method()` 或 `p.Method()` | `t.Method()` 或 `p.Method()` |
| 适用场景   | 小型不可变类型               | 需要修改或大型结构体         |

```go
type User struct {
    Name string
    Age  int
}

// 值接收者：不修改原始值
func (u User) Greet() string {
    return "Hello, " + u.Name
}

// 指针接收者：修改原始值
func (u *User) Birthday() {
    u.Age++
}

func main() {
    u := User{Name: "Alice", Age: 30}

    fmt.Println(u.Greet()) // Hello, Alice

    u.Birthday()
    fmt.Println(u.Age)     // 31

    // 指针也能调用值接收者方法（自动解引用）
    p := &u
    fmt.Println(p.Greet()) // Hello, Alice

    // 值也能调用指针接收者方法（自动取地址）
    u.Birthday() // 等价于 (&u).Birthday()
}
```

> **规则**：如果一个类型有指针接收者方法，所有方法都应使用指针接收者，保持一致性。

### 3.3 任何类型都可以有方法

```go
// 自定义类型
type Celsius float64

func (c Celsius) ToFahrenheit() float64 {
    return float64(c)*9/5 + 32
}

func (c Celsius) String() string {
    return fmt.Sprintf("%.1f°C", c)
}

boiling := Celsius(100)
fmt.Println(boiling.ToFahrenheit()) // 212.0
fmt.Println(boiling)                 // 100.0°C（自动调用 String）

// 不能给其他包的类型定义方法
// func (s string) MyMethod() {} // 编译错误
// 解决方案：定义自定义类型
type MyString string
func (s MyString) Shout() string {
    return strings.ToUpper(string(s)) + "!!!"
}
```

### 3.4 方法值与方法表达式

```go
type Rect struct{ W, H float64 }

func (r Rect) Area() float64 { return r.W * r.H }

r := Rect{W: 3, H: 4}

// 方法值：绑定接收者
area := r.Area
fmt.Println(area()) // 12

// 方法表达式：未绑定接收者
areaFn := Rect.Area
fmt.Println(areaFn(r)) // 12
```

## 4. 接口与隐式实现

### 4.1 接口定义

```go
type Speaker interface {
    Speak() string
}
```

### 4.2 隐式实现

Go 中类型无需显式声明实现接口，只要实现了接口的所有方法即可：

```go
type Dog struct{ Name string }

func (d Dog) Speak() string {
    return d.Name + " says: Woof!"
}

type Robot struct{ ID int }

func (r Robot) Speak() string {
    return fmt.Sprintf("Robot #%d says: Beep!", r.ID)
}

// 两者都隐式实现了 Speaker 接口
func makeItSpeak(s Speaker) {
    fmt.Println(s.Speak())
}

makeItSpeak(Dog{Name: "Rex"})    // Rex says: Woof!
makeItSpeak(Robot{ID: 42})       // Robot #42 says: Beep!
```

### 4.3 接口组合

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// 接口组合
type ReadWriter interface {
    Reader
    Writer
}

// 结构体也可以组合接口
type FileReader struct {
    Reader // 嵌入接口
}
```

### 4.4 空接口

`interface{}`（Go 1.18+ 可写为 `any`）不包含任何方法，所有类型都实现了它：

```go
func printAny(v any) {
    fmt.Println(v)
}

printAny(42)
printAny("hello")
printAny([]int{1, 2, 3})
printAny(struct{}{})

// 常见用途：JSON 解析
var data any
json.Unmarshal([]byte(`{"key": "value"}`), &data)
```

### 4.5 类型断言与类型开关

```go
var s Speaker = Dog{Name: "Rex"}

// 类型断言
dog, ok := s.(Dog) // ok 为 true 表示断言成功
if ok {
    fmt.Println(dog.Name)
}

// 类型开关
func classify(v any) string {
    switch v := v.(type) {
    case int:
        return fmt.Sprintf("int: %d", v)
    case string:
        return fmt.Sprintf("string: %s", v)
    case bool:
        return fmt.Sprintf("bool: %t", v)
    default:
        return fmt.Sprintf("unknown: %T", v)
    }
}
```

## 5. 函数设计模式

### 5.1 函数选项模式（Functional Options）

```go
type Server struct {
    host    string
    port    int
    timeout time.Duration
}

type Option func(*Server)

func WithHost(host string) Option {
    return func(s *Server) { s.host = host }
}

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func WithTimeout(timeout time.Duration) Option {
    return func(s *Server) { s.timeout = timeout }
}

func NewServer(opts ...Option) *Server {
    s := &Server{
        host: "localhost",
        port: 8080,
        timeout: 30 * time.Second,
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// 使用
srv := NewServer(
    WithHost("0.0.0.0"),
    WithPort(3000),
    WithTimeout(10 * time.Second),
)
```

### 5.2 中间件模式

```go
type Handler func(msg string)

func LoggingMiddleware(next Handler) Handler {
    return func(msg string) {
        log.Printf("Before: %s", msg)
        next(msg)
        log.Printf("After: %s", msg)
    }
}

func TimingMiddleware(next Handler) Handler {
    return func(msg string) {
        start := time.Now()
        next(msg)
        log.Printf("Took: %v", time.Since(start))
    }
}

// 链式调用
handler := LoggingMiddleware(TimingMiddleware(func(msg string) {
    fmt.Println("Processing:", msg)
}))
```
