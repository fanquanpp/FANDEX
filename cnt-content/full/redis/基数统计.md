---
order: 51
title: 基数统计
module: redis
category: Redis
difficulty: intermediate
description: Redis基数统计HyperLogLog：去重计数、UV统计、误差控制与内存优化
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/语法速查
  - redis/位图
  - redis/地理空间
  - redis/流
prerequisites:
  - redis/概述与核心数据结构
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
