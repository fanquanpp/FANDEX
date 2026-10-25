---
order: 120
title: 批量导入导出：LOAD DATA INFILE 与 INTO OUTFILE
module: 'mysql'
category: 数据库
difficulty: beginner
description: 服务器侧批量数据搬运——LOAD DATA INFILE 的字段/行分隔与字符集参数、SELECT INTO OUTFILE 导出、secure_file_priv 三种取值的限制、mysqlimport 命令行包装、大文件与乱码排障；运营日批 CSV 灌订单表、vocaloid 四表造数改造、导出报表给下游三个工程场景，附遮代码自检练习。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：MySQL 的「批量导入导出」——`LOAD DATA INFILE`（文件灌表）、`SELECT ... INTO OUTFILE`（表落文件）、`mysqlimport`（LOAD DATA 的命令行包装）。它与 `INSERT` 批量写是两个类别：INSERT 走 SQL 层逐行解析，LOAD DATA 是服务端直读文件的专用快速通道，速度差一个数量级。
- **解决什么问题**：运营每天一份几十万行的 CSV 要灌进订单表（逐行 INSERT 要跑半小时，LOAD DATA 秒级）；下游系统要一份带分隔符的数据文件而不是 JSON 接口；初始化测试库要灌造数数据（vocaloid 学习项目的四表 INSERT 改造成文件导入后，重跑速度从分钟级降到秒级）。
- **什么时候用到**：日批/小时批的数据文件入库、表数据交换给外部系统、测试环境快速造数、mysqldump 之外的自定义格式导出。应用层逐行/批量 INSERT 的取舍见 [DML 数据操作语言](/mysql/100-DML)；恢复备份的 SQL 文件走 `mysql < dump.sql`（见 [逻辑备份](/mysql/560-LogicalBackup)）——那是「执行语句」，本篇是「直接搬数据」。

## LOAD DATA INFILE：六段式语法

先给完整语法骨架，每个参数都对应一类真实翻车：

```sql
LOAD DATA INFILE '/var/lib/mysql-files/orders_20261007.csv'
INTO TABLE orders
CHARACTER SET utf8mb4                  -- 参数一：文件编码
FIELDS TERMINATED BY ','               -- 参数二：字段分隔符
OPTIONALLY ENCLOSED BY '"'             -- 参数三：字段包裹符（文本列带引号时必需）
ESCAPED BY '\\'                        -- 参数四：转义符
LINES TERMINATED BY '\n'               -- 参数五：行分隔符（Windows 文件是 '\r\n'）
IGNORE 1 LINES                         -- 参数六：跳过表头
(order_no, user_id, amount, created_at);  -- 列映射：文件列序 -> 表列
```

逐参数讲清「为什么要有它」与「少了会发生什么」：

- **CHARACTER SET utf8mb4**：声明文件字节流的编码。省略时用库/连接的默认字符集——GBK 的运营导出文件按 utf8mb4 解读，中文全成乱码入库（数据坏了还不报错，是最危险的静默失败）。文件编码先 `file -i xx.csv` 或用编辑器确认，再写进语句。
- **FIELDS TERMINATED BY ','**：字段分隔符。CSV 固是逗号，但 TSV（`\t`）、竖线（`|`）也常见——下游给的格式以实际字节为准，别假设。
- **OPTIONALLY ENCLOSED BY '"'**：字段包裹符。关键在「文本列内容里本身含逗号」的场景：`"张三, Jr.",30,2026-10-07`——没有 ENCLOSED 声明，`张三` 与 ` Jr.` 会被劈成两列，后续列全部错位。`OPTIONALLY` 表示「有引号就剥掉、没有就当普通字符」，兼容混合格式。
- **ESCAPED BY '\\'**：转义符处理 `\n`、`\t` 等序列；字段内容本身含反斜杠时（Windows 路径）会翻车，常见解法是导出端改 `ENCLOSED BY` 引号策略或导入端 `ESCAPED BY ''` 关掉转义。
- **LINES TERMINATED BY '\n'**：行分隔符。**Windows 导出的文件是 `\r\n`**——按 `\n` 切行后每行末尾残留 `\r`，最后一列（常是日期或金额）带着看不见的 `\r` 入库，查询永远匹配不上。这是 LOAD DATA 排障榜第一名，报错形式往往是「最后一列插入警告 1265 数据截断」或「日期值错误」。
- **IGNORE 1 LINES**：跳过表头。带表头的 CSV 忘写它，表头行当数据插入——数值列插入失败报警告、文本列多出一行 "order_no"，导完才发现。
- **列映射 (order_no, user_id, ...)**：文件列与表列的对应。文件列序与表列序不一致、或表里有自增 id/默认值列时必须显式映射；映射里还能放表达式做清洗（见下文）。

### secure_file_priv：文件必须待在指定目录

LOAD DATA INFILE 读的是 **mysqld 服务端所在机器**的文件（不是客户端机器），且受系统变量 `secure_file_priv` 管控——这是安全阀，防止数据库读任意路径：

```sql
SHOW VARIABLES LIKE 'secure_file_priv';
-- 三种取值与行为：
-- /var/lib/mysql-files/   只允许读写这个目录（生产默认）：文件放这里才能导入
-- NULL                    完全禁用文件导入导出（最严格的托管环境）
-- (空)                     不限制（老版本默认，不安全，新版本已收紧）
```

三种翻车与处置：取值为目录而文件放在 `/tmp` → `ERROR 1290 (HY000): The MySQL server is running with the --secure-file-priv option so it cannot execute this statement`——把文件挪进允许目录即可；值为 NULL → 该环境与文件导入绝缘，改走客户端侧方案（见下文 mysqlimport 与客户端技巧）；目录权限问题 → 文件放对目录了但 mysqld 进程用户读不了，`chmod 644` 或改属主。**文件在客户端机器上**这个误解也很常见：本地开发时客户端与服务端同机一切正常，连上远程库就报 1290/找不到文件——服务端根本没有你本地的文件。

### 导出：SELECT INTO OUTFILE

```sql
SELECT order_no, user_id, amount, created_at
FROM orders
WHERE created_at >= '2026-10-01'
INTO OUTFILE '/var/lib/mysql-files/orders_export.csv'
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

逐段讲边界：参数与 LOAD DATA 完全对称（同一对格式声明保证往返一致）；`secure_file_priv` 同样管制导出路径；**目标文件已存在直接报错**（File exists）——它永不覆盖，先 `rm` 旧文件再导；导出的是**纯数据文件**（无表头无建表语句），要表头用 `UNION ALL` 拼一行文本列，要建表语句用 mysqldump（见 [逻辑备份](/mysql/560-LogicalBackup)）。NULL 的导出形态是 `\N`（转义序列），Excel 打开会看到一个字面 `\N`——面向人的报表导出前先 `IFNULL(col, '')` 翻译。

### 例子一（真实工程）：运营日批 CSV 灌订单表

订单中台的日常：每早 6 点收到前一天的订单 CSV（约 80 万行，UTF-8、逗号分隔、带表头、金额两位小数），要求 6:30 前入库。完整作业脚本：

```sql
-- 第 0 步：预检——文件编码、行分隔、secure_file_priv 目录
-- file -i /var/lib/mysql-files/orders_20261007.csv   # 确认 utf-8
-- SHOW VARIABLES LIKE 'secure_file_priv';

-- 第 1 步：清当日分区/重跑幂等（业务键去重）
DELETE FROM orders WHERE biz_date = '2026-10-07';

-- 第 2 步：灌入（禁用外键检查提速，导完必开回）
SET FOREIGN_KEY_CHECKS = 0;
LOAD DATA INFILE '/var/lib/mysql-files/orders_20261007.csv'
INTO TABLE orders
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@order_no, @user_id, @amount, @created_at)          -- 先收进用户变量
SET order_no   = TRIM(@order_no),
    user_id    = @user_id,
    amount     = ROUND(@amount, 2),
    biz_date   = @created_at,
    created_at = @created_at;
-- Query OK, 812345 rows affected (9.8 sec) —— 秒级
SET FOREIGN_KEY_CHECKS = 1;

-- 第 3 步：验收——行数对账 + 抽样
SELECT COUNT(*) FROM orders WHERE biz_date = '2026-10-07';  -- 与文件行数 - 1 对账
SHOW WARNINGS;                                               -- 截断/转换警告清零
```

逐段解释作业设计：列映射用 `@变量` 中转后经 `SET` 清洗——TRIM 去空格、ROUND 统一金额精度、文件列复制到两个表列（biz_date 冗余存日期便于分区），这是 LOAD DATA 的「边导边加工」能力，省掉先入临时表再 UPDATE 的一整步。`SET FOREIGN_KEY_CHECKS = 0` 跳过逐行外键校验（批量提速的常规手段），**必须配对开关**——忘了 SET 回 1，本次会话后续所有操作都失去外键保护；LOAD DATA 本身没有事务回滚到文件中间的能力（它按批提交），失败重跑靠第 1 步的幂等 DELETE 兜底。验收三件（行数对账、SHOW WARNINGS 清零、抽样比对）是日批的固定收尾——静默截断只有 warnings 能暴露。

### 例子二（真实工程）：vocaloid 四表造数改造

vocaloid 学习项目的造数脚本原来是 141 行的多值 INSERT（三表模型 + 歌姬表），每次重置练习库要跑近一分钟。改造成文件导入后重置秒级完成：

```sql
-- 原来（节选，141 行同构）：
-- INSERT INTO singers (id, name, company, birthday) VALUES
-- (1, '洛天依', '上海禾念', '2012-07-12'),
-- (2, '初音未来', 'Crypton', '2007-08-31'),
-- ... 12 位歌姬

-- 改造第 1 步：把数据抽成 TSV 文件（制表符分隔，规避文本内逗号问题）
-- singers.tsv（放 secure_file_priv 目录）：
-- 1	洛天依	上海禾念	2012-07-12
-- 2	初音未来	Crypton	2007-08-31
-- ...

-- 改造第 2 步：造数脚本换成 LOAD DATA
TRUNCATE TABLE singers;
LOAD DATA INFILE '/var/lib/mysql-files/singers.tsv'
INTO TABLE singers
CHARACTER SET utf8mb4
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
(id, name, company, birthday);
```

逐段解释改造的收益与代价：TRUNCATE（重建表，快）+ LOAD DATA 的重置流程把 141 行 INSERT 的解析开销压缩为纯数据搬运；TSV 选制表符是因为歌姬名与公司名不含 `\t`，可以不用 ENCLOSED。代价两条：数据文件要**提前生成**并放进服务端目录（学习机上就是 MySQL 数据目录旁的 mysql-files），脚本从「自包含」变成「依赖外部文件」；`DROP DATABASE + 重跑` 的练习流程变成了 `TRUNCATE + LOAD DATA`——四个表各一行 LOAD DATA 换掉 141 行 INSERT。这个改造模式同样适用于测试环境初始化与 CI 的种子数据注入。

### 例子三（真实工程）：导出报表给下游系统

数仓同事每月要一份「各站点充电量」的分隔符文件，喂给他们的 Spark 作业（要求 UTF-8、竖线分隔、无引号、NULL 为空字段）：

```sql
SELECT
  station_id,
  station_name,
  DATE_FORMAT(stat_date, '%Y-%m-%d') AS stat_day,
  IFNULL(SUM(kwh), 0) AS total_kwh,
  IFNULL(SUM(amount), 0) AS total_amount
FROM daily_station_stats
WHERE stat_date BETWEEN '2026-09-01' AND '2026-09-30'
GROUP BY station_id, station_name, stat_date
INTO OUTFILE '/var/lib/mysql-files/station_stats_202609.txt'
CHARACTER SET utf8mb4
FIELDS TERMINATED BY '|'                 -- 下游要求竖线
LINES TERMINATED BY '\n';
```

逐段解释对接思维：分隔符、编码、NULL 形态都是**下游契约**——先要格式约定文档再写导出，不要按自己的习惯导完再扯皮；`IFNULL(..., 0)` 在导出前把 NULL 翻译掉（下游 Spark 对 `\N` 的处理要额外配置）；`DATE_FORMAT` 固定日期形态避免 ISO 带T的默认输出。导完用 `wc -l` 对行数、`head -3` 抽查前几行，再交出去——「导出文件」和「导出正确的文件」差的就是这三步。

## mysqlimport 与客户端侧替代

### mysqlimport：LOAD DATA 的命令行形态

```bash
# mysqlimport 把「文件名当表名」：orders.tsv 导入 orders 表
mysqlimport --local green \
  --fields-terminated-by=, --fields-optionally-enclosed-by='"' \
  --lines-terminated-by='\n' --ignore-lines=1 \
  --user=etl -p /var/lib/mysql-files/orders_20261007.csv
```

要点：文件名（去扩展名）就是目标表名——`orders_20261007.csv` 会找 `orders_20261007` 表，**要导入 orders 表就得把文件命名成 orders.csv 或改名**；`--local` 开关是关键分水岭：加上它走 `LOAD DATA LOCAL INFILE`，文件从**客户端机器**读取、经连接传给服务端——绕开了 secure_file_priv 的服务端目录限制（文件在你本机也行），但要求服务端开启 `local_infile=ON` 且客户端驱动支持；不加 `--local` 则等价于服务端语法，文件必须在服务端允许目录。安全注意：`LOCAL` 版本历史上有过恶意服务器读取客户端文件的漏洞（CVE-2017-3302 等），只在受信网络对受信服务端使用，新驱动默认禁用 LOCAL 是有原因的。

### secure_file_priv 为 NULL 时的客户端侧替代

托管数据库（云 RDS 常禁文件导入）上，同样的搬运走客户端管道：`mysql -e "SELECT ..." > file` 导出、或应用层用驱动批量绑定导入。速度不及服务端 LOAD DATA，但不受服务端文件系统限制——「数据搬运路径」的完整工具箱见 [逻辑备份](/mysql/560-LogicalBackup)（mysqldump 家族）与 [MySQL Shell 工具链](/mysql/925-MySQLShellToolkit)（util.dumpInstance/loadDump 的并行版本）。

## 大文件与乱码排障清单

按出现频率排序：

1. **`\r\n` 残留**：Windows 文件按 `\n` 导入，末列带 `\r`——重新导入声明 `LINES TERMINATED BY '\r\n'`，或导入前 `dos2unix`；
2. **中文乱码**：文件编码与 CHARACTER SET 不符——`file -i` 确认文件真实编码，GBK 文件写 `CHARACTER SET gbk`（服务端会自动转到表的 utf8mb4）；
3. **1290 secure_file_priv**：文件不在允许目录——`SHOW VARIABLES LIKE 'secure_file_priv'` 后挪文件，或改走 `--local`；
4. **列数不匹配**（ERROR 1261/1262）：文件实际列数与表列数/映射不符——多半是 ENCLOSED 没声明、内容含分隔符被劈开，用 `head` 检查原始行；
5. **警告 1265 数据截断**：某列装不下或格式不对——`SHOW WARNINGS` 定位列与行号，抽查源文件该位置；
6. **导入慢如 INSERT**：表上海量索引与外键逐行校验——批量场景临时 `SET FOREIGN_KEY_CHECKS=0`、`SET UNIQUE_CHECKS=0`，导完开回并重建必要校验。

## 常见坑点速记

- LOAD DATA 读的是**服务端**文件系统：secure_file_priv 目录是硬边界，1290 报错先查它；
- Windows 文件 `\r\n` 是排障榜第一：末列带隐形 `\r`，按真实行分隔符声明；
- 字符集在语句里显式声明：默认值随连接漂移，乱码入库是静默失败；
- 文本含分隔符必须 `ENCLOSED BY '"'`，否则从那个字符起全部列错位；
- `IGNORE 1 LINES` 忘写 = 表头入库；
- INTO OUTFILE 永不覆盖已存在文件；NULL 导出为 `\N`，面向人的报表先 IFNULL；
- `SET FOREIGN_KEY_CHECKS=0` 必须配对开回；批量导入靠「幂等清理 + 对账」保证可重跑；
- mysqlimport 用文件名当表名；`--local` 换成读客户端文件，但要服务端开 local_infile 且仅在受信网络用。

## 动手实践

练习一（预测题）：`C:\data\orders.csv`（Windows 导出，含表头，最后一列是日期）在 Linux 服务器上用下面的语句导入后，`SELECT order_no, created_at FROM orders LIMIT 1` 会看到什么？

```sql
LOAD DATA INFILE '/var/lib/mysql-files/orders.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
(order_no, user_id, amount, created_at);
```

提示：Windows 的行尾是什么？表头行去哪了？

<details>
<summary>参考实现</summary>

第一行是**表头**被当数据插入（order_no = 'order_no'），后续每行的 created_at 值末尾带着隐形 `\r`——显示上像正常日期（`2026-10-07\r`），但 `WHERE created_at = '2026-10-07'` 永远匹配不上，`DATE()` 函数可能报截断警告。修复：`LINES TERMINATED BY '\r\n'` + `IGNORE 1 LINES`，清表重导。这两个参数恰恰是示例里省掉的两个——真实排障里它们的缺席几乎总是成对出现（Windows 文件既带 \r\n 又带表头）。
</details>

练习二（实战题）：把 070/075 篇的 charging_stations 表造数改造成文件导入：写出生成 stations.tsv 的内容格式（至少 3 行）、对应的 LOAD DATA 语句（TSV、utf8mb4、无表头），以及一次失败重跑的幂等保障。

提示：重跑保障用 `TRUNCATE` 或 `IGNORE` 关键字（`LOAD DATA ... IGNORE` 跳过撞唯一键的行）。

<details>
<summary>参考实现</summary>

```sql
-- stations.tsv（字段：id、name、city_code、open_date）
-- 1	朝阳公园站	0100	2025-03-15
-- 2	望京南站	0100	2025-06-20
-- 3	虹桥枢纽站	0210	2026-01-10

LOAD DATA INFILE '/var/lib/mysql-files/stations.tsv'
INTO TABLE charging_stations
CHARACTER SET utf8mb4
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
(id, name, city_code, open_date);
```

幂等两种写法：全量重建 `TRUNCATE TABLE charging_stations;` 后重导（造数场景首选，AUTO_INCREMENT 也复位）；增量重跑 `LOAD DATA IGNORE INFILE ...`（撞 uk 索引的行跳过不报错，适合只追加的日批）。造数与日批的幂等策略选择不同：前者要确定性复位，后者要保护已入库数据。
</details>

练习三（实战题）：给例子一的第 2 步补一个「金额脏数据」防御：源 CSV 里个别金额是空串。要求：空串入库为 NULL（amount 列允许 NULL），非空串保留数值——用 LOAD DATA 的变量中转 + `SET` 表达式实现，并写一条验证查询。

提示：`SET amount = NULLIF(TRIM(@amount), '')`——NULLIF 在两参数相等时返回 NULL。

<details>
<summary>参考实现</summary>

```sql
LOAD DATA INFILE '/var/lib/mysql-files/orders_20261007.csv'
INTO TABLE orders
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@order_no, @user_id, @amount, @created_at)
SET amount = NULLIF(TRIM(@amount), ''),
    order_no = TRIM(@order_no),
    biz_date = @created_at,
    created_at = @created_at;

-- 验证：空串已变 NULL
SELECT COUNT(*) FROM orders WHERE biz_date = '2026-10-07' AND amount IS NULL;
```

要点：直接映射 `amount` 列时，空串会被严格模式拒绝（ERROR 1366 Incorrect decimal value）或非严格模式静默转 0——0 元订单是比 NULL 更危险的脏数据（参与求和）；`NULLIF(TRIM(x), '')` 把「空串语义」翻译成「未知语义」，与 070 篇「NULL 表达未知、默认值表达已知」的纪律一脉相承。用户变量中转是 LOAD DATA 里做逐行清洗的标准通道。
</details>

练习四（找错题）：这条导出语句有两个问题，先找再修：

```sql
SELECT order_no, remark, refund_time
FROM orders
WHERE user_id = 42
INTO OUTFILE '/var/lib/mysql-files/user42_orders.csv'
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

提示：remark 里可能有什么字符？refund_time 是 NULL 时文件里长什么样？如果昨天已经导过一次呢？

<details>
<summary>参考实现</summary>

```sql
SELECT order_no,
       IFNULL(remark, '') AS remark,          -- NULL 先翻译
       IFNULL(DATE_FORMAT(refund_time, '%Y-%m-%d %H:%i:%s'), '') AS refund_time
FROM orders
WHERE user_id = 42
INTO OUTFILE '/var/lib/mysql-files/user42_orders.csv'
CHARACTER SET utf8mb4                          -- 编码显式声明
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

三个问题：其一，remark 类文本列若含逗号，无 ENCLOSED 时导出文件再导入就列错位——加 `ENCLOSED BY '"'`（用 OPTIONALLY 让数值列不带引号更干净）；其二，`refund_time` 为 NULL 时导出 `\N` 字面量，下游（Excel、脚本）多半把它当字符串——导出前 IFNULL 翻译；其三，昨天导过则目标文件已存在，直接 `ERROR 1086 (HY000): File ... already exists`——脚本里先删除旧文件。顺带：`CHARACTER SET` 两者都要写，导出端漏写时文件编码随服务器默认，下游按 UTF-8 读就是乱码。
</details>

练习五（实战题）：你的开发库 secure_file_priv 为 NULL（禁用文件导入），手里有一个 5000 行的 CSV 要灌进测试表。写出一条不依赖服务端文件系统的导入路径（提示：客户端侧），并用 `time` 对比它与逐行 INSERT 的耗时量级（量级判断即可，不用精确数字）。

提示：`--local` 需要 local_infile 开启（`SET GLOBAL local_infile = ON`）；或者干脆用客户端管道拆解文件。

<details>
<summary>参考实现</summary>

```bash
# 路径 A：LOAD DATA LOCAL（服务端开 local_infile 后）
mysql -u dev -p --local-infile=1 green -e "SET GLOBAL local_infile = ON;"
#   （SET GLOBAL 需要 DBA 权限；云 RDS 上在参数组里开）
mysqlimport --local green \
  --fields-terminated-by=, --ignore-lines=1 \
  --user=dev -p /tmp/orders.csv
#   文件名必须是表名：把 CSV 改名成 orders.csv

# 路径 B：纯客户端管道（local_infile 也开不了时的兜底）
# 把 CSV 转成多值 INSERT 文本再喂给 mysql 客户端
sed 's/^\([^,]*\),\([^,]*\),\([^,]*\),\(.*\)$/("\1","\2","\3","\4"),/' /tmp/orders.csv \
  | sed '$ s/,$/;/' > /tmp/orders_inserts.sql
mysql -u dev -p green < /tmp/orders_inserts.sql
```

量级结论：同一文件，LOAD DATA（LOCAL 与否）通常比逐行 INSERT 快 10-20 倍，比 sed 转出来的**单条**逐行 INSERT 快一个数量级；路径 B 若先聚合成**多值** INSERT（1000 行一批）能追回大半差距，但转换脚本的健壮性（转义、含逗号的字段）要自己负责——这正是「能走服务端 LOAD DATA 就走服务端」的原因。安全提醒复述：--local 只在受信网络对受信服务端用。
</details>

## 与之前和之后的知识的关系

- 往前：INSERT 批量写法（多值、IGNORE 幂等）见 [DML 数据操作语言](/mysql/100-DML)；约束在批量导入下的行为（唯一键撞车、外键检查）见 [约束与完整性](/mysql/075-ConstraintsIntegrityEnforcement)；字符集与乱码的底层机制见 [字符集与排序规则](/mysql/170-CharsetCollation)。
- 往后：整库导出的 mysqldump 家族见 [逻辑备份](/mysql/560-LogicalBackup)，并行版见 [MySQL Shell 工具链](/mysql/925-MySQLShellToolkit)；批量导入的事务与锁行为见 [事务与锁机制](/mysql/460-TransactionLockMechanism)；日批任务的调度与幂等工程实践见 [存储过程与函数](/mysql/770-StoredProcedureAndFunction) 与 [事件调度器](/mysql/790-EventScheduler)。

## 参考与致谢

- MySQL 8.0 Reference Manual, §15.2.9 LOAD DATA Statement：https://dev.mysql.com/doc/refman/8.0/en/load-data.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §15.2.13.1 SELECT ... INTO Statement（OUTFILE）：https://dev.mysql.com/doc/refman/8.0/en/select-into.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §7.1.1 Server Option / Variable Reference（secure_file_priv、local_infile）：https://dev.mysql.com/doc/refman/8.0/en/server-option-variable-reference.html（GPL/CC BY-SA 许可）
- mysqlimport — A Data Import Program：https://dev.mysql.com/doc/refman/8.0/en/mysqlimport.html（GPL/CC BY-SA 许可）
- 本篇参数语义、secure_file_priv 三态与 LOCAL 的安全注意事项均以官方手册为依据。

## 自我检查

- 能默写 LOAD DATA 的六段式语法并为每个参数说出一个缺省后果；
- 能说出 secure_file_priv 三种取值的行为与 1290 报错的三种处置；
- 能解释 `\r\n` 残留与 IGNORE 1 LINES 缺失各自造成的静默脏数据；
- 能用 @变量 + SET 在导入时做逐行清洗（TRIM、NULLIF、列复制）；
- 能写出「幂等清理 + 对账 + SHOW WARNINGS」的日批导入收尾三件套；
- 能在 secure_file_priv 为 NULL 的环境走通客户端侧导入并说出 LOCAL 的安全边界。
