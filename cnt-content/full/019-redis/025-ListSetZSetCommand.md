---
order: 250
title: Redis List/Set/ZSet 命令
module: 'redis'
category: 数据库
difficulty: beginner
description: Redis List/Set/ZSet 命令 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## List 列表

**基本写法：LPUSH 左侧插入**
`LPUSH <key> <value1> [value2 ...]`
```bash
# 在列表头部插入元素
LPUSH messages "hello" "world"
```

**基本写法：RPUSH 右侧插入**
`RPUSH <key> <value1> [value2 ...]`
```bash
# 在列表尾部插入元素
RPUSH queue:tasks task1 task2
```

**基本写法：LPOP 左侧弹出**
`LPOP <key> [count]`
```bash
# 从列表头部弹出元素
LPOP queue:tasks
```

**基本写法：RPOP 右侧弹出**
`RPOP <key> [count]`
```bash
# 从列表尾部弹出元素
RPOP queue:tasks
```

**基本写法：LRANGE 获取范围**
`LRANGE <key> <start> <stop>`
```bash
# 获取列表指定范围元素（0 到 -1 为全部）
LRANGE messages 0 -1
```

**基本写法：LINDEX 按索引获取**
`LINDEX <key> <索引>`
```bash
# 获取指定索引位置的元素
LINDEX messages 0
```

**基本写法：LLEN 获取长度**
`LLEN <key>`
```bash
# 获取列表长度
LLEN messages
```

**基本写法：LINSERT 插入元素**
`LINSERT <key> BEFORE|AFTER <pivot> <value>`
```bash
# 在指定元素前或后插入
LINSERT messages BEFORE "world" "new"
```

**基本写法：LREM 删除指定元素**
`LREM <key> <count> <value>`
```bash
# 删除指定数量的匹配元素
LREM messages 2 "hello"
```

**基本写法：LTRIM 修剪列表**
`LTRIM <key> <start> <stop>`
```bash
# 仅保留指定范围元素
LTRIM messages 0 99
```

**基本写法：LSET 修改元素**
`LSET <key> <索引> <value>`
```bash
# 修改指定索引位置的元素
LSET messages 0 "updated"
```

**基本写法：RPOPLPUSH 转移元素**
`RPOPLPUSH <源> <目标>`
```bash
# 从源列表尾部弹出并插入目标列表头部
RPOPLPUSH queue:pending queue:processing
```

**基本写法：LMOVE 转移元素（替代 RPOPLPUSH）**
`LMOVE <源> <目标> <LEFT|RIGHT> <LEFT|RIGHT>`
```bash
# 灵活指定源和目标的弹出插入方向
LMOVE queue:pending queue:processing LEFT RIGHT
```

**基本写法：BLPOP 阻塞弹出**
`BLPOP <key> [key ...] <超时>`
```bash
# 阻塞式左侧弹出（0 表示永久阻塞）
BLPOP queue:tasks 30
```

**基本写法：BRPOP 阻塞弹出**
`BRPOP <key> [key ...] <超时>`
```bash
# 阻塞式右侧弹出
BRPOP queue:tasks 30
```

---

## Set 集合

**基本写法：SADD 添加元素**
`SADD <key> <member1> [member2 ...]`
```bash
# 向集合添加元素
SADD tags:article:1 redis mysql postgresql
```

**基本写法：SREM 删除元素**
`SREM <key> <member1> [member2 ...]`
```bash
# 从集合删除元素
SREM tags:article:1 mysql
```

**基本写法：SMEMBERS 获取所有元素**
`SMEMBERS <key>`
```bash
# 获取集合所有元素
SMEMBERS tags:article:1
```

**基本写法：SISMEMBER 判断成员存在**
`SISMEMBER <key> <member>`
```bash
# 判断元素是否在集合中
SISMEMBER tags:article:1 redis
```

**基本写法：SMISMEMBER 批量判断**
`SMISMEMBER <key> <member1> [member2 ...]`
```bash
# 批量判断多个元素是否存在
SMISMEMBER tags:article:1 redis mysql mongodb
```

**基本写法：SCARD 获取集合大小**
`SCARD <key>`
```bash
# 获取集合元素数量
SCARD tags:article:1
```

**基本写法：SRANDMEMBER 随机获取**
`SRANDMEMBER <key> [count]`
```bash
# 随机获取元素不删除
SRANDMEMBER tags:article:1 2
```

**基本写法：SPOP 随机弹出**
`SPOP <key> [count]`
```bash
# 随机弹出元素并删除
SPOP lucky:draw 1
```

**基本写法：SMOVE 转移元素**
`SMOVE <源> <目标> <member>`
```bash
# 将元素从一个集合转移到另一个
SMOVE set:old set:new member1
```

---

## Set 集合运算

**基本写法：SINTER 交集**
`SINTER <key1> [key2 ...]`
```bash
# 获取多个集合的交集
SINTER tags:article:1 tags:article:2
```

**基本写法：SUNION 并集**
`SUNION <key1> [key2 ...]`
```bash
# 获取多个集合的并集
SUNION tags:article:1 tags:article:2
```

**基本写法：SDIFF 差集**
`SDIFF <key1> [key2 ...]`
```bash
# 获取第一个集合与其他集合的差集
SDIFF tags:article:1 tags:article:2
```

**基本写法：SINTERSTORE 交集存储**
`SINTERSTORE <目标> <key1> [key2 ...]`
```bash
# 将交集结果存储到新集合
SINTERSTORE common:tags tags:article:1 tags:article:2
```

**基本写法：SUNIONSTORE 并集存储**
`SUNIONSTORE <目标> <key1> [key2 ...]`
```bash
# 将并集结果存储到新集合
SUNIONSTORE all:tags tags:article:1 tags:article:2
```

**基本写法：SDIFFSTORE 差集存储**
`SDIFFSTORE <目标> <key1> [key2 ...]`
```bash
# 将差集结果存储到新集合
SDIFFSTORE diff:tags tags:article:1 tags:article:2
```

**基本写法：SINTERCARD 交集数量（7.0+）**
`SINTERCARD <numkeys> <key1> [key2 ...] [LIMIT <数量>]`
```bash
# 仅返回交集元素数量不返回具体元素
SINTERCARD 2 tags:article:1 tags:article:2
```

---

## Sorted Set 有序集合

**基本写法：ZADD 添加元素**
`ZADD <key> [NX|XX] [GT|LT] [CH] [INCR] <score1> <member1> [score2 member2 ...]`
```bash
# 添加带分数的元素
ZADD leaderboard 100 user:1 90 user:2 80 user:3
```

**基本写法：ZADD 仅更新已存在元素**
`ZADD <key> XX <score> <member>`
```bash
# 仅更新已存在成员的分数
ZADD leaderboard XX 95 user:2
```

**基本写法：ZADD 仅新增不更新**
`ZADD <key> NX <score> <member>`
```bash
# 仅添加新成员不更新已有成员
ZADD leaderboard NX 85 user:4
```

**基本写法：ZSCORE 获取分数**
`ZSCORE <key> <member>`
```bash
# 获取成员的分数
ZSCORE leaderboard user:1
```

**基本写法：ZMSCORE 批量获取分数**
`ZMSCORE <key> <member1> [member2 ...]`
```bash
# 批量获取多个成员分数
ZMSCORE leaderboard user:1 user:2 user:3
```

**基本写法：ZRANK 升序排名**
`ZRANK <key> <member>`
```bash
# 获取成员升序排名（0 为最小）
ZRANK leaderboard user:1
```

**基本写法：ZREVRANK 降序排名**
`ZREVRANK <key> <member>`
```bash
# 获取成员降序排名（0 为最大）
ZREVRANK leaderboard user:1
```

**基本写法：ZRANGE 按索引范围获取**
`ZRANGE <key> <start> <stop> [WITHSCORES]`
```bash
# 按升序获取索引范围元素
ZRANGE leaderboard 0 9 WITHSCORES
```

**基本写法：ZREVRANGE 降序范围获取**
`ZREVRANGE <key> <start> <stop> [WITHSCORES]`
```bash
# 按降序获取索引范围元素
ZREVRANGE leaderboard 0 9 WITHSCORES
```

**基本写法：ZRANGEBYSCORE 按分数范围获取**
`ZRANGEBYSCORE <key> <min> <max> [WITHSCORES] [LIMIT offset count]`
```bash
# 获取分数范围内的元素
ZRANGEBYSCORE leaderboard 80 100 WITHSCORES LIMIT 0 10
```

**基本写法：ZREVRANGEBYSCORE 降序按分数获取**
`ZREVRANGEBYSCORE <key> <max> <min> [WITHSCORES] [LIMIT offset count]`
```bash
# 降序获取分数范围内的元素
ZREVRANGEBYSCORE leaderboard 100 80 WITHSCORES LIMIT 0 10
```

**基本写法：ZRANGEBYSCORE 使用无穷大**
`ZRANGEBYSCORE <key> -inf +inf [WITHSCORES]`
```bash
# 获取全部元素
ZRANGEBYSCORE leaderboard -inf +inf WITHSCORES
```

**基本写法：ZINCRBY 增加分数**
`ZINCRBY <key> <增量> <member>`
```bash
# 增加成员分数
ZINCRBY leaderboard 5 user:1
```

**基本写法：ZREM 删除元素**
`ZREM <key> <member1> [member2 ...]`
```bash
# 删除有序集合元素
ZREM leaderboard user:3
```

**基本写法：ZREMRANGEBYRANK 按排名删除**
`ZREMRANGEBYRANK <key> <start> <stop>`
```bash
# 按排名范围删除元素
ZREMRANGEBYRANK leaderboard 0 9
```

**基本写法：ZREMRANGEBYSCORE 按分数删除**
`ZREMRANGEBYSCORE <key> <min> <max>`
```bash
# 按分数范围删除元素
ZREMRANGEBYSCORE leaderboard 0 60
```

**基本写法：ZCARD 获取元素数量**
`ZCARD <key>`
```bash
# 获取有序集合元素总数
ZCARD leaderboard
```

**基本写法：ZCOUNT 按分数统计数量**
`ZCOUNT <key> <min> <max>`
```bash
# 统计指定分数范围内的元素数量
ZCOUNT leaderboard 80 100
```

---

## ZSet 集合运算

**基本写法：ZUNIONSTORE 并集存储**
`ZUNIONSTORE <目标> <numkeys> <key> [key ...] [WEIGHTS <权重>...] [AGGREGATE SUM|MIN|MAX]`
```bash
# 多个有序集合并集并按 SUM 聚合分数
ZUNIONSTORE total:score 2 score:week1 score:week2 AGGREGATE SUM
```

**基本写法：ZINTERSTORE 交集存储**
`ZINTERSTORE <目标> <numkeys> <key> [key ...] [WEIGHTS <权重>...] [AGGREGATE SUM|MIN|MAX]`
```bash
# 多个有序集合交集并按 MAX 聚合分数
ZINTERSTORE common:high 2 set1 set2 AGGREGATE MAX
```

**基本写法：ZDIFFSTORE 差集存储**
`ZDIFFSTORE <目标> <numkeys> <key> [key ...]`
```bash
# 多个有序集合差集存储
ZDIFFSTORE diff:set 2 set1 set2
```

**基本写法：ZUNION 并集返回（7.0+）**
`ZUNION <numkeys> <key> [key ...] [WITHSCORES]`
```bash
# 直接返回并集结果不存储
ZUNION 2 set1 set2 WITHSCORES
```

**基本写法：ZINTER 交集返回（7.0+）**
`ZINTER <numkeys> <key> [key ...] [WITHSCORES]`
```bash
# 直接返回交集结果不存储
ZINTER 2 set1 set2 WITHSCORES
```

---

## 实用模式

**基本写法：消息队列（List）**
`LPUSH <queue> <message> 配合 BRPOP`
```bash
# 生产者推送消息
LPUSH queue:email "send to user1"
# 消费者阻塞获取消息
BRPOP queue:email 30
```

**基本写法：排行榜（ZSet）**
`ZADD <rank> <score> <member> 配合 ZREVRANGE`
```bash
# 更新用户积分
ZADD rank:game 1500 user:1
# 获取前 10 名
ZREVRANGE rank:game 0 9 WITHSCORES
```

**基本写法：共同关注（Set）**
`SINTER <user1:follow> <user2:follow>`
```bash
# 获取两个用户的共同关注
SINTER user:1:follow user:2:follow
```

**基本写法：延迟队列（ZSet）**
`ZADD <delay:queue> <执行时间戳> <任务>`
```bash
# 添加延迟任务到队列
ZADD delay:queue 1718334600000 task:1001
# 扫描到期任务
ZRANGEBYSCORE delay:queue 0 1718334600000 LIMIT 0 100
```

**基本写法：滑动窗口限流（ZSet）**
`ZADD <rate:key> <时间戳> <唯一标识> 配合 ZREMRANGEBYSCORE`
```bash
# 滑动窗口限流记录请求
ZADD rate:user1 1718334600000 req-1
# 清理窗口外的记录
ZREMRANGEBYSCORE rate:user1 0 1718334540000
# 获取窗口内请求数
ZCARD rate:user1
```
