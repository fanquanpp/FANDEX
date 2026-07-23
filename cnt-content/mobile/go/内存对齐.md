# Go 内存对齐

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本类型大小

**基本写法：获取基本类型大小**
`unsafe.Sizeof(<变量>)`
```go
// 基本类型大小
fmt.Println(unsafe.Sizeof(bool(false)));     // 1
fmt.Println(unsafe.Sizeof(int8(0)));         // 1
fmt.Println(unsafe.Sizeof(int16(0)));        // 2
fmt.Println(unsafe.Sizeof(int32(0)));        // 4
fmt.Println(unsafe.Sizeof(int64(0)));        // 8
fmt.Println(unsafe.Sizeof(float64(0)));      // 8
fmt.Println(unsafe.Sizeof(string("")));     // 16
fmt.Println(unsafe.Sizeof(int(0)));          // 8
```

---

## 对齐边界

**基本写法：获取对齐边界**
`unsafe.Alignof(<变量>)`
```go
// 基本类型的对齐边界
fmt.Println(unsafe.Alignof(bool(false)));    // 1
fmt.Println(unsafe.Alignof(int8(0)));       // 1
fmt.Println(unsafe.Alignof(int16(0)));      // 2
fmt.Println(unsafe.Alignof(int32(0)));      // 4
fmt.Println(unsafe.Alignof(int64(0)));      // 8
fmt.Println(unsafe.Alignof(float64(0)));    // 8
```

---

## 结构体对齐

**基本写法：未优化布局**
`type <类型名> struct { ... }`
```go
// 优化前：24 字节
type Bad struct {
    A bool;    // 1 + 7 padding
    B int64;   // 8
    C int32;   // 4 + 4 padding
}
```

**基本写法：优化后布局**
`type <类型名> struct { ... }`
```go
// 优化后：16 字节
type Optimized struct {
    B int64;   // 8
    C int32;   // 4
    A bool;    // 1 + 3 padding
}
```

**基本写法：查看结构体大小**
`unsafe.Sizeof(<结构体>{})`
```go
// 查看结构体大小
fmt.Println(unsafe.Sizeof(Bad{}));       // 24
fmt.Println(unsafe.Sizeof(Optimized{})); // 16
```

---

## 字段偏移量

**基本写法：获取字段偏移量**
`unsafe.Offsetof(<结构体>.<字段>)`
```go
// 获取字段偏移量
type User struct {
    ID   int;
    Name string;
}
fmt.Println(unsafe.Offsetof(User{}.ID));   // 0
fmt.Println(unsafe.Offsetof(User{}.Name)); // 8
```

---

## 对齐计算

**基本写法：计算对齐填充**
`(<偏移> + <对齐> - 1) &^ (<对齐> - 1)`
```go
// 计算对齐后的偏移量
offset := 3;
align := 8;
aligned := (offset + align - 1) &^ (align - 1);
fmt.Println(aligned); // 8
```

---

## 空结构体

**基本写法：空结构体大小**
`unsafe.Sizeof(struct{}{})`
```go
// 空结构体大小为 0
fmt.Println(unsafe.Sizeof(struct{}{})); // 0
```

**基本写法：空结构体作为字段**
`type <类型名> struct { ... }`
```go
// 空结构体作为最后一个字段
type S struct {
    A int;
    _ struct{};
}
```

---

## 结构体嵌入对齐

**基本写法：嵌入结构体对齐**
`type <类型名> struct { <嵌入类型>; ... }`
```go
// 嵌入结构体的对齐
type Inner struct {
    X int64;
}

type Outer struct {
    A bool;
    Inner;
    B int32;
}
```

---

## 切片与字符串对齐

**基本写法：切片大小**
`unsafe.Sizeof(<切片>)`
```go
// 切片大小为 24（指针+len+cap）
s := []int{1, 2, 3};
fmt.Println(unsafe.Sizeof(s)); // 24
```

**基本写法：字符串大小**
`unsafe.Sizeof(<字符串>)`
```go
// 字符串大小为 16（指针+len）
str := "hello";
fmt.Println(unsafe.Sizeof(str)); // 16
```

---

## 指针大小

**基本写法：指针大小**
`unsafe.Sizeof(&<变量>)`
```go
// 64 位系统指针大小为 8
x := 42;
fmt.Println(unsafe.Sizeof(&x)); // 8
```

**基本写法：map 大小**
`unsafe.Sizeof(<map>)`
```go
// map 是指针类型，大小为 8
m := map[string]int{};
fmt.Println(unsafe.Sizeof(m)); // 8
```

---

## 64 位原子操作对齐

**基本写法：原子操作对齐要求**
`type <类型名> struct { ... }`
```go
// 64 位原子操作要求 8 字节对齐
type Counter struct {
    _ [56]byte; // padding 确保 64 位对齐
    n int64;
}
```

**基本写法：使用 atomic.Int64**
`type <类型名> struct { ... }`
```go
// Go 1.19+ 使用 atomic 类型自动对齐
type Counter struct {
    n atomic.Int64;
}
```

---

## 内存对齐优化

**基本写法：按大小降序排列**
`type <类型名> struct { ... }`
```go
// 按字段大小降序排列减少 padding
type Optimized struct {
    B int64;   // 8
    C int32;   // 4
    A bool;    // 1 + 3 padding
}
```

**基本写法：手动 padding**
`type <类型名> struct { ... }`
```go
// 手动添加 padding
type Padded struct {
    A bool;
    _ [7]byte; // 显式 padding
    B int64;
}
```

---

## 内存对齐验证

**基本写法：验证对齐**
`unsafe.Alignof(<结构体>{})`
```go
// 验证结构体对齐
type S struct {
    A bool;
    B int64;
}
fmt.Println(unsafe.Alignof(S{})); // 8
```

**基本写法：验证偏移**
`unsafe.Offsetof(<结构体>.<字段>)`
```go
// 验证字段偏移
type S struct {
    A bool;
    B int64;
}
fmt.Println(unsafe.Offsetof(S{}.B)); // 8
```
