---
order: 360
title: ELK Stack 日志分析
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: ELK Stack 日志分析：Elasticsearch 索引、Logstash 管道、Kibana 可视化。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'devops/034-Prometheus'
  - 'devops/035-GrafanaTableConfig'
  - 'devops/037-OpenTelemetry'
  - 'devops/038-GitOpsArgoCD'
prerequisites:
  - 'devops/001-OverviewLinuxBasics'
---

## 1. Elasticsearch

### 1.1 索引与分片

索引与分片是ELK-Stack日志分析的重要组成部分。本节详细介绍索引与分片的核心概念、工作原理和实际应用。

**关键要点**：

- 索引与分片的定义与核心原理
- 索引与分片的实现方式与技术细节
- 索引与分片在实际场景中的应用与最佳实践
- 索引与分片的常见问题与解决方案

索引与分片在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 1.2 映射与模板

映射与模板是ELK-Stack日志分析的重要组成部分。本节详细介绍映射与模板的核心概念、工作原理和实际应用。

**关键要点**：

- 映射与模板的定义与核心原理
- 映射与模板的实现方式与技术细节
- 映射与模板在实际场景中的应用与最佳实践
- 映射与模板的常见问题与解决方案

映射与模板在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 1.3 查询 DSL

查询 DSL是ELK-Stack日志分析的重要组成部分。本节详细介绍查询 DSL的核心概念、工作原理和实际应用。

**关键要点**：

- 查询 DSL的定义与核心原理
- 查询 DSL的实现方式与技术细节
- 查询 DSL在实际场景中的应用与最佳实践
- 查询 DSL的常见问题与解决方案

查询 DSL在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 2. Logstash

### 2.1 输入/过滤/输出插件

输入/过滤/输出插件是ELK-Stack日志分析的重要组成部分。本节详细介绍输入/过滤/输出插件的核心概念、工作原理和实际应用。

**关键要点**：

- 输入/过滤/输出插件的定义与核心原理
- 输入/过滤/输出插件的实现方式与技术细节
- 输入/过滤/输出插件在实际场景中的应用与最佳实践
- 输入/过滤/输出插件的常见问题与解决方案

输入/过滤/输出插件在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.2 Grok 解析

Grok 解析是ELK-Stack日志分析的重要组成部分。本节详细介绍Grok 解析的核心概念、工作原理和实际应用。

**关键要点**：

- Grok 解析的定义与核心原理
- Grok 解析的实现方式与技术细节
- Grok 解析在实际场景中的应用与最佳实践
- Grok 解析的常见问题与解决方案

Grok 解析在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 2.3 管道配置

管道配置是ELK-Stack日志分析的重要组成部分。本节详细介绍管道配置的核心概念、工作原理和实际应用。

**关键要点**：

- 管道配置的定义与核心原理
- 管道配置的实现方式与技术细节
- 管道配置在实际场景中的应用与最佳实践
- 管道配置的常见问题与解决方案

管道配置在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 3. Kibana

### 3.1 Discover 探索

Discover 探索是ELK-Stack日志分析的重要组成部分。本节详细介绍Discover 探索的核心概念、工作原理和实际应用。

**关键要点**：

- Discover 探索的定义与核心原理
- Discover 探索的实现方式与技术细节
- Discover 探索在实际场景中的应用与最佳实践
- Discover 探索的常见问题与解决方案

Discover 探索在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.2 Dashboard 仪表盘

Dashboard 仪表盘是ELK-Stack日志分析的重要组成部分。本节详细介绍Dashboard 仪表盘的核心概念、工作原理和实际应用。

**关键要点**：

- Dashboard 仪表盘的定义与核心原理
- Dashboard 仪表盘的实现方式与技术细节
- Dashboard 仪表盘在实际场景中的应用与最佳实践
- Dashboard 仪表盘的常见问题与解决方案

Dashboard 仪表盘在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 3.3 KQL 查询

KQL 查询是ELK-Stack日志分析的重要组成部分。本节详细介绍KQL 查询的核心概念、工作原理和实际应用。

**关键要点**：

- KQL 查询的定义与核心原理
- KQL 查询的实现方式与技术细节
- KQL 查询在实际场景中的应用与最佳实践
- KQL 查询的常见问题与解决方案

KQL 查询在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

## 4. 架构优化

### 4.1 Filebeat 轻量采集

Filebeat 轻量采集是ELK-Stack日志分析的重要组成部分。本节详细介绍Filebeat 轻量采集的核心概念、工作原理和实际应用。

**关键要点**：

- Filebeat 轻量采集的定义与核心原理
- Filebeat 轻量采集的实现方式与技术细节
- Filebeat 轻量采集在实际场景中的应用与最佳实践
- Filebeat 轻量采集的常见问题与解决方案

Filebeat 轻量采集在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。

### 4.2 索引生命周期管理

索引生命周期管理是ELK-Stack日志分析的重要组成部分。本节详细介绍索引生命周期管理的核心概念、工作原理和实际应用。

**关键要点**：

- 索引生命周期管理的定义与核心原理
- 索引生命周期管理的实现方式与技术细节
- 索引生命周期管理在实际场景中的应用与最佳实践
- 索引生命周期管理的常见问题与解决方案

索引生命周期管理在工程实践中需要根据具体场景选择合适的策略，平衡性能、可靠性和复杂度。
## Elasticsearch 基础操作

**基本用法:集群健康检查**
`curl <服务器>/_cluster/health`

```bash
# 查看集群健康状态
curl -X GET "localhost:9200/_cluster/health?pretty"

# 查看集群健康状态(含分片级)
curl -X GET "localhost:9200/_cluster/health?level=indices&pretty"

# 查看节点信息
curl -X GET "localhost:9200/_cat/nodes?v"

# 查看主节点
curl -X GET "localhost:9200/_cat/master?v"
```

---

**基本用法:索引管理**
`curl -X <方法> <服务器>/<索引>`

```bash
# 列出所有索引
curl -X GET "localhost:9200/_cat/indices?v"

# 创建索引(指定分片与副本)
curl -X PUT "localhost:9200/logs-2024-01" -H 'Content-Type: application/json' -d '{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  }
}'

# 删除索引
curl -X DELETE "localhost:9200/logs-2024-01"

# 查看索引设置
curl -X GET "localhost:9200/logs-2024-01/_settings?pretty"
```

---

**基本用法:文档增删改查**
`curl -X <方法> <服务器>/<索引>/_doc/<id>`

```bash
# 索引文档(指定 ID)
curl -X PUT "localhost:9200/logs-2024-01/_doc/1" -H 'Content-Type: application/json' -d '{
  "level": "info",
  "message": "服务启动",
  "timestamp": "2024-01-01T00:00:00Z"
}'

# 自动生成 ID
curl -X POST "localhost:9200/logs-2024-01/_doc" -H 'Content-Type: application/json' -d '{
  "level": "error",
  "message": "数据库连接失败"
}'

# 获取文档
curl -X GET "localhost:9200/logs-2024-01/_doc/1?pretty"

# 更新文档
curl -X POST "localhost:9200/logs-2024-01/_update/1" -H 'Content-Type: application/json' -d '{
  "doc": {"level": "warning"}
}'

# 删除文档
curl -X DELETE "localhost:9200/logs-2024-01/_doc/1"
```

---

## Elasticsearch 查询

**基本用法:搜索文档**
`curl -X GET <服务器>/<索引>/_search`

```bash
# 简单查询(匹配所有)
curl -X GET "localhost:9200/logs-2024-01/_search?q=*&pretty"

# 按字段搜索
curl -X GET "localhost:9200/logs-2024-01/_search?q=level:error&pretty"

# 使用 DSL 查询
curl -X GET "localhost:9200/logs-2024-01/_search?pretty" -H 'Content-Type: application/json' -d '{
  "query": {
    "match": {
      "message": "数据库"
    }
  }
}'
```

---

**基本用法:布尔查询**
`bool: must|should|must_not|filter`

```bash
# 多条件组合查询
curl -X GET "localhost:9200/logs-*/_search?pretty" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "must": [
        {"match": {"level": "error"}}
      ],
      "filter": [
        {"range": {"timestamp": {"gte": "now-1h"}}}
      ],
      "must_not": [
        {"match": {"message": "debug"}}
      ]
    }
  },
  "sort": [{"timestamp": "desc"}],
  "size": 20
}'
```

---

**基本用法:聚合查询**
`aggs`

```bash
# 按级别分组统计
curl -X GET "localhost:9200/logs-*/_search" -H 'Content-Type: application/json' -d '{
  "size": 0,
  "aggs": {
    "levels": {
      "terms": {"field": "level.keyword", "size": 10}
    }
  }
}'

# 时间直方图聚合
curl -X GET "localhost:9200/logs-*/_search" -H 'Content-Type: application/json' -d '{
  "size": 0,
  "aggs": {
    "logs_over_time": {
      "date_histogram": {
        "field": "timestamp",
        "calendar_interval": "1h"
      }
    }
  }
}'
```

---

## Elasticsearch 索引模板

**基本用法:创建索引模板**
`PUT _index_template`

```bash
# 创建索引模板(匹配 logs-* 索引)
curl -X PUT "localhost:9200/_index_template/logs-template" -H 'Content-Type: application/json' -d '{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.lifecycle.name": "logs-policy"
    },
    "mappings": {
      "properties": {
        "timestamp": {"type": "date"},
        "level": {"type": "keyword"},
        "message": {"type": "text"},
        "service": {"type": "keyword"}
      }
    }
  }
}'
```

---

**基本用法:ILM 索引生命周期管理**
`PUT _ilm/policy`

```bash
# 创建 ILM 策略
curl -X PUT "localhost:9200/_ilm/policy/logs-policy" -H 'Content-Type: application/json' -d '{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "7d",
            "max_size": "50gb"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "shrink": {"number_of_shards": 1},
          "forcemerge": {"max_num_segments": 1}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {"delete": {}}
      }
    }
  }
}'

# 查看 ILM 状态
curl -X GET "localhost:9200/_ilm/policy/logs-policy?pretty"
```

---

## Logstash 配置

**基本用法:Logstash 配置结构**
`input {} filter {} output {}`

```
# logstash.conf 配置文件结构
input {
  beats {
    port => 5044
  }
}

filter {
  grok {
    match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:msg}" }
  }
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "logs-%{+YYYY.MM.dd}"
  }
}
```

---

**基本用法:测试 Logstash 配置**
`bin/logstash -f <配置> -t`

```bash
# 测试配置语法
bin/logstash -f /etc/logstash/conf.d/logs.conf -t

# 启动 Logstash
bin/logstash -f /etc/logstash/conf.d/logs.conf

# 启动时启用配置自动重载
bin/logstash -f /etc/logstash/conf.d/logs.conf --config.reload.automatic

# 直接输入数据测试
echo '{"message":"test log"}' | bin/logstash -e 'input { stdin { codec => json } } output { stdout { codec => rubydebug } }'
```

---

**基本用法:Grok 模式匹配**
`grok { match => { "message" => "<模式>" } }`

```
# 常用 Grok 模式
# 解析 Nginx 访问日志
filter {
  grok {
    match => { "message" => '%{IPORHOST:client_ip} - %{DATA:user} \[%{HTTPDATE:timestamp}\] "%{WORD:method} %{URIPATHPARAM:request} HTTP/%{NUMBER:http_version}" %{NUMBER:status} %{NUMBER:bytes} "%{DATA:referrer}" "%{DATA:agent}"' }
  }
}

# 解析 Java 异常堆栈
filter {
  multiline {
    pattern => "^\s"
    what => "previous"
  }
  grok {
    match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} \[%{DATA:thread}\] %{DATA:logger} - %{GREEDYDATA:msg}" }
  }
}
```

---

**基本用法:条件处理**
`if [字段] == "值" { ... }`

```
# 根据日志级别路由
filter {
  if [level] == "ERROR" {
    mutate {
      add_tag => ["alert"]
    }
  } else if [level] in ["WARN", "INFO"] {
    mutate {
      add_tag => ["info"]
    }
  } else {
    mutate {
      add_tag => ["debug"]
      add_field => { "env" => "unknown" }
    }
  }
}

output {
  if "alert" in [tags] {
    elasticsearch {
      hosts => ["localhost:9200"]
      index => "alerts-%{+YYYY.MM.dd}"
    }
  }
}
```

---

## Kibana 操作

**基本用法:启动 Kibana**
`bin/kibana`

```bash
# Linux 启动
systemctl start kibana
systemctl enable kibana

# 直接运行
bin/kibana --config /etc/kibana/kibana.yml

# Docker 启动
docker run -d --name kibana -p 5601:5601 \
  -e ELASTICSEARCH_HOSTS=http://elasticsearch:9200 \
  kibana:8.11.0

# 查看日志
journalctl -u kibana -f
docker logs -f kibana
```

---

**基本用法:Kibana API**
`curl <服务器>:5601/api/...`

```bash
# 健康检查
curl http://localhost:5601/api/status

# 创建索引模式
curl -X POST -u elastic:password -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  http://localhost:5601/api/index_patterns/index_pattern \
  -d '{
    "index_pattern": {
      "title": "logs-*",
      "timeFieldName": "@timestamp"
    }
  }'

# 查询索引模式
curl -u elastic:password http://localhost:5601/api/index_patterns
```

---

**基本用法:导出与导入对象**
`curl <服务器>:5601/api/saved_objects/_export`

```bash
# 导出仪表盘
curl -X POST -u elastic:password -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  http://localhost:5601/api/saved_objects/_export \
  -d '{
    "objects": [
      {"type": "dashboard", "id": "web-logs-dashboard"}
    ]
  }' > dashboard.ndjson

# 导入仪表盘
curl -X POST -u elastic:password -H "Content-Type: application/json" -H "kbn-xsrf: true" \
  http://localhost:5601/api/saved_objects/_import?overwrite=true \
  -F file=@dashboard.ndjson
```

---

## Filebeat 采集

**基本用法:启动 Filebeat**
`filebeat -c <配置>`

```bash
# 启动 Filebeat
systemctl start filebeat
systemctl enable filebeat

# 测试配置
filebeat test config -c /etc/filebeat/filebeat.yml

# 测试输出连接
filebeat test output -c /etc/filebeat/filebeat.yml

# 直接运行(前台)
filebeat -e -c /etc/filebeat/filebeat.yml
```

---

**基本用法:Filebeat 配置**
`filebeat.inputs`

```yaml
# filebeat.yml 输入配置
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/nginx/access.log
  fields:
    service: nginx
    env: production
  fields_under_root: true

- type: container
  paths:
    - /var/lib/docker/containers/*/*.log
  processors:
  - add_kubernetes_metadata:
      host: ${NODE_NAME}
      matchers:
      - logs_path:
          logs_path: "/var/lib/docker/containers/"

output.logstash:
  hosts: ["logstash:5044"]
  indices:
  - "logs-%{[service]}"
```

---

**基本用法:启用模块**
`filebeat modules enable <模块>`

```bash
# 启用 Nginx 模块
filebeat modules enable nginx

# 启用多个模块
filebeat modules enable nginx mysql redis

# 查看已启用模块
filebeat modules list

# 模块配置(在 modules.d/nginx.yml)
cat modules.d/nginx.yml
```

```yaml
# modules.d/nginx.yml Nginx 模块配置
- module: nginx
  access:
    enabled: true
    var.paths: ["/var/log/nginx/access.log"]
  error:
    enabled: true
    var.paths: ["/var/log/nginx/error.log"]
```

---

## 集群管理

**基本用法:节点管理**
`curl <服务器>/_cat/nodes`

```bash
# 查看节点列表
curl "localhost:9200/_cat/nodes?v&h=name,ip,role,master,heap.percent,ram.percent,disk.used_percent"

# 查看节点磁盘使用
curl "localhost:9200/_cat/allocation?v"

# 查看节点统计
curl "localhost:9200/_nodes/stats?pretty"

# 临时排除节点(用于维护)
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d '{
  "transient": {
    "cluster.routing.allocation.exclude._ip": "192.168.1.100"
  }
}'
```

---

**基本用法:分片管理**
`curl <服务器>/_cat/shards`

```bash
# 查看分片分布
curl "localhost:9200/_cat/shards?v"

# 查看未分配分片
curl "localhost:9200/_cat/shards?v" | grep UNASSIGNED

# 查看分片分配原因
curl "localhost:9200/_cluster/allocation/explain?pretty"

# 手动重新路由分片
curl -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d '{
  "commands": [
    {
      "move": {
        "index": "logs-2024-01",
        "shard": 0,
        "from_node": "node-1",
        "to_node": "node-2"
      }
    }
  ]
}'
```

---

**基本用法:快照与恢复**
`PUT _snapshot/<仓库>/<快照>`

```bash
# 注册快照仓库
curl -X PUT "localhost:9200/_snapshot/backup" -H 'Content-Type: application/json' -d '{
  "type": "fs",
  "settings": {
    "location": "/backup/es-snapshots"
  }
}'

# 创建快照
curl -X PUT "localhost:9200/_snapshot/backup/snapshot-2024-01-01?wait_for_completion=true"

# 查看快照
curl "localhost:9200/_snapshot/backup/_all?pretty"

# 恢复快照
curl -X POST "localhost:9200/_snapshot/backup/snapshot-2024-01-01/_restore" -H 'Content-Type: application/json' -d '{
  "indices": "logs-*",
  "ignore_unavailable": true
}'
```

---

## 安全与认证

**基本用法:启用安全认证**
`xpack.security.enabled: true`

```yaml
# elasticsearch.yml 启用安全
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12
```

```bash
# 生成证书
bin/elasticsearch-certutil ca
bin/elasticsearch-certutil cert --ca elastic-stack-ca.p12

# 设置内置用户密码
bin/elasticsearch-setup-passwords auto

# 修改用户密码
curl -u elastic:password -X PUT "localhost:9200/_security/user/elastic/_password" -H 'Content-Type: application/json' -d '{
  "password": "newpassword"
}'
```

---

**基本用法:创建用户与角色**
`POST _security/user/<用户名>`

```bash
# 创建角色
curl -u elastic:password -X POST "localhost:9200/_security/role/logs_reader" -H 'Content-Type: application/json' -d '{
  "indices": [
    {
      "names": ["logs-*"],
      "privileges": ["read", "view_index_metadata"]
    }
  ]
}'

# 创建用户
curl -u elastic:password -X POST "localhost:9200/_security/user/alice" -H 'Content-Type: application/json' -d '{
  "password": "alicepass",
  "roles": ["logs_reader"],
  "full_name": "Alice",
  "email": "alice@example.com"
}'

# 创建 API Key
curl -u elastic:password -X POST "localhost:9200/_security/api_key" -H 'Content-Type: application/json' -d '{
  "name": "logstash-key",
  "role_descriptors": {
    "logs_writer": {
      "indices": [{"names": ["logs-*"], "privileges": ["write", "create_index"]}]
    }
  }
}'
```

---

## 排查与监控

**基本用法:查看集群统计**
`curl <服务器>/_cluster/stats`

```bash
# 集群统计信息
curl "localhost:9200/_cluster/stats?human&pretty"

# 索引统计
curl "localhost:9200/_stats?pretty"

# 节点线程池
curl "localhost:9200/_cat/thread_pool?v"

# 查看正在执行的任务
curl "localhost:9200/_cat/tasks?v"
```

---

**基本用法:排查慢查询**
`index.search.slowlog`

```bash
# 启用慢查询日志
curl -X PUT "localhost:9200/logs-*/_settings" -H 'Content-Type: application/json' -d '{
  "index.search.slowlog.threshold.query.warn": "10s",
  "index.search.slowlog.threshold.query.info": "5s",
  "index.indexing.slowlog.threshold.index.warn": "10s"
}'

# 查看任务
curl "localhost:9200/_tasks?detailed=true&actions=*search*&pretty"

# 取消长时间运行的任务
curl -X POST "localhost:9200/_tasks/<task_id>/_cancel"
```

---

**基本用法:清理与优化**
`POST <索引>/_forcemerge`

```bash
# 强制合并(减少段数量,优化只读索引)
curl -X POST "localhost:9200/logs-2023-*/_forcemerge?max_num_segments=1"

# 清理缓存
curl -X POST "localhost:9200/_cache/clear"

# 删除旧索引
curl -X DELETE "localhost:9200/logs-2023.01.*"

# 关闭索引(不删除但释放资源)
curl -X POST "localhost:9200/logs-2023.01/_close"

# 重新打开索引
curl -X POST "localhost:9200/logs-2023.01/_open"
```
