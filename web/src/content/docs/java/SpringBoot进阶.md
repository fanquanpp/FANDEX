---
order: 62
title: SpringBoot进阶
module: java
category: Java
difficulty: intermediate
description: SpringBoot高级特性
author: fanquanpp
updated: '2026-06-14'
related:
  - java/运算符与表达式
  - java/Spring基础
  - java/SpringBoot安全
  - java/SpringBoot数据访问
prerequisites:
  - java/概述与开发环境
---

## 概述

Spring Boot 进阶内容涵盖自动配置原理、自定义 Starter、条件化装配、事件机制等核心特性。理解这些内容后，你不再只是"用"Spring Boot，而是能"驾驭"它：遇到问题时知道从哪里排查，需要扩展时知道怎么自定义。

Spring Boot 的核心价值是"约定优于配置"。它通过自动配置帮你做了大量默认设置，让你专注于业务代码。但当你需要覆盖默认行为或创建自己的组件时，就需要理解自动配置的工作原理。

## 基础概念

### 自动配置

自动配置是 Spring Boot 的核心机制。当你在 pom.xml 中添加一个依赖（如 spring-boot-starter-web），Spring Boot 会自动配置嵌入式的 Tomcat、DispatcherServlet、消息转换器等。这一切通过 @Conditional 系列注解实现：只有满足特定条件时，配置才会生效。

### Starter

Starter 是一组依赖的集合，它把某个功能需要的所有 jar 包打包在一起，你只需要添加一个 Starter 依赖就能使用对应功能。例如 spring-boot-starter-web 包含了 Spring MVC、Tomcat、Jackson 等依赖。

### 条件化装配

Spring Boot 使用 @Conditional 系列注解来决定是否创建某个 Bean。常见的条件注解包括：@ConditionalOnClass（类路径上存在某个类时生效）、@ConditionalOnMissingBean（容器中不存在某个 Bean 时生效）、@ConditionalOnProperty（配置文件中某个属性满足条件时生效）。

## 快速上手

### 理解自动配置的生效条件

查看当前应用生效了哪些自动配置：

```bash
# 启动时开启自动配置报告
java -jar myapp.jar --debug

# 或在 application.yml 中配置
debug: true
```

启动后控制台会输出一份报告，分为两部分：Positive matches（生效的自动配置）和 Negative matches（未生效的自动配置及原因）。

### 排除不需要的自动配置

如果某个自动配置不需要，可以排除它：

```java
// 方式一：在启动类上排除
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// 方式二：在配置文件中排除
// spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
```

## 详细用法

### 1. 自定义自动配置

创建自己的自动配置类，让其他项目引入你的 jar 后自动装配：

```java
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;

@AutoConfiguration  // Spring Boot 3.x 的新注解
@ConditionalOnClass(EmailService.class)  // 类路径上存在 EmailService 时才生效
public class EmailAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean  // 容器中没有 EmailService 时才创建
    @ConditionalOnProperty(prefix = "email", name = "enabled", havingValue = "true", matchIfMissing = true)
    public EmailService emailService(EmailProperties properties) {
        return new EmailService(properties.getHost(), properties.getPort());
    }
}
```

配置属性类：

```java
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "email")
public class EmailProperties {
    private String host = "localhost";  // 默认值
    private int port = 25;
    private boolean enabled = true;

    // getter 和 setter...
    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }
    public int getPort() { return port; }
    public void setPort(int port) { this.port = port; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
```

### 2. 创建自定义 Starter

一个标准的 Starter 项目结构如下：

```
my-spring-boot-starter/
├── pom.xml
└── src/main/
    ├── java/
    │   └── com/example/starter/
    │       ├── EmailService.java           # 核心服务
    │       ├── EmailProperties.java        # 配置属性
    │       └── EmailAutoConfiguration.java # 自动配置
    └── resources/
        └── META-INF/
            └── spring/
                └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

注册自动配置（Spring Boot 3.x 方式）：

```
# 文件: META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
com.example.starter.EmailAutoConfiguration
```

使用自定义 Starter 时，只需要添加依赖并在配置文件中设置属性：

```yaml
# 使用方的 application.yml
email:
  host: smtp.example.com
  port: 587
  enabled: true
```

### 3. 条件注解详解

Spring Boot 提供了丰富的条件注解：

```java
import org.springframework.boot.autoconfigure.condition.*;

// 当类路径上存在 DataSource 类时生效
@ConditionalOnClass(DataSource.class)

// 当类路径上不存在 RedisTemplate 类时生效
@ConditionalOnMissingClass("org.springframework.data.redis.core.RedisTemplate")

// 当容器中不存在 DataSource Bean 时生效（让你可以覆盖默认配置）
@ConditionalOnMissingBean(DataSource.class)

// 当容器中已经存在 DataSource Bean 时生效
@ConditionalOnBean(DataSource.class)

// 当配置属性 my.feature.enabled=true 时生效
@ConditionalOnProperty(prefix = "my.feature", name = "enabled", havingValue = "true")

// matchIfMissing = true 表示属性不存在时也生效（默认启用）
@ConditionalOnProperty(prefix = "my.feature", name = "enabled", havingValue = "true", matchIfMissing = true)

// 当当前是 Web 应用时生效
@ConditionalOnWebApplication

// 当当前不是 Web 应用时生效
@ConditionalOnNotWebApplication
```

### 4. Spring Boot 事件机制

Spring Boot 在启动过程中会发布一系列事件，你可以监听这些事件来执行自定义逻辑：

```java
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class AppStartupListener {

    // 应用启动完成后的回调（所有 Bean 初始化完毕）
    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        System.out.println("应用已启动完毕，可以开始接收请求");
        // 初始化缓存、预热数据等...
    }
}
```

Spring Boot 启动事件的顺序：

1. ApplicationStartingEvent：应用刚启动
2. ApplicationEnvironmentPreparedEvent：环境变量准备好
3. ApplicationContextInitializedEvent：上下文初始化
4. ApplicationPreparedEvent：Bean 定义加载完毕
5. ApplicationReadyEvent：应用启动完成，可以接收请求
6. ApplicationFailedEvent：启动失败

### 5. 自定义 ApplicationRunner

如果需要在应用启动后执行初始化逻辑，实现 ApplicationRunner 接口：

```java
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;

    public DataInitializer(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 应用启动后自动执行
        if (userRepository.count() == 0) {
            // 初始化默认数据
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword("encoded_password");
            admin.setRole("ADMIN");
            userRepository.save(admin);
            System.out.println("已创建默认管理员账号");
        }
    }
}
```

### 6. Profile 环境隔离

Profile 用于区分不同环境的配置：

```yaml
# application.yml（公共配置）
spring:
  profiles:
    active: dev # 激活 dev 环境

---
# application-dev.yml（开发环境）
server:
  port: 8080
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/dev_db

---
# application-prod.yml（生产环境）
server:
  port: 80
spring:
  datasource:
    url: jdbc:mysql://prod-server:3306/prod_db
```

也可以用 Java 配置区分环境：

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class DataSourceConfig {

    @Bean
    @Profile("dev")  // 只在 dev 环境下创建
    public DataSource devDataSource() {
        // 开发环境用 H2 内存数据库
        return new EmbeddedDatabaseBuilder().setType(H2).build();
    }

    @Bean
    @Profile("prod")  // 只在生产环境下创建
    public DataSource prodDataSource() {
        // 生产环境用 MySQL
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:mysql://prod-server:3306/prod_db");
        return ds;
    }
}
```

### 7. 配置属性绑定

将配置文件的属性绑定到 Java 对象：

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String name;
    private String version;
    private Server server = new Server();

    // getter 和 setter...
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public Server getServer() { return server; }
    public void setServer(Server server) { this.server = server; }

    // 嵌套属性
    public static class Server {
        private String host = "localhost";
        private int port = 8080;

        public String getHost() { return host; }
        public void setHost(String host) { this.host = host; }
        public int getPort() { return port; }
        public void setPort(int port) { this.port = port; }
    }
}
```

```yaml
# application.yml
app:
  name: My Application
  version: 1.0.0
  server:
    host: 0.0.0.0
    port: 9090
```

## 常见场景

### 场景一：多数据源配置

当应用需要连接多个数据库时：

```java
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import javax.sql.DataSource;

@Configuration
public class MultiDataSourceConfig {

    // 主数据源
    @Bean
    @Primary  // 标记为默认数据源
    @ConfigurationProperties(prefix = "spring.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    // 从数据源
    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.secondary")
    public DataSource secondaryDataSource() {
        return DataSourceBuilder.create().build();
    }
}
```

### 场景二：优雅停机

Spring Boot 支持优雅停机，在关闭时等待正在处理的请求完成：

```yaml
server:
  shutdown: graceful # 启用优雅停机

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s # 最多等待30秒
```

## 注意事项与常见错误

### 自动配置的优先级

自动配置类的执行顺序很重要。可以使用 @AutoConfigureBefore 和 @AutoConfigureAfter 控制顺序：

```java
@AutoConfiguration
@AutoConfigureBefore(DataSourceAutoConfiguration.class)  // 在数据源配置之前执行
public class MyAutoConfiguration {
    // ...
}
```

### 不要滥用 @ConditionalOnMissingBean

@ConditionalOnMissingBean 允许用户覆盖默认 Bean，但也可能导致意外行为。如果你的 Bean 必须存在，不要加这个注解。

### 配置属性的校验

配置属性可以使用 JSR-303 注解进行校验：

```java
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Min;

@ConfigurationProperties(prefix = "email")
@Validated  // 启用校验
public class EmailProperties {
    @NotEmpty(message = "邮件服务器地址不能为空")
    private String host;

    @Min(value = 1, message = "端口号不能小于1")
    private int port = 25;
}
```

### Starter 命名规范

官方 Starter 的命名格式是 spring-boot-starter-_（如 spring-boot-starter-web）。第三方 Starter 应该命名为 _-spring-boot-starter（如 mylib-spring-boot-starter），避免与官方命名冲突。

## 进阶用法

### 自定义 Health Indicator

Spring Boot Actuator 提供了健康检查端点，你可以添加自定义的健康检查：

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class CustomHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        // 检查外部服务是否可用
        try {
            // 模拟检查外部 API
            boolean isUp = checkExternalService();
            if (isUp) {
                return Health.up()
                    .withDetail("externalService", "可用")
                    .build();
            } else {
                return Health.down()
                    .withDetail("externalService", "不可用")
                    .build();
            }
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }

    private boolean checkExternalService() {
        // 实际检查逻辑
        return true;
    }
}
```

### ApplicationContextInitializer

在 Spring 上下文刷新之前执行初始化逻辑：

```java
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

public class MyInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    @Override
    public void initialize(ConfigurableApplicationContext context) {
        // 在 Bean 创建之前设置环境变量或属性
        context.getEnvironment().getSystemProperties().put("my.property", "value");
    }
}
```

### SpringBootAdmin 监控

Spring Boot Admin 是一个社区项目，提供了 Web 界面来监控 Spring Boot 应用。集成后可以看到应用的健康状态、JVM 信息、请求追踪等。适合在开发和测试环境中使用，生产环境需要配置安全认证。
