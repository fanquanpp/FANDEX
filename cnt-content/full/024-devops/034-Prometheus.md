---
order: 340
title: Prometheus 指标采集与告警
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: Prometheus 指标采集与 Alertmanager 告警：PromQL、规则配置与通知路由。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'devops/032-Terraform'
  - 'devops/033-AnsiblePlaybookConfigManagement'
  - 'devops/035-GrafanaTableConfig'
  - 'devops/036-ELKStackLogAnalysis'
prerequisites:
  - 'devops/001-OverviewLinuxBasics'
---

## 1. Prometheus 架构

### 1.1 Pull 模型

Pull 模型是Prometheus指标采集与告警的重要组成部分。本节详细介绍Pull 模型的核心概念、工作原理和实际应用。

**关键要点**：

- Pull 模型的定义与核心原理
- Pull 模型的实现方式与技术细节
- Pull 模型在实际场景中的应用与最佳实践
- Pull 模型的常见问题与解决方案

Pull 模型在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 1.2 四种指标类型

四种指标类型是Prometheus指标采集与告警的重要组成部分。本节详细介绍四种指标类型的核心概念、工作原理和实际应用。

**关键要点**：

- 四种指标类型的定义与核心原理
- 四种指标类型的实现方式与技术细节
- 四种指标类型在实际场景中的应用与最佳实践
- 四种指标类型的常见问题与解决方案

四种指标类型在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 2. PromQL 查询

### 2.1 即时向量与范围向量

即时向量与范围向量是Prometheus指标采集与告警的重要组成部分。本节详细介绍即时向量与范围向量的核心概念、工作原理和实际应用。

**关键要点**：

- 即时向量与范围向量的定义与核心原理
- 即时向量与范围向量的实现方式与技术细节
- 即时向量与范围向量在实际场景中的应用与最佳实践
- 即时向量与范围向量的常见问题与解决方案

即时向量与范围向量在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.2 聚合操作

聚合操作是Prometheus指标采集与告警的重要组成部分。本节详细介绍聚合操作的核心概念、工作原理和实际应用。

**关键要点**：

- 聚合操作的定义与核心原理
- 聚合操作的实现方式与技术细节
- 聚合操作在实际场景中的应用与最佳实践
- 聚合操作的常见问题与解决方案

聚合操作在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.3 常用查询模式

常用查询模式是Prometheus指标采集与告警的重要组成部分。本节详细介绍常用查询模式的核心概念、工作原理和实际应用。

**关键要点**：

- 常用查询模式的定义与核心原理
- 常用查询模式的实现方式与技术细节
- 常用查询模式在实际场景中的应用与最佳实践
- 常用查询模式的常见问题与解决方案

常用查询模式在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 3. 告警配置

### 3.1 告警规则

告警规则是Prometheus指标采集与告警的重要组成部分。本节详细介绍告警规则的核心概念、工作原理和实际应用。

**关键要点**：

- 告警规则的定义与核心原理
- 告警规则的实现方式与技术细节
- 告警规则在实际场景中的应用与最佳实践
- 告警规则的常见问题与解决方案

告警规则在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.2 Alertmanager 路由

Alertmanager 路由是Prometheus指标采集与告警的重要组成部分。本节详细介绍Alertmanager 路由的核心概念、工作原理和实际应用。

**关键要点**：

- Alertmanager 路由的定义与核心原理
- Alertmanager 路由的实现方式与技术细节
- Alertmanager 路由在实际场景中的应用与最佳实践
- Alertmanager 路由的常见问题与解决方案

Alertmanager 路由在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.3 抑制与静默

抑制与静默是Prometheus指标采集与告警的重要组成部分。本节详细介绍抑制与静默的核心概念、工作原理和实际应用。

**关键要点**：

- 抑制与静默的定义与核心原理
- 抑制与静默的实现方式与技术细节
- 抑制与静默在实际场景中的应用与最佳实践
- 抑制与静默的常见问题与解决方案

抑制与静默在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 4. 最佳实践

### 4.1 指标命名

指标命名是Prometheus指标采集与告警的重要组成部分。本节详细介绍指标命名的核心概念、工作原理和实际应用。

**关键要点**：

- 指标命名的定义与核心原理
- 指标命名的实现方式与技术细节
- 指标命名在实际场景中的应用与最佳实践
- 指标命名的常见问题与解决方案

指标命名在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 4.2 标签设计

标签设计是Prometheus指标采集与告警的重要组成部分。本节详细介绍标签设计的核心概念、工作原理和实际应用。

**关键要点**：

- 标签设计的定义与核心原理
- 标签设计的实现方式与技术细节
- 标签设计在实际场景中的应用与最佳实践
- 标签设计的常见问题与解决方案

标签设计在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 4.3 告警分级

告警分级是Prometheus指标采集与告警的重要组成部分。本节详细介绍告警分级的核心概念、工作原理和实际应用。

**关键要点**：

- 告警分级的定义与核心原理
- 告警分级的实现方式与技术细节
- 告警分级在实际场景中的应用与最佳实践
- 告警分级的常见问题与解决方案

告警分级在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。
## promtool 工具

**基本用法:检查配置**
`promtool check config <配置文件>`

```bash
# 检查 prometheus.yml 配置语法
promtool check config /etc/prometheus/prometheus.yml

# 检查规则文件
promtool check rules /etc/prometheus/rules/*.yml

# 检查告警规则文件
promtool check rules alerts.yml
```

---

**基本用法:测试 PromQL 查询**
`promtool query instant <服务器> <查询表达式>`

```bash
# 即时查询
promtool query instant http://localhost:9090 'up'

# 查询 CPU 使用率
promtool query instant http://localhost:9090 '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'

# 范围查询
promtool query range http://localhost:9090 'up' --start=2024-01-01T00:00:00Z --end=2024-01-01T01:00:00Z --step=60s
```

---

**基本用法:调试告警规则**
`promtool test rules <test.yaml>`

```yaml
# test.yaml 告警规则测试
rule_files:
- alerts.yml
evaluation_interval: 1m
tests:
- interval: 1m
  input_series:
  - series: 'node_cpu_seconds_total{mode="idle",instance="node1"}'
    values: '0+100x10'
  alert_rule_test:
  - eval_time: 10m
    alertname: HighCpuUsage
    exp_alerts:
    - exp_labels:
        severity: warning
        instance: node1
```

```bash
# 执行测试
promtool test rules test.yaml
```

---

## 基础查询 PromQL

**基本用法:即时查询**
`curl -G <服务器>/api/v1/query --data-urlencode "query=<表达式>"`

```bash
# 通过 HTTP 即时查询
curl -G http://localhost:9090/api/v1/query --data-urlencode "query=up"

# 查询所有节点的 CPU 空闲率
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode "query=node_cpu_seconds_total{mode='idle'}"

# 查询指定时间点的数据
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode "query=up" \
  --data-urlencode "time=1704067200"
```

---

**基本用法:范围查询**
`curl -G <服务器>/api/v1/query_range --data-urlencode "query=<表达式>"`

```bash
# 范围查询(过去 1 小时,每 60 秒采样)
curl -G http://localhost:9090/api/v1/query_range \
  --data-urlencode "query=up" \
  --data-urlencode "start=$(date -d '1 hour ago' +%s)" \
  --data-urlencode "end=$(date +%s)" \
  --data-urlencode "step=60"
```

---

**基本用法:基础指标查询**
`<指标名>`

```promql
# 查询所有 up 指标
up

# 查询指定 job 的指标
up{job="node-exporter"}

# 查询匹配多个标签
node_cpu_seconds_total{job="node-exporter", mode="idle"}

# 使用正则匹配
http_requests_total{method=~"GET|POST"}

# 使用负向匹配
http_requests_total{status!~"5.."}
```

---

## 聚合与计算

**基本用法:聚合函数**
`<函数>(<表达式>) by (<标签>)`

```promql
# 按实例平均 CPU 使用率
avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))

# 按 job 统计 HTTP 请求总数
sum by (job) (http_requests_total)

# 按方法统计每秒请求量
sum by (method) (rate(http_requests_total[5m]))

# 计算多实例最大值
max by (instance) (node_memory_MemAvailable_bytes)

# 计算分位数
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

---

**基本用法:速率计算**
`rate(<指标>[<时间窗口>])`

```promql
# 每秒速率(适用于 counter)
rate(http_requests_total[5m])

# 增量(适用于 counter,不归一化)
increase(http_requests_total[1h])

# irate 即时速率(更高精度但更不稳定)
irate(http_requests_total[1m])

# 计算过去 5 分钟的平均 QPS
sum(rate(http_requests_total[5m]))
```

---

**基本用法:数学运算**
`<表达式> <运算符> <表达式>`

```promql
# 计算内存使用率
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# 计算 CPU 使用率(百分比)
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 单位转换(字节转 GB)
node_memory_MemTotal_bytes / 1024 / 1024 / 1024

# 使用 clamp 防止异常值
clamp_max(clamp_min(rate(http_requests_total[5m]), 0), 1000)
```

---

## 告警规则

**基本用法:定义告警规则**
`groups: - rules:`

```yaml
# alerts.yml 告警规则文件
groups:
- name: node-alerts
  rules:
  - alert: HighCpuUsage
    expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "CPU 使用率过高 {{ $labels.instance }}"
      description: "实例 {{ $labels.instance }} CPU 使用率超过 80%,当前值: {{ $value }}%"
```

---

**基本用法:多条件告警**
`expr: <表达式1> and <表达式2>`

```yaml
# 多条件组合告警
groups:
- name: composite-alerts
  rules:
  - alert: HighMemoryAndCpu
    expr: >
      (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.2)
      and
      (100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80)
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "节点 {{ $labels.instance }} 内存和 CPU 同时告急"

  - alert: PodCrashLooping
    expr: increase(kube_pod_container_status_restarts_total[1h]) > 5
    for: 5m
    labels:
      severity: warning
```

---

**基本用法:告警抑制与静默**
`inhibit_rules:`

```yaml
# 抑制规则:节点宕机时不发送其上所有 Pod 告警
inhibit_rules:
- source_match:
    alert: NodeDown
  target_match_re:
    alert: PodDown|ServiceDown
  equal: ['node']

# 通过 Alertmanager API 创建静默
curl -X POST http://alertmanager:9093/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "instance", "value": "node1", "isRegex": false}],
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-01-01T02:00:00Z",
    "createdBy": "admin",
    "comment": "维护窗口"
  }'
```

---

## 服务发现

**基本用法:Kubernetes 服务发现**
`kubernetes_sd_configs`

```yaml
# prometheus.yml K8s 服务发现配置
scrape_configs:
- job_name: 'kubernetes-pods'
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
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port, __meta_kubernetes_pod_ip]
    action: replace
    target_label: __address__
    regex: (.+);(.+)
    replacement: $2:$1
```

---

**基本用法:静态配置**
`static_configs`

```yaml
# 静态目标配置
scrape_configs:
- job_name: 'node-exporter'
  static_configs:
  - targets:
    - 'node1:9100'
    - 'node2:9100'
    labels:
      env: production

- job_name: 'mysql-exporter'
  static_configs:
  - targets: ['mysql-exporter:9104']
```

---

**基本用法:文件服务发现**
`file_sd_configs`

```yaml
# 基于文件的服务发现
scrape_configs:
- job_name: 'file-based'
  file_sd_configs:
  - files:
    - '/etc/prometheus/targets/*.yml'
    refresh_interval: 30s
```

```yaml
# targets/web.yml 目标文件
- targets:
  - web1.example.com:9100
  - web2.example.com:9100
  labels:
    service: web
```

---

## 标签与重新标记

**基本用法:relabel_configs**
`relabel_configs`

```yaml
# 重新标记示例
scrape_configs:
- job_name: 'node'
  static_configs:
  - targets: ['node1:9100']
  relabel_configs:
  - source_labels: [__address__]
    target_label: instance
    regex: '([^:]+):.*'
    replacement: '$1'

  # 过滤目标
  - source_labels: [__meta_kubernetes_pod_phase]
    action: keep
    regex: Running

  # 标签映射
  - source_labels: [__meta_kubernetes_namespace]
    target_label: namespace
```

---

**基本用法:metric_relabel_configs**
`metric_relabel_configs`

```yaml
# 采集后修改指标(过滤、改名等)
scrape_configs:
- job_name: 'app'
  static_configs:
  - targets: ['app:8080']
  metric_relabel_configs:
  # 丢弃高基数指标
  - source_labels: [__name__]
    regex: 'go_.*'
    action: drop

  # 重命名指标
  - source_labels: [__name__]
    target_label: __name__
    regex: 'http_requests_total'
    replacement: 'app_http_requests_total'
```

---

## 远程存储与联邦

**基本用法:远程写入**
`remote_write`

```yaml
# 远程写入配置(发送到 Thanos/Mimir 等)
remote_write:
- url: 'http://mimir:8080/api/v1/push'
  headers:
    X-Scope-OrgID: tenant1
  write_relabel_configs:
  - source_labels: [__name__]
    regex: 'go_.*'
    action: drop

# 远程读取
remote_read:
- url: 'http://mimir:8080/api/v1/read'
```

---

**基本用法:联邦集群**
`scrape_configs with federation`

```yaml
# 联邦配置(从其他 Prometheus 抓取)
scrape_configs:
- job_name: 'federate'
  scrape_interval: 30s
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
    - '{job="node-exporter"}'
    - '{__name__=~"job:.*"}'
  static_configs:
  - targets: ['prometheus-child:9090']
```

---

## API 查询

**基本用法:查询指标元数据**
`curl <服务器>/api/v1/<端点>`

```bash
# 查询所有指标名
curl http://localhost:9090/api/v1/label/__name__/values

# 查询标签值
curl http://localhost:9090/api/v1/label/job/values

# 查询指标元数据
curl http://localhost:9090/api/v1/metadata

# 查询目标状态
curl http://localhost:9090/api/v1/targets
```

---

**基本用法:查询告警状态**
`curl <服务器>/api/v1/alerts`

```bash
# 查询当前触发的告警
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | {alertname: .labels.alertname, state: .state}'

# 查询规则
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[]'

# 查询 Alertmanager 告警
curl http://alertmanager:9093/api/v2/alerts | jq '.[]'
```

---

**基本用法:管理 Alertmanager 静默**
`curl -X <方法> <alertmanager>/api/v2/silences`

```bash
# 列出所有静默
curl http://alertmanager:9093/api/v2/silences

# 创建静默
curl -X POST http://alertmanager:9093/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": "HighCpuUsage", "isRegex": false}],
    "startsAt": "2024-01-01T00:00:00Z",
    "endsAt": "2024-01-01T04:00:00Z",
    "createdBy": "ops",
    "comment": "夜间维护"
  }'

# 删除静默(需要静默 ID)
curl -X DELETE http://alertmanager:9093/api/v2/silence/<silence-id>
```

---

## 性能与排查

**基本用法:查看采集状态**
`curl <服务器>/api/v1/targets`

```bash
# 查看所有采集目标状态
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health, lastError: .lastError}'

# 查看失败的目标
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health=="down")'

# 查看 TSDB 状态
curl -s http://localhost:9090/api/v1/status/tsdb | jq '.data'
```

---

**基本用法:检查配置与规则**
`curl <服务器>/api/v1/status/config`

```bash
# 查看当前配置
curl -s http://localhost:9090/api/v1/status/config | jq '.data.yaml'

# 查看规则
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups[]'

# 查看_flags
curl -s http://localhost:9090/api/v1/status/flags | jq '.data'

# 查看 TSDB 统计信息
curl -s http://localhost:9090/api/v1/status/tsdb | jq '.data.seriesCountByMetricName | to_entries | sort_by(.value) | reverse | .[:10]'
```

---

**基本用法:热重载配置**
`curl -X POST <服务器>/-/reload`

```bash
# 热重载配置文件
curl -X POST http://localhost:9090/-/reload

# 或者发送 SIGHUP 信号
kill -HUP $(pgrep prometheus)

# 验证配置生效
curl -s http://localhost:9090/api/v1/status/config | jq '.data.yaml | fromyaml | .scrape_configs | length'
```
