---
order: 60
title: 位图
module: 'redis'
category: 数据库
difficulty: intermediate
description: Redis 位图 Bitmap：SETBIT/BITCOUNT/BITFIELD 位级统计、签到与活跃用户场景、内存估算与稀疏位图陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'redis/110-CacheStrategyAdvancedFeature'
  - 'redis/050-NumberStats'
  - 'redis/120-CachePenetrationBreakdownAvalanche'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 1. 位图概述

位图（Bitmap）不是独立数据类型，而是基于 String 类型的位操作，每个 String 键最多存储 $2^{32}$ 个位（约 512MB）。

类比：一排开关，每个开关只有开/关两种状态，位图用 1 个 bit 记一个开关——「用户 42 今天登录过」就是拨亮第 42 号开关。1 亿用户的「是否活跃」只需要约 12MB，这是它相对 Set 的核心优势（Set 存 1 亿个整数成员约需数 GB）。

适用判断：**被记录的对象能用小整数编号表示、且答案是「是/否」二值**时优先位图；编号稀疏巨大（如雪花 ID 直接过 offset）则先映射成自增序号。

## 2. 基本操作

```redis
SETBIT key offset value    -- 设置指定位（offset 从 0 开始）
GETBIT key offset          -- 获取指定位
BITCOUNT key [start end]   -- 统计1的个数
BITPOS key bit [start end] -- 查找第一个0/1的位置
BITOP op destkey key [key ...] -- 位运算
```

```bash
# 完整会话（redis-cli 实际输出）
127.0.0.1:6379> SETBIT user:login:2026 42 1
(integer) 0                      # 返回该位【之前】的值（0=原来没登录过）
127.0.0.1:6379> SETBIT user:login:2026 42 1
(integer) 1                      # 再次设置，返回旧值 1
127.0.0.1:6379> GETBIT user:login:2026 42
(integer) 1
127.0.0.1:6379> SETBIT user:login:2026 7 1
127.0.0.1:6379> BITCOUNT user:login:2026
(integer) 2                      # 两个用户登录过
127.0.0.1:6379> BITPOS user:login:2026 1
(integer) 7                      # 最早登录的是 7 号用户
```

注意 `SETBIT` 的返回值是「旧值」，可以用来判断「首次登录」（返回 0 且
业务需要时发奖励），这是很多实现忽略的细节。

## 3. BITFIELD：把位段当整数读

位图的位本身没有类型，BITFIELD 允许按有/无符号整数切片读取，
是「连续签到天数」类需求的标配：

```bash
# 假设 sign:u42 记录 6 月每日签到（第 i 位 = 第 i+1 天）
SETBIT sign:u42 0 1   # 6月1日
SETBIT sign:u42 1 1   # 6月2日
SETBIT sign:u42 2 1   # 6月3日

# 无符号读取（u 后跟位数）：从第 0 位取 31 位看成一个 u31 整数
BITFIELD sign:u42 GET u31 0
# 返回: 1) (integer) 7        ← 二进制 111，低 3 位连续为 1

# 一次执行多个子命令
BITFIELD sign:u42 GET u8 0 INCRBY u8 3 1 OVERFLOW SAT
# INCRBY 对位段做无符号自增；OVERFLOW SAT 溢出饱和不回绕
#（默认 WRAP 回绕、可选 FAIL 溢出时返回 nil）

# 只读版 BITFIELD_RO（不占写缓冲，Redis 6.0+）
BITFIELD_RO sign:u42 GET u31 0
```

连续天数计算技巧：取出的整数 `n`，循环 `n & 1` 统计低位连续 1 的个数
（或预生成 0~2^31 的查表），无须逐位 GETBIT 网络往返。

## 4. 应用场景

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

## 5. 位运算

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

```bash
# 同时活跃（当日 DAU 位图做 AND）
BITOP AND dau:both dau:2026-06-13 dau:2026-06-14
BITCOUNT dau:both
# 返回: 连续两天都活跃的用户数
```

BITOP 对最长输入键的长度操作，结果是 String；参与的键较多时注意
一次性 O(N) 的耗时（N 为总字节数），亿级位图建议在低峰执行。

## 6. 陷阱与内存估算

- **offset 上限 2^32-1**：SETBIT 一个超大 offset 会瞬间分配到该字节，
  `SETBIT k 4000000000 1` 直接申请约 500MB——绝不能拿雪花 ID 当 offset。
- **稀疏位图反而不省**：内存由最大 offset 决定而不是 1 的个数；
  极稀疏场景改用 Set 或 HyperLogLog（只要基数不要明细时）。
- **BITCOUNT 的 start/end 默认按字节**：`BITCOUNT key 0 2` 统计的是前
  3 个**字节**（前 24 位）而非前 3 位；Redis 7.0+ 可加 `BIT` 后缀改为
  位语义（`BITCOUNT key 0 23 BIT`）。BITPOS 同理。
- **位图键无 TTL 区分**：签到场景通常「按月/按天分键 + 各自设 TTL」，
  避免单键无限增长。
- **主从与持久化**：位图就是 String，继承通用过期/持久化规则；
  RDB 中按实际分配字节存储。

## 7. 小结

- 初学者要点：SETBIT/GETBIT/BITCOUNT 三板斧；offset 是小整数编号；
  统计「是/否 + 数量」先想位图。
- 进阶注意：SETBIT 返回旧值可用于「首次」判断；BITFIELD 处理多位段
  与连续签到；注意字节 vs 位区间语义（7.0+ BIT 后缀）；稀疏大 offset
  会造成内存事故。
- 下一步：《数值统计》（redis/050-NumberStats）覆盖 INCR/HLL 等其他
  计数方案；《缓存穿透击穿雪崩》（redis/120-CachePenetrationBreakdownAvalanche）
  了解位图亲戚「布隆过滤器」在穿透防护中的用法。
## 基本操作

**基本写法：设置指定位的值**
`SETBIT <key> <offset> <value>`
```bash
# 设置用户42在第100天登录
SETBIT user:login:2026 42 1
```

**基本写法：获取指定位的值**
`GETBIT <key> <offset>`
```bash
# 检查用户42是否在第100天登录
GETBIT user:login:2026 42
```

**基本写法：统计为 1 的位数**
`BITCOUNT <key> [start end]`
```bash
# 统计2026年登录用户数
BITCOUNT user:login:2026
```

**基本写法：查找第一个 0/1 的位置**
`BITPOS <key> <bit> [start end]`
```bash
# 查找第一个为1的位置
BITPOS user:login:2026 1
```

---

## 位运算操作

**基本写法：AND 交集运算**
`BITOP AND <destkey> <key> [key ...]`
```bash
# 对 key1 和 key2 执行 AND 交集运算
BITOP AND result key1 key2
```

**基本写法：OR 并集运算**
`BITOP OR <destkey> <key> [key ...]`
```bash
# 对 key1 和 key2 执行 OR 并集运算
BITOP OR result key1 key2
```

**基本写法：XOR 异或运算**
`BITOP XOR <destkey> <key> [key ...]`
```bash
# 对 key1 和 key2 执行 XOR 异或运算
BITOP XOR result key1 key2
```

**基本写法：NOT 取反运算**
`BITOP NOT <destkey> <key>`
```bash
# 对 key1 执行 NOT 取反运算
BITOP NOT result key1
```

---

## 用户在线状态

**基本写法：标记用户上线**
`SETBIT <online_key> <user_id> 1`
```bash
# 用户42上线
SETBIT online:users 42 1
```

**基本写法：标记用户下线**
`SETBIT <online_key> <user_id> 0`
```bash
# 用户42下线
SETBIT online:users 42 0
```

**基本写法：检查用户是否在线**
`GETBIT <online_key> <user_id>`
```bash
# 检查用户42是否在线
GETBIT online:users 42
```

**基本写法：统计在线人数**
`BITCOUNT <online_key>`
```bash
# 统计当前在线人数
BITCOUNT online:users
```

---

## 用户标签

**基本写法：为用户打标签**
`SETBIT <user_tags_key> <tag_id> 1`
```bash
# 用户42拥有标签0
SETBIT user:42:tags 0 1
```

**多标签写法：为用户打多个标签**
`SETBIT <user_tags_key> <tag_id> 1`
```bash
# 用户42拥有标签0和标签3
SETBIT user:42:tags 0 1
SETBIT user:42:tags 3 1
```

**基本写法：统计用户标签数**
`BITCOUNT <user_tags_key>`
```bash
# 统计用户42的标签数量
BITCOUNT user:42:tags
```

---

## 活跃用户统计

**基本写法：记录每日活跃用户**
`SETBIT <dau_key> <user_id> 1`
```bash
# 记录用户42在2026-06-14活跃
SETBIT dau:2026-06-14 42 1
```

**换行写法：计算月活跃用户（OR 运算合并）**
`BITOP OR <destkey> <key> [key ...]`
```bash
# 计算月活跃用户（OR运算合并每日数据）
BITOP OR mau:2026-06 dau:2026-06-01 dau:2026-06-02 dau:2026-06-03
```

**基本写法：获取月活跃用户数**
`BITCOUNT <mau_key>`
```bash
# 获取2026年6月的月活跃用户数
BITCOUNT mau:2026-06
```
