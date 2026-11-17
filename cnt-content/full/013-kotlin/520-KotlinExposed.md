---
order: 560
title: Kotlin 与 Exposed
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: Kotlin SQL框架Exposed
author: fanquanpp
updated: '2026-11-16'
related:
  - 'kotlin/540-KotlinArrow'
  - 'kotlin/490-KotlinKtor'
  - 'kotlin/530-KotlinKoin'
  - 'kotlin/500-KotlinKtorClient'
prerequisites:
  - 'kotlin/020-KotlinOverviewEnvSetup'
---


## 概述

Exposed 是 JetBrains 开发的 Kotlin SQL 框架，提供两种风格来操作数据库：DSL（领域特定语言）和 DAO（数据访问对象）。1.0 正式版（2026 年 1 月）起包结构统一迁移到 `org.jetbrains.exposed.v1.*`，并把 JDBC 与 R2DBC 拆成独立模块，可以按驱动选型。DSL 风格让你用 Kotlin 代码写 SQL 查询，类型安全且直观；DAO 风格则提供了类似 ORM 的对象映射。与 Hibernate 等重量级 ORM 不同，Exposed 轻量、透明，让你对 SQL 有完全的控制。

如果你需要在 Kotlin 项目中操作关系型数据库，Exposed 是一个 Kotlin 风格的轻量选择。

## 基础概念

- **Table**：表示数据库表，用 Kotlin 对象定义表结构
- **Column**：表示表中的列，支持类型安全的操作
- **Transaction**：所有数据库操作必须在事务中执行
- **DSL 风格**：用 Kotlin 函数直接写查询，如 `select { }`、`insert { }`
- **DAO 风格**：用 Entity 类映射表，通过 Entity 操作数据
- **SchemaUtils**：用于自动创建和更新表结构

## 快速上手

添加依赖：

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.jetbrains.exposed:exposed-core:1.0.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:1.0.0")
    // Exposed 1.0（2026-01 发布）新增 R2DBC 支持：需要响应式驱动时引入 exposed-r2dbc
    // 数据库驱动
    implementation("com.h2database:h2:2.2.224")      // H2 内存数据库
    implementation("org.postgresql:postgresql:42.7.1")  // PostgreSQL
    implementation("com.mysql:mysql-connector-j:8.3.0") // MySQL
    // 连接池（推荐）
    implementation("com.zaxxer:HikariCP:5.1.0")
}
```

最简单的使用：

```kotlin
import org.jetbrains.exposed.v1.core.*
import org.jetbrains.exposed.v1.jdbc.*
import org.jetbrains.exposed.v1.jdbc.transactions.transaction

// 定义表结构
object Users : Table() {
    val id = integer("id").autoIncrement()   // 自增主键
    val name = varchar("name", 50)            // varchar(50)
    val age = integer("age")                  // integer
    override val primaryKey = PrimaryKey(id)  // 指定主键
}

fun main() {
    // 连接数据库
    Database.connect("jdbc:h2:mem:test", driver = "org.h2.Driver")

    // 在事务中操作
    transaction {
        // 创建表
        SchemaUtils.create(Users)

        // 插入数据
        Users.insert {
            it[name] = "Alice"
            it[age] = 25
        }
        Users.insert {
            it[name] = "Bob"
            it[age] = 30
        }

        // 查询所有数据
        Users.selectAll().forEach { row ->
            println("${row[Users.id]}: ${row[Users.name]}, ${row[Users.age]}")
        }
    }
}
```

## 详细用法

### 使用连接池

```kotlin
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.jetbrains.exposed.v1.jdbc.Database

fun initDatabase(): Database {
    val config = HikariConfig().apply {
        jdbcUrl = "jdbc:postgresql://localhost:5432/mydb"
        driverClassName = "org.postgresql.Driver"
        username = "postgres"
        password = "secret"
        maximumPoolSize = 10
        connectionTimeout = 30000
    }
    val dataSource = HikariDataSource(config)
    return Database.connect(dataSource)
}
```

### 查询操作

```kotlin
import org.jetbrains.exposed.v1.core.*

fun queryDemo() = transaction {
    // 查询所有
    val allUsers = Users.selectAll().toList()

    // 条件查询
    val adults = Users.select { Users.age greater 18 }
        .map { it[Users.name] }

    // 多条件查询
    val result = Users.select {
        (Users.age greater 20) and (Users.name like "A%")
    }

    // 排序
    val sorted = Users.selectAll()
        .orderBy(Users.age to SortOrder.DESC)
        .orderBy(Users.name to SortOrder.ASC)

    // 限制结果数量
    val top10 = Users.selectAll()
        .limit(10)
        .offset(20)  // 分页：跳过前20条

    // 聚合函数
    val avgAge = Users.age.avg()
    val count = Users.id.count()
    val maxAge = Users.age.max()
    Users.select(avgAge, count, maxAge).single().let { row ->
        println("平均年龄: ${row[avgAge]}")
        println("总人数: ${row[count]}")
        println("最大年龄: ${row[maxAge]}")
    }

    // 分组
    Users.select(Users.age, Users.id.count())
        .groupBy(Users.age)
        .forEach { row ->
            println("年龄 ${row[Users.age]}: ${row[Users.id.count()]} 人")
        }

    // 去重
    val distinctAges = Users.select(Users.age).withDistinct()
}
```

### 插入操作

```kotlin
import org.jetbrains.exposed.v1.core.*

fun insertDemo() = transaction {
    // 插入单条
    Users.insert {
        it[name] = "Alice"
        it[age] = 25
    }

    // 插入并获取自增ID
    val id = Users.insert {
        it[name] = "Bob"
        it[age] = 30
    } get Users.id

    // 批量插入
    Users.batchInsert(listOf("Charlie", "David", "Eve")) { userName ->
        this[Users.name] = userName
        this[Users.age] = 20
    }

    // 插入或忽略（如果主键冲突则跳过）
    Users.insertIgnore {
        it[Users.id] = 1
        it[name] = "Alice"
        it[age] = 25
    }

    // 插入或更新（如果主键冲突则更新）
    Users.insertOrUpdate {
        it[Users.id] = 1
        it[name] = "Alice"
        it[age] = 26  // 如果ID=1已存在，更新年龄
    }
}
```

### 更新和删除

```kotlin
import org.jetbrains.exposed.v1.core.*

fun updateDeleteDemo() = transaction {
    // 更新
    Users.update({ Users.name eq "Alice" }) {
        it[age] = 26
    }

    // 条件更新
    Users.update({ Users.age less 18 }) {
        it[age] = 18
    }

    // 删除
    Users.deleteWhere { Users.name eq "Bob" }

    // 删除所有
    Users.deleteAll()
}
```

### 多表关联

```kotlin
import org.jetbrains.exposed.v1.core.*

// 定义订单表
object Orders : Table() {
    val id = integer("id").autoIncrement()
    val userId = integer("user_id").references(Users.id)  // 外键
    val amount = decimal("amount", 10, 2)
    val createdAt = varchar("created_at", 30)
    override val primaryKey = PrimaryKey(id)
}

fun joinDemo() = transaction {
    // 内连接
    (Users innerJoin Orders)
        .select(Users.name, Orders.amount)
        .where { Users.age greater 20 }
        .forEach { row ->
            println("${row[Users.name]}: ${row[Orders.amount]}")
        }

    // 左连接
    (Users leftJoin Orders)
        .select(Users.name, Orders.amount)
        .forEach { row ->
            val amount = row.getOrNull(Orders.amount) ?: "无订单"
            println("${row[Users.name]}: $amount")
        }

    // 别名（自连接等场景）
    val userAlias = Users.alias("u")
    val orderAlias = Orders.alias("o")
}
```

### DAO 风格

```kotlin
import org.jetbrains.exposed.v1.dao.*
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable

// 定义表
object Users : IntIdTable() {
    val name = varchar("name", 50)
    val age = integer("age")
}

// 定义 Entity
class User(id: EntityID<Int>) : IntEntity(id) {
    var name by Users.name
    var age by Users.age
}

// 定义 EntityClass
object UsersDao : IntEntityClass<User>(Users)

fun daoDemo() = transaction {
    SchemaUtils.create(Users)

    // 创建
    val user = User.new {
        name = "Alice"
        age = 25
    }

    // 读取
    val found = User[user.id]
    println("${found.name}, ${found.age}")

    // 更新
    found.age = 26

    // 删除
    found.delete()

    // 查询
    val adults = User.find { Users.age greater 18 }
    adults.forEach { println(it.name) }

    // 查询所有
    val all = User.all()
}
```

## 常见场景

### 与 Ktor 集成

```kotlin
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.v1.core.*
import org.jetbrains.exposed.v1.jdbc.*
import org.jetbrains.exposed.v1.jdbc.transactions.transaction

fun Application.configureDatabase() {
    val db = initDatabase()

    routing {
        // 获取用户列表
        get("/users") {
            val users = transaction {
                Users.selectAll().map { row ->
                    mapOf(
                        "id" to row[Users.id],
                        "name" to row[Users.name],
                        "age" to row[Users.age]
                    )
                }
            }
            call.respond(users)
        }

        // 获取单个用户
        get("/users/{id}") {
            val id = call.parameters["id"]?.toInt() ?: return@get call.respondText("无效ID")
            val user = transaction {
                Users.select { Users.id eq id }.singleOrNull()?.let { row ->
                    mapOf("id" to row[Users.id], "name" to row[Users.name])
                }
            }
            user?.let { call.respond(it) } ?: call.respondText("用户不存在")
        }
    }
}
```

## 注意事项

- **所有操作必须在事务中**：忘记 `transaction { }` 会导致运行时错误
- **Exposed 不是 ORM**：它不会自动管理关联关系、懒加载等，你需要自己写查询
- **连接管理**：生产环境务必使用连接池（如 HikariCP），不要每次创建新连接
- **SQL 注入防护**：Exposed 的参数化查询自动防止 SQL 注入，不要用字符串拼接
- **事务隔离级别**：默认使用数据库的隔离级别，可以在 `transaction` 中指定

## 进阶用法

### 自定义列类型

```kotlin
import org.jetbrains.exposed.sql.ColumnType
import org.jetbrains.exposed.sql.Table

// 自定义枚举列类型
inline fun <reified T : Enum<T>> Table.enum(name: String): Column<T> =
    registerColumn(name, object : ColumnType<T>() {
        override fun sqlType(): String = "VARCHAR(50)"
        override fun valueFromDB(value: Any): T =
            java.lang.Enum.valueOf(T::class.java, value.toString())
        override fun valueToDB(value: T?): Any? = value?.name
    })

object StatusTable : Table() {
    val id = integer("id")
    val status = enum<Status>("status")
}

enum class Status { ACTIVE, INACTIVE, PENDING }
```

### 事务嵌套

```kotlin
import org.jetbrains.exposed.sql.transactions.transaction

fun nestedTransactionDemo() = transaction {
    // 外层事务
    Users.insert { it[name] = "Outer"; it[age] = 1 }

    // 嵌套事务（savepoint）
    transaction {
        Users.insert { it[name] = "Inner"; it[age] = 2 }
        // 如果这里抛出异常，只会回滚到 savepoint
    }
}
```

### 数据库迁移

```kotlin
import org.jetbrains.exposed.sql.SchemaUtils

fun migrateDemo() = transaction {
    // 自动创建不存在的表
    SchemaUtils.create(Users, Orders)

    // 检查表是否存在
    val exists = SchemaUtils.tableExists(Users)

    // 添加新列（需要手动执行 ALTER TABLE）
    exec("ALTER TABLE users ADD COLUMN email VARCHAR(100)")
}
```
## 小练习（先自己做，再展开参考实现）

**练习 1：DSL 与 DAO 选型**。同一个「查活跃用户」需求，写出 DSL 与 DAO 两个版本，并说出 DAO 版本在「批量导入十万行」场景下为什么吃亏。

参考实现（DSL）：

```kotlin
transaction {
    Users.select { Users.active eq true }
        .map { it[Users.name] }
}
```

参考实现（DAO）：

```kotlin
transaction {
    User.find { Users.active eq true }.map { it.name }
}
```

DAO 吃亏的原因：每个查询结果物化成 Entity 对象并挂进实体缓存，十万行意味着十万对象与身份跟踪开销；DSL 只拿结果行。结论：报表/批处理用 DSL，领域对象交互用 DAO，混用要清楚两个世界的缓存互不相通。

**练习 2：事务边界**。`transaction { ... }` 之外的 `Table.select` 会发生什么？为什么 Exposed 强制把操作包进事务？

参考答案：抛 `NoTransactionException`——Exposed 的连接管理按事务生命周期租借，事务外没有绑定连接。设计动机：把「连接获取/提交/回滚/隔离级别」收口到一个显式边界，杜绝半途泄漏连接；Web 场景通常用 `newSuspendedTransaction`（R2DBC/协程环境）或 `transaction`（JDBC 同步环境）包住一个服务方法。

**练习 3：JDBC 与 R2DBC 的分界**。1.0 拆分 exposed-jdbc 与 exposed-r2dbc 后，一个协程 Web 服务想全程非阻塞，该怎么选模块与事务 API？

参考答案：选 `exposed-r2dbc`（基于 R2DBC 驱动，如 r2dbc-postgresql），事务用 `newSuspendedTransaction`——挂起而非阻塞线程；JDBC 模块的 `transaction` 是阻塞 API，放进协程必须经 `Dispatchers.IO` 隔离。判别式：驱动是 R2DBC 还是 JDBC，决定模块；调用方在不在协程里，决定事务 API。
