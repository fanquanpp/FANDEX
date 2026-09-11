---
order: 410
title: Kotlin 与 Gradle
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 用 Gradle Kotlin DSL 构建 Kotlin 项目：依赖管理、版本目录、多模块、K2 编译器配置与构建提速。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'kotlin/420-KotlinCompilerPlugin'
  - 'kotlin/440-KotlinAndroid'
  - 'kotlin/490-KotlinKtor'
  - 'kotlin/390-KotlinTest'
prerequisites:
  - 'kotlin/020-KotlinOverviewEnvSetup'
---

## 概述

Gradle 是 Kotlin 项目最常用的构建工具，而 Kotlin DSL 是 Gradle 官方推荐的构建脚本编写方式（新建项目默认生成）。与传统的 Groovy DSL 相比，Kotlin DSL 提供了编译期类型检查、IDE 自动补全和更好的重构支持。理解 Gradle Kotlin DSL 是搭建和管理 Kotlin 项目的基础。

本文涵盖：单模块项目骨架、依赖管理、版本目录（Version Catalog）、多模块项目、Kotlin 2.x 编译器选项的新 DSL 与常见构建提速手段。

## 基础概念

- **build.gradle.kts**：Kotlin DSL 构建脚本，用 Kotlin 代码描述构建逻辑
- **settings.gradle.kts**：项目设置文件，定义项目名称、子模块与依赖仓库
- **gradle.properties**：Gradle 属性文件，配置 JVM 参数、缓存开关等
- **Plugin（插件）**：扩展 Gradle 功能，如 `kotlin("jvm")`、`application` 等
- **Task（任务）**：构建的基本执行单元，如编译、测试、打包
- **Configuration（配置）**：依赖的分组，如 `implementation`、`testImplementation` 等
- **版本目录（Version Catalog）**：`gradle/libs.versions.toml` 集中管理依赖坐标与版本，Gradle 7.4 起稳定

## 快速上手

创建一个最简单的 Kotlin 项目，需要两个文件：

```kotlin
// settings.gradle.kts
rootProject.name = "my-app"
```

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.2.0"   // K2 时代版本线，2.0+ 默认 K2 编译器
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

// 统一 JDK 版本（Gradle 会自动探测/下载对应 JDK）
kotlin {
    jvmToolchain(21)
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
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")

    // api：编译和运行时都需要，且会传递给依赖此模块的模块（需应用 kotlin("jvm") 的 api 配置）
    api("com.example:shared-library:1.0.0")

    // compileOnly：只在编译时需要，运行时不需要
    compileOnly("org.projectlombok:lombok:1.18.36")

    // runtimeOnly：只在运行时需要
    runtimeOnly("com.h2database:h2:2.3.232")

    // testImplementation：只在测试编译和运行时需要
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testImplementation("io.mockk:mockk:1.13.16")
}
```

### 使用版本目录管理依赖

版本目录是当前官方推荐的依赖管理方式（替代散落在脚本里的字符串与 buildSrc 常量对象）：

```toml
# gradle/libs.versions.toml
[versions]
kotlin = "2.2.0"
coroutines = "1.10.2"
ktor = "3.2.0"

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
```

```kotlin
// build.gradle.kts（根项目）
plugins {
    kotlin("jvm") version "2.2.0" apply false  // 版本只声明一次，子模块不写版本
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
    implementation(project(":shared"))          // 依赖 shared 模块
    implementation("io.ktor:ktor-server-netty-jvm:3.2.0")
}

application {
    mainClass.set("com.example.server.MainKt")
}
```

### Kotlin 2.x 编译器选项：compilerOptions DSL

Kotlin 2.x 推荐 `compilerOptions {}` 扩展（类型安全、可复用）；旧的 `kotlinOptions {}` 已进入维护状态并在向新 DSL 迁移：

```kotlin
// build.gradle.kts
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)      // 生成的字节码目标
        freeCompilerArgs.addAll(
            "-Xjsr305=strict",               // 严格模式处理 JSR-305 空安全注解
            "-opt-in=kotlin.RequiresOptIn",  // 批量 opt-in 实验性 API
        )
    }
}

// 多模块统一配置：在根项目的 build.gradle.kts 中
subprojects {
    plugins.withType<org.jetbrains.kotlin.gradle.plugin.KotlinBasePlugin> {
        // 所有 Kotlin 编译任务共享的选项
        tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
            compilerOptions {
                freeCompilerArgs.add("-Xjsr305=strict")
            }
        }
    }
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

## 常见场景

### Spring Boot 项目配置

```kotlin
plugins {
    kotlin("jvm") version "2.2.0"
    kotlin("plugin.spring") version "2.2.0"  // open 化 Spring Bean 类，绕过 final-by-default
    kotlin("plugin.jpa") version "2.2.0"     // JPA 实体无参构造与延迟加载适配
    id("org.springframework.boot") version "3.4.0"
    id("io.spring.dependency-management") version "1.1.7"
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

Ktor 3.x 的插件与依赖坐标（`-jvm` 后缀）：

```kotlin
plugins {
    kotlin("jvm") version "2.2.0"
    kotlin("plugin.serialization") version "2.2.0"
    id("io.ktor.plugin") version "3.2.0"
    application
}

dependencies {
    implementation("io.ktor:ktor-server-core-jvm")
    implementation("io.ktor:ktor-server-netty-jvm")
    implementation("io.ktor:ktor-server-content-negotiation-jvm")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm")
    implementation("ch.qos.logback:logback-classic:1.5.18")
    testImplementation("io.ktor:ktor-server-tests-jvm")
}

application {
    mainClass.set("com.example.ApplicationKt")
}
```

### Android 项目配置（Kotlin 2.0+ Compose）

Kotlin 2.0 起 Compose 编译器随 Kotlin 版本一起发布，改用官方 Compose 编译器插件，不再需要 `composeOptions.kotlinCompilerExtensionVersion`：

```kotlin
plugins {
    id("com.android.application") version "8.7.0"
    kotlin("android") version "2.2.0"
    alias(libs.plugins.kotlin.compose)  // 即 org.jetbrains.kotlin.plugin.compose，版本随 Kotlin
}

android {
    namespace = "com.example.myapp"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.myapp"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.compose.material3:material3:1.3.1")
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
# 配置缓存（Gradle 8.1 起稳定，可大幅缩短重复构建的配置阶段）
org.gradle.configuration-cache=true
```

## 注意事项与常见陷阱

1. **依赖坐标字符串拼错是最高频错误**：优先使用版本目录，坐标集中在一处；`./gradlew dependencies` 查看依赖树排查版本冲突。
2. **脚本内定义的变量作用域只在当前块**：在 `dependencies {}` 里定义的 `val` 不能在其他块引用（这也是旧教程常出现的复制粘贴 bug），跨脚本共享请用版本目录。
3. **`kotlinOptions` 逐步退役**：新项目一律用 `compilerOptions {}`；网上旧教程（含 `jvmTarget = "17"` 字符串赋值写法）迁移时注意 API 差异。
4. **Kotlin DSL 需要学习成本**：如果你之前用 Groovy，切换到 Kotlin DSL 需要适应"类型检查更严、脚本在配置阶段编译"的差异——好处是写错立刻在 IDE 与构建时报错。
5. **不要在构建脚本中写复杂逻辑**：构建脚本应该简洁，复杂逻辑放在 buildSrc 或 Convention Plugin 中；但 buildSrc 的任何改动会使所有模块重新编译，纯版本常量优先迁去版本目录。
6. **Gradle Wrapper**：始终使用 Gradle Wrapper（`./gradlew`），确保团队成员使用相同的 Gradle 版本；Kotlin 2.2 需要较新的 Gradle（8.10+ 为宜），升级 Kotlin 与升级 Gradle 常需要成对进行。

## 小结

- Kotlin DSL + 版本目录 + Wrapper 是当前 Kotlin 工程的三件套：类型安全、集中管理、版本一致。
- 依赖配置按传递性选择：`implementation` 默认首选，`api` 用于库的公开类型，`runtimeOnly`/`compileOnly` 处理特例。
- Kotlin 2.x 用 `compilerOptions {}` 配置编译器，`kotlinOptions` 不再用于新项目；Compose 编译器改用 `org.jetbrains.kotlin.plugin.compose` 插件。
- 提速三板斧：并行构建、构建缓存、配置缓存（Gradle 8.1+ 稳定）。
- 编译器插件的原理与更多选项见 [Kotlin 编译器插件](/kotlin/420-KotlinCompilerPlugin)；Android 工程完整实践见 [Kotlin 与 Android](/kotlin/440-KotlinAndroid)。
