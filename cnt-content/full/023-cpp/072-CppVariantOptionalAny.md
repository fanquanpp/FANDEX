---
order: 720
title: C++ variant / optional / any
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ variant / optional / any 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## std::optional 可选值

**基本写法：构造 optional**
`std::optional<<类型>> <变量>;`
```cpp
// 表示可能存在也可能不存在的值，避免用裸指针或特殊值
std::optional<int> find_id(const std::string& name);
std::optional<int> oid = find_id("x");
```

---

**基本写法：构造有值**
`std::optional<<类型>>(<值>)`
```cpp
// 直接用值构造
std::optional<int> o(42);
auto o2 = std::make_optional(3.14); // 自动推导类型
```

---

**基本写法：判空**
`<optional>.has_value()`
```cpp
// 判断是否持有值
if (oid.has_value()) { std::cout << *oid; }
```

---

**基本写法：解引用取值**
`*<optional>` / `<optional>.value()`
```cpp
// value() 在空时抛 std::bad_optional_access，* 不检查
int a = *oid;
int b = oid.value();
```

---

**基本写法：取值或默认**
`<optional>.value_or(<默认值>)`
```cpp
// 为空时返回默认值
int id = oid.value_or(-1);
```

---

**基本写法：置空**
`<optional>.reset()` / `<optional> = std::nullopt`
```cpp
// 清空当前值
oid.reset();
oid = std::nullopt;
```

---

**基本写法：值存在时执行**
`<optional>.and_then(<函数>)`
```cpp
// C++23：值存在则应用函数返回新 optional，否则返回空
auto name = oid.and_then([](int i){ return std::optional<std::string>(std::to_string(i)); });
```

---

## std::variant 多值容器

**基本写法：定义 variant**
`std::variant<<类型>...> <变量>;`
```cpp
// 类型安全的联合体，同一时刻持有其一候选类型
std::variant<int, double, std::string> v;
```

---

**基本写法：赋值**
`<variant> = <值>;`
```cpp
// 赋值后自动记录当前活跃类型
v = 42;          // 当前为 int
v = std::string("hi"); // 切换为 string
```

---

**基本写法：按索引取值**
`std::get<<索引>>(<variant>)`
```cpp
// 编译期按位置取出，类型不符抛 std::bad_variant_access
int i = std::get<0>(v);
```

---

**基本写法：按类型取值**
`std::get<<类型>>(<variant>)`
```cpp
// 按类型取出，需该类型当前活跃
std::string s = std::get<std::string>(v);
```

---

**基本写法：安全取指针**
`std::get_if<<类型>>(&<variant>)`
```cpp
// 类型匹配返回指针，否则返回 nullptr，不抛异常
if (auto p = std::get_if<int>(&v)) { std::cout << *p; }
```

---

**基本写法：查询当前索引**
`<variant>.index()`
```cpp
// 返回当前活跃类型的索引
std::size_t idx = v.index();
```

---

**基本写法：判断是否持有某类型**
`std::holds_alternative<<类型>>(<variant>)`
```cpp
// 编译期类型查询
if (std::holds_alternative<int>(v)) { /* int 活跃 */ }
```

---

**基本写法：访问者模式**
`std::visit(<访问者>, <variant>)`
```cpp
// 对活跃类型分派到访问者的对应 operator()
auto printer = [](auto&& x) { std::cout << x; };
std::visit(printer, v);
```

---

**基本写法：多 variant 访问**
`std::visit(<访问者>, <variant1>, <variant2>)`
```cpp
// 同时对多个 variant 分派，访问者接收每种组合
auto add = [](auto a, auto b) { return a + b; };
auto r = std::visit(add, v1, v2);
```

---

**基本写法：空状态标记类型**
`std::variant<std::monostate, <其他类型>...>`
```cpp
// monostate 作为默认首类型，使 variant 默认构造不抛异常
std::variant<std::monostate, int, double> v2;
```

---

**基本写法：泛型 lambda 访问**
`std::visit([](auto&& x){...}, <variant>)`
```cpp
// 用泛型 lambda 统一处理，按活跃类型实例化
std::visit([](auto&& x){ std::cout << x << "\n"; }, v);
```

---

**基本写法：overload 访问者**
`struct { auto operator()(<类型>) {...} ... }`
```cpp
// 手写结构体重载每类型，或用辅助模板组合多个 lambda
struct Visitor {
    void operator()(int i) { std::cout << "int:" << i; }
    void operator()(const std::string& s) { std::cout << "str:" << s; }
};
std::visit(Visitor{}, v);
```

---

## std::any 任意类型

**基本写法：构造 any**
`std::any <变量>;`
```cpp
// 持有任意可复制构造类型的值
std::any a;
```

---

**基本写法：赋值**
`std::any <变量> = <值>;`
```cpp
// 用任意类型赋值，类型信息被记录
a = 42;
a = std::string("hi"); // 后赋值覆盖前值
```

---

**基本写法：判空**
`<any>.has_value()`
```cpp
// 判断是否持有值
if (!a.has_value()) { /* 空 */ }
```

---

**基本写法：取类型信息**
`<any>.type()`
```cpp
// 返回 const std::type_info&，需 <typeinfo>
if (a.type() == typeid(int)) { /* 当前持有 int */ }
```

---

**基本写法：取值**
`std::any_cast<<类型>>(<any>)`
```cpp
// 类型匹配返回值，不匹配抛 std::bad_any_cast
int i = std::any_cast<int>(a);
```

---

**基本写法：安全取指针**
`std::any_cast<<类型>>(&<any>)`
```cpp
// 返回指针，类型不符返回 nullptr
if (auto p = std::any_cast<int>(&a)) { std::cout << *p; }
```

---

**基本写法：置空**
`<any>.reset()` / `<any> = std::nullopt` 不适用
```cpp
// any 用 reset 清空
a.reset();
```

---

## 选型对比

**基本写法：何时用哪个**
`optional` / `variant` / `any`
```cpp
// optional：可能无值或单类型缺失值
// variant：有限已知类型集合中选一（编译期类型安全）
// any：完全未知类型、运行期动态类型（牺牲类型安全）
```
