---
order: 30
title: SQL 零基础第一课
module: 'sql'
category: 数据库
difficulty: beginner
description: 从环境搭建到亲手建库建表、写入并查出第一行数据，完成一次完整的 SQL 初体验。
author: fanquanpp
updated: '2026-08-28'
related:
  - 'sql/004-DataQueryBasics'
  - 'sql/006-DML'
  - 'sql/007-DDL'
  - 'sql/008-SQLProjectMusicLibrary'
prerequisites:
  - 'sql/002-OverviewStandard'
---

## 0. 这一课要达成什么

学习目标：不背语法、先跑通全流程——装好数据库、连上去、建一个自己的库和表、
写入几行数据、再亲手查出来。走完这一课，你就具备了学习后续所有 SQL 内容的实操环境。

本课以"虚拟歌手曲库"作为贯穿主题（歌手、P主、歌曲三张表），
后续的查询课、实战课都会复用这套数据，让每一次学习都发生在同一个"熟悉的世界"里。

```
第一课（本课）      查询基础          多表查询          综合实战
环境+建表+首查  →  003-DataQueryBasics → 004-MultiTableQuery → 007-SQLProjectMusicLibrary
```

## 1. 搭建练习环境（三选一）

### 方案 A：本地安装（推荐长期学习）

以 MySQL 社区版为例（SQL 标准的主流实现，免费）：

- Windows：官网下载 MySQL Installer，选 Server + Client，安装时设置 root 密码。
- macOS：`brew install mysql` 后 `brew services start mysql`。
- Linux（Debian/Ubuntu）：`sudo apt install mysql-server` 后 `sudo systemctl start mysql`。

版本建议：选择 LTS 长期支持线（如 MySQL 8.4 LTS）；9.x 属于 Innovation 创新线，
尝鲜可以，学习与生产以 LTS 为准。

### 方案 B：Docker 一行命令（干净、可抛弃）

```bash
docker run -d --name mysql-lab -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=lab123456 mysql:8.4
# 进入容器内的命令行客户端
docker exec -it mysql-lab mysql -uroot -plab123456
```

### 方案 C：在线沙箱（零安装，今天就想敲第一条 SQL）

DB Fiddle、SQLize.online 等站点在浏览器里提供 MySQL / PostgreSQL 沙箱，
打开就能执行 SQL。适合快速验证语法，但建库、权限类操作受限。

> 无论哪种方案，本课示例都以 MySQL 语法为主线；涉及方言差异时会显式标注
> （例如 PostgreSQL 建库语法略有不同）。学习时以标准语法为骨架，部署时查对应数据库文档。

## 2. 连接与第一批命令

打开命令行客户端（或 GUI 工具如 DBeaver、DataGrip、Navicat），先敲三条命令感受一下：

```sql
-- 查看当前服务器上有哪些数据库
SHOW DATABASES;

-- 查看当前登录的用户与版本号（确认环境就绪）
SELECT CURRENT_USER(), VERSION();

-- 查看你现在"位于"哪个数据库里（刚连上时通常是 NULL）
SELECT DATABASE();
```

三条命令的共同点：以分号结尾。**SQL 语句以分号为界**，客户端看到分号才会发送执行。
回车换行不影响语句，一条长 SQL 分成多行写是完全正常的风格。

## 3. 建立练习库与曲库三表

### 3.1 建库

```sql
-- 建库三件套：幂等检测 + 字符集 + 排序规则
CREATE DATABASE IF NOT EXISTS music_lab
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 切换到练习库（之后的语句默认都作用在这里）
USE music_lab;

SELECT DATABASE();   -- 现在返回 music_lab
```

两个工程习惯现在就养成：

- `IF NOT EXISTS` 让建库语句可以放心重复执行（幂等性）。
- `utf8mb4` 才是完整的 UTF-8 编码，能存 emoji 与生僻字；MySQL 里的 `utf8` 是历史遗留的阉割版。

### 3.2 建三张表：P主、歌姬、歌曲

```sql
-- P主：创作歌曲的人
CREATE TABLE IF NOT EXISTS producer (
    producer_id   INT PRIMARY KEY AUTO_INCREMENT COMMENT 'P主ID',
    producer_name VARCHAR(50) NOT NULL COMMENT 'P主名',
    created_at    DATETIME DEFAULT (NOW()) COMMENT '录入时间'
) COMMENT = 'P主信息表';

-- 歌姬：演唱歌曲的虚拟歌手
CREATE TABLE IF NOT EXISTS vsinger (
    vsinger_id    INT PRIMARY KEY AUTO_INCREMENT COMMENT '歌姬ID',
    vsinger_name  VARCHAR(50) NOT NULL COMMENT '歌姬名',
    birthday      DATE DEFAULT NULL COMMENT '生日',
    theme_color   VARCHAR(7) DEFAULT NULL COMMENT '应援色(HEX)',
    company       VARCHAR(50) NOT NULL DEFAULT '待填' COMMENT '所属公司'
) COMMENT = '歌姬信息表';

-- 歌曲：由某位 P主 创作
CREATE TABLE IF NOT EXISTS song (
    song_id      INT PRIMARY KEY AUTO_INCREMENT COMMENT '歌曲ID',
    song_name    VARCHAR(100) NOT NULL COMMENT '歌曲名',
    producer_id  INT NOT NULL COMMENT '创作P主ID',
    created_at   DATETIME DEFAULT (NOW()) COMMENT '录入时间'
) COMMENT = '歌曲信息表';
```

读一遍建表语句，认识四个最基础的角色：

| 成分 | 例子 | 作用 |
| --- | --- | --- |
| 数据类型 | `INT` / `VARCHAR(50)` / `DATE` / `DATETIME` | 规定列能存什么 |
| 主键 | `PRIMARY KEY` | 一行的唯一身份证，唯一且非空 |
| 自增 | `AUTO_INCREMENT` | 不指定 ID 时自动从 1 递增 |
| 注释 | `COMMENT '...'` | 给半年后的自己看 |

### 3.3 检查表结构：DESC 与 SHOW CREATE TABLE

```sql
-- 快速查看列：名字、类型、是否可空、键、默认值
DESC producer;

-- 查看完整建表语句（含注释、引擎、字符集）
SHOW CREATE TABLE producer\G
```

两者的分工：日常确认结构用 `DESC`；排查细节、导出定义用 `SHOW CREATE TABLE`。
`SHOW TABLES;` 则列出当前库中的所有表，敲一下确认三张表都在。

## 4. 写入与查出第一批数据

### 4.1 INSERT：写入

```sql
-- 插入 P主（不自增列，只写名字）
INSERT INTO producer (producer_name) VALUES ('DECO*27'), ('ry0');

-- 插入歌姬
INSERT INTO vsinger (vsinger_name, birthday, theme_color, company)
VALUES ('初音未来', '2007-08-31', '#39C5BB', 'Crypton'),
       ('洛天依',   '2012-07-12', '#66CCFF', '上海禾念');

-- 插入歌曲：DECO*27 的《幽灵法则》
INSERT INTO song (song_name, producer_id)
VALUES ('幽灵法则', 1);   --producer_id=1 对应第一个插入的 P主
```

### 4.2 SELECT：第一条查询

```sql
-- 查出所有歌姬的名字与应援色
SELECT vsinger_name, theme_color FROM vsinger;

-- 带个最简单的条件：只看 Crypton 公司的歌姬
SELECT vsinger_name, birthday FROM vsinger WHERE company = 'Crypton';
```

看到自己写入的数据被查询返回——恭喜，DDL 与 DML 两大类语句你都跑通了。

### 4.3 UPDATE 与 DELETE：改和删（先看安全习惯）

```sql
-- 安全习惯：UPDATE/DELETE 之前，先用同样的 WHERE 跑一遍 SELECT
SELECT * FROM vsinger WHERE vsinger_name = '洛天依';

-- 确认只有预期的那一行，再执行修改
UPDATE vsinger SET company = 'Vsinger(禾念)' WHERE vsinger_name = '洛天依';

-- 删除数据必须带 WHERE，否则全表消失
DELETE FROM song WHERE song_name = '幽灵法则';
```

`WHERE` 是 UPDATE/DELETE 的保命符。**永远先 SELECT 验证、再执行写操作**，
这个习惯能避开 90% 的"手滑删库"事故。

## 5. 幂等写入：INSERT IGNORE 与存在性检查

重复执行同一段种子数据脚本时，普通 INSERT 会因主键/唯一键冲突报错。
两种幂等写法（本仓库后续课程反复使用）：

```sql
-- 方式一：冲突就跳过（MySQL 方言）
INSERT IGNORE INTO producer (producer_id, producer_name)
VALUES (1, 'DECO*27');

-- 方式二：不存在才插入（SELECT ... WHERE NOT EXISTS，跨库通用）
INSERT INTO producer (producer_name)
SELECT 'ry0'
WHERE NOT EXISTS (SELECT 1 FROM producer WHERE producer_name = 'ry0');
-- MySQL 8.0.19 之前需要补 FROM DUAL；PostgreSQL 直接支持无 FROM 的 WHERE
```

## 6. 新手常见报错速查

| 错误码 | 信息 | 原因 | 解法 |
| --- | --- | --- | --- |
| 1064 | You have an error in your SQL syntax | 语法拼错、缺分号、用了保留字 | 看报错指向的位置，逐词核对 |
| 1046 | No database selected | 没执行 `USE 库名` | 先 `USE music_lab` |
| 1146 | Table doesn't exist | 表名拼错或库不对 | `SHOW TABLES` 核对 |
| 1054 | Unknown column | 列名拼错 | `DESC 表名` 核对列名 |
| 1062 | Duplicate entry | 违反唯一约束（主键/UNIQUE） | 检查数据或改用幂等写法 |
| 1366 | Incorrect value | 数据类型不匹配 | 核对列类型与值的格式 |

## 7. 动手练习

1. 用 Docker 或本地安装搭好环境，并执行 `SELECT VERSION();` 记录你的数据库版本。
2. 重建 `music_lab` 库与三张表（体会 `IF NOT EXISTS` 的幂等：连跑两遍不报错）。
3. 再插入两位 P主 与两位歌姬，把"先 SELECT 后 UPDATE"的安全流程完整走一遍。
4. 故意制造一次 1062 错误（重复插入同一主键），观察报错信息，再用 `INSERT IGNORE` 修复。
5. 把三张表的建表语句用 `SHOW CREATE TABLE` 导出，保存成你自己的第一个 SQL 脚本文件。

## 8. 小结与下一课

- 一条 SQL = 定位（库/表）+ 动作（DDL/DML/DQL）+ 分号结尾。
- 幂等三件套：`IF NOT EXISTS`、`INSERT IGNORE`、存在性检查。
- 写操作安全流程：先 `SELECT` 验证 → 再 `UPDATE`/`DELETE` → 永远带 `WHERE`。
- 环境就绪、三张表就位，下一课 [数据查询基础](/sql/004-DataQueryBasics) 系统学习 SELECT；
  想检验综合能力时直接挑战 [SQL 综合实战：曲库数据库](/sql/008-SQLProjectMusicLibrary)。
