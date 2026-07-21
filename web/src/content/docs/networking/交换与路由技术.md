---
order: 51
title: 交换与路由技术
module: networking
category: 网络技术
difficulty: intermediate
description: 交换与路由技术：VLAN、STP、链路聚合、静态路由、动态路由与策略路由
author: fanquanpp
updated: '2026-06-14'
related:
  - networking/网络布线与施工
  - 'networking/OSI与TCP-IP模型'
  - networking/网络安全技术
  - networking/无线网络
prerequisites:
  - networking/网络基础与协议
---

## 1. VLAN 技术

### 1.1 VLAN 原理

VLAN（Virtual LAN）将物理网络划分为多个逻辑广播域：

- 基于端口：将端口分配到 VLAN
- 基于 MAC：根据 MAC 地址分配
- 基于协议：根据协议类型分配

**802.1Q 标签**：

```
┌────────┬────────┬──────────┬──────────┐
│ 目的MAC │ 源MAC  │TPID(8100)│TCI(VLAN ID)│
└────────┴────────┴──────────┴──────────┘
```

4 字节标签：TPID(0x8100) + PCP(3bit) + DEI(1bit) + VID(12bit, 0~4095)

### 1.2 Trunk 链路

在交换机间传输多个 VLAN 的流量：

```bash
# Cisco 配置
interface GigabitEthernet0/1
  switchport mode trunk
  switchport trunk allowed vlan 10,20,30

# Huawei 配置
interface GigabitEthernet0/0/1
  port link-type trunk
  port trunk allow-pass vlan 10 20 30
```

### 1.3 VLAN 间路由

| 方式     | 设备           | 优缺点   |
| -------- | -------------- | -------- |
| 单臂路由 | 路由器子接口   | 带宽瓶颈 |
| 三层交换 | 三层交换机     | 高性能   |
| SVI      | 交换机虚拟接口 | 最常用   |

## 2. 生成树协议（STP）

### 2.1 STP 原理

防止二层环路，通过阻塞冗余链路实现：

1. 选举根桥（Bridge ID 最小）
2. 每个非根桥选举根端口（到根桥路径开销最小）
3. 每个网段选举指定端口
4. 阻塞非根端口和非指定端口

**BPDU**：Bridge Protocol Data Unit，交换机间交换的信息。

### 2.2 STP 端口状态

| 状态       | 接收BPDU | 发送BPDU | 转发数据 | 学习MAC |
| ---------- | -------- | -------- | -------- | ------- |
| Blocking   | 是       | 否       | 否       | 否      |
| Listening  | 是       | 是       | 否       | 否      |
| Learning   | 是       | 是       | 否       | 是      |
| Forwarding | 是       | 是       | 是       | 是      |

收敛时间：Blocking → Listening(15s) → Learning(15s) → Forwarding = **50秒**

### 2.3 RSTP（802.1w）

快速生成树协议，改进收敛时间：

| 端口角色 | 说明                 |
| -------- | -------------------- |
| 根端口   | 到根桥最优路径       |
| 指定端口 | 网段上转发数据的端口 |
| 替代端口 | 根端口的备份         |
| 备份端口 | 指定端口的备份       |

收敛时间：**1~3秒**

### 2.4 MSTP（802.1s）

多生成树协议，支持多个 VLAN 映射到不同生成树实例：

```bash
stp region-configuration
  region-name RG1
  instance 1 vlan 10 20
  instance 2 vlan 30 40
  active region-configuration
```

## 3. 链路聚合

### 3.1 LACP（802.3ad）

链路聚合控制协议，动态协商聚合链路：

```bash
# Cisco
interface Port-channel1
  switchport mode trunk
interface range GigabitEthernet0/1-2
  channel-group 1 mode active

# Huawei
interface Eth-Trunk1
  port link-type trunk
interface GigabitEthernet0/0/1
  eth-trunk 1
interface GigabitEthernet0/0/2
  eth-trunk 1
```

### 3.2 负载均衡

| 方式        | 说明           |
| ----------- | -------------- |
| src-mac     | 源MAC哈希      |
| dst-mac     | 目的MAC哈希    |
| src-dst-mac | 源+目的MAC哈希 |
| src-ip      | 源IP哈希       |
| dst-ip      | 目的IP哈希     |
| src-dst-ip  | 源+目的IP哈希  |

## 4. 静态路由

### 4.1 配置

```bash
# Cisco
ip route 10.0.0.0 255.255.255.0 192.168.1.1
ip route 0.0.0.0 0.0.0.0 192.168.1.1    # 默认路由

# Huawei
ip route-static 10.0.0.0 255.255.255.0 192.168.1.1
ip route-static 0.0.0.0 0.0.0.0 192.168.1.1

# Linux
ip route add 10.0.0.0/24 via 192.168.1.1
ip route add default via 192.168.1.1
```

### 4.2 路由优先级

1. 最长前缀匹配
2. 管理距离（AD）最小
3. 度量值最小

| 路由来源 | Cisco AD | Huawei 优先级 |
| -------- | -------- | ------------- |
| 直连     | 0        | 0             |
| 静态     | 1        | 60            |
| OSPF     | 110      | 10            |
| RIP      | 120      | 100           |
| BGP      | 20/200   | 255           |

## 5. OSPF 路由协议

### 5.1 OSPF 基础

- 链路状态协议
- 使用 Dijkstra 最短路径算法
- 区域化设计
- 快速收敛

### 5.2 OSPF 区域

| 区域类型         | 说明                   |
| ---------------- | ---------------------- |
| 骨干区域(Area 0) | 必须存在，连接所有区域 |
| 普通区域         | 标准区域               |
| 末梢区域(Stub)   | 不接收外部路由         |
| NSSA             | 允许引入少量外部路由   |
| Totally Stub     | 仅接收默认路由         |

### 5.3 OSPF 配置

```bash
# Cisco
router ospf 1
  router-id 1.1.1.1
  network 10.0.0.0 0.0.0.255 area 0
  network 10.0.1.0 0.0.0.255 area 1

# Huawei
ospf 1 router-id 1.1.1.1
  area 0
    network 10.0.0.0 0.0.0.255
  area 1
    network 10.0.1.0 0.0.0.255
```

### 5.4 OSPF LSA 类型

| 类型 | 名称          | 产生者     | 传播范围 |
| ---- | ------------- | ---------- | -------- |
| 1    | Router LSA    | 每个路由器 | 区域内   |
| 2    | Network LSA   | DR         | 区域内   |
| 3    | Summary LSA   | ABR        | 区域间   |
| 4    | ASBR Summary  | ABR        | 区域间   |
| 5    | External LSA  | ASBR       | 全AS     |
| 7    | NSSA External | NSSA ASBR  | NSSA内   |

## 6. BGP 路由协议

### 6.1 BGP 基础

- 路径向量协议
- 自治系统间路由
- 基于策略的路由选择
- TCP 179 端口

### 6.2 BGP 选路属性

按优先级排序：

1. Weight（Cisco 私有）
2. Local Preference
3. 本地起源
4. AS Path 最短
5. Origin（IGP < EGP < Incomplete）
6. MED
7. eBGP > iBGP
8. IGP 度量最小
9. 最长连接时间
10. 最小 Router ID

### 6.3 BGP 配置

```bash
router bgp 65001
  bgp router-id 1.1.1.1
  neighbor 10.0.0.2 remote-as 65002
  neighbor 10.0.0.2 description ISP-A
  network 192.168.0.0 mask 255.255.0.0
  !
  address-family ipv4
    neighbor 10.0.0.2 activate
    neighbor 10.0.0.2 route-map SET-LOCAL-PREF in
  !
route-map SET-LOCAL-PREF permit 10
  set local-preference 200
```

## 7. 策略路由

### 7.1 PBR 配置

```bash
# 基于源IP的策略路由
access-list 10 permit 192.168.1.0 0.0.0.255
route-map PBR permit 10
  match ip address 10
  set ip next-hop 10.0.0.1

interface GigabitEthernet0/0
  ip policy route-map PBR
```

### 7.2 应用场景

- 多出口链路负载分担
- 特定流量走专线
- 流量清洗引流
