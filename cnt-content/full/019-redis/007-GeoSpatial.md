---
order: 70
title: 地理空间
module: 'redis'
category: 数据库
difficulty: intermediate
description: Redis地理空间GEO：基于Sorted Set的地理位置存储、距离计算与范围查询
author: fanquanpp
updated: '2026-09-08'
related:
  - 'redis/005-BitMapRedis'
  - 'redis/006-NumberStats'
  - 'redis/008-Stream'
  - 'redis/009-VectorSet'
prerequisites:
  - 'redis/001-OverviewCoreDataStructure'
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
## 基本操作

**单成员写法：添加单个地理位置**
`GEOADD <key> <longitude> <latitude> <member>`
```bash
# 添加天安门的位置
GEOADD locations 116.3975 39.9087 "天安门"
```

**多成员写法：添加多个地理位置**
`GEOADD <key> <longitude> <latitude> <member> [longitude latitude member ...]`
```bash
# 添加天安门和外滩的位置
GEOADD locations 116.3975 39.9087 "天安门" 121.4737 31.2304 "外滩"
```

**单成员写法：获取单个成员坐标**
`GEOPOS <key> <member>`
```bash
# 获取天安门的坐标
GEOPOS locations "天安门"
```

**多成员写法：获取多个成员坐标**
`GEOPOS <key> <member> [member ...]`
```bash
# 获取天安门和外滩的坐标
GEOPOS locations "天安门" "外滩"
```

**基本写法：计算两点距离**
`GEODIST <key> <member1> <member2> [unit]`
```bash
# 计算天安门到外滩的距离（单位km）
GEODIST locations "天安门" "外滩" km
```

---

## 范围查询

**基本写法：按经纬度半径查询附近地点**
`GEOSEARCH <key> FROMLONLAT <lon> <lat> BYRADIUS <radius> <unit> [WITHCOORD] [WITHDIST] [COUNT N] [ASC|DESC]`
```bash
# 查找坐标(116.4, 39.9)附近3公里内的地点，按距离升序返回前10个
GEOSEARCH locations FROMLONLAT 116.4 39.9 BYRADIUS 3 km WITHDIST WITHCOORD COUNT 10 ASC
```

**基本写法：按矩形范围查询**
`GEOSEARCH <key> FROMLONLAT <lon> <lat> BYBOX <width> <height> <unit> [WITHCOORD] [WITHDIST]`
```bash
# 查找矩形范围内的地点（宽10km高10km）
GEOSEARCH locations FROMLONLAT 116.4 39.9 BYBOX 10 10 km WITHDIST
```

**基本写法：以成员为中心查询附近地点**
`GEOSEARCH <key> FROMMEMBER <member> BYRADIUS <radius> <unit> [WITHDIST]`
```bash
# 查找天安门附近5公里内的地点
GEOSEARCH locations FROMMEMBER "天安门" BYRADIUS 5 km WITHDIST
```

**基本写法：旧版按经纬度半径查询**
`GEORADIUS <key> <longitude> <latitude> <radius> <unit> [WITHCOORD] [WITHDIST] [COUNT N]`
```bash
# 旧版范围查询（已废弃，建议使用GEOSEARCH）
GEORADIUS locations 116.4 39.9 3 km WITHCOORD WITHDIST COUNT 10
```

---

## 应用场景

**基本写法：添加用户位置**
`GEOADD <nearby_key> <lon> <lat> <member>`
```bash
# 添加用户42的位置
GEOADD nearby:users 116.4 39.9 "user:42"
```

**基本写法：查找附近用户**
`GEOSEARCH <nearby_key> FROMMEMBER <member> BYRADIUS <radius> <unit> [COUNT N]`
```bash
# 查找用户42附近1km内的用户，最多返回20个
GEOSEARCH nearby:users FROMMEMBER "user:42" BYRADIUS 1 km COUNT 20
```

**多成员写法：添加多个门店位置**
`GEOADD <stores_key> <longitude> <latitude> <member> [longitude latitude member ...]`
```bash
# 添加门店1和门店2的位置
GEOADD stores 116.397 39.908 "store:1" 116.401 39.912 "store:2"
```

**基本写法：查找附近门店按距离升序**
`GEOSEARCH <stores_key> FROMLONLAT <lon> <lat> BYRADIUS <radius> <unit> [WITHDIST] [ASC]`
```bash
# 查找坐标(116.4, 39.9)附近2km内门店，按距离升序
GEOSEARCH stores FROMLONLAT 116.4 39.9 BYRADIUS 2 km WITHDIST ASC
```
