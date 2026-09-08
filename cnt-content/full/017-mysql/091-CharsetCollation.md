---
order: 910
title: 字符集与排序规则语法速查手册
module: 'mysql'
category: 数据库
difficulty: beginner
description: 字符集与排序规则 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 查看字符集

**基本写法：查看可用字符集**
`SHOW CHARACTER SET [LIKE '<模式>'];`

```sql
-- 查看所有字符集
SHOW CHARACTER SET;
-- 过滤查看 utf8mb4 相关
SHOW CHARACTER SET LIKE 'utf8%';
```

**基本写法：查看可用排序规则**
`SHOW COLLATION [LIKE '<模式>'];`

```sql
-- 查看 utf8mb4 的所有排序规则
SHOW COLLATION LIKE 'utf8mb4%';
```

**基本写法：查看当前字符集变量**
`SHOW VARIABLES LIKE 'character_set%';`

```sql
-- 查看连接、服务、数据库等字符集设置
SHOW VARIABLES LIKE 'character_set%';
```

**基本写法：查看排序规则变量**
`SHOW VARIABLES LIKE 'collation%';`

```sql
-- 查看连接与服务排序规则
SHOW VARIABLES LIKE 'collation%';
```

---

## 数据库级设置

**基本写法：建库时指定字符集**
`CREATE DATABASE <库名> CHARACTER SET <字符集> COLLATE <排序规则>;`

```sql
-- 创建 utf8mb4 库（推荐，支持完整 emoji）
CREATE DATABASE mydb
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;
```

**基本写法：修改库字符集**
`ALTER DATABASE <库名> CHARACTER SET <字符集> COLLATE <排序规则>;`

```sql
-- 将库转为 utf8mb4
ALTER DATABASE mydb
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;
```

---

## 表级设置

**基本写法：建表时指定字符集**
`CREATE TABLE <表名> (...) CHARACTER SET <字符集> COLLATE <排序规则>;`

```sql
-- 建表指定字符集与排序规则
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(50)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

**基本写法：修改表字符集**
`ALTER TABLE <表名> CONVERT TO CHARACTER SET <字符集> COLLATE <排序规则>;`

```sql
-- 转换表字符集（同时转换已有数据编码）
ALTER TABLE users
CONVERT TO CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;
```

**基本写法：仅修改表默认字符集（不转换数据）**
`ALTER TABLE <表名> CHARACTER SET <字符集> COLLATE <排序规则>;`

```sql
-- 只改默认字符集，不影响已有列数据
ALTER TABLE users CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

---

## 列级设置

**基本写法：列指定字符集**
`<列名> <字符类型>(<长度>) CHARACTER SET <字符集> COLLATE <排序规则>`

```sql
-- 指定列使用 utf8mb4 与区分大小写排序规则
CREATE TABLE articles (
  id BIGINT PRIMARY KEY,
  title VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs,
  content TEXT CHARACTER SET utf8mb4
);
```

**基本写法：修改列字符集**
`ALTER TABLE <表名> MODIFY <列名> <类型> CHARACTER SET <字符集> COLLATE <排序规则>;`

```sql
-- 修改列字符集
ALTER TABLE articles
MODIFY title VARCHAR(200)
CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

---

## 连接级设置

**基本写法：设置连接字符集**
`SET NAMES <字符集> [COLLATE <排序规则>];`

```sql
-- 设置客户端、连接、结果字符集（最常用）
SET NAMES utf8mb4;
```

**基本写法：设置单个字符集变量**
`SET <变量名> = <字符集>;`

```sql
-- 分别设置各环节字符集
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;
```

---

## 排序规则后缀说明

**基本写法：排序规则后缀含义**
`<字符集>_<版本>_<强弱>_<重音>_<大小写>`

```sql
-- utf8mb4_0900_ai_ci 含义：
-- 0900: Unicode 9.0 标准
-- ai:    accent-insensitive 不区分重音
-- cs:    case-sensitive 区分大小写（_as 区分重音）
-- _bin:  二进制比较
-- 区分大小写排序规则示例
SELECT * FROM users ORDER BY name COLLATE utf8mb4_0900_as_cs;
```

**基本写法：查询时指定排序规则**
`ORDER BY <列> COLLATE <排序规则>`

```sql
-- 临时使用区分大小写的排序
SELECT * FROM users ORDER BY name COLLATE utf8mb4_0900_as_cs;
```

**基本写法：比较时强制排序规则**
`<表达式> COLLATE <排序规则> = <表达式>`

```sql
-- 跨排序规则比较时需统一
SELECT * FROM a JOIN b ON a.name COLLATE utf8mb4_0900_ai_ci = b.name;
```
