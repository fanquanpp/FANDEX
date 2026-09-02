---
order: 370
title: C++序列化
module: 'cpp'
category: 计算机科学
difficulty: intermediate
description: JSON与二进制序列化
author: fanquanpp
updated: '2026-08-01'
related:
  - 'cpp/026-CppNetworkProgramming'
  - 'cpp/031-CppRegex'
  - 'cpp/032-CppPythonInteraction'
  - 'cpp/035-Cpp23Cpp26NewFeatures'
prerequisites: []
---

## 前置知识

- [C++性能优化](/cpp/036-CppPerformance)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

序列化是将内存中的数据结构转换为可存储或传输的格式（如字符串或字节流）的过程，反序列化则是其逆过程。C++ 标准库目前没有内置的序列化支持，但社区提供了多种优秀的第三方库，如 nlohmann/json（JSON 序列化）、protobuf（二进制序列化）、cereal（轻量级序列化）等。

为什么需要序列化？当你需要将数据保存到文件、通过网络发送、或者在不同程序之间交换数据时，就需要序列化。JSON 是最通用的格式，人类可读且跨语言支持好；二进制格式（如 protobuf）更紧凑高效，适合对性能和带宽敏感的场景。

## 基础概念

**JSON 序列化**：将数据转换为 JSON 格式的字符串。JSON 是键值对格式，支持数字、字符串、布尔值、数组和对象。人类可读，调试方便。

**二进制序列化**：将数据转换为紧凑的二进制字节流。不可读但体积小、速度快。适合网络传输和持久化存储。

**Schema**：数据结构的定义文件。protobuf 使用 .proto 文件定义数据结构，然后自动生成 C++ 代码。有了 Schema，不同语言之间可以安全地交换数据。

**向前/向后兼容**：当数据结构发生变化时（如新增字段），旧代码能否读取新数据（向前兼容），新代码能否读取旧数据（向后兼容）。protobuf 天然支持，JSON 需要手动处理。

## 快速上手

### 使用 nlohmann/json

```bash
# 安装（vcpkg）
vcpkg install nlohmann-json

# 或者单头文件
# 从 https://github.com/nlohmann/json 下载 json.hpp
```

```cpp
#include <nlohmann/json.hpp>
#include <iostream>
#include <string>

using json = nlohmann::json;

int main() {
    // 创建 JSON 对象
    json person = {
        {"name", "张三"},
        {"age", 25},
        {"isStudent", false},
        {"scores", {95, 87, 92}},
        {"address", {
            {"city", "北京"},
            {"district", "海淀"}
        }}
    };

    // 序列化为字符串
    std::string jsonStr = person.dump(4);  // 4 空格缩进
    std::cout << jsonStr << std::endl;

    // 反序列化
    json parsed = json::parse(jsonStr);

    // 访问字段
    std::string name = parsed["name"];
    int age = parsed["age"];
    bool isStudent = parsed["isStudent"];

    std::cout << "姓名: " << name << ", 年龄: " << age << std::endl;

    // 访问嵌套字段
    std::string city = parsed["address"]["city"];
    std::cout << "城市: " << city << std::endl;

    // 访问数组
    for (int score : parsed["scores"]) {
        std::cout << "成绩: " << score << std::endl;
    }

    return 0;
}
```

## 详细用法

### 自定义类型序列化

```cpp
#include <nlohmann/json.hpp>
#include <string>
#include <vector>

using json = nlohmann::json;

// 定义数据结构
struct Address {
    std::string city;
    std::string district;
    std::string street;
};

struct Person {
    std::string name;
    int age;
    Address address;
    std::vector<std::string> hobbies;
};

// 为自定义类型提供 to_json 和 from_json 函数
void to_json(json& j, const Address& addr) {
    j = json{
        {"city", addr.city},
        {"district", addr.district},
        {"street", addr.street}
    };
}

void from_json(const json& j, Address& addr) {
    j.at("city").get_to(addr.city);
    j.at("district").get_to(addr.district);
    j.at("street").get_to(addr.street);
}

void to_json(json& j, const Person& p) {
    j = json{
        {"name", p.name},
        {"age", p.age},
        {"address", p.address},  // 自动调用 Address 的 to_json
        {"hobbies", p.hobbies}
    };
}

void from_json(const json& j, Person& p) {
    j.at("name").get_to(p.name);
    j.at("age").get_to(p.age);
    j.at("address").get_to(p.address);  // 自动调用 Address 的 from_json
    j.at("hobbies").get_to(p.hobbies);
}

// 使用
void customTypeDemo() {
    Person person{
        .name = "张三",
        .age = 25,
        .address = {"北京", "海淀", "中关村大街"},
        .hobbies = {"编程", "阅读", "游泳"}
    };

    // 序列化
    json j = person;
    std::string jsonStr = j.dump(4);

    // 反序列化
    Person parsed = json::parse(jsonStr).get<Person>();
}
```

### 安全地访问 JSON 字段

```cpp
void safeAccessDemo() {
    json data = json::parse(R"({
        "name": "张三",
        "age": 25,
        "scores": [95, 87, 92]
    })");

    // 方式一：直接访问（如果字段不存在会抛异常）
    try {
        std::string name = data.at("name");
    } catch (const json::out_of_range& e) {
        std::cerr << "字段不存在: " << e.what() << std::endl;
    }

    // 方式二：使用 value 方法，提供默认值
    std::string name = data.value("name", "未知");
    std::string email = data.value("email", "无邮箱");  // 字段不存在时返回默认值
    int age = data.value("age", 0);

    // 方式三：检查字段是否存在
    if (data.contains("scores")) {
        for (int score : data["scores"]) {
            std::cout << score << " ";
        }
    }

    // 方式四：检查字段类型
    if (data["age"].is_number_integer()) {
        int age = data["age"];
    }

    // 方式五：使用 count 检查
    if (data.count("name") > 0) {
        std::cout << "name 字段存在" << std::endl;
    }
}
```

### 从文件读写 JSON

```cpp
#include <fstream>

// 从文件读取 JSON
json readJsonFile(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) {
        throw std::runtime_error("无法打开文件: " + path);
    }

    try {
        return json::parse(file);
    } catch (const json::parse_error& e) {
        throw std::runtime_error("JSON 解析错误: " + std::string(e.what()));
    }
}

// 写入 JSON 到文件
void writeJsonFile(const std::string& path, const json& data) {
    std::ofstream file(path);
    if (!file.is_open()) {
        throw std::runtime_error("无法创建文件: " + path);
    }
    file << data.dump(4);  // 4 空格缩进，方便阅读
}

// 使用
void fileDemo() {
    // 写入
    json config = {
        {"database", {
            {"host", "localhost"},
            {"port", 5432},
            {"name", "mydb"}
        }},
        {"server", {
            {"port", 8080},
            {"debug", true}
        }}
    };
    writeJsonFile("config.json", config);

    // 读取
    json loaded = readJsonFile("config.json");
    std::string dbHost = loaded["database"]["host"];
    int dbPort = loaded["database"]["port"];
}
```

### 使用 protobuf 二进制序列化

```bash
# 安装 protobuf
# Ubuntu: sudo apt install protobuf-compiler libprotobuf-dev
# Windows: vcpkg install protobuf
```

定义数据结构（.proto 文件）：

```protobuf
// person.proto
syntax = "proto3";

message Address {
    string city = 1;
    string district = 2;
    string street = 3;
}

message Person {
    string name = 1;
    int32 age = 2;
    Address address = 3;
    repeated string hobbies = 4;  // 列表
}
```

生成 C++ 代码：

```bash
protoc --cpp_out=. person.proto
# 生成 person.pb.h 和 person.pb.cc
```

使用生成的代码：

```cpp
#include "person.pb.h"
#include <fstream>
#include <iostream>

void protobufDemo() {
    // 验证库版本
    GOOGLE_PROTOBUF_VERIFY_VERSION;

    // 创建 Person 对象
    Person person;
    person.set_name("张三");
    person.set_age(25);

    // 设置嵌套消息
    Address* address = person.mutable_address();
    address->set_city("北京");
    address->set_district("海淀");
    address->set_street("中关村大街");

    // 添加重复字段
    person.add_hobbies("编程");
    person.add_hobbies("阅读");
    person.add_hobbies("游泳");

    // 序列化为字符串
    std::string serialized;
    person.SerializeToString(&serialized);
    std::cout << "序列化大小: " << serialized.size() << " 字节" << std::endl;

    // 反序列化
    Person parsed;
    parsed.ParseFromString(serialized);
    std::cout << "姓名: " << parsed.name() << std::endl;
    std::cout << "年龄: " << parsed.age() << std::endl;
    std::cout << "城市: " << parsed.address().city() << std::endl;

    // 序列化到文件
    std::ofstream output("person.bin", std::ios::binary);
    person.SerializeToOstream(&output);
    output.close();

    // 从文件反序列化
    Person fromFile;
    std::ifstream input("person.bin", std::ios::binary);
    fromFile.ParseFromIstream(&input);
    input.close();

    // 释放 protobuf 库资源
    google::protobuf::ShutdownProtobufLibrary();
}
```

### 使用 cereal 轻量级序列化

```cpp
#include <cereal/cereal.hpp>
#include <cereal/archives/json.hpp>
#include <cereal/archives/binary.hpp>
#include <cereal/types/string.hpp>
#include <cereal/types/vector.hpp>
#include <sstream>
#include <iostream>

struct Student {
    std::string name;
    int age;
    std::vector<double> scores;

    // cereal 序列化函数
    template<typename Archive>
    void serialize(Archive& archive) {
        archive(
            CEREAL_NVP(name),     // NVP 表示 Name-Value Pair
            CEREAL_NVP(age),
            CEREAL_NVP(scores)
        );
    }
};

void cerealDemo() {
    Student student{"李四", 20, {88.5, 92.0, 95.5}};

    // JSON 序列化
    std::ostringstream jsonOs;
    {
        cereal::JSONOutputArchive archive(jsonOs);
        archive(CEREAL_NVP(student));
    }
    std::cout << "JSON: " << jsonOs.str() << std::endl;

    // JSON 反序列化
    Student loaded;
    std::istringstream jsonIs(jsonOs.str());
    {
        cereal::JSONInputArchive archive(jsonIs);
        archive(CEREAL_NVP(loaded));
    }

    // 二进制序列化（更紧凑）
    std::ostringstream binOs;
    {
        cereal::BinaryOutputArchive archive(binOs);
        archive(student);
    }
    std::cout << "二进制大小: " << binOs.str().size() << " 字节" << std::endl;
}
```

## 常见场景

### 配置文件管理

```cpp
#include <nlohmann/json.hpp>
#include <fstream>
#include <iostream>

using json = nlohmann::json;

class Config {
public:
    struct Database {
        std::string host;
        int port;
        std::string name;
        std::string user;
        std::string password;
    };

    struct Server {
        int port;
        bool debug;
        int maxConnections;
    };

    Database database;
    Server server;

    // 从文件加载配置
    static Config load(const std::string& path) {
        Config config;
        std::ifstream file(path);
        if (!file.is_open()) {
            // 配置文件不存在，使用默认值
            config = defaultConfig();
            config.save(path);
            return config;
        }

        json data = json::parse(file);

        // 安全地读取配置，提供默认值
        config.database.host = data.value("/database/host"_json_pointer, "localhost");
        config.database.port = data.value("/database/port"_json_pointer, 5432);
        config.database.name = data.value("/database/name"_json_pointer, "mydb");
        config.database.user = data.value("/database/user"_json_pointer, "postgres");
        config.database.password = data.value("/database/password"_json_pointer, "");

        config.server.port = data.value("/server/port"_json_pointer, 8080);
        config.server.debug = data.value("/server/debug"_json_pointer, false);
        config.server.maxConnections = data.value("/server/maxConnections"_json_pointer, 100);

        return config;
    }

    // 保存配置到文件
    void save(const std::string& path) const {
        json data = {
            {"database", {
                {"host", database.host},
                {"port", database.port},
                {"name", database.name},
                {"user", database.user},
                {"password", database.password}
            }},
            {"server", {
                {"port", server.port},
                {"debug", server.debug},
                {"maxConnections", server.maxConnections}
            }}
        };

        std::ofstream file(path);
        file << data.dump(4);
    }

private:
    static Config defaultConfig() {
        return Config{
            .database = {"localhost", 5432, "mydb", "postgres", ""},
            .server = {8080, false, 100}
        };
    }
};
```

## 注意事项

**JSON 的性能**：JSON 解析和序列化比二进制格式慢很多。如果性能是首要考虑，使用 protobuf 或 cereal 的二进制格式。

**数值精度**：JSON 中的数字可能丢失精度。大整数和浮点数在 JSON 中可能无法精确表示。对于精确数值，使用字符串存储。

**安全问题**：不要信任来自外部的 JSON 数据。验证所有字段的类型和范围，避免 JSON 注入攻击。

**protobuf 的代码生成**：protobuf 需要额外的代码生成步骤，增加了构建复杂度。但生成的代码类型安全，性能优秀。

**版本兼容**：当数据结构变化时，JSON 需要手动处理缺失字段（使用默认值），protobuf 通过字段编号自动处理。

## 进阶用法

### JSON Schema 验证

```cpp
#include <nlohmann/json.hpp>
#include <nlohmann/json-schema.hpp>

using json = nlohmann::json;

// 定义 JSON Schema 来验证数据格式
void validateJsonSchema() {
    // 定义 Schema
    json schema = R"({
        "type": "object",
        "required": ["name", "age"],
        "properties": {
            "name": {"type": "string", "minLength": 1},
            "age": {"type": "integer", "minimum": 0, "maximum": 150},
            "email": {"type": "string", "format": "email"}
        }
    })"_json;

    // 验证数据
    json validData = {{"name", "张三"}, {"age", 25}};
    // 使用 json-schema-validator 库验证
    // 如果数据不符合 Schema，会抛出异常
}
```

### 自定义序列化格式

```cpp
// 为枚举类型提供自定义序列化
enum class Status {
    Active,
    Inactive,
    Pending
};

void to_json(json& j, Status s) {
    switch (s) {
        case Status::Active:   j = "active"; break;
        case Status::Inactive: j = "inactive"; break;
        case Status::Pending:  j = "pending"; break;
    }
}

void from_json(const json& j, Status& s) {
    std::string str = j;
    if (str == "active") s = Status::Active;
    else if (str == "inactive") s = Status::Inactive;
    else if (str == "pending") s = Status::Pending;
    else throw std::runtime_error("未知状态: " + str);
}
```
## JSON 序列化

**基本写法：nlohmann/json**
`#include <nlohmann/json.hpp>`
```cpp
#include <nlohmann/json.hpp>
using json = nlohmann::json;
// 构造 JSON
json j;
j["name"] = "Alice";
j["age"] = 30;
j["scores"] = {90, 85, 92};
std::string s = j.dump();        // 序列化为字符串
std::string p = j.dump(4);       // 格式化缩进 4 空格
```

---

**基本写法：解析 JSON**
`json::parse(<字符串>)`
```cpp
// 从字符串解析
json j = json::parse(R"({"name":"Bob","age":25})");
std::string name = j["name"];
int age = j["age"];
// 从文件解析
std::ifstream f("data.json");
json jf = json::parse(f);
```

---

**基本写法：结构体与 JSON 互转**
`NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE`
```cpp
struct Person {
    std::string name;
    int age;
};
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(Person, name, age)
// 自动生成 to_json / from_json
Person p{"Alice", 30};
json j = p;                   // 结构体转 JSON
Person p2 = j.get<Person>();  // JSON 转结构体
```

---

## 二进制序列化

**基本写法：手写二进制**
`<流>.write(<指针>, <大小>)`
```cpp
#include <fstream>
// 写入二进制
struct Header {
    uint32_t magic;
    uint32_t version;
    uint64_t size;
};
std::ofstream out("data.bin", std::ios::binary);
Header h{0x4D4946, 1, 1024};
out.write(reinterpret_cast<const char*>(&h), sizeof(h));
// 读取
std::ifstream in("data.bin", std::ios::binary);
Header h2;
in.read(reinterpret_cast<char*>(&h2), sizeof(h2));
```

---

**基本写法：字节序处理**
`std::endian` `htobe32` 等
```cpp
#include <bit>
#include <endian.h>
// C++20 检查字节序
if constexpr (std::endian::native == std::endian::little) {
    // 小端
}
// 转网络字节序（大端）
uint32_t net = htobe32(local_value);
uint32_t local = be32toh(net);
```

---

## Protobuf

**基本写法：定义消息**
`message <名> { <字段>; }`
```protobuf
// person.proto
syntax = "proto3";
message Person {
    string name = 1;
    int32 age = 2;
    repeated string emails = 3;
}
```

---

**基本写法：使用 Protobuf**
`<消息>.SerializeToString(<串>)`
```cpp
#include "person.pb.h"
// 序列化
Person p;
p.set_name("Alice");
p.set_age(30);
p.add_emails("alice@example.com");
std::string output;
p.SerializeToString(&output);
// 反序列化
Person p2;
p2.ParseFromString(output);
std::cout << p2.name();
```

---

## Cereal 库

**基本写法：cereal 序列化**
`cereal::JSONOutputArchive`
```cpp
#include <cereal/cereal.hpp>
#include <cereal/archives/json.hpp>
#include <fstream>
struct Data {
    int x;
    std::string y;
    template <typename Archive>
    void serialize(Archive& ar) {
        ar(x, y);
    }
};
// 序列化
std::ofstream os("data.json");
cereal::JSONOutputArchive ar(os);
Data d{42, "hello"};
ar(d);
```

---

## 流式序列化

**基本写法：operator<<**
`std::ostream& operator<<(std::ostream&, <类型>)`
```cpp
// 自定义输出
struct Point { int x, y; };
std::ostream& operator<<(std::ostream& os, const Point& p) {
    return os << "(" << p.x << "," << p.y << ")";
}
Point p{3, 4};
std::cout << p; // (3,4)
std::stringstream ss;
ss << p; // 序列化到字符串
```

---

**基本写法：operator>>**
`std::istream& operator>>(std::istream&, <类型>&)`
```cpp
// 自定义输入
std::istream& operator>>(std::istream& is, Point& p) {
    char c;
    return is >> c >> p.x >> c >> p.y >> c; // (3,4)
}
std::stringstream ss("(3,4)");
Point p;
ss >> p; // 反序列化
```

---

## 网络字节序

**基本写法：htonl/ntohl**
`htonl(<32位>)` `ntohl(<32位>)`
```cpp
#include <arpa/inet.h>
// 主机字节序转网络字节序
uint32_t host = 0x12345678;
uint32_t net = htonl(host);
uint32_t back = ntohl(net);
// 16 位
uint16_t net16 = htons(8080);
uint16_t host16 = ntohs(net16);
```

---

## 版本兼容

**基本写法：版本号字段**
`struct <数据> { uint32_t version; ... };`
```cpp
// 序列化时记录版本
struct Data {
    uint32_t version = 1;
    int x;
    std::string y;
    // 版本 2 新增字段
    // double z = 0; // 旧版本无此字段
};
// 读取时根据版本决定如何解析
```
