# 指针深度解析

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 指针基础

**基本写法：指针声明与初始化**
`<type> *<ptr_name> = &<var>;`
```c
// ptr 指向 x 的地址
int x = 10;
int *ptr = &x;
```

---

**基本写法：指针声明（未初始化）**
`<type> *<ptr_name>;`
```c
// 声明未初始化的指针
int *ptr;
```

---

**空指针写法：初始化为 NULL**
`<type> *<ptr_name> = NULL;`
```c
// 初始化为空指针
int *ptr = NULL;
```

---

**解引用写法：通过指针读取值**
`*<ptr>`
```c
// 解引用获取指针指向的值
int x = 10;
int *ptr = &x;
printf("值: %d\n", *ptr);
```

---

**解引用写法：通过指针修改值**
`*<ptr> = <new_value>;`
```c
// 通过指针修改变量的值
int x = 10;
int *ptr = &x;
*ptr = 20;
```

---

**取地址写法：获取变量地址**
`&<var>`
```c
// 获取变量地址
int x = 10;
printf("地址: %p\n", (void*)&x);
```

---

## 指针类型

**基本写法：不同类型指针**
`<type> *<ptr_name>;`
```c
// 不同类型的指针
int *int_ptr;
char *char_ptr;
double *double_ptr;
```

---

**void 指针写法：通用指针**
`void *<ptr_name>;`
```c
// 可以指向任何类型的通用指针
void *generic_ptr;
int x = 10;
generic_ptr = &x;
```

---

**void 指针转换写法：类型转换**
`(<target_type> *)<void_ptr>`
```c
// void 指针转换为具体类型指针
void *ptr = &x;
int *int_ptr = (int *)ptr;
```

---

**const 指针写法：指向常量的指针**
`const <type> *<ptr_name>;`
```c
// 不能通过指针修改所指向的值
const int *p1;
```

---

**常量指针写法：指针本身为常量**
`<type> * const <ptr_name> = &<var>;`
```c
// 指针本身不能改变指向
int x = 10;
int* const p3 = &x;
```

---

**双重 const 写法：指向常量的常量指针**
`const <type> * const <ptr_name> = &<var>;`
```c
// 既不能修改值，也不能修改指针
int x = 10;
const int* const p4 = &x;
```

---

## 指针与数组

**基本写法：数组名作为指针**
`<type> *<ptr> = <array_name>;`
```c
// 数组名即首元素地址
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
```

---

**指针算术写法：指针加减运算**
`<ptr> + <n>` 或 `<ptr> - <n>`
```c
// 指针向后移动 n 个元素
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
int *q = p + 2;
```

---

**自增写法：指针自增**
`<ptr>++` 或 `++<ptr>`
```c
// 指针指向下一个元素
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
p++;
```

---

**指针差写法：计算两个指针间元素个数**
`<ptr1> - <ptr2>`
```c
// 计算指针间元素个数
int arr[5] = {1, 2, 3, 4, 5};
int *p1 = &arr[0];
int *p2 = &arr[3];
int diff = p2 - p1;
```

---

**下标写法：指针下标访问**
`<ptr>[<index>]`
```c
// 指针使用下标访问
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
printf("%d\n", p[2]);
```

---

## 指针数组与数组指针

**指针数组写法：存储指针的数组**
`<type> *<array_name>[<size>];`
```c
// 指针数组
int *ptr_array[3];
int a = 10, b = 20, c = 30;
ptr_array[0] = &a;
```

---

**数组指针写法：指向数组的指针**
`<type> (*<ptr_name>)[<size>];`
```c
// 指向整个数组的指针
int arr[5] = {1, 2, 3, 4, 5};
int (*p)[5] = &arr;
```

---

## 字符串指针

**基本写法：字符串指针**
`char *<str> = "<string>";`
```c
// 字符串指针指向字符串常量
char *str = "Hello C";
```

---

**字符数组写法：字符数组**
`char <str>[] = "<string>";`
```c
// 字符数组存储字符串
char str[] = "Hello C";
```

---

**遍历写法：使用指针遍历字符串**
`while (*<ptr> != '\0') { ... <ptr>++; }`
```c
// 使用指针遍历字符串
char *str = "Hello";
while (*str != '\0') {
    printf("%c", *str);
    str++;
}
```

---

## 函数指针

**基本写法：函数指针定义**
`<return_type> (*<ptr_name>)(<parameter_list>);`
```c
// 定义函数指针
int (*add_ptr)(int, int);
```

---

**赋值写法：函数指针赋值**
`<func_ptr> = <func_name>;`
```c
// 将函数地址赋给指针
add_ptr = add;
```

---

**调用写法：通过函数指针调用**
`<result> = <func_ptr>(<args>);`
```c
// 通过函数指针调用函数
int result = add_ptr(10, 20);
```

---

**typedef 写法：定义回调函数类型**
`typedef <return_type> (*<CallbackName>)(<params>);`
```c
// 定义回调函数类型
typedef void (*Callback)(int);
```

---

**回调写法：使用回调函数**
`void <func>(<type> <arr>[], int <size>, <CallbackType> <callback>) { ... }`
```c
// 执行回调的函数
void process_array(int arr[], int size, Callback callback) {
    for (int i = 0; i < size; i++) {
        callback(arr[i]);
    }
}
```

---

**数组写法：函数指针数组**
`<return_type> (*<array_name>[])(<params>) = { <func1>, <func2>, ... };`
```c
// 函数指针数组
int (*operations[])(int, int) = {add, subtract, multiply};
```

---

## 多级指针

**二级指针写法：指向指针的指针**
`<type> **<ptr_name>;`
```c
// 二级指针
int x = 10;
int *p = &x;
int **pp = &p;
```

---

**二级指针访问写法：解引用二级指针**
`**<ptr_name>`
```c
// 通过二级指针访问原始值
int x = 10;
int *p = &x;
int **pp = &p;
printf("%d\n", **pp);
```

---

**三级指针写法：三级指针**
`<type> ***<ptr_name>;`
```c
// 三级指针
int x = 10;
int *p = &x;
int **pp = &p;
int ***ppp = &pp;
```

---

## 动态内存分配

**malloc 写法：分配内存**
`<type> *<ptr> = (<type> *)malloc(<size> * sizeof(<type>));`
```c
#include <stdlib.h>
// 分配单个变量的内存
int *p = (int *)malloc(sizeof(int));
```

---

**calloc 写法：分配并清零**
`<type> *<ptr> = (<type> *)calloc(<count>, sizeof(<type>));`
```c
#include <stdlib.h>
// 分配数组并初始化为 0
int *arr = (int *)calloc(10, sizeof(int));
```

---

**realloc 写法：重新分配内存**
`<type> *<new_ptr> = (<type> *)realloc(<ptr>, <new_size> * sizeof(<type>));`
```c
#include <stdlib.h>
// 重新调整内存大小
int *new_arr = (int *)realloc(arr, 20 * sizeof(int));
```

---

**free 写法：释放内存**
`free(<ptr>);`
```c
#include <stdlib.h>
// 释放动态分配的内存
free(p);
```

---

## 指针与结构体

**基本写法：指向结构体的指针**
`<StructType> *<ptr_name> = &<var>;`
```c
// 指向结构体的指针
typedef struct { int x; int y; } Point;
Point p = {10, 20};
Point *ptr = &p;
```

---

**成员访问写法：通过指针访问成员**
`<ptr>-><member>`
```c
// 使用 -> 访问结构体成员
printf("x: %d\n", ptr->x);
```

---

## 指针常见陷阱

**野指针写法：未初始化的指针**
`<type> *<ptr>;` （危险）
```c
// 危险：未初始化的指针
int *ptr;
// *ptr = 10; // 未定义行为
```

---

**悬空指针写法：释放后仍使用**
`free(<ptr>); <ptr> = NULL;`
```c
// 释放后将指针置空
free(p);
p = NULL;
```
