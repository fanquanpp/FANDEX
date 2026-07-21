# 面向对象基础

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 类定义

**基本写法：类定义**
`class <ClassName> { private: ... public: ... };`
```cpp
// 定义 Point 类
class Point {
private:
    int x;
    int y;
public:
    Point(int x, int y) : x(x), y(y) {}
    int getX() { return x; }
};
```

---

**struct 写法：使用 struct 定义类**
`struct <ClassName> { ... };`
```cpp
// 使用 struct 定义类（默认 public）
struct Point {
    int x;
    int y;
};
```

---

## 访问修饰符

**public 写法：公有成员**
`public: <members>`
```cpp
// 公有成员，外部可访问
class MyClass {
public:
    int public_var;
};
```

---

**private 写法：私有成员**
`private: <members>`
```cpp
// 私有成员，仅类内部可访问
class MyClass {
private:
    int private_var;
};
```

---

**protected 写法：受保护成员**
`protected: <members>`
```cpp
// 受保护成员，类内部和派生类可访问
class MyClass {
protected:
    int protected_var;
};
```

---

## 构造函数

**默认写法：默认构造函数**
`<ClassName>() { ... }`
```cpp
// 默认构造函数
class Point {
    int x, y;
public:
    Point() : x(0), y(0) {}
};
```

---

**参数化写法：带参数构造函数**
`<ClassName>(<params>) { ... }`
```cpp
// 带参数构造函数
class Point {
    int x, y;
public:
    Point(int x, int y) : x(x), y(y) {}
};
```

---

**初始化列表写法：成员初始化列表**
`<ClassName>(<params>) : <member1>(<val1>), <member2>(<val2>) { ... }`
```cpp
// 使用初始化列表初始化成员
class Point {
    int x, y;
public:
    Point(int x, int y) : x(x), y(y) {}
};
```

---

**委托写法：委托构造函数**
`<ClassName>(<params>) : <ClassName>(<other_params>) { ... }`
```cpp
// 委托给另一个构造函数
class Point {
    int x, y;
public:
    Point() : Point(0, 0) {}
    Point(int x, int y) : x(x), y(y) {}
};
```

---

**explicit 写法：禁止隐式转换**
`explicit <ClassName>(<params>) { ... }`
```cpp
// 禁止隐式转换
class MyInt {
    int value;
public:
    explicit MyInt(int v) : value(v) {}
};
```

---

## 拷贝构造函数

**基本写法：拷贝构造函数**
`<ClassName>(const <ClassName>& <other>) { ... }`
```cpp
// 拷贝构造函数
class String {
    char* data;
public:
    String(const String& other) {
        data = new char[strlen(other.data) + 1];
        strcpy(data, other.data);
    }
};
```

---

**禁用写法：禁用拷贝构造函数**
`<ClassName>(const <ClassName>&) = delete;`
```cpp
// 禁用拷贝构造函数
class NonCopyable {
public:
    NonCopyable(const NonCopyable&) = delete;
};
```

---

## 移动构造函数

**基本写法：移动构造函数**
`<ClassName>(<ClassName>&& <other>) noexcept { ... }`
```cpp
// 移动构造函数
class String {
    char* data;
public:
    String(String&& other) noexcept : data(other.data) {
        other.data = nullptr;
    }
};
```

---

## 析构函数

**基本写法：析构函数**
`~<ClassName>() { ... }`
```cpp
// 析构函数
class String {
    char* data;
public:
    ~String() {
        delete[] data;
    }
};
```

---

**virtual 写法：虚析构函数**
`virtual ~<ClassName>() { ... }`
```cpp
// 虚析构函数，确保派生类正确析构
class Base {
public:
    virtual ~Base() {}
};
```

---

## this 指针

**基本写法：使用 this 指针**
`this-><member>`
```cpp
// 使用 this 指针访问成员
class Point {
    int x;
public:
    void setX(int x) {
        this->x = x;
    }
};
```

---

**返回写法：返回 *this**
`return *this;`
```cpp
// 返回 *this 支持链式调用
class Builder {
    std::string str;
public:
    Builder& append(const std::string& s) {
        str += s;
        return *this;
    }
};
```

---

## 静态成员

**静态成员变量写法**
`static <type> <var_name>;`
```cpp
// 静态成员变量声明
class Counter {
public:
    static int count;
};
int Counter::count = 0;
```

---

**静态成员函数写法**
`static <return_type> <func>() { ... }`
```cpp
// 静态成员函数
class Counter {
public:
    static int get_count() { return count; }
};
```

---

**调用写法：通过类名调用静态成员**
`<ClassName>::<static_member>`
```cpp
// 通过类名调用静态成员
int c = Counter::count;
```

---

## 友元

**友元函数写法**
`friend <return_type> <func>(<params>);`
```cpp
// 声明友元函数
class Point {
    int x, y;
public:
    friend void print(const Point& p);
};

void print(const Point& p) {
    std::cout << p.x << ", " << p.y << std::endl;
}
```

---

**友元类写法**
`friend class <ClassName>;`
```cpp
// 声明友元类
class A {
    int private_var;
public:
    friend class B;
};

class B {
public:
    void access(A& a) { std::cout << a.private_var << std::endl; }
};
```

---

## 继承

**基本写法：公有继承**
`class <Derived> : public <Base> { ... };`
```cpp
// 公有继承
class Animal {
public:
    void eat() { std::cout << "Eating" << std::endl; }
};
class Dog : public Animal {
public:
    void bark() { std::cout << "Barking" << std::endl; }
};
```

---

**私有继承写法**
`class <Derived> : private <Base> { ... };`
```cpp
// 私有继承
class Derived : private Base {
};
```

---

**多继承写法**
`class <Derived> : public <Base1>, public <Base2> { ... };`
```cpp
// 多继承
class Drawable {
public:
    virtual void draw() {}
};
class Animal {
public:
    virtual void eat() {}
};
class Dog : public Animal, public Drawable {
};
```

---

## 虚函数与多态

**基本写法：虚函数**
`virtual <return_type> <func>(<params>) { ... }`
```cpp
// 虚函数
class Animal {
public:
    virtual void sound() {
        std::cout << "Animal sound" << std::endl;
    }
};
```

---

**override 写法：重写虚函数**
`virtual <return_type> <func>(<params>) override { ... }`
```cpp
// 重写虚函数
class Dog : public Animal {
public:
    void sound() override {
        std::cout << "Woof" << std::endl;
    }
};
```

---

**纯虚函数写法**
`virtual <return_type> <func>(<params>) = 0;`
```cpp
// 纯虚函数，使类成为抽象类
class Shape {
public:
    virtual double area() = 0;
};
```

---

**final 写法：禁止重写**
`virtual <return_type> <func>(<params>) final { ... }`
```cpp
// 禁止派生类重写
class Base {
public:
    virtual void func() final {}
};
```

---

## 多态使用

**基本写法：通过基类指针调用虚函数**
`<Base>* <ptr> = new <Derived>(); <ptr>-><virtual_func>();`
```cpp
// 通过基类指针调用虚函数（多态）
Animal* animal = new Dog();
animal->sound();
```

---

**引用写法：通过基类引用调用虚函数**
`<Base>& <ref> = <derived>; <ref>.<virtual_func>();`
```cpp
// 通过基类引用调用虚函数（多态）
Dog dog;
Animal& ref = dog;
ref.sound();
```
