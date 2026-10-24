---
order: 20
title: 第一个应用：十几行代码背后的启动全流程
description: 以「我只写了十几行，它是怎么起来的」引入：工程结构与 pom 逐段走读、主类三合一注解各管什么、启动流程八步主线、devtools 开发循环与四类新手排错实录，附可运行的第一个接口实验。
module: 'spring-boot'
category: 后端技术
difficulty: beginner
prerequisites:
  - 'spring-boot/010-WhySpringBoot'
  - 'java/740-JavaBuildTool'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/030-IoCDependencyInjection'
  - 'spring-boot/040-AutoConfigurationInternals'
  - 'spring-boot/060-SpringMvcRestApi'
---

## 前置知识

- 已完成 [为什么是 Spring Boot](/spring-boot/010-WhySpringBoot)：知道 starter 是「一组兼容依赖 + 一份默认配置」的打包；
- 会 Maven 基本用法（[Java 构建工具](/java/740-JavaBuildTool)），本机装好 JDK 21（`java -version` 能输出版本号即可）。

本篇只回答一个问题：应用是怎么起来的。IoC 与依赖注入的机制细节归 [IoC 容器与依赖注入](/spring-boot/030-IoCDependencyInjection)，自动配置的完整拆解归 [自动配置原理](/spring-boot/040-AutoConfigurationInternals)——本篇第 5 节只给你指针，不抢它们的活。

## 学习目标

读完本文你将能够：

1. 用 start.spring.io 或手写最小 pom 得到一个能跑的工程，并说清 pom 每一段在干什么；
2. 拆解主类三合一注解的分工，指出组件扫描的根在哪里；
3. 按顺序复述启动流程八步，指出「读配置」与「起 Tomcat」各发生在哪一步；
4. 用 devtools 搭起秒级重启的开发循环，并说清它的实现边界；
5. 独立诊断端口占用、JDK 不匹配、依赖下载失败、组件扫描扫不到这四类新手事故。

预计 40 分钟，需要 JDK 21 与网络。

## 1. 你现在要解决什么问题

你从 start.spring.io 下载了一个项目，解开、导入 IDE、点运行，应用起来了，接口能访问了。此时你的第一个困惑往往不是「怎么写业务」，而是「我只写了十几行，它是怎么起来的」：谁启动了服务器？配置文件还没写，默认值从哪来？main 方法只有一句 `SpringApplication.run`，后面藏着多少步？这种「黑盒感」会一路污染后面的学习——出了问题不知道去哪看，改了配置不知道有没有生效。本篇的任务就是把这个黑盒拆成透明的八步，拆完之后，你写的每一行配置、每一个注解，都能对号入座到某一步里。

## 2. 准备现场：把项目跑起来

先确认 JDK（Boot 3.5.x 基线是 Java 17+，本模块统一用 21）：

```bash
java -version
# java version "21.0.x" 即可
```

推荐路径：打开 https://start.spring.io ，选 Maven、Java 21、Spring Boot 3.5.x，依赖只勾 Spring Web，Generate 下载解压。想理解每一段的来历，也可以跳过向导，手写下面这个最小 pom：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.5.0</version> <!-- 用 3.5.x 系列最新补丁，以 start.spring.io 生成结果为准 -->
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>first-app</artifactId>
    <version>0.0.1-SNAPSHOT</version>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

把主类与接口放进 `src/main/java/com/example/firstapp`（代码见第 3 节与第 7 节），然后启动：

```bash
mvn spring-boot:run
```

看到启动日志最后两行，应用就绪：

```text
Tomcat started on port 8080 (http) with context path '/'
Started FirstAppApplication in 1.834 seconds (process running for 2.456)
```

Ctrl+C 停止。Gradle 用户路线完全平行：用 org.springframework.boot 插件，`./gradlew bootRun` 启动，本模块后续一律以 Maven 为主线。

## 3. 工程结构逐项走读

```text
first-app/
  mvnw  mvnw.cmd                     Maven 包装器：没装 Maven 也能用 ./mvnw 启动
  pom.xml
  src/main/java/com/example/firstapp/
    FirstAppApplication.java         主类，整个应用的入口与坐标原点
  src/main/resources/
    application.properties           配置文件，可整体改名为 application.yml（本模块用 yml）
    static/                          静态资源目录
    templates/                       服务端模板目录，纯 API 项目用不到
  src/test/java/com/example/firstapp/
    FirstAppApplicationTests.java    测试目录与类名都是约定，170 篇展开
```


pom 里有三处值得停下来说清。

**第一处是 parent**。`spring-boot-starter-parent` 本身继承自一个只管版本的清单（spring-boot-dependencies），它锁定了几百个常用库的互相兼容版本。这就是你的依赖声明可以不写版本号的原因：starter-web 的版本、它内部 Tomcat 与 Jackson 的版本，全部由这条继承链仲裁。它还顺手预置了编译插件版本、UTF-8 编码等工程默认值。你的 pom 从此只回答「用什么」，不再回答「什么版本」。

**第二处是 spring-boot-starter-web**。一个依赖进来，Tomcat、Spring MVC、JSON 支持全家桶就位——这正是 010 篇说的「兼容依赖 + 默认配置」打包。想知道它到底带了什么，跑一句：

```bash
mvn dependency:tree
```

**第三处是 spring-boot-maven-plugin**。`mvn spring-boot:run` 由此而来；更重要的是它会在打包时执行 repackage，把普通 jar 改造成自带依赖、`java -jar` 直接可跑的可执行 jar（180 篇展开）。

## 4. 主类三合一注解拆解

```java
package com.example.firstapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FirstAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(FirstAppApplication.class, args);
    }
}
```

`@SpringBootApplication` 是三个注解的合成体：

| 成员注解 | 干什么 |
| --- | --- |
| @SpringBootConfiguration | 本质是 @Configuration：声明这个类本身是个配置类，是容器组装的入口之一 |
| @EnableAutoConfiguration | 打开自动配置开关：拉出候选清单逐个条件裁决（040 篇的主角） |
| @ComponentScan | 组件扫描：以本类所在包为根，把 @Component 系注解的类登记为 Bean（030 篇的主角） |

两个由此而来的推论，都值得现在就记住。其一，**扫描根 = 主类所在包**，`com.example.firstapp` 及其所有子包。所以官方建议把主类放在项目的根包——不是仪式感，是让扫描范围天然覆盖全部业务代码。其二，三合一是便利不是枷锁，三个成员注解都能单独使用；`@SpringBootApplication` 还带 `exclude` 属性，可以点名排除某个自动配置类（例如没用数据库时排除 DataSourceAutoConfiguration，报错信息里也会教你怎么写）。

## 5. 启动流程主线：八步

现在拆黑盒。从敲下回车到 `Started ... in N seconds` 出现，主干是这八步（IoC 与自动配置的深层机制分别见 030 与 040，这里先建立地图）：

```text
1  main 调用 SpringApplication.run(FirstAppApplication.class, args)
   把主类作为「配置源头」交给框架，方法返回的就是运行中的容器
2  推断应用类型
   类路径找得到 spring-webmvc 就是 Servlet Web 应用（响应式与普通应用另有分支），
   这个结论决定后面创建哪套容器、起哪款服务器
3  准备 Environment，随后打印启动横幅
   命令行参数、环境变量、application.yml 在这一步汇入配置环境，
   那头 ASCII 野牛也是在这里打的——所以横幅出现时配置已经就位
4  按第 2 步的结论创建 ApplicationContext
   本例拿到的是 AnnotationConfigServletWebServerApplicationContext
5  把主类注册为第一个 Bean 定义
   主类自己先进容器——它是后续扫描与自动配置的起点
6  组件扫描
   解析主类上的 @ComponentScan：主类所在包及子包下所有 @Component 系类登记为 Bean 定义
7  自动配置裁决
   @EnableAutoConfiguration 拉出候选清单，条件注解逐个裁决，
   幸存者补上数据源、JSON 转换器、Web 服务器工厂等基础设施 Bean 定义
8  实例化全部单例，启动内嵌 Tomcat，回调 Runner
   Bean 逐个就绪，Tomcat 绑定 8080，日志打出 Started ...，
   最后 ApplicationRunner / CommandLineRunner 里的启动逻辑执行
```

对照第 2 节的启动日志，每一步都有对应痕迹：`Starting FirstAppApplication using Java 21.x ...` 是第 1 至 3 步，`Tomcat initialized` 到 `Tomcat started on port 8080` 是第 8 步的中段，`Started FirstAppApplication in 1.834 seconds` 是第 8 步的收尾。以后看到启动日志，先对号入座再排查——这是本篇给你的第一件排查武器。

## 6. 开发循环：devtools 与秒级重启

改一行代码要重启多久？没有 devtools 时是完整冷启动；加上它，重启压到秒级：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

devtools 的机制要拆穿，它不是魔法：类路径上发生编译产物变化时，它**丢弃并重建一个专管你项目类的类加载器**（restart classloader），第三方 jar 由另一个不动的 base classloader 持有——所以重启不用重新加载几百 MB 的依赖，自然快。理解了机制，三条边界不言自明：它重启的是「你的类」，改依赖版本仍要完整重启；它靠编译产物变化触发，IDE 里要开自动构建或手动 Build；打成可执行 jar 后 devtools 自动失效——发布态不需要它，这是设计而不是缺陷。

IDE 里开发循环就是：改代码，触发构建，devtools 秒级重启，浏览器或 curl 立刻验证。默认行为已经够用；想让外部工具控制重启时机，可以配 `spring.devtools.restart.trigger-file` 作为触发开关，细节以官方 DevTools 章节为准。

## 7. 第一个接口：写一个，验证一个

```java
package com.example.firstapp.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/hello")
    public String hello() {
        return "hello, spring boot";
    }

    @GetMapping("/hello/{name}")
    public String greet(@PathVariable String name) {
        return "hello, " + name;
    }
}
```

启动后用 curl 验证，注意看完整响应：

```bash
curl -i http://localhost:8080/hello
```

```http
HTTP/1.1 200
Content-Type: text/plain;charset=UTF-8
Content-Length: 18

hello, spring boot
```

```bash
curl -i http://localhost:8080/hello/fandex
hello, fandex
```

三个观察点：返回 200，方法返回值直接成为响应体；返回 String 走文本，如果返回对象，Jackson 会自动转 JSON（060 篇专讲 Web 层的规则）；路径变量 `{name}` 被自动填进参数。写接口这件事，到本篇为止已经够用了，后面的篇章负责让它变得规范与健壮。

## 8. 排错实录：四类新手必踩的坑

**坑一：端口占用。** 症状与官方报错一字不差：

```text
***************************
APPLICATION FAILED TO START
***************************

Description:

Web server failed to start. Port 8080 was already in use.

Action:

Identify and stop the process that's listening on port 8080 or configure this
application to listen on another port.
```

两招处置：临时换端口 `--server.port=8081`；或揪出占用者：

```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID 12345 /F

# macOS 与 Linux
lsof -i :8080
kill -9 12345
```

**坑二：JDK 版本不匹配。** 症状两种：编译期报 `invalid target release: 21` 或 `release version 21 not supported`；运行期报 `UnsupportedClassVersionError ... class file version 65.0`（65.0 对应 Java 21，措辞随工具链略有差异，关键词是版本号）。根因几乎总是「三个 JDK 不是同一个」：命令行的 `java -version`、Maven 实际用的（`mvn -v` 里看 Java version，它读 JAVA_HOME）、IDE 项目设置里的 SDK。对齐三者与 pom 的 `java.version` 即愈。

**坑三：依赖下载失败。** 第一次构建要下载上百 MB 依赖，超时很常见，症状是 `Could not transfer artifact ...`。处置：确认网络与仓库连通；国内环境在 Maven 的 settings.xml 配置镜像；改完后用 `mvn -U` 强制刷新重试。

**坑四：组件扫描扫不到（最经典）。** 把类放错了包：

```text
com.example.firstapp                        主类在这里
com.example.firstapp.web.HelloController    能扫到：主类包的子包
com.example.other.ThirdController           扫不到：不在主类包及子包
```

症状有两种且都不报扫描错误：Controller 是 404（Bean 压根没注册），普通 Bean 是注入处 NoSuchBeanDefinitionException。新手的错误直觉是「Spring Boot 会扫全项目」——不会，**扫描范围恒等于主类所在包及子包**。正解按优先级：把主类挪到根包（官方建议的目录习惯，一劳永逸）；确实无法挪时，用 `@SpringBootApplication(scanBasePackages = "com.example")` 显式扩大。不要单独手写 `@ComponentScan` 去替代三合一，容易顺手把自动配置也弄丢。

## 9. 官方参考

- Spring Initializr：https://start.spring.io
- Spring Boot 官方文档：https://docs.spring.io/spring-boot/index.html
- DevTools 章节（开发期热重载）：https://docs.spring.io/spring-boot/reference/using/dev-tools.html

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 三合一注解各管什么？只去掉 @EnableAutoConfiguration，应用还能起来吗？起来之后会发生什么？
2. 组件扫描的范围由什么决定？官方为什么建议把主类放在根包？
3. 启动八步里，「读 application.yml」发生在哪一步，「绑定 8080」发生在哪一步？你的依据是启动日志里的哪句话？
4. spring-boot-starter-parent 替你管了什么？你的 pom 里 starter 为什么不用写版本号？
5. devtools 重启的是哪个类加载器？为什么打成 jar 后它自动失效？这算缺点吗？
6. 端口占用与扫描不到 Bean，各自的症状分别是什么？端口占用的两种处置是什么？
7. 写了 Controller 却 404，按顺序检查哪三处？为什么说「Spring Boot 会扫全项目」是错的？
