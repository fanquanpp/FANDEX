---
order: 840
title: MySQL 8.4 升级指南
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 'MySQL 8.4 LTS 升级要点：版本线全景、8.0 到 8.4 移除清单（复制语法/变量/工具）、默认值变更与升级检查流程'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/590-Replication'
  - 'mysql/600-GTID'
  - 'mysql/610-ParallelReplication'
  - 'mysql/820-MySQL9NewFeatures'
prerequisites:
  - 'mysql/050-MySQLOverviewDatabaseDesign'
---

## 1. 版本线全景：该选哪个版本

2026 年的 MySQL 版本决策比以往简单——官方把版本线收拢成了两条轨道：

| 版本      | 类型        | 发布时间  | 适用                                   |
| --------- | ----------- | --------- | -------------------------------------- |
| 8.0       | 上一代主力  | 2018-04   | 存量系统；官方支持窗口临近尾声，应规划升级 |
| 8.4       | **LTS**     | 2024-04   | 新部署与升级的默认选择                 |
| 9.0-9.x   | 创新版      | 2024-07 起 | 每季度一个版本，尝鲜特性，不做长期停留 |
| 26.7 起   | 日历版本    | 2026-07 计划 | 官方已宣布转向 YY.M 日历版本号        |
| 28.4      | 下一 LTS    | 2028-04 计划 | 未来的长期支持目标                    |

选型口径：**生产默认 8.4 LTS**；9.x 创新版只验证特性不承载核心业务；
历史遗留的 5.7（2023-10 已 EOL）应先升 8.0 或直接评估升 8.4。

## 2. 升级前体检：官方检查器

```bash
# MySQL Shell 提供升级兼容性检查，逐条列出必须处理的问题
mysqlsh -- util check-for-server-upgrade root@localhost:3306 \
  --target-version=8.4.0 --config-path=/etc/my.cnf
```

它检查：保留字冲突、废弃参数、不兼容的数据类型/语法、字符集问题。
**先跑检查器，再动手升级**；复制拓扑中先升级从库、后升级主库。

## 3. 8.0 → 8.4 移除清单（升级失败的根源都在这里）

8.4 没有海量新特性，它的主题是"**把 8.0 里废弃的东西拆掉**"。
以下几组一旦留在 my.cnf 或脚本里，升级后会直接报错：

### 3.1 复制语法与术语（影响最大）

```sql
-- 旧拼写 → 8.4 新拼写（8.0.22 起新旧并存，8.4 只认新名）
CHANGE MASTER TO ...          -- → CHANGE REPLICATION SOURCE TO ...
START SLAVE / STOP SLAVE      -- → START REPLICA / STOP REPLICA
SHOW SLAVE STATUS             -- → SHOW REPLICA STATUS
SHOW MASTER STATUS            -- → SHOW BINARY LOG STATUS
RESET MASTER                  -- → RESET BINARY LOGS AND GTIDS
RESET SLAVE                   -- → RESET REPLICA
```

系统变量同步改名：`slave_parallel_workers` → `replica_parallel_workers`、
`slave_parallel_type` → `replica_parallel_type`（且该变量在 8.4 已随
DATABASE 粒度一起移除）等，全部 slave_/master_ 前缀都要替换。

### 3.2 复制相关变量与插件

```ini
# 以下变量在 8.4 已移除，配置文件必须清理：
# binlog_transaction_dependency_tracking = WRITESET   # 写集并行已是自动行为
# transaction_write_set_extraction = XXHASH64         # XXHASH64 是唯一实现
# master_info_repository / relay_log_info_repository  # 元数据恒为 TABLE
# expire_logs_days                                    # 用 binlog_expire_logs_seconds
```

半同步插件换名：`rpl_semi_sync_master/slave` 已移除，升级前先
`UNINSTALL PLUGIN` 旧插件，升级后安装 `rpl_semi_sync_source/replica`
（变量从 `rpl_semi_sync_master_*` 变为 `rpl_semi_sync_source_*`）。

### 3.3 InnoDB 配置

```ini
# 以下变量在 8.4 已移除：
# innodb_log_file_size / innodb_log_files_in_group / innodb_log_group_home_dir
#   → 改用 innodb_redo_log_capacity（8.0.30+ 已支持，建议升级前先切换）
```

行为变化：redo 文件从固定两个 `ib_logfileN` 变为 `#innodb_redo` 目录下
32 个文件（8.0.30 起）；change buffer 默认关闭
（`innodb_change_buffering` 默认 `none`，现代 NVMe 存储下收益为负），
仍可手工开启。

### 3.4 认证与客户端工具

- `mysql_native_password` 在 8.4 **默认禁用**（9.0 起移除）：
  老账号、老驱动（老版本 PHP/Java/Go 驱动）连接会报
  "Authentication plugin ... cannot be loaded"。升级前迁移到
  `caching_sha2_password`（8.0 起的默认插件）或升级驱动；
- `mysqlpump` 已移除 → 用 mysqldump 或 MySQL Shell `util.dumpInstance`；
- `mysqldump --master-data` 移除 → `--source-data`；
- `--compress`（协议压缩）移除 → `--compression-algorithms=zlib`；
- `mysql_upgrade` 不再需要：升级启动时自动完成数据字典升级。

## 4. 升级路径与流程

```text
原地升级（in-place）：适合同大版本系列（8.0.x → 8.4）
  1. 备份（物理备份 + binlog，保证可回退）
  2. 逐台从库：清理废弃配置 → 替换二进制 → 重启（自动完成升级）
  3. 从库全部升级并追平 → 切换写入 → 升级旧主库

逻辑迁移：跨大版本或不可停机时
  1. 新版本实例 + MySQL Shell util.dumpInstance / loadDump 导入
  2. binlog/GTID 追平 → 短窗口切换
```

> 注意：跨"多个大版本"（如 5.7 → 8.4）不能一步到位，按官方支持的
> 升级路径逐级进行；8.0 必须先升到 8.0 的较新小版本再升 8.4。

## 5. 9.x 创新版速览（要不要尝鲜）

| 版本 | 代表性变化                                             |
| ---- | ------------------------------------------------------ |
| 9.0  | VECTOR 向量类型；EXPLAIN ... INTO @变量；移除 mysql_native_password |
| 9.1+ | 每季度迭代：优化器与复制小步增强                        |

判断标准：需要 VECTOR 存储或跟随新特性 → 测试环境跟进 9.x；
否则停在 8.4 LTS，等下一个 LTS（28.4）。

## 6. 升级验证清单

```sql
-- 升级后必做验证
SELECT VERSION();                                   -- 版本号确认
SHOW REPLICA STATUS\G                              -- 复制双 Yes、延迟归零
SHOW VARIABLES LIKE 'invalid_version_check%';       -- 无告警
SELECT * FROM sys.innodb_lock_waits;               -- 无异常锁堆积
-- 业务侧：核心链路回归 + 慢查询日志对比升级前后 top SQL
```

## 7. 小结

- 初学者要点：新项目直接用 8.4 LTS；8.4 的核心变化是"移除"而非"新增"，
  升级工作量集中在清理旧语法与旧配置。
- 进阶注意：复制拓扑先从库后主库；升级前必跑
  `util checkForServerUpgrade`；三类高频翻车点——MASTER/SLAVE 拼写、
  `mysql_native_password` 默认禁用、mysqldump 选项改名；
  9.x 创新版按需跟进，生产主线保持 LTS。
