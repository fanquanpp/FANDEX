# Go 基础语法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 变量声明

**基本写法：显式声明变量类型和初始值**
`var <变量名> <类型> = <值>`
```go
// 显式声明变量类型和初始值
var name string = "Go";
```

**基本写法：类型推断声明**
`var <变量名> = <值>`
```go
// 自动推断类型
var age = 15;
```

**单行写法：批量声明多个变量**
`var ( <变量1> <类型1> = <值1>; <变量2> <类型2> = <值2> )`
```go
// 单行批量声明多个变量
var ( x int = 10; y float64 = 3.14; flag bool = true );
```

**换行写法：批量声明多个变量**
`var ( ... )`
```go
// 换行书写批量声明
var (
    x    int     = 10
    y    float64 = 3.14
    flag bool    = true
);
```

**基本写法：短变量声明**
`<变量名> := <值>`
```go
// 仅限函数内使用，自动推断类型
city := "Beijing";
```

**基本写法：零值声明**
`var <变量名> <类型>`
```go
// 未初始化的变量使用零值
var score int; // 0
```

---

## 常量

**基本写法：常量声明**
`const <名称> = <值>`
```go
// 声明常量
const Pi = 3.14159;
```

**单行写法：批量声明常量**
`const ( <名称1> = <值1>; <名称2> = <值2> )`
```go
// 单行批量声明常量
const ( StatusOK = 200; StatusError = 500 );
```

**换行写法：批量声明常量**
`const ( ... )`
```go
// 换行书写批量声明
const (
    StatusOK    = 200
    StatusError = 500
);
```

**基本写法：iota 常量生成器**
`const ( <名称> = iota ... )`
```go
// iota 从 0 开始自动递增
const (
    Sunday    = iota // 0
    Monday           // 1
    Tuesday          // 2
);
```

**基本写法：iota 位运算标志**
`const ( <名称> = 1 << iota ... )`
```go
// 位运算生成权限标志
const (
    ReadPermission   = 1 << iota // 1  (001)
    WritePermission              // 2  (010)
    ExecutePermission            // 4  (100)
);
```

**基本写法：iota 跳过值**
`_ = iota`
```go
// 跳过 0，从 1024 开始
const (
    _  = iota
    KB = 1 << (10 * iota) // 1024
    MB                    // 1048576
);
```

---

## 类型转换

**基本写法：显式类型转换**
`<目标类型>(<值>)`
```go
// int 转 float64
var i int = 42;
var f float64 = float64(i);
```

**基本写法：int 转 string**
`strconv.Itoa(<整数>)`
```go
// int 转 string
s := strconv.Itoa(42);
```

**基本写法：string 转 int**
`strconv.Atoi(<字符串>)`
```go
// string 转 int
n, err := strconv.Atoi("42");
```

**基本写法：string 转 []byte**
`[]byte(<字符串>)`
```go
// string 转 []byte
bytes := []byte("hello");
```

**基本写法：[]byte 转 string**
`string(<字节切片>)`
```go
// []byte 转 string
str := string(bytes);
```

---

## 字符串操作

**基本写法：字符串字节长度**
`len(<字符串>)`
```go
// 字节数（UTF-8 编码）
fmt.Println(len("Hello, 世界")); // 13
```

**基本写法：字符串字符数**
`utf8.RuneCountInString(<字符串>)`
```go
// 字符数（正确处理 Unicode）
fmt.Println(utf8.RuneCountInString("Hello, 世界")); // 9
```

**基本写法：按 rune 遍历字符串**
`for i, r := range <字符串>`
```go
// 按 rune 遍历，正确处理 Unicode
for i, r := range "Hello" {
    fmt.Printf("%d:%c ", i, r);
}
```

**基本写法：判断子串是否存在**
`strings.Contains(<字符串>, <子串>)`
```go
// 查找子串
strings.Contains("Hello, World", "World"); // true
```

**基本写法：判断前缀**
`strings.HasPrefix(<字符串>, <前缀>)`
```go
// 判断前缀
strings.HasPrefix("Hello, World", "Hello"); // true
```

**基本写法：判断后缀**
`strings.HasSuffix(<字符串>, <后缀>)`
```go
// 判断后缀
strings.HasSuffix("Hello, World", "World"); // true
```

**基本写法：查找子串位置**
`strings.Index(<字符串>, <子串>)`
```go
// 查找子串位置
strings.Index("Hello, World", "World"); // 7
```

**基本写法：转大写**
`strings.ToUpper(<字符串>)`
```go
// 转大写
strings.ToUpper("Hello"); // "HELLO"
```

**基本写法：转小写**
`strings.ToLower(<字符串>)`
```go
// 转小写
strings.ToLower("Hello"); // "hello"
```

**基本写法：去除首尾空白**
`strings.TrimSpace(<字符串>)`
```go
// 去除首尾空白
strings.TrimSpace("  hi  "); // "hi"
```

**基本写法：替换字符串**
`strings.Replace(<字符串>, <旧>, <新>, <次数>)`
```go
// 替换字符串
strings.Replace("Hello", "l", "L", 1); // "HeLlo"
```

**基本写法：拆分字符串**
`strings.Split(<字符串>, <分隔符>)`
```go
// 拆分字符串
parts := strings.Split("a,b,c", ",");
```

**基本写法：合并字符串**
`strings.Join(<切片>, <分隔符>)`
```go
// 合并字符串
joined := strings.Join(parts, "-");
```

**基本写法：字符串构建**
`strings.Builder`
```go
// 使用 Builder 高效构建字符串
var b strings.Builder;
b.WriteString("Hello");
b.WriteString(", World");
result := b.String();
```

**基本写法：原始字符串**
`` `<内容> ``
```go
// 反引号包围的原始字符串
raw := `C:\Users\name\file.txt`;
```

---

## 指针

**基本写法：取地址**
`&<变量>`
```go
// 取地址
x := 42;
p := &x; // p 是 *int 类型
```

**基本写法：解引用**
`*<指针>`
```go
// 解引用获取值
fmt.Println(*p); // 42
```

**基本写法：通过指针修改值**
`*<指针> = <值>`
```go
// 通过指针修改值
*p = 100;
```

**基本写法：nil 指针检查**
`if <指针> != nil`
```go
// nil 指针检查
var p *int;
if p != nil {
    fmt.Println(*p);
}
```

**基本写法：指针传递**
`func <函数名>(<参数> *<类型>)`
```go
// 指针传递修改外部变量
func doublePtr(n *int) {
    *n *= 2;
}
```

**基本写法：new 函数**
`new(<类型>)`
```go
// new 分配零值内存
p := new(int);
*p = 42;
```

---

## if 语句

**基本写法：基本 if 语句**
`if <条件> { ... }`
```go
// 基本条件判断
if x > 0 {
    fmt.Println("positive");
} else if x < 0 {
    fmt.Println("negative");
} else {
    fmt.Println("zero");
}
```

**基本写法：带初始化的 if**
`if <初始化>; <条件> { ... }`
```go
// 初始化语句中的变量仅在此块可见
if err := doSomething(); err != nil {
    fmt.Println("Error:", err);
}
```

---

## for 循环

**基本写法：经典三段式**
`for <初始化>; <条件>; <后置> { ... }`
```go
// 经典 for 循环
for i := 0; i < 10; i++ {
    fmt.Println(i);
}
```

**基本写法：while 风格**
`for <条件> { ... }`
```go
// while 风格循环
n := 1;
for n < 100 {
    n *= 2;
}
```

**基本写法：无限循环**
`for { ... }`
```go
// 无限循环
for {
    if shouldBreak() {
        break;
    }
}
```

**基本写法：for-range 遍历**
`for <索引>, <值> := range <集合> { ... }`
```go
// 遍历切片
nums := []int{1, 2, 3};
for i, v := range nums {
    fmt.Printf("index=%d value=%d\n", i, v);
}
```

**基本写法：Go 1.22+ for-range 整数**
`for i := range <整数> { ... }`
```go
// 遍历 0 到 4
for i := range 5 {
    fmt.Println(i);
}
```

---

## switch 语句

**基本写法：基本 switch**
`switch <表达式> { case ... }`
```go
// 基本 switch 语句
switch day {
case "Monday":
    fmt.Println("周一");
case "Tuesday":
    fmt.Println("周二");
default:
    fmt.Println("其他");
}
```

**基本写法：多值匹配**
`case <值1>, <值2>, <值3>:`
```go
// 多值匹配
switch color {
case "red", "green", "blue":
    fmt.Println("基础颜色");
}
```

**基本写法：fallthrough 穿透**
`fallthrough`
```go
// fallthrough 继续执行下一个 case
switch n := 2; n {
case 1:
    fmt.Println("一");
    fallthrough;
case 2:
    fmt.Println("二");
    fallthrough;
case 3:
    fmt.Println("三");
}
```

**基本写法：无条件 switch**
`switch { case <条件>: ... }`
```go
// 无条件 switch
score := 85;
switch {
case score >= 90:
    fmt.Println("A");
case score >= 80:
    fmt.Println("B");
default:
    fmt.Println("D");
}
```

---

## break 与 continue

**基本写法：continue 跳过**
`continue`
```go
// 跳过当前迭代
for i := 0; i < 10; i++ {
    if i == 3 {
        continue;
    }
    fmt.Println(i);
}
```

**基本写法：break 退出**
`break`
```go
// 退出循环
for i := 0; i < 10; i++ {
    if i == 7 {
        break;
    }
    fmt.Println(i);
}
```

**基本写法：标签跳转**
`break <标签>`
```go
// 标签跳转跳出外层循环
outer:
for i := 0; i < 3; i++ {
    for j := 0; j < 3; j++ {
        if i == 1 && j == 1 {
            break outer;
        }
    }
}
```

---

## defer 语句

**基本写法：基本 defer**
`defer <函数调用>`
```go
// 确保文件关闭
func readFile(path string) {
    file, err := os.Open(path);
    if err != nil {
        return;
    }
    defer file.Close();
}
```

**基本写法：defer 执行顺序**
`defer <函数调用>`
```go
// 多个 defer 按后进先出执行
defer fmt.Println("第一");  // 最后执行
defer fmt.Println("第二");  // 第二执行
defer fmt.Println("第三");  // 最先执行
```

**基本写法：defer 参数求值**
`defer <函数>(<参数>)`
```go
// 参数在声明时求值
x := 10;
defer fmt.Println(x); // 输出 10
x = 20;
```

**基本写法：defer 修改命名返回值**
`defer func() { ... }()`
```go
// defer 修改命名返回值
func double() (result int) {
    defer func() {
        result *= 2;
    }();
    return 5;
}
```

---

## Go 1.24+ 新特性

**基本写法：Go 1.24 generic type aliases**
`type <别名>[T] = <类型>[T]`
```go
// 泛型类型别名：为泛型类型定义简短别名
type List[T] = []T
type Map[K, V] = map[K]V
type Set[T comparable] = map[T]struct{}
// 使用别名声明变量
var names List[string] = []string{"Go", "Rust"}
var ages Map[string, int] = map[string]int{"Alice": 30}
```

**基本写法：Go 1.24 range-over-func**
`for <x> := range <func> { }`
```go
// range 遍历函数：迭代器函数签名为 func(yield func(T) bool)
func gen(yield func(int) bool) {
    for i := 0; i < 3; i++ {
        if !yield(i * 10) {
            return
        }
    }
}
// 使用 range-over-func 直接遍历函数
for v := range gen {
    fmt.Println(v) // 依次输出 0 10 20
}
```

**基本写法：Go 1.24 weak pointer**
`runtime.AddCleanup(<obj>, <cleanup>, <arg>)`
```go
// 通过 runtime.AddCleanup 注册清理回调，实现弱引用语义
type Big struct{ data [1024]byte }
obj := &Big{}
obj.data[0] = 42
// 当 obj 被 GC 回收时执行清理函数，arg 作为参数传入
runtime.AddCleanup(obj, func(arg int) {
    fmt.Println("对象被回收，传入参数 =", arg)
}, 100)
// 主动解除引用，等待 GC 触发清理
obj = nil
runtime.GC()
```

**基本写法：Go 1.24 toolchain 指令**
`//go:toolchain <版本>`
```go
// 在 go.mod 文件头部指定工具链版本
// go 1.24.0
// toolchain go1.24.3
//go:toolchain go1.24.3

module example.com/myapp

go 1.24.0
```

**基本写法：Go 1.26 new(expr) 内置函数**
`new(<expr>)`
```go
// Go 1.26：new 支持任意表达式，返回指向表达式结果的指针
x := 42
// 直接对表达式结果取地址
p := new(x*2 + 1) // *int，指向值为 85 的内存
fmt.Println(*p)   // 输出 85
// 等价于传统写法
// v := x*2 + 1; p := &v
```
