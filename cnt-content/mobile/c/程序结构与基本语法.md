# 程序结构与基本语法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 源文件结构

**基本写法：包含头文件**
`#include <<header>>`
```c
// 包含标准输入输出头文件
#include <stdio.h>
```

---

**基本写法：宏定义**
`#define <NAME> <value>`
```c
// 定义圆周率常量
#define PI 3.14159
```

---

**基本写法：类型定义**
`typedef <type> <new_name>;`
```c
// 为 unsigned int 创建别名
typedef unsigned int uint;
```

---

**基本写法：全局变量声明**
`<type> <var_name> = <value>;`
```c
// 声明全局变量并初始化
int global_count = 0;
```

---

**基本写法：函数原型声明**
`<return_type> <func_name>(<parameter_list>);`
```c
// 声明函数原型
void print_hello();
```

---

**基本写法：主函数入口**
`int main() { ... return 0; }`
```c
// 程序主入口
int main() {
    int local_val = 10;
    printf("Value: %d\n", local_val);
    return 0;
}
```

---

**基本写法：函数实现**
`<return_type> <func_name>(<parameter_list>) { ... }`
```c
// 函数具体实现
void print_hello() {
    printf("Hello!\n");
}
```

---

## 头文件保护

**基本写法：防止重复包含**
`#ifndef <HEADER_H> / #define <HEADER_H> / ... / #endif`
```c
// 头文件保护宏
#ifndef MY_HEADER_H
#define MY_HEADER_H
void my_function();
#endif /* MY_HEADER_H */
```

---

## 注释

**单行写法：行内注释**
`// <注释内容>`
```c
// 这是一个单行注释
int x = 10;
```

---

**单行写法：行尾注释**
`<code> // <注释内容>`
```c
// 行尾注释说明变量用途
int x = 10; // 计数器变量
```

---

**多行写法：块注释**
`/* <注释内容> */`
```c
/*
 * 这是一个多行注释
 * 可以跨越多行
 */
int y = 20;
```

---

**文档写法：Doxygen 格式**
`/** @brief <描述> @param <参数> <说明> @return <返回值> */`
```c
/**
 * @brief 计算圆的面积
 * @param radius 圆的半径
 * @return 圆的面积
 */
double calculate_area(double radius) {
    return PI * radius * radius;
}
```

---

## 主函数

**无参写法：无参数主函数**
`int main() { ... return 0; }`
```c
// 无参数形式的 main 函数
int main() {
    printf("Hello\n");
    return 0;
}
```

---

**带参写法：命令行参数主函数**
`int main(int argc, char *argv[]) { ... }`
```c
// argc 为参数个数，argv 为参数字符串数组
int main(int argc, char *argv[]) {
    for (int i = 0; i < argc; i++) {
        printf("Argument %d: %s\n", i, argv[i]);
    }
    return 0;
}
```

---

## 程序终止

**正常写法：正常终止程序**
`return 0;`
```c
// 在 main 函数中正常返回
int main() {
    printf("Done\n");
    return 0;
}
```

---

**强制写法：调用 exit 终止**
`exit(0);`
```c
// 直接终止整个程序
exit(0);
```

---

**异常写法：异常终止程序**
`exit(1);`
```c
// 非零状态码表示异常终止
exit(1);
```

---

## 编译命令

**单文件写法：编译单个源文件**
`gcc <source.c> -o <output>`
```bash
# 编译 hello.c 生成可执行文件 hello
gcc hello.c -o hello
```

---

**优化写法：启用优化编译**
`gcc -O2 <source.c> -o <output>`
```bash
# 启用二级优化
gcc -O2 hello.c -o hello
```

---

**调试写法：生成调试信息**
`gcc -g <source.c> -o <output>`
```bash
# 生成调试信息便于 GDB 调试
gcc -g hello.c -o hello
```

---

**多文件写法：编译多个源文件**
`gcc <file1.c> <file2.c> -o <output>`
```bash
# 一次性编译多个源文件
gcc file1.c file2.c -o program
```

---

**分步写法：分别编译后链接**
`gcc -c <source.c> -o <object.o>`
```bash
# 编译 file1.c 生成目标文件
gcc -c file1.c -o file1.o
```

---

**链接写法：链接目标文件**
`gcc <file1.o> <file2.o> -o <output>`
```bash
# 链接多个目标文件生成可执行文件
gcc file1.o file2.o -o program
```
