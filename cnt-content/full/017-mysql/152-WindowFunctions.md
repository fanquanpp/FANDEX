---
order: 180
title: 窗口函数：MySQL 8.0 方言与工程落地
module: 'mysql'
category: 数据库
difficulty: beginner
description: 窗口函数的 MySQL 实现专篇——8.0 引入版本与能力边界、排名三兄弟的 MySQL 行为、ROWS/RANGE 帧语法支持范围与限制、EXPLAIN 中的窗口表现（derived 表与 filesort）、命名窗口复用、组内 Top-N 与每公司作品最多的歌姬实战，通用概念与 016-sql 两篇专篇分工互链，附遮代码自检练习。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：窗口函数的 **MySQL 方言视角**——`OVER` 子句在 MySQL 8.0 的引入版本、帧（frame）语法的支持范围与限制、窗口函数在执行计划中的呈现。通用概念与语法框架（窗口的定义心智模型、排名函数家族的系统化讲法、帧的语义推导）归 016-sql 模块两篇专篇，本篇不重复展开，聚焦「在 MySQL 上用时会遇到什么」。
- **解决什么问题**：同一条排名 SQL 在 PostgreSQL 跑得好好的，在 MySQL 上报语法错误（用了 MySQL 不支持的帧子句或 EXCLUDE）；Top-N 查询写成子查询嵌套后执行计划里冒出一堆 derived 表（不知道优化器怎么处理窗口）；LAG 算环比时结果总是 NULL（NULL 帧边界）；8.0 之前的老库没有窗口函数，`@row := @row + 1` 模拟行号的遗留代码要不要迁移。
- **什么时候用到**：组内 Top-N、环比同比、移动平均、组内占比这类「不折叠行」的分析查询。**分工声明**：窗口函数的通用框架与心智模型见 [窗口函数](/sql/260-WindowFunction)，帧语法与窗口定义的系统化推导见 [窗口函数框架](/sql/270-WindowFunctionFramework)；本篇讲 MySQL 的实现边界（引入版本、帧支持、EXPLAIN 表现、性能特征）。`@row := @row + 1` 模拟行号的 5.7 遗留写法与它的求值顺序陷阱见 [用户变量与动态 SQL](/mysql/125-UserVariablesAndDynamicSQL)。

## MySQL 的引入版本与能力边界

窗口函数是 **MySQL 8.0.0（2018）引入**的——这是硬版本线：5.7 及以前一条窗口函数都写不了，所有「每站冠军」「环比」需求只能靠用户变量模拟或自连接。8.0 之后的版本演进小而具体，做工程判断时按这张表核对：

| 能力 | 引入版本 | 说明 |
| --- | --- | --- |
| 全部窗口函数（ROW_NUMBER/RANK/DENSE_RANK/LAG/LEAD/NTILE/FIRST_VALUE/LAST_VALUE/NTH_VALUE + 聚合当窗口） | 8.0.0 | 主力能力一步到位 |
| `WINDOW` 命名窗口复用 | 8.0.0 | 同一窗口定义写一次 |
| `GROUPS` 帧单位 | 8.0.0 | 与 ROWS/RANGE 并列的第三种帧单位 |
| `EXCLUDE CURRENT ROW/GROUP/TIES/NO OTHERS` 帧排除子句 | **不支持** | 标准SQL 有、MySQL 没实现——从 PG 迁移时先查这条 |
| `RANGE` 帧的 INTERVAL 日期偏移 | **不支持** | `RANGE BETWEEN INTERVAL 7 DAY PRECEDING` 写不了；MySQL 的 RANGE 只接受值表达式（`RANGE BETWEEN 7 PRECEDING`，按数值解释） |

逐行讲工程含义：MySQL 一步到位拿到了全部函数族，所以「函数不可用」的兼容问题不存在；**兼容性缺口集中在帧子句**——`EXCLUDE` 与日期 INTERVAL 帧是标准 SQL 有而 MySQL 留白的两处，跨库写报表时先核对这两条。日期滚动窗口的 MySQL 惯用替代见下文移动平均一节的 RANGE 帧陷阱。

## 排名三兄弟：MySQL 行为速通

三个排名函数的差异（不并列/并列跳号/并列不跳号）是通用概念，这里只压缩成对照表并补 MySQL 特有的注意点：

```sql
-- 充电桩场景：每站收入排名（沿用 150 篇三表）
SELECT station, charger_id, revenue,
       ROW_NUMBER() OVER (PARTITION BY station ORDER BY revenue DESC) AS rn,
       RANK()       OVER (PARTITION BY station ORDER BY revenue DESC) AS rnk,
       DENSE_RANK() OVER (PARTITION BY station ORDER BY revenue DESC) AS drnk
FROM (
    SELECT s.name AS station, cs.charger_id, SUM(cs.amount) AS revenue
    FROM charge_sessions cs
    JOIN chargers c ON cs.charger_id = c.charger_id
    JOIN stations s ON c.station_id = s.station_id
    GROUP BY s.name, cs.charger_id
) t;
-- 两桩并列 500 元时：rn=1,2 / rnk=1,1 / drnk=1,1（第三名分别是 3/3/2）
```

MySQL 特有注意点：其一，`ORDER BY` 排序键**并列时行序不确定**——ROW_NUMBER 给并列行分的 1/2 次序随执行计划浮动，需要确定性次序时在 ORDER BY 里补第二键（`ORDER BY revenue DESC, charger_id`）；其二，排序键为 NULL 时 NULL 视为最小值（升序排最后、降序排最前），与 PG 的 ASC-NULLS-LAST 默认相反——跨库对账报表要先统一 NULL 排序语义。取「每站第 N 名」的完整套路见下文组内 Top-N。

## 帧语法：MySQL 支持范围与两个坑

帧（frame）决定聚合当窗口时「每一行看到哪些同伴行」。通用语义推导在 [窗口函数框架](/sql/270-WindowFunctionFramework)，这里给 MySQL 视角的速查与两个高频坑：

```sql
-- 三种帧单位的语法形态（MySQL 全部支持）
SUM(kwh) OVER (ORDER BY d ROWS  BETWEEN 6 PRECEDING AND CURRENT ROW)  -- 物理行数
SUM(kwh) OVER (ORDER BY d RANGE BETWEEN 6 PRECEDING AND CURRENT ROW)  -- 值区间（d 与当前行的差 <= 6）
SUM(kwh) OVER (ORDER BY d GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW) -- peer 组（排序键相同的行为一组）

-- 默认帧（省略帧子句时）：ORDER BY 存在 -> RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
--                            无 ORDER BY      -> 整个分区
```

**坑一：RANGE 帧按「值」不按「行」**。`ORDER BY d RANGE BETWEEN 6 PRECEDING` 的意思是「d 值在 [当前行 d 减 6, 当前行 d] 区间」——d 是 DATE 类型时这是**日期差**（MySQL 内部把日期转数值比较，恰好工作），但 d 有缺日时区间语义与「最近 7 行」完全不同：6 日与 10 日相邻（中间 7/8/9 无数据），ROWS 视它们为相邻两行、RANGE 视它们相距 4。要「时间意义上的最近 7 天」用 RANGE + 完整日历表 join（递归 CTE 生成日历见 [进阶查询](/mysql/150-AdvancedQueryMultiTableOperation)），要「最近 7 条记录」用 ROWS——两者混用是报表对不上的常见根源。

**坑二：LAST_VALUE 的默认帧陷阱**。通用篇讲过：`LAST_VALUE(x) OVER (ORDER BY d)` 的默认帧止于当前行，「最后一行」永远是当前行自己——返回值等于 x 本列，看似失效。MySQL 下的正解是把帧显式扩到分区尾：

```sql
SELECT d, kwh,
       LAST_VALUE(kwh) OVER (ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING
                             AND UNBOUNDED FOLLOWING) AS period_last
FROM daily_station_stats;
```

MySQL 没有 `EXCLUDE` 子句，所以「排除当前行求均值」这类需求要走 `NTH_VALUE` 或先算总和再减的代数变形——不要照抄 PG 教程的 EXCLUDE 写法。

## EXPLAIN 中的窗口表现

窗口函数在执行计划里**没有专门的算子标记**——它以派生表（derived）+ 物化的形态出现，读懂它才能定位窗口查询的性能问题：

```sql
EXPLAIN
SELECT charger_id, revenue, rn
FROM (
    SELECT charger_id, revenue,
           ROW_NUMBER() OVER (PARTITION BY station ORDER BY revenue DESC) AS rn
    FROM charger_revenue        -- 假设已按 150 篇聚合好
) t
WHERE rn <= 3;

-- 典型计划（8.0）：
-- 1 SIMPLE t          ALL                     -- 外层过滤（rn <= 3）
-- 2 DERIVED charger_revenue   ALL  filesort   -- 窗口计算：按分区键排序后顺扫
```

逐行解读 MySQL 的窗口执行模型：窗口计算发生在 **derived 表（第 2 行）内部**——优化器先按 `PARTITION BY + ORDER BY` 的组合排序（计划里表现为 filesort 或索引免排序），再顺序扫描一次为每行算出窗口值，物化成临时结果；外层（第 1 行）再对物化结果过滤 `rn <= 3`。三个性能推论：其一，**排序是主要成本**——`PARTITION BY station ORDER BY revenue` 若有对应索引 `(station, revenue)` 则免 filesort，窗口查询建索引的方向就是分区列在前、排序列在后；其二，**外层 WHERE 进不去窗口**（窗口函数不能出现在 WHERE，见 150 篇坑一），所以 rn <= 3 的过滤永远在物化之后——大数据量下「先窗口再过滤」的行数放大是窗口查询慢的根源，能先用 GROUP BY 把分区数压小再窗口就先压；其三，`EXPLAIN ANALYZE`（8.0.18+）能看到窗口步骤的真实耗时，调优以它为准（EXPLAIN 体系见 [EXPLAIN 详解](/mysql/320-EXPLAINDetailed) 与 [执行计划](/mysql/330-MySQLIndexExecutionPlan)）。

## 例子一（真实工程）：每公司作品最多的歌姬（联合窗口全套）

vocaloid 学习库的经典分析题：每家唱片公司（上海禾念、Crypton、泠鸢工作室……）作品数最多的歌姬是谁？这套演示把「聚合 + 窗口 + 命名窗口复用」串成一条链：

```sql
-- 第一步：聚合出每位歌姬的作品数（窗口的输入）
WITH singer_songs AS (
    SELECT s.name, s.company, COUNT(g.song_id) AS song_count
    FROM singers s
    LEFT JOIN song_singers g ON g.singer_id = s.singer_id
    GROUP BY s.singer_id, s.name, s.company
)
-- 第二步：公司内排名（命名窗口复用：三个函数共用一个窗口定义）
SELECT company, name, song_count,
       ROW_NUMBER() OVER w AS rn,
       RANK()       OVER w AS rnk,
       DENSE_RANK() OVER w AS drnk,
       MAX(song_count) OVER (PARTITION BY company) AS company_max
FROM singer_songs
WINDOW w AS (PARTITION BY company ORDER BY song_count DESC);
-- 第三步（取 Top-1）：外层 WHERE rn = 1 —— 或按并列需求用 rnk = 1
```

逐段讲组合设计：CTE 先把「作品数」折叠成每人一行——窗口的输入必须是聚合后的行，这一步跳过的话窗口会在「人-歌」明细行上逐行算（结果全错）；`WINDOW w AS (...)` 让 ROW_NUMBER/RANK/DENSE_RANK 共用同一窗口定义——三个函数对照着看正是选型所需；`MAX() OVER (PARTITION BY company)` 展示「聚合当窗口」与排名函数并排使用（公司满分与个人名次同列）。取每公司并列冠军时外层改 `WHERE rnk = 1`——Top-N 的 rn/rnk 选择就是 150 篇「排名三兄弟」决策在真实问题上的落点。

## 例子二（真实工程）：组内 Top-N 的两种写法与性能对照

「每站收入前三的桩」是充电平台日报的固定报表。窗口版与自连接版的对照：

```sql
-- 写法 A：窗口 + 外层过滤（8.0+ 标准）
WITH per_charger AS (
    SELECT c.station_id, cs.charger_id, SUM(cs.amount) AS revenue
    FROM charge_sessions cs
    JOIN chargers c ON cs.charger_id = c.charger_id
    GROUP BY c.station_id, cs.charger_id
)
SELECT station_id, charger_id, revenue
FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY revenue DESC) AS rn
    FROM per_charger
) t
WHERE rn <= 3;

-- 写法 B：相关子查询计数（8.0 之前的老办法，兼容老库）
SELECT pc.station_id, pc.charger_id, pc.revenue
FROM per_charger pc
WHERE (
    SELECT COUNT(*) FROM per_charger pc2
    WHERE pc2.station_id = pc.station_id
      AND pc2.revenue >= pc.revenue
) <= 3;
```

对照要点：写法 B 语义正确（「收入比我高的不超过 3 个」即前三）但执行模型是外层每行跑一次子查询，N 行输入 O(N^2) 计数——写法 A 在 8.0 上一律优先；写法 B 的存在价值是**老库兼容与一次看懂执行模型的教材**。写法 A 的性能调优路径回到上一节：给 per_charger 的产出建 `(station_id, revenue)` 复合索引免 filesort；分区数（站点数）与分区大小（每站桩数）悬殊时，先在 CTE 里过滤掉长尾站点再窗口。

## 例子三（真实工程）：环比、移动平均与日历缺口

分析师日报的最后一公里：收入环比 + 7 日移动平均。与 150 篇递归 CTE 日历组合成完整方案：

```sql
WITH RECURSIVE calendar AS (
    SELECT DATE('2026-09-01') AS d
    UNION ALL
    SELECT d + INTERVAL 1 DAY FROM calendar WHERE d < '2026-09-30'
),
daily AS (
    SELECT cal.d, COALESCE(t.revenue, 0) AS revenue
    FROM calendar cal
    LEFT JOIN (
        SELECT DATE(started_at) AS d, SUM(amount) AS revenue
        FROM charge_sessions GROUP BY DATE(started_at)
    ) t ON t.d = cal.d
)
SELECT d, revenue,
       LAG(revenue, 1) OVER (ORDER BY d) AS prev_day,
       ROUND((revenue - LAG(revenue) OVER (ORDER BY d))
             / LAG(revenue) OVER (ORDER BY d) * 100, 1) AS day_over_day_pct,
       ROUND(AVG(revenue) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 1) AS ma7
FROM daily
ORDER BY d;
```

逐段讲 MySQL 特有的细节：日历表先补齐缺日（LEFT JOIN + COALESCE 归零）——没有这步，ROWS 帧的「最近 7 行」会跨过无数据的日子数 7 行，MA7 虚高；`LAG(revenue, 1)` 的第二参数显式写偏移量（默认就是 1，显式是可读性纪律），首行的 LAG 是 NULL，环比分母 NULL 使 day_over_day_pct 首行为 NULL——报表端要对首行做「--」处理而不是显示错误；MA7 用 ROWS 帧而不是 RANGE，因为「最近 7 个自然日」已由日历表保证（缺日被补齐后行即日），ROWS 语义正好。这三个函数是窗口函数在报表层的「三件套」，跨库迁移时唯一要重审的就是帧单位选择。

## 5.7 遗留迁移：@row 模拟行号的退役

8.0 之前模拟「组内行号」的标准写法是用户变量：

```sql
-- 5.7 遗留写法（求值顺序官方不保证，见 125 篇）
SET @rn = 0;
SELECT @rn := @rn + 1 AS rn, station, revenue
FROM charger_revenue ORDER BY station, revenue DESC;
```

迁移到 8.0 的动作是逐处替换为 `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)`——语义差异点：用户变量版在「分区切换时不清零」（示例代码其实没做 PARTITION，真做了也要 IF 判断），窗口版原生分区；用户变量版受优化器改写影响结果可能不稳定。升级迁移的检查工具（mysqlsh 体检扫不出语句级用法，要靠回归测试）见 [MySQL Shell 工具链](/mysql/925-MySQLShellToolkit)。

## 常见坑点速记

- 窗口函数是 8.0 能力：5.7 报语法错误，先确认版本再写查询；
- MySQL 没有帧的 `EXCLUDE` 子句与 RANGE 的日期 INTERVAL 偏移——PG 教程的这两类写法不能照抄；
- ROW_NUMBER 并列行的次序不确定，确定性需求在 ORDER BY 补第二键；NULL 默认是最小值（与 PG 默认相反）；
- LAST_VALUE 必须 `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`，否则默认帧止于当前行；
- RANGE 帧按值区间不按行数：缺日数据的「最近 7 天」先补日历再算，否则 ROWS/RANGE 各错各的；
- EXPLAIN 里窗口 = derived + 排序（filesort 或索引免排）：`(分区列, 排序列)` 复合索引是窗口查询的主索引方向；
- 组内 Top-N 用窗口 + 外层 WHERE rn <= N，相关子查询计数版是 O(N^2) 的老库兼容品；
- 5.7 的 `@row := @row + 1` 迁移 8.0 后一律换 ROW_NUMBER() OVER——语义与稳定性双重收益。

## 动手实践

练习一（预测题）：singer_songs 表里「上海禾念」有三位歌姬作品数并列 10 首，下面查询中三人的 rn、rnk、drnk 各是多少？

```sql
SELECT name,
       ROW_NUMBER() OVER (PARTITION BY company ORDER BY song_count DESC) AS rn,
       RANK()       OVER (PARTITION BY company ORDER BY song_count DESC) AS rnk,
       DENSE_RANK() OVER (PARTITION BY company ORDER BY song_count DESC) AS drnk
FROM singer_songs;
```

提示：并列时三种函数的计数规则；rn 的并列次序由谁决定？

<details>
<summary>参考实现</summary>

三人并列 10 首：`rn` 依次是 1、2、3（强制不并列，但**谁 1 谁 2 不确定**——排序键并列时行序随执行计划浮动，要确定性就补第二键如 `ORDER BY song_count DESC, name`）；`rnk` 三人都是 1（并列同名次，下一档跳到 4）；`drnk` 三人都是 1（并列不跳号，下一档是 2）。业务映射：「取每公司前 3 名且并列都要」用 `drnk <= 3`，「严格取 3 行」用 `rn <= 3`，「并列冠军全要」用 `rnk = 1`——同一份数据三个函数对应三种业务口径，报表口径评审时先问清用哪个。
</details>

练习二（实战题）：找出每家公司 song_count 排名前 2（**并列第 2 也要**）的全部歌姬。写出查询并说明为什么选 DENSE_RANK 而不是 ROW_NUMBER。

提示：「并列第 2 也要」意味着并列值共享名次、名次不跳号。

<details>
<summary>参考实现</summary>

```sql
WITH singer_songs AS (
    SELECT s.name, s.company, COUNT(g.song_id) AS song_count
    FROM singers s
    LEFT JOIN song_singers g ON g.singer_id = s.singer_id
    GROUP BY s.singer_id, s.name, s.company
)
SELECT company, name, song_count
FROM (
    SELECT *, DENSE_RANK() OVER (PARTITION BY company ORDER BY song_count DESC) AS drnk
    FROM singer_songs
) t
WHERE drnk <= 2;
```

选型推演：需求里「并列第 2 也要」排除了 ROW_NUMBER（并列值会被硬切成 1/2，只留一个）；若用 RANK，第三名会跳号到 3，当第一名只有一个值时「第 2 名」的判定不受影响——但若第一名并列两人，RANK 下一个名次是 3，`rnk <= 2` 就漏掉了真正的第二名。DENSE_RANK 的「并列不跳号」让「名次 <= 2」稳定等于「前两档值」，与业务语言「前两名的所有歌姬」一一对应。窗口函数选型的本质是把业务口径翻译成计数规则。
</details>

练习三（实战题）：在 8.0 上复现「LAST_VALUE 默认帧陷阱」：对 daily 表跑 `LAST_VALUE(revenue) OVER (ORDER BY d)`，观察结果为什么等于 revenue 本列；修复为分区尾帧后，再用它算「月内最后一天的累计收入」（每行都显示当月最终值）。

提示：默认帧是 RANGE UNBOUNDED PRECEDING AND CURRENT ROW；修复后配合 PARTITION BY MONTH(d)。

<details>
<summary>参考实现</summary>

```sql
-- 陷阱复现：每行的 period_last 都等于自己的 revenue（帧止于当前行，自己就是"最后一行"）
SELECT d, revenue,
       LAST_VALUE(revenue) OVER (ORDER BY d) AS period_last_buggy
FROM daily;

-- 修复一：帧扩到全序尾
SELECT d, revenue,
       LAST_VALUE(revenue) OVER (ORDER BY d
           ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS period_last
FROM daily;

-- 修复二 + 分月：每行显示"所在月份的最终日收入"
SELECT d, revenue,
       LAST_VALUE(revenue) OVER (PARTITION BY DATE_FORMAT(d, '%Y-%m')
           ORDER BY d
           ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS month_final
FROM daily;
```

机制解释：`LAST_VALUE` 取的是**帧内**最后一行——默认帧止于当前行，帧内最后一行就是自己；扩帧后帧内最后一行是全序末行。MySQL 没有 EXCLUDE，这类「扩帧」写法是标准动作；记住口诀「FIRST_VALUE 看似正常、LAST_VALUE 必须扩帧」——前者恰好默认帧起点是分区头，后者默认帧尾是当前行。
</details>

练习四（找错题）：这条「最近 7 个自然日收入合计」的查询在 9 月 3 日（1、2 日无数据，仅 9/1 与 9/3 有）会算出什么？怎么修？

```sql
SELECT d, revenue,
       SUM(revenue) OVER (ORDER BY d RANGE BETWEEN 6 PRECEDING AND CURRENT ROW) AS week_sum
FROM daily;      -- daily 只有有数据的日子（9/1、9/3、9/10、9/20……）
```

提示：RANGE 按值区间数日子，不按行数。

<details>
<summary>参考实现</summary>

9/3 的 week_sum = 9/1 + 9/3 两行之和——RANGE 帧取的是「d 值在 [8/28, 9/3] 区间」的行，恰好 9/1 落在区间内；但 9/10 的 week_sum 只有 9/10 自己（9/4~9/9 无行）——「最近 7 天」在缺日数据上时对时错。修复：先补日历再算。

```sql
WITH RECURSIVE calendar AS (
    SELECT MIN(d) AS d FROM daily
    UNION ALL
    SELECT d + INTERVAL 1 DAY FROM calendar
    WHERE d < (SELECT MAX(d) FROM daily)
),
filled AS (
    SELECT cal.d, COALESCE(x.revenue, 0) AS revenue
    FROM calendar cal
    LEFT JOIN daily x ON x.d = cal.d
)
SELECT d, revenue,
       SUM(revenue) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS week_sum
FROM filled;
```

修复后 ROWS 的「最近 7 行」就等于「最近 7 个自然日」（日历保证行即日）。取舍：补日历多一层 CTE 但语义正确；不补日历则必须用 RANGE 且接受缺日时的稀疏窗口——报表口径要写明是「有数据的日子往前数 7 个」还是「自然日」，两种算法给业务方的数字不一样。
</details>

练习五（实战题）：用 EXPLAIN ANALYZE 对比两条「每站 Top-1 桩」查询的耗时：写法 A（窗口 + 外层过滤）与写法 B（相关子查询计数），charger_revenue 有 50 万行、800 个站点。报告两者耗时量级差异，并给写法 A 补一个能免 filesort 的索引方案（写出 CREATE INDEX）。

提示：窗口的排序键是 (PARTITION BY station, ORDER BY revenue DESC)；EXPLAIN ANALYZE 是 8.0.18+。

<details>
<summary>参考实现</summary>

```sql
-- 写法 A
EXPLAIN ANALYZE
SELECT station, charger_id, revenue FROM (
    SELECT station, charger_id, revenue,
           ROW_NUMBER() OVER (PARTITION BY station ORDER BY revenue DESC) AS rn
    FROM charger_revenue
) t WHERE rn = 1;

-- 写法 B
EXPLAIN ANALYZE
SELECT pc.station, pc.charger_id, pc.revenue
FROM charger_revenue pc
WHERE (SELECT COUNT(*) FROM charger_revenue pc2
       WHERE pc2.station = pc.station AND pc2.revenue >= pc.revenue) = 1;

-- 免 filesort 索引（分区列在前、排序列在后）
CREATE INDEX idx_cr_station_rev ON charger_revenue (station, revenue DESC);
```

预期量级：写法 A 一次排序 + 一次顺扫（有索引则免排序），50 万行在数百毫秒内；写法 B 外层 50 万行每行跑一次计数子查询，秒级到分钟级——O(N^2) 与 O(N log N) 的差距在 50 万行上通常是两个数量级。索引说明：`(station, revenue DESC)` 让窗口的分区+排序直接按索引序扫描（EXPLAIN 里 derived 的 filesort 消失）；revenue DESC 写不写都行（8.0 起支持降序索引，不写时扫描方向反序也能免排序），写明是意图文档化。
</details>

## 与之前和之后的知识的关系

- 往前：窗口函数的通用框架与心智模型见 [窗口函数](/sql/260-WindowFunction) 与 [窗口函数框架](/sql/270-WindowFunctionFramework)；聚合与 GROUP_CONCAT 基线见 [进阶查询与多表操作](/mysql/150-AdvancedQueryMultiTableOperation)（本篇的 CTE/日历素材源头）；@row 模拟行号的 5.7 遗留见 [用户变量与动态 SQL](/mysql/125-UserVariablesAndDynamicSQL)。
- 往后：窗口查询的执行计划细节见 [EXPLAIN 详解](/mysql/320-EXPLAINDetailed) 与 [执行计划分析](/mysql/330-MySQLIndexExecutionPlan)；帧排序的索引建设依据见 [复合索引与最左前缀](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)；ONLY_FULL_GROUP_BY 与窗口的语义分界见 [服务器 SQL 模式与系统变量](/mysql/855-ServerSqlModeAndVariables)。

## 参考与致谢

- MySQL 8.0 Reference Manual, §14.20 Window Functions（引入版本、函数清单、帧语法支持范围）：https://dev.mysql.com/doc/refman/8.0/en/window-functions.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §14.20.4 Window Function Concepts and Syntax（帧单位与默认帧规则）：https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Release Notes（8.0.0 窗口函数引入、8.0.18 EXPLAIN ANALYZE）：https://dev.mysql.com/doc/relnotes/mysql/8.0/en/（GPL/CC BY-SA 许可）
- 本篇版本边界（EXCLUDE 不支持、RANGE 无 INTERVAL、8.0.0 引入）均以官方手册与 Release Notes 为依据。

## 自我检查

- 能说出窗口函数在 MySQL 的引入版本（8.0.0）与两个不支持项（EXCLUDE、RANGE 的 INTERVAL）；
- 能按业务口径在 ROW_NUMBER/RANK/DENSE_RANK 之间选型并处理并列与 NULL 排序语义；
- 能解释 LAST_VALUE 默认帧陷阱并写出扩帧修复；
- 能区分 ROWS 与 RANGE 在缺日数据上的行为差异，并写出「补日历 + ROWS」的正确方案；
- 能读懂 EXPLAIN 中窗口的 derived + 排序形态，并给出 (分区列， 排序列) 的免 filesort 索引；
- 能把 5.7 的 @row 模拟行号迁移为 ROW_NUMBER() OVER 并说清语义差异。
