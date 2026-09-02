## 前置知识

- [Kotlin 类型系统](/kotlin/028-KotlinTypeSystem)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱



﻿# Kotlin kotlinc 编译命令速查手册

---

## 概述

Jetpack Compose 是 Google 推出的现代声明式 UI 工具包，用于构建 Android、桌面（Compose Desktop）和 Web（Compose for Web）应用。与传统的 XML 布局不同，Compose 用 Kotlin 代码直接描述 UI，通过状态驱动自动更新界面，大幅减少了模板代码。

Compose 的核心理念是：UI 是状态的函数。当状态变化时，Compose 会自动重新渲染受影响的部分，你不需要手动操作视图。

## 基础概念

- **@Composable**：标记一个函数为可组合函数，这是 Compose 的基本构建单元
- **State（状态）**：驱动 UI 更新的数据，用 `mutableStateOf` 创建，状态变化时自动触发重组
- **Recomposition（重组）**：当状态变化时，Compose 重新执行相关的可组合函数来更新 UI
- **Remember**：在重组过程中保持数据不被重置，用 `remember` 缓存计算结果
- **Modifier（修饰符）**：用于调整组件的外观和行为，如大小、边距、点击事件等

## 快速上手

添加依赖：

```kotlin
// build.gradle.kts (Android)
dependencies {
    implementation("androidx.compose.ui:ui:1.6.0")
    implementation("androidx.compose.material3:material3:1.2.0")
    implementation("androidx.compose.ui:ui-tooling-preview:1.6.0")
    implementation("androidx.activity:activity-compose:1.8.0")
}

// build.gradle.kts (Desktop)
plugins {
    id("org.jetbrains.compose") version "1.6.0"
}
```

最简单的 Compose 应用：

```kotlin
import androidx.compose.material3.*
import androidx.compose.runtime.*

fun main() = application {
    Window(onCloseRequest = ::exitApplication, title = "我的应用") {
        // 可组合函数
        MaterialTheme {
            Greeting("Compose")
        }
    }
}

// 用 @Composable 标记可组合函数
@Composable
fun Greeting(name: String) {
    // 定义状态，点击按钮时计数增加
    var count by remember { mutableStateOf(0) }

    Column {
        // 显示文本
        Text("Hello, $name! 点击次数: $count")
        // 按钮，点击时修改状态
        Button(onClick = { count++ }) {
            Text("点击我")
        }
    }
}
```

## 详细用法

### 状态管理

状态是 Compose 的核心，理解状态管理是掌握 Compose 的关键：

```kotlin
import androidx.compose.runtime.*

// 简单状态
@Composable
fun SimpleState() {
    // remember 保存状态，mutableStateOf 创建可观察的状态
    var name by remember { mutableStateOf("") }

    Column {
        TextField(
            value = name,
            onValueChange = { name = it },  // 输入时更新状态
            label = { Text("请输入姓名") }
        )
        Text("你好, $name")
    }
}

// 状态提升：将状态移到调用方
@Composable
fun StateHoisting() {
    // 状态在父组件中管理
    var text by remember { mutableStateOf("") }
    EditableText(
        text = text,
        onTextChange = { text = it }
    )
}

@Composable
fun EditableText(text: String, onTextChange: (String) -> Unit) {
    // 子组件不持有状态，通过参数接收和回调修改
    TextField(
        value = text,
        onValueChange = onTextChange,
        label = { Text("编辑") }
    )
}
```

### 常用布局组件

```kotlin
@Composable
fun LayoutDemo() {
    // Column：垂直排列
    Column(modifier = Modifier.padding(16.dp)) {
        Text("第一行")
        Text("第二行")

        // Row：水平排列
        Row(modifier = Modifier.fillMaxWidth()) {
            Text("左", modifier = Modifier.weight(1f))
            Text("右", modifier = Modifier.weight(1f))
        }

        // Box：叠加布局
        Box {
            Text("底层内容")
            Text("上层内容", modifier = Modifier.align(Alignment.BottomEnd))
        }
    }
}
```

### 列表

```kotlin
@Composable
fun ListDemo() {
    val items = listOf("苹果", "香蕉", "橘子", "葡萄", "西瓜")

    // LazyColumn：高效的长列表，只渲染可见项
    LazyColumn {
        items(items) { item ->
            ListItem(item)
        }
    }
}

@Composable
fun ListItem(name: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(name, modifier = Modifier.weight(1f))
        IconButton(onClick = { /* 删除操作 */ }) {
            Icon(Icons.Default.Delete, contentDescription = "删除")
        }
    }
}
```

### Modifier 修饰符

```kotlin
@Composable
fun ModifierDemo() {
    Box(
        modifier = Modifier
            .fillMaxSize()                    // 填满父容器
            .background(Color.LightGray)     // 背景色
            .padding(16.dp)                  // 内边距
    ) {
        Text(
            "带修饰符的文本",
            modifier = Modifier
                .clickable { println("被点击") }  // 点击事件
                .background(Color.White)          // 背景色
                .padding(horizontal = 16.dp, vertical = 8.dp)  // 内边距
                .border(1.dp, Color.Gray, RoundedCornerShape(4.dp))  // 边框
        )
    }
}
```

### 副作用

在 Compose 中执行副作用（如网络请求、数据库操作）需要使用 LaunchedEffect：

```kotlin
@Composable
fun SideEffectDemo(userId: String) {
    var user by remember { mutableStateOf<User?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    // LaunchedEffect：当 key 变化时执行
    LaunchedEffect(userId) {
        isLoading = true
        user = fetchUser(userId)  // 挂起函数，自动在协程中执行
        isLoading = false
    }

    if (isLoading) {
        CircularProgressIndicator()
    } else {
        user?.let { Text("用户: ${it.name}") }
    }
}
```

## 常见场景

### 表单输入

```kotlin
@Composable
fun LoginForm() {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    Column(modifier = Modifier.padding(16.dp)) {
        TextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("用户名") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(8.dp))
        TextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("密码") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = {
                message = if (username.isNotEmpty() && password.isNotEmpty()) {
                    "登录成功"
                } else {
                    "请填写所有字段"
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("登录")
        }
        if (message.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(message, color = if (message == "登录成功") Color.Green else Color.Red)
        }
    }
}
```

### 导航

```kotlin
import androidx.navigation.compose.*

@Composable
fun NavDemo() {
    val navController = rememberNavController()

    NavHost(navController, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onNavigateToDetail = { id ->
                    navController.navigate("detail/$id")
                }
            )
        }
        composable(
            "detail/{userId}",
            arguments = listOf(navArgument("userId") { type = NavType.StringType })
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            DetailScreen(userId, onBack = { navController.popBackStack() })
        }
    }
}
```

## 注意事项

- **可组合函数必须是幂等的**：同一个输入应该产生相同的输出，不要在可组合函数中直接修改外部状态
- **不要在 Composable 中执行耗时操作**：网络请求、数据库操作等应放在 ViewModel 或 LaunchedEffect 中
- **重组是局部的**：状态变化时，只有依赖该状态的部分会重组，不是整个界面
- **remember 不能替代 ViewModel**：remember 在配置变更（如旋转屏幕）时会丢失，持久状态应放在 ViewModel 中
- **Modifier 的顺序很重要**：`padding` 在 `clickable` 前面和后面效果不同，先应用的修饰符在外层

## 进阶用法

### 自定义可组合组件

```kotlin
@Composable
fun LoadingButton(
    text: String,
    onClick: () -> Unit,
    isLoading: Boolean = false,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier,
        enabled = !isLoading
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text(text)
    }
}

// 使用自定义组件
@Composable
fun MyScreen() {
    var loading by remember { mutableStateOf(false) }
    LoadingButton(
        text = "提交",
        onClick = {
            loading = true
            // 执行异步操作
        },
        isLoading = loading
    )
}
```

### 动画

```kotlin
@Composable
fun AnimationDemo() {
    var expanded by remember { mutableStateOf(false) }
    // 动画大小
    val size by animateDpAsState(
        targetValue = if (expanded) 200.dp else 100.dp,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
    )
    // 动画颜色
    val color by animateColorAsState(
        targetValue = if (expanded) Color.Red else Color.Blue
    )

    Box(
        modifier = Modifier
            .size(size)
            .background(color)
            .clickable { expanded = !expanded }
    )
}
```

### Compose Desktop 应用

```kotlin
import androidx.compose.desktop.ui.tooling.preview.Preview
import androidx.compose.foundation.layout.*
import androidx.compose.material.*
import androidx.compose.runtime.*
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "桌面应用"
    ) {
        App()
    }
}

@Composable
fun App() {
    var text by remember { mutableStateOf("Hello, Desktop!") }
    MaterialTheme {
        Column(modifier = Modifier.padding(16.dp)) {
            TextField(
                value = text,
                onValueChange = { text = it }
            )
            Button(onClick = { text = "已点击" }) {
                Text("点击")
            }
        }
    }
}
```
## 基本编译

**基本写法：编译单文件**
`kotlinc <源文件> -include-runtime -d <输出jar>`
```bash
# 编译并打包为可执行 jar，附带运行时
kotlinc Main.kt -include-runtime -d app.jar
```

---

**基本写法：运行 jar**
`java -jar <jar文件>`
```bash
# 运行上一步生成的 jar
java -jar app.jar
```

---

**基本写法：编译模块**
`kotlinc <模块名> -include-runtime -d <输出>`
```bash
# 编译整个模块目录
kotlinc src/main/kotlin -include-runtime -d app.jar
```

---

**基本写法：仅编译不打包**
`kotlinc <源> -d <输出目录>`
```bash
# 输出 .class 文件到目录
kotlinc Main.kt -d out
```

---

## 输出目标

**基本写法：指定 JVM 版本**
`kotlinc -jvm-target <版本> -d <输出>`
```bash
# 指定生成的字节码版本
kotlinc Main.kt -jvm-target 21 -d app.jar
```

---

**基本写法：编译为 JavaScript**
`kotlinc -js <源文件> -output <输出js>`
```bash
# 编译为 JavaScript 文件
kotlinc -js Main.kt -output app.js
```

---

**基本写法：编译为 Native 二进制**
`kotlinc-native <源文件> -o <输出名>`
```bash
# 编译为 Kotlin/Native 可执行文件
kotlinc-native Main.kt -o app
```

---

**基本写法：生成 IR**
`kotlinc -js -ir <源> -output <输出>`
```bash
# 使用新 IR 编译器后端
kotlinc -js -ir Main.kt -output app.js
```

---

## 脚本与 REPL

**基本写法：启动 REPL**
`kotlinc`
```bash
# 进入 Kotlin 交互式 REPL
kotlinc
```

---

**基本写法：执行脚本**
`kotlinc -script <脚本.kts> [参数]`
```bash
# 执行 .kts 脚本文件
kotlinc -script build.kts release
```

---

**基本写法：交互式求值**
`kotlinc -e "<代码>"`
```bash
# 直接执行单段代码
kotlinc -e "println(1 + 2)"
```

---

## 依赖与类路径

**基本写法：指定类路径**
`kotlinc -cp <类路径> <源> -d <输出>`
```bash
# 引入 jar 依赖
kotlinc -cp "lib/*" Main.kt -d app.jar
```

---

**基本写法：模块路径**
`kotlinc -module-path <路径> <源>`
```bash
# Java 模块系统支持
kotlinc -module-path mods Main.kt -d out
```

---

**基本写法：生成 Java 模块**
`kotlinc --java-module-path <路径> -d <输出>`
```bash
# 输出 JPMS 兼容模块
kotlinc -module-path mods -java-module-name com.example -d out
```

---

## 编译选项

**基本写法：开启严格可空性**
`kotlinc -Xjsr305=strict <源>`
```bash
# 严格 JSR-305 可空检查
kotlinc -Xjsr305=strict Main.kt -d out
```

---

**基本写法：启用 expect/actual**
`kotlinc -Xmulti-platform <源>`
```bash
# 多平台项目编译
kotlinc -Xmulti-platform commonMain -d out
```

---

**基本写法：开启进阶优化**
`kotlinc -Xopt=kotlin.classes.aligned <源>`
```bash
# 启用特定优化
kotlinc -Xopt=kotlin.classes.aligned Main.kt -d out
```

---

**基本写法：禁用内联**
`kotlinc -Xinline-classes=<模式>`
```bash
# 控制内联类生成
kotlinc -Xinline-classes=true Main.kt -d out
```

---

## 反编译与文档

**基本写法：生成 Kotlin 文档**
`kotlinx-javadoc <源>`
```bash
# 使用 Dokka 生成文档（推荐）
./gradlew dokkaHtml
```

---

**基本写法：反编译查看字节码**
`javap -p -c <class文件>`
```bash
# 查看编译产物字节码
javap -p -c out/Main.class
```

---

## Gradle Kotlin 编译任务

**基本写法：编译命令**
`./gradlew compileKotlin`
```bash
# 触发 Kotlin 编译任务
./gradlew compileKotlin
```

---

**基本写法：编译多平台**
`./gradlew compileKotlinJvm compileKotlinJs`
```bash
# 编译指定目标
./gradlew compileKotlinJvm
./gradlew compileKotlinWasmJs
```

---

**基本写法：增量编译**
`./gradlew compileKotlin -Pkotlin.incremental=true`
```bash
# 启用增量编译（默认开启）
./gradlew compileKotlin --info
```

---

**基本写法：守护进程编译**
`./gradlew compileKotlin --daemon`
```bash
# 使用 Gradle 守护进程加速
./gradlew compileKotlin --daemon
```

---

## Maven Kotlin 编译

**基本写法：Maven 编译**
`mvn compile`
```bash
# 通过 kotlin-maven-plugin 编译
mvn compile
```

---

**基本写法：指定 Kotlin 版本**
`mvn -Dkotlin.version=2.1.0 compile`
```bash
# 覆盖 Kotlin 版本
mvn -Dkotlin.version=2.1.0 compile
```

---

## 调试与诊断

**基本写法：输出编译时间**
`kotlinc --verbose <源>`
```bash
# 详细编译信息
kotlinc --verbose Main.kt -d out
```

---

**基本写法：输出 K2 警告**
`kotlinc -Xrender-internal-diagnostic-names <源>`
```bash
# 显示诊断内部名称
kotlinc -Xrender-internal-diagnostic-names Main.kt -d out
```

---

**基本写法：生成 .kotlin 缓存**
`-Pkotlin.incremental.useClasspathSnapshot=true`
```bash
# 启用类路径快照加速编译
./gradlew compileKotlin -Pkotlin.incremental.useClasspathSnapshot=true
```
