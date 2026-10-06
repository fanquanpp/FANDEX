---
order: 90
title: SQL 数据定义高级（DDL 实战）
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 库与表的 CREATE/ALTER/DROP 全套命令、六类索引的建法、七种约束落地；区分 DROP/TRUNCATE/DELETE，配动手建库建表练习。
author: fanquanpp
updated: '2026-10-06'
related:
  - 'mysql/060-MySQLEnvSetup'
  - 'mysql/070-MySQLDataTypeConstraint'
  - 'mysql/100-DML'
  - 'mysql/685-OnlineDDLTableChange'
prerequisites:
  - 'mysql/070-MySQLDataTypeConstraint'
---

## 知识点地图

- **知识类别**：SQL 语句之 **DDL（Data Definition Language，数据定义语言）**——对应 MySQL Reference Manual 的 SQL Statements 分支下 Data Definition Statements 一族：数据库对象（库、表、索引）的创建、修改与删除。
- **解决什么问题**：把逻辑设计（[数据类型与约束](/mysql/070-MySQLDataTypeConstraint) 里定好的字段）落成真实的库和表，并在表的生命周期内安全地改结构、加索引、加约束。
- **什么时候用到**：项目起步建库建表；需求变更要加列改名；查询变慢要补索引；上线前审查约束与注释。本篇只讲 DDL 本身；视图、存储过程、触发器、事务分别在[视图](/mysql/160-View)、[存储过程与函数](/mysql/770-StoredProcedureAndFunction)、[触发器与事件](/mysql/780-TriggerEvent)、[事务与锁机制](/mysql/460-TransactionLockMechanism)专篇。

## 前置知识

- [数据类型与约束](/mysql/070-MySQLDataTypeConstraint)：每个字段为什么选这个类型——本篇把它落成语句。

## 1. DDL (数据定义语言) - Data Definition Language

DDL 用于创建、修改和删除数据库对象，包括数据库、表、索引、视图等。

> **新手必读：DDL 会自动提交，无法回滚**
> DDL 语句执行后立即生效，MySQL 会对其隐式提交，**不能像 DML 那样用 `ROLLBACK` 撤销**。
> 执行 `DROP` / `TRUNCATE` / `ALTER` 前务必再三确认作用对象与影响范围，删表、清表操作没有后悔药。
> （"事务里放 DDL 会把前面没提交的修改一起提交掉"的可复现实验见[事务与锁机制](/mysql/460-TransactionLockMechanism)。）

**DDL 核心命令一览**：

| 命令 | 作用 | 类比 | 可回滚 |
| --- | --- | --- | --- |
| `CREATE` | 创建数据库、表、索引、视图 | 平地起楼、画图纸 | 否 |
| `ALTER` | 修改表结构（加列、改类型、删列） | 给楼扩建或改装修 | 否 |
| `DROP` | 删除表/数据库，结构与数据一并消失 | 直接炸掉整栋楼 | 否 |
| `TRUNCATE` | 清空表数据但保留表结构，自增 ID 重置 | 扔光屋里东西、墙留着 | 否 |

### 1.1 数据库操作详解

#### 1.1.1 创建数据库

```sql
 CREATE DATABASE mydb;
 CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
 CREATE DATABASE IF NOT EXISTS mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

三条语句的差异：第一条最朴素，库已存在时报错退出；第二条显式指定字符集与排序规则——**建库时定字符集是唯一便宜的时机**，事后改要付出 `ALTER DATABASE` 与数据校验的代价；第三条加 `IF NOT EXISTS`，脚本可重复执行（重跑不报错），部署脚本的标准写法。

#### 1.1.2 查看数据库

```sql
 SHOW DATABASES;
 SHOW CREATE DATABASE mydb;
 SELECT DATABASE();
```

`SHOW DATABASES` 列出全部库；`SHOW CREATE DATABASE` 回放**建库语句本身**（含字符集），排查"为什么存中文乱码"先看它；`SELECT DATABASE()` 回答"我现在连的是哪个库"——多窗口操作时先问它，避免改错库。

#### 1.1.3 选择数据库

```sql
 use mydb;
```

#### 1.1.4 删除数据库

```sql
 DROP DATABASE mydb;
 DROP DATABASE IF EXISTS mydb;
```

`DROP DATABASE` 连库里的所有表一起删，**不可逆**。生产环境没有"确认弹窗"，靠纪律：删除前先 `mysqldump` 备份（见[逻辑备份](/mysql/560-LogicalBackup)），脚本里用 `IF EXISTS` 防止库不存在时的无谓报错。

#### 1.1.5 修改数据库

```sql
 ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

注意语义边界：`ALTER DATABASE` 只改**库的默认字符集**，对已存在的表和列不追溯——老表还是老字符集。要让存量表换字符集得逐表 `ALTER TABLE ... CONVERT TO CHARACTER SET`（大表要走[在线 DDL](/mysql/685-OnlineDDLTableChange) 的成本评估）。

### 1.2 表操作详解

#### 1.2.1 创建表

```sql
 CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
  phone VARCHAR(20) COMMENT '手机号',
  age INT UNSIGNED COMMENT '年龄',
  gender ENUM('男', '女', '保密') DEFAULT '保密' COMMENT '性别',
  avatar VARCHAR(255) COMMENT '头像URL',
  status TINYINT DEFAULT 1 COMMENT '状态：1-正常，0-禁用',
  balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '账户余额',
  last_login_time DATETIME COMMENT '最后登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status)
 )
```

建表语句逐段看：主键列放第一（InnoDB 聚簇索引按主键组织数据）；必填列带 `NOT NULL`；金额用 `DECIMAL` 不用浮点；`created_at`/`updated_at` 一对时间戳交给数据库自动维护；表内直接写 `INDEX` 是"建表顺手建索引"，适合新表——存量大表加索引则要走 ALTER 的在线路径。

#### 1.2.2 表结构设计原则

**设计要点**：

- 主键：每个表必须有主键，推荐使用自增 INT 或 BIGINT
- 字段命名：使用有意义的名称，采用小写下划线命名法
- 数据类型：选择合适的数据类型，避免浪费存储空间
- 索引设计：为常用查询条件的字段创建索引
- 注释：为重要字段添加注释说明

**字段类型选择指南**：

| 场景      | 推荐类型                  | 原因                     |
| :-------- | :------------------------ | :----------------------- |
| ID 主键   | INT/BIGINT AUTO_INCREMENT | 高效、自增、占用空间小   |
| 状态标志  | TINYINT                   | 占用空间最小             |
| 年龄      | TINYINT UNSIGNED          | 范围 0-255，足够存储年龄 |
| 金额/价格 | DECIMAL(M,N)              | 精确存储，避免浮点误差   |
| 手机号    | VARCHAR(20)               | 可能有+86等前缀          |
| 文本描述  | VARCHAR/TEXT              | 根据长度选择             |
| 日期时间  | DATETIME/TIMESTAMP        | 根据是否需要时区选择     |
| UUID      | VARCHAR(36)               | 跨系统使用               |

#### 1.2.3 查看表结构

```sql
 DESC users;
 SHOW COLUMNS FROM users;
 SHOW CREATE TABLE users;
 SHOW TABLES;
 SHOW TABLE STATUS FROM mydb;
 SHOW TABLES LIKE '%user%';
```

`DESC` 快速看列清单；`SHOW CREATE TABLE` 回放建表语句（**含存储引擎、字符集、索引、外键的全部细节**）——排查"这张表到底有什么约束"以它为准；`SHOW TABLE STATUS` 看行数估算与引擎等表级元信息。

#### 1.2.4 修改表结构

```sql
 ALTER TABLE users ADD COLUMN address VARCHAR(255) AFTER email;
 ALTER TABLE users ADD COLUMN is_verified TINYINT DEFAULT 0 AFTER status;
 ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL;
 ALTER TABLE users CHANGE COLUMN phone telephone VARCHAR(20) NOT NULL;
 ALTER TABLE users DROP COLUMN address;
 ALTER TABLE users ADD INDEX idx_age (age);
 ALTER TABLE users ADD UNIQUE INDEX idx_phone (phone);
 ALTER TABLE users ADD INDEX idx_age_gender (age, gender);
 ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);
 ALTER TABLE orders DROP FOREIGN KEY fk_user_id;
 ALTER TABLE users COMMENT '用户信息表';
 ALTER TABLE users RENAME TO user_info;
 RENAME TABLE users TO user_info, orders TO order_info;
```

三组易混命令分清楚：

- `ADD COLUMN ... AFTER email` 控制新列位置；不加 AFTER 默认追加到末尾。
- `MODIFY` 改列定义不改名；`CHANGE` 改名+改定义一步到位（新列名在前、完整定义在后），只改名字用 `RENAME COLUMN`（8.0+，只动元数据更快）。
- `RENAME TO` 与 `RENAME TABLE` 都能改表名，后者支持一条语句同时改多张表——**关联表一起改名时用它**，中间不留"改了一半"的状态。

每一条 ALTER 在大表上都要评估执行路径（在线还是锁表），见[大表变更：Online DDL](/mysql/685-OnlineDDLTableChange)。

#### 1.2.5 删除表

```sql
 DROP TABLE users;
 DROP TABLE IF EXISTS users;
 DROP TABLE IF EXISTS users, orders, products;
 TRUNCATE TABLE users;
```

`DROP` 删结构+数据；`TRUNCATE` 只清数据、保留结构，并把自增计数器归零——测试库反复造数的常用套路。两者都是 DDL 不可回滚，与逐行删除、可回滚、触发器会触发的 `DELETE` 是三种不同工具，选型对照见[数据类型与约束](/mysql/070-MySQLDataTypeConstraint)篇的删除三式说明。

#### 1.2.6 表复制

```sql
 CREATE TABLE users_copy LIKE users;
 CREATE TABLE users_copy AS SELECT * FROM users;
 CREATE TABLE users_copy AS SELECT id, username, email FROM users WHERE 1=0;
 CREATE TABLE users_copy AS SELECT * FROM users WHERE status = 1;
```

四种复制各有取舍：`LIKE` 复制**结构与索引，不带数据不带外键**——做影子表首选；`AS SELECT *` 复制**结构与数据，但不带索引、约束、注释**——临时分析够用，别当正式表；`WHERE 1=0`（恒假条件）是"只要结构不要数据"的 CTAS 写法；带业务条件的 CTAS 做数据快照。

### 1.3 索引操作详解

#### 1.3.1 索引基础概念

索引是一种特殊的数据结构，用于加速数据检索。类似于书籍的目录，索引可以快速定位数据，减少查询时间。

**索引类型**：

| 类型     | 说明         | 示例                                   |
| :------- | :----------- | :------------------------------------- |
| 普通索引 | 最基本的索引 | `INDEX idx_name (name)`                |
| 唯一索引 | 索引值唯一   | `UNIQUE INDEX idx_email (email)`       |
| 主键索引 | 主键自动创建 | 主键列                                 |
| 复合索引 | 多列组合索引 | `INDEX idx_name_age (name, age)`       |
| 全文索引 | 文本搜索     | `FULLTEXT INDEX ft_content (content)`  |
| 空间索引 | 地理空间数据 | `SPATIAL INDEX sx_location (location)` |

#### 1.3.2 创建索引

```sql
 CREATE INDEX idx_username ON users(username);
 CREATE UNIQUE INDEX idx_email ON users(email);
 CREATE INDEX idx_name_status ON users(username, status);
 CREATE UNIQUE INDEX idx_order_product ON order_items(order_id, product_id);
 ALTER TABLE articles ADD FULLTEXT INDEX ft_title_content (title, content);
 CREATE INDEX idx_email_prefix ON users(email(10));
```

`CREATE INDEX` 与 `ALTER TABLE ADD INDEX` 等价，团队统一一种写法即可。唯一索引在去重之外还承担"约束"职责（重复插入直接报 1062）；复合索引的列顺序有讲究（[最左前缀原则](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)专篇）；`email(10)` 是前缀索引，只索引前 10 个字符，细节见[前缀索引](/mysql/240-PrefixIndex)。

#### 1.3.3 查看索引

```sql
 SHOW INDEX FROM users;
 SHOW INDEX FROM users\G
 EXPLAIN SELECT * FROM users WHERE username = 'test';
```

`SHOW INDEX` 看一张表有哪些索引（注意 InnoDB 会为外键列自动建索引）；`\G` 让列多的输出竖排好读；`EXPLAIN` 验证查询**实际用没用**上索引——建了不等于用了。

#### 1.3.4 删除索引

```sql
 DROP INDEX idx_username ON users;
 ALTER TABLE users DROP PRIMARY KEY;
```

`DROP INDEX` 删普通/唯一索引；删主键用 `DROP PRIMARY KEY`——注意自增列上直接删主键会报错（AUTO_INCREMENT 列必须是键），要先 `MODIFY` 去掉自增属性再删。删除是高危操作：先确认没有查询依赖它（低峰期先把索引改成[不可见索引](/mysql/280-InvisibleIndex)观察几天再删，是最稳的路径）。

#### 1.3.5 索引设计原则

**适合创建索引的场景**：

- WHERE 子句中经常使用的列
- JOIN 操作中经常使用的列
- ORDER BY、GROUP BY 后面的列
- SELECT 中频繁查询的列

**不适合创建索引的场景**：

- 列中数据重复度很高（如性别只有男/女）
- 表数据量很小
- 经常更新的列
- 不出现在 WHERE 子句中的列

**复合索引最左前缀原则**：

```sql
 CREATE INDEX idx_status_created ON users(status, created_at);
 SELECT * FROM users WHERE status = 1;
 SELECT * FROM users WHERE status = 1 AND created_at > '2024-01-01';
 SELECT * FROM users WHERE created_at > '2024-01-01';
```

上面三条查询里，前两条能用到 `(status, created_at)` 复合索引，第三条只用 created_at 过滤、跳过了最左列 status，走不了这棵索引——这就是"最左前缀"的直观含义。系统展开见[复合索引与最左前缀](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)。

### 1.4 约束详解

#### 1.4.1 约束类型

| 约束类型 | 说明             | 关键字         |
| :------- | :--------------- | :------------- |
| 主键约束 | 唯一标识每行记录 | PRIMARY KEY    |
| 唯一约束 | 字段值唯一       | UNIQUE         |
| 非空约束 | 字段值不能为空   | NOT NULL       |
| 默认约束 | 字段默认值       | DEFAULT        |
| 检查约束 | 字段值满足条件   | CHECK          |
| 外键约束 | 表之间关联       | FOREIGN KEY    |
| 自动增长 | 数值自动递增     | AUTO_INCREMENT |

#### 1.4.2 约束示例

```sql
 CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单编号',
  user_id INT NOT NULL COMMENT '用户ID',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总额',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE RESTRICT -- 限制删除
  ON UPDATE CASCADE, -- 级联更新
  -- 检查约束
  CHECK (total_amount >= 0),
  CHECK (status IN (1, 2, 3, 4, 5))
 )
```

注意两个语法细节：外键与 CHECK 都可以写成**表级约束**（所有列定义完之后再写），这样一条 CHECK 可以引用多列；约束建议显式命名（`CONSTRAINT chk_amount CHECK ...`），报错信息与后续 `DROP CONSTRAINT` 都靠名字定位。

#### 1.4.3 外键约束行为

| 行为      | 说明                              |
| :-------- | :-------------------------------- |
| RESTRICT  | 阻止删除/更新有外键关联的记录     |
| CASCADE   | 级联删除/更新子表记录             |
| SET NULL  | 将子表外键设为 NULL               |
| NO ACTION | 拒绝删除/更新（与 RESTRICT 类似） |

四种行为只差"父表行被删/改时，子表关联行怎么办"。RESTRICT 与 CASCADE 是两个极端（拒绝 vs 连坐），SET NULL 要求子表外键列可空。三种行为的对照实验（含报错 1451 的现场）在[数据类型与约束](/mysql/070-MySQLDataTypeConstraint)篇外键一节。

---

## 命令速查：从建库到约束

> 速查部分的每条都给出"单行/换行"两种典型写法，供上手后快速抄写；语义细节以上文详解为准。

### 数据库操作

**单行写法：创建数据库**
`CREATE DATABASE <库名>`

```sql
-- 创建数据库
CREATE DATABASE mydb;
```

**换行写法：创建数据库并指定字符集**
`CREATE DATABASE <库名> CHARACTER SET <字符集> COLLATE <排序规则>`

```sql
-- 创建数据库并指定字符集与排序规则
CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

**换行写法：不存在时创建数据库**
`CREATE DATABASE IF NOT EXISTS <库名> [CHARACTER SET <字符集>] [COLLATE <排序规则>]`

```sql
-- 数据库不存在时才创建
CREATE DATABASE IF NOT EXISTS mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

**单行写法：查看所有数据库**
`SHOW DATABASES`

```sql
-- 查看所有数据库
SHOW DATABASES;
```

**单行写法：查看建库语句**
`SHOW CREATE DATABASE <库名>`

```sql
-- 查看数据库的建库语句
SHOW CREATE DATABASE mydb;
```

**单行写法：查看当前数据库**
`SELECT DATABASE()`

```sql
-- 查看当前使用的数据库
SELECT DATABASE();
```

**单行写法：选择数据库**
`USE <库名>`

```sql
-- 切换到指定数据库
USE mydb;
```

**单行写法：删除数据库**
`DROP DATABASE <库名>`

```sql
-- 删除数据库
DROP DATABASE mydb;
```

**单行写法：存在时删除数据库**
`DROP DATABASE IF EXISTS <库名>`

```sql
-- 数据库存在时才删除
DROP DATABASE IF EXISTS mydb;
```

**单行写法：修改数据库字符集**
`ALTER DATABASE <库名> CHARACTER SET <字符集> COLLATE <排序规则>`

```sql
-- 修改数据库的字符集与排序规则
ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 表操作

**换行写法：创建表**
`CREATE TABLE [IF NOT EXISTS] <表名> (<列定义>[, <表约束>...])`

```sql
-- 创建用户表并包含索引
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  phone VARCHAR(20) COMMENT '手机号',
  age INT UNSIGNED COMMENT '年龄',
  gender ENUM('男', '女', '保密') DEFAULT '保密' COMMENT '性别',
  status TINYINT DEFAULT 1 COMMENT '状态',
  balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '账户余额',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status)
);
```

**单行写法：查看表字段**
`DESC <表名>`

```sql
-- 查看表字段信息
DESC users;
```

**单行写法：查看列信息**
`SHOW COLUMNS FROM <表名>`

```sql
-- 查看表的列详细信息
SHOW COLUMNS FROM users;
```

**单行写法：查看建表语句**
`SHOW CREATE TABLE <表名>`

```sql
-- 查看表的建表语句
SHOW CREATE TABLE users;
```

**单行写法：查看所有表**
`SHOW TABLES`

```sql
-- 查看当前数据库的所有表
SHOW TABLES;
```

**单行写法：模糊查表**
`SHOW TABLES LIKE '<模式>'`

```sql
-- 模糊查询表名
SHOW TABLES LIKE '%user%';
```

**单行写法：添加列**
`ALTER TABLE <表名> ADD COLUMN <列定义> [AFTER <列名>]`

```sql
-- 在指定列后添加新列
ALTER TABLE users ADD COLUMN address VARCHAR(255) AFTER email;
```

**单行写法：修改列类型**
`ALTER TABLE <表名> MODIFY COLUMN <列名> <新类型> [<约束>]`

```sql
-- 修改列的定义
ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL;
```

**单行写法：重命名列**
`ALTER TABLE <表名> CHANGE COLUMN <旧列名> <新列名> <类型> [<约束>]`

```sql
-- 重命名列并保留类型
ALTER TABLE users CHANGE COLUMN phone telephone VARCHAR(20) NOT NULL;
```

**单行写法：删除列**
`ALTER TABLE <表名> DROP COLUMN <列名>`

```sql
-- 删除指定列
ALTER TABLE users DROP COLUMN address;
```

**单行写法：添加普通索引**
`ALTER TABLE <表名> ADD INDEX <索引名> (<列名>[, <列名>...])`

```sql
-- 添加普通索引
ALTER TABLE users ADD INDEX idx_age (age);
```

**单行写法：添加唯一索引**
`ALTER TABLE <表名> ADD UNIQUE INDEX <索引名> (<列名>[, <列名>...])`

```sql
-- 添加唯一索引
ALTER TABLE users ADD UNIQUE INDEX idx_phone (phone);
```

**单行写法：添加复合索引**
`ALTER TABLE <表名> ADD INDEX <索引名> (<列名1>, <列名2>[, ...])`

```sql
-- 添加复合索引
ALTER TABLE users ADD INDEX idx_age_gender (age, gender);
```

**单行写法：添加外键**
`ALTER TABLE <表名> ADD CONSTRAINT <约束名> FOREIGN KEY (<列名>) REFERENCES <父表>(<父列>)`

```sql
-- 添加外键约束
ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);
```

**单行写法：删除外键**
`ALTER TABLE <表名> DROP FOREIGN KEY <约束名>`

```sql
-- 删除外键约束
ALTER TABLE orders DROP FOREIGN KEY fk_user_id;
```

**单行写法：重命名表**
`ALTER TABLE <旧表名> RENAME TO <新表名>`

```sql
-- 重命名表
ALTER TABLE users RENAME TO user_info;
```

**单行写法：多表重命名**
`RENAME TABLE <旧表名1> TO <新表名1>, <旧表名2> TO <新表名2>`

```sql
-- 同时重命名多个表
RENAME TABLE users TO user_info, orders TO order_info;
```

**单行写法：删除表**
`DROP TABLE <表名>`

```sql
-- 删除表
DROP TABLE users;
```

**单行写法：存在时删除表**
`DROP TABLE IF EXISTS <表名>`

```sql
-- 表存在时才删除
DROP TABLE IF EXISTS users;
```

**单行写法：删除多表**
`DROP TABLE IF EXISTS <表名1>, <表名2>[, ...]`

```sql
-- 同时删除多个表
DROP TABLE IF EXISTS users, orders, products;
```

**单行写法：清空表**
`TRUNCATE TABLE <表名>`

```sql
-- 清空表数据
TRUNCATE TABLE users;
```

**单行写法：仅复制表结构**
`CREATE TABLE <新表> LIKE <源表>`

```sql
-- 仅复制表结构不复制数据
CREATE TABLE users_copy LIKE users;
```

**单行写法：复制结构和数据**
`CREATE TABLE <新表> AS SELECT * FROM <源表>`

```sql
-- 复制表结构和全部数据
CREATE TABLE users_copy AS SELECT * FROM users;
```

**单行写法：复制部分数据**
`CREATE TABLE <新表> AS SELECT * FROM <源表> WHERE <条件>`

```sql
-- 复制表结构并复制符合条件的数据
CREATE TABLE users_copy AS SELECT * FROM users WHERE status = 1;
```

### 索引操作

**单行写法：创建普通索引**
`CREATE INDEX <索引名> ON <表名>(<列名>[, <列名>...])`

```sql
-- 创建单列普通索引
CREATE INDEX idx_username ON users(username);
```

**单行写法：创建复合索引**
`CREATE INDEX <索引名> ON <表名>(<列名1>, <列名2>[, ...])`

```sql
-- 创建多列复合索引
CREATE INDEX idx_name_status ON users(username, status);
```

**单行写法：创建唯一索引**
`CREATE UNIQUE INDEX <索引名> ON <表名>(<列名>[, <列名>...])`

```sql
-- 创建单列唯一索引
CREATE UNIQUE INDEX idx_email ON users(email);
```

**单行写法：创建复合唯一索引**
`CREATE UNIQUE INDEX <索引名> ON <表名>(<列名1>, <列名2>[, ...])`

```sql
-- 创建多列复合唯一索引
CREATE UNIQUE INDEX idx_order_product ON order_items(order_id, product_id);
```

**单行写法：创建前缀索引**
`CREATE INDEX <索引名> ON <表名>(<列名>(<长度>))`

```sql
-- 为长字符串创建前缀索引
CREATE INDEX idx_email_prefix ON users(email(10));
```

**单行写法：创建全文索引**
`ALTER TABLE <表名> ADD FULLTEXT INDEX <索引名> (<列名>[, <列名>...])`

```sql
-- 为文本列创建全文索引
ALTER TABLE articles ADD FULLTEXT INDEX ft_title_content (title, content);
```

**单行写法：查看表索引**
`SHOW INDEX FROM <表名>`

```sql
-- 查看表的索引信息
SHOW INDEX FROM users;
```

**单行写法：删除索引**
`DROP INDEX <索引名> ON <表名>`

```sql
-- 删除指定索引
DROP INDEX idx_username ON users;
```

**单行写法：删除主键**
`ALTER TABLE <表名> DROP PRIMARY KEY`

```sql
-- 删除主键索引
ALTER TABLE users DROP PRIMARY KEY;
```

### 约束

**换行写法：综合约束建表**
`CREATE TABLE <表名> (<列定义>, <约束定义>...)`

```sql
-- 创建包含多种约束的订单表
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单编号',
  user_id INT NOT NULL COMMENT '用户ID',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总额',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CHECK (total_amount >= 0),
  CHECK (status IN (1, 2, 3, 4, 5))
);
```

## 动手实践：把一套库表结构完整建出来

**任务**：给一个小型商品管理系统建"库 - 三张表 - 约束 - 索引"的完整骨架，要求：

1. 库名 `shop_practice`，显式 utf8mb4；
2. `departments`（部门：自增主键、部门名唯一）与 `employees`（员工：工号 CHAR(8) 唯一、姓名非空、所属部门外键 ON DELETE RESTRICT、入职时间 DATETIME 默认当前时间）；
3. 给 `employees` 补一条 CHECK：工号长度等于 8；
4. 三种方式各复制一次 `employees`（LIKE / CTAS / WHERE 1=0），`SHOW CREATE TABLE` 对比三张副本各丢了什么；
5. 收尾：用 `RENAME TABLE` 把 `employees` 改名为 `staff`，再改回来。

提示：先建父表（departments）再建子表（employees），顺序反了外键没有落点；观察第 4 步对比时重点看索引、外键、COMMENT 三项。

<details>
<summary>参考实现（先自己写完再展开）</summary>

```sql
-- 1. 建库（IF NOT EXISTS 让脚本可重跑）
CREATE DATABASE IF NOT EXISTS shop_practice
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE shop_practice;

-- 2a. 父表：部门
CREATE TABLE departments (
  id   INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '部门名'
) ENGINE=InnoDB;

-- 2b. 子表：员工（外键引用 departments）
CREATE TABLE employees (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  emp_no      CHAR(8)      NOT NULL COMMENT '工号',
  emp_name    VARCHAR(30)  NOT NULL,
  dept_id     INT          NOT NULL,
  hired_at    DATETIME     DEFAULT NOW() COMMENT '入职时间',
  CONSTRAINT fk_emp_dept FOREIGN KEY (dept_id)
    REFERENCES departments (id) ON DELETE RESTRICT,
  CONSTRAINT chk_emp_no CHECK (CHAR_LENGTH(emp_no) = 8),
  UNIQUE KEY uk_emp_no (emp_no)
) ENGINE=InnoDB;

-- 3. 验证 CHECK（长度不足 8 应报 ERROR 3819）
INSERT INTO employees (emp_no, emp_name, dept_id)
VALUES ('E001', '张三', 1);
-- ERROR 3819: Check constraint 'chk_emp_no' is violated.

-- 4. 三种复制
CREATE TABLE emp_like   LIKE employees;                                  -- 结构+索引，无数据无外键
CREATE TABLE emp_ctas   AS SELECT * FROM employees;                      -- 结构+数据，无索引约束注释
CREATE TABLE emp_skel   AS SELECT * FROM employees WHERE 1=0;            -- 结构（无索引），无数据
SHOW CREATE TABLE emp_like;
SHOW CREATE TABLE emp_ctas;   -- 对比：idx/约束/COMMENT 全部消失
SHOW CREATE TABLE emp_skel;

-- 5. 改名演练
RENAME TABLE employees TO staff;
RENAME TABLE staff TO employees;

-- 清理
DROP DATABASE shop_practice;
```

自检标准：`SHOW CREATE TABLE emp_like` 里还能看到 `uk_emp_no`，看不到 `fk_emp_dept`；`emp_ctas` 里索引、外键、CHECK、表注释全部消失；RENAME 后原索引与数据原样跟随。

</details>

## 小结

- DDL 四个动词 CREATE / ALTER / DROP / TRUNCATE 全部**隐式提交、不可回滚**，执行前先备份；
- 建库时定字符集、建表时定引擎与注释，是成本最低的时机；
- MODIFY / CHANGE / RENAME COLUMN 三者的分工，LIKE / CTAS 两种复制的取舍，是高频易混点；
- 索引与约束都能"建表时写"或"事后 ALTER 补"，大表一律先评估在线路径（[大表变更](/mysql/685-OnlineDDLTableChange)）。

## 下一步

- [DML 数据操作语言](/mysql/100-DML)：表建好了，往里插改删；
- [大表变更：Online DDL 与影子表工具](/mysql/685-OnlineDDLTableChange)：本篇 ALTER 命令在大表上的生产级展开；
- [数据类型与约束](/mysql/070-MySQLDataTypeConstraint)：约束背后的类型选型逻辑。

## 参考与致谢

- MySQL Reference Manual, Data Definition Statements（CREATE/ALTER/DROP/TABLE/INDEX 语句的权威定义）：https://dev.mysql.com/doc/refman/8.4/en/sql-data-definition-statements.html ；
- 本篇速查体例沿用仓库既有文档风格；示例中的库表为教学虚构。

## 原子 DDL（8.0）：要么全成，要么全不动

MySQL 8.0 把 DDL 改造成原子操作：操作要么完全成功，要么完全回滚，**不会留下半成品**（残留的元数据、半删的表文件）。

```sql
-- 原子 DROP：多表删除要么全删、要么全保留
DROP TABLE IF EXISTS table1, table2, table3;
-- 5.7 的可能结局：table1 删了、table2 删除失败 -> 现场半残

-- 原子 ALTER：一个语句里多个变更作为整体
ALTER TABLE orders
ADD COLUMN new_col VARCHAR(50),
ADD INDEX idx_new_col (new_col);
-- 加索引失败时，加列一并回滚（5.7 会留下已加的列）
```

逐段讲它修的是什么：5.7 时代 DDL 的中断（连接断开、权限不足、磁盘满）会留下「表在数据字典里但文件系统里半删」这类需要手工救援的状态（ibd 文件孤儿）；8.0 的原子 DDL 用 InnoDB 数据字典 + DDL 日志把多步变更包成事务语义。与 [在线 DDL](/mysql/685-OnlineDDLTableChange) 的关系：在线 DDL 管「执行期间锁不锁业务」（并发维度），原子 DDL 管「失败后现场干不干净」（事务维度）——两者是 DDL 可靠性的两个正交面。运维含义：8.0 之后 DDL 失败重跑是安全的（幂等性由原子性保证），5.7 老手册里「DDL 中断后先查 information_schema 再决定怎么办」的救援手册整体退役。
