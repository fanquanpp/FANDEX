# 变量与常量

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 变量定义与初始化

**基本写法：声明变量**
`<type> <var_name>;`
```c
// 声明整型变量（未初始化，值为随机值）
int a;
```

---

**初始化写法：声明并初始化**
`<type> <var_name> = <value>;`
```c
// 声明变量 b 并初始化为 20
int b = 20;
```

---

**单行写法：多变量声明**
`<type> <var1>, <var2> = <value>, <var3> = <value>;`
```c
// 同时声明并初始化多个变量
int m = 10, n = 20, p = 30;
```

---

**赋值写法：先声明后赋值**
`<var_name> = <value>;`
```c
// 先声明变量再赋值
int a;
a = 10;
```

---

## 存储类

**基本写法：auto 存储类**
`auto <type> <var_name> = <value>;`
```c
// 显式声明 auto 存储类（通常省略）
auto int x = 10;
```

---

**基本写法：static 局部变量**
`static <type> <var_name> = <value>;`
```c
// 静态局部变量，函数结束后不销毁
void counter() {
    static int count = 0;
    count++;
    printf("Count: %d\n", count);
}
```

---

**基本写法：static 全局变量**
`static <type> <var_name> = <value>;`
```c
// 全局静态变量，仅限当前文件访问
static int file_static = 100;
```

---

**基本写法：extern 外部变量声明**
`extern <type> <var_name>;`
```c
// 声明在其他文件中定义的外部变量
extern int global_var;
```

---

**基本写法：register 存储类**
`register <type> <var_name>;`
```c
// 建议将变量存储在寄存器中
register int i;
```

---

## 字面常量

**十进制写法：整数常量**
`<decimal>`
```c
// 十进制整数
int a = 100;
```

---

**十六进制写法：整数常量**
`0x<hex>`
```c
// 十六进制表示 31
int a = 0x1F;
```

---

**八进制写法：整数常量**
`0<octal>`
```c
// 八进制表示 8
int a = 010;
```

---

**二进制写法：整数常量（C99+）**
`0b<binary>`
```c
// 二进制表示 10
int a = 0b1010;
```

---

**后缀写法：整数常量后缀**
`<number>[U|L|UL|LL]`
```c
// 无符号长整数
unsigned long val = 100UL;
```

---

**基本写法：浮点常量**
`<digits>.<digits>[f|L]`
```c
// 单精度浮点数
float f = 3.14f;
```

---

**科学记数法写法：浮点常量**
`<digits>e<exp>`
```c
// 科学记数法表示 0.0025
double d = 2.5e-3;
```

---

**基本写法：字符常量**
`'<char>'`
```c
// 普通字符常量
char c = 'A';
```

---

**转义写法：字符常量**
`'<escape>'`
```c
// 换行符字符常量
char c = '\n';
```

---

**基本写法：字符串常量**
`"<string>"`
```c
// 字符串常量
char *str = "Hello C";
```

---

## 宏定义常量

**基本写法：无参宏定义常量**
`#define <NAME> <value>`
```c
// 定义缓冲区大小常量
#define MAX_BUFFER 1024
```

---

**基本写法：带参宏定义**
`#define <NAME>(<params>) <expression>`
```c
// 定义求最大值的宏
#define MAX(a, b) ((a) > (b) ? (a) : (b))
```

---

## const 常量

**基本写法：定义 const 常量**
`const <type> <NAME> = <value>;`
```c
// 定义只读常量
const int DAYS_IN_WEEK = 7;
```

---

**基本写法：指向常量的指针**
`const <type>* <ptr>;`
```c
// 不能通过指针修改所指向的值
const int* p1;
```

---

**基本写法：常量指针**
`<type>* const <ptr> = &<var>;`
```c
// 指针本身不能改变指向
int* const p3 = &x;
```

---

**基本写法：指向常量的常量指针**
`const <type>* const <ptr> = &<var>;`
```c
// 既不能修改值，也不能修改指针
const int* const p4 = &x;
```

---

## 枚举常量

**基本写法：默认枚举值**
`enum <Name> { <MEM1>, <MEM2>, ... };`
```c
// 默认从 0 开始递增
enum Days { SUN, MON, TUE, WED };
```

---

**自定义写法：指定枚举值**
`enum <Name> { <MEM1> = <val>, <MEM2>, ... };`
```c
// 从 1 开始递增
enum Months { JAN = 1, FEB, MAR, APR };
```

---

## 左值与右值

**赋值写法：左值与右值**
`<lvalue> = <rvalue>;`
```c
// x 是左值，10 是右值
int x = 10;
```
