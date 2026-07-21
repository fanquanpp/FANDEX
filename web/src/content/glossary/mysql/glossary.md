---
title: 'MySQL 专有名词查阅表'
module: 'mysql'
category: 'mysql'
description: 'MySQL 专有名词注释查阅表，涵盖 SQL 基础、数据库操作、索引优化等'
author: 'fanquanpp'
updated: '2026-05-29'
---

## 名词列表

### core 核心基础术语

| 术语     | 英文               | 释义                                     |
| -------- | ------------------ | ---------------------------------------- |
| 聚合函数 | Aggregate Function | COUNT、SUM、AVG、MAX、MIN 等汇总数据函数 |
| 别名     | Alias              | 列或表的临时名称，用 AS 指定             |
| ALTER    | ALTER              | 修改表结构的 SQL 语句                    |
| AND      | AND                | 逻辑与运算符                             |
| 注释     | Comment            | SQL 代码中的说明文本                     |
| CREATE   | CREATE             | 创建数据库对象的语句                     |
| 数据类型 | Data Type          | 值的种类，如 INT、VARCHAR、DATE          |
| 数据库   | Database           | 存储数据的容器                           |
| 删除     | DELETE             | 从表中删除数据行                         |
| 删除表   | DROP               | 删除整个表或数据库                       |
| 插入     | INSERT             | 向表中添加新数据                         |
| 主键     | Primary Key        | 唯一标识每行数据的列                     |
| 查询     | Query              | 从数据库获取数据的语句                   |
| 关系     | Relationship       | 表之间的关联关系                         |
| 模式     | Schema             | 数据库的结构定义                         |
| SELECT   | SELECT             | 查询数据的 SQL 语句                      |
| SQL      | SQL                | 结构化查询语言                           |
| 表       | Table              | 由行和列组成的数据集合                   |
| 更新     | UPDATE             | 修改表中现有数据                         |
| 值       | Value              | 存储在单元格中的数据                     |
| WHERE    | WHERE              | 过滤结果的条件子句                       |

### stdlib 标准库术语

| 术语                    | 英文              | 释义                           |
| ----------------------- | ----------------- | ------------------------------ |
| ABS                     | ABS               | 返回数值的绝对值               |
| ACID                    | ACID              | 原子性、一致性、隔离性、持久性 |
| ADD COLUMN              | ADD COLUMN        | 向表中添加新列                 |
| AES_DECRYPT             | AES_DECRYPT       | AES 解密函数                   |
| AES_ENCRYPT             | AES_ENCRYPT       | AES 加密函数                   |
| ALTER TABLE             | ALTER TABLE       | 修改表结构                     |
| ANALYZE TABLE           | ANALYZE TABLE     | 分析表用于优化                 |
| AS                      | AS                | 定义别名                       |
| ASC                     | ASC               | 升序排列                       |
| AVG                     | AVG               | 计算平均值                     |
| BEGIN                   | BEGIN             | 开启事务                       |
| BETWEEN                 | BETWEEN           | 范围查询运算符                 |
| BIN                     | BIN               | 十进制转二进制                 |
| BINARY                  | BINARY            | 二进制数据类型                 |
| BLOB                    | BLOB              | 二进制大对象类型               |
| CASE                    | CASE              | 条件表达式                     |
| CAST                    | CAST              | 类型转换函数                   |
| CEILING                 | CEILING           | 向上取整                       |
| CHAR                    | CHAR              | 定长字符类型                   |
| CHAR_LENGTH             | CHAR_LENGTH       | 字符数量                       |
| CHECK                   | CHECK             | 约束检查条件                   |
| COALESCE                | COALESCE          | 返回第一个非 NULL 值           |
| COLUMN                  | Column            | 表中的列                       |
| COMMIT                  | COMMIT            | 提交事务                       |
| CONCAT                  | CONCAT            | 连接字符串                     |
| CONSTRAINT              | Constraint        | 约束条件                       |
| CONVERT                 | CONVERT           | 类型转换                       |
| COUNT                   | COUNT             | 统计行数                       |
| CREATE DATABASE         | CREATE DATABASE   | 创建数据库                     |
| CREATE INDEX            | CREATE INDEX      | 创建索引                       |
| CREATE TABLE            | CREATE TABLE      | 创建表                         |
| CREATE VIEW             | CREATE VIEW       | 创建视图                       |
| CURDATE                 | CURDATE           | 返回当前日期                   |
| CURRENT_DATE            | CURRENT_DATE      | 当前日期                       |
| CURRENT_TIME            | CURRENT_TIME      | 当前时间                       |
| CURRENT_TIMESTAMP       | CURRENT_TIMESTAMP | 当前时间戳                     |
| DATABASE                | DATABASE          | 数据库名称                     |
| DATE                    | DATE              | 日期类型                       |
| DATEDIFF                | DATEDIFF          | 日期差值计算                   |
| DATE_FORMAT             | DATE_FORMAT       | 日期格式化                     |
| DAY                     | DAY               | 提取日期的天                   |
| DAYNAME                 | DAYNAME           | 日期对应的星期名               |
| DAYOFMONTH              | DAYOFMONTH        | 月份中的第几天                 |
| DAYOFWEEK               | DAYOFWEEK         | 星期中的第几天                 |
| DAYOFYEAR               | DAYOFYEAR         | 年份中的第几天                 |
| DECIMAL                 | DECIMAL           | 精确小数类型                   |
| DEFAULT                 | DEFAULT           | 默认值约束                     |
| DELETE FROM             | DELETE FROM       | 删除数据                       |
| DESC                    | DESC              | 降序排列                       |
| DISTINCT                | DISTINCT          | 去重查询                       |
| DOUBLE                  | DOUBLE            | 双精度浮点数                   |
| DROP COLUMN             | DROP COLUMN       | 删除列                         |
| DROP DATABASE           | DROP DATABASE     | 删除数据库                     |
| DROP INDEX              | DROP INDEX        | 删除索引                       |
| DROP TABLE              | DROP TABLE        | 删除表                         |
| DROP VIEW               | DROP VIEW         | 删除视图                       |
| ENUM                    | ENUM              | 枚举类型                       |
| EXISTS                  | EXISTS            | 检查子查询是否存在             |
| EXPLAIN                 | EXPLAIN           | 分析查询执行计划               |
| EXPORT                  | EXPORT            | 导出数据                       |
| EXTRACT                 | EXTRACT           | 提取日期部分                   |
| FIELD                   | FIELD             | 字段名称                       |
| FLOAT                   | FLOAT             | 单精度浮点数                   |
| FLOOR                   | FLOOR             | 向下取整                       |
| FOR                     | FOR               | 循环语句                       |
| FOREIGN KEY             | FOREIGN KEY       | 外键约束                       |
| FORMAT                  | FORMAT            | 格式化数字或日期               |
| FROM                    | FROM              | 指定查询来源表                 |
| FULL OUTER JOIN         | FULL OUTER JOIN   | 完全外连接                     |
| FULLTEXT INDEX          | FULLTEXT INDEX    | 全文索引                       |
| FUNCTION                | FUNCTION          | 存储函数                       |
| GET_LOCK                | GET_LOCK          | 获取命名锁                     |
| GROUP BY                | GROUP BY          | 分组查询                       |
| GROUP_CONCAT            | GROUP_CONCAT      | 连接分组内的值                 |
| HAVING                  | HAVING            | 分组后过滤                     |
| HEX                     | HEX               | 十六进制转换                   |
| HOUR                    | HOUR              | 提取小时                       |
| IFNULL                  | IFNULL            | NULL 时返回替代值              |
| IGNORE                  | IGNORE            | 忽略错误继续执行               |
| IMPORT                  | IMPORT            | 导入数据                       |
| IN                      | IN                | 在列表中查询                   |
| INDEX                   | INDEX             | 索引                           |
| INNER JOIN              | INNER JOIN        | 内连接                         |
| INSERT INTO             | INSERT INTO       | 插入数据                       |
| INSERT IGNORE           | INSERT IGNORE     | 忽略重复插入                   |
| INSERT ON DUPLICATE KEY | ON DUPLICATE KEY  | 键冲突时更新                   |
| INT                     | INT               | 整数类型                       |
| INTEGER                 | INTEGER           | 整数类型                       |
| INTERVAL                | INTERVAL          | 时间间隔                       |
| IS NULL                 | IS NULL           | 检查 NULL 值                   |
| IS NOT NULL             | IS NOT NULL       | 检查非 NULL 值                 |
| JOIN                    | JOIN              | 连接表                         |
| JSON                    | JSON              | JSON 数据类型                  |
| JSON_ARRAY              | JSON_ARRAY        | 创建 JSON 数组                 |
| JSON_OBJECT             | JSON_OBJECT       | 创建 JSON 对象                 |
| KEY                     | KEY               | 索引关键字                     |
| LAST_INSERT_ID          | LAST_INSERT_ID    | 最后插入的 ID                  |
| LEADING                 | LEADING           | 去除前导字符                   |
| LEFT                    | LEFT              | 提取左侧字符                   |
| LEFT JOIN               | LEFT JOIN         | 左外连接                       |
| LENGTH                  | LENGTH            | 字节长度                       |
| LIKE                    | LIKE              | 模式匹配                       |
| LIMIT                   | LIMIT             | 限制返回行数                   |
| LOAD DATA               | LOAD DATA         | 批量导入数据                   |
| LOCATE                  | LOCATE            | 查找子串位置                   |
| LOCK                    | LOCK              | 表锁或行锁                     |
| LOWER                   | LOWER             | 转换为小写                     |
| LPAD                    | LPAD              | 左填充字符串                   |
| LTRIM                   | LTRIM             | 去除左侧空格                   |
| MAX                     | MAX               | 返回最大值                     |
| MD5                     | MD5               | MD5 哈希值                     |
| MID                     | MID               | 提取子串                       |
| MIN                     | MIN               | 返回最小值                     |
| MINUTE                  | MINUTE            | 提取分钟                       |
| MOD                     | MOD               | 取模运算                       |
| MONTH                   | MONTH             | 提取月份                       |
| MONTHNAME               | MONTHNAME         | 月份名称                       |
| NATURAL JOIN            | NATURAL JOIN      | 自然连接                       |
| NOT                     | NOT               | 逻辑非                         |
| NOT NULL                | NOT NULL          | 非空约束                       |
| NOW                     | NOW               | 当前日期时间                   |
| NULL                    | NULL              | 空值                           |
| NUMERIC                 | NUMERIC           | 数值类型                       |
| OFFSET                  | OFFSET            | 结果偏移量                     |
| ON                      | ON                | 连接条件                       |
| ON DELETE               | ON DELETE         | 删除时级联操作                 |
| ON UPDATE               | ON UPDATE         | 更新时级联操作                 |
| OPTIMIZE TABLE          | OPTIMIZE TABLE    | 优化表碎片                     |
| OR                      | OR                | 逻辑或                         |
| ORDER BY                | ORDER BY          | 结果排序                       |
| OUTER JOIN              | OUTER JOIN        | 外连接                         |
| OUTFILE                 | OUTFILE           | 导出到文件                     |
| OVER                    | OVER              | 窗口函数定义                   |
| PASSWORD                | PASSWORD          | 密码哈希函数                   |
| POSITION                | POSITION          | 子串位置                       |
| POW                     | POW               | 幂运算                         |
| PREPARE                 | PREPARE           | 预处理语句                     |
| PRIMARY KEY             | PRIMARY KEY       | 主键约束                       |
| PROCEDURE               | PROCEDURE         | 存储过程                       |
| QUARTER                 | QUARTER           | 季度                           |
| RAND                    | RAND              | 随机数                         |
| RANK                    | RANK              | 排名函数                       |
| READ                    | READ              | 读取锁                         |
| READ UNCOMMITTED        | READ UNCOMMITTED  | 读取未提交                     |
| READ COMMITTED          | READ COMMITTED    | 读取已提交                     |
| READ ONLY               | READ ONLY         | 只读模式                       |
| REAL                    | REAL              | 浮点类型                       |
| REFERENCES              | REFERENCES        | 外键引用                       |
| RENAME                  | RENAME            | 重命名                         |
| RENAME TABLE            | RENAME TABLE      | 重命名表                       |
| REPEAT                  | REPEAT            | 重复字符串                     |
| REPLACE                 | REPLACE           | 替换字符串或数据               |
| REPLACE INTO            | REPLACE INTO      | 替换或插入                     |
| REVOKE                  | REVOKE            | 撤销权限                       |
| RIGHT                   | RIGHT             | 提取右侧字符                   |
| RIGHT JOIN              | RIGHT JOIN        | 右外连接                       |
| ROLLBACK                | ROLLBACK          | 回滚事务                       |
| ROUND                   | ROUND             | 四舍五入                       |
| ROW                     | ROW               | 数据行                         |
| ROW_NUMBER              | ROW_NUMBER        | 行号函数                       |
| RPAD                    | RPAD              | 右填充字符串                   |
| RTRIM                   | RTRIM             | 去除右侧空格                   |
| SCHEMA                  | SCHEMA            | 数据库模式                     |
| SECOND                  | SECOND            | 提取秒                         |
| SELECT                  | SELECT            | 查询语句                       |
| SELECT DISTINCT         | SELECT DISTINCT   | 去重查询                       |
| SERIALIZABLE            | SERIALIZABLE      | 可串行化隔离级别               |
| SESSION                 | SESSION           | 会话                           |
| SET                     | SET               | 设置变量或值                   |
| SHOW                    | SHOW              | 显示数据库信息                 |
| SIGN                    | SIGN              | 返回符号                       |
| SILENT                  | SILENT            | 静默模式                       |
| SMALLINT                | SMALLINT          | 小整数类型                     |
| SOME                    | SOME              | 与 ANY 相同                    |
| SOUNDEX                 | SOUNDEX           | 语音编码                       |
| SPACE                   | SPACE             | 生成空格字符串                 |
| SQRT                    | SQRT              | 平方根                         |
| START TRANSACTION       | START TRANSACTION | 开始事务                       |
| STD                     | STD               | 标准差                         |
| STDDEV                  | STDDEV            | 标准差                         |
| STOP                    | STOP              | 停止语句                       |
| STORED                  | STORED            | 物化视图                       |
| STRAIGHT_JOIN           | STRAIGHT_JOIN     | 强制顺序连接                   |
| STRING                  | STRING            | 字符串类型                     |
| SUBDATE                 | SUBDATE           | 减去日期                       |
| SUBSTRING               | SUBSTRING         | 提取子串                       |
| SUM                     | SUM               | 求和                           |
| SWITCH                  | SWITCH            | 条件分支                       |
| SYSDATE                 | SYSDATE           | 系统当前日期                   |
| SYSTEM                  | SYSTEM            | 系统用户                       |
| TABLE                   | TABLE             | 表                             |
| TABLE NAME              | TABLE NAME        | 表名                           |
| TEMPORARY               | TEMPORARY         | 临时表                         |
| TEXT                    | TEXT              | 文本类型                       |
| THEN                    | THEN              | CASE 条件分支                  |
| TINYINT                 | TINYINT           | 微整数类型                     |
| TO                      | TO                | 目标位置                       |
| TRAILING                | TRAILING          | 去除尾部字符                   |
| TRANSACTION             | TRANSACTION       | 事务                           |
| TRIM                    | TRIM              | 去除首尾空格                   |
| TRUNCATE                | TRUNCATE          | 清空表                         |
| UNICODE                 | UNICODE           | 统一码                         |
| UNION                   | UNION             | 合并结果集                     |
| UNION ALL               | UNION ALL         | 合并包含重复                   |
| UNIQUE                  | UNIQUE            | 唯一约束                       |
| UNLOCK                  | UNLOCK            | 解除锁                         |
| UNSIGNED                | UNSIGNED          | 无符号整数                     |
| UPDATE                  | UPDATE            | 更新数据                       |
| UPPER                   | UPPER             | 转换为大写                     |
| USE                     | USE               | 选择数据库                     |
| USER                    | USER              | 用户名                         |
| USING                   | USING             | 连接方式                       |
| UUID                    | UUID              | 通用唯一标识符                 |
| VALUES                  | VALUES            | 插入的值                       |
| VARCHAR                 | VARCHAR           | 变长字符类型                   |
| VARIANCE                | VARIANCE          | 方差                           |
| VIEW                    | VIEW              | 视图                           |
| VIRTUAL                 | VIRTUAL           | 虚拟列                         |
| WEEK                    | WEEK              | 一年中的周                     |
| WEEKDAY                 | WEEKDAY           | 星期几                         |
| WHERE                   | WHERE             | 条件过滤                       |
| WITH                    | WITH              | 公共表达式                     |
| WRITE                   | WRITE             | 写入锁                         |
| YEAR                    | YEAR              | 提取年份                       |

### advanced 高级进阶术语

| 术语               | 英文                     | 释义                       |
| ------------------ | ------------------------ | -------------------------- |
| 访问路径           | Access Path              | 查询使用的索引和扫描方式   |
| 会计               | Accounting               | 资源使用记录               |
| ACID 属性          | ACID Properties          | 事务的四个特性             |
| 聚集索引           | Clustered Index          | 数据按索引顺序物理存储     |
| 覆盖索引           | Covering Index           | 包含查询所有列的索引       |
| 死锁               | Deadlock                 | 两个事务相互等待对方释放锁 |
| 可序列化           | Serializable             | 最高的隔离级别             |
| 脏读               | Dirty Read               | 读取未提交的数据           |
| 事件调度器         | Event Scheduler          | 定时执行任务的调度器       |
| 交换分区           | Exchange Partition       | 交换表和分区的数据         |
| EXPLAIN ANALYZE    | EXPLAIN ANALYZE          | 执行并分析查询             |
| 表达式索引         | Expression Index         | 基于表达式的索引           |
| 外部连接           | Foreign Join             | 外连接                     |
| 函数索引           | Functional Index         | 存储函数结果的索引         |
| 间隙锁             | Gap Lock                 | 索引间隙上的锁             |
| 全表扫描           | Full Table Scan          | 读取整个表的扫描           |
| 全局事务标识符     | GTID                     | 全局唯一事务 ID            |
| 哈希连接           | Hash Join                | 使用哈希表的连接           |
| 隐式事务           | Implicit Transaction     | 自动提交的事务             |
| 索引提示           | Index Hint               | 强制使用特定索引           |
| 索引合并           | Index Merge              | 合并多个索引结果           |
| InnoDB             | InnoDB                   | MySQL 默认存储引擎         |
| 隔离级别           | Isolation Level          | 并发事务的隔离程度         |
| 连接池             | Connection Pool          | 复用数据库连接             |
| 锁定读取           | Locking Read             | 加锁的读取操作             |
| 日志文件组         | Log File Group           | 重做日志的文件组           |
| 主从复制           | Master-Slave Replication | 主库到从库的复制           |
| 物化视图           | Materialized View        | 预先计算并存储的结果       |
| 内存表             | Memory Table             | 存储在内存中的表           |
| Merge              | Merge                    | 合并存储引擎               |
| MRR                | Multi-Range Read         | 范围查询优化               |
| 多源复制           | Multi-source Replication | 多个主库的复制             |
| MyISAM             | MyISAM                   | MySQL 旧版存储引擎         |
| 非聚集索引         | Non-clustered Index      | 数据与索引分离存储         |
| 非阻塞 DDL         | Online DDL               | 在线表结构变更             |
| 乐观锁             | Optimistic Locking       | 假设冲突少，用版本号控制   |
| 优化器提示         | Optimizer Hint           | 指导优化器决策             |
| 排序合并连接       | Sort-Merge Join          | 先排序再合并的连接         |
| 分区               | Partition                | 将表水平拆分               |
| 分区裁剪           | Partition Pruning        | 只读取相关分区             |
| 主从切换           | Failover                 | 主库故障时切换到从库       |
| 悲观锁             | Pessimistic Locking      | 假设冲突多，提前加锁       |
| 预读               | Read-ahead               | 预测性读取数据             |
| 记录锁             | Record Lock              | 行级别的锁                 |
| 正则表达式         | Regular Expression       | 模式匹配                   |
| 重复读             | Repeatable Read          | 事务期间读取一致           |
| 复制过滤器         | Replication Filter       | 过滤复制的数据库或表       |
| 复制延迟           | Replication Lag          | 从库落后主库的时间         |
| 回滚段             | Rollback Segment         | 存储撤销信息               |
| 行锁               | Row Lock                 | 行级别的锁                 |
| SAVEPOINT          | SAVEPOINT                | 事务保存点                 |
| 二级索引           | Secondary Index          | 除主键外的其他索引         |
| 半连接             | Semi-join                | 只返回匹配行的列           |
| 序列               | Sequence                 | 自动生成序列号             |
| 顺序读             | Sequential Read          | 按顺序读取数据             |
| 快照隔离           | Snapshot Isolation       | 基于快照的隔离             |
| SQL 模式           | SQL Mode                 | SQL 执行规则配置           |
| 语句级触发器       | Statement Trigger        | 语句级别触发器             |
| 存储程序           | Stored Program           | 存储过程、函数、触发器     |
| 存储引擎           | Storage Engine           | 数据存储和读取的引擎       |
| 子查询             | Subquery                 | 嵌套在查询中的查询         |
| 表锁               | Table Lock               | 表级别的锁                 |
| 表空间             | Tablespace               | 存储表数据的文件           |
| 触发器             | Trigger                  | 事件自动执行的操作         |
| 唯一索引           | Unique Index             | 值必须唯一的索引           |
| 虚拟列             | Virtual Column           | 计算得出的列               |
| 无锁读取           | Lock-free Read           | 不加锁的读取               |
| 行级触发器         | Row Trigger              | 每行触发一次               |
| 延迟复制           | Delayed Replication      | 从库延迟复制               |
| 游标               | Cursor                   | 逐行处理结果集             |
| 预处理语句         | Prepared Statement       | 预编译的 SQL 语句          |
| XA 事务            | XA Transaction           | 分布式事务                 |
| 脏页               | Dirty Page               | 已修改未写入磁盘的页       |
| 缓冲池             | Buffer Pool              | InnoDB 缓存数据和索引      |
| 自适应哈希索引     | Adaptive Hash Index      | InnoDB 自动构建的哈希索引  |
| 双写缓冲区         | Doublewrite Buffer       | 防止部分写入               |
| Change Buffer      | Change Buffer            | 缓存二级索引更新           |
| Redo Log           | Redo Log                 | 重做日志，确保持久性       |
| Undo Log           | Undo Log                 | 回滚日志，支持回滚和 MVCC  |
| MVCC               | MVCC                     | 多版本并发控制             |
| 组提交             | Group Commit             | 合并多个提交一次写入       |
| 刷新邻居           | Flush Neighbors          | 刷新相邻脏页               |
| 逻辑备份           | Logical Backup           | 导出 SQL 语句              |
| 物理备份           | Physical Backup          | 复制数据文件               |
| 增量备份           | Incremental Backup       | 只备份变更部分             |
| 时间点恢复         | Point-in-time Recovery   | 恢复到特定时间点           |
| 二进制日志         | Binary Log               | 记录数据变更               |
| 中继日志           | Relay Log                | 从库接收的复制事件         |
| GTID               | GTID                     | 全局事务标识符             |
| 延迟关联           | Loose Index Scan         | 优化 GROUP BY              |
| 紧凑索引           | Compact                  | 行格式的一种               |
| 动态行格式         | Dynamic Row Format       | 动态行格式                 |
| 行溢出             | Row Overflow             | 大列存储在溢出页           |
| 全文索引           | Full-text Index          | 文本内容搜索               |
| 中文分词           | Chinese Tokenization     | 中文词语切分               |
| INFORMATION_SCHEMA | INFORMATION_SCHEMA       | 元数据数据库               |
| PERFORMANCE_SCHEMA | PERFORMANCE_SCHEMA       | 性能监控数据库             |
| 慢查询日志         | Slow Query Log           | 记录执行慢的查询           |
| 通用查询日志       | General Query Log        | 记录所有查询               |
| 审计日志           | Audit Log                | 安全审计日志               |
| 连接属性           | Connection Attributes    | 连接时的元信息             |
| 可切换授权         | Pluggable Authentication | 可插拔认证                 |
| 密码过期           | Password Expiration      | 强制密码更新               |
| 密码验证           | Password Verification    | 验证密码强度               |
| 角色               | Role                     | 权限集合                   |
| 资源组             | Resource Group           | 限制资源使用               |
| 锁监控             | Lock Monitor             | 监控锁状态                 |
| 死锁检测           | Deadlock Detection       | 自动检测死锁               |
| 事务隔离级别       | Transaction Isolation    | 设置事务隔离程度           |
| 只读事务           | Read-only Transaction    | 只读事务优化               |
| 自动提交           | Autocommit               | 每条语句自动提交           |
| 多语句             | Multi-statement          | 一条语句执行多条           |
| 参数化查询         | Parameterized Query      | 使用占位符的查询           |
| 语句重写           | Statement Rewrite        | 重写 SQL 语句              |
| 条件推入           | Condition Pushdown       | 条件下推到存储引擎         |
| 索引条件下推       | Index Condition Pushdown | 索引条件下推               |
| 批量插入           | Bulk Insert              | 批量导入数据               |
| 延迟插入           | Delayed Insert           | 延迟插入到队列             |
| IGNORE ROW         | IGNORE ROW               | 忽略重复行                 |
| LOW_PRIORITY       | LOW_PRIORITY             | 低优先级操作               |
| HIGH_PRIORITY      | HIGH_PRIORITY            | 高优先级操作               |
| STRAIGHT_JOIN      | STRAIGHT_JOIN            | 强制顺序连接               |
| FORCE INDEX        | FORCE INDEX              | 强制使用索引               |
| IGNORE INDEX       | IGNORE INDEX             | 忽略某些索引               |
| SQL_CACHE          | SQL_CACHE                | 缓存查询结果               |
| SQL_NO_CACHE       | SQL_NO_CACHE             | 不缓存结果                 |
| SQL_SMALL_RESULT   | SQL_SMALL_RESULT         | 小结果集优化               |
| SQL_BIG_RESULT     | SQL_BIG_RESULT           | 大结果集优化               |
| SQL_BUFFER_RESULT  | SQL_BUFFER_RESULT        | 缓冲结果集                 |
| LIMIT OFFSET       | LIMIT OFFSET             | 分页查询                   |
| FOUND_ROWS         | FOUND_ROWS               | 总行数                     |
| ROW_COUNT          | ROW_COUNT                | 影响行数                   |
| LAST_INSERT_ID     | LAST_INSERT_ID           | 最后插入 ID                |
| ROW_NUMBER         | ROW_NUMBER               | 行号                       |
| RANK               | RANK                     | 排名                       |
| DENSE_RANK         | DENSE_RANK               | 密集排名                   |
| LEAD               | LEAD                     | 下一行值                   |
| LAG                | LAG                      | 上一行值                   |
| FIRST_VALUE        | FIRST_VALUE              | 第一行值                   |
| LAST_VALUE         | LAST_VALUE               | 最后一行值                 |
| NTILE              | NTILE                    | 分桶                       |
| CUME_DIST          | CUME_DIST                | 累积分布                   |
| PERCENT_RANK       | PERCENT_RANK             | 百分比排名                 |
| OVER PARTITION     | OVER PARTITION           | 窗口分区                   |
| OVER ORDER BY      | OVER ORDER BY            | 窗口排序                   |
| OVER ROWS          | OVER ROWS                | 窗口行范围                 |
| OVER RANGE         | OVER RANGE               | 窗口值范围                 |
