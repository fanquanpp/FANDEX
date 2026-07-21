---
order: 55
title: Kubernetes网络
module: 'cloud-computing'
category: 'eng-infra'
difficulty: intermediate
description: 'Kubernetes网络模型：CNI、Pod网络、Service网络、Ingress 与网络策略详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/Kubernetes核心资源'
  - 'cloud-computing/云存储服务'
  - 'cloud-computing/云网络服务'
  - 'cloud-computing/Kubernetes存储'
prerequisites:
  - 'cloud-computing/云计算基础'
---

## 1. Kubernetes 网络模型

### 1.1 基本要求

| 要求             | 描述               |
| ---------------- | ------------------ |
| Pod 间直接通信   | 无需 NAT           |
| Node 与 Pod 通信 | 无需 NAT           |
| Pod 自身 IP      | 每个 Pod 有独立 IP |

### 1.2 三层网络

```
┌─────────────────────────────────┐
│         Ingress 网络             │  ← 外部流量入口
├─────────────────────────────────┤
│         Service 网络             │  ← 虚拟 IP (ClusterIP)
├─────────────────────────────────┤
│         Pod 网络                 │  ← 容器 IP
├─────────────────────────────────┤
│         Node 网络                │  ← 物理网络
└─────────────────────────────────┘
```

## 2. CNI 插件

### 2.1 常见 CNI

| 插件    | 模式          | 特点           |
| ------- | ------------- | -------------- |
| Calico  | BGP/VXLAN     | 网络策略强     |
| Flannel | VXLAN/host-gw | 简单易用       |
| Cilium  | eBPF          | 高性能、可观测 |
| Weave   | VXLAN         | 自动拓扑       |
| Antrea  | OVS           | VMware 生态    |

### 2.2 Calico 网络模式

| 模式  | 描述          | 性能 |
| ----- | ------------- | ---- |
| BGP   | 直接路由      | 高   |
| VXLAN | Overlay 封装  | 中   |
| IPIP  | IP-in-IP 封装 | 中   |

### 2.3 Cilium 优势

- 基于 eBPF，内核级数据路径
- 无需 iptables
- 支持 L3-L7 网络策略
- 内置可观测性（Hubble）

## 3. Pod 网络

### 3.1 同节点 Pod 通信

```
Pod A → veth pair → cni0 (bridge) → veth pair → Pod B
```

### 3.2 跨节点 Pod 通信

```
Pod A → veth → cni0 → 路由 → 物理网络 → 路由 → cni0 → veth → Pod B
```

### 3.3 Pause 容器

每个 Pod 有一个 Pause 容器，负责：

- 创建网络命名空间
- 维持 Pod 网络
- 共享网络栈

## 4. Service 网络

### 4.1 kube-proxy 工作原理

```
Client → ClusterIP → iptables/IPVS → Pod IP
```

### 4.2 iptables 模式

```bash
# 随机选择后端 Pod
-A KUBE-SERVICES -d 10.96.0.1/32 -j KUBE-SVC-XXX
-A KUBE-SVC-XXX -m statistic --probability 0.33 -j KUBE-SEP-POD1
-A KUBE-SVC-XXX -m statistic --probability 0.5 -j KUBE-SEP-POD2
-A KUBE-SVC-XXX -j KUBE-SEP-POD3
```

### 4.3 IPVS 模式

| 调度算法 | 描述       |
| -------- | ---------- |
| rr       | 轮询       |
| lc       | 最少连接   |
| wrr      | 加权轮询   |
| sh       | 源地址哈希 |

## 5. Ingress

### 5.1 Ingress 架构

```
Internet → Ingress Controller → Service → Pod
```

### 5.2 Ingress 配置

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - example.com
      secretName: tls-secret
  rules:
    - host: example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
```

### 5.3 Ingress Controller 对比

| Controller    | 特点               |
| ------------- | ------------------ |
| NGINX Ingress | 最广泛使用         |
| Traefik       | 自动发现、配置简单 |
| Envoy/Istio   | 服务网格集成       |
| Kong          | API 网关功能       |

## 6. NetworkPolicy

### 6.1 概念

NetworkPolicy 控制 Pod 间的网络访问，类似防火墙规则。

### 6.2 配置示例

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              env: production
        - podSelector:
            matchLabels:
              app: web
      ports:
        - port: 8080
          protocol: TCP
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - port: 5432
          protocol: TCP
```

### 6.3 默认策略

```yaml
# 默认拒绝所有入站
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

> 注意：NetworkPolicy 需要支持它的 CNI 插件（Calico、Cilium 等），Flannel 不支持。
