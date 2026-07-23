# 右值引用与移动语义

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 右值引用

**基本写法：右值引用声明**
`<type>&& <ref_name> = <value>;`
```cpp
// 右值引用，绑定到临时值
int&& rref = 10;
```

---

**基本写法：右值引用绑定到临时对象**
`<Type>&& <ref> = <Type>(<args>);`
```cpp
// 右值引用绑定到临时对象
std::string&& ref = std::string("Hello");
```

---

**修改写法：通过右值引用修改值**
`<ref_name> = <new_value>;`
```cpp
// 通过右值引用修改值
int&& rref = 10;
rref = 20;
```

---

## std::move

**基本写法：将左值转换为右值**
`std::move(<var>)`
```cpp
#include <utility>
// 将左值转换为右值引用
std::string str = "Hello";
std::string moved = std::move(str);
```

---

**移动容器写法：移动容器内容**
`std::move(<begin>, <end>, <dest>)`
```cpp
#include <algorithm>
#include <vector>
// 移动范围内的元素
std::vector<int> src = {1, 2, 3};
std::vector<int> dest(3);
std::move(src.begin(), src.end(), dest.begin());
```

---

**移动元素写法：移动单个元素**
`<container>.push_back(std::move(<element>));`
```cpp
#include <vector>
// 移动元素到容器
std::vector<std::string> vec;
std::string str = "Hello";
vec.push_back(std::move(str));
```

---

## 移动构造函数

**基本写法：移动构造函数**
`<ClassName>(<ClassName>&& <other>) noexcept { ... }`
```cpp
// 移动构造函数
class String {
    char* data;
    size_t size;
public:
    String(String&& other) noexcept : data(other.data), size(other.size) {
        other.data = nullptr;
        other.size = 0;
    }
};
```

---

**默认写法：默认移动构造函数**
`<ClassName>(<ClassName>&&) = default;`
```cpp
// 使用默认移动构造函数
class Point {
    int x, y;
public:
    Point(Point&&) = default;
};
```

---

**禁用写法：禁用移动构造函数**
`<ClassName>(<ClassName>&&) = delete;`
```cpp
// 禁用移动构造函数
class NonMovable {
public:
    NonMovable(NonMovable&&) = delete;
};
```

---

## 移动赋值运算符

**基本写法：移动赋值运算符**
`<ClassName>& operator=(<ClassName>&& <other>) noexcept { ... }`
```cpp
// 移动赋值运算符
class String {
    char* data;
public:
    String& operator=(String&& other) noexcept {
        if (this != &other) {
            delete[] data;
            data = other.data;
            other.data = nullptr;
        }
        return *this;
    }
};
```

---

**默认写法：默认移动赋值运算符**
`<ClassName>& operator=(<ClassName>&&) = default;`
```cpp
// 使用默认移动赋值运算符
class Point {
    int x, y;
public:
    Point& operator=(Point&&) = default;
};
```

---

## 完美转发

**万能引用写法：模板中的万能引用**
`template<typename T> void <func>(T&& <param>) { ... }`
```cpp
// 万能引用，可以接受左值或右值
template<typename T>
void process(T&& arg) {
    // 使用 std::forward 完美转发
}
```

---

**std::forward 写法：完美转发**
`std::forward<T>(<arg>)`
```cpp
#include <utility>
// 完美转发参数
template<typename T>
void wrapper(T&& arg) {
    target(std::forward<T>(arg));
}
```

---

**多参数转发写法：转发多个参数**
`template<typename... Args> void <func>(Args&&... <args>) { <target>(std::forward<Args>(<args>)...); }`
```cpp
#include <utility>
// 转发多个参数
template<typename... Args>
void wrapper(Args&&... args) {
    target(std::forward<Args>(args)...);
}
```

---

## 移动语义与容器

**emplace_back 写法：原地构造元素**
`<container>.emplace_back(<args>);`
```cpp
#include <vector>
// 原地构造元素，避免临时对象
std::vector<std::string> vec;
vec.emplace_back("Hello");
```

---

**push_back 写法：使用 push_back 配合 move**
`<container>.push_back(std::move(<element>));`
```cpp
#include <vector>
// 使用 move 配合 push_back
std::vector<std::string> vec;
std::string str = "Hello";
vec.push_back(std::move(str));
```

---

## 返回值优化

**返回写法：返回局部对象**
`<Type> <func>() { <Type> <local>; return <local>; }`
```cpp
// 返回局部对象，可能触发 RVO
std::string create_string() {
    std::string s = "Hello";
    return s;
}
```

---

**返回右值写法：返回右值引用**
`<Type>&& <func>() { return std::move(<var>); }`
```cpp
#include <utility>
// 返回右值引用
std::string get_string() {
    std::string s = "Hello";
    return std::move(s);
}
```

---

## 移动语义与智能指针

**unique_ptr 移动写法**
`std::unique_ptr<<type>> <new_ptr> = std::move(<old_ptr>);`
```cpp
#include <memory>
// 移动 unique_ptr 所有权
std::unique_ptr<int> p1 = std::make_unique<int>(10);
std::unique_ptr<int> p2 = std::move(p1);
```

---

**shared_ptr 移动写法**
`std::shared_ptr<<type>> <new_ptr> = std::move(<old_ptr>);`
```cpp
#include <memory>
// 移动 shared_ptr
std::shared_ptr<int> p1 = std::make_shared<int>(10);
std::shared_ptr<int> p2 = std::move(p1);
```

---

## 移动语义最佳实践

**noexcept 写法：移动操作标记为 noexcept**
`<ClassName>(<ClassName>&&) noexcept { ... }`
```cpp
// 移动操作应标记为 noexcept
class MyClass {
public:
    MyClass(MyClass&&) noexcept {}
};
```

---

**swap 写法：使用 move 实现 swap**
`void <swap>(<Type>& <a>, <Type>& <b>) { <Type> <temp> = std::move(<a>); <a> = std::move(<b>); <b> = std::move(<temp>); }`
```cpp
#include <utility>
// 使用 move 实现 swap
void my_swap(std::string& a, std::string& b) {
    std::string temp = std::move(a);
    a = std::move(b);
    b = std::move(temp);
}
```

---

## 区分左值与右值

**is_lvalue_reference 写法：检查左值引用**
`std::is_lvalue_reference<<type>>::value`
```cpp
#include <type_traits>
// 检查是否为左值引用
bool is_lref = std::is_lvalue_reference<int&>::value;
```

---

**is_rvalue_reference 写法：检查右值引用**
`std::is_rvalue_reference<<type>>::value`
```cpp
#include <type_traits>
// 检查是否为右值引用
bool is_rref = std::is_rvalue_reference<int&&>::value;
```

---

## std::move_if_noexcept

**基本写法：条件移动**
`std::move_if_noexcept(<var>)`
```cpp
#include <utility>
// 如果移动构造不是 noexcept 则返回 const 引用
auto result = std::move_if_noexcept(obj);
```
