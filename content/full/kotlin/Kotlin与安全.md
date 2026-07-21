---
order: 83
title: Kotlin与安全
module: kotlin
category: Kotlin
difficulty: intermediate
description: Kotlin安全编程
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与并发安全
  - kotlin/Kotlin与WebSocket
  - kotlin/协程调度器与上下文
  - kotlin/Flow冷流与SharedFlow和StateFlow
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

安全编程是指在编写代码时主动防范各种安全威胁，包括空指针异常、数据泄露、注入攻击、密码存储不安全等。Kotlin 在语言层面提供了空安全机制，大幅减少了空指针异常。但在实际开发中，还有许多其他安全问题需要关注，比如输入验证、密码处理、加密解密、网络安全等。

本文涵盖 Kotlin 开发中常见的安全问题和最佳实践，帮助你在编写代码时避免常见的安全漏洞。

## 基础概念

- **空安全（Null Safety）**：Kotlin 的类型系统区分可空和不可空类型，在编译期防止空指针异常
- **输入验证（Input Validation）**：永远不要信任用户输入，所有外部数据都要验证
- **加密（Encryption）**：用算法将明文转换为密文，保护敏感数据
- **哈希（Hashing）**：单向转换，用于密码存储，不可逆
- **注入攻击（Injection）**：攻击者通过输入恶意数据来执行非预期操作

## 快速上手

### 空安全基础

```kotlin
// Kotlin 的空安全是第一道防线
fun process(value: String?) {
    // 安全调用：如果 value 为 null，整个表达式返回 null
    val length = value?.length

    // Elvis 运算符：提供默认值
    val safeLength = value?.length ?: 0

    // let 模式：只在非空时执行
    value?.let {
        println("值是: $it")
    }

    // requireNotNull：如果为 null 则抛出异常
    val nonNull = requireNotNull(value) { "值不能为空" }
}
```

### 密码哈希

```kotlin
import org.mindrot.jbcrypt.BCrypt

class PasswordService {
    // 哈希密码：使用 BCrypt 自动加盐
    fun hashPassword(password: String): String {
        return BCrypt.hashpw(password, BCrypt.gensalt())
    }

    // 验证密码
    fun checkPassword(password: String, hash: String): Boolean {
        return BCrypt.checkpw(password, hash)
    }
}

fun main() {
    val service = PasswordService()
    val hash = service.hashPassword("mySecret123")
    println("哈希值: $hash")
    println("验证正确密码: ${service.checkPassword("mySecret123", hash)}")  // true
    println("验证错误密码: ${service.checkPassword("wrongPassword", hash)}")  // false
}
```

## 详细用法

### 输入验证

永远不要信任用户输入，所有外部数据都要验证：

```kotlin
// 验证工具类
object Validator {
    // 验证邮箱格式
    fun isValidEmail(email: String): Boolean {
        val regex = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
        return regex.matches(email)
    }

    // 验证密码强度
    fun isValidPassword(password: String): Boolean {
        if (password.length < 8) return false
        if (!password.any { it.isDigit() }) return false
        if (!password.any { it.isLetter() }) return false
        return true
    }

    // 验证用户名（只允许字母数字下划线）
    fun isValidUsername(name: String): Boolean {
        val regex = Regex("^[a-zA-Z0-9_]{3,20}$")
        return regex.matches(name)
    }
}

// 在业务逻辑中使用
fun registerUser(username: String, email: String, password: String): Result<User> {
    // 逐项验证
    if (!Validator.isValidUsername(username)) {
        return Result.failure(IllegalArgumentException("用户名格式不合法"))
    }
    if (!Validator.isValidEmail(email)) {
        return Result.failure(IllegalArgumentException("邮箱格式不合法"))
    }
    if (!Validator.isValidPassword(password)) {
        return Result.failure(IllegalArgumentException("密码强度不足"))
    }
    return Result.success(User(username, email))
}
```

### SQL 注入防护

```kotlin
import org.jetbrains.exposed.sql.*

// 错误做法：字符串拼接，容易被 SQL 注入
fun findUserUnsafe(name: String): List<User> {
    // 危险！攻击者可以输入 "'; DROP TABLE users; --"
    val query = "SELECT * FROM users WHERE name = '$name'"
    return emptyList()  // 不要这样做
}

// 正确做法：使用参数化查询
fun findUserSafe(name: String): List<String> {
    return transaction {
        // Exposed 自动参数化，防止 SQL 注入
        Users.select { Users.name eq name }
            .map { it[Users.name] }
    }
}

// 使用原生 JDBC 时的参数化查询
fun findUserWithJdbc(name: String, connection: java.sql.Connection): List<String> {
    val results = mutableListOf<String>()
    // 使用 PreparedStatement，参数自动转义
    val stmt = connection.prepareStatement("SELECT * FROM users WHERE name = ?")
    stmt.setString(1, name)  // 参数化，安全
    val rs = stmt.executeQuery()
    while (rs.next()) {
        results.add(rs.getString("name"))
    }
    return results
}
```

### 数据加密

```kotlin
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.IvParameterSpec
import java.util.Base64

class AesEncryptor {
    // 生成 AES 密钥
    fun generateKey(): SecretKey {
        val keyGen = KeyGenerator.getInstance("AES")
        keyGen.init(256)  // 256 位密钥
        return keyGen.generateKey()
    }

    // 加密
    fun encrypt(plainText: String, key: SecretKey): String {
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv  // 获取初始化向量
        val encrypted = cipher.doFinal(plainText.toByteArray())
        // 将 IV 和密文一起编码
        val combined = iv + encrypted
        return Base64.getEncoder().encodeToString(combined)
    }

    // 解密
    fun decrypt(encryptedText: String, key: SecretKey): String {
        val combined = Base64.getDecoder().decode(encryptedText)
        // 提取 IV（前 16 字节）
        val iv = combined.copyOfRange(0, 16)
        // 提取密文
        val encrypted = combined.copyOfRange(16, combined.size)
        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.DECRYPT_MODE, key, IvParameterSpec(iv))
        return String(cipher.doFinal(encrypted))
    }
}

fun main() {
    val encryptor = AesEncryptor()
    val key = encryptor.generateKey()
    val encrypted = encryptor.encrypt("敏感数据", key)
    println("加密后: $encrypted")
    val decrypted = encryptor.decrypt(encrypted, key)
    println("解密后: $decrypted")
}
```

### 日志安全

不要在日志中输出敏感信息：

```kotlin
object SafeLogger {
    // 敏感字段列表
    private val sensitiveFields = setOf("password", "token", "secret", "creditCard", "ssn")

    // 脱敏处理
    fun sanitize(message: String): String {
        var result = message
        for (field in sensitiveFields) {
            // 替换敏感字段值为 ***
            val regex = Regex("""(?i)($field["\s:=]+)(\S+)""")
            result = result.replace(regex) { "${it.groupValues[1]}***" }
        }
        return result
    }

    fun info(message: String) {
        println("[INFO] ${sanitize(message)}")
    }
}

fun main() {
    // 安全的日志输出
    SafeLogger.info("User login: password=secret123")
    // 输出: [INFO] User login: password=***
}
```

## 常见场景

### API Token 安全处理

```kotlin
class TokenManager {
    // 不要把 Token 存在普通变量中
    private var token: String? = null

    // 设置 Token 后清除日志中的痕迹
    fun setToken(newToken: String) {
        // 先清零旧 Token 的内存
        token?.let { old ->
            val chars = old.toCharArray()
            chars.fill('\u0000')
        }
        token = newToken
    }

    // 使用后尽快清除
    fun useToken(action: (String) -> Unit) {
        token?.let { action(it) }
    }

    // 清除 Token
    fun clearToken() {
        token = null
    }
}
```

### HTTPS 与证书验证

```kotlin
import io.ktor.client.*
import io.ktor.client.engine.cio.*

// 正确做法：始终使用 HTTPS
val secureClient = HttpClient(CIO) {
    // 不要禁用证书验证
    // 错误做法：trustAllCertificates = true
}

// 如果必须使用自签名证书（仅限开发环境）
fun createDevClient(): HttpClient {
    // 生产环境绝对不能这样做
    return HttpClient(CIO) {
        // 仅在开发环境使用
    }
}
```

### 文件路径安全

```kotlin
import java.io.File

class SafeFileAccess(private val baseDir: String) {
    // 防止路径遍历攻击
    fun safeRead(filePath: String): String? {
        val base = File(baseDir).canonicalPath
        val target = File(baseDir, filePath).canonicalPath

        // 检查目标路径是否在基础目录内
        if (!target.startsWith(base)) {
            println("非法路径访问: $filePath")
            return null
        }

        return File(target).takeIf { it.exists() }?.readText()
    }
}

fun main() {
    val accessor = SafeFileAccess("/app/data")
    // 正常访问
    accessor.safeRead("config.json")
    // 路径遍历攻击会被阻止
    accessor.safeRead("../../etc/passwd")  // 返回 null
}
```

## 注意事项

- **不要硬编码密钥**：加密密钥、API Token 等不要写在代码中，使用环境变量或密钥管理服务
- **不要自己实现加密算法**：使用成熟的库和标准算法（如 AES、RSA），不要自己发明加密方式
- **不要在日志中打印敏感数据**：密码、Token、身份证号等不能出现在日志中
- **不要忽略 HTTPS**：所有网络通信都应使用 HTTPS，不要为了方便降级为 HTTP
- **不要使用 MD5/SHA1 存储密码**：这些算法已被证明不安全，使用 BCrypt、Argon2 等专用哈希算法
- **Kotlin 空安全不是万能的**：Kotlin 的空安全只在编译期检查，与 Java 互操作时仍可能出现空指针

## 进阶用法

### 安全的随机数生成

```kotlin
import java.security.SecureRandom

object SecureRandomUtil {
    private val secureRandom = SecureRandom()

    // 生成安全的随机字符串
    fun randomString(length: Int): String {
        val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        return (1..length)
            .map { chars[secureRandom.nextInt(chars.length)] }
            .joinToString("")
    }

    // 生成安全的随机整数
    fun randomInt(min: Int, max: Int): Int {
        return secureRandom.nextInt(max - min + 1) + min
    }
}

// 不要使用 java.util.Random 生成安全相关的随机数
// 它是伪随机数，可被预测
```

### JWT Token 处理

```kotlin
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import java.util.Date

class JwtService(private val secret: String) {
    private val algorithm = Algorithm.HMAC256(secret)

    // 生成 Token
    fun createToken(userId: String): String {
        return JWT.create()
            .withClaim("userId", userId)
            .withIssuedAt(Date())
            .withExpiresAt(Date(System.currentTimeMillis() + 3600000))  // 1 小时过期
            .sign(algorithm)
    }

    // 验证 Token
    fun verifyToken(token: String): String? {
        return try {
            val verifier = JWT.require(algorithm).build()
            val decoded = verifier.verify(token)
            decoded.getClaim("userId").asString()
        } catch (e: Exception) {
            null  // Token 无效或过期
        }
    }
}
```

### 安全的序列化配置

```kotlin
import kotlinx.serialization.json.Json

// 安全的 JSON 配置
val safeJson = Json {
    ignoreUnknownKeys = true
    // 不允许特殊字符，防止 JSON 注入
    isLenient = false
    // 严格模式，防止意外解析
    allowSpecialFloatingPointValues = false
    // 不允许注释，防止解析歧义
    allowComments = false
}
```
