# 数据类型详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 整型

**基本写法：char 类型声明**
`char <var_name> = <value>;`
```c
// 1 字节字符型
char c = 'A';
```

---

**基本写法：short 类型声明**
`short <var_name> = <value>;`
```c
// 2 字节短整型
short s = 1000;
```

---

**基本写法：int 类型声明**
`int <var_name> = <value>;`
```c
// 4 字节整型
int i = 100000;
```

---

**基本写法：long 类型声明**
`long <var_name> = <value>L;`
```c
// 长整型
long l = 100000L;
```

---

**基本写法：unsigned 整型声明**
`unsigned <type> <var_name> = <value>;`
```c
// 无符号整型
unsigned int u = 100U;
```

---

## 浮点型

**基本写法：float 类型声明**
`float <var_name> = <value>f;`
```c
// 4 字节单精度浮点
float f = 3.14f;
```

---

**基本写法：double 类型声明**
`double <var_name> = <value>;`
```c
// 8 字节双精度浮点
double d = 3.14159;
```

---

**基本写法：long double 类型声明**
`long double <var_name> = <value>L;`
```c
// 长双精度浮点
long double ld = 3.14L;
```

---

## 布尔型

**基本写法：布尔型声明（C99+）**
`bool <var_name> = <true|false>;`
```c
#include <stdbool.h>
// 布尔类型变量
bool is_valid = true;
```

---

## 类型修饰符

**基本写法：signed 修饰符**
`signed <type> <var_name>;`
```c
// 有符号整型（默认）
signed int x = -10;
```

---

**基本写法：unsigned 修饰符**
`unsigned <type> <var_name>;`
```c
// 无符号整型
unsigned int y = 10;
```

---

**基本写法：const 修饰符**
`const <type> <var_name> = <value>;`
```c
// 只读常量
const int MAX_VALUE = 100;
```

---

**基本写法：volatile 修饰符**
`volatile <type> <var_name>;`
```c
// 防止编译器优化
volatile int sensor_value;
```

---

## sizeof 运算符

**基本写法：获取类型大小**
`sizeof(<type>)`
```c
// 获取 int 类型字节数
printf("int: %zu\n", sizeof(int));
```

---

**基本写法：获取变量大小**
`sizeof(<var>)`
```c
// 获取数组元素个数
int arr[10];
size_t count = sizeof(arr) / sizeof(arr[0]);
```

---

## 数组

**基本写法：一维数组声明**
`<type> <array_name>[<size>];`
```c
// 声明大小为 5 的整型数组
int numbers[5];
```

---

**初始化写法：一维数组完全初始化**
`<type> <array_name>[<size>] = {<values>};`
```c
// 完全初始化数组
int arr[5] = {1, 2, 3, 4, 5};
```

---

**自动推断写法：一维数组**
`<type> <array_name>[] = {<values>};`
```c
// 自动推断数组大小为 3
int arr[] = {10, 20, 30};
```

---

**基本写法：二维数组声明**
`<type> <array_name>[<rows>][<cols>];`
```c
// 声明 3x3 矩阵
int matrix[3][3];
```

---

## 指针

**基本写法：指针声明与初始化**
`<type> *<ptr_name> = &<var>;`
```c
// ptr 指向 x 的地址
int x = 10;
int *ptr = &x;
```

---

**解引用写法：通过指针访问值**
`*<ptr>`
```c
// 解引用获取指针指向的值
int x = 10;
int *ptr = &x;
printf("值: %d\n", *ptr);
```

---

## 结构体

**基本写法：结构体定义**
`typedef struct { <members> } <Name>;`
```c
// 定义 Employee 结构体类型
typedef struct {
    int id;
    char name[50];
    float salary;
} Employee;
```

---

**初始化写法：结构体变量初始化**
`<Name> <var> = {<values>};`
```c
// 初始化结构体变量
Employee emp = {101, "John Doe", 5000.0};
```

---

## 联合体

**基本写法：联合体定义**
`union <Name> { <members> };`
```c
// 定义联合体
union Data {
    int i;
    float f;
    char str[20];
};
```

---

## 枚举

**基本写法：枚举定义**
`enum <Name> { <MEM1>, <MEM2>, ... };`
```c
// 定义星期枚举
enum Weekday { MONDAY, TUESDAY, WEDNESDAY };
```

---

**自定义写法：指定枚举值**
`enum <Name> { <MEM1> = <val>, <MEM2> = <val>, ... };`
```c
// 显式指定枚举值
enum Color { RED = 1, GREEN = 2, BLUE = 4 };
```

---

## 空类型

**基本写法：void 函数返回类型**
`void <func_name>(<params>) { ... }`
```c
// 无返回值的函数
void print_hello() {
    printf("Hello!\n");
}
```

---

**基本写法：void 函数参数**
`<type> <func_name>(void) { ... }`
```c
// 明确表示无参数
int main(void) {
    return 0;
}
```

---

**基本写法：void 通用指针**
`void *<ptr_name>;`
```c
// 可以指向任何类型的通用指针
void *generic_ptr;
```

---

## 类型转换

**隐式写法：自动类型转换**
`<type> <var> = <other_type_var>;`
```c
// int 隐式转换为 double
int x = 10;
double y = x;
```

---

**显式写法：强制类型转换**
`(<target_type>)<expression>`
```c
// double 显式转换为 int
double pi = 3.14159;
int rounded_pi = (int)pi;
```

---

**指针转换写法：指针类型转换**
`(<target_type> *)<ptr>`
```c
// void 指针转换为 int 指针
void *ptr = &x;
int *int_ptr = (int *)ptr;
```

---

## typedef 类型别名

**基本写法：为基本类型创建别名**
`typedef <existing_type> <new_name>;`
```c
// 为 unsigned int 创建别名
typedef unsigned int uint;
```

---

**基本写法：为结构体创建别名**
`typedef struct { <members> } <Name>;`
```c
// 定义 Point 结构体别名
typedef struct {
    int x;
    int y;
} Point;
```

---

## 标准固定宽度整数

**基本写法：stdint.h 固定宽度类型**
`#include <stdint.h>`
```c
// 包含固定宽度整数类型定义
#include <stdint.h>
```

---

**基本写法：8 位整数声明**
`int8_t <var>;` 或 `uint8_t <var>;`
```c
// 有符号和无符号 8 位整数
int8_t s8 = -1;
uint8_t u8 = 255;
```

---

**基本写法：32 位整数声明**
`int32_t <var>;` 或 `uint32_t <var>;`
```c
// 有符号和无符号 32 位整数
int32_t s32 = -1000;
uint32_t u32 = 1000;
```
