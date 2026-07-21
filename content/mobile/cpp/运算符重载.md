# 运算符重载

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 成员函数重载

**基本写法：重载二元运算符**
`<ReturnType> operator<op>(const <Type>& <other>) const { ... }`
```cpp
// 重载加法运算符
class Vector {
    int x, y;
public:
    Vector operator+(const Vector& other) const {
        return Vector{x + other.x, y + other.y};
    }
};
```

---

**基本写法：重载一元运算符**
`<ReturnType> operator<op>() { ... }`
```cpp
// 重载负号运算符
class Vector {
    int x, y;
public:
    Vector operator-() const {
        return Vector{-x, -y};
    }
};
```

---

**基本写法：重载前置自增**
`<Type>& operator++() { ... }`
```cpp
// 重载前置自增运算符
class Counter {
    int count;
public:
    Counter& operator++() {
        ++count;
        return *this;
    }
};
```

---

**基本写法：重载后置自增**
`<Type> operator++(int) { ... }`
```cpp
// 重载后置自增运算符
class Counter {
    int count;
public:
    Counter operator++(int) {
        Counter temp = *this;
        ++count;
        return temp;
    }
};
```

---

## 赋值运算符重载

**基本写法：重载赋值运算符**
`<Type>& operator=(const <Type>& <other>) { ... }`
```cpp
// 重载赋值运算符
class String {
    char* data;
public:
    String& operator=(const String& other) {
        if (this != &other) {
            delete[] data;
            data = new char[strlen(other.data) + 1];
            strcpy(data, other.data);
        }
        return *this;
    }
};
```

---

**移动写法：重载移动赋值运算符**
`<Type>& operator=(<Type>&& <other>) noexcept { ... }`
```cpp
// 重载移动赋值运算符
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

## 比较运算符重载

**基本写法：重载等于运算符**
`bool operator==(const <Type>& <other>) const { ... }`
```cpp
// 重载等于运算符
class Point {
    int x, y;
public:
    bool operator==(const Point& other) const {
        return x == other.x && y == other.y;
    }
};
```

---

**基本写法：重载小于运算符**
`bool operator<(const <Type>& <other>) const { ... }`
```cpp
// 重载小于运算符
class Point {
    int x, y;
public:
    bool operator<(const Point& other) const {
        return x < other.x;
    }
};
```

---

## 函数调用运算符重载

**基本写法：重载函数调用运算符**
`<ReturnType> operator()(<params>) { ... }`
```cpp
// 重载函数调用运算符
class Adder {
public:
    int operator()(int a, int b) {
        return a + b;
    }
};
```

---

## 下标运算符重载

**基本写法：重载下标运算符**
`<Type>& operator[](size_t <index>) { ... }`
```cpp
// 重载下标运算符
class Array {
    int* data;
public:
    int& operator[](size_t index) {
        return data[index];
    }
};
```

---

**const 写法：重载 const 版本下标运算符**
`const <Type>& operator[](size_t <index>) const { ... }`
```cpp
// 重载 const 版本下标运算符
class Array {
    int* data;
public:
    const int& operator[](size_t index) const {
        return data[index];
    }
};
```

---

## 成员访问运算符重载

**基本写法：重载箭头运算符**
`<Type>* operator->() { ... }`
```cpp
// 重载箭头运算符
class SmartPtr {
    MyClass* ptr;
public:
    MyClass* operator->() {
        return ptr;
    }
};
```

---

**基本写法：重载解引用运算符**
`<Type>& operator*() const { ... }`
```cpp
// 重载解引用运算符
class SmartPtr {
    MyClass* ptr;
public:
    MyClass& operator*() const {
        return *ptr;
    }
};
```

---

## 流运算符重载

**基本写法：重载输出流运算符**
`std::ostream& operator<<(std::ostream& <os>, const <Type>& <obj>) { ... }`
```cpp
// 重载输出流运算符
class Point {
    int x, y;
public:
    friend std::ostream& operator<<(std::ostream& os, const Point& p);
};

std::ostream& operator<<(std::ostream& os, const Point& p) {
    os << "(" << p.x << ", " << p.y << ")";
    return os;
}
```

---

**基本写法：重载输入流运算符**
`std::istream& operator>>(std::istream& <is>, <Type>& <obj>) { ... }`
```cpp
// 重载输入流运算符
class Point {
    int x, y;
public:
    friend std::istream& operator>>(std::istream& is, Point& p);
};

std::istream& operator>>(std::istream& is, Point& p) {
    is >> p.x >> p.y;
    return is;
}
```

---

## 类型转换运算符重载

**基本写法：重载类型转换运算符**
`operator <target_type>() const { ... }`
```cpp
// 重载类型转换运算符
class MyInt {
    int value;
public:
    operator int() const {
        return value;
    }
};
```

---

**explicit 写法：显式类型转换运算符**
`explicit operator <target_type>() const { ... }`
```cpp
// 显式类型转换运算符
class MyInt {
    int value;
public:
    explicit operator int() const {
        return value;
    }
};
```

---

## 友元函数重载

**基本写法：使用友元函数重载运算符**
`friend <ReturnType> operator<op>(const <Type>& <lhs>, const <Type>& <rhs>) { ... }`
```cpp
// 使用友元函数重载加法运算符
class Vector {
    int x, y;
public:
    friend Vector operator+(const Vector& lhs, const Vector& rhs);
};

Vector operator+(const Vector& lhs, const Vector& rhs) {
    return Vector{lhs.x + rhs.x, lhs.y + rhs.y};
}
```

---

## 三元比较运算符（C++20）

**基本写法：重载太空船运算符**
`auto operator<=>(const <Type>&) const = default;`
```cpp
// 使用默认的三元比较运算符
class Point {
    int x, y;
public:
    auto operator<=>(const Point&) const = default;
};
```
