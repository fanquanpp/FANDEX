---
order: 40
title: List 与 Set 实战命令
description: 列表当队列/栈用（LPUSH/RPOP/BLPOP/LTRIM）与集合的成员判断/交并差运算，附典型场景与阻塞读陷阱
module: 'redis'
category: 数据库
difficulty: beginner
author: fanquanpp
updated: '2026-09-28'
related:
  - 'redis/030-HashCommand'
  - 'redis/050-NumberStats'
  - 'redis/090-Stream'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 1. 学习目标与前置知识

- 前置：会用 redis-cli 执行 SET/GET（见《概述与核心数据结构》）。
- 学完本篇你将能：
  1. 用 List 搭出「任务队列」「最新动态」两类最常见结构；
  2. 用 Set 做「去重收藏」「共同关注」这类成员运算；
  3. 知道什么时候 List 该升级成 Stream、什么时候 Set 该换成 ZSet。

一个真实场景贯穿全文：你在给一个内容社区做后端，需要
「发布队列」（后台慢慢处理投稿）和「文章标签 + 相似推荐」。

## 2. List：有序、可重复、两端操作

### 2.1 先跑起来：发布队列

```bash
# 后台任务队列：左进右出（FIFO）
127.0.0.1:6379> LPUSH queue:posts "post:301"
(integer) 1
127.0.0.1:6379> LPUSH queue:posts "post:302"
(integer) 2
127.0.0.1:6379> RPOP queue:posts
"post:301"                      # 先进先出，符合排队直觉
```

### 2.2 常用命令分组

```bash
# 入队/出队
LPUSH queue:tasks "task1" "task2"    # 左端入队（可一次多个）
RPUSH queue:tasks "task3"            # 右端入队
LPOP queue:tasks                     # 左端出队
RPOP queue:tasks                     # 右端出队

# 阻塞版：队列空时等待而不是立即返回 nil（消费线程标配）
BLPOP queue:tasks 30     # 最多阻塞等待 30 秒
BRPOP queue:tasks 0      # timeout=0 表示一直等

# 查看与裁剪
LLEN queue:tasks                       # 长度
LRANGE queue:tasks 0 -1                # 全部元素（0 -1 是「从头到尾」惯用写法）
LRANGE queue:tasks 0 9                 # 前 10 个
LTRIM queue:tasks 0 99                 # 只保留前 100 个

# 指定位置操作
LINDEX queue:tasks 0                   # 按索引取
LSET queue:tasks 0 "updated_task"      # 按索引改
LINSERT queue:tasks BEFORE "task2" "task1.5"
LREM queue:tasks 2 "task1"             # 删除前 2 个等于 "task1" 的元素
```

栈就是同一批命令换组合：`LPUSH` + `LPOP`（同端进出即 LIFO）。

### 2.3 经典模式：定长最新动态

「首页只显示最新 100 条」不要用 GET 全量再截断，写入时就裁：

```bash
LPUSH feed:u42 "post:887"        # 新动态插到头部
LTRIM feed:u42 0 99              # 顺手剪到 100 条
LRANGE feed:u42 0 9              # 渲染第一页
```

LPUSH + LTRIM 两条命令组合是固定套路，记得它们要一起出现在业务代码里。

### 2.4 陷阱与自检

- **LRANGE 是 O(S+N)**：N 是返回元素数。`LRANGE key 0 -1` 在长列表上
  一次拉全量，百万元素会阻塞；分页用小窗口，或改用 SCAN 类思路。
- **LPOP/RPOP 空队列返回 nil**：轮询消费会疯狂空转，改用 BLPOP/BRPOP；
  但 `BLPOP` 的 timeout 给 0（无限等）要配套「优雅退出」机制，否则连接吊死。
- **List 消息「取走即丢」**：RPOP 出来后消费者崩溃，消息就没了。
  需要确认/回溯/消费组，升级用 Stream（redis/090-Stream），List 只适合
  丢得起的通知类任务。
- **一个键就是一个 List**：没法按字段切，多租户场景键名里带业务 ID
  （如 `queue:posts:video`），别往一个列表里混塞。

## 3. Set：无序、不重复、集合运算

### 3.1 先跑起来：文章标签

```bash
127.0.0.1:6379> SADD tags:article:1 "redis" "database" "nosql"
(integer) 3
127.0.0.1:6379> SADD tags:article:1 "redis"     # 重复添加
(integer) 0                                     # 自动去重，返回 0
127.0.0.1:6379> SISMEMBER tags:article:1 "redis"
(integer) 1
```

### 3.2 常用命令分组

```bash
# 成员操作
SADD tags:article:1 "redis" "database"    # 添加
SREM tags:article:1 "nosql"               # 删除
SISMEMBER tags:article:1 "redis"          # 是否是成员（O(1)）
SCARD tags:article:1                      # 成员数
SMEMBERS tags:article:1                   # 全部成员（大集合慎用，同 HGETALL）
SRANDMEMBER tags:article:1 2              # 随机取 2 个（不删除，抽奖常用）
SPOP tags:article:1                       # 随机弹出（删除，发号场景）

# 集合运算（本文的核心价值）
SADD set:a 1 2 3 4 5
SADD set:b 3 4 5 6 7
SINTER set:a set:b           # 交集: 3 4 5（共同关注）
SUNION set:a set:b           # 并集: 1 2 3 4 5 6 7
SDIFF set:a set:b            # 差集: 1 2（a 有 b 没有）

# 运算结果落库，避免重复计算
SINTERSTORE result:a:b set:a set:b
SUNIONSTORE result:u set:a set:b
SDIFFSTORE result:d set:a set:b

# 大集合遍历
SSCAN tags:article:1 0 MATCH "re*" COUNT 100
```

### 3.3 经典模式：共同关注

```bash
# 用户关注集合
SADD follow:u1 u2 u3 u4
SADD follow:u2 u1 u4 u5

SINTER follow:u1 follow:u2       # 互相关注的人
SDIFF follow:u1 follow:u2        # u1 关注了但 u2 没关注（推荐候选）
```

### 3.4 陷阱与自检

- **SINTER/SUNION/SDIFF 全量计算**：百万成员的两个集合求交集是 O(N)
  级阻塞操作，线上大集合一律用 `*STORE` 版本落到一个临时键再慢慢读，
  或低峰执行。
- **Set 无序**：「按时间倒序的收藏列表」用 Set 做不了，需要 ZSet
  （成员 + 分数，见 redis/270-SkipListAndSortedSet）。
- **SMEMBERS 与 HGETALL 同罪**：大集合改用 SSCAN 分批。
- **intset 编码**：全整数且不超过 512 个成员时底层是紧凑的 intset，
  混入一个字符串就永久转成 hashtable（不回退），`OBJECT ENCODING` 可验证。

## 4. 怎么选：List / Set / ZSet / Stream

| 需求                                  | 选择   | 一句话理由                     |
| :------------------------------------ | :----- | :----------------------------- |
| 有序、可重复、两端进出                | List   | 队列/栈/最新动态               |
| 去重、判断「在不在」、交并差          | Set    | 标签、抽奖、共同关注           |
| 有序 + 每元素带权重                   | ZSet   | 排行榜、延时队列               |
| 多消费者、可靠投递、可回溯            | Stream | 真正的消息队列语义             |

## 5. 练习

1. 用 LPUSH + LTRIM 实现一个「最多保留 50 条」的操作日志键，写入 60 条
   后用 LLEN 和 LRANGE 验证长度恰好为 50。
2. 两个终端各起一个 redis-cli，一个执行 `BLPOP queue:demo 0`，另一个
   `LPUSH queue:demo hello`，观察阻塞态被唤醒的全过程。
3. 构造两组关注关系，用 SDIFF 找出「推荐关注」候选，再思考：数据量到
   千万级时这个命令有什么风险，你会怎么改。

## 6. 下一步

- 《基数统计》（redis/050-NumberStats）：只要数量不要明细时的去重计数；
- 《Redis Stream 核心篇》（redis/090-Stream）：把 List 队列升级为可靠消息流；
- 《跳跃表与有序集合》（redis/270-SkipListAndSortedSet）：给成员加上权重。
