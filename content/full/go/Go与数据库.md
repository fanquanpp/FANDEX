---
order: 68
title: Go与数据库
module: go
category: Go
difficulty: intermediate
description: database/sql与ORM
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与Redis
  - go/Go与消息队列
  - go/Go与JSON
  - go/Go与配置管理
prerequisites:
  - go/概述与环境配置
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
    // 确保事务要么提交要么回滚
    defer func() {
        if err != nil {
            tx.Rollback()
        }
    }()

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

    // 提交事务
    return tx.Commit()
}
```

### 6. 连接池配置

```go
db, _ := sql.Open("postgres", dsn)

db.SetMaxOpenConns(25)         // 最大打开连接数
db.SetMaxIdleConns(10)         // 最大空闲连接数
db.SetConnMaxLifetime(5 * time.Minute) // 连接最大存活时间
db.SetConnMaxIdleTime(1 * time.Minute) // 空闲连接最大存活时间
```

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
