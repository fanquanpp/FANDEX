---
order: 770
title: Maven pom.xml 配置语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Maven pom.xml 配置语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/076-JavaBuildTool'
  - 'java/078-GradleBuildConfiguration'
prerequisites:
  - 'java/076-JavaBuildTool'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Maven pom.xml」语法速查手册，按需查阅。

零基础第一遍只读：项目坐标、属性定义、依赖配置；构建配置、仓库配置、多模块聚合、dependencyManagement 遇到再查。

前置：073 Java 构建工具。


## 项目坐标

**基本写法：定义项目坐标**
```xml
<groupId><组ID></groupId>
<artifactId><构件ID></artifactId>
<version><版本></version>
```
```xml
<!-- 项目唯一标识 -->
<groupId>com.example</groupId>
<artifactId>my-app</artifactId>
<version>1.0.0</version>
```

---

**基本写法：定义打包类型**
`<packaging><类型></packaging>`
```xml
<!-- jar/war/pom/ear -->
<packaging>jar</packaging>
```

---

## 属性定义

**基本写法：定义属性**
```xml
<properties>
  <属性名>属性值</属性名>
</properties>
```
```xml
<!-- 集中管理版本号 -->
<properties>
  <maven.compiler.release>21</maven.compiler.release>
  <junit.version>5.10.0</junit.version>
</properties>
```

---

## 依赖配置

**基本写法：添加依赖**
```xml
<dependency>
  <groupId><组ID></groupId>
  <artifactId><构件ID></artifactId>
  <version><版本></version>
</dependency>
```
```xml
<!-- 引入 JUnit 5 -->
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>${junit.version}</version>
  <scope>test</scope>
</dependency>
```

---

**基本写法：依赖范围**
`<scope><范围></scope>`
```xml
<!-- compile/provided/runtime/test/system -->
<scope>test</scope>
```

---

**基本写法：排除传递依赖**
```xml
<exclusions>
  <exclusion>
    <groupId><组ID></groupId>
    <artifactId><构件ID></artifactId>
  </exclusion>
</exclusions>
```
```xml
<!-- 排除不想要的传递依赖 -->
<exclusions>
  <exclusion>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-log4j12</artifactId>
  </exclusion>
</exclusions>
```

---

## 构建配置

**基本写法：指定输出目录**
```xml
<build>
  <finalName><名称></finalName>
  <sourceDirectory><目录></sourceDirectory>
</build>
```
```xml
<!-- 自定义构建产物名 -->
<build>
  <finalName>my-app</finalName>
</build>
```

---

**基本写法：配置插件**
```xml
<plugin>
  <groupId><组ID></groupId>
  <artifactId><构件ID></artifactId>
  <version><版本></version>
  <configuration>...</configuration>
</plugin>
```
```xml
<!-- 配置编译插件 -->
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <version>3.13.0</version>
  <configuration>
    <release>21</release>
  </configuration>
</plugin>
```

---

**基本写法：插件执行目标**
```xml
<executions>
  <execution>
    <phase><阶段></phase>
    <goals><goal><目标></goal></goals>
  </execution>
</executions>
```
```xml
<!-- 绑定插件到生命周期阶段 -->
<executions>
  <execution>
    <phase>package</phase>
    <goals>
      <goal>shade</goal>
    </goals>
  </execution>
</executions>
```

---

## 仓库配置

**基本写法：配置仓库**
```xml
<repositories>
  <repository>
    <id><ID></id>
    <url><地址></url>
  </repository>
</repositories>
```
```xml
<!-- 添加阿里云镜像仓库 -->
<repositories>
  <repository>
    <id>aliyun</id>
    <url>https://maven.aliyun.com/repository/public</url>
  </repository>
</repositories>
```

---

## 多模块聚合

**基本写法：聚合子模块**
```xml
<modules>
  <module><模块名></module>
</modules>
```
```xml
<!-- 聚合多个子模块 -->
<modules>
  <module>core</module>
  <module>web</module>
  <module>service</module>
</modules>
```

---

## dependencyManagement

**基本写法：统一版本管理**
```xml
<dependencyManagement>
  <dependencies>
    <dependency>...</dependency>
  </dependencies>
</dependencyManagement>
```
```xml
<!-- 父 pom 中统一定义版本 -->
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-dependencies</artifactId>
      <version>3.3.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```
