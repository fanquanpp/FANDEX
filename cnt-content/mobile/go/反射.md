# Go 反射

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 反射基础

**基本写法：获取反射类型**
`reflect.TypeOf(<值>)`
```go
// 获取类型的反射对象
t := reflect.TypeOf(42);
fmt.Println(t); // int
```

**基本写法：获取反射值**
`reflect.ValueOf(<值>)`
```go
// 获取值的反射对象
v := reflect.ValueOf(42);
fmt.Println(v); // 42
```

**基本写法：获取值的类型**
`<反射值>.Type()`
```go
// 从 Value 获取 Type
t := v.Type();
```

---

## Kind 判断

**基本写法：获取 Kind**
`<反射类型>.Kind()`
```go
// 获取类型的 Kind
t := reflect.TypeOf("hello");
if t.Kind() == reflect.String {
    fmt.Println("string type");
}
```

**基本写法：Kind 常量**
`reflect.<Kind>`
```go
// Kind 常量判断
switch t.Kind() {
case reflect.Int, reflect.Int64:
    fmt.Println("integer");
case reflect.String:
    fmt.Println("string");
case reflect.Struct:
    fmt.Println("struct");
}
```

---

## 值修改

**基本写法：获取可设置值**
`reflect.ValueOf(&<变量>).Elem()`
```go
// 传入指针才能修改值
x := 42;
v := reflect.ValueOf(&x).Elem();
v.SetInt(100);
fmt.Println(x); // 100
```

**基本写法：检查可设置性**
`<反射值>.CanSet()`
```go
// 检查值是否可设置
if v.CanSet() {
    v.SetInt(100);
}
```

---

## Struct 反射

**基本写法：获取字段数量**
`<反射类型>.NumField()`
```go
// 获取结构体字段数量
t := reflect.TypeOf(User{});
count := t.NumField();
```

**基本写法：按索引获取字段**
`<反射类型>.Field(<索引>)`
```go
// 按索引获取字段信息
field := t.Field(0);
fmt.Println(field.Name, field.Type);
```

**基本写法：按名称获取字段**
`<反射类型>.FieldByName("<名称>")`
```go
// 按名称获取字段信息
field, ok := t.FieldByName("Name");
if ok {
    fmt.Println(field.Type);
}
```

**基本写法：获取字段标签**
`<字段>.Tag.Get("<标签名>")`
```go
// 获取字段的 json 标签
field, _ := t.FieldByName("Name");
tag := field.Tag.Get("json");
```

**基本写法：遍历结构体字段**
`for <索引> := 0; <索引> < <数量>; <索引>++ { ... }`
```go
// 遍历结构体所有字段
for i := 0; i < t.NumField(); i++ {
    field := t.Field(i);
    fmt.Printf("%s: %s\n", field.Name, field.Type);
}
```

**基本写法：设置字段值**
`<反射值>.Field(<索引>).Set(<值>)`
```go
// 通过反射设置字段值
v := reflect.ValueOf(&user).Elem();
v.FieldByName("Name").SetString("Alice");
```

---

## Method 反射

**基本写法：获取方法数量**
`<反射类型>.NumMethod()`
```go
// 获取类型的方法数量
t := reflect.TypeOf(User{});
count := t.NumMethod();
```

**基本写法：按索引获取方法**
`<反射类型>.Method(<索引>)`
```go
// 按索引获取方法
m := t.Method(0);
fmt.Println(m.Name);
```

**基本写法：按名称获取方法**
`<反射类型>.MethodByName("<名称>")`
```go
// 按名称获取方法
m, ok := t.MethodByName("String");
```

**基本写法：调用方法**
`<反射值>.Method(<索引>).Call(<参数>)`
```go
// 通过反射调用方法
v := reflect.ValueOf(user);
result := v.Method(0).Call(nil);
```

---

## 函数反射

**基本写法：调用函数**
`<反射值>.Call(<参数>)`
```go
// 通过反射调用函数
fn := func(a, b int) int { return a + b };
v := reflect.ValueOf(fn);
result := v.Call([]reflect.Value{
    reflect.ValueOf(1),
    reflect.ValueOf(2),
});
```

---

## Slice 与 Map 反射

**基本写法：创建切片**
`reflect.MakeSlice(<类型>, <长度>, <容量>)`
```go
// 通过反射创建切片
t := reflect.TypeOf([]int{});
s := reflect.MakeSlice(t, 0, 10);
```

**基本写法：追加元素**
`<反射值>.Set(reflect.Append(<切片>, <值>))`
```go
// 通过反射追加元素
v := reflect.ValueOf(&s).Elem();
v.Set(reflect.Append(v, reflect.ValueOf(42)));
```

**基本写法：创建 Map**
`reflect.MakeMap(<类型>)`
```go
// 通过反射创建 map
t := reflect.TypeOf(map[string]int{});
m := reflect.MakeMap(t);
```

**基本写法：设置 Map 键值**
`<反射值>.SetMapIndex(<键>, <值>)`
```go
// 通过反射设置 map 键值
m.SetMapIndex(reflect.ValueOf("key"), reflect.ValueOf(42));
```

---

## 接口转换

**基本写法：获取接口值**
`<反射值>.Interface()`
```go
// 从反射值获取接口值
v := reflect.ValueOf(42);
i := v.Interface();
n := i.(int);
```

---

## 类型判断

**基本写法：判断是否实现接口**
`<反射类型>.Implements(<接口类型>)`
```go
// 检查类型是否实现 Stringer 接口
t := reflect.TypeOf(User{});
stringerType := reflect.TypeOf((*fmt.Stringer)(nil)).Elem();
if t.Implements(stringerType) {
    fmt.Println("implements Stringer");
}
```

**基本写法：判断可赋值性**
`<反射类型>.AssignableTo(<目标类型>)`
```go
// 检查类型是否可赋值
t1 := reflect.TypeOf(int(0));
t2 := reflect.TypeOf(int64(0));
ok := t1.AssignableTo(t2);
```
