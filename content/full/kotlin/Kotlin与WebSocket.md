---
order: 82
title: Kotlin与WebSocket
module: kotlin
category: Kotlin
difficulty: intermediate
description: 'Ktor WebSocket'
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与时间
  - kotlin/Kotlin与并发安全
  - kotlin/Kotlin与安全
  - kotlin/协程调度器与上下文
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

WebSocket 是一种在客户端和服务器之间建立持久双向通信连接的协议。与 HTTP 请求-响应模式不同，WebSocket 连接建立后，双方可以随时发送数据，适合实时聊天、实时推送、在线协作等场景。

Ktor 提供了完整的 WebSocket 支持，包括服务端和客户端。基于 Kotlin 协程，Ktor 的 WebSocket API 是非阻塞的，使用起来简洁直观。

## 基础概念

- **WebSocket 连接**：客户端通过 HTTP 升级请求建立 WebSocket 连接，之后双方可以自由发送消息
- **Frame（帧）**：WebSocket 消息的基本单位，有文本帧、二进制帧、关闭帧、Ping/Pong 帧等
- **incoming**：接收消息的通道，通过遍历它来接收客户端发来的消息
- **outgoing**：发送消息的通道，通过它向客户端推送消息
- **Session**：一个 WebSocket 连接对应一个会话对象

## 快速上手

添加依赖：

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.ktor:ktor-server-core:2.3.7")
    implementation("io.ktor:ktor-server-websockets:2.3.7")
    implementation("io.ktor:ktor-server-netty:2.3.7")
    // 客户端 WebSocket
    implementation("io.ktor:ktor-client-websockets:2.3.7")
    implementation("io.ktor:ktor-client-cio:2.3.7")
}
```

最简单的 WebSocket 服务器：

```kotlin
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import java.time.Duration

fun main() {
    embeddedServer(Netty, port = 8080) {
        // 安装 WebSocket 插件
        install(WebSockets) {
            pingPeriod = Duration.ofSeconds(15)   // Ping 间隔
            timeout = Duration.ofSeconds(30)      // 超时时间
            maxFrameSize = Long.MAX_VALUE          // 最大帧大小
            masking = false                         // 是否掩码
        }

        routing {
            // 定义 WebSocket 路由
            webSocket("/ws") {
                println("新连接建立")
                // 发送欢迎消息
                send(Frame.Text("欢迎连接!"))
                // 接收消息循环
                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        val text = frame.readText()
                        println("收到: $text")
                        // 回显消息
                        send(Frame.Text("Echo: $text"))
                    }
                }
                println("连接关闭")
            }
        }
    }.start(wait = true)
}
```

## 详细用法

### 服务端 WebSocket 处理

```kotlin
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import java.util.*

// 管理所有连接的客户端
val connections = Collections.synchronizedSet<WebSocketSession>(mutableSetOf())

fun Application.configureWebSockets() {
    install(WebSockets) {
        pingPeriod = Duration.ofSeconds(15)
        timeout = Duration.ofSeconds(30)
    }

    routing {
        webSocket("/chat") {
            // 新连接加入
            connections.add(this)
            println("当前在线: ${connections.size}")

            try {
                for (frame in incoming) {
                    when (frame) {
                        is Frame.Text -> {
                            val text = frame.readText()
                            // 广播给所有连接的客户端
                            connections.forEach { connection ->
                                connection.send(Frame.Text(text))
                            }
                        }
                        is Frame.Binary -> {
                            val bytes = frame.readBytes()
                            println("收到二进制数据: ${bytes.size} 字节")
                        }
                        is Frame.Close -> {
                            println("客户端请求关闭连接")
                            break
                        }
                        else -> {
                            // 忽略 Ping、Pong 等帧
                        }
                    }
                }
            } catch (e: Exception) {
                println("连接异常: ${e.message}")
            } finally {
                // 连接断开，从列表中移除
                connections.remove(this)
                println("连接断开，当前在线: ${connections.size}")
            }
        }
    }
}
```

### 客户端 WebSocket

```kotlin
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*

fun main() = runBlocking {
    // 创建支持 WebSocket 的客户端
    val client = HttpClient(CIO) {
        install(WebSockets)
    }

    // 连接到 WebSocket 服务器
    client.webSocket(host = "localhost", port = 8080, path = "/ws") {
        // 启动发送协程
        launch {
            while (true) {
                // 发送文本消息
                send(Frame.Text("Hello from client"))
                delay(1000)
            }
        }

        // 接收消息
        for (frame in incoming) {
            when (frame) {
                is Frame.Text -> {
                    val text = frame.readText()
                    println("收到: $text")
                }
                else -> {}
            }
        }
    }

    client.close()
}
```

### 带认证的 WebSocket

```kotlin
import io.ktor.server.auth.*
import io.ktor.server.websocket.*

fun Application.authenticatedWebSocket() {
    install(WebSockets)
    install(Authentication) {
        basic {
            validate { credentials ->
                if (credentials.name == "admin" && credentials.password == "secret") {
                    UserIdPrincipal(credentials.name)
                } else null
            }
        }
    }

    routing {
        // WebSocket 路由需要认证
        webSocket("/secure-ws") {
            // 获取认证用户
            val principal = call.principal<UserIdPrincipal>()
            val username = principal?.name ?: "unknown"
            send(Frame.Text("欢迎, $username!"))

            for (frame in incoming) {
                if (frame is Frame.Text) {
                    val text = frame.readText()
                    send(Frame.Text("[$username] $text"))
                }
            }
        }
    }
}
```

### 消息序列化

```kotlin
import kotlinx.serialization.*
import kotlinx.serialization.json.*

// 定义消息类型
@Serializable
sealed class ChatMessage {
    abstract val sender: String
    abstract val timestamp: Long

    @Serializable
    @SerialName("text")
    data class TextMessage(
        override val sender: String,
        override val timestamp: Long,
        val content: String
    ) : ChatMessage()

    @Serializable
    @SerialName("join")
    data class JoinMessage(
        override val sender: String,
        override val timestamp: Long
    ) : ChatMessage()

    @Serializable
    @SerialName("leave")
    data class LeaveMessage(
        override val sender: String,
        override val timestamp: Long
    ) : ChatMessage()
}

val json = Json { ignoreUnknownKeys = true }

// 发送序列化消息
suspend fun WebSocketSession.sendSerialized(message: ChatMessage) {
    val jsonString = json.encodeToString(message)
    send(Frame.Text(jsonString))
}

// 接收并反序列化消息
suspend fun WebSocketSession.receiveDeserialized(): ChatMessage? {
    for (frame in incoming) {
        if (frame is Frame.Text) {
            return json.decodeFromString<ChatMessage>(frame.readText())
        }
    }
    return null
}
```

## 常见场景

### 聊天室

```kotlin
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import java.util.concurrent.*

class ChatRoom {
    // 房间内的所有成员
    private val members = ConcurrentHashMap<String, WebSocketSession>()

    // 加入房间
    suspend fun join(username: String, session: WebSocketSession) {
        // 如果同名用户已存在，踢出旧连接
        members[username]?.close(CloseReason(CloseReason.Codes.NORMAL, "被新连接替代"))
        members[username] = session
        // 广播加入消息
        broadcast("系统", "$username 加入了聊天室")
    }

    // 离开房间
    suspend fun leave(username: String) {
        members.remove(username)
        broadcast("系统", "$username 离开了聊天室")
    }

    // 发送消息
    suspend fun sendMessage(sender: String, content: String) {
        broadcast(sender, content)
    }

    // 广播给所有成员
    private suspend fun broadcast(sender: String, message: String) {
        val formatted = "[$sender] $message"
        members.values.forEach { session ->
            try {
                session.send(Frame.Text(formatted))
            } catch (e: Exception) {
                // 发送失败，移除断开的连接
            }
        }
    }

    fun memberCount(): Int = members.size
}

// 在路由中使用
val chatRoom = ChatRoom()

routing {
    webSocket("/chat/{username}") {
        val username = call.parameters["username"] ?: "匿名"
        chatRoom.join(username, this)

        try {
            for (frame in incoming) {
                if (frame is Frame.Text) {
                    chatRoom.sendMessage(username, frame.readText())
                }
            }
        } finally {
            chatRoom.leave(username)
        }
    }
}
```

### 实时数据推送

```kotlin
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*

fun Application.realTimePush() {
    install(WebSockets)

    routing {
        webSocket("/stock/{symbol}") {
            val symbol = call.parameters["symbol"] ?: "UNKNOWN"

            // 启动数据推送协程
            val pushJob = launch {
                while (true) {
                    val price = fetchStockPrice(symbol)
                    send(Frame.Text("""{"symbol":"$symbol","price":$price}"""))
                    delay(1000)  // 每秒推送一次
                }
            }

            try {
                // 接收客户端指令
                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        val command = frame.readText()
                        if (command == "pause") {
                            pushJob.cancel()
                        }
                    }
                }
            } finally {
                pushJob.cancel()
            }
        }
    }
}

// 模拟获取股票价格
private fun fetchStockPrice(symbol: String): Double {
    return 100.0 + Math.random() * 10
}
```

## 注意事项

- **必须安装 WebSockets 插件**：忘记安装会导致路由无法匹配
- **incoming 是冷流**：必须遍历 incoming 才能接收消息，不遍历消息会堆积
- **连接断开时清理资源**：在 finally 块中移除连接、取消协程等
- **并发安全**：多个协程可能同时操作共享状态（如连接列表），使用线程安全的集合
- **心跳机制**：配置 pingPeriod 保持连接活跃，防止被中间代理断开
- **帧大小限制**：默认最大帧大小有限制，传输大数据时需要调整 maxFrameSize

## 进阶用法

### 自动重连

```kotlin
import io.ktor.client.*
import io.ktor.client.plugins.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*

suspend fun connectWithRetry(
    host: String,
    port: Int,
    path: String,
    maxRetries: Int = 5
) {
    var retryCount = 0
    while (retryCount < maxRetries) {
        try {
            val client = HttpClient {
                install(WebSockets)
            }
            client.webSocket(host = host, port = port, path = path) {
                println("WebSocket 连接成功")
                retryCount = 0  // 重置重试计数

                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        println("收到: ${frame.readText()}")
                    }
                }
            }
            client.close()
        } catch (e: Exception) {
            retryCount++
            val delaySeconds = minOf(30, retryCount * 2)
            println("连接失败，${delaySeconds}秒后重试 ($retryCount/$maxRetries)")
            delay(delaySeconds * 1000L)
        }
    }
}
```

### 二进制数据传输

```kotlin
routing {
    webSocket("/binary") {
        for (frame in incoming) {
            when (frame) {
                is Frame.Binary -> {
                    val data = frame.readBytes()
                    // 处理二进制数据
                    println("收到 ${data.size} 字节")
                    // 回送处理结果
                    val result = processData(data)
                    send(Frame.Binary(true, result))
                }
                else -> {}
            }
        }
    }
}

private fun processData(data: ByteArray): ByteArray {
    // 示例：简单地将数据反转
    return data.reversedArray()
}
```
