---
order: 52
title: 地理空间
module: redis
category: Redis
difficulty: intermediate
description: 'Redis地理空间GEO：基于Sorted Set的地理位置存储、距离计算与范围查询'
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/位图
  - redis/基数统计
  - redis/流
  - redis/向量集
prerequisites:
  - redis/概述与核心数据结构
---

## 1. GEO 概述

Redis GEO 基于 Sorted Set 实现，使用 GeoHash 编码经纬度，支持地理位置存储和查询。

## 2. 基本操作

```redis
GEOADD key longitude latitude member [longitude latitude member ...]
GEOPOS key member [member ...]
GEODIST key member1 member2 [unit]
GEORADIUS key longitude latitude radius unit [WITHCOORD] [WITHDIST] [COUNT N]
GEOSEARCH key [FROMMEMBER member] [FROMLONLAT lon lat] [BYRADIUS radius unit | BYBOX width height unit] [WITHCOORD] [WITHDIST] [COUNT N] [ASC|DESC]
```

```redis
-- 添加地点
GEOADD locations 116.3975 39.9087 "天安门" 121.4737 31.2304 "外滩"

-- 获取坐标
GEOPOS locations "天安门"

-- 计算距离
GEODIST locations "天安门" "外滩" km  -- 约1067km
```

## 3. 范围查询

```redis
-- 查找3公里内的地点
GEOSEARCH locations FROMLONLAT 116.4 39.9 BYRADIUS 3 km WITHDIST WITHCOORD COUNT 10 ASC

-- 查找矩形范围内的地点
GEOSEARCH locations FROMLONLAT 116.4 39.9 BYBOX 10 10 km WITHDIST

-- 查找某地点附近的地点
GEOSEARCH locations FROMMEMBER "天安门" BYRADIUS 5 km WITHDIST
```

## 4. 底层原理

```
GEO 基于 ZSET：
- member：地点名称
- score：GeoHash 编码值（52位整数）

GeoHash 编码：
经纬度 → 交替二进制 → 52位整数 → ZSET score
```

## 5. 应用场景

```redis
-- 附近的人
GEOADD nearby:users 116.4 39.9 "user:42"
GEOSEARCH nearby:users FROMMEMBER "user:42" BYRADIUS 1 km COUNT 20

-- 门店搜索
GEOADD stores 116.397 39.908 "store:1" 116.401 39.912 "store:2"
GEOSEARCH stores FROMLONLAT 116.4 39.9 BYRADIUS 2 km WITHDIST ASC
```
