---
order: 110
title: 网络设计与规划
module: 'networking'
category: 云与基础设施
difficulty: advanced
description: 网络设计与规划：层次化设计、数据中心网络、SD-WAN与网络虚拟化
author: fanquanpp
updated: '2026-09-08'
related:
  - 'networking/009-NetworkStorageTechnology'
  - 'networking/010-NetworkDiagnosis'
  - 'networking/012-DNSDHCP'
  - 'networking/013-LoadBalanceTech'
prerequisites:
  - 'networking/001-NetworkBasicsAndProtocol'
---


## 1. 层次化网络设计

### 1.1 三层架构

```
核心层：高速交换，不做策略
  ↕
汇聚层：策略执行，路由边界
  ↕
接入层：终端接入，VLAN划分
```

### 1.2 各层设计要点

| 层级   | 关键指标   | 设计原则       |
| ------ | ---------- | -------------- |
| 核心层 | 带宽、延迟 | 冗余、无策略   |
| 汇聚层 | 策略、路由 | 模块化、边界   |
| 接入层 | 密度、安全 | 端口安全、VLAN |

### 1.3 Collapsed Core

中小企业将核心层和汇聚层合并：

```
核心/汇聚层（二层合一）
  ↕
接入层
```

## 2. 数据中心网络

### 2.1 Spine-Leaf 架构

```mermaid
flowchart TD
    S1[Spine1] S2[Spine2] S3[Spine3]
    L1[Leaf1] L2[Leaf2] L3[Leaf3] L4[Leaf4]
    SRV[服务器 服务器 服务器 服务器]
    S1 --- L1
    S1 --- L2
    S1 --- L3
    S1 --- L4
    S2 --- L1
    S2 --- L2
    S2 --- L3
    S2 --- L4
    S3 --- L1
    S3 --- L2
    S3 --- L3
    S3 --- L4
    L1 --> SRV
    L2 --> SRV
    L3 --> SRV
    L4 --> SRV
```

**优势**：

- 任意两台服务器间跳数恒定（2跳）
- 水平扩展：增加 Spine 或 Leaf
- 无阻塞带宽：每台 Leaf 与所有 Spine 互联

**东西向流量**优化：服务器间通信无需经过核心。

### 2.2 超融合网络

| 流量类型 | 协议             | 要求     |
| -------- | ---------------- | -------- |
| 数据     | TCP/IP           | 高带宽   |
| 存储     | FC/iSCSI/NVMe-oF | 低延迟   |
| 管理     | SSH/SNMP         | 可靠     |
| 虚拟化   | VXLAN/Geneve     | 覆盖网络 |

### 2.3 网络虚拟化

**VXLAN**：

```
原始帧 → VXLAN头(8B) → UDP头 → IP头 → 外层帧
         VNI(24bit) = 1600万虚拟网络
```

**NVGRE**：使用 GRE 隧道封装。

**Geneve**：VXLAN 和 NVGRE 的统一替代。

## 3. SD-WAN

### 3.1 SD-WAN 架构

```
分支站点 ←→ SD-WAN控制器 ←→ 总部/数据中心
     ↕           ↕
  多链路      集中策略
(MPLS/Internet/5G)
```

### 3.2 SD-WAN 核心能力

| 能力       | 说明                 |
| ---------- | -------------------- |
| 多链路聚合 | 同时使用多条链路     |
| 智能选路   | 根据应用需求选择路径 |
| 应用识别   | DPI 识别应用类型     |
| 自动VPN    | 自动建立站点间隧道   |
| 集中管理   | 统一策略下发         |

### 3.3 流量调度策略

```
语音/视频 → 低延迟链路(MPLS)
关键业务 → 可靠链路(MPLS/专线)
普通上网 → Internet链路
备份流量 → 最便宜链路
```

## 4. 网络冗余设计

### 4.1 设备冗余

| 方案      | 说明         | 切换时间 |
| --------- | ------------ | -------- |
| VRRP/HSRP | 虚拟路由冗余 | 1~3秒    |
| GLBP      | 网关负载均衡 | 1~3秒    |
| 堆叠/IRF  | 设备虚拟化   | 毫秒级   |
| CSS/VSU   | 集群交换系统 | 毫秒级   |

### 4.2 链路冗余

```bash
# VRRP 配置
interface Vlan10
  ip address 10.0.0.2 255.255.255.0
  vrrp 10 ip 10.0.0.1
  vrrp 10 priority 120
  vrrp 10 preempt
  vrrp 10 track GigabitEthernet0/0 decrement 30
```

### 4.3 路径冗余

- 等价多路径（ECMP）
- 浮动静态路由
- OSPF 多路径

## 5. 网络容量规划

### 5.1 带宽计算

$$\text{所需带宽} = \text{用户数} \times \text{并发率} \times \text{每用户带宽} \times \text{峰值系数}$$

### 5.2 设备选型

| 指标     | 接入层   | 汇聚层   | 核心层  |
| -------- | -------- | -------- | ------- |
| 背板带宽 | 100G+    | 500G+    | 1T+     |
| 包转发率 | 100Mpps+ | 500Mpps+ | 1Bpps+  |
| 端口密度 | 48×1G    | 24×10G   | 36×100G |

## 6. 网络安全设计

### 6.1 安全区域划分

```
Internet ← Untrust
    ↕
DMZ（Web/Mail）
    ↕
Trust（内网办公）
    ↕
Server Zone（服务器区）
    ↕
Management（管理区）
```

### 6.2 零信任网络设计

- 微分段：每个应用独立安全域
- 身份认证：每次访问都验证
- 最小权限：仅开放必要访问
- 持续监控：实时检测异常
