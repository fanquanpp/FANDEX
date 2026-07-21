---
order: 56
title: 网络故障诊断
module: networking
category: 网络技术
difficulty: intermediate
description: 网络故障诊断：故障方法论、分层排查、工具使用与典型案例
author: fanquanpp
updated: '2026-06-14'
related:
  - networking/SDN与网络自动化
  - networking/网络存储技术
  - networking/网络设计与规划
  - networking/DNS与DHCP
prerequisites:
  - networking/网络基础与协议
---

## 1. 故障诊断方法论

### 1.1 分层排查

从底层到高层逐层排查：

```
物理层 → 数据链路层 → 网络层 → 传输层 → 应用层
```

### 1.2 分段排查

通过分段隔离定位故障：

```
客户端 → 接入交换机 → 汇聚交换机 → 核心交换机 → 防火墙 → 服务器
```

### 1.3 对比法

与正常配置/状态对比找出差异。

## 2. 物理层故障

### 2.1 常见问题

| 问题       | 现象       | 排查         |
| ---------- | ---------- | ------------ |
| 网线断     | 接口down   | 换线测试     |
| 光纤衰减   | 丢包       | 光功率计     |
| 接口协商   | 速度不匹配 | 查看接口状态 |
| 双工不匹配 | 性能差     | 强制双工模式 |

```bash
# 查看接口状态
show interface GigabitEthernet0/1
show interface status

# 常见状态
GigabitEthernet0/1 is up, line protocol is up      # 正常
GigabitEthernet0/1 is down, line protocol is down   # 物理故障
GigabitEthernet0/1 is up, line protocol is down     # 数据链路问题
```

## 3. 数据链路层故障

### 3.1 MAC 地址表问题

```bash
show mac address-table
show mac address-table dynamic address xxxx.xxxx.xxxx
```

### 3.2 VLAN 故障

| 问题       | 原因         | 解决             |
| ---------- | ------------ | ---------------- |
| 跨VLAN不通 | 缺少路由     | 检查SVI/路由     |
| 同VLAN不通 | Trunk问题    | 检查允许的VLAN   |
| 端口不通   | VLAN配置错误 | 检查access/trunk |

### 3.3 STP 问题

```bash
show spanning-tree
show spanning-tree vlan 10

# 常见问题
# 根桥被抢占 → 配置根桥优先级
# 端口被阻塞 → 检查STP拓扑
# 环路 → 检查STP是否正常
```

## 4. 网络层故障

### 4.1 路由问题

```bash
# 查看路由表
show ip route
show ip route ospf

# 路由追踪
traceroute 10.0.0.1

# 常见问题
# 路由缺失 → 检查路由协议
# 路由环路 → 检查路由汇总
# 非对称路由 → 检查往返路径
```

### 4.2 ARP 问题

```bash
show ip arp
show ip arp 10.0.0.1

# ARP 冲突
# 同一IP对应多个MAC → 检查IP冲突
```

### 4.3 ACL 阻断

```bash
show access-lists
show ip interface GigabitEthernet0/1

# 查看ACL命中计数
show access-lists OUTSIDE_IN
```

## 5. 传输层故障

### 5.1 TCP 连接问题

```bash
# 查看连接状态
show tcp brief
ss -tnp

# 常见问题
# SYN无响应 → 防火墙/ACL阻断
# 大量TIME_WAIT → 调整tcp_tw_reuse
# 连接被拒绝 → 服务未启动
```

### 5.2 NAT 问题

```bash
show ip nat translations
show ip nat statistics

# 常见问题
# NAT转换失败 → 检查ACL和接口
# 端口耗尽 → 增加NAT池
```

## 6. 常用诊断工具

### 6.1 Ping 测试

```bash
ping 10.0.0.1              # 基本连通
ping 10.0.0.1 size 1500    # 大包测试
ping 10.0.0.1 repeat 100   # 大量测试
ping 10.0.0.1 df-bit       # 不分片测试MTU
```

### 6.2 抓包分析

```bash
# 交换机抓包
monitor capture point ip cpm CAPTURE both
monitor capture point associate CAPTURE BUFFER1
monitor capture buffer BUFFER1 size 10240
monitor capture point start CAPTURE
# ... 等待流量 ...
monitor capture point stop CAPTURE
show monitor capture buffer BUFFER1
```

### 6.3 流量镜像

```bash
# 本地镜像
monitor session 1 source interface Gi0/1 both
monitor session 1 destination interface Gi0/2

# ERSPAN（远程镜像）
monitor session 1 type erspan-source
  source interface Gi0/1 rx
  destination
    erspan-id 1
    ip address 10.0.0.100
    origin ip address 10.0.0.1
```

## 7. 典型故障案例

### 7.1 MTU 问题

```
现象：小包通，大包不通
原因：路径上MTU不一致，且ICMP被过滤
排查：ping -s 1472 -M do target（1472+28=1500）
解决：调整MTU或允许ICMP碎片需要
```

### 7.2 路由环路

```
现象：traceroute显示TTL递减后超时
原因：路由汇总导致环路
排查：show ip route，检查路由指向
解决：修正路由汇总或添加黑洞路由
```

### 7.3 间歇性丢包

```
现象：偶尔超时，大部分正常
原因：链路质量差/接口错误
排查：show interface（查看CRC/输入错误）
解决：更换线缆/调整协商
```
