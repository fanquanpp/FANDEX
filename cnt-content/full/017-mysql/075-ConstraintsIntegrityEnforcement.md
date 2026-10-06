---
order: 80
title: 约束与完整性：让坏数据在门口被拦下
module: 'mysql'
category: 数据库
difficulty: beginner
description: 六大约束的完整机制——NOT NULL 与 DEFAULT 的语义分工、UNIQUE 的联合写法、CHECK 的 8.0.16 版本坑与 ERROR 3819、主键三条纪律、外键 RESTRICT/CASCADE/SET NULL 三态级联实验（vocaloid 三公司场景）；enum/check 双写法与身份证 regexp 校验两个实战案例，附遮代码自检练习。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：MySQL 的「约束与完整性」——NOT NULL、DEFAULT、UNIQUE、CHECK、PRIMARY KEY、FOREIGN KEY 六大约束（AUTO_INCREMENT 是主键的常见搭档），以及它们在列级与表级两种声明位置上的差异。约束是数据类型之后的第二道数据质检闸：类型管「这格放什么形状的值」，约束管「这格的值合不合法、行与行之间是什么关系」。
- **解决什么问题**：两个手机号绑到同一账户（缺 UNIQUE）、功率录成 800 超 kWh 上限（缺 CHECK）、删除一个站点后几百根桩变成孤儿数据（缺外键或级联策略）、应用层忘了校验导致空值入库（缺 NOT NULL）——每一种都是半年后要在应用层写一堆补丁的债务来源。约束把「数据合法」从应用层的自觉变成数据库的强制。
- **什么时候用到**：建表时逐字段决策；给存量表补约束（ALTER）；排查「为什么这条 INSERT 被拒」（1048/1062/3819/1452 四个报错号）。类型选型主线见 [数据类型与约束总览](/mysql/070-MySQLDataTypeConstraint)；外键与锁的交互深水区见 [锁分类](/mysql/450-LockClassification)；建表之外的 DDL 对象见 [SQL 数据定义进阶](/mysql/090-SQLDataDefinitionAdvanced)。

## 六大约束全景与声明位置

先给一张全景表，然后逐个深挖。约束声明位置分**列级**（跟在字段定义后面）与**表级**（字段列表之后单独一行）——语法都能混用，但有的约束只能表级：

| 约束 | 作用 | 列级写法 | 表级写法 | 声明位置限制 |
| --- | --- | --- | --- | --- |
| NOT NULL | 必填 | `col INT NOT NULL` | 无 | 仅列级 |
| DEFAULT | 兜底值 | `col INT DEFAULT 1` | 无 | 仅列级 |
| UNIQUE | 唯一 | `col VARCHAR(32) UNIQUE` | `UNIQUE KEY uk_x (col)` | **多列联合必须表级** |
| CHECK | 取值规则 | `CHECK (col > 0)` | `CONSTRAINT chk_x CHECK (...)` | 皆可，表级能命名能跨列 |
| PRIMARY KEY | 行身份证 | `id BIGINT PRIMARY KEY` | `PRIMARY KEY (id)` | 复合主键必须表级 |
| FOREIGN KEY | 引用完整 | 无 | `FOREIGN KEY (...) REFERENCES ...` | 仅表级 |

逐行解释分界的原因：NOT NULL 与 DEFAULT 描述的是**单列的值语义**，天然属于列；UNIQUE/PRIMARY KEY 一旦涉及多列（联合唯一、复合主键），必须先有完整字段列表才能声明——这就是「联合唯一必须表级」的机制根源。`CONSTRAINT chk_x` 的命名是表级 CHECK 的隐藏优势：报错 3819 时直接点名约束（`Check constraint 'chk_power' is violated`），排查快一个数量级；列级无名约束由系统自动生成名字（`employees_chk_1` 这种），报错时得猜。

### NOT NULL 与 DEFAULT：必填与兜底不是一回事

以 070 篇的充电桩表为例，先亲手触发 1048：

```sql
INSERT INTO charging_piles (pile_no, power_kw, installed_at)
VALUES ('P010001000001', 120.0, '2026-05-01');
-- ERROR 1048 (23000): Column 'station_id' cannot be null
```

语义分界一句话：**NOT NULL 表达「必填」，DEFAULT 表达「不填时的合理值」**。容易混淆的是 NULL 与「默认空值」的分工——`last_heartbeat DATETIME NULL` 允许 NULL 是刻意的：「从未上线」和「上线时间是 1970-01-01」是两回事。NULL 表达未知，默认值表达已知，互相冒充的代价是查询端永远要写 `WHERE col IS NULL` 与 `WHERE col = '1970-01-01'` 两套判断。判断器：这个字段「没有值」本身是不是信息？是——允许 NULL；不是（总有合理初始值）——NOT NULL + DEFAULT。

### UNIQUE：业务唯一性 + 免费的索引

```sql
INSERT INTO charging_piles (pile_no, station_id, power_kw, installed_at)
VALUES ('P010001000002', 3, 60.0, '2026-06-01');
-- ERROR 1062 (23000): Duplicate entry 'P010001000002' for key 'uk_pile_no'
```

UNIQUE 从**业务语义**出发（桩编号天然唯一），顺带免费得到一棵唯一索引树——「按桩编号查询」自动走索引（索引原理见 [聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)）。两个易错点：

```sql
-- 易错点一：联合唯一必须表级，列级写两次 UNIQUE 是「各自唯一」不是「组合唯一」
CREATE TABLE station_tariffs (
  station_id INT UNSIGNED NOT NULL,
  effective_date DATE NOT NULL,
  price DECIMAL(5,2) NOT NULL
  -- 错误理解：station_id UNIQUE, effective_date UNIQUE  -- 变成各自列唯一，完全不是想要的
  UNIQUE KEY uk_station_date (station_id, effective_date)  -- 正确：同站同生效日只有一条费率
);

-- 易错点二：UNIQUE 列里 NULL 可以有多个（NULL != NULL，唯一性对 NULL 不生效）
ALTER TABLE charging_piles ADD COLUMN qr_token CHAR(32) NULL UNIQUE;
INSERT INTO charging_piles (pile_no, station_id, power_kw, installed_at, qr_token)
VALUES ('P010001000005', 4, 60.0, '2026-06-02', NULL),
       ('P010001000006', 4, 60.0, '2026-06-02', NULL);   -- 两个 NULL 都放行
```

业务上「令牌未生成」用 NULL 表达时，唯一性管不到它——若业务要求「未生成也得唯一」，那就该用 DEFAULT 空串加生成流程，这正是 070 练习一的场景。多租户系统的标准组合是 `UNIQUE KEY uk_tenant_email (tenant_id, email)`：唯一性是「租户内唯一」，跨租户邮箱可重复——组合键的第一列承担了「作用域」语义。

### CHECK：8.0.16 前后是两个世界

```sql
-- 触发 3819：功率超出业务上限
INSERT INTO charging_piles (pile_no, station_id, power_kw, installed_at)
VALUES ('P010001000003', 3, 800, '2026-06-01');
-- ERROR 3819 (HY000): Check constraint 'chk_power' is violated.

INSERT INTO charging_piles (pile_no, station_id, power_kw, status, installed_at)
VALUES ('P010001000004', 3, 120.0, 9, '2026-06-01');
-- ERROR 3819 (HY000): Check constraint 'chk_status' is violated.
```

必须刻进肌肉记忆的版本坑：**8.0.16 之前 MySQL 只解析 CHECK 不执行**——老教程与老运维说「MySQL 的 CHECK 没用」，说的就是那个时代。8.0.16 起是真约束，INSERT 与 UPDATE 双向生效（070 练习三让你验证过 UPDATE 路径）。 CHECK 的表达式限制：只能引用**本行**的列，不能引用其他表、不能用存储函数、不能含子查询——「库存扣减不能为负」这类跨行规则CHECK 管不了，那要靠事务与行锁（[事务与锁机制](/mysql/460-TransactionLockMechanism)）。

另外一个 8.0.17 的现代写法边界：DECIMAL/FLOAT/DOUBLE 的 UNSIGNED 已废弃，「数值非负」的正确表达就是 `CHECK (power_kw > 0)`——070 篇的功率列没写 UNSIGNED 正是这个原因。

## PRIMARY KEY：主键的三条纪律

1. **无业务含义**：手机号、身份证号会变会错——变了主键整条链路（外键、索引、缓存键）全要跟着改。用自增 BIGINT 或应用层雪花 ID。
2. **尽量短**：InnoDB 的二级索引每个条目都复制一份主键（[聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex) 详述物理原因），主键胖一圈，所有索引胖十圈。
3. **一表一主键**：复合主键 `PRIMARY KEY (tenant_id, user_id)` 多见于关联表——关联表的复合主键顺便就是「关系唯一」约束，一物两用。

## FOREIGN KEY：三态级联实验

外键保证**数据库层面的引用完整性**：给桩挂一个不存在的站点，进门就被拦：

```sql
INSERT INTO charging_piles (pile_no, station_id, power_kw, installed_at)
VALUES ('P010001000007', 999, 60.0, '2026-06-03');
-- ERROR 1452 (23000): Cannot add or update a child row:
-- a foreign key constraint fails (`green`.`charging_piles`, CONSTRAINT `fk_pile_station`)
```

外键的真正决策点不在「建不建」，而在 **ON DELETE/ON UPDATE 的三态选择**——父行（站点）被删时，子行（桩）怎么办。用 vocaloid 学习项目的三公司场景做一个完整实验（每家公司有多位歌姬，删公司看歌姬的下场）：

```sql
-- 实验准备：三张结构相同、级联策略不同的公司表 + 各自的歌姬表
CREATE TABLE companies_restrict (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE vocaloids_restrict (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(50) NOT NULL,          -- 洛天依、初音未来……
  company_id INT UNSIGNED NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies_restrict (id)
    ON DELETE RESTRICT                       -- 态一：阻止删除（默认）
) ENGINE=InnoDB;

-- 三种策略各建一对表后，灌入数据：
INSERT INTO companies_restrict (name) VALUES ('上海禾念'), ('Crypton'), ('泠鸢工作室');
INSERT INTO vocaloids_restrict (name, company_id) VALUES ('洛天依', 1), ('徵羽摩柯', 1);

-- 态一 RESTRICT：有歌姬的公司不许删（默认行为，不写 ON DELETE 也是它）
DELETE FROM companies_restrict WHERE id = 1;
-- ERROR 1451 (23000): Cannot delete or update a parent row:
-- a foreign key constraint fails

-- 态二 CASCADE：删公司，歌姬跟着消失（危险，先备份！）
-- DELETE FROM companies_cascade WHERE id = 1;
-- SELECT COUNT(*) FROM vocaloids_cascade WHERE company_id = 1;  -- 0，歌姬没了

-- 态三 SET NULL：删公司，歌姬的公司字段变 NULL（要求该列允许 NULL）
-- DELETE FROM companies_setnull WHERE id = 1;
-- SELECT name, company_id FROM vocaloids_setnull WHERE name = '洛天依';  -- (洛天依, NULL)
```

三态的语义与选型：**RESTRICT** 是「这个引用关系是资产」——歌姬不能脱离公司存在，删除公司前先转移或删除歌姬，业务上最常见；**CASCADE** 是「子行是父行的附属品」——订单删除连带订单明细消失，语义清晰但**静默删除的量级可能超预期**（删一个大客户连带百万订单明细），生产上要配合软删除（加 deleted_at 列）而不是物理级联；**SET NULL** 是「关系断了但子行还有独立价值」——作者删号了，文章还在（作者变 NULL）。ON UPDATE 端的 CASCADE 对应「父表主键被改，子表外键跟着改」——这就是主键「永不改变」纪律能放宽的唯一合法场景，而更简单的做法还是别改主键。

互联网业务的另一条路是**不建外键**：高并发写入时外键检查放大锁范围、分库分表后外键跨不了库、批量导数处处受阻——代价是引用完整性归应用层 + 定期对账兜底。决策一句话：单一库、要数据质量兜底，建；超大并发、已分库，不建但对账。

## 例子一（真实工程）：商品管理系统的约束全套

商品管理系统（e-core 教学项目）的员工表是「同一约束多种写法」的活教材——性别、身份证两个字段各有三种表达：

```sql
CREATE TABLE employees_info (
  Employees_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Employees_name VARCHAR(30) NOT NULL,
  -- 写法 A：enum 收容有限取值（自带取值约束）
  Employees_sex  ENUM('男', '女') NOT NULL DEFAULT '男',
  -- 写法 B：TINYINT + CHECK 表达同样的约束（字典表思维的列级版）
  -- Employees_sex TINYINT NOT NULL DEFAULT 1,
  -- CONSTRAINT chk_sex CHECK (Employees_sex IN (1, 2)),
  -- 身份证：CHECK + REGEXP 做格式校验（18 位：17 数字 + 数字或 X）
  Identity_id    CHAR(18) NOT NULL
                 CHECK (Identity_id REGEXP '^[0-9]{17}[0-9X]$')
                 UNIQUE,
  Post_id        INT UNSIGNED NOT NULL,
  Hiredate       DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  FOREIGN KEY (Post_id) REFERENCES post_info (Post_id)
) ENGINE=InnoDB;
```

逐段解释这套约束的分工：`ENUM('男','女')` 把取值范围写进类型本身——超过枚举的值在严格模式下直接报错（非严格模式插空串并警告，这也是要开严格 sql_mode 的理由，见 [服务器 SQL 模式与系统变量](/mysql/855-ServerSqlModeAndVariables)）；ENUM 的缺点是加值要 ALTER（`ALTER TABLE ... MODIFY` 重建列），字典表 + TINYINT 外键是可扩展的正解，两种写法的选择是「固定二值用 ENUM、会长的枚举用字典表」。`REGEXP` 在 CHECK 里做格式校验是 MySQL 8.0.16+ 的能力——身份证 18 位格式（17 数字 + 数字或 X）进库即验，应用层的正则只是第二道防线。`DEFAULT (CURRENT_TIMESTAMP)` 加括号是 8.0.13+ 的函数默认值语法（不带括号只能用常量）。`CREATE TABLE` 的顺序依赖：父表（post_info）必须先于子表（employees_info），反过来删要 `SET FOREIGN_KEY_CHECKS=0` 或先删子表——教学项目里注释掉的 `DROP TABLE` 提示的就是这个顺序。

## 例子二（真实工程）：给存量表补约束

半年前的表没建约束，现在数据已经脏了，直接 ALTER 会撞上存量脏数据。标准动作是「先体检、再清洗、后上闸」：

```sql
-- 第一步：体检——找出违反目标约束的存量数据
SELECT station_id, COUNT(*) AS c, GROUP_CONCAT(pile_no) AS dup_piles
FROM charging_piles GROUP BY station_id HAVING c > 1;      -- 为联合唯一做预检

SELECT pile_no FROM charging_piles
WHERE power_kw <= 0 OR power_kw > 600;                      -- 为 CHECK 做预检

-- 第二步：清洗（本例给脏功率打上待修标记，或按业务规则修正）
UPDATE charging_piles SET status = 3 WHERE power_kw <= 0 OR power_kw > 600;

-- 第三步：上闸——ALTER 加约束，一次只加一个（失败好定位）
ALTER TABLE charging_piles
  ADD CONSTRAINT chk_power_2 CHECK (power_kw > 0 AND power_kw <= 600);
-- 若存量仍有违例：ERROR 3819，且 ALTER 整体回滚，表结构不变
```

逐段解释流程的因果：约束上闸是**全表验证**——存量任何一行违例，ALTER 整体失败回滚（8.0 的原子 DDL，见 [在线 DDL](/mysql/685-OnlineDDLTableChange) 的算法与锁开销），所以预检清单必须在 ALTER 之前清零。「一次只加一个」是运维纪律：三个约束一起加、第三个失败，前两个也回滚，排查现场全混在一起。大表加 CHECK/FOREIGN KEY 的锁与时间成本评估见 [在线 DDL 与表变更](/mysql/685-OnlineDDLTableChange)。

## 常见坑点速记

- 四个报错号背下来：1048（NOT NULL 违例）、1062（UNIQUE 撞车）、3819（CHECK 违例）、1452/1451（外键插/删违例）——报错即文档；
- 联合唯一、复合主键必须表级声明，列级写法是「各自唯一」，语义完全不同；
- UNIQUE 对 NULL 不设防：业务上「未生成也要唯一」不能用 NULL 表达「未生成」；
- CHECK 在 8.0.16 前是摆设——判断教程时代先看它敢不敢写 CHECK；CHECK 只能引用本行列，跨行规则靠事务；
- 数值非负用 `CHECK (col > 0)`，UNSIGNED 的小数形态 8.0.17 起已废弃；
- ON DELETE 三态：RESTRICT 保资产、CASCADE 管附属、SET NULL 留孤儿——CASCADE 前想清楚删除的量级；
- 补约束三步：预检（GROUP BY / WHERE）→ 清洗 → 单个 ALTER；存量违例会让 ALTER 整体回滚；
- ENUM 适合固定二值，会长大的枚举用字典表 + TINYINT。

## 动手实践

练习一（预测题）：下面这条 INSERT 在 MySQL 8.0.20 上会发生什么？在 5.7 上呢？

```sql
CREATE TABLE demo_check (
  id INT PRIMARY KEY,
  age INT,
  CONSTRAINT chk_age CHECK (age BETWEEN 0 AND 150)
);

INSERT INTO demo_check VALUES (1, 200);
```

提示：回忆 CHECK 的版本分水岭。

<details>
<summary>参考实现</summary>

8.0.20：`ERROR 3819 (HY000): Check constraint 'chk_age' is violated.`——CHECK 真执行，插入被拒。5.7：插入**成功**——5.7 的 CHECK 语法只解析不执行（为兼容语法树而存在），200 静默入库。这道题解释了为什么同一份建表脚本在两代数据库上行为不同、以及「老团队说 CHECK 没用」的历史出处。自检方式：`SELECT VERSION();` 确认版本，再跑一次插入看结果。
</details>

练习二（实战题）：设计一张 `borrow_records`（图书借阅）表：要求同一本书同时只能有一个未归还记录（`return_date IS NULL` 最多一条）；借助「生成列 + 联合唯一」实现这个条件唯一（生成列语法见 [生成列](/mysql/290-FunctionalIndex) 附近与 860 篇相关内容，也可直接查官方文档）。

提示：造一个生成列 `open_token`——未归还时等于书号、归还后等于 NULL；对 (book_id 之外的新列) 与 book_id 建联合唯一。

<details>
<summary>参考实现</summary>

```sql
CREATE TABLE borrow_records (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id     INT UNSIGNED NOT NULL,
  borrower    VARCHAR(30) NOT NULL,
  borrow_date DATE NOT NULL,
  return_date DATE NULL,
  open_token  INT UNSIGNED
              GENERATED ALWAYS AS (IF(return_date IS NULL, book_id, NULL)) STORED,
  UNIQUE KEY uk_open (open_token, book_id)
) ENGINE=InnoDB;

INSERT INTO borrow_records (book_id, borrower, borrow_date)
VALUES (1, '小明', '2026-10-01'), (1, '小红', '2026-10-02');
-- 第二条报 1062：book 1 还有一笔未归还，open_token 都是 1，联合唯一撞车
INSERT INTO borrow_records (book_id, borrower, borrow_date, return_date)
VALUES (1, '小明', '2026-10-01', '2026-10-05');       -- 旧记录归还后 token 变 NULL
INSERT INTO borrow_records (book_id, borrower, borrow_date)
VALUES (1, '小红', '2026-10-06');                     -- 通过
```

机制解释：生成列把「是否在借」折叠成一个值——在借时等于 book_id（同书必然撞唯一索引）、归还后变 NULL（唯一性对 NULL 不设防，正好豁免历史记录）。这是「条件唯一」在纯 MySQL 层的标准解法，应用层 if 判断在并发下有竞态，数据库闸是唯一可靠的。
</details>

练习三（实战题）：在 vocaloid 实验库上完成三态对比：建 `companies_cascade` 与 `vocaloids_cascade`（ON DELETE CASCADE）、`companies_setnull` 与 `vocaloids_setnull`（ON DELETE SET NULL，company_id 允许 NULL），灌入「洛天依 → 禾念」后分别删除公司，用 SELECT 记录歌姬表的下场。回答：哪种策略下歌姬表可能出现「永远查不到归属」的行？

提示：SET NULL 的行还在但 company_id 是 NULL——这就是「孤儿但存活」。

<details>
<summary>参考实现</summary>

```sql
CREATE TABLE companies_cascade (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) NOT NULL) ENGINE=InnoDB;
CREATE TABLE vocaloids_cascade (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) NOT NULL,
  company_id INT UNSIGNED NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies_cascade(id) ON DELETE CASCADE) ENGINE=InnoDB;

CREATE TABLE companies_setnull (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) NOT NULL) ENGINE=InnoDB;
CREATE TABLE vocaloids_setnull (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) NOT NULL,
  company_id INT UNSIGNED NULL,                            -- SET NULL 要求列可空
  FOREIGN KEY (company_id) REFERENCES companies_setnull(id) ON DELETE SET NULL) ENGINE=InnoDB;

INSERT INTO companies_cascade (name) VALUES ('上海禾念');
INSERT INTO vocaloids_cascade (name, company_id) VALUES ('洛天依', 1);
INSERT INTO companies_setnull (name) VALUES ('上海禾念');
INSERT INTO vocaloids_setnull (name, company_id) VALUES ('洛天依', 1);

DELETE FROM companies_cascade WHERE id = 1;
SELECT COUNT(*) FROM vocaloids_cascade;                    -- 0：歌姬随公司消失
DELETE FROM companies_setnull WHERE id = 1;
SELECT name, company_id FROM vocaloids_setnull;            -- (洛天依, NULL)
```

答案：SET NULL 策略产生「公司字段为 NULL 但行还活着」的孤儿——查询端所有 `JOIN companies` 都会丢掉这些行（INNER JOIN 的 null 不匹配），要么改 LEFT JOIN + IS NULL 语义化处理，要么在应用层定期给孤儿指派新归属。CASCADE 没有「孤儿」但有「静默蒸发」的风险——两种策略的坑不同方向，选型时想清楚业务要的是哪种失败形态。
</details>

练习四（找错题）：这段建表语句有两处错误，先找再修：

```sql
CREATE TABLE orders (
  order_no VARCHAR(32) UNIQUE,
  user_id INT UNIQUE,
  amount DECIMAL(10,2) UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_no, user_id)
);
```

提示：列级 UNIQUE 两次的语义；复合主键里两列都 UNIQUE 的冗余；再检查 UNSIGNED 用在 DECIMAL 上的版本状态。

<details>
<summary>参考实现</summary>

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,   -- 主键用无业务含义的自增
  order_no VARCHAR(32) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL
           CONSTRAINT chk_amount CHECK (amount >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_order_no (order_no)
) ENGINE=InnoDB;
```

三处问题：其一，`PRIMARY KEY (order_no, user_id)` 把业务字段当复合主键——违反「主键无业务含义、尽量短」两条纪律（订单号会变格式，胖主键拖累全部二级索引）；其二，两列各自列级 UNIQUE 的语义是「订单号全局唯一且用户 id 全局唯一」，user_id 作为外键目标字段列级 UNIQUE 通常是无心之失（意图可能是「一用户一单」？那应该是 `UNIQUE KEY uk_user_order (user_id, created_at)` 之类的作用域组合）——写约束前必须把业务语义说成一句话再翻译成约束；其三，`DECIMAL(10,2) UNSIGNED` 的 UNSIGNED 在 8.0.17 起废弃，非负表达换 `CHECK (amount >= 0)`。
</details>

练习五（实战题）：给「欠费不能销户」写一条数据库层的保险丝：`customers` 表有 `balance DECIMAL(10,2)` 与 `deleted_at DATETIME NULL`（软删除标记）。要求：`balance < 0` 的客户不能被标记删除。能只用约束实现吗？如果 CHECK 够不着，说明方案（触发器见 [触发器与事件](/mysql/780-TriggerEvent)，或应用层事务校验）。

提示：CHECK 只能看本行的当前值组合——`deleted_at IS NULL OR balance >= 0` 这样的组合行不行？

<details>
<summary>参考实现</summary>

```sql
ALTER TABLE customers
  ADD CONSTRAINT chk_no_delete_in_debt
  CHECK (balance >= 0 OR deleted_at IS NULL);
```

组合行 CHECK 就够了：约束表达「（余额非负）或（未标记删除）」——欠费（balance < 0）且试图删除（deleted_at NOT NULL）时两个条件都假，UPDATE 被 3819 拦下；正常删除（余额 >= 0）或欠费客户正常存续都放行。关键 insight：UPDATE 是把「新行的完整值组合」交给 CHECK 验证，所以「删除动作」在数据库眼里只是 deleted_at 的一列变化，组合行 CHECK 恰好覆盖。若业务规则升级成「欠费客户的任何状态变更都要上级审批」这类**跨行/跨表**逻辑，CHECK 够不着，才需要触发器（BEFORE UPDATE 拦截，见 [触发器与事件](/mysql/780-TriggerEvent)）或应用层事务校验——能用行内 CHECK 表达的优先 CHECK：没有触发器的执行开销与隐藏性。
</details>

## 与之前和之后的知识的关系

- 往前：字段类型选型（约束的宿主）见 [数据类型与约束总览](/mysql/070-MySQLDataTypeConstraint)；建库与字符集基座见 [MySQL 概述与库表设计](/mysql/050-MySQLOverviewDatabaseDesign)。
- 往后：DML 撞上约束的完整报错现场见 [DML 数据操作语言](/mysql/100-DML)；外键引发的锁与死锁见 [锁分类](/mysql/450-LockClassification) 与 [死锁排查](/mysql/480-DeadlockDetectionHandling)；批量导数时约束的开关（FOREIGN_KEY_CHECKS）与绕行见 [批量导入导出](/mysql/115-LoadDataImportExport)；视图与存储过程等对象级 DDL 见 [SQL 数据定义进阶](/mysql/090-SQLDataDefinitionAdvanced)；sql_mode 严格模式决定违规行为是报错还是警告，见 [服务器 SQL 模式与系统变量](/mysql/855-ServerSqlModeAndVariables)。

## 参考与致谢

- MySQL 8.0 Reference Manual, §13.1.20 CREATE TABLE Statement（约束语法）：https://dev.mysql.com/doc/refman/8.0/en/create-table.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §13.1.20.6 CHECK Constraints（8.0.16 生效说明与限制）：https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §15.1.20.5 FOREIGN KEY Constraints（级联行为）：https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html（GPL/CC BY-SA 许可）
- 本篇版本边界（CHECK 8.0.16 生效、DECIMAL UNSIGNED 8.0.17 废弃、函数默认值 8.0.13+）均以官方手册为依据。

## 自我检查

- 能背出 1048/1062/3819/1452 四个报错号对应的约束，并各写一条触发语句；
- 能解释联合唯一必须表级声明的机制根源，并写出带作用域列的组合唯一；
- 能说出 CHECK 的版本分水岭（8.0.16）与表达式限制（本行、无子查询、无存储函数）；
- 能完成 RESTRICT/CASCADE/SET NULL 三态实验并说出三种孤儿形态（阻止、蒸发、空引用）；
- 能按「预检 → 清洗 → 单个 ALTER」流程给存量表补 CHECK，并解释 ALTER 失败的回滚行为；
- 能用生成列 + 联合唯一实现条件唯一，并解释 NULL 在其中的双重角色。
