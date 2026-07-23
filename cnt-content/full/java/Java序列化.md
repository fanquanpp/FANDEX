---
order: 58
title: Java序列化
module: java
category: Java
difficulty: intermediate
description: 序列化与反序列化
author: fanquanpp
updated: '2026-06-14'
related:
  - java/JVM垃圾回收
  - java/Java反射
  - java/JavaIO与NIO
  - java/Java新特性
prerequisites:
  - java/概述与开发环境
---

## 概述

序列化是将 Java 对象转换为字节流的过程，反序列化是将字节流恢复为 Java 对象的过程。序列化的核心用途是让对象可以脱离内存存在：存储到文件、通过网络传输、保存到数据库。当你需要把一个对象从一台机器发送到另一台机器，或者把对象持久化保存时，就需要序列化。

Java 原生提供了 Serializable 接口实现序列化，但这种方式存在很多问题（安全性差、无法跨语言、版本兼容困难），实际项目中更多使用 JSON、Protocol Buffers 等替代方案。理解序列化的原理和不同方案的优缺点，是选择合适方案的基础。

## 基础概念

### 什么是序列化

简单来说，序列化就是把对象变成可以存储或传输的格式。比如你有一个 User 对象，包含 name 和 age 两个字段，序列化后它可能变成一段 JSON 文本 {"name":"Alice","age":25}，或者一段二进制数据。反序列化就是反过来，把这段数据还原成 User 对象。

### 为什么需要序列化

- **网络传输**：微服务之间传递对象，需要把对象序列化后通过网络发送
- **持久化存储**：把对象保存到文件或数据库，下次启动时恢复
- **缓存**：把对象存入 Redis 等缓存系统，需要序列化后存储
- **跨语言通信**：不同语言编写的系统之间交换数据

### 序列化方案的选择标准

选择序列化方案时需要考虑：是否需要跨语言（Java 序列化只有 Java 能用）、序列化后的数据大小（影响网络传输和存储成本）、序列化和反序列化的速度、是否人类可读（JSON 可读，二进制格式不可读）、Schema 演化能力（字段增删时是否兼容）。

## 快速上手

### Java 原生序列化

最简单的序列化方式，只需实现 Serializable 接口：

```java
import java.io.*;

// 实现 Serializable 接口即可序列化
public class User implements Serializable {
    // 序列化版本号，用于版本兼容检查
    private static final long serialVersionUID = 1L;

    private String name;
    private int age;
    private transient String password;  // transient 关键字表示此字段不参与序列化

    public User(String name, int age, String password) {
        this.name = name;
        this.age = age;
        this.password = password;
    }

    // getter...
    public String getName() { return name; }
    public int getAge() { return age; }
    public String getPassword() { return password; }
}
```

序列化和反序列化操作：

```java
import java.io.*;

// 序列化：对象 -> 字节流
User user = new User("Alice", 25, "secret123");
try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("user.dat"))) {
    oos.writeObject(user);  // 将对象写入文件
}

// 反序列化：字节流 -> 对象
try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream("user.dat"))) {
    User restored = (User) ois.readObject();  // 从文件读取对象
    System.out.println(restored.getName());     // 输出: Alice
    System.out.println(restored.getPassword()); // 输出: null（transient 字段不序列化）
}
```

## 详细用法

### 1. serialVersionUID 的作用

serialVersionUID 用于标识类的版本。反序列化时，JVM 会比较字节流中的 serialVersionUID 和当前类的 serialVersionUID，如果不一致就抛出 InvalidClassException：

```java
public class User implements Serializable {
    // 如果不手动指定，JVM 会根据类结构自动生成
    // 但类结构变化（增删字段）后自动生成的值会改变，导致旧数据无法反序列化
    // 手动指定后，只要版本号不变，增删字段也能兼容
    private static final long serialVersionUID = 1L;

    private String name;
    private int age;
    // 新增字段：旧数据反序列化时，新字段为默认值（null 或 0）
    private String email;
}
```

建议始终手动指定 serialVersionUID，避免类结构变化导致的反序列化失败。

### 2. transient 关键字

transient 标记的字段不参与序列化，适合敏感数据或不需要持久化的数据：

```java
public class Session implements Serializable {
    private String sessionId;
    private transient String password;    // 密码不序列化
    private transient Thread worker;      // 线程对象无法序列化
    private transient Socket connection;  // 网络连接无法序列化
}
```

注意：transient 只能用于 Java 原生序列化。使用 JSON 序列化时，transient 不起作用，需要用 @JsonIgnore 等注解。

### 3. 自定义序列化逻辑

通过实现 writeObject 和 readObject 方法，可以自定义序列化和反序列化的行为：

```java
import java.io.*;

public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private String name;
    private transient String encryptedPassword;

    // 自定义序列化逻辑
    private void writeObject(ObjectOutputStream oos) throws IOException {
        oos.defaultWriteObject();  // 先执行默认序列化
        // 可以在这里添加额外的序列化逻辑
    }

    // 自定义反序列化逻辑
    private void readObject(ObjectInputStream ois) throws IOException, ClassNotFoundException {
        ois.defaultReadObject();  // 先执行默认反序列化
        // 可以在这里恢复 transient 字段的值
        // 例如：从其他来源重新获取密码
    }
}
```

### 4. 使用 Jackson 进行 JSON 序列化

Jackson 是 Java 生态中最流行的 JSON 序列化库，可读性好、跨语言、使用广泛：

```xml
<!-- Maven 依赖 -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.16.0</version>
</dependency>
```

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

public class User {
    private String name;
    private int age;

    @JsonIgnore  // JSON 序列化时忽略此字段
    private String password;

    @JsonProperty("user_email")  // JSON 中的字段名
    private String email;

    // Jackson 需要无参构造函数
    public User() {}

    public User(String name, int age, String email) {
        this.name = name;
        this.age = age;
        this.email = email;
    }

    // getter 和 setter...
}

// 序列化
ObjectMapper mapper = new ObjectMapper();
User user = new User("Alice", 25, "alice@example.com");
String json = mapper.writeValueAsString(user);
// {"name":"Alice","age":25,"user_email":"alice@example.com"}

// 反序列化
User restored = mapper.readValue(json, User.class);
```

### 5. Jackson 常用配置

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.text.SimpleDateFormat;

ObjectMapper mapper = new ObjectMapper();

// 格式化输出（开发调试时使用，生产环境关闭以减少数据量）
mapper.enable(SerializationFeature.INDENT_OUTPUT);

// 日期格式
mapper.registerModule(new JavaTimeModule());  // 支持 Java 8 日期类型
mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);  // 日期输出为字符串而非时间戳

// 忽略未知字段（反序列化时 JSON 中有 Java 类没有的字段，不报错）
mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

// 空对象不报错
mapper.configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
```

### 6. 使用 Gson 进行 JSON 序列化

Gson 是 Google 提供的 JSON 库，比 Jackson 更轻量：

```xml
<dependency>
    <groupId>com.google.code.gson</groupId>
    <artifactId>gson</artifactId>
    <version>2.10.1</version>
</dependency>
```

```java
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

Gson gson = new GsonBuilder()
    .setPrettyPrinting()       // 格式化输出
    .serializeNulls()          // 序列化 null 值（默认忽略）
    .setDateFormat("yyyy-MM-dd")  // 日期格式
    .create();

// 序列化
User user = new User("Alice", 25);
String json = gson.toJson(user);

// 反序列化
User restored = gson.fromJson(json, User.class);
```

### 7. 使用 Protocol Buffers

Protocol Buffers（Protobuf）是 Google 开发的高效二进制序列化格式，数据量小、速度快、支持跨语言：

```protobuf
// user.proto
syntax = "proto3";

message User {
    string name = 1;
    int32 age = 2;
    string email = 3;
}
```

编译 proto 文件生成 Java 类后使用：

```java
// 构建对象
UserProto.User user = UserProto.User.newBuilder()
    .setName("Alice")
    .setAge(25)
    .setEmail("alice@example.com")
    .build();

// 序列化为字节数组
byte[] bytes = user.toByteArray();

// 反序列化
UserProto.User restored = UserProto.User.parseFrom(bytes);
```

## 常见场景

### 场景一：API 响应序列化

Spring Boot 中 Controller 返回的对象自动序列化为 JSON：

```java
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)  // null 字段不输出
public class ApiResponse<T> {
    private int code;
    private String message;
    private T data;

    public static <T> ApiResponse<T> success(T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.code = 200;
        response.message = "success";
        response.data = data;
        return response;
    }
}
```

### 场景二：Redis 缓存序列化

存入 Redis 的对象需要序列化，通常使用 JSON 格式以便跨语言读取：

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;

@Service
public class CacheService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // 存储对象到 Redis
    public void put(String key, Object value) {
        try {
            String json = objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json);
        } catch (Exception e) {
            throw new RuntimeException("序列化失败", e);
        }
    }

    // 从 Redis 读取对象
    public <T> T get(String key, Class<T> type) {
        String json = redisTemplate.opsForValue().get(key);
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new RuntimeException("反序列化失败", e);
        }
    }
}
```

## 注意事项与常见错误

### Java 原生序列化的安全风险

Java 原生反序列化存在严重的安全漏洞。攻击者可以构造恶意的序列化数据，在反序列化时执行任意代码。永远不要反序列化不可信来源的数据。如果必须使用，可以使用 JEP 290 过滤机制限制可反序列化的类。

### 循环引用导致无限递归

对象之间存在双向引用时，JSON 序列化会陷入无限递归：

```java
public class User {
    private List<Order> orders;  // 用户有多个订单
}

public class Order {
    private User user;  // 订单属于某个用户（循环引用）
}

// 解决方案一：使用 @JsonIgnore 忽略反向引用
public class Order {
    @JsonIgnore
    private User user;
}

// 解决方案二：使用 @JsonManagedReference 和 @JsonBackReference
public class User {
    @JsonManagedReference
    private List<Order> orders;
}

public class Order {
    @JsonBackReference
    private User user;
}
```

### 日期格式问题

不同序列化方式对日期的处理不同。Java 原生序列化保存的是时间戳，JSON 序列化默认输出时间戳数字。建议统一使用 ISO 8601 格式（如 2024-01-15T10:30:00Z）。

### 枚举类型的序列化

默认情况下枚举按名称序列化。如果按序号序列化，新增枚举值可能导致反序列化错位：

```java
// 错误：按序号序列化，新增值会打乱顺序
public enum Status {
    ACTIVE,    // 0
    INACTIVE,  // 1
    // 新增 PENDING 后，原来存为 1 的 INACTIVE 会变成 PENDING
    PENDING    // 2
}

// 正确：始终按名称序列化
@JsonFormat(shape = JsonFormat.Shape.STRING)
public enum Status {
    ACTIVE, INACTIVE, PENDING
}
```

## 进阶用法

### Kryo 高性能序列化

Kryo 是一个高性能的 Java 序列化框架，速度比 Java 原生序列化快 10 倍以上，序列化后的数据也更小：

```java
import com.esotericsoftware.kryo.Kryo;
import com.esotericsoftware.kryo.io.Output;
import com.esotericsoftware.kryo.io.Input;

Kryo kryo = new Kryo();
kryo.register(User.class);  // 注册类，提高性能

// 序列化
Output output = new Output(new ByteArrayOutputStream());
kryo.writeObject(output, user);
output.close();

// 反序列化
Input input = new Input(new ByteArrayInputStream(output.getBuffer()));
User restored = kryo.readObject(input, User.class);
```

### Avro Schema 演化

Avro 支持 Schema 演化，可以在不破坏兼容性的情况下增删字段。适合需要长期存储和版本迭代的数据格式：

```json
{
  "type": "record",
  "name": "User",
  "fields": [
    { "name": "name", "type": "string" },
    { "name": "age", "type": ["null", "int"], "default": null }
  ]
}
```

新增字段时提供默认值，旧数据反序列化时新字段使用默认值，不会报错。
