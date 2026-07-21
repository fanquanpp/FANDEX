---
order: 1
title: 概述与安装配置
module: postgresql
category: PostgreSQL
difficulty: beginner
description: 'PostgreSQL 17概述、安装与配置、pg_hba.conf认证、postgresql.conf核心参数、连接管理、角色与权限。'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/事务与并发控制
  - postgresql/索引与查询优化
prerequisites: []
---

## 1. PostgreSQL 17 概述

### 1.1 PostgreSQL 简介

PostgreSQL 是全球最先进的**开源对象-关系型数据库管理系统**，以可靠性、功能丰富和可扩展性著称。PostgreSQL 17 于 2024 年发布，带来多项重要改进。

### 1.2 核心特性

| 特性     | 说明                                   |
| :------- | :------------------------------------- |
| SQL 标准 | 高度兼容 SQL:2023 标准                 |
| 数据类型 | JSON/JSONB、数组、范围、几何、UUID 等  |
| 索引     | B-tree、Hash、GiST、GIN、SP-GiST、BRIN |
| 并发控制 | MVCC 多版本并发控制                    |
| 扩展性   | 自定义类型、函数、操作符、索引方法     |
| 全文检索 | 内置 tsvector/tsquery 全文搜索         |
| 外部数据 | FDW 外部数据包装器                     |
| 逻辑复制 | 发布/订阅模式                          |

### 1.3 PostgreSQL 17 新特性

```
- SQL/JSON 标准化: JSON_TABLE、JSON_QUERY 等
- MERGE 语句增强: 支持 RETURNING 子句
- 增量备份: pg_basebackup 支持增量备份
- VACUUM 改进: tid store 内存优化
- 逻辑复制增强: 故障转移改进
- 性能提升: 并行查询优化、I/O 并发改进
```

## 2. 安装与配置

### 2.1 Linux 安装

```bash
# Ubuntu/Debian
sudo apt install -y postgresql-17 postgresql-contrib-17

# CentOS/Rocky (使用 PGDG 仓库)
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
sudo dnf install -y postgresql17-server postgresql17-contrib

# 初始化数据目录
sudo /usr/pgsql-17/bin/postgresql-17-setup initdb

# 启动服务
sudo systemctl enable --now postgresql-17
```

### 2.2 Docker 安装

```bash
# 运行 PostgreSQL 容器
docker run -d \
  --name postgres17 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=SecurePass123 \
  -e POSTGRES_DB=fandex \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:17

# 连接数据库
docker exec -it postgres17 psql -U admin -d fandex
```

### 2.3 Windows 安装

```powershell
# 使用 EDB 安装器
# 下载: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

# 或使用 chocolatey
choco install postgresql17

# 配置环境变量
$env:PATH += ";C:\Program Files\PostgreSQL\17\bin"
```

## 3. pg_hba.conf 认证配置

### 3.1 配置文件位置

```
Linux:  /etc/postgresql/17/main/pg_hba.conf
Docker: /var/lib/postgresql/data/pg_hba.conf
Windows: C:\Program Files\PostgreSQL\17\data\pg_hba.conf
```

### 3.2 认证规则格式

```
# TYPE  DATABASE  USER    ADDRESS         METHOD
local   all       all                     peer
host    all       all     127.0.0.1/32    scram-sha-256
host    all       all     ::1/128         scram-sha-256
host    all       admin   192.168.1.0/24  scram-sha-256
host    replication replicator 192.168.1.0/24 scram-sha-256
```

### 3.3 认证方法

| 方法          | 安全级别 | 说明                          |
| :------------ | :------- | :---------------------------- |
| trust         | 无       | 无需密码，仅限开发环境        |
| reject        | -        | 拒绝连接                      |
| md5           | 中       | MD5 加密密码（旧版）          |
| scram-sha-256 | 高       | SCRAM-SHA-256 认证（推荐）    |
| peer          | 高       | 操作系统用户名匹配（仅local） |
| ident         | 中       | ident 协议认证                |
| cert          | 极高     | SSL 客户端证书认证            |
| gss/sspi      | 高       | Kerberos 认证                 |

### 3.4 安全配置示例

```
# 生产环境推荐配置
# TYPE  DATABASE  USER      ADDRESS          METHOD
local   all       postgres                   peer
host    all       postgres  127.0.0.1/32     reject
host    all       app_user  10.0.0.0/8       scram-sha-256
hostssl all       app_user  0.0.0.0/0        cert scram-sha-256
host    replication repl    192.168.1.0/24   scram-sha-256
```

## 4. postgresql.conf 核心参数

### 4.1 连接参数

```ini
# 基本连接
listen_addresses = '*'          # 监听地址（* = 所有）
port = 5432                     # 监听端口
max_connections = 200           # 最大连接数
superuser_reserved_connections = 3  # 超级用户保留连接数

# TCP 配置
tcp_keepalives_idle = 60        # 空闲探测间隔(秒)
tcp_keepalives_interval = 10    # 探测重试间隔
tcp_keepalives_count = 10       # 探测失败次数
```

### 4.2 内存参数

```ini
# 内存配置（以 16GB 内存服务器为例）
shared_buffers = 4GB            # 共享缓冲区（建议 25% 内存）
effective_cache_size = 12GB     # 查询规划器缓存估计（75% 内存）
work_mem = 64MB                 # 排序/哈希操作内存
maintenance_work_mem = 512MB    # 维护操作内存(VACUUM/CREATE INDEX)
huge_pages = try                # 启用大页内存

# WAL 配置
wal_buffers = 64MB              # WAL 缓冲区
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 512MB
```

### 4.3 查询优化参数

```ini
# 查询规划
random_page_cost = 1.1          # SSD 设为 1.1，HDD 默认 4.0
effective_io_concurrency = 200  # SSD 设为 200，HDD 默认 1
max_worker_processes = 8        # 最大后台工作进程
max_parallel_workers_per_gather = 4  # 每个查询最大并行工作进程
max_parallel_workers = 8        # 最大并行工作进程总数
jit = on                        # 启用 JIT 编译
```

### 4.4 日志参数

```ini
# 日志配置
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000  # 记录超过 1 秒的慢查询
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0
log_line_prefix = '%t [%p]: db=%d,user=%u,app=%a,client=%h '
```

## 5. 连接管理

### 5.1 连接方式

```bash
# 命令行连接
psql -h 192.168.1.10 -p 5432 -U admin -d fandex

# 使用连接字符串
psql "postgresql://admin:password@192.168.1.10:5432/fandex?sslmode=require"

# 使用 .pgpass 免密
cat > ~/.pgpass << 'EOF'
192.168.1.10:5432:fandex:admin:SecurePass123
EOF
chmod 600 ~/.pgpass
```

### 5.2 连接池（PgBouncer）

```ini
# pgbouncer.ini
[databases]
fandex = host=127.0.0.1 port=5432 dbname=fandex

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction          # 事务级连接池
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 300
```

### 5.3 活动连接查询

```sql
-- 查看当前连接
SELECT pid, usename, datname, client_addr, state, query, query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- 终止空闲连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < now() - interval '30 minutes'
  AND pid != pg_backend_pid();

-- 连接数统计
SELECT usename, count(*)
FROM pg_stat_activity
GROUP BY usename
ORDER BY count DESC;
```

## 6. 角色与权限

### 6.1 角色管理

```sql
-- 创建角色（角色 = 用户，可登录角色即用户）
CREATE ROLE app_user WITH LOGIN PASSWORD 'SecurePass123';
CREATE ROLE app_admin WITH LOGIN PASSWORD 'AdminPass456' SUPERUSER;
CREATE ROLE readonly WITH LOGIN PASSWORD 'ReadOnly789';

-- 修改角色属性
ALTER ROLE app_user CONNECTION LIMIT 50;
ALTER ROLE app_user VALID UNTIL '2026-12-31';
ALTER ROLE app_user SET work_mem = '128MB';

-- 创建组角色（不可登录）
CREATE ROLE dev_team NOLOGIN;
GRANT dev_team TO app_user, app_admin;

-- 删除角色
DROP ROLE IF EXISTS old_user;
```

### 6.2 权限管理

```sql
-- 数据库权限
GRANT CONNECT ON DATABASE fandex TO app_user;
GRANT ALL ON DATABASE fandex TO app_admin;

-- Schema 权限
GRANT USAGE ON SCHEMA public TO app_user;
GRANT CREATE ON SCHEMA public TO app_admin;

-- 表权限
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_admin;

-- 序列权限
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 默认权限（自动应用于未来创建的对象）
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO app_user;

-- 撤销权限
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM app_user;

-- 查看权限
\dp                           # psql 命令
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY grantee, table_name;
```

### 6.3 行级安全策略（RLS）

```sql
-- 启用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能看到自己的订单
CREATE POLICY user_orders ON orders
  FOR ALL
  TO app_user
  USING (user_id = current_user_id());

-- 管理员可看所有
CREATE POLICY admin_all ON orders
  FOR ALL
  TO app_admin
  USING (true)
  WITH CHECK (true);

-- 查看策略
SELECT * FROM pg_policies WHERE tablename = 'orders';
```
