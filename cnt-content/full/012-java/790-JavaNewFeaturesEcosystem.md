---
order: 790
title: Java 新特性与生态
module: 'java'
category: 后端技术
difficulty: advanced
description: Java 21-26 新特性、模块系统、Spring Boot 3.x/4.0、构建工具与 GraalVM 原生镜像。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/470-JavaModuleSystem'
  - 'java/720-JavaDatabaseConnection'
  - 'java/110-ArrayDetailed'
  - 'java/620-JVMtuning'
prerequisites:
  - 'java/020-JavaOverviewDevEnv'
---

## 前置知识

- [Java 新特性](/java/780-JavaNewFeatures)：建议先完成前一篇的学习

## 学习目标

- 掌握「0. 本节阅读指引（先读这一节）」的核心机制、典型用法与常见陷阱
- 掌握「1. Java 21-26 新特性概览」的核心机制、典型用法与常见陷阱
- 掌握「2. Java 模块系统（JPMS）」的核心机制、典型用法与常见陷阱
- 掌握「3. Spring Boot 3.x 核心」的核心机制、典型用法与常见陷阱
- 掌握「4. 构建工具」的核心机制、典型用法与常见陷阱


## 0. 本节阅读指引（先读这一节）

本篇是「Java 新特性与生态」进阶综述。

第一遍只读：1. Java 21-26 新特性概览与 7. 小结；2-6 节（模块系统、Spring Boot、构建工具、JPackage、GraalVM）各有对应专篇，按需跳转。

可跳过：与本模块后续专篇重复的细节。

前置：045 Java 新特性。



## 1. Java 21-26 新特性概览

Java 自从切换到六个月发布周期后，每个 LTS 版本都带来了重要的语言和运行时改进。当前最新的 LTS 是 Java 25（2025-09），Java 22-24 与 Java 26（2026-03）在其间持续引入并巩固特性。

| 版本    | 发布时间 | LTS | 关键特性                                                      |
| :------ | :------- | :-- | :------------------------------------------------------------ |
| Java 21 | 2023-09  | 是  | Virtual Threads、Record Patterns、Pattern Matching for switch |
| Java 22 | 2024-03  | 否  | Unnamed Variables & Patterns、FFM 正式（JEP 454）、Stream Gatherers（预览） |
| Java 23 | 2024-09  | 否  | Primitive Types in Patterns（预览）、Module Import Declarations（预览）、分代 ZGC 默认 |
| Java 24 | 2025-03  | 否  | Stream Gatherers（正式，JEP 485）、Compact Object Headers（实验）、移除 ZGC 非分代模式 |
| Java 25 | 2025-09  | 是  | Scoped Values（正式，JEP 506）、灵活构造器主体（JEP 513）、模块导入声明（JEP 511）、紧凑源文件与实例 main（JEP 512）、紧凑对象头（JEP 519） |
| Java 26 | 2026-03  | 否  | HTTP/3 客户端（JEP 517）、AOT 对象缓存（JEP 516）、移除 Applet（JEP 504）、结构化并发第 6 次预览（JEP 525）、Lazy Constants 第 2 次预览（JEP 526） |

### 1.1 Virtual Threads（虚拟线程）

虚拟线程是 Project Loom 的核心成果，在 Java 21 中正式发布。它是一种轻量级线程，由 JVM 而非操作系统管理，使得创建百万级线程成为可能。

```java
// 传统平台线程 —— 每个线程占用约 1MB 栈空间
try (var executor = Executors.newFixedThreadPool(200)) {
    IntStream.range(0, 10_000).forEach(i -> {
        executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1));
            return i;
        });
    });
} // 200 个线程处理 10000 个任务，需要排队

// 虚拟线程 —— 几乎无限制的并发
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 1_000_000).forEach(i -> {
        executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1));
            return i;
        });
    });
} // 百万级虚拟线程同时运行
```

**关键注意事项：**

- 避免在虚拟线程中使用 `synchronized`，应改用 `ReentrantLock`（即"固定"问题）
- 虚拟线程适用于 I/O 密集型任务，不适用于 CPU 密集型计算
- 使用 `Thread.ofVirtual().name("my-vthread").start(runnable)` 自定义虚拟线程

```java
// 使用 ReentrantLock 替代 synchronized
private final ReentrantLock lock = new ReentrantLock();

public void safeMethod() {
    lock.lock();
    try {
        // 临界区逻辑
    } finally {
        lock.unlock();
    }
}
```

### 1.2 Record Patterns（记录模式）

Record Patterns 在 Java 21 正式发布，允许在 `instanceof` 和 `switch` 中解构记录类：

```java
record Point(int x, int y) {}
record Rectangle(Point upperLeft, Point lowerRight) {}

// instanceof 解构
if (obj instanceof Point(int x, int y)) {
    System.out.println("x = " + x + ", y = " + y);
}

// 嵌套解构
if (obj instanceof Rectangle(Point(int x1, int y1), Point(int x2, int y2))) {
    System.out.printf("矩形: (%d,%d) -> (%d,%d)%n", x1, y1, x2, y2);
}

// switch 中使用 Record Patterns
static String describeShape(Object shape) {
    return switch (shape) {
        case Point(int x, int y) when x == y -> "对角线上的点";
        case Point(int x, int y) -> "普通点 (%d, %d)".formatted(x, y);
        case Rectangle(Point ul, Point lr) -> "矩形";
        default -> "未知形状";
    };
}
```

### 1.3 Pattern Matching for switch

Java 21 正式发布了 switch 的模式匹配，结合 Record Patterns 和 Guarded Patterns 提供了强大的模式匹配能力：

```java
static String formatObject(Object obj) {
    return switch (obj) {
        case Integer i when i > 0  -> "正整数: %d".formatted(i);
        case Integer i             -> "非正整数: %d".formatted(i);
        case String s              -> "字符串(长度%d): %s".formatted(s.length(), s);
        case int[] arr             -> "int数组(长度%d)".formatted(arr.length);
        case null                  -> "null 值";
        default                    -> "其他类型: " + obj.getClass().getSimpleName();
    };
}
```

### 1.4 Sequenced Collections

Java 21 引入了 `SequencedCollection`、`SequencedSet` 和 `SequencedMap` 接口，统一了有序集合的访问方式：

```java
// 之前：不同集合获取首尾元素的方式不同
list.get(0);                // List
list.get(list.size() - 1);
deque.getFirst();           // Deque
deque.getLast();
sortedSet.first();          // SortedSet
sortedSet.last();

// 现在：统一接口
sequencedCollection.getFirst();
sequencedCollection.getLast();
sequencedCollection.reversed(); // 返回逆序视图

// SequencedMap
sequencedMap.firstEntry();
sequencedMap.lastEntry();
sequencedMap.reversed();
sequencedMap.sequencedEntrySet();
sequencedMap.sequencedValues();
```

### 1.5 String Templates（预览后已撤回）

Java 21 引入了字符串模板的预览特性。需要特别注意：由于设计争议（模板表达式的求值语义、与现有 API 的整合方式等），字符串模板在 JDK 23 的第二次预览后被**整体撤回**，JDK 24 起任何版本都不再包含该特性，官方正在重新设计中。

```java
// 以下代码仅作历史了解，在现行任何 JDK 上都无法编译：
String message = STR."欢迎 \{name}，你的余额为 \{balance} 元";

// 当前的生产替代方案：
String message2 = "欢迎 %s，你的余额为 %s 元".formatted(name, balance);
String message3 = String.format("欢迎 %s，你的余额为 %s 元", name, balance);
```

### 1.6 Unnamed Patterns & Variables

Java 22 正式引入了未命名模式和变量：

```java
// 未命名变量 —— 不需要的返回值
try {
    int result = riskyOperation();
} catch (Exception _) {  // 不需要异常对象
    log.error("操作失败");
}

// 未命名模式 —— 忽略 Record 中的某些组件
if (obj instanceof Point(int x, _)) {
    System.out.println("x = " + x); // 只关心 x
}

// switch 中的未命名模式
switch (shape) {
    case Rectangle(Point(int x, _), _) -> "矩形宽度: " + x;
    case Circle(_) -> "圆形";
}
```

### 1.7 JDK 25 转正的语言特性速览

JDK 25（LTS）一次性转正了四项来自 Amber 项目的语言特性，它们共同的目标是
降低初学者的入门门槛、减少样板代码：

```java
// 1) 模块导入声明（JEP 511）：一次导入整个模块的所有导出包
import module java.base;          // 等价于按需导入 java.util.*、java.io.*、java.math.* 等

// 2) 紧凑源文件与实例 main（JEP 512）：无 class 声明、无 static、无 String[] 参数
//    以下就是一个完整可运行的程序（假定文件名 Hello.java，JDK 25+）：
//    void main() {
//        System.out.println("Hello, Java 25!");
//    }
//    配合 java Hello.java 直接单文件运行，教学与脚本场景大幅简化

// 3) 灵活构造器主体（JEP 513）：super(...) 之前允许执行语句，
//    可以先校验参数再调用父类构造器
class SaveUser extends User {
    SaveUser(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name 不能为空"); // 早期校验
        }
        super(name); // 显式调用父类构造器可以不再是一行代码的首句
    }
}

// 4) 作用域值（JEP 506）：ThreadLocal 的现代替代，见 048 示例 6
```

注意：结构化并发（JEP 525）截至 JDK 26 仍是第 6 次预览，尚未随这批特性转正，
生产代码不应依赖。

## 2. Java 模块系统（JPMS）

Java 9 引入的模块系统（Project Jigsaw）在 Java 21+ 中已成为成熟特性。模块系统通过 `module-info.java` 显式声明依赖和导出，解决了 classpath 的脆弱性问题。

### 2.1 模块定义

```java
// src/com.example.app/module-info.java
module com.example.app {
    requires com.example.service;      // 声明依赖
    requires transitive com.example.util; // 传递依赖
    exports com.example.app.api;       // 导出包
    exports com.example.app.spi to com.example.impl; // 限定导出
    opens com.example.app.model to com.fasterxml.jackson.databind; // 反射访问
    uses com.example.service.Processor; // 声明服务消费
    provides com.example.service.Processor  // 声明服务提供
        with com.example.app.DefaultProcessor;
}
```

### 2.2 模块路径 vs 类路径

| 特性     | Classpath              | Module Path             |
| :------- | :--------------------- | :---------------------- |
| 可靠性   | 脆弱，容易冲突         | 可靠，显式声明依赖      |
| 封装性   | 所有 public 类都可访问 | 只有 exports 的包可访问 |
| 启动速度 | 较慢，需扫描所有 JAR   | 较快，按需加载模块      |
| 反射访问 | 无限制                 | 需要 opens 声明         |

### 2.3 实际迁移策略

```bash
# 使用 jdeps 分析依赖
jdeps --module-path mods -s myapp.jar

# 使用 jlink 创建自定义运行时
jlink --module-path mods \
      --add-modules com.example.app \
      --output custom-runtime \
      --strip-debug \
      --compress zip-6 \
      --no-header-files \
      --no-man-pages
```

## 3. Spring Boot 3.x 核心

Spring Boot 3.x 基于 Spring Framework 6，要求 Java 17+，全面拥抱 Jakarta EE 10 规范。

> 版本时间线（2026-09）：Spring Boot 4.0 / Spring Framework 7 已于 2025-11 GA，
> 基线仍为 Java 17+（推荐 Java 21+，Jakarta EE 11）。本节以 Boot 3.x 为教学内容，
> 其自动配置、Actuator、Security 组件化等核心概念在 4.0 中保持延续；
> 新项目可直接选择 Boot 4.x，但注意部分 API 与依赖坐标已随大版本升级调整。

### 3.1 自动配置原理

Spring Boot 的自动配置基于 `@Conditional` 系列注解和 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 文件：

```java
// 自定义自动配置类
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
@ConditionalOnMissingBean(DataSource.class)
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {

    @Bean
    @ConfigurationProperties(prefix = "spring.datasource")
    public DataSource dataSource(DataSourceProperties props) {
        return DataSourceBuilder.create()
            .url(props.getUrl())
            .username(props.getUsername())
            .password(props.getPassword())
            .build();
    }
}
```

```properties
# META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
com.example.config.DataSourceAutoConfiguration
```

### 3.2 Spring Boot Actuator

Actuator 提供生产级别的监控和管理端点：

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,env,beans
  endpoint:
    health:
      show-details: when-authorized
  metrics:
    export:
      prometheus:
        enabled: true
  info:
    env:
      enabled: true
    java:
      enabled: true
    os:
      enabled: true
```

```java
// 自定义 Health Indicator
@Component
public class DatabaseHealthIndicator extends AbstractHealthIndicator {

    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    protected void doHealthCheck(Health.Builder builder) throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            if (conn.isValid(1)) {
                builder.up().withDetail("database", "PostgreSQL")
                        .withDetail("validationQuery", "isValid()");
            }
        }
    }
}
```

### 3.3 Spring Security 6.x

Spring Security 6 全面采用组件化配置，废弃了 `WebSecurityConfigurerAdapter`：

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            );
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            List<String> roles = jwt.getClaimAsStringList("roles");
            return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toList());
        });
        return converter;
    }
}
```

## 4. 构建工具

### 4.1 Gradle 现代 Java 项目

Gradle 使用 Kotlin DSL 已成为主流选择：

```kotlin
// build.gradle.kts
plugins {
    java
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.5"
}

group = "com.example"
version = "1.0.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.test {
    useJUnitPlatform()
    jvmArgs = listOf("--enable-preview")  // 启用预览特性
}

// GraalVM 原生镜像插件
plugins {
    id("org.graalvm.buildtools.native") version "0.10.2"
}
```

### 4.2 Maven Central 发布

发布到 Maven Central 需要 Sonatype 账号和 GPG 签名：

```kotlin
// build.gradle.kts — 发布配置
publishing {
    publications {
        create<MavenPublication>("mavenJava") {
            from(components["java"])
            pom {
                name.set("My Library")
                description.set("A useful library")
                url.set("https://github.com/example/my-lib")
                licenses {
                    license {
                        name.set("Apache-2.0")
                        url.set("https://opensource.org/licenses/Apache-2.0")
                    }
                }
                developers {
                    developer {
                        id.set("fanquanpp")
                        name.set("Fan Quan")
                    }
                }
                scm {
                    url.set("https://github.com/example/my-lib")
                }
            }
        }
    }
}

signing {
    sign(publishing.publications["mavenJava"])
}
```

## 5. JPackage 打包

`jpackage` 工具可以将 Java 应用打包为平台原生安装包：

```bash
# 打包为 Windows 安装程序
jpackage \
  --name MyApp \
  --input target/libs \
  --main-jar myapp.jar \
  --main-class com.example.Main \
  --type msi \
  --app-version 1.0.0 \
  --vendor "Example Corp" \
  --win-dir-chooser \
  --win-menu \
  --win-shortcut \
  --java-options "--enable-preview"

# 打包为 macOS dmg
jpackage \
  --name MyApp \
  --input target/libs \
  --main-jar myapp.jar \
  --main-class com.example.Main \
  --type dmg \
  --app-version 1.0.0 \
  --vendor "Example Corp" \
  --mac-package-identifier com.example.myapp

# 打包为 Linux deb
jpackage \
  --name myapp \
  --input target/libs \
  --main-jar myapp.jar \
  --main-class com.example.Main \
  --type deb \
  --app-version 1.0.0 \
  --vendor "Example Corp"
```

结合 jlink 可以创建不含完整 JRE 的轻量安装包：

```bash
# 先用 jlink 创建自定义运行时
jlink --module-path target/modules \
      --add-modules com.example.app \
      --output target/custom-jre \
      --strip-debug --compress zip-6 \
      --no-header-files --no-man-pages

# 再用 jpackage 基于自定义运行时打包
jpackage \
  --name MyApp \
  --runtime-image target/custom-jre \
  --input target/libs \
  --main-jar myapp.jar \
  --main-class com.example.Main \
  --type app-image
```

## 6. GraalVM 原生镜像

GraalVM 的 Native Image 技术可以将 Java 应用编译为独立的原生可执行文件，显著提升启动速度和降低内存占用。

### 6.1 基本使用

```bash
# 安装 GraalVM（GraalVM for JDK 21+ 已内置 native-image，无需单独安装）
sdk install java 21.0.2-graal
sdk use java 21.0.2-graal

# 验证 native-image 可用（旧版GraalVM 用 gu install 安装的方式已废弃，
# GraalVM for JDK 21 起移除了 GraalVM Updater（gu），组件随发行版直接附带）
native-image --version

# 编译原生镜像
native-image -jar myapp.jar myapp

# 带优化的编译
native-image \
  --initialize-at-build-time \
  --no-fallback \
  -H:+ReportExceptionStackTraces \
  -H:Name=myapp \
  -jar myapp.jar
```

### 6.2 Spring Boot 原生镜像

Spring Boot 3.x 对 GraalVM 原生镜像提供了一等支持：

```bash
# 使用 Spring Boot Maven 插件
mvn -Pnative native:compile

# 使用 Spring Boot Gradle 插件
gradle nativeCompile

# 使用 buildpacks（无需本地安装 GraalVM）
mvn -Pnative spring-boot:build-image
```

```java
// Runtime Hints —— 为反射、代理等提供元数据
@Configuration
@ImportRuntimeHints(MyHints.class)
public class NativeConfig {}

class MyHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        hints.reflection()
            .registerType(MyModel.class, MemberCategory.INVOKE_PUBLIC_METHODS)
            .registerType(MyModel.class, MemberCategory.DECLARED_FIELDS);

        hints.resources()
            .registerPattern("com/example/templates/*");

        hints.serialization()
            .registerType(MySerializable.class);

        hints.proxies()
            .registerJdkProxy(MyInterface.class);
    }
}
```

### 6.3 性能对比

| 指标         | 传统 JVM           | GraalVM Native Image |
| :----------- | :----------------- | :------------------- |
| 启动时间     | 1-3 秒             | 10-50 毫秒           |
| 首次请求延迟 | 较高（JIT 预热）   | 立即响应             |
| 内存占用     | 200-500 MB         | 30-80 MB             |
| 峰值吞吐量   | 更高（JIT 优化后） | 较低（AOT 限制）     |
| 生态兼容性   | 完全兼容           | 部分反射需配置       |

**适用场景：** 容器化微服务、Serverless 函数、CLI 工具、需要快速启动的云原生应用。

**不适用场景：** 长时间运行的重计算服务（JIT 的峰值性能更优）、重度依赖反射和动态代理的遗留应用。

## 7. 小结

Java 21+ 的新特性正在从根本上改变 Java 的编程范式：

- **Virtual Threads** 让 Java 回归"一请求一线程"的简单模型
- **Pattern Matching** 让条件逻辑更加声明式和安全
- **Record Classes + Sealed Classes** 构建了代数数据类型的基础
- **JPMS** 提供了强封装和可靠的依赖管理
- **GraalVM Native Image** 让 Java 在云原生场景中更具竞争力
- **Spring Boot 3.x** 全面拥抱现代 Java 特性，提供一流的开发体验

这些特性组合在一起，使得 Java 在保持向后兼容的同时，不断进化以适应现代软件开发的需求。
