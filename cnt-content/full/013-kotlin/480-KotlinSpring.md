---
order: 520
title: Kotlin 与 Spring
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: Kotlin Spring Boot开发
author: fanquanpp
updated: '2026-10-11'
related:
  - 'kotlin/490-KotlinKtor'
  - 'kotlin/530-KotlinKoin'
  - 'kotlin/410-KotlinGradle'
  - 'kotlin/390-KotlinTest'
prerequisites:
  - 'kotlin/020-KotlinOverviewEnvSetup'
---

## 前置知识

- [Kotlin 与 Android](/kotlin/440-KotlinAndroid)：建议先完成前一篇的学习

## 知识点地图

- **知识类别**：Kotlin 与 Spring 框架的咬合点——编译器插件（all-open、no-arg）如何配合框架代理、Kotlin 专属 DSL（beans{}）、data class 配置属性与挂起函数 Web 层。
- **解决什么问题**：直接把 Java Spring 写法翻译成 Kotlin 会在代理、JPA、配置绑定上「莫名」失败；本文讲清每个失败背后的语言机制与官方解法。
- **什么时候用到**：新建 Kotlin Spring Boot 工程配置插件；写类型安全配置；决定 Controller 用 suspend 还是 Mono；排查「Bean 无法代理」「实体没有默认构造器」类报错。

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱



## 概述

Spring Boot 是 Java 生态中最流行的应用框架，Kotlin 与 Spring Boot 的结合非常自然。Spring 官方提供了 Kotlin 一等公民支持，包括专门的 Kotlin 插件、扩展函数、协程支持等。使用 Kotlin 开发 Spring Boot 应用，代码更简洁、空安全、且能与 Java 无缝互操作。

本文介绍如何在 Spring Boot 中使用 Kotlin，涵盖配置、常用特性、协程支持等。

## 基础概念

- **kotlin-spring 插件**：自动为 Spring 注解的类打开 class（Kotlin 默认 class 是 final）
- **kotlin-jpa 插件**：为 JPA 实体类生成无参构造器
- **协程支持**：Spring WebFlux 支持 Kotlin 协程，用 suspend 函数替代 Mono/Flux
- **扩展函数**：Spring 为许多 Java API 提供了 Kotlin 扩展，如 RestTemplate 的扩展方法
- **Jackson 模块**：jackson-module-kotlin 支持 Kotlin 数据类的序列化和反序列化

## 快速上手

添加依赖：

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.0.0"
    kotlin("plugin.spring") version "2.0.0"
    kotlin("plugin.jpa") version "2.0.0"
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

最简单的 Spring Boot 应用：

```kotlin
// Application.kt
package com.example

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class Application

fun main(args: Array<String>) {
    runApplication<Application>(*args)
}
```

```kotlin
// Controller.kt
package com.example

import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
class UserController(private val userService: UserService) {

    @GetMapping
    fun getUsers(): List<User> = userService.findAll()

    @GetMapping("/{id}")
    fun getUser(@PathVariable id: Long): User = userService.findById(id)

    @PostMapping
    fun createUser(@RequestBody request: CreateUserRequest): User {
        return userService.create(request)
    }
}
```

## 详细用法

### 依赖注入

Kotlin 中推荐使用构造器注入，结合 val 属性确保不可变：

```kotlin
import org.springframework.stereotype.Service
import org.springframework.stereotype.Repository
import org.springframework.web.bind.annotation.*

// Repository 层
@Repository
class UserRepository(private val jpaRepo: UserJpaRepository) {
    fun findAll(): List<User> = jpaRepo.findAll()
    fun findById(id: Long): User? = jpaRepo.findById(id).orElse(null)
    fun save(user: User): User = jpaRepo.save(user)
}

// Service 层
@Service
class UserService(private val repository: UserRepository) {
    fun findAll(): List<User> = repository.findAll()
    fun findById(id: Long): User = repository.findById(id)
        ?: throw NoSuchElementException("用户 $id 不存在")

    fun create(request: CreateUserRequest): User {
        val user = User(name = request.name, email = request.email)
        return repository.save(user)
    }
}

// Controller 层
@RestController
@RequestMapping("/api/users")
class UserController(private val userService: UserService) {
    // 构造器注入，userService 是 val 不可变
}
```

### JPA 实体类

```kotlin
import jakarta.persistence.*

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false, length = 50)
    var name: String,

    @Column(nullable = false, length = 100)
    var email: String,

    @Column(name = "created_at")
    val createdAt: LocalDateTime = LocalDateTime.now()
)

// JPA Repository
interface UserJpaRepository : JpaRepository<User, Long> {
    // 自定义查询方法
    fun findByName(name: String): List<User>
    fun findByEmail(email: String): User?
}
```

### 配置类

```kotlin
import org.springframework.context.annotation.*
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
class AppConfig {

    // 用 @Bean 定义 Bean
    @Bean
    fun corsFilter(): org.springframework.web.filter.CorsFilter {
        val config = CorsConfiguration().apply {
            allowedOrigins = listOf("http://localhost:3000")
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE")
            allowedHeaders = listOf("*")
            allowCredentials = true
        }
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)
        return org.springframework.web.filter.CorsFilter(source)
    }
}
```

### beans{} DSL：注解之外的函数式 Bean 定义

Spring 对 Kotlin 的独门支持之一：不用注解，用带接收者的 lambda 声明 Bean：

```kotlin
import org.springframework.context.support.beans

fun beans() = beans {
    bean<UserRepository>()
    bean { UserService(ref()) }                 // ref() 按类型解析依赖
    bean("legacyQueue") { QueueConfig(name = "orders-v1") }   // 命名 bean
}
```

- 价值一：**同一个函数式配置可以注册多个 `ApplicationContext`**——`GenericApplicationContext` 与测试里的 `refresh()` 共用一份定义，集成测试不用加载整个 `@SpringBootApplication`，秒级启动。
- 价值二：纯 Kotlin，无反射注解扫描；配合 `bean { ... }` 内的条件逻辑（`if (profile in env.activeProfiles) bean { ... }`）比 `@Conditional` 更直白。
- 易错点：DSL 定义的 Bean 默认**懒加载**，且 `ref()` 在 lambda 执行时才解析；把 `ref()` 误写为直接构造（`bean { UserService(UserRepository()) }`）会绕过容器——这个实例不受代理、不参与生命周期，症状是「事务不生效」。
- 选择建议：业务工程保持注解扫描（生态兼容、IDE 跳转友好）；函数式配置用于测试切片与库/SDK 的自动装配。

### 配置属性

```kotlin
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

// 类型安全的配置
@Component
@ConfigurationProperties(prefix = "app")
class AppProperties {
    var name: String = "My App"
    var version: String = "1.0.0"
    var features: Features = Features()

    class Features {
        var registrationEnabled: Boolean = true
        var maxUploadSize: Long = 10 * 1024 * 1024  // 10MB
    }
}

// 在 application.yml 中配置
/*
app:
  name: 我的APP
  version: 2.0.0
  features:
    registration-enabled: false
    max-upload-size: 52428800
*/
```

### data class 版配置属性（推荐）

Kotlin 写法的目标是把上面的可变 class 换成不可变 data class——配置在启动后不该再变：

```kotlin
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.bind.ConstructorBinding

data class AppProperties(
    val name: String = "My App",
    val version: String = "1.0.0",
    val features: Features = Features()
) {
    data class Features(
        val registrationEnabled: Boolean = true,
        val maxUploadSize: Long = 10 * 1024 * 1024
    )
}

// 注册：Boot 3.x 用 @EnableConfigurationProperties 或 @ConfigurationPropertiesScan
@ConfigurationPropertiesScan
@SpringBootApplication
class Application
```

- 构造绑定的工作方式：Spring 通过**主构造器参数名**匹配配置键并实例化，data class 的不可变性与默认值天然契合。Kotlin 全家桶（`kotlin-spring` 插件随 Boot 脚手架默认启用）下不需要显式 `@ConstructorBinding`——它仅在多构造器需要消歧时标注。
- 易错点：nested 属性 `features.registration-enabled` 的 kebab-case 自动映射到 camelCase 是**宽松绑定**的功劳；但 data class 若有**非默认值的必填参数**而配置缺了键，启动直接失败——这正是想要的 fail-fast，别为了启动成功塞默认值掩盖配置缺失。
- 对比上面的 var 版本：var 版本靠 setter 绑定，任何代码都能改运行中的配置；data class 版本绑定一次、终身只读，且 `copy()` 生成的测试配置零样板。

### 异常处理

```kotlin
import org.springframework.http.*
import org.springframework.web.bind.annotation.*

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(NoSuchElementException::class)
    fun handleNotFound(e: NoSuchElementException): ResponseEntity<Map<String, String>> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(mapOf("error" to (e.message ?: "资源不存在")))
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleBadRequest(e: IllegalArgumentException): ResponseEntity<Map<String, String>> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(mapOf("error" to (e.message ?: "参数错误")))
    }

    @ExceptionHandler(Exception::class)
    fun handleGeneral(e: Exception): ResponseEntity<Map<String, String>> {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(mapOf("error" to "服务器内部错误"))
    }
}
```

## 常见场景

### 协程支持（WebFlux）

```kotlin
import org.springframework.web.bind.annotation.*
import org.springframework.data.repository.kotlin.CoroutineCrudRepository
import kotlinx.coroutines.flow.Flow

// 协程 Repository
interface CoroutineUserRepository : CoroutineCrudRepository<User, Long> {
    fun findByName(name: String): Flow<User>
    suspend fun findByEmail(email: String): User?
}

// 协程 Controller
@RestController
@RequestMapping("/api/users")
class CoroutineUserController(private val repository: CoroutineUserRepository) {

    // suspend 函数，非阻塞
    @GetMapping
    suspend fun getUsers(): Flow<User> = repository.findAll()

    @GetMapping("/{id}")
    suspend fun getUser(@PathVariable id: Long): User {
        return repository.findById(id)
            ?: throw NoSuchElementException("用户 $id 不存在")
    }

    @PostMapping
    suspend fun createUser(@RequestBody request: CreateUserRequest): User {
        val user = User(name = request.name, email = request.email)
        return repository.save(user)
    }
}
```

### 定时任务

```kotlin
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class ScheduledTasks(private val userService: UserService) {

    // 每小时执行一次
    @Scheduled(cron = "0 0 * * * *")
    fun cleanupExpiredUsers() {
        val expired = userService.findExpiredUsers()
        expired.forEach { userService.deactivate(it.id) }
        println("清理了 ${expired.size} 个过期用户")
    }

    // 每 30 秒执行一次
    @Scheduled(fixedRate = 30000)
    fun healthCheck() {
        // 健康检查逻辑
    }
}
```

### 事件机制

```kotlin
import org.springframework.context.ApplicationEvent
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service

// 定义事件
class UserCreatedEvent(val user: User) : ApplicationEvent(user)

// 发布事件
@Service
class UserService(
    private val repository: UserRepository,
    private val eventPublisher: ApplicationEventPublisher
) {
    fun create(request: CreateUserRequest): User {
        val user = repository.save(User(name = request.name, email = request.email))
        // 发布事件
        eventPublisher.publishEvent(UserCreatedEvent(user))
        return user
    }
}

// 监听事件
@Component
class UserEventListener {

    @EventListener
    fun handleUserCreated(event: UserCreatedEvent) {
        println("新用户创建: ${event.user.name}")
        // 发送欢迎邮件等
    }
}
```

## 注意事项

- **Kotlin 类默认是 final**：Spring 的 CGLIB 代理需要类可以被继承，必须使用 kotlin-spring 插件
- **JPA 实体需要无参构造器**：使用 kotlin-jpa 插件自动生成
- **不要用 lateinit 注入可选依赖**：可选依赖用 `@Autowired(required = false)` 配合可空类型
- **Jackson 与数据类**：使用 jackson-module-kotlin 支持数据类的反序列化
- **避免在伴生对象中定义常量**：Kotlin 的 const val 在伴生对象中会被编译为静态字段，但普通 val 不会

### all-open 插件为什么必需：代理机制与 final 的冲突

`kotlin("plugin.spring")` 本质是 all-open 插件的一个预设。拆开讲：

1. Kotlin 的类与成员**默认 final**（这也是 Effective Kotlin 推荐的设计：继承是显式授权）。
2. Spring 的 `@Transactional`、`@Async`、`@Cacheable`、配置类 CGLIB 增强，实现方式都是**生成目标类的子类**并在覆写的方法里织入切面——final 类无法被继承，代理无从建立。
3. `plugin.spring` 的行为：把标注了 `@Component`/`@Transactional`/`@Async`/`@Cacheable` 等指定注解的类自动 open（类与方法都打开）。自定义注解需要代理时，在 build 脚本里追加：

```kotlin
allOpen {
    annotation("com.example.annotation.Proxied")   // 标了它的类自动 open
}
```

易错点：忘记插件的症状非常隐蔽——不代理时**功能照常运行**，只是事务不回滚、缓存不命中、异步变同步；往往到故障复盘时才发现「@Transactional 根本没生效」。评审看到事务注解，顺手确认 build 脚本里有 `plugin.spring`。

配套的 `plugin.jpa` 是 no-arg 插件预设：JPA 规范要求实体有无参构造器，而 Kotlin 构造器必填参数与它冲突；插件在字节码层生成零参构造器（并半初始化字段），实体类的 Kotlin 签名保持不变。

### Spring 6 / WebFlux 挂起函数的语义细节

前文协程 Controller 的补充说明：

- **框架侧的协程桥**：Spring MVC 与 WebFlux 从 Spring 6 起原生识别 `suspend` 处理函数，内部把挂起函数桥接为响应式类型（MVC 侧经异步 Servlet、WebFlux 侧直接对接 Reactor）。业务代码不出现 `Mono`/`Flux` 也能获得非阻塞——但**应用要自己接好协程上下文**，异常统一走 `@ExceptionHandler`（协程异常会正常抛到框架层）。
- **返回 `Flow<T>` 的语义**：`suspend fun getUsers(): Flow<User>` 是流式响应（SSE/流式 JSON）；想要普通 JSON 数组直接返回 `List<User>`。新人常见混淆：把列表接口写成 Flow 返回，客户端拿到的是分片流式响应。
- **不能混搭的点**：同一个 Controller 方法不能既返回 `Mono<T>` 又用 suspend——选一种；响应式管道（`map`/`flatMap`）里调用挂起函数要用 `mono { }` / `flow { }` 桥接，直接在 lambda 里 `suspend` 调用编译不过。
- **与阻塞驱动的边界**：挂起 Controller 搭配的是非阻塞驱动（R2DBC、WebClient）。挂起函数里调用 JDBC/RestTemplate 这类阻塞 API 会占住事件循环线程——要么迁 R2DBC，要么把阻塞调用包进 `withContext(Dispatchers.IO)`（此时实际是「协程外形的线程池模型」，非阻塞收益归零，但至少不卡事件循环）。

## 进阶用法

### 自定义条件装配

```kotlin
import org.springframework.context.annotation.Condition
import org.springframework.context.annotation.ConditionContext
import org.springframework.core.type.AnnotatedTypeMetadata

// 自定义条件注解
@Target(AnnotationTarget.CLASS, AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@Conditional(OnFeatureEnabledCondition::class)
annotation class ConditionalOnFeature(val feature: String)

class OnFeatureEnabledCondition : Condition {
    override fun matches(context: ConditionContext, metadata: AnnotatedTypeMetadata): Boolean {
        val feature = metadata.getAnnotationAttributes(ConditionalOnFeature::class.java.name)
            ?.get("feature") as? String ?: return false
        return context.environment.getProperty("app.features.$feature", "false") == "true"
    }
}
```

### Kotlin 协程事务

```kotlin
import org.springframework.transaction.support.TransactionTemplate
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

suspend fun <T> transactional(template: TransactionTemplate, block: suspend () -> T): T {
    return withContext(Dispatchers.IO) {
        template.execute {
            runBlocking { block() }
        } as T
    }
}
```
