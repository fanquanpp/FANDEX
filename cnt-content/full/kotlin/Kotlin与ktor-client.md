---
order: 71
title: 'Kotlin与ktor-client'
module: kotlin
category: Kotlin
difficulty: intermediate
description: 'Ktor HTTP客户端'
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与Exposed
  - kotlin/Kotlin与Koin
  - kotlin/Kotlin与测试
  - kotlin/Kotlin与协程Channel
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

Ktor Client 是 JetBrains 开发的 Kotlin HTTP 客户端库。它完全基于协程构建，支持多种引擎（CIO、OkHttp、Darwin 等），可以运行在 JVM、Android、iOS 和原生平台上。如果你需要在 Kotlin 项目中调用 REST API、下载文件或与 Web 服务交互，Ktor Client 是一个轻量且 Kotlin 风格的选择。

与其他 HTTP 客户端（如 Retrofit、OkHttp）相比，Ktor Client 的优势在于：原生协程支持、DSL 风格配置、多平台兼容、插件化架构。

## 基础概念

- **Engine（引擎）**：底层 HTTP 实现，如 CIO（Ktor 自带）、OkHttp、Darwin（iOS 原生）。不同平台可以选择不同引擎
- **Plugin（插件）**：Ktor 通过插件扩展功能，比如 ContentNegotiation（JSON 序列化）、Logging（日志）、Auth（认证）
- **HttpClient**：核心客户端对象，所有请求都通过它发出
- **HttpRequest/HttpResponse**：请求和响应对象，包含头信息、状态码、正文等

## 快速上手

添加依赖：

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.ktor:ktor-client-core:2.3.7")
    implementation("io.ktor:ktor-client-cio:2.3.7")
    // JSON 支持
    implementation("io.ktor:ktor-client-content-negotiation:2.3.7")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.7")
}
```

最简单的 GET 请求：

```kotlin
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.request.*
import io.ktor.client.statement.*

suspend fun main() {
    // 创建客户端，使用 CIO 引擎
    val client = HttpClient(CIO)

    // 发送 GET 请求
    val response: HttpResponse = client.get("https://httpbin.org/get")
    println("状态码: ${response.status.value}")
    println("响应体: ${response.bodyAsText()}")

    // 关闭客户端
    client.close()
}
```

## 详细用法

### 配置客户端

通过 DSL 配置客户端和插件：

```kotlin
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

val client = HttpClient(CIO) {
    // 安装 ContentNegotiation 插件，自动序列化/反序列化 JSON
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true     // 忽略未知字段
            prettyPrint = true           // 格式化输出
            isLenient = true             // 宽松解析
        })
    }

    // 配置默认请求参数
    defaultRequest {
        url("https://api.example.com/")
        // 添加公共请求头
        headers.append("X-App-Version", "1.0")
    }
}
```

### GET 请求与 JSON 解析

```kotlin
import kotlinx.serialization.Serializable

// 定义数据类，必须标记 @Serializable
@Serializable
data class User(val id: Int, val name: String, val email: String)

@Serializable
data class UserListResponse(val users: List<User>)

// 获取单个用户
suspend fun getUser(id: Int): User {
    return client.get("users/$id").body<User>()
}

// 获取用户列表
suspend fun getUsers(): List<User> {
    val response = client.get("users").body<UserListResponse>()
    return response.users
}

// 带查询参数的请求
suspend fun searchUsers(query: String, page: Int): List<User> {
    return client.get("users/search") {
        // 添加查询参数
        url {
            parameters.append("q", query)
            parameters.append("page", page.toString())
        }
    }.body<UserListResponse>().users
}
```

### POST/PUT/DELETE 请求

```kotlin
@Serializable
data class CreateUserRequest(val name: String, val email: String)

// POST 请求：创建资源
suspend fun createUser(name: String, email: String): User {
    return client.post("users") {
        // 设置请求头
        contentType(ContentType.Application.Json)
        // 设置请求体
        setBody(CreateUserRequest(name, email))
    }.body<User>()
}

// PUT 请求：更新资源
suspend fun updateUser(id: Int, name: String, email: String): User {
    return client.put("users/$id") {
        contentType(ContentType.Application.Json)
        setBody(CreateUserRequest(name, email))
    }.body<User>()
}

// DELETE 请求：删除资源
suspend fun deleteUser(id: Int) {
    val response = client.delete("users/$id")
    println("删除结果: ${response.status.value}")
}
```

### 处理请求头和响应头

```kotlin
// 自定义请求头
suspend fun requestWithAuth(token: String): String {
    val response = client.get("protected/data") {
        headers {
            append("Authorization", "Bearer $token")
            append("Accept", "application/json")
        }
    }
    // 读取响应头
    val contentType = response.headers["Content-Type"]
    val server = response.headers["Server"]
    println("Content-Type: $contentType, Server: $server")
    return response.bodyAsText()
}
```

### 文件下载与上传

```kotlin
import okio.FileSystem
import okio.Path.Companion.toPath

// 下载文件
suspend fun downloadFile(url: String, savePath: String) {
    val response = client.get(url)
    // 将响应体写入文件
    val fileData = response.body<ByteArray>()
    FileSystem.SYSTEM.write(savePath.toPath()) {
        write(fileData)
    }
    println("文件已保存到: $savePath")
}

// 上传文件（multipart）
suspend fun uploadFile(filePath: String): String {
    return client.submitFormWithBinaryData(
        url = "upload",
        formData = formData {
            // 添加文件
            append("file", File(filePath).readBytes(), Headers.build {
                append(HttpHeaders.ContentDisposition, "filename=\"${File(filePath).name}\"")
            })
            // 添加普通字段
            append("description", "上传的文件")
        }
    ).bodyAsText()
}
```

## 常见场景

### 调用 RESTful API

```kotlin
class ApiClient(private val client: HttpClient) {

    // 获取分页数据
    suspend fun getItems(page: Int, size: Int = 20): PageResult<Item> {
        return client.get("items") {
            url {
                parameters.append("page", page.toString())
                parameters.append("size", size.toString())
            }
        }.body()
    }

    // 提交表单数据
    suspend fun submitForm(name: String, value: String): Result {
        return client.submitForm(
            url = "submit",
            formParameters = Parameters.build {
                append("name", name)
                append("value", value)
            }
        ).body()
    }
}
```

### 添加日志和超时

```kotlin
import io.ktor.client.plugins.logging.*
import io.ktor.client.plugins.*

val client = HttpClient(CIO) {
    // 日志插件
    install(Logging) {
        logger = Logger.DEFAULT
        level = LogLevel.BODY  // 打印完整请求和响应体
    }

    // 超时配置
    install(HttpTimeout) {
        connectTimeoutMillis = 5000   // 连接超时 5 秒
        requestTimeoutMillis = 10000  // 请求超时 10 秒
        socketTimeoutMillis = 15000   // 读取超时 15 秒
    }
}
```

### 错误处理

```kotlin
import io.ktor.client.plugins.*

suspend fun safeRequest(): Result<User> {
    return try {
        val user = client.get("users/1").body<User>()
        Result.success(user)
    } catch (e: ClientRequestException) {
        // 4xx 错误
        println("客户端错误: ${e.response.status.value}")
        Result.failure(e)
    } catch (e: ServerResponseException) {
        // 5xx 错误
        println("服务器错误: ${e.response.status.value}")
        Result.failure(e)
    } catch (e: HttpRequestTimeoutException) {
        // 请求超时
        println("请求超时")
        Result.failure(e)
    } catch (e: Exception) {
        // 其他错误
        println("未知错误: ${e.message}")
        Result.failure(e)
    }
}
```

## 注意事项

- **必须关闭客户端**：HttpClient 使用完后要调用 `close()`，或者用 `use` 函数自动关闭
- **协程中使用**：所有请求方法都是 suspend 函数，必须在协程或另一个 suspend 函数中调用
- **引擎选择**：CIO 是纯 Kotlin 实现，跨平台兼容；OkHttp 在 JVM 上性能更好；Darwin 用于 iOS 原生
- **不要在主线程请求**：Android 上要在 IO 调度器上发起网络请求
- **JSON 序列化**：数据类必须添加 `@Serializable` 注解，且需要引入 kotlinx-serialization 插件

## 进阶用法

### Cookie 管理

```kotlin
import io.ktor.client.plugins.cookies.*

val client = HttpClient(CIO) {
    // 启用 Cookie 管理
    install(HttpCookies) {
        // 使用默认的内存 Cookie 存储
        storage = AcceptAllCookiesStorage()
    }
}
// 后续请求会自动携带和保存 Cookie
```

### 认证插件

```kotlin
import io.ktor.client.plugins.auth.*
import io.ktor.client.plugins.auth.providers.*

val client = HttpClient(CIO) {
    install(Auth) {
        // Basic 认证
        basic {
            credentials {
                BasicAuthCredentials(username = "admin", password = "secret")
            }
        }
        // Bearer Token 认证
        bearer {
            loadTokens {
                BearerTokens(accessToken = "your-token", refreshToken = "refresh-token")
            }
            // Token 过期时自动刷新
            refreshTokens {
                val newToken = refreshToken()  // 调用刷新接口
                BearerTokens(accessToken = newToken, refreshToken = null)
            }
        }
    }
}
```

### 响应验证

```kotlin
import io.ktor.client.plugins.*

val client = HttpClient(CIO) {
    // 自定义响应验证
    install(HttpResponseValidator) {
        // 验证响应状态码
        validateResponse { response ->
            if (response.status.value >= 400) {
                throw CustomApiException(response.status.value, response.bodyAsText())
            }
        }
        // 处理响应异常
        handleResponseException { request, cause ->
            println("请求 ${request.url} 失败: ${cause.message}")
        }
    }
}

class CustomApiException(val code: Int, val body: String) : Exception("API 错误 $code: $body")
```

### 多平台共享代码

Ktor Client 支持 Kotlin Multiplatform，可以在共享模块中编写网络代码：

```kotlin
// commonMain 中编写通用代码
expect val httpClientEngine: HttpClientEngine

val sharedClient = HttpClient(httpClientEngine) {
    install(ContentNegotiation) { json() }
}

// androidMain 中提供 OkHttp 引擎
actual val httpClientEngine: HttpClientEngine = OkHttp.create()

// iosMain 中提供 Darwin 引擎
actual val httpClientEngine: HttpClientEngine = Darwin.create()
```
