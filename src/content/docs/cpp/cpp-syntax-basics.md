---
order: 20
tags:
  - 'cpp'
difficulty: 'beginner'
title: 'C++ 基础语法'
module: 'cpp'
category: 'C++ Basics'
description: 'C++ 基本语法、注释、标识符与关键字。'
author: 'Anonymous'
---

## 目录

1. [数据类型](#数据类型)
2. [控制流](#控制流)
3. [输入输出](#输入输出)
4. [命名空间](#命名空间)
5. [作用域](#作用域)

---

## 1. 数据类型 (Data Types)

C++ 具有丰富的类型系统，分为基本类型和复合类型。

### 1.1 基本数据类型

| 类型                 | 描述                   | 大小 (字节) | 示例                                             |
| :------------------- | :--------------------- | :---------- | :----------------------------------------------- |
| **整数类型**         |                        |             |                                                  |
| `char`               | 字符                   | 1           | `char c = 'A';`                                  |
| `unsigned char`      | 无符号字符             | 1           | `unsigned char uc = 255;`                        |
| `short`              | 短整数                 | 2           | `short s = 32767;`                               |
| `unsigned short`     | 无符号短整数           | 2           | `unsigned short us = 65535;`                     |
| `int`                | 整数                   | 4           | `int x = 10;`                                    |
| `unsigned int`       | 无符号整数             | 4           | `unsigned int ux = 4294967295;`                  |
| `long`               | 长整数                 | 4 或 8      | `long l = 1000000;`                              |
| `unsigned long`      | 无符号长整数           | 4 或 8      | `unsigned long ul = 1000000;`                    |
| `long long`          | 长长整数 (C++11)       | 8           | `long long ll = 10000000000;`                    |
| `unsigned long long` | 无符号长长整数 (C++11) | 8           | `unsigned long long ull = 18446744073709551615;` |
| **浮点类型**         |                        |             |                                                  |
| `float`              | 单精度浮点数           | 4           | `float f = 3.14f;`                               |
| `double`             | 双精度浮点数           | 8           | `double d = 3.1415926535;`                       |
| `long double`        | 长双精度浮点数         | 8 或 16     | `long double ld = 3.14159265358979323846;`       |
| **布尔类型**         |                        |             |                                                  |
| `bool`               | 布尔值                 | 1           | `bool is_valid = true;`                          |
| **空类型**           |                        |             |                                                  |
| `void`               | 无类型                 | -           | 用于函数返回或通用指针                           |

### 1.2 复合数据类型

| 类型       | 描述               | 示例                                            |
| :--------- | :----------------- | :---------------------------------------------- |
| **数组**   | 相同类型元素的集合 | `int arr[5] = {1, 2, 3, 4, 5};`                 |
| **字符串** | 字符序列           | `std::string s = "Hello C++";`                  |
| **指针**   | 存储内存地址       | `int* p = &x;`                                  |
| **引用**   | 变量的别名         | `int& ref = x;`                                 |
| **结构体** | 不同类型成员的集合 | `struct Person { std::string name; int age; };` |
| **联合体** | 共用内存的不同类型 | `union Data { int i; float f; char c; };`       |
| **枚举**   | 命名常量集合       | `enum Color { RED, GREEN, BLUE };`              |
| **类**     | 面向对象的类型     | `class MyClass { /* ... */ };`                  |

### 1.3 类型修饰符

| 修饰符      | 描述                 | 示例                                                                         |
| :---------- | :------------------- | :--------------------------------------------------------------------------- |
| `signed`    | 有符号类型 (默认)    | `signed int x = -10;`                                                        |
| `unsigned`  | 无符号类型           | `unsigned int y = 10;`                                                       |
| `short`     | 短类型               | `short s = 100;`                                                             |
| `long`      | 长类型               | `long l = 1000000;`                                                          |
| `const`     | 常量类型             | `const int MAX = 100;`                                                       |
| `volatile`  | 易变类型             | `volatile int flag = 0;`                                                     |
| `constexpr` | 编译期常量 (C++11)   | `constexpr int factorial(int n) { return n <= 1 ? 1 : n * factorial(n-1); }` |
| `auto`      | 自动类型推断 (C++11) | `auto i = 10;`                                                               |
| `decltype`  | 类型推导 (C++11)     | `decltype(i) j = 20;`                                                        |

### 1.4 类型转换

#### 1.4.1 隐式类型转换

```cpp
 int i = 10;
 double d = i; // 隐式转换：int -> double
 char c = 'A';
 i = c; // 隐式转换：char -> int
```

#### 1.4.2 显式类型转换

```cpp
 // C 风格转换
 double d = 3.14;
 int i = (int)d; // 截断小数部分
 // C++ 风格转换
 // static_cast: 静态类型转换
 i = static_cast<int>(d);
 // dynamic_cast: 动态类型转换（用于多态）
 Base* base = new Derived();
 Derived* derived = dynamic_cast<Derived*>(base);
 // const_cast: 移除 const 修饰
 const int& const_ref = i;
 int& ref = const_cast<int&>(const_ref);
 // reinterpret_cast: 重新解释类型
 int* p = &i;
 long addr = reinterpret_cast<long>(p);
```

## 2. 控制流 (Control Flow)

### 2.1 条件判断

#### 2.1.1 if 语句

```cpp
 // 基本 if 语句
 int score = 85;
 if (score >= 90) {
  std::cout << "优秀" << std::endl;
 True} else if (score >= 80) {
  std::cout << "良好" << std::endl;
 True} else if (score >= 60) {
  std::cout << "及格" << std::endl;
 True} else {
  std::cout << "不及格" << std::endl;
 True}
 // 嵌套 if 语句
 int x = 10, y = 20;
 if (x > 0) {
  if (y > 0) {
  std::cout << "x 和 y 都是正数" << std::endl;
  } else {
  std::cout << "x 是正数，y 不是正数" << std::endl;
  }
 True}
 // 使用逻辑运算符
 int a = 5, b = 10, c = 15;
 if (a > 0 && b > 0 && c > 0) {
  std::cout << "所有数都是正数" << std::endl;
 True}
 if (a > 10 || b > 10 || c > 10) {
  std::cout << "至少有一个数大于 10" << std::endl;
 True}
```

#### 2.1.2 switch 语句

```cpp
 // 基本 switch 语句
 int day = 3;
 switch (day) {
  case 1:
  std::cout << "星期一" << std::endl;
  break;
  case 2:
  std::cout << "星期二" << std::endl;
  break;
  case 3:
  std::cout << "星期三" << std::endl;
  break;
  case 4:
  std::cout << "星期四" << std::endl;
  break;
  case 5:
  std::cout << "星期五" << std::endl;
  break;
  case 6:
  case 7:
  std::cout << "周末" << std::endl;
  break;
  default:
  std::cout << "无效的日期" << std::endl;
  break;
 True}
 // 使用枚举的 switch 语句
 enum Color { RED, GREEN, BLUE };
 Color color = GREEN;
 switch (color) {
  case RED:
  std::cout << "红色" << std::endl;
  break;
  case GREEN:
  std::cout << "绿色" << std::endl;
  break;
  case BLUE:
  std::cout << "蓝色" << std::endl;
  break;
  default:
  std::cout << "未知颜色" << std::endl;
  break;
 True}
 // 使用枚举类的 switch 语句 (C++11)
 enum class Direction { UP, DOWN, LEFT, RIGHT };
 Direction dir = Direction::UP;
 switch (dir) {
  case Direction::UP:
  std::cout << "向上" << std::endl;
  break;
  case Direction::DOWN:
  std::cout << "向下" << std::endl;
  break;
  case Direction::LEFT:
  std::cout << "向左" << std::endl;
  break;
  case Direction::RIGHT:
  std::cout << "向右" << std::endl;
  break;
 True}
```

### 2.2 循环结构

#### 2.2.1 for 循环

```cpp
 // 传统 for 循环
 for (int i = 0; i < 10; ++i) {
  std::cout << i << " ";
 True}
 std::cout << std::endl;
 // 循环变量作用域控制
 {
  for (int i = 0; i < 5; ++i) {
  std::cout << i << " ";
  }
  // i 在这里不可见
 True}
 // 多变量 for 循环
 for (int i = 0, j = 10; i < 5 && j > 5; ++i, --j) {
  std::cout << "i: " << i << ", j: " << j << std::endl;
 True}
 // 范围 for 循环 (C++11)
 std::vector<int> numbers = {1, 2, 3, 4, 5};
 for (int num : numbers) {
  std::cout << num << " ";
 True}
 std::cout << std::endl;
 // 使用 auto 的范围 for 循环 (C++11)
 for (auto num : numbers) {
  std::cout << num << " ";
 True}
 std::cout << std::endl;
 // 使用 const 引用的范围 for 循环（避免复制）
 for (const auto& num : numbers) {
  std::cout << num << " ";
 True}
 std::cout << std::endl;
 // 使用引用的范围 for 循环（可以修改元素）
 for (auto& num : numbers) {
  num *= 2; // 每个元素都乘以 2
 True}
 // 遍历数组
 int arr[] = {10, 20, 30, 40, 50};
 for (int x : arr) {
  std::cout << x << " ";
 True}
 std::cout << std::endl;
```

#### 2.2.2 while 循环

```cpp
 // 基本 while 循环
 int i = 0;
 while (i < 10) {
  std::cout << i << " ";
  ++i;
 True}
 std::cout << std::endl;
 // 无限循环（需要内部 break）
 i = 0;
 while (true) {
  std::cout << i << " ";
  ++i;
  if (i >= 10) {
  break;
  }
 True}
 std::cout << std::endl;
 // 基于条件的 while 循环
 std::string input;
 while (true) {
  std::cout << "输入 'quit' 退出: ";
  std::cin >> input;
  if (input == "quit") {
  break;
  }
  std::cout << "你输入了: " << input << std::endl;
 True}
```

#### 2.2.3 do-while 循环

```cpp
 // 基本 do-while 循环
 int i = 0;
 do {
  std::cout << i << " ";
  ++i;
 True} while (i < 10);
 std::cout << std::endl;
 // 至少执行一次的情况
 std::string password;
 do {
  std::cout << "请输入密码: ";
  std::cin >> password;
 True} while (password != "123456");
 std::cout << "密码正确！" << std::endl;
```

### 2.3 跳转语句

#### 2.3.1 break 语句

```cpp
 // 在 for 循环中使用 break
 for (int i = 0; i < 10; ++i) {
  if (i == 5) {
  break; // 跳出循环
  }
  std::cout << i << " ";
 True}
 // 输出: 0 1 2 3 4
 // 在 while 循环中使用 break
 int j = 0;
 while (j < 10) {
  if (j == 5) {
  break;
  }
  std::cout << j << " ";
  ++j;
 True}
 // 在 switch 语句中使用 break
 int value = 2;
 switch (value) {
  case 1:
  std::cout << "值为 1" << std::endl;
  break;
  case 2:
  std::cout << "值为 2" << std::endl;
  break; // 没有这个 break 会继续执行下一个 case
  case 3:
  std::cout << "值为 3" << std::endl;
  break;
 True}
```

#### 2.3.2 continue 语句

```cpp
 // 在 for 循环中使用 continue
 for (int i = 0; i < 10; ++i) {
  if (i % 2 == 0) {
  continue; // 跳过当前迭代
  }
  std::cout << i << " ";
 True}
 // 输出: 1 3 5 7 9
 // 在 while 循环中使用 continue
 int j = 0;
 while (j < 10) {
  ++j;
  if (j % 2 == 0) {
  continue;
  }
  std::cout << j << " ";
 True}
 // 在范围 for 循环中使用 continue
 std::vector<int> nums = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
 for (auto num : nums) {
  if (num % 3 == 0) {
  continue;
  }
  std::cout << num << " ";
 True}
```

#### 2.3.3 return 语句

```cpp
 // 基本 return 语句
 int add(int a, int b) {
  return a + b; // 返回值并结束函数
 True}
 // 提前返回
 bool is_even(int n) {
  if (n % 2 == 0) {
  return true; // 提前返回
  }
  return false;
 True}
 // 返回引用
 int& get_largest(int& a, int& b) {
  if (a > b) {
  return a;
  }
  return b;
 True}
 // 返回空
 void print_hello() {
  std::cout << "Hello!" << std::endl;
  return; // 可选
 True}
 int main() {
  int result = add(5, 3);
  std::cout << "5 + 3 = " << result << std::endl;
  int x = 10, y = 20;
  int& largest = get_largest(x, y);
  largest = 100; // 修改返回的引用
  std::cout << "x: " << x << ", y: " << y << std::endl;
  return 0; // 结束主函数
 True}
```

#### 2.3.4 goto 语句（不推荐使用）

```cpp
 // 基本 goto 语句
 int main() {
  int i = 0;
 loop:
  std::cout << i << " ";
  ++i;
  if (i < 10) {
  goto loop; // 跳转到标签处
  }
  return 0;
 True}
 // 使用 goto 跳出多层循环
 void nested_loops() {
  for (int i = 0; i < 10; ++i) {
  for (int j = 0; j < 10; ++j) {
  if (i * j > 20) {
  goto exit_loops; // 跳出所有循环
  }
  std::cout << "i: " << i << ", j: " << j << std::endl;
  }
  }
 exit_loops:
  std::cout << "跳出循环" << std::endl;
 True}
 // 使用 goto 进行错误处理
 bool process_data() {
  // 模拟错误
  bool error = true;
  if (error) {
  goto error_handler;
  }
  // 正常处理
  return true;
 error_handler:
  std::cout << "处理错误" << std::endl;
  return false;
 True}
```

## 3. 输入输出 (I/O)

### 3.1 标准输入输出

#### 3.1.1 输出

```cpp
 #include <iostream>
 int main() {
  // 基本输出
  std::cout << "Hello, C++!" << std::endl;
  // 多个值输出
  int x = 10;
  double y = 3.14;
  std::cout << "x = " << x << ", y = " << y << std::endl;
  // 使用 endl 换行并刷新缓冲区
  std::cout << "Line 1" << std::endl;
  std::cout << "Line 2" << std::endl;
  // 使用 \n 仅换行
  std::cout << "Line 1\nLine 2" << std::endl;
  // 输出布尔值
  bool flag = true;
  std::cout << "Flag: " << flag << std::endl; // 输出 1
  std::cout << std::boolalpha << "Flag: " << flag << std::endl; // 输出
  // 输出字符和字符串
  char c = 'A';
  std::string s = "Hello";
  std::cout << "Character: " << c << std::endl;
  std::cout << "String: " << s << std::endl;
  return 0;
 True}
```

#### 3.1.2 输入

```cpp
 #include <iostream>
 #include <string>
 int main() {
  // 输入整数
  int x;
  std::cout << "Enter an integer: ";
  std::cin >> x;
  std::cout << "You entered: " << x << std::endl;
  // 输入浮点数
  double y;
  std::cout << "Enter a double: ";
  std::cin >> y;
  std::cout << "You entered: " << y << std::endl;
  // 输入布尔值
  bool flag;
  std::cout << "Enter a boolean (0 or 1): ";
  std::cin >> flag;
  std::cout << "You entered: " << std::boolalpha << flag << std::endl;
  // 输入字符
  char c;
  std::cout << "Enter a character: ";
  std::cin >> c;
  std::cout << "You entered: " << c << std::endl;
  // 输入字符串（遇到空格停止）
  std::string name;
  std::cout << "Enter your name: ";
  std::cin >> name;
  std::cout << "Hello, " << name << "!" << std::endl;
  // 输入一行字符串
  std::string line;
  std::cout << "Enter a line: ";
  std::cin.ignore(); // 忽略之前的换行符
  std::getline(std::cin, line);
  std::cout << "You entered: " << line << std::endl;
  // 输入多个值
  int a, b;
  std::cout << "Enter two integers: ";
  std::cin >> a >> b;
  std::cout << "You entered: " << a << " and " << b << std::endl;
  return 0;
 True}
```

#### 3.1.3 输入验证

```cpp
 #include <iostream>
 #include <limits>
 int main() {
  int age;
  // 验证输入是否为整数
  while (true) {
  std::cout << "Enter your age: ";
  if (std::cin >> age) {
  // 输入成功
  break;
  } else {
  // 输入失败，清除错误状态
  std::cin.clear();
  // 忽略无效输入
  std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
  std::cout << "Invalid input. Please enter a number." << std::endl;
  }
  }
  std::cout << "Your age is: " << age << std::endl;
  return 0;
 True}
```

### 3.2 格式化输出

```cpp
 #include <iostream>
 #include <iomanip>
 int main() {
  // 设置输出宽度
  std::cout << std::setw(10) << "Name" << std::setw(10) << "Age" << std::endl;
  std::cout << std::setw(10) << "Alice" << std::setw(10) << 25 << std::endl;
  std::cout << std::setw(10) << "Bob" << std::setw(10) << 30 << std::endl;
  // 设置填充字符
  std::cout << std::setw(10) << std::setfill('*') << "Hello" << std::endl;
  // 设置精度
  double pi = 3.1415926535;
  std::cout << "Pi: " << std::setprecision(5) << pi << std::endl;
  // 固定精度
  std::cout << "Pi (fixed): " << std::fixed << std::setprecision(2) << pi << std::endl;
  // 科学计数法
  double large_num = 123456789.123456;
  std::cout << "Large number: " << std::scientific << large_num << std::endl;
  // 十六进制输出
  int x = 255;
  std::cout << "Hex: " << std::hex << x << std::endl;
  std::cout << "Hex (uppercase): " << std::hex << std::uppercase << x << std::endl;
  // 八进制输出
  std::cout << "Octal: " << std::oct << x << std::endl;
  // 重置为十进制
  std::cout << "Decimal: " << std::dec << x << std::endl;
  // 显示正负号
  int positive = 10;
  int negative = -10;
  std::cout << "Positive: " << std::showpos << positive << std::endl;
  std::cout << "Negative: " << negative << std::endl;
  std::cout << std::noshowpos; // 关闭显示正负号
  // 显示前导零
  int num = 42;
  std::cout << "With leading zeros: " << std::setw(5) << std::setfill('0') << num << std::endl;
  return 0;
 True}
```

### 3.3 文件输入输出

```cpp
 #include <iostream>
 #include <fstream>
 #include <string>
 int main() {
  // 写入文件
  std::ofstream outfile("example.txt");
  if (outfile.is_open()) {
  outfile << "Hello, File!" << std::endl;
  outfile << "This is a test." << std::endl;
  outfile << "Number: " << 42 << std::endl;
  outfile.close();
  std::cout << "File written successfully." << std::endl;
  } else {
  std::cerr << "Unable to open file for writing." << std::endl;
  }
  // 读取文件
  std::ifstream infile("example.txt");
  if (infile.is_open()) {
  std::string line;
  std::cout << "File contents:" << std::endl;
  while (std::getline(infile, line)) {
  std::cout << line << std::endl;
  }
  infile.close();
  } else {
  std::cerr << "Unable to open file for reading." << std::endl;
  }
  return 0;
 True}
```

### 3.4 字符串流

```cpp
 #include <iostream>
 #include <sstream>
 #include <string>
 int main() {
  // 输出字符串流
  std::stringstream ss;
  ss << "Name: " << "Alice" << ", Age: " << 25 << ", Score: " << 95.5;
  std::string result = ss.str();
  std::cout << "String stream result: " << result << std::endl;
  // 输入字符串流
  std::string data = "10 3.14 Hello";
  std::stringstream input_ss(data);
  int i;
  double d;
  std::string s;
  input_ss >> i >> d >> s;
  std::cout << "Parsed values: " << i << ", " << d << ", " << s << std::endl;
  // 格式化数字为字符串
  std::stringstream format_ss;
  format_ss << std::fixed << std::setprecision(2) << 3.14159;
  std::string pi_str = format_ss.str();
  std::cout << "Formatted pi: " << pi_str << std::endl;
  return 0;
 True}
```

## 4. 命名空间 (Namespace)

### 4.1 命名空间的定义

```cpp
 // 定义命名空间
 namespace MyNamespace {
  int add(int a, int b) {
  return a + b;
  }
  namespace Nested {
  int multiply(int a, int b) {
  return a * b;
  }
  }
 True}
 int main() {
  // 使用命名空间
  int result1 = MyNamespace::add(5, 3);
  int result2 = MyNamespace::Nested::multiply(5, 3);
  std::cout << "5 + 3 = " << result1 << std::endl;
  std::cout << "5 * 3 = " << result2 << std::endl;
  return 0;
 True}
```

### 4.2 using 声明

```cpp
 #include <iostream>
 // 使用命名空间中的特定成员
 using std::cout;
 using std::endl;
 int main() {
  cout << "Hello, C++!" << endl;
  return 0;
 True}
```

### 4.3 using 指令

```cpp
 #include <iostream>
 // 使用整个命名空间
 using namespace std;
 int main() {
  cout << "Hello, C++!" << endl;
  return 0;
 True}
```

### 4.4 命名空间别名

```cpp
 #include <iostream>
 namespace long_namespace_name {
  void func() {
  std::cout << "Function in long namespace" << std::endl;
  }
 True}
 // 命名空间别名
 namespace lnn = long_namespace_name;
 int main() {
  lnn::func();
  return 0;
 True}
```

## 5. 作用域 (Scope)

### 5.1 块作用域

```cpp
 int main() {
  // 全局作用域
  int global_var = 10;
  if (true) {
  // 块作用域
  int local_var = 20;
  std::cout << "local_var: " << local_var << std::endl;
  std::cout << "global_var: " << global_var << std::endl;
  }
  // 这里无法访问 local_var
  std::cout << "global_var: " << global_var << std::endl;
  return 0;
 True}
```

### 5.2 函数作用域

```cpp
 void func() {
  // 函数作用域
  int func_var = 100;
  std::cout << "func_var: " << func_var << std::endl;
 True}
 int main() {
  // 这里无法访问 func_var
  func();
  return 0;
 True}
```

### 5.3 类作用域

```cpp
 class MyClass {
 public:
  int public_var; // 类作用域
 private:
  int private_var; // 类作用域
 True};
 int main() {
  MyClass obj;
  obj.public_var = 10; // 可以访问
  // obj.private_var = 20; // 无法访问，private 成员
  return 0;
 True}
```

### 5.4 命名空间作用域

```cpp
 namespace MyNS {
  int ns_var = 1000; // 命名空间作用域
 True}
 int main() {
  std::cout << MyNS::ns_var << std::endl;
  return 0;
 True}
```

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_102 拆分，专注于基础语法（数据类型、控制流、I/O、命名空间、作用域）。
