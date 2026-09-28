---
title: 视图与物化视图
description: PostgreSQL 视图的三种身份（存储的查询、权限门、接口层）与物化视图的刷新取舍，为可更新视图打底。
---

## 为什么先有视图

运营要"只看在职员工"的报表，开发者要"每月活跃用户"的口径。这两个需求都指向同一个做法：**把一条常用查询存成一个可以像表一样查询的名字**，这就是视图：

```sql
CREATE VIEW active_employees AS
SELECT id, name, dept_id, salary
FROM employees
WHERE status = 'active';

SELECT name, salary FROM active_employees WHERE dept_id = 3;
```

视图不存数据。每次查询视图，PostgreSQL 都把视图定义重写进你的查询（重写器干的就是这活），所以看到的数据永远是最新的。三个典型用途：

- **权限门**：只授视图的 SELECT，不授底表，敏感列（salary）干脆不出现在视图里；
- **口径统一**："活跃用户"只定义一次，所有报表引用同一个定义；
- **简化复杂查询**：把四表 JOIN 存成视图，下游写起来像单表。

## 物化视图：把结果真的存下来

视图每次都重算，复杂聚合在大表上每次几秒。物化视图把**查询结果真正写入磁盘**，查询变成读一张表：

```sql
CREATE MATERIALIZED VIEW monthly_plays AS
SELECT date_trunc('month', played_at) AS month,
       show_name,
       COUNT(*) AS play_count
FROM plays
GROUP BY 1, 2;

-- 数据源更新后，结果不会自己变，要手动（或定时任务）刷新
REFRESH MATERIALIZED VIEW monthly_plays;
```

代价与取舍一句话：**视图永远最新但要重算，物化视图读取飞快但会过期**。适合"算得慢、读得多、容忍分钟级延迟"的报表聚合。

## 坑点与自检

- **刷新会锁读**：普通 REFRESH 拿排他锁，刷新期间查询被阻塞。要"边刷新边可读"用 `REFRESH MATERIALIZED VIEW CONCURRENTLY`，前提是物化视图上有唯一索引（`CREATE UNIQUE INDEX ... ON ...`），建视图后先补索引。
- **以为视图是快照**：视图是存储的查询，底表变化立刻反映；要"某个时点的快照"用物化视图或普通表。
- **权限只授视图就够吗**：够，但底表所有者与视图所有者的权限关系（security_invoker，PG 15+ 可选）会影响 RLS 行为，涉及行级安全时见 [RLS](/postgresql/500-RowLevelSecurity)。
- **改视图定义**：小改动用 `CREATE OR REPLACE VIEW`（新增列只能加在末尾）；结构大改就 DROP 再建，注意下游依赖。

## 下一步

- 视图能不能写？自动可更新视图、WITH CHECK OPTION、INSTEAD OF 触发器，见[可更新视图](/postgresql/140-UpdatableView)；
- 视图定义被重写器展开的位置，见[体系架构](/postgresql/160-SystemArchitecture)的查询处理流程一节。
