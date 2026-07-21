---
order: 63
title: Kotlin与Spring
module: kotlin
category: Kotlin
difficulty: intermediate
description: Kotlin Spring Boot开发
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与Ktor
  - kotlin/Kotlin与Koin
  - kotlin/Kotlin与Gradle
  - kotlin/Kotlin与测试
prerequisites:
  - kotlin/概述与环境配置
---

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
