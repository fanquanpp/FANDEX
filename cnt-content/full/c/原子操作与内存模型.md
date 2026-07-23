---
order: 57
title: 原子操作与内存模型
module: c
category: C
difficulty: advanced
description: C11原子操作与内存序
author: fanquanpp
updated: '2026-06-14'
related:
  - c/可变参数函数
  - c/信号处理
  - c/泛型选择
  - c/线程与并发
prerequisites:
  - c/概述
---

## 概述

在多线程编程中，多个线程同时访问共享数据会导致数据竞争（data race），产生未定义行为。C11 标准引入了 `<stdatomic.h>` 头文件，提供了原子类型和原子操作，确保对共享变量的读写是不可分割的。同时，C11 定义了内存序（memory order）模型，允许开发者在性能和一致性之间做出权衡。

## 基础概念

### 数据竞争问题

```c
// 没有原子操作时，多线程自增会导致结果不正确
int counter = 0;

// 线程1和线程2同时执行
counter++; // 读取、加1、写回，三步操作可能被交错
```

上面的 `counter++` 实际上包含三个操作：读取当前值、加1、写回。如果两个线程同时读取到相同的值，各自加1后写回，最终只增加了1而不是2。

### 原子操作的定义

原子操作是不可分割的操作，要么完全执行，要么完全不执行，不会被其他线程观察到中间状态。C11 通过 `_Atomic` 类型修饰符和一系列库函数提供原子操作支持。

### 内存序

内存序定义了编译器和处理器对内存操作重排序的约束。不同的内存序在性能和一致性之间提供不同级别的保证：

| 内存序                 | 说明                             | 适用场景         |
| ---------------------- | -------------------------------- | ---------------- |
| `memory_order_relaxed` | 无顺序保证，只保证原子性         | 计数器、统计信息 |
| `memory_order_acquire` | 读操作，后续读写不能重排到此之前 | 读取同步标志     |
| `memory_order_release` | 写操作，之前读写不能重排到此之后 | 写入同步标志     |
| `memory_order_acq_rel` | 同时具有 acquire 和 release 语义 | 读-改-写操作     |
| `memory_order_seq_cst` | 顺序一致，所有线程看到相同顺序   | 默认，最安全     |

## 快速上手

### 最简单的原子计数器

```c
#include <stdio.h>
#include <stdatomic.h>
#include <threads.h>

// 声明原子整型变量
atomic_int counter = ATOMIC_VAR_INIT(0);

// 线程函数：每个线程自增100000次
int thread_func(void *arg) {
    for (int i = 0; i < 100000; i++) {
        atomic_fetch_add(&counter, 1); // 原子自增
    }
    return 0;
}

int main(void) {
    thrd_t t1, t2;

    // 创建两个线程
    thrd_create(&t1, thread_func, NULL);
    thrd_create(&t2, thread_func, NULL);

    // 等待线程完成
    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    // 结果一定是200000
    printf("counter = %d\n", atomic_load(&counter));
    return 0;
}
```

## 详细用法

### 原子类型的声明

```c
#include <stdatomic.h>

// 方式一：使用 _Atomic 类型修饰符
_Atomic int a;
_Atomic double b;
_Atomic struct Point { int x; int y; } c;

// 方式二：使用 atomic_* 便捷类型
atomic_int ai;           // 等价于 _Atomic int
atomic_long al;          // 等价于 _Atomic long
atomic_uintptr_t ap;     // 等价于 _Atomic uintptr_t
atomic_flag af;          // 布尔原子类型，最简单的原子类型

// 初始化
atomic_int x = ATOMIC_VAR_INIT(0);  // 编译时初始化
atomic_init(&x, 42);                 // 运行时初始化（非原子操作）
```

### 原子读写操作

```c
#include <stdio.h>
#include <stdatomic.h>

int main(void) {
    atomic_int x = ATOMIC_VAR_INIT(0);

    // 原子写入
    atomic_store(&x, 10);

    // 原子读取
    int val = atomic_load(&x);
    printf("x = %d\n", val); // 输出: x = 10

    // 也可以直接使用 = 和读取，编译器会自动原子化
    x = 20;          // 等价于 atomic_store(&x, 20)
    int v = x;       // 等价于 atomic_load(&x)
    printf("x = %d\n", v); // 输出: x = 20

    return 0;
}
```

### 原子算术操作

```c
#include <stdio.h>
#include <stdatomic.h>

int main(void) {
    atomic_int x = ATOMIC_VAR_INIT(10);

    // 原子加法，返回修改前的值
    int old = atomic_fetch_add(&x, 5);
    printf("旧值: %d, 新值: %d\n", old, atomic_load(&x)); // 旧值: 10, 新值: 15

    // 原子减法
    old = atomic_fetch_sub(&x, 3);
    printf("旧值: %d, 新值: %d\n", old, atomic_load(&x)); // 旧值: 15, 新值: 12

    // 原子按位或
    atomic_fetch_or(&x, 0x01);

    // 原子按位异或
    atomic_fetch_xor(&x, 0xFF);

    // 原子按位与
    atomic_fetch_and(&x, 0x0F);

    return 0;
}
```

### 原子比较交换（CAS）

比较交换（Compare-And-Swap）是原子操作中最核心的操作，也是无锁编程的基础：

```c
#include <stdio.h>
#include <stdatomic.h>

int main(void) {
    atomic_int x = ATOMIC_VAR_INIT(10);

    // atomic_compare_exchange_strong(&x, &expected, desired)
    // 如果 x == expected，则将 x 设为 desired，返回 true
    // 如果 x != expected，则将 expected 设为 x 的当前值，返回 false

    int expected = 10;
    int desired = 20;
    bool success = atomic_compare_exchange_strong(&x, &expected, desired);

    if (success) {
        printf("交换成功: x = %d\n", atomic_load(&x)); // x = 20
    }

    // 再次尝试，此时 x = 20，expected 仍为 10
    expected = 10;
    success = atomic_compare_exchange_strong(&x, &expected, desired);
    if (!success) {
        printf("交换失败: x = %d, expected 被更新为 %d\n",
               atomic_load(&x), expected); // expected = 20
    }

    return 0;
}
```

### atomic_flag 布尔原子类型

`atomic_flag` 是最简单的原子类型，只有"设置"和"清除"两个操作，常用于实现自旋锁：

```c
#include <stdio.h>
#include <stdatomic.h>

// atomic_flag 必须用 ATOMIC_FLAG_INIT 初始化
atomic_flag lock = ATOMIC_FLAG_INIT;

// 自旋锁的加锁操作
void spin_lock(atomic_flag *f) {
    // test_and_set: 如果之前未被设置，则设置并返回 false
    // 如果之前已被设置，则返回 true（表示锁已被占用）
    while (atomic_flag_test_and_set(f)) {
        // 自旋等待
    }
}

// 自旋锁的解锁操作
void spin_unlock(atomic_flag *f) {
    atomic_flag_clear(f); // 清除标志，释放锁
}

int main(void) {
    spin_lock(&lock);
    printf("临界区: 正在操作共享数据\n");
    spin_unlock(&lock);

    return 0;
}
```

## 常见场景

### 场景一：线程安全的引用计数

```c
#include <stdio.h>
#include <stdatomic.h>
#include <stdlib.h>

typedef struct {
    void *data;
    atomic_int ref_count;
} SharedObject;

// 创建共享对象
SharedObject *shared_create(void *data) {
    SharedObject *obj = malloc(sizeof(SharedObject));
    if (!obj) return NULL;
    obj->data = data;
    atomic_init(&obj->ref_count, 1);
    return obj;
}

// 增加引用计数
void shared_retain(SharedObject *obj) {
    if (obj) {
        atomic_fetch_add(&obj->ref_count, 1);
    }
}

// 减少引用计数，为0时释放
void shared_release(SharedObject *obj) {
    if (obj) {
        // 先减1，获取修改前的值
        int old_count = atomic_fetch_sub(&obj->ref_count, 1);
        if (old_count == 1) {
            // 引用计数降为0，释放资源
            printf("引用计数为0，释放对象\n");
            free(obj->data);
            free(obj);
        }
    }
}

int main(void) {
    int *value = malloc(sizeof(int));
    *value = 42;

    SharedObject *obj = shared_create(value);
    shared_retain(obj); // 引用计数变为2
    shared_release(obj); // 引用计数变为1
    shared_release(obj); // 引用计数变为0，对象被释放

    return 0;
}
```

### 场景二：使用 release/acquire 实现生产者-消费者同步

```c
#include <stdio.h>
#include <stdatomic.h>
#include <threads.h>

#define BUFFER_SIZE 10

int buffer[BUFFER_SIZE];
atomic_int ready = ATOMIC_VAR_INIT(0); // 同步标志

// 生产者线程
int producer(void *arg) {
    // 写入数据
    for (int i = 0; i < BUFFER_SIZE; i++) {
        buffer[i] = i * i;
    }

    // release 写入：确保上面的写入在设置 ready 之前完成
    atomic_store_explicit(&ready, 1, memory_order_release);
    return 0;
}

// 消费者线程
int consumer(void *arg) {
    // acquire 读取：确保在 ready 为1之后才读取 buffer
    while (atomic_load_explicit(&ready, memory_order_acquire) == 0) {
        // 等待生产者完成
    }

    // 此时 buffer 的数据一定可见
    for (int i = 0; i < BUFFER_SIZE; i++) {
        printf("buffer[%d] = %d\n", i, buffer[i]);
    }
    return 0;
}

int main(void) {
    thrd_t t1, t2;

    thrd_create(&t1, producer, NULL);
    thrd_create(&t2, consumer, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    return 0;
}
```

### 场景三：无锁栈的简单实现

```c
#include <stdio.h>
#include <stdatomic.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

typedef struct {
    _Atomic(Node *) head;
} LockFreeStack;

// 初始化栈
void stack_init(LockFreeStack *s) {
    atomic_init(&s->head, NULL);
}

// 压栈（原子操作）
void stack_push(LockFreeStack *s, int value) {
    Node *new_node = malloc(sizeof(Node));
    new_node->value = value;

    // CAS 循环：将新节点插入链表头部
    do {
        new_node->next = atomic_load(&s->head);
    } while (!atomic_compare_exchange_weak(&s->head, &new_node->next, new_node));
}

// 弹栈（原子操作）
int stack_pop(LockFreeStack *s, int *out_value) {
    Node *old_head = atomic_load(&s->head);

    // CAS 循环：移除链表头部节点
    do {
        if (old_head == NULL) {
            return -1; // 栈为空
        }
    } while (!atomic_compare_exchange_weak(&s->head, &old_head, old_head->next));

    *out_value = old_head->value;
    free(old_head);
    return 0;
}

int main(void) {
    LockFreeStack stack;
    stack_init(&stack);

    // 压入数据
    stack_push(&stack, 10);
    stack_push(&stack, 20);
    stack_push(&stack, 30);

    // 弹出数据
    int val;
    while (stack_pop(&stack, &val) == 0) {
        printf("弹出: %d\n", val);
    }

    return 0;
}
```

## 注意事项

### atomic_init 不是原子操作

`atomic_init` 仅用于初始化，不是原子操作。不要在多线程已经开始运行后使用它：

```c
atomic_int x;

// 正确：在创建线程之前初始化
atomic_init(&x, 0);

// 错误：在多线程运行中初始化
// atomic_init(&x, 0); // 数据竞争！
```

### 不是所有类型都支持原子操作

只有"平凡可复制"（trivially copyable）的类型才能用作原子类型。包含指针、数组或复杂结构的类型可能不支持：

```c
// 支持的类型
_Atomic int a;
_Atomic float b;
_Atomic void *c;

// 不一定支持的类型
struct Complex { char data[256]; };
_Atomic struct Complex d; // 取决于实现，可能不支持
```

### relaxed 内存序的局限

`memory_order_relaxed` 只保证原子性，不保证操作顺序。在需要同步的场景中不能使用：

```c
atomic_int flag = ATOMIC_VAR_INIT(0);
int data = 0;

// 线程1
data = 42;
atomic_store_explicit(&flag, 1, memory_order_relaxed); // 不保证 data 的写入在 flag 之前可见

// 线程2
if (atomic_load_explicit(&flag, memory_order_relaxed)) {
    printf("%d\n", data); // 可能输出0而非42！
}
```

### compare_exchange_weak vs strong

- `atomic_compare_exchange_weak`：可能产生虚假失败（spurious failure），即使在值相等时也可能返回 false。在循环中使用时性能更好
- `atomic_compare_exchange_strong`：不会产生虚假失败，适合不在循环中使用的场景

```c
// 循环中使用 weak 版本（性能更好）
do {
    expected = atomic_load(&x);
} while (!atomic_compare_exchange_weak(&x, &expected, desired));

// 非循环中使用 strong 版本（避免虚假失败）
int expected = 10;
if (atomic_compare_exchange_strong(&x, &expected, 20)) {
    printf("交换成功\n");
}
```

## 进阶用法

### 使用内存序优化性能

```c
#include <stdio.h>
#include <stdatomic.h>
#include <threads.h>

// 统计计数器：只需要原子性，不需要顺序保证
atomic_int total_requests = ATOMIC_VAR_INIT(0);
atomic_int total_errors = ATOMIC_VAR_INIT(0);

int worker(void *arg) {
    for (int i = 0; i < 1000000; i++) {
        // 使用 relaxed 内存序，性能更好
        atomic_fetch_add_explicit(&total_requests, 1, memory_order_relaxed);

        if (i % 1000 == 0) {
            atomic_fetch_add_explicit(&total_errors, 1, memory_order_relaxed);
        }
    }
    return 0;
}

int main(void) {
    thrd_t t1, t2;
    thrd_create(&t1, worker, NULL);
    thrd_create(&t2, worker, NULL);
    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    printf("总请求: %d\n", atomic_load_explicit(&total_requests, memory_order_relaxed));
    printf("总错误: %d\n", atomic_load_explicit(&total_errors, memory_order_relaxed));
    return 0;
}
```

### Double-Checked Locking 模式

```c
#include <stdio.h>
#include <stdatomic.h>
#include <threads.h>

typedef struct {
    int initialized;
    char data[256];
} Config;

Config *config_instance = NULL;
atomic_int config_ready = ATOMIC_VAR_INIT(0);

// 线程安全的延迟初始化
Config *get_config(void) {
    // 第一次检查：无锁快速路径
    if (atomic_load_explicit(&config_ready, memory_order_acquire) == 0) {
        // 这里可以加互斥锁，简化示例省略

        if (config_instance == NULL) {
            config_instance = malloc(sizeof(Config));
            // 初始化配置...
            snprintf(config_instance->data, sizeof(config_instance->data), "配置数据");

            // release 写入：确保初始化在设置标志之前完成
            atomic_store_explicit(&config_ready, 1, memory_order_release);
        }
    }

    return config_instance;
}

int main(void) {
    Config *cfg = get_config();
    printf("配置: %s\n", cfg->data);
    return 0;
}
```

### 原子操作实现读写锁

```c
#include <stdio.h>
#include <stdatomic.h>
#include <threads.h>

typedef struct {
    atomic_int readers;   // 当前读者数量
    atomic_int writer;    // 写者标志（0或1）
} RWLock;

void rwlock_init(RWLock *lock) {
    atomic_init(&lock->readers, 0);
    atomic_init(&lock->writer, 0);
}

// 获取读锁
void rwlock_read_lock(RWLock *lock) {
    while (1) {
        // 等待写者释放
        while (atomic_load_explicit(&lock->writer, memory_order_acquire)) {
            // 自旋等待
        }

        // 增加读者计数
        atomic_fetch_add_explicit(&lock->readers, 1, memory_order_acquire);

        // 再次确认没有写者
        if (atomic_load_explicit(&lock->writer, memory_order_acquire) == 0) {
            break; // 成功获取读锁
        }

        // 有写者介入，回退读者计数
        atomic_fetch_sub_explicit(&lock->readers, 1, memory_order_release);
    }
}

// 释放读锁
void rwlock_read_unlock(RWLock *lock) {
    atomic_fetch_sub_explicit(&lock->readers, 1, memory_order_release);
}

// 获取写锁
void rwlock_write_lock(RWLock *lock) {
    int expected = 0;
    while (!atomic_compare_exchange_strong_explicit(&lock->writer, &expected, 1,
            memory_order_acq_rel, memory_order_acquire)) {
        expected = 0; // 重置 expected
    }

    // 等待所有读者完成
    while (atomic_load_explicit(&lock->readers, memory_order_acquire) > 0) {
        // 自旋等待
    }
}

// 释放写锁
void rwlock_write_unlock(RWLock *lock) {
    atomic_store_explicit(&lock->writer, 0, memory_order_release);
}

int main(void) {
    RWLock lock;
    rwlock_init(&lock);

    rwlock_read_lock(&lock);
    printf("读取数据\n");
    rwlock_read_unlock(&lock);

    rwlock_write_lock(&lock);
    printf("写入数据\n");
    rwlock_write_unlock(&lock);

    return 0;
}
```
