---
order: 260
title: Redis 发布订阅命令
module: 'redis'
category: 数据库
difficulty: beginner
description: Redis 发布订阅命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 订阅命令

**基本写法：SUBSCRIBE 订阅频道**
`SUBSCRIBE <channel> [channel ...]`
```bash
# 订阅指定频道（阻塞式）
SUBSCRIBE news:tech news:sports
```

**基本写法：UNSUBSCRIBE 取消订阅**
`UNSUBSCRIBE [channel ...]`
```bash
# 取消订阅指定频道（不指定则取消全部）
UNSUBSCRIBE news:tech
```

**基本写法：PSUBSCRIBE 模式订阅**
`PSUBSCRIBE <pattern> [pattern ...]`
```bash
# 按模式订阅频道
PSUBSCRIBE news:*
```

**基本写法：PUNSUBSCRIBE 取消模式订阅**
`PUNSUBSCRIBE [pattern ...]`
```bash
# 取消模式订阅
PUNSUBSCRIBE news:*
```

---

## 发布命令

**基本写法：PUBLISH 发布消息**
`PUBLISH <channel> <message>`
```bash
# 向指定频道发布消息
PUBLISH news:tech "Redis 7.4 released"
```

---

## 查询命令

**基本写法：PUBSUB CHANNELS 查看活跃频道**
`PUBSUB CHANNELS [pattern]`
```bash
# 查看当前有订阅者的频道
PUBSUB CHANNELS news:*
```

**基本写法：PUBSUB NUMSUB 查看频道订阅数**
`PUBSUB NUMSUB [channel ...]`
```bash
# 查看指定频道的订阅者数量
PUBSUB NUMSUB news:tech news:sports
```

**基本写法：PUBSUB NUMPAT 查看模式订阅数**
`PUBSUB NUMPAT`
```bash
# 查看所有模式订阅的总数
PUBSUB NUMPAT
```

**基本写法：PUBSUB SHARDCHANNELS 查看分片频道（7.0+）**
`PUBSUB SHARDCHANNELS [pattern]`
```bash
# 查看集群分片频道
PUBSUB SHARDCHANNELS
```

**基本写法：PUBSUB SHARDNUMSUB 查看分片频道订阅数（7.0+）**
`PUBSUB SHARDNUMSUB [channel ...]`
```bash
# 查看分片频道的订阅者数量
PUBSUB SHARDNUMSUB shard:channel1
```

---

## Stream 消息队列

**基本写法：XADD 添加消息**
`XADD <key> [NOMKSTREAM] [MAXLEN|MINID [=|~] <阈值>] <ID> <field> <value> [field value ...]`
```bash
# 添加消息到流（* 表示自动生成 ID）
XADD stream:orders * order_id 1001 user_id 1 amount 99.9
```

**基本写法：XADD 限制流长度**
`XADD <key> MAXLEN <数量> * <field> <value>`
```bash
# 仅保留最近 1000 条消息
XADD stream:logs MAXLEN 1000 * level ERROR msg "something wrong"
```

**基本写法：XADD 近似限制长度**
`XADD <key> MAXLEN ~ <数量> * <field> <value>`
```bash
# 近似限制长度性能更好
XADD stream:logs MAXLEN ~ 1000 * level INFO msg "ok"
```

**基本写法：XLEN 获取流长度**
`XLEN <key>`
```bash
# 获取流中消息数量
XLEN stream:orders
```

**基本写法：XRANGE 按范围查询**
`XRANGE <key> <start> <end> [COUNT <数量>]`
```bash
# 查询全部消息（- 到 +）
XRANGE stream:orders - + COUNT 10
```

**基本写法：XREVRANGE 反向查询**
`XREVRANGE <key> <end> <start> [COUNT <数量>]`
```bash
# 倒序查询最新 10 条
XREVRANGE stream:orders + - COUNT 10
```

**基本写法：XREAD 读取消息**
`XREAD [COUNT <数量>] [BLOCK <毫秒>] STREAMS <key> [key ...] <ID> [ID ...]`
```bash
# 读取大于指定 ID 的新消息
XREAD COUNT 10 STREAMS stream:orders 0
```

**基本写法：XREAD 阻塞读取**
`XREAD BLOCK <毫秒> STREAMS <key> <ID>`
```bash
# 阻塞式等待新消息（0 永久阻塞）
XREAD BLOCK 0 STREAMS stream:orders $
```

---

## 消费者组

**基本写法：XGROUP CREATE 创建消费者组**
`XGROUP CREATE <key> <group> <ID> [MKSTREAM]`
```bash
# 创建消费者组从头部开始消费
XGROUP CREATE stream:orders group1 0 MKSTREAM
```

**基本写法：XGROUP CREATE 从最新开始**
`XGROUP CREATE <key> <group> $`
```bash
# 创建消费者组仅消费新消息
XGROUP CREATE stream:orders group2 $
```

**基本写法：XREADGROUP 消费组读取**
`XREADGROUP GROUP <group> <consumer> [COUNT <数量>] [BLOCK <毫秒>] STREAMS <key> <ID>`
```bash
# 消费者读取消息（> 表示未投递过的新消息）
XREADGROUP GROUP group1 consumer1 COUNT 10 STREAMS stream:orders >
```

**基本写法：XACK 确认消息**
`XACK <key> <group> <ID> [ID ...]`
```bash
# 确认消息已处理
XACK stream:orders group1 1718334600000-0
```

**基本写法：XPENDING 查看待处理消息**
`XPENDING <key> <group> [start end count] [consumer]`
```bash
# 查看待确认的消息列表
XPENDING stream:orders group1 - + 10
```

**基本写法：XCLAIM 转移消息归属**
`XCLAIM <key> <group> <consumer> <min-idle-time> <ID> [ID ...]`
```bash
# 转移超时未确认的消息给其他消费者
XCLAIM stream:orders group1 consumer2 60000 1718334600000-0
```

**基本写法：XAUTOCLAIM 自动转移（6.2+）**
`XAUTOCLAIM <key> <group> <consumer> <min-idle-time> <start> [COUNT <数量>]`
```bash
# 自动扫描并转移超时消息
XAUTOCLAIM stream:orders group1 consumer2 60000 0 COUNT 10
```

**基本写法：XINFO 查看流信息**
`XINFO STREAM <key> [FULL [COUNT <数量>]]`
```bash
# 查看流详细信息
XINFO STREAM stream:orders FULL
```

**基本写法：XINFO 查看消费者组**
`XINFO GROUPS <key>`
```bash
# 查看流的所有消费者组
XINFO GROUPS stream:orders
```

**基本写法：XINFO 查看消费者**
`XINFO CONSUMERS <key> <group>`
```bash
# 查看消费者组中的消费者
XINFO CONSUMERS stream:orders group1
```

**基本写法：XTRIM 修剪流**
`XTRIM <key> <MAXLEN|MINID> [=|~] <阈值>`
```bash
# 修剪流仅保留最近 1000 条
XTRIM stream:logs MAXLEN 1000
```

**基本写法：XDEL 删除消息**
`XDEL <key> <ID> [ID ...]`
```bash
# 删除指定 ID 的消息
XDEL stream:orders 1718334600000-0
```

---

## 实用模式

**基本写法：实时聊天室**
`PUBLISH <room:频道> <消息>`
```bash
# 发布聊天消息
PUBLISH room:1001 "user1: 你好"
# 订阅房间
SUBSCRIBE room:1001
```

**基本写法：事件通知**
`PUBLISH <event:类型> <JSON数据>`
```bash
# 发布事件通知
PUBLISH event:order.created '{"order_id":1001,"amount":99.9}'
```

**基本写法：可靠消息队列（Stream）**
`XADD <stream> * <field> <value> 配合 XREADGROUP 与 XACK`
```bash
# 生产者发送可靠消息
XADD stream:tasks * task_id 1001 payload "do something"
# 消费者组消费并确认
XREADGROUP GROUP workers worker1 COUNT 1 STREAMS stream:tasks >
XACK stream:tasks workers 1718334600000-0
```

**基本写法：多播通知**
`PUBLISH <broadcast:全局> <消息>`
```bash
# 全局广播消息
PUBLISH broadcast:all "system maintenance at 22:00"
PSUBSCRIBE broadcast:*
```
