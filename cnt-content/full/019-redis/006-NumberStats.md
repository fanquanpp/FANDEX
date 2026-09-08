---
order: 60
title: 基数统计
module: 'redis'
category: 数据库
difficulty: intermediate
description: Redis基数统计HyperLogLog：去重计数、UV统计、误差控制与内存优化
author: fanquanpp
updated: '2026-09-08'
related:
  - 'redis/005-BitMapRedis'
  - 'redis/007-GeoSpatial'
  - 'redis/008-Stream'
prerequisites:
  - 'redis/001-OverviewCoreDataStructure'
---

## 1. HyperLogLog 概述

HyperLogLog（HLL）是基数估计算法，用极小内存（12KB）估算集合中不同元素的数量，标准误差约 0.81%。

## 2. 基本操作

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

## 3. 误差与内存

| 特性   | HyperLogLog     | SET          |
| ------ | --------------- | ------------ |
| 内存   | 12KB            | 随元素数增长 |
| 精度   | 约0.81%标准误差 | 精确         |
| 百万UV | 12KB            | 约10MB       |
| 亿级UV | 12KB            | 约1GB        |

## 4. 应用场景

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
