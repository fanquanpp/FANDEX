---
order: 180
tags:
  - 'java'
difficulty: 'intermediate'
title: 'Spring Boot 学习笔记'
module: 'java'
category: 'Java Basics'
description: 'Spring Boot 核心特性、自动配置与快速开发。'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [核心概念](#核心概念)
2. [环境配置与核心功能](#环境配置与核心功能)
3. [实战应用](#实战应用)
4. [最佳实践](#最佳实践)
5. [延伸阅读](#延伸阅读)
6. [更新日志](#更新日志)

---

## 1. 核心概念

- **起步依赖 (Starter)**：将常用的库打包，提供一站式依赖管理。
- **自动配置 (Auto-configuration)**：根据类路径下的 Jar 包自动装配 Bean。
- **内嵌容器**：如 Tomcat, Jetty，可以直接运行 Jar 包而无需部署外部容器。

## 2. 环境配置与核心功能

### 2.1 环境配置

- `application.properties` 或 `application.yml`：全局配置文件。
- `demo-properties`：如何读取配置文件内容。

```yaml
# application.yml
server:
  port: 8080
spring:
  datasource:
  url: jdbc:mysql://localhost:3306/db
```

### 2.2 监控与日志

- **Actuator**：集成 `spring-boot-starter-actuator`，监控应用的健康状态、度量指标。
- **Logback**：Spring Boot 默认集成的日志框架，配置灵活。

```xml
 <!-- logback-spring.xml -->
 <configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
  <encoder><pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern></encoder>
  </appender>
  <root level="INFO"><appender-ref ref="STDOUT" /></root>
 </configuration>
```

### 2.3 异常处理

- **Unified Exception Handler**：使用 `@ControllerAdvice` 和 `@ExceptionHandler` 实现全局统一返回。

## 3. 实战应用

### 3.1 ORM 数据库操作

- **JdbcTemplate**：简单封装通用 Dao 层。
- **JPA**：`spring-boot-starter-data-jpa`，基于 Hibernate 实现。
- **MyBatis / MyBatis-Plus**：灵活的 SQL 映射框架。

### 3.2 定时任务与异步

- `@Scheduled`：快速实现定时任务。
- `@Async`：开启多线程异步支持。

```java
 @Component
 public class MyTask {
  @Scheduled(fixedRate = 5000)
  public void run() {
  System.out.println("定时任务执行中...");
  }
 True}
```

## 4. 最佳实践

- **安全认证**：集成 `Spring Security` 或 `Shiro`，配合 JWT 实现无状态鉴权。
- **分布式锁**：集成 `Zookeeper` 或 `Redis` 实现基于 AOP 的分布式锁。
- **消息队列**：`RabbitMQ`, `RocketMQ`, `Kafka` 集成，解耦业务逻辑。

## 5. 延伸阅读

- [Spring Boot 官方文档](https://spring.io/projects/spring-boot) <!-- nofollow -->
- [spring-boot-demo 仓库](https://github.com/xkcoding/spring-boot-demo) <!-- nofollow -->

## 6. 更新日志

- **2026-04-05**：初始版本，整理 Spring Boot 核心与实战模块。
