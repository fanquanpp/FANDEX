---
order: 70
title: MySQL 数据类型与约束
module: 'mysql'
category: 数据库
difficulty: beginner
description: 数值、字符串、日期类型及主键、外键、唯一约束。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'mysql/005-MySQLOverviewDatabaseDesign'
  - 'mysql/006-MySQLEnvSetup'
  - 'mysql/008-SQLDataDefinitionAdvanced'
  - 'mysql/009-MyISAMStorageEngine'
prerequisites: []
---

## 1. 数据类型选择原则 (Selection Principles)

核心目标：

- 正确表达业务含义（语义清晰）
- 保证数据完整性（约束与校验）
- 兼顾性能与存储成本（索引友好、空间可控）
  实践要点：
- 能用更小的类型就不用更大类型（但不要牺牲语义）
- 经常参与过滤/排序/Join 的列优先选择“可索引且稳定”的类型
- 避免把结构化字段塞进一个字符串里（除非确实是原始文本）

## 2. 数值类型 (Numeric)

### 2.1 整数

常用：`TINYINT`、`INT`、`BIGINT`
实践建议：

- 业务自增主键常用 `BIGINT`（预留增长空间）
- 状态枚举常用 `TINYINT`（配合业务层枚举）
- 需要非负时用 `UNSIGNED`

### 2.2 定点与浮点

- 金额优先用 `DECIMAL(p, s)`，避免浮点误差
- 测量数据/近似值可用 `DOUBLE`

## 3. 字符串类型 (String)

### 3.1 `CHAR` vs `VARCHAR`

- `CHAR(n)`：定长，适合长度固定的值（如国家码、短编码），更新更稳定
- `VARCHAR(n)`：变长，适合长度变化较大的值（如昵称、标题）
  实践建议：
- `VARCHAR` 不是越大越好，过大的上限会影响行格式与索引策略
- 经常参与索引的长文本字段慎用 `VARCHAR(1024+)`

### 3.2 `TEXT` 家族

用于长文本（文章内容、描述）。注意：

- `TEXT` 列通常不适合直接做常规索引（需要前缀索引或全文索引）
- `TEXT` 列会影响行存储与读取代价

## 4. 日期与时间 (Date & Time)

常用：`DATE`、`DATETIME`、`TIMESTAMP`

- `DATETIME`：范围大，存储不依赖时区转换（更“客观”）
- `TIMESTAMP`：存储与时区有关（读取/写入可能发生转换），范围较小
  实践建议：
- 业务“发生时间”通常用 `DATETIME`，统一用 UTC 或在应用层明确时区策略
- 保存“仅日期”用 `DATE`，避免在应用层反复截断

## 5. JSON 类型 (JSON)

MySQL 的 `JSON` 适合存放：

- 结构频繁变化的扩展字段
- 不适合拆表但需要一定结构的配置项
  注意：
- JSON 查询需要函数/生成列配合索引，否则易慢
- 不要用 JSON 替代关键业务字段（关键字段应拆列以便约束、索引与统计）

## 6. 字符集与排序规则 (Charset & Collation)

实践建议：

- 统一使用 `utf8mb4`
- 明确排序规则（collation），避免跨表/跨库比较时发生隐式转换

## 7. 约束 (Constraints)

### 7.1 `NOT NULL`

优先用 `NOT NULL` 来表达“必填”。配合默认值要谨慎，确保默认值也符合业务语义。

### 7.2 `DEFAULT`

示例：

```sql
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
```

注意：不要用默认值掩盖业务层输入缺失，应区分“未知/未填”与“默认”。

### 7.3 `UNIQUE`

用于业务唯一性约束（如手机号、邮箱、业务单号）。
实践建议：

- 唯一约束应该从业务语义出发，而不是“为了查得快”
- 可组合唯一：例如 `(tenant_id, email)`

### 7.4 `PRIMARY KEY`

通常建议：

- 使用单列自增或雪花 ID 作为主键
- 避免使用可变业务字段（例如手机号）作为主键

### 7.5 `FOREIGN KEY`

MySQL 支持外键，但很多互联网业务会选择在应用层维护约束，原因包括：

- 高并发下跨表约束可能放大锁冲突
- 分库分表/异构存储下外键不可用
  是否使用外键取决于：
- 业务规模与一致性要求
- 团队治理与数据质量策略

## 8. 建表示例 (Example)

```sql
 CREATE TABLE user_account (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email (email)
 )
```

---

## 数值类型

**单行写法：定义 BIGINT 自增主键**
`<列名> BIGINT [UNSIGNED] [NOT NULL] [PRIMARY KEY] [AUTO_INCREMENT]`
```sql
-- 定义 BIGINT 无符号自增主键
id BIGINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT;
```

**单行写法：定义 TINYINT 状态枚举**
`<列名> TINYINT [UNSIGNED] [NOT NULL] [DEFAULT <默认值>]`
```sql
-- 定义 TINYINT 状态字段并设置默认值
status TINYINT NOT NULL DEFAULT 1;
```

**单行写法：定义 DECIMAL 金额字段**
`<列名> DECIMAL(<精度>, <小数位数>) [DEFAULT <默认值>]`
```sql
-- 定义金额字段避免浮点误差
balance DECIMAL(10, 2) DEFAULT 0.00;
```

**单行写法：定义 DOUBLE 浮点字段**
`<列名> <FLOAT|DOUBLE> [(<精度>, <小数位数>)]`
```sql
-- 定义测量数据浮点字段
temperature DOUBLE;
```

---

## 字符串类型

**单行写法：定义 CHAR 定长字符串**
`<列名> CHAR(<长度>) [NOT NULL]`
```sql
-- 定义国家码定长字段
country_code CHAR(2) NOT NULL;
```

**单行写法：定义 VARCHAR 变长字符串**
`<列名> VARCHAR(<最大长度>) [NOT NULL]`
```sql
-- 定义用户名变长字段
username VARCHAR(50) NOT NULL;
```

**单行写法：定义 TEXT 长文本**
`<列名> <TINYTEXT|TEXT|MEDIUMTEXT|LONGTEXT>`
```sql
-- 定义文章内容长文本字段
content TEXT;
```

---

## 日期与时间类型

**单行写法：定义 DATE 日期字段**
`<列名> DATE`
```sql
-- 定义仅保存日期的字段
birthday DATE;
```

**单行写法：定义 DATETIME 日期时间字段**
`<列名> DATETIME [NOT NULL] [DEFAULT CURRENT_TIMESTAMP]`
```sql
-- 定义业务发生时间字段
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

**单行写法：定义 TIMESTAMP 自动更新字段**
`<列名> TIMESTAMP [DEFAULT CURRENT_TIMESTAMP] [ON UPDATE CURRENT_TIMESTAMP]`
```sql
-- 定义更新时间自动维护字段
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

---

## JSON 类型

**单行写法：定义 JSON 列**
`<列名> JSON`
```sql
-- 定义 JSON 扩展字段
profile JSON;
```

**换行写法：建表时包含 JSON 列**
`CREATE TABLE <表名> (<列定义>, <JSON 列名> JSON)`
```sql
-- 创建包含 JSON 字段的用户表
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  profile JSON
);
```

---

## 字符集与排序规则

**换行写法：创建数据库时指定字符集**
`CREATE DATABASE <库名> CHARACTER SET <字符集> COLLATE <排序规则>`
```sql
-- 创建数据库并指定 utf8mb4 字符集
CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

## 约束

**单行写法：非空约束**
`<列名> <类型> NOT NULL`
```sql
-- 定义必填字段
email VARCHAR(255) NOT NULL;
```

**单行写法：默认值约束**
`<列名> <类型> DEFAULT <默认值>`
```sql
-- 定义状态字段默认值为 1
status TINYINT NOT NULL DEFAULT 1;
```

**单行写法：默认值为当前时间**
`<列名> <时间类型> DEFAULT CURRENT_TIMESTAMP`
```sql
-- 定义创建时间默认值为当前时间
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

**单行写法：单列唯一约束**
`UNIQUE [KEY <索引名>] (<列名>)`
```sql
-- 定义邮箱单列唯一约束
UNIQUE KEY uk_email (email);
```

**单行写法：组合唯一约束**
`UNIQUE [KEY <索引名>] (<列名1>, <列名2>[, ...])`
```sql
-- 定义租户与邮箱组合唯一约束
UNIQUE KEY uk_tenant_email (tenant_id, email);
```

**单行写法：单列主键约束**
`<列名> <类型> PRIMARY KEY`
```sql
-- 定义单列主键
id BIGINT UNSIGNED NOT NULL PRIMARY KEY;
```

**单行写法：复合主键约束**
`PRIMARY KEY (<列名1>, <列名2>[, ...])`
```sql
-- 定义复合主键
PRIMARY KEY (tenant_id, user_id);
```

**换行写法：外键约束**
`FOREIGN KEY (<列名>) REFERENCES <父表>(<父列>) [ON DELETE <行为>] [ON UPDATE <行为>]`
```sql
-- 定义外键关联并设置级联行为
FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
```

**单行写法：检查约束（非负）**
`CHECK (<条件表达式>)`
```sql
-- 定义金额必须非负的检查约束
CHECK (total_amount >= 0);
```

**单行写法：检查约束（枚举值）**
`CHECK (<列名> IN (<值1>, <值2>[, ...]))`
```sql
-- 定义状态值限定检查约束
CHECK (status IN (1, 2, 3, 4, 5));
```

**单行写法：自增约束**
`<列名> <整数类型> AUTO_INCREMENT`
```sql
-- 定义自增主键
id INT PRIMARY KEY AUTO_INCREMENT;
```

---

## 建表示例

**换行写法：完整建表语句**
`CREATE TABLE <表名> (<列定义>[, <约束定义>...])`
```sql
-- 创建用户账户表并包含唯一约束
CREATE TABLE user_account (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email (email)
);
```
