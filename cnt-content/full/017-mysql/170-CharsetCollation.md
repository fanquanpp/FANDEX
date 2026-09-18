---
order: 170
title: 字符集与排序规则：中文与 emoji 的头号坑
module: 'mysql'
category: 数据库
difficulty: beginner
description: MySQL 字符集体系一次讲透：utf8 与 utf8mb4 的历史坑、四级配置的继承规则、排序规则 ai_ci 后缀解读、乱码与索引失效两类经典事故。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/070-MySQLDataTypeConstraint'
  - 'mysql/210-IndexManagement'
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
prerequisites:
  - 'mysql/070-MySQLDataTypeConstraint'
---

## 问题引入：存个名字怎么就报错了

两个新手必撞的墙，根源都是字符集：

```text
事故一：INSERT 一条含 emoji 的昵称
  ERROR 1366: Incorrect string value: '\xF0\x9F\x98\x80'
  —— 列字符集是 utf8，存不进四字节的 emoji

事故二：同样数据换个环境查询，中文变问号或火星文
  —— 连接字符集与存储字符集不一致，数据在链路上被错误转码
```

要彻底理解这两类事故，需要先分清两个概念：

- **字符集（character set）**：字符如何编码成字节。`utf8mb4` 里"张"占 3 字节、"😀"占 4 字节；
- **排序规则（collation）**：字符如何比较与排序。`'a' = 'A'` 成立与否、`ORDER BY name` 按什么语言规则排，全由它决定。

## 第一课：MySQL 的 utf8 是假的

MySQL 的 `utf8` 历史上最多只支持 3 字节字符（本质是 UTF-8 的子集），而真正的 UTF-8 需要 1 到 4 字节。结果是：

| 字符集 | 字节上限 | 中文 | emoji | 结论 |
| --- | --- | --- | --- | --- |
| `utf8`（别名 utf8mb3） | 3 | 可以 | **存不了** | 历史遗留，8.0 已标记废弃 |
| `utf8mb4` | 4 | 可以 | 可以 | **一律用这个，没有例外** |

规范一句话：**新库新表全部显式声明 `utf8mb4`**。存量库的迁移用 `ALTER DATABASE ... CHARACTER SET utf8mb4` 加逐表 `ALTER TABLE ... CONVERT TO CHARACTER SET utf8mb4`，大表要在低峰期执行（它重建表）。

## 第二课：四级配置与继承链

字符集/排序规则在四个层级声明，**低层未声明时继承高层**：

```text
服务器默认 → 数据库 → 表 → 列
```

```sql
-- 服务器层（my.cnf，影响新建库的默认值）
[mysqld]
character_set_server = utf8mb4
collation_server = utf8mb4_0900_ai_ci

-- 库层
CREATE DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 表层（不写则继承库）
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(50)                                  -- 继承表
  -- 也可列级显式：name VARCHAR(50) CHARACTER SET utf8mb4
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

排查工具是一对 SHOW：

```sql
SHOW VARIABLES LIKE 'character_set%';   -- 服务器/连接/结果等当前值
SHOW VARIABLES LIKE 'collation%';
SHOW CREATE TABLE users\G               -- 看某张表实际生效的声明（最准）
```

**事故二的根源在"连接层"**：客户端告诉服务器"我用 gbk 发语句"，服务器却按 utf8mb4 理解——数据从入口就转错了码。JDBC 连接串（`characterEncoding=utf8mb4` 或 8.0 驱动的 `connectionCollation`）、`SET NAMES utf8mb4`、`character_set_client/connection/results` 三变量一致性，是乱码排查的标准三查。

## 第三课：读懂排序规则的名字

`utf8mb4_0900_ai_ci` 这串密码逐段拆解：

```text
utf8mb4          字符集
0900             Unicode 9.0.0 排序标准（8.0 默认）
a i              口音不敏感（accent insensitive）+ 大小写不敏感？
ci               case insensitive —— 'A' = 'a' 成立
```

决策表：

| 排序规则 | 大小写 | 典型用途 |
| --- | --- | --- |
| `utf8mb4_0900_ai_ci` | 不敏感 | 8.0 默认，通用业务（用户搜索不区分大小写） |
| `utf8mb4_0900_as_cs` | 整体敏感 | 密码哈希前的校验列、代码/标识符 |
| `utf8mb4_bin` | 二进制精确 | 十六进制串、需要字节级相等的场景 |

**排序规则影响两个东西**：比较结果（`WHERE name = 'tom'` 能否命中 `Tom`）与排序顺序（中文排序想按拼音要用 `utf8mb4_zh_0900_as_cs` 或 gbk 系规则）。选错排序规则的表现是"搜索结果不符合预期"，而不是报错——所以建表时想清楚，比事后 ALTER 便宜得多。

## 第四课：字符集与索引的隐形联动

两个必须知道的联动关系：

1. **列长度按字节还是字符**：`VARCHAR(50)` 的 50 是**字符数**，utf8mb4 下占最多 200 字节的索引空间——索引长度上限（3072 字节）按字节数算，长 VARCHAR 联合索引要精打细算（见[联合索引](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)）；
2. **比较两边排序规则不同时索引失效**：`WHERE name = 名字变量` 若变量来自不同 collation 的连接/表，MySQL 会对列做隐式转换再比较——`EXPLAIN` 里索引悄悄消失。跨库/跨表 JOIN 时两边 collation 不一致是慢查询的隐形元凶，统一 collation 是治本。

## 动手环节：制造并修复一次"emoji 崩溃"

```sql
-- 1. 复现事故一：utf8 存 emoji
CREATE TABLE cs_demo_legacy (name VARCHAR(50)) CHARACTER SET utf8;
-- 8.0 里 utf8 即 utf8mb3
INSERT INTO cs_demo_legacy VALUES ('张三😀');
-- ERROR 1366: Incorrect string value ... （复现！）

-- 2. 正确姿势：utf8mb4
CREATE TABLE cs_demo (
  name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
) ENGINE=InnoDB;
INSERT INTO cs_demo VALUES ('张三😀');
SELECT name, LENGTH(name) AS bytes, CHAR_LENGTH(name) AS chars FROM cs_demo;
-- LENGTH=7（张三 6 字节 + emoji 4 字节…此处为 10）注意区分字节与字符两个函数

-- 3. 大小写不敏感验证
SELECT 'ABC' = 'abc' COLLATE utf8mb4_0900_ai_ci AS eq_ai_ci;   -- 1
SELECT 'ABC' = 'abc' COLLATE utf8mb4_bin          AS eq_bin;   -- 0

-- 4. 索引失效现场：两表 collation 不同再 JOIN
CREATE TABLE t1 (name VARCHAR(20) COLLATE utf8mb4_0900_ai_ci,
  KEY idx_name (name));
CREATE TABLE t2 (name VARCHAR(20) COLLATE utf8mb4_bin);
INSERT INTO t1 VALUES ('tom');
INSERT INTO t2 VALUES ('tom');
EXPLAIN SELECT * FROM t1 JOIN t2 USING (name);
-- t1 的 idx_name 消失（隐式转换），换成建表时对齐 collation 即恢复
```

## 常见困惑

**"建库不写字符集行不行？"**——继承服务器默认。风险在于：从老服务器迁移到新服务器（或云厂商默认值不同）时，继承链顶端变了，新表字符集悄悄改变。**显式声明是跨环境一致性的保险**，一行配置换确定性，永远值得。

**"存量数据已经是 utf8 且存坏了（问号）怎么办？"**——问号说明数据在写入时就被替换，原始信息已丢，任何转换都救不回来（这决定了排查乱码要先分清"存储损坏"还是"显示损坏"）。若数据本身完好只是列字符集声明错误，用 `CONVERT TO CHARACTER SET` 或 binary 中转法修复。

**"8.4 还需要关心 utf8mb3 吗？"**——8.0 起 `utf8` 别名指向 utf8mb3 且被标记废弃，8.4 继续收紧，未来版本 `utf8` 将直接等于 utf8mb4。见到老库用 utf8 别名按 utf8mb3 理解的迁移，一律改写为显式 utf8mb4。

## 检验清单

- 能向别人解释"MySQL 的 utf8 是三字节假 UTF-8"与"一律 utf8mb4"的铁律；
- 能画出四级继承链，并用三个 SHOW 定位任意层的实际生效值；
- 能拆解 `utf8mb4_0900_ai_ci` 的每一段含义，并按场景选 ai_ci/as_cs/bin；
- 亲历过 emoji 报错、字节字符函数区别、collation 不一致索引失效三个现场；
- 乱码排查会先分清"存储损坏"与"显示损坏"。

## 下一步

字符集是"数据长什么样"的地基，索引是"数据怎么找"的地基：带着本篇的字节/字符意识，进入 [索引管理](/mysql/210-IndexManagement) 与 [联合索引设计](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)。
