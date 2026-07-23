---
order: 53
title: 动态内存管理
module: c
category: C
difficulty: intermediate
description: malloc/calloc/realloc/free详解
author: fanquanpp
updated: '2026-06-14'
related:
  - c/枚举与typedef
  - c/多文件编译
  - c/函数指针与回调
  - c/可变参数函数
prerequisites:
  - c/概述
---

# 动态内存管理 (Dynamic Memory Management)

## 第 1 章 引言与学习路径

### 1.1 为什么动态内存管理是 C 工程师的核心能力

如果说指针是 C 语言的"灵魂",那么动态内存管理就是 C 工程师的"试金石"。一个 C 工程师的水平,几乎可以从他处理动态内存的方式看出来。Linux 内核、SQLite 数据库、Redis 服务器、Nginx Web 服务器——这些世界级的 C 项目中,动态内存管理代码占据了极大的比重,也是 bugs 与 security vulnerabilities 的高发地。

C 语言的内存管理是"手动"的:程序员负责分配,也负责释放。这一设计与 Java、Python、Go 等具备垃圾回收 (Garbage Collection, GC) 的语言形成鲜明对比。手动管理的优势在于:

- **可预测的性能**:没有 GC 停顿,适合实时系统
- **精确的控制**:知道每一字节何时分配、何时释放
- **低开销**:不需要 GC 元数据与跟踪算法

而代价则是:

- **内存泄漏 (memory leak)**:忘记释放导致内存越用越多
- **悬空指针 (dangling pointer)**:释放后继续使用导致未定义行为
- **双重释放 (double free)**:同一指针释放两次导致堆损坏
- **缓冲区溢出 (buffer overflow)**:写入超过分配大小导致越界访问
- **使用未初始化内存**:读取 `malloc` 返回但未初始化的内存

据 CERT、CVE 等安全数据库统计,C/C++ 程序中约 70% 的高危漏洞与内存管理有关。因此,深入学习动态内存管理,不仅是写出"能跑"的代码,更是写出"安全、可靠、高效"代码的前提。

### 1.2 本文档的目标读者

本文档面向以下读者:

- **C 进阶学习者**:已掌握基本语法与指针,希望系统学习动态内存
- **系统编程工程师**:编写服务器、数据库、嵌入式等需要精确控制内存的程序
- **安全工程师**:需要理解内存漏洞原理以进行漏洞分析或防护
- **面试准备者**:动态内存是 C 面试的高频考点

### 1.3 学习路径建议

本文档采用 12 章递进式结构:

1. **第 1 章 引言**:建立对动态内存管理的整体认识
2. **第 2 章 历史与设计**:从 Unix 早期 malloc 到现代 tcmalloc/jemalloc
3. **第 3 章 核心概念**:堆、chunk、alignment、内存分配器等术语
4. **第 4 章 API 详解**:malloc/calloc/realloc/free 的精确语义
5. **第 5 章 内存分配器实现**:ptmalloc/jemalloc/tcmalloc 原理
6. **第 6 章 内存错误与检测**:泄漏、越界、双重释放等
7. **第 7 章 实战模式**:对象池、字符串构建器、动态数组等
8. **第 8 章 常见陷阱**:use-after-free、off-by-one 等
9. **第 9 章 性能优化**:对齐、批量分配、内存池
10. **第 10 章 跨平台与编译器**:Windows HeapAPI、Linux mmap、嵌入式
11. **第 11 章 高级主题**:alloca、mmap、C11 aligned_alloc
12. **第 12 章 总结与最佳实践**:工业级项目的内存管理策略

### 1.4 阅读前的预备知识

在开始阅读本文档前,你应该:

- 掌握 C 基本语法、控制流、函数
- 理解指针的概念,包括指针运算、二级指针
- 了解 C 的存储期分类 (automatic/static/allocated)
- 知道什么是字节、对齐、字节序
- 安装 GCC/Clang/MSVC 任一编译器,并能编译运行 C 程序

## 第 2 章 历史演进与设计哲学

### 2.1 早期 Unix 的内存管理

在 Unix 早期版本 (如 V6、V7),进程内存管理通过 `brk` / `sbrk` 系统调用实现。这两个系统调用调整进程的"program break",即数据段的末尾地址:

```
+------------------+  高地址 (program break 调整后)
|   堆 (Heap)      |  ← sbrk 增长方向
+------------------+
|   .bss           |
+------------------+
|   .data          |
+------------------+
|   .text          |
+------------------+  低地址
```

`sbrk(n)` 将 program break 增加 `n` 字节,返回旧 break 地址,相当于分配了 `n` 字节堆内存。这种简单的内存管理方式无法支持"中间释放",即一旦分配的内存无法归还给操作系统 (除非是堆顶)。

### 2.2 K&R malloc:首次适配算法

K&R《The C Programming Language》第 8.7 节展示了一个简化的 malloc 实现,使用首次适配 (first-fit) 算法管理空闲链表:

```c
typedef long Align;             /* 对齐到 long */

union header {                  /* 块头 */
    struct {
        union header *ptr;      /* 下一个空闲块 */
        unsigned size;          /* 块大小 (含头部) */
    } s;
    Align x;                    /* 强制对齐 */
};

typedef union header Header;

static Header base;             /* 链表头哨兵 */
static Header *freep = NULL;    /* 空闲链表指针 */

void *malloc(unsigned nbytes) {
    Header *p, *prevp;
    Header *morecore(unsigned);
    unsigned nunits;

    nunits = (nbytes + sizeof(Header) - 1) / sizeof(Header) + 1;
    if ((prevp = freep) == NULL) {
        base.s.ptr = freep = prevp = &base;
        base.s.size = 0;
    }
    for (p = prevp->s.ptr; ; prevp = p, p = p->s.ptr) {
        if (p->s.size >= nunits) {
            if (p->s.size == nunits) {
                prevp->s.ptr = p->s.ptr;
            } else {
                p->s.size -= nunits;
                p += p->s.size;
                p->s.size = nunits;
            }
            freep = prevp;
            return (void *)(p + 1);
        }
        if (p == freep) {
            if ((p = morecore(nunits)) == NULL)
                return NULL;
        }
    }
}
```

这一实现虽然简单,但揭示了 malloc 的核心思想:

1. 维护一个空闲链表
2. 分配时在链表中寻找足够大的块
3. 找到则切分,否则向操作系统申请更多内存
4. 释放时将块重新插入空闲链表

### 2.3 现代 malloc 实现的演进

随着硬件发展与应用规模扩大,K&R malloc 的性能与内存碎片问题日益突出。1990 年代以来,出现了多种更先进的 malloc 实现:

#### 2.3.1 glibc ptmalloc (Doug Lea's dlmalloc 衍生)

- **作者**:Doug Lea 最初设计,Wolfram Gloger 移植到 glibc
- **核心思想**:per-thread arenas + bins
- **优势**:多线程性能较好
- **劣势**:大块分配可能产生碎片

#### 2.3.2 tcmalloc (Google)

- **作者**:Sanjay Ghemawat 等
- **核心思想**:thread-local cache + size classes
- **优势**:小对象分配极快
- **劣势**:内存占用较大

#### 2.3.3 jemalloc (Facebook)

- **作者**:Jason Evans
- **核心思想**:per-thread arenas + size classes + slab
- **优势**:碎片率低,多线程性能好
- **应用**:Firefox、Facebook 服务器、Rust 默认分配器

#### 2.3.4 mimalloc (Microsoft)

- **作者**:Daan Leijen
- **核心思想**:per-core arenas
- **优势**:超高性能,适合多核
- **劣势**:相对较新,生态不成熟

#### 2.3.5 scudo (LLVM)

- **作者**:LLVM 团队
- **核心思想**:安全强化 + 性能
- **应用**:Android 11+ 默认分配器

### 2.4 C 标准库内存函数的演进

C 标准库的内存管理函数随着 C 标准演进不断完善:

| 标准 | 函数 | 说明 |
|------|------|------|
| C89 | `malloc`, `calloc`, `realloc`, `free` | 基础四件套 |
| C99 | (无新增,但明确了语义) | - |
| C11 | `aligned_alloc` | 对齐分配 |
| C11 | (可选) `strdup`, `strndup` | 字符串复制 |
| C23 | `free_sized`, `free_aligned_sized` | 带大小的释放 |
| C23 | `memccpy`, `mempcpy` | 内存复制增强 |

### 2.5 设计哲学

C 动态内存管理的设计哲学:

1. **程序员全责**:C 信任程序员,不进行运行时检查 (除操作系统的页保护)
2. **零成本抽象**:内存管理函数本身开销极小,主要成本在系统调用
3. **可替换性**:malloc 是库函数,可被用户自定义实现替换
4. **不失败的合理处理**:malloc 返回 NULL 表示失败,程序员必须处理

## 第 3 章 核心概念与术语体系

### 3.1 堆 (Heap)

"堆"在 C 语境下有两层含义,容易混淆:

- **数据结构堆 (heap data structure)**:完全二叉树,用于优先队列
- **动态内存堆 (dynamic memory heap)**:由 malloc 管理的内存区域

本文档中的"堆"指后者。堆是进程地址空间中的一段内存,由 C 运行时库的内存分配器管理。堆的物理实现因系统而异:

- **Linux**:`brk`/`sbrk` 管理小对象,`mmap` 管理大对象
- **Windows**:`HeapAlloc`/`HeapFree` (基于 `VirtualAlloc`)
- **嵌入式**:可能是简化版或自定义实现

### 3.2 Chunk (内存块)

malloc 内部以"chunk"为单位管理内存。一个 chunk 通常包含:

```
+------------------+
| chunk header     |  元数据:size, flags, prev_size
+------------------+
| user data        |  用户可用部分 (malloc 返回的地址)
|                  |
+------------------+
| (padding)        |  对齐填充
+------------------+
```

chunk header 的大小因实现而异:

- 32 位 glibc:8 字节 (size + prev_size)
- 64 位 glibc:16 字节

这意味着 `malloc(0)` 也会占用至少 16-32 字节内存。

### 3.3 Alignment (对齐)

`malloc` 返回的内存地址必须对齐到 `max_align_t` (C11),通常是 16 字节 (64 位) 或 8 字节 (32 位)。这是因为:

- CPU 访问对齐数据更快
- 某些架构 (如 SPARC) 不支持非对齐访问
- SIMD 指令 (SSE/AVX) 要求 16/32/64 字节对齐

```c
#include <stdalign.h>
#include <stddef.h>
printf("max_align_t alignment: %zu\n", alignof(max_align_t));  /* 通常 16 */
```

### 3.4 Size Class (大小类)

现代 malloc 实现将分配请求按大小分桶,每桶对应一个 size class:

- **Small objects** (8B - 256KB):按 8/16/32 字节步长分桶
- **Medium objects** (256KB - 4MB):按页大小分桶
- **Large objects** (> 4MB):直接 `mmap` 申请

按 size class 分配的好处:

- 减少碎片 (相同大小的块可复用)
- 加速查找 (无需遍历整个空闲链表)
- 缓存友好 (相同大小的块往往访问模式相似)

### 3.5 Fragmentation (碎片)

内存碎片分为两类:

- **内部碎片 (internal fragmentation)**:分配的块大于请求的大小,浪费在 padding 与 header 上
- **外部碎片 (external fragmentation)**:空闲块总和足够,但无单一连续块满足请求

例如,请求 17 字节,malloc 可能返回 24 字节的块 (内部碎片 7 字节)。反复分配释放后,空闲块分散在各处,虽然总和可能很大,但无法满足一次大请求 (外部碎片)。

### 3.6 Arena (分配区)

glibc malloc 使用 arena 概念支持多线程:

- **Main arena**:主线程的 arena,使用 `brk`/`sbrk`
- **Dynamic arenas**:其他线程的 arena,使用 `mmap`
- 每个线程绑定到一个 arena,减少锁竞争

arena 数量上限:64 位系统默认 8 × CPU 核心数。

### 3.7 Term Glossary

| 术语 | 英文 | 简要说明 |
|------|------|----------|
| 堆 | heap | 动态分配的内存区域 |
| 块 | chunk | malloc 内部管理单元 |
| 对齐 | alignment | 地址必须满足的倍数关系 |
| 大小类 | size class | 相同大小的块集合 |
| 碎片 | fragmentation | 分配失败但总空闲足够 |
| 分配区 | arena | 线程本地的堆区域 |
| 空闲链表 | free list | 空闲块链接成的链表 |
| 元数据 | metadata | chunk header 等管理信息 |
| 悬空指针 | dangling pointer | 指向已释放内存的指针 |
| 双重释放 | double free | 同一块被释放两次 |
| 内存泄漏 | memory leak | 分配但未释放的内存 |

## 第 4 章 API 详解

### 4.1 malloc

```c
void *malloc(size_t size);
```

**功能**:分配 `size` 字节的未初始化内存。

**返回值**:

- 成功:返回指向分配内存的指针 (对齐到 `max_align_t`)
- 失败:返回 `NULL`,errno 设置为 ENOMEM

**关键语义**:

- `malloc(0)` 行为实现定义:可能返回 NULL,也可能返回一个可 free 的非 NULL 指针
- 内存内容未初始化,读取是 UB (indeterminate value)
- 返回的指针 suitable for any object类型

**示例**:

```c
#include <stdlib.h>
#include <stdio.h>

int main(void) {
    int *p = malloc(sizeof(int));
    if (p == NULL) {
        perror("malloc");
        return 1;
    }
    *p = 42;
    printf("%d\n", *p);
    free(p);
    return 0;
}
```

**正确处理 `malloc(0)`**:

```c
void *safe_malloc(size_t size) {
    if (size == 0) size = 1;
    return malloc(size);
}
```

### 4.2 calloc

```c
void *calloc(size_t nmemb, size_t size);
```

**功能**:为 `nmemb` 个元素、每个 `size` 字节的数组分配内存,并**零初始化**。

**返回值**:

- 成功:返回零初始化的内存指针
- 失败:返回 NULL

**与 malloc 的区别**:

| 特性 | malloc | calloc |
|------|--------|--------|
| 参数 | 字节数 | 元素数 × 元素大小 |
| 初始化 | 不初始化 | 零初始化 |
| 溢出检查 | 无 | 检查 nmemb × size 是否溢出 |
| 性能 | 较快 | 稍慢 (需要清零,但现代 OS 提供 zero-filled pages) |

**优势**:防止整数溢出

```c
/* 危险:可能溢出 */
int *arr = malloc(n * sizeof(int));   /* 若 n 很大,n * sizeof(int) 可能回绕 */

/* 安全:自动检查溢出 */
int *arr = calloc(n, sizeof(int));    /* 若溢出,返回 NULL */
```

**实现优化**:现代 OS 通过 `mmap` 返回的页本身已零填充,因此 `calloc` 通常不需要实际清零,只需标记为已清零即可。

### 4.3 realloc

```c
void *realloc(void *ptr, size_t size);
```

**功能**:调整 `ptr` 指向的内存块大小为 `size` 字节。

**参数**:

- `ptr` 是之前 `malloc`/`calloc`/`realloc` 返回的指针,或 NULL
- `size` 是新的大小

**返回值**:

- 成功:返回新内存指针 (可能与 `ptr` 相同,也可能不同)
- 失败:返回 NULL,**原指针 `ptr` 仍然有效**

**关键语义**:

- `realloc(NULL, size)` 等价于 `malloc(size)`
- `realloc(ptr, 0)` (C89):等价于 `free(ptr)`,返回 NULL
- `realloc(ptr, 0)` (C23):未定义,建议用 `free(ptr)` 显式释放
- 缩小:可能就地完成,返回 `ptr`
- 放大:可能申请新块,复制旧数据,释放旧块

**正确使用模式**:

```c
int *arr = malloc(10 * sizeof(int));
/* ... 使用 10 个元素 ... */

int *new_arr = realloc(arr, 20 * sizeof(int));
if (new_arr == NULL) {
    /* 分配失败,但 arr 仍然有效 */
    free(arr);   /* 决定放弃 */
    return 1;
}
arr = new_arr;   /* 用新指针 */
/* 现在可使用 20 个元素 */
```

**反模式 (会丢失原指针)**:

```c
arr = realloc(arr, 20 * sizeof(int));   /* 若失败,arr 变 NULL,原内存泄漏! */
```

### 4.4 free

```c
void free(void *ptr);
```

**功能**:释放 `ptr` 指向的内存块。

**参数**:

- `ptr` 必须是之前 `malloc`/`calloc`/`realloc` 返回的指针,或 NULL
- `ptr` 不能是已释放的指针 (double free)
- `ptr` 不能是指向块中间的指针

**关键语义**:

- `free(NULL)` 是合法的,不做任何事
- 释放后,`ptr` 的值不变 (变成悬空指针)
- 释放后再访问 `ptr` 指向的内存是 UB
- 释放后的内存可能立即被重新分配给其他线程

**安全释放模式**:

```c
free(p);
p = NULL;   /* 避免悬空指针 */
```

### 4.5 aligned_alloc (C11)

```c
void *aligned_alloc(size_t alignment, size_t size);
```

**功能**:分配 `size` 字节、对齐到 `alignment` 的内存。

**要求**:

- `alignment` 必须是有效对齐 (通常是 2 的幂)
- `size` 必须是 `alignment` 的倍数 (C11 要求,C17 放宽)

**用途**:SIMD 指令、DMA、缓存行对齐等场景

```c
#include <stdlib.h>
#include <stdalign.h>

/* 分配 256 字节,16 字节对齐 (适合 SSE) */
void *p = aligned_alloc(16, 256);

/* 分配 4096 字节,4096 字节对齐 (页对齐) */
void *q = aligned_alloc(4096, 4096);
```

**替代方案** (POSIX):

```c
void *posix_memalign(void **memptr, size_t alignment, size_t size);
```

**替代方案** (MSVC):

```c
void *_aligned_malloc(size_t size, size_t alignment);
void _aligned_free(void *ptr);    /* 必须配对使用! */
```

### 4.6 C23 新增函数

C23 引入了带大小的释放函数,允许分配器优化:

```c
void free_sized(void *ptr, size_t size);
void free_aligned_sized(void *ptr, size_t alignment, size_t size);
```

优势:分配器无需查找 chunk 大小,直接按 `size` 处理,提升性能。

### 4.7 strdup / strndup (POSIX, C23)

```c
char *strdup(const char *s);
char *strndup(const char *s, size_t n);
```

**功能**:复制字符串,返回新分配的内存指针。

**注意**:返回的内存必须用 `free` 释放。

```c
char *original = "hello";
char *copy = strdup(original);
if (copy) {
    printf("%s\n", copy);   /* hello */
    free(copy);
}
```

### 4.8 错误处理

malloc 失败的常见原因:

- 内存不足 (OOM)
- 虚拟地址空间耗尽 (32 位进程)
- 内存碎片严重 (虽然物理空闲,但无连续块)

```c
#include <errno.h>
#include <string.h>
#include <stdio.h>

void *p = malloc(SIZE_MAX);
if (p == NULL) {
    printf("malloc failed: %s\n", strerror(errno));   /* Cannot allocate memory */
}
```

### 4.9 大小计算的常见错误

#### 4.9.1 整数溢出

```c
size_t n = 1000000;
int *arr = malloc(n * sizeof(int));   /* 若 n * sizeof(int) 溢出,分配小内存 */
```

**安全计算** (C23 `<stdckdint.h>`):

```c
#include <stdckdint.h>

size_t n = 1000000;
size_t total;
if (ckd_mul(&total, n, sizeof(int))) {
    /* 溢出 */
    return NULL;
}
int *arr = malloc(total);
```

#### 4.9.2 sizeof 误用

```c
int *arr = malloc(sizeof(arr));   /* 错误!arr 是指针,sizeof(arr) = 8 */
int *arr = malloc(n * sizeof(int));   /* 正确 */
int *arr = malloc(n * sizeof(*arr));  /* 更健壮:类型变化时无需改 */
```

#### 4.9.3 sizeof(指针) vs sizeof(数组)

```c
void f(int arr[10]) {   /* arr 实际是指针! */
    size_t n = sizeof(arr);   /* 8 (指针大小),不是 40 */
}
```

## 第 5 章 内存分配器实现

### 5.1 glibc ptmalloc 详解

ptmalloc 是 glibc 的默认 malloc 实现,基于 Doug Lea 的 dlmalloc。核心数据结构:

#### 5.1.1 Chunk 结构

```c
struct malloc_chunk {
    INTERNAL_SIZE_T      mchunk_prev_size;  /* 前一 chunk 大小 (仅前一 chunk 空闲时有效) */
    INTERNAL_SIZE_T      mchunk_size;       /* 本 chunk 大小 (含元数据),低 3 位为 flags */
    struct malloc_chunk* fd;                /* 前向指针 (空闲时) */
    struct malloc_chunk* bk;                /* 后向指针 (空闲时) */
    /* 大 chunk 还有 fd_nextsize, bk_nextsize */
};
```

flags 位:

- `PREV_INUSE` (0x1):前一 chunk 在使用
- `IS_MMAPPED` (0x2):本 chunk 通过 mmap 分配
- `NON_MAIN_ARENA` (0x4):本 chunk 属于非主 arena

#### 5.1.2 Bins 分类

空闲 chunk 按 size 分类存放在 bins 中:

- **Fast bins**:大小 16-80 字节 (64 位),LIFO 单链表,不加锁
- **Small bins**:大小 < 512 字节, FIFO 双向链表,精确大小匹配
- **Large bins**:大小 >= 512 字节,按大小范围分桶,从大到小排序
- **Unsorted bin**:刚释放的 chunk 暂存,下次分配时优先搜索
- **Tcache** (glibc 2.26+):per-thread cache,极快的小对象分配

#### 5.1.3 分配流程

```
malloc(size)
1. 计算 chunk 大小 (含 metadata,对齐)
2. 若 size 在 fastbin 范围:
   a. 查 fastbin,命中则返回
3. 若 size 在 smallbin 范围:
   a. 查 smallbin,命中则返回
4. 遍历 unsorted bin:
   a. 精确匹配则返回
   b. 否则放入对应 small/large bin
5. 查 large bin (best-fit)
6. 若仍无,使用 top chunk
7. 若 top chunk 不足,sysmalloc 向 OS 申请
```

#### 5.1.4 释放流程

```
free(ptr)
1. 计算 chunk 大小
2. 若 size 在 tcache 范围且未满:
   a. 加入 tcache,返回
3. 若 size 在 fastbin 范围:
   a. 加入 fastbin,返回
4. 否则:
   a. 合并相邻空闲 chunk
   b. 加入 unsorted bin
   c. 若 chunk 是顶 chunk,可能 trim 给 OS
```

### 5.2 jemalloc 详解

jemalloc 由 Jason Evans 为 FreeBSD 开发,后被 Facebook 用于其服务器。核心思想:

- **per-thread arenas**:每线程独立 arena,减少锁竞争
- **size classes**:精细大小分类,减少碎片
- **slab allocator**:小对象使用 slab 模式,每页切分为相同大小的对象
- **rtree (radix tree)**:全局 rtree 记录每个页属于哪个 arena

### 5.3 tcmalloc 详解

tcmalloc 由 Google 开发,核心思想:

- **Thread-Local Cache**:每线程小对象缓存,无锁分配
- **Central Free List**:全局空闲链表,定期从 OS 申请
- **Page Heap**:大对象直接从页堆分配
- **Size Class**:小对象按 8/16/32/.../ 字节分桶
- **span**:连续页组成的单元,管理同 size class 的对象

### 5.4 性能对比

| 分配器 | 小对象 | 大对象 | 多线程 | 碎片率 | 内存占用 |
|--------|--------|--------|--------|--------|----------|
| ptmalloc | 中 | 中 | 中 | 中 | 低 |
| tcmalloc | 极快 | 快 | 极快 | 低 | 高 |
| jemalloc | 快 | 快 | 极快 | 极低 | 中 |
| mimalloc | 极快 | 快 | 极快 | 低 | 中 |

### 5.5 替换默认 malloc

```c
/* 编译时链接 */
gcc -o prog prog.c -ltcmalloc

/* 运行时 LD_PRELOAD */
LD_PRELOAD=/usr/lib/libtcmalloc.so ./prog

/* 自定义实现 */
void *malloc(size_t size) { /* ... */ }
void free(void *ptr) { /* ... */ }
```

## 第 6 章 内存错误与检测

### 6.1 内存泄漏 (Memory Leak)

**定义**:分配的内存未释放,且失去对它的引用。

```c
void leak(void) {
    int *p = malloc(sizeof(int));
    *p = 42;
    /* 函数返回,p 丢失,内存泄漏 */
}
```

**检测工具**:

- Valgrind (Linux):`valgrind --leak-check=full ./prog`
- AddressSanitizer (跨平台):`gcc -fsanitize=address -g`
- Visual Studio CRT debug
- mtrace (glibc)

### 6.2 悬空指针 (Dangling Pointer) / Use-After-Free

**定义**:释放内存后继续使用指针。

```c
int *p = malloc(sizeof(int));
*p = 42;
free(p);
printf("%d\n", *p);   /* UB!可能输出 42,也可能崩溃 */
```

**防护**:

```c
free(p);
p = NULL;   /* 后续访问会立即崩溃,而不是静默错误 */
```

### 6.3 双重释放 (Double Free)

**定义**:同一块内存被释放两次。

```c
int *p = malloc(sizeof(int));
free(p);
free(p);   /* UB!堆损坏,可能被攻击者利用 */
```

**防护**:

```c
free(p);
p = NULL;
free(p);   /* free(NULL) 安全,无操作 */
```

### 6.4 缓冲区溢出 (Buffer Overflow)

**定义**:写入超过分配大小。

```c
int *arr = malloc(10 * sizeof(int));
for (int i = 0; i <= 10; i++) {   /* off-by-one */
    arr[i] = i;   /* arr[10] 越界 */
}
```

**防护**:

- 使用 `calloc(n, sizeof(T))` 而非 `malloc(n * sizeof(T))` (防溢出)
- 启用 AddressSanitizer
- 使用 `static_assert` 检查关键不变量

### 6.5 使用未初始化内存

**定义**:读取 `malloc` 返回但未初始化的内存。

```c
int *p = malloc(sizeof(int));
if (*p == 42) {   /* UB!p 未初始化 */
    /* ... */
}
```

**防护**:用 `calloc` 替代 `malloc` (零初始化),或显式初始化。

### 6.6 越界读取

```c
char *s = malloc(10);
strcpy(s, "hello");
printf("%c\n", s[100]);   /* 越界读,UB */
```

### 6.7 类型混淆

```c
int *p = malloc(sizeof(int));
float *fp = (float *)p;   /* 严格别名违规 */
*fp = 3.14f;
```

### 6.8 释放非堆指针

```c
int x;
free(&x);   /* UB!x 不是堆内存 */

int *p = malloc(sizeof(int));
free(p + 1);   /* UB!不是 chunk 起始地址 */
```

### 6.9 检测工具一览

| 工具 | 类型 | 平台 | 检测能力 | 性能开销 |
|------|------|------|----------|----------|
| Valgrind | 模拟执行 | Linux/macOS | 全面 | 10-50x |
| AddressSanitizer | 编译插桩 | 全平台 | 内存错误 | 2x |
| MemorySanitizer | 编译插桩 | Linux | 未初始化 | 3x |
| UndefinedBehaviorSanitizer | 编译插桩 | 全平台 | UB | 1.5x |
| cppcheck | 静态分析 | 全平台 | 部分模式 | 0 |
| Coverity | 静态分析 | 全平台 | 全面 | 0 |

### 6.10 AddressSanitizer 用法

```bash
# 编译
gcc -fsanitize=address -g -O1 -o prog prog.c

# 运行
./prog

# 错误示例
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x602000000014
READ of size 4 at 0x602000000014 thread T0
    #0 0x4005e4 in main /path/prog.c:5
    #1 0x7f... in __libc_start_main
```

ASan 提供详细的调用栈,定位错误极其方便。

### 6.11 Valgrind 用法

```bash
valgrind --leak-check=full --show-leak-kinds=all ./prog

# 输出示例
==12345== 40 bytes in 1 blocks are definitely lost in loss record 1 of 1
==12345==    at 0x4C29F73: malloc (vg_replace_malloc.c:299)
==12345==    by 0x40053E: main (prog.c:3)
```

Valgrind 优势:无需重新编译,可检测 ASan 难以发现的问题 (如部分泄漏)。
Valgrind 劣势:性能开销大,不适合生产环境。

## 第 7 章 实战模式

### 7.1 模式 1:动态数组

```c
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

typedef struct {
    int  *data;
    size_t size;
    size_t capacity;
} int_array_t;

bool int_array_init(int_array_t *arr, size_t initial_cap) {
    arr->data = malloc(initial_cap * sizeof(int));
    if (arr->data == NULL) return false;
    arr->size = 0;
    arr->capacity = initial_cap;
    return true;
}

bool int_array_push(int_array_t *arr, int value) {
    if (arr->size >= arr->capacity) {
        size_t new_cap = arr->capacity * 2;
        int *new_data = realloc(arr->data, new_cap * sizeof(int));
        if (new_data == NULL) return false;
        arr->data = new_data;
        arr->capacity = new_cap;
    }
    arr->data[arr->size++] = value;
    return true;
}

void int_array_free(int_array_t *arr) {
    free(arr->data);
    arr->data = NULL;
    arr->size = 0;
    arr->capacity = 0;
}

/* 使用 */
int main(void) {
    int_array_t arr;
    if (!int_array_init(&arr, 10)) return 1;
    
    for (int i = 0; i < 100; i++) {
        if (!int_array_push(&arr, i * 2)) {
            int_array_free(&arr);
            return 1;
        }
    }
    
    printf("size: %zu, capacity: %zu\n", arr.size, arr.capacity);
    
    int_array_free(&arr);
    return 0;
}
```

### 7.2 模式 2:字符串构建器

```c
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdio.h>

typedef struct {
    char  *data;
    size_t size;
    size_t capacity;
} str_builder_t;

bool sb_init(str_builder_t *sb, size_t initial_cap) {
    sb->data = malloc(initial_cap);
    if (sb->data == NULL) return false;
    sb->data[0] = '\0';
    sb->size = 0;
    sb->capacity = initial_cap;
    return true;
}

bool sb_ensure(str_builder_t *sb, size_t additional) {
    if (sb->size + additional + 1 <= sb->capacity) return true;
    size_t new_cap = sb->capacity * 2;
    while (new_cap < sb->size + additional + 1) new_cap *= 2;
    char *new_data = realloc(sb->data, new_cap);
    if (new_data == NULL) return false;
    sb->data = new_data;
    sb->capacity = new_cap;
    return true;
}

bool sb_append(str_builder_t *sb, const char *s) {
    size_t len = strlen(s);
    if (!sb_ensure(sb, len)) return false;
    memcpy(sb->data + sb->size, s, len);
    sb->size += len;
    sb->data[sb->size] = '\0';
    return true;
}

bool sb_appendf(str_builder_t *sb, const char *fmt, ...) {
    va_list args, args_copy;
    va_start(args, fmt);
    va_copy(args_copy, args);
    
    int len = vsnprintf(NULL, 0, fmt, args);
    va_end(args);
    
    if (len < 0) {
        va_end(args_copy);
        return false;
    }
    
    if (!sb_ensure(sb, (size_t)len)) {
        va_end(args_copy);
        return false;
    }
    
    vsnprintf(sb->data + sb->size, (size_t)len + 1, fmt, args_copy);
    va_end(args_copy);
    
    sb->size += (size_t)len;
    return true;
}

char *sb_take(str_builder_t *sb) {
    char *result = sb->data;
    sb->data = NULL;
    sb->size = 0;
    sb->capacity = 0;
    return result;
}

void sb_free(str_builder_t *sb) {
    free(sb->data);
    sb->data = NULL;
    sb->size = 0;
    sb->capacity = 0;
}
```

### 7.3 模式 3:对象池

```c
#include <stdlib.h>

typedef struct node {
    int value;
    struct node *next;
} node_t;

typedef struct {
    node_t *free_list;
    size_t  pool_size;
} node_pool_t;

node_pool_t *pool_create(size_t initial_size) {
    node_pool_t *pool = malloc(sizeof(node_pool_t));
    if (pool == NULL) return NULL;
    
    pool->free_list = NULL;
    pool->pool_size = 0;
    
    for (size_t i = 0; i < initial_size; i++) {
        node_t *n = malloc(sizeof(node_t));
        if (n == NULL) {
            /* 回滚已分配的 */
            while (pool->free_list) {
                node_t *tmp = pool->free_list;
                pool->free_list = tmp->next;
                free(tmp);
            }
            free(pool);
            return NULL;
        }
        n->next = pool->free_list;
        pool->free_list = n;
        pool->pool_size++;
    }
    return pool;
}

node_t *pool_alloc(node_pool_t *pool) {
    if (pool->free_list == NULL) {
        /* 扩展池 */
        node_t *n = malloc(sizeof(node_t));
        if (n == NULL) return NULL;
        pool->pool_size++;
        return n;
    }
    node_t *n = pool->free_list;
    pool->free_list = n->next;
    return n;
}

void pool_free(node_pool_t *pool, node_t *n) {
    n->next = pool->free_list;
    pool->free_list = n;
}

void pool_destroy(node_pool_t *pool) {
    while (pool->free_list) {
        node_t *tmp = pool->free_list;
        pool->free_list = tmp->next;
        free(tmp);
    }
    free(pool);
}
```

### 7.4 模式 4:二维数组

```c
#include <stdlib.h>

/* 方法 1:逐行分配 (不连续) */
int **alloc_2d_rows(size_t rows, size_t cols) {
    int **arr = malloc(rows * sizeof(int *));
    if (arr == NULL) return NULL;
    
    for (size_t i = 0; i < rows; i++) {
        arr[i] = malloc(cols * sizeof(int));
        if (arr[i] == NULL) {
            /* 回滚 */
            for (size_t j = 0; j < i; j++) free(arr[j]);
            free(arr);
            return NULL;
        }
    }
    return arr;
}

void free_2d_rows(int **arr, size_t rows) {
    for (size_t i = 0; i < rows; i++) free(arr[i]);
    free(arr);
}

/* 方法 2:一次分配 (连续) */
int **alloc_2d_contig(size_t rows, size_t cols) {
    int **arr = malloc(rows * sizeof(int *));
    if (arr == NULL) return NULL;
    
    int *data = malloc(rows * cols * sizeof(int));
    if (data == NULL) {
        free(arr);
        return NULL;
    }
    
    for (size_t i = 0; i < rows; i++) {
        arr[i] = data + i * cols;
    }
    return arr;
}

void free_2d_contig(int **arr) {
    /* 只需释放 data 和 arr,但 data = arr[0] */
    free(arr[0]);
    free(arr);
}
```

### 7.5 模式 5:RAII 风格 (GCC 扩展)

```c
#include <stdlib.h>

/* GCC 扩展:cleanup 属性 */
static inline void cleanup_free(void *p) {
    free(*(void **)p);
}

#define AUTOFREE __attribute__((cleanup(cleanup_free)))

void f(void) {
    AUTOFREE int *p = malloc(sizeof(int));
    AUTOFREE char *s = strdup("hello");
    
    *p = 42;
    /* 函数返回时自动 free(p) 和 free(s) */
}
```

### 7.6 模式 6:智能指针 (C23)

```c
#include <stdlib.h>
#include <stdatomic.h>

typedef struct {
    void *ptr;
    void (*deleter)(void *);
    _Atomic int refcount;
} shared_ptr_t;

shared_ptr_t *shared_ptr_create(void *ptr, void (*deleter)(void *)) {
    shared_ptr_t *sp = malloc(sizeof(shared_ptr_t));
    if (sp == NULL) {
        if (deleter) deleter(ptr);
        else free(ptr);
        return NULL;
    }
    sp->ptr = ptr;
    sp->deleter = deleleter;
    atomic_init(&sp->refcount, 1);
    return sp;
}

shared_ptr_t *shared_ptr_ref(shared_ptr_t *sp) {
    atomic_fetch_add(&sp->refcount, 1);
    return sp;
}

void shared_ptr_unref(shared_ptr_t *sp) {
    if (atomic_fetch_sub(&sp->refcount, 1) == 1) {
        if (sp->deleter) sp->deleter(sp->ptr);
        else free(sp->ptr);
        free(sp);
    }
}
```

### 7.7 模式 7:内存池 (Arena)

```c
#include <stdlib.h>
#include <string.h>

typedef struct arena_block {
    struct arena_block *next;
    size_t  used;
    size_t  size;
    char    data[];
} arena_block_t;

typedef struct {
    arena_block_t *blocks;
    size_t block_size;
} arena_t;

arena_t *arena_create(size_t block_size) {
    arena_t *a = malloc(sizeof(arena_t));
    if (a == NULL) return NULL;
    a->blocks = NULL;
    a->block_size = block_size;
    return a;
}

void *arena_alloc(arena_t *a, size_t size) {
    /* 简化版:不处理对齐,不切分大块 */
    if (a->blocks == NULL || a->blocks->used + size > a->blocks->size) {
        size_t block_size = a->block_size;
        if (size > block_size) block_size = size;
        arena_block_t *b = malloc(sizeof(arena_block_t) + block_size);
        if (b == NULL) return NULL;
        b->next = a->blocks;
        b->used = 0;
        b->size = block_size;
        a->blocks = b;
    }
    void *ptr = a->blocks->data + a->blocks->used;
    a->blocks->used += size;
    return ptr;
}

void arena_destroy(arena_t *a) {
    arena_block_t *b = a->blocks;
    while (b) {
        arena_block_t *next = b->next;
        free(b);
        b = next;
    }
    free(a);
}

/* 使用:适合短生命周期对象,一次性释放 */
void parse_config(void) {
    arena_t *a = arena_create(4096);
    if (a == NULL) return;
    
    char *key = arena_alloc(a, 64);
    char *val = arena_alloc(a, 256);
    /* ... 解析逻辑 ... */
    
    arena_destroy(a);   /* 所有内存一次性释放 */
}
```

## 第 8 章 常见陷阱

### 8.1 忘记检查返回值

```c
/* 错误 */
int *p = malloc(sizeof(int));
*p = 42;   /* 若 malloc 失败,UB */

/* 正确 */
int *p = malloc(sizeof(int));
if (p == NULL) {
    /* 错误处理 */
    return;
}
*p = 42;
```

### 8.2 realloc 失败丢失指针

```c
/* 错误 */
p = realloc(p, new_size);
/* 若失败,p 变 NULL,原内存泄漏 */

/* 正确 */
int *new_p = realloc(p, new_size);
if (new_p == NULL) {
    /* p 仍可用,继续使用原大小 */
    return;
}
p = new_p;
```

### 8.3 类型不匹配

```c
/* 错误:不同类型指针共享同一内存 */
int *p = malloc(sizeof(int));
float *fp = (float *)p;
*fp = 3.14f;   /* 严格别名违规 */

/* 正确:用 union 或 memcpy */
union { int i; float f; } u;
u.i = 42;
float f = u.f;
```

### 8.4 释放错误地址

```c
int *p = malloc(10 * sizeof(int));
free(p + 5);   /* UB!不是 chunk 起始 */
free(p);       /* 已释放,UB */
```

### 8.5 返回栈上指针

```c
/* 错误 */
int *f(void) {
    int local;
    return &local;   /* 悬空指针 */
}

/* 正确 */
int *f(void) {
    int *p = malloc(sizeof(int));
    if (p) *p = 42;
    return p;
}
```

### 8.6 字符串忘记终止符

```c
/* 错误 */
char *s = malloc(strlen(src));
strcpy(s, src);   /* 越界写 \0! */

/* 正确 */
char *s = malloc(strlen(src) + 1);
strcpy(s, src);
```

### 8.7 双重释放

```c
int *p = malloc(sizeof(int));
free(p);
free(p);   /* UB!堆损坏 */
```

### 8.8 数组与指针 sizeof 混淆

```c
void f(int arr[]) {
    size_t n = sizeof(arr);   /* 8,不是数组大小! */
}

int arr[10];
f(arr);
```

### 8.9 realloc 后旧指针失效

```c
int *p = malloc(10 * sizeof(int));
int *q = p;
int *new_p = realloc(p, 20 * sizeof(int));
if (new_p != p) {
    /* q 现在悬空! */
    q[0] = 1;   /* UB */
}
```

### 8.10 跨边界分配释放

```c
/* Windows 上:malloc 用 CRT 堆,HeapFree 用系统堆,不兼容 */
void *p = malloc(100);
HeapFree(GetProcessHeap(), 0, p);   /* UB! */

/* 跨 DLL 边界 */
/* DLL A: void *p = malloc(100); */
/* DLL B: free(p); */   /* 若 DLL A/B 静态链接 CRT,UB */
```

### 8.11 跨线程释放

```c
/* 跨线程释放通常合法,但要注意:
   - 释放后立即被另一线程分配,可能引发竞争
   - 某些嵌入式 RTOS 限制跨线程释放 */
```

### 8.12 释放 const 对象

```c
const int *p = malloc(sizeof(int));
free((void *)p);   /* 合法,但要去掉 const */
free(p);           /* GCC 警告 */
```

## 第 9 章 性能优化

### 9.1 减少 malloc 调用次数

```c
/* 慢 */
for (int i = 0; i < 1000; i++) {
    int *p = malloc(sizeof(int));
    /* ... */
    free(p);
}

/* 快 */
int *arr = malloc(1000 * sizeof(int));
for (int i = 0; i < 1000; i++) {
    /* 使用 arr[i] */
}
free(arr);
```

### 9.2 使用对象池

频繁分配/释放相同大小对象时,对象池比 malloc 快得多:

```c
/* 对象池比 malloc 快 5-10 倍 */
node_t *pool_get(node_pool_t *pool) {
    if (pool->free_list) {
        node_t *n = pool->free_list;
        pool->free_list = n->next;
        return n;
    }
    return malloc(sizeof(node_t));   /* 池空时退回 malloc */
}
```

### 9.3 对齐优化

```c
/* SIMD 友好 */
float *v = aligned_alloc(32, n * sizeof(float));   /* 32 字节对齐 */

/* 缓存行对齐 */
struct Counter {
    alignas(64) int value;   /* 独占缓存行,避免 false sharing */
};
```

### 9.4 批量释放

```c
/* 慢:逐个释放 */
for (size_t i = 0; i < n; i++) {
    free(arrays[i]);
}

/* 快:用 arena 一次性释放 */
arena_t *a = arena_create(1 << 20);
for (size_t i = 0; i < n; i++) {
    arrays[i] = arena_alloc(a, size[i]);
}
arena_destroy(a);   /* O(1) 释放所有 */
```

### 9.5 大对象用 mmap

```c
/* glibc 默认对大于 128KB 的分配使用 mmap */
/* 可以手动用 mmap 获得零填充内存 */
#include <sys/mman.h>

void *p = mmap(NULL, 1 << 30, PROT_READ | PROT_WRITE,
               MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
if (p != MAP_FAILED) {
    /* 使用 1GB 内存,自动零填充 */
    munmap(p, 1 << 30);
}
```

### 9.6 避免内部碎片

```c
/* 内部碎片 */
void *p1 = malloc(17);   /* 实际分配 24 或 32 字节 */

/* 减少:批量分配 */
void *p2 = malloc(17 * 100);   /* 内部碎片占比小 */
```

### 9.7 Tcache 与性能

glibc 2.26+ 的 tcache 极大提升小对象分配性能:

```c
/* 检查 tcache 状态 */
#include <malloc.h>
mallopt(M_TCACHE_COUNT, 128);   /* 调整 tcache 大小 */
```

### 9.8 性能测试方法

```c
#include <time.h>
#include <stdio.h>

#define N 1000000

int main(void) {
    clock_t start = clock();
    
    for (int i = 0; i < N; i++) {
        void *p = malloc(64);
        free(p);
    }
    
    clock_t end = clock();
    printf("Time: %.3f ms\n", (double)(end - start) * 1000 / CLOCKS_PER_SEC);
    return 0;
}
```

## 第 10 章 跨平台与编译器

### 10.1 Linux

- **系统调用**:`brk`/`sbrk` (小对象)、`mmap` (大对象)
- **默认分配器**:glibc ptmalloc
- **替代分配器**:tcmalloc、jemalloc、mimalloc
- **环境变量**:`MALLOC_CHECK_` (调试)、`LD_PRELOAD` (替换)

### 10.2 Windows

- **API**:`HeapAlloc`/`HeapFree` (基于 `VirtualAlloc`)
- **CRT**:`malloc`/`free` 封装 `HeapAlloc`
- **调试**:`_CrtDumpMemoryLeaks`、`_CrtSetDbgFlag`
- **替代**:tcmalloc-windows、mimalloc

```c
#include <crtdbg.h>

int main(void) {
    _CrtSetDbgFlag(_CRTDBG_ALLOC_MEM_DF | _CRTDBG_LEAK_CHECK_DF);
    
    int *p = malloc(sizeof(int));   /* 故意泄漏 */
    
    /* 程序结束时自动报告泄漏 */
    return 0;
}
```

### 10.3 macOS

- **分配器**:系统自带 (类似 jemalloc)
- **工具**:`malloc_history`、`leaks`、`heap`
- **scudo**:LLVM 安全分配器,可作为替代

### 10.4 嵌入式系统

嵌入式系统通常资源受限,需要定制 malloc:

- **无 OS**:静态缓冲区作为堆
- **RTOS**:互斥锁保护 + 简单分配算法
- **MMU-less**:无虚拟内存,直接操作物理内存

```c
/* 简化 malloc (无 OS 场景) */
static char heap[HEAP_SIZE];
static size_t heap_used = 0;

void *simple_malloc(size_t size) {
    /* 对齐到 8 */
    size = (size + 7) & ~7;
    if (heap_used + size > HEAP_SIZE) return NULL;
    void *ptr = heap + heap_used;
    heap_used += size;
    return ptr;
}

void simple_free(void *ptr) {
    /* 简化版:不支持释放 */
    (void)ptr;
}
```

### 10.5 跨平台头文件

```c
/* mem_compat.h */
#ifndef MEM_COMPAT_H
#define MEM_COMPAT_H

#if defined(_WIN32)
    #define MEM_ALIGNED_ALLOC(alignment, size) _aligned_malloc(size, alignment)
    #define MEM_ALIGNED_FREE(ptr) _aligned_free(ptr)
#else
    #define MEM_ALIGNED_ALLOC(alignment, size) aligned_alloc(alignment, size)
    #define MEM_ALIGNED_FREE(ptr) free(ptr)
#endif

#endif
```

## 第 11 章 高级主题

### 11.1 alloca

```c
#include <alloca.h>

void *alloca(size_t size);   /* 在栈上分配 */
```

`alloca` 在栈上分配内存,函数返回时自动释放。优点:

- 极快 (只需调整栈指针)
- 无需 free
- 不会产生碎片

缺点:

- 大小受栈限制
- 不可移植 (POSIX 但非标准 C)
- 不能跨函数返回

```c
void f(size_t n) {
    int *arr = alloca(n * sizeof(int));   /* 栈上分配 */
    /* ... 使用 arr ... */
    /* 函数返回时自动释放 */
}
```

### 11.2 变长数组 (VLA, C99)

```c
void f(size_t n) {
    int arr[n];   /* 栈上分配,C99 起,C11 可选 */
    /* ... */
}
```

VLA 类似 `alloca`,但语义更清晰。注意:

- 大小运行时确定
- 栈空间有限,大 VLA 危险
- C11 起 GCC/Clang 默认支持,MSVC 不支持

### 11.3 mmap 与 munmap

```c
#include <sys/mman.h>

void *mmap(void *addr, size_t length, int prot, int flags,
           int fd, off_t offset);
int munmap(void *addr, size_t length);
```

`mmap` 直接向 OS 申请内存,绕过 malloc:

- 适合大块分配 (1MB+)
- 自动零填充 (匿名映射)
- 可设置页权限 (PROT_READ/PROT_WRITE)
- 支持文件映射

```c
/* 申请 1GB 内存 */
void *p = mmap(NULL, 1ULL << 30,
               PROT_READ | PROT_WRITE,
               MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
if (p == MAP_FAILED) {
    perror("mmap");
    return 1;
}

/* 使用 */
((int *)p)[0] = 42;

/* 释放 */
munmap(p, 1ULL << 30);
```

### 11.4 C11 aligned_alloc

```c
void *aligned_alloc(size_t alignment, size_t size);
```

要求:

- `alignment` 必须是 supported alignment (通常是 2 的幂)
- `size` 必须是 `alignment` 的倍数 (C11 严格,C17 放宽)

### 11.5 内存映射 I/O

```c
/* 将硬件寄存器映射到用户空间 (需要 root) */
volatile int *reg = mmap(NULL, 4096,
                         PROT_READ | PROT_WRITE,
                         MAP_SHARED | MAP_PHYS,
                         fd, 0x40021000);
*reg = 0x01;   /* 写硬件 */
```

### 11.6 锁页内存

```c
/* Linux: mlock 防止页被换出 */
mlock(ptr, size);

/* Windows: VirtualLock */
VirtualLock(ptr, size);
```

适合实时系统,避免页错误延迟。

### 11.7 NUMA 感知分配

```c
/* Linux: numa_alloc_onnode */
#include <numa.h>
void *p = numa_alloc_onnode(size, 1);   /* 在 node 1 分配 */
numa_free(p, size);
```

NUMA 系统中,跨节点访问内存慢于本节点,NUMA 感知分配可提升性能。

### 11.8 巨页 (Huge Pages)

```c
/* Linux: 2MB 巨页 */
void *p = mmap(NULL, 2 * 1024 * 1024,
               PROT_READ | PROT_WRITE,
               MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB, -1, 0);
```

巨页减少 TLB miss,适合大内存应用 (数据库、虚拟机)。

### 11.9 C23 free_sized

```c
void free_sized(void *ptr, size_t size);
```

C23 新增,允许分配器跳过 chunk 元数据查找,提升性能:

```c
int *p = malloc(100 * sizeof(int));
/* ... */
free_sized(p, 100 * sizeof(int));   /* 比 free(p) 略快 */
```

### 11.10 内存调试函数

```c
#include <malloc.h>

/* glibc 扩展 */
size_t malloc_usable_size(void *ptr);   /* 实际可用大小 */
int mallopt(int param, int value);       /* 调整参数 */
struct mallinfo mallinfo(void);          /* 状态信息 (32 位) */
struct mallinfo2 mallinfo2(void);        /* 状态信息 (64 位,glibc 2.33+) */
```

```c
int *p = malloc(100);
printf("usable: %zu\n", malloc_usable_size(p));   /* 可能是 104 或更大 */
free(p);
```

## 第 12 章 总结、最佳实践与延伸阅读

### 12.1 核心知识图谱

```
动态内存管理
├── API
│   ├── malloc/calloc/realloc/free
│   ├── aligned_alloc (C11)
│   ├── free_sized (C23)
│   └── strdup/strndup
├── 分配器实现
│   ├── ptmalloc (glibc)
│   ├── tcmalloc (Google)
│   ├── jemalloc (Facebook)
│   ├── mimalloc (Microsoft)
│   └── scudo (LLVM)
├── 错误类型
│   ├── 内存泄漏
│   ├── 悬空指针
│   ├── 双重释放
│   ├── 缓冲区溢出
│   ├── 未初始化读取
│   └── 类型混淆
├── 检测工具
│   ├── Valgrind
│   ├── AddressSanitizer
│   ├── MemorySanitizer
│   └── 静态分析
├── 工程模式
│   ├── 动态数组
│   ├── 字符串构建器
│   ├── 对象池
│   ├── 内存池 (Arena)
│   └── 智能指针
└── 性能优化
    ├── 减少 malloc 调用
    ├── 对齐优化
    ├── 大对象 mmap
    ├── 替换分配器
    └── NUMA 感知
```

### 12.2 最佳实践清单

#### 12.2.1 分配

- 用 `calloc(n, sizeof(T))` 替代 `malloc(n * sizeof(T))` (防溢出)
- 检查返回值是否为 NULL
- 用 `sizeof(*ptr)` 而非 `sizeof(type)` (类型变化时无需改)
- 字符串分配:`malloc(strlen(s) + 1)`
- 大对象用 `aligned_alloc` 或 `mmap`

#### 12.2.2 释放

- 配对使用:每个 `malloc` 必须有 `free`
- 释放后立即设 NULL:`free(p); p = NULL;`
- 不要释放非堆指针
- 不要释放 chunk 中间地址
- 不要双重释放

#### 12.2.3 realloc

- 用临时变量接收:`new_p = realloc(p, size); if (new_p) p = new_p;`
- 失败时原指针仍有效
- 缩小时数据保留
- 放大时可能移动内存

#### 12.2.4 模块设计

- 谁分配谁释放 (ownership 明确)
- 提供配对的 create/destroy 函数
- 文档注明返回的内存由谁释放
- 避免跨模块 malloc/free (DLL 边界)

#### 12.2.5 调试

- 开发阶段启用 ASan
- CI 中运行 Valgrind
- 单元测试覆盖内存边界
- 定期静态分析

### 12.3 编译选项

```bash
# 调试
gcc -g -O0 -fsanitize=address,undefined -o prog prog.c

# 内存检测
gcc -g -O1 -fsanitize=memory -o prog prog.c   # MSan,需重新编译依赖

# 性能 (替换分配器)
gcc -O3 -ltcmalloc -o prog prog.c

# 严格警告
gcc -Wall -Wextra -Wpedantic -Wconversion -Wsign-conversion -o prog prog.c
```

### 12.4 工具速查

| 工具 | 用途 | 命令 |
|------|------|------|
| gcc -fsanitize=address | 内存错误 | 编译时启用 |
| valgrind --leak-check=full | 内存泄漏 | 运行时检测 |
| massif | 内存分析 | valgrind --tool=massif |
| cppcheck | 静态分析 | cppcheck --enable=all . |
| clang-tidy | 静态分析 | clang-tidy prog.c -- -std=c11 |
| heaptrack | 内存 profiling | heaptrack ./prog |
| mtrace | malloc 跟踪 | MALLOC_TRACE=out mtrace ./prog out |

### 12.5 延伸阅读

#### 12.5.1 标准与文档

- ISO/IEC 9899:2018 第 7.22.3 节 (内存管理函数)
- glibc malloc internals: glibc wiki
- jemalloc documentation: jemalloc.net
- tcmalloc documentation: goog-perf-tools

#### 12.5.2 经典论文

- "Dynamic Storage Allocation: A Survey and Critical Review" by Wilson et al. (1995)
- "Reconsidering Custom Memory Allocation" by Berger et al. (2002)
- "Scalable memory allocation using jemalloc" by Evans (2006)

#### 12.5.3 书籍

- 《Secure Coding in C and C++》Robert Seacord
- 《Effective C》Robert Seacord
- 《Expert C Programming》Peter van der Linden
- 《C Interfaces and Implementations》David Hanson

#### 12.5.4 在线资源

- cppreference.com: C 内存函数参考
- glibc malloc source code: sourceware.org/git/?p=glibc.git
- jemalloc source: github.com/jemalloc/jemalloc
- "Memory Allocation" by Dan Bornstein: YouTube

### 12.6 学习路径建议

#### 入门阶段 (2-4 周)

1. 掌握 malloc/calloc/realloc/free 的基本用法
2. 理解指针与堆的关系
3. 编写动态数组、字符串构建器
4. 用 ASan 检测错误

#### 进阶阶段 (1-3 个月)

1. 阅读分配器源码 (ptmalloc 简化版)
2. 实现对象池、内存池
3. 学习 Valgrind、Massif
4. 理解内存碎片与对齐

#### 高级阶段 (3 个月以上)

1. 阅读 jemalloc/tcmalloc 论文
2. 实现自定义分配器
3. 学习 NUMA、巨页、内存映射 I/O
4. 研究安全强化 (scudo)

### 12.7 FAQ

#### Q1: malloc(0) 返回什么?

A: 实现定义。可能返回 NULL,也可能返回一个可 free 的非 NULL 指针。最佳实践:用 `malloc(0)` 时改为 `malloc(1)`。

#### Q2: free(NULL) 安全吗?

A: 安全。C 标准规定 `free(NULL)` 不做任何事。

#### Q3: calloc 比 malloc 慢吗?

A: 不一定。现代 OS 通过 `mmap` 返回的页已零填充,calloc 通常无需实际清零。

#### Q4: realloc 一定复制数据吗?

A: 不一定。缩小时通常就地完成,放大时可能就地 (如果 top chunk 足够) 或复制。

#### Q5: 如何检测内存泄漏?

A: 用 Valgrind (`--leak-check=full`) 或 ASan (`-fsanitize=address`),也可用 `mtrace` 或自定义 malloc 包装。

#### Q6: 为什么不用 GC (垃圾回收)?

A: C 的设计哲学是"信任程序员",GC 会引入运行时开销与不可预测的停顿,不适合系统编程。

#### Q7: 跨 DLL 边界传递 malloc 内存安全吗?

A: 仅当所有 DLL 使用同一 CRT (动态链接) 时安全。否则各 DLL 有独立堆,跨边界释放会导致 UB。

#### Q8: 如何优化内存分配性能?

A: 1) 用对象池减少 malloc 调用;2) 用 arena 批量释放;3) 替换分配器 (tcmalloc/jemalloc);4) 大对象用 mmap。

#### Q9: 如何避免 use-after-free?

A: 1) free 后立即设 NULL;2) 用 ASan 检测;3) 用 RAII 模式 (GCC cleanup);4) 限制指针作用域。

#### Q10: 嵌入式系统如何处理 malloc?

A: 1) 静态预分配;2) 简化分配器 (无释放);3) 内存池;4) 关键路径禁用 malloc。

### 12.8 速查附录

#### 12.8.1 函数一览

| 函数 | 功能 | 备注 |
|------|------|------|
| `malloc(size)` | 分配 | 未初始化 |
| `calloc(n, size)` | 分配 | 零初始化,防溢出 |
| `realloc(ptr, size)` | 调整大小 | 可能移动内存 |
| `free(ptr)` | 释放 | free(NULL) 安全 |
| `aligned_alloc(al, sz)` | 对齐分配 | C11 |
| `free_sized(ptr, sz)` | 带大小释放 | C23 |
| `strdup(s)` | 复制字符串 | POSIX/C23 |
| `strndup(s, n)` | 复制限定字符串 | POSIX/C23 |
| `alloca(size)` | 栈上分配 | 非标准,POSIX |

#### 12.8.2 错误代码

| 错误 | 示例 | 检测 |
|------|------|------|
| 内存泄漏 | `malloc` 无 `free` | Valgrind/ASan |
| 双重释放 | `free(p); free(p);` | ASan |
| Use-after-free | `free(p); *p;` | ASan/Valgrind |
| 缓冲区溢出 | `arr[10]` 但只分配 10 | ASan |
| 未初始化 | `*p` 未赋值 | MSan |
| 类型混淆 | `*(float *)int_ptr` | UBSan |

#### 12.8.3 性能等级

| 分配方式 | 相对速度 |
|---------|----------|
| 栈分配 | 100x |
| 对象池 | 50x |
| tcache | 30x |
| malloc 小对象 | 1x (基准) |
| malloc 大对象 | 0.1x |
| mmap | 0.05x |

#### 12.8.4 命令速查

```bash
# 编译
gcc -g -fsanitize=address,undefined -o prog prog.c
gcc -O3 -ltcmalloc -o prog prog.c

# 检测
valgrind --leak-check=full ./prog
valgrind --tool=massif ./prog

# 分析
heaptrack ./prog
heaptrack_print heaptrack.*.gz

# 静态
cppcheck --enable=all prog.c
clang-tidy prog.c -- -std=c11
```

#### 12.8.5 内存布局示意

```
高地址
┌─────────────────┐
│  Kernel         │
├─────────────────┤
│  Stack          │  ← 函数局部变量,alloca
├─────────────────┤
│  mmap region    │  ← 大对象,mmap 分配
├─────────────────┤
│  Heap           │  ← malloc/calloc/realloc
│  (向上增长)      │
├─────────────────┤
│  .bss           │  未初始化全局变量
├─────────────────┤
│  .data          │  已初始化全局变量
├─────────────────┤
│  .rodata        │  字符串字面量,const
├─────────────────┤
│  .text          │  代码段
└─────────────────┘
低地址
```

#### 12.8.6 chunk 结构 (glibc 64 位)

```
+------------------+
| prev_size (8B)   |  前一 chunk 大小 (前一空闲时有效)
+------------------+
| size (8B)        |  本 chunk 大小,低 3 位 flags
+------------------+
| user data        |  malloc 返回的地址 (16 字节对齐)
|                  |
+------------------+
| (padding)        |  对齐填充
+------------------+
| next prev_size   |  下一 chunk 的 prev_size
+------------------+
```

#### 12.8.7 常见问题排查

| 症状 | 可能原因 | 工具 |
|------|----------|------|
| 程序崩溃 | use-after-free, double free | ASan |
| 内存增长 | 内存泄漏 | Valgrind, massif |
| 性能下降 | 频繁 malloc | profiler |
| 数据错乱 | 缓冲区溢出 | ASan |
| 随机错误 | 未初始化内存 | MSan |

### 12.9 自测题

#### 选择题

1. 下列哪个函数会零初始化内存?
   - A. `malloc`
   - B. `calloc`
   - C. `realloc`
   - D. `alloca`

   答案:B

2. `free(p)` 之后,`p` 的值是什么?
   - A. NULL
   - B. 原值 (悬空指针)
   - C. 未定义
   - D. 编译错误

   答案:B

3. 下列哪段代码会触发 UB?
   - A. `free(NULL);`
   - B. `int *p = malloc(sizeof(int)); free(p); free(p);`
   - C. `int *p = calloc(1, sizeof(int));`
   - D. `void *p = malloc(0); free(p);`

   答案:B

#### 简答题

1. 解释 `malloc`、`calloc`、`realloc` 的区别。
2. 什么是 use-after-free?如何避免?
3. `realloc(NULL, size)` 等价于什么?
4. 为什么 `free(p); p = NULL;` 是好习惯?
5. 内存池 (arena) 与对象池的区别是什么?

#### 编程题

1. 实现一个动态增长的栈,支持 push/pop/peek 操作。
2. 实现一个简单的内存池,支持任意大小分配。
3. 用 ASan 检测并修复以下代码的所有错误:

```c
int main(void) {
    int *arr = malloc(10 * sizeof(int));
    for (int i = 0; i <= 10; i++) {
        arr[i] = i;
    }
    free(arr);
    printf("%d\n", arr[0]);
    free(arr);
    return 0;
}
```

### 12.10 参考答案

#### 12.10.1 简答题答案

1. **区别**:
   - `malloc(size)`:分配 size 字节,未初始化
   - `calloc(n, size)`:分配 n*size 字节,零初始化,自动检查溢出
   - `realloc(ptr, size)`:调整已分配内存大小,可能移动

2. **use-after-free**:释放内存后继续访问。避免方法:free 后立即设 NULL,使用 RAII 模式,启用 ASan。

3. `realloc(NULL, size)` 等价于 `malloc(size)`。

4. **好习惯原因**:
   - 防止悬空指针被误用 (访问 NULL 立即崩溃,而非静默错误)
   - 防止双重释放 (free(NULL) 安全)
   - 调试时易于识别已释放的指针

5. **区别**:
   - 内存池:批量分配大块,内部按需切分,一次性释放整个池
   - 对象池:预分配固定大小对象,逐个借出/归还,适合频繁分配/释放相同类型

#### 12.10.2 编程题答案 (错误修复)

```c
#include <stdlib.h>
#include <stdio.h>

int main(void) {
    int *arr = malloc(10 * sizeof(int));
    if (arr == NULL) return 1;
    
    /* 修复 1:off-by-one,应 i < 10 */
    for (int i = 0; i < 10; i++) {
        arr[i] = i;
    }
    
    /* 保存原始指针用于释放 */
    int *saved_arr = arr;
    
    free(arr);
    arr = NULL;   /* 修复 2:防止 use-after-free */
    
    /* 修复 3:删除对已释放内存的访问 */
    /* printf("%d\n", arr[0]); */   /* UB,已删除 */
    
    /* 修复 4:删除双重释放 */
    /* free(arr); */   /* UB,已删除 */
    
    (void)saved_arr;
    return 0;
}
```

### 12.11 结语

动态内存管理是 C 工程师必备的核心能力,也是 C 语言最难掌握的部分之一。本文档从历史、API、实现、错误、模式、性能、跨平台、高级主题等多维度进行了系统讲解,希望能帮助你:

- **理解原理**:知道 malloc 内部如何工作
- **正确使用**:遵循最佳实践,避免常见陷阱
- **高效调试**:熟练使用 ASan、Valgrind 等工具
- **优化性能**:选择合适的分配器与策略
- **保证安全**:防止内存相关的安全漏洞

掌握动态内存管理,是从 C 入门者成长为 C 工程师的关键一步。希望本文档能成为你 C 编程路上的有力助手。

---

至此,动态内存管理章节结束。建议结合实战项目 (如实现一个简单的内存池或字符串构建器) 巩固所学,并在实际项目中持续积累经验。
