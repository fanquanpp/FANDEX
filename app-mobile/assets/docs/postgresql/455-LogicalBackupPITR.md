---
order: 420
title: 逻辑备份与时间点恢复（PITR）
module: 'postgresql'
category: 数据库
difficulty: beginner
description: pg_dump/pg_restore/pg_dumpall 逻辑备份线：自定义格式与并行恢复、schema-only 与数据子集策略、WAL 归档、PITR 演练与恢复演练 checklist
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：PostgreSQL 服务器管理 / 备份与恢复（官方文档 Chapter 25 Backup and Restore）。
- **解决什么问题**：[增量备份](/postgresql/450-IncrementalBackup)讲的是**物理**线（整库文件级）；本篇讲**逻辑**线——按库、按表、甚至按条件导出数据，以及两者合体后的终极能力 PITR：把库恢复到"昨天 14:23:07 删表之前的那一毫秒"。
- **什么时候用到**：版本升级（跨大版本物理复制帮不上忙）、单表/部分数据迁移、开发环境造数、误删数据后回滚到指定时刻、合规要求定期演练。
- **前置阅读**：[增量备份](/postgresql/450-IncrementalBackup)（物理线与 WAL 归档基础）。

## 心智模型：两条备份线

| 维度 | 逻辑备份（pg_dump） | 物理备份（pg_basebackup 系列） |
| --- | --- | --- |
| 单位 | 库/表/行 | 整个数据目录 |
| 恢复粒度 | 单表、单对象 | 只能整库 |
| 版本兼容 | 跨大版本可恢复 | 必须同大版本 |
| 速度 | 慢（要解析 SQL） | 快（拷文件） |
| PITR | 不直接支持 | 配 WAL 归档支持 |

PITR 的本质是**物理备份打底 + WAL 连续归档**：基础备份给一个起点，归档 WAL 逐段重放到指定时刻停住。逻辑备份在 PITR 流程里另有角色——" PITR 恢复成功但只想找回误删的那张表"时，把合成备份起在临时实例上，用 pg_dump 从里面抠出那张表。

## 第一工具：pg_dump 与自定义格式

```bash
# 平面 SQL（人能读，但不能并行恢复、不能选择性恢复）
pg_dump -U postgres -d appdb > appdb.sql

# 自定义格式（生产推荐：压缩 + 目录结构 + 可选择性恢复）
pg_dump -U postgres -Fc -d appdb -f appdb.dump
#   -Fc  自定义压缩格式
#   -Fd  目录格式（配合 -j 并行）

# 恢复：pg_restore 配合并行作业
pg_restore -U postgres -d appdb -j 4 appdb.dump
#   -j 4  4 个并行作业建索引/拷数据
```

为什么 `-Fc` 是标配：平面 SQL 恢复是"从头到尾单线程重放"，一张 100GB 的表能把恢复拖到小时级；自定义格式让 pg_restore 能**只恢复选中的对象**（`-t 表名`）、能跳过报错继续（`--exit-on-error` 反向控制）、能并行建索引。生产恢复窗口紧张时，`-Fd` + `-j` 常能把恢复时间压到四分之一。

```bash
# 逻辑备份全家桶：全局对象（角色/表空间）单独用 pg_dumpall
pg_dumpall -U postgres --globals-only > globals.sql   # 先恢复全局，再恢复库
```

易错点：只 dump 业务库、漏掉 `pg_dumpall --globals-only`，恢复到新实例后所有角色和权限丢失——排障时表现为"表都在，应用连不上"。

## 第二工具：选择性导出策略

```bash
# 只要结构（迁移/评审用）
pg_dump -U postgres -s -d appdb -f schema.sql

# 只要一张表的数据 + INSERT 语句（给开发环境造数）
pg_dump -U postgres -d appdb -t orders --data-only \
  --column-inserts -f orders_sample.sql

# 大表导出子集：pg_dump 做不了 WHERE 过滤，交给 COPY
psql -U postgres -d appdb -c \
  "\copy (SELECT * FROM orders WHERE created_at >= '2026-01-01') TO 'orders_2026.csv' CSV HEADER"
```

逐段解释：`--column-inserts` 生成带列名的 INSERT，逐行可读但慢，适合小数据量；大批量子集导出用 `\copy`（客户端执行，写当前目录）而非 `COPY TO`（服务端执行，写服务器目录，常因权限报错）。反向灌数是 `\copy 表名 FROM '文件.csv' CSV HEADER`。

**无人值守的定时逻辑备份**（crontab）：

```bash
# 每天凌晨 2 点全量备份，保留 14 天
0 2 * * * pg_dump -Fc -d appdb -f /backup/appdb_$(date +\%F).dump \
  && find /backup -name 'appdb_*.dump' -mtime +14 -delete
```

注意 crontab 里 `%` 必须转义为 `\%`——cron 把未转义的 `%` 当换行，命令会被腰斩，这是备份静默失败的经典原因。

## 第三工具：WAL 归档配置

PITR 的原材料是连续的 WAL 归档：

```ini
# postgresql.conf
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
restore_command = 'cp /archive/%f %p'    -- 恢复期读取
```

逐段解释：`%p` 是 WAL 段在 pg_wal 里的路径，`%f` 是归档目标文件名；`test ! -f` 保证**幂等**（重传不覆盖已归档段——覆盖可能造成归档不一致）。两个要命的注意点：

- `archive_command` 返回非零会**反复重试并阻塞 WAL 循环**——归档目录磁盘满会让主库写入逐渐停摆。监控归档健康：`SELECT failed_count FROM pg_stat_archiver;`
- 归档延迟决定 PITR 的"最近可恢复点"。对延迟敏感的场景用流式替代：`pg_receivewal -D /archive/wal --synchronous`（见[增量备份](/postgresql/450-IncrementalBackup) §4.2）。

## 第四工具：PITR 完整演练

前提：基础备份 + 其后的连续 WAL 归档。目标：恢复到 `2026-10-07 14:00:00`（误删表发生在 14:03）。

```bash
# 1. 停库、备份现场（故障现场先留证据再动手）
pg_ctl stop -m fast
mv /var/lib/postgresql/17/main /var/lib/postgresql/17/main_broken

# 2. 拷入基础备份（物理备份篇生成的全量）
cp -a /backup/full/ /var/lib/postgresql/17/main
chmod 700 /var/lib/postgresql/17/main
# 清空基础备份自带的 pg_wal 内容（用归档 WAL 重放）
rm -rf /var/lib/postgresql/17/main/pg_wal/*

# 3. 写恢复配置
cat >> /var/lib/postgresql/17/main/postgresql.auto.conf <<'EOF'
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-10-07 14:00:00'
recovery_target_action = 'promote'
EOF

# 4. 触发恢复模式
touch /var/lib/postgresql/17/main/recovery.signal

# 5. 启动，观察日志重放 WAL 至目标时刻后自动 promote
pg_ctl start
tail -f /var/log/postgresql/postgresql-17-main.log
# 日志关键字：redo starts at ... / recovery stopping before commit of transaction ...
#           / archive recovery complete / database system is ready
```

逐段讲解：

- `recovery_target_time` 是按**事务提交时间**截断的——14:00:01 提交的事务会不会包含进来取决于边界，**保险做法是目标时间往前回退到误操作发生前的整点**；
- `recovery_target_action = 'promote'` 到点后自动升主；不设则停在只读恢复态，让你先进去核对数据；
- 更精确的定位用 `recovery_target_xid` 或 `recovery_target_name`（恢复点命名，配合 `pg_create_restore_point()` 在误操作**前**预埋，适合运维变更前的保险）；
- 恢复完成后 `recovery.signal` 自动消失、时间线 +1——旧 WAL 段不能继续用，**必须立刻做一次新的基础备份**，否则下一次恢复没有起点。

## 恢复演练 checklist（贴在运维手册里）

演练不是"假设能恢复"，是"真的恢复过"：

```text
[ ] 每季度至少一次：把备份恢复到隔离环境并启动成功
[ ] 恢复后核对：对象数（\dt 计数）、行数抽查、应用连通
[ ] 计时并记录：备份大小 -> 恢复耗时，换算 RTO 是否满足 SLA
[ ] PITR 专项：演练到"误删前一分钟"，验证被删数据找回
[ ] 校验机制：物理备份用 pg_verifybackup；逻辑备份 pg_restore --list 可读即完好
[ ] 归档健康：pg_stat_archiver.failed_count 无增长，归档目录磁盘水位 < 80%
[ ] globals.sql 与业务库备份同频率、同介质保存
[ ] 恢复文档与实际版本一致（配置路径、端口、密码来源）
```

每季度演练的产出物是**记录在案的 RTO 实测值**——没有实测值的备份策略等于没做。

## 实战场景：三种典型的恢复请求

**场景一：开发同事删错表（今天上午 10 点的事）**。流程：临时实例恢复 → PITR 到 09:59 → pg_dump 抠出该表 → 导回生产（`pg_restore -t 表名`）→ **立刻做新基础备份**。全程生产不动。

**场景二：跨大版本升级（17 到 18）**。物理备份不能跨版本，两条路：`pg_dumpall | psql 新实例`（停机窗口长，适合小库）或 [逻辑复制](/postgresql/430-SubscribePublish)（近零停机，大库首选）。逻辑备份线在升级预案里是兜底。

**场景三：云厂商 RDS 之外的合规备份**。RDS 自带快照不透明、出了云无法恢复；补一条 pg_dump 定时线到自有存储，双线并行——快照管速度，逻辑备份管可迁移。

## 常见困惑

**"逻辑备份期间锁表吗？"**——pg_dump 对每个表拿 `ACCESS SHARE` 锁（不阻塞读写，但阻塞该表上的 DDL），大库 dump 期间别安排 DDL 变更窗口。`--jobs` 不减少锁，只加速。

**"恢复到另一台机器，密码和权限呢？"**——在 `pg_dumpall --globals-only` 里；漏了它就手工重建角色。`ALTER ROLE ... WITH PASSWORD` 明文出现在 globals.sql 里，**这个文件要按密钥级别保管**。

**"PITR 能恢复到未来吗？"**——不能，恢复目标必须落在"基础备份完成时刻之后、归档 WAL 已有的范围内"。归档断档的那段时间就是不可恢复的空洞，所以归档监控（failed_count、目录水位）要进告警。

## 动手实践：把 PITR 全流程跑一遍

任务：在 Docker 单机里完成"误删 - PITR 找回"闭环：

1. 建 WAL 归档目录并开启归档，建表写入 10 行，做一次 pg_basebackup；
2. 再写入 10 行（第二批次），记录新表的最大 id；
3. 执行 `DROP TABLE`（灾难！），并再归档至少一个 WAL 段；
4. 按本篇演练步骤 PITR 回"DROP 之前"，核对 20 行俱在；
5. （进阶）改用 `recovery_target_name`：在第 3 步前先 `SELECT pg_create_restore_point('before_drop');`，体验命名恢复点比时间戳精确在哪。

<details>
<summary>参考流程（先自己跑再展开）</summary>

```bash
# 0. 环境
docker run -d --name pg-pitr -e POSTGRES_PASSWORD=secret \
  -v /tmp/archive:/archive postgres:17
docker exec pg-pitr psql -U postgres -c \
  "ALTER SYSTEM SET archive_mode='on';
   ALTER SYSTEM SET archive_command='test ! -f /archive/%f && cp %p /archive/%f';"
docker restart pg-pitr

# 1. 建表 + 第一批数据 + 基础备份
docker exec pg-pitr psql -U postgres -c "
  CREATE TABLE pitr_demo(id int);
  INSERT INTO pitr_demo SELECT generate_series(1,10);"
docker exec pg-pitr pg_basebackup -U postgres -D /tmp/full -Fp -Xs -P
# （/tmp/full 在容器内；生产上应挂到宿主机）

# 2. 第二批数据 + 手动切一个 WAL 段确保归档
docker exec pg-pitr psql -U postgres -c "
  INSERT INTO pitr_demo SELECT generate_series(11,20);
  SELECT pg_switch_wal();"

# 3. 灾难 + 再归档
docker exec pg-pitr psql -U postgres -c "DROP TABLE pitr_demo;"
docker exec pg-pitr psql -U postgres -c "SELECT pg_switch_wal();"

# 4. PITR：停库 -> 备份现场 -> 拷基础备份 -> 配 restore -> recovery.signal
docker exec pg-pitr pg_ctl stop -D /var/lib/postgresql/data -m fast
# ……按正文步骤 2-5 执行（容器内路径 /var/lib/postgresql/data）
# recovery_target_time 取 DROP 之前，比如查 archive 里最后段之前的时刻
docker exec pg-pitr pg_ctl start -D /var/lib/postgresql/data
docker exec pg-pitr psql -U postgres -tc \
  "SELECT count(*), max(id) FROM pitr_demo;"
-- 20 | 20
```

判读要点：恢复成功后 `recovery.signal` 消失、`pg_is_in_recovery()` 为 false；恢复期间日志若停在 `requested timeline N is not a child of this server timeline`，是时间线问题，检查 recovery_target 设置与归档完整性。
</details>

## 检验清单

- 能说出逻辑线与物理线各自的粒度、速度、版本兼容取舍；
- 会用 `-Fc/-Fd/-j` 与 `--globals-only` 组出一套可恢复的备份；
- 能解释 `archive_command` 幂等写法与"归档失败阻塞 WAL 循环"的风险；
- 能不带资料写出 PITR 五步流程，并说出"恢复后必须重做基础备份"的原因；
- 演练 checklist 里至少一半的项目你真的执行过。

## 下一步

- [增量备份](/postgresql/450-IncrementalBackup)：物理线全流程与 pg_combinebackup 合并；
- [高可用与自动故障转移](/postgresql/472-HAFailoverPatroni)：防宕机的线，与本篇防误删的线互补；
- [运行监控与统计视图](/postgresql/255-MonitoringStatisticsViews)：归档健康监控放進巡检清单。

## 参考与致谢

- PostgreSQL 官方文档 Chapter 25 Backup and Restore（23-25 节：SQL Dump / File-level / Continuous Archiving and PITR，PostgreSQL Licence）：<https://www.postgresql.org/docs/current/backup.html>
- 本篇物理线细节与 450 增量备份篇互补，归档参数语义已对照 PG 17 文档核校。
