# Lambda表达式

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## Lambda 基础

**基本写法：Lambda 表达式定义**
`[<capture>](<params>) -> <return_type> { <body> }`
```cpp
// 定义 Lambda 表达式
auto add = [](int a, int b) -> int {
    return a + b;
};
```

---

**调用写法：调用 Lambda**
`<lambda>(<args>);`
```cpp
// 调用 Lambda
int result = add(10, 20);
```

---

**auto 写法：自动推导返回类型**
`[<capture>](<params>) { <body> }`
```cpp
// 省略返回类型，自动推导
auto add = [](int a, int b) {
    return a + b;
};
```

---

**无参写法：无参数 Lambda**
`[<capture>]() { <body> }`
```cpp
// 无参数 Lambda
auto greet = []() {
    std::cout << "Hello" << std::endl;
};
```

---

## 捕获方式

**值捕获写法：捕获外部变量**
`[<var>](<params>) { <body> }`
```cpp
// 值捕获变量 x
int x = 10;
auto lambda = [x]() {
    std::cout << x << std::endl;
};
```

---

**引用捕获写法：按引用捕获**
`[&<var>](<params>) { <body> }`
```cpp
// 引用捕获变量 x
int x = 10;
auto lambda = [&x]() {
    x++;
};
```

---

**全部值捕获写法：捕获所有变量**
`[=](<params>) { <body> }`
```cpp
// 值捕获所有外部变量
int x = 10, y = 20;
auto lambda = [=]() {
    std::cout << x + y << std::endl;
};
```

---

**全部引用捕获写法：按引用捕获所有变量**
`[&](<params>) { <body> }`
```cpp
// 引用捕获所有外部变量
int x = 10, y = 20;
auto lambda = [&]() {
    x++;
    y++;
};
```

---

**混合捕获写法：混合捕获**
`[=, &<var>](<params>) { <body> }`
```cpp
// 默认值捕获，x 按引用捕获
int x = 10, y = 20;
auto lambda = [=, &x]() {
    x = y;
};
```

---

**this 捕获写法：捕获 this 指针**
`[this](<params>) { <body> }`
```cpp
// 捕获 this 指针
class MyClass {
    int value;
public:
    void func() {
        auto lambda = [this]() {
            value = 10;
        };
    }
};
```

---

**初始化捕获写法：C++14 初始化捕获**
`[<var> = <expr>](<params>) { <body> }`
```cpp
// C++14 初始化捕获
auto lambda = [x = 10]() {
    std::cout << x << std::endl;
};
```

---

## Lambda 与 STL

**for_each 写法：使用 Lambda 遍历**
`std::for_each(<begin>, <end>, <lambda>);`
```cpp
#include <algorithm>
#include <vector>
// 使用 Lambda 遍历容器
std::vector<int> vec = {1, 2, 3, 4, 5};
std::for_each(vec.begin(), vec.end(), [](int x) {
    std::cout << x << std::endl;
});
```

---

**sort 写法：使用 Lambda 作为比较函数**
`std::sort(<begin>, <end>, <lambda>);`
```cpp
#include <algorithm>
#include <vector>
// 使用 Lambda 排序
std::vector<int> vec = {5, 3, 1, 4, 2};
std::sort(vec.begin(), vec.end(), [](int a, int b) {
    return a > b;
});
```

---

**find_if 写法：使用 Lambda 查找**
`std::find_if(<begin>, <end>, <lambda>);`
```cpp
#include <algorithm>
#include <vector>
// 使用 Lambda 查找
std::vector<int> vec = {1, 2, 3, 4, 5};
auto it = std::find_if(vec.begin(), vec.end(), [](int x) {
    return x > 3;
});
```

---

**transform 写法：使用 Lambda 转换**
`std::transform(<begin>, <end>, <dest>, <lambda>);`
```cpp
#include <algorithm>
#include <vector>
// 使用 Lambda 转换元素
std::vector<int> src = {1, 2, 3};
std::vector<int> dest(3);
std::transform(src.begin(), src.end(), dest.begin(), [](int x) {
    return x * 2;
});
```

---

## std::function

**基本写法：使用 std::function 存储 Lambda**
`std::function<<return_type>(<params>)> <func> = <lambda>;`
```cpp
#include <functional>
// 使用 std::function 存储 Lambda
std::function<int(int, int)> add = [](int a, int b) {
    return a + b;
};
```

---

**回调写法：使用 std::function 作为回调**
`void <func>(std::function<<signature>> <callback>) { ... }`
```cpp
#include <functional>
// 使用 std::function 作为回调参数
void process(std::function<void(int)> callback) {
    callback(42);
}
```

---

## 泛型 Lambda

**基本写法：C++14 泛型 Lambda**
`auto <lambda> = [](auto <a>, auto <b>) { ... }`
```cpp
// C++14 泛型 Lambda
auto add = [](auto a, auto b) {
    return a + b;
};
```

---

## Lambda 与递归

**基本写法：使用 std::function 实现递归 Lambda**
`std::function<<type>(<type>)> <func> = [&](<type> <n>) -> <type> { ... };`
```cpp
#include <functional>
// 递归 Lambda 计算阶乘
std::function<int(int)> factorial = [&](int n) -> int {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
};
```

---

## 立即调用的 Lambda

**基本写法：立即调用的 Lambda（IIFE）**
`[<capture>](<params>) { <body> }();`
```cpp
// 立即调用的 Lambda
int result = [](int a, int b) {
    return a + b;
}(10, 20);
```

---

**初始化写法：使用 IIFE 初始化 const 变量**
`const auto <var> = [<capture>] { ... }();`
```cpp
// 使用 IIFE 初始化常量
const auto value = []() {
    int x = 10;
    int y = 20;
    return x + y;
}();
```

---

## mutable Lambda

**基本写法：mutable Lambda**
`[<capture>](<params>) mutable { <body> }`
```cpp
// mutable 允许修改值捕获的变量
int x = 10;
auto lambda = [x]() mutable {
    x++;
    std::cout << x << std::endl;
};
```

---

## Lambda 与模板

**模板写法：Lambda 作为模板参数**
`template<typename Func> void <func>(Func <callback>) { ... }`
```cpp
// Lambda 作为模板参数
template<typename Func>
void process(Func callback) {
    callback(42);
}

// 调用
process([](int x) { std::cout << x << std::endl; });
```
