---
order: 59
title: 负载均衡技术
module: networking
category: 网络技术
difficulty: advanced
description: 负载均衡技术：四层/七层负载、算法、健康检查、会话保持与全局负载
author: fanquanpp
updated: '2026-06-14'
related:
  - networking/网络设计与规划
  - networking/DNS与DHCP
  - networking/网络自动化
  - networking/负载均衡算法
prerequisites:
  - networking/网络基础与协议
---

## 1. 负载均衡概述

### 1.1 四层 vs 七层

| 维度     | L4       | L7                |
| -------- | -------- | ----------------- |
| 工作层   | 传输层   | 应用层            |
| 判断依据 | IP+端口  | URL/Header/Cookie |
| 性能     | 高       | 中                |
| 灵活性   | 低       | 高                |
| 代表     | LVS, NLB | Nginx, HAProxy    |

## 2. 负载均衡算法

| 算法       | 说明           | 适用       |
| ---------- | -------------- | ---------- |
| 轮询       | 依次分配       | 服务器同构 |
| 加权轮询   | 按权重分配     | 服务器异构 |
| 最少连接   | 选连接最少的   | 长连接     |
| 一致性哈希 | 按请求特征哈希 | 有状态     |
| 随机       | 随机选择       | 简单场景   |

## 3. 健康检查

| 类型   | 方法     | 粒度   |
| ------ | -------- | ------ |
| ICMP   | ping     | 基础   |
| TCP    | 端口连接 | 传输层 |
| HTTP   | GET/HEAD | 应用层 |
| 自定义 | 业务接口 | 精确   |

## 4. 会话保持

| 方式      | 说明            | 优缺点       |
| --------- | --------------- | ------------ |
| Source IP | 按源IP哈希      | 简单，不均匀 |
| Cookie    | 插入/改写Cookie | 精确，需支持 |
| Session   | 服务器间同步    | 复杂         |

## 5. 全局负载均衡（GSLB）

基于DNS的跨地域负载均衡：

```
用户 → DNS查询 → GSLB → 返回最近站点IP
```

策略：地理位置、网络延迟、站点可用性、负载。
