---
order: 730
title: 防火墙插件：SQL 白名单与注入拦截
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL Enterprise Firewall 三模式工作法：录制白名单、保护拦截、检测告警，社区版的能力边界与替代方案，以及它在注入防御纵深中的真实位置。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/740-SQLInjectionBasicsDetection'
  - 'mysql/760-SQLInjectionDefenseStrategy'
  - 'mysql/710-SSLEncryption'
  - 'mysql/690-AccountPermissionManagement'
prerequisites:
  - 'mysql/690-AccountPermissionManagement'
  - 'mysql/740-SQLInjectionBasicsDetection'
---

## 前置知识

- SQL 注入的原理与常见形态（[注入基础与检测](/mysql/740-SQLInjectionBasicsDetection)）——防火墙是注入防御的纵深之一，不是全部；
- MySQL 账号体系（[账号与权限管理](/mysql/690-AccountPermissionManagement)）。

## 它是什么：语句级的白名单闸门

MySQL Enterprise Firewall（防火墙插件）的思路直白有效：**为每个数据库账号学习"正常语句的指纹"，之后凡是白名单之外的语句一律拦截**。注入攻击无论多么花哨，落到数据库的语句必然偏离正常业务模式——"提前注入后门"形迹可疑，白名单模型天然识别它。

先划清最重要的能力边界：**这是 MySQL 企业版（商业付费）功能，社区版没有**。社区版用户本篇的价值在于理解白名单防御模型与替代方案选型（文末），企业版用户则按三模式流程落地。

## 三种模式：先学习，再上岗

| 模式 | 行为 | 使用时机 |
| --- | --- | --- |
| RECORDING（录制） | 记录账号的语句指纹，构建白名单 | 上线初期/灰度期 |
| PROTECTING（保护） | 白名单之外的语句直接拒绝并记录 | 生产常态 |
| DETECTING（检测） | 不拦截，只记录白名单外语句 | 观察验证期 |

```sql
-- 1. 安装插件（企业版安装包自带）
INSTALL PLUGIN mysql_firewall SONAME 'mysql_firewall.so';
INSTALL PLUGIN mysql_firewall_users SONAME 'mysql_firewall_users.so';

-- 2. 对目标账号开启录制，然后让业务正常跑一段时间（覆盖全部业务分支）
CALL mysql.sp_set_firewall_mode('app_rw', 'RECORDING');
-- ... 应用执行各类正常业务 SQL ...

-- 3. 观察期结束，先切检测模式并行观察（发现误拦风险）
CALL mysql.sp_set_firewall_mode('app_rw', 'DETECTING');

-- 4. 检测期无误报后，正式进入保护模式
CALL mysql.sp_set_firewall_mode('app_rw', 'PROTECTING');
```

三步走的精髓是**录制质量决定一切**：录制期业务没覆盖到的语句（月底报表、节假日活动接口），保护期一到全被拦——防火墙事故九成源于录制不完整。所以检测模式的并行观察期不可省，它是"白名单是否完整"的试运行。

## 白名单匹配的原理与误拦

Firewall 记录的不是 SQL 原文，而是**规范化后的语句指纹**（参数替换为占位符后的结构）：

```text
录制的指纹：SELECT name FROM users WHERE id = ?
真实注入：  SELECT name FROM users WHERE id = 1 OR 1=1
            → 指纹不匹配 → 拦截 + 日志告警
```

理解了指纹机制，误拦的来源也就清楚了：

1. **录制期未出现的合法新语句**：新功能上线、运营手工查询——治理方式是变更流程联动（新语句先在 DETECTING 验证）；
2. **指纹规范化的死角**：极特殊的动态拼接语句每次指纹都不同（如 IN 列表长度变化超出规范化能力）——这类业务 SQL 本身就该改写成参数化，防火墙的压力变成推动代码整改的契机。

拦截行为全部留痕，审计视角的查询：

```sql
-- 查看账号白名单状态
SELECT * FROM INFORMATION_SCHEMA.MYSQL_FIREWALL_USERS;

-- 查看已录制的白名单规则
SELECT * FROM INFORMATION_SCHEMA.MYSQL_FIREWALL_WHITELIST;

-- 被拦截的语句统计（接入监控告警——拦截数突增即是攻击信号）
SHOW GLOBAL STATUS LIKE 'Firewall%';
```

## 社区版怎么办：三层替代

社区版没有防火墙插件，但防御目标（拦异常语句）可以用三层组合逼近：

**第一层（最重要）：应用层根治**。参数化查询/预编译语句让注入在源头不可能发生（[注入防御策略](/mysql/760-SQLInjectionDefenseStrategy)），ORM 默认行为即如此。防火墙兜的是"应用层失守"的残余风险——第一层做扎实，防火墙的重要性自然下降。

**第二层：入口拦截**。WAF（Web 应用防火墙）在 HTTP 层拦注入特征，数据库前置代理（ProxySQL 支持查询重写与规则过滤）在协议层做粗粒度管控。它们不在数据库内部，但拦截语义相近。

**第三层：最小权限兜底**。应用账号只授予业务必需的表级权限、禁用 FILE/DANGerous 权限（[权限管理](/mysql/690-AccountPermissionManagement)）——即使注入成功，能造成的破坏也被权限边界锁死。纵深防御的含义就是：任何一层都不被假设为完美。

## 动手环节：企业版环境的完整演练

（社区版读者可跳过实操，通读流程理解模型；或用 ProxySQL 的查询规则做等价实验。）

```sql
-- 1. 录制：开启后执行一批"正常"查询
CALL mysql.sp_set_firewall_mode('fw_demo', 'RECORDING');
SELECT * FROM orders WHERE id = 1;
SELECT count(*) FROM orders WHERE user_id = 100;

-- 2. 切保护模式
CALL mysql.sp_set_firewall_mode('fw_demo', 'PROTECTING');

-- 3. 白名单内：正常通过
SELECT * FROM orders WHERE id = 2;

-- 4. 注入形态：被拦截
SELECT * FROM orders WHERE id = 1 OR 1=1;
-- ERROR 2013: Statement was blocked by Firewall
-- 同时 error log 出现拦截记录（账号、语句、时间）

-- 5. 查看战果
SHOW GLOBAL STATUS LIKE 'Firewall_access_denied';   -- 拦截计数 +1
```

第 4 步与第 3 步的一字之差（`OR 1=1`）导致一放一拦——白名单模型对注入的灵敏度在这一刻具象化。

## 常见困惑

**"有了防火墙还需要参数化查询吗？"**——需要，且前者永远不能替代后者。防火墙是运行时兜底，参数化是根治；两者是纵深防御的内外两层。反过来只做参数化、不做任何运行时监控，也无法发现"已存在的其他失守路径"。

**"白名单会不会误伤运营/DBA 的手工查询？"**——会。治理规范：业务账号与应用账号分开建防火墙策略；人工查询走独立账号且默认 DETECTING；任何新语句上线走检测观察期。防火墙的运维成本主要在这里，评估引入时要把这笔账算进去。

**"和 WAF 重复吗？"**——层级不同：WAF 在 HTTP 层（看得到 URL 与参数，看不到数据库协议细节），Firewall 在 SQL 层（看得到最终语句）。攻击者绕过 WAF 直连数据库的场景（内网横向移动），数据库侧白名单是最后一道闸。

## 检验清单

- 能说出三种模式的职责与"录制 → 检测 → 保护"三步走流程，并解释每一步防的是什么风险；
- 理解语句指纹的匹配原理，能举出两类误拦场景及治理方式；
- 知道企业版独占的边界，以及社区版三层替代（参数化/WAF/最小权限）；
- （企业版）完成录制到拦截的完整演练，见过 `OR 1=1` 被拒的现场。

## 下一步

至此 MySQL 安全篇（加密连接、数据加密、防火墙）成体系。防御的另一半是"知己知彼"：回看 [SQL 注入攻击类型](/mysql/750-SQLInjectionAttackTypePractice) 站在攻击者视角复盘整套纵深是否真的无懈可击。
