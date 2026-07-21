# MySQL SQL 函数与高级查询

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 字符串函数

**单行写法：CONCAT 连接字符串**
`CONCAT(<字符串1>[, <字符串2>...])`
```sql
-- 连接用户名和邮箱
SELECT CONCAT(username, ' (', email, ')') AS user_info FROM users;
```

**单行写法：CONCAT_WS 带分隔符连接**
`CONCAT_WS('<分隔符>', <字符串1>[, <字符串2>...])`
```sql
-- 带分隔符连接地址字段
SELECT CONCAT_WS('-', province, city, district) AS full_address FROM addresses;
```

**单行写法：LENGTH 字节长度**
`LENGTH(<字符串>)`
```sql
-- 获取用户名的字节长度
SELECT LENGTH(username) AS name_bytes FROM users;
```

**单行写法：CHAR_LENGTH 字符长度**
`CHAR_LENGTH(<字符串>)`
```sql
-- 获取用户名的字符长度
SELECT CHAR_LENGTH(username) AS name_chars FROM users;
```

**单行写法：SUBSTRING 截取字符串**
`SUBSTRING(<字符串>, <起始位置>[, <长度>])`
```sql
-- 截取手机号前 3 位
SELECT SUBSTRING(phone, 1, 3) AS phone_prefix FROM users;
```

**单行写法：LEFT 从左截取**
`LEFT(<字符串>, <长度>)`
```sql
-- 从左截取用户名前 2 位
SELECT LEFT(username, 2) FROM users;
```

**单行写法：RIGHT 从右截取**
`RIGHT(<字符串>, <长度>)`
```sql
-- 从右截取用户名后 2 位
SELECT RIGHT(username, 2) FROM users;
```

**单行写法：TRIM 去除首尾空格**
`TRIM(<字符串>)`
```sql
-- 去除字符串首尾空格
SELECT TRIM(' Hello ');
```

**单行写法：LOWER 转小写**
`LOWER(<字符串>)`
```sql
-- 将邮箱转为小写
SELECT LOWER(email) AS email_lower FROM users;
```

**单行写法：UPPER 转大写**
`UPPER(<字符串>)`
```sql
-- 将用户名转为大写
SELECT UPPER(username) AS name_upper FROM users;
```

**单行写法：REPLACE 替换字符串**
`REPLACE(<字符串>, '<旧子串>', '<新子串>')`
```sql
-- 替换字符串中的字符
SELECT REPLACE('Hello', 'l', 'w');
```

**单行写法：REVERSE 反转字符串**
`REVERSE(<字符串>)`
```sql
-- 反转字符串
SELECT REVERSE('Hello');
```

**单行写法：LPAD 左填充**
`LPAD(<字符串>, <长度>, '<填充字符>')`
```sql
-- 左填充数字到 3 位
SELECT LPAD('5', 3, '0');
```

**单行写法：RPAD 右填充**
`RPAD(<字符串>, <长度>, '<填充字符>')`
```sql
-- 右填充字符串到 5 位
SELECT RPAD('5', 5, '0');
```

**单行写法：INSTR 查找子串位置**
`INSTR(<字符串>, '<子串>')`
```sql
-- 查找子串位置
SELECT INSTR('Hello', 'll');
```

---

## 日期时间函数

**单行写法：NOW 当前日期时间**
`NOW()`
```sql
-- 获取当前日期时间
SELECT NOW() AS now;
```

**单行写法：CURDATE 当前日期**
`CURDATE()`
```sql
-- 获取当前日期
SELECT CURDATE() AS today;
```

**单行写法：CURTIME 当前时间**
`CURTIME()`
```sql
-- 获取当前时间
SELECT CURTIME() AS current_time;
```

**单行写法：DATE 提取日期**
`DATE(<日期时间>)`
```sql
-- 提取日期部分
SELECT DATE('2024-01-15 10:30:00');
```

**单行写法：TIME 提取时间**
`TIME(<日期时间>)`
```sql
-- 提取时间部分
SELECT TIME('2024-01-15 10:30:00');
```

**单行写法：YEAR 提取年份**
`YEAR(<日期>)`
```sql
-- 提取当前年份
SELECT YEAR(NOW());
```

**单行写法：MONTH 提取月份**
`MONTH(<日期>)`
```sql
-- 提取当前月份
SELECT MONTH(NOW());
```

**单行写法：DAY 提取日**
`DAY(<日期>)`
```sql
-- 提取当前日
SELECT DAY(NOW());
```

**单行写法：HOUR 提取小时**
`HOUR(<时间>)`
```sql
-- 提取当前小时
SELECT HOUR(NOW());
```

**单行写法：MINUTE 提取分钟**
`MINUTE(<时间>)`
```sql
-- 提取当前分钟
SELECT MINUTE(NOW());
```

**单行写法：SECOND 提取秒**
`SECOND(<时间>)`
```sql
-- 提取当前秒
SELECT SECOND(NOW());
```

**单行写法：DATE_FORMAT 格式化日期**
`DATE_FORMAT(<日期>, '<格式>')`
```sql
-- 格式化日期显示
SELECT DATE_FORMAT(NOW(), '%Y年%m月%d日 %H:%i:%s') AS formatted;
```

**单行写法：DATE_ADD 日期加**
`DATE_ADD(<日期>, INTERVAL <值> <单位>)`
```sql
-- 日期加 7 天
SELECT DATE_ADD(NOW(), INTERVAL 7 DAY) AS next_week;
```

**单行写法：DATE_SUB 日期减**
`DATE_SUB(<日期>, INTERVAL <值> <单位>)`
```sql
-- 日期减 1 个月
SELECT DATE_SUB(NOW(), INTERVAL 1 MONTH) AS last_month;
```

**单行写法：DATEDIFF 日期差**
`DATEDIFF(<日期1>, <日期2>)`
```sql
-- 计算注册至今天数
SELECT DATEDIFF(NOW(), created_at) AS days_since_join FROM users;
```

**单行写法：TIMESTAMPDIFF 时间差**
`TIMESTAMPDIFF(<单位>, <开始>, <结束>)`
```sql
-- 计算注册至今年数
SELECT TIMESTAMPDIFF(YEAR, created_at, NOW()) AS years_since_join FROM users;
```

**单行写法：计算年龄**
`TIMESTAMPDIFF(YEAR, <生日列>, NOW())`
```sql
-- 根据生日计算年龄
SELECT TIMESTAMPDIFF(YEAR, birthday, NOW()) AS age FROM users;
```

**单行写法：DAYOFWEEK 星期几**
`DAYOFWEEK(<日期>)`
```sql
-- 获取星期几
SELECT DAYOFWEEK(NOW());
```

**单行写法：LAST_DAY 月份最后一天**
`LAST_DAY(<日期>)`
```sql
-- 获取月份最后一天
SELECT LAST_DAY('2024-01-15');
```

---

## 数值函数

**单行写法：ABS 绝对值**
`ABS(<数值>)`
```sql
-- 获取绝对值
SELECT ABS(-10);
```

**单行写法：ROUND 四舍五入**
`ROUND(<数值>[, <小数位>])`
```sql
-- 四舍五入保留 2 位小数
SELECT ROUND(price, 2) AS rounded FROM products;
```

**单行写法：CEIL 向上取整**
`CEIL(<数值>)`
```sql
-- 向上取整
SELECT CEIL(price) AS ceil_price FROM products;
```

**单行写法：FLOOR 向下取整**
`FLOOR(<数值>)`
```sql
-- 向下取整
SELECT FLOOR(price) AS floor_price FROM products;
```

**单行写法：MOD 取模**
`MOD(<数值1>, <数值2>)`
```sql
-- 取模运算
SELECT MOD(10, 3);
```

**单行写法：POW 幂运算**
`POW(<底数>, <指数>)`
```sql
-- 幂运算
SELECT POW(2, 3);
```

**单行写法：SQRT 平方根**
`SQRT(<数值>)`
```sql
-- 平方根
SELECT SQRT(16);
```

**单行写法：RAND 随机数**
`RAND()`
```sql
-- 随机排序取 5 行
SELECT * FROM users ORDER BY RAND() LIMIT 5;
```

**单行写法：TRUNCATE 截断**
`TRUNCATE(<数值>, <小数位>)`
```sql
-- 截断到 3 位小数
SELECT TRUNCATE(3.14159, 3);
```

**单行写法：SIGN 符号**
`SIGN(<数值>)`
```sql
-- 获取数值符号
SELECT SIGN(-10);
```

---

## 条件函数

**单行写法：IF 条件判断**
`IF(<条件>, <真值>, <假值>)`
```sql
-- 根据年龄判断成人或未成年
SELECT username, age, IF(age >= 18, '成人', '未成年') AS age_desc FROM users;
```

**单行写法：IFNULL NULL 替换**
`IFNULL(<值>, <默认值>)`
```sql
-- 替换 NULL 值为默认值
SELECT username, IFNULL(email, '未填写') AS email FROM users;
```

**单行写法：嵌套 IFNULL**
`IFNULL(<值>, IFNULL(<值2>, <默认值>))`
```sql
-- 嵌套 IFNULL 处理多个可能为空的字段
SELECT IFNULL(phone, IFNULL(telephone, '无')) AS contact FROM users;
```

**单行写法：NULLIF 相等返回 NULL**
`NULLIF(<值1>, <值2>)`
```sql
-- 两值相等返回 NULL
SELECT NULLIF(a, b);
```

**换行写法：CASE WHEN 多条件判断**
`CASE WHEN <条件> THEN <值> [WHEN ...] [ELSE <值>] END`
```sql
-- 多条件判断年龄分组
SELECT
  username,
  age,
  CASE
    WHEN age < 18 THEN '未成年'
    WHEN age < 30 THEN '青年'
    WHEN age < 60 THEN '中年'
    ELSE '老年'
  END AS age_group
FROM users;
```

**换行写法：CASE 表达式等值匹配**
`CASE <表达式> WHEN <值> THEN <结果> [WHEN ...] [ELSE <结果>] END`
```sql
-- 等值匹配状态值
SELECT
  username,
  CASE status
    WHEN 1 THEN '正常'
    WHEN 2 THEN '冻结'
    WHEN 0 THEN '禁用'
    ELSE '未知'
  END AS status_desc
FROM users;
```

**换行写法：CASE 聚合条件计数**
`SUM(CASE WHEN <条件> THEN 1 ELSE 0 END)`
```sql
-- 条件计数统计不同状态数量
SELECT
  SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS active_count,
  SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS inactive_count
FROM users;
```

---

## 类型转换与系统函数

**单行写法：CAST 类型转换**
`CAST(<值> AS <类型>)`
```sql
-- 将价格转换为字符类型
SELECT CAST(price AS CHAR) FROM products;
```

**单行写法：CONVERT 类型转换**
`CONVERT(<值>, <类型>)`
```sql
-- 将价格转换为 DECIMAL 类型
SELECT CONVERT(price, DECIMAL(10,2)) FROM products;
```

**单行写法：FORMAT 格式化数字**
`FORMAT(<数值>, <小数位>)`
```sql
-- 格式化数字带千位分隔符
SELECT FORMAT(price, 2) AS price_formatted FROM products;
```

**单行写法：MD5 哈希**
`MD5('<字符串>')`
```sql
-- 计算 MD5 哈希
SELECT MD5('password') AS md5_hash;
```

**单行写法：SHA1 哈希**
`SHA1('<字符串>')`
```sql
-- 计算 SHA1 哈希
SELECT SHA1('password') AS sha1_hash;
```

**单行写法：SHA2 哈希**
`SHA2('<字符串>', <长度>)`
```sql
-- 计算 SHA256 哈希
SELECT SHA2('password', 256) AS sha256_hash;
```

**单行写法：UUID 生成**
`UUID()`
```sql
-- 生成 UUID
SELECT UUID() AS uuid;
```

**单行写法：SET 用户变量**
`SET @<变量名> = <值>`
```sql
-- 设置用户变量
SET @total = 0;
```

**单行写法：SELECT 变量累加**
`SELECT @<变量名> := @<变量名> + <表达式>`
```sql
-- 用户变量累加
SELECT @total := @total + price FROM products;
```

---

## 子查询

**单行写法：标量子查询最大值**
`SELECT * FROM <表名> WHERE <列名> = (SELECT MAX(<列名>) FROM <表名>)`
```sql
-- 查询年龄最大的用户
SELECT * FROM users WHERE age = (SELECT MAX(age) FROM users);
```

**单行写法：标量子查询平均值**
`SELECT * FROM <表名> WHERE <列名> > (SELECT AVG(<列名>) FROM <表名>)`
```sql
-- 查询年龄大于平均年龄的用户
SELECT * FROM users WHERE age > (SELECT AVG(age) FROM users);
```

**单行写法：用子查询更新**
`UPDATE <表名> SET <列名> = (SELECT <聚合> FROM <表名>) WHERE <条件>`
```sql
-- 用子查询结果更新字段
UPDATE users SET age = (SELECT MAX(age) FROM users) + 1 WHERE id = 1;
```

**单行写法：IN 子查询**
`WHERE <列名> IN (SELECT <列名> FROM <表名>)`
```sql
-- 查询属于 VIP 用户表的用户
SELECT * FROM users WHERE id IN (SELECT user_id FROM vip_users);
```

**单行写法：NOT IN 子查询**
`WHERE <列名> NOT IN (SELECT <列名> FROM <表名>)`
```sql
-- 查询不在黑名单中的用户
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM blocked_users);
```

**单行写法：ANY 子查询**
`WHERE <列名> <操作符> ANY (SELECT ...)`
```sql
-- 满足子查询中任意一个值
SELECT * FROM products WHERE price > ANY (SELECT price FROM products WHERE category_id = 1);
```

**单行写法：ALL 子查询**
`WHERE <列名> <操作符> ALL (SELECT ...)`
```sql
-- 满足子查询中所有值
SELECT * FROM products WHERE price > ALL (SELECT price FROM products WHERE status = 0);
```

**换行写法：EXISTS 子查询**
`WHERE EXISTS (SELECT 1 FROM <表名> WHERE <条件>)`
```sql
-- 查询有订单的用户
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

**换行写法：NOT EXISTS 子查询**
`WHERE NOT EXISTS (SELECT 1 FROM <表名> WHERE <条件>)`
```sql
-- 查询没有订单的用户
SELECT * FROM users u WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

**换行写法：FROM 子查询作为临时表**
`SELECT * FROM (SELECT ...) AS <别名>`
```sql
-- 子查询作为临时表查询
SELECT * FROM (SELECT * FROM users WHERE status = 1) AS active_users;
```

**换行写法：分组统计子查询**
`SELECT * FROM (SELECT <列名>, <聚合> FROM <表名> GROUP BY <列名>) AS <别名>`
```sql
-- 分组统计子查询
SELECT * FROM (
  SELECT status, COUNT(*) AS count, AVG(age) AS avg_age
  FROM users
  GROUP BY status
) AS stats;
```

**换行写法：SELECT 列子查询**
`SELECT <列名>, (SELECT ...) AS <别名>`
```sql
-- 列子查询统计订单数
SELECT
  u.id,
  u.username,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
```

**换行写法：SELECT 列子查询最新时间**
`SELECT <列名>, (SELECT MAX(<列名>) FROM <表名> WHERE <条件>) AS <别名>`
```sql
-- 查询用户最新订单时间
SELECT
  u.id,
  u.username,
  (SELECT MAX(created_at) FROM orders WHERE user_id = u.id) AS last_order_time
FROM users u;
```

---

## 多表查询

**换行写法：两表内连接**
`SELECT <列名> FROM <表1> [AS <别名>] INNER JOIN <表2> [AS <别名>] ON <条件>`
```sql
-- 两表内连接查询
SELECT u.username, o.order_no, o.total_amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

**换行写法：多表内连接**
`SELECT <列名> FROM <表1> JOIN <表2> ON <条件> JOIN <表3> ON <条件>`
```sql
-- 多表内连接查询
SELECT u.username, o.order_no, p.product_name, oi.quantity
FROM users u
INNER JOIN orders o ON u.id = o.user_id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id;
```

**换行写法：USING 简写内连接**
`SELECT <列名> FROM <表1> INNER JOIN <表2> USING (<列名>)`
```sql
-- 使用 USING 简写连接条件
SELECT u.username, o.order_no
FROM users u
INNER JOIN orders o USING (user_id);
```

**换行写法：左连接**
`SELECT <列名> FROM <表1> LEFT JOIN <表2> ON <条件>`
```sql
-- 左连接查询左表全部数据
SELECT u.username, o.order_no, o.total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

**换行写法：左连接分组统计**
`SELECT <列名>, COUNT(<列名>) FROM <表1> LEFT JOIN <表2> ON <条件> GROUP BY <列名>`
```sql
-- 左连接分组统计订单数
SELECT u.username, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username;
```

**换行写法：左连接找出无关联数据**
`SELECT <列名> FROM <表1> LEFT JOIN <表2> ON <条件> WHERE <表2.列> IS NULL`
```sql
-- 找出没有订单的用户
SELECT u.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

**换行写法：右连接**
`SELECT <列名> FROM <表1> RIGHT JOIN <表2> ON <条件>`
```sql
-- 右连接查询右表全部数据
SELECT u.username, o.order_no
FROM users u
RIGHT JOIN orders o ON u.id = o.user_id;
```

**换行写法：自连接**
`SELECT <列名> FROM <表> [AS <别名1>] JOIN <表> [AS <别名2>] ON <条件>`
```sql
-- 员工与经理自连接
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

**换行写法：UNION 实现全连接**
`SELECT ... LEFT JOIN ... UNION SELECT ... RIGHT JOIN ...`
```sql
-- MySQL 用 UNION 实现 FULL OUTER JOIN
SELECT u.username, o.order_no
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
UNION
SELECT u.username, o.order_no
FROM users u
RIGHT JOIN orders o ON u.id = o.user_id;
```

**换行写法：交叉连接**
`SELECT <列名> FROM <表1> CROSS JOIN <表2>`
```sql
-- 笛卡尔积交叉连接
SELECT u.username, p.product_name
FROM users u
CROSS JOIN products p;
```

---

## UNION 合并查询

**换行写法：UNION 去重合并**
`SELECT ... UNION SELECT ...`
```sql
-- 合并结果集并去重
SELECT username FROM users WHERE status = 1
UNION
SELECT username FROM users WHERE age > 30;
```

**换行写法：UNION ALL 保留重复合并**
`SELECT ... UNION ALL SELECT ...`
```sql
-- 合并结果集保留重复
SELECT username FROM users WHERE status = 1
UNION ALL
SELECT username FROM users WHERE age > 30;
```
