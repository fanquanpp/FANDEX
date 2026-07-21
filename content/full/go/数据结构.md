---
order: 4
title: 'Go 数据结构'
module: go
category: Go
difficulty: intermediate
description: '数组、切片底层原理、map 底层实现、struct、嵌套与组合、标签与 JSON 序列化。'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/基础语法
  - go/函数与方法
  - go/接口与组合
  - go/并发编程
prerequisites: []
---

## 1. 数组

### 1.1 数组基础

数组是固定长度的同类型元素序列，长度是类型的一部分：

```go
// 声明与初始化
var a [5]int                    // [0 0 0 0 0]
b := [3]string{"Go", "Rust", "C"} // [Go Rust C]
c := [...]int{1, 2, 3, 4}      // 编译器推断长度 [4]int

// 指定索引初始化
d := [5]int{1: 10, 3: 30}      // [0 10 0 30 0]

// [3]int 和 [5]int 是不同类型
// var x [3]int = [5]int{} // 编译错误
```

### 1.2 数组操作

```go
arr := [5]int{10, 20, 30, 40, 50}

// 访问与修改
fmt.Println(arr[0])  // 10
arr[0] = 100

// 遍历
for i := 0; i < len(arr); i++ {
    fmt.Println(arr[i])
}
for i, v := range arr {
    fmt.Printf("arr[%d] = %d\n", i, v)
}

// 数组是值类型（赋值和传参会拷贝）
a := [3]int{1, 2, 3}
b := a       // 完整拷贝
b[0] = 100
fmt.Println(a[0]) // 1（不受影响）
```

> **实际使用**：Go 中数组使用较少，大多数场景使用切片。

## 2. 切片（Slice）

### 2.1 切片基础

切片是对数组的动态视图，是 Go 中最常用的数据结构：

```go
// 创建切片
var s []int                          // nil 切片
s1 := []int{1, 2, 3}                // 切片字面量
s2 := make([]int, 5)                // 长度 5，容量 5
s3 := make([]int, 0, 10)            // 长度 0，容量 10

// 从数组切片
arr := [5]int{10, 20, 30, 40, 50}
s4 := arr[1:4]  // [20 30 40]（左闭右开）
s5 := arr[:3]   // [10 20 30]
s6 := arr[2:]   // [30 40 50]
s7 := arr[:]    // [10 20 30 40 50]
```

### 2.2 切片底层结构

切片在运行时由 `runtime.slice` 结构表示：

```
┌─────────┬──────────┬──────────────┐
│  ptr    │   len    │    cap       │
│ (指针)  │  (长度)   │   (容量)     │
└────┬────┴──────────┴──────────────┘
     │
     ▼
┌────┬────┬────┬────┬────┬────┐
│ 10 │ 20 │ 30 │ 40 │ 50 │    │  ← 底层数组
└────┴────┴────┴────┴────┴────┘
  [0]  [1]  [2]  [3]  [4]

s := arr[1:4]  → ptr 指向 arr[1], len=3, cap=4
```

```go
s := make([]int, 3, 6)
fmt.Println(len(s)) // 3
fmt.Println(cap(s)) // 6

// 切片共享底层数组
arr := [5]int{10, 20, 30, 40, 50}
s1 := arr[1:3] // [20 30]
s2 := arr[2:5] // [30 40 50]

s1[1] = 99
fmt.Println(s2[0]) // 99（共享底层数组！）
```

### 2.3 切片操作

```go
s := []int{1, 2, 3, 4, 5}

// 追加元素（可能触发扩容）
s = append(s, 6)           // [1 2 3 4 5 6]
s = append(s, 7, 8, 9)    // [1 2 3 4 5 6 7 8 9]

// 追加另一个切片
other := []int{10, 11}
s = append(s, other...)    // [1 2 3 4 5 6 7 8 9 10 11]

// 复制切片
src := []int{1, 2, 3}
dst := make([]int, len(src))
copy(dst, src)

// 删除元素
s = []int{1, 2, 3, 4, 5}
// 删除索引 2（不保序，高效）
s[2] = s[len(s)-1]
s = s[:len(s)-1] // [1 2 5 4]

// 删除索引 2（保序）
s = append(s[:2], s[3:]...) // [1 2 4 5]

// 插入元素
s = []int{1, 2, 4, 5}
s = append(s[:2], append([]int{3}, s[2:]...)...) // [1 2 3 4 5]
```

### 2.4 扩容机制

当 `append` 导致容量不足时，Go 会分配更大的底层数组：

```go
// Go 1.18+ 扩容策略：
// 1. 如果新容量 > 2 * 旧容量 → 使用新容量
// 2. 如果旧容量 < 256 → 新容量 = 2 * 旧容量
// 3. 如果旧容量 >= 256 → 新容量 = 旧容量 + 旧容量/4 + 192
//    （约 1.25x 增长，加上常数项平滑小切片的增长）
```

> **最佳实践**：预知大小时使用 `make([]T, 0, n)` 预分配容量，避免频繁扩容。

### 2.5 切片陷阱

```go
// 陷阱 1：切片引用导致内存不释放
func loadData() []byte {
    data := make([]byte, 1024*1024) // 1MB
    readFull(data)
    return data[:100] // 底层 1MB 数组不会被 GC！
}
// 修复：拷贝需要的部分
func loadDataFixed() []byte {
    data := make([]byte, 1024*1024)
    readFull(data)
    result := make([]byte, 100)
    copy(result, data[:100])
    return result
}

// 陷阱 2：append 可能修改共享底层数组
a := []int{1, 2, 3, 4, 5}
b := a[1:3]       // [2 3], cap=4
b = append(b, 99) // a 变为 [1 2 3 99 5]！
// 修复：使用三索引切片限制容量
b := a[1:3:3]     // len=2, cap=2
b = append(b, 99) // 触发扩容，a 不受影响
```

## 3. Map

### 3.1 Map 基础

```go
// 创建 map
var m map[string]int         // nil map（不能写入！）
m1 := make(map[string]int)   // 空 map
m2 := map[string]int{        // 字面量
    "apple":  5,
    "banana": 3,
}

// 增删改查
m1["one"] = 1                // 添加/修改
v := m1["one"]               // 获取（不存在返回零值）
delete(m1, "one")            // 删除

// 检查键是否存在
v, ok := m2["orange"]
if !ok {
    fmt.Println("orange 不存在")
}

// 遍历（顺序不确定）
for k, v := range m2 {
    fmt.Printf("%s: %d\n", k, v)
}

// 长度
fmt.Println(len(m2)) // 2
```

### 3.2 Map 底层实现

Go map 基于**哈希表**实现，使用拉链法解决冲突：

```
┌─────────────────────────────────────────┐
│              hmap 结构                    │
├─────────────────────────────────────────┤
│  count     int      // 元素数量          │
│  B         uint8    // 桶数量 = 2^B      │
│  hash0     uint32   // 哈希种子          │
│  buckets   unsafe.Pointer // 桶数组      │
│  oldbuckets unsafe.Pointer // 扩容时旧桶 │
│  ...                                    │
└─────────────────────────────────────────┘

每个桶（bmap）存储 8 个键值对：
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ tophash[0-7]（哈希高 8 位，用于快速比较）  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  key0 │ key1 │ key2 │ key3 │ key4 │ key5 │ key6 │ key7 │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ val0 │ val1 │ val2 │ val3 │ val4 │ val5 │ val6 │ val7 │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ overflow pointer（溢出桶指针）            │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

**查找过程**：

1. 计算键的哈希值
2. 用低 B 位确定桶编号
3. 用高 8 位（tophash）在桶内快速比较
4. 匹配后比较完整键
5. 当前桶未找到则检查溢出桶

**扩容策略**：

- **等量扩容**：溢出桶过多时，重新排列使数据更紧凑
- **翻倍扩容**：负载因子超过 6.5 时，桶数量翻倍，渐进式迁移

### 3.3 Map 注意事项

```go
// 1. Map 不是并发安全的
// m := make(map[string]int)
// go func() { m["a"] = 1 }()
// go func() { _ = m["a"] }()  // 竞态！
// 使用 sync.Map 或加锁解决

// 2. Map 的零值是 nil，不能直接写入
var m map[string]int
// m["key"] = 1 // panic: assignment to entry in nil map
m = make(map[string]int)
m["key"] = 1 // OK

// 3. 不可取址
// _ = &m["key"] // 编译错误

// 4. float 类型作为键的精度问题
m := map[float64]string{}
m[1.0] = "one"
m[math.NaN()] = "not a number"
// NaN != NaN，导致无法正常删除

// 5. 预分配容量减少扩容
m := make(map[string]int, 1000) // 预分配约 1000 个键的空间
```

### 3.4 Go 1.24+ Map 迭代改进

Go 1.24 引入了 `maps.All`、`maps.Keys`、`maps.Values` 等迭代器函数：

```go
import "maps"

m := map[string]int{"a": 1, "b": 2, "c": 3}

// 使用迭代器遍历
for k, v := range maps.All(m) {
    fmt.Println(k, v)
}

// 获取有序键
keys := slices.Sorted(maps.Keys(m))
```

## 4. 结构体（Struct）

### 4.1 结构体定义

```go
type User struct {
    ID    int
    Name  string
    Email string
    Age   int
}

// 创建实例
u1 := User{ID: 1, Name: "Alice", Email: "alice@example.com", Age: 30}
u2 := User{1, "Bob", "bob@example.com", 25} // 按字段顺序（不推荐）
u3 := User{Name: "Charlie"}                  // 部分初始化，其余为零值

// 访问字段
fmt.Println(u1.Name) // Alice

// 指针结构体
p := &User{Name: "Dave"}
fmt.Println(p.Name) // Dave（自动解引用）
```

### 4.2 嵌入与组合

Go 通过结构体嵌入实现类似继承的组合效果：

```go
type Address struct {
    City    string
    Country string
}

type Employee struct {
    User              // 匿名嵌入（继承字段和方法）
    Address           // 匿名嵌入
    Department string // 自有字段
}

e := Employee{
    User:       User{Name: "Alice", Age: 30},
    Address:    Address{City: "Beijing", Country: "China"},
    Department: "Engineering",
}

// 直接访问嵌入字段（字段提升）
fmt.Println(e.Name)    // Alice（提升自 User）
fmt.Println(e.City)    // Beijing（提升自 Address）

// 也可以显式访问
fmt.Println(e.User.Name)     // Alice
fmt.Println(e.Address.City)  // Beijing
```

### 4.3 字段冲突

```go
type A struct{ Name string }
type B struct{ Name string }

type C struct {
    A
    B
}

c := C{A: A{Name: "from A"}, B: B{Name: "from B"}}
// fmt.Println(c.Name) // 编译错误：歧义
fmt.Println(c.A.Name) // from A（必须显式指定）
```

### 4.4 结构体标签（Tag）

标签是附加在字段上的元数据，通过反射读取：

```go
type User struct {
    ID    int    `json:"id" db:"user_id"`
    Name  string `json:"name" validate:"required,min=2"`
    Email string `json:"email" validate:"required,email"`
    Pass  string `json:"-" validate:"min=8"` // json:"-" 表示忽略
}

// 读取标签
t := reflect.TypeOf(User{})
field, _ := t.FieldByName("Name")
fmt.Println(field.Tag.Get("json"))     // "name"
fmt.Println(field.Tag.Get("validate")) // "required,min=2"
```

### 4.5 JSON 序列化

```go
type Response struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    any         `json:"data,omitempty"` // omitempty: 零值时省略
    Debug   string      `json:"-"`              // 永远忽略
}

// 序列化（结构体 → JSON）
r := Response{Code: 200, Message: "OK", Data: []string{"a", "b"}}
bytes, err := json.Marshal(r)
fmt.Println(string(bytes)) // {"code":200,"message":"OK","data":["a","b"]}

// 格式化输出
pretty, _ := json.MarshalIndent(r, "", "  ")
fmt.Println(string(pretty))

// 反序列化（JSON → 结构体）
jsonStr := `{"code":404,"message":"Not Found"}`
var resp Response
err = json.Unmarshal([]byte(jsonStr), &resp)
fmt.Println(resp.Code, resp.Message) // 404 Not Found

// 动态 JSON
var data map[string]any
json.Unmarshal([]byte(`{"key":123}`), &data)
fmt.Println(data["key"]) // float64(123)
```

### 4.6 结构体比较

```go
// 如果所有字段都可比较，结构体就可比较
type Point struct{ X, Y int }

p1 := Point{1, 2}
p2 := Point{1, 2}
fmt.Println(p1 == p2) // true

// 包含不可比较字段（slice/map/func）的结构体不可比较
type Bad struct {
    Data []int // 不可比较
}
// _ = Bad{} == Bad{} // 编译错误
```

### 4.7 结构体内存布局

```go
type Example struct {
    A bool    // 1 字节
    B int64   // 8 字节
    C int32   // 4 字节
}

// 未优化：A(1) + 7 padding + B(8) + C(4) + 4 padding = 24 字节
// 优化后：B(8) + C(4) + A(1) + 3 padding = 16 字节

type Optimized struct {
    B int64   // 8 字节
    C int32   // 4 字节
    A bool    // 1 字节
}

fmt.Println(unsafe.Sizeof(Example{}))    // 24
fmt.Println(unsafe.Sizeof(Optimized{}))  // 16
```

> **建议**：性能敏感场景，将字段按大小从大到小排列以减少填充。
