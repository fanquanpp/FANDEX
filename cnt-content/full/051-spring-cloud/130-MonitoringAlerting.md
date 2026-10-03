---
order: 130
title: 监控告警体系：别等用户在群里告诉你服务挂了
description: 以「凌晨两点服务挂了，用户在群里 @ 你你才知道」引入：四黄金指标与微服务落点、Micrometer 到 Prometheus 到 Grafana 的采集链路与多服务抓取、RED 加 JVM 加业务的三层大盘、三条实战告警规则与分级降噪纪律，附压测触发 5xx 观察曲线与告警实验。
module: 'spring-cloud'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-boot/160-ActuatorObservability'
  - 'spring-cloud/080-DistributedTracing'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/160-ActuatorObservability'
  - 'spring-cloud/140-CapstoneEcommerceOrder'
---

## 前置知识

- [Actuator 与可观测](/spring-boot/160-ActuatorObservability)：知道 Micrometer 是「指标界的 SLF4J」、/actuator 下能暴露指标——没读过也能跟，本篇把单服务的指标拉通成多服务的体系；
- [分布式链路追踪](/spring-cloud/080-DistributedTracing)：知道 traceId 能在 Zipkin 里串起一次请求——没读过也能跟，第 7 节排障动线的第三站是它。

## 学习目标

读完本文你将能够：

1. 说清监控告警体系的目标：把「用户发现故障」提前为「指标发现异常」，把「异常才发现」提前为「容量预警」；
2. 用四黄金指标（延迟、流量、错误、饱和度）给任意微服务定指标清单，说清每个词在本语境的具体落点；
3. 搭通采集链路：服务暴露 /actuator/prometheus，Prometheus 静态抓取多服务，Grafana 出大盘；
4. 设计三层大盘：每服务 RED、统一 JVM、业务自定义指标，并给 Grafana 配上按服务筛选的变量；
5. 写出三条实战告警规则，解释 for 持续时长的意义，并执行告警分级与降噪的三条纪律。

预计 60 分钟，需要 Docker。

## 1. 你现在要解决什么问题

凌晨两点，库存服务的连接池打满，下单接口开始 502。第一个知道这件事的是谁？是一个睡不着刷手机的用户，他在群里 @ 你：你们 App 是不是挂了。你翻身起来，从八台机器的日志里大海捞针——080 篇说过这是分布式排障的常态。这件事的耻辱之处不在故障本身，而在**故障的发现顺序**：系统比用户先知道故障，是监控体系的底线；再进一步，在故障发生前就看到容量逼近，是监控体系的上限。所以目标分三档：

```text
下限  用户发现 → 指标发现：服务挂了，一分钟内你的群里先响
中线  故障发现 → 异常发现：5xx 飙升的前几分钟，延迟与错误率已经抬头
上限  异常发现 → 容量预警：连接池水位、磁盘增速，在故障前给出趋势判断
```

本篇把这条阶梯搭出来：指标从哪来（采集链路）、到哪看（大盘）、谁在守夜（告警规则与分级纪律）。工具栈与 160 篇同源——Micrometer 出数据，本篇接上 Prometheus 收数据、Grafana 看数据、Alertmanager（知道即可）发通知，把单服务的可观测拉通成多服务的体系。

## 2. 四黄金指标：任何服务先回答四个问题

四黄金指标出自 Google SRE 的实践总结，它的好处是**少到记得住，多到够定位**。给微服务语境下每个词一个具体落点：

| 指标 | 回答的问题 | 微服务落点 |
| --- | --- | --- |
| 延迟 Latency | 快不快 | 每接口的 RT，尤其 P99——平均值会掩盖尾部 |
| 流量 Traffic | 多少量 | 每服务每接口的 QPS，容量规划的地基 |
| 错误 Errors | 错多少 | 5xx 错误率、业务错误码占比、熔断触发次数 |
| 饱和度 Saturation | 资源还剩多少 | JVM 堆使用、线程池与连接池水位、CPU、队列积压 |

两张补充的窄表顺手记住：RED 方法（Rate、Errors、Duration）是四黄金指标在「微服务接口层」的子集，适合当每个服务大盘的骨架；USE 方法（Utilization、Saturation、Errors）面向资源层，适合机器与中间件大盘。本篇主线用 RED 组织服务大盘、用四黄金指标查漏。

一个反直觉的强调：**饱和度是唯一能抢在故障之前报警的指标**。延迟、流量、错误都是「已经发生」的度量，连接池水位 90% 却还没打满时，你还有十分钟去扩容——上限那一档「容量预警」全部押在饱和度上。

## 3. 采集链路全景：pull 模型与多服务抓取

链路三段，方向要记牢：

```text
应用（Micrometer 暴露 /actuator/prometheus）
        ↓ Prometheus 定时来拉（pull，默认 15 秒一次；方向与应用相反：是拉不是推）
Prometheus（存储与计算指标，评估告警规则）
        ↓ Grafana 连接 Prometheus 查询出图
Grafana（大盘展示，通知路由可接 Alertmanager）
```

每个服务照 160 篇接好 Micrometer（本篇补的是「多服务拉通」）：依赖 micrometer-registry-prometheus，配置两行：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus
  metrics:
    distribution:
      percentiles-histogram:
        http.server.requests: true      # 开直方图，P99 才算得出来
```

Prometheus 用 pull 拉取，于是有个必答题：**它怎么知道有哪些服务要拉？** 两种姿势。第一种静态多 target，本篇主线，配置即文档：

```yaml
global:
  scrape_interval: 15s
rule_files:
  - /etc/prometheus/alerts.yml
scrape_configs:
  - job_name: gateway
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["host.docker.internal:9000"]
  - job_name: order-service
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["host.docker.internal:8081"]
  - job_name: stock-service
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ["host.docker.internal:8082"]
```

第二种是服务发现（SD）：Prometheus 原生支持 Kubernetes、Consul 等发现机制，新实例注册后自动进入抓取名单；用 Nacos 的团队可借助社区转换组件把注册表转成 Prometheus 认识的格式（具体方案随版本演进，以官方文档为准）。判断标准与 050 篇负载均衡同款：实例频繁增减上 SD，实例稳定静态表更清晰。

监控栈自身一键起：

```yaml
services:
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerts.yml:/etc/prometheus/alerts.yml
    extra_hosts:
      - "host.docker.internal:host-gateway"   # Linux 宿主机访问需要这行
  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]
```

```bash
docker compose up -d
```

Grafana 首次登录（默认 admin/admin）添加数据源：类型 Prometheus，URL 填 http://prometheus:9090（compose 网络内用服务名）。打开 http://localhost:9090/targets 应能看到三个 target 都是 UP——采集链路通的铁证。

## 4. 大盘设计：三层结构

大盘不是把所有曲线堆一面墙，而是分三层回答三个问题：

| 层 | 回答的问题 | 内容 |
| --- | --- | --- |
| 服务 RED 大盘（每服务一块） | 这个服务此刻健康吗 | Rate：QPS；Errors：5xx 错误率；Duration：P99 延迟 |
| 统一 JVM 大盘（全站一块） | 容器与运行时还撑得住吗 | 堆内存、GC 次数与耗时、线程数、CPU |
| 业务指标大盘（每条业务线一块） | 生意还好吗 | 下单量、支付成功率、库存扣减失败数 |

前两层来自框架自动埋点，第三层要自己写——用 160 篇的 MeterRegistry，业务动作发生处一行埋点：

```java
meterRegistry.counter("biz.order.created", "channel", channel).increment();
```

业务层最容易被轻视，但它是**老板唯一看得懂的层**：RED 大盘告诉你订单服务 P99 涨了，业务大盘才能回答「今天下单量比上周掉了三成」——故障影响换算成生意损失，就是这条曲线的活。Grafana 侧的效率开关是变量：大盘顶部加一个变量，表达式 label_values(http_server_requests_seconds_count, job)，下拉选服务名，整套面板按服务联动——八个服务共用一套 RED 面板，不用复制八份。社区有成型的 JVM 模板（grafana.com/dashboards 搜 Micrometer JVM，模板 ID 随版本更新，以站点为准），导入改数据源即可，别手画。

## 5. 告警规则：三条实战与 for 的意义

规则文件 alerts.yml（第 3 节 compose 已挂载），三条覆盖最常见的三类事故：

```yaml
groups:
  - name: service-health
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: P0
        annotations:
          summary: "实例下线：{{ $labels.job }} {{ $labels.instance }}"
      - alert: HighErrorRate
        expr: |
          sum by (job) (rate(http_server_requests_seconds_count{status=~"5.."}[2m]))
          / sum by (job) (rate(http_server_requests_seconds_count[2m])) > 0.01
        for: 2m
        labels:
          severity: P1
        annotations:
          summary: "{{ $labels.job }} 5xx 错误率超过 1%"
      - alert: HighLatencyP99
        expr: http_server_requests_seconds{quantile="0.99"} > 1
        for: 2m
        labels:
          severity: P2
        annotations:
          summary: "{{ $labels.job }} P99 延迟超过 1 秒（{{ $labels.uri }}）"
```

三个语法点钉死。第一，5xx 错误率是两次 rate 相除——分子按 status 正则筛 5 开头，分母是全部请求，sum by (job) 按服务聚合，别让多实例的分母互相稀释。第二，P99 指标来自第 3 节开的直方图（quantile 标签），没开直方图这条规则无数据。第三，**for 是告警的冷静期**：条件满足后还要持续这么久才真正触发——网络抖一下、发布重启导致的一两分钟毛刺不会吵人，它过滤的是「狼来了」的第一层。代价也直白：for 2m 意味着故障确认至少延迟两分钟，紧急规则与容忍毛刺之间取平衡，P0 类可以短到 30 秒。

规则评估在 Prometheus 侧进行：http://localhost:9090/alerts 能看到每条规则的状态（inactive / pending / firing）——pending 就是「条件满足、for 未满」，firing 才是触发。通知路由交给 Alertmanager（分组、静默、值班轮转，路由树配置以官方文档为准），本篇聚焦规则与纪律。

## 6. 告警分级与降噪：三条工程纪律

告警体系的死敌不是漏报，是**疲劳**：第一条狼来了的时候人人响应，第十条的时候没人再看群。纪律三条，比任何工具都重要：

- **每条告警必须有 action**。收到之后你要做什么，写进告警文案（runbook 链接或一句处置指引）。没有 action 的告警本质是骚扰——你既不打算看它，就不该让它响；
- **告警必须可路由到人**。分级决定通道与响应时限：P0 电话（全站不可用，分钟级响应）、P1 群消息值班（功能受损，十分钟级）、P2 工单（劣化趋势，次日处理）。分级落在规则的 labels.severity 上，由 Alertmanager 路由到不同通道；
- **定期清理狼来了**。每周复盘：哪些告警响了没人动？要么给它配 action，要么降级，要么删掉。告警列表是活的配置，不是一次配完的文物。

反向清单同样要背：监控不等于可观测（监控回答已知问题，可观测回答未知问题——所以指标之外还要 080 的追踪与日志）；告警不等于大盘（大盘是主动巡检的仪表盘，告警是被动的哨兵，二者不能互相替代）；静默是工具不是逃避（变更窗口前静默相关告警，变更后记得恢复）。

## 7. 排障动线：四个工具一条链

体系搭完，故障时刻的走位要练成肌肉记忆。一条从告警到答案的固定动线：

```mermaid
flowchart LR
    A[告警触发：哪个服务] --> B[Grafana 下钻：哪个接口 异常从几点开始]
    B --> C[Zipkin 按 traceId 看瀑布：慢在哪个 span]
    C --> D[日志平台按 traceId 捞明细：根因现场]
```

读法：告警只回答「谁在响」（ServiceDown 还是 HighErrorRate）；Grafana 把范围缩小到「哪个服务哪个接口、从几点几分开始异动」（对照变更记录，八成能对上一次发布）；Zipkin 里拿异动时段的 trace 看瀑布——080 篇的「找长条、找红色」在这里生效，锁定最慢或出错的 span；最后拿着那个 traceId 去日志平台捞明细，根因现场直接展开。四步走完，通常不超过十分钟——而没有这套动线时，它是一晚上的 grep。

## 8. 实验：亲手触发一次告警

准备：监控栈已起（第 3 节），订单服务（8081）与库存服务（8082）都接好 Micrometer，alerts.yml 已挂载。给订单服务埋一个故障开关：

```java
@GetMapping("/flaky")
public String flaky(@RequestParam(defaultValue = "0") int fail) {
    if (fail == 1) {
        throw new IllegalStateException("故意失败");
    }
    return "ok";
}
```

第一幕，看曲线动起来。先打一波正常流量，再切换成全失败：

```bash
for i in $(seq 1 50); do curl -s -o /dev/null http://localhost:8081/flaky; done
for i in $(seq 1 200); do curl -s -o /dev/null "http://localhost:8081/flaky?fail=1"; done
```

Grafana 的 RED 大盘上：Rate 先是一段平台，Errors 瞬间拉满一条直线，Duration 跟着抖动——指标异动先于告警出现，这正是「异常发现早于告警触发」的直观版本。不画盘也可以先用 http://localhost:9090/graph 直接查询 sum(rate(http_server_requests_seconds_count{status=~"5.."}[1m])) 亲眼看数字爬升。

第二幕，等告警响。错误率 100% 远超 1% 的阈值，for 2 分钟后 http://localhost:9090/alerts 里 HighErrorRate 从 pending 变 firing；Grafana 告警面板同步显示。想缩短等待，演示环境可把 for 改成 30 秒——改完记得 `docker compose restart prometheus` 让配置生效，顺手用 promtool check config 校验一遍语法（工具随 Prometheus 发行）。

第三幕，看 up 的另一面。`docker stop` 掉库存服务，一分钟内 ServiceDown 变 firing；控制台 http://localhost:9090/targets 里它的 target 变 DOWN。重新 start，target 自动回到 UP——pull 模型的自愈不需要任何人动手，这条性质正是它被 Prometheus 采纳的原因。

## 官方参考

- Prometheus 官方文档（配置、规则语法、函数）：https://prometheus.io/docs/
- Grafana 官方文档（变量与面板）：https://grafana.com/docs/
- Spring Boot Actuator（Micrometer Prometheus 端点）：https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- 四黄金指标出处：Google SRE 一书 Monitoring Distributed Systems 一章，https://sre.google/sre-book/monitoring-distributed-systems/
- Micrometer 指标名与标签随版本微调，以所用 Boot 小版本文档为准。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 监控体系的三档目标是什么？为什么说饱和度是唯一能抢在故障前报警的指标？
2. 四黄金指标各回答什么问题？RED 与 USE 分别是哪一层的方法论？
3. pull 模型怎么知道要拉哪些服务？静态多 target 与服务发现各适合什么形态？
4. P99 延迟指标为什么必须先开直方图？没开的话告警规则会怎样？
5. for 字段防什么、代价是什么？P0 告警的 for 该怎么取？
6. 5xx 错误率的 PromQL 为什么分子分母都要 rate 再相除？sum by (job) 防的是什么？
7. 一条好告警的三条纪律是什么？告警疲劳的根源与每周复盘动作各是什么？
8. 从告警响到根因现场，四步动线依次用什么工具、各回答什么问题？
