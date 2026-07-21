---
order: 61
title: 监控与告警
module: devops
category: 运维
difficulty: intermediate
description: '监控与告警：Prometheus、Grafana、告警设计、SLI/SLO与On-Call实践'
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/容器安全
  - devops/GitOps与持续交付
  - devops/网络与安全进阶
  - devops/数据库运维
prerequisites:
  - devops/概述与Linux基础
---

## 1. 监控体系

### 1.1 监控层次

```
业务指标（订单量、转化率）
    ↓
应用指标（QPS、延迟、错误率）
    ↓
系统指标（CPU、内存、磁盘、网络）
    ↓
基础设施（服务器、网络、存储）
```

### 1.2 USE/RED 方法

**USE（系统资源）**：

- Utilization：利用率
- Saturation：饱和度
- Errors：错误

**RED（服务）**：

- Rate：请求速率
- Errors：错误率
- Duration：延迟

## 2. Prometheus

### 2.1 数据模型

Prometheus 使用时间序列数据：

```
metric_name{label1="value1", label2="value2"} value timestamp
```

**四种指标类型**：

| 类型      | 说明           | 示例                          |
| --------- | -------------- | ----------------------------- |
| Counter   | 单调递增计数器 | http_requests_total           |
| Gauge     | 可增减的值     | cpu_usage_percent             |
| Histogram | 分布统计       | http_request_duration_seconds |
| Summary   | 分位数统计     | http_request_duration_seconds |

### 2.2 PromQL

```promql
# 即时查询
http_requests_total{method="GET", status="200"}

# 范围查询
http_requests_total[5m]

# 速率
rate(http_requests_total[5m])

# 聚合
sum(rate(http_requests_total[5m])) by (service)

# 分位数
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# 预测
predict_linear(disk_free_bytes[1h], 4*3600)

# 常用查询
# CPU 使用率
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 内存使用率
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# 磁盘使用率
(1 - (node_filesystem_avail_bytes{fstype!~"tmpfs"} / node_filesystem_size_bytes)) * 100
```

### 2.3 服务发现

```yaml
# Kubernetes 服务发现
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### 2.4 记录规则

```yaml
groups:
  - name: service_rules
    interval: 30s
    rules:
      - record: service:request_rate:5m
        expr: sum(rate(http_requests_total[5m])) by (service)
      - record: service:error_rate:5m
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          /
          sum(rate(http_requests_total[5m])) by (service)
```

## 3. Grafana

### 3.1 仪表盘设计

| 层级     | 内容           | 受众   |
| -------- | -------------- | ------ |
| 概览     | 关键指标、状态 | 管理层 |
| 服务     | QPS/延迟/错误  | 开发者 |
| 基础设施 | CPU/内存/磁盘  | 运维   |
| 调试     | 详细指标、日志 | 排查   |

### 3.2 面板类型

| 类型        | 适用场景 |
| ----------- | -------- |
| Stat        | 单值展示 |
| Time series | 趋势图   |
| Bar gauge   | 对比     |
| Table       | 表格数据 |
| Heatmap     | 分布图   |
| Log         | 日志浏览 |

### 3.3 告警规则

```yaml
# Grafana 告警
apiVersion: 1
groups:
  - orgId: 1
    name: service_alerts
    rules:
      - uid: high_error_rate
        title: High Error Rate
        condition: C
        data:
          - refId: A
            relativeTimeRange:
              from: 300
            datasourceUid: prometheus
            model:
              expr: sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service)
          - refId: C
            reducer: last
            expression: A
            type: reduce
        noDataState: OK
        execErrState: Alerting
        for: 5m
```

## 4. 告警设计

### 4.1 告警分级

| 级别 | 响应时间 | 通知方式  | 示例           |
| ---- | -------- | --------- | -------------- |
| P1   | 5分钟    | 电话+短信 | 服务完全不可用 |
| P2   | 15分钟   | 短信+IM   | 部分功能异常   |
| P3   | 1小时    | IM        | 性能下降       |
| P4   | 24小时   | 邮件      | 非紧急问题     |

### 4.2 告警原则

- **可操作性**：每条告警都有明确的行动
- **低噪音**：避免误报和重复告警
- **及时性**：在影响用户前告警
- **上下文丰富**：包含足够诊断信息

### 4.3 告警规则示例

```yaml
# Prometheus 告警规则
groups:
  - name: service_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          /
          sum(rate(http_requests_total[5m])) by (service) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate on {{ $labels.service }}'
          description: 'Error rate is {{ $value | humanizePercentage }} for the last 5 minutes'

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))
          > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High P99 latency on {{ $labels.service }}'
          description: 'P99 latency is {{ $value }}s'
```

### 4.4 告警抑制与静默

```yaml
# 抑制规则：P1 告警抑制同服务的 P2 告警
inhibit_rules:
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: [service, cluster]
```

## 5. SLI/SLO

### 5.1 概念

| 概念 | 含义         | 示例         |
| ---- | ------------ | ------------ |
| SLI  | 服务水平指标 | 可用性、延迟 |
| SLO  | 服务水平目标 | 99.9% 可用性 |
| SLA  | 服务水平协议 | 合同约束     |

### 5.2 错误预算

$$\text{错误预算} = 1 - \text{SLO}$$

99.9% SLO 的月度错误预算：

$$30 \times 24 \times 60 \times 0.001 = 43.2 \text{ 分钟}$$

### 5.3 SLO 燃尽率

```promql
# 30天窗口的错误预算消耗率
1 - (
  sum(rate(http_requests_total{status!~"5.."}[30d]))
  /
  sum(rate(http_requests_total[30d]))
)
```

## 6. On-Call 实践

### 6.1 On-Call 轮值

- 主备双人值班
- 轮换周期：1周
- 交接会议：每周一次

### 6.2 事故管理

```
发现 → 响应 → 止血 → 恢复 → 复盘
```

### 6.3 无指责复盘

- 关注系统和流程
- 不追究个人责任
- 产出可操作的改进项
