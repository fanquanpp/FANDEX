---
order: 450
title: Kotlin 与 Gradle
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 用 Gradle Kotlin DSL 构建 Kotlin 项目：依赖管理、版本目录、多模块、K2 编译器配置与构建提速。
author: fanquanpp
updated: '2026-10-05'
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
    // 协程测试：runTest 虚拟时间的入口（用法见协程测试篇）
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
}
```

测试依赖的完整选型与框架配置（JUnit 5/Kotest/MockK/Kotlin 协程测试）分别在[Kotlin 测试框架集成](/kotlin/380-KotlinTestBestPractice)与[Kotlin 协程测试](/kotlin/395-KotlinCoroutineTesting)。

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

### 文档与覆盖率工具链：Dokka 与 Kover

两者都是 Gradle 插件，各三步接入：

```kotlin
// build.gradle.kts
plugins {
    id("org.jetbrains.dokka") version "1.9.20"
    id("org.jetbrains.kotlinx.kover") version "0.8.3"
}
```

```bash
./gradlew dokkaHtml              # 生成 KDoc 文档站点（build/dokka/html）
./gradlew koverHtmlReport        # 生成覆盖率报告（build/reports/kover）
./gradlew koverVerify            # 校验覆盖率阈值（需先配置规则）
```

Dokka 的两个实用点：

- KDoc 语法兼容 Markdown，`[ClassName]` 双方括号是**可点击的跨文件链接**，写库/SDK 的团队把它接进 CI，文档随版本发布（`dokkaHtml` 的多模块聚合版叫 `dokkaHtmlMultiModule`，挂在根项目）。
- KDoc 不是 Javadoc：`@param`/`@return` 标签类似但属性文档写在属性声明上而非 getter；从 Javadoc 迁移时 `@author`/`@since` 这类标签 Dokka 不渲染——文档为读者服务，别照搬企业模板。

Kover 覆盖率阈值示例（防覆盖率跳水进主干）：

```kotlin
kover {
    verify {
        rule("行覆盖率不低于 60%") {
            bound { minValue = 60 }     // 百分比
        }
    }
}
```

易错点：Kover 统计的是 **JaCoCo 同源的行/分支覆盖**，它测不出「断言写弱了」——覆盖率 100% 只说明每行执行过，不代表每行被验证。变异测试补这个盲区（原理与工具见 [CI/CD 测试](/software-testing/230-CICDTest)的变异测试节）。另一个易错点：Android 模块的覆盖率统计需要 `kover` 与 AGP 的构建变体配合，纯 JVM 模块开箱即用；给整个仓库上阈值前先单模块试跑。

### 配置缓存与构建缓存出问题时的排查实操

概念在前文「底层原理」已讲（配置缓存序列化任务图，构建缓存复用任务输出）。这里给排障顺序：

```bash
# 1. 配置缓存报错：看它生成的报告
./gradlew --configuration-cache
# 报错会给出 HTML 报告路径（build/reports/configuration-cache/），
# 常见两种：构建脚本里用了「构建时未知」的值（读环境变量、File(...) 直接参与任务配置），
# 或第三方插件不兼容。

# 2. 判断是配置慢还是执行慢
./gradlew --profile clean build
# 打开 build/reports/profile/：Summary 里 Configuration 占比高 → 配置缓存有救；
# 任务执行占比高 → 看哪个任务最慢、是否 up-to-date 失效。

# 3. 任务明明没变却重跑：查 up-to-date 失效原因
./gradlew build --info | grep "not up-to-date"
# 典型原因：输入文件时间戳变化（代码生成任务不稳定输出）、
# 任务用了 System.currentTimeMillis() 这类隐式输入、构建缓存未命中（路径大小写/绝对路径混进任务输入）。

# 4. 构建缓存命中率验证
./gradlew clean build          # 第一次
./gradlew clean build          # 第二次应大量 FROM-CACHE
```

- 报告定位法优先于猜：配置缓存的 HTML 报告直接列出「哪个脚本第几行」用了不兼容 API；先读报告再改代码，避免「注释掉试试」式盲修。
- 易错点：`gradle.properties` 里的 `org.gradle.configuration-cache=true` 对所有任务生效，包括 IDE 同步——插件不兼容时 IDE 同步也失败，回退开关是命令行 `--no-configuration-cache`（临时）与 `org.gradle.configuration-cache=false`（项目级关闭）。
- CI 与本地的缓存行为差异：CI 干净环境只有**远程构建缓存**可用；本地命中不了常因为 `gradle.properties` 没开 `org.gradle.caching` 或任务输入里有本机绝对路径。

## 注意事项与常见陷阱

1. **依赖坐标字符串拼错是最高频错误**：优先使用版本目录，坐标集中在一处；`./gradlew dependencies` 查看依赖树排查版本冲突。
2. **脚本内定义的变量作用域只在当前块**：在 `dependencies {}` 里定义的 `val` 不能在其他块引用（这也是旧教程常出现的复制粘贴 bug），跨脚本共享请用版本目录。
3. **`kotlinOptions` 逐步退役**：新项目一律用 `compilerOptions {}`；网上旧教程（含 `jvmTarget = "17"` 字符串赋值写法）迁移时注意 API 差异。
4. **Kotlin DSL 需要学习成本**：如果你之前用 Groovy，切换到 Kotlin DSL 需要适应"类型检查更严、脚本在配置阶段编译"的差异——好处是写错立刻在 IDE 与构建时报错。
5. **不要在构建脚本中写复杂逻辑**：构建脚本应该简洁，复杂逻辑放在 buildSrc 或 Convention Plugin 中；但 buildSrc 的任何改动会使所有模块重新编译，纯版本常量优先迁去版本目录。
6. **Gradle Wrapper**：始终使用 Gradle Wrapper（`./gradlew`），确保团队成员使用相同的 Gradle 版本；Kotlin 2.2 需要较新的 Gradle（8.10+ 为宜），升级 Kotlin 与升级 Gradle 常需要成对进行。

## 底层原理：构建脚本的一次「编译加执行」

理解 Gradle 行为的关键是把构建分成三个阶段：

1. **初始化**：settings.gradle.kts 决定哪些模块参与构建；
2. **配置**：每个 build.gradle.kts 被**当作 Kotlin 程序编译并执行**——你在脚本里
   写的所有语句（包括 `dependencies {}` 块）此刻按顺序运行一遍，产出一张
   「任务及其依赖关系」的图；
3. **执行**：Gradle 从任务图中挑出本次命令需要的任务（含 up-to-date 判断）执行。

三个推论能解释大部分「为什么」：

- 为什么 Kotlin DSL 写错坐标会**编译报错**而 Groovy 只在运行时才炸——配置阶段
  本来就是一次编译；
- 为什么「脚本顶层随手写的 println」每次构建都会打印（哪怕只跑 `gradlew help`），
  而 `doLast {}` 里的只在任务执行时打印——前者在配置阶段运行，后者在执行阶段运行；
- 为什么 buildSrc 一改全量重编——buildSrc 是配置阶段的输入，它变了所有脚本的
  编译产物失效；
- 配置缓存为什么能提速——它把「配置阶段的任务图」序列化复用，跳过重复的脚本
  编译执行（这也是它对插件兼容性挑剔的原因）。

`implementation` 与 `api` 的区别同样能从编译模型推出：`api` 里的类型会出现在本模块
**对外暴露的 ABI**（公开函数签名、公开父类）中，所以消费方编译时必须看见它——
传递；`implementation` 只在本模块内部使用，消费方编译不需要，改版本时也不会
触发下游重编——不传递。判断口诀：**这个依赖的类型会出现在我的公开签名里吗？
会就 api，不会就 implementation。**

## 面试题思路：三个高频考法

1. 「implementation 和 api 怎么选？」——按上面的 ABI 口诀答，并补一条工程后果：
   库项目里把本该 api 的写成 implementation 会让消费方编译失败；反过来全用 api
   则依赖树膨胀、版本升级重编面扩大。追问「如何检查」：对库模块跑
   `./gradlew build` 的 ABI 校验（Kotlin 显式 api 模式）或依赖分析报告
   （`./gradlew buildHealth`，需 dependency analysis 插件）是加分项。
2. 「Gradle 构建慢，你会从哪里入手？」——期望的框架：先测量
   （`./gradlew --profile` 或 build scan 定位慢在配置还是执行）；配置慢上配置缓存，
   执行慢上并行 + 构建缓存；再查 up-to-date 失效原因（`--info` 里的
   「Task :x is not up-to-date because...」）。能说出「不要盲目调 Xmx、先看瓶颈
   在哪个阶段」体现测量优先的纪律。
3. 「版本目录解决了什么问题？」——三个：坐标与版本集中一处（升级只改 toml）；
   类型安全的访问器（写错编译报错，IDE 可补全）；替代 buildSrc 常量对象带来的
   全量重编。能补充「toml 支持 bundle（依赖捆绑）与 plugin 声明」是加分项。

## 动手实验

1. **三个阶段实验**：在 build.gradle.kts 顶层加一行 `println("配置阶段")`，在
   `tasks.register("hello") { doLast { println("执行阶段") } }`，分别跑
   `./gradlew help`、`./gradlew hello`、`./gradlew hello`（第二次），观察三者的
   输出差异与 up-to-date 行为。
2. **依赖传递实验**：建 shared（含 api 一个 data class）与 server（implementation
   依赖 shared）两模块，在 server 里写一个「公开函数签名引用 shared 类型」的函数，
   新建第三个模块消费它——亲眼看到编译失败；把 implementation 改成 api 修复。
3. **版本目录迁移实验**：把一个散落字符串坐标的项目（或本文快速上手的骨架）迁移到
   `libs.versions.toml`，故意把 `libs.coroutines.core` 写错一个字母，观察 IDE 与
   构建期报错形态。
4. **构建缓存验证**：跑两次 `./gradlew clean build`（第二次开
   `org.gradle.caching=true`），对比 BUILD SUCCESSFUL 旁的 up-to-date/
   FROM-CACHE 标记；再改一个源文件重跑，观察只有受影响的任务重新执行。

## 小练习（先自己做，再展开参考实现）

**练习 1：给骨架项目装上「发布可用的」构建配置**。要求：(a) 全部依赖走版本目录；
(b) 生成可双击运行的 fat jar（提示：application 插件 + `jar` 任务加
`duplicatesStrategy` 与 Manifest 主类，或用 shadow 插件）；(c) `./gradlew test`
输出每个用例的通过/失败状态。先列改动清单，再动手。

参考实现（fat jar 用原生 jar 任务版，不引第三方插件）：

```toml
# gradle/libs.versions.toml
[versions]
kotlin = "2.2.0"

[libraries]
kotlin-stdlib = { module = "org.jetbrains.kotlin:kotlin-stdlib", version.ref = "kotlin" }
kotlin-test = { module = "org.jetbrains.kotlin:kotlin-test", version.ref = "kotlin" }

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
```

```kotlin
// build.gradle.kts
plugins {
    alias(libs.plugins.kotlin.jvm)
    application
}

repositories { mavenCentral() }

dependencies {
    implementation(libs.kotlin.stdlib)
    testImplementation(libs.kotlin.test)
}

application { mainClass.set("com.example.MainKt") }

kotlin { jvmToolchain(21) }

tasks.withType<Test> {
    useJUnitPlatform()
    testLogging { events("passed", "failed", "skipped") }
}

// fat jar：把运行时依赖解包进同一个 jar 并指定主类
tasks.jar {
    manifest { attributes["Main-Class"] = "com.example.MainKt" }
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
}
```

自检问题：为什么 fat jar 要设 `DuplicatesStrategy`？（答：多个依赖 jar 里都有
`META-INF/LICENSE` 这类同名文件，解包合并时必须声明遇到重复条目的策略，否则
构建报错。）

**练习 2：修一个「构建脚本坏味道」项目**。给定如下脚本，指出三处问题并重构：

```kotlin
// build.gradle.kts（问题版）
val coroutinesVersion = "1.10.2"
val ktorVersion = "3.2.0"

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:$coroutinesVersion")
    testImplementation("io.ktor:ktor-server-tests-jvm:$ktorVersion")   // ？
    api("ch.qos.logback:logback-classic:1.5.18")                       // ？
}
```

参考答案：三处问题——(a) 版本常量写在脚本内，作用域只在当前文件（陷阱 2），
应迁往版本目录；(b) 测试专用依赖应放 `testImplementation` 没错，但 Ktor 的
server-tests 坐标用在了依赖 ktor 的项目里却缺少主依赖声明（此处缺
`ktor-server-core`），依赖来源不完整；(c) `logback` 是日志实现，只在运行时需要，
`api` 会把它传递给所有消费方并放大重编面——正确配置是 `runtimeOnly`。

**挑战题（不给参考实现）**：把一个 Groovy 构建脚本（网上随便找一个教程项目）
翻译成 Kotlin DSL + 版本目录，并把遇到的每一处「翻译不了」记下来（通常集中在
动态字符串与 `ext` 变量），写五句迁移心得。写完自查：迁移后
`./gradlew build --warning-mode all` 还有没有警告？

## 小结

- Kotlin DSL + 版本目录 + Wrapper 是当前 Kotlin 工程的三件套：类型安全、集中管理、版本一致。
- 依赖配置按传递性选择：`implementation` 默认首选，`api` 用于库的公开类型，`runtimeOnly`/`compileOnly` 处理特例。
- Kotlin 2.x 用 `compilerOptions {}` 配置编译器，`kotlinOptions` 不再用于新项目；Compose 编译器改用 `org.jetbrains.kotlin.plugin.compose` 插件。
- 提速三板斧：并行构建、构建缓存、配置缓存（Gradle 8.1+ 稳定）。
- 编译器插件的原理与更多选项见 [Kotlin 编译器插件](/kotlin/420-KotlinCompilerPlugin)；Android 工程完整实践见 [Kotlin 与 Android](/kotlin/440-KotlinAndroid)。
