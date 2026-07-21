# MySQL 数据类型与约束

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

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
