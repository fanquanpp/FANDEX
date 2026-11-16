---
order: 870
title: MySQL 8.4 升级指南
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 'MySQL 8.4 LTS 升级要点：版本线全景、8.0 到 8.4 移除清单（复制语法/变量/工具）、默认值变更与升级检查流程'
author: fanquanpp
updated: '2026-10-11'
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
| 8.0       | 上一代主力  | 2018-04   | **2026-04 已 EOL**（最后版本 8.0.46），仍在运行的必须排期升级 |
| 8.4       | **LTS**     | 2024-04   | 新部署与升级的默认选择                 |
| 9.0-9.6   | 创新版      | 2024-07 至 2026-01 | 每季度一版，已逐一过期，不可长期停留 |
| 9.7       | **LTS**     | 2026-04   | 想要 9.x 能力 + 长期支持的新项目（支持到 2031/2034） |
| 26.7 / 26.10 | 日历版本（创新） | 2026-07 / 2026-10 | 官方已改用 YY.M.P 日历版本号；支持期仅到下一版 |

选型口径：**生产默认 8.4 LTS，新项目可直接评估 9.7 LTS**；26.x 创新版只验证
特性不承载核心业务；历史遗留的 5.7（2023-10 已 EOL）与 8.0（2026-04 已 EOL）
升级不再是"规划项"而是"必做项"。下一 LTS 预计约 2028 年（官方未公布命名，
按日历推断可能是 28.4，不要把推断当官宣写进方案）。

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
仍可手工开启。此外 8.4 调整了一组 InnoDB 默认值，升级后行为会"悄悄变快/变慢"，
容量与压测要重跑：`innodb_io_capacity` 默认 200 → 10000、
`innodb_adaptive_hash_index` 默认 ON → OFF、`innodb_flush_method`（Linux）→ O_DIRECT、
`temptable_max_mmap` 默认 1GiB → 0（内存临时表不再自动落盘，注意大查询内存水位）、
`innodb_buffer_pool_instances` 改按缓冲池大小与 CPU 数自动推导。

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

## 5. 9.x 与 26.x 速览（要不要跟进）

| 版本 | 代表性变化                                             |
| ---- | ------------------------------------------------------ |
| 9.0  | VECTOR 向量类型；内联外键强制执行；EXPLAIN ... INTO @变量；移除 mysql_native_password |
| 9.1-9.6 | 触发器缓存、JS 存储程序（企业版）、9.3 起创新版之间不可降级、9.5 移除旧半同步插件名 |
| 9.7（LTS） | 9.x 特性收束；移除 `replica_parallel_type` 等；四段版本号 `VERSION_WITH_UPDATE()` |
| 26.7 / 26.10 | 日历版本号首航；Change Stream Applier；线程池进社区版；GR 默认通信栈改 MYSQL；社区版 REST Service 组件 |

判断标准：需要 VECTOR 存储或跟随新特性 → 测试环境跟进创新版；
生产主线在 8.4 LTS 与 9.7 LTS 之间选——要最小改动选 8.4，
要 9.x 能力选 9.7；**9.3 之后创新版之间不再支持降级**，尝鲜前先想好退路。

## 6. 升级验证清单

```sql
-- 升级后必做验证
SELECT VERSION();                                   -- 版本号确认
SHOW REPLICA STATUS\G                              -- 复制双 Yes、延迟归零
SHOW VARIABLES LIKE 'invalid_version_check%';       -- 无告警
SELECT * FROM sys.innodb_lock_waits;               -- 无异常锁堆积
-- 业务侧：核心链路回归 + 慢查询日志对比升级前后 top SQL
```

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：为什么说"8.4 的主题是移除而不是新增"？三类必然报错的东西是什么？

参考答案（先自己答，再对照）：8.4 作为 LTS 几乎不加新特性，核心工作是拆掉 8.0 里标记废弃的东西——这决定了升级工作量集中在"清理"而非"学习"。三类必然报错：旧复制语法与 slave_/master_ 变量（8.0.22 起新名并存、8.4 只认新名）；已移除的服务器变量（binlog_transaction_dependency_tracking、innodb_log_file_size、expire_logs_days 等，留在 my.cnf 直接启动失败）；移除的工具与选项（mysqlpump、--master-data、--compress）。

2. 写出流程：升级一台生产主从的最小安全步骤。

参考答案（先自己写，再对照）：

```bash
# 1. 全量物理备份 + binlog 保留（可回退的底线）
# 2. 从库逐台：mysqlsh -- util check-for-server-upgrade --target-version=8.4.0
#    清理报错的旧配置 → 替换二进制 → 重启（自动完成数据字典升级）
# 3. SHOW REPLICA STATUS 确认双 Yes 且延迟归零
# 4. 全部从库就位后，切换写入 → 升级旧主库
```

原则：先跑检查器再动手；先从库后主库；每步有回退路径（备份 + 停留在 8.0 的窗口）。

3. 判断题：升级后应用连不上、报 "Authentication plugin cannot be loaded"，说明 8.4 有 bug。

参考答案（先自己答，再对照）：不是 bug，是 8.4 默认禁用 `mysql_native_password`（9.0 起彻底移除）。用老插件认证的账号与老驱动全部被拒。处置：优先把账号迁移到 `caching_sha2_password` 并升级驱动（新插件首次认证需要 TLS 或 RSA 公钥交换，连接串补 allowPublicKeyRetrieval）；确有无法迁移的遗留系统，可在 my.cnf 加 `mysql_native_password=ON` 临时开启并排期迁移——这是缓冲带不是终点。

4. 概念自问：8.4 调整的一批 InnoDB 默认值（io_capacity 10000、adaptive_hash_index OFF、temptable_max_mmap 0）为什么要求"压测重跑"而不是"默认更好不用管"？

参考答案（先自己答，再对照）：默认值是按"现代典型硬件"调的——SSD/NVMe 高吞吐让 io_capacity 拉高合理、AHI 在高并发下锁争用转负、mmap 落盘在内存充裕时多余。但你的硬件、负载、内存水位未必是"典型"：io_capacity 拉高可能加速脏页刷新挤占前台 IO；AHI 关闭改变热点查询路径；temptable_max_mmap=0 让超大内存临时表直接溢盘 InnoDB——行为变化都发生在"计划之外"的路径上。默认值变了，基线也必须重建，否则升级后的一切性能对比都是错觉。

## 7. 小结

- 初学者要点：新项目直接用 8.4 LTS；8.4 的核心变化是"移除"而非"新增"，
  升级工作量集中在清理旧语法与旧配置。
- 进阶注意：复制拓扑先从库后主库；升级前必跑
  `util checkForServerUpgrade`；三类高频翻车点——MASTER/SLAVE 拼写、
  `mysql_native_password` 默认禁用、mysqldump 选项改名；
  9.x 创新版按需跟进，生产主线保持 LTS。
