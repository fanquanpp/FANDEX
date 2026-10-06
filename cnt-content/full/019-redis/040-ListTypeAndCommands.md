---
order: 50
title: List 类型与列表命令
description: 列表当队列/栈用（LPUSH/RPOP/BLPOP/LMOVE/LTRIM）的完整用法、定长 Feed 与可靠消费雏形，附阻塞读陷阱与跨结构选型
module: 'redis'
category: 数据库
difficulty: beginner
author: fanquanpp
updated: '2026-10-07'
related:
  - 'redis/042-SetTypeAndSetOperations'
  - 'redis/030-HashCommand'
  - 'redis/050-NumberStats'
  - 'redis/090-Stream'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 知识点地图

- **知识类别**：List（列表）数据类型的命令实操——双端进出、阻塞弹出、原子搬运与裁剪。
- **解决什么问题**：任务队列、最新动态这两类最高频的后端结构怎么用 List 搭；以及「什么时候 List 该升级到 Stream/ZSet」的选型判断（文末选型表同时覆盖 Set/Stream 的去向）。
- **什么时候用到**：投稿/工单/消息的排队处理；Feed 流裁剪；需要同端进出的栈结构。

前置：会用 redis-cli 执行 SET/GET（见《概述与核心数据结构》）。Set 的成员运算见《Set 类型与集合运算》（redis/042-SetTypeAndSetOperations）。

## 1. 学习目标与前置知识

- 前置：会用 redis-cli 执行 SET/GET（见《概述与核心数据结构》）。
- 学完本篇你将能：
  1. 用 List 搭出「任务队列」「最新动态」两类最常见结构；
  2. 用 LMOVE 搭出带重试队列的消费流程，说清它离「可靠队列」还差什么；
  3. 知道什么时候 List 该升级成 Stream（本文第 4 节选型表）。

一个真实场景贯穿本篇：你在给一个内容社区做后端，需要「发布队列」
（后台慢慢处理投稿，削峰填谷）。

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

### 2.2.1 补充命令：LMOVE 与 LPOS（Redis 6.2+）

```bash
# LMOVE：原子地把元素从一个列表搬到另一个列表（可分别指定两端）
LMOVE queue:pending queue:processing LEFT RIGHT
# 从 pending 左端取出、塞进 processing 右端，一条命令完成

# 老写法 RPOPLPUSH src dst（等价于 LMOVE src dst RIGHT LEFT）已废弃，新代码统一用 LMOVE
# 消费重试队列的固定套路：
# 取任务：LMOVE queue:pending queue:processing LEFT RIGHT
# 成功：LREM queue:processing 1 <task>
# 失败：LMOVE queue:processing queue:retry RIGHT LEFT   ← 放回重试队列
```

LMOVE 的价值在于把「取出 + 放入」合成一条原子命令：消费者崩溃时任务留在 processing 列表里可被巡检脚本回收，这正是「可靠队列」的 List 版雏形（完整可靠语义仍请上 Stream，见文末选型表）。

```bash
# LPOS：在列表中查找元素的索引位置（6.2+），支持从指定 RANK 开始找第 N 个匹配
LPOS queue:tasks "task1"                 # 第一次出现的位置；不存在返回 nil
LPOS queue:tasks "task1" RANK -1         # 从尾部开始找
LPOS queue:tasks "task1" COUNT 0         # 0 = 返回所有匹配位置的数组
```

LPOS 是 O(N) 顺序扫描，百万级列表上慎用；典型用途是小队列里定位任务、配合 LSET 做定点修改。

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

## 3. 怎么选：List / Set / ZSet / Stream

| 需求                                  | 选择   | 一句话理由                     |
| :------------------------------------ | :----- | :----------------------------- |
| 有序、可重复、两端进出                | List   | 队列/栈/最新动态               |
| 去重、判断「在不在」、交并差          | Set    | 标签、抽奖、共同关注（见 redis/042） |
| 有序 + 每元素带权重                   | ZSet   | 排行榜、延时队列               |
| 多消费者、可靠投递、可回溯            | Stream | 真正的消息队列语义             |

List 与 Set 的边界一句话：**关心顺序用 List，关心「在不在」与关系运算用 Set**。Set 的完整命令与集合运算见《Set 类型与集合运算》（redis/042-SetTypeAndSetOperations）。

## 4. 动手实践

任务一：用 LPUSH + LTRIM 实现一个「最多保留 50 条」的操作日志键，写入 60 条
后用 LLEN 和 LRANGE 验证长度恰好为 50。

提示：LPUSH 从左插入，LTRIM 保留 `0 49`；想想为什么先 LPUSH 再 LTRIM
而不是反过来。

<details>
<summary>任务一参考实现</summary>

```bash
for i in $(seq 1 60); do
  LPUSH ops:log "entry-$i"
  LTRIM ops:log 0 49
done
LLEN ops:log        # (integer) 50
LRANGE ops:log 0 -1 # entry-60 ... entry-11，最早 10 条已被剪掉
```

两条命令要紧挨着执行：只 LPUSH 不 LTRIM 会让键无界增长；把 LTRIM 放在
别的定时任务里则峰值内存不可控。「写入即裁剪」是定长结构的固定套路。
</details>

任务二：两个终端各起一个 redis-cli，一个执行 `BLPOP queue:demo 0`，另一个
`LPUSH queue:demo hello`，观察阻塞态被唤醒的全过程。

提示：注意观察阻塞端是「立刻醒来」还是「等到下一个 hz 周期」；再给
`BLPOP` 换成 timeout 5 试试超时返回 nil 的行为。

<details>
<summary>任务二参考观察</summary>

阻塞端在另一终端 LPUSH 的同一毫秒内被唤醒并直接拿到元素（Redis 对阻塞
客户端做的是即时唤醒，不是轮询）。timeout 5 时队列一直为空，5 秒后返回
`(nil)`，连接恢复可用。自检点：把消费端写成 `RPOP` 轮询 + `sleep 0.1`，
对比两种实现空队列时的请求量差异——这正是 BLPOP 存在的意义。
</details>

任务三：给 2.2.1 节的「取任务-处理-成功删除/失败回退」流程补上消费者
崩溃后的巡检：写一段脚本定期检查 `queue:processing` 里滞留超过 10 分钟
的任务并搬回 `queue:pending`。

提示：用 LRANGE 取出 processing 全部元素 + LREM 逐个搬移，或者想想
LMOVE 能不能反过来用。

<details>
<summary>任务三参考实现</summary>

```bash
# 巡检脚本（伪代码）：每分钟执行
while true; do
  tasks=$(LRANGE queue:processing 0 -1)
  for t in $tasks; do
    if [ $(stat -c %Y "$t") -lt $(( $(date +%s) - 600 )) ]; then
      LREM queue:processing 1 "$t"
      LPUSH queue:pending "$t"
    fi
  done
  sleep 60
done
```

注意这段伪代码的漏洞：巡检与消费者并发时可能出现「任务刚取出就被巡检
搬回」的竞态——工程上要么给任务打时间戳字段判断，要么直接上 Stream
（redis/090-Stream）用 PEL（pending 列表）+ XAUTOCLAIM 拿到现成的
认领机制。这正是 List 队列的能力边界。
</details>

## 5. 下一步

- 《Set 类型与集合运算》（redis/042-SetTypeAndSetOperations）：去重与关系运算的另一类结构；
- 《基数统计》（redis/050-NumberStats）：只要数量不要明细时的去重计数；
- 《Redis Stream 核心篇》（redis/090-Stream）：把 List 队列升级为可靠消息流；
- 《跳跃表与有序集合》（redis/270-SkipListAndSortedSet）：给成员加上权重。
