---
order: 50
title: 位图
module: redis
category: Redis
difficulty: intermediate
description: Redis位图Bitmap：位操作、统计、用户标签、在线状态与布隆过滤器
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/缓存策略与高级特性
  - redis/语法速查
  - redis/基数统计
  - redis/地理空间
prerequisites:
  - redis/概述与核心数据结构
---

## 1. 位图概述

位图（Bitmap）不是独立数据类型，而是基于 String 类型的位操作，每个 String 键最多存储 $2^{32}$ 个位。

## 2. 基本操作

```redis
SETBIT key offset value    -- 设置指定位
GETBIT key offset          -- 获取指定位
BITCOUNT key [start end]   -- 统计1的个数
BITPOS key bit [start end] -- 查找第一个0/1的位置
BITOP op destkey key [key ...] -- 位运算
```

```redis
-- 设置用户42在第100天登录
SETBIT user:login:2026 42 1

-- 检查用户42是否在第100天登录
GETBIT user:login:2026 42  -- 返回1

-- 统计2026年登录用户数
BITCOUNT user:login:2026
```

## 3. 应用场景

### 3.1 用户在线状态

```redis
-- 用户上线
SETBIT online:users 42 1
-- 用户下线
SETBIT online:users 42 0
-- 检查在线
GETBIT online:users 42
-- 在线人数
BITCOUNT online:users
```

### 3.2 用户标签

```redis
-- 用户42有标签0和标签3
SETBIT user:42:tags 0 1
SETBIT user:42:tags 3 1
-- 统计标签数
BITCOUNT user:42:tags
```

### 3.3 活跃用户统计

```redis
-- 每日活跃用户位图
SETBIT dau:2026-06-14 42 1

-- 计算月活跃用户（OR运算）
BITOP OR mau:2026-06 dau:2026-06-01 dau:2026-06-02 ... dau:2026-06-30
BITCOUNT mau:2026-06
```

## 4. 位运算

```redis
-- AND：交集
BITOP AND result key1 key2
-- OR：并集
BITOP OR result key1 key2
-- XOR：异或
BITOP XOR result key1 key2
-- NOT：取反
BITOP NOT result key1
```
