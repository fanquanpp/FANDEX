---
order: 72
title: C++正则表达式
module: cpp
category: C++
difficulty: intermediate
description: regex库与模式匹配
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/C++序列化
  - cpp/C++网络编程
  - cpp/C++23与C++26新特性
  - cpp/C++与Python交互
prerequisites:
  - cpp/概述与环境配置
---

## 概述

C++11 引入了 `<regex>` 标准库，提供了正则表达式的支持。正则表达式是一种描述字符串模式的语言，可以用来搜索、匹配、替换和验证文本。C++ 的 regex 库支持多种正则语法（ECMAScript、POSIX 等），提供了匹配、搜索和替换等操作。

为什么需要正则表达式？当你需要验证用户输入的格式（如邮箱、手机号）、从文本中提取特定模式的数据（如 URL、日期）、或者批量替换文本中的某些模式时，正则表达式是最简洁高效的工具。没有正则表达式，你需要手写复杂的字符串解析代码。

## 基础概念

**正则表达式语法**：用特殊字符描述匹配规则。例如 `\d+` 匹配一个或多个数字，`[a-z]+` 匹配一个或多个小写字母。

**匹配（regex_match）**：检查整个字符串是否完全匹配正则表达式。适合验证格式。

**搜索（regex_search）**：在字符串中搜索匹配正则表达式的子串。适合提取数据。

**替换（regex_replace）**：将匹配的子串替换为新的内容。适合文本处理。

**捕获组**：用括号 `()` 包围的部分，可以单独提取匹配到的内容。

**迭代器（regex_iterator）**：遍历字符串中所有匹配的子串。

## 快速上手

```cpp
#include <iostream>
#include <regex>
#include <string>

int main() {
    std::string text = "我的邮箱是 test@example.com，电话是 13800138000";

    // 1. 创建正则表达式对象
    std::regex emailRegex(R"(\w+@\w+\.\w+)");  // 匹配邮箱
    std::regex phoneRegex(R"(1\d{10})");        // 匹配手机号

    // 2. 搜索匹配
    std::smatch match;
    if (std::regex_search(text, match, emailRegex)) {
        std::cout << "找到邮箱: " << match.str() << std::endl;
        // 输出: 找到邮箱: test@example.com
    }

    if (std::regex_search(text, match, phoneRegex)) {
        std::cout << "找到电话: " << match.str() << std::endl;
        // 输出: 找到电话: 13800138000
    }

    // 3. 验证格式
    std::string input = "user@domain.com";
    if (std::regex_match(input, emailRegex)) {
        std::cout << "邮箱格式正确" << std::endl;
    }

    return 0;
}
```

## 详细用法

### 常用正则语法

```cpp
// 字符类
std::regex digit(R"(\d)");       // 匹配数字 [0-9]
std::regex word(R"(\w)");        // 匹配单词字符 [a-zA-Z0-9_]
std::regex space(R"(\s)");       // 匹配空白字符（空格、制表符、换行等）
std::regex letter(R"([a-z])");   // 匹配小写字母
std::regex hex(R"([0-9a-fA-F])");// 匹配十六进制字符

// 量词
std::regex oneOrMore(R"(\d+)");    // 一个或多个数字
std::regex zeroOrMore(R"(\d*)");   // 零个或多个数字
std::regex zeroOrOne(R"(\d?)");    // 零个或一个数字
std::regex exact(R"(\d{3})");      // 恰好3个数字
std::regex range(R"(\d{2,4})");    // 2到4个数字
std::regex atLeast(R"(\d{2,})");   // 至少2个数字

// 锚点
std::regex startOfLine(R"(^\d+)");  // 行首的数字
std::regex endOfLine(R"(\d+$)");    // 行尾的数字
std::regex wholeString(R"(^\d+$)"); // 整个字符串都是数字

// 分组和选择
std::regex group(R"((\d+)-(\d+))");       // 捕获组：匹配 "123-456"
std::regex choice(R"((cat|dog))");         // 选择：匹配 "cat" 或 "dog"
std::regex nonCapture(R"((?:\d+)-(\d+))"); // 非捕获组
```

### 捕获组

```cpp
#include <iostream>
#include <regex>
#include <string>

void captureGroupDemo() {
    std::string text = "日期: 2026-06-14";
    // 用括号定义捕获组
    std::regex dateRegex(R"((\d{4})-(\d{2})-(\d{2}))");

    std::smatch match;
    if (std::regex_search(text, match, dateRegex)) {
        // match[0] 是整个匹配
        std::cout << "完整匹配: " << match[0].str() << std::endl;  // 2026-06-14

        // match[1], match[2], ... 是各个捕获组
        std::cout << "年: " << match[1].str() << std::endl;  // 2026
        std::cout << "月: " << match[2].str() << std::endl;  // 06
        std::cout << "日: " << match[3].str() << std::endl;  // 14

        // 也可以获取匹配的位置
        std::cout << "位置: " << match[1].first - text.begin() << std::endl;
    }
}
```

### 搜索所有匹配

```cpp
void searchAllDemo() {
    std::string text = "价格: 99元, 199元, 299元";
    std::regex priceRegex(R"(\d+)元");

    // 方法一：使用迭代器
    auto begin = std::sregex_iterator(text.begin(), text.end(), priceRegex);
    auto end = std::sregex_iterator();

    for (auto it = begin; it != end; ++it) {
        std::smatch match = *it;
        std::cout << "找到价格: " << match.str() << std::endl;
    }
    // 输出:
    // 找到价格: 99元
    // 找到价格: 199元
    // 找到价格: 299元

    // 方法二：使用 regex_token_iterator 只获取捕获组
    std::regex numRegex(R"((\d+)元)");
    auto tokenBegin = std::sregex_token_iterator(text.begin(), text.end(), numRegex, 1);
    auto tokenEnd = std::sregex_token_iterator();

    for (auto it = tokenBegin; it != tokenEnd; ++it) {
        std::cout << "数字: " << *it << std::endl;
    }
    // 输出: 数字: 99, 数字: 199, 数字: 299
}
```

### 替换

```cpp
void replaceDemo() {
    std::string text = "今天是 2026-06-14，明天是 2026-06-15";

    // 简单替换：将所有日期替换为 "XXXX-XX-XX"
    std::regex dateRegex(R"(\d{4}-\d{2}-\d{2})");
    std::string result1 = std::regex_replace(text, dateRegex, "XXXX-XX-XX");
    std::cout << result1 << std::endl;
    // 输出: 今天是 XXXX-XX-XX，明天是 XXXX-XX-XX

    // 使用捕获组替换：将日期格式从 YYYY-MM-DD 改为 DD/MM/YYYY
    std::regex dateRegex2(R"((\d{4})-(\d{2})-(\d{2}))");
    std::string result2 = std::regex_replace(text, dateRegex2, "$3/$2/$1");
    std::cout << result2 << std::endl;
    // 输出: 今天是 14/06/2026，明天是 15/06/2026

    // 只替换第一个匹配
    std::string result3 = std::regex_replace(text, dateRegex, "XXXX-XX-XX",
        std::regex_constants::format_first_only);
    std::cout << result3 << std::endl;
    // 输出: 今天是 XXXX-XX-XX，明天是 2026-06-15

    // 隐藏手机号中间四位
    std::string phoneText = "联系手机: 13800138000 和 13900139000";
    std::regex phoneRegex(R"((1\d{2})\d{4}(\d{4}))");
    std::string result4 = std::regex_replace(phoneText, phoneRegex, "$1****$2");
    std::cout << result4 << std::endl;
    // 输出: 联系手机: 138****8000 和 139****9000
}
```

### 验证格式

```cpp
// 验证邮箱格式
bool isValidEmail(const std::string& email) {
    std::regex emailRegex(R"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})");
    return std::regex_match(email, emailRegex);
}

// 验证中国手机号
bool isValidPhone(const std::string& phone) {
    std::regex phoneRegex(R"(^1[3-9]\d{9}$)");
    return std::regex_match(phone, phoneRegex);
}

// 验证身份证号（18位）
bool isValidIdCard(const std::string& id) {
    std::regex idRegex(R"(^\d{17}[\dXx]$)");
    return std::regex_match(id, idRegex);
}

// 验证 URL
bool isValidUrl(const std::string& url) {
    std::regex urlRegex(R"(https?://[^\s]+)");
    return std::regex_match(url, urlRegex);
}

// 验证 IP 地址
bool isValidIP(const std::string& ip) {
    std::regex ipRegex(R"((\d{1,3}\.){3}\d{1,3})");
    if (!std::regex_match(ip, ipRegex)) return false;

    // 进一步验证每段范围
    int a, b, c, d;
    char dot;
    std::istringstream iss(ip);
    iss >> a >> dot >> b >> dot >> c >> dot >> d;
    return a >= 0 && a <= 255 && b >= 0 && b <= 255
        && c >= 0 && c <= 255 && d >= 0 && d <= 255;
}
```

### 正则标志

```cpp
// 忽略大小写
std::regex caseInsensitive("hello", std::regex_constants::icase);
std::cout << std::regex_match("HELLO", caseInsensitive) << std::endl;  // 1 (true)

// 选择语法类型
std::regex ecmascript(R"(\d+)", std::regex_constants::ECMAScript);   // 默认
std::regex basic(R"(\d+)", std::regex_constants::basic);             // POSIX 基本正则
std::regex extended(R"(\d+)", std::regex_constants::extended);       // POSIX 扩展正则

// 优化匹配速度（但增加编译时间）
std::regex optimized(R"(\d+)", std::regex_constants::optimize);
```

## 常见场景

### 解析配置文件

```cpp
#include <map>
#include <regex>

// 解析 key=value 格式的配置
std::map<std::string, std::string> parseConfig(const std::string& content) {
    std::map<std::string, std::string> config;
    std::regex lineRegex(R"((\w+)\s*=\s*(.+))");

    auto begin = std::sregex_iterator(content.begin(), content.end(), lineRegex);
    auto end = std::sregex_iterator();

    for (auto it = begin; it != end; ++it) {
        std::string key = (*it)[1].str();
        std::string value = (*it)[2].str();

        // 去除值两端的空格和引号
        if (value.front() == '"' && value.back() == '"') {
            value = value.substr(1, value.size() - 2);
        }

        config[key] = value;
    }

    return config;
}

// 使用
std::string configText = R"(
    host = "localhost"
    port = 8080
    debug = true
)";
auto config = parseConfig(configText);
// config["host"] = "localhost"
// config["port"] = "8080"
```

### 日志分析

```cpp
// 解析 Nginx 访问日志
void parseAccessLog(const std::string& log) {
    // 格式: 192.168.1.1 - - [14/Jun/2026:10:30:00 +0800] "GET /index.html HTTP/1.1" 200 1234
    std::regex logRegex(
        R"((\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) (\d+))"
    );

    std::smatch match;
    if (std::regex_search(log, match, logRegex)) {
        std::cout << "IP: " << match[1].str() << std::endl;
        std::cout << "时间: " << match[2].str() << std::endl;
        std::cout << "方法: " << match[3].str() << std::endl;
        std::cout << "路径: " << match[4].str() << std::endl;
        std::cout << "状态码: " << match[5].str() << std::endl;
        std::cout << "大小: " << match[6].str() << std::endl;
    }
}
```

## 注意事项

**性能问题**：`std::regex` 在某些编译器（特别是 GCC）上的性能较差。如果性能敏感，考虑使用 Boost.Regex 或 PCRE 库。

**原始字符串**：正则表达式中大量使用反斜杠，建议使用 C++11 的原始字符串 `R"(...)"` 来避免双重转义。`R"(\d+)"` 比 `"\\d+"` 更清晰。

**贪婪匹配**：默认情况下量词是贪婪的（匹配尽可能多的字符）。使用 `?` 使其变为懒惰的：`\d+?` 匹配尽可能少的数字。

**正则编译开销**：创建 `std::regex` 对象时会编译正则表达式，这是相对耗时的操作。如果同一个正则在循环中使用，应该在循环外创建 regex 对象。

**异常安全**：如果正则表达式语法有误，构造 `std::regex` 会抛出 `std::regex_error` 异常。在生产代码中应该捕获此异常。

## 进阶用法

### 自定义替换函数

```cpp
// 使用回调函数进行替换
template<typename Callback>
std::string regexReplaceCallback(const std::string& text,
    const std::regex& pattern, Callback callback)
{
    std::string result;
    auto begin = std::sregex_iterator(text.begin(), text.end(), pattern);
    auto end = std::sregex_iterator();

    size_t lastPos = 0;
    for (auto it = begin; it != end; ++it) {
        // 添加匹配前的文本
        result += text.substr(lastPos, it->position() - lastPos);
        // 调用回调函数获取替换文本
        result += callback(*it);
        lastPos = it->position() + it->length();
    }
    // 添加最后一个匹配后的文本
    result += text.substr(lastPos);

    return result;
}

// 使用：将所有数字乘以2
std::string text = "价格: 100元, 200元, 300元";
std::regex numRegex(R"(\d+)");
std::string result = regexReplaceCallback(text, numRegex,
    [](const std::smatch& m) -> std::string {
        int num = std::stoi(m.str());
        return std::to_string(num * 2);
    });
// result: "价格: 200元, 400元, 600元"
```

### 使用 Boost.Regex 提升性能

```cpp
#include <boost/regex.hpp>

// Boost.Regex 的 API 与 std::regex 几乎相同
// 但性能通常更好，特别是在 GCC 上

boost::regex pattern(R"(\d{4}-\d{2}-\d{2})");
boost::smatch match;
if (boost::regex_search(text, match, pattern)) {
    std::cout << match.str() << std::endl;
}

std::string result = boost::regex_replace(text, pattern, "DATE");
```
