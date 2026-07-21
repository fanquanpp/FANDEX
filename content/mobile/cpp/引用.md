# 引用

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 左值引用

**基本写法：左值引用声明**
`<type>& <ref_name> = <var>;`
```cpp
// 引用是变量的别名
int x = 10;
int& ref = x;
```

---

**修改写法：通过引用修改值**
`<ref_name> = <new_value>;`
```cpp
// 通过引用修改变量的值
int x = 10;
int& ref = x;
ref = 20;
```

---

**const 写法：常量引用**
`const <type>& <ref_name> = <var>;`
```cpp
// 常量引用，不能通过引用修改值
int x = 10;
const int& ref = x;
```

---

**字面量写法：const 引用绑定到字面量**
`const <type>& <ref_name> = <literal>;`
```cpp
// const 引用可以绑定到字面量
const int& ref = 100;
```

---

## 右值引用

**基本写法：右值引用声明**
`<type>&& <ref_name> = <value>;`
```cpp
// 右值引用，绑定到临时值
int&& rref = 10;
```

---

**移动写法：右值引用用于移动语义**
`<Type>(<Type>&& <other>) { ... }`
```cpp
// 移动构造函数
class String {
    char* data;
public:
    String(String&& other) noexcept : data(other.data) {
        other.data = nullptr;
    }
};
```

---

## 引用作为函数参数

**基本写法：引用作为函数参数**
`<return_type> <func>(<type>& <param>) { ... }`
```cpp
// 通过引用修改参数
void increment(int& x) {
    x++;
}
```

---

**const 写法：const 引用作为函数参数**
`<return_type> <func>(const <type>& <param>) { ... }`
```cpp
// 避免拷贝，且不修改参数
void print(const std::string& str) {
    std::cout << str << std::endl;
}
```

---

**输出参数写法：使用引用返回多个值**
`void <func>(<type>& <out1>, <type>& <out2>) { ... }`
```cpp
// 使用引用参数返回多个值
void get_values(int& a, int& b) {
    a = 10;
    b = 20;
}
```

---

## 引用作为返回值

**基本写法：返回引用**
`<type>& <func>() { ... return <var>; }`
```cpp
// 返回引用，可用于链式调用
class Array {
    int data[10];
public:
    int& at(int i) {
        return data[i];
    }
};
```

---

**const 写法：返回 const 引用**
`const <type>& <func>() const { ... }`
```cpp
// 返回 const 引用，不允许修改
class Container {
    std::vector<int> data;
public:
    const std::vector<int>& get_data() const {
        return data;
    }
};
```

---

**链式调用写法：返回 *this**
`<Type>& <func>() { ... return *this; }`
```cpp
// 返回 *this 支持链式调用
class Builder {
    std::string str;
public:
    Builder& append(const std::string& s) {
        str += s;
        return *this;
    }
};
```

---

## 引用与指针

**对比写法：引用与指针的区别**
`<type>& <ref> = <var>;` vs `<type>* <ptr> = &<var>;`
```cpp
// 引用必须初始化，指针可以不初始化
int x = 10;
int& ref = x;  // 引用
int* ptr = &x; // 指针
```

---

**成员访问写法：引用访问成员**
`<ref>.<member>`
```cpp
// 通过引用访问成员
struct Point { int x; int y; };
Point p = {10, 20};
Point& ref = p;
std::cout << ref.x << std::endl;
```

---

## 引用折叠

**基本写法：引用折叠规则**
`<type>& &` -> `<type>&`
```cpp
// 引用折叠：左值引用的引用仍为左值引用
typedef int& IntRef;
IntRef& ref = x;  // 等价于 int& ref = x;
```

---

## 万能引用

**基本写法：模板中的万能引用**
`template<typename T> void <func>(T&& <param>) { ... }`
```cpp
// 万能引用，可以接受左值或右值
template<typename T>
void process(T&& arg) {
    // 使用 std::forward 完美转发
}
```

---

**完美转发写法：使用 std::forward**
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
// 移动范围内的元素
std::vector<int> src = {1, 2, 3};
std::vector<int> dest(3);
std::move(src.begin(), src.end(), dest.begin());
```

---

## 引用与多态

**基本写法：基类引用指向派生类**
`<Base>& <ref> = <derived>;`
```cpp
// 基类引用指向派生类对象
class Base { public: virtual void show() {} };
class Derived : public Base { public: void show() override {} };
Derived d;
Base& ref = d;
```

---

**虚函数写法：通过引用调用虚函数**
`<ref>.<virtual_func>()`
```cpp
// 通过引用调用虚函数（多态）
ref.show();
```
