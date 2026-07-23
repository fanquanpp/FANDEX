---
order: 65
title: POSIX线程
module: c
category: C
difficulty: advanced
description: pthread多线程编程
author: fanquanpp
updated: '2026-06-14'
related:
  - c/内联函数与宏
  - c/复杂声明解析
  - c/Socket网络编程
  - c/进程与管道
prerequisites:
  - c/概述
---

## 概述

POSIX线程（pthread）是Unix/Linux系统上的多线程编程接口，定义在 `<pthread.h>` 头文件中。多线程允许在同一进程内并发执行多个任务，线程之间共享地址空间，通信比进程间通信更高效，但需要同步机制来避免数据竞争。

## 基础概念

### 线程 vs 进程

| 特性     | 线程                     | 进程                    |
| -------- | ------------------------ | ----------------------- |
| 地址空间 | 共享                     | 独立                    |
| 创建开销 | 小                       | 大                      |
| 通信方式 | 共享变量                 | IPC（管道、共享内存等） |
| 切换开销 | 小                       | 大                      |
| 崩溃影响 | 一个线程崩溃影响整个进程 | 进程间相互隔离          |

### 线程安全的概念

当多个线程同时访问共享数据时，如果没有适当的同步机制，可能导致数据竞争和未定义行为。线程安全意味着代码在多线程环境下能正确运行。

### 核心同步原语

| 原语               | 说明                                 |
| ------------------ | ------------------------------------ |
| 互斥锁（mutex）    | 保护临界区，同一时刻只有一个线程进入 |
| 条件变量（cond）   | 线程等待/通知机制                    |
| 读写锁（rwlock）   | 允许多个读者或一个写者               |
| 自旋锁（spinlock） | 忙等待锁，适用于短临界区             |
| 屏障（barrier）    | 所有线程到达后一起继续               |

## 快速上手

### 创建线程

```c
#include <stdio.h>
#include <pthread.h>

// 线程函数：必须返回 void*，参数为 void*
void *thread_func(void *arg) {
    long id = (long)arg;
    printf("线程 %ld 运行中\n", id);
    return NULL;
}

int main(void) {
    pthread_t thread;

    // 创建线程
    pthread_create(&thread, NULL, thread_func, (void *)1);

    // 等待线程结束
    pthread_join(thread, NULL);

    printf("线程已结束\n");
    return 0;
}
```

### 使用互斥锁

```c
#include <stdio.h>
#include <pthread.h>

int counter = 0;
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;

void *increment(void *arg) {
    for (int i = 0; i < 100000; i++) {
        pthread_mutex_lock(&mutex);   // 加锁
        counter++;
        pthread_mutex_unlock(&mutex); // 解锁
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, increment, NULL);
    pthread_create(&t2, NULL, increment, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    printf("counter = %d\n", counter); // 一定是200000
    pthread_mutex_destroy(&mutex);
    return 0;
}
```

### 使用条件变量

```c
#include <stdio.h>
#include <pthread.h>

int data_ready = 0;
int data = 0;
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t cond = PTHREAD_COND_INITIALIZER;

// 消费者线程
void *consumer(void *arg) {
    pthread_mutex_lock(&mutex);
    while (!data_ready) {
        pthread_cond_wait(&cond, &mutex); // 等待条件满足
    }
    printf("消费数据: %d\n", data);
    data_ready = 0;
    pthread_mutex_unlock(&mutex);
    return NULL;
}

// 生产者线程
void *producer(void *arg) {
    pthread_mutex_lock(&mutex);
    data = 42;
    data_ready = 1;
    printf("生产数据: %d\n", data);
    pthread_cond_signal(&cond); // 通知消费者
    pthread_mutex_unlock(&mutex);
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, consumer, NULL);
    sleep(1); // 确保消费者先启动
    pthread_create(&t2, NULL, producer, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    pthread_mutex_destroy(&mutex);
    pthread_cond_destroy(&cond);
    return 0;
}
```

## 详细用法

### 线程属性

```c
#include <stdio.h>
#include <pthread.h>

void *thread_func(void *arg) {
    printf("线程运行中\n");
    return NULL;
}

int main(void) {
    pthread_attr_t attr;
    pthread_attr_init(&attr);

    // 设置为可连接状态（默认）
    pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_JOINABLE);

    // 设置栈大小
    size_t stack_size = 1024 * 1024; // 1MB
    pthread_attr_setstacksize(&attr, stack_size);

    pthread_t thread;
    pthread_create(&thread, &attr, thread_func, NULL);
    pthread_join(thread, NULL);

    pthread_attr_destroy(&attr);
    return 0;
}
```

### 分离线程

```c
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

void *background_task(void *arg) {
    for (int i = 0; i < 5; i++) {
        printf("后台任务: %d\n", i);
        sleep(1);
    }
    return NULL;
}

int main(void) {
    pthread_t thread;
    pthread_create(&thread, NULL, background_task, NULL);

    // 分离线程：不需要 join，线程结束后自动回收资源
    pthread_detach(thread);

    printf("主线程继续执行\n");
    sleep(6); // 等待后台任务完成
    return 0;
}
```

### 读写锁

```c
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

int shared_data = 0;
pthread_rwlock_t rwlock = PTHREAD_RWLOCK_INITIALIZER;

// 读者线程
void *reader(void *arg) {
    long id = (long)arg;
    for (int i = 0; i < 3; i++) {
        pthread_rwlock_rdlock(&rwlock);
        printf("读者 %ld: 数据 = %d\n", id, shared_data);
        pthread_rwlock_unlock(&rwlock);
        usleep(100000);
    }
    return NULL;
}

// 写者线程
void *writer(void *arg) {
    long id = (long)arg;
    for (int i = 0; i < 3; i++) {
        pthread_rwlock_wrlock(&rwlock);
        shared_data++;
        printf("写者 %ld: 数据 = %d\n", id, shared_data);
        pthread_rwlock_unlock(&rwlock);
        usleep(200000);
    }
    return NULL;
}

int main(void) {
    pthread_t threads[5];

    // 创建2个写者和3个读者
    pthread_create(&threads[0], NULL, writer, (void *)1);
    pthread_create(&threads[1], NULL, writer, (void *)2);
    pthread_create(&threads[2], NULL, reader, (void *)1);
    pthread_create(&threads[3], NULL, reader, (void *)2);
    pthread_create(&threads[4], NULL, reader, (void *)3);

    for (int i = 0; i < 5; i++) {
        pthread_join(threads[i], NULL);
    }

    pthread_rwlock_destroy(&rwlock);
    return 0;
}
```

### 线程特定数据（Thread-Local Storage）

```c
#include <stdio.h>
#include <pthread.h>

// 方式一：使用 __thread 关键字（GCC扩展）
static __thread int tls_value = 0;

// 方式二：使用 pthread_key_t
static pthread_key_t key;

void key_destructor(void *value) {
    free(value);
}

void *thread_func(void *arg) {
    long id = (long)arg;

    // 使用 __thread 变量
    tls_value = id * 10;
    printf("线程 %ld: tls_value = %d\n", id, tls_value);

    // 使用 pthread_key_t
    int *data = malloc(sizeof(int));
    *data = id * 100;
    pthread_setspecific(key, data);

    int *retrieved = pthread_getspecific(key);
    printf("线程 %ld: key_data = %d\n", id, *retrieved);

    return NULL;
}

int main(void) {
    pthread_key_create(&key, key_destructor);

    pthread_t t1, t2;
    pthread_create(&t1, NULL, thread_func, (void *)1);
    pthread_create(&t2, NULL, thread_func, (void *)2);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    pthread_key_delete(key);
    return 0;
}
```

## 常见场景

### 场景一：线程池

```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define THREAD_COUNT 4
#define TASK_COUNT 20

typedef struct {
    void (*func)(int);
    int arg;
} Task;

typedef struct {
    Task tasks[TASK_COUNT];
    int head, tail, count;
    pthread_mutex_t mutex;
    pthread_cond_t cond;
    int shutdown;
} TaskQueue;

TaskQueue queue = {
    .mutex = PTHREAD_MUTEX_INITIALIZER,
    .cond = PTHREAD_COND_INITIALIZER
};

void task_queue_push(Task task) {
    pthread_mutex_lock(&queue.mutex);
    queue.tasks[queue.tail] = task;
    queue.tail = (queue.tail + 1) % TASK_COUNT;
    queue.count++;
    pthread_cond_signal(&queue.cond);
    pthread_mutex_unlock(&queue.mutex);
}

Task task_queue_pop(void) {
    pthread_mutex_lock(&queue.mutex);
    while (queue.count == 0 && !queue.shutdown) {
        pthread_cond_wait(&queue.cond, &queue.mutex);
    }
    Task task = {0};
    if (queue.count > 0) {
        task = queue.tasks[queue.head];
        queue.head = (queue.head + 1) % TASK_COUNT;
        queue.count--;
    }
    pthread_mutex_unlock(&queue.mutex);
    return task;
}

void worker_task(int id) {
    printf("执行任务 %d (线程 %lu)\n", id, pthread_self());
}

void *worker(void *arg) {
    while (1) {
        Task task = task_queue_pop();
        if (queue.shutdown && queue.count == 0) break;
        if (task.func) task.func(task.arg);
    }
    return NULL;
}

int main(void) {
    pthread_t threads[THREAD_COUNT];
    for (int i = 0; i < THREAD_COUNT; i++) {
        pthread_create(&threads[i], NULL, worker, NULL);
    }

    for (int i = 0; i < TASK_COUNT; i++) {
        task_queue_push((Task){worker_task, i});
    }

    queue.shutdown = 1;
    pthread_cond_broadcast(&queue.cond);

    for (int i = 0; i < THREAD_COUNT; i++) {
        pthread_join(threads[i], NULL);
    }

    return 0;
}
```

### 场景二：生产者-消费者

```c
#include <stdio.h>
#include <pthread.h>

#define BUFFER_SIZE 10

int buffer[BUFFER_SIZE];
int in = 0, out = 0, count = 0;
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t not_full = PTHREAD_COND_INITIALIZER;
pthread_cond_t not_empty = PTHREAD_COND_INITIALIZER;

void *producer(void *arg) {
    for (int i = 1; i <= 20; i++) {
        pthread_mutex_lock(&mutex);
        while (count == BUFFER_SIZE) {
            pthread_cond_wait(&not_full, &mutex);
        }
        buffer[in] = i;
        printf("生产: %d (位置 %d)\n", i, in);
        in = (in + 1) % BUFFER_SIZE;
        count++;
        pthread_cond_signal(&not_empty);
        pthread_mutex_unlock(&mutex);
    }
    return NULL;
}

void *consumer(void *arg) {
    for (int i = 1; i <= 20; i++) {
        pthread_mutex_lock(&mutex);
        while (count == 0) {
            pthread_cond_wait(&not_empty, &mutex);
        }
        int item = buffer[out];
        printf("消费: %d (位置 %d)\n", item, out);
        out = (out + 1) % BUFFER_SIZE;
        count--;
        pthread_cond_signal(&not_full);
        pthread_mutex_unlock(&mutex);
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, producer, NULL);
    pthread_create(&t2, NULL, consumer, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
}
```

## 注意事项

### 条件变量必须配合互斥锁使用

条件变量的 `wait` 操作必须在持有锁的情况下调用，它会自动释放锁并等待，被唤醒时重新获取锁：

```c
// 正确用法
pthread_mutex_lock(&mutex);
while (!condition) {
    pthread_cond_wait(&cond, &mutex); // 自动释放锁，等待，重新获取锁
}
// 操作共享数据
pthread_mutex_unlock(&mutex);
```

### 使用 while 而非 if 检查条件

条件变量可能产生虚假唤醒，必须使用 `while` 循环重新检查条件：

```c
// 错误：可能被虚假唤醒
pthread_mutex_lock(&mutex);
if (!condition) {
    pthread_cond_wait(&cond, &mutex);
}
pthread_mutex_unlock(&mutex);

// 正确：使用 while 循环
pthread_mutex_lock(&mutex);
while (!condition) {
    pthread_cond_wait(&cond, &mutex);
}
pthread_mutex_unlock(&mutex);
```

### 避免死锁

死锁的常见原因：线程A持有锁1等待锁2，线程B持有锁2等待锁1。预防方法：

1. 所有线程按相同顺序获取锁
2. 使用 `trylock` 尝试获取锁，失败则释放已持有的锁
3. 尽量减少锁的粒度和持有时间

## 进阶用法

### 屏障同步

```c
#include <stdio.h>
#include <pthread.h>

#define THREAD_COUNT 4

pthread_barrier_t barrier;

void *worker(void *arg) {
    long id = (long)arg;
    printf("线程 %ld: 阶段1完成\n", id);

    // 等待所有线程完成阶段1
    pthread_barrier_wait(&barrier);

    printf("线程 %ld: 阶段2开始\n", id);

    // 等待所有线程完成阶段2
    pthread_barrier_wait(&barrier);

    printf("线程 %ld: 全部完成\n", id);
    return NULL;
}

int main(void) {
    pthread_barrier_init(&barrier, NULL, THREAD_COUNT);

    pthread_t threads[THREAD_COUNT];
    for (long i = 0; i < THREAD_COUNT; i++) {
        pthread_create(&threads[i], NULL, worker, (void *)i);
    }

    for (int i = 0; i < THREAD_COUNT; i++) {
        pthread_join(threads[i], NULL);
    }

    pthread_barrier_destroy(&barrier);
    return 0;
}
```

### 一次性初始化

```c
#include <stdio.h>
#include <pthread.h>

// 确保初始化函数只执行一次
static pthread_once_t once = PTHREAD_ONCE_INIT;
static int initialized_data;

void init_function(void) {
    printf("执行一次性初始化\n");
    initialized_data = 42;
}

void *thread_func(void *arg) {
    pthread_once(&once, init_function);
    printf("线程 %ld: 数据 = %d\n", (long)arg, initialized_data);
    return NULL;
}

int main(void) {
    pthread_t t1, t2, t3;
    pthread_create(&t1, NULL, thread_func, (void *)1);
    pthread_create(&t2, NULL, thread_func, (void *)2);
    pthread_create(&t3, NULL, thread_func, (void *)3);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    pthread_join(t3, NULL);
    return 0;
}
```

### 可取消的线程

```c
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

void cleanup_handler(void *arg) {
    printf("清理资源: %s\n", (char *)arg);
}

void *cancellable_thread(void *arg) {
    pthread_cleanup_push(cleanup_handler, "动态分配的内存");

    // 设置取消类型
    pthread_setcancelstate(PTHREAD_CANCEL_ENABLE, NULL);
    pthread_setcanceltype(PTHREAD_CANCEL_DEFERRED, NULL);

    while (1) {
        printf("工作中...\n");
        sleep(1);
        pthread_testcancel(); // 检查取消点
    }

    pthread_cleanup_pop(0);
    return NULL;
}

int main(void) {
    pthread_t thread;
    pthread_create(&thread, NULL, cancellable_thread, NULL);

    sleep(3);
    printf("请求取消线程\n");
    pthread_cancel(thread);
    pthread_join(thread, NULL);
    printf("线程已取消\n");
    return 0;
}
```
