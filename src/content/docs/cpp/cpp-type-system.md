---
order: 30
tags:
  - 'cpp'
difficulty: 'intermediate'
title: 'C++ 类型系统'
module: 'cpp'
category: 'C++ Basics'
description: 'C++ 基本类型、类型推导、类型转换与类型安全。'
author: 'Anonymous'
---

## 目录

1. [常量](#常量)
2. [类型推导](#类型推导)
3. [类型别名](#类型别名)
4. [最佳实践](#最佳实践)
5. [代码示例](#代码示例)

---

## 1. 常量 (Constants)

### 1.1 const 常量

```cpp
 // 全局常量
 const int MAX_VALUE = 100;
 int main() {
  // 局部常量
  const double PI = 3.14159;
  // 常量指针
  const int* p = &MAX_VALUE;
  // *p = 200; // 错误：不能修改 const 指针指向的值
  // 指针常量
  int x = 10;
  int* const q = &x;
  *q = 20; // 可以修改指针指向的值
  // q = &MAX_VALUE; // 错误：不能修改指针本身
  // const 引用
  const int& ref = x;
  // ref = 30; // 错误：不能修改 const 引用
  return 0;
 True}
```

### 1.2 constexpr 常量 (C++11)

```cpp
 // 编译期常量
 constexpr int factorial(int n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
 True}
 int main() {
  constexpr int fact5 = factorial(5); // 编译期计算
  std::cout << "5! = " << fact5 << std::endl;
  return 0;
 True}
```

## 2. 类型推导

### 2.1 auto 类型推导 (C++11)

```cpp
 #include <iostream>
 #include <vector>
 int main() {
  // 基本类型推导
  auto i = 10; // int
  auto d = 3.14; // double
  auto s = "Hello"; // const char*
  auto b = true; // bool
  // 容器类型推导
  std::vector<int> v = {1, 2, 3};
  auto it = v.begin(); // 迭代器类型
  // 函数返回类型推导
  auto add = [](int a, int b) { return a + b; }; // lambda 表达式
  std::cout << "add(5, 3) = " << add(5, 3) << std::endl;
  return 0;
 True}
```

### 2.2 decltype 类型推导 (C++11)

```cpp
 #include <iostream>
 int main() {
  int x = 10;
  decltype(x) y = 20; // y 的类型是 int
  double z = 3.14;
  decltype(x + z) w = x + z; // w 的类型是 double
  std::cout << "y = " << y << ", w = " << w << std::endl;
  return 0;
 True}
```

## 3. 类型别名

### 3.1 typedef

```cpp
 #include <iostream>
 // 类型别名
 typedef unsigned int uint;
 typedef std::vector<int> IntVector;
 int main() {
  uint x = 100;
  IntVector v = {1, 2, 3};
  std::cout << "x = " << x << std::endl;
  for (auto num : v) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  return 0;
 True}
```

### 3.2 using 别名 (C++11)

```cpp
 #include <iostream>
 #include <vector>
 // 使用 using 定义类型别名
 using uint = unsigned int;
 using IntVector = std::vector<int>;
 int main() {
  uint x = 100;
  IntVector v = {1, 2, 3};
  std::cout << "x = " << x << std::endl;
  for (auto num : v) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  return 0;
 True}
```

## 4. 最佳实践

### 4.1 代码风格

#### 4.1.1 命名规范

- **变量和函数**：`camelCase` 或 `snake_case`
- 示例：`int studentCount;` 或 `int student_count;`
- 示例：`void calculateTotal();` 或 `void calculate_total();`
- **类和结构体**：`PascalCase`
- 示例：`class StudentRecord;`
- 示例：`struct Point3D;`
- **常量**：`UPPER_CASE`
- 示例：`const int MAX_SIZE = 100;`
- 示例：`constexpr double PI = 3.14159;`
- **命名空间**：`lowercase`
- 示例：`namespace utils;`
- 示例：`namespace math_helpers;`
- **类型别名**：`PascalCase` 或 `camelCase`
- 示例：`using IntVector = std::vector<int>;`
- 示例：`typedef std::map<std::string, int> StringIntMap;`

#### 4.1.2 缩进和格式

- **缩进**：使用 4 个空格或 1 个制表符
- **大括号**：使用 K&R 风格（左大括号在同一行）

```cpp
 if (condition) {
 // 代码
 }
```

- **行长度**：每行不超过 80-100 个字符
- **空行**：适当使用空行分隔代码块
- **空格**：在操作符前后、逗号后添加空格

```cpp
 int result = a + b;
 func(a, b, c);
```

#### 4.1.3 注释

- **文档注释**：函数前添加文档注释

```cpp
 /**
 * @brief 计算两个数的和
 * @param a 第一个数
 * @param b 第二个数
 * @return 两数之和
 */
 int add(int a, int b) {
 return a + b;
 }
```

- **代码注释**：为复杂代码添加注释

```cpp
 // 使用二分查找算法
 int binary_search(const std::vector<int>& arr, int target) {
 // 初始化左右边界
 int left = 0, right = arr.size() - 1;
 // 循环查找
 while (left <= right) {
 int mid = left + (right - left) / 2; // 避免整数溢出
 if (arr[mid] == target) {
 return mid;
 } else if (arr[mid] < target) {
 left = mid + 1;
 } else {
 right = mid - 1;
 }
 }
 return -1;
 }
```

### 4.2 类型使用建议

#### 4.2.1 基本类型

- **优先使用 auto**：简化代码，提高可维护性

```cpp
 auto result = calculate(); // 自动推导返回类型
 auto it = container.begin(); // 简化迭代器类型
```

- **使用 constexpr**：对于编译期常量，提高性能

```cpp
 constexpr int MAX_SIZE = 100; // 编译期常量
 constexpr int factorial(int n) { return n <= 1 ? 1 : n * factorial(n-1); }
```

- **合理使用 const**：提高代码安全性和可读性

```cpp
 const int& get_value() const; // 常量成员函数，不修改对象状态
 void process(const std::string& str); // 避免复制，且不修改参数
```

- **注意类型转换**：避免隐式类型转换导致的问题

```cpp
 // 显式转换
 double d = 3.14;
 int i = static_cast<int>(d); // 明确转换意图
```

#### 4.2.2 复合类型

- **使用 STL 容器**：优先使用标准库容器

```cpp
 std::vector<int> numbers; // 动态数组
 std::map<std::string, int> scores; // 键值对
 std::unordered_set<int> unique_values; // 哈希集合
```

- **智能指针**：使用智能指针管理内存

```cpp
 std::unique_ptr<MyClass> ptr = std::make_unique<MyClass>();
 std::shared_ptr<MyClass> shared_ptr = std::make_shared<MyClass>();
```

- **引用传递**：对于大对象，使用引用传递避免复制

```cpp
 void process_large_object(const LargeObject& obj); // 常量引用
```

### 4.3 控制流建议

- **避免使用 goto**：使用结构化控制流
- **使用范围 for 循环**：简化容器遍历

```cpp
 for (const auto& item : container) {
 // 处理 item
 }
```

- **合理使用 switch**：对于多分支条件
- **异常处理**：使用 try-catch 处理异常

### 4.4 输入输出建议

- **使用 std::cout 和 std::cin**：标准库提供的输入输出功能
- **格式化输出**：使用 iomanip 库进行格式化

```cpp
 std::cout << std::fixed << std::setprecision(2) << value << std::endl;
```

- **错误处理**：检查输入是否成功

```cpp
 if (!(std::cin >> value)) {
 std::cerr << "Invalid input" << std::endl;
 std::cin.clear();
 std::cin.ignore();
 }
```

- **避免使用 C 风格 I/O**：如 printf 和 scanf

### 4.5 性能优化建议

- **减少复制**：使用移动语义和引用
- **预分配内存**：对于容器，提前分配足够的空间

```cpp
 std::vector<int> vec;
 vec.reserve(1000); // 预分配空间
```

- **避免频繁的内存分配**：使用对象池或内存池
- **内联函数**：对于小函数，使用 inline 关键字

```cpp
 inline int min(int a, int b) {
 return a < b ? a : b;
 }
```

## 5. 代码示例

### 5.1 温度转换

```cpp
 #include <iostream>
 #include <iomanip>
 // 摄氏度转华氏度
 double celsius_to_fahrenheit(double celsius) {
  return (celsius * 9.0 / 5.0) + 32.0;
 True}
 // 华氏度转摄氏度
 double fahrenheit_to_celsius(double fahrenheit) {
  return (fahrenheit - 32.0) * 5.0 / 9.0;
 True}
 // 温度单位转换类
 class TemperatureConverter {
 public:
  static double celsius_to_fahrenheit(double celsius) {
  return (celsius * 9.0 / 5.0) + 32.0;
  }
  static double fahrenheit_to_celsius(double fahrenheit) {
  return (fahrenheit - 32.0) * 5.0 / 9.0;
  }
  static double celsius_to_kelvin(double celsius) {
  return celsius + 273.15;
  }
  static double kelvin_to_celsius(double kelvin) {
  return kelvin - 273.15;
  }
 True};
 int main() {
  double c, f, k;
  std::cout << "输入摄氏度: ";
  std::cin >> c;
  f = TemperatureConverter::celsius_to_fahrenheit(c);
  k = TemperatureConverter::celsius_to_kelvin(c);
  std::cout << std::fixed << std::setprecision(2);
  std::cout << c << "°C = " << f << "°F = " << k << "K" << std::endl;
  std::cout << "输入华氏度: ";
  std::cin >> f;
  c = TemperatureConverter::fahrenheit_to_celsius(f);
  k = TemperatureConverter::celsius_to_kelvin(c);
  std::cout << f << "°F = " << c << "°C = " << k << "K" << std::endl;
  return 0;
 True}
```

### 5.2 素数判断

```cpp
 #include <iostream>
 #include <cmath>
 #include <vector>
 // 单个素数判断
 bool is_prime(int n) {
  if (n <= 1) return false;
  if (n == 2) return true;
  if (n % 2 == 0) return false;
  int sqrt_n = sqrt(n);
  for (int i = 3; i <= sqrt_n; i += 2) {
  if (n % i == 0) return false;
  }
  return true;
 True}
 // 埃拉托斯特尼筛法生成素数列表
 std::vector<int> sieve_of_eratosthenes(int max) {
  std::vector<bool> is_prime(max + 1, true);
  std::vector<int> primes;
  is_prime[0] = is_prime[1] = false;
  for (int i = 2; i <= max; ++i) {
  if (is_prime[i]) {
  primes.push_back(i);
  for (int j = i * 2; j <= max; j += i) {
  is_prime[j] = false;
  }
  }
  }
  return primes;
 True}
 // 素数工具类
 class PrimeUtils {
 public:
  static bool is_prime(int n) {
  if (n <= 1) return false;
  if (n == 2) return true;
  if (n % 2 == 0) return false;
  int sqrt_n = sqrt(n);
  for (int i = 3; i <= sqrt_n; i += 2) {
  if (n % i == 0) return false;
  }
  return true;
  }
  static std::vector<int> sieve_of_eratosthenes(int max) {
  std::vector<bool> is_prime(max + 1, true);
  std::vector<int> primes;
  is_prime[0] = is_prime[1] = false;
  for (int i = 2; i <= max; ++i) {
  if (is_prime[i]) {
  primes.push_back(i);
  for (int j = i * 2; j <= max; j += i) {
  is_prime[j] = false;
  }
  }
  }
  return primes;
  }
  static int count_primes(int max) {
  auto primes = sieve_of_eratosthenes(max);
  return primes.size();
  }
 True};
 int main() {
  int n;
  std::cout << "输入一个整数: ";
  std::cin >> n;
  if (PrimeUtils::is_prime(n)) {
  std::cout << n << " 是素数" << std::endl;
  } else {
  std::cout << n << " 不是素数" << std::endl;
  }
  int max;
  std::cout << "输入最大值，生成素数列表: ";
  std::cin >> max;
  auto primes = PrimeUtils::sieve_of_eratosthenes(max);
  std::cout << "小于等于 " << max << " 的素数有 " << primes.size() << " 个: " << std::endl;
  for (int prime : primes) {
  std::cout << prime << " ";
  }
  std::cout << std::endl;
  return 0;
 True}
```

### 5.3 数组操作

```cpp
 #include <iostream>
 #include <vector>
 #include <algorithm>
 #include <numeric>
 // 计算数组和
 int sum_array(const std::vector<int>& arr) {
  int sum = 0;
  for (int num : arr) {
  sum += num;
  }
  return sum;
 True}
 // 使用标准库计算数组和
 int sum_array_std(const std::vector<int>& arr) {
  return std::accumulate(arr.begin(), arr.end(), 0);
 True}
 // 查找最大值
 int find_max(const std::vector<int>& arr) {
  if (arr.empty()) {
  throw std::runtime_error("Array is empty");
  }
  int max = arr[0];
  for (int num : arr) {
  if (num > max) {
  max = num;
  }
  }
  return max;
 True}
 // 使用标准库查找最大值
 int find_max_std(const std::vector<int>& arr) {
  if (arr.empty()) {
  throw std::runtime_error("Array is empty");
  }
  return *std::max_element(arr.begin(), arr.end());
 True}
 // 数组排序
 void sort_array(std::vector<int>& arr) {
  std::sort(arr.begin(), arr.end());
 True}
 // 数组去重
 std::vector<int> remove_duplicates(const std::vector<int>& arr) {
  std::vector<int> result = arr;
  std::sort(result.begin(), result.end());
  auto last = std::unique(result.begin(), result.end());
  result.erase(last, result.end());
  return result;
 True}
 // 数组工具类
 class ArrayUtils {
 public:
  static int sum(const std::vector<int>& arr) {
  return std::accumulate(arr.begin(), arr.end(), 0);
  }
  static int max(const std::vector<int>& arr) {
  if (arr.empty()) {
  throw std::runtime_error("Array is empty");
  }
  return *std::max_element(arr.begin(), arr.end());
  }
  static int min(const std::vector<int>& arr) {
  if (arr.empty()) {
  throw std::runtime_error("Array is empty");
  }
  return *std::min_element(arr.begin(), arr.end());
  }
  static double average(const std::vector<int>& arr) {
  if (arr.empty()) {
  throw std::runtime_error("Array is empty");
  }
  int sum = std::accumulate(arr.begin(), arr.end(), 0);
  return static_cast<double>(sum) / arr.size();
  }
  static void sort(std::vector<int>& arr, bool ascending = true) {
  if (ascending) {
  std::sort(arr.begin(), arr.end());
  } else {
  std::sort(arr.begin(), arr.end(), std::greater<int>());
  }
  }
  static std::vector<int> reverse(const std::vector<int>& arr) {
  std::vector<int> result = arr;
  std::reverse(result.begin(), result.end());
  return result;
  }
 True};
 int main() {
  std::vector<int> numbers = {1, 5, 3, 9, 2, 5, 8, 3};
  std::cout << "原始数组: ";
  for (int num : numbers) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  std::cout << "数组和: " << ArrayUtils::sum(numbers) << std::endl;
  std::cout << "最大值: " << ArrayUtils::max(numbers) << std::endl;
  std::cout << "最小值: " << ArrayUtils::min(numbers) << std::endl;
  std::cout << "平均值: " << ArrayUtils::average(numbers) << std::endl;
  // 排序
  ArrayUtils::sort(numbers);
  std::cout << "排序后: ";
  for (int num : numbers) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 去重
  auto unique_numbers = remove_duplicates(numbers);
  std::cout << "去重后: ";
  for (int num : unique_numbers) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  // 反转
  auto reversed = ArrayUtils::reverse(numbers);
  std::cout << "反转后: ";
  for (int num : reversed) {
  std::cout << num << " ";
  }
  std::cout << std::endl;
  return 0;
 True}
```

### 5.4 字符串操作

```cpp
 #include <iostream>
 #include <string>
 #include <algorithm>
 #include <cctype>
 // 字符串工具类
 class StringUtils {
 public:
  // 字符串反转
  static std::string reverse(const std::string& str) {
  std::string result = str;
  std::reverse(result.begin(), result.end());
  return result;
  }
  // 字符串转大写
  static std::string to_upper(const std::string& str) {
  std::string result = str;
  std::transform(result.begin(), result.end(), result.begin(),
  [](unsigned char c) { return std::toupper(c); });
  return result;
  }
  // 字符串转小写
  static std::string to_lower(const std::string& str) {
  std::string result = str;
  std::transform(result.begin(), result.end(), result.begin(),
  [](unsigned char c) { return std::tolower(c); });
  return result;
  }
  // 去除首尾空格
  static std::string trim(const std::string& str) {
  size_t start = str.find_first_not_of(" \t\n\r");
  if (start == std::string::npos) return "";
  size_t end = str.find_last_not_of(" \t\n\r");
  return str.substr(start, end - start + 1);
  }
  // 检查是否是回文
  static bool is_palindrome(const std::string& str) {
  std::string cleaned;
  for (char c : str) {
  if (std::isalnum(c)) {
  cleaned += std::tolower(c);
  }
  }
  std::string reversed = cleaned;
  std::reverse(reversed.begin(), reversed.end());
  return cleaned == reversed;
  }
  // 统计单词数量
  static int count_words(const std::string& str) {
  int count = 0;
  bool in_word = false;
  for (char c : str) {
  if (std::isspace(c)) {
  in_word = false;
  } else if (!in_word) {
  in_word = true;
  count++;
  }
  }
  return count;
  }
 True};
 int main() {
  std::string text = " Hello, World! ";
  std::cout << "原始字符串: '" << text << "'" << std::endl;
  std::cout << "去除空格: '" << StringUtils::trim(text) << "'" << std::endl;
  std::cout << "大写: '" << StringUtils::to_upper(text) << "'" << std::endl;
  std::cout << "小写: '" << StringUtils::to_lower(text) << "'" << std::endl;
  std::cout << "反转: '" << StringUtils::reverse(text) << "'" << std::endl;
  std::string palindrome = "A man a plan a canal Panama";
  std::cout << "是否回文: '" << palindrome << "' -> "
  << (StringUtils::is_palindrome(palindrome) ? "是" : "否") << std::endl;
  std::string sentence = "This is a test sentence";
  std::cout << "单词数量: '" << sentence << "' -> "
  << StringUtils::count_words(sentence) << std::endl;
  return 0;
 True}
```

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_102 拆分，专注于类型系统（常量、类型推导、类型别名、最佳实践、代码示例）。
