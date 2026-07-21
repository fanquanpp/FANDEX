# 枚举与typedef

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 枚举定义

**基本写法：枚举定义**
`enum <Name> { <MEM1>, <MEM2>, ... };`
```c
// 定义星期枚举
enum Weekday { MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY };
```

---

**自定义写法：指定枚举值**
`enum <Name> { <MEM1> = <val>, <MEM2>, ... };`
```c
// 从 1 开始递增
enum Months { JAN = 1, FEB, MAR, APR };
```

---

**分散写法：枚举值显式指定**
`enum <Name> { <MEM1> = <val>, <MEM2> = <val>, ... };`
```c
// 显式指定每个枚举值
enum Color { RED = 1, GREEN = 2, BLUE = 4 };
```

---

**typedef 写法：枚举别名**
`typedef enum { <members> } <Name>;`
```c
// 定义枚举类型别名
typedef enum { STATUS_OK, STATUS_ERROR, STATUS_PENDING } Status;
```

---

## 枚举变量

**基本写法：声明枚举变量**
`enum <Name> <var_name>;`
```c
// 声明枚举变量
enum Weekday today;
```

---

**初始化写法：声明并初始化**
`enum <Name> <var> = <MEMBER>;`
```c
// 初始化枚举变量
enum Weekday today = MONDAY;
```

---

**typedef 写法：使用别名声明**
`<TypeName> <var_name>;`
```c
// 使用类型别名声明
Status current_status = STATUS_OK;
```

---

## 枚举在 switch 中使用

**基本写法：switch 处理枚举**
`switch (<enum_var>) { case <MEM1>: ... break; ... }`
```c
// 使用 switch 处理枚举值
enum Weekday today = MONDAY;
switch (today) {
    case MONDAY:
        printf("Start of week\n");
        break;
    case FRIDAY:
        printf("End of week\n");
        break;
    default:
        printf("Middle of week\n");
}
```

---

## typedef 基本用法

**基本写法：为基本类型创建别名**
`typedef <existing_type> <new_name>;`
```c
// 为 unsigned int 创建别名
typedef unsigned int uint;
```

---

**基本写法：为指针类型创建别名**
`typedef <type> *<PtrName>;`
```c
// 为整型指针创建别名
typedef int *IntPtr;
```

---

**基本写法：为数组类型创建别名**
`typedef <type> (<ArrayName>)[<size>];`
```c
// 为整型数组创建别名
typedef int IntArray[10];
```

---

## typedef 与结构体

**基本写法：结构体别名**
`typedef struct { <members> } <Name>;`
```c
// 定义 Point 结构体类型
typedef struct {
    int x;
    int y;
} Point;
```

---

**基本写法：为已定义结构体创建别名**
`typedef struct <Name> <Alias>;`
```c
// 为结构体创建别名
struct Point { int x; int y; };
typedef struct Point Point;
```

---

## typedef 与枚举

**基本写法：枚举别名**
`typedef enum { <members> } <Name>;`
```c
// 定义枚举类型别名
typedef enum { RED, GREEN, BLUE } Color;
```

---

## typedef 与函数指针

**基本写法：函数指针类型别名**
`typedef <return_type> (*<FuncTypeName>)(<params>);`
```c
// 定义函数指针类型
typedef int (*Operation)(int, int);
```

---

**使用写法：使用函数指针类型**
`<FuncTypeName> <var> = <func_name>;`
```c
// 使用函数指针类型声明变量
Operation op = add;
```

---

## typedef 与联合体

**基本写法：联合体别名**
`typedef union { <members> } <Name>;`
```c
// 定义联合体类型别名
typedef union {
    int i;
    float f;
} Data;
```

---

## typedef 复杂类型

**基本写法：多维数组别名**
`typedef <type> (<ArrayName>)[<rows>][<cols>];`
```c
// 为二维数组创建别名
typedef int Matrix[3][3];
```

---

**基本写法：指向数组的指针别名**
`typedef <type> (*<PtrName>)[<size>];`
```c
// 为指向数组的指针创建别名
typedef int (*ArrayPtr)[5];
```

---

## 枚举与整数

**转换写法：枚举转整数**
`int <var> = <ENUM_MEMBER>;`
```c
// 枚举值隐式转换为整数
enum Color c = RED;
int value = c;
```

---

**转换写法：整数转枚举**
`enum <Name> <var> = (<enum_name>)<int_value>;`
```c
// 整数显式转换为枚举
enum Color c = (enum Color)1;
```

---

## 枚举大小

**基本写法：获取枚举大小**
`sizeof(enum <Name>)`
```c
// 查看枚举类型大小
enum Color { RED, GREEN, BLUE };
printf("Size: %zu\n", sizeof(enum Color));
```
