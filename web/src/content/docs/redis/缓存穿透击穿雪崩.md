---
order: 107
title: 缓存穿透击穿雪崩
module: redis
category: database
difficulty: intermediate
description: 'Redis 缓存三大问题：缓存穿透（布隆过滤器）、缓存击穿（互斥锁）、缓存雪崩（随机TTL）的原理与解决方案。'
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/管道与事务原子性
  - redis/Lua脚本原子执行
  - redis/内存淘汰策略
prerequisites:
  - redis/概述与核心数据结构
---

## 1. 缓存穿透

### 1.1 问题描述

查询**不存在的数据**，缓存无法命中，请求直达数据库：

```
用户请求: GET /user/999999 (不存在)
  → Redis: MISS (无缓存)
  → MySQL: MISS (无数据)
  → 返回空，不缓存

下次请求: GET /user/999999
  → Redis: MISS
  → MySQL: MISS
  → ... 重复穿透
```

### 1.2 攻击场景

```
恶意请求大量不存在的ID:
  GET /user/-1
  GET /user/99999999
  GET /user/abc
  → 全部穿透到数据库 → 数据库压力过大
```

### 1.3 解决方案

**方案1：缓存空值**

```python
def get_user(user_id):
    # 查缓存
    data = redis.get(f"user:{user_id}")
    if data is not None:
        if data == "NULL":
            return None  # 缓存的空值
        return json.loads(data)

    # 查数据库
    data = db.query("SELECT * FROM users WHERE id = %s", user_id)
    if data:
        redis.setex(f"user:{user_id}", 3600, json.dumps(data))
    else:
        # 缓存空值，短TTL
        redis.setex(f"user:{user_id}", 60, "NULL")
    return data
```

**方案2：布隆过滤器**

```
前置过滤：查询前先检查布隆过滤器

                    ┌──────────────┐
请求 → 布隆过滤器 → │ 可能存在     │ → 查缓存 → 查数据库
                    │ 一定不存在   │ → 直接返回
                    └──────────────┘
```

```python
# 初始化：将所有有效ID加入布隆过滤器
for user_id in db.query("SELECT id FROM users"):
    bf.add(user_id)

def get_user(user_id):
    # 布隆过滤器检查
    if not bf.exists(user_id):
        return None  # 一定不存在

    # 正常查询流程
    data = redis.get(f"user:{user_id}")
    if data:
        return json.loads(data)
    data = db.query(...)
    if data:
        redis.setex(f"user:{user_id}", 3600, json.dumps(data))
    return data
```

**布隆过滤器原理**：

```
位数组 + 多个哈希函数

添加元素 x:
  h1(x) % m → 位置设为1
  h2(x) % m → 位置设为1
  h3(x) % m → 位置设为1

查询元素 y:
  检查 h1(y), h2(y), h3(y) 位置是否全为1
  全为1 → 可能存在（有误判率）
  有0   → 一定不存在

误判率: P ≈ (1 - e^(-kn/m))^k
  m: 位数组大小
  k: 哈希函数数量
  n: 已插入元素数量
```

| 方案       | 优点       | 缺点                           |
| ---------- | ---------- | ------------------------------ |
| 缓存空值   | 简单、通用 | 浪费内存、短TTL需维护          |
| 布隆过滤器 | 空间高效   | 有误判率、需预加载、不支持删除 |

## 2. 缓存击穿

### 2.1 问题描述

**热点Key过期**瞬间，大量并发请求同时穿透到数据库：

```
热点Key: "hot:item:1" (TTL=3600s)

T=3600s: Key过期
  1000个并发请求同时到达
  → 全部MISS
  → 1000个请求同时查数据库
  → 数据库压力飙升
```

### 2.2 解决方案

**方案1：互斥锁（Mutex Lock）**

```python
def get_hot_data(key):
    data = redis.get(key)
    if data:
        return json.loads(data)

    # 尝试获取互斥锁
    lock_key = f"lock:{key}"
    if redis.set(lock_key, "1", nx=True, ex=5):  # 5秒锁超时
        try:
            # 获得锁，查数据库
            data = db.query(...)
            if data:
                redis.setex(key, 3600, json.dumps(data))
            return data
        finally:
            redis.delete(lock_key)
    else:
        # 未获得锁，等待重试
        time.sleep(0.1)
        return get_hot_data(key)  # 递归重试
```

**方案2：逻辑过期**

```python
def get_hot_data(key):
    data = redis.get(key)
    if data:
        obj = json.loads(data)
        if obj['expire_time'] > time.time():
            return obj['data']  # 逻辑未过期
        else:
            # 逻辑过期，异步更新
            threading.Thread(target=refresh_cache, args=(key,)).start()
            return obj['data']  # 返回旧数据
    return None

def refresh_cache(key):
    lock_key = f"lock:{key}"
    if redis.set(lock_key, "1", nx=True, ex=10):
        data = db.query(...)
        obj = {
            'data': data,
            'expire_time': time.time() + 3600
        }
        redis.set(key, json.dumps(obj))  # 不设TTL
        redis.delete(lock_key)
```

**方案3：永不过期 + 异步刷新**

```python
# 缓存不设TTL，由后台任务定期刷新
# 适合数据量小、更新频率固定的场景
```

| 方案     | 一致性   | 可用性 | 复杂度 |
| -------- | -------- | ------ | ------ |
| 互斥锁   | 强一致   | 等待   | 低     |
| 逻辑过期 | 最终一致 | 高     | 中     |
| 永不过期 | 最终一致 | 最高   | 低     |

## 3. 缓存雪崩

### 3.1 问题描述

大量Key**同时过期**，或缓存服务宕机，导致请求全部穿透到数据库：

```
场景1: 大量Key同时过期
  10000个Key的TTL都是 3600s
  1小时后全部过期 → 10000个请求同时查数据库

场景2: Redis 宕机
  Redis不可用 → 所有请求穿透到数据库
```

### 3.2 解决方案

**方案1：随机TTL**

```python
import random

base_ttl = 3600  # 基础TTL: 1小时
random_ttl = random.randint(0, 600)  # 随机0-10分钟

redis.setex(key, base_ttl + random_ttl, value)
# TTL: 3600 ~ 4200 秒，分散过期时间
```

**方案2：多级缓存**

```
请求 → 本地缓存 (Caffeine/Guava)
     → Redis 缓存
     → 数据库

L1 本地缓存: TTL=60s，容量小
L2 Redis:    TTL=3600s，容量大
L3 数据库:   持久化

即使 Redis 宕机，本地缓存仍可挡住部分请求
```

**方案3：熔断降级**

```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
def get_data(key):
    data = redis.get(key)
    if data:
        return json.loads(data)
    data = db.query(...)
    return data

# 熔断后返回降级数据
def get_data_fallback(key):
    return {"message": "服务繁忙，请稍后重试"}
```

**方案4：Redis 高可用**

```
- Redis Sentinel: 自动故障转移
- Redis Cluster: 分片 + 副本
- 跨机房部署: 异地多活
```

## 4. 综合防护策略

### 4.1 防护层次

```
┌─────────────────────────────────────────┐
│ 1. 限流：控制请求速率                      │
├─────────────────────────────────────────┤
│ 2. 布隆过滤器：拦截无效请求                  │
├─────────────────────────────────────────┤
│ 3. 本地缓存：L1 缓存                       │
├─────────────────────────────────────────┤
│ 4. Redis 缓存：L2 缓存（随机TTL）           │
├─────────────────────────────────────────┤
│ 5. 互斥锁：防止击穿                        │
├─────────────────────────────────────────┤
│ 6. 熔断降级：保护数据库                     │
├─────────────────────────────────────────┤
│ 7. 数据库：最终数据源                       │
└─────────────────────────────────────────┘
```

### 4.2 监控指标

```
- 缓存命中率: hit / (hit + miss) > 95%
- 穿透率: miss / total < 5%
- 数据库QPS: 不超过阈值
- Redis 内存使用: < 80%
- Key 过期分布: 是否集中
```
