---
order: 340
title: Go 与数据库
module: 'go'
category: 后端技术
difficulty: intermediate
description: database/sql 与 ORM 实战：连接池、事务、NULL 处理、context 系列查询、GORM 关联与 sqlx/sqlc 选型。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'go/550-GoRedis'
  - 'go/540-GoMessageQueue'
  - 'go/330-GoJSON'
  - 'go/390-GoConfigManagement'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---


## 概述

数据库是应用程序持久化数据的核心组件。Go 标准库的 `database/sql` 包提供了统一的数据库操作接口，配合不同的驱动可以连接 MySQL、PostgreSQL、SQLite 等数据库。对于更复杂的需求，社区提供了 GORM 等 ORM 框架，简化数据库操作。

## 基础概念

在开始编码之前，需要理解数据库操作的几个核心概念：

- **database/sql**：Go 标准库的数据库接口，定义了通用的数据库操作方法。
- **驱动（Driver）**：实现 `database/sql` 接口的具体数据库连接库，如 `github.com/lib/pq`（PostgreSQL）。
- **连接池**：`database/sql` 自动管理连接池，无需手动创建和释放连接。
- **预处理语句（Prepared Statement）**：预编译 SQL 语句，防止 SQL 注入，提高重复查询性能。
- **事务（Transaction）**：将多个操作包装成原子单元，要么全部成功，要么全部回滚。
- **ORM**：对象关系映射，将数据库表映射为 Go 结构体，用 Go 代码操作数据库。

## 快速上手

使用 `database/sql` 连接 PostgreSQL：

```bash
go get github.com/lib/pq
```

> **驱动选型提示**：`lib/pq` 已进入维护模式，官方建议新项目使用 `github.com/jackc/pgx/v5`（性能更好、支持 LISTEN/NOTIFY 与 CopyFrom）。用 pgx 最简单的方式是保留 `database/sql` 接口：`sql.Open("pgx", dsn)`（驱动来自 `github.com/jackc/pgx/v5/stdlib`）。本篇示例以 `$1` 占位符书写，两种驱动通用。

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/lib/pq" // 导入驱动（init 函数注册驱动）
)

func main() {
    // 连接数据库
    db, err := sql.Open("postgres", "user=postgres dbname=mydb sslmode=disable")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // 测试连接
    err = db.Ping()
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("数据库连接成功")
}
```

想在本地零依赖跑通一套完整流程，可以用纯 Go 实现的 SQLite 驱动（无需 CGO）。先 `go get modernc.org/sqlite`，然后运行下面的完整程序：

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "modernc.org/sqlite" // 纯 Go SQLite 驱动，注册名为 "sqlite"
)

func main() {
    db, err := sql.Open("sqlite", "file:demo.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY, name TEXT, age INTEGER)`); err != nil {
        log.Fatal(err)
    }

    res, err := db.Exec("INSERT INTO users (name, age) VALUES (?, ?)", "小明", 25)
    if err != nil {
        log.Fatal(err)
    }
    id, _ := res.LastInsertId()

    var name string
    var age int
    if err := db.QueryRow("SELECT name, age FROM users WHERE id = ?", id).
        Scan(&name, &age); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("插入成功 id=%d，查询到 %s，%d 岁\n", id, name, age)
}
```

预期输出：

```text
插入成功 id=1，查询到 小明，25 岁
```

## 详细用法

### 1. 查询数据

```go
// 查询单行
var name string
var age int
err := db.QueryRow("SELECT name, age FROM users WHERE id = $1", 1).Scan(&name, &age)
if err == sql.ErrNoRows {
    fmt.Println("没有找到记录")
} else if err != nil {
    log.Fatal(err)
}
fmt.Printf("姓名: %s, 年龄: %d\n", name, age)

// 查询多行
rows, err := db.Query("SELECT id, name, age FROM users WHERE age > $1", 18)
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
    var id int
    var name string
    var age int
    if err := rows.Scan(&id, &name, &age); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("ID: %d, 姓名: %s, 年龄: %d\n", id, name, age)
}

// 检查遍历过程中是否有错误
if err = rows.Err(); err != nil {
    log.Fatal(err)
}
```

### 2. 插入数据

```go
// 插入数据并获取自增 ID
var newID int
err := db.QueryRow(
    "INSERT INTO users (name, age, email) VALUES ($1, $2, $3) RETURNING id",
    "小明", 25, "ming@example.com",
).Scan(&newID)
if err != nil {
    log.Fatal(err)
}
fmt.Println("新用户 ID:", newID)

// MySQL 写法
result, err := db.Exec("INSERT INTO users (name, age) VALUES (?, ?)", "小红", 22)
if err != nil {
    log.Fatal(err)
}
id, _ := result.LastInsertId()
affected, _ := result.RowsAffected()
```

### 3. 更新和删除

```go
// 更新
result, err := db.Exec("UPDATE users SET age = $1 WHERE id = $2", 26, 1)
if err != nil {
    log.Fatal(err)
}
affected, _ := result.RowsAffected()
fmt.Printf("更新了 %d 行\n", affected)

// 删除
result, err = db.Exec("DELETE FROM users WHERE id = $1", 1)
affected, _ = result.RowsAffected()
fmt.Printf("删除了 %d 行\n", affected)
```

### 4. 预处理语句

```go
// 创建预处理语句（防止 SQL 注入）
stmt, err := db.Prepare("SELECT name, age FROM users WHERE id = $1")
if err != nil {
    log.Fatal(err)
}
defer stmt.Close()

// 多次执行
for _, id := range []int{1, 2, 3} {
    var name string
    var age int
    err := stmt.QueryRow(id).Scan(&name, &age)
    if err != nil {
        log.Println(err)
        continue
    }
    fmt.Printf("ID %d: %s, %d岁\n", id, name, age)
}
```

### 5. 事务

```go
func TransferMoney(db *sql.DB, fromID, toID int, amount float64) error {
    // 开始事务
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    // 无论哪条路径退出都尝试回滚；已 Commit 的事务 Rollback 返回
    // ErrTxDone，无副作用，因此"无条件 defer Rollback + 成功后 Commit"
    // 是比按条件判断更简洁也更不容易漏的写法
    defer tx.Rollback()

    // 从转出账户扣款
    result, err := tx.Exec("UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1", amount, fromID)
    if err != nil {
        return err
    }
    if affected, _ := result.RowsAffected(); affected == 0 {
        return fmt.Errorf("余额不足或账户不存在")
    }

    // 向转入账户加款
    _, err = tx.Exec("UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, toID)
    if err != nil {
        return err
    }

    // 提交事务（Commit 之后 defer 的 Rollback 变成无害的 ErrTxDone）
    return tx.Commit()
}
```

### 6. context 系列查询与连接池配置

`database/sql` 的每个阻塞方法都有 `Context` 变体，生产代码应优先使用它们——请求取消或超时能一路传导到驱动，避免一条慢 SQL 长期占住 goroutine 与连接：

```go
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()

// QueryRowContext / QueryContext / ExecContext / BeginTx 一一对应
var name string
err := db.QueryRowContext(ctx, "SELECT name FROM users WHERE id = $1", 1).Scan(&name)

// 事务同样接受 context，超时自动回滚
tx, err := db.BeginTx(ctx, nil)
```

```go
db, _ := sql.Open("postgres", dsn)

db.SetMaxOpenConns(25)         // 最大打开连接数
db.SetMaxIdleConns(10)         // 最大空闲连接数
db.SetConnMaxLifetime(5 * time.Minute) // 连接最大存活时间
db.SetConnMaxIdleTime(1 * time.Minute) // 空闲连接最大存活时间
```

连接池参数的取值思路：`MaxOpenConns` 上限取"数据库总连接预算 / 服务实例数"，而不是越大越好——超过数据库承受能力的并发只会变成排队与报错；`ConnMaxLifetime` 应小于数据库或中间代理（如 PgBouncer）侧的连接空闲回收时间，避免拿到已被服务端关掉的死连接。

### 7. 使用 GORM

```bash
go get gorm.io/gorm
go get gorm.io/driver/postgres
```

```go
import "gorm.io/gorm"

// 定义模型
type User struct {
    ID    uint   `gorm:"primaryKey"`
    Name  string `gorm:"size:100;not null"`
    Email string `gorm:"size:200;uniqueIndex"`
    Age   int
}

// 连接数据库
db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

// 自动迁移（创建表）
db.AutoMigrate(&User{})

// 创建
db.Create(&User{Name: "小明", Email: "ming@example.com", Age: 25})

// 查询
var user User
db.First(&user, 1)                    // 按 ID 查询
db.First(&user, "name = ?", "小明")    // 按条件查询

var users []User
db.Where("age > ?", 18).Find(&users)  // 条件查询

// 更新
db.Model(&user).Update("Age", 26)
db.Model(&user).Updates(User{Age: 26, Name: "小明2"})

// 删除
db.Delete(&user)
```

### 8. GORM 关联

```go
type Order struct {
    ID      uint
    UserID  uint
    User    User     // 属于 User
    Items   []Item   // 有多个 Item
}

type Item struct {
    ID      uint
    OrderID uint
    Name    string
    Price   float64
}

// 预加载关联
var orders []Order
db.Preload("User").Preload("Items").Find(&orders)

// Joins 预加载
db.Joins("User").Find(&orders)
```

## 常见场景

### 场景一：分页查询

```go
func ListUsers(db *sql.DB, page, pageSize int) ([]User, int, error) {
    offset := (page - 1) * pageSize

    // 查询总数
    var total int
    db.QueryRow("SELECT COUNT(*) FROM users").Scan(&total)

    // 查询分页数据
    rows, err := db.Query("SELECT id, name, age FROM users ORDER BY id LIMIT $1 OFFSET $2", pageSize, offset)
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        rows.Scan(&u.ID, &u.Name, &u.Age)
        users = append(users, u)
    }

    return users, total, nil
}
```

### 场景二：数据库迁移

```go
func Migrate(db *sql.DB) error {
    queries := []string{
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(200) UNIQUE,
            age INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    }

    for _, q := range queries {
        if _, err := db.Exec(q); err != nil {
            return err
        }
    }
    return nil
}
```

### 场景三：NULL 值处理

```go
// 使用 sql.NullString 等类型处理 NULL
var name sql.NullString
var age sql.NullInt64
err := db.QueryRow("SELECT name, age FROM users WHERE id = $1", 1).Scan(&name, &age)

if name.Valid {
    fmt.Println("姓名:", name.String)
}
if age.Valid {
    fmt.Println("年龄:", age.Int64)
}

// 或使用 COALESCE 提供默认值
db.QueryRow("SELECT COALESCE(name, ''), COALESCE(age, 0) FROM users WHERE id = $1", 1)
```

更多时候更干净的做法是让列可空类型直接映射为 Go 指针：把 Scan 目标写成 `*string`、`*int`，NULL 落地为 `nil`，业务代码无需关心 `Valid` 标志。另一个高频陷阱是"列多扫了"——`Scan` 的目标个数必须与 `SELECT` 列数严格一致，用 `SELECT *` 后加列就会在运行期报扫描错误，因此生产代码总是显式列出列名。

## 注意事项与常见错误

1. **必须关闭 rows**：`db.Query` 返回的 `rows` 必须调用 `rows.Close()`，否则会泄漏连接。使用 `defer rows.Close()`。

2. **sql.ErrNoRows 不是错误**：`QueryRow` 没有找到记录时返回 `sql.ErrNoRows`，这通常不是真正的错误，需要单独处理。

3. **不要拼接 SQL**：永远使用参数化查询（`$1`、`?` 等），不要用字符串拼接 SQL，防止注入攻击。

4. **连接字符串格式**：不同驱动的连接字符串格式不同。PostgreSQL 用 `user=xxx dbname=xxx`，MySQL 用 `user:password@tcp(host:port)/dbname`。

5. **sql.Open 不建立连接**：`sql.Open` 只是验证参数格式，不实际连接。用 `db.Ping()` 测试连接。

6. **事务中的错误处理**：事务中的操作失败后，必须 Rollback。使用 defer + err 模式确保不遗漏。

7. **GORM 的软删除**：GORM 默认使用软删除（`deleted_at` 字段）。如果需要硬删除，使用 `db.Unscoped().Delete()`。

## 进阶用法

### sqlx

sqlx 是 database/sql 的扩展，简化了扫描操作：

```bash
go get github.com/jmoiron/sqlx
```

```go
import "github.com/jmoiron/sqlx"

db, _ := sqlx.Connect("postgres", dsn)

// 直接扫描到结构体
var users []User
db.Select(&users, "SELECT * FROM users WHERE age > $1", 18)

// Named 查询
db.NamedExec("INSERT INTO users (name, age) VALUES (:name, :age)", &User{Name: "小明", Age: 25})
```

### sqlc

sqlc 从 SQL 生成类型安全的 Go 代码，无需 ORM：

```bash
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
sqlc generate
```

### 数据库连接封装

```go
func NewDatabase(cfg *Config) (*sql.DB, error) {
    db, err := sql.Open("postgres", cfg.DSN)
    if err != nil {
        return nil, err
    }

    db.SetMaxOpenConns(cfg.MaxOpenConns)
    db.SetMaxIdleConns(cfg.MaxIdleConns)
    db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

    if err = db.Ping(); err != nil {
        return nil, err
    }

    return db, nil
}
```

## 本篇小结

1. `database/sql` 是统一接口层，驱动通过 init 注册、以 `_` 空导入引入；`sql.Open` 只做参数校验不建连接，`Ping`（或 `PingContext`）才是真正的连通性验证。PostgreSQL 新项目优先 pgx，本地实验可用纯 Go 的 SQLite 驱动。
2. 读走 `QueryRow`（单行，`sql.ErrNoRows` 单独处理）与 `Query`（多行，`defer rows.Close()`，循环后检查 `rows.Err()`）；写走 `Exec` 并检查 `RowsAffected`；生产代码全部使用 `Context` 系列方法，让超时与取消传导到驱动。
3. 事务模板：`BeginTx` 之后无条件 `defer tx.Rollback()`，所有路径错误即返回，成功最后 `Commit`——Commit 后的 Rollback 返回 `ErrTxDone`，无害。
4. 连接池四个参数（MaxOpen/MaxIdle/ConnMaxLifetime/ConnMaxIdleTime）决定服务在数据库面前的并发形态，按"数据库预算 ÷ 实例数"设置上限，Lifetime 留小于服务端回收阈值。
5. NULL 用可空类型或指针映射；SQL 一律参数化、显式列名。ORM 选型分层：GORM 换开发效率，sqlx 换扫描便利，sqlc 换类型安全，理解 SQL 的人越少的项目越不该上 ORM。

## 动手实践

1. 用 modernc.org/sqlite 把快速上手的完整程序跑通，随后把所有 `QueryRow`/`Exec` 换成 `QueryRowContext`/`ExecContext`，并用一个 2 秒超时的 context 故意触发超时错误，观察错误文本。
2. 在转账示例中把 `defer tx.Rollback()` 删掉并模拟加款步骤失败（把表名改错），对比两次运行后账户表的数据，解释回滚缺失时"钱消失"的过程。
3. 同一张 users 表分别用 database/sql、sqlx 与 GORM 实现"分页 + 按年龄过滤"，统计三者的代码行数与生成 SQL（GORM 开 Debug 模式），写一段不超过 200 字的选型结论。
