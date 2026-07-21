---
order: 64
title: 线程与并发
module: c
category: C
difficulty: advanced
description: C11线程与并发原语
author: fanquanpp
updated: '2026-06-14'
related:
  - c/原子操作与内存模型
  - c/POSIX线程
  - c/信号处理
  - c/函数指针与回调
prerequisites:
  - c/概述
---

## 概述

C11 标准引入了 `<threads.h>` 头文件，提供了标准化的线程和并发支持，包括线程创建与管理、互斥锁、条件变量和线程局部存储。与 POSIX 线程（pthread）不同，C11 线程是语言标准的一部分，理论上可以在任何符合 C11 标准的编译器上使用，无需依赖特定操作系统的 API。

## 基础概念

### C11 线程 vs POSIX 线程

| 特性     | C11 线程       | POSIX 线程      |
| -------- | -------------- | --------------- |
| 标准     | ISO C11        | POSIX.1         |
| 可移植性 | 理论上更好     | Unix/Linux 专属 |
| 功能     | 基本线程操作   | 更丰富          |
| 支持情况 | 部分编译器支持 | 广泛支持        |
| 头文件   | `<threads.h>`  | `<pthread.h>`   |

### C11 并发组件

| 组件        | 说明             |
| ----------- | ---------------- |
| `thrd_t`    | 线程标识符       |
| `mtx_t`     | 互斥锁           |
| `cnd_t`     | 条件变量         |
| `tss_t`     | 线程特定存储     |
| `once_flag` | 一次性初始化标志 |

## 快速上手

### 创建线程

```c
#include <stdio.h>
#include <threads.h>

// 线程函数：返回 int，参数为 void*
int thread_func(void *arg) {
    long id = (long)arg;
    printf("线程 %ld 运行中\n", id);
    return 0; // 返回线程结果
}

int main(void) {
    thrd_t thread;

    // 创建线程
    int ret = thrd_create(&thread, thread_func, (void *)1);
    if (ret != thrd_success) {
        printf("线程创建失败\n");
        return 1;
    }

    // 等待线程结束
    int result;
    thrd_join(thread, &result);
    printf("线程返回: %d\n", result);

    return 0;
}
```

### 使用互斥锁

```c
#include <stdio.h>
#include <threads.h>

int counter = 0;
mtx_t mutex;

int increment(void *arg) {
    for (int i = 0; i < 100000; i++) {
        mtx_lock(&mutex);     // 加锁
        counter++;
        mtx_unlock(&mutex);   // 解锁
    }
    return 0;
}

int main(void) {
    // 初始化互斥锁
    mtx_init(&mutex, mtx_plain);

    thrd_t t1, t2;
    thrd_create(&t1, increment, NULL);
    thrd_create(&t2, increment, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    printf("counter = %d\n", counter); // 一定是200000

    mtx_destroy(&mutex);
    return 0;
}
```

## 详细用法

### 互斥锁类型

```c
// 普通互斥锁
mtx_t mtx1;
mtx_init(&mtx1, mtx_plain);

// 支持递归的互斥锁（同一线程可多次加锁）
mtx_t mtx2;
mtx_init(&mtx2, mtx_recursive);

// 带超时的互斥锁
mtx_t mtx3;
mtx_init(&mtx3, mtx_timed);

// 尝试加锁（非阻塞）
if (mtx_trylock(&mtx1) == thrd_success) {
    // 成功获取锁
    mtx_unlock(&mtx1);
} else {
    // 锁被占用
}
```

### 条件变量

```c
#include <stdio.h>
#include <threads.h>

int data_ready = 0;
int data = 0;
mtx_t mutex;
cnd_t cond;

// 消费者线程
int consumer(void *arg) {
    mtx_lock(&mutex);
    while (!data_ready) {
        cnd_wait(&cond, &mutex); // 等待条件满足
    }
    printf("消费数据: %d\n", data);
    mtx_unlock(&mutex);
    return 0;
}

// 生产者线程
int producer(void *arg) {
    mtx_lock(&mutex);
    data = 42;
    data_ready = 1;
    printf("生产数据: %d\n", data);
    cnd_signal(&cond); // 通知一个等待的线程
    mtx_unlock(&mutex);
    return 0;
}

int main(void) {
    mtx_init(&mutex, mtx_plain);
    cnd_init(&cond);

    thrd_t t1, t2;
    thrd_create(&t1, consumer, NULL);
    thrd_sleep(&(struct timespec){.tv_sec=1}, NULL); // 等待1秒
    thrd_create(&t2, producer, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    mtx_destroy(&mutex);
    cnd_destroy(&cond);
    return 0;
}
```

### 线程局部存储

```c
#include <stdio.h>
#include <threads.h>

// 方式一：使用 _Thread_local 关键字
static _Thread_local int tls_value = 0;

// 方式二：使用 tss_t
static tss_t tss_key;

void tss_destructor(void *val) {
    free(val);
}

int thread_func(void *arg) {
    long id = (long)arg;

    // 使用 _Thread_local
    tls_value = id * 10;
    printf("线程 %ld: tls_value = %d\n", id, tls_value);

    // 使用 tss_t
    int *data = malloc(sizeof(int));
    *data = id * 100;
    tss_set(tss_key, data);

    int *retrieved = tss_get(tss_key);
    printf("线程 %ld: tss_data = %d\n", id, *retrieved);

    return 0;
}

int main(void) {
    tss_create(&tss_key, tss_destructor);

    thrd_t t1, t2;
    thrd_create(&t1, thread_func, (void *)1);
    thrd_create(&t2, thread_func, (void *)2);
    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    tss_delete(tss_key);
    return 0;
}
```

### 一次性初始化

```c
#include <stdio.h>
#include <threads.h>

static once_flag init_flag = ONCE_FLAG_INIT;
static int initialized_data;

void init_function(void) {
    printf("执行一次性初始化\n");
    initialized_data = 42;
}

int thread_func(void *arg) {
    call_once(&init_flag, init_function);
    printf("线程 %ld: 数据 = %d\n", (long)arg, initialized_data);
    return 0;
}

int main(void) {
    thrd_t t1, t2, t3;
    thrd_create(&t1, thread_func, (void *)1);
    thrd_create(&t2, thread_func, (void *)2);
    thrd_create(&t3, thread_func, (void *)3);
    thrd_join(t1, NULL);
    thrd_join(t2, NULL);
    thrd_join(t3, NULL);
    return 0;
}
```

## 常见场景

### 场景一：线程安全的队列

```c
#include <stdio.h>
#include <stdlib.h>
#include <threads.h>

#define QUEUE_SIZE 10

typedef struct {
    int data[QUEUE_SIZE];
    int head, tail, count;
    mtx_t mutex;
    cnd_t not_full;
    cnd_t not_empty;
} ThreadQueue;

void queue_init(ThreadQueue *q) {
    q->head = q->tail = q->count = 0;
    mtx_init(&q->mutex, mtx_plain);
    cnd_init(&q->not_full);
    cnd_init(&q->not_empty);
}

void queue_push(ThreadQueue *q, int value) {
    mtx_lock(&q->mutex);
    while (q->count == QUEUE_SIZE) {
        cnd_wait(&q->not_full, &q->mutex);
    }
    q->data[q->head] = value;
    q->head = (q->head + 1) % QUEUE_SIZE;
    q->count++;
    cnd_signal(&q->not_empty);
    mtx_unlock(&q->mutex);
}

int queue_pop(ThreadQueue *q) {
    mtx_lock(&q->mutex);
    while (q->count == 0) {
        cnd_wait(&q->not_empty, &q->mutex);
    }
    int value = q->data[q->tail];
    q->tail = (q->tail + 1) % QUEUE_SIZE;
    q->count--;
    cnd_signal(&q->not_full);
    mtx_unlock(&q->mutex);
    return value;
}

void queue_destroy(ThreadQueue *q) {
    mtx_destroy(&q->mutex);
    cnd_destroy(&q->not_full);
    cnd_destroy(&q->not_empty);
}

ThreadQueue queue;

int producer(void *arg) {
    for (int i = 1; i <= 20; i++) {
        queue_push(&queue, i);
        printf("生产: %d\n", i);
    }
    return 0;
}

int consumer(void *arg) {
    for (int i = 1; i <= 20; i++) {
        int val = queue_pop(&queue);
        printf("消费: %d\n", val);
    }
    return 0;
}

int main(void) {
    queue_init(&queue);

    thrd_t t1, t2;
    thrd_create(&t1, producer, NULL);
    thrd_create(&t2, consumer, NULL);
    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    queue_destroy(&queue);
    return 0;
}
```

### 场景二：并行计算

```c
#include <stdio.h>
#include <threads.h>

typedef struct {
    const double *data;
    int start, end;
    double result;
} SumTask;

int sum_worker(void *arg) {
    SumTask *task = (SumTask *)arg;
    double sum = 0.0;
    for (int i = task->start; i < task->end; i++) {
        sum += task->data[i];
    }
    task->result = sum;
    return 0;
}

double parallel_sum(const double *data, int n, int num_threads) {
    SumTask tasks[16]; // 最多16个线程
    thrd_t threads[16];

    if (num_threads > 16) num_threads = 16;
    int chunk = n / num_threads;

    for (int i = 0; i < num_threads; i++) {
        tasks[i].data = data;
        tasks[i].start = i * chunk;
        tasks[i].end = (i == num_threads - 1) ? n : (i + 1) * chunk;
        thrd_create(&threads[i], sum_worker, &tasks[i]);
    }

    double total = 0.0;
    for (int i = 0; i < num_threads; i++) {
        thrd_join(threads[i], NULL);
        total += tasks[i].result;
    }

    return total;
}

int main(void) {
    double data[1000];
    for (int i = 0; i < 1000; i++) data[i] = i + 1;

    double sum = parallel_sum(data, 1000, 4);
    printf("总和: %.0f\n", sum); // 500500
    return 0;
}
```

### 场景三：读写锁模式

```c
#include <stdio.h>
#include <threads.h>

// 使用互斥锁和条件变量实现读写锁
typedef struct {
    mtx_t mutex;
    cnd_t readers_ok;
    cnd_t writers_ok;
    int readers;
    int writers;
    int waiting_writers;
} RWLock;

void rwlock_init(RWLock *rw) {
    mtx_init(&rw->mutex, mtx_plain);
    cnd_init(&rw->readers_ok);
    cnd_init(&rw->writers_ok);
    rw->readers = 0;
    rw->writers = 0;
    rw->waiting_writers = 0;
}

void rwlock_read_lock(RWLock *rw) {
    mtx_lock(&rw->mutex);
    while (rw->writers > 0 || rw->waiting_writers > 0) {
        cnd_wait(&rw->readers_ok, &rw->mutex);
    }
    rw->readers++;
    mtx_unlock(&rw->mutex);
}

void rwlock_read_unlock(RWLock *rw) {
    mtx_lock(&rw->mutex);
    rw->readers--;
    if (rw->readers == 0) {
        cnd_signal(&rw->writers_ok);
    }
    mtx_unlock(&rw->mutex);
}

void rwlock_write_lock(RWLock *rw) {
    mtx_lock(&rw->mutex);
    rw->waiting_writers++;
    while (rw->readers > 0 || rw->writers > 0) {
        cnd_wait(&rw->writers_ok, &rw->mutex);
    }
    rw->waiting_writers--;
    rw->writers++;
    mtx_unlock(&rw->mutex);
}

void rwlock_write_unlock(RWLock *rw) {
    mtx_lock(&rw->mutex);
    rw->writers--;
    cnd_broadcast(&rw->readers_ok);
    cnd_signal(&rw->writers_ok);
    mtx_unlock(&rw->mutex);
}

void rwlock_destroy(RWLock *rw) {
    mtx_destroy(&rw->mutex);
    cnd_destroy(&rw->readers_ok);
    cnd_destroy(&rw->writers_ok);
}
```

## 注意事项

### C11 线程的支持情况

截至2025年，C11 线程的支持情况：

- GCC: 通过 `-std=c11 -pthread` 部分支持
- Clang: 部分支持
- MSVC: 不支持 `<threads.h>`
- musl libc: 完整支持

在不支持 C11 线程的平台上，可以使用 pthread 或 Windows 线程 API 作为替代。

### thrd_sleep 的使用

```c
// 休眠1秒
struct timespec ts = {.tv_sec = 1, .tv_nsec = 0};
thrd_sleep(&ts, NULL);

// 休眠500毫秒
struct timespec ts2 = {.tv_sec = 0, .tv_nsec = 500000000};
thrd_sleep(&ts2, NULL);
```

### 条件变量的虚假唤醒

与 pthread 一样，C11 条件变量也可能产生虚假唤醒，必须使用 `while` 循环检查条件：

```c
mtx_lock(&mutex);
while (!condition) {
    cnd_wait(&cond, &mutex);
}
mtx_unlock(&mutex);
```

## 进阶用法

### 线程池

```c
#include <stdio.h>
#include <stdlib.h>
#include <threads.h>

#define THREAD_COUNT 4
#define TASK_COUNT 20

typedef struct {
    void (*func)(int);
    int arg;
} Task;

typedef struct {
    Task tasks[TASK_COUNT];
    int head, tail, count;
    mtx_t mutex;
    cnd_t cond;
    int shutdown;
} TaskQueue;

TaskQueue queue;

void queue_init(TaskQueue *q) {
    q->head = q->tail = q->count = q->shutdown = 0;
    mtx_init(&q->mutex, mtx_plain);
    cnd_init(&q->cond);
}

void queue_push(TaskQueue *q, Task task) {
    mtx_lock(&q->mutex);
    q->tasks[q->tail] = task;
    q->tail = (q->tail + 1) % TASK_COUNT;
    q->count++;
    cnd_signal(&q->cond);
    mtx_unlock(&q->mutex);
}

Task queue_pop(TaskQueue *q) {
    mtx_lock(&q->mutex);
    while (q->count == 0 && !q->shutdown) {
        cnd_wait(&q->cond, &q->mutex);
    }
    Task task = {0};
    if (q->count > 0) {
        task = q->tasks[q->head];
        q->head = (q->head + 1) % TASK_COUNT;
        q->count--;
    }
    mtx_unlock(&q->mutex);
    return task;
}

void worker_task(int id) {
    printf("执行任务 %d\n", id);
}

int worker(void *arg) {
    while (1) {
        Task task = queue_pop(&queue);
        if (queue.shutdown && queue.count == 0) break;
        if (task.func) task.func(task.arg);
    }
    return 0;
}

int main(void) {
    queue_init(&queue);

    thrd_t threads[THREAD_COUNT];
    for (int i = 0; i < THREAD_COUNT; i++) {
        thrd_create(&threads[i], worker, NULL);
    }

    for (int i = 0; i < TASK_COUNT; i++) {
        queue_push(&queue, (Task){worker_task, i});
    }

    queue.shutdown = 1;
    cnd_broadcast(&queue.cond);

    for (int i = 0; i < THREAD_COUNT; i++) {
        thrd_join(threads[i], NULL);
    }

    mtx_destroy(&queue.mutex);
    cnd_destroy(&queue.cond);
    return 0;
}
```

### 使用 C11 原子操作与线程配合

```c
#include <stdio.h>
#include <threads.h>
#include <stdatomic.h>

// 原子标志用于线程间简单同步
atomic_int done = ATOMIC_VAR_INIT(0);

int background_work(void *arg) {
    printf("后台工作开始\n");
    struct timespec ts = {.tv_sec = 2};
    thrd_sleep(&ts, NULL);
    printf("后台工作完成\n");
    atomic_store(&done, 1);
    return 0;
}

int main(void) {
    thrd_t thread;
    thrd_create(&thread, background_work, NULL);

    // 主线程轮询等待
    while (!atomic_load(&done)) {
        printf("等待中...\n");
        struct timespec ts = {.tv_sec = 0, .tv_nsec = 500000000};
        thrd_sleep(&ts, NULL);
    }

    thrd_join(thread, NULL);
    printf("全部完成\n");
    return 0;
}
```

### 兼容性封装层

```c
// c11_threads_compat.h - 在不支持C11线程的平台上使用pthread替代
#ifndef C11_THREADS_COMPAT_H
#define C11_THREADS_COMPAT_H

#ifdef __STDC_NO_THREADS__
    // 平台不支持 <threads.h>，使用 pthread 替代
    #include <pthread.h>

    typedef pthread_t thrd_t;
    typedef int (*thrd_start_t)(void *);

    typedef struct {
        thrd_start_t func;
        void *arg;
    } thrd_wrapper_ctx;

    static void *thrd_wrapper(void *arg) {
        thrd_wrapper_ctx *ctx = (thrd_wrapper_ctx *)arg;
        int result = ctx->func(ctx->arg);
        free(ctx);
        return (void *)(long)result;
    }

    static inline int thrd_create(thrd_t *thr, thrd_start_t func, void *arg) {
        thrd_wrapper_ctx *ctx = malloc(sizeof(thrd_wrapper_ctx));
        ctx->func = func;
        ctx->arg = arg;
        return pthread_create(thr, NULL, thrd_wrapper, ctx) == 0 ? 0 : -1;
    }

    static inline int thrd_join(thrd_t thr, int *res) {
        void *retval;
        int ret = pthread_join(thr, &retval);
        if (res) *res = (int)(long)retval;
        return ret == 0 ? 0 : -1;
    }
#else
    #include <threads.h>
#endif

#endif
```
