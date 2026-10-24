---
order: 70
title: MySQL 数据类型与约束：给充电桩网络建第一张表
module: 'mysql'
category: 数据库
difficulty: beginner
description: 从零设计一张充电桩表：每个字段为什么选这个类型、约束怎样在坏数据进门时就把它拦下，亲手触发 1048/1062/3819 真实报错，并带走金额用 DECIMAL、时间看 2038、外键要不要建这三条决策原则。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/050-MySQLOverviewDatabaseDesign'
  - 'mysql/090-SQLDataDefinitionAdvanced'
  - 'mysql/100-DML'
  - 'mysql/170-CharsetCollation'
prerequisites:
  - 'mysql/060-MySQLEnvSetup'
---

## 1. 场景：入职第一天，建第一张表

你入职充电桩公司"绿芯能源"，导师丢来一句需求："先把桩档案表建出来，字段有：桩编号、所属站点、额定功率、运行状态、电价、安装日期、最近心跳、厂商扩展信息。"

新手常见的做法是把每个字段都写成 `VARCHAR(255)`，能跑就行。但数据库的类型和约束是**你手里最便宜的数据质检员**：类型选对，坏数据在进门时就被拦下；类型选错，半年后天天在应用层写补丁。这篇就按"逐字段做决策"的方式，把 MySQL 常用类型和约束一次学完，环境用 MySQL 8.4（8.0 同样适用）。

## 2. 动手：逐字段建出这张表

先看成品，然后一个字段一个字段说清楚"为什么是它"：

```sql
CREATE TABLE charging_piles (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pile_no        CHAR(12)      NOT NULL,               -- 桩编号，定长编码
  station_id     INT UNSIGNED  NOT NULL,               -- 所属站点 id
  power_kw       DECIMAL(5,1)  NOT NULL,               -- 额定功率，千瓦
  status         TINYINT       NOT NULL DEFAULT 1,     -- 1 空闲 2 充电中 3 故障 4 离线
  price_per_kwh  DECIMAL(5,2)  NOT NULL DEFAULT 1.20,  -- 电价，元/度
  installed_at   DATE          NOT NULL,               -- 安装日期
  last_heartbeat DATETIME      NULL,                   -- 最近心跳，未上线过就是 NULL
  vendor_info    JSON          NULL,                   -- 厂商扩展信息
  UNIQUE KEY uk_pile_no (pile_no),
  CONSTRAINT chk_power  CHECK (power_kw > 0 AND power_kw <= 600),
  CONSTRAINT chk_status CHECK (status IN (1, 2, 3, 4))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2.1 数值：ID、功率、电价各不相同

- **`BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`（id）**：自增整数主键。BIGINT 上限约 9.2 x 10^18，一辈子用不完；`AUTO_INCREMENT` 让数据库发号；UNSIGNED 表示只存非负数，范围翻倍。为什么不用桩编号当主键？业务编码可能变（并网、换码），主键必须"永不改变、无业务含义"，见第 3.4 节。
- **`INT UNSIGNED`（station_id）**：站点数量撑死几万个，INT 够用。它此刻只是普通列，将来可以升级成外键（第 3.5 节）。
- **`DECIMAL(5,1)`（power_kw）**：功率带小数位，且是**参与计费与容量计算的关键数值**。`DECIMAL(5,1)` 表示总共 5 位、其中 1 位小数，最大 9999.9，精确无误。凡是要算钱的数字，永远 DECIMAL。
- **`TINYINT`（status）**：四个状态一个字节就够。为什么不用 `VARCHAR` 存 "free"/"busy"？字符串状态列无法约束取值范围（"Free"、"free"、"FREE" 会混进来），比较也要逐字符比。整数 + 业务层枚举（Java/Kotlin 的 enum、字典表）是主流做法；用 `CHECK` 再加一道闸（第 3.3 节）。

关于金额的教训值得单独一行：`FLOAT`/`DOUBLE` 是二进制浮点，`0.1` 存不精确，累加计费必然出错。**DECIMAL 是钱的唯一正确类型**，这条没有例外。

### 2.2 字符串：CHAR 与 VARCHAR 怎么选

- **`CHAR(12)`（pile_no）**：桩编号是定长编码（12 个字符，不够自动补空格），`CHAR` 定长存储、没有长度字节，值恒定时它是最佳选择。
- **`VARCHAR(n)`（如果有的话）**：变长字符串，n 是**字符数不是字节数**（utf8mb4 下一个汉字最多占 4 字节）。昵称、标题这类长度波动的用 VARCHAR。上限定成业务真实需要的值，`VARCHAR(255)` 不是默认答案。

长度选择的隐藏代价在索引：InnoDB 索引单列长度有限制（utf8mb4 下约 768 字符内才稳），`VARCHAR(1000)` 建索引要走前缀索引的弯路。**先想业务最长多少，再定 n**。

`TEXT` 家族（TEXT/MEDIUMTEXT/LONGTEXT）留给文章正文这类超长内容：它不能整列建普通索引、通常离行存储，能不用就不用。

### 2.3 日期时间：三种类型的分工

- **`DATE`（installed_at）**：只要日期不要时刻，用 DATE，别用 DATETIME 存完再在应用层截断。
- **`DATETIME`（last_heartbeat）**：存"年月日时分秒"，范围 1000 年到 9999 年，**存什么就是什么，不随时区变**。业务发生时间默认选它。
- **`TIMESTAMP`**：与 DATETIME 的本质区别是**存取都经过时区换算**（内部存 UTC），且范围只到 **2038-01-19**——这就是著名的 2038 问题。它有一个 DATETIME（老版本）没有的独门能力：

```sql
-- updated_at 列让数据库自动维护"最后修改时间"
ALTER TABLE charging_piles
  ADD COLUMN updated_at TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP;
```

选型口诀：**怕 2038、要跨时区统一就 DATETIME + 应用层管时区；要数据库自动盖"更新时间"戳，TIMESTAMP 值得冒险**（5.6.5 起 DATETIME 同样支持 DEFAULT/ON UPDATE CURRENT_TIMESTAMP，多数团队干脆全用 DATETIME + 显式列）。

### 2.4 JSON：给"说不清的结构"一个位置

厂商上报的扩展信息，A 厂带电池温度、B 厂带固件版本——结构天天变。这类"扩展字段"用 `JSON` 列收容，而不是为每个厂商加列。但记两条边界：JSON 内部字段**默认没有索引、没有约束**（要索引走生成列，见[JSON 类型与 JSON_TABLE](/mysql/810-JSONTypeJSONTable)）；核心业务字段（电价、状态）永远拆成普通列，别塞进 JSON。

## 3. 约束：一块独立的知识，去专篇学

上面建表语句里出现的 `NOT NULL`、`DEFAULT 1`、`UNIQUE KEY uk_pile_no`、`CHECK (power_kw > 0)` 与 `PRIMARY KEY` 都是**约束**——类型之后的第二道数据质检闸。它们是独立的一整块知识体系：六大约束的完整机制、列级与表级的声明分界、CHECK 在 8.0.16 前只解析不执行的版本坑（ERROR 3819）、外键 RESTRICT/CASCADE/SET NULL 三态级联实验（vocaloid 三公司场景），全部内容见专篇：

- [约束与完整性](/mysql/075-ConstraintsIntegrityEnforcement)：六大约束 + 联合唯一 + 外键三态实验 + 存量表补约束流程。

本篇只留与**类型选型**直接相关的两句：

- **NULL 的语义由约束表达**：`last_heartbeat DATETIME NULL` 是刻意设计——"从未上线"（NULL）与"1970-01-01 上线"（默认值）是两回事，NULL 表达未知、默认值表达已知，别互相冒充。
- **功率列没有写 `DECIMAL(5,1) UNSIGNED`**：8.0.17 起 DECIMAL/FLOAT/DOUBLE 的 UNSIGNED 已废弃，"非负"的正确表达是 `CHECK (power_kw > 0)`——写法演进本身也是类型知识的一部分。

## 4. 类型选择的通用原则

回到开头的三条原则，现在可以说得更具体：

1. **够用且最小的类型**：状态 TINYINT 而非 INT，日期 DATE 而非 DATETIME。小类型 = 少存储 = 更多行进内存页 = 索引更矮。
2. **语义优先于小巧**：金额必须 DECIMAL，别为省 3 字节用 FLOAT；别用 INT 存手机号（存不下 11 位？存得下 13800001111，但会丢前导 0、做不了格式校验——手机号是字符串）。
3. **能约束的绝不靠自觉**：NOT NULL / UNIQUE / CHECK 在数据库层兜底，应用层校验只是第二道防线。

字符集单独强调一句：新库一律 `utf8mb4`（`utf8` 是历史遗留的三字节假 UTF-8，存不了 emoji 和部分生僻字），排序规则用 `utf8mb4_0900_ai_ci`（8.0 默认）。原理与乱码案例在[字符集与排序规则](/mysql/170-CharsetCollation)专篇。

## 5. 坑点清单与自检

建完一张表，过一遍这六问：

1. **金额/计费列是 FLOAT 吗？** 换 DECIMAL。
2. **TIMESTAMP 的列活得到 2038 年之后吗？** 日志归档、出生日期类数据用 DATETIME。
3. **手机号、订单号用了 INT？** 它们是字符串（可能有前导 0、不做算术）。
4. **主键有业务含义吗？** 会变的字段不能当主键。
5. **状态列只有应用层在管取值？** 加 CHECK（8.0.16+ 真生效）。
6. **还在用三字节 utf8？** 换 utf8mb4，一次到位。

## 6. 练习

1. 给 charging_piles 增加"二维码令牌"列：值唯一、必填、长度 32 字符定长。写出 ALTER 语句并说明每处选择的理由（唯一与必填的约束写法见 [约束与完整性](/mysql/075-ConstraintsIntegrityEnforcement)）。
2. 为"站点表"补齐字段设计：站点名（最长 100 字符）、城市编码（定长 4）、开业日期、日均充电量（可能带小数，参与报表）。写出完整 CREATE TABLE。
3. （思考题）last_heartbeat 用"允许 NULL"和"默认 '1970-01-01'"两种设计，查询"从未上线过的桩"分别怎么写？哪种更不容易出错？
4. （延伸练习）造三条 INSERT 分别触发 1048、1062、3819 三种报错，并把 status = 5 的 UPDATE 跑一遍观察 CHECK 是否拦截——完整实验流程在 [约束与完整性](/mysql/075-ConstraintsIntegrityEnforcement) 的动手实践里。

## 下一步

- [约束与完整性](/mysql/075-ConstraintsIntegrityEnforcement)：六大约束的完整机制与外键三态实验——本篇约束桥接的展开。
- [SQL 数据定义与高级对象](/mysql/090-SQLDataDefinitionAdvanced)：ALTER/DROP、视图、索引的完整 DDL。
- [DML 数据操作语言](/mysql/100-DML)：往这张表里插改删，事务护身。
- [字符集与排序规则](/mysql/170-CharsetCollation)：utf8mb4 背后的完整体系。
- [聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)：为什么"主键要短"在物理层面成立。
