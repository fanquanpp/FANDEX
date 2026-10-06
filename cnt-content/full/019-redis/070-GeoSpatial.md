---
order: 90
title: 地理空间
module: 'redis'
category: 数据库
difficulty: intermediate
description: "Redis GEO 深入：GEO 就是 ZSET 加 GeoHash 的底层真相、经纬度顺序与删除命令等高频坑、GEOSEARCH 的 3x3 邻域执行机制，附近门店/附近的人从建索引到查询的完整动手练习。"
author: fanquanpp
updated: '2026-10-05'
related:
  - 'redis/060-BitMapRedis'
  - 'redis/050-NumberStats'
  - 'redis/100-VectorSet'
  - 'redis/270-SkipListAndSortedSet'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 1. 学习目标与前置知识

前置：知道 ZSet（有序集合）是什么（[概述与核心数据结构](/redis/010-OverviewCoreDataStructure)）。

读完本文你将能够：

1. 说清 Redis GEO 的本质：它不是新数据结构，而是「GeoHash 编码 + ZSet」；
2. 用二分交错的直觉解释 GeoHash 为什么能让「地理上近的点编码值也近」；
3. 独立完成「附近门店」全套操作：建索引、按坐标查、按成员查、按距离取前 N、删除成员；
4. 避开四个高频坑：经纬度顺序、没有 GEODEL、GEOPOS 回读坐标的毫米级偏差、GEODIST 默认单位是米。

预计 30 到 50 分钟，含一组完整动手练习。

## 2. 场景：附近的人为什么不能全表算距离

「找 3 公里内的门店」朴素解法是把全表坐标拉出来，逐个算球面距离再排序——几百家门店还好，几百万用户位置时每次请求都 O(n) 乘法乘三角函数，数据库直接被打穿。

Redis GEO 的思路是一步降维：**把二维坐标编码成一个 52 位整数，地理上相近的点编码值也相近**。整数可以当 ZSet 的 score 排序，于是「找附近的点」变成 ZSet 最擅长的「按 score 范围取成员」——范围查询毫秒级返回。理解这一句，GEO 的所有命令行为都能推出来。

## 3. 底层真相：GEO 就是 ZSET + GeoHash

动手验证第一条——GEO 键的类型就是 zset：

```bash
GEOADD stores 116.3975 39.9087 "store:1"
TYPE stores                # zset
ZRANGE stores 0 -1 WITHSCORES
# 1) "store:1"
# 2) "4069885635619894"    （52 位 GeoHash 编码值的十进制形式）
```

### GeoHash 编码的直觉

编码分三步，每步都只需要「二分 + 交错」：

1. **经度二分**：区间 [-180, 180] 对半切，坐标落在左半记 0、右半记 1，重复若干位（如 116.3975 → 1101...）；
2. **纬度二分**：区间 [-85.05, 85.05] 同样对半切出一串比特（39.9087 → 1011...）；
3. **交错合并**：经度位占偶数位、纬度位占奇数位，拼成一条 52 位比特串，就是 ZSet 的 score。

交错是关键设计：单独看经度比特串，相邻比特只说明经度相近；交错后每往前多读一位，同时在缩小经纬度两个维度——相邻整数对应的小方格在地图上**物理相邻**，整条曲线蛇形铺满地球（空间填充曲线）。两个点的前缀重叠越多，方格越大、离得越近。

官方还提供 `GEOHASH` 命令直接查看成员的 Base32 编码串，同前缀的成员确实在地图上相邻，可以亲手验证：

```bash
GEOHASH stores "store:1"   # wx4g08（Base32 形式）
```

> 想再往深一步：ZSet 为什么范围查询快，见 [跳跃表与有序集合](/redis/270-SkipListAndSortedSet)。

## 4. 命令精讲

### 4.1 写入：GEOADD

```bash
GEOADD key longitude latitude member [longitude latitude member ...]

GEOADD stores 116.3975 39.9087 "store:1" 121.4737 31.2304 "store:2"
```

两个必须钉死的规则：

- **顺序是经度在前、纬度在后**（ lon lat ）。日常语言说「北纬 39.9、东经 116.4」，写代码时极易颠倒——见第 6 节坑 1 的实测。
- **经纬度有合法范围**：经度 -180 到 180，纬度 -85.05112878 到 85.05112878（Web Mercator 投影的表示边界，南极北极盖不住）。越界直接报错，这反而是排错的好线索。

对已存在的 member 再次 GEOADD 是**更新坐标**（返回 0），不是报错。

### 4.2 读坐标与距离：GEOPOS / GEODIST / GEOHASH

```bash
GEOPOS stores "store:1"                  # 回读坐标
GEODIST stores "store:1" "store:2" km    # 约 1068 km
GEOHASH stores "store:1"                 # Base32 编码串
```

- `GEOPOS` 返回的是**编码后解码的坐标**，与你写入的值有毫米级偏差——52 位编码的分辨率决定的正常现象，比较「用户上报坐标与库里坐标是否一致」时不要做字符串全等比较。
- `GEODIST` 不写单位时**默认是米**（m），可选 m / km / ft / mi；任一成员不存在返回 nil。球面距离按 Haversine 近似，不含海拔，城市级精度完全够用。

### 4.3 范围查询：GEOSEARCH（6.2+，当前唯一推荐）

```bash
# 以坐标为中心：查 (116.4, 39.9) 半径 3km 内，带距离，取最近 10 个
GEOSEARCH stores FROMLONLAT 116.4 39.9 BYRADIUS 3 km WITHDIST WITHCOORD COUNT 10 ASC

# 以成员为中心：查 store:1 附近 5km
GEOSEARCH stores FROMMEMBER "store:1" BYRADIUS 5 km WITHDIST

# 矩形范围：宽 10km 高 10km 的方框
GEOSEARCH stores FROMLONLAT 116.4 39.9 BYBOX 10 10 km WITHDIST

# 把结果落到另一个键（做缓存/二次加工）
GEOSEARCHSTORE stores:tmp stores FROMLONLAT 116.4 39.9 BYRADIUS 3 km
```

记法：`FROM...` 定圆心（坐标或成员），`BY...` 定形状（圆或矩形），修饰选项管「带什么、取几个、什么序」——`WITHDIST` 带距离、`WITHCOORD` 带坐标、`COUNT N ASC` 取最近 N 个。`COUNT` 后加 `ANY` 表示「凑够 N 个就返回，不保证是最近的 N 个」，用来省计算。

`GEORADIUS` 与 `GEORADIUSBYMEMBER` 是 6.2 之前的老命令，功能被 GEOSEARCH 完全覆盖，已标记废弃——老代码里见到要往 GEOSEARCH 迁移。

### 4.4 删除：没有 GEODEL，用 ZREM

这是官方文档原文级别的知识点：**GEO 没有 GEODEL 命令**，因为 GEO 就是 ZSet，删成员用 `ZREM`：

```bash
ZREM stores "store:2"
```

想在删除时顺手确认，可以 `TYPE` 键、`ZRANGE` 全量看成员——所有 ZSet 工具（含过期时间 EXPIRE、渐进遍历 ZSCAN）对 GEO 键全部适用。

## 5. 范围查询是怎么执行的

GEOSEARCH 的实现把两条线索拼起来：

1. 以圆心坐标算出目标区域覆盖的 GeoHash **3×3 相邻格**范围，换算成 score 区间，对 ZSet 做一次范围查询拉出候选（跳表范围查询，毫秒级）；
2. 对候选逐个算**精确** Haversine 距离，过滤掉格子里但在圆外的，再按距离排序/截断。

所以结果是精确的（不会因为格子的粗糙边界而漏掉或错报），代价只是候选集比命中集略大。这也是 `COUNT` 在大集合上值得带上：先截断候选，省掉排序成本。

## 6. 常见坑清单

1. **经纬度写反**。`GEOADD stores 39.9087 116.3975 "x"`——经度 39.9 合法，纬度 116.4 越界（上限 85.05），Redis 报 `invalid latitude`。错误信息帮你抓住写反；但若纬度恰好也在 ±180 内（如高纬度地区经纬互换都合法），数据会静默落错位置。团队约定：坐标一律走统一的封装函数。
2. **找 GEODEL**。不存在，用 ZREM（见 4.4）。
3. **把 GEODIST 返回值当千米**。默认单位是米，1067 那个数字是米级还是千米级，取决于你传没传 `km`。
4. **member 是 ZSet 成员**。同一个 member 只有一个坐标；「用户的家与公司」要拆成 `user:42:home`、`user:42:work` 或分键，不能同名共存。
5. **大集合上裸跑 GEOSEARCH**。千万级成员的键上不带 `COUNT` 会拉全量候选，务必带 `COUNT N ASC`。
6. **用 GEOPOS 回读值反写库**。毫米级偏差会被放大成「坐标不一致」的假告警，回读比较要容差。

## 7. 动手练习

先只看任务与提示，写完再展开参考实现。

**练习 1：门店搜索三连。**
建一个 `stores` 键放入 5 家门店（自选城市坐标，间距最好有近有远）；完成三个查询：按坐标搜 2km 内最近的 3 家（带距离）；按成员搜「store:1 附近 5km」；按矩形框搜。要求每个查询都能说出圆心、形状、排序分别由哪个子句控制。

**练习 2：揭开底裤验证「GEO 就是 ZSet」。**
依次执行 `TYPE stores`、`ZRANGE stores 0 -1 WITHSCORES`、`GEOHASH stores <member>`、`ZREM` 删除一家店后用 `GEOSEARCH` 验证它消失了。目标：向自己证明本文第 3 节不是空话——所有 ZSet 命令对 GEO 键可用。

**练习 3：坑 1 的现场重现。**
故意执行 `GEOADD stores 39.9087 116.3975 "wrong"`（北京坐标经纬互换），观察报错信息；再试一组「互换后两个值都合法」的坐标（先预测会怎样，再验证），把结论写进你的团队规范。

<details>
<summary>参考实现（先自己动手）</summary>

练习 1：

```bash
# 五家门店：北京城区自选坐标（经度在前）
GEOADD stores 116.3975 39.9087 "store:1" \
  116.4100 39.9150 "store:2" \
  116.3200 39.9800 "store:3" \
  116.4500 39.8500 "store:4" \
  121.4737 31.2304 "store:5"

# 按坐标搜：圆心 FROMLONLAT，形状 BYRADIUS，最近 3 家升序带距离
GEOSEARCH stores FROMLONLAT 116.4 39.9 BYRADIUS 2 km WITHDIST COUNT 3 ASC

# 按成员搜：圆心换成 FROMMEMBER
GEOSEARCH stores FROMMEMBER "store:1" BYRADIUS 5 km WITHDIST

# 矩形搜：BYBOX 宽 高 单位
GEOSEARCH stores FROMLONLAT 116.4 39.9 BYBOX 10 10 km WITHDIST
```

练习 2：

```bash
TYPE stores                        # zset
ZRANGE stores 0 -1 WITHSCORES      # 成员 + 52 位编码 score
GEOHASH stores "store:1"           # Base32 编码串
ZREM stores "store:3"              # 用 ZSet 命令删除
GEOSEARCH stores FROMLONLAT 116.4 39.9 BYRADIUS 50 km   # store:3 已不在结果中
```

练习 3：

```bash
GEOADD stores 39.9087 116.3975 "wrong"
# (error) ERR invalid latitude...  纬度越界直接报错

GEOADD stores 1.35 103.8 "sg-wrong"
# 经度 1.35 合法、纬度 103.8 越界 → 同样 invalid latitude
# 只有当两个值都落在 ±85.05 时互换才静默出错：
GEOADD stores 45.0 44.0 "trap"     # 合法但位置完全不对——这类错误没有报错保护
```

结论：报错只能保护纬度越界的情况，互换后双合法的坐标无任何提示，必须靠封装与 review。

</details>

## 8. 自我检查

- 能一句话说出 GEO 的本质（GeoHash 编码 + ZSet）并用 TYPE/ZRANGE 证明；
- 能用二分交错讲清「地理近则编码近」的原因；
- 能不看文档写出 GEOSEARCH 的圆心、形状、排序三类子句；
- 能说出四个坑的正确处理：经纬顺序、ZREM 删除、GEODIST 默认米、GEOPOS 毫米级偏差。

## 下一步

- [跳跃表与有序集合](/redis/270-SkipListAndSortedSet)：GEO 底座的完整原理；
- [Vector Set](/redis/100-VectorSet)：Redis 8 的新结构，按「语义相似」找近邻——GEO 找的是地理近，它找的是特征近，对比着记；
- [基数统计](/redis/050-NumberStats)：同样「换一种编码换一个数量级」的邻居。

## 官方文档

- 地理空间数据类型页：https://redis.io/docs/latest/develop/data-types/geospatial/
- GEOADD（含「没有 GEODEL」的说明与合法范围）：https://redis.io/docs/latest/commands/geoadd/
- GEOSEARCH（6.2 引入，取代 GEORADIUS）：https://redis.io/docs/latest/commands/geosearch/
