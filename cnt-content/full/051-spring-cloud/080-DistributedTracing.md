---
order: 100
title: 分布式链路追踪：一次请求的全旅程与它的档案
description: 以「下单超时告警响了，请求跨网关、订单、库存、账户四个服务，去哪台机器 grep 哪份日志」引入：Trace 与 Span 的调用树心智模型、traceparent 上下文传播、Sleuth 退役后的 Micrometer Tracing 与 Zipkin 落地、MDC 日志关联与采样成本权衡，附瀑布图下钻实验。
module: 'spring-cloud'
category: 后端技术
difficulty: advanced
prerequisites:
  - 'spring-boot/160-ActuatorObservability'
  - 'spring-cloud/060-ApiGateway'
author: fanquanpp
updated: '2026-10-04'
related:
  - 'spring-boot/160-ActuatorObservability'
  - 'spring-cloud/090-DistributedTransactionSeata'
---

## 前置知识

- [Actuator 与可观测](/spring-boot/160-ActuatorObservability)：知道可观测三支柱、Micrometer 是「指标界的 SLF4J」——没读过也能跟，本篇接棒它的第三支柱「追踪」；
- [API 网关](/spring-cloud/060-ApiGateway)：知道一次用户请求会先过网关再进服务、服务之间还会互相调用——没读过也能跟。

## 学习目标

读完本文你将能够：

1. 用 Trace 与 Span 两个词描述一次跨服务请求的全旅程，画出一棵调用树；
2. 说清 traceId 如何靠 HTTP 头跨进程传播，解释「引个依赖链路就通」的原理；
3. 讲述 Boot 3 时代追踪栈的分工：Micrometer Tracing 门面、Brave 或 OTel 桥接、Zipkin 展示；
4. 配出采样率、跑通两服务链路，在 Zipkin 瀑布图里定位最慢的 span；
5. 让每行日志自带 traceId，把「告警 → 指标 → 瀑布 → 日志」的排障动线串起来。

预计 50 分钟。

## 1. 你现在要解决什么问题

凌晨一点，下单超时告警响了。你打开终端开始排障：请求先进网关，转发给订单服务；订单服务调了库存服务扣减、又调了账户服务查积分。四个服务四台机器四份日志文件——先查哪台？订单服务日志显示它调了库存，库存那边有记录但耗时 800 毫秒，是它慢吗？还是订单服务自己排队排了 2 秒？**没有关联线索的分布式排障等于大海捞针**：单机时代「一条请求一份日志从上往下看」的方法论，在请求被切成四五段、散落在四台机器之后就失效了。缺的东西是一根线：把同一次请求在所有服务里留下的痕迹串起来的全局编号，外加每一段的耗时账单。这就是链路追踪。本篇把 Boot 3 时代的这套体系立起来。

## 2. 核心概念：Trace 是全旅程，Span 是其中一段

两个词就能撑起全部心智模型：

- **Trace**：一次请求的全旅程，用一个全局唯一的 traceId 标识。用户点了下单，从网关进来到响应回去，无论中途经过几个服务，它们都属于同一个 Trace——「同一个 traceId」就是「同一次请求」的铁证；
- **Span**：旅程中的一段有名字的工作单元——一次 HTTP 调用、一次数据库查询、一次消息发送。每个 span 有开始、结束与耗时，并记录自己属于哪个 trace、父 span 是谁。

span 的父子关系把一次请求拼成一棵调用树：

```text
traceId 4bf92f3577b34da6a3ce929d0e0e4736 —— 一次下单的全旅程（总耗时 210ms）
  gateway    GET /api/order              0ms → 210ms   根 span：请求进网关
    order-service createOrder           10ms → 200ms  Feign 进入订单服务
      jdbc insertOrder                 12ms → 40ms   订单落库
      stock-service deduct             45ms → 180ms  Feign 调库存（可疑）
        jdbc updateStock               50ms → 175ms  元凶：这条更新占 125ms
      account-service getPoint        182ms → 195ms  查积分
```

读树的方法一句话：**从根往下找耗时最长的枝**。本例一眼锁定 stock-service 的 deduct 段，下钻到 jdbc updateStock——125 毫秒的更新就是超时告警的答案，不用登录任何一台机器。

## 3. 上下文传播：traceId 是怎么跨进程的

traceId 在订单服务的内存里，库存服务怎么知道它？答案朴素到不像高科技：**HTTP 头**。调用方在发请求前往头里写、被调方收到后从头里读，这个约定叫上下文传播。行业标准是 W3C Trace Context，头名 traceparent：

```http
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

四段用减号隔开：版本（00）、traceId（32 位十六进制）、父 spanId（16 位）、采样标志（01 表示要采）。库存服务读完这个头，就知道「我在处理 4bf92f… 这次请求的第几段」。

谁负责写和读这个头？**不是你**。Spring 生态的埋点插桩已经铺满整条路：Gateway、Feign、RestTemplate、WebClient 发请求前自动注入头；服务端收到请求自动提取；JDBC 调用、RabbitMQ/Kafka 消息收发也各有插桩，span 就在进出这些组件时被静默创建。这就是「引个依赖链路就通、一行业务代码不改」的原理——你的代码只是路过，埋点早就蹲在路上了。

## 4. 技术栈现状：Sleuth 退役之后

Boot 2 时代的教程满屏都是 Spring Cloud Sleuth——它已退役，Boot 3 时代不再提供。旧教程路标一句话：见到 sleuth 的依赖与配置，按本节对照换成 Micrometer Tracing 即可对读。

Boot 3 时代的分工分三层，思想与 160 篇的指标门面一脉相承：

| 层 | 组件 | 一句话 |
| --- | --- | --- |
| 门面 | Micrometer Tracing | 追踪界的 SLF4J：你的代码面向它写，不绑定任何后端 |
| 桥接 | Brave 或 OpenTelemetry | 真正生成与传播 trace 数据的引擎，二选一 |
| 展示 | Zipkin（也可 Jaeger/Tempo） | 收集 span、画出调用树与瀑布图 |

选 Brave 还是 OTel？团队走 Zipkin 生态用 bridge-brave（本篇主线）；要接入 OpenTelemetry 生态（Collector、各家 APM）用 bridge-otel，业务代码不变。展示端同理：本篇用最轻的 Zipkin；Jaeger/Tempo 是云原生常见组合；国内大厂常用 SkyWalking（字节码增强、服务拓扑图强）——工具不同，Trace/Span 模型完全一致，学会本篇去哪都不虚。

## 5. 落地全流程：三个依赖一行配置

给需要被追踪的服务（网关、订单、库存……谁都要）加上：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

```yaml
management:
  tracing:
    sampling:
      probability: 1.0        # 本地开发全量采样；生产 0.1 起步
  zipkin:
    tracing:
      endpoint: http://localhost:9411/api/v2/spans
```

展示端 docker 一行起：

```bash
docker run -d --name zipkin -p 9411:9411 openzipkin/zipkin
# 界面 http://localhost:9411
```

就这么多——第 3 节说过，埋点已经蹲在路上：服务一启动，Feign 调用、JDBC、网关路由各自生成 span，批量上报给 Zipkin。界面上选服务名、Run Query，点开一条 trace 就是第 2 节那棵树的可视化版本：时间瀑布从左到右，每格一个 span，越长的格子越慢；点开 span 能看它的标签（HTTP 路径、数据库语句、异常信息）。

## 6. 手动埋点：给插桩没覆盖的逻辑补一段 span

自动插桩覆盖的是「已知的路」（HTTP、JDBC、MQ），业务里总有它管不到的计算：一段几百行的计价逻辑、一次本地聚合、一个外部 SDK 调用。瀑布图里它们是「空窗」——父 span 的耗时减去所有子 span，凭空消失的那段就是它。想让它现形，用 Micrometer Tracing 的 Tracer 手动立一个 span：

```java
@Component
public class PriceCalculator {

    private final Tracer tracer;

    public PriceCalculator(Tracer tracer) {
        this.tracer = tracer;
    }

    public Money quote(Cart cart) {
        Span span = tracer.nextSpan().name("price-calculation").start();
        try (Tracer.SpanInScope scope = tracer.withSpan(span)) {
            return doQuote(cart);                    // 复杂计价：自动插桩覆盖不到的暗区
        } catch (RuntimeException e) {
            span.error(e);                           // 把异常记到 span 上，瀑布里标红
            throw e;
        } finally {
            span.end();                              // 不 end 就没有耗时账单
        }
    }
}
```

四步节奏固定：nextSpan 起名、start 计时、withSpan 挂上下文（这段里发起的子调用自动成为它的孩子）、end 收账。判断要不要手动埋点的标准与 160 篇打业务指标相同：这段逻辑慢了或错了，你需不需要被单独报警？需要，就给它一个 span。

## 7. 日志关联：让每行日志自带 traceId

追踪解决「请求在哪一段慢」，排障还差半步：定位到可疑 span 后，要看这个服务此刻的**详细日志**。如果日志没有线索，还是要按时间戳人肉对齐——所以第二落点是把 traceId 打进日志行。

Micrometer Tracing 会自动把 traceId 与 spanId 放进 MDC（日志上下文），Spring Boot 3 检测到追踪依赖后，默认日志格式会在行尾追加关联 ID（形如 [traceId-spanId]），可用 logging.pattern.correlation 自定义样式，MDC 的键名即 traceId 与 spanId，以所用小版本文档为准。效果：

```text
2026-10-03 01:23:45.101 INFO  [order-service,c81e728d...] c.o.OrderController : 订单创建开始
（应用名、traceId、spanId 已自动入列，无需改任何业务日志代码）
```

到这一步，排障动线正式成型：

```text
告警触发 → 指标异动定位可疑服务（160 篇）
        → 按时间在 Zipkin 找到 trace，瀑布图锁定最慢/出错的 span
        → 复制该 traceId，去日志平台检索四个服务的全部相关日志
```

一根 traceId 串起指标、追踪、日志三根支柱——本模块 130 篇（监控告警）会把这条动线的最后一环接上。

## 8. 读图四式与三个常见坑

瀑布图是追踪的主战场，四个套路覆盖八成场景：

| 读法 | 图上长什么样 | 结论 |
| --- | --- | --- |
| 找长条 | 占总时长比例最大的 span | 慢因排序，先查占比第一 |
| 找空窗 | 相邻 span 之间的横向间隙 | 上游在干没有埋点的事，或线程在排队（第 6 节的手动埋点就为照亮这里） |
| 找红色 | 标记异常的 span | 点开看 exception 标签，错误现场直接给出 |
| 看扇出 | 一层挂了几十个兄弟 span | 十有八九是循环里发远程调用，改批量 |

三个高频坑，先备好答案：

- **偶现问题在 Zipkin 里查无此 trace**：先想采样——它可能恰好被 0.1 丢了（第 9 节）。复现排查时临时调高采样率，或换尾部采样；
- **日志里没有 traceId**：两个检查点——所有服务（尤其网关）都引齐了依赖；自定义的 logging pattern 是不是把默认的关联 ID 段覆盖掉了；
- **自建线程池里链路断了**：trace 上下文在裸线程间不会自动跟随，异步任务要用 Micrometer 的 context-propagation 机制装饰执行器——知道有这回事即可，出问题再查文档。

## 9. 采样与成本：为什么生产不采全量

每个 span 都要序列化、走网络、落存储——QPS 一万的服务全量采样，追踪系统自己先成为成本与容量问题。于是有了采样率：probability=0.1 表示每十条请求只留一条。它为什么敢丢？因为追踪回答的是「典型请求长什么样、瓶颈在哪」，不需要每一条都在场——出问题的请求另有保险，见下表。

| 策略 | 何时决定采样 | 特点 |
| --- | --- | --- |
| 头部采样 | 请求刚进来就掷骰子（probability） | 实现简单、成本可控；可能恰好丢掉出问题的那条 |
| 尾部采样 | 请求结束再决定：出错的、超慢的必采，正常的按比例丢 | 不漏坏请求，代价是采集端要攒齐整条链再裁决，需要 OTel Collector 等设施支持 |

起步配方：生产头部采样 0.1 起步，观察 Zipkin 流量再调；预算充足或故障排查期临时调高；「错误必须被看见」的硬要求交给尾部采样或错误强制采样的能力（按所用后端为准）。

## 10. 实验：从两条日志到一张瀑布

准备：网关（9000）、订单服务（8081）、库存服务（8082）三个模块都加上第 5 节的依赖与配置，订单经 Feign 调库存（040 篇的环境直接可用），Zipkin 已起。

第一步，从网关打一发请求，去 9411 界面按 order-service 查询，点开最新 trace：

```bash
curl http://localhost:9000/api/order/1001
```

预期看到三个服务的名字排在同一条 trace 里：gateway 是根，order-service 与 stock-service 依次是孩子——第 3 节的头传播，此刻已经替你工作。

第二步，把库存接口改成 sleep 两秒再压一发，回界面刷新：

```text
瀑布图上 stock-service 的格子拉成一条长带，总耗时 2 秒里它独占约 2 秒
点开长格子：标签里有 http url 与 jdbc 语句——瓶颈证据链完整
```

第三步，感受采样。把 probability 改成 0.1，重启订单与库存，循环十发再查询：

```bash
for i in $(seq 1 10); do curl -s http://localhost:9000/api/order/1001 > /dev/null; done
```

Zipkin 里新 trace 大约一条（概率使然，零到三条都正常）——这就是 0.1 的直观含义。第十发故意把库存接口抛个异常：若被采样漏掉，你就亲身体会了第 9 节「头部采样可能丢掉坏请求」这句话的分量，也明白了尾部采样为什么存在。

## 11. 官方参考

- Spring Boot Tracing（Micrometer Tracing 集成）：https://docs.spring.io/spring-boot/reference/actuator/tracing.html
- W3C Trace Context：https://www.w3.org/TR/trace-context/
- Zipkin 快速开始：https://zipkin.io/pages/quickstart.html

## 自检

不看上文，凭记忆回答。答不出的，回到对应小节重读。

1. Trace 与 Span 是什么关系？一次跨三服务的请求通常有几个 span、树的根是谁？
2. traceparent 头的四段各是什么？谁往里写、谁读出来？
3. 为什么引了依赖链路就通，业务代码一行不改？插桩蹲在哪些位置？
4. Sleuth 退役后 Boot 3 用什么？门面、桥接、展示三层各是谁、怎么选？
5. 生产为什么不全量采样？probability=0.1 意味着什么？
6. 头部采样与尾部采样的区别是什么？尾部采样用什么换来了「坏请求不漏」？
7. 日志怎么自带 traceId？从告警到捞全量日志的四步动线是什么？
8. 瀑布图里先看什么？怎么把「超时告警」变成「某条 SQL 125 毫秒」的结论？
