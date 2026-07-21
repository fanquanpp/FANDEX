---
order: 2
title: 'Go 基础语法'
module: go
category: Go
difficulty: beginner
description: '变量与常量、基本类型、零值、类型转换、字符串、指针、控制流与 defer 语句。'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/概述与环境配置
  - go/函数与方法
  - go/数据结构
prerequisites: []
---

## 1. 变量与常量

### 1.1 变量声明

Go 提供多种变量声明方式，推荐在函数内使用短变量声明：

```go
// 完整声明（可省略类型，由编译器推断）
var name string = "Go"
var age = 15

// 批量声明
var (
    x    int     = 10
    y    float64 = 3.14
    flag bool    = true
)

// 短变量声明（仅限函数内，最常用）
city := "Beijing"
count := 100

// 未初始化则使用零值
var score int       // 0
var title string    // ""（空字符串）
var done bool       // false
```

### 1.2 常量

```go
// 常量在编译时确定，不能使用 := 声明
const Pi = 3.14159
const Language = "Go"

// 批量声明
const (
    StatusOK    = 200
    StatusError = 500
)

// iota 常量生成器
const (
    Sunday    = iota // 0
    Monday           // 1
    Tuesday          // 2
    Wednesday        // 3
    Thursday         // 4
    Friday           // 5
    Saturday         // 6
)

// iota 高级用法：位运算标志
const (
    ReadPermission   = 1 << iota // 1  (001)
    WritePermission              // 2  (010)
    ExecutePermission            // 4  (100)
)

// 跳过值
const (
    _  = iota // 跳过 0
    KB = 1 << (10 * iota) // 1 << 10 = 1024
    MB                     // 1 << 20
    GB                     // 1 << 30
    TB                     // 1 << 40
)
```

## 2. 基本数据类型

### 2.1 类型一览

| 类别   | 类型                                          | 说明                              |
| :----- | :-------------------------------------------- | :-------------------------------- |
| 布尔   | `bool`                                        | `true` 或 `false`                 |
| 整数   | `int8`, `int16`, `int32`, `int64`, `int`      | 有符号整数                        |
| 整数   | `uint8`, `uint16`, `uint32`, `uint64`, `uint` | 无符号整数                        |
| 整数   | `byte`                                        | `uint8` 的别名                    |
| 整数   | `rune`                                        | `int32` 的别名，表示 Unicode 码点 |
| 浮点   | `float32`, `float64`                          | IEEE 754 浮点数                   |
| 复数   | `complex64`, `complex128`                     | 复数                              |
| 字符串 | `string`                                      | 不可变字节序列                    |
| 指针   | `*T`                                          | 指向类型 T 的指针                 |

> **注意**：`int` 和 `uint` 的大小取决于平台（32 位或 64 位），优先使用 `int`。

### 2.2 零值

Go 中所有变量在声明时若未初始化，会自动赋予零值：

```go
var (
    i    int        // 0
    f    float64    // 0.0
    b    bool       // false
    s    string     // ""
    ptr  *int       // nil
    sl   []int      // nil
    m    map[string]int // nil
    ch   chan int   // nil
    fn   func()     // nil
    err  error      // nil
)
```

> 零值是 Go 的重要设计理念——变量总是有明确定义的值，不存在"未初始化"状态。

### 2.3 类型转换

Go 没有隐式类型转换，所有转换必须显式进行：

```go
var i int = 42
var f float64 = float64(i)    // int → float64
var u uint = uint(f)          // float64 → uint

// 字符串与数值转换（使用 strconv 包）
s := strconv.Itoa(42)         // int → string: "42"
n, err := strconv.Atoi("42")  // string → int: 42

f2 := strconv.FormatFloat(3.14, 'f', 2, 64) // float64 → string: "3.14"
f3, err := strconv.ParseFloat("3.14", 64)    // string → float64

// 字符串与字节切片
bytes := []byte("hello")      // string → []byte
str := string(bytes)          // []byte → string

// rune 与 string
r := '世'
fmt.Printf("%c %U\n", r, r)  // 世 U+4E16
```

## 3. 字符串

### 3.1 字符串基础

Go 字符串是不可变的 UTF-8 字节序列：

```go
s := "Hello, 世界"

// 字节长度 vs 字符数
fmt.Println(len(s))                    // 13（字节数）
fmt.Println(utf8.RuneCountInString(s)) // 9（字符数）

// 遍历字节
for i := 0; i < len(s); i++ {
    fmt.Printf("%x ", s[i]) // 48 65 6c 6c 6f 2c 20 e4 b8 96 e7 95 8c
}

// 遍历 rune（正确处理 Unicode）
for i, r := range s {
    fmt.Printf("%d:%c ", i, r) // 0:H 1:e 2:l 3:l 4:o 5:, 6:  7:世 10:界
}
```

### 3.2 字符串操作

```go
import "strings"

s := "Hello, World"

// 查找与判断
strings.Contains(s, "World")       // true
strings.HasPrefix(s, "Hello")      // true
strings.HasSuffix(s, "World")      // true
strings.Index(s, "World")          // 7
strings.Count(s, "l")              // 3

// 变换
strings.ToUpper(s)                  // "HELLO, WORLD"
strings.ToLower(s)                  // "hello, world"
strings.TrimSpace("  hi  ")        // "hi"
strings.Trim("==hi==", "=")        // "hi"
strings.Replace(s, "World", "Go", 1) // "Hello, Go"
strings.ReplaceAll(s, "l", "L")    // "HeLLo, WorLd"

// 拆分与合并
parts := strings.Split("a,b,c", ",")    // ["a", "b", "c"]
joined := strings.Join(parts, "-")      // "a-b-c"
fields := strings.Fields("  a  b  c ")  // ["a", "b", "c"]

// 字符串构建（避免频繁拼接）
var b strings.Builder
b.WriteString("Hello")
b.WriteString(", ")
b.WriteString("World")
result := b.String() // "Hello, World"
```

### 3.3 原始字符串

```go
// 反引号包围，不处理转义
raw := `C:\Users\name\file.txt`
multi := `
第一行
第二行
第三行
`
```

## 4. 指针

### 4.1 指针基础

```go
x := 42
p := &x          // p 是 *int 类型，指向 x 的地址

fmt.Println(p)   // 0xc0000b2008（内存地址）
fmt.Println(*p)  // 42（解引用，获取地址处的值）

*p = 100         // 通过指针修改值
fmt.Println(x)   // 100
```

### 4.2 指针的零值

```go
var p *int        // nil（零值）
if p != nil {
    fmt.Println(*p) // 安全检查
}
// *p = 10        // panic: nil 指针解引用
```

### 4.3 指针与函数

```go
// 值传递：函数内修改不影响外部
func doubleVal(n int) {
    n *= 2
}

// 指针传递：函数内修改影响外部
func doublePtr(n *int) {
    *n *= 2
}

func main() {
    x := 10
    doubleVal(x)
    fmt.Println(x)  // 10（未变）

    doublePtr(&x)
    fmt.Println(x)  // 20（已变）
}
```

### 4.4 new 函数

```go
// new(T) 分配零值内存并返回指针
p := new(int)     // *int 类型，指向 0
*p = 42
fmt.Println(*p)   // 42

// 等价于
var v int
p2 := &v
```

> **Go 指针 vs C 指针**：Go 没有指针运算（不能 `p++`），更安全。

## 5. 控制流

### 5.1 if 语句

```go
// 基本形式（条件不需要括号）
if x > 0 {
    fmt.Println("positive")
} else if x < 0 {
    fmt.Println("negative")
} else {
    fmt.Println("zero")
}

// 初始化语句（变量作用域限定在 if 块内）
if err := doSomething(); err != nil {
    fmt.Println("Error:", err)
    // err 仅在此块内可见
}
```

### 5.2 for 循环

Go 只有 `for` 一种循环语句，但功能涵盖所有场景：

```go
// 经典三段式
for i := 0; i < 10; i++ {
    fmt.Println(i)
}

// while 风格
n := 1
for n < 100 {
    n *= 2
}

// 无限循环
for {
    if shouldBreak() {
        break
    }
}

// for-range（遍历集合）
nums := []int{1, 2, 3}
for i, v := range nums {
    fmt.Printf("index=%d value=%d\n", i, v)
}

// Go 1.22+ for-range 整数
for i := range 5 {
    fmt.Println(i) // 0, 1, 2, 3, 4
}

// 只需要索引或值
for i := range nums { /* 只取索引 */ }
for _, v := range nums { /* 只取值 */ }
```

### 5.3 switch 语句

```go
// 基本形式（自动 break，不穿透）
day := "Monday"
switch day {
case "Monday":
    fmt.Println("周一")
case "Tuesday":
    fmt.Println("周二")
default:
    fmt.Println("其他")
}

// 多值匹配
switch color {
case "red", "green", "blue":
    fmt.Println("基础颜色")
}

// 穿透（fallthrough）
switch n := 2; n {
case 1:
    fmt.Println("一")
    fallthrough
case 2:
    fmt.Println("二")   // 即使匹配 2，也会执行
    fallthrough
case 3:
    fmt.Println("三")   // fallthrough 继续执行
}

// 无条件 switch（替代 if-else 链）
score := 85
switch {
case score >= 90:
    fmt.Println("A")
case score >= 80:
    fmt.Println("B")
case score >= 70:
    fmt.Println("C")
default:
    fmt.Println("D")
}
```

### 5.4 break 与 continue

```go
for i := 0; i < 10; i++ {
    if i == 3 {
        continue // 跳过本次迭代
    }
    if i == 7 {
        break    // 退出循环
    }
    fmt.Println(i) // 0, 1, 2, 4, 5, 6
}

// 标签跳转（跳出外层循环）
outer:
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        if i == 1 && j == 1 {
            break outer // 跳出外层循环
        }
        fmt.Printf("(%d,%d) ", i, j)
    }
}
// 输出: (0,0) (0,1) (0,2) (1,0)
```

## 6. defer 语句

`defer` 将函数调用推迟到所在函数返回之前执行，常用于资源清理。

### 6.1 基本用法

```go
func readFile(path string) {
    file, err := os.Open(path)
    if err != nil {
        return
    }
    defer file.Close() // 确保文件关闭

    // 读取文件...
}
```

### 6.2 defer 执行顺序

多个 defer 按**后进先出（LIFO）**顺序执行：

```go
func main() {
    defer fmt.Println("第一")  // 最后执行
    defer fmt.Println("第二")  // 第二执行
    defer fmt.Println("第三")  // 最先执行
    fmt.Println("主函数")
}
// 输出:
// 主函数
// 第三
// 第二
// 第一
```

### 6.3 defer 参数求值

defer 语句的参数在声明时立即求值，而非执行时：

```go
func main() {
    x := 10
    defer fmt.Println(x) // 输出 10（声明时求值）
    x = 20
    fmt.Println(x)       // 输出 20
}
// 输出: 20, 10
```

### 6.4 defer 与返回值

defer 可以修改命名返回值：

```go
func double() (result int) {
    defer func() {
        result *= 2 // 修改返回值
    }()
    return 5 // result = 5，然后 defer 执行 result *= 2
}
// double() 返回 10
```

### 6.5 defer 性能考虑

```go
// defer 在循环中可能有性能开销（Go 1.13+ 已大幅优化）
// 简单场景可以直接调用
func process(items []string) {
    for _, item := range items {
        f, err := os.Open(item)
        if err != nil {
            continue
        }
        // 在热路径循环中，直接调用可能比 defer 更高效
        processFile(f)
        f.Close()
    }
}
```
