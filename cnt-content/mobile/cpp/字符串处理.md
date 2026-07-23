# 字符串处理

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## std::string 基础

**基本写法：创建字符串**
`std::string <str> = "<value>";`
```cpp
#include <string>
// 创建字符串
std::string str = "Hello";
```

---

**构造写法：使用构造函数**
`std::string <str>("<value>");`
```cpp
#include <string>
// 使用构造函数创建字符串
std::string str("Hello");
```

---

**重复写法：构造重复字符的字符串**
`std::string <str>(<count>, '<char>');`
```cpp
#include <string>
// 创建包含 5 个 'a' 的字符串
std::string str(5, 'a');
```

---

**子串写法：从已有字符串构造子串**
`std::string <str>(<other>, <pos>, <len>);`
```cpp
#include <string>
// 从 str 的位置 1 开始取 3 个字符
std::string sub(str, 1, 3);
```

---

## 字符串操作

**拼接写法：使用 + 运算符**
`<str1> + <str2>`
```cpp
// 使用 + 拼接字符串
std::string s1 = "Hello";
std::string s2 = " World";
std::string result = s1 + s2;
```

---

**追加写法：使用 append 方法**
`<str>.append("<value>");`
```cpp
// 使用 append 追加字符串
std::string str = "Hello";
str.append(" World");
```

---

**追加写法：使用 += 运算符**
`<str> += "<value>";`
```cpp
// 使用 += 追加字符串
std::string str = "Hello";
str += " World";
```

---

**长度写法：获取字符串长度**
`<str>.length()` 或 `<str>.size()`
```cpp
// 获取字符串长度
std::string str = "Hello";
size_t len = str.length();
```

---

## 字符串查找

**find 写法：查找子串**
`<str>.find("<substring>")`
```cpp
// 查找子串位置
std::string str = "Hello World";
size_t pos = str.find("World");
```

---

**rfind 写法：从后向前查找**
`<str>.rfind("<substring>")`
```cpp
// 从后向前查找子串位置
std::string str = "Hello World World";
size_t pos = str.rfind("World");
```

---

**find_first_of 写法：查找第一个匹配字符**
`<str>.find_first_of("<chars>")`
```cpp
// 查找第一个匹配的字符
std::string str = "Hello";
size_t pos = str.find_first_of("aeiou");
```

---

**npos 写法：检查是否找到**
`if (<pos> != std::string::npos) { ... }`
```cpp
// 检查是否找到子串
std::string str = "Hello";
size_t pos = str.find("xyz");
if (pos != std::string::npos) {
    std::cout << "Found" << std::endl;
}
```

---

## 子串提取

**substr 写法：提取子串**
`<str>.substr(<pos>, <len>)`
```cpp
// 从位置 6 开始提取 5 个字符
std::string str = "Hello World";
std::string sub = str.substr(6, 5);
```

---

**substr 写法：提取到末尾**
`<str>.substr(<pos>)`
```cpp
// 从位置 6 提取到末尾
std::string str = "Hello World";
std::string sub = str.substr(6);
```

---

## 字符串修改

**replace 写法：替换子串**
`<str>.replace(<pos>, <len>, "<new>")`
```cpp
// 替换子串
std::string str = "Hello World";
str.replace(6, 5, "C++");
```

---

**insert 写法：插入字符串**
`<str>.insert(<pos>, "<value>")`
```cpp
// 在指定位置插入字符串
std::string str = "Hello";
str.insert(5, " World");
```

---

**erase 写法：删除字符**
`<str>.erase(<pos>, <len>)`
```cpp
// 删除指定位置的字符
std::string str = "Hello World";
str.erase(5, 6);
```

---

**push_back 写法：追加单个字符**
`<str>.push_back('<char>')`
```cpp
// 追加单个字符
std::string str = "Hello";
str.push_back('!');
```

---

## 字符串比较

**比较写法：使用比较运算符**
`<str1> == <str2>` / `<str1> < <str2>`
```cpp
// 使用比较运算符
std::string s1 = "abc";
std::string s2 = "abd";
bool equal = (s1 == s2);
bool less = (s1 < s2);
```

---

**compare 写法：使用 compare 方法**
`<str1>.compare(<str2>)`
```cpp
// 使用 compare 方法比较
std::string s1 = "abc";
std::string s2 = "abd";
int result = s1.compare(s2);
```

---

## 字符串转换

**数字转字符串写法：使用 std::to_string**
`std::to_string(<number>)`
```cpp
#include <string>
// 数字转换为字符串
int num = 42;
std::string str = std::to_string(num);
```

---

**字符串转数字写法：使用 std::stoi**
`std::stoi(<str>)`
```cpp
#include <string>
// 字符串转换为整数
std::string str = "123";
int num = std::stoi(str);
```

---

**字符串转数字写法：使用 std::stod**
`std::stod(<str>)`
```cpp
#include <string>
// 字符串转换为 double
std::string str = "3.14";
double num = std::stod(str);
```

---

## C 风格字符串

**c_str 写法：获取 C 风格字符串**
`<str>.c_str()`
```cpp
// 获取 C 风格字符串
std::string str = "Hello";
const char* cstr = str.c_str();
```

---

**data 写法：获取字符数组**
`<str>.data()`
```cpp
// 获取字符数组
std::string str = "Hello";
const char* data = str.data();
```

---

## 字符串流

**istringstream 写法：字符串输入流**
`std::istringstream <iss>(<str>);`
```cpp
#include <sstream>
// 从字符串读取
std::string str = "10 20 30";
std::istringstream iss(str);
int a, b, c;
iss >> a >> b >> c;
```

---

**ostringstream 写法：字符串输出流**
`std::ostringstream <oss>;`
```cpp
#include <sstream>
// 写入到字符串
std::ostringstream oss;
oss << "Value: " << 42;
std::string result = oss.str();
```

---

## 字符串遍历

**范围 for 写法：遍历字符串**
`for (char <c> : <str>) { ... }`
```cpp
// 使用范围 for 循环遍历
std::string str = "Hello";
for (char c : str) {
    std::cout << c << std::endl;
}
```

---

**索引写法：通过索引遍历**
`for (size_t i = 0; i < <str>.size(); i++) { ... <str>[i] ... }`
```cpp
// 通过索引遍历
std::string str = "Hello";
for (size_t i = 0; i < str.size(); i++) {
    std::cout << str[i] << std::endl;
}
```

---

## 字符串迭代器

**迭代器写法：使用迭代器遍历**
`for (auto it = <str>.begin(); it != <str>.end(); ++it) { ... }`
```cpp
// 使用迭代器遍历
std::string str = "Hello";
for (auto it = str.begin(); it != str.end(); ++it) {
    std::cout << *it << std::endl;
}
```

---

## 字符串视图

**基本写法：创建 string_view**
`std::string_view <sv> = "<value>";`
```cpp
#include <string_view>
// 创建字符串视图（不拥有数据）
std::string_view sv = "Hello";
```

---

**使用写法：函数参数使用 string_view**
`void <func>(std::string_view <sv>) { ... }`
```cpp
#include <string_view>
// 使用 string_view 避免拷贝
void print(std::string_view sv) {
    std::cout << sv << std::endl;
}
```

---

## 原始字符串字面量

**基本写法：原始字符串**
`R"(<content>)"`
```cpp
// 原始字符串，转义字符不生效
std::string str = R"(Hello\nWorld)";
```

---

**分隔符写法：带分隔符的原始字符串**
`R"<delim>(<content>)<delim>"`
```cpp
// 带分隔符的原始字符串
std::string str = R"DELIM(This contains )")DELIM";
```
