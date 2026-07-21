---
order: 74
title: 逻辑解码与输出插件
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL逻辑解码与输出插件：逻辑复制基础、pgoutput、wal2json与CDC
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/级联复制
  - postgresql/物理复制槽
  - postgresql/增量备份
  - postgresql/订阅与发布
prerequisites:
  - postgresql/概述与安装配置
---

## 1. 逻辑解码概述

逻辑解码将 WAL 日志解析为逻辑变更事件（INSERT/UPDATE/DELETE），是逻辑复制和 CDC 的基础。

## 2. 逻辑复制槽

```sql
-- 创建逻辑复制槽
SELECT pg_create_logical_replication_slot('my_slot', 'pgoutput');

-- 查看逻辑槽
SELECT slot_name, slot_type, database, plugin
FROM pg_replication_slots WHERE slot_type = 'logical';

-- 删除
SELECT pg_drop_replication_slot('my_slot');
```

## 3. 输出插件

### 3.1 pgoutput（内置）

```sql
-- PostgreSQL 内置的逻辑解码输出插件
-- 用于逻辑复制的发布/订阅
SELECT pg_create_logical_replication_slot('pgoutput_slot', 'pgoutput');
```

### 3.2 wal2json

```sql
CREATE EXTENSION wal2json;

SELECT pg_create_logical_replication_slot('json_slot', 'wal2json');

-- 消费变更
SELECT data FROM pg_logical_slot_peek_changes('json_slot', NULL, NULL);
-- 输出 JSON 格式的变更事件
```

## 4. CDC 应用

```sql
-- 使用逻辑解码实现变更数据捕获
-- 1. 创建逻辑槽
-- 2. 定期消费变更事件
-- 3. 将变更发送到消息队列（Kafka等）

-- 消费并推进位置
SELECT data FROM pg_logical_slot_get_changes('json_slot', NULL, NULL);

-- 只查看不推进
SELECT data FROM pg_logical_slot_peek_changes('json_slot', NULL, NULL);
```
