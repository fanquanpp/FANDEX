---
order: 810
title: 触发器与事件
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL触发器（BEFORE/AFTER、INSERT/UPDATE/DELETE）与事件调度器详解。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'mysql/440-MVCCSnapshotCurrentRead'
  - 'mysql/400-IndexPrinciplePerformanceOptimization'
  - 'mysql/520-RedoUndoBinlogWriteTiming'
  - 'mysql/530-TwoPhaseCommit'
prerequisites:
  - 'mysql/160-View'
---

## 知识点地图

- **知识类别**：MySQL 的「触发器」——与表绑定的行级自动逻辑：BEFORE 触发器做验证与自动填充、AFTER 触发器做审计日志与跨表同步、NEW/OLD 关键字读写行数据、标志变量做批量开关、触发器内的死锁规避。
- **解决什么问题**：审计日志要在「任何写入路径」（多个应用、DBA 手工改数、批量脚本）下都不漏——触发器是唯一挂在表上而不是挂在代码上的哨兵；级联维护（删学生连带删成绩）在不能改应用代码或不建外键的库上需要一个数据库侧的执行点。
- **什么时候用到**：审计与合规留痕、行级数据同步（订单联动库存/客户统计）、 BEFORE 兜底与 SIGNAL 校验。**分工边界**：定时任务（按时间而不是按行触发）归 [事件调度器](/mysql/790-EventScheduler) 专篇，本篇只留桥接；约束类的完整性（CHECK/外键）优先用 [约束与完整性](/mysql/075-ConstraintsIntegrityEnforcement)——触发器是「约束表达不了时的最后手段」而不是第一选择。

## 前置知识

建议先阅读以下内容再进入本文：

- [视图语法速查手册](/mysql/160-View)

## 1. 触发器基础

### 1.1 什么是触发器

触发器是与表关联的数据库对象，在特定事件（INSERT、UPDATE、DELETE）发生时自动执行。

**触发器类型**：

| 触发时机 | 事件   | 说明       |
| :------- | :----- | :--------- |
| BEFORE   | INSERT | 插入前触发 |
| AFTER    | INSERT | 插入后触发 |
| BEFORE   | UPDATE | 更新前触发 |
| AFTER    | UPDATE | 更新后触发 |
| BEFORE   | DELETE | 删除前触发 |
| AFTER    | DELETE | 删除后触发 |

### 1.2 创建触发器

```sql
-- 基本语法
CREATE TRIGGER trigger_name
{BEFORE | AFTER} {INSERT | UPDATE | DELETE}
ON table_name
FOR EACH ROW
BEGIN
    -- 触发器逻辑
END;

-- 示例：插入用户后记录日志
DELIMITER //

CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_audit_log (user_id, action, action_time, details)
    VALUES (NEW.id, 'INSERT', NOW(), CONCAT('Created user: ', NEW.username));
END //

DELIMITER ;
```

### 1.3 NEW 和 OLD 关键字

```sql
-- NEW: 新数据（INSERT/UPDATE可用）
-- OLD: 旧数据（UPDATE/DELETE可用）

-- INSERT: 只有NEW
-- UPDATE: 有NEW和OLD
-- DELETE: 只有OLD

DELIMITER //

-- 记录用户信息变更
CREATE TRIGGER before_user_update
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    -- 检查用户名是否变更
    IF OLD.username != NEW.username THEN
        INSERT INTO user_change_log (user_id, field_name, old_value, new_value, changed_at)
        VALUES (OLD.id, 'username', OLD.username, NEW.username, NOW());
    END IF;

    -- 检查邮箱是否变更
    IF OLD.email != NEW.email THEN
        INSERT INTO user_change_log (user_id, field_name, old_value, new_value, changed_at)
        VALUES (OLD.id, 'email', OLD.email, NEW.email, NOW());
    END IF;
END //

DELIMITER ;
```

## 2. BEFORE 触发器

### 2.1 数据验证

```sql
DELIMITER //

-- 验证员工薪资不能低于最低标准
CREATE TRIGGER before_salary_update
BEFORE UPDATE ON employees
FOR EACH ROW
BEGIN
    IF NEW.salary < 3000 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '薪资不能低于最低标准3000元';
    END IF;
END //

-- 验证订单金额
CREATE TRIGGER before_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.total_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '订单金额必须大于0';
    END IF;

    -- 自动设置订单日期
    IF NEW.order_date IS NULL THEN
        SET NEW.order_date = CURDATE();
    END IF;
END //

DELIMITER ;
```

### 2.2 数据自动填充

```sql
DELIMITER //

-- 自动计算商品总价
CREATE TRIGGER before_order_item_insert
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
    SET NEW.line_total = NEW.quantity * NEW.unit_price;
END //

-- 自动更新修改时间
CREATE TRIGGER before_product_update
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END //

-- 自动生成订单编号
CREATE TRIGGER before_order_insert2
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_no IS NULL THEN
        SET NEW.order_no = CONCAT('ORD', DATE_FORMAT(NOW(), '%Y%m%d'),
            LPAD((SELECT COUNT(*) FROM orders WHERE order_date = CURDATE()) + 1, 4, '0'));
    END IF;
END //

-- 条件默认值：时间戳盖戳 + 状态列缺省兜底
CREATE TRIGGER before_user_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  SET NEW.created_at = NOW();
  SET NEW.updated_at = NOW();
  IF NEW.status IS NULL THEN
    SET NEW.status = 1;
  END IF;
END //

DELIMITER ;
```

`before_user_insert` 展示了 BEFORE 触发器最典型的两个职责叠加：无条件职责（盖时间戳）与条件职责（状态列没传就兜底为 1）。注意它是 `IF NEW.status IS NULL` 而不是 `= NULL`——NULL 与任何值比较都得 UNKNOWN，用 `=` 判断永远为假，这是触发器里最经典的逻辑错误。这段逻辑与列定义里的 `DEFAULT 1` 功能相近但层次不同：DEFAULT 是"INSERT 语句没列到这个字段"时生效，触发器的兜底连"显式插了 NULL"也拦得住。

## 3. AFTER 触发器

### 3.1 审计日志

```sql
DELIMITER //

-- 通用审计触发器
CREATE TRIGGER after_product_insert
AFTER INSERT ON products
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_data, action_time)
    VALUES ('products', NEW.id, 'INSERT',
            JSON_OBJECT('name', NEW.name, 'price', NEW.price, 'stock', NEW.stock),
            NOW());
END //

CREATE TRIGGER after_product_update
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, action_time)
    VALUES ('products', NEW.id, 'UPDATE',
            JSON_OBJECT('name', OLD.name, 'price', OLD.price, 'stock', OLD.stock),
            JSON_OBJECT('name', NEW.name, 'price', NEW.price, 'stock', NEW.stock),
            NOW());
END //

CREATE TRIGGER after_product_delete
AFTER DELETE ON products
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_data, action_time)
    VALUES ('products', OLD.id, 'DELETE',
            JSON_OBJECT('name', OLD.name, 'price', OLD.price, 'stock', OLD.stock),
            NOW());
END //

DELIMITER ;
```

### 3.2 数据同步

```sql
DELIMITER //

-- 订单创建后更新库存
CREATE TRIGGER after_order_item_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
END //

-- 订单取消后恢复库存
CREATE TRIGGER after_order_item_delete
AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
    UPDATE products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;
END //

-- 更新客户统计信息
CREATE TRIGGER after_order_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    UPDATE customers
    SET total_orders = total_orders + 1,
        total_spent = total_spent + NEW.total_amount,
        last_order_date = NEW.order_date
    WHERE id = NEW.customer_id;
END //

-- 状态变更专项日志：只记"状态真的变了"的行
CREATE TRIGGER after_order_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO order_status_log (order_id, old_status, new_status, changed_at)
    VALUES (OLD.id, OLD.status, NEW.status, NOW());
  END IF;
END //

DELIMITER ;
```

`after_order_update` 的关键是 `IF OLD.status != NEW.status` 这道闸：UPDATE 语句可以一行不改任何值（比如只是盖时间戳的例行更新），没有这道闸日志表会被无效行灌爆。审计类触发器都要先问一句——**这个变化值得记吗**，把判断放进触发器而不是事后过滤。

### 3.3 级联维护：真实教学项目的两个触发器

教学项目「学生-课程-成绩」库里有两个真实触发的级联触发器（e-core 项目 tri01/tri02），它们与外键级联（[ON DELETE CASCADE](/mysql/075-ConstraintsIntegrityEnforcement)）是**替代关系**——老库没有外键时，级联靠触发器实现：

```sql
-- tri01：删学生时级联删掉他的全部成绩（替代外键 ON DELETE CASCADE）
DELIMITER //
CREATE TRIGGER tri01
AFTER DELETE ON Student
FOR EACH ROW
BEGIN
    DELETE FROM Mark WHERE StudentNo = OLD.StudentNo;
END //
DELIMITER ;

-- tri02：课程号变更时同步全部成绩单上的课程号
-- （IF 闸：课程号没变就什么都不做，避免无效触发）
DELIMITER //
CREATE TRIGGER tri02
AFTER UPDATE ON Course
FOR EACH ROW
BEGIN
    IF OLD.CourseNo != NEW.CourseNo THEN
        UPDATE Mark SET CourseNo = NEW.CourseNo WHERE CourseNo = OLD.CourseNo;
    END IF;
END //
DELIMITER ;
```

逐段讲这两个例子的共同骨架：触发时机选 **AFTER**（主表变更成功后才动从表——若 BEFORE 就把成绩删了、学生却删除失败，成绩就白删了）；IF 闸在 tri02 上是必需的（UPDATE 高频发生、课程号变更罕见），tri01 的 DELETE 事件本身罕见可省。与外键级联的取舍：外键是引擎内实现（快、有约束语义、能 RESTRICT），触发器是 SQL 层执行（慢一点、能写任意逻辑如「删学生前先把成绩归档到历史表」）——**纯级联用外键，级联时还要做额外动作才用触发器**。

### 3.4 批量开关：标志变量跳过触发器

MySQL 没有官方的「禁用触发器」开关（要删了重建），批量操作的通行替代是**会话级标志变量**：

```sql
-- 触发器侧：标志变量没置位才干活
DELIMITER //
CREATE TRIGGER before_product_update
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
    IF @skip_trigger IS NULL OR @skip_trigger = 0 THEN
        SET NEW.updated_at = NOW();
    END IF;
END //
DELIMITER ;

-- 批量操作侧：临时置位、做完复位（同一会话内有效）
SET @skip_trigger = 1;
UPDATE products SET price = price * 1.1;    -- 这次批量调价不盖修改时间戳
SET @skip_trigger = 0;
```

机制解释：`@skip_trigger` 是会话级用户变量（作用域与求值规则见 [用户变量与动态 SQL](/mysql/125-UserVariablesAndDynamicSQL)），触发器体运行在**发起写入的会话**里所以读得到它——批量调价在置位会话里跳过盖戳，其他会话的零星更新不受影响。两个坑要标注：其一，**忘记复位**会让本会话后续所有写入都绕过触发器（SET 后立即配对写复位语句，最好放事务里）；其二，触发器的分支逻辑从此有两条执行路径，审计类触发器慎用开关——审计被跳过恰恰通常是合规事故。

## 4. 事件调度器：归 790 专篇

按时间而不是按行触发的调度逻辑（每夜清理、每小时汇总、一次性延迟任务）属于**事件调度器**主题，本篇不再展开第二份：启用开关（event_scheduler）、AT/EVERY 两种调度形态、ON COMPLETION 生命周期、跑没跑的排查方法、与 crontab/应用调度的选型对比，全部内容见专篇 [事件调度器](/mysql/790-EventScheduler)。

一句话分界：**触发器挂在「某行变了」上，事件挂在「时间到了」上**——订单写入联动库存是触发器，每晚 2 点清过期会话是事件。

## 5. 常见问题与解决方案

### 5.1 触发器导致的性能问题

```sql
-- 问题：触发器链式执行导致性能下降
-- 解决方案：
-- 1. 避免触发器中触发其他触发器
-- 2. 触发器逻辑尽量简单
-- 3. 批量操作时考虑临时禁用触发器

-- 临时禁用触发器（MySQL不直接支持，需删除重建）
-- 替代方案：使用标志变量控制
DELIMITER //
CREATE TRIGGER conditional_trigger
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
    IF @skip_trigger IS NULL OR @skip_trigger = 0 THEN
        -- 触发器逻辑
        SET NEW.updated_at = NOW();
    END IF;
END //
DELIMITER ;

-- 批量操作时跳过触发器
SET @skip_trigger = 1;
UPDATE products SET price = price * 1.1;  -- 不触发更新时间
SET @skip_trigger = 0;
```

### 5.2 触发器中的死锁

```sql
-- 问题：触发器中修改同一张表导致死锁
-- 解决方案：BEFORE触发器中修改NEW值而非执行UPDATE

-- 错误：AFTER触发器中UPDATE原表
CREATE TRIGGER bad_trigger
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    UPDATE orders SET order_no = CONCAT('ORD', NEW.id);  -- 可能死锁
END //

-- 正确：BEFORE触发器中设置NEW值
CREATE TRIGGER good_trigger
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    SET NEW.order_no = CONCAT('ORD', NEW.id);
END //
```

### 5.3 事件没跑的排查入口

事件的启用开关、执行历史与排查方法已归 [事件调度器](/mysql/790-EventScheduler) 的「排查：事件到底跑没跑」一节，入口命令是 `SHOW VARIABLES LIKE 'event_scheduler'`。

## 6. 总结与最佳实践

### 6.1 触发器使用原则

1. **保持简单**：触发器逻辑应尽量简短
2. **避免链式触发**：不要让触发器引发其他触发器
3. **BEFORE做验证**：数据验证和自动填充用BEFORE
4. **AFTER做同步**：日志记录和数据同步用AFTER
5. **文档化**：记录触发器的用途和影响

### 6.2 事件调度器原则

1. **错峰执行**：定时任务安排在低峰期
2. **添加日志**：事件执行后记录日志
3. **错误处理**：事件中包含异常处理
4. **监控执行**：定期检查事件执行状态
5. **幂等设计**：事件重复执行不应产生错误数据

## 动手实践

练习一（预测题）：下面这条 INSERT 的执行结果是什么？为什么？

```sql
CREATE TABLE t_users (
  id INT PRIMARY KEY,
  status INT
);

DELIMITER //
CREATE TRIGGER tg_check
BEFORE INSERT ON t_users
FOR EACH ROW
BEGIN
  IF NEW.status = NULL THEN
    SET NEW.status = 1;
  END IF;
END //
DELIMITER ;

INSERT INTO t_users (id) VALUES (1);
SELECT id, status FROM t_users;
```

提示：NULL 与任何值的比较结果是什么？

<details>
<summary>参考实现</summary>

查询结果为 `(1, NULL)`——触发器「执行了」但兜底没生效：`NEW.status = NULL` 的比较结果是 **UNKNOWN**（NULL 与任何值比较都得 UNKNOWN，不是 TRUE 也不是 FALSE），IF 只在 TRUE 分支执行，SET 被跳过。正确写法是 `IF NEW.status IS NULL THEN`。这是触发器（也是所有 SQL 条件）里最经典的逻辑错误——正文 2.2 节的讲评段专门标过它，本练习用「INSERT 成功但字段还是 NULL」这个反直觉现场把它钉牢。
</details>

练习二（实战题）：给 vocaloid 库的 singers（歌姬）与 song_singers（歌姬-歌曲关联）写 tri_singer_delete：删除歌姬时先把它在 song_singers 的关联行**归档**到 singer_del_archive 表（存歌姬名与关联歌曲数、删除时间），再删关联行。验证：删一位歌姬后归档表有一行且计数正确。

提示：AFTER DELETE 里 OLD 拿被删行；先 INSERT 归档再 DELETE 关联（顺序在触发器体内）；COUNT 用子查询。

<details>
<summary>参考实现</summary>

```sql
CREATE TABLE singer_del_archive (
  id INT AUTO_INCREMENT PRIMARY KEY,
  singer_name VARCHAR(50) NOT NULL,
  song_links INT NOT NULL,
  archived_at DATETIME NOT NULL
);

DELIMITER //
CREATE TRIGGER tri_singer_delete
AFTER DELETE ON singers
FOR EACH ROW
BEGIN
  INSERT INTO singer_del_archive (singer_name, song_links, archived_at)
  SELECT OLD.name, COUNT(*), NOW()
  FROM song_singers WHERE singer_id = OLD.singer_id;

  DELETE FROM song_singers WHERE singer_id = OLD.singer_id;
END //
DELIMITER ;

-- 验证
DELETE FROM singers WHERE singer_id = 1;
SELECT * FROM singer_del_archive;          -- 一行：歌姬名、关联数、时间
SELECT COUNT(*) FROM song_singers WHERE singer_id = 1;   -- 0
```

设计要点：先归档后删除的顺序在触发器体内用语句顺序表达；归档的 song_links 用 COUNT 子查询在删除**之前**数好（触发器体内语句按序执行，语句序就是逻辑序）；这正是正文 tri01「纯级联用外键，级联时还要做额外动作才用触发器」的应用场景——归档就是外键 CASCADE 给不了的那个额外动作。
</details>

练习三（实战题）：给 orders 表设计一个审计触发器组（INSERT/UPDATE/DELETE 三个），要求：UPDATE 只记「金额或状态真的变了」的行；DELETE 记录全行快照（JSON）。写完用一个「盖时间戳但业务字段没变」的 UPDATE 验证审计表没有新增行。

提示：IF 闸比较 OLD 与 NEW 的业务列；全行快照 JSON_OBJECT 逐列列出（或用 8.0 的 ROW 格式 binlog 侧方案对照说明）。

<details>
<summary>参考实现</summary>

```sql
CREATE TABLE orders_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  action VARCHAR(10) NOT NULL,
  snapshot JSON,
  changed_at DATETIME NOT NULL
);

DELIMITER //
CREATE TRIGGER au_orders_insert AFTER INSERT ON orders FOR EACH ROW
BEGIN
  INSERT INTO orders_audit (order_id, action, snapshot, changed_at)
  VALUES (NEW.id, 'INSERT', JSON_OBJECT('amount', NEW.amount, 'status', NEW.status), NOW());
END //

CREATE TRIGGER au_orders_update AFTER UPDATE ON orders FOR EACH ROW
BEGIN
  IF OLD.amount != NEW.amount OR OLD.status != NEW.status THEN
    INSERT INTO orders_audit (order_id, action, snapshot, changed_at)
    VALUES (NEW.id, 'UPDATE',
            JSON_OBJECT('old_amount', OLD.amount, 'new_amount', NEW.amount,
                        'old_status', OLD.status, 'new_status', NEW.status),
            NOW());
  END IF;
END //

CREATE TRIGGER au_orders_delete AFTER DELETE ON orders FOR EACH ROW
BEGIN
  INSERT INTO orders_audit (order_id, action, snapshot, changed_at)
  VALUES (OLD.id, 'DELETE', JSON_OBJECT('amount', OLD.amount, 'status', OLD.status), NOW());
END //
DELIMITER ;

-- 验证 IF 闸：只盖时间戳的更新不产生审计行
UPDATE orders SET created_at = NOW() WHERE id = 1;   -- orders_audit 无新增
UPDATE orders SET status = 5 WHERE id = 1;           -- 新增一行 UPDATE 审计
```

要点：IF 闸覆盖**全部业务列**（本例两列，列多的表要逐列 OR——列数多时维护成本高，可评估触发器只盯关键列或改用 binlog 侧订阅）；DELETE 的快照必须取 OLD（NEW 在 DELETE 里不存在）。与外键/约束的分工复述：审计是「历史」不是「约束」，归触发器管是正位。
</details>

练习四（找错题）：这个触发器想「插入订单后把订单号补成 ORD+自增id」，有两处问题，先找再修：

```sql
CREATE TRIGGER bad_order_no
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
  UPDATE orders SET order_no = CONCAT('ORD', NEW.id) WHERE id = NEW.id;
END;
```

提示：AFTER 里 UPDATE 同一张表会发生什么？正确时机是 BEFORE 还是 AFTER？

<details>
<summary>参考实现</summary>

```sql
CREATE TRIGGER good_order_no
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  SET NEW.order_no = CONCAT('ORD', LAST_INSERT_ID() + 1);
  -- 或应用层生成；自增 id 在 BEFORE 阶段通常已可读（8.0 行为），但更稳的做法见下
END;
```

两处问题：其一，AFTER 触发器里 **UPDATE 触发它的同一张表**——触发器栈重入（UPDATE 又触发本表触发器）在 MySQL 里直接报错 `Can't update table 'orders' in stored function/trigger because it is already used by statement`，即使不报错也是自锁死锁的高危形态；其二，时机选择：改的是**本行**的值就该在 BEFORE 里改 NEW（数据进表前定形），而不是进表后再 UPDATE 回去（两次写、破坏 AFTER 语义）。修法用 BEFORE + SET NEW；顺带提醒：BEFORE 阶段自增 id 的可见性随版本有差异，真正稳健的「含自增 id 的订单号」通常在应用层插入后取 last_insert_id 再补一次 UPDATE（同事务内）——触发器版适合「id 已由应用传入」的场景。正文 5.2 的死锁对照正是这对 bad/good 例子的原理。
</details>

练习五（实战题）：把「审计、校验、级联」三类需求各归位一次：给下面三个需求判断该用触发器、外键、CHECK 还是事件，并各写一行方案——(a) 删除分类时拦截（还有商品挂在分类下时不许删）；(b) salary 字段不许为负；(c) 每天凌晨把 90 天前的登录日志搬到归档库。

提示：拦删除想 RESTRICT；范围校验想 CHECK（075 篇）；按时间调度想事件（790 篇）。

<details>
<summary>参考实现</summary>

- (a) **外键**：`FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT`——引擎级拦截、零维护，触发器版（BEFORE DELETE 查子表 SIGNAL）慢且绕；
- (b) **CHECK**：`ALTER TABLE employees ADD CONSTRAINT chk_salary CHECK (salary >= 0)`（8.0.16+ 真生效，见 075 篇）——行内规则不劳触发器；
- (c) **事件**：`CREATE EVENT archive_login_daily ON SCHEDULE EVERY 1 DAY STARTS '2026-10-08 02:00:00' DO INSERT INTO archive_db.login_log SELECT ... WHERE login_at < NOW() - INTERVAL 90 DAY; DELETE ...`——按时间触发是事件的定义域（790 篇有完整形态与幂等设计）。

三个需求恰好是「触发器不该做」的边界演示：能外键不触发器、能 CHECK 不触发器、按时间找事件——触发器留给「行级、跨表、应用代码够不着」的第三类空间（审计、联动、归档式级联）。
</details>

## 自我检查

- 能说出触发器的六个时机组合（BEFORE/AFTER x INSERT/UPDATE/DELETE）与 NEW/OLD 在各事件下的可用性；
- 能写出带 SIGNAL 校验的 BEFORE 触发器与带 IF 闸的 AFTER 审计触发器；
- 能解释 `IF NEW.col = NULL` 为什么永远为假并改写成 IS NULL；
- 能完成 tri01/tri02 式的级联实验并说出它与外键 ON DELETE CASCADE 的取舍（纯级联用外键、级联加动作才用触发器）；
- 能用会话标志变量实现批量操作的触发器旁路，并说出忘记复位的后果；
- 能按「触发器挂行变、事件挂时间到」的分界给新需求选对工具，并说出三类「不该用触发器」的需求各自的正解。
