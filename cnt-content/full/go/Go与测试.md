---
order: 68
title: Go与测试
module: go
category: Go
difficulty: intermediate
description: Go测试框架与基准测试
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与Redis
  - go/Go与消息队列
  - go/Go与Fuzzing
  - go/Go与性能分析
prerequisites:
  - go/概述与环境配置
---

## 概述

Go 语言内置了强大的测试框架，无需引入第三方库即可完成单元测试、基准测试和示例测试。testing 包配合 `go test` 命令，提供了完整的测试工作流。良好的测试习惯是保证代码质量的基础，Go 的测试哲学强调简洁和实用。

## 基础概念

### 测试文件命名规则

- 测试文件以 `_test.go` 结尾，与被测试文件放在同一包下
- 测试函数以 `Test` 开头，参数为 `*testing.T`
- 基准测试函数以 `Benchmark` 开头，参数为 `*testing.B`
- 示例函数以 `Example` 开头，无参数

### 测试函数签名

```go
// 单元测试
func TestXxx(t *testing.T) { ... }

// 基准测试
func BenchmarkXxx(b *testing.B) { ... }

// 示例测试
func ExampleXxx() { ... }
```

## 快速上手

### 第一个测试

```go
// math.go
package math

func Add(a, b int) int {
    return a + b
}
```

```go
// math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    result := Add(1, 2)
    if result != 3 {
        t.Errorf("Add(1, 2) = %d, want 3", result)
    }
}
```

运行测试：

```bash
go test ./...           # 运行所有测试
go test -v ./...        # 详细输出
go test -run TestAdd    # 运行指定测试
```

### 基准测试

```go
func BenchmarkAdd(b *testing.B) {
    // b.N 由框架自动调整
    for i := 0; i < b.N; i++ {
        Add(1, 2)
    }
}
```

```bash
go test -bench=. -benchmem   # 运行基准测试并显示内存分配
```

## 详细用法

### 表驱动测试

表驱动测试是 Go 中最推荐的测试模式，将测试用例组织为结构体切片，便于维护和扩展。

```go
func TestParse(t *testing.T) {
    // 定义测试用例表
    tests := []struct {
        name     string
        input    string
        expected string
    }{
        {"小写转大写", "hello", "HELLO"},
        {"空字符串", "", ""},
        {"已是大写", "WORLD", "WORLD"},
        {"混合大小写", "HeLLo", "HELLO"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := strings.ToUpper(tt.input)
            if got != tt.expected {
                t.Errorf("ToUpper(%q) = %q, want %q", tt.input, got, tt.expected)
            }
        })
    }
}
```

### 子测试与 t.Run

`t.Run` 创建子测试，支持独立运行和并行执行：

```go
func TestUser(t *testing.T) {
    t.Run("创建用户", func(t *testing.T) {
        user := NewUser("Alice")
        if user.Name != "Alice" {
            t.Error("用户名不正确")
        }
    })

    t.Run("更新用户", func(t *testing.T) {
        user := NewUser("Alice")
        user.UpdateName("Bob")
        if user.Name != "Bob" {
            t.Error("更新失败")
        }
    })
}
```

运行指定子测试：

```bash
go test -run TestUser/创建用户
```

### 并行测试

使用 `t.Parallel()` 标记可并行执行的测试：

```go
func TestParallel(t *testing.T) {
    tests := []struct {
        name  string
        input int
        want  int
    }{
        {"正数", 5, 25},
        {"负数", -3, 9},
        {"零", 0, 0},
    }

    for _, tt := range tests {
        tt := tt // 捕获变量
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // 标记为并行
            got := tt.input * tt.input
            if got != tt.want {
                t.Errorf("got %d, want %d", got, tt.want)
            }
        })
    }
}
```

### TestMain 自定义初始化

当测试需要全局初始化或清理时，使用 TestMain：

```go
func TestMain(m *testing.M) {
    // 初始化：连接测试数据库
    db := setupTestDB()
    defer db.Close()

    // 运行所有测试
    code := m.Run()

    // 清理资源
    cleanup()

    os.Exit(code)
}
```

### 基准测试进阶

```go
// 带子基准的基准测试
func BenchmarkSort(b *testing.B) {
    sizes := []int{100, 1000, 10000}

    for _, size := range sizes {
        b.Run(fmt.Sprintf("size_%d", size), func(b *testing.B) {
            data := generateData(size)
            b.ResetTimer() // 重置计时器，排除数据生成时间

            for i := 0; i < b.N; i++ {
                sorted := make([]int, len(data))
                copy(sorted, data)
                sort.Ints(sorted)
            }
        })
    }
}

// 基准测试中控制计时
func BenchmarkExpensive(b *testing.B) {
    // 准备工作不计入基准时间
    setup()

    b.ResetTimer()  // 重置计时器
    for i := 0; i < b.N; i++ {
        expensiveOperation()
    }
    b.StopTimer()   // 停止计时

    // 清理工作不计入基准时间
    cleanup()
}
```

### 示例测试

示例测试既作为文档，也作为可执行的测试：

```go
// 示例会出现在 godoc 文档中
func ExampleGreet() {
    result := Greet("Alice")
    fmt.Println(result)
    // Output: Hello, Alice
}

// 带后缀的示例，对应具体方法
func ExampleUser_Name() {
    u := User{Name: "Bob"}
    fmt.Println(u.Name)
    // Output: Bob
}
```

## 常见场景

### 场景一：HTTP Handler 测试

```go
func TestHandler(t *testing.T) {
    // 创建测试请求
    req := httptest.NewRequest("GET", "/api/users", nil)
    w := httptest.NewRecorder()

    // 调用 handler
    handler := UserHandler{DB: mockDB}
    handler.ServeHTTP(w, req)

    // 验证响应
    if w.Code != http.StatusOK {
        t.Errorf("状态码 = %d, want %d", w.Code, http.StatusOK)
    }

    var users []User
    json.NewDecoder(w.Body).Decode(&users)
    if len(users) == 0 {
        t.Error("返回用户列表为空")
    }
}
```

### 场景二：接口 Mock 测试

```go
// 定义接口
type UserRepository interface {
    GetByID(id int) (*User, error)
}

// Mock 实现
type MockUserRepo struct {
    users map[int]*User
    err   error
}

func (m *MockUserRepo) GetByID(id int) (*User, error) {
    if m.err != nil {
        return nil, m.err
    }
    return m.users[id], nil
}

func TestGetUser(t *testing.T) {
    mock := &MockUserRepo{
        users: map[int]*User{1: {Name: "Alice"}},
    }

    service := NewUserService(mock)
    user, err := service.GetUser(1)

    if err != nil {
        t.Fatalf("意外错误: %v", err)
    }
    if user.Name != "Alice" {
        t.Errorf("用户名 = %s, want Alice", user.Name)
    }
}
```

### 场景三：测试覆盖率

```bash
# 生成覆盖率报告
go test -cover ./...

# 生成详细覆盖率文件
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# 查看每个函数的覆盖率
go tool cover -func=coverage.out
```

## 注意事项

- 测试文件中不要使用 `init()` 函数，它会在所有测试之前执行，影响测试隔离性
- `t.Error` / `t.Errorf` 报告失败但继续执行，`t.Fatal` / `t.Fatalf` 报告失败并立即停止当前测试
- 基准测试中避免编译器优化消除代码，可以使用 `_ = result` 或 `runtime.KeepAlive(result)`
- 并行测试中必须捕获循环变量（Go 1.22 之前），否则闭包会引用最后一个值
- 测试代码也应保持简洁，避免过度抽象测试辅助函数
- 使用 `-count=1` 禁用测试缓存，确保每次都重新运行

## 进阶用法

### Fuzzing 模糊测试

Go 1.18 引入的原生模糊测试支持：

```go
func FuzzReverse(f *testing.F) {
    // 添加种子语料
    f.Add("hello")
    f.Add("世界")

    f.Fuzz(func(t *testing.T, original string) {
        reversed := Reverse(original)
        doubleReversed := Reverse(reversed)
        if doubleReversed != original {
            t.Errorf("Reverse(Reverse(%q)) = %q, want %q", original, doubleReversed, original)
        }
    })
}
```

```bash
go test -fuzz=FuzzReverse -fuzztime=30s
```

### 测试辅助函数

```go
// 使用 t.Helper() 标记辅助函数，错误信息指向调用方
func assertEqual(t *testing.T, got, want int) {
    t.Helper() // 标记为辅助函数
    if got != want {
        t.Errorf("got %d, want %d", got, want)
    }
}

func TestCalculation(t *testing.T) {
    assertEqual(t, Add(1, 2), 3)    // 错误行号指向这里，而非 assertEqual 内部
    assertEqual(t, Add(10, 20), 30)
}
```

### 构建标签控制测试

```go
// +build integration

package main

import "testing"

func TestDatabaseIntegration(t *testing.T) {
    // 仅在集成测试时运行
    db := connectRealDatabase()
    defer db.Close()
    // ...
}
```

```bash
# 运行集成测试
go test -tags=integration ./...

# 默认跳过集成测试
go test ./...
```

### 使用 testing.TB 统一测试接口

```go
// testing.TB 是 testing.T 和 testing.B 的共同接口
// 可以编写同时适用于单元测试和基准测试的辅助函数
func checkResult(t testing.TB, got, want int) {
    t.Helper()
    if got != want {
        t.Errorf("got %d, want %d", got, want)
    }
}
```
