# 运算符与表达式

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

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
