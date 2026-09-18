---
order: 310
title: 地理空间对象：PostGIS 入门与空间查询
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostGIS 从零上手：几何类型与坐标系（SRID）心智模型、GiST 空间索引、距离/范围/包含三类空间查询、geography 与 geometry 的取舍与面积计算陷阱。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'postgresql/220-IndexType'
  - 'postgresql/300-FullTextSearch'
  - 'postgresql/330-ExtensionModule'
  - 'postgresql/320-KNNVectorIndex'
prerequisites:
  - 'postgresql/220-IndexType'
  - 'postgresql/330-ExtensionModule'
---

## 前置知识

- PostgreSQL 扩展机制（[扩展模块](/postgresql/330-ExtensionModule)）——PostGIS 是最著名的扩展之一；
- GiST 索引的概念（[索引类型](/postgresql/220-IndexType)）——空间索引的载体。

## 问题引入：B 树为什么做不了"附近三公里"

"找出离用户 3 公里内的门店"——这个需求在普通索引上无解：B+ 树只能对**一维有序值**做范围定位，而地理位置是二维（经纬度），"距离"在两个维度上联合定义。硬用经度索引 + 纬度索引各查一遍再交集，数据量大时性能惨不忍睹。

**PostGIS** 是 PostgreSQL 的空间扩展（实现了 OGC 简单要素规范），补齐三块能力：几何数据类型、空间索引（多维）、空间函数（距离/相交/包含等几百个）。它让 PostgreSQL 成为世界上最流行的开源空间数据库，也是"PostgreSQL 什么都能干"传说的重要支柱。

## 第一步：安装与核心概念

```sql
CREATE EXTENSION postgis;
SELECT PostGIS_Version();

-- 建一张带空间列的表
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  geom GEOMETRY(Point, 4326)   -- 点类型，坐标系 SRID=4326
);
```

`GEOMETRY(Point, 4326)` 里的两个词都要懂：

- **Point/LineString/Polygon**：几何形状——点（门店）、线（道路）、多边形（商圈）；
- **SRID 4326**：坐标系编号。4326 是 GPS 用的经纬度坐标系（WGS84），最通用；3857 是网页地图（Google/高马）的 Web Mercator 平面米制坐标系。**空间列必须声明坐标系，混用坐标系做计算是空间数据第一大坑**。

## 第二武器：空间索引（GiST）

```sql
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);
```

GiST 把二维平面递归划分成嵌套矩形（R-Tree 思想）：查"某点附近"时，先按矩形框排除绝大部分数据，再对候选者精确计算——把 O(N) 的全表距离计算变成对数级的框定位。**没有 GiST 索引的空间查询在十万行以上就不可用**，建表后立即建索引是空间表的标准动作。

## 三类高频空间查询

以"北京天安门坐标 (116.397, 39.909)"为参照点：

```sql
-- 1. 距离排序：最近的 10 家店
SELECT name,
       ST_Distance(geom::geography,
                   ST_SetSRID(ST_MakePoint(116.397, 39.909), 4326)::geography
       ) AS dist_m
FROM locations
ORDER BY dist_m
LIMIT 10;

-- 2. 范围过滤：3 公里内（配合索引才能高效）
SELECT name
FROM locations
WHERE ST_DWithin(geom::geography,
                 ST_SetSRID(ST_MakePoint(116.397, 39.909), 4326)::geography,
                 3000);   -- 单位：米

-- 3. 包含/相交：某个多边形区域内的点、与矩形相交的地块
SELECT * FROM regions
WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(116.397, 39.909), 4326));

SELECT * FROM parcels
WHERE ST_Intersects(geom, ST_MakeEnvelope(116.3, 39.8, 116.5, 40.0, 4326));
```

注意函数族的语义分工：`ST_Distance/ST_DWithin` 管"多远"，`ST_Contains/ST_Within` 管"在不在里面"（一方完整包含另一方），`ST_Intersects` 管"碰没碰到"（哪怕只擦边）。**包含与相交的区别**：相交是真包含的超集——擦边的也算相交，不算包含。

## geometry 还是 geography：单位陷阱

同一个点列可以有两种存法，这是 PostGIS 新手最大的坑：

| | geometry（几何） | geography（地理） |
| --- | --- | --- |
| 计算模型 | 平面坐标（笛卡尔） | 地球椭球面（测地线） |
| ST_Distance 返回 | 坐标单位（4326 下是"度"！） | 米 |
| 性能 | 快，函数全支持 | 慢数倍，函数子集 |
| 适用 | 已投影的米制数据（3857/局部坐标系） | 直接存经纬度且要真实米距 |

上面查询里 `geom::geography` 的转换正是为此：4326 的 geometry 算距离出来的是"度"（1 度约 111 公里，而且随纬度变化），**没有业务意义**；转成 geography 后返回真实的米。数据量大的生产系统常用替代方案：存 geometry(3857) 或按区域选 UTM 投影坐标系，全程平面计算，又快单位又对：

```sql
-- 面积计算同理：4326 的"平方度"没意义，必须转投影坐标系
SELECT ST_Area(ST_Transform(geom, 32650)) AS area_sqm FROM parcels;
-- 32650 = UTM 50N，适合中国中东部；ST_Transform 负责坐标系转换
```

## 动手环节：十分钟跑通"附近的人"

```sql
-- 1. 建表 + 建空间索引
CREATE TABLE poi (
  id SERIAL PRIMARY KEY,
  name TEXT,
  geom GEOMETRY(Point, 4326)
);
CREATE INDEX idx_poi_geom ON poi USING GIST (geom);

-- 2. 插入北京若干地标
INSERT INTO poi (name, geom) VALUES
  ('天安门',    ST_SetSRID(ST_MakePoint(116.3975, 39.9087), 4326)),
  ('故宫',      ST_SetSRID(ST_MakePoint(116.3972, 39.9169), 4326)),
  ('西单',      ST_SetSRID(ST_MakePoint(116.3740, 39.9069), 4326)),
  ('北京站',    ST_SetSRID(ST_MakePoint(116.4270, 39.9031), 4326)),
  ('颐和园',    ST_SetSRID(ST_MakePoint(116.2750, 39.9998), 4326));

-- 3. 单位陷阱亲测：geometry 直接算距离返回"度"
SELECT name, ST_Distance(geom,
  ST_SetSRID(ST_MakePoint(116.3975, 39.9087), 4326)) AS deg
FROM poi ORDER BY deg LIMIT 3;
-- 0.000x 级别的小数——毫无业务意义

-- 4. 转 geography 后返回米
SELECT name,
       ST_Distance(geom::geography,
         ST_SetSRID(ST_MakePoint(116.3975, 39.9087), 4326)::geography) AS meters
FROM poi ORDER BY meters LIMIT 3;
-- 天安门 0 米、故宫约 917 米、西单约 1980 米——真实世界距离

-- 5. 范围查询：2 公里内
SELECT name FROM poi
WHERE ST_DWithin(geom::geography,
  ST_SetSRID(ST_MakePoint(116.3975, 39.9087), 4326)::geography, 2000);
```

再补一个索引有效性的验证：`EXPLAIN` 第 4 步查询，确认计划里出现 `Index Scan using idx_poi_geom`——空间索引缺席时这里会退化为全表扫描。

## 常见困惑

**"PostGIS 装不上怎么办？"**——它是独立编译的扩展包：Debian/Ubuntu 装 `postgresql-17-postgis-3`，Docker 直接用 `postgis/postgis` 官方镜像，Windows 用 Stack Builder。云数据库（RDS）大多提供一键启用。

**"经纬度的顺序是 (经度, 纬度) 还是反的？"**——PostGIS 规范是 **(经度 X, 纬度 Y)**，即 `(116.39, 39.90)`。写反了不会报错，但点会跑到"印度洋"——导入外部数据后先 `SELECT ST_X(geom), ST_Y(geom)` 抽查坐标范围（中国经度约 73-135，纬度约 18-54）。

**"和 MongoDB 的 2dsphere 比呢？"**——简单 LBS 场景 MongoDB 够用；PostGIS 的优势在完整空间分析（路径、缓冲区、拓扑、栅格）与 SQL 生态的联表能力。技术选型看空间需求的复杂度，不必站队。

## 检验清单

- 能解释"为什么 B+ 树做不了附近搜索"与 GiST 的矩形划分思想；
- 理解 SRID 的意义，能说出 4326 与 3857 的区别；
- 亲测过 geometry 距离返回"度"的单位陷阱，知道 geography/投影坐标系两种解法；
- 会区分 ST_Distance/ST_DWithin/ST_Contains/ST_Intersects 四个函数的语义；
- 建空间表后条件反射地建 GiST 索引。

## 下一步

空间搜索是"位置相似"，[KNN 向量索引](/postgresql/320-KNNVectorIndex)则是"语义相似"——pgvector 用同样的"近似换速度"思想支撑 AI 应用的相似度检索。
