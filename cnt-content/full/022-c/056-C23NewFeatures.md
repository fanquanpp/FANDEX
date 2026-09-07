---
order: 560
title: C23 新特性
module: 'c'
category: 计算机科学
difficulty: beginner
description: C23 新特性 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## nullptr

**基本写法：空指针常量**
`nullptr`
```c
// C23 类型安全的空指针
int* p = nullptr;
```

---

**基本写法：空指针类型**
`nullptr_t`
```c
// 空指针类型定义
nullptr_t np = nullptr;
```

---

**基本写法：与 NULL 区别**
`f(nullptr)` 不可隐式转整型
```c
// nullptr 仅能转指针避免歧义
void f(void* p);
f(nullptr);   // 明确传入空指针
```

---

## auto 类型推断

**基本写法：自动类型推导**
`auto <变量> = <表达式>;`
```c
// 编译器推导变量类型
auto x = 42;       // int
auto y = 3.14;     // double
```

---

**基本写法：复杂类型推断**
`auto <迭代器> = <表达式>;`
```c
// 简化复杂类型书写
struct Config* c = load_config();
auto cfg = load_config();
```

---

**基本写法：auto 限制**
`auto <变量>;  // 错误必须初始化`
```c
// auto 必须有初始化器
auto x = 10;   // 正确
// auto y;     // 错误
```

---

## constexpr

**基本写法：编译期常量**
`constexpr <类型> <变量> = <常量表达式>;`
```c
// 真正的编译期常量
constexpr int size = 10;
int arr[size];   // 合法
```

---

**基本写法：与 const 区别**
`const int n = <值>;  // 非编译期`
```c
// constexpr 可用于数组维度与 case 标签
constexpr int max = 100;
switch (x) { case max: break; }
```

---

**基本写法：constexpr 函数**
`constexpr int <函数名>(<参数>) { }`
```c
// 编译期可求值函数
constexpr int square(int x) { return x * x; }
int arr[square(5)];
```

---

## typeof / typeof_unqual

**基本写法：获取表达式类型**
`typeof(<表达式>) <变量> = <值>;`
```c
// 取表达式的类型声明变量
int a = 0;
typeof(a) b = 1;
```

---

**基本写法：去限定类型**
`typeof_unqual(<表达式>) <变量>;`
```c
// 去除 const volatile 限定
const int ci = 0;
typeof_unqual(ci) cu = 1;   // int
```

---

**基本写法：typeof 用于宏**
`#define SWAP(a, b) { typeof(a) tmp = a; a = b; b = tmp; }`
```c
// 通用交换宏
#define SWAP(a, b) do { \
    typeof(a) tmp = (a); \
    (a) = (b); \
    (b) = tmp; \
} while (0)
```

---

## 二进制字面量

**基本写法：二进制常量**
`0b<二进制>`
```c
// C23 支持二进制字面量
int mask = 0b10101010;
```

---

**基本写法：数字分隔符**
`<数字>'<数字>`
```c
// 提高数字可读性
int big = 1'000'000;
int bin = 0b1010'1010;
```

---

## bool 成为关键字

**基本写法：直接使用 bool**
`bool <变量> = true;`
```c
// C23 不再需要 stdbool.h
bool ready = true;
if (!ready) { }
```

---

**基本写法：true 与 false**
`true` / `false`
```c
// 直接使用布尔字面量
bool flag = false;
flag = (x > 0);
```

---

## 位精确整数

**基本写法：声明位宽整数**
`_BitInt(<位数>) <变量>;`
```c
// 指定精确位宽的整数
_BitInt(32) a = 100;
unsigned _BitInt(8) b = 200;
```

---

**基本写法：检查整数运算**
`ckd_add(&<结果>, <a>, <b>);`
```c
// C23 检查溢出的运算
_BitInt(32) r;
if (ckd_add(&r, a, b)) {
    // 发生溢出
}
```

---

## 标准属性

**基本写法：nodiscard 属性**
`[[nodiscard]] <返回类型> <函数>();`
```c
// 提示返回值不应被忽略
[[nodiscard]] int compute(void);
```

---

**基本写法：deprecated 属性**
`[[deprecated("[<消息>]")]] <声明>`
```c
// 标记弃用的函数
[[deprecated("use new_func")]]
void old_func(void);
```

---

**基本写法：maybe_unused 属性**
`[[maybe_unused]] <声明>`
```c
// 抑制未使用警告
[[maybe_unused]] static int x;
```

---

**基本写法：fallthrough 属性**
`[[fallthrough]];`
```c
// 标注 switch 故意穿透
switch (x) {
case 1:
    do_a();
    [[fallthrough]];
case 2:
    do_b();
    break;
}
```

---

## 预处理器新指令

**基本写法：#warning**
`#warning "<消息>"`
```c
// 产生编译警告
#warning "此功能尚未稳定"
```

---

**基本写法：#elifdef**
`#elifdef <宏>`
```c
// 等价 #elif defined
#ifdef A
#elifdef B
#endif
```

---

**基本写法：#elifndef**
`#elifndef <宏>`
```c
// 等价 #elif !defined
#ifdef A
#elifndef B
#endif
```

---

## #embed 嵌入二进制

**基本写法：嵌入文件**
`#embed <文件路径>`
```c
// 将文件内容作为字节数组
const unsigned char data[] = {
    #embed "logo.png"
};
```

---

**基本写法：限制嵌入大小**
`#embed <文件> limit(<字节数>)`
```c
// 仅嵌入前 N 字节
const unsigned char head[] = {
    #embed "data.bin" limit(16)
};
```

---

## stdbit.h 位操作

**基本写法：统计 1 的个数**
`stdc_count_ones(<值>)`
```c
// C23 标准位计数函数
unsigned n = stdc_count_ones(0xFFu);   // 8
```

---

**基本写法：统计前导零**
`stdc_leading_zeros(<值>)`
```c
// 前导零数量
unsigned z = stdc_leading_zeros(1u);
```

---

**基本写法：统计末尾零**
`stdc_trailing_zeros(<值>)`
```c
// 末尾零数量
unsigned z = stdc_trailing_zeros(8u);   // 3
```

---

**基本写法：位宽**
`stdc_bit_width(<值>)`
```c
// 表示该数所需位数
unsigned w = stdc_bit_width(255u);   // 8
```

---

## 初始化改进

**基本写法：空初始化**
`<类型> <变量> = {};`
```c
// C23 零初始化简写
int arr[10] = {};
struct Point p = {};
```

---

**基本写法：复合字面量改进**
`(<类型>){<成员>}`
```c
// 复合字面量可用于更多场景
struct Point* p = &(struct Point){1, 2};
```

---

## 编译选项

**基本写法：启用 C23**
`gcc -std=c23 <文件>.c`
```c
// 编译 C23 标准
gcc -std=c23 main.c -o main
```

---

**基本写法：检查 C23 版本**
`__STDC_VERSION__`
```c
// 查看标准版本宏
#if __STDC_VERSION__ >= 202311L
    /* C23 特性 */
#endif
```
