---
order: 81
title: GTID
module: mysql
category: MySQL
difficulty: advanced
description: MySQL全局事务标识符GTID：原理、配置、基于GTID的复制与故障切换
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/主从复制
  - mysql/进阶查询与多表操作
  - mysql/并行复制
  - mysql/组复制
prerequisites:
  - mysql/语法速查
---

## 1. GTID 概述

全局事务标识符（Global Transaction Identifier，GTID）为每个事务分配唯一标识，简化复制管理。

### 1.1 GTID 格式

$$
\text{GTID} = \text{server\_uuid}:\text{transaction\_id}
$$

```
3E11FA47-71CA-11E1-9E33-C80AA9429562:1-5
```

## 2. 配置

```ini
[mysqld]
gtid-mode = ON
enforce-gtid-consistency = ON
log-bin = mysql-bin
binlog-format = ROW
server-id = 1
```

## 3. 基于GTID的复制

```sql
-- 从库配置（无需指定 binlog 位置）
CHANGE MASTER TO
    MASTER_HOST = 'master-ip',
    MASTER_USER = 'repl',
    MASTER_PASSWORD = 'password',
    MASTER_AUTO_POSITION = 1;  -- 使用 GTID 自动定位

START SLAVE;
```

## 4. GTID 运维

```sql
-- 查看已执行的 GTID
SHOW MASTER STATUS;
-- Executed_Gtid_Set: 3E11FA47-71CA-11E1-9E33-C80AA9429562:1-100

-- 查看从库已执行的 GTID
SHOW SLAVE STATUS\G
-- Retrieved_Gtid_Set: ...
-- Executed_Gtid_Set: ...

-- 跳过有问题的 GTID 事务
SET GTID_NEXT = '3E11FA47-71CA-11E1-9E33-C80AA9429562:101';
BEGIN;
COMMIT;
SET GTID_NEXT = AUTOMATIC;
START SLAVE;
```

## 5. GTID 优势

- 无需手动定位 binlog 位置
- 故障切换更简单
- 可验证主从数据一致性
- 支持多源复制
