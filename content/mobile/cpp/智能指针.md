# 智能指针

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## unique_ptr

**基本写法：创建 unique_ptr**
`std::unique_ptr<<type>> <ptr> = std::make_unique<<type>>(<args>);`
```cpp
#include <memory>
// 创建独占所有权的智能指针
std::unique_ptr<int> p = std::make_unique<int>(10);
```

---

**数组写法：创建 unique_ptr 数组**
`std::unique_ptr<<type>[]> <ptr> = std::make_unique<<type>[]>(<size>);`
```cpp
#include <memory>
// 创建独占所有权的数组
std::unique_ptr<int[]> arr = std::make_unique<int[]>(10);
```

---

**访问写法：访问 unique_ptr**
`*<ptr>` 或 `<ptr>-><member>`
```cpp
// 解引用访问值
std::unique_ptr<int> p = std::make_unique<int>(10);
std::cout << *p << std::endl;
```

---

**移动写法：转移所有权**
`std::unique_ptr<<type>> <new_ptr> = std::move(<old_ptr>);`
```cpp
#include <memory>
// 转移 unique_ptr 所有权
std::unique_ptr<int> p1 = std::make_unique<int>(10);
std::unique_ptr<int> p2 = std::move(p1);
```

---

**释放写法：释放所有权**
`<type>* <raw_ptr> = <ptr>.release();`
```cpp
// 释放所有权，返回原始指针
std::unique_ptr<int> p = std::make_unique<int>(10);
int* raw = p.release();
delete raw;
```

---

**重置写法：重置 unique_ptr**
`<ptr>.reset(<new_ptr>);`
```cpp
// 重置为新的指针
std::unique_ptr<int> p = std::make_unique<int>(10);
p.reset(new int(20));
```

---

## shared_ptr

**基本写法：创建 shared_ptr**
`std::shared_ptr<<type>> <ptr> = std::make_shared<<type>>(<args>);`
```cpp
#include <memory>
// 创建共享所有权的智能指针
std::shared_ptr<int> p = std::make_shared<int>(10);
```

---

**拷贝写法：拷贝 shared_ptr**
`std::shared_ptr<<type>> <ptr2> = <ptr1>;`
```cpp
// 拷贝 shared_ptr，引用计数增加
std::shared_ptr<int> p1 = std::make_shared<int>(10);
std::shared_ptr<int> p2 = p1;
```

---

**引用计数写法：获取引用计数**
`<ptr>.use_count()`
```cpp
// 获取当前引用计数
std::shared_ptr<int> p1 = std::make_shared<int>(10);
std::shared_ptr<int> p2 = p1;
std::cout << p1.use_count() << std::endl;
```

---

**重置写法：重置 shared_ptr**
`<ptr>.reset();`
```cpp
// 重置 shared_ptr，引用计数减少
std::shared_ptr<int> p = std::make_shared<int>(10);
p.reset();
```

---

**自定义删除器写法**
`std::shared_ptr<<type>> <ptr>(<raw_ptr>, <deleter>);`
```cpp
#include <memory>
// 使用自定义删除器
std::shared_ptr<FILE> file(fopen("test.txt", "r"), [](FILE* f) {
    if (f) fclose(f);
});
```

---

## weak_ptr

**基本写法：创建 weak_ptr**
`std::weak_ptr<<type>> <weak> = <shared_ptr>;`
```cpp
#include <memory>
// 创建弱引用，不增加引用计数
std::shared_ptr<int> shared = std::make_shared<int>(10);
std::weak_ptr<int> weak = shared;
```

---

**lock 写法：获取 shared_ptr**
`std::shared_ptr<<type>> <ptr> = <weak>.lock();`
```cpp
// 尝试获取 shared_ptr
std::weak_ptr<int> weak = shared;
if (auto p = weak.lock()) {
    std::cout << *p << std::endl;
}
```

---

**expired 写法：检查是否过期**
`<weak>.expired()`
```cpp
// 检查 weak_ptr 是否过期
std::weak_ptr<int> weak = shared;
if (weak.expired()) {
    std::cout << "Pointer expired" << std::endl;
}
```

---

**use_count 写法：获取引用计数**
`<weak>.use_count()`
```cpp
// 获取 weak_ptr 对应的引用计数
std::weak_ptr<int> weak = shared;
std::cout << weak.use_count() << std::endl;
```

---

## 智能指针与数组

**unique_ptr 数组写法**
`std::unique_ptr<<type>[]> <ptr> = std::make_unique<<type>[]>(<size>);`
```cpp
#include <memory>
// unique_ptr 管理数组
std::unique_ptr<int[]> arr = std::make_unique<int[]>(10);
arr[0] = 100;
```

---

**shared_ptr 数组写法（C++17）**
`std::shared_ptr<<type>[]> <ptr> = std::make_shared<<type>[]>(<size>);`
```cpp
#include <memory>
// C++17 shared_ptr 管理数组
std::shared_ptr<int[]> arr = std::make_shared<int[]>(10);
arr[0] = 100;
```

---

## 智能指针与自定义类型

**基本写法：管理自定义类型**
`std::unique_ptr<<Type>> <ptr> = std::make_unique<<Type>>(<args>);`
```cpp
#include <memory>
// 管理自定义类型
struct Point { int x; int y; Point(int x, int y) : x(x), y(y) {} };
std::unique_ptr<Point> p = std::make_unique<Point>(10, 20);
```

---

**成员访问写法：访问智能指针成员**
`<ptr>-><member>`
```cpp
// 通过智能指针访问成员
std::unique_ptr<Point> p = std::make_unique<Point>(10, 20);
std::cout << p->x << std::endl;
```

---

## 智能指针转换

**dynamic_pointer_cast 写法**
`std::dynamic_pointer_cast<<Derived>>(<base_ptr>);`
```cpp
#include <memory>
// 动态转换 shared_ptr
std::shared_ptr<Base> base = std::make_shared<Derived>();
std::shared_ptr<Derived> derived = std::dynamic_pointer_cast<Derived>(base);
```

---

**static_pointer_cast 写法**
`std::static_pointer_cast<<Target>>(<src_ptr>);`
```cpp
#include <memory>
// 静态转换 shared_ptr
std::shared_ptr<Derived> derived = std::make_shared<Derived>();
std::shared_ptr<Base> base = std::static_pointer_cast<Base>(derived);
```

---

## 智能指针与容器

**容器写法：存储智能指针**
`std::vector<std::unique_ptr<<type>>> <vec>;`
```cpp
#include <memory>
#include <vector>
// 容器存储智能指针
std::vector<std::unique_ptr<int>> vec;
vec.push_back(std::make_unique<int>(10));
```

---

**shared_ptr 容器写法**
`std::vector<std::shared_ptr<<type>>> <vec>;`
```cpp
#include <memory>
#include <vector>
// 容器存储 shared_ptr
std::vector<std::shared_ptr<int>> vec;
vec.push_back(std::make_shared<int>(10));
```

---

## enable_shared_from_this

**基本写法：继承 enable_shared_from_this**
`class <Type> : public std::enable_shared_from_this<<Type>> { ... };`
```cpp
#include <memory>
// 继承 enable_shared_from_this
class MyClass : public std::enable_shared_from_this<MyClass> {
public:
    std::shared_ptr<MyClass> get_ptr() {
        return shared_from_this();
    }
};
```

---

**使用写法：获取自身的 shared_ptr**
`<obj>.shared_from_this()`
```cpp
// 获取自身的 shared_ptr
std::shared_ptr<MyClass> obj = std::make_shared<MyClass>();
std::shared_ptr<MyClass> ptr = obj->get_ptr();
```

---

## 智能指针最佳实践

**优先写法：优先使用 make_unique 和 make_shared**
`auto <ptr> = std::make_unique<<type>>(<args>);`
```cpp
#include <memory>
// 优先使用 make_unique/make_shared
auto p = std::make_unique<int>(10);
```

---

**unique_ptr 优先写法：默认使用 unique_ptr**
`std::unique_ptr<<type>> <ptr> = std::make_unique<<type>>(<args>);`
```cpp
#include <memory>
// 默认使用 unique_ptr，需要共享时再使用 shared_ptr
std::unique_ptr<int> p = std::make_unique<int>(10);
```
