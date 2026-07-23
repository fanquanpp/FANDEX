---
order: 6
title: 监控与可观测性
module: devops
category: 运维
difficulty: intermediate
description: 'Prometheus+Grafana、日志、链路追踪、OpenTelemetry 与 SLO/SLI/SLA。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'devops/CI-CD流水线'
  - devops/语法速查
  - devops/基础设施即代码
  - devops/云原生与SRE
prerequisites: []
---

## 1. 可观测性三大支柱

| 支柱                | 描述               | 工具          | 回答的问题       |
| :------------------ | :----------------- | :------------ | :--------------- |
| **指标（Metrics）** | 数值型时间序列数据 | Prometheus    | 系统发生了什么？ |
| **日志（Logs）**    | 离散的事件记录     | ELK/Loki      | 为什么发生？     |
| **链路（Traces）**  | 请求的完整调用链   | Jaeger/Zipkin | 问题在哪里？     |

```
指标（发现异常）→ 链路（定位问题）→ 日志（分析原因）
```

## 2. Prometheus + Grafana

### 2.1 Prometheus 架构

```
┌──────────┐  pull   ┌────────────┐  query  ┌──────────┐
│ Targets  │ ←────── │ Prometheus │ ←────── │ Grafana  │
│ (应用/节点)│         │  Server    │         │ 可视化    │
└──────────┘         └────────────┘         └──────────┘
                          │
                    ┌─────┼─────┐
                    ↓     ↓     ↓
                ┌──────┐┌──────┐┌──────┐
                │Alert ││TSDB ││SD   │
                │Manager││存储  ││服务发现│
                └──────┘└──────┘└──────┘
```

### 2.2 Prometheus 配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # 应用监控
  - job_name: 'myapp'
    metrics_path: /metrics
    static_configs:
      - targets: ['app:8080']
    # Kubernetes 服务发现
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

  # Node Exporter
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Blackbox Exporter（探针）
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://example.com
          - https://api.example.com/health

# 告警规则
rule_files:
  - 'alerts/*.yml'

# Alertmanager
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### 2.3 应用暴露指标

```python
# Python 应用暴露 Prometheus 指标
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi import FastAPI, Response

app = FastAPI()

# 计数器
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# 直方图（延迟分布）
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# 仪表盘（当前值）
ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Current active connections'
)

@app.get("/api/users")
async def get_users():
    REQUEST_COUNT.labels(method='GET', endpoint='/api/users', status='200').inc()
    with REQUEST_LATENCY.labels(method='GET', endpoint='/api/users').time():
        # 业务逻辑
        return {"users": []}

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type="text/plain")
```

### 2.4 PromQL 常用查询

```promql
# HTTP 请求速率（每秒）
rate(http_requests_total[5m])

# 按 endpoint 分组的请求速率
sum(rate(http_requests_total[5m])) by (endpoint)

# P95 延迟
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 错误率
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))

# CPU 使用率
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 内存使用率
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# 磁盘使用率
(1 - (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes)) * 100
```

### 2.5 告警规则

```yaml
# alerts/app.yml
groups:
  - name: app_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate on {{ $labels.job }}'
          description: 'Error rate is {{ $value | humanizePercentage }}'

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High P95 latency on {{ $labels.endpoint }}'

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: critical
```

### 2.6 Alertmanager 配置

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'

route:
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      repeat_interval: 15m

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#alerts'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<service-key>'

inhibit_rules:
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: ['alertname', 'cluster']
```

## 3. 日志系统

### 3.1 ELK Stack

```
应用 → Filebeat → Logstash → Elasticsearch → Kibana
```

```yaml
# Filebeat 配置
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/app/*.log
    fields:
      app: myapp
      env: production
    json.keys_under_root: true

output.logstash:
  hosts: ['logstash:5044']
```

### 3.2 Loki（轻量级日志）

```yaml
# Promtail 配置
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: app
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            timestamp: timestamp
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339
```

### 3.3 日志最佳实践

```python
# 结构化日志
import structlog

logger = structlog.get_logger()

# 结构化输出
logger.info("request_processed",
    method="GET",
    path="/api/users",
    status=200,
    duration_ms=45,
    user_id="u123")

# 输出:
# {"event":"request_processed","method":"GET","path":"/api/users","status":200,"duration_ms":45,"user_id":"u123","timestamp":"2026-06-14T10:00:00Z"}
```

| 实践           | 描述                        |
| :------------- | :-------------------------- |
| **结构化日志** | 使用 JSON 格式，便于检索    |
| **关联 ID**    | 每个请求分配唯一 trace_id   |
| **日志级别**   | DEBUG/INFO/WARN/ERROR/FATAL |
| **敏感信息**   | 脱敏处理密码、Token         |
| **日志轮转**   | 避免磁盘写满                |

## 4. 链路追踪

### 4.1 OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

# 配置
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# 自动埋点
app = FastAPI()
FastAPIInstrumentor.instrument_app(app)
RequestsInstrumentor().instrument()

# 手动埋点
tracer = trace.get_tracer(__name__)

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", user_id)
        user = fetch_user(user_id)
        span.set_attribute("user.name", user.name)
        return user
```

### 4.2 Jaeger 部署

```yaml
# docker-compose.yml
services:
  jaeger:
    image: jaegertracing/all-in-one:1.54
    environment:
      COLLECTOR_OTLP_ENABLED: true
    ports:
      - '16686:16686' # Jaeger UI
      - '4317:4317' # OTLP gRPC
      - '4318:4318' # OTLP HTTP
```

## 5. SLO/SLI/SLA

### 5.1 概念

| 概念    | 描述                     | 示例                   |
| :------ | :----------------------- | :--------------------- |
| **SLA** | 服务等级协议（合同）     | 99.9% 可用性，否则退款 |
| **SLO** | 服务等级目标（内部目标） | 99.95% 可用性          |
| **SLI** | 服务等级指标（测量值）   | 实际可用性 99.97%      |

### 5.2 错误预算

```
错误预算 = 1 - SLO
月度错误预算（秒）= 30天 × 86400秒 × (1 - SLO)

SLO 99.9% → 月度错误预算 = 43.2 分钟
SLO 99.95% → 月度错误预算 = 21.6 分钟
SLO 99.99% → 月度错误预算 = 4.32 分钟
```

### 5.3 SLO 定义示例

```yaml
# Sloth (SLO 生成器) 配置
version: prometheus/v1
service: myapp
slos:
  - name: 'api-availability'
    objective: 99.9
    description: 'API 服务可用性 SLO'
    sli:
      events:
        error_query: sum(rate(http_requests_total{status=~"5.."}[{{.window}}]))
        total_query: sum(rate(http_requests_total[{{.window}}]))
    alerting:
      name: ApiAvailabilityAlert
      labels:
        team: backend
      page_alert:
        labels:
          severity: critical
      ticket_alert:
        labels:
          severity: warning

  - name: 'api-latency'
    objective: 99.0
    description: 'API P99 延迟 < 500ms'
    sli:
      events:
        error_query: |
          sum(rate(http_request_duration_seconds_bucket{le="0.5"}[{{.window}}]))
          /
          sum(rate(http_request_duration_seconds_count[{{.window}}]))
        total_query: '1'
```

## 6. Grafana Dashboard

### 6.1 关键 Dashboard

| Dashboard      | 核心指标                      |
| :------------- | :---------------------------- |
| **系统概览**   | CPU、内存、磁盘、网络         |
| **应用性能**   | QPS、延迟 P50/P95/P99、错误率 |
| **Kubernetes** | Pod 状态、资源使用、重启次数  |
| **数据库**     | 连接数、查询延迟、慢查询      |
| **业务指标**   | 用户活跃、订单量、转化率      |

### 6.2 Dashboard 即代码

```json
// 使用 Grafana Terraform Provider
resource "grafana_dashboard" "app_dashboard" {
  config_json = jsonencode({
    dashboard = {
      title = "Application Overview"
      panels = [
        {
          title = "Request Rate"
          type  = "timeseries"
          targets = [{
            expr = "sum(rate(http_requests_total[5m])) by (endpoint)"
          }]
        },
        {
          title = "Error Rate"
          type  = "stat"
          targets = [{
            expr = "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
          }]
          thresholds = {
            steps = [
              { value = null, color = "green" },
              { value = 0.01, color = "yellow" },
              { value = 0.05, color = "red" }
            ]
          }
        }
      ]
    }
  })
}
```

## 7. 小结

可观测性是运维的"眼睛"：

1. **三大支柱**（指标/日志/链路）缺一不可，组合使用效果最佳
2. **Prometheus + Grafana** 是监控的事实标准，PromQL 是核心技能
3. **Loki** 比 ELK 更轻量，适合与 Prometheus 生态集成
4. **OpenTelemetry** 是可观测性的未来，统一了指标/日志/链路的采集
5. **SLO/SLI/SLA** 量化服务质量，错误预算指导发布决策
6. Dashboard 即代码，避免手动配置的不可重复性
