---
order: 71
title: Java与微服务
module: java
category: Java
difficulty: advanced
description: 'Spring Cloud微服务架构'
author: fanquanpp
updated: '2026-06-14'
related:
  - java/Java构建工具
  - java/控制流
  - java/Java与消息队列
  - java/Java与Redis
prerequisites:
  - java/概述与开发环境
---

## 概述

微服务是一种架构风格，将一个大型应用拆分为多个小型、独立的服务，每个服务负责一个业务领域，独立开发、独立部署、独立运行。服务之间通过 HTTP 或消息队列通信。与单体应用相比，微服务的优势在于：可以独立部署和扩展、技术栈可以不同、故障隔离更好。

Spring Cloud 是 Java 生态中最成熟的微服务框架，它基于 Spring Boot，提供了一整套微服务基础设施：服务注册与发现、配置管理、负载均衡、熔断降级、API 网关等。Spring Cloud 的组件经历了从 Netflix OSS 到 Spring Cloud Alibaba 的演进，国内项目普遍采用 Spring Cloud Alibaba 方案。

## 基础概念

### 微服务核心组件

一个完整的微服务架构需要以下基础组件：

- **服务注册与发现**：服务启动时将自己的地址注册到注册中心，其他服务通过注册中心发现对方。Nacos 是目前国内最流行的选择
- **配置中心**：集中管理所有服务的配置，支持动态刷新。Nacos 同时提供配置中心功能
- **负载均衡**：当某个服务有多个实例时，请求需要分发到不同实例。Spring Cloud LoadBalancer 是默认实现
- **API 网关**：所有外部请求通过网关进入，网关负责路由、鉴权、限流等。Spring Cloud Gateway 是官方推荐
- **熔断降级**：当某个服务不可用时，快速失败而不是等待超时，防止故障蔓延。Sentinel 是国内主流选择
- **声明式 HTTP 客户端**：简化服务间的 HTTP 调用。OpenFeign 是标准方案

### 微服务与单体架构的选择

微服务不是银弹。团队规模小、业务复杂度低时，单体应用更简单高效。只有当团队超过一定规模、业务模块边界清晰、部署频率高到单体难以承受时，才考虑微服务。

## 快速上手

### 添加 Spring Cloud 依赖

Spring Cloud 基于 Spring Boot，版本需要匹配。在父 pom.xml 中添加：

```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.2.0</version>
</parent>

<dependencyManagement>
  <dependencies>
    <!-- Spring Cloud 依赖管理 -->
    <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-dependencies</artifactId>
      <version>2023.0.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
    <!-- Spring Cloud Alibaba 依赖管理 -->
    <dependency>
      <groupId>com.alibaba.cloud</groupId>
      <artifactId>spring-cloud-alibaba-dependencies</artifactId>
      <version>2023.0.0.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

### 服务注册到 Nacos

在服务提供方添加 Nacos 发现依赖：

```xml
<dependency>
  <groupId>com.alibaba.cloud</groupId>
  <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
```

配置 Nacos 地址：

```yaml
# application.yml
spring:
  application:
    name: user-service # 服务名称
  cloud:
    nacos:
      discovery:
        server-addr: localhost:8848 # Nacos 服务器地址
```

启动类上添加服务发现注解：

```java
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@EnableDiscoveryClient  // 启用服务发现
@SpringBootApplication
public class UserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}
```

启动后，user-service 会自动注册到 Nacos，其他服务可以通过服务名找到它。

## 详细用法

### 1. 使用 OpenFeign 调用远程服务

OpenFeign 让你像调用本地方法一样调用远程服务：

```java
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

// 定义 Feign 客户端接口
// name 指定要调用的服务名（在 Nacos 中注册的名称）
@FeignClient(name = "order-service")
public interface OrderClient {

    // 调用 order-service 的 /orders/user/{userId} 接口
    @GetMapping("/orders/user/{userId}")
    List<Order> getOrdersByUserId(@PathVariable("userId") Long userId);
}
```

启用 Feign 客户端：

```java
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@EnableFeignClients  // 启用 Feign 客户端扫描
@SpringBootApplication
public class UserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}
```

在业务代码中使用：

```java
import org.springframework.stereotype.Service;

@Service
public class UserBusinessService {

    private final OrderClient orderClient;

    public UserBusinessService(OrderClient orderClient) {
        this.orderClient = orderClient;
    }

    public UserDetail getUserDetail(Long userId) {
        // 像调用本地方法一样调用远程服务
        List<Order> orders = orderClient.getOrdersByUserId(userId);
        // 组装用户详情...
        return new UserDetail(userId, orders);
    }
}
```

### 2. Spring Cloud Gateway API 网关

网关是微服务的统一入口，处理路由、鉴权、限流等横切关注点：

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
```

配置路由规则：

```yaml
# application.yml
server:
  port: 8080

spring:
  cloud:
    gateway:
      routes:
        # 用户服务路由
        - id: user-service
          uri: lb://user-service # lb:// 表示从注册中心获取实例并负载均衡
          predicates:
            - Path=/api/users/** # 匹配路径
          filters:
            - StripPrefix=1 # 去掉路径的第一段（/api）

        # 订单服务路由
        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=1
```

自定义全局过滤器（如鉴权）：

```java
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class AuthGlobalFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // 从请求头获取令牌
        String token = exchange.getRequest().getHeaders().getFirst("Authorization");

        if (token == null || !validateToken(token)) {
            // 令牌无效，返回 401
            exchange.getResponse().setStatusCode(org.springframework.http.HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // 令牌有效，继续执行
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -1;  // 优先级，数字越小越先执行
    }

    private boolean validateToken(String token) {
        // 实际的令牌验证逻辑
        return token.startsWith("Bearer ");
    }
}
```

### 3. Sentinel 熔断降级

当某个服务不可用时，熔断器会快速失败，避免请求堆积导致整个系统崩溃：

```xml
<dependency>
  <groupId>com.alibaba.cloud</groupId>
  <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
```

配置 Sentinel：

```yaml
spring:
  cloud:
    sentinel:
      transport:
        dashboard: localhost:8080 # Sentinel 控制台地址
```

使用 @SentinelResource 注解保护方法：

```java
import com.alibaba.csp.sentinel.annotation.SentinelResource;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    // 使用 Sentinel 保护此方法
    @SentinelResource(value = "getOrder",
        blockHandler = "getOrderBlockHandler",    // 限流时的处理方法
        fallback = "getOrderFallback")             // 异常时的降级方法
    public Order getOrder(Long orderId) {
        // 调用远程服务或数据库
        return orderRepository.findById(orderId).orElse(null);
    }

    // 限流时的处理（方法签名需要与原方法一致，加一个 BlockException 参数）
    public Order getOrderBlockHandler(Long orderId, BlockException ex) {
        System.out.println("请求被限流: " + orderId);
        return new Order(orderId, "服务繁忙，请稍后重试");
    }

    // 异常时的降级处理
    public Order getOrderFallback(Long orderId, Throwable throwable) {
        System.out.println("服务降级: " + throwable.getMessage());
        return new Order(orderId, "服务暂时不可用");
    }
}
```

### 4. Nacos 配置中心

Nacos 不仅可以做服务注册，还可以做配置中心，集中管理所有服务的配置：

```xml
<dependency>
  <groupId>com.alibaba.cloud</groupId>
  <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
</dependency>
```

```yaml
# bootstrap.yml（配置中心需要在应用上下文初始化之前加载）
spring:
  application:
    name: user-service
  cloud:
    nacos:
      config:
        server-addr: localhost:8848
        file-extension: yaml # 配置文件格式
```

在 Nacos 控制台创建配置，Data ID 为 user-service.yaml，内容为：

```yaml
# Nacos 上的配置
database:
  url: jdbc:mysql://prod-server:3306/user_db
  username: prod_user
  password: prod_password
```

应用启动时会自动从 Nacos 拉取配置。修改 Nacos 上的配置后，应用可以动态刷新：

```java
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RefreshScope  // 支持配置动态刷新
public class ConfigController {

    @Value("${database.url}")
    private String dbUrl;

    @GetMapping("/config/db-url")
    public String getDbUrl() {
        return dbUrl;  // Nacos 配置变更后，这个值会自动更新
    }
}
```

### 5. 分布式链路追踪

微服务中一个请求可能经过多个服务，需要链路追踪来排查问题：

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
      probability: 1.0 # 采样率（1.0 表示全部采样，生产环境可以降低）
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans # Zipkin 服务器地址
```

配置后，每个请求会自动生成 traceId，通过 Zipkin UI 可以查看请求在各个服务间的调用链路和耗时。

## 常见场景

### 场景一：服务间认证

微服务之间的调用也需要认证，常见做法是在网关验证令牌后，将用户信息通过请求头传递给下游服务：

```java
// 网关过滤器：验证令牌后添加用户信息头
@Component
public class AuthFilter implements GlobalFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String token = exchange.getRequest().getHeaders().getFirst("Authorization");
        String userId = validateToken(token);  // 验证令牌并提取用户ID

        // 将用户信息添加到请求头，传递给下游服务
        ServerHttpRequest request = exchange.getRequest().mutate()
            .header("X-User-Id", userId)
            .build();

        return chain.filter(exchange.mutate().request(request).build());
    }
}
```

### 场景二：灰度发布

通过网关的权重路由实现灰度发布，将部分流量导向新版本：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service-v1
          uri: lb://user-service-v1
          predicates:
            - Path=/api/users/**
            - Weight=group1, 90 # 90% 的流量
        - id: user-service-v2
          uri: lb://user-service-v2
          predicates:
            - Path=/api/users/**
            - Weight=group1, 10 # 10% 的流量
```

## 注意事项与常见错误

### 不要过度拆分服务

服务拆得过细会导致服务间调用链过长，增加延迟和复杂度。一个好的服务应该有明确的业务边界，通常对应一个业务领域或一个团队。

### 分布式事务问题

微服务中，一个业务操作可能涉及多个服务的数据修改，无法使用本地事务保证一致性。解决方案包括：Saga 模式（编排或协调）、Seata 框架、最终一致性（通过消息队列）。不要强求强一致性，大多数业务场景用最终一致性就够了。

### 服务间循环依赖

服务 A 调用服务 B，服务 B 又调用服务 A，形成循环依赖。这通常说明服务边界划分有问题，需要重新梳理业务领域，将公共逻辑抽取为独立服务。

### 配置优先级

Spring Cloud 中配置的优先级从高到低为：命令行参数 > Nacos 配置 > application.yml > 默认值。理解这个优先级对排查配置问题很重要。

## 进阶用法

### 服务网格

服务网格（Service Mesh）是微服务架构的下一步演进，将服务间通信、安全、可观测性等能力从应用代码中剥离到基础设施层。Istio 是最流行的服务网格实现。Spring Cloud 与服务网格可以共存，Spring Cloud 处理业务逻辑，服务网格处理通信基础设施。

### DDD 驱动的微服务设计

领域驱动设计（DDD）是微服务拆分的最佳方法论。通过识别限界上下文（Bounded Context），每个微服务对应一个限界上下文，服务内部保持高内聚，服务之间通过领域事件通信。

### Kubernetes 部署

Spring Cloud 微服务通常部署在 Kubernetes 上，利用 K8s 的服务发现、自动扩缩容、滚动更新等能力。Spring Cloud Kubernetes 提供了与 K8s 集成的支持，可以直接使用 K8s 的 Service 发现机制替代 Nacos。
