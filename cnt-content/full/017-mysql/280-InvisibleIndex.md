---
order: 280
title: 不可见索引：安全删除索引的唯一姿势
module: 'mysql'
category: 数据库
difficulty: intermediate
description: INVISIBLE 关键字的完整使用法：索引维护成本从哪来、为什么直接删除是高危操作、不可见索引如何把删除变成可回滚的灰度实验。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/270-IndexHintForceIndex'
  - 'mysql/290-FunctionalIndex'
  - 'mysql/300-IndexStatsHistogram'
  - 'mysql/210-IndexManagement'
prerequisites:
  - 'mysql/210-IndexManagement'
  - 'mysql/220-ClusteredIndexSecondaryIndex'
---

## 前置知识

- 索引的增删基础（[索引管理](/mysql/210-IndexManagement)）；
- 二级索引的存储与维护成本（[聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)）。

## 索引不是免费的：为什么想删它

每建一个二级索引，InnoDB 就要维护一棵独立的 B+ 树。日常代价清单：

- **写入放大**：每次 INSERT/UPDATE/DELETE，所有相关索引都要同步修改。索引越多，写入越慢、事务越长；
- **空间占用**：一棵千万行的索引树轻松吃掉数 GB；
- **优化器负担**：候选索引越多，执行计划生成的组合空间越大，个别场景反而更容易选错。

所以定期清理"没人用"的索引是正经的优化工作。问题在于：**怎么确定真的没人用？**

## 直接删除为什么是高危操作

`performance_schema` 或慢日志能告诉你"观察期内没用过"，但风险藏在观察盲区：

1. **低频关键路径**：每月底跑一次的财务报表、季度对账任务、一年一次的迁移脚本——观察窗口三十天也抓不到；
2. **隐藏在 ORM 与动态 SQL 里**：应用代码里拼接出来的查询，人眼审查很难覆盖全；
3. **删错的代价不对称**：加回一个索引，大表上是在线 DDL 漫长的重建（期间还有写入放大与主从延迟）；而期间生产查询失去索引、全表扫描拖垮数据库的事故，可能已经发生了。

删除索引的危险不在于操作本身，而在于**不可逆的时间窗**。不可见索引把这个窗口变成了零风险。

## INVISIBLE：先隐身，再删除

把索引标记为不可见后，它**继续被维护**（写入照常更新它、空间照常占用），但优化器**假装它不存在**——所有查询（包括你不知道的那些）都在"没有这个索引"的世界里执行：

```sql
-- 1. 查看当前索引
SHOW INDEX FROM orders;
-- 或查元数据
SELECT INDEX_NAME, IS_VISIBLE
FROM information_schema.STATISTICS
WHERE TABLE_NAME = 'orders' AND TABLE_SCHEMA = 'mydb'
GROUP BY INDEX_NAME, IS_VISIBLE;

-- 2. 标记为不可见（秒级元数据变更，不重建索引树）
ALTER TABLE orders ALTER INDEX idx_old_status INVISIBLE;

-- 3. 观察期（建议至少覆盖一个完整业务周期：月底报表、批量任务都要包含）
--    盯三类信号：慢查询日志有无新增、性能监控有无毛刺、业务方有无反馈

-- 4a. 一切正常，正式删除
ALTER TABLE orders DROP INDEX idx_old_status;

-- 4b. 有查询依赖？秒级回滚（同样是元数据变更）
ALTER TABLE orders ALTER INDEX idx_old_status VISIBLE;
```

与直接 `DROP INDEX` 对比，这条路径的核心优势：

| | 直接删除 | INVISIBLE 后删除 |
| --- | --- | --- |
| 发现"其实有人用"的方式 | 生产事故 | 观察期慢查询/告警 |
| 回滚方式 | 在线 DDL 重建（小时级，大表） | 一条 ALTER（秒级） |
| 观察期内写入性能 | 已恢复（无维护开销） | 仍是旧状态（索引仍维护） |
| 风险 | 高 | 接近零 |

注意表中第三行：观察期内你并没有省下写入开销（索引还在被维护），INVISIBLE 验证的是**查询侧**没有依赖；空间与写入的收益要等真正 DROP 之后才兑现。这是设计使然——先用安全换取确定性，再拿确定性换取收益。

## 动手环节：安全下线实验

```sql
-- 准备
CREATE TABLE inv_demo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  status TINYINT NOT NULL,
  note VARCHAR(50)
);
CREATE INDEX idx_status ON inv_demo(status);
INSERT INTO inv_demo (status, note)
SELECT FLOOR(RAND()*5), CONCAT('note-', n) FROM
  (SELECT a.N + b.N*10 + c.N*100 n
   FROM (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
         UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
         UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
        (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
         UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
         UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
        (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
         UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
         UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c) t;

-- 验证索引用于查询
EXPLAIN SELECT * FROM inv_demo WHERE status = 3;
-- key=idx_status

-- 隐身后再看
ALTER TABLE inv_demo ALTER INDEX idx_status INVISIBLE;
EXPLAIN SELECT * FROM inv_demo WHERE status = 3;
-- key=NULL, type=ALL —— 优化器已当它不存在

-- 验证"仍被维护"：写入不受影响，空间未释放
INSERT INTO inv_demo (status, note) VALUES (3, 'still maintained');
SELECT COUNT(*) FROM inv_demo WHERE status = 3;  -- 照常返回

-- 恢复可见
ALTER TABLE inv_demo ALTER INDEX idx_status VISIBLE;
EXPLAIN SELECT * FROM inv_demo WHERE status = 3;
-- key=idx_status 回来了
```

## 使用边界

- **主键不可隐身**：聚簇索引即数据本身；
- **唯一索引慎用**：INVISIBLE 只影响优化器，**唯一性约束依然生效**——这是优点（约束不丢），但别误以为"没人用了"：可能业务依赖的是唯一性保护而非查询加速；
- **外键与优化器 hint 交互**：若 SQL 里有 `FORCE INDEX` 明确点名某索引，隐身状态下该索引被视为不可用，查询会退化——隐身上线前先全局搜一遍代码里的索引提示；
- MySQL 8.0 起支持；老版本只能用"改名 + 观察"或影子表等笨办法。

## 常见困惑

**"观察多久算安全？"**——覆盖你业务的完整周期：至少一个月，且必须包含月末、季度末等批处理节点。金融类系统建议覆盖年度节点或用应用层 SQL 审计日志交叉验证。

**"和上一节的 IGNORE INDEX 怎么分工？"**——调试单条 SQL 的执行计划用 IGNORE（局部、语句级）；评估整个索引的下线用 INVISIBLE（全局、可灰度、可秒回滚）。两者都服务于"决策有数据"这个原则。

## 检验清单

- 能列出索引的三项持续成本，说清"想删索引"的动机；
- 能复述 INVISIBLE 验证法的四步流程与两类回滚路径；
- 知道唯一索引隐身后约束仍生效、FORCE INDEX 与隐身的冲突点；
- 在测试表上完整跑通了隐身 → 验证 → 恢复的实验。

## 下一步

索引的"看不见"解决了删除安全，而优化器对索引的"看不准"则靠统计信息与直方图：进入[索引统计信息与直方图](/mysql/300-IndexStatsHistogram)。
