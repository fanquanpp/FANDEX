---
order: 70
tags:
  - 'cs-fundamentals'
  - 'design-patterns'
difficulty: intermediate
title: 设计模式
module: 'cs-fundamentals'
category: 'Computer Science / Design Patterns'
description: 设计模式核心：创建型、结构型、行为型模式，SOLID原则，模式间关系与选择策略。
author: fanquanpp
related:
  - 'cs-fundamentals/人工智能基础'
  - 'cs-fundamentals/计算机图形学'
  - 'cs-fundamentals/软件体系结构'
  - 'cs-fundamentals/人机交互'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 设计原则

### 1.1 SOLID原则

```
SOLID原则 -- 面向对象设计的五个基本原则:

S - Single Responsibility (单一职责):
  一个类只有一个引起变化的原因
  高内聚: 每个类只做一件事

  反例: Employee类同时负责数据存储和报表生成
  正例: Employee类 + EmployeeReportGenerator类

O - Open/Closed (开闭原则):
  对扩展开放, 对修改关闭
  通过抽象和多态实现

  反例: 修改switch语句添加新类型
  正例: 定义接口, 新类型实现接口

L - Liskov Substitution (里氏替换):
  子类对象必须能替换父类对象而不破坏正确性
  子类不应强化前置条件, 不应弱化后置条件

  反例: Square继承Rectangle, 但setWidth影响height
  正例: Square和Rectangle都实现Shape接口

I - Interface Segregation (接口隔离):
  客户端不应依赖它不使用的接口
  接口应小而专注

  反例: 一个"胖"接口包含所有方法
  正例: 拆分为多个小接口, 客户端按需依赖

D - Dependency Inversion (依赖倒置):
  高层模块不应依赖低层模块, 两者都应依赖抽象
  抽象不应依赖细节, 细节应依赖抽象

  反例: 业务逻辑直接依赖数据库实现类
  正例: 业务逻辑依赖Repository接口, 数据库类实现接口
```

### 1.2 其他设计原则

```
DRY (Don't Repeat Yourself):
  每个知识片段在系统中有唯一表示
  重复代码 -> 提取公共方法/基类

KISS (Keep It Simple, Stupid):
  保持简单, 避免过度设计
  最简单的能工作的方案就是最好的

YAGNI (You Aren't Gonna Need It):
  不要预先实现当前不需要的功能
  避免基于猜测的过度抽象

组合优于继承:
  优先使用对象组合而非类继承
  继承: 白箱复用 (可见父类实现细节)
  组合: 黑箱复用 (只通过接口交互)

迪米特法则 (Law of Demeter):
  一个对象应该对其他对象有最少的了解
  只与直接朋友通信, 不与陌生人通信
  a.getB().getC().doSomething()  -- 违反
  a.doSomethingWithB()           -- 遵守
```

> 跨模块引用：[操作系统](os)的内核架构（宏内核vs微内核）体现了开闭原则和接口隔离原则。[计算机网络](network)的协议栈分层是单一职责和依赖倒置的体现。[体系结构](architecture)的ISA是依赖倒置的经典案例。

---

## 2. 创建型模式

### 2.1 Singleton (单例)

```
意图: 确保一个类只有一个实例, 并提供全局访问点

结构:
  +-------------------+
  |    Singleton      |
  |-------------------|
  | - instance: Self  |
  |-------------------|
  | + getInstance()   |
  | - Singleton()     |
  +-------------------+

实现 (线程安全, 双重检查锁定):

class Singleton {
private:
    static std::atomic<Singleton*> instance;
    static std::mutex mtx;
    Singleton() {}

public:
    static Singleton* getInstance() {
        Singleton* tmp = instance.load(std::memory_order_acquire);
        if (tmp == nullptr) {
            std::lock_guard<std::mutex> lock(mtx);
            tmp = instance.load(std::memory_order_relaxed);
            if (tmp == nullptr) {
                tmp = new Singleton();
                instance.store(tmp, std::memory_order_release);
            }
        }
        return tmp;
    }
};

注意:
  - 多线程环境需要同步
  - 防止反射/序列化破坏单例
  - 全局状态增加耦合, 谨慎使用

  [Java](java/overview)实现: 枚举单例 (防反射和序列化)
  [C++](cpp/overview)实现: Meyers' Singleton (局部静态变量)
```

### 2.2 Factory Method (工厂方法)

```
意图: 定义创建对象的接口, 让子类决定实例化哪个类

结构:
       +-----------+         +-----------+
       |  Creator  |         |  Product  |
       +-----------+         +-----------+
       | factoryMethod()     | operation()
       +-----------+         +-----------+
            ^                      ^
            |                      |
  +------------------+    +------------------+
  | ConcreteCreator  |    | ConcreteProduct  |
  +------------------+    +------------------+
  | factoryMethod()  |    | operation()      |
  +------------------+    +------------------+

伪代码:

abstract class Creator {
    abstract Product factoryMethod();

    void anOperation() {
        Product p = factoryMethod();
        p.operation();
    }
}

class ConcreteCreatorA extends Creator {
    Product factoryMethod() {
        return new ConcreteProductA();
    }
}

设计思想:
  将对象创建与使用解耦
  符合开闭原则: 新增产品只需新增Creator子类
  符合依赖倒置: 高层依赖Product接口, 不依赖具体类
```

### 2.3 Abstract Factory (抽象工厂)

```
意图: 创建一族相关或相互依赖的对象, 而无需指定具体类

结构:
  +------------------+     +------------------+
  | AbstractFactory  |     | AbstractProductA |
  +------------------+     +------------------+
  | createProductA() |     | operationA()     |
  | createProductB() |     +------------------+
  +------------------+            ^
         ^                        |
         |               +------------------+
  +------------------+   | ConcreteProductA1|
  | ConcreteFactory1 |   +------------------+
  +------------------+
  | createProductA() |   +------------------+
  | createProductB() |   | ConcreteProductA2|
  +------------------+   +------------------+

伪代码:

interface GUIFactory {
    Button createButton();
    TextField createTextField();
}

class WindowsFactory implements GUIFactory {
    Button createButton() { return new WindowsButton(); }
    TextField createTextField() { return new WindowsTextField(); }
}

class MacFactory implements GUIFactory {
    Button createButton() { return new MacButton(); }
    TextField createTextField() { return new MacTextField(); }
}

与Factory Method的区别:
  Factory Method: 一个产品, 一个工厂方法
  Abstract Factory: 一族产品, 多个工厂方法
```

### 2.4 Builder (建造者)

```
意图: 将复杂对象的构建与表示分离, 使同样的构建过程可创建不同表示

结构:
  +----------+      +-----------+      +-----------+
  | Director |----->| Builder   |<-----| Product   |
  +----------+      +-----------+      +-----------+
                    | buildA()  |
                    | buildB()  |
                    | getResult()|
                    +-----------+
                         ^
                         |
               +-------------------+
               | ConcreteBuilder   |
               +-------------------+

伪代码:

class NutritionFacts {
    final int calories;
    final int fat;
    final int sodium;

    private NutritionFacts(Builder b) {
        calories = b.calories;
        fat = b.fat;
        sodium = b.sodium;
    }

    static class Builder {
        private int calories = 0;
        private int fat = 0;
        private int sodium = 0;

        Builder calories(int v) { calories = v; return this; }
        Builder fat(int v)      { fat = v; return this; }
        Builder sodium(int v)   { sodium = v; return this; }
        NutritionFacts build()  { return new NutritionFacts(this); }
    }
}

// 使用
NutritionFacts cocaCola = new NutritionFacts.Builder()
    .calories(100).fat(0).sodium(35).build();

适用场景:
  - 构造参数多, 多数可选
  - 需要不可变对象
  - 构建过程需要多步骤
```

### 2.5 Prototype (原型)

```
意图: 通过复制已有实例创建新对象, 而非从头创建

结构:
  +-----------+
  | Prototype |
  +-----------+
  | clone()   |
  +-----------+
       ^
       |
  +------------------+
  | ConcretePrototype|
  +------------------+
  | field            |
  | clone()          |
  +------------------+

浅拷贝 vs 深拷贝:
  浅拷贝: 复制引用, 共享内部对象
  深拷贝: 递归复制所有层级

  [Java](java/overview): Object.clone() 默认浅拷贝
  [C++](cpp/overview): 拷贝构造函数, 需自行实现深拷贝

适用场景:
  - 创建新对象代价大 (数据库查询, 网络请求)
  - 需要大量相似对象
  - 框架中不依赖具体类创建对象
```

---

## 3. 结构型模式

### 3.1 Adapter (适配器)

```
意图: 将一个类的接口转换为客户期望的另一个接口

类适配器 (继承):
  +-----------+     +-----------+
  | Target    |     | Adaptee   |
  +-----------+     +-----------+
  | request()|     | specificReq()|
  +-----------+     +-----------+
       ^                 ^
       |                 |
  +------------------------+
  |    Adapter             |
  +------------------------+
  | request()              |
  |   specificReq()        |
  +------------------------+

对象适配器 (组合):
  +-----------+         +-----------+
  | Target    |         | Adaptee   |
  +-----------+         +-----------+
  | request()|         | specificReq()|
  +-----------+         +-----------+
       ^                     ^
       |                     |
  +------------------------+ |
  |    Adapter             |---  (has-a)
  +------------------------+
  | - adaptee: Adaptee     |
  | request()              |
  |   adaptee.specificReq()|
  +------------------------+

伪代码:

class OldPrinter {
    void printOld(String text) { ... }
}

interface NewPrinter {
    void print(String text);
}

class PrinterAdapter implements NewPrinter {
    private OldPrinter oldPrinter;

    void print(String text) {
        oldPrinter.printOld(text);
    }
}

跨模块引用: [操作系统](os)的系统调用适配层是Adapter模式。
  [计算机网络](network)的协议转换器是Adapter模式。
```

### 3.2 Decorator (装饰器)

```
意图: 动态地给对象添加额外职责, 比继承更灵活

结构:
  +-----------+
  | Component |
  +-----------+
  | operation()|
  +-----------+
       ^   ^
       |   |
  +--------+  +-----------+
  |Concrete|  | Decorator |
  |Component| +-----------+
  +--------+ | -component |
             | operation()|
             +-----------+
                  ^
                  |
        +------------------+
        | ConcreteDecorator|
        +------------------+
        | addedBehavior()  |
        | operation()      |
        +------------------+

伪代码:

interface Coffee {
    double cost();
    String description();
}

class Espresso implements Coffee {
    double cost() { return 1.99; }
    String description() { return "Espresso"; }
}

class MilkDecorator implements Coffee {
    private Coffee coffee;
    double cost() { return coffee.cost() + 0.50; }
    String description() { return coffee.description() + ", Milk"; }
}

// 使用
Coffee c = new MilkDecorator(new MochaDecorator(new Espresso()));

与继承的区别:
  继承: 静态扩展, 编译时确定
  装饰器: 动态扩展, 运行时组合

  [Java](java/overview): InputStream/OutputStream族是装饰器模式
  [C++](cpp/overview): std::streambuf的派生类链
```

### 3.3 Composite (组合)

```
意图: 将对象组合成树形结构以表示"部分-整体"层次

结构:
  +-----------+
  | Component |
  +-----------+
  | operation()|
  | add()     |
  | remove()  |
  | getChild()|
  +-----------+
       ^   ^
       |   |
  +--------+  +-----------+
  |  Leaf  |  | Composite |
  +--------+  +-----------+
  |operation()| | children  |
  +--------+  | operation()|
              | add()      |
              | remove()   |
              +-----------+

伪代码:

interface FileSystemNode {
    void display();
}

class File implements FileSystemNode {
    void display() { print(name); }
}

class Directory implements FileSystemNode {
    List<FileSystemNode> children;
    void display() {
        print(name + "/");
        for (child : children) child.display();
    }
    void add(FileSystemNode n) { children.add(n); }
}

// 树结构
Directory root = new Directory("root");
root.add(new File("readme.md"));
Directory src = new Directory("src");
src.add(new File("main.c"));
root.add(src);

跨模块引用: [操作系统](os)的文件系统目录树是Composite模式。
  [离散数学](discrete-math)的树结构是Composite的数学基础。
```

### 3.4 Facade (外观)

```
意图: 为子系统中的一组接口提供统一的高层接口

结构:
  +--------+     +-----------+
  | Client |---->|  Facade   |
  +--------+     +-----------+
                 | operation()|
                 +-----------+
                  /    |    \
                 v     v     v
              +---+ +---+ +---+
              | A | | B | | C |  子系统
              +---+ +---+ +---+

伪代码:

class HomeTheaterFacade {
    Projector projector;
    SoundSystem sound;
    DVDPlayer dvd;

    void watchMovie(String movie) {
        projector.on();
        projector.setInput("DVD");
        sound.on();
        sound.setSurround();
        dvd.on();
        dvd.play(movie);
    }

    void endMovie() {
        dvd.stop();
        dvd.off();
        sound.off();
        projector.off();
    }
}

跨模块引用: [操作系统](os)的系统调用是内核子系统的Facade。
  [编译原理](compiler)的编译器前端是后端子系统的Facade。
```

### 3.5 Proxy (代理)

```
意图: 为其他对象提供代理以控制对这个对象的访问

代理类型:
  虚拟代理: 延迟创建开销大的对象
  保护代理: 控制对原始对象的访问权限
  远程代理: 为远程对象提供本地代表
  智能引用: 在访问对象时执行额外操作 (引用计数)

结构:
  +-----------+     +-----------+
  | Subject   |     | RealSubject|
  +-----------+     +-----------+
  | request() |     | request() |
  +-----------+     +-----------+
       ^                  ^
       |                  |
  +-----------+           |
  |   Proxy   |-----------+  (引用)
  +-----------+
  | request() |
  +-----------+

伪代码 (虚拟代理):

interface Image {
    void display();
}

class RealImage implements Image {
    void display() { /* 加载并显示 */ }
}

class ImageProxy implements Image {
    private RealImage realImage;
    void display() {
        if (realImage == null) {
            realImage = new RealImage();  // 延迟加载
        }
        realImage.display();
    }
}

跨模块引用: [Java](java/overview)的动态代理 (java.lang.reflect.Proxy)。
  [C++](cpp/overview)的智能指针 (shared_ptr) 是智能引用代理。
  [计算机网络](network)的反向代理 (Nginx) 是远程代理。
```

---

## 4. 行为型模式

### 4.1 Strategy (策略)

```
意图: 定义一族算法, 将每个算法封装起来, 使它们可以互换

结构:
  +-----------+     +-----------+
  |  Context  |---->| Strategy  |
  +-----------+     +-----------+
  | algorithm()|    | algorithm()|
  +-----------+     +-----------+
                        ^
            +-----------+-----------+
            |                       |
  +------------------+    +------------------+
  | ConcreteStrategyA|    | ConcreteStrategyB|
  +------------------+    +------------------+
  | algorithm()      |    | algorithm()      |
  +------------------+    +------------------+

伪代码:

interface SortStrategy {
    void sort(int[] data);
}

class QuickSort implements SortStrategy {
    void sort(int[] data) { /* 快速排序 */ }
}

class MergeSort implements SortStrategy {
    void sort(int[] data) { /* 归并排序 */ }
}

class Sorter {
    SortStrategy strategy;
    void setStrategy(SortStrategy s) { strategy = s; }
    void sort(int[] data) { strategy.sort(data); }
}

设计思想:
  消除条件语句: 用策略对象替代if-else/switch
  符合开闭原则: 新增策略无需修改Context
  算法可独立变化: 策略可独立于使用方演化
```

### 4.2 Observer (观察者)

```
意图: 定义对象间一对多的依赖, 当一个对象状态改变时, 所有依赖者得到通知

结构:
  +-----------+          +-----------+
  |  Subject  |--------->| Observer  |
  +-----------+  1    *  +-----------+
  | attach()  |          | update() |
  | detach()  |          +-----------+
  | notify()  |               ^
  +-----------+               |
       ^           +-----------+-----------+
       |           |                       |
  +------------------+    +------------------+
  | ConcreteSubject  |    | ConcreteObserver |
  +------------------+    +------------------+
  | state            |    | update()         |
  | getState()       |    +------------------+
  +------------------+

伪代码:

class EventBus {
    Map<Class, List<Consumer>> handlers;

    <T> void subscribe(Class<T> type, Consumer<T> handler) {
        handlers.computeIfAbsent(type, k -> new ArrayList<>()).add(handler);
    }

    <T> void publish(T event) {
        for (Consumer handler : handlers.getOrDefault(event.getClass(), List.of())) {
            handler.accept(event);
        }
    }
}

推模型 vs 拉模型:
  推模型: Subject将状态变化数据推送给Observer
  拉模型: Subject只通知, Observer主动拉取需要的数据

跨模块引用: [操作系统](os)的信号机制是Observer模式。
  [计算机网络](network)的事件驱动IO (epoll) 是Observer模式。
  [Java](java/overview)的Observable/Observer (已废弃) 和PropertyChangeListener。
```

### 4.3 State (状态)

```
意图: 允许对象在其内部状态改变时改变其行为

状态机模型 (参见 [概述](overview) 4.3节):

结构:
  +-----------+     +-----------+
  |  Context  |---->|   State   |
  +-----------+     +-----------+
  | request() |     | handle()  |
  | setState()|     +-----------+
  +-----------+          ^
            +------------+------------+
            |                         |
  +------------------+    +------------------+
  | ConcreteStateA   |    | ConcreteStateB   |
  +------------------+    +------------------+
  | handle()         |    | handle()         |
  +------------------+    +------------------+

伪代码 (TCP连接状态机):

interface TCPState {
    void open(TCPConnection conn);
    void close(TCPConnection conn);
    void acknowledge(TCPConnection conn);
}

class TCPClosed implements TCPState {
    void open(TCPConnection conn) {
        conn.setState(new TCPOpen());
    }
}

class TCPOpen implements TCPState {
    void close(TCPConnection conn) {
        conn.setState(new TCPClosed());
    }
}

class TCPConnection {
    TCPState state;
    void open() { state.open(this); }
    void close() { state.close(this); }
    void setState(TCPState s) { state = s; }
}

设计思想:
  将状态转移逻辑从Context中分离到State类
  消除大型switch语句
  新增状态只需新增State子类 (开闭原则)
```

### 4.4 Command (命令)

```
意图: 将请求封装为对象, 从而参数化客户端、排队、记录日志、撤销

结构:
  +-----------+     +-----------+     +-----------+
  | Invoker   |---->|  Command  |---->| Receiver  |
  +-----------+     +-----------+     +-----------+
  | execute() |     | execute() |     | action() |
  | undo()    |     | undo()    |     +-----------+
  +-----------+     +-----------+

伪代码:

interface Command {
    void execute();
    void undo();
}

class LightOnCommand implements Command {
    Light light;
    void execute() { light.on(); }
    void undo()    { light.off(); }
}

class RemoteControl {
    Stack<Command> history;
    void execute(Command cmd) {
        cmd.execute();
        history.push(cmd);
    }
    void undo() {
        if (!history.isEmpty()) history.pop().undo();
    }
}

应用:
  撤销/重做: 维护命令历史栈
  宏命令: 组合多个命令
  队列: 延迟执行命令
  日志: 持久化命令用于恢复

  [操作系统](os)的Shell命令是Command模式。
  [Java](java/overview)的Runnable是Command模式。
```

### 4.5 Iterator (迭代器)

```
意图: 提供一种方法顺序访问聚合对象中的元素, 而不暴露其内部表示

结构:
  +-----------+     +-----------+
  | Aggregate |---->| Iterator  |
  +-----------+     +-----------+
  | createIter()|   | next()   |
  +-----------+     | hasNext()|
                    | remove() |
                    +-----------+

伪代码:

class BSTIterator implements Iterator<TreeNode> {
    Deque<TreeNode> stack;

    BSTIterator(TreeNode root) {
        pushLeft(root);
    }

    boolean hasNext() { return !stack.isEmpty(); }

    TreeNode next() {
        TreeNode node = stack.pop();
        pushLeft(node.right);
        return node;
    }

    void pushLeft(TreeNode node) {
        while (node != null) {
            stack.push(node);
            node = node.left;
        }
    }
}

设计思想:
  分离聚合对象的遍历逻辑
  支持多种遍历策略 (前序/中序/后序/层序)
  同一聚合可同时有多个独立迭代器
```

### 4.6 Template Method (模板方法)

```
意图: 定义算法骨架, 将某些步骤延迟到子类实现

结构:
  +------------------+
  | AbstractClass    |
  +------------------+
  | templateMethod() |  <-- 固定算法骨架
  | primitiveOp1()   |  <-- 抽象, 子类实现
  | primitiveOp2()   |  <-- 抽象, 子类实现
  +------------------+
         ^
         |
  +------------------+
  | ConcreteClass    |
  +------------------+
  | primitiveOp1()   |
  | primitiveOp2()   |
  +------------------+

伪代码:

abstract class DataProcessor {
    final void process() {       // 模板方法, 不可覆盖
        readData();
        processData();
        writeData();
    }

    abstract void readData();
    abstract void processData();

    void writeData() {           // 钩子方法, 可选覆盖
        // 默认实现
    }
}

class FileProcessor extends DataProcessor {
    void readData()    { /* 从文件读取 */ }
    void processData() { /* 处理数据 */ }
}

设计思想:
  好莱坞原则: "不要调用我们, 我们会调用你"
  父类控制流程, 子类提供细节
  与Strategy的区别: 模板方法用继承, Strategy用组合
```

---

## 5. 模式关系与选择

### 5.1 模式间的协作

```
常见模式组合:

1. Factory + Strategy:
   工厂根据配置创建具体策略对象

2. Composite + Iterator:
   组合结构使用迭代器遍历

3. Observer + Mediator:
   中介者协调观察者间的通信

4. Decorator + Factory:
   工厂创建装饰后的对象

5. Command + Composite:
   宏命令是命令的组合

6. State + Strategy:
   状态模式是策略模式的动态版本
   状态切换自动发生, 策略由客户端选择
```

### 5.2 模式选择决策树

```
创建对象?
  |-- 是: 创建型模式
  |   |-- 一个实例? -> Singleton
  |   |-- 由子类决定? -> Factory Method
  |   |-- 一族对象? -> Abstract Factory
  |   |-- 复杂构建? -> Builder
  |   |-- 克隆已有? -> Prototype
  |
接口不匹配?
  |-- 是: 结构型模式
  |   |-- 接口转换? -> Adapter
  |   |-- 添加职责? -> Decorator
  |   |-- 树形结构? -> Composite
  |   |-- 简化接口? -> Facade
  |   |-- 控制访问? -> Proxy
  |   |-- 共享对象? -> Flyweight
  |
行为问题?
  |-- 是: 行为型模式
  |   |-- 算法切换? -> Strategy
  |   |-- 状态变化? -> State
  |   |-- 通知依赖? -> Observer
  |   |-- 封装请求? -> Command
  |   |-- 遍历集合? -> Iterator
  |   |-- 算法骨架? -> Template Method
  |   |-- 对象通信? -> Mediator
  |   |-- 请求链? -> Chain of Responsibility
```

### 5.3 模式的代价

```
设计模式不是银弹, 每个模式都有代价:

1. 增加类的数量:
   每个模式通常引入1-3个新类
   系统复杂度增加

2. 间接层增加:
   更多接口和抽象层
   调试和跟踪更困难

3. 性能开销:
   虚方法调用 (Strategy, State)
   对象创建 (Factory, Prototype)
   额外引用 (Decorator, Proxy)

4. 过度设计:
   不必要的抽象增加理解成本
  "当你有3个以上子类时再考虑模式"

何时不用模式:
  - 问题很简单, 直接方案足够
  - 团队不熟悉模式, 增加沟通成本
  - 性能是首要约束
  - 需求不稳定, 抽象可能白费
```

---

## 6. 并发模式

### 6.1 Producer-Consumer (生产者-消费者)

```
意图: 将数据的生产与消费解耦, 通过缓冲区协调速率差异

结构:
  +----------+     +----------+     +----------+
  | Producer |---->|  Buffer  |---->| Consumer |
  +----------+     +----------+     +----------+
                   | put()   |      | take()  |
                   | take()  |      +----------+
                   +----------+

伪代码:

class BoundedBuffer<T> {
    Queue<T> queue = new LinkedList<>();
    int capacity;

    synchronized void put(T item) throws InterruptedException {
        while (queue.size() == capacity) wait();
        queue.add(item);
        notifyAll();
    }

    synchronized T take() throws InterruptedException {
        while (queue.isEmpty()) wait();
        T item = queue.remove();
        notifyAll();
        return item;
    }
}

跨模块引用: [操作系统](os)的管道(pipe)和消息队列是生产者-消费者模式。
  [计算机网络](network)的TCP缓冲区是生产者-消费者模式。
```

### 6.2 Read-Write Lock (读写锁)

```
意图: 允许多个读者同时访问, 但写者独占访问

状态机:
           读者进入          写者进入
  空闲 -------> 读锁 -------> 写锁
   ^              |              |
   |              | 读者退出     | 写者退出
   +--------------+--------------+

伪代码:

class ReadWriteLock {
    int readers = 0;
    boolean writing = false;

    synchronized void readLock() throws InterruptedException {
        while (writing) wait();
        readers++;
    }

    synchronized void readUnlock() {
        readers--;
        if (readers == 0) notifyAll();
    }

    synchronized void writeLock() throws InterruptedException {
        while (readers > 0 || writing) wait();
        writing = true;
    }

    synchronized void writeUnlock() {
        writing = false;
        notifyAll();
    }
}

跨模块引用: [操作系统](os)的读写锁 (pthread_rwlock)。
  [Java](java/overview)的ReentrantReadWriteLock。
  [体系结构](architecture)的缓存一致性协议 (MESI) 是读写锁的硬件实现。
```

### 6.3 Thread Pool (线程池)

```
意图: 复用线程, 避免频繁创建销毁的开销

结构:
  +--------+     +----------+     +---------+
  | Client |---->| TaskQueue|---->| Worker  |
  +--------+     +----------+     | Thread |
                 | submit() |     +---------+
                 +----------+     ^    |
                                  |    v
                           +-----------+
                           |  Task     |
                           +-----------+

伪代码:

class ThreadPool {
    BlockingQueue<Runnable> taskQueue;
    Worker[] workers;

    ThreadPool(int nThreads) {
        taskQueue = new LinkedBlockingQueue<>();
        workers = new Worker[nThreads];
        for (int i = 0; i < nThreads; i++) {
            workers[i] = new Worker();
            workers[i].start();
        }
    }

    void submit(Runnable task) {
        taskQueue.put(task);
    }

    class Worker extends Thread {
        void run() {
            while (true) {
                Runnable task = taskQueue.take();
                task.run();
            }
        }
    }
}

跨模块引用: [Java](java/overview)的ExecutorService是线程池。
  [操作系统](os)的进程池和线程池。
  [C++](cpp/overview)的std::async底层使用线程池。
```

---

## 7. 速查表

### 7.1 创建型模式速查

| 模式             | 意图             | 关键词        |
| ---------------- | ---------------- | ------------- |
| Singleton        | 唯一实例         | 全局访问点    |
| Factory Method   | 子类决定创建     | 延迟到子类    |
| Abstract Factory | 创建一族对象     | 产品族        |
| Builder          | 分步构建复杂对象 | 链式调用      |
| Prototype        | 克隆创建对象     | 深拷贝/浅拷贝 |

### 7.2 结构型模式速查

| 模式      | 意图           | 关键词         |
| --------- | -------------- | -------------- |
| Adapter   | 接口转换       | 兼容性         |
| Decorator | 动态添加职责   | 包装器         |
| Composite | 树形结构       | 部分-整体      |
| Facade    | 简化接口       | 统一入口       |
| Proxy     | 控制访问       | 延迟/保护/远程 |
| Flyweight | 共享细粒度对象 | 对象池         |
| Bridge    | 分离抽象与实现 | 多维度变化     |

### 7.3 行为型模式速查

| 模式            | 意图           | 关键词         |
| --------------- | -------------- | -------------- |
| Strategy        | 算法族互换     | 消除条件语句   |
| Observer        | 一对多通知     | 发布-订阅      |
| State           | 状态驱动行为   | 状态机         |
| Command         | 封装请求       | 撤销/队列/日志 |
| Iterator        | 顺序访问       | 遍历集合       |
| Template Method | 算法骨架       | 好莱坞原则     |
| Mediator        | 对象间通信中介 | 解耦交互       |
| Chain of Resp.  | 请求处理链     | 逐级处理       |
| Visitor         | 分离操作与结构 | 双分派         |
| Memento         | 保存恢复状态   | 撤销快照       |

### 7.4 SOLID速查

| 原则 | 含义     | 对应模式                            |
| ---- | -------- | ----------------------------------- |
| SRP  | 单一职责 | Facade, Mediator                    |
| OCP  | 开闭原则 | Strategy, Observer, Template Method |
| LSP  | 里氏替换 | 所有使用继承的模式                  |
| ISP  | 接口隔离 | Adapter, Facade                     |
| DIP  | 依赖倒置 | Factory, Strategy, Observer         |

---

## 延伸阅读

- _Design Patterns: Elements of Reusable Object-Oriented Software_ -- GoF
- _Head First Design Patterns_ -- Freeman & Robson
- _Refactoring: Improving the Design of Existing Code_ -- Martin Fowler
- _Pattern-Oriented Software Architecture_ -- Buschmann et al.
