---
order: 17
title: 'Kotlin 多平台'
module: kotlin
category: Kotlin
difficulty: advanced
description: 'KMP 架构、expect/actual、共享代码策略、Compose Multiplatform 与 Gradle 配置。'
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/集合与协程
  - kotlin/协程进阶
  - kotlin/DSL与领域特定语言
  - kotlin/测试与最佳实践
prerequisites: []
---

## 1. KMP 架构概述

Kotlin Multiplatform (KMP) 是 JetBrains 推出的多平台开发方案，允许在平台间共享 Kotlin 代码，同时保留平台特定实现的能力。2024 年 Kotlin 2.1 正式将 KMP 标记为稳定版。

### 1.1 核心理念

```
┌─────────────────────────────────────────────┐
│              Shared Kotlin Code              │
│         (业务逻辑、数据模型、工具类)          │
├──────────┬──────────┬───────────┬───────────┤
│  Android │   iOS    │    Web    │  Desktop  │
│ (JVM/ART)│ (Native) │  (JS/Wasm)│ (JVM/Native)│
└──────────┴──────────┴───────────┴───────────┘
```

### 1.2 代码共享策略

| 策略     | 共享内容                 | 适用场景                         |
| -------- | ------------------------ | -------------------------------- |
| 共享逻辑 | 网络层、数据层、业务逻辑 | 最常见，推荐入门                 |
| 共享 UI  | Compose Multiplatform UI | 2024+ 逐渐成熟                   |
| 完全共享 | 逻辑 + UI + 平台适配     | Compose Multiplatform 全平台应用 |

### 1.3 源集结构

```
shared/
├── src/
│   ├── commonMain/          # 所有平台共享
│   │   └── kotlin/
│   ├── commonTest/          # 共享测试
│   │   └── kotlin/
│   ├── androidMain/         # Android 特定
│   │   └── kotlin/
│   ├── androidUnitTest/
│   ├── iosMain/             # iOS 特定
│   │   └── kotlin/
│   ├── jsMain/              # JS 特定
│   │   └── kotlin/
│   ├── jvmMain/             # JVM 特定
│   │   └── kotlin/
│   ├── nativeMain/          # 所有 Native 平台共享
│   │   └── kotlin/
│   ├── appleMain/           # Apple 平台共享
│   │   └── kotlin/
│   ├── wasmJsMain/          # Wasm/JS 特定
│   │   └── kotlin/
```

## 2. expect/actual 声明

`expect/actual` 是 KMP 的核心机制，用于声明平台差异化的 API：

### 2.1 expect 声明（共享代码中）

```kotlin
// commonMain/kotlin/platform/Logger.kt
expect class Logger() {
    fun debug(message: String)
    fun error(message: String)
}

// expect 函数
expect fun getPlatformName(): String

// expect 属性
expect val currentTimestamp: Long

// expect 对象
expect object FileSystem {
    fun read(path: String): ByteArray
    fun write(path: String, data: ByteArray)
}
```

### 2.2 actual 实现（平台代码中）

```kotlin
// androidMain/kotlin/platform/Logger.kt
actual class Logger actual constructor() {
    actual fun debug(message: String) {
        Log.d("App", message)
    }
    actual fun error(message: String) {
        Log.e("App", message)
    }
}

actual fun getPlatformName(): String = "Android"
actual val currentTimestamp: Long = System.currentTimeMillis()

// iosMain/kotlin/platform/Logger.kt
actual class Logger actual constructor() {
    actual fun debug(message: String) {
        NSLog("App: $message")
    }
    actual fun error(message: String) {
        NSLog("App ERROR: $message")
    }
}

actual fun getPlatformName(): String = "iOS"
actual val currentTimestamp: Long = NSDate().timeIntervalSince1970.toLong() * 1000
```

### 2.3 expect/actual 规则

- `expect` 声明不能有默认实现
- `actual` 实现必须与 `expect` 声明完全匹配
- 每个 `expect` 必须在所有目标平台有对应的 `actual`
- `actual` 类的构造函数也需 `actual constructor()`

## 3. 共享代码实践

### 3.1 网络层共享

```kotlin
// commonMain
interface ApiClient {
    suspend fun <T> request(endpoint: String): Result<T>
}

class Repository(private val api: ApiClient) {
    suspend fun fetchUsers(): Result<List<User>> =
        api.request("/api/users")
}

// 使用 Ktor 实现跨平台网络
// build.gradle.kts (shared)
kotlin {
    sourceSets {
        commonMain {
            dependencies {
                implementation("io.ktor:ktor-client-core:3.0.0")
                implementation("io.ktor:ktor-client-content-negotiation:3.0.0")
                implementation("io.ktor:ktor-serialization-kotlinx-json:3.0.0")
            }
        }
        androidMain {
            dependencies {
                implementation("io.ktor:ktor-client-okhttp:3.0.0")
            }
        }
        iosMain {
            dependencies {
                implementation("io.ktor:ktor-client-darwin:3.0.0")
            }
        }
    }
}
```

### 3.2 数据存储共享

```kotlin
// commonMain
expect class DataStoreFactory {
    fun create(name: String): DataStore<Preferences>
}

// 使用多平台设置库
// commonMain
class SettingsRepository(private val settings: Settings) {
    var theme: String by settings.stringBinding("theme", "system")
    var fontSize: Int by settings.intBinding("fontSize", 14)
}
```

### 3.3 日期时间共享

```kotlin
// 使用 kotlinx-datetime（跨平台日期时间库）
import kotlinx.datetime.*

fun getCurrentDate(): LocalDate = Clock.System.todayIn(TimeZone.currentSystemDefault())

fun formatInstant(instant: Instant): String {
    return instant.toString()
}
```

## 4. Compose Multiplatform

Compose Multiplatform 是基于 Jetpack Compose 的跨平台 UI 框架：

### 4.1 项目配置

```kotlin
// build.gradle.kts (shared)
plugins {
    kotlin("multiplatform")
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.compose")
}

kotlin {
    androidTarget()
    iosX64()
    iosArm64()
    iosSimulatorArm64()
    jvm("desktop")
    wasmJs { browser() }

    sourceSets {
        commonMain {
            dependencies {
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.components.resources)
            }
        }
    }
}
```

### 4.2 共享 UI 组件

```kotlin
// commonMain
@Composable
fun App() {
    var selectedTab by remember { mutableIntStateOf(0) }

    MaterialTheme {
        Scaffold(
            bottomBar = {
                NavigationBar {
                    NavigationBarItem(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        icon = { Icon(Icons.Default.Home, "Home") },
                        label = { Text("Home") }
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        icon = { Icon(Icons.Default.Settings, "Settings") },
                        label = { Text("Settings") }
                    )
                }
            }
        ) { padding ->
            when (selectedTab) {
                0 -> HomeScreen(Modifier.padding(padding))
                1 -> SettingsScreen(Modifier.padding(padding))
            }
        }
    }
}

@Composable
fun HomeScreen(modifier: Modifier = Modifier) {
    LazyColumn(modifier = modifier.fillMaxSize()) {
        items(getItems()) { item ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Text(item.title, modifier = Modifier.padding(16.dp))
            }
        }
    }
}
```

### 4.3 平台入口

```kotlin
// Android — MainActivity.kt
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { App() }
    }
}

// iOS — MainViewController.kt
fun MainViewController() = ComposeUIViewController { App() }

// Desktop — Main.kt
fun main() = application {
    Window(onCloseRequest = ::exitApplication, title = "My App") {
        App()
    }
}

// Web — Main.kt
@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    CanvasBasedWindow("My App") { App() }
}
```

## 5. iOS 集成

### 5.1 导出框架

```kotlin
kotlin {
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    listOf(iosX64(), iosArm64(), iosSimulatorArm64()).forEach {
        it.binaries.framework {
            baseName = "shared"
            isStatic = true  // 推荐，避免动态库问题
        }
    }
}
```

### 5.2 Swift 互操作

```swift
// Swift 中使用 Kotlin 共享代码
let repository = Repository(apiClient: ApiClient())
let users = try await repository.fetchUsers()

// Kotlin 的 suspend 函数自动转为 Swift async/await
// Result 类型自动映射
```

### 5.3 ObjC 兼容性

```kotlin
// 使用 @ObjCName 自定义 ObjC 名称
@ObjCName("KMPLogger")
class Logger {
    @ObjCName("logMessage")
    fun log(message: String) { /* ... */ }
}
```

## 6. Gradle 配置

### 6.1 完整 KMP 项目配置

```kotlin
// build.gradle.kts (项目根)
plugins {
    kotlin("multiplatform") version "2.2.0" apply false
    id("org.jetbrains.compose") version "1.8.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.2.0" apply false
}

// build.gradle.kts (shared module)
plugins {
    kotlin("multiplatform")
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.compose")
}

kotlin {
    // 目标平台
    androidTarget {
        compilations.all {
            kotlinOptions {
                jvmTarget = "17"
            }
        }
    }

    iosX64()
    iosArm64()
    iosSimulatorArm64()

    jvm("desktop")

    wasmJs {
        browser()
    }

    // 源集依赖
    sourceSets {
        commonMain.dependencies {
            implementation("io.ktor:ktor-client-core:3.0.0")
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.1")
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.0")
            implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.0")
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.1")
        }
        androidMain.dependencies {
            implementation("io.ktor:ktor-client-okhttp:3.0.0")
        }
        iosMain.dependencies {
            implementation("io.ktor:ktor-client-darwin:3.0.0")
        }
        desktopMain.dependencies {
            implementation("io.ktor:ktor-client-okhttp:3.0.0")
            implementation(compose.desktop.currentOs)
        }
    }
}
```

### 6.2 版本目录（Version Catalog）

```kotlin
// gradle/libs.versions.toml
[versions]
kotlin = "2.2.0"
compose = "1.8.0"
ktor = "3.0.0"
coroutines = "1.10.1"
serialization = "1.7.0"

[libraries]
kotlinx-coroutines-core = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-core", version.ref = "coroutines" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "serialization" }
ktor-client-core = { group = "io.ktor", name = "ktor-client-core", version.ref = "ktor" }
```

## 7. 常用 KMP 库

| 领域   | 库                     | 说明                      |
| ------ | ---------------------- | ------------------------- |
| 网络   | Ktor                   | 跨平台 HTTP 客户端/服务端 |
| 序列化 | kotlinx.serialization  | JSON/ProtoBuf/CBOR        |
| 日期   | kotlinx-datetime       | 跨平台日期时间            |
| 协程   | kotlinx-coroutines     | 跨平台协程                |
| 存储   | multiplatform-settings | 跨平台键值存储            |
| 数据库 | SQLDelight             | 类型安全跨平台 SQL        |
| 日志   | Kermit                 | 跨平台日志库              |
| DI     | Koin                   | 跨平台依赖注入            |
| UI     | Compose Multiplatform  | 跨平台 UI 框架            |
| 导航   | Decompose              | 跨平台导航/状态管理       |

## 8. KMP 项目最佳实践

1. **从共享逻辑开始**：先共享网络层和数据层，UI 层各平台原生实现
2. **使用 expect/actual 最小化**：尽量使用跨平台库，减少平台特定代码
3. **API 设计考虑互操作**：注意 Kotlin 与 Swift/JS 的类型映射差异
4. **利用版本目录**：统一管理依赖版本
5. **CI/CD 多平台构建**：iOS 构建需要 macOS 运行环境
