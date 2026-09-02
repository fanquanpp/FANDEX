---
order: 80
title: 运算符与表达式
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 算术、关系、逻辑、位运算及运算符优先级详解。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'c/005-VariableConstant'
  - 'c/006-BitwiseBitField'
  - 'c/009-EnumTypedef'
  - 'c/010-MultiFileCompilation'
prerequisites:
  - 'c/002-CLanguageOverview'
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
 }
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
 }
```

### 1.3 逻辑运算符 (Logical)

#### 1.3.1 逻辑运算符列表

| 运算符 | 描述 | 短路特性 | 示例 |
| ------ | ------ | ------------------ | -------------------- | ------------------ | -------- | --- | -------- |
| `&&` | 逻辑与 | 左为假时，右不执行 | `(a > 0) && (b > 0)` |
| `     |        |` | 逻辑或 | 左为真时，右不执行 | `(a > 0) |     | (b > 0)` |
| `!` | 逻辑非 | 无 | `!(a > 0)` |

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
 }
```

### 1.4 位运算符 (Bitwise)

#### 1.4.1 位运算符列表

| 运算符 | 描述 | 示例 (a=6 (0110), b=3 (0011)) |
| ------ | -------- | ----------------------------- | --- | ------------- |
| `&` | 按位与 | `a & b = 2 (0010)` |
| `     |` | 按位或 | `a  | b = 7 (0111)` |
| `^` | 按位异或 | `a ^ b = 5 (0101)` |
| `~` | 按位取反 | `~a = -7 (1001...1001)` |
| `<<` | 左移 | `a << 1 = 12 (1100)` |
| `>>` | 右移 | `a >> 1 = 3 (0011)` |

#### 1.4.2 位运算符示例

```c
 #include <stdio.h>
 void print_bits(int n, int bits) {
  for (int i = bits - 1; i >= 0; i--) {
  printf("%d", (n >> i) & 1);
  }
  printf("\n");
 }
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
 }
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
 }
```

### 1.5 赋值运算符 (Assignment)

#### 1.5.1 赋值运算符列表

| 运算符 | 描述 | 示例 | 等价于 |
| ------ | -------------- | ------------ | ------------ | ---- | ------ | --- |
| `=` | 简单赋值 | `a = b` | `a = b` |
| `+=` | 加后赋值 | `a += b` | `a = a + b` |
| `-=` | 减后赋值 | `a -= b` | `a = a - b` |
| `*=` | 乘后赋值 | `a *= b` | `a = a * b` |
| `/=` | 除后赋值 | `a /= b` | `a = a / b` |
| `%=` | 取模后赋值 | `a %= b` | `a = a % b` |
| `<<=` | 左移后赋值 | `a <<= b` | `a = a << b` |
| `>>=` | 右移后赋值 | `a >>= b` | `a = a >> b` |
| `&=` | 按位与后赋值 | `a &= b` | `a = a & b` |
| `^=` | 按位异或后赋值 | `a ^= b` | `a = a ^ b` |
| `      | =` | 按位或后赋值 | `a           | = b` | `a = a | b` |

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
 }
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
 }
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
 }
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
 }
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
 }
```

## 2. 运算符优先级 (Precedence)

### 2.1 优先级表（从高到低）

| 优先级 | 运算符 | 结合性 |
| ------ | ---------------------------------------------------- | -------- | -------- | -------- |
| 1 | `()` `[]` `->` `.` | 从左到右 |
| 2 | `!` `~` `++` `--` `*` `&` `(type)` `sizeof` | 从右到左 |
| 3 | `*` `/` `%` | 从左到右 |
| 4 | `+` `-` | 从左到右 |
| 5 | `<<` `>>` | 从左到右 |
| 6 | `<` `<=` `>` `>=` | 从左到右 |
| 7 | `==` `!=` | 从左到右 |
| 8 | `&` | 从左到右 |
| 9 | `^` | 从左到右 |
| 10 | `                                                   |` | 从左到右 |
| 11 | `&&` | 从左到右 |
| 12 | `                                                   |          |` | 从左到右 |
| 13 | `? :` | 从右到左 |
| 14 | `=` `+=` `-=` `*=` `/=` `%=` `<<=` `>>=` `&=` `^=` ` | =` | 从右到左 |
| 15 | `,` | 从左到右 |

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
 }
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
 }
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
 }
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
 }
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
 }
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
 }
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
 }
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
 }
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
 }
 // 解决方案：如果 func() 需要执行，分开写
 if (ptr != NULL) {
  if (func()) {
  // ...
  }
 }
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
 }
 // 优化后
 for (int i = 0; i < 1000; i++) {
  int result = (a << 3) + (b << 2); // 位运算更快
  // ...
 }
 // 优化前
 if (x > 0 && y > 0 && z > 0) {
  // ...
 }
 // 优化后（假设 x > 0 的概率最高）
 if (x > 0 && y > 0 && z > 0) {
  // 保持不变，因为短路特性会自动优化
 }
 // 优化前
 if (flag == 1) {
  // case 1
 }
  // case 2
 }
  // case 4
 }
 // 优化后（使用位掩码）
 #define FLAG_1 1
 #define FLAG_2 2
 #define FLAG_4 4
 if (flag & FLAG_1) {
  // case 1
 }
 if (flag & FLAG_2) {
  // case 2
 }
 if (flag & FLAG_4) {
  // case 4
 }
```

---

## 算术运算符

**加法写法：加法运算**
`<expr> + <expr>`
```c
// 计算两数之和
int a = 10, b = 3;
int sum = a + b;
```

---

**减法写法：减法运算**
`<expr> - <expr>`
```c
// 计算两数之差
int a = 10, b = 3;
int diff = a - b;
```

---

**乘法写法：乘法运算**
`<expr> * <expr>`
```c
// 计算两数之积
int a = 10, b = 3;
int product = a * b;
```

---

**除法写法：除法运算**
`<expr> / <expr>`
```c
// 整数除法（舍去小数）
int a = 10, b = 3;
int quotient = a / b;
```

---

**取模写法：取模运算**
`<expr> % <expr>`
```c
// 计算余数
int a = 10, b = 3;
int remainder = a % b;
```

---

**后置写法：后置自增**
`<var>++`
```c
// 返回原值后自增
int c = 5;
int result = c++;
```

---

**前置写法：前置自增**
`++<var>`
```c
// 先自增后返回新值
int c = 5;
int result = ++c;
```

---

**后置写法：后置自减**
`<var>--`
```c
// 返回原值后自减
int c = 5;
int result = c--;
```

---

**前置写法：前置自减**
`--<var>`
```c
// 先自减后返回新值
int c = 5;
int result = --c;
```

---

## 关系运算符

**等于写法：等于比较**
`<expr> == <expr>`
```c
// 判断两数是否相等
int a = 10, b = 3;
int result = (a == b);
```

---

**不等于写法：不等于比较**
`<expr> != <expr>`
```c
// 判断两数是否不等
int a = 10, b = 3;
int result = (a != b);
```

---

**大于写法：大于比较**
`<expr> > <expr>`
```c
// 判断 a 是否大于 b
int a = 10, b = 3;
int result = (a > b);
```

---

**小于写法：小于比较**
`<expr> < <expr>`
```c
// 判断 a 是否小于 b
int a = 10, b = 3;
int result = (a < b);
```

---

## 逻辑运算符

**逻辑与写法：逻辑与运算**
`<expr> && <expr>`
```c
// 短路逻辑与，左为假时右不执行
int a = 10, b = 0;
int result = (a > 0) && (b > 0);
```

---

**逻辑或写法：逻辑或运算**
`<expr> || <expr>`
```c
// 短路逻辑或，左为真时右不执行
int a = 10, b = 0;
int result = (a > 0) || (b > 0);
```

---

**逻辑非写法：逻辑非运算**
`!<expr>`
```c
// 逻辑取反
int a = 10;
int result = !(a > 0);
```

---

## 位运算符

**按位与写法：按位与运算**
`<expr> & <expr>`
```c
// 按位与
int a = 6, b = 3;
int result = a & b;
```

---

**按位或写法：按位或运算**
`<expr> | <expr>`
```c
// 按位或
int a = 6, b = 3;
int result = a | b;
```

---

**按位异或写法：按位异或运算**
`<expr> ^ <expr>`
```c
// 按位异或
int a = 6, b = 3;
int result = a ^ b;
```

---

**按位取反写法：按位取反运算**
`~<expr>`
```c
// 按位取反
int a = 6;
int result = ~a;
```

---

**左移写法：左移运算**
`<expr> << <n>`
```c
// 左移 1 位
int a = 6;
int result = a << 1;
```

---

**右移写法：右移运算**
`<expr> >> <n>`
```c
// 右移 1 位
int a = 6;
int result = a >> 1;
```

---

**位操作宏写法：检查某一位**
`#define <NAME>(x, pos) ((x) & (1U << (pos)))`
```c
// 检查指定位是否为 1
#define CHECK_BIT(x, pos) ((x) & (1U << (pos)))
```

---

**位操作宏写法：设置某一位**
`#define <NAME>(x, pos) ((x) |= (1U << (pos)))`
```c
// 设置指定位为 1
#define SET_BIT(x, pos) ((x) |= (1U << (pos)))
```

---

**位操作宏写法：清除某一位**
`#define <NAME>(x, pos) ((x) &= ~(1U << (pos)))`
```c
// 清除指定位为 0
#define CLEAR_BIT(x, pos) ((x) &= ~(1U << (pos)))
```

---

## 赋值运算符

**基本写法：简单赋值**
`<var> = <expr>;`
```c
// 简单赋值
int a = 10;
```

---

**复合写法：加赋值**
`<var> += <expr>;`
```c
// 等价于 a = a + b
int a = 10, b = 3;
a += b;
```

---

**复合写法：减赋值**
`<var> -= <expr>;`
```c
// 等价于 a = a - b
int a = 10, b = 3;
a -= b;
```

---

**复合写法：乘赋值**
`<var> *= <expr>;`
```c
// 等价于 a = a * b
int a = 10, b = 3;
a *= b;
```

---

**复合写法：除赋值**
`<var> /= <expr>;`
```c
// 等价于 a = a / b
int a = 10, b = 3;
a /= b;
```

---

## 其他运算符

**sizeof 写法：获取大小**
`sizeof(<type|var>)`
```c
// 获取 int 类型字节数
size_t size = sizeof(int);
```

---

**取地址写法：获取变量地址**
`&<var>`
```c
// 获取变量地址
int a = 10;
int *p = &a;
```

---

**解引用写法：通过指针访问值**
`*<ptr>`
```c
// 解引用指针获取值
int a = 10;
int *p = &a;
int val = *p;
```

---

**三目写法：条件运算符**
`<condition> ? <expr1> : <expr2>`
```c
// 找出最大值
int a = 10, b = 3;
int max = (a > b) ? a : b;
```

---

**逗号写法：逗号运算符**
`<expr1>, <expr2>, ..., <exprN>`
```c
// 从左到右执行，返回最后一个表达式的值
int c = (a = 5, b = 10, a + b);
```

---

## 表达式类型转换

**隐式写法：自动类型转换**
`<type> <var> = <other_type_var>;`
```c
// int 转换为 float
int a = 10;
float result = a + 3.14f;
```

---

**显式写法：强制类型转换**
`(<target_type>)<expression>`
```c
// 显式转换 double 为 int
double pi = 3.14159;
int area = (int)(pi * 5 * 5);
```
## 文件打开与关闭

**基本写法：打开文件**
`FILE *<fp> = fopen("<filename>", "<mode>");`
```c
#include <stdio.h>
// 以只读方式打开文件
FILE *fp = fopen("data.txt", "r");
```

---

**基本写法：关闭文件**
`fclose(<fp>);`
```c
// 关闭文件
fclose(fp);
```

---

**错误检查写法：检查文件是否打开成功**
`if (<fp> == NULL) { ... }`
```c
// 检查文件是否成功打开
FILE *fp = fopen("data.txt", "r");
if (fp == NULL) {
    perror("Failed to open file");
    return 1;
}
```

---

## 文件打开模式

**只读写法：以只读方式打开**
`fopen("<filename>", "r")`
```c
// 只读模式打开文本文件
FILE *fp = fopen("data.txt", "r");
```

---

**只写写法：以只写方式打开**
`fopen("<filename>", "w")`
```c
// 只写模式打开文件（覆盖）
FILE *fp = fopen("output.txt", "w");
```

---

**追加写法：以追加方式打开**
`fopen("<filename>", "a")`
```c
// 追加模式打开文件
FILE *fp = fopen("log.txt", "a");
```

---

**读写写法：以读写方式打开**
`fopen("<filename>", "r+")`
```c
// 读写模式打开文件
FILE *fp = fopen("data.txt", "r+");
```

---

**二进制写法：以二进制方式打开**
`fopen("<filename>", "rb")`
```c
// 二进制只读模式打开
FILE *fp = fopen("data.bin", "rb");
```

---

## 字符读写

**基本写法：读取单个字符**
`int <ch> = fgetc(<fp>);`
```c
// 从文件读取单个字符
int ch = fgetc(fp);
```

---

**基本写法：写入单个字符**
`fputc(<ch>, <fp>);`
```c
// 向文件写入单个字符
fputc('A', fp);
```

---

**EOF 写法：检测文件结束**
`while ((<ch> = fgetc(<fp>)) != EOF) { ... }`
```c
// 循环读取直到文件结束
int ch;
while ((ch = fgetc(fp)) != EOF) {
    putchar(ch);
}
```

---

## 字符串读写

**基本写法：读取字符串**
`char *<result> = fgets(<buffer>, <size>, <fp>);`
```c
// 从文件读取一行字符串
char buffer[100];
fgets(buffer, sizeof(buffer), fp);
```

---

**基本写法：写入字符串**
`fputs("<string>", <fp>);`
```c
// 向文件写入字符串
fputs("Hello World", fp);
```

---

## 格式化读写

**基本写法：格式化读取**
`fscanf(<fp>, "<format>", &<var>);`
```c
// 从文件按格式读取
int age;
fscanf(fp, "%d", &age);
```

---

**基本写法：格式化写入**
`fprintf(<fp>, "<format>", <values>);`
```c
// 向文件按格式写入
fprintf(fp, "Name: %s, Age: %d\n", "John", 30);
```

---

## 块读写

**基本写法：读取数据块**
`size_t <count> = fread(<buffer>, <size>, <count>, <fp>);`
```c
// 从文件读取数据块
int data[10];
fread(data, sizeof(int), 10, fp);
```

---

**基本写法：写入数据块**
`size_t <count> = fwrite(<buffer>, <size>, <count>, <fp>);`
```c
// 向文件写入数据块
int data[5] = {1, 2, 3, 4, 5};
fwrite(data, sizeof(int), 5, fp);
```

---

## 文件定位

**基本写法：获取当前位置**
`long <pos> = ftell(<fp>);`
```c
// 获取当前文件位置
long pos = ftell(fp);
```

---

**基本写法：设置文件位置**
`fseek(<fp>, <offset>, <origin>);`
```c
// 从文件开头偏移 10 字节
fseek(fp, 10, SEEK_SET);
```

---

**基本写法：回到文件开头**
`rewind(<fp>);`
```c
// 将文件指针重置到开头
rewind(fp);
```

---

**末尾写法：定位到文件末尾**
`fseek(<fp>, 0, SEEK_END);`
```c
// 定位到文件末尾
fseek(fp, 0, SEEK_END);
```

---

**fgetpos 写法：获取文件位置**
`fgetpos(<fp>, &<pos>);`
```c
// 获取文件位置
fpos_t pos;
fgetpos(fp, &pos);
```

---

**fsetpos 写法：设置文件位置**
`fsetpos(<fp>, &<pos>);`
```c
// 设置文件位置
fpos_t pos;
fsetpos(fp, &pos);
```

---

## 文件状态检查

**基本写法：检查文件结束**
`feof(<fp>)`
```c
// 检查是否到达文件末尾
if (feof(fp)) {
    printf("End of file\n");
}
```

---

**基本写法：检查文件错误**
`ferror(<fp>)`
```c
// 检查文件读写错误
if (ferror(fp)) {
    printf("File error\n");
}
```

---

**基本写法：清除文件错误标志**
`clearerr(<fp>);`
```c
// 清除文件错误标志
clearerr(fp);
```

---

## 标准流

**基本写法：使用标准输入**
`stdin`
```c
// 从标准输入读取
char buffer[100];
fgets(buffer, sizeof(buffer), stdin);
```

---

**基本写法：使用标准输出**
`stdout`
```c
// 向标准输出写入
fputs("Hello\n", stdout);
```

---

**基本写法：使用标准错误**
`stderr`
```c
// 向标准错误输出
fprintf(stderr, "Error message\n");
```

---

## 文件删除与重命名

**基本写法：删除文件**
`remove("<filename>");`
```c
// 删除文件
remove("temp.txt");
```

---

**基本写法：重命名文件**
`rename("<old_name>", "<new_name>");`
```c
// 重命名文件
rename("old.txt", "new.txt");
```

---

## 临时文件

**基本写法：创建临时文件**
`FILE *<fp> = tmpfile();`
```c
// 创建临时文件（关闭后自动删除）
FILE *tmp = tmpfile();
```

---

**基本写法：生成临时文件名**
`char *<name> = tmpnam(<buffer>);`
```c
// 生成临时文件名
char name[L_tmpnam];
tmpnam(name);
```

---

## 文件缓冲

**基本写法：设置缓冲区**
`setvbuf(<fp>, <buffer>, <mode>, <size>);`
```c
// 设置全缓冲
char buffer[1024];
setvbuf(fp, buffer, _IOFBF, sizeof(buffer));
```

---

**基本写法：刷新缓冲区**
`fflush(<fp>);`
```c
// 刷新文件缓冲区
fflush(fp);
```

---

## 获取文件大小

**基本写法：通过 fseek 和 ftell 获取文件大小**
`fseek(<fp>, 0, SEEK_END); long <size> = ftell(<fp>);`
```c
// 获取文件大小
fseek(fp, 0, SEEK_END);
long file_size = ftell(fp);
rewind(fp);
```

---

## 二进制文件读写

**结构体写法：写入结构体到二进制文件**
`fwrite(&<struct_var>, sizeof(<StructType>), 1, <fp>);`
```c
// 将结构体写入二进制文件
typedef struct { int id; char name[50]; } Record;
Record r = {1, "John"};
fwrite(&r, sizeof(Record), 1, fp);
```

---

**结构体读取写法：从二进制文件读取结构体**
`fread(&<struct_var>, sizeof(<StructType>), 1, <fp>);`
```c
// 从二进制文件读取结构体
Record r;
fread(&r, sizeof(Record), 1, fp);
```
