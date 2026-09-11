---
order: 450
title: 增量备份
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL增量备份：PG17 pg_basebackup --incremental与pg_combinebackup、backup_manifest、WAL归档与PITR恢复
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/400-PhysicalReplicationSlot'
  - 'postgresql/420-LogicalDecodingOutputPlugin'
  - 'postgresql/460-PgDumpRestore'
  - 'postgresql/390-StreamingReplication'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 1. 备份体系全景：增量备份处在什么位置

PostgreSQL 的备份恢复分两条路线，先分清再谈"增量"：

```
逻辑备份: pg_dump / pg_restore     -> 导出 SQL 级数据, 无时间点恢复
物理备份: 基础备份(pg_basebackup) + WAL 归档 -> 实例级, 支持 PITR
                      ^
            本文的主角。增量备份是"基础备份"的进化形态（PG 17+）
```

物理备份为什么必须配套 WAL：基础备份是某一瞬间的全量物理副本，
备份期间与之后的变更全部记在 WAL 里，恢复 = 基础备份 + 重放 WAL。
**增量备份解决的问题是：基础备份本身太大、每天全备成本过高。**

类比：全量备份是每月 1 号给书库拍完整快照；WAL 归档是"逐条记录
此后每一笔增删改"；而增量备份（17+）是"每周只拍那些**被翻动过的
书架**"——两者叠加，恢复时再合成完整快照。

## 2. PostgreSQL 17 增量备份原理

三个新要素：

1. **WAL summarizer 后台进程**（`summarize_wal = on`）：持续把 WAL 中
   "修改了哪些数据块"汇总成摘要，增量备份据此知道该抓哪些块；
2. **`pg_basebackup --incremental`**：只输出自参考备份以来被修改的块；
3. **`pg_combinebackup`**：把全量与一串增量合成为可直接恢复的
   "合成全量备份"。

每次备份都会生成 **backup_manifest** 清单文件（记录每个文件的
大小、修改时间与校验和），它既是增量备份的"参考点"，也是
`pg_verifybackup` 校验完整性的依据。

```sql
-- 开启 WAL 摘要（增量备份的前提, 重载即可生效）
ALTER SYSTEM SET summarize_wal = on;
SELECT pg_reload_conf();

-- 验证摘要进程在产生摘要
SELECT * FROM pg_available_wal_summaries LIMIT 3;
--  tli |   begin_lsn   |    end_lsn
-- -----+---------------+---------------
--    1 | 0/3000028     | 0/3100000
```

## 3. 增量备份操作全流程

### 3.1 全量参考备份

```bash
# 推荐目录格式(-Fp): manifest 是独立文件, 便于 --incremental 直接引用
pg_basebackup -h primary -U replicator \
  -D /backup/base -Fp -Xs -P
ls /backup/base
# backup_label  backup_manifest  base/  pg_wal/ ...   <-- 注意 manifest 文件
```

### 3.2 增量备份

```bash
# --incremental 指向参考备份的 backup_manifest（不是目录、不是 base.tar）
pg_basebackup -h primary -U replicator \
  -D /backup/incr_mon -Fp -Xs -P \
  --incremental=/backup/base/backup_manifest

# 增量文件特征: 数据文件带 _incr 后缀, 只包含被修改过的块
ls /backup/incr_mon/base/16384/ | head
# 24596      24596.1  24596.2  24596.3  24596_vm.1_incr ...
```

### 3.3 合并：pg_combinebackup

```bash
# 参数顺序 = 从旧到新（全量在最前, 最后一个是最新的增量）
# -o 为必填, 产物是"合成全量", 可直接用于恢复, 也可继续作为下一次增量的参考
pg_combinebackup /backup/base /backup/incr_mon -o /backup/full_mon
```

### 3.4 校验与恢复

```bash
# 校验（对照 manifest 检查每个文件的校验和）
pg_verifybackup /backup/full_mon

# 之后按标准物理恢复流程使用（见 3.5 PITR）:
# 停实例 -> 清空数据目录 -> 拷入合成备份 -> 配置 restore_command
# -> touch recovery.signal -> 启动 -> 重放 WAL 到目标时间点
```

### 3.5 与 PITR 配合的完整恢复

```bash
# 1. 放入合成后的基础备份
cp -a /backup/full_mon/* /var/lib/postgresql/18/main/

# 2. 配置恢复
cat >> /var/lib/postgresql/18/main/postgresql.auto.conf << EOF
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-06-14 10:00:00'
recovery_target_action = 'promote'
EOF

# 3. 创建恢复标记（存在此文件, 实例启动即进入恢复模式）
touch /var/lib/postgresql/18/main/recovery.signal

# 4. 启动, WAL 重放到目标点后自动提升为主
systemctl start postgresql
```

## 4. 传统备份手段（仍是地基）

### 4.1 pg_basebackup 常规选项

```bash
# 全量基础备份（常用参数组合）
pg_basebackup -h localhost -U replicator -D /backup/full -Fp -Xs -P -R

# 压缩 tar 格式
pg_basebackup -h localhost -U replicator -D /backup/full -Ft -z -P

# -Fp: 目录格式   -Ft: tar 格式
# -Xs: 以流方式同时抓取备份期间产生的 WAL（推荐）
# -P : 显示进度
# -R : 自动写 standby.signal 与 primary_conninfo（用于搭建备库）
# -C -S slot_name: 自动创建并使用物理复制槽, 保证 WAL 不缺段
```

### 4.2 WAL 归档与 pg_receivewal

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
# 注意: archive_command 失败会反复重试并阻塞 WAL 段循环,
# 命令必须"目标已存在则成功", 否则磁盘会被未归档段塞满
```

```bash
# 归档的替代/补充: 用流协议持续接 WAL, 通常比 archive_command 延迟更低
pg_receivewal -h localhost -U replicator -D /archive/wal --synchronous
```

```sql
-- 归档健康监控: failed_count 持续增长说明 archive_command 有问题
SELECT archived_count, failed_count, last_archived_wal, last_failed_wal
FROM pg_stat_archiver;
--  archived_count | failed_count | last_archived_wal | last_failed_wal
-- ----------------+--------------+-------------------+-----------------
--           12034 |            0 | 00000001000000000000005E |
```

## 5. 实战：企业级备份策略模板

```
周日   pg_basebackup 全量（-Fp, 保留 manifest）
周一~周六  pg_basebackup --incremental（参考最近一次合成全量的 manifest）
持续   pg_receivewal 或 WAL 归档到备份盘/远端
每周   pg_combinebackup 合成 + pg_verifybackup 校验
演练   每季度真实恢复到隔离环境并跑业务冒烟测试
保留   按合规要求滚动删除（合成全量可直接删除, 增量链不可拆散）
```

增量链注意事项：

- 增量备份**不能单独使用**，也**不能抽掉链条中间的任何一环**；
- 合成产物可以当作新的参考备份继续做增量；
- `--incremental` 需要 PostgreSQL 17 及以上服务端与客户端配套。

## 6. 常见陷阱

- **没开 summarize_wal 就做增量**：服务器会报错要求开启 WAL 摘要；
  开启后到第一个摘要生成为止仍有短暂窗口。
- **把 tar 文件路径传给 --incremental**：它只认 backup_manifest 文件；
  tar 格式的备份需先解开或改用目录格式。
- **pg_combinebackup 参数顺序颠倒**：必须从旧到新，且 -o 目标目录
  不能与输入重叠。
- **只备份不演练**：manifest 校验通过不等于业务可恢复；
  未演练过的备份约等于没有备份。
- **用 cp/rsync 直接热拷数据目录代替物理备份**：备份到的可能是不一致
  的脏页集合，无法正常启动；请始终使用 pg_basebackup 或文件系统级
  快照（配合数据库暂停/冻结）。

## 小结

- 初学者要点：物理备份 = 基础备份 + WAL；PG 17 起支持真正的增量
  基础备份，工作流是"全量 -> --incremental 增量 -> pg_combinebackup
  合成 -> 恢复/校验"；backup_manifest 既是增量参考点也是校验依据。
- 进阶注意：增量依赖 WAL summarizer 与块级摘要，适合大库降低备份窗口；
  归档命令必须幂等；备份策略四件套（全量节奏、增量链、WAL 连续性、
  定期恢复演练）缺一不可。
