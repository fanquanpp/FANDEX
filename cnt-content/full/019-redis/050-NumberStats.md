---
order: 50
title: 基数统计
module: 'redis'
category: 数据库
difficulty: intermediate
description: Redis 计数统计：INCR 精确计数器与 HyperLogLog 基数估算的选择、去重计数、UV 统计、误差控制与内存优化
author: fanquanpp
updated: '2026-09-28'
related:
  - 'redis/060-BitMapRedis'
  - 'redis/070-GeoSpatial'
  - 'redis/090-Stream'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 2. 先分清：精确计数与估算计数

「计数」在 Redis 里有两套工具，选错会白费内存或引入不可接受的误差：

| 工具       | 命令            | 精度 | 内存           | 能否取出明细 |
| :--------- | :-------------- | :--- | :------------- | :----------- |
| 字符串计数 | INCR / INCRBY   | 精确 | O(1)，几十字节 | 不能（只有总数） |
| 位图       | SETBIT/BITCOUNT | 精确 | 按最大编号     | 能（按位还原） |
| HyperLogLog| PFADD / PFCOUNT | 估算 | 固定 12KB      | 不能         |

精确计数（INCR 家族）是各种计数器、限流器、库存的底座：

```bash
SET counter 100
INCR counter            # 101（原子自增，并发安全）
INCRBY counter 10       # 111
DECRBY counter 5        # 106
INCRBYFLOAT counter 2.5 # 108.5（浮点）
```

`INCR key` 在键不存在时自动从 0 开始，所以「首次访问 +1」不需要先
GET 判断——这正是限流器 `INCR + EXPIRE` 的基础。误差零，代价是每个
计数器一个键：上亿个不同 ID 各自计数时改用 HLL（下文）。

## 3. HyperLogLog 概述

HyperLogLog（HLL）是基数估计算法，用极小内存（12KB）估算集合中不同元素的数量，标准误差约 0.81%。

## 4. 基本操作

```redis
PFADD key element [element ...]  -- 添加元素
PFCOUNT key [key ...]            -- 获取基数估算
PFMERGE destkey sourcekey [...]  -- 合并多个HLL
```

```redis
-- 添加UV
PFADD uv:2026-06-14 user1 user2 user3 user1 user2
-- 重复元素自动去重

-- 获取UV数
PFCOUNT uv:2026-06-14  -- 返回3

-- 合并多天UV
PFMERGE uv:2026-week uv:2026-06-08 uv:2026-06-09 ... uv:2026-06-14
PFCOUNT uv:2026-week
```

## 5. 误差与内存

| 特性   | HyperLogLog     | SET          |
| ------ | --------------- | ------------ |
| 内存   | 12KB            | 随元素数增长 |
| 精度   | 约0.81%标准误差 | 精确         |
| 百万UV | 12KB            | 数十MB       |
| 亿级UV | 12KB            | 数GB         |

数量级感受：Set 每个成员要付「哈希表条目 + 字符串对象」的存储成本，
百万级短 ID 实测通常在几十 MB 量级（可用 `MEMORY USAGE key` 验证）；
而 HLL 无论 1 万还是 1 亿个元素都固定约 12KB——代价是只能问「大约多少个」，
不能列出成员、也不能判断某个元素是否加入过。

## 6. 应用场景

```redis
-- 网站UV统计
PFADD site:uv:2026-06-14 <user_id>

-- 页面UV
PFADD page:uv:article:123:2026-06-14 <user_id>

-- 搜索关键词UV
PFADD search:uv:keyword:redis:2026-06-14 <user_id>

-- 周活跃用户
PFMERGE wau:2026-w24 dau:2026-06-09 dau:2026-06-10 ... dau:2026-06-15
PFCOUNT wau:2026-w24
```
## 基本操作

**单元素写法：添加单个元素到 HyperLogLog**
`PFADD <key> <element>`
```bash
# 添加单个用户到UV统计
PFADD uv:2026-06-14 user1
```

**多元素写法：添加多个元素到 HyperLogLog**
`PFADD <key> <element> [element ...]`
```bash
# 添加多个用户，重复元素自动去重
PFADD uv:2026-06-14 user1 user2 user3 user1 user2
```

**基本写法：获取基数估算值**
`PFCOUNT <key>`
```bash
# 获取单天的UV数
PFCOUNT uv:2026-06-14
```

**多键写法：获取多个键的合并基数**
`PFCOUNT <key> [key ...]`
```bash
# 获取多天合并后的UV数
PFCOUNT uv:2026-06-13 uv:2026-06-14
```

**基本写法：合并多个 HyperLogLog**
`PFMERGE <destkey> <sourcekey> [sourcekey ...]`
```bash
# 合并多天UV到周UV
PFMERGE uv:2026-week uv:2026-06-08 uv:2026-06-09 uv:2026-06-10
```

---

## 应用场景

**基本写法：统计网站独立访客**
`PFADD <site_uv_key> <user_id>`
```bash
# 网站UV统计
PFADD site:uv:2026-06-14 user42
```

**基本写法：统计页面独立访客**
`PFADD <page_uv_key> <user_id>`
```bash
# 页面UV统计
PFADD page:uv:article:123:2026-06-14 user42
```

**基本写法：统计搜索关键词独立用户数**
`PFADD <search_uv_key> <user_id>`
```bash
# 搜索关键词UV统计
PFADD search:uv:keyword:redis:2026-06-14 user42
```

**换行写法：合并每日活跃用户计算周活跃**
`PFMERGE <wau_key> <dau_key> [dau_key ...]`
```bash
# 合并每日活跃用户数据计算周活跃用户
PFMERGE wau:2026-w24 dau:2026-06-09 dau:2026-06-10 dau:2026-06-11
```

**基本写法：获取周活跃用户数**
`PFCOUNT <wau_key>`
```bash
# 获取第24周的活跃用户数
PFCOUNT wau:2026-w24
```
