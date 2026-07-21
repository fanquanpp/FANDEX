# 基础语法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 头文件包含

**系统头文件写法：包含系统头文件**
`#include <<header>>`
```cpp
// 包含输入输出流头文件
#include <iostream>
```

---

**用户头文件写法：包含自定义头文件**
`#include "<header>"`
```cpp
// 包含当前目录下的头文件
#include "myheader.h"
```

---

## 命名空间

**基本写法：使用命名空间**
`using namespace <name>;`
```cpp
// 使用标准命名空间
using namespace std;
```

---

**作用域写法：使用命名空间中的特定成员**
`using <namespace>::<member>;`
```cpp
// 使用 std::cout
using std::cout;
```

---

**限定写法：使用完整限定名**
`<namespace>::<member>`
```cpp
// 使用完整限定名
std::cout << "Hello" << std::endl;
```

---

**定义写法：自定义命名空间**
`namespace <name> { ... }`
```cpp
// 定义命名空间
namespace MyMath {
    int add(int a, int b) { return a + b; }
}
```

---

## 输入输出

**输出写法：标准输出**
`std::cout << <value>;`
```cpp
// 输出字符串到标准输出
std::cout << "Hello C++";
```

---

**换行写法：输出并换行**
`std::cout << <value> << std::endl;`
```cpp
// 输出并换行
std::cout << "Hello" << std::endl;
```

---

**输入写法：标准输入**
`std::cin >> <variable>;`
```cpp
// 从标准输入读取
int age;
std::cin >> age;
```

---

**多值输入写法：连续读取多个值**
`std::cin >> <var1> >> <var2>;`
```cpp
// 连续读取多个值
int a, b;
std::cin >> a >> b;
```

---

## main 函数

**无参写法：无参数主函数**
`int main() { ... return 0; }`
```cpp
// 无参数形式的 main 函数
int main() {
    std::cout << "Hello" << std::endl;
    return 0;
}
```

---

**带参写法：命令行参数主函数**
`int main(int argc, char *argv[]) { ... }`
```cpp
// argc 为参数个数，argv 为参数字符串数组
int main(int argc, char *argv[]) {
    for (int i = 0; i < argc; i++) {
        std::cout << argv[i] << std::endl;
    }
    return 0;
}
```

---

## 变量声明与初始化

**基本写法：变量声明与初始化**
`<type> <var_name> = <value>;`
```cpp
// 声明并初始化变量
int x = 10;
```

---

**直接初始化写法：构造函数式初始化**
`<type> <var_name>(<value>);`
```cpp
// 直接初始化
int x(10);
```

---

**列表初始化写法：C++11 列表初始化**
`<type> <var_name>{<value>};`
```cpp
// 列表初始化
int x{10};
```

---

**auto 写法：自动类型推导**
`auto <var_name> = <value>;`
```cpp
// 编译器自动推导类型
auto x = 10;
```

---

**decltype 写法：推导表达式类型**
`decltype(<expression>) <var_name>;`
```cpp
// 推导表达式的类型
int a = 10;
decltype(a) b = 20;
```

---

**const 写法：常量声明**
`const <type> <var_name> = <value>;`
```cpp
// 声明常量
const int MAX_SIZE = 100;
```

---

**constexpr 写法：编译期常量**
`constexpr <type> <var_name> = <value>;`
```cpp
// 编译期常量
constexpr int SIZE = 10;
```

---

## 注释

**单行写法：单行注释**
`// <注释内容>`
```cpp
// 这是一个单行注释
int x = 10;
```

---

**多行写法：多行注释**
`/* <注释内容> */`
```cpp
/*
 * 这是一个多行注释
 * 可以跨越多行
 */
int y = 20;
```

---

## 引用

**基本写法：左值引用**
`<type>& <ref_name> = <var>;`
```cpp
// 引用是变量的别名
int x = 10;
int& ref = x;
```

---

**常量引用写法：const 引用**
`const <type>& <ref_name> = <value>;`
```cpp
// 常量引用，不能通过引用修改值
const int& ref = 10;
```

---

**右值引用写法：C++11 右值引用**
`<type>&& <ref_name> = <value>;`
```cpp
// 右值引用，绑定到临时值
int&& rref = 10;
```

---

## 指针

**基本写法：指针声明与初始化**
`<type>* <ptr_name> = &<var>;`
```cpp
// ptr 指向 x 的地址
int x = 10;
int* ptr = &x;
```

---

**空指针写法：C++11 nullptr**
`<type>* <ptr_name> = nullptr;`
```cpp
// 初始化为空指针
int* ptr = nullptr;
```

---

**智能指针写法：unique_ptr**
`std::unique_ptr<<type>> <ptr> = std::make_unique<<type>>(<args>);`
```cpp
#include <memory>
// 独占所有权的智能指针
std::unique_ptr<int> p = std::make_unique<int>(10);
```

---

**智能指针写法：shared_ptr**
`std::shared_ptr<<type>> <ptr> = std::make_shared<<type>>(<args>);`
```cpp
#include <memory>
// 共享所有权的智能指针
std::shared_ptr<int> p = std::make_shared<int>(10);
```

---

## 类型转换

**static_cast 写法：静态类型转换**
`static_cast<<target_type>>(<expression>)`
```cpp
// 静态类型转换
double pi = 3.14;
int rounded = static_cast<int>(pi);
```

---

**dynamic_cast 写法：动态类型转换**
`dynamic_cast<<target_type>>(<expression>)`
```cpp
// 动态类型转换（用于多态类型）
Base* base = new Derived();
Derived* derived = dynamic_cast<Derived*>(base);
```

---

**const_cast 写法：常量转换**
`const_cast<<target_type>>(<expression>)`
```cpp
// 添加或移除 const
const int* cp = &x;
int* p = const_cast<int*>(cp);
```

---

**reinterpret_cast 写法：重解释转换**
`reinterpret_cast<<target_type>>(<expression>)`
```cpp
// 重解释类型转换
long addr = reinterpret_cast<long>(ptr);
```

---

## 异常处理

**基本写法：try-catch**
`try { ... } catch (<type> <e>) { ... }`
```cpp
// 异常处理
try {
    throw std::runtime_error("Error");
} catch (const std::exception& e) {
    std::cerr << e.what() << std::endl;
}
```

---

**抛出写法：抛出异常**
`throw <expression>;`
```cpp
// 抛出异常
throw std::runtime_error("Something went wrong");
```

---

**多 catch 写法：捕获多种异常**
`try { ... } catch (<type1> <e>) { ... } catch (<type2> <e>) { ... }`
```cpp
// 捕获多种异常
try {
    // 可能抛出不同异常的代码
} catch (const std::runtime_error& e) {
    std::cerr << e.what() << std::endl;
} catch (const std::logic_error& e) {
    std::cerr << e.what() << std::endl;
}
```

---

## 编译命令

**单文件写法：编译单个源文件**
`g++ <source.cpp> -o <output>`
```bash
# 编译 hello.cpp 生成可执行文件 hello
g++ hello.cpp -o hello
```

---

**标准写法：指定 C++ 标准**
`g++ -std=c++17 <source.cpp> -o <output>`
```bash
# 使用 C++17 标准编译
g++ -std=c++17 hello.cpp -o hello
```

---

## C++23/26 新特性

**基本写法：C++23 std::print**
`std::print("<格式>", <参数>);`
```cpp
// 格式化输出到 stdout，支持 {} 占位符
#include <print>
std::print("Hello, {}! Value = {}\n", "World", 42);
// 输出：Hello, World! Value = 42
```

**基本写法：C++23 std::println**
`std::println("<格式>", <参数>);`
```cpp
// 自动换行的格式化输出
#include <print>
std::println("Sum of {} and {} is {}", 3, 5, 8);
// 输出：Sum of 3 and 5 is 8（自动换行）
```

**基本写法：C++23 if consteval**
`if consteval { }`
```cpp
// 编译期分支判断：仅在常量求值上下文中执行
constexpr int compute(int x) {
    if consteval {
        return x * 2;  // 编译期执行
    } else {
        return x + 1;  // 运行期执行
    }
}
```

**基本写法：C++23 多维下标运算符**
`operator[](size_t x, size_t y)`
```cpp
// 支持多维下标访问，简化矩阵类设计
class Matrix {
    int data[3][3];
public:
    // 多参数 operator[]
    int& operator[](size_t i, size_t j) {
        return data[i][j];
    }
};
Matrix m;
m[1, 2] = 42;  // 直接多维访问
```

**基本写法：C++23 static call operator**
`static operator()(<参数>) { }`
```cpp
// 静态调用运算符：无需实例即可调用
class Calculator {
public:
    static int operator()(int a, int b) {
        return a + b;
    }
};
// 直接通过类型名调用
int result = Calculator()(3, 4);  // 返回 7
```

**基本写法：C++26 = delete 原因**
`= delete("reason");`
```cpp
// = delete 支持说明删除原因
class NonCopyable {
public:
    NonCopyable() = default;
    // 禁用拷贝构造并说明原因
    NonCopyable(const NonCopyable&) = delete("该类不允许拷贝构造");
    NonCopyable& operator=(const NonCopyable&) = delete("该类不允许拷贝赋值");
};
```

**基本写法：C++26 pack indexing**
`typename...<T>[N]`
```cpp
// 模板参数包索引：直接访问参数包中第 N 个类型
template <typename... Ts>
using First = Ts...[0];  // 取参数包第一个类型
template <typename... Ts>
using Last = Ts...[sizeof...(Ts) - 1];  // 取参数包最后一个类型
// 使用
First<int, double, char> a = 10;   // a 为 int
Last<int, double, char> b = 3.14;  // b 为 double
```

**基本写法：C++26 hazard pointer**
`std::hazard_pointer<<T>>`
```cpp
// 危险指针：用于无锁数据结构的安全内存回收
#include <hazard_pointer>
// 获取危险指针
std::hazard_pointer hp = std::make_hazard_pointer();
// 保护对象指针，防止被回收
hp.protect(ptr);
// 操作受保护对象
if (hp.get() != nullptr) {
    hp.get()->do_something();
}
// 离开作用域自动释放保护
```

**基本写法：C++26 RCU(Read-Copy-Update)**
`std::rcu<<T>>`
```cpp
// RCU：读多写少场景的无锁同步原语
#include <rcu>
// 读端：在 RCU 域中安全访问共享数据
std::rcu_reader reader;
auto* p = shared_ptr.load();
if (p) p->read_data();
// 写端：复制更新后原子替换，并延迟回收旧数据
auto* new_data = new Data(*p);
new_data->update();
shared_ptr.store(new_data);
std::rcu_retire(p);  // 等待所有读者退出后回收
```
