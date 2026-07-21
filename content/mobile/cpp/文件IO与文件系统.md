# 文件IO与文件系统

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 文件流基础

**包含头文件写法**
`#include <fstream>`
```cpp
// 包含文件流头文件
#include <fstream>
```

---

## 文件打开与关闭

**输出流写法：打开输出文件流**
`std::ofstream <ofs>("<filename>");`
```cpp
#include <fstream>
// 打开输出文件流
std::ofstream ofs("output.txt");
```

---

**输入流写法：打开输入文件流**
`std::ifstream <ifs>("<filename>");`
```cpp
#include <fstream>
// 打开输入文件流
std::ifstream ifs("input.txt");
```

---

**打开模式写法：指定打开模式**
`std::ofstream <ofs>("<filename>", <mode>);`
```cpp
#include <fstream>
// 以追加模式打开文件
std::ofstream ofs("log.txt", std::ios::app);
```

---

**检查写法：检查文件是否打开成功**
`if (!<stream>) { ... }` 或 `if (<stream>.is_open()) { ... }`
```cpp
// 检查文件是否成功打开
std::ifstream ifs("data.txt");
if (!ifs) {
    std::cerr << "Failed to open file" << std::endl;
}
```

---

**关闭写法：关闭文件流**
`<stream>.close();`
```cpp
// 关闭文件流
ofs.close();
```

---

## 写入文件

**基本写法：使用 << 写入**
`<ofs> << <value>;`
```cpp
// 使用 << 写入数据
std::ofstream ofs("output.txt");
ofs << "Hello World" << std::endl;
ofs << 42 << std::endl;
```

---

**write 写法：二进制写入**
`<ofs>.write(<buffer>, <size>);`
```cpp
// 二进制写入
std::ofstream ofs("data.bin", std::ios::binary);
int data = 42;
ofs.write(reinterpret_cast<const char*>(&data), sizeof(data));
```

---

## 读取文件

**基本写法：使用 >> 读取**
`<ifs> >> <var>;`
```cpp
// 使用 >> 读取数据
std::ifstream ifs("input.txt");
int value;
ifs >> value;
```

---

**getline 写法：读取一行**
`std::getline(<ifs>, <line>);`
```cpp
#include <string>
// 读取一行
std::ifstream ifs("input.txt");
std::string line;
std::getline(ifs, line);
```

---

**read 写法：二进制读取**
`<ifs>.read(<buffer>, <size>);`
```cpp
// 二进制读取
std::ifstream ifs("data.bin", std::ios::binary);
int data;
ifs.read(reinterpret_cast<char*>(&data), sizeof(data));
```

---

## 遍历文件

**按行遍历写法：逐行读取文件**
`while (std::getline(<ifs>, <line>)) { ... }`
```cpp
#include <fstream>
#include <string>
// 逐行读取文件
std::ifstream ifs("input.txt");
std::string line;
while (std::getline(ifs, line)) {
    std::cout << line << std::endl;
}
```

---

**按字符遍历写法：逐字符读取**
`while (<ifs>.get(<ch>)) { ... }`
```cpp
// 逐字符读取文件
std::ifstream ifs("input.txt");
char ch;
while (ifs.get(ch)) {
    std::cout << ch;
}
```

---

## 文件定位

**seekg 写法：设置读取位置**
`<ifs>.seekg(<offset>, <origin>);`
```cpp
// 设置读取位置到文件开头
ifs.seekg(0, std::ios::beg);
```

---

**tellg 写法：获取读取位置**
`std::streampos <pos> = <ifs>.tellg();`
```cpp
// 获取当前读取位置
std::streampos pos = ifs.tellg();
```

---

**seekp 写法：设置写入位置**
`<ofs>.seekp(<offset>, <origin>);`
```cpp
// 设置写入位置到文件末尾
ofs.seekp(0, std::ios::end);
```

---

## 文件状态检查

**eof 写法：检查文件结束**
`<ifs>.eof()`
```cpp
// 检查是否到达文件末尾
if (ifs.eof()) {
    std::cout << "End of file" << std::endl;
}
```

---

**fail 写法：检查文件错误**
`<ifs>.fail()`
```cpp
// 检查文件操作是否失败
if (ifs.fail()) {
    std::cerr << "File operation failed" << std::endl;
}
```

---

**clear 写法：清除错误状态**
`<ifs>.clear();`
```cpp
// 清除文件错误状态
ifs.clear();
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

**stringstream 写法：双向字符串流**
`std::stringstream <ss>;`
```cpp
#include <sstream>
// 双向字符串流
std::stringstream ss;
ss << "Hello";
std::string result;
ss >> result;
```

---

## 文件系统（C++17）

**包含头文件写法**
`#include <filesystem>`
```cpp
// 包含文件系统头文件
#include <filesystem>
namespace fs = std::filesystem;
```

---

**创建目录写法**
`fs::create_directory(<path>);`
```cpp
#include <filesystem>
// 创建目录
fs::create_directory("mydir");
```

---

**创建多级目录写法**
`fs::create_directories(<path>);`
```cpp
#include <filesystem>
// 创建多级目录
fs::create_directories("a/b/c");
```

---

**删除文件写法**
`fs::remove(<path>);`
```cpp
#include <filesystem>
// 删除文件
fs::remove("file.txt");
```

---

**删除目录写法**
`fs::remove_all(<path>);`
```cpp
#include <filesystem>
// 递归删除目录
fs::remove_all("mydir");
```

---

**检查文件存在写法**
`fs::exists(<path>)`
```cpp
#include <filesystem>
// 检查文件是否存在
if (fs::exists("file.txt")) {
    std::cout << "File exists" << std::endl;
}
```

---

**复制文件写法**
`fs::copy(<src>, <dest>);`
```cpp
#include <filesystem>
// 复制文件
fs::copy("src.txt", "dest.txt");
```

---

**重命名文件写法**
`fs::rename(<old>, <new>);`
```cpp
#include <filesystem>
// 重命名文件
fs::rename("old.txt", "new.txt");
```

---

**获取文件大小写法**
`fs::file_size(<path>)`
```cpp
#include <filesystem>
// 获取文件大小
std::uintmax_t size = fs::file_size("file.txt");
```

---

## 目录遍历

**基本写法：遍历目录**
`for (const auto& <entry> : fs::directory_iterator(<path>)) { ... }`
```cpp
#include <filesystem>
// 遍历目录
for (const auto& entry : fs::directory_iterator(".")) {
    std::cout << entry.path() << std::endl;
}
```

---

**递归遍历写法：递归遍历目录**
`for (const auto& <entry> : fs::recursive_directory_iterator(<path>)) { ... }`
```cpp
#include <filesystem>
// 递归遍历目录
for (const auto& entry : fs::recursive_directory_iterator(".")) {
    std::cout << entry.path() << std::endl;
}
```

---

## 路径操作

**基本写法：创建路径对象**
`fs::path <p>("<path>");`
```cpp
#include <filesystem>
// 创建路径对象
fs::path p("dir/file.txt");
```

---

**拼接写法：路径拼接**
`<p> / "<subpath>"`
```cpp
#include <filesystem>
// 使用 / 运算符拼接路径
fs::path p = "dir";
p /= "subdir";
p /= "file.txt";
```

---

**获取文件名写法**
`<path>.filename()`
```cpp
#include <filesystem>
// 获取文件名
fs::path p("dir/file.txt");
std::cout << p.filename() << std::endl;
```

---

**获取扩展名写法**
`<path>.extension()`
```cpp
#include <filesystem>
// 获取文件扩展名
fs::path p("file.txt");
std::cout << p.extension() << std::endl;
```

---

**获取父路径写法**
`<path>.parent_path()`
```cpp
#include <filesystem>
// 获取父路径
fs::path p("dir/file.txt");
std::cout << p.parent_path() << std::endl;
```
