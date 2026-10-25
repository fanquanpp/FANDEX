---
order: 40
title: 自动配置原理：谁在你一行没写时替你做了配置
description: 以「加了 redis starter 一行配置类没写就能注入 RedisTemplate」引入：从注解到 imports 文件的完整推理链、条件注解家族与用户优先的求值顺序、CONDITIONS EVALUATION REPORT 调试三板斧，附手写最小 starter 实战。
module: 'spring-boot'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-boot/030-IoCDependencyInjection'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/020-FirstApplication'
  - 'spring-boot/050-ConfigurationManagement'
  - 'spring-boot/130-SpringCacheRedis'
---

## 前置知识

- 已完成 [IoC 容器与依赖注入](/spring-boot/030-IoCDependencyInjection)：知道 Bean 的两条声明路径，理解「容器里已有同名类型 Bean」意味着什么；
- [第一个应用](/spring-boot/020-FirstApplication) 第 5 节的启动八步还有印象：自动配置发生在其中第 7 步。

本篇是全模块的原理核心篇。读完它，020 篇的「黑盒」就彻底透明了——因为黑盒里最难的那一截就是本篇的主角的主角。

## 学习目标

读完本文你将能够：

1. 从 @SpringBootApplication 一路指到 imports 文件，复述自动配置的完整推理链；
2. 说出四个常用条件注解的语义，解释「用户配置永远覆盖自动配置」靠的是哪个求值顺序事实；
3. 用 --debug 报告、/actuator/conditions、断点三板斧定位「这个 Bean 是谁给的、为什么没给」；
4. 手写一个带条件注解与注册文件的最小 starter，并验证用户的 Bean 能让默认实现自动让位；
5. 说清 starter 与 autoconfigure 两个模块的职责拆分与第三方命名规范。

预计 60 分钟，需要 JDK 21、一个可运行工程与（可选）本机 Redis。

## 1. 你现在要解决什么问题

往 pom 里加一个 `spring-boot-starter-data-redis`，一行配置类都没写，控制器里注入 StringRedisTemplate 就能读写 Redis。你全项目搜索 `@Bean`，找不到任何与 Redis 相关的东西——模板是谁定义的？连接工厂谁造的？host 端口这些默认值谁填的？更神奇的是：当你自己声明了一个同类型的 Bean，框架那套默认实现又悄悄让位，不跟你抢。这套「你配置我就退出、你不配置我就顶上」的行为不是巧合，是一套写死在框架里的机制：**自动配置**。理解它有三个回报：报错时你知道去哪找真相；写公共组件时你会造自己的 starter；面试时这是 Spring Boot 的高频深水区。本篇用一条推理链把它拆到文件级。

## 2. 准备现场：一个无人配置却好用的 Redis 客户端

沿用 020 的工程，加一个依赖（版本交给 parent，020 篇讲过的规则）：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

 application.yml 里只写连接信息：

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
```

一个直接注入使用的控制器：

```java
package com.example.firstapp.controller;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PingController {

    private final StringRedisTemplate redis;

    public PingController(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @GetMapping("/ping")
    public String ping(String key) {
        redis.opsForValue().set(key, "pong");
        return redis.opsForValue().get(key);
    }
}
```

本机跑一个 Redis 便于验证：`docker run -d --name redis8 -p 6379:6379 redis:8`。有个现象先记下：**不启动 Redis，应用照样能起来**——连接是懒建立的，首次访问 /ping 才报连接错误。一个谁也没写过的 RedisTemplate 体系凭空出现，现在开始追责。

## 3. 推理链：从注解到清单文件

追责从主类那个熟悉的注解开始，一路能追到磁盘上的一个文本文件：

```text
@SpringBootApplication
  └─ @EnableAutoConfiguration
       └─ @Import(AutoConfigurationImportSelector.class)
            └─ 选择器读取 META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
                 └─ 得到一百多个候选自动配置类（每行一个全限定类名）
                      └─ 条件注解逐个裁决，幸存者以 @Configuration 身份注册进容器
                           └─ RedisAutoConfiguration 提供了 redisTemplate 与 stringRedisTemplate
```

看一眼那个清单文件长什么样（文件在 spring-boot-autoconfigure 的 jar 里，用 IDE 双击依赖或解压 jar 即可看到）：

```text
org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration
org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration
org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration
org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration
……（一百多个候选，数量随版本浮动）
```

第 2 节问题的答案就在这里：你引了 redis starter，starter 把 redis 相关的类放进了类路径；自动配置选择器读清单文件拿到候选，其中 RedisAutoConfiguration 的条件是「类路径上有 RedisOperations 这个类」——成立，于是它注册进容器，模板与连接工厂随之就位。配置没写也能跑，是因为所有配置项都有默认值（host 默认 localhost、port 默认 6379），默认值的绑定规则是 050 篇的题目。

一个历史注脚一句话带过：3.0 之前候选清单写在 spring.factories 里，2.7 起迁移到本篇的 imports 文件，3.0 彻底移除旧机制——所以老文章里的 spring.factories 自动配置写法已经作废，查资料时认准文件名。

## 4. 条件注解家族：谁有资格留下

候选不等于注册。每个自动配置类身上都挂着条件注解，逐个裁决：

| 注解 | 语义 | 在 Redis 场景中的样子 |
| --- | --- | --- |
| @ConditionalOnClass | 类路径上找得到指定类才生效 | 类路径有 RedisOperations 才谈 Redis 配置 |
| @ConditionalOnMissingBean | 容器里没有同类型或同名 Bean 才生效 | 你没自定义 redisTemplate 我才给 |
| @ConditionalOnProperty | 指定配置项满足条件才生效 | 某开关没关我才装 |
| @ConditionalOnWebApplication | 当前是 Web 应用才生效 | Web 专属配置不污染批处理应用 |

源码是最好的一手材料。RedisAutoConfiguration 的简化节选：

```java
@AutoConfiguration
@ConditionalOnClass(RedisOperations.class)          // 没引 redis 客户端就整个跳过
public class RedisAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(name = "redisTemplate")
    public RedisTemplate<Object, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<Object, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory);
        return template;
    }

    @Bean
    @ConditionalOnMissingBean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory redisConnectionFactory) {
        return new StringRedisTemplate(redisConnectionFactory);
    }
}
```

（真实源码还带 @EnableConfigurationProperties 绑定 spring.data.redis.* 前缀，连接工厂由内部两个配置类竞争提供，都标着 @ConditionalOnMissingBean(RedisConnectionFactory.class)，默认 Lettuce 胜出——Boot 默认 Redis 客户端是 Lettuce，130 篇展开使用层。）

现在回答「用户优先」是怎么实现的。关键藏在推理链第 3 层：AutoConfigurationImportSelector 实现的是 **DeferredImportSelector**（延迟导入）。容器处理配置类时的顺序是：先处理你的 @Configuration 与组件扫描，自动配置类永远最后入场。于是当 RedisAutoConfiguration 里的 @ConditionalOnMissingBean 开始裁决时，你声明的 Bean 早已在容器地图里——一查，有了，自动配置安静退位。「用户配置永远覆盖自动配置」不是口号，是求值顺序写死在框架里的保证。这也顺带解释了第 2 节另一个现象：把你自己的 RedisConnectionFactory Bean 声明出来，默认的 Lettuce 工厂就不再创建。

## 5. 调试三板斧：让框架交代它干了什么

**第一板斧：--debug 看条件评估报告。** 启动时追加参数：

```bash
mvn spring-boot:run -Dspring-boot.run.arguments=--debug
# 等价姿势：java -jar app.jar --debug，或 application.yml 里写 debug: true
```

日志末尾出现 CONDITIONS EVALUATION REPORT，每个候选自动配置类的生死与死因全部在案（节选，措辞随版本微调）：

```text
============================
CONDITIONS EVALUATION REPORT
============================

Positive matches:
-----------------

   RedisAutoConfiguration matched:
      - @ConditionalOnClass found required class
        'org.springframework.data.redis.core.RedisOperations' (OnClassCondition)

Negative matches:
-----------------

   RabbitAutoConfiguration:
      Did not match:
         - @ConditionalOnClass did not find required class
           'com.rabbitmq.client.Channel' (OnClassCondition)
```

matched（Positive）说明「它注册了、为什么有资格」；not matched（Negative）说明「它没注册、卡在哪个条件」——排查「某个 Bean 为什么没给我」时，Negative 半区更有价值。比如上面第二段直译过来：你没引 RabbitMQ 客户端，所以 Rabbit 自动配置整个没资格上场。

**第二板斧：Actuator 的 conditions 端点。** 加 actuator 依赖并暴露端点（端点体系 160 篇专讲）：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
management:
  endpoints:
    web:
      exposure:
        include: conditions,health
```

```bash
curl http://localhost:8080/actuator/conditions
```

返回 JSON 版的同一份报告，适合程序化排查与留存。

**第三板斧：断点。** 前两板斧看结论，断点看过程。两个高价值断点：AutoConfigurationImportSelector 的 getAutoConfigurationEntry 方法，能看到候选全集与剔除过程；OnClassCondition 的 getMatchOutcome 方法，能看到单个条件注解的裁决细节。适合「报告看不懂、我要亲眼看」的深挖场景。

## 6. 实战：手写一个最小 starter

把机制用一遍才算会。目标：做一个 greeting starter，使用方加依赖即得 GreetingService，默认实现可被配置前缀定制，也可被用户 Bean 整体替换。

工程里建两个东西。先是代码（为省篇幅合并为一个模块；规范拆分见本节末尾）：

```java
package com.example.greeting;

public interface GreetingService {

    String greet(String name);
}
```

```java
package com.example.greeting;

public class DefaultGreetingService implements GreetingService {

    private final String prefix;

    public DefaultGreetingService(String prefix) {
        this.prefix = prefix;
    }

    @Override
    public String greet(String name) {
        return prefix + ", " + name;
    }
}
```

```java
package com.example.greeting;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("greeting")
public class GreetingProperties {

    private String prefix = "hello";

    public String getPrefix() { return this.prefix; }
    public void setPrefix(String prefix) { this.prefix = prefix; }
}
```

```java
package com.example.greeting;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@ConditionalOnClass(GreetingService.class)
@EnableConfigurationProperties(GreetingProperties.class)
public class GreetingAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(GreetingService.class)
    public GreetingService greetingService(GreetingProperties properties) {
        return new DefaultGreetingService(properties.getPrefix());
    }
}
```

然后是注册文件，路径与文件名一字不能差（相对 resources）：

```text
META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

文件内容一行，就是自动配置类的全限定名：

```text
com.example.greeting.GreetingAutoConfiguration
```

模块的 pom 里依赖 spring-boot-autoconfigure（版本交给 spring-boot-dependencies 体系管理）。打包安装到本地仓库后，在业务工程引入这个依赖，即可直接注入 GreetingService；写 `greeting.prefix: 你好` 改前缀，输出从 `hello, fandex` 变 `你好, fandex`；再声明自己的 Bean：

```java
@Bean
public GreetingService greetingService(GreetingProperties properties) {
    return name -> "hi, " + name;    // 你一声明，自动配置里的默认实现自动让位
}
```

验证三种状态都在你掌控中：不配置得 hello、改前缀得「你好」、声明 Bean 得 hi。配置项想在 IDE 里有提示，可追加 additional-spring-configuration-metadata.json 元数据文件，属锦上添花，以官方文档说明为准。

最后是工程规范。官方命名上 spring-boot-starter-xxx 前缀保留给官方，第三方用 xxx-spring-boot-starter（如 mybatis-spring-boot-starter）。严谨的拆分是两个模块：xxx-spring-boot-autoconfigure 放自动配置代码，xxx-spring-boot-starter 只做依赖聚合（自身零代码，拉入 autoconfigure 与运行时依赖）。大团队内部工具合并为一个模块也常见，但「starter 不放逻辑」这条最好守住——将来换实现只动 autoconfigure，使用方无感升级。

## 7. 升级瞭望（Spring Boot 4.0）

Boot 4.0（2025-11-20 GA，基于 Spring Framework 7）把自动配置的载体动了手术：原本的大杂烩 spring-boot-autoconfigure 拆成一组细粒度模块，Web、数据、安全各自成模块、自带各自的自动配置，引哪个 starter 就只进哪部分候选清单。机制方向没变——仍是 imports 注册加条件注解裁决，只是清单变短、边界变清，按需裁剪更容易。3.x 时代的自动配置迁移成本不大，具体迁移清单以官方迁移指南为准。

## 8. 官方参考

- 自动配置章节（含创建自己的自动配置）：https://docs.spring.io/spring-boot/reference/using/auto-configuration.html
- Spring Boot 官方文档：https://docs.spring.io/spring-boot/index.html

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 自动配置候选清单从哪个文件读出来？路径与文件名写得出吗？3.x 与 2.x 之前的机制差异一句话说清。
2. 从 @SpringBootApplication 到清单文件，推理链有几层？AutoConfigurationImportSelector 实现的哪个接口决定了它的入场时机？
3. @ConditionalOnMissingBean 的语义是什么？「用户 Bean 覆盖自动配置」依赖哪个求值顺序事实？
4. --debug 报告里 Positive 与 Negative 分别说明什么？排查「Bean 为什么没给我」时先看哪个半区？
5. 手写 starter 最少需要哪三样东西？注册文件里写的是什么？
6. starter 与 autoconfigure 两个模块各放什么？第三方 starter 的命名规范是什么，为什么官方前缀不让用？
7. 自动配置类为什么不应该放在会被组件扫描扫到的包里？提示：想想它与 DeferredImportSelector 入场时机的关系。
