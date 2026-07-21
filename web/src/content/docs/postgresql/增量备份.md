---
order: 75
title: 增量备份
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL增量备份：pg_basebackup、pg_receivewal、归档WAL与PITR
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/物理复制槽
  - postgresql/逻辑解码与输出插件
  - postgresql/订阅与发布
  - 'postgresql/SSL-TLS加密连接'
prerequisites:
  - postgresql/概述与安装配置
---

## 1. pg_basebackup

```bash
# 全量基础备份
pg_basebackup -h localhost -U replicator -D /backup/full -Fp -Xs -P -R

# 压缩备份
pg_basebackup -h localhost -U replicator -D /backup/full -Ft -z -P

# 选项：
# -Fp: plain格式（目录）
# -Ft: tar格式
# -Xs: 流式传输WAL
# -P: 显示进度
# -R: 创建standby.signal
# -z: gzip压缩
```

## 2. WAL 归档

```ini
# postgresql.conf
wal_level = replica
archive_mode = ON
archive_command = 'cp %p /archive/%f'
```

```sql
-- 查看归档状态
SELECT * FROM pg_stat_archiver;
```

## 3. pg_receivewal

```bash
# 持续接收WAL到本地
pg_receivewal -h localhost -U replicator -D /archive/wal --synchronous

# 压缩接收
pg_receivewal -h localhost -U replicator -D /archive/wal -Z 6
```

## 4. PITR 恢复

```bash
# 1. 恢复基础备份
cp -r /backup/full/* /var/lib/postgresql/data/

# 2. 配置恢复目标
cat >> /var/lib/postgresql/data/postgresql.auto.conf << EOF
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-06-14 10:00:00'
recovery_target_action = 'promote'
EOF

# 3. 创建恢复标记
touch /var/lib/postgresql/data/recovery.signal

# 4. 启动PostgreSQL
systemctl start postgresql
```
