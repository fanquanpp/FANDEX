---
order: 80
title: Go 错误处理
module: 'go'
category: 后端技术
difficulty: intermediate
description: error 接口、errors.Is/As、自定义错误、panic/recover、错误包装、sentinel 错误与最佳实践。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'go/006-GoInterfaceComposition'
  - 'go/007-GoConcurrentProgramming'
  - 'go/010-GoGeneric'
  - 'go/011-GoStandardLibraryToolchain'
prerequisites: []
---

## 前置知识

- [Go 并发编程](/go/007-GoConcurrentProgramming)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. error 接口」的核心机制、典型用法与常见陷阱
- 掌握「2. 错误检查」的核心机制、典型用法与常见陷阱
- 掌握「3. 自定义错误」的核心机制、典型用法与常见陷阱
- 掌握「4. panic 与 recover」的核心机制、典型用法与常见陷阱
- 掌握「5. 错误包装（Error Wrapping）」的核心机制、典型用法与常见陷阱


## 1. error 接口

### 1.1 基本概念

Go 使用 `error` 接口表示错误，没有异常机制（除 panic 外）：

```go
type error interface {
    Error() string
}
```

错误作为返回值传递，调用者必须显式处理：

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

result, err := divide(10, 0)
if err != nil {
    fmt.Println("Error:", err)
    return
}
fmt.Println(result)
```

### 1.2 创建错误

```go
// errors.New — 简单错误
err := errors.New("file not found")

// fmt.Errorf — 格式化错误
err := fmt.Errorf("user %d not found", userID)

// fmt.Errorf %w — 错误包装（Go 1.13+）
originalErr := errors.New("connection refused")
wrappedErr := fmt.Errorf("dial failed: %w", originalErr)
```

### 1.3 sentinel 错误

预定义的错误值，用于特定错误判断：

```go
// 标准库中的 sentinel 错误
var (
    ErrNotExist    = errors.New("file does not exist")
    ErrPermission  = errors.New("permission denied")
    ErrUnsupported = errors.New("operation not supported")
)

// 使用
if err == ErrNotExist {
    // 处理文件不存在
}
```

> **最佳实践**：sentinel 错误应以 `Err` 开头，放在包级别。

## 2. 错误检查

### 2.1 errors.Is

`errors.Is` 沿着错误链查找，支持被包装的错误：

```go
var ErrNotFound = errors.New("not found")

func getUser(id int) error {
    return fmt.Errorf("get user %d: %w", id, ErrNotFound)
}

err := getUser(42)
// 直接比较会失败
// fmt.Println(err == ErrNotFound) // false

// 使用 errors.Is
fmt.Println(errors.Is(err, ErrNotFound)) // true

// 支持多层包装
err1 := fmt.Errorf("layer1: %w", ErrNotFound)
err2 := fmt.Errorf("layer2: %w", err1)
fmt.Println(errors.Is(err2, ErrNotFound)) // true
```

### 2.2 errors.As

`errors.As` 沿错误链查找特定类型的错误：

```go
type NotFoundError struct {
    Resource string
    ID       int
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s %d not found", e.Resource, e.ID)
}

func getUser(id int) error {
    return &NotFoundError{Resource: "user", ID: id}
}

err := getUser(42)

// 提取特定类型错误
var nfe *NotFoundError
if errors.As(err, &nfe) {
    fmt.Printf("Resource: %s, ID: %d\n", nfe.Resource, nfe.ID)
}

// 也支持被包装的错误
wrappedErr := fmt.Errorf("service error: %w", err)
var nfe2 *NotFoundError
if errors.As(wrappedErr, &nfe2) {
    fmt.Println("找到 NotFoundError")
}
```

### 2.3 errors.Unwrap

```go
err1 := errors.New("base error")
err2 := fmt.Errorf("wrapped: %w", err1)
err3 := fmt.Errorf("double wrapped: %w", err2)

// 逐层解包
fmt.Println(errors.Unwrap(err3)) // wrapped: base error
fmt.Println(errors.Unwrap(err2)) // base error
fmt.Println(errors.Unwrap(err1)) // nil
```

## 3. 自定义错误

### 3.1 基本自定义错误

```go
type AppError struct {
    Code    int
    Message string
    Cause   error
}

func (e *AppError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("[%d] %s: %v", e.Code, e.Message, e.Cause)
    }
    return fmt.Sprintf("[%d] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
    return e.Cause
}

// 使用
func connect(addr string) error {
    _, err := net.Dial("tcp", addr)
    if err != nil {
        return &AppError{
            Code:    1001,
            Message: "connection failed",
            Cause:   err,
        }
    }
    return nil
}
```

### 3.2 实现 Is/As 方法

```go
type TimeoutError struct {
    Op      string
    Timeout time.Duration
}

func (e *TimeoutError) Error() string {
    return fmt.Sprintf("%s timed out after %v", e.Op, e.Timeout)
}

// 自定义 Is 方法
func (e *TimeoutError) Is(target error) bool {
    t, ok := target.(*TimeoutError)
    if !ok {
        return false
    }
    return e.Op == t.Op // 同一操作视为相同错误
}

var ErrDialTimeout = &TimeoutError{Op: "dial"}

err := &TimeoutError{Op: "dial", Timeout: 5 * time.Second}
fmt.Println(errors.Is(err, ErrDialTimeout)) // true
```

### 3.3 错误类型层次

```go
// 基础错误类型
type DomainError struct {
    Domain  string
    Message string
}

func (e *DomainError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Domain, e.Message)
}

// 特定领域错误
type UserError struct {
    DomainError
    UserID int
}

type OrderError struct {
    DomainError
    OrderID string
}

// 使用 errors.As 区分
err := &UserError{
    DomainError: DomainError{Domain: "user", Message: "not found"},
    UserID:      42,
}

var ue *UserError
if errors.As(err, &ue) {
    fmt.Println("User ID:", ue.UserID)
}
```

## 4. panic 与 recover

### 4.1 panic

panic 用于不可恢复的错误，立即中断当前函数：

```go
func mustParse(s string) int {
    n, err := strconv.Atoi(s)
    if err != nil {
        panic(fmt.Sprintf("invalid number: %q", s))
    }
    return n
}
```

### 4.2 recover

recover 只能在 defer 函数中捕获 panic：

```go
func safeCall() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("Recovered from:", r)
            // 可以记录日志，但不能返回错误值
        }
    }()

    panic("something went wrong")
}
```

### 4.3 panic/recover 实践模式

```go
// 模式 1：将 panic 转为 error
func safeDo(fn func()) (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic: %v\nstack: %s", r, debug.Stack())
        }
    }()
    fn()
    return nil
}

// 模式 2：HTTP 处理器恢复
func RecoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("panic: %v\n%s", err, debug.Stack())
                http.Error(w, "Internal Server Error", 500)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

> **原则**：优先使用 error 返回值，仅在程序无法继续运行时使用 panic（如逻辑错误、初始化失败）。

## 5. 错误包装（Error Wrapping）

### 5.1 包装模式

```go
// 单层包装
if err != nil {
    return fmt.Errorf("read config: %w", err)
}

// 多层包装
func loadApp() error {
    if err := loadConfig(); err != nil {
        return fmt.Errorf("load app: %w", err)
    }
    return nil
}

func loadConfig() error {
    if err := readFile(); err != nil {
        return fmt.Errorf("load config: %w", err)
    }
    return nil
}

func readFile() error {
    return os.ErrNotExist
}

// 错误链：load app: load config: file does not exist
```

### 5.2 自定义包装类型

```go
type withMessage struct {
    cause   error
    message string
}

func (e *withMessage) Error() string { return e.message + ": " + e.cause.Error() }
func (e *withMessage) Unwrap() error { return e.cause }

func Wrap(err error, message string) error {
    if err == nil {
        return nil
    }
    return &withMessage{cause: err, message: message}
}
```

## 6. 错误处理最佳实践

### 6.1 及时处理错误

```go
// 坏：忽略错误
data, _ := os.ReadFile("config.json")

// 好：立即处理
data, err := os.ReadFile("config.json")
if err != nil {
    return fmt.Errorf("read config: %w", err)
}
```

### 6.2 只处理一次错误

```go
// 坏：重复处理（记录日志又返回）
func bad() error {
    err := doSomething()
    if err != nil {
        log.Println(err) // 处理一次
        return err        // 又处理一次
    }
    return nil
}

// 好：要么处理，要么向上传播
func good() error {
    err := doSomething()
    if err != nil {
        return fmt.Errorf("do something: %w", err) // 只包装并返回
    }
    return nil
}
```

### 6.3 添加上下文信息

```go
// 坏：丢失上下文
return err

// 好：添加操作上下文
return fmt.Errorf("create user %q: %w", username, err)
```

### 6.4 使用 sentinel 错误或自定义类型

```go
// 调用方需要区分错误时，使用 sentinel 或自定义类型
var (
    ErrUserNotFound  = errors.New("user not found")
    ErrUserExists    = errors.New("user already exists")
    ErrInvalidInput  = errors.New("invalid input")
)

func CreateUser(name string) error {
    if exists(name) {
        return fmt.Errorf("create user %q: %w", name, ErrUserExists)
    }
    // ...
}

// 调用方
err := CreateUser("alice")
if errors.Is(err, ErrUserExists) {
    // 处理用户已存在
}
```

### 6.5 错误日志与返回

```go
// 在顶层处理错误（如 HTTP handler）
func HandleRequest(w http.ResponseWriter, r *http.Request) {
    err := processRequest(r)
    if err != nil {
        var appErr *AppError
        if errors.As(err, &appErr) {
            log.Printf("[%d] %s: %v", appErr.Code, appErr.Message, appErr.Cause)
            http.Error(w, appErr.Error(), appErr.HTTPStatus())
            return
        }
        log.Printf("unexpected error: %v", err)
        http.Error(w, "internal error", 500)
    }
    w.WriteHeader(200)
}
```

### 6.6 Go 1.20+ 多错误包装

```go
// Go 1.20 支持一个错误包装多个错误
err1 := errors.New("error 1")
err2 := errors.New("error 2")
combined := fmt.Errorf("multiple errors: %w; %w", err1, err2)

fmt.Println(errors.Is(combined, err1)) // true
fmt.Println(errors.Is(combined, err2)) // true

// errors.Join（Go 1.20+）
err := errors.Join(err1, err2)
fmt.Println(errors.Is(err, err1)) // true
fmt.Println(errors.Is(err, err2)) // true
```
## 基本错误处理

**基本写法：函数返回错误**
`func <函数名>(<参数>) (<返回值>, error) { ... }`
```go
// 函数返回结果和错误
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero");
    }
    return a / b, nil;
}
```

**基本写法：调用方检查错误**
`if <错误> != nil { ... }`
```go
// 调用函数并检查错误
result, err := divide(10, 0);
if err != nil {
    fmt.Println("Error:", err);
    return;
}
```

---

## 错误创建

**基本写法：errors.New 创建错误**
`errors.New("<消息>")`
```go
// 创建简单错误
err := errors.New("file not found");
```

**基本写法：fmt.Errorf 创建错误**
`fmt.Errorf("<格式>", <参数>)`
```go
// 格式化错误消息
err := fmt.Errorf("user %d not found", userID);
```

---

## 自定义错误类型

**基本写法：自定义错误结构体**
`type <错误类型> struct { ... }`
```go
// 自定义错误类型
type ValidationError struct {
    Field   string;
    Message string;
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message);
}
```

**基本写法：返回自定义错误**
`return &<错误类型>{ ... }`
```go
// 返回自定义错误
func validateEmail(email string) error {
    if !strings.Contains(email, "@") {
        return &ValidationError{
            Field:   "email",
            Message: "invalid email format",
        };
    }
    return nil;
}
```

---

## 错误包装与解包

**基本写法：错误包装**
`fmt.Errorf("<消息>: %w", <错误>)`
```go
// 包装错误保留原始错误链
err := fmt.Errorf("save user failed: %w", originalErr);
```

**基本写法：错误解包**
`errors.Unwrap(<错误>)`
```go
// 解包获取原始错误
originalErr := errors.Unwrap(wrappedErr);
```

**基本写法：错误链判断**
`errors.Is(<错误>, <目标错误>)`
```go
// 判断错误链中是否包含目标错误
if errors.Is(err, sql.ErrNoRows) {
    fmt.Println("record not found");
}
```

**基本写法：错误类型断言**
`errors.As(<错误>, &<目标变量>)`
```go
// 提取错误链中的特定类型
var valErr *ValidationError;
if errors.As(err, &valErr) {
    fmt.Println(valErr.Field);
}
```

---

## 错误处理模式

**基本写法：哨兵错误**
`var Err<名称> = errors.New("<消息>")`
```go
// 定义哨兵错误
var ErrNotFound = errors.New("not found");
var ErrUnauthorized = errors.New("unauthorized");

// 使用 errors.Is 判断
if errors.Is(err, ErrNotFound) {
    fmt.Println("resource not found");
}
```

**基本写法：错误变量组**
`var ( Err<名称1> = ...; Err<名称2> = ... )`
```go
// 批量定义错误变量
var (
    ErrInvalidInput = errors.New("invalid input");
    ErrTimeout      = errors.New("operation timed out");
);
```

---

## panic 与 recover

**基本写法：panic 触发**
`panic(<值>)`
```go
// 触发 panic
func mustInit() {
    panic("initialization failed");
}
```

**基本写法：recover 捕获**
`recover()`
```go
// 在 defer 中 recover
func safeRun() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("Recovered:", r);
        }
    }();
    panic("something went wrong");
}
```

**基本写法：安全调用包装**
`func <函数名>(<函数> func()) { ... }`
```go
// 安全调用包装函数
func safe(fn func()) (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic: %v", r);
        }
    }();
    fn();
    return nil;
}
```

---

## 错误处理最佳实践

**基本写法：错误立即处理**
`if <错误> != nil { return <错误> }`
```go
// 错误立即返回，不忽略
data, err := readFile("config.json");
if err != nil {
    return err;
}
```

**基本写法：错误包装上下文**
`fmt.Errorf("<上下文>: %w", <错误>)`
```go
// 添加上下文信息
if err := saveUser(user); err != nil {
    return fmt.Errorf("create user: %w", err);
}
```

**基本写法：不重复处理错误**
`if <错误> != nil { return }`
```go
// 调用方处理错误，不重复处理
result, err := doSomething();
if err != nil {
    return;
}
```
