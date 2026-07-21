---
order: 66
title: Go与Redis
module: go
category: Go
difficulty: intermediate
description: 'go-redis客户端'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与Kubernetes
  - go/Go与数据库
  - go/Go与消息队列
  - go/Go与测试
prerequisites:
  - go/概述与环境配置
---

## 概述

Redis 是一个基于内存的键值存储系统，支持多种数据结构（字符串、哈希、列表、集合等），读写速度极快，常用于缓存、会话管理、排行榜、消息队列等场景。Go 语言中最流行的 Redis 客户端是 go-redis，它提供了完整的 Redis 命令支持、连接池管理和集群模式。

## 基础概念

在开始编码之前，需要了解 Redis 的几个核心概念：

- **键（Key）**：Redis 中每条数据的唯一标识，类似 map 的键。
- **值（Value）**：键对应的数据，可以是字符串、哈希、列表等多种类型。
- **过期时间（TTL）**：可以为键设置生存时间，到期后自动删除，常用于缓存场景。
- **连接池**：go-redis 内部维护连接池，自动复用连接，无需手动管理。
- **管道（Pipeline）**：将多个命令打包一次性发送，减少网络往返时间。
- **事务**：Redis 支持简单的事务，通过 MULTI/EXEC 命令将多个操作原子执行。

## 快速上手

首先安装 go-redis 客户端：

```bash
go get github.com/redis/go-redis/v9
```

最简单的连接和读写示例：

```go
package main

import (
    "context"
    "fmt"
    "log"
    "github.com/redis/go-redis/v9"
)

func main() {
    // 创建客户端并连接 Redis
    rdb := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379", // Redis 服务器地址
        Password: "",               // 密码，默认为空
        DB:       0,                // 使用的数据库编号，默认 0
    })

    ctx := context.Background()

    // 测试连接
    err := rdb.Ping(ctx).Err()
    if err != nil {
        log.Fatal("连接 Redis 失败:", err)
    }

    // 设置键值对，第三个参数是过期时间，0 表示永不过期
    err = rdb.Set(ctx, "name", "小明", 0).Err()
    if err != nil {
        log.Fatal(err)
    }

    // 获取值
    val, err := rdb.Get(ctx, "name").Result()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("name =", val) // 输出：name = 小明
}
```

## 详细用法

### 1. 字符串操作

字符串是 Redis 最基础的数据类型，可以存储文本、数字甚至序列化的 JSON：

```go
// 设置值，带过期时间
rdb.Set(ctx, "session:abc123", "user_data", 30*time.Minute)

// 获取值
val, err := rdb.Get(ctx, "session:abc123").Result()
if err == redis.Nil {
    fmt.Println("键不存在")
} else if err != nil {
    log.Fatal(err)
}

// 设置值（仅在键不存在时）
ok, _ := rdb.SetNX(ctx, "lock:order_123", "1", 10*time.Second).Result()
if ok {
    fmt.Println("获取锁成功")
}

// 批量设置
rdb.MSet(ctx, "key1", "value1", "key2", "value2")

// 批量获取
vals, _ := rdb.MGet(ctx, "key1", "key2").Result()

// 自增（常用于计数器）
rdb.Incr(ctx, "page_views")
count, _ := rdb.Get(ctx, "page_views").Int64()
fmt.Println("页面浏览量:", count)
```

### 2. 哈希操作

哈希适合存储对象，类似 Go 的 map：

```go
// 设置哈希字段
rdb.HSet(ctx, "user:1001", "name", "小明", "age", 25, "email", "ming@example.com")

// 获取单个字段
name, _ := rdb.HGet(ctx, "user:1001", "name").Result()

// 获取所有字段
fields, _ := rdb.HGetAll(ctx, "user:1001").Result()
for k, v := range fields {
    fmt.Printf("%s: %s\n", k, v)
}

// 删除字段
rdb.HDel(ctx, "user:1001", "email")

// 判断字段是否存在
exists, _ := rdb.HExists(ctx, "user:1001", "name").Result()
```

### 3. 列表操作

列表是有序的字符串集合，支持从两端推入和弹出：

```go
// 从右侧推入（常用于消息队列）
rdb.RPush(ctx, "tasks", "任务1", "任务2", "任务3")

// 从左侧弹出（消费任务）
task, _ := rdb.LPop(ctx, "tasks").Result()
fmt.Println("取出任务:", task)

// 获取列表长度
length, _ := rdb.LLen(ctx, "tasks").Result()

// 获取指定范围的元素（不弹出）
items, _ := rdb.LRange(ctx, "tasks", 0, -1).Result() // 0 到 -1 表示全部
```

### 4. 集合操作

集合是无序且不重复的元素集合：

```go
// 添加元素
rdb.SAdd(ctx, "tags:article:1", "Go", "Redis", "数据库")

// 获取所有成员
members, _ := rdb.SMembers(ctx, "tags:article:1").Result()

// 判断成员是否存在
exists, _ := rdb.SIsMember(ctx, "tags:article:1", "Go").Result()

// 交集（共同标签）
common, _ := rdb.SInter(ctx, "tags:article:1", "tags:article:2").Result()

// 并集
all, _ := rdb.SUnion(ctx, "tags:article:1", "tags:article:2").Result()

// 差集
diff, _ := rdb.SDiff(ctx, "tags:article:1", "tags:article:2").Result()
```

### 5. 有序集合操作

有序集合的每个元素关联一个分数，按分数排序，常用于排行榜：

```go
// 添加成员和分数
rdb.ZAdd(ctx, "leaderboard", redis.Z{Score: 95, Member: "小明"})
rdb.ZAdd(ctx, "leaderboard", redis.Z{Score: 87, Member: "小红"})
rdb.ZAdd(ctx, "leaderboard", redis.Z{Score: 92, Member: "小华"})

// 按分数从高到低获取排名（0 表示最高分）
top3, _ := rdb.ZRevRangeWithScores(ctx, "leaderboard", 0, 2).Result()
for i, z := range top3 {
    fmt.Printf("第%d名: %s (%.0f分)\n", i+1, z.Member, z.Score)
}

// 获取某个成员的排名
rank, _ := rdb.ZRevRank(ctx, "leaderboard", "小明").Result()
fmt.Printf("小明的排名: %d\n", rank+1) // 排名从0开始，加1

// 增加分数
rdb.ZIncrBy(ctx, "leaderboard", 5, "小红") // 小红加5分
```

### 6. 键管理

```go
// 设置过期时间
rdb.Expire(ctx, "session:abc", 30*time.Minute)

// 查看剩余过期时间
ttl, _ := rdb.TTL(ctx, "session:abc").Result()

// 删除键
rdb.Del(ctx, "temp_key")

// 检查键是否存在
exists, _ := rdb.Exists(ctx, "name").Result()

// 按模式查找键
keys, _ := rdb.Keys(ctx, "user:*").Result()
```

### 7. 管道操作

管道将多个命令打包发送，减少网络往返：

```go
// 创建管道
pipe := rdb.Pipeline()

// 添加命令到管道（不会立即执行）
setCmd := pipe.Set(ctx, "key1", "value1", 0)
getCmd := pipe.Get(ctx,key2")
incrCmd := pipe.Incr(ctx, "counter")

// 一次性执行所有命令
_, err := pipe.Exec(ctx)
if err != nil && err != redis.Nil {
    log.Fatal(err)
}

// 获取各命令的结果
fmt.Println(setCmd.Val())
fmt.Println(getCmd.Val())
fmt.Println(incrCmd.Val())
```

## 常见场景

### 场景一：缓存

将数据库查询结果缓存到 Redis，减少数据库压力：

```go
func GetUser(rdb *redis.Client, id string) (*User, error) {
    ctx := context.Background()
    cacheKey := "user:" + id

    // 先查缓存
    val, err := rdb.Get(ctx, cacheKey).Result()
    if err == nil {
        // 缓存命中，反序列化后返回
        var user User
        json.Unmarshal([]byte(val), &user)
        return &user, nil
    }

    // 缓存未命中，查数据库
    user, err := db.GetUserByID(id)
    if err != nil {
        return nil, err
    }

    // 写入缓存，设置5分钟过期
    data, _ := json.Marshal(user)
    rdb.Set(ctx, cacheKey, data, 5*time.Minute)

    return user, nil
}
```

### 场景二：分布式锁

使用 SetNX 实现简单的分布式锁：

```go
func AcquireLock(rdb *redis.Client, lockKey string, ttl time.Duration) (bool, error) {
    // 尝试设置锁，仅在键不存在时成功
    ok, err := rdb.SetNX(ctx, lockKey, "locked", ttl).Result()
    return ok, err
}

func ReleaseLock(rdb *redis.Client, lockKey string) {
    rdb.Del(ctx, lockKey)
}

// 使用示例
locked, _ := AcquireLock(rdb, "lock:order_123", 10*time.Second)
if locked {
    defer ReleaseLock(rdb, "lock:order_123")
    // 执行需要加锁的操作
    processOrder()
}
```

### 场景三：限流

使用 Redis 实现简单的滑动窗口限流：

```go
func IsRateLimited(rdb *redis.Client, userID string, limit int, window time.Duration) bool {
    key := "rate:" + userID
    now := time.Now().UnixNano()

    pipe := rdb.Pipeline()
    // 移除窗口外的记录
    pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", now-window.Nanoseconds()))
    // 添加当前请求
    pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})
    // 统计窗口内请求数
    countCmd := pipe.ZCard(ctx, key)
    // 设置过期时间
    pipe.Expire(ctx, key, window)

    pipe.Exec(ctx)
    return countCmd.Val() > int64(limit)
}
```

## 注意事项与常见错误

1. **redis.Nil 不是错误**：当键不存在时，`Get` 返回 `redis.Nil`，这不是真正的错误，需要单独判断：

```go
val, err := rdb.Get(ctx, "key").Result()
if err == redis.Nil {
    // 键不存在，正常情况
} else if err != nil {
    // 真正的错误
}
```

2. **连接超时**：生产环境建议设置读写超时，避免 Redis 响应慢时阻塞程序：

```go
rdb := redis.NewClient(&redis.Options{
    Addr:         "localhost:6379",
    ReadTimeout:  3 * time.Second,
    WriteTimeout: 3 * time.Second,
})
```

3. **大键问题**：避免在单个键中存储过大的值（如超过 10KB 的列表），这会阻塞 Redis。大列表应该拆分成多个小键。

4. **Keys 命令慎用**：`Keys` 命令会扫描整个数据库，在数据量大时会阻塞 Redis。生产环境应该使用 `Scan` 命令：

```go
var cursor uint64
for {
    var keys []string
    keys, cursor, _ = rdb.Scan(ctx, cursor, "user:*", 100).Result()
    // 处理 keys...
    if cursor == 0 {
        break
    }
}
```

5. **序列化格式**：Redis 存储的是字符串，复杂对象需要序列化。推荐使用 JSON，简单场景可以用 msgpack 提高性能。

## 进阶用法

### 集群模式

连接 Redis 集群：

```go
rdb := redis.NewClusterClient(&redis.ClusterOptions{
    Addrs: []string{
        "redis1:6379",
        "redis2:6379",
        "redis3:6379",
    },
    Password: "your-password",
})
```

### 发布订阅

Redis 可以用作简单的消息通道：

```go
// 订阅频道
sub := rdb.Subscribe(ctx, "notifications")
ch := sub.Channel()
for msg := range ch {
    fmt.Printf("收到通知: %s\n", msg.Payload)
}

// 发布消息
rdb.Publish(ctx, "notifications", "系统维护通知")
```

### 事务

使用 Watch 实现乐观锁：

```go
// 监视键，如果键在事务执行前被修改，事务会失败
err := rdb.Watch(ctx, func(tx *redis.Tx) error {
    // 获取当前值
    val, err := tx.Get(ctx, "counter").Int64()
    if err != nil && err != redis.Nil {
        return err
    }

    // 在事务中执行操作
    _, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
        pipe.Set(ctx, "counter", val+1, 0)
        return nil
    })
    return err
}, "counter")
```

### Lua 脚本

执行 Lua 脚本实现原子操作：

```go
// 限流脚本：返回是否允许请求
var rateLimitScript = redis.NewScript(`
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    if current > tonumber(ARGV[2]) then
        return 0
    end
    return 1
`)

result, _ := rateLimitScript.Run(ctx, rdb, []string{"rate:user:123"}, "60", "100").Int64()
if result == 0 {
    fmt.Println("请求过于频繁")
}
```
