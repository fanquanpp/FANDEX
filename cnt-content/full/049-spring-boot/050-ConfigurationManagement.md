---
order: 50
title: 配置管理：一份代码如何体面地穿过三个环境
description: 以「同一份代码要过 dev、test、prod 三关」引入：application.yml 基础与缩进陷阱、@Value 与 @ConfigurationProperties 两条读取路径对照、List 与 Map 复杂绑定、Profile 多环境与分层优先级，附环境变量覆盖端口的全链路实验。
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/020-FirstApplication'
  - 'spring-boot/030-IoCDependencyInjection'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/040-AutoConfigurationInternals'
  - 'spring-boot/180-PackagingDeployment'
---

## 前置知识

- 已完成 [第一个应用](/spring-boot/020-FirstApplication)：知道 application.yml 在启动八步的第 3 步被读入；
- 已完成 [IoC 容器与依赖注入](/spring-boot/030-IoCDependencyInjection)：会构造器注入——配置值最终要注进 Bean。

## 学习目标

读完本文你将能够：

1. 写出层级正确的 application.yml，识别缩进错误的两种死法；
2. 在 @Value 与 @ConfigurationProperties 之间做正确选型，并完成注册；
3. 把 List、Map、嵌套对象与时长、体积单位从 yml 绑定到 Java 类型；
4. 用 profile 隔离多环境，用分组组合复杂环境；
5. 用「越靠近运行时的越赢」的分层思想推断任意配置冲突的胜负，并实测验证；
6. 说出明文密码的三条出路与各自的残留风险。

预计 45 分钟，需要能运行的 Spring Boot 工程。

## 1. 你现在要解决什么问题

同一份订单服务的代码要过三关：开发连本机数据库、测试连测试库、上线连生产库——外加 Redis 地址、第三方密钥、日志级别，全部不一样。最原始的做法是改代码：上线前手动改掉数据库地址、打包、再改回来。改三遍打三个包的日子有两个必然结局：某次忘了改回来，生产流量直连测试库；或者某人改了半截，dev 与 prod 的行为差异再也说不清源头。配置管理的全部命题是把「变的」从「不变的」里抽出来：代码只写一次，配置按环境给，打包只打一次，差异在部署时注入。本篇四步走：yml 的书写规则与陷阱、把配置读进代码的两条路径、profile 隔离环境、以及「多处配置打架时谁说了算」——最后这条是部署排障天天要用的判断力。

## 2. 准备现场：一条配置的完整旅程

沿用 020 的工程，新建 src/main/resources/application.yml：

```yaml
server:
  port: 8080

app:
  name: fandex-demo
  upload-dir: ./data
  timeout: 30s
  max-file-size: 10MB
  features:
    - greeter
    - exporter
  limits:
    max-items: 100
    retry: 3
```

配套属性类（record 版，字段含义在第 4、5 节展开；传统 POJO 写法见第 4 节说明）：

```java
package com.example.firstapp.config;

import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.convert.DurationUnit;
import org.springframework.util.unit.DataSize;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String name,
        String uploadDir,
        @DurationUnit(ChronoUnit.SECONDS) Duration timeout,
        DataSize maxFileSize,
        List<String> features,
        Limits limits) {

    public record Limits(int maxItems, int retry) { }
}
```

主类加一行扫描注解完成注册（另一条注册路 @EnableConfigurationProperties 见第 4 节）：

```java
@SpringBootApplication
@ConfigurationPropertiesScan
public class FirstAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(FirstAppApplication.class, args);
    }
}
```

一个接口把注入结果吐出来，作为后续所有实验的观测窗：

```java
package com.example.firstapp.controller;

import com.example.firstapp.config.AppProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PropsController {

    private final AppProperties properties;

    public PropsController(AppProperties properties) {
        this.properties = properties;
    }

    @GetMapping("/props")
    public String props() {
        return properties.name() + " / " + properties.timeout() + " / "
                + properties.features() + " / " + properties.limits().maxItems();
    }
}
```

启动后 `curl http://localhost:8080/props`，看到 `fandex-demo / PT30S / [greeter, exporter] / 100` 即现场就绪（PT30S 是 Duration 的 ISO-8601 写法，表示 30 秒）。

## 3. application.yml 基础与陷阱

yml 用缩进表达层级，规则三条：同级对齐、子级缩进两格、冒号后一个空格。它零容忍的是 Tab——缩进混入 Tab 时解析直接失败，报错类似：

```text
while scanning for the next token
found character that cannot start any token
 in 'reader', line 4, column 3:
```

这种「启动即崩」的死法反而是好事，错误当场暴露。真正阴险的是第二种：缩进错位不报错、静默错绑——本该挂 app 的键多缩一格挂到了 server 下面，就成了一只无人认领的键：

```yaml
server:
  port: 8080
  name: demo        # 本意是 app.name，实际成了 server.name：等于没写
```

症状是应用照常启动，但配置像没写一样：app.name 读出来是 null，server.port 若也错挂了就悄悄回落 8080。预防手段只有一个：写完 yml 立刻用第 2 节的 /props 接口或启动日志验证，别信肉眼。

第二个基础概念是**松散绑定**：yml 的短横线写法与 Java 的驼峰写法自动等价，`upload-dir: ./data` 绑到 uploadDir 字段，反过来写 uploadDir 也行。这条规则只属于 @ConfigurationProperties 一族，@Value 不吃这一套——这是两者最重要的分野。

## 4. 两条读取路径：@Value 与 @ConfigurationProperties

同一个属性源，两种读法：

```java
// 读法一：@Value，零散取值
@Service
public class LegacyService {

    @Value("${app.name}")
    private String appName;

    @Value("${app.limits.retry:3}")   // 冒号后是取不到时的默认值
    private int retry;
}
```

```java
// 读法二：@ConfigurationProperties，按前缀整组绑定（即第 2 节的 AppProperties）
@Service
public class OrderService {

    private final AppProperties properties;   // 整个 app.* 已是类型安全的对象

    public OrderService(AppProperties properties) {
        this.properties = properties;
    }
}
```

| 维度 | @Value | @ConfigurationProperties |
| --- | --- | --- |
| 绑定方式 | 逐个字段写注解 | 前缀一次性聚合整个对象 |
| 松散绑定 | 不支持（名字必须完全一致） | 支持（upload-dir 与 uploadDir 等价） |
| 类型转换 | 基本类型与字符串为主 | Duration、DataSize、List、Map、嵌套对象全套 |
| 校验 | 无 | 可叠加 @Validated 与校验注解（080 篇展开） |
| SpEL 表达式 | 支持 | 不支持 |
| IDE 提示 | 弱 | 引入注解处理器后有完整提示 |

选型一句话：零散的一两个简单值用 @Value，成组的结构化配置一律 @ConfigurationProperties。@Value 独占的能力是 SpEL（`#{...}`），需要表达式计算时才考虑它。

注册方式两条：@ConfigurationPropertiesScan（第 2 节用法，扫描所有带 @ConfigurationProperties 的类，推荐），或在任意配置类上 @EnableConfigurationProperties(AppProperties.class) 点名注册。属性类的写法两派：record 构造器绑定天然不可变，缺省值用 @DefaultValue 注解声明（第 2 节用的就是它）；传统 POJO 加 getter/setter 同样有效，需要默认值逻辑或计算属性时选它。

## 5. 复杂绑定：List、Map 与带单位的值

第 2 节的现场已覆盖三类复杂结构，逐个对照。List：yml 短横线逐项，Java 侧 List 承接；Map：键直接写在冒号前（如 headers 下的 X-Env: dev），Java 侧 Map<String, String> 承接；嵌套对象：yml 多缩一层（limits），Java 侧嵌一个 record 或静态内部类（Limits）。

时长与体积最能体现类型安全绑定的价值。`timeout: 30s` 直接绑成 Duration，支持 30s、5m、2h 乃至 ISO-8601 的 PT30S；不写单位时靠 @DurationUnit 指定默认单位（第 2 节按秒）。`max-file-size: 10MB` 绑成 DataSize，按字节数存储（10MB 即 10485760 字节，需要指定默认单位时可用 @DataSizeUnit，以官方文档为准）。带单位的写法把「3000 是 3 秒还是 3000 毫秒」这类血案消灭在配置层——对比老项目里满屏的 `connectTimeout=3000 // 毫秒` 注释，你会感谢这个设计。

## 6. Profile：多环境的正解

同一份 application.yml 放三环境配置、靠注释切换——这是 profile 要消灭的写法。正确姿势：通用配置放主文件，环境差异各自成文件：

```yaml
# application.yml 里只留三环境共有的部分
spring:
  application:
    name: first-app

app:
  upload-dir: ./data
```

```yaml
# application-dev.yml（本地开发）
spring:
  data:
    redis:
      host: localhost
```

```yaml
# application-prod.yml（生产）
spring:
  data:
    redis:
      host: redis.internal.example.com
```

激活方式按部署形态选：

```bash
java -jar first-app-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
# 或环境变量 SPRING_PROFILES_ACTIVE=prod
# 本地图省事可在 application.yml 写 spring.profiles.active: dev，但不要进生产包
```

两个进阶点。其一，**profile 分组**：生产往往要同时打开一组 profile，用分组一个名字全带上：

```yaml
spring:
  profiles:
    group:
      prod: proddb,prodmq    # 激活 prod 即同时激活 proddb 与 prodmq
```

其二，**默认 profile**：一个 profile 都没激活时，名为 default 的 profile 处于激活状态，可用 spring.profiles.default 改这个默认名——这解释了「什么都不配」时应用为何仍有一套行为。写测试时 application-test.yml 自动生效，靠的也是同一机制（170 篇展开）。

## 7. 配置优先级：记分层，不背清单

同一配置写在多处时谁赢？官方文档列了十几级来源，不必背——抓住一句分层思想：**越靠近运行时的越赢**。

```text
命令行参数            java -jar app.jar --server.port=8081
    ↓ 输给
操作系统环境变量      SERVER_PORT=9090          （JVM 的 -D 系统属性排在此层之前）
    ↓ 输给
应用外配置文件        jar 同级 config/application.yml、jar 同级 application.yml
    ↓ 输给
classpath 配置文件    jar 内 application.yml、application-dev.yml
    ↓ 输给
代码内默认值          属性类字段初始值、框架内置默认（如端口默认 8080）
```

三条细化规则各记一句：profile 专属文件在同位置胜过通用文件；jar 同级的 config/ 目录胜过 jar 内一切配置文件——这是生产部署最常用的一招，改配置不重新打包（180 篇展开）；环境变量映射时短横线会被去掉，app.upload-dir 的环境变量写法是 APP_UPLOADDIR 而不是 APP_UPLOAD_DIR。

动手验证这个分层。实验一，环境变量覆盖 yml：

```bash
SERVER_PORT=9090 mvn spring-boot:run
```

```text
Tomcat started on port 9090 (http) with context path '/'
```

yml 里的 8080 被环境变量压过——第 3 层输给第 2 层。实验二，命令行再压环境变量：

```bash
mvn -DskipTests package
java -jar target/first-app-0.0.1-SNAPSHOT.jar --server.port=8081
```

```text
Tomcat started on port 8081 (http) with context path '/'
```

第 1 层登顶。实验三验证业务属性同吃这套优先级：`SERVER_PORT=9090` 启动后 `curl http://localhost:9090/props`——AppProperties 绑定的正是同一张配置环境，一次裁决处处生效。

## 8. 敏感配置：明文密码的三条出路

先建立问题意识：application.yml 会进 Git，数据库密码提交那一刻就已泄露——仓库将来会共享、会被拉走、历史无法抹除。三条出路按工程化程度递进。

第一条，**环境变量注入**：密码不进任何文件，由部署平台（CI、容器编排、主机服务）注入 SPRING_DATASOURCE_PASSWORD 之类环境变量，靠松散绑定落进 spring.datasource.password。代码与密钥彻底分离，中小项目的默认答案。

第二条，**配置中心**：Nacos、Spring Cloud Config 这类系统集中管理配置，支持权限、审计与动态刷新，多服务规模化后的正解，深度治理交给 Spring Cloud 模块。

第三条，**加密存储**：jasypt 这类方案把存量 yml 里的密码加密成密文、启动时用密钥解密。注意残留风险：解密密钥仍要放在某处，属过渡方案而非终点。

三条路的共同底色：Git 里永远只有「指向密钥的地址」，不含密钥本身。

## 9. 官方参考

- 外部化配置章节（属性源完整顺序表）：https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Boot 官方文档：https://docs.spring.io/spring-boot/index.html

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. @ConfigurationProperties 比 @Value 强在哪三点？反过来 @Value 独有的能力是什么？
2. 命令行 --server.port=8081 与 application.yml 的 server.port: 8082 谁赢？再加环境变量 SERVER_PORT=8083 呢？排出三者胜负。
3. List 与 Map 在 yml 里分别怎么写？@ConfigurationProperties 的两种注册方式是什么？
4. timeout: 30s 被绑成 Duration 靠什么机制？只写数字 30 不带单位时按什么解析？
5. yml 缩进错误的两种死法分别是什么？哪种更阴险，症状是什么，怎么预防？
6. application-dev.yml 写了 server.port: 8083（已激活 dev），jar 同级 config/application.yml 写了 8084，最终端口是多少？依据哪条分层规则？
7. 环境变量 SPRING_PROFILES_ACTIVE 与 --spring.profiles.active=prod 谁赢？什么都没激活时哪个 profile 在生效？
8. 数据库密码写进 application.yml 提交 Git，问题出在哪一步？三条出路各自的残留风险是什么？
