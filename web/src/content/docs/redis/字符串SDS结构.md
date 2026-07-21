---
order: 100
title: 字符串SDS结构
module: redis
category: database
difficulty: intermediate
description: 'Redis SDS（Simple Dynamic String）数据结构详解：预分配策略、惰性删除、与 C 字符串的差异及二进制安全。'
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/无盘复制
  - redis/模块系统
  - redis/跳表与有序集合
  - redis/主从复制缓冲区
prerequisites:
  - redis/概述与核心数据结构
---

## 1. SDS 数据结构

### 1.1 结构定义

Redis 没有直接使用 C 语言的字符串，而是自定义了 SDS（Simple Dynamic String）：

```c
// Redis 5.0+ sdshdr 结构（按长度分5种）
struct __attribute__((packed)) sdshdr8 {
    uint8_t  len;         // 已使用长度（不含\0）
    uint8_t  alloc;       // 总分配容量（不含\0和header）
    unsigned char flags;   // 类型标识：SDS_TYPE_8
    char     buf[];       // 实际数据（柔性数组）
};

struct __attribute__((packed)) sdshdr16 {
    uint16_t len;
    uint16_t alloc;
    unsigned char flags;
    char buf[];
};

// 同理 sdshdr32, sdshdr64
```

### 1.2 SDS 与 C 字符串对比

| 特性        | C 字符串         | SDS                   |
| ----------- | ---------------- | --------------------- |
| 获取长度    | $O(n)$ 遍历      | $O(1)$ 直接读取 len   |
| 缓冲区溢出  | 不检查，可能溢出 | 自动扩容，杜绝溢出    |
| 修改长度    | 每次重新分配     | 预分配 + 惰性释放     |
| 二进制安全  | 依赖 `\0` 结尾   | 用 len 判断结束       |
| 兼容 C 函数 | 是               | 是（buf 末尾有 `\0`） |

### 1.3 内存布局

```
SDS 内存布局 (sdshdr8):

┌──────┬───────┬───────┬──────────────────────────┬────┐
│ len  │ alloc │ flags │          buf[]           │ \0 │
│  5   │  10   │  s8   │ 'H','e','l','l','o',... │ 0  │
└──────┴───────┴───────┴──────────────────────────┴────┘
  1字节  1字节   1字节         11字节(alloc+1)

len = 5:   已使用5字节
alloc = 10: 总容量10字节（不含header和\0）
剩余空间 = alloc - len = 5字节
```

## 2. 预分配策略

### 2.1 空间预分配规则

当 SDS 需要扩容时，Redis 不仅分配所需空间，还额外预分配：

```
规则1: 修改后 len < 1MB
  预分配: alloc = len（翻倍分配）
  示例: len=10 → 修改后 len=15 → alloc=30

规则2: 修改后 len >= 1MB
  预分配: alloc = len + 1MB（固定追加1MB）
  示例: len=3MB → 修改后 len=5MB → alloc=6MB
```

### 2.2 预分配效果

```
连续追加操作 "hello" → "hello world" → "hello world redis"

无预分配: 3次 realloc
  malloc(5) → realloc(11) → realloc(17)

有预分配: 1次 realloc
  malloc(5) → realloc(22)  ← 第二次追加无需重新分配
  len=17, alloc=22, 剩余5字节
```

### 2.3 源码分析

```c
// sds.c - sdsMakeRoomFor
sds sdsMakeRoomFor(sds s, size_t addlen) {
    size_t free = sdsavail(s);  // 剩余空间
    if (free >= addlen) return s;  // 空间足够，直接返回

    size_t len = sdslen(s);
    size_t newlen = len + addlen;

    // 预分配策略
    if (newlen < SDS_MAX_PREALLOC)  // SDS_MAX_PREALLOC = 1MB
        newlen *= 2;               // 翻倍
    else
        newlen += SDS_MAX_PREALLOC; // +1MB

    return sds_realloc(s, newlen);
}
```

## 3. 惰性删除

### 3.1 空间释放策略

当 SDS 缩短字符串时，不立即释放多余内存，而是通过 `free` 字段记录：

```c
// sds.c - sdstrim
sds sdstrim(sds s, const char *cset) {
    // ... 删除首尾匹配字符
    // 不调用 realloc 释放内存
    // 仅更新 len 和 free
    sdssetlen(s, newlen);  // 更新 len
    return s;
}
```

### 3.2 惰性删除示例

```
SDS: "hello world" (len=11, alloc=11)

执行: sdstrim(s, "ld")  → 删除首尾的 'l' 和 'd'
结果: "hello wor" (len=9, alloc=11)
      剩余空间 = 2 字节，未释放

执行: sdsRemoveFreeSpace(s)  → 显式释放
结果: "hello wor" (len=9, alloc=9)
```

### 3.3 何时真正释放

```c
// 1. 显式调用 sdsRemoveFreeSpace
// 2. 键被删除时，整个 SDS 被释放
// 3. Redis 内存淘汰时
// 4. 使用 SDS 的对象被重写时
```

## 4. 二进制安全

### 4.1 C 字符串的问题

C 字符串以 `\0` 表示结尾，无法存储包含 `\0` 的二进制数据：

```c
char *str = "hello\0world";  // C认为长度是5，丢失"world"
printf("%zu", strlen(str));   // 输出: 5
```

### 4.2 SDS 的二进制安全

SDS 使用 `len` 字段判断长度，而非 `\0`：

```c
// SDS 可以存储任意二进制数据
sds s = sdsnewlen("hello\0world", 11);  // len=11
printf("%zu", sdslen(s));  // 输出: 11

// buf 中: 'h','e','l','l','o','\0','w','o','r','l','d','\0'
//          ↑ 数据中的\0           ↑ 结尾的\0（兼容C函数）
```

### 4.3 兼容 C 字符串函数

SDS 的 `buf` 末尾始终保留 `\0`，可以直接使用 C 字符串函数：

```c
sds s = sdsnew("hello");
printf("%s", s);  // 直接传给 printf，兼容 C 字符串
strcmp(s, "hello");  // 可以使用 strcmp
```

## 5. SDS 类型选择

### 5.1 五种 SDS 类型

| 类型        | len/alloc 类型 | 最大长度 | header 大小 |
| ----------- | -------------- | -------- | ----------- |
| SDS_TYPE_5  | 无（3位存储）  | 31 字节  | 1 字节      |
| SDS_TYPE_8  | uint8_t        | 255 字节 | 3 字节      |
| SDS_TYPE_16 | uint16_t       | 64 KB    | 5 字节      |
| SDS_TYPE_32 | uint32_t       | 4 GB     | 9 字节      |
| SDS_TYPE_64 | uint64_t       | 16 EB    | 17 字节     |

### 5.2 类型选择逻辑

```c
// sds.c - sdsReqType
static inline char sdsReqType(size_t string_size) {
    if (string_size < 1 << 5)  return SDS_TYPE_5;
    if (string_size < 1 << 8)  return SDS_TYPE_8;
    if (string_size < 1 << 16) return SDS_TYPE_16;
    if (string_size < 1ll << 32) return SDS_TYPE_32;
    return SDS_TYPE_64;
}
```

短字符串使用小 header，节省内存。例如存储 "key"（3字节），使用 SDS_TYPE_8，header 仅 3 字节。
