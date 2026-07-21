# 异常安全

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 异常抛出

**基本写法：抛出异常**
`throw <expression>;`
```cpp
// 抛出异常
throw std::runtime_error("Something went wrong");
```

---

**基本写法：抛出内置类型异常**
`throw <value>;`
```cpp
// 抛出整数异常
throw 404;
```

---

**自定义异常写法：抛出自定义异常**
`throw <CustomException>(<args>);`
```cpp
// 抛出自定义异常
class MyException : public std::exception {
public:
    const char* what() const noexcept override {
        return "Custom exception";
    }
};
throw MyException();
```

---

## 异常捕获

**基本写法：try-catch**
`try { ... } catch (<type> <e>) { ... }`
```cpp
// 异常处理
try {
    throw std::runtime_error("Error");
} catch (const std::exception& e) {
    std::cerr << e.what() << std::endl;
}
```

---

**多 catch 写法：捕获多种异常**
`try { ... } catch (<type1> <e>) { ... } catch (<type2> <e>) { ... }`
```cpp
// 捕获多种异常
try {
    // 可能抛出不同异常的代码
} catch (const std::runtime_error& e) {
    std::cerr << e.what() << std::endl;
} catch (const std::logic_error& e) {
    std::cerr << e.what() << std::endl;
}
```

---

**捕获所有写法：捕获所有异常**
`catch (...) { ... }`
```cpp
// 捕获所有类型的异常
try {
    // 可能抛出异常的代码
} catch (...) {
    std::cerr << "Unknown exception" << std::endl;
}
```

---

**重新抛出写法：重新抛出异常**
`throw;`
```cpp
// 重新抛出当前异常
try {
    // 可能抛出异常的代码
} catch (const std::exception& e) {
    std::cerr << "Logging: " << e.what() << std::endl;
    throw;
}
```

---

## 标准异常类

**基本写法：使用 std::exception**
`throw std::runtime_error("<message>");`
```cpp
#include <stdexcept>
// 抛出运行时错误
throw std::runtime_error("Runtime error");
```

---

**逻辑异常写法：使用逻辑异常**
`throw std::invalid_argument("<message>");`
```cpp
#include <stdexcept>
// 抛出无效参数异常
throw std::invalid_argument("Invalid argument");
```

---

**越界异常写法：使用 out_of_range**
`throw std::out_of_range("<message>");`
```cpp
#include <stdexcept>
// 抛出越界异常
throw std::out_of_range("Index out of range");
```

---

## 自定义异常类

**基本写法：继承 std::exception**
`class <CustomException> : public std::exception { ... };`
```cpp
#include <exception>
// 自定义异常类
class FileError : public std::exception {
public:
    const char* what() const noexcept override {
        return "File error occurred";
    }
};
```

---

**带消息写法：自定义异常携带消息**
`class <CustomException> : public std::exception { ... };`
```cpp
#include <exception>
#include <string>
// 带消息的自定义异常
class MyException : public std::exception {
    std::string msg;
public:
    MyException(const std::string& m) : msg(m) {}
    const char* what() const noexcept override {
        return msg.c_str();
    }
};
```

---

## noexcept 说明符

**基本写法：声明不抛出异常**
`<return_type> <func>() noexcept { ... }`
```cpp
// 声明函数不会抛出异常
void safe_function() noexcept {
    // 不抛出异常的代码
}
```

---

**条件写法：条件 noexcept**
`<return_type> <func>() noexcept(<condition>) { ... }`
```cpp
// 条件 noexcept
template<typename T>
void process(T value) noexcept(noexcept(T())) {
    // 根据 T() 是否抛出异常决定
}
```

---

**检查写法：检查是否 noexcept**
`noexcept(<func>)`
```cpp
// 检查函数是否 noexcept
bool is_safe = noexcept(safe_function());
```

---

## RAII 资源管理

**基本写法：RAII 类**
`class <RAII> { <resource>* <ptr>; public: ... };`
```cpp
// RAII 管理资源
class FileGuard {
    FILE* fp;
public:
    FileGuard(const char* filename) : fp(fopen(filename, "r")) {}
    ~FileGuard() { if (fp) fclose(fp); }
};
```

---

**智能指针写法：使用智能指针管理资源**
`std::unique_ptr<<Type>> <ptr>(new <Type>);`
```cpp
#include <memory>
// 使用智能指针自动管理内存
std::unique_ptr<int> p(new int(10));
```

---

## 异常安全等级

**基本保证写法：基本异常安全**
`try { ... } catch (...) { /* 恢复到有效状态 */ }`
```cpp
// 基本保证：异常发生后对象处于有效状态
class Container {
    std::vector<int> data;
public:
    void add(int value) {
        try {
            data.push_back(value);
        } catch (...) {
            // data 仍处于有效状态
        }
    }
};
```

---

**强保证写法：强异常安全（事务语义）**
`void <func>() { <Type> <temp> = ...; <swap>(<temp>, <original>); }`
```cpp
// 强保证：操作成功或完全不影响对象
class Container {
    std::vector<int> data;
public:
    void add_all(const std::vector<int>& values) {
        std::vector<int> temp = data;
        for (int v : values) {
            temp.push_back(v);
        }
        std::swap(data, temp);
    }
};
```

---

## 异常与构造函数

**基本写法：构造函数中抛出异常**
`<ClassName>(<params>) { ... throw ...; }`
```cpp
// 构造函数中抛出异常
class FileHandler {
    FILE* fp;
public:
    FileHandler(const char* filename) {
        fp = fopen(filename, "r");
        if (!fp) {
            throw std::runtime_error("Cannot open file");
        }
    }
};
```

---

## 异常与析构函数

**基本写法：析构函数中不抛出异常**
`~<ClassName>() noexcept { ... }`
```cpp
// 析构函数应标记为 noexcept
class MyClass {
public:
    ~MyClass() noexcept {
        // 清理资源，不抛出异常
    }
};
```

---

## 异常传播

**嵌套写法：异常在调用栈中传播**
`void <inner>() { throw ...; } void <outer>() { <inner>(); }`
```cpp
// 异常会沿调用栈向上传播
void inner() {
    throw std::runtime_error("Error");
}

void outer() {
    inner();
}
```

---

## function-try-block

**基本写法：函数 try 块**
`<return_type> <func>(<params>) try { ... } catch (<type> <e>) { ... }`
```cpp
// 函数级 try 块
int divide(int a, int b) try {
    if (b == 0) throw std::runtime_error("Divide by zero");
    return a / b;
} catch (const std::exception& e) {
    std::cerr << e.what() << std::endl;
    return 0;
}
```
