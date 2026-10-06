---
order: 610
title: Go 与 Redis：从给慢接口加缓存开始
module: 'go'
category: 后端技术
difficulty: intermediate
description: 以"给变慢的详情页接口加缓存"为主线学 go-redis/v9：连接与 redis.Nil、Cache-Aside、按问题选数据结构、管道、分布式锁与限流、Scan 与生产习惯，附坑点、自检与练习。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'go/610-GoKubernetes'
  - 'go/340-GoDatabase'
  - 'go/540-GoMessageQueue'
  - 'go/350-GoTest'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 真实场景：详情页接口越来越慢

你的服务上线三个月，监控显示商品详情页 P99 从 80ms 涨到 1.2s，数据库 CPU 飙高。看慢查询日志：同一个"查商品"的 SQL 每秒被重复执行几百次——大部分请求读的都是同一批热点商品。经典的解法：**在应用与数据库之间加一层 Redis 缓存**，热点数据放内存里，数据库只处理缓存没有的请求。

本篇就沿着"加缓存"这件事，把 go-redis/v9 的核心能力全部过一遍。本机实验需要一个 Redis：`docker run -d -p 6379:6379 redis:7`。

## 动手第一步：连上并跑通读写

```bash
go get github.com/redis/go-redis/v9
```

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr:         "localhost:6379",
        Password:     "", // 没设密码就留空
        DB:           0,
        ReadTimeout:  3 * time.Second,  // 生产必设：Redis 卡住时不拖死调用方
        WriteTimeout: 3 * time.Second,
    })

    ctx := context.Background()

    // Ping 是真正的连通性验证（NewClient 本身不建连接）
    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatal("连接 Redis 失败:", err)
    }

    // 写入：第三个参数是过期时间，0 表示永不过期
    if err := rdb.Set(ctx, "name", "小明", 0).Err(); err != nil {
        log.Fatal(err)
    }

    val, err := rdb.Get(ctx, "name").Result()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("name =", val) // name = 小明
}
```

三个立刻要养成的习惯都埋在上面了：**所有命令都吃 `context`**（超时与取消能传导下去）；**Ping 验证连通**（`NewClient` 只是建配置）；**读写超时显式设置**（默认值为 3s，但显式写出让团队约定可见）。

## 动手第二步：Cache-Aside 缓存函数

缓存的标准模式叫 Cache-Aside：先查缓存，未命中查数据库并回填：

```go
func GetUser(rdb *redis.Client, id string) (*User, error) {
    ctx := context.Background()
    cacheKey := "user:" + id

    // 1. 先查缓存
    val, err := rdb.Get(ctx, cacheKey).Result()
    if err == nil {
        var user User
        if err := json.Unmarshal([]byte(val), &user); err == nil {
            return &user, nil
        }
    } else if err != redis.Nil {
        // redis.Nil = 键不存在，走未命中；其他错误才是真故障，记日志但别让缓存故障拖垮接口
        log.Printf("cache get: %v", err)
    }

    // 2. 未命中，查数据库
    user, err := db.GetUserByID(id)
    if err != nil {
        return nil, err
    }

    // 3. 回填缓存。TTL 加随机量，避免大批键同一时刻过期造成缓存雪崩
    data, _ := json.Marshal(user)
    ttl := 5*time.Minute + time.Duration(rand.Intn(60))*time.Second
    rdb.Set(ctx, cacheKey, data, ttl)

    return user, nil
}
```

这段代码里最重要的细节是 `err == redis.Nil` 的分支：

## 讲为什么：redis.Nil 为什么不是错误

键不存在时，`Get` 返回的是哨兵值 `redis.Nil` 而非普通 error。因为"没查到"在缓存场景里是**每日亿万次的正常状态**，和"Redis 挂了"必须区别对待：

```go
val, err := rdb.Get(ctx, "key").Result()
switch {
case err == redis.Nil:
    // 键不存在 -> 未命中，去查数据库
case err != nil:
    // 真正的错误（超时、断连）-> 记日志、降级
default:
    // 命中
}
```

如果直接 `if err != nil { return err }`，第一个未命中的请求就会把整个接口打成 500——这是 Redis 新手最常见的事故。

## 动手第三步：按问题选数据结构

五大数据结构不是并列的知识点，而是五个问题的答案：

**问题一：统计今天有多少人访问？** 自增计数器，字符串结构：

```go
rdb.Incr(ctx, "page_views")                    // 原子自增
count, _ := rdb.Get(ctx, "page_views").Int64() // 取回为数字
```

**问题二：对象有很多字段，只想改其中之一？** 哈希，类似 Go 的 map：

```go
rdb.HSet(ctx, "user:1001", "name", "小明", "age", 25)
name, _ := rdb.HGet(ctx, "user:1001", "name").Result()
fields, _ := rdb.HGetAll(ctx, "user:1001").Result() // map[string]string
rdb.HDel(ctx, "user:1001", "age")
```

**问题三：排行榜？** 有序集合，每个成员带分数、按分数排序：

```go
rdb.ZAdd(ctx, "leaderboard", redis.Z{Score: 95, Member: "小明"})
rdb.ZAdd(ctx, "leaderboard", redis.Z{Score: 87, Member: "小红"})

top3, _ := rdb.ZRevRangeWithScores(ctx, "leaderboard", 0, 2).Result()
for i, z := range top3 {
    fmt.Printf("第%d名: %s (%.0f分)\n", i+1, z.Member, z.Score)
}
rank, _ := rdb.ZRevRank(ctx, "leaderboard", "小明").Result() // 从 0 开始
rdb.ZIncrBy(ctx, "leaderboard", 5, "小红")                   // 加分
```

**问题四：标签去重、找共同好友？** 集合，天然不重复，自带交并差：

```go
rdb.SAdd(ctx, "tags:article:1", "Go", "Redis")
common, _ := rdb.SInter(ctx, "tags:article:1", "tags:article:2").Result() // 交集
all, _ := rdb.SUnion(ctx, "tags:article:1", "tags:article:2").Result()    // 并集
diff, _ := rdb.SDiff(ctx, "tags:article:1", "tags:article:2").Result()    // 差集
```

**问题五：轻量任务队列？** 列表，两端推弹：

```go
rdb.RPush(ctx, "tasks", "任务1", "任务2") // 右端入队
task, _ := rdb.LPop(ctx, "tasks").Result() // 左端出队
n, _ := rdb.LLen(ctx, "tasks").Result()    // 队列长度
```

正式的高吞吐队列见 [消息队列](/go/540-GoMessageQueue)；列表队列适合量不大、不想多维护一个中间件的场合。

## 动手第四步：批量化与原子性

**省网络往返用管道**。每条命令一次网络往返，一万次 Set 就是一万次 RTT；管道把命令攒起来一次发送：

```go
pipe := rdb.Pipeline()
setCmd := pipe.Set(ctx, "key1", "value1", 0)
getCmd := pipe.Get(ctx, "key2")
incrCmd := pipe.Incr(ctx, "counter")
pipe.Exec(ctx) // 一次性发送

fmt.Println(setCmd.Val(), getCmd.Val(), incrCmd.Val()) // 各自取结果
```

**"判断再写入"必须下沉到服务端**。分布式锁是标准例子：不能 Get 看一眼再 Set——两步之间别人可能抢先。用 `SetNX`（不存在才写）加锁，且**必须写入随机令牌**；释放时用 Lua 脚本"校验令牌再删除"，两步在 Redis 服务端原子完成：

```go
func AcquireLock(rdb *redis.Client, lockKey, token string, ttl time.Duration) (bool, error) {
    return rdb.SetNX(ctx, lockKey, token, ttl).Result()
}

var releaseScript = redis.NewScript(`
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0
`)

func ReleaseLock(rdb *redis.Client, lockKey, token string) error {
    return releaseScript.Run(ctx, rdb, []string{lockKey}, token).Err()
}

// 使用：token 必须是随机串
token := "lock-" + uuid.NewString()
if locked, _ := AcquireLock(rdb, "lock:order_123", token, 10*time.Second); locked {
    defer ReleaseLock(rdb, "lock:order_123", token)
    processOrder()
}
```

为什么令牌是必需的：如果只是 `Del`，你的业务超时、锁过期被 B 抢走后，你回来一删，删掉的是 B 的锁。随机令牌让"释放别人的锁"变成安全失败。生产级锁还有"业务没跑完锁先过期"（看门狗续期）与主从切换丢锁两个坑，强正确性要求高时评估 Redlock 或改用 etcd/ZooKeeper。

限流是同一思想的另一应用，先看滑动窗口的管道版：

```go
func IsRateLimited(rdb *redis.Client, userID string, limit int, window time.Duration) bool {
    key := "rate:" + userID
    now := time.Now().UnixNano()

    pipe := rdb.Pipeline()
    pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", now-window.Nanoseconds())) // 清窗口外
    pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})                    // 记本次
    countCmd := pipe.ZCard(ctx, key)                                                  // 数窗口内
    pipe.Expire(ctx, key, window)
    pipe.Exec(ctx)

    return countCmd.Val() > int64(limit)
}
```

更简洁的固定窗口用 Lua：INCR 与 EXPIRE 的组合在服务端原子执行，没有"自增了但还没设过期"的中间态：

```go
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

需要多键乐观锁事务时用 Watch（键在事务前被改则事务失败）：

```go
err := rdb.Watch(ctx, func(tx *redis.Tx) error {
    val, err := tx.Get(ctx, "counter").Int64()
    if err != nil && err != redis.Nil {
        return err
    }
    _, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
        pipe.Set(ctx, "counter", val+1, 0)
        return nil
    })
    return err
}, "counter")
```

## 生产习惯四条

**一，别用 Keys，用 Scan。** `rdb.Keys(ctx, "user:*")` 一次扫描全库，数据量大时阻塞整个 Redis。Scan 游标分批迭代，每次只取一小批：

```go
var cursor uint64
for {
    var keys []string
    keys, cursor, _ = rdb.Scan(ctx, cursor, "user:*", 100).Result()
    // 处理 keys ...
    if cursor == 0 {
        break
    }
}
```

**二，控制大键。** 单键塞进几 MB 的列表或集合，操作它会阻塞单线程的 Redis。大集合拆小键、分页取。

**三，序列化选型想清楚。** Redis 只存字符串：复杂对象 JSON 起步，性能敏感时换 msgpack；能存哈希字段的对象优先哈希，省掉整对象反序列化。

**四，按容量选客户端形态。** 单机用 `NewClient`；Redis Cluster 用 `NewClusterClient(&redis.ClusterOptions{Addrs: [...]})`，接口几乎不变。Redis 还能当简单消息通道（`Subscribe`/`Publish`），但投递不保证可靠，正经异步任务请用消息队列。

## 坑点与自检

**坑 1：未命中当故障。** `redis.Nil` 直接 return err，缓存一冷全部请求报错——见前文三分支写法。

**坑 2：TTL 全场统一。** 大批键同时过期，数据库瞬间被击穿。TTL 加随机抖动；热点 key 用 SetNX 做互斥重建。

**坑 3：锁只 SetNX 不带令牌。** 过期误删别人的锁，事故复现极难排查。

**坑 4：Keys 上生产。** 代码评审时见到 `Keys(` 直接打回，换成 Scan 循环。

自检——能不看文档回答这些吗：

1. `Get` 的 err 有哪三种情况？各自怎么处理？
2. Cache-Aside 三步是什么？TTL 为什么要加随机量？
3. 释放锁为什么必须用 Lua 而不能先 Get 再 Del？
4. Pipeline 和 Lua 各解决什么问题？什么场景必须用后者？

## 练习

1. 给练习项目里的任一数据库查询套上 Cache-Aside 函数，用 `redis-cli MONITOR` 观察：首次请求、命中请求、TTL 过期后请求分别产生哪些命令。
2. 用哈希实现一个"用户资料"读写 API，再故意并发更新同一用户的两个字段，思考哈希是否比"整对象 JSON 覆盖写"更安全，结论写进注释。
3. 把固定窗口 Lua 限流脚本跑起来，用 20 个并发 goroutine 打一个 limit=10 的接口，统计通过/被拒数量是否符合预期，并解释窗口边界的突刺问题。

## 下一步

- 缓存背后的数据库本体：[Go 与数据库](/go/340-GoDatabase)；
- 需要可靠投递时升级到真正的消息队列：[Go 与消息队列](/go/540-GoMessageQueue)；
- 限流的完整算法谱系（令牌桶、漏桶、分布式限流）：[Go 限流](/go/500-GoRateLimiting)；
- 用 testcontainers 给缓存逻辑写集成测试：[Go 测试](/go/350-GoTest)。
