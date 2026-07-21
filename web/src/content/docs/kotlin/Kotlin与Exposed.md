---
order: 69
title: Kotlin与Exposed
module: kotlin
category: Kotlin
difficulty: intermediate
description: 'Kotlin SQL框架Exposed'
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与Arrow
  - kotlin/Kotlin与Ktor
  - kotlin/Kotlin与Koin
  - 'kotlin/Kotlin与ktor-client'
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

Exposed 是 JetBrains 开发的 Kotlin SQL 框架，提供两种风格来操作数据库：DSL（领域特定语言）和 DAO（数据访问对象）。DSL 风格让你用 Kotlin 代码写 SQL 查询，类型安全且直观；DAO 风格则提供了类似 ORM 的对象映射。与 Hibernate 等重量级 ORM 不同，Exposed 轻量、透明，让你对 SQL 有完全的控制。

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
    implementation("org.jetbrains.exposed:exposed-core:0.49.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.49.0")
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
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

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
import org.jetbrains.exposed.sql.Database

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
import org.jetbrains.exposed.sql.*

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
import org.jetbrains.exposed.sql.*

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
import org.jetbrains.exposed.sql.*

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
import org.jetbrains.exposed.sql.*

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
import org.jetbrains.exposed.dao.*
import org.jetbrains.exposed.dao.id.EntityID
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
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

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
