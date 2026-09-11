---
order: 570
title: 物理备份
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL物理备份：Percona XtraBackup原理与增量备份、内置Clone插件、MySQL Enterprise Backup对比与选型
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/500-RedoLog'
  - 'mysql/550-LogSystem'
  - 'mysql/560-LogicalBackup'
  - 'mysql/580-PITR'
prerequisites:
  - 'mysql/500-RedoLog'
---

## 1. 什么是物理备份

物理备份直接复制数据库的**数据文件与日志文件**（.ibd、undo、redo 等），
恢复时把文件放回数据目录即可启动。它跳过了"解析 SQL、重建数据"的过程，
因此备份与恢复速度都远快于逻辑备份——代价是必须理解并跟随 InnoDB 的
内部一致性机制。

| 特性       | 物理备份                     | 逻辑备份               |
| ---------- | ---------------------------- | ---------------------- |
| 速度       | 快（文件级拷贝）             | 慢（语句生成与回放）   |
| 恢复速度   | 快（即拷即用）               | 慢（逐条执行 SQL）     |
| 粒度       | 实例为主，表级支持有限       | 实例/库/表/行，灵活    |
| 跨平台     | 同字节序、同版本约束多       | 好（SQL 文本通用）     |
| 跨版本     | 受限（一般只能向上升级）     | 好                     |
| 是否热备   | 视工具（ redo 对齐即可热备） | 是                     |
| 典型工具   | XtraBackup / MEB / Clone     | mysqldump / MySQL Shell |

理解热备原理需要一点 redo log 基础：备份期间数据文件在被持续修改，
处于"不一致的中间态"；工具一边拷文件一边**记录拷贝时刻之后的 redo**，
恢复前用这些 redo 把文件"补"到一致点——这就是 prepare 阶段的作用。

## 2. Percona XtraBackup：开源事实标准

XtraBackup 是社区最常用的物理热备工具。注意**版本必须与服务器大版本配套**
（备份 MySQL 8.0/8.4 用 XtraBackup 8.0/8.4 系列；拿旧版工具备份新版服务器
会直接报不支持）。

### 2.1 全量备份与恢复

```bash
# 1. 全量备份（热备，业务不中断；需要足够的权限与文件系统空间）
xtrabackup --backup --target-dir=/backup/full \
  --user=root --password='xxx' --host=127.0.0.1

# 2. prepare：把备份期间收集的 redo 应用进去，使数据文件达到一致状态
#    （不 prepare 的备份不能用于恢复）
xtrabackup --prepare --target-dir=/backup/full

# 3. 恢复：目标数据目录必须为空
systemctl stop mysqld
xtrabackup --copy-back --target-dir=/backup/full
chown -R mysql:mysql /var/lib/mysql
systemctl start mysqld
```

### 2.2 增量备份

物理备份的增量以 **LSN** 为界：只拷贝"上一次备份之后被修改过的页"。

```bash
# 增量备份：以全量为基准
xtrabackup --backup --target-dir=/backup/inc1 \
  --incremental-basedir=/backup/full --user=root --password='xxx'

# prepare 有顺序要求：全量必须用 --apply-log-only 停在"可继续追加"状态
xtrabackup --prepare --apply-log-only --target-dir=/backup/full
xtrabackup --prepare --apply-log-only --target-dir=/backup/full --incremental-dir=/backup/inc1
# （若还有 inc2，重复上面的追加；最后一个增量才不加 --apply-log-only）
xtrabackup --prepare --target-dir=/backup/full        # 最终定稿

# 恢复：与全量相同
xtrabackup --copy-back --target-dir=/backup/full
```

常见错误是漏掉 `--apply-log-only`：全量被提前"定稿"后，后续增量将无法追加。

### 2.3 压缩与流式

```bash
# 压缩备份（qpress 算法）
xtrabackup --backup --compress --target-dir=/backup/cmp --user=root --password='xxx'
xtrabackup --decompress --target-dir=/backup/cmp     # 解压后同样需要 --prepare

# 流式备份到远程（省去本地临时空间）
xtrabackup --backup --stream=xbstream --user=root --password='xxx' \
  | ssh backup@remote "xbstream -x -C /backup/full"
```

## 3. Clone Plugin：8.0.17+ 内置的物理克隆

MySQL 8.0.17 起服务器**内置** Clone 插件，无需第三方工具即可完成物理级
数据拷贝——本地克隆生成本地数据目录快照，远程克隆把实例数据直接拉到另一台
服务器（常用于快速搭建从库/重建节点）：

```sql
-- 安装（两端都要）
INSTALL PLUGIN clone SONAME 'clone_plugin.so';

-- 本地克隆：把本实例数据克隆到指定目录
CLONE LOCAL DATA DIRECTORY '/backup/clone_dir';

-- 远程克隆：从 donor 拉取全量数据（会清空接收端现有数据！）
-- 接收端执行：
CLONE INSTANCE FROM 'root'@'donor-host':3306 IDENTIFIED BY 'xxx';
```

与复制天然集成：`CLONE INSTANCE` 拉取数据时会带上复制位点/GTID，
克隆完成后从库可以直接 `START REPLICA` 追平增量——这是它取代
"手工 xtrabackup 建从库"流程的关键优势。管理接口在
`performance_schema.clone_status / clone_progress` 可观测进度。

限制：克隆是**全量**（没有增量概念）；默认传输未压缩，跨机房大量数据时注意网络；
要求收发两端 MySQL 大版本一致。

## 4. MySQL Enterprise Backup（官方商业工具）

商业订阅用户可用官方 MEB（`mysqlbackup`），支持热备、增量、压缩、
单表恢复（可恢复到表级 TTS 传输表空间）等：

```bash
# 全量
mysqlbackup --user=root --password --backup-dir=/backup/full backup

# 增量（以目录为基准）
mysqlbackup --user=root --password --backup-dir=/backup/inc1 \
  --incremental --incremental-base=dir:/backup/full backup

# 恢复（先停实例、清空数据目录）
mysqlbackup --backup-dir=/backup/full copy-back-and-apply-log
```

## 5. 选型建议

| 场景                         | 推荐                                     |
| ---------------------------- | ---------------------------------------- |
| 开源栈、需要增量与压缩       | XtraBackup（版本与服务器配套）           |
| 官方技术栈 / InnoDB Cluster  | MEB（商业）或 Clone 插件（全量场景）     |
| 快速搭从库 / 重建故障节点    | Clone 插件（自动携带复制位点）           |
| 恢复 RTO 敏感的大库          | 物理备份全量 + binlog（PITR 衔接）       |
| 跨版本升级预演、挑表导出     | 逻辑备份（见逻辑备份一篇）               |

## 6. 小结

- 初学者要点：物理备份 = 拷文件，快但绑定版本与平台；热备依赖"拷贝时收集 redo、
  恢复前 prepare 对齐"两步走。
- 进阶注意：XtraBackup 增量的 `--apply-log-only` 顺序是第一大坑；
  8.0.17+ 优先考虑内置 Clone 插件（尤其建从库场景）；
  物理备份无法替代 binlog——误操作恢复仍要靠全量备份 + binlog 的 PITR（见 PITR 一篇）。
