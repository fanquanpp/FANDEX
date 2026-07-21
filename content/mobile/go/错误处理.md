# Go 错误处理

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

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
