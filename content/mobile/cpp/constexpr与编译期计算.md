# constexpr与编译期计算

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## constexpr 变量

**基本写法：定义编译期常量**
`constexpr <type> <var_name> = <value>;`
```cpp
// 定义编译期常量
constexpr int SIZE = 10;
```

---

**表达式写法：使用常量表达式**
`constexpr <type> <var> = <constexpr_expr>;`
```cpp
// 使用常量表达式
constexpr int AREA = 5 * 5;
```

---

**函数调用写法：使用 constexpr 函数初始化**
`constexpr <type> <var> = <constexpr_func>(<args>);`
```cpp
// 使用 constexpr 函数初始化
constexpr int result = square(5);
```

---

## constexpr 函数

**基本写法：定义 constexpr 函数**
`constexpr <return_type> <func>(<params>) { ... }`
```cpp
// 定义编译期可计算的函数
constexpr int square(int x) {
    return x * x;
}
```

---

**递归写法：constexpr 递归函数**
`constexpr <return_type> <func>(<params>) { if (<base>) return ...; return <recursive>; }`
```cpp
// 编译期递归计算阶乘
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}
```

---

**条件写法：constexpr 函数中使用 if**
`constexpr <return_type> <func>(<params>) { if (<cond>) { ... } else { ... } }`
```cpp
// C++14 constexpr 函数可以使用 if
constexpr int abs_val(int x) {
    if (x >= 0) {
        return x;
    } else {
        return -x;
    }
}
```

---

**循环写法：constexpr 函数中使用循环**
`constexpr <return_type> <func>(<params>) { for (...) { ... } }`
```cpp
// C++14 constexpr 函数可以使用循环
constexpr int sum(int n) {
    int total = 0;
    for (int i = 1; i <= n; i++) {
        total += i;
    }
    return total;
}
```

---

## constexpr 与 const

**const 写法：运行期常量**
`const <type> <var> = <value>;`
```cpp
// 运行期常量
const int runtime_val = 10;
```

---

**constexpr 写法：编译期常量**
`constexpr <type> <var> = <value>;`
```cpp
// 编译期常量
constexpr int compiletime_val = 10;
```

---

**const + constexpr 写法：两者结合**
`const constexpr <type> <var> = <value>;`
```cpp
// const 和 constexpr 结合
const constexpr int VALUE = 100;
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

**无 else 写法：仅 if constexpr**
`if constexpr (<condition>) { ... }`
```cpp
// 仅 if constexpr
template<typename T>
void process(T value) {
    if constexpr (std::is_integral_v<T>) {
        std::cout << "Integer" << std::endl;
    }
}
```

---

## constexpr 类

**基本写法：constexpr 构造函数**
`constexpr <ClassName>(<params>) : <members> { ... }`
```cpp
// constexpr 构造函数
class Point {
    int x, y;
public:
    constexpr Point(int x, int y) : x(x), y(y) {}
};
```

---

**constexpr 成员函数写法**
`constexpr <return_type> <func>() const { ... }`
```cpp
// constexpr 成员函数
class Point {
    int x, y;
public:
    constexpr int get_x() const { return x; }
};
```

---

**constexpr 对象写法**
`constexpr <ClassName> <var>(<args>);`
```cpp
// 创建 constexpr 对象
constexpr Point p(10, 20);
```

---

## constexpr 与模板

**模板写法：constexpr 模板函数**
`template<typename T> constexpr <return_type> <func>(T <param>) { ... }`
```cpp
// constexpr 模板函数
template<typename T>
constexpr T max_val(T a, T b) {
    return a > b ? a : b;
}
```

---

## 编译期计算

**递归写法：模板递归编译期计算**
`template<int N> struct <Factorial> { static constexpr int value = N * <Factorial><N-1>::value; };`
```cpp
// 模板递归计算阶乘
template<int N>
struct Factorial {
    static constexpr int value = N * Factorial<N - 1>::value;
};

template<>
struct Factorial<0> {
    static constexpr int value = 1;
};
```

---

**使用写法：访问编译期计算的值**
`<Factorial><N>::value`
```cpp
// 访问编译期计算的值
constexpr int result = Factorial<5>::value;
```

---

## constexpr 与数组

**数组大小写法：使用 constexpr 作为数组大小**
`<type> <array>[<constexpr_var>];`
```cpp
// 使用 constexpr 作为数组大小
constexpr int SIZE = 10;
int arr[SIZE];
```

---

**std::array 写法：使用 constexpr 作为 std::array 大小**
`std::array<<type>, <constexpr_var>> <arr>;`
```cpp
#include <array>
// 使用 constexpr 作为 std::array 大小
constexpr int SIZE = 10;
std::array<int, SIZE> arr;
```

---

## constexpr 与 std::array

**基本写法：constexpr std::array**
`constexpr std::array<<type>, <size>> <arr> = {<values>};`
```cpp
#include <array>
// constexpr std::array
constexpr std::array<int, 5> arr = {1, 2, 3, 4, 5};
```

---

## constexpr lambda（C++17）

**基本写法：constexpr lambda**
`auto <lambda> = []() constexpr { ... }`
```cpp
// C++17 constexpr lambda
auto square = [](int x) constexpr {
    return x * x;
};
```

---

**调用写法：在编译期调用 constexpr lambda**
`constexpr <type> <var> = <lambda>(<args>);`
```cpp
// 在编译期调用 constexpr lambda
constexpr int result = square(5);
```

---

## consteval（C++20）

**基本写法：定义 consteval 函数**
`consteval <return_type> <func>(<params>) { ... }`
```cpp
// C++20 consteval 函数，必须在编译期执行
consteval int square(int x) {
    return x * x;
}
```

---

**调用写法：调用 consteval 函数**
`constexpr <type> <var> = <func>(<args>);`
```cpp
// 调用 consteval 函数
constexpr int result = square(5);
```

---

## constinit（C++20）

**基本写法：constinit 变量**
`constinit <type> <var> = <value>;`
```cpp
// C++20 constinit 变量，必须编译期初始化
constinit int global_var = 10;
```

---

## 类型检查

**is_constant_evaluated 写法：检查是否在编译期求值**
`if (std::is_constant_evaluated()) { ... }`
```cpp
#include <type_traits>
// 检查是否在编译期求值
constexpr int compute(int x) {
    if (std::is_constant_evaluated()) {
        return x * 2;
    } else {
        return x * 3;
    }
}
```

---

## constexpr 与标准库

**基本写法：constexpr 标准库函数**
`constexpr <type> <var> = std::<func>(<args>);`
```cpp
#include <cmath>
// 使用 constexpr 标准库函数
constexpr double result = std::abs(-3.14);
```

---

**constexpr 容器写法：C++20 constexpr 容器**
`constexpr std::vector<<type>> <vec>;`
```cpp
#include <vector>
// C++20 constexpr vector
constexpr std::vector<int> vec = {1, 2, 3};
```
