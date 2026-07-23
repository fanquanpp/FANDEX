---
order: 8
title: '云原生与 SRE'
module: devops
category: 运维
difficulty: advanced
description: '云原生架构、12-Factor App、服务网格、混沌工程与 On-Call 实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/监控与可观测性
  - devops/基础设施即代码
  - devops/Shell脚本编程
  - devops/包管理与仓库
prerequisites: []
---

## 1. 云原生架构

### 1.1 CNCF 云原生定义

云原生技术使组织能够在公有云、私有云和混合云等现代动态环境中构建和运行可扩展的应用。核心要素：

| 要素               | 描述                     |
| :----------------- | :----------------------- |
| **微服务**         | 应用拆分为独立部署的服务 |
| **容器**           | 应用打包和运行的标准     |
| **服务网格**       | 服务间通信的基础设施层   |
| **不可变基础设施** | 替换而非修改             |
| **声明式 API**     | 描述期望状态             |

### 1.2 CNCF 技术栈

```
┌─────────────────────────────────────────────┐
│              应用层                           │
│  微服务 / Serverless / 函数计算              │
├─────────────────────────────────────────────┤
│              运行时层                         │
│  Kubernetes / Container Runtime              │
├─────────────────────────────────────────────┤
│              基础设施层                       │
│  云平台 / 存储 / 网络 / 安全                 │
├─────────────────────────────────────────────┤
│              可观测性                         │
│  Prometheus / Grafana / OpenTelemetry        │
├─────────────────────────────────────────────┤
│              CI/CD                           │
│  ArgoCD / Flux / Tekton                     │
└─────────────────────────────────────────────┘
```

## 2. 12-Factor App

### 2.1 十二因素

| #   | 因素               | 描述                       | 示例                           |
| :-- | :----------------- | :------------------------- | :----------------------------- |
| 1   | **代码库**         | 单一代码库，多次部署       | Git 仓库                       |
| 2   | **依赖**           | 显式声明并隔离依赖         | package.json, requirements.txt |
| 3   | **配置**           | 在环境中存储配置           | 环境变量、ConfigMap            |
| 4   | **后端服务**       | 把后端服务当作附加资源     | 数据库、缓存、消息队列         |
| 5   | **构建/发布/运行** | 严格分离构建和运行         | CI/CD 流水线                   |
| 6   | **进程**           | 无状态进程                 | 会话存 Redis                   |
| 7   | **端口绑定**       | 通过端口绑定提供服务       | Web 服务器自包含               |
| 8   | **并发**           | 通过进程模型扩展           | 水平扩展 Pod                   |
| 9   | **易处理**         | 快速启动和优雅终止         | 健康检查、信号处理             |
| 10  | **开发/生产一致**  | 尽可能保持环境一致         | 相同 Docker 镜像               |
| 11  | **日志**           | 将日志视为事件流           | stdout → 日志收集器            |
| 12  | **管理进程**       | 一次性管理进程与应用同环境 | K8s Job/CronJob                |

### 2.2 配置管理示例

```python
#  硬编码配置
DATABASE_URL = "postgresql://admin:password@db:5432/prod"

#  环境变量配置
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str
    debug: bool = False
    max_workers: int = 4

    class Config:
        env_file = ".env"

settings = Settings()
```

## 3. 微服务治理

### 3.1 微服务通信模式

| 模式          | 描述             | 优点       | 缺点           |
| :------------ | :--------------- | :--------- | :------------- |
| **同步 REST** | HTTP 请求/响应   | 简单直观   | 耦合、级联故障 |
| **同步 gRPC** | Protocol Buffers | 高性能     | 需要定义 proto |
| **异步消息**  | 消息队列         | 解耦、削峰 | 复杂性增加     |
| **事件驱动**  | 事件总线         | 最终一致性 | 调试困难       |

### 3.2 服务发现与负载均衡

```yaml
# Kubernetes Service（内置服务发现）
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
    - port: 80
      targetPort: 8080

# 应用内通过 DNS 访问
# http://user-service.default.svc.cluster.local
```

### 3.3 熔断与限流

```python
# 熔断器模式
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
def call_external_service():
    response = requests.get("http://external-service/api")
    return response.json()

# 限流
from fastapi import FastAPI, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

app = FastAPI()
limiter = Limiter(key_func=get_remote_address)

@app.get("/api/data")
@limiter.limit("100/minute")
async def get_data(request: Request):
    return {"data": "value"}
```

## 4. 服务网格（Istio）

### 4.1 Istio 架构

```
┌──────────────────────────────────────────┐
│              Control Plane               │
│  ┌──────────────────────────────────┐    │
│  │          istiod                   │    │
│  │  Pilot + Citadel + Galley        │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
        │ 配置下发            │ 配置下发
        ↓                    ↓
┌──────────────┐    ┌──────────────┐
│   Service A  │    │   Service B  │
│ ┌──────────┐ │    │ ┌──────────┐ │
│ │ Envoy    │ │ ←→ │ │ Envoy    │ │
│ │ Sidecar  │ │    │ │ Sidecar  │ │
│ └──────────┘ │    │ └──────────┘ │
│ ┌──────────┐ │    │ ┌──────────┐ │
│ │ App      │ │    │ │ App      │ │
│ └──────────┘ │    │ └──────────┘ │
└──────────────┘    └──────────────┘
```

### 4.2 流量管理

```yaml
# 虚拟服务 - 金丝雀路由
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-service
spec:
  hosts:
    - web-service
  http:
    - match:
        - headers:
            x-canary:
              exact: 'true'
      route:
        - destination:
            host: web-service
            subset: canary
    - route:
        - destination:
            host: web-service
            subset: stable
          weight: 90
        - destination:
            host: web-service
            subset: canary
          weight: 10

---
# 目标规则
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-service
spec:
  host: web-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 100
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
```

### 4.3 可观测性

```yaml
# Telemetry 配置
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: default
spec:
  accessLogging:
    - providers:
        - name: otel
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 10
  metrics:
    - providers:
        - name: prometheus
```

## 5. 混沌工程

### 5.1 混沌工程原则

| 原则         | 描述                       |
| :----------- | :------------------------- |
| **定义稳态** | 建立系统的正常行为基线     |
| **假设稳态** | 假设控制组和实验组行为一致 |
| **引入故障** | 模拟真实世界的故障         |
| **观察差异** | 对比稳态假设和实际结果     |

### 5.2 Chaos Mesh

```yaml
# Pod 故障注入
apiVersion: chaos-mesh.org/v1delta1
kind: PodChaos
metadata:
  name: pod-kill
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      app: web
  scheduler:
    cron: '@every 30m'

---
# 网络延迟
apiVersion: chaos-mesh.org/v1delta1
kind: NetworkChaos
metadata:
  name: network-delay
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - production
    labelSelectors:
      app: api
  delay:
    latency: '100ms'
    correlation: '25'
    jitter: '50ms'
  duration: '5m'

---
# CPU 压力
apiVersion: chaos-mesh.org/v1delta1
kind: StressChaos
metadata:
  name: cpu-stress
spec:
  mode: one
  selector:
    labelSelectors:
      app: web
  stressors:
    cpu:
      workers: 2
      load: 80
  duration: '3m'
```

### 5.3 混沌实验流程

```
1. 定义稳态指标 → 2. 设计故障场景 → 3. 在测试环境执行
    → 4. 观察系统行为 → 5. 记录发现 → 6. 修复问题
    → 7. 逐步在生产环境执行
```

## 6. 容量规划

### 6.1 容量指标

| 指标           | 描述           | 计算方法     |
| :------------- | :------------- | :----------- |
| **QPS**        | 每秒请求数     | 监控统计     |
| **资源利用率** | CPU/内存使用率 | Prometheus   |
| **增长趋势**   | 流量增长预测   | 历史数据拟合 |
| **峰值倍数**   | 峰值/均值      | 监控统计     |

### 6.2 容量计算

```
所需 Pod 数 = (目标 QPS × 安全系数) / 单 Pod QPS
所需 Node 数 = (所需 Pod 数 + 缓冲) / 单 Node Pod 数

示例:
- 目标 QPS: 10,000
- 安全系数: 1.5
- 单 Pod QPS: 500
- 缓冲: 20%

所需 Pod = (10000 × 1.5) / 500 = 30
所需 Node = (30 × 1.2) / 10 = 4
```

## 7. 故障复盘

### 7.1 复盘模板

```markdown
# 故障复盘报告

## 基本信息

- **故障时间**: 2026-06-14 14:30 - 15:15 (45分钟)
- **影响范围**: 用户服务 API 不可用
- **影响程度**: 30% 用户受影响
- **SLO 违规**: 是 (可用性低于 99.9%)

## 时间线

- 14:30 - 告警触发：API 错误率上升
- 14:32 - 值班确认：数据库连接池耗尽
- 14:35 - 尝试扩容数据库
- 14:45 - 扩容完成，服务恢复
- 15:00 - 确认所有服务正常
- 15:15 - 告警解除

## 根因分析（5-Why）

1. 为什么 API 不可用？→ 数据库连接池耗尽
2. 为什么连接池耗尽？→ 慢查询阻塞连接
3. 为什么有慢查询？→ 缺少索引的全表扫描
4. 为什么缺少索引？→ 新功能上线未添加索引
5. 为什么未添加索引？→ 缺少数据库迁移审查流程

## 改进措施

| 行动项             | 负责人    | 截止日期 | 优先级 |
| :----------------- | :-------- | :------- | :----- |
| 添加缺失索引       | DBA       | 06-15    | P0     |
| 数据库迁移审查流程 | Tech Lead | 06-20    | P1     |
| 连接池监控告警     | SRE       | 06-18    | P1     |
| 慢查询自动检测     | SRE       | 06-25    | P2     |
```

### 7.2 复盘原则

| 原则         | 描述                       |
| :----------- | :------------------------- |
| **无指责**   | 关注系统和流程，不追究个人 |
| **数据驱动** | 用数据和事实说话           |
| **可执行**   | 改进措施必须具体、可执行   |
| **跟踪**     | 行动项必须有人跟进         |

## 8. On-Call 实践

### 8.1 On-Call 轮值

```yaml
# PagerDuty / OpsGenie 配置
schedules:
  - name: primary-oncall
    rotation: weekly
    members: [sre1, sre2, sre3, sre4]
    handoff_time: '09:00'
    timezone: 'Asia/Shanghai'

  - name: secondary-oncall
    rotation: weekly
    members: [dev1, dev2, dev3, dev4]

escalation_policies:
  - name: critical-alert
    rules:
      - target: primary-oncall
        delay: 5m
      - target: secondary-oncall
        delay: 15m
      - target: engineering-manager
        delay: 30m
```

### 8.2 On-Call 最佳实践

| 实践         | 描述                     |
| :----------- | :----------------------- |
| **轮值公平** | 轮值分配均衡，避免疲劳   |
| **升级机制** | 明确升级路径和超时       |
| **告警降噪** | 减少无效告警，提高信噪比 |
| **Runbook**  | 每个告警有对应的处理手册 |
| **复盘改进** | 每次值班后复盘改进       |
| **补偿机制** | 值班补偿或调休           |

### 8.3 Runbook 模板

```markdown
# 告警: HighErrorRate

## 告警条件

API 5xx 错误率 > 5%，持续 5 分钟

## 快速诊断

1. 检查最近部署: `kubectl rollout history deployment/web`
2. 查看错误日志: `kubectl logs -l app=web --since=10m | grep 500`
3. 检查依赖服务: `kubectl get pods -A | grep -v Running`

## 常见原因与处理

| 原因         | 处理方法                                                |
| :----------- | :------------------------------------------------------ |
| 新版本 Bug   | 回滚: `kubectl rollout undo deployment/web`             |
| 数据库超载   | 扩容: `kubectl scale statefulset/postgres --replicas=3` |
| 下游服务故障 | 熔断: 修改 VirtualService 路由                          |

## 升级

- 联系后端负责人: @backend-oncall
- 联系 DBA: @dba-oncall
```

## 9. 小结

云原生与 SRE 是现代运维的高级实践：

1. **12-Factor App** 是云原生应用的设计原则，配置外置和无状态是核心
2. **服务网格**（Istio）将流量管理、安全和可观测性下沉到基础设施层
3. **混沌工程**主动发现系统弱点，是提高可靠性的有效手段
4. **故障复盘**遵循无指责原则，关注系统和流程改进
5. **On-Call** 需要完善的轮值、升级和 Runbook 机制
6. **容量规划**基于数据预测，避免资源不足或浪费
