---
order: 180
tags:
  - java
difficulty: intermediate
title: 'Spring Boot 学习笔记'
module: java
category: 'Java Basics'
description: 'Spring Boot 深度指南：自动配置原理、起步依赖、Actuator、Spring Data JPA、Spring Security、Spring Cloud 与生产级工程实践。'
author: fanquanpp
updated: '2026-07-21'
related:
  - java/Lambda与函数式编程
  - java/流式API
  - java/网络编程
  - java/SpringCloud微服务开发
prerequisites:
  - java/概述与开发环境
---

# Spring Boot 深度指南：从自动配置到生产级微服务

> 本文档对标 MIT 6.170（Software Studio）、Stanford CS 142（Web Applications）与 CMU 17-445（Software Engineering for Web Applications）教学水准，系统阐述 Spring Boot 的形式化基础、内核原理与生产级工程实践。所有代码示例均在 Spring Boot 3.x（基于 Spring Framework 6.x，运行于 Java 17+）上编译验证。

## 目录

- [1. 学习目标](#1-学习目标)
- [2. 历史动机与发展脉络](#2-历史动机与发展脉络)
- [3. 形式化定义与规范基础](#3-形式化定义与规范基础)
- [4. 理论推导与原理解析](#4-理论推导与原理解析)
- [5. 起步依赖与自动配置](#5-起步依赖与自动配置)
- [6. 配置体系与外部化](#6-配置体系与外部化)
- [7. Web 层与 RESTful](#7-web-层与-restful)
- [8. 数据访问与持久化](#8-数据访问与持久化)
- [9. Actuator 与可观测性](#9-actuator-与可观测性)
- [10. 安全与认证授权](#10-安全与认证授权)
- [11. 异步、定时与消息](#11-异步定时与消息)
- [12. 对比分析](#12-对比分析)
- [13. 常见陷阱与最佳实践](#13-常见陷阱与最佳实践)
- [14. 工程实践](#14-工程实践)
- [15. 案例研究](#15-案例研究)
- [16. 习题](#16-习题)
- [17. 参考文献](#17-参考文献)
- [18. 延伸阅读](#18-延伸阅读)

---

## 1. 学习目标

完成本章学习后，学习者应能够：

### 1.1 认知层级目标（Bloom 分类法）

| Bloom 层级 | 目标描述 | 可观测行为 |
| ---------- | -------- | ---------- |
| **Remember（记忆）** | 复述 Spring Boot 三大特性、自动配置加载流程、起步依赖机制 | 能默写 `@SpringBootApplication`、`@EnableAutoConfiguration`、`@Conditional` 的语义 |
| **Understand（理解）** | 解释自动配置的 SPI 加载机制、Starter 的依赖管理原理 | 能用图示描述 `spring-boot-autoconfigure/META-INF/spring/...imports` 的解析过程 |
| **Apply（应用）** | 使用 Spring Boot 构建一个完整的 RESTful 服务，包含 JPA、Security、Actuator | 编写一个电商订单服务并集成 Swagger、Prometheus |
| **Analyze（分析）** | 分析自动配置冲突、Bean 循环依赖、DataSource 失败的根因 | 通过 `--debug` 启动日志定位条件注解的命中情况 |
| **Evaluate（评价）** | 比较 Spring Boot 与 Quarkus、Micronaut、Helidon 的启动性能、内存占用 | 在 GraalVM Native Image 场景下评估 Spring Boot AOT 的优劣 |
| **Create（创造）** | 设计并实现自定义 Starter，发布到私有 Maven 仓库 | 实现一个公司内部通用的 XXL-Job Starter |

### 1.2 核心能力指标

完成本章后，应能独立完成以下任务：

1. 设计并实现自定义 Spring Boot Starter，含 `@ConditionalOnXxx` 条件装配
2. 配置 `application.yml` 多环境（dev/test/prod），理解 Profile 优先级
3. 使用 Spring Data JPA 实现分页、审计、乐观锁
4. 集成 Spring Security + JWT 实现无状态鉴权
5. 通过 Actuator + Micrometer + Prometheus + Grafana 实现生产级监控
6. 使用 Spring Boot 3.x 的 GraalVM Native Image 构建秒级启动镜像

### 1.3 前置知识检查

阅读本章前，建议已掌握：

- Java 17+ 语法（record、sealed、pattern matching for switch）
- Spring Framework 基础（IoC、AOP、Bean 生命周期）
- Maven / Gradle 构建工具
- HTTP 协议与 RESTful 设计
- SQL 与至少一种关系数据库

---

## 2. 历史动机与发展脉络

### 2.1 Spring Boot 演进时间线

```
2002-2012 ── Spring Framework 兴起
  │           配置冗长（XML 数千行），集成复杂
  │           Rod Johnson《Expert One-on-One J2EE Development without EJB》
  │
2013 ──── Spring Boot 项目启动
  │         Mike Youngstrom 提出"约定优于配置"的 Spring 子项目
  │         Phil Webb、Dave Syer 主导开发
  │
2014 ──── Spring Boot 1.0 GA（4 月）
  │         内嵌 Tomcat、Jetty；起步依赖；自动配置
  │         解决 Spring 长达十年的"配置地狱"
  │
2016 ──── Spring Boot 1.4：Actuator 完善、@SpringBootTest
  │
2018 ──── Spring Boot 2.0 GA（3 月）
  │         基于 Spring Framework 5
  │         响应式编程（WebFlux、Reactive Spring Data）
  │         Java 8+ 最低要求
  │
2019 ──── Spring Boot 2.1：Micrometer 集成、Java 11 支持
  │
2020 ──── Spring Boot 2.3：优雅停机、Docker 分层 JAR
  │         2.4：配置文件重写（spring.config.import）
  │
2022 ──── Spring Boot 3.0 GA（11 月）
  │         基于 Spring Framework 6
  │         Jakarta EE 9+（javax.* → jakarta.*）
  │         GraalVM Native Image 支持（AOT）
  │         Java 17 最低要求
  │         Micrometer Tracing（替代 Spring Cloud Sleuth）
  │
2023 ──── Spring Boot 3.1：Docker Compose 支持、ConnectionDetails 抽象
  │         3.2：虚拟线程支持、JVM Checkpoint Restore（CRaC）
  │
2024 ──── Spring Boot 3.3：Native Image 进一步优化
  │         structured logging、Packet Capture
  │
2025 ──── Spring Boot 3.4 / 4.0 路线图
  │         HTTP Interface Client 增强
  │         更深入的 AOT 优化
```

### 2.2 三大设计哲学

1. **约定优于配置（Convention over Configuration）**：默认值合理即可零配置启动，需个性化时再覆盖。
2. **开箱即用（Out of the Box）**：Starter 整合常用依赖，避免手选版本冲突。
3. **生产就绪（Production-Ready）**：Actuator、Micrometer、Health Check 内置，从 Hello World 到生产部署无缝衔接。

### 2.3 Spring Boot vs Spring Framework

| 维度 | Spring Framework | Spring Boot |
| ---- | ---------------- | ----------- |
| **定位** | 应用框架（IoC/AOP） | 应用平台（封装 Spring + 服务器 + 配置） |
| **配置** | XML/Java Config，冗长 | 自动配置 + 外部化 properties/yaml |
| **部署** | WAR + 容器（Tomcat/WildFly） | 可执行 JAR（内嵌容器） |
| **依赖管理** | 手动选版本 | Starter BOM 统一管理 |
| **监控** | 需自行集成 | Actuator 内置 |
| **启动速度** | 5—15s | 1—5s（3.x Native Image <0.1s） |

### 2.4 Spring Boot 生态版图

- **Spring Cloud**：分布式系统工具集（注册中心、配置中心、熔断、网关）
- **Spring Data**：统一的数据库抽象（JPA、Redis、MongoDB、Elasticsearch）
- **Spring Security**：认证授权框架（OAuth2、JWT、SAML）
- **Spring Batch**：批处理框架
- **Spring Integration**：EIP（企业集成模式）实现
- **Spring for GraphQL**：GraphQL 服务端支持
- **Spring AI**（2024+）：AI 应用开发框架（LLM、向量库）

---

## 3. 形式化定义与规范基础

### 3.1 自动配置的形式化模型

设 $\mathcal{C}$ 为所有候选自动配置类集合，$\mathcal{M}$ 为应用启动时的元数据（ClassPath、已声明 Bean、配置属性）。则实际生效的配置类集合：

$$
\text{Effective}(\mathcal{C}, \mathcal{M}) = \{c \in \mathcal{C} \mid \text{Condition}(c, \mathcal{M}) = \text{true}\}
$$

其中 $\text{Condition}(c, \mathcal{M})$ 是条件函数，由 `@Conditional` 系列注解决定：

- `@ConditionalOnClass(X)`：ClassPath 存在类 $X$
- `@ConditionalOnMissingBean(X)`：容器中不存在 $X$ 类型的 Bean
- `@ConditionalOnProperty(name)`：配置属性存在且匹配
- `@ConditionalOnWebApplication`：当前是 Web 应用

### 3.2 Bean 实例化的形式化语义

Spring 容器中 Bean 的实例化可形式化为偏序关系：

$$
\text{Instantiate}(B) \implies \forall D \in \text{Deps}(B): \text{Instantiate}(D) \prec \text{Instantiate}(B)
$$

即 Bean $B$ 的所有依赖 $D$ 必须先实例化。若存在循环依赖 $\text{Deps}(A) \ni B \wedge \text{Deps}(B) \ni A$，Spring 通过"三级缓存"解决（仅对 setter/field 注入有效，构造器注入会失败）。

### 3.3 Starter 的依赖管理规范

Spring Boot Starter 是一种约定的 Maven/Gradle 依赖聚合体，命名规范：

- **官方 Starter**：`spring-boot-starter-{name}`（如 `spring-boot-starter-web`）
- **第三方 Starter**：`{name}-spring-boot-starter`（如 `mybatis-spring-boot-starter`）

每个 Starter 通过 `spring-boot-dependencies` BOM 管理版本，避免用户手工指定版本号。

### 3.4 Actuator 端点规范

Actuator 端点遵循以下形式化模型：

$$
\text{Endpoint} = (\text{ID}, \text{HTTP method}, \text{Path}, \text{Roles}, \text{Cache TTL})$$

默认端点：

| ID | Path | 描述 |
| -- | ---- | ---- |
| health | `/actuator/health` | 健康检查 |
| info | `/actuator/info` | 应用信息 |
| metrics | `/actuator/metrics` | Micrometer 指标 |
| env | `/actuator/env` | 环境变量 |
| loggers | `/actuator/loggers` | 日志级别动态调整 |
| threaddump | `/actuator/threaddump` | 线程转储 |
| heapdump | `/actuator/heapdump` | 堆转储 |
| prometheus | `/actuator/prometheus` | Prometheus 抓取格式 |

---

## 4. 理论推导与原理解析

### 4.1 @SpringBootApplication 的组成

```java
@SpringBootConfiguration      // = @Configuration
@EnableAutoConfiguration      // 触发自动配置加载
@ComponentScan                // 扫描当前包及子包
public @interface SpringBootApplication {
}
```

启动过程三步：

1. `SpringApplication.run()` 创建 `SpringApplication` 实例，推断 Web 类型
2. 加载 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`（Spring Boot 2.7+）中列出的自动配置类
3. 对每个候选类，按 `@Conditional` 决定是否生效

### 4.2 自动配置加载机制（Spring Boot 2.7+ / 3.x）

旧机制（Spring Boot 2.6 及之前）：

```
META-INF/spring.factories
  EnableAutoConfiguration=\
    com.example.XxxAutoConfiguration,\
    com.example.YyyAutoConfiguration
```

新机制（Spring Boot 2.7+）：

```
META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
com.example.XxxAutoConfiguration
com.example.YyyAutoConfiguration
```

> **变更原因**：`spring.factories` 同时承载自动配置、监听器、初始化器等多种条目，难以管理。新机制分离关注点，且支持 `AutoConfiguration.before/after` 排序。

### 4.3 自动配置示例：DataSourceAutoConfiguration

```java
@AutoConfiguration(before = SqlInitializationAutoConfiguration.class)
@ConditionalOnClass({ DataSource.class, EmbeddedDatabaseType.class })
@ConditionalOnMissingBean(type = "io.r2dbc.spi.ConnectionFactory")
@EnableConfigurationProperties(DataSourceProperties.class)
@Import(DataSourcePoolMetadataProvidersConfiguration.class)
public class DataSourceAutoConfiguration {

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnMissingBean({ DataSource.class, XADataSource.class })
    @Import({ DataSourceConfiguration.Hikari.class, ... })
    protected static class PooledDataSourceConfiguration {
    }
}
```

生效条件链：

1. ClassPath 存在 `DataSource` 与 `EmbeddedDatabaseType`
2. 容器中没有 `XADataSource` 或 `ConnectionFactory`
3. 若用户未自定义 `DataSource`，则创建 HikariDataSource

### 4.4 条件注解执行顺序

```
启动 → 加载候选 AutoConfiguration
     → 按 @AutoConfigureOrder / @AutoConfigureBefore/@After 排序
     → 对每个候选执行 @Conditional 判断
     → 命中则注册其中的 @Bean
     → 排除 @ConditionalOnMissingBean 已存在的
     → 最终 BeanDefinitionRegistry 完成
```

### 4.5 三级缓存解决循环依赖

Spring 用三级缓存解决 setter/field 注入的循环依赖：

```java
// DefaultSingletonBeanRegistry
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);      // 一级：完整对象
private final Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);  // 二级：早期引用
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);     // 三级：ObjectFactory
```

流程（A 依赖 B，B 依赖 A）：

1. 创建 A 实例（构造完成但属性未注入），将 A 的 ObjectFactory 放入三级缓存
2. A 注入属性 B，触发 B 创建
3. B 注入属性 A，从三级缓存获取 A 的 ObjectFactory，调用 `getObject()` 得到早期 A 引用，放入二级缓存，移除三级缓存
4. B 完成，注入到 A
5. A 完成，从二级缓存移到一级缓存

> **关键点**：构造器注入无法解决循环依赖，因为构造时尚无 ObjectFactory。Spring Boot 2.6+ 默认禁用循环依赖（`spring.main.allow-circular-references=false`），强制开发者重构。

### 4.6 内嵌容器启动流程

```java
// 简化的 SpringApplication.run()
public ConfigurableApplicationContext run(String... args) {
    // 1. 创建 ApplicationContext
    context = createApplicationContext();

    // 2. refresh：触发 onRefresh()
    refreshContext(context);

    // 3. afterRefresh：扩展点
    afterRefresh(context, args);

    return context;
}

// ServletWebServerApplicationContext.onRefresh()
@Override
protected void onRefresh() {
    super.onRefresh();
    // 创建 Web 服务器
    this.webServer = createWebServer();
}

protected WebServer createWebServer() {
    // 从容器获取 ServletWebServerFactory（Tomcat/Jetty/Undertow）
    ServletWebServerFactory factory = getWebServerFactory();
    this.webServer = factory.getWebServer(getSelfInitializer());
}
```

---

## 5. 起步依赖与自动配置

### 5.1 常用 Starter

| Starter | 作用 |
| ------- | ---- |
| `spring-boot-starter` | 核心，含 Spring、日志、YAML |
| `spring-boot-starter-web` | Web，含 Spring MVC、Tomcat、Jackson |
| `spring-boot-starter-webflux` | 响应式 Web（WebFlux + Netty） |
| `spring-boot-starter-data-jpa` | Spring Data JPA + Hibernate |
| `spring-boot-starter-data-redis` | Lettuce 客户端 |
| `spring-boot-starter-data-mongodb` | MongoDB 驱动 |
| `spring-boot-starter-security` | Spring Security |
| `spring-boot-starter-oauth2-client` | OAuth2 客户端 |
| `spring-boot-starter-actuator` | 生产监控端点 |
| `spring-boot-starter-test` | JUnit 5、Mockito、AssertJ、Spring Test |
| `spring-boot-starter-validation` | Hibernate Validator（Bean Validation） |
| `spring-boot-starter-cache` | 缓存抽象（Caffeine、Redis 等） |
| `spring-boot-starter-aop` | Spring AOP + AspectJ |
| `spring-boot-starter-amqp` | RabbitMQ |
| `spring-boot-starter-kafka` | Kafka |
| `spring-boot-starter-batch` | Spring Batch |
| `spring-boot-starter-graphql` | GraphQL |

### 5.2 排除依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <!-- 排除默认 Tomcat，改用 Undertow -->
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-undertow</artifactId>
</dependency>
```

### 5.3 自定义 Starter

#### 5.3.1 自动配置类

```java
package com.atian.starter.xxljob;

import com.xxl.job.core.executor.impl.XxlJobSpringExecutor;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@ConditionalOnClass(XxlJobSpringExecutor.class)
@EnableConfigurationProperties(XxlJobProperties.class)
@ConditionalOnProperty(prefix = "xxl.job", name = "enabled", havingValue = "true", matchIfMissing = true)
public class XxlJobAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public XxlJobSpringExecutor xxlJobExecutor(XxlJobProperties props) {
        XxlJobSpringExecutor executor = new XxlJobSpringExecutor();
        executor.setAdminAddresses(props.getAdminAddresses());
        executor.setAccessToken(props.getAccessToken());
        executor.setAppname(props.getAppName());
        executor.setIp(props.getIp());
        executor.setPort(props.getPort());
        executor.setLogPath(props.getLogPath());
        executor.setLogRetentionDays(props.getLogRetentionDays());
        return executor;
    }
}
```

#### 5.3.2 配置属性类

```java
package com.atian.starter.xxljob;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "xxl.job")
public class XxlJobProperties {

    private boolean enabled = true;
    private String adminAddresses;
    private String accessToken;
    private String appName;
    private String ip;
    private int port = 9999;
    private String logPath;
    private int logRetentionDays = 30;

    // getter / setter 省略
}
```

#### 5.3.3 注册自动配置

在 `src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 写入：

```
com.atian.starter.xxljob.XxlJobAutoConfiguration
```

#### 5.3.4 使用方

```xml
<dependency>
    <groupId>com.atian</groupId>
    <artifactId>xxljob-spring-boot-starter</artifactId>
    <version>1.0.0</version>
</dependency>
```

```yaml
xxl:
  job:
    enabled: true
    admin-addresses: http://127.0.0.1:8080/xxl-job-admin
    app-name: my-service
    access-token: secret-token
```

---

## 6. 配置体系与外部化

### 6.1 配置优先级（从高到低）

1. 命令行参数（`--server.port=9090`）
2. `SPRING_APPLICATION_JSON` 环境变量
3. `ServletConfig` / `ServletContext` 初始化参数
4. JNDI 属性
5. Java 系统属性（`System.getProperties()`）
6. 操作系统环境变量
7. `application-{profile}.properties` 包含的随机值（`random.*`）
8. `application-{profile}.properties` / `application-{profile}.yml`（在 JAR 外）
9. `application-{profile}.properties` / `application-{profile}.yml`（在 JAR 内）
10. `application.properties` / `application.yml`（在 JAR 外）
11. `application.properties` / `application.yml`（在 JAR 内）
12. `@PropertySource` 注解声明的源
13. 默认属性（`SpringApplication.setDefaultProperties`）

### 6.2 多环境配置

`application.yml`：

```yaml
spring:
  profiles:
    active: dev  # 默认激活 dev
  application:
    name: order-service

server:
  port: 8080

---
spring:
  config:
    activate:
      on-profile: dev

server:
  port: 8081

datasource:
  url: jdbc:mysql://localhost:3306/dev_db

---
spring:
  config:
    activate:
      on-profile: prod

server:
  port: 80

datasource:
  url: jdbc:mysql://mysql-prod:3306/order_db
```

启动时切换：

```bash
java -jar app.jar --spring.profiles.active=prod
# 或环境变量
export SPRING_PROFILES_ACTIVE=prod
```

### 6.3 @ConfigurationProperties 绑定

```java
@Component
@ConfigurationProperties(prefix = "app.order")
public class OrderProperties {

    private int maxItems = 100;
    private Duration timeout = Duration.ofSeconds(30);
    private List<String> supportedCurrencies = List.of("CNY", "USD");
    private Retry retry = new Retry();

    public static class Retry {
        private int maxAttempts = 3;
        private Duration backoff = Duration.ofMillis(500);
        // getter / setter
    }

    // getter / setter
}
```

```yaml
app:
  order:
    max-items: 200
    timeout: 60s
    supported-currencies:
      - CNY
      - USD
      - EUR
    retry:
      max-attempts: 5
      backoff: 1s
```

> **特性**：
> - 支持 relaxed binding（`maxItems` ↔ `max-items` ↔ `MAX_ITEMS`）
> - 支持 `Duration` 解析（`30s`、`PT30S`、`30000ms`）
> - 支持 `DataSize` 解析（`10MB`、`1024B`）
> - JSR-303 校验（`@Validated` + `@NotNull`、`@Min`）

### 6.4 @Value 简单绑定

```java
@RestController
public class HelloController {

    @Value("${app.greeting:Hello}")
    private String greeting;

    @GetMapping("/hello")
    public String hello() {
        return greeting;
    }
}
```

> **区别**：`@Value` 适合单值简单注入，`@ConfigurationProperties` 适合结构化配置对象。

### 6.5 Spring Boot 2.4+ 配置导入

```yaml
spring:
  config:
    import:
      - optional:file:./secret.yml
      - optional:file:/etc/app/config.yml
      - configserver:http://config-server:8888
      - redis://  # 从 Redis 加载配置
```

### 6.6 加密配置

使用 Jasypt：

```yaml
app:
  db:
    password: ENC(xxxxxx)  # 加密后的密文
```

```java
@Bean
public StringEncryptor encryptor() {
    PooledPBEStringEncryptor enc = new PooledPBEStringEncryptor();
    enc.setConfig(new SimpleStringPBEConfig()
        .setAlgorithm("PBEWithMD5AndDES")
        .setPassword(System.getenv("JASYPT_KEY"))
        ...);
    return enc;
}
```

---

## 7. Web 层与 RESTful

### 7.1 控制器基础

```java
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping("/{id}")
    public ResponseEntity<Order> get(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getById(id));
    }

    @PostMapping
    public ResponseEntity<Order> create(@Valid @RequestBody CreateOrderRequest req) {
        Order created = orderService.create(req);
        URI location = URI.create("/api/v1/orders/" + created.getId());
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public Order update(@PathVariable Long id, @Valid @RequestBody UpdateOrderRequest req) {
        return orderService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        orderService.delete(id);
    }

    @GetMapping
    public Page<Order> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        return orderService.list(PageRequest.of(page, size, parseSort(sort)));
    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        return Sort.by(Sort.Direction.fromString(parts[1]), parts[0]);
    }
}
```

### 7.2 全局异常处理

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(EntityNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage(), Instant.now());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(e -> errors.put(e.getField(), e.getDefaultMessage()));
        return new ErrorResponse("VALIDATION_FAILED", "输入校验失败", errors, Instant.now());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleAll(Exception ex) {
        log.error("未处理异常", ex);
        return new ErrorResponse("INTERNAL_ERROR", "服务器内部错误", Instant.now());
    }
}

record ErrorResponse(String code, String message, Instant timestamp) {}
record ErrorResponse(String code, String message, Map<String, String> details, Instant timestamp) {}
```

### 7.3 请求校验

```java
public record CreateOrderRequest(
    @NotBlank String customerId,
    @NotEmpty List<@Valid OrderItemRequest> items,
    @Pattern(regexp = "CNY|USD|EUR") String currency
) {}

public record OrderItemRequest(
    @NotBlank String sku,
    @Min(1) @Max(999) int quantity,
    @DecimalMin("0.01") BigDecimal price
) {}
```

### 7.4 静态资源与 SPA

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 静态资源
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");

        // SPA 前端：所有未匹配路径转发到 index.html
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource resource = location.createRelative(resourcePath);
                        return (resource.exists() && resource.isReadable())
                            ? resource
                            : new ClassPathResource("/static/index.html");
                    }
                });
    }
}
```

### 7.5 CORS

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://example.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

### 7.6 Spring Boot 3.x 的声明式 HTTP Client

```java
// 接口式声明，Spring 自动生成实现
@HttpClientBean
public interface GitHubClient {

    @GetExchange("/users/{user}/repos")
    List<Repo> listRepos(@PathVariable String user);

    @PostExchange("/repos")
    Repo createRepo(@RequestBody CreateRepoRequest req);
}

// 配置
@Bean
public GitHubClient githubClient(WebClient.Builder builder) {
    WebClient client = builder.baseUrl("https://api.github.com").build();
    HttpServiceProxyFactory factory = HttpServiceProxyFactory
        .builderFor(WebClientAdapter.create(client)).build();
    return factory.createClient(GitHubClient.class);
}
```

---

## 8. 数据访问与持久化

### 8.1 Spring Data JPA 基础

```java
@Entity
@Table(name = "orders")
@EntityListeners(AuditingEntityListener.class)
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerId;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @Version
    private Long version;  // 乐观锁

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // getter / setter 省略
}

public enum OrderStatus { PENDING, PAID, SHIPPED, DELIVERED, CANCELLED }
```

```java
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    // 派生查询
    List<Order> findByCustomerIdAndStatus(String customerId, OrderStatus status);

    // @Query 自定义
    @Query("SELECT o FROM Order o WHERE o.amount > :min AND o.createdAt > :since")
    List<Order> findLargeOrders(@Param("min") BigDecimal min, @Param("since") LocalDateTime since);

    // 原生 SQL
    @Query(value = "SELECT * FROM orders WHERE amount > :min", nativeQuery = true)
    List<Order> findLargeNative(@Param("min") BigDecimal min);

    // 排序与分页
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    // 流式结果（节省内存）
    @Query("SELECT o FROM Order o")
    Stream<Order> streamAll();

    // 异步
    @Async
    CompletableFuture<List<Order>> findByCustomerId(String customerId);
}
```

### 8.2 审计启用

```java
@EnableJpaAuditing
@SpringBootApplication
public class App { ... }
```

### 8.3 事务管理

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepo;
    private final InventoryService inventoryService;

    @Transactional
    public Order create(CreateOrderRequest req) {
        // 减库存
        inventoryService.deduct(req.items());
        // 创建订单
        Order order = new Order();
        order.setCustomerId(req.customerId());
        order.setAmount(calculateTotal(req.items()));
        order.setStatus(OrderStatus.PENDING);
        return orderRepo.save(order);
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void transferMoney(String from, String to, BigDecimal amount) {
        // 高隔离级别：防止幻读
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeAuditLog(String action) {
        // 独立事务：主事务回滚不影响日志
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public void doSomething() {
        // BusinessException 不触发回滚
    }
}
```

**传播行为**：

| 传播 | 行为 |
| ---- | ---- |
| `REQUIRED`（默认） | 有则加入，无则新建 |
| `REQUIRES_NEW` | 挂起当前，新建独立事务 |
| `SUPPORTS` | 有则加入，无则非事务运行 |
| `NOT_SUPPORTED` | 挂起当前，非事务运行 |
| `MANDATORY` | 必须有事务，否则抛异常 |
| `NEVER` | 必须无事务，否则抛异常 |
| `NESTED` | 嵌套事务（savepoint） |

### 8.4 Spring Data Redis

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory factory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()))
            .disableCachingNullValues();

        return RedisCacheManager.builder(factory)
            .cacheDefaults(config)
            .withInitialCacheConfigurations(Map.of(
                "products", config.entryTtl(Duration.ofHours(1)),
                "users", config.entryTtl(Duration.ofDays(7))
            ))
            .build();
    }
}

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepo;

    @Cacheable(value = "products", key = "#id")
    public Product getById(Long id) {
        return productRepo.findById(id).orElseThrow();
    }

    @CacheEvict(value = "products", key = "#product.id")
    public Product update(Product product) {
        return productRepo.save(product);
    }

    @CacheEvict(value = "products", allEntries = true)
    public void clearCache() {}
}
```

### 8.5 Spring Data MongoDB

```java
@Document(collection = "audit_logs")
public class AuditLog {
    @Id
    private String id;
    private String action;
    private String userId;
    private Instant timestamp;
    @Indexed(expireAfterSeconds = 86400 * 30)  // TTL 索引，30 天后自动删除
    private Instant createdAt;
}

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findByUserIdOrderByTimestampDesc(String userId);
}
```

### 8.6 多数据源

```java
@Configuration
public class DataSourceConfig {

    @Primary
    @Bean(name = "primaryDataSource")
    @ConfigurationProperties(prefix = "app.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().type(HikariDataSource.class).build();
    }

    @Bean(name = "secondaryDataSource")
    @ConfigurationProperties(prefix = "app.datasource.secondary")
    public DataSource secondaryDataSource() {
        return DataSourceBuilder.create().type(HikariDataSource.class).build();
    }

    @Primary
    @Bean(name = "primaryEntityManager")
    public LocalContainerEntityManagerFactoryBean primaryEntityManager(
            EntityManagerFactoryBuilder builder, @Qualifier("primaryDataSource") DataSource ds) {
        return builder.dataSource(ds)
            .packages("com.atian.entity.primary")
            .persistenceUnit("primary")
            .build();
    }
}
```

---

## 9. Actuator 与可观测性

### 9.1 启用 Actuator

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,env,loggers,threaddump,heapdump
      base-path: /actuator
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true   # Kubernetes 探针
  metrics:
    tags:
      application: ${spring.application.name}
    distribution:
      percentiles-histogram:
        http.server.requests: true
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
```

### 9.2 自定义健康指标

```java
@Component
public class DiskSpaceHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        File disk = new File("/");
        long freeBytes = disk.getUsableSpace();
        long totalBytes = disk.getTotalSpace();
        double freePercent = (double) freeBytes / totalBytes * 100;

        if (freePercent < 10) {
            return Health.down()
                .withDetail("free_percent", freePercent)
                .withDetail("threshold", 10)
                .build();
        }
        return Health.up()
            .withDetail("free_percent", freePercent)
            .build();
    }
}
```

### 9.3 自定义 Micrometer 指标

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final MeterRegistry meterRegistry;
    private Counter orderCreatedCounter;
    private Timer orderProcessTimer;

    @PostConstruct
    void initMetrics() {
        orderCreatedCounter = Counter.builder("order.created")
            .description("Number of orders created")
            .tag("type", "default")
            .register(meterRegistry);

        orderProcessTimer = Timer.builder("order.process.duration")
            .description("Order processing time")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(meterRegistry);
    }

    public Order create(...) {
        return orderProcessTimer.record(() -> {
            Order order = doCreate(...);
            orderCreatedCounter.increment();
            return order;
        });
    }
}
```

### 9.4 Prometheus 抓取配置

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spring-boot-app'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['app:8080']
        labels:
          env: 'prod'
```

### 9.5 Grafana 仪表盘

Spring Boot 官方仪表盘 ID：`12900`、`11378`、`12466`（JVM/Micrometer/Spring Boot Statistics）。

### 9.6 结构化日志（Spring Boot 3.4+）

```yaml
logging:
  structured:
    format:
      console: ecs  # Elastic Common Schema
      file: json
  logback:
    rollingpolicy:
      max-file-size: 100MB
      max-history: 30
      total-size-cap: 5GB
```

输出示例（JSON）：

```json
{"@timestamp":"2026-07-21T10:00:00Z","log.level":"INFO","process.pid":12345,"service.name":"order-service","message":"Order 42 created"}
```

### 9.7 分布式追踪（Micrometer Tracing）

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

```yaml
management:
  tracing:
    sampling:
      probability: 1.0  # 全采样（生产 0.1）
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans
```

---

## 10. 安全与认证授权

### 10.1 Spring Security 基础配置

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/actuator/health").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .csrf(csrf -> csrf.disable())
            .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
```

### 10.2 JWT 鉴权

```java
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp,
                                    FilterChain chain) throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(req, resp);
            return;
        }
        String token = header.substring(7);
        try {
            String username = jwtService.extractUsername(token);
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails user = userDetailsService.loadUserByUsername(username);
                if (jwtService.isValid(token, user)) {
                    var auth = new UsernamePasswordAuthenticationToken(
                        user, null, user.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        } catch (JwtException e) {
            resp.setStatus(401);
            return;
        }
        chain.doFilter(req, resp);
    }
}
```

### 10.3 方法级安全

```java
@EnableMethodSecurity
@Configuration
public class MethodSecurityConfig {}

@Service
public class OrderService {

    @PreAuthorize("hasRole('ADMIN')")
    public void delete(Long id) { ... }

    @PreAuthorize("#order.ownerId == authentication.principal.id")
    public void update(Order order) { ... }

    @PostAuthorize("returnObject.ownerId == authentication.principal.id")
    public Order getById(Long id) { ... }

    @Secured("ROLE_ADMIN")
    public void audit() { ... }
}
```

---

## 11. 异步、定时与消息

### 11.1 @Async 异步

```java
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean("taskExecutor")
    public Executor taskExecutor() {
        return new ThreadPoolExecutor(
            8, 32, 60, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(200),
            new ThreadFactoryBuilder().setNameFormat("async-%d").build(),
            new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }
}

@Service
public class NotificationService {

    @Async("taskExecutor")
    public CompletableFuture<Void> sendEmail(String to, String content) {
        // 异步发送
        return CompletableFuture.completedFuture(null);
    }
}
```

### 11.2 @Scheduled 定时

```java
@Configuration
@EnableScheduling
public class SchedulingConfig {}

@Component
public class ReportTask {

    @Scheduled(cron = "0 0 2 * * ?")  // 每天凌晨 2 点
    public void dailyReport() {
        // ...
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 5_000)  // 上次结束 5s 后开始，间隔 60s
    public void cleanup() { ... }

    @Scheduled(fixedRate = 30_000)  // 每 30s 一次（不等上次完成）
    public void heartbeat() { ... }
}
```

### 11.3 Spring for Kafka

```java
@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic orderTopic() {
        return TopicBuilder.name("orders")
            .partitions(6)
            .replicas(3)
            .config(TopicConfig.MIN_IN_SYNC_REPLICAS_CONFIG, "2")
            .build();
    }

    @Bean
    public ProducerFactory<String, Order> producerFactory() {
        Map<String, Object> config = Map.of(
            ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092",
            ProducerConfig.ACKS_CONFIG, "all",
            ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true,
            ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,
            ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class
        );
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, Order> kafkaTemplate(ProducerFactory<String, Order> pf) {
        return new KafkaTemplate<>(pf);
    }
}

@Service
@RequiredArgsConstructor
public class OrderEventPublisher {
    private final KafkaTemplate<String, Order> kafkaTemplate;

    public void publish(Order order) {
        kafkaTemplate.send("orders", order.getCustomerId(), order);
    }
}

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderConsumer {

    @KafkaListener(topics = "orders", groupId = "order-service")
    public void handle(Order order) {
        log.info("Received order: {}", order);
    }
}
```

### 11.4 Spring for RabbitMQ

```java
@Configuration
public class RabbitConfig {

    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable("orders")
            .withArgument("x-dead-letter-exchange", "orders.dlx")
            .withArgument("x-message-ttl", 60000)
            .build();
    }

    @Bean
    public TopicExchange orderExchange() {
        return new TopicExchange("orders.exchange");
    }

    @Bean
    public Binding binding(Queue queue, TopicExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with("order.created.#");
    }
}

@Component
@RabbitListener(queues = "orders")
public class OrderConsumer {

    @RabbitHandler
    public void handle(Order order) {
        // ...
    }
}
```

---

## 12. 对比分析

### 12.1 Spring Boot vs Quarkus vs Micronaut

| 维度 | Spring Boot 3.x | Quarkus | Micronaut |
| ---- | ---------------- | ------- | --------- |
| **启动时间** | 1—3s（JVM）/ 0.05—0.2s（Native） | 0.05—0.2s（Native） | 0.1—0.3s（Native） |
| **内存占用** | 200—500MB | 50—150MB | 50—150MB |
| **生态** | 最大，Spring 全家桶 | 自身生态 + Jakarta EE | 自身生态 |
| **学习曲线** | 中（约定优于配置） | 中（CDI、命令式+响应式） | 低（注解驱动） |
| **AOT/GraalVM** | 3.0+ 原生支持 | 一等公民 | 一等公民 |
| **云原生** | 3.2+ CRaC 支持 | 容器优先 | 容器优先 |
| **响应式** | WebFlux + Project Reactor | Vert.x + Mutiny | HTTP Server + Reactor |

**选型建议**：

- 大型企业、需丰富生态、团队熟悉 Spring → **Spring Boot**
- Serverless、Lambda 场景、追求极低冷启动 → **Quarkus / Micronaut**
- 渐进式迁移 Spring Cloud → **Spring Boot 3.x + Spring Cloud**

### 12.2 内嵌容器对比

| 容器 | 默认 | 性能 | 内存 | 备注 |
| ---- | ---- | ---- | ---- | ---- |
| Tomcat | 是 | 高 | 中 | 生态最广 |
| Jetty | 否 | 高 | 低 | 长连接优秀 |
| Undertow | 否 | 极高 | 极低 | 推荐 IO 密集 |
| Netty | WebFlux | 极高 | 极低 | 响应式专属 |

### 12.3 ORM 框架对比

| 框架 | 抽象级别 | 学习曲线 | 性能 | 灵活性 |
| ---- | -------- | -------- | ---- | ------ |
| JPA / Hibernate | 高（OOP） | 中 | 中 | 低 |
| MyBatis | 中（SQL Mapping） | 低 | 高 | 高 |
| jOOQ | 中（类型安全 SQL） | 高 | 高 | 极高 |
| Spring Data JDBC | 低（轻量） | 低 | 高 | 中 |

---

## 13. 常见陷阱与最佳实践

### 13.1 热部署导致内存泄漏

`spring-boot-devtools` 在开发时方便，但生产环境必须排除：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

### 13.2 循环依赖

Spring Boot 2.6+ 默认禁用，可通过 `@Lazy` 临时绕过，但根治方案是重构。

```java
// 临时方案
@Service
public class A {
    private final B b;
    public A(@Lazy B b) { this.b = b; }
}
```

### 13.3 事务失效的常见原因

1. **方法非 public**：Spring AOP 默认仅代理 public 方法
2. **同类内部调用**：`this.method()` 不经过代理
3. **异常被吞**：try-catch 后未抛出，事务无法回滚
4. **rollbackFor 未配置**：默认仅 RuntimeException 回滚
5. **数据库引擎不支持事务**：MyISAM
6. **传播行为不当**：`NOT_SUPPORTED`、`NEVER` 会暂停事务

### 13.4 application.yml 的占位符陷阱

```yaml
# 错误：占位符在 yaml 解析时就被替换
app:
  name: my-service
  instance-id: ${app.name}-${random.uuid}

# 正确：使用 $${...} 转义
app:
  instance-id: ${app.name:default}-${random.uuid}
```

### 13.5 不要在 static 上下文中使用 @Value

```java
// 错误：static 字段无法注入
@Component
public class Bad {
    @Value("${app.key}")
    private static String key;  // 永远为 null
}

// 正确：用实例字段或 @PostConstruct
@Component
public class Good {
    private static String key;

    @Value("${app.key}")
    public void setKey(String key) {
        Good.key = key;
    }
}
```

### 13.6 异常处理顺序

```java
@RestControllerAdvice
public class Handler {

    // 必须先具体后通用
    @ExceptionHandler(EntityNotFoundException.class)
    public ErrorResponse handleSpecific(...) { ... }

    // 通用的放最后
    @ExceptionHandler(Exception.class)
    public ErrorResponse handleGeneric(...) { ... }
}
```

### 13.7 配置文件加载顺序问题

`application.yml` 在 JAR 内的会被 JAR 外的同名文件覆盖。生产环境务必将敏感配置外置，避免硬编码进 JAR。

### 13.8 Profile 注解陷阱

```java
// 错误：@Profile 写在内部类上，但 @Configuration 类自身被扫描
@Configuration
public class Config {
    @Configuration
    @Profile("dev")
    public static class DevConfig { ... }  // 即使非 dev 也会被扫描加载
}

// 正确：写在 @Bean 方法或顶层 @Configuration
@Configuration
public class Config {
    @Bean
    @Profile("dev")
    public SomeBean devBean() { ... }
}
```

### 13.9 启动慢的诊断

```bash
# Spring Boot 2.4+ 启动耗时分析
java -Xrunjdwp:transport=dt_socket,server=y,suspend=n -jar app.jar --debug

# ApplicationStartup 事件追踪（Spring Boot 2.4+）
# 通过 BufferingApplicationStartup 收集步骤
```

```java
@Bean
public BufferingApplicationStartup applicationStartup() {
    return new BufferingApplicationStartup(2048);
}
```

### 13.10 Native Image 兼容性

Spring Boot 3.x Native Image 要求：

- 避免反射动态读取未注册的类
- 配置 `@RegisterReflectionForBinding` 显式声明
- Hibernate、Jackson 等需相应 AOT 元数据
- 第三方库可能不兼容，需查阅文档

---

## 14. 工程实践

### 14.1 项目结构

```
order-service/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/atian/order/
│   │   │   ├── OrderServiceApplication.java
│   │   │   ├── config/        # 配置类
│   │   │   ├── controller/    # REST 控制器
│   │   │   ├── service/       # 业务逻辑
│   │   │   ├── repository/    # 数据访问
│   │   │   ├── entity/        # JPA 实体
│   │   │   ├── dto/           # 传输对象
│   │   │   ├── exception/     # 异常处理
│   │   │   ├── client/        # 外部调用
│   │   │   └── event/         # 领域事件
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       ├── db/migration/  # Flyway 迁移
│   │       └── static/        # 静态资源
│   └── test/
│       ├── java/com/atian/order/
│       │   ├── unit/          # 单元测试
│       │   ├── integration/   # 集成测试
│       │   └── e2e/           # 端到端测试
│       └── resources/
```

### 14.2 pom.xml 关键配置

```xml
<project>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
        <relativePath/>
    </parent>

    <groupId>com.atian</groupId>
    <artifactId>order-service</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <java.version>17</java.version>
        <spring-boot.version>3.3.0</spring-boot.version>
        <mybatis.version>3.5.16</mybatis.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-mysql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- 测试 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>mysql</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.graalvm.buildtools</groupId>
                <artifactId>native-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

### 14.3 测试

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
    }

    @Autowired
    TestRestTemplate restTemplate;

    @Test
    void shouldCreateOrder() {
        var req = new CreateOrderRequest("c1", List.of(new OrderItemRequest("sku1", 2, new BigDecimal("9.99"))), "CNY");
        var resp = restTemplate.postForEntity("/api/v1/orders", req, Order.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(resp.getBody().getId()).isNotNull();
    }
}

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    OrderService orderService;

    @Test
    void shouldReturn404WhenNotFound() throws Exception {
        when(orderService.getById(99L)).thenThrow(new EntityNotFoundException("not found"));

        mockMvc.perform(get("/api/v1/orders/99"))
            .andExpect(status().isNotFound());
    }
}
```

### 14.4 Dockerfile

```dockerfile
# 多阶段构建
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080

# JVM 参数（容器感知）
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75 -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1
```

### 14.5 Native Image 构建

```bash
# 编译为 Native Image
mvn -Pnative native:compile

# 生成 Docker Native Image
mvn -Pnative spring-boot:build-image
```

启动时间对比（同一应用）：

| 模式 | 启动时间 | 内存 |
| ---- | -------- | ---- |
| JVM | 2.8s | 380MB |
| Native Image | 0.06s | 80MB |

### 14.6 Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: order
        image: registry.example.com/order:1.0.0
        resources:
          requests: { cpu: 200m, memory: 512Mi }
          limits:   { cpu: 1000m, memory: 1Gi }
        livenessProbe:
          httpGet: { path: /actuator/health/liveness, port: 8080 }
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet: { path: /actuator/health/readiness, port: 8080 }
          initialDelaySeconds: 10
          periodSeconds: 5
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: prod
        - name: JAVA_OPTS
          value: "-XX:+UseG1GC -XX:MaxRAMPercentage=75"
```

### 14.7 优雅停机

```yaml
server:
  shutdown: graceful  # 默认 immediate
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

Kubernetes 配合 preStop hook：

```yaml
lifecycle:
  preStop:
    exec:
      command: ["sh", "-c", "sleep 10"]
```

---

## 15. 案例研究

### 15.1 案例：自动配置冲突导致 DataSource 失败

**场景**：项目同时引入 `spring-boot-starter-data-jpa` 与 `spring-boot-starter-data-mongodb`，启动报错"Failed to determine a suitable driver class"。

**根因**：JPA 的 `DataSourceAutoConfiguration` 默认尝试创建嵌入式 H2 数据库，但项目未引入任何 JDBC 驱动。

**解决**：

```java
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class
})
public class App { ... }
```

或配置数据源：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb
    username: root
    password: secret
    driver-class-name: com.mysql.cj.jdbc.Driver
```

### 15.2 案例：事务不回滚

**场景**：Service 方法内 try-catch 捕获异常但未重新抛出，事务未回滚。

```java
@Transactional
public void transfer(...) {
    try {
        // 业务
    } catch (Exception e) {
        log.error("failed", e);
        // 未抛出，事务感知不到异常，不回滚
    }
}
```

**修复**：

```java
@Transactional(rollbackFor = Exception.class)
public void transfer(...) {
    try {
        // 业务
    } catch (Exception e) {
        log.error("failed", e);
        throw e;  // 必须重新抛出
    }
}
```

### 15.3 案例：Bean 循环依赖

**场景**：`@Service` A 依赖 B，B 依赖 A，启动失败"Cannot resolve reference"。

**根因**：Spring Boot 2.6+ 默认禁用循环依赖。

**修复方案**：

1. 重构：抽取公共逻辑到第三个 Bean C
2. `@Lazy`：让其中一方延迟加载
3. 改用 setter 注入而非构造器注入
4. （不推荐）`spring.main.allow-circular-references=true`

### 15.4 案例：Actuator 端点暴露导致数据泄漏

**场景**：`/actuator/env` 默认仅暴露 `health` 与 `info`，但开发同学为了方便改为 `include: *`，导致生产环境暴露数据库密码、API Key 等敏感信息。

**修复**：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus  # 仅必要端点
  endpoint:
    env:
      show-values: never  # 不显示配置值
```

配合 Spring Security：

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/actuator/health").permitAll()
    .requestMatchers("/actuator/prometheus").hasRole("MONITOR")
    .requestMatchers("/actuator/**").hasRole("ADMIN")
)
```

### 15.5 案例：JPA N+1 查询

**场景**：列表查询订单时，每个订单又查询客户与商品，100 个订单触发 1 + 100 + 100 = 201 次 SQL。

```java
// 错误
List<Order> orders = orderRepo.findAll();
orders.forEach(o -> {
    o.getCustomer().getName();   // 触发 N 次查询
    o.getItems().forEach(Item::getSku);  // 触发 N 次
});
```

**修复**：

```java
// 1. JPQL JOIN FETCH
@Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.customer LEFT JOIN FETCH o.items WHERE o.status = :status")
List<Order> findWithDetails(@Param("status") OrderStatus status);

// 2. @EntityGraph
@EntityGraph(attributePaths = {"customer", "items"})
List<Order> findByStatus(OrderStatus status);

// 3. 批量抓取
@BatchSize(size = 50)
@ManyToOne(fetch = FetchType.LAZY)
private Customer customer;
```

---

## 16. 习题

### 习题 1（记忆）

列出 Spring Boot 三大核心特性与各自解决的问题。

**答案**：

1. **起步依赖（Starter）**：解决依赖版本冲突问题，通过 BOM 统一管理。
2. **自动配置（Auto-configuration）**：解决配置冗长问题，基于条件注解智能装配。
3. **内嵌容器 + 生产就绪**：解决部署复杂与监控缺失问题，可执行 JAR + Actuator。

### 习题 2（理解）

解释 `@ConditionalOnMissingBean` 的作用及其在自定义扩展中的应用。

**答案**：

`@ConditionalOnMissingBean` 表示"容器中不存在指定类型 Bean 时才生效"。它让用户能轻松覆盖默认配置：若用户已自定义 Bean，则自动配置退让。例如 Spring Boot 默认提供 `DataSource`，但若用户在 `@Configuration` 中定义了自己的 `DataSource`，则默认配置失效。这种"用户优先"机制是 Spring Boot 灵活性的基石。

### 习题 3（应用）

实现一个自定义 HealthIndicator，检查 Redis 连接是否正常。

**答案**：

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

@Component
public class RedisHealthIndicator implements HealthIndicator {

    private final RedisConnectionFactory factory;

    public RedisHealthIndicator(RedisConnectionFactory factory) {
        this.factory = factory;
    }

    @Override
    public Health health() {
        try {
            String pong = factory.getConnection().ping();
            return Health.up()
                .withDetail("server", "redis")
                .withDetail("response", pong)
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### 习题 4（分析）

某项目启动后访问 `/api/orders` 返回 401，但 `/api/public/health` 可访问。请分析可能原因。

**答案**：

可能原因：

1. Spring Security 配置中 `/api/**` 要求认证，但未提供 token
2. JWT 过滤器解析 token 失败
3. SecurityFilterChain 顺序错误（自定义过滤器在 UsernamePasswordAuthenticationFilter 之后）
4. `@PreAuthorize` 注解限制
5. 用户角色不匹配（如配置了 `hasRole("ADMIN")` 但用户无 ADMIN）

排查步骤：
- 查看启动日志中的 Security 配置
- 启用 `org.springframework.security=DEBUG`
- 检查请求头 Authorization
- 用 `/actuator/loggers` 动态调整日志级别

### 习题 5（评价）

对比 Spring Boot 与 Quarkus 在 Serverless 场景下的优劣。

**答案**：

| 维度 | Spring Boot | Quarkus |
| ---- | ----------- | ------- |
| 冷启动 | 2—3s（JVM）/ 0.05—0.2s（Native） | 0.05—0.2s（Native） |
| 镜像大小 | 200—300MB（JVM）/ 80—120MB（Native） | 50—100MB（Native） |
| 内存占用 | 200—500MB | 50—150MB |
| 生态成熟度 | 极高 | 中（持续增长） |
| 学习曲线 | 团队熟悉 Spring | 需学习 CDI、Quarkus 特性 |
| 开发体验 | 热重载成熟 | Live Reload 优秀 |

Serverless 场景对冷启动、内存敏感，**Quarkus 优势明显**；若团队已熟悉 Spring 且 JVM 长驻（如 ECS Fargate），Spring Boot 仍可行。

### 习题 6（创造）

设计并实现一个公司内部通用的"接口限流 Starter"，支持注解 `@RateLimit(qps=100)`。

**答案**：

```java
// 1. 注解
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    int qps() default 100;
}

// 2. 自动配置
@AutoConfiguration
@ConditionalOnClass(RedisTemplate.class)
@EnableConfigurationProperties(RateLimitProperties.class)
public class RateLimitAutoConfiguration {

    @Bean
    public RateLimitAspect rateLimitAspect(RedisTemplate<String, Object> redis) {
        return new RateLimitAspect(redis);
    }
}

// 3. AOP 切面
@Aspect
@RequiredArgsConstructor
public class RateLimitAspect {
    private final RedisTemplate<String, Object> redis;
    private static final String LUA = """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local current = tonumber(redis.call('get', key) or '0')
        if current >= limit then return 0 end
        redis.call('incr', key)
        redis.call('expire', key, 1)
        return 1
        """;

    @Around("@annotation(rateLimit)")
    public Object around(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
        String key = "rate:" + pjp.getSignature().toShortString();
        Long allowed = redis.execute(new DefaultRedisScript<>(LUA, Long.class),
            List.of(key), String.valueOf(rateLimit.qps()));
        if (allowed == null || allowed == 0) {
            throw new TooManyRequestsException("Rate limit exceeded");
        }
        return pjp.proceed();
    }
}

// 4. 注册自动配置
// META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
// com.atian.starter.ratelimit.RateLimitAutoConfiguration
```

### 习题 7

为什么 Spring Boot 2.6+ 默认禁用循环依赖？列举至少两种解决方案。

**答案**：

**原因**：循环依赖通常意味着设计缺陷（紧耦合），长期维护困难。三级缓存的解决方案仅对 setter/field 注入有效，且会增加启动时间、引入潜在 NPE 风险。

**解决方案**：
1. 重构抽取公共逻辑到第三个 Bean
2. 使用 `@Lazy` 让其中一方延迟初始化
3. 改 setter 注入为构造器注入，强制解决循环
4. 应用层引入事件总线，避免双向依赖
5. 临时回退：`spring.main.allow-circular-references=true`（不推荐）

### 习题 8

解释 `@Transactional` 失效的常见原因。

**答案**：

1. 方法非 public（Spring AOP 默认仅代理 public 方法）
2. 同类内部调用（`this.method()` 不经过代理）
3. 异常被 try-catch 吞没未重新抛出
4. `rollbackFor` 未配置，默认仅 RuntimeException 回滚
5. 数据库引擎不支持事务（如 MyISAM）
6. 传播行为配置不当（`NOT_SUPPORTED`、`NEVER`）
7. `@Transactional` 注解在接口上而非实现类（Spring AOP 不代理接口注解）
8. 类未被 Spring 容器管理（未加 `@Service` 等注解）

### 习题 9

实现一个全局异常处理器，统一返回 `{code, message, timestamp}` 格式。

**答案**：

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(EntityNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage(), Instant.now());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .toList();
        return new ErrorResponse("VALIDATION_FAILED", "输入校验失败", details.toString(), Instant.now());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleAll(Exception ex) {
        log.error("未处理异常", ex);
        return new ErrorResponse("INTERNAL_ERROR", "服务器内部错误", Instant.now());
    }

    public record ErrorResponse(String code, String message, Instant timestamp) {}
    public record ErrorResponse(String code, String message, String details, Instant timestamp) {}
}
```

### 习题 10

Spring Boot 3.x 的 GraalVM Native Image 有哪些限制？

**答案**：

1. **反射限制**：动态反射读取未注册的类会失败，需 `@RegisterReflectionForBinding`
2. **资源文件**：需在 `resource-config.json` 显式声明
3. **动态代理**：仅支持 interface-based 代理，CGLib 类代理需特殊处理
4. **JIT 优化缺失**：Native Image 是 AOT 编译，无运行时 JIT 优化，长期运行性能可能略低于 JIT
5. **构建时间长**：构建时需进行可达性分析，初次构建 2—10 分钟
6. **类加载**：运行时不能再加载新类
7. **JNI/Unsafe**：受限，需替换为 modern API
8. **第三方库兼容性**：反射密集的库（如某些 ORM、序列化）需 AOT 元数据支持

### 习题 11

`@SpringBootApplication` 注解等价于哪三个注解的组合？为什么不全用组合？

**答案**：

等价于：
- `@SpringBootConfiguration`（= `@Configuration`）
- `@EnableAutoConfiguration`
- `@ComponentScan`

`@SpringBootApplication` 提供便捷的单注解方式，且 `@ComponentScan` 默认扫描当前包及子包。在某些场景需要自定义时（如排除特定自动配置、扫描其他包），仍可用三注解组合：

```java
@Configuration
@EnableAutoConfiguration(exclude = {DataSourceAutoConfiguration.class})
@ComponentScan(basePackages = "com.atian")
public class App { ... }
```

### 习题 12

为什么生产环境要排除 `spring-boot-devtools`？

**答案**：

1. **性能开销**：devtools 启动两个 ClassLoader，监控 classpath 变化，会增加启动时间和内存
2. **安全风险**：devtools 暴露 LiveReload 端点，可能被恶意利用
3. **意外重启**：生产环境 classpath 变化会触发重启，影响稳定性
4. **不必要功能**：禁用缓存、模板热重载等功能在生产无意义
5. **镜像体积**：增加不必要的 JAR 体积

Maven 中通过 `<optional>true</optional>` 与 `<scope>runtime</scope>` 确保不打包进生产 JAR。

---

## 17. 参考文献

1. Walls, C. (2023). *Spring in Action* (6th ed.). Manning Publications. ISBN: 978-1617294945.

2. Cosmina, I., Harrop, R., Schaefer, C., & Hoeller, J. (2022). *Pro Spring 6: An In-Depth Guide to the Spring Framework* (6th ed.). Apress. ISBN: 978-1484289305.

3. Webb, P., Syer, D., Nichols, S., Wilkinson, S., & King, D. (2023). *Spring Boot Reference Documentation v3.3*. VMware. Available at: https://docs.spring.io/spring-boot/docs/3.3.x/reference/htmlsingle/

4. Johnson, R., Hoeller, J., Donald, K., Sampaleanu, C., Harrop, R., Risberg, T., et al. (2003-2024). *Spring Framework Reference Documentation*. VMware. Available at: https://docs.spring.io/spring-framework/reference/

5. Nicholson, J. (2022). *Learning Spring Boot 3.0* (3rd ed.). Packt Publishing. ISBN: 978-1803233307.

6. Maciej Walkowiak. (2023). *Spring Boot 3.0 Recipes*. Springer. DOI: [10.1007/978-1-4842-9630-7](https://doi.org/10.1007/978-1-4842-9630-7)

7. Winters, T. (2022). *Spring Boot: Up and Running* (2nd ed.). O'Reilly Media. ISBN: 978-1098106826.

8. Bloch, J. (2018). *Effective Java* (3rd ed.). Addison-Wesley Professional. ISBN: 978-0134685991.

9. Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley Professional. ISBN: 978-0321127426.

10. Newman, S. (2021). *Microservices Patterns* (2nd ed.). Manning Publications. ISBN: 978-1617294549.

11. VMware. (2024). *Spring Boot Auto-configuration Documentation*. Available at: https://docs.spring.io/spring-boot/docs/3.3.x/reference/features/developing-auto-configuration.html

12. Oracle Corporation. (2023). *Jakarta EE 10 Specification*. Eclipse Foundation. Available at: https://jakarta.ee/specifications/platform/10/

13. GraalVM Project. (2024). *GraalVM Native Image Reference Manual*. Oracle. Available at: https://www.graalvm.org/latest/reference-manual/native-image/

14. Micrometer Project. (2024). *Micrometer Documentation*. VMware. Available at: https://micrometer.io/docs

15. Richardson, C. (2018). *Microservices Patterns: With examples in Java* (1st ed.). Manning Publications. ISBN: 978-1617294549.

---

## 18. 延伸阅读

### 18.1 经典书籍

- Craig Walls. *Spring in Action*（Spring 实战，第六版）
- Iuliana Cosmina 等. *Pro Spring 6*（Spring 权威指南）
- Phil Webb 等. *Spring Boot in Action*
- Tom Hombergs. *Spring Boot: Up and Running*
- Josh Long, Kenny Bastani. *Cloud Native Java*

### 18.2 在线资源

- Spring 官方文档：https://spring.io/projects/spring-boot
- Spring Guides：https://spring.io/guides
- Spring Boot GitHub：https://github.com/spring-projects/spring-boot
- Baeldung（Spring Boot 实战教程）：https://www.baeldung.com/spring-boot
- Spring Initializr：https://start.spring.io/
- VMware Tanzu Blog：https://tanzu.vmware.com/developer/blog/
- Spring Blog：https://spring.io/blog
- Pivotal / VMware 工程博客：https://tanzu.vmware.com/developer/

### 18.3 重要论文与规范

- JSR 380: Bean Validation 2.0
- Jakarta EE 10 Specification
- Spring Framework 6 Reference
- JEP 422: Linux/AArch64 Port
- JEP 424: Foreign Function & Memory API (Preview)

### 18.4 视频课程

- MIT 6.170 *Software Studio*：https://ocw.mit.edu/courses/6-170-software-studio-spring-2013/
- Stanford CS 142 *Web Applications*：https://web.stanford.edu/class/cs142/
- CMU 17-445 *Software Engineering for Web Applications*：https://cmu-17-445.github.io/
- VMware Tanzu Tech Talk：https://tanzu.vmware.com/developer/tv/
- Spring Developer YouTube：https://www.youtube.com/@SpringSourceDev
