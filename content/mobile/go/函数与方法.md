# Go 函数与方法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 函数定义

**基本写法：标准函数声明**
`func <函数名>(<参数列表>) <返回值> { ... }`
```go
// 声明加法函数
func add(a int, b int) int {
    return a + b;
}
```

**基本写法：合并类型参数**
`func <函数名>(<参数1>, <参数2> <类型>) <返回值>`
```go
// a 和 b 都是 int 类型
func add(a, b int) int {
    return a + b;
}
```

---

## 多返回值

**基本写法：多返回值函数**
`func <函数名>(<参数>) (<返回值1>, <返回值2>) { ... }`
```go
// 返回结果和错误
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero");
    }
    return a / b, nil;
}
```

---

## 命名返回值

**基本写法：命名返回值**
`func <函数名>(<参数>) (<名称1>, <名称2> <类型>) { ... }`
```go
// 命名返回值，裸 return 自动返回命名变量
func rectangleProps(w, h float64) (area, perimeter float64) {
    area = w * h;
    perimeter = 2 * (w + h);
    return;
}
```

---

## 可变参数

**基本写法：可变参数函数**
`func <函数名>(<参数> ...<类型>) <返回值>`
```go
// 可变参数在函数内被视为切片
func sum(nums ...int) int {
    total := 0;
    for _, n := range nums {
        total += n;
    }
    return total;
}
```

**基本写法：展开切片**
`<函数名>(<切片>...)`
```go
// 展开切片传入可变参数函数
numbers := []int{10, 20, 30};
fmt.Println(sum(numbers...));
```

---

## 函数作为一等公民

**基本写法：函数变量**
`<变量名> := func(<参数>) <返回值> { ... }`
```go
// 匿名函数赋值给变量
add := func(a, b int) int {
    return a + b;
};
```

**基本写法：高阶函数（参数）**
`func <函数名>(<参数> <类型>, fn func(<类型>) <返回值>) <返回值>`
```go
// 函数作为参数
func apply(nums []int, fn func(int) int) []int {
    result := make([]int, len(nums));
    for i, n := range nums {
        result[i] = fn(n);
    }
    return result;
}
```

**基本写法：高阶函数（返回值）**
`func <函数名>(<参数>) func(<类型>) <返回值>`
```go
// 返回闭包函数
func multiplier(factor int) func(int) int {
    return func(n int) int {
        return n * factor;
    };
}
```

---

## 闭包

**基本写法：闭包定义**
`func() <返回值> { ... }`
```go
// 闭包捕获并修改外部变量
func counter() func() int {
    count := 0;
    return func() int {
        count++;
        return count;
    };
}
```

**基本写法：闭包参数传递**
`go func(<参数> <类型>) { ... }(<值>)`
```go
// 通过参数传递避免闭包陷阱
for i := 0; i < 3; i++ {
    go func(n int) {
        fmt.Println(n);
    }(i);
}
```

---

## init 函数

**基本写法：init 函数**
`func init() { ... }`
```go
// init 函数自动执行，无法被调用
func init() {
    version = "1.0.0";
    loadConfig();
}
```

---

## 方法定义

**基本写法：值接收者方法**
`func (<接收者> <类型>) <方法名>(<参数>) <返回值> { ... }`
```go
// 值接收者方法
type Circle struct {
    Radius float64;
}

func (c Circle) Area() float64 {
    return math.Pi * c.Radius * c.Radius;
}
```

**基本写法：指针接收者方法**
`func (<接收者> *<类型>) <方法名>(<参数>) <返回值> { ... }`
```go
// 指针接收者方法，可修改原始值
func (c *Circle) Scale(factor float64) {
    c.Radius *= factor;
}
```

---

## 自定义类型方法

**基本写法：自定义类型方法**
`func (<接收者> <类型>) <方法名>() <返回值> { ... }`
```go
// 为自定义类型添加方法
type Celsius float64;

func (c Celsius) ToFahrenheit() float64 {
    return float64(c)*9/5 + 32;
}
```

**基本写法：实现 Stringer 接口**
`func (<接收者> <类型>) String() string { ... }`
```go
// 实现 String 方法
func (c Celsius) String() string {
    return fmt.Sprintf("%.1f°C", c);
}
```

---

## 方法值与方法表达式

**基本写法：方法值**
`<变量> := <实例>.<方法名>`
```go
// 方法值绑定接收者
r := Rect{W: 3, H: 4};
area := r.Area;
fmt.Println(area());
```

**基本写法：方法表达式**
`<变量> := <类型>.<方法名>`
```go
// 方法表达式需要传入接收者
areaFn := Rect.Area;
fmt.Println(areaFn(r));
```

---

## 接口定义与实现

**基本写法：接口定义**
`type <接口名> interface { ... }`
```go
// 定义接口
type Speaker interface {
    Speak() string;
}
```

**基本写法：隐式实现**
`func (<接收者> <类型>) <方法名>() <返回值> { ... }`
```go
// Dog 隐式实现了 Speaker 接口
type Dog struct{ Name string };

func (d Dog) Speak() string {
    return d.Name + " says: Woof!";
}
```

---

## 接口组合

**基本写法：接口组合**
`type <接口名> interface { <接口1>; <接口2> }`
```go
// 组合 Reader 和 Writer
type ReadWriter interface {
    Reader;
    Writer;
}
```

---

## 空接口

**基本写法：空接口**
`any` / `interface{}`
```go
// any 接受任意类型
func printAny(v any) {
    fmt.Println(v);
}
```

---

## 类型断言与类型开关

**基本写法：类型断言**
`<值>.(<类型>)`
```go
// 带检查的类型断言
dog, ok := s.(Dog);
if ok {
    fmt.Println(dog.Name);
}
```

**基本写法：类型开关**
`switch <变量> := <值>.(type) { case ... }`
```go
// 类型开关判断类型
switch v := v.(type) {
case int:
    return fmt.Sprintf("int: %d", v);
case string:
    return fmt.Sprintf("string: %s", v);
default:
    return fmt.Sprintf("unknown: %T", v);
}
```

---

## 函数选项模式

**基本写法：函数选项模式**
`type Option func(*<类型>)`
```go
// 函数选项模式
type Server struct {
    host    string;
    port    int;
    timeout time.Duration;
}

type Option func(*Server);

func WithHost(host string) Option {
    return func(s *Server) { s.host = host };
}

func NewServer(opts ...Option) *Server {
    s := &Server{host: "localhost", port: 8080};
    for _, opt := range opts {
        opt(s);
    }
    return s;
}
```

---

## 中间件模式

**基本写法：中间件模式**
`type <类型> func(<类型>) <类型>`
```go
// 中间件模式
type Handler func(msg string);

func LoggingMiddleware(next Handler) Handler {
    return func(msg string) {
        log.Printf("Before: %s", msg);
        next(msg);
        log.Printf("After: %s", msg);
    };
}
```
