---
order: 780
title: Gradle build.gradle 配置语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Gradle build.gradle 配置语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/076-JavaBuildTool'
  - 'java/077-MavenPomConfiguration'
prerequisites:
  - 'java/076-JavaBuildTool'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Gradle build.gradle」语法速查手册，按需查阅。

零基础第一遍只读：插件应用、仓库配置、依赖配置、Java 配置；任务配置、应用配置、测试配置、版本与项目信息遇到再查。

前置：073 Java 构建工具。


## 插件应用

**基本写法：应用插件**
```groovy
plugins {
  id '<插件ID>' version '<版本>'
}
```
```groovy
// 应用 Java 与应用插件
plugins {
    id 'java'
    id 'application'
}
```

---

**基本写法：应用 Kotlin 插件**
```groovy
plugins {
  id 'org.jetbrains.kotlin.jvm' version '<版本>'
}
```
```groovy
// Kotlin JVM 插件
plugins {
    id 'org.jetbrains.kotlin.jvm' version '2.0.0'
}
```

---

## 仓库配置

**基本写法：配置仓库**
```groovy
repositories {
  mavenCentral()
  maven { url '<地址>' }
}
```
```groovy
// 配置依赖来源仓库
repositories {
    mavenCentral()
    maven { url 'https://maven.aliyun.com/repository/public' }
}
```

---

## 依赖配置

**基本写法：添加依赖**
```groovy
dependencies {
  implementation '<组>:<构件>:<版本>'
}
```
```groovy
// 添加各类依赖
dependencies {
    implementation 'com.google.guava:guava:33.0.0-jre'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'
    compileOnly 'org.projectlombok:lombok:1.18.32'
    runtimeOnly 'org.postgresql:postgresql:42.7.3'
}
```

---

**基本写法：平台依赖 BOM**
```groovy
implementation platform('<组>:<构件>:<版本>')
```
```groovy
// 使用 Spring Boot BOM 管理版本
dependencies {
    implementation platform('org.springframework.boot:spring-boot-dependencies:3.3.0')
    implementation 'org.springframework.boot:spring-boot-starter-web'
}
```

---

## Java 配置

**基本写法：配置 Java 版本**
```groovy
java {
  sourceCompatibility = JavaVersion.VERSION_21
  targetCompatibility = JavaVersion.VERSION_21
}
```
```groovy
// 设定 Java 21
java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}
```

---

**基本写法：工具链配置**
```groovy
java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(21)
  }
}
```
```groovy
// 使用指定版本 JDK 编译
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}
```

---

## 任务配置

**基本写法：自定义任务**
```groovy
tasks.register('<名称>') {
  doLast { <动作> }
}
```
```groovy
// 定义自定义任务
tasks.register('hello') {
    doLast {
        println 'Hello Gradle'
    }
}
```

---

**基本写法：任务依赖**
`<任务>.dependsOn <其他任务>`
```groovy
// 让 build 依赖 hello
tasks.named('build') {
    dependsOn 'hello'
}
```

---

## 应用配置

**基本写法：指定主类**
```groovy
application {
  mainClass = '<全限定类名>'
}
```
```groovy
// 配置可运行应用主类
application {
    mainClass = 'com.example.Main'
}
```

---

## 测试配置

**基本写法：使用 JUnit 5**
```groovy
test {
  useJUnitPlatform()
}
```
```groovy
// 启用 JUnit 5 平台
test {
    useJUnitPlatform()
    testLogging {
        events 'passed', 'skipped', 'failed'
    }
}
```

---

## 版本与项目信息

**基本写法：项目元信息**
```groovy
group = '<组ID>'
version = '<版本>'
```
```groovy
// 设置项目坐标
group = 'com.example'
version = '1.0.0'
```
