# 命名空间与链接

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 命名空间定义

**基本写法：定义命名空间**
`namespace <name> { ... }`
```cpp
// 定义命名空间
namespace MyMath {
    int add(int a, int b) { return a + b; }
}
```

---

**嵌套写法：嵌套命名空间**
`namespace <outer> { namespace <inner> { ... } }`
```cpp
// 嵌套命名空间
namespace Outer {
    namespace Inner {
        int value = 10;
    }
}
```

---

**C++17 写法：嵌套命名空间简化**
`namespace <outer>::<inner> { ... }`
```cpp
// C++17 嵌套命名空间简化写法
namespace Outer::Inner {
    int value = 10;
}
```

---

## 使用命名空间

**基本写法：使用整个命名空间**
`using namespace <name>;`
```cpp
// 使用标准命名空间
using namespace std;
```

---

**特定成员写法：使用命名空间中的特定成员**
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

**作用域写法：命名空间别名**
`namespace <alias> = <original>;`
```cpp
// 命名空间别名
namespace fs = std::filesystem;
```

---

## 内部链接

**static 写法：内部链接变量**
`static <type> <var_name> = <value>;`
```cpp
// static 全局变量，仅当前文件可见
static int file_count = 0;
```

---

**static 写法：内部链接函数**
`static <return_type> <func>(<params>) { ... }`
```cpp
// static 函数，仅当前文件可见
static void helper() {
    // 内部辅助函数
}
```

---

**匿名命名空间写法：匿名命名空间**
`namespace { ... }`
```cpp
// 匿名命名空间，内容仅当前文件可见
namespace {
    int internal_var = 10;
}
```

---

## 外部链接

**extern 写法：外部变量声明**
`extern <type> <var_name>;`
```cpp
// 声明在其他文件中定义的外部变量
extern int global_var;
```

---

**extern 写法：外部变量定义**
`<type> <var_name> = <value>;`
```cpp
// 定义外部变量（其他文件可通过 extern 访问）
int global_var = 100;
```

---

**extern 写法：外部函数声明**
`extern <return_type> <func>(<params>);`
```cpp
// 声明外部函数
extern void external_function();
```

---

**extern "C" 写法：C 链接**
`extern "C" <return_type> <func>(<params>);`
```cpp
// 使用 C 链接，避免名称修饰
extern "C" void c_function(int arg);
```

---

**extern "C" 块写法：C 链接块**
`extern "C" { ... }`
```cpp
// 多个函数使用 C 链接
extern "C" {
    void func1();
    void func2();
}
```

---

## inline 命名空间

**基本写法：inline 命名空间**
`inline namespace <name> { ... }`
```cpp
// inline 命名空间，成员直接暴露到外层
inline namespace V1 {
    void func() {}
}
```

---

## 链接属性

**基本写法：查看符号链接属性**
`nm <object_file>`
```bash
# 查看目标文件的符号表
nm myprogram.o
```

---

**extern template 写法：显式实例化声明**
`extern template class <ClassName><<type>>;`
```cpp
// 显式实例化声明，避免重复实例化
extern template class std::vector<int>;
```

---

**显式实例化写法：显式实例化定义**
`template class <ClassName><<type>>;`
```cpp
// 显式实例化定义
template class std::vector<int>;
```

---

## 头文件与源文件分离

**头文件写法：声明放在头文件**
`// header.h: <return_type> <func>(<params>);`
```cpp
// header.h
#ifndef MY_HEADER_H
#define MY_HEADER_H
void my_function();
#endif
```

---

**源文件写法：定义放在源文件**
`// source.cpp: <return_type> <func>(<params>) { ... }`
```cpp
// source.cpp
#include "header.h"
void my_function() {
    // 函数实现
}
```

---

## 编译与链接

**编译写法：编译为目标文件**
`g++ -c <source.cpp> -o <object.o>`
```bash
# 编译 source.cpp 生成目标文件
g++ -c source.cpp -o source.o
```

---

**链接写法：链接多个目标文件**
`g++ <file1.o> <file2.o> -o <output>`
```bash
# 链接多个目标文件生成可执行文件
g++ main.o utils.o -o program
```
