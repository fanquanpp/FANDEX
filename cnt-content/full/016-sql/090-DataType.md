---
order: 100
title: 数据类型选型
module: 'sql'
category: 数据库
difficulty: intermediate
description: 从逻辑设计到物理实现：金额用 DECIMAL、中文用 utf8mb4 与 CHAR_LENGTH、CHAR vs VARCHAR、日期四类型——每个字段的类型决策课
author: fanquanpp
updated: '2026-10-05'
related:
  - 'sql/100-Constraint'
  - 'sql/110-DDL'
  - 'sql/065-BuiltInFunctions'
prerequisites:
  - 'sql/020-OverviewStandard'
---

## 知识点地图

- **知识类别**：SQL DDL / 数据类型选型（类型清单可查任何手册，本篇教"怎么选"）。
- **解决什么问题**：建表时每个字段都要回答"什么类型、多长"。选错的账单是延迟到三个月后收的：金额对不上（FLOAT）、手机号丢了前导零（INT）、中文长度校验全错（LENGTH）。
- **什么时候用到**：新表设计（从逻辑设计到物理实现的落地环节）、老表体检、跨库迁移的类型映射。
- **练习素材**：商品管理系统"任务单 1"的十张表结构（部门/岗位/员工/商品/客户/供应商/销售）——课堂任务就是给字段填类型，本篇把这套判断标准讲全。

## 心智模型：选型四问

给每个字段过一遍：

```text
1. 它参与算术吗？      参与 → 数值族；金额/费率必须 DECIMAL
2. 它有固定长度吗？    定长（国家码、性别）→ CHAR；变长 → VARCHAR
3. 它参与比较排序吗？  日期时间别存字符串，用原生类型
4. 最小够用是什么？    值域确定就用小类型（SMALLINT/TINYINT）
```

原则一句话：**精确优先、够用最小、原生优先于字符串**。

## 决策一：金额与精度——DECIMAL vs FLOAT

```sql
-- 错误示范：FLOAT 存金额
CREATE TABLE bad_pay (amount FLOAT);
INSERT INTO bad_pay VALUES (0.1);
SELECT SUM(amount) FROM bad_pay;   -- 多加几行 0.1 后：0.3000000094（二进制表示误差）

-- 正确：DECIMAL 定点数
CREATE TABLE sales_info (
    sale_id    INT AUTO_INCREMENT PRIMARY KEY,
    unit_price DECIMAL(10,2) NOT NULL,     -- 总位数 10，小数 2 位：最大 99999999.99
    quantity   INT NOT NULL,
    total      DECIMAL(12,2) GENERATED ALWAYS AS (unit_price * quantity) STORED
);
```

为什么 FLOAT 会出错：FLOAT/DOUBLE 是二进制浮点，0.1 在二进制里是无限循环小数，存进去的就是近似值；DECIMAL 是十进制定点数，`DECIMAL(10,2)` 精确到分。判型口诀：**钱的字段一律 DECIMAL**；科学计算、传感器采样（允许误差）才用 DOUBLE；百分比/权重这类中间量也建议 DECIMAL，免得汇总会漂。

位数设计：`DECIMAL(总位, 小数位)`。金额按"最大值会到多少"倒推——单价 8 位整数 + 2 位小数够绝大多数商品；汇总金额给 12-14 位留余量。

## 决策二：中文与长度——utf8mb4 与两个 LENGTH

```sql
-- 建库建表显式 utf8mb4（MySQL 的"utf8"实为 3 字节 utf8mb3）
CREATE DATABASE CommInfo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 两个长度函数的口径差
SELECT LENGTH('洛天依'), CHAR_LENGTH('洛天依');
-- utf8mb4 下：9 与 3（每个汉字 3 字节）

-- VARCHAR 定义的是"字符数"上限
ALTER TABLE vsinger ADD COLUMN nickname VARCHAR(20);   -- 最多 20 个字，中文英文一视同仁
```

三连坑：

1. **建库用 utf8 而不是 utf8mb4**：用户昵称里一个生僻字或 emoji 直接写入报错或被截断——事故修复要 `ALTER DATABASE ... CONVERT TO CHARACTER SET utf8mb4`，大表上这是停机操作；
2. **长度校验用 LENGTH**：`WHERE LENGTH(name) <= 2` 想找"两字名"，实际找的是"6 字节以内"——中文场景校验口径一律 `CHAR_LENGTH`（见[内置函数](/sql/065-BuiltInFunctions)）；
3. **VARCHAR(255) 迷信**：255 来自"1 字节长度前缀"的历史优化，现代存储引擎无所谓。长度按业务真实上限给（手机号 11、身份证 18、姓名 50），过长的 VARCHAR 在复合索引与内存排序里全是浪费。

## 决策三：CHAR vs VARCHAR

| | CHAR(N) | VARCHAR(N) |
| --- | --- | --- |
| 存储 | 定长 N（不足补空格） | 实际长度 + 1-2 字节前缀 |
| 适合 | 国家码 CHAR(2)、性别 CHAR(1)、哈希值 CHAR(32/64) | 姓名、地址、邮箱等一切变长 |
| 尾随空格 | 取出时可能被裁（方言差异） | 原样保留 |

判定：**99% 的场景是 VARCHAR**。CHAR 只在"长度恒定 + 频繁等值比较"时赚一点（无长度前缀、比较快）。商品管理系统的真实笔误案例：`Employees_sex char(2)`——用 CHAR 存性别没问题，但要注意插入 `'男'` 时 2 字节的定长存储对 utf8mb4 中文是"1 字符"，定义与心智模型容易错位，这类字段用 `CHAR(1)` + CHECK 或 ENUM 更诚实。

## 决策四：整数与小整数

```text
TINYINT   1 字节   -128~127        状态、开关（0/1 用 TINYINT(1)）
SMALLINT  2 字节   -3.2万~3.2万    年份、数量上限几百几千
MEDIUMINT 3 字节   838万
INT       4 字节   21亿            用户量、订单量
BIGINT    8 字节   极大            雪花 ID、流水号
```

选型即任务单 1 的答案：部门数量 SMALLINT 足够、销售数量 INT、单据号 BIGINT。两个注意：

- **无符号**（MySQL `INT UNSIGNED`）能翻倍正数上限，但跨库迁移要留意 PG 没有 unsigned，统一用有符号 + 约束更可移植；
- **手机号/身份证永远不是整数**：前导零会丢（0137...），位数会溢出（BIGINT 也存不下 18 位身份证的校验位 X），它们是**字符串** `CHAR(11)`/`CHAR(18)` + 正则 CHECK（商品管理系统给出了 `REGEXP '^[0-9]{17}[0-9X]$'` 的标准写法）。

## 决策五：日期时间四类型

| 类型 | 格式 | 范围/特点 | 用途 |
| --- | --- | --- | --- |
| DATE | 2026-10-07 | 只有日期 | 生日、入职日 |
| TIME | 14:30:00 | 只有时间 | 营业时段 |
| DATETIME | 日期+时间 | 1000-9999 年，**无时区** | 本地业务时间 |
| TIMESTAMP | 日期+时间 | 1970-2038（MySQL），**随会话时区转换** | 全球化记录的 created_at |

判定口诀：**只有"某天"用 DATE；要精确到秒且跨时区口径的用 TIMESTAMP（PG 用 timestamptz）；MySQL 的 TIMESTAMP 有 2038 上限与隐式时区转换，纯国内系统存 DATETIME + 应用层统一 UTC 是更简单的心智**。商品管理系统的 `Hiredate datetime default now()` 是标准写法；`ON UPDATE CURRENT_TIMESTAMP` 让 updated_at 自动刷新——但"自动更新"藏在表结构里，评审时容易漏看，团队约定优于魔法。

## 决策六：别用字符串存结构化数据

```sql
-- 反模式：逗号拼接多值（违反 1NF，见关系设计篇）
CREATE TABLE bad_emp (skills VARCHAR(200));   -- 'Java,Python,Go'

-- 正确 A：关联表（要按技能筛选/统计）
CREATE TABLE employee_skill (emp_id INT, skill VARCHAR(30),
  PRIMARY KEY (emp_id, skill));

-- 正确 B：JSON 类型（整体读写、不按值查询时）
ALTER TABLE vsinger ADD COLUMN profile JSON;
```

JSON 适合"整存整取的半结构化附件"；一旦出现 `WHERE JSON_EXTRACT(...)` 的高频查询，说明它该是列或关联表（完整对比见 [SQL JSON](/sql/300-SqlJson)）。

## 从任务单到 DDL：一张表的全流程演示

拿任务单 1 的"员工表"走一遍四问：

```sql
CREATE TABLE Employees_info (
    Employees_id   CHAR(8)      PRIMARY KEY,              -- 编号：定长字符串
    Employees_name VARCHAR(20)  NOT NULL,                 -- 姓名：变长
    Employees_sex  CHAR(1)      NOT NULL DEFAULT '男'
                   CHECK (Employees_sex IN ('男','女')),   -- 枚举：CHAR+CHECK
    Identity_id    CHAR(18)     NOT NULL
                   CHECK (Identity_id REGEXP '^[0-9]{17}[0-9X]$'),  -- 身份证：字符串+正则
    Telephone      CHAR(11)     NULL,                     -- 手机号：字符串护前导零
    Salary         DECIMAL(10,2) CHECK (Salary > 0),     -- 工资：DECIMAL
    Post_id        CHAR(6)      NULL,
    Hiredate       DATETIME     DEFAULT NOW(),            -- 入职：原生日期类型
    FOREIGN KEY (Post_id) REFERENCES Post_info(Post_id)
);
```

每个字段都是一个"为什么"：字符串护住前导零与校验位、DECIMAL 护住工资精度、CHECK 把非法性别与身份证拦在写入时、DATETIME 拒绝"用 VARCHAR 存日期"的偷懒。这张表跑通后，回头看任务单上剩下九张表，不过是同样四问的重复。

## 常见困惑

**"VARCHAR(50) 超长写入会怎样？"**——严格模式（MySQL 8.0 默认）报错截断拒绝；宽松模式静默截断+警告。生产环境确认 `sql_mode` 含 STRICT_TRANS_TABLES，宁可报错也别静默丢数据。

**"TEXT 和 VARCHAR 什么区别？"**——TEXT 存在行外、不能设默认值、索引要前缀长度；能定长度的用 VARCHAR（上限 16383 字符在多数行格式内联存储），真的大文本（文章正文）才 TEXT。

**"类型可以随便改吗？"**——不能。改类型见[表结构变更](/sql/110-DDL)的锁级别分级：改 VARCHAR 长度加宽通常快，收窄与跨族改（INT→VARCHAR）要重建，大表走在线变更工具。

## 动手实践：给曲库表体检

任务：

1. 检查 vsinger/music 表的类型清单，找出三个"过大"或"字符串存数值"的嫌疑字段并给改型方案；
2. 写一个实验证明 FLOAT 金额的累计误差（循环插入 0.1 共 1000 次，对比 DECIMAL）；
3. 用 CHAR_LENGTH 给 nickname 做长度校验列，再用 LENGTH 跑一遍对比结果；
4. 给 music 表加 release_date 字段：先判断 DATE 与 DATETIME 哪个对，写出 DDL 并说明理由。

<details>
<summary>参考实现（先自己写再展开）</summary>

```sql
-- 1（示例判断：若某表用 INT 存电话/用 VARCHAR 存日期即为嫌疑）
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE();

-- 2
CREATE TYPE CHECK 对照：
CREATE TABLE float_vs_dec (
  f FLOAT NULL, d DECIMAL(10,2) NULL
);
INSERT INTO float_vs_dec SELECT 0.1, 0.1 FROM information_schema.columns LIMIT 1000;
SELECT SUM(f), SUM(d) FROM float_vs_dec;
-- SUM(f) ≈ 100.000014 左右；SUM(d) = 100.00 —— 误差肉眼可见

-- 3
SELECT name, LENGTH(name) AS bytes, CHAR_LENGTH(name) AS chars FROM vsinger;
-- 中文歌姬：bytes 是 chars 的 3 倍

-- 4：发行日期只到天，DATE 足够；若要精确到发行时刻才 DATETIME
ALTER TABLE music ADD COLUMN release_date DATE NULL;
```

判读要点：任务 2 的误差量级随行数线性放大，千行 0.1 累计已经偏 1.4e-5，账务系统千万行就是肉眼可见的分账差异——这就是"金额禁用 FLOAT"的实验证据。
</details>

## 检验清单

- 能背出选型四问并为任意字段走一遍流程；
- 能解释 FLOAT 存 0.1 出错的二进制原因，并默写 DECIMAL(p,s) 的含义；
- 知道 MySQL "utf8" 是 utf8mb3、emoji 需要 utf8mb4，以及 LENGTH 与 CHAR_LENGTH 的口径；
- 能为手机号/身份证/金额/年份各说出正确类型与理由；
- 能对比 DATETIME 与 TIMESTAMP 的时区行为并做出选择；
- 能识别"逗号拼接多值"反模式并给出两种正规替代。

## 下一步

- [约束](/sql/100-Constraint)：类型选完，用约束把业务规则钉死；
- [表结构变更](/sql/110-DDL)：类型选错之后的修正流程与锁代价；
- [内置函数](/sql/065-BuiltInFunctions)：CHAR_LENGTH 等函数的正确打开方式。

## 参考与致谢

- MySQL 8.0 官方文档 Chapter 11 Data Types（GPLv2 文档许可）：<https://dev.mysql.com/doc/refman/8.0/en/data-types.html>
- PostgreSQL 官方文档 Chapter 8 Data Types（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/datatype.html>
- 类型选型决策与案例取自仓库扫描素材（商品管理系统任务单 1、vocaloid 笔记）并重写。
