---
order: 68
title: 共享内存与信号量
module: c
category: C
difficulty: advanced
description: 'System V与POSIX IPC'
author: fanquanpp
updated: '2026-06-14'
related:
  - c/Socket网络编程
  - c/进程与管道
  - c/文件系统操作
  - c/函数详解
prerequisites:
  - c/概述
---

## 概述

共享内存是进程间通信（IPC）中最快的方式，它允许多个进程访问同一块物理内存区域。由于进程的虚拟地址空间相互独立，共享内存避免了数据的复制，但需要配合信号量等同步机制来防止数据竞争。POSIX 标准提供了 shm_open/mmap 和信号量 API，System V 标准提供了 shmget/shmat 和信号量集 API。

## 基础概念

### 进程间通信方式对比

| 方式     | 速度 | 方向 | 适用场景       |
| -------- | ---- | ---- | -------------- |
| 管道     | 中等 | 单向 | 父子进程通信   |
| 命名管道 | 中等 | 单向 | 无亲缘关系进程 |
| 共享内存 | 最快 | 双向 | 大量数据交换   |
| 消息队列 | 中等 | 双向 | 结构化消息传递 |
| 信号     | 快   | 单向 | 异步通知       |
| Socket   | 较慢 | 双向 | 网络通信       |

### 为什么共享内存最快

其他IPC方式都需要内核作为中转：发送方将数据从用户空间复制到内核空间，接收方再从内核空间复制到用户空间。共享内存则直接映射同一块物理内存到多个进程的虚拟地址空间，省去了两次数据复制。

### 同步的必要性

共享内存本身不提供同步机制，如果两个进程同时写入同一块内存，会产生数据竞争。信号量（Semaphore）是最常用的同步工具，用于控制对共享资源的访问。

## 快速上手

### POSIX 共享内存基本流程

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <sys/stat.h>

#define SHM_NAME "/myshm"
#define SHM_SIZE 4096

int main(void) {
    // 步骤一：创建或打开共享内存对象
    int fd = shm_open(SHM_NAME, O_CREAT | O_RDWR, 0666);
    if (fd == -1) {
        perror("shm_open 失败");
        return 1;
    }

    // 步骤二：设置共享内存大小
    if (ftruncate(fd, SHM_SIZE) == -1) {
        perror("ftruncate 失败");
        return 1;
    }

    // 步骤三：映射共享内存到进程地址空间
    void *ptr = mmap(NULL, SHM_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (ptr == MAP_FAILED) {
        perror("mmap 失败");
        return 1;
    }

    // 步骤四：使用共享内存
    char *msg = (char *)ptr;
    snprintf(msg, SHM_SIZE, "来自进程 %d 的消息", getpid());
    printf("写入: %s\n", msg);

    // 步骤五：解除映射
    munmap(ptr, SHM_SIZE);
    close(fd);

    // 步骤六：删除共享内存对象
    shm_unlink(SHM_NAME);

    return 0;
}
```

### POSIX 信号量基本用法

```c
#include <stdio.h>
#include <fcntl.h>
#include <semaphore.h>

int main(void) {
    // 创建或打开命名信号量，初始值为1
    sem_t *sem = sem_open("/mysem", O_CREAT, 0666, 1);
    if (sem == SEM_FAILED) {
        perror("sem_open 失败");
        return 1;
    }

    // 获取信号量（P操作，值减1）
    sem_wait(sem);
    printf("进入临界区\n");

    // 临界区操作...

    // 释放信号量（V操作，值加1）
    sem_post(sem);
    printf("离开临界区\n");

    // 关闭信号量
    sem_close(sem);
    // 删除信号量
    sem_unlink("/mysem");

    return 0;
}
```

## 详细用法

### mmap 详解

```c
#include <sys/mman.h>

// mmap 函数原型
void *mmap(void *addr, size_t length, int prot, int flags, int fd, off_t offset);

// 参数说明：
// addr: 建议的映射地址，通常传 NULL 让内核选择
// length: 映射的长度（字节）
// prot: 内存保护标志
//   PROT_READ  - 可读
//   PROT_WRITE - 可写
//   PROT_EXEC  - 可执行
//   PROT_NONE  - 不可访问
// flags: 映射类型
//   MAP_SHARED  - 共享映射（修改对其他进程可见）
//   MAP_PRIVATE - 私有映射（写时复制）
//   MAP_ANONYMOUS - 匿名映射（不依赖文件）
// fd: 文件描述符（匿名映射时传 -1）
// offset: 文件偏移量（必须是页面大小的整数倍）
```

### 匿名共享内存（亲缘进程间）

```c
#include <stdio.h>
#include <string.h>
#include <sys/mman.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    // 创建匿名共享映射（不需要文件）
    char *shared = mmap(NULL, 256,
                        PROT_READ | PROT_WRITE,
                        MAP_SHARED | MAP_ANONYMOUS,
                        -1, 0);
    if (shared == MAP_FAILED) {
        perror("mmap 失败");
        return 1;
    }

    pid_t pid = fork();
    if (pid == 0) {
        // 子进程：写入数据
        snprintf(shared, 256, "子进程 PID=%d 的消息", getpid());
        printf("子进程已写入\n");
    } else {
        // 父进程：等待后读取
        wait(NULL); // 等待子进程结束
        printf("父进程读取: %s\n", shared);
    }

    munmap(shared, 256);
    return 0;
}
```

### 无名信号量（进程内线程间）

```c
#include <stdio.h>
#include <pthread.h>
#include <semaphore.h>

sem_t sem; // 无名信号量

void *thread_func(void *arg) {
    sem_wait(&sem); // 等待信号量
    printf("线程 %ld 获得信号量\n", (long)arg);
    sem_post(&sem); // 释放信号量
    return NULL;
}

int main(void) {
    // 初始化无名信号量，初始值为2（允许2个线程同时进入）
    sem_init(&sem, 0, 2);

    pthread_t threads[5];
    for (long i = 0; i < 5; i++) {
        pthread_create(&threads[i], NULL, thread_func, (void *)i);
    }

    for (int i = 0; i < 5; i++) {
        pthread_join(threads[i], NULL);
    }

    sem_destroy(&sem);
    return 0;
}
```

### System V 共享内存

```c
#include <stdio.h>
#include <string.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <unistd.h>

#define SHM_KEY 0x1234
#define SHM_SIZE 4096

int main(void) {
    // 创建共享内存段
    int shmid = shmget(SHM_KEY, SHM_SIZE, IPC_CREAT | 0666);
    if (shmid == -1) {
        perror("shmget 失败");
        return 1;
    }

    // 将共享内存附加到进程地址空间
    void *ptr = shmat(shmid, NULL, 0);
    if (ptr == (void *)-1) {
        perror("shmat 失败");
        return 1;
    }

    // 使用共享内存
    char *msg = (char *)ptr;
    snprintf(msg, SHM_SIZE, "System V 共享内存消息，PID=%d", getpid());
    printf("写入: %s\n", msg);

    // 分离共享内存
    shmdt(ptr);

    // 删除共享内存段
    shmctl(shmid, IPC_RMID, NULL);

    return 0;
}
```

## 常见场景

### 场景一：生产者-消费者模式

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <semaphore.h>
#include <unistd.h>

#define SHM_NAME "/prod_cons_shm"
#define SEM_MUTEX "/prod_cons_mutex"
#define SEM_EMPTY "/prod_cons_empty"
#define SEM_FULL "/prod_cons_full"
#define BUFFER_SIZE 10
#define SHM_SIZE (sizeof(int) * BUFFER_SIZE + sizeof(int) * 2)

// 共享内存结构
typedef struct {
    int buffer[BUFFER_SIZE];
    int in;     // 生产者写入位置
    int out;    // 消费者读取位置
} SharedBuffer;

int main(void) {
    // 创建共享内存
    int fd = shm_open(SHM_NAME, O_CREAT | O_RDWR, 0666);
    ftruncate(fd, sizeof(SharedBuffer));
    SharedBuffer *buf = mmap(NULL, sizeof(SharedBuffer),
                             PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    buf->in = 0;
    buf->out = 0;

    // 创建信号量
    sem_t *mutex = sem_open(SEM_MUTEX, O_CREAT, 0666, 1);    // 互斥锁
    sem_t *empty = sem_open(SEM_EMPTY, O_CREAT, 0666, BUFFER_SIZE); // 空槽位数
    sem_t *full = sem_open(SEM_FULL, O_CREAT, 0666, 0);      // 数据项数

    pid_t pid = fork();
    if (pid == 0) {
        // 子进程：生产者
        for (int i = 0; i < 20; i++) {
            sem_wait(empty);    // 等待空槽位
            sem_wait(mutex);    // 获取互斥锁

            buf->buffer[buf->in] = i;
            printf("生产: %d (位置 %d)\n", i, buf->in);
            buf->in = (buf->in + 1) % BUFFER_SIZE;

            sem_post(mutex);    // 释放互斥锁
            sem_post(full);     // 增加数据项数
            usleep(100000);     // 模拟生产耗时
        }
    } else {
        // 父进程：消费者
        for (int i = 0; i < 20; i++) {
            sem_wait(full);     // 等待数据项
            sem_wait(mutex);    // 获取互斥锁

            int item = buf->buffer[buf->out];
            printf("消费: %d (位置 %d)\n", item, buf->out);
            buf->out = (buf->out + 1) % BUFFER_SIZE;

            sem_post(mutex);    // 释放互斥锁
            sem_post(empty);    // 增加空槽位
            usleep(200000);     // 模拟消费耗时
        }

        wait(NULL);
    }

    // 清理
    munmap(buf, sizeof(SharedBuffer));
    close(fd);
    sem_close(mutex); sem_close(empty); sem_close(full);
    shm_unlink(SHM_NAME);
    sem_unlink(SEM_MUTEX); sem_unlink(SEM_EMPTY); sem_unlink(SEM_FULL);

    return 0;
}
```

### 场景二：共享内存配置中心

```c
#include <stdio.h>
#include <string.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <semaphore.h>
#include <unistd.h>

#define SHM_NAME "/config_shm"
#define SEM_NAME "/config_sem"

typedef struct {
    int server_port;
    int max_connections;
    int log_level;
    char server_name[64];
} SharedConfig;

// 写入配置
int write_config(const SharedConfig *cfg) {
    int fd = shm_open(SHM_NAME, O_CREAT | O_RDWR, 0666);
    ftruncate(fd, sizeof(SharedConfig));

    SharedConfig *shared = mmap(NULL, sizeof(SharedConfig),
                                PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);

    sem_t *sem = sem_open(SEM_NAME, O_CREAT, 0666, 1);
    sem_wait(sem);
    memcpy(shared, cfg, sizeof(SharedConfig));
    sem_post(sem);

    munmap(shared, sizeof(SharedConfig));
    close(fd);
    sem_close(sem);
    return 0;
}

// 读取配置
int read_config(SharedConfig *out) {
    int fd = shm_open(SHM_NAME, O_RDONLY, 0666);
    if (fd == -1) return -1;

    SharedConfig *shared = mmap(NULL, sizeof(SharedConfig),
                                PROT_READ, MAP_SHARED, fd, 0);

    sem_t *sem = sem_open(SEM_NAME, 0);
    sem_wait(sem);
    memcpy(out, shared, sizeof(SharedConfig));
    sem_post(sem);

    munmap(shared, sizeof(SharedConfig));
    close(fd);
    sem_close(sem);
    return 0;
}

int main(void) {
    // 写入配置
    SharedConfig cfg = {
        .server_port = 8080,
        .max_connections = 1000,
        .log_level = 2,
    };
    snprintf(cfg.server_name, sizeof(cfg.server_name), "MyServer");
    write_config(&cfg);
    printf("配置已写入\n");

    // 读取配置
    SharedConfig read_cfg;
    if (read_config(&read_cfg) == 0) {
        printf("端口: %d, 最大连接: %d, 服务器: %s\n",
               read_cfg.server_port, read_cfg.max_connections,
               read_cfg.server_name);
    }

    // 清理
    shm_unlink(SHM_NAME);
    sem_unlink(SEM_NAME);
    return 0;
}
```

## 注意事项

### 共享内存的持久性

POSIX 共享内存对象在所有进程关闭后仍然存在，直到显式调用 `shm_unlink` 或系统重启。如果忘记清理，会导致内存泄漏：

```c
// 程序退出前必须清理
shm_unlink("/myshm");
sem_unlink("/mysem");
```

### 名称限制

POSIX IPC 对象名称必须以斜杠开头，且不能包含其他斜杠：

```c
// 正确
shm_open("/myshm", ...);
sem_open("/mysem", ...);

// 错误
shm_open("myshm", ...);    // 某些系统要求以 / 开头
shm_open("/dir/myshm", ...); // 不能包含多级路径
```

### 信号量的值不能为负

`sem_wait` 会在信号量值为0时阻塞，直到其他进程调用 `sem_post`。如果需要等待多个资源，可以初始化信号量为更大的值。

### fork 后的共享内存

`fork` 后子进程继承父进程的内存映射，父子进程访问同一块共享内存：

```c
// fork 前 mmap
void *shared = mmap(NULL, size, PROT_READ | PROT_WRITE,
                    MAP_SHARED | MAP_ANONYMOUS, -1, 0);

pid_t pid = fork();
// 父子进程都能访问 shared，修改互相可见
```

## 进阶用法

### 使用共享内存实现进程间大文件传输

```c
#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <semaphore.h>
#include <unistd.h>
#include <string.h>

#define SHM_NAME "/file_transfer"
#define SEM_NAME "/file_transfer_sem"
#define CHUNK_SIZE (1024 * 1024) // 1MB 块

typedef struct {
    size_t total_size;    // 文件总大小
    size_t offset;        // 当前偏移
    size_t data_len;      // 当前块数据长度
    int done;             // 传输完成标志
    char data[CHUNK_SIZE]; // 数据缓冲区
} TransferBuffer;

int main(int argc, char *argv[]) {
    // 创建共享内存和信号量
    int fd = shm_open(SHM_NAME, O_CREAT | O_RDWR, 0666);
    ftruncate(fd, sizeof(TransferBuffer));
    TransferBuffer *buf = mmap(NULL, sizeof(TransferBuffer),
                               PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    sem_t *sem = sem_open(SEM_NAME, O_CREAT, 0666, 1);

    if (argc > 1) {
        // 发送方：读取文件并写入共享内存
        FILE *fp = fopen(argv[1], "rb");
        if (!fp) { perror("打开文件失败"); return 1; }

        fseek(fp, 0, SEEK_END);
        buf->total_size = ftell(fp);
        fseek(fp, 0, SEEK_SET);

        size_t bytes_read;
        while ((bytes_read = fread(buf->data, 1, CHUNK_SIZE, fp)) > 0) {
            sem_wait(sem);
            buf->data_len = bytes_read;
            buf->done = 0;
            sem_post(sem);

            // 等待接收方处理
            while (1) {
                sem_wait(sem);
                if (buf->done) { sem_post(sem); break; }
                sem_post(sem);
                usleep(1000);
            }
        }

        sem_wait(sem);
        buf->data_len = 0; // 标记传输结束
        buf->done = 0;
        sem_post(sem);

        fclose(fp);
        printf("文件传输完成\n");
    } else {
        // 接收方：从共享内存读取并写入文件
        FILE *fp = fopen("received.dat", "wb");

        while (1) {
            sem_wait(sem);
            if (buf->data_len == 0 && buf->total_size > 0) {
                sem_post(sem);
                break;
            }
            if (buf->data_len > 0) {
                fwrite(buf->data, 1, buf->data_len, fp);
                buf->done = 1;
            }
            sem_post(sem);
            usleep(1000);
        }

        fclose(fp);
        printf("文件接收完成\n");
    }

    munmap(buf, sizeof(TransferBuffer));
    close(fd);
    sem_close(sem);
    shm_unlink(SHM_NAME);
    sem_unlink(SEM_NAME);
    return 0;
}
```

### 环形缓冲区实现高效数据流

```c
#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <semaphore.h>
#include <string.h>
#include <unistd.h>

#define RING_SIZE 256
#define MSG_SIZE 128
#define SHM_NAME "/ring_buf"
#define SEM_MUTEX "/ring_mutex"
#define SEM_COUNT "/ring_count"

typedef struct {
    char messages[RING_SIZE][MSG_SIZE];
    int head;
    int tail;
    int count;
} RingBuffer;

// 向环形缓冲区写入消息
int ring_put(RingBuffer *rb, sem_t *mutex, sem_t *count, const char *msg) {
    sem_wait(mutex);
    if (rb->count >= RING_SIZE) {
        sem_post(mutex);
        return -1; // 缓冲区满
    }
    snprintf(rb->messages[rb->head], MSG_SIZE, "%s", msg);
    rb->head = (rb->head + 1) % RING_SIZE;
    rb->count++;
    sem_post(mutex);
    sem_post(count); // 通知有新消息
    return 0;
}

// 从环形缓冲区读取消息
int ring_get(RingBuffer *rb, sem_t *mutex, sem_t *count, char *out) {
    sem_wait(count); // 等待有消息
    sem_wait(mutex);
    snprintf(out, MSG_SIZE, "%s", rb->messages[rb->tail]);
    rb->tail = (rb->tail + 1) % RING_SIZE;
    rb->count--;
    sem_post(mutex);
    return 0;
}

int main(void) {
    int fd = shm_open(SHM_NAME, O_CREAT | O_RDWR, 0666);
    ftruncate(fd, sizeof(RingBuffer));
    RingBuffer *rb = mmap(NULL, sizeof(RingBuffer),
                          PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    rb->head = rb->tail = rb->count = 0;

    sem_t *mutex = sem_open(SEM_MUTEX, O_CREAT, 0666, 1);
    sem_t *count = sem_open(SEM_COUNT, O_CREAT, 0666, 0);

    pid_t pid = fork();
    if (pid == 0) {
        // 子进程：写入消息
        for (int i = 0; i < 50; i++) {
            char msg[MSG_SIZE];
            snprintf(msg, MSG_SIZE, "消息 #%d", i);
            ring_put(rb, mutex, count, msg);
            printf("写入: %s\n", msg);
            usleep(50000);
        }
    } else {
        // 父进程：读取消息
        for (int i = 0; i < 50; i++) {
            char msg[MSG_SIZE];
            ring_get(rb, mutex, count, msg);
            printf("读取: %s\n", msg);
        }
    }

    munmap(rb, sizeof(RingBuffer));
    close(fd);
    sem_close(mutex); sem_close(count);
    shm_unlink(SHM_NAME);
    sem_unlink(SEM_MUTEX); sem_unlink(SEM_COUNT);
    return 0;
}
```
