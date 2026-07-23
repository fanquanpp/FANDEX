---
order: 70
title: Java构建工具
module: java
category: Java
difficulty: intermediate
description: Maven与Gradle
author: fanquanpp
updated: '2026-06-14'
related:
  - java/Java日志系统
  - java/Java单元测试
  - java/控制流
  - java/Java与微服务
prerequisites:
  - java/概述与开发环境
---

## 概述

Java 构建工具负责管理项目的依赖、编译源码、运行测试、打包发布等一系列任务。没有构建工具时，你需要手动下载 jar 包、手动编译、手动组织目录结构，效率极低。构建工具把这些重复性工作自动化，让你专注于编写代码。

Java 生态中有两个主流构建工具：Maven 和 Gradle。Maven 是老牌工具，使用 XML 配置，约定严格，社区资源丰富；Gradle 是后起之秀，使用 Groovy/Kotlin DSL 配置，更灵活，构建速度更快。新项目可以根据团队偏好选择，两者都能胜任。

## 基础概念

### 依赖管理

Java 项目通常依赖大量第三方库（如 Spring、Jackson、MySQL 驱动等）。构建工具通过坐标（groupId、artifactId、version）从仓库（Maven Central 或私有仓库）自动下载这些依赖，并处理依赖之间的传递关系。

### 仓库

仓库是存放 jar 包的地方。Maven Central 是最大的公共仓库，几乎所有开源 Java 库都发布在这里。企业通常还会搭建私有仓库（如 Nexus、Artifactory）来存放内部组件。

### 生命周期

Maven 定义了标准的构建生命周期：validate -> compile -> test -> package -> verify -> install -> deploy。每个阶段由插件的具体目标（goal）实现。执行某个阶段时，它之前的所有阶段会自动执行。

### 多模块项目

大型项目通常拆分为多个模块（如 api、service、common），每个模块有独立的 pom.xml 或 build.gradle，但由父项目统一管理依赖版本和构建流程。

## 快速上手

### Maven 项目结构

Maven 约定了标准的目录结构：

```
my-project/
├── pom.xml              # 项目配置文件
├── src/
│   ├── main/
│   │   ├── java/        # Java 源码
│   │   └── resources/   # 配置文件、静态资源
│   └── test/
│       ├── java/        # 测试代码
│       └── resources/   # 测试资源
└── target/              # 编译输出（自动生成）
```

### 最简 pom.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- 项目坐标 -->
    <groupId>com.example</groupId>
    <artifactId>my-project</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <!-- 继承 Spring Boot 父项目，获得默认配置和依赖版本管理 -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>

    <dependencies>
        <!-- Spring Boot Web Starter -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
</project>
```

### 常用 Maven 命令

```bash
# 编译项目
mvn compile

# 运行测试
mvn test

# 打包（编译 + 测试 + 生成 jar）
mvn package

# 清理之前的构建结果
mvn clean

# 清理并打包（最常用）
mvn clean package

# 安装到本地仓库（供其他项目引用）
mvn install

# 跳过测试打包（紧急发布时使用）
mvn clean package -DskipTests

# 查看依赖树（排查依赖冲突）
mvn dependency:tree
```

## 详细用法

### 1. Maven 依赖管理

```xml
<dependencies>
    <!-- 基本依赖：groupId + artifactId + version -->
    <dependency>
        <groupId>com.google.guava</groupId>
        <artifactId>guava</artifactId>
        <version>33.0.0-jre</version>
    </dependency>

    <!-- scope 控制依赖的作用范围 -->
    <dependency>
        <groupId>junit</groupId>
        <artifactId>junit</artifactId>
        <version>5.10.0</version>
        <scope>test</scope>  <!-- 只在测试时使用，不会打包到最终 jar -->
    </dependency>

    <dependency>
        <groupId>javax.servlet</groupId>
        <artifactId>javax.servlet-api</artifactId>
        <version>4.0.1</version>
        <scope>provided</scope>  <!-- 由运行环境提供（如 Tomcat），不打包 -->
    </dependency>

    <!-- 排除传递依赖 -->
    <dependency>
        <groupId>com.example</groupId>
        <artifactId>some-library</artifactId>
        <version>1.0.0</version>
        <exclusions>
            <exclusion>
                <groupId>org.slf4j</groupId>
                <artifactId>slf4j-log4j12</artifactId>
                <!-- 排除这个传递依赖，避免与项目使用的日志框架冲突 -->
            </exclusion>
        </exclusions>
    </dependency>
</dependencies>
```

### 2. Maven 依赖版本管理

在多模块项目中，统一管理依赖版本很重要：

```xml
<!-- 在父 pom.xml 中使用 dependencyManagement 管理版本 -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.google.guava</groupId>
            <artifactId>guava</artifactId>
            <version>33.0.0-jre</version>
        </dependency>
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-lang3</artifactId>
            <version>3.14.0</version>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- 子模块中不需要指定版本，统一使用父项目定义的版本 -->
<dependencies>
    <dependency>
        <groupId>com.google.guava</groupId>
        <artifactId>guava</artifactId>
        <!-- 不需要写 version，由父项目管理 -->
    </dependency>
</dependencies>
```

### 3. Maven 多模块项目

```xml
<!-- 父项目 pom.xml -->
<groupId>com.example</groupId>
<artifactId>my-project-parent</artifactId>
<version>1.0.0</version>
<packaging>pom</packaging>  <!-- 父项目的打包类型是 pom -->

<modules>
    <module>api</module>      <!-- API 模块 -->
    <module>service</module>  <!-- 业务逻辑模块 -->
    <module>common</module>   <!-- 公共工具模块 -->
</modules>
```

子模块的 pom.xml：

```xml
<!-- api/pom.xml -->
<parent>
    <groupId>com.example</groupId>
    <artifactId>my-project-parent</artifactId>
    <version>1.0.0</version>
</parent>

<artifactId>my-project-api</artifactId>

<dependencies>
    <!-- 依赖同项目的 common 模块 -->
    <dependency>
        <groupId>com.example</groupId>
        <artifactId>my-project-common</artifactId>
        <version>${project.version}</version>
    </dependency>
</dependencies>
```

### 4. Gradle 项目结构

Gradle 的项目结构与 Maven 相同，但配置文件是 build.gradle：

```groovy
// build.gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.4'
}

group = 'com.example'
version = '1.0.0'

java {
    sourceCompatibility = '17'  // Java 版本
}

// 仓库配置
repositories {
    mavenCentral()  // Maven Central 仓库
    // maven { url 'https://maven.aliyun.com/repository/public' }  // 阿里云镜像
}

// 依赖配置
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'com.google.guava:guava:33.0.0-jre'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

### 5. Gradle 依赖范围

Gradle 的依赖范围比 Maven 更细粒度：

```groovy
dependencies {
    // implementation：编译和运行时都需要，但不会传递给依赖此模块的其他模块
    implementation 'com.google.guava:guava:33.0.0-jre'

    // api：编译和运行时都需要，且会传递给依赖此模块的其他模块
    api 'com.example:my-common-lib:1.0.0'

    // compileOnly：只在编译时需要，运行时由环境提供
    compileOnly 'org.projectlombok:lombok:1.18.30'

    // runtimeOnly：只在运行时需要，编译时不需要（如数据库驱动）
    runtimeOnly 'com.mysql:mysql-connector-j:8.3.0'

    // testImplementation：只在测试编译和运行时需要
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'

    // annotationProcessor：注解处理器（如 Lombok）
    annotationProcessor 'org.projectlombok:lombok:1.18.30'
}
```

### 6. Gradle 常用命令

```bash
# 编译项目
gradle build

# 清理构建结果
gradle clean

# 运行测试
gradle test

# 查看依赖树
gradle dependencies

# 刷新依赖（强制重新下载）
gradle build --refresh-dependencies

# 不运行测试打包
gradle build -x test
```

### 7. Gradle 多模块项目

```groovy
// settings.gradle（根目录）
rootProject.name = 'my-project'
include 'api', 'service', 'common'
```

```groovy
// api/build.gradle
dependencies {
    implementation project(':common')  // 依赖同项目的 common 模块
}
```

### 8. Maven 私有仓库配置

企业项目通常需要发布到私有仓库：

```xml
<!-- pom.xml 中配置分发管理 -->
<distributionManagement>
    <repository>
        <id>company-releases</id>
        <url>https://nexus.company.com/repository/releases/</url>
    </repository>
    <snapshotRepository>
        <id>company-snapshots</id>
        <url>https://nexus.company.com/repository/snapshots/</url>
    </snapshotRepository>
</distributionManagement>
```

```bash
# 发布到私有仓库
mvn deploy
```

## 常见场景

### 场景一：解决依赖冲突

当多个库间接依赖同一个库的不同版本时，会产生冲突：

```bash
# Maven：查看依赖树找到冲突
mvn dependency:tree -Dincludes=com.fasterxml.jackson.core:jackson-databind

# 找到冲突后，用 exclusion 排除不需要的版本
# 或者在 dependencyManagement 中强制指定版本
```

```groovy
// Gradle：查看依赖冲突
gradle dependencies --configuration runtimeClasspath

// 强制指定版本
configurations.all {
    resolutionStrategy {
        force 'com.fasterxml.jackson.core:jackson-databind:2.16.0'
    }
}
```

### 场景二：使用国内镜像加速

国内访问 Maven Central 较慢，可以配置阿里云镜像：

```xml
<!-- ~/.m2/settings.xml -->
<mirrors>
    <mirror>
        <id>aliyun</id>
        <mirrorOf>central</mirrorOf>
        <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
</mirrors>
```

## 注意事项与常见错误

### 依赖范围不要搞错

Maven 的 scope 和 Gradle 的 configuration 容易混淆。最常见的错误是把应该用 implementation 的依赖写成了 api，导致依赖泄露，其他模块无意中依赖了不应该看到的内部库。

### SNAPSHOT 版本的风险

SNAPSHOT 版本是不稳定的开发版本，每次构建可能获取到不同的代码。生产环境绝不能依赖 SNAPSHOT 版本，应该使用正式发布的版本。

### 不要把构建工具的配置文件提交时忽略

target/ 和 build/ 目录应该加入 .gitignore，但 pom.xml、build.gradle、settings.gradle 必须提交到版本控制。

### Gradle Wrapper

使用 Gradle Wrapper 可以确保所有开发者使用相同的 Gradle 版本：

```bash
# 生成 Wrapper
gradle wrapper

# 使用 Wrapper 代替本地 Gradle
./gradlew build  # Linux/Mac
gradlew.bat build  # Windows
```

## 进阶用法

### Maven BOM 依赖管理

BOM（Bill of Materials）是一种特殊的 pom，只包含 dependencyManagement，用于统一管理一组相关依赖的版本：

```xml
<!-- 导入 Spring Cloud BOM -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>2023.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### Gradle 构建缓存

Gradle 支持构建缓存，可以显著加快构建速度：

```groovy
// gradle.properties
org.gradle.caching=true        // 启用构建缓存
org.gradle.parallel=true       // 并行构建模块
org.gradle.jvmargs=-Xmx2g     // 增加 Gradle 的 JVM 内存
```

### 自定义 Maven 插件

当标准插件不满足需求时，可以编写自定义插件：

```xml
<!-- 使用 exec-maven-plugin 在构建时执行自定义命令 -->
<plugin>
    <groupId>org.codehaus.mojo</groupId>
    <artifactId>exec-maven-plugin</artifactId>
    <executions>
        <execution>
            <phase>generate-sources</phase>
            <goals>
                <goal>exec</goal>
            </goals>
            <configuration>
                <executable>npm</executable>
                <arguments>
                    <argument>run</argument>
                    <argument>build</argument>
                </arguments>
            </configuration>
        </execution>
    </executions>
</plugin>
```
