---
order: 820
title: 事件调度器：数据库里的定时任务
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL Event Scheduler 实战：一次性与周期事件、ON COMPLETION 保留策略、错误处理与排查，以及"数据库定时任务 vs 系统 crontab"的选型判断。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/770-StoredProcedureAndFunction'
  - 'mysql/780-TriggerEvent'
  - 'mysql/340-SlowQueryLog'
  - 'mysql/850-MySQLConfigOps'
prerequisites:
  - 'mysql/100-DML'
---

## 问题引入：过期数据谁来清

会话表要清 30 天前的记录、统计表要每天凌晨汇总昨日数据、临时令牌要按小时回收——这类周期性数据维护，最先想到的是服务器 crontab。但 crontab 方案要求应用服务器装 MySQL 客户端、管一份凭据、看两处日志。**MySQL 事件调度器（Event Scheduler）**提供库内方案：把"什么时候执行什么 SQL"定义成事件，数据库自己按点执行。

先看开关——事件调度器默认关闭，这是新手定义完事件"怎么不跑"的第一原因：

```sql
SHOW VARIABLES LIKE 'event_scheduler';   -- OFF

SET GLOBAL event_scheduler = ON;         -- 立即生效，重启后失效
```

持久化要在 my.cnf 里加 `[mysqld] event_scheduler = ON`。

## 两种调度形态：AT 与 EVERY

```sql
-- 一次性事件：AT 指定时刻（或延迟表达式）
CREATE EVENT e_one_off
ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 HOUR
DO UPDATE users SET notified = 1
 WHERE last_login < NOW() - INTERVAL 7 DAY;

-- 周期事件：EVERY 指定间隔，可选 STARTS/ENDS 边界
CREATE EVENT e_clean_sessions
ON SCHEDULE EVERY 1 DAY
STARTS '2026-09-19 03:00:00'          -- 每天凌晨 3 点
DO DELETE FROM sessions
 WHERE created_at < NOW() - INTERVAL 30 DAY;
```

语法要点四条：

1. `DO` 后跟**单条 SQL**；多条逻辑装进 `BEGIN ... END` 块（此时需先改语句分隔符 `DELIMITER $$`，与存储过程同套路）；
2. `STARTS` 不写则从创建时刻开始按周期跑——"每天 3 点跑"必须写 STARTS，否则实际是"每天的这个创建时刻"跑；
3. 时间默认按会话 `time_zone` 解释，跨时区部署务必显式声明（`ON SCHEDULE ... AT CONVERT_TZ(...)`）；
4. 事件体里可以用 `CALL 存储过程()` 把复杂逻辑收进过程体，事件只当闹钟。

## 生命周期：ON COMPLETION 与修改删除

```sql
-- 默认：一次性事件执行完即被删除！想留尸体排查要显式保留
CREATE EVENT e_one_off
ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 DAY
ON COMPLETION PRESERVE                 -- 执行完保留（默认是 NOT PRESERVE）
DO ...;

-- 周期事件：禁用与启用（排查时挂起用，不用 DROP）
ALTER EVENT e_clean_sessions DISABLE;
ALTER EVENT e_clean_sessions ENABLE;

-- 改定义与删除
ALTER EVENT e_clean_sessions
ON SCHEDULE EVERY 1 HOUR
DO DELETE FROM sessions WHERE created_at < NOW() - INTERVAL 7 DAY;
DROP EVENT IF EXISTS e_clean_sessions;
```

"执行完自动消失"是新手第二大困惑来源：事件没跑出预期结果，回头一查连定义都没了。**排查期一律加 `ON COMPLETION PRESERVE`**，确认无误后再删。

## 排查：事件到底跑没跑

```sql
-- 事件清单与状态（ENABLED/DISABLED、最后执行时间）
SELECT EVENT_SCHEMA, EVENT_NAME, STATUS, EVENT_TYPE,
       LAST_EXECUTED, INTERVAL_VALUE, INTERVAL_FIELD
FROM information_schema.EVENTS;

-- 调度器线程在不在
SHOW PROCESSLIST;   -- 找 user 列为 event_scheduler 的守护线程
```

事件执行**不产生报错给任何客户端**——失败静默，只留在错误日志里。生产规范两条：事件体里包一层错误落表（`DECLARE EXIT HANDLER` 捕获后 INSERT 到运维日志表）；重要维护事件执行后写"心跳行"，用监控盯心跳新鲜度，事件停摆立刻报警。

## 选型：事件 vs crontab vs 应用调度

| 维度 | 事件调度器 | 系统 crontab | 应用层调度（xxl-job 等） |
| --- | --- | --- | --- |
| 部署 | 零依赖，库内自治 | 需服务器 + 客户端凭据 | 需调度平台 |
| 可观测 | 差（错误日志静默） | 中（有日志） | 好（平台可视化） |
| 逻辑承载 | SQL/存储过程 | 任意脚本 | 任意代码 |
| 多实例协调 | 无（每个实例独立跑） | 无 | 有（分片、幂等） |
| 适合 | 单库内数据清理/汇总 | 简单运维脚本 | 复杂业务批处理 |

务实结论：**纯数据清理与库内汇总用事件**（部署最简）；涉及文件、外部 API、多库协调的，别硬塞进事件——它的静默失败特性会在复杂逻辑里反噬。主从架构下还有一个坑必须知道：**事件在主从上都会执行**——把维护事件建在从库上等于在从库跑 DELETE 再复制回主库（从库只读模式下事件直接失败刷日志）。规范：事件只建主库，从库用 `SET GLOBAL event_scheduler = OFF` 关闭。

## 动手环节：建一个带心跳的清理事件

```sql
-- 1. 前置
SET GLOBAL event_scheduler = ON;

-- 2. 造测试表与过期数据
CREATE TABLE evt_sessions (id INT PRIMARY KEY AUTO_INCREMENT,
  created_at DATETIME);
INSERT INTO evt_sessions (created_at)
SELECT NOW() - INTERVAL n DAY FROM
  (WITH RECURSIVE t(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM t WHERE n < 60)
   SELECT n FROM t) s;

-- 3. 带心跳的事件：每次执行都留痕
CREATE EVENT e_clean_sessions
ON SCHEDULE EVERY 1 MINUTE            -- 演示用 1 分钟，生产改 1 DAY
ON COMPLETION PRESERVE
DO
BEGIN
  DELETE FROM evt_sessions WHERE created_at < NOW() - INTERVAL 30 DAY;
  CREATE TABLE IF NOT EXISTS evt_heartbeat (ran_at DATETIME);
  INSERT INTO evt_heartbeat VALUES (NOW());
END;

-- 4. 验证
SELECT EVENT_NAME, STATUS FROM information_schema.EVENTS
WHERE EVENT_NAME = 'e_clean_sessions';
-- 等一两分钟后：
SELECT * FROM evt_sessions;    -- 30 天前的行没了
SELECT * FROM evt_heartbeat;   -- 心跳在累积

-- 5. 收尾
DROP EVENT e_clean_sessions;
DROP TABLE evt_heartbeat; DROP TABLE evt_sessions;
```

## 常见困惑

**"事件和触发器什么区别？"**——触发器是"数据变更时被动触发"（AFTER INSERT 等），事件是"时间到了主动执行"。前者面向业务一致性联动（审计、级联），后者面向周期性维护——两者可以组合（事件调过程、过程里改数据、再点燃触发器），但别把周期维护写成触发器。

**"事件执行到一半失败了会重试吗？"**——不会，错过就错过（下个周期才再跑）。需要必达语义的任务用应用层队列方案，事件的定位是"尽力而为的周期维护"。

**"为什么我的事件状态是 SLAVESIDE_DISABLED？"**——这是复制防御：主库上 `REPLICATE_DO_DB` 相关策略或备份恢复时事件被标记为"从库侧禁用"。含义与处理见复制相关篇；自己建的库出现它，多半是从库 dump 恢复过来的。

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 写出语句：每天凌晨 2:30 清理 90 天前的日志表数据，事件要保留定义、失败可查。逐个子句说明它防什么坑。

参考答案（先自己写，再对照）：

```sql
CREATE EVENT ev_clean_logs
ON SCHEDULE EVERY 1 DAY
STARTS '2026-11-13 02:30:00'
ON COMPLETION PRESERVE
DO DELETE FROM event_logs WHERE created_at < NOW() - INTERVAL 90 DAY
LIMIT 5000;
```

STARTS 锚定首次执行时间（不写则随创建时刻，"半夜建的事件白天就跑"）；ON COMPLETION PRESERVE 让一次性（AT）事件跑完不自动删除——留尸排查；DELETE 带 LIMIT 分批——大表清理一晚上跑不完会连环堆积，分批可控。另两件配套：event_scheduler 默认 OFF 要显式开启；只建主库（从库事件会被禁用标记，防双跑）。

2. 概念自问：怎么验证"事件真的在跑"？三层证据各是什么？

参考答案（先自己答，再对照）：一层，`SHOW EVENTS` 看定义与状态（ENABLED/DISABLED）；二层，information_schema.EVENTS 的 LAST_EXECUTED 看最近执行时间戳；三层，业务证据——心跳表（事件每次执行更新一行时间戳）或日志表记录执行结果。三层递进：定义存在 → 系统说跑过 → 数据真的变了。只看第一层是"配置了"，看到第三层才是"在工作"。

3. 判断题：事件调度器和 crontab 都能定时执行，选哪个没有实质差别。

参考答案（先自己答，再对照）：差别实质在三点。执行环境：事件在数据库进程内执行，天然共享事务、锁与权限体系，适合"纯数据操作"；crontab 在 OS 层，适合要调用外部脚本/工具的任务。部署面：事件随库迁移（dump 带走）、有 ON COMPLETION 生命周期；crontab 在机器上，换机要迁移脚本。故障定位：事件执行历史在 performance_schema，crontab 靠自己写日志。选型口诀：纯 SQL 用事件、碰外部世界用 crontab、需要复杂编排用应用调度。

4. 概念自问：事件在从库上是什么状态？为什么规范要求"只建主库"？

参考答案（先自己答，再对照）：复制拓扑里从库上的事件被置为 SLAVESIDE_DISABLED——防止主从各跑一份造成双写冲突。但备份恢复、主从切换的边界场景会让事件定义"意外出现在"从库或新主上：新主提升后若事件未被重新启用，定时任务静默停摆。规范"只建主库 + 心跳表监控新鲜度"正是为了在切换后第一时间发现"任务没人跑了"。

## 检验清单

- 会开启调度器（运行时 + 配置文件双层），知道它默认 OFF；
- 能写 AT/EVERY 两种事件并解释 STARTS 与时区的必要性；
- 记住三条工程规范：PRESERVE 留尸排查、心跳表盯新鲜度、只建主库；
- 完成"带心跳的清理事件"全流程实验；
- 能按选型表判断一个定时任务该用事件、crontab 还是应用调度。

## 下一步

事件是数据维护的自动化，[存储过程与函数](/mysql/770-StoredProcedureAndFunction) 是数据逻辑的封装——两者组合正是库内自治工具箱的两大件；配置层面的持久化细节回看 [MySQL 配置运维](/mysql/850-MySQLConfigOps)。
