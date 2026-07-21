# 内存淘汰策略

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 触发条件

**基本写法：设置最大内存**
`CONFIG SET maxmemory <bytes>`
```bash
# 设置 Redis 最大内存为 4GB
CONFIG SET maxmemory 4gb
```

**基本写法：查看内存使用**
`INFO memory`
```bash
# 查看当前内存使用情况
INFO memory
```

---

## 淘汰策略配置

**基本写法：不淘汰策略**
`CONFIG SET maxmemory-policy noeviction`
```bash
# 内存不足时拒绝写入，返回错误
CONFIG SET maxmemory-policy noeviction
```

**基本写法：所有键 LRU 策略**
`CONFIG SET maxmemory-policy allkeys-lru`
```bash
# 所有键中淘汰最久未访问的键
CONFIG SET maxmemory-policy allkeys-lru
```

**基本写法：所有键 LFU 策略**
`CONFIG SET maxmemory-policy allkeys-lfu`
```bash
# 所有键中淘汰访问频率最低的键
CONFIG SET maxmemory-policy allkeys-lfu
```

**基本写法：所有键随机策略**
`CONFIG SET maxmemory-policy allkeys-random`
```bash
# 所有键中随机淘汰
CONFIG SET maxmemory-policy allkeys-random
```

**基本写法：有 TTL 的键 LRU 策略**
`CONFIG SET maxmemory-policy volatile-lru`
```bash
# 有过期时间的键中淘汰最久未访问的键
CONFIG SET maxmemory-policy volatile-lru
```

**基本写法：有 TTL 的键 LFU 策略**
`CONFIG SET maxmemory-policy volatile-lfu`
```bash
# 有过期时间的键中淘汰访问频率最低的键
CONFIG SET maxmemory-policy volatile-lfu
```

**基本写法：有 TTL 的键随机策略**
`CONFIG SET maxmemory-policy volatile-random`
```bash
# 有过期时间的键中随机淘汰
CONFIG SET maxmemory-policy volatile-random
```

**基本写法：有 TTL 的键最短 TTL 优先策略**
`CONFIG SET maxmemory-policy volatile-ttl`
```bash
# 有过期时间的键中淘汰 TTL 最短的键
CONFIG SET maxmemory-policy volatile-ttl
```

---

## LRU 算法

**基本写法：设置 LRU 采样数**
`CONFIG SET maxmemory-samples <N>`
```bash
# 设置 LRU 采样数为 5（默认值）
CONFIG SET maxmemory-samples 5
```

**结构定义写法：redisObject LRU 时钟字段**
`struct redisObject { unsigned lru:24; }`
```c
// 每个 Redis 对象头包含一个 24 位的 LRU 时钟
typedef struct redisObject {
    unsigned type:4;
    unsigned encoding:4;
    unsigned lru:24;    // LRU 时间戳（精度约1.5分钟）
    int refcount;
    void *ptr;
} robj;
```

---

## LFU 算法

**基本写法：设置 LFU 衰减时间**
`CONFIG SET lfu-decay-time <minutes>`
```bash
# 设置 LFU 计数器衰减时间为 1 分钟
CONFIG SET lfu-decay-time 1
```

**基本写法：设置 LFU 计数器因子**
`CONFIG SET lfu-log-factor <factor>`
```bash
# 设置 LFU 计数器对数因子为 10
CONFIG SET lfu-log-factor 10
```

**函数源码写法：LFU 对数计数器更新**
`uint8_t LFULogIncr(uint8_t counter)`
```c
// LFU 对数计数器更新函数
uint8_t LFULogIncr(uint8_t counter) {
    if (counter == 255) return 255;
    double r = (double)rand() / RAND_MAX;
    double baseval = counter - LFU_INIT_VAL;  // LFU_INIT_VAL = 5
    if (baseval < 0) baseval = 0;
    double p = 1.0 / (baseval * 10 + 1);  // 概率递减
    if (r < p) counter++;
    return counter;
}
```

---

## 监控与调优

**基本写法：查看淘汰统计**
`INFO stats`
```bash
# 查看键淘汰统计信息
INFO stats
```
