---
order: 530
title: Kotlin 与 Koin
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 用 Koin 做 Kotlin 依赖注入：DSL 声明、构造器引用、命名与参数注入、Ktor/Android 集成与运行时校验。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'kotlin/490-KotlinKtor'
  - 'kotlin/520-KotlinExposed'
  - 'kotlin/500-KotlinKtorClient'
  - 'kotlin/390-KotlinTest'
prerequisites:
  - 'kotlin/050-KotlinClassObject'
---

## 概述

Koin 是一个轻量级的 Kotlin 依赖注入框架。与 Dagger、Hilt 等基于注解处理器（编译期代码生成）的框架不同，Koin 完全基于 Kotlin DSL 与运行时解析，不需要注解处理器，配置简单直观。如果你觉得 Dagger 太复杂，Koin 是一个很好的替代选择。

依赖注入（Dependency Injection，DI）的核心思想是：一个类不应该自己创建它依赖的对象，而是由外部提供。这样做的好处是代码松耦合、方便测试、易于维护。

代价也要心里有数：Koin 的依赖解析发生在**运行时**，缺失依赖要到启动或首次 `get()` 才暴露（可用模块校验与 koin-annotations 缓解，见下文）。

## 基础概念

- **Module（模块）**：用 `module { }` 定义的容器，声明各种依赖关系
- **single**：单例，整个应用生命周期只创建一个实例
- **factory**：工厂，每次请求都创建新实例
- **scoped**：作用域实例，在指定 scope 内单例（Android/多平台场景）
- **get()**：在模块内部获取已声明的依赖，用于自动装配
- **startKoin**：启动 Koin，注册所有模块
- **BOM**：Koin 官方推荐的版本对齐方式（`koin-bom`），避免各组件版本漂移

## 快速上手

添加依赖（当前 4.x 版本线，示例以 4.1.0 为例，实际以官方发布为准）：

```kotlin
// build.gradle.kts
dependencies {
    // 核心库（纯 Kotlin/KMP 项目）
    implementation("io.insert-koin:koin-core:4.1.0")
    // Android 项目再加
    implementation("io.insert-koin:koin-android:4.1.0")
    // Ktor 服务端项目再加
    implementation("io.insert-koin:koin-ktor:4.1.0")
}
```

最简单的使用：

```kotlin
import org.koin.core.context.startKoin
import org.koin.core.context.GlobalContext
import org.koin.dsl.module

// 定义服务类
class UserRepository {
    fun findUser(id: String): String = "User_$id"
}

class UserService(private val repo: UserRepository) {
    fun getUser(id: String): String = repo.findUser(id)
}

// 定义模块：声明依赖关系
val appModule = module {
    // 单例：UserRepository 全局只有一个实例
    single { UserRepository() }
    // 单例：UserService 全局只有一个实例，get() 自动注入 UserRepository
    single { UserService(get()) }
}

fun main() {
    // 启动 Koin
    startKoin {
        modules(appModule)
    }

    // 从全局上下文解析依赖
    val userService: UserService = GlobalContext.get().koin.get()
    println(userService.getUser("1"))
}
// 预期输出：User_1
```

## 详细用法

### 声明依赖的三种方式

```kotlin
import org.koin.core.module.dsl.singleOf
import org.koin.core.module.dsl.factoryOf
import org.koin.dsl.module

val demoModule = module {
    // 方式一：用 lambda 声明，手动调用 get() 注入依赖
    single { UserRepository() }
    single { UserService(get()) }

    // 方式二：构造器引用，Koin 自动解析全部构造参数（推荐）
    singleOf(::UserRepository)
    singleOf(::UserService)

    // 方式三：factory，每次获取都创建新实例
    factory { UserViewModel(get()) }
    factoryOf(::UserViewModel)
}
```

构造器引用（`*Of` 系列）把"参数怎么来"交给 Koin 反射构造函数签名解析，新增构造参数时无需改动模块声明，是 3.5+ 起的惯用写法。

### 带接口的依赖注入

```kotlin
// 定义接口和实现
interface Repository {
    fun getData(): String
}

class RepositoryImpl : Repository {
    override fun getData(): String = "Hello from Repository"
}

class MyService(private val repository: Repository) {
    fun process(): String = repository.getData()
}

val module = module {
    // 绑定接口到实现
    single<Repository> { RepositoryImpl() }
    // 或者使用 bind 关键字（可同时暴露实现类型与接口类型）
    single { RepositoryImpl() } bind Repository::class
    // MyService 自动注入 Repository
    single { MyService(get()) }
}
```

### 带参数的依赖

```kotlin
class UserViewModel(private val userId: String, private val service: UserService)

val module = module {
    // 声明带参数的依赖：解构声明的部分用 parametersOf 传入
    factory { (userId: String) ->
        UserViewModel(userId, get())
    }
}

fun main() {
    org.koin.core.context.startKoin { modules(module) }
    val vm = org.koin.core.context.GlobalContext.get().koin.get<UserViewModel> {
        parametersOf("user_123")
    }
    println(vm != null)  // true
}
```

### 命名依赖

当同一个类型有多个实现时，用命名区分：

```kotlin
interface DataSource {
    fun read(): String
}

class LocalDataSource : DataSource {
    override fun read() = "本地数据"
}

class RemoteDataSource : DataSource {
    override fun read() = "远程数据"
}

val module = module {
    // 用 named 区分同类型的不同实现
    single<DataSource>(named("local")) { LocalDataSource() }
    single<DataSource>(named("remote")) { RemoteDataSource() }

    // 注入时指定名称
    factory { DataProcessor(get(named("remote"))) }
}
```

### Android 中的使用

```kotlin
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.android.ext.koin.androidContext

// 定义 ViewModel
class MainViewModel(private val userService: UserService) : ViewModel() {
    fun loadUser() = userService.getUser("1")
}

// 定义模块
val appModule = module {
    single { UserRepository() }
    single { UserService(get()) }
    // 使用 viewModel 声明，自动与生命周期绑定
    viewModel { MainViewModel(get()) }
}

// 在 Application 中启动
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@MyApp)
            modules(appModule)
        }
    }
}

// 在 Activity 中注入
class MainActivity : AppCompatActivity() {
    // 懒注入
    private val viewModel: MainViewModel by viewModel()
}
```

## 常见场景

### 分层架构的依赖注入

```kotlin
// 数据层
class ApiClient
class UserRepositoryImpl(private val api: ApiClient) : UserRepository {
    override suspend fun getUser(id: String) = "User_$id"
}

// 领域层
class GetUserUseCase(private val repo: UserRepository) {
    suspend operator fun invoke(id: String) = repo.getUser(id)
}

// 模块声明：每层一个模块，职责清晰
val dataModule = module {
    single { ApiClient() }
    single<UserRepository> { UserRepositoryImpl(get()) }
}

val domainModule = module {
    factory { GetUserUseCase(get()) }
}

// 启动时注册所有模块
fun main() = runBlocking {
    startKoin { modules(dataModule, domainModule) }
    val useCase: GetUserUseCase = GlobalContext.get().koin.get()
    println(useCase("42"))
}
// 预期输出：User_42
```

### Ktor 服务端集成

```kotlin
import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.response.*
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger

fun Application.module() {
    // 在 Ktor 中安装 Koin
    install(Koin) {
        slf4jLogger()
        modules(appModule)
    }

    // 在路由中注入
    routing {
        get("/users/{id}") {
            val userService: UserService by inject()
            val id = call.parameters["id"]!!
            call.respond(userService.getUser(id))
        }
    }
}
```

### 测试中替换依赖

```kotlin
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Test
import org.koin.core.context.startKoin
import org.koin.core.context.stopKoin
import org.koin.dsl.module
import org.koin.test.KoinTest
import org.koin.test.mock.declareMock
import kotlin.test.assertEquals

class UserServiceTest : KoinTest {

    @Test
    fun `test with mock repository`() {
        startKoin {
            modules(module {
                single<UserRepository> { mockk() }
                single { UserService(get()) }
            })
        }
        try {
            // 用 mock 替换真实依赖
            declareMock<UserRepository> {
                every { findUser("1") } returns "MockUser"
            }
            val service: UserService = GlobalContext.get().koin.get()
            assertEquals("MockUser", service.getUser("1"))
        } finally {
            stopKoin()
        }
    }
}
```

## 注意事项与常见陷阱

1. **没有编译期检查**：Koin 在运行时解析依赖，缺失依赖要到启动或首次 `get()` 才报 `DefinitionParameterException`/`NoDefinitionFoundException`。缓解手段：启动前跑 `verify()` 模块校验、单元测试中 `checkModules()`，或引入 koin-annotations（编译期生成 DSL 声明）。
2. **get() 的位置**：`get()` 只能在模块声明的 lambda 中使用，不能在任意位置调用。
3. **循环依赖**：Koin 不支持循环依赖，A 依赖 B、B 又依赖 A 时启动会报错——循环依赖本身是设计问题，应抽出第三方依赖或改用参数传递。
4. **性能**：由于运行时解析，Koin 的启动速度比编译期生成的 Dagger 略慢，但对大多数应用差异可以忽略。
5. **测试间状态污染**：`startKoin` 是全局单例，多个测试共享 JVM 时必须 `stopKoin()` 或用 `checkModules` 独立校验，否则模块叠加导致误报。
6. **模块注册顺序不影响解析**：Koin 会在所有已注册模块中查找依赖，不必按依赖方向排序。

## 进阶用法

### 模块包含（Module Inclusion）

```kotlin
// 基础模块
val coreModule = module {
    single { ApiClient() }
}

// 业务模块包含基础模块
val featureModule = module {
    includes(coreModule)
    single { UserService(get()) }
}

// 启动时只需注册业务模块
startKoin {
    modules(featureModule)  // coreModule 会自动包含
}
```

### 启动前校验依赖图（verify）

```kotlin
import org.koin.core.annotation.KoinExperimentalAPI

// Koin 4.x：在启动前对模块做全量校验，尽早暴露缺失定义
@OptIn(KoinExperimentalAPI::class)
fun verifyModules() {
    appModule.verify()
    dataModule.verify()
    println("依赖图校验通过")
}
```

把 `verify()` 放进单元测试或 CI，可以拿到接近"编译期检查"的保障，而不引入注解处理器。

### Scope（作用域）

```kotlin
class ScopeService(private val scopeId: String) {
    fun process() = "Processing in scope $scopeId"
}

val module = module {
    // 声明作用域
    scope<ScopeActivity> {
        // 依赖只在 ScopeActivity 的作用域内存在
        scoped { ScopeService("activity-scope") }
    }
}

// 在 Activity 中使用
class ScopeActivity : AppCompatActivity() {
    // 创建作用域
    val scope = createScope(this)

    fun useService() {
        val service = scope.get<ScopeService>()
        println(service.process())
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.close()  // 关闭作用域，释放依赖
    }
}
```

## 小结

- Koin 的心智模型只有三个词：`module` 声明、`single`/`factory` 控制生命周期、`get()` 装配。
- 优先用构造器引用（`singleOf`/`factoryOf`）声明；同类型多实现用 `named` 区分；运行期才确定的参数用 `parametersOf`。
- 运行时解析是 Koin 的舒适区也是风险区：用 `verify()`、`checkModules` 或 koin-annotations 把错误提前到测试与 CI。
- 服务端集成 `install(Koin)`，Android 集成 `androidContext` + `by viewModel()`，测试集成 `declareMock`。
- 更完整的测试策略见 [Kotlin 测试最佳实践](/kotlin/390-KotlinTest)；服务端容器化语境下的对比（Spring DI）见 [Kotlin 与 Spring](/kotlin/480-KotlinSpring)。
