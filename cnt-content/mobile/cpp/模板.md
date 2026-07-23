# 模板

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 函数模板

**基本写法：函数模板定义**
`template<typename T> <return_type> <func>(T <param>) { ... }`
```cpp
// 定义通用加法函数模板
template<typename T>
T add(T a, T b) {
    return a + b;
}
```

---

**调用写法：隐式实例化**
`<func>(<arg1>, <arg2>);`
```cpp
// 编译器自动推导模板参数
int result = add(10, 20);
```

---

**调用写法：显式指定模板参数**
`<func><<type>>(<args>);`
```cpp
// 显式指定模板参数类型
double result = add<double>(10.5, 20.5);
```

---

**多参数写法：多类型参数函数模板**
`template<typename T1, typename T2> <return_type> <func>(T1 <a>, T2 <b>) { ... }`
```cpp
// 多类型参数函数模板
template<typename T1, typename T2>
void print(T1 a, T2 b) {
    std::cout << a << ", " << b << std::endl;
}
```

---

**非类型写法：非类型模板参数**
`template<int N> <return_type> <func>() { ... }`
```cpp
// 非类型模板参数
template<int N>
int get_size() {
    return N;
}
```

---

## 类模板

**基本写法：类模板定义**
`template<typename T> class <ClassName> { ... };`
```cpp
// 定义栈类模板
template<typename T>
class Stack {
    std::vector<T> data;
public:
    void push(const T& value) { data.push_back(value); }
    T pop() { T val = data.back(); data.pop_back(); return val; }
};
```

---

**使用写法：实例化类模板**
`<ClassName><<type>> <var_name>;`
```cpp
// 实例化 int 类型的栈
Stack<int> int_stack;
```

---

**多参数写法：多类型参数类模板**
`template<typename T1, typename T2> class <ClassName> { ... };`
```cpp
// 多类型参数类模板
template<typename Key, typename Value>
class Map {
    std::vector<std::pair<Key, Value>> data;
};
```

---

**非类型写法：非类型参数类模板**
`template<int N> class <ClassName> { ... };`
```cpp
// 非类型参数类模板
template<int N>
class Array {
    T data[N];
};
```

---

**默认参数写法：模板默认参数**
`template<typename T = int> class <ClassName> { ... };`
```cpp
// 模板默认参数
template<typename T = int>
class Container {
    T value;
};
```

---

## 模板特化

**全特化写法：完全特化**
`template<> class <ClassName><<type>> { ... };`
```cpp
// 对 int 类型完全特化
template<>
class Stack<int> {
    int data[100];
};
```

---

**偏特化写法：部分特化**
`template<typename T> class <ClassName><T*> { ... };`
```cpp
// 对指针类型部分特化
template<typename T>
class Stack<T*> {
    std::vector<T*> data;
};
```

---

**函数特化写法：函数模板全特化**
`template<> <return_type> <func><<type>>(<type> <param>) { ... }`
```cpp
// 对 const char* 类型特化
template<>
std::string add(const char* a, const char* b) {
    return std::string(a) + std::string(b);
}
```

---

## 变长参数模板

**基本写法：变长参数模板**
`template<typename... Args> <return_type> <func>(Args... <args>) { ... }`
```cpp
// 变长参数模板
template<typename... Args>
void print(Args... args) {
    // 使用折叠表达式展开参数包
}
```

---

**sizeof 写法：获取参数包大小**
`sizeof...(args)`
```cpp
// 获取参数包中的参数个数
template<typename... Args>
void count_args(Args... args) {
    std::cout << sizeof...(args) << std::endl;
}
```

---

**折叠写法：C++17 折叠表达式**
`(... <op> <args>)`
```cpp
// 使用折叠表达式求和
template<typename... Args>
auto sum(Args... args) {
    return (... + args);
}
```

---

## 模板元编程

**编译期计算写法：模板递归**
`template<int N> struct <Factorial> { static const int value = N * <Factorial><N-1>::value; };`
```cpp
// 编译期计算阶乘
template<int N>
struct Factorial {
    static const int value = N * Factorial<N - 1>::value;
};

template<>
struct Factorial<0> {
    static const int value = 1;
};
```

---

**类型萃取写法：使用 type_traits**
`std::is_integral<<type>>::value`
```cpp
#include <type_traits>
// 检查类型是否为整数
bool is_int = std::is_integral<int>::value;
```

---

## SFINAE

**enable_if 写法：启用/禁用函数模板**
`template<typename T, typename = std::enable_if_t<<condition>>>`
```cpp
#include <type_traits>
// 仅当 T 为整数类型时启用
template<typename T, typename = std::enable_if_t<std::is_integral_v<T>>>
void process(T value) {
    std::cout << value << std::endl;
}
```

---

## if constexpr

**基本写法：编译期条件判断**
`if constexpr (<condition>) { ... } else { ... }`
```cpp
// 编译期条件判断
template<typename T>
void process(T value) {
    if constexpr (std::is_integral_v<T>) {
        std::cout << "Integer: " << value << std::endl;
    } else {
        std::cout << "Other: " << value << std::endl;
    }
}
```

---

## 概念与约束（C++20）

**基本写法：定义概念**
`template<typename T> concept <ConceptName> = <condition>;`
```cpp
#include <concepts>
// 定义概念
template<typename T>
concept Numeric = std::is_integral_v<T> || std::is_floating_point_v<T>;
```

---

**约束写法：使用概念约束模板**
`template<Numeric T> <return_type> <func>(T <param>) { ... }`
```cpp
// 使用概念约束模板参数
template<Numeric T>
T add(T a, T b) {
    return a + b;
}
```

---

**requires 写法：使用 requires 子句**
`template<typename T> requires <Concept> <return_type> <func>(T <param>) { ... }`
```cpp
// 使用 requires 子句
template<typename T>
requires std::integral<T>
T add(T a, T b) {
    return a + b;
}
```
