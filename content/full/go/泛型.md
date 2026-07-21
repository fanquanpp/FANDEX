---
order: 8
title: 'Go 泛型'
module: go
category: Go
difficulty: advanced
description: 'Go 1.18+ 泛型、类型参数、约束、泛型函数与类型、类型推断、slices/maps/cmp 标准库包与泛型实际应用。'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/并发编程
  - go/错误处理
  - go/标准库与工具链
  - go/Web开发与微服务
prerequisites: []
---

## 1. 泛型概述

Go 1.18（2022.03）正式引入泛型，是 Go 语言最重要的特性之一。泛型允许编写与类型无关的代码，同时保持类型安全。

### 1.1 为什么需要泛型

```go
// 没有泛型时：每种类型写一个函数
func MaxInt(a, b int) int {
    if a > b { return a }
    return b
}

func MaxFloat64(a, b float64) float64 {
    if a > b { return a }
    return b
}

func MaxString(a, b string) string {
    if a > b { return a }
    return b
}

// 或者使用 any（丢失类型安全）
func MaxAny(a, b any) any {
    // 需要类型断言，运行时才能发现错误
}
```

### 1.2 泛型版本

```go
func Max[T cmp.Ordered](a, b T) T {
    if a > b { return a }
    return b
}

fmt.Println(Max(3, 5))           // 5
fmt.Println(Max(3.14, 2.71))     // 3.14
fmt.Println(Max("abc", "xyz"))   // xyz
```

## 2. 类型参数

### 2.1 语法

```go
// 函数泛型
func FuncName[T constraint](params T) T { ... }

// 多类型参数
func Map[T1, T2 any](s []T1, f func(T1) T2) []T2 { ... }

// 类型泛型
type Container[T any] struct {
    data T
}
```

### 2.2 类型参数列表

```go
// 单类型参数
func Print[T any](v T) {
    fmt.Println(v)
}

// 多类型参数
func Pair[T1, T2 any](a T1, b T2) struct{ F1 T1; F2 T2 } {
    return struct{ F1 T1; F2 T2 }{a, b}
}

// 类型参数可以互相引用
func Convert[T1, T2 any](s []T1, f func(T1) T2) []T2 {
    result := make([]T2, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}
```

## 3. 约束（Constraint）

约束定义了类型参数必须满足的条件，本质上是接口。

### 3.1 any 约束

```go
// any 是 interface{} 的别名，最宽松的约束
func Print[T any](v T) {
    fmt.Println(v)
}
```

### 3.2 comparable 约束

```go
// comparable 允许 == 和 != 操作
func Contains[T comparable](s []T, v T) bool {
    for _, item := range s {
        if item == v {
            return true
        }
    }
    return false
}

fmt.Println(Contains([]string{"a", "b", "c"}, "b")) // true
fmt.Println(Contains([]int{1, 2, 3}, 4))             // false
```

### 3.3 cmp.Ordered 约束

```go
import "cmp"

// cmp.Ordered 包含所有支持 < > <= >= 的类型
// ~int | ~int8 | ~int16 | ~int32 | ~int64 |
// ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr |
// ~float32 | ~float64 | ~string

func Max[T cmp.Ordered](a, b T) T {
    if a > b { return a }
    return b
}

func Sort[T cmp.Ordered](s []T) {
    slices.Sort(s)
}
```

### 3.4 自定义约束

```go
// 方法约束
type Stringer interface {
    String() string
}

func Join[T Stringer](items []T, sep string) string {
    strs := make([]string, len(items))
    for i, item := range items {
        strs[i] = item.String()
    }
    return strings.Join(strs, sep)
}

// 联合类型约束（使用 | ）
type Number interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64 |
    ~float32 | ~float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

// ~ 表示底层类型（underlying type）
type MyInt int // MyInt 的底层类型是 int

// ~int 匹配 int 和所有底层类型为 int 的自定义类型
// int 只匹配 int 本身
```

### 3.5 约束中的类型成员

```go
// 约束可以包含类型
type Number interface {
    ~int | ~float64
}

// 复杂约束示例
type SliceConstraint[S any] interface {
    ~[]S
}

func Last[S any, T SliceConstraint[S]](s T) S {
    return s[len(s)-1]
}
```

## 4. 泛型函数

### 4.1 常用泛型函数

```go
// Map — 转换切片元素
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}

doubled := Map([]int{1, 2, 3}, func(n int) int { return n * 2 })
// [2, 4, 6]

// Filter — 过滤切片
func Filter[T any](s []T, pred func(T) bool) []T {
    var result []T
    for _, v := range s {
        if pred(v) {
            result = append(result, v)
        }
    }
    return result
}

evens := Filter([]int{1, 2, 3, 4, 5}, func(n int) bool { return n%2 == 0 })
// [2, 4]

// Reduce — 归约
func Reduce[T, U any](s []T, init U, f func(U, T) U) U {
    acc := init
    for _, v := range s {
        acc = f(acc, v)
    }
    return acc
}

sum := Reduce([]int{1, 2, 3}, 0, func(acc, n int) int { return acc + n })
// 6
```

### 4.2 泛型与接口结合

```go
type Adder[T any] interface {
    Add(T) T
}

func SumAll[T Adder[T]](items []T) T {
    if len(items) == 0 {
        var zero T
        return zero
    }
    result := items[0]
    for _, item := range items[1:] {
        result = result.Add(item)
    }
    return result
}
```

## 5. 泛型类型

### 5.1 泛型结构体

```go
type Pair[T, U any] struct {
    First  T
    Second U
}

func NewPair[T, U any](first T, second U) Pair[T, U] {
    return Pair[T, U]{First: first, Second: second}
}

p := NewPair("name", 42)
fmt.Println(p.First, p.Second) // name 42
```

### 5.2 泛型栈

```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(v T) {
    s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    top := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return top, true
}

func (s *Stack[T]) Peek() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    return s.items[len(s.items)-1], true
}

func (s *Stack[T]) Len() int {
    return len(s.items)
}

// 使用
stack := Stack[int]{}
stack.Push(1)
stack.Push(2)
v, _ := stack.Pop() // 2
```

### 5.3 泛型 map

```go
type Map[K comparable, V any] struct {
    data map[K]V
}

func NewMap[K comparable, V any]() *Map[K, V] {
    return &Map[K, V]{data: make(map[K]V)}
}

func (m *Map[K, V]) Get(key K) (V, bool) {
    v, ok := m.data[key]
    return v, ok
}

func (m *Map[K, V]) Set(key K, value V) {
    m.data[key] = value
}

func (m *Map[K, V]) Delete(key K) {
    delete(m.data, key)
}

func (m *Map[K, V]) Keys() []K {
    keys := make([]K, 0, len(m.data))
    for k := range m.data {
        keys = append(keys, k)
    }
    return keys
}
```

### 5.4 泛型接口

```go
type Container[T any] interface {
    Add(T)
    Get() (T, bool)
    Size() int
}

type List[T any] []T

func (l *List[T]) Add(v T)      { *l = append(*l, v) }
func (l *List[T]) Get() (T, bool) {
    if len(*l) == 0 {
        var zero T
        return zero, false
    }
    return (*l)[0], true
}
func (l *List[T]) Size() int    { return len(*l) }

var c Container[int] = &List[int]{}
```

## 6. 类型推断

Go 编译器可以自动推断大部分类型参数，无需显式指定：

```go
func Map[T, U any](s []T, f func(T) U) []U

// 完整指定
result := Map[int, string]([]int{1, 2, 3}, func(n int) string {
    return strconv.Itoa(n)
})

// 类型推断（推荐）
result := Map([]int{1, 2, 3}, func(n int) string {
    return strconv.Itoa(n)
})

// 部分推断失败时需显式指定
// 例如：约束不够明确时
```

## 7. 标准库泛型包

### 7.1 slices 包

```go
import "slices"

nums := []int{3, 1, 4, 1, 5, 9}

// 排序
slices.Sort(nums)                       // [1 1 3 4 5 9]

// 搜索
idx := slices.Index(nums, 4)            // 3

// 包含
slices.Contains(nums, 5)                // true

// 二分查找（需先排序）
slices.BinarySearch(nums, 4)            // 3, true

// 比较
slices.Equal([]int{1, 2}, []int{1, 2})  // true

// 自定义比较排序
type Person struct {
    Name string
    Age  int
}
people := []Person{{"Alice", 30}, {"Bob", 25}}
slices.SortFunc(people, func(a, b Person) int {
    return cmp.Compare(a.Age, b.Age)
})

// 插入/删除
slices.Insert(nums, 2, 99)              // 在索引 2 插入
slices.Delete(nums, 1, 3)               // 删除 [1, 3) 范围

// 克隆
clone := slices.Clone(nums)

// 反转
slices.Reverse(nums)

// 去重（排序后）
slices.Sort(nums)
nums = slices.Compact(nums)
```

### 7.2 maps 包

```go
import "maps"

m := map[string]int{"a": 1, "b": 2, "c": 3}

// 获取所有键
keys := maps.Keys(m)     // []string{"a", "b", "c"}（顺序不确定）

// 获取所有值
vals := maps.Values(m)   // []int{1, 2, 3}

// 克隆
clone := maps.Clone(m)

// 复制
dst := map[string]int{}
maps.Copy(dst, m)

// 删除满足条件的元素
maps.DeleteFunc(m, func(k string, v int) bool {
    return v < 2
})
// m = {"b": 2, "c": 3}

// 相等比较
maps.Equal(map[string]int{"a": 1}, map[string]int{"a": 1}) // true
```

### 7.3 cmp 包

```go
import "cmp"

// 比较有序类型
cmp.Compare(3, 5)     // -1（a < b）
cmp.Compare(5, 3)     // 1 （a > b）
cmp.Compare(3, 3)     // 0 （a == b）
cmp.Compare("abc", "xyz") // -1

// 比较有序类型（返回布尔）
cmp.Less(3, 5)        // true
cmp.Less("b", "a")    // false

// Ordered 约束
func Min[T cmp.Ordered](a, b T) T {
    if cmp.Less(a, b) {
        return a
    }
    return b
}
```

## 8. 泛型实际应用

### 8.1 泛型缓存

```go
type Cache[K comparable, V any] struct {
    data map[K]V
    mu   sync.RWMutex
}

func NewCache[K comparable, V any]() *Cache[K, V] {
    return &Cache[K, V]{data: make(map[K]V)}
}

func (c *Cache[K, V]) Get(key K) (V, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.data[key]
    return v, ok
}

func (c *Cache[K, V]) Set(key K, value V) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.data[key] = value
}

// 使用
userCache := NewCache[string, *User]()
userCache.Set("alice", &User{Name: "Alice"})
user, ok := userCache.Get("alice")
```

### 8.2 泛型结果类型

```go
type Result[T any] struct {
    Value T
    Err   error
}

func Ok[T any](v T) Result[T] {
    return Result[T]{Value: v}
}

func Err[T any](err error) Result[T] {
    return Result[T]{Err: err}
}

func (r Result[T]) IsOk() bool    { return r.Err == nil }
func (r Result[T]) IsErr() bool   { return r.Err != nil }
func (r Result[T]) Unwrap() T {
    if r.Err != nil {
        panic(r.Err)
    }
    return r.Value
}

func (r Result[T]) UnwrapOr(defaultVal T) T {
    if r.Err != nil {
        return defaultVal
    }
    return r.Value
}

// 使用
func fetchData(url string) Result[string] {
    resp, err := http.Get(url)
    if err != nil {
        return Err[string](err)
    }
    defer resp.Body.Close()
    data, err := io.ReadAll(resp.Body)
    if err != nil {
        return Err[string](err)
    }
    return Ok(string(data))
}

result := fetchData("https://api.example.com")
if result.IsOk() {
    fmt.Println(result.Value)
}
```

### 8.3 泛型注意事项

```go
// 1. 不支持方法泛型
type Container[T any] struct{ data T }
// func (c Container[T]) Do[S any](v S) {} // 编译错误

// 解决方案：使用泛型函数
func Do[T, S any](c Container[T], v S) {}

// 2. 不支持泛型断言
// var x any = 42
// _ = x.(T) // 编译错误

// 3. 零值获取
func Zero[T any]() T {
    var zero T
    return zero
}

// 4. Go 1.24+ 泛型类型别名
type Set[T comparable] = map[T]struct{}
type OrderedMap[K comparable, V cmp.Ordered] = map[K]V
```
