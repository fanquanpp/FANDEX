---
order: 65
title: Kotlin与Compose
module: kotlin
category: Kotlin
difficulty: intermediate
description: 'Jetpack Compose桌面/移动'
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin作用域函数
  - kotlin/Kotlin类型系统
  - kotlin/Kotlin与Gradle
  - kotlin/Kotlin与Arrow
prerequisites:
  - kotlin/概述与环境配置
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
