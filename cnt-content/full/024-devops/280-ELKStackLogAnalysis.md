---
order: 280
title: ELK Stack 日志分析
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: ELK Stack 日志分析：Elasticsearch 索引、Logstash 管道、Kibana 可视化。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'devops/250-Prometheus'
  - 'devops/260-GrafanaDashboards'
  - 'devops/290-OpenTelemetry'
  - 'devops/190-GitOpsArgoCD'
prerequisites:
  - 'devops/010-OverviewLinuxBasics'
---
## 前置知识

建议先阅读以下内容再进入本文：

- [概述与 Linux 基础](/devops/010-OverviewLinuxBasics)

## 0. 一句话理解

> ELK 是日志领域的经典流水线：**Beats 采集 -> Logstash 加工 -> Elasticsearch
> 存储与检索 -> Kibana 查询展示**。它把散落在几百台机器上的日志变成
> "几秒内可搜索的结构化数据"——日志回答可观测性三支柱里"为什么发生"。

## 1. 四个组件各司其职

```mermaid
flowchart LR
    A[应用日志 stdout/文件] --> B[Beats/Filebeat<br/>轻量采集]
    B --> L[Logstash<br/>解析 grok/过滤/富化]
    L --> E[(Elasticsearch<br/>倒排索引 存储 副本)]
    E --> K[Kibana<br/>检索 可视化 告警]
    B -.轻量路径.-> E
```

| 组件 | 资源画像 | 职责 |
| :--- | :--- | :--- |
| Filebeat | 极轻（10MB 级内存） | 读文件/容器日志，转发 |
| Logstash | 重（JVM，吃 CPU） | 解析、清洗、路由（可被 Elasticsearch Ingest Pipeline 替代） |
| Elasticsearch | 中等偏重 | 分布式检索引擎，倒排索引 + 分片副本 |
| Kibana | 轻 | Web UI：Discover、仪表盘、告警 |

架构选型：日志量小可 Filebeat 直发 ES（省去 Logstash）；解析复杂、多下游
（日志同时进 ES 和 Kafka）时保留 Logstash；K8s 环境中 Filebeat 常以 DaemonSet
跑在每节点收集容器 stdout。

## 2. Elasticsearch 核心概念速览

| 概念 | 类比 | 要点 |
| :--- | :--- | :--- |
| Index | 一张表 | 通常按天/按大小切分（logs-2026.09.01） |
| Shard | 表的分区 | 主分片数建后不可改，需预估 |
| Replica | 分片副本 | 高可用 + 读吞吐，至少 1 |
| Mapping | 表结构 | keyword（精确过滤）vs text（分词全文检索） |

日志字段类型选择是高频错误：`service`、`level`、`trace_id` 用 **keyword**
（聚合与精确匹配），`message` 用 **text**（全文检索）；搞反了要么聚合巨慢，
要么搜不到。

## 3. 索引生命周期管理（ILM）：日志的成本阀门

日志只增不减，ILM 按"热-温-冷-删"自动迁移与清理：

```json
PUT _ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": { "max_primary_shard_size": "50gb", "max_age": "1d" }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "shrink": { "number_of_shards": 1 }
        }
      },
      "delete": { "min_age": "30d", "actions": { "delete": {} } }
    }
  }
}
```

没有 ILM 的集群结局是可以预测的：磁盘写满、集群只读（flood gate），
然后所有人开始手工删索引。新建日志集群的第一件事就是配 ILM + 磁盘水位告警。

## 4. 查询与排障：从 Kibana Discover 开始

```json
GET logs-*/_search
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "service": "order-service" } },
        { "term": { "level": "ERROR" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ],
      "must": [ { "match": { "message": "timeout" } } ]
    }
  },
  "sort": [{ "@timestamp": "desc" }]
}
```

要点：过滤条件放 `filter`（可缓存、不算分），全文关键词放 `must`；
排障标准动作是"时间范围 + service + level"三连过滤，再对 message 做全文匹配。
Kibana 里的等效操作是在 Discover 加同样的 filter 子句，无需写 DSL。

## 5. 采集端：Filebeat 配置与解析

```yaml
# filebeat.yml（7.16+ 用 filestream 输入）
filebeat.inputs:
  - type: filestream
    id: app-logs
    paths: [/var/log/app/*.log]
    parsers:
      - ndjson: { keys_under_root: true }  # 应用已输出 JSON 时直接解析
output.elasticsearch:
  hosts: ['es:9200']
  indices:
    - index: 'logs-%{[service]}-%{+yyyy.MM.dd}'
```

两条路线二选一：**应用输出 JSON 日志**（推荐，采集端零解析成本），或
Logstash/Ingest Pipeline 里用 grok 解析非结构化文本（脆弱且费 CPU）。
新项目请直接输出结构化 JSON，这是日志体系省一半维护量的决定。

## 6. 常见陷阱

| 陷阱 | 后果 | 对策 |
| :--- | :--- | :--- |
| mapping 用了 text 存 service | 聚合慢到不可用 | keyword/text 分清，模板先行 |
| 不配 ILM | 磁盘写满集群只读 | ILM + 水位告警是标配 |
| 分片数拍脑袋 | 太多小分片吃内存，太少不均 | 单分片 30-50GB 经验值 |
| 日志里打敏感信息 | 合规事故 | 采集端 processor 脱敏 + 应用侧规范 |
| Filebeat registry 丢失重发 | 日志重复 | 下游按 (host,file,offset) 幂等去重 |
| 绿色健康=万事大吉 | 未分配副本照样是隐患 | 关注 yellow 状态与分片分配解释 API |

## 7. 动手试试

1. Docker Compose 拉起单节点 ES + Kibana，导入一份 nginx 访问日志文件建索引，
   在 Discover 里按状态码过滤。
2. 给索引模板加 keyword/text mapping，对比对 service 字段做 terms 聚合的效率。
3. 创建一条 ILM 策略（hot rollover 1d + delete 7d）挂到测试索引，用
   `_ilm/explain` 观察阶段推进。

## 8. 小结

**初学者要点**

1. 采集（Beats）、加工（Logstash）、存储检索（ES）、展示（Kibana）四层分工。
2. keyword 与 text 的选择决定查询与聚合的成败。
3. ILM 是日志系统的"刹车"，建集群第一天就要装上。

**进阶注意**

1. 应用输出结构化 JSON 日志，把解析成本从采集端挪回生成端。
2. 日志量上规模后对比 Loki（索引标签而非全文，成本低一个量级）或 ELK 上云托管，
   架构选型跟着数据量与查询模式走。
3. trace_id 进日志是打通"指标-链路-日志"的关键字段，采集时保留勿丢弃。

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
# filebeat.yml 输入配置（7.16+ 推荐 filestream，旧 log 输入已废弃）
filebeat.inputs:
- type: filestream
  id: nginx-access
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
