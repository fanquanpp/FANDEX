---
order: 530
title: Kotlin 与 Ktor
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: Ktor服务端框架
author: fanquanpp
updated: '2026-11-16'
related:
  - 'kotlin/410-KotlinGradle'
  - 'kotlin/540-KotlinArrow'
  - 'kotlin/520-KotlinExposed'
  - 'kotlin/530-KotlinKoin'
prerequisites:
  - 'kotlin/020-KotlinOverviewEnvSetup'
---

## 前置知识

- [Kotlin 与 Arrow](/kotlin/540-KotlinArrow)：建议先完成前一篇的学习

## 学习目标

- 能说出 Ktor 的两个核心抽象：Application（模块/插件装配）与 Routing（路由 DSL），并解释「插件即函数」的扩展模型
- 能用 embeddedServer 起一个带 ContentNegotiation 与 StatusPages 的最小服务
- 能解释 Ktor 3 相对 2 的架构变化：底层统一到 kotlinx-io，引擎（Netty/CIO/Jetty）API 不变
- 能选引擎并部署：Netty（性能）、CIO（纯 Kotlin）、Jetty（Servlet 兼容），以及 fat jar/容器的部署路径


## 概述

Ktor 是 JetBrains 开发的 Kotlin 服务端框架，基于协程构建，轻量、灵活、非阻塞。与 Spring Boot 等全功能框架不同，Ktor 采用插件化架构，你只引入需要的功能。它的 DSL 风格 API 让路由定义和配置非常直观。

Ktor 适合构建微服务、REST API、WebSocket 服务等。如果你喜欢轻量级框架，想要完全控制每个组件，Ktor 是一个很好的选择。

## 基础概念

- **Application**：Ktor 应用的入口，配置路由、插件等
- **Routing**：定义 URL 路径与处理函数的映射
- **Plugin**：插件，扩展框架功能，如 ContentNegotiation、Authentication、CORS 等
- **Pipeline**：请求处理管道，插件在管道的各个阶段拦截请求
- **embeddedServer**：嵌入式服务器，不需要外部容器，直接在代码中启动

## 快速上手

添加依赖：

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.ktor:ktor-server-core:3.6.1")
    implementation("io.ktor:ktor-server-netty:3.6.1")    // Netty 引擎
    implementation("io.ktor:ktor-server-content-negotiation:3.6.1")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.6.1")
    implementation("ch.qos.logback:logback-classic:1.5.18")
}
```

最简单的 Ktor 服务器：

```kotlin
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun main() {
    embeddedServer(Netty, port = 8080) {
        routing {
            // 定义路由
            get("/") {
                call.respondText("Hello, Ktor!")
            }
            get("/hello/{name}") {
                val name = call.parameters["name"] ?: "World"
                call.respondText("Hello, $name!")
            }
        }
    }.start(wait = true)
}
```

运行后访问 `http://localhost:8080` 和 `http://localhost:8080/hello/Alice`。

## 详细用法

### 路由定义

```kotlin
import io.ktor.server.routing.*
import io.ktor.server.response.*
import io.ktor.server.request.*

fun Application.configureRouting() {
    routing {
        // GET 请求
        get("/users") {
            call.respondText("用户列表")
        }

        // 带路径参数
        get("/users/{id}") {
            val id = call.parameters["id"]
            call.respondText("用户ID: $id")
        }

        // 带查询参数
        get("/search") {
            val query = call.request.queryParameters["q"] ?: ""
            val page = call.request.queryParameters["page"]?.toInt() ?: 1
            call.respondText("搜索: $query, 第${page}页")
        }

        // POST 请求
        post("/users") {
            val body = call.receiveText()
            call.respondText("创建用户: $body")
        }

        // PUT 请求
        put("/users/{id}") {
            val id = call.parameters["id"]
            val body = call.receiveText()
            call.respondText("更新用户 $id: $body")
        }

        // DELETE 请求
        delete("/users/{id}") {
            val id = call.parameters["id"]
            call.respondText("删除用户: $id")
        }

        // 路由分组
        route("/api") {
            get("/v1/status") { call.respondText("OK") }
            route("/v1/users") {
                get { call.respondText("用户列表") }
                post { call.respondText("创建用户") }
            }
        }
    }
}
```

### JSON 响应

```kotlin
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class User(val id: Int, val name: String, val email: String)

fun Application.configureSerialization() {
    // 安装 ContentNegotiation 插件
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            ignoreUnknownKeys = true
        })
    }

    routing {
        // 返回 JSON
        get("/users/{id}") {
            val id = call.parameters["id"]?.toInt() ?: 0
            call.respond(User(id, "Alice", "alice@example.com"))
        }

        // 接收 JSON 请求体
        post("/users") {
            val user = call.receive<User>()
            println("收到: $user")
            call.respond(mapOf("status" to "created", "user" to user))
        }

        // 返回列表
        get("/users") {
            val users = listOf(
                User(1, "Alice", "alice@example.com"),
                User(2, "Bob", "bob@example.com")
            )
            call.respond(users)
        }
    }
}
```

### 状态码和响应头

```kotlin
import io.ktor.http.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.configureResponses() {
    routing {
        get("/notfound") {
            call.respondText("资源不存在", status = HttpStatusCode.NotFound)
        }

        get("/created") {
            call.respondText("创建成功", status = HttpStatusCode.Created)
        }

        get("/headers") {
            call.response.headers.append("X-Custom-Header", "Hello")
            call.respondText("查看响应头")
        }

        // 重定向
        get("/old") {
            call.respondRedirect("/new")
        }

        get("/new") {
            call.respondText("新地址")
        }
    }
}
```

### 静态文件

```kotlin
import io.ktor.server.http.content.*
import io.ktor.server.routing.*

fun Application.configureStatic() {
    routing {
        // 静态文件服务
        static("/static") {
            resources("static")  // 从 classpath 的 static 目录
        }

        // 或者从文件系统
        staticFiles("/files", java.io.File("uploads"))
    }
}
```

## 常见场景

### RESTful API

```kotlin
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

@Serializable
data class CreateItemRequest(val name: String, val price: Double)

@Serializable
data class Item(val id: Int, val name: String, val price: Double)

// 模拟数据库
val items = mutableListOf<Item>()
var nextId = 1

fun Application.configureApi() {
    routing {
        route("/api/items") {
            // 获取所有
            get {
                call.respond(items)
            }

            // 获取单个
            get("/{id}") {
                val id = call.parameters["id"]?.toInt()
                val item = items.find { it.id == id }
                if (item != null) {
                    call.respond(item)
                } else {
                    call.respondText("未找到", status = HttpStatusCode.NotFound)
                }
            }

            // 创建
            post {
                val request = call.receive<CreateItemRequest>()
                val item = Item(nextId++, request.name, request.price)
                items.add(item)
                call.respond(item)
            }

            // 更新
            put("/{id}") {
                val id = call.parameters["id"]?.toInt()
                val request = call.receive<CreateItemRequest>()
                val index = items.indexOfFirst { it.id == id }
                if (index >= 0) {
                    items[index] = Item(id!!, request.name, request.price)
                    call.respond(items[index])
                } else {
                    call.respondText("未找到", status = HttpStatusCode.NotFound)
                }
            }

            // 删除
            delete("/{id}") {
                val id = call.parameters["id"]?.toInt()
                val removed = items.removeIf { it.id == id }
                if (removed) {
                    call.respondText("已删除")
                } else {
                    call.respondText("未找到", status = HttpStatusCode.NotFound)
                }
            }
        }
    }
}
```

### CORS 配置

```kotlin
import io.ktor.server.plugins.cors.routing.*
import io.ktor.http.*

fun Application.configureCORS() {
    install(CORS) {
        anyHost()  // 开发环境允许所有来源
        // 生产环境应指定具体来源
        // allowHost("example.com")
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowHeader(HttpHeaders.ContentType)
        allowCredentials = true
    }
}
```

### 请求日志

```kotlin
import io.ktor.server.plugins.calllogging.*
import io.ktor.server.application.*

fun Application.configureLogging() {
    install(CallLogging) {
        level = org.slf4j.event.Level.INFO
        // 只记录 API 请求
        filter { call -> call.request.path().startsWith("/api") }
        // 记录请求耗时
        format { call ->
            val status = call.response.status()
            val method = call.request.httpMethod.value
            val path = call.request.path()
            "[$method] $path -> $status"
        }
    }
}
```

## 注意事项

- **所有处理函数都是挂起函数**：路由处理函数在协程中执行，可以调用 suspend 函数
- **安装插件的顺序**：某些插件的安装顺序会影响行为，如 CORS 应在路由之前安装
- **不要阻塞线程**：在路由处理中不要调用阻塞 IO，使用协程或 `Dispatchers.IO`
- **异常处理**：未捕获的异常会返回 500 错误，建议安装 StatusPages 插件统一处理
- **引擎选择**：Netty 性能最好，CIO 是纯 Kotlin 实现，Jetty 支持 Servlet

## 进阶用法

### 认证

```kotlin
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm

fun Application.configureAuth() {
    val secret = "my-secret-key"
    val algorithm = Algorithm.HMAC256(secret)

    install(Authentication) {
        jwt("auth-jwt") {
            verifier(JWT.require(algorithm).build())
            validate { credential ->
                if (credential.payload.getClaim("userId").asString().isNotEmpty()) {
                    JWTPrincipal(credential.payload)
                } else null
            }
        }
    }

    routing {
        // 不需要认证
        post("/login") {
            // 验证用户名密码后生成 Token
            val token = JWT.create()
                .withClaim("userId", "1")
                .sign(algorithm)
            call.respond(mapOf("token" to token))
        }

        // 需要认证
        authenticate("auth-jwt") {
            get("/protected") {
                val principal = call.principal<JWTPrincipal>()
                val userId = principal!!.payload.getClaim("userId").asString()
                call.respondText("欢迎, 用户$userId")
            }
        }
    }
}
```

### 状态页面（错误处理）

```kotlin
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.http.*

fun Application.configureStatusPages() {
    install(StatusPages) {
        // 处理特定状态码
        status(HttpStatusCode.NotFound) { call, status ->
            call.respondText("页面不存在", status = status)
        }

        // 处理异常
        exception<IllegalArgumentException> { call, cause ->
            call.respondText("参数错误: ${cause.message}", status = HttpStatusCode.BadRequest)
        }

        exception<NotFoundException> { call, _ ->
            call.respondText("资源不存在", status = HttpStatusCode.NotFound)
        }

        // 兜底异常处理
        exception<Exception> { call, cause ->
            call.respondText("服务器错误: ${cause.message}", status = HttpStatusCode.InternalServerError)
        }
    }
}
```

### 应用配置文件

```kotlin
// application.conf (HOCON 格式)
// 放在 resources 目录下
/*
ktor {
    deployment {
        port = 8080
        host = 0.0.0.0
    }
    application {
        modules = [ com.example.ApplicationKt.module ]
    }
}
*/

// 在代码中读取配置
fun Application.module() {
    val port = environment.config.property("ktor.deployment.port").getString().toInt()
    val host = environment.config.property("ktor.deployment.host").getString()
    println("服务启动在 $host:$port")
}
```
## 小练习（先自己做，再展开参考实现）

**练习 1：最小服务扩容**。给 `embeddedServer(Netty, port = 8080) { }` 补齐三件事：JSON 序列化、统一异常页、健康检查路由。写出完整模块代码。

参考实现：

```kotlin
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.plugins.statuspages.*
import kotlinx.serialization.Serializable

@Serializable
data class Health(val status: String = "ok")

fun main() {
    embeddedServer(Netty, port = 8080) {
        install(ContentNegotiation) { json() }
        install(StatusPages) {
            exception<Throwable> { call, cause ->
                call.respondText("error: ${'$'}{cause.message}")
            }
        }
        routing {
            get("/health") { call.respond(Health()) }
        }
    }.start(wait = true)
}
```

自检问题：`install(ContentNegotiation) { json() }` 里 json() 的作用是什么？（答：把 kotlinx.serialization 的 Json 桥进 Ktor 的内容协商管线，让 respond(Health()) 能自动序列化为 JSON 并按 Accept 头协商。）

**练习 2：引擎选型**。三句话场景选引擎：内存敏感的 CLI 工具内嵌 HTTP、高并发网关、必须复用公司 Servlet 体系的旧容器。

参考答案：CLI 内嵌用 CIO（纯 Kotlin 实现无原生依赖，体积小）；高并发网关用 Netty（成熟的事件驱动引擎，Ktor 3 起还支持实验性 HTTP/3）；Servlet 体系用 Jetty（对接 Servlet 容器生态）。判别式：先看约束（体积/吞吐/兼容），再看引擎特性。

**练习 3：Ktor 2 迁移 3 的检查点**。说出 Ktor 3 相对 2 在「依赖」层面的一处关键变化，以及为什么大部分插件 API 不用改。

参考答案：Ktor 3 把底层字节缓冲统一迁移到 kotlinx-io（替代过去的 ktor-io/Netty 各自的缓冲抽象），依赖树里会出现 kotlinx-io 相关 artifact；插件层（install、routing DSL、ContentNegotiation）是稳定 API，迁移主要发生在自定义引擎扩展与底层缓冲操作——普通业务路由几乎零改动。
