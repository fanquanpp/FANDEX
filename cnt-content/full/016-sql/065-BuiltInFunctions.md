---
order: 70
title: 常用内置函数
module: 'sql'
category: 数据库
difficulty: beginner
description: 字符串、数值、日期、条件表达式四族函数：CONCAT_WS 跳 NULL、字节与字符之别、DATEDIFF 与 TIMESTAMPDIFF、NULLIF 除零保护与 CASE 两形态
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：SQL DQL / 单行函数（每行输入产出一行输出的表达式函数）。
- **解决什么问题**：数据"入库是原料、出库要成品"——电话号码要拼接展示、生日要算周岁、金额要保留两位、NULL 要兜底成默认值。这些转换写在应用层要先把行拉回来，写在 SQL 里数据库就地完成。
- **什么时候用到**：报表列加工、导出数据格式化、条件兜底（COALESCE 家族）、按规则分组打标（CASE）。
- **练习环境**：vocaloid 曲库（logo 表形象标志、vsinger 歌姬表含生日/公司/国籍、music 歌曲、producer P 主）——建表造数脚本见[曲库项目](/sql/130-SQLProjectMusicLibrary)。

## 心智模型：函数四族按"加工对象"分

| 族 | 加工对象 | 代表函数 |
| --- | --- | --- |
| 字符串 | 文本的拼、切、补、量 | CONCAT_WS / SUBSTRING / LPAD / LENGTH / CHAR_LENGTH |
| 数值 | 数的舍、取余、比大小 | ROUND / TRUNCATE / MOD / GREATEST |
| 日期 | 时间的格式化、加减、求差 | DATE_FORMAT / DATE_ADD / DATEDIFF / TIMESTAMPDIFF |
| 条件表达式 | NULL 兜底与分支打标 | IFNULL / COALESCE / NULLIF / CASE |

单行函数的共同纪律：**函数出现在 WHERE 条件里作用到"列"上，会让索引失效**（每行都要算一遍，见[性能优化](/sql/440-PerformanceOptimization)）；作用在常量或 SELECT 列表里没有这个问题。

## 字符串族：拼、切、补、量

```sql
-- 拼接：CONCAT 遇 NULL 整体变 NULL；CONCAT_WS 用分隔符且跳过 NULL
SELECT CONCAT('初音', NULL, '未来');            -- NULL（一个 NULL 毁全部）
SELECT CONCAT_WS('-', '初音', NULL, '未来');    -- '初音-未来'（NULL 被跳过）
-- 拼展示列：歌手名 + 国籍
SELECT CONCAT_WS(' / ', name, nationality) AS profile FROM vsinger;
```

为什么 `CONCAT_WS` 是报表首选：用户资料里电话、邮箱随时可能没填，CONCAT 一个 NULL 就让整列显示为空；CONCAT_WS 跳过 NULL 的语义正好匹配"有几段显示几段"。

```sql
-- 量长度：LENGTH 数字节，CHAR_LENGTH 数字符（中文场景必须分清）
SELECT LENGTH('洛天依'), CHAR_LENGTH('洛天依');
-- utf8mb4 下：9 与 3（每个汉字 3 字节）
SELECT name FROM vsinger WHERE CHAR_LENGTH(name) <= 2;   -- 两字及以内歌姬
```

换成 LENGTH 来做"字符数限制"会发生什么：长度校验莫名对中文更严格——你以为存的是 3 个字，字节口径下已经是 9。业务口径一律 CHAR_LENGTH；LENGTH 只在算存储/协议长度时用。

```sql
-- 切与定位
SELECT SUBSTRING('ダブルラリアット', 1, 6);     -- 从第 6 字符开始取（1 起始）
SELECT SUBSTRING('Rolling Girl', -4);           -- 负数从尾部数
SELECT INSTR('Rolling Girl', 'Girl');           -- 返回位置 9
SELECT LOCATE('Girl', 'Rolling Girl');          -- 同样返回 9
```

`INSTR(串, 子串)` 与 `LOCATE(子串, 串)` **参数顺序相反**——同一件事两个函数两种顺序，混用极易写出"永远返回 0"的查询。团队内约定一个用到底，或干脆全用 POSITION(x IN y) 标准写法。

```sql
-- 补零与裁剪：编号统一格式、清洗用户输入
SELECT LPAD('42', 5, '0');                      -- '00042'
SELECT TRIM('  千本桜  ');                       -- '千本桜'
SELECT REPLACE('初音ミク', 'ミク', '未来');      -- '初音未来'
```

## 数值族：舍入、取余、比大小

```sql
SELECT ROUND(123.4567, 2);     -- 123.46 四舍五入到 2 位
SELECT TRUNCATE(123.4567, 2);  -- 123.45 直接截断，不进位
SELECT CEIL(10.1), FLOOR(10.9); -- 11 与 10
SELECT MOD(17, 5);             -- 2 取余（同 17 % 5）
SELECT GREATEST(3, 7, 5), LEAST(3, 7, 5);  -- 7 与 3
```

ROUND 与 TRUNCATE 的选择看业务：金额显示用 ROUND（四舍五入是财务习惯），**分摊计算用 TRUNCATE**（每份向下截断，余数最后补——四舍五入逐份累加会"多出几分钱"）。配 DECIMAL 列使用（见[数据类型](/sql/090-DataType)），FLOAT 上做 ROUND 有二进制表示误差。

## 日期族：格式化、运算、求差

```sql
-- 格式化输出
SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i');     -- '2026-10-07 14:30'
SELECT DATE_FORMAT(birthday, '%m-%d') AS md      -- 每年生日提醒只要月日
FROM vsinger;

-- 日期运算：加减
SELECT DATE_ADD(NOW(), INTERVAL 10000 DAY);      -- 万日纪念（10 周年整）
SELECT NOW() - INTERVAL 7 DAY;                   -- 一周前（等价 DATE_SUB）

-- 求差：DATEDIFF 只算天数，TIMESTAMPDIFF 能选单位
SELECT DATEDIFF('2026-10-07', '2007-08-31');     -- 天数差（前 - 后）
SELECT TIMESTAMPDIFF(YEAR, birthday, NOW()) AS age FROM vsinger;  -- 周岁
```

算周岁为什么必须 TIMESTAMPDIFF 而不是 DATEDIFF 除以 365：闰年与生日未到两种情况都会算错——TIMESTAMPDIFF(YEAR,...) 按日历口径取整，是唯一不出"半岁人"的写法。两者方向也相反：DATEDIFF 是"后减前"参数序在前，TIMESTAMPDIFF 是"单位在前，减数在后"，写错方向得到负数是高频 bug。

## 条件表达式族：NULL 兜底与分支打标

```sql
-- IFNULL（两参）与 COALESCE（多参，SQL 标准）
SELECT IFNULL(nickname, name) FROM vsinger;              -- 没昵称显示本名
SELECT COALESCE(nickname, en_name, name, '无名') FROM vsinger;  -- 逐个兜底

-- NULLIF：两值相等返回 NULL——除零保护的标准写法
SELECT total / NULLIF(cnt, 0) FROM stats;   -- cnt=0 时结果为 NULL 而不是报错
```

`total / 0` 在 MySQL 里返回 NULL（受 ERROR_FOR_DIVISION_BY_ZERO 模式影响可能直接报错），在标准 SQL 与 PG 里直接抛错。`x / NULLIF(y, 0)` 是跨方言都安全的除法模板。

```sql
-- CASE 两种形态
-- 搜索 CASE：按条件区间打标（身高口径）
SELECT name, height,
  CASE
    WHEN height >= 160 THEN '高挑'
    WHEN height >= 155 THEN '标准'
    ELSE '小巧'
  END AS build
FROM vsinger;

-- 简单 CASE：按值映射（公司 → 企划名）
SELECT name,
  CASE company
    WHEN '上海禾念' THEN 'Vsinger'
    WHEN 'CRYPTON' THEN 'Character Vocal'
    ELSE '其他'
  END AS project
FROM vsinger;
```

两种形态的判别：条件是**区间/多列组合**只能搜索 CASE；是**单列等值映射**用简单 CASE 更清爽。CASE 表达式是**表达式**不是语句——可以出现在 SELECT、ORDER BY、甚至聚合内部（`SUM(CASE WHEN ... THEN 1 ELSE 0 END)` 是条件计数的通用写法，PG 有 FILTER 语法糖但 MySQL 没有）。别忘了 END 与 ELSE 兜底：没有 ELSE 且条件全不中时结果是 NULL，报表上会神秘缺数。

## 方言差异速查

| 能力 | MySQL | PostgreSQL | SQL Server |
| --- | --- | --- | --- |
| 拼接 | CONCAT / CONCAT_WS | `||` 或 CONCAT | CONCAT / + |
| 当前时间 | NOW() | NOW() | GETDATE() |
| 空值兜底 | IFNULL / COALESCE | COALESCE | ISNULL / COALESCE |
| 日期加减 | DATE_ADD + INTERVAL | `d + INTERVAL '1 day'` | DATEADD(day, 1, d) |
| 日期格式化 | DATE_FORMAT('%Y') | TO_CHAR('YYYY') | FORMAT / CONVERT |
| 条件函数 | IF(a,b,c) | 无（用 CASE） | 无（用 CASE / IIF） |

移植红线：MySQL 的 IF()、DATE_FORMAT 的 % 占位符、CONVERT 参数序都与标准不同——写"库内加工"逻辑时优先用三方言共有的 COALESCE/CASE/标准 CAST，把方言函数留在单库项目里。

## 动手实践：曲库报表改造

任务（在 vocaloid 练习库上）：

1. 出一列"档期"：入社满 10 年标"元老"，满 5 年标"中坚"，否则"新声"（提示：CASE + TIMESTAMPDIFF）;
2. 把歌姬的应援色 HEX（logo 表）格式化成 `#RRGGBB` 展示，缺色显示"未定"（提示：CONCAT_WS + LPAD 或 IFNULL）;
3. 写除零安全的"人均作品数"统计（提示：NULLIF）;
4. 把 3 里所有能改写成 CASE 的 IF() 都改写一遍，对比可读性。

<details>
<summary>参考实现（先自己写再展开）</summary>

```sql
-- 1
SELECT name, company,
  CASE
    WHEN TIMESTAMPDIFF(YEAR, debut_date, NOW()) >= 10 THEN '元老'
    WHEN TIMESTAMPDIFF(YEAR, debut_date, NOW()) >= 5  THEN '中坚'
    ELSE '新声'
  END AS seniority
FROM vsinger;

-- 2
SELECT v.name,
       CONCAT_WS('', '#', UPPER(l.color_hex)) AS color_display
FROM vsinger v LEFT JOIN logo l ON l.logo_id = v.logo_id;
-- 或：COALESCE(NULLIF(TRIM(l.color_hex), ''), '未定') 处理空串与 NULL

-- 3
SELECT c.company,
       COUNT(m.music_id) / NULLIF(COUNT(DISTINCT v.vsinger_id), 0) AS songs_per_singer
FROM vsinger v
LEFT JOIN music m ON m.vsinger_id = v.vsinger_id
LEFT JOIN producer c ON c.producer_id = m.producer_id
GROUP BY c.company;
```

判读要点：任务 2 若出现 `#null`，说明 CONCAT 把 NULL 拼了进来——这正是 CONCAT_WS 登场的信号。任务 4 的经验法则：IF() 嵌套超过两层就该换 CASE。
</details>

## 检验清单

- 能说出 CONCAT 与 CONCAT_WS 对 NULL 的行为差异并正确选型；
- 能解释 LENGTH 与 CHAR_LENGTH 的口径差，以及为什么中文业务校验用后者；
- 会用 TIMESTAMPDIFF 算周岁并解释 DATEDIFF 的两个坑（口径与参数方向）；
- 能默写 `x / NULLIF(y, 0)` 除零模板并解释原理；
- 能判别 CASE 两种形态的适用场景，并记得 ELSE 兜底。

## 下一步

- [数据类型](/sql/090-DataType)：函数加工之前的类型选型（DECIMAL 与金额）；
- [聚合分组](/sql/060-AggregateFunction)：单行函数与聚合函数（多行进一行出）的边界；
- [执行计划](/sql/430-ExecutionPlan)：验证"WHERE 里套函数导致索引失效"。

## 参考与致谢

- MySQL 8.0 官方文档 Chapter 12 Functions and Operators（GPLv2 文档许可）：<https://dev.mysql.com/doc/refman/8.0/en/functions.html>
- 示例数据取自仓库扫描素材 vocaloid 曲库（自建教学数据）。
