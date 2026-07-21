# Go 泛型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 泛型函数

**基本写法：泛型函数声明**
`func <函数名>[<类型参数> <约束>](<参数> <类型参数>) <返回值>`
```go
// 泛型函数，T 必须满足 Ordered 约束
func Min[T constraints.Ordered](a, b T) T {
    if a < b {
        return a;
    }
    return b;
}
```

**基本写法：调用泛型函数**
`<函数名>[<类型>](<参数>)`
```go
// 显式指定类型参数
minInt := Min[int](3, 5);
```

**基本写法：类型推断调用**
`<函数名>(<参数>)`
```go
// 编译器自动推断类型
minFloat := Min(3.14, 2.71);
```

---

## 类型约束

**基本写法：接口约束**
`type <约束名> interface { ~<类型1> | ~<类型2> }`
```go
// 自定义类型约束
type Number interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~float32 | ~float64;
}
```

**基本写法：使用自定义约束**
`func <函数名>[<类型参数> <约束>](<参数>) <返回值>`
```go
// 使用自定义 Number 约束
func Sum[T Number](nums []T) T {
    var total T;
    for _, n := range nums {
        total += n;
    }
    return total;
}
```

**基本写法：comparable 约束**
`func <函数名>[<类型参数> comparable](<参数>) <返回值>`
```go
// comparable 约束允许 == 和 != 比较
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {
            return true;
        }
    }
    return false;
}
```

**基本写法：any 约束**
`func <函数名>[<类型参数> any](<参数>) <返回值>`
```go
// any 约束接受任意类型
func Print[T any](v T) {
    fmt.Println(v);
}
```

---

## 多类型参数

**基本写法：多类型参数泛型**
`func <函数名>[<类型1> <约束1>, <类型2> <约束2>](<参数>) <返回值>`
```go
// 多类型参数泛型函数
func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice));
    for i, v := range slice {
        result[i] = fn(v);
    }
    return result;
}
```

---

## 泛型类型

**基本写法：泛型切片类型**
`type <类型名>[<类型参数> <约束>] []<类型参数>`
```go
// 泛型切片类型
type Stack[T any] []T;
```

**基本写法：泛型结构体**
`type <类型名>[<类型参数> <约束>] struct { ... }`
```go
// 泛型结构体
type Pair[T, U any] struct {
    First  T;
    Second U;
}
```

**基本写法：泛型 map 类型**
`type <类型名>[<类型参数1> <约束1>, <类型参数2> <约束2>] map[<类型参数1>]<类型参数2>`
```go
// 泛型 map 类型
type Map[K comparable, V any] map[K]V;
```

---

## 泛型方法

**基本写法：泛型类型方法**
`func (<接收者> <类型名>[<类型参数>]) <方法名>(<参数>) <返回值>`
```go
// 泛型类型的方法
func (s *Stack[T]) Push(v T) {
    *s = append(*s, v);
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T;
    if len(*s) == 0 {
        return zero, false;
    }
    v := (*s)[len(*s)-1];
    *s = (*s)[:len(*s)-1];
    return v, true;
}
```

---

## 泛型接口

**基本写法：泛型接口**
`type <接口名>[<类型参数> <约束>] interface { ... }`
```go
// 泛型接口
type Container[T any] interface {
    Add(v T);
    Get() T;
    Len() int;
}
```

---

## 约束包

**基本写法：constraints.Ordered**
`[T constraints.Ordered]`
```go
// Ordered 约束支持 < > <= >=
func Max[T constraints.Ordered](a, b T) T {
    if a > b {
        return a;
    }
    return b;
}
```

---

## 类型近似

**基本写法：近似类型约束**
`~<底层类型>`
```go
// ~ 表示包含底层类型的自定义类型
type Number interface {
    ~int | ~float64;
}

type MyInt int; // MyInt 满足 Number 约束
```

---

## 泛型实例化

**基本写法：实例化泛型类型**
`<类型名>[<具体类型>]`
```go
// 实例化泛型类型
intStack := Stack[int]{};
strStack := Stack[string]{};
```

---

## 泛型算法

**基本写法：泛型过滤**
`func <函数名>[<类型> <约束>](<参数>) <返回值>`
```go
// 泛型过滤函数
func Filter[T any](slice []T, fn func(T) bool) []T {
    result := []T{};
    for _, v := range slice {
        if fn(v) {
            result = append(result, v);
        }
    }
    return result;
}
```

**基本写法：泛型归约**
`func <函数名>[<类型> <约束>](<参数>) <返回值>`
```go
// 泛型归约函数
func Reduce[T, U any](slice []T, initial U, fn func(U, T) U) U {
    result := initial;
    for _, v := range slice {
        result = fn(result, v);
    }
    return result;
}
```
