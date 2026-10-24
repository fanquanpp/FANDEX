---
order: 190
title: Actuator 与可观测：让「感觉不对劲」变成可读的数据
description: 以「服务活着但不对劲：内存涨、接口慢、线程堆积」引入：健康指标追踪三支柱、端点暴露与安全收敛、health 聚合与 K8s 探针分组、Micrometer 门面与 Prometheus 抓取、Counter 与 Timer 业务指标，附 loggers 动态调级实验。
module: 'spring-boot'
category: 后端技术
difficulty: intermediate
prerequisites:
  - 'spring-boot/050-ConfigurationManagement'
  - 'spring-boot/040-AutoConfigurationInternals'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'spring-boot/150-AsyncScheduling'
  - 'spring-boot/180-PackagingDeployment'
---

## 前置知识

- 已完成 [配置管理](/spring-boot/050-ConfigurationManagement)：会写 application.yml、知道配置键的分段——没读过也能跟，把 yaml 当成「应用的设置清单」即可；
- 已完成 [自动配置原理](/spring-boot/040-AutoConfigurationInternals)：记得 conditions 端点是调试三板斧的第二板斧——本篇把 actuator 当正式主角请回舞台。

## 学习目标

读完本文你将能够：

1. 用健康、指标、追踪三支柱组织你对服务状态的认知，说出每根支柱回答什么问题；
2. 按暴露策略安全地打开 actuator 端点，解释「默认只暴露 health」为什么是正确的默认；
3. 解释 health 的聚合机制，写出自定义 HealthIndicator，说清 liveness 与 readiness 的语义分野与 K8s 探针接线；
4. 用 Micrometer 的门面心智模型读 /actuator/metrics，接上 Prometheus 抓取与 Grafana 面板；
5. 用 Counter 与 Timer 埋业务指标，避开 @Timed 不生效的坑；
6. 用 loggers 端点在不重启的前提下动态调整日志级别。

预计 45 分钟，需要一个能跑 Spring Boot 的工程、curl，可选 Docker（Prometheus 一节）。

## 1. 你现在要解决什么问题

凌晨两点告警群里炸出一条「内存使用率 90%」，然后安静下去。服务进程活着，端口通着，但用户说慢、内存曲线一路向上、线程数破千。你登录上去能做什么？jstack、jstat 一通操作全靠手感——这还是你熟悉 JVM 的情况；多数时候团队里没人有手感，排障退化成「重启试试」。根子不是缺工具，是缺数据：**没有指标时的排障叫猜**。可观测回答三个问题：现在能不能服务（健康）、过去一小时趋势如何（指标）、这一笔慢请求经历了什么（追踪）。Spring Boot 用 Actuator 把三件事做成端点：health 给出此刻的生死判断，metrics 沉淀历史与趋势，追踪的分布式展开留给 spring-cloud 模块（051-spring-cloud/080）。本篇把三根支柱立起来，重点打前两根。

## 2. 准备现场：给工程装上仪表盘

加一个依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

启动后：

```bash
curl http://localhost:8080/actuator/health
```

```json
{"status":"UP"}
```

能跑通，但你立刻撞上本篇第一个坑：actuator 装了一堆端点，web 上默认只给你 health 一个——为什么这么抠，第 4 节揭晓。

## 3. 三支柱：健康、指标、追踪

| 支柱 | 回答的问题 | 时间性 | Actuator 对应 |
| --- | --- | --- | --- |
| 健康 | 此刻能不能服务 | 当下 | /actuator/health |
| 指标 | 趋势如何、什么时候开始不对 | 历史与现在 | /actuator/metrics 与指标门面 |
| 追踪 | 这一笔请求经过了谁、耗在哪 | 单笔请求的路径 | 端点内只有雏形，分布式追踪在 spring-cloud 模块展开 |

三者像体检：健康是「现在能否上班」，指标是「历年体检报告与曲线」，追踪是「一次会诊的全程记录」。健康挂了要立刻处理；指标的价值在健康挂掉**之前**——内存连续三天缓涨、接口 P95 一周翻倍，都是指标先看见，人后知道。本篇立前两根，追踪这一柱记住「它存在、它该接在哪里」即可。

## 4. 端点全景与暴露策略

常用端点一张表：

| 端点 | 用途 |
| --- | --- |
| /actuator/health | 聚合健康状态，探针的数据源 |
| /actuator/metrics | 指标目录与单指标明细 |
| /actuator/info | 应用版本等静态信息 |
| /actuator/conditions | 自动配置评估报告（040 篇第二板斧） |
| /actuator/env | 环境与配置属性 |
| /actuator/loggers | 查看与动态修改日志级别 |
| /actuator/threaddump、/actuator/heapdump | 线程快照、堆快照 |
| /actuator/prometheus | Prometheus 文本格式指标（需加注册表依赖） |

打开更多端点：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,loggers
```

默认只暴露 health，是「所有人第一次都踩的坑」，但它是个正确的默认——暴露策略的本质是攻击面管理。看两个高危分子：env 能看配置结构，即使 Boot 对敏感值做了脱敏，配置的键名与分层本身就是情报；heapdump 能把整个堆拖走，缓存里的用户数据、来不及脱敏的密钥全在里面。纪律三条：生产只暴露业务需要的少数端点；env、heapdump 这类要么不暴露、要么锁在内网或认证之后；管理端点尽量与业务端口分开（management.server.port 另起端口配合网络隔离，细节以官方文档为准）。

## 5. health 深讲：聚合、自定义与 K8s 探针

### 5.1 聚合机制：一群检查，最差的算

health 不是单个检查，是一组 HealthIndicator 的聚合：DataSourceHealthIndicator 探数据库、RedisHealthIndicator 探 Redis、DiskSpaceHealthIndicator 看磁盘余量……每个贡献一个组件状态，整体状态按「最差的算」——任一 DOWN 则整体 DOWN。引了对应 starter，框架就自动装配对应的 Indicator（又是自动配置的功劳）；想看组件明细，用 show-details 配置打开（生产慎开，组件名与细节也是情报）：

```bash
curl http://localhost:8080/actuator/health
```

```json
{"status":"UP","components":{"db":{"status":"UP"},"diskSpace":{"status":"UP"},"redis":{"status":"UP"}}}
```

框架不认识的下游要自己检查。比如你的服务依赖一个支付网关，实现 HealthIndicator：

```java
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        boolean reachable = pingGatewayWithin(500);      // 你的探测逻辑
        return reachable
                ? Health.up().withDetail("latencyMs", 32).build()
                : Health.down().withDetail("reason", "支付网关超时").build();
    }
}
```

组件名取 Bean 名去掉 HealthIndicator 后缀，上面的类在报文里叫 paymentGateway。一个决策点要立住：把弱依赖放进 health，整体状态会跟着抖——网关抖一下，K8s 就摘流量甚至重启。**强依赖才进 health，弱依赖走指标加告警**。

### 5.2 K8s 探针接线：liveness 与 readiness

K8s 用两种探针决定对 Pod 做什么：liveness 失败则重启容器；readiness 失败则从负载均衡摘除但不重启。Boot 把 health 拆成两个内置分组来接线：

```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true     # 部署在 K8s 上时 Boot 通常自动开启；显式写便于本地演练
```

```bash
curl http://localhost:8080/actuator/health/liveness    # 进程级轻检查（ping）
curl http://localhost:8080/actuator/health/readiness   # 应用就绪状态（readyState）
```

语义分野用两个状态记牢：

- **活但不就绪**（liveness UP、readiness DOWN）：进程没坏，暂时接不了单——还在启动、下游抖动。处置：摘流量，别杀。缓过来自己会回来；
- **活着但已坏**（liveness DOWN）：死锁、线程全阻塞这类不可恢复状态。处置：重启容器。

反过来「就绪但未活」基本不该出现——readiness 是为活着的进程准备的。把这两条带回第 1 节的事故：内存涨到进程假死归 liveness 管；启动期数据库没就绪时不该被杀、只是不该接流量，归 readiness 管。

## 6. 指标体系：Micrometer 门面与 Prometheus

### 6.1 门面心智模型

指标这层的主角不是 Actuator，是 Micrometer——它是「指标界的 SLF4J」：代码面向 Micrometer 的 API 埋点，底层接哪家监控系统（Prometheus、InfluxDB 等）由换依赖决定，埋点代码一行不改。070 篇在统一报文上体会过的「面向契约编程」，在指标上原样再来一遍。

### 6.2 读一笔现成指标

只要引了 web starter，框架已经替你埋了一堆指标。发几笔请求后看最常用的一个：

```bash
curl "http://localhost:8080/actuator/metrics/http.server.requests"
curl "http://localhost:8080/actuator/metrics/http.server.requests?tag=uri:/api/posts&tag=status:200"
```

```json
{"name":"http.server.requests","measurements":[
  {"statistic":"COUNT","value":42.0},
  {"statistic":"TOTAL_TIME","value":6.3},
  {"statistic":"MAX","value":0.8}]}
```

读法：COUNT 是笔数（42 笔）；TOTAL_TIME 是总耗时（秒），两者相除得平均耗时约 150 毫秒；MAX 是当前窗口内最慢一笔（0.8 秒）。tag 参数按维度切片——按 uri 看、按 status 看，「慢的是全部接口还是某一个」一刀切开。

### 6.3 接 Prometheus 与 Grafana

换一个注册表依赖，指标同时以 Prometheus 文本格式暴露：

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

```bash
curl http://localhost:8080/actuator/prometheus
```

```text
# HELP http_server_requests_seconds Duration of HTTP request handling
# TYPE http_server_requests_seconds histogram
http_server_requests_seconds_count{uri="/api/posts",status="200"} 42.0
http_server_requests_seconds_sum{uri="/api/posts",status="200"} 6.3
```

JSON 里的 COUNT 换了马甲叫 _count，TOTAL_TIME 叫 _sum——同源不同格式。让 Prometheus 定期来抓：

```yaml
scrape_configs:
  - job_name: springboot-blog
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['localhost:8080']
```

抓下来的数据配上 Grafana：仪表盘库里搜「JVM Micrometer」导入现成面板，内存、GC、线程一屏尽收。从此第 1 节的「内存一路向上」不再靠猜——曲线会告诉你从哪个版本开始涨。

## 7. 自定义业务指标：Counter 与 Timer

框架埋的指标回答「系统怎么样」，业务指标回答「生意怎么样」——发文量、支付成功率、缓存命中率。两个最常用的量尺：

```java
@Service
public class ArticleService {

    private final MeterRegistry registry;
    private final ArticleRepository articles;

    public ArticleService(MeterRegistry registry, ArticleRepository articles) {
        this.registry = registry;
        this.articles = articles;
    }

    public void publish(Article article) {
        articles.save(article);
        registry.counter("blog.article.published", "category", article.getCategory())
                .increment();                       // Counter：只加不减的计次
    }

    public Report render(Report report) {
        registry.timer("blog.report.render")        // Timer：耗时分布
                .record(() -> doRender(report));    // 包住要计时的逻辑
        return report;
    }
}
```

选型一句话：数「发生了多少次」用 Counter；量「一次花多久」用 Timer——它同时给你次数与耗时分布，一次埋点两份数据。命名用点分层级（blog.article.published），打上 category 这类维度标签，监控面板才有得切。

一个官方注解的坑要点名。@Timed 贴在方法上可以代替手写 Timer：

```java
@Timed("blog.report.render")
public Report render(Report report) { ... }
```

但注解生效靠 AOP 代理（110、150 篇的第三次现身），需要注册切面 Bean：

```java
@Bean
TimedAspect timedAspect(MeterRegistry registry) {
    return new TimedAspect(registry);
}
```

不注册 TimedAspect，@Timed 安静地什么都不做——面板上永远找不到这个指标，你还会以为是埋点代码没上线。@Timed 不生效，第一怀疑对象就是它。

## 8. 运行时态端点：loggers 动态调级

排障时最想要的能力：线上正在出问题，想把某个包的日志临时调到 DEBUG，又不想为它发版重启。loggers 端点就是干这个的：

```bash
curl http://localhost:8080/actuator/loggers/com.example.blog
# {"configuredLevel":"INFO","effectiveLevel":"INFO"}

curl -X POST http://localhost:8080/actuator/loggers/com.example.blog \
     -H "Content-Type: application/json" \
     -d '{"configuredLevel":"DEBUG"}'
```

POST 一发立即生效，不用重启；排查完改回 INFO 即可。两个边界：改动只活在当前进程里，重启后回到配置文件的级别（想固化就写进配置，050 篇的分环境配置在这里接上）；正因为它能改运行时行为，生产必须按第 4 节的纪律收紧。threaddump 与 heapdump 一句话带过：前者看线程都卡在哪个栈上（第 1 节「线程堆积」的第一现场），后者拿堆快照离线分析内存涨在哪——排障深水区的家伙，知道在哪就好。

## 9. 实验：从暴露到调级的一条龙

把全篇串成一条可复跑的命令流：

```bash
# 1. 第 4 节的暴露配置写好并重启后，看健康聚合
curl http://localhost:8080/actuator/health
# 2. 制造一点流量，读指标
for i in $(seq 1 20); do curl -s http://localhost:8080/api/posts > /dev/null; done
curl "http://localhost:8080/actuator/metrics/http.server.requests?tag=uri:/api/posts"
# 3. （可选）加 prometheus 注册表依赖、写 scrape 配置，起 Prometheus 后在 UI 查 http_server_requests
# 4. 动态调级
curl -X POST http://localhost:8080/actuator/loggers/com.example.blog \
     -H "Content-Type: application/json" -d '{"configuredLevel":"DEBUG"}'
# 5. 观察日志变密，再改回 INFO 观察还原
```

验收三条：health 报文里能数出你的自定义 Indicator；指标能按 uri 切出单接口数据；DEBUG 调级后无需重启日志立即变密，改回 INFO 立即还原。

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. 三支柱各回答什么问题？追踪这一柱为什么本篇只立不深挖？
2. 默认只暴露 health 的设计为什么是对的？env 与 heapdump 的风险各是什么？
3. health 整体状态是怎么从多个 Indicator 聚合出来的？自定义 Indicator 的组件名由什么决定？
4. 「强依赖才进 health」的理由是什么？弱依赖该怎么观测？
5. liveness 与 readiness 失败后 K8s 分别做什么？「活但不就绪」该怎么处置？
6. Micrometer 为什么被称为「指标界的 SLF4J」？COUNT 与 TOTAL_TIME 怎么算出平均耗时？
7. @Timed 配了却不生效，第一怀疑对象是什么？
8. loggers 动态改的级别重启后还在吗？生产使用它的纪律是什么？
