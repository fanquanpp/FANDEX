---
order: 62
title: Kotlin与Android
module: kotlin
category: Kotlin
difficulty: intermediate
description: Kotlin Android开发
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与Compose
  - kotlin/Kotlin与Gradle
  - kotlin/Kotlin与Koin
  - kotlin/Kotlin与测试
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

Kotlin 是 Android 官方推荐的开发语言。自 2019 年 Google 宣布 Kotlin 为 Android 首选语言以来，几乎所有新项目都使用 Kotlin 开发。Kotlin 的空安全、协程、扩展函数等特性，让 Android 开发更加安全和高效。

本文介绍 Kotlin 在 Android 开发中的核心用法，包括 Activity、ViewModel、生命周期、常用模式等。

## 基础概念

- **Activity**：Android 应用的单个屏幕，用户交互的入口
- **Fragment**：Activity 中的模块化 UI 片段，可复用
- **ViewModel**：存储和管理 UI 相关的数据，在配置变更时保留
- **Lifecycle**：Android 组件的生命周期，ViewModel 感知生命周期来避免内存泄漏
- **Intent**：Android 组件之间通信的消息对象
- **Context**：Android 环境的上下文对象，访问资源和系统服务

## 快速上手

一个最简单的 Android Activity：

```kotlin
// MainActivity.kt
package com.example.myapp

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.material3.*
import androidx.compose.runtime.*

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

使用 Compose 的方式：

```kotlin
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
    var count by remember { mutableStateOf(0) }
    Column(modifier = Modifier.padding(16.dp)) {
        Text("点击次数: $count")
        Button(onClick = { count++ }) {
            Text("点击我")
        }
    }
}
```

## 详细用法

### ViewModel 和 StateFlow

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

// 定义 UI 状态
data class UserUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val error: String? = null
)

class UserViewModel(private val repository: UserRepository) : ViewModel() {
    // 使用 StateFlow 管理 UI 状态
    private val _uiState = MutableStateFlow(UserUiState())
    val uiState: StateFlow<UserUiState> = _uiState.asStateFlow()

    // 加载用户数据
    fun loadUser(userId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val user = repository.getUser(userId)
                _uiState.update { it.copy(isLoading = false, user = user) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}
```

在 Activity/Fragment 中观察 ViewModel：

```kotlin
class UserActivity : AppCompatActivity() {
    // 创建 ViewModel
    private val viewModel: UserViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 观察 UI 状态
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                when {
                    state.isLoading -> showLoading()
                    state.error != null -> showError(state.error)
                    state.user != null -> showUser(state.user)
                }
            }
        }

        // 触发数据加载
        viewModel.loadUser("1")
    }
}
```

### 协程与生命周期

```kotlin
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.*

class MyActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // lifecycleScope：Activity 销毁时自动取消
        lifecycleScope.launch {
            // 在主线程启动
            val data = withContext(Dispatchers.IO) {
                // 在 IO 线程执行网络请求
                apiService.fetchData()
            }
            // 自动回到主线程更新 UI
            updateUI(data)
        }

        // Lifecycle 感知的协程
        lifecycleScope.launchWhenStarted {
            // 只有在 Started 状态时才执行
            val result = repository.loadData()
            updateUI(result)
        }
    }
}
```

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

// 使用 Navigation Compose
@Composable
fun NavGraph() {
    val navController = rememberNavController()
    NavHost(navController, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onUserClick = { id ->
                    navController.navigate("detail/$id")
                }
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
import androidx.activity.result.contract.ActivityResultContracts

class CameraActivity : AppCompatActivity() {
    // 注册权限请求
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
                val result = repository.getNews()
                _news.value = result
            } catch (e: HttpException) {
                // 服务器错误
            } catch (e: IOException) {
                // 网络错误
            }
        }
    }
}
```

### 本地数据存储

```kotlin
import android.content.Context
import androidx.datastore.preferences.*

// 使用 DataStore 存储简单数据
val Context.dataStore by preferencesDataStore(name = "settings")

class SettingsManager(private val context: Context) {
    // 定义键
    private object Keys {
        val DARK_MODE = booleanPreferencesKey("dark_mode")
        val FONT_SIZE = intPreferencesKey("font_size")
    }

    // 读取设置
    val darkMode: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[Keys.DARK_MODE] ?: false
    }

    // 保存设置
    suspend fun setDarkMode(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[Keys.DARK_MODE] = enabled
        }
    }
}
```

### 通知

```kotlin
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

fun showNotification(context: Context, title: String, message: String) {
    val notification = NotificationCompat.Builder(context, "channel_id")
        .setSmallIcon(R.drawable.ic_notification)
        .setContentTitle(title)
        .setContentText(message)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .build()

    NotificationManagerCompat.from(context).notify(1, notification)
}
```

## 注意事项

- **不要在 ViewModel 中持有 Activity 引用**：这会导致内存泄漏，使用 AndroidViewModel 的 applicationContext 如果确实需要 Context
- **主线程不能做耗时操作**：网络请求、数据库操作等必须在 IO 线程
- **生命周期感知**：使用 lifecycleScope 或 viewModelScope，确保协程在组件销毁时自动取消
- **字符串资源**：不要硬编码字符串，使用 `getString(R.string.xxx)`
- **避免在 onDraw 中创建对象**：自定义 View 的 onDraw 方法会被频繁调用，在其中创建对象会导致 GC 压力

## 进阶用法

### Hilt 依赖注入

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
            // 执行后台同步任务
            repository.syncData()
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}

// 调度任务
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
