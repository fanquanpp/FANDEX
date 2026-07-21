# Go unsafe 与指针

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## unsafe.Pointer

**基本写法：获取指针**
`unsafe.Pointer(&<变量>)`
```go
// 获取变量的 unsafe.Pointer
x := 42;
p := unsafe.Pointer(&x);
```

**基本写法：指针转换回普通指针**
`(*<类型>)(unsafe.Pointer(&<变量>))`
```go
// 转换回 *int
pInt := (*int)(p);
```

---

## 指针类型转换

**基本写法：int 转 float64**
`*(*<目标类型>)(unsafe.Pointer(&<变量>))`
```go
// 将 int 的位模式解释为 float64
var i int64 = 0x400921FB54442D18;
f := *(*float64)(unsafe.Pointer(&i));
fmt.Println(f); // 3.141592653589793
```

**基本写法：float64 转 int**
`*(*<目标类型>)(unsafe.Pointer(&<变量>))`
```go
// 将 float64 的位模式解释为 int64
var f = 3.14;
i := *(*int64)(unsafe.Pointer(&f));
```

**基本写法：[]byte 转 string**
`*(*string)(unsafe.Pointer(&<切片>))`
```go
// 零拷贝将 []byte 转为 string
b := []byte("hello");
s := *(*string)(unsafe.Pointer(&b));
```

---

## unsafe.Sizeof

**基本写法：获取变量大小**
`unsafe.Sizeof(<变量>)`
```go
// 获取 int 类型大小
fmt.Println(unsafe.Sizeof(int(0))); // 8
```

**基本写法：获取结构体大小**
`unsafe.Sizeof(<结构体>{})`
```go
// 获取结构体大小
type Point struct{ X, Y int };
fmt.Println(unsafe.Sizeof(Point{})); // 16
```

---

## unsafe.Offsetof

**基本写法：获取字段偏移量**
`unsafe.Offsetof(<结构体>.<字段>)`
```go
// 获取字段在结构体中的偏移量
type User struct {
    ID   int;
    Name string;
}
fmt.Println(unsafe.Offsetof(User{}.ID));   // 0
fmt.Println(unsafe.Offsetof(User{}.Name)); // 8
```

---

## unsafe.Alignof

**基本写法：获取对齐边界**
`unsafe.Alignof(<变量>)`
```go
// 获取类型的对齐边界
fmt.Println(unsafe.Alignof(int64(0))); // 8
```

**基本写法：获取结构体对齐**
`unsafe.Alignof(<结构体>{})`
```go
// 获取结构体的对齐边界
type S struct {
    A bool;
    B int64;
}
fmt.Println(unsafe.Alignof(S{})); // 8
```

---

## 指针运算

**基本写法：指针加法**
`unsafe.Pointer(uintptr(<指针>) + <偏移>)`
```go
// 指针偏移访问数组元素
arr := [3]int{10, 20, 30};
p := unsafe.Pointer(&arr[0]);
p2 := unsafe.Pointer(uintptr(p) + unsafe.Sizeof(arr[0]));
fmt.Println(*(*int)(p2)); // 20
```

**基本写法：uintptr 转换**
`uintptr(unsafe.Pointer(&<变量>))`
```go
// 转换为 uintptr 用于指针运算
addr := uintptr(unsafe.Pointer(&x));
```

---

## SliceHeader

**基本写法：获取 SliceHeader**
`(*reflect.SliceHeader)(unsafe.Pointer(&<切片>))`
```go
// 获取切片的底层结构
s := []int{1, 2, 3};
header := (*reflect.SliceHeader)(unsafe.Pointer(&s));
fmt.Println(header.Len);    // 3
fmt.Println(header.Cap);    // 3
```

---

## StringHeader

**基本写法：获取 StringHeader**
`(*reflect.StringHeader)(unsafe.Pointer(&<字符串>))`
```go
// 获取字符串的底层结构
s := "hello";
header := (*reflect.StringHeader)(unsafe.Pointer(&s));
fmt.Println(header.Len); // 5
```

---

## 零拷贝转换

**基本写法：string 转 []byte**
`*(*[]byte)(unsafe.Pointer(&<字符串变量>))`
```go
// 零拷贝 string 转 []byte
s := "hello";
b := *(*[]byte)(unsafe.Pointer(&s));
```

**基本写法：[]byte 转 string**
`*(*string)(unsafe.Pointer(&<切片变量>))`
```go
// 零拷贝 []byte 转 string
b := []byte("hello");
s := *(*string)(unsafe.Pointer(&b));
```

---

## 内存操作

**基本写法：内存拷贝**
`unsafe.Pointer(<目标>)`
```go
// 指针内存拷贝
src := [4]byte{1, 2, 3, 4};
var dst [4]byte;
copy(dst[:], src[:]);
```

---

## unsafe.Add

**基本写法：指针加法（Go 1.17+）**
`unsafe.Add(<指针>, <偏移>)`
```go
// Go 1.17+ 指针加法
arr := [3]int{10, 20, 30};
p := unsafe.Pointer(&arr[0]);
p2 := unsafe.Add(p, unsafe.Sizeof(arr[0]));
fmt.Println(*(*int)(p2)); // 20
```

---

## unsafe.Slice

**基本写法：从指针创建切片（Go 1.17+）**
`unsafe.Slice(<指针>, <长度>)`
```go
// Go 1.17+ 从指针创建切片
arr := [3]int{10, 20, 30};
p := &arr[0];
s := unsafe.Slice(p, 3);
fmt.Println(s); // [10 20 30]
```

---

## 注意事项

**基本写法：uintptr 不能作为指针存储**
`uintptr(unsafe.Pointer(&<变量>))`
```go
// uintptr 只是一个数值，GC 不视为指针
// 仅用于临时指针运算
addr := uintptr(unsafe.Pointer(&x));
```
