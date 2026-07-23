---
order: 55
title: 性能调优
module: devops
category: 运维
difficulty: advanced
description: 性能调优：系统性能分析、CPU/内存/磁盘/网络优化、应用性能与压测
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/日志管理
  - devops/配置管理
  - devops/高可用架构
  - devops/自动化测试
prerequisites:
  - devops/概述与Linux基础
---

## 1. 性能调优方法论

### 1.1 USE 方法

对每个资源检查：

- **Utilization（利用率）**：资源忙碌的时间比例
- **Saturation（饱和度）**：资源排队等待的程度
- **Errors（错误）**：错误事件计数

### 1.2 性能分析流程

```
1. 定义性能目标
2. 建立基准（Baseline）
3. 识别瓶颈
4. 提出假设
5. 验证假设
6. 实施优化
7. 验证效果
8. 重复3-7
```

### 1.3 阿姆达尔定律

$$S = \frac{1}{(1-f) + f/s}$$

其中 $f$ 为可优化部分的比例，$s$ 为优化倍数。

## 2. CPU 性能分析

### 2.1 CPU 指标

| 指标       | 含义              | 工具             |
| ---------- | ----------------- | ---------------- |
| CPU 利用率 | 用户+系统时间占比 | top, vmstat      |
| 运行队列   | 等待运行的进程数  | vmstat           |
| 上下文切换 | 进程切换次数      | vmstat           |
| 中断次数   | 硬件/软件中断     | /proc/interrupts |

### 2.2 分析工具

```bash
# CPU 使用概况
top -H -p <pid>        # 按线程查看
htop                    # 交互式

# CPU 火焰图
perf record -g -p <pid>
perf script | stackcollapse-perf.pl | flamegraph.pl > cpu.svg

# 系统调用追踪
strace -c -p <pid>     # 统计系统调用
strace -e trace=network -p <pid>  # 追踪网络调用

# 上下文切换分析
perf stat -e context-switches -p <pid>
```

### 2.3 CPU 优化策略

| 策略       | 方法               |
| ---------- | ------------------ |
| 减少计算   | 算法优化、缓存结果 |
| 并行化     | 多线程、异步       |
| CPU 亲和性 | taskset 绑核       |
| 调度优先级 | nice/renice        |
| 中断均衡   | IRQ 亲和性         |

## 3. 内存性能分析

### 3.1 内存指标

```bash
# 内存使用
free -h
cat /proc/meminfo

# 详细信息
vmstat 1              # 每秒统计

# 进程内存
pmap -x <pid>         # 进程内存映射
smem -t -k            # 按进程排序
```

**关键指标**：

| 指标          | 含义                     |
| ------------- | ------------------------ |
| used          | 已使用内存               |
| free          | 空闲内存                 |
| buffers/cache | 内核缓冲和缓存           |
| available     | 可用内存（含可回收缓存） |
| swap used     | 交换空间使用量           |

### 3.2 页缓存与脏页

```bash
# 查看脏页
cat /proc/meminfo | grep -i dirty

# 手动刷盘
sync

# 调整脏页阈值
sysctl vm.dirty_ratio=20              # 脏页占总内存20%时刷盘
sysctl vm.dirty_background_ratio=10   # 后台刷盘阈值
```

### 3.3 OOM 管理

```bash
# OOM 分数
cat /proc/<pid>/oom_score
cat /proc/<pid>/oom_score_adj

# 禁止 OOM Kill
echo -1000 > /proc/<pid>/oom_score_adj

# 查看 OOM 日志
dmesg | grep -i oom
journalctl -k | grep -i oom
```

### 3.4 内存优化

| 策略     | 方法            |
| -------- | --------------- |
| 减少分配 | 对象池、复用    |
| 减少拷贝 | 零拷贝、mmap    |
| 调整 GC  | 堆大小、GC 策略 |
| 大页     | HugePages       |
| 交换优化 | 调整 swappiness |

## 4. 磁盘 I/O 性能

### 4.1 I/O 指标

| 指标     | 含义             |
| -------- | ---------------- |
| IOPS     | 每秒 I/O 操作数  |
| 吞吐量   | 每秒传输数据量   |
| 延迟     | I/O 操作响应时间 |
| 队列深度 | 等待中的 I/O 数  |

### 4.2 分析工具

```bash
# I/O 统计
iostat -xz 1          # 每秒统计
iotop                  # 按进程 I/O 排序

# I/O 延迟分析
biolatency             # eBPF 块 I/O 延迟直方图
biosnoop               # 每次 I/O 追踪

# 文件系统追踪
ext4slower            # eBPF 追踪慢 ext4 操作
```

### 4.3 I/O 调度器

| 调度器      | 特点            | 适用场景 |
| ----------- | --------------- | -------- |
| noop        | 简单 FIFO       | SSD      |
| deadline    | 保证延迟        | 数据库   |
| cfq         | 公平分配        | 通用     |
| mq-deadline | 多队列 deadline | NVMe SSD |
| bfq         | 公平+低延迟     | 桌面     |

```bash
# 查看当前调度器
cat /sys/block/sda/queue/scheduler

# 修改调度器
echo deadline > /sys/block/sda/queue/scheduler
```

## 5. 网络性能

### 5.1 网络指标

| 指标   | 含义         |
| ------ | ------------ |
| 带宽   | 最大传输速率 |
| 吞吐量 | 实际传输速率 |
| 延迟   | 网络往返时间 |
| 丢包率 | 丢失包的比例 |
| 重传率 | 重传包的比例 |

### 5.2 分析工具

```bash
# 连接统计
ss -s                  # 连接概览
ss -tnp                # TCP 连接详情

# 网络统计
sar -n DEV 1           # 网卡流量
sar -n TCP,ETCP 1      # TCP 统计

# 延迟测试
ping -c 10 target
mtr target             # 路由追踪+延迟

# 带宽测试
iperf3 -s              # 服务端
iperf3 -c server       # 客户端

# TCP 追踪
tcplife                # eBPF TCP 连接生命周期
tcpretrans             # eBPF TCP 重传
```

### 5.3 内核参数优化

```bash
# TCP 缓冲区
sysctl net.core.rmem_max=16777216
sysctl net.core.wmem_max=16777216
sysctl net.ipv4.tcp_rmem='4096 87380 16777216'
sysctl net.ipv4.tcp_wmem='4096 65536 16777216'

# 连接队列
sysctl net.core.somaxconn=65535
sysctl net.ipv4.tcp_max_syn_backlog=65535

# TIME_WAIT 优化
sysctl net.ipv4.tcp_tw_reuse=1
sysctl net.ipv4.tcp_fin_timeout=15

# 保活
sysctl net.ipv4.tcp_keepalive_time=600
sysctl net.ipv4.tcp_keepalive_intvl=30
sysctl net.ipv4.tcp_keepalive_probes=3
```

## 6. 应用性能

### 6.1 性能剖析（Profiling）

| 语言    | CPU Profiler        | 内存 Profiler |
| ------- | ------------------- | ------------- |
| Java    | async-profiler, JFR | jmap, MAT     |
| Go      | pprof               | pprof         |
| Python  | cProfile, py-spy    | memray        |
| Node.js | --prof, clinic      | --inspect     |
| Rust    | perf, flamegraph    | valgrind      |

### 6.2 连接池优化

$$\text{最优连接数} \approx \text{CPU核心数} \times (1 + \frac{\text{等待时间}}{\text{计算时间}})$$

### 6.3 缓存策略

| 缓存层      | 命中率目标 | 典型延迟 |
| ----------- | ---------- | -------- |
| L1/L2 Cache | >95%       | ~1ns     |
| 应用缓存    | >80%       | ~1ms     |
| Redis       | >70%       | ~1ms     |
| CDN         | >90%       | ~10ms    |

## 7. 压力测试

### 7.1 压测工具

| 工具     | 特点        | 协议   |
| -------- | ----------- | ------ |
| wrk/wrk2 | 高性能      | HTTP   |
| JMeter   | 功能全面    | 多协议 |
| Locust   | Python 编写 | HTTP   |
| k6       | JavaScript  | HTTP   |
| Gatling  | Scala       | HTTP   |

### 7.2 wrk 使用

```bash
# 基本压测
wrk -t4 -c100 -d30s http://target/

# 延迟分布
wrk -t4 -c100 -d30s --latency http://target/

# 自定义脚本
wrk -t4 -c100 -d30s -s post.lua http://target/
```

### 7.3 性能基准

| 指标     | 优秀   | 良好   | 需优化 |
| -------- | ------ | ------ | ------ |
| P50 延迟 | <10ms  | <50ms  | >100ms |
| P99 延迟 | <50ms  | <200ms | >500ms |
| 错误率   | <0.01% | <0.1%  | >1%    |
| QPS      | >10000 | >1000  | <100   |
