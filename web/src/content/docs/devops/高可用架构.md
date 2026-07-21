---
order: 56
title: 高可用架构
module: devops
category: 运维
difficulty: advanced
description: 高可用架构：冗余设计、故障转移、负载均衡、灾备与混沌工程
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/配置管理
  - devops/性能调优
  - devops/自动化测试
  - devops/故障排查
prerequisites:
  - devops/概述与Linux基础
---

## 1. 高可用概述

### 1.1 可用性指标

$$\text{可用性} = \frac{\text{MTTF}}{\text{MTTF} + \text{MTTR}}$$

| 可用性  | 年停机   | 等级     |
| ------- | -------- | -------- |
| 99%     | 3.65天   | 基本     |
| 99.9%   | 8.76小时 | 标准     |
| 99.99%  | 52.6分钟 | 高可用   |
| 99.999% | 5.26分钟 | 极高可用 |

### 1.2 高可用设计原则

- **消除单点故障**：冗余所有关键组件
- **故障检测**：快速发现故障
- **故障转移**：自动切换到备用
- **降级策略**：部分功能不可用时保核心
- **限流保护**：防止雪崩

## 2. 冗余设计

### 2.1 主动-主动模式

多个实例同时提供服务：

```
客户端 → 负载均衡 → 实例1 (活跃)
                  → 实例2 (活跃)
                  → 实例3 (活跃)
```

优点：资源利用率高，无切换延迟
缺点：数据一致性挑战

### 2.2 主动-被动模式

一个主实例服务，备用实例待命：

```
客户端 → 主实例 (活跃)
         备实例 (待命)
```

优点：数据一致性好
缺点：资源利用率低，切换有延迟

### 2.3 多活架构

多个数据中心同时提供服务：

```
用户 → DNS → 北京机房 (活跃)
            → 上海机房 (活跃)
            → 广州机房 (活跃)
```

**数据同步**：跨机房数据同步是核心挑战。

## 3. 负载均衡

### 3.1 四层负载均衡（L4）

基于传输层信息（IP+端口）分发：

| 实现     | 特点                 |
| -------- | -------------------- |
| LVS/IPVS | Linux 内核级，高性能 |
| HAProxy  | 功能丰富             |
| AWS NLB  | 云原生               |

**LVS 模式**：

| 模式 | 原理        | 性能 | 限制               |
| ---- | ----------- | ---- | ------------------ |
| NAT  | 修改目标IP  | 中   | RS网关指向Director |
| DR   | 修改MAC地址 | 高   | RS与Director同网段 |
| TUN  | IP隧道      | 高   | RS支持隧道         |

### 3.2 七层负载均衡（L7）

基于应用层信息（URL、Header、Cookie）分发：

| 实现    | 特点       |
| ------- | ---------- |
| Nginx   | 最广泛使用 |
| HAProxy | 功能丰富   |
| Envoy   | 云原生     |
| AWS ALB | 云原生     |

**Nginx 负载均衡**：

```nginx
upstream backend {
    least_conn;
    server 10.0.0.1:8080 weight=5;
    server 10.0.0.2:8080 weight=3;
    server 10.0.0.3:8080 backup;

    keepalive 32;
    max_fails 3;
    fail_timeout 30s;
}

server {
    location / {
        proxy_pass http://backend;
        proxy_next_upstream error timeout http_503;
    }
}
```

### 3.3 负载均衡算法

| 算法       | 说明           | 适用场景       |
| ---------- | -------------- | -------------- |
| 轮询       | 依次分配       | 服务器性能相同 |
| 加权轮询   | 按权重分配     | 服务器性能不同 |
| 最少连接   | 选连接最少的   | 长连接         |
| 一致性哈希 | 按请求特征哈希 | 有状态服务     |
| 随机       | 随机选择       | 简单场景       |

### 3.4 健康检查

```nginx
# 主动健康检查（Nginx Plus）
upstream backend {
    server 10.0.0.1:8080;
    server 10.0.0.2:8080;

    health_check interval=5s fails=3 passes=2 uri=/health;
}
```

## 4. 故障转移

### 4.1 数据库故障转移

**MySQL MHA**：

```
Master → Slave1
       → Slave2
       → Slave3

Master 故障时：
1. MHA 检测到故障
2. 选择最新 Slave 提升为新 Master
3. 其他 Slave 指向新 Master
4. VIP 漂移到新 Master
```

**Redis Sentinel**：

```
Master ← Sentinel1
       ← Sentinel2
       ← Sentinel3

Master 故障时：
1. Sentinel 投票选举
2. 执行故障转移
3. 通知客户端新 Master 地址
```

### 4.2 VIP 漂移

```bash
# Keepalived 配置
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1

    virtual_ipaddress {
        192.168.1.100
    }

    track_script {
        check_nginx
    }
}
```

### 4.3 DNS 故障转移

```
service.example.com → 10.0.0.1 (TTL=30s)
                    → 10.0.0.2 (TTL=30s)

10.0.0.1 故障时：
DNS 健康检查检测到 → 移除 10.0.0.1 记录
```

## 5. 限流与降级

### 5.1 限流算法

**固定窗口**：

$$\text{允许} \iff \text{计数} < \text{阈值}$$

问题：窗口边界处可能通过2倍流量。

**滑动窗口**：更精确，但实现复杂。

**令牌桶**：

- 以固定速率 $r$ 生成令牌
- 桶容量 $b$，允许突发 $b$ 个请求
- 长期平均速率不超过 $r$

**漏桶**：

- 请求以固定速率 $r$ 流出
- 桶满时新请求被拒绝
- 输出速率恒定

### 5.2 熔断器

```
关闭状态 → 失败率超阈值 → 打开状态
打开状态 → 超时 → 半开状态
半开状态 → 测试请求成功 → 关闭状态
半开状态 → 测试请求失败 → 打开状态
```

### 5.3 降级策略

| 策略     | 说明           |
| -------- | -------------- |
| 读降级   | 返回缓存数据   |
| 写降级   | 异步写入       |
| 功能降级 | 关闭非核心功能 |
| 限流降级 | 排队或拒绝     |

## 6. 混沌工程

### 6.1 混沌工程原则

1. 建立稳态假设
2. 模拟现实世界事件
3. 在生产环境运行实验
4. 自动化持续运行
5. 最小化爆炸半径

### 6.2 Chaos Monkey

Netflix 开源的混沌工程工具：

- 随机终止生产实例
- 验证自动恢复能力
- 在工作时间运行

### 6.3 Chaos Mesh

Kubernetes 混沌工程平台：

```yaml
# 网络延迟注入
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay
spec:
  action: delay
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: my-service
  delay:
    latency: '100ms'
    correlation: '50'
  duration: '5m'
```

```yaml
# Pod 故障注入
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: my-service
  scheduler:
    cron: '@every 10m'
```

### 6.4 故障注入类型

| 类型     | 工具           | 说明             |
| -------- | -------------- | ---------------- |
| Pod 故障 | Chaos Mesh     | Kill/删除 Pod    |
| 网络故障 | Chaos Mesh, tc | 延迟、丢包、分区 |
| I/O 故障 | Chaos Mesh     | 延迟、错误       |
| CPU 压力 | stress-ng      | CPU 负载         |
| 内存压力 | stress-ng      | 内存消耗         |
| 时间偏移 | Chaos Mesh     | 时钟漂移         |
