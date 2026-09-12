---
order: 440
title: Kotlin 与 Android
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: Kotlin Android 开发主线：ViewModel + StateFlow 状态管理、生命周期安全协程、Compose UI、权限与后台任务。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'kotlin/450-KotlinCompose'
  - 'kotlin/410-KotlinGradle'
  - 'kotlin/530-KotlinKoin'
  - 'kotlin/390-KotlinTest'
prerequisites:
  - 'kotlin/230-CoroutineBasics'
---

## 前置知识

建议先阅读以下内容再进入本文：

- [协程基础](/kotlin/230-CoroutineBasics)

## 概述

Kotlin 是 Android 官方推荐的开发语言。自 2019 年 Google 宣布 Kotlin 为 Android 首选语言（Kotlin-first）以来，几乎所有新项目都使用 Kotlin 开发，Jetpack 各组件的新 API 均以 Kotlin 优先设计。Kotlin 的空安全、协程、扩展函数与 Flow，恰好对应 Android 开发最痛的四个点：崩溃、回调地狱、样板代码与状态管理。

本文介绍 Kotlin 在 Android 开发中的核心用法：View 与 Compose 两种 UI 方式、ViewModel + StateFlow 状态管理、生命周期安全的协程收集，以及权限、通知、后台任务等高频场景。

## 基础概念

- **Activity**：Android 应用的单个屏幕，用户交互的入口
- **Fragment**：Activity 中的模块化 UI 片段，可复用
- **ViewModel**：存储和管理 UI 相关的数据，在配置变更（如旋转屏幕）时保留
- **Lifecycle**：Android 组件的生命周期；`lifecycleScope`/`viewModelScope` 让协程随之自动取消
- **Jetpack Compose**：声明式 UI 工具包，Android 官方推荐的现代 UI 方案
- **Context**：Android 环境的上下文对象，访问资源和系统服务

## 快速上手

### 方式一：View 体系（findViewById / ViewBinding）

```kotlin
// MainActivity.kt
package com.example.myapp

import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 找到视图并设置点击事件
        val button = findViewById<Button>(R.id.my_button)
        button.setOnClickListener {
            Toast.makeText(this, "按钮被点击", Toast.LENGTH_SHORT).show()
        }
    }
}
```

### 方式二：Jetpack Compose（新项目默认）

```kotlin
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                GreetingScreen()
            }
        }
    }
}

@Composable
fun GreetingScreen() {
    var count by remember { mutableStateOf(0) }  // remember：重组间保留状态
    Column(modifier = Modifier.padding(16.dp)) {
        Text("点击次数: $count")
        Button(onClick = { count++ }) {
            Text("点击我")
        }
    }
}
```

两种方式可以在同一项目共存；新项目建议直接 Compose。构建配置（Compose 编译器插件）见 [Kotlin 与 Gradle](/kotlin/410-KotlinGradle)，Compose 的深入用法见 [Kotlin 与 Compose](/kotlin/450-KotlinCompose)。

## 详细用法

### ViewModel 和 StateFlow：单向数据流

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

// 定义 UI 状态（不可变 data class）
data class UserUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val error: String? = null
)

class UserViewModel(private val repository: UserRepository) : ViewModel() {
    // 内部可变，外部只读：把更新入口收敛到 ViewModel
    private val _uiState = MutableStateFlow(UserUiState())
    val uiState: StateFlow<UserUiState> = _uiState.asStateFlow()

    fun loadUser(userId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val user = repository.getUser(userId)  // suspend 网络调用
                _uiState.update { it.copy(isLoading = false, user = user) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}
```

Compose 中收集这个状态（生命周期安全）：

```kotlin
import androidx.compose.runtime.Composable
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun UserScreen(viewModel: UserViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    when {
        state.isLoading -> LoadingIndicator()
        state.error != null -> ErrorMessage(state.error!!)
        state.user != null -> UserCard(state.user!!)
    }
}
```

### 协程与生命周期：repeatOnLifecycle 是正解

```kotlin
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.*

class MyActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 一次性任务：lifecycleScope，Activity 销毁时自动取消
        lifecycleScope.launch {
            val data = withContext(Dispatchers.IO) { apiService.fetchData() }
            updateUI(data)  // withContext 结束后自动回到主线程
        }

        // 持续收集流：repeatOnLifecycle，STARTED 开始收集、STOPPED 取消
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state -> render(state) }
            }
        }
    }
}
```

注意：`launchWhenStarted` 已被官方废弃——它只是"挂起等待"，收集者仍然存活；`repeatOnLifecycle` 则真正取消收集，避免后台时白白处理更新。旧教程中出现它时应替换。

### Intent 和导航

```kotlin
// 启动另一个 Activity
fun navigateToDetail(userId: String) {
    val intent = Intent(this, DetailActivity::class.java).apply {
        putExtra("USER_ID", userId)
    }
    startActivity(intent)
}

// 在目标 Activity 中获取参数
class DetailActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val userId = intent.getStringExtra("USER_ID") ?: return
        // 使用 userId 加载数据
    }
}

// Compose 中使用 Navigation Compose
@Composable
fun NavGraph() {
    val navController = rememberNavController()
    NavHost(navController, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onUserClick = { id -> navController.navigate("detail/$id") }
            )
        }
        composable(
            "detail/{userId}",
            arguments = listOf(navArgument("userId") { type = NavType.StringType })
        ) { backStackEntry ->
            val userId = backStackEntry.arguments?.getString("userId") ?: ""
            DetailScreen(userId)
        }
    }
}
```

### 权限请求

```kotlin
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class CameraActivity : AppCompatActivity() {
    // 注册权限请求（必须在 STARTED 之前注册，通常作为字段）
    private val requestPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            openCamera()
        } else {
            Toast.makeText(this, "需要相机权限", Toast.LENGTH_SHORT).show()
        }
    }

    fun checkAndRequestCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            openCamera()
        } else {
            requestPermission.launch(Manifest.permission.CAMERA)
        }
    }
}
```

## 常见场景

### 网络请求与错误处理

```kotlin
class NewsViewModel(private val repository: NewsRepository) : ViewModel() {
    private val _news = MutableStateFlow<List<News>>(emptyList())
    val news: StateFlow<List<News>> = _news.asStateFlow()

    fun loadNews() {
        viewModelScope.launch {
            try {
                _news.value = repository.getNews()
            } catch (e: retrofit2.HttpException) {
                // 服务器错误（4xx/5xx）：提示用户稍后重试
            } catch (e: java.io.IOException) {
                // 网络错误：提示检查网络
            }
        }
    }
}
```

### 本地数据存储：DataStore

```kotlin
import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore

// 顶层扩展属性：全应用单例的 DataStore
val Context.dataStore by preferencesDataStore(name = "settings")

class SettingsManager(private val context: Context) {
    private object Keys {
        val DARK_MODE = booleanPreferencesKey("dark_mode")
        val FONT_SIZE = intPreferencesKey("font_size")
    }

    // 读取设置：DataStore 返回 Flow，配置变化自动通知
    val darkMode: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[Keys.DARK_MODE] ?: false
    }

    // 保存设置：edit 是挂起函数，内部保证原子写
    suspend fun setDarkMode(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[Keys.DARK_MODE] = enabled
        }
    }
}
```

### 通知：先建渠道再发送

Android 8.0（API 26）起通知必须归属 NotificationChannel，否则不会显示：

```kotlin
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

fun showNotification(context: Context, title: String, message: String) {
    val channelId = "general"
    val manager = context.getSystemService(NotificationManager::class.java)

    // 1. 创建渠道（幂等，重复创建无害）
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        manager.createNotificationChannel(
            NotificationChannel(channelId, "常规通知", NotificationManager.IMPORTANCE_DEFAULT)
        )
    }

    // 2. 构建并发送（Android 13+ 还需 POST_NOTIFICATIONS 运行时权限）
    val notification = NotificationCompat.Builder(context, channelId)
        .setSmallIcon(R.drawable.ic_notification)
        .setContentTitle(title)
        .setContentText(message)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .build()

    NotificationManagerCompat.from(context).notify(1, notification)
}
```

## 注意事项与常见陷阱

1. **不要在 ViewModel 中持有 Activity/View 引用**：配置变更后旧 Activity 需要被回收，被 ViewModel 抓住就泄漏。需要 Context 时用 `AndroidViewModel(application)` 拿 application 级 Context。
2. **主线程不能做耗时操作**：网络、数据库走 `Dispatchers.IO`，重计算走 `Dispatchers.Default`；Room 与 Retrofit 的 suspend 接口已内部处理，直接挂起调用即可。
3. **用 `repeatOnLifecycle` 收集流**：`lifecycleScope.launch { flow.collect {} }` 在后台仍会收集，浪费电且可能在 STOPPED 状态更新 UI；`launchWhenStarted` 已废弃。
4. **`by viewModels()` / `by activityViewModels()`**：前者 Activity 私有，后者跨 Fragment 共享；混用会导致"数据怎么没了"。
5. **字符串资源**：不要硬编码字符串，使用 `getString(R.string.xxx)` 以支持多语言；Compose 中用 `stringResource(R.string.xxx)`。
6. **避免在 onDraw 中创建对象**：自定义 View 的 onDraw 会被频繁调用，在其中创建对象会造成 GC 压力与掉帧。

## 进阶用法

### Hilt 依赖注入

官方推荐的 DI 方案（编译期生成）；轻量替代品 Koin 见 [Kotlin 与 Koin](/kotlin/530-KotlinKoin)。

```kotlin
// Application 类
@HiltAndroidApp
class MyApp : Application()

// Activity 注入
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject lateinit var repository: UserRepository

    private val viewModel: UserViewModel by viewModels()
}

// Module 提供依赖
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideUserRepository(api: ApiClient): UserRepository {
        return UserRepositoryImpl(api)
    }
}
```

### WorkManager 后台任务

```kotlin
import androidx.work.*

class SyncWorker(appContext: Context, params: WorkerParameters) :
    CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        return try {
            repository.syncData()      // suspend，挂起执行后台同步
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}

fun scheduleSync(context: Context) {
    val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
        .setConstraints(Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build())
        .build()

    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        "sync",
        ExistingPeriodicWorkPolicy.KEEP,
        request
    )
}
```

注意系统对周期任务的最小间隔限制（15 分钟）；需要精确闹钟类场景用 AlarmManager，而不是 WorkManager。

## 小结

- 现代 Android Kotlin 开发的标准分层：Compose/View 收集 `StateFlow` -> ViewModel 持有状态 -> Repository + suspend/Flow 数据源。
- 生命周期与协程的三件套：`viewModelScope`（随 ViewModel）、`lifecycleScope`（随组件）、`repeatOnLifecycle(STARTED)`（持续收集流）。
- `launchWhenStarted` 已废弃；收集 StateFlow/SharedFlow 一律用 `repeatOnLifecycle` 或 Compose 的 `collectAsStateWithLifecycle`。
- 权限用 `registerForActivityResult`，通知先建 Channel，存储用 DataStore（返回 Flow），后台任务用 WorkManager。
- UI 深入见 [Kotlin 与 Compose](/kotlin/450-KotlinCompose)，工程构建见 [Kotlin 与 Gradle](/kotlin/410-KotlinGradle)。
