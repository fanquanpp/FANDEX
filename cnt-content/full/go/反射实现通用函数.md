---
order: 103
title: 反射实现通用函数
module: go
category: 'dev-lang'
difficulty: advanced
description: Go反射实现通用函数详解：reflect包。
author: fanquanpp
updated: '2026-06-14'
related:
  - go/GMP调度模型
  - go/并发模式
  - go/内存逃逸分析
  - go/垃圾回收与GC调优
prerequisites:
  - go/概述与环境配置
---

## 概述

反射（Reflection）是 Go 语言在运行时检查类型信息、操作值的能力。通过 reflect 包，程序可以在编译时不知道具体类型的情况下，动态地调用方法、访问字段和创建值。反射是实现通用函数、序列化框架和 ORM 等工具的基础。但反射性能较差，Go 1.18+ 引入泛型后，许多反射场景可以用泛型替代。

## 基础概念

### reflect.Type 和 reflect.Value

反射的两个核心类型：

- reflect.Type：表示 Go 类型信息，是只读的
- reflect.Value：表示 Go 值，可以读取和修改

```go
import "reflect"

t := reflect.TypeOf(42)        // *reflect.Type，表示 int
v := reflect.ValueOf("hello")  // reflect.Value，表示 "hello"

v.Kind()   // String（底层种类）
v.Type()   // string（具体类型）
v.String() // "hello"（值的字符串表示）
```

### Kind 与 Type 的区别

Type 是具体的类型名称（如 User、MyReader），Kind 是底层的种类（如 Struct、Int、String）：

```go
type User struct{ Name string }

u := User{"Alice"}
t := reflect.TypeOf(u)

t.Name()  // "User"（类型名）
t.Kind()  // reflect.Struct（种类）
```

### 常用 Kind 枚举

| Kind             | 说明   |
| ---------------- | ------ |
| Bool             | 布尔   |
| Int, Int8...     | 整数   |
| Float32, Float64 | 浮点数 |
| String           | 字符串 |
| Array            | 数组   |
| Slice            | 切片   |
| Map              | 映射   |
| Struct           | 结构体 |
| Func             | 函数   |
| Interface        | 接口   |
| Ptr              | 指针   |

## 快速上手

### 基本反射操作

```go
import "reflect"

// 获取类型信息
t := reflect.TypeOf(42)
fmt.Println(t.Name(), t.Kind())  // int int

// 获取值信息
v := reflect.ValueOf("hello")
fmt.Println(v.Kind(), v.String())  // String hello

// 修改值（必须传入指针）
x := 42
v := reflect.ValueOf(&x)
v.Elem().SetInt(100)  // x 变为 100
```

### 结构体反射

```go
type User struct {
    Name string `json:"name" validate:"required"`
    Age  int    `json:"age" validate:"min=0"`
}

u := User{"Alice", 30}
t := reflect.TypeOf(u)

// 遍历字段
for i := 0; i < t.NumField(); i++ {
    field := t.Field(i)
    fmt.Printf("字段: %s, 类型: %s, 标签: %s\n",
        field.Name,
        field.Type,
        field.Tag.Get("json"),
    )
}
```

## 详细用法

### 值的读取与修改

```go
// 读取值
v := reflect.ValueOf(42)
i := v.Int()     // 获取 int 值
s := v.String()  // 获取字符串表示

// 修改值：必须通过指针
x := 42
pv := reflect.ValueOf(&x)
if pv.Elem().CanSet() {
    pv.Elem().SetInt(100)  // 修改成功
}

// 修改结构体字段
u := User{Name: "Alice", Age: 30}
pv := reflect.ValueOf(&u).Elem()
nameField := pv.FieldByName("Name")
if nameField.CanSet() {
    nameField.SetString("Bob")  // u.Name 变为 "Bob"
}
```

### 方法反射

```go
type Calculator struct{}

func (c Calculator) Add(a, b int) int { return a + b }
func (c *Calculator) Sub(a, b int) int { return a - b }

c := Calculator{}
t := reflect.TypeOf(c)

// 遍历方法
for i := 0; i < t.NumMethod(); i++ {
    m := t.Method(i)
    fmt.Printf("方法: %s, 类型: %s\n", m.Name, m.Type)
}

// 调用方法
v := reflect.ValueOf(c)
method := v.MethodByName("Add")
result := method.Call([]reflect.Value{
    reflect.ValueOf(10),
    reflect.ValueOf(20),
})
fmt.Println(result[0].Int())  // 30
```

### 通用 Map 函数

```go
func Map(slice any, fn any) any {
    sv := reflect.ValueOf(slice)
    fv := reflect.ValueOf(fn)

    // 参数校验
    if sv.Kind() != reflect.Slice {
        panic("第一个参数必须是切片")
    }
    if fv.Kind() != reflect.Func {
        panic("第二个参数必须是函数")
    }

    // 创建结果切片
    result := reflect.MakeSlice(reflect.SliceOf(fv.Type().Out(0)), 0, sv.Len())

    // 对每个元素应用函数
    for i := 0; i < sv.Len(); i++ {
        out := fv.Call([]reflect.Value{sv.Index(i)})
        result = reflect.Append(result, out[0])
    }

    return result.Interface()
}

// 使用
doubled := Map([]int{1, 2, 3}, func(x int) int { return x * 2 })
// []int{2, 4, 6}

names := Map([]User{{"Alice"}, {"Bob"}}, func(u User) string { return u.Name })
// []string{"Alice", "Bob"}
```

### 通用 Filter 函数

```go
func Filter(slice any, predicate any) any {
    sv := reflect.ValueOf(slice)
    pv := reflect.ValueOf(predicate)

    result := reflect.MakeSlice(sv.Type(), 0, 0)

    for i := 0; i < sv.Len(); i++ {
        out := pv.Call([]reflect.Value{sv.Index(i)})
        if out[0].Bool() {
            result = reflect.Append(result, sv.Index(i))
        }
    }

    return result.Interface()
}

// 使用
evens := Filter([]int{1, 2, 3, 4, 5}, func(x int) bool { return x%2 == 0 })
// []int{2, 4}
```

### 动态创建值

```go
// 根据类型创建零值
func zeroValue(t reflect.Type) reflect.Value {
    return reflect.Zero(t)
}

// 根据类型名创建实例
func newInstance(typeName string) (any, error) {
    switch typeName {
    case "int":
        return reflect.New(reflect.TypeOf(0)).Elem().Interface(), nil
    case "string":
        return reflect.New(reflect.TypeOf("")).Elem().Interface(), nil
    default:
        return nil, fmt.Errorf("未知类型: %s", typeName)
    }
}
```

## 常见场景

### 场景一：通用验证器

```go
func Validate(v any) error {
    val := reflect.ValueOf(v)
    if val.Kind() == reflect.Ptr {
        val = val.Elem()
    }
    typ := val.Type()

    for i := 0; i < typ.NumField(); i++ {
        field := typ.Field(i)
        fieldVal := val.Field(i)

        // 检查 required 标签
        if tag := field.Tag.Get("validate"); tag == "required" {
            if fieldVal.IsZero() {
                return fmt.Errorf("字段 %s 不能为空", field.Name)
            }
        }
    }
    return nil
}

// 使用
type Form struct {
    Name  string `validate:"required"`
    Email string `validate:"required"`
    Age   int
}

err := Validate(Form{Name: "Alice", Email: ""})  // 错误：字段 Email 不能为空
```

### 场景二：通用结构体转 Map

```go
func StructToMap(v any) map[string]any {
    result := make(map[string]any)
    val := reflect.ValueOf(v)
    if val.Kind() == reflect.Ptr {
        val = val.Elem()
    }
    typ := val.Type()

    for i := 0; i < typ.NumField(); i++ {
        field := typ.Field(i)
        // 使用 json 标签作为 key
        key := field.Tag.Get("json")
        if key == "" || key == "-" {
            key = field.Name
        }
        result[key] = val.Field(i).Interface()
    }
    return result
}
```

### 场景三：通用深拷贝

```go
func DeepCopy(src any) any {
    if src == nil {
        return nil
    }

    val := reflect.ValueOf(src)
    if val.Kind() == reflect.Ptr {
        // 创建新指针
        newPtr := reflect.New(val.Elem().Type())
        deepCopyValue(val.Elem(), newPtr.Elem())
        return newPtr.Interface()
    }

    newVal := reflect.New(val.Type()).Elem()
    deepCopyValue(val, newVal)
    return newVal.Interface()
}

func deepCopyValue(src, dst reflect.Value) {
    switch src.Kind() {
    case reflect.Struct:
        for i := 0; i < src.NumField(); i++ {
            deepCopyValue(src.Field(i), dst.Field(i))
        }
    case reflect.Slice:
        dst.Set(reflect.MakeSlice(src.Type(), src.Len(), src.Cap()))
        for i := 0; i < src.Len(); i++ {
            deepCopyValue(src.Index(i), dst.Index(i))
        }
    case reflect.Map:
        dst.Set(reflect.MakeMap(src.Type()))
        for _, key := range src.MapKeys() {
            dst.SetMapIndex(key, src.MapIndex(key))
        }
    default:
        dst.Set(src)
    }
}
```

## 注意事项

- 反射性能较差，比直接调用慢 10-100 倍，避免在热路径中使用
- 反射绕过了编译时类型检查，错误只能在运行时发现
- Go 1.18+ 推荐使用泛型替代反射实现通用函数
- 修改值时必须传入指针，且导出字段才能被修改
- 反射代码可读性较差，应添加充分的注释
- 使用 CanSet() 检查值是否可修改，避免 panic

## 进阶用法

### 泛型替代反射

Go 1.18+ 的泛型可以在编译时实现类型安全，性能远优于反射：

```go
// 泛型 Map 函数（编译时类型安全）
func Map[T, U any](s []T, fn func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = fn(v)
    }
    return result
}

// 泛型 Filter 函数
func Filter[T any](s []T, fn func(T) bool) []T {
    result := make([]T, 0, len(s))
    for _, v := range s {
        if fn(v) {
            result = append(result, v)
        }
    }
    return result
}

// 使用
doubled := Map([]int{1, 2, 3}, func(x int) int { return x * 2 })
evens := Filter([]int{1, 2, 3, 4}, func(x int) bool { return x%2 == 0 })
```

### 反射与接口结合

```go
// 定义类型断言接口，优先使用接口，反射作为后备
type Validator interface {
    Validate() error
}

func ValidateField(v any) error {
    // 优先使用接口
    if validator, ok := v.(Validator); ok {
        return validator.Validate()
    }

    // 后备：使用反射
    return reflectValidate(v)
}
```

### 反射实现插件系统

```go
// 插件注册表
var plugins = make(map[string]reflect.Type)

func Register(name string, plugin any) {
    t := reflect.TypeOf(plugin)
    if t.Kind() == reflect.Ptr {
        t = t.Elem()
    }
    plugins[name] = t
}

func Create(name string) (any, error) {
    t, ok := plugins[name]
    if !ok {
        return nil, fmt.Errorf("插件 %s 未注册", name)
    }
    return reflect.New(t).Interface(), nil
}

// 使用
Register("mysql", &MySQLPlugin{})
plugin, _ := Create("mysql")
```
