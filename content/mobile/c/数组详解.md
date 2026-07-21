# 数组详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 一维数组

**基本写法：数组声明**
`<type> <array_name>[<size>];`
```c
// 声明大小为 5 的整型数组
int numbers[5];
```

---

**完全初始化写法：数组初始化**
`<type> <array_name>[<size>] = {<values>};`
```c
// 完全初始化数组
int arr[5] = {1, 2, 3, 4, 5};
```

---

**部分初始化写法：部分初始化**
`<type> <array_name>[<size>] = {<values>};`
```c
// 部分初始化，其余元素为 0
int arr[5] = {1, 2, 3};
```

---

**自动推断写法：省略大小**
`<type> <array_name>[] = {<values>};`
```c
// 自动推断数组大小为 3
int arr[] = {10, 20, 30};
```

---

**清零写法：全部初始化为 0**
`<type> <array_name>[<size>] = {0};`
```c
// 所有元素初始化为 0
int arr[10] = {0};
```

---

**访问写法：访问数组元素**
`<array_name>[<index>]`
```c
// 访问数组第一个元素
int arr[5] = {10, 20, 30, 40, 50};
printf("%d\n", arr[0]);
```

---

**遍历写法：遍历数组**
`for (int i = 0; i < <size>; i++) { ... }`
```c
// 遍历打印数组元素
int arr[5] = {1, 2, 3, 4, 5};
for (int i = 0; i < 5; i++) {
    printf("arr[%d] = %d\n", i, arr[i]);
}
```

---

**计算大小写法：计算数组元素个数**
`sizeof(<array>) / sizeof(<array>[0])`
```c
// 计算数组元素个数
int arr[] = {1, 2, 3, 4, 5};
int size = sizeof(arr) / sizeof(arr[0]);
```

---

## 多维数组

**基本写法：二维数组声明与初始化**
`<type> <array_name>[<rows>][<cols>] = { {<values>}, ... };`
```c
// 完整初始化二维数组
int matrix[2][3] = {
    {1, 2, 3},
    {4, 5, 6}
};
```

---

**访问写法：访问二维数组元素**
`<array_name>[<row>][<col>]`
```c
// 访问第二行第三列元素
int matrix[2][3] = {{1, 2, 3}, {4, 5, 6}};
printf("%d\n", matrix[1][2]);
```

---

**遍历写法：遍历二维数组**
`for (int i = 0; i < <rows>; i++) { for (int j = 0; j < <cols>; j++) { ... } }`
```c
// 遍历二维数组
int matrix[2][3] = {{1, 2, 3}, {4, 5, 6}};
for (int i = 0; i < 2; i++) {
    for (int j = 0; j < 3; j++) {
        printf("%d ", matrix[i][j]);
    }
}
```

---

**三维写法：三维数组**
`<type> <array_name>[<depth>][<rows>][<cols>];`
```c
// 声明三维数组
int cube[2][2][2] = {
    {{1, 2}, {3, 4}},
    {{5, 6}, {7, 8}}
};
```

---

**函数参数写法：多维数组作为函数参数**
`<return_type> <func>(<type> <arr>[][<cols>], int <rows>) { ... }`
```c
// 需要指定除第一维外的所有维度大小
void print_matrix(int matrix[][3], int rows) {
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < 3; j++) {
            printf("%d ", matrix[i][j]);
        }
    }
}
```

---

## 字符数组与字符串

**字符数组写法：字符数组定义**
`char <array_name>[<size>] = {<chars>};`
```c
// 普通字符数组
char chars[5] = {'H', 'e', 'l', 'l', 'o'};
```

---

**字符串写法：字符串初始化**
`char <str>[] = "<string>";`
```c
// 自动包含 '\0'，大小为 6
char str[] = "Hello";
```

---

**strlen 写法：计算字符串长度**
`strlen(<str>)`
```c
#include <string.h>
// 计算字符串长度
char src[] = "Hello";
int len = strlen(src);
```

---

**strcpy 写法：复制字符串**
`strcpy(<dest>, <src>)`
```c
#include <string.h>
// 复制字符串
char dest[50];
char src[] = "Hello";
strcpy(dest, src);
```

---

**strcat 写法：连接字符串**
`strcat(<dest>, <src>)`
```c
#include <string.h>
// 连接字符串
char dest[50] = "Hello";
strcat(dest, " World");
```

---

**strcmp 写法：比较字符串**
`strcmp(<str1>, <str2>)`
```c
#include <string.h>
// 比较字符串，0 相等，<0 小于，>0 大于
int result = strcmp("abc", "abd");
```

---

**fgets 写法：读取一行字符串**
`fgets(<str>, <size>, stdin)`
```c
// 读取一行（包括空格）
char str[100];
fgets(str, sizeof(str), stdin);
```

---

## 数组与指针

**基本写法：数组名与指针的关系**
`<array_name>` 等同于 `&<array_name>[0]`
```c
// 数组名即首元素地址
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
```

---

**指针算术写法：指针访问数组**
`*(<ptr> + <n>)`
```c
// 使用指针算术访问数组元素
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;
printf("%d\n", *(p + 1));
```

---

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

## 变长数组（VLA，C99+）

**基本写法：运行时确定数组大小**
`<type> <array_name>[<variable>];`
```c
// 数组大小由参数决定
void func(int n) {
    int arr[n];
}
```

---

## 动态数组

**malloc 写法：创建动态数组**
`<type> *<ptr> = (<type> *)malloc(<size> * sizeof(<type>));`
```c
#include <stdlib.h>
// 动态分配数组
int size = 10;
int *arr = (int *)malloc(size * sizeof(int));
```

---

**realloc 写法：动态调整数组大小**
`<type> *<new_ptr> = (<type> *)realloc(<ptr>, <new_size> * sizeof(<type>));`
```c
#include <stdlib.h>
// 重新调整数组大小
int *new_arr = (int *)realloc(arr, 20 * sizeof(int));
```

---

## 数组排序

**冒泡排序写法：冒泡排序实现**
`void <sort>(<type> <arr>[], int <size>) { ... }`
```c
// 冒泡排序算法
void bubble_sort(int arr[], int size) {
    for (int i = 0; i < size - 1; i++) {
        for (int j = 0; j < size - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}
```

---

**二分查找写法：二分查找实现**
`int <search>(<type> <arr>[], int <low>, int <high>, <type> <target>) { ... }`
```c
// 二分查找算法
int binary_search(int arr[], int low, int high, int target) {
    if (low > high) return -1;
    int mid = low + (high - low) / 2;
    if (arr[mid] == target) return mid;
    else if (arr[mid] > target) return binary_search(arr, low, mid - 1, target);
    else return binary_search(arr, mid + 1, high, target);
}
```
