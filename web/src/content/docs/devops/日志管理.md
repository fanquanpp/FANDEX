---
order: 53
title: 日志管理
module: devops
category: 运维
difficulty: intermediate
description: '日志管理：日志采集、ELK Stack、Fluentd、日志格式与日志分析'
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/包管理与仓库
  - devops/服务网格
  - devops/配置管理
  - devops/性能调优
prerequisites:
  - devops/概述与Linux基础
---

## 1. 日志管理概述

### 1.1 日志级别

| 级别  | 说明                   | 示例               |
| ----- | ---------------------- | ------------------ |
| FATAL | 致命错误，系统无法继续 | 数据库连接失败     |
| ERROR | 错误，影响功能         | API 调用失败       |
| WARN  | 警告，潜在问题         | 磁盘空间不足       |
| INFO  | 重要信息               | 服务启动、请求完成 |
| DEBUG | 调试信息               | 变量值、执行路径   |
| TRACE | 详细跟踪               | 函数进出           |

### 1.2 日志最佳实践

- 使用结构化日志（JSON 格式）
- 包含请求 ID 用于追踪
- 避免记录敏感信息
- 设置合理的日志级别
- 日志轮转和归档

## 2. ELK Stack

### 2.1 架构

```
应用 → Filebeat → Logstash → Elasticsearch → Kibana
                      ↑
                 其他数据源
```

| 组件          | 功能         |
| ------------- | ------------ |
| Elasticsearch | 存储和搜索   |
| Logstash      | 数据处理管道 |
| Kibana        | 可视化界面   |
| Beats         | 轻量级采集器 |

### 2.2 Elasticsearch

**索引管理**：

```bash
# 创建索引
PUT /my-logs
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "timestamp": { "type": "date" },
      "level": { "type": "keyword" },
      "message": { "type": "text" },
      "service": { "type": "keyword" },
      "trace_id": { "type": "keyword" }
    }
  }
}

# 索引生命周期管理（ILM）
PUT _ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": { "max_age": "1d", "max_size": "50gb" }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": { "freeze": {} }
      },
      "delete": {
        "min_age": "90d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

### 2.3 Logstash

**管道配置**：

```ruby
input {
  beats {
    port => 5044
  }
  kafka {
    topics => ["app-logs"]
    group_id => "logstash"
  }
}

filter {
  grok {
    match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:msg}" }
  }
  json {
    source => "message"
    target => "parsed"
  }
  mutate {
    remove_field => ["message"]
    add_field => { "env" => "production" }
  }
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "logs-%{[service]}-%{+YYYY.MM.dd}"
  }
}
```

### 2.4 Kibana

**常用查询语法（KQL）**：

```
level: "ERROR" AND service: "api-gateway"
trace_id: "abc123"
@timestamp >= "2026-06-14" AND message: "timeout"
```

**可视化**：

- Discover：日志搜索和浏览
- Dashboard：仪表盘
- Lens：可视化构建器
- APM：应用性能监控

## 3. Fluentd / Fluent Bit

### 3.1 Fluentd

统一日志采集和处理：

```ruby
# fluent.conf
<source>
  @type tail
  path /var/log/app/*.log
  pos_file /var/log/fluent/app.log.pos
  tag app.logs
  <parse>
    @type json
  </parse>
</source>

<filter app.**>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    environment "production"
  </record>
</filter>

<match app.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix fluentd
  <buffer>
    @type file
    path /var/log/fluent/buffer
    flush_interval 5s
  </buffer>
</match>
```

### 3.2 Fluent Bit

轻量级日志处理器，适合边缘和容器环境：

```ini
[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*
    Mem_Buf_Limit     5MB
    Skip_Long_Lines   On

[FILTER]
    Name              kubernetes
    Match             kube.*
    Kube_URL          https://kubernetes.default.svc:443
    Kube_CA_File      /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File   /var/run/secrets/kubernetes.io/serviceaccount/token

[OUTPUT]
    Name              es
    Match             *
    Host              elasticsearch
    Port              9200
    Logstash_Format   On
    Replace_Dots      On
    Retry_Limit       False
```

### 3.3 Fluentd vs Fluent Bit

| 特性     | Fluentd  | Fluent Bit |
| -------- | -------- | ---------- |
| 语言     | Ruby + C | C          |
| 内存     | 较高     | 极低       |
| 功能     | 丰富     | 核心功能   |
| 适用场景 | 服务器   | 容器/边缘  |
| 插件     | 500+     | 100+       |

## 4. 结构化日志

### 4.1 JSON 日志格式

```json
{
  "timestamp": "2026-06-14T10:30:00.123Z",
  "level": "INFO",
  "service": "user-service",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "user_id": "user_001",
  "method": "GET",
  "path": "/api/users/001",
  "status_code": 200,
  "duration_ms": 45,
  "message": "Request completed"
}
```

### 4.2 各语言日志库

| 语言    | 日志库                     | 结构化支持 |
| ------- | -------------------------- | ---------- |
| Java    | Logback + Logstash Encoder | 是         |
| Go      | zap, zerolog               | 是         |
| Python  | structlog                  | 是         |
| Node.js | pino, winston              | 是         |
| Rust    | tracing, slog              | 是         |

## 5. 日志采集架构

### 5.1 DaemonSet 模式

每个节点运行一个日志采集器：

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
spec:
  template:
    spec:
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:3.0
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: containers
              mountPath: /var/lib/docker/containers
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: containers
          hostPath:
            path: /var/lib/docker/containers
```

### 5.2 Sidecar 模式

每个 Pod 运行一个日志采集器 Sidecar：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-logging
spec:
  containers:
    - name: app
      image: my-app
    - name: log-collector
      image: fluent/fluent-bit:3.0
      volumeMounts:
        - name: log-volume
          mountPath: /logs
  volumes:
    - name: log-volume
      emptyDir: {}
```

### 5.3 模式对比

| 模式      | 资源开销 | 灵活性 | 适用场景   |
| --------- | -------- | ------ | ---------- |
| DaemonSet | 低       | 低     | 标准日志   |
| Sidecar   | 高       | 高     | 特殊格式   |
| 应用直推  | 无       | 最高   | 云原生应用 |

## 6. 日志分析

### 6.1 常用分析场景

**错误率监控**：

```promql
sum(rate(log_entries{level="ERROR"}[5m]))
/
sum(rate(log_entries[5m]))
```

**慢请求分析**：

```
KQL: duration_ms: > 1000 AND level: "WARN"
```

**异常检测**：

- 基于统计的异常检测
- 日志模式聚类
- 关联分析（同一 trace_id 的日志）

### 6.2 日志告警

```yaml
# Elasticsearch 告警规则
- name: error_rate_alert
  index: logs-*
  type: frequency
  filter:
    - term:
        level: ERROR
  threshold: 100
  timeframe:
    minutes: 5
  alert:
    - email
    - slack
```
