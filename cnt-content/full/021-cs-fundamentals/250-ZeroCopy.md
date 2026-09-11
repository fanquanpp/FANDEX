---
order: 250
title: 零拷贝
module: 'cs-fundamentals'
category: 计算机科学
difficulty: intermediate
description: 零拷贝技术：sendfile、mmap、splice 的原理与性能对比。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cs-fundamentals/230-FileSystemInode'
  - 'cs-fundamentals/240-DiskScheduling'
  - 'cs-fundamentals/260-IPC'
  - 'cs-fundamentals/320-HTTPCacheStrategy'
prerequisites:
  - 'cs-fundamentals/010-ComputerOverview'
---

## 前置知识

- 用户态与内核态、系统调用的开销（见 [中断与系统调用](cs-fundamentals/190-InterruptAndSystemCall)）；
- 文件读写经由页缓存（page cache）的事实（见 [文件系统 inode](cs-fundamentals/230-FileSystemInode)）；
- DMA 的概念：设备与内存之间不经 CPU 搬运数据的机制。

## 学习目标

- 数清"读文件并发送到网络"这条路径上发生了几次拷贝、几次上下文切换；
- 理解 sendfile / mmap+write / splice 三条优化路线各自的拷贝次数与适用边界；
- 知道 scatter-gather DMA 如何把 sendfile 压到"零 CPU 拷贝"；
- 理解 Kafka、Nginx 等系统使用零拷贝的场景与限制。

## 1. 概念引入：快递为什么要倒五次手

一个类比：把一份文件从档案室（磁盘）寄给外地的收件人（网卡）。最朴素的流程是：档案员把文件抄到便签（内核缓冲区），转交前台（用户缓冲区），前台再抄回给收发室（socket 缓冲区），收发室最后交给快递车（网卡）。同一段内容被**抄写了四次**，且每一步都要"找人签字"（上下文切换）。

"零拷贝"并非绝对一次都不拷贝，而是指：**数据不在内核与用户态之间来回搬运，CPU 不再为字节搬家买单**——把拷贝留给 DMA，把 CPU 留给业务逻辑。

## 2. 传统路径：read + write 的四次拷贝

把磁盘文件发给网络套接字，最常见的写法：

```c
char buf[4096];
while ((n = read(file_fd, buf, sizeof(buf))) > 0)   /* 系统调用 1 */
    write(sock_fd, buf, n);                          /* 系统调用 2 */
```

这条朴素路径的完整旅程：

```mermaid
flowchart LR
    D["磁盘"] -- "1. DMA 拷贝" --> K["内核页缓存"]
    K -- "2. CPU 拷贝" --> U["用户缓冲区 buf"]
    U -- "3. CPU 拷贝" --> S["socket 缓冲区"]
    S -- "4. DMA 拷贝" --> N["网卡"]
```

| 步骤 | 由谁执行 | 说明 |
| ---- | -------- | ---- |
| 1 磁盘 -> 页缓存 | DMA | 绕过 CPU |
| 2 页缓存 -> 用户 buf | CPU | `read` 返回时搬运 |
| 3 用户 buf -> socket 缓冲区 | CPU | `write` 时搬运 |
| 4 socket 缓冲区 -> 网卡 | DMA | 绕过 CPU |

加上系统调用本身：`read` 一次用户态->内核态切换，返回一次；`write` 同理——**共 4 次拷贝、4 次上下文切换**。其中第 2、3 两次纯 CPU 拷贝对业务毫无意义（数据在用户态根本没被加工），发送 1GB 文件就要白白搬家 2GB 内存带宽。

## 3. 零拷贝的三条路线

### 3.1 mmap + write：共享映射省一次拷贝

`mmap` 把页缓存直接映射进用户地址空间，`write` 从映射区发送：

```c
char *addr = mmap(NULL, len, PROT_READ, MAP_SHARED, file_fd, 0); /* 映射页缓存 */
write(sock_fd, addr, len);   /* 页缓存 -> socket 缓冲区，仅一次 CPU 拷贝 */
munmap(addr, len);
```

拷贝从 4 次降到 3 次（DMA、CPU、DMA），省去"页缓存 -> 用户 buf"的搬运；上下文切换仍是 4 次。代价与风险：

- 映射大文件会增加页表与 TLB 压力（见 [内存分段与分页](cs-fundamentals/210-MemorySegmentationAndPaging)）；
- 若发送过程中文件被截断，映射区访问触发 SIGBUS，需要信号处理或保持文件句柄稳定。

适合**需要对数据做部分加工**再发出的场景——mmap 保留了用户态直接读数据的能力，这是纯 sendfile 做不到的。

### 3.2 sendfile：一条系统调用直达网卡

Linux 2.1 引入 `sendfile`，把"读 + 写"合并为一次系统调用，且数据全程不出内核：

```c
#include <sys/sendfile.h>
/* out_fd 为 socket，in_fd 为文件；数据在内核内直接流转 */
sendfile(sock_fd, file_fd, &offset, count);
```

拷贝降为 3 次（DMA、内核内 CPU 拷贝页缓存->socket 缓冲区、DMA），上下文切换降为 **2 次**。若网卡支持 **scatter-gather（SG-DMA）**并开启 `ethtool -K eth0 sg on`，内核只把"缓存描述符"（地址 + 长度）追加到 socket 缓冲区，由网卡 DMA 直接从页缓存取数——CPU 拷贝彻底消失：

| 方案 | CPU 拷贝 | DMA 拷贝 | 上下文切换 |
| ---- | -------- | -------- | ---------- |
| read + write | 2 | 2 | 4 |
| mmap + write | 1 | 2 | 4 |
| sendfile | 1 | 2 | 2 |
| sendfile + SG-DMA | **0** | 2 | 2 |

限制：sendfile 只做纯转发，out_fd 在经典用法下须是支持该功能的套接字（或设备），不能对 out_fd 做 `fsync` 之类的精细控制；发送途中无法修改数据（如加密），这也是 TLS 场景早期不能直接受益的原因。

### 3.3 splice：以管道为中介的零拷贝

`splice` 在任意两个文件描述符（其一必须是管道）之间移动数据，同样全程留在内核：

```c
int pfd[2];
pipe(pfd);
splice(file_fd, &off, pfd[1], NULL, len, SPLICE_F_MOVE); /* 文件 -> 管道 */
splice(pfd[0], NULL, sock_fd, NULL, len, SPLICE_F_MOVE); /* 管道 -> socket */
```

它比 sendfile 通用（输入/输出可以是任意文件、socket、管道），nginx、HAProxy 等都曾用它实现文件到 socket 的零拷贝。代价是需要额外建管道、两次调用，编码复杂度更高。

## 4. 完整示例：观察并对比真实开销

```c
/* sendfile_demo.c：传统 read/write 与 sendfile 发送同一文件 */
#define _GNU_SOURCE
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/sendfile.h>
#include <sys/stat.h>
#include <time.h>

static long now_ns(void) {
    struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000000000L + ts.tv_nsec;
}

int main(void) {
    const char *path = "bigfile.bin";   /* 先 dd if=/dev/zero of=bigfile.bin bs=1M count=256 造文件 */
    struct stat st; stat(path, &st);
    off_t off = 0; char buf[1 << 16];
    int fd = open(path, O_RDONLY);

    /* 方式一：read + write，数据绕经用户态 */
    long t0 = now_ns();
    ssize_t n;
    while ((n = read(fd, buf, sizeof(buf))) > 0)
        write(STDOUT_FILENO, buf, n);   /* 此处以标准输出代替 socket 演示 */
    printf("read/write 耗时 %ld ms\n", (now_ns() - t0) / 1000000);

    /* 方式二：sendfile，数据全程留在内核 */
    lseek(fd, 0, SEEK_SET); off = 0;
    t0 = now_ns();
    while (sendfile(STDOUT_FILENO, fd, &off, st.st_size) > 0)
        ;
    printf("sendfile   耗时 %ld ms\n", (now_ns() - t0) / 1000000);
    close(fd);
    return 0;
}
```

用 `strace -c` 分别统计两种方式一次系统调用计数，可以看到 sendfile 路径的 syscall 次数与 copy 类调用显著减少。在真实 socket + 大文件压测下，sendfile 相比 read/write 的吞吐提升通常在 20%-80% 之间（取决于文件大小、缓存命中与网卡 SG-DMA 支持情况，不必迷信固定数字）。

## 5. 应用实例

### 5.1 Kafka

Kafka 消费者拉取消息是典型的"磁盘文件 -> 网络"纯转发。当消费者请求的数据与磁盘文件布局对齐（顺序段文件、无转换）时，broker 走 `FileRecords.writeTo` -> `sendfile`，CPU 几乎不参与数据搬运——这是 Kafka 顺序写 + 零拷贝两大招牌之一。注意：消息需要转换（如压缩、加密代理层介入）时该路径会退化为普通拷贝。

### 5.2 Nginx

`nginx.conf` 中 `sendfile on;` 使静态文件响应对应 socket 直送；配合 `tcp_nopush` 在发送前攒够一个段，减少小包。动态内容（代理、压缩）则天然用不上零拷贝，因为数据必须先被修改。

### 5.3 用不上的场景

- **需要修改数据**：加密、压缩、协议转换都会引入用户态加工，零拷贝的前提"原样转发"不成立。TLS 流量在内核 TLS（kTLS）出现前无法用 sendfile；Linux 4.17+ 的 kTLS 使 sendfile 重新可用于加密流。
- **小文件、短连接**：连接建立与 TLS 握手的开销远大于拷贝本身，优化方向应是连接复用。
- **非 Linux 平台**：Windows 对应 API 是 `TransmitFile`，macOS 是 `sendfile`（语义略异），代码不可直接移植。

## 6. 常见陷阱与调试

- **把零拷贝当万能优化**：瓶颈在磁盘随机 I/O 或锁竞争时，减少内存拷贝毫无感知；优化前先用 `perf`/火焰图确认拷贝确实占大头。
- **混淆"零 CPU 拷贝"与"零数据移动"**：SG-DMA 只是让 CPU 不搬字节，数据仍在内存与网卡间移动两次 DMA。
- **mmap 发送大文件的 SIGBUS**：另一个进程/线程在发送期间截断文件，访问映射页即崩溃；要么持有文件不删除（如仅重命名），要么捕获 SIGBUS 做优雅降级。
- **Kafka 上没吃到零拷贝红利**：检查是否开启了对数据做变换的配置（如 broker 端重压缩）、消费者是否跨分区乱序拉取导致小段随机读。
- **验证手段**：`strace -e trace=sendfile,read,write -p <pid>` 直接看进程是否真的走了 sendfile；`sar -B`/`pidstat -d` 观察内存带宽与块 I/O 变化。

## 7. 实战场景

- **静态资源服务器 / 对象存储网关**：文件原样下行是零拷贝的最佳主场，Nginx、Caddy 默认开启。
- **消息队列与流处理**：Kafka、RocketMQ 的存储层都围绕"顺序写 + 原样转发"设计，为的就是让 sendfile/page cache 生效。
- **服务自身 I/O 库选型**：io_uring 提供固定的零拷贝式读写原语，Netty 的 `FileRegion` 封装 sendfile、堆外内存（DirectBuffer）避免 JVM 内多余的堆拷贝，本质都是同一思想——减少每一程不必要的字节搬家。

## 小结

初学者要点：

- 传统 read + write 发文件 = 4 次拷贝 + 4 次上下文切换，其中两次 CPU 拷贝对业务无意义。
- 零拷贝的目标是让数据不出内核、CPU 不搬字节：sendfile 把系统调用合一（2 次切换），配合 SG-DMA 做到零 CPU 拷贝。
- mmap + write 适合"要加工再发"的场景；splice 用管道中转，通用但代码更繁琐。

进阶注意：

- 零拷贝的前提是原样转发；加密、压缩、改写都会破坏前提（kTLS、io_uring 是现代的破局方案）。
- 实测优先：strace 确认路径、压测对比吞吐，数字随文件大小与硬件波动很大。
- Kafka/Nginx 的性能神话背后是"顺序 I/O + 页缓存 + sendfile"的系统性设计，而不是某个单一开关。
