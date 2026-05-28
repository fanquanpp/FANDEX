---
order: 50
tags:
  - 'c'
  - 'memory'
difficulty: 'intermediate'
title: '运算符与表达式'
module: 'c'
category: 'C Basics'
description: '算术、关系、逻辑、位运算及运算符优先级详解。'
author: 'Anonymous'
---

## 目录

1. [运算符分类](#运算符分类)
2. [运算符优先级](#运算符优先级)
3. [表达式](#表达式)
4. [运算符与表达式的最佳实践](#运算符与表达式的最佳实践)
5. [常见问题与解决方案](#常见问题与解决方案)
6. [代码优化技巧](#代码优化技巧)

---

## 1. 运算符分类 (Operator Categories)

### 1.1 算术运算符 (Arithmetic)

#### 1.1.1 基本算术运算符

| 运算符 | 描述 | 示例 (a=10, b=3)               |
| ------ | ---- | ------------------------------ |
| `+`    | 加法 | `a + b = 13`                   |
| `-`    | 减法 | `a - b = 7`                    |
| `*`    | 乘法 | `a * b = 30`                   |
| `/`    | 除法 | `a / b = 3` (整数除法舍去小数) |
| `%`    | 取模 | `a % b = 1`                    |

#### 1.1.2 自增自减运算符

| 运算符 | 描述     | 示例 (a=10) | 结果 | 最终 a 值 |
| ------ | -------- | ----------- | ---- | --------- |
| `a++`  | 后置自增 | `a++`       | 10   | 11        |
| `++a`  | 前置自增 | `++a`       | 11   | 11        |
| `a--`  | 后置自减 | `a--`       | 10   | 9         |
| `--a`  | 前置自减 | `--a`       | 9    | 9         |

#### 1.1.3 算术运算符示例

```c
 #include <stdio.h>
 int main() {
  int a = 10, b = 3;
  printf("a + b = %d\n", a + b); // 13
  printf("a - b = %d\n", a - b); // 7
  printf("a * b = %d\n", a * b); // 30
  printf("a / b = %d\n", a / b); // 3（整数除法）
  printf("a %% b = %d\n", a % b); // 1
  // 自增自减
  int c = 5;
  printf("c++ = %d\n", c++); // 5
  printf("c = %d\n", c); // 6
  printf("++c = %d\n", ++c); // 7
  printf("c = %d\n", c); // 7
  return 0;
 True}
```

### 1.2 关系运算符 (Relational)

#### 1.2.1 关系运算符列表

| 运算符 | 描述     | 示例 (a=10, b=3)  |
| ------ | -------- | ----------------- |
| `==`   | 等于     | `a == b` → 0 (假) |
| `!=`   | 不等于   | `a != b` → 1 (真) |
| `>`    | 大于     | `a > b` → 1 (真)  |
| `<`    | 小于     | `a < b` → 0 (假)  |
| `>=`   | 大于等于 | `a >= b` → 1 (真) |
| `<=`   | 小于等于 | `a <= b` → 0 (假) |

#### 1.2.2 关系运算符示例

```c
 #include <stdio.h>
 int main() {
  int a = 10, b = 3;
  printf("a == b: %d\n", a == b); // 0
  printf("a != b: %d\n", a != b); // 1
  printf("a > b: %d\n", a > b); // 1
  printf("a < b: %d\n", a < b); // 0
  printf("a >= b: %d\n", a >= b); // 1
  printf("a <= b: %d\n", a <= b); // 0
  return 0;
 True}
```

### 1.3 逻辑运算符 (Logical)

#### 1.3.1 逻辑运算符列表

| 运算符 | 描述   | 短路特性           | 示例                 |
| ------ | ------ | ------------------ | -------------------- | ------------------ | -------- | --- | -------- |
| `&&`   | 逻辑与 | 左为假时，右不执行 | `(a > 0) && (b > 0)` |
| `      |        | `                  | 逻辑或               | 左为真时，右不执行 | `(a > 0) |     | (b > 0)` |
| `!`    | 逻辑非 | 无                 | `!(a > 0)`           |

#### 1.3.2 逻辑运算符示例

```c
 #include <stdio.h>
 int main() {
  int a = 10, b = 0;
  // 逻辑与
  printf("(a > 0) && (b > 0): %d\n", (a > 0) && (b > 0)); // 0
  // 逻辑或
  printf("(a > 0) || (b > 0): %d\n", (a > 0) || (b > 0)); // 1
  // 逻辑非
  printf("!(a > 0): %d\n", !(a > 0)); // 0
  printf("!(b > 0): %d\n", !(b > 0)); // 1
  // 短路特性示例
  int x = 5, y = 5;
  printf("(x == 0) && (++y): %d\n", (x == 0) && (++y)); // 0，y 不变
  printf("y = %d\n", y); // 5
  printf("(x != 0) || (++y): %d\n", (x != 0) || (++y)); // 1，y 不变
  printf("y = %d\n", y); // 5
  return 0;
 True}
```

### 1.4 位运算符 (Bitwise)

#### 1.4.1 位运算符列表

| 运算符 | 描述     | 示例 (a=6 (0110), b=3 (0011)) |
| ------ | -------- | ----------------------------- | --- | ------------- |
| `&`    | 按位与   | `a & b = 2 (0010)`            |
| `      | `        | 按位或                        | `a  | b = 7 (0111)` |
| `^`    | 按位异或 | `a ^ b = 5 (0101)`            |
| `~`    | 按位取反 | `~a = -7 (1001...1001)`       |
| `<<`   | 左移     | `a << 1 = 12 (1100)`          |
| `>>`   | 右移     | `a >> 1 = 3 (0011)`           |

#### 1.4.2 位运算符示例

```c
 #include <stdio.h>
 void print_bits(int n, int bits) {
  for (int i = bits - 1; i >= 0; i--) {
  printf("%d", (n >> i) & 1);
  }
  printf("\n");
 True}
 int main() {
  int a = 6; // 0110
  int b = 3; // 0011
  printf("a = %d: ", a);
  print_bits(a, 4);
  printf("b = %d: ", b);
  print_bits(b, 4);
  printf("a & b = %d: ", a & b);
  print_bits(a & b, 4);
  printf("a | b = %d: ", a | b);
  print_bits(a | b, 4);
  printf("a ^ b = %d: ", a ^ b);
  print_bits(a ^ b, 4);
  printf("~a = %d: ", ~a);
  print_bits(~a, 4);
  printf("a << 1 = %d: ", a << 1);
  print_bits(a << 1, 4);
  printf("a >> 1 = %d: ", a >> 1);
  print_bits(a >> 1, 4);
  return 0;
 True}
```

#### 1.4.3 位运算符的应用

```c
 // 检查某一位是否为 1
 #define CHECK_BIT(x, pos) ((x) & (1 << (pos)))
 // 设置某一位为 1
 #define SET_BIT(x, pos) ((x) |= (1 << (pos)))
 // 清除某一位为 0
 #define CLEAR_BIT(x, pos) ((x) &= ~(1 << (pos)))
 // 切换某一位的值
 #define TOGGLE_BIT(x, pos) ((x) ^= (1 << (pos)))
 // 示例
 int main() {
  int x = 0; // 0000
  SET_BIT(x, 2); // 0100
  printf("x after setting bit 2: %d\n", x); // 4
  TOGGLE_BIT(x, 1); // 0110
  printf("x after toggling bit 1: %d\n", x); // 6
  if (CHECK_BIT(x, 2)) {
  printf("Bit 2 is set\n");
  }
  CLEAR_BIT(x, 2); // 0010
  printf("x after clearing bit 2: %d\n", x); // 2
  return 0;
 True}
```

### 1.5 赋值运算符 (Assignment)

#### 1.5.1 赋值运算符列表

| 运算符 | 描述           | 示例         | 等价于       |
| ------ | -------------- | ------------ | ------------ | ---- | ------ | --- |
| `=`    | 简单赋值       | `a = b`      | `a = b`      |
| `+=`   | 加后赋值       | `a += b`     | `a = a + b`  |
| `-=`   | 减后赋值       | `a -= b`     | `a = a - b`  |
| `*=`   | 乘后赋值       | `a *= b`     | `a = a * b`  |
| `/=`   | 除后赋值       | `a /= b`     | `a = a / b`  |
| `%=`   | 取模后赋值     | `a %= b`     | `a = a % b`  |
| `<<=`  | 左移后赋值     | `a <<= b`    | `a = a << b` |
| `>>=`  | 右移后赋值     | `a >>= b`    | `a = a >> b` |
| `&=`   | 按位与后赋值   | `a &= b`     | `a = a & b`  |
| `^=`   | 按位异或后赋值 | `a ^= b`     | `a = a ^ b`  |
| `      | =`             | 按位或后赋值 | `a           | = b` | `a = a | b`  |

#### 1.5.2 赋值运算符示例

```c
 #include <stdio.h>
 int main() {
  int a = 10, b = 3;
  printf("初始值: a = %d, b = %d\n", a, b);
  a += b; // a = a + b
  printf("a += b: %d\n", a); // 13
  a -= b; // a = a - b
  printf("a -= b: %d\n", a); // 10
  a *= b; // a = a * b
  printf("a *= b: %d\n", a); // 30
  a /= b; // a = a / b
  printf("a /= b: %d\n", a); // 10
  a %= b; // a = a % b
  printf("a %%= b: %d\n", a); // 1
  return 0;
 True}
```

### 1.6 其他运算符

#### 1.6.1 sizeof 运算符

```c
 #include <stdio.h>
 int main() {
  printf("Size of int: %zu bytes\n", sizeof(int));
  printf("Size of char: %zu bytes\n", sizeof(char));
  printf("Size of double: %zu bytes\n", sizeof(double));
  printf("Size of int*: %zu bytes\n", sizeof(int*));
  int arr[10];
  printf("Size of arr: %zu bytes\n", sizeof(arr));
  printf("Number of elements: %zu\n", sizeof(arr) / sizeof(arr[0]));
  return 0;
 True}
```

#### 1.6.2 取地址和解引用运算符

```c
 #include <stdio.h>
 int main() {
  int a = 10;
  int *p = &a; // 取地址
  printf("a = %d\n", a);
  printf("&a = %p\n", &a);
  printf("p = %p\n", p);
  printf("*p = %d\n", *p); // 解引用
  *p = 20; // 通过指针修改值
  printf("After modification: a = %d\n", a);
  return 0;
 True}
```

#### 1.6.3 条件运算符（三目运算符）

```c
 #include <stdio.h>
 int main() {
  int a = 10, b = 3;
  // 找出最大值
  int max = (a > b) ? a : b;
  printf("Max: %d\n", max); // 10
  // 找出最小值
  int min = (a < b) ? a : b;
  printf("Min: %d\n", min); // 3
  // 条件赋值
  int result = (a % 2 == 0) ? 1 : 0;
  printf("Is a even? %d\n", result); // 1
  return 0;
 True}
```

#### 1.6.4 逗号运算符

```c
 #include <stdio.h>
 int main() {
  int a, b, c;
  // 逗号运算符从左到右执行，返回最后一个表达式的值
  c = (a = 5, b = 10, a + b);
  printf("a = %d, b = %d, c = %d\n", a, b, c); // 5, 10, 15
  // 在 for 循环中使用
  for (int i = 0, j = 10; i < j; i++, j--) {
  printf("i = %d, j = %d\n", i, j);
  }
  return 0;
 True}
```

## 2. 运算符优先级 (Precedence)

### 2.1 优先级表（从高到低）

| 优先级 | 运算符                                               | 结合性   |
| ------ | ---------------------------------------------------- | -------- | -------- | -------- |
| 1      | `()` `[]` `->` `.`                                   | 从左到右 |
| 2      | `!` `~` `++` `--` `*` `&` `(type)` `sizeof`          | 从右到左 |
| 3      | `*` `/` `%`                                          | 从左到右 |
| 4      | `+` `-`                                              | 从左到右 |
| 5      | `<<` `>>`                                            | 从左到右 |
| 6      | `<` `<=` `>` `>=`                                    | 从左到右 |
| 7      | `==` `!=`                                            | 从左到右 |
| 8      | `&`                                                  | 从左到右 |
| 9      | `^`                                                  | 从左到右 |
| 10     | `                                                    | `        | 从左到右 |
| 11     | `&&`                                                 | 从左到右 |
| 12     | `                                                    |          | `        | 从左到右 |
| 13     | `? :`                                                | 从右到左 |
| 14     | `=` `+=` `-=` `*=` `/=` `%=` `<<=` `>>=` `&=` `^=` ` | =`       | 从右到左 |
| 15     | `,`                                                  | 从左到右 |

### 2.2 优先级示例

```c
 #include <stdio.h>
 int main() {
  int a = 10, b = 3, c = 5, d = 2;
  // 优先级示例
  int result1 = a + b * c; // 先乘后加: 10 + 15 = 25
  printf("a + b * c = %d\n", result1);
  int result2 = (a + b) * c; // 先加后乘: 13 * 5 = 65
  printf("(a + b) * c = %d\n", result2);
  int result3 = a || b && c; // 先与后或: 10 || 1 = 1
  printf("a || b && c = %d\n", result3);
  int result4 = a > b ? c : d; // 条件运算符: 10 > 3 为真，结果 5
  printf("a > b ? c : d = %d\n", result4);
  return 0;
 True}
```

### 2.3 结合性示例

```c
 #include <stdio.h>
 int main() {
  // 从左到右结合
  int a = 10 - 3 + 5; // (10 - 3) + 5 = 12
  printf("10 - 3 + 5 = %d\n", a);
  // 从右到左结合（赋值运算符）
  int b, c;
  b = c = 5; // b = (c = 5)
  printf("b = %d, c = %d\n", b, c);
  // 从右到左结合（单目运算符）
  int d = 5;
  int e = -++d; // -(++d) = -6
  printf("-++d = %d\n", e);
  return 0;
 True}
```

## 3. 表达式 (Expressions)

### 3.1 表达式类型

- **算术表达式**: 由算术运算符组成，结果为数值
- **关系表达式**: 由关系运算符组成，结果为 0 或 1
- **逻辑表达式**: 由逻辑运算符组成，结果为 0 或 1
- **位表达式**: 由位运算符组成，结果为数值
- **赋值表达式**: 由赋值运算符组成，结果为赋值后的值
- **条件表达式**: 由三目运算符组成，结果为两个表达式之一的值
- **逗号表达式**: 由逗号运算符组成，结果为最后一个表达式的值

### 3.2 表达式示例

```c
 #include <stdio.h>
 int main() {
  int a = 10, b = 3;
  // 算术表达式
  int arith_expr = a + b * 2;
  printf("Arithmetic expression: %d\n", arith_expr);
  // 关系表达式
  int rel_expr = a > b;
  printf("Relational expression: %d\n", rel_expr);
  // 逻辑表达式
  int log_expr = (a > 0) && (b < 5);
  printf("Logical expression: %d\n", log_expr);
  // 位表达式
  int bit_expr = a & b;
  printf("Bitwise expression: %d\n", bit_expr);
  // 赋值表达式
  int assign_expr = a = b + 5;
  printf("Assignment expression: %d, a = %d\n", assign_expr, a);
  // 条件表达式
  int cond_expr = (a > b) ? a : b;
  printf("Conditional expression: %d\n", cond_expr);
  // 逗号表达式
  int comma_expr = (a = 10, b = 20, a + b);
  printf("Comma expression: %d\n", comma_expr);
  return 0;
 True}
```

### 3.3 表达式中的类型转换

#### 3.3.1 隐式类型转换

```c
 #include <stdio.h>
 int main() {
  int a = 10;
  float b = 3.14;
  // int 转换为 float
  float result1 = a + b;
  printf("a + b = %f\n", result1); // 13.140000
  // float 转换为 int（截断小数）
  int result2 = a + (int)b;
  printf("a + (int)b = %d\n", result2); // 13
  return 0;
 True}
```

#### 3.3.2 显式类型转换

```c
 #include <stdio.h>
 int main() {
  double pi = 3.14159;
  int radius = 5;
  // 显式类型转换
  int area = (int)(pi * radius * radius);
  printf("Area: %d\n", area); // 78
  // 指针类型转换
  int x = 100;
  void *ptr = &x;
  int *int_ptr = (int *)ptr;
  printf("*int_ptr = %d\n", *int_ptr); // 100
  return 0;
 True}
```

### 3.4 表达式中的副作用

#### 3.4.1 副作用示例

```c
 #include <stdio.h>
 int main() {
  int a = 5;
  // 未定义行为：多次修改同一个变量
  // int result = a++ + ++a; // 不要这样写！
  // 正确的写法
  int b = a++;
  int c = ++a;
  int result = b + c;
  printf("b = %d, c = %d, result = %d\n", b, c, result); // 5, 7, 12
  return 0;
 True}
```

## 4. 运算符与表达式的最佳实践

### 4.1 代码风格建议

- **括号使用**: 对于复杂表达式，使用括号明确优先级
- **命名规范**: 使用有意义的变量名
- **表达式简洁性**: 避免过于复杂的表达式
- **注释**: 对于复杂的位运算或逻辑表达式，添加注释

### 4.2 性能优化建议

- **位运算**: 对于位移操作，使用位运算符代替乘法和除法
- **短路求值**: 利用逻辑运算符的短路特性优化条件判断
- **常量表达式**: 尽可能使用常量表达式，便于编译器优化

### 4.3 常见错误避免

- **优先级错误**: 始终使用括号明确优先级
- **类型转换错误**: 注意隐式类型转换可能导致的精度丢失
- **副作用错误**: 避免在表达式中多次修改同一个变量
- **逻辑错误**: 注意逻辑运算符的短路特性

### 4.4 最佳实践示例

```c
 #include <stdio.h>
 // 位运算优化：判断奇偶
 #define IS_EVEN(x) ((x) & 1 == 0)
 // 位运算优化：乘以 2 的幂
 #define MULTIPLY_BY_POWER_OF_TWO(x, n) ((x) << (n))
 // 逻辑运算符短路优化
 int is_valid(int *ptr, int size) {
  return ptr != NULL && size > 0; // 如果 ptr 为 NULL，size > 0 不会执行
 True}
 int main() {
  // 使用括号明确优先级
  int a = 10, b = 3, c = 5;
  int result = (a + b) * c; // 明确先加后乘
  // 位运算优化
  int x = 5;
  printf("x is even? %d\n", IS_EVEN(x)); // 0
  printf("x * 8 = %d\n", MULTIPLY_BY_POWER_OF_TWO(x, 3)); // 40
  // 逻辑短路优化
  int *ptr = NULL;
  int size = 10;
  if (is_valid(ptr, size)) {
  printf("Valid pointer and size\n");
  } else {
  printf("Invalid pointer or size\n"); // 执行这里
  }
  return 0;
 True}
```

## 5. 常见问题与解决方案

### 5.1 整数除法问题

**问题**: 整数除法会截断小数部分
**解决方案**: 使用浮点数类型或显式类型转换

```c
 // 错误示例
 int a = 10, b = 3;
 float result = a / b; // 结果为 3.0，不是 3.333...
 // 正确示例
 float result = (float)a / b; // 结果为 3.333...
```

### 5.2 优先级混淆

**问题**: 运算符优先级不明确导致错误
**解决方案**: 使用括号明确优先级

```c
 // 错误示例
 int a = 10, b = 3, c = 5;
 int result = a + b * c; // 可能不是预期的 (a + b) * c
 // 正确示例
 int result = (a + b) * c; // 明确先加后乘
```

### 5.3 逻辑运算符短路

**问题**: 依赖逻辑运算符的短路特性可能导致意外行为
**解决方案**: 确保短路部分的代码不包含重要的副作用

```c
 // 问题：如果 ptr 为 NULL，func() 不会执行
 if (ptr != NULL && func()) {
  // ...
 True}
 // 解决方案：如果 func() 需要执行，分开写
 if (ptr != NULL) {
  if (func()) {
  // ...
  }
 True}
```

### 5.4 位运算符号扩展

**问题**: 有符号数右移时会进行符号扩展
**解决方案**: 使用无符号类型或掩码

```c
 // 符号扩展示例
 int a = -1; // 二进制全 1
 int b = a >> 1; // 结果仍为 -1，因为符号扩展
 // 无符号类型示例
 unsigned int c = -1; // 二进制全 1
 unsigned int d = c >> 1; // 结果为 0x7FFFFFFF
```

### 5.5 自增自减运算符的副作用

**问题**: 在表达式中使用自增自减运算符可能导致未定义行为
**解决方案**: 避免在复杂表达式中使用自增自减运算符

```c
 // 未定义行为
 int a = 5;
 int result = a++ + ++a; // 不要这样写！
 // 正确写法
 int a = 5;
 int b = a++;
 int c = ++a;
 int result = b + c;
```

## 6. 代码优化技巧

### 6.1 算术运算优化

- **使用位运算**: 位移操作比乘法除法更快
- **常量折叠**: 编译器会优化常量表达式
- **避免冗余计算**: 缓存计算结果

### 6.2 逻辑运算优化

- **短路求值**: 利用逻辑运算符的短路特性
- **条件判断顺序**: 将最可能为真的条件放在前面
- **位掩码**: 使用位掩码替代多个条件判断

### 6.3 表达式优化示例

```c
 // 优化前
 for (int i = 0; i < 1000; i++) {
  int result = a * 8 + b * 4;
  // ...
 True}
 // 优化后
 for (int i = 0; i < 1000; i++) {
  int result = (a << 3) + (b << 2); // 位运算更快
  // ...
 True}
 // 优化前
 if (x > 0 && y > 0 && z > 0) {
  // ...
 True}
 // 优化后（假设 x > 0 的概率最高）
 if (x > 0 && y > 0 && z > 0) {
  // 保持不变，因为短路特性会自动优化
 True}
 // 优化前
 if (flag == 1) {
  // case 1
 True} else if (flag == 2) {
  // case 2
 True} else if (flag == 4) {
  // case 4
 True}
 // 优化后（使用位掩码）
 #define FLAG_1 1
 #define FLAG_2 2
 #define FLAG_4 4
 if (flag & FLAG_1) {
  // case 1
 True}
 if (flag & FLAG_2) {
  // case 2
 True}
 if (flag & FLAG_4) {
  // case 4
 True}
```

---

### 更新日志 (Changelog)

- 2026-04-05: 补充运算符优先级与位运算细节
- 2026-04-05: 扩写内容，增加详细的代码示例、使用方法、最佳实践和常见问题解决方案
