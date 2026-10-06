---
order: 890
title: 服务器 SQL 模式与系统变量：sql_mode 全景与变量作用域
module: 'mysql'
category: 数据库
difficulty: beginner
description: 服务器行为的总开关——sql_mode 全景（严格模式、ONLY_FULL_GROUP_BY 与 ANY_VALUE 逃生口、sql_safe_updates 防全表误操作）、GLOBAL/SESSION/PERSIST 三层作用域与持久化、8.0 变量改名坑（transaction_isolation vs tx_isolation）；新项目 sql_mode 决策、生产 ONLY_FULL_GROUP_BY 报错两解法、误删行防手滑三个场景，附遮代码自检练习。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：MySQL 服务器的「SQL 模式与系统变量」——`sql_mode`（一批决定 SQL 方言严格性的开关的总和）、系统变量的三层作用域（GLOBAL/SESSION/PERSIST）与持久化机制。它是「同一份 SQL 在两台服务器上行为不同」这类谜题的答案库。
- **解决什么问题**：开发库上插入超长字符串只是警告，生产库直接报错（严格模式差异）；一条 GROUP BY 查询在 5.7 前返回「碰巧的一行」，8.0 直接 ERROR 1140；实习生在 mysql 客户端里一条忘了 WHERE 的 UPDATE 扫了全表（sql_safe_updates 没开）；升级 8.0 后 `SET tx_isolation` 报 Unknown variable（变量改名）。这些都不是「SQL 写错了」，是服务器模式的语义没对齐。
- **什么时候用到**：新项目初始化时的 sql_mode 决策、生产报错（1140/1366/1055）的模式归因、变量调优后的持久化、跨版本升级的变量迁移。GROUP BY 语义与 ONLY_FULL_GROUP_BY 的性能关联见 [GROUP BY 与排序优化](/mysql/380-GroupByOrderByOptimization)；配置文件与内存参数主线见 [配置运维](/mysql/850-MySQLConfigOps)；SHOW 家族的完整用法也见 850 篇。

## sql_mode：一组开关的总和

### 先看现状：你的服务器开着什么

```sql
SELECT @@sql_mode;
-- 8.0 默认值（一行显示，空格分隔多个模式）：
-- ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,
-- ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

逐个解读 8.0 默认包里的六个成员（8.0 起默认严格，与 5.6 的宽松默认是两代行为）：

| 模式 | 管什么 | 关掉后会发生什么 |
| --- | --- | --- |
| `STRICT_TRANS_TABLES` | 严格模式核心：非法值（超长、类型错、缺列）报错而不是警告截断 | 超长字符串**静默截断**入库，错误数据无声积累 |
| `ONLY_FULL_GROUP_BY` | SELECT 非聚合列必须出现在 GROUP BY 里 | 返回「分组内任意一行」的值，结果不确定 |
| `NO_ZERO_IN_DATE` / `NO_ZERO_DATE` | 禁止 2026-00-00、0000-00-00 这类残缺日期 | 垃圾日期合法入库，`BETWEEN` 查询漏数据 |
| `ERROR_FOR_DIVISION_BY_ZERO` | 除以零报错（配合严格模式） | 返回 NULL，业务侧拿到空结果不知道为什么 |
| `NO_ENGINE_SUBSTITUTION` | 指定的存储引擎不存在时报错 | 静默换成 InnoDB，MyISAM 特有行为悄然丢失 |

心智模型：sql_mode 不是「对错开关」而是「**方言严格度**」——宽松模式是 5.x 时代的兼容遗产（容忍脏数据以保旧应用能跑），严格模式是 8.0 的默认立场（坏数据进门就拦）。判断器：**新建项目用默认严格模式，永远不要为迁就烂 SQL 关严格模式**；接手老系统时先 `SELECT @@sql_mode` 摸清现状再评估改动的波及面。

### 例子一（真实工程）：新项目的 sql_mode 初始化决策

团队新项目要建库，DBA 与开发对齐服务器行为。决策过程比结论重要，完整的决策单：

```sql
-- 第一步：盘点默认值（别凭记忆，查当前版本的实际默认）
SELECT @@GLOBAL.sql_mode\G

-- 第二步：在默认包之上做加减法（8.0 默认已经够好，通常只做加法）
-- 加：TRADITIONAL 是 STRICT + 全部日期/除零严格项的集合别名（表达意图更清晰）
-- 加：NO_AUTO_VALUE_ON_ZERO 只在确有 0 值主键迁移场景才考虑（会改变自增行为）
SET PERSIST sql_mode = CONCAT(@@sql_mode, ',NO_ZERO_DATE_CONFIRMED');  -- 示意，实际用具体模式名

-- 第三步：写入配置文件（服务重启不丢，见下节 PERSIST 与 my.cnf 的双通道）
-- my.cnf:
-- [mysqld]
-- sql_mode = ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,
--            ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

逐段解释决策纪律：**加法优先**——从默认包往上加（更严格），慎做减法（每减一项都给脏数据开门）；`TRADITIONAL` 集合适合「要最严格」的强诉求场景，但它是打包概念，出问题时排查要展开成具体模式；任何 sql_mode 变更都要在**测试环境复现生产的三类写法**（批量导入、含 NULL 的日期写入、GROUP BY 报表）跑一遍——严格化的代价（老 SQL 报错）要在测试期暴露而不是上线夜。

## 例子二（真实工程）：生产 ONLY_FULL_GROUP_BY 报错的两种解法

上线日一条报表 SQL 炸了：

```sql
SELECT station_id, station_name, SUM(kwh) AS total_kwh
FROM daily_station_stats
WHERE stat_date >= '2026-09-01'
GROUP BY station_id;
-- ERROR 1055 (42000): Expression #2 of SELECT list is not in
-- GROUP BY clause and contains nonaggregated column
-- 'green.daily_station_stats.station_name' which is not functionally
-- dependent on columns in GROUP BY clause
```

报错语义：SELECT 里挑了 `station_name`，但 GROUP BY 只有 `station_id`——宽松模式下 MySQL 从分组内**任取一行**的 station_name 返回（如果业务上同 station_id 的 station_name 恒定，结果碰巧正确；不恒定就是随机的）。ONLY_FULL_GROUP_BY 拒绝这种侥幸。两种解法：

```sql
-- 解法 A：把列补进 GROUP BY（推荐——表达"分组单位其实是这两列"）
SELECT station_id, station_name, SUM(kwh) AS total_kwh
FROM daily_station_stats
WHERE stat_date >= '2026-09-01'
GROUP BY station_id, station_name;

-- 解法 B：ANY_VALUE 逃生口——声明"我接受组内任一行的值"
SELECT station_id, ANY_VALUE(station_name) AS station_name, SUM(kwh) AS total_kwh
FROM daily_station_stats
WHERE stat_date >= '2026-09-01'
GROUP BY station_id;
```

选型判断：**解法 A 是正解**——当 station_name 是 station_id 的函数（同一站名不变）时 A 与 B 结果一致，但 A 把「函数依赖」写成了显式分组，语义完整还能走索引（GROUP BY 列序影响临时表与索引扫描，见 [GROUP BY 与排序优化](/mysql/380-GroupByOrderByOptimization)）；**解法 B 是逃生口**——明确告诉优化器「这个列组内可能不同值，我认了任意值」，适合「我知道它在干嘛」的迁移过渡与统计口径列。第三种「关掉 ONLY_FULL_GROUP_BY 模式」是**全局倒退**：一个查询的问题放大成全库语义放松，团队规范里应当禁止（380 篇 FAQ 的立场一致：改查询，不改模式）。

## 三层作用域：GLOBAL、SESSION 与 PERSIST

### 变量改了，谁生效、活多久

```sql
-- SESSION：只影响当前连接，断开即失效
SET SESSION max_execution_time = 5000;      -- 本会话的慢查询保护（毫秒）
SET @@SESSION.sort_buffer_size = 4194304;   -- 两种写法等价

-- GLOBAL：影响之后的新连接，已连接的会话不受影响（最容易误解的点）
SET GLOBAL max_connections = 800;

-- PERSIST：写进 mysqld-auto.cnf，重启后依然生效（8.0 新增）
SET PERSIST innodb_buffer_pool_size = 4294967296;

-- 查看：@@ 默认取 SESSION，@@GLOBAL./@@PERSIST. 显式指定层次
SELECT @@max_execution_time, @@GLOBAL.max_connections, @@PERSIST.innodb_buffer_pool_size;
```

逐段讲「谁受影响」的机制：SET SESSION 只改当前会话的副本——连接池里的其他连接、正在跑的会话统统不感知；SET GLOBAL 改全局默认值，但**只对之后新建的连接生效**——「改了 GLOBAL 为什么没效果」的谜底九成是「你还在用旧连接」（连接池要刷新）；SET PERSIST 在 GLOBAL 的基础上把值写进数据目录的 `mysqld-auto.cnf`（JSON 格式的持久化配置），重启后由它覆盖 my.cnf。三个层次的优先级：会话值 > 全局运行值 > 持久值/my.cnf（重启时 PERSIST 覆盖配置文件）。

运维纪律与陷阱：其一，**PERSIST 与 my.cnf 双通道并存**时容易「配置精神分裂」——团队规范应指定「运行时可调参数用 PERSIST，镜像/部署基线用 my.cnf」，别两处都写；其二，`SET PERSIST ... = DEFAULT` 撤销持久化，`RESET PERSIST stmt_name` 删除条目——PERSIST 设了个坏值导致起不来时，`mysqld --defaults-file ... --skip-networking --innodb-buffer-pool-size=...` 之类的手工覆盖或直接编辑 mysqld-auto.cnf 是救援路；其三，动态变量（能 SET 的）与只读变量（如 `version`、`datadir`）的分野：改不动只读变量是常态，重启 + my.cnf 才是它们的通道。

### 例子三（真实工程）：误删行事故的防手滑开关

事故背景：实习生在 mysql 客户端连生产库，想把「测试租户」的数据清掉，SQL 忘写 WHERE——`UPDATE customers SET status = 0;` 全表更新，八万客户状态清零（有 binlog 可恢复，但业务停了两小时，见 [binlog](/mysql/490-Binlog) 与 [PITR](/mysql/580-PITR)）。防复发的一行开关：

```sql
-- 对「人肉操作会话」开启：UPDATE/DELETE 不带键列 WHERE 直接拒绝
SET SESSION sql_safe_updates = 1;

UPDATE customers SET status = 0;
-- ERROR 1175 (HY000): You are using a safe update mode and you tried to update
-- a table without a WHERE that uses a KEY column

-- 带 LIMIT 也可以过（它假定你知道自己在动多少行）
UPDATE customers SET status = 0 WHERE status = 1 LIMIT 100;

-- 真要全表改（明确意图）：显式给出键范围或临时关（当下生效、会话内有效）
SET SESSION sql_safe_updates = 0;
UPDATE customers SET status = 0 WHERE tenant_id = 99;   -- 补上业务范围
SET SESSION sql_safe_updates = 1;
```

逐段讲清开关的语义：`sql_safe_updates=1` 拒绝两类语句——无 WHERE 的 UPDATE/DELETE、WHERE 不走**键列**（索引列）的 UPDATE/DELETE；它的本质是「把『我确定要动多少行』变成显式动作」（要么 WHERE 走索引、要么 LIMIT、要么明确关掉）。设计要点：它是 **SESSION 级开关**，给 DBA 工具账号、实习生账号在他们的 my.cnf `[client]` 段或登录脚本里配好（`init-command="SET SESSION sql_safe_updates=1"`），应用服务账号不动——应用层的全表更新是业务代码的事，有评审把关。它不是万能保险：WHERE 走了索引但范围写错照样大面积误伤，真正的兜底仍是事务（先 `START TRANSACTION` 看一眼再 COMMIT，见 [事务与锁机制](/mysql/460-TransactionLockMechanism)）+ binlog 可回滚性。`DELETE` 端同理；配 `default_week_format` 之类其他会话级默认一起放进团队连接模板是标准做法。

## 变量改名：8.0 升级的隐形破坏

8.0 做了一轮系统变量改名（旧名多为 5.7 遗留的「模糊缩写」），脚本里的旧名直接报错：

| 旧名（5.7，已移除） | 新名（8.0+） | 含义 |
| --- | --- | --- |
| `tx_isolation` | `transaction_isolation` | 事务隔离级别 |
| `tx_read_only` | `transaction_read_only` | 事务只读开关 |
| `query_cache_size` / `query_cache_type` | （已移除，非改名） | 查询缓存整个功能被删 |

```sql
-- 5.7 时代脚本：
SET GLOBAL tx_isolation = 'READ-COMMITTED';   -- 8.0: ERROR 1193 Unknown system variable 'tx_isolation'

-- 8.0 正确写法：
SET GLOBAL transaction_isolation = 'READ-COMMITTED';

-- 兼容写法（脚本要跑两代版本时）：
SET GLOBAL transaction_isolation = IF(@@version LIKE '8%', @@version, @@version) IS NOT NULL
    ? 'READ-COMMITTED' : 'READ-COMMITTED';    -- 示意；实用做法是按版本分支或统一新名
```

升级排查路径：旧名报 1193 时先 `SHOW VARIABLES LIKE '%isolation%'` 找新名；8.0 的升级体检工具（`mysqlsh util.checkForServerUpgrade`，见 [MySQL Shell 工具链](/mysql/925-MySQLShellToolkit) 与 [8.4 升级指南](/mysql/840-MySQL84UpgradeGuide)）会自动扫描配置文件与脚本里的弃用名——**升级前跑体检比升级后翻日志便宜一个量级**。查询缓存的移除是更彻底的一类：5.7 的 `query_cache_*` 全套变量在 8.0 连同功能一起消失，还按老优化手册调「查询缓存大小」的实践要整体废弃。

## SHOW 家族与变量的日常巡检

变量体系的日常工具是 SHOW 家族（完整用法见 [配置运维](/mysql/850-MySQLConfigOps)），本篇只列与 sql_mode/变量排查直接相关的四条：

```sql
SHOW VARIABLES LIKE 'sql_mode';               -- 当前会话生效的模式
SHOW GLOBAL VARIABLES LIKE 'transaction_isolation';
SELECT @@PERSIST.sql_mode;                    -- 持久层里存的值
SHOW STATUS LIKE 'Threads_connected';         -- 状态变量（只读计数，不是可调参数）
```

区分 Variables（可调配置）与 Status（运行状态计数）是巡检的基本功：`SHOW VARIABLES` 回答「服务器被配置成什么样」，`SHOW STATUS` 回答「服务器正在发生什么」。

## 常见坑点速记

- 8.0 默认已严格：别为迁就烂 SQL 减 sql_mode，修 SQL 而不是改模式；
- ERROR 1055/1140（ONLY_FULL_GROUP_BY）两种解法：补 GROUP BY 列（正解）或 ANY_VALUE（逃生口），关模式是全局倒退；
- SET GLOBAL 只对**新连接**生效——连接池不刷新，改了像没改；
- PERSIST 写 mysqld-auto.cnf 且重启覆盖 my.cnf：双通道并存要定团队规范，救急用 `--skip-` 选项或手工编辑；
- sql_safe_updates 是 SESSION 级人肉保险丝：拒绝无键 WHERE 的 UPDATE/DELETE，给运维账号配在连接模板里；
- 8.0 改名（tx_isolation → transaction_isolation 等）：升级前跑 mysqlsh 体检，报 1193 先 SHOW VARIABLES 模糊搜新名；
- SHOW VARIABLES（配置）与 SHOW STATUS（运行状态）是两类东西，巡检别混。

## 动手实践

练习一（预测题）：连接池里已有 10 个活跃连接，DBA 执行 `SET GLOBAL max_execution_time = 5000;` 后：第 11 个新连接里一条跑 8 秒的查询会怎样？原有 10 个连接里的同类查询呢？

提示：GLOBAL 只影响谁？

<details>
<summary>参考实现</summary>

新连接：查询超 5000 毫秒被中断，报 `ERROR 3024 (HY000): Query execution was interrupted, maximum statement execution time exceeded`——GLOBAL 值在**新建会话时**复制成会话默认。原有 10 个连接：继续用各自的旧会话值（默认 0 = 不限制），8 秒查询照跑。处置方式：要么让连接池刷新（重连/换池），要么对存量会话逐个 `SELECT connection_id()` 后 `KILL` 或让业务方重连。这个「GLOBAL 不溯及既有会话」的行为是本篇最容易踩的误解，也是「调优不生效」工单的头号答案。
</details>

练习二（实战题）：vocaloid 学习库有一条 5.7 时代的老查询：`SELECT company, name FROM singers GROUP BY company;`（想取每公司一位代表）。在 8.0 上跑会报什么？给出三种修法并按「语义正确性」排序：补列、ANY_VALUE、聚合函数（如 MIN(name) 取字典序第一名）。哪种结果与 5.7 宽松模式的行为最接近？

提示：5.7 宽松模式下「组内任一行」在物理上通常是分组扫描遇到的第一行，但没有承诺。

<details>
<summary>参考实现</summary>

8.0 上报 `ERROR 1055`（station_name 同款：name 不在 GROUP BY 且非聚合）。三种修法：

```sql
-- 修法一（语义正确）：分组单位本就是两列，补列
SELECT company, name FROM singers GROUP BY company, name;

-- 修法二（逃生口）：明确接受组内任意一行
SELECT company, ANY_VALUE(name) AS name FROM singers GROUP BY company;

-- 修法三（确定规则）：每公司取字典序最小的名字，结果可复现
SELECT company, MIN(name) AS rep FROM singers GROUP BY company;
```

与 5.7 行为最接近的是**修法二**（ANY_VALUE 就是「组内任一行」的显式化）；但业务上应优先修法三——「代表」本该有确定规则（最早注册、作品最多），MIN 只是规则之一；修法一改变了返回行数（公司+名字组合），只有「取唯一组合」语义时才用。排序规则「补列 > 聚合 > ANY_VALUE > 关模式」。
</details>

练习三（实战题）：给团队的「运维应急账号」写连接模板：登录即开启 sql_safe_updates 与 1 小时查询超时，且每次连接自动记录当前用户与会话变量到一张审计表。用 mysql 客户端的 `init-command`（my.cnf 的 `[client]` 段或 `--init-command` 参数）实现前两条，审计部分用触发器够不够？说明理由。

提示：审计「谁在何时改了会话变量」没有对应的会话级钩子——触发器是表级（见 [触发器与事件](/mysql/780-TriggerEvent)）。

<details>
<summary>参考实现</summary>

```ini
# my.cnf 的 [client] 段（或连接命令 --init-command）
[client]
user=dba_oncall
init-command="SET SESSION sql_safe_updates=1; SET SESSION max_execution_time=3600000"
```

前两条达成；审计部分**触发器不够**——触发器挂在表上、由数据变更引发，而「SET 会话变量」不是表操作，MySQL 没有会话变量变更的事件钩子。可行替代：其一，审计「效果」而非「动作」——在关键表上加触发器记录 BEFORE/UPDATE 镜像（能查到谁改了数据行，配合 `CURRENT_USER()`），间接锁定人；其二，企业版审计插件/社区版 audit 插件记录语句流（重量级，见 [防火墙与审计](/mysql/730-FirewallPlugin) 附近生态）；其三，约定所有应急操作走 `mysql tee /var/log/oncall-$(date +%F).log` 客户端侧留痕。三层防线（init-command 保险丝 + 表级触发器留痕 + 客户端 tee）组合是开源栈的务实答案。
</details>

练习四（找错题）：这段升级脚本在 8.0 上有两处问题，先找再修：

```sql
SET GLOBAL tx_isolation = 'READ-COMMITTED';
SET PERSIST sort_buffer_size = 262144;
SET PERSIST version_comment = 'my-build';
```

提示：一张改名表、一个只读变量。

<details>
<summary>参考实现</summary>

```sql
SET GLOBAL transaction_isolation = 'READ-COMMITTED';   -- tx_isolation 在 8.0 已移除
SET PERSIST sort_buffer_size = 262144;                  -- 这条本身合法
-- version_comment 是只读变量：ERROR 1238 ... is a read only variable
-- 想标注构建信息应走自己的机制（如建库时的注释表），不是改服务器元变量
```

两处问题：其一，`tx_isolation` 是 5.7 旧名，8.0 报 `ERROR 1193 (HY000): Unknown system variable`——改名后脚本全部换 `transaction_isolation`（升级前的 mysqlsh 体检就该拦下它）；其二，`version_comment` 属只读变量，运行期不可 SET——只读变量由编译/启动参数决定，脚本里出现 SET 它是「把服务器内部信息当配置」的概念错误。`sort_buffer_size` 一条可 SET 可 PERSIST，但顺带提个醒：它是**每连接分配**的排序缓冲，PERSIST 调大要按 `max_connections` 乘出内存总账（内存参数账见 [配置运维](/mysql/850-MySQLConfigOps)）。
</details>

练习五（实战题）：写一套「会话级快速试验」流程：在不影响其他会话的前提下，把当前会话切换到 READ-COMMITTED 隔离级别，验证脏读/不可重复读行为差异（用 vocaloid 库双会话实验：会话 A 更新不提交，会话 B 在两种隔离级别下分别读到什么），最后恢复原级别并说明为什么实验只该动 SESSION 层。

提示：`SET SESSION transaction_isolation = 'READ-COMMITTED'`；REPEATABLE READ 下 B 的可重复读快照见 [MVCC 原理](/mysql/430-MVCCPrinciple)。

<details>
<summary>参考实现</summary>

```sql
-- 会话 B：记录原值 -> 切级别 -> 实验 -> 恢复
SELECT @@SESSION.transaction_isolation;                  -- 记下原值（通常 REPEATABLE READ）
SET SESSION transaction_isolation = 'READ-COMMITTED';

-- 实验步骤（A/B 两个客户端窗口）：
-- A: START TRANSACTION; UPDATE singers SET name='洛天依V5' WHERE id=1;   -- 不提交
-- B: SELECT name FROM singers WHERE id=1;    -- READ-COMMITTED 下读到旧值（未提交不可见）
-- A: COMMIT;
-- B: SELECT name FROM singers WHERE id=1;    -- 同一事务内第二次读：读到新值（不可重复读出现）

SET SESSION transaction_isolation = 'REPEATABLE READ';   -- 恢复原级别
-- REPEATABLE READ 重复上述实验：B 事务内两次读一致（快照读，MVCC 提供）
```

只动 SESSION 的理由：隔离级别是会话语义——改 GLOBAL 会波及所有**新建**连接（连接池里的业务会话刷新后全变成 READ-COMMITTED），把一次实验变成一次全站行为变更；业务依赖 REPEATABLE READ 语义的代码（扣减、对账）会在你毫不知情时改变行为。实验收尾把级别设回原值，双会话隔离实验的完整版（含 SAVEPOINT）见 [事务与锁机制](/mysql/460-TransactionLockMechanism)。
</details>

## 与之前和之后的知识的关系

- 往前：配置文件与内存参数主线（本篇只管 sql_mode 与变量语义，大小参数账在 850）见 [配置运维](/mysql/850-MySQLConfigOps)；GROUP BY 的语义与性能两面见 [GROUP BY 与排序优化](/mysql/380-GroupByOrderByOptimization)；约束与严格模式对脏数据的双重拦截见 [约束与完整性](/mysql/075-ConstraintsIntegrityEnforcement)。
- 往后：隔离级别的完整机制见 [事务隔离实现](/mysql/420-TransactionIsolationImplementation) 与 [MVCC 原理](/mysql/430-MVCCPrinciple)；升级体检工具见 [MySQL Shell 工具链](/mysql/925-MySQLShellToolkit) 与 [8.4 升级指南](/mysql/840-MySQL84UpgradeGuide)；误删恢复的完整链路（binlog + PITR）见 [binlog](/mysql/490-Binlog) 与 [PITR](/mysql/580-PITR)。

## 参考与致谢

- MySQL 8.0 Reference Manual, §7.1.11 Server SQL Modes（sql_mode 全表与默认值）：https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §15.7.4.1 SET Syntax for Variable Assignment（GLOBAL/SESSION/PERSIST 三层）：https://dev.mysql.com/doc/refman/8.0/en/set-variable.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §7.1.7 Server Command Options（mysqld-auto.cnf 与 RESET PERSIST）：https://dev.mysql.com/doc/refman/8.0/en/server-configuration.html（GPL/CC BY-SA 许可）
- MySQL 8.0 Reference Manual, §2.11 升级章节与 mysqlsh util.checkForServerUpgrade（变量改名清单）：https://dev.mysql.com/doc/refman/8.0/en/upgrade.html（GPL/CC BY-SA 许可）
- 本篇默认 sql_mode 六项、PERSIST 行为与改名清单均以官方手册为依据。

## 自我检查

- 能背出 8.0 默认 sql_mode 的六个成员并各说一句「关掉会发生什么」；
- 能解释 ERROR 1055 的语义并用「补 GROUP BY 列 / ANY_VALUE」两种方式修复，说出为什么关模式是倒退；
- 能画出 SESSION/GLOBAL/PERSIST 三层的生效范围与重启后的覆盖关系；
- 能用 sql_safe_updates 复现 ERROR 1175 并说明它放行的三种「显式意图」写法；
- 能说出 tx_isolation → transaction_isolation 的改名迁移与升级前的体检路径；
- 能区分 SHOW VARIABLES 与 SHOW STATUS 的用途。
