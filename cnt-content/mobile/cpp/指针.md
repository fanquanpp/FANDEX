# 指针

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 指针基础

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

**解引用写法：通过指针访问值**
`*<ptr_name>`
```cpp
// 解引用获取指针指向的值
int x = 10;
int* ptr = &x;
std::cout << *ptr << std::endl;
```

---

**修改写法：通过指针修改值**
`*<ptr_name> = <new_value>;`
```cpp
// 通过指针修改变量的值
int x = 10;
int* ptr = &x;
*ptr = 20;
```

---

## const 指针

**指向常量的指针写法**
`const <type>* <ptr_name>;`
```cpp
// 不能通过指针修改所指向的值
const int* p1;
```

---

**常量指针写法**
`<type>* const <ptr_name> = &<var>;`
```cpp
// 指针本身不能改变指向
int x = 10;
int* const p3 = &x;
```

---

**双重 const 写法**
`const <type>* const <ptr_name> = &<var>;`
```cpp
// 既不能修改值，也不能修改指针
int x = 10;
const int* const p4 = &x;
```

---

## 指针与数组

**基本写法：数组名作为指针**
`<type>* <ptr> = <array_name>;`
```cpp
// 数组名即首元素地址
int arr[5] = {1, 2, 3, 4, 5};
int* p = arr;
```

---

**指针算术写法：指针加减运算**
`<ptr> + <n>`
```cpp
// 指针向后移动 n 个元素
int arr[5] = {1, 2, 3, 4, 5};
int* p = arr;
int* q = p + 2;
```

---

**下标写法：指针下标访问**
`<ptr>[<index>]`
```cpp
// 指针使用下标访问
int arr[5] = {1, 2, 3, 4, 5};
int* p = arr;
std::cout << p[2] << std::endl;
```

---

## 动态内存分配

**new 写法：分配单个变量**
`<type>* <ptr> = new <type>(<value>);`
```cpp
// 动态分配单个变量
int* p = new int(10);
```

---

**new 写法：分配数组**
`<type>* <ptr> = new <type>[<size>];`
```cpp
// 动态分配数组
int* arr = new int[10];
```

---

**delete 写法：释放单个变量**
`delete <ptr>;`
```cpp
// 释放动态分配的单个变量
delete p;
```

---

**delete[] 写法：释放数组**
`delete[] <ptr>;`
```cpp
// 释放动态分配的数组
delete[] arr;
```

---

## 智能指针

**unique_ptr 写法：独占所有权**
`std::unique_ptr<<type>> <ptr> = std::make_unique<<type>>(<args>);`
```cpp
#include <memory>
// 独占所有权的智能指针
std::unique_ptr<int> p = std::make_unique<int>(10);
```

---

**shared_ptr 写法：共享所有权**
`std::shared_ptr<<type>> <ptr> = std::make_shared<<type>>(<args>);`
```cpp
#include <memory>
// 共享所有权的智能指针
std::shared_ptr<int> p = std::make_shared<int>(10);
```

---

**weak_ptr 写法：弱引用**
`std::weak_ptr<<type>> <ptr> = <shared_ptr>;`
```cpp
#include <memory>
// 弱引用，不增加引用计数
std::shared_ptr<int> shared = std::make_shared<int>(10);
std::weak_ptr<int> weak = shared;
```

---

**移动写法：转移 unique_ptr 所有权**
`std::unique_ptr<<type>> <new_ptr> = std::move(<old_ptr>);`
```cpp
#include <memory>
// 转移 unique_ptr 所有权
std::unique_ptr<int> p1 = std::make_unique<int>(10);
std::unique_ptr<int> p2 = std::move(p1);
```

---

## 函数指针

**基本写法：函数指针定义**
`<return_type> (*<ptr_name>)(<parameter_list>);`
```cpp
// 定义函数指针
int (*add_ptr)(int, int);
```

---

**using 写法：使用类型别名定义函数指针**
`using <FuncType> = <return_type>(*)(<params>);`
```cpp
// 使用 using 定义函数指针类型
using Operation = int (*)(int, int);
```

---

**调用写法：通过函数指针调用**
`<result> = <func_ptr>(<args>);`
```cpp
// 通过函数指针调用函数
int result = add_ptr(10, 20);
```

---

## 多级指针

**二级指针写法**
`<type>** <ptr_name>;`
```cpp
// 二级指针
int x = 10;
int* p = &x;
int** pp = &p;
```

---

**访问写法：解引用二级指针**
`**<ptr_name>`
```cpp
// 通过二级指针访问原始值
int x = 10;
int* p = &x;
int** pp = &p;
std::cout << **pp << std::endl;
```

---

## 指针与结构体

**基本写法：指向结构体的指针**
`<StructType>* <ptr_name> = &<var>;`
```cpp
// 指向结构体的指针
struct Point { int x; int y; };
Point p = {10, 20};
Point* ptr = &p;
```

---

**成员访问写法：通过指针访问成员**
`<ptr>-><member>`
```cpp
// 使用 -> 访问结构体成员
std::cout << ptr->x << std::endl;
```

---

## void 指针

**基本写法：void 指针声明**
`void* <ptr_name>;`
```cpp
// 通用指针
void* generic_ptr;
int x = 10;
generic_ptr = &x;
```

---

**转换写法：void 指针类型转换**
`static_cast<<type>*>(<void_ptr>)`
```cpp
// void 指针转换为具体类型指针
void* ptr = &x;
int* int_ptr = static_cast<int*>(ptr);
```

---

## 指针常见陷阱

**野指针写法：未初始化的指针**
`<type>* <ptr>;` （危险）
```cpp
// 危险：未初始化的指针
int* ptr;
// *ptr = 10; // 未定义行为
```

---

**悬空指针写法：释放后仍使用**
`delete <ptr>; <ptr> = nullptr;`
```cpp
// 释放后将指针置空
delete p;
p = nullptr;
```
