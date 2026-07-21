# Go 数据结构

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 数组声明

**基本写法：固定长度数组**
`var <变量名> [<长度>]<类型>`
```go
// 声明长度为 5 的 int 数组
var a [5]int;
```

**基本写法：字面量初始化数组**
`[<长度>]<类型>{ ... }`
```go
// 字面量初始化
b := [3]string{"Go", "Rust", "C"};
```

**基本写法：自动推断长度数组**
`[...]<类型>{ ... }`
```go
// 编译器推断长度为 4
c := [...]int{1, 2, 3, 4};
```

**基本写法：指定索引初始化**
`[<长度>]<类型>{ <索引>: <值> }`
```go
// 索引 1 和 3 赋值，其余为零值
d := [5]int{1: 10, 3: 30};
```

---

## 数组操作

**基本写法：访问数组元素**
`<数组>[<索引>]`
```go
// 访问数组元素
arr := [5]int{10, 20, 30, 40, 50};
fmt.Println(arr[0]);
```

**基本写法：修改数组元素**
`<数组>[<索引>] = <值>`
```go
// 修改数组元素
arr[0] = 100;
```

**基本写法：遍历数组**
`for <索引>, <值> := range <数组> { ... }`
```go
// 遍历数组
for i, v := range arr {
    fmt.Printf("arr[%d] = %d\n", i, v);
}
```

---

## 切片创建

**基本写法：nil 切片**
`var <变量名> []<类型>`
```go
// nil 切片
var s []int;
```

**基本写法：字面量切片**
`[]<类型>{ ... }`
```go
// 切片字面量
s1 := []int{1, 2, 3};
```

**基本写法：make 创建切片（指定长度）**
`make([]<类型>, <长度>)`
```go
// 长度 5，容量 5
s2 := make([]int, 5);
```

**基本写法：make 创建切片（指定长度和容量）**
`make([]<类型>, <长度>, <容量>)`
```go
// 长度 0，容量 10
s3 := make([]int, 0, 10);
```

**基本写法：从数组切片**
`<数组>[<起始>:<结束>]`
```go
// 左闭右开区间
arr := [5]int{10, 20, 30, 40, 50};
s4 := arr[1:4]; // [20 30 40]
```

**基本写法：从数组头部切片**
`<数组>[:<结束>]`
```go
// 从头到索引 3
s5 := arr[:3]; // [10 20 30]
```

**基本写法：从数组尾部切片**
`<数组>[<起始>:]`
```go
// 从索引 2 到末尾
s6 := arr[2:]; // [30 40 50]
```

---

## 切片操作

**基本写法：追加单个元素**
`append(<切片>, <元素>)`
```go
// 追加单个元素
s = append(s, 6);
```

**基本写法：追加多个元素**
`append(<切片>, <元素1>, <元素2>, <元素3>)`
```go
// 追加多个元素
s = append(s, 7, 8, 9);
```

**基本写法：追加切片**
`append(<切片>, <另一切片>...)`
```go
// 追加另一个切片
other := []int{10, 11};
s = append(s, other...);
```

**基本写法：复制切片**
`copy(<目标>, <源>)`
```go
// 复制切片内容
src := []int{1, 2, 3};
dst := make([]int, len(src));
copy(dst, src);
```

**基本写法：删除元素（不保序）**
`<切片>[<索引>] = <切片>[len(<切片>)-1]`
```go
// 删除索引 2，不保序
s := []int{1, 2, 3, 4, 5};
s[2] = s[len(s)-1];
s = s[:len(s)-1];
```

**基本写法：删除元素（保序）**
`append(<切片>[:<索引>], <切片>[<索引>+1:]...)`
```go
// 删除索引 2，保序
s = append(s[:2], s[3:]...);
```

**基本写法：三索引切片**
`<切片>[<起始>:<结束>:<容量>]`
```go
// 限制容量，append 触发扩容不影响原切片
b := a[1:3:3];
```

---

## Map 创建

**基本写法：make 创建 Map**
`make(map[<键类型>]<值类型>)`
```go
// 创建空 map
m1 := make(map[string]int);
```

**单行写法：字面量创建 Map**
`map[<键类型>]<值类型>{ <键1>: <值1>, <键2>: <值2> }`
```go
// 单行字面量初始化
m2 := map[string]int{ "apple": 5, "banana": 3 };
```

**换行写法：字面量创建 Map**
`map[<键类型>]<值类型>{ ... }`
```go
// 换行书写字面量初始化
m2 := map[string]int{
    "apple":  5,
    "banana": 3,
};
```

**基本写法：预分配容量 Map**
`make(map[<键类型>]<值类型>, <容量>)`
```go
// 预分配约 1000 个键的空间
m := make(map[string]int, 1000);
```

---

## Map 操作

**基本写法：添加/修改**
`<map>[<键>] = <值>`
```go
// 添加或修改
m1["one"] = 1;
```

**基本写法：获取值**
`<值> := <map>[<键>]`
```go
// 获取值（不存在返回零值）
v := m1["one"];
```

**基本写法：检查键是否存在**
`<值>, <ok> := <map>[<键>]`
```go
// 检查键是否存在
v, ok := m2["orange"];
if !ok {
    fmt.Println("orange 不存在");
}
```

**基本写法：删除键**
`delete(<map>, <键>)`
```go
// 删除键
delete(m1, "one");
```

**基本写法：遍历 Map**
`for <键>, <值> := range <map> { ... }`
```go
// 遍历 map
for k, v := range m2 {
    fmt.Printf("%s: %d\n", k, v);
}
```

---

## 结构体定义

**基本写法：结构体声明**
`type <类型名> struct { ... }`
```go
// 定义结构体
type User struct {
    ID    int;
    Name  string;
    Email string;
    Age   int;
}
```

**基本写法：按字段名初始化**
`<类型>{ <字段>: <值> }`
```go
// 按字段名初始化
u1 := User{ID: 1, Name: "Alice", Email: "alice@example.com", Age: 30};
```

**基本写法：部分初始化**
`<类型>{ <字段>: <值> }`
```go
// 部分初始化，其余为零值
u3 := User{Name: "Charlie"};
```

**基本写法：指针结构体**
`&<类型>{ ... }`
```go
// 创建结构体指针
p := &User{Name: "Dave"};
fmt.Println(p.Name);
```

---

## 结构体嵌入与组合

**基本写法：匿名嵌入**
`type <类型> struct { <嵌入类型>; ... }`
```go
// 匿名嵌入实现组合
type Employee struct {
    User;              // 字段提升
    Address;           // 字段提升
    Department string;
}
```

**基本写法：访问嵌入字段**
`<实例>.<字段>`
```go
// 直接访问嵌入字段
e := Employee{User: User{Name: "Alice"}, Department: "Engineering"};
fmt.Println(e.Name);
```

---

## 结构体标签

**基本写法：字段标签**
`` <字段> <类型> `<标签>: "<值>"` ``
```go
// 使用 json 和 validate 标签
type User struct {
    ID    int    `json:"id" db:"user_id"`;
    Name  string `json:"name" validate:"required,min=2"`;
    Pass  string `json:"-" validate:"min=8"`;
}
```

**基本写法：读取标签**
`<字段>.Tag.Get("<标签名>")`
```go
// 通过反射读取标签
t := reflect.TypeOf(User{});
field, _ := t.FieldByName("Name");
fmt.Println(field.Tag.Get("json"));
```

---

## JSON 序列化

**基本写法：序列化**
`json.Marshal(<结构体>)`
```go
// 结构体转 JSON
r := Response{Code: 200, Message: "OK"};
bytes, err := json.Marshal(r);
```

**基本写法：格式化序列化**
`json.MarshalIndent(<结构体>, "", "  ")`
```go
// 格式化输出 JSON
pretty, _ := json.MarshalIndent(r, "", "  ");
```

**基本写法：反序列化**
`json.Unmarshal(<字节>, &<结构体>)`
```go
// JSON 转结构体
jsonStr := `{"code":404,"message":"Not Found"}`;
var resp Response;
err := json.Unmarshal([]byte(jsonStr), &resp);
```

---

## 结构体比较

**基本写法：可比较结构体**
`<结构体1> == <结构体2>`
```go
// 所有字段可比较的结构体
type Point struct{ X, Y int };
p1 := Point{1, 2};
p2 := Point{1, 2};
fmt.Println(p1 == p2); // true
```

---

## 结构体内存布局

**基本写法：未优化布局**
`type <类型> struct { ... }`
```go
// 优化前：24 字节
type Bad struct {
    A bool;    // 1 + 7 padding
    B int64;   // 8
    C int32;   // 4 + 4 padding
}
```

**基本写法：优化后布局**
`type <类型> struct { ... }`
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
