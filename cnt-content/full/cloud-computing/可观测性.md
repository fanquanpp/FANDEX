---
order: 61
title: 可观测性
module: 'cloud-computing'
category: 'eng-infra'
difficulty: intermediate
description: 可观测性三支柱：日志、指标、分布式追踪的原理、工具与实践详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/微服务架构'
  - 'cloud-computing/服务网格'
  - 'cloud-computing/AWS核心服务'
  - 'cloud-computing/多云与混合云架构'
prerequisites:
  - 'cloud-computing/云计算基础'
---

## 1. 可观测性概述

### 1.1 三大支柱

| 支柱           | 描述         | 核心问题         |
| -------------- | ------------ | ---------------- |
| 日志 (Logs)    | 离散事件记录 | 发生了什么？     |
| 指标 (Metrics) | 聚合数值数据 | 现在什么状态？   |
| 追踪 (Traces)  | 请求链路追踪 | 请求经过了哪里？ |

### 1.2 监控 vs 可观测性

| 对比项 | 监控         | 可观测性       |
| ------ | ------------ | -------------- |
| 方式   | 预定义仪表盘 | 探索式查询     |
| 问题   | 已知问题     | 未知问题       |
| 数据   | 指标为主     | 日志+指标+追踪 |
| 思维   | 被动告警     | 主动探索       |

## 2. 日志

### 2.1 日志级别

| 级别  | 用途               |
| ----- | ------------------ |
| ERROR | 错误，需要立即处理 |
| WARN  | 警告，可能的问题   |
| INFO  | 重要业务事件       |
| DEBUG | 调试信息           |
| TRACE | 详细追踪           |

### 2.2 结构化日志

```json
{
  "timestamp": "2026-06-14T10:30:00Z",
  "level": "INFO",
  "service": "order-service",
  "trace_id": "abc123",
  "span_id": "def456",
  "message": "Order created",
  "user_id": "user-789",
  "order_id": "order-101",
  "duration_ms": 45
}
```

### 2.3 日志架构

```
应用 → Fluentd/Filebeat → Kafka → Logstash → Elasticsearch → Kibana
                                    或
应用 → Fluent Bit → Loki → Grafana
```

### 2.4 ELK vs EFK vs PLG

| 栈  | 组件                              | 特点                  |
| --- | --------------------------------- | --------------------- |
| ELK | Elasticsearch + Logstash + Kibana | 功能全面、资源消耗大  |
| EFK | Elasticsearch + Fluentd + Kibana  | Fluentd 替代 Logstash |
| PLG | Prometheus + Loki + Grafana       | 轻量、与指标统一      |

## 3. 指标

### 3.1 指标类型

| 类型      | 描述           | 示例                 |
| --------- | -------------- | -------------------- |
| Counter   | 单调递增计数器 | 请求总数、错误总数   |
| Gauge     | 可增可减的值   | 当前连接数、内存使用 |
| Histogram | 分布统计       | 请求延迟分布         |
| Summary   | 分位数统计     | P50/P95/P99 延迟     |

### 3.2 Prometheus

**数据模型**：

```
metric_name{label1="value1", label2="value2"} value timestamp

http_requests_total{method="GET", path="/api/users", status="200"} 1234
```

**PromQL 查询**：

```promql
# 请求速率（每秒）
rate(http_requests_total[5m])

# P99 延迟
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# 错误率
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# 按 service 分组
sum(rate(http_requests_total[5m])) by (service)
```

### 3.3 四大黄金信号

| 信号   | 描述         | 指标            |
| ------ | ------------ | --------------- |
| 延迟   | 请求处理时间 | P50/P95/P99     |
| 流量   | 请求量       | QPS             |
| 错误   | 失败率       | Error Rate      |
| 饱和度 | 资源使用率   | CPU/Memory/Disk |

### 3.4 RED 方法

| 指标     | 描述     |
| -------- | -------- |
| Rate     | 请求速率 |
| Errors   | 错误率   |
| Duration | 请求延迟 |

### 3.5 USE 方法

| 指标        | 描述   |
| ----------- | ------ |
| Utilization | 使用率 |
| Saturation  | 饱和度 |
| Errors      | 错误数 |

## 4. 分布式追踪

### 4.1 核心概念

| 概念        | 描述                 |
| ----------- | -------------------- |
| Trace       | 一次请求的完整链路   |
| Span        | 链路中的一个操作     |
| SpanContext | 跨进程传递的上下文   |
| Baggage     | 跨 Span 传播的键值对 |

### 4.2 OpenTelemetry

统一可观测性标准，合并了 OpenTracing 和 OpenCensus。

**架构**：

```
应用 → OTel SDK → OTel Collector → 后端（Jaeger/Tempo/...）
```

**代码示例**：

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# 配置
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="otel-collector:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# 使用
tracer = trace.get_tracer("my-service")
with tracer.start_as_current_span("process-order") as span:
    span.set_attribute("order.id", "12345")
    # 业务逻辑
```

### 4.3 追踪后端

| 工具       | 特点                   |
| ---------- | ---------------------- |
| Jaeger     | CNCF 项目，功能全面    |
| Zipkin     | 老牌追踪系统           |
| Tempo      | Grafana 生态，对象存储 |
| SkyWalking | APM+追踪               |

## 5. 告警

### 5.1 告警原则

| 原则     | 描述                   |
| -------- | ---------------------- |
| 可操作性 | 每个告警都应有明确动作 |
| 避免噪音 | 减少无效告警           |
| 分级     | P0-P3 分级             |
| 升级     | 超时自动升级           |

### 5.2 AlertManager 配置

```yaml
route:
  receiver: 'slack'
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      repeat_interval: 1h

receivers:
  - name: 'slack'
    slack_configs:
      - channel: '#alerts'
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'xxx'
```

## 6. 可观测性最佳实践

| 实践         | 描述                          |
| ------------ | ----------------------------- |
| 关联三大支柱 | trace_id 贯穿日志、指标、追踪 |
| 语义约定     | 使用 OpenTelemetry 语义约定   |
| 采样策略     | 尾部采样保留异常请求          |
| SLO/SLI      | 定义服务等级目标和指标        |
| 仪表盘分层   | 概览→服务→实例                |
