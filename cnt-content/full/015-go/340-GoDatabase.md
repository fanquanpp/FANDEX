---
order: 340
title: Go 与数据库：连接池是怎么被榨干的
module: 'go'
category: 后端技术
difficulty: intermediate
description: 以"上线半小时数据库连接耗尽"为主线学 database/sql：驱动选型与零依赖起步、Query/Exec 全家桶、事务模板、Context 超时传导、连接池四参数、NULL 处理与 GORM 选型，附坑点、自检与练习。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'go/140-ContextDetailed'
  - 'go/550-GoRedis'
  - 'go/330-GoJSON'
  - 'go/390-GoConfigManagement'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 真实场景：上线半小时，数据库连接耗尽

服务上线后监控报警：PostgreSQL 报 "too many clients"。翻日志发现两类错误交替出现——大量请求卡在 `db.Query` 上直到超时。排查半天，元凶是一段没关 `rows` 的代码，外加连接池参数完全没配（默认无上限）。每个卡住的查询都占着一个连接，连接只出不进，半小时后池子见底，全站 503。

`database/sql` 的连接是自动管理的，但"自动管理"不等于"不用管"：`rows.Close()` 忘一行、一个慢查询不设超时，都足以拖垮池子。这一篇围绕这个事故把 database/sql 的完整用法过一遍，最后给出 ORM 选型的分层建议。

## 动手第一步：零依赖起步，先建表再增删查

本地跑通一套完整流程最快的方式是纯 Go 的 SQLite 驱动（无 CGO，`go get modernc.org/sqlite`）。驱动通过 init 函数注册，所以用空导入：

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "modernc.org/sqlite" // 注册名为 "sqlite"
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

两个必须形成的条件反射：`sql.Open` **只验证参数格式，不建立连接**，真正的连通性检查是 `db.Ping()`（服务启动时应做一次）；驱动靠 `_ "空导入"` 的 init 注册。

PostgreSQL 生产选型提示：`lib/pq` 已进维护模式，新项目用 `github.com/jackc/pgx/v5`（性能更好，支持 LISTEN/NOTIFY 与 CopyFrom），最省事的用法是保留 database/sql 接口：`sql.Open("pgx", dsn)`（驱动来自 `github.com/jackc/pgx/v5/stdlib`）。占位符差异注意：PostgreSQL 用 `$1, $2`，MySQL/SQLite 用 `?`。

## 动手第二步：读与写的完整姿势

读单行用 QueryRow，读多行用 Query。单行的 `sql.ErrNoRows` 是正常业务态不是故障；多行的 `rows.Close()` 与循环后的 `rows.Err()` 一个都不能省：

```go
// 单行：ErrNoRows 单独处理
var name string
var age int
err := db.QueryRow("SELECT name, age FROM users WHERE id = $1", 1).Scan(&name, &age)
if err == sql.ErrNoRows {
    fmt.Println("没有找到记录")
} else if err != nil {
    log.Fatal(err)
}

// 多行：defer Close + 循环后检查 Err
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
    fmt.Printf("ID: %d, %s, %d\n", id, name, age)
}
if err = rows.Err(); err != nil {
    log.Fatal(err) // 迭代中途的网络断连等错误在这里浮出
}
```

写操作用 Exec 并看 RowsAffected；PostgreSQL 要拿自增主键用 RETURNING：

```go
result, err := db.Exec("UPDATE users SET age = $1 WHERE id = $2", 26, 1)
if err != nil {
    log.Fatal(err)
}
affected, _ := result.RowsAffected()
fmt.Printf("更新了 %d 行\n", affected)

var newID int
err = db.QueryRow(
    "INSERT INTO users (name, age) VALUES ($1, $2) RETURNING id",
    "小红", 22,
).Scan(&newID)
```

高频增删查的全家桶就这些：QueryRow（单行）、Query（多行）、Exec（写）、Prepare（同一语句反复执行时预编译，`stmt.QueryRow(id)` 循环调用）。

## 动手第三步：事务模板与连接池四参数

转账是事务的教科书场景。背下这个模板——无条件 `defer Rollback`，成功路径最后 Commit：

```go
func TransferMoney(db *sql.DB, fromID, toID int, amount float64) error {
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    // 无论哪条路径退出都尝试回滚；已 Commit 的事务 Rollback 返回
    // ErrTxDone，无副作用，因此"无条件 defer + 成功后 Commit"
    // 是比按条件判断更简洁也更不容易漏的写法
    defer tx.Rollback()

    result, err := tx.Exec(
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND balance >= $1",
        amount, fromID)
    if err != nil {
        return err
    }
    if affected, _ := result.RowsAffected(); affected == 0 {
        return fmt.Errorf("余额不足或账户不存在")
    }

    if _, err := tx.Exec(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, toID); err != nil {
        return err
    }
    return tx.Commit()
}
```

连接池参数就是开头事故的第二主角：

```go
db.SetMaxOpenConns(25)                 // 最大打开连接数
db.SetMaxIdleConns(10)                 // 最大空闲连接数
db.SetConnMaxLifetime(5 * time.Minute) // 连接最大存活时间
db.SetConnMaxIdleTime(1 * time.Minute) // 空闲连接最大存活时间
```

取值思路：`MaxOpenConns` 上限 = 数据库总连接预算 / 服务实例数，不是越大越好——超过数据库承受能力的并发只会变成排队与报错；`ConnMaxLifetime` 应小于数据库或中间代理（如 PgBouncer）侧的连接回收时间，避免拿到已被服务端关掉的死连接。

## 讲为什么：Context 超时与 NULL 的两种解法

### 为什么生产代码全用 Context 系列

database/sql 的每个阻塞方法都有 Context 变体：`QueryRowContext / QueryContext / ExecContext / BeginTx`。差别在取消传导：带 context 的查询超时或被取消时，信号一路传到驱动，数据库侧的执行被终止、连接被归还——而不是让一条慢 SQL 长期占住 goroutine 和池子里的连接：

```go
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()

var name string
err := db.QueryRowContext(ctx, "SELECT name FROM users WHERE id = $1", 1).Scan(&name)

tx, err := db.BeginTx(ctx, nil) // 事务同样接受 context，超时自动回滚
```

开头事故里"查询卡到天荒地老"，配一个 3 秒超时的 context 就能把爆炸半径从"整个池子"缩到"单个请求"。Context 机制的原理展开见 [Context 详解](/go/140-ContextDetailed)。

### NULL 的两种解法

列可空时，Scan 目标有两种选择：

```go
// 解法一：sql.NullXxx 类型
var name sql.NullString
db.QueryRow("SELECT name FROM users WHERE id = $1", 1).Scan(&name)
if name.Valid {
    fmt.Println(name.String)
}

// 解法二：指针（通常更干净）
var nickname *string
db.QueryRow("SELECT nickname FROM users WHERE id = $1", 1).Scan(&nickname)
if nickname != nil {
    fmt.Println(*nickname)
}
```

SQL 侧还可以 `COALESCE(nickname, '')` 直接给默认值，把空值语义留在查询里。另一条纪律：`Scan` 的目标个数必须与 SELECT 列数严格一致，`SELECT *` 之后表加一列，代码就会在运行期报扫描错误——生产代码总是显式列出列名。

## 坑点与自检

**坑 1：忘关 rows。** 连接在 `rows.Close()` 之前不归还池子，开头事故的直接元凶。`defer rows.Close()` 是肌肉记忆。

**坑 2：拼接 SQL。** `fmt.Sprintf("SELECT ... WHERE name = '%s'", input)` 是注入漏洞。永远参数化（`$1`/`?`）。

**坑 3：池参数缺省。** 默认 MaxOpenConns 为 0（无上限）、MaxIdleConns 为 2——高并发下疯狂建连、低负载下连接全部被杀。四个参数都要显式设置。

**坑 4：GORM 默认软删除。** `db.Delete(&user)` 写的是 `deleted_at`，查询自动过滤软删行；要真删用 `db.Unscoped().Delete(&user)`。不知道这条规则的人会在表里"删不掉"数据。

**坑 5：ORM 选型拍脑袋。** 分层建议：GORM 换开发效率（AutoMigrate、关联、Preload 一条龙，`db.Preload("User").Preload("Items").Find(&orders)` 一次带出关联）；sqlx 换扫描便利（`db.Select(&users, "SELECT id, name ...")` 直接进结构体）；sqlc 换类型安全（从 SQL 生成代码，无 ORM 魔法）。理解 SQL 的人越少的项目，越不该上 ORM。

自检——能不看文档回答这些吗：

1. `sql.Open` 与 `db.Ping()` 各做什么？驱动是怎么注册进来的？
2. `rows.Err()` 为什么要放在循环之后？漏掉会掩盖什么错误？
3. 事务模板里"无条件 defer Rollback"为什么是无害且更安全的？
4. `MaxOpenConns` 的合理上限怎么算？`ConnMaxLifetime` 为什么要小于服务端回收时间？
5. Context 系列方法与普通方法的差别在取消时具体体现在哪里？
6. NULL 列的两种映射方式各适合什么场合？为什么不用 SELECT *？

## 练习

1. 把第一步的程序跑通后，把所有 Query/Exec 换成 Context 系列，并故意用 2 秒超时的 context 去跑一个 `SELECT` 递归 CTE 的慢查询，观察错误文本与连接是否归还（池参数设为 1，连续打两次请求验证第二个请求不再被卡死）。
2. 在转账示例中删掉 `defer tx.Rollback()`，并把加款语句的表名改错，对比两次运行后 accounts 表的数据，用一段话解释"钱消失"的过程。
3. 同一张 users 表分别用 database/sql、sqlx 与 GORM 实现"分页 + 按年龄过滤"，GORM 开 Debug 模式对比生成的 SQL，统计三者代码行数，写一段不超过 200 字的选型结论。

## 下一步

- Context 取消传导的完整机制：[Context 详解](/go/140-ContextDetailed)；
- 连接串与池参数从配置来：[Go 与配置管理](/go/390-GoConfigManagement)；
- 数据库测试与基准：[Go 与测试](/go/350-GoTest)；
- 缓存层与队列的选型对照：[Go 与 Redis](/go/550-GoRedis)。
