# 函数详解

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 函数声明与定义

**基本写法：函数声明（原型）**
`<return_type> <func_name>(<parameter_list>);`
```c
// 声明函数原型
int add(int a, int b);
```

---

**无参写法：无参数函数声明**
`<return_type> <func_name>(void);`
```c
// 声明无参数函数
void print_message(void);
```

---

**基本写法：函数定义**
`<return_type> <func_name>(<parameter_list>) { ... return <expr>; }`
```c
// 定义加法函数
int add(int a, int b) {
    return a + b;
}
```

---

**无返回写法：void 函数定义**
`void <func_name>(<params>) { ... }`
```c
// 无返回值的函数
void print_message(void) {
    printf("Hello, Function!\n");
}
```

---

## 参数传递

**传值写法：传值调用**
`<return_type> <func>(<type> <param>) { ... }`
```c
// 修改形参不影响实参
void increment(int x) {
    x++;
}
```

---

**传址写法：传址调用**
`<return_type> <func>(<type> *<param>) { ... }`
```c
// 通过指针修改实参
void increment_by_address(int *x) {
    (*x)++;
}
```

---

**数组参数写法：数组作为参数**
`<return_type> <func>(<type> <arr>[], int <size>) { ... }`
```c
// 传递数组首地址和大小
void print_array(int arr[], int size) {
    for (int i = 0; i < size; i++) {
        printf("%d ", arr[i]);
    }
}
```

---

## 返回值

**基本写法：返回基本类型**
`return <expression>;`
```c
// 返回最大值
int max(int a, int b) {
    return (a > b) ? a : b;
}
```

---

**指针返回写法：返回指针**
`<type> *<func>(<params>) { ... return <ptr>; }`
```c
// 返回动态分配的内存
int *create_dynamic_array(int size) {
    return (int *)malloc(size * sizeof(int));
}
```

---

**提前返回写法：void 函数提前返回**
`return;`
```c
// 满足条件时提前返回
void check_number(int n) {
    if (n < 0) {
        printf("Negative!\n");
        return;
    }
    printf("Non-negative\n");
}
```

---

## 递归

**阶乘写法：递归计算阶乘**
`<return_type> <func>(<type> <param>) { if (<base>) return ...; return <recursive_call>; }`
```c
// 递归计算阶乘
long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

---

**斐波那契写法：递归计算斐波那契**
`<return_type> <func>(<type> <param>) { if (<base>) return ...; return <recursive1> + <recursive2>; }`
```c
// 递归计算斐波那契数列
int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
```

---

**二分查找写法：递归二分查找**
`int <search>(<type> <arr>[], int <low>, int <high>, <type> <target>) { ... }`
```c
// 递归实现二分查找
int binary_search(int arr[], int low, int high, int target) {
    if (low > high) return -1;
    int mid = low + (high - low) / 2;
    if (arr[mid] == target) return mid;
    else if (arr[mid] > target) return binary_search(arr, low, mid - 1, target);
    else return binary_search(arr, mid + 1, high, target);
}
```

---

## 存储类与作用域

**静态局部写法：静态局部变量**
`static <type> <var> = <value>;`
```c
// 仅首次调用时初始化
void counter() {
    static int count = 0;
    count++;
    printf("Count: %d\n", count);
}
```

---

**外部变量写法：extern 外部变量**
`extern <type> <var>;`
```c
// 声明外部变量
extern int global_var;
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

## 可变参数函数

**基本写法：可变参数函数定义**
`<return_type> <func>(<fixed_params>, ...) { ... }`
```c
#include <stdarg.h>
// 计算多个整数的和
int sum(int count, ...) {
    va_list valist;
    va_start(valist, count);
    int total = 0;
    for (int i = 0; i < count; i++) {
        total += va_arg(valist, int);
    }
    va_end(valist);
    return total;
}
```

---

## 内联函数

**基本写法：内联函数定义**
`inline <type> <func>(<params>) { ... }`
```c
// 内联函数可能被编译器内联展开
inline int max(int a, int b) {
    return a > b ? a : b;
}
```
