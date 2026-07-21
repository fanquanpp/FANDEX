# Go 接口与类型断言

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 接口定义

**基本写法：基本接口**
`type <接口名> interface { <方法签名> }`
```go
// 定义接口
type Speaker interface {
    Speak() string;
}
```

**基本写法：组合接口**
`type <接口名> interface { <接口1>; <接口2> }`
```go
// 组合接口
type ReadWriter interface {
    Reader;
    Writer;
}
```

**基本写法：空接口**
`any` / `interface{}`
```go
// any 接受任意类型
func printAny(v any) {
    fmt.Println(v);
}
```

---

## 接口实现

**基本写法：隐式实现**
`func (<接收者> <类型>) <方法名>() <返回值> { ... }`
```go
// Dog 隐式实现 Speaker
type Dog struct{ Name string };

func (d Dog) Speak() string {
    return d.Name + " says: Woof!";
}
```

**基本写法：接口赋值**
`var <接口变量> <接口名> = <实例>`
```go
// 接口变量持有具体类型实例
var s Speaker = Dog{Name: "Rex"};
fmt.Println(s.Speak());
```

---

## 类型断言

**基本写法：基本类型断言**
`<值>.(<类型>)`
```go
// 直接断言（失败会 panic）
var i any = "hello";
s := i.(string);
```

**基本写法：带检查的类型断言**
`<值>, <ok> := <接口值>.(<类型>)`
```go
// 带检查的断言
s, ok := i.(string);
if ok {
    fmt.Println(s);
}
```

---

## 类型开关

**基本写法：类型开关**
`switch <变量> := <值>.(type) { case ... }`
```go
// 类型开关判断类型
switch v := i.(type) {
case int:
    fmt.Printf("int: %d\n", v);
case string:
    fmt.Printf("string: %s\n", v);
case []byte:
    fmt.Printf("bytes: %v\n", v);
default:
    fmt.Printf("unknown: %T\n", v);
}
```

**基本写法：多个类型同一分支**
`case <类型1>, <类型2>:`
```go
// 多个类型同一处理
switch v := i.(type) {
case int, int64, float64:
    fmt.Printf("number: %v\n", v);
case string:
    fmt.Printf("string: %s\n", v);
}
```

---

## 接口嵌套

**基本写法：接口嵌套**
`type <接口名> interface { <接口1>; <接口2>; <方法> }`
```go
// 接口嵌套
type Reader interface {
    Read(p []byte) (n int, err error);
}

type Writer interface {
    Write(p []byte) (n int, err error);
}

type ReadWriter interface {
    Reader;
    Writer;
}
```

---

## 空接口应用

**基本写法：空接口作为参数**
`func <函数名>(<参数> any) { ... }`
```go
// 接受任意类型参数
func printAny(v any) {
    fmt.Println(v);
}
```

**基本写法：空接口切片**
`[]any`
```go
// 存储任意类型的切片
mixed := []any{42, "hello", 3.14, true};
for _, v := range mixed {
    fmt.Printf("%T: %v\n", v, v);
}
```

---

## 接口组合模式

**基本写法：接口隔离原则**
`type <接口名> interface { ... }`
```go
// 小接口组合
type Sizer interface {
    Size() int;
}

type Stringer interface {
    String() string;
}

// 组合使用
type SizableStringer interface {
    Sizer;
    Stringer;
}
```

---

## 鸭子类型检查

**基本写法：编译期接口检查**
`var _ <接口名> = <类型>{}`
```go
// 编译期检查 Dog 是否实现 Speaker
var _ Speaker = Dog{};
```

---

## 接口零值

**基本写法：nil 接口**
`var <变量> <接口名>`
```go
// nil 接口调用方法会 panic
var s Speaker;
if s != nil {
    s.Speak();
}
```

**基本写法：nil 指针接收者**
`var <接口变量> <接口名> = (<类型>)(nil)`
```go
// 接口持有 nil 指针
type MyError struct{ Msg string };

func (e *MyError) Error() string {
    if e == nil {
        return "nil error";
    }
    return e.Msg;
}

var err error = (*MyError)(nil);
fmt.Println(err.Error()); // "nil error"
```

---

## 类型别名与类型定义

**基本写法：类型定义**
`type <新类型> <底层类型>`
```go
// 类型定义，Celsius 是新类型
type Celsius float64;
```

**基本写法：类型别名**
`type <别名> = <原类型>`
```go
// 类型别名，与原类型完全相同
type Text = string;
```

---

## 可比较接口

**基本写法：可比较类型作为 map 键**
`map[<接口>]<值类型>`
```go
// 接口作为 map 键（仅限可比较类型）
type Key interface{};

m := map[Key]string{};
m[1] = "one";
m["two"] = "two";
```
