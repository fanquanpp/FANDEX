---
order: 65
title: Java设计模式
module: java
category: Java
difficulty: intermediate
description: GoF设计模式Java实现
author: fanquanpp
updated: '2026-06-14'
related:
  - java/SpringBoot安全
  - java/SpringBoot数据访问
  - java/Java函数式编程
  - java/Java网络编程
prerequisites:
  - java/概述与开发环境
---

## 概述

设计模式是针对软件设计中常见问题的可复用解决方案。1994 年，四位作者（被称为 GoF，Gang of Four）在《设计模式》一书中总结了 23 种经典设计模式，分为创建型、结构型和行为型三大类。

学习设计模式的目的不是生搬硬套，而是理解每种模式解决的问题和背后的设计思想。当你遇到类似的场景时，可以快速想到合适的解决方案。过度使用设计模式会让代码变得复杂，适度使用则能让代码更灵活、更易维护。

## 基础概念

### 三大类设计模式

- **创建型**：关注对象的创建方式，将对象的创建与使用分离。包括单例、工厂方法、抽象工厂、建造者、原型
- **结构型**：关注类和对象的组合方式，形成更大的结构。包括适配器、桥接、组合、装饰器、外观、享元、代理
- **行为型**：关注对象之间的通信和职责分配。包括策略、观察者、模板方法、命令、迭代器、中介者、备忘录、状态、职责链、访问者、解释器

### 设计原则

设计模式遵循的核心原则包括：

- 开闭原则：对扩展开放，对修改关闭
- 单一职责：一个类只做一件事
- 依赖倒置：依赖抽象而非具体实现
- 里氏替换：子类可以替换父类
- 接口隔离：接口要小而专

## 快速上手

### 单例模式

确保一个类只有一个实例，并提供全局访问点：

```java
// 方式一：枚举单例（最简洁、最安全）
public enum Singleton {
    INSTANCE;

    public void doSomething() {
        System.out.println("执行单例方法");
    }
}

// 使用
Singleton.INSTANCE.doSomething();

// 方式二：双重检查锁定（延迟初始化）
public class Singleton {
    private static volatile Singleton instance;

    private Singleton() {}  // 私有构造函数，防止外部实例化

    public static Singleton getInstance() {
        if (instance == null) {                  // 第一次检查（无锁）
            synchronized (Singleton.class) {
                if (instance == null) {          // 第二次检查（有锁）
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

### 工厂方法模式

定义创建对象的接口，让子类决定实例化哪个类：

```java
// 产品接口
interface Transport {
    void deliver();
}

// 具体产品
class Truck implements Transport {
    public void deliver() {
        System.out.println("卡车运输货物");
    }
}

class Ship implements Transport {
    public void deliver() {
        System.out.println("轮船运输货物");
    }
}

// 工厂接口
interface TransportFactory {
    Transport create();
}

// 具体工厂
class TruckFactory implements TransportFactory {
    public Transport create() {
        return new Truck();
    }
}

class ShipFactory implements TransportFactory {
    public Transport create() {
        return new Ship();
    }
}

// 使用
TransportFactory factory = new TruckFactory();
Transport transport = factory.create();
transport.deliver();  // 输出: 卡车运输货物
```

## 详细用法

### 1. 建造者模式

当对象有很多可选参数时，使用建造者模式可以避免构造函数参数过多：

```java
// 使用 Lombok 的 @Builder 注解可以自动生成（推荐）
// @Builder
// public class User { ... }

// 手动实现建造者
public class User {
    private final String name;    // 必填
    private final int age;        // 必填
    private final String email;   // 可选
    private final String phone;   // 可选

    private User(Builder builder) {
        this.name = builder.name;
        this.age = builder.age;
        this.email = builder.email;
        this.phone = builder.phone;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String name;
        private int age;
        private String email;
        private String phone;

        public Builder name(String name) {
            this.name = name;
            return this;  // 返回 this 实现链式调用
        }

        public Builder age(int age) {
            this.age = age;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder phone(String phone) {
            this.phone = phone;
            return this;
        }

        public User build() {
            // 可以在这里添加参数校验
            if (name == null || name.isEmpty()) {
                throw new IllegalStateException("姓名不能为空");
            }
            return new User(this);
        }
    }
}

// 使用：链式调用，清晰易读
User user = User.builder()
    .name("Alice")
    .age(25)
    .email("alice@example.com")
    .build();
```

### 2. 策略模式

定义一系列算法，将每个算法封装起来，使它们可以互相替换：

```java
// 策略接口
interface PaymentStrategy {
    void pay(double amount);
}

// 具体策略
class CreditCardPayment implements PaymentStrategy {
    private String cardNumber;

    public CreditCardPayment(String cardNumber) {
        this.cardNumber = cardNumber;
    }

    public void pay(double amount) {
        System.out.println("信用卡支付: " + amount + " 元，卡号: " + cardNumber);
    }
}

class WechatPayment implements PaymentStrategy {
    public void pay(double amount) {
        System.out.println("微信支付: " + amount + " 元");
    }
}

// 上下文
class ShoppingCart {
    private PaymentStrategy paymentStrategy;

    public void setPaymentStrategy(PaymentStrategy strategy) {
        this.paymentStrategy = strategy;
    }

    public void checkout(double amount) {
        paymentStrategy.pay(amount);
    }
}

// 使用
ShoppingCart cart = new ShoppingCart();
cart.setPaymentStrategy(new CreditCardPayment("6222****1234"));
cart.checkout(99.9);  // 信用卡支付: 99.9 元

cart.setPaymentStrategy(new WechatPayment());
cart.checkout(49.9);  // 微信支付: 49.9 元
```

### 3. 观察者模式

定义对象间一对多的依赖关系，当一个对象状态改变时，所有依赖它的对象都会收到通知：

```java
import java.util.ArrayList;
import java.util.List;

// 观察者接口
interface OrderListener {
    void onOrderCreated(Order order);
}

// 被观察者
class OrderService {
    private List<OrderListener> listeners = new ArrayList<>();

    // 注册观察者
    public void addListener(OrderListener listener) {
        listeners.add(listener);
    }

    // 移除观察者
    public void removeListener(OrderListener listener) {
        listeners.remove(listener);
    }

    // 创建订单时通知所有观察者
    public void createOrder(Order order) {
        // 保存订单到数据库...
        System.out.println("订单已创建: " + order.getId());

        // 通知所有观察者
        for (OrderListener listener : listeners) {
            listener.onOrderCreated(order);
        }
    }
}

// 具体观察者
class EmailNotifier implements OrderListener {
    public void onOrderCreated(Order order) {
        System.out.println("发送邮件通知: 订单 " + order.getId() + " 已创建");
    }
}

class InventoryUpdater implements OrderListener {
    public void onOrderCreated(Order order) {
        System.out.println("更新库存: 扣减商品数量");
    }
}

// 使用
OrderService orderService = new OrderService();
orderService.addListener(new EmailNotifier());
orderService.addListener(new InventoryUpdater());
orderService.createOrder(new Order("1001"));
```

### 4. 模板方法模式

在父类中定义算法的骨架，将某些步骤延迟到子类实现：

```java
// 抽象模板类
abstract class DataProcessor {

    // 模板方法：定义处理流程的骨架（用 final 防止子类覆盖）
    public final void process() {
        readData();
        transformData();
        writeData();
    }

    // 具体方法：所有子类共用的实现
    private void readData() {
        System.out.println("读取原始数据");
    }

    // 抽象方法：由子类实现不同的转换逻辑
    protected abstract void transformData();

    // 具体方法
    private void writeData() {
        System.out.println("写入处理后的数据");
    }
}

// 具体子类
class JsonProcessor extends DataProcessor {
    @Override
    protected void transformData() {
        System.out.println("将数据转换为 JSON 格式");
    }
}

class XmlProcessor extends DataProcessor {
    @Override
    protected void transformData() {
        System.out.println("将数据转换为 XML 格式");
    }
}

// 使用
DataProcessor processor = new JsonProcessor();
processor.process();
// 输出:
// 读取原始数据
// 将数据转换为 JSON 格式
// 写入处理后的数据
```

### 5. 适配器模式

将一个类的接口转换成客户端期望的另一个接口，使原本不兼容的类可以协同工作：

```java
// 目标接口（客户端期望的接口）
interface MediaPlayer {
    void play(String filename);
}

// 已有的类（接口不兼容）
class AdvancedMediaPlayer {
    public void playVlc(String filename) {
        System.out.println("播放 VLC 文件: " + filename);
    }

    public void playMp4(String filename) {
        System.out.println("播放 MP4 文件: " + filename);
    }
}

// 适配器：将 AdvancedMediaPlayer 适配为 MediaPlayer
class MediaAdapter implements MediaPlayer {
    private AdvancedMediaPlayer advancedPlayer;

    public MediaAdapter() {
        this.advancedPlayer = new AdvancedMediaPlayer();
    }

    @Override
    public void play(String filename) {
        if (filename.endsWith(".vlc")) {
            advancedPlayer.playVlc(filename);
        } else if (filename.endsWith(".mp4")) {
            advancedPlayer.playMp4(filename);
        }
    }
}

// 使用
MediaPlayer player = new MediaAdapter();
player.play("movie.mp4");  // 播放 MP4 文件: movie.mp4
```

### 6. 装饰器模式

动态地给对象添加额外的职责，比继承更灵活：

```java
// 组件接口
interface Coffee {
    String getDescription();
    double getCost();
}

// 基础组件
class SimpleCoffee implements Coffee {
    public String getDescription() { return "普通咖啡"; }
    public double getCost() { return 10.0; }
}

// 装饰器基类
abstract class CoffeeDecorator implements Coffee {
    protected Coffee coffee;

    public CoffeeDecorator(Coffee coffee) {
        this.coffee = coffee;
    }
}

// 具体装饰器
class MilkDecorator extends CoffeeDecorator {
    public MilkDecorator(Coffee coffee) { super(coffee); }
    public String getDescription() { return coffee.getDescription() + " + 牛奶"; }
    public double getCost() { return coffee.getCost() + 3.0; }
}

class SugarDecorator extends CoffeeDecorator {
    public SugarDecorator(Coffee coffee) { super(coffee); }
    public String getDescription() { return coffee.getDescription() + " + 糖"; }
    public double getCost() { return coffee.getCost() + 1.0; }
}

// 使用：可以自由组合装饰器
Coffee coffee = new SimpleCoffee();             // 普通咖啡, 10.0
coffee = new MilkDecorator(coffee);             // 普通咖啡 + 牛奶, 13.0
coffee = new SugarDecorator(coffee);            // 普通咖啡 + 牛奶 + 糖, 14.0
System.out.println(coffee.getDescription() + " = " + coffee.getCost());
```

### 7. 代理模式

为另一个对象提供替身或占位符，控制对原对象的访问：

```java
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

// 接口
interface UserService {
    User getUser(Long id);
}

// 实际实现
class UserServiceImpl implements UserService {
    public User getUser(Long id) {
        System.out.println("从数据库查询用户: " + id);
        return new User(id, "Alice");
    }
}

// JDK 动态代理：添加缓存功能
class CacheProxy implements InvocationHandler {
    private Object target;
    private Map<String, Object> cache = new HashMap<>();

    public CacheProxy(Object target) {
        this.target = target;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        String key = method.getName() + ":" + args[0];
        if (cache.containsKey(key)) {
            System.out.println("从缓存返回结果: " + key);
            return cache.get(key);
        }
        Object result = method.invoke(target, args);
        cache.put(key, result);
        return result;
    }
}

// 使用
UserService original = new UserServiceImpl();
UserService proxied = (UserService) Proxy.newProxyInstance(
    original.getClass().getClassLoader(),
    original.getClass().getInterfaces(),
    new CacheProxy(original)
);

proxied.getUser(1L);  // 从数据库查询用户: 1
proxied.getUser(1L);  // 从缓存返回结果: getUser:1
```

## 常见场景

### 场景一：Spring 中的设计模式

Spring 框架大量使用了设计模式：

- **工厂模式**：BeanFactory 和 ApplicationContext 创建 Bean
- **单例模式**：Spring Bean 默认是单例的
- **代理模式**：AOP 使用动态代理实现
- **模板方法**：JdbcTemplate、RestTemplate 等模板类
- **观察者模式**：ApplicationEvent 和 ApplicationListener
- **适配器模式**：HandlerAdapter 适配不同的 Controller

### 场景二：使用函数式接口简化策略模式

Java 8 的 Lambda 表达式可以简化很多设计模式的实现：

```java
import java.util.function.DoubleUnaryOperator;

// 用函数式接口代替策略接口
class Calculator {
    private DoubleUnaryOperator strategy;

    public Calculator(DoubleUnaryOperator strategy) {
        this.strategy = strategy;
    }

    public double calculate(double input) {
        return strategy.applyAsDouble(input);
    }
}

// 使用 Lambda 代替具体的策略类
Calculator square = new Calculator(x -> x * x);
Calculator cube = new Calculator(x -> x * x * x);

System.out.println(square.calculate(3));  // 9.0
System.out.println(cube.calculate(3));    // 27.0
```

## 注意事项与常见错误

### 不要为了用模式而用模式

设计模式是解决问题的工具，不是目标。如果一个简单的 if-else 就能解决问题，不需要引入策略模式。过度设计比没有设计更糟糕。

### 单例模式的陷阱

单例模式在测试中很难 mock，而且全局状态会导致隐式依赖。在 Spring 应用中，让 Spring 管理单例 Bean 比自己实现单例模式更好。

### 建造者模式与构造函数的选择

如果对象只有 2-3 个必填参数，直接用构造函数即可。只有当参数很多且大部分可选时，建造者模式才有价值。

### 代理模式的性能

动态代理（JDK Proxy、CGLIB）会带来微小的性能开销。在性能敏感的场景中，需要评估代理的影响。

## 进阶用法

### 事件总线（观察者模式的进阶）

在大型应用中，可以使用事件总线来解耦组件之间的通信：

```java
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.ConcurrentHashMap;

// 简单的事件总线实现
class EventBus {
    private Map<Class<?>, List<Object>> listeners = new ConcurrentHashMap<>();

    // 注册监听器
    public <T> void register(Class<T> eventType, Object listener) {
        listeners.computeIfAbsent(eventType, k -> new ArrayList<>()).add(listener);
    }

    // 发布事件
    @SuppressWarnings("unchecked")
    public <T> void publish(T event) {
        List<Object> handlers = listeners.get(event.getClass());
        if (handlers != null) {
            for (Object handler : handlers) {
                ((java.util.function.Consumer<T>) handler).accept(event);
            }
        }
    }
}

// 使用
EventBus bus = new EventBus();
bus.register(OrderCreatedEvent.class, (OrderCreatedEvent e) -> {
    System.out.println("处理订单: " + e.getOrderId());
});
bus.publish(new OrderCreatedEvent("1001"));
```

### 组合模式

将对象组合成树形结构，统一处理单个对象和组合对象：

```java
import java.util.ArrayList;
import java.util.List;

// 组件接口
interface FileSystemComponent {
    long getSize();
    void print(String indent);
}

// 叶子节点
class File implements FileSystemComponent {
    private String name;
    private long size;

    public File(String name, long size) {
        this.name = name;
        this.size = size;
    }

    public long getSize() { return size; }
    public void print(String indent) {
        System.out.println(indent + "- " + name + " (" + size + "KB)");
    }
}

// 组合节点
class Directory implements FileSystemComponent {
    private String name;
    private List<FileSystemComponent> children = new ArrayList<>();

    public Directory(String name) { this.name = name; }

    public void add(FileSystemComponent component) {
        children.add(component);
    }

    public long getSize() {
        return children.stream().mapToLong(FileSystemComponent::getSize).sum();
    }

    public void print(String indent) {
        System.out.println(indent + "+ " + name + "/");
        for (FileSystemComponent child : children) {
            child.print(indent + "  ");
        }
    }
}

// 使用
Directory root = new Directory("项目");
root.add(new File("pom.xml", 5));
Directory src = new Directory("src");
src.add(new File("Main.java", 3));
src.add(new File("Utils.java", 2));
root.add(src);
root.print("");  // 打印目录树
```
