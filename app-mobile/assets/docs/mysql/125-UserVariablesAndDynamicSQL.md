---
order: 140
title: 用户变量与动态 SQL：PREPARE/EXECUTE 三步曲
module: 'mysql'
category: 数据库
difficulty: beginner
description: SQL 级的变量与动态语句——@用户变量与 := 赋值、SET 与 SELECT 中的赋值差异、PREPARE/EXECUTE/DEALLOCATE 三步、动态 ORDER BY 与行转列透视两个经典案例、与存储程序及应用层参数化的分工边界；附「用户变量求值顺序不保证」的头号坑与遮代码自检练习。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：MySQL 语言结构层的「变量与动态 SQL」——用户会话变量（`@var`）、赋值运算符的两种形态（`:=` 与 `=`）、以及服务器端动态 SQL 三步曲（`PREPARE`/`EXECUTE`/`DEALLOCATE`）。它是在**纯 SQL 里**实现「程序逻辑」的地基：没有它，报表排序方式要靠改代码、行转列要靠写死列名。
- **解决什么问题**：报表的 ORDER BY 列要按前端选择动态变化（不想为每种排序写一条 SQL）；月份作为列名的透视表（1 月、2 月……12 月各一列）没法用固定 SQL 表达；定时任务里要根据当天日期拼出表名。应用层参数化（ORM/驱动）管「值的安全传入」，服务器端 PREPARE 管「结构本身的安全动态」——两者分工不同。
- **什么时候用到**：动态排序/动态条件报表、行转列透视、按日期分表的路由、一次性运维脚本里的状态暂存。值传参的正统（应用层预处理语句与注入防御）见 [SQL 注入防御](/mysql/760-SQLInjectionDefenseStrategy)；变量在存储过程内的完整语法（DECLARE、OUT 参数）见 [存储过程与函数](/mysql/770-StoredProcedureAndFunction)；@@系统变量体系专篇见 [服务器 SQL 模式与系统变量](/mysql/855-ServerSqlModeAndVariables)。

## 用户变量：@var 的三个来源与两条规则

### 赋值的三种形态

```sql
-- 形态一：SET 语句（最清晰，推荐）
SET @station_count = (SELECT COUNT(*) FROM charging_stations);
SET @default_city = '0100';

-- 形态二：SELECT ... := （查询中赋值，:= 是唯一合法运算符）
SELECT @total_kwh := SUM(kwh) FROM daily_station_stats WHERE stat_date = '2026-10-06';

-- 形态三：SET 里的 = （仅 SET 语句中 = 与 := 等价）
SET @retry = @retry + 1;      -- SET 中 = 是赋值
```

逐形态讲清最容易混的点：**`= 在 SET 里是赋值、在 SELECT 里是比较**——`SELECT @x = 1` 返回的是布尔（1 或 0），不是赋值；查询里赋值必须用 `:=`。这条区别是历史包袱（`:=` 专为查询内赋值而生），e-core 附录速查把「SET 中 = 与 := 的区别」列为必背正是它的高频出错。新手在 SELECT 里写 `@x = 1` 想「赋值」，得到的全是 1（比较为真），还纳闷变量怎么没变——记住口诀：**SET 里两种都行，查询里只有 `:=`**。

两条作用域规则：其一，用户变量是**会话级**——同一连接内存活，断开即亡，跨连接不可见（这与 @@全局系统变量的层次关系见 [服务器 SQL 模式与系统变量](/mysql/855-ServerSqlModeAndVariables)）；其二，**未初始化的用户变量是 NULL**，`SET @retry = @retry + 1` 在首次执行时结果是 NULL（NULL + 1 还是 NULL）——用之前先初始化，`SET @retry = 0`。

### 头号坑：查询内的求值顺序不保证

```sql
-- 危险写法：官方文档明确不保证 SELECT 列表的求值顺序
SELECT @row := @row + 1 AS rn, name FROM singers;   -- rn 与 name 谁先算？没有承诺

-- 历史场景：用用户变量模拟行号（8.0 前的常见技巧）
SET @row = 0;
SELECT @row := @row + 1 AS rn, name, kwh
FROM daily_station_stats ORDER BY kwh DESC;
```

这段是「8.0 之前没有窗口函数时模拟 ROW_NUMBER」的经典写法，但官方手册明确：**用户变量在查询内的求值顺序与赋值时机均不保证**（可能因优化器改写、索引选择而变化）。8.0 之后这个场景整体退役——`ROW_NUMBER() OVER (...)` 是官方正解（见 [窗口函数](/mysql/152-WindowFunctions)）；遗留的 5.7 老代码里见到 `@row := @row + 1` 要知道它在读什么，但新代码不要写。用户变量的正当用途收敛为：**会话内的状态暂存**（跨语句传值）与 **PREPARE 的参数载体**，不再承担行内计算。

## PREPARE/EXECUTE/DEALLOCATE：服务器端动态 SQL 三步

### 三步曲的完整机制

```sql
-- 第 1 步：PREPARE——把带 ? 占位符的语句文本编译成「预处理语句」
SET @sql = 'SELECT COUNT(*) FROM orders WHERE user_id = ? AND amount > ?';
PREPARE stmt FROM @sql;

-- 第 2 步：EXECUTE——用 USING 把用户变量绑定到占位符
SET @uid = 42, @min_amount = 100.00;
EXECUTE stmt USING @uid, @min_amount;
-- +----------+
-- | COUNT(*) |
-- +----------+
-- |       37 |
-- +----------+

-- 第 3 步：DEALLOCATE——用完释放（会话结束也会自动释放）
DEALLOCATE PREPARE stmt;
```

逐段讲机制：`?` 占位符只能出现在**值**的位置（WHERE 值、LIMIT 数字、SET 值）——表名、列名、关键字必须是语句文本的一部分，这是与「注入」攻防直接相关的边界（后文专述）。占位符个数与 `USING` 后的变量个数必须严格对应，顺序绑定。PREPARE 的产物是会话内的预处理语句对象，名字（stmt）像临时表一样只在当前会话可见。为什么费这三步而不是直接拼字符串执行：其一，**值经占位符绑定永不参与语句解析**——值里带引号、分号、SQL 关键字都只是数据，这是注入防御在 SQL 层的正统形态；其二，PREPARE 一次可 EXECUTE 多次（改参数重复跑），解析开销只付一次。

### PREPARE 能动态什么、不能动态什么

```sql
-- 能动态：表名、列名、ORDER BY、LIMIT —— 因为它们是语句"文本"的一部分
SET @col = CASE @sort_key
             WHEN 'amount'  THEN 'amount'
             WHEN 'date'    THEN 'created_at'
             ELSE 'id' END;
SET @dir = IF(@asc = 1, 'ASC', 'DESC');
SET @sql = CONCAT('SELECT id, amount, created_at FROM orders ORDER BY ', @col, ' ', @dir, ' LIMIT ?');
PREPARE stmt FROM @sql;
EXECUTE stmt USING @page_size;
DEALLOCATE PREPARE stmt;
```

注意分工：列名与排序方向**进入语句文本**（经白名单 CASE 映射后 CONCAT），行数**走占位符**——「结构用白名单拼接、值用占位符」是动态 SQL 的安全铁律，后文例子三展开。PREPARE 的限制清单（官方手册 §15.5.1）：不能预编译 `PREPARE` 自身与 `EXECUTE`、不能在存储函数内使用、SQL 注释在语句文本里要小心拼接。

## 例子一（真实工程）：动态 ORDER BY 报表

运营报表的排序字段由前端下拉选择（金额/日期/单号），接口层不想为每种组合写一条 SQL。存储过程版（面向定时与报表工具调用）：

```sql
DELIMITER $$

CREATE PROCEDURE sp_order_report(
    IN p_sort_key VARCHAR(20),     -- 'amount' | 'date' | 'order_no'
    IN p_desc_flag TINYINT,        -- 1 倒序
    IN p_page_size INT
)
BEGIN
    -- 白名单：映射失败落到默认列，杜绝拼接攻击
    SET @col = CASE p_sort_key
        WHEN 'amount'   THEN 'amount'
        WHEN 'date'     THEN 'created_at'
        WHEN 'order_no' THEN 'order_no'
        ELSE 'id'
    END;
    SET @dir = IF(p_desc_flag = 1, 'DESC', 'ASC');

    SET @sql = CONCAT(
        'SELECT order_no, user_id, amount, created_at ',
        'FROM orders ORDER BY ', @col, ' ', @dir, ' LIMIT ?');

    SET @limit = p_page_size;
    PREPARE stmt FROM @sql;
    EXECUTE stmt USING @limit;
    DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;

CALL sp_order_report('amount', 1, 20);
-- 金额倒序前 20 单
```

逐段解释设计取舍：`@col` 经 CASE **白名单映射**而不是直接拼接 `p_sort_key`——传入 `"amount DESC; DROP TABLE orders--"` 时 CASE 匹配不到任何分支落到 `'id'`，恶意文本在进入 CONCAT 之前就被消毒。方向 `@dir` 同理只允许两个值。`LIMIT ?` 走占位符——LIMIT 的数字也能且应该用绑定。为什么不直接在应用层拼：当报表工具、定时任务、多个服务都要同一个排序逻辑时，白名单收敛在数据库一处比散在各调用方安全。但也要诚实标注边界：**应用层有 ORM 时，动态排序的正统做法是应用层白名单 + ORM 的排序 API**（框架处理标识符转义），PREPARE 版适合报表工具直连与纯 SQL 环境——分工决策见例子三。

## 例子二（真实工程）：月度行转列透视

需求：每月一行、每月充电量一列（1 月到 12 月），固定 SQL 写不出「动态列数」——纯 SQL 里列名必须静态。两个层次的解法：

```sql
-- 解法一：列数已知时，聚合 + CASE 直接透视（不需要动态 SQL）
SELECT
  station_id,
  SUM(CASE WHEN MONTH(stat_date) = 1  THEN kwh ELSE 0 END) AS m01,
  SUM(CASE WHEN MONTH(stat_date) = 2  THEN kwh ELSE 0 END) AS m02,
  SUM(CASE WHEN MONTH(stat_date) = 3  THEN kwh ELSE 0 END) AS m03
FROM daily_station_stats
WHERE YEAR(stat_date) = 2026
GROUP BY station_id;

-- 解法二：月份范围要"活"的（用户可选任意月份区间），用 PREPARE 拼 GROUP_CONCAT 生成列清单
SET @cols = NULL;
SELECT GROUP_CONCAT(DISTINCT
         CONCAT('SUM(CASE WHEN MONTH(stat_date) = ', MONTH(stat_date),
                ' THEN kwh ELSE 0 END) AS m', LPAD(MONTH(stat_date), 2, '0'))
       ) INTO @cols
FROM daily_station_stats
WHERE stat_date BETWEEN '2026-01-01' AND '2026-12-31';
-- @cols = "SUM(CASE WHEN MONTH(stat_date) = 1 THEN kwh ELSE 0 END) AS m01, ..."

SET @sql = CONCAT('SELECT station_id, ', @cols,
                  ' FROM daily_station_stats WHERE stat_date BETWEEN ? AND ? ',
                  'GROUP BY station_id');
PREPARE stmt FROM @sql;
SET @d1 = '2026-01-01', @d2 = '2026-12-31';
EXECUTE stmt USING @d1, @d2;
DEALLOCATE PREPARE stmt;
```

逐段解释经典套路：解法一是「列数固定」时的正解——CASE 聚合一行一列，性能好、可读、无动态；解法二用 `GROUP_CONCAT` 把「要生成哪些列」**先查出来再拼成 SQL 文本**，实现「列随数据变」——这是动态 SQL 的招牌场景（「SQL 生成 SQL」）。注意 `GROUP_CONCAT` 默认 1024 字节上限，列多会被静默截断（拼出残缺 SQL 报语法错误），先 `SET SESSION group_concat_max_len = 65536`。日期值仍然走占位符——**拼接的只有白名单化的列定义，值永远绑定**。

## 例子三（真实工程）：定时任务里拼安全 SQL + 与应用层参数化的分工

每日归档任务按日期生成表名（`orders_20261007` 风格的分表），并只搬「昨天」的数据。完整存储过程：

```sql
DELIMITER $$

CREATE PROCEDURE sp_archive_yesterday()
BEGIN
    DECLARE done INT DEFAULT 0;
    SET @tbl = CONCAT('orders_', DATE_FORMAT(CURDATE() - INTERVAL 1 DAY, '%Y%m%d'));

    -- 表存在性校验（表名只能进文本，且必须校验——见下方防注入说明）
    SET @check = CONCAT('CREATE TABLE IF NOT EXISTS ', @tbl, ' LIKE orders');
    PREPARE s1 FROM @check;
    EXECUTE s1;
    DEALLOCATE PREPARE s1;

    SET @move = CONCAT('INSERT INTO ', @tbl,
                       ' SELECT * FROM orders WHERE created_at >= ? AND created_at < ?');
    PREPARE s2 FROM @move;
    SET @d0 = CURDATE() - INTERVAL 1 DAY, @d1 = CURDATE();
    EXECUTE s2 USING @d0, @d1;          -- 日期值走绑定，表名走受控拼接
    DEALLOCATE PREPARE s2;
END$$

DELIMITER ;
```

逐段解释安全边界：`@tbl` 由 `DATE_FORMAT(CURDATE(), ...)` 生成——**输入完全来自服务器时钟**，没有任何外部输入混入，这是「受控拼接」；假如表名含用户输入（如按租户名分表 `orders_<tenant>`），租户名必须先经白名单校验（正则 `^[a-z0-9_]+$`）再进 CONCAT，否则 `orders_x; DROP TABLE orders` 这样的文本直接成为第二条语句。日期条件 `?` 绑定——模式固化：**表名等标识符受控拼接、值一律占位符**。

与应用层参数化的分工全景：应用层预处理语句（JDBC PreparedStatement、Python 驱动参数化，见 [应用层访问模式](/mysql/900-AppLayerDbAccessPatterns) 与 [SQL 注入防御](/mysql/760-SQLInjectionDefenseStrategy)）覆盖 95% 的场景——值传入快、连接池友好；服务器端 PREPARE 服务于三个场景：**纯 SQL 环境**（报表工具、定时事件、DBA 运维脚本）没有应用层可用；**结构动态**（表名/列名/排序）超出应用层参数化的表达能力；**多次执行的模板**（循环里同一语句换参数）复用解析。三者之外，优先应用层。

## 常见坑点速记

- `=` 在 SET 里是赋值、在 SELECT 里是比较——查询内赋值只有 `:=`；
- 用户变量会话级、未初始化为 NULL：`@x = @x + 1` 首次执行得 NULL；
- 查询内 `@row := @row + 1` 的求值顺序官方不保证——8.0 起用窗口函数，别再写；
- 占位符只能落在**值**的位置：表名/列名/关键字必须进语句文本，且要白名单校验；
- `GROUP_CONCAT` 拼 SQL 前先调 `group_concat_max_len`，默认 1024 字节静默截断；
- PREPARE 的对象是会话私有，用完 DEALLOCATE（循环场景复用同一 stmt 是它的性能红利）；
- 动态排序的正统分流：有 ORM 走应用层白名单，纯 SQL 环境才用 PREPARE；
- 「结构受控拼接、值占位符绑定」是动态 SQL 的安全铁律，一条都不能松。

## 动手实践

练习一（预测题）：下面三段各自的结果是什么？

```sql
-- A
SET @a = 1;
SELECT @a = 2;

-- B
SET @b := 5;
SET @b = @b + 1;
SELECT @b;

-- C
SELECT @c + 1;
```

提示：A 里 = 在 SELECT 中是什么运算符？C 的 @c 是什么状态？

<details>
<summary>参考实现</summary>

A 输出 `0`——SELECT 里的 `=` 是比较运算符，`@a = 2` 即「1 等于 2」为假；想赋值该写 `SELECT @a := 2`。B 输出 `6`——SET 里 `=` 与 `:=` 都是赋值，先设 5 再自增。C 输出 `NULL`——@c 从未赋值为 NULL，NULL + 1 仍是 NULL；用前先 `SET @c = 0`。三段合起来就是本篇第一节的两条规则：赋值形态按上下文分、未初始化即 NULL。
</details>

练习二（实战题）：写一个存储过程 `sp_top_singers(p_top INT, p_order_key VARCHAR(20))`：返回歌姬表按 "songs"（作品数）或 "name" 排序的前 N 位，排序键白名单校验，非法值抛 `SIGNAL SQLSTATE '45000'`（SIGNAL 语法见 [存储过程与函数](/mysql/770-StoredProcedureAndFunction)）。

提示：结构（列名）白名单拼接，N 走占位符；SIGNAL 在校验失败时给出可读错误。

<details>
<summary>参考实现</summary>

```sql
DELIMITER $$

CREATE PROCEDURE sp_top_singers(IN p_top INT, IN p_order_key VARCHAR(20))
BEGIN
    IF p_top IS NULL OR p_top <= 0 OR p_top > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'p_top 必须在 1-100';
    END IF;

    SET @col = CASE p_order_key
        WHEN 'songs' THEN 'song_count'
        WHEN 'name'  THEN 'name'
        ELSE NULL
    END;
    IF @col IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'p_order_key 只接受 songs/name';
    END IF;

    SET @sql = CONCAT('SELECT name, company, song_count FROM singers ',
                      'ORDER BY ', @col, ' DESC LIMIT ?');
    PREPARE stmt FROM @sql;
    EXECUTE stmt USING p_top;
    DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;

CALL sp_top_singers(5, 'songs');
CALL sp_top_singers(3, 'hack');   -- ERROR 1644: p_order_key 只接受 songs/name
```

双闸设计：参数范围（p_top）用 SIGNAL 前置拒绝——错误信息直接可读；排序键经 CASE 白名单（匹配不到即 NULL → SIGNAL）。LIMIT 绑定占位符。对照不写白名单的 `CONCAT('... ORDER BY ', p_order_key)`：传入 `name; DROP TABLE singers--` 时拼接出的文本成为恶意语句——白名单的意义就在这层。
</details>

练习三（实战题）：把解法一的季度透视扩展为「任意年份 + 按季度 Q1-Q4」版本：返回站点行、四个季度列、年度合计列。列数固定，用纯聚合 CASE（不需要动态 SQL），并验证某站点四列之和等于合计列。

提示：`QUARTER(stat_date)` 取季度；合计列直接 `SUM(kwh)`。

<details>
<summary>参考实现</summary>

```sql
SELECT
  station_id,
  SUM(CASE WHEN QUARTER(stat_date) = 1 THEN kwh ELSE 0 END) AS q1,
  SUM(CASE WHEN QUARTER(stat_date) = 2 THEN kwh ELSE 0 END) AS q2,
  SUM(CASE WHEN QUARTER(stat_date) = 3 THEN kwh ELSE 0 END) AS q3,
  SUM(CASE WHEN QUARTER(stat_date) = 4 THEN kwh ELSE 0 END) AS q4,
  SUM(kwh) AS year_total
FROM daily_station_stats
WHERE YEAR(stat_date) = 2026
GROUP BY station_id
HAVING q1 + q2 + q3 + q4 = year_total;   -- 验证：能通过说明四列覆盖全年
```

要点：`HAVING` 里的恒等校验是透视表的自检手段——若四列之和与总计不符（日期边界漏了、时区错位），行会被过滤掉而非静默错数，把「数据质量问题」变成「可见的缺行」。列数已知时优先这种静态透视：无拼接、无 PREPARE、执行计划友好。动态版（解法二）留给「列本身要随数据变化」的真动态需求。
</details>

练习四（找错题）：这个动态查询有两处问题，先找再修：

```sql
SET @sql = CONCAT('SELECT order_no, amount FROM orders WHERE user_id = ',
                  @uid, ' ORDER BY ', @sort);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

提示：@uid 走的是什么通道？@sort 有没有消毒？

<details>
<summary>参考实现</summary>

```sql
SET @sort = CASE @sort_key            -- 白名单映射
              WHEN 'amount' THEN 'amount'
              WHEN 'date'   THEN 'created_at'
              ELSE 'id' END;
SET @sql = CONCAT('SELECT order_no, amount FROM orders WHERE user_id = ? ',
                  'ORDER BY ', @sort);
PREPARE stmt FROM @sql;
EXECUTE stmt USING @uid;              -- 值走占位符
DEALLOCATE PREPARE stmt;
```

两处问题：其一，`@uid` 直接拼进文本——值没走占位符，`@uid = "42 OR 1=1"` 时 WHERE 被改写成恒真（内部工具里这类值往往来自请求参数），全部订单泄露；修法是 `?` + `USING`。其二，`@sort` 未经白名单直接拼接——传入 `"(SELECT 1 FROM information_schema.tables), (SELECT SLEEP(5))"` 即注入点；修法是 CASE 白名单映射后再进 CONCAT。修复版固化了本篇铁律：**结构受控拼接、值占位符绑定**。
</details>

练习五（实战题）：写一个会话级「重试计数器」：模拟一个批量脚本，`@retry` 从 0 开始，用 WHILE 循环（存储过程内）模拟「最多重试 3 次、成功即停」：用 `RAND() < 0.5` 模拟「本次成功」，打印每次尝试序号与结果。要求正确处理「未初始化用户变量是 NULL」。

提示：存储过程内循环变量优先用 DECLARE 的局部变量（见 770 篇），@变量演示的是会话状态跨语句可见的用法。

<details>
<summary>参考实现</summary>

```sql
DELIMITER $$

CREATE PROCEDURE sp_retry_demo()
BEGIN
    DECLARE attempt INT DEFAULT 0;        -- 过程内逻辑用局部变量
    DECLARE ok INT DEFAULT 0;
    SET @session_retries = 0;             -- 会话变量：循环结束后仍可在外部读取

    retry_loop: WHILE attempt < 3 DO
        SET attempt = attempt + 1;
        SET @session_retries = attempt;   -- 同步给会话层（外部脚本读它）
        SET ok = IF(RAND() < 0.5, 1, 0);
        SELECT CONCAT('第 ', attempt, ' 次尝试: ', IF(ok, '成功', '失败')) AS msg;
        IF ok = 1 THEN
            LEAVE retry_loop;
        END IF;
    END WHILE;

    IF ok = 0 THEN
        SELECT '三次重试均失败，放弃' AS msg;
    END IF;
END$$

DELIMITER ;

CALL sp_retry_demo();
SELECT @session_retries AS 用到的尝试次数;   -- 会话变量跨语句存活
```

要点分工：循环控制用 DECLARE 局部变量（类型安全、随过程结束消亡）；@session_retries 承担「过程结束后外部还能读到」的会话状态传递——这是用户变量的正当用途。`SET @session_retries = 0` 显式初始化避开 NULL 陷阱。对比反模式：把 attempt 也放 @ 变量——多会话并发跑同一过程时虽各自独立（会话隔离），但可读性与类型检查都变差。
</details>

## 与之前和之后的知识的关系

- 往前：ORDER BY 与 GROUP BY 的静态用法见 [DQL 数据查询](/mysql/120-DQL) 与 [GROUP BY 与排序优化](/mysql/380-GroupByOrderByOptimization)；CASE 表达式基础见 [SQL 函数与进阶查询](/mysql/130-SQLFunctionAndAdvancedQuery)。
- 往后：窗口函数取代「@row 模拟行号」见 [窗口函数](/mysql/152-WindowFunctions)；存储过程内 DECLARE/OUT 参数/游标的完整语法见 [存储过程与函数](/mysql/770-StoredProcedureAndFunction)；@变量的会话层与 @@ 系统变量的层次体系见 [服务器 SQL 模式与系统变量](/mysql/855-ServerSqlModeAndVariables)；值传参在应用层的正统见 [SQL 注入防御](/mysql/760-SQLInjectionDefenseStrategy) 与 [应用层访问模式](/mysql/900-AppLayerDbAccessPatterns)。

## 参考与致谢

- MySQL 8.0 Reference Manual, §11.4 User-Defined Variables（含求值顺序不保证的官方警告）：https://dev.mysql.com/doc/refman/8.0/en/user-variables.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §15.5 Prepared Statements（PREPARE/EXECUTE/DEALLOCATE 与占位符限制）：https://dev.mysql.com/doc/refman/8.0/en/sql-prepared-statements.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §14.19.1 Aggregate Function Descriptions（GROUP_CONCAT 与 group_concat_max_len）：https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html（GPL/CC BY-SA 许可）
- 本篇语法语义与版本行为（占位符位置限制、GROUP_CONCAT 默认上限）均以官方手册为依据。

## 自我检查

- 能说出 = 与 := 在 SET 和 SELECT 两种上下文里的行为差异；
- 能解释用户变量的会话作用域、NULL 初始化状态与「求值顺序不保证」的官方警告；
- 能默写 PREPARE/EXECUTE/DEALLOCATE 三步并说出占位符只能落在值位置的边界；
- 能用白名单 CASE + CONCAT 实现动态排序，并解释它如何挡住注入；
- 能用 GROUP_CONCAT + PREPARE 实现列数不定的透视，并记得先调 group_concat_max_len；
- 能给一个新需求判断「应用层参数化」与「服务器端动态 SQL」该用谁。
