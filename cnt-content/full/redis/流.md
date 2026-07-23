---
order: 53
title: 流
module: redis
category: Redis
difficulty: advanced
description: 'Redis Stream消息队列：消费者组、消息确认、消息积压与XREAD/XADD命令'
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/基数统计
  - redis/地理空间
  - redis/向量集
  - redis/RDB快照持久化
prerequisites:
  - redis/概述与核心数据结构
---

## 1. Stream 概述

Redis Stream 是日志型数据结构，类似 Kafka 的消息队列，支持消费者组、消息确认和持久化。

## 2. 基本操作

```redis
-- 添加消息
XADD mystream * field1 value1 field2 value2
-- 返回消息ID：1718334600000-0

-- 指定ID格式
XADD mystream 1718334600000-0 field1 value1

-- 限制Stream长度
XADD mystream MAXLEN 1000 * field1 value1
```

## 3. 读取消息

```redis
-- 从头读取
XREAD COUNT 10 STREAMS mystream 0

-- 阻塞读取新消息
XREAD BLOCK 5000 COUNT 10 STREAMS mystream $

-- 范围读取
XRANGE mystream - + COUNT 10
XRANGE mystream 1718334600000-0 1718334700000-0
```

## 4. 消费者组

```redis
-- 创建消费者组
XGROUP CREATE mystream mygroup $  -- 从最新消息开始
XGROUP CREATE mystream mygroup 0  -- 从头开始

-- 消费者读取
XREADGROUP GROUP mygroup consumer1 COUNT 1 STREAMS mystream >

-- 确认消息
XACK mystream mygroup 1718334600000-0

-- 查看待处理消息
XPENDING mystream mygroup

-- 认领超时消息
XCLAIM mystream mygroup consumer1 3600000 1718334600000-0
```

## 5. 消息积压处理

```redis
-- 查看Stream信息
XINFO STREAM mystream

-- 修剪Stream
XTRIM mystream MAXLEN 10000
XTRIM mystream MINID 1718334600000-0

-- 查看消费者组信息
XINFO GROUPS mystream
XINFO CONSUMERS mystream mygroup
```
