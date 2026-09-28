---
order: 240
title: 监控与可观测性
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: 从一次"用户先发现故障"的事故出发，本地搭起 Prometheus 与 Grafana 亲手看指标曲线，理解指标、日志、链路三支柱与 SLO 错误预算。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'devops/250-Prometheus'
  - 'devops/260-GrafanaDashboards'
  - 'devops/270-LogManagement'
  - 'devops/290-OpenTelemetry'
  - 'devops/300-MonitorAndAlert'
prerequisites: []
---

前置知识：会用 Docker 跑容器；知道 HTTP 服务的基本样子。不需要任何
监控背景——本文是运维模块监控篇章的入口。

读完本文你应当能够：本机跑起 Prometheus + Grafana 并查到自己的第一条
指标；说出指标、日志、链路各自回答什么问题；解释错误预算为什么比
"可用性 99.9%"这句话更有用。

## 1. 场景：故障是谁先发现的

设想一个没有监控的服务。某天下午它开始间歇性超时，结果是这样
被发现的：用户在群里发截图"你们网站是不是挂了"，你这才打开终端，
服务器上 `tail` 日志、`top` 看负载，二十分钟过去还没定位到是哪台
机器、哪个接口。

把这次手忙脚乱拆开，其实是三个没答案的问题：

1. **出事了吗？**——靠用户报障才知道，太晚。需要**指标（Metrics）**
   持续回答"现在正不正常"。
2. **哪里出事了？**——不知道该看哪台机器哪个接口。需要**链路追踪
   （Traces）**回答"这个慢请求走过了哪些环节"。
3. **为什么出事？**——`grep` 半天日志。需要结构化的**日志（Logs）**
   回答"那一刻系统内部发生了什么"。

这三个问题对应可观测性的三大支柱。本文主线走指标（最常用、门槛
最低），日志与链路在最后一节给出地图。

## 2. 动手：十分钟看到第一条监控曲线

监控工具听起来庞大，本地最小闭环只要两个容器：Prometheus（采数据、
存数据、查数据）和 Grafana（画图）。妙处在于 Prometheus 自己就会
暴露 `/metrics` 端点，**让它监控自己**，一行应用代码都不用写。

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus          # 学习用最新版即可，生产要固定版本
    ports: ['9090:9090']
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports: ['3000:3000']
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s          # 每 15 秒抓一次

scrape_configs:
  - job_name: 'prometheus'      # Prometheus 抓自己的 /metrics
    static_configs:
      - targets: ['localhost:9090']
```

```bash
docker compose up -d
```

打开 `http://localhost:9090` 就是 Prometheus 自带查询页。在输入框执行
你的第一条 PromQL：

```promql
up    # 每个抓取目标是否存活，1 = 正常
```

看到 `up{job="prometheus"} 1`——你已经完成了一次"查询实时指标"。
再试一条：

```promql
rate(process_cpu_seconds_total[5m]) * 100   # Prometheus 进程自己的 CPU 占用
```

然后打开 `http://localhost:3000`（Grafana，默认账号密码 admin/admin），
添加数据源指向 `http://prometheus:9090`，新建面板把上面那条查询画成
曲线。**这个"改查询、看曲线"的循环，就是监控工作的核心体感**——后面
所有概念都是在给这个循环加料。

## 3. 讲原理：指标是怎么来的

### 3.1 拉模型与指标端点

Prometheus 是**拉模型**：它主动定期访问每个目标的 `/metrics` 端点抓取
文本数据，而不是等应用上报。这带来一个开发视角的要求——你的应用要
在 `/metrics` 暴露指标。Python 侧几行代码（对照着理解即可，完整讨论
见《Prometheus》）：

```python
from prometheus_client import Counter, generate_latest

REQUEST_COUNT = Counter(
    'http_requests_total',          # 指标名，惯例以 _total 结尾
    'Total HTTP requests',
    ['method', 'endpoint', 'status']  # 维度（标签）
)

def handle_request(method, endpoint, status):
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
```

### 3.2 四种指标类型，认全就够用

| 类型         | 语义             | 典型例子                     |
| :----------- | :--------------- | :--------------------------- |
| **Counter**  | 只增不减的计数器 | 请求总数、错误总数、任务数   |
| **Gauge**    | 可上可下的当前值 | 内存占用、连接数、队列长度   |
| **Histogram**| 数值分布（分桶） | 请求耗时分布                 |
| **Summary**  | 客户端算好的分位 | 与 Histogram 类似但难聚合    |

选型直觉：问"累计发生了多少"用 Counter，问"现在是什么水平"用 Gauge，
问"耗时的分布怎样"用 Histogram。

### 3.3 PromQL 五板斧

日常九成的查询由这五个模式拼出来：

```promql
# 1. 瞬时值：直接写指标名
up

# 2. 变化率：Counter 必须先套 rate 才有意义（每秒增长）
rate(http_requests_total[5m])

# 3. 按维度聚合：所有接口的总 QPS
sum(rate(http_requests_total[5m]))

# 4. 按维度分组：每个接口各多少 QPS
sum(rate(http_requests_total[5m])) by (endpoint)

# 5. 分位数：95% 的请求在多少毫秒内完成
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

一个经典组合——错误率，两个 rate 相除：

```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

## 4. 从看图到告警：人不能盯一天曲线

看图解决"我想看"，告警解决"系统主动喊你"。告警规则就是一条会
持续评估的 PromQL 加上触发条件：

```yaml
groups:
  - name: app_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m                    # 持续 5 分钟才触发，滤掉毛刺
        labels:
          severity: critical
        annotations:
          summary: 'Error rate is {{ $value | humanizePercentage }}'
```

`for: 5m` 这个字段值得单独说：瞬时毛刺（发布重启、单次抖动）不该
半夜叫醒任何人，**持续为真才报警**是告警设计的第一课。Alertmanager
负责后续的去重、分组、路由（严重告警打电话，普通告警进群）和抑制
（机房级故障触发时屏蔽衍生的小告警），配置详解见《监控与告警》。

先认识告警的反面：**告警疲劳**。规则太多太敏感，值班的看到通知就
静音，真故障反而被淹没。给自己的规则定门槛——**每一条告警都必须
值得人行动**，做不到的降级成面板上的图。

## 5. 三支柱地图：指标之外的两位

### 5.1 日志：回答"为什么"

指标告诉你错误率涨了，日志告诉你错误的具体报错内容。现代做法是
**结构化日志**（JSON 一行一条），机器可检索：

```json
{"event":"request_processed","path":"/api/users","status":200,"duration_ms":45,"trace_id":"abc123"}
```

采集与存储的主流组合：ELK 全家桶（重、功能全）与 Grafana Loki（轻、
与 Prometheus 标签同构）。迁移注意：Loki 侧的采集器 Promtail 已进入
维护模式，官方推荐迁移到 **Grafana Alloy**（基于 OpenTelemetry
Collector 的发行版，一套组件同时采指标/日志/链路）；遇到旧环境里的
Promtail 配置知道怎么回事即可，新部署直接上 Alloy。日志工程全貌见
《日志管理》《ELK 日志分析》。

### 5.2 链路追踪：回答"卡在哪"

一次下单请求可能穿过网关、五个微服务、三次数据库调用。链路追踪给
每个请求一个 `trace_id`，把沿途每一段耗时（span）串成瀑布图，慢在
哪一段一目了然。行业标准是 **OpenTelemetry**：统一 SDK 与采集协议，
后端可换 Jaeger（v2 起直接基于 OTel Collector 构建）、Tempo 或云商
产品。最小接入代码与部署见《OpenTelemetry》。

三支柱的分工一句话：**指标发现异常，链路定位环节，日志解释原因**。
排障时按这个顺序走，比在三摊数据里乱翻快得多。

## 6. SLO 与错误预算：监控的"为什么"

监控堆满面板仍然救不了那种"永远 99.1%，大家觉得还行，用户已经流失"
的团队。SLO 体系把"多稳才算稳"变成可度量的约定，三个词一层套一层：

| 概念    | 是什么             | 例子                     |
| :------ | :----------------- | :----------------------- |
| **SLI** | 测量出来的指标     | 成功请求占比 99.97%      |
| **SLO** | 内部定的目标       | 成功请求占比 99.9%       |
| **SLA** | 对外合同里的承诺   | 低于 99.9% 按约赔偿      |

SLO 真正的威力在**错误预算**：

```
错误预算 = 1 - SLO
SLO 99.9%  → 每月允许 43.2 分钟的失败额度
SLO 99.95% → 每月允许 21.6 分钟
SLO 99.99% → 每月仅 4.32 分钟
```

它把"能不能发版"变成了算术：预算还剩很多，放心发；预算烧完了，
全员停下修稳定性，新功能排队。可靠性从此有了和"新功能需求"谈判的
筹码。SLO 落地常用 Sloth 这类工具从声明生成全部记录规则与告警：

```yaml
version: prometheus/v1
service: myapp
slos:
  - name: api-availability
    objective: 99.9              # 目标：99.9% 请求成功
    sli:
      events:
        error_query: sum(rate(http_requests_total{status=~"5.."}[{{.window}}]))
        total_query: sum(rate(http_requests_total[{{.window}}]))
    alerting:
      page_alert:                # 预算烧太快时打电话
        labels: { severity: critical }
```

理念与值班实践见《云原生 SRE》，这里记住决策逻辑就够。

## 7. 坑点与自检

1. **高基数标签**。把 `user_id`、`request_id` 放进指标标签，每个新值
   创建一条新时间序列，几小时撑爆 Prometheus 内存。标签取值必须是
   可枚举的（接口名、状态码），无限取值进日志或链路。
2. **只监控机器不监控用户路径**。CPU 内存全绿，下单接口照样超时。
   监控必须覆盖"用户视角"的黑盒探测（能否访问、能否下单），机器
   指标只是旁证。
3. **只看平均值**。平均延迟 200ms 可能藏着 10% 的请求要 5 秒。
   用 P95/P99 分位数，配 Histogram 而不是 Summary（便于多实例聚合）。
4. **告警没有 for，也没有分级**。毛刺即报警、条条都 critical，两周后
   告警通道必然被静音。每条告警问一句"响了之后人该做什么"。
5. **监控自己部署在自己身上**。应用和 Prometheus 同机同挂，应用把
   机器拖垮时监控一起消失。监控组件独立部署、独立资源。

自检清单：

- [ ] 本机能跑通 Prometheus + Grafana 并查询 up 指标
- [ ] 能解释 Counter 与 Gauge 的区别，知道 Counter 要配 rate
- [ ] 每条告警规则都有 for 持续时间和明确的责任人路由
- [ ] 指标标签没有 user_id / request_id 这类高基数值
- [ ] 核心用户路径有黑盒探测，而不只有机器指标

## 8. 练习

1. 按第 2 节跑起本地环境，在 Prometheus 里写出"每个 job 的抓取耗时"
   的查询（提示：`scrape_duration_seconds`），并画进 Grafana。
2. 给第 2 节的 prometheus.yml 加第二个抓取目标（比如再起一个 nginx
   容器，配合 nginx-prometheus-exporter），观察 `up` 指标出现新序列。
3. 写一条"Prometheus 自身抓取连续失败"的告警规则，故意停掉目标容器
   验证它触发，再体会 `for` 字段加与不加的区别。
4. 给你的服务算一笔账：若 SLO 定为 99.9%，一个月的错误预算是几分钟？
   过去一个月实际烧掉多少（有没有数据能算？没有的话，这本身就是结论）。

## 9. 下一步

- PromQL 全语法与 recording rules：见《Prometheus》。
- 面板布局与变量模板：见《Grafana 仪表盘》。
- 从日志到链路的完整接入：见《日志管理》《OpenTelemetry》。
- 告警路由、值班与事后复盘：见《监控与告警》《OnCall 实践》。
