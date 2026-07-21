---
order: 63
title: 文件IO与文件系统
module: cpp
category: C++
difficulty: intermediate
description: '文件操作与std::filesystem'
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/STL算法详解
  - cpp/字符串处理
  - cpp/异常安全
  - cpp/多线程与并发
prerequisites:
  - cpp/概述与现代标准
---

## 概述

C++ 标准库提供了两套文件操作接口：传统的文件流（`std::ifstream`/`std::ofstream`）用于文本和二进制文件的读写，C++17 引入的 `std::filesystem` 用于路径操作和文件系统查询。文件流基于流的抽象，支持格式化读写和随机访问；filesystem 提供了跨平台的文件系统操作能力，包括路径拼接、目录遍历和文件属性查询。

## 基础概念

### 文件流类型

| 类型            | 说明                 |
| --------------- | -------------------- |
| `std::ifstream` | 输入文件流，只读     |
| `std::ofstream` | 输出文件流，只写     |
| `std::fstream`  | 输入输出文件流，读写 |

### 打开模式

| 模式               | 说明             |
| ------------------ | ---------------- |
| `std::ios::in`     | 读模式打开       |
| `std::ios::out`    | 写模式打开       |
| `std::ios::app`    | 追加模式         |
| `std::ios::binary` | 二进制模式       |
| `std::ios::trunc`  | 截断文件（默认） |
| `std::ios::ate`    | 打开后定位到末尾 |

## 快速上手

### 文本文件读写

```cpp
#include <fstream>
#include <string>
#include <iostream>

int main() {
    // 写入文件
    std::ofstream out("output.txt");
    out << "第一行" << std::endl;
    out << "第二行" << std::endl;
    out.close();  // 可以显式关闭，析构时也会自动关闭

    // 读取文件
    std::ifstream in("output.txt");
    std::string line;
    while (std::getline(in, line)) {
        std::cout << line << std::endl;
    }
    return 0;
}
```

### std::filesystem 基础（C++17）

```cpp
#include <filesystem>
#include <iostream>

namespace fs = std::filesystem;

int main() {
    fs::path p = "/usr/local/bin";

    // 路径操作
    p / "app";                          // 路径拼接: /usr/local/bin/app
    p.filename();                        // "bin"
    p.parent_path();                     // "/usr/local"
    p.extension();                       // ""（无扩展名）

    // 文件系统查询
    fs::exists(p);                       // 是否存在
    fs::is_directory(p);                 // 是否目录
    fs::is_regular_file(p);             // 是否普通文件
    fs::file_size(p);                    // 文件大小

    // 目录操作
    fs::create_directories("a/b/c");    // 递归创建目录
    fs::copy("src", "dst", fs::copy_options::recursive);  // 递归复制
    fs::remove("temp.txt");             // 删除文件
    fs::rename("old.txt", "new.txt");   // 重命名
    return 0;
}
```

## 详细用法

### 二进制文件读写

```cpp
#include <fstream>
#include <vector>

struct Record {
    int id;
    double value;
    char name[32];
};

void writeRecords(const std::string& filename, const std::vector<Record>& records) {
    std::ofstream out(filename, std::ios::binary);
    for (const auto& r : records) {
        out.write(reinterpret_cast<const char*>(&r), sizeof(Record));
    }
}

std::vector<Record> readRecords(const std::string& filename) {
    std::ifstream in(filename, std::ios::binary);
    std::vector<Record> records;
    Record r;
    while (in.read(reinterpret_cast<char*>(&r), sizeof(Record))) {
        records.push_back(r);
    }
    return records;
}
```

### 随机访问文件

```cpp
#include <fstream>
#include <string>

class IndexedFile {
    std::fstream file_;
public:
    explicit IndexedFile(const std::string& path) {
        file_.open(path, std::ios::in | std::ios::out | std::ios::binary);
        if (!file_) {
            // 文件不存在则创建
            file_.open(path, std::ios::out | std::ios::binary);
            file_.close();
            file_.open(path, std::ios::in | std::ios::out | std::ios::binary);
        }
    }

    // 在指定位置写入数据
    void writeAt(size_t offset, const std::string& data) {
        file_.seekp(offset);  // 定位写位置
        auto size = static_cast<uint32_t>(data.size());
        file_.write(reinterpret_cast<const char*>(&size), sizeof(size));
        file_.write(data.data(), size);
    }

    // 从指定位置读取数据
    std::string readAt(size_t offset) {
        file_.seekg(offset);  // 定位读位置
        uint32_t size;
        file_.read(reinterpret_cast<char*>(&size), sizeof(size));
        std::string result(size, '\0');
        file_.read(&result[0], size);
        return result;
    }
};
```

### 目录遍历

```cpp
#include <filesystem>
#include <iostream>
#include <vector>

namespace fs = std::filesystem;

// 遍历目录中的所有文件
void listFiles(const std::string& dir) {
    for (const auto& entry : fs::directory_iterator(dir)) {
        if (entry.is_regular_file()) {
            std::cout << "文件: " << entry.path() << std::endl;
        } else if (entry.is_directory()) {
            std::cout << "目录: " << entry.path() << std::endl;
        }
    }
}

// 递归遍历（包含子目录）
void listAllFiles(const std::string& dir) {
    for (const auto& entry : fs::recursive_directory_iterator(dir)) {
        if (entry.is_regular_file()) {
            std::cout << entry.path() << " (" << entry.file_size() << " bytes)" << std::endl;
        }
    }
}

// 查找特定扩展名的文件
std::vector<fs::path> findByExtension(const fs::path& dir, const std::string& ext) {
    std::vector<fs::path> result;
    for (const auto& entry : fs::recursive_directory_iterator(dir)) {
        if (entry.is_regular_file() && entry.path().extension() == ext) {
            result.push_back(entry.path());
        }
    }
    return result;
}
```

### 路径操作详解

```cpp
#include <filesystem>
#include <iostream>

namespace fs = std::filesystem;

void pathOperations() {
    fs::path p = "/home/user/docs/report.txt";

    // 路径分解
    p.root_name();      // ""（POSIX）或 "C:"（Windows）
    p.root_directory(); // "/"
    p.parent_path();    // "/home/user/docs"
    p.filename();       // "report.txt"
    p.stem();           // "report"（不含扩展名）
    p.extension();      // ".txt"

    // 路径拼接
    fs::path base = "/home/user";
    fs::path full = base / "docs" / "report.txt";  // /home/user/docs/report.txt

    // 路径转换
    p.string();         // 转为 std::string
    p.u8string();       // 转为 UTF-8 字符串

    // 相对路径
    fs::path a = "/home/user/docs";
    fs::path b = "/home/user/images/photo.jpg";
    auto rel = fs::relative(b, a);  // "../images/photo.jpg"
}
```

## 常见场景

### 文件监控

```cpp
#include <filesystem>
#include <chrono>
#include <unordered_map>

namespace fs = std::filesystem;

class FileWatcher {
    std::unordered_map<std::string, fs::file_time_type> lastModified_;
    fs::path watchDir_;

public:
    explicit FileWatcher(fs::path dir) : watchDir_(std::move(dir)) {
        // 记录初始状态
        for (const auto& entry : fs::recursive_directory_iterator(watchDir_)) {
            if (entry.is_regular_file()) {
                lastModified_[entry.path().string()] = entry.last_write_time();
            }
        }
    }

    // 检查是否有文件被修改
    std::vector<std::string> checkChanges() {
        std::vector<std::string> changed;
        for (const auto& entry : fs::recursive_directory_iterator(watchDir_)) {
            if (entry.is_regular_file()) {
                auto path = entry.path().string();
                auto mtime = entry.last_write_time();
                if (lastModified_.count(path) && lastModified_[path] != mtime) {
                    changed.push_back(path);
                }
                lastModified_[path] = mtime;
            }
        }
        return changed;
    }
};
```

### 配置文件管理

```cpp
#include <filesystem>
#include <fstream>
#include <string>

namespace fs = std::filesystem;

class ConfigManager {
    fs::path configDir_;
public:
    explicit ConfigManager(const std::string& appName) {
        // 获取平台特定的配置目录
#ifdef _WIN32
        configDir_ = fs::path(getenv("APPDATA")) / appName;
#else
        configDir_ = fs::path(getenv("HOME")) / ".config" / appName;
#endif
        fs::create_directories(configDir_);
    }

    std::string readConfig(const std::string& name) {
        auto path = configDir_ / name;
        if (!fs::exists(path)) return "";
        std::ifstream in(path);
        std::string content((std::istreambuf_iterator<char>(in)),
                            std::istreambuf_iterator<char>());
        return content;
    }

    void writeConfig(const std::string& name, const std::string& content) {
        auto path = configDir_ / name;
        std::ofstream out(path);
        out << content;
    }
};
```

## 注意事项

- 文件流在析构时自动关闭文件，但显式关闭可以在文件被复用前释放资源
- `std::filesystem` 操作可能抛出 `std::filesystem::filesystem_error` 异常
- 路径中的中文和空格需要正确处理，`fs::path` 内部使用宽字符存储
- 二进制模式下 `std::endl` 不会进行换行转换，文本模式下 Windows 会将 `\n` 转为 `\r\n`
- 目录遍历操作不是原子性的，遍历过程中文件可能被创建或删除
- `fs::file_size` 对目录返回的结果未定义，应先检查 `is_regular_file`

## 进阶用法

### 内存映射文件

```cpp
#include <fstream>
#include <iostream>

// 简化的内存映射文件读取（使用标准库）
std::string readFileToString(const fs::path& path) {
    // 打开文件并定位到末尾获取大小
    std::ifstream in(path, std::ios::binary | std::ios::ate);
    if (!in) throw std::runtime_error("无法打开文件");

    auto size = in.tellg();
    in.seekg(0);

    std::string content;
    content.resize(size);
    in.read(&content[0], size);
    return content;
}

// 高性能行读取
std::vector<std::string> readLines(const fs::path& path) {
    std::ifstream in(path);
    std::vector<std::string> lines;
    std::string line;
    while (std::getline(in, line)) {
        lines.push_back(std::move(line));
    }
    return lines;
}
```

### 文件系统权限（C++20）

```cpp
#include <filesystem>

namespace fs = std::filesystem;

// C++20: 更精细的权限控制
void setPermissions(const fs::path& file) {
    // 设置读写权限
    fs::perms p = fs::perms::owner_read | fs::perms::owner_write;
    fs::permissions(file, p, fs::perm_options::replace);

    // 添加执行权限
    fs::permissions(file, fs::perms::owner_exec, fs::perm_options::add);
}
```
