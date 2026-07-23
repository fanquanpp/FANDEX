---
order: 63
title: 数据库运维
module: devops
category: 运维
difficulty: advanced
description: 数据库运维：备份恢复、主从复制、读写分离、分库分表与数据迁移
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/监控与告警
  - devops/网络与安全进阶
  - devops/Dockerfile多阶段构建
  - devops/Kubernetes核心资源详解
prerequisites:
  - devops/概述与Linux基础
---

## 1. 备份与恢复

### 1.1 备份策略

| 策略     | 说明           | 恢复时间 | 存储开销 |
| -------- | -------------- | -------- | -------- |
| 全量备份 | 备份所有数据   | 快       | 大       |
| 增量备份 | 仅备份变更     | 中       | 小       |
| 差异备份 | 相对全量的变更 | 中       | 中       |
| 逻辑备份 | SQL 导出       | 慢       | 中       |
| 物理备份 | 文件拷贝       | 快       | 大       |

### 1.2 MySQL 备份

```bash
# mysqldump 逻辑备份
mysqldump -u root -p --all-databases --single-transaction --routines --triggers > full_backup.sql

# 单库备份
mysqldump -u root -p mydb > mydb_backup.sql

# 增量备份（基于 binlog）
mysqladmin flush-logs
cp /var/lib/mysql/mysql-bin.* /backup/

# XtraBackup 物理备份
xtrabackup --backup --target-dir=/backup/full
xtrabackup --backup --target-dir=/backup/inc1 --incremental-basedir=/backup/full
```

### 1.3 恢复操作

```bash
# 逻辑恢复
mysql -u root -p < full_backup.sql

# 时间点恢复
mysqlbinlog --start-datetime="2026-06-14 10:00:00" \
            --stop-datetime="2026-06-14 10:30:00" \
            mysql-bin.000123 | mysql -u root -p

# XtraBackup 恢复
xtrabackup --prepare --target-dir=/backup/full
xtrabackup --copy-back --target-dir=/backup/full
```

### 1.4 备份验证

```bash
# 定期验证备份可恢复性
mysql -u root -p -e "CREATE DATABASE backup_test"
mysql -u root -p backup_test < backup.sql
mysql -u root -p backup_test -e "SHOW TABLES; SELECT COUNT(*) FROM users"
mysql -u root -p -e "DROP DATABASE backup_test"
```

## 2. 主从复制

### 2.1 MySQL 主从复制

```
主库 → binlog → 从库（IO线程）→ relay log → 从库（SQL线程）→ 数据
```

**配置主库**：

```ini
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW
gtid-mode = ON
enforce-gtid-consistency = ON
```

**配置从库**：

```ini
[mysqld]
server-id = 2
relay-log = relay-bin
read-only = ON
super-read-only = ON
```

**建立复制**：

```sql
-- 从库执行
CHANGE MASTER TO
  MASTER_HOST='master',
  MASTER_USER='repl',
  MASTER_PASSWORD='password',
  MASTER_AUTO_POSITION=1;
START SLAVE;
```

### 2.2 复制延迟监控

```sql
-- 查看复制状态
SHOW SLAVE STATUS\G

-- 关键指标
Seconds_Behind_Master    # 延迟秒数
Slave_IO_Running         # IO 线程状态
Slave_SQL_Running        # SQL 线程状态
Retrieved_Gtid_Set       # 已接收的 GTID
Executed_Gtid_Set        # 已执行的 GTID
```

### 2.3 延迟优化

| 方法       | 说明                              |
| ---------- | --------------------------------- |
| 多线程复制 | slave_parallel_workers            |
| 组提交     | binlog_group_commit               |
| 半同步复制 | rpl_semi_sync                     |
| 并行复制   | slave_parallel_type=LOGICAL_CLOCK |

## 3. 读写分离

### 3.1 读写分离架构

```
客户端 → 代理层 → 主库（写）
                 → 从库1（读）
                 → 从库2（读）
                 → 从库3（读）
```

### 3.2 代理方案

| 代理           | 特点                   |
| -------------- | ---------------------- |
| ProxySQL       | 功能丰富，支持查询缓存 |
| MySQL Router   | Oracle 官方            |
| MyCat          | 国产，功能全面         |
| ShardingSphere | Apache 项目            |

### 3.3 ProxySQL 配置

```sql
-- 添加后端服务器
INSERT INTO mysql_servers (hostgroup_id, hostname, port, weight)
VALUES (0, 'master', 3306, 1),    -- 写组
       (1, 'slave1', 3306, 1),    -- 读组
       (1, 'slave2', 3306, 1);

-- 配置路由规则
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup, apply)
VALUES (1, 1, '^SELECT.*FOR UPDATE', 0, 1),  -- 写走主库
       (2, 1, '^SELECT', 1, 1);               -- 读走从库
```

## 4. 分库分表

### 4.1 分片策略

| 策略       | 说明          | 优点     | 缺点     |
| ---------- | ------------- | -------- | -------- |
| 范围分片   | 按 ID 范围    | 扩展方便 | 热点问题 |
| 哈希分片   | 按 key 哈希   | 分布均匀 | 扩展困难 |
| 一致性哈希 | 哈希+虚拟节点 | 扩展方便 | 实现复杂 |
| 查找表     | 映射表路由    | 灵活     | 额外查询 |

### 4.2 ShardingSphere 配置

```yaml
dataSources:
  ds_0:
    url: jdbc:mysql://host0:3306/db_0
  ds_1:
    url: jdbc:mysql://host1:3306/db_1

shardingRule:
  tables:
    t_order:
      actualDataNodes: ds_${0..1}.t_order_${0..15}
      databaseStrategy:
        standard:
          shardingColumn: user_id
          shardingAlgorithmName: order_db_mod
      tableStrategy:
        standard:
          shardingColumn: order_id
          shardingAlgorithmName: order_table_mod

  shardingAlgorithms:
    order_db_mod:
      type: MOD
      props:
        sharding-count: 2
    order_table_mod:
      type: MOD
      props:
        sharding-count: 16
```

### 4.3 分布式 ID

| 方案     | 原理           | 优点         | 缺点         |
| -------- | -------------- | ------------ | ------------ |
| UUID     | 随机生成       | 简单         | 无序，索引差 |
| 雪花算法 | 时间+机器+序列 | 有序，高性能 | 时钟依赖     |
| 号段模式 | 预分配号段     | 简单         | 不连续       |
| Redis    | INCR           | 简单         | 依赖 Redis   |

**雪花算法 ID 结构**：

```
0 | 00000000000000000000000000000000000000000 | 00000 | 00000 | 000000000000
  │                  41位时间戳               │ 5位DC │ 5位机器│  12位序列
```

## 5. 数据迁移

### 5.1 在线迁移工具

**gh-ost（GitHub）**：

```bash
gh-ost \
  --host=master \
  --database=mydb \
  --table=users \
  --alter="ADD COLUMN age INT" \
  --allow-on-master \
  --execute
```

**pt-online-schema-change（Percona）**：

```bash
pt-online-schema-change \
  --host=master \
  --user=root \
  --alter="ADD INDEX idx_email (email)" \
  D=mydb,t=users \
  --execute
```

### 5.2 迁移流程

```
1. 创建影子表（新结构）
2. 在影子表上建立触发器（同步增量变更）
3. 分批拷贝历史数据
4. 验证数据一致性
5. 原子切换表名
6. 清理旧表
```

### 5.3 跨库迁移

```bash
# 使用 DataX 迁移
python datax.py migration.json

# 使用 Canal 监听 binlog 实时同步
canal.instance.master.address=source:3306
canal.instance.filter.regex=source_db\\..*
```

## 6. 数据库巡检

### 6.1 巡检清单

| 检查项   | 方法                      |
| -------- | ------------------------- |
| 连接数   | SHOW PROCESSLIST          |
| 慢查询   | 慢查询日志                |
| 锁等待   | SHOW ENGINE INNODB STATUS |
| 表空间   | information_schema.TABLES |
| 索引使用 | sys.schema_unused_indexes |
| 主从延迟 | SHOW SLAVE STATUS         |
| 磁盘空间 | df -h                     |
| 备份状态 | 验证备份文件              |

### 6.2 自动巡检脚本

```bash
#!/bin/bash
# MySQL 巡检脚本

echo "=== 连接数 ==="
mysql -e "SHOW STATUS LIKE 'Threads_connected'"
mysql -e "SHOW STATUS LIKE 'Max_used_connections'"

echo "=== 慢查询 ==="
mysql -e "SHOW STATUS LIKE 'Slow_queries'"

echo "=== InnoDB 状态 ==="
mysql -e "SHOW ENGINE INNODB STATUS\G" | grep -A5 "TRANSACTIONS"

echo "=== 主从状态 ==="
mysql -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running|Seconds_Behind"
```
