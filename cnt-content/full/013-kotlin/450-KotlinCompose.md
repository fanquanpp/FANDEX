---
order: 490
title: Kotlin 与 Compose
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 以一个桌面小应用学会声明式 UI：状态驱动重组、remember 与状态提升、LaunchedEffect 副作用、Modifier 顺序陷阱，附 2026 年 Compose Multiplatform 各平台稳定后的选型现状。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'kotlin/440-KotlinAndroid'
  - 'kotlin/460-KotlinMultiplatform'
  - 'kotlin/470-KotlinJsAndNativeCompileTargets'
  - 'kotlin/410-KotlinGradle'
  - 'kotlin/230-CoroutineBasics'
prerequisites:
  - 'kotlin/020-KotlinOverviewEnvSetup'
  - 'kotlin/230-CoroutineBasics'
---

## 前置知识

- [Kotlin 概述与环境搭建](/kotlin/020-KotlinOverviewEnvSetup)：本地能跑起 Kotlin/JVM 项目（Gradle 骨架即可）；
- [协程基础](/kotlin/230-CoroutineBasics)：知道 suspend 函数是什么，LaunchedEffect 一节会用到。

## 学习目标

读完本文你将能够：

1. 说清"声明式 UI"与"命令式 UI"的区别，解释什么叫"UI 是状态的函数"；
2. 用 `mutableStateOf` + `remember` 做出点击计数、文本联动两个最小交互；
3. 用 `apply` 系思维搭建布局（Column/Row/Box），用 LazyColumn 渲染长列表；
4. 用 `LaunchedEffect` 把网络请求这类副作用放对地方；
5. 说出 2026 年 Compose 与 Compose Multiplatform 的平台覆盖现状，判断自己的项目该用哪套。

预计 90 分钟，含 3 组动手实验与 4 道练习。本文以 Compose Desktop 为主线（无需 Android 设备），Android 与多平台差异单独标注。

## 1. 问题引入：改个按钮文字要几行

命令式 UI（Android View 体系、Swing）的世界里，界面是一棵你手动维护的控件树：

```kotlin
// Swing 风格伪代码：状态变了，你要自己找到控件并改它
var count = 0
val label = JLabel("点击次数: 0")
button.addActionListener {
    count++
    label.text = "点击次数: $count"   // 手动同步——忘了这行就是 Bug
}
```

控件一多，"状态"与"界面"的同步逻辑就会散落在几十个回调里，漏掉一处就是"界面显示不对"的经典 Bug。Compose 的解法是把方向反过来：**你只描述"当前状态下界面长什么样"，状态一变，框架自动重算受影响的部分**：

```kotlin
var count by remember { mutableStateOf(0) }

Text("点击次数: $count")          // 读了这个状态
Button(onClick = { count++ }) {   // 改了这个状态
    Text("点我")
}
```

没有 label 引用、没有 setText。`count` 变了 -> Compose 重新执行读到它的代码 -> 界面更新。这就是"UI 是状态的函数"（`UI = f(state)`）的全部含义。

## 2. 动手做：跑起第一个 Compose 桌面程序

Compose Desktop 不需要 Android Studio，一个 Gradle 项目即可。最小 `build.gradle.kts`：

```kotlin
plugins {
    kotlin("jvm") version "2.2.20"
    id("org.jetbrains.compose") version "1.9.0"
}

repositories {
    mavenCentral()
    google()
    maven("https://maven.pkg.jetbrains.space/public/p/compose/dev")
}

dependencies {
    implementation(compose.material3)
    implementation(compose.desktop.currentOs)
}
```

版本号会随时间推进（截至 2026 年秋，Compose Multiplatform 稳定线在 1.9.x），以 compose-multiplatform 官方模板为准：`gradle init` 后照抄模板的版本目录（libs.versions.toml）最省心。

`src/main/kotlin/Main.kt`：

```kotlin
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application

fun main() = application {
    Window(onCloseRequest = ::exitApplication, title = "Quaver 练习器") {
        MaterialTheme {
            QuizCounter()
        }
    }
}

@Composable
fun QuizCounter() {
    var count by remember { mutableStateOf(0) }   // 1. 状态

    Column(modifier = Modifier.padding(24.dp)) {  // 2. 布局描述
        Text("已答对 $count 题")
        Button(onClick = { count++ }) {           // 3. 改状态即可，不碰控件
            Text("答对一题")
        }
    }
}
```

`./gradlew run` 启动，点按钮，数字变——你已经完成了"状态驱动 UI"的闭环。逐个认识代码里的新面孔：

- `@Composable`：标记"这个函数描述一段 UI"。它不是普通函数：只能在其他 Composable 里调用，可以被 Compose 跳过或重复执行；
- `mutableStateOf(0)`：创建可观察状态。给它赋值会通知 Compose"我变了"；
- `remember { }`：重组时保留值。没有它，每次重组 `mutableStateOf(0)` 会重新执行，计数永远清零——这是新手第一大坑，稍后展开；
- `by` 委托：让你直接写 `count` 而不是 `count.value`。

### 状态与重组的心智模型

把重组想象成"重新运行了一遍函数"：`QuizCounter()` 从头到尾又执行了一次，`Text` 拿到了新的 `count`。Compose 通过"哪个函数读了哪个状态"来精确圈定重算范围——只有读了的函数会重跑，这叫**智能重组**。两个推论：

1. Composable 函数要**幂等且无副作用**：同样输入画出同样界面，别在函数体里写文件、发请求（放 LaunchedEffect，见第 4 节）；
2. 重组可能**很频繁**（滑动列表时每帧都可能重组），函数体里的昂贵计算要用 `remember { }` 缓存。

实验一：把 `remember { mutableStateOf(0) }` 改成 `mutableStateOf(0)`（去掉 remember），运行后狂点按钮。现象是数字永远停在 0——每次 `count++` 触发重组，重组又把状态重置回 0。亲眼看一次，比背十条规则都管用。

## 3. 布局与列表：Column、Row、Box、LazyColumn

三个布局原语覆盖绝大多数界面：

```kotlin
Column(modifier = Modifier.padding(16.dp)) {        // 纵向排列
    Text("题目")
    Row {                                            // 横向排列
        Button(onClick = {}) { Text("选项 A") }
        Button(onClick = {}) { Text("选项 B") }
    }
    Box {                                            // 叠放（对齐、浮层）
        Text("背景")
        Text("角标", modifier = Modifier.align(Alignment.TopEnd))
    }
}
```

`Modifier` 是每个组件的"化妆链"，顺序**有语义**：

```kotlin
// 先背景后 padding：颜色延伸到 padding 区域
Modifier.background(Color.Gray).padding(8.dp)
// 先 padding 后背景：颜色只贴着文字
Modifier.padding(8.dp).background(Color.Gray)
```

规则：修饰符从左到右"由外向内"包裹，`padding` 写在 `clickable` 之前则点击热区不含 padding，写在之后则含。拿不准就两个顺序都试一眼。

长列表用 Lazy 系（只组合可见项，等价于 RecyclerView 的回收复用）：

```kotlin
@Composable
fun SongList(songs: List<String>, onPlay: (String) -> Unit) {
    LazyColumn {
        items(songs, key = { it }) { song ->     // key 帮助重组时正确定位
            Row(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(song)
                TextButton(onClick = { onPlay(song) }) { Text("播放") }
            }
        }
    }
}
```

## 4. 副作用：网络请求放哪里

"UI = f(state)"不等于"没有异步"。正确姿势：状态由 `LaunchedEffect` 更新，UI 只管画：

```kotlin
@Composable
fun QuizScreen(quizId: String) {
    var quiz by remember { mutableStateOf<Quiz?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(quizId) {          // quizId 变化时，取消旧协程、重新执行块
        loading = true
        quiz = fetchQuiz(quizId)      // suspend 函数，天然在协程里
        loading = false
    }

    when {
        loading -> CircularProgressIndicator()
        quiz != null -> QuizContent(quiz!!)
        else -> Text("加载失败")
    }
}
```

`LaunchedEffect(key)` 的两个要点：离开组合时协程自动取消（不会泄漏）；key 变化时旧任务取消、新任务重启——这正好实现"切题就取消上一题的加载"。容易犯的错是在 Composable 函数体里直接调 `fetchQuiz()`：重组一次发一次请求，组合期间（可能在后台线程）执行 I/O，两个错误一起犯。

## 5. 状态提升：组件复用的关键

让组件"只吃参数、吐回调"，不自己持有状态，才能复用与测试：

```kotlin
// 无状态组件：谁都能用
@Composable
fun AnswerField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    TextField(value = value, onValueChange = onValueChange, modifier = modifier)
}

// 有状态容器：持有状态，下发给无状态组件
@Composable
fun QuizForm() {
    var answer by remember { mutableStateOf("") }
    AnswerField(value = answer, onValueChange = { answer = it })
}
```

这个模式叫**状态提升**（state hoisting）：状态上移到公共父级，多个子组件共享同一份真相。设计自定义组件时，默认把 `value/onValueChange` 和 `modifier` 作为第一梯队参数（modifier 默认值 `Modifier`），是与官方组件保持一致的惯例。

### remember 的边界

`remember` 活在组合里：窗口关了、Activity 因旋转重建了，状态就没了。需要跨"配置变更"存活的状态，Android 上用 `rememberSaveable`（能存进 Bundle 的简单状态）或 ViewModel（复杂业务状态）；Desktop 上配合窗口生命周期考虑。原则一句话：**remember 管 UI 临时状态，业务状态交给架构层**。

## 6. 2026 年选型现状：Compose 已经不只属于 Android

| 平台 | 现状 |
| ---- | ---- |
| Android（Jetpack Compose） | 2019 年起官方主推，2026 年新项目的事实默认选择，View 体系进入维护模式 |
| Desktop（Compose Desktop） | 基于 JVM 的 Skia 渲染，随 Compose Multiplatform 发布，适合工具类桌面应用 |
| iOS | Compose Multiplatform 1.8.0（2025 年 5 月）起全平台稳定，iOS 支持已可用于生产 |
| Web | Compose Multiplatform for Web 基于 Wasm 渲染；早期的 compose-html/DOM API 已弃用 |

本文的桌面示例代码，理论上只需加一个 iOS/Web 目标就能进 Compose Multiplatform 项目复用 UI 层——细节见 [Kotlin 多平台](/kotlin/460-KotlinMultiplatform)。选型判断：纯 Android 项目直接用 Jetpack Compose；要覆盖桌面或 iOS 的中小工具（比如 quaver 这类），CMP 一步到位；Web 端重度需求仍建议独立 Web 技术栈。

## 易错点与最佳实践

**错误一：忘写 remember。** 状态每帧重置，"按钮点了没反应"（实验一）。
**错误二：在 Composable 里做 I/O 或改全局变量。** 重组不保证次数与线程，副作用一律进 `LaunchedEffect`/`SideEffect` 或架构层。
**错误三：Modifier 顺序随手写。** padding 与 background/clickable 的先后决定视觉与热区（第 3 节）。
**错误四：列表不加 key。** 数据增删后重组错位、动画跳变；`items(list, key = { it.id })` 是默认动作。
**错误五：把 remember 当数据库。** 进程重启、配置变更全丢；持久状态走 ViewModel/仓库层。
**最佳实践**：组件默认无状态（状态提升）；Composable 函数保持短小、幂等；主题色和间距从 `MaterialTheme` 取而不是硬编码，换肤零成本。

## 本篇小结

- 声明式 UI 的本质：UI = f(state)，改状态而非操作控件，框架负责差量更新（重组）；
- `mutableStateOf` 创建状态，`remember` 让它活过重组，两者缺一不可；
- 布局三原语 Column/Row/Box + Modifier 链（顺序有语义）+ LazyColumn 长列表；
- 副作用进 `LaunchedEffect(key)`，自动取消、随 key 重启；
- 状态提升让组件可复用可测试；remember 是 UI 临时态，业务状态上交架构层；
- 2026 年：Android 上 Compose 是默认，CMP 已全平台稳定（含 iOS 与 Wasm Web）。

## 动手实践

1. **答题计数器扩展**：给第 2 节的程序加"答错一题"按钮与两个状态（答对/答错数），顶部显示正确率 `%.0f%%`。思路：正确率是 `correct / (correct + wrong)` 的纯计算，注意除零保护。
2. **状态提升练习**：把答题计数器拆成无状态 `ScorePanel(correct, wrong)` 与持有状态的 `QuizApp`，验证行为不变。
3. **LaunchedEffect 实验**：加一个 `quizId` 切换按钮（1/2/3 轮换），在 `fetchQuiz`（用 `delay(2000)` 模拟）返回前狂点切换，观察"旧请求被取消"——在 suspend 函数 delay 后打印日志确认旧协程没有走到。
4. **排错练习**：下面的列表代码有两个问题，找出来并修复。

```kotlin
@Composable
fun BadList() {
    val items = remember { mutableStateListOf<String>() }
    LaunchedEffect(Unit) {
        items.addAll(fetchSongs())          // 每次进入组合都会执行吗？
    }
    LazyColumn {
        items(items) { Text(it) }           // 列表项只有文本，点击会怎样？
    }
}
```

思路：`LaunchedEffect(Unit)` 只在首次组合执行一次，之后数据源更新不会刷新（key 应包含数据版本，或改由上层传入列表）；`items` 未提供 key，且列表项没有任何交互尚可接受，但若加点击动画就会错位——练习目标是说出 key 的作用。

## 下一步

- [Kotlin 与 Android](/kotlin/440-KotlinAndroid)：Jetpack Compose 在 Android 上的完整工程化（ViewModel、导航、依赖注入）；
- [Kotlin 多平台](/kotlin/460-KotlinMultiplatform)：把本文的 UI 搬进 iOS 与 Web 目标；
- [Kotlin 与 Gradle](/kotlin/410-KotlinGradle)：版本目录（libs.versions.toml）与 CMP 项目的构建配置细节。
