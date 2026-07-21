# 动态内存管理

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## malloc 分配内存

**基本写法：分配单个变量内存**
`<type> *<ptr> = (<type> *)malloc(sizeof(<type>));`
```c
#include <stdlib.h>
// 分配单个整型变量的内存
int *p = (int *)malloc(sizeof(int));
```

---

**数组写法：分配数组内存**
`<type> *<ptr> = (<type> *)malloc(<count> * sizeof(<type>));`
```c
#include <stdlib.h>
// 分配 10 个整型元素的数组内存
int *arr = (int *)malloc(10 * sizeof(int));
```

---

**检查写法：检查分配是否成功**
`if (<ptr> == NULL) { ... }`
```c
// 检查内存分配是否成功
int *p = (int *)malloc(sizeof(int));
if (p == NULL) {
    printf("Memory allocation failed\n");
    exit(1);
}
```

---

## calloc 分配并清零

**基本写法：分配并初始化为 0**
`<type> *<ptr> = (<type> *)calloc(<count>, sizeof(<type>));`
```c
#include <stdlib.h>
// 分配 10 个整型元素并初始化为 0
int *arr = (int *)calloc(10, sizeof(int));
```

---

## realloc 调整内存大小

**基本写法：重新调整内存大小**
`<type> *<new_ptr> = (<type> *)realloc(<ptr>, <new_size> * sizeof(<type>));`
```c
#include <stdlib.h>
// 将数组大小调整为 20
int *new_arr = (int *)realloc(arr, 20 * sizeof(int));
```

---

**安全写法：使用临时变量接收 realloc 结果**
`<type> *<tmp> = (<type> *)realloc(<ptr>, <new_size>); if (<tmp>) { <ptr> = <tmp>; }`
```c
// 使用临时变量避免分配失败时丢失原指针
int *tmp = (int *)realloc(arr, 20 * sizeof(int));
if (tmp != NULL) {
    arr = tmp;
}
```

---

## free 释放内存

**基本写法：释放内存**
`free(<ptr>);`
```c
#include <stdlib.h>
// 释放动态分配的内存
free(p);
```

---

**安全写法：释放后置空**
`free(<ptr>); <ptr> = NULL;`
```c
// 释放内存后将指针置空
free(p);
p = NULL;
```

---

## 动态数组

**创建写法：创建动态数组**
`<type> *<arr> = (<type> *)malloc(<size> * sizeof(<type>));`
```c
#include <stdlib.h>
// 创建动态整型数组
int size = 10;
int *arr = (int *)malloc(size * sizeof(int));
```

---

**访问写法：访问动态数组元素**
`<arr>[<index>]`
```c
// 访问动态数组元素
arr[0] = 10;
arr[1] = 20;
```

---

**扩容写法：动态数组扩容**
`<type> *<new_arr> = (<type> *)realloc(<arr>, <new_size> * sizeof(<type>));`
```c
// 将动态数组从 10 扩容到 20
int *new_arr = (int *)realloc(arr, 20 * sizeof(int));
if (new_arr != NULL) {
    arr = new_arr;
    size = 20;
}
```

---

## 动态结构体

**分配写法：分配结构体内存**
`<StructType> *<ptr> = (<StructType> *)malloc(sizeof(<StructType>));`
```c
#include <stdlib.h>
// 分配结构体内存
typedef struct { int x; int y; } Point;
Point *p = (Point *)malloc(sizeof(Point));
```

---

**成员访问写法：通过指针访问结构体成员**
`<ptr>-><member>`
```c
// 通过指针访问结构体成员
p->x = 10;
p->y = 20;
```

---

**数组写法：分配结构体数组**
`<StructType> *<arr> = (<StructType> *)malloc(<count> * sizeof(<StructType>));`
```c
// 分配结构体数组
Point *points = (Point *)malloc(5 * sizeof(Point));
```

---

## 动态字符串

**分配写法：分配字符串内存**
`char *<str> = (char *)malloc(<size> * sizeof(char));`
```c
#include <stdlib.h>
// 分配字符串内存
char *str = (char *)malloc(100 * sizeof(char));
```

---

**复制写法：复制字符串到动态内存**
`strcpy(<dest>, <src>);`
```c
#include <string.h>
// 复制字符串到动态内存
char *str = (char *)malloc(100 * sizeof(char));
strcpy(str, "Hello");
```

---

## 二维动态数组

**分配写法：分配二维数组**
`<type> **<arr> = (<type> **)malloc(<rows> * sizeof(<type> *));`
```c
#include <stdlib.h>
// 分配行指针数组
int rows = 3;
int **arr = (int **)malloc(rows * sizeof(int *));
```

---

**行分配写法：为每行分配内存**
`<arr>[<i>] = (<type> *)malloc(<cols> * sizeof(<type>));`
```c
// 为每行分配列内存
int cols = 4;
for (int i = 0; i < rows; i++) {
    arr[i] = (int *)malloc(cols * sizeof(int));
}
```

---

**访问写法：访问二维动态数组元素**
`<arr>[<row>][<col>]`
```c
// 访问二维动态数组元素
arr[0][0] = 1;
arr[1][2] = 5;
```

---

**释放写法：释放二维动态数组**
`for (...) { free(<arr>[<i>]); } free(<arr>);`
```c
// 先释放每行，再释放行指针数组
for (int i = 0; i < rows; i++) {
    free(arr[i]);
}
free(arr);
```

---

## 内存泄漏检测

**基本写法：使用 valgrind 检测内存泄漏**
`valgrind --leak-check=full ./<program>`
```bash
# 使用 valgrind 检测内存泄漏
valgrind --leak-check=full ./myprogram
```

---

## 内存管理最佳实践

**配对写法：每个 malloc 对应一个 free**
`<type> *<ptr> = malloc(...); ... free(<ptr>);`
```c
// 确保每个 malloc 都有对应的 free
int *p = (int *)malloc(sizeof(int));
// 使用 p
free(p);
p = NULL;
```

---

**错误处理写法：分配失败时清理**
`if (<ptr> == NULL) { free(<other_ptr>); return; }`
```c
// 分配失败时清理已分配的内存
int *a = (int *)malloc(10 * sizeof(int));
int *b = (int *)malloc(20 * sizeof(int));
if (b == NULL) {
    free(a);
    return;
}
```
