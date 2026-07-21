---
order: 66
title: 地理空间对象
module: postgresql
category: PostgreSQL
difficulty: advanced
description: PostgreSQL地理空间对象：PostGIS扩展、几何类型、空间索引与空间查询
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/JSON表格函数
  - postgresql/全文检索
  - postgresql/存储过程与函数
  - postgresql/触发器与事件触发器
prerequisites:
  - postgresql/概述与安装配置
---

## 1. PostGIS 概述

PostGIS 是 PostgreSQL 的空间数据库扩展，支持 OGC 简单要素规范。

```sql
-- 安装扩展
CREATE EXTENSION postgis;

-- 查看版本
SELECT PostGIS_Version();
```

## 2. 几何类型

```sql
-- 点
SELECT ST_MakePoint(116.3975, 39.9087);

-- 线
SELECT ST_MakeLine(ST_MakePoint(0,0), ST_MakePoint(1,1));

-- 多边形
SELECT ST_MakePolygon(ST_MakeLine(ARRAY[
    ST_MakePoint(0,0), ST_MakePoint(1,0),
    ST_MakePoint(1,1), ST_MakePoint(0,0)
]));

-- 创建空间列
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    geom GEOMETRY(Point, 4326)
);
```

## 3. 空间索引

```sql
-- GiST 空间索引
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);

-- SP-GiST 索引
CREATE INDEX idx_locations_geom_spgist ON locations USING SPGIST (geom);
```

## 4. 空间查询

```sql
-- 距离查询
SELECT name, ST_Distance(geom::geography,
    ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326)::geography) AS dist
FROM locations
ORDER BY dist LIMIT 10;

-- 范围查询
SELECT * FROM locations
WHERE ST_DWithin(geom::geography,
    ST_SetSRID(ST_MakePoint(116.4, 39.9), 4326)::geography, 3000);

-- 包含查询
SELECT * FROM regions
WHERE ST_Contains(boundary, ST_MakePoint(116.4, 39.9));

-- 相交查询
SELECT * FROM parcels
WHERE ST_Intersects(geom, ST_MakeEnvelope(116.3, 39.8, 116.5, 40.0, 4326));
```

## 5. 坐标系转换

```sql
-- WGS84 (4326) → Web Mercator (3857)
SELECT ST_Transform(geom, 3857) FROM locations;

-- 计算面积（需要投影坐标系）
SELECT ST_Area(ST_Transform(geom, 32650)) AS area_sqm FROM parcels;
```
