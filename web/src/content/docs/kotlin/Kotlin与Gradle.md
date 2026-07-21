---
order: 75
title: Kotlin与Gradle
module: kotlin
category: Kotlin
difficulty: intermediate
description: Gradle Kotlin DSL
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与编译器插件
  - kotlin/Kotlin与Android
  - kotlin/Kotlin与Ktor
  - kotlin/Kotlin与测试
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

Gradle 是 Kotlin 项目最常用的构建工具，而 Kotlin DSL 是 Gradle 推荐的构建脚本编写方式。与传统的 Groovy DSL 相比，Kotlin DSL 提供了编译期类型检查、IDE 自动补全和更好的重构支持。理解 Gradle Kotlin DSL 是搭建和管理 Kotlin 项目的基础。

本文介绍如何使用 Kotlin DSL 编写 Gradle 构建脚本，涵盖项目配置、依赖管理、多模块项目等常见场景。

## 基础概念

- **build.gradle.kts**：Kotlin DSL 构建脚本，用 Kotlin 代码描述构建逻辑
- **settings.gradle.kts**：项目设置文件，定义项目名称和子模块
- **gradle.properties**：Gradle 属性文件，配置 JVM 参数等
- **Plugin（插件）**：扩展 Gradle 功能，如 kotlin("jvm")、application 等
- **Task（任务）**：构建的基本执行单元，如编译、测试、打包
- **Configuration（配置）**：依赖的分组，如 implementation、testImplementation 等

## 快速上手

创建一个最简单的 Kotlin 项目，需要两个文件：

```kotlin
// settings.gradle.kts
rootProject.name = "my-app"
```

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.0.0"
    application
}

group = "com.example"
version = "1.0.0"

repositories {
    mavenCentral()  // 从 Maven 中央仓库下载依赖
}

dependencies {
    implementation(kotlin("stdlib"))
    testImplementation(kotlin("test"))
}

application {
    mainClass.set("com.example.MainKt")
}

// 自定义 JDK 版本
kotlin {
    jvmToolchain(17)
}
```

项目结构：

```
my-app/
  build.gradle.kts
  settings.gradle.kts
  src/
    main/kotlin/com/example/Main.kt
    test/kotlin/com/example/MainTest.kt
```

常用命令：

```bash
./gradlew build          # 编译并测试
./gradlew run            # 运行应用
./gradlew test           # 运行测试
./gradlew clean          # 清理构建产物
```

## 详细用法

### 依赖管理

```kotlin
// build.gradle.kts
dependencies {
    // implementation：编译和运行时都需要，但不会传递给依赖此模块的模块
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")

    // api：编译和运行时都需要，且会传递给依赖此模块的模块
    api("com.example:shared-library:1.0.0")

    // compileOnly：只在编译时需要，运行时不需要
    compileOnly("org.projectlombok:lombok:1.18.30")

    // runtimeOnly：只在运行时需要
    runtimeOnly("com.h2database:h2:2.2.224")

    // testImplementation：只在测试编译和运行时需要
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.0")
    testImplementation("io.mockk:mockk:1.13.8")

    // 使用变量管理版本
    val kotlinxCoroutinesVersion = "1.8.0"
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:$kotlinCoroutinesVersion")
}
```

### 使用版本目录管理依赖

```kotlin
// gradle/libs.versions.toml
[versions]
kotlin = "2.0.0"
coroutines = "1.8.0"
ktor = "2.3.7"

[libraries]
kotlin-stdlib = { module = "org.jetbrains.kotlin:kotlin-stdlib", version.ref = "kotlin" }
coroutines-core = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "coroutines" }
ktor-server-core = { module = "io.ktor:ktor-server-core-jvm", version.ref = "ktor" }

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
```

```kotlin
// build.gradle.kts
plugins {
    alias(libs.plugins.kotlin.jvm)
}

dependencies {
    implementation(libs.kotlin.stdlib)
    implementation(libs.coroutines.core)
    implementation(libs.ktor.server.core)
}
```

### 多模块项目

```kotlin
// settings.gradle.kts
rootProject.name = "multi-module-app"
include("shared")
include("server")
include("client")
```

```kotlin
// build.gradle.kts (根项目)
plugins {
    kotlin("jvm") version "2.0.0" apply false
}
```

```kotlin
// shared/build.gradle.kts
plugins {
    kotlin("jvm")
}

dependencies {
    implementation(kotlin("stdlib"))
}
```

```kotlin
// server/build.gradle.kts
plugins {
    kotlin("jvm")
    application
}

dependencies {
    implementation(kotlin("stdlib"))
    // 依赖 shared 模块
    implementation(project(":shared"))
    implementation("io.ktor:ktor-server-netty:2.3.7")
}

application {
    mainClass.set("com.example.server.MainKt")
}
```

### 自定义 Task

```kotlin
// build.gradle.kts

// 注册自定义任务
tasks.register("copyConfig") {
    group = "custom"
    description = "复制配置文件"
    doLast {
        val source = file("config/template.yml")
        val target = file("build/config.yml")
        target.parentFile.mkdirs()
        target.writeText(source.readText())
        println("配置文件已复制到 ${target.absolutePath}")
    }
}

// 配置已有任务
tasks.withType<Test> {
    useJUnitPlatform()  // 使用 JUnit 5
    // 测试时打印标准输出
    testLogging {
        events("passed", "failed", "skipped")
    }
}

// 任务依赖
tasks.register("buildAndCopy") {
    dependsOn("build")
    dependsOn("copyConfig")
    doLast {
        println("构建和复制完成")
    }
}
```

### Source Sets

```kotlin
// build.gradle.kts
kotlin {
    // 添加自定义源集
    sourceSets {
        create("integrationTest") {
            kotlin.srcDir("src/integrationTest/kotlin")
            resources.srcDir("src/integrationTest/resources")
            // 继承 main 的依赖
            compileClasspath += sourceSets["main"].output + configurations["testRuntimeClasspath"]
            runtimeClasspath += output + compileClasspath
        }
    }
}

// 为自定义源集添加依赖
dependencies {
    "integrationTestImplementation"("io.ktor:ktor-client-cio:2.3.7")
}
```

## 常见场景

### Spring Boot 项目配置

```kotlin
plugins {
    kotlin("jvm") version "2.0.0"
    kotlin("plugin.spring") version "2.0.0"
    kotlin("plugin.jpa") version "2.0.0"
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation(kotlin("reflect"))
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

### Ktor 项目配置

```kotlin
plugins {
    kotlin("jvm") version "2.0.0"
    kotlin("plugin.serialization") version "2.0.0"
    id("io.ktor.plugin") version "2.3.7"
    application
}

dependencies {
    implementation("io.ktor:ktor-server-core-jvm")
    implementation("io.ktor:ktor-server-netty-jvm")
    implementation("io.ktor:ktor-server-content-negotiation-jvm")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm")
    implementation("ch.qos.logback:logback-classic:1.4.14")
    testImplementation("io.ktor:ktor-server-tests-jvm")
}

application {
    mainClass.set("com.example.ApplicationKt")
}
```

### Android 项目配置

```kotlin
plugins {
    id("com.android.application") version "8.2.0"
    kotlin("android") version "2.0.0"
}

android {
    namespace = "com.example.myapp"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.myapp"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.compose.material3:material3:1.2.0")
}
```

## 注意事项

- **Kotlin DSL 需要学习成本**：如果你之前用 Groovy，切换到 Kotlin DSL 需要适应语法差异
- **构建缓存**：启用构建缓存可以显著加快构建速度，在 `gradle.properties` 中添加 `org.gradle.caching=true`
- **版本冲突**：使用 `./gradlew dependencies` 查看依赖树，排查版本冲突
- **不要在构建脚本中写复杂逻辑**：构建脚本应该简洁，复杂逻辑应该放在 buildSrc 或插件中
- **Gradle Wrapper**：始终使用 Gradle Wrapper（`./gradlew`），确保团队成员使用相同的 Gradle 版本

## 进阶用法

### buildSrc 共享构建逻辑

```
项目根目录/
  buildSrc/
    build.gradle.kts
    src/main/kotlin/
      Dependencies.kt
      AndroidConfig.kt
```

```kotlin
// buildSrc/src/main/kotlin/Dependencies.kt
object Dependencies {
    const val kotlinVersion = "2.0.0"
    const val coroutinesVersion = "1.8.0"

    object Kotlin {
        const val stdlib = "org.jetbrains.kotlin:kotlin-stdlib:$kotlinVersion"
        const val reflect = "org.jetbrains.kotlin:kotlin-reflect:$kotlinVersion"
    }

    object Coroutines {
        const val core = "org.jetbrains.kotlinx:kotlinx-coroutines-core:$coroutinesVersion"
        const val test = "org.jetbrains.kotlinx:kotlinx-coroutines-test:$coroutinesVersion"
    }
}
```

```kotlin
// 在子模块中使用
dependencies {
    implementation(Dependencies.Kotlin.stdlib)
    implementation(Dependencies.Coroutines.core)
}
```

### Convention Plugin

```kotlin
// buildSrc/src/main/kotlin/kotlin-jvm-convention.gradle.kts
plugins {
    kotlin("jvm")
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    testImplementation(kotlin("test"))
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

```kotlin
// 在子模块中应用
plugins {
    id("kotlin-jvm-convention")
}
```

### Gradle 配置优化

```properties
# gradle.properties
# 启用并行构建
org.gradle.parallel=true
# 启用构建缓存
org.gradle.caching=true
# 增加 JVM 内存
org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m
# 启用配置缓存（实验性）
org.gradle.configuration-cache=true
```
