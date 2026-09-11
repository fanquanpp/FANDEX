---
order: 340
title: Python sqlite3 数据库
module: 'python'
category: 后端技术
difficulty: beginner
description: Python sqlite3 数据库 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 连接数据库

**基本写法：连接数据库**
`sqlite3.connect(<数据库文件>)`
```python
# 连接 SQLite 数据库
import sqlite3

conn = sqlite3.connect("example.db")
# 内存数据库
conn_mem = sqlite3.connect(":memory:")
```

**基本写法：关闭连接**
`conn.close()`
```python
# 关闭连接
conn.close()
```

**基本写法：with 自动提交**
`with conn:`
```python
# with 块结束自动提交事务
with conn:
    conn.execute("INSERT INTO users VALUES (1, 'Alice')")
```

---

## 游标操作

**基本写法：创建游标**
`conn.cursor()`
```python
# 创建游标对象
cur = conn.cursor()
```

**基本写法：执行 SQL**
`cur.execute(<SQL>, <参数>)`
```python
# 执行单条 SQL（参数化查询）
cur.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
cur.execute("INSERT INTO users (id, name) VALUES (?, ?)", (1, "Alice"))
conn.commit()
```

**基本写法：批量执行**
`cur.executemany(<SQL>, <参数序列>)`
```python
# 批量插入
data = [(2, "Bob"), (3, "Carol")]
cur.executemany("INSERT INTO users (id, name) VALUES (?, ?)", data)
conn.commit()
```

**基本写法：执行脚本**
`cur.executescript(<SQL 脚本>)`
```python
# 执行多语句脚本
cur.executescript("""
CREATE TABLE IF NOT EXISTS logs (msg TEXT);
INSERT INTO logs VALUES ('init');
""")
```

---

## 查询结果

**基本写法：fetchone 取一条**
`cur.fetchone()`
```python
# 获取一条结果
cur.execute("SELECT * FROM users")
print(cur.fetchone())
```

**基本写法：fetchall 取全部**
`cur.fetchall()`
```python
# 获取全部结果
cur.execute("SELECT * FROM users")
print(cur.fetchall())
```

**基本写法：fetchmany 取多条**
`cur.fetchmany(<数量>)`
```python
# 获取指定数量结果
cur.execute("SELECT * FROM users")
print(cur.fetchmany(2))
```

**基本写法：迭代查询结果**
`for row in cur:`
```python
# 迭代结果
cur.execute("SELECT * FROM users")
for row in cur:
    print(row)
```

---

## Row 行工厂

**基本写法：Row 对象访问**
`conn.row_factory = sqlite3.Row`
```python
# 使用 Row 工厂按列名访问
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT * FROM users")
row = cur.fetchone()
print(row["name"], row["id"])
```

---

## 事务与隔离级别

**基本写法：设置隔离级别**
`sqlite3.connect(<文件>, isolation_level=<级别>)`
```python
# 隔离级别：None/DEFERRED/IMMEDIATE/EXCLUSIVE
conn = sqlite3.connect("example.db", isolation_level="DEFERRED")
```

**基本写法：手动提交**
`conn.commit()`
```python
# 提交事务
conn.commit()
```

**基本写法：回滚**
`conn.rollback()`
```python
# 回滚事务
conn.rollback()
```

---

## 参数化查询

**基本写法：问号占位符**
`cur.execute(<SQL>, (<参数1>, <参数2>))`
```python
# 使用 ? 占位符（推荐）
cur.execute("SELECT * FROM users WHERE name = ?", ("Alice",))
```

**基本写法：命名占位符**
`cur.execute(<SQL>, {<名>: <值>})`
```python
# 使用 :name 命名占位符
cur.execute("SELECT * FROM users WHERE name = :name", {"name": "Alice"})
```

---

## 类型转换

**基本写法：注册适配器**
`sqlite3.register_adapter(<Python 类型>, <函数>)`
```python
# 自定义类型适配
import sqlite3
from datetime import date

sqlite3.register_adapter(date, lambda d: d.isoformat())
```

**基本写法：注册转换器**
`sqlite3.register_converter(<类型名>, <函数>)`
```python
# 自定义类型转换
sqlite3.register_converter("DATE", lambda b: date.fromisoformat(b.decode()))

conn = sqlite3.connect("db", detect_types=sqlite3.PARSE_DECLTYPES)
cur = conn.cursor()
cur.execute("CREATE TABLE events (d DATE)")
cur.execute("INSERT INTO events VALUES (?)", (date(2024, 1, 1),))
cur.execute("SELECT d FROM events")
print(type(cur.fetchone()[0]))  # <class 'datetime.date'>
```

---

## 上下文管理

**基本写法：连接作为上下文管理器**
`with conn:`
```python
# 自动提交或回滚
with conn:
    conn.execute("INSERT INTO users VALUES (1, 'Alice')")
```

**基本写法：游标作为上下文管理器**
`with conn.cursor() as cur:`
```python
# 自动关闭游标
with conn.cursor() as cur:
    cur.execute("SELECT * FROM users")
    print(cur.fetchall())
```

---

## 命令行接口（3.12+）

**基本写法：CLI 执行**
`python -m sqlite3 <数据库> <SQL>`
```python
# 命令行执行 SQL
# python -m sqlite3 example.db "SELECT * FROM users"
```

---

## 元数据查询

**基本写法：lastrowid**
`cur.lastrowid`
```python
# 获取最后插入行的 ID
cur.execute("INSERT INTO users (name) VALUES (?)", ("Dave",))
print(cur.lastrowid)
```

**基本写法：rowcount**
`cur.rowcount`
```python
# 获取影响的行数
cur.execute("DELETE FROM users WHERE id = ?", (1,))
print(cur.rowcount)
```

**基本写法：表结构**
`cur.execute("PRAGMA table_info(<表名>)")`
```python
# 查询表结构
cur.execute("PRAGMA table_info(users)")
for col in cur.fetchall():
    print(col)
```
